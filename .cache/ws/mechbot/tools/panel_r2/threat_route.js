// Threat-aware routing with the sector table: A* extra cost on cells a tracked (or believed) enemy can fire at,
// looked up in the precomputed table (no rays inside A*). Scored with real rays. DEV ONLY.
import { loadWorld, loadNav, pct, mean, fmt } from './common.js'
import { BeliefGrid } from './belief_core.js'
const w = loadWorld(), nav = loadNav(w), G = new BeliefGrid(w, nav)
const NS = 32, CAP = 230, cn = G.cn
const T = new Uint8Array(cn * NS)
for (let c = 0; c < cn; c++) { if (!G.open[c]) continue; const x = G.repX[c], y = G.repY[c], z = G.repZ[c] + 4.5; for (let s = 0; s < NS; s++) { const a = (s + 0.5) * 2 * Math.PI / NS; T[c * NS + s] = Math.min(255, Math.round(w.rayShot(x, y, z, x + Math.cos(a) * CAP, y + Math.sin(a) * CAP, z + 2.5) * CAP)) } }
const coarse = new Int32Array(nav.n); for (let c = 0; c < nav.n; c++) coarse[c] = G.cellOf(nav.cellX(c), nav.cellY(c))
function lof(tx, ty, b) { const dx = tx - G.repX[b], dy = ty - G.repY[b], d = Math.hypot(dx, dy); let a = Math.atan2(dy, dx); if (a < 0) a += 2 * Math.PI; return d <= T[b * NS + Math.min(NS - 1, Math.floor(a / (2 * Math.PI / NS)))] + 4 }
let s = 31337; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
function exposedLen(pts, tx, ty, tz) { let e = 0, len = 0; for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], d = Math.hypot(dx, dy); const n = Math.max(1, Math.round(d / 2)); for (let k = 0; k < n; k++) { const x = pts[i - 1][0] + dx * (k + 0.5) / n, y = pts[i - 1][1] + dy * (k + 0.5) / n; if (w.shotClear(tx, ty, tz + 7, x, y, nav.levelAt(x, y) + 4.5)) e += d / n } len += d } return [e, len] }
for (const kT of [2, 5]) {
  const res = []; let tA = 0, tB = 0
  for (let trial = 0; trial < 4000 && res.length < 300; trial++) {
    let a; do { a = (rnd() * nav.n) | 0 } while (!nav.pass[a] || nav.comp[a] !== nav.mainComponent)
    const ax = nav.cellX(a), ay = nav.cellY(a)
    // threat 80-150 m away with a real line of fire to the start
    const ang = rnd() * 6.2832, dT = 80 + rnd() * 70; const tx = ax + Math.cos(ang) * dT, ty = ay + Math.sin(ang) * dT; const tc = nav.idx(tx, ty)
    if (tc < 0 || !nav.pass[tc]) continue
    const tz = nav.level[tc]
    if (!w.shotClear(tx, ty, tz + 7, ax, ay, nav.level[a] + 4.5)) continue
    // goal 60-150 m away, hidden from the threat (a hide / heal cell)
    const a2 = rnd() * 6.2832, dG = 60 + rnd() * 90; const gx = ax + Math.cos(a2) * dG, gy = ay + Math.sin(a2) * dG; const gc = nav.idx(gx, gy)
    if (gc < 0 || !nav.pass[gc] || nav.comp[gc] !== nav.mainComponent) continue
    if (w.shotClear(tx, ty, tz + 7, gx, gy, nav.level[gc] + 4.5)) continue
    let t0 = performance.now(); const p0 = nav.findPath(ax, ay, gx, gy, {}); tA += performance.now() - t0
    t0 = performance.now(); const p1 = nav.findPath(ax, ay, gx, gy, { cost: (i) => (coarse[i] >= 0 && lof(tx, ty, coarse[i])) ? kT * nav.cell : 0 }); tB += performance.now() - t0
    if (!p0.ok || !p1.ok || p0.len > 3 * dG) continue
    const [e0, l0] = exposedLen(p0.pts, tx, ty, tz), [e1, l1] = exposedLen(p1.pts, tx, ty, tz)
    res.push([e0, l0, e1, l1])
  }
  const n = res.length
  console.log(`threat-aware A* (each exposed metre costs ${1 + kT} m), ${n} retreats of 60-150 m to a hidden goal with one enemy at 80-150 m:`)
  console.log(`  shortest path: length ${fmt(mean(res.map(r => r[1])), 0)} m, of which exposed ${fmt(mean(res.map(r => r[0])), 0)} m (${fmt(100 * mean(res.map(r => r[0] / r[1])), 0)}%)`)
  console.log(`  threat-aware:  length ${fmt(mean(res.map(r => r[3])), 0)} m (x${fmt(mean(res.map(r => r[3] / r[1])), 2)}), exposed ${fmt(mean(res.map(r => r[2])), 0)} m (${fmt(100 * mean(res.map(r => r[2] / r[3])), 0)}%); exposed metres saved per route ${fmt(mean(res.map(r => r[0] - r[2])), 1)} (${fmt(100 * (1 - mean(res.map(r => r[2])) / mean(res.map(r => r[0]))), 0)}%); routes with at least 20 m saved ${fmt(100 * res.filter(r => r[0] - r[2] >= 20).length / n, 0)}%; A* ${fmt(tA / n, 2)} -> ${fmt(tB / n, 2)} ms`)
  // seconds of enemy gun time saved at today's walk speed and house accuracy 0.3 at 100 m (107 dps x 0.3)
  console.log(`  at 11.7 m/s that is ${fmt(mean(res.map(r => r[0] - r[2])) / 11.7, 2)} s less under fire per retreat, about ${fmt(mean(res.map(r => r[0] - r[2])) / 11.7 * 107 * 0.36, 0)} HP at 100 m against one house gun (107 dps x 0.36)`)
}
