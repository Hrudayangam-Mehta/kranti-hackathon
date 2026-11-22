// Ray cost on this box (single thread): the unit every start-up and per-tick budget below is expressed in.
import { loadWorld, loadNav } from './common.js'
const w = loadWorld()
const t0 = performance.now(); const nav = loadNav(w); const tNav = performance.now() - t0
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
const b = w.bounds
const N = 400000
const pts = new Float64Array(N * 6)
for (let i = 0; i < N; i++) {
  let c; do { c = (rnd() * nav.n) | 0 } while (!nav.pass[c])
  const x = nav.cellX(c), y = nav.cellY(c), a = rnd() * 6.2832, d = 30 + rnd() * 200
  pts[i * 6] = x; pts[i * 6 + 1] = y; pts[i * 6 + 2] = w.ground(x, y) + 7
  const bx = Math.min(b.maxX - 1, Math.max(b.minX + 1, x + Math.cos(a) * d)), by = Math.min(b.maxY - 1, Math.max(b.minY + 1, y + Math.sin(a) * d))
  pts[i * 6 + 3] = bx; pts[i * 6 + 4] = by; pts[i * 6 + 5] = w.ground(bx, by) + 4.5
}
for (const [name, fn] of [['rayShot', (i) => w.rayShot(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5])], ['canSee', (i) => w.canSee(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]) ? 1 : 0]]) {
  let acc = 0
  for (let i = 0; i < 20000; i++) acc += fn(i * 6)   // warm
  const t1 = performance.now()
  for (let i = 0; i < N; i++) acc += fn(i * 6)
  const dt = performance.now() - t1
  console.log(`${name}: ${(dt * 1000 / N).toFixed(2)} us per ray (${N} rays 30-230 m, ${dt.toFixed(0)} ms) acc=${acc.toFixed(0)}`)
}
console.log(`nav build ${tNav.toFixed(0)} ms; grid ${nav.nx} x ${nav.ny}; passable cells ${nav.pass.reduce((a, v) => a + v, 0)}`)
