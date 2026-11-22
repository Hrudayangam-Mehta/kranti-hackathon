import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const LIB = process.env.LIB || P + '/bot/lib'
const { ArenaReq } = await import(P + '/tools/arena_req.js')
const { createBrain } = await import(LIB + '/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const FFAZ = { center: [-1800, 0], radius: 5000, next_center: [-1800, 0], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
const A = { id: 11, x: +(process.env.AX || 60), y: +(process.env.AY || 30), hp: 900, weapons: ['gun', 'laser'], script: (e, t, a) => { e.yaw = -Math.PI / 2; if (t >= 122 && e.alive) a.kill(e) } }
const Bm = { id: 12, x: +(process.env.AX || 60), y: +(process.env.AY || 30) - 60, hp: 1000, weapons: ['gun'], script: (e, t, a, dt) => {
  const AX = +(process.env.AX || 60), AY = +(process.env.AY || 30); if (t < 122) { e.yaw = Math.atan2(AY - e.y, AX - e.x); return }
  const dx = AX - e.x, dy = AY - e.y, d = Math.hypot(dx, dy)
  if (d > 0.5) { e.vx = dx / d * 8; e.vy = dy / d * 8; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } else { e.vx = 0; e.vy = 0 } } }
A.cubes = 2
const ar = new ArenaReq({ cfg, seed: 5, me: { x: 0, y: 0, yaw: 0 }, enemies: [A, Bm], zone: FFAZ })
ar.enemies[0].cubes = 2; ar.enemies[1].takes = true; ar.t = 120
const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, { env: 'ffa', warmup: false, ...JSON.parse(process.argv[2] || '{}') })
for (let k = 0; k < 90; k++) {
  const o = ar.obs(); if (process.env.ALIVE) o.alive += 9; const a = brain.act(o, performance.now() + 27); const B = brain._B
  if (k % 3 === 0 || (ar.t > 121.8 && ar.t < 122.6)) console.log((ar.t - 120).toFixed(1), 'alive', o.alive, 'mechs', o.mechs.map((m) => m.id).join(','), 'cubes', (o.cubes || []).length, B.mode, B.legKind, 'grab', B.grab ? B.grab.type : '-', 'loot', B.loot ? B.loot.type : '-', 'yaw', B.me.yaw.toFixed(2), 'aimK', B.aimKind, 'deaths', B.counters.deathsSeen || 0, 'mycubes', ar.me.cubes, 'aimB', B.tracks.get(12) ? B.tracks.get(12).aimAtMe : '-', 'hostB', B.tracks.get(12) ? B.tracks.get(12).hostile : '-', 'me', ar.me.x.toFixed(0), ar.me.y.toFixed(0), 'tgt', B.target ? B.target.id : '-', 'brk', B.ffaBreak ? 1 : 0)
  ar.step(a)
}
