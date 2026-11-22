import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const navA = new Nav(w), navB = new Nav(w, { wallMargin: -0.7 }), navC = new Nav(w, { wallMargin: 0.0 })
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const cells = []; for (let c = 0; c < navA.n; c++) if (navA.comp[c] === navA.mainComponent) cells.push(c)
let n = 0, worse5 = 0, worse15 = 0, worse30 = 0, sumA = 0, sumB = 0, sumC = 0, w5c = 0, w15c = 0; const big = []
for (let k = 0; k < 600; k++) {
  const a = cells[(rnd() * cells.length) | 0], b = cells[(rnd() * cells.length) | 0]
  const ax = navA.cellX(a), ay = navA.cellY(a), bx = navA.cellX(b), by = navA.cellY(b)
  const ra = navA.findPath(ax, ay, bx, by, { maxExpand: 200000 }), rb = navB.findPath(ax, ay, bx, by, { maxExpand: 200000 }), rc = navC.findPath(ax, ay, bx, by, { maxExpand: 200000 })
  if (!ra.ok || !rb.ok || !rc.ok) continue
  n++; sumA += ra.len; sumB += rb.len; sumC += rc.len
  const r = ra.len / rb.len
  if (r > 1.05) worse5++; if (r > 1.15) worse15++; if (r > 1.3) { worse30++; big.push([ax, ay, bx, by, ra.len.toFixed(0), rb.len.toFixed(0)]) }
  const r2 = ra.len / rc.len; if (r2 > 1.05) w5c++; if (r2 > 1.15) w15c++
}
console.log('pairs', n, 'mean len default', (sumA / n).toFixed(1), 'margin0', (sumC / n).toFixed(1), 'relaxed(-0.7)', (sumB / n).toFixed(1))
console.log('default vs relaxed(-0.7): >5% longer', worse5, '>15%', worse15, '>30%', worse30, '| default vs margin0: >5%', w5c, '>15%', w15c)
console.log(big.slice(0, 10).map(b => b.join(',')).join('\n'))
