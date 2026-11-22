const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], cfg = hello.config
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
function ffaSpot(seed, dLo = 110, dHi = 150) {
  const rnd = rng32(seed), Bd = world.bounds
  for (let k = 0; k < 200000; k++) {
    const x = Bd.minX + 90 + rnd() * (Bd.maxX - Bd.minX - 180), y = Bd.minY + 90 + rnd() * (Bd.maxY - Bd.minY - 180)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent || nav.wallDistAt(x, y) > 8 || nav.wallDistAt(x, y) < 4) continue
    const a = rnd() * 6.283, d = dLo + rnd() * (dHi - dLo), ex = x + d * Math.cos(a), ey = y + d * Math.sin(a)
    if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
    if (!world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || !world.shotClear(x, y, z + 7, ex, ey, ez + 4.5)) continue
    return { x, y, ex, ey }
  }
}
const seed = +(process.argv[2] || 208), env = process.argv[3] || 'ffa', hp0 = +(process.argv[4] || 1400), dps = +(process.argv[5] ?? 70)
const sp = ffaSpot(seed)
const shooter = (dps) => (e, t, ar) => { face(e, ar); const me = ar.me; e.dps = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) ? dps : 0; if (!dps) e.yaw += 1.2 }
const ar = new Arena({ cfg, world, nav, seed, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x), hp: hp0 }, zone: { center: [sp.x, sp.y], radius: 3000, next_center: [sp.x, sp.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }, enemies: [{ id: 10, x: sp.ex, y: sp.ey, hp: 1400, script: shooter(dps) }] })
ar.t = 100
const br = createBrain(hello, { world, nav, log: (s) => console.log(s) }, { env, warmup: false })
for (let k = 0; k < 250; k++) {
  const o = ar.obs(); const a = br.act(o, performance.now() + 27); const B = br._B
  const e = ar.enemies[0], me = ar.me
  const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5)
  const tr = B.tracks.get(10)
  if (k % 3 === 0 || k < 12) console.log(ar.t.toFixed(1), B.mode, B.legKind, 'brk', B.ffaBreak, B.ffaRelocated, 'hide', B.hide.state, B.hide.dist.toFixed(1), 'tgt', B.target ? B.target.id : '-', 'st', B.stance, 'los', los, 'listed', tr && tr.listed, 'hostile', tr && tr.hostile, 'losIn', tr && tr.losIn, 'hp', me.hp.toFixed(0), 'seenT', B.ffa.state.seenT.toFixed(1), 'lastLosIn', B.lastLosInT.toFixed(1))
  ar.step(a)
}
