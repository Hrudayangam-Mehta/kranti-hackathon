// Independent control-ownership audit. This is not a gameplay simulator.
// Functional identity uses generous test-only clocks; latency is gated separately.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import {
  root, load, clone, hello, cfg, context, recorded, layout,
  observation, actor, validateIndividual, snapshot,
} from './adaptive-fixtures.mjs'

const candidatePath = process.argv[2] || `${root}/experiments/mech-adaptive/bot`
const outputPath = process.argv[3] || `${root}/panel/mech/adaptive-cross-mode-cases.json`
const baselinePath = `${root}/experiments/mech-capture/bot`
const { createBrain: baseline } = await load(`${baselinePath}/lib/brain.js`)
const { createBrain: candidate } = await load(`${candidatePath}/lib/brain.js`)
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const pin = () => Object.fromEntries(['prof.js', 'params.js', 'brain.js'].map(f => [f, hash(`${candidatePath}/lib/${f}`)]))
const initialPin = pin()
const rows = []
const hooks = ['selectTarget', 'econ', 'decideMode', 'legs', 'afterLegs', 'fireTarget', 'crateShot', 'wantReload', 'laserVeto']
function brain(factory, overrides = {}) {
  const b = factory(clone(hello), context, {
    warmup: false, debug: false, prof: 'p26', env: 'auto', fuseMs: 1e6, ...overrides,
  })
  const calls = Object.fromEntries(hooks.map(k => [k, 0]))
  if (b._B.prof) for (const k of hooks) {
    const original = b._B.prof[k]
    b._B.prof[k] = (...args) => { calls[k]++; return original(...args) }
  }
  return { b, calls }
}
function act(state, obs) {
  const before = { ...state.calls }
  const action = state.b.act(clone(obs), performance.now() + 1e6)
  const out = snapshot(state.b, action)
  assert.equal(out.counters.errors, 0)
  assert.equal(out.counters.fuse, 0)
  out.profileCalls = Object.fromEntries(hooks.map(k => [k, state.calls[k] - before[k]]))
  out.freshFirewall = state.b._B.hunt.firewall()
  return out
}
function check(name, fn) {
  try { rows.push({ name, passed: true, ...fn() }) }
  catch (e) { rows.push({ name, passed: false, error: e.stack || String(e) }) }
}
const crafted = [
  observation({ t: 100, secondary: 'laser', mechs: [actor(layout.points[55], { hp: 200 })], aimAt: layout.points[55] }),
  observation({ t: 100.1, hp: 450, secondary: 'lightning', energy: 12, mechs: [actor(layout.points[35])], aimAt: layout.points[35], events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: layout.yaw, by: 1 }] }),
  observation({ t: 100.2, hp: 700, gun: { ammo: 0, reload: cfg.weapons.gun.reload }, mechs: [], crates: [{ id: 1001, pos: [layout.points[25].x, layout.points[25].y, layout.points[25].z], hp: cfg.crates.hp }] }),
]
for (const o of crafted) validateIndividual(o)
function identical(name, overrides, inputs, inactive) {
  check(name, () => {
    const a = brain(baseline, overrides), b = brain(candidate, overrides)
    let actions = 0, activeFrames = 0
    for (const o of inputs) {
      const x = act(a, o), y = act(b, o)
      assert.deepEqual(y.action, x.action)
      if (y.p26on) activeFrames++
      if (inactive) assert.equal(y.profileCalls.selectTarget, 0)
      actions++
    }
    return { observations: actions, identicalActions: actions, activeProfileFrames: activeFrames }
  })
}
identical('adaptive_switch_off_preserves_recorded_actions', { pfAdaptive: false }, recorded, false)
identical('adaptive_switch_off_preserves_active_counterfactual_actions', { pfAdaptive: false, env: 'squad' }, crafted, false)
identical('profile_off_preserves_recorded_actions', { prof: 'off' }, recorded, true)
identical('profile_off_preserves_active_counterfactual_actions', { prof: 'off', env: 'squad' }, crafted, true)
identical('forced_ffa_preserves_recorded_actions', { env: 'ffa' }, recorded, true)
identical('forced_ffa_preserves_counterfactual_actions', { env: 'ffa' }, crafted, true)
identical('two_alive_startup_uses_existing_fallback', { env: 'squad' }, [observation({ alive: 2 })], true)
identical('late_zone_startup_uses_existing_fallback', { env: 'squad' }, [observation({ t: 360 })], true)

check('practice_profile_executes_new_decision_owner', () => {
  const s = brain(candidate, { env: 'squad' })
  const frames = crafted.map(o => act(s, o))
  assert.ok(frames.every(o => o.p26on && o.profileCalls.selectTarget === 1 && o.profileCalls.decideMode === 1))
  assert.ok(frames.every(o => typeof o.S.reason === 'string'))
  return { frames, scope: 'Active helpers executed; action quality is not ranked.' }
})

check('early_ready_setup_reaches_actual_fire_dispatch', () => {
  const o = observation({ t: 30, cubes: 1, secondary: 'laser', mechs: [actor(layout.points[55], { hp: 100 })], aimAt: layout.points[55] })
  validateIndividual(o)
  const c = act(brain(baseline, { env: 'squad' }), o)
  const a = act(brain(candidate, { env: 'squad' }), o)
  assert.equal(c.S.phase, 'gate')
  assert.equal(c.target, null)
  assert.equal(a.S.phase, 'open')
  assert.equal(a.S.setupEligible, true)
  assert.equal(a.S.gateEndT, -1)
  assert.equal(a.target, 1)
  assert.ok(a.action.fire.some(Boolean))
  return { baseline: c, candidate: a, scope: 'Map/config-constrained single decision; actual trigger dispatch differs, without any match-outcome claim.' }
})

check('early_empty_secondary_does_not_open_gate', () => {
  const o = observation({ t: 30, cubes: 1, secondary: 'lightning', energy: 0, mechs: [actor(layout.points[35])], aimAt: layout.points[35] })
  validateIndividual(o)
  const a = act(brain(candidate, { env: 'squad' }), o)
  assert.equal(a.S.setupEligible, false)
  assert.equal(a.S.phase, 'gate')
  assert.equal(a.S.gateEndT, -1)
  assert.equal(a.target, null)
  return { candidate: a }
})

check('early_ready_setup_keeps_losing_exchange_veto', () => {
  const o = observation({ t: 30, cubes: 1, hp: 100, secondary: 'laser', mechs: [actor(layout.points[55], { weapons: ['gun', 'laser'] })], aimAt: layout.points[55], events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: layout.yaw, by: 1 }] })
  validateIndividual(o)
  const a = act(brain(candidate, { env: 'squad' }), o)
  assert.equal(a.S.setupEligible, true)
  assert.equal(a.S.phase, 'open')
  assert.equal(a.S.fight, false)
  assert.equal(a.mode, 'DISENGAGE')
  return { candidate: a }
})

check('alive_threshold_disables_profile_before_decision', () => {
  const s = brain(candidate, { env: 'squad' })
  const first = act(s, observation({ t: 100, alive: 4 }))
  const second = act(s, observation({ t: 100.1, alive: 3, events: [{ type: 'kill', target: 77 }] }))
  assert.equal(first.profileCalls.selectTarget, 1)
  assert.equal(second.profileCalls.selectTarget, 0)
  assert.equal(second.p26on, false)
  return { frames: [first, second] }
})

check('own_kill_preserves_practice_firewall', () => {
  const s = brain(candidate)
  const frames = [
    observation({ t: 100, alive: 16 }),
    observation({ t: 100.1, alive: 15, events: [{ type: 'kill', target: 77 }] }),
    observation({ t: 100.2, alive: 15 }),
  ].map(o => act(s, o))
  assert.ok(frames.every(o => o.foreignDeaths === 0 && o.profileCalls.selectTarget === 1))
  return { frames }
})

check('foreign_death_transition_records_inherited_one_decision_lag', () => {
  const s = brain(candidate)
  const frames = [observation({ t: 100, alive: 16 }), observation({ t: 100.1, alive: 15 }), observation({ t: 100.2, alive: 15 })].map(o => act(s, o))
  assert.deepEqual(frames.map(o => o.profileCalls.selectTarget), [1, 1, 0])
  assert.equal(frames[1].p26on, true)
  assert.equal(frames[1].freshFirewall, false)
  assert.equal(frames[2].p26on, false)
  return { frames, limitation: 'Assess precedes stance classification. This test documents the existing lag; it does not claim immediate deactivation.' }
})

check('ffa_latch_transition_records_inherited_one_decision_lag', () => {
  const s = brain(candidate)
  const frames = [observation({ t: 100, alive: 16 }), observation({ t: 100.1, alive: 13 }), observation({ t: 100.2, alive: 13 })].map(o => act(s, o))
  assert.deepEqual(frames.map(o => o.profileCalls.selectTarget), [1, 1, 0])
  assert.equal(frames[1].env, 'FFA')
  assert.equal(frames[1].p26on, true)
  assert.equal(frames[2].env, 'FFA')
  assert.equal(frames[2].p26on, false)
  return { frames, limitation: 'Startup forced-FFA identity does not erase this inherited transition behavior.' }
})

assert.deepEqual(pin(), initialPin, 'Candidate source changed during functional audit; rerun only after the next source freeze.')
const result = {
  utc: new Date().toISOString(), candidatePath, baselinePath, sourceSha256: initialPin,
  scope: 'Independent function/control-ownership checks. Official replay plus config/map-constrained counterfactual snapshots; not reactive matches, timing results, or score predictions.',
  testOnlyClock: 'warmup false; fuse and deadline relaxed to isolate deterministic function behavior; final bundles use their normal runtime limits.',
  total: rows.length, passed: rows.filter(x => x.passed).length, failed: rows.filter(x => !x.passed).length, results: rows,
}
writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed, outputPath }))
if (result.failed) process.exitCode = 1
