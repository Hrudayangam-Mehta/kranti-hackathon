import { World } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const json = JSON.parse(readFileSync(P + 'kit/arena/v2/world.json', 'utf8'))
const tb = readFileSync(P + 'kit/arena/v2/terrain.i16')
const i16 = new Int16Array(tb.buffer.slice(tb.byteOffset, tb.byteOffset + tb.byteLength))
const Cls = new Function(readFileSync(P + 'notes/official_client_collision_reference.min.js', 'utf8') + '\n;return Sf;')()
const R = new Cls({ ...json, water: [] }, i16)
const cases = [[-181.92,174.32,36.78,23.73,158.06,6.18], [-289.88,-74.89,35.6,-339.35,93.07,38.33], [-205.37,353.36,3.2,-351.65,194.32,50.66], [-366.07,-98.72,30.56,-283.78,43.29,41.43]]
for (const s of cases) {
  const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2])
  const mine = w.rayShot(...s), r = R.raycast(...s, { trunks: false })
  console.log('case', s.join(','), 'len', len.toFixed(1))
  console.log('  mine t', mine, 'dist', (mine * len).toFixed(2), '| ref', r ? [r.t, r.kind, (r.t * len).toFixed(2)].join(' ') : 'clear')
  // exact fine march to find the true first terrain crossing
  let first = -1
  for (let k = 0; k <= 200000; k++) { const t = k / 200000; if (s[2] + (s[5] - s[2]) * t < w.ground(s[0] + (s[3] - s[0]) * t, s[1] + (s[4] - s[1]) * t)) { first = t; break } }
  console.log('  fine-march first below-ground t', first, 'dist', (first * len).toFixed(2))
  const hx = s[0] + (s[3] - s[0]) * mine, hy = s[1] + (s[4] - s[1]) * mine, hz = s[2] + (s[5] - s[2]) * mine
  console.log('  my hit point', hx.toFixed(2), hy.toFixed(2), hz.toFixed(2), 'ground', w.ground(hx, hy).toFixed(2), 'prismAt', w.prismAt(hx, hy, hz))
  // depth profile near my hit
  let minClear = Infinity, tAt = 0
  for (let k = 0; k <= 20000; k++) { const t = k / 20000; const c = s[2] + (s[5] - s[2]) * t - w.ground(s[0] + (s[3] - s[0]) * t, s[1] + (s[4] - s[1]) * t); if (c < minClear) { minClear = c; tAt = t } }
  console.log('  min clearance above terrain along the ray', minClear.toFixed(3), 'at dist', (tAt * len).toFixed(2))
}
