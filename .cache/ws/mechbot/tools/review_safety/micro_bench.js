// Micro-benchmarks of the geometry primitives the brain calls per tick (one CPU, Bun).
import { realHello, loadMap, mulberry, pct } from './common.js'
const hello = realHello()
const { world, nav } = await loadMap(hello)
const rnd = mulberry(7)
const b = world.bounds
const rp = () => { for (;;) { const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY); if (nav.passableAt(x, y)) return [x, y] } }
const spots = Array.from({ length: 400 }, rp)

// --- findPath with the brain's budget (maxExpand 4000) between random passable points
function benchPath(maxExpand, label, pick) {
  const ts = []; let worst = 0, wa = null, okN = 0, ex = 0
  for (let k = 0; k < 600; k++) {
    const [a, c] = pick(k)
    const t0 = performance.now()
    const r = nav.findPath(a[0], a[1], c[0], c[1], { maxExpand })
    const dt = performance.now() - t0
    ts.push(dt); if (r.ok) okN++; ex += r.expanded
    if (dt > worst) { worst = dt; wa = [a, c, r.expanded, r.pts.length, r.ok] }
  }
  console.log(`${label.padEnd(46)} mean ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(2)} p50 ${pct(ts, 0.5).toFixed(2)} p99 ${pct(ts, 0.99).toFixed(2)} max ${worst.toFixed(2)} ms  ok ${okN}/600 meanExpanded ${(ex / 600).toFixed(0)} worst=${JSON.stringify(wa && [wa[0].map(Math.round), wa[1].map(Math.round), wa[2], wa[3], wa[4]])}`)
  return wa
}
for (let w = 0; w < 2; w++) benchPath(4000, 'warm', (k) => [spots[k % 400], spots[(k * 7 + 3) % 400]])
benchPath(4000, 'findPath random pairs, maxExpand 4000', (k) => [spots[k % 400], spots[(k * 7 + 3) % 400]])
benchPath(2000, 'findPath random pairs, maxExpand 2000', (k) => [spots[k % 400], spots[(k * 7 + 3) % 400]])
// near pairs (<= 150 m) : what the brain usually asks
const near = []
for (let i = 0; i < 400 && near.length < 600; i++) for (let j = 0; j < 400 && near.length < 600; j++) { const d = Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]); if (d > 40 && d < 150) near.push([spots[i], spots[j]]) }
benchPath(4000, 'findPath pairs 40-150 m, maxExpand 4000', (k) => near[k % near.length])
// stadium bowl to outside (different components)
const bowl = []
for (let c = 0; c < nav.n; c++) if (nav.comp[c] === 16) bowl.push([nav.cellX(c), nav.cellY(c)])
benchPath(4000, 'findPath bowl -> outside (other component)', (k) => [bowl[(k * 131) % bowl.length], spots[k % 400]])
benchPath(4000, 'findPath outside -> bowl', (k) => [spots[k % 400], bowl[(k * 131) % bowl.length]])
// goal inside a building (snapped) / unreachable roofs
const blds = world.prisms.filter((p) => p.kind === 'building' && p.maxX - p.minX > 40 && p.maxY - p.minY > 40)
benchPath(4000, 'findPath -> centre of a large building', (k) => [spots[k % 400], [(blds[k % blds.length].minX + blds[k % blds.length].maxX) / 2, (blds[k % blds.length].minY + blds[k % blds.length].maxY) / 2]])

// --- big body: setBody cost and paths with the 40-cube body
for (const cubes of [0, 10, 20, 40]) {
  const sc = 1 + 0.05 * cubes
  const t0 = performance.now(); nav.setBody(2.5 * sc, 9 * sc); const dt = performance.now() - t0
  let pass = 0; for (let c = 0; c < nav.n; c++) pass += nav.pass[c]
  console.log(`setBody cubes ${cubes}: ${dt.toFixed(2)} ms, passable cells ${pass}`)
  if (cubes) benchPath(4000, `findPath random pairs, body of ${cubes} cubes`, (k) => [spots[k % 400], spots[(k * 7 + 3) % 400]])
}
nav.setBody(2.5, 9)

// --- rays
function benchRay(label, fn, len) {
  const N = 20000; let hits = 0
  const t0 = performance.now()
  for (let k = 0; k < N; k++) {
    const a = spots[k % 400], ang = rnd() * 6.283
    const az = world.ground(a[0], a[1]) + 7
    const bx = a[0] + Math.cos(ang) * len, by = a[1] + Math.sin(ang) * len
    if (fn(a[0], a[1], az, bx, by, world.ground(bx, by) + 4.5)) hits++
  }
  const dt = performance.now() - t0
  console.log(`${label.padEnd(46)} ${(dt / N * 1000).toFixed(2)} us/ray  clear ${(hits / N * 100).toFixed(0)}%`)
}
for (const len of [25, 100, 200, 320, 1200]) { benchRay(`shotClear ${len} m`, (...a) => world.shotClear(...a), len); benchRay(`canSee    ${len} m`, (...a) => world.canSee(...a), len) }
// worst single rays
let wr = 0, wseg = null
for (let k = 0; k < 40000; k++) {
  const a = spots[k % 400], c = spots[(k * 13 + 5) % 400]
  const az = world.ground(a[0], a[1]) + 7, cz = world.ground(c[0], c[1]) + 4.5
  const t0 = performance.now(); world.shotClear(a[0], a[1], az, c[0], c[1], cz); const dt = performance.now() - t0
  if (dt > wr) { wr = dt; wseg = [a, c] }
}
console.log('worst single shotClear between random passable points', (wr * 1000).toFixed(0), 'us', JSON.stringify(wseg.map((p) => p.map(Math.round))))
// a ray to a far-away (off-map) point, as a remembered / phantom track could produce
for (const far of [2000, 20000, 99000]) {
  const a = spots[0], az = world.ground(a[0], a[1]) + 7
  const t0 = performance.now(); let n = 0
  for (let k = 0; k < 20; k++) { world.shotClear(a[0], a[1], az, a[0] + far, a[1] + far * 0.3, az); n++ }
  console.log(`shotClear to a point ${far} m away: ${((performance.now() - t0) / n).toFixed(3)} ms/ray`)
}
// walkLine
{
  const N = 20000; const t0 = performance.now(); let ok = 0
  for (let k = 0; k < N; k++) { const a = spots[k % 400], ang = rnd() * 6.283; if (nav.walkLine(a[0], a[1], a[0] + 80 * Math.cos(ang), a[1] + 80 * Math.sin(ang))) ok++ }
  console.log(`walkLine 80 m: ${((performance.now() - t0) / N * 1000).toFixed(2)} us, ok ${(ok / N * 100).toFixed(0)}%`)
}
