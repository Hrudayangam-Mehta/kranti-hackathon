// Owner request R1: smart crate / drone shooting and loot stealing.
//   a) a crate or drone that another mech is shooting (its hp falls without our hits, or a beam ends on it) is a steal
//      target: wait in cover near it, step onto a pickup spot just before it breaks, take the cube and the weapon;
//   b) kill drops (FFA): a mech that dies drops its cubes (+2) and its non-gun weapons: rush them when we get there
//      first by path time, else mark the survivor for the D11 third party;
//   c) death cubes are remembered longer and collected from farther;
//   d) cubes / pickups another mech walks toward: go only when we get there first, then with a bonus;
//   e) supply drops: never contest a capture or an occupied ring, never race a mech that gets there first.
// Smart shooting: crates and drones are not shot while a mech is tracked or heard nearby (our first shot would give
// us away and take the torso off the mech), and a drone is not started while our regeneration is pending.
// Every steal is gated by hp, threats with a line of fire and zone margin; in SQUAD the D6 farming rules stay.
// Switches: PARAMS.stealOn (a-e), PARAMS.crateGateOn (smart shooting; FFA only unless crateGateSquad). All work is
// bounded per decision.

import { angDiff } from './aim.js'
import { zoneSlack } from './senses.js'
import { inArena } from './tactics.js'

const isArr = Array.isArray
const fin = (v) => typeof v === 'number' && v === v && v > -1e6 && v < 1e6
const vec3 = (a) => isArr(a) && a.length >= 3 && fin(a[0]) && fin(a[1]) && fin(a[2])
const MECH_SOUND = { step: 1, boost: 1, jet: 1, reload: 1, gun: 1, laser: 1, laser_charge: 1, lightning: 1, mortar: 1 }

export function makeSteal(B, mover, econ) {
  const P = B.P
  const watch = new Map()                 // crate / drone id -> damage-by-others record
  const hitsNow = new Map()               // our hits of this observation by target id
  const deaths = []                       // recent deaths of mechs we did not kill
  const prevListed = new Map()            // mechs listed in the previous observation
  const survivorT = new Map()             // mech id -> time it survived a duel next to a death
  const skip = new Map()                  // steal ids given up -> until
  let prevAlive = -1, lastMechSoundT = -99, deathSoundT = -99, deathSoundBearing = 0
  const task = { on: false, type: '', id: -1, npc: false, x: 0, y: 0, z: 0, spotX: 0, spotY: 0, waitX: 0, waitY: 0, hasWait: false,
    state: '', t0: -99, waitT: -99, goneT: -1, shooter: -1, sx: 0, sy: 0, sz: 0, value: 0, dist: 0, dashT: 1 }
  const crateObj = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 1.4, height: 2.4, revs: 0, id: -1, steadySince: -99, airborne: false }
  const out = { type: 'steal', id: -1, x: 0, y: 0, z: 0, obj: null }

  // ------------------------------------------------------------------ senses
  function sense(obs) {
    const me = B.me, t = me.t
    B.stealFinish = false
    if (!P.stealOn && !P.crateGateOn) return
    hitsNow.clear()
    const ev = isArr(obs.events) ? obs.events : []
    for (let k = 0; k < Math.min(ev.length, 64); k++) {
      const e = ev[k]
      if (e && e.type === 'hit' && Number.isInteger(e.target) && e.target >= 100 && fin(e.amount)) hitsNow.set(e.target, (hitsNow.get(e.target) || 0) + Math.max(0, e.amount))
    }
    const snd = isArr(obs.sounds) ? obs.sounds : []
    for (let k = 0; k < Math.min(snd.length, 32); k++) {
      const s = snd[k]
      if (!s || typeof s !== 'object') continue
      if (MECH_SOUND[s.kind] === 1 && (s.dist === 'near' || (s.kind === 'laser_charge' && s.dist === 'mid'))) lastMechSoundT = t
      if (s.kind === 'death' && fin(s.bearing)) { deathSoundT = t; deathSoundBearing = s.bearing }
    }
    if (!P.stealOn) return
    // crates: hp falling without our hits
    const cl = isArr(obs.crates) ? obs.crates : []
    for (let k = 0; k < Math.min(cl.length, 64); k++) {
      const c = cl[k]
      if (!c || typeof c !== 'object' || !Number.isInteger(c.id) || !vec3(c.pos) || !fin(c.hp)) continue
      note(c.id, false, c.pos[0], c.pos[1], c.pos[2], c.hp, t)
    }
    // drones: same from the track list
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc && tr.listed) note(tr.id, true, tr.x, tr.y, tr.z, tr.hp, t)
    }
    // beams by others that end on a crate or a drone
    const bl = isArr(obs.beams) ? obs.beams : []
    for (let k = 0; k < Math.min(bl.length, 16); k++) {
      const b = bl[k]
      if (!b || typeof b !== 'object' || !Number.isInteger(b.by) || b.by === me.id || !isArr(b.path) || b.path.length < 2) continue
      const e = b.path[b.path.length - 1]
      if (!vec3(e)) continue
      for (const w of watch.values()) {
        if (t - w.t > 1 || Math.hypot(e[0] - w.x, e[1] - w.y) > (w.npc ? 3.2 : 2.6) || Math.abs(e[2] - w.z - 1.5) > 4) continue
        if (w.t0 < 0 || t - w.lastT > 3) { w.t0 = t - 0.1; w.dmg = 0 }
        w.lastT = t; w.shooter = b.by
        const s0 = b.path[0]
        if (vec3(s0)) { w.sx = s0[0]; w.sy = s0[1]; w.sz = s0[2]; w.sT = t }
      }
    }
    // who is shooting it: a listed mech whose torso points at it
    for (const w of watch.values()) {
      if (t - w.lastT > 1.5) continue
      let best = null, bestE = 1e9
      for (let k = 0; k < B.trackList.length; k++) {
        const tr = B.trackList[k]
        if (tr.npc || !tr.listed) continue
        const d = Math.hypot(w.x - tr.x, w.y - tr.y)
        if (d > 260 || d < 1) continue
        const e = Math.abs(angDiff(tr.yaw, Math.atan2(w.y - tr.y, w.x - tr.x))) - Math.atan2(2.5, d)
        if (e < 0.05 && e < bestE) { bestE = e; best = tr }
      }
      if (best) { w.shooter = best.id; w.sx = best.x; w.sy = best.y; w.sz = best.z + best.muzzleH; w.sT = t }
    }
    if (watch.size > 40) for (const w of watch.values()) if (t - w.t > 20) watch.delete(w.id)
    senseDeaths(obs)
    // the steal target broke: gone from the list although we would see it
    if (task.on && task.goneT < 0) {
      let listed = false
      if (task.npc) { const tr = B.tracks.get(task.id); listed = !!(tr && tr.listed && tr.hp > 0) }
      else for (let k = 0; k < Math.min(cl.length, 64); k++) { const c = cl[k]; if (c && c.id === task.id) { listed = true; break } }
      if (!listed && seesPoint(task.x, task.y, task.z + 1.2)) task.goneT = t
    }
  }

  function note(id, npc, x, y, z, hp, t) {
    let w = watch.get(id)
    if (!w) {
      if (watch.size >= 48) { const first = watch.keys().next().value; watch.delete(first) }
      w = { id, npc, x, y, z, hp, t, dmg: 0, t0: -1, lastT: -99, rate: 0, shooter: -1, sx: 0, sy: 0, sz: 0, sT: -99 }
      watch.set(id, w)
      return
    }
    const drop = w.hp - hp - (hitsNow.get(id) || 0)
    if (drop > 1 && t - w.t < 1.0) {
      if (w.t0 < 0 || t - w.lastT > 3) { w.t0 = t - 0.1; w.dmg = 0 }
      w.dmg += drop; w.lastT = t
      w.rate = w.dmg / Math.max(1.0, t - w.t0)            // >= 1 s window: one 45 hp hit is not a 450 hp/s rate
    }
    w.hp = hp; w.t = t; w.x = x; w.y = y; w.z = z
  }

  /** Would we see the point from `from` (default: where we are now)? One sight ray at most. */
  function seesPoint(x, y, z, from) {
    const me = from || B.me, d = Math.hypot(x - me.x, y - me.y), v = B.cfg.vision
    const near = v.near_range || 45, half = (v.fov_deg || 120) * Math.PI / 360
    const inView = d < near - 3 || (d < (v.range || 200) - 5 && Math.abs(angDiff(me.yaw, Math.atan2(y - me.y, x - me.x))) < half - 0.1)
    if (!inView) return false
    return !B.world || B.world.canSee(me.x, me.y, me.z + me.eyeH, x, y, z)
  }
  const prevMe = { x: 0, y: 0, z: 0, eyeH: 8, yaw: 0 }

  /** R1b: a mech we saw last observation is gone although we would still see it, and `alive` dropped (or a death sound). */
  function senseDeaths(obs) {
    const me = B.me, t = me.t
    const alive = Number.isInteger(obs.alive) && obs.alive >= 0 && obs.alive <= 64 ? obs.alive : -1
    if (prevAlive >= 0 && alive >= 0 && alive < prevAlive) {
      let n = 0
      for (const [id, p] of prevListed) {
        if (n >= 4) break
        const tr = B.tracks.get(id)
        if ((tr && tr.listed) || B.ourKills.has(id)) continue
        const vis = seesPoint(p.x, p.y, p.z + p.h * 0.7, prevMe)       // we saw it there last observation: it did not just walk out of view
        const heard = t - deathSoundT < 0.35 && Math.abs(angDiff(deathSoundBearing, Math.atan2(p.y - me.y, p.x - me.x))) < 0.4
        if (!vis && !(heard && p.hpf < 0.5)) continue
        n++
        let surv = null, sd = 150
        for (let k = 0; k < B.trackList.length; k++) {
          const o = B.trackList[k]
          if (o.npc || o.id === id || o.conf < 0.3) continue
          const d = Math.hypot(o.x - p.x, o.y - p.y)
          if (d < sd) { sd = d; surv = o }
        }
        deaths.push({ id, x: p.x, y: p.y, z: p.z, t, cubes: p.cubes + ((B.cfg.cubes && B.cfg.cubes.death_drop_extra) ?? 2), laser: p.laser, other: p.other, survivor: surv ? surv.id : -1 })
        if (deaths.length > 6) deaths.shift()
        B.killDrops.push({ x: p.x, y: p.y, t, foreign: true }); if (B.killDrops.length > 8) B.killDrops.shift()
        if (surv) survivorT.set(surv.id, t)
        if (tr && vis) B.tracks.delete(id)      // a confirmed death: no ghost for the memory seconds
        B.counters.deathsSeen = (B.counters.deathsSeen || 0) + 1
      }
    }
    if (alive >= 0) prevAlive = alive
    prevListed.clear()
    for (let k = 0; k < B.trackList.length && prevListed.size < 16; k++) {
      const tr = B.trackList[k]
      if (tr.npc || !tr.listed) continue
      prevListed.set(tr.id, { x: tr.x, y: tr.y, z: tr.z, h: tr.height, hpf: tr.hp / Math.max(1, tr.maxHp), cubes: tr.cubes, laser: tr.hasLaser, other: tr.hasLightning || tr.hasMortar })
    }
    prevMe.x = me.x; prevMe.y = me.y; prevMe.z = me.z; prevMe.eyeH = me.eyeH; prevMe.yaw = me.yaw
    while (deaths.length && t - deaths[0].t > P.deathDropS) deaths.shift()
  }

  // ------------------------------------------------------------------ smart shooting gates
  function mechNear() {
    const t = B.me.t
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.conf > 0.3 && tr.dist < P.crateMechR) return true }
    return t - lastMechSoundT < P.crateQuietS
  }
  /** The smart-shooting gate runs in FFA only (pass 2b), unless crateGateSquad: in SQUAD the D6 farming rules stay. */
  const gateOn = () => P.crateGateOn === true && (B.env === 'FFA' || P.crateGateSquad === true)
  /** May we start farming this kind ('crate' | 'drone') now? */
  function farmOk(kind) {
    if (!gateOn()) return true
    if (mechNear()) return false
    const me = B.me
    if ((kind === 'drone' || P.crateResetsRegen) && me.hp < me.maxHp - 1 && me.hpf < P.regenNeedHpf && me.t - me.lastHurtT >= 1) return false
    return true
  }
  /** Fire-control gate for crate shots (per decision). */
  function crateFireOk() { return !gateOn() || B.stealFinish || !mechNear() }

  // ------------------------------------------------------------------ R1d race for cubes / pickups
  /** -1: another mech walking at it gets there first (skip); 1: contested but ours (bonus); 0: nobody heading there. */
  function race(x, y, ourEta) {
    if (!P.stealOn) return 0
    let heading = false, best = Infinity
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.conf < 0.3) continue
      const d = Math.hypot(x - tr.x, y - tr.y)
      if (d > 100) continue
      const sp = Math.hypot(tr.vx, tr.vy)
      const toward = d < 6 || (sp > 2 && (tr.vx * (x - tr.x) + tr.vy * (y - tr.y)) / (sp * Math.max(1, d)) > P.raceCos)
      if (!toward) continue
      heading = true
      const eta = d / Math.max(sp, B.me.walk * 0.9)
      if (eta < best) best = eta
    }
    if (!heading) return 0
    return best <= ourEta + P.raceMargin ? -1 : 1
  }

  // ------------------------------------------------------------------ R1e supply drops
  function dropOk(d, tApp) {
    if (!P.stealOn) return true
    const me = B.me
    if (d.holder >= 0 && d.holder !== me.id) return false
    if (d.progress > 0 && d.holder !== me.id) return false
    const ours = Math.max(tApp, d.landsIn)
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.conf < 0.3) continue
      const dd = Math.hypot(tr.x - d.x, tr.y - d.y)
      if (dd <= d.radius + P.dropRingPad) return false                 // someone in the ring: never contest
      if (dd > 200) continue
      const sp = Math.hypot(tr.vx, tr.vy)
      const toward = sp > 2 && (tr.vx * (d.x - tr.x) + tr.vy * (d.y - tr.y)) / (sp * Math.max(1, dd)) > P.raceCos
      if (!toward) continue
      const eta = Math.max(0, dd - d.radius) / Math.max(sp, me.walk * 0.9)
      if (Math.max(eta, d.landsIn) <= ours + P.dropRaceS) return false   // it gets there first (or with us)
    }
    return true
  }

  // ------------------------------------------------------------------ R1b kill drops (economy.chooseGrab / chooseLoot)
  /**
   * An item within 8 m of a recent death of a mech we did not kill: 1 = we get there first by path time (rush it,
   * bonus and the longer reach), -1 = the survivor gets there first (leave it, third party instead), 0 = no death there.
   */
  function deathItem(x, y, dist) {
    if (!P.stealOn || deaths.length === 0) return 0
    const me = B.me, t = me.t
    for (let i = deaths.length - 1; i >= 0; i--) {
      const d = deaths[i]
      if (t - d.t > P.deathDropS || Math.hypot(x - d.x, y - d.y) > 8) continue
      if (B.losing) return 0                                       // LOSING: the normal 12 m cube rule
      if (me.hpf < 0.5) return -1
      const eta = dist / speedFor(dist)
      const surv = d.survivor >= 0 ? B.tracks.get(d.survivor) : null
      if (surv && surv.conf > 0.2) {
        const se = Math.max(0, Math.hypot(surv.x - x, surv.y - y) - 3) / Math.max(me.walk, Math.hypot(surv.vx, surv.vy))
        if (eta + P.deathRushMargin >= se) return -1
        // RC fix: a healthy survivor facing us blocks the start of a rush only; once we go (d.go), its torso turning to us
        // as it walks to its drops does not turn us back (the path-time test above still does)
        if (!d.go && surv.aimAtMe && surv.hp > 0.5 * surv.maxHp && surv.dist < 120) return -1
      }
      d.go = true
      return 1
    }
    return 0
  }

  // ------------------------------------------------------------------ R1b third party (FFA)
  function thirdParty(tr) {
    if (!P.stealOn || tr.npc) return false
    const t = B.me.t, s = survivorT.get(tr.id)
    if (s === undefined || t - s > P.ffaThirdS || tr.hp >= 0.5 * tr.maxHp) return false
    for (let k = 0; k < B.trackList.length; k++) { const o = B.trackList[k]; if (o !== tr && !o.npc && o.conf > 0.3 && o.dist < P.ffaThirdR) return false }
    return true
  }

  // ------------------------------------------------------------------ choice (called from economy.chooseLoot)
  /** relaxed (FFA only): the mechs with a line of fire on us are all busy shooting loot (aim explained, not hostile). */
  function gatesOk(relaxed) {
    const me = B.me, t = me.t, ffa = B.env === 'FFA'
    if (!P.stealOn || B.lastStand || B.zoneUrgent || B.losing) return false
    if (me.hpf < (ffa ? P.stealHpfFfa : P.farmHp)) return false
    if (!ffa && (t >= P.farmStopT || (me.cubes >= P.farmStopCubes && me.laser))) return false      // D6 in SQUAD
    if (t - me.lastHurtT < 2) return false
    if (!relaxed) return B.nLos === 0 && B.A === 0
    if (!ffa) return false
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || t - tr.losInT > 1) continue
      if (tr.hostile || !aimExplained(tr)) return false
    }
    return true
  }
  function speedFor(d) { const me = B.me; return d > 25 && me.energy >= P.boostReserve + 15 ? me.boostSpeed : me.walk }

  /**
   * R1a: the best steal as a loot record { type: 'steal', id, x, y, z } or null (called only out of contact, D6).
   * bestV is the value per second of the best ordinary loot; a steal must beat stealPrefer x bestV.
   */
  function choose(bestV, relaxed) {
    const me = B.me, t = me.t
    if (!gatesOk(relaxed)) { if (!relaxed) task.on = false; return null }
    const cubeV = me.cubes >= (B.cfg.cubes.stat_cap || 10) ? 0.4 : P.cubeValue
    let best = null, bv = bestV * P.stealPrefer
    // R1a crates and drones others are shooting
    for (const w of watch.values()) {
      if (t - w.lastT > 1.5 || t - w.t > 1.0) continue
      const sk = skip.get(w.id)
      if (sk !== undefined && t < sk) continue
      if (!w.npc && !B.crates.has(w.id)) continue
      const dist = econ.pathEst(w.x, w.y)
      if (dist > P.stealMaxD || !econ.reachable(w.x, w.y, w.z)) continue
      const shooter = w.shooter >= 0 ? B.tracks.get(w.shooter) : null
      if (shooter) {
        const sd = Math.hypot(shooter.x - w.x, shooter.y - w.y)
        if (sd < P.stealShooterMinD) continue                      // it stands on its own loot
        if (shooter.hasLightning && sd < 60) continue              // chain lightning
        if (shooter.aimAtMe) continue
      }
      if (B.env === 'FFA') {
        let others = false
        for (let k = 0; k < B.trackList.length; k++) { const o = B.trackList[k]; if (!o.npc && o.conf > 0.3 && o !== shooter && o.dist < P.ffaThirdR) others = true }
        if (others) continue
      }
      const rate = Math.max(w.rate, 1)
      const tb = w.rate >= P.stealRateMin ? w.hp / rate : 99
      const eta = dist / speedFor(dist) + 0.3
      if (eta > tb + P.stealLateS) continue                       // breaks before we can be there (the cube race takes over)
      if (zoneSlack(B, w.x, w.y, t + Math.max(eta, Math.min(tb, 15)) + P.zoneArriveSlack) < 3) continue
      const v = ((w.npc ? 2 : 1) * cubeV + (w.npc ? 0 : 0.5 * P.weaponValue * ((!me.weapons[0] || !me.weapons[1]) ? 1 : 0.3))) / (Math.max(eta, Math.min(tb, 15)) + 0.5)
      if (v > bv) { bv = v; best = { kind: 'steal', id: w.id, x: w.x, y: w.y, z: w.z, npc: w.npc, dist, eta, value: v } }
    }
    const keepCur = task.on && stillValid(out) && (!best || best.id === task.id || best.value < 1.5 * task.value)
    if (!best && !keepCur) { task.on = false; return null }
    if (!keepCur && (!task.on || task.id !== best.id || task.type !== best.kind)) start(best)
    out.type = task.type; out.id = task.id; out.x = task.x; out.y = task.y; out.z = task.z; out.obj = null
    return out
  }

  function start(b) {
    const me = B.me, t = me.t
    task.on = true; task.type = b.kind; task.id = b.id; task.npc = b.npc; task.x = b.x; task.y = b.y; task.z = b.z
    task.t0 = t; task.goneT = -1; task.state = 'approach'; task.hasWait = false; task.waitT = -99; task.value = b.value
    B.counters.steals = (B.counters.steals || 0) + (b.kind === 'steal' ? 1 : 0)
    planSpot()
  }

  /** Pickup spot beside the crate, off the shooter's line and slightly behind the crate; a cover cell near it. */
  function planSpot() {
    const me = B.me, w = watch.get(task.id), nav = B.nav, world = B.world
    let sx = me.x, sy = me.y, known = false
    if (w && me.t - w.sT < 3) { sx = w.sx; sy = w.sy; known = true }
    task.shooter = w ? w.shooter : -1
    const ux0 = task.x - sx, uy0 = task.y - sy, ul = Math.hypot(ux0, uy0) || 1
    const ux = ux0 / ul, uy = uy0 / ul
    const side = task.npc ? 2.0 : P.stealSide, back = task.npc ? 0 : P.stealBehind
    let bestD = Infinity
    task.spotX = task.x; task.spotY = task.y
    for (const s of [1, -1]) {
      const x = task.x - uy * side * s + ux * back, y = task.y + ux * side * s + uy * back
      if (nav && !nav.passableAt(x, y)) continue
      const d = Math.hypot(x - me.x, y - me.y)
      if (d < bestD) { bestD = d; task.spotX = x; task.spotY = y }
    }
    if (bestD === Infinity && nav) { const q = nav.nearestPassable(task.x, task.y, 3.2); if (q) { task.spotX = q.x; task.spotY = q.y } }
    // cover: a cell 8-18 m from the spot that the shooter cannot see (36 candidates, 2 rays each, once per task)
    task.hasWait = false
    task.sx = sx; task.sy = sy; task.sz = known && w ? w.sz : 0
    if (!nav || !world) return
    if (!known) { task.waitX = task.spotX + (me.x - task.spotX) * 0.5; task.waitY = task.spotY + (me.y - task.spotY) * 0.5; task.hasWait = Math.hypot(me.x - task.spotX, me.y - task.spotY) > 16; return }
    const comp = nav.component(me.x, me.y), h = me.height
    let bc = Infinity
    for (let ri = 0; ri < 3; ri++) {
      const r = 8 + ri * 5
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6 + ri * 0.26, x = task.spotX + r * Math.cos(a), y = task.spotY + r * Math.sin(a)
        if (!nav.passableAt(x, y) || (comp >= 0 && nav.component(x, y) !== comp) || !inArena(B, x, y, 2)) continue
        if (zoneSlack(B, x, y, me.t + 20) < 4) continue
        const lv = nav.levelAt(x, y)
        if (world.shotClear(sx, sy, task.sz, x, y, lv + h * 0.5) || world.shotClear(sx, sy, task.sz, x, y, lv + h * 0.9)) continue
        if (!world.canSee(x, y, lv + me.eyeH, task.x, task.y, task.z + 1.2)) continue     // we must watch its hp from there
        const c = r + 0.3 * Math.hypot(x - me.x, y - me.y)
        if (c < bc) { bc = c; task.waitX = x; task.waitY = y; task.hasWait = true }
      }
    }
  }

  function stillValid(l) {
    if (!task.on || l.id !== task.id) return false
    const t = B.me.t
    if (task.goneT >= 0) return t - task.goneT < 3
    const w = watch.get(task.id)
    return !!w && t - w.lastT < 3.5 && t - task.t0 < P.stealTimeout
  }

  function abandon(why) {
    skip.set(task.id, B.me.t + 20)
    task.on = false
    B.counters['steal_' + why] = (B.counters['steal_' + why] || 0) + 1
    B.cmd.mx = 0; B.cmd.my = 0
  }

  // ------------------------------------------------------------------ legs (called from economy.lootLegs)
  function legs(l) {
    const me = B.me, t = me.t, cmd = B.cmd
    if (!task.on || l.id !== task.id) { cmd.mx = 0; cmd.my = 0; return }
    B.lookHint = true; B.lookX = task.x; B.lookY = task.y
    if (t - me.lastHurtT < 0.4 && me.lastHurtBy >= 0 && me.lastHurtBy !== task.id) { abandon('hurt'); return }
    // steal
    const w = watch.get(task.id)
    if (task.npc) { const tr = B.tracks.get(task.id); if (tr && tr.listed) { task.x = tr.x; task.y = tr.y; task.z = tr.z } }
    if (task.goneT >= 0) {
      // it broke: walk onto the cubes, stand for the weapon (hands() takes a wanted one within reach)
      let tx = task.spotX, ty = task.spotY, nd = Infinity
      for (const c of B.cubes.values()) {
        if (t - c.seen > 2 || Math.hypot(c.x - task.x, c.y - task.y) > 6) continue
        const d = Math.hypot(c.x - me.x, c.y - me.y)
        if (d < nd) { nd = d; tx = c.x; ty = c.y }
      }
      if (nd === Infinity) for (const p of B.pickups.values()) {
        if (t - p.seen > 2 || Math.hypot(p.x - task.x, p.y - task.y) > 5 || !econ.wantPickup(p.kind)) continue
        tx = p.x; ty = p.y; nd = 0; break
      }
      mover.moveTo(tx, ty, 1, 0.5)
      B.legKind = 'stealcollect'
      if (nd === Infinity && t - task.goneT > 0.6) { task.on = false; B.counters.stealDone = (B.counters.stealDone || 0) + 1 }
      return
    }
    if (!w) { abandon('lost'); return }
    if (t - task.t0 > 1 && (task.shooter !== w.shooter || Math.hypot(w.sx - task.sx, w.sy - task.sy) > 12) && t - task.waitT > 2) { task.waitT = t; planSpot() }
    const rate = Math.max(1, w.rate), tb = w.rate >= P.stealRateMin ? w.hp / rate : 99
    const ds = Math.hypot(task.spotX - me.x, task.spotY - me.y)
    const sp = ds > 6 && me.energy >= P.boostReserve ? me.boostSpeed : me.walk
    const dashT = ds / sp + 0.35
    const go = tb <= dashT + P.stealLeadS || (!task.hasWait && tb < 99)
    if (task.state !== 'dash' && go) task.state = 'dash'
    if (task.state === 'dash') {
      const d = mover.moveTo(task.spotX, task.spotY, 1, 0.5)
      if (d > 6 && me.energy >= P.boostReserve && me.grounded) cmd.boost = true
      B.legKind = 'stealdash'
      // the shooter stopped with the crate nearly open: finish it ourselves (one or two bullets)
      const one = me.gun ? me.gun.damage * me.dmgMult : 0
      if (!task.npc && d < 2 && me.gun && w.hp <= 2 * one && t - w.lastT > 0.8) {
        crateObj.x = task.x; crateObj.y = task.y; crateObj.z = task.z; crateObj.id = task.id
        crateObj.radius = (B.cfg.crates && B.cfg.crates.radius) || 1.4; crateObj.height = (B.cfg.crates && B.cfg.crates.height) || 2.4
        B.shootCrate = crateObj; B.stealFinish = true
      }
      if (d < 1 && tb > 6 && t - w.lastT > 2.5) abandon('stalled')
      return
    }
    // approach the cover cell and wait there (still, quiet) for the break
    const wx = task.hasWait ? task.waitX : task.spotX, wy = task.hasWait ? task.waitY : task.spotY
    const d = mover.moveTo(wx, wy, 1, 1.2)
    B.legKind = d < 1.5 ? 'stealwait' : 'stealgo'
    if (d < 1.5) B.hidePhase = true
  }

  /** A steal already started is kept although a (non-hostile, not aiming) mech now has a line on us. D6 gates the start. */
  function keep() {
    const me = B.me, t = me.t
    if (!P.stealOn || !task.on || t - me.lastHurtT < 1 || B.losing || B.zoneUrgent || me.hpf < (B.env === 'FFA' ? P.stealHpfFfa : P.farmHp)) return null
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && (tr.hostile || (tr.aimAtMe && tr.losIn && !aimExplained(tr)))) return null }
    if (!stillValid(out)) return null
    B.counters.stealKeeps = (B.counters.stealKeeps || 0) + 1
    return out
  }
  /** selectTarget: the non-hostile shooter of the crate we are stepping onto is not a candidate during the dash. */
  function busyWith(tr) {
    return P.stealOn && task.on && tr.id === task.shooter && !tr.hostile && (task.state === 'dash' || task.goneT >= 0) && B.me.t - task.t0 < P.stealTimeout
  }

  /** A crate / drone of the watch list that others are shooting right now (we let them spend the ammunition). */
  function beingShot(id) {
    if (!P.stealOn) return false
    const w = watch.get(id)
    return !!w && B.me.t - w.lastT < 2
  }
  /** D0 refinement: a mech whose torso points at the crate / drone it is shooting is not aiming at us. */
  function aimExplained(tr) {
    if (!P.stealOn) return false
    const t = B.me.t
    for (const w of watch.values()) {
      if (w.shooter !== tr.id || t - w.lastT > 2.0) continue
      const dw = Math.hypot(w.x - tr.x, w.y - tr.y)
      const ew = Math.abs(angDiff(tr.yaw, Math.atan2(w.y - tr.y, w.x - tr.x))), em = Math.abs(angDiff(tr.yaw, tr.bearing + Math.PI))
      if (dw < tr.dist && ew < em + 0.02) return true
    }
    return false
  }

  function debug() { return { watch: watch.size, deaths: deaths.length, task: task.on ? `${task.type}:${task.id}:${task.state}` : '' } }

  return { sense, choose, legs, stillValid, keep, busyWith, farmOk, crateFireOk, race, dropOk, thirdParty, deathItem, beingShot, aimExplained, debug, task, watch, deaths }
}
