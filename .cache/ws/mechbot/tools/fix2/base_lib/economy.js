// Layer 5: loot (cubes, crates, drones, weapon pickups), power grabs in contact, take / drop, upgrade picks and
// supply drops (DOCTRINE V4 D6 / D7).

import { zoneSlack } from './senses.js'
import { inArena } from './tactics.js'

const RANK = { laser: 3, lightning: 2, mortar: 0 }   // an empty second slot ranks 1 ("nothing > mortar")
const rankOf = (kind) => (kind in RANK ? RANK[kind] : -1)

export function makeEconomy(B, mover) {
  const P = B.P
  const crateObj = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 1.4, height: 2.4, revs: 0, id: -1, steadySince: -99, airborne: false }
  let lootT = -9, grabT = -9, offerIds = new Set(), offersSeen = 0, lastOfferId = null, betterSeenT = 0
  const dropWatch = { id: -1, landed: false }

  /** D7: do we want this pickup, and which slot would it replace (-1 = goes into the empty slot)? */
  function wantPickup(kind) {
    const me = B.me, w0 = me.weapons[0], w1 = me.weapons[1], t = me.t
    if (typeof kind !== 'string') return null
    if ((w0 && w0.kind === kind) || (w1 && w1.kind === kind)) return null
    if (kind === 'gun') return me.gun ? null : { drop: !w0 || !w1 ? -1 : (rankOf(w0.kind) <= rankOf(w1.kind) ? 0 : 1) }
    const r = rankOf(kind)
    // FFA latched (preset ffaPair): laser + lightning, the gun goes
    if (B.env === 'FFA' && P.ffaPair && w0 && w1 && (kind === 'laser' || kind === 'lightning')) {
      const other = w0.kind === 'gun' ? w1 : w1.kind === 'gun' ? w0 : null
      if (other && (other.kind === 'laser' || other.kind === 'lightning') && other.kind !== kind) {
        const gs = w0.kind === 'gun' ? 0 : 1
        if (!(me.laser && me.laser.charge > 0)) return { drop: gs }
      }
    }
    if (!w0 || !w1) {
      if (r > 1) return { drop: -1 }
      // a mortar only when nothing better has been seen for 60 s (cook-off risk)
      if (kind === 'mortar' && t - betterSeenT >= P.mortarWaitS) return { drop: -1 }
      return null
    }
    // both slots full: replace the non-gun weapon when the new one ranks higher (the gun always stays in SQUAD)
    let s = w0.kind === 'gun' ? 1 : w1.kind === 'gun' ? 0 : (rankOf(w0.kind) <= rankOf(w1.kind) ? 0 : 1)
    const cur = me.weapons[s]
    if (cur.kind === 'laser' && cur.charge > 0) return null
    return r > rankOf(cur.kind) && r > 1 ? { drop: s } : null
  }

  function reachable(x, y, z) {
    const nav = B.nav, me = B.me
    if (!inArena(B, x, y)) return false
    if (!nav) return !me.grounded || Math.abs(z - me.z) < 6
    if (B.world && z - B.world.ground(x, y) > P.roofDz) return false        // roof loot (D6)
    if (Math.abs(z - nav.levelAt(x, y)) > 3) return false
    const q = nav.passableAt(x, y) ? 1 : nav.nearestPassableIdx(x, y, 3.5)
    if (q < 0) return false
    const c = nav.component(me.x, me.y)
    return c < 0 || nav.component(x, y) === c
  }
  function nearDrone(x, y, exceptId) {
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (tr.npc && tr.id !== exceptId && Math.hypot(tr.x - x, tr.y - y) < P.droneAvoid) return true }
    return false
  }
  function pathEst(x, y) {
    const me = B.me, d = Math.hypot(x - me.x, y - me.y)
    return B.nav && d > 2 && !B.nav.walkLine(me.x, me.y, x, y) ? d * 1.4 : d
  }
  function nearestMechD() {
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.conf > 0.3) return tr.dist }
    return Infinity
  }

  /** Out-of-contact loot (LOOT mode): cubes, wanted weapons, and farming of crates and drones (D6). */
  function chooseLoot() {
    const me = B.me, t = me.t
    B.loot = null; B.farmNpc = -1
    const quiet = t - B.lastContactT >= 3 && B.A === 0
    if (!quiet && B.everSawMech) return
    const ffa = B.env === 'FFA'
    const farm = me.hpf >= P.farmHp && t < P.farmStopT && !(me.cubes >= P.farmStopCubes && me.laser) && (!ffa || nearestMechD() > P.ffaFarmClear)
    let best = null, bestV = 0
    const consider = (type, o, value, extraT, maxPath) => {
      if (mover.isAbandoned(o.x, o.y)) return
      const d = pathEst(o.x, o.y)
      if (d > maxPath) return
      const tt = d / me.walk + extraT
      if (zoneSlack(B, o.x, o.y, t + tt + P.zoneArriveSlack) < 3) return
      if (type !== 'drone' && nearDrone(o.x, o.y)) return
      if (!reachable(o.x, o.y, o.z)) return
      const v = value / (tt + 0.5)
      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o } }
    }
    const cubeV = me.cubes >= (B.cfg.cubes.stat_cap || 10) ? 0.4 : P.cubeValue
    if (cubesWanted()) for (const c of B.cubes.values()) {
      const nearKill = isKillCube(c)
      consider('cube', c, nearKill ? cubeV * 1.5 : cubeV, 0, nearKill ? P.grabCubeHi : P.lootCubePath)
    }
    for (const p of B.pickups.values()) {
      if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
      if (wantPickup(p.kind)) consider('pickup', p, P.weaponValue * (p.kind === 'laser' ? 1.5 : 1), 1, P.lootPickupPath)
    }
    if (farm) {
      const wantW = !me.weapons[0] || !me.weapons[1]
      if (me.gun && !(ffa && nearestMechD() < 320)) for (const c of B.crates.values()) {
        const shootT = Math.max(1, c.hp) / Math.max(1, me.gun.damage * me.dmgMult) * me.gun.cd + 1
        consider('crate', c, 1 + (wantW ? 0.5 * P.weaponValue : 0), shootT, P.lootCratePath)
      }
      if (me.gun) for (let k = 0; k < B.trackList.length; k++) {
        const tr = B.trackList[k]
        if (!tr.npc || !tr.listed || tr.hp <= 0) continue
        const shootT = tr.hp / Math.max(1, me.gun.damage * me.dmgMult * 0.8) * me.gun.cd + 1
        consider('drone', tr, 2, shootT, P.lootDronePath)
      }
    }
    B.loot = best
    if (best && best.type === 'drone') B.farmNpc = best.id
  }
  /** Past the stat cap (10) a cube only grows the body: collect only when an upgrade threshold is within 3 cubes. */
  function cubesWanted() {
    const me = B.me, cap = B.cfg.cubes.stat_cap || 10
    if (me.cubes < cap) return true
    const th = Array.isArray(B.cfg.cubes.upgrade_thresholds) ? B.cfg.cubes.upgrade_thresholds : [15, 21, 28, 36, 45]
    for (let i = 0; i < th.length; i++) if (th[i] > me.cubes) return th[i] - me.cubes <= 3
    return false
  }
  function isKillCube(c) {
    const t = B.me.t
    for (let k = 0; k < B.killDrops.length; k++) { const kd = B.killDrops[k]; if (t - kd.t < P.killDropS && Math.hypot(c.x - kd.x, c.y - kd.y) < 25) return true }
    return false
  }

  /** D6 power grabs in contact: a remembered cube (40 s) within 70 / 40 / 12 m, a laser within 60 m, others 35 m. */
  function chooseGrab() {
    const me = B.me, t = me.t
    B.grab = null
    if (B.mode === 'ZONE' || B.lastStand || B.zoneUrgent) return
    const lose = B.losing
    const cubeR = lose ? P.grabCubeLose : me.hpf > P.grabHpf ? P.grabCubeHi : P.grabCubeLo
    let best = null, bestV = 0
    const tryOne = (type, o, value, maxPath) => {
      if (mover.isAbandoned(o.x, o.y)) return
      const d = pathEst(o.x, o.y)
      if (d > maxPath) return
      if (zoneSlack(B, o.x, o.y, t + d / me.walk + P.zoneArriveSlack) < 3) return
      if (nearDrone(o.x, o.y) || !reachable(o.x, o.y, o.z)) return
      const v = value / (d / me.walk + 0.5)
      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o } }
    }
    if (cubesWanted()) for (const c of B.cubes.values()) if (t - c.seen <= P.cubeMemS) tryOne('cube', c, isKillCube(c) ? 1.5 : 1, cubeR)
    if (!lose) for (const p of B.pickups.values()) {
      if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
      if (t - p.seen > 60 || !wantPickup(p.kind)) continue
      tryOne('pickup', p, P.weaponValue * 2, p.kind === 'laser' && !me.laser ? P.grabLaserR : P.grabOtherR)
    }
    B.grab = best
  }

  /** D6 supply drops: unheld, within 250 m, arrive no more than 3 s before the landing, never contested. */
  function chooseDrop() {
    const me = B.me, t = me.t
    B.dropTask = null
    if (B.lastStand) return
    for (let k = 0; k < B.drops.length; k++) {
      const d = B.drops[k]
      if (d.holder >= 0 && d.holder !== me.id) continue
      const dist = Math.hypot(d.x - me.x, d.y - me.y)
      const landed = d.landsIn <= 0
      if (dist > (landed ? P.dropLeaveR : P.dropMaxD)) continue
      const path = dist * P.pathFactor, tApp = path / me.walk
      if (!landed && tApp < d.landsIn - P.dropEarlyS) continue                 // too early: no waiting in the ring
      if (me.hp <= B.A * (tApp + P.dropCaptureS) + P.dropHpBase) continue
      if (zoneSlack(B, d.x, d.y, t + Math.max(tApp, d.landsIn) + P.dropCaptureS + 3) < d.radius) continue
      let contested = false
      for (let i = 0; i < B.trackList.length; i++) {
        const tr = B.trackList[i]
        if (tr.npc || tr.conf < 0.3) continue
        if (Math.hypot(tr.x - d.x, tr.y - d.y) < P.dropContestR) { contested = true; break }
      }
      if (contested) continue
      if (!B.dropTask || dist < B.dropTask.dist) B.dropTask = { x: d.x, y: d.y, dist, radius: d.radius, landsIn: d.landsIn }
    }
  }

  function update() {
    const t = B.me.t
    for (const p of B.pickups.values()) if (p.kind === 'laser' || p.kind === 'lightning') betterSeenT = t
    if (B.me.laser || B.me.lightning) betterSeenT = t
    if (t - lootT >= 0.5 || (B.loot && !lootStillThere(B.loot))) { lootT = t; chooseLoot(); chooseDrop() }
    if (t - grabT >= 0.25 || (B.grab && !lootStillThere(B.grab))) { grabT = t; chooseGrab() }
  }
  function lootStillThere(l) {
    if (l.type === 'drone') { const tr = B.tracks.get(l.id); return !!tr && tr.hp > 0 }
    const map = l.type === 'cube' ? B.cubes : l.type === 'crate' ? B.crates : B.pickups
    return map.has(l.id)
  }

  function lootLegs() {
    const me = B.me, l = B.loot
    if (!l) { B.cmd.mx = 0; B.cmd.my = 0; return }
    const d = Math.hypot(l.x - me.x, l.y - me.y)
    B.lookHint = true; B.lookX = l.x; B.lookY = l.y
    if (l.type === 'drone') {
      const tr = B.tracks.get(l.id)
      if (!tr) { B.cmd.mx = 0; B.cmd.my = 0; return }
      // approach to 38 m, stand and shoot; leave to 75 m when hp < 50%
      const want = me.hpf < P.droneLeaveHpf ? P.droneLeave : P.droneApproach
      if (tr.dist > want + 4) mover.moveTo(tr.x, tr.y, 1, want)
      else if (tr.dist < want - 8) { const ax = me.x - tr.x, ay = me.y - tr.y, l2 = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / l2 * 10, me.y + ay / l2 * 10, 1, 1) }
      else { B.cmd.mx = 0; B.cmd.my = 0 }
      return
    }
    if (l.type === 'crate') {
      const w = B.world
      const clear = !w || w.shotClear(me.x, me.y, me.z + me.muzzleH, l.x, l.y, l.z + 1.2)
      if (d <= Math.max(P.crateShootR, P.crateApproach) && clear) {
        crateObj.x = l.x; crateObj.y = l.y; crateObj.z = l.z; crateObj.id = l.id
        crateObj.radius = (B.cfg.crates && B.cfg.crates.radius) || 1.4; crateObj.height = (B.cfg.crates && B.cfg.crates.height) || 2.4
        B.shootCrate = crateObj
        if (d > P.crateApproach) mover.moveTo(l.x, l.y, 1, P.crateApproach); else { B.cmd.mx = 0; B.cmd.my = 0 }
        return
      }
      mover.moveTo(l.x, l.y, 1, 6)
      return
    }
    mover.moveTo(l.x, l.y, 1, l.type === 'pickup' ? 1.2 : 0.6)
  }

  /** Leg overlay for a power grab while fighting: walk at it with the strafe blended in. True when it took the legs. */
  function grabLegs(strafeW) {
    const g = B.grab, me = B.me, cmd = B.cmd
    if (!g) return false
    const d = mover.moveTo(g.x, g.y, 1, g.type === 'pickup' ? 1.2 : 0.6)
    if (d < 1.5) return true
    const tgt = B.target
    if (tgt && strafeW > 0 && d > 6) {
      const bx = tgt.x - me.x, by = tgt.y - me.y, bl = Math.hypot(bx, by) || 1, s = mover.jink.sign
      let mx = cmd.mx + (-by / bl) * s * strafeW, my = cmd.my + (bx / bl) * s * strafeW
      const l = Math.hypot(mx, my) || 1; cmd.mx = mx / l; cmd.my = my / l
    }
    B.legKind = 'grab'
    return true
  }

  function dropLegs() {
    const d = B.dropTask
    if (!d) { B.cmd.mx = 0; B.cmd.my = 0; return }
    mover.moveTo(d.x, d.y, 1, 1.0)
  }

  /** take / drop: never blocked by any mode. */
  function hands() {
    const me = B.me, out = B.out, t = me.t
    out.take = -1; out.drop = -1
    let bestD = Infinity
    for (const p of B.pickups.values()) {
      if (p.seen < t - 1.5) continue
      const d = Math.hypot(p.x - me.x, p.y - me.y)
      if (d > P.takeReach || Math.abs(p.z - me.z) > P.takeDz || d >= bestD) continue
      if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
      const w = wantPickup(p.kind)
      if (!w) continue
      bestD = d; out.take = p.id; out.drop = w.drop
    }
  }

  /** D7 upgrade order (PARAMS.upgradeOrder), answered on the tick the offer appears. */
  function pick(obs) {
    const out = B.out, me = B.me
    out.pick = -1
    const of = obs.offer
    if (!of || typeof of !== 'object' || !Array.isArray(of.choices) || of.choices.length === 0) return
    if (of.id !== lastOfferId) { lastOfferId = of.id; if (!offerIds.has(of.id)) { offerIds.add(of.id); offersSeen++ } }
    const order = Array.isArray(P.upgradeOrder) ? P.upgradeOrder : []
    let best = 0, bestScore = Infinity
    const n = Math.min(3, of.choices.length)
    for (let i = 0; i < n; i++) {
      const c = of.choices[i]
      const id = c && typeof c === 'object' && typeof c.id === 'string' ? c.id : ''
      let s = order.indexOf(id)
      if (s < 0) s = 100
      if ((id === 'laser_damage' || id === 'laser_charge' || id === 'laser_pierce') && !me.laser) s = 60 + s
      if (id.startsWith('lightning') && !me.lightning) s = 60 + s
      if (id.startsWith('mortar') && !me.mortar) s = 80 + s
      s += i * 0.001
      if (s < bestScore) { bestScore = s; best = i }
    }
    out.pick = best
  }

  return { update, lootLegs, dropLegs, grabLegs, hands, pick, wantPickup }
}
