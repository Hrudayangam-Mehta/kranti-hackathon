// D4 dodge, paired runs with diagnostics: does the dodge change the velocity, and does the bullet still hit?
import { createBrain, hello, ctxNone, check, fx, cfg, Arena } from './common.js'
const still = (x, y) => (e, t, a) => { e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) }
const HITR = cfg.mech.radius + cfg.projectile.gun_radius
function pair(K, fromD, leadS, missBy, quiet) {
  const mk = () => { const ar = new Arena({ cfg, seed: 41, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: 1e7, dps: 6, script: still(80, 0) }] }); ar.t = 60; return ar }
  const A = mk(), Bq = mk(), bA = createBrain(hello, ctxNone, { warmup: false }), bB = createBrain(hello, ctxNone, { warmup: false })
  let bullet = null, minA = 1e9, minB = 1e9, cmds = []
  for (let k = 0; k < K + 12; k++) {
    const oA = A.obs(), oB = Bq.obs()
    if (k === K) {
      const me = Bq.me, tx = me.x + me.vx * leadS, ty = me.y + me.vy * leadS + missBy
      const ex = me.x + fromD, ey = me.y, d = Math.hypot(tx - ex, ty - ey), v = cfg.weapons.gun.speed
      bullet = { pos: [ex, ey, me.z + 4.5], vel: [(tx - ex) / d * v, (ty - ey) / d * v, 0], t0: Bq.t, life: d / v + 0.2 }
    }
    if (bullet && Bq.t - bullet.t0 < bullet.life) { const dt = Bq.t - bullet.t0; oB.projectiles = [{ id: 777, kind: 'gun', pos: [bullet.pos[0] + bullet.vel[0] * dt, bullet.pos[1] + bullet.vel[1] * dt, bullet.pos[2]], vel: bullet.vel }] }
    const aA = bA.act(oA, performance.now() + 27), aB = bB.act(oB, performance.now() + 27)
    if (bullet && k <= K + 4) cmds.push(`k${k - K}: A[${aA.move.map((v) => fx(v, 2))}] B[${aB.move.map((v) => fx(v, 2))}] vA[${fx(A.me.vx, 1)},${fx(A.me.vy, 1)}] vB[${fx(Bq.me.vx, 1)},${fx(Bq.me.vy, 1)}]`)
    // step tick by tick and measure the bullet's distance to each mech (body axis, horizontal)
    for (const [ar, act, which] of [[A, aA, 'A'], [Bq, aB, 'B']]) {
      if (ar.me.cmdYaw === undefined) {}
      if (act.aim) { ar.me.cmdYaw = act.aim[0]; ar.me.cmdPitch = act.aim[1] }
      for (let s = 0; s < 2; s++) {
        ar._tick(act, s)
        if (bullet) { const dt = ar.t - bullet.t0; if (dt >= 0 && dt <= bullet.life) { for (let q = 0; q <= 10; q++) { const tt = dt - 0.05 + q * 0.005; if (tt < 0) continue; const bx = bullet.pos[0] + bullet.vel[0] * tt, by = bullet.pos[1] + bullet.vel[1] * tt; const dd = Math.hypot(bx - ar.me.x, by - ar.me.y); if (which === 'A') minA = Math.min(minA, dd); else minB = Math.min(minB, dd) } } }
      }
    }
  }
  return { minA, minB, dodges: bB.debugState().counters.bulletDodges || 0, cmds }
}
const rows = []
for (const [fromD, lead, label] of [[50, 0.2, 'from 50 m, led on our velocity'], [120, 0.48, 'from 120 m, led on our velocity'], [120, 0, 'from 120 m, aimed at where we are']]) {
  for (const K of [30, 37, 44]) { const r = pair(K, fromD, lead, 0); rows.push({ label, K, ...r }); }
}
let hitsA = 0, hitsB = 0
for (const r of rows) { if (r.minA < HITR) hitsA++; if (r.minB < HITR) hitsB++; console.log(`${r.label} K=${r.K}: closest without dodge ${fx(r.minA, 2)} m, with the bullet visible ${fx(r.minB, 2)} m (hit radius ${HITR}), dodge decisions ${r.dodges}`) }
console.log(rows[4].cmds.join('\n'))
check('D4 bullet dodge turns hits into misses (paired runs, 9 shots: 3 geometries x 3 moments)', hitsB < hitsA && hitsB <= Math.floor(hitsA / 2), `bullets that hit: without seeing them ${hitsA}/9, with the dodge ${hitsB}/9`)
