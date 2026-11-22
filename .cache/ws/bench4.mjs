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
  let t = performance.now()
  for (let k = 0; k < N; k++) if (nav.walkLine(S[k * 4], S[k * 4 + 1], S[k * 4 + 2], S[k * 4 + 3])) ok++
  const a = (performance.now() - t) * 1000 / N
  t = performance.now(); let acc = 0
  for (let k = 0; k < N; k++) acc += w.surfaceZ(S[k * 4], S[k * 4 + 1]) + nav.wallDistAt(S[k * 4 + 2], S[k * 4 + 3]) + nav.idx(S[k * 4], S[k * 4 + 1])
  const b = (performance.now() - t) * 1000 / N
  t = performance.now()
  for (let k = 0; k < N; k++) acc += w.rayShot(S[k * 4], S[k * 4 + 1], 10, S[k * 4 + 2], S[k * 4 + 3], 6)
  const c = (performance.now() - t) * 1000 / N
  console.log(label.padEnd(22), 'walkLine', a.toFixed(3), 'us | surfaceZ+wallDistAt+idx', b.toFixed(3), 'us | rayShot', c.toFixed(3), 'us')
}
bench('fresh'); bench('fresh2')
nav.walkLine(0, 0, 0, Infinity); nav.walkLine(0, 0, 1e9, 1e9)
bench('after inf/far end'); bench('again')
nav.walkLine(NaN, 0, 0, 0); nav.walkLine(1e9, 1e9, 0, 0)
bench('after NaN start'); bench('again')
nav.idx(NaN, 0); nav.wallDistAt(NaN, 0); w.surfaceZ(NaN, 0); w.rayShot(NaN, 0, 5, 0, 0, 5); w.ground(NaN, 1); nav.findPath(NaN, 0, 0, 0); nav.passableAt(1e9, 1e9)
bench('after NaN points'); bench('again')
