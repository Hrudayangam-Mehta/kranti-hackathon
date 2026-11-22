// Static visibility map of the arena on the 8 m belief grid: per cell, free line-of-fire distance in 32 sectors
// (Killzone's line-of-fire table). Measures build cost, how well the table predicts a real ray, whether exposure
// predicts damage in the replay, and what an exposure-weighted route buys. DEV ONLY.
import { loadWorld, loadNav, loadReplay, pct, mean, fmt, MX, MY, MZ, MFL, MHP } from './common.js'
import { BeliefGrid } from './belief_core.js'
const w = loadWorld(), nav = loadNav(w), G = new BeliefGrid(w, nav)
const NS = 32, CAP = 230
const cn = G.cn
// ---- build
let rays = 0
function buildTable(ns) {
  const T = new Uint8Array(cn * ns)       // free distance in 1 m units, capped
  const t0 = performance.now()
  for (let c = 0; c < cn; c++) {
    if (!G.open[c]) continue
    const x = G.repX[c], y = G.repY[c], z = G.repZ[c] + 4.5
    for (let s = 0; s < ns; s++) {
      const a = (s + 0.5) * 2 * Math.PI / ns
      // shooter muzzle 7 m above ITS ground at the far end is unknown here: use a level ray at chest height + 2.5 m rise
      const f = w.rayShot(x, y, z, x + Math.cos(a) * CAP, y + Math.sin(a) * CAP, z + 2.5); rays++
      T[c * ns + s] = Math.min(255, Math.round(f * CAP))
    }
  }
  return { T, ms: performance.now() - t0 }
}
const { T, ms } = buildTable(NS)
const T16 = buildTable(16)
const nOpen = G.open.reduce((a, v) => a + v, 0)
console.log(`sector table: ${nOpen} open 8 m cells x ${NS} sectors = ${nOpen * NS} rays, ${ms.toFixed(0)} ms here (${(ms * 1000 / (nOpen * NS)).toFixed(2)} us per ray; at 4 us per ray ${(nOpen * NS * 4e-6).toFixed(1)} s); ${(cn * NS / 1024).toFixed(0)} KB. 16 sectors: ${T16.ms.toFixed(0)} ms`)
// visible area and openness per cell
const area = new Float32Array(cn), meanFree = new Float32Array(cn), blocked = new Uint8Array(cn)
let maxArea = 0
for (let c = 0; c < cn; c++) { if (!G.open[c]) continue; let a = 0, m = 0, b = 0; for (let s = 0; s < NS; s++) { const r = T[c * NS + s]; a += r * r; m += r; if (r < 25) b++ } area[c] = a * Math.PI / NS; meanFree[c] = m / NS; blocked[c] = b; if (area[c] > maxArea) maxArea = area[c] }
const areas = []; for (let c = 0; c < cn; c++) if (G.open[c]) areas.push(area[c])
const q = [0.1, 0.25, 0.5, 0.75, 0.9].map(p => pct(areas, p))
console.log(`visible area per open cell (ha): p10 ${fmt(q[0] / 1e4, 2)} p25 ${fmt(q[1] / 1e4, 2)} p50 ${fmt(q[2] / 1e4, 2)} p75 ${fmt(q[3] / 1e4, 2)} p90 ${fmt(q[4] / 1e4, 2)} (full 230 m disc = ${fmt(Math.PI * CAP * CAP / 1e4, 1)} ha)`)
// ---- does the table predict a real ray?  (pair of open cells within 230 m; truth = muzzle a -> centre b)
let s = 4242; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
function predict(Tb, ns, a, b) {         // can a shoot b: is a closer to b than b's free distance in a's direction
  const dx = G.repX[a] - G.repX[b], dy = G.repY[a] - G.repY[b], d = Math.hypot(dx, dy)
  let ang = Math.atan2(dy, dx); if (ang < 0) ang += 2 * Math.PI
  const sec = Math.min(ns - 1, Math.floor(ang / (2 * Math.PI / ns)))
  return d <= Tb[b * ns + sec] + 4
}
for (const [name, Tb, ns] of [['32 sectors', T, 32], ['16 sectors', T16.T, 16]]) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (let k = 0; k < 200000; k++) {
    let a, b
    do { a = (rnd() * cn) | 0 } while (!G.open[a])
    const ang = rnd() * 6.2832, d = 30 + rnd() * 200
    b = G.cellOf(G.repX[a] + Math.cos(ang) * d, G.repY[a] + Math.sin(ang) * d)
    if (b < 0 || !G.open[b] || b === a) continue
    const truth = w.shotClear(G.repX[a], G.repY[a], G.repZ[a] + 7, G.repX[b], G.repY[b], G.repZ[b] + 4.5)
    const p = predict(Tb, ns, a, b)
    if (truth && p) tp++; else if (truth && !p) fn++; else if (!truth && p) fp++; else tn++
  }
  const n = tp + fp + fn + tn
  console.log(`table as a line-of-fire predictor (${name}), ${n} random cell pairs 30-230 m apart: real line exists ${fmt(100 * (tp + fn) / n)}%; table agrees ${fmt(100 * (tp + tn) / n)}%; misses a real line ${fmt(100 * fn / (tp + fn))}% of the time (dangerous error); cries wolf on ${fmt(100 * fp / (fp + tn))}% of blocked pairs`)
}
// ---- replay: does static exposure predict damage?
const R = loadReplay()
const dmgAt = new Map()     // frame -> victim -> damage from mechs
const fi = (tick) => { let lo = 0, hi = R.nf - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.ticks[mid] <= tick) lo = mid; else hi = mid - 1 } return lo }
for (const e of R.events) { if (e.e !== 'hit' || e.src >= 100 || e.dst >= 100) continue; const k = fi(e.t); const key = k * 16 + e.dst; dmgAt.set(key, (dmgAt.get(key) || 0) + e.amt) }
const rows = []
for (const id of R.ids) for (let k = 0; k < R.nf; k++) {
  const r = R.m[id][k]; if (!r || !(r[MFL] & 1)) continue
  const c = G.cellOf(r[MX], r[MY]); if (c < 0 || !G.open[c]) continue
  if (r[MZ] - G.repZ[c] > 3) continue        // on a roof: the ground table does not apply
  rows.push([area[c], dmgAt.get(k * 16 + id) || 0, nav.wallDistAt(r[MX], r[MY])])
}
rows.sort((a, b) => a[0] - b[0])
console.log(`\nreplay, grounded mech-frames on the ground: ${rows.length} (${fmt(rows.length / 10, 0)} mech-seconds). Damage taken from mechs per second, by static visible area of the cell:`)
for (let qn = 0; qn < 4; qn++) {
  const sub = rows.slice(Math.floor(rows.length * qn / 4), Math.floor(rows.length * (qn + 1) / 4))
  console.log(`  quartile ${qn + 1}: visible area ${fmt(sub[0][0] / 1e4, 2)}-${fmt(sub[sub.length - 1][0] / 1e4, 2)} ha  damage ${fmt(10 * mean(sub.map(r => r[1])), 1)} HP/s  share of frames with a hit ${fmt(100 * sub.filter(r => r[1] > 0).length / sub.length, 1)}%`)
}
// where do mechs stand relative to what the map offers?
console.log(`  median visible area where house bots stand ${fmt(pct(rows.map(r => r[0]), .5) / 1e4, 2)} ha vs map median ${fmt(q[2] / 1e4, 2)} ha`)
// same split by wall distance (what the bot has today)
rows.sort((a, b) => a[2] - b[2])
for (let qn = 0; qn < 4; qn++) { const sub = rows.slice(Math.floor(rows.length * qn / 4), Math.floor(rows.length * (qn + 1) / 4)); console.log(`  wall-distance quartile ${qn + 1}: ${fmt(sub[0][2], 1)}-${fmt(sub[sub.length - 1][2], 1)} m  damage ${fmt(10 * mean(sub.map(r => r[1])), 1)} HP/s`) }
// ---- exposure-weighted routing
const expo = new Float32Array(nav.n)
for (let c = 0; c < nav.n; c++) { const cc = G.cellOf(nav.cellX(c), nav.cellY(c)); expo[c] = cc >= 0 ? area[cc] / maxArea : 1 }
function pathExposure(pts) { let e = 0, len = 0; for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], d = Math.hypot(dx, dy); const n = Math.max(1, Math.round(d / 2)); for (let k = 0; k < n; k++) { const x = pts[i - 1][0] + dx * (k + 0.5) / n, y = pts[i - 1][1] + dy * (k + 0.5) / n; const c = nav.idx(x, y); e += (c >= 0 ? expo[c] : 1) * d / n } len += d } return [e, len] }
for (const kExp of [1, 2, 4]) {
  const res = []; let tA = 0, tB = 0, n = 0
  s = 99
  for (let trial = 0; trial < 150; trial++) {
    let a, b
    do { a = (rnd() * nav.n) | 0 } while (!nav.pass[a] || nav.comp[a] !== nav.mainComponent)
    do { b = (rnd() * nav.n) | 0 } while (!nav.pass[b] || nav.comp[b] !== nav.mainComponent)
    const d = Math.hypot(nav.cellX(a) - nav.cellX(b), nav.cellY(a) - nav.cellY(b))
    if (d < 150 || d > 400) continue
    let t0 = performance.now(); const p0 = nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b), {}); tA += performance.now() - t0
    t0 = performance.now(); const p1 = nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b), { cost: (i) => kExp * nav.cell * expo[i] }); tB += performance.now() - t0
    if (!p0.ok || !p1.ok) continue
    const [e0, l0] = pathExposure(p0.pts), [e1, l1] = pathExposure(p1.pts)
    res.push([l1 / l0, e1 / e0]); n++
  }
  console.log(`exposure-weighted A* (extra cost = ${kExp} x exposure per metre), ${n} routes 150-400 m: length x${fmt(mean(res.map(r => r[0])), 3)} (p90 x${fmt(pct(res.map(r => r[0]), .9), 2)}), exposure integral x${fmt(mean(res.map(r => r[1])), 3)}; A* time ${fmt(tA / n, 2)} -> ${fmt(tB / n, 2)} ms`)
}
