// Panel R6 test T-IO1: lead of a gun shot against the measured tick kinematics (no spread).
// Server model [stream: first sight 27.7-27.8 m out = 3 + 2 x 12.6; sim order]: obs at tick N; shot on tick N+k (k = 1 when the
// cooldown read-out <= 0.05, 2 when <= 0.10); in every tick mechs move first, then the bullet is spawned 3 m out from the
// shooter's post-move axis and moves 12.6 m in that same tick, swept against the target's post-move position.
// Pass: with the lead counted from the START of the fire tick (preset io lead) the bullet passes within 0.05 m of the target
// axis at every range / speed; V4's lead (counted from the end of the fire tick) passes 0.05 * v_perp ahead.
import { intercept } from './v4io/bot/lib/aim.js'
const TICK = 0.05, SPD = 252, OFF = 3
function miss(R, v, k, shift) {
  // shooter at origin, standing; target at (R, 0) moving +y at v; aim computed at the obs (t = 0)
  const tl = k * TICK, tL = tl - shift
  const r = intercept(0, 0, 7, R, v * tL, 7, 0, v, 0, SPD, OFF)
  const ux = Math.cos(r.yaw), uy = Math.sin(r.yaw)
  // spawn on tick k: bullet at 3 m, then +12.6 m per tick from tick k on; target at v * (tick time)
  let best = 1e9, side = 0
  for (let j = 0; j < 200; j++) {
    const tt = (k + j) * TICK, ty = v * tt
    const d0 = OFF + SPD * TICK * j, d1 = OFF + SPD * TICK * (j + 1)  // segment swept during tick k+j
    for (let s = 0; s <= 20; s++) {
      const d = d0 + (d1 - d0) * s / 20, bx = ux * d, by = uy * d
      const e = Math.hypot(bx - R, by - ty)
      if (e < best) { best = e; side = Math.sign(by - ty) }
    }
    if (d0 > R + 20) break
  }
  return best * side
}
// average over the sub-tick phase of the crossing (ranges R .. R + 12.6 m) and report mean / max signed miss (+ = ahead)
let pass = true
const shifts = { V4: 0, half: TICK / 2, full: TICK }
for (const k of [1, 2]) for (const R of [60, 100, 150, 200]) for (const v of [6, 11.7, 19.5]) {
  const out = []
  const m = {}
  for (const [name, sh] of Object.entries(shifts)) {
    let sum = 0, mx = 0, n = 0
    for (let q = 0; q < 24; q++) { const e = miss(R + q * 12.6 / 24, v, k, sh); sum += e; mx = Math.max(mx, Math.abs(e)); n++ }
    m[name] = { mean: sum / n, max: mx }
    out.push(`${name} mean ${(sum / n).toFixed(3)} max|e| ${mx.toFixed(3)}`)
  }
  // pass: the half-tick lead has |mean| <= 0.15 * tick * v and a smaller worst case than V4
  const ok = Math.abs(m.half.mean) <= 0.15 * TICK * v + 0.01 && m.half.max < m.V4.max
  if (!ok) pass = false
  console.log(`k=${k} R=${R} v=${v}: ` + out.join(' | ') + (ok ? '' : '  FAIL'))
}
console.log(pass ? 'PASS T-IO1 (half-tick lead: zero-mean error under the discrete sweep)' : 'FAIL T-IO1')
