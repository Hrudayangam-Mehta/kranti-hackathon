// pass 2b: trace of the check2a rule 4 micro-arena spots (lib dir as argv[2], seed argv[3])
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const LIB = process.argv[2] || P + '/bot/lib'
const SEED = +(process.argv[3] || 401)
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(LIB + '/world.js')
const { Nav } = await import(LIB + '/nav.js')
const { createBrain } = await import(LIB + '/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(P + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const ctxMap = { world, nav, log: () => {} }
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
const bigZone = (x, y) => ({ center: [x, y], radius: 3000, next_center: [x, y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
function spot(seed, dLo, dHi) {
  const rnd = rng32(seed), Bd = world.bounds
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
  return null
}
const shooterAt = (dps) => (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? dps : 0 }
const sp = spot(SEED, 110, 150)
const ar = new Arena({ cfg, world, nav, seed: SEED, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, enemies: [{ id: 19, x: sp.ex, y: sp.ey, hp: 1400, script: shooterAt(25) }], zone: bigZone(sp.x, sp.y) })
ar.t = 100
const br = createBrain(hello, ctxMap, { env: 'ffa', warmup: false })
for (let k = 0; k < 300; k++) {
  const o = ar.obs(); o.alive = 12
  const a = br.act(o, performance.now() + 27.5)
  const B = br._B, h = B.hide, tr = B.tracks.get(19)
  const eyeSee = world.canSee(sp.ex, sp.ey, nav.levelAt(sp.ex, sp.ey) + 8, ar.me.x, ar.me.y, ar.me.z + 4.5) || world.canSee(sp.ex, sp.ey, nav.levelAt(sp.ex, sp.ey) + 8, ar.me.x, ar.me.y, ar.me.z + 9)
  if (process.env.DBGH && k % 3 === 0 && tr && h.state === "found") { const mz = tr.z + tr.muzzleH; console.log("   dbg cell", h.x.toFixed(1), h.y.toFixed(1), h.z.toFixed(2), "me", B.me.x.toFixed(1), B.me.y.toFixed(1), B.me.z.toFixed(2), "lvl", nav.levelAt(B.me.x, B.me.y).toFixed(2), "trpos", tr.x.toFixed(1), tr.y.toFixed(1), tr.z.toFixed(2), tr.muzzleH, "cellC", world.shotClear(tr.x, tr.y, mz, h.x, h.y, h.z + B.me.height*0.5)?1:0, "cellH", world.shotClear(tr.x, tr.y, mz, h.x, h.y, h.z + B.me.height*0.9)?1:0, "meC", world.shotClear(tr.x, tr.y, mz, B.me.x, B.me.y, B.me.z + B.me.height*0.5)?1:0, "meH", world.shotClear(tr.x, tr.y, mz, B.me.x, B.me.y, B.me.z + B.me.height*0.9)?1:0, "dmgAge", (B.me.t - tr.lastDmgInT).toFixed(1), "h", B.me.height) }
  if (k % 3 === 0) console.log((ar.t - 100).toFixed(1), B.mode, B.legKind, 'brk', B.ffaBreak ? 1 : 0, 'rel', B.ffaRelocated ? 1 : 0, 'hide', h.state, h.dist.toFixed(1), 'losAge', (B.me.t - B.lastLosInT).toFixed(1), 'eye', eyeSee ? 1 : 0, 'losIn', tr ? (tr.losIn ? 1 : 0) : '-', 'pos', ar.me.x.toFixed(1), ar.me.y.toFixed(1), 'hp', Math.round(ar.me.hp), 'ehp', Math.round(ar.enemies[0].hp), 'fire', a.fire[0] ? 1 : 0, 'st', B.stance)
  ar.step(a)
}
