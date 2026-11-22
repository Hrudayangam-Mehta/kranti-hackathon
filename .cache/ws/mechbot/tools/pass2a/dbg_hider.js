const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], cfg = hello.config
const ar = new Arena({ cfg, seed: 201, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 140, y: 0, hp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = 0.0 } }] }); ar.t = 100
const br = createBrain(hello, { world: null, nav: null, log: (s) => console.log(s) }, { env: 'ffa', warmup: false })
for (let k = 0; k < 140; k++) {
  const o = ar.obs(); o.alive = 12; const a = br.act(o, performance.now() + 27); const B = br._B
  const tr = B.tracks.get(10)
  if (B.target || k % 20 === 0) { const adv = B.cx.adviceFor(10, B.cxCtx); console.log(ar.t.toFixed(1), B.mode, B.legKind, B.env, 'tgt', B.target && B.target.id, 'host', tr && tr.hostile, 'aimAtMe', tr && tr.aimAtMe, 'hostAimT', tr && tr.hostileAimT.toFixed(1), 'dmgIn', tr && tr.lastDmgInT, 'dmgOut', tr && tr.lastDmgOutT.toFixed(1), 'adv', adv.reason, adv.engageLevel, 'fire', a.fire, 'hold', B.holdFire) }
  ar.step(a)
}
