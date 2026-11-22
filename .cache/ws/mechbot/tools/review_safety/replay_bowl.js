// Official replay (replay/mech16.jsonl.gz): which mechs are ever inside nav component 16 (stadium area), how they
// got in / out (walking = grounded and near the nav level, or airborne), and what happened to them.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { P, realHello, loadMap } from './common.js'
const { world, nav } = await loadMap(realHello())
const lines = gunzipSync(readFileSync(join(P, 'replay', 'mech16.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hdr = lines[0]
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
for (let c = 0; c < nav.n; c++) if (nav.comp[c] === 16) { const x = nav.cellX(c), y = nav.cellY(c); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
console.log(`component 16: ${nav.compSizes[16]} cells (${nav.compSizes[16] * 4} m2), bbox x ${minX}..${maxX}, y ${minY}..${maxY}; main component ${nav.compSizes[nav.mainComponent]} cells`)
const st = new Map()
for (const f of lines.slice(1)) {
  if (!f.m) continue
  const t = f.t / hdr.tick_hz
  for (const m of f.m) {
    const [id, x, y, z, , , hp, , flags] = m
    const c = nav.idx(x, y)
    const comp = c >= 0 ? nav.comp[c] : -2
    const grounded = (flags & 1) === 1
    let s = st.get(id); if (!s) { s = { in16: 0, first: -1, last: -1, events: [], prev: comp, lastT: t, hp, zc: null }; st.set(id, s) }
    s.lastT = t; s.hp = hp
    if (comp === 16 && grounded) { s.in16++; if (s.first < 0) s.first = t; s.last = t }
    if (grounded && comp >= 0 && comp !== s.prevG && s.prevG !== undefined && (comp === 16 || s.prevG === 16)) s.events.push(`t=${t.toFixed(1)} ${s.prevG}->${comp} at (${x.toFixed(0)},${y.toFixed(0)},z ${z.toFixed(1)}, nav level ${nav.level[c].toFixed(1)}), airborne just before: ${s.air ? 'yes' : 'no'}`)
    if (grounded && comp >= 0) { s.prevG = comp; s.air = false } else if (!grounded) s.air = true
  }
}
for (const [id, s] of [...st].sort((a, b) => a[0] - b[0])) if (s.in16 > 0) console.log(`mech ${id}: grounded inside comp 16 for ${(s.in16 * hdr.frame_every / hdr.tick_hz).toFixed(1)} s (t ${s.first.toFixed(1)}..${s.last.toFixed(1)}), last seen alive t=${s.lastT.toFixed(1)} hp ${s.hp}; transitions: ${s.events.slice(0, 6).join(' ; ') || 'none'}`)
