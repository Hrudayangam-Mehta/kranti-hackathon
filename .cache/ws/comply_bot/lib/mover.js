// Layer 3: legs. Path following, stand-off range keeping with a seeded jink, zone goal, stuck recovery and
// the mortar-shell dodge. Everything writes the leg command into B.cmd = { mx, my, boost, jump }.

import { clamp } from './aim.js'
import { timeUntilOutside, zoneSlack } from './senses.js'

const DIR8 = new Float64Array(16)
for (let k = 0; k < 8; k++) { DIR8[k * 2] = Math.cos(k * Math.PI / 4); DIR8[k * 2 + 1] = Math.sin(k * Math.PI / 4) }

export function makeMover(B) {
  const P = B.P
  const path = { pts: null, gx: 0, gy: 0, t: -9, wp: 1, ok: false, len: Infinity, dirty: false, noPathSince: -1 }
  const stuck = { slowSince: -1, phase: 0, sideUntil: -1, sideX: 0, sideY: 0, jetUntil: -1, lastX: 0, lastY: 0, lastT: 0 }
  const prog = { gx: 0, gy: 0, best: Infinity, t: -1 }
  const abandon = { x: 0, y: 0, until: -1 }
  const jink = { sign: 1, until: -1, lastFlip: -9, magT: -99, chargeT: -99 }
  const zg = { x: 0, y: 0, t: -9, len: Infinity, lenT: -9, ok: false, alt: 0 }
  const hop = { plan: null, planT: -9, air: false, t0: -9, comp: -1 }
  const boostTank = { empty: false }
  const bul = { until: -1, mx: 0, my: 0 }

  function isAbandoned(x, y) { return B.me.t < abandon.until && Math.hypot(abandon.x - x, abandon.y - y) < 6 }

  /** One A* per decision at most (operation-count budget, D10); partial paths that gain under 10 m are dropped. */
  function plan(gx, gy) {
    const me = B.me, nav = B.nav
    B.planTick = B.tick
    B.counters.plans++
    let r = null
    try { r = nav.findPath(me.x, me.y, gx, gy, { maxExpand: P.pathExpand }) } catch (e) { r = null; B.noteError('plan', e) }
    path.gx = gx; path.gy = gy; path.t = me.t; path.wp = 1; path.dirty = false
    if (r && r.pts && r.pts.length > 1 && !r.ok) {
      const e = r.pts[r.pts.length - 1], d0 = Math.hypot(gx - me.x, gy - me.y), d1 = Math.hypot(gx - e[0], gy - e[1])
      if (d1 > d0 - P.partialGain) r = null
    }
    if (r && r.pts && r.pts.length > 1) {
      path.pts = r.pts; path.ok = r.ok; path.len = r.len; path.noPathSince = -1
    } else {
      path.pts = null; path.ok = false; path.len = Infinity
      if (path.noPathSince < 0) path.noPathSince = me.t
    }
  }

  function clampArena(o) {
    const w = B.world
    if (!w) return
    const bd = w.bounds, m = B.arenaMargin + B.me.radius + 1
    if (bd.maxX - bd.minX > 2 * m) o.x = clamp(o.x, bd.minX + m, bd.maxX - m)
    if (bd.maxY - bd.minY > 2 * m) o.y = clamp(o.y, bd.minY + m, bd.maxY - m)
  }
  const cg = { x: 0, y: 0 }

  /** Walk to (gx,gy). stick <= 1 scales the speed. Returns the straight distance left. */
  function moveTo(gx, gy, stick = 1, arriveR = 0.8) {
    const me = B.me, nav = B.nav, cmd = B.cmd
    if (!(gx === gx) || !(gy === gy)) { cmd.mx = 0; cmd.my = 0; return 0 }
    cg.x = gx; cg.y = gy; clampArena(cg); gx = cg.x; gy = cg.y
    const dx = gx - me.x, dy = gy - me.y, d = Math.hypot(dx, dy)
    B.goalX = gx; B.goalY = gy; B.hasGoal = true
    if (d < arriveR) { cmd.mx = 0; cmd.my = 0; return d }
    let tx = gx, ty = gy
    if (nav) {
      const direct = d < 80 && nav.walkLine(me.x, me.y, gx, gy)
      if (direct) { path.pts = null; path.len = d; path.ok = true; path.gx = gx; path.gy = gy; path.noPathSince = -1 }
      else {
        const moved = Math.hypot(path.gx - gx, path.gy - gy)
        const need = !path.pts || moved > P.replanMove || me.t - path.t > P.replanS || path.dirty
        if (need && B.planTick !== B.tick) plan(gx, gy)
        const pts = path.pts
        if (pts && Math.hypot(path.gx - gx, path.gy - gy) <= P.replanMove * 2.5) {
          let k = Math.min(path.wp, pts.length - 1)
          while (k < pts.length - 1 && Math.hypot(pts[k][0] - me.x, pts[k][1] - me.y) < P.wpReach) k++
          for (let j = Math.min(pts.length - 1, k + 3); j > k; j--) {
            if (nav.walkLine(me.x, me.y, pts[j][0], pts[j][1])) { k = j; break }
          }
          path.wp = k
          tx = pts[k][0]; ty = pts[k][1]
        } else if (path.noPathSince >= 0) {
          // no path: get onto a standable cell, then slide straight at the goal, then give the goal up
          if (!nav.passableAt(me.x, me.y)) { const q = nav.nearestPassable(me.x, me.y, 14); if (q) { tx = q.x; ty = q.y } }
          if (me.t - path.noPathSince > P.slideS && B.mode !== 'ZONE') { abandon.x = gx; abandon.y = gy; abandon.until = me.t + P.noPathAbandonS; path.noPathSince = -1; B.counters.abandons++ }
        }
      }
    }
    const sx = tx - me.x, sy = ty - me.y, sd = Math.hypot(sx, sy) || 1
    let m = stick
    if (d < 2.5) m = Math.min(m, Math.max(0.2, d / 2.5))
    cmd.mx = sx / sd * m; cmd.my = sy / sd * m
    return d
  }

  function walkable(vx, vy, probe) {
    const me = B.me, nav = B.nav
    const px = me.x + vx * probe, py = me.y + vy * probe
    if (zoneSlack(B, me.x + vx * probe * 3, me.y + vy * probe * 3, me.t + 3) < 3 && zoneSlack(B, me.x, me.y, me.t + 3) >= 3) return false
    if (B.world) { cg.x = px; cg.y = py; clampArena(cg); if (cg.x !== px || cg.y !== py) return false }
    if (!nav) return true
    return nav.walkLine(me.x, me.y, px, py)
  }

  /** Strafe reversal (D4): seeded U(strafeLo, strafeHi), plus one extra at an enemy magazine start or a laser charge at us. */
  function flip(t) {
    jink.sign = -jink.sign; jink.lastFlip = t
    jink.until = t + P.strafeLo + (P.strafeHi - P.strafeLo) * B.rng()
    B.counters.jinks++
  }

  /**
   * Range keeping around a target. With lo/hi (D2 dead band): approach at full stick beyond hi, back off at
   * backStick inside lo, no radial motion inside the band; otherwise radial = clamp(0.5 (R - rPref)). Plus a
   * perpendicular strafe whose sign reverses at seeded intervals. Returns false when no direction is walkable.
   */
  function standoff(tx, ty, rPref, doJink, strafeOn, lo, hi, backStick = 1) {
    const me = B.me, cmd = B.cmd, t = me.t
    const dx = tx - me.x, dy = ty - me.y, R = Math.hypot(dx, dy) || 1
    const ux = dx / R, uy = dy / R
    let radial
    if (lo !== undefined) radial = R > hi ? 1 : R < lo ? -backStick : 0
    else radial = clamp(0.5 * (R - rPref), -1, 1)
    if (doJink) {
      const extra = (B.magStartT > jink.magT && t - B.magStartT < 0.3) || (B.chargeAtMeT > jink.chargeT && t - B.chargeAtMeT < 0.3)
      if (B.magStartT > jink.magT) jink.magT = B.magStartT
      if (B.chargeAtMeT > jink.chargeT) jink.chargeT = B.chargeAtMeT
      if (t >= jink.until || (extra && t - jink.lastFlip >= 0.4)) flip(t)
    }
    const s = strafeOn ? jink.sign * P.strafeGain : 0
    // candidates: full, strafe flipped, strafe only (both signs), radial only
    for (let c = 0; c < 5; c++) {
      let rr = radial, ss = s
      if (c === 1) ss = -s
      else if (c === 2) rr = 0
      else if (c === 3) { rr = 0; ss = -s }
      else if (c === 4) ss = 0
      let vx = ux * rr - uy * ss, vy = uy * rr + ux * ss
      const l = Math.hypot(vx, vy)
      if (l < 0.05) { if (c === 0) { cmd.mx = 0; cmd.my = 0; return true } continue }
      vx /= l; vy /= l
      if (walkable(vx, vy, P.dodgeProbe)) {
        if ((c === 1 || c === 3) && t - jink.lastFlip >= 0.4) flip(t)
        const m = Math.min(1, l)
        cmd.mx = vx * m; cmd.my = vy * m
        return true
      }
    }
    return false
  }

  // ------------------------------------------------------------------ bullet-aware dodge (D4)
  /**
   * For every visible enemy gun bullet whose closest approach to our predicted position in the next 0.9 s is
   * under radius + 1.2 m: sidestep perpendicular to its path (walkable side, inside the zone) or brake / reverse,
   * blended with the tactical command at weight 0.9. Returns true when it changed the command.
   */
  function bulletDodge() {
    const me = B.me, cmd = B.cmd, t = me.t
    if (!me.grounded || B.bullets.size === 0) { if (t < bul.until) { blend(bul.mx, bul.my); return true } return false }
    const spd = (cmd.boost && me.energy > 1 ? me.boostSpeed : me.walk) * (me.laser && me.laser.charge > 0 ? me.chargeMoveMult : 1)
    const vx0 = cmd.mx * spd, vy0 = cmd.my * spd
    const rr = me.radius + P.dodgeMargin, cz = me.z + me.height * 0.5
    let worst = null, worstT = Infinity
    for (const b of B.bullets.values()) {
      if (b.npc) continue
      const age = t - b.t
      const bx = b.x + b.vx * age, by = b.y + b.vy * age, bz = b.z + b.vz * age
      // closest approach of the bullet to our predicted (planned) motion, horizontal plus a height check
      const rx = bx - me.x, ry = by - me.y, rvx = b.vx - vx0, rvy = b.vy - vy0
      const vv = rvx * rvx + rvy * rvy
      if (vv < 1) continue
      let tc = -(rx * rvx + ry * rvy) / vv
      if (tc < 0 || tc > P.dodgeHorizon) continue
      const cx = rx + rvx * tc, cy = ry + rvy * tc, zc = bz + b.vz * tc
      if (Math.hypot(cx, cy) >= rr || zc < me.z - 1 || zc > me.z + me.height + 1) continue
      if (tc < worstT) { worstT = tc; worst = b }
    }
    if (!worst) { if (t < bul.until) { blend(bul.mx, bul.my); return true } return false }
    const bl = Math.hypot(worst.vx, worst.vy) || 1, px = -worst.vy / bl, py = worst.vx / bl
    // side: the one we are already moving toward, if walkable; else the other; else brake / reverse
    const pref = (vx0 * px + vy0 * py) >= 0 ? 1 : -1
    let dx = 0, dy = 0
    if (walkable(px * pref, py * pref, P.dodgeProbe)) { dx = px * pref; dy = py * pref }
    else if (walkable(-px * pref, -py * pref, P.dodgeProbe)) { dx = -px * pref; dy = -py * pref }
    else { const l = Math.hypot(vx0, vy0); if (l > 0.5 && walkable(-vx0 / l, -vy0 / l, P.dodgeProbe)) { dx = -vx0 / l; dy = -vy0 / l } }
    bul.mx = dx; bul.my = dy; bul.until = t + P.dodgeHold
    blend(dx, dy)
    B.counters.bulletDodges = (B.counters.bulletDodges || 0) + 1
    return true
  }
  function blend(dx, dy) {
    const cmd = B.cmd, w = P.dodgeWeight
    let mx = cmd.mx * (1 - w) + dx * w, my = cmd.my * (1 - w) + dy * w
    const l = Math.hypot(mx, my)
    if (l > 1e-3) { mx /= l; my /= l } else { mx = 0; my = 0 }
    cmd.mx = mx; cmd.my = my
    B.dodging = true
  }

  // ------------------------------------------------------------------ zone (D9)
  function zoneGoal() {
    const me = B.me, z = B.zone, nav = B.nav, t = me.t
    if (zg.ok && t - zg.t < 1.0) return zg
    zg.t = t; zg.ok = true
    const late = z.nr <= P.zoneLateR
    const shrinking = t >= z.t0 && t < z.t1
    if (late && z.nr <= 0.5 && shrinking) {
      // final shrink: stand on the moving centre (1 s ahead)
      const u = z.t1 > z.t0 ? Math.min(1, (t + 1 - z.t0) / (z.t1 - z.t0)) : 1
      zg.x = z.cx + (z.nx - z.cx) * u; zg.y = z.cy + (z.ny - z.cy) * u
      return zg
    }
    let rg = late ? 0 : z.nr * P.zoneGoalFrac
    const dcx = me.x - z.nx, dcy = me.y - z.ny, dc = Math.hypot(dcx, dcy)
    if (dc <= rg) { zg.x = me.x; zg.y = me.y; return zg }
    let ux = dc > 1e-6 ? dcx / dc : 1, uy = dc > 1e-6 ? dcy / dc : 0
    if (zg.alt) { const a = zg.alt * 0.5, c = Math.cos(a), s = Math.sin(a), x = ux * c - uy * s; uy = ux * s + uy * c; ux = x }
    zg.x = z.nx + ux * rg; zg.y = z.ny + uy * rg
    if (nav) {
      const comp = nav.component(me.x, me.y), main = nav.mainComponent
      for (let k = 0; k < 6; k++) {
        const gx = z.nx + ux * rg, gy = z.ny + uy * rg
        const q = nav.nearestPassable(gx, gy, 24)
        // a goal in our own component, or (from a pocket) in the main one: the hop gets us there
        if (q && (comp < 0 || nav.component(q.x, q.y) === comp || nav.component(q.x, q.y) === main) && Math.hypot(q.x - z.nx, q.y - z.ny) <= Math.max(z.nrEff - 2, rg + 1)) { zg.x = q.x; zg.y = q.y; break }
        rg *= 0.7
      }
    }
    return zg
  }
  function inPocket() {
    const nav = B.nav, me = B.me
    if (!nav || typeof nav.hopPlan !== 'function') return false
    const c = nav.component(me.x, me.y)
    return c >= 0 && c !== nav.mainComponent
  }

  /** Updates B.zoneMargin / B.zoneUrgent (D9 triggers plus the travel-time margin). */
  function zoneCheck() {
    const me = B.me, z = B.zone, t = me.t
    if (!z.known) { B.zoneUrgent = false; B.zoneMargin = Infinity; return }
    const tOut = timeUntilOutside(B, me.x, me.y, 1)
    B.zoneTOut = tOut
    const dCur = Math.hypot(me.x - z.cx, me.y - z.cy), dNext = Math.hypot(me.x - z.nx, me.y - z.ny)
    const shrinking = t >= z.t0 && t < z.t1
    const g = zoneGoal()
    const straight = Math.hypot(g.x - me.x, g.y - me.y)
    let len = straight * P.pathFactor
    const pocket = inPocket() && B.nav.component(g.x, g.y) !== B.nav.component(me.x, me.y)
    // true path length to the safe point (full budget), refreshed every 2 s; a failed plan counts as late
    if (B.nav && !pocket && (tOut < 120 || dNext > P.zoneNextFrac * z.nr) && t - zg.lenT > 2 && B.planTick !== B.tick && straight > 6) {
      zg.lenT = t
      B.planTick = B.tick
      B.counters.plans++
      let r = null
      try { r = B.nav.findPath(me.x, me.y, g.x, g.y, { maxExpand: P.pathExpand }) } catch (e) { r = null }
      zg.len = r && r.ok ? r.len : straight * 3 + 60
      if (r && r.pts && r.pts.length > 1 && r.ok && B.mode === 'ZONE') { path.pts = r.pts; path.gx = g.x; path.gy = g.y; path.t = t; path.wp = 1; path.ok = r.ok; path.len = r.len; path.dirty = false }
    }
    if (zg.len < Infinity && t - zg.lenT < 3) len = Math.max(straight, zg.len)
    if (pocket) {
      if (!hop.plan || t - hop.planT > 3) { hop.planT = t; try { hop.plan = B.nav.hopPlan(me.x, me.y, { toward: [z.nx, z.ny] }) } catch (e) { hop.plan = null } }
      len = straight * P.pathFactor + (hop.plan ? hop.plan.walkLen + hop.plan.hopLen + 8 * me.walk : 200)
    }
    if (!B.zoneUrgent && tOut === Infinity && me.inZone && !pocket && dNext <= P.zoneNextFrac * z.nr && dCur <= P.zoneOuterFrac * z.r) { B.zoneMargin = Infinity; return }
    const pathT = len / me.walk
    const margin = (tOut === Infinity ? 1e3 : tOut) - pathT
    B.zoneMargin = margin
    const inGoal = straight < 3
    const trig = !me.inZone || dCur > P.zoneOuterFrac * z.r || (dNext > P.zoneNextFrac * z.nr && (shrinking || z.t0 - t < pathT + P.zoneShrinkLead)) || margin < P.zoneMargin
    if (!me.inZone) B.zoneUrgent = true
    else if (B.zoneUrgent) B.zoneUrgent = !inGoal && (trig || dNext > z.nrEff * 0.6 + 2 || margin < P.zoneMargin * 2.5)
    else B.zoneUrgent = trig && !inGoal
    if (pocket && hop.air) B.zoneUrgent = true
  }

  /**
   * Pocket exit (nav component other than the main one, goal outside): walk to the launch cell of nav.hopPlan,
   * wait for the energy, jump, jet until the feet clear apexZ, fly to the landing cell. True while it owns the legs.
   */
  function pocketExit(tx, ty) {
    const me = B.me, nav = B.nav, cmd = B.cmd, t = me.t
    if (!nav || typeof nav.hopPlan !== 'function') return false
    const m = B.cfg.mech
    if (hop.air) {
      const p = hop.plan
      const done = me.grounded && t - hop.t0 > 0.3
      if (!p || done || t - hop.t0 > 9) { hop.air = false; hop.plan = null; hop.planT = -9; return false }
      B.wantJet = true
      const lx = p.land[0] - me.x, ly = p.land[1] - me.y, ld = Math.hypot(lx, ly) || 1
      const high = me.z >= p.apexZ
      // rise beside the wall first; move over it only with the feet above the edge
      if (high || ld < 1.5) { cmd.mx = lx / ld; cmd.my = ly / ld } else { const bx = p.launch[0] - me.x, by = p.launch[1] - me.y, bd = Math.hypot(bx, by); cmd.mx = bd > 0.5 ? bx / bd * 0.4 : 0; cmd.my = bd > 0.5 ? by / bd * 0.4 : 0 }
      cmd.boost = ld > 2.5 && me.z < p.apexZ + 1.2 && me.energy > 0.5
      cmd.jump = false
      B.goalX = p.land[0]; B.goalY = p.land[1]; B.hasGoal = true
      return true
    }
    const c = nav.component(me.x, me.y)
    if (c < 0 || c === nav.mainComponent || !me.grounded) { hop.plan = null; return false }
    const gc = nav.component(tx, ty)
    if (gc === c) { hop.plan = null; return false }                       // the goal is inside our pocket: just walk
    if (!hop.plan || hop.comp !== c || t - hop.planT > 3) {
      hop.planT = t; hop.comp = c
      try { hop.plan = nav.hopPlan(me.x, me.y, { toward: [tx, ty] }) } catch (e) { hop.plan = null }
    }
    const p = hop.plan
    if (!p) return false
    const jetDrain = m.jet_drain || 15, rise = m.max_rise_speed || 10, air = m.walk_speed || 11.7
    const need = Math.min(95, 8 + jetDrain * (p.climb / rise + 0.4) + jetDrain * (p.hopLen / air) * 0.8)
    const d = moveTo(p.launch[0], p.launch[1], 1, 0.9)
    cmd.boost = false                                                      // the tank is for the hop
    if (d < 1.6) {
      cmd.mx = 0; cmd.my = 0
      if (me.energy >= need && me.speed < 3) { cmd.jump = true; hop.air = true; hop.t0 = t; B.wantJet = true; B.counters.hops = (B.counters.hops || 0) + 1 }
    }
    B.legKind = 'hop'
    return true
  }

  /** Ground boost with a refill hysteresis: once the tank ran dry, wait for boostRefill before spending again. */
  function boostOk(min = 1) {
    const me = B.me
    if (me.energy < 2) boostTank.empty = true
    else if (me.energy >= P.boostRefill) boostTank.empty = false
    return !boostTank.empty && me.energy > min
  }

  function zoneLegs() {
    const me = B.me, z = B.zone, cmd = B.cmd
    if (pocketExit(z.nx, z.ny)) return
    const g = zoneGoal()
    moveTo(g.x, g.y, 1, z.nr <= 0.5 ? 0.6 : 1.5)
    if (!me.inZone || B.zoneMargin < P.zoneBoostMargin) cmd.boost = boostOk(1) || (!me.inZone && B.zoneMargin < 0 && me.energy > 1 && Math.hypot(g.x - me.x, g.y - me.y) < 25)
  }

  // ------------------------------------------------------------------ shell dodge
  /** Returns true when the legs were taken over to escape a predicted mortar impact. */
  function shellDodge() {
    const me = B.me, t = me.t, cmd = B.cmd
    const splash = (B.cfg.weapons.mortar && B.cfg.weapons.mortar.splash_radius) || 7
    const danger = splash * 1.3 + P.shellMargin
    let worst = null, worstT = Infinity
    for (const s of B.shells.values()) {
      const ti = s.t - t
      if (ti < -0.05 || ti > P.shellHorizon) continue
      const px = me.x + me.vx * Math.min(ti, 1.5), py = me.y + me.vy * Math.min(ti, 1.5)
      const dNow = Math.hypot(me.x - s.x, me.y - s.y), dPred = Math.hypot(px - s.x, py - s.y)
      if (Math.min(dNow, dPred) < danger && ti < worstT) { worst = s; worstT = ti }
    }
    if (!worst) return false
    const ti = Math.max(0.05, worstT)
    const canBoost = me.energy > 3
    const spd = canBoost ? me.boostSpeed : me.walk
    const reach = Math.max(2, spd * Math.max(0.1, ti - 0.12))
    let best = -1, bestD = -1
    for (let k = 0; k < 8; k++) {
      const vx = DIR8[k * 2], vy = DIR8[k * 2 + 1]
      const probe = Math.min(reach, P.shellProbe)
      if (B.nav && !B.nav.walkLine(me.x, me.y, me.x + vx * probe, me.y + vy * probe)) {
        if (!B.nav.walkLine(me.x, me.y, me.x + vx * probe * 0.5, me.y + vy * probe * 0.5)) continue
      }
      // distance from the impact point when it lands, with the current velocity blended in
      const ex = me.x + vx * reach, ey = me.y + vy * reach
      let d = Math.hypot(ex - worst.x, ey - worst.y)
      if (zoneSlack(B, ex, ey, t + ti) < 0) d -= 6
      d += 0.05 * (vx * me.vx + vy * me.vy)
      if (d > bestD) { bestD = d; best = k }
    }
    if (best < 0) {
      const ax = me.x - worst.x, ay = me.y - worst.y, l = Math.hypot(ax, ay)
      if (l > 0.1) { cmd.mx = ax / l; cmd.my = ay / l } else { cmd.mx = 1; cmd.my = 0 }
    } else { cmd.mx = DIR8[best * 2]; cmd.my = DIR8[best * 2 + 1] }
    cmd.boost = canBoost
    B.counters.dodges++
    B.dodging = true
    return true
  }

  // ------------------------------------------------------------------ stuck recovery
  /** Call once per tick after the legs are decided. May override the command (jump / sidestep / jet). */
  function stuckCheck() {
    const me = B.me, cmd = B.cmd, t = me.t
    if (hop.air || B.wantJet) { stuck.slowSince = -1; stuck.phase = 0; prog.t = -1; return }
    const want = Math.hypot(cmd.mx, cmd.my)
    // progress: a goal (same within 6 m) that has not come 5 m closer in 3 s while we walk at it -> re-goal
    if (B.hasGoal && want > 0.45 && !B.dodging) {
      const dg = Math.hypot(B.goalX - me.x, B.goalY - me.y)
      if (prog.t < 0 || Math.hypot(prog.gx - B.goalX, prog.gy - B.goalY) > 6) { prog.gx = B.goalX; prog.gy = B.goalY; prog.best = dg; prog.t = t }
      else if (dg < prog.best - P.progressM) { prog.best = dg; prog.t = t }
      else if (t - prog.t > P.progressS && dg > 4) {
        B.counters.noProgress = (B.counters.noProgress || 0) + 1
        path.dirty = true; path.pts = null
        if (B.mode === 'ZONE') { zg.alt = zg.alt >= 0 ? -(zg.alt + 1) : -zg.alt; zg.t = -9 } else { abandon.x = B.goalX; abandon.y = B.goalY; abandon.until = t + P.abandonS; B.counters.abandons++ }
        prog.t = -1
      }
    } else if (!B.hasGoal) prog.t = -1
    if (t - stuck.lastT >= 0.6) {
      stuck.moved = Math.hypot(me.x - stuck.lastX, me.y - stuck.lastY)
      stuck.lastX = me.x; stuck.lastY = me.y; stuck.lastT = t
    }
    const slow = want > 0.45 && me.speed < P.stuckSpeed && (stuck.moved === undefined || stuck.moved < 1.2) && !B.jinkTurn
    if (!slow) {
      if (me.speed > P.stuckSpeed * 2 || want <= 0.45) { stuck.slowSince = -1; stuck.phase = 0 }
      if (t >= stuck.sideUntil) return
    } else if (stuck.slowSince < 0) stuck.slowSince = t
    const dur = stuck.slowSince < 0 ? 0 : t - stuck.slowSince
    if (dur >= P.stuckS && stuck.phase === 0) {
      stuck.phase = 1
      const sg = B.rng() < 0.5 ? 1 : -1
      const l = want || 1
      stuck.sideX = -cmd.my / l * sg; stuck.sideY = cmd.mx / l * sg
      stuck.sideUntil = t + 0.4
      path.dirty = true
      cmd.jump = me.grounded
      B.counters.stuck++
    } else if (dur >= P.stuckJetS && stuck.phase === 1) {
      stuck.phase = 2; stuck.jetUntil = t + 1.0; cmd.jump = me.grounded; path.dirty = true
    } else if (dur >= P.stuckAbandonS && stuck.phase === 2) {
      stuck.phase = 3
      if (B.hasGoal) { abandon.x = B.goalX; abandon.y = B.goalY; abandon.until = t + P.abandonS; B.counters.abandons++ }
      stuck.slowSince = -1; stuck.phase = 0; path.dirty = true
    }
    if (t < stuck.sideUntil) {
      // sidestep blended with the wanted direction
      const mx = cmd.mx * 0.35 + stuck.sideX, my = cmd.my * 0.35 + stuck.sideY, l = Math.hypot(mx, my) || 1
      cmd.mx = mx / l; cmd.my = my / l
    }
    if (stuck.phase === 2 && t < stuck.jetUntil) {
      if (me.grounded) cmd.jump = true
      else if (me.energy > 5) cmd.boost = true     // jet over the obstacle
    }
  }

  return { moveTo, standoff, zoneCheck, zoneLegs, zoneGoal, shellDodge, stuckCheck, isAbandoned, path, jink, walkable, bulletDodge, pocketExit, hop, boostOk, inPocket,
    pathLen: () => path.len, dirty: () => { path.dirty = true } }
}
