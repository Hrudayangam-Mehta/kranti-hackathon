// First (cold) vs later hopPlan cost on a pocket of each map, and what the warm-up's fixed point (-307, 106) hits.
// usage: bun hopcold.mjs <bot dir> <map name>
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const [BOT, NAME] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(BOT, 'lib', 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(BOT, 'lib', 'nav.js')).href)
const w = World.loadSync(join(HERE, NAME))
const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const c0 = nav.component(-307, 106)
const inB = (x, y) => x > w.bounds.minX && x < w.bounds.maxX && y > w.bounds.minY && y < w.bounds.maxY
// largest pocket
let k = -1, s = 0
for (let i = 0; i < nav.compSizes.length; i++) if (i !== nav.mainComponent && nav.compSizes[i] > s) { s = nav.compSizes[i]; k = i }
let cell = -1
for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k) { cell = c; break }
const x = nav.cellX(cell), y = nav.cellY(cell)
let t0 = performance.now(); const p1 = nav.hopPlan(x, y, { toward: [0, 0] }); const t1 = performance.now() - t0
t0 = performance.now(); nav.hopPlan(x, y, { toward: [0, 0] }); const t2 = performance.now() - t0
console.log(`${NAME}: warm-up point (-307,106) in bounds ${inB(-307, 106)} component ${c0} (main ${nav.mainComponent}, pocket=${c0 >= 0 && c0 !== nav.mainComponent}); largest pocket ${s} cells at (${x.toFixed(0)},${y.toFixed(0)}): first hopPlan ${t1.toFixed(1)} ms, second ${t2.toFixed(1)} ms, plan ${p1 ? 'found' : 'none'}`)
