// Evidence for the existing equipment decision; no target, goal, mode or action writes.
// Null means unsupported. A route is a checked direct walk, never an A* claim.
const MAX_ROUTE = 160, MAX_ACTORS = 64, MAX_RAYS = 4
const finite = Number.isFinite
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const angle = x => Math.atan2(Math.sin(x), Math.cos(x))

function zoneModel(B) {
  const z = B.zone, now = B.me.t
  if (!z || !z.known || ![now,z.cx,z.cy,z.r,z.nx,z.ny,z.nr,z.t0,z.t1].every(finite) ||
    z.r < 0 || z.nr < 0 || z.nr > z.r || z.t1 < z.t0 ||
    Math.hypot(z.nx-z.cx,z.ny-z.cy)+z.nr>z.r+1e-5) return null
  const start = Math.max(now, z.t0), end = Math.max(start, z.t1)
  function slack(x, y, dt) {
    const at = now + Math.max(0, dt)
    const u = at <= start ? 0 : end > start ? clamp((at-start)/(end-start),0,1) : 1
    return z.r + (z.nr-z.r)*u - Math.hypot(x-z.cx-(z.nx-z.cx)*u,y-z.cy-(z.ny-z.cy)*u)
  }
  function deadline(x, y, margin) {
    if (slack(x,y,0) < margin) return 0
    if (Math.hypot(x-z.nx,y-z.ny) <= z.nr-margin) return Infinity
    let lo=0, hi=Math.max(0,end-now)
    if (hi===0) return 0
    // Nested circles make stationary-point membership monotone.
    for(let k=0;k<14;k++){const mid=(lo+hi)*.5;if(slack(x,y,mid)>=margin)lo=mid;else hi=mid}
    return lo
  }
  return {slack,deadline,start,end,knownFor:Math.max(0,z.t1-now)}
}

function ray(B, ax, ay, az, bx, by, bz) {
  if (!B.world || typeof B.world.shotClear !== 'function' || ![ax,ay,az,bx,by,bz].every(finite)) return null
  try { return B.world.shotClear(ax,ay,az,bx,by,bz) === true } catch { return null }
}

function contact(B) {
  const me=B.me, tr=B.target
  const roster=Number.isInteger(B.cfg?.match?.mechs)?clamp(B.cfg.match.mechs,1,64):16
  if (!tr || tr.npc || tr.hp<=0 || !Number.isInteger(tr.id) || tr.id<0 || tr.id>=roster || tr.id===me.id ||
    !B.tracks || B.tracks.get(tr.id)!==tr ||
    ![tr.x,tr.y,tr.z,tr.height,me.x,me.y,me.z,me.muzzleH].every(finite)) return null
  const age=me.t-tr.lastSeen, fresh=tr.listed===true && age>=0 && age<=.3 && !tr.phantom
  const dx=tr.x-me.x,dy=tr.y-me.y,dz=tr.z+tr.height*.5-me.z-me.muzzleH
  const horizontalRange=Math.hypot(dx,dy), pitch=Math.atan2(dz,horizontalRange)
  const yawError=finite(me.yaw)?Math.abs(angle(Math.atan2(dy,dx)-me.yaw)):null
  const pitchError=finite(me.pitch)?Math.abs(pitch-me.pitch):null
  return {id:tr.id,fresh,horizontalRange,centerRange:Math.hypot(horizontalRange,dz),
    shotClear:fresh?ray(B,me.x,me.y,me.z+me.muzzleH,tr.x,tr.y,tr.z+tr.height*.5):null,
    pitchReachable:finite(me.minPitch)&&finite(me.maxPitch)?pitch>=me.minPitch&&pitch<=me.maxPitch:null,
    angleError:yawError,pitchError}
}

function exposure(B) {
  const me=B.me, L=Array.isArray(B.trackList)?B.trackList:[], selected=[], seen=new Set()
  let credibleCount=0,closeThreats=0,unknownLines=L.length>MAX_ACTORS?1:0
  const close=finite(B.cfg?.weapons?.lightning?.range)?B.cfg.weapons.lightning.range+me.radius:45+me.radius
  const roster=Number.isInteger(B.cfg?.match?.mechs)?clamp(B.cfg.match.mechs,1,64):16
  for(let i=0;i<Math.min(L.length,MAX_ACTORS);i++) {
    const tr=L[i]
    if (!tr || seen.has(tr.id) || tr.id===me.id || tr.hp<=0) continue
    if (!(tr.npc && Number.isInteger(tr.id)&&tr.id>=100 ||
      !tr.npc&&Number.isInteger(tr.id)&&tr.id>=0&&tr.id<roster)) continue
    seen.add(tr.id)
    const distance=[tr.x,tr.y].every(finite)?Math.hypot(tr.x-me.x,tr.y-me.y):Infinity
    const age=me.t-tr.lastSeen,recentDamage=finite(tr.lastDmgInT)&&me.t-tr.lastDmgInT>=0&&me.t-tr.lastDmgInT<=3
    const fresh=tr.listed===true&&!tr.phantom&&finite(age)&&age>=0&&age<=.5&&[tr.x,tr.y,tr.z,tr.muzzleH].every(finite)
    if(!fresh) {
      // Losing a current sighting is not proof that a nearby/known attacker vanished.
      if(recentDamage || finite(age)&&age>=0&&age<=1.5) {
        credibleCount++
        if(distance<=close)closeThreats++
      }
      continue
    }
    // A nearby or recently damaging NPC can disrupt recovery as well as a mech.
    if (tr.npc && distance>(B.cfg?.npc?.aggro_range||45) && !recentDamage) continue
    credibleCount++
    if (distance<=close) closeThreats++
    const recent=finite(tr.lastDmgInT)&&me.t-tr.lastDmgInT<=1
    const priority=(recent?8:0)+(tr.charging?4:0)+(distance<=close?2:0)+1/(1+distance)
    selected.push({tr,priority})
    selected.sort((a,b)=>b.priority-a.priority||a.tr.id-b.tr.id)
    if(selected.length>MAX_RAYS)selected.pop()
  }
  let clearLines=0,checkedLines=0,weaponLines=0
  for(const q of selected) {
    const tr=q.tr, clear=ray(B,tr.x,tr.y,tr.z+tr.muzzleH,me.x,me.y,me.z+me.height*.5)
    if(clear===null)unknownLines++;else{
      checkedLines++
      if(clear) {
        clearLines++
        const d=Math.hypot(tr.x-me.x,tr.y-me.y,tr.z+tr.muzzleH-me.z-me.height*.5),W=B.cfg?.weapons
        const reaches=r=>finite(r)&&r>0&&d<=r
        // These are nominal weapon-reach lines, not observed cooldown/readiness.
        // NPC aggro/leash radii are not projectile ranges; an absent range is unknown.
        if(tr.npc?reaches(B.cfg?.npc?.range):
          tr.hasGun&&reaches(W?.gun?.range)||tr.hasLaser&&reaches(W?.laser?.range)||tr.hasLightning&&reaches(W?.lightning?.range))weaponLines++
      }
    }
  }
  unknownLines+=Math.max(0,credibleCount-selected.length)
  return {credibleCount,clearLines,closeThreats,unknownLines,checkedLines,weaponLines}
}

function resourceGoal(B, task) {
  const t=B.me.t
  if(task==='capture' && B.dropTask && Array.isArray(B.drops)) {
    const d=B.drops.slice(0,8).find(x=>x && (Number.isInteger(B.dropTask.id)?x.id===B.dropTask.id:
      Math.hypot(x.x-B.dropTask.x,x.y-B.dropTask.y)<.01))
    return d?{x:d.x,y:d.y,z:d.z,kind:'selected-drop'}:null
  }
  const g=task==='resource'?B.loot:task==='recover'?B.grab:null
  if(!g)return null
  if(g.type==='drone') {
    const q=B.tracks&&typeof B.tracks.get==='function'?B.tracks.get(g.id):null
    return q?.npc&&q.listed&&!q.phantom&&q.losOut&&q.hp>0&&finite(q.lastSeen)&&t-q.lastSeen>=0&&t-q.lastSeen<=.3?
      {x:q.x,y:q.y,z:q.z,kind:'selected-drone'}:null
  }
  const map=g.type==='cube'?B.cubes:g.type==='crate'?B.crates:g.type==='pickup'?B.pickups:null
  const q=map && typeof map.get==='function'?map.get(g.id):null
  return q && finite(q.seen) && t-q.seen>=0 && t-q.seen<=.5 && (g.type!=='crate'||q.hp>0)?
    {x:q.x,y:q.y,z:q.z,kind:'selected-'+g.type}:null
}

function directRoute(B, model, goal) {
  const me=B.me, nav=B.nav
  if(!goal||!model||!me.grounded||!nav||![me.x,me.y,me.z,me.radius,me.height,me.walk,goal.x,goal.y].every(finite)||
    me.walk<=0||![nav.radius,nav.height].every(finite)||Math.abs(nav.radius-me.radius)>1e-6||Math.abs(nav.height-me.height)>1e-6)return null
  const dx=goal.x-me.x,dy=goal.y-me.y,distance=Math.hypot(dx,dy)
  if(distance>MAX_ROUTE)return null
  const bd=B.world?.bounds,am=(finite(B.arenaMargin)?B.arenaMargin:0)+me.radius
  if(!bd||![bd.minX,bd.maxX,bd.minY,bd.maxY].every(finite)||
    goal.x<=bd.minX+am||goal.x>=bd.maxX-am||goal.y<=bd.minY+am||goal.y>=bd.maxY-am)return null
  try {
    if(!nav.passableAt(me.x,me.y)||!nav.passableAt(goal.x,goal.y)||
      nav.component(me.x,me.y)<0||nav.component(me.x,me.y)!==nav.component(goal.x,goal.y)||
      !nav.walkLine(me.x,me.y,goal.x,goal.y))return null
    if(finite(goal.z)&&Math.abs(goal.z-nav.levelAt(goal.x,goal.y))>4)return null
  } catch {return null}
  const chargeSlow=!!(me.laser&&me.laser.charge>0)
  if(chargeSlow && !(finite(me.chargeMoveMult)&&me.chargeMoveMult>0))return null
  const speed=me.walk*(chargeSlow?me.chargeMoveMult:1)
  const accel=finite(me.accel)&&me.accel>0?me.accel:null
  if(!accel)return null
  const toward=distance>0&&finite(me.vx)&&finite(me.vy)?(me.vx*dx+me.vy*dy)/distance:0
  // A launch/turn allowance; no boost or energy regeneration is presumed.
  const oppositeSpeed=Math.max(0,-toward),launchAllowance=speed/accel+2*oppositeSpeed/accel+.2
  const arrival=distance/speed+launchAllowance
  const route={kind:goal.kind,distance,arrival,chargeSlow,speed,launchAllowance,oppositeSpeed,acceleration:accel,
    goal:{x:goal.x,y:goal.y},origin:{t:me.t,x:me.x,y:me.y,z:me.z,radius:me.radius,height:me.height},
    evidence:'direct-body-walk; linear timed samples; launch allowance; no boost'}
  return {...route,...timing(B,model,route,arrival)}
}

function timing(B,model,route,arrival) {
  const me=B.me,margin=me.radius+.5,dx=route.goal.x-me.x,dy=route.goal.y-me.y
  const deadline=model.deadline(route.goal.x,route.goal.y,margin)
  let safe=arrival<=model.knownFor
  for(const u of [0,.5,1])if(model.slack(me.x+dx*u,me.y+dy*u,arrival*u)<margin)safe=false
  for(const at of [model.start,model.end]){
    const u=arrival>0?(at-me.t)/arrival:0
    if(u>0&&u<1&&model.slack(me.x+dx*u,me.y+dy*u,arrival*u)<margin)safe=false
  }
  return {safe,deadline,slack:deadline-arrival,knownFor:model.knownFor}
}

// Recheck only the timing of the same already checked direct segment.
// A changed self observation invalidates the certificate; no navigation/rays are added.
export function equipmentRouteTiming(B,route,arrival) {
  const me=B?.me,o=route?.origin,g=route?.goal
  if(!me||!o||!g||!finite(arrival)||arrival<0||arrival===0&&route.distance>1e-8||![g.x,g.y].every(finite)||
    ['t','x','y','z','radius','height'].some(k=>!finite(o[k])||o[k]!==me[k]))return null
  const model=zoneModel(B)
  return model?timing(B,model,route,arrival):null
}

/** All durations are seconds from the current observation. Never mutates B.
 * route.deadline === Infinity means inside the known next circle, not safe forever.
 * clearLines is a lower bound when unknownLines > 0; neither field is hit probability.
 * Call fresh at each comparison: economy and hands occur at different decision stages.
 */
export function equipmentContext(B) {
  const me=B?.me, now=me?.t, duration=B?.cfg?.match?.duration_s
  const remaining=finite(duration)&&finite(now)?Math.max(0,duration-now):null
  if(!me||![me.t,me.x,me.y,me.z,me.radius,me.height].every(finite)||me.radius<=0||me.height<=0)return {
    task:'idle',phase:'unknown',alive:null,remaining,horizon:0,urgent:false,inZone:null,
    recoveryWindow:{eligible:false,wait:Infinity,horizon:0},route:null,contact:null,
    exposure:{credibleCount:0,clearLines:0,closeThreats:0,unknownLines:1,checkedLines:0,weaponLines:0}}
  const mode=B.mode, task=mode==='FIGHT'?'fight':mode==='ZONE'?'route':mode==='HEAL'||mode==='DISENGAGE'?'recover':
    mode==='DROP'?'capture':mode==='LOOT'?'resource':'idle'
  const z=B.zone,model=zoneModel(B),margin=me.radius+.5
  const phase=!model?'unknown':z.r<=0?'closed':now<z.t0?'hold':now<z.t1?'shrinking':'boundary'
  const inZone=model?model.slack(me.x,me.y,0)>=0:null
  const deadline=model?model.deadline(me.x,me.y,margin):null
  const knownFor=model?model.knownFor:0
  const horizon=Math.max(0,Math.min(4,remaining??0,knownFor))
  let route=null
  const goal=resourceGoal(B,task)
  if(goal)route=directRoute(B,model,goal)
  else if(model && ['route','recover','fight'].includes(task)) {
    const d=Math.hypot(me.x-z.nx,me.y-z.ny),inner=z.nr-margin-1e-6
    if(inner>0 && d>inner) {
      const f=inner/Math.max(d,1e-9)
      const nearest={x:z.nx+(me.x-z.nx)*f,y:z.ny+(me.y-z.ny)*f,kind:'next-circle-direct'}
      route=directRoute(B,model,nearest)
      if(!route)route=directRoute(B,model,{x:z.nx,y:z.ny,kind:'next-center-direct'})
    }
  }
  const urgent=inZone===false || finite(deadline)&&deadline<=(route?route.arrival:.2)+.2
  const seen=exposure(B), currentContact=contact(B)
  const last=Math.max(me.lastHurtT,me.lastDealtT)
  const wait=finite(me.regenDelay)&&me.regenDelay>=0&&finite(last)?Math.max(0,me.regenDelay-(now-last)):Infinity
  const recoveryHorizon=Math.max(0,Math.min(8,remaining??0,knownFor,deadline??0))
  const firing=Array.isArray(B.out?.fire)&&B.out.fire.some(v=>v===true)
  const eligible=(task==='recover'||task==='idle')&&inZone===true&&!urgent&&seen.clearLines===0&&seen.unknownLines===0&&
    !(finite(B.A)&&B.A>0)&&!(B.bulletsSeen>0)&&!(B.shells&&B.shells.size>0)&&
    !firing&&!(me.laser&&me.laser.charge>0)&&!(me.t-me.lastHurtT<1)&&
    finite(me.regenPerS)&&me.regenPerS>0&&recoveryHorizon>0
  return {task,phase,alive:Number.isInteger(B.aliveN)&&B.aliveN>=0&&B.aliveN<=64?B.aliveN:null,
    remaining,horizon,urgent,inZone,recoveryWindow:{eligible,wait,horizon:recoveryHorizon},
    route,contact:currentContact,exposure:seen}
}
