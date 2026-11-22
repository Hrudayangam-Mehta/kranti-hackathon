// Read-only: uses bot/lib/world.js (not modified) to test sight lines in the kit stream around the two moments mech 10 left view.
import { World } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const w = World.loadSync('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/arena')
const L = gunzipSync(readFileSync('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/check/stream.jsonl.gz')).toString().trim().split('\n').map((l) => JSON.parse(l))
const O = L.filter((x) => x.type === 'obs')
let last = null
for (const o of O) {
  const m = o.mechs.find((q) => q.id === 10)
  const s = o.self
  const tgt = m ? m.pos : (last ? last.pos.map((v, k) => v + last.vel[k] * (o.t - last.t)) : null)
  if (!tgt) { continue }
  const ez = s.pos[2] + 8
  const c = [tgt[0], tgt[1], tgt[2] + 4.5], tp = [tgt[0], tgt[1], tgt[2] + 9]
  const r = (p) => ({ see: w.canSee(s.pos[0], s.pos[1], ez, ...p), clear: w.sightClear(s.pos[0], s.pos[1], ez, ...p), T: +w.transmittance(s.pos[0], s.pos[1], ez, ...p).toFixed(3) })
  if ((o.tick >= 256 && o.tick <= 270) || (o.tick >= 512 && o.tick <= 526) || (o.tick>=392 && o.tick<=400))
    console.log(o.tick, m ? 'listed' : 'MISSING', 'centre', JSON.stringify(r(c)), 'top', JSON.stringify(r(tp)))
  if (m) last = { pos: m.pos, vel: m.vel, t: o.t }
}
