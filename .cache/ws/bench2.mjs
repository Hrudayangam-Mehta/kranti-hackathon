import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const cells = []; for (let c = 0; c < nav.n; c++) if (nav.comp[c] === nav.mainComponent) cells.push(c)
const N = 200000, S = new Float64Array(N * 4)
const B = w.bounds
for (let k = 0; k < N; k++) {
  const a = cells[(rnd() * cells.length) | 0]
  const ax = nav.cellX(a) + rnd() * 2 - 1, ay = nav.cellY(a) + rnd() * 2 - 1
  const ang = rnd() * 2 * Math.PI, len = 50 + rnd() * 150
  S[k * 4] = ax; S[k * 4 + 1] = ay; S[k * 4 + 2] = Math.min(B.maxX - 1, Math.max(B.minX + 1, ax + Math.cos(ang) * len)); S[k * 4 + 3] = Math.min(B.maxY - 1, Math.max(B.minY + 1, ay + Math.sin(ang) * len))
}
for (const strict of [true, false, true, false]) {
  let ok = 0, samples = 0
  const t = performance.now()
  for (let k = 0; k < N; k++) if (nav.walkLine(S[k * 4], S[k * 4 + 1], S[k * 4 + 2], S[k * 4 + 3], strict)) ok++
  const ms = performance.now() - t
  console.log('walkLine strict', strict, (ms * 1000 / N).toFixed(3), 'us/call', 'walkable', (ok / N).toFixed(3))
}
// how far do failing lines get on average?
let sumLen = 0
for (let k = 0; k < 20000; k++) { let lo = 0, hi = 1; const ax = S[k * 4], ay = S[k * 4 + 1], bx = S[k * 4 + 2], by = S[k * 4 + 3]; for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (nav.walkLine(ax, ay, ax + (bx - ax) * m, ay + (by - ay) * m, true)) lo = m; else hi = m } sumLen += lo * Math.hypot(bx - ax, by - ay) }
console.log('mean strictly walkable prefix', (sumLen / 20000).toFixed(1), 'm')
// findPath distribution over 3000 queries
const times = []; let ok = 0, maxExp = 0
for (let k = 0; k < 3200; k++) {
  const a = cells[(rnd() * cells.length) | 0], b = cells[(rnd() * cells.length) | 0]
  const t = performance.now(); const r = nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b)); const ms = performance.now() - t
  if (k >= 200) { times.push(ms); if (r.ok) ok++; maxExp = Math.max(maxExp, r.expanded) }
}
times.sort((x, y) => x - y)
console.log('findPath 3000 random main-component pairs: ok', ok, 'mean', (times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), 'p50', times[1500].toFixed(3), 'p90', times[2700].toFixed(3), 'p99', times[2970].toFixed(3), 'max', times[2999].toFixed(3), 'ms; max expanded', maxExp)
// short-range queries (typical tactical use: 20-80 m)
const t2 = []; let ok2 = 0
for (let k = 0; k < 3000; k++) {
  const a = cells[(rnd() * cells.length) | 0]; const ang = rnd() * 6.283, d = 20 + rnd() * 60
  const bx = nav.cellX(a) + Math.cos(ang) * d, by = nav.cellY(a) + Math.sin(ang) * d
  const t = performance.now(); const r = nav.findPath(nav.cellX(a), nav.cellY(a), bx, by); t2.push(performance.now() - t); if (r.ok) ok2++
}
t2.sort((x, y) => x - y)
console.log('findPath 3000 short queries (20-80 m, goal anywhere): ok', ok2, 'mean', (t2.reduce((s, v) => s + v, 0) / t2.length).toFixed(3), 'p50', t2[1500].toFixed(3), 'p99', t2[2970].toFixed(3), 'max', t2[2999].toFixed(3), 'ms')
// worst case: full budget burn
let tw = performance.now(); nav._search(cells[0], cells[cells.length - 1], 0, 0, 0, 25000, 0, null); console.log('25000 expansions (uniform cost) take', (performance.now() - tw).toFixed(2), 'ms')
tw = performance.now(); nav._search(cells[0], cells[cells.length - 1], 0, 0, 0, 25000, 0, null); console.log('25000 expansions (again)', (performance.now() - tw).toFixed(2), 'ms')
