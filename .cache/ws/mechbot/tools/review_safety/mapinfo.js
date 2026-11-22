import { realHello, loadMap } from './common.js'
const t0 = performance.now()
const hello = realHello()
const { world, nav } = await loadMap(hello)
console.log('load ms', (performance.now() - t0).toFixed(0))
console.log('bounds', world.bounds, 'nav', nav.nx, nav.ny, 'comps', nav.compSizes.length, 'main', nav.mainComponent, nav.compSizes[nav.mainComponent])
const big = nav.compSizes.map((s, k) => [s, k]).filter((x) => x[0] >= 25).sort((a, b) => b[0] - a[0])
console.log('components >= 25 cells:', big.length)
for (const [s, k] of big.slice(0, 12)) {
  let sx = 0, sy = 0, n = 0
  for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k) { sx += nav.cellX(c); sy += nav.cellY(c); n++ }
  console.log(' comp', k, 'cells', s, 'centroid', (sx / n).toFixed(0), (sy / n).toFixed(0))
}
let pass = 0; for (let c = 0; c < nav.n; c++) pass += nav.pass[c]
console.log('passable cells', pass, 'of', nav.n)
console.log('prisms', world.prisms.length, 'trees', world.trees.length)
