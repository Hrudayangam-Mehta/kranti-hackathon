import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
import { Nav as NavOld } from './nav_before_split.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
let t = performance.now(); const a = new Nav(w); console.log('new build ms', (performance.now() - t).toFixed(1))
t = performance.now(); const b = new NavOld(w); console.log('old build ms', (performance.now() - t).toFixed(1))
for (const k of ['groundZ', 'level', 'onTop', 'deck', 'wallLo', 'headHi', 'wallDist', 'lowCeil', 'clearance', 'slopeOk', 'pass', 'steps', 'comp']) {
  let diff = 0; for (let c = 0; c < a.n; c++) if (a[k][c] !== b[k][c] && !(Number.isNaN(a[k][c]) && Number.isNaN(b[k][c]))) diff++
  console.log(k, 'differences', diff)
}
console.log('slopeCut', a.slopeCutEdges, b.slopeCutEdges, 'promoted', a.promotedCells, b.promotedCells)
