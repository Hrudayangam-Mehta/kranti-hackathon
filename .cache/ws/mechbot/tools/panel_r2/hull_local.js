// For a duel against ONE known enemy: how often does the ground within 24 m (the evaluator's reach) hold a cell with
// a one-sided line (our muzzle -> its centre clear, its muzzle -> our centre blocked)? And a fully hidden cell? DEV ONLY.
import { loadWorld, loadNav, pct, mean, fmt } from './common.js'
const w = loadWorld(), nav = loadNav(w)
let s = 2024; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
for (const D of [60, 100, 140]) {
  let n = 0, one = 0, hide = 0, peekPair = 0, rays = 0; const dOne = [], cnt = []
  for (let trial = 0; trial < 20000 && n < 400; trial++) {
    let a; do { a = (rnd() * nav.n) | 0 } while (!nav.pass[a] || nav.comp[a] !== nav.mainComponent)
    const ax = nav.cellX(a), ay = nav.cellY(a), az = nav.level[a]
    const ang = rnd() * 6.2832, tx = ax + Math.cos(ang) * D, ty = ay + Math.sin(ang) * D, tc = nav.idx(tx, ty)
    if (tc < 0 || !nav.pass[tc]) continue
    const tz = nav.level[tc]
    if (!w.shotClear(tx, ty, tz + 7, ax, ay, az + 4.5)) continue        // we start in its line of fire
    n++
    let best = Infinity, k = 0, hid = false
    const i0 = a % nav.nx, j0 = (a / nav.nx) | 0
    for (let dj = -12; dj <= 12; dj++) for (let di = -12; di <= 12; di++) {
      if (di * di + dj * dj > 144) continue
      const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny) continue
      const c = j * nav.nx + i; if (!nav.pass[c]) continue
      const x = nav.cellX(c), y = nav.cellY(c), z = nav.level[c]; rays += 2
      const theirs = w.shotClear(tx, ty, tz + 7, x, y, z + 4.5)
      if (theirs) continue
      const head = w.shotClear(tx, ty, tz + 7, x, y, z + 8.7)
      if (!head) hid = true
      if (w.shotClear(x, y, z + 7, tx, ty, tz + 4.5)) { k++; const d = Math.hypot(x - ax, y - ay); if (d < best) best = d }
    }
    if (k) { one++; dOne.push(best); cnt.push(k) }
    if (hid) hide++
  }
  console.log(`enemy at ${D} m with a line of fire on us (n=${n}): a one-sided cell exists within 24 m in ${fmt(100 * one / n, 0)}% of cases (median ${fmt(pct(cnt, .5), 0)} such cells, nearest at p50 ${fmt(pct(dOne, .5), 0)} m); a fully hidden cell within 24 m in ${fmt(100 * hide / n, 0)}%`)
}
