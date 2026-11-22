import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root = '/workspace/scratch/bde29dc281e6'
const tree = `${root}/experiments/mech-pressure-cycle/bot`
const load = p => import(pathToFileURL(p).href)
const { World } = await load(`${tree}/lib/world.js`)
const { Nav } = await load(`${tree}/lib/nav.js`)
const recorded = gunzipSync(readFileSync(`${root}/handoff/.cache/ws/mechbot/kit/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
const hello = structuredClone(recorded[0]), cfg = hello.config, first = recorded.find(o => o.type === 'obs')
const world = World.loadSync(`${root}/handoff/.cache/ws/mechbot/kit/arena`)
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const radius = cfg.mech.radius, height = cfg.mech.height, margin = cfg.match.arena_margin + radius + 2
const inside = p => p.x > world.bounds.minX + margin && p.x < world.bounds.maxX - margin && p.y > world.bounds.minY + margin && p.y < world.bounds.maxY - margin
const point = (x,y) => { const cell=nav.idx(x,y);if(cell<0)return null;const p={x:nav.cellX(cell),y:nav.cellY(cell)};p.z=nav.levelAt(p.x,p.y);return p }
const clear = (a,b) => inside(b) && nav.passableAt(b.x,b.y) && nav.component(a.x,a.y)===nav.component(b.x,b.y) &&
  nav.walkLine(a.x,a.y,b.x,b.y) && world.shotClear(a.x,a.y,a.z+cfg.mech.muzzle_height,b.x,b.y,b.z+height*0.5) &&
  world.canSee(a.x,a.y,a.z+cfg.mech.eye_height,b.x,b.y,b.z+height*0.5)

let position=null,theta=0,points=null,dense=null
search: for(let y=-350;y<=350;y+=28)for(let x=-350;x<=350;x+=28){
  const p=point(x,y);if(!p||!inside(p)||!nav.passableAt(p.x,p.y)||nav.wallDist[nav.idx(p.x,p.y)]<10)continue
  for(let k=0;k<24;k++){
    const a=k*Math.PI/12,found={};let good=true
    for(const range of [25,55,78,110]){
      const q=point(p.x+range*Math.cos(a),p.y+range*Math.sin(a))
      if(!q||!clear(p,q)){good=false;break}found[range]=q
    }
    if(!good)continue
    const many=[]
    for(const forward of [14,22,30,38])for(const side of [-12,-4,4,12]){
      const q=point(p.x+forward*Math.cos(a)-side*Math.sin(a),p.y+forward*Math.sin(a)+side*Math.cos(a))
      if(!q||!clear(p,q)||Math.hypot(q.x-p.x,q.y-p.y)>44||Math.hypot(q.x-p.x,q.y-p.y)<radius*2+1)continue
      if(many.some(r=>Math.hypot(q.x-r.x,q.y-r.y)<radius*2+1))continue
      many.push(q)
    }
    if(many.length<15)continue
    position=p;theta=a;points=found;dense=many.slice(0,15);break search
  }
}
assert.ok(position,'no sufficiently open verified contact layout found')
const selfId=first.self.id,ids=Array.from({length:16},(_,i)=>i).filter(i=>i!==selfId)
const actor=(p,id,kinds=['gun'],charging=false,hp=1400)=>({id,kind:'mech',pos:[p.x,p.y,p.z],vel:[0,0,0],
  aim:[Math.atan2(position.y-p.y,position.x-p.x),0],hp,max_hp:1400,cubes:0,weapons:kinds,charging})
const weapon=(kind,extra={})=>({kind,cooldown:0,stats:structuredClone(cfg.weapons[kind]),
  ...(kind==='gun'?{ammo:12,reload:0}:kind==='laser'?{charge:0}:{}),...extra})
const scenes=[
  {name:'seek',n:30,pair:[weapon('gun'),null],targets:[]},
  {name:'close',n:45,pair:[weapon('gun'),weapon('laser',{cooldown:1.65})],targets:[actor(points[110],ids[0])]},
  {name:'gun_fire',n:30,pair:[weapon('gun'),null],targets:[actor(points[55],ids[0])]},
  {name:'laser_release',n:30,pair:[weapon('gun',{ammo:0,reload:2.4}),weapon('laser',{charge:0.75})],targets:[actor(points[78],ids[0])]},
  {name:'all_channels_recharging',n:45,pair:[weapon('gun',{ammo:0,reload:2.4}),weapon('laser',{cooldown:1.65})],targets:[actor(points[78],ids[0])]},
  {name:'lightning_interrupt',n:30,pair:[weapon('gun'),weapon('lightning')],targets:[actor(points[25],ids[0],['gun','laser'],true)]},
  {name:'nearby_pickup',n:30,pair:[weapon('gun',{ammo:0,reload:2.4}),weapon('laser',{cooldown:3})],targets:[actor(points[25],ids[0],['gun','laser'],true)],pickup:true},
  {name:'fifteen_charging_opponents',n:45,pair:[weapon('laser',{charge:0.3}),weapon('lightning')],targets:dense.map((p,i)=>actor(p,ids[i],['gun','laser'],true))},
  {name:'bounded_capture_finish',n:15,pair:[weapon('gun'),weapon('laser')],targets:[actor(points[55],ids[0])],drop:true},
]
let i=0
const observations=[],labels=[]
for(const scene of scenes)for(let j=0;j<scene.n;j++,i++){
  const t=100+i*0.1,obs=structuredClone(first)
  obs.tick=2000+i*2;obs.t=t;obs.alive=16
  obs.self={...obs.self,pos:[position.x,position.y,position.z],vel:[0,0,0],aim:[theta,0],hp:scene.name==='fifteen_charging_opponents'?200:900,
    max_hp:cfg.mech.hp,energy:100,max_energy:cfg.mech.energy,grounded:true,cubes:0,upgrades:[],in_zone:true,
    weapons:structuredClone(scene.pair),stats:structuredClone(cfg.mech)}
  obs.mechs=structuredClone(scene.targets);obs.projectiles=[];obs.crates=[];obs.cubes=[];obs.sounds=[];obs.beams=[];obs.events=[];obs.offer=null
  obs.zone={center:[position.x,position.y],radius:300,next_center:[position.x,position.y],next_radius:250,shrink_start:200,shrink_end:260,dps:20}
  obs.pickups=scene.pickup?[{id:8001,kind:'lightning',pos:[position.x+2*Math.cos(theta),position.y+2*Math.sin(theta),world.ground(position.x+2*Math.cos(theta),position.y+2*Math.sin(theta))]}]:[]
  obs.drops=scene.drop?[{id:20000,pos:[position.x,position.y,position.z],radius:8,lands_in:0,capture_s:4,progress:3.8,holder:selfId}]:[]
  observations.push(obs);labels.push(scene.name)
}
assert.equal(observations.length,300)
for(const o of observations){
  assert.equal(nav.passableAt(...o.self.pos),true)
  for(const tr of o.mechs){assert.equal(nav.passableAt(...tr.pos),true);assert.ok(Math.abs(tr.pos[2]-nav.levelAt(...tr.pos))<1e-9)}
  for(let a=0;a<o.mechs.length;a++)for(let b=a+1;b<o.mechs.length;b++)assert.ok(Math.hypot(o.mechs[a].pos[0]-o.mechs[b].pos[0],o.mechs[a].pos[1]-o.mechs[b].pos[1])>=radius*2+1)
}
const messages=[hello,...observations,structuredClone(recorded.at(-1))]
const bytes=gzipSync(Buffer.from(messages.map(x=>JSON.stringify(x)).join('\n')+'\n'),{mtime:0})
const dest=`${root}/panel/mech/pressure-contact-stream.jsonl.gz`
writeFileSync(dest,bytes)
const reports=[],actions={}
for(const name of ['mech-capture','mech-pressure-cycle','mech-burst-cycle']){
  const {createBrain}=await load(`${root}/experiments/${name}/bot/lib/brain.js`)
  const br=createBrain(hello,{world,nav},{warmup:false,fuseMs:1e8}),B=br._B
  const counts={pressureLegsCalls:0,pressureLegsReturns:0,active:0,zoneUrgent:0,phases:{},legs:{},modes:{},aims:{},per_scene:{}}
  const bump=(o,k)=>o[k]=(o[k]||0)+1
  if(B.pressure){const legs=B.pressure.legs;B.pressure.legs=()=>{counts.pressureLegsCalls++;const r=legs();if(r)counts.pressureLegsReturns++;return r}}
  const aa=[]
  for(let n=0;n<observations.length;n++){
    const a=br.act(structuredClone(observations[n]),performance.now()+1e7),d=br.debugState();aa.push(a)
    const record=counts.per_scene[labels[n]]||(counts.per_scene[labels[n]]={decisions:0,active:0,zoneUrgent:0,phases:{},legs:{},aims:{}})
    record.decisions++;if(B.pressureActive){counts.active++;record.active++}if(B.zoneUrgent){counts.zoneUrgent++;record.zoneUrgent++}
    bump(counts.modes,B.mode);bump(counts.legs,B.legKind);bump(record.legs,B.legKind);bump(counts.aims,B.aimKind);bump(record.aims,B.aimKind)
    const phase=d.pressure?.phase||'baseline';bump(counts.phases,phase);bump(record.phases,phase)
    assert.ok(a.move.every(Number.isFinite)&&a.aim.every(Number.isFinite));assert.equal(d.counters.errors,0);assert.equal(d.counters.fuse,0)
  }
  actions[name]=aa
  if(name!=='mech-capture'){
    assert.equal(counts.active,300);assert.equal(counts.zoneUrgent,0);assert.equal(counts.pressureLegsReturns,300)
    assert.ok(counts.legs['pressure-close']>0&&counts.legs['pressure-fire']>0&&counts.legs['pressure-seek']>0)
    if(name==='mech-burst-cycle')assert.ok(counts.legs['pressure-cycle']>0)
  }
  reports.push({candidate:name,...counts})
}
const diffs={}
for(const name of ['mech-pressure-cycle','mech-burst-cycle']){
  const d={movement:0,boost:0,aim:0,fire:0,reload:0}
  for(let n=0;n<observations.length;n++)for(const key of ['move','boost','aim','fire','reload'])if(JSON.stringify(actions[name][n][key])!==JSON.stringify(actions['mech-capture'][n][key]))d[key==='move'?'movement':key]++
  diffs[name]=d
}
const meta={path:dest,sha256:createHash('sha256').update(bytes).digest('hex'),observations:observations.length,
  scope:'Counterfactual individually schema/map-checked observations, not a reactive simulation or claimed feasible complete match history. Empty upgrade lists retain unchanged live stats; the armed deadline enables pressure. Source-only audit wrappers count actual legs entry/return and final branch/phase; frozen bundles are unmodified.',
  position,theta,contact_points:points,dense_positions:dense,geometry:{self_and_all_actors_nav_passable:true,feet_at_nav_level:true,inside_arena_margin:true,body_separation_m:radius*2+1,contact_rays_clear:true,combat_zone_centered:true},reports,diffs}
writeFileSync(`${root}/panel/mech/pressure-contact-stream.json`,JSON.stringify(meta,null,2)+'\n')
console.log(JSON.stringify({path:dest,sha256:meta.sha256,reports:reports.map(x=>({candidate:x.candidate,active:x.active,zoneUrgent:x.zoneUrgent,pressureLegsReturns:x.pressureLegsReturns,phases:x.phases,legs:x.legs})),diffs}))
