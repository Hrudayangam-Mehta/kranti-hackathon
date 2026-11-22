import { World } from './mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const lines = gunzipSync(readFileSync(P + 'replay/mech16.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map(JSON.parse)
const frames = lines.filter(l => l.m)
const projLast = new Map(), projFirst = new Map()
let byKind = {}
for (const f of frames) {
  for (const e of (f.ev || [])) {
    if (e.e !== 'impact' || !(e.hit === null || e.hit === undefined)) continue
    const pl = projLast.get(e.p); if (!pl) { byKind.noproj = (byKind.noproj || 0) + 1; continue }
    const [x, y, z] = e.at
    const t = w.rayShot(pl.p[2], pl.p[3], pl.p[4], x, y, z)
    const k = pl.p[1] + (t >= 0.97 ? ':clear' : ':blocked')
    byKind[k] = (byKind[k] || 0) + 1
    if (t < 0.97) {
      const len = Math.hypot(x - pl.p[2], y - pl.p[3], z - pl.p[4])
      // Try from first seen position
      const pf = projFirst.get(e.p)
      const t2 = w.rayShot(pf.p[2], pf.p[3], pf.p[4], x, y, z)
      console.log('blocked: t', e.t, 'p', e.p, 'kind', pl.p[1], 'lastFrame', pl.t, 'seg len', len.toFixed(1), 'hit frac', t.toFixed(3), 'hit at', (t * len).toFixed(1), 'from first frac', t2.toFixed(4), 'impact', x, y, z, 'last', pl.p.slice(2).join(','), 'ground@impact', w.ground(x, y).toFixed(2), 'prismAt', w.prismAt(x, y, z))
    }
  }
  for (const p of (f.p || [])) { projLast.set(p[0], { t: f.t, p }); if (!projFirst.has(p[0])) projFirst.set(p[0], { t: f.t, p }) }
}
console.log(JSON.stringify(byKind))
// fall damage check: hp change on landing after fast falls
const prev = new Map(); const lands = []
const hitsAt = new Map()
for (const f of frames) for (const e of (f.ev || [])) if (e.e === 'hit') { const k = e.dst; (hitsAt.get(k) || hitsAt.set(k, []).get(k)).push(e.t) }
for (const f of frames) for (const m of f.m) {
  const [id, x, y, z, , , hp, , flags] = m
  const p = prev.get(id)
  if (p && hp > 0 && (flags & 1) && !(p.flags & 1)) {
    const vz = (z - p.z) / 0.1
    if (vz < -15) { const hs = (hitsAt.get(id) || []).filter(t => t > f.t - 4 && t <= f.t + 2); lands.push([f.t, id, vz.toFixed(1), p.hp, hp, hs.length]) }
  }
  prev.set(id, { z, hp, flags })
}
console.log('fast landings [t,id,vz,hpBefore,hpAfter,hitEventsNearby]:', lands.length); for (const l of lands.slice(0, 15)) console.log('  ', l.join(' '))
