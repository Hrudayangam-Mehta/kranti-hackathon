// Layer 2: torso and triggers. Gun lead with latency compensation and an actual-aim gate, laser charge /
// release, lightning, mortar, reload discipline and the torso policy when there is nothing to shoot.

import { angDiff, clamp, intercept, laserFrac, mortarSolve, wrapPi } from './aim.js'

export function makeFireControl(B) {
  const P = B.P
  const ps = { x: 0, y: 0, z: 0 }                 // our predicted feet position when the shot leaves
  const sol = { ok: false, yaw: 0, pitch: 0, x: 0, y: 0, z: 0, dist: 0, t: 0, hi: false }
  const st = { scanDir: 1, scanFlipT: 0, dwellUntil: -1, dwellYaw: 0 }

  function predictSelf(tl) {
    const me = B.me, cmd = B.cmd
    let x = me.x, y = me.y, vx = me.vx, vy = me.vy
    if (me.grounded) {
      const lz = me.laser
      const charging = !!(lz && (lz.charge > 0 || B.out.fire[lz.slot]))
      const sp = (cmd.boost && me.energy > 0.5 ? me.boostSpeed : me.walk) * (charging ? me.chargeMoveMult : 1)
      const tvx = cmd.mx * sp, tvy = cmd.my * sp
      const n = Math.max(1, Math.min(4, Math.round(tl / 0.05))), dt = tl / n
      for (let i = 0; i < n; i++) {
        const dvx = tvx - vx, dvy = tvy - vy, dv = Math.hypot(dvx, dvy), step = me.accel * dt
        if (dv <= step) { vx = tvx; vy = tvy } else { vx += dvx / dv * step; vy += dvy / dv * step }
        x += vx * dt; y += vy * dt
      }
      ps.z = me.z
    } else {
      x += vx * tl; y += vy * tl
      ps.z = me.z + me.vz * tl - 0.5 * (B.cfg.mech.gravity || 22) * tl * tl
    }
    ps.x = x; ps.y = y
  }

  /** Height of an airborne target at time T from now: jet phase (rising, first 1.5 s) or a ballistic arc. */
  function airZ(tr, T) {
    const m = B.cfg.mech, g = m.gravity || 22
    let z
    if (B.me.t - tr.airT0 < 1.5 && tr.vz >= 0) {
      const vz1 = Math.min(m.max_rise_speed || 10, tr.vz + ((m.jet_accel || 34) - g) * T)
      z = tr.z + 0.5 * (tr.vz + vz1) * T
    } else z = tr.z + tr.vz * T - 0.5 * g * T * T
    if (B.world) { const gz = B.world.ground(tr.x + (tr.vx || 0) * T, tr.y + (tr.vy || 0) * T); if (z < gz) z = gz }
    return z
  }
  /** Shot latency for a gun whose cooldown read-out is cd: it leaves on the first tick the cooldown allows. */
  function gunLatency(cd) { const k = P.tickS; return k * Math.max(1, Math.ceil(cd / k - 1e-6)) }

  /** Gun lead solution against a track (or a static object with radius/height). Fills `sol`. zOff: m above the centre. */
  function gunSolve(tr, tl, zFrac, zOff = 0) {
    const me = B.me, g = me.gun
    sol.ok = false
    if (!g) return false
    let vx = tr.vx || 0, vy = tr.vy || 0
    const vz = tr.vz || 0
    if (tr.revs >= P.revCount) {
      // the target is jinking: halve the lateral part of the lead (aim nearer the midpoint)
      const bx = tr.x - me.x, by = tr.y - me.y, h = Math.hypot(bx, by) || 1
      const ux = bx / h, uy = by / h
      const rad = vx * ux + vy * uy, perp = -vx * uy + vy * ux
      const p2 = perp * P.revLeadScale
      vx = ux * rad - uy * p2; vy = uy * rad + ux * p2
    }
    const sx = ps.x, sy = ps.y, sz = ps.z + me.muzzleH
    const cx = tr.x + vx * tl, cy = tr.y + vy * tl
    const zc = tr.height * zFrac + zOff
    let cz = tr.z + zc
    const off = me.radius + 0.5
    let r = intercept(sx, sy, sz, cx, cy, cz, vx, vy, 0, g.speed, off)
    if (!r) return false
    if (tr.airborne || Math.abs(vz) >= 0.5) {
      // airborne: jet or ballistic arc at the arrival time (two refinements), never below the ground
      for (let it = 0; it < 2; it++) {
        cz = airZ(tr, tl + r.t) + zc
        const r2 = intercept(sx, sy, sz, cx, cy, cz, vx, vy, 0, g.speed, off)
        if (!r2) return false
        r = r2
      }
    }
    sol.ok = true; sol.yaw = r.yaw; sol.pitch = r.pitch; sol.x = r.x; sol.y = r.y; sol.z = r.z; sol.dist = r.dist; sol.t = r.t
    return true
  }

  function muzzleClear(yaw, pitch, tx, ty, tz) {
    const w = B.world
    if (!w) return true
    const me = B.me, off = me.radius + 0.5, c = Math.cos(pitch)
    const mx = ps.x + c * Math.cos(yaw) * off, my = ps.y + c * Math.sin(yaw) * off, mz = ps.z + me.muzzleH + Math.sin(pitch) * off
    // stop a little short of the target point so the target's own ground contact does not count
    const dx = tx - mx, dy = ty - my, dz = tz - mz, d = Math.hypot(dx, dy, dz)
    if (d < 1) return true
    const f = Math.max(0, (d - 1.0) / d)
    return w.shotClear(mx, my, mz, mx + dx * f, my + dy * f, mz + dz * f)
  }

  /** Aim the torso will have when the shot leaves: current aim slewed toward the command for `tl`. */
  function predYaw(cmdYaw, tl) { const me = B.me; return wrapPi(me.yaw + clamp(angDiff(me.yaw, cmdYaw), -me.turnRate * tl, me.turnRate * tl)) }
  function predPitch(cmdPitch, tl) { const me = B.me; return me.pitch + clamp(clamp(cmdPitch, me.minPitch, me.maxPitch) - me.pitch, -me.pitchRate * tl, me.pitchRate * tl) }

  function scan() {
    const me = B.me, t = me.t, out = B.out
    // 1. the attacker that hurt us most in the last 3 s (never show the back)
    const at = B.topAttacker
    if (at) { out.aim[0] = Math.atan2(at.y - me.y, at.x - me.x); out.aim[1] = pitchTo(at.x, at.y, at.z + at.height * 0.5); return 'attacker' }
    if (t - B.unseenHurtT <= P.faceAttackerS) { out.aim[0] = B.unseenHurtBearing; out.aim[1] = 0; return 'bearing' }
    // 2. the corner where the target disappeared
    if (B.lostTarget && t - B.lostTargetT <= P.preAimS) { out.aim[0] = Math.atan2(B.lostY - me.y, B.lostX - me.x); out.aim[1] = pitchTo(B.lostX, B.lostY, B.lostZ); return 'preaim' }
    // 3. a look hint from the mode (ambush corner, drop ring, loot)
    if (B.lookHint) { out.aim[0] = Math.atan2(B.lookY - me.y, B.lookX - me.x); out.aim[1] = 0; return 'hint' }
    // 4. scan: nearest remembered mech, loudest sound sector, else rotate
    const nm = B.nearestMech
    if (nm && t - nm.lastSeen < 8 && t >= st.dwellUntil && ((B.tick >> 4) & 1) === 0) { out.aim[0] = Math.atan2(nm.y - me.y, nm.x - me.x); out.aim[1] = 0; return 'track' }
    let bs = -1, bw = 1.2
    for (let i = 0; i < 12; i++) if (B.heard[i] > bw) { bw = B.heard[i]; bs = i }
    if (bs >= 0 && ((B.tick >> 3) & 3) !== 0) { out.aim[0] = -Math.PI + (bs + 0.5) * Math.PI / 6; out.aim[1] = 0; return 'sound' }
    out.aim[0] = wrapPi(me.yaw + st.scanDir * P.scanRate * 0.1 * 1.05)
    out.aim[1] = 0
    return 'scan'
  }
  function pitchTo(x, y, z) {
    const me = B.me
    return clamp(Math.atan2(z - (me.z + me.muzzleH), Math.hypot(x - me.x, y - me.y) || 1), me.minPitch, me.maxPitch)
  }

  function run() {
    const me = B.me, out = B.out, t = me.t, tl = P.latency
    const g = me.gun, lz = me.laser, li = me.lightning, mo = me.mortar
    const wasHolding = lz ? out.fire[lz.slot] === true : false
    predictSelf(tl)
    out.fire[0] = false; out.fire[1] = false; out.reload = false
    let tgt = B.target
    const hold = B.holdFire
    B.aimKind = 'none'
    let shootObj = null
    const blind = tgt && !tgt.listed && !tgt.phantom && t - tgt.lastSeen <= P.blindFireS
    if (tgt && !(tgt.listed || t - tgt.lastSeen < 0.35 || blind)) {
      // remembered only: pre-aim where it should be, never shoot
      out.aim[0] = Math.atan2(tgt.y - me.y, tgt.x - me.x); out.aim[1] = pitchTo(tgt.x, tgt.y, tgt.z + tgt.height * 0.5)
      B.aimKind = 'memory'
      tgt = null
    } else if (!tgt && B.shootCrate && !hold) shootObj = B.shootCrate

    let laserRelease = false, laserKeep = false
    if (tgt && B.ambushAim && !tgt.losOut) {
      // corner ambush: the torso waits on the point where the pursuer will come into view
      const ez = (B.nav ? B.nav.levelAt(B.lookX, B.lookY) : me.z) + tgt.height * 0.5
      out.aim[0] = Math.atan2(B.lookY - me.y, B.lookX - me.x); out.aim[1] = pitchTo(B.lookX, B.lookY, ez)
      B.aimKind = 'ambush'
      if (lz && !hold && !B.noCharge && (lz.charge > 0 || (B.peekSoon && lz.cooldown <= 0.11))) {
        const full = lz.charge >= P.laserFullFrac * lz.full
        if (full) { if (lz.fullSince < 0) lz.fullSince = t } else lz.fullSince = -1
        laserKeep = !(full && t - lz.fullSince >= P.laserForceS)
      }
    } else if (tgt || shootObj) {
      const o = tgt || shootObj
      const R0 = Math.hypot(o.x - me.x, o.y - me.y, o.z - me.z)
      // ---------------- gun (lead for the tick the shot really leaves on)
      let gunOk = false, gunFire = false, gunReady = false, gYaw = 0, gPitch = 0, yawGate = 0, pitGate = 0
      const tlg = g ? gunLatency(g.cooldown) : tl
      if (g) predictSelf(tlg)
      if (g && gunSolve(o, tlg, 0.5)) {
        gunOk = true
        let clear = muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)
        let hFrac = 0.5
        if (!clear && tgt) {
          // D8 aim-point ladder: centre, +2 m, +3.6 m (scaled by size), first with a clear line; small upward gate
          const y0 = sol.yaw, p0 = sol.pitch, d0 = sol.dist, x0 = sol.x, yy0 = sol.y, z0 = sol.z, t0 = sol.t
          const sc = o.height / (B.cfg.mech.height || 9)
          for (let k = 1; k < P.ladder.length && !clear; k++) {
            const off = P.ladder[k] * sc
            if (o.height * 0.5 + off > o.height * 0.95) break
            if (gunSolve(o, tlg, 0.5, off) && muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)) { clear = true; hFrac = Math.max(0.06, (o.height * 0.5 - off) / o.height * 0.5) }
          }
          if (!clear) { sol.ok = true; sol.yaw = y0; sol.pitch = p0; sol.dist = d0; sol.x = x0; sol.y = yy0; sol.z = z0; sol.t = t0 }
        }
        out.aim[0] = sol.yaw; out.aim[1] = clamp(sol.pitch, me.minPitch, me.maxPitch)
        B.aimKind = 'gun'
        // D2: a long bullet flight only at a target that kept a steady velocity for 0.6 s or is on a ballistic arc
        const steady = !tgt || t - o.steadySince >= P.steadyS || (o.airborne && !(t - o.airT0 < 1.5 && o.vz >= 0))
        const flightOk = sol.t <= P.gunFlightMax || steady
        if (!flightOk) B.counters.flightGated = (B.counters.flightGated || 0) + 1
        gunReady = g.cooldown <= P.readyCd && g.ammo > 0 && g.reload <= 0 && clear && !hold && sol.dist <= g.range * P.gunRangeFrac && flightOk
        if (gunReady) {
          const R = Math.max(1, sol.dist)
          gYaw = sol.yaw; gPitch = sol.pitch
          yawGate = Math.max(P.gateMin, P.gateK * (o.radius + P.gateBody) / R - g.spread)
          pitGate = Math.max(P.gateMin, P.gateK * (o.height * hFrac + P.gateBody) / R - g.spread)
        }
        B.gunLos = clear
      } else if (!g || !sol.ok) {
        out.aim[0] = Math.atan2(o.y - me.y, o.x - me.x); out.aim[1] = pitchTo(o.x, o.y, o.z + o.height * 0.5)
        B.aimKind = 'direct'
      }
      // ---------------- laser (hitscan: aim at where the target will be when the beam leaves)
      if (g) predictSelf(tl)
      if (lz && tgt) {
        const lx = tgt.x + tgt.vx * tl, ly = tgt.y + tgt.vy * tl, lzc = tgt.z + tgt.height * 0.5 + (Math.abs(tgt.vz) >= 0.5 ? tgt.vz * tl : 0)
        const sx = ps.x, sy = ps.y, sz = ps.z + me.muzzleH
        const ldx = lx - sx, ldy = ly - sy, lh = Math.hypot(ldx, ldy) || 1
        const lyaw = Math.atan2(ldy, ldx), lpitch = clamp(Math.atan2(lzc - sz, lh), me.minPitch, me.maxPitch)
        const lR = Math.hypot(lh, lzc - sz)
        const inRange = lR <= lz.range * P.laserRangeFrac
        const charge = lz.charge
        if (charge > 0 || wasHolding) {
          const full = charge >= P.laserFullFrac * lz.full
          if (full) { if (lz.fullSince < 0) lz.fullSince = t } else lz.fullSince = -1
          const takeAim = charge >= P.laserTakeFrac * lz.full - 1e-6
          const cy = takeAim ? lyaw : out.aim[0], cp = takeAim ? lpitch : out.aim[1]
          const ey = Math.abs(angDiff(predYaw(cy, tl), lyaw)), ep = Math.abs(predPitch(cp, tl) - lpitch)
          const gate = ey <= Math.atan2(tgt.radius * P.laserGateK, lR) && ep <= Math.atan2(tgt.height * 0.5 * P.laserGateK, lR)
          const clear = inRange && muzzleClear(lyaw, lpitch, lx, ly, lzc)
          const mult = me.dmgMult * (tgt.rearOn ? me.rearMult : 1) * (tgt.hasMortar ? 1 + lz.cookoff : 1)
          const killNow = charge >= (lz.st.min_charge || 0.15) && laserFrac(charge, lz.full, lz.minFrac) * lz.damage * mult >= tgt.hp
          if (takeAim || killNow) { out.aim[0] = lyaw; out.aim[1] = lpitch; B.aimKind = 'laser' }
          if (gate && clear && (full || killNow)) laserRelease = true
          else if (full && t - lz.fullSince >= P.laserForceS) laserRelease = true
          else if (B.noCharge && charge < lz.full - 0.1) laserRelease = true      // the legs need full speed now
          else laserKeep = true
          if (hold && !killNow && !full && !B.noCharge) { laserKeep = true; laserRelease = false }
        } else if (!hold && !B.noCharge && lz.cooldown <= 0.11 && inRange) {
          const expected = tgt.losOut || t - tgt.losOutT <= P.laserExpectS || B.peekSoon
          if (expected) laserKeep = true
        }
      }
      // ---------------- mortar (lowest priority; shares the torso with the gun)
      if (mo && tgt && !hold && mo.cooldown <= P.readyCd && R0 >= P.mortarMinD) {
        const gunBusy = !g || g.reload > 0.3 || g.ammo === 0
        const blind = !tgt.losOut && t - tgt.lastSeen <= P.mortarSeenS
        if (gunBusy || blind) {
          const tspd = Math.hypot(tgt.vx, tgt.vy)
          const m = mortarSolve(ps.x, ps.y, ps.z + me.height + 0.5, tgt.x, tgt.y, tgt.z, tgt.vx, tgt.vy, mo.speed, mo.gravity, me.radius + 0.5, false)
          if (m && (tspd < 1 || m.t <= P.mortarMaxFlight) && Math.hypot(m.x - me.x, m.y - me.y) > mo.splashR + P.mortarSelfMargin && m.pitch <= me.maxPitch) {
            const c = Math.cos(m.pitch), a = P.mortarArcCheck
            const tz0 = ps.z + me.height + 0.5
            const arcClear = !B.world || B.world.shotClear(ps.x, ps.y, tz0, ps.x + c * Math.cos(m.yaw) * a, ps.y + c * Math.sin(m.yaw) * a, tz0 + Math.sin(m.pitch) * a - 0.5 * mo.gravity * (a / (mo.speed * c)) ** 2)
            if (arcClear && !laserRelease && !(lz && lz.charge > 0)) {
              out.aim[0] = m.yaw; out.aim[1] = m.pitch; B.aimKind = 'mortar'
              gunReady = false
              if (Math.abs(angDiff(predYaw(m.yaw, tl), m.yaw)) < 0.02 && Math.abs(predPitch(m.pitch, tl) - m.pitch) < 0.02) out.fire[mo.slot] = true
            }
          }
        }
      }
      // the gun fires only if the aim the torso will really have (under the final command) is inside its gate
      if (g && gunReady) {
        const ey = Math.abs(angDiff(predYaw(out.aim[0], tlg), gYaw)), ep = Math.abs(predPitch(out.aim[1], tlg) - gPitch)
        gunFire = ey <= yawGate && ep <= pitGate
      }
      if (g && gunFire) out.fire[g.slot] = true
    } else if (B.aimKind !== 'memory') {
      B.aimKind = scan()
      if (lz && (lz.charge > 0 || wasHolding)) {
        // charging with nothing to shoot: hold the charge for a returning target, give up after the force delay
        const full = lz.charge >= P.laserFullFrac * lz.full
        if (full) { if (lz.fullSince < 0) lz.fullSince = t } else lz.fullSince = -1
        laserKeep = !(full && t - lz.fullSince >= P.laserForceS) && !B.noCharge && (B.lostTarget !== null && t - B.lostTargetT < 2)
        if (B.noCharge && lz.charge >= lz.full - 0.1) laserKeep = true
      }
    }
    if (lz) {
      if (laserKeep && !laserRelease) { out.fire[lz.slot] = true; lz.heldT = t }
      else if (laserRelease) { B.counters.laserShots++; lz.fullSince = -1 }
    }
    // ---------------- lightning: nearest mech inside the cone, no lead
    if (li && !hold && li.cooldown <= P.readyCd + 0.05) {
      const need = B.killSecure ? P.lightMinEnergy : P.lightReserve
      if (me.energy >= need) {
        const half = li.cone / 2 - P.lightConeMarginDeg * Math.PI / 180
        const yawP = predYaw(out.aim[0], tl)
        const L = B.trackList
        for (let k = 0; k < L.length; k++) {
          const tr = L[k]
          if (tr.dist > li.range * P.lightRangeFrac) break
          if (!tr.listed || !tr.losOut) continue
          if (tr.npc && !(t - tr.lastDmgInT <= 3)) continue
          if (Math.abs(angDiff(yawP, tr.bearing)) <= half) { out.fire[li.slot] = true; break }
        }
      }
    }
    // ---------------- reload discipline
    if (g && g.reload <= 0 && g.ammo < g.mag) {
      if (g.ammo === 0) out.reload = true
      else {
        const quiet = t - B.lastLosInT > P.reloadQuiet
        const lowInSights = !!(B.target && B.target.losOut && B.target.hp < P.noReloadHp)
        if (g.ammo <= P.reloadAmmo && (quiet || B.hidePhase) && !lowInSights) out.reload = true
        else if (!B.target && !shootObj && t - me.lastShotT > 2 && t - B.lastLosInT > 2) out.reload = true
      }
    }
    out.aim[0] = wrapPi(out.aim[0])
    out.aim[1] = clamp(out.aim[1], me.minPitch, me.maxPitch)
  }

  return { run, predictSelf, ps }
}
