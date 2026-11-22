// Owner request R2: late-game torso scanning (PARAMS.scanOn).
// With no target engaged in the late game (t >= scanLateT, alive <= scanLateAlive, next radius <= scanLateR)
// the torso sweeps 12 sectors of 30 deg: each sector remembers when it was last inside the view wedge, and the next
// look goes to the sector with the largest (seconds unseen x interest). Interest: open sight lines (approaches; a
// sector walled in within the 45 m all-round sense counts little), the last damage bearing, heard sounds, remembered
// mechs, the zone interior, the direction of travel and the old scan's own wishes (pre-aim corner, look hint).
// An open sector unseen for more than scanBlindMax - scanForceLead seconds is forced first, so no open rear stays
// blind for more than about 3 s. Engaged: a mech that hits our rear takes the torso for rearFaceS (unless the current
// target can be finished now). Work per decision: one sector's sight probe (<= 3 rays).

import { angDiff, wrapPi } from './aim.js'

const N = 12, SEC = Math.PI * 2 / N
const centre = (i) => -Math.PI + (i + 0.5) * SEC
const secOf = (a) => ((Math.floor((wrapPi(a) + Math.PI) / SEC) % N) + N) % N

export function makeScanner(B) {
  const P = B.P
  const covered = new Float64Array(N).fill(-99)
  const free = new Float32Array(N).fill(200)
  const openSince = new Float64Array(N).fill(-99)      // when a sector's sight line last opened beyond the 45 m sense
  const interest = new Float32Array(N)
  let focusForced = false, countedT = -1, sweepSince = -99, rr = 0, alive = 16, focus = -1, focusDoneT = -1, focusT = -99, focusYaw = 0, lastLookT = -99, rearBy = -1, rearT = -99
  const st = { forced: 0, sweeps: 0, maxBlind: 0 }

  function half() { return ((B.cfg.vision && B.cfg.vision.fov_deg) || 120) * Math.PI / 360 }

  function sense(obs) {
    const me = B.me, t = me.t
    if (Number.isInteger(obs.alive) && obs.alive > 0 && obs.alive <= 64) alive = obs.alive
    const ev = Array.isArray(obs.events) ? obs.events : []
    for (let k = 0; k < Math.min(ev.length, 64); k++) {
      const e = ev[k]
      if (e && e.type === 'damaged' && e.rear === true && Number.isInteger(e.by) && e.by >= 0 && e.by < 100) { rearBy = e.by; rearT = t }
    }
    if (!P.scanOn) return
    const h = half() - 15 * Math.PI / 180
    for (let i = 0; i < N; i++) if (Math.abs(angDiff(me.yaw, centre(i))) <= h) covered[i] = t
    // one sector per decision: how far can we see along it (approach or wall)
    if (B.world && me.hasPos) {
      const i = rr; rr = (rr + 1) % N
      const a = centre(i), ez = me.z + me.eyeH, w = B.world
      let f = 200
      for (const r of [50, 110, 190]) {
        const x = me.x + r * Math.cos(a), y = me.y + r * Math.sin(a)
        if (!w.canSee(me.x, me.y, ez, x, y, w.ground(x, y) + 5)) { f = r === 50 ? 30 : r - 30; break }
      }
      const near = (B.cfg.vision && B.cfg.vision.near_range) || 45
      if (f > near + 5 && free[i] <= near + 5) openSince[i] = t
      free[i] = f
    }
  }

  function late() {
    const t = B.me.t, z = B.zone
    return t >= P.scanLateT || alive <= P.scanLateAlive || (z.known && z.nr <= P.scanLateR)
  }
  function active() { return P.scanOn && late() }

  /** Yaw for the torso (no target engaged), or NaN to keep the old scan. `wish`: the old scan's yaw or NaN. */
  function look(wish) {
    if (!active()) return NaN
    const me = B.me, t = me.t, near = (B.cfg.vision && B.cfg.vision.near_range) || 45
    for (let i = 0; i < N; i++) interest[i] = free[i] > near + 5 ? 1 : 0.15
    for (let i = 0; i < N; i++) interest[i] += Math.min(2, B.heard[i] / 2)
    if (t - me.lastHurtT < 10) interest[secOf(me.lastHurtBearing)] += 2 * (1 - (t - me.lastHurtT) / 10)
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.listed || tr.conf < 0.05) continue
      interest[secOf(tr.bearing)] += 1.5 * tr.conf
    }
    const z = B.zone
    if (z.known && Math.hypot(me.x - z.nx, me.y - z.ny) > 0.3 * z.nr + 10) interest[secOf(Math.atan2(z.ny - me.y, z.nx - me.x))] += 0.6
    if (me.speed > 3) interest[secOf(Math.atan2(me.vy, me.vx))] += 0.5
    if (wish === wish) interest[secOf(wish)] += 1
    // blind time of the open sectors (an approach that just opened counts from its opening)
    let blind = 0
    for (let i = 0; i < N; i++) if (free[i] > near + 5) blind = Math.max(blind, t - Math.max(covered[i], openSince[i]))
    if (t - lastLookT > 0.35) sweepSince = t                      // the torso was busy (target, crate): a new sweep starts
    if (t - sweepSince > P.scanBlindMax + 1) st.maxBlind = Math.max(st.maxBlind, blind > 50 ? 0 : blind)   // only in a sweep of > 4 s
    // keep the current look until its sector is in the wedge (plus a short dwell)
    const h = half() - 15 * Math.PI / 180
    if (focus >= 0 && t - lastLookT > 0.35) focus = -1          // the torso was busy elsewhere: start afresh
    lastLookT = t
    if (focus >= 0) {
      const inWedge = Math.abs(angDiff(me.yaw, centre(focus))) <= h
      if (inWedge && focusDoneT < 0) focusDoneT = t
      const done = (focusDoneT >= 0 && t - focusDoneT >= P.scanDwell) || t - focusT > 1.5
      const preempt = !focusForced && blind > P.scanBlindMax - P.scanForceLead + 0.3      // an open approach is going blind
      if (!done && !preempt) return focusYaw
      focus = -1
    }
    // next look: forced stalest open sector, else the largest unseen x interest; an old-scan wish wins when all is fresh
    let bi = -1, bs = -1
    const force = P.scanBlindMax - P.scanForceLead
    for (let i = 0; i < N; i++) {
      const age = t - covered[i]
      let s = Math.min(age, 30) * interest[i]
      if (free[i] > near + 5 && t - Math.max(covered[i], openSince[i]) > force) s += 1000
      if (s > bs) { bs = s; bi = i }
    }
    if (bs < 1000 && wish === wish && blind < force - 0.6) { focus = -1; return wish }
    if (bs >= 1000) st.forced++
    st.sweeps++
    focus = bi; focusDoneT = -1; focusT = t; focusForced = bs >= 1000
    // look a little toward the staler neighbour so one look covers more of the stale side
    const l = (bi + N - 1) % N, r = (bi + 1) % N
    const lean = (t - covered[l]) * interest[l] > (t - covered[r]) * interest[r] ? -0.25 : 0.25
    focusYaw = wrapPi(centre(bi) + lean * SEC)
    return focusYaw
  }

  /** selectTarget hook: a mech that hit our rear in the last rearFaceS seconds takes the torso. */
  function rearPick(pick) {
    if (!P.scanOn) return pick
    const t = B.me.t
    if (rearBy < 0 || t - rearT > P.rearFaceS) return pick
    const att = B.tracks.get(rearBy)
    if (!att || att.npc || att === pick) return pick
    if (pick && !pick.npc && pick.finishable && pick.losOut) return pick
    if (countedT !== rearT) { countedT = rearT; B.counters.rearFaces = (B.counters.rearFaces || 0) + 1 }   // rear hits that took the torso
    return att
  }
  function reset() { focus = -1 }

  return { sense, look, active, rearPick, reset, stats: st, covered }
}
