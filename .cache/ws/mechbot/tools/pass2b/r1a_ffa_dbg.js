import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(P + '/tools/arena_req.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const BIG = 1e6
const over = JSON.parse(process.argv[2] || '{}')
const cx = -55, cy = 55, crate = { id: 1007, pos: [cx, cy, 0], hp: 300 }
const ar = new ArenaReq({ cfg, seed: 3, me: { x: 0, y: 0, yaw: Math.PI }, crates: [crate],
  enemies: [{ id: 9, x: cx, y: cy + 25.5, hp: BIG, weapons: ['gun'], script: (e, t, a, dt) => {
    if (crate.hp > 0) { a.shootCrate(e, crate, 40, dt, 'laser'); return }
    const c = a.cubes[0]; if (!c) { e.vx = 0; e.vy = 0; return }
    const dx = c.pos[0] - e.x, dy = c.pos[1] - e.y, d = Math.hypot(dx, dy)
    e.vx = dx / d * cfg.mech.walk_speed; e.vy = dy / d * cfg.mech.walk_speed; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } }] })
ar.enemies[0].takes = true; ar.t = 120
const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, { env: 'ffa', warmup: false, ...over })
for (let k = 0; k < 160; k++) {
  const o = ar.obs(); const a = brain.act(o, performance.now() + 27); const B = brain._B
  if (k % 5 === 0) { const S = B.steal, w = [...S.watch.values()][0], tr = B.tracks.get(9); console.log("   w", w ? [w.shooter, w.rate.toFixed(0), (B.me.t - w.lastT).toFixed(1), (B.me.t - w.t).toFixed(1), w.hp].join("/") : "-", "expl", tr ? S.aimExplained(tr) : "-", "losInAge", tr ? (B.me.t - tr.losInT).toFixed(1) : "-", "hpf", B.me.hpf, "quietC", (B.me.t - B.lastContactT).toFixed(1), "A", B.A.toFixed(1), "yaw9", tr ? tr.yaw.toFixed(2) : "-", "ofG", B.ofGate) }
  if (k % 5 === 0) console.log((ar.t - 120).toFixed(1), B.mode, B.legKind, 'loot', B.loot ? B.loot.type + ':' + B.loot.id : '-', 'tgt', B.target ? B.target.id : '-', 'brk', B.ffaBreak ? 1 : 0, 'st', B.stance, 'steal', JSON.stringify(B.steal.debug()), 'crate', Math.round(crate.hp), 'me', ar.me.x.toFixed(0), ar.me.y.toFixed(0), 'hostile', B.tracks.get(9) ? B.tracks.get(9).hostile : '-', 'nLos', B.nLos)
  ar.step(a)
}
console.log('cubes', ar.me.cubes, JSON.stringify(brain.debugState().counters))
