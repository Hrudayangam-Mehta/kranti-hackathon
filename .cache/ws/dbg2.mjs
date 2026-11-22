import { World, pointInPrism2D, distToPrismEdge2D } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
const r = nav.findPath(-475.38, 303.91, -411.38, -108.08999999999997)
console.log(r.ok, JSON.stringify(r.pts.map(p => p.map(v => +v.toFixed(2)))))
for (const [x, y] of [[-418.2, -53.6], [-425.8, -223.9], [-484.9, -185.9]]) {
  const c = nav.idx(x, y)
  const lv = nav.level[c], g = w.ground(x, y)
  const z = w.surfaceZ(x, y, lv + 0.6)
  console.log('pt', x, y, 'cell centre', nav.cellX(c), nav.cellY(c), 'level', lv.toFixed(2), 'onTop', nav.onTop[c], 'deck', nav.deck[c], 'pass', nav.pass[c], 'ground@pt', g.toFixed(2), 'ground@centre', nav.groundZ[c].toFixed(2), 'z used', z.toFixed(2), 'surfaceZ(pt, lv+.01)', w.surfaceZ(x, y, lv + 0.01).toFixed(2), 'wallDistAt', nav.wallDistAt(x, y).toFixed(2), 'wd cell', nav.wallDist[c].toFixed(2))
  for (const p of w.prisms) {
    if (p.top <= z + 1.2 || p.base >= z + 9) continue
    const inside = pointInPrism2D(p, x, y), d = distToPrismEdge2D(p, x, y)
    if (inside || d < 2.5) console.log('   blocking prism', p.id, p.kind, 'base', p.base, 'top', p.top, 'inside', inside, 'edge dist', d.toFixed(2))
  }
}
