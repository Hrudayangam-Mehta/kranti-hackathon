// Bounded early resource quotes. The existing profile still owns targets,
// modes, movement and firing; this helper only values observed opportunities.
import { angDiff, clamp } from './aim.js'
import { zoneSlack } from './senses.js'

export function makeHarvest(B, context) {
  const P=B.P, cfg=B.cfg, state={scope:false,reason:'inactive',goal:null}, S=()=>B.p26
  let armor=0
  function update(obs) {
    const a=obs?.self?.stats?.armor
    armor=clamp(Number.isFinite(a)?a:cfg.mech.armor||0,0,.95)
  }
  function active() {
    const me=B.me
    // The shared stance updates its death counter after economy. The current
    // public alive count already closes this helper's scope in that decision.
    const mechCount=cfg.match.mechs||16
    let kills=0
    for(const id of B.ourKills)if(Number.isInteger(id)&&id>=0&&id<mechCount&&id!==me.id)kills++
    const foreign=Number.isInteger(B.aliveN)&&B.aliveN>=0?Math.max(0,mechCount-B.aliveN-kills):0
    return P.sixHarvester===true && B.p26on===true && context.firewall() && foreign<P.h50ForeignMax && me.t>=P.pfSpawnLookS && me.t<P.pfOpenT && me.cubes<(cfg.cubes.stat_cap||10)
  }
  function gunTime(type,o,distance) {
    const me=B.me,g=me.gun
    if(!g || !(g.damage>0) || !(g.speed>0) || !(o.hp>0)) return Infinity
    const height=type==='crate'?(cfg.crates.height||2.4):o.height
    const dz=o.z+height*.5-me.z-me.muzzleH, range=Math.hypot(distance,dz)
    if(range>g.range*P.gunRangeFrac || Math.atan2(dz,distance)<me.minPitch || Math.atan2(dz,distance)>me.maxPitch) return Infinity
    if(B.world && !B.world.shotClear(me.x,me.y,me.z+me.muzzleH,o.x,o.y,o.z+height*.5)) return Infinity
    const hit=type==='crate'?1:context.hitOwn(range,o)
    const shots=Math.ceil(o.hp/Math.max(.001,g.damage*me.dmgMult*hit))
    if(shots>64) return Infinity
    const yaw=Math.atan2(o.y-me.y,o.x-me.x),pitch=Math.atan2(dz,distance)
    const mult=me.laser?.charge>0?(me.laser.st.charge_turn_mult||1):1
    const turn=Math.max(Math.abs(angDiff(me.yaw,yaw))/Math.max(.01,me.turnRate*mult),Math.abs(pitch-me.pitch)/Math.max(.01,me.pitchRate*mult))
    let ammo=g.reload>0||g.ammo<=0?g.mag:g.ammo
    let time=Math.max(g.cooldown,g.reload>0?g.reload:g.ammo<=0?g.reloadS:0,turn)+range/g.speed+P.tickS*Math.max(1,cfg.match.decide_every||2)
    const first=time
    for(let shot=1;shot<shots;shot++) {
      ammo--
      if(ammo<=0){time+=Math.max(g.cd,g.reloadS);ammo=g.mag}else time+=g.cd
    }
    return {first,last:time}
  }
  function quote(type,o,path) {
    const me=B.me,s=S(),farm=type==='crate'||type==='drone'
    if(!active() || !o || !Number.isFinite(path) || path<0) return null
    if(B.zoneUrgent || s.finishing || (B.target&&s.fight) || s.underFire || s.latch) return null
    if(!context.reachable(o.x,o.y,o.z) || !context.pathOk('h:'+type+':'+o.id,o.x,o.y)) return null
    if(type==='drone' && (!o.listed || !o.losOut || o.hp<=0)) return null
    if(type!=='drone' && me.t-o.seen>P.cubeMemS) return null
    // A quiet damaged mech must not restart its regeneration by farming.
    if(farm && me.inZone && me.hpf<.72 && s.hot<=0) return null
    const speed=Math.max(1,me.walk*(me.laser?.charge>0?me.chargeMoveMult:1))
    const travel=Math.max(0,path-(cfg.cubes.pickup_radius||3.5))/speed
    const d=Math.hypot(o.x-me.x,o.y-me.y),schedule=farm?gunTime(type,o,d):null
    const kill=farm&&schedule&&Number.isFinite(schedule.last)?schedule.last:farm?Infinity:0
    const completion=travel+kill+2*P.tickS
    if(!Number.isFinite(completion)||completion>Math.min(12,P.pfOpenT-me.t)) return null
    if(zoneSlack(B,o.x,o.y,me.t+completion+P.tCoverUnknown)<me.radius) return null
    let incoming=Math.max(0,s.hot),route=0
    const mx=(o.x+me.x)*.5,my=(o.y+me.y)*.5
    for(const tr of B.trackList) {
      if(tr.hp<=0||tr.conf<.3)continue
      if(!tr.npc && !(tr===B.target||context.hostile(tr)||tr.aimAtMe))continue
      if(tr.npc&&!tr.listed)continue
      route+=Math.max(context.foeDps(Math.hypot(tr.x-o.x,tr.y-o.y),tr),context.foeDps(Math.hypot(tr.x-mx,tr.y-my),tr))*(1-armor)
    }
    incoming=Math.max(incoming,route)
    const loss=incoming*(completion+P.tCoverUnknown)
    if(me.hp-loss<Math.max(me.maxHp*.3,me.hp*.5))return null
    const yieldCubes=type==='cube'?1:type==='crate'?(cfg.crates.cubes||1):(cfg.npc.cubes||2)
    const cap=cfg.cubes.stat_cap||10, gain=Math.min(yieldCubes,Math.max(0,cap-me.cubes))
    const crossed=(cfg.cubes.upgrade_thresholds||[]).filter(q=>q>me.cubes&&q<=me.cubes+yieldCubes).length
    const benefit=gain/cap+crossed
    const wait=Math.max(0,me.regenDelay-(me.t-Math.max(me.lastHurtT,me.lastDealtT)))
    // Include the reset AFTER a short kill, not just healing lost before the
    // cube is collected. Credit healing before the first hit and after the
    // last hit's full live delay; loose cubes never reset this clock.
    let missedHeal=0
    if(farm&&me.inZone) {
      const shotRange=type==='crate'?P.pfCrateShootR:P.pfDroneShotR
      const approach=Math.max(0,path-shotRange)/speed
      const firstHit=approach+schedule.first,lastHit=approach+schedule.last,horizon=completion+me.regenDelay
      const missing=me.maxHp-me.hp
      const baseline=Math.min(missing,me.regenPerS*Math.max(0,horizon-wait))
      const farming=Math.min(missing,me.regenPerS*(Math.max(0,Math.min(firstHit,horizon)-wait)+Math.max(0,horizon-lastHit-me.regenDelay)))
      missedHeal=Math.max(0,baseline-farming)
    }
    const recoveryCost=missedHeal/Math.max(1,me.regenPerS)
    const score=benefit/(.25+completion+recoveryCost+loss/Math.max(1,me.regenPerS))
    if(!(score>0))return null
    return {type,id:o.id,score,completion,travel,kill,yieldCubes,crossed,loss,recoveryCost,recoveryLostHp:missedHeal}
  }
  function object(goal) {
    return goal.type==='drone'?B.tracks.get(goal.id):(goal.type==='crate'?B.crates:B.cubes).get(goal.id)
  }
  return {active,update,quote,object,state}
}
