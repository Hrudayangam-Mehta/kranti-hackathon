// A decision-unit counterexample, not a map-valid reactive game simulation.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createBrain } from '../../experiments/mech-adaptive/bot/lib/brain.js'
const root = '/workspace/scratch/bde29dc281e6'
const hello = JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n')[0])
const sourceHash = () => createHash('sha256').update(readFileSync(`${root}/experiments/mech-adaptive/bot/lib/prof.js`)).digest('hex')
const pin = sourceHash()
function observation(t) {
  return { type: 'obs', tick: Math.round(t * 20), t, alive: 16,
    self: { id: hello.slot, pos: [0,0,0], vel: [0,0,0], aim: [0,0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100,
      grounded: true, cubes: 0, upgrades: [], in_zone: true, stats: hello.config.mech,
      weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: hello.config.weapons.gun }, { kind: 'lightning', cooldown: 0, stats: hello.config.weapons.lightning }] },
    mechs: [{ id: 1, kind: 'mech', pos: [200,0,0], vel: [0,0,0], aim: [Math.PI,0], hp: 500, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }],
    projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [], offer: null,
    zone: { center: [0,0], radius: 500, next_center: [0,0], next_radius: 300, shrink_start: 150, shrink_end: 200, dps: 20 } }
}
function run(ranges) {
  const b = createBrain(hello, { world: null, nav: null }, { warmup: false, prof: 'p26', env: 'squad', fuseMs: 1e6, ...(ranges ? { pfRanges: ranges } : {}) })
  let action
  for (let i = 0; i <= 8; i++) action = b.act(observation(100 + i * 0.1), performance.now() + 1e6)
  const B = b._B, S = B.prof.S
  assert.equal(B.counters.errors, 0)
  return { ranges: B.P.pfRanges, mode: B.mode, chosen: S.hold, fight: S.fight, reason: S.reason, margin: S.margin,
    approach: S.approachS, completion: S.ttk, incoming: S.incoming, ready: S.ready, finishing: S.finishing, action }
}
const original = run(), existingAlternative = run([130])
assert.equal(original.fight, false)
assert.equal(existingAlternative.fight, true)
assert.ok(original.ranges.includes(existingAlternative.chosen))
assert.equal(sourceHash(), pin)
const result = { utc: new Date().toISOString(), profSha256: pin,
  scope: 'Flat-space source-unit observations with no map. Demonstrates a range-selection inconsistency under the same candidate model, not actual combat success or score.',
  finding: 'The greedy highest-output band is refused after approach risk is evaluated, while an already enumerated farther band passes that same implementation.',
  original, existingAlternative }
writeFileSync(`${root}/panel/mech/adaptive-range-counterexample.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
