// D6 "collect the cubes of our kills at once": kills at the D2 ranges (gun 90 m, laser 150 m), alone afterwards or with a second hunter.
import { createBrain, hello, ctxNone, check, fx, cfg, Arena } from './common.js'
function run(weapons, D, second) {
  const face = (e, t, a) => { e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) }
  const enemies = [{ id: 10, x: D, y: 0, hp: 250, dps: 15, script: (e, t, a) => { e.x = D; e.y = 0; face(e, t, a) } }]
  if (second) enemies.push({ id: 11, x: -60, y: 90, hp: 1e7, dps: 12, script: (e, t, a) => { e.x = -60; e.y = 90; face(e, t, a) } })
  const ar = new Arena({ cfg, seed: 61, me: { x: 0, y: 0, yaw: 0, weapons }, enemies })
  ar.t = 60
  const b = createBrain(hello, ctxNone, { warmup: false, ...(weapons[1] === 'laser' ? {} : { rPrefGun: D, bandLo: D - 10, bandHi: D + 10 }) })
  let killedAt = -1, dist = 0, got = -1
  for (let k = 0; k < 400; k++) {
    const a = b.act(ar.obs(), performance.now() + 27); ar.step(a)
    if (killedAt < 0 && !ar.enemies[0].alive) { killedAt = ar.t; const e = ar.enemies[0]; dist = Math.hypot(e.x - ar.me.x, e.y - ar.me.y); ar.cubes.push({ id: 6001, pos: [e.x + 1.5, e.y, 0] }, { id: 6002, pos: [e.x - 1, e.y + 1.5, 0] }) }
    if (killedAt > 0 && got < 0 && ar.me.cubes >= 2) got = ar.t - killedAt
    if (ar.me.hp < 700) ar.me.hp = 1400
    if (killedAt > 0 && ar.t - killedAt > 25) break
  }
  return { killedAt, dist, got }
}
const rows = [[['gun', null], 90, false, 'gun kill at 90 m, alone after'], [['gun', null], 90, true, 'gun kill at 90 m, second hunter'], [['gun', 'laser'], 150, false, 'laser kill at ~150 m, alone after'], [['gun', 'laser'], 150, true, 'laser kill at ~150 m, second hunter']]
const out = []; let bad = 0
for (const [w, D, s, label] of rows) { const r = run(w, D, s); out.push(`${label}: kill at ${fx(r.dist, 0)} m, cubes ${r.got >= 0 ? 'collected after ' + fx(r.got, 1) + ' s' : 'NOT collected in 25 s'}`); if (r.killedAt > 0 && r.got < 0) bad++ }
check('D6 kill cubes collected after kills at the D2 fighting ranges', bad === 0, out.join(' | '))
