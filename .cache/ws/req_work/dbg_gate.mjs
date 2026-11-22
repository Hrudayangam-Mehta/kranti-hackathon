import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const B = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/req_bot'
const ROOT = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(B + '/arena_req.js')
const { createBrain } = await import(B + '/lib/brain.js')
const lines = gunzipSync(readFileSync(ROOT + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const crate = { id: 1009, pos: [25, 0, 0], hp: 300 }
const ar = new ArenaReq({ cfg, seed: 9, me: { x: 0, y: 0, yaw: 0 }, crates: [crate], enemies: [],
  sounds: (a) => (a.t < 66 && Math.round(a.t * 10) % 5 === 0 ? [{ kind: 'step', bearing: 2.0, dist: 'near', age: 0.05 }] : []) })
ar.t = 60
const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, {})
for (let k = 0; k < 120; k++) {
  const o = ar.obs(); const a = brain.act(o, performance.now() + 27); const s = brain.debugState()
  if (k % 5 === 0) console.log(ar.t.toFixed(1), s.mode, s.leg, s.aim, 'fire', a.fire, 'pos', ar.me.x.toFixed(1), 'crate', crate.hp, 'loot', JSON.stringify(brain._B.loot && { type: brain._B.loot.type, id: brain._B.loot.id }), 'shootCrate', !!brain._B.shootCrate)
  ar.step(a)
}
