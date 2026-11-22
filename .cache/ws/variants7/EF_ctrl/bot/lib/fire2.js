// Fable wave 2, engineer A: fire-control rules of variant 'e' (notes/fable/redesign/q2_fire.md) as presets
//   fi_gate   e1  gun yaw / pitch gate = max(old gate, fiGateK x (radius | visible half-height + gateBody) / R)
//   fi_save   e2  no laser release at a mech the gun finishes (hp <= 90 x dmgMult, >= 3 rounds, clear line, <= 150 m, our
//                 hp >= 25%): the charge is held for the next target; the forced release stays
//   fi_reload e3  no line in or out for 0.4 s and ammo <= 8 (<= 10 with no listed mech within 150 m): reload
//   fi_snap   e5  pre-charge on a listed target without a line that closes at >= 8 m/s and whose position at +0.5 / 1.0 /
//                 1.5 s is in a clear muzzle line; forced release 1.8 s; off for the match when blind / snap > 0.45
//   fi_rung   e6  laser at 0.5 of the height when clear, else the highest clear rung; full gun lead on jinkers (SQUAD only)
// 'on' = SQUAD posture + hunt.firewall(); 'both' = both postures (e6's lead part stays SQUAD + firewall); fi_rung 'rung' = the
// laser rung alone (the half lead on jinkers kept).
// Hooks (firecontrol.js, all `if (B.f2) ...`; B.f2 exists only with one of the presets on): HF2 reloadNow, HF5 yawGate /
// pitGate / gunNote, HF6 save, HF7 forceS, HF8 snap, HF9 rungs, HF10 fullLead, HF11 onRelease; brain.js HB4 pre.

import { laserFrac } from './aim.js'

export function makeFire2(B, hunt) {
  const P = B.P, C = B.counters
  const inc = (k, n = 1) => { C[k] = (C[k] || 0) + n }
  const fwOk = () => B.env !== 'FFA' && hunt.firewall()
  const on = (flag, all) => flag === true && (all === true || fwOk())
  const st = {
    lineT: -99, line: false, snap: false, snapOff: false, snapRel: 0, snapBlind: 0, lineOpenT: -99,
    frac: 0.5, charge: 0, rel: null, oldYaw: 0, oldPit: 0, wasReload: false,
  }
  let rungSrc = null, rungs = null
  function rungList(base) {
    if (rungSrc !== base) {
      rungSrc = base
      rungs = [P.fiRungMid].concat(base.filter((f) => Math.abs(f - P.fiRungMid) > 1e-9).sort((a, b) => b - a))
    }
    return rungs
  }

  // ------------------------------------------------------------------ HB4: per decision bookkeeping (counters only)
  function pre() {
    const me = B.me, t = me.t, L = B.trackList, g = me.gun
    let line = false
    for (let k = 0; k < L.length && !line; k++) {
      const tr = L[k]
      if (tr.npc || !(tr.hp > 0)) continue
      if (tr.losIn || (tr.listed && tr.losOut)) line = true
    }
    if (line) {
      if (!st.line) {
        st.lineOpenT = t
        if (P.fiReload === true && g) { inc('ammoAtLineOpen_' + (g.reload > 0 ? 'R' : g.ammo)); if (g.reload > 0) inc('reloadCaughtByLine') }
      }
      st.lineT = t
    }
    st.line = line
    // release outcome: a laser hit event within 0.35 s, else blind
    const r = st.rel
    if (r) {
      const hit = C.laserHits > r.hits0
      if (hit || t - r.t > 0.35) {
        if (P.fiRung === true) { inc('fiRungShots_' + r.frac); if (hit) inc('fiRungHits_' + r.frac) }
        if (r.snap) { st.snapRel++; if (!hit) { st.snapBlind++; inc('blindReleases') } }
        st.rel = null
        if (r.snap && st.snapRel >= P.fiSnapMinN && st.snapBlind > P.fiSnapBlind * st.snapRel && !st.snapOff) { st.snapOff = true; inc('fiSnapAbort') }
      }
    }
  }

  // ------------------------------------------------------------------ HF5: gun gates (e1)
  function yawGate(g0, o, R) {
    st.oldYaw = g0
    if (!on(P.fiGate, P.fiGateAll) || !o || o.npc === undefined) return g0
    return Math.max(g0, P.gateMin, P.fiGateK * (o.radius + P.gateBody) / R)
  }
  function pitGate(g0, o, R, hFrac) {
    st.oldPit = g0
    if (!on(P.fiGate, P.fiGateAll) || !o || o.npc === undefined) return g0
    return Math.max(g0, P.gateMin, P.fiGateK * (o.height * hFrac + P.gateBody) / R)
  }
  function gunNote(fire, ey, ep) {
    if (P.fiGate !== true) return
    if (!fire) inc('gateBlocked')
    else if (ey > st.oldYaw || ep > st.oldPit) inc('fiGateExtra')
  }

  // ------------------------------------------------------------------ HF6: hold the beam for a gun kill (e2)
  /** Called on every charging decision; true = turn this (unforced) release into a held charge. */
  function save(tgt, lz, frac, release, forced) {
    st.frac = frac; st.charge = lz.charge
    if (!release || forced || !on(P.fiSave, P.fiSaveAll)) return false
    const me = B.me, g = me.gun
    if (!tgt || tgt.npc || !g || g.reload > 0 || g.ammo < P.fiSaveAmmo || !tgt.losOut || B.gunLos !== true) return false
    if (tgt.hp > P.fiSaveHp * me.dmgMult || tgt.dist > P.fiSaveR || me.hpf < P.fiSaveHpf) return false
    inc('beamHeldForGun')
    return true
  }
  // ------------------------------------------------------------------ HF11: a beam leaves
  function onRelease(tgt, lz) {
    const me = B.me, t = me.t
    if (tgt && !tgt.npc && P.fiSave === true) {
      const dmg = laserFrac(st.charge, lz.full, lz.minFrac) * lz.damage * me.dmgMult * (tgt.rearOn ? me.rearMult : 1) * (tgt.hasMortar ? 1 + lz.cookoff : 1)
      if (dmg > tgt.hp) inc('overkillDmg', Math.round(dmg - tgt.hp))
    }
    if (st.snap) { inc('fiSnapRel'); if (t - st.lineOpenT <= 0.3) inc('snapBeams') }
    st.rel = { t, frac: Math.round(st.frac * 100) / 100, snap: st.snap, hits0: C.laserHits }
    st.snap = false
  }

  // ------------------------------------------------------------------ HF7 / HF8: snap pre-charge (e5)
  const snapLive = () => on(P.fiSnap, P.fiSnapAll) && !st.snapOff
  function forceS() { return snapLive() ? P.fiForceS : P.laserForceS }
  function snap(tgt) {
    if (!snapLive() || !tgt || tgt.npc || !tgt.listed || tgt.losOut || !(tgt.hp > 0)) return false
    const me = B.me, w = B.world
    const dx = me.x - tgt.x, dy = me.y - tgt.y, d = Math.hypot(dx, dy)
    if (d < 1) return false
    const close = (dx * (tgt.vx - me.vx) + dy * (tgt.vy - me.vy)) / d
    if (close < P.fiSnapV) return false
    let ok = !w
    const Ts = Array.isArray(P.fiSnapT) ? P.fiSnapT : [0.5, 1.0, 1.5]
    const mz = me.z + me.muzzleH
    for (let k = 0; k < Ts.length && !ok; k++) {
      const T = Ts[k], x = tgt.x + tgt.vx * T, y = tgt.y + tgt.vy * T
      const z = (w.ground(x, y) > tgt.z + 1 ? w.ground(x, y) : tgt.z) + tgt.height * 0.5
      if (w.shotClear(me.x, me.y, mz, x, y, z)) ok = true
    }
    if (!ok) return false
    if (!st.snap) inc('fiSnapStart')
    st.snap = true
    return true
  }

  // ------------------------------------------------------------------ HF9 / HF10: laser rung, gun lead (e6)
  function laserRungs(base) { return on(P.fiRung, P.fiRungAll) ? rungList(base) : base }
  function fullLead() {
    if (P.fiRung !== true || P.fiRungLead !== true || !fwOk()) return false
    inc('fiFullLead')
    return true
  }

  // ------------------------------------------------------------------ HF2: reload in a lull (e3)
  function reloadNow(g, lowInSights) {
    if (!on(P.fiReload, P.fiReloadAll) || lowInSights) return false
    const me = B.me, t = me.t
    if (t - st.lineT < P.fiLullS) return false
    let near = false
    const L = B.trackList
    for (let k = 0; k < L.length && !near; k++) { const tr = L[k]; if (!tr.npc && tr.listed && tr.hp > 0 && tr.dist <= P.fiReloadR) near = true }
    if (g.ammo > (near ? P.fiReloadAmmo : P.fiReloadFar)) return false
    inc('earlyReloads')
    return true
  }

  return { pre, yawGate, pitGate, gunNote, save, onRelease, forceS, snap, laserRungs, fullLead, reloadNow, st }
}
