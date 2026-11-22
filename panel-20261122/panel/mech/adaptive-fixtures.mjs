// Independent fixture construction. Real arena, original hello config, phase-derived zone.
// These are individually constrained counterfactual observations, not a reactive simulation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
export const root = '/workspace/scratch/bde29dc281e6'
export const kit = `${root}/handoff/.cache/ws/mechbot/kit`
export const load = p => import(pathToFileURL(p).href)
export const clone = x => structuredClone(x)
export const stream = gunzipSync(readFileSync(`${kit}/check/stream.jsonl.gz`)).toString().trim().split('\n').map(JSON.parse)
export const hello = clone(stream[0]), cfg = hello.config
export const recorded = stream.filter(o => o.type === 'obs')
const { World } = await load(`${root}/experiments/mech-capture/bot/lib/world.js`)
const { Nav } = await load(`${root}/experiments/mech-capture/bot/lib/nav.js`)
export const world = World.loadSync(`${kit}/arena`)
export const nav = new Nav(world, { cell: 2, radius: cfg.mech.radius, height: cfg.mech.height, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
export const context = { world, nav }
export function point(x,y) { const n=nav.idx(x,y); if(n<0)return null;const p={x:nav.cellX(n),y:nav.cellY(n)};p.z=nav.levelAt(p.x,p.y);return p }
export function inArena(p, radius=cfg.mech.radius) { const b=world.bounds,m=cfg.match.arena_margin+radius;return p.x>b.minX+m&&p.x<b.maxX-m&&p.y>b.minY+m&&p.y<b.maxY-m }
function clear(a,b) {return b&&inArena(b,5)&&nav.passableAt(b.x,b.y)&&nav.component(a.x,a.y)===nav.component(b.x,b.y)&&nav.walkLine(a.x,a.y,b.x,b.y)&&world.shotClear(a.x,a.y,a.z+cfg.mech.muzzle_height,b.x,b.y,b.z+cfg.mech.height*.5)&&world.canSee(a.x,a.y,a.z+cfg.mech.eye_height,b.x,b.y,b.z+cfg.mech.height*.5)}
let layout=null
nav.setBody(5,18)
search:for(let y=-160;y<=80;y+=12)for(let x=-100;x<=140;x+=12){
 const p=point(x,y);if(!p||!inArena(p,5)||!nav.passableAt(p.x,p.y)||nav.wallDist[nav.idx(p.x,p.y)]<12)continue
 for(let k=0;k<24;k++){
  const yaw=k*Math.PI/12,points={},side={};let ok=true
  for(const d of [8,16,25,35,55,75,110,130]){const q=point(p.x+d*Math.cos(yaw),p.y+d*Math.sin(yaw));if(!clear(p,q)){ok=false;break}points[d]=q}
  if(!ok)continue
  for(const s of [-1,1]){const q=point(p.x+35*Math.cos(yaw)+s*10*Math.sin(yaw),p.y+35*Math.sin(yaw)-s*10*Math.cos(yaw));if(!clear(p,q)){ok=false;break}side[s]=q}
  if(ok){layout={self:p,yaw,points,side};break search}
 }
}
assert.ok(layout,'No real-map open fixture layout found')
nav.setBody(cfg.mech.radius,cfg.mech.height)
export { layout }
export function zoneAt(t) {
 const phases=cfg.zone.phases, first=recorded[0].zone
 let t0=0,c=[...cfg.zone.start_center],r=cfg.zone.start_radius
 for(let i=0;i<phases.length;i++){
  const p=phases[i],start=t0+p.hold_s,end=start+p.shrink_s
  // Preserve the recorded first next-circle center. Further coincident centers are a legal
  // nested-circle construction, not claimed sampled official future randomness.
  const next=i===0?[...first.next_center]:[...c]
  assert.ok(Math.hypot(next[0]-c[0],next[1]-c[1])+p.radius<=r+1e-6)
  if(t<end||i===phases.length-1){const u=t<=start?0:Math.min(1,(t-start)/(end-start));return {center:[c[0]+(next[0]-c[0])*u,c[1]+(next[1]-c[1])*u],radius:r+(p.radius-r)*u,next_center:next,next_radius:p.radius,shrink_start:start,shrink_end:end,dps:p.dps}}
  c=next;r=p.radius;t0=end
 }
 throw Error('zone unavailable')
}
export function zoneEdgePoint(t) {
 const z=zoneAt(t)
 nav.setBody(cfg.mech.radius,cfg.mech.height)
 for(let k=0;k<3600;k++){
  const a=k*Math.PI/1800,p=point(z.center[0]+(z.radius-.5)*Math.cos(a),z.center[1]+(z.radius-.5)*Math.sin(a))
  if(!p||!inArena(p)||!nav.passableAt(p.x,p.y))continue
  const slack=z.radius-Math.hypot(p.x-z.center[0],p.y-z.center[1])
  if(slack>.1&&slack<.8)return p
 }
 throw Error('No passable point just inside zone edge')
}
const generals=['armor','plating','servos','capacitor','reactor','nanites','gyros','sensors','jets']
export function projected(cubes=0,upgrades=null) {
 const applied=upgrades??generals.slice(0,cfg.cubes.upgrade_thresholds.filter(n=>n<=cubes).length)
 const stats={mech:clone(cfg.mech),weapons:clone(cfg.weapons)}
 for(const id of applied){const u=cfg.upgrades.find(x=>x.id===id);assert.ok(u,`Unknown upgrade ${id}`);for(const e of u.effects){const parts=e.path.split('.');let dest=stats;for(const k of parts.slice(0,-1))dest=dest[k];const key=parts.at(-1);if(e.mul!==undefined)dest[key]*=e.mul;if(e.add!==undefined)dest[key]+=e.add}}
 const scale=1+cfg.cubes.size_per_cube*cubes
 for(const k of ['radius','height','eye_height','muzzle_height'])stats.mech[k]*=scale
 const maxHp=stats.mech.hp*(1+cfg.cubes.hp_per_cube*Math.min(cubes,cfg.cubes.stat_cap))
 return {stats,upgrades:applied,maxHp}
}
export function weapon(kind,stats=cfg.weapons,extra={}) { if(!kind)return null;return {kind,cooldown:0,stats:clone(stats[kind]),...(kind==='gun'?{ammo:stats.gun.mag,reload:0}:kind==='laser'?{charge:0}:{}),...extra} }
export function actor(pos=layout.points[55],opts={}) {const p=pos;return {id:opts.id??1,kind:opts.kind??'mech',pos:[p.x,p.y,p.z],vel:opts.vel??[0,0,0],aim:opts.aim??[Math.atan2(layout.self.y-p.y,layout.self.x-p.x),0],hp:opts.hp??1400,max_hp:opts.maxHp??1400,cubes:opts.cubes??0,weapons:opts.weapons??['gun'],charging:opts.charging??false} }
export function observation(opts={}) {
 const t=opts.t??100,cubes=opts.cubes??0,p=opts.pos??layout.self,project=projected(cubes,opts.upgrades),m=project.stats.mech,z=zoneAt(t)
 const o={type:'obs',tick:Math.round(t*cfg.match.tick_hz),t,alive:opts.alive??16,
  self:{id:hello.slot,pos:[p.x,p.y,p.z],vel:opts.vel??[0,0,0],aim:opts.aim??[layout.yaw,0],hp:opts.hp??project.maxHp,max_hp:project.maxHp,energy:opts.energy??m.energy,max_energy:m.energy,grounded:opts.grounded??true,cubes,upgrades:project.upgrades,in_zone:Math.hypot(p.x-z.center[0],p.y-z.center[1])<=z.radius,stats:m,
  weapons:opts.weapons??[weapon('gun',project.stats.weapons,opts.gun??{}),weapon(opts.secondary??null,project.stats.weapons,opts.second??{})]},
  mechs:opts.mechs??[],projectiles:opts.projectiles??[],crates:opts.crates??[],cubes:opts.looseCubes??[],pickups:opts.pickups??[],sounds:opts.sounds??[],beams:opts.beams??[],events:opts.events??[],drops:opts.drops??[],offer:opts.offer??null,zone:z}
 if(opts.aimAt){o.self.aim=[Math.atan2(opts.aimAt.y-p.y,opts.aimAt.x-p.x),Math.atan2(opts.aimAt.z+cfg.mech.height*.5-(p.z+m.muzzle_height),Math.hypot(opts.aimAt.x-p.x,opts.aimAt.y-p.y))]}
 return o
}
export function drop(pos=layout.points[35],opts={}) {return {id:opts.id??20000,pos:[pos.x,pos.y,pos.z],radius:cfg.drops.radius,lands_in:opts.landsIn??0,capture_s:cfg.drops.capture_s,progress:opts.progress??0,holder:opts.holder??null} }
export function validateIndividual(o,opts={}) {
 const s=o.self,p={x:s.pos[0],y:s.pos[1],z:s.pos[2]},r=s.stats.radius,h=s.stats.height
 assert.equal(o.tick,Math.round(o.t*cfg.match.tick_hz));assert.ok(inArena(p,r));nav.setBody(r,h);assert.ok(nav.passableAt(p.x,p.y));if(s.grounded)assert.ok(Math.abs(p.z-nav.levelAt(p.x,p.y))<1e-6)
 assert.ok(s.hp>=0&&s.hp<=s.max_hp+1e-6);assert.ok(s.energy>=0&&s.energy<=s.max_energy+1e-6)
 assert.deepEqual(o.zone,zoneAt(o.t));assert.equal(s.in_zone,Math.hypot(p.x-o.zone.center[0],p.y-o.zone.center[1])<=o.zone.radius)
 for(const w of s.weapons){if(!w)continue;assert.ok(w.cooldown>=0);const equip=Math.max(cfg.loot.equip_s,w.stats.cooldown),short=cfg.weapons.lightning.short_s??0;assert.ok(w.cooldown<=Math.max(equip,short)+1e-6,'cooldown requires an explicitly modeled additional mechanic');if(w.kind==='gun'){assert.ok(w.ammo>=0&&w.ammo<=w.stats.mag);assert.ok(w.reload>=0&&w.reload<=w.stats.reload+1e-6)}if(w.kind==='laser')assert.ok(w.charge>=0&&w.charge<=w.stats.charge+1e-6)}
 nav.setBody(cfg.mech.radius,cfg.mech.height)
 const actors=[]
 for(const e of o.mechs){assert.notEqual(e.id,s.id);const ep={x:e.pos[0],y:e.pos[1],z:e.pos[2]};assert.ok(inArena(ep));assert.ok(nav.passableAt(ep.x,ep.y));assert.ok(Math.abs(ep.z-nav.levelAt(ep.x,ep.y))<1e-6);const er=cfg.mech.radius*(1+cfg.cubes.size_per_cube*(e.cubes??0));assert.ok(Math.hypot(ep.x-p.x,ep.y-p.y)>=er+r-1e-6);for(const a of actors)assert.ok(Math.hypot(ep.x-a.pos[0],ep.y-a.pos[1])>=er+cfg.mech.radius-1e-6);actors.push(e)
  if(!opts.memory){const d=Math.hypot(ep.x-p.x,ep.y-p.y),bear=Math.atan2(ep.y-p.y,ep.x-p.x),ang=Math.abs(Math.atan2(Math.sin(bear-s.aim[0]),Math.cos(bear-s.aim[0])));assert.ok(d<=cfg.vision.near_range+s.stats.near_range_bonus || d<=cfg.vision.range+s.stats.vision_bonus&&ang<=cfg.vision.fov_deg*Math.PI/360+1e-6);assert.ok(world.canSee(p.x,p.y,p.z+s.stats.eye_height,ep.x,ep.y,ep.z+cfg.mech.height*.5))}
 }
 for(const d of o.drops){const i=d.id-20000;assert.ok(i>=0&&i<cfg.drops.times.length);assert.ok(o.t>=cfg.drops.times[i]);assert.ok(Math.abs(d.lands_in-Math.max(0,cfg.drops.times[i]+cfg.drops.fall_s-o.t))<1e-6);assert.ok(d.progress>=0&&d.progress<=d.capture_s);const called=zoneAt(cfg.drops.times[i]);assert.ok(Math.hypot(d.pos[0]-called.next_center[0],d.pos[1]-called.next_center[1])<=called.next_radius);if(d.progress>0){assert.equal(d.lands_in,0);assert.ok(d.progress<=o.t-cfg.drops.times[i]-cfg.drops.fall_s+1e-6)}}
 nav.setBody(r,h)
 return true
}
export function snapshot(br,action){const B=br._B,S=B.prof?.S;return {action,mode:B.mode,leg:B.legKind,p26on:B.p26on,env:B.env,foreignDeaths:B.foreignDeaths,zoneUrgent:B.zoneUrgent,holdFire:B.holdFire,losing:B.losing,finish:B.finishing,target:B.target?.id??null,dropTask:B.dropTask?clone(B.dropTask):null,loot:B.loot?{type:B.loot.type,id:B.loot.id}:null,S:S?Object.fromEntries(Object.entries(S).filter(([k,v])=>v===null||['string','number','boolean'].includes(typeof v))):null,errors:br.debugState().errors,counters:{errors:B.counters.errors,fuse:B.counters.fuse}}}
