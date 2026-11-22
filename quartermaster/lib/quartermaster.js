// Values only observed supply calls. It returns a bounded plan to the existing
// profile; it never invents a location, awards resources or owns a mode.
import { clamp } from './aim.js'
import { zoneSlack } from './senses.js'

export function makeQuartermaster(B, context) {
  const P=B.P,cfg=B.cfg,state={scope:false,reason:'inactive',goal:null}
  let armor=0,energyRegen=18,energyDelay=.6,boostDrain=17
  function update(obs) {
    const st=obs?.self?.stats||{},base=cfg.mech
    const live=(k,d)=>Math.max(0,Number.isFinite(st[k])?st[k]:Number.isFinite(base[k])?base[k]:d)
    armor=clamp(live('armor',0),0,.95);energyRegen=live('energy_regen',18);energyDelay=live('energy_regen_delay',.6);boostDrain=live('boost_drain',17)
  }
  function active(){
    // Stance refreshes its counter later than economy; current public deaths
    // still close this specialized economic scope immediately.
    const mechCount=cfg.match.mechs||16
    let kills=0
    for(const id of B.ourKills)if(Number.isInteger(id)&&id>=0&&id<mechCount&&id!==B.me.id)kills++
    const foreign=Number.isInteger(B.aliveN)&&B.aliveN>=0?Math.max(0,mechCount-B.aliveN-kills):0
    return P.sixQuartermaster===true&&B.p26on===true&&context.firewall()&&foreign<P.h50ForeignMax&&B.me.grounded&&B.drops.length>0
  }
  function quote(d) {
    const me=B.me,s=B.p26
    if(!active()||!d||!B.drops.includes(d))return null
    if(B.zoneUrgent||zoneSlack(B,me.x,me.y,me.t+2*P.tickS)<me.radius)return null
    if(!context.sameComp(d.x,d.y)||!context.pathOk('q:'+d.id,d.x,d.y)||context.abandoned(d.x,d.y))return null
    const old=context.dropPlan(d)
    if(!old||old.contested)return null
    // Arrival would contest a ring already occupied by someone else. There is
    // no observed finish time for that contest and this policy owns no removal
    // plan, so do not append a fictitious uninterrupted capture interval.
    if(d.holder>=0&&d.holder!==me.id)return null
    for(const tr of B.trackList)if(!tr.npc&&tr.listed&&tr.hp>0&&Math.hypot(tr.x-d.x,tr.y-d.y)<=d.radius)return null
    const path=Math.max(old.dist,context.pathEst(d.x,d.y)),inside=old.owned
    const travel=Math.max(0,path-Math.max(0,d.radius-me.radius-1))
    const mult=me.laser?.charge>0?me.chargeMoveMult:1,walk=Math.max(1,me.walk*mult),fast=Math.max(walk,me.boostSpeed*mult)
    const cost=travel/fast*boostDrain
    const boost=!inside&&me.energy>=cost+P.boostReserve&&fast>walk
    const arrival=inside?0:travel/(boost?fast:walk)
    const wait=Math.max(0,d.landsIn-arrival),remaining=Math.max(0,d.captureS-(inside?d.progress:0))
    const completion=Math.max(arrival,d.landsIn)+remaining
    // Do other useful work until departure is timely; do not camp a call for
    // most of its fall. An owned ring is already a bounded capture task.
    if(!inside&&wait>d.captureS)return null
    if(completion>Math.min(30,(cfg.drops.fall_s||25)+d.captureS))return null
    if(d.holder>=0&&d.holder!==me.id&&d.landsIn<=0&&d.progress>0&&arrival>Math.max(0,d.captureS-d.progress)+2*P.tickS)return null
    const escape=P.tCoverUnknown+2*P.tickS
    if(zoneSlack(B,d.x,d.y,me.t+completion+escape)<me.radius)return null
    if(!inside&&s.fight&&B.target?.listed&&B.target.losOut&&s.ttk<=d.captureS&&s.ttk<completion)return null
    let route=0
    const mx=(d.x+me.x)*.5,my=(d.y+me.y)*.5
    for(const tr of B.trackList) {
      if(tr.hp<=0||tr.conf<.3)continue
      if(!tr.npc&&!(tr===B.target||context.hostile(tr)||tr.aimAtMe))continue
      if(tr.npc&&!tr.listed)continue
      route+=Math.max(context.foeDps(Math.hypot(tr.x-d.x,tr.y-d.y),tr),context.foeDps(Math.hypot(tr.x-mx,tr.y-my),tr))*(1-armor)
    }
    const incoming=Math.max(route,s.hot),loss=incoming*(completion+2*P.tickS),reserve=Math.min(me.maxHp*.2,me.hp*.25)
    if(me.hp-loss<=Math.max(1,reserve)||me.maxHp-incoming*escape<=reserve)return null
    const quiet=incoming===0&&!s.underFire&&me.inZone
    const regenWait=Math.max(0,me.regenDelay-(me.t-Math.max(me.lastHurtT,me.lastDealtT)))
    const passiveHp=quiet?me.regenPerS*Math.max(0,completion-regenWait):0
    // Value existing deficits after the recovery alternative. Do not create
    // reward by deliberately spending energy or taking route damage first.
    const health=Math.max(0,me.maxHp-me.hp-passiveHp)/me.maxHp
    const passiveEnergy=quiet&&!me.lightning?energyRegen*Math.max(0,completion-energyDelay):0
    const planEnergyRegen=quiet&&!me.lightning?energyRegen*Math.max(0,completion-(boost?arrival:0)-energyDelay):0
    const predictedEnergy=clamp(me.energy-(boost?cost:0)+planEnergyRegen,0,me.maxEnergy)
    const energy=Math.max(0,me.maxEnergy-me.energy-passiveEnergy)/me.maxEnergy
    const count=cfg.drops.cubes||3,cap=cfg.cubes.stat_cap||10,gain=Math.min(count,Math.max(0,cap-me.cubes))
    const crossed=(cfg.cubes.upgrade_thresholds||[]).filter(q=>q>me.cubes&&q<=me.cubes+count).length
    const growth=Math.max(0,gain/cap+crossed-(count-gain)*(cfg.cubes.size_per_cube||.05))
    const value=health+energy+growth,utility=value/(.25+completion)
    if(utility<.015)return null
    return {...old,quartermaster:true,arrival,wait,completion,boost,moveEnergy:boost?cost:0,predictedEnergy,health,energy,growth,value,utility,loss,escape,
      phase:d.landsIn>0?'intercept':inside?'capture':'approach'}
  }
  function choose() {
    state.scope=active();state.goal=null;state.reason=state.scope?'no-admissible-call':'inactive'
    if(!state.scope)return null
    let best=null
    for(const d of B.drops){const q=quote(d);if(q&&(!best||q.utility>best.utility))best=q}
    if(best){state.goal={id:best.id,phase:best.phase,arrival:best.arrival,wait:best.wait,completion:best.completion,value:best.value};state.reason='timely-observed-call'}
    return best
  }
  return {active,update,quote,choose,state}
}
