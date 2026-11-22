import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const base = `${root}/handoff/.cache/ws/variants7/P26_all/bot`
const geom = `${root}/experiments/mech-geometry/bot`
const capture = `${root}/experiments/mech-capture/bot`
const load = (p) => import(pathToFileURL(p).href)
const { createBrain } = await load(`${base}/lib/brain.js`)
const { sense } = await load(`${base}/lib/senses.js`)
const { MODE } = await load(`${base}/lib/params.js`)
const { makeFireControl: fire0 } = await load(`${base}/lib/firecontrol.js`)
const { makeFireControl: fire1 } = await load(`${geom}/lib/firecontrol.js`)
const { makeProf: prof0 } = await load(`${base}/lib/prof.js`)
const { makeProf: prof1 } = await load(`${capture}/lib/prof.js`)
const stream = gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
const hello = stream.find((x) => x.type === 'hello')

function state(weapons) {
  const B = createBrain(hello, { world: null, nav: null }, { warmup: false })._B
  sense(B, { type: 'obs', tick: 2000, t: 100, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1000, max_hp: 1400,
      energy: 100, max_energy: 100, grounded: true, cubes: 0, in_zone: true, weapons, stats: hello.config.mech },
    mechs: [], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [], pickups: [], drops: [] })
  B.P.aimCalOn = false
  B.p26on = true
  B.tick = 1000
  B.holdFire = false
  B.p26 = { gunTgt: -1 }
  return B
}

function target(x = 100, z = 0) {
  return { id: 1, x, y: 0, z, vx: 0, vy: 0, vz: 0, height: 9, radius: 2.5, hp: 1400, maxHp: 1400,
    npc: false, listed: true, phantom: false, lastSeen: 100, steadySince: 0, revs: 0, revT: [0, 0, 0, 0], airborne: false,
    airT0: -99, dist: Math.hypot(x, z), bearing: 0, losOut: true, losIn: true, losOutT: 100,
    hasMortar: false, rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, lastDmgInT: -99, conf: 1 }
}

function fireCase(factory, opts = {}) {
  const weapons = opts.laser ? [null, { kind: 'laser', cooldown: 0, charge: 0.75, stats: hello.config.weapons.laser }]
    : [{ kind: 'gun', cooldown: 0, reload: 0, ammo: 12, stats: hello.config.weapons.gun }, null]
  const B = state(weapons), tr = target(opts.x, opts.z)
  B.target = tr
  B.trackList = [tr]
  B.p26on = opts.profile !== false
  if (opts.env !== undefined) B.env = opts.env
  if (opts.foreignDeaths !== undefined) B.foreignDeaths = opts.foreignDeaths
  B.prof = { rungs: [0.85, 0.68, 0.30, 0.12], fireTarget: () => tr, laserVeto: () => false,
    crateShot: () => null, wantReload: () => false, isLegal: () => true }
  B.world = { shotClear: (ax, ay, az, bx) => opts.wall === undefined || !(ax <= opts.wall && bx >= opts.wall) }
  if (opts.maxPitch !== undefined) { B.me.maxPitch = opts.maxPitch; B.me.pitch = opts.maxPitch }
  if (opts.laser) B.out.fire[1] = true
  factory(B).run()
  return { fire: [...B.out.fire], aim: [...B.out.aim], laserShots: B.counters.laserShots, aimKind: B.aimKind }
}

const results = []
function check(name, fn) { const detail = fn(); results.push({ name, passed: true, ...detail }) }

check('gun_clear_path_preserved', () => {
  const a = fireCase(fire0), b = fireCase(fire1)
  assert.equal(a.fire[0], true); assert.deepEqual(a, b)
  return { baseline: a, candidate: b }
})
check('gun_wall_beyond_barrel_rejected', () => {
  const a = fireCase(fire0, { wall: 20 }), b = fireCase(fire1, { wall: 20 })
  assert.equal(a.fire[0], false); assert.equal(b.fire[0], false)
  return { baseline: a, candidate: b }
})
check('gun_wall_inside_barrel_rejected', () => {
  const a = fireCase(fire0, { wall: 2 }), b = fireCase(fire1, { wall: 2 })
  assert.equal(a.fire[0], true); assert.equal(b.fire[0], false)
  return { baseline: a, candidate: b }
})
check('geometry_inert_when_profile_disabled', () => {
  const a = fireCase(fire0, { wall: 2, profile: false }), b = fireCase(fire1, { wall: 2, profile: false })
  assert.deepEqual(a, b)
  return { baseline: a, candidate: b }
})
for (const transition of [{ env: 'FFA' }, { foreignDeaths: 1 }]) {
  for (const probe of [{ wall: 2 }, { laser: true, x: 30, z: 30, maxPitch: 0.2 }, { laser: true, x: 274.7, z: 15 }]) {
    check(`geometry_inert_on_stale_profile_${JSON.stringify({ transition, probe })}`, () => {
      const opts = { ...transition, ...probe }
      const a = fireCase(fire0, opts), b = fireCase(fire1, opts)
      assert.deepEqual(a, b)
      return { baseline: a, candidate: b }
    })
  }
}
check('laser_unreachable_elevation_held', () => {
  const a = fireCase(fire0, { laser: true, x: 30, z: 30, maxPitch: 0.2 })
  const b = fireCase(fire1, { laser: true, x: 30, z: 30, maxPitch: 0.2 })
  assert.equal(a.laserShots, 1); assert.equal(b.laserShots, 0); assert.equal(b.fire[1], true)
  return { baseline: a, candidate: b }
})
check('laser_reachable_lower_rung_selected', () => {
  const b = fireCase(fire1, { laser: true, x: 30, z: 10, maxPitch: 0.2 })
  assert.equal(b.laserShots, 1)
  assert.ok(Math.abs(b.aim[1] - Math.atan2(10 + 9 * 0.30 - 7, 30)) < 1e-8)
  return { candidate: b }
})
check('laser_lower_rung_enters_range', () => {
  const a = fireCase(fire0, { laser: true, x: 274.7, z: 15 })
  const b = fireCase(fire1, { laser: true, x: 274.7, z: 15 })
  assert.equal(a.laserShots, 0); assert.equal(b.laserShots, 1)
  return { baseline: a, candidate: b }
})
check('laser_clear_center_preserved', () => {
  const a = fireCase(fire0, { laser: true }), b = fireCase(fire1, { laser: true })
  assert.deepEqual(a, b)
  return { baseline: a, candidate: b }
})

function dropState(factory, opts = {}) {
  const B = state([{ kind: 'gun', cooldown: 0, reload: 0, ammo: 12, stats: hello.config.weapons.gun }, null])
  const mover = { isAbandoned: () => false }
  const econ = { pathEst: (x, y) => Math.hypot(x - B.me.x, y - B.me.y), reachable: () => true, wantPickup: () => null }
  const pr = factory(B, mover, econ, {})
  B.prof = pr
  pr.S.phase = 'open'
  B.drops = [{ id: 20000, x: 120, y: 0, radius: 8, landsIn: 0, captureS: 4, progress: 3.5, holder: 1 }]
  const holder = { ...target(120), vx: 0, vy: 0, id: 1 }
  B.trackList = [holder]
  B.tracks.set(1, holder)
  if (opts.full) { B.me.hp = 1400; B.me.hpf = 1 }
  if (opts.near) B.me.x = 114
  if (opts.unheld) { B.drops[0].holder = -1; B.drops[0].progress = 0; B.trackList = []; B.tracks.clear() }
  if (opts.contested) B.trackList.push({ ...target(122), id: 2 })
  if (opts.own) { B.me.x = 120; B.drops[0].holder = 0; B.trackList = []; B.tracks.clear() }
  if (opts.own && opts.contested) { const tr = { ...target(122), id: 2 }; B.trackList.push(tr); B.tracks.set(tr.id, tr) }
  if (opts.finishing) { B.target = target(60); pr.S.finishing = true }
  pr.econ()
  pr.decideMode()
  return { B, pr, task: B.dropTask, loot: B.loot, mode: B.mode }
}
check('stationary_holder_finishes_before_arrival', () => {
  const a = dropState(prof0), b = dropState(prof1)
  assert.ok(a.task); assert.equal(b.task, null); assert.notEqual(b.loot?.type, 'drop')
  return { baselineMode: a.mode, candidateMode: b.mode }
})
check('capture_clock_frozen_by_two_mechs', () => {
  const b = dropState(prof1, { contested: true })
  assert.ok(b.task)
  return { candidateMode: b.mode }
})
check('nearby_ring_still_contested', () => {
  const b = dropState(prof1, { near: true })
  assert.ok(b.task)
  return { candidateMode: b.mode }
})
check('unheld_drop_still_pursued', () => {
  const b = dropState(prof1, { unheld: true })
  assert.ok(b.task)
  return { candidateMode: b.mode }
})
check('own_capture_preserved_at_full_health', () => {
  const a = dropState(prof0, { own: true, full: true }), b = dropState(prof1, { own: true, full: true })
  assert.equal(a.task, null); assert.equal(b.task?.ours, true); assert.equal(b.mode, MODE.DROP)
  return { baselineMode: a.mode, candidateMode: b.mode }
})
check('near_finish_precedes_remote_drop', () => {
  const a = dropState(prof0, { unheld: true, finishing: true }), b = dropState(prof1, { unheld: true, finishing: true })
  assert.equal(a.mode, MODE.DROP); assert.equal(b.mode, MODE.FIGHT)
  return { baselineMode: a.mode, candidateMode: b.mode }
})
check('own_capture_not_abandoned_for_finish', () => {
  const b = dropState(prof1, { own: true, finishing: true })
  assert.equal(b.mode, MODE.DROP)
  return { candidateMode: b.mode }
})
check('owned_contested_capture_allows_finish', () => {
  const b = dropState(prof1, { own: true, contested: true, finishing: true })
  assert.equal(b.task?.owned, true); assert.equal(b.task?.ours, false)
  assert.equal(b.task?.contested, true); assert.equal(b.task?.completion, Infinity)
  assert.equal(b.mode, MODE.FIGHT)
  return { candidateMode: b.mode, progressRetained: b.task.progress, owned: b.task.owned, contested: b.task.contested }
})
check('owned_capture_contest_leaves_and_reenters', () => {
  const { B, pr } = dropState(prof1, { own: true, contested: true, finishing: true })
  const enemy = B.trackList[0]
  B.drops[0].progress = 3.8
  enemy.x = 140
  pr.econ(); pr.decideMode()
  assert.equal(B.dropTask.ours, true); assert.equal(B.dropTask.contested, false)
  assert.ok(Math.abs(B.dropTask.completion - 0.2) < 1e-9)
  assert.equal(B.mode, MODE.DROP)
  enemy.x = 122
  pr.econ(); pr.decideMode()
  assert.equal(B.dropTask.owned, true); assert.equal(B.dropTask.ours, false)
  assert.equal(B.dropTask.progress, 3.8); assert.equal(B.dropTask.completion, Infinity)
  assert.equal(B.mode, MODE.FIGHT)
  return { progressRetained: B.dropTask.progress, finalMode: B.mode }
})

const report = { purpose: 'Crafted decision regressions; no match ranking or calibrated score prediction.', passed: results.length, failed: 0, results }
writeFileSync(`${root}/panel/mech/decision-cases.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ passed: report.passed, failed: 0 }))
