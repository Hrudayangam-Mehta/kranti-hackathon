import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const crate = { id: 1031, pos: [-25, 0, 0], hp: 300 }
const ar = new Arena({ cfg, seed: 252, me: { x: 0, y: 0, yaw: Math.PI }, crates: [crate], enemies: [{ id: 10, x: 140, y: 0, hp: 1400, dps: 20, script: (e, t, A) => { if (t >= 13) { e.x = 900; e.dps = 0 } e.vx = 0; e.vy = 0; e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) } }] })
ar.t = 10
const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, ...JSON.parse(process.argv[2] || '{}') })
for (let k = 0; k < 100; k++) { const o = ar.obs(); const a = br.act(o, performance.now() + 27); const B = br._B
  if (k % 4 === 0 || a.fire[0]) console.log((ar.t).toFixed(1), B.mode, B.legKind, 'loot', B.loot ? B.loot.type : '-', 'tgt', B.target ? B.target.id : '-', 'fire', a.fire[0] ? 1 : 0, 'crate', crate.hp, 'ofB', B.ofBreak ? 1 : 0, 'losAge', (B.me.t - B.lastLosInT).toFixed(1), 'A', B.A.toFixed(1), 'mechs', o.mechs.length, 'hp', Math.round(B.me.hp), 'me', ar.me.x.toFixed(0))
  ar.step(a) }
