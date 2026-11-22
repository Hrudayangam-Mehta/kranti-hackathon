// D4 extra strafe reversal at an enemy magazine start; D3/D8 laser keeps charging during a LOSING retreat.
import { createBrain, hello, ctxNone, check, fx, cfg, Arena, mkObs, mech, dmgBy, wpn } from './common.js'
const still = (x, y) => (e, t, a) => { e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) }
// paired: identical arenas; at decision K brain B sees the first bullet of a magazine from the listed shooter (after silence)
function magPair(K) {
  const mk = () => { const ar = new Arena({ cfg, seed: 71, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 90, y: 0, hp: 1e7, dps: 6, script: still(90, 0) }] }); ar.t = 60; return ar }
  const A = mk(), Bq = mk(), bA = createBrain(hello, ctxNone, { warmup: false }), bB = createBrain(hello, ctxNone, { warmup: false })
  let j0A = 0, j0B = 0
  for (let k = 0; k < K + 4; k++) {
    const oA = A.obs(), oB = Bq.obs()
    if (k === K) { j0A = bA.debugState().counters.jinks; j0B = bB.debugState().counters.jinks }
    // a bullet just out of the shooter's muzzle flying at a point 6 m beside us (a miss: only the magazine start matters)
    if (k === K) oB.projectiles = [{ id: 901, kind: 'gun', pos: [86, 0, 7], vel: [-252, 252 * 6 / 86, 0] }]
    const aA = bA.act(oA, performance.now() + 27), aB = bB.act(oB, performance.now() + 27)
    A.step(aA); Bq.step(aB)
  }
  return { dA: bA.debugState().counters.jinks - j0A, dB: bB.debugState().counters.jinks - j0B }
}
{
  const rs = Array.from({ length: 30 }, (_, i) => 31 + i * 3).map(magPair)
  const extra = rs.filter((r) => r.dB > r.dA).length
  const both = rs.filter((r) => r.dA > 0).length
  check('D4 extra strafe reversal when an enemy magazine starts (first bullet after >= 2 s silence)', extra >= 0.5 * (rs.length - both), `30 moments: an extra reversal within 0.4 s in ${extra}, a scheduled one anyway in ${both}, none in ${rs.length - extra - both} (pairs without/with: ${rs.map((r) => `${r.dA}/${r.dB}`).join(' ')})`)
}
// laser keeps charging while LOSING (2 threats, 45% hp)
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  let dis = 0, laserHeld = 0, charge = 0
  for (let k = 0; k < 40; k++) {
    const t = 100 + k * 0.1
    const a = b.act(mkObs({ t, mechs: [mech(10, 120, 0), mech(11, 110, 40)], events: k % 10 === 0 ? [dmgBy(10), dmgBy(11, 45, 0.35)] : [], self: { hp: 0.45 * 1400, weapons: [wpn('gun'), wpn('laser', { charge })] } }), performance.now() + 27)
    if (b.debugState().mode === 'DISENGAGE') { dis++; if (a.fire[1]) laserHeld++ }
    charge = a.fire[1] ? Math.min(0.75, charge + 0.1) : 0
  }
  check('D3/D8 laser trigger kept while LOSING (keep charging during the retreat)', dis >= 30 && laserHeld >= 10, `DISENGAGE ${dis}/40, laser trigger held on ${laserHeld} of them`)
}
