// Practice profile 'p26' (preset prof, params.js): our own re-implementation of the practice-posture play described
// in prose in notes/intel/top_2696_v2.md sections 2-3 (reference sub-profile, 5.1 P1-P7). Clean room: only that report
// was used; every rule below is written against our modules and our names.
//
// Active only while B.p26on = P.prof === 'p26' && hunt.firewall() (SQUAD posture, no foreign death, next radius above
// zoneLateR, more than 3 alive). The first 20 s of a match are the report's "unsure" phase and run here as well. With
// B.p26on false nothing in this file changes any state the other layers read; with P.prof 'off' it is never created.
//
//   update(obs)    assess stage: hostility score, per-target gun hit rate, mech sightings (bookkeeping only)
//   selectTarget() replaces tactics.selectTarget: practice timeline, legal set, target / shot scores, preferred range,
//                  fight-or-not test, finishing
//   econ()         replaces the economy choosers: priority supply drop, grab mode, loot values
//   decideMode()   replaces tactics.decideMode: zone > drop > grab > finishing > retreat latch > avoidance > fight
//   legs()         drop / grab / fight / loot legs (false: the base legs of B.mode)
//   fireTarget(), crateShot(), wantReload(), laserVeto(), rungs   hooks of firecontrol.js

import { angDiff, clamp, wrapPi } from './aim.js'
import { MODE } from './params.js'
import { zoneSlack, timeUntilOutside } from './senses.js'
import { setTarget } from './tactics.js'

const RANK = { laser: 3, lightning: 2.6, mortar: 0, gun: 0 }

export function makeProf(B, mover, econ, hunt) {
  const P = B.P
  const S = {
    on: false, phase: '', gateEndT: -1, hold: 0, shot: null, gunTgt: -1, fight: false, finishing: false, ttk: 99, ttd: 99,
    inc: 0, hot: 0, shooters: 0, latch: false, latchT: -99, avoid: false, avoidTr: null, leg: '', grab: null, grabT0: -99, grabId: '',
    lootId: '', lootT0: -99, lootD0: 0, nearT: -1, dropId: -1, keepT: -99, underFire: false, unseenT: -99,
    recovering: false, recoveryUntil: -1, recoveryHp: 0, recoveryHurtT: -1e9, recoveryReason: '',
  }
  B.p26 = S
  const mem = new Map()        // mech id -> { hos, until, x, y, z, t, shots, hits }
  const ignore = new Map()     // 'kind:id' -> until
  const pathCache = new Map()  // 'kind:id' -> { t, ratio }
  let econT = -9, lootT = -9, pathTick = -1
  const legalSet = new Set()
  const crateObj = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 1.4, height: 2.4, revs: 0, id: -1, steadySince: -99, airborne: false, airT0: -99 }
  const cfg = B.cfg, W = cfg.weapons
  const gc = W.gun || {}, lc = W.laser || {}, lic = W.lightning || {}
  const foeGun = (gc.damage || 45) * (gc.mag || 12) / Math.max(0.05, (gc.mag || 12) * (gc.cooldown || 0.24) + (gc.reload || 2.4))
  const foeLaser = (lc.damage || 315) / Math.max(0.1, (lc.charge || 0.75) + (lc.cooldown || 1.65) + P.pfFoeLaserLag)
  const foeLight = P.pfLightK * (lic.damage || 60) / Math.max(0.05, lic.cooldown || 0.25)
  const dpc = cfg.cubes.damage_per_cube || 0.04, cap = cfg.cubes.stat_cap || 10
  const rungs = Array.isArray(P.pfRungs) && P.pfRungs.length ? P.pfRungs.filter((f) => f > 0 && f < 1) : [0.5]
  const cnt = (k) => { B.counters[k] = (B.counters[k] || 0) + 1 }

  function memOf(id) {
    let m = mem.get(id)
    if (!m) { if (mem.size >= 64) return null; m = { hos: 0, until: -99, x: 0, y: 0, z: 0, t: -99, shots: 0, hits: 0 }; mem.set(id, m) }
    return m
  }
  const ign = (k) => { const u = ignore.get(k); return u !== undefined && B.me.t < u }

  // ------------------------------------------------------------------ bookkeeping
  /** Hostility (3.3): +0.1 per decision while it has a line on us and its torso points within max(6.9 deg, the angle of
   *  6 m) inside 260 m (+0.3 more while charging), -0.05 otherwise; at 0.6 hostile for 8 s; within 30 m with a line 4 s;
   *  damaged us 25 s. Gun shots / hits per target (3.3 hit-rate learning). Sightings kept 25 s (hunt objective). */
  function update(obs) {
    const me = B.me, t = me.t, L = B.trackList
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc) continue
      const m = memOf(tr.id)
      if (!m) continue
      if (tr.listed) {
        m.x = tr.x; m.y = tr.y; m.z = tr.z; m.t = t
        const d = tr.dist
        const tol = Math.max(P.pfHosDeg * Math.PI / 180, Math.atan2(P.pfHosW, Math.max(1, d)))
        const aimed = tr.losIn && d <= P.pfHosR && Math.abs(angDiff(wrapPi(tr.bearing + Math.PI), tr.yaw)) <= tol
        m.hos = aimed ? Math.min(1, m.hos + P.pfHosUp + (tr.charging ? P.pfHosCharge : 0)) : Math.max(0, m.hos - P.pfHosDown)
        if (m.hos >= P.pfHosOn) m.until = Math.max(m.until, t + P.pfHosS)
        if (d <= P.pfHosNearR && tr.losIn) m.until = Math.max(m.until, t + P.pfHosNearS)
      } else m.hos = Math.max(0, m.hos - P.pfHosDown)
    }
    // our gun shots this decision go to the mech the gun fired at last decision
    const g = me.gun
    if (g && g.prevAmmo > g.ammo && g.prevAmmo - g.ammo <= 3 && S.gunTgt >= 0) { const m = mem.get(S.gunTgt); if (m) m.shots += g.prevAmmo - g.ammo }
    const ev = obs && Array.isArray(obs.events) ? obs.events : null
    if (ev) for (let k = 0; k < Math.min(ev.length, 64); k++) {
      const e = ev[k]
      if (!e || typeof e !== 'object') continue
      if (e.type === 'hit' && e.weapon === 'gun' && Number.isInteger(e.target)) { const m = mem.get(e.target); if (m) m.hits++ }
      else if (e.type === 'kill' && Number.isInteger(e.target)) mem.delete(e.target)
    }
    if ((B.tick & 15) === 0) {
      for (const [id, m] of mem) if (t - m.t > P.pfMemS && !B.tracks.has(id)) mem.delete(id)
      for (const [k, u] of ignore) if (t >= u) ignore.delete(k)
      for (const [k, c] of pathCache) if (t - c.t > 3) pathCache.delete(k)
    }
  }
  function hostile(tr) {
    if (tr.npc) return false
    const t = B.me.t, m = mem.get(tr.id)
    return t - tr.lastDmgInT <= P.pfHosDmgS || (!!m && t < m.until)
  }

  // ------------------------------------------------------------------ damage model (3.4, 3.6)
  const hitOwnCurve = (r) => clamp(P.pfOwnHit0 - P.pfOwnHitK * Math.max(0, r - P.pfHitR0), P.pfOwnHitMin, P.pfOwnHit0)
  const hitFoe = (r) => clamp(P.pfFoeHit0 - P.pfFoeHitK * Math.max(0, r - P.pfHitR0), P.pfFoeHitMin, P.pfFoeHit0)
  function hitOwn(r, tr) {
    const c = hitOwnCurve(r), m = tr && !tr.npc ? mem.get(tr.id) : null
    if (m && m.shots >= P.pfHitLearnN) return clamp(0.5 * c + 0.5 * (m.hits / m.shots), 0.05, 1)
    return c
  }
  /** Our damage per second on tr at range r: sustained gun (magazine + reload) x hit chance, laser flat to its range,
   *  lightning inside range + 4 m; cube bonus. */
  function ownDps(r, tr) {
    const me = B.me, g = me.gun, lz = me.laser, li = me.lightning, k = me.dmgMult
    let d = 0
    if (g && r <= g.range) d += g.damage * g.mag / Math.max(0.05, g.mag * g.cd + g.reloadS) * hitOwn(r, tr) * k
    if (lz && r <= lz.range) d += lz.damage / Math.max(0.1, lz.full + lz.cd) * k
    if (li && r <= li.range + P.pfLightPad) d += P.pfLightK * li.damage / Math.max(0.05, li.cd) * k
    return d
  }
  /** Its damage per second on us at range r (house weapons from the config, its cubes). */
  function foeDps(r, tr) {
    if (tr.npc) return r <= (cfg.npc.aggro_range || 45) + 10 ? (cfg.npc.damage || 25) / (cfg.npc.cooldown || 1) : 0
    let d = 0
    if (tr.hasGun && r <= (gc.range || 230)) d += foeGun * hitFoe(r)
    if (tr.hasLaser && r <= (lc.range || 280)) d += foeLaser
    if (tr.hasLightning && r <= (lic.range || 45) + P.pfLightPad) d += foeLight
    if (tr.hasMortar && r > 15 && r < (P.mortarMaxR || 235)) d += P.mortarDpsIn
    return d * (1 + dpc * Math.min(tr.cubes || 0, cap))
  }
  /** Preferred range: best of pfRanges by own damage - pfInK x its damage; a closer step wins unless a farther one is
   *  pfStepWin better. */
  function prefRange(tr) {
    const R = P.pfRanges
    let best = R[0], bs = ownDps(R[0], tr) - P.pfInK * foeDps(R[0], tr)
    for (let i = 1; i < R.length; i++) {
      const s = ownDps(R[i], tr) - P.pfInK * foeDps(R[i], tr)
      if (s > bs + P.pfStepWin) { bs = s; best = R[i] }
    }
    return best
  }
  /** Strength rating (sections 3.4 / 4): health x damage at 90 m, its over ours. */
  function strength(tr) {
    const me = B.me
    const mine = Math.max(1, me.hp) * Math.max(1, ownDps(90, null))
    return Math.max(1, tr.hp) * foeDps(90, tr) / mine
  }

  // ------------------------------------------------------------------ targets (3.4, 3.5)
  function legal(tr, t) {
    const me = B.me
    if (tr.npc || tr.hp <= 0) return false
    if (S.phase === 'unsure') return hostile(tr)
    const hitUs = t - tr.lastDmgInT <= P.pfAnswerS
    if (S.phase === 'gate') return hitUs && tr.dmgInD <= P.pfAnswerR
    return hitUs || (tr.dist <= P.pfAtkR && me.hpf > P.pfAtkHpf) || (tr.hp < P.pfWeakHpf * tr.maxHp && tr.dist <= P.pfWeakR && me.hpf > P.pfWeakMyHpf)
  }
  function selectTarget() {
    const me = B.me, t = me.t, L = B.trackList
    if (S.gateEndT < 0 && t >= P.pfUnsureS && (me.cubes >= P.pfOpenCubes || t >= P.pfOpenT)) S.gateEndT = t
    S.phase = t < P.pfUnsureS ? 'unsure' : S.gateEndT < 0 ? 'gate' : 'open'
    if (S.phase === 'gate') cnt('pfGate')
    B.ofGate = false; B.ofBreak = false; B.fpTarget = null
    const cur = B.target
    let best = null, bs = -Infinity, shot = null, ss = -Infinity, seenIllegal = false
    legalSet.clear()
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || tr.hp <= 0 || tr.phantom) continue
      const ok = legal(tr, t)
      if (ok) legalSet.add(tr)
      if (!ok) { if (tr.listed && tr.dist <= P.pfAtkR) seenIllegal = true; continue }
      if (t - tr.lastSeen > P.pfSeenS) continue
      const s = -tr.hp - P.pfTgtPerM * tr.dist + (tr.losOut ? P.pfTgtLine : 0) + (t - tr.lastDmgInT <= P.pfAnswerS ? P.pfTgtHit : 0) + (tr === cur ? P.pfTgtCur : 0)
      tr.index = s
      if (s > bs) { bs = s; best = tr }
    }
    if (seenIllegal && S.phase === 'gate') cnt('pfGateHeld')
    // out of sight: the current target is kept pfKeepS from its last sighting (its last position is walked to)
    if (!best && cur && !cur.npc && B.tracks.get(cur.id) === cur && cur.hp > 0 && !cur.phantom && t - cur.lastSeen <= P.pfKeepS && legal(cur, t)) best = cur
    setTarget(B, best)
    // the shot: the best legal mech with a line, else a drone that bit us (3 s), else a drone within 60 m above 50%
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !legalSet.has(tr) || !tr.listed || !tr.losOut || tr.hp <= 0) continue
      const s = -P.pfShotHpK * tr.hp - P.pfShotPerM * tr.dist + (tr === best ? P.pfShotTgt : 0) + (t - tr.lastDmgInT <= P.pfShotHitS ? P.pfShotHit : 0)
      if (s > ss) { ss = s; shot = tr }
    }
    if (!shot) {
      let bd = Infinity
      for (let k = 0; k < L.length; k++) {
        const tr = L[k]
        if (!tr.npc || !tr.listed || !tr.losOut || tr.hp <= 0) continue
        const bit = t - tr.lastDmgInT <= P.pfShotHitS
        if (!bit && !(tr.dist <= P.pfDroneShotR && me.hpf > P.pfDroneShotHpf)) continue
        const d = tr.dist - (bit ? 1000 : 0)
        if (d < bd) { bd = d; shot = tr }
      }
    }
    S.shot = shot
    // preferred range, fight-or-not, finishing
    S.fight = false; S.finishing = false; S.ttk = 99; S.ttd = 99; S.inc = 0; S.shooters = 0
    const tg = B.target
    S.hold = tg ? prefRange(tg) : 0
    let inc = 0, n = 0, hot = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || tr.hp <= 0 || tr.conf < 0.3) continue
      if (!hostile(tr) || !(tr.losIn || t - tr.losInT <= 1)) continue
      const f = foeDps(tr.dist, tr)
      hot += f
      if (tr !== tg) { inc += f; n++ }
    }
    S.hot = hot
    S.underFire = t - me.lastHurtT <= P.pfFireS
    if (tg) {
      const d = tg.dist
      const dx = me.x - tg.x, dy = me.y - tg.y, h = Math.hypot(dx, dy) || 1
      const closing = (dx * tg.vx + dy * tg.vy) / h > 1
      const rE = Math.abs(d - S.hold) <= P.pfEvalBand || closing ? S.hold : d
      const own = ownDps(rE, tg)
      inc += foeDps(rE, tg); n++
      const ttk = Math.max(1, tg.hp) / Math.max(1, own), ttd = inc > 0 ? me.hp / inc : Infinity
      let fight = ttk < ttd || own - inc > P.pfAdv
      if (n >= 2 && ttk > P.pfMultiTtk) fight = ttk * P.pfMultiMargin < ttd
      S.fight = fight; S.ttk = ttk; S.ttd = ttd
      const ownNow = ownDps(d, tg)
      S.finishing = tg.losOut && tg.listed && Math.max(1, tg.hp) / Math.max(1, ownNow) < P.pfFinishS
      tg.finishable = S.finishing; tg.secure = S.finishing
    }
    S.inc = inc; S.shooters = n
    B.killSecure = S.finishing
  }
  function fireTarget() {
    const tg = B.target
    if (S.shot) return S.shot
    return tg && (B.mode === MODE.FIGHT) ? tg : null
  }

  // ------------------------------------------------------------------ economy (3.10, 3.13)
  function cubesWanted() {
    const me = B.me
    if (me.cubes < cap) return true
    const th = Array.isArray(cfg.cubes.upgrade_thresholds) ? cfg.cubes.upgrade_thresholds : [15, 21, 28, 36, 45]
    for (let i = 0; i < th.length; i++) if (th[i] > me.cubes) return th[i] - me.cubes <= 3
    return false
  }
  function mechNear(x, y, r) {
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (!tr.npc && tr.hp > 0 && tr.conf > 0.3 && Math.hypot(tr.x - x, tr.y - y) < r) return true }
    return false
  }
  function mechInView() {
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (!tr.npc && tr.listed && tr.hp > 0) return true }
    return false
  }
  /** Path no longer than pfGrabPath x the straight line (one capped A* per decision, cached 1 s per item). */
  function pathOk(key, x, y) {
    const me = B.me, nav = B.nav, d = Math.hypot(x - me.x, y - me.y)
    if (!nav || d < 3 || nav.walkLine(me.x, me.y, x, y)) return true
    const c = pathCache.get(key)
    if (c && me.t - c.t < 1) return c.ratio <= P.pfGrabPath
    if (pathTick === B.tick) return false
    pathTick = B.tick
    let r = null
    try { r = nav.findPath(me.x, me.y, x, y, { maxExpand: P.pfGrabExpand }) } catch { r = null }
    const ratio = r && r.ok ? r.len / Math.max(1, d) : 99
    pathCache.set(key, { t: me.t, ratio })
    return ratio <= P.pfGrabPath
  }
  function sameComp(x, y) {
    const nav = B.nav, me = B.me
    if (!nav) return true
    const c = nav.component(me.x, me.y)
    if (c < 0) return true
    let q = nav.passableAt(x, y) ? { x, y } : nav.nearestPassable(x, y, 8)
    return !!q && nav.component(q.x, q.y) === c
  }
  function dropPlan(d) {
    const me = B.me, dist = Math.hypot(d.x - me.x, d.y - me.y)
    const inside = dist <= d.radius, owned = d.holder === me.id && inside
    let occupants = inside ? 1 : 0
    for (const tr of B.trackList) if (!tr.npc && tr.listed && tr.hp > 0 && Math.hypot(tr.x - d.x, tr.y - d.y) <= d.radius) occupants++
    const contested = occupants > 1, ours = owned && !contested
    const fastest = Math.max(1, me.walk, me.boostSpeed, me.speed)
    const earliest = Math.max(0, dist - d.radius) / fastest
    if (d.holder >= 0 && d.holder !== me.id && d.landsIn <= 0 && d.progress > 0) {
      const holder = B.tracks.get(d.holder)
      const finishHolder = S.finishing && B.target && B.target.id === d.holder
      if (!finishHolder && occupants === 1 && holder && holder.listed && Math.hypot(holder.vx, holder.vy) < 1 &&
        earliest > Math.max(0, d.captureS - d.progress) + 2 * P.tickS) return null
    }
    const path = Math.max(dist, econ.pathEst(d.x, d.y))
    const arrive = owned ? 0 : Math.max(0, path - Math.max(0, d.radius - 2)) / Math.max(1, me.walk)
    const wait = Math.max(arrive, d.landsIn)
    const left = Math.max(0, d.captureS - (owned ? d.progress : 0))
    if (zoneSlack(B, d.x, d.y, me.t + wait + left + P.tickS) < 0) return null
    return { x: d.x, y: d.y, dist, radius: d.radius, landsIn: d.landsIn, id: d.id, holder: d.holder,
      captureS: d.captureS, progress: d.progress, completion: contested ? Infinity : wait + left, owned, contested, ours }
  }

  function chooseDrop() {
    const me = B.me, z = B.zone
    let best = null
    for (let k = 0; k < B.drops.length; k++) {
      const d = B.drops[k]
      if (me.hp >= me.maxHp - 0.5 && d.holder !== me.id) continue
      const dist = Math.hypot(d.x - me.x, d.y - me.y)
      if (dist > P.pfDropR) continue
      if (z.known && Math.hypot(d.x - z.nx, d.y - z.ny) > z.nr) continue
      if (mover.isAbandoned(d.x, d.y) || !sameComp(d.x, d.y)) continue
      const tArr = dist / me.walk
      // the arrival test chooses a drop; once chosen it is kept (walking / boosting at it would otherwise make it "too early")
      if (d.landsIn > tArr + P.pfDropLate && !(B.dropTask && B.dropTask.id === d.id)) continue
      const plan = dropPlan(d)
      if (plan && (!best || (plan.ours && !best.ours) || (plan.ours === best.ours && plan.completion < best.completion))) best = plan
    }
    B.dropTask = best
    if (best && best.id !== S.dropId) { S.dropId = best.id; cnt('pfDropTasks') }
  }
  /** Grab mode (3.10): a laser within 45 m, a wanted weapon within 25 m with an empty slot, or a cube within 18 m; path
   *  <= 1.5x straight; no mech within 30 m (cube 25 m) of the item; hp above 30%; 6 s per item. */
  function chooseGrab() {
    const me = B.me, t = me.t
    let g = null, gv = -Infinity
    if (me.hpf > P.pfGrabHpf && !B.zoneUrgent) {
      const tryOne = (key, type, o, v, clearR) => {
        if (ign(key) || mover.isAbandoned(o.x, o.y)) return
        const d = Math.hypot(o.x - me.x, o.y - me.y)
        if (mechNear(o.x, o.y, clearR) || zoneSlack(B, o.x, o.y, t + d / me.walk + 3) < 0) return
        if (!econ.reachable(o.x, o.y, o.z) || !pathOk(key, o.x, o.y)) return
        const s = v - d
        if (s > gv) { gv = s; g = { key, type, id: o.id, x: o.x, y: o.y, z: o.z } }
      }
      for (const p of B.pickups.values()) {
        if (t - p.seen > 60 || (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30)) continue
        const w = econ.wantPickup(p.kind)
        if (!w) continue
        const d = Math.hypot(p.x - me.x, p.y - me.y)
        if (p.kind === 'laser' && !me.laser && d <= P.pfGrabLaserR) tryOne('p:' + p.id, 'pickup', p, 200, P.pfGrabClear)
        else if (w.drop === -1 && d <= P.pfGrabOtherR) tryOne('p:' + p.id, 'pickup', p, 100, P.pfGrabClear)
      }
      if (cubesWanted()) for (const c of B.cubes.values()) {
        if (t - c.seen > P.cubeMemS) continue
        if (Math.hypot(c.x - me.x, c.y - me.y) <= P.pfGrabCubeR) tryOne('c:' + c.id, 'cube', c, 0, P.pfGrabCubeClear)
      }
    }
    if (g && g.key !== S.grabId) { S.grabId = g.key; S.grabT0 = t; cnt('pfGrabs') }
    if (g && t - S.grabT0 > P.pfGrabS) { ignore.set(g.key, t + P.pfGrabIgnoreS); g = null; S.grabId = ''; cnt('pfGrabTimeouts') }
    if (!g) S.grabId = ''
    S.grab = g
  }
  /** Loot objective (3.10 table): value - 1.3 per metre, +15 to keep the last one; hurt: only within 35 m. */
  function chooseLoot() {
    const me = B.me, t = me.t
    const view = mechInView()
    const hurt = me.hpf < P.pfHurtHpf && t - me.lastHurtT <= P.pfHurtS && view
    const maxD = hurt ? P.pfHurtR : Infinity
    let best = null, bv = 0
    const cur = B.loot ? S.lootId : ''
    const consider = (key, type, o, value, path) => {
      if (ign(key) || path > maxD) return
      const v = value - P.pfPerM * path + (key === cur ? P.pfKeep : 0)
      if (v <= bv) return
      if (zoneSlack(B, o.x, o.y, t + path / me.walk + P.pfZoneArrive) < 0) return
      bv = v; best = { key, type, id: o.id, x: o.x, y: o.y, z: o.z }
    }
    const reach = (o) => !mover.isAbandoned(o.x, o.y) && econ.reachable(o.x, o.y, o.z)
    if (cubesWanted()) for (const c of B.cubes.values()) { if (reach(c)) consider('c:' + c.id, 'cube', c, P.pfCube, econ.pathEst(c.x, c.y)) }
    if (me.gun && me.hpf > P.pfCrateHpf) for (const c of B.crates.values()) { if (reach(c)) consider('k:' + c.id, 'crate', c, P.pfCrate, econ.pathEst(c.x, c.y)) }
    if (me.gun && me.hpf > P.pfDroneHpf && !view) for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc && tr.listed && tr.hp > 0) consider('d:' + tr.id, 'drone', tr, P.pfDrone, tr.dist)
    }
    if (me.hpf >= P.pfWpnHpf) for (const p of B.pickups.values()) {
      if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
      const w = econ.wantPickup(p.kind)
      if (!w || !reach(p) || mechNear(p.x, p.y, P.pfWpnClear)) continue
      const r = RANK[p.kind] || 0
      let v = w.drop === -1 ? P.pfWpnEmpty + P.pfWpnEmptyGain * r : P.pfWpn + P.pfWpnGain * (r - (RANK[me.weapons[w.drop] && me.weapons[w.drop].kind] || 0))
      if (p.kind === 'laser' && !me.laser) v = Math.max(v, P.pfLaserMin)
      consider('p:' + p.id, 'pickup', p, v, econ.pathEst(p.x, p.y))
    }
    for (let k = 0; k < B.drops.length; k++) {
      const d = B.drops[k], dist = Math.hypot(d.x - me.x, d.y - me.y)
      if (dist / me.walk > d.landsIn + P.pfDropWait || !sameComp(d.x, d.y) || !dropPlan(d)) continue
      consider('s:' + d.id, 'drop', { id: d.id, x: d.x, y: d.y, z: me.z }, d.holder >= 0 && d.holder !== me.id ? P.pfDropHeldV : P.pfDropV, dist * 1.1)
    }
    if (S.phase === 'open' && me.hpf > P.pfHuntHpf) for (const [id, m] of mem) {
      const age = t - m.t
      if (age > P.pfHuntS || age < 0.3) continue
      const tr = B.tracks.get(id)
      if (tr && (tr.listed || tr.hp <= 0)) continue
      if (Math.hypot(m.x - me.x, m.y - me.y) < 8) continue
      consider('h:' + id, 'hunt', { id, x: m.x, y: m.y, z: m.z }, P.pfHuntV - P.pfHuntAgeK * age, econ.pathEst(m.x, m.y))
    }
    if (best && best.key !== S.lootId) { S.lootId = best.key; S.lootT0 = t; S.lootD0 = Math.hypot(best.x - me.x, best.y - me.y); S.nearT = -1 }
    if (!best) S.lootId = ''
    B.loot = best
    B.farmNpc = best && best.type === 'drone' ? best.id : -1
  }
  function econUpdate() {
    const me = B.me, t = me.t
    chooseDrop()
    if (t - econT >= 0.25 || (S.grab && !stillThere(S.grab))) { econT = t; chooseGrab() }
    if (t - lootT >= 0.5 || (B.loot && !stillThere(B.loot))) { lootT = t; chooseLoot() }
    // retreating calmly it picks cubes within 28 m (base retreat legs read B.grab)
    B.grab = null
    if ((B.mode === MODE.DISENGAGE || B.mode === MODE.HEAL) && t - B.lastLosInT > 1 && t - me.lastHurtT > 1 && cubesWanted()) {
      let bd = P.pfCalmCubeR
      for (const c of B.cubes.values()) {
        const d = Math.hypot(c.x - me.x, c.y - me.y)
        if (d < bd && t - c.seen <= P.cubeMemS && econ.reachable(c.x, c.y, c.z) && !mover.isAbandoned(c.x, c.y)) { bd = d; B.grab = { type: 'cube', id: c.id, x: c.x, y: c.y, z: c.z, rush: false } }
      }
    }
    B.lgKnown = false
  }
  function stillThere(l) {
    if (l.type === 'drone') { const tr = B.tracks.get(l.id); return !!tr && tr.hp > 0 }
    if (l.type === 'hunt') { const tr = B.tracks.get(l.id); return !(tr && tr.listed) && mem.has(l.id) }
    if (l.type === 'drop') { for (let k = 0; k < B.drops.length; k++) if (B.drops[k].id === l.id) return true; return false }
    const map = l.type === 'cube' ? B.cubes : l.type === 'crate' ? B.crates : B.pickups
    return map.has(l.id)
  }

  // ------------------------------------------------------------------ mode (3.4, 3.12, 3.13)
  function recoveryWindow() {
    const me = B.me, t = me.t, z = B.zone
    S.recoveryReason = ''
    const firstHold = cfg.zone && Array.isArray(cfg.zone.phases) && cfg.zone.phases[0] ? cfg.zone.phases[0].hold_s : Infinity
    // Mode selection precedes stance's environment update. The current alive count
    // and already-sensed unique kill credits prevent a one-decision stale scope.
    const roster = Math.max(1, Math.min(64, Math.floor(cfg.match.mechs || 16)))
    let credited = 0
    for (let id = 0; id < roster; id++) if (id !== me.id && B.ourKills.has(id)) credited++
    const foreignNow = Math.max(0, roster - B.aliveN - credited)
    const enabled = P.attritionEndgame === true && B.p26on === true && hunt.firewall() &&
      foreignNow < P.h50ForeignMax && t >= firstHold && !!B.nav && !!B.world
    if (!enabled) { S.recovering = false; return false }
    // A held beam is not an optional shot to cancel: the baseline fire controller keeps ownership.
    const held = me.laser && (me.laser.charge > 0 || B.out.fire[me.laser.slot] === true)
    let danger = S.finishing || B.zoneUrgent || !me.inZone || !z.known || held ||
      t - me.lastHurtT < 1.5 || !!B.dropTask || !!S.grab
    for (const tr of B.trackList) {
      if (tr.hp <= 0 || tr.conf < 0.3 || t - tr.lastSeen > 1.5) continue
      if ((tr.npc ? tr.dist <= (cfg.npc.aggro_range || 45) : tr.losIn || tr.losOut || tr.dist < me.walk * 2 + me.radius)) { danger = true; break }
    }
    const wait = Math.max(0, me.regenDelay - (t - Math.max(me.lastHurtT, me.lastDealtT)))
    const rate = me.regenPerS, missing = me.maxHp - me.hp
    let route = 0
    if (enabled && Math.hypot(me.x - z.nx, me.y - z.ny) > z.nr - me.radius - 2) {
      const g = mover.zoneGoal(), nav = B.nav
      if (!nav.passableAt(g.x, g.y) || nav.component(g.x, g.y) !== nav.component(me.x, me.y) || !nav.walkLine(me.x, me.y, g.x, g.y)) danger = true
      route = Math.hypot(g.x - me.x, g.y - me.y) * P.pathFactor / Math.max(0.1, me.walk)
    }
    // Leave time to reach the next-circle interior. The normal zone owner still interrupts sooner.
    const safe = timeUntilOutside(B, me.x, me.y, me.radius + 2) - route - 2
    const duration = Math.max(0, Math.min(10, (cfg.match.duration_s || 480) - t - route - 2, safe))
    const gain = Math.min(missing, Math.max(0, duration - wait) * rate, rate * 4)
    const useful = Math.min(me.maxHp * 0.1, rate * 2)
    if (!enabled || danger || !(rate > 0) || duration <= wait || missing <= 0.5) {
      S.recovering = false; return false
    }
    if (S.recovering) {
      if (t >= S.recoveryUntil || me.hp >= S.recoveryHp - 0.5 || S.recoveryUntil - t > duration ||
        S.recoveryUntil - t <= wait || me.lastHurtT > S.recoveryHurtT) {
        S.recovering = false; return false
      }
      S.recoveryReason = 'finish-quiet-recovery'; return true
    }
    // At most one voluntary interval for a particular damage episode: no repeated farm/heal loop.
    if (me.lastHurtT <= S.recoveryHurtT || !(gain >= useful && useful > 0)) return false
    S.recovering = true; S.recoveryHurtT = me.lastHurtT
    S.recoveryHp = me.hp + gain
    S.recoveryUntil = t + wait + gain / rate
    S.recoveryReason = 'protect-regeneration'
    cnt('endgameRecoveryStarts')
    return true
  }
  function decideMode() {
    const me = B.me, t = me.t, tgt = B.target, hide = B.hide
    B.tCover = hide.state === 'found' ? hide.dist * P.pathFactor / me.walk : P.tCoverUnknown
    const hitRecent = t - me.lastHurtT <= P.pfLatchHitS
    // retreat latch: under 35% while hit (3 s), unless finishing; ends above 80%, or above 55% with no mech in view and
    // no hit for 6 s
    if (!S.latch && me.hpf < P.pfLatchHpf && hitRecent && !S.finishing) { S.latch = true; S.latchT = t; cnt('pfLatch') }
    else if (S.latch && (me.hpf > P.pfLatchExit || (me.hpf > P.pfLatchQuietExit && !mechInView() && t - me.lastHurtT >= P.pfLatchQuietS))) { S.latch = false; cnt('pfLatchEnd') }
    // boss / peer avoidance in the unsure phase (0-20 s)
    S.avoid = false
    if (S.phase === 'unsure' && !S.finishing) {
      const L = B.trackList
      for (let k = 0; k < L.length; k++) {
        const tr = L[k]
        if (tr.npc || tr.hp <= 0 || tr.conf < 0.3) continue
        const line = tr.losIn || tr.losOut, r = strength(tr)
        if ((r > P.pfBossK && (tr.dist <= P.pfBossR || line)) || (r >= P.pfPeerK && tr.dist <= P.pfPeerR && line)) { S.avoid = true; break }
      }
    }
    const incoming = S.hot > 0
    const unseen = t - B.unseenHurtT <= P.pfFireS
    const view = mechInView()
    const hurt = me.hpf < P.pfHurtHpf && t - me.lastHurtT <= P.pfHurtS && view
    const recover = recoveryWindow()
    S.leg = ''
    let want
    if (B.zoneUrgent) want = MODE.ZONE
    else if (S.finishing && tgt && !(B.dropTask && B.dropTask.ours)) { want = MODE.FIGHT; cnt('pfFinish') }
    else if (B.dropTask) { want = MODE.DROP; S.leg = 'drop'; cnt('pfDrop') }
    else if (S.grab) { want = MODE.LOOT; S.leg = 'grab'; cnt('pfGrab') }
    else if (recover) { want = MODE.HEAL; cnt('endgameRecoveryTicks') }
    else if (S.latch) { want = MODE.DISENGAGE; cnt('pfLatchDec') }
    else if (S.avoid) { want = MODE.DISENGAGE; cnt('pfAvoid') }
    else if (tgt && S.fight) { want = MODE.FIGHT; cnt('pfFight') }
    else if (tgt && (S.underFire || incoming)) { want = MODE.DISENGAGE; cnt('pfNoFight') }
    else if (S.phase === 'gate' && S.underFire && me.hpf <= P.pfGateHideHpf) { want = MODE.DISENGAGE; cnt('pfGateHide') }
    else if (S.phase !== 'gate' && unseen && !tgt) { want = MODE.DISENGAGE; cnt('pfUnseen') }
    else if (hurt && !B.loot) want = MODE.HEAL
    else if (B.loot) { want = MODE.LOOT; if (B.loot.type === 'hunt') cnt('pfHunt') }
    else want = MODE.HOLD
    const lose = want === MODE.DISENGAGE
    if (lose && !B.losing) { B.losingSince = t; B.counters.losing = (B.counters.losing || 0) + 1 }
    if (!lose && B.losing) B.losingEndT = t
    B.losing = lose
    B.fightOk = !lose; B.finishing = S.finishing; B.finish = S.finishing; B.winning = !!tgt && (tgt.maxHp - tgt.hp) > (me.maxHp - me.hp)
    B.doomed = false
    if (want !== B.mode) {
      const urgent = want === MODE.ZONE || B.mode === MODE.ZONE || want === MODE.DISENGAGE || want === MODE.DROP || S.leg === 'grab' || B.mode === MODE.HOLD ||
        B.mode === MODE.LOOT || !B.mode || (want === MODE.FIGHT && S.finishing) || (B.mode === MODE.HEAL && want === MODE.FIGHT)
      if (urgent || t - B.modeSince >= P.modeHold) { B.mode = want; B.modeSince = t; B.counters.modeSwitches++ }
    }
    if (B.mode !== MODE.LOOT) S.leg = S.leg === 'grab' ? '' : S.leg
    if (B.mode !== MODE.DROP && S.leg === 'drop') S.leg = ''
    // holds fire while latched and not under fire (lets the regeneration start)
    B.holdFire = recover || (S.latch && !S.underFire && !S.finishing)
    if (B.holdFire) cnt('pfHoldFire')
  }

  // ------------------------------------------------------------------ legs (3.6, 3.10, 3.13)
  function boostIf(minE) { const me = B.me; if (me.grounded && me.energy > minE) B.cmd.boost = true }
  function legs() {
    const me = B.me, t = me.t, cmd = B.cmd
    if (B.mode === MODE.DROP && B.dropTask) {
      const d = B.dropTask, dd = Math.hypot(d.x - me.x, d.y - me.y)
      mover.moveTo(d.x, d.y, 1, P.pfDropStop)
      if (dd > P.pfDropBoostD) boostIf(P.pfDropBoostE)
      B.lookHint = true; B.lookX = d.x; B.lookY = d.y
      B.legKind = 'p26drop'
      return true
    }
    if (B.mode === MODE.LOOT && S.leg === 'grab' && S.grab) {
      const g = S.grab
      const dd = mover.moveTo(g.x, g.y, 1, g.type === 'pickup' ? 1.2 : 0.6)
      if (dd > 4) boostIf(P.pfDropBoostE)
      B.legKind = 'p26grab'
      return true
    }
    if (B.mode === MODE.FIGHT && B.target && !B.target.npc) { fightLegs(); return true }
    if (B.mode === MODE.LOOT && B.loot) { lootLegs(); return true }
    // nothing wanted (3.14): more than 60 m outside the next circle walks in, boosting with energy over 60
    const z = B.zone
    if (B.mode === MODE.HOLD && z.known && Math.hypot(me.x - z.nx, me.y - z.ny) > z.nr + P.pfIdleZoneOut) {
      const g = mover.zoneGoal()
      mover.moveTo(g.x, g.y, 1, 2)
      if (me.energy > P.pfIdleZoneE) boostIf(0)
      B.legKind = 'p26zonewalk'
      return true
    }
    return false
  }
  function fightLegs() {
    const me = B.me, tg = B.target, cmd = B.cmd
    const hold = S.hold > 0 ? S.hold : 100
    let lo = hold - P.pfDrift, hi = hold + P.pfDrift
    if (tg.hasLightning && !me.lightning) { lo = Math.max(lo, P.pfLightKeep); hi = Math.max(hi, lo + P.pfDrift) }
    B.rPrefNow = hold
    if (me.lightning && hold < P.pfRushHold && tg.dist > hold + P.pfRushOut && tg.dist < P.pfRushR && me.energy > P.pfRushE) {
      mover.moveTo(tg.x, tg.y, 1, hold); boostIf(0); B.legKind = 'p26rush'; return
    }
    if (!tg.losOut) {
      mover.moveTo(tg.x, tg.y, 1, Math.max(8, 0.6 * hold))
      B.legKind = 'p26regain'
      return
    }
    B.legKind = 'p26standoff'
    if (!mover.standoff(tg.x, tg.y, hold, true, true, lo, hi, 1)) {
      if (tg.dist > hi) mover.moveTo(tg.x, tg.y, 1, 5)
      else { const ax = me.x - tg.x, ay = me.y - tg.y, l = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / l * 20, me.y + ay / l * 20, 1, 1) }
    }
    if (tg.dist < hold - P.pfBoostBack && me.energy > P.pfBoostBackE) { boostIf(0); cnt('pfBoostBack') }
  }
  function lootLegs() {
    const me = B.me, l = B.loot, t = me.t, cmd = B.cmd
    const d = Math.hypot(l.x - me.x, l.y - me.y)
    B.lookHint = true; B.lookX = l.x; B.lookY = l.y
    B.legKind = 'p26' + l.type
    if (l.type === 'drone') {
      const tr = B.tracks.get(l.id)
      if (!tr) { cmd.mx = 0; cmd.my = 0; return }
      if (tr.dist > P.pfDroneNear + 6) mover.moveTo(tr.x, tr.y, 1, P.pfDroneNear)
      else mover.standoff(tr.x, tr.y, P.pfDroneNear, true, true, P.pfDroneNear - 4, P.pfDroneNear + 4, 1)
      return
    }
    if (l.type === 'crate') {
      if (t - S.lootT0 > P.pfCrateGiveS) { ignore.set(S.lootId, t + P.pfCrateIgnoreS); cnt('pfGiveUp') }
      const w = B.world
      const clear = !w || w.shotClear(me.x, me.y, me.z + me.muzzleH, l.x, l.y, l.z + 1.2)
      if (d < P.pfCrateMin) { const ax = me.x - l.x, ay = me.y - l.y, q = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / q * 8, me.y + ay / q * 8, 1, 1) }
      else if (d <= P.pfCrateShootR && clear) { cmd.mx = 0; cmd.my = 0 }
      else mover.moveTo(l.x, l.y, 1, P.pfCrateMin + 2)
      if (d <= P.pfCrateShootR && clear && t >= P.pfSpawnLookS) {
        crateObj.x = l.x; crateObj.y = l.y; crateObj.z = l.z; crateObj.id = l.id
        crateObj.radius = (cfg.crates && cfg.crates.radius) || 1.4; crateObj.height = (cfg.crates && cfg.crates.height) || 2.4
        B.shootCrate = crateObj
      }
      return
    }
    if (l.type === 'cube') {
      if (d < P.pfCubeNear) { if (S.nearT < 0) S.nearT = t } else S.nearT = -1
      if ((S.nearT >= 0 && t - S.nearT > P.pfCubeNearS) || t - S.lootT0 > P.pfCubeGiveS + S.lootD0 / P.pfCubeGivePerM) { ignore.set(S.lootId, t + P.pfCubeIgnoreS); cnt('pfGiveUp') }
    }
    if (l.type === 'hunt' && d < 10) ignore.set(S.lootId, t + 10)
    mover.moveTo(l.x, l.y, 1, l.type === 'pickup' ? 1.2 : l.type === 'drop' ? P.pfDropStop : l.type === 'hunt' ? 8 : 0.6)
    if (d > P.pfLongTrip && me.energy > P.pfLongTripE) boostIf(0)
  }
  /** Retreat under fire: boost out with energy over 12 (after the base retreat legs). */
  function afterLegs() {
    const me = B.me, cmd = B.cmd
    if (B.mode === MODE.DISENGAGE && !cmd.boost && me.t - me.lastHurtT <= 1 && me.grounded && me.energy > P.pfRetreatBoostE && Math.hypot(cmd.mx, cmd.my) > 0.3) cmd.boost = true
  }

  // ------------------------------------------------------------------ firecontrol hooks (3.7)
  /** Opportunistic crate shot when nothing else is shot: within 50 m (110 m with no mech seen for 4 s), after the
   *  1.7 s spawn look. */
  function crateShot() {
    const me = B.me, t = me.t, w = B.world
    if (t < P.pfSpawnLookS || !me.gun || B.mode === MODE.DROP) return null
    let lastSeen = -99
    for (const m of mem.values()) if (m.t > lastSeen) lastSeen = m.t
    const quiet = t - lastSeen >= P.pfCrateQuietS
    const R = quiet ? P.pfCrateFarR : P.pfCrateNearR
    let best = null, bd = R
    for (const c of B.crates.values()) {
      if (t - c.seen > 0.5) continue
      const d = Math.hypot(c.x - me.x, c.y - me.y)
      if (d >= bd || d < 6) continue
      if (w && !w.shotClear(me.x, me.y, me.z + me.muzzleH, c.x, c.y, c.z + 1.2)) continue
      bd = d; best = c
    }
    if (!best) return null
    crateObj.x = best.x; crateObj.y = best.y; crateObj.z = best.z; crateObj.id = best.id
    crateObj.radius = (cfg.crates && cfg.crates.radius) || 1.4; crateObj.height = (cfg.crates && cfg.crates.height) || 2.4
    cnt('pfCrateShot')
    return crateObj
  }
  /** Reload (3.7): nothing in view and at most a third; 1.5 s quiet with no mech in view at two thirds; 6 s quiet
   *  whenever not full (not while farming). */
  function wantReload(shootObj) {
    const me = B.me, g = me.gun, t = me.t
    if (g.ammo === 0) return true
    const quiet = t - Math.max(me.lastHurtT, me.lastShotT)
    const view = mechInView()
    if (!view && !shootObj && !S.shot && g.ammo <= g.mag / 3) return true
    if (!view && quiet >= P.pfRelQuiet1 && g.ammo <= g.mag * 2 / 3) return true
    if (quiet >= P.pfRelQuiet2 && !shootObj && !(B.loot && (B.loot.type === 'crate' || B.loot.type === 'drone'))) return true
    return false
  }
  /** No new laser charge on a drone at or under 150 hp, nor while a lightning carrier closes faster than 4 m/s at 46-68 m. */
  function laserVeto(tgt) {
    if (tgt && tgt.npc && tgt.hp <= P.pfLaserDroneHp) return true
    const L = B.trackList, me = B.me
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !tr.listed || !tr.hasLightning || tr.dist < P.pfLzLightLo || tr.dist > P.pfLzLightHi) continue
      const dx = me.x - tr.x, dy = me.y - tr.y, h = Math.hypot(dx, dy) || 1
      if ((dx * tr.vx + dy * tr.vy) / h > P.pfLzLightV) return true
    }
    return false
  }

  return { isLegal: (tr) => legalSet.has(tr), update, selectTarget, econ: econUpdate, decideMode, legs, afterLegs, fireTarget, crateShot, wantReload, laserVeto, rungs, hostile, prefRange, ownDps, foeDps, strength, S }
}
