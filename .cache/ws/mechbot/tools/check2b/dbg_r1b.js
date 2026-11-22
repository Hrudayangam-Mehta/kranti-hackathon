import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(P + '/tools/arena_req.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const ctxNone = { world: null, nav: null, log: () => {} }
const walkTo = (e, x, y, v, dt) => { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 0.4) { e.vx = dx / d * v; e.vy = dy / d * v; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } else { e.vx = 0; e.vy = 0 } }
const [vx, vy, survD, over] = [+process.argv[2], +process.argv[3], +process.argv[4], JSON.parse(process.argv[5] || '{}')]
const ang = Math.atan2(vy, vx), sx = vx + survD * Math.cos(ang + 1.5), sy = vy + survD * Math.sin(ang + 1.5)
const A = { id: 41, x: vx, y: vy, hp: 900, weapons: ['gun', 'laser'], script: (e, t, a) => { e.yaw = Math.atan2(sy - e.y, sx - e.x); e.vx = 0; e.vy = 0; if (t >= 122.5 && e.alive) a.kill(e) } }
const Bm = { id: 42, x: sx, y: sy, hp: 1000, weapons: ['gun'], script: (e, t, a, dt) => { if (t < 122.5) { e.yaw = Math.atan2(vy - e.y, vx - e.x); e.vx = 0; e.vy = 0; return } walkTo(e, vx, vy, 8, dt) } }
const ar = new ArenaReq({ cfg, seed: 7, me: { x: 0, y: 0, yaw: Math.atan2(vy, vx) }, enemies: [A, Bm], zone: { center: [-1800, 0], radius: 5000, next_center: [-1800, 0], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
ar.enemies[0].cubes = 3; ar.enemies[1].takes = true
ar.t = 120
const br = createBrain(hello, ctxNone, { env: 'ffa', ...over })
for (let k = 0; k < 100; k++) {
  const o = ar.obs(); o.alive = 9 + o.alive
  const a = br.act(o, performance.now() + 27.5)
  const B = br._B
  if (k % 3 === 0 || (ar.t > 122.3 && ar.t < 123)) console.log(ar.t.toFixed(2), 'me', ar.me.x.toFixed(1), ar.me.y.toFixed(1), 'yaw', ar.me.yaw.toFixed(2), 'brgV', Math.atan2(vy - ar.me.y, vx - ar.me.x).toFixed(2), 'dV', Math.hypot(vx - ar.me.x, vy - ar.me.y).toFixed(1), 'mode', B.mode, 'tgt', B.target ? B.target.id + (B.target.hostile ? 'H' : '') : '-', 'grab', B.grab ? (B.grab.type || '') + ':' + (B.grab.id ?? '') : '-', 'loot', B.loot ? B.loot.type : '-', 'leg', B.legKind, 'fire', a.fire, 'cubesSeen', o.cubes.length, 'pick', o.pickups.length, 'brk', B.ffaBreak, 'deaths', B.counters.deathsSeen || 0, 'surv', Math.hypot(ar.enemies[1].x - ar.me.x, ar.enemies[1].y - ar.me.y).toFixed(0))
  ar.step(a)
}
console.log('cubes', ar.me.cubes, 'theirs', ar.stats.enemyCubes, 'laser', ar.me.weapons[1] && ar.me.weapons[1].kind)
