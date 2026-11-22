// Fable wave 2, engineer B (economy): rules g1, g2, g4 and g6 of notes/fable/redesign/q4_econ.md (variant 'g').
// One author; nothing here is independent review or a measurement. g3 (crate / drone beams) and g5 (supply drop) are
// another engineer's. Every rule is behind its own preset in params.js (old value first, every key inert at PARAMS):
//   ec_harvest 'on'   g1 harvest window at zero kills                                   SQUAD posture + hunt.firewall()
//   ec_reach   'on'   g2 loot reach from value, both postures; 'sq' = the same behind  SQUAD posture + hunt.firewall()
//   ec_corpse  'on'   g4 corpse run sized by the pile, close in before the kill        SQUAD posture + hunt.firewall()
//   ec_picks   'on'   g6 upgrade order by remaining life, both postures; 'sq' = behind SQUAD posture + hunt.firewall()
// brain.js creates B.fm only when one of the four is on, so at the old values every hook (`if (B.fm) ...`) does nothing.
// Hooks (each returns its neutral value while its rule is not live):
//   tactics.selectTarget  gateOpen(tr)          g1: no fight is started with a mech while the window is open
//   tactics.decideMode    harvestLoot()         g1: a hit does not turn the harvest walk into DISENGAGE
//   tactics.bandFor       band(o)               g4: close to fmCloseR when the target is one beam + one magazine from death
//   economy.chooseLoot    farmHp(base), lootR(type, o, base)   g2 / g4 reach out of contact
//   economy.chooseGrab    grab(c, cubeR, lose)                 g2 / g4 reach in contact
//   economy.pick          pickOrder(base)                      g6
//   brain econ stage      update()              g1: the harvest item becomes B.loot; g4: victim cube snapshot
// Every game number comes from hello.config (cubes, crates, npc, upgrade ids; weapons and speeds through B.me). P is read
// live, B.rng is never drawn, and every latch is one-way. Counters: fm* in B.counters.
import { zoneSlack } from './senses.js'

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

export function makeFarm(B, hunt, mover, econ, hello) {
  const P = B.P, cfg = B.cfg, C = B.counters
  const cc = cfg.cubes || {}
  const TH = Array.isArray(cc.upgrade_thresholds) && cc.upgrade_thresholds.length > 0 ? cc.upgrade_thresholds.filter((v) => Number.isFinite(v)) : [1, 3, 6, 10, 15, 21, 28, 36, 45]
  const cap = num(cc.stat_cap, 10)
  const healCube = num(cc.hp_per_cube, 0.04) * num(cfg.mech && cfg.mech.hp, 1400)      // +4% max hp, the difference healed
  const dmgPct = 100 * num(cc.damage_per_cube, 0.04)                                     // +4% damage per cube (below the cap)
  const deathExtra = num(cc.death_drop_extra, 2)
  const crateCubes = num(cfg.crates && cfg.crates.cubes, 1), npcCubes = num(cfg.npc && cfg.npc.cubes, 2)
  const inc = (k) => { C[k] = (C[k] || 0) + 1 }

  // ---- per-decision state (computed once, at the first hook call of the decision; all inputs are sensed by then)
  let memo = -1, sq = false, reachOn = false, reachL = false, reachG = false, corpseOn = false, picksOn = false, nShoot = 0, lastMechSeen = -99
  const hv = { done: false, live: false, obj: null, cur: null, t: -9, econLoot: null, econNpc: -1, gatedTick: -1, disTick: -1 }
  const pile = { kd: null, n: 0 }
  const snap = new Map()                     // g4: cubes of every listed mech at the previous decision (the victim's pile)
  let closeTick = -1
  function st() {
    if (memo === B.tick) return
    memo = B.tick
    const me = B.me, t = me.t, L = B.trackList
    sq = B.env !== 'FFA' && hunt.firewall()
    reachOn = P.fmReach === true && (P.fmReachSq !== true || sq)
    reachL = reachOn && P.fmReachSide !== 2; reachG = reachOn && P.fmReachSide !== 1
    picksOn = P.fmPicks === true && (P.fmPicksSq !== true || sq)
    corpseOn = P.fmCorpse === true && sq && me.cubes < cap
    nShoot = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !(tr.hp > 0)) continue
      if (tr.lastSeen > lastMechSeen) lastMechSeen = tr.lastSeen
      if (t - tr.losInT <= P.losMemory && tr.dist <= P.fmShootR) nShoot++                // a shooter: a line on us inside fmShootR
    }
    if (P.fmCorpse === true) {
      // our newest kill drop (senses.js pushes it with the kill event); the victim's cubes from the previous decision
      let kd = null
      for (let i = B.killDrops.length - 1; i >= 0; i--) if (B.killDrops[i].foreign !== true) { kd = B.killDrops[i]; break }
      if (kd && kd !== pile.kd && kd.t === B.lastKillT) {
        let vid = -1
        for (const id of B.ourKills) vid = id
        pile.kd = kd; pile.n = (snap.has(vid) ? snap.get(vid) : 0) + deathExtra
        if (sq) { inc('fmPileKill'); C.fmPileN = (C.fmPileN || 0) + pile.n }   // counted in the live posture only
      }
    }
    if (P.fmHarvest === true) hvUpdate()
  }

  // ================================================================ g1 harvest window (SQUAD + firewall)
  function hvCond() {
    if (hv.done || !sq) return false
    const me = B.me, t = me.t
    if (B.counters.kills > 0 || t >= P.fmHvEndS) { hv.done = true; return false }        // one-way: escalation is kill-driven
    if (me.cubes >= P.fmHvCubes || me.hpf < P.fmHvHpf || B.lastStand || B.zoneUrgent) return false
    const L = B.trackList
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (!tr.npc && tr.hp > 0 && tr.dist <= P.fmHvLineR && t - tr.losInT <= P.fmHvLineS) return false   // the hunter closed in
    }
    return true
  }
  function nearDrone(x, y) {
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (tr.npc && Math.hypot(tr.x - x, tr.y - y) < P.droneAvoid) return true }
    return false
  }
  function stillThere(l) {
    if (l.type === 'drone') { const tr = B.tracks.get(l.id); return !!tr && tr.hp > 0 && tr.listed }
    const m = l.type === 'cube' ? B.cubes : l.type === 'crate' ? B.crates : B.pickups
    return m.get(l.id) === l.obj
  }
  /** The next item, in the order laser (none held), threshold cube, drone, crate, cube; nearest by time inside each class. */
  function hvChoose() {
    const me = B.me, t = me.t, walk = Math.max(1, me.walk), g = me.gun
    let best = null, bc = 9, bt = Infinity
    const put = (cls, type, o, tt) => { if (cls < bc || (cls === bc && tt < bt)) { bc = cls; bt = tt; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o, rush: false } } }
    const okAt = (o, tt, drone) => !mover.isAbandoned(o.x, o.y) && zoneSlack(B, o.x, o.y, t + tt + P.zoneArriveSlack) >= 3 && (drone || !nearDrone(o.x, o.y)) && econ.reachable(o.x, o.y, o.z)
    if (!me.laser) for (const p of B.pickups.values()) {
      if (p.kind !== 'laser' || (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) || !econ.wantPickup(p.kind)) continue
      const tt = econ.pathEst(p.x, p.y) / walk
      if (tt <= P.fmHvLaserS && okAt(p, tt, false)) put(0, 'pickup', p, tt)
    }
    const thr = me.cubes + 1 <= cap && TH.includes(me.cubes + 1)
    if (bc > 1) for (const c of B.cubes.values()) {
      if (t - c.seen > P.cubeMemS) continue
      const tt = econ.pathEst(c.x, c.y) / walk
      if (tt <= P.fmHvCubeS && okAt(c, tt, false)) put(thr ? 1 : 4, 'cube', c, tt)
    }
    if (bc > 2 && g) for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (!tr.npc || !tr.listed || !(tr.hp > 0) || (B.steal && B.steal.beingShot(tr.id))) continue
      const tt = Math.max(0, econ.pathEst(tr.x, tr.y) - P.droneApproach) / walk + tr.hp / Math.max(1, g.damage * me.dmgMult * 0.8) * g.cd + 1
      if (tt <= P.fmHvDroneS && okAt(tr, tt, true)) put(2, 'drone', tr, tt)
    }
    if (bc > 3 && g) for (const c of B.crates.values()) {
      if (B.steal && B.steal.beingShot(c.id)) continue
      const tt = Math.max(0, econ.pathEst(c.x, c.y) - P.crateApproach) / walk + Math.max(1, c.hp) / Math.max(1, g.damage * me.dmgMult) * g.cd + 1
      if (tt <= P.fmHvCubeS && okAt(c, tt, false)) put(3, 'crate', c, tt)
    }
    if (best) inc('fmHvPick' + bc)
    return best
  }
  function hvUpdate() {
    hv.live = false
    if (!hvCond()) return
    const t = B.me.t
    if (t - hv.t >= P.fmHvChooseS || !hv.obj || !stillThere(hv.obj)) { hv.t = t; hv.obj = hvChoose() }
    hv.live = !!hv.obj
    if (hv.live) inc('fmHvLive')
  }
  /** selectTarget candidate gate: false = this mech is no candidate (the window is open and no fight with it is running). */
  function gateOpen(tr) {
    st()
    if (!hv.live || tr.npc) return true
    if (tr === B.target && B.me.t - tr.lastDmgOutT < P.fmHvKeepS) return true             // a running fight is not "started"
    hv.gatedTick = B.tick
    return false
  }
  /** decideMode: true = the harvest item is our loot this decision (being shot does not send us into DISENGAGE). */
  function harvestLoot() {
    st()
    const on = hv.live && !!hv.cur && B.loot === hv.cur
    if (on && hv.disTick !== B.tick) { hv.disTick = B.tick; inc('fmHvShot') }
    return on
  }

  // ================================================================ g2 reach from value (both postures, or 'sq')
  const life = () => Math.max(P.fmLifeMin, 1 - B.me.t / P.fmLifeS)
  /** Offer share of the cube that makes the count n: the whole offer at a threshold, else 1 / (gap between thresholds). */
  function offerShare(n) {
    let lo = 0
    for (let i = 0; i < TH.length; i++) {
      const th = TH[i]
      if (th === n) return P.fmOfferHp
      if (th > n) return th > lo ? P.fmOfferHp / (th - lo) : 0
      lo = th
    }
    return 0
  }
  /** hp-equivalent of k more cubes now: heal + damage over the remaining life (below the stat cap) + the offer share. */
  function cubesValue(k) {
    const n0 = B.me.cubes, f = life()
    let v = 0
    for (let i = 1; i <= k; i++) { const n = n0 + i; if (n <= cap) v += healCube + dmgPct * P.fmHpPct * f; v += offerShare(n) }
    return v
  }
  /** hp per metre of the walk: the spec table by shooters inside fmShootR, or fmCostK x the incoming dps now (B.A: lines at
   *  any range and loadout, measured when hits arrive) per metre of boost when that is higher (0 = the table only) */
  //  With no shooter the cost is fmCost0 before our first kill and fmCost0Kill after it (escalation is kill-driven).
  const costPerM = () => Math.max(nShoot === 0 ? (B.counters.kills > 0 ? P.fmCost0Kill : P.fmCost0) : nShoot === 1 ? P.fmCost1 : P.fmCost2, P.fmCostK > 0 ? P.fmCostK * (B.A || 0) / Math.max(1, B.me.boostSpeed) : 0)
  /** 1 on our heading (within 60 deg of our velocity), 2 for a dead end (behind us), fmHeadMid when standing. */
  function headF(o) {
    const me = B.me, v = Math.hypot(me.vx, me.vy)
    if (v < P.fmHeadV) return P.fmHeadMid
    const dx = o.x - me.x, dy = o.y - me.y, d = Math.hypot(dx, dy)
    if (d < 1) return 1
    const c = (dx * me.vx + dy * me.vy) / (d * v)
    return 1 + Math.min(1, Math.max(0, 0.5 - c))
  }
  const reachOf = (value, o, capM) => Math.max(0, Math.min(capM, P.fmValK * value / (costPerM() * headF(o))))
  function cubeReach(c) {
    const me = B.me
    if (me.cubes >= cap) {
      let nx = -1
      for (let i = 0; i < TH.length; i++) if (TH[i] > me.cubes) { nx = TH[i]; break }
      if (nx < 0 || nx - me.cubes > P.fmCapNear) return P.fmCapR                          // past the cap: only the body grows
    }
    return reachOf(cubesValue(1), c, P.fmCapM)
  }
  function crateReach(c) {
    const me = B.me, g = me.gun
    if (me.hpf < P.fmCrateHpf || B.nLos > 0) return -1
    const shootT = g ? Math.max(1, c.hp) / Math.max(1, g.damage * me.dmgMult) * g.cd : 0
    return reachOf(cubesValue(crateCubes) + P.fmCrateBonus - shootT * P.fmIdleHpS, c, P.fmCapM)
  }
  function droneReach(tr) {
    const me = B.me, g = me.gun
    if (me.hpf < P.fmDroneHpf || me.t - lastMechSeen < P.fmDroneQuietS) return -1
    const shootT = g ? tr.hp / Math.max(1, g.damage * me.dmgMult * 0.8) * g.cd : 0
    return reachOf(cubesValue(npcCubes) - shootT * P.fmIdleHpS - P.fmDroneHit, tr, P.fmDroneCapM)
  }
  /** 0 a plain cube, 1 a cube of our newest pile while its run is live (g4), 2 a cube of our older or expired pile (g4; 3 with fmPileAfter 1),
   *  3 any other kill cube (a foreign death, or g4 not live): the old kill-cube rules keep it. */
  function cubeKind(c) {
    const t = B.me.t, L = B.killDrops
    let k = 0
    for (let i = 0; i < L.length; i++) {
      const kd = L[i]
      if (t - kd.t >= P.killDropS || Math.hypot(c.x - kd.x, c.y - kd.y) >= P.fmPileR) continue
      if (!corpseOn || kd.foreign === true) { if (k === 0) k = 3; continue }
      if (kd === pile.kd && t - kd.t <= P.fmPileS) return 1
      if (P.fmPileAfter === 1) { if (k === 0) k = 3; continue }                // fmPileAfter 1: after the run, the old kill-cube rules
      k = 2
    }
    return k
  }
  // ================================================================ g4 corpse run (SQUAD + firewall)
  function pileReach() {
    const lines = B.nLos
    if (lines >= P.fmPileLines) return P.fmPileNear
    return Math.min(P.fmPileCap, P.fmPileK * pile.n / Math.max(1, lines))
  }
  /** chooseLoot: the farm hp gate (g2 replaces farmHp by the per-item gates below). */
  function farmHp(base) { st(); return reachOn && P.fmReachSide !== 2 ? Math.min(P.fmCrateHpf, P.fmDroneHpf) : base }
  /** chooseLoot, per item: the path cap in m (negative = skip). */
  function lootR(type, o, base) {
    st()
    if (type === 'cube') {
      const k = cubeKind(o)
      if (k === 1) { C.fmPileLoot = (C.fmPileLoot || 0) + 1; return pileReach() }
      if (k === 3) return base
      if (reachL) { C.fmReachLoot = (C.fmReachLoot || 0) + 1; return cubeReach(o) }
      return k === 2 ? P.lootCubePath : base
    }
    if (!reachL) return base
    if (type === 'crate') { C.fmReachCrate = (C.fmReachCrate || 0) + 1; return crateReach(o) }
    if (type === 'drone') { C.fmReachDrone = (C.fmReachDrone || 0) + 1; return droneReach(o) }
    return base
  }
  const gOut = { r: 0, rush: false }
  /** chooseGrab, per remembered cube: null = the old rule; { r, rush } = the path cap (negative = skip) and the boost flag. */
  function grab(c, cubeR, lose) {
    st()
    const k = cubeKind(c)
    if (k === 1 && !lose) { gOut.r = pileReach(); gOut.rush = true; C.fmPileGrab = (C.fmPileGrab || 0) + 1; return gOut }
    if (k === 3 || (k === 0 && !reachG)) return null
    gOut.rush = false
    if (lose || !reachG) { gOut.r = cubeR; return gOut }                                  // our expired pile: the plain grab reach
    const me = B.me
    const fight = (B.target && !B.target.npc) || B.nLos > 0
    if (fight && me.cubes >= P.fmFightCubes && !(me.cubes + 1 <= cap && TH.includes(me.cubes + 1))) { gOut.r = -1; C.fmReachNoFight = (C.fmReachNoFight || 0) + 1; return gOut }
    gOut.r = cubeReach(c); C.fmReachGrab = (C.fmReachGrab || 0) + 1
    return gOut
  }
  /** bandFor: with at most fmCloseLines lines, close to fmCloseR when the target is within one beam + one magazine of death. */
  function band(o) {
    st()
    if (!corpseOn || o.hold <= P.fmCloseR || B.nLos > P.fmCloseLines) return
    const tr = B.target, me = B.me
    if (!tr || tr.npc || !(tr.hp > 0)) return
    const g = me.gun, lz = me.laser, k = me.dmgMult, rm = tr.rearOn ? me.rearMult : 1
    const per = g && tr.dist <= g.range ? g.damage * k * B.gunStat.q(tr.dist) * rm : 0
    const beam = lz && tr.dist <= lz.range && (lz.cooldown <= 0.3 || lz.charge > 0) ? lz.damage * k * rm : 0
    if (tr.hp > (g ? g.mag * per : 0) + beam) return
    o.hold = P.fmCloseR; o.lo = Math.min(o.lo, P.fmCloseR - P.fmCloseBand); o.hi = Math.min(o.hi, P.fmCloseR + P.fmCloseBand)
    if (closeTick !== B.tick) { closeTick = B.tick; inc('fmClose') }
  }

  // ================================================================ g6 upgrade order (both postures, or 'sq')
  let orders = null
  function buildOrders() {
    const ups = hello && hello.config && Array.isArray(hello.config.upgrades) ? hello.config.upgrades.map((u) => (u && typeof u.id === 'string' ? u.id : '')).filter(Boolean) : []
    const src = Array.isArray(P.fmOrder) ? P.fmOrder : []
    const base = []
    for (const id of src) if ((ups.length === 0 || ups.includes(id)) && !base.includes(id)) base.push(id)
    for (const id of ups) if (!base.includes(id)) base.push(id)
    C.fmOrderUnknown = ups.length > 0 ? src.filter((id) => !ups.includes(id)).length : 0
    C.fmOrderMissing = ups.filter((id) => !src.includes(id)).length
    const above = (ids) => {
      const o = base.filter((id) => !ids.includes(id)), at = o.indexOf('armor')
      o.splice(at < 0 ? 0 : at, 0, ...ids.filter((id) => base.includes(id)))
      return o
    }
    orders = { base, laser: above(['laser_damage']), gun: above(['gun_damage', 'gun_mag']) }
  }
  /** pick: the order to rank the offer with. Before fmPickEarlyS: laser_damage (laser held) or gun_damage + gun_mag (none) above armor. */
  function pickOrder(base) {
    st()
    if (!picksOn) return base
    if (!orders) buildOrders()
    const me = B.me
    if (me.t < P.fmPickEarlyS) { inc(me.laser ? 'fmPickEarlyL' : 'fmPickEarlyG'); return me.laser ? orders.laser : orders.gun }
    inc('fmPick')
    return orders.base
  }

  /** econ stage, after economy.update(): g1 puts the harvest item into B.loot (econ's own choice is kept for the hand-back). */
  function update() {
    st()
    if (P.fmCorpse === true) for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.listed) snap.set(tr.id, tr.cubes) }
    if (P.fmHarvest !== true) return
    if (hv.gatedTick === B.tick) inc('fmHvGate')
    if (B.loot !== hv.cur) { hv.econLoot = B.loot; hv.econNpc = B.farmNpc }
    const l = B.loot, steal = !!l && (l.type === 'steal' || l.type === 'rush')
    if (hv.live && !steal && (!B.target || B.target.npc)) {
      B.loot = hv.obj; hv.cur = hv.obj
      if (hv.obj.type === 'drone') B.farmNpc = hv.obj.id
      inc('fmHvLoot')
    } else if (hv.cur && B.loot === hv.cur) { B.loot = hv.econLoot; B.farmNpc = hv.econNpc; hv.cur = null }
  }

  const live = () => { st(); return hv.live || reachOn || corpseOn || picksOn }
  const debug = () => ({ sq, reachOn, corpseOn, picksOn, nShoot, hv: { done: hv.done, live: hv.live, item: hv.obj ? hv.obj.type + ':' + hv.obj.id : '' }, pile: pile.kd ? { n: pile.n, t: pile.kd.t } : null, orders })
  return { update, gateOpen, harvestLoot, farmHp, lootR, grab, band, pickOrder, live, debug,
    _: { cubesValue, cubeReach, crateReach, droneReach, pileReach, cubeKind, headF, costPerM, offerShare } }
}
