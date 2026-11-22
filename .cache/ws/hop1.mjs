import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
let t = performance.now()
const nav = new Nav(w)
console.log('nav build incl hops', (performance.now() - t).toFixed(1), 'ms')
const k = nav.component(-276.31, 128.71)
const cand = nav._hopCandidates(k, 45)
console.log('stadium comp', k, 'size', nav.compSizes[k], 'hop candidates', cand.n)
const climbs = []; for (let q = 0; q < cand.n; q++) climbs.push(cand.apex[q] - nav.level[cand.launch[q]])
climbs.sort((a, b) => a - b); console.log('climb needed: min', climbs[0]?.toFixed(1), 'p10', climbs[Math.floor(climbs.length * .1)]?.toFixed(1), 'p50', climbs[Math.floor(climbs.length / 2)]?.toFixed(1), 'max', climbs[climbs.length - 1]?.toFixed(1))
for (const [x, y, toward] of [[-307.02, 106.14, null], [-276.31, 128.71, [41.3, -72.8]], [-276.31, 128.71, [-500, 128]], [-250, 30, [0, 0]], [-300, 230, null]]) {
  t = performance.now()
  const pl = nav.hopPlan(x, y, toward ? { toward } : undefined)
  const ms = performance.now() - t
  console.log('from', x, y, 'toward', toward, '->', pl ? JSON.stringify(Object.fromEntries(Object.entries(pl).map(([kk, v]) => [kk, Array.isArray(v) ? v.map(q => +q.toFixed(1)) : +v.toFixed(1)]))) : null, ms.toFixed(2), 'ms')
  if (pl) { const r = nav.findPath(x, y, pl.launch[0], pl.launch[1]); console.log('   walk path ok', r.ok, 'len', r.len.toFixed(0), 'reachable(land, origin 0,0):', nav.reachable(pl.land[0], pl.land[1], 0, 0)) }
}
console.log('main comp point ->', nav.hopPlan(0, 0))
// other pockets
for (let kk = 0; kk < nav.compSizes.length; kk++) {
  if (kk === nav.mainComponent || nav.compSizes[kk] < 30) continue
  let c0 = -1; for (let c = 0; c < nav.n; c++) if (nav.comp[c] === kk) { c0 = c; break }
  t = performance.now(); const pl = nav.hopPlan(nav.cellX(c0), nav.cellY(c0)); const ms = performance.now() - t
  console.log('pocket', kk, 'size', nav.compSizes[kk], 'level', nav.level[c0].toFixed(1), 'plan', pl ? `climb ${pl.climb.toFixed(1)} hop ${pl.hopLen.toFixed(1)} walk ${pl.walkLen.toFixed(0)}` : null, ms.toFixed(2), 'ms')
}
