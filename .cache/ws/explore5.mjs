import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
const info = nav.compSizes.map((s, k) => ({ k, s, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, sx: 0, sy: 0 }))
for (let c = 0; c < nav.n; c++) { const k = nav.comp[c]; if (k < 0) continue; const x = nav.cellX(c), y = nav.cellY(c), o = info[k]; o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); o.sx += x; o.sy += y }
info.sort((a, b) => b.s - a.s)
for (const o of info.slice(0, 14)) console.log('comp', o.k, 'cells', o.s, 'bbox', o.x0, o.x1, o.y0, o.y1, 'centroid', (o.sx / o.s).toFixed(0), (o.sy / o.s).toFixed(0))
console.log('stadium centre', w.ground(-276.31, 128.71), 'comp at stadium centre', nav.component(-276.31, 128.71))
// replay: component of grounded positions
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
const cc = {}; let tot = 0, near = 0, far = 0; const farL = []
const trans = {}
const lastComp = new Map()
for (const f of frames) for (const m of f.m) {
  const [id, x, y, z, , , hp, , flags] = m
  if (hp <= 0 || !(flags & 1)) continue
  const c = nav.idx(x, y)
  if (c < 0) continue
  if (Math.abs(z - nav.level[c]) > 0.6) continue
  tot++
  const k = nav.comp[c]
  cc[k] = (cc[k] || 0) + 1
  if (k < 0) {
    const q = nav.nearestPassableIdx(x, y, 2 + 1.5)
    const d = q < 0 ? Infinity : Math.hypot(nav.cellX(q) - x, nav.cellY(q) - y)
    if (d <= 2) near++; else { far++; if (farL.length < 400) farL.push([f.t, id, +x.toFixed(1), +y.toFixed(1), z, +nav.wallDist[c].toFixed(2), +nav.lowCeil[c].toFixed(1), nav.onTop[c], +nav.level[c].toFixed(2), +d.toFixed(1)]) }
  } else {
    const lc = lastComp.get(id)
    if (lc !== undefined && lc !== k) { const key = lc + '->' + k; trans[key] = (trans[key] || 0) + 1 }
    lastComp.set(id, k)
  }
}
console.log('ground-level grounded samples', tot, 'by comp', JSON.stringify(cc), 'impassable but within 2m of passable', near, 'far', far)
console.log('component transitions on foot (should be none):', JSON.stringify(trans))
for (const r of farL.slice(0, 40)) console.log('  far', JSON.stringify(r))
