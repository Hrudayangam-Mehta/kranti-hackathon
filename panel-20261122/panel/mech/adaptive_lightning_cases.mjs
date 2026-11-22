import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
const root='/workspace/scratch/bde29dc281e6', candidate=`${root}/experiments/mech-adaptive-weapons/bot`, base=`${root}/experiments/mech-capture/bot`
const load=p=>import(pathToFileURL(p).href)
const {createBrain}=await load(`${candidate}/lib/brain.js`), {sense}=await load(`${candidate}/lib/senses.js`)
const {lightningRecipient,lightningEnergy}=await load(`${candidate}/lib/lightning.js`)
const {makeFireControl:fireNew}=await load(`${candidate}/lib/firecontrol.js`), {makeFireControl:fireOld}=await load(`${base}/lib/firecontrol.js`)
const hello=JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n')[0])
const results=[]; const check=(name,fn)=>{const detail=fn()||{};results.push({name,passed:true,...detail})}
function enemy(id=1,x=30,y=0,kind='mech') {return {id,x,y,z:0,vx:0,vy:0,vz:0,height:kind==='npc'?3.5:9,radius:kind==='npc'?1.8:2.5,hp:1400,maxHp:1400,npc:kind==='npc',listed:true,phantom:false,lastSeen:100,steadySince:0,revs:0,revT:[0,0,0,0],airborne:false,airT0:-99,dist:Math.hypot(x,y),bearing:Math.atan2(y,x),losOut:true,losIn:true,losOutT:100,hasMortar:false,rearOn:false,hasGun:true,hasLaser:false,hasLightning:false,lastDmgInT:-99,conf:1}}
function state() {
 const B=createBrain(hello,{world:null,nav:null},{warmup:false})._B
 sense(B,{type:'obs',tick:2000,t:100,alive:16,self:{id:0,pos:[0,0,0],vel:[0,0,0],aim:[0,0],hp:1400,max_hp:1400,energy:100,max_energy:100,grounded:true,cubes:0,upgrades:[],in_zone:true,stats:hello.config.mech,weapons:[{kind:'gun',cooldown:0,ammo:12,reload:0,stats:hello.config.weapons.gun},{kind:'lightning',cooldown:0,stats:hello.config.weapons.lightning}]},mechs:[],projectiles:[],sounds:[],beams:[],events:[],cubes:[],crates:[],pickups:[],drops:[]})
 B.p26on=true;B.tick=1000;B.holdFire=false;B.P.lightReserve=20;B.P.lightMinEnergy=6;B.P.boostReserve=25
 const tr=enemy();B.target=tr;B.trackList=[tr];B.tracks=new Map([[tr.id,tr]]);B.p26={gunTgt:-1}
 B.prof={rungs:[.5],fireTarget:()=>tr,laserVeto:()=>false,crateShot:()=>null,wantReload:()=>false,isLegal:t=>t.id===1}
 B.world={shotClear:()=>true};return B
}
const pos={x:0,y:0,z:0}
check('nearest_recipient_is_independent_of_track_order',()=>{const B=state();B.trackList=[enemy(2,40),enemy(1,30)];assert.equal(lightningRecipient(B,0,0,pos).object.id,1)})
check('nearer_crate_physically_intercepts_target',()=>{const B=state();B.crates.set(1000,{id:1000,x:20,y:0,z:0,seen:100,hp:300});const r=lightningRecipient(B,0,0,pos);assert.equal(r.object.id,1000);assert.equal(r.crate,true)})
check('nearer_drone_is_not_filtered_by_tactical_legality',()=>{const B=state();B.trackList.push(enemy(100,20,0,'npc'));assert.equal(lightningRecipient(B,0,0,pos).object.id,100)})
check('dead_stale_and_unlisted_recipients_are_not_physical_candidates',()=>{const B=state();B.trackList.push({...enemy(2,10),hp:0},{...enemy(3,12),listed:false});B.crates.set(1000,{id:1000,x:8,y:0,z:0,seen:99,hp:300});assert.equal(lightningRecipient(B,0,0,pos).object.id,1)})
check('line_obstruction_excludes_nearer_object',()=>{const B=state();B.trackList.push(enemy(2,15));B.world={shotClear:(ax,ay,az,bx)=>bx!==15};assert.equal(lightningRecipient(B,0,0,pos).object.id,1)})
check('barrel_prefix_cannot_skip_wall',()=>{const B=state();B.world={shotClear:(ax,ay,az,bx)=>!(ax===0&&bx===3)};assert.equal(lightningRecipient(B,0,0,pos),null)})
check('range_is_measured_in_three_dimensions',()=>{const B=state();B.trackList=[{...enemy(1,20),z:100}];assert.equal(lightningRecipient(B,0,0,pos),null)})
check('out_of_cone_object_does_not_block',()=>{const B=state();B.trackList.push(enemy(2,5,20));assert.equal(lightningRecipient(B,0,0,pos).object.id,1)})
check('equal_distance_tie_is_explicitly_ambiguous',()=>{const B=state();B.trackList=[enemy(1,30,1),enemy(2,30,-1)];assert.equal(lightningRecipient(B,0,0,pos).ambiguous,true)})
check('zero_lightning_weapon_has_no_recipient_or_energy',()=>{const B=state();B.me.lightning=null;assert.equal(lightningRecipient(B,0,0,pos),null);assert.equal(lightningEnergy(B),false)})
check('energy_floor_includes_one_actual_pulse',()=>{const B=state();B.me.energy=22.99;assert.equal(lightningEnergy(B),false);B.me.energy=23;assert.equal(lightningEnergy(B),true)})
check('energy_floor_includes_concurrent_ground_boost',()=>{const B=state();B.cmd.boost=true;B.me.energy=24.69;assert.equal(lightningEnergy(B),false);B.me.energy=24.7;assert.equal(lightningEnergy(B),true)})
check('upgraded_boost_drain_is_read_from_live_stats',()=>{const B=state();B.me.stats={...B.me.stats,boost_drain:8};B.cmd.boost=true;B.me.energy=23.8;assert.equal(lightningEnergy(B),true)})
check('airborne_energy_uses_jet_drain',()=>{const B=state();B.me.grounded=false;B.cmd.boost=true;B.me.stats={...B.me.stats,jet_drain:30};B.me.energy=25.9;assert.equal(lightningEnergy(B),false);B.me.energy=26;assert.equal(lightningEnergy(B),true)})
check('rapid_live_cooldown_counts_multiple_pulses',()=>{const B=state();B.me.lightning.cd=.04;B.me.energy=28.9;assert.equal(lightningEnergy(B),false);B.me.energy=29;assert.equal(lightningEnergy(B),true)})
check('zone_reserve_survives_finish_override',()=>{const B=state();B.killSecure=true;B.zoneUrgent=true;B.me.energy=27.9;assert.equal(lightningEnergy(B),false);B.me.energy=28;assert.equal(lightningEnergy(B),true)})
check('integrated_clear_shot_retains_trigger',()=>{const a=state(),b=state();fireOld(a).run();fireNew(b).run();assert.equal(a.out.fire[1],true);assert.equal(b.out.fire[1],true)})
check('integrated_near_crate_vetoes_wrong_arc',()=>{const a=state(),b=state();for(const B of[a,b])B.crates.set(1000,{id:1000,x:20,y:0,z:0,seen:100,hp:300});fireOld(a).run();fireNew(b).run();assert.equal(a.out.fire[1],true);assert.equal(b.out.fire[1],false);return{old:a.out.fire,new:b.out.fire}})
check('integrated_nearer_illegal_mech_vetoes_arc',()=>{const a=state(),b=state();for(const B of[a,b])B.trackList.unshift(enemy(2,15));fireOld(a).run();fireNew(b).run();assert.equal(a.out.fire[1],true);assert.equal(b.out.fire[1],false)})
check('integrated_recovery_hold_suppresses_lightning',()=>{const B=state();B.holdFire=true;fireNew(B).run();assert.equal(B.out.fire[1],false)})
const result={scope:'Analytic geometry and execution-unit counterexamples, not engine histories or score estimates.',count:results.length,passed:results.filter(x=>x.passed).length,results}
writeFileSync(`${root}/panel/mech/adaptive-lightning-cases.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,passed:result.passed}))
