// DEV ONLY. Tests for bot/lib/counters.js (FFA counter module).
// Run:  taskset -c 3 node tools/test_counters.js      (or taskset -c 3 ./bun tools/test_counters.js)
//       --quick: fewer seeds and a shorter timing run;  --verbose: per-track details
//
// a. synthetic tracks for each archetype, built from the numbers in notes/intel/top_*.md and notes/showdown_profiles.md,
//    with observation noise and dropouts: correct label within 5 s of observation, no label change afterwards
// b. mixed / ambiguous tracks stay UNKNOWN
// c. hysteresis: a 1.5 s burst of other behaviour does not flip a label; no label before 1 s + 3 s of observation
// d. SQUAD (and any env other than 'FFA'): neutral advice, empty threat rank, for every track and tick
// e. FFA advice: direction per archetype, bounded-loss blend, rails (never 'avoid' a mech that shoots us)
// f. fuzzed observations and calls never throw (and never hit the internal catch)
// g. determinism (two instances, one stream), real kit stream replay
// h. cost per update with 15 mechs, 12 drones, 30 crates: mean under 0.3 ms

import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCounters, COUNTER_PARAMS, ARCHETYPES } from '../bot/lib/counters.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUICK = process.argv.includes('--quick')
const VERBOSE = process.argv.includes('--verbose')
const results = []
function check(name, passed, detail) {
  results.push({ name, passed: !!passed })
  console.log((passed ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail)
}

// ----------------------------------------------------------------------------------------- tools
function rng32(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function gauss(r) { let u = r(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) }
const U = (r, a, b) => a + (b - a) * r()
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI }
const HELLO = { type: 'hello', slot: 3, seed: 1, config: { mech: { walk_speed: 11.7, boost_speed: 19.5, hp: 1400 } } }
const DT = 0.1, WALK = 11.7, BOOST = 19.5, ACC = 58.5

// ----------------------------------------------------------------------------------------- tiny world
// Our mech (id 3) stands at the origin. Actors are scripted from the evidence numbers; they accelerate toward a
// commanded velocity at the ground acceleration (so strafe reversals take about 0.4 s, as in the recordings).
class World {
  constructor(seed, opt = {}) {
    this.r = rng32(seed); this.t = 0; this.tick = 0
    this.me = { id: 3, x: 0, y: 0, z: 0, hp: 1400, weapons: opt.myWeapons || ['gun', 'laser'] }
    this.actors = []; this.npcs = []; this.crates = []; this.alive = opt.alive ?? 16
    this.events = []; this.beams = []
    this.noise = opt.noise === false ? null : { pos: 0.4, vel: 0.6, aim: 0.04, drop: 0.05, ...(opt.noise || {}) }
  }
  add(a) { this.actors.push(a); return a }
  bearingTo(a, x, y) { return Math.atan2(y - a.y, x - a.x) }
  dist(a, x, y) { return Math.hypot(x - a.x, y - a.y) }
  step() {
    this.events = []; this.beams = []
    for (const a of this.actors) {
      a.script(a, this)
      const dvx = a.cvx - a.vx, dvy = a.cvy - a.vy, dv = Math.hypot(dvx, dvy), mx = ACC * DT
      if (dv > mx) { a.vx += dvx / dv * mx; a.vy += dvy / dv * mx } else { a.vx = a.cvx; a.vy = a.cvy }
      a.x += a.vx * DT; a.y += a.vy * DT
      if (a.air > 0) { a.air -= DT; a.vz = a.air > 0.5 ? 8 : -8 } else a.vz = 0
    }
    this.t += DT; this.tick += 2
  }
  obs() {
    const r = this.r, N = this.noise
    const mechs = []
    for (const a of this.actors) {
      if (a.hidden || (N && r() < N.drop)) continue
      const g = (s) => (N ? gauss(r) * s : 0)
      mechs.push({ id: a.id, kind: 'mech', pos: [a.x + g(N ? N.pos : 0), a.y + g(N ? N.pos : 0), 0], vel: [a.vx + g(N ? N.vel : 0), a.vy + g(N ? N.vel : 0), a.vz],
        aim: [wrap(a.yaw + g(N ? N.aim : 0)), 0], hp: a.hp, max_hp: a.maxHp, cubes: a.cubes, weapons: a.weapons.slice(), charging: !!a.charging })
    }
    for (const n of this.npcs) mechs.push({ id: n.id, kind: 'npc', pos: [n.x, n.y, 0], vel: [0, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 })
    const me = this.me
    return {
      type: 'obs', tick: this.tick, t: +this.t.toFixed(3), alive: this.alive,
      self: { id: me.id, pos: [me.x, me.y, me.z], vel: [0, 0, 0], aim: [0, 0], hp: me.hp, max_hp: 1400, energy: 80, max_energy: 100, grounded: true, cubes: 0,
        weapons: me.weapons.map((k) => (k ? { kind: k, cooldown: 0 } : null)) },
      mechs, projectiles: [], crates: this.crates.map((c) => ({ id: c.id, pos: [c.x, c.y, 0], hp: 300 })), cubes: [], pickups: [], sounds: [],
      beams: this.beams, events: this.events, drops: [], zone: { center: [0, 0], radius: 560, next_center: [0, 0], next_radius: 380, shrink_start: 60, shrink_end: 110, dps: 20 },
    }
  }
}
function actor(id, x, y, weapons, script, extra = {}) {
  return { id, x, y, z: 0, vx: 0, vy: 0, vz: 0, cvx: 0, cvy: 0, yaw: 0, hp: 1400, maxHp: 1400, cubes: 0, weapons, charging: false, air: 0,
    side: 1, sideT: 0, phase: 0, phaseT: 0, cd: 0, chargeT: 0, mag: 12, shotT: 0, reloadT: 0, energy: 100, boostT: 0, tgt: null, script, ...extra }
}
const placeAt = (w, R) => { const b = U(w.r, -Math.PI, Math.PI); return [R * Math.cos(b), R * Math.sin(b)] }

// band keeping around (tx, ty) plus a sideways strafe: radial in {-back, 0, 1}, sideways 0.9 x sign
function bandMove(a, w, tx, ty, lo, hi, back, speed, sideGain = 0.9) {
  const dx = tx - a.x, dy = ty - a.y, R = Math.hypot(dx, dy) || 1, ux = dx / R, uy = dy / R
  const radial = R > hi ? 1 : R < lo ? -back : 0
  let vx = ux * radial - uy * sideGain * a.side, vy = uy * radial + ux * sideGain * a.side
  const l = Math.hypot(vx, vy) || 1
  const m = Math.min(1, l)
  a.cvx = vx / l * m * speed; a.cvy = vy / l * m * speed
  return R
}
function redrawSide(a, w, lo, hi, flipP = 0.5) {
  if (w.t >= a.sideT) { if (w.r() < flipP) a.side = -a.side; a.sideT = w.t + U(w.r, lo, hi) }
}
function aimAtMe(a, w) { a.yaw = w.bearingTo(a, w.me.x, w.me.y) }
// gun: 12 rounds at 0.24 s, then 2.4 s reload; a hit becomes a `damaged` event on us
function gunAtMe(a, w, R, pHit) {
  if (R > 230) return
  if (a.reloadT > 0) { a.reloadT -= DT; if (a.reloadT <= 0) a.mag = 12; return }
  a.shotT += DT
  while (a.shotT >= 0.24 && a.mag > 0) { a.shotT -= 0.24; a.mag--; if (w.r() < pHit) w.events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: a.id }) }
  if (a.mag === 0) { a.reloadT = 2.4; a.shotT = 0 }
}
// laser: charge 0.75 s (flag on), beam (beams + damaged), cooldown 1.65 s
function laserAt(a, w, tx, ty, pHit, atMe = true) {
  if (a.cd > 0) { a.cd -= DT; a.charging = false; return }
  a.charging = true; a.chargeT += DT
  if (a.chargeT >= 0.75 - 1e-9) {
    a.charging = false; a.chargeT = 0; a.cd = 1.65
    w.beams.push({ by: a.id, kind: 'laser', path: [[a.x, a.y, 7], [tx, ty, 4.5]], age: 0.1 })
    if (atMe && w.r() < pHit) w.events.push({ type: 'damaged', amount: 315, weapon: 'laser', bearing: 0, by: a.id })
  }
}

// ----------------------------------------------------------------------------------------- archetype scripts
const S = {
  // [AB] A-bot / scorpion: gun + laser, band 125-185 m, strafe reversals 0.45-1.15 s, charge flag 0.75 s every 2.4 s
  kiterAbot(id, w) {
    const [x, y] = placeAt(w, U(w.r, 140, 175))
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.45, 1.15) }
      const R = bandMove(a, w, w.me.x, w.me.y, 125, 185, 1, a.charging ? WALK / 2 : WALK)
      aimAtMe(a, w); laserAt(a, w, w.me.x, w.me.y, 0.89)
      if (R < 200) gunAtMe(a, w, R, 0.3)
    })
  },
  // [BD] readable build: laser + lightning (no gun), holds 110 m (in beyond 140, out inside 80), legs 1.0-2.6 s, 70% reversals
  kiterBD(id, w) {
    const [x, y] = placeAt(w, U(w.r, 100, 130))
    return actor(id, x, y, ['laser', 'lightning'], (a, w) => {
      redrawSide(a, w, 1.0, 2.6, 0.7)
      bandMove(a, w, w.me.x, w.me.y, 80, 140, 1, a.charging ? WALK / 2 : WALK, 0.85)
      aimAtMe(a, w); laserAt(a, w, w.me.x, w.me.y, 0.7)
    })
  },
  // [TT] TigerTown27 free-for-all: gun + laser at ~100 m, strafe 0.35-0.9 s, laser only from cover (fewer charges)
  kiterTT(id, w) {
    const [x, y] = placeAt(w, U(w.r, 100, 120))
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.35, 0.9) }
      const R = bandMove(a, w, w.me.x, w.me.y, 92, 115, 1, a.charging ? WALK / 2 : WALK)
      aimAtMe(a, w)
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = 1 - a.phase; a.phaseT = a.phase ? 2.4 : 2.0 }
      if (a.phase) laserAt(a, w, w.me.x, w.me.y, 0.6); else { a.charging = false; a.chargeT = 0 }
      gunAtMe(a, w, R, 0.25)
    })
  },
  // [WV][KY] gun + lightning: 28 m band (dead band 15), approach forward 1 + side 0.9 (8.7 m/s closing), boost from under
  // 90 m with energy > 70 (1.8 s bursts), side redraw 0.35-1.05 s coin flip, arcs inside 44 m
  closerWV(id, w) {
    const [x, y] = placeAt(w, U(w.r, 110, 140))
    return actor(id, x, y, ['gun', 'lightning'], (a, w) => {
      redrawSide(a, w, 0.35, 1.05)
      const R = w.dist(a, w.me.x, w.me.y)
      let speed = WALK
      if (a.boostT > 0) { a.boostT -= DT; speed = BOOST; a.energy -= 17 * DT } else { a.energy = Math.min(100, a.energy + 18 * DT); if (R < 90 && R > 43 && a.energy > 70) a.boostT = 1.8 }
      bandMove(a, w, w.me.x, w.me.y, 13, 43, 0.7, speed)
      aimAtMe(a, w)
      a.shotT += DT
      if (R < 44 && a.shotT >= 0.25) { a.shotT = 0; w.beams.push({ by: a.id, kind: 'lightning', path: [[a.x, a.y, 7], [w.me.x, w.me.y, 4.5]], age: 0.1 }); w.events.push({ type: 'damaged', amount: 60, weapon: 'lightning', bearing: 0, by: a.id }) }
    })
  },
  // [AT] laser + lightning chaser: closing +5.3 m/s at 70-100 m, +11.7 at 45-70, +13.1 at 30-45, strafe 0.7 s at 30 m
  closerAT(id, w) {
    const [x, y] = placeAt(w, U(w.r, 80, 95))
    return actor(id, x, y, ['laser', 'lightning'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.4, 1.3) }
      const dx = w.me.x - a.x, dy = w.me.y - a.y, R = Math.hypot(dx, dy) || 1, ux = dx / R, uy = dy / R
      const cl = R > 70 ? 5.3 : R > 45 ? 11.7 : R > 30 ? 13.1 : 0
      const side = Math.sqrt(Math.max(0, (cl > 11.7 ? BOOST : WALK) ** 2 - cl * cl)) * (cl > 0 ? 0.5 : 0.9)
      a.cvx = ux * cl - uy * side * a.side; a.cvy = uy * cl + ux * side * a.side
      aimAtMe(a, w)
      if (R > 45) laserAt(a, w, w.me.x, w.me.y, 0.89); else a.charging = false
      a.shotT += DT
      if (R < 44 && a.shotT >= 0.25) { a.shotT = 0; w.beams.push({ by: a.id, kind: 'lightning', path: [[a.x, a.y, 7], [w.me.x, w.me.y, 4.5]], age: 0.1 }); w.events.push({ type: 'damaged', amount: 60, weapon: 'lightning', bearing: 0, by: a.id }) }
    })
  },
  // [WV] gun only: band 70 m (55-85), approach 1 + side 0.9, back off 0.7, side redraw 0.35-1.05 s coin flip, opens fire at
  // first sight, 12 rounds / 2.9 s then 2.4 s reload; a 2 s straight cube detour every ~15 s, still firing
  strafWV(id, w) {
    const [x, y] = placeAt(w, U(w.r, 120, 150))
    return actor(id, x, y, ['gun'], (a, w) => {
      redrawSide(a, w, 0.35, 1.05)
      a.phaseT -= DT
      let R
      if (a.phase === 1) { R = w.dist(a, w.me.x, w.me.y); if (a.phaseT <= 0) { a.phase = 0; a.phaseT = U(w.r, 12, 18) } }
      else {
        R = bandMove(a, w, w.me.x, w.me.y, 55, 85, 0.7, WALK)
        if (a.phaseT <= 0 && w.t > 6) { a.phase = 1; a.phaseT = 2; const b = U(w.r, -Math.PI, Math.PI); a.cvx = Math.cos(b) * WALK; a.cvy = Math.sin(b) * WALK }
        else if (a.phaseT <= 0) a.phaseT = U(w.r, 12, 18)
      }
      aimAtMe(a, w); gunAtMe(a, w, R, 0.5)
    })
  },
  // [AT] BobBuildIt with the gun alone: holds 70-140 m, reversals 0.4-1.6 s, opens fire within 1 s, 44% hits at 100-125 m
  strafBob(id, w) {
    const [x, y] = placeAt(w, U(w.r, 110, 135))
    return actor(id, x, y, ['gun'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.4, 1.6) }
      const R = bandMove(a, w, w.me.x, w.me.y, 70, 140, 0.7, WALK)
      aimAtMe(a, w); if (w.t > 0.8) gunAtMe(a, w, R, 0.44)
    })
  },
  // [IL] ImagineLosing gun only: 80 m (approach beyond 115, back off inside 50), strafe reversals 0.35-1.15 s
  strafIL(id, w) {
    const [x, y] = placeAt(w, U(w.r, 90, 110))
    return actor(id, x, y, ['gun'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.35, 1.15) }
      const R = bandMove(a, w, w.me.x, w.me.y, 50, 115, 0.7, WALK)
      aimAtMe(a, w); gunAtMe(a, w, R, 0.5)
    })
  },
  // [S4] 314159265: gun + mortar, boosts at 19.5 m/s toward a mech (here 2.1 s boost / 0.9 s walk) and switches target
  // after passing it; a second mech (decoy id 9) stands 220 m away on the other side
  rusher(id, w) {
    const [x, y] = placeAt(w, U(w.r, 200, 240))
    const decoy = w.add(actor(9, -x, -y, ['gun', 'laser'], (a) => { a.cvx = 0; a.cvy = 0; a.yaw += 3.3 * DT }))
    return actor(id, x, y, ['gun', 'mortar'], (a, w) => {
      if (!a.tgt) a.tgt = w.me
      const R = w.dist(a, a.tgt.x, a.tgt.y)
      if (R < 15) a.tgt = a.tgt === w.me ? decoy : w.me
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = 1 - a.phase; a.phaseT = a.phase ? 2.1 : 0.9 }
      const b = w.bearingTo(a, a.tgt.x, a.tgt.y) + U(w.r, -0.08, 0.08), sp = a.phase ? BOOST : WALK
      a.cvx = Math.cos(b) * sp; a.cvy = Math.sin(b) * sp
      a.yaw = w.bearingTo(a, a.tgt.x, a.tgt.y)
      if (a.tgt === w.me) gunAtMe(a, w, R, R < 100 ? 0.5 : 0.2)
    })
  },
  // [S4] Bob the builder: still 74% (12 s still with a spinning torso, 3-4 s relocation), never fires, 3 cubes
  hiderBob(id, w) {
    const [x, y] = placeAt(w, U(w.r, 140, 170))
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) {
        a.phase = 1 - a.phase; a.phaseT = a.phase ? U(w.r, 3, 4) : 12
        const b = U(w.r, -Math.PI, Math.PI); a.hx = Math.cos(b); a.hy = Math.sin(b)
      }
      if (a.phase) { a.cvx = a.hx * WALK; a.cvy = a.hy * WALK; a.yaw = Math.atan2(a.hy, a.hx) + 0.9 * Math.sin(w.t * 1.3) }
      else { a.cvx = 0; a.cvy = 0; a.yaw = wrap(a.yaw + 3.3 * DT) }
    }, { cubes: 3, phase: 0, phaseT: 12 })
  },
  // [MH] Mahalas free-for-all: still about 14 s in a nook (spin 3.3 rad/s), then a 40-60 m hop at walk speed; gun + lightning
  hiderMH(id, w) {
    const [x, y] = placeAt(w, U(w.r, 120, 160))
    return actor(id, x, y, ['gun', 'lightning'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) {
        a.phase = 1 - a.phase; a.phaseT = a.phase ? U(w.r, 40, 60) / WALK : 14
        const b = U(w.r, -Math.PI, Math.PI); a.hx = Math.cos(b); a.hy = Math.sin(b)
      }
      if (a.phase) { a.cvx = a.hx * WALK; a.cvy = a.hy * WALK; a.yaw = Math.atan2(a.hy, a.hx) + 1.5 * Math.sin(w.t * 1.4) }
      else { a.cvx = 0; a.cvy = 0; a.yaw = wrap(a.yaw + 3.3 * DT) }
    }, { cubes: 2, phase: 0, phaseT: 14 })
  },
  // [WV][KY] farming pose: still 38 m from a drone shooting it (6 s), walk to a crate (4 s), stand 30 m off it shooting (3 s);
  // a cube every ~8 s (7.5 a minute, the winners' rate [S1])
  farmerWV(id, w) {
    const [x, y] = placeAt(w, U(w.r, 160, 190))
    // loot off the line to us (perpendicular), as a farmer far from every mech would have it
    const R0 = Math.hypot(x, y), px = -y / R0, py = x / R0, ex = x / R0, ey = y / R0
    const npc = { id: 104, x: x + px * 38, y: y + py * 38 }, crate = { id: 1007, x: x - px * 30 + ex * 40, y: y - py * 30 + ey * 40 }
    w.npcs.push(npc); w.crates.push(crate)
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = (a.phase + 1) % 3; a.phaseT = [6, 4, 3][a.phase] }
      const tgt = a.phase === 0 ? npc : crate
      if (a.phase === 1) {
        const b = w.bearingTo(a, crate.x, crate.y), d = w.dist(a, crate.x, crate.y)
        const sp = d > 30 ? WALK : 0
        a.cvx = Math.cos(b) * sp; a.cvy = Math.sin(b) * sp; a.yaw = b + 0.6 * Math.sin(w.t * 1.3)
      } else { a.cvx = 0; a.cvy = 0; a.yaw = w.bearingTo(a, tgt.x, tgt.y) }
      a.cubeT = (a.cubeT || 0) + DT
      if (a.cubeT >= 8) { a.cubeT = 0; a.cubes++ ; a.maxHp = 1400 * (1 + 0.04 * Math.min(10, a.cubes)) }
    }, { phase: 0, phaseT: 6 })
  },
  // [AT][TT] laser farmer: AT / TigerTown27 spend laser charges on crates when nobody is in view; gun + laser
  farmerLaser(id, w) {
    const [x, y] = placeAt(w, U(w.r, 170, 195))
    const R0 = Math.hypot(x, y), px = -y / R0, py = x / R0, ex = x / R0, ey = y / R0
    const c1 = { id: 1011, x: x + px * 15 + ex * 3, y: y + py * 15 + ey * 3 }, c2 = { id: 1012, x: x - px * 25 + ex * 15, y: y - py * 25 + ey * 15 }, npc = { id: 105, x: x + ex * 30 + px * 12, y: y + ey * 30 + py * 12 }
    w.crates.push(c1, c2); w.npcs.push(npc)
    const L = [c1, npc, c2]
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = (a.phase + 1) % 3; a.phaseT = 4.8 }
      const o = L[a.phase]
      a.cvx = 0; a.cvy = 0; a.yaw = w.bearingTo(a, o.x, o.y)
      laserAt(a, w, o.x, o.y, 0, false)
      a.cubeT = (a.cubeT || 0) + DT
      if (a.cubeT >= 9) { a.cubeT = 0; a.cubes++ }
    }, { phase: 0, phaseT: 4.8 })
  },

  // ---------------------------------------------------------------- ambiguous / mixed
  // a traveller: gun only, straight line at walk speed passing 150-200 m from us, torso sweeping +-52 deg around the heading
  traveller(id, w) {
    const off = U(w.r, 150, 190), b = U(w.r, -Math.PI, Math.PI)
    const x = Math.cos(b) * off - Math.sin(b) * 250, y = Math.sin(b) * off + Math.cos(b) * 250
    const hx = Math.sin(b), hy = -Math.cos(b)
    return actor(id, x, y, ['gun'], (a, w) => { a.cvx = hx * WALK; a.cvy = hy * WALK; a.yaw = Math.atan2(hy, hx) + 0.9 * Math.sin(w.t * 2 * Math.PI / 4.8) })
  },
  // a new random mode every 1.5 s, never the same twice in a row (still, walk, boost, strafe), with a wandering torso
  mixedRandom(id, w) {
    const [x, y] = placeAt(w, U(w.r, 90, 160))
    return actor(id, x, y, ['gun'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = (a.phase + 1 + Math.floor(w.r() * 3)) % 4; a.phaseT = 1.5; a.hb = U(w.r, -Math.PI, Math.PI) }
      const sp = a.phase === 0 ? 0 : a.phase === 2 ? BOOST : WALK
      if (a.phase === 3) { redrawSide(a, w, 0.4, 1.0); bandMove(a, w, w.me.x, w.me.y, 60, 200, 0.7, WALK) }
      else { a.cvx = Math.cos(a.hb) * sp; a.cvy = Math.sin(a.hb) * sp }
      if (Math.hypot(a.x, a.y) > 220) { const b = Math.atan2(-a.y, -a.x); a.cvx = Math.cos(b) * WALK; a.cvy = Math.sin(b) * WALK }
      a.yaw = wrap(a.yaw + U(w.r, -0.6, 0.6))
    })
  },
  // laser + lightning holding 70 m, strafing and charging at us: between the kiter (100+ m) and the closer (under 45 m)
  midDual(id, w) {
    const [x, y] = placeAt(w, U(w.r, 66, 74))
    return actor(id, x, y, ['laser', 'lightning'], (a, w) => {
      if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.5, 1.2) }
      bandMove(a, w, w.me.x, w.me.y, 66, 74, 1, a.charging ? WALK / 2 : WALK)
      aimAtMe(a, w); laserAt(a, w, w.me.x, w.me.y, 0.5)
    })
  },
  // half farmer, half kiter: laser at 150 m, 3 s on a crate, 3 s charging at us
  farmKiteMix(id, w) {
    const [x, y] = placeAt(w, U(w.r, 145, 160))
    const crate = { id: 1020, x: x * 1.2, y: y * 1.2 + 20 }
    w.crates.push(crate)
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      a.phaseT -= DT
      if (a.phaseT <= 0) { a.phase = 1 - a.phase; a.phaseT = 3 }
      if (a.phase) { a.yaw = w.bearingTo(a, crate.x, crate.y); a.charging = false; a.chargeT = 0 } else { aimAtMe(a, w); laserAt(a, w, w.me.x, w.me.y, 0.5) }
      a.cvx = 0; a.cvy = 0
    }, { phase: 0, phaseT: 3 })
  },
}

const ARCH_TRACKS = [
  ['kiterAbot', 'LASER_KITER'], ['kiterBD', 'LASER_KITER'], ['kiterTT', 'LASER_KITER'],
  ['closerWV', 'LIGHTNING_CLOSER'], ['closerAT', 'LIGHTNING_CLOSER'],
  ['strafWV', 'GUN_STRAFER'], ['strafBob', 'GUN_STRAFER'], ['strafIL', 'GUN_STRAFER'],
  ['rusher', 'BOOST_RUSHER'],
  ['hiderBob', 'HIDER'], ['hiderMH', 'HIDER'],
  ['farmerWV', 'FARMER'], ['farmerLaser', 'FARMER'],
]
const MIXED_TRACKS = ['traveller', 'mixedRandom', 'midDual', 'farmKiteMix']

/** Runs one scripted mech (id 5) for `dur` s; returns the per-tick label history of id 5. */
function runTrack(name, seed, opt = {}) {
  const w = new World(seed, opt)
  const a = w.add(S[name](5, w))
  if (opt.mutate) opt.mutate(a, w)
  const c = createCounters(HELLO, opt.params)
  const hist = []
  const dur = opt.dur ?? 60
  const ffa = { env: 'FFA', bandLo: 125, bandHi: 185 }, squad = { env: 'SQUAD', bandLo: 125, bandHi: 185 }
  let squadBad = 0, squadN = 0
  for (let k = 0; k < dur / DT; k++) {
    w.step()
    const o = w.obs()
    c.update(o, o.t)
    const r = c.archetypeOf(5)
    hist.push({ t: o.t, label: r.archetype, conf: r.confidence, obsS: r.obsS })
    if (opt.squadCheck) {
      for (const id of [5, 9, 3, 99, -1]) {
        for (const ctx of [squad, { env: 'squad' }, {}, null, { env: 'ffa' }]) {
          const v = c.adviceFor(id, ctx); squadN++
          if (!isNeutral(v, ctx && ctx.bandLo)) squadBad++
        }
      }
      if (c.threatRank(squad).length !== 0 || c.threatRank(undefined).length !== 0) squadBad++
    }
    if (opt.onTick) opt.onTick(c, w, ffa, k)
  }
  return { hist, c, w, squadBad, squadN }
}
function isNeutral(v, lo) {
  return v && v.active === false && v.engage === 'opportunistic' && v.engageLevel === 2 && v.targetMult === 1 && v.dodgePriority === 0.5 &&
    v.breakLosOnCharge === false && v.weight === 0 && (lo === undefined || (v.lo === 125 && v.hi === 185 && v.band[0] === 125 && v.band[1] === 185))
}

// ----------------------------------------------------------------------------------------- a. archetype tracks
const NSEEDS = +((process.argv.find((a) => a.startsWith('--seeds=')) || '').slice(8) || (QUICK ? 3 : 10))
const SEEDS = Array.from({ length: NSEEDS }, (_, i) => i + 1)
{
  const lines = []
  let allOk = true, worstT = 0, nRuns = 0, nOk = 0
  for (const [name, want] of ARCH_TRACKS) {
    let okN = 0, tMax = 0, changes = 0, finalConf = 1, badSeeds = []
    for (const seed of SEEDS) {
      const { hist } = runTrack(name, seed * 7919 + name.length)
      nRuns++
      const first = hist.findIndex((h) => h.label === want)
      const tFirst = first >= 0 ? hist[first].obsS : Infinity
      let ch = 0
      for (let i = Math.max(first, 0) + 1; i < hist.length; i++) if (hist[i].label !== hist[i - 1].label) ch++
      const preWrong = hist.slice(0, Math.max(first, 0)).some((h) => h.label !== 'UNKNOWN' && h.label !== want)
      const ok = first >= 0 && tFirst <= 5 + 1e-9 && ch === 0 && !preWrong
      if (ok) { okN++; nOk++ } else badSeeds.push(`${seed}:${first < 0 ? 'never' : tFirst.toFixed(1) + 's'}/${ch}ch${preWrong ? '/wrong-first' : ''}/${hist[hist.length - 1].label}`)
      if (tFirst < Infinity) tMax = Math.max(tMax, tFirst)
      changes += ch
      finalConf = Math.min(finalConf, hist[hist.length - 1].conf)
    }
    worstT = Math.max(worstT, tMax)
    if (okN !== SEEDS.length) allOk = false
    lines.push(`${name}->${want} ${okN}/${SEEDS.length} first<=${tMax.toFixed(1)}s minConf=${finalConf.toFixed(2)}${badSeeds.length ? ' bad[' + badSeeds.join(' ') + ']' : ''}`)
  }
  if (VERBOSE || !allOk) for (const l of lines) console.log('      ' + l)
  check('archetype tracks: correct within 5 s of observation and stable for 60 s (noise, 5% dropouts)', allOk,
    `${nOk}/${nRuns} runs over ${ARCH_TRACKS.length} tracks x ${SEEDS.length} seeds; slowest first read ${worstT.toFixed(1)} s of observation`)
}

// ----------------------------------------------------------------------------------------- b. mixed tracks
{
  let bad = 0, n = 0
  const lines = []
  for (const name of MIXED_TRACKS) {
    let nonUnk = 0, ticks = 0, labels = new Set()
    for (const seed of SEEDS) {
      const { hist } = runTrack(name, seed * 104729 + 3)
      n++
      const nu = hist.filter((h) => h.label !== 'UNKNOWN')
      if (nu.length) { bad++; for (const h of nu) labels.add(h.label) }
      nonUnk += nu.length; ticks += hist.length
    }
    lines.push(`${name}: non-UNKNOWN ticks ${nonUnk}/${ticks}${labels.size ? ' (' + [...labels].join(',') + ')' : ''}`)
  }
  if (VERBOSE || bad) for (const l of lines) console.log('      ' + l)
  check('mixed / ambiguous tracks stay UNKNOWN for the whole run', bad === 0, `${n - bad}/${n} runs (${MIXED_TRACKS.join(', ')})`)
}

// ----------------------------------------------------------------------------------------- c. hysteresis and minimum observation
{
  // strafer for 20 s, then 1.5 s standing still and silent (hider-like), then strafing again: the label must not move
  const { hist } = runTrack('strafWV', 42, {
    dur: 40,
    mutate: (a) => {
      const base = a.script
      a.script = (b, w) => { if (w.t >= 20 && w.t < 21.5) { b.cvx = 0; b.cvy = 0; b.yaw = wrap(b.yaw + 3.3 * DT) } else base(b, w) }
    },
  })
  const after = hist.filter((h) => h.t >= 12)
  const steady = after.every((h) => h.label === 'GUN_STRAFER')
  check('hysteresis: a 1.5 s burst of other behaviour does not flip the label', steady, `labels after 12 s: ${[...new Set(after.map((h) => h.label))].join(',')}`)
  // a real behaviour change (strafer -> hider at 20 s) is followed, but not sooner than 3 s of observation
  const r2 = runTrack('strafWV', 43, {
    dur: 50, noise: false,
    mutate: (a) => {
      const base = a.script
      a.script = (b, w) => { if (w.t >= 20) { b.cvx = 0; b.cvy = 0; b.yaw = wrap(b.yaw + 3.3 * DT); b.charging = false } else base(b, w) }
    },
  }).hist
  const tChange = r2.find((h) => h.t > 20 && h.label !== 'GUN_STRAFER')
  check('hysteresis: a lasting change relabels, at least 3 s after it began', !!tChange && tChange.t >= 23 && r2[r2.length - 1].label === 'HIDER',
    tChange ? `first change at ${tChange.t.toFixed(1)} s to ${tChange.label}; final ${r2[r2.length - 1].label}` : 'no change')
  // no label before minObs + hold
  let early = 0
  for (const [name] of ARCH_TRACKS) for (const seed of SEEDS.slice(0, 3)) {
    const { hist } = runTrack(name, seed + 77, { dur: 8 })
    for (const h of hist) if (h.label !== 'UNKNOWN' && h.obsS < COUNTER_PARAMS.minObsS + COUNTER_PARAMS.holdS - 1e-6) early++
  }
  check('minimum observation: no label before 1 s + 3 s of observation', early === 0, `${early} early labels`)
}

// ----------------------------------------------------------------------------------------- d. SQUAD inert
{
  let bad = 0, n = 0
  for (const [name] of ARCH_TRACKS.concat(MIXED_TRACKS.map((m) => [m]))) {
    const r = runTrack(name, 5, { dur: 30, squadCheck: true })
    bad += r.squadBad; n += r.squadN
  }
  check('SQUAD / non-FFA env: adviceFor is neutral and threatRank empty on every tick', bad === 0, `${n - bad}/${n} calls neutral`)
}

// ----------------------------------------------------------------------------------------- e. FFA advice
{
  const want = {
    kiterAbot: (v) => v.engage === 'respond-only' && v.breakLosOnCharge && v.targetMult < 1 && v.lo >= 140 && v.dodgePriority > 0.7,
    closerWV: (v) => v.engage === 'respond-only' && v.lo >= 60 && v.dodgePriority > 0.6,
    strafWV: (v) => v.engage === 'respond-only' && v.lo >= 130 && v.targetMult < 1,
    rusher: (v) => v.engage === 'opportunistic' && v.lo <= 50 && v.targetMult > 1,   // pass 2a: dossier M3 caps BR at opportunistic (brLevel 2)
    hiderBob: (v) => (v.engage === 'avoid' || v.engage === 'respond-only') && v.lo >= 115 && v.targetMult < 1,
    farmerWV: (v) => v.lo >= 135 && v.hi <= 205,
  }
  const lines = []
  let ok = true
  for (const name of Object.keys(want)) {
    const { c } = runTrack(name, 11, { dur: 20 })
    const v = c.adviceFor(5, { env: 'FFA', bandLo: 125, bandHi: 185, myLaser: true, myLightning: false, myHpf: 1, myHp: 1400, myEnergy: 80, alive: 12 })
    const good = v.active && want[name](v)
    if (!good) ok = false
    lines.push(`${name}: ${v.archetype} c=${v.confidence.toFixed(2)} w=${v.weight.toFixed(2)} [${v.lo.toFixed(0)},${v.hi.toFixed(0)}] ${v.engage} x${v.targetMult.toFixed(2)} dodge ${v.dodgePriority.toFixed(2)} brk=${v.breakLosOnCharge} ${v.reason}`)
  }
  if (VERBOSE || !ok) for (const l of lines) console.log('      ' + l)
  check('FFA advice follows the archetype counters (D11 + intel)', ok, lines.map((l) => l.split(':')[0] + '=' + l.split(' ').slice(-1)[0]).join(' '))

  // bounded loss: every number lies between neutral and the full counter, and moves toward neutral as confidence drops
  let bl = true
  const ctxN = { env: 'FFA', bandLo: 55, bandHi: 95, myLaser: false, myHpf: 1, alive: 12 }
  for (const [name] of ARCH_TRACKS) {
    const lowC = runTrack(name, 13, { dur: 20, params: { confFloor: 0.5, confFull: 5 } }).c   // confidence never reaches "full"
    const hiC = runTrack(name, 13, { dur: 20 }).c
    const a = { ...lowC.adviceFor(5, ctxN) }, b = { ...hiC.adviceFor(5, ctxN) }
    if (!(a.weight <= b.weight + 1e-9)) bl = false
    if (!(Math.abs(a.lo - 55) <= Math.abs(b.lo - 55) + 1e-6 && Math.abs(a.hi - 95) <= Math.abs(b.hi - 95) + 1e-6)) bl = false
    if (!(Math.abs(a.targetMult - 1) <= Math.abs(b.targetMult - 1) + 1e-9)) bl = false
    if (!(b.weight <= COUNTER_PARAMS.blendMax + 1e-9)) bl = false
  }
  const zero = runTrack('kiterAbot', 14, { dur: 20, params: { confFloor: 2, confFull: 3 } }).c.adviceFor(5, ctxN)
  bl = bl && zero.weight === 0 && zero.engage === 'opportunistic' && zero.targetMult === 1 && zero.lo === 55 && zero.hi === 95 && !zero.breakLosOnCharge
  check('bounded loss: advice = neutral + weight x (counter - neutral), weight <= 0.9, 0 at low confidence', bl, `low-confidence advice ${zero.reason} w=${zero.weight}`)

  // rail: a hider that starts shooting us is never 'avoid' while it does. Default params: its live score drops at once
  // (blend weight to 0); with that drop switched off (hdHostileMul 1) the label stays HIDER and the rail must act.
  const shoot = (a) => { const base = a.script; a.script = (b, w) => { base(b, w); if (w.t > 20) w.events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: b.id }) } }
  const v0 = { ...runTrack('hiderBob', 15, { dur: 20.5, mutate: shoot }).c.adviceFor(5, { env: 'FFA', myHpf: 0.9, alive: 12 }) }
  const v1 = { ...runTrack('hiderBob', 15, { dur: 20.5, mutate: shoot, params: { hdHostileMul: 1 } }).c.adviceFor(5, { env: 'FFA', myHpf: 0.9, alive: 12 }) }
  const v2 = { ...runTrack('hiderBob', 15, { dur: 20.5, params: { hdHostileMul: 1 } }).c.adviceFor(5, { env: 'FFA', myHpf: 0.9, alive: 12 }) }
  check('rail: never avoid a mech that is shooting us (D0)', v0.engageLevel >= 1 && v1.archetype === 'HIDER' && v1.engageLevel >= 1 && v2.engage === 'avoid',
    `default: ${v0.archetype} w=${v0.weight.toFixed(2)} ${v0.engage}; label kept: ${v1.archetype} w=${v1.weight.toFixed(2)} ${v1.engage}; not shooting: ${v2.engage}`)

  // threat rank: a closing lightning carrier and a charging kiter outrank a hider; order is deterministic
  const w = new World(21, { noise: false })
  w.add(S.closerWV(5, w)); w.add(S.kiterAbot(6, w)); w.add(S.hiderBob(7, w))
  const c = createCounters(HELLO)
  for (let k = 0; k < 120; k++) { w.step(); const o = w.obs(); c.update(o, o.t) }
  const rk = c.threatRank({ env: 'FFA' }).map((r) => r.id)
  check('threatRank (FFA): attackers above the hider; empty in SQUAD', rk.length === 3 && rk[2] === 7 && c.threatRank({ env: 'SQUAD' }).length === 0, `order ${rk.join(',')}`)
}

// ----------------------------------------------------------------------------------------- f. fuzz
{
  const r = rng32(99)
  const c = createCounters(HELLO)
  const junk = [null, undefined, NaN, Infinity, -Infinity, 1e300, -1e300, 'x', {}, [], [1], [NaN, 2, 3], true, 0, -1, 7.5, () => 1, Symbol('s')]
  const pick = () => junk[Math.floor(r() * junk.length)]
  const maybe = (v) => (r() < 0.15 ? pick() : v)
  const n = QUICK ? 8000 : 30000
  let thrown = 0, nonFinite = 0
  let t = 0
  for (let k = 0; k < n; k++) {
    t += r() < 0.05 ? -r() * 3 : r() < 0.05 ? r() * 30 : 0.1
    const mechs = []
    const nm = Math.floor(r() * 20)
    for (let i = 0; i < nm; i++) {
      mechs.push(maybe({ id: maybe(Math.floor(r() * 120) - 5), kind: maybe(r() < 0.8 ? 'mech' : 'npc'), pos: maybe([U(r, -600, 600), U(r, -600, 600), U(r, -10, 40)]),
        vel: maybe([U(r, -25, 25), U(r, -25, 25), U(r, -12, 12)]), aim: maybe([U(r, -10, 10), U(r, -2, 2)]), hp: maybe(U(r, -100, 3000)), max_hp: maybe(U(r, -10, 3000)),
        cubes: maybe(Math.floor(U(r, -3, 40))), weapons: maybe(r() < 0.5 ? ['gun', 'laser'] : [pick(), 'lightning', 'mortar']), charging: maybe(r() < 0.3) }))
    }
    const ev = []
    for (let i = 0; i < Math.floor(r() * 4); i++) ev.push(maybe({ type: maybe(['damaged', 'hit', 'kill', 'pickup'][Math.floor(r() * 4)]), by: maybe(Math.floor(r() * 20)), target: maybe(Math.floor(r() * 20)), amount: maybe(U(r, -10, 900)), weapon: maybe('laser') }))
    const beams = []
    for (let i = 0; i < Math.floor(r() * 3); i++) beams.push(maybe({ by: maybe(Math.floor(r() * 20)), kind: maybe(r() < 0.5 ? 'laser' : 'lightning'), path: maybe([[U(r, -300, 300), U(r, -300, 300), 5], maybe([U(r, -300, 300), U(r, -300, 300), 5])]) }))
    const o = maybe({ type: 'obs', t: maybe(t), alive: maybe(Math.floor(r() * 17)), self: maybe({ id: maybe(3), pos: maybe([U(r, -50, 50), U(r, -50, 50), 0]), hp: maybe(900), max_hp: maybe(1400), energy: maybe(50), weapons: maybe([{ kind: 'gun' }, maybe({ kind: 'laser' })]) }),
      mechs: maybe(mechs), crates: maybe([{ pos: maybe([U(r, -300, 300), U(r, -300, 300), 0]) }, pick()]), events: maybe(ev), beams: maybe(beams) })
    try {
      c.update(o, maybe(t))
      const id = maybe(Math.floor(r() * 24) - 2)
      c.archetypeOf(id)
      const ctx = maybe({ env: maybe(r() < 0.7 ? 'FFA' : 'SQUAD'), bandLo: maybe(55), bandHi: maybe(95), myLaser: maybe(true), myHpf: maybe(r()), myHp: maybe(900), alive: maybe(9), myEnergy: maybe(70) })
      const v = c.adviceFor(id, ctx)
      for (const k2 of ['lo', 'hi', 'targetMult', 'dodgePriority', 'confidence', 'weight', 'engageLevel']) if (!Number.isFinite(v[k2])) nonFinite++
      if (!(v.lo <= v.hi) || typeof v.engage !== 'string' || typeof v.reason !== 'string') nonFinite++
      const rk = c.threatRank(ctx)
      for (const e of rk) if (!Number.isFinite(e.score)) nonFinite++
      if (k % 997 === 0) JSON.stringify(c.debugState())
    } catch (e) { thrown++; if (thrown < 3) console.log(e) }
  }
  const ds = c.debugState()
  check('fuzz: no exception escapes, all advice numbers finite, internal catch never used', thrown === 0 && nonFinite === 0 && ds.errors === 0,
    `${n} junk observations; thrown ${thrown}, non-finite ${nonFinite}, internal errors ${ds.errors}`)
}

// ----------------------------------------------------------------------------------------- g. determinism, real stream
function bigWorld(seed) {
  const w = new World(seed, { noise: { drop: 0.03 } })
  const names = ['kiterAbot', 'kiterBD', 'closerWV', 'closerAT', 'strafWV', 'strafBob', 'strafIL', 'hiderBob', 'hiderMH', 'farmerWV', 'farmerLaser', 'traveller', 'mixedRandom', 'midDual', 'kiterTT']
  let id = 0
  for (const nm of names) { if (id === 3) id++; w.add(S[nm](id, w)); id++ }
  for (let k = w.npcs.length; k < 12; k++) w.npcs.push({ id: 100 + k + 10, x: U(w.r, -250, 250), y: U(w.r, -250, 250) })
  for (let k = w.crates.length; k < 30; k++) w.crates.push({ id: 1100 + k, x: U(w.r, -250, 250), y: U(w.r, -250, 250) })
  return w
}
{
  const runOnce = () => {
    const w = bigWorld(5), c = createCounters(HELLO)
    let h = 0
    for (let k = 0; k < 600; k++) {
      w.step(); const o = w.obs(); c.update(o, o.t)
      for (let id = 0; id < 16; id++) { const v = c.adviceFor(id, { env: 'FFA', alive: 12 }); h = (Math.imul(h, 31) + Math.round(v.lo * 100) + v.engageLevel * 7 + Math.round(v.targetMult * 1000)) | 0 }
    }
    return JSON.stringify(c.debugState()) + '#' + h
  }
  const a = runOnce(), b = runOnce()
  check('determinism: two instances fed one stream give identical reads and advice', a === b, `state ${a.length} bytes`)
  // the brain shares the observation with every layer: the module must never write into it (frozen input, strict mode)
  const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]) } return o }
  const wf = bigWorld(6), cf = createCounters(deepFreeze({ ...HELLO, config: { mech: { walk_speed: 11.7 } } }))
  let wrote = 0
  for (let k = 0; k < 300; k++) { wf.step(); const o = deepFreeze(wf.obs()); try { cf.update(o, o.t); cf.adviceFor(5, deepFreeze({ env: 'FFA' })) } catch (e) { wrote++ } }
  check('input is read-only: frozen observations and contexts are accepted', wrote === 0 && cf.debugState().errors === 0, `${wrote} failures, ${cf.debugState().errors} internal errors`)
  const sp = join(ROOT, 'kit/check/stream.jsonl.gz')
  if (existsSync(sp)) {
    const lines = gunzipSync(readFileSync(sp)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    const hello = lines.find((l) => l.type === 'hello'), obs = lines.filter((l) => l.type === 'obs')
    const c = createCounters(hello)
    let thrown = 0
    for (const o of obs) { try { c.update(o, o.t); c.adviceFor(10, { env: 'FFA' }); c.threatRank({ env: 'FFA' }) } catch (e) { thrown++ } }
    const ds = c.debugState(), m10 = ds.mechs.find((m) => m.id === 10)
    check('real kit stream replay: no exception, no internal error', thrown === 0 && ds.errors === 0,
      `${obs.length} obs; mech 10 (house bot) read ${m10 ? m10.label + ' after ' + m10.obsS + ' s observed, scores ' + JSON.stringify(m10.scores) : 'none'}`)
  }
}

// ----------------------------------------------------------------------------------------- h. cost
{
  const w = bigWorld(9)
  const nWarm = QUICK ? 1000 : 3000, nRun = QUICK ? 4000 : 20000
  const obsList = []
  for (let k = 0; k < 600; k++) { w.step(); obsList.push(w.obs()) }
  // keep the actors' shooting so events and beams are present; replay the 60 s stream with advancing time
  const c = createCounters(HELLO)
  let t = 0
  const feed = (k) => { const o = obsList[k % obsList.length]; t += 0.1; o.t = t; c.update(o, t) }
  for (let k = 0; k < nWarm; k++) feed(k)
  const times = new Float64Array(nRun)
  const ctx = { env: 'FFA', alive: 12, bandLo: 125, bandHi: 185 }
  let t0 = performance.now()
  for (let k = 0; k < nRun; k++) { const a = performance.now(); feed(k); times[k] = performance.now() - a }
  const total = performance.now() - t0
  let tA = performance.now()
  for (let k = 0; k < nRun; k++) { for (let id = 0; id < 16; id++) c.adviceFor(id, ctx); c.threatRank(ctx) }
  const advUs = (performance.now() - tA) / nRun * 1000
  const sorted = Array.from(times).sort((x, y) => x - y)
  const mean = total / nRun, p99 = sorted[Math.floor(nRun * 0.99)], mx = sorted[nRun - 1]
  const nm = obsList[0].mechs.filter((m) => m.kind === 'mech').length
  check('cost: update with 15 mechs + 12 drones + 30 crates under 0.3 ms', mean < 0.3,
    `mean ${(mean * 1000).toFixed(1)} us, p99 ${(p99 * 1000).toFixed(1)} us, max ${(mx * 1000).toFixed(1)} us over ${nRun} updates (${nm} listed mechs); 16 x adviceFor + threatRank ${advUs.toFixed(1)} us`)
}

const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
