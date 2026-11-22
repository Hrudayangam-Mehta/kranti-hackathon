// FFA-only rules (integration pass 2a). Every function here acts only while B.env === 'FFA' (the D12 latch) and
// PARAMS.ffaRules; SQUAD play never reaches a decision in this file (practice bit-identity, D0).
// Sources: notes/counter_dossier.md section 5 (rules 1-10, with the section 6 corrections), the D11 items pass 1
// left undone (third-party timing, break sight 9 s / 20 m, boost rarely, hider and rusher counters, the final-point
// hp race) and notes/counters_2696_addendum.md (K2 aim dwell, K3 finish at 40%).
//
//   const ffa = makeFfa(B, mover)       B.ffa = ffa
//   ffa.update(obs)                     assess stage, every decision (returns at once outside FFA)
//   ffa.firstShotOk(tr)                 D5 candidate rule in FFA: finish, rule 3 third party, D11 duel survivor
//   ffa.breakUpdate()                   rule 4 / 9 / 10: B.ffaBreak, B.ffaRelocated (decideMode)
//   ffa.chargeTime(tr), hideReach()     rule 1 hide budget
//   ffa.peekOpen(tr), laserReady(tr)    rule 1 beam clock
//   ffa.lightLegs(), beamHideLegs()     rule 5, rule 1 outside FIGHT
//   ffa.boostVeto()                     D11 boost rarely
//   ffa.isHider(tr), isRusher(tr), prox(tr), reverser(tr), raceOn()

import { angDiff, wrapPi } from './aim.js'
import { MODE } from './params.js'
import { zoneSlack } from './senses.js'
import { inArena } from './tactics.js'

export function makeFfa(B, mover) {
  const P = B.P
  const bs = { on: false, id: -1, t0: -99, seenT: -99, sx: 0, sy: 0, relocated: false, n: 0, unseenT0: -1 }
  let prevAlive = -1
  const TH = Array.isArray(B.cfg.cubes && B.cfg.cubes.upgrade_thresholds) ? B.cfg.cubes.upgrade_thresholds : [1, 3, 6, 10, 15, 21]
  const th1 = TH[0] || 1, th2 = TH[1] || 3
  const on = () => B.env === 'FFA' && P.ffaRules === true

  /** Rule 1 / M12: a mech's full laser charge time: measured on a first-tick flag, else the shortest its cubes allow. */
  function chargeTime(tr) {
    if (tr.chargeMeasCubes === tr.cubes && tr.chargeMeas > 0) return Math.max(P.ffaChargeMin, tr.chargeMeas)
    const full = (B.cfg.weapons.laser && B.cfg.weapons.laser.charge) || 0.75
    // offers come at 1, 3, 6 ... cubes: one Fast capacitor stack possible from the first, two from the second
    const stacks = !tr.cubesKnown || tr.cubes >= th2 ? 2 : tr.cubes >= th1 ? 1 : 0
    return full * Math.pow(P.ffaCapMult, stacks)
  }
  /** Seconds left of the hide budget (charge time - one decision, from the first tick we saw the flag); -1 = none. */
  function hideLeft() {
    const t = B.me.t
    let left = Infinity
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.chargeAtMeT !== t) continue
      const l = tr.chargeT0 + chargeTime(tr) - P.ffaReactS - t
      if (l < left) left = l
    }
    return left === Infinity ? -1 : left
  }
  /** Metres we can cover inside the hide budget (half speed and no boost while our own laser charges). */
  function hideReach(canBoost) {
    const me = B.me, left = hideLeft()
    if (left <= 0) return 0
    const ownCharge = !!(me.laser && me.laser.charge > 0)
    const v = ownCharge ? me.walk * me.chargeMoveMult : canBoost ? me.boostSpeed : me.walk
    return left * v + 1
  }

  /** Rule 1 beam clock: true while exposing ourselves to this laser holder is allowed. */
  function laserReady(tr) { return tr.hasLaser && !(B.me.t - tr.flagDropT <= P.ffaPeekBeamS) }
  function peekRef(tr) { return tr.flagSeenT > tr.losInT - 3 && tr.flagSeenT > -90 ? tr.flagSeenT + P.ffaPeekFlagS : tr.losInT + P.ffaPeekLineS }
  function peekOpen(tr) {
    if (!tr.hasLaser) return true
    const t = B.me.t, me = B.me
    if (t - tr.flagDropT <= P.ffaPeekBeamS) return true                  // its beam (or flag drop) just went: 1.65 s cooldown
    if (tr.charging) return false                                        // a flag during a peek: the hide budget applies again
    if (t - tr.peekT0 <= P.ffaPeekS) return true                         // a timer peek in progress (0.6 s)
    if (t - tr.losInT > P.ffaPeekHoldS) return true                      // never stranded in cover: after 12 s the hold ends
    // A-bot C2 timers: 2.9 s after a flag we saw, else 4.3 s after we left its line; then a 0.6 s peek, laser ready, hp > 50%
    const ready = me.laser ? me.laser.cooldown <= 0.11 || me.laser.charge > 0 : true
    if (t >= peekRef(tr) && ready && me.hpf > P.ffaPeekHpf) { tr.peekT0 = t; return true }
    return false
  }
  /** Seconds until the next timer peek of this laser holder (0 when open, Infinity when not a laser holder). */
  function peekIn(tr) {
    if (!tr.hasLaser) return Infinity
    const t = B.me.t
    if (peekOpen(tr)) return 0
    return Math.max(0, peekRef(tr) - t)
  }

  /** M14: never closer than 45 m (60 m for 1-2 cubes, 75 m with 3 or more: sensor stacks). */
  function prox(tr) { const p = P.ffaProx; return !tr.cubesKnown || tr.cubes >= th2 ? p[2] : tr.cubes >= th1 ? p[1] : p[0] }
  /** Bearing of us from its torso: 0 = it faces us. */
  function offAim(tr) { return Math.abs(angDiff(tr.yaw, wrapPi(tr.bearing + Math.PI))) }
  function othersNear(tr, r) {
    for (let k = 0; k < B.trackList.length; k++) {
      const o = B.trackList[k]
      if (o === tr || o.npc || !o.listed || o.id === tr.busyLastWith) continue      // listed mechs only (the victim's ghost track is not one)
      if (Math.hypot(o.x - tr.x, o.y - tr.y) < r) return true
    }
    return false
  }
  /** Counter-module read (if the module is wired): confident hider / rusher. */
  function readIs(tr, arch) {
    if (!B.cx || tr.npc) return false
    const r = B.cx.archetypeOf(tr.id)
    return r.archetype === arch && r.confidence >= P.ffaHiderConf
  }
  const isHider = (tr) => readIs(tr, 'HIDER') && !tr.hostile
  const isRusher = (tr) => readIs(tr, 'BOOST_RUSHER')
  /** Rule 6: a sub-second reverser (median gap between sideways reversals under 0.95 s over the last 3 s). */
  const gaps = new Float64Array(4)
  function reverser(tr) {
    const t = B.me.t
    let n = 0
    const r = tr.revT
    const ts = [r[0], r[1], r[2], r[3]].filter((x) => x > 0 && t - x <= P.ffaRevWindow).sort((a, b) => a - b)
    if (ts.length < 3) return false
    for (let i = 1; i < ts.length; i++) gaps[n++] = ts[i] - ts[i - 1]
    const g = Array.from(gaps.subarray(0, n)).sort((a, b) => a - b)
    const med = n % 2 ? g[(n - 1) / 2] : 0.5 * (g[n / 2 - 1] + g[n / 2])
    return med < P.ffaRevGap
  }

  // ------------------------------------------------------------------ per-decision bookkeeping (FFA only)
  function update(obs) {
    const alive = obs && Number.isInteger(obs.alive) ? obs.alive : -1
    if (!on()) { if (alive >= 0) prevAlive = alive; return }
    const me = B.me, t = me.t, L = B.trackList
    const cosB = Math.cos(P.ffaBusyRad)
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc) continue
      if (tr.listed) {
        // busy: torso within 0.2 rad of another listed mech inside 230 m (rule 3 "busy with another for 1.5 s")
        const cy = Math.cos(tr.yaw), sy = Math.sin(tr.yaw)
        let best = -1, bestC = cosB
        for (let j = 0; j < L.length; j++) {
          const o = L[j]
          if (o === tr || o.npc || !o.listed) continue
          const dx = o.x - tr.x, dy = o.y - tr.y, d = Math.hypot(dx, dy)
          if (d < 1 || d > P.ffaBusyR) continue
          const c = (dx * cy + dy * sy) / d
          if (c > bestC) { bestC = c; best = o.id }
        }
        if (best >= 0) {
          if (tr.busyWith !== best) { tr.busyWith = best; tr.busySince = t }
          tr.busyLastT = t; tr.busyLastWith = best
        } else if (t - tr.busyLastT > 0.3) tr.busyWith = -1
        // closing speed on us (rule 5)
        const dx = me.x - tr.x, dy = me.y - tr.y, d = Math.hypot(dx, dy) || 1
        const vc = (dx * tr.vx + dy * tr.vy) / d
        if (vc > P.ffaLightCloseV) { if (tr.closeSince < 0) tr.closeSince = t } else tr.closeSince = -1
      } else { tr.busyWith = -1; tr.closeSince = -1 }
    }
    // D11 third-party timing: a death we did not cause -> the mech that was busy with the victim survived a duel
    if (alive >= 0 && prevAlive >= 0 && alive < prevAlive) {
      let ours = 0
      const ev = obs && Array.isArray(obs.events) ? obs.events : []
      for (let k = 0; k < Math.min(ev.length, 64); k++) if (ev[k] && ev[k].type === 'kill') ours++
      if (prevAlive - alive > ours) {
        for (let k = 0; k < L.length; k++) {
          const tr = L[k]
          if (tr.npc || !tr.listed || t - tr.busyLastT > 2 || tr.busyLastWith < 0) continue
          const v = B.tracks.get(tr.busyLastWith)
          if (!v || !v.listed || v.hp <= 0) tr.duelWonT = t
        }
      }
    }
    if (alive >= 0) prevAlive = alive
    twoUpdate()
    // rule 3 exit: the mech we third-partied turns to us, its opponent is nearly dead, or a second mech has a line on us
    const tg = B.target
    if (tg && !tg.npc && t - tg.lastDmgOutT < 5 && t - tg.thirdT < 10) {
      let exit = offAim(tg) < P.ffaThirdExitRad
      const opp = tg.busyWith >= 0 ? B.tracks.get(tg.busyWith) : null
      if (opp && opp.hp < P.ffaThirdOppHpf * opp.maxHp) exit = true
      for (let k = 0; k < L.length && !exit; k++) { const o = L[k]; if (o !== tg && !o.npc && o.listed && o.losIn) exit = true }
      if (exit) { tg.thirdExitT = t; tg.thirdT = -99 }
    }
  }

  // ------------------------------------------------------------------ R3a2 final-only rules (FFA latch)
  /** Nominal dps of a mech on us from its weapons and range (the assess prior without the aim discount). */
  function nominalDps(tr) {
    const cfg = B.cfg, g = cfg.weapons.gun || {}, d = tr.dist
    const gunDps = (g.damage || 45) * (g.mag || 12) / Math.max(0.05, ((g.mag || 12) - 1) * (g.cooldown || 0.24) + (g.reload || 2.4))
    const b = P.rangeBins, pin = P.pIn
    const q = d < b[0] ? pin[0] : d < b[1] ? pin[1] : d < b[2] ? pin[2] : d <= b[3] ? pin[3] : 0
    let v = 0
    if (tr.hasGun && d <= (g.range || 230)) v += gunDps * q
    if (tr.hasLaser && d <= ((cfg.weapons.laser && cfg.weapons.laser.range) || 280)) v += P.laserDpsIn
    if (tr.hasLightning && d < ((cfg.weapons.lightning && cfg.weapons.lightning.range) || 45) + B.me.radius) v += P.lightDpsIn
    if (tr.hasMortar && d < 235 && d > 15) v += P.mortarDpsIn
    return v * (1 + (cfg.cubes.damage_per_cube || 0.04) * Math.min(tr.cubes, cfg.cubes.stat_cap || 10))
  }
  /** Z8: with 2 alive compare max hp (both heal to full): WAIT ahead by twoGap, CLOSE behind by twoGap, else DUEL. */
  function twoUpdate() {
    B.twoMode = ''; B.twoOther = null
    if (P.ffaTwo !== true || B.aliveN !== 2) return
    let o = null
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.hp > 0 && tr.conf > 0.05 && (!o || tr.lastSeen > o.lastSeen)) o = tr }
    const diff = B.me.maxHp - (o ? o.maxHp : ((B.cfg.mech && B.cfg.mech.hp) || 1400))
    B.twoMode = diff >= P.twoGap ? 'WAIT' : diff <= -P.twoGap ? 'CLOSE' : 'DUEL'
    B.twoOther = o
  }
  /** Z8 CLOSE: an opening on the stronger mech (under 60%, reloading, charging away, outside the zone, busy), from outside its wedge. */
  function closeOpening(tr) {
    const t = B.me.t
    if (offAim(tr) <= P.ffaWedgeDeg * Math.PI / 180) return false
    if (tr.hp < P.twoCloseHpf * tr.maxHp) return true
    if (tr.magN >= P.magSize && t - tr.lastBulletT < P.magReloadS) return true
    if (tr.charging && offAim(tr) > P.twoAwayRad) return true
    if (B.zone.known && zoneSlack(B, tr.x, tr.y, t) < 0) return true
    if (tr.busyWith >= 0) return true
    const cy = Math.cos(tr.yaw), sy = Math.sin(tr.yaw), cb = Math.cos(P.ffaBusyRad)
    for (let k = 0; k < B.trackList.length; k++) {
      const o = B.trackList[k]
      if (!o.npc || !o.listed) continue
      const dx = o.x - tr.x, dy = o.y - tr.y, d = Math.hypot(dx, dy)
      if (d > 1 && d < 120 && (dx * cy + dy * sy) / d > cb) return true                  // busy with a drone
    }
    return false
  }
  /** Z8 DUEL: our duel estimate (time we last / time it lasts) at its nominal dps. */
  function duelP(tr) {
    const a = tr.a > 0 ? tr.a : nominalDps(tr)
    return B.me.hp * tr.b / (Math.max(1, tr.hp) * Math.max(20, a))
  }
  /** Z10: a wounded mech outside the zone while the zone burns >= fgDps and we are not under heavy fire. */
  function gateOk(tr) {
    const z = B.zone
    return P.ffaGate === true && !tr.npc && z.known && z.dps >= P.fgDps && tr.hp < P.fgHpf * tr.maxHp && B.A <= P.fgAbortDps && zoneSlack(B, tr.x, tr.y, B.me.t) < 0
  }
  /** Z5: the moment this point leaves the shrinking circle (the end of the shrink when it never does before). */
  function exitT(x, y) {
    const z = B.zone, t = B.me.t, end = Math.max(t, z.t1)
    if (zoneSlack(B, x, y, t) < 0) return t
    for (let k = 1; k <= 80; k++) { const tt = t + k * 0.25; if (tt >= end) break; if (zoneSlack(B, x, y, tt) < 0) return tt }
    return end
  }
  /** Z5: the mech with the smallest positive E - E_us (E = hp - dps x (end - exit)); if we are on top, our attacker. */
  function finalPick() {
    if (!on()) return null
    const me = B.me, z = B.zone, end = Math.max(me.t, z.t1), dps = Math.max(1, z.dps)
    const eUs = me.hp - dps * (end - exitT(me.x, me.y))
    let best = null, bestD = Infinity
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || !tr.listed || tr.hp <= 0) continue
      const d = tr.hp - dps * (end - exitT(tr.x, tr.y)) - eUs
      if (d > 0 && d < bestD) { bestD = d; best = tr }
    }
    if (best) return best
    const a = B.topAttacker
    return a && !a.npc && a.hp > 0 ? a : null
  }
  /** Z5: a body already on the final point (closer to it than we are): stand next to it on the current-centre side. */
  const ps = { x: 0, y: 0 }
  function pointSide() {
    const me = B.me, z = B.zone, dMe = Math.hypot(me.x - z.nx, me.y - z.ny)
    let occ = null, occD = Infinity
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || !tr.listed || tr.hp <= 0) continue
      const d = Math.hypot(tr.x - z.nx, tr.y - z.ny)
      if (d < me.radius + tr.radius + P.fpPad && d < dMe && d < occD) { occD = d; occ = tr }
    }
    if (!occ) return null
    let ux = z.cx - z.nx, uy = z.cy - z.ny, ul = Math.hypot(ux, uy)
    if (ul < 0.5) { ux = me.x - occ.x; uy = me.y - occ.y; ul = Math.hypot(ux, uy) || 1 }
    const r = me.radius + occ.radius + P.fpPad
    ps.x = occ.x + ux / ul * r; ps.y = occ.y + uy / ul * r
    return ps
  }
  /** Z10: at shrink start a post fgInside m inside the next edge on the entry bearing of a wounded mech outside it. */
  const gp = { x: 0, y: 0 }
  function gatePost() {
    const me = B.me, z = B.zone, t = me.t
    if (!on() || P.ffaGate !== true || !z.known || z.dps < P.fgDps || z.nr <= P.zoneLateR || t < z.t0 || t >= z.t1 || B.A > P.fgAbortDps) return null
    let best = null
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.hp <= 0 || tr.conf < 0.3 || tr.hp >= P.fgHpf * tr.maxHp) continue
      if (Math.hypot(tr.x - z.nx, tr.y - z.ny) <= z.nr) continue
      if (!best || tr.dist < best.dist) best = tr
    }
    if (!best) return null
    const dx = best.x - z.nx, dy = best.y - z.ny, l = Math.hypot(dx, dy) || 1
    gp.x = z.nx + dx / l * (z.nr - P.fgInside); gp.y = z.ny + dy / l * (z.nr - P.fgInside)
    if (!inArena(B, gp.x, gp.y, 2) || zoneSlack(B, gp.x, gp.y, z.t1 + 5) < 5) return null
    return gp
  }

  /** D5 in FFA (D11 + rules 3 and 8): who may get our first shot. Hostile mechs are candidates anyway (D0). */
  function firstShotOk(tr) {
    const t = B.me.t
    if (!B.ffaOpen) return false
    if (tr.finishable || tr.hp <= P.ffaFinishHpf * tr.maxHp) return true                          // rule 8: a finish
    if (t - tr.thirdExitT < P.ffaThirdHoldS) return false
    // D11: the survivor of a duel within 4 s, under half hp, nobody else within 120 m of it
    if (t - tr.duelWonT <= P.ffaThirdS && tr.hp < P.ffaWoundTgt * tr.maxHp && !othersNear(tr, P.ffaThirdR)) { tr.thirdT = t; return true }
    // R3a2 Z9: with 3 alive hold fire unless targeted (hostile mechs are candidates anyway) or finishing
    if (P.ffaThree === true && B.aliveN === 3) return false
    // R3a2 Z8: with 2 alive WAIT never opens, CLOSE only on an opening, DUEL at an estimate >= twoDuelP
    if (P.ffaTwo === true && B.aliveN === 2 && B.twoMode) {
      if (B.twoMode === 'WAIT') return false
      if (B.twoMode === 'CLOSE' ? closeOpening(tr) : duelP(tr) >= P.twoDuelP) { tr.twoOkT = t; return true }
      return false
    }
    // R3a2 Z10: a wounded mech outside the burning zone within fgR with a line
    if (P.ffaGate === true && tr.listed && tr.losOut && tr.dist <= P.fgR && gateOk(tr)) return true
    // rule 3: busy with another mech for 1.5 s and under half hp; from outside its wedge at 60-190 m; cover within 6 m
    if (!tr.listed || tr.busyWith < 0 || t - tr.busySince < P.ffaBusyS || tr.hp >= P.ffaWoundTgt * tr.maxHp) return false
    if (offAim(tr) <= P.ffaWedgeDeg * Math.PI / 180) return false
    if (tr.dist < Math.max(P.ffaThirdLo, prox(tr)) || tr.dist > P.ffaThirdHi) return false
    if (!(B.hide.state === 'found' && B.hide.dist <= P.ffaThirdCover)) return false
    tr.thirdT = t
    return true
  }

  /**
   * Rules 4, 9 and 10 (D11 "break sight"): when a mech targets us (D0 hostility: hit us in 4 s, or aims at us with a
   * line), or two mechs have a line on us, or we are wounded in someone's view (under 50% within 200 m, under 65%
   * within 115 m), answer fire while breaking the line, relocate 20 m from where we were last seen and stay out of
   * sight for 9 s. Not against a finish, a rusher (do not run), our lightning brawl, in the late zone, at OFFENSIVE.
   */
  function breakUpdate() {
    const me = B.me, t = me.t, z = B.zone
    B.ffaBreak = false; B.ffaRelocated = false
    if (!on()) { bs.on = false; return }
    const tgt = B.target
    const exempt = (z.known && z.nr <= P.zoneLateR) || B.stance === 'OFFENSIVE' || B.lastStand || B.killSecure || B.finishing ||
      (tgt && !tgt.npc && (tgt.finishable || tgt.hp <= P.ffaFinishHpf * tgt.maxHp) && t - tgt.lastDmgOutT < 3)
    let trig = false, id = -1, anyHostile = false
    if (!exempt) {
      const L = B.trackList
      const liR = me.lightning ? me.lightning.range + me.radius : 0
      for (let k = 0; k < L.length; k++) {
        const tr = L[k]
        if (tr.npc || tr.hp <= 0) continue
        if (tr.hostile) anyHostile = true
        if (!tr.hostile || tr.hp <= P.ffaFinishHpf * tr.maxHp || tr.finishable || isRusher(tr)) continue
        if (me.lightning && tr.dist <= liR && me.hp >= tr.hp) continue                              // our lightning brawl
        trig = true; id = tr.id; break
      }
      if (!trig && B.nLos >= 2 && anyHostile) trig = true                                           // rule 10: second line of fire
      if (!trig) {
        for (let k = 0; k < L.length; k++) {
          const tr = L[k]
          if (tr.npc || !tr.listed || !tr.losIn) continue
          if ((me.hpf < P.ffaWoundHpf && tr.dist <= P.ffaWoundR) || (me.hpf < P.ffaCourtesyHpf && tr.dist <= P.ffaCourtesyR)) { trig = true; break }   // rules 9 / 8
        }
      }
      if (trig && !bs.on && (B.hide.state === 'found' || B.hide.state === 'run')) {
        bs.on = true; bs.id = id; bs.t0 = t; bs.seenT = t; bs.sx = me.x; bs.sy = me.y; bs.n++; bs.unseenT0 = -1
        B.counters.ffaBreaks = (B.counters.ffaBreaks || 0) + 1
      }
    }
    if (bs.on) {
      if (t - B.lastLosInT <= 0.2) { bs.seenT = t; bs.sx = me.x; bs.sy = me.y; bs.unseenT0 = -1 }   // seen again: the clock restarts here
      else if (bs.unseenT0 < 0) bs.unseenT0 = t
      const fix = P.ffaBreakFix === true
      bs.relocated = Math.hypot(me.x - bs.sx, me.y - bs.sy) >= P.ffaBreakM || (fix && bl.noGoal && t - bs.seenT >= 0.5)
      // pass 2b: the 9 s are counted from the first decision out of sight and must be exceeded (not from the last one seen)
      const unseenDone = fix ? bs.unseenT0 >= 0 && t - bs.unseenT0 >= P.ffaBreakS + 0.05 : t - bs.seenT >= P.ffaBreakS
      if (exempt || (unseenDone && bs.relocated) || t - bs.t0 > P.ffaBreakMaxS) bs.on = false
    }
    B.ffaBreak = bs.on; B.ffaRelocated = bs.relocated
  }

  // ------------------------------------------------------------------ pass 2b: rule 4 sight-break legs (check2a FAIL)
  // The hide cell is tested at its exact point; standing 0.3-0.9 m off it can show the head (vision needs the centre or
  // the top), and the M10 escape walk crosses open ground. So inside a break: (1) at the cell but still in a line for
  // 0.4 s -> settle 2-6 m deeper (hidden centre, head and top); (2) out of sight -> move >= 20 m from the last-seen point
  // along a hidden straight walk (end point and two points on the way hidden); (3) then stand still until the 9 s are up.
  // Ray work is sliced: at most RAY_BUDGET sight rays per decision, the search resumes on the next one.
  const RAY_BUDGET = 96
  const bl = { exT: -1, sx: 0, sy: 0, sOk: false, sT: -99, sCur: -1, gx: 0, gy: 0, gOk: false, gT: -99, gCur: -1, fails: 0, noGoal: false, id0: -1 }
  const cand = new Float64Array(48 * 2), candN = { n: 0 }
  const BT = { n: 0, x: new Float64Array(4), y: new Float64Array(4), mz: new Float64Array(4), ez: new Float64Array(4) }
  let rays = 0
  function threatsForBreak() {
    const t = B.me.t, L = B.trackList, eyeK = ((B.cfg.mech && B.cfg.mech.eye_height) || 8) / ((B.cfg.mech && B.cfg.mech.height) || 9)
    BT.n = 0
    for (let k = 0; k < L.length && BT.n < 3; k++) {
      const tr = L[k]
      if (tr.npc || tr.hp <= 0 || tr.conf < 0.25 || tr.dist > 320 || !(tr.listed || t - tr.lastSeen < 5)) continue
      BT.x[BT.n] = tr.x; BT.y[BT.n] = tr.y; BT.mz[BT.n] = tr.z + tr.muzzleH; BT.ez[BT.n] = tr.z + tr.height * eyeK; BT.n++
    }
  }
  /** Hidden from every break threat: muzzle -> centre and 0.9 h (the losIn test), eye -> top (vision). */
  function hiddenAt(x, y, z) {
    const w = B.world, h = B.me.height
    for (let i = 0; i < BT.n; i++) {
      rays += 3
      if (w.shotClear(BT.x[i], BT.y[i], BT.mz[i], x, y, z + h * 0.5) || w.shotClear(BT.x[i], BT.y[i], BT.mz[i], x, y, z + h * 0.9) || w.shotClear(BT.x[i], BT.y[i], BT.ez[i], x, y, z + h * 0.99)) return false
    }
    return true
  }
  /** Fill cand with points around (ox, oy) at the radii, ordered away from the threat centroid first. */
  function fillCand(ox, oy, radii, nDir) {
    let cxs = 0, cys = 0
    for (let i = 0; i < BT.n; i++) { cxs += BT.x[i]; cys += BT.y[i] }
    const ax = BT.n ? ox - cxs / BT.n : 1, ay = BT.n ? oy - cys / BT.n : 0, al = Math.hypot(ax, ay) || 1
    const tmp = []
    for (let ri = 0; ri < radii.length; ri++) for (let k = 0; k < nDir; k++) {
      const a = k * 2 * Math.PI / nDir + ri * 0.2, ux = Math.cos(a), uy = Math.sin(a)
      tmp.push([ox + radii[ri] * ux, oy + radii[ri] * uy, radii[ri] * 0.05 - (ux * ax + uy * ay) / al])
    }
    tmp.sort((p, q) => p[2] - q[2])
    candN.n = Math.min(tmp.length, 48)
    for (let i = 0; i < candN.n; i++) { cand[2 * i] = tmp[i][0]; cand[2 * i + 1] = tmp[i][1] }
  }
  /** (1) a point 2-6 m from us hidden from every threat (sliced). true = found, false = searching, null = none. */
  function settleStep() {
    const me = B.me, nav = B.nav, comp = nav.component(me.x, me.y)
    if (bl.sCur < 0) { threatsForBreak(); fillCand(me.x, me.y, [2.5, 4.5, 6.5], 8); bl.sCur = 0 }
    while (bl.sCur < candN.n && rays < RAY_BUDGET) {
      const i = bl.sCur++, x = cand[2 * i], y = cand[2 * i + 1]
      if (!nav.passableAt(x, y) || (comp >= 0 && nav.component(x, y) !== comp) || !inArena(B, x, y, 1)) continue
      if (!nav.walkLine(me.x, me.y, x, y)) continue
      if (hiddenAt(x, y, nav.levelAt(x, y))) { bl.sx = x; bl.sy = y; bl.sCur = -1; return true }
    }
    if (bl.sCur >= candN.n) { bl.sCur = -1; return null }
    return false
  }
  /** (2) a point >= ffaBreakM + 2 m from the last-seen point, reached by a hidden straight walk (sliced). */
  function relocStep() {
    const me = B.me, nav = B.nav, comp = nav.component(me.x, me.y), t = me.t
    if (bl.gCur < 0) { threatsForBreak(); fillCand(me.x, me.y, [12, 20, 28], 16); bl.gCur = 0 }
    while (bl.gCur < candN.n && rays < RAY_BUDGET) {
      const i = bl.gCur++, x = cand[2 * i], y = cand[2 * i + 1]
      if (Math.hypot(x - bs.sx, y - bs.sy) < P.ffaBreakM + 2) continue
      if (!nav.passableAt(x, y) || (comp >= 0 && nav.component(x, y) !== comp) || !inArena(B, x, y, 2)) continue
      if (zoneSlack(B, x, y, t + Math.hypot(x - me.x, y - me.y) / me.walk + 10) < 3) continue
      if (!nav.walkLine(me.x, me.y, x, y)) continue
      if (!hiddenAt(x, y, nav.levelAt(x, y))) continue
      const x1 = me.x + (x - me.x) / 3, y1 = me.y + (y - me.y) / 3, x2 = me.x + (x - me.x) * 2 / 3, y2 = me.y + (y - me.y) * 2 / 3
      if (!hiddenAt(x1, y1, nav.levelAt(x1, y1)) || !hiddenAt(x2, y2, nav.levelAt(x2, y2))) continue
      bl.gx = x; bl.gy = y; bl.gCur = -1; return true
    }
    if (bl.gCur >= candN.n) { bl.gCur = -1; return null }
    return false
  }
  /**
   * Legs inside a rule 4 break (DISENGAGE). 0 = not handled (the normal hide / retreat legs run), 1 = handled,
   * 2 = the hide cell shows us even when we stand on it: mark it bad and search again (the caller does it).
   */
  function breakLegs(exposed) {
    if (!on() || P.ffaBreakFix !== true || !bs.on || B.mode !== MODE.DISENGAGE || !B.nav || !B.world) { bl.exT = -1; return 0 }
    const me = B.me, t = me.t, h = B.hide, cmd = B.cmd
    rays = 0
    if (bl.id0 !== bs.n) { bl.id0 = bs.n; bl.gOk = false; bl.sOk = false; bl.fails = 0; bl.noGoal = false; bl.sCur = -1; bl.gCur = -1 }
    if (exposed) {
      bl.gOk = false; bl.gCur = -1
      const seenNow = t - B.lastLosInT <= 0.2
      const atCell = h.state === 'found' && Math.hypot(h.x - me.x, h.y - me.y) < 3
      if (!(atCell && seenNow)) { bl.exT = -1; bl.sOk = false; bl.sCur = -1; return 0 }
      if (bl.exT < 0) bl.exT = t
      if (t - bl.exT < P.ffaBreakSettleS) return 0
      if (!bl.sOk) {
        const r = settleStep()
        if (r === null) { bl.exT = -1; B.counters.ffaBreakBadCells = (B.counters.ffaBreakBadCells || 0) + 1; return 2 }
        if (r === false) { cmd.mx = 0; cmd.my = 0; B.legKind = 'brksettle'; return 1 }
        bl.sOk = true; bl.sT = t
      }
      if (t - bl.sT > 2.5) { bl.sOk = false; return 0 }
      mover.moveTo(bl.sx, bl.sy, 1, 0.25)
      B.legKind = 'brksettle'
      return 1
    }
    bl.exT = -1; bl.sOk = false; bl.sCur = -1
    if (!bs.relocated && !bl.noGoal) {
      if (bl.gOk && (Math.hypot(bl.gx - me.x, bl.gy - me.y) < 1.5 || t - bl.gT > 6 || mover.isAbandoned(bl.gx, bl.gy))) bl.gOk = false
      if (!bl.gOk) {
        const r = relocStep()
        if (r === true) { bl.gOk = true; bl.gT = t }
        else if (r === null && ++bl.fails >= P.ffaBreakTries) { bl.noGoal = true; B.counters.ffaBreakNoGoal = (B.counters.ffaBreakNoGoal || 0) + 1 }
      }
      if (bl.gOk) { mover.moveTo(bl.gx, bl.gy, 1, 1); B.legKind = 'brkmove'; B.hidePhase = true; return 1 }
    }
    // relocated, or no hidden walk of 20 m exists: stand still out of sight until the 9 s are up
    cmd.mx = 0; cmd.my = 0
    B.legKind = 'brkstill'; B.hidePhase = true
    return 1
  }

  /** Rule 5: keep 50-70 m from a lightning carrier unless we hold lightning and at least its hp. True when it took the legs. */
  function lightLegs() {
    if (!on()) return false
    const me = B.me, t = me.t, cmd = B.cmd, h = B.hide
    let L = null
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || !tr.listed || !tr.hasLightning || tr.hp <= 0) continue
      if (me.lightning && me.hp >= tr.hp) continue
      if (tr.dist > P.ffaLightOuter + me.radius) break
      const fast = tr.closeSince >= 0 && t - tr.closeSince >= P.ffaLightCloseS
      if (tr.dist < P.ffaLightKeep + me.radius || fast) { L = tr; break }
    }
    if (!L) return false
    const fast = L.closeSince >= 0 && t - L.closeSince >= P.ffaLightCloseS
    if (fast && h.state === 'found' && !mover.isAbandoned(h.x, h.y)) {
      mover.moveTo(h.x, h.y, 1, 0.8)
      cmd.boost = me.grounded && mover.boostOk(P.boostReserve)
      B.legKind = 'lightcover'
      return true
    }
    // walk straight away (11.7 m/s against its 8.7-9 closing); walkable() never steps out of the zone
    if (!mover.standoff(L.x, L.y, P.ffaLightOuter, false, false, P.ffaLightOuter, 1e9, 1)) {
      const ax = me.x - L.x, ay = me.y - L.y, l = Math.hypot(ax, ay) || 1
      mover.moveTo(me.x + ax / l * 20, me.y + ay / l * 20, 1, 1)
    }
    B.legKind = 'lightkeep'
    return true
  }

  /** Rule 1 outside FIGHT (looting, holding, dropping): a laser charging at us -> the hide cell, if the budget reaches it. */
  function beamHideLegs() {
    if (!on()) return false
    const me = B.me, h = B.hide, cmd = B.cmd
    if (B.mode === MODE.ZONE || B.mode === MODE.FIGHT || me.t - B.chargeAtMeT >= 0.9 || h.state !== 'found') return false
    const canBoost = me.energy >= P.boostReserve && me.grounded
    if (h.dist > hideReach(canBoost)) return false
    mover.moveTo(h.x, h.y, 1, 0.8)
    cmd.boost = canBoost && h.dist > hideReach(false)
    B.legKind = 'beamhide'
    return true
  }

  /** D11 "boost rarely": in FFA boost only for the zone, shell / beam / lightning escapes, breaking sight and the hop. */
  function boostVeto() {
    if (!on()) return false
    if (B.mode === MODE.ZONE || B.wantJet) return false
    const k = B.legKind
    return !(k === 'dodge' || k === 'hop' || k === 'beamhide' || k === 'lightcover' || k === 'hide' || k === 'retreat')
  }

  /** D11 final-point hp race: from about 390 s stand on next_center (the point the last circle closes on). */
  function raceOn() {
    const z = B.zone
    return on() && z.known && z.nr <= 0.5 && (B.me.t >= P.ffaFinalT || (P.finalPoint === true && B.me.t >= P.fpStartT))   // R3a2 Z5: from fpStartT
  }

  return { update, firstShotOk, breakUpdate, chargeTime, hideLeft, hideReach, laserReady, peekOpen, peekIn, prox, offAim, isHider, isRusher, reverser,
    lightLegs, beamHideLegs, boostVeto, raceOn, on, breakLegs, state: bs, finalPick, pointSide, gateOk, gatePost, nominalDps, duelP }
}
