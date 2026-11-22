import { World, pointInEdges } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
function wallDist(x, y, z, height, step) {
  let best = Infinity, who = -1
  for (const p of w.prisms) {
    if (p.top <= z + step || p.base >= z + height) continue
    const E = p.edges
    if (x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY && pointInEdges(E, 0, E.length, x, y)) return [0, p.id]
    for (let i = 0; i < E.length; i += 4) {
      const x0 = E[i], y0 = E[i + 1], ex = E[i + 2] - x0, ey = E[i + 3] - y0, l2 = ex * ex + ey * ey
      let u = l2 > 0 ? ((x - x0) * ex + (y - y0) * ey) / l2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u
      const d = Math.hypot(x0 + ex * u - x, y0 + ey * u - y)
      if (d < best) { best = d; who = p.id }
    }
  }
  return [best, who]
}
const byC = {}
const prev = new Map(); const ups = []
for (const f of frames) for (const m of f.m) {
  const [id, x, y, z, , , hp, en, flags, cubes] = m
  if (hp <= 0) { prev.delete(id); continue }
  if (flags & 1) {
    const [d, who] = wallDist(x, y, z, 9, 1.2)
    const b = byC[cubes] || (byC[cubes] = { n: 0, min: Infinity, lt: 0, who: -1, at: null })
    b.n++; if (d < b.min) { b.min = d; b.who = who; b.at = [f.t, id, x, y, z] }
    if (d < 2.5 * (1 + 0.05 * cubes) - 0.02) b.lt++
  }
  const p = prev.get(id)
  if (p && f.t - p.t === 2 && (flags & 1) && (p.flags & 1)) {
    const run = Math.hypot(x - p.x, y - p.y)
    const g0 = w.ground(p.x, p.y), g1 = w.ground(x, y)
    if (run > 0.3 && Math.abs(z - g1) < 0.05 && Math.abs(p.z - g0) < 0.05) {
      // max 1m-sample slope along the step
      const nS = Math.max(1, Math.ceil(run / 0.25)); let mx = -Infinity, pg = g0
      for (let s = 1; s <= nS; s++) { const gg = w.ground(p.x + (x - p.x) * s / nS, p.y + (y - p.y) * s / nS); mx = Math.max(mx, (gg - pg) / (run / nS)); pg = gg }
      const gx = (w.ground(x + 1, y) - w.ground(x - 1, y)) / 2, gy = (w.ground(x, y + 1) - w.ground(x, y - 1)) / 2
      ups.push([(z - p.z) / run, mx, Math.hypot(gx, gy), f.t, id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +run.toFixed(2)])
    }
  }
  prev.set(id, { t: f.t, x, y, z, flags })
}
console.log('grounded wall distance by cubes (collision radius check):')
for (const c of Object.keys(byC)) console.log('  cubes', c, 'n', byC[c].n, 'min d', byC[c].min.toFixed(3), 'prism', byC[c].who, 'frames below scaled R', byC[c].lt, 'scaledR', (2.5 * (1 + 0.05 * c)).toFixed(3), JSON.stringify(byC[c].at))
ups.sort((a, b) => b[0] - a[0])
console.log('top uphill steps [slope, max0.25mSlope, |grad|, t,id,x0,y0,z0,x1,y1,z1,run]:'); for (const u of ups.slice(0, 15)) console.log('  ', JSON.stringify(u.map(v => typeof v === 'number' ? +v.toFixed(3) : v)))
// terrain steepness census
const tan50 = Math.tan(50 * Math.PI / 180)
let steepEdges = 0, edges = 0, steepCells = 0
const nx = w.tnx, ny = w.tny, h = w.h
let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity
const reg = {}
for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
  const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i]
  edges += 2
  const s1 = Math.abs(b - a), s2 = Math.abs(c - a)
  if (s1 > tan50) steepEdges++; if (s2 > tan50) steepEdges++
  if (Math.hypot(b - a, c - a) > tan50) { steepCells++; const k = Math.floor((w.tMinX + i) / 100) + ',' + Math.floor((w.tMinY + j) / 100); reg[k] = (reg[k] || 0) + 1 }
}
console.log('terrain: steep 1m edges (>tan50)', steepEdges, 'of', edges, (steepEdges / edges * 100).toFixed(3) + '%', 'steep cells (grad)', steepCells)
console.log('steep cells per 100m tile (x,y floor/100):', JSON.stringify(reg))
