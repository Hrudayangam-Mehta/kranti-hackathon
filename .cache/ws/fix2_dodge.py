import re,sys
p=sys.argv[1]; s=open(p).read()
start=s.index('  // ------------------------------------------------------------------ bullet-aware dodge (D4)')
end=s.index('  function blend(dx, dy) {')
new='''  // ------------------------------------------------------------------ bullet-aware dodge (D4)
  /**
   * Closest horizontal approach (height-checked) of bullet b to us in the next dodgeHorizon s when we accelerate
   * from our current velocity toward (tvx, tvy) at ground_accel (protocol: velocity changes take time).
   */
  function bulletMiss(b, tvx, tvy) {
    const me = B.me, dt = 0.05, dv = me.accel * dt, age = me.t - b.t
    let rx = b.x + b.vx * age - me.x, ry = b.y + b.vy * age - me.y, s = 0, vx = me.vx, vy = me.vy, best = Infinity
    const bz = b.z + b.vz * age
    for (let k = 0; k * dt < P.dodgeHorizon - 1e-9; k++) {
      const ex = tvx - vx, ey = tvy - vy, e = Math.hypot(ex, ey)
      const nx = e <= dv ? tvx : vx + ex / e * dv, ny = e <= dv ? tvy : vy + ey / e * dv
      const rvx = b.vx - (vx + nx) / 2, rvy = b.vy - (vy + ny) / 2, vv = rvx * rvx + rvy * rvy
      const tc = vv > 0 ? clamp(-(rx * rvx + ry * rvy) / vv, 0, dt) : 0
      const zc = bz + b.vz * (s + tc)
      if (zc >= me.z - 1 && zc <= me.z + me.height + 1) best = Math.min(best, Math.hypot(rx + rvx * tc, ry + rvy * tc))
      rx += rvx * dt; ry += rvy * dt; s += dt; vx = nx; vy = ny
    }
    return best
  }
  const dodgeSet = []
  function worstMiss(tvx, tvy) {
    let m = Infinity
    for (let k = 0; k < dodgeSet.length; k++) m = Math.min(m, bulletMiss(dodgeSet[k], tvx, tvy))
    return m
  }
  /**
   * For every visible enemy gun bullet whose closest approach to our planned motion in the next 0.9 s is under
   * radius + 1.2 m: sidestep perpendicular to its path, choosing the walkable side (inside the zone) with the
   * larger predicted miss (the shooter led our planned motion, so that side is often the reverse of it), or
   * brake / reverse when both sides are blocked; blended with the tactical command at weight 0.9.
   * Returns true when it changed the command.
   */
  function bulletDodge() {
    const me = B.me, cmd = B.cmd, t = me.t
    if (!me.grounded || B.bullets.size === 0) { if (t < bul.until) { blend(bul.mx, bul.my); return true } return false }
    const spd = (cmd.boost && me.energy > 1 ? me.boostSpeed : me.walk) * (me.laser && me.laser.charge > 0 ? me.chargeMoveMult : 1)
    const vx0 = cmd.mx * spd, vy0 = cmd.my * spd
    const rr = me.radius + P.dodgeMargin, reach = P.dodgeHorizon + 0.3
    let worst = null, worstT = Infinity
    dodgeSet.length = 0
    for (const b of B.bullets.values()) {
      if (b.npc) continue
      const age = t - b.t, rx = b.x + b.vx * age - me.x, ry = b.y + b.vy * age - me.y
      const bv2 = b.vx * b.vx + b.vy * b.vy
      if (bv2 < 1) continue
      const ta = -(rx * b.vx + ry * b.vy) / bv2
      if (ta < -0.05 || ta > reach) continue
      dodgeSet.push(b)
      if (bulletMiss(b, vx0, vy0) >= rr) continue
      if (ta < worstT) { worstT = ta; worst = b }
    }
    if (!worst) { if (t < bul.until) { blend(bul.mx, bul.my); return true } return false }
    const bl = Math.hypot(worst.vx, worst.vy) || 1, px = -worst.vy / bl, py = worst.vx / bl
    const w = P.dodgeWeight
    let dx = 0, dy = 0, best = worstMiss(vx0, vy0)
    for (const sg of [1, -1]) {
      const sx = px * sg, sy = py * sg
      if (!walkable(sx, sy, P.dodgeProbe)) continue
      let bx = cmd.mx * (1 - w) + sx * w, by = cmd.my * (1 - w) + sy * w
      const l = Math.hypot(bx, by) || 1
      const m = worstMiss(bx / l * spd, by / l * spd)
      if (m > best + 0.05) { best = m; dx = sx; dy = sy }
    }
    if (dx === 0 && dy === 0) {
      // both sides blocked or no better: brake, or reverse the planned motion
      const l = Math.hypot(vx0, vy0)
      if (l > 0.5 && walkable(-vx0 / l, -vy0 / l, P.dodgeProbe) && worstMiss(-vx0, -vy0) > best + 0.05) { dx = -vx0 / l; dy = -vy0 / l }
      else if (l > 0.5 && worstMiss(0, 0) > best + 0.05) { cmd.mx = 0; cmd.my = 0; B.dodging = true; bul.mx = 0; bul.my = 0; bul.until = t + P.dodgeHold; B.counters.bulletDodges = (B.counters.bulletDodges || 0) + 1; return true }
      else return false
    }
    bul.mx = dx; bul.my = dy; bul.until = t + P.dodgeHold
    blend(dx, dy)
    B.counters.bulletDodges = (B.counters.bulletDodges || 0) + 1
    return true
  }
'''
s=s[:start]+new+s[end:]
s=s.replace('''  function blend(dx, dy) {
    const cmd = B.cmd, w = P.dodgeWeight
    let mx''','''  function blend(dx, dy) {
    const cmd = B.cmd, w = P.dodgeWeight
    if (dx === 0 && dy === 0) { cmd.mx *= 1 - w; cmd.my *= 1 - w; B.dodging = true; return }
    let mx''')
open(p,'w').write(s)
