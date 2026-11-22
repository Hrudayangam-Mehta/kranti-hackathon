import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const msgs = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const obs = msgs.filter((m) => m.type === 'obs')
console.log('n', obs.length, 't0', obs[0].t, 't1', obs[obs.length - 1].t, 'alive', obs[0].alive, obs[obs.length - 1].alive)
const seen = {}
for (const o of obs) for (const m of o.mechs || []) { const s = seen[m.id] || (seen[m.id] = { kind: m.kind, n: 0, t0: o.t, t1: 0, w: m.weapons }); s.n++; s.t1 = o.t }
console.log(JSON.stringify(seen))
const dmg = {}; for (const o of obs) for (const e of o.events || []) if (e.type === 'damaged') dmg[e.by] = (dmg[e.by] || 0) + 1
console.log('damaged by', JSON.stringify(dmg))
