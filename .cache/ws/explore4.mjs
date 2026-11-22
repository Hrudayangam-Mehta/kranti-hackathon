import { World, pointInEdges } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
const grad = (x, y) => [(w.ground(x + 1, y) - w.ground(x - 1, y)) / 2, (w.ground(x, y + 1) - w.ground(x, y - 1)) / 2]
const prev = new Map()
const M = { step: [], dirDst: [], dirSrc: [], dirMid: [], magDst: [], magSrc: [], dir1mFwd: [], dir2: [] }
const rows = []
let under = []
for (const f of frames) for (const m of f.m) {
  const [id, x, y, z, , , hp, en, flags, cubes] = m
  if (hp <= 0) { prev.delete(id); continue }
  if (flags & 1) {
    const c = w.ceilingZ(x, y, z + 1.3)
    if (c < Infinity && c - z < 30) under.push([c - z, cubes, f.t, id, +x.toFixed(1), +y.toFixed(1), z])
  }
  const p = prev.get(id)
  if (p && f.t - p.t === 2 && (flags & 1) && (p.flags & 1)) {
    const run = Math.hypot(x - p.x, y - p.y)
    const g0 = w.ground(p.x, p.y), g1 = w.ground(x, y)
    if (run > 0.2 && Math.abs(z - g1) < 0.05 && Math.abs(p.z - g0) < 0.05 && z > p.z) {
      const ux = (x - p.x) / run, uy = (y - p.y) / run
      const gd = grad(x, y), gs = grad(p.x, p.y), gm = grad((x + p.x) / 2, (y + p.y) / 2)
      const r = { step: (z - p.z) / run, dirDst: gd[0] * ux + gd[1] * uy, dirSrc: gs[0] * ux + gs[1] * uy, dirMid: gm[0] * ux + gm[1] * uy,
        magDst: Math.hypot(gd[0], gd[1]), magSrc: Math.hypot(gs[0], gs[1]),
        dir1mFwd: (w.ground(p.x + ux, p.y + uy) - g0), dir2: (w.ground(x + ux, y + uy) - w.ground(x - ux, y - uy)) / 2, rise: z - p.z, run, t: f.t, id }
      rows.push(r)
      for (const k in M) M[k].push(r[k])
    }
  }
  prev.set(id, { t: f.t, x, y, z, flags })
}
const q = (a, p) => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
console.log('uphill terrain moves n', rows.length, 'tan50 = 1.1918')
for (const k in M) console.log(' ', k.padEnd(9), 'max', q(M[k], 1).toFixed(3), 'p99.9', q(M[k], .999).toFixed(3), 'p99', q(M[k], .99).toFixed(3), 'count>1.192:', M[k].filter(v => v > 1.192).length)
console.log('max rise per 0.1s step', q(rows.map(r => r.rise), 1).toFixed(3))
rows.sort((a, b) => b.step - a.step)
for (const r of rows.slice(0, 8)) console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(3)]))))
under.sort((a, b) => a[0] - b[0])
console.log('grounded under a prism: n', under.length, 'lowest clearances [clear, cubes, t, id, x, y, z]:'); for (const u of under.slice(0, 12)) console.log('  ', JSON.stringify(u.map(v => +(+v).toFixed(2))))
const viol = under.filter(u => u[0] < 9 * (1 + 0.05 * u[1]) - 0.01)
console.log('frames with clearance below scaled height:', viol.length, viol.slice(0, 8).map(u => u.map(v => +(+v).toFixed(2)).join(',')).join(' | '))
