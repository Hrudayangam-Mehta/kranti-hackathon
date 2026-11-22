import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
const info = nav.compSizes.map((s, k) => ({ k, s, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, lo: Infinity, hi: -Infinity }))
for (let c = 0; c < nav.n; c++) { const k = nav.comp[c]; if (k < 0) continue; const x = nav.cellX(c), y = nav.cellY(c), o = info[k]; o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); o.lo = Math.min(o.lo, nav.level[c]); o.hi = Math.max(o.hi, nav.level[c]) }
info.sort((a, b) => b.s - a.s)
for (const o of info.slice(0, 16)) console.log('comp', o.k, 'cells', o.s, 'bbox x', o.x0.toFixed(0), o.x1.toFixed(0), 'y', o.y0.toFixed(0), o.y1.toFixed(0), 'level', o.lo.toFixed(1), o.hi.toFixed(1))
const small = info.filter(o => o.s < 20).length
console.log('components <20 cells:', small, 'total cells in non-main comps', info.slice(1).reduce((s, o) => s + o.s, 0))
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
const cc = {}
for (const f of frames) for (const m of f.m) {
  if (m[6] <= 0 || !(m[8] & 1)) continue
  const c = nav.idx(m[1], m[2]); if (c < 0 || Math.abs(m[3] - nav.level[c]) > 0.6) continue
  const k = nav.component(m[1], m[2]); cc[k] = (cc[k] || 0) + 1
}
console.log('replay ground samples by component (nearest within 6 m):', JSON.stringify(cc))
// stadium ascii: comp id letters, y from 270 down to -20, x -390..-165, step 4
const ids = info.slice(0, 30).map(o => o.k)
for (let y = 270; y >= -20; y -= 6) {
  let s = ''
  for (let x = -390; x <= -165; x += 3) { const c = nav.idx(x, y); const k = nav.comp[c]; s += k < 0 ? (nav.wallDist[c] <= 0 ? '#' : '.') : (k === nav.mainComponent ? ' ' : String.fromCharCode(97 + Math.min(25, ids.indexOf(k) < 0 ? 25 : ids.indexOf(k)))) }
  console.log(String(y).padStart(4), s)
}
