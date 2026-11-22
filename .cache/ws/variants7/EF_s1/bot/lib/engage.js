// Fable wave 2, engineer A: engagement rules of variant 'd' (notes/fable/redesign/q1_engage.md) as presets
//   en_open     D1  opening gate (replaces the farm-first gate; no line breaking)
//   en_band     D2  gun-only band 120-150 m (hold 135) with a 0.5 s strafe reversal beyond 75 m
//               D3  laser band by target hp: over enLzBeams beams 130-170 (hold 150); at or under it with <= 2 shooters stop
//                   backing (floor 90 m); 55 m floor against a lightning carrier
//               D4  any shooter inside 70 m, energy >= 35, not finishing: boost straight away in 1 s pulses until >= 95 m
//               D6  after the opening gate a lined mech inside 280 m (laser) / 205 m (gun) is a candidate at any hp; no walk
//                   toward a mech under 70% hp; isolate cell off (the takeover skips it)
//   en_retarget D5  tDie = hp / max(2 s intake, 30); tDie < tKill(pick): the lined mech with the smallest tKill if < tDie;
//                   the focus 'kill' current-target bonus counted as 60 instead of 200
//   en_contra   C   hp < 35% with 3+ shooters: in to 25-32 m of the smallest-tKill lined mech without lightning, then its
//                   corpse spot
// Every rule acts only in the SQUAD posture behind hunt.firewall() (en_band 'both': D2's band and D4 in both postures).
// Hooks (all `if (B.en) ...`, B.en exists only with one of the presets on): brain.js HB4 pre, HB5 post, HB9 fightLegs;
// tactics.js HT1 band, HT2 cand, HT3 pickTarget, HT5 ofGate / openUp. No call to B.rng(): the strafe uses its own generator.
// Writes on B: B.en, B.ft (null outside the live posture), B.fkWalk / B.rPrefNow / B.legKind in its legs (as fightLegs does).

import { makeRng } from './aim.js'
import { ringSum } from './senses.js'
import { bandFor } from './tactics.js'

export function makeEngage(B, hunt, mover) {
  const P = B.P, C = B.counters
  const inc = (k) => { C[k] = (C[k] || 0) + 1 }
  const fwOk = () => B.env !== 'FFA' && hunt.firewall()
  const st = {
    openUsed: false, openDown: false, openUp: false, lastCube: -1, lastCubeT: 0,
    sh3: 0, sh4: 0, inDps: 0, tDie: Infinity,
    snext: -1, smag: -99, schg: -99, rng: null,
    awayOn: false, awayId: -1, awayUntil: -1, awayLast: -99,
    cOn: false, cTgt: null, cKillT: -99, cKillX: 0, cKillY: 0, lastKillT: -99,
  }
  const ft = { tKill: 99, tDie: Infinity, ourDps: 0, inDps: 0, shooters: 0, ok: true, finish: false }

  const openLive = () => P.enOpen === true && fwOk()
  const bandSq = () => P.enBand === true && fwOk()
  const bandAny = () => P.enBand === true && (P.enBandAll === true || fwOk())
  const contraLive = () => P.enContra === true && fwOk()
  const retLive = () => P.enRetarget === true && fwOk()
  const isMech = (tr) => !!tr && !tr.npc && tr.hp > 0
  /** Finishing (D4 exception): our target within one laser cycle of damage (enFinHp x dmgMult), or the legacy finish flags. */
  function finishing(tgt) {
    return isMech(tgt) && (tgt.hp <= P.enFinHp * B.me.dmgMult || B.finishing === true || B.killSecure === true)
  }

  // ------------------------------------------------------------------ HB4: assess stage, before selectTarget
  function pre() {
    const me = B.me, t = me.t, L = B.trackList
    let sh3 = 0, sh4 = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (!isMech(tr)) continue
      const hit = t - tr.lastDmgInT
      if (hit <= 3 || (tr.hostile && t - tr.losInT <= 0.5)) sh3++
      if (hit <= P.enOpenHitS) sh4++
    }
    st.sh3 = sh3; st.sh4 = sh4
    st.inDps = ringSum(me.dmgIn, t - P.enInS) / Math.max(0.1, P.enInS)
    st.tDie = me.hp / Math.max(st.inDps, P.enDieFloor)
    if (!st.rng && me.hasPos) st.rng = makeRng(((Math.round(me.x * 16) * 73856093) ^ (Math.round(me.y * 16) * 19349663) ^ 0x2c1b3c6d) >>> 0)
    // D1 opening gate (one-way: once down it stays down)
    if (st.lastCube < 0 || me.cubes > st.lastCube) { st.lastCubeT = t; st.lastCube = me.cubes }   // first decision: the clock starts
    else if (me.cubes < st.lastCube) st.lastCube = me.cubes
    st.openUp = false
    if (P.enOpen === true && !st.openDown) {
      const tEnd = P.enOpenT * (P.openFarmT > 0 ? P.openFarmT / 75 : 1)      // scaled with the match clock as openFarmT is
      let why = ''
      if (!openLive()) why = 'fw'
      else if (C.kills > 0) why = 'kill'
      else if (B.foreignDeaths > 0) why = 'foreign'
      else if (t >= tEnd) why = 'time'
      else if (me.laser && me.cubes >= P.enOpenCubes) why = 'laser'
      else if (sh4 >= P.enOpenShooters) why = 'shooters'
      else if (t - st.lastCubeT > P.enOpenDryS) why = 'dry'
      if (why) { if (st.openUsed) { st.openDown = true; inc('enOpenEnd_' + why) } }
      else { st.openUsed = true; st.openUp = true; inc('enOpenGate') }
    }
    // C: contrarian close-in (held with hysteresis)
    if (contraLive()) {
      const trig = me.hpf < P.ecHpf && sh3 >= P.ecShooters
      const keep = st.cOn && me.hpf < P.ecHpf + P.ecHys && sh3 >= 1
      if (trig && !st.cOn) inc('ecStart')
      st.cOn = trig || keep
      if (B.lastKillT > st.lastKillT && st.cOn) { st.cKillT = B.lastKillT; st.cKillX = B.lastKillX; st.cKillY = B.lastKillY; inc('ecKill') }
    } else st.cOn = false
    st.lastKillT = B.lastKillT
    if (!st.cOn) st.cTgt = null
  }

  // ------------------------------------------------------------------ HB5: after selectTarget / hunt.post
  function post() {
    if (!fwOk()) { B.ft = null; return }
    const tgt = B.target
    ft.tDie = st.tDie; ft.inDps = st.inDps; ft.shooters = st.sh3; ft.ok = true      // D5: never leave the fight (ok stays true)
    ft.tKill = isMech(tgt) ? hunt.ttk(tgt) : 99
    ft.ourDps = isMech(tgt) && ft.tKill < 99 ? tgt.hp / Math.max(0.05, ft.tKill) : 0
    ft.finish = isMech(tgt) && (ft.tKill <= 1.6 || tgt.hp <= P.enFinHp * B.me.dmgMult)
    B.ft = ft
  }

  // ------------------------------------------------------------------ HT5: the farm-first gate
  /** D1 replaces the farm-first gate from its first live decision on (its own gate is cand(); no line breaking). */
  function ofGate(gate) { return st.openUsed ? false : gate }
  function openUp() { return st.openUp }

  // ------------------------------------------------------------------ HT2: candidate gate (mechs)
  function opening(t) {
    return t < (P.fightEarly === true && B.foreignDeaths === 0 ? P.earlyOpenS : P.openingS)
  }
  function cand(tr, ok) {
    const me = B.me, t = me.t
    if (st.openUp) {
      // D1: only a mech that hit us from under enOpenR m within enOpenHitS s is answered
      const exc = t - tr.lastDmgInT <= P.enOpenHitS && (tr.dmgInD < P.enOpenR || P.enOpenFar === true)
      if (ok && !exc) { inc('enOpenBlock'); return false }
      return ok
    }
    if (!ok && bandSq() && !B.ofGate && !opening(t) && tr.listed && tr.losOut && tr.hp > 0 && tr.dist <= (me.laser ? P.enFireLaserR : P.enFireGunR)) {
      inc('enD6Cand'); return true                                                    // D6: any lined mech at any hp
    }
    return ok
  }

  // ------------------------------------------------------------------ HT3: target pick (after the 25% keep rule)
  function pickTarget(pick, cur, cand) {
    const t = B.me.t
    if (st.cOn && contraLive()) {
      // C: the lined mech without lightning with the smallest time to kill
      let best = null, bt = Infinity
      for (let k = 0; k < cand.length; k++) {
        const tr = cand[k]
        if (!isMech(tr) || !tr.losOut || tr.hasLightning) continue
        const T = hunt.ttk(tr)
        if (T < bt) { bt = T; best = tr }
      }
      st.cTgt = best
      if (best) { if (best !== pick) inc('ecPick'); return best }
      return pick
    }
    if (!retLive() || !isMech(pick)) return pick
    let p = pick
    if (P.focusKill === true && P.fkCur !== P.enCurBonus) {
      // focus 'kill' cost with the current-target bonus enCurBonus (tr.index = 1000 - cost with fkCur), mechs only
      let best = null, bs = -Infinity
      for (let k = 0; k < cand.length; k++) {
        const tr = cand[k]
        if (!isMech(tr)) continue
        const bonus = tr === cur || t - (tr.fkTgtT === undefined ? -99 : tr.fkTgtT) <= P.fkCurS
        const s = tr.index - (bonus ? P.fkCur - P.enCurBonus : 0)
        if (s > bs) { bs = s; best = tr }
      }
      // the legacy 25% keep rule stays in front
      if (cur && cur !== best && isMech(cur) && cand.includes(cur) && cur.hp < P.keepTargetHpf * cur.maxHp && t - cur.losOutT <= P.keepNoLosS && !(best && best.finishable && !cur.finishable)) best = cur
      if (best && best !== p) { inc('enRescore'); p = best }
    }
    // D5: we die before the kill -> the quickest lined kill that comes before our death
    if (st.tDie < hunt.ttk(p)) {
      let best = null, bt = Infinity
      for (let k = 0; k < cand.length; k++) {
        const tr = cand[k]
        if (!isMech(tr) || !tr.losOut) continue
        const T = hunt.ttk(tr)
        if (T < bt) { bt = T; best = tr }
      }
      if (best && best !== p && bt < st.tDie) { inc('enRetarget'); p = best }
    }
    return p
  }

  // ------------------------------------------------------------------ HT1: range band (before bandFor's gun-range clamp)
  function band(o) {
    if (!bandAny()) return
    const me = B.me
    if (o.kind === 'gun') { o.lo = P.enGunLo; o.hold = P.enGunHold; o.hi = P.enGunHi; o.boostAway = 0; return }
    if (o.kind !== 'laser') return
    o.boostAway = 0                                                                   // D4 owns the boost-away
    if (!bandSq()) return                                                             // D3: SQUAD posture only
    const tgt = B.target, lz = me.laser
    o.lo = P.enLzLo; o.hold = P.enLzHold; o.hi = P.enLzHi
    if (isMech(tgt) && lz && tgt.hp <= P.enLzBeams * lz.damage * me.dmgMult && st.sh3 <= P.enLzNearShooters) {
      o.lo = P.enLzFloor; o.hold = Math.max(P.enLzFloor, Math.min(P.enLzNearHold, tgt.dist)); o.hi = P.enLzHi        // stop backing
    }
    if (isMech(tgt) && tgt.hasLightning && o.lo < P.enLightFloor) { o.lo = P.enLightFloor; o.hold = Math.max(o.hold, o.lo) }
  }

  // ------------------------------------------------------------------ HB9: fight legs (after stance.fightLegs)
  /** D2 strafe: our own reversal clock beyond enStrafeMinR (mover.jink.sign), plus one at an enemy magazine start / beam. */
  function strafe(t) {
    const j = mover.jink
    const extra = (B.magStartT > st.smag && t - B.magStartT < 0.3) || (B.chargeAtMeT > st.schg && t - B.chargeAtMeT < 0.3)
    if (B.magStartT > st.smag) st.smag = B.magStartT
    if (B.chargeAtMeT > st.schg) st.schg = B.chargeAtMeT
    if (t >= st.snext || (extra && t - j.lastFlip >= 0.3)) {
      if (st.snext >= 0) { j.sign = -j.sign; j.lastFlip = t; inc('enFlip') }
      const r = st.rng ? st.rng() : 0.5
      st.snext = t + P.enStrafeS * (1 - P.enStrafeJit + 2 * P.enStrafeJit * r)
    }
  }
  function awayLegs(tgt) {
    const me = B.me, t = me.t
    if (st.awayOn && t - st.awayLast > 0.25) st.awayOn = false                     // the legs were elsewhere: a fresh trigger
    st.awayLast = t
    if (st.awayOn) {
      const sh = B.tracks.get(st.awayId)
      if (!isMech(sh) || !(sh.listed || t - sh.lastSeen < 1) || finishing(tgt)) st.awayOn = false
      else if (t >= st.awayUntil) {
        if (sh.dist < P.enAwayOut && me.energy >= P.enAwayPulseE) { st.awayUntil = t + P.enAwayPulseS; inc('enAwayPulse') } else st.awayOn = false
      }
    }
    if (!st.awayOn) {
      if (me.energy < P.enAwayEnergy || !me.grounded || finishing(tgt)) return false
      let sh = null
      const L = B.trackList
      for (let k = 0; k < L.length; k++) {
        const tr = L[k]
        if (!isMech(tr) || !tr.listed || tr.dist >= P.enAwayR) continue
        if (!(t - tr.losInT <= 0.5 && (tr.hostile || t - tr.lastDmgInT <= P.enOpenHitS))) continue
        if (!sh || tr.dist < sh.dist) sh = tr
      }
      if (!sh) return false
      st.awayOn = true; st.awayId = sh.id; st.awayUntil = t + P.enAwayPulseS
      inc('enAwayStart')
    }
    const sh = B.tracks.get(st.awayId)
    if (!mover.standoff(sh.x, sh.y, P.enAwayOut, false, false, P.enAwayOut, 1e9, 1)) {
      const ax = me.x - sh.x, ay = me.y - sh.y, l = Math.hypot(ax, ay) || 1
      mover.moveTo(me.x + ax / l * 25, me.y + ay / l * 25, 1, 1)
    }
    if (me.grounded && me.energy > 2) B.cmd.boost = true
    B.legKind = 'enaway'; B.rPrefNow = P.enAwayOut
    inc('enAway')
    return true
  }
  function contraLegs() {
    const me = B.me, t = me.t
    if (t - st.cKillT <= P.ecCorpseS) {
      const d = Math.hypot(st.cKillX - me.x, st.cKillY - me.y)
      if (d > P.ecCorpseR) {
        mover.moveTo(st.cKillX, st.cKillY, 1, P.ecCorpseR)
        if (d > 12 && me.grounded && me.energy > 2) B.cmd.boost = true
      } else { B.cmd.mx = 0; B.cmd.my = 0 }
      B.legKind = 'encorpse'; inc('ecCorpse')
      return true
    }
    const T = B.target                                                               // the pick of pickTarget (torso and legs agree)
    if (!isMech(T) || !T.losOut) return false
    if (T.dist > P.ecHi) {
      mover.moveTo(T.x, T.y, 1, P.ecR)
      if (me.grounded && me.energy > 2) B.cmd.boost = true
    } else if (!mover.standoff(T.x, T.y, P.ecR, true, true, P.ecLo, P.ecHi, 1)) { B.cmd.mx = 0; B.cmd.my = 0 }
    B.legKind = 'encontra'; B.rPrefNow = P.ecR
    inc('ecLegs')
    return true
  }
  function fightLegs() {
    const me = B.me, t = me.t, tgt = B.target
    if (!isMech(tgt)) return false
    if (st.cOn && contraLive() && contraLegs()) return true
    // the legacy branches keep these cases: beam hide, drop pull, power grab, lightning rush, no line to the target
    if (t - B.chargeAtMeT < 0.9 && B.hide.state === 'found') {
      // the legacy D4 beam hide (behind cover within 6 m, 9 m boosting) goes first; in FFA its own budget, so always defer
      const canBoost = me.energy >= P.boostReserve && me.grounded
      if (B.env === 'FFA' || B.hide.dist <= (canBoost ? P.laserHideBoost : P.laserHideWalk)) return false
    }
    if (bandAny() && !B.rush && awayLegs(tgt)) return true
    if (!bandSq()) return false
    if (P.dropLife === true && !!B.dl && B.dl.go === true) return false
    if (B.grab || B.rush || !tgt.losOut) return false
    const bd = bandFor(B)
    let hold = bd.hold, lo = bd.lo, hi = bd.hi
    // CH1 finish walk-in kept for the gun only (D3 replaces it with a laser), 55 m floor against a lightning carrier
    const fkW = P.focusKill === true && !me.laser && tgt.hp < P.fkWalkTgtHpf * tgt.maxHp && me.hpf > P.fkWalkHpf && B.nLos <= P.fkWalkLines
    if (fkW) {
      hold = P.fkWalkR; lo = Math.max(6, P.fkWalkR - P.fkWalkBand); hi = P.fkWalkR + P.fkWalkBand
      if (tgt.hasLightning && lo < P.enLightFloor) { lo = P.enLightFloor; hold = lo + P.fkWalkBand; hi = hold + P.fkWalkBand }
      B.fkWalk = true; inc('fkWalk')
    }
    const reloading = tgt.magN >= P.magSize && t - tgt.lastBulletT < P.magReloadS
    if (reloading && !me.laser && !fkW) hi = Math.min(hi, hold + 5)                  // their reload: close in (legacy)
    if (me.hpf < P.enWalkHpf && !fkW && hi < tgt.dist + 1) { hi = tgt.dist + 1; inc('enNoWalk') }   // D6: no walk in under 70%
    B.rPrefNow = hold
    const far = tgt.dist > P.enStrafeMinR
    if (far) strafe(t)
    B.legKind = 'enband'
    if (!mover.standoff(tgt.x, tgt.y, hold, !far, true, lo, hi, bd.backStick)) {
      if (tgt.dist > hi) mover.moveTo(tgt.x, tgt.y, 1, 5)
      else { const ax = me.x - tgt.x, ay = me.y - tgt.y, l = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / l * 20, me.y + ay / l * 20, 1, 1) }
    }
    inc(bd.kind === 'laser' ? 'enBandLaser' : 'enBandGun')
    return true
  }

  return { pre, post, ofGate, openUp, cand, pickTarget, band, fightLegs, st }
}
