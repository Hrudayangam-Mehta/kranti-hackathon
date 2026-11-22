import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
for (const o of [{}, { wallMargin: 0, headMargin: 0 }, { wallMargin: 0, headMargin: 0, maxSlopeDeg: 89 }, { wallMargin: -0.5, headMargin: -1, maxSlopeDeg: 89 }, { maxSlopeDeg: 89 }, {maxSlopeDeg: 60}]) {
  const nav = new Nav(w, o)
  const a = nav.component(-276.31, 128.71), b = nav.component(0, 0)
  console.log(JSON.stringify(o), 'stadium comp', a, 'size', nav.compSizes[a], 'main', nav.mainComponent, nav.compSizes[nav.mainComponent], 'same as (0,0):', a === b, 'ncomp', nav.compSizes.length)
}
// Where does the stadium component touch its boundary? Print cells of comp8 adjacent to impassable cells with largest wallDist (i.e. limited by slope)
const nav = new Nav(w)
const k8 = nav.component(-276.31, 128.71)
let slopeEdges = 0; const ex = []
for (let c = 0; c < nav.n; c++) {
  if (nav.comp[c] !== k8) continue
  for (let d = 0; d < 8; d++) {
    const nb = c + nav._off[d]
    if (nav.pass[nb] && nav.comp[nb] !== k8) { slopeEdges++; if (ex.length < 10) ex.push([nav.cellX(c), nav.cellY(c), nav.level[c].toFixed(1), nav.cellX(nb), nav.cellY(nb), nav.level[nb].toFixed(1), nav.comp[nb]]) }
  }
}
console.log('edges from stadium comp to other passable comps (blocked by slope/diag):', slopeEdges, JSON.stringify(ex))
// level range in comp 8
let lo = Infinity, hi = -Infinity
for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k8) { lo = Math.min(lo, nav.level[c]); hi = Math.max(hi, nav.level[c]) }
console.log('stadium comp level range', lo.toFixed(1), hi.toFixed(1))
