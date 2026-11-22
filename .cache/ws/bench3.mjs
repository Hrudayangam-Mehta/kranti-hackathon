import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const cells = []; for (let c = 0; c < nav.n; c++) if (nav.comp[c] === nav.mainComponent) cells.push(c)
const N = 200000, S = new Float64Array(N * 4)
const B = w.bounds
for (let k = 0; k < N; k++) {
  const a = cells[(rnd() * cells.length) | 0]
  const ax = nav.cellX(a) + rnd() * 2 - 1, ay = nav.cellY(a) + rnd() * 2 - 1
  const ang = rnd() * 2 * Math.PI, len = 50 + rnd() * 150
  S[k * 4] = ax; S[k * 4 + 1] = ay; S[k * 4 + 2] = Math.min(B.maxX - 1, Math.max(B.minX + 1, ax + Math.cos(ang) * len)); S[k * 4 + 3] = Math.min(B.maxY - 1, Math.max(B.minY + 1, ay + Math.sin(ang) * len))
}
const bench = (label) => {
  let ok = 0
  const t = performance.now()
  for (let k = 0; k < N; k++) if (nav.walkLine(S[k * 4], S[k * 4 + 1], S[k * 4 + 2], S[k * 4 + 3])) ok++
  console.log(label, ((performance.now() - t) * 1000 / N).toFixed(3), 'us/call', (ok / N).toFixed(3))
}
bench('fresh'); bench('fresh2')
for (let k = 0; k < 500; k++) { const a = cells[(rnd() * cells.length) | 0], b = cells[(rnd() * cells.length) | 0]; nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b)) }
bench('after findPath'); bench('after findPath2')
const cost = new Float32Array(nav.n); for (let c = 0; c < nav.n; c++) cost[c] = (c % 7 === 0) ? 3 : 0
for (let k = 0; k < 300; k++) { const a = cells[(rnd() * cells.length) | 0], b = cells[(rnd() * cells.length) | 0]; nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b), { cost: (c) => cost[c] }) }
bench('after findPath+cost'); bench('after findPath+cost2')
nav.setBody(3.5, 12.6); nav.setBody(2.5, 9)
bench('after setBody'); bench('after setBody2')
for (let k = 0; k < 3000; k++) nav.walkLine(S[k * 4], S[k * 4 + 1], S[k * 4 + 2], S[k * 4 + 3], true)
bench('after strict'); bench('after strict2')
