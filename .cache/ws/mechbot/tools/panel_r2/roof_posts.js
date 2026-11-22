// Prototype of the start-up "roof post" table (hull-down firing posts on roofs) with its build cost. DEV ONLY.
// A post is a standable roof cell from which our muzzle reaches a ground target's centre in many directions while
// that target's muzzle cannot reach our centre (house bots in the replay never fire without a centre line).
import { loadWorld, loadNav, loadConfig, pct, mean, fmt } from './common.js'
const w = loadWorld(), nav = loadNav(w), cfg = loadConfig(), M = cfg.mech
const scale = Number(process.argv[2] || 1)
const nx = nav.nx, ny = nav.ny, n = nav.n, cell = nav.cell, R0 = M.radius * scale, H0 = M.height * scale
const ND = 24, MZ = M.muzzle_height * scale, CZ = 0.5 * M.height * scale
const T0 = performance.now(); let rays = 0
const top = new Float32Array(n), roof = new Uint8Array(n)
for (let c = 0; c < n; c++) { const x = nav.cellX(c), y = nav.cellY(c); const s = w.surfaceZ(x, y); top[c] = s; if (s - w.ground(x, y) > 6 && !w.bodyBlocked(x, y, s + 0.01, R0, H0, M.step_up)) roof[c] = 1 }
const comp = new Int32Array(n).fill(-1), stack = new Int32Array(n), patches = []
for (let c0 = 0; c0 < n; c0++) {
  if (!roof[c0] || comp[c0] >= 0) continue
  let sp = 0; stack[sp++] = c0; comp[c0] = patches.length; const cells = []
  while (sp) { const c = stack[--sp]; cells.push(c); const i = c % nx, j = (c / nx) | 0
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const q = b * nx + a; if (roof[q] && comp[q] < 0 && Math.abs(top[q] - top[c]) <= M.step_up) { comp[q] = patches.length; stack[sp++] = q } } }
  patches.push({ cells })
}
function masks(x, y, z, D) {
  let one = 0, two = 0, tot = 0
  for (let a = 0; a < ND; a++) {
    const ex = x + Math.cos(a * 2 * Math.PI / ND) * D, ey = y + Math.sin(a * 2 * Math.PI / ND) * D
    const q = nav.idx(ex, ey); if (q < 0 || !nav.pass[q]) continue
    tot |= 1 << a; const ez = nav.level[q]; rays += 2
    const ours = w.shotClear(x, y, z + MZ, ex, ey, ez + 4.5), theirs = w.shotClear(ex, ey, ez + 7, x, y, z + CZ)
    if (ours && !theirs) one |= 1 << a; else if (ours && theirs) two |= 1 << a
  }
  return [one, two, tot]
}
const pop = (v) => { let c = 0; while (v) { c += v & 1; v >>>= 1 } return c }
const posts = []
for (const p of patches) {
  if (p.cells.length * 4 < 300) continue
  // launch: nearest passable main-component ground cell within 8 m of a rim cell; climb = roof level - ground level there
  let climb = Infinity, launch = -1, land = -1
  for (const c of p.cells) { const i = c % nx, j = (c / nx) | 0
    for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const q = b * nx + a; if (!nav.pass[q] || nav.comp[q] !== nav.mainComponent) continue; const h = top[c] - nav.level[q]; if (h < climb) { climb = h; launch = q; land = c } } }
  if (launch < 0 || climb < 10 || climb > 45) continue
  let best = null, union100 = 0, union60 = 0, any100 = 0
  for (const c of p.cells) { const i = c % nx, j = (c / nx) | 0; if ((i & 1) || (j & 1)) continue
    const m100 = masks(nav.cellX(c), nav.cellY(c), top[c], 100), m60 = masks(nav.cellX(c), nav.cellY(c), top[c], 60)
    union100 |= m100[0]; union60 |= m60[0]; any100 |= m100[2]
    const score = pop(m100[0]) + 0.5 * pop(m60[0]) - 0.5 * pop(m100[1])
    if (!best || score > best.score) best = { c, score, m100, m60 } }
  if (!best) continue
  posts.push({ x: nav.cellX(best.c), y: nav.cellY(best.c), z: top[best.c], climb, area: p.cells.length * 4, one100: pop(best.m100[0]) / Math.max(1, pop(best.m100[2])), two100: pop(best.m100[1]) / Math.max(1, pop(best.m100[2])), one60: pop(best.m60[0]) / Math.max(1, pop(best.m60[2])), two60: pop(best.m60[1]) / Math.max(1, pop(best.m60[2])), union100: pop(union100) / Math.max(1, pop(any100)), launch: [nav.cellX(launch), nav.cellY(launch)], land: [nav.cellX(land), nav.cellY(land)] })
}
const ms = performance.now() - T0
console.log(`body scale ${scale}: roof post table built in ${ms.toFixed(0)} ms, ${rays} rays (at 4 us per ray: ${(rays * 4e-6).toFixed(1)} s); roofs with a post (>= 300 m2, climb 10-45 m): ${posts.length}`)
const good = posts.filter(p => p.one100 >= 0.25)
console.log(`posts whose single best cell is one-sided to >= 25% of the directions at 100 m: ${good.length}; >= 40%: ${posts.filter(p => p.one100 >= 0.4).length}`)
console.log(`best cell, all roofs: one-sided at 100 m p50 ${fmt(100 * pct(posts.map(p => p.one100), .5), 0)}% p90 ${fmt(100 * pct(posts.map(p => p.one100), .9), 0)}%; two-sided p50 ${fmt(100 * pct(posts.map(p => p.two100), .5), 0)}%; at 60 m one-sided p50 ${fmt(100 * pct(posts.map(p => p.one60), .5), 0)}%, two-sided p50 ${fmt(100 * pct(posts.map(p => p.two60), .5), 0)}%`)
console.log(`moving on the roof: directions (100 m) that SOME cell of the roof covers one-sidedly: p50 ${fmt(100 * pct(posts.map(p => p.union100), .5), 0)}% p90 ${fmt(100 * pct(posts.map(p => p.union100), .9), 0)}%`)
console.log(`climb of the >= 25% posts: p50 ${fmt(pct(good.map(p => p.climb), .5))} m (${fmt(pct(good.map(p => p.climb), .5) / M.max_rise_speed + 0.3)} s, ${fmt(pct(good.map(p => p.climb), .5) * M.jet_drain / M.max_rise_speed + 8, 0)} energy), p90 ${fmt(pct(good.map(p => p.climb), .9))} m`)
let s = 11; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
const ds = []
for (let k = 0; k < 1500; k++) { let c; do { c = (rnd() * n) | 0 } while (!nav.pass[c] || nav.comp[c] !== nav.mainComponent); let b = 1e9; for (const g of good) { const d = Math.hypot(g.launch[0] - nav.cellX(c), g.launch[1] - nav.cellY(c)); if (d < b) b = d } ds.push(b) }
console.log(`straight distance from a random ground point to the nearest >= 25% post launch: p25 ${fmt(pct(ds, .25), 0)} p50 ${fmt(pct(ds, .5), 0)} p75 ${fmt(pct(ds, .75), 0)} p90 ${fmt(pct(ds, .9), 0)} m`)
const zc = cfg.zone.start_center
for (const r of [380, 240, 140, 70]) console.log(`  >= 25% posts within ${r} m of the start centre: ${good.filter(g => Math.hypot(g.x - zc[0], g.y - zc[1]) <= r).length}`)
good.sort((a, b) => b.one100 - a.one100)
console.log('top posts: xy, roof z, climb, area, one-sided/two-sided at 100 m, at 60 m, union')
for (const p of good.slice(0, 10)) console.log(`  (${fmt(p.x, 0)}, ${fmt(p.y, 0)}) z ${fmt(p.z)} climb ${fmt(p.climb)} m area ${p.area} m2  100 m: ${fmt(100 * p.one100, 0)}%/${fmt(100 * p.two100, 0)}%  60 m: ${fmt(100 * p.one60, 0)}%/${fmt(100 * p.two60, 0)}%  union ${fmt(100 * p.union100, 0)}%  launch (${fmt(p.launch[0], 0)}, ${fmt(p.launch[1], 0)})`)
