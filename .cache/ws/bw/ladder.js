import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], cfg = hello.config
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2 })
const rnd = rng32(1234), B = world.bounds
let c = null
for (let k = 0; k < 200000 && !c; k++) {
  const x = B.minX + 40 + rnd() * (B.maxX - B.minX - 80), y = B.minY + 40 + rnd() * (B.maxY - B.minY - 80)
  if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
  const wd = nav.wallDistAt(x, y)
  if (wd > 4.5) continue
  const a = rnd() * Math.PI * 2
  const d = 26 + rnd() * 12, gx = x + d * Math.cos(a), gy = y + d * Math.sin(a)
  if (!nav.passableAt(gx, gy) || nav.component(gx, gy) !== nav.mainComponent || nav.wallDistAt(gx, gy) < 3.5) continue
  if (nav.walkLine(x, y, gx, gy)) continue
  const mx = (x + gx) / 2, my = (y + gy) / 2
  if (!world.bodyBlocked(mx, my, nav.levelAt(mx, my), 2.5, 9, 1.2)) continue
  if (Math.abs(nav.levelAt(x, y) - nav.levelAt(gx, gy)) > 2.5) continue
  const p = nav.findPath(x, y, gx, gy)
  if (!p.ok || p.len < d * 1.5 || p.len > 110) continue
  c = { x, y, gx, gy, yaw: a, len: p.len, d }
}
const zone = { center: [c.x, c.y], radius: 3000, next_center: [c.x, c.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
const ar = new Arena({ cfg, world, nav, seed: 42, me: { x: c.x, y: c.y, yaw: c.yaw }, zone, cubes: [{ id: 5001, pos: [c.gx, c.gy, nav.levelAt(c.gx, c.gy)] }] })
const brain = createBrain(hello, { world: null, nav: null, log: console.log })
for (let k = 0; k < 250; k++) {
  const obs = ar.obs()
  const a = brain.act(obs, performance.now() + 27)
  const st = brain.debugState()
  if (k % 5 === 0) console.log(ar.t.toFixed(1), st.mode + '/' + st.leg, 'pos', ar.me.x.toFixed(1), ar.me.y.toFixed(1), ar.me.z.toFixed(1), 'v', Math.hypot(ar.me.vx, ar.me.vy).toFixed(1), 'mv', a.move.map((v) => v.toFixed(2)).join(','), a.jump ? 'JUMP' : '', a.boost ? 'BOOST' : '', 'cubes', obs.cubes.length, 'dist', Math.hypot(ar.me.x - c.gx, ar.me.y - c.gy).toFixed(1), 'stuck', st.counters.stuck, 'ab', st.counters.abandons, 'gr', ar.me.grounded)
  ar.step(a)
}
