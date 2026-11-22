import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
// where are promoted (deck) cells? group by supporting prism
const byPrism = {}
for (let c = 0; c < nav.n; c++) {
  if (!nav.onTop[c]) continue
  const x = nav.cellX(c), y = nav.cellY(c)
  const g = w.ground(x, y)
  if (nav.level[c] <= g + nav.stepUp) continue  // plain low platform
  const k = w.surfacePrism(x, y, nav.level[c] + 0.01)
  const o = byPrism[k] || (byPrism[k] = { n: 0, pass: 0, main: 0, lvl: nav.level[c], minG: Infinity })
  o.n++; if (nav.pass[c]) o.pass++; if (nav.comp[c] === nav.mainComponent) o.main++; o.minG = Math.min(o.minG, g)
}
console.log('deck cells by supporting prism:')
for (const k of Object.keys(byPrism)) { const p = w.prisms[k], o = byPrism[k]; console.log('  prism', k, p.kind, 'base', p.base, 'top', p.top, 'cells', o.n, 'passable', o.pass, 'inMain', o.main, 'lowest terrain under', o.minG.toFixed(1), 'bbox', p.minX, p.minY, p.maxX, p.maxY) }
// low platforms count
let lowPlat = 0; for (let c = 0; c < nav.n; c++) if (nav.onTop[c] && nav.level[c] <= w.ground(nav.cellX(c), nav.cellY(c)) + nav.stepUp) lowPlat++
console.log('low platform cells (top within stepUp of terrain):', lowPlat)
// terrain map around the west bridges: print level grid rows (coarse) for x in [-512,-400], y in [-240,-40]
const ch = (c) => !nav.pass[c] ? (nav.wallDist[c] <= 0 ? '#' : (nav.onTop[c] ? 'x' : '.')) : (nav.onTop[c] ? 'D' : (nav.comp[c] === nav.mainComponent ? ' ' : 'o'))
for (let y = -40; y >= -240; y -= 4) {
  let s = ''
  for (let x = -510; x <= -396; x += 2) { const c = nav.idx(x, y); s += c < 0 ? '?' : ch(c) }
  console.log(String(y).padStart(5), s)
}
console.log('legend: # inside wall, . impassable (near wall / cliff), blank passable main comp, o passable other comp, D passable deck, x impassable deck')
// terrain heights along y=-56 from x=-512 to -400
let line = ''; for (let x = -512; x <= -400; x += 4) line += w.ground(x, -56).toFixed(1) + ' '
console.log('ground along y=-56:', line)
line = ''; for (let x = -512; x <= -400; x += 4) line += w.ground(x, -150).toFixed(1) + ' '
console.log('ground along y=-150:', line)
