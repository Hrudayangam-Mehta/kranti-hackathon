import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
const root='/workspace/scratch/bde29dc281e6', tree=`${root}/experiments/mech-adaptive-weapons/bot`, load=p=>import(pathToFileURL(p).href)
const {createBrain}=await load(`${tree}/lib/brain.js`), {sense}=await load(`${tree}/lib/senses.js`), {makeLoadout}=await load(`${tree}/lib/loadout.js`)
const hello=JSON.parse(gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().split('\n')[0])
const results=[],check=(name,fn)=>{const detail=fn()||{};results.push({name,passed:true,...detail})}
function state(opts={}) {
 const B=createBrain(hello,{world:null,nav:null},{warmup:false,env:'squad',adaptiveEquipment:true})._B
 const kinds=opts.kinds??['gun','laser'], ws=kinds.map(kind=>kind?{kind,cooldown:0,ammo:12,reload:0,charge:0,stats:structuredClone(hello.config.weapons[kind])}:null)
 sense(B,{type:'obs',tick:2000,t:100,alive:16,self:{id:0,pos:[0,0,0],vel:[0,0,0],aim:[0,0],hp:opts.hp??1400,max_hp:1400,energy:opts.energy??100,max_energy:100,grounded:true,cubes:opts.cubes??0,upgrades:opts.upgrades??[],in_zone:true,stats:structuredClone(hello.config.mech),weapons:ws},mechs:[],projectiles:[],events:[],cubes:[],crates:[],pickups:[],drops:[],sounds:[],beams:[]})
 B.p26on=true;B.env='SQUAD';B.aliveN=16;B.zoneUrgent=false;B.foreignDeaths=0;B.tick=1000
 const x=opts.distance??30,z=opts.height??0
 const tr={id:1,x,y:0,z,vx:0,vy:0,vz:0,yaw:Math.PI,pitch:0,height:9,radius:2.5,hp:1400,maxHp:1400,npc:false,phantom:false,listed:true,losOut:true,losIn:true,lastSeen:100,steadySince:0,dist:Math.hypot(x,z),bearing:0,revs:0,airborne:false,airT0:-99,hasGun:true,hasLaser:false,hasLightning:false,hasMortar:false,lastDmgInT:100,conf:1}
 B.trackList=[tr];B.target=tr;B.tracks=new Map([[1,tr]])
 return {B,tr,policy:makeLoadout(B)}
}
check('upgrade_effect_descriptors_survive_normalization',()=>{const{B}=state();assert.equal(B.cfg.upgrades.length,hello.config.upgrades.length);assert.deepEqual(B.cfg.upgrades,hello.config.upgrades)})
check('prospective_weapon_preserves_owned_upgrade_once',()=>{const{policy}=state({upgrades:['laser_damage'],cubes:1});assert.equal(policy.prospective('laser').damage,315*1.18)})
check('unknown_dropped_gun_is_not_a_free_refill',()=>{const{policy}=state();const w=policy.prospective('gun');assert.equal(w.ammo,0);assert.equal(w.reload,w.cooldown+w.reloadS);return {equip:w.cooldown,conservativeFirstReload:w.reload}})
check('same_kind_is_never_equipped_twice',()=>{const{policy}=state();assert.equal(policy.pickup('laser',{drop:0}),null)})
check('horizontal_distance_is_not_double_counted',()=>{const{B,tr,policy}=state({distance:40,height:20});const a=policy.damage(B.me.gun,tr),b=B.prof.readyDamage(B.me.gun,40,tr,4);assert.equal(a,b);return {damage:a,feetDistance:tr.dist,horizontal:40}})
check('newly_reachable_lightning_upgrade_has_positive_value',()=>{const{B,tr,policy}=state({kinds:[null,'lightning'],distance:47});const u=B.cfg.upgrades.find(u=>u.id==='lightning_range');assert.equal(policy.damage(B.me.lightning,tr),0);const score=policy.utility(u,tr,4);assert.ok(score>0);assert.equal(policy.pick([{id:'sensors'},{id:'armor'},{id:'lightning_range'}],1),2);return {utility:score}})
check('energy_efficiency_can_enable_an_unaffordable_pulse',()=>{const{B,tr,policy}=state({kinds:[null,'lightning']});B.me.energy=B.P.lightReserve+2;assert.equal(policy.damage(B.me.lightning,tr),0);const score=policy.utility(B.cfg.upgrades.find(u=>u.id==='lightning_efficiency'),tr,4);assert.ok(score>0);return{utility:score,energy:B.me.energy}})
check('absent_weapon_upgrade_has_no_invented_output',()=>{const{B,tr,policy}=state({kinds:['gun',null]});assert.equal(policy.utility(B.cfg.upgrades.find(u=>u.id==='laser_damage'),tr,4),null)})
check('unknown_or_unmodeled_upgrade_retains_stable_fallback',()=>{const{policy}=state();assert.equal(policy.pick([{id:'unknown'},{id:'sensors'},{id:'capacitor'}],2),2)})
check('plating_and_armor_use_current_configured_ratios',()=>{const{B,tr,policy}=state();const p=policy.utility(B.cfg.upgrades.find(u=>u.id==='plating'),tr,4),a=policy.utility(B.cfg.upgrades.find(u=>u.id==='armor'),tr,4);assert.ok(Math.abs(p-.15)<1e-12);assert.ok(Math.abs(a-(1/(1-.08)-1))<1e-12);return{plating:p,armor:a}})
check('projection_does_not_mutate_authoritative_stats',()=>{const{B,tr,policy}=state();const before=JSON.stringify({w:B.me.weapons,s:B.me.stats,c:B.cfg});for(const u of B.cfg.upgrades)policy.utility(u,tr,4);assert.equal(JSON.stringify({w:B.me.weapons,s:B.me.stats,c:B.cfg}),before)})
check('far_lightning_does_not_displace_ranged_pair',()=>{const{policy}=state({distance:130});assert.equal(policy.pickup('lightning',{drop:1}),null)})
check('close_cooling_pair_can_replace_gun_after_confirmation',()=>{const{B,policy}=state();B.me.gun.ammo=0;B.me.gun.reload=2.4;B.me.laser.cooldown=1.65;assert.equal(policy.pickup('lightning',null),null);B.me.t+=.1;assert.equal(policy.pickup('lightning',null),null);B.me.t+=.1;const decision=policy.pickup('lightning',null);assert.deepEqual(decision,{drop:0});return {decision}})
check('charging_laser_slot_is_locked',()=>{const{B,policy}=state();B.me.gun.ammo=0;B.me.gun.reload=2.4;B.me.laser.charge=.5;policy.pickup('lightning',null);B.me.t+=.2;const d=policy.pickup('lightning',null);assert.notEqual(d?.drop,1);return{decision:d}})
check('target_change_restarts_confirmation',()=>{const{B,tr,policy}=state();B.me.gun.ammo=0;B.me.gun.reload=2.4;B.me.laser.cooldown=1.65;policy.pickup('lightning',null);B.me.t+=.2;B.target={...tr,id:2};assert.equal(policy.pickup('lightning',null),null)})
check('observed_equipment_change_starts_four_second_cooldown',()=>{const{B,policy}=state();policy.pickup('lightning',null);B.me.weapons[0]=null;B.me.weapons[0]=policy.prospective('lightning');B.me.t+=.3;assert.equal(policy.pickup('gun',{drop:0}),null);B.target=null;B.me.t+=3.9;assert.equal(policy.pickup('gun',{drop:0}),null);B.me.t+=.2;assert.deepEqual(policy.pickup('gun',{drop:0}),{drop:0})})
check('urgent_zone_or_losing_state_invalidates_swap',()=>{for(const key of ['zoneUrgent','losing','mustDisengage','holdFire']){const{B,policy}=state();B.me.gun.ammo=0;B.me.gun.reload=2.4;B.me.laser.cooldown=1.65;policy.pickup('lightning',null);B.me.t+=.2;B[key]=true;assert.equal(policy.pickup('lightning',null),null)}})
check('fresh_foreign_death_and_ffa_firewall_preserve_fallback',()=>{for(const mode of ['FFA','death','late']){const{B,policy}=state();if(mode==='FFA')B.env='FFA';if(mode==='death')B.foreignDeaths=1;if(mode==='late')B.aliveN=3;assert.deepEqual(policy.pickup('lightning',{drop:1}),{drop:1});assert.equal(policy.pick([{id:'plating'},{id:'sensors'}],1),1)}})
check('explicit_disable_preserves_baseline_choice',()=>{const{B,policy}=state();B.P.adaptiveEquipment=false;assert.deepEqual(policy.pickup('lightning',{drop:1}),{drop:1});assert.equal(policy.pick([{id:'plating'},{id:'sensors'}],1),1)})
const result={scope:'Decision-unit projections using actual shared readyDamage, live rule config and analytic positions; no reactive match or score claim.',count:results.length,passed:results.filter(r=>r.passed).length,results}
writeFileSync(`${root}/panel/mech/adaptive-loadout-cases.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,passed:result.passed}))
