import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
let t = performance.now()
const w = World.loadSync(P + 'kit/arena')
const t1 = performance.now()
const nav = new Nav(w)
const t2 = performance.now()
console.log('world ms', (t1 - t).toFixed(1), 'nav ms', (t2 - t1).toFixed(1), 'grid', nav.nx, nav.ny, nav.n)
let p = 0; for (let c = 0; c < nav.n; c++) p += nav.pass[c]
console.log('passable', p, (p / nav.n * 100).toFixed(1) + '%', 'components', nav.compSizes.length, 'main', nav.mainComponent, nav.compSizes[nav.mainComponent], 'promoted', nav.promotedCells, 'slopeCut', nav.slopeCutEdges)
const sizes = [...nav.compSizes].sort((a, b) => b - a).slice(0, 12)
console.log('top comps', sizes)
t = performance.now()
const r = nav.findPath(-360, -31, 393, 193)
console.log('path ms', (performance.now() - t).toFixed(2), r.ok, r.partial, r.pts.length, r.len.toFixed(1), r.expanded)
t = performance.now(); nav.setBody(3.0, 10.8); console.log('setBody ms', (performance.now() - t).toFixed(2))
