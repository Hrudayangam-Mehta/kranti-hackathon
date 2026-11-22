const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], cfg = hello.config
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
const ar = new Arena({ cfg, seed: 210, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', null] }, enemies: [{ id: 10, x: 75, y: 0, hp: 1400, weapons: ['gun', 'lightning'], dps: 20,
      script: (e, t, a, dt) => { face(e, a); const dx = a.me.x - e.x, dy = a.me.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 9; e.vy = dy / d * 9; e.x += e.vx * dt; e.y += e.vy * dt } }] }); ar.t = 100
const br = createBrain(hello, { world: null, nav: null, log: (s) => console.log(s) }, { env: 'ffa', warmup: false })
for (let k = 0; k < 150; k++) {
  const o = ar.obs(); const a = br.act(o, performance.now() + 27); const B = br._B
  const e = ar.enemies[0], d = Math.hypot(e.x - ar.me.x, e.y - ar.me.y)
  const tr = B.tracks.get(10); if (ar.t > 111.5 && ar.t < 114) console.log(ar.t.toFixed(1), "d", d.toFixed(1), B.mode, B.legKind, "listed", tr && tr.listed, "host", tr && tr.hostile, "aim", a.aim[0].toFixed(2), "brg", Math.atan2(e.y - ar.me.y, e.x - ar.me.x).toFixed(2), "myyaw", ar.me.yaw.toFixed(2), B.aimKind, 'mv', a.move.map((v) => v.toFixed(2)).join(','), 'spd', Math.hypot(ar.me.vx, ar.me.vy).toFixed(1), 'hp', ar.me.hp.toFixed(0), 'brk', B.ffaBreak)
  ar.step(a)
}
