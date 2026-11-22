import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const B = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/req_bot'
const ROOT = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(B + '/arena_req.js')
const { createBrain } = await import(B + '/lib/brain.js')
const lines = gunzipSync(readFileSync(ROOT + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const over = process.argv[2] === 'off' ? { stealOn: false, crateGateOn: false } : {}
const cx = -62, cy = 62, crate = { id: 1007, pos: [cx, cy, 0], hp: 300 }
const ar = new ArenaReq({ cfg, seed: 3, me: { x: 0, y: 0, yaw: Math.PI }, crates: [crate],
  enemies: [{ id: 9, x: cx, y: cy + 25.5, hp: 1e7, weapons: ['gun'], script: (e, t, a, dt) => {
    if (crate.hp > 0) { a.shootCrate(e, crate, 40, dt, 'laser'); return }
    const c = a.cubes[0]; if (!c) { e.vx = 0; e.vy = 0; return }
    const dx = c.pos[0] - e.x, dy = c.pos[1] - e.y, d = Math.hypot(dx, dy)
    e.vx = dx / d * 11.7; e.vy = dy / d * 11.7; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } }] })
ar.enemies[0].takes = true; ar.t = 120
const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, { env: 'ffa', ...over })
for (let k = 0; k < 140; k++) {
  const o = ar.obs(); const a = brain.act(o, performance.now() + 27); const s = brain.debugState()
  if (k % 5 === 0) { const BB = brain._B; const w = [...BB.steal.watch.values()].map((w) => `${w.id} hp${w.hp} rate${w.rate.toFixed(0)} lastT${(BB.me.t - w.lastT).toFixed(1)} sh${w.shooter}`); const tr = BB.trackList.filter((t) => !t.npc).map((t) => `${t.id} host${t.hostile} aim${t.aimAtMe} expl${BB.steal.aimExplained(t)} losIn${(BB.me.t - t.losInT).toFixed(1)}`); console.log('   ', w.join(','), '|', tr.join(','), 'nLos', BB.nLos, 'A', BB.A.toFixed(0), 'lastContact', (BB.me.t - BB.lastContactT).toFixed(1), 'loot', BB.loot && BB.loot.type) }
  if (k % 5 === 0) console.log(ar.t.toFixed(1), s.mode, s.leg, s.aim, 'me', ar.me.x.toFixed(1), ar.me.y.toFixed(1), 'crate', crate.hp, 'enemy', ar.enemies[0].x.toFixed(1), ar.enemies[0].y.toFixed(1), 'cubes', ar.me.cubes, ar.stats.enemyCubes || 0, 'listed', o.mechs.length, s.steal.task, 'boost', a.boost)
  ar.step(a)
}
