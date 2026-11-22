import { World } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
const mechAt = new Map() // t -> map id -> row
for (const f of frames) { const mm = new Map(); for (const m of f.m) mm.set(m[0], m); mechAt.set(f.t, mm) }
let nl = 0
for (const f of frames) for (const e of (f.ev || [])) {
  if (e.e !== 'laser') continue
  nl++
  const [ax, ay, az] = e.from, [bx, by, bz] = e.to
  const len = Math.hypot(bx - ax, by - ay, bz - az)
  const t = w.rayShot(ax, ay, az, bx, by, bz)
  const ux = (bx - ax) / len, uy = (by - ay) / len, uz = (bz - az) / len
  const t2 = w.rayShot(ax, ay, az, bx + ux, by + uy, bz + uz)
  const tb = w.rayShot(ax - ux * 3, ay - uy * 3, az - uz * 3, bx, by, bz)
  const sm = mechAt.get(e.t % 2 === 0 ? e.t : e.t + 1)?.get(e.id) || mechAt.get(e.t - 1)?.get(e.id)
  console.log('laser t', e.t, 'id', e.id, 'len', len.toFixed(2), 'hits', JSON.stringify(e.hits), 'rayShot t', t.toFixed(4), 'beyond+1m', (t2 * (len + 1)).toFixed(2), t2 < 1 ? 'HIT' : 'clear', 'endZ-ground', (bz - w.ground(bx, by)).toFixed(2), 'endInSolid', w.inSolid(bx, by, bz), 'from-shooter', sm ? [(ax - sm[1]).toFixed(2), (ay - sm[2]).toFixed(2), (az - sm[3]).toFixed(2), 'cubes', sm[9]].join(',') : '?')
}
// impacts
let ni = 0, nNull = 0; const kinds = {}
const projLast = new Map()
const res = { nullOnGeom: 0, nullOff: 0, pathClear: 0, pathBlocked: 0 }
const offs = []
for (const f of frames) {
  for (const e of (f.ev || [])) {
    if (e.e !== 'impact') continue
    ni++
    const key = e.hit === null ? 'null' : e.hit === undefined ? 'absent' : (e.hit >= 1000 ? 'crate' : e.hit >= 100 ? 'npc' : 'mech')
    kinds[key] = (kinds[key] || 0) + 1
    if (e.hit === null || e.hit === undefined) {
      const [x, y, z] = e.at
      // distance to geometry: probe 26 directions up to 1.5 m
      let near = w.inSolid(x, y, z)
      let dmin = near ? 0 : Infinity
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        if (!a && !b && !c) continue
        const l = Math.hypot(a, b, c), R = 3
        const t = w.rayShot(x, y, z, x + a / l * R, y + b / l * R, z + c / l * R)
        if (t < 1) dmin = Math.min(dmin, t * R)
      }
      const pl = projLast.get(e.p)
      let path = null
      if (pl) { path = w.rayShot(pl[2], pl[3], pl[4], x, y, z) }
      if (dmin <= 1.5) res.nullOnGeom++; else { res.nullOff++; offs.push([e.t, e.p, x, y, z, +dmin.toFixed(2), (z - w.ground(x, y)).toFixed(2), pl ? pl[1] : '?', pl ? Math.hypot(x - pl[2], y - pl[3], z - pl[4]).toFixed(1) : '?']) }
      if (path !== null) { if (path >= 0.97) res.pathClear++; else res.pathBlocked++ }
    }
  }
  for (const p of (f.p || [])) projLast.set(p[0], p)
}
console.log('lasers', nl, 'impacts', ni, JSON.stringify(kinds), JSON.stringify(res))
for (const o of offs.slice(0, 30)) console.log('  off-geometry impact', JSON.stringify(o))
