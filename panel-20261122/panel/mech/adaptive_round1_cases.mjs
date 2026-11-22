import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const root = '/workspace/scratch/bde29dc281e6'
const load = (p) => import(pathToFileURL(p).href)
const { createBrain: capture } = await load(`${root}/experiments/mech-capture/bot/lib/brain.js`)
const { createBrain: push } = await load(`${root}/experiments/mech-pressure-cycle/bot/lib/brain.js`)
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
  const brain = factory(hello, { world: null, nav: null }, { warmup: false, prof: 'p26', env: 'squad', pressurePolicy: o.policy ?? 'push' })
  const B = brain._B
  const obs = { type: 'obs', tick: Math.round(t * 20), t, alive: o.alive ?? 16,
    self: { id: 0, pos: [0,0,0], vel: [0,0,0], aim: [0,0], hp: o.hp ?? 1400, max_hp: 1400,
      energy: o.energy ?? 100, max_energy: 100, grounded: true, cubes: o.cubes ?? 0, in_zone: true,
      upgrades: [], stats: hello.config.mech,
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

check('pressure_rank_is_identical_across_own_hp_and_alive', () => {
  const cases = []
  for (const policy of ['push','burst']) for (const hp of [1,1400]) for (const alive of [2,16]) {
    const {B} = decide(state(push,{policy,hp,alive,secondary:'laser',lastHurt:100,targets:[target()]}))
    cases.push({policy,hp,alive,score:B.pressure.state.score,mode:B.mode,hold:B.holdFire,ttk:B.pressure.state.ttk})
  }
  for (const policy of ['push','burst']) {
    const same = cases.filter(x=>x.policy===policy)
    assert.equal(new Set(same.map(x=>x.score)).size,1)
    assert.ok(same.every(x=>x.mode==='FIGHT' && x.hold===false))
  }
  return {cases}
})
check('capture_risk_estimate_changes_with_own_hp', () => {
  const cases=[1,1400].map(hp=>{
    const {B}=decide(state(capture,{hp,secondary:'laser',lastHurt:100,targets:[target()]}))
    return {hp,mode:B.mode,fight:B.prof.S.fight,ttk:B.prof.S.ttk,ttd:B.prof.S.ttd,latch:B.prof.S.latch}
  })
  assert.equal(cases[0].mode,'DISENGAGE')
  assert.ok(cases[1].ttd>cases[0].ttd)
  return {cases}
})
check('pressure_treats_support_as_ranking_only', () => {
  const foes=Array.from({length:12},(_,i)=>({...target(i+1,45+i*2,2500),y:(i%3)*7}))
  const {B}=decide(state(push,{hp:100,secondary:'laser',lastHurt:100,targets:foes}))
  const c=decide(state(capture,{hp:100,secondary:'laser',lastHurt:100,targets:foes})).B
  assert.equal(B.mode,'FIGHT');assert.equal(c.mode,'DISENGAGE');assert.ok(B.pressure.state.support>1)
  return {pressure:{mode:B.mode,support:B.pressure.state.support,ttk:B.pressure.state.ttk},capture:{mode:c.mode,ttd:c.prof.S.ttd,shooters:c.prof.S.shooters}}
})
check('pressure_prefers_lightning_range_without_energy_to_fire', () => {
  const {B}=decide(state(push,{secondary:'lightning',energy:6,ammo:0,reload:2.4,targets:[target(1,80)]}))
  const li=B.me.lightning, r=B.pressure.state.range
  assert.ok(r<li.range);assert.equal(B.weaponPolicy.energyOk(),false)
  const withLightning=B.pressure.damageRate(B.trackList[0],r)
  B.me.lightning=null;const withoutLightning=B.pressure.damageRate(B.trackList[0],r);B.me.lightning=li
  assert.ok(withLightning>withoutLightning)
  return {energy:B.me.energy,reserve:B.pressureEnergyReserve,pulseCost:li.energy,range:r,modelRateWithLightning:withLightning,modelRateWithoutLightning:withoutLightning,energyGate:false}
})
check('pressure_clears_safe_cube_route_to_next_upgrade', () => {
  const cases=[]
  for(const factory of [capture,push]) {
    const s=state(factory,{cubes:0}); const {B}=s
    B.cubes.set(501,{id:501,x:10,y:0,z:0,seen:100})
    B.prof.econ();const planned=B.prof.S.grab && B.prof.S.grab.type
    decide(s)
    if(B.pressure) B.pressure.legs()
    cases.push({name:factory===capture?'capture':'pressure',planned,mode:B.mode,grab:B.prof.S.grab?.type??null,leg:B.legKind,loot:B.loot?.type??null})
  }
  assert.equal(cases[0].mode,'LOOT');assert.equal(cases[0].grab,'cube')
  assert.equal(cases[1].grab,null);assert.equal(cases[1].loot,null);assert.equal(cases[1].mode,'HOLD')
  return {cases,firstThreshold:hello.config.cubes.upgrade_thresholds[0]}
})
check('capture_nominal_finish_ignores_observed_readiness', () => {
  const {B}=decide(state(capture,{hp:100,secondary:'laser',ammo:0,reload:2.4,secondaryCd:1.65,lastHurt:100,targets:[target(1,60,100)]}))
  assert.equal(B.prof.S.finishing,true);assert.equal(B.mode,'FIGHT');assert.equal(B.prof.S.latch,false)
  const gunFirst=Math.max(B.me.gun.cooldown,B.me.gun.reload)+60/B.me.gun.speed
  const laserFirst=B.me.laser.cooldown+B.me.laser.full
  assert.ok(gunFirst>B.P.pfFinishS && laserFirst>B.P.pfFinishS)
  return {mode:B.mode,finishing:B.prof.S.finishing,nominalTtk:B.prof.S.ttk,gunFirst,laserFirst,finishHorizon:B.P.pfFinishS,ttd:B.prof.S.ttd}
})
check('capture_drop_precedes_retreat_latch_even_if_completion_exceeds_ttd', () => {
  const s=state(capture,{hp:100,lastHurt:100,targets:[target(1,80)]});const {B}=s
  B.drops=[{id:20000,x:100,y:0,radius:8,holder:-1,landsIn:0,captureS:4,progress:0}]
  B.prof.econ();decide(s)
  assert.ok(B.prof.S.latch);assert.equal(B.mode,'DROP');assert.ok(B.dropTask.completion>B.prof.S.ttd)
  return {mode:B.mode,latch:B.prof.S.latch,completion:B.dropTask.completion,ttd:B.prof.S.ttd,dropX:B.dropTask.x}
})
check('capture_grab_precedes_retreat_latch', () => {
  const s=state(capture,{hp:450,lastHurt:100,targets:[target(1,80)]});const {B}=s
  B.cubes.set(501,{id:501,x:-10,y:0,z:0,seen:100});B.prof.econ();decide(s)
  assert.ok(B.prof.S.latch);assert.equal(B.mode,'LOOT');assert.equal(B.prof.S.grab.type,'cube')
  return {mode:B.mode,latch:B.prof.S.latch,ttd:B.prof.S.ttd,grab:B.prof.S.grab.type}
})
check('capture_full_hp_drop_still_exists_as_lower_priority_loot', () => {
  const s=state(capture,{hp:1400,energy:1});const {B}=s
  B.drops=[{id:20000,x:15,y:0,radius:8,holder:-1,landsIn:0,captureS:4,progress:0}]
  B.prof.econ();decide(s)
  assert.equal(B.dropTask,null);assert.equal(B.loot.type,'drop');assert.equal(B.mode,'LOOT')
  return {mode:B.mode,dropTask:B.dropTask,loot:B.loot.type,energy:B.me.energy}
})
check('capture_opportunistic_crate_shot_has_no_regen_guard', () => {
  const s=state(capture,{hp:800,lastHurt:95.1,lastDealt:90});const {B}=s
  B.mode='HEAL';B.crates.set(901,{id:901,x:30,y:0,z:0,seen:100,hp:300})
  const shot=B.prof.crateShot();assert.equal(shot.id,901)
  return {mode:B.mode,hp:B.me.hp,regenDelay:B.me.regenDelay,quietTime:B.me.t-Math.max(B.me.lastHurtT,B.me.lastDealtT),crateOffered:shot.id,scope:'hook result only; final firecontrol may still veto'}
})
check('pressure_upgrade_order_is_invariant_to_health_and_survivors', () => {
  const cases=[]
  for(const hp of [1,1400]) for(const alive of [2,16]) {
    const s=state(push,{hp,alive,secondary:'laser'});s.obs.offer={id:42,choices:[{id:'armor'},{id:'laser_damage'},{id:'nanites'}]}
    s.B.pressure.hands(s.obs);cases.push({hp,alive,pick:s.obs.offer.choices[s.B.out.pick].id})
  }
  assert.ok(cases.every(x=>x.pick==='laser_damage'))
  return {cases}
})

const out={scope:'Decision-unit counterfactual states using unmodified own source; no map simulation, engine-reachability or placement claim.',cases:rows.length,passed:rows.length,results:rows}
writeFileSync(`${root}/panel/mech/adaptive-round1-cases.json`,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify({cases:rows.length,passed:rows.length}))
