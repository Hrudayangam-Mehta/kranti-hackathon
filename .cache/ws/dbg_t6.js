import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const ar = new Arena({ cfg, seed: 404, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: 1400, maxHp: 1400, dps: 0, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI + 0.8 } }] })
ar.t = 40
const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, select: { retreat: 'd3', hunt: 'h50' } })
for (let k = 0; k < 3; k++) { const o = ar.obs(); o.alive = 14; const a = br.act(o, performance.now() + 27); const B = br._B; const tr = B.tracks.get(10)
  console.log(k, B.h50.on, B.mode, B.target && B.target.id, tr && { hostile: tr.hostile, ok: tr.h50Ok, yaw: tr.yaw, aim: tr.aimAtMe, rear: tr.rearOn, hp: tr.hp, d: tr.dist, b3: B.hunt.burst3(tr) }, B.me.gun && B.me.gun.ammo, JSON.stringify(o.mechs[0].aim)); ar.step(a) }
