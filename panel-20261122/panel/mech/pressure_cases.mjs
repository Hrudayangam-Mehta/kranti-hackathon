import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const tree = process.env.MECH_TREE || `${root}/experiments/mech-pressure/bot`
const base = `${root}/experiments/mech-capture/bot`
const load = (p) => import(pathToFileURL(p).href)
const { createBrain } = await load(`${tree}/lib/brain.js`)
const { createBrain: createBase } = await load(`${base}/lib/brain.js`)
const { sense } = await load(`${tree}/lib/senses.js`)
const hello = JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n', 1)[0])
const clone = (x) => JSON.parse(JSON.stringify(x))
const results = []
function check(name, fn) { const detail = fn() || {}; results.push({ name, passed: true, ...detail }) }

function observation(opts = {}) {
  const t = opts.t ?? 30
  return { type: 'obs', tick: Math.round(t * 20), t, alive: opts.alive ?? 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: opts.hp ?? 1000, max_hp: 1400,
      energy: opts.energy ?? 100, max_energy: 100, grounded: true, cubes: opts.cubes ?? 0, in_zone: true,
      upgrades: opts.upgrades ?? [], stats: hello.config.mech,
      weapons: [{ kind: 'gun', cooldown: opts.gunCd ?? 0, ammo: opts.ammo ?? 12, reload: opts.reload ?? 0, stats: hello.config.weapons.gun },
        opts.secondary ? { kind: opts.secondary, cooldown: opts.laserCd ?? 0, charge: opts.charge ?? 0, stats: hello.config.weapons[opts.secondary] } : null] },
    mechs: opts.mechs ?? [], projectiles: [], sounds: [], beams: [], events: [], cubes: [], crates: [], pickups: [], drops: [],
    zone: { center: [0, 0], radius: 500, next_center: [0, 0], next_radius: 300, shrink_start: t + 60, shrink_end: t + 110, dps: 20 },
    offer: opts.offer ?? null }
}
function target(id = 1, x = 70, y = 0, hp = 1400) {
  return { id, x, y, z: 0, vx: 0, vy: 0, vz: 0, npc: false, phantom: false, hp, maxHp: 1400, conf: 1, lastSeen: 30,
    listed: true, losOut: true, losIn: true, dist: Math.hypot(x, y), height: 9, radius: 2.5, hasLightning: false, hasMortar: false,
    lastDmgInT: -99, lastDmgOutT: -99, steadySince: 0, bearing: Math.atan2(y, x), revs: 0, airborne: false, hostile: false }
}
function state(opts = {}) {
  const h = opts.baseArmor === undefined ? hello : { ...hello, config: { ...hello.config, mech: { ...hello.config.mech, armor: opts.baseArmor } } }
  const brain = createBrain(h, { world: null, nav: null }, { warmup: false, pressurePolicy: opts.policy ?? 'push' })
  const B = brain._B, obs = observation(opts)
  sense(B, obs)
  B.trackList = (opts.targets ?? []).map((x) => ({ ...x, lastSeen: opts.t ?? 30 }))
  B.p26on = opts.profile !== false
  B.pressure.update(obs)
  return { B, obs, brain, p: B.pressure }
}

check('no_upgrade_no_commit', () => { const {p} = state({ secondary: 'laser' }); assert.equal(p.active(), false) })
check('secondary_and_actual_upgrade_commits', () => {
  const {p} = state({ secondary: 'laser', upgrades: ['gun_damage'] })
  assert.equal(p.active(), true); assert.equal(p.state.reason, 'secondary-and-upgrade')
})
check('configured_threshold_requires_pending_offer', () => {
  const cubes = hello.config.cubes.upgrade_thresholds[0]
  assert.equal(state({ secondary: 'laser', cubes }).p.active(), false)
  const {B,obs,p} = state({ secondary: 'laser', cubes, offer: { id: 1, choices: [{id:'plating'},{id:'laser_damage'}] } })
  assert.equal(p.active(), true); p.hands(obs); assert.equal(B.out.pick, 1)
  return { configured_first_threshold: cubes }
})
check('upgraded_gun_deadline_boundary', () => {
  assert.equal(state({t:59.9,upgrades:['gun_damage']}).p.active(), false)
  const {p} = state({t:60,upgrades:['gun_damage']}); assert.equal(p.active(),true); assert.equal(p.state.reason,'upgraded-gun-deadline')
})
check('armed_deadline_boundary', () => {
  assert.equal(state({t:89.9}).p.active(),false)
  const {p}=state({t:90}); assert.equal(p.active(),true);assert.equal(p.state.reason,'armed-deadline')
})
check('latch_persists_after_health_and_weapon_loss', () => {
  const {B,p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target()]})
  const next=observation({t:31,hp:1});sense(B,next);B.trackList=[{...target(),lastSeen:31}];p.update(next);p.mode()
  assert.equal(p.active(),true);assert.equal(B.mode,'FIGHT');assert.equal(B.holdFire,false);assert.equal(B.losing,false)
})
check('no_armed_weapon_does_not_force_commit', () => {
  const {B,p,obs}=state({policy:'push'});obs.t=100;obs.self.weapons=[null,null];sense(B,obs);p.update(obs);assert.equal(p.active(),false)
})
check('after_setup_global_ffa_attack_is_explicit', () => {
  const {B,p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target()]})
  B.env='FFA';B.foreignDeaths=3;B.holdFire=true;B.holdFirst=true;p.mode()
  assert.equal(B.mode,'FIGHT');assert.equal(B.holdFire,false);assert.equal(B.holdFirst,false);assert.equal(p.legal(B.trackList[0]),true)
})
check('low_hp_and_many_supporters_never_veto_combat', () => {
  const list=Array.from({length:15},(_,i)=>target(i+1,45+i,5*(i%3),2500))
  const {B,p}=state({secondary:'laser',upgrades:['gun_damage'],hp:1,targets:list});p.mode()
  assert.equal(B.mode,'FIGHT');assert.ok(p.state.target);assert.equal(B.losing,false);assert.equal(B.holdFire,false)
})
check('finishing_target_priority', () => {
  const {p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,80,0,100),target(2,40,0,1400)]})
  assert.equal(p.state.target.id,1);assert.equal(p.state.finish,true)
})
check('isolation_ranks_without_eliminating_supported_targets', () => {
  const {p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,60,0,1400),target(2,-60,0,1400),target(3,55,10,2500),target(4,62,-10,2500)]})
  assert.equal(p.state.target.id,2)
})
check('reachable_opponent_ranked_ahead_of_blocked_component', () => {
  const {B,p,obs}=state({secondary:'laser',upgrades:['gun_damage'],targets:[{...target(1,60,0,1000),losOut:false},{...target(2,-60,0,1000),losOut:false}]})
  B.nav={component:(x)=>x>0?1:0};p.update(obs);assert.equal(p.state.target.id,2)
  B.trackList=[B.trackList[0]];p.update(obs);assert.equal(p.state.target.id,1)
})
check('target_hysteresis_keeps_near_equal_choice', () => {
  const {B,p,obs}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,65,0,900),target(2,-65,0,910)]})
  assert.equal(p.state.target.id,1);B.trackList[1].hp=899;B.me.t+=0.1;p.update(obs);assert.equal(p.state.target.id,1)
})
check('dead_npc_and_stale_candidates_excluded', () => {
  const {B,p,obs}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,40,0,0),{...target(2,40),npc:true},target(3,80)]})
  B.trackList[2].lastSeen=0;p.update(obs);assert.equal(p.state.target,null)
})
check('commit_discards_remote_loot_and_heal_modes', () => {
  const {B,p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target()]})
  B.loot={type:'crate'};B.grab={type:'cube'};B.dropTask={ours:true};B.mode='HEAL';B.p26.latch=true;p.mode()
  assert.equal(B.loot,null);assert.equal(B.grab,null);assert.equal(B.dropTask,null);assert.equal(B.mode,'FIGHT');assert.equal(B.p26.latch,false)
})
check('near_complete_owned_capture_has_bounded_grace', () => {
  const {B,p,obs}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target()]})
  B.drops=[{id:20000,x:0,y:0,radius:8,holder:0,landsIn:0,captureS:4,progress:3.8}]
  p.update(obs);p.mode();assert.equal(B.mode,'DROP');assert.equal(p.state.phase,'capture-finish');p.legs();assert.equal(B.legKind,'pressure-capture-finish')
  B.me.t+=0.31;p.update(obs);p.mode();assert.equal(B.mode,'FIGHT');assert.equal(B.dropTask,null)
})
check('contested_or_distant_capture_does_not_divert_commit', () => {
  const {B,p,obs}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,5,0)]})
  B.drops=[{id:20000,x:0,y:0,radius:8,holder:0,landsIn:0,captureS:4,progress:3.8}]
  p.update(obs);p.mode();assert.equal(B.mode,'FIGHT')
  B.trackList=[target(1,70,0)];B.drops[0].x=20;p.update(obs);p.mode();assert.equal(B.mode,'FIGHT')
})
check('cooldown_and_reload_readiness_use_maximum', () => {
  const a=state({t:90,ammo:0,reload:0.1,gunCd:2,targets:[target()]})
  assert.equal(a.p.burstDamage(a.B.trackList[0],70),0)
})
check('immediate_zone_motion_retained', () => {
  const {B,p}=state({secondary:'laser',upgrades:['gun_damage'],targets:[target()]})
  B.zoneUrgent=true;B.zoneMargin=-1;B.me.inZone=false;p.mode();assert.equal(B.mode,'ZONE');assert.equal(p.legs(),true);assert.equal(B.noCharge,true)
})
check('no_enemy_means_active_search', () => {
  const {B,p}=state({t:90});p.mode();assert.equal(p.legs(),true)
  assert.equal(p.state.phase,'seek');assert.ok(B.legKind.startsWith('pressure-'));assert.ok(Number.isFinite(B.cmd.mx));assert.ok(Number.isFinite(B.cmd.my))
})
check('burst_variant_cycles_only_when_channels_recharge', () => {
  const {B,p}=state({policy:'burst',secondary:'laser',upgrades:['gun_damage'],ammo:0,reload:2,laserCd:1,targets:[target()]})
  p.mode();p.legs();assert.equal(p.state.phase,'cycle');assert.ok(B.rPrefNow>p.state.range)
  B.me.gun.ammo=12;B.me.gun.reload=0;B.me.gun.cooldown=0;p.mode();p.legs();assert.equal(p.state.phase,'commit')
})
check('push_variant_does_not_cycle_when_channels_recharge', () => {
  const {p}=state({secondary:'laser',upgrades:['gun_damage'],ammo:0,reload:2,laserCd:1,targets:[target()]})
  p.mode();p.legs();assert.equal(p.state.phase,'commit')
})
check('pressure_energy_reserve_is_finite_and_observed', () => {
  const {B,p}=state({secondary:'lightning',upgrades:['gun_damage'],energy:5,targets:[target()]})
  assert.equal(B.pressureEnergyReserve,6);p.mode();p.legs();assert.equal(B.cmd.boost,false)
})
check('gun_refill_time_affects_burst_estimate', () => {
  const a=state({t:90,targets:[target()]});const b=state({t:90,ammo:0,reload:2,targets:[target()]})
  assert.ok(a.p.burstDamage(a.B.trackList[0],70)>b.p.burstDamage(b.B.trackList[0],70))
})
check('known_nonzero_base_armor_reduces_both_damage_estimates', () => {
  const a=state({t:90,baseArmor:0,targets:[target()]}),b=state({t:90,baseArmor:0.2,targets:[target()]})
  assert.ok(Math.abs(b.p.burstDamage(b.B.trackList[0],70)-0.8*a.p.burstDamage(a.B.trackList[0],70))<1e-9)
  assert.ok(Math.abs(b.p.damageRate(b.B.trackList[0],70)-0.8*a.p.damageRate(a.B.trackList[0],70))<1e-9)
})
check('closing_lightning_tactical_charge_veto_is_bypassed_only_after_commit', () => {
  const foe={...target(2,60,0,10000),vx:-6,hasLightning:true}
  const before=state({secondary:'laser',targets:[target(1,80),foe]})
  assert.equal(before.p.active(),false);assert.equal(before.B.prof.laserVeto(before.B.trackList[0]),true)
  const after=state({secondary:'laser',upgrades:['gun_damage'],targets:[target(1,80),foe]})
  assert.equal(after.p.active(),true);assert.equal(after.p.state.target.id,1);assert.equal(after.B.prof.laserVeto(after.B.trackList[0]),false)
})
check('positive_ammo_fired_gun_is_not_manually_reloaded', () => {
  const {B,p,obs}=state({policy:'burst',secondary:'laser',upgrades:['gun_damage'],ammo:1,charge:0.6,targets:[target()]})
  B.out.fire[B.me.gun.slot]=true;p.hands(obs);assert.equal(B.out.reload,false)
})
check('cooling_positive_ammo_gun_can_use_covered_reload', () => {
  const {B,p,obs}=state({policy:'burst',secondary:'laser',upgrades:['gun_damage'],ammo:1,gunCd:0.2,charge:0.6,targets:[target()]})
  B.out.fire[B.me.gun.slot]=false;p.hands(obs);assert.equal(B.out.reload,true)
})
check('empty_gun_refill_is_retained', () => {
  const {B,p,obs}=state({policy:'burst',secondary:'laser',upgrades:['gun_damage'],ammo:0,charge:0.6,targets:[target()]})
  B.out.fire[B.me.gun.slot]=true;p.hands(obs);assert.equal(B.out.reload,true)
})
check('combat_upgrade_order_differs_by_hypothesis', () => {
  const offer={id:1,choices:[{id:'gun_rate'},{id:'gun_damage'},{id:'gyros'}]}
  const a=state({secondary:'laser',upgrades:['gun_damage'],offer});const b=state({policy:'burst',secondary:'laser',upgrades:['gun_damage'],offer})
  a.p.hands(a.obs);b.p.hands(b.obs);assert.equal(a.B.out.pick,0);assert.equal(b.B.out.pick,1)
})
check('all_upgrade_choices_answered_with_valid_index', () => {
  const {B,p,obs}=state({t:90,offer:{id:1,choices:[{id:'unknown-a'},{id:'unknown-b'},{id:'unknown-c'}]}})
  p.hands(obs);assert.ok(Number.isInteger(B.out.pick)&&B.out.pick>=0&&B.out.pick<=2)
})

const enemy={id:1,kind:'mech',pos:[80,0,0],vel:[0,0,0],aim:[Math.PI,0],hp:1000,max_hp:1400,cubes:0,weapons:['gun'],charging:false}
check('feature_off_full_brain_action_identity', () => {
  const a=createBase(hello,{world:null,nav:null},{warmup:false}),b=createBrain(hello,{world:null,nav:null},{warmup:false,pressurePolicy:'off',weaponCycle:false})
  for(const t of [0.1,10,30,60,90,120]) {
    const o=observation({t,secondary:'laser',upgrades:['gun_damage'],mechs:[enemy]})
    assert.deepEqual(a.act(clone(o),performance.now()+1000),b.act(clone(o),performance.now()+1000))
  }
})
check('before_setup_full_brain_action_identity', () => {
  const a=createBase(hello,{world:null,nav:null},{warmup:false}),b=createBrain(hello,{world:null,nav:null},{warmup:false,weaponCycle:false})
  for(const t of [0.1,10,20,30,59.9]) {
    const o=observation({t,mechs:[enemy]})
    assert.deepEqual(a.act(clone(o),performance.now()+1000),b.act(clone(o),performance.now()+1000))
  }
})
check('committed_low_hp_full_brain_returns_finite_combat_actions', () => {
  for(const policy of ['push','burst']) {
    const b=createBrain(hello,{world:null,nav:null},{warmup:false,pressurePolicy:policy})
    for(const t of [100,100.1,100.2]) {
      const o=observation({t,hp:1,secondary:'laser',upgrades:['gun_damage'],mechs:[enemy]})
      const a=b.act(o,performance.now()+1000),s=b.debugState()
      assert.equal(s.mode,'FIGHT');assert.equal(s.pressure.active,true);assert.deepEqual(s.errors,{})
      assert.ok(a.move.every(Number.isFinite));assert.ok(a.aim.every(Number.isFinite));assert.ok(a.fire.every(x=>typeof x==='boolean'))
    }
  }
})

writeFileSync(process.env.MECH_REPORT || `${root}/panel/mech/pressure-cases.json`,JSON.stringify({tree,context:'bounded unit and full-brain policy fixtures, warmup disabled, no match ranking or engine equivalence claim',count:results.length,passed:results.length,results},null,2)+'\n')
console.log(JSON.stringify({count:results.length,passed:results.length}))
