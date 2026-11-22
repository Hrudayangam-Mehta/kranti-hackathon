// Our own measurement (no third-party code): how often does the real map offer a "hull-down" firing cell?
// Definition used here, for us at A and an opponent at B (both on standable ground of the main component):
//   duel line  : A muzzle (7 m) -> B body centre (4.5 m) clear AND B muzzle -> A centre clear
//   hull-down  : A muzzle -> B centre clear, B muzzle -> A centre BLOCKED (a bot that tests only the body centre
//                 cannot fire at us; we can fire at it)
//   top shown  : B muzzle -> A top (8.5 m) clear (a bot with an aim ladder can still hit that part)
// For random duel pairs at distance d it reports the share of pairs that have a hull-down cell within 8 m / 14 m /
// 20 m of A (straight walkable), and the share of those cells whose top is still visible from B.
//   bun tools/top10/hulldown_scan.js [--pairs 300]
import { World } from '../redteam/snap/bot/lib/world.js'
import { Nav } from '../redteam/snap/bot/lib/nav.js'
import { readFileSync } from 'node:fs'
const ROOT = new URL('../redteam/snap/', import.meta.url).pathname
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? parseFloat(args[i + 1]) : d }
const PAIRS = arg('pairs', 300)
const world = World.loadSync(ROOT + 'kit/arena')
const cfg = JSON.parse(readFileSync(ROOT + 'notes/hello_example.json', 'utf8')).config
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let seed = 20261121
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const MZ = 7, CZ = 4.5, TZ = 8.5
const main = nav.mainComponent
const ok = (x, y) => { const c = nav.idx(x, y); return c >= 0 && nav.pass[c] && nav.comp[c] === main }
const lv = (x, y) => nav.levelAt(x, y)
const fire = (ax, ay, bx, by, hz) => world.shotClear(ax, ay, lv(ax, ay) + MZ, bx, by, lv(bx, by) + hz)
const z0 = cfg.zone.start_center, R0 = cfg.zone.start_radius
const cells = []
for (let c = 0; c < nav.n; c++) {
  if (!nav.pass[c] || nav.comp[c] !== main) continue
  const x = nav.cellX(c), y = nav.cellY(c)
  if (Math.hypot(x - z0[0], y - z0[1]) <= R0 * 0.8) cells.push(c)
}
const out = []
for (const d of [60, 80, 100, 130, 150]) {
  let n = 0, tries = 0
  const has = { 8: 0, 14: 0, 20: 0 }
  let hdCells = 0, hdTop = 0, ringCells = 0
  while (n < PAIRS && tries < PAIRS * 60) {
    tries++
    const c = cells[(rnd() * cells.length) | 0]
    const ax = nav.cellX(c), ay = nav.cellY(c)
    const th = rnd() * Math.PI * 2
    const bx = ax + Math.cos(th) * d, by = ay + Math.sin(th) * d
    if (!ok(bx, by)) continue
    if (!(fire(ax, ay, bx, by, CZ) && fire(bx, by, ax, ay, CZ))) continue // start from an ordinary two-way duel
    n++
    const found = { 8: false, 14: false, 20: false }
    for (let dy = -20; dy <= 20; dy += 2) for (let dx = -20; dx <= 20; dx += 2) {
      const r = Math.hypot(dx, dy)
      if (r > 20 || r < 1) continue
      const px = ax + dx, py = ay + dy
      if (!ok(px, py) || !nav.walkLine(ax, ay, px, py, true)) continue
      ringCells++
      if (fire(px, py, bx, by, CZ) && !fire(bx, by, px, py, CZ)) {
        hdCells++
        if (fire(bx, by, px, py, TZ)) hdTop++
        for (const k of [8, 14, 20]) if (r <= k) found[k] = true
      }
    }
    for (const k of [8, 14, 20]) if (found[k]) has[k]++
  }
  out.push({ d, pairs: n, shareWithHullDownWithin: { m8: +(has[8] / n).toFixed(3), m14: +(has[14] / n).toFixed(3), m20: +(has[20] / n).toFixed(3) }, hullDownShareOfReachableCells: +(hdCells / Math.max(1, ringCells)).toFixed(4), topStillVisibleShare: +(hdTop / Math.max(1, hdCells)).toFixed(3) })
}
for (const o of out) console.log(JSON.stringify(o))
