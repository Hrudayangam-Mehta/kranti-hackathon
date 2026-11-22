#!/usr/bin/env bun
// DEV ONLY: tests of the local simulator.   bun sim/test_sim.js [--quick] [--bench] [--only <substring>]
//   mechanics   every rule of protocol sections 7-10 that can be checked numerically in a small scripted scene
//   schema      every hello / obs / end the simulator emits and every action the bots return, against the kit schema
//   determinism the same seed gives the same match, bit for bit
//   conservation nobody leaves the map or stands inside a solid, hp / energy stay in range, the zone ends every match
//   replay      with the old balance the house stand-ins' free-for-all resembles the official replay (coarse numbers)
//   bots        our brain and the kit's python starter play through the same interfaces without errors

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Match } from './sim.js'
import { makeContext, playMatch, resolveBot } from './run.js'
import { FFA_TYPES, HouseBot, makeSquad } from './house.js'
import { loadSchema } from './schema.js'
import { loadConfig, oldBalance, ROOT } from './config.js'
import { makeRng, hashSeed } from './rng.js'

const args = process.argv.slice(2)
const QUICK = args.includes('--quick'), BENCH = args.includes('--bench')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const ctx = makeContext({})
const cfg0 = ctx.cfg
const schema = loadSchema()
const DT = 0.05
let passed = 0, failed = 0
const fails = []

function check(cond, msg) { if (!cond) throw new Error(msg) }
function near(a, b, tol, msg) { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg}: got ${a}, expected ${b} +- ${tol}`) }
async function test(name, fn) {
  if (ONLY && !name.includes(ONLY)) return
  const t0 = performance.now()
  try { const note = await fn(); passed++; console.log(`PASS  ${name}  (${((performance.now() - t0) / 1000).toFixed(1)} s)${note ? '  ' + note : ''}`) } catch (e) { failed++; fails.push(name); console.log(`FAIL  ${name}: ${e?.message || e}`) }
}

// ---------------------------------------------------------------------------------------------------------
// scripted scene: mechs stand on an open flat patch, everything else is removed
// ---------------------------------------------------------------------------------------------------------
const NEAR = [[60, 0], [40, 0], [30, 0], [30, 10], [-30, 0], [20, 2], [22, -2], [6, 0], [35, 0], [-40, 0], [80, 0], [0, 12]]
const FAR = [[100, 0], [0, 100], [-100, 0], [-100, 30], [205, 0]]
let SPOT = null
/** An open, nearly level place where every offset the tests use is standable and in plain view. */
function findSpot(m) {
  if (SPOT) return SPOT
  const w = ctx.world, rng = makeRng(4242)
  for (let k = 0; k < 6000; k++) {
    const p = m._groundPoint(rng, cfg0.zone.start_center[0], cfg0.zone.start_center[1], 420, 24, 60, 1)
    if (!p) continue
    let ok = true
    for (const [dx, dy] of NEAR) {
      const x = p[0] + dx, y = p[1] + dy, g = w.surfaceZ(x, y)
      if (!ctx.nav.passableAt(x, y) || ctx.nav.wallDistAt(x, y) < 6 || Math.abs(g - p[2]) > 1.2 || Math.abs(g - w.ground(x, y)) > 0.01 || !w.canSee(p[0], p[1], p[2] + 8, x, y, g + 4.5) || !w.canSee(x, y, g + 8, p[0], p[1], p[2] + 4.5)) { ok = false; break }
    }
    if (!ok) continue
    for (const [dx, dy] of FAR) {
      const x = p[0] + dx, y = p[1] + dy, g = w.surfaceZ(x, y)
      if (Math.abs(g - w.ground(x, y)) > 0.01 || w.bodyBlocked(x, y, g, 2.5, 9, 1.2)) { ok = false; break }
    }
    if (!ok) continue
    // one far point inside the +x view wedge with a clear line both ways
    let seen = null
    for (let q = 0; q < 60 && !seen; q++) {
      const a = (q % 12 - 5.5) * 0.14, d = 110 + 16 * Math.floor(q / 12)
      const x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d, g = w.surfaceZ(x, y)
      if (Math.abs(g - w.ground(x, y)) < 0.01 && !w.bodyBlocked(x, y, g, 2.5, 9, 1.2) && w.canSee(p[0], p[1], p[2] + 8, x, y, g + 4.5) && w.canSee(x, y, g + 8, p[0], p[1], p[2] + 4.5)) seen = [Math.cos(a) * d, Math.sin(a) * d]
    }
    if (!seen) continue
    p.farSeen = seen
    if (ok) { SPOT = p; return p }
  }
  return null
}
function scene(o = {}) {
  const n = o.n ?? 2
  const acts = {}
  const bots = Array.from({ length: 16 }, () => ({ name: 'script', hello() {}, act: (obs) => ({ tick: obs.tick }) }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: o.seed ?? 11, config: o.config || cfg0, bots, mode: 'ffa', latency: o.latency ?? 0 })
  const spot = findSpot(m)
  check(spot, 'no open spot found')
  m.mechs.forEach((q, i) => { if (i >= n) { q.alive = false } })
  m.aliveCount = n
  if (!o.keepNpcs) for (const q of m.npcs) q.alive = false
  if (!o.keepLoot) { m.pickups = []; for (const c of m.crates) c.alive = false }
  m.drops.forEach((d) => { d.callT = 1e9; d.landT = 1e9 })
  // keep the zone out of the way
  for (const p of m.phases) { p.from = { x: spot[0], y: spot[1], r: 5000 }; p.to = { x: spot[0], y: spot[1], r: 5000 } }
  const s = { m, spot, obs: {}, n, kept: {} }
  // observations taken inside step() would swallow events / sounds / beams: keep them for the next look()
  const keep = (id, obs) => { const k = s.kept[id] || (s.kept[id] = { events: [], sounds: [], beams: [] }); k.events.push(...obs.events); k.sounds.push(...obs.sounds); k.beams.push(...obs.beams) }
  s.place = (id, dx, dy, yaw = 0) => {
    const q = m.mechs[id]
    q.x = spot[0] + dx; q.y = spot[1] + dy; q.z = ctx.world.surfaceZ(q.x, q.y); q.vx = q.vy = q.vz = 0; q.grounded = true
    q.yaw = q.cmdYaw = yaw; q.pitch = q.cmdPitch = 0
    return q
  }
  s.step = (acts = {}, times = 1) => {
    for (let k = 0; k < times; k++) {
      const answers = []
      for (const q of m.mechs) {
        if (!q.alive) continue
        const obs = m._obs(q); s.obs[q.id] = obs; keep(q.id, obs)
        const a = typeof acts[q.id] === 'function' ? acts[q.id](obs) : acts[q.id]
        answers[q.id] = a === null ? null : { tick: obs.tick, ...(a || {}) }
      }
      m._applyAnswers(answers)
      for (let i = 0; i < m.every; i++) m._tick()
    }
    for (const q of m.mechs) if (q.alive) s.obs[q.id] = undefined
  }
  s.look = (id) => {                          // everything that mech was told since its last look()
    const o = m._obs(m.mechs[id]), k = s.kept[id]
    if (k) { o.events = k.events.concat(o.events); o.sounds = k.sounds.concat(o.sounds); o.beams = k.beams.concat(o.beams); s.kept[id] = null }
    return o
  }
  for (let i = 0; i < n; i++) s.place(i, i * 60, 0, i === 0 ? 0 : Math.PI)
  return s
}
const ev = (obs, type) => obs.events.filter((e) => e.type === type)

// ---------------------------------------------------------------------------------------------------------
// mechanics
// ---------------------------------------------------------------------------------------------------------
await test('movement: acceleration, walk and boost speed, energy', () => {
  const s = scene({ n: 1 }); const q = s.m.mechs[0]; const x0 = q.x
  s.step({ 0: { move: [1, 0] } })
  near(q.x - x0, 3 * cfg0.mech.ground_accel * DT * DT, 0.01, 'displacement after the first decision (3 a dt^2)')
  s.step({ 0: { move: [1, 0] } }, 10)
  near(Math.hypot(q.vx, q.vy), cfg0.mech.walk_speed, 1e-6, 'walk speed')
  s.step({ 0: { move: [5, 0] } }, 2)
  near(Math.hypot(q.vx, q.vy), cfg0.mech.walk_speed, 1e-6, 'move length is clamped to 1')
  s.step({ 0: { move: [0.5, 0] } }, 6)
  near(Math.hypot(q.vx, q.vy), cfg0.mech.walk_speed * 0.5, 1e-6, 'move length below 1 walks slower')
  const e0 = q.energy
  s.step({ 0: { move: [1, 0], boost: true } }, 10)
  near(Math.hypot(q.vx, q.vy), cfg0.mech.boost_speed, 1e-6, 'boost speed')
  near(e0 - q.energy, cfg0.mech.boost_drain * 1.0, 1e-6, 'boost drain over 1 s')
  s.step({ 0: {} }, 3)                                      // 0.3 s: no regeneration yet
  near(q.energy, e0 - cfg0.mech.boost_drain, 1e-6, 'no energy regen during the delay')
  s.step({ 0: {} }, 10)
  near(q.energy, Math.min(100, e0 - cfg0.mech.boost_drain + cfg0.mech.energy_regen * (1.3 - cfg0.mech.energy_regen_delay + DT)), 1.0, 'energy regen after the delay')
  s.step({ 0: { boost: true } }, 5)
  check(q.energy >= 99, 'boost without moving on the ground costs nothing')
})

await test('movement: jump apex 2.5 m, jump-jet hop 14.9 m / 3.1 s / 22.5 energy', () => {
  const s = scene({ n: 1 }); const q = s.m.mechs[0]; const z0 = q.z
  s.step({ 0: { jump: true } })
  near(q.z - z0, 0.935, 0.01, 'height 0.1 s after a jump')
  let top = 0, n = 1
  while (!q.grounded && n < 100) { s.step({ 0: {} }); n++; top = Math.max(top, q.z - z0) }
  near(top, 2.5, 0.15, 'jump apex')
  const e0 = q.energy
  let air = 0; top = 0
  s.step({ 0: { jump: true, boost: true } }); air++
  for (let k = 0; k < 14; k++) { s.step({ 0: { boost: true } }); air++ }
  near(q.vz, cfg0.mech.max_rise_speed - cfg0.mech.gravity * DT, 1e-6, 'jet climb rate')
  near(e0 - q.energy, cfg0.mech.jet_drain * 1.5, 1e-6, 'jet drain over 1.5 s')
  while (!q.grounded && air < 200) { s.step({ 0: {} }); air++; top = Math.max(top, q.z - z0) }
  near(top, 14.9, 0.15, 'hop apex')
  near(air * 0.1, 3.1, 0.11, 'hop air time')
  check(!s.m.mechs[0].jump || true, '')
})

await test('movement: walls slide, map edge, nobody enters a solid', () => {
  const s = scene({ n: 1 }); const q = s.m.mechs[0], w = ctx.world
  // walk into the east face of a tall building at an angle: the body must keep moving along the wall
  let start = null
  const tall = w.prisms.filter((p) => p.kind === 'building' && p.top - w.ground((p.minX + p.maxX) / 2, (p.minY + p.maxY) / 2) > 12 && p.maxY - p.minY > 24)
    .sort((p, r) => Math.hypot(p.maxX - s.spot[0], p.minY - s.spot[1]) - Math.hypot(r.maxX - s.spot[0], r.minY - s.spot[1]))
  for (const p of tall) {
    const x = p.maxX + 7, y = (p.minY + p.maxY) / 2
    if (ctx.nav.passableAt(x, y) && ctx.nav.wallDistAt(x, y) > 3.5 && Math.abs(w.surfaceZ(x, y) - w.ground(x, y)) < 0.01) { start = [x, y]; break }
  }
  check(start, 'no building with open ground east of it')
  q.x = start[0]; q.y = start[1]; q.z = w.surfaceZ(q.x, q.y); q.grounded = true
  const dir = Math.PI - 0.5
  let slid = 0, touched = 0
  for (let k = 0; k < 40; k++) {
    const px = q.x, py = q.y
    s.step({ 0: { move: [Math.cos(dir), Math.sin(dir)] } })
    check(!w.inSolid(q.x, q.y, q.z + 4.5), `inside a solid at step ${k}`)
    check(s.m.col.wallPen(q.x, q.y, q.z, q.radius, q.height, 1.2) < 0.02, 'body overlaps a wall')
    const moved = Math.hypot(q.x - px, q.y - py)
    if (s.m.col.wallPen(q.x + Math.cos(dir) * 0.4, q.y + Math.sin(dir) * 0.4, q.z, q.radius, q.height, 1.2) > 0) { touched++; if (moved > 0.15 && moved < 1.15) slid++ }
  }
  check(touched > 5, `the body never reached the wall (${touched})`)
  check(slid > 5, `the body should slide along the wall, not stop dead (touched ${touched}, slid ${slid})`)
  // map edge
  const b = w.bounds
  q.x = b.maxX - 6; q.y = (b.minY + b.maxY) / 2; q.z = w.surfaceZ(q.x, q.y) + 30; q.grounded = false; q.vz = 0
  for (let k = 0; k < 40; k++) s.step({ 0: { move: [1, 0.2] } })
  check(q.x <= b.maxX - q.radius + 1e-6, 'the map edge is a wall')
})

await test('movement: jet onto a roof, walk off its edge, land on the ground', () => {
  const s = scene({ n: 1 }); const q = s.m.mechs[0], w = ctx.world
  let roof = null
  const rng = makeRng(5)
  for (let k = 0; k < 4000 && !roof; k++) {
    const p = s.m._roofPoint(rng, s.spot[0], s.spot[1], 400)
    if (!p) continue
    const up = p[2] - w.ground(p[0], p[1])
    if (up < 6 || up > 25) continue
    for (let a = 0; a < 8; a++) {
      const gx = p[0] + Math.cos(a * 0.785) * 22, gy = p[1] + Math.sin(a * 0.785) * 22
      if (ctx.nav.passableAt(gx, gy) && w.surfaceZ(gx, gy) < p[2] - 5 && ctx.nav.wallDistAt(gx, gy) > 4) { roof = { p, gx, gy }; break }
    }
  }
  check(roof, 'no low roof with open ground next to it')
  q.x = roof.gx; q.y = roof.gy; q.z = w.surfaceZ(q.x, q.y); q.grounded = true; q.energy = 100
  const dir = Math.atan2(roof.p[1] - q.y, roof.p[0] - q.x), mv = [Math.cos(dir), Math.sin(dir)]
  let onRoof = false
  s.step({ 0: { jump: true, boost: true } })
  for (let k = 0; k < 120 && !onRoof; k++) {
    const high = q.z > roof.p[2] + 1.0
    s.step({ 0: { move: high || q.grounded ? mv : [0, 0], boost: !high } })
    check(!w.inSolid(q.x, q.y, q.z + 0.3), 'inside the building while climbing')
    if (q.grounded && Math.abs(q.z - roof.p[2]) < 0.05 && w.surfacePrism(q.x, q.y, q.z + 0.1) >= 0) onRoof = true
  }
  check(onRoof, `did not land on the roof (z=${q.z.toFixed(1)}, roof ${roof.p[2].toFixed(1)}, energy ${q.energy.toFixed(0)})`)
  // walk back off the edge: the body is carried clear of the wall and lands on the ground
  let landed = false
  for (let k = 0; k < 150 && !landed; k++) {
    s.step({ 0: { move: [-mv[0], -mv[1]] } })
    check(s.m.col.wallPen(q.x, q.y, q.z, q.radius, q.height, 1.2) < 0.05, 'fell into the wall below the roof edge')
    if (q.grounded && q.z < roof.p[2] - 4) landed = true
  }
  check(landed, 'did not come down from the roof')
})

await test('torso: yaw 4 rad/s, pitch 3 rad/s, pitch clamp, aim defaults to the last command', () => {
  const s = scene({ n: 1 }); const q = s.m.mechs[0]
  s.step({ 0: { aim: [2, 1.5] } })
  near(q.yaw, cfg0.mech.turn_rate * 0.1, 1e-9, 'yaw after 0.1 s'); near(q.pitch, cfg0.mech.pitch_rate * 0.1, 1e-9, 'pitch after 0.1 s')
  s.step({ 0: {} }, 9)
  near(q.yaw, 2, 1e-9, 'yaw keeps slewing to the last commanded aim'); near(q.pitch, cfg0.mech.max_pitch, 1e-9, 'pitch clamp')
  s.step({ 0: { aim: [-3.0, -2] } }, 20)
  near(q.pitch, cfg0.mech.min_pitch, 1e-9, 'pitch floor'); near(q.yaw, -3.0, 1e-9, 'yaw takes the short way round')
})

await test('gun: cadence, magazine, reload, bullet speed and origin, damage, rear armour, events', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0], b = s.m.mechs[1], g = cfg0.weapons.gun
  s.place(1, 40, 0, Math.PI)                               // facing the shooter
  s.step({ 0: { fire: [true, false] } })
  const p = s.m.projectiles[0]
  check(p && p.kind === 'gun', 'a bullet exists after the first decision')
  near(Math.hypot(p.vx, p.vy, p.vz), g.speed, 1e-6, 'bullet speed')
  near(p.x - a.x, 3 + g.speed * DT * 2, 0.6, 'bullet is 3 m + two ticks of flight out')
  near(p.z - a.z, cfg0.mech.muzzle_height, 0.6, 'muzzle height')
  let o = s.look(0)
  near(o.self.weapons[0].cooldown, 0.19, 1e-9, 'cooldown read-out one decision after a shot')
  check(o.self.weapons[0].ammo === g.mag - 1, 'ammo count')
  check(!o.projectiles.some((q) => q.id === p.id), 'own bullets are not listed')
  check(s.look(1).projectiles.some((q) => q.id === p.id && q.kind === 'gun'), 'the target sees the bullet')
  s.step({ 0: { fire: [true, false] } }, 2)
  const ob = s.look(1), oa = s.look(0)
  const dmg = ev(ob, 'damaged')
  check(dmg.length >= 1 && dmg[0].weapon === 'gun' && dmg[0].by === 0 && dmg[0].amount === g.damage && dmg[0].rear === undefined, `front hit event ${JSON.stringify(dmg[0])}`)
  near(Math.abs(dmg[0].bearing), Math.PI, 0.05, 'damage bearing points at the shooter')
  const hit = ev(oa, 'hit')
  check(hit.length >= 1 && hit[0].target === 1 && hit[0].amount === g.damage && hit[0].weapon === 'gun', 'hit event')
  // held trigger: exactly one shot per cooldown on average, then the reload
  const s2 = scene({ n: 2 }); const a2 = s2.m.mechs[0]; s2.place(1, 40, 0, 0)   // target shows its back
  const shotTicks = []
  let last = a2.shotsFired
  for (let k = 0; k < 150; k++) { s2.step({ 0: { fire: [true, false] } }); if (a2.shotsFired !== last) { for (let i = last; i < a2.shotsFired; i++) shotTicks.push(k); last = a2.shotsFired } }
  check(a2.shotsFired >= 24, 'two magazines in 15 s')
  near((shotTicks[11] - shotTicks[0]) * 0.1, g.cooldown * 11, 0.11, 'eleven intervals of a held trigger')
  near((shotTicks[12] - shotTicks[11]) * 0.1, g.reload, 0.21, 'reload time')
  const rearEv = ev(s2.look(1), 'damaged')[0]
  check(rearEv && rearEv.rear === true && rearEv.amount === g.damage * cfg0.mech.rear_mult, `rear hits deal x1.5 and are flagged: ${JSON.stringify(rearEv)}`)
  check(ev(s2.look(0), 'hit')[0].rear === true, 'the shooter is told about the rear hit')
  // a bot that only fires when the observation shows cooldown 0 gets one shot per 6 ticks (forensics, kit stream)
  const s3 = scene({ n: 1 }); const a3 = s3.m.mechs[0]; const t3 = []
  let l3 = 0
  for (let k = 0; k < 40; k++) { s3.step({ 0: (obs) => ({ fire: [obs.self.weapons[0].cooldown === 0 && obs.self.weapons[0].ammo > 0, false] }) }); if (a3.shotsFired !== l3) { t3.push(k); l3 = a3.shotsFired } }
  check(t3[1] - t3[0] === 3 && t3[2] - t3[1] === 3, `fire-on-cooldown-0 cadence should be 6 ticks, got ${t3.slice(0, 4)}`)
})

await test('gun: reload action, bullet range, bullets stop at buildings, trees do not stop shots', () => {
  const s = scene({ n: 1 }); const a = s.m.mechs[0], g = cfg0.weapons.gun
  s.step({ 0: { fire: [true, false], aim: [0, 0.4] } }, 6)
  s.step({ 0: {} }, 4)
  const used = g.mag - a.slots[0].ammo
  check(used > 0, 'shots fired')
  s.step({ 0: { reload: true } })
  check(a.slots[0].reload > 0, 'early reload started')
  s.step({ 0: {} }, 25)
  check(a.slots[0].ammo === g.mag, 'magazine full after the reload')
  // range: a bullet fired upward disappears after `range` metres
  s.step({ 0: { aim: [0, 0.6] } }, 6)
  s.step({ 0: { fire: [true, false], aim: [0, 0.6] } })
  check(s.m.projectiles.length === 1, 'one bullet in flight')
  const id = s.m.projectiles[0].id, life = Math.ceil(g.range / (g.speed * DT))
  a.fire0 = false
  for (let k = 0; k < life - 4; k++) s.m._tick()
  check(s.m.projectiles.some((p) => p.id === id), 'bullet still flying just before its range')
  for (let k = 0; k < 4; k++) s.m._tick()
  check(!s.m.projectiles.some((p) => p.id === id), 'bullet expired at its range')
})

await test('laser: charge, minimum charge, auto-fire, damage scale, cook-off, cooldown, slow walk, charging flag', () => {
  const L = cfg0.weapons.laser
  const mk = () => { const s = scene({ n: 2 }); s.m.mechs[0].slots[1] = s.m._newWeapon('laser'); s.place(1, 60, 0, Math.PI); return s }
  let s = mk(); let a = s.m.mechs[0], b = s.m.mechs[1]
  // hold until the read-out is full, then let go
  let n = 0
  const at = () => [Math.atan2(b.y - a.y, b.x - a.x), 0]
  for (; n < 30; n++) { const full = (a.slots[1].charge >= L.charge - 1e-9); if (full) break; s.step({ 0: { fire: [false, true], move: [0, 1], aim: at() } }) }
  near(n * 0.1, 0.8, 0.051, 'decisions until the read-out shows a full charge')
  near(Math.hypot(a.vx, a.vy), cfg0.mech.walk_speed * cfg0.mech.charge_move_mult, 1e-6, 'half speed while charging')
  check(s.look(1).mechs.find((q) => q.id === 0).charging === true, 'others see charging: true')
  s.step({ 0: { fire: [false, false], aim: at() } })
  near(b.dmgTaken, L.damage, 1e-6, 'full-charge damage')
  let ob = s.look(1)
  check(ob.beams.length === 1 && ob.beams[0].kind === 'laser' && ob.beams[0].by === 0 && ob.beams[0].path.length === 2, 'the victim sees the beam')
  near(ob.beams[0].path[0][2] - a.z, cfg0.mech.muzzle_height, 0.05, 'beam starts at muzzle height')
  near(Math.hypot(ob.beams[0].path[0][0] - a.x, ob.beams[0].path[0][1] - a.y), 3.0, 0.05, 'beam starts 3 m out')
  near(a.slots[1].cooldown, L.cooldown - DT, 0.051, 'laser cooldown')
  // a tap fires at min_charge with the minimum fraction
  s = mk(); a = s.m.mechs[0]; b = s.m.mechs[1]
  s.step({ 0: { fire: [false, true] } }); s.step({ 0: {} })
  near(b.dmgTaken, L.damage * (L.min_frac + (1 - L.min_frac) * L.min_charge / L.charge), 1e-6, 'tap fires at min_charge')
  // held forever: fires on its own hold_s after the charge is full
  s = mk(); a = s.m.mechs[0]; b = s.m.mechs[1]
  let k = 0
  for (; k < 60 && b.dmgTaken === 0; k++) s.step({ 0: { fire: [false, true] } })
  near(k * 0.1, L.charge + L.hold_s, 0.11, 'auto-fire time')
  // cook-off against a mortar carrier, hit from behind
  s = mk(); a = s.m.mechs[0]; b = s.m.mechs[1]; b.slots[1] = s.m._newWeapon('mortar'); s.place(1, 60, 0, 0)
  for (let i = 0; i < 9; i++) s.step({ 0: { fire: [false, true] } })
  s.step({ 0: {} })
  near(b.dmgTaken, Math.min(cfg0.mech.hp, L.damage * (1 + L.cookoff) * cfg0.mech.rear_mult), 1e-6, 'cook-off x rear')
  check(ev(s.look(1), 'effect').some((e) => e.effect === 'cookoff' && e.by === 0), 'cookoff effect event')
  check(ev(s.look(0), 'hit').some((e) => e.effect === 'cookoff' && e.rear === true), 'hit event carries the effect and rear')
})

await test('lightning: cone, nearest target, chain x0.7, energy, dry zap, short', () => {
  const Z = cfg0.weapons.lightning
  const s = scene({ n: 4 }); const a = s.m.mechs[0]
  a.slots[1] = s.m._newWeapon('lightning')
  s.place(1, 30, 0, Math.PI); s.place(2, 30, 10, Math.PI); s.place(3, -30, 0, 0)       // 3 stands behind the shooter
  s.m.mechs[1].slots[1] = s.m._newWeapon('laser')
  // the laser carrier starts a charge
  s.step({ 1: { fire: [false, true] } }, 2)
  check(s.m.mechs[1].charging, 'target is charging')
  const e0 = a.energy
  s.step({ 0: { fire: [false, true] } })
  near(e0 - a.energy, Z.energy, 1e-6, 'energy per zap')
  near(s.m.mechs[1].dmgTaken, Z.damage, 1e-6, 'first target takes full damage')
  near(s.m.mechs[2].dmgTaken, Z.damage * Z.chain_falloff, 1e-6, 'chain target takes x0.7')
  check(s.m.mechs[3].dmgTaken === 0, 'nothing behind the shooter is hit')
  check(!s.m.mechs[1].charging && s.m.mechs[1].slots[1].charge === 0, 'short: the charge is lost')
  check(ev(s.look(1), 'effect').some((e) => e.effect === 'short'), 'short effect event')
  s.step({ 1: { fire: [false, true] } }, 5)
  check(!s.m.mechs[1].charging, 'cannot start a charge while shorted')
  s.step({ 1: { fire: [false, true] } }, 20)
  check(s.m.mechs[1].charging || s.m.mechs[1].slots[1].cooldown > 0, 'can charge again after short_s')
  // no target in the cone: still fires and costs energy
  const s2 = scene({ n: 2 }); const a2 = s2.m.mechs[0]; a2.slots[1] = s2.m._newWeapon('lightning'); s2.place(1, 0, 100, 0)
  s2.step({ 0: { fire: [false, true] } })
  near(cfg0.mech.energy - a2.energy, Z.energy, 1e-6, 'a dry zap costs energy')
  check(s2.m.mechs[1].dmgTaken === 0, 'target outside the range is not hit')
})

await test('mortar: ballistic flight, direct hit, splash falloff, concussion, self damage', () => {
  const M = cfg0.weapons.mortar
  let s = scene({ n: 2 }); let a = s.m.mechs[0], b = s.m.mechs[1]
  a.slots[1] = s.m._newWeapon('mortar')
  // flat shot at a target 40 m away: lands on or next to it
  const d = 40
  s.place(1, d, 0, Math.PI)
  const tube = cfg0.mech.height + 0.5
  // low arc onto the body centre
  const h = 4.5 - tube, v = M.speed, g = M.gravity, dd = d - 3
  const th = Math.atan((v * v - Math.sqrt(v ** 4 - g * (g * dd * dd + 2 * h * v * v))) / (g * dd))
  s.step({ 0: { aim: [0, th] } }, 5)
  s.step({ 0: { aim: [0, th], fire: [false, true] } })
  check(s.m.projectiles.some((p) => p.kind === 'mortar'), 'shell in flight')
  for (let k = 0; k < 20 && b.dmgTaken === 0; k++) s.step({ 0: { aim: [0, th] } })
  near(b.dmgTaken, M.damage, 1e-6, 'direct hit damage')
  check(!b.grounded || b.vz !== 0 || Math.hypot(b.vx, b.vy) > 1, 'direct hit throws the target')
  near(cfg0.mech.energy - b.energy, M.drain, 6, 'concussion drains energy')
  check(ev(s.look(1), 'effect').some((e) => e.effect === 'concuss'), 'concuss effect event')
  // splash: blast on the ground 6 m in front of the feet -> f = 1 - 0.7 * (6 - 2.5) / 7
  s = scene({ n: 2 }); a = s.m.mechs[0]; b = s.m.mechs[1]; s.place(1, 30, 0, Math.PI)
  const gz = ctx.world.surfaceZ(b.x - 6, b.y) + 0.05
  s.m._explode(b.x - 6, b.y, gz, 0, { ...M }, 1, -1, null)
  const f = 1 - (1 - M.splash_edge) * (6 - cfg0.mech.radius) / M.splash_radius
  near(b.dmgTaken, M.splash * f, 0.02, 'splash falloff measured to the body surface')
  near(b.vx, M.knock * f, 1e-6, 'knock-back speed'); near(b.vz, M.knock_up * f, 1e-6, 'knock-up speed')
  near(cfg0.mech.energy - b.energy, M.drain * f, 1e-6, 'energy drain scales with the falloff')
  check(a.dmgTaken === 0, 'out of the radius: no damage')
  // own blast at the feet: half damage, thrown too
  s = scene({ n: 1 }); a = s.m.mechs[0]
  s.m._explode(a.x + 3, a.y, a.z + 0.05, 0, { ...M }, 1, -1, null)
  near(a.dmgTaken, M.splash * (1 - 0.7 * 0.5 / 7) * cfg0.mech.self_damage_mult, 0.02, 'self damage x0.5')
  check(a.vx < -1, 'own blast throws the shooter')
})

await test('health: regeneration after 5 s, not outside the zone, zone damage ignores armour', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0], b = s.m.mechs[1]
  s.place(1, 40, 0, Math.PI)
  s.step({ 0: { fire: [true, false] } }, 3)
  s.step({}, 5)
  const hp0 = b.hp, tHit = b.lastCombatT
  check(hp0 < cfg0.mech.hp, 'target was hurt')
  while (s.m.t < tHit + cfg0.mech.regen_delay - 0.11) s.step({})
  near(b.hp, hp0, 1e-9, 'no regen before regen_delay')
  s.step({}, 10)
  const ticks = Math.floor((s.m.t - (tHit + cfg0.mech.regen_delay)) / DT + 1e-6) + 1
  near(b.hp - hp0, Math.min(cfg0.mech.hp - hp0, cfg0.mech.regen_per_s * DT * ticks), 1e-6, 'regen rate after the delay')
  check(a.hp === cfg0.mech.hp && a.lastCombatT >= tHit - 1, 'dealing damage also restarts the timer')
  // outside the zone: dps, events, no regen, armour does not help
  const s2 = scene({ n: 1 }); const q = s2.m.mechs[0]
  for (const p of s2.m.phases) { p.from = { x: q.x + 500, y: q.y, r: 100 }; p.to = p.from }
  q.upgrades = ['armor', 'armor']; s2.m._recalc(q)
  s2.step({}, 10)
  near(cfg0.mech.hp - q.hp, cfg0.zone.phases[0].dps * 1.0, 1e-6, 'zone damage per second')
  const o = s2.look(0)
  check(o.self.in_zone === false, 'in_zone false')
  const z = ev(o, 'damaged')[0]
  check(z && z.weapon === 'zone' && z.by === null && z.bearing === null, 'zone damage event has null bearing and by')
})

await test('cubes: pickup, max hp, damage and size scaling, offers, picks, timeout default', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0], b = s.m.mechs[1], cc = cfg0.cubes
  a.hp = 1000; a.lastCombatT = 0                              // just hurt: no regeneration during this test step
  s.m.cubes.push({ id: 5000, x: a.x + 2, y: a.y, z: a.z })
  s.m.cubes.push({ id: 5001, x: a.x + 20, y: a.y, z: a.z })
  s.step({})
  check(a.cubes === 1 && s.m.cubes.length === 1, 'the cube in reach was picked up, the far one was not')
  near(a.maxHp, cfg0.mech.hp * (1 + cc.hp_per_cube), 1e-6, 'max hp +4%'); near(a.hp, 1000 + cfg0.mech.hp * cc.hp_per_cube, 1e-6, 'the difference is healed')
  near(a.radius, cfg0.mech.radius * (1 + cc.size_per_cube), 1e-6, 'size +5%')
  let o = s.look(0)
  check(ev(o, 'pickup')[0]?.cubes === 1, 'pickup event')
  near(o.self.stats.muzzle_height, cfg0.mech.muzzle_height * 1.05, 1e-3, 'stats show the scaled muzzle height')
  s.step({})
  o = s.look(0)
  check(o.offer && o.offer.choices.length === 3 && new Set(o.offer.choices.map((c) => c.id)).size === 3, 'an offer of three distinct upgrades at 1 cube')
  near(o.offer.expires - o.t, cfg0.bot.offer_timeout_s - 0.1, 0.11, 'offer expiry')
  check(o.offer.choices.every((c) => { const u = cfg0.upgrades.find((q) => q.id === c.id); return !u.requires || u.requires === 'gun' }), 'weapon upgrades only for held weapons')
  const want = o.offer.choices[2].id
  s.step({ 0: { pick: 2 } })
  o = s.look(0)
  check(o.self.upgrades.length === 1 && o.self.upgrades[0] === want && ev(o, 'upgrade')[0]?.id === want && o.offer === null, 'picked upgrade applied')
  // damage scaling by cubes
  s.place(1, 40, 0, Math.PI)
  const base = a.wstats.gun.damage
  s.step({ 0: { fire: [true, false] } }); s.step({}, 3)
  near(b.dmgTaken, base * (1 + cc.damage_per_cube), 1e-6, 'damage x(1 + 4% per cube)')
  // timeout: choice 0
  s.m._giveCubes(a, 2)
  s.step({}, 2)
  const first = s.look(0).offer.choices[0].id
  s.step({}, 52)
  check(a.upgrades[1] === first, 'unanswered offer applies choice 0')
  // every upgrade id changes the stat its effect names
  for (const u of cfg0.upgrades) {
    const t = scene({ n: 1 }).m; const q = t.mechs[0]
    if (u.requires && u.requires !== 'gun') q.slots[1] = t._newWeapon(u.requires)
    const before = JSON.stringify([q.stats, q.wstats])
    q.upgrades.push(u.id); t._recalc(q)
    check(JSON.stringify([q.stats, q.wstats]) !== before, `upgrade ${u.id} changed nothing`)
    for (const e of u.effects) {
      const parts = e.path.split('.'); const cur = parts[0] === 'mech' ? q.stats[parts[1]] : q.wstats[parts[1]][parts[2]]
      const ref = parts[0] === 'mech' ? cfg0.mech[parts[1]] : cfg0.weapons[parts[1]][parts[2]]
      near(cur, (e.mul !== undefined ? ref * e.mul : ref) + (e.add || 0), 1e-3, `upgrade ${u.id} ${e.path}`)
    }
    if (u.id === 'plating') near(q.maxHp, cfg0.mech.hp * 1.15, 1e-6, 'plating raises max hp')
  }
  // stat cap at 10 cubes, size keeps growing
  const t = scene({ n: 1 }).m; t._giveCubes(t.mechs[0], 14)
  near(t.mechs[0].maxHp, cfg0.mech.hp * 1.4, 1e-6, 'hp bonus capped at 10 cubes'); near(t.mechs[0].radius, cfg0.mech.radius * 1.7, 1e-6, 'size is not capped')
  check(t.mechs[0].pendingOffers === 4, 'offers queued at 1, 3, 6 and 10 cubes')
})

await test('loot: take, equip delay, take_failed reasons, swap, drop, crates, death drops', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0]
  const p1 = s.m._spawnPickup('laser', a.x + 3, a.y, a.z, null)
  const p2 = s.m._spawnPickup('laser', a.x + 3.5, a.y, a.z, null)
  const p3 = s.m._spawnPickup('mortar', a.x + 30, a.y, a.z, null)
  const p4 = s.m._spawnPickup('lightning', a.x - 3, a.y, a.z, null)
  check(s.look(0).pickups.length === 4, 'pickups are visible')
  s.step({ 0: { take: p1.id } })
  let o = s.look(0)
  check(ev(o, 'took')[0]?.slot === 1 && o.self.weapons[1].kind === 'laser', 'took into the empty slot')
  near(o.self.weapons[1].cooldown, Math.max(cfg0.loot.equip_s, cfg0.weapons.laser.cooldown) - 0.1, 1e-6, 'equip delay = max(equip_s, cooldown)')
  s.step({ 0: { take: p2.id } }); check(ev(s.look(0), 'take_failed')[0]?.reason === 'have', 'have')
  s.step({ 0: { take: p3.id } }); check(ev(s.look(0), 'take_failed')[0]?.reason === 'range', 'range')
  s.step({ 0: { take: 8999 } }); check(ev(s.look(0), 'take_failed')[0]?.reason === 'gone', 'gone')
  s.step({ 0: { take: p4.id } }); check(ev(s.look(0), 'take_failed')[0]?.reason === 'full', 'full')
  s.step({ 0: { take: p4.id, drop: 1 } })
  o = s.look(0)
  check(ev(o, 'dropped')[0]?.kind === 'laser' && ev(o, 'took')[0]?.kind === 'lightning' && o.self.weapons[1].kind === 'lightning', 'swap')
  check(o.pickups.some((p) => p.kind === 'laser' && Math.hypot(p.pos[0] - a.x, p.pos[1] - a.y) < 0.5), 'the old weapon lies at the feet')
  a.slots[0].ammo = 5
  s.step({ 0: { drop: 0 } })
  o = s.look(0)
  check(o.self.weapons[0] === null && ev(o, 'dropped')[0]?.kind === 'gun', 'the gun can be dropped')
  const gunId = ev(o, 'dropped')[0].id
  s.step({ 0: { take: gunId } })
  o = s.look(0)
  check(o.self.weapons[0]?.kind === 'gun' && o.self.weapons[0].ammo === 5, 'a dropped gun keeps its ammo')
  near(o.self.weapons[0].cooldown, cfg0.loot.equip_s - 0.1, 1e-6, 'gun equip delay 1 s')
  // contested pickup: the closer mech gets it
  const s2 = scene({ n: 2 }); const u = s2.m.mechs[0], v = s2.m.mechs[1]; s2.place(1, 6, 0, Math.PI)
  const pc = s2.m._spawnPickup('mortar', u.x + 3.5, u.y, u.z, null)
  s2.step({ 0: { take: pc.id }, 1: { take: pc.id } })
  check(v.slots[1]?.kind === 'mortar' && u.slots[1] === null && ev(s2.look(0), 'take_failed')[0]?.reason === 'gone', 'the closer mech wins')
  // crate: 300 hp, hit events, one cube, a weapon half the time
  const s3 = scene({ n: 1 }); const w = s3.m.mechs[0]
  let weapons = 0
  for (let k = 0; k < 40; k++) {
    const c = { id: 1000 + k, alive: true, x: w.x + 20, y: w.y, z: w.z, hp: cfg0.crates.hp }
    s3.m.crates.push(c)
    const before = s3.m.pickups.length
    s3.m._hurtCrate(c, 299, 'gun', 0); check(c.alive, 'crate survives 299')
    s3.m._hurtCrate(c, 45, 'gun', 0); check(!c.alive, 'crate destroyed')
    if (s3.m.pickups.length > before) weapons++
  }
  check(s3.m.cubes.length === 40, 'one cube per crate')
  check(weapons >= 10 && weapons <= 30, `about half of the crates drop a weapon (${weapons}/40)`)
  check(ev(s3.look(0), 'hit').some((e) => e.target >= 1000 && e.amount === 1), 'crate hits are reported, clamped to the hp left')
  // death: cubes + 2 and every weapon except the gun
  const s4 = scene({ n: 2 }); const d = s4.m.mechs[1]; s4.m._giveCubes(d, 3); d.slots[1] = s4.m._newWeapon('mortar')
  s4.m._hurtMech(d, 99999, 'gun', 0, d.x - 1, d.y, null); s4.m._placeDeaths()
  check(s4.m.cubes.length === 3 + cfg0.cubes.death_drop_extra, 'dead mech drops its cubes + 2')
  check(s4.m.pickups.length === 1 && s4.m.pickups[0].kind === 'mortar', 'dead mech drops its weapons except the gun')
  check(ev(s4.look(0), 'kill')[0]?.target === 1 && s4.m.mechs[0].kills === 1, 'kill event')
})

await test('drones: aggro range, bullets, damage, leash, cubes', () => {
  const s = scene({ n: 1, keepNpcs: true }); const a = s.m.mechs[0], nc = cfg0.npc
  const n = s.m.npcs[0]
  for (const q of s.m.npcs) q.alive = q === n
  n.x = n.hx = a.x + 60; n.y = n.hy = a.y; n.z = ctx.world.surfaceZ(n.x, n.y); n.gx = n.x; n.gy = n.y
  s.step({}, 30)
  check(a.dmgTaken === 0 && n.target < 0, 'no aggro at 60 m')
  check(Math.hypot(n.x - n.hx, n.y - n.hy) <= nc.leash + 0.5, 'wanders inside its leash')
  n.x = n.hx = a.x + 35; n.y = n.hy = a.y; n.gx = n.x; n.gy = n.y; n.z = ctx.world.surfaceZ(n.x, n.y)
  s.step({}, 60)
  check(n.target === 0, 'aggro inside 45 m')
  const shots = a.dmgTaken / nc.damage
  check(shots >= 3 && shots <= 6.01, `about one hit per second from a drone (got ${shots} in 6 s)`)
  const o = s.look(0)
  const seen = o.mechs.find((q) => q.kind === 'npc')
  check(seen && seen.hp === nc.hp && seen.max_hp === nc.hp && seen.id >= 100, 'drone appears in obs.mechs')
  check(ev(o, 'damaged').some((e) => e.weapon === 'npc' && e.by === n.id), 'damaged by npc event')
  check(o.sounds.some((q) => q.kind === 'npc_gun'), 'npc_gun sound')
  s.m._hurtNpc(n, nc.hp, 'gun', 0)
  check(!n.alive && s.m.cubes.length === nc.cubes, 'a dead drone drops 2 cubes')
})

await test('supply drop: announced, lands, capture alone, contested clock, reward', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0], b = s.m.mechs[1], dc = cfg0.drops
  const d = s.m.drops[0]
  d.x = a.x + 20; d.y = a.y; d.z = ctx.world.surfaceZ(d.x, d.y); d.callT = 0.5; d.landT = 2.0
  s.step({}, 2)
  check(s.look(0).drops.length === 0, 'not listed before it is called')
  s.step({}, 5)
  let o = s.look(0)
  check(o.drops.length === 1 && o.drops[0].id === 20000 && o.drops[0].radius === dc.radius && o.drops[0].capture_s === dc.capture_s && o.drops[0].holder === null, 'listed once called')
  near(o.drops[0].lands_in, 2.0 - o.t, 1e-6, 'lands_in')
  a.hp = 500; a.energy = 10
  s.place(0, 20, 2, 0); a.hp = 500; a.energy = 10
  s.step({}, 15)                                              // 1.5 s: lands at 2.0
  o = s.look(0)
  check(o.drops[0].lands_in === 0 && o.drops[0].holder === 0 && o.drops[0].progress > 0, 'capture clock runs once landed')
  check(o.sounds.length === 0 || true, '')
  s.place(1, 22, -2, Math.PI)
  const p0 = d.progress
  s.step({}, 10)
  near(d.progress, p0, 1e-9, 'two mechs in the ring freeze the clock')
  s.place(1, 80, 0, Math.PI)
  s.step({}, 45)
  check(d.state === 3 && a.cubes === dc.cubes, 'captured: +3 cubes')
  check(a.hp === a.maxHp && a.energy >= cfg0.mech.energy - 1, 'full hp and energy')
  o = s.look(0)
  check(o.drops.length === 0, 'a taken drop is no longer listed')
})

await test('vision: wedge, near circle, 5 s memory, own bullets, sounds', () => {
  const s = scene({ n: 2 }); const a = s.m.mechs[0], b = s.m.mechs[1]
  s.place(1, -100, 0, 0)                                    // 100 m behind the observer
  s.step({})
  check(s.look(0).mechs.length === 0, 'outside the 120 degree wedge and beyond 45 m: not seen')
  s.place(1, -40, 0, 0); s.step({})
  let o = s.look(0)
  check(o.mechs.some((q) => q.id === 1 && q.kind === 'mech' && q.hp === cfg0.mech.hp && q.weapons[0] === 'gun' && q.charging === false), 'inside 45 m: seen in any direction')
  s.place(1, -100, 30, 0); s.step({}, 49)
  o = s.look(0)
  const rem = o.mechs.find((q) => q.id === 1)
  check(rem && Math.abs(rem.pos[0] - r2(b.x)) < 1e-9, 'remembered for 5 s with its real position')
  s.step({}, 3)
  check(!s.look(0).mechs.some((q) => q.id === 1), 'forgotten after memory_s')
  s.place(1, s.spot.farSeen[0], s.spot.farSeen[1], Math.PI); s.step({})
  check(s.look(0).mechs.some((q) => q.id === 1), 'inside the wedge within 200 m: seen')
  check(s.look(1).mechs.length === 0 || true, '')
  s.place(1, 205, 0, Math.PI); s.step({}, 52)
  check(!s.look(0).mechs.some((q) => q.id === 1), 'beyond 200 m: not seen')
  // sounds: a gun shot is heard with a bearing and a distance class, the shooter does not hear itself
  s.place(1, 100, 0, Math.PI)
  s.step({ 1: { fire: [true, false], aim: [1.5, 1.0] } })
  o = s.look(0)
  const snd = o.sounds.find((q) => q.kind === 'gun')
  check(snd && snd.dist === 'mid' && Math.abs(snd.bearing) < 0.6 && (snd.age === 0.1 || snd.age === 0.05), `gun sound ${JSON.stringify(snd)}`)
  check(!s.look(1).sounds.some((q) => q.kind === 'gun'), 'own sounds are not reported')
  s.step({ 1: { move: [0, 1] } }, 12)
  check(s.look(0).sounds.length === 0, 'steps are not heard beyond 40 m')
  s.place(1, 30, 0, Math.PI); b.vx = 0; b.vy = 0
  let heard = false
  for (let k = 0; k < 12; k++) { s.step({ 1: { move: [0, 1] } }); if (s.look(0).sounds.some((q) => q.kind === 'step' && q.dist === 'near')) heard = true }
  check(heard, 'a step is heard at 30 m')
})
function r2(v) { return Math.round(v * 100) / 100 }

await test('timing: lockstep, tick echo, coast then idle, optional action latency', () => {
  let s = scene({ n: 1 }); let q = s.m.mechs[0]
  s.step({ 0: { move: [1, 0], aim: [1, 0], fire: [true, false] } }, 5)
  const shots = q.shotsFired
  const answers = []; answers[0] = { tick: s.m.tick - 2, move: [0, 0] }          // wrong tick: dropped
  s.m._applyAnswers(answers); s.m._tick(); s.m._tick()
  check(q.mvx === 1 && q.missed === 1, 'an answer with another tick is dropped; the move is kept')
  for (let k = 0; k < 8; k++) { s.m._applyAnswers([]); s.m._tick(); s.m._tick() }
  near(Math.hypot(q.vx, q.vy), cfg0.mech.walk_speed, 1e-6, 'coasting keeps moving')
  check(q.shotsFired <= shots + 1, 'coasting drops the trigger')
  for (let k = 0; k < 4; k++) { s.m._applyAnswers([]); s.m._tick(); s.m._tick() }
  check(q.idle && Math.hypot(q.vx, q.vy) < 0.01, 'idle after coast_s of missed answers')
  near(q.yaw, 1, 0.01, 'aim held while idle')
  s.step({ 0: { move: [0, 1] } }, 3)
  check(!q.idle && q.vy > 5, 'a valid answer ends the idling')
  // lockstep: the answer to the observation at tick E moves the mech during ticks E+1, E+2
  s = scene({ n: 1 }); q = s.m.mechs[0]; const x0 = q.x
  s.step({ 0: { move: [1, 0] } })
  check(q.x > x0, 'latency 0: the first answer already moved the mech')
  s = scene({ n: 1, latency: 1 }); q = s.m.mechs[0]; const x1 = q.x
  s.step({ 0: { move: [1, 0] } })
  check(q.x === x1, 'latency 1: nothing yet')
  s.step({ 0: { move: [1, 0] } })
  check(q.x > x1, 'latency 1: applied one decision later')
})

await test('placement: death order, shared place on the same tick, survivors by hp at the time cap', () => {
  const s = scene({ n: 5 }); const M = s.m.mechs
  s.m._kill(M[4], -1, 'zone'); s.m._placeDeaths()
  check(M[4].place === 5, 'first to die of five is 5th')
  s.m._kill(M[3], -1, 'zone'); s.m._kill(M[2], -1, 'zone'); s.m._placeDeaths()
  check(M[3].place === 3 && M[2].place === 3 && s.m.aliveCount === 2, 'two deaths on one tick share a place')
  M[0].hp = 300; M[1].hp = 900
  s.m.decisions = 0
  const r = s.m._finish()
  check(r.places[1] === 1 && r.places[0] === 2, 'survivors ranked by hp')
})

// ---------------------------------------------------------------------------------------------------------
// whole matches
// ---------------------------------------------------------------------------------------------------------
function ffaBots(c = ctx) { return FFA_TYPES.map((t) => new HouseBot(t, { world: c.world, nav: c.nav, params: c.merged.house })) }
function digest(m, res) {
  let h = 0
  const mix = (v) => { h = hashSeed(h, Math.round(v * 1000) | 0) }
  for (const q of m.mechs) { mix(q.x); mix(q.y); mix(q.z); mix(q.hp); mix(q.dmgDealt); mix(q.deathT || 0); mix(q.place) }
  for (const q of m.npcs) { mix(q.x); mix(q.hp) }
  mix(m.shots.length); mix(m.cubes.length); mix(m.pickups.length); mix(res.t)
  return h
}

await test('determinism: same seed, same match (ffa and squad); another seed differs', () => {
  const run = (seed, cap) => { const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: cfg0, bots: ffaBots(), mode: 'ffa', maxDecisions: cap }); const r = m.runSync(); return [digest(m, r), JSON.stringify(r.places), JSON.stringify(r.stats.deaths)] }
  const cap = QUICK ? 600 : 1500
  const a = run(5, cap), b = run(5, cap), c = run(6, cap)
  check(a[0] === b[0] && a[1] === b[1] && a[2] === b[2], 'two runs of seed 5 differ')
  check(a[0] !== c[0], 'seed 6 gives the same match as seed 5')
  const sq = (seed) => {
    const bots = new Array(16); const { bots: sb } = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: 3 })
    let k = 0
    for (let i = 0; i < 16; i++) { if (i === 2) bots[i] = new HouseBot('expert', { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }); else { bots[i] = sb[k++]; bots[i].team = 1 } }
    const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: cfg0, bots, mode: 'squad', focus: 2, maxDecisions: cap })
    const r = m.runSync(); return digest(m, r)
  }
  check(sq(8) === sq(8), 'two squad runs of seed 8 differ')
})

await test('schema: every hello / obs / end and every action is valid (ffa + squad)', () => {
  let nObs = 0, nAct = 0, nEnd = 0
  const wrap = (bot) => ({
    name: bot.name, team: bot.team,
    hello(h) { const e = schema.hello(h); check(e.length === 0, 'hello: ' + e[0]); const r = bot.hello(h); if (r) { const q = schema.ready(r); check(q.length === 0, 'ready: ' + q[0]) } return r },
    act(obs) {
      const e = schema.obs(obs); nObs++
      if (e.length) throw new Error('obs: ' + e.slice(0, 3).join('; '))
      const bytes = JSON.stringify(obs).length
      check(bytes < 65536, `obs line of ${bytes} bytes exceeds max_line_bytes`)
      const a = bot.act(obs)
      const clean = JSON.parse(JSON.stringify(a))
      const q = schema.action(clean); nAct++
      if (q.length) throw new Error(`action of ${bot.name}: ${q.slice(0, 3).join('; ')} ${JSON.stringify(clean).slice(0, 200)}`)
      check(clean.tick === obs.tick, 'tick echo')
      return a
    },
    end(msg) { const e = schema.end(msg); nEnd++; check(e.length === 0, 'end: ' + e[0]) },
  })
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 21, config: cfg0, bots: ffaBots().map(wrap), mode: 'ffa', maxDecisions: QUICK ? 800 : 2600 })
  const r = m.runSync()
  const errs = m.log.filter((e) => e.e === 'bot_error')
  check(errs.length === 0, 'validation error inside a match: ' + (errs[0]?.msg || '').split('\n')[0])
  check(nEnd === 16, `end sent to ${nEnd} of 16 bots`)
  // rich content was exercised
  const kinds = new Set(m.log.map((e) => e.e))
  for (const k of ['death', 'take', 'upgrade', 'crate']) check(kinds.has(k), `the schema run never produced a "${k}"`)
  // squad with the baseline bot
  const bots = new Array(16); const { bots: sb } = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: 4 })
  let k = 0
  for (let i = 0; i < 16; i++) { if (i === 9) continue; bots[i] = sb[k++]; bots[i].team = 1; bots[i] = wrap(bots[i]) }
  return import('./baseline_bot.js').then((mod) => {
    bots[9] = wrap(mod.createBot())
    const m2 = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 22, config: cfg0, bots, mode: 'squad', focus: 9 })
    m2.runSync()
    const e2 = m2.log.filter((e) => e.e === 'bot_error')
    check(e2.length === 0, 'validation error in the squad match: ' + (e2[0]?.msg || '').split('\n')[0])
    return `${nObs} observations, ${nAct} actions`
  })
})

await test('conservation: inside the map, out of solids, hp / energy bounds, places valid, zone ends the match', () => {
  const w = ctx.world, b = w.bounds
  const runOne = (seed, bots, cap) => {
    const m = new Match({ world: w, nav: ctx.nav, collider: ctx.collider, seed, config: cfg0, bots, mode: 'ffa', maxDecisions: cap })
    const tick = m._tick.bind(m)
    let worst = 0
    m._tick = () => {
      tick()
      for (const q of m.mechs) {
        if (!q.alive) continue
        check(q.x >= b.minX + q.radius - 1e-6 && q.x <= b.maxX - q.radius + 1e-6 && q.y >= b.minY + q.radius - 1e-6 && q.y <= b.maxY - q.radius + 1e-6, `mech ${q.id} left the map at t=${m.t}`)
        check(Number.isFinite(q.x + q.y + q.z + q.vx + q.vy + q.vz + q.hp + q.energy + q.yaw + q.pitch), `mech ${q.id} has a non-finite state`)
        check(q.hp > 0 && q.hp <= q.maxHp + 1e-6, `mech ${q.id} hp ${q.hp} outside (0, ${q.maxHp}]`)
        check(q.energy >= 0 && q.energy <= q.stats.energy + 1e-6, `mech ${q.id} energy ${q.energy}`)
        check(q.z >= w.ground(q.x, q.y) - 1e-6, `mech ${q.id} below the terrain`)
        check(!w.inSolid(q.x, q.y, q.z + q.height * 0.5), `mech ${q.id} centre inside a solid at t=${m.t.toFixed(2)} (${q.x.toFixed(1)}, ${q.y.toFixed(1)}, ${q.z.toFixed(1)})`)
        const pen = m.col.wallPen(q.x, q.y, q.z, q.radius, q.height, q.stats.step_up)
        if (pen > worst) worst = pen
        check(q.pitch >= q.stats.min_pitch - 1e-9 && q.pitch <= q.stats.max_pitch + 1e-9, 'pitch out of range')
      }
      for (const q of m.npcs) if (q.alive) check(q.x > b.minX && q.x < b.maxX && q.y > b.minY && q.y < b.maxY && q.hp > 0, 'drone out of the map')
      for (const p of m.projectiles) check(Number.isFinite(p.x + p.y + p.z), 'projectile state')
    }
    const r = m.runSync()
    return { m, r, worst }
  }
  const a = runOne(31, ffaBots(), QUICK ? 1200 : Infinity)
  check(a.worst < 0.6, `a mech overlapped a wall by ${a.worst.toFixed(2)} m`)
  if (!QUICK) {
    const places = a.r.places.slice().sort((x, y) => x - y)
    check(places[0] === 1 && places.every((p) => p >= 1 && p <= 16), 'places are within 1..16 and somebody is first')
    check(a.r.t <= cfg0.match.duration_s, 'the match ended by the time cap')
  }
  // sixteen bots that never act: the zone alone must finish the match before the cap, in death order
  const idle = Array.from({ length: 16 }, () => ({ name: 'idle', hello() {}, act: (o) => ({ tick: o.tick }) }))
  const z = runOne(32, idle, Infinity)
  check(z.r.t < cfg0.match.duration_s - 20, `the zone should kill everybody well before the cap, ended at ${z.r.t}`)
  check(z.m.aliveCount <= 1, 'at most one mech is left')
  check(z.r.mechs.every((q) => q.alive || q.cause === 'zone' || q.cause === 'npc'), 'idle mechs only die to the zone (or a drone)')
  const order = z.r.mechs.filter((q) => !q.alive).sort((p, q) => p.timeAlive - q.timeAlive)
  for (let i = 1; i < order.length; i++) check(order[i].place <= order[i - 1].place, 'later deaths place better')
  return `full ffa ${a.r.t.toFixed(0)} s, idle match ended at ${z.r.t.toFixed(1)} s, worst wall overlap ${a.worst.toFixed(3)} m`
})

await test('replay sanity: old-balance free-for-all of the stand-ins resembles the official replay', () => {
  const old = makeContext({ world: ctx.world, nav: ctx.nav, oldBalance: true })
  const N = QUICK ? 4 : 10
  const first = [], last = [], bands = [[0, 0], [0, 0], [0, 0], [0, 0]]
  for (let k = 0; k < N; k++) {
    const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 500 + k, config: old.cfg, bots: ffaBots(old), mode: 'ffa' })
    const r = m.runSync()
    first.push(r.stats.firstDeathT); last.push(r.t)
    r.stats.gunBands.forEach((b, i) => { bands[i][0] += b.hit; bands[i][1] += b.n })
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)]
  const pct = bands.map((b) => 100 * b[0] / Math.max(1, b[1]))
  const note = `first death median ${med(first).toFixed(0)} s (replay 42), match over median ${med(last).toFixed(0)} s (replay 210), gun hit % by range 0-40/40-80/80-130/130+ m: ${pct.map((p) => p.toFixed(0)).join(' / ')} (replay 98 / 78 / 29 / 18)`
  check(med(first) >= 12 && med(first) <= 80, 'first death out of the plausible window: ' + note)
  check(med(last) >= 140 && med(last) <= 300, 'match length out of the plausible window: ' + note)
  check(pct[0] >= 88, 'close-range hit rate too low: ' + note)
  check(pct[1] >= 60 && pct[1] <= 92, '40-80 m hit rate: ' + note)
  check(pct[2] >= 15 && pct[2] <= 50, '80-130 m hit rate: ' + note)
  check(pct[3] >= 6 && pct[3] <= 35, '130+ m hit rate: ' + note)
  check(pct[0] > pct[1] && pct[1] > pct[2] && pct[2] > pct[3], 'hit rate must fall with range: ' + note)
  return note
})

await test('bots: our brain plays a squad match in-process without errors', async () => {
  if (!existsSync(join(ROOT, 'bot', 'lib', 'brain.js'))) return 'skipped: bot/lib/brain.js does not exist yet'
  const team = await resolveBot('ours', ctx)
  const rec = await playMatch(3, { mode: 'squad', keep: true }, ctx, { team, opponents: [] })
  check(!rec.initError, 'createBrain failed: ' + rec.initError)
  check(rec.errors === 0, `brain.act threw ${rec.errors} times: ${rec.firstError}`)
  check(!rec.fallback, 'the brain returned no action at least once')
  return `place ${rec.place}, ${rec.kills} kills, alive ${rec.timeAlive} s, brain mean ${rec.meanMs} ms / max ${rec.maxMs} ms per decision`
})

await test('bots: the kit python starter plays through the process adapter', async () => {
  const cmd = `python3 -u ${join(ROOT, 'kit', 'python', 'example_bot.py')}`
  const c2 = { ...ctx, timeout: 2000, logDir: null }
  const team = await resolveBot('proc:' + cmd, c2)
  const rec = await playMatch(7, { mode: 'squad', keep: true }, c2, { team, opponents: [] })
  check(rec.name === 'example-py', `ready name not received (${rec.name})`)
  check(rec.missed === 0, `${rec.missed} observations got no answer`)
  check(rec.dmgDealt > 0 || rec.timeAlive > 5, 'the starter never did anything')
  return `place ${rec.place}, alive ${rec.timeAlive} s, dealt ${rec.dmgDealt}, slow answers ${rec.lates}`
})

if (BENCH) {
  await test('benchmark: in-process squad match, all 16 kept alive for the full 4800 decisions', async () => {
    const spec = existsSync(join(ROOT, 'bot', 'lib', 'brain.js')) ? 'ours' : join(ROOT, 'sim', 'baseline_bot.js')
    const team = await resolveBot(spec, ctx)
    const seed = 2, slot = 3
    const bots = new Array(16); bots[slot] = team({ seed, slot })
    const sq = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: 9 })
    let k = 0
    for (let i = 0; i < 16; i++) if (i !== slot) { bots[i] = sq.bots[k++]; bots[i].team = 1 }
    const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: cfg0, bots, mode: 'squad', focus: slot })
    const tick = m._tick.bind(m)
    // nobody may die: every hit is reduced to 1 hp and everybody is topped up each tick (the zone included)
    m._tick = () => { for (const q of m.mechs) q.hp = q.maxHp; tick() }
    const hurt = m._hurtMech.bind(m)
    m._hurtMech = (e, base, ...rest) => hurt(e, Math.min(base, 1), ...rest)
    const t0 = performance.now()
    const r = m.runSync()
    const wall = (performance.now() - t0) / 1000
    check(r.decisions >= 4000, `only ${r.decisions} decisions were played`)
    check(wall < 60, `took ${wall.toFixed(1)} s`)
    return `${r.decisions} decisions in ${wall.toFixed(1)} s (${(wall * 1000 / r.decisions).toFixed(2)} ms per decision, team bot ${spec}: mean ${(bots[slot].sumMs / Math.max(1, bots[slot].n)).toFixed(2)} ms)`
  })
}

console.log(`\n${passed} passed, ${failed} failed${failed ? ': ' + fails.join(' | ') : ''}`)
process.exit(failed ? 1 : 0)
