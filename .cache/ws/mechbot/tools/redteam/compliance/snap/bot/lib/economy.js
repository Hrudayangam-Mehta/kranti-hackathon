// Layer 5: loot (cubes, crates, weapon pickups), take / drop, upgrade picks and supply drops.

import { UPGRADE_ORDER } from './params.js'
import { zoneSlack } from './senses.js'

const RANK = { laser: 3, lightning: 2, mortar: 0 }   // an empty second slot ranks 1 ("nothing > mortar")
const rankOf = (kind) => (kind in RANK ? RANK[kind] : -1)

export function makeEconomy(B, mover) {
  const P = B.P
  const crateObj = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 1.4, height: 2.4, revs: 0, id: -1 }
  let lootT = -9, offerIds = new Set(), offersSeen = 0, lastOfferId = null

  /** Do we want this pickup, and which slot would it replace (-1 = goes into the empty slot)? */
  function wantPickup(kind) {
    const me = B.me, w0 = me.weapons[0], w1 = me.weapons[1]
    if (typeof kind !== 'string') return null
    if ((w0 && w0.kind === kind) || (w1 && w1.kind === kind)) return null
    if (kind === 'gun') return me.gun ? null : { drop: !w0 || !w1 ? -1 : (rankOf(w0.kind) <= rankOf(w1.kind) ? 0 : 1) }
    const r = rankOf(kind)
    if (!w0 || !w1) return r > 1 ? { drop: -1 } : null
    // both slots full: replace the non-gun weapon when the new one ranks higher (the gun always stays)
    let s = w0.kind === 'gun' ? 1 : w1.kind === 'gun' ? 0 : (rankOf(w0.kind) <= rankOf(w1.kind) ? 0 : 1)
    const cur = me.weapons[s]
    if (cur.kind === 'laser' && cur.charge > 0) return null
    return r > rankOf(cur.kind) && r > 1 ? { drop: s } : null
  }

  function reachable(x, y, z) {
    const nav = B.nav, me = B.me
    if (!nav) return !me.grounded || Math.abs(z - me.z) < 6
    if (Math.abs(z - nav.levelAt(x, y)) > 3) return false          // on a roof
    const q = nav.passableAt(x, y) ? 1 : nav.nearestPassableIdx(x, y, 3.5)
    if (q < 0) return false
    const c = nav.component(me.x, me.y)
    return c < 0 || nav.component(x, y) === c
  }
  function nearDrone(x, y) {
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (tr.npc && Math.hypot(tr.x - x, tr.y - y) < P.droneAvoid) return true }
    return false
  }
  function pathEst(x, y) {
    const me = B.me, d = Math.hypot(x - me.x, y - me.y)
    return B.nav && d > 2 && !B.nav.walkLine(me.x, me.y, x, y) ? d * 1.4 : d
  }

  function chooseLoot() {
    const me = B.me, t = me.t
    B.loot = null
    const quiet = t - B.lastLosInT > 1.0
    let mechNear = false
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.conf > 0.3 && tr.dist < P.lootQuietR) { mechNear = true; break } }
    const open = !B.everSawMech || (B.A === 0 && !mechNear && me.hpf >= P.lootHpf)
    const killDrop = quiet && B.A === 0 && t - B.lastKillT < 60
    if (!open && !killDrop) return
    const lootR = B.eff.loot
    let best = null, bestV = 0
    const consider = (type, o, value, extraT, maxPath) => {
      if (mover.isAbandoned(o.x, o.y)) return
      const d = pathEst(o.x, o.y)
      if (d > maxPath) return
      const tt = d / me.walk + extraT
      if (zoneSlack(B, o.x, o.y, t + tt + P.zoneArriveSlack) < 3) return
      if (nearDrone(o.x, o.y) || !reachable(o.x, o.y, o.z)) return
      const v = value / (tt + 0.5)
      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o } }
    }
    const cubeV = me.cubes >= (B.cfg.cubes.stat_cap || 10) ? 0.4 : P.cubeValue
    for (const c of B.cubes.values()) {
      const nearKill = killDrop && Math.hypot(c.x - B.lastKillX, c.y - B.lastKillY) < 25
      if (open || nearKill) consider('cube', c, cubeV, 0, nearKill ? P.killDropPath : Math.min(P.lootCubePath, Math.max(lootR, 25) * 1.5))
    }
    if (open) {
      const wantW = !me.weapons[0] || !me.weapons[1]
      if (me.gun) for (const c of B.crates.values()) {
        const shootT = Math.max(1, c.hp) / Math.max(1, me.gun.damage * me.dmgMult) * me.gun.cd + 1
        consider('crate', c, 1 + (wantW ? 0.5 * P.weaponValue : 0), shootT, Math.min(P.lootCratePath, Math.max(lootR, 25) * 2))
      }
      for (const p of B.pickups.values()) {
        if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
        if (wantPickup(p.kind)) consider('pickup', p, P.weaponValue, 1, P.lootPickupPath)
      }
    }
    B.loot = best
  }

  function chooseDrop() {
    const me = B.me, t = me.t
    B.dropTask = null
    if (B.stance === 'LAST-STAND') return
    for (let k = 0; k < B.drops.length; k++) {
      const d = B.drops[k]
      if (d.holder >= 0 && d.holder !== me.id) continue
      const dist = Math.hypot(d.x - me.x, d.y - me.y)
      const path = dist * P.pathFactor
      const tApp = path / me.walk
      if (me.hp <= B.A * (tApp + P.dropCaptureS) + P.dropHpBase) continue
      if (path > me.walk * (d.landsIn + P.dropPathLead)) continue
      if (zoneSlack(B, d.x, d.y, t + Math.max(tApp, d.landsIn) + P.dropCaptureS + 3) < d.radius) continue
      if (me.hpf > 0.97 && me.cubes >= 12) continue
      let contested = false
      for (let i = 0; i < B.trackList.length; i++) {
        const tr = B.trackList[i]
        if (tr.npc || tr.conf < 0.3) continue
        if (Math.hypot(tr.x - d.x, tr.y - d.y) / me.walk < d.landsIn + P.dropEnemyLead) { contested = true; break }
      }
      if (contested) continue
      if (!B.dropTask || dist < B.dropTask.dist) B.dropTask = { x: d.x, y: d.y, dist, radius: d.radius, landsIn: d.landsIn }
    }
  }

  function update() {
    const t = B.me.t
    if (t - lootT >= 0.5 || (B.loot && !lootStillThere())) { lootT = t; chooseLoot(); chooseDrop() }
  }
  function lootStillThere() {
    const l = B.loot
    const map = l.type === 'cube' ? B.cubes : l.type === 'crate' ? B.crates : B.pickups
    return map.has(l.id)
  }

  function lootLegs() {
    const me = B.me, l = B.loot
    if (!l) { B.cmd.mx = 0; B.cmd.my = 0; return }
    const d = Math.hypot(l.x - me.x, l.y - me.y)
    B.lookHint = true; B.lookX = l.x; B.lookY = l.y
    if (l.type === 'crate') {
      const w = B.world
      const clear = !w || w.shotClear(me.x, me.y, me.z + me.muzzleH, l.x, l.y, l.z + 1.2)
      if (d <= P.crateShootR && clear) {
        crateObj.x = l.x; crateObj.y = l.y; crateObj.z = l.z; crateObj.id = l.id
        crateObj.radius = (B.cfg.crates && B.cfg.crates.radius) || 1.4; crateObj.height = (B.cfg.crates && B.cfg.crates.height) || 2.4
        B.shootCrate = crateObj
        if (d > 9) mover.moveTo(l.x, l.y, 1, 8); else { B.cmd.mx = 0; B.cmd.my = 0 }
        return
      }
      mover.moveTo(l.x, l.y, 1, 6)
      return
    }
    mover.moveTo(l.x, l.y, 1, l.type === 'pickup' ? 1.2 : 0.6)
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

  /** Upgrade choice: strict priority list, answered on the tick the offer appears. */
  function pick(obs) {
    const out = B.out, me = B.me
    out.pick = -1
    const of = obs.offer
    if (!of || typeof of !== 'object' || !Array.isArray(of.choices) || of.choices.length === 0) return
    if (of.id !== lastOfferId) { lastOfferId = of.id; if (!offerIds.has(of.id)) { offerIds.add(of.id); offersSeen++ } }
    let best = 0, bestScore = Infinity
    const n = Math.min(3, of.choices.length)
    for (let i = 0; i < n; i++) {
      const c = of.choices[i]
      const id = c && typeof c === 'object' && typeof c.id === 'string' ? c.id : ''
      let s = UPGRADE_ORDER.indexOf(id)
      if (s < 0) s = 100
      if (id === 'nanites') s = offersSeen <= 2 ? -1 : 5.5
      if (id === 'laser_damage' || id === 'laser_charge') { if (!me.laser) s = 60 }
      if ((id === 'capacitor' || id === 'reactor' || id === 'lightning_range') && !me.lightning) s = 50 + s
      if (id === 'plating' && B.env === 'FFA') s = -2
      if (id.startsWith('mortar')) s = 90
      s += i * 0.001
      if (s < bestScore) { bestScore = s; best = i }
    }
    out.pick = best
  }

  return { update, lootLegs, dropLegs, hands, pick, wantPickup }
}
