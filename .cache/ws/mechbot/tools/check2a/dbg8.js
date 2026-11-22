const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const ar = new Arena({ cfg, seed: 91, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 15, x: 100, y: 30, hp: 1400, maxHp: 1400, script: (e) => { e.yaw = -2.5; e.vx = 0; e.vy = 0 } }], cubes: [{ id: 7001, pos: [70, 10, 0] }] })
ar.t = 100
const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { env: 'ffa', warmup: false, debug: true })
for (let k = 0; k < 150; k++) {
  const o = ar.obs(); const a = br.act(o, performance.now() + 27.5); const B = br._B, tr = B.tracks.get(15)
  if (k % 5 === 0 || a.fire[0]) { const adv = tr && B.cx ? B.cx.adviceFor(15, B.cxCtx) : null; const ar2 = B.cx ? B.cx.archetypeOf(15) : null
    console.log(k, fx(ar.t), 'me', fx(ar.me.x), fx(ar.me.y), 'mode', B.mode, 'leg', B.legKind, 'tgt', B.target ? B.target.id : -1, 'host', tr && tr.hostile, 'aimAtMe', tr && tr.aimAtMe, 'fire', a.fire[0], 'aimK', B.aimKind, 'loot', B.loot ? B.loot.type : '', 'arch', ar2 && ar2.archetype, ar2 && fx(ar2.confidence), 'adv', adv && adv.active, adv && adv.engageLevel, adv && adv.reason, 'cubes', ar.stats.cubesTaken || 0, 'st', B.stance, 'shootCrate', !!B.shootCrate) }
  ar.step(a)
}
function fx(v) { return typeof v === 'number' ? v.toFixed(1) : v }
