// F1 (D4): paired micro-arena runs, one brain also sees a gun bullet led on our velocity. Usage: bun f1_dodge.js [libdir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const LIB = process.argv[2] || P + '/bot/lib'
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const { createBrain } = await import(LIB + '/brain.js')
const { Arena } = await import(P + '/tools/arena_micro.js')
const ctxNone = { world: null, nav: null, log: () => {} }
const still = (x, y) => (e, t, a) => { e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) }
const HITR = cfg.mech.radius + cfg.projectile.gun_radius
function pair(K, fromD) {
  const mk = () => { const ar = new Arena({ cfg, seed: 41, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: 1e7, dps: 6, script: still(80, 0) }] }); ar.t = 60; return ar }
  const A = mk(), Bq = mk(), bA = createBrain(hello, ctxNone, { warmup: false }), bB = createBrain(hello, ctxNone, { warmup: false })
  let bullet = null, minA = 1e9, minB = 1e9
  for (let k = 0; k < K + 14; k++) {
    const oA = A.obs(), oB = Bq.obs()
    if (k === K) {
      const me = Bq.me, v = cfg.weapons.gun.speed, ex = me.x + fromD, ey = me.y
      // exact first-order intercept on our current velocity (house-bot aim, D1)
      let tf = fromD / v
      for (let i = 0; i < 6; i++) { const tx = me.x + me.vx * tf, ty = me.y + me.vy * tf; tf = Math.hypot(tx - ex, ty - ey) / v }
      const tx = me.x + me.vx * tf, ty = me.y + me.vy * tf, d = Math.hypot(tx - ex, ty - ey)
      bullet = { pos: [ex, ey, me.z + 4.5], vel: [(tx - ex) / d * v, (ty - ey) / d * v, 0], t0: Bq.t, life: tf + 0.2 }
    }
    if (bullet && Bq.t - bullet.t0 < bullet.life) { const dt = Bq.t - bullet.t0; oB.projectiles = [{ id: 777, kind: 'gun', pos: [bullet.pos[0] + bullet.vel[0] * dt, bullet.pos[1] + bullet.vel[1] * dt, bullet.pos[2]], vel: bullet.vel }] }
    const aA = bA.act(oA, performance.now() + 27), aB = bB.act(oB, performance.now() + 27)
    for (const [ar, act, w] of [[A, aA, 0], [Bq, aB, 1]]) {
      if (act.aim) { ar.me.cmdYaw = act.aim[0]; ar.me.cmdPitch = act.aim[1] }
      for (let s = 0; s < 2; s++) {
        ar._tick(act, s)
        if (bullet) { const dt = ar.t - bullet.t0; if (dt >= 0 && dt <= bullet.life) for (let q = 0; q <= 10; q++) { const tt = dt - 0.05 + q * 0.005; if (tt < 0) continue; const dd = Math.hypot(bullet.pos[0] + bullet.vel[0] * tt - ar.me.x, bullet.pos[1] + bullet.vel[1] * tt - ar.me.y); if (w) minB = Math.min(minB, dd); else minA = Math.min(minA, dd) } }
      }
    }
  }
  return { minA, minB, dodges: bB.debugState().counters.bulletDodges || 0 }
}
for (const R of [50, 75, 100, 130]) {
  let hA = 0, hB = 0, n = 0, dz = 0
  for (let K = 30; K < 48; K++) { const r = pair(K, R); n++; if (r.minA < HITR) hA++; if (r.minB < HITR) hB++; dz += r.dodges }
  console.log(`led bullet from ${R} m: hits without seeing it ${hA}/${n}, with the dodge ${hB}/${n}, dodge decisions ${dz}`)
}
