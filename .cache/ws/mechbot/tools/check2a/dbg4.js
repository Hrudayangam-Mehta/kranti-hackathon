import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(P + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const Bd = world.bounds
console.log('bounds', JSON.stringify(Bd), 'main', nav.mainComponent)
const rnd = rng32(401)
let found = null, tries = 0, pass = 0, wdOk = 0
for (let k = 0; k < 300000 && !found; k++) {
  const x = Bd.minX + 120 + rnd() * (Bd.maxX - Bd.minX - 240), y = Bd.minY + 120 + rnd() * (Bd.maxY - Bd.minY - 240)
  tries++
  if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
  pass++
  const wd = nav.wallDistAt(x, y)
  if (!(wd >= 3 && wd <= 6)) continue
  wdOk++
  found = { x, y, wd }
}
console.log('tries', tries, 'pass', pass, 'wdOk', wdOk, JSON.stringify(found))
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
const shooterAt = (dps) => (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? dps : 0 }
function spot(seed, dLo, dHi) {
  const rnd = rng32(seed)
  for (let k = 0; k < 300000; k++) {
    const x = Bd.minX + 120 + rnd() * (Bd.maxX - Bd.minX - 240), y = Bd.minY + 120 + rnd() * (Bd.maxY - Bd.minY - 240)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
    const wd = nav.wallDistAt(x, y)
    if (!(wd >= 3 && wd <= 6)) continue
    const a = rnd() * 2 * Math.PI, d = dLo + rnd() * (dHi - dLo), ex = x + d * Math.cos(a), ey = y + d * Math.sin(a)
    if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
    if (!world.shotClear(x, y, z + 7, ex, ey, ez + 4.5) || !world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || !world.canSee(x, y, z + 8, ex, ey, ez + 6)) continue
    return { x, y, ex, ey }
  }
}
const SEED = +(process.argv[2] || 401); const sp = spot(SEED, 110, 150)
console.log(JSON.stringify(sp))
const ar = new Arena({ cfg, world, nav, seed: SEED, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, enemies: [{ id: 19, x: sp.ex, y: sp.ey, hp: 1400, script: shooterAt(25) }],
  zone: { center: [sp.x, sp.y], radius: 3000, next_center: [sp.x, sp.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
ar.t = 100
const br = createBrain(hello, { world, nav, log: () => {} }, { env: 'ffa', warmup: false })
for (let k = 0; k < +(process.argv[3] || 120); k++) {
  const o = ar.obs(); o.alive = 12; const t0 = performance.now(); const a = br.act(o, t0 + 27.5); const ms = performance.now() - t0; const B = br._B, tr = B.tracks.get(19)
  if (k % +(process.argv[4] || 4) === 0) console.log(k, ar.t.toFixed(1), 'me', ar.me.x.toFixed(1), ar.me.y.toFixed(1), 'hp', ar.me.hp.toFixed(0), 'mode', B.mode, 'leg', B.legKind, 'brk', B.ffaBreak, 'rel', B.ffaRelocated, 'hide', B.hide.state, B.hide.dist.toFixed(1), 'host', tr && tr.hostile, 'losIn', tr && tr.losIn, 'losOut', tr && tr.losOut, 'lastLosIn', (ar.t - B.lastLosInT).toFixed(1), 'mv', a.move.map((v) => v.toFixed(2)).join(','), 'f', a.fire[0], 'st', B.stance, 'ms', ms.toFixed(1), 'edps', ar.enemies[0].dps, 'ehp', ar.enemies[0].hp.toFixed(0), 'canSeeMe', world.canSee(ar.enemies[0].x, ar.enemies[0].y, ar.enemies[0].z + 8, ar.me.x, ar.me.y, ar.me.z + 6), 'hx', B.hide.x.toFixed(1), B.hide.y.toFixed(1))
  ar.step(a)
}
