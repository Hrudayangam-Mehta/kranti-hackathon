import { World } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const header = lines[0], frames = lines.filter(l => l.m)
console.log('frames', frames.length, 'last t', frames[frames.length - 1].t)
// 1. grounded z vs surface
let n = 0, okc = 0; const outl = []
let onPrism = 0, onTerr = 0
const roofZ = []
for (const f of frames) for (const m of f.m) {
  const [id, x, y, z, , , hp, , flags] = m
  if (hp <= 0) continue
  if (!(flags & 1)) continue
  n++
  const s = w.surfaceZ(x, y, z + 1.3)
  const d = z - s
  if (Math.abs(d) <= 0.15) okc++; else outl.push([f.t, id, x, y, z, s, +d.toFixed(2), w.ground(x, y)])
  const g = w.ground(x, y)
  if (z > g + 0.3) { onPrism++; roofZ.push(z - g) } else onTerr++
}
console.log('grounded samples', n, 'within 0.15:', okc, (okc / n * 100).toFixed(3) + '%', 'on prism tops', onPrism, 'on terrain', onTerr)
outl.sort((a, b) => Math.abs(b[6]) - Math.abs(a[6]))
console.log('worst outliers [t,id,x,y,z,surf,d,ground]:'); for (const o of outl.slice(0, 25)) console.log(' ', JSON.stringify(o))
console.log('outlier count', outl.length)
// histogram of d for outliers
const hist = {}
for (const o of outl) { const k = Math.round(o[6] * 2) / 2; hist[k] = (hist[k] || 0) + 1 }
console.log('outlier d hist', JSON.stringify(hist))
roofZ.sort((a, b) => a - b)
console.log('roof heights above terrain (grounded on prism): n', roofZ.length, 'p10', roofZ[Math.floor(roofZ.length * .1)], 'p50', roofZ[Math.floor(roofZ.length * .5)], 'p90', roofZ[Math.floor(roofZ.length * .9)], 'max', roofZ[roofZ.length - 1])
// 2. in solid
let ns = 0, ins = 0; const insl = []
for (const f of frames) for (const m of f.m) {
  if (m[6] <= 0) continue
  ns++
  if (w.inSolid(m[1], m[2], m[3] + 4.5)) { ins++; if (insl.length < 20) insl.push([f.t, m[0], m[1], m[2], m[3], w.ground(m[1], m[2]), w.prismAt(m[1], m[2], m[3] + 4.5)]) }
}
console.log('inSolid at body height', ins, '/', ns, insl)
