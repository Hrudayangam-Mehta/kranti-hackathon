import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const load = (p) => import(pathToFileURL(p).href)
const { createBrain: capture } = await load(`${root}/experiments/mech-capture/bot/lib/brain.js`)
const { createBrain: push } = await load(`${root}/experiments/mech-pressure-cycle/bot/lib/brain.js`)
const { createBrain: adaptive } = await load(`${root}/experiments/mech-adaptive/bot/lib/brain.js`)
const { makeFireControl } = await load(`${root}/experiments/mech-adaptive/bot/lib/firecontrol.js`)
const { sense } = await load(`${root}/experiments/mech-capture/bot/lib/senses.js`)
const hello = JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n', 1)[0])
const rows = []

function target(id = 1, x = 80, hp = 1400) {
  return { id, x, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI, npc: false, phantom: false,
    hp, maxHp: 1400, conf: 1, lastSeen: 100, listed: true, losOut: true, losIn: true, losInT: 100,
    dist: Math.abs(x), height: 9, radius: 2.5, hasGun: true, hasLaser: true, hasLightning: false,
    hasMortar: false, cubes: 0, lastDmgInT: 100, lastDmgOutT: -99, dmgInD: Math.abs(x),
    steadySince: 0, bearing: x < 0 ? Math.PI : 0, revs: 0, airborne: false, hostile: true }
}
function state(factory, o = {}) {
  const t = o.t ?? 100
  const brain = factory(hello, { world: null, nav: null }, { warmup: false, prof: 'p26', env: 'squad', pressurePolicy: o.policy ?? 'push', pfAdaptive: o.adaptive ?? true })
  const B = brain._B
  const obs = { type: 'obs', tick: Math.round(t * 20), t, alive: o.alive ?? 16,
    self: { id: 0, pos: [0,0,0], vel: [0,0,0], aim: [0,0], hp: o.hp ?? 1400, max_hp: 1400,
      energy: o.energy ?? 100, max_energy: 100, grounded: true, cubes: o.cubes ?? 0, in_zone: true,
      upgrades: o.upgrades ?? [], stats: o.stats ?? hello.config.mech,
      weapons: [{ kind: 'gun', cooldown: o.cd ?? 0, ammo: o.ammo ?? 12, reload: o.reload ?? 0, stats: hello.config.weapons.gun },
        o.secondary ? { kind: o.secondary, cooldown: o.secondaryCd ?? 0, charge: o.charge ?? 0, stats: hello.config.weapons[o.secondary] } : null] },
    mechs: [], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [], pickups: [], drops: [], offer: null,
    zone: { center:[0,0],radius:500,next_center:[0,0],next_radius:300,shrink_start:t+60,shrink_end:t+110,dps:20 } }
  sense(B, obs)
  B.aliveN = obs.alive; B.p26on = true; B.env = 'SQUAD'; B.zoneUrgent = false
  B.trackList = (o.targets ?? []).map(tr => ({ ...tr, lastSeen:t }))
  B.tracks = new Map(B.trackList.map(tr => [tr.id,tr]))
  B.me.lastHurtT = o.lastHurt ?? -99
  B.me.lastDealtT = o.lastDealt ?? -99
  B.prof.update(obs)
  if (B.pressure) B.pressure.update(obs)
  else B.prof.selectTarget()
  return { B, obs, brain }
}
function decide(s) { s.B.pressure ? s.B.pressure.mode() : s.B.prof.decideMode(); return s }
function check(name, fn) { rows.push({ name, passed:true, ...fn() }) }


check('unready_finish_no_longer_overrides_retreat', () => {
  const {B}=decide(state(adaptive,{hp:100,secondary:'laser',ammo:0,reload:2.4,secondaryCd:1.65,lastHurt:100,targets:[target(1,60,100)]}))
  assert.equal(B.prof.S.finishing,false);assert.equal(B.mode,'DISENGAGE');assert.ok(B.prof.S.ttk>=2.4)
  return {mode:B.mode,ttk:B.prof.S.ttk,finish:B.prof.S.finishing,reason:B.prof.S.reason}
})
check('favorable_ready_exchange_remains_active', () => {
  const {B}=decide(state(adaptive,{hp:1400,secondary:'laser',targets:[{...target(1,60,500),hasLaser:false}]}))
  assert.equal(B.mode,'FIGHT');assert.ok(B.prof.S.margin>0 || B.prof.S.finishing)
  return {mode:B.mode,margin:B.prof.S.margin,ttk:B.prof.S.ttk,reason:B.prof.S.reason}
})
check('first_projectile_opportunity_bounds_ttk', () => {
  const {B}=state(adaptive,{ammo:0,reload:2.4,targets:[{...target(1,60,10),hasLaser:false}]})
  assert.ok(B.prof.S.ttk>=2.4+60/B.me.gun.speed)
  assert.equal(B.prof.readyDamage(B.me.gun,60,B.target,2.4),0)
  return {ttk:B.prof.S.ttk}
})
check('unsupported_mortar_has_zero_finish_capacity', () => {
  const {B}=state(adaptive,{secondary:'mortar',targets:[target()]})
  assert.equal(B.prof.readyDamage(B.me.mortar,60,B.target,10),0)
  return {damage:0}
})
check('lightning_reserve_matches_ordinary_policy_budget', () => {
  const {B}=state(adaptive,{secondary:'lightning',energy:6,targets:[target(1,30)]})
  assert.equal(B.prof.readyDamage(B.me.lightning,30,B.target,4),0)
  B.me.energy=100
  assert.ok(B.prof.readyDamage(B.me.lightning,30,B.target,4)>0)
  assert.equal(B.prof.readyDamage(B.me.lightning,50,B.target,4),0)
  return {reserve:B.P.lightReserve,readyDamage:B.prof.readyDamage(B.me.lightning,30,B.target,4)}
})
check('raw_pitch_and_unsteady_long_flight_fail_closed', () => {
  const {B}=state(adaptive,{secondary:'laser',targets:[target()]})
  const high={...B.target,z:500}
  assert.equal(B.prof.readyDamage(B.me.laser,30,high,4),0)
  const moving={...B.target,steadySince:100,vx:0,vy:0}
  assert.equal(B.prof.readyDamage(B.me.gun,190,moving,4),0)
  return {laserHigh:0,gunUnsteady:0}
})
check('full_hp_low_energy_drop_is_explicit_reward', () => {
  const s=state(adaptive,{energy:1});const {B}=s
  B.drops=[{id:20000,x:15,y:0,radius:8,holder:-1,landsIn:0,captureS:4,progress:0}]
  B.prof.econ();decide(s);assert.equal(B.mode,'DROP');assert.ok(B.prof.S.dropValue>0)
  return {mode:B.mode,value:B.prof.S.dropValue,completion:B.prof.S.dropCompletion}
})
check('unneeded_extra_size_drop_is_rejected', () => {
  const s=state(adaptive,{cubes:10});const {B}=s
  B.drops=[{id:20000,x:15,y:0,radius:8,holder:-1,landsIn:0,captureS:4,progress:0}]
  B.prof.econ();decide(s);assert.equal(B.dropTask,null);assert.notEqual(B.loot?.type,'drop')
  return {mode:B.mode,value:B.prof.S.dropValue}
})
check('safe_owned_capture_can_restore_low_hp', () => {
  const s=state(adaptive,{hp:100,energy:1,lastHurt:99});const {B}=s
  B.drops=[{id:20000,x:0,y:0,radius:8,holder:0,landsIn:0,captureS:4,progress:3.8}]
  B.prof.econ();decide(s);assert.equal(B.mode,'DROP');assert.ok(B.prof.S.dropCompletion<0.21)
  return {mode:B.mode,completion:B.prof.S.dropCompletion}
})
check('contested_capture_never_invents_completion', () => {
  const s=state(adaptive,{hp:1000,targets:[target(1,5)]});const {B}=s
  B.drops=[{id:20000,x:0,y:0,radius:8,holder:0,landsIn:0,captureS:4,progress:3.8}]
  B.prof.econ();decide(s);assert.equal(B.dropTask,null)
  return {dropTask:B.dropTask,mode:B.mode}
})
check('lethal_drop_no_longer_precedes_retreat', () => {
  const s=state(adaptive,{hp:100,lastHurt:100,targets:[target(1,80)]});const {B}=s
  B.drops=[{id:20000,x:100,y:0,radius:8,holder:-1,landsIn:0,captureS:4,progress:0}]
  B.prof.econ();decide(s);assert.equal(B.dropTask,null);assert.equal(B.mode,'DISENGAGE')
  return {mode:B.mode,reason:B.prof.S.reason}
})
check('cached_grab_is_revalidated_after_new_danger', () => {
  const s=state(adaptive,{});const {B,obs}=s
  B.cubes.set(501,{id:501,x:10,y:0,z:0,seen:100});B.prof.econ();assert.ok(B.prof.S.grab)
  B.me.hp=100;B.me.hpf=100/1400;B.me.lastHurtT=100
  B.trackList=[target(1,60)];B.tracks=new Map([[1,B.trackList[0]]]);B.prof.update(obs);B.prof.selectTarget();decide(s)
  assert.equal(B.prof.S.grab,null);assert.equal(B.mode,'DISENGAGE')
  return {mode:B.mode,goalReason:B.prof.S.goalReason}
})
check('separate_calm_retreat_grab_cannot_bypass_budget', () => {
  const s=state(adaptive,{hp:100,lastHurt:100,targets:[target(1,80)]});const {B}=s
  B.cubes.set(501,{id:501,x:10,y:0,z:0,seen:100});B.grab={type:'cube',id:501,x:10,y:0,z:0,rush:false}
  decide(s);assert.equal(B.grab,null)
  return {mode:B.mode,goalReason:B.prof.S.goalReason}
})
check('recovery_does_not_farm_before_regen_starts', () => {
  const s=state(adaptive,{hp:800,lastHurt:95.1,lastDealt:90});const {B}=s
  B.crates.set(901,{id:901,x:30,y:0,z:0,seen:100,hp:300});B.prof.econ();decide(s)
  assert.equal(B.mode,'HEAL');assert.equal(B.prof.crateShot(),null);assert.equal(B.holdFire,true)
  return {mode:B.mode,recoverWait:B.prof.S.recoverWait,hold:B.holdFire}
})
check('live_dealt_damage_resets_recovery_wait', () => {
  const {B}=state(adaptive,{hp:800,lastHurt:90,lastDealt:99.9})
  assert.ok(B.prof.S.recoverWait>4.8)
  return {recoverWait:B.prof.S.recoverWait}
})
check('positive_ammo_fire_is_not_overwritten_by_quiet_reload', () => {
  const {B}=state(adaptive,{ammo:2,targets:[target(1,40,10)]})
  B.out.fire[B.me.gun.slot]=true;assert.equal(B.prof.wantReload(null),false)
  B.me.gun.ammo=0;assert.equal(B.prof.wantReload(null),true)
  return {positiveAmmo:false,emptyAmmo:true}
})
check('actual_firecontrol_keeps_ready_gun_shot_without_reload', () => {
  const {B}=decide(state(adaptive,{ammo:2,targets:[target(1,40,10)]}))
  makeFireControl(B).run()
  assert.equal(B.out.fire[B.me.gun.slot],true);assert.equal(B.out.reload,false)
  return {mode:B.mode,finish:B.prof.S.finishing,fire:B.out.fire[B.me.gun.slot],reload:B.out.reload}
})
check('different_shot_target_cannot_grant_finish_privilege', () => {
  const a={...target(1,220,25),lastDmgInT:96.5,dmgInD:220}, b={...target(2,20,250),lastDmgInT:-99}
  const {B}=state(adaptive,{hp:1000,ammo:2,targets:[a,b]})
  assert.equal(B.target.id,1);assert.equal(B.prof.S.shot.id,2);assert.equal(B.prof.S.finishing,false)
  return {target:B.target.id,shot:B.prof.S.shot.id,finish:B.prof.S.finishing}
})
check('known_live_armor_changes_incoming_not_zone_rules', () => {
  const s=state(adaptive,{targets:[target()]});const {B,obs}=s
  const plain=B.prof.S.incoming;obs.self.stats={...hello.config.mech,armor:0.24};B.prof.update(obs);B.prof.selectTarget()
  assert.ok(B.prof.S.incoming<plain)
  return {plain,armored:B.prof.S.incoming,armor:B.prof.S.armor}
})
check('observed_upgrade_and_ready_secondary_can_open_early', () => {
  const foe={...target(1,60,500),lastDmgInT:-99,hasLaser:false}
  const ready=decide(state(adaptive,{t:30,secondary:'laser',upgrades:['armor'],stats:{...hello.config.mech,armor:0.08},targets:[foe]})).B
  const noUpgrade=decide(state(adaptive,{t:30,secondary:'laser',targets:[foe]})).B
  assert.equal(ready.prof.S.setupEligible,true);assert.equal(ready.prof.S.phase,'open');assert.equal(ready.mode,'FIGHT');assert.equal(ready.prof.S.gateEndT,-1)
  assert.equal(noUpgrade.prof.S.phase,'gate');assert.equal(noUpgrade.target,null)
  return {readyMode:ready.mode,readyPhase:ready.prof.S.phase,gateEndT:ready.prof.S.gateEndT,noUpgradePhase:noUpgrade.prof.S.phase}
})
check('secondary_energy_loss_returns_to_early_gate', () => {
  const s=state(adaptive,{t:30,secondary:'lightning',energy:100,upgrades:['armor'],stats:{...hello.config.mech,armor:0.08},targets:[{...target(1,40,500),lastDmgInT:-99}]})
  const {B,obs}=s;assert.equal(B.prof.S.setupEligible,true)
  obs.t=35;obs.self.energy=0;B.tracks.clear();B.trackList=[];sense(B,obs);B.prof.update(obs);B.prof.selectTarget()
  assert.equal(B.prof.S.setupEligible,false);assert.equal(B.prof.S.phase,'gate');assert.equal(B.prof.S.gateEndT,-1)
  return {phase:B.prof.S.phase,energy:B.me.energy,gateEndT:B.prof.S.gateEndT}
})
check('early_open_still_rejects_losing_exchange', () => {
  const {B}=decide(state(adaptive,{t:30,hp:700,secondary:'laser',upgrades:['armor'],stats:{...hello.config.mech,armor:0.08},targets:[{...target(1,60,2500),lastDmgInT:-99}]}))
  assert.equal(B.prof.S.setupEligible,true);assert.equal(B.prof.S.phase,'open');assert.equal(B.prof.S.fight,false);assert.equal(B.mode,'DISENGAGE')
  return {phase:B.prof.S.phase,mode:B.mode,margin:B.prof.S.margin,reason:B.prof.S.reason}
})
check('adaptive_off_preserves_pre75_gate', () => {
  const {B}=state(adaptive,{adaptive:false,t:30,secondary:'laser',upgrades:['armor'],stats:{...hello.config.mech,armor:0.08},targets:[{...target(1,60,500),lastDmgInT:-99}]})
  assert.equal(B.prof.S.phase,'gate');assert.equal(B.prof.S.setupEligible,false);assert.equal(B.prof.S.gateEndT,-1)
  return {phase:B.prof.S.phase}
})
check('far_target_uses_admissible_existing_range_fallback', () => {
  const {B}=decide(state(adaptive,{secondary:'lightning',targets:[{...target(1,200,500),hasLaser:false}]}))
  assert.equal(B.prof.S.nominalHold,28);assert.equal(B.prof.S.rangeFallback,true);assert.ok(B.prof.S.hold>28)
  assert.ok(B.P.pfRanges.includes(B.prof.S.hold));assert.equal(B.mode,'FIGHT');assert.ok(B.prof.S.margin>0)
  B.prof.legs();assert.equal(B.rPrefNow,B.prof.S.hold)
  return {nominal:B.prof.S.nominalHold,chosen:B.prof.S.hold,executed:B.rPrefNow,margin:B.prof.S.margin,mode:B.mode}
})
check('admissible_close_band_is_retained_without_fallback', () => {
  const {B}=decide(state(adaptive,{secondary:'lightning',targets:[{...target(1,40,500),hasLaser:false}]}))
  assert.equal(B.prof.S.nominalHold,28);assert.equal(B.prof.S.rangeFallback,false);assert.equal(B.prof.S.hold,28);assert.equal(B.mode,'FIGHT')
  return {chosen:B.prof.S.hold,margin:B.prof.S.margin}
})
check('all_unsafe_bands_still_decline', () => {
  const {B}=decide(state(adaptive,{hp:10,lastHurt:100,secondary:'lightning',targets:[target(1,80,2500)]}))
  assert.equal(B.prof.S.fight,false);assert.equal(B.mode,'DISENGAGE');assert.equal(B.prof.S.rangeFallback,false)
  return {mode:B.mode,reason:B.prof.S.reason}
})
check('range_fallback_cannot_bypass_zone_budget', () => {
  const s=state(adaptive,{secondary:'lightning',targets:[{...target(1,200,500),hasLaser:false}]});const {B}=s
  Object.assign(B.zone,{r:20,nr:10,nrEff:10,t0:100,t1:101});B.prof.selectTarget();decide(s)
  assert.equal(B.prof.S.fight,false);assert.equal(B.prof.S.reason,'zone-budget')
  return {fight:B.prof.S.fight,reason:B.prof.S.reason}
})
check('charging_escape_energy_uses_effective_boost_speed', () => {
  const {B}=state(adaptive,{secondary:'laser',charge:0.3,energy:80})
  B.hide={state:'found',dist:50/B.P.pathFactor};B.prof.selectTarget()
  const charged=B.prof.S.escapeS
  assert.ok(Math.abs(charged-50/(B.me.walk*B.me.chargeMoveMult))<1e-9)
  B.me.laser.charge=0;B.prof.selectTarget();const released=B.prof.S.escapeS
  assert.ok(Math.abs(released-50/B.me.boostSpeed)<1e-9);assert.ok(charged>released)
  return {charged,released,energy:B.me.energy,boostDrain:B.prof.S.boostDrain}
})
const out={scope:'Own-source decision-unit tests; no simulated placement claim.',cases:rows.length,passed:rows.length,results:rows}
writeFileSync(`${root}/panel/mech/adaptive-round2-unit.json`,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify({cases:rows.length,passed:rows.length}))
