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

export function makeFfa(B, mover) {
  const P = B.P
  const bs = { on: false, id: -1, t0: -99, seenT: -99, sx: 0, sy: 0, relocated: false, n: 0 }
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

  /** D5 in FFA (D11 + rules 3 and 8): who may get our first shot. Hostile mechs are candidates anyway (D0). */
  function firstShotOk(tr) {
    const t = B.me.t
    if (!B.ffaOpen) return false
    if (tr.finishable || tr.hp <= P.ffaFinishHpf * tr.maxHp) return true                          // rule 8: a finish
    if (t - tr.thirdExitT < P.ffaThirdHoldS) return false
    // D11: the survivor of a duel within 4 s, under half hp, nobody else within 120 m of it
    if (t - tr.duelWonT <= P.ffaThirdS && tr.hp < P.ffaWoundTgt * tr.maxHp && !othersNear(tr, P.ffaThirdR)) { tr.thirdT = t; return true }
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
        bs.on = true; bs.id = id; bs.t0 = t; bs.seenT = t; bs.sx = me.x; bs.sy = me.y; bs.n++
        B.counters.ffaBreaks = (B.counters.ffaBreaks || 0) + 1
      }
    }
    if (bs.on) {
      if (t - B.lastLosInT <= 0.2) { bs.seenT = t; bs.sx = me.x; bs.sy = me.y }                   // seen again: the clock restarts here
      bs.relocated = Math.hypot(me.x - bs.sx, me.y - bs.sy) >= P.ffaBreakM
      if (exempt || (t - bs.seenT >= P.ffaBreakS && bs.relocated) || t - bs.t0 > P.ffaBreakMaxS) bs.on = false
    }
    B.ffaBreak = bs.on; B.ffaRelocated = bs.relocated
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
    return on() && z.known && B.me.t >= P.ffaFinalT && z.nr <= 0.5
  }

  return { update, firstShotOk, breakUpdate, chargeTime, hideLeft, hideReach, laserReady, peekOpen, peekIn, prox, offAim, isHider, isRusher, reverser,
    lightLegs, beamHideLegs, boostVeto, raceOn, on, state: bs }
}
