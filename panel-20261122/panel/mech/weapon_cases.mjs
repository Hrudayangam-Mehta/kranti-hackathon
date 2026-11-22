import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const tree = `${root}/experiments/mech-cycle-ready/bot`
const baseline = `${root}/experiments/mech-capture/bot`
const load = p => import(pathToFileURL(p).href)
const { createBrain } = await load(`${tree}/lib/brain.js`)
const { sense } = await load(`${tree}/lib/senses.js`)
const { makeFireControl } = await load(`${tree}/lib/firecontrol.js`)
const { makeFireControl: baseFire } = await load(`${baseline}/lib/firecontrol.js`)
const { makeWeaponPolicy } = await load(`${tree}/lib/weapon_policy.js`)
const { makeMover } = await load(`${tree}/lib/mover.js`)
const { makeEconomy } = await load(`${tree}/lib/economy.js`)
const stream = gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
const hello = stream.find(x => x.type === 'hello')
const weapon = (kind, extra = {}) => kind ? { kind, cooldown: 0, ammo: 12, reload: 0, charge: 0, stats: hello.config.weapons[kind], ...extra } : null
const target = (x = 100, y = 0, extra = {}) => ({ id: 1, x, y, z: 0, vx: 0, vy: 0, vz: 0, height: 9, radius: 2.5,
  hp: 1400, maxHp: 1400, npc: false, listed: true, phantom: false, lastSeen: 100, steadySince: 0, revs: 0,
  revT: [0, 0, 0, 0], airborne: false, airT0: -99, dist: Math.hypot(x, y), bearing: Math.atan2(y, x),
  losOut: true, losIn: true, losOutT: 100, hasMortar: false, rearOn: false, hasGun: true, hasLaser: false,
  hasLightning: false, charging: false, aimAtMe: false, lastDmgInT: -99, hostile: true, conf: 1, ...extra })

function state(pair = [weapon('gun'), weapon('laser', { charge: 0.2 })], opts = {}) {
  const h = opts.seed === undefined ? hello : { ...hello, seed: opts.seed }
  const B = createBrain(h, { world: null, nav: null }, { warmup: false, weaponCycle: opts.enabled !== false, weaponVariety: !!opts.varied })._B
  sense(B, { type: 'obs', tick: 2000, t: 100, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1000, max_hp: 1400, energy: 100, max_energy: 100,
      grounded: true, cubes: 0, in_zone: true, weapons: pair, stats: hello.config.mech },
    mechs: [], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [], pickups: [], drops: [] })
  B.P.aimCalOn = false; B.tick = 1000; B.p26on = opts.profile !== false; B.holdFire = false; B.p26 = { gunTgt: -1 }
  B.env = opts.env || 'SQUAD'
  const tr = opts.target || target()
  B.target = tr; B.trackList = [tr]; B.tracks.set(tr.id, tr)
  B.prof = { rungs: [0.85, 0.68, 0.30, 0.12], fireTarget: () => B.target, laserVeto: () => false,
    crateShot: () => null, wantReload: () => false, isLegal: tr => tr.hostile || tr === B.target }
  B.world = { shotClear: () => true }
  if (B.me.laser) B.out.fire[B.me.laser.slot] = B.me.laser.charge > 0
  return B
}
function fire(B, factory = makeFireControl) {
  factory(B).run()
  return { fire: [...B.out.fire], aim: [...B.out.aim], reload: B.out.reload, aimKind: B.aimKind, laserShots: B.counters.laserShots }
}
const results = []
function check(name, fn) { const detail = fn(); results.push({ name, passed: true, ...detail }) }
const origin = { x: 0, y: 0, z: 7 }
const advance = (B, dt = 0.1) => { B.me.t += dt; B.tick++; }

for (const env of ['SQUAD', 'FFA']) for (const pair of [
  [weapon('gun'), weapon('laser', { charge: 0.2 })], [weapon('laser', { charge: 0.75 }), weapon('gun')],
  [weapon('lightning'), weapon('laser', { charge: 0.75 })], [weapon('gun', { ammo: 0 }), null],
]) check(`feature_off_capture_identity_${env}_${pair.map(x => x?.kind).join('_')}`, () => {
  const a = state(pair, { env, enabled: false }), b = state(pair, { env, enabled: false })
  const old = fire(a, baseFire), current = fire(b)
  assert.deepEqual(current, old); return { output: current }
})

check('compatible_gun_and_held_laser_both_trigger', () => {
  const B = state(), result = fire(B)
  assert.equal(result.fire[0], true); assert.equal(result.fire[1], true); assert.equal(result.aimKind, 'gun')
  return { output: result }
})
check('ffa_ready_gun_not_cancelled_by_charge_courtesy_aim', () => {
  const B = state(undefined, { env: 'FFA', profile: false }), result = fire(B)
  assert.deepEqual(result.fire, [true, true]); assert.equal(result.aimKind, 'gun'); return { output: result }
})
check('early_slew_for_slow_torso_precedes_eighty_percent_charge', () => {
  const B = state([weapon('gun'), weapon('laser', { charge: 0.3 })]); B.me.yaw = -1; B.me.turnRate = 0.2
  const result = fire(B); assert.equal(result.aimKind, 'laser'); assert.equal(result.fire[1], true)
  return { output: result }
})
check('full_charge_reserves_aim_even_without_ready_release', () => {
  const B = state([weapon('lightning'), weapon('laser', { charge: 0.75 })])
  const threat = target(25, 2, { id: 2, hasLaser: true, charging: true, aimAtMe: true })
  B.trackList.push(threat)
  assert.equal(B.weaponPolicy.interruptAim(B.target, false, origin), null)
  assert.equal(B.weaponPolicy.laserAim(B.target, { yaw: 1, pitch: 0, clear: false, kill: false }, { ready: true, aligned: true, delay: 0.05, flight: 0.1 }), true)
})
check('observed_short_zero_charge_cooldown_does_not_own_aim', () => {
  const B = state([weapon('gun'), weapon('laser', { charge: 0, cooldown: 1.8 })], { env: 'FFA', profile: false })
  B.out.fire[1] = true
  const result = fire(B); assert.equal(result.aimKind, 'gun'); assert.equal(result.fire[0], true)
  return { output: result }
})
check('conservatively_sufficient_ready_gun_can_finish_before_laser_slew', () => {
  const B = state(); B.me.gun.damage = 500; B.target.hp = 300
  const beam = { yaw: 2, pitch: 0, clear: true, kill: true }
  assert.equal(B.weaponPolicy.laserAim(B.target, beam, { ready: true, aligned: true, delay: 0.05, flight: 0.05 }), false)
  B.target.hp = 390
  assert.equal(B.weaponPolicy.laserAim(B.target, beam, { ready: true, aligned: true, delay: 0.05, flight: 0.05 }), true)
  B.target.hp = 300
  assert.equal(B.weaponPolicy.laserAim(B.target, beam, { ready: true, aligned: false, delay: 0.05, flight: 0.05 }), true)
})
check('live_charge_turn_multiplier_changes_slew_time', () => {
  const B = state(); B.me.laser.st = { ...B.me.laser.st, charge_turn_mult: 0.5 }
  assert.equal(B.weaponPolicy.slew(1, 0), 0.5)
  B.me.laser.charge = 0; assert.equal(B.weaponPolicy.slew(1, 0), 0.25)
})
for (const env of ['SQUAD', 'FFA']) {
  check(`near_barrel_solid_blocks_gun_${env}`, () => {
    const B = state([weapon('gun'), null], { env, profile: env !== 'FFA' })
    B.world.shotClear = (ax, ay, az, bx) => !(ax <= 2 && bx >= 2)
    const result = fire(B); assert.equal(result.fire[0], false); return { output: result }
  })
  check(`unreachable_raw_laser_pitch_holds_charge_${env}`, () => {
    const B = state([null, weapon('laser', { charge: 0.75 })], { env, target: target(30, 0, { z: 30 }), profile: env !== 'FFA' })
    B.me.maxPitch = 0.2; B.me.pitch = 0.2
    const result = fire(B); assert.equal(result.fire[1], true); assert.equal(result.laserShots, 0)
    assert.ok(result.aim[1] <= 0.2); return { output: result }
  })
}
check('charging_threat_gets_lightning_interrupt_aim', () => {
  const B = state([weapon('lightning'), weapon('laser', { charge: 0.2 })], { target: target(100, -40) })
  B.trackList.push(target(25, 2, { id: 2, hasLaser: true, charging: true, aimAtMe: true }))
  const result = fire(B); assert.equal(result.aimKind, 'short'); assert.equal(result.fire[0], true); assert.equal(result.fire[1], true)
  return { output: result }
})
check('charging_elsewhere_is_not_an_interrupt_target', () => {
  const B = state([weapon('lightning'), null])
  B.trackList.push(target(25, 2, { id: 2, hasLaser: true, charging: true, aimAtMe: false }))
  assert.equal(B.weaponPolicy.interruptAim(B.target, false, origin), null)
})
for (const kind of ['crate', 'neutral']) check(`nearer_${kind}_at_thirteen_degrees_blocks_farther_target`, () => {
  const B = state([weapon('lightning'), null], { target: target(30) })
  const a = 13 * Math.PI / 180, x = 18 * Math.cos(a), y = 18 * Math.sin(a)
  const blocker = target(x, y, { id: 2, hostile: false })
  if (kind === 'crate') B.crates.set(2, { id: 2, x, y, z: 0, hp: 300, seen: 100 })
  else B.trackList.push(blocker)
  const first = B.weaponPolicy.nearestLightning(0, origin)
  assert.equal(first.object.id, 2)
  assert.equal(B.weaponPolicy.lightningAligned(first, 0, origin), false)
  const result = fire(B); assert.equal(result.fire[0], false); return { output: result }
})
check('nearest_neutral_inside_aim_inset_does_not_become_collateral', () => {
  const B = state([weapon('lightning'), null], { env: 'FFA', profile: false, target: target(30) })
  B.trackList.push(target(20, 0, { id: 2, hostile: false }))
  const result = fire(B); assert.equal(result.fire[0], false)
})
check('equidistant_ambiguous_lightning_target_is_not_assumed', () => {
  const B = state([weapon('lightning'), null], { target: target(30) })
  B.trackList.push(target(30, 0, { id: 2, hostile: false }))
  const result = fire(B); assert.equal(result.fire[0], false)
})
check('solid_occludes_lightning_even_if_cached_visibility_says_clear', () => {
  const B = state([weapon('lightning'), null], { target: target(25) }); B.world.shotClear = () => false
  assert.equal(B.weaponPolicy.nearestLightning(0, origin), null); assert.equal(fire(B).fire[0], false)
})
check('lightning_budget_includes_trigger_cost_and_active_boost', () => {
  const B = state([weapon('lightning'), null]); B.me.energy = 37.99; assert.equal(B.weaponPolicy.energyOk(), false)
  B.me.energy = 38; assert.equal(B.weaponPolicy.energyOk(), true)
  B.cmd.boost = true; assert.equal(B.weaponPolicy.energyOk(), false)
  B.me.energy = 39.7; assert.equal(B.weaponPolicy.energyOk(), true)
})
check('pressure_reserve_hook_does_not_spend_zone_escape_floor', () => {
  const B = state([weapon('lightning'), null]); B.pressureActive = true; B.pressureEnergyReserve = 9; B.me.energy = 12
  assert.equal(B.weaponPolicy.energyOk(), true); B.zoneUrgent = true; assert.equal(B.weaponPolicy.energyOk(), false)
})
check('held_fire_veto_applies_to_both_lightning_selection_and_trigger', () => {
  const B = state([weapon('lightning'), null], { target: target(25, 0, { hasLaser: true, charging: true, aimAtMe: true }) })
  B.holdFire = true; assert.equal(B.weaponPolicy.interruptAim(B.target, false, origin), null); assert.equal(fire(B).fire[0], false)
})
check('pickup_requires_elapsed_stable_advantage_not_repeated_calls', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  for (let i = 0; i < 20; i++) assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  for (let i = 0; i < 6; i++) { advance(B); B.weaponPolicy.pickup('gun', { drop: 1 }) }
  assert.deepEqual(B.weaponPolicy.pickup('gun', { drop: 1 }), { drop: 1 })
})
check('pickup_hysteresis_resets_after_advantage_or_observation_gap', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  for (let i = 0; i < 4; i++) { B.weaponPolicy.pickup('gun', { drop: 1 }); advance(B) }
  B.zoneUrgent = true; assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  advance(B); B.zoneUrgent = false; assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  advance(B, 1); assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
})
check('charging_laser_lock_does_not_lock_the_other_slot', () => {
  const B = state([weapon('gun', { ammo: 0, reload: 2.4 }), weapon('laser', { charge: 0.3 })], { env: 'FFA', target: target(25, 0, { hasLaser: true, charging: true }) })
  for (let i = 0; i < 7; i++) { B.weaponPolicy.pickup('lightning', null); advance(B) }
  assert.deepEqual(B.weaponPolicy.pickup('lightning', null), { drop: 0 })
})
check('pickup_keeps_squad_gun_and_never_drops_charging_laser', () => {
  const B = state([weapon('gun', { ammo: 0, reload: 2.4 }), weapon('laser', { charge: 0.3 })], { target: target(25, 0, { hasLightning: true }) })
  for (let i = 0; i < 10; i++) { assert.equal(B.weaponPolicy.pickup('lightning', null), null); advance(B) }
})
check('same_kind_and_empty_slot_use_existing_pickup_contract', () => {
  const B = state([weapon('gun'), null])
  assert.equal(B.weaponPolicy.pickup('gun', null), null)
  assert.deepEqual(B.weaponPolicy.pickup('laser', { drop: -1 }), { drop: -1 })
  assert.equal(B.weaponPolicy.pickup('mortar', null), null)
})
check('new_equipment_resets_same_tick_cache_and_swap_timer', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  for (let i = 0; i < 7; i++) { B.weaponPolicy.pickup('gun', { drop: 1 }); advance(B) }
  assert.deepEqual(B.weaponPolicy.pickup('gun', { drop: 1 }), { drop: 1 })
  B.me.weapons[1] = { ...B.me.lightning, kind: 'mortar' }
  assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
})
check('pickup_capacity_accounts_for_equip_reload_and_solid_visibility', () => {
  const B = state([weapon('gun', { ammo: 0, reload: 4.1 }), weapon('laser')])
  assert.equal(B.weaponPolicy.capacity('gun', B.me.gun, B.target), 0)
  B.cfg.loot.equip_s = 4.1; assert.equal(B.weaponPolicy.capacity('gun', null, B.target), 0)
  B.target.losOut = false; assert.equal(B.weaponPolicy.capacity('laser', B.me.laser, B.target), 0)
})
check('unobserved_pickup_gun_ammunition_never_counts_as_a_free_refill', () => {
  const B = state([weapon('gun'), weapon('laser')], { target: target(60) })
  const incoming = B.weaponPolicy.capacity('gun', null, B.target)
  const loaded = B.weaponPolicy.capacity('gun', B.me.gun, B.target)
  assert.ok(incoming <= 90); assert.ok(loaded > incoming)
  return { conservativeIncomingCapacity: incoming, observedLoadedCapacity: loaded }
})
check('committed_pressure_keeps_a_useful_swap_despite_low_hp', () => {
  for (const active of [false, true]) {
    const B = state([weapon('gun', { ammo: 0, reload: 2.4 }), weapon('laser', { charge: 0.3 })], { env: 'FFA', target: target(25, 0, { hasLaser: true, charging: true }) })
    B.pressureActive = active; B.me.hpf = 0.02; B.me.lastHurtT = B.me.t
    assert.equal(B.weaponPolicy.pickup('lightning', null), null)
    advance(B)
    assert.deepEqual(B.weaponPolicy.pickup('lightning', null), active ? { drop: 0 } : null)
  }
})
check('pressure_previews_nearby_pickups_without_detouring_to_them', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  B.pressureActive = true; B.cmd.mx = 0.7; B.cmd.my = 0.2
  const item = { id: 77, kind: 'gun', x: 8, y: 0, z: 0, seen: 100 }
  B.pickups.set(item.id, item)
  const econ = makeEconomy(B, {})
  econ.hands(); assert.equal(B.out.take, -1)
  advance(B); item.x = 3.5; item.seen = B.me.t
  econ.hands(); assert.equal(B.out.take, 77); assert.equal(B.out.drop, 1)
  assert.equal(B.cmd.mx, 0.7); assert.equal(B.cmd.my, 0.2)
})
check('pressure_first_seen_inside_pickup_window_needs_one_observation', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  B.pressureActive = true
  const item = { id: 78, kind: 'gun', x: 3.5, y: 0, z: 0, seen: 100 }
  B.pickups.set(item.id, item)
  const econ = makeEconomy(B, {})
  econ.hands(); assert.equal(B.out.take, -1)
  advance(B); item.x = 1.55; item.seen = B.me.t
  econ.hands(); assert.equal(B.out.take, 78)
})
check('pickup_hands_clamps_live_horizontal_and_fixed_vertical_limits', () => {
  const B = state([weapon('gun'), null]); B.pressureActive = true
  B.cfg.loot.pickup_radius = 2; B.P.takeReach = 8; B.P.takeDz = 9
  const item = { id: 79, kind: 'laser', x: 2.01, y: 0, z: 0, seen: 100 }
  B.pickups.set(item.id, item)
  const econ = makeEconomy(B, {})
  econ.hands(); assert.equal(B.out.take, -1)
  item.x = 2; econ.hands(); assert.equal(B.out.take, 79)
  item.z = 4.01; econ.hands(); assert.equal(B.out.take, -1)
  item.z = 4; econ.hands(); assert.equal(B.out.take, 79)
})
check('pressure_swap_still_obeys_zone_and_equipment_cooldown', () => {
  const B = state([weapon('laser'), weapon('lightning')], { target: target(60) })
  B.pressureActive = true; B.zoneUrgent = true
  assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  advance(B); assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  B.zoneUrgent = false; assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  advance(B); assert.deepEqual(B.weaponPolicy.pickup('gun', { drop: 1 }), { drop: 1 })
  B.me.weapons[1] = { ...B.me.lightning, kind: 'mortar' }
  assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
  advance(B, 3.9); assert.equal(B.weaponPolicy.pickup('gun', { drop: 1 }), null)
})
check('committed_pairing_can_replace_gun_in_both_modes', () => {
  for (const env of ['SQUAD', 'FFA']) {
    const B = state([weapon('gun', { ammo: 0, reload: 2.4 }), weapon('laser', { charge: 0.3 })], { env, target: target(25, 0, { hasLaser: true, charging: true }) })
    B.pressureActive = true
    assert.equal(B.weaponPolicy.pickup('lightning', null), null)
    advance(B)
    assert.deepEqual(B.weaponPolicy.pickup('lightning', null), { drop: 0 })
  }
})
check('lost_target_cannot_reacquire_just_dropped_gun_inside_cooldown', () => {
  const B = state([weapon('gun', { ammo: 0, reload: 2.4 }), weapon('laser', { charge: 0.3 })], { target: target(25, 0, { hasLaser: true, charging: true }) })
  B.pressureActive = true
  B.weaponPolicy.pickup('lightning', null); advance(B)
  assert.deepEqual(B.weaponPolicy.pickup('lightning', null), { drop: 0 })
  B.me.weapons[0] = { kind: 'lightning', slot: 0, charge: 0, cooldown: 1 }; B.me.gun = null; B.me.lightning = B.me.weapons[0]
  B.target = null; B.trackList = []
  advance(B)
  const econ = makeEconomy(B, {})
  B.pickups.set(80, { id: 80, kind: 'gun', x: 0, y: 0, z: 0, seen: B.me.t })
  econ.hands(); assert.equal(B.out.take, -1)
  advance(B, 3.9); B.pickups.get(80).seen = B.me.t
  econ.hands(); assert.equal(B.out.take, -1)
  advance(B, 0.2); B.pickups.get(80).seen = B.me.t
  econ.hands(); assert.equal(B.out.take, 80); assert.equal(B.out.drop, 0)
})
check('no_context_fallback_preserves_charge_lock_but_empty_slots_can_fill', () => {
  const B = state([weapon('laser', { charge: 0.3 }), weapon('lightning')])
  B.pressureActive = true; B.target = null; B.trackList = []
  assert.equal(B.weaponPolicy.pickup('gun', { drop: 0 }), null)
  B.me.weapons[1] = null; B.me.lightning = null
  assert.deepEqual(B.weaponPolicy.pickup('gun', { drop: -1 }), { drop: -1 })
})
check('separate_seeded_variation_is_stable_and_does_not_consume_shared_rng', () => {
  const A = state(undefined, { varied: true, seed: 123 }), B = state(undefined, { varied: true, seed: 123 })
  const directions = new Set()
  for (let i = 0; i < 40; i++) {
    const a = A.weaponPolicy.dodgeSides(i); assert.deepEqual(a, A.weaponPolicy.dodgeSides(i)); directions.add(a[0])
    assert.deepEqual(a, B.weaponPolicy.dodgeSides(i))
  }
  assert.equal(directions.size, 2)
  const C = state(undefined, { varied: true, seed: 123 })
  assert.equal(A.rng(), C.rng())
  assert.deepEqual(state().weaponPolicy.dodgeSides(1), [1, -1])
})
check('varied_dodge_respects_the_only_walkable_side', () => {
  const outputs = []
  for (let seed = 1; seed <= 8; seed++) {
    const B = state([weapon('gun'), null], { seed, varied: true })
    B.world = null
    B.nav = { levelAt: () => 0, walkLine: (ax, ay, bx, by) => by >= 0, passableAt: (x, y) => y >= 0 }
    B.bullets.set(30, { id: 30, x: 40, y: 0, z: 5, vx: -100, vy: 0, vz: 0, t: 100, npc: false })
    const mover = makeMover(B)
    assert.equal(mover.bulletDodge(), true)
    assert.ok(B.cmd.my > 0); outputs.push({ seed, y: B.cmd.my })
  }
  return { outputs }
})
check('varied_dodge_explores_symmetric_choices_but_keeps_the_safer_motion', () => {
  const sides = new Set()
  for (let seed = 1; seed <= 24; seed++) {
    for (const vy of [0, 2]) {
      const B = state([weapon('gun'), null], { seed: seed * 32771, varied: true })
      B.world = null; B.me.vy = vy
      B.bullets.set(30, { id: 30, x: 40, y: 0, z: 5, vx: -100, vy: 0, vz: 0, t: 100, npc: false })
      assert.equal(makeMover(B).bulletDodge(), true)
      if (vy === 0) sides.add(Math.sign(B.cmd.my))
      else assert.ok(B.cmd.my > 0)
    }
  }
  assert.deepEqual([...sides].sort(), [-1, 1])
  return { observedSymmetricSides: [...sides].sort(), strictlySaferCases: 24 }
})

const receipt = { time: new Date().toISOString(), source: tree, count: results.length, passed: results.length, results }
writeFileSync(`${root}/panel/mech/weapon-cases.json`, JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ passed: results.length, file: 'panel/mech/weapon-cases.json' }))
