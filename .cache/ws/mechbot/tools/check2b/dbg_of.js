import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(P + '/tools/arena_req.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const [D, dps, t0, secs] = [+process.argv[2], +process.argv[3], +process.argv[4], +(process.argv[5] || 6)]
const over = JSON.parse(process.argv[6] || '{}')
const ex = D * Math.cos(0.25), ey = D * Math.sin(0.25)
const ar = new ArenaReq({ cfg, seed: 401, me: { x: 0, y: 0, yaw: 0.25 }, enemies: [{ id: 71, x: ex, y: ey, hp: 1400, weapons: ['gun'], dps, script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } }] })
ar.t = t0
const br = createBrain(hello, { world: null, nav: null, log: () => {} }, over)
for (let k = 0; k < secs * 10; k++) {
  const o = ar.obs()
  const dm = o.events.filter((e) => e.type === 'damaged').map((e) => `${e.by}:${e.amount}`).join(',')
  const a = br.act(o, performance.now() + 27.5)
  const B = br._B, tr = B.tracks.get(71)
  console.log(ar.t.toFixed(2), 'dmg', dm || '-', 'hp', Math.round(ar.me.hp), 'mode', B.mode, 'tgt', B.target ? B.target.id : '-', 'tr', tr ? `d${tr.dist.toFixed(0)} hostile ${tr.hostile} lastDmgIn ${(+tr.lastDmgInT).toFixed(2)} dmgInD ${tr.dmgInD} losIn ${tr.losIn}` : '-', 'gate', B.ofGate, 'ofBreak', B.ofBreak, 'fire', a.fire && a.fire[0], 'me', ar.me.x.toFixed(1), ar.me.y.toFixed(1), 'lastHurt', (+B.me.lastHurtT).toFixed(2))
  ar.step(a)
}
