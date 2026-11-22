// Read-only use of bot/lib/world.js. For each obs: is mech 10 listed, and is it visible by the protocol's rule as our map model computes it?
import { World } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot/lib/world.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const w = World.loadSync('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/arena')
const L = gunzipSync(readFileSync('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/check/stream.jsonl.gz')).toString().trim().split('\n').map((l) => JSON.parse(l))
const O = L.filter((x) => x.type === 'obs')
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
let last = null, lastVis = null, out = []
for (const o of O) {
  const m = o.mechs.find((q) => q.id === 10)
  const s = o.self
  const tgt = m ? m.pos : (last ? last.pos.map((v, k) => v + last.vel[k] * (o.t - last.t)) : null)
  if (!tgt) continue
  const ez = s.pos[2] + 8
  const dx = tgt[0] - s.pos[0], dy = tgt[1] - s.pos[1], d = Math.hypot(dx, dy)
  const pts = [[tgt[0], tgt[1], tgt[2] + 4.5], [tgt[0], tgt[1], tgt[2] + 9]]
  let vis
  if (d <= 45) vis = pts.some((p) => w.sightClear(s.pos[0], s.pos[1], ez, ...p))
  else if (d <= 200 && Math.abs(wrap(Math.atan2(dy, dx) - s.aim[0])) <= Math.PI / 3) vis = pts.some((p) => w.canSee(s.pos[0], s.pos[1], ez, ...p))
  else vis = false
  const visNoCanopy = d <= 200 && pts.some((p) => w.sightClear(s.pos[0], s.pos[1], ez, ...p))
  if (vis) lastVis = o.t
  out.push([o.tick, o.t, m ? 1 : 0, vis ? 1 : 0, visNoCanopy ? 1 : 0, lastVis === null ? null : +(o.t - lastVis).toFixed(2)])
  if (m) last = { pos: m.pos, vel: m.vel, t: o.t }
}
// compress into runs
let prev = null
for (const r of out) {
  const key = r[2] + '' + r[3] + r[4]
  if (key !== prev) console.log('tick', r[0], 't', r[1], 'listed', r[2], 'visible(model)', r[3], 'visible ignoring canopy', r[4], 'since last model-visible', r[5])
  prev = key
}
