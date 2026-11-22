// Fable switch panel, preset `util` (notes/fable/switch/switching.md): reward-per-second utilities for the target pick
// (utilTgt) and a regen-aware hold of the first shot on non-hostile mechs (utilWait). Created by brain.js only when
// P.utilTgt || P.utilWait (else B.util stays undefined and every call site short-circuits). Acts only in the SQUAD posture
// behind hunt.firewall(): outside it pre() leaves `on` false and gateOpen / pickTarget return what the caller had.
import { angDiff, clamp } from './aim.js'

export function makeUtil(B, hunt, mover) {
  const P = B.P
  let on = false, waitOk = false, waiting = false, waitT0 = -99, rearmT = -99, heldNow = false, heldPrev = false
  let k = 0, lam = 0, IN = 0, Td = 0, regenIn = 0, UW = 0, lastT = -1, n2 = 0, own = false, withheld = null
  const C = B.counters

  function pre() {
    const me = B.me, t = me.t
    heldPrev = heldNow; heldNow = false; withheld = null; own = false
    B.uWait = false
    on = (P.utilTgt === true || P.utilWait === true) && B.env !== 'FFA' && hunt.firewall()
    if (!on) { waiting = false; n2 = 0; lastT = t; return }
    if (waiting && !heldPrev) waiting = false                          // nothing was withheld last decision: the wait is over
    const dt = lastT >= 0 ? Math.max(0, t - lastT) : 0.1
    lastT = t
    k = Math.max(0, ((B.cfg.match && B.cfg.match.mechs) || 16) - (B.aliveN > 0 ? B.aliveN : 16))
    const Pm = B.nLos >= 2 ? 1 : 1 - 0.66 * Math.pow(0.72, k)
    lam = me.hpf < 0.40 ? P.uLamLow : Pm * P.uLamMid
    IN = Math.max(B.A || 0, IN * (1 - dt / 3))
    Td = me.hp / Math.max(IN, 20)
    let out = Number.isFinite(me.lastDealtT) ? me.lastDealtT : -99, hostileNear = false
    for (let i = 0; i < B.trackList.length; i++) {
      const tr = B.trackList[i]
      if (tr.lastDmgOutT > out) out = tr.lastDmgOutT
      if (!tr.npc && tr.listed && tr.hostile && tr.hp > 0) hostileNear = true
    }
    const delay = me.regenDelay > 0 ? me.regenDelay : 5, rate = me.regenPerS > 0 ? me.regenPerS : P.uRegenPerS
    regenIn = Math.max(0, delay - (t - Math.max(me.lastHurtT, out)))
    const hpTop = P.uWaitTop * me.maxHp
    const Wt = regenIn + (hpTop - me.hp) / rate
    UW = me.hp >= hpTop ? -0.003 : lam * rate * (Wt - regenIn) / Wt
    const gunOnly = !me.laser                                          // switching.md: a laser holder waits only with the 1.25 margin
    waitOk = P.utilWait === true && k >= P.uWaitK && me.hpf < P.uWaitTop && B.nLos === 0 && t - me.lastHurtT > 1 && !hostileNear && !B.zoneUrgent &&
      t >= rearmT && (!waiting || t - waitT0 < P.uWaitMaxS)
    if (P.utilWait === true && k >= P.uWaitK) {                         // reach counters (report only)
      C.uK = (C.uK || 0) + 1
      if (gunOnly) C.uKGun = (C.uKGun || 0) + 1
      if (gunOnly && me.hpf < P.uWaitTop) C.uKHp = (C.uKHp || 0) + 1
      if (gunOnly && me.hpf < P.uWaitTop && B.nLos === 0 && t - me.lastHurtT > 1 && !hostileNear) C.uKQuiet = (C.uKQuiet || 0) + 1
      if (waitOk) C.uOk = (C.uOk || 0) + 1
    }
    if (waiting && !waitOk) {
      if (t - waitT0 >= P.uWaitMaxS || t - me.lastHurtT <= 1) { rearmT = t + P.uWaitRearmS; C.uRearm = (C.uRearm || 0) + 1 }
      waiting = false
    }
  }

  /** Points per second of fighting tr. open = nothing is hitting us (first shot on a calm mech): pK 1. */
  function uFight(tr, open) {
    const me = B.me
    let T = hunt.ttk(tr)
    if (!(T < 99)) T = Number.isFinite(tr.tau) ? tr.tau : 99
    if (tr !== B.target) T += Math.abs(angDiff(tr.bearing, me.yaw)) / Math.max(0.1, me.turnRate)
    if (!tr.losOut) T += P.uRegainS
    T = Math.max(0.2, T)
    const pK = open ? 1 : clamp((Td / T - 0.6) / 0.8, 0, 1)
    const t = me.t
    const gunSilent = tr.magN >= P.magSize && t - tr.lastBulletT < P.magReloadS - P.uSilentPadS
    const beamQuiet = !tr.hasLaser || (t - tr.lastBeamT > P.uSilentBeamS && !tr.charging)
    const aNow = gunSilent && beamQuiet && !tr.hasLightning ? 0 : (tr.a || 0)
    const relief = lam * aNow * Math.min(P.uReliefS, Td)
    return pK * (P.uKill + relief) / T          // the rear bonus of an opening is already inside T (hunt.ttk / tr.tau count rearMult)
  }

  /** selectTarget: may a mech that is a candidate only through a non-hostile clause be opened on? false = withheld. */
  function gateOpen(tr) {
    if (!on || !waitOk) return true
    if (tr.finishable || (tr.losIn && tr.dist <= P.uWaitNearR)) return true
    const u = uFight(tr, true)
    C.uGate = (C.uGate || 0) + 1
    const enter = UW > u * (B.me.laser ? P.uMargin : 1)
    if (!B.me.laser) C.uGateGun = (C.uGateGun || 0) + 1
    const stay = waiting && (B.me.t - waitT0 < 2 || UW * P.uMargin > u)
    if (enter || stay) {
      if (!waiting) { waiting = true; waitT0 = B.me.t; C.uWaits = (C.uWaits || 0) + 1 }
      heldNow = true; B.uWait = true
      if (!withheld || tr.dist < withheld.dist) withheld = tr
      C.uHold = (C.uHold || 0) + 1
      return false
    }
    return true
  }

  /** selectTarget, after the keep-target rule: with 2+ lines on us the mech with the best kill-before-death utility. */
  function pickTarget(pick, cur, cand) {
    own = false
    if (!on || P.utilTgt !== true || !pick || pick.npc || B.nLos < 2) { n2 = 0; return pick }
    const t = B.me.t
    let best = null, bu = 0, cu = -1, n = 0
    for (let i = 0; i < cand.length && n < 6; i++) {
      const tr = cand[i]
      if (tr.npc || !(tr.losOut || t - tr.losInT <= 1 || t - tr.losOutT <= 1)) continue
      n++
      const u = uFight(tr, false)
      if (tr === cur) cu = u
      if (u > bu) { bu = u; best = tr }
    }
    own = true
    if (!best) { n2 = 0; C.uTgtNone = (C.uTgtNone || 0) + 1; own = false; return pick }      // every U_F is 0: the base pick
    if (cu >= 0 && cur) {
      if (best !== cur && bu > P.uTgtHys * cu) n2++; else n2 = 0
      if (best !== cur && ((n2 >= 2 && t - B.targetSince >= P.uTgtDwellS) || cu === 0)) { C.uTgtSwitch = (C.uTgtSwitch || 0) + 1; n2 = 0; return best }
      if (pick !== cur) C.uTgtKeep = (C.uTgtKeep || 0) + 1
      return cur
    }
    if (best !== pick) C.uTgtPick = (C.uTgtPick || 0) + 1
    return best
  }

  /** holdLegs while waiting: the hide cell when it is within 2.5 s, else stand; torso toward the nearest withheld mech. */
  function waitLegs() {
    if (!B.uWait) return false
    const me = B.me, h = B.hide
    if (withheld) { B.lookHint = true; B.lookX = withheld.x; B.lookY = withheld.y }
    if (h.state === 'found' && h.dist * P.pathFactor / me.walk <= 2.5) { if (h.dist > 1.5) mover.moveTo(h.x, h.y, 1, 0.9); else { B.cmd.mx = 0; B.cmd.my = 0 } }
    else { B.cmd.mx = 0; B.cmd.my = 0 }
    B.legKind = 'uwait'
    C.uWaitLegs = (C.uWaitLegs || 0) + 1
    return true
  }

  return { pre, uFight, gateOpen, pickTarget, waitLegs, owns: () => own, waiting: () => waiting, state: () => ({ on, waitOk, waiting, k, lam, IN, Td, regenIn, UW }) }
}
