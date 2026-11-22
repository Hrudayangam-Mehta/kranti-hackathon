// Census of GROUND hull-down cells: our muzzle (7 m) reaches a target's centre, its muzzle cannot reach our centre
// (4.5 m) because something 4.6-6.9 m high stands just in front of us. DEV ONLY.
import { loadWorld, loadNav, loadConfig, pct, mean, fmt } from './common.js'
const w = loadWorld(), nav = loadNav(w), cfg = loadConfig()
const scale = Number(process.argv[2] || 1)       // body scale (1 + 0.05 * cubes)
const MZ = 7 * scale, CZ = 4.5 * scale, ND = 24
function oneSided(x, y, z, D) {
  let adv = 0, mut = 0, tot = 0, mask = 0
  for (let a = 0; a < ND; a++) {
    const ex = x + Math.cos(a * 2 * Math.PI / ND) * D, ey = y + Math.sin(a * 2 * Math.PI / ND) * D
    const q = nav.idx(ex, ey); if (q < 0 || !nav.pass[q]) continue
    tot++
    const ez = nav.level[q]
    const ours = w.shotClear(x, y, z + MZ, ex, ey, ez + 4.5), theirs = w.shotClear(ex, ey, ez + 7, x, y, z + CZ)
    if (ours && !theirs) { adv++; mask |= 1 << a } else if (ours && theirs) mut++
  }
  return [adv, mut, tot, mask]
}
const t0 = performance.now()
const cells = []; let rays = 0, scanned = 0
for (let j = 0; j < nav.ny; j += 2) for (let i = 0; i < nav.nx; i += 2) {
  const c = j * nav.nx + i
  if (!nav.pass[c] || nav.comp[c] !== nav.mainComponent) continue
  scanned++
  const x = nav.cellX(c), y = nav.cellY(c), z = nav.level[c]
  const [adv, mut, tot] = oneSided(x, y, z, 100); rays += 2 * tot
  if (tot >= 8) cells.push({ c, x, y, z, adv, mut, tot, f: adv / tot, wd: nav.wallDist[c] })
}
const ms = performance.now() - t0
console.log(`body scale ${scale}: scanned ${scanned} ground cells on a 4 m lattice, ${rays} rays, ${ms.toFixed(0)} ms`)
for (const thr of [0.125, 0.25, 0.4]) { const s = cells.filter(c => c.f >= thr); console.log(`  cells with a one-sided line to >= ${thr * 100}% of the directions at 100 m: ${s.length} (${fmt(100 * s.length / cells.length, 2)}% of the lattice)`) }
const good = cells.filter(c => c.f >= 0.25)
// what makes them: height of the obstacle in front (highest surface within 3-9 m in the one-sided directions, relative to feet)
const hs = []
for (const g of good.slice(0, 4000)) {
  const [, , , mask] = oneSided(g.x, g.y, g.z, 100)
  for (let a = 0; a < ND; a++) { if (!(mask >> a & 1)) continue; let hmax = -99; for (let r = 3; r <= 12; r += 1.5) { const h = w.surfaceZ(g.x + Math.cos(a * 2 * Math.PI / ND) * r, g.y + Math.sin(a * 2 * Math.PI / ND) * r) - g.z; if (h > hmax) hmax = h } hs.push(hmax) }
}
console.log(`  obstacle height above our feet within 12 m in the one-sided directions: p10 ${fmt(pct(hs, .1))} p50 ${fmt(pct(hs, .5))} p90 ${fmt(pct(hs, .9))} m`)
console.log(`  wall distance of those cells: p10 ${fmt(pct(good.map(g => g.wd), .1))} p50 ${fmt(pct(good.map(g => g.wd), .5))} p90 ${fmt(pct(good.map(g => g.wd), .9))} m; two-sided share at the same cells ${fmt(100 * mean(good.map(g => g.mut / g.tot)), 0)}%`)
// clusters: how far is a random ground point from the nearest such cell
let s = 5; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
const ds = []
for (let k = 0; k < 1500; k++) { let c; do { c = (rnd() * nav.n) | 0 } while (!nav.pass[c] || nav.comp[c] !== nav.mainComponent); const x = nav.cellX(c), y = nav.cellY(c); let b = 1e9; for (const g of good) { const d = (g.x - x) * (g.x - x) + (g.y - y) * (g.y - y); if (d < b) b = d } ds.push(Math.sqrt(b)) }
console.log(`  distance from a random ground point to the nearest >= 25% cell: p25 ${fmt(pct(ds, .25), 0)} p50 ${fmt(pct(ds, .5), 0)} p75 ${fmt(pct(ds, .75), 0)} p90 ${fmt(pct(ds, .9), 0)} m`)
// zone: how many lie within 380 / 240 / 140 / 70 m of the default first centre
const zc = cfg.zone.start_center
for (const r of [380, 240, 140, 70]) console.log(`  within ${r} m of the start centre: ${good.filter(g => Math.hypot(g.x - zc[0], g.y - zc[1]) <= r).length}`)
// top 12 distinct posts (at least 40 m apart)
good.sort((a, b) => b.f - a.f)
const picks = []
for (const g of good) { if (picks.every(p => Math.hypot(p.x - g.x, p.y - g.y) >= 40)) picks.push(g); if (picks.length >= 12) break }
console.log('  best distinct ground posts (x, y, one-sided share at 100 m, two-sided share, wall distance):')
for (const p of picks) { const o60 = oneSided(p.x, p.y, p.z, 60), o150 = oneSided(p.x, p.y, p.z, 150); console.log(`    (${fmt(p.x, 0)}, ${fmt(p.y, 0)})  one-sided ${fmt(100 * p.f, 0)}% at 100 m (${fmt(100 * o60[0] / Math.max(1, o60[2]), 0)}% at 60, ${fmt(100 * o150[0] / Math.max(1, o150[2]), 0)}% at 150), two-sided ${fmt(100 * p.mut / p.tot, 0)}%, wall ${fmt(p.wd)} m`) }
