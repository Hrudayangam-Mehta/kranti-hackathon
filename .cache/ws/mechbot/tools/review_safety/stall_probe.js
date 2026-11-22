// Is a slow call real work or a stall (GC / JIT threads sharing the one CPU)? Repeat identical queries and
// look at the spread; also run a pure arithmetic spin loop in 0.2 ms slices and record gaps.
import { realHello, loadMap, pct } from './common.js'
const hello = realHello()
const { world, nav } = await loadMap(hello)
const a = nav.nearestPassable(0, 0, 80)
const goals = [[400, 80], [-380, 200], [300, -250], [-277, 131]]
for (const g of goals) {
  const ts = []
  let r
  for (let k = 0; k < 400; k++) { const t0 = performance.now(); r = nav.findPath(a.x, a.y, g[0], g[1], { maxExpand: 4000 }); ts.push(performance.now() - t0) }
  console.log(`findPath (0,0)->(${g}) x400: min ${Math.min(...ts).toFixed(2)} p50 ${pct(ts, 0.5).toFixed(2)} p99 ${pct(ts, 0.99).toFixed(2)} max ${Math.max(...ts).toFixed(2)} ms (first ${ts[0].toFixed(2)}) ok=${r.ok} expanded=${r.expanded} pts=${r.pts.length}`)
}
// spin: gaps in a tight loop that allocates nothing
{
  const gaps = []; let last = performance.now(); const end = last + 3000; let x = 0
  while (last < end) { for (let i = 0; i < 2000; i++) x += Math.sqrt(i); const t = performance.now(); if (t - last > 2) gaps.push(t - last); last = t }
  console.log(`spin 3 s, no allocation: gaps > 2 ms: ${gaps.length} ${gaps.map((g) => g.toFixed(1)).slice(0, 20).join(' ')}`)
}
// spin with allocation similar to a decision (small objects/arrays)
{
  const gaps = []; let last = performance.now(); const end = last + 3000; let keep = []
  while (last < end) { for (let i = 0; i < 200; i++) keep.push({ move: [i, i], aim: [0, 0], s: 'x' + i }); if (keep.length > 20000) keep = []; const t = performance.now(); if (t - last > 2) gaps.push(t - last); last = t }
  console.log(`spin 3 s, allocating: gaps > 2 ms: ${gaps.length} max ${Math.max(0, ...gaps).toFixed(1)} : ${gaps.map((g) => g.toFixed(1)).slice(0, 30).join(' ')}`)
}
