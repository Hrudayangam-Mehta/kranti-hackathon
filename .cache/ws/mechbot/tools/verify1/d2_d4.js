// D2 ranges by loadout (+ presets), long-flight gun gate; D4 bullet dodge (paired runs), strafe intervals.
import { createBrain, hello, ctxNone, check, fx, mkObs, mech, dmgBy, cfg, wpn, Arena } from './common.js'
const H = cfg.mech.hp
const still = (x, y) => (e, t, a) => { e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) }
function rangeRun(weapons, D, secs, over = {}, opts = {}) {
  const ar = new Arena({ cfg, seed: 31 + D, me: { x: 0, y: 0, yaw: 0, weapons }, enemies: [{ id: 10, x: D, y: 0, hp: 1e7, dps: opts.dps ?? 8, weapons: opts.ew || ['gun'], script: still(D, 0) }] })
  ar.t = 60
  const b = createBrain(hello, ctxNone, { warmup: false, ...over })
  const ds = [], boosts = [], radial = []
  for (let k = 0; k < secs * 10; k++) {
    const o = ar.obs(); const a = b.act(o, performance.now() + 27)
    const d = Math.hypot(ar.enemies[0].x - ar.me.x, ar.enemies[0].y - ar.me.y)
    const ux = (ar.enemies[0].x - ar.me.x) / d, uy = (ar.enemies[0].y - ar.me.y) / d
    ds.push(d); boosts.push(a.boost && o.self.energy > 30 ? d : null); radial.push([d, a.move[0] * ux + a.move[1] * uy, b.debugState().leg])
    ar.step(a); if (ar.me.hp < 600) ar.me.hp = H
  }
  return { ds, boosts, radial, end: ds[ds.length - 1], min: Math.min(...ds.slice(-50)), max: Math.max(...ds.slice(-50)), b, ar }
}
{
  const g150 = rangeRun(['gun', null], 150, 25), g40 = rangeRun(['gun', null], 40, 15)
  const backR = g40.radial.filter((r) => r[0] < 54 && r[2] === 'standoff').map((r) => r[1])
  const meanBack = backR.length ? backR.reduce((s, v) => s + v, 0) / backR.length : NaN
  check('D2 gun only: from 150 m settles inside 55-95; from 40 m backs off to >= 55 at stick ~0.7', g150.min >= 55 && g150.max <= 95 && g40.min >= 54 && g40.max <= 95 && meanBack < -0.4 && meanBack > -0.85,
    `from 150: last 5 s ${fx(g150.min, 0)}-${fx(g150.max, 0)} m | from 40: last 5 s ${fx(g40.min, 0)}-${fx(g40.max, 0)} m, radial stick while inside 55 m ${fx(meanBack, 2)} (n ${backR.length})`)
  const g75 = rangeRun(['gun', null], 75, 15)
  console.log(`   info: gun only from 150 m ends at ${fx(g150.end, 0)} m (hold 75 is a dead band 55-95: no radial motion inside it); from 75 m stays ${fx(g75.min, 0)}-${fx(g75.max, 0)} m`)
}
{
  const l150 = rangeRun(['gun', 'laser'], 150, 25), l100 = rangeRun(['gun', 'laser'], 100, 15), l60 = rangeRun(['gun', 'laser'], 60, 6)
  const boostIn90 = l60.boosts.filter((d) => d !== null && d < 90).length, nIn90 = l60.ds.filter((d) => d < 90).length
  check('D2 laser (far): 150 m holds 125-185; from 100 m backs off past 125; boost away inside 90 m with energy > 30', l150.min >= 125 && l150.max <= 185 && l100.min >= 124 && boostIn90 > 0,
    `from 150: ${fx(l150.min, 0)}-${fx(l150.max, 0)} | from 100: ${fx(l100.min, 0)}-${fx(l100.max, 0)} | from 60: boost on ${boostIn90}/${nIn90} decisions inside 90 m`)
  const m150 = rangeRun(['gun', 'laser'], 150, 25, { select: { laserRange: 'mid' } }), m80 = rangeRun(['gun', 'laser'], 80, 15, { select: { laserRange: 'mid' } })
  check('D2 laser preset mid: band 100-130', m150.min >= 100 && m150.max <= 130 && m80.min >= 99 && m80.max <= 130, `from 150: ${fx(m150.min, 0)}-${fx(m150.max, 0)} | from 80: ${fx(m80.min, 0)}-${fx(m80.max, 0)}`)
}
{
  const r = rangeRun(['gun', 'lightning'], 120, 15, {}, { dps: 4 })
  const minD = Math.min(...r.ds), boostIn = r.boosts.filter((d) => d !== null && d < 90 && d > 40).length
  const r2 = (() => {
    const ar = new Arena({ cfg, seed: 33, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'lightning'] }, enemies: [{ id: 10, x: 120, y: 0, hp: 1e7, dps: 4, script: still(120, 0) }, { id: 11, x: 100, y: 55, hp: 1e7, dps: 4, script: still(100, 55) }] })
    ar.t = 60; const b = createBrain(hello, ctxNone, { warmup: false }); let mn = 1e9
    for (let k = 0; k < 150; k++) { const a = b.act(ar.obs(), performance.now() + 27); ar.step(a); mn = Math.min(mn, Math.hypot(120 - ar.me.x, ar.me.y)); if (ar.me.hp < 600) ar.me.hp = H }
    return mn
  })()
  check('D2 lightning without laser: lone target -> closes into the 20-34 m band around 28 m, boosting from < 90 m; second threat in sight (114 m, hitting us) -> no rush', minD <= 34.5 && boostIn > 0 && r2 > 45,
    `lone: closest ${fx(minD, 0)} m, boost decisions between 40 and 90 m ${boostIn} | with a second mech: closest to target ${fx(r2, 0)} m`)
}
// D2 long-flight gate: target at 170 m (flight 0.67 s): strafing (velocity changes) -> no gun; steady walk -> gun fires
{
  const gate = (script) => {
    const ar = new Arena({ cfg, seed: 35, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 170, y: 0, hp: 1e7, dps: 8, script }] }); ar.t = 60
    const b = createBrain(hello, ctxNone, { warmup: false, rPrefGun: 170, bandLo: 160, bandHi: 185 })
    for (let k = 0; k < 100; k++) { const a = b.act(ar.obs(), performance.now() + 27); a.move = [0, 0]; ar.step(a) }
    return ar.stats.shots
  }
  const unsteady = gate((e, t, a, dt) => { e.x = 170; const s = Math.floor(t / 0.45) % 2 ? 1 : -1; e.vx = 0; e.vy = s * 9; e.y += e.vy * dt; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) })
  const steady = gate((e, t, a, dt) => { e.x = 170; e.vx = 0; e.vy = 6; e.y += e.vy * dt; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) })
  check('D2 gun gate: no shots at an unsteady target with flight > 0.55 s, shots at a steady one', unsteady <= 3 && steady >= 20, `unsteady 170 m: ${unsteady} shots / 10 s | steady 170 m: ${steady} shots`)
}
// D4 strafe: reversal intervals U(0.8, 1.6) by default, preset fast 0.45-1.15
{
  const iv = (over) => {
    const r = rangeRun(['gun', null], 75, 40, over)
    const flips = []; let prev = null, lastT = null
    const ar = r.ar
    return r.b.debugState().counters.jinks
  }
  const def = iv({}), fast = iv({ select: { strafe: 'fast' } })
  check('D4 strafe reversals: default ~1 per 1.2 s; preset fast more often', def >= 40 / 1.6 - 3 && def <= 40 / 0.8 + 3 && fast > def, `40 s at 75 m: default ${def} reversals (expected 25-50), fast ${fast}`)
}
// D4 bullet dodge, paired runs: identical arenas and brains; at decision K brain B also sees an enemy gun bullet on a collision course
function dodgePair(missBy, K = 30, extraObs = 4) {
  const mk = () => { const ar = new Arena({ cfg, seed: 41, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: 1e7, dps: 6, script: still(80, 0) }] }); ar.t = 60; return ar }
  const A = mk(), Bq = mk(), bA = createBrain(hello, ctxNone, { warmup: false }), bB = createBrain(hello, ctxNone, { warmup: false })
  let bullet = null, diff = 0, maxDv = 0, perpDv = 0, dodges0 = 0
  for (let k = 0; k < K + 12; k++) {
    const oA = A.obs(), oB = Bq.obs()
    if (k === K) {
      // fired from the enemy at our position 0.25 s ahead along our current velocity (the house intercept), from 50 m out
      const me = Bq.me, tx = me.x + me.vx * 0.25, ty = me.y + me.vy * 0.25 + missBy
      const ex = me.x + 50, ey = me.y, d = Math.hypot(tx - ex, ty - ey), v = cfg.weapons.gun.speed
      bullet = { id: 777, kind: 'gun', pos: [ex, ey, me.z + 4.5], vel: [(tx - ex) / d * v, (ty - ey) / d * v, 0], t0: Bq.t }
      dodges0 = bB.debugState().counters.bulletDodges || 0
    }
    if (bullet && k >= K && k < K + extraObs) { const dt = Bq.t - bullet.t0; oB.projectiles = [{ id: 777, kind: 'gun', pos: [bullet.pos[0] + bullet.vel[0] * dt, bullet.pos[1] + bullet.vel[1] * dt, bullet.pos[2]], vel: bullet.vel }] }
    const aA = bA.act(oA, performance.now() + 27), aB = bB.act(oB, performance.now() + 27)
    if (JSON.stringify(aA) !== JSON.stringify(aB)) diff++
    A.step(aA); Bq.step(aB)
    if (bullet && k >= K && k < K + 6) {
      const dvx = Bq.me.vx - A.me.vx, dvy = Bq.me.vy - A.me.vy, bl = Math.hypot(bullet.vel[0], bullet.vel[1])
      maxDv = Math.max(maxDv, Math.hypot(dvx, dvy)); perpDv = Math.max(perpDv, Math.abs((-bullet.vel[1] * dvx + bullet.vel[0] * dvy) / bl))
    }
  }
  return { diff, maxDv, perpDv, dodges: (bB.debugState().counters.bulletDodges || 0) - dodges0, preDiff: 0 }
}
{
  const hit = dodgePair(0), miss = dodgePair(9)
  check('D4 bullet dodge: a bullet on course changes our velocity during its flight (paired run); one passing 9 m off does not', hit.dodges > 0 && hit.perpDv > 3 && miss.dodges === 0 && miss.maxDv < 0.01,
    `on course: dodge decisions ${hit.dodges}, velocity change up to ${fx(hit.maxDv, 1)} m/s (perpendicular ${fx(hit.perpDv, 1)}) within 0.6 s | 9 m off: dodges ${miss.dodges}, velocity change ${fx(miss.maxDv, 2)} m/s`)
}
