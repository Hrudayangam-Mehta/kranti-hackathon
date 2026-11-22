// Panel R2: map statistics for the placement memo. Run: node map_stats.js  (reads P/kit/arena, uses P/bot/lib/world.js)
import { World } from '../../bot/lib/world.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const HERE = dirname(fileURLToPath(import.meta.url)), P = join(HERE, '..', '..')
const W = World.loadSync(join(P, 'kit', 'arena'))
let seed = 12345
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const C0 = [41.3, -72.8], R0 = 560
const b = W.bounds
function groundPoint(cx, cy, R) {           // random point on open ground (not on/in a prism) within R of (cx,cy)
  for (let k = 0; k < 500; k++) {
    const a = rnd() * 2 * Math.PI, r = R * Math.sqrt(rnd())
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
    if (x < b.minX + 5 || x > b.maxX - 5 || y < b.minY + 5 || y > b.maxY - 5) continue
    const g = W.ground(x, y)
    if (W.surfaceZ(x, y) > g + 1.2) continue
    if (W.bodyBlocked(x, y, g, 2.5, 9)) continue
    return [x, y, g]
  }
  return null
}
// 1. line of fire and sight between two ground mechs vs distance
console.log('== P(line of fire) between two random ground mechs, by distance ==')
const bands = [[10, 30], [30, 45], [45, 60], [60, 80], [80, 100], [100, 130], [130, 160], [160, 200], [200, 230], [230, 320]]
const los = {}
for (const [lo, hi] of bands) {
  let n = 0, fire = 0, see = 0
  for (let k = 0; k < 6000; k++) {
    const A = groundPoint(C0[0], C0[1], 380); if (!A) continue
    const d = lo + rnd() * (hi - lo), a = rnd() * 2 * Math.PI
    const x = A[0] + d * Math.cos(a), y = A[1] + d * Math.sin(a)
    if (x < b.minX + 5 || x > b.maxX - 5 || y < b.minY + 5 || y > b.maxY - 5) continue
    const g = W.ground(x, y)
    if (W.surfaceZ(x, y) > g + 1.2 || W.bodyBlocked(x, y, g, 2.5, 9)) continue
    n++
    if (W.shotClear(A[0], A[1], A[2] + 7, x, y, g + 4.5)) fire++
    if (W.canSee(A[0], A[1], A[2] + 8, x, y, g + 4.5) || W.canSee(A[0], A[1], A[2] + 8, x, y, g + 9)) see++
  }
  los[lo] = fire / n
  console.log(`${lo}-${hi} m: n=${n} fire ${(fire / n).toFixed(2)} see ${(see / n).toFixed(2)}`)
}
// 2. hide availability: B is under fire from A at 60-140 m; is there a ground point within r of B with no line of fire from A?
console.log('\n== cover within r of a mech under fire (one shooter at 60-140 m) ==')
for (const r of [8, 15, 25, 40]) {
  let n = 0, ok = 0
  for (let k = 0; k < 3000; k++) {
    const A = groundPoint(C0[0], C0[1], 380); if (!A) continue
    const d = 60 + rnd() * 80, a = rnd() * 2 * Math.PI
    const x = A[0] + d * Math.cos(a), y = A[1] + d * Math.sin(a)
    if (x < b.minX + 5 || x > b.maxX - 5 || y < b.minY + 5 || y > b.maxY - 5) continue
    const g = W.ground(x, y)
    if (W.surfaceZ(x, y) > g + 1.2 || W.bodyBlocked(x, y, g, 2.5, 9)) continue
    if (!W.shotClear(A[0], A[1], A[2] + 7, x, y, g + 4.5)) continue
    n++
    let found = false
    for (let q = 0; q < 48 && !found; q++) {
      const aa = rnd() * 2 * Math.PI, rr = r * Math.sqrt(rnd())
      const hx = x + rr * Math.cos(aa), hy = y + rr * Math.sin(aa), hg = W.ground(hx, hy)
      if (W.surfaceZ(hx, hy) > hg + 1.2 || W.bodyBlocked(hx, hy, hg, 2.5, 9)) continue
      if (!W.shotClear(A[0], A[1], A[2] + 7, hx, hy, hg + 4.5) && !W.shotClear(A[0], A[1], A[2] + 7, hx, hy, hg + 8.5)) found = true
    }
    if (found) ok++
  }
  console.log(`r=${r} m: ${(ok / n).toFixed(2)} (n=${n})`)
}
// 3. roofs
console.log('\n== roofs (building/stadium prisms): height above local ground ==')
const roofs = []
for (const p of W.prisms) {
  if (p.kind === 'bridge') continue
  const cx = (p.minX + p.maxX) / 2, cy = (p.minY + p.maxY) / 2
  const h = p.top - W.ground(cx, cy)
  roofs.push({ p, h, cx, cy, w: Math.min(p.maxX - p.minX, p.maxY - p.minY) })
}
const cls = [[0, 6], [6, 15], [15, 25], [25, 45], [45, 60], [60, 999]]
for (const [lo, hi] of cls) {
  const rs = roofs.filter(r => r.h >= lo && r.h < hi)
  console.log(`${lo}-${hi} m: ${rs.length} prisms, median bbox min side ${rs.length ? rs.map(r => r.w).sort((a, b) => a - b)[rs.length >> 1].toFixed(0) : '-'} m`)
}
// roof height at a point: surfaceZ - ground
const roofH = (x, y) => W.surfaceZ(x, y) - W.ground(x, y)
// area fractions inside the start circle
{
  let n = 0; const c = [0, 0, 0, 0]
  for (let k = 0; k < 200000; k++) {
    const a = rnd() * 2 * Math.PI, r = 380 * Math.sqrt(rnd()), x = C0[0] + r * Math.cos(a), y = C0[1] + r * Math.sin(a)
    if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue
    n++; const h = roofH(x, y)
    if (h > 1.2) c[0]++; if (h >= 15 && h <= 58) c[1]++; if (h >= 20 && h <= 58) c[2]++; if (h > 58) c[3]++
  }
  console.log(`area within 380 m of the start centre: any roof ${(c[0] / n).toFixed(3)}, roof 15-58 m ${(c[1] / n).toFixed(3)}, 20-58 m ${(c[2] / n).toFixed(3)}, >58 m ${(c[3] / n).toFixed(3)}`)
}
// 4. zone sequences: where do the late circles land relative to tall roofs?
console.log('\n== simulated zone sequences (next centre uniform, next circle inside current) ==')
const radii = [560, 380, 240, 140, 70, 25, 0]
function inBounds(x, y) { return x > b.minX + 30 && x < b.maxX - 30 && y > b.minY + 30 && y < b.maxY - 30 }
let N = 0; const cnt = { on15: 0, on20: 0, near25_15: 0, near25_20: 0, in70_20: 0, onAny: 0 }
for (let it = 0; it < 4000; it++) {
  let cx = C0[0], cy = C0[1]; const cs = []
  for (let k = 1; k < radii.length; k++) {
    const dmax = radii[k - 1] - radii[k]
    for (let tries = 0; tries < 200; tries++) {
      const a = rnd() * 2 * Math.PI, r = dmax * Math.sqrt(rnd())
      const nx = cx + r * Math.cos(a), ny = cy + r * Math.sin(a)
      if (inBounds(nx, ny) || tries === 199) { cx = nx; cy = ny; break }
    }
    cs.push([cx, cy])
  }
  const f = cs[5], c25 = cs[4], c70 = cs[3]      // final point, centre of the 25 m circle, centre of the 70 m circle
  N++
  const h = roofH(f[0], f[1])
  if (h > 1.2) cnt.onAny++
  if (h >= 15 && h <= 58) cnt.on15++
  if (h >= 20 && h <= 58) cnt.on20++
  let n15 = false, n20 = false, m20 = false
  for (let q = 0; q < 150; q++) {
    const a = rnd() * 2 * Math.PI, r = 25 * Math.sqrt(rnd()), hh = roofH(c25[0] + r * Math.cos(a), c25[1] + r * Math.sin(a))
    if (hh >= 15 && hh <= 58) n15 = true; if (hh >= 20 && hh <= 58) n20 = true
    const r2 = 70 * Math.sqrt(rnd()), h2 = roofH(c70[0] + r2 * Math.cos(a), c70[1] + r2 * Math.sin(a))
    if (h2 >= 20 && h2 <= 58) m20 = true
  }
  if (n15) cnt.near25_15++; if (n20) cnt.near25_20++; if (m20) cnt.in70_20++
}
for (const k in cnt) console.log(k, (cnt[k] / N).toFixed(3))
// 5. exposure of a mech standing on a tall roof (>=20 m, set back s metres from the nearest edge) to ground shooters
console.log('\n== exposure of a mech on a 20-58 m roof to ground mechs (line of fire to its centre or head) ==')
const tall = roofs.filter(r => r.h >= 20 && r.h <= 58)
for (const D of [40, 80, 120, 180]) {
  let n = 0, hit = 0, see = 0
  for (let k = 0; k < 20000 && n < 3000; k++) {
    const r = tall[(rnd() * tall.length) | 0]
    const x = r.p.minX + rnd() * (r.p.maxX - r.p.minX), y = r.p.minY + rnd() * (r.p.maxY - r.p.minY)
    const z = W.surfaceZ(x, y); if (Math.abs(z - r.p.top) > 0.01) continue
    // require >= 6 m from the roof edge: all 8 points at 6 m are still on this roof
    let inner = true
    for (let q = 0; q < 8 && inner; q++) { const a = q * Math.PI / 4; if (Math.abs(W.surfaceZ(x + 6 * Math.cos(a), y + 6 * Math.sin(a)) - z) > 0.5) inner = false }
    if (!inner) continue
    const a = rnd() * 2 * Math.PI, gx = x + D * Math.cos(a), gy = y + D * Math.sin(a)
    if (!inBounds(gx, gy)) continue
    const g = W.ground(gx, gy); if (W.surfaceZ(gx, gy) > g + 1.2) continue
    n++
    if (W.shotClear(gx, gy, g + 7, x, y, z + 4.5) || W.shotClear(gx, gy, g + 7, x, y, z + 8.5)) hit++
    if (W.canSee(gx, gy, g + 8, x, y, z + 9) || W.canSee(gx, gy, g + 8, x, y, z + 4.5)) see++
  }
  console.log(`ground shooter at ${D} m: line of fire ${(hit / n).toFixed(2)}, sees ${(see / n).toFixed(2)} (n=${n}; mech >= 6 m from the roof edge)`)
}
console.log('tall roofs (20-58 m) with an interior >= 6 m from every edge exist on', new Set(tall.map(r => r.p)).size, 'prisms')
