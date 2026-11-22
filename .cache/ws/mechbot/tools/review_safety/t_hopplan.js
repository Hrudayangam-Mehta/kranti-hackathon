// nav.hopPlan from cells of component 16: does a plan exist, how high is the climb, how long does the call take.
import { realHello, loadMap, pct } from './common.js'
const { world, nav } = await loadMap(realHello())
const cells = []
for (let c = 0; c < nav.n; c += 37) if (nav.comp[c] === 16) cells.push(c)
const ts = [], climbs = [], walks = []; let none = 0
for (const c of cells) {
  const x = nav.cellX(c), y = nav.cellY(c)
  let best = Infinity, r = null
  for (let k = 0; k < 3; k++) { const t0 = performance.now(); r = nav.hopPlan(x, y, { toward: [41, -72] }); best = Math.min(best, performance.now() - t0) }
  ts.push(best)
  if (!r) none++; else { climbs.push(r.climb); walks.push(r.walkLen) }
}
console.log(`hopPlan from ${cells.length} cells of component 16: no plan for ${none}; call time p50 ${pct(ts, 0.5).toFixed(2)} max ${Math.max(...ts).toFixed(2)} ms (min of 3)`)
console.log(`climb needed (m): min ${Math.min(...climbs).toFixed(1)} p50 ${pct(climbs, 0.5).toFixed(1)} max ${Math.max(...climbs).toFixed(1)}; walk to the launch cell (m): p50 ${pct(walks, 0.5).toFixed(0)} max ${Math.max(...walks).toFixed(0)}`)
const r = nav.hopPlan(-307.02, 106.14, { toward: [41, -72] })
console.log('plan from the replay spawn (-307.02, 106.14):', JSON.stringify(r))
// other pockets >= 25 cells
for (let k = 0; k < nav.compSizes.length; k++) if (k !== nav.mainComponent && nav.compSizes[k] >= 25) { let c0 = -1; for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k) { c0 = c; break } const p = nav.hopPlan(nav.cellX(c0), nav.cellY(c0)); console.log(`pocket ${k} (${nav.compSizes[k]} cells) at (${nav.cellX(c0).toFixed(0)},${nav.cellY(c0).toFixed(0)}): ${p ? 'climb ' + p.climb.toFixed(1) + ' m, hop ' + p.hopLen.toFixed(0) + ' m' : 'NO HOP PLAN'}`) }
