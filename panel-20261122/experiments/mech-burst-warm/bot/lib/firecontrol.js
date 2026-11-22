// Layer 2: torso and triggers. Gun lead with latency compensation and an actual-aim gate, laser charge /
// release, lightning, mortar, reload discipline and the torso policy when there is nothing to shoot.

import { angDiff, clamp, intercept, laserFrac, mortarSolve, wrapPi } from './aim.js'

export function makeFireControl(B) {
  const P = B.P
  const ps = { x: 0, y: 0, z: 0 }                 // our predicted feet position when the shot leaves
  const sol = { ok: false, yaw: 0, pitch: 0, x: 0, y: 0, z: 0, dist: 0, t: 0, hi: false }
  const st = { scanDir: 1, scanFlipT: 0, dwellUntil: -1, dwellYaw: 0 }
  // R3: aim-point ladders as fractions of the target height (cubes included): laser from the top down; the gun keeps the
  // D8 centre-first ladder unless headAimGun (then gunLadderTop down, then the higher rungs)
  const MID = [0.5]
  const LASER_RUNGS = Array.isArray(P.aimLadder) && P.aimLadder.length ? P.aimLadder.filter((f) => f > 0 && f < 1) : MID
  const GUN_RUNGS = LASER_RUNGS.filter((f) => f <= P.gunLadderTop + 1e-9).sort((a, b) => b - a).concat(LASER_RUNGS.filter((f) => f > P.gunLadderTop + 1e-9).sort((a, b) => a - b))
  if (GUN_RUNGS.length === 0) GUN_RUNGS.push(0.5)
  const rel = { t: 0, id: -1, tl: 0, frac: 0.5, yaw: 0, pitch: 0, pyaw: 0, ppitch: 0, settled: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, n: 0 }
  const policy = B.weaponPolicy
  const cycling = () => !!policy && policy.on()
  const geometry = cycling

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
    const tL = P.ioLead === true ? Math.max(0, tl - 0.5 * P.tickS) : tl      // R6 IO1: half a tick (bullet sweeps a full tick on spawn; target taken at tick end)
    const cx = tr.x + vx * tL, cy = tr.y + vy * tL
    const zc = tr.height * zFrac + zOff
    let cz = tr.z + zc
    const off = me.radius + 0.5
    let r = intercept(sx, sy, sz, cx, cy, cz, vx, vy, 0, g.speed, off)
    if (!r) return false
    if (tr.airborne || Math.abs(vz) >= 0.5) {
      // airborne: jet or ballistic arc at the arrival time (two refinements), never below the ground
      for (let it = 0; it < 2; it++) {
        cz = airZ(tr, tL + r.t) + zc
        const r2 = intercept(sx, sy, sz, cx, cy, cz, vx, vy, 0, g.speed, off)
        if (!r2) return false
        r = r2
      }
    }
    sol.ok = true; sol.yaw = r.yaw; sol.pitch = r.pitch; sol.x = r.x; sol.y = r.y; sol.z = r.z; sol.dist = r.dist; sol.t = r.t
    return true
  }

  function muzzleClear(yaw, pitch, tx, ty, tz) {
    const me = B.me
    if (geometry() && (pitch < me.minPitch || pitch > me.maxPitch)) return false
    const w = B.world
    if (!w) return true
    const off = me.radius + 0.5, c = Math.cos(pitch)
    const mx = ps.x + c * Math.cos(yaw) * off, my = ps.y + c * Math.sin(yaw) * off, mz = ps.z + me.muzzleH + Math.sin(pitch) * off
    if (geometry() && !w.shotClear(ps.x, ps.y, ps.z + me.muzzleH, mx, my, mz)) return false
    // stop a little short of the target point so the target's own ground contact does not count
    const dx = tx - mx, dy = ty - my, dz = tz - mz, d = Math.hypot(dx, dy, dz)
    if (d < 1) return true
    const f = Math.max(0, (d - 1.0) / d)
    return w.shotClear(mx, my, mz, mx + dx * f, my + dy * f, mz + dz * f)
  }

  /** Aim the torso will have when the shot leaves: current aim slewed toward the command for `tl`. */
  function predYaw(cmdYaw, tl) { const me = B.me, rate = me.turnRate * (cycling() ? policy.turnMult() : 1); return wrapPi(me.yaw + clamp(angDiff(me.yaw, cmdYaw), -rate * tl, rate * tl)) }
  function predPitch(cmdPitch, tl) { const me = B.me, rate = me.pitchRate * (cycling() ? policy.turnMult() : 1); return me.pitch + clamp(clamp(cmdPitch, me.minPitch, me.maxPitch) - me.pitch, -rate * tl, rate * tl) }

  function scan() {
    const me = B.me, t = me.t, out = B.out
    // 1. the attacker that hurt us most in the last 3 s (never show the back)
    const at = B.topAttacker
    if (at) { out.aim[0] = Math.atan2(at.y - me.y, at.x - me.x); out.aim[1] = pitchTo(at.x, at.y, at.z + at.height * 0.5); return 'attacker' }
    if (t - B.unseenHurtT <= P.faceAttackerS) { out.aim[0] = B.unseenHurtBearing; out.aim[1] = 0; return 'bearing' }
    // R2 late game: sector sweep; the corner pre-aim, the look hint and the nearest-mech track look (with the FFA rule 8
    // courtesy offset) become wishes inside it (pass 2b: the track look is a wish too, so rule 8 keeps working)
    if (B.scanner && B.scanner.active()) {
      const pre = B.lostTarget && t - B.lostTargetT <= P.preAimS
      const nm0 = B.nearestMech
      const trk = !pre && !B.lookHint && !!nm0 && t - nm0.lastSeen < 8 && t >= st.dwellUntil && ((B.tick >> 4) & 1) === 0
      let wish = pre ? Math.atan2(B.lostY - me.y, B.lostX - me.x) : B.lookHint ? Math.atan2(B.lookY - me.y, B.lookX - me.x) : NaN
      if (trk) { wish = Math.atan2(nm0.y - me.y, nm0.x - me.x); if (ffaR() && !nm0.hostile) wish = wrapPi(wish + P.ffaCourtesyRad) }
      const y = B.scanner.look(wish)
      if (y === y) { out.aim[0] = y; out.aim[1] = pre && y === wish ? pitchTo(B.lostX, B.lostY, B.lostZ) : 0; return y === wish ? (trk ? 'track' : 'sweepwish') : 'sweep' }
    }
    // 2. the corner where the target disappeared
    if (B.lostTarget && t - B.lostTargetT <= P.preAimS) { out.aim[0] = Math.atan2(B.lostY - me.y, B.lostX - me.x); out.aim[1] = pitchTo(B.lostX, B.lostY, B.lostZ); return 'preaim' }
    // 3. a look hint from the mode (ambush corner, drop ring, loot)
    if (B.lookHint) { out.aim[0] = Math.atan2(B.lookY - me.y, B.lookX - me.x); out.aim[1] = 0; return 'hint' }
    // 4. scan: nearest remembered mech, loudest sound sector, else rotate
    const nm = B.nearestMech
    if (nm && t - nm.lastSeen < 8 && t >= st.dwellUntil && ((B.tick >> 4) & 1) === 0) {
      out.aim[0] = Math.atan2(nm.y - me.y, nm.x - me.x); out.aim[1] = 0
      if (ffaR() && !nm.hostile) out.aim[0] = wrapPi(out.aim[0] + P.ffaCourtesyRad)      // FFA rule 8: torso 0.3 rad off a calm mech
      return 'track'
    }
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

  const ffaR = () => B.env === 'FFA' && P.ffaRules === true

  function run() {
    const me = B.me, out = B.out, t = me.t, tl = P.latency
    const g = me.gun, lz = me.laser, li = me.lightning, mo = me.mortar
    const wasHolding = lz ? out.fire[lz.slot] === true : false
    predictSelf(tl)
    out.fire[0] = false; out.fire[1] = false; out.reload = false
    const p6 = B.p26on === true                         // practice profile p26 (lib/prof.js): shot target, crate shots, rungs, reload
    const adaptive = cycling()
    const exact = geometry()
    let tgt = p6 ? B.prof.fireTarget() : B.target
    const hold = B.holdFire
    B.aimKind = 'none'
    let shootObj = null
    if (p6) { B.p26.gunTgt = -1; if (!tgt && !B.shootCrate && !hold) B.shootCrate = B.prof.crateShot() }
    const blind = tgt && !tgt.listed && !tgt.phantom && t - tgt.lastSeen <= P.blindFireS
    if (tgt && !(tgt.listed || t - tgt.lastSeen < 0.35 || blind)) {
      // remembered only: pre-aim where it should be, never shoot
      out.aim[0] = Math.atan2(tgt.y - me.y, tgt.x - me.x); out.aim[1] = pitchTo(tgt.x, tgt.y, tgt.z + tgt.height * 0.5)
      B.aimKind = 'memory'
      tgt = null
    } else if (!tgt && B.shootCrate && !hold && (!B.steal || B.steal.crateFireOk())) shootObj = B.shootCrate

    let laserRelease = false, laserKeep = false, offAxisYaw = NaN
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
      let gunOk = false, gunFire = false, gunReady = false, gYaw = 0, gPitch = 0, gFlight = Infinity, yawGate = 0, pitGate = 0
      const ioR = P.ioReload === true && !!g && g.reload > 0 && g.reload <= P.readyCd + 1e-6      // R6 IO4: the reload ends inside this window
      const tlg = g ? gunLatency(ioR ? Math.max(g.cooldown, g.reload) : g.cooldown) : tl
      if (g) predictSelf(tlg)
      const headG = !!tgt && P.headAimGun === true
      if (g && gunSolve(o, tlg, headG ? GUN_RUNGS[0] : 0.5)) {
        gunOk = true
        let clear = muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)
        let hFrac = 0.5
        if (headG) {
          // R3 gun ladder (preset R3=gun): first rung with a clear line; the pitch gate keeps the room above / below it
          hFrac = Math.min(GUN_RUNGS[0], 1 - GUN_RUNGS[0])
          if (!clear) {
            const y0 = sol.yaw, p0 = sol.pitch, d0 = sol.dist, x0 = sol.x, yy0 = sol.y, z0 = sol.z, t0 = sol.t
            for (let k = 1; k < GUN_RUNGS.length && !clear; k++) {
              const f = GUN_RUNGS[k]
              if (gunSolve(o, tlg, f) && muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)) { clear = true; hFrac = Math.min(f, 1 - f) }
            }
            if (!clear) { sol.ok = true; sol.yaw = y0; sol.pitch = p0; sol.dist = d0; sol.x = x0; sol.y = yy0; sol.z = z0; sol.t = t0 }
          }
          if (P.calGun && P.aimCalOn && B.aimcal) { sol.yaw = wrapPi(sol.yaw - B.aimcal.yaw()); sol.pitch -= B.aimcal.pitch() }
        } else if (!clear && tgt) {
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
        let flightOk = sol.t <= P.gunFlightMax || steady
        // FFA rule 6: the steady waiver reaches 0.8 s of flight; a sub-second reverser only under 0.3 s (laser otherwise)
        if (tgt && ffaR() && !B.pressureActive) flightOk = B.ffa.reverser(tgt) ? sol.t <= P.ffaRevFlight : sol.t <= P.gunFlightMax || (steady && sol.t <= P.ffaSteadyFlight)
        if (!flightOk) B.counters.flightGated = (B.counters.flightGated || 0) + 1
        gunReady = g.cooldown <= P.readyCd && ((g.ammo > 0 && g.reload <= 0) || ioR) && clear && !hold && sol.dist <= g.range * P.gunRangeFrac && flightOk
        if (gunReady) {
          const R = Math.max(1, sol.dist)
          gYaw = sol.yaw; gPitch = sol.pitch; gFlight = sol.t
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
        // R3: aim at the highest clear rung (headAimOn); with aimCalOn lead with the calibrated latency and command
        // minus the calibrated aim bias. Both off: the pass 2a centre aim, computed exactly as before.
        const AC = P.aimCalOn === true && B.aimcal ? B.aimcal : null
        const tlz = P.ioLaserLat === true ? P.tickS : tl                  // R6 IO2
        const ltl = AC ? tlz + AC.lat() : tlz
        if (ltl !== tl) predictSelf(ltl)
        const lx = tgt.x + tgt.vx * ltl, ly = tgt.y + tgt.vy * ltl, zAir = Math.abs(tgt.vz) >= 0.5 ? tgt.vz * ltl : 0
        const sx = ps.x, sy = ps.y, sz = ps.z + me.muzzleH
        const ldx = lx - sx, ldy = ly - sy, lh = Math.hypot(ldx, ldy) || 1
        const rungs = p6 ? B.prof.rungs : P.headAimOn === true ? LASER_RUNGS : MID
        let frac = rungs[0], lzc = tgt.z + tgt.height * frac + zAir
        const lyaw = Math.atan2(ldy, ldx)
        const firstPitch = Math.atan2(lzc - sz, lh)
        let lpitch = exact ? firstPitch : clamp(firstPitch, me.minPitch, me.maxPitch)
        let lR = Math.hypot(lh, lzc - sz)
        const inRange = exact ? rungs.some((f) => {
          const dz = tgt.z + tgt.height * f + zAir - sz, p = Math.atan2(dz, lh)
          return p >= me.minPitch && p <= me.maxPitch && Math.hypot(lh, dz) <= lz.range - 5
        }) : lR <= (p6 ? lz.range - 5 : lz.range * P.laserRangeFrac)
        const charge = lz.charge
        if (charge > 0 || wasHolding) {
          let clear = inRange && (!exact || (lpitch >= me.minPitch && lpitch <= me.maxPitch && lR <= lz.range - 5)) && muzzleClear(lyaw, lpitch, lx, ly, lzc)
          for (let k = 1; k < rungs.length && inRange && !clear; k++) {
            const f = rungs[k], z = tgt.z + tgt.height * f + zAir, raw = Math.atan2(z - sz, lh)
            const pt = exact ? raw : clamp(raw, me.minPitch, me.maxPitch), range = Math.hypot(lh, z - sz)
            if ((!exact || (pt >= me.minPitch && pt <= me.maxPitch && range <= lz.range - 5)) && muzzleClear(lyaw, pt, lx, ly, z)) { clear = true; frac = f; lzc = z; lpitch = pt; lR = range }
          }
          const cyaw = AC ? wrapPi(lyaw - AC.yaw()) : lyaw, cpitch = AC ? clamp(lpitch - AC.pitch(), me.minPitch, me.maxPitch) : lpitch
          const full = charge >= P.laserFullFrac * lz.full
          if (full) { if (lz.fullSince < 0) lz.fullSince = t } else lz.fullSince = -1
          const mult = me.dmgMult * (tgt.rearOn ? me.rearMult : 1) * (tgt.hasMortar ? 1 + lz.cookoff : 1)
          const killNow = charge >= (lz.st.min_charge || 0.15) && laserFrac(charge, lz.full, lz.minFrac) * lz.damage * mult >= tgt.hp
          const takeAim = adaptive ? policy.laserAim(tgt, { yaw: cyaw, pitch: cpitch, clear, kill: killNow }, {
            ready: gunReady, aligned: gunReady && Math.abs(angDiff(predYaw(gYaw, tlg), gYaw)) <= yawGate && Math.abs(predPitch(gPitch, tlg) - gPitch) <= pitGate,
            delay: tlg, flight: gFlight,
          }) : charge >= P.laserTakeFrac * lz.full - 1e-6
          const cy = takeAim ? cyaw : out.aim[0], cp = takeAim ? cpitch : out.aim[1]
          const ey = Math.abs(angDiff(predYaw(cy, tlz), cyaw)), ep = predPitch(cp, tlz) - cpitch
          // pitch gate: the room above / below the chosen rung (at the 0.5 rung the pass 2a symmetric gate)
          const gate = ey <= Math.atan2(tgt.radius * P.laserGateK, lR) && ep <= Math.atan2(tgt.height * (1 - frac) * P.laserGateK, lR) && -ep <= Math.atan2(tgt.height * frac * P.laserGateK, lR)
          if (takeAim || (!adaptive && killNow)) { out.aim[0] = cyaw; out.aim[1] = cpitch; B.aimKind = 'laser' }
          if (AC) { rel.t = t; rel.id = tgt.id; rel.tl = ltl; rel.frac = frac; rel.yaw = lyaw; rel.pitch = lpitch; rel.x = tgt.x; rel.y = tgt.y; rel.z = tgt.z; rel.vx = tgt.vx; rel.vy = tgt.vy }
          if (gate && clear && (full || killNow)) laserRelease = true
          else if (full && t - lz.fullSince >= P.laserForceS) laserRelease = true
          else if (B.noCharge && charge < lz.full - 0.1) laserRelease = true      // the legs need full speed now
          else laserKeep = true
          if (hold && !killNow && !full && !B.noCharge) { laserKeep = true; laserRelease = false }
          if (!takeAim && !killNow && (!adaptive || !gunReady) && !tgt.npc && tgt.dist > P.ffaOffAxisMinD) offAxisYaw = lyaw
        } else if (!hold && !B.noCharge && lz.cooldown <= 0.11 && inRange && !(p6 && B.prof.laserVeto(tgt))) {
          const expected = tgt.losOut || t - tgt.losOutT <= P.laserExpectS || B.peekSoon
          if (expected) { laserKeep = true; if ((!adaptive || !gunReady) && !tgt.npc && tgt.dist > P.ffaOffAxisMinD) offAxisYaw = lyaw }
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
              const tlm = P.ioSlewGate === true ? gunLatency(mo.cooldown) : tl          // R6 IO3
              if (Math.abs(angDiff(predYaw(m.yaw, tlm), m.yaw)) < 0.02 && Math.abs(predPitch(m.pitch, tlm) - m.pitch) < 0.02) out.fire[mo.slot] = true
            }
          }
        }
      }
      if (adaptive && li && B.aimKind !== 'mortar') {
        predictSelf(gunLatency(li.cooldown))
        const hint = policy.interruptAim(tgt, laserRelease, { x: ps.x, y: ps.y, z: ps.z + me.muzzleH })
        if (hint) { out.aim[0] = hint.yaw; out.aim[1] = hint.pitch; B.aimKind = 'short'; offAxisYaw = NaN }
      }
      // the gun fires only if the aim the torso will really have (under the final command) is inside its gate
      if (g && gunReady) {
        const ey = Math.abs(angDiff(predYaw(out.aim[0], tlg), gYaw)), ep = Math.abs(predPitch(out.aim[1], tlg) - gPitch)
        gunFire = ey <= yawGate && ep <= pitGate
      }
      // FFA rule 2: charge 0.4 rad off the target and swing on in the release decision (80% charge)
      if (ffaR() && laserKeep && !laserRelease && offAxisYaw === offAxisYaw && B.aimKind !== 'mortar') {
        const side = angDiff(offAxisYaw, me.yaw) >= 0 ? 1 : -1
        out.aim[0] = wrapPi(offAxisYaw + side * P.ffaOffAxis); B.aimKind = 'offaxis'; gunFire = false
      }
      // FFA rule 8: a held first shot keeps the torso 0.3 rad off a mech that has not shot us
      if (ffaR() && hold && tgt && !tgt.npc && !tgt.hostile && B.aimKind !== 'offaxis') out.aim[0] = wrapPi(out.aim[0] + P.ffaCourtesyRad)
      if (g && gunFire) { out.fire[g.slot] = true; if (p6 && tgt) B.p26.gunTgt = tgt.id }
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
      else if (laserRelease) {
        B.counters.laserShots++; lz.fullSince = -1
        if (B.aimcal && P.aimCalOn === true && tgt && rel.t === t && rel.id === tgt.id) {
          // R3 calibration record: the torso aim at release is the command when the torso has settled on it
          rel.pyaw = out.aim[0]; rel.ppitch = out.aim[1]
          rel.settled = Math.abs(angDiff(me.yaw, out.aim[0])) < 0.012 && Math.abs(me.pitch - out.aim[1]) < 0.012
          B.aimcal.onRelease({ ...rel })
        }
      }
    }
    // ---------------- lightning: nearest mech inside the cone, no lead
    if (li && !hold && li.cooldown <= P.readyCd + 0.05) {
      if (adaptive) {
        const delay = gunLatency(li.cooldown)
        predictSelf(delay)
        const yaw = predYaw(out.aim[0], delay), origin = { x: ps.x, y: ps.y, z: ps.z + me.muzzleH }
        const first = policy.nearestLightning(yaw, origin)
        if (policy.lightningAligned(first, yaw, origin) && policy.energyOk() && (first.crate ? !!shootObj && first.object.id === shootObj.id : policy.legal(first.object, tgt))) out.fire[li.slot] = true
      } else {
        const need = B.killSecure ? P.lightMinEnergy : P.lightReserve
        if (me.energy >= need) {
          const half = p6 ? li.cone / 2 * P.pfLightConeK : li.cone / 2 - P.lightConeMarginDeg * Math.PI / 180
          const lRange = p6 ? li.range - 1 : li.range * P.lightRangeFrac
          const yawP = predYaw(out.aim[0], P.ioSlewGate === true ? gunLatency(li.cooldown) : tl)      // R6 IO3
          const L = B.trackList
          for (let k = 0; k < L.length; k++) {
            const tr = L[k]
            if (tr.dist > lRange) break
            if (!tr.listed || !tr.losOut) continue
            if (tr.npc && !(t - tr.lastDmgInT <= 3) && !(p6 && me.energy > P.pfLightEnergyNpc * me.maxEnergy)) continue
            if (p6 && !tr.npc && !B.prof.isLegal(tr)) continue
            if (Math.abs(angDiff(yawP, tr.bearing)) <= half) { out.fire[li.slot] = true; break }
          }
        }
      }
    }
    // ---------------- reload discipline
    if (g && g.reload <= 0 && g.ammo < g.mag) {
      if (p6) { if (B.prof.wantReload(shootObj)) out.reload = true }
      else if (g.ammo === 0) out.reload = true
      else {
        const quiet = t - B.lastLosInT > P.reloadQuiet
        const lowInSights = !!(B.target && B.target.losOut && B.target.hp < P.noReloadHp)
        if (g.ammo <= P.reloadAmmo && (quiet || B.hidePhase) && !lowInSights) out.reload = true
        else if (!B.target && !shootObj && t - me.lastShotT > 2 && t - B.lastLosInT > 2) out.reload = true
        else if (B.h50Pulse && g.ammo < P.h50MagMin && !lowInSights) out.reload = true      // R4a: the pulse comes back loaded
      }
    }
    out.aim[0] = wrapPi(out.aim[0])
    out.aim[1] = clamp(out.aim[1], me.minPitch, me.maxPitch)
  }

  return { run, predictSelf, ps }
}
