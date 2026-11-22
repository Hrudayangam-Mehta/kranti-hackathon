import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root = '/workspace/scratch/bde29dc281e6'
const names = ['mech-pressure-cycle', 'mech-burst-cycle']
const stream = gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
const hello = stream.find(x => x.type === 'hello')
const recorded = stream.filter(x => x.type === 'obs')
const load = p => import(pathToFileURL(p).href)
const clone = x => structuredClone(x)
const results = []
const check = (name, fn) => { const detail = fn() || {}; results.push({ name, passed: true, ...detail }) }
const enemy = { id: 1, kind: 'mech', pos: [25, 0, 0], vel: [0, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }
function observation(opts = {}) {
  const t = opts.t ?? 100
  return { type: 'obs', tick: Math.round(t * 20), t, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: opts.hp ?? 1000, max_hp: 1400,
      energy: opts.energy ?? 100, max_energy: 100, grounded: true, cubes: 1, in_zone: true,
      upgrades: ['gun_damage'], stats: hello.config.mech,
      weapons: [{ kind: 'gun', cooldown: opts.gunCd ?? 0, ammo: opts.ammo ?? 12, reload: opts.reload ?? 0, stats: hello.config.weapons.gun },
        opts.secondary === null ? null : { kind: opts.secondary || 'laser', cooldown: opts.secondaryCd ?? 0, charge: opts.charge ?? 0, stats: hello.config.weapons[opts.secondary || 'laser'] }] },
    mechs: opts.mechs ?? [enemy], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [],
    pickups: opts.pickups ?? [], drops: [], offer: null,
    zone: { center: [0, 0], radius: 500, next_center: [0, 0], next_radius: 300, shrink_start: t + 60, shrink_end: t + 110, dps: 20 } }
}
const valid = a => a && a.move.length === 2 && a.move.every(Number.isFinite) && Math.hypot(...a.move) <= 1.000001 &&
  a.aim.length === 2 && a.aim.every(Number.isFinite) && a.fire.length === 2 && a.fire.every(x => typeof x === 'boolean') &&
  typeof a.boost === 'boolean' && (!('take' in a) || Number.isInteger(a.take) && a.take >= 0) &&
  (!('drop' in a) || a.drop === 0 || a.drop === 1) && (!('pick' in a) || Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2)

const { createBrain: capture } = await load(`${root}/experiments/mech-capture/bot/lib/brain.js`)
const { makeFireControl: captureFire } = await load(`${root}/experiments/mech-capture/bot/lib/firecontrol.js`)
for (const [index, name] of names.entries()) {
  const tree = `${root}/experiments/${name}/bot`
  const { createBrain } = await load(`${tree}/lib/brain.js`)
  const { sense } = await load(`${tree}/lib/senses.js`)
  const { makeFireControl } = await load(`${tree}/lib/firecontrol.js`)
  const { createBrain: pure } = await load(`${root}/experiments/${index ? 'mech-burst-hunter' : 'mech-pressure'}/bot/lib/brain.js`)
  const { createBrain: cycle } = await load(`${root}/experiments/${index ? 'mech-cycle-varied' : 'mech-cycle-ready'}/bot/lib/brain.js`)
  const ctx = { world: null, nav: null }
  const make = opts => createBrain(hello, ctx, { warmup: false, fuseMs: 1e8, ...opts })

  for (const [label, reference, overrides] of [
    ['both_features_off_capture_identity', capture, { pressurePolicy: 'off', weaponCycle: false }],
    ['cycle_off_pure_macro_identity', pure, { weaponCycle: false }],
    ['macro_off_cycle_control_identity', cycle, { pressurePolicy: 'off' }],
  ]) check(`${name}_${label}`, () => {
    const a = reference(hello, ctx, { warmup: false, fuseMs: 1e8, ...overrides }), b = make(overrides)
    for (const o of recorded) assert.deepEqual(b.act(clone(o), Infinity), a.act(clone(o), Infinity))
    assert.equal(b.debugState().counters.errors, 0)
    return { decisions: recorded.length }
  })

  check(`${name}_empty_slot_pickup_survives_commit_economy_bypass`, () => {
    const br = make({ env: 'ffa' })
    const a = br.act(observation({ secondary: null, pickups: [{ id: 8001, kind: 'laser', pos: [2, 0, 0] }] }), Infinity)
    assert.equal(br._B.pressureActive, true); assert.equal(br._B.loot, null); assert.equal(br._B.grab, null)
    assert.equal(a.take, 8001); assert.equal('drop' in a, false); assert.equal(br.debugState().mode, 'FIGHT')
    return { action: a }
  })

  check(`${name}_contextual_full_slot_swap_survives_commit`, () => {
    const br = make({ env: 'ffa' }), actions = []
    for (let i = 0; i <= 7; i++) actions.push(br.act(observation({ t: 100 + i * 0.1, secondaryCd: 3,
      pickups: [{ id: 8002, kind: 'lightning', pos: [2, 0, 0] }] }), Infinity))
    assert.equal(actions[0].take, undefined)
    const swap = actions.find(a => a.take === 8002)
    assert.ok(swap); assert.equal(swap.drop, 1); assert.equal(br._B.pressureActive, true)
    assert.equal(br._B.loot, null); assert.equal(br._B.grab, null); assert.equal(br._B.mustDisengage, false)
    return { first_swap_decision: actions.indexOf(swap), action: swap }
  })

  check(`${name}_pickup_reach_and_vertical_constraints`, () => {
    for (const pos of [[4.1, 0, 0], [2, 0, 4.1]]) {
      const br = make({ env: 'ffa' })
      const a = br.act(observation({ secondary: null, pickups: [{ id: 8003, kind: 'laser', pos }] }), Infinity)
      assert.equal(a.take, undefined)
    }
  })

  check(`${name}_charging_slot_is_never_dropped`, () => {
    const br = make({ env: 'squad' })
    for (let i = 0; i <= 7; i++) {
      const a = br.act(observation({ t: 100 + i * 0.1, charge: 0.4, pickups: [{ id: 8004, kind: 'lightning', pos: [2, 0, 0] }] }), Infinity)
      assert.notEqual(a.drop, 1)
    }
  })

  check(`${name}_clear_selected_target_can_start_charge_despite_other_closing_lightning`, () => {
    const br = make({ env: 'squad', aimCalOn: false })
    const selected = { ...enemy, pos: [80, 0, 0] }
    const closing = { ...enemy, id: 2, pos: [60, 0, 0], vel: [-6, 0, 0], hp: 10000, max_hp: 10000, weapons: ['lightning'] }
    const a = br.act(observation({ mechs: [selected, closing] }), Infinity)
    assert.equal(br._B.pressureActive, true); assert.equal(br._B.pressure.state.target.id, 1)
    assert.equal(br._B.noCharge, false); assert.equal(a.fire[br._B.me.laser.slot], true)
  })

  check(`${name}_pressure_reserve_reaches_lightning_firing_gate`, () => {
    const br = make({ env: 'ffa', aimCalOn: false }), B = br._B
    const o = observation({ secondary: 'lightning', energy: 10, mechs: [] })
    sense(B, o)
    const tr = { id: 1, x: 25, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 2.5, height: 9, hp: 1400, maxHp: 1400,
      npc: false, listed: true, phantom: false, conf: 1, lastSeen: 100, steadySince: 0, airborne: false, airT0: -99, revs: 0,
      revT: [0, 0, 0, 0], dist: 25, bearing: 0, losOut: true, losIn: true, losOutT: 100, lastDmgInT: -99, lastDmgOutT: -99,
      hasMortar: false, hasLightning: false, hasLaser: false, hasGun: true, rearOn: false, hostile: false }
    B.trackList = [tr]; B.tracks.set(1, tr); B.world = { shotClear: () => true }
    B.p26on = false; B.pressure.update(o); B.pressure.mode(); B.cmd.boost = false
    assert.equal(B.pressureActive, true); assert.equal(B.pressureEnergyReserve, 6)
    assert.equal(B.weaponPolicy.energyOk(), true)
    B.pressureActive = false; assert.equal(B.weaponPolicy.energyOk(), false); B.pressureActive = true
    makeFireControl(B).run(); assert.equal(B.out.fire[B.me.lightning.slot], true)
  })

  check(`${name}_burst_band_retreating_reverser_has_a_viable_gun_shot`, () => {
    const setup = (active, range = 78) => {
      const B = make({ env: 'ffa', aimCalOn: false, pressurePolicy: 'burst' })._B
      sense(B, observation({ secondary: null, mechs: [] }))
      const tr = { id: 1, x: range, y: 0, z: 0, vx: 10, vy: 0, vz: 0, radius: 2.5, height: 9, hp: 1400, maxHp: 1400,
        npc: false, listed: true, phantom: false, conf: 1, lastSeen: 100, steadySince: 100, airborne: false, airT0: -99, revs: 3,
        revT: new Float64Array([99.1,99.5,99.9,0]), dist: range, bearing: 0, losOut: true, losIn: true, losOutT: 100,
        lastDmgInT: -99, lastDmgOutT: -99, hasMortar: false, hasLightning: false, hasLaser: false, hasGun: true, rearOn: false, hostile: true }
      B.target = tr; B.trackList = [tr]; B.tracks.set(1,tr); B.world = { shotClear: () => true }
      B.env = 'FFA'; B.p26on = false; B.holdFire = false; B.pressureActive = active; B.cmd.mx = 0; B.cmd.my = 0; B.cmd.boost = false
      assert.equal(B.ffa.reverser(tr),true); assert.equal(B.pressure.rangeFor(tr),78)
      return B
    }
    const old = setup(true), active = setup(true), inactive = setup(false), tooFar = setup(true,210)
    captureFire(old).run(); makeFireControl(active).run(); makeFireControl(inactive).run(); makeFireControl(tooFar).run()
    assert.equal(old.out.fire[0],false); assert.equal(old.counters.flightGated,1)
    assert.equal(active.out.fire[0],true); assert.equal(inactive.out.fire[0],false)
    assert.equal(tooFar.out.fire[0],false); assert.equal(tooFar.counters.flightGated,1)
    return { selected_range:78, retreat_speed:10, active_fires:true, capture_suppresses:true, base_accuracy_gate_retained:true }
  })

  check(`${name}_committed_low_health_stress_keeps_finite_combat`, () => {
    const br = make({ env: 'ffa' }), actions = []
    for (let i = 0; i < 80; i++) {
      const a = br.act(observation({ t: 100 + 0.1 * i, hp: 1, secondary: i % 3 === 0 ? 'lightning' : 'laser',
        energy: [0, 2, 7, 10, 100][i % 5], ammo: i % 4 ? 12 : 0, reload: i % 4 ? 0 : 2.4,
        charge: i % 3 === 1 ? 0.6 : 0, secondaryCd: i % 3 === 2 ? 1.2 : 0 }), Infinity)
      assert.equal(valid(a), true); assert.equal(br._B.pressureActive, true); assert.equal(br._B.mode, 'FIGHT')
      assert.equal(br._B.holdFire, false); assert.equal(br._B.mustDisengage, false); actions.push(a)
    }
    assert.equal(br.debugState().counters.errors, 0); assert.equal(br.debugState().counters.fuse, 0)
    return { decisions: actions.length, sha256: createHash('sha256').update(JSON.stringify(actions)).digest('hex') }
  })
}

writeFileSync(`${root}/panel/mech/pressure-integration-cases.json`, JSON.stringify({ purpose: 'Integration contracts, capture identity controls, legal in-contact swaps, reserve-aware firing and finite all-mode combat actions; no match ranking.', count: results.length, passed: results.length, results }, null, 2) + '\n')
console.log(JSON.stringify({ count: results.length, passed: results.length }))
