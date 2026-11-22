// Wave-2 engineer C: movement, dodging, cover, zone (notes/fable/redesign/q3_move.md, variant 'f').
//
// Five rules, each behind its own preset (old value 'off' first, so the default build is byte-identical):
//   mv_flip  F1 strafe reversal on the bullet-flight clock beyond mvFlipMinR (plus a flip on each new enemy bullet while our
//            laser charges)
//   mv_close F2 inside mvCloseIn of a gun shooter: no strafe, no bullet dodge, full back stick (boost) until mvCloseOut;
//            gun-only band mvGunLo-mvGunHi (hold mvGunHold)
//   mv_zig   F3 goal walks under fire (grab / isolate / regain in FIGHT, the ZONE walk) as a +-mvZigDeg zigzag on the F1 clock
//   mv_arc   F4 a line holder more than mvArcIn deg off the target bearing (or a rear hit): back along -(uT + uA) with the
//            strafe kept until under mvArcOut; the isolate cell only when near, keeping the target line and cutting a line
//   mv_rim   F5 zone phase dps <= mvRimDps: ZONE urgency only outside or at tOut - mvRimPathK x path time < mvRimUrgS; zone
//            goal, idle band and fight anchor on the rim (mvRimLo-mvRimHi of the next radius, goal at mvRimFrac)
// and one measurement-only preset (mv_meas: counters, no action changes).
//
// Contract: every rule acts only in the SQUAD posture behind hunt.firewall() (tested at each hook call, P read live); every
// hook returns its neutral value otherwise. New randomness comes from rng2 (its own seed): B.rng() is never called here.
// B.mv2 exists only when one of the mv_ presets is on (brain.js), so the default build never reaches this file.

import { angDiff, clamp, makeRng } from './aim.js'
import { MODE } from './params.js'

/** true when any mv_ preset asks for the module (brain.js creates B.mv2 only then). */
export function mvWanted(P) {
  return P.mvMeas === true || P.mvFlip === true || P.mvClose === true || P.mvZig === true || P.mvArc === true || P.mvRim === true
}

const ROT = [0, 0.45, -0.45, 0.9, -0.9, 1.3, -1.3]            // back-off headings tried in turn (rad off straight away)

export function makeMove2(B, mover, hunt, seed) {
  const P = B.P, C = B.counters
  const rng2 = makeRng(((seed >>> 0) ^ 0x3c6ef372) >>> 0)
  const vB = (B.cfg.weapons && B.cfg.weapons.gun && B.cfg.weapons.gun.speed) || 252
  const gunR = (B.cfg.weapons && B.cfg.weapons.gun && B.cfg.weapons.gun.range) || 230
  const st = { tick: -1, R: Infinity, sh: null, jit: 1, newBulT: -99, bulFlipT: -99, closeOn: false, closeTick: -1,
    arcOn: false, rimUrg: false, rearT: -99, rearB: 0, isoBoost: false, isoTick: -1, lastLeg: '' }
  const zz = { sign: 1, until: -1 }
  const seen = new Map()
  const bandO = { hold: 0, lo: 0, hi: 0 }
  const arcV = { x: 0, y: 0 }
  const inc = (k, v = 1) => { C[k] = (C[k] || 0) + v }

  function live() { return B.env !== 'FFA' && hunt.firewall() }

  /** Nearest hostile gun holder with a line on us within gun range (once per decision). */
  function scan() {
    if (st.tick === B.tick) return
    st.tick = B.tick
    const L = B.trackList
    let R = Infinity, sh = null
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !tr.hasGun || !tr.losIn || !tr.hostile || !(tr.conf > 0.3) || tr.hp <= 0 || tr.dist > gunR) continue
      if (tr.dist < R) { R = tr.dist; sh = tr }
    }
    st.R = R; st.sh = sh
  }

  // ------------------------------------------------------------------ measurement (every preset, actions untouched)
  const bin = (d) => (d < 80 ? '0' : d < 110 ? '80' : d < 140 ? '110' : '140')
  const lineBin = (d) => (d < 70 ? '70' : d < 95 ? '95' : d < 130 ? '130' : 'Far')
  function shooterOf(b) {
    const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, ux = b.vx / sp, uy = b.vy / sp, L = B.trackList
    let best = null, bestE = 6
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr.npc || !tr.listed || !tr.hasGun) continue
      const dx = b.x - tr.x, dy = b.y - tr.y, along = dx * ux + dy * uy
      if (along < -3 || along > gunR + 30) continue                 // bullets may come into view far from the muzzle
      const e = Math.abs(dx * uy - dy * ux)
      if (e < bestE) { bestE = e; best = tr }
    }
    return best
  }
  /** Assess stage, after target selection: new enemy bullets, rear hits, intake by the last leg kind, line seconds by range. */
  function pre(obs) {
    scan()
    const me = B.me, t = me.t
    for (const [id, s] of seen) if (s < t - 0.5) seen.delete(id)
    for (const b of B.bullets.values()) {
      if (b.npc) continue
      if (seen.has(b.id)) { seen.set(b.id, t); continue }
      seen.set(b.id, t)
      const rx = b.x - me.x, ry = b.y - me.y, bv2 = b.vx * b.vx + b.vy * b.vy
      if (bv2 < 1) continue
      const ta = -(rx * b.vx + ry * b.vy) / bv2
      if (ta <= 0 || ta > 1.2) continue                        // passed us or far out
      st.newBulT = t
      const tr = shooterOf(b)
      if (tr && tr.aimAtMe) inc('mvGunSeen' + bin(tr.dist))
    }
    const ev = obs && Array.isArray(obs.events) ? obs.events : null
    if (ev) for (let k = 0; k < ev.length && k < 64; k++) {
      const e = ev[k]
      if (!e || e.type !== 'damaged') continue
      const amt = typeof e.amount === 'number' && e.amount > 0 && e.amount < 1e5 ? e.amount : 0
      inc('mvIn_' + (st.lastLeg || 'none'), amt)
      if (e.rear === true) { inc('mvRearDmg', amt); st.rearT = t; if (typeof e.bearing === 'number' && e.bearing === e.bearing) st.rearB = e.bearing }
      if (e.weapon === 'gun' && Number.isInteger(e.by)) { const tr = B.tracks.get(e.by); if (tr && !tr.npc && tr.listed) inc('mvGunHit' + bin(tr.dist)) }   // listed, as the seen count
    }
    if (st.R < Infinity) inc('mvLine' + lineBin(st.R))
    if (B.mode === MODE.ZONE && t < 110) inc('mvZoneEarly')
    st.lastLeg = B.legKind
  }

  // ------------------------------------------------------------------ F1 mv_flip (mover.flip / mover.standoff hooks)
  const dtFor = (R) => clamp(P.mvFlipK * R / vB, P.mvFlipLo, P.mvFlipHi)
  function flipOn() {
    if (P.mvFlip !== true || B.mode !== MODE.FIGHT || !live()) return false
    scan()
    return st.R >= P.mvFlipMinR && st.R < Infinity
  }
  /** mover.flip: the next strafe interval under F1 (drawn from rng2), or -1 for the legacy U(strafeLo, strafeHi) draw. */
  function flipDt() {
    if (!flipOn()) return -1
    st.jit = 1 + P.mvFlipJit * (2 * rng2() - 1)
    st.bulFlipT = st.newBulT
    inc('mvFlip')
    return dtFor(st.R) * st.jit
  }
  /** mover.standoff: reverse now (F1 clock after a range change, or a new enemy bullet while our laser charges). */
  function flipNow(t, jink) {
    if (!flipOn()) return false
    const since = t - jink.lastFlip
    if (since >= dtFor(st.R) * st.jit) return true
    const lz = B.me.laser
    if (lz && lz.charge > 0 && st.newBulT > st.bulFlipT && since >= P.mvFlipBulFloor) { inc('mvFlipBul'); return true }
    return false
  }

  // ------------------------------------------------------------------ F2 mv_close (fightLegs / legs hooks)
  /** fightLegs band hook: the gun-only band (target a mech), or null for the legacy band. */
  function band(bd, tgt) {
    if (P.mvClose !== true || bd.kind !== 'gun' || !tgt || tgt.npc || !live()) return null
    bandO.hold = P.mvGunHold; bandO.lo = P.mvGunLo; bandO.hi = P.mvGunHi
    return bandO
  }
  function closeOk(tgt) {
    const me = B.me, g = B.grab
    if (B.finishing || B.killSecure || B.fkWalk || B.rush || me.lightning) return false
    if (tgt && !tgt.npc && tgt.finishable) return false
    if (g && Math.hypot(g.x - me.x, g.y - me.y) <= P.mvCloseGrabR) return false
    if (g && g.type === 'pickup' && g.obj && g.obj.kind === 'laser' && !me.laser) return false     // a laser we lack still wins
    return true
  }
  /** fightLegs, before the grab legs: back straight away from a gun shooter inside mvCloseIn until mvCloseOut. */
  function closeLegs(tgt) {
    if (P.mvClose !== true) return false
    if (B.mode !== MODE.FIGHT || !live()) { st.closeOn = false; return false }
    scan()
    const sh = st.sh
    if (!sh || !closeOk(tgt)) { st.closeOn = false; return false }
    if (st.closeOn && B.tick - st.closeTick > 3) st.closeOn = false                       // the legs were elsewhere: re-enter at mvCloseIn
    if (!st.closeOn) { if (st.R < P.mvCloseIn) st.closeOn = true } else if (st.R > P.mvCloseOut) st.closeOn = false
    if (!st.closeOn) return false
    const me = B.me, cmd = B.cmd
    const ax0 = me.x - sh.x, ay0 = me.y - sh.y, l = Math.hypot(ax0, ay0) || 1, ax = ax0 / l, ay = ay0 / l
    for (let k = 0; k < ROT.length; k++) {
      const c = Math.cos(ROT[k]), s = Math.sin(ROT[k]), vx = ax * c - ay * s, vy = ax * s + ay * c
      if (!mover.walkable(vx, vy, P.dodgeProbe)) continue
      cmd.mx = vx; cmd.my = vy
      if (me.grounded && me.energy > P.mvCloseBoostE) cmd.boost = true
      B.legKind = 'backoff'; st.closeTick = B.tick
      inc('backOff70')
      return true
    }
    return false
  }
  /** legs: the bullet dodge is skipped on a decision whose legs F2 backed off (no pattern dodges at that range). */
  function noDodge() { return st.closeTick === B.tick }

  // ------------------------------------------------------------------ F3 mv_zig (legs hook, after the mode switch)
  function zoneRoom() {
    const me = B.me
    if (!me.inZone) return false
    const tO = B.zoneTOut
    if (!(tO < Infinity)) return true
    const pathT = Math.max(0, tO - B.zoneMargin)
    return tO - 1.45 * pathT > P.mvZigZonePad
  }
  function zig() {
    if (P.mvZig !== true || !live()) return
    const k = B.legKind, mode = B.mode
    const fightWalk = mode === MODE.FIGHT && (k === 'grab' || k === 'isolate' || k === 'regain')
    if (!fightWalk && !(mode === MODE.ZONE && k === 'zone' && zoneRoom())) return
    scan()
    if (!(st.R >= P.mvZigMinR && st.R < Infinity)) return
    const me = B.me, cmd = B.cmd, t = me.t
    if (!B.hasGoal || !me.grounded || Math.hypot(B.goalX - me.x, B.goalY - me.y) < P.mvZigLeg) return
    const m = Math.hypot(cmd.mx, cmd.my)
    if (m < 0.5) return
    if (t >= zz.until) { zz.sign = -zz.sign; zz.until = t + dtFor(st.R) * (1 + P.mvFlipJit * (2 * rng2() - 1)) }
    const a = P.mvZigDeg * Math.PI / 180, ux = cmd.mx / m, uy = cmd.my / m, ca = Math.cos(a), sa = Math.sin(a)
    for (let j = 0; j < 2; j++) {
      const sg = j ? -zz.sign : zz.sign, s = sa * sg
      const vx = ux * ca - uy * s, vy = ux * s + uy * ca
      if (!mover.walkable(vx, vy, P.mvZigProbe)) continue
      if (j) { zz.sign = sg; zz.until = t + dtFor(st.R) * (1 + P.mvFlipJit * (2 * rng2() - 1)) }   // the other side: its own leg
      cmd.mx = vx * m; cmd.my = vy * m
      inc('zigWalk')
      return
    }
  }

  // ------------------------------------------------------------------ F4 mv_arc (fightLegs hooks: isolate cell, stand-off)
  /** Unit vector to the hostile line holder (or the last rear hit) farthest off the target bearing, with the in / out
   *  hysteresis; null when every line is inside the arc. */
  function arcFind(tgt) {
    const me = B.me, t = me.t, L = B.trackList
    const bT = Math.atan2(tgt.y - me.y, tgt.x - me.x)
    let best = -1, bx = 0, by = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr === tgt || tr.npc || !tr.losIn || !tr.hostile || !(tr.conf > 0.3) || tr.hp <= 0) continue
      const off = Math.abs(angDiff(bT, tr.bearing))
      if (off > best) { best = off; bx = tr.x - me.x; by = tr.y - me.y }
    }
    if (t - st.rearT <= P.mvArcRearS) { const off = Math.abs(angDiff(bT, st.rearB)); if (off > best) { best = off; bx = Math.cos(st.rearB); by = Math.sin(st.rearB) } }
    st.arcOn = best > (st.arcOn ? P.mvArcOut : P.mvArcIn) * Math.PI / 180
    if (!st.arcOn) return null
    const l = Math.hypot(bx, by) || 1
    arcV.x = bx / l; arcV.y = by / l
    return arcV
  }
  function linesFrom(tgt, x, y, z) {
    const me = B.me, w = B.world, L = B.trackList
    let n = 0
    for (let k = 0; k < L.length; k++) {
      const tr = L[k]
      if (tr === tgt || tr.npc || !tr.losIn || !tr.hostile || !(tr.conf > 0.3) || tr.hp <= 0) continue
      if (x === me.x && y === me.y) { n++; continue }
      const tmz = tr.z + tr.muzzleH
      if (!w || w.shotClear(tr.x, tr.y, tmz, x, y, z + me.height * 0.5) || w.shotClear(tr.x, tr.y, tmz, x, y, z + me.height * 0.9)) n++
    }
    return n
  }
  /** fightLegs isolate branch: true refuses the cell (F4 live): farther than mvCoverWalk (mvCoverBoost with energy), no
   *  line to the target from it, or no fewer other lines than here. */
  function isoVeto(pg) {
    st.isoBoost = false
    if (P.mvArc !== true || B.mode !== MODE.FIGHT || !live()) return false
    const tgt = B.target
    if (!tgt || tgt.npc || !arcFind(tgt)) return false
    const me = B.me, d = Math.hypot(pg.x - me.x, pg.y - me.y), boostOk = me.grounded && me.energy > P.mvCoverBoostE
    let veto = d > (boostOk ? P.mvCoverBoost : P.mvCoverWalk) || !pg.los
    if (!veto) {
      const z = B.nav ? B.nav.levelAt(pg.x, pg.y) : me.z
      veto = linesFrom(tgt, pg.x, pg.y, z) >= linesFrom(tgt, me.x, me.y, me.z)
    }
    if (veto) { inc('coverRefused'); if (d > P.mvCoverWalk) inc('coverRefusedFar') } else { inc('coverNear'); st.isoBoost = d > P.mvCoverWalk; st.isoTick = B.tick }
    return veto
  }
  /** fightLegs, after the isolate moveTo: boost to an accepted cell beyond the walking reach. */
  function isoTaken() { if (st.isoBoost && st.isoTick === B.tick && B.me.grounded) B.cmd.boost = true }
  function arcPost(tgt) {
    if (tgt.npc) { st.arcOn = false; return }
    const uA = arcFind(tgt)
    if (!uA) return
    const me = B.me, cmd = B.cmd
    const tx = tgt.x - me.x, ty = tgt.y - me.y, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl
    const s = mover.jink.sign * P.strafeGain, px = -uy * s, py = ux * s
    let wx = -(ux + uA.x), wy = -(uy + uA.y), wl = Math.hypot(wx, wy)
    if (wl < 0.2) { wx = px; wy = py; wl = Math.hypot(wx, wy) || 1 }        // nearly opposite: the strafe alone closes them
    wx /= wl; wy /= wl
    let vx = wx + px, vy = wy + py
    const vl = Math.hypot(vx, vy)
    if (vl > 0.05 && mover.walkable(vx / vl, vy / vl, P.dodgeProbe)) { vx /= vl; vy /= vl } else if (mover.walkable(wx, wy, P.dodgeProbe)) { vx = wx; vy = wy } else return
    cmd.mx = vx; cmd.my = vy
    B.legKind = 'arcback'
    inc('arcBack')
  }

  // ------------------------------------------------------------------ F5 mv_rim (mover.zoneGoal / zoneCheck, holdLegs, stand-off)
  function rimOn() {
    const z = B.zone
    return P.mvRim === true && z.known && z.dps <= P.mvRimDps && z.nr > P.zoneLateR && live()
  }
  /** mover.zoneGoal and the idle band: the radius fraction of the next circle. */
  function goalFrac() { return rimOn() ? P.mvRimFrac : P.zoneGoalFrac }
  /** End of mover.zoneCheck: replaces B.zoneUrgent under F5 (outside, or the padded leave-by time). */
  function zoneUrg(tOut, len, inGoal, pocket) {
    if (pocket || !rimOn()) { st.rimUrg = B.zoneUrgent; return }
    const me = B.me, legacy = B.zoneUrgent
    const m2 = tOut === Infinity ? Infinity : tOut - P.mvRimPathK * len / Math.max(1, me.walk)
    let u
    if (!me.inZone) u = true
    else if (st.rimUrg) u = !inGoal && m2 < P.mvRimUrgS + P.mvRimHysS
    else u = !inGoal && m2 < P.mvRimUrgS
    if (legacy && !u) inc('zoneFarSkipped')
    if (u && !legacy) inc('rimUrgOnly')
    st.rimUrg = u
    B.zoneUrgent = u
  }
  function rimPost() {
    if (!rimOn()) return
    const me = B.me, z = B.zone, cmd = B.cmd
    const dx = me.x - z.nx, dy = me.y - z.ny, d = Math.hypot(dx, dy) || 1, f = d / z.nr
    if (f >= P.mvRimLo && f <= P.mvRimHi) { inc('rimHold'); return }
    const sg = f < P.mvRimLo ? 1 : -1, bx = dx / d * sg, by = dy / d * sg, w = P.mvRimW
    let mx = cmd.mx * (1 - w) + bx * w, my = cmd.my * (1 - w) + by * w
    const l = Math.hypot(mx, my)
    if (l < 0.05) return
    mx /= l; my /= l
    if (!mover.walkable(mx, my, P.dodgeProbe)) return
    cmd.mx = mx; cmd.my = my
    inc('rimPull')
  }

  /** fightLegs, after a successful open-ground stand-off: F4 arc back, then the F5 rim pull. */
  function standPost(tgt) {
    if (B.mode !== MODE.FIGHT || !tgt || !live()) return
    if (P.mvArc === true) arcPost(tgt)
    if (P.mvRim === true) rimPost()
  }

  return { pre, flipDt, flipNow, band, closeLegs, noDodge, zig, isoVeto, isoTaken, standPost, goalFrac, zoneUrg, state: () => st }
}
