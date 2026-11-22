import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const base = `${root}/experiments/mech-geometry/bot`
const candidate = `${root}/experiments/mech-mortar-arc/bot`
const load = (p) => import(pathToFileURL(p).href)
const { mortarArcClear, mortarSelfClear } = await load(`${candidate}/lib/mortar.js`)
const { mortarSolve } = await load(`${base}/lib/aim.js`)
const { makeFireControl: fire0 } = await load(`${base}/lib/firecontrol.js`)
const { makeFireControl: fire1 } = await load(`${candidate}/lib/firecontrol.js`)
const { createBrain } = await load(`${base}/lib/brain.js`)
const { sense } = await load(`${base}/lib/senses.js`)
const hello = JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n', 1)[0])
const results = []
function check(name, run) { const detail = run() || {}; results.push({ name, passed: true, ...detail }) }
const plane = (x, low = -10000, high = 10000) => ({ shotClear(ax, ay, az, bx, by, bz) {
  if ((ax < x && bx < x) || (ax > x && bx > x)) return true
  if (Math.abs(bx - ax) < 1e-12) return !(ax === x && Math.max(az, bz) >= low && Math.min(az, bz) <= high)
  const t = (x - ax) / (bx - ax), z = az + t * (bz - az)
  return t < 0 || t > 1 || z < low || z > high
} })
const clear = { shotClear: () => true }
const arc = (world, pitch = 0.7, flight = 1, ttl = 7, gravity = 22, speed = 72, offset = 3) =>
  mortarArcClear(world, 0, 0, 100, 0, pitch, speed, gravity, offset, flight, ttl)

check('single_parametric_clock_at_steep_pitch', () => {
  const pitch = 1.15, speed = 72, gravity = 22, offset = 3, flight = 1.2, z0 = 100
  const calls = []
  assert.equal(arc({ shotClear: (...p) => { calls.push(p); return true } }, pitch, flight), true)
  const ox = offset * Math.cos(pitch), oz = z0 + offset * Math.sin(pitch), vx = speed * Math.cos(pitch), vz = speed * Math.sin(pitch)
  assert.deepEqual(calls[0], [0, 0, z0, ox, 0, oz])
  for (const p of calls.slice(1)) {
    const t = (p[3] - ox) / vx
    assert.ok(Math.abs(p[5] - (oz + vz * t - 0.5 * gravity * t * t)) < 1e-9)
    const t0 = (p[0] - ox) / vx, dt = t - t0
    assert.ok(dt <= 0.15 + 1e-10)
    assert.ok(gravity * dt * dt / 8 <= 0.08 + 1e-10)
    assert.ok(Math.hypot(p[3] - p[0], p[4] - p[1], p[5] - p[2]) <= 12 + 1e-9)
  }
  const a = 12, legacyDrop = 0.5 * gravity * (a / (speed * Math.cos(pitch))) ** 2
  const consistentDrop = 0.5 * gravity * (a / speed) ** 2
  assert.ok(legacyDrop > consistentDrop * 5)
  return { ray_calls: calls.length, old_drop_m: legacyDrop, consistent_drop_m: consistentDrop }
})
check('barrel_prefix_obstruction', () => { assert.equal(arc(plane(1)), false) })
check('obstruction_beyond_legacy_near_segment', () => { assert.equal(arc(plane(30)), false) })
check('clear_above_low_obstacle', () => { assert.equal(arc(plane(30, 0, 95)), true) })
check('overhead_obstruction', () => { assert.equal(arc(plane(30, 110, 160)), false) })
check('arbitrary_yaw_preserves_parametric_path', () => {
  const calls = [], yaw = 2.3, pitch = 0.4, off = 3, speed = 72, flight = 1
  assert.equal(mortarArcClear({ shotClear: (...p) => { calls.push(p); return true } }, 7, -8, 100, yaw, pitch, speed, 22, off, flight, 7), true)
  const last = calls.at(-1), t = flight - 1e-6, travel = (off + speed * t) * Math.cos(pitch)
  assert.ok(Math.abs(last[3] - (7 + travel * Math.cos(yaw))) < 1e-9)
  assert.ok(Math.abs(last[4] - (-8 + travel * Math.sin(yaw))) < 1e-9)
})
check('default_solved_ground_impact_remains_clear', () => {
  const m = mortarSolve(0, 0, 9.5, 100, 0, 0, 0, 0, 72, 22, 3)
  assert.ok(m)
  const world = { shotClear: (ax, ay, az, bx, by, bz) => Math.min(az, bz) >= 0 }
  assert.equal(mortarArcClear(world, 0, 0, 9.5, m.yaw, m.pitch, 72, 22, 3, m.t, 7), true)
  return { flight_s: m.t, pitch: m.pitch }
})
check('ttl_boundary', () => {
  assert.equal(arc(clear, 0.7, 1, 1), true)
  assert.equal(arc(clear, 0.7, 1 + 1e-8, 1), false)
})
check('bounded_budget_rejects_excessive_path', () => {
  let calls = 0
  assert.equal(arc({ shotClear: () => { calls++; return true } }, 0.7, 7, 7, 1000), false)
  assert.equal(calls, 0)
})
check('upgraded_default_ttl_path_fits_budget', () => {
  let calls = 0
  assert.equal(mortarArcClear({ shotClear: () => { calls++; return true } }, 0, 0, 1000, 0, 1.3, 72 * 1.2 * 1.2, 22, 3, 7, 7), true)
  assert.ok(calls <= 65)
  return { ray_calls: calls }
})
check('finite_and_positive_input_guards', () => {
  const good = [0, 0, 100, 0, 0.7, 72, 22, 3, 1, 7]
  for (let k = 0; k < good.length; k++) {
    for (const v of [NaN, Infinity, -Infinity]) {
      const a = [...good]; a[k] = v
      assert.equal(mortarArcClear(clear, ...a), false)
    }
  }
  for (const k of [5, 6, 8, 9]) { const a = [...good]; a[k] = 0; assert.equal(mortarArcClear(clear, ...a), false) }
  const a = [...good]; a[7] = -1; assert.equal(mortarArcClear(clear, ...a), false)
  assert.equal(mortarArcClear(null, ...good), true)
})
check('self_blast_includes_body_and_strict_boundary', () => {
  assert.equal(mortarSelfClear(0, 0, 0, 0, 17.5, 0, 1, 7, 2.5, 8), false)
  assert.equal(mortarSelfClear(0, 0, 0, 0, 17.500001, 0, 1, 7, 2.5, 8), true)
  assert.equal(mortarSelfClear(0, 0, 0, 0, 24, 0, 1, 7, 10, 8), false)
})
check('self_velocity_projection_detects_approach', () => {
  assert.equal(mortarSelfClear(0, 0, 10, 0, 30, 0, 3, 7, 2.5, 8), false)
  assert.equal(mortarSelfClear(0, 0, -10, 0, 30, 0, 3, 7, 2.5, 8), true)
})
check('self_invalid_inputs_fail_closed', () => {
  assert.equal(mortarSelfClear(0, 0, NaN, 0, 30, 0, 3, 7, 2.5, 8), false)
  assert.equal(mortarSelfClear(0, 0, 0, 0, 30, 0, -1, 7, 2.5, 8), false)
})

function state(mortar, opts = {}) {
  const B = createBrain(hello, { world: null, nav: null }, { warmup: false })._B
  const weapons = mortar ? [{ kind: 'gun', cooldown: 0, ammo: 0, reload: 2, stats: hello.config.weapons.gun }, { kind: 'mortar', cooldown: 0, stats: hello.config.weapons.mortar }] : [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: hello.config.weapons.gun }, null]
  sense(B, { type: 'obs', tick: 2000, t: 100, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1000, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, in_zone: true, weapons, stats: hello.config.mech },
    mechs: [], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [], pickups: [], drops: [] })
  B.P.aimCalOn = false; B.p26on = true; B.tick = 1000; B.holdFire = false; B.p26 = { gunTgt: -1 }
  const x = opts.x ?? 60, z = opts.z ?? 0
  const tr = { id: 1, x, y: 0, z, vx: 0, vy: 0, vz: 0, height: 9, radius: 2.5, hp: 1400, maxHp: 1400,
    npc: false, listed: true, phantom: false, lastSeen: 100, steadySince: 0, revs: 0, revT: [0, 0, 0, 0], airborne: false, airT0: -99,
    dist: Math.hypot(x, z), bearing: 0, losOut: true, losIn: true, losOutT: 100, hasMortar: false, rearOn: false, hasGun: true, hasLaser: false,
    hasLightning: false, lastDmgInT: -99, conf: 1 }
  B.target = tr; B.trackList = [tr]
  B.prof = { rungs: [0.85, 0.68, 0.30, 0.12], fireTarget: () => tr, laserVeto: () => false, crateShot: () => null, wantReload: () => false, isLegal: () => true }
  B.world = opts.world ?? clear
  if (mortar) { const m = mortarSolve(0, 0, 9.5, x, 0, z, 0, 0, 72, 22, 3); assert.ok(m); B.me.yaw = m.yaw; B.me.pitch = Math.max(B.me.minPitch, Math.min(B.me.maxPitch, m.pitch)) }
  return B
}
function fireCase(factory, mortar = true, opts = {}) {
  const B = state(mortar, opts); factory(B).run()
  return { fire: [...B.out.fire], aim: [...B.out.aim], aimKind: B.aimKind }
}
check('integrated_clear_mortar_fire_preserved', () => {
  const a = fireCase(fire0), b = fireCase(fire1)
  assert.equal(a.fire[1], true); assert.equal(b.fire[1], true)
  assert.ok(Math.abs(a.aim[1] - b.aim[1]) < 1e-9)
  return { baseline: a, candidate: b }
})
check('integrated_far_wall_blocks_previously_allowed_shot', () => {
  const a = fireCase(fire0, true, { world: plane(30) }), b = fireCase(fire1, true, { world: plane(30) })
  assert.equal(a.fire[1], true); assert.equal(b.fire[1], false)
  return { baseline: a, candidate: b }
})
check('integrated_raw_pitch_below_limit_not_owned_by_mortar', () => {
  const b = fireCase(fire1, true, { x: 30, z: -100 })
  assert.equal(b.fire[1], false); assert.notEqual(b.aimKind, 'mortar')
  return { candidate: b }
})
check('no_mortar_action_identity', () => {
  assert.deepEqual(fireCase(fire0, false), fireCase(fire1, false))
})

writeFileSync(`${root}/panel/mech/mortar-arc-cases.json`, JSON.stringify({ candidate, kind: 'bounded deterministic module and fire-control cases, no engine parity or ranking claim', count: results.length, passed: results.length, results }, null, 2) + '\n')
console.log(JSON.stringify({ count: results.length, passed: results.length }))
