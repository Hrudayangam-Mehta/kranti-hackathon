// Independent runtime stimulus, NOT a game simulation or feasible complete match.
// Each observation obeys the original config, real map and phase-derived zone.
// Blocks deliberately stitch different resource/contact counterfactuals.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { root, load, clone, hello, cfg, context, layout, point, actor, observation, drop, validateIndividual, zoneEdgePoint } from './adaptive-fixtures.mjs'

const path = `${root}/panel/mech/adaptive-active300-complete`
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['mech-capture','mech-adaptive','mech-adaptive-weapons']
const hash = b => createHash('sha256').update(b).digest('hex')
const entries = []
function block(label,start,make) {
  for (let i=0;i<25;i++) {
    const t = Math.round((start+i*.1)*10)/10, o = observation({...make(i,t),t})
    validateIndividual(o)
    entries.push({label,o})
  }
}
const near = layout.points[25], mid = layout.points[75], far = point(layout.self.x+198,layout.self.y)
block('early_ready_secondary',30,i=>({cubes:1,upgrades:['armor'],secondary:'laser',second:{charge:(i%8)*.1},mechs:[actor(mid,{hp:i%5===0?100:700})],aimAt:mid}))
block('early_reserved_lightning_capacity',32.5,i=>({cubes:1,upgrades:['armor'],secondary:'lightning',energy:i%4<2?38:35,second:{cooldown:i%4<2?0:.15},mechs:[actor(near,{hp:500})],aimAt:near}))
block('early_losing_exchange',35,i=>({cubes:1,upgrades:['armor'],hp:100+i%5*25,secondary:'laser',second:{cooldown:1.65},mechs:[actor(layout.points[35],{weapons:['gun','laser']}),actor(mid,{id:2,weapons:['gun']})],events:i%5===0?[{type:'damaged',amount:45,weapon:'gun',bearing:0,by:1}]:[]}))
block('farther_admissible_range',100,i=>({secondary:'lightning',mechs:[actor(far,{hp:500})],aimAt:far}))
block('full_hp_energy_threshold_drop',102.5,i=>({cubes:2,upgrades:['armor'],energy:5,drops:[drop(layout.points[35])]}))
block('owned_capture_progress',105,i=>({cubes:2,upgrades:['armor'],hp:600,energy:50,drops:[drop(layout.self,{holder:hello.slot,progress:.5+i*.1})]}))
block('contested_capture',107.5,i=>({cubes:2,upgrades:['armor'],hp:600,energy:50,drops:[drop(layout.self,{holder:hello.slot,progress:2.9})],mechs:[actor(layout.points[8],{weapons:['gun','laser'],charging:i%5===0})],aimAt:layout.points[8]}))
block('recovery_farming_suppression',115,i=>({cubes:6,upgrades:['armor','nanites','servos'],hp:600,energy:60,crates:[{id:1001,pos:[near.x,near.y,near.z],hp:300}],events:i===0?[{type:'hit',target:1001,amount:45,weapon:'gun'}]:[]}))
block('reload_and_laser_short',117.5,i=>({cubes:1,upgrades:['armor'],gun:{ammo:0,reload:2.4-(i%5)*.1},secondary:'laser',second:{charge:0,cooldown:2-(i%5)*.1},mechs:[actor(near,{hp:500,weapons:['gun','lightning']})],aimAt:near,events:i%5===0?[{type:'effect',effect:'short',by:1}]:[]}))
block('charged_laser_finish',120,i=>({cubes:1,upgrades:['armor'],gun:{ammo:0,reload:1.2},secondary:'laser',second:{charge:.75},mechs:[actor(mid,{hp:100,weapons:['gun','mortar']})],aimAt:mid}))
block('mortar_with_busy_gun',122.5,i=>({gun:{ammo:0,reload:2.4},secondary:'mortar',mechs:[actor(mid,{hp:500})],aimAt:mid}))
block('actual_phase_zone_exit',170,(i,t)=>({pos:zoneEdgePoint(t),hp:600}))
assert.equal(entries.length,300)
assert.ok(entries.every((e,i)=>i===0||e.o.t>entries[i-1].o.t))
// Required transport termination only. These numbers are synthetic placeholders,
// not a scored result or a claim about this stitched input's outcome.
const end={type:'end',place:16,kills:0}
const jsonl=[hello,...entries.map(e=>e.o),end].map(x=>JSON.stringify(x)).join('\n')+'\n'
const compressed=gzipSync(jsonl,{mtime:0})
writeFileSync(`${path}.jsonl.gz`,compressed)
writeFileSync(`${path}.observations.jsonl`,entries.map(e=>JSON.stringify(e.o)).join('\n')+'\n')

const coverage=[]
for(const name of names) {
  const tree=`${root}/experiments/${name}/bot`, {createBrain}=await load(`${tree}/lib/brain.js`)
  const br=createBrain(clone(hello),context,{warmup:false,fuseMs:1e8})
  const calls={selectTarget:0,decideMode:0,legs:0,legsHandled:0}, modes={}, phases={}, reasons={}, groups={}, actions=[]
  for(const key of ['selectTarget','decideMode','legs']) {
    const old=br._B.prof[key]
    br._B.prof[key]=function(...args){calls[key]++;const r=old(...args);if(key==='legs'&&r)calls.legsHandled++;return r}
  }
  let active=0,zone=0,early=0,fallback=0,finish=0,recovery=0
  const add=(map,key)=>map[key]=(map[key]||0)+1
  for(const {label,o} of entries) {
    const a=br.act(clone(o),performance.now()+1e7), B=br._B,S=B.prof.S
    assert.equal(B.counters.errors,0);assert.equal(B.counters.fuse,0)
    assert.ok(a.move.every(Number.isFinite));assert.ok(Math.hypot(...a.move)<=1.000001);assert.ok(a.aim.every(Number.isFinite))
    assert.ok(a.fire.every(x=>typeof x==='boolean'))
    active+=B.p26on===true;zone+=B.zoneUrgent===true;early+=S.setupEligible===true;fallback+=S.rangeFallback===true;finish+=S.finishing===true;recovery+=S.recovering===true
    add(modes,B.mode);add(phases,S.phase);add(reasons,S.reason||'legacy')
    const g=groups[label]??={count:0,modes:{},reasons:{},active:0,zone:0,rangeFallback:0}
    g.count++;g.active+=B.p26on===true;g.zone+=B.zoneUrgent===true;g.rangeFallback+=S.rangeFallback===true;add(g.modes,B.mode);add(g.reasons,S.reason||'legacy')
    actions.push(a)
  }
  coverage.push({candidate:name,prof_sha256:hash(readFileSync(`${tree}/lib/prof.js`)),params_sha256:hash(readFileSync(`${tree}/lib/params.js`)),calls,active,zone,early,rangeFallback:fallback,finishing:finish,recovering:recovery,modes,phases,reasons,groups,action_sha256:hash(JSON.stringify(actions)),actions})
}
const baseline=coverage.find(c=>c.candidate==='mech-capture')
if(baseline)for(const c of coverage) {
  if(c===baseline)continue
  c.changed={any:0,move:0,boost:0,aim:0,fire:0,take:0,drop:0,pick:0}
  c.actions.forEach((a,i)=>{const b=baseline.actions[i];if(JSON.stringify(a)!==JSON.stringify(b))c.changed.any++;for(const k of Object.keys(c.changed).filter(k=>k!=='any'))if(JSON.stringify(a[k])!==JSON.stringify(b[k]))c.changed[k]++})
}
for(const c of coverage)delete c.actions
const metadata={recorded_utc:new Date().toISOString(),scope:'300 individually config/map/zone-constrained counterfactual observations, stitched into a monotone runtime stimulus. Resource/equipment/position/contact transitions between and within blocks are not a generated or claimed feasible complete match. No score or causal-performance evidence. Terminal end fields are synthetic IO termination markers, not a scored outcome.',input:`${path}.jsonl.gz`,gzip_sha256:hash(compressed),jsonl_sha256:hash(jsonl),messages:302,observations:300,terminal_end:end,hello_config_sha256:hash(JSON.stringify(cfg)),fixture_helper_sha256:hash(readFileSync(`${root}/panel/mech/adaptive-fixtures.mjs`)),constructor_sha256:hash(readFileSync(new URL(import.meta.url))),time_min:entries[0].o.t,time_max:entries.at(-1).o.t,groups:entries.reduce((a,e)=>(a[e.label]=(a[e.label]||0)+1,a),{}),coverage}
writeFileSync(`${path}.json`,JSON.stringify(metadata,null,2)+'\n')
console.log(JSON.stringify({path:`${path}.jsonl.gz`,sha256:metadata.gzip_sha256,observations:300,coverage:coverage.map(c=>({candidate:c.candidate,calls:c.calls,active:c.active,modes:c.modes,early:c.early,rangeFallback:c.rangeFallback,changed:c.changed}))}))
