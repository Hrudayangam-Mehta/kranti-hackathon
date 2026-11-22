const P = process.argv[2]
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
let t = performance.now()
const w = World.loadSync(P + '/kit/arena/v2')
console.log('world ms', (performance.now() - t).toFixed(0), 'bounds', JSON.stringify(w.bounds), 'prisms', w.prisms?.length, 'trees', w.trees?.length)
t = performance.now()
const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
console.log('nav ms', (performance.now() - t).toFixed(0), 'cells', nav.n, 'nx', nav.nx, 'ny', nav.ny)
let pass = 0; for (let i = 0; i < nav.n; i++) pass += nav.pass[i]
console.log('passable', pass, (pass / nav.n).toFixed(3))
// path timing
const b = w.bounds
let ok = 0, tot = 0, worst = 0, n = 0
let s = 12345
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const pts = []
while (pts.length < 60) { const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY); if (nav.passableAt(x, y)) pts.push([x, y]) }
for (let i = 0; i + 1 < pts.length; i += 2) {
  const t0 = performance.now(); const r = nav.findPath(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); const ms = performance.now() - t0
  tot += ms; worst = Math.max(worst, ms); n++; if (r && r.ok) ok++
}
console.log('paths ok', ok, '/', n, 'mean ms', (tot / n).toFixed(2), 'worst', worst.toFixed(2))
// ray timing
let t0 = performance.now(), clear = 0
for (let i = 0; i < 20000; i++) { const a = pts[i % pts.length], c = pts[(i * 7 + 3) % pts.length]; if (w.shotClear(a[0], a[1], w.ground(a[0], a[1]) + 7, c[0], c[1], w.ground(c[0], c[1]) + 4.5)) clear++ }
console.log('20000 long rays ms', (performance.now() - t0).toFixed(0), 'clear', clear)
console.log('mem MB', (process.memoryUsage().rss / 1e6).toFixed(0))
