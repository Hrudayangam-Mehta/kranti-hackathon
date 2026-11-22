// Build R4a (notes/build_spec_r4.md section 2): hunt50 (seek + 50% burst gate + commit + retreat pulse) and the seek alone.
// Everything here is inert unless P.hunt50 or P.seekOn: with both off no function below changes any state the other layers
// read (B.h50.on stays false, tr.h50Ok stays false, B.h50Pulse stays false), so the brain is the R3a2 brain byte for byte.
//   pre(obs)      assess stage, before selectTarget: firewall, sounds, lines on us, incoming dps, the gate (tr.h50Ok), commit leave
//   post()        after selectTarget: the commit
//   pulseUpdate() decideMode, after B.tCover: start / end of the retreat pulse (B.h50Pulse)
//   seekLegs()    holdLegs, before stance.idleLegs: prey, gunfire, last enemy fix, house parking ring

import { wrapPi } from './aim.js'
import { MODE } from './params.js'
import { fnum, ringSum, zoneSlack } from './senses.js'
import { inArena } from './tactics.js'

const SECT = Math.PI / 6

export function makeHunt(B, mover, econ) {
  const P = B.P
  const h = B.h50
  const on = () => P.hunt50 === true || P.seekOn === true
  const mechIds = new Set()
  const snd = []                                   // { t, b, w, far, x, y } gun / laser / lightning sounds, newest last
  let soundDoneT = -99, lastEnemyDoneT = -99
  const sw = new Float64Array(12), sc = new Float64Array(12), ss = new Float64Array(12), sx = new Float64Array(12), sy = new Float64Array(12), sm = new Float64Array(12)
  let prey = null, preyCost = Infinity, preyT = -99
  const ring = { ok: false, set: false, cx: 0, cy: 0, nr: -1, a: 0, x: 0, y: 0 }
  const goal = { x: 0, y: 0 }
  let ambT0 = -99, ambLast = -99

  /** SQUAD posture, no death we did not cause (h50ForeignMax), not the late zone, more than h50LateAlive alive. */
  function firewall() {
    const z = B.zone
    return B.env !== 'FFA' && B.foreignDeaths < P.h50ForeignMax && !(z.known && z.nr <= P.zoneLateR) && !(B.aliveN > 0 && B.aliveN <= P.h50LateAlive)
  }
  const laserIn = (lz) => lz.cooldown + Math.max(0, lz.full - lz.charge)
  function lightZaps() {
    const me = B.me, li = me.lightning
    if (!li) return 0
    return Math.max(0, Math.min(P.h50LightZaps, Math.floor((me.energy - P.lightMinEnergy) / Math.max(0.01, li.energy))))
  }
  function gunOk(tr) {
    const g = B.me.gun
    return !!g && tr.dist <= P.gunRangeFrac * g.range && (tr.dist / g.speed <= P.gunFlightMax || B.me.t - tr.steadySince >= P.steadyS)
  }
  /** Expected damage on tr in the next h50WindowS (3 s): magazine at the band hit rate, one ready beam, lightning zaps. */
  function burst3(tr) {
    const me = B.me, g = me.gun, lz = me.laser, li = me.lightning, k = me.dmgMult, rm = tr.rearOn ? me.rearMult : 1, W = P.h50WindowS
    let d = 0
    if (gunOk(tr)) {
      let shots = g.reload > 0 ? Math.floor(Math.max(0, W - g.reload) / g.cd) : Math.min(g.ammo, 1 + Math.floor(W / g.cd))
      shots = Math.min(shots, g.mag)
      d += shots * g.damage * k * B.gunStat.q(tr.dist) * rm
    }
    if (lz && tr.dist <= P.laserRangeFrac * lz.range && laserIn(lz) <= P.h50LaserReadyS) d += lz.damage * k * rm * (tr.hasMortar ? 1 + lz.cookoff : 1)
    if (li && tr.dist <= P.h50LightR) d += lightZaps() * li.damage * k * rm * P.h50LightHit
    return d
  }
  /** Time to kill tr from now (h50TtkStep steps to h50TtkMax s; 99 when not reached). */
  function ttk(tr) {
    const me = B.me, g = me.gun, lz = me.laser, li = me.lightning, k = me.dmgMult, rm = tr.rearOn ? me.rearMult : 1
    const gOk = gunOk(tr)
    const gd = gOk ? g.damage * k * B.gunStat.q(tr.dist) * rm : 0
    let tg = Infinity, ammo = 0
    if (gOk) {
      if (g.reload > 0) { tg = g.reload; ammo = g.mag } else if (g.ammo > 0) { tg = g.cooldown; ammo = g.ammo } else { tg = g.reloadS; ammo = g.mag }
    }
    const lOk = !!lz && tr.dist <= P.laserRangeFrac * lz.range
    const bd = lOk ? lz.damage * k * rm * (tr.hasMortar ? 1 + lz.cookoff : 1) : 0
    let tb = lOk ? laserIn(lz) + P.latency : Infinity
    const zOk = !!li && tr.dist <= P.h50LightR
    let zaps = zOk ? lightZaps() : 0, tz = zaps > 0 ? 0 : Infinity
    const zd = zOk ? li.damage * k * rm * P.h50LightHit : 0
    const hp = tr.hp, n = Math.round(P.h50TtkMax / P.h50TtkStep)
    let cum = 0
    for (let s = 1; s <= n; s++) {
      const T = s * P.h50TtkStep + 1e-9
      while (tg <= T) { cum += gd; if (--ammo <= 0) { tg += g.reloadS; ammo = g.mag } else tg += g.cd }
      while (tb <= T) { cum += bd; tb += lz.cd + lz.full }
      while (tz <= T && zaps > 0) { cum += zd; zaps--; tz += li.cd }
      if (cum >= hp) return s * P.h50TtkStep
    }
    return 99
  }
  /** D1 prior of a house mech's damage on us at range d (dps). */
  function hitAt(d) {
    const R = P.h50HitR, p = P.h50HitP
    return d < R[0] ? p[0] : d < R[1] ? p[1] : d < R[2] ? p[2] : d < R[3] ? p[3] : p[4]
  }
  function reserveOk(tr) {
    const me = B.me, T = ttk(tr)
    if (T <= P.h50FinishS) return true
    return me.hp - h.IN * T >= P.h50Reserve * me.maxHp
  }

  function readSounds(obs) {
    const me = B.me, t = me.t, list = obs && Array.isArray(obs.sounds) ? obs.sounds : null
    if (list) for (let k = 0; k < Math.min(list.length, 32); k++) {
      const s = list[k]
      if (!s || typeof s !== 'object' || (s.kind !== 'gun' && s.kind !== 'laser' && s.kind !== 'lightning')) continue
      if (typeof s.bearing !== 'number' || !Number.isFinite(s.bearing)) continue
      const age = Math.min(5, Math.max(0, fnum(s.age, 0)))
      if (snd.length >= 32) snd.shift()
      snd.push({ t: t - age, b: wrapPi(s.bearing), w: s.dist === 'near' ? 1.5 : s.dist === 'mid' ? 1 : 0.3, far: s.dist !== 'near' && s.dist !== 'mid', x: me.x, y: me.y })
    }
    while (snd.length > 0 && t - snd[0].t > P.h50SoundS + 1) snd.shift()
  }

  function pre(obs) {
    if (!on()) return
    const me = B.me, t = me.t, L = B.trackList
    const fw = firewall()
    h.seekOk = fw
    h.on = fw && P.hunt50 === true
    readSounds(obs)
    let lines = 0, IN = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc) continue
      tr.h50Ok = false
      if (mechIds.size < 64) mechIds.add(tr.id)
      if (tr.hp <= 0 || t - tr.losInT > P.h50LineS) continue
      if (tr.dist <= P.h50LinesR) lines++
      const a = ringSum(tr.dmgIn, t - P.dmgWindow)
      IN += ringSum.count >= P.dmgMinSamples ? a / P.dmgWindow : P.h50PriorGun * hitAt(tr.dist) + (tr.hasLaser ? P.h50PriorLaser : 0)
    }
    h.lines = lines; h.IN = IN
    if (!h.on) { h.commit = null; h.pulseUntil = -1; h.killT = -1; return }
    // our kill of a mech this decision (the track is already gone: ids of mechs seen before)
    const ev = obs && Array.isArray(obs.events) ? obs.events : null
    if (ev) for (let k = 0; k < Math.min(ev.length, 64); k++) {
      const e = ev[k]
      if (!e || e.type !== 'kill' || !mechIds.has(e.target)) continue
      const kd = B.killDrops.length > 0 ? B.killDrops[B.killDrops.length - 1] : null
      h.killT = t
      if (kd && kd.t === t) { h.killX = kd.x; h.killY = kd.y; h.killDist = Math.hypot(kd.x - me.x, kd.y - me.y) } else h.killDist = 1e9
      B.counters.h50Kills = (B.counters.h50Kills || 0) + 1
    }
    // the gate: listed mechs within h50EngR with a line now or < 1 s ago (never during the opening guard, never under h50MinHpf)
    const opening = t < (P.fightEarly === true && B.foreignDeaths === 0 ? P.earlyOpenS : P.openingS)
    if (!opening && me.hpf >= P.h50MinHpf) for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !tr.listed || tr.hp <= 0 || tr.dist > P.h50EngR) continue
      if (t - tr.losOutT > P.h50LineS && t - tr.losInT > P.h50LineS) continue
      if (burst3(tr) >= P.h50Frac * tr.hp && reserveOk(tr)) tr.h50Ok = true
    }
    // leave the commit: dead, the burst under h50Leave of its hp while the laser cools > 1 s, or h50NoDmgS without our damage
    const c = h.commit
    if (c) {
      let leave = B.tracks.get(c.id) !== c || c.hp <= 0
      if (!leave && me.laser && me.laser.cooldown > P.h50LeaveCoolS && burst3(c) < P.h50Leave * c.hp) leave = true
      if (!leave && t - Math.max(c.lastDmgOutT, h.commitT) > P.h50NoDmgS) leave = true
      if (leave) h.commit = null
    }
  }

  /** The commit: the picked target if it passed the gate, is hostile, or is already committed. */
  function post() {
    if (!h.on) return
    const pick = B.target
    if (pick && !pick.npc && (pick.h50Ok === true || pick.hostile || pick === h.commit)) {
      if (h.commit !== pick) { h.commit = pick; h.commitT = B.me.t; B.counters.h50Commits = (B.counters.h50Commits || 0) + 1 }
    } else if (pick !== h.commit) h.commit = null
  }

  function loaded() {
    const me = B.me, g = me.gun, lz = me.laser
    return (!g || (g.reload <= 0 && g.ammo >= P.h50MagMin)) && (!lz || lz.cooldown <= P.h50LaserOkS)
  }
  function spent() {
    const me = B.me, g = me.gun, lz = me.laser
    return (!g || g.reload > 0 || g.ammo <= 0) && (!lz || laserIn(lz) > P.h50SpentLaserS)
  }
  function finishLine() { const tg = B.target; return !!tg && !tg.npc && tg.finishable === true && tg.losOut }
  function killCube() {
    const me = B.me
    for (const c of B.cubes.values()) if (Math.hypot(c.x - me.x, c.y - me.y) <= P.h50CubeR && Math.hypot(c.x - h.killX, c.y - h.killY) < 25) return true
    return false
  }
  /** The retreat pulse (preset h50): sets B.h50Pulse for decideMode, the legs and the reload. */
  function pulseUpdate() {
    B.h50Pulse = false
    if (!h.on) return
    const t = B.me.t
    if (h.pulseUntil >= 0) {
      // release R4a fix: a pulse cut at h50PulseMax records pulseCapT; no new pulse starts within h50PulseGapS of it (no chaining)
      if (t >= h.pulseUntil) { h.pulseUntil = -1; h.pulseCapT = t }
      else if (loaded() || finishLine()) { h.pulseUntil = -1; h.pulseEndT = t } else { B.h50Pulse = true; return }
    }
    if (P.h50Pulse !== true) { h.killT = -1; return }
    let want = false
    if (h.killT >= 0) {
      if (h.lines < 1) h.killT = -1
      else {
        // its cubes first when they lie within h50CubeR and at most one other mech has a line (wait at most h50CubeWaitS)
        const wait = h.lines <= 1 && h.killDist <= P.h50CubeR && t - h.killT < P.h50CubeWaitS && (t - h.killT < P.h50CubeShowS || killCube())
        if (!wait) { want = true; h.killT = -1 }
      }
    }
    if (!want && h.lines >= 2 && B.target && !B.target.npc && spent()) want = true
    if (want && t - h.pulseCapT >= P.h50PulseGapS && B.hide.state === 'found' && B.tCover <= P.h50CoverS && !loaded() && !finishLine() && !B.lastStand) {
      h.pulseUntil = t + P.h50PulseMax; h.pulseT0 = t
      B.h50Pulse = true
      B.counters.h50Pulses = (B.counters.h50Pulses || 0) + 1
    }
  }

  // ------------------------------------------------------------------ seek (HOLD mode)
  function preyOk(tr, t) {
    return !tr.npc && tr.hp > 0 && (tr.listed || t - tr.lastSeen <= P.h50PreyMemS) && tr.dist <= P.h50PreyR
  }
  function reachable(tr, d) {
    const me = B.me, nav = B.nav, w = B.world
    if (w && tr.z - w.ground(tr.x, tr.y) > P.roofDz) return false
    if (nav) {
      const q = nav.nearestPassable(tr.x, tr.y, 4)
      if (!q) return false
      const c = nav.component(me.x, me.y)
      if (c >= 0 && nav.component(q.x, q.y) !== c) return false
    }
    return zoneSlack(B, tr.x, tr.y, me.t + d / me.walk + P.zoneArriveSlack) >= 3
  }
  function preyCostOf(tr, t) {
    const d = econ.pathEst(tr.x, tr.y)
    if (!reachable(tr, d)) return Infinity
    let c = d + P.h50Hp * tr.hp
    if (tr.hostile) c -= P.h50Hostile
    if (tr.hasLaser) c += P.h50Laser
    const L = B.trackList
    for (let k = 0; k < L.length; k++) {
      const o = L[k]
      if (o === tr || !preyOk(o, t)) continue
      if (Math.hypot(o.x - tr.x, o.y - tr.y) < P.h50CrowdR) { c += P.h50Crowd; break }
    }
    return c
  }
  /** Prey every h50PreyS: the cheapest reachable mech (path + 0.05 / hp, hostile -80, laser +60, crowd +100), hysteresis 30 m. */
  function updatePrey() {
    const t = B.me.t, L = B.trackList
    preyT = t
    let best = null, bestC = Infinity, curC = Infinity
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (!preyOk(tr, t)) continue
      const c = preyCostOf(tr, t)
      if (tr === prey) curC = c
      if (c < bestC) { bestC = c; best = tr }
    }
    if (prey && curC < Infinity && B.tracks.get(prey.id) === prey && !(bestC < curC - P.h50PreyHys)) { preyCost = curC; return }
    prey = best; preyCost = bestC
  }
  function soundGoal() {
    const me = B.me, t = me.t
    sw.fill(0); sc.fill(0); ss.fill(0); sx.fill(0); sy.fill(0); sm.fill(0)
    for (let k = 0; k < snd.length; k++) {
      const e = snd[k]
      if (t - e.t > P.h50SoundS || e.t <= soundDoneT) continue
      const i = ((Math.floor((e.b + Math.PI) / SECT) % 12) + 12) % 12
      sw[i] += e.w; sc[i] += e.w * Math.cos(e.b); ss[i] += e.w * Math.sin(e.b); sx[i] += e.w * e.x; sy[i] += e.w * e.y
      if (!e.far) sm[i] = 1
    }
    let bi = -1
    for (let i = 0; i < 12; i++) if (sw[i] > 0 && (bi < 0 || sw[i] > sw[bi])) bi = i
    if (bi < 0) return false
    const b = Math.atan2(ss[bi], sc[bi]), ox = sx[bi] / sw[bi], oy = sy[bi] / sw[bi]
    const D = sm[bi] ? P.h50SoundMid : P.h50SoundFar
    for (let r = D; r >= 20; r -= 10) {
      let x = ox + r * Math.cos(b), y = oy + r * Math.sin(b)
      if (zoneSlack(B, x, y, t + Math.hypot(x - me.x, y - me.y) / me.walk) < P.h50SoundSlack) continue
      if (B.nav) { const q = B.nav.nearestPassable(x, y, 20); if (q && B.nav.component(q.x, q.y) === B.nav.component(me.x, me.y)) { x = q.x; y = q.y } }
      if (Math.hypot(x - me.x, y - me.y) < Math.min(P.h50ArriveR, r)) { soundDoneT = t; return false }    // arrived: these sounds are used up
      goal.x = x; goal.y = y
      return true
    }
    return false
  }
  function ringGoal() {
    const me = B.me, z = B.zone, nav = B.nav
    if (!z.known) return false
    const R = P.h50RingFrac * z.nr
    if (!(R > 1)) return false
    if (!ring.ok || Math.hypot(ring.cx - z.nx, ring.cy - z.ny) > 5 || Math.abs(ring.nr - z.nr) > 1) {
      ring.ok = true; ring.cx = z.nx; ring.cy = z.ny; ring.nr = z.nr
      ring.a = Math.atan2(me.y - z.ny, me.x - z.nx); ring.set = false
    }
    const arrR = Math.min(P.h50ArriveR, 0.5 * R), step = P.h50RingStepDeg * Math.PI / 180
    const comp = nav ? nav.component(me.x, me.y) : -1
    for (let k = 0; k < 12; k++) {
      if (!ring.set) {
        ring.x = ring.cx + R * Math.cos(ring.a); ring.y = ring.cy + R * Math.sin(ring.a)
        let ok = inArena(B, ring.x, ring.y, 2)
        if (ok && nav) { const q = nav.nearestPassable(ring.x, ring.y, 20); ok = !!q && (comp < 0 || nav.component(q.x, q.y) === comp); if (ok) { ring.x = q.x; ring.y = q.y } }
        if (!ok) { ring.a += step; continue }
        ring.set = true
      }
      if (Math.hypot(ring.x - me.x, ring.y - me.y) < arrR || mover.isAbandoned(ring.x, ring.y)) { ring.a += step; ring.set = false; continue }
      goal.x = ring.x; goal.y = ring.y
      return true
    }
    return false
  }
  /** HOLD legs: walk to the prey (arrive 125 m with a laser, 90 m gun only; torso on it), else the gunfire, the last enemy
   * fix, the parking ring. Walking; boost only with >= 90 energy and a goal beyond 150 m. One A* at most (moveTo). */
  function seekLegs() {
    const me = B.me, t = me.t
    if (!on() || !h.seekOk) return false
    if (B.mode !== MODE.HOLD || B.target || B.dropTask || B.loot) return false
    if (me.hpf < P.h50SeekHpf || t < P.h50SeekFromS) return false
    if (t - preyT >= P.h50PreyS || (prey && (B.tracks.get(prey.id) !== prey || !preyOk(prey, t)))) updatePrey()
    let arrive = 1, kind
    if (prey && preyCost < Infinity) {
      goal.x = prey.x; goal.y = prey.y; arrive = me.laser ? P.h50ArriveLaser : P.h50ArriveGun; kind = 'hunt'
      B.lookHint = true; B.lookX = prey.x; B.lookY = prey.y
    } else if (soundGoal()) kind = 'huntsnd'
    else {
      const e = B.lastEnemy
      if (e && t - e.t <= P.h50LastEnemyS && e.t > lastEnemyDoneT) {
        if (Math.hypot(e.x - me.x, e.y - me.y) > P.h50ArriveR) { goal.x = e.x; goal.y = e.y; kind = 'huntlast' } else lastEnemyDoneT = e.t
      }
      if (!kind) { if (ringGoal()) kind = 'huntring'; else return false }
    }
    // switch prototype 'ambush': hold instead of seeking. ambHold 1 = the blind seeks (ring / last fix) become a timed hold;
    // 2 = also wait for a prey that is closing on us (let it walk into our line: we shoot first)
    if (P.ambHold > 0 && me.hpf >= P.ambHoldHpf) {
      let hold = false, lx = 0, ly = 0
      if (kind === 'huntring' || kind === 'huntlast') {
        if (ambT0 < 0 || t - ambLast > 1) ambT0 = t
        ambLast = t
        hold = t - ambT0 < P.ambHoldMaxS
        if (t - ambT0 > P.ambHoldMaxS + 6) ambT0 = t          // move window of 6 s, then hold again
        const e = B.lastEnemy
        if (e && t - e.t < 60) { lx = e.x; ly = e.y } else if (B.zone.known) { lx = B.zone.nx; ly = B.zone.ny } else hold = false
      } else if (kind === 'hunt' && P.ambHold >= 2 && prey) {
        const dx = me.x - prey.x, dy = me.y - prey.y, dd = Math.hypot(dx, dy) || 1
        const vc = (prey.vx * dx + prey.vy * dy) / dd
        if (vc >= P.ambCloseV && dd <= P.ambPreyR && dd > arrive) { hold = true; lx = prey.x; ly = prey.y }
      }
      if (hold) {
        B.cmd.mx = 0; B.cmd.my = 0
        B.lookHint = true; B.lookX = lx; B.lookY = ly
        B.legKind = 'ambhold'
        B.counters.ambHold = (B.counters.ambHold || 0) + 1
        return true
      }
    }
    const d = mover.moveTo(goal.x, goal.y, 1, arrive)
    if (me.energy >= P.h50SeekBoostE && d > P.h50SeekBoostD) B.cmd.boost = true
    B.legKind = kind
    B.counters.h50Seek = (B.counters.h50Seek || 0) + 1
    return true
  }

  return { pre, post, pulseUpdate, seekLegs, burst3, ttk, reserveOk, firewall, updatePrey, prey: () => prey, goal, loaded, spent }
}
