import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root = '/workspace/scratch/bde29dc281e6'
const trees = { baseline: `${root}/experiments/mech-capture/bot`, ready: `${root}/experiments/mech-cycle-ready/bot`, varied: `${root}/experiments/mech-cycle-varied/bot` }
const mods = {}
for (const [k, p] of Object.entries(trees)) mods[k] = await import(pathToFileURL(`${p}/lib/brain.js`).href)
const { World } = await import(pathToFileURL(`${trees.baseline}/lib/world.js`).href)
const { Nav } = await import(pathToFileURL(`${trees.baseline}/lib/nav.js`).href)
const stream = gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
const hello = stream.find((x) => x.type === 'hello')
const observations = stream.filter((x) => x.type === 'obs')
const clone = (x) => structuredClone(x)
const digest = (xs) => createHash('sha256').update(JSON.stringify(xs)).digest('hex')
const valid = (a) => a && Array.isArray(a.move) && a.move.length === 2 && a.move.every(Number.isFinite) && Math.hypot(...a.move) <= 1.000001 &&
  Array.isArray(a.aim) && a.aim.length === 2 && a.aim.every(Number.isFinite) && Array.isArray(a.fire) && a.fire.length === 2 &&
  a.fire.every((x) => typeof x === 'boolean') && typeof a.boost === 'boolean' &&
  (!('pick' in a) || Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2) &&
  (!('take' in a) || Number.isInteger(a.take) && a.take >= 0) && (!('drop' in a) || a.drop === 0 || a.drop === 1)

function replay(key, h, ctx, obs, overrides = {}) {
  const br = mods[key].createBrain(h, ctx, { warmup: false, fuseMs: 1e8, ...overrides })
  const actions = []
  let invalid = 0
  for (const o of obs) {
    const a = br.act(clone(o), Infinity)
    if (!valid(a)) invalid++
    actions.push(a)
  }
  return { digest: digest(actions), actions, invalid, errors: br.debugState().counters.errors, fuse: br.debugState().counters.fuse }
}

const equality = []
for (let slot = 0; slot < 16; slot++) {
  const h = { ...hello, slot, seed: (hello.seed ^ Math.imul(slot + 1, 0x45d9f3b)) >>> 0 }
  const a = replay('baseline', h, { world: null, nav: null }, observations, { env: 'ffa', weaponCycle: false })
  assert.equal(a.invalid, 0); assert.equal(a.errors, 0)
  for (const key of ['ready', 'varied']) {
    const b = replay(key, h, { world: null, nav: null }, observations, { env: 'ffa', weaponCycle: false })
    assert.equal(b.invalid, 0); assert.equal(b.errors, 0); assert.equal(b.digest, a.digest)
    equality.push({ slot, candidate: key, decisions: observations.length, identical: true, sha256: b.digest, map: false })
  }
}

const world = World.loadSync(`${root}/handoff/.cache/ws/mechbot/kit/arena`)
let reference
for (const key of ['baseline', 'ready', 'varied']) {
  const nav = new Nav(world, { cell: 2, stepUp: hello.config.mech.step_up, maxSlopeDeg: hello.config.mech.max_slope_deg })
  const r = replay(key, hello, { world, nav }, observations, { env: 'ffa', weaponCycle: false })
  assert.equal(r.invalid, 0); assert.equal(r.errors, 0)
  if (key === 'baseline') reference = r.digest
  else { assert.equal(r.digest, reference); equality.push({ slot: hello.slot, candidate: key, decisions: observations.length, identical: true, sha256: r.digest, map: true }) }
}

const synthetic = observations.map((o, i) => {
  const x = clone(o)
  x.t = i * 0.1 + 75; x.tick = i * 2 + 1500; x.alive = i % 17 === 0 ? 2 : 16
  x.events = []
  x.self.energy = i % 5 === 0 ? 0 : i % 5 === 1 ? 0.5 : i % 5 === 2 ? 2 : 100
  x.self.hp = i % 7 === 0 ? 1 : i % 7 === 1 ? 1399 : 900
  x.self.in_zone = i % 3 !== 0
  x.self.grounded = i % 9 !== 0
  x.self.vel = i % 9 === 0 ? [0, 0, -10] : [0, 0, 0]
  if (i % 11 === 0) x.self.stats = { walk_speed: 0, boost_speed: NaN, radius: -1, height: Infinity, turn_rate: 0 }
  if (i % 13 === 0) x.self.weapons = [{ kind: 'gun', ammo: 0, reload: 2.4 }, { kind: 'laser', charge: 0.74, cooldown: 0 }]
  if (i % 19 === 0) x.self.weapons = [null, { kind: 'lightning', cooldown: 0, stats: { energy: 3, range: 45 } }]
  if (i % 23 === 0) x.mechs = [null, {}, { id: 1, kind: 'mech', pos: [NaN, 0, 0], hp: Infinity }]
  if (i % 29 === 0) x.projectiles = [null, { id: 1, kind: 'mortar', pos: [0, 0, 100], vel: [1, 0, -30] }]
  x.drops = [{ id: 20000, pos: [x.self.pos[0] + (i % 4 ? 60 : 2), x.self.pos[1], x.self.pos[2]], radius: 8,
    lands_in: i % 6, capture_s: 4, progress: i % 5, holder: i % 4 === 0 ? x.self.id : i % 4 === 1 ? 1 : null }]
  x.zone = { center: [x.self.pos[0], x.self.pos[1]], radius: i % 10 ? 300 : 2,
    next_center: [x.self.pos[0] + 20, x.self.pos[1]], next_radius: i % 10 ? 200 : 0,
    shrink_start: x.t, shrink_end: x.t + 5, dps: i % 10 ? 20 : 260 }
  if (i % 31 === 0) x.offer = { id: 1, choices: [null, { id: 'plating' }, { id: 'gun_damage' }] }
  return x
})

const stress = []
const configs = { live: hello.config, empty: {}, missing: undefined,
  malformed: { mech: { walk_speed: 0, boost_speed: NaN, energy: null }, weapons: { gun: null, laser: { damage: Infinity } }, cubes: null, match: { tick_hz: NaN } } }
for (const key of Object.keys(trees)) for (const [label, config] of Object.entries(configs)) for (const env of ['squad', 'ffa']) {
  const r = replay(key, { ...hello, config }, { world: null, nav: null }, synthetic, { env })
  assert.equal(r.invalid, 0); assert.equal(r.errors, 0); assert.equal(r.fuse, 0)
  stress.push({ candidate: key, config: label, env, decisions: synthetic.length, invalid: r.invalid, errors: r.errors, fuse: r.fuse, sha256: r.digest })
}

const report = { purpose: 'Feature-disabled capture action identity; enabled all-mode malformed/low-energy/zone stress. No match scoring.',
  determinism_note: 'Warmup disabled and time fuse disabled only for action equivalence; performance is measured separately with normal settings and the actual bundle.',
  equality, stress, equal_decisions_per_candidate: observations.length * 17, stress_decisions_per_build: synthetic.length * 8 }
writeFileSync(`${root}/panel/mech/weapon-replay-stress.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ equality_runs: equality.length, stress_runs: stress.length, equal_decisions_per_candidate: report.equal_decisions_per_candidate, stress_decisions_per_build: report.stress_decisions_per_build }))
