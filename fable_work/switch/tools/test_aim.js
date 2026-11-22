// Brute-force checks for bot/lib/aim.js. Run: bun tools/test_aim.js
import { intercept, mortarSolve, shellImpact, closestApproach, angDiff, wrapPi, onTarget, makeRng } from '../bot/lib/aim.js'
const rng = makeRng(12345)
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } }
// 1. gun intercept: simulate the bullet and the target; they must meet.
let worst = 0
for (let k = 0; k < 20000; k++) {
  const mx = rng() * 100, my = rng() * 100, mz = rng() * 20 + 7
  const tx = mx + (rng() - 0.5) * 400, ty = my + (rng() - 0.5) * 400, tz = rng() * 30 + 4.5
  const vx = (rng() - 0.5) * 40, vy = (rng() - 0.5) * 40, vz = (rng() - 0.5) * 10
  const s = 252, off = 3
  if (Math.hypot(tx - mx, ty - my, tz - mz) < 6) continue
  const r = intercept(mx, my, mz, tx, ty, tz, vx, vy, vz, s, off)
  ok(r, 'no solution'); if (!r) continue
  const c = Math.cos(r.pitch), ux = c * Math.cos(r.yaw), uy = c * Math.sin(r.yaw), uz = Math.sin(r.pitch)
  const bx = mx + ux * (off + s * r.t), by = my + uy * (off + s * r.t), bz = mz + uz * (off + s * r.t)
  const px = tx + vx * r.t, py = ty + vy * r.t, pz = tz + vz * r.t
  const e = Math.hypot(bx - px, by - py, bz - pz); if (e > worst) worst = e
}
ok(worst < 1e-6, 'intercept error ' + worst); console.log('intercept worst error m:', worst.toExponential(2))
// 2. mortar: integrate the shell with fine steps; it must land near the (moving) target.
let wm = 0, solved = 0
for (let k = 0; k < 5000; k++) {
  const mx = 0, my = 0, mz = 9.5 + rng() * 10
  const d = 20 + rng() * 180, a = rng() * 6.28
  const tx = Math.cos(a) * d, ty = Math.sin(a) * d, tz = (rng() - 0.5) * 20
  const vx = (rng() - 0.5) * 20, vy = (rng() - 0.5) * 20
  const v = 72, g = 22, off = 3
  const r = mortarSolve(mx, my, mz, tx, ty, tz, vx, vy, v, g, off)
  if (!r) continue
  solved++
  const c = Math.cos(r.pitch)
  let x = mx + c * Math.cos(r.yaw) * off, y = my + c * Math.sin(r.yaw) * off, z = mz + Math.sin(r.pitch) * off
  let wx = c * Math.cos(r.yaw) * v, wy = c * Math.sin(r.yaw) * v, wz = Math.sin(r.pitch) * v
  const dt = 0.0005; let t = 0
  while (t < r.t) { x += wx * dt; y += wy * dt; z += wz * dt - 0.5 * g * dt * dt; wz -= g * dt; t += dt }
  const e = Math.hypot(x - (tx + vx * r.t), y - (ty + vy * r.t), z - tz); if (e > wm) wm = e
}
ok(solved > 4000 && wm < 0.6, 'mortar error ' + wm + ' solved ' + solved); console.log('mortar solved', solved, 'worst landing error m:', wm.toFixed(3))
// 3. shellImpact on flat ground matches the analytic time of flight.
{ const r = shellImpact(0, 0, 10, 30, 0, 20, 22, () => 0)
  const tt = (20 + Math.sqrt(400 + 2 * 22 * 10)) / 22
  ok(Math.abs(r.t - tt) < 0.02 && Math.abs(r.x - 30 * tt) < 0.6, 'shellImpact ' + JSON.stringify(r) + ' vs ' + tt) }
// 4. misc
ok(Math.abs(angDiff(3.1, -3.1) - (2 * Math.PI - 6.2)) < 1e-9, 'angDiff wrap')
ok(Math.abs(wrapPi(7) - (7 - 2 * Math.PI)) < 1e-9, 'wrapPi')
ok(onTarget(0, 0, 0.01, 0, 100, 2.5, 9) && !onTarget(0, 0, 0.05, 0, 100, 2.5, 9), 'onTarget')
{ const r = closestApproach(0, 0, 0, 100, 0, 0, 50, 3, 0); ok(Math.abs(r.d - 3) < 1e-9 && Math.abs(r.t - 0.5) < 1e-9, 'closestApproach') }
console.log(fails ? `FAILED ${fails}` : 'ALL OK')
process.exit(fails ? 1 : 0)
