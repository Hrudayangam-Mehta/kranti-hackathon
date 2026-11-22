const P = process.argv[2]
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { World } = await import(P + '/bot/lib/world.js'); const { Nav } = await import(P + '/bot/lib/nav.js')
const { readFileSync } = await import('node:fs'); const { gunzipSync } = await import('node:zlib')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const x = +process.argv[3], y = +process.argv[4]
const ar = new Arena({ cfg, world, nav, seed: 113, me: { x, y, yaw: 0 }, zone: { center: [x, y], radius: 560, next_center: [x + 50, y], next_radius: 380, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
const b = createBrain(hello, { world, nav, log: () => {} })
const legs = {}
for (let k = 0; k < 300; k++) { const o = ar.obs(); const a = b.act(o, performance.now() + 27); const s = b.debugState(); if (Math.hypot(o.self.vel[0], o.self.vel[1]) < 0.5) { const key = s.mode + '/' + s.leg + ' mv' + Math.hypot(a.move[0], a.move[1]).toFixed(1); legs[key] = (legs[key] || 0) + 1 } if (k % 30 === 0) console.log(k, s.mode, s.leg, o.self.pos.map(v => v.toFixed(0)).join(','), 'goal', s.goal && s.goal.map(v => v.toFixed(0)).join(','), 'mv', a.move.map(v => v.toFixed(2)).join(','), 'loot', JSON.stringify(b._B.loot && { t: b._B.loot.type, x: b._B.loot.x | 0, y: b._B.loot.y | 0 })); ar.step(a) }
console.log(legs, b.debugState().counters)
