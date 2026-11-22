import { World, pointInEdges } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
// exact wall distance brute force for body at feet z, height h, step s
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
// speeds
const prev = new Map()
let maxWalk = 0, maxBoost = 0, maxAir = 0; const walkS = [], boostS = []
let minTrunk = Infinity, trunkClose = 0, trunkInside = 0, nAll = 0
const wd = []; let minWall = Infinity; const wallViol = []
const upSlopes = []
let maxRiseRate = 0, maxFall = 0
for (const f of frames) {
  for (const m of f.m) {
    const [id, x, y, z, , , hp, en, flags, cubes] = m
    if (hp <= 0) { prev.delete(id); continue }
    nAll++
    const scale = 1 + 0.05 * cubes, R = 2.5 * scale, H = 9 * scale
    // trunks
    for (const t of w.trees) {
      const d = Math.hypot(x - t.x, y - t.y)
      if (d < 6 && t.trunkTop > z + 1.2 && t.z - 1 < z + H) {
        if (d < minTrunk) minTrunk = d
        if (d < R + t.trunkR - 0.05) trunkClose++
        if (d < t.trunkR) trunkInside++
      }
    }
    const [d, who] = wallDist(x, y, z, H, 1.2)
    wd.push(d - R)
    if (d - R < minWall) minWall = d - R
    if (d < R - 0.05) wallViol.push([f.t, id, +x.toFixed(2), +y.toFixed(2), z, cubes, +d.toFixed(3), who, flags])
    const p = prev.get(id)
    if (p && f.t - p.t === 2) {
      const sp = Math.hypot(x - p.x, y - p.y) / 0.1
      const vz = (z - p.z) / 0.1
      if ((flags & 1) && (p.flags & 1)) {
        if (flags & 2 && p.flags & 2) { boostS.push(sp); if (sp > maxBoost) maxBoost = sp }
        else if (!(flags & 2) && !(p.flags & 2)) { walkS.push(sp); if (sp > maxWalk) maxWalk = sp }
        const run = Math.hypot(x - p.x, y - p.y)
        const g0 = w.ground(p.x, p.y), g1 = w.ground(x, y)
        if (run > 0.3 && Math.abs(z - g1) < 0.05 && Math.abs(p.z - g0) < 0.05) upSlopes.push((z - p.z) / run)
      } else {
        if (sp > maxAir) maxAir = sp
        if (vz > maxRiseRate) maxRiseRate = vz
        if (vz < maxFall) maxFall = vz
      }
    }
    prev.set(id, { t: f.t, x, y, z, flags })
  }
}
const q = (a, p) => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
console.log('walk speed max', maxWalk.toFixed(2), 'p50', q(walkS, .5).toFixed(2), 'p95', q(walkS, .95).toFixed(2), 'p99', q(walkS, .99).toFixed(2), 'n', walkS.length)
console.log('boost speed max', maxBoost.toFixed(2), 'p50', q(boostS, .5).toFixed(2), 'p95', q(boostS, .95).toFixed(2), 'p99', q(boostS, .99).toFixed(2), 'n', boostS.length)
console.log('air horiz max', maxAir.toFixed(2), 'max rise rate', maxRiseRate.toFixed(2), 'max fall', maxFall.toFixed(2))
console.log('trunk: min dist', minTrunk.toFixed(2), 'frames within R+trunkR', trunkClose, 'inside trunk', trunkInside, 'of', nAll)
console.log('wall margin (dist - R): min', minWall.toFixed(3), 'p0.1%', q(wd, .001).toFixed(3), 'p1%', q(wd, .01).toFixed(3), 'p5%', q(wd, .05).toFixed(3), 'p50', q(wd, .5).toFixed(2))
console.log('wall violations (d < R-0.05):', wallViol.length); for (const v of wallViol.slice(0, 30)) console.log('  ', JSON.stringify(v))
console.log('uphill slope (rise/run on terrain) max', q(upSlopes, 1).toFixed(3), 'p99.9', q(upSlopes, .999).toFixed(3), 'p99', q(upSlopes, .99).toFixed(3), 'min', q(upSlopes, 0).toFixed(3), 'n', upSlopes.length, 'tan50', Math.tan(50 * Math.PI / 180).toFixed(3))
