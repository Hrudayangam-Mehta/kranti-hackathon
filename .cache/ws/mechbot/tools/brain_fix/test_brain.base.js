// Tests for bot/lib/brain.js. DEV ONLY (not shipped logic).
// Run:  taskset -c 0 bun tools/test_brain.js        (or node tools/test_brain.js)      --quick = shorter fuzz
// a. stream replay (with and without the map): no exception, valid actions, decision time
// b. closed-loop scenarios in the micro-arena (tools/arena_micro.js)
// c. the full simulator, if P/sim/run.js exists, is driven separately (see notes/brain_checkpoint.md)

import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Arena, rng32 } from './arena_micro.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { World } = await import('../bot/lib/world.js')
const { Nav } = await import('../bot/lib/nav.js')
const { createBrain } = await import('../bot/lib/brain.js')
const QUICK = process.argv.includes('--quick')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)

const lines = gunzipSync(readFileSync(join(ROOT, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello')
const streamObs = lines.filter((l) => l.type === 'obs')
const cfg = hello.config
const world = World.loadSync(join(ROOT, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const logs = []
const ctxMap = { world, nav, log: (...a) => logs.push(a.join(' ')) }
const ctxNone = { world: null, nav: null, log: (...a) => logs.push(a.join(' ')) }

const results = []
function check(name, passed, detail) {
  results.push({ name, passed: !!passed })
  console.log((passed ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail)
}
const want = (name) => !ONLY || name.includes(ONLY)
const fx = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v))

function validAction(a) {
  if (!a || typeof a !== 'object') return 'not an object'
  if (!Array.isArray(a.move) || a.move.length !== 2 || !a.move.every(Number.isFinite)) return 'move'
  if (Math.hypot(a.move[0], a.move[1]) > 1 + 1e-9) return 'move length'
  if (!Array.isArray(a.aim) || a.aim.length !== 2 || !a.aim.every(Number.isFinite)) return 'aim'
  if (!Array.isArray(a.fire) || a.fire.length !== 2 || !a.fire.every((f) => typeof f === 'boolean')) return 'fire'
  if (typeof a.boost !== 'boolean') return 'boost'
  if ('jump' in a && typeof a.jump !== 'boolean') return 'jump'
  if ('reload' in a && typeof a.reload !== 'boolean') return 'reload'
  if ('pick' in a && !(Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2)) return 'pick'
  if ('take' in a && !(Number.isInteger(a.take) && a.take >= 0)) return 'take'
  if ('drop' in a && !(a.drop === 0 || a.drop === 1)) return 'drop'
  return null
}
const quant = (arr, p) => { const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }

/** Drive an arena with a brain for `seconds`. hook(arena, obs, action, brain) runs every decision. */
function drive(arena, brain, seconds, hook) {
  const n = Math.round(seconds * 10)
  let bad = null
  for (let k = 0; k < n; k++) {
    const obs = arena.obs()
    const t0 = performance.now()
    const a = brain.act(obs, t0 + 27.5)
    allTimes.push(performance.now() - t0)
    const v = validAction(a)
    if (v && !bad) bad = `tick ${obs.tick}: ${v}`
    if (hook) hook(arena, obs, a, brain)
    arena.step(a)
  }
  return bad
}
const allTimes = []
const BIGHP = 1e7
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }

// ============================================================================ a. stream replay
if (want('stream')) {
  for (const [label, ctx] of [['map', ctxMap], ['no map', ctxNone]]) {
    // three passes: the first includes JIT warm-up of a cold process, the best pass is what a warmed bot does
    const passes = []
    let bad = null, threw = null
    for (let pass = 0; pass < 3; pass++) {
      const brain = createBrain(hello, ctx)
      const times = []
      for (const o of streamObs) {
        const t0 = performance.now()
        let a
        try { a = brain.act(o, t0 + 27.5) } catch (e) { threw = threw || String(e && e.stack) }
        times.push(performance.now() - t0)
        const v = validAction(a)
        if (v && !bad) bad = `tick ${o.tick}: ${v}`
      }
      const st = brain.debugState()
      passes.push({ mean: times.reduce((a, b) => a + b, 0) / times.length, p99: quant(times, 0.99), max: Math.max(...times), errors: st.counters.errors, overruns: st.counters.overruns })
    }
    const cold = passes[0], warm = passes[2]
    const worst = { mean: Math.max(...passes.map((p) => p.mean)), p99: Math.max(...passes.map((p) => p.p99)), max: Math.max(...passes.map((p) => p.max)) }
    check(`stream replay (${label}): no exception, valid actions`, !threw && !bad && passes.every((p) => p.errors === 0), threw || bad || `300 obs x 3 passes, internal stage errors ${passes.map((p) => p.errors).join('/')}`)
    check(`stream replay (${label}): decision time mean<=4 p99<=15 max<=25 ms`, worst.mean <= 4 && worst.p99 <= 15 && worst.max <= 25,
      `cold pass mean ${fx(cold.mean)} p99 ${fx(cold.p99)} max ${fx(cold.max)} | warm pass mean ${fx(warm.mean)} p99 ${fx(warm.p99)} max ${fx(warm.max)} ms`)
  }
}

// ============================================================================ b. gun hit rates (flat ground)
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y }
function ceiling(R, spreadMul = 1) {
  const sd = cfg.weapons.gun.spread_deg * Math.PI / 180 * spreadMul
  if (sd === 0) return 1
  return erf((cfg.mech.radius + 0.3) / (R * sd * Math.SQRT2)) * erf((cfg.mech.height / 2 + 0.3) / (R * sd * Math.SQRT2))
}
function crossing(D, half, speed) {
  let dir = 1
  return (e, t, ar, dt) => {
    if (e.y > half) dir = -1; else if (e.y < -half) dir = 1
    const tv = dir * speed, dv = tv - e.vy, acc = cfg.mech.ground_accel * dt
    e.vy += Math.abs(dv) <= acc ? dv : Math.sign(dv) * acc
    e.vx = 0; e.x = D; e.y += e.vy * dt
    face(e, ar)
  }
}
function strafer(D, period, speed) {
  return (e, t, ar, dt) => {
    const dir = Math.floor(t / period) % 2 === 0 ? 1 : -1
    const tv = dir * speed, dv = tv - e.vy, acc = cfg.mech.ground_accel * dt
    e.vy += Math.abs(dv) <= acc ? dv : Math.sign(dv) * acc
    e.vx = 0; e.x = D; e.y += e.vy * dt
    face(e, ar)
  }
}
function gunRun(name, D, script, y0, opts = {}) {
  const ar = new Arena({ cfg, seed: 7 + D, spread: opts.spread ?? 1, fireDelayTicks: opts.fireDelayTicks ?? 0, me: { x: 0, y: 0, yaw: 0, pinned: opts.pinned },
    enemies: [{ id: 10, x: D, y: y0, hp: BIGHP, script }] })
  const brain = createBrain(hello, ctxNone, { rPrefGun: D, bandLo: D - 10, bandHi: D + 10, ...(opts.over || {}) })
  let sumR = 0, n = 0
  const bad = drive(ar, brain, 31.5, (a) => { a.countShots = a.t < 30; sumR += Math.hypot(a.enemies[0].x - a.me.x, a.enemies[0].y - a.me.y); n++ })
  const s = ar.stats
  return { rate: s.shots ? s.hits / s.shots : 0, shots: s.shots, hits: s.hits, meanR: sumR / n, bad, errors: brain.debugState().counters.errors }
}
if (want('gun')) {
  const walk = cfg.mech.walk_speed
  for (const [D, thr] of [[60, 0.9], [100, 0.85], [150, 0.7]]) {
    const r = gunRun('cross', D, crossing(D, 60, walk), -60)
    const r0 = gunRun('cross', D, crossing(D, 60, walk), -60, { spread: 0 })
    const rl = gunRun('cross', D, crossing(D, 60, walk), -60, { fireDelayTicks: 1 })
    check(`gun: target walking across at ${D} m, hit rate >= ${thr}`, r.rate >= thr && !r.bad && r.errors === 0,
      `${fx(r.rate, 3)} (${r.hits}/${r.shots}, mean range ${fx(r.meanR, 0)} m, spread ceiling ${fx(ceiling(r.meanR), 2)}) | no spread ${fx(r0.rate, 3)} | shot one tick later ${fx(rl.rate, 3)}`)
  }
  {
    const r = gunRun('strafe', 100, strafer(100, 2, walk), 0), r0 = gunRun('strafe', 100, strafer(100, 2, walk), 0, { spread: 0 })
    check('gun: target strafing with reversals every 2 s at 100 m, hit rate >= 0.6', r.rate >= 0.6 && !r.bad, `${fx(r.rate, 3)} (${r.hits}/${r.shots}) | no spread ${fx(r0.rate, 3)}`)
  }
  {
    const still = (e, t, ar) => face(e, ar)
    const r = gunRun('still', 200, still, 0), r0 = gunRun('still', 200, still, 0, { spread: 0 })
    const c = ceiling(r.meanR)
    // The task asks for >= 0.9. With the measured dispersion (sigma 0.6 deg per axis) a perfect aim hits a 2.5 m
    // body at 200 m only ~80% of the time, so 0.9 is checked on the fire-control error alone (no spread) and
    // the run with real spread must reach 92% of its physical ceiling.
    check('gun: stationary target at 200 m (>= 0.9 without spread, >= 0.92 x ceiling with spread)', r0.rate >= 0.9 && r.rate >= 0.92 * c,
      `no spread ${fx(r0.rate, 3)} (${r0.hits}/${r0.shots}) | spread 0.6 deg ${fx(r.rate, 3)} (${r.hits}/${r.shots}), physical ceiling ${fx(c, 3)} at ${fx(r.meanR, 0)} m`)
  }
}

// ============================================================================ b. zone
if (want('zone')) {
  {
    const zone = { center: [41.3, -72.8], radius: 560, next_center: [-42.12, 7.11], next_radius: 380, shrink_start: 5, shrink_end: 55, dps: 20 }
    const ar = new Arena({ cfg, world, nav, seed: 3, me: { x: 320.21, y: -280.29, yaw: 2.5 }, zone })
    const brain = createBrain(hello, ctxMap)
    const d0 = Math.hypot(ar.me.x - zone.next_center[0], ar.me.y - zone.next_center[1])
    const bad = drive(ar, brain, 60)
    const d1 = Math.hypot(ar.me.x - zone.next_center[0], ar.me.y - zone.next_center[1])
    check('zone: outside the next circle, shrink in 5 s -> reaches it, never outside the current circle', ar.stats.outsideTicks === 0 && d1 <= zone.next_radius && !bad,
      `distance to next centre ${fx(d0, 0)} -> ${fx(d1, 0)} m (next radius ${zone.next_radius}), ticks outside ${ar.stats.outsideTicks}, hp ${fx(ar.me.hp, 0)}`)
  }
  {
    const zone = { center: [-42.12, 7.11], radius: 330, next_center: [-42.12, 7.11], next_radius: 240, shrink_start: 30, shrink_end: 70, dps: 35 }
    const ar = new Arena({ cfg, world, nav, seed: 4, me: { x: 320.21, y: -280.29, yaw: 2.5 }, zone })
    const brain = createBrain(hello, ctxMap)
    let canBoost = 0, didBoost = 0, tIn = -1
    const d0 = Math.hypot(ar.me.x - zone.center[0], ar.me.y - zone.center[1]) - zone.radius
    const bad = drive(ar, brain, 40, (a, obs, act) => {
      if (obs.self.in_zone === false) { if (obs.self.energy > 5) { canBoost++; if (act.boost) didBoost++ } } else if (tIn < 0) tIn = a.t
    })
    check('zone: outside the zone -> boosts in', tIn > 0 && didBoost >= 0.9 * canBoost && canBoost > 10 && !bad,
      `${fx(d0, 0)} m outside, inside after ${fx(tIn, 1)} s (walking alone: ${fx(d0 / cfg.mech.walk_speed, 1)} s), boost on ${didBoost}/${canBoost} decisions with energy, hp left ${fx(ar.me.hp, 0)}`)
  }
}

// ============================================================================ b. heal
function findHealSpot() {
  const rnd = rng32(99), B = world.bounds
  for (let k = 0; k < 4000; k++) {
    const x = B.minX + 60 + rnd() * (B.maxX - B.minX - 120), y = B.minY + 60 + rnd() * (B.maxY - B.minY - 120)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
    const wd = nav.wallDistAt(x, y)
    if (wd < 8 || wd > 20) continue
    const a = rnd() * Math.PI * 2, ex = x + 100 * Math.cos(a), ey = y + 100 * Math.sin(a)
    if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
    if (Math.abs(z - ez) > 3) continue
    if (!world.shotClear(x, y, z + 7, ex, ey, ez + 4.5) || !world.shotClear(ex, ey, ez + 7, x, y, z + 4.5)) continue
    // a hidden standable cell within 30 m that can be walked to
    let hide = null
    for (let r = 8; r <= 30 && !hide; r += 4) for (let q = 0; q < 16 && !hide; q++) {
      const hx = x + r * Math.cos(q * Math.PI / 8), hy = y + r * Math.sin(q * Math.PI / 8)
      if (!nav.passableAt(hx, hy)) continue
      const hz = nav.levelAt(hx, hy)
      if (world.shotClear(ex, ey, ez + 7, hx, hy, hz + 4.5) || world.shotClear(ex, ey, ez + 7, hx, hy, hz + 8.1)) continue
      const p = nav.findPath(x, y, hx, hy)
      if (p.ok && p.len < 60) hide = [hx, hy]
    }
    if (hide) return { x, y, ex, ey, hide }
  }
  return null
}
if (want('heal')) {
  const spot = findHealSpot()
  if (!spot) check('heal: scenario location found', false, 'no location')
  else {
    const ar = new Arena({ cfg, world, nav, seed: 5, me: { x: spot.x, y: spot.y, yaw: Math.atan2(spot.ey - spot.y, spot.ex - spot.x), hp: 0.3 * cfg.mech.hp },
      enemies: [{ id: 10, x: spot.ex, y: spot.ey, hp: 1400, dps: 60, script: (e, t, a) => face(e, a) }] })
    const brain = createBrain(hello, ctxMap)
    let tHidden = -1, shotsWhileHealing = 0, tHealed = -1, shotsAtHealed = 0, exposedAfter = 0, lastShots = 0, tResume = -1, modes = {}
    const bad = drive(ar, brain, 110, (a, obs, act, br) => {
      const e = a.enemies[0], me = a.me
      const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5)
      const st = br.debugState(); modes[st.mode] = (modes[st.mode] || 0) + 1
      if (!los && tHidden < 0) tHidden = a.t
      const newShots = a.stats.shots + a.stats.beams - lastShots; lastShots = a.stats.shots + a.stats.beams
      if (tHidden >= 0 && tHealed < 0) {
        if (a.t > tHidden + 1) { shotsWhileHealing += newShots; if (los) exposedAfter++ }
        if (me.hp >= 0.9 * me.maxHp) { tHealed = a.t; shotsAtHealed = lastShots }
      } else if (tHealed >= 0 && tResume < 0 && newShots > 0) tResume = a.t
    })
    const ok = tHidden >= 0 && tHidden <= 15 && shotsWhileHealing === 0 && tHealed > 0 && tResume > 0 && !bad && ar.me.hp > 0
    check('heal: at 30% hp breaks the line of fire, holds fire, resumes above 90%', ok,
      `line of fire broken at ${fx(tHidden, 1)} s, shots while healing ${shotsWhileHealing}, decisions re-exposed ${exposedAfter}, 90% hp at ${fx(tHealed, 1)} s, firing again at ${fx(tResume, 1)} s, ` +
      `damage taken ${fx(ar.stats.dmgTaken, 0)}, enemy hp ${fx(ar.enemies[0].hp, 0)}, modes ${JSON.stringify(modes)}`)
  }
}

// ============================================================================ b. shell dodge
if (want('dodge')) {
  const splash = cfg.weapons.mortar.splash_radius
  let all = [], lead = []
  for (const D of [60, 90, 130]) {
    for (const leadShot of [false, true]) {
      const ar = new Arena({ cfg, seed: 11 + D, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: D, y: 0, hp: BIGHP, weapons: ['gun', 'mortar'], script: (e, t, a) => face(e, a) }] })
      const brain = createBrain(hello, ctxNone)
      let next = 2.0
      drive(ar, brain, 30, (a) => {
        if (a.t >= next) {
          next += 3.7
          const e = a.enemies[0], me = a.me
          const fl = Math.hypot(me.x - e.x, me.y - e.y) / (cfg.weapons.mortar.speed * 0.95)
          a.lob(e, me.x + (leadShot ? me.vx * fl : 0), me.y + (leadShot ? me.vy * fl : 0))
        }
      })
      for (const s of ar.stats.shellImpacts) (leadShot ? lead : all).push(s.d)
    }
  }
  const minD = Math.min(...all), evaded = all.filter((d) => d >= splash + 2).length
  const evLead = lead.filter((d) => d >= splash + 2).length
  check(`shell dodge: shells aimed at our position land >= ${splash + 2} m away`, all.length >= 15 && evaded === all.length,
    `${evaded}/${all.length} evaded, closest ${fx(minD, 1)} m | shells led on our velocity: ${evLead}/${lead.length} evaded, closest ${fx(Math.min(...lead), 1)} m`)
}

// ============================================================================ b. laser
if (want('laser')) {
  const ar = new Arena({ cfg, seed: 21, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 10, x: 110, y: -60, hp: BIGHP, script: crossing(110, 60, cfg.mech.walk_speed) }] })
  const brain = createBrain(hello, ctxNone, { rPrefGun: 110, rPrefLaser: 110, bandLo: 100, bandHi: 120 })
  const bad = drive(ar, brain, 31.5, (a) => { a.countShots = a.t < 30 })
  const s = ar.stats, full = cfg.weapons.laser.charge
  const minCharge = s.beamCharge.length ? Math.min(...s.beamCharge) : 0
  check('laser: holds to full charge and releases on target', s.beams >= 8 && s.beamHits >= 0.9 * s.beams && minCharge >= 0.97 * full && !bad,
    `${s.beamHits}/${s.beams} beams through the target body, smallest charge at release ${fx(minCharge)} s of ${full} s, gun alongside ${s.hits}/${s.shots}`)
}

// ============================================================================ b. offers and pickups
if (want('offer')) {
  const base = JSON.parse(JSON.stringify(streamObs[0]))
  const mk = (ids, weapons, n = 1) => {
    const brain = createBrain(hello, ctxNone)
    let a = null
    for (let k = 0; k < n; k++) {
      const o = JSON.parse(JSON.stringify(base))
      o.tick = k * 2; o.t = k * 0.1
      if (weapons) o.self.weapons[1] = { kind: weapons, cooldown: 0, charge: 0, stats: cfg.weapons[weapons] }
      o.offer = { id: k + 1, expires: 99, choices: ids.map((id) => ({ id, name: id, desc: '' })) }
      a = brain.act(o, performance.now() + 27)
    }
    return a.pick
  }
  const cases = [
    [['gun_rate', 'armor', 'sensors'], null, 1, 1, 'armor over gun_rate and sensors'],
    [['servos', 'nanites', 'gun_damage'], null, 1, 1, 'nanites first in the first two offers'],
    [['servos', 'nanites', 'gun_damage'], null, 3, 2, 'gun_damage over nanites from the third offer'],
    [['plating', 'gun_damage', 'armor'], null, 1, 1, 'gun_damage over plating'],
    [['laser_damage', 'plating', 'gyros'], 'laser', 1, 0, 'laser_damage when holding a laser'],
    [['capacitor', 'gyros', 'sensors'], null, 1, 1, 'gyros over capacitor without lightning'],
    [['capacitor', 'gyros', 'sensors'], 'lightning', 1, 0, 'capacitor with lightning'],
    [['jets', 'mortar_splash', 'sensors'], null, 1, 2, 'sensors over unlisted upgrades'],
  ]
  const fails = cases.filter((c) => mk(c[0], c[1], c[2]) !== c[3]).map((c) => c[4])
  check('offer: picks by the priority list', fails.length === 0, fails.length ? 'wrong: ' + fails.join('; ') : `${cases.length} cases`)
}
if (want('pickup')) {
  const run = (weapons, kind, dist) => {
    const ar = new Arena({ cfg, seed: 31, me: { x: 0, y: 0, yaw: 0, weapons }, pickups: [{ id: 8001, kind, pos: [dist, 0, 0] }] })
    const brain = createBrain(hello, ctxNone)
    drive(ar, brain, 12)
    return { takes: ar.stats.takes, weapons: ar.me.weapons.map((w) => (w ? w.kind : null)), first: ar.stats.takes[0] || null, ar }
  }
  const a = run(['gun', null], 'laser', 3), b = run(['gun', 'lightning'], 'laser', 3), c = run(['gun', 'laser'], 'lightning', 3)
  const d = run(['gun', null], 'mortar', 3), e = run(['gun', null], 'lightning', 30), f = run(['gun', 'mortar'], 'lightning', 3)
  const ok = a.weapons[1] === 'laser' && a.first.drop === null && b.weapons[1] === 'laser' && b.first && b.first.drop === 1 &&
    c.takes.length === 0 && d.takes.length === 0 && e.weapons[1] === 'lightning' && f.weapons[1] === 'lightning' && f.first.drop === 1
  check('pickup: take within reach, drop only when both slots are full and the new weapon ranks higher', ok,
    `empty+laser -> ${a.weapons} (${a.takes.length} take) | lightning+laser -> ${b.weapons} drop ${b.first && b.first.drop} | laser+lightning -> ${c.takes.length} takes | ` +
    `empty+mortar -> ${d.takes.length} takes | walked 30 m to a lightning -> ${e.weapons} | mortar+lightning -> ${f.weapons}`)
}

// ============================================================================ b. stuck / path following on the real map
function findWallCase() {
  const rnd = rng32(1234), B = world.bounds, out = []
  for (let k = 0; k < 200000 && out.length < 3; k++) {
    const x = B.minX + 40 + rnd() * (B.maxX - B.minX - 80), y = B.minY + 40 + rnd() * (B.maxY - B.minY - 80)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
    const wd = nav.wallDistAt(x, y)
    if (wd > 4.5) continue
    const a = rnd() * Math.PI * 2
    const d = 26 + rnd() * 12, gx = x + d * Math.cos(a), gy = y + d * Math.sin(a)
    if (!nav.passableAt(gx, gy) || nav.component(gx, gy) !== nav.mainComponent || nav.wallDistAt(gx, gy) < 3.5) continue
    if (nav.walkLine(x, y, gx, gy)) continue
    // a building must stand on the straight line
    const mx = (x + gx) / 2, my = (y + gy) / 2
    if (!world.bodyBlocked(mx, my, nav.levelAt(mx, my), 2.5, 9, 1.2)) continue
    if (Math.abs(nav.levelAt(x, y) - nav.levelAt(gx, gy)) > 2.5) continue
    const p = nav.findPath(x, y, gx, gy)
    if (!p.ok || p.len < d * 1.5 || p.len > 110) continue
    out.push({ x, y, gx, gy, yaw: a, len: p.len, d })
  }
  return out
}
if (want('stuck')) {
  const cases = findWallCase()
  let ok = cases.length === 3, detail = []
  for (const c of cases) {
    const zone = { center: [c.x, c.y], radius: 3000, next_center: [c.x, c.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
    const ar = new Arena({ cfg, world, nav, seed: 41, me: { x: c.x, y: c.y, yaw: c.yaw }, zone, cubes: [{ id: 5001, pos: [c.gx, c.gy, nav.levelAt(c.gx, c.gy)] }] })
    const brain = createBrain(hello, ctxMap)
    let tGot = -1
    const bad = drive(ar, brain, 30, (a) => { if (tGot < 0 && a.stats.cubesTaken) tGot = a.t })
    const st = brain.debugState()
    if (tGot < 0 || bad) ok = false
    detail.push(`${fx(c.d, 0)} m straight / ${fx(c.len, 0)} m path: ${tGot < 0 ? 'NOT reached (' + fx(Math.hypot(ar.me.x - c.gx, ar.me.y - c.gy), 0) + ' m left, ' + st.mode + '/' + st.leg + ')' : 'reached in ' + fx(tGot, 1) + ' s'} (stuck events ${st.counters.stuck})`)
  }
  check('stuck: facing a wall with the goal behind it -> path following reaches the goal (real map)', ok, detail.join(' | ') || 'no case found')
}

// stuck ladder: without navigation the bot walks straight into the wall; it must jump / sidestep and finally
// give the goal up instead of pushing forever
if (want('ladder')) {
  const cases = findWallCase()
  const c = cases[0]
  if (!c) check('stuck ladder', false, 'no case')
  else {
    const zone = { center: [c.x, c.y], radius: 3000, next_center: [c.x, c.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
    const ar = new Arena({ cfg, world, nav, seed: 42, me: { x: c.x, y: c.y, yaw: c.yaw }, zone, cubes: [{ id: 5001, pos: [c.gx, c.gy, nav.levelAt(c.gx, c.gy)] }] })
    const brain = createBrain(hello, ctxNone)
    let jumps = 0
    const bad = drive(ar, brain, 25, (a, obs, act) => { if (act.jump) jumps++ })
    const st = brain.debugState()
    check('stuck ladder (no nav, wall in the way): jump + sidestep, then the goal is abandoned', st.counters.stuck >= 1 && jumps >= 1 && (st.counters.abandons >= 1 || ar.stats.cubesTaken) && !bad && st.counters.errors === 0,
      `stuck events ${st.counters.stuck}, jumps ${jumps}, goals abandoned ${st.counters.abandons}, cube ${ar.stats.cubesTaken ? 'reached anyway' : 'not reached'}, final mode ${st.mode}/${st.leg}`)
  }
}

// ============================================================================ b. duel against a scripted hunter (layers 2-4 together, real map)
function hunter(script) {
  let path = null, pt = -9, wp = 1
  return (e, t, ar, dt) => {
    const me = ar.me, d = Math.hypot(me.x - e.x, me.y - e.y)
    const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) && (world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 4.5) || world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 9))
    e.yaw = Math.atan2(me.y - e.y, me.x - e.x)
    // linear-lead shooter: accuracy by range, reduced when we are moving sideways beyond 60 m
    const moving = me.vx * me.vx + me.vy * me.vy > 30 && d > 60
    e.dps = los && d < 230 ? 107 * (d < 40 ? 0.85 : d < 90 ? 0.7 : d < 160 ? 0.45 : 0.25) * (moving ? 0.6 : 1) : 0
    if (los && d < 75) { e.vx = 0; e.vy = 0; return }
    if (t - pt > 1) { pt = t; const r = nav.findPath(e.x, e.y, me.x, me.y, { maxExpand: 6000 }); path = r.pts; wp = 1 }
    if (path && path.length > 1) {
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - e.x, path[wp][1] - e.y) < 2) wp++
      const tx = path[wp][0] - e.x, ty = path[wp][1] - e.y, l = Math.hypot(tx, ty) || 1
      e.vx = tx / l * cfg.mech.walk_speed; e.vy = ty / l * cfg.mech.walk_speed
      e.x += e.vx * dt; e.y += e.vy * dt
    }
  }
}
function duel(seed, nEn) {
  const rnd = rng32(seed), Bd = world.bounds
  let mx = 0, my = 0
  for (let k = 0; k < 5000; k++) {
    mx = Bd.minX + 80 + rnd() * (Bd.maxX - Bd.minX - 160); my = Bd.minY + 80 + rnd() * (Bd.maxY - Bd.minY - 160)
    if (nav.passableAt(mx, my) && nav.component(mx, my) === nav.mainComponent && nav.wallDistAt(mx, my) > 4) break
  }
  const enemies = []
  for (let i = 0; i < nEn; i++) {
    let ex = mx, ey = my
    for (let k = 0; k < 2000; k++) { const a = rnd() * 6.283, d = 150 + rnd() * 80; ex = mx + d * Math.cos(a); ey = my + d * Math.sin(a); if (nav.passableAt(ex, ey) && nav.component(ex, ey) === nav.mainComponent) break }
    enemies.push({ id: 10 + i, x: ex, y: ey, hp: cfg.mech.hp, script: hunter() })
  }
  const ar = new Arena({ cfg, world, nav, seed, me: { x: mx, y: my, yaw: 0 }, enemies, zone: { center: [mx, my], radius: 3000, next_center: [mx, my], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
  const brain = createBrain(hello, ctxMap)
  let tKill = -1, bad = null
  for (let k = 0; k < 900 && ar.me.hp > 0; k++) {
    bad = bad || drive(ar, brain, 0.1)
    if (tKill < 0 && ar.enemies.every((e) => !e.alive)) tKill = ar.t
    if (tKill >= 0 && ar.me.hp >= 0.9 * ar.me.maxHp) break
  }
  const st = brain.debugState()
  return { kills: ar.enemies.filter((e) => !e.alive).length, hp: ar.me.hp, tKill, t: ar.t, shots: ar.stats.shots, hits: ar.stats.hits, sw: st.counters.modeSwitches, err: st.counters.errors, bad }
}
if (want('duel')) {
  const rs = [1, 2, 3, 4, 5, 6].map((s) => duel(s, 1))
  const won = rs.filter((r) => r.kills === 1 && r.hp > 0).length
  check('duel: one hunter walking in on the real map is killed and we survive (6 seeds)', won === 6 && rs.every((r) => !r.bad && r.err === 0),
    rs.map((r) => `${r.kills ? 'kill ' + fx(r.tKill, 0) + ' s' : 'no kill'} hp ${fx(r.hp, 0)} acc ${r.hits}/${r.shots}`).join(' | '))
  const r2s = [1, 2, 3, 4, 5, 6].map((s) => duel(s, 2))
  console.log('INFO  two hunters at once (no pass criterion): ' + r2s.map((r) => `${r.kills}/2 kills hp ${fx(Math.max(0, r.hp), 0)}`).join(' | '))
}

// ============================================================================ layer 6: corner ambush, last stand
function findAmbushCase() {
  const rnd = rng32(4321), Bd = world.bounds
  for (let k = 0; k < 300000; k++) {
    const x = Bd.minX + 60 + rnd() * (Bd.maxX - Bd.minX - 120), y = Bd.minY + 60 + rnd() * (Bd.maxY - Bd.minY - 120)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent || nav.wallDistAt(x, y) < 5) continue
    const a = rnd() * 6.283, d = 110 + rnd() * 60, hx = x + d * Math.cos(a), hy = y + d * Math.sin(a)
    if (!nav.passableAt(hx, hy) || nav.component(hx, hy) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), hz = nav.levelAt(hx, hy)
    if (world.shotClear(x, y, z + 7, hx, hy, hz + 4.5) || world.shotClear(x, y, z + 7, hx, hy, hz + 8)) continue
    const p = nav.findPath(hx, hy, x, y)
    if (!p.ok || p.len > 260) continue
    // the pursuer must come into view at 40-110 m, not at point blank
    let acc = 0, emerge = -1
    for (let i = 1; i < p.pts.length && emerge < 0; i++) {
      const seg = Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1])
      for (let q = 1; q <= 8; q++) {
        const px = p.pts[i - 1][0] + (p.pts[i][0] - p.pts[i - 1][0]) * q / 8, py = p.pts[i - 1][1] + (p.pts[i][1] - p.pts[i - 1][1]) * q / 8
        if (world.shotClear(x, y, z + 7, px, py, nav.levelAt(px, py) + 4.5)) { emerge = Math.hypot(px - x, py - y); break }
      }
      acc += seg
    }
    if (emerge < 45 || emerge > 110 || acc < 60) continue
    return { x, y, hx, hy, emerge }
  }
  return null
}
if (want('ambush')) {
  const c = findAmbushCase()
  if (!c) check('ambush: scenario found', false, 'no location')
  else {
    const run = (over) => {
      const ar = new Arena({ cfg, world, nav, seed: 61, me: { x: c.x, y: c.y, yaw: 0 }, enemies: [{ id: 10, x: c.hx, y: c.hy, hp: cfg.mech.hp, script: hunter() }],
        zone: { center: [c.x, c.y], radius: 3000, next_center: [c.x, c.y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
      const brain = createBrain(hello, ctxMap, over)
      let tLos = -1, aimErr = -1, tShot = -1, moved = 0, tHit = -1
      const x0 = ar.me.x, y0 = ar.me.y
      const bad = drive(ar, brain, 60, (a, obs, act) => {
        const e = a.enemies[0], me = a.me
        if (e.alive) e.lastSeen = a.t                       // the server keeps sending its true position (memory / squad chatter)
        const los = e.alive && world.shotClear(me.x, me.y, me.z + 7, e.x, e.y, e.z + 4.5)
        if (los && tLos < 0) { tLos = a.t; aimErr = Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - me.y, e.x - me.x) - me.yaw), Math.cos(Math.atan2(e.y - me.y, e.x - me.x) - me.yaw))); moved = Math.hypot(me.x - x0, me.y - y0) }
        if (tLos >= 0 && tShot < 0 && a.stats.shots > 0) tShot = a.t
        if (tLos >= 0 && tHit < 0 && a.stats.hits > 0) tHit = a.t
      })
      const st = brain.debugState()
      return { tLos, aimErr, tShot, tHit, kill: !ar.enemies[0].alive, hp: ar.me.hp, amb: st.counters.ambushTicks || 0, bad, err: st.counters.errors, moved }
    }
    const r = run({})
    check('ambush (M2): pre-aimed at the corner, first shot on first sight, pursuer killed', r.amb >= 5 && r.tLos > 0 && r.aimErr <= 0.35 && r.tShot >= 0 && r.tShot - r.tLos <= 0.5 && r.kill && r.hp > 0 && !r.bad && r.err === 0,
      `emergence at ${fx(c.emerge, 0)} m; ambush decisions ${r.amb}; aim error at first sight ${fx(r.aimErr, 3)} rad; first shot ${fx(r.tShot - r.tLos, 2)} s and first hit ${fx(r.tHit - r.tLos, 2)} s after first sight; kill ${r.kill}, hp left ${fx(r.hp, 0)}`)
  }
}
if (want('laststand')) {
  // 18% hp, two attackers with a line of fire and no time to reach cover: the bot must keep shooting
  const spot = findHealSpot()
  const ar = new Arena({ cfg, world, nav, seed: 71, me: { x: spot.x, y: spot.y, yaw: Math.atan2(spot.ey - spot.y, spot.ex - spot.x), hp: 0.18 * cfg.mech.hp },
    enemies: [{ id: 10, x: spot.ex, y: spot.ey, hp: 500, dps: 45, script: (e, t, a) => face(e, a) }, { id: 11, x: spot.ex + 6, y: spot.ey + 6, hp: 1400, dps: 45, script: (e, t, a) => face(e, a) }] })
  const brain = createBrain(hello, ctxMap)
  let ls = 0, n = 0, modes = {}
  for (let k = 0; k < 80 && ar.me.hp > 0; k++) drive(ar, brain, 0.1, (a, obs, act, br) => { const st = br.debugState(); n++; if (st.stance === 'LAST-STAND') ls++; modes[st.mode] = (modes[st.mode] || 0) + 1 })
  check('last stand: doomed with two attackers -> LAST-STAND stance, keeps firing at the weakest until death', ls >= 0.5 * n && ar.stats.shots >= 3 && ar.enemies[0].hp < 500 && ar.enemies[1].hp === 1400 && (modes.HEAL || 0) <= 2,
    `alive ${fx(n / 10, 1)} s, LAST-STAND on ${ls}/${n} decisions, modes ${JSON.stringify(modes)}, shots ${ar.stats.shots}, hits ${ar.stats.hits}, weak enemy hp 500 -> ${fx(ar.enemies[0].hp, 0)}, strong enemy untouched ${ar.enemies[1].hp === 1400}`)
}

// ============================================================================ layer 7: stance, environment, torso veto
if (want('stance')) {
  // SQUAD default: healthy with one hunter -> OPPORTUNIST; below half hp -> DEFENSIVE (immediately)
  const mkAr = (hp) => new Arena({ cfg, seed: 81, me: { x: 0, y: 0, yaw: 0, hp }, enemies: [{ id: 10, x: 110, y: 0, hp: 1400, script: (e, t, a) => face(e, a) }] })
  const a1 = mkAr(1400), b1 = createBrain(hello, ctxNone); drive(a1, b1, 4)
  const a2 = mkAr(600), b2 = createBrain(hello, ctxNone); drive(a2, b2, 2)
  const s1 = b1.debugState(), s2 = b2.debugState()
  check('stance: SQUAD healthy with one hunter is OPPORTUNIST and fires first; under half hp is DEFENSIVE', s1.stance === 'OPPORTUNIST' && s1.env === 'SQUAD' && a1.stats.shots > 5 && s2.stance === 'DEFENSIVE',
    `healthy: ${s1.stance}/${s1.env}, shots ${a1.stats.shots} | 43% hp: ${s2.stance}`)
}
if (want('env')) {
  // two other mechs lasering each other in view -> FFA latch; otherwise the default stays SQUAD
  const base = JSON.parse(JSON.stringify(streamObs[0]))
  const [x, y, z] = base.self.pos
  const feed = (brain, withBeams, n) => {
    for (let k = 0; k < n; k++) {
      const o = JSON.parse(JSON.stringify(base))
      o.tick = k * 2; o.t = k * 0.1; o.alive = 16
      o.mechs = [{ id: 5, kind: 'mech', pos: [x + 150, y, z], vel: [0, 0, 0], aim: [1.57, 0], hp: 1400 - (withBeams ? 100 * Math.floor(k / 10) : 0), max_hp: 1400, cubes: 0, weapons: ['gun', 'laser'], charging: false },
        { id: 6, kind: 'mech', pos: [x + 150, y + 60, z], vel: [0, 0, 0], aim: [-1.57, 0], hp: 1400 - (withBeams ? 100 * Math.floor(k / 10) : 0), max_hp: 1400, cubes: 0, weapons: ['gun', 'laser'], charging: false }]
      if (withBeams && k % 10 === 5) o.beams = [{ by: k % 20 === 5 ? 5 : 6, kind: 'laser', path: k % 20 === 5 ? [[x + 150, y, z + 7], [x + 150, y + 60, z + 5]] : [[x + 150, y + 60, z + 7], [x + 150, y, z + 5]], age: 0.05 }]
      brain.act(o, performance.now() + 27)
    }
    return brain.debugState()
  }
  const sF = feed(createBrain(hello, ctxNone), true, 40), sS = feed(createBrain(hello, ctxNone), false, 40)
  const sO = feed(createBrain(hello, ctxNone, { env: 'squad' }), true, 40), sX = feed(createBrain(hello, ctxNone, { env: 'ffa' }), false, 5)
  check('environment: mechs shooting each other latch FFA; quiet mechs stay SQUAD; PARAMS.env overrides', sF.env === 'FFA' && sS.env === 'SQUAD' && sO.env === 'SQUAD' && sX.env === 'FFA',
    `fight evidence: ${sF.env} (F=${sF.F}, Q=${sF.Q}) | none: ${sS.env} (F=${sS.F}) | env:'squad' override: ${sO.env} | env:'ffa' override: ${sX.env}; FFA stance with an unaware healthy target: ${sX.stance}`)
}
if (want('veto')) {
  // target in front, a second mech hitting us hard from behind: the torso may not leave it more than 80 deg off
  const ar = new Arena({ cfg, seed: 91, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 100, y: 0, hp: 300, script: (e, t, a) => face(e, a) }, { id: 11, x: -90, y: 10, hp: BIGHP, dps: 110, script: (e, t, a) => face(e, a) }] })
  const brain = createBrain(hello, ctxNone)
  let worst = 0, n = 0
  drive(ar, brain, 8, (a, obs, act) => {
    if (a.t < 3 || !a.enemies[1].alive) return
    const me = a.me, e = a.enemies[1]
    const off = Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - me.y, e.x - me.x) - act.aim[0]), Math.cos(Math.atan2(e.y - me.y, e.x - me.x) - act.aim[0])))
    worst = Math.max(worst, off); n++
  })
  check('torso veto: an attacker of >= 60 dps is never left more than 80 deg off the commanded yaw', n > 20 && worst <= 80 * Math.PI / 180 + 0.02, `worst offset ${fx(worst * 180 / Math.PI, 1)} deg over ${n} decisions, vetoes ${brain.debugState().counters.aimVetoes || 0}`)
}

// ============================================================================ second weapons and kill drops (sanity, closed loop)
if (want('weapons')) {
  // lightning: a lone target and a full tank -> rush to arc range and hold the trigger there
  const ar = new Arena({ cfg, seed: 95, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'lightning'] }, enemies: [{ id: 10, x: 120, y: 0, hp: BIGHP, script: (e, t, a) => face(e, a) }] })
  const brain = createBrain(hello, ctxNone)
  let minD = 1e9, zapTicks = 0
  const bad = drive(ar, brain, 14, (a, obs, act) => { const d = Math.hypot(a.enemies[0].x - a.me.x, a.enemies[0].y - a.me.y); minD = Math.min(minD, d); if (act.fire[1] && d <= cfg.weapons.lightning.range) zapTicks++ })
  // mortar in the second slot: must not break the gun (the mortar only fires while the gun reloads)
  const ar2 = new Arena({ cfg, seed: 96, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'mortar'] }, enemies: [{ id: 10, x: 55, y: 0, hp: BIGHP, script: (e, t, a) => face(e, a) }] })
  const brain2 = createBrain(hello, ctxNone, { rPrefGun: 55, bandLo: 45, bandHi: 65 })
  let mortarTicks = 0
  const bad2 = drive(ar2, brain2, 14, (a, obs, act) => { if (act.fire[1]) mortarTicks++ })
  const e1 = brain.debugState().counters.errors, e2 = brain2.debugState().counters.errors
  check('second weapons: lightning rush closes to arc range and fires; mortar does not disturb the gun', minD <= 45 && zapTicks >= 10 && ar2.stats.hits >= 0.85 * ar2.stats.shots && ar2.stats.shots > 20 && !bad && !bad2 && e1 + e2 === 0,
    `lightning: closest ${fx(minD, 0)} m, trigger held in range on ${zapTicks} decisions | mortar slot: gun ${ar2.stats.hits}/${ar2.stats.shots}, mortar trigger on ${mortarTicks} decisions`)
}
if (want('killdrop')) {
  // after a kill at range the bot is hurt: it must fetch the dropped cubes while it regenerates
  const ar = new Arena({ cfg, seed: 97, me: { x: 0, y: 0, yaw: 0, hp: 900 }, enemies: [{ id: 10, x: 110, y: 0, hp: 200, script: (e, t, a) => face(e, a) }] })
  const brain = createBrain(hello, ctxNone)
  let dropped = false, shotsAfter = -1
  const bad = drive(ar, brain, 30, (a) => {
    if (!dropped && !a.enemies[0].alive) { dropped = true; shotsAfter = a.stats.shots; a.cubes.push({ id: 5100, pos: [a.enemies[0].x, a.enemies[0].y, 0] }, { id: 5101, pos: [a.enemies[0].x + 2, a.enemies[0].y + 1, 0] }) }
  })
  check('kill drop: cubes of our kill are collected while healing, without firing', ar.me.cubes === 2 && ar.stats.shots === shotsAfter && !bad, `cubes ${ar.me.cubes}/2, hp ${fx(ar.me.hp, 0)}/${fx(ar.me.maxHp, 0)}, shots after the kill ${ar.stats.shots - shotsAfter}`)
}

// ============================================================================ b. loot crate (layer 5 sanity)
if (want('crate')) {
  const ar = new Arena({ cfg, seed: 51, me: { x: 0, y: 0, yaw: 1 }, crates: [{ id: 1001, pos: [40, 30, 0], hp: 300 }] })
  const brain = createBrain(hello, ctxNone)
  const bad = drive(ar, brain, 25)
  check('loot: shoots a crate open and collects its cube', ar.me.cubes === 1 && !bad, `cubes ${ar.me.cubes}, shots ${ar.stats.shots}, crates left ${ar.crates.length}`)
}

// ============================================================================ b. fuzz
if (want('fuzz')) {
  const rnd = rng32(777)
  const junk = [null, undefined, NaN, Infinity, -Infinity, 1e308, -1e308, 1e12, '', 'x', [], {}, true, -1, 0, [NaN, NaN, NaN], [1e308, 1e308, 1e308], [null], 'gun']
  const pickJunk = () => junk[Math.floor(rnd() * junk.length)]
  function mutate(o, depth) {
    if (o === null || typeof o !== 'object') return
    const keys = Array.isArray(o) ? o.map((_, i) => i) : Object.keys(o)
    for (const k of keys) {
      const r = rnd()
      if (r < 0.035) { if (Array.isArray(o)) o[k] = pickJunk(); else delete o[k] }
      else if (r < 0.08) o[k] = pickJunk()
      else if (r < 0.10 && typeof o[k] === 'number') o[k] = o[k] * (rnd() < 0.5 ? 1e9 : -1e9)
      else if (r < 0.115 && typeof o[k] === 'string') o[k] = 'plasma_' + Math.floor(rnd() * 9)
      else if (r < 0.13 && Array.isArray(o[k])) o[k] = []
      else if (depth < 6) mutate(o[k], depth + 1)
    }
  }
  // base observations: the stream plus synthetic rich ones (second weapon, shells, drops, offers, npc)
  const rich = (o, i) => {
    o = JSON.parse(JSON.stringify(o))
    const kinds = ['laser', 'lightning', 'mortar', 'railgun']
    const k = kinds[i % 4]
    o.self.weapons[1] = { kind: k, cooldown: 0, charge: (i % 3) * 0.3, stats: cfg.weapons[k] || { damage: 1 } }
    const [x, y, z] = o.self.pos
    o.mechs.push({ id: 7, kind: 'mech', pos: [x + 80, y + 10, z], vel: [3, -9, 0], aim: [3.1, 0], hp: 700, max_hp: 1400, cubes: 2, weapons: ['gun', 'laser'], charging: i % 2 === 0 })
    o.mechs.push({ id: 104, kind: 'npc', pos: [x - 30, y + 20, z], vel: [1, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 })
    o.projectiles.push({ id: 900 + i, kind: 'mortar', pos: [x + 40, y, z + 30], vel: [-40, 0, 5] })
    o.crates.push({ id: 1001, pos: [x + 20, y - 20, z], hp: 300 }); o.cubes.push({ id: 5001, pos: [x + 5, y + 5, z] })
    o.pickups.push({ id: 8001, kind: 'laser', pos: [x + 2, y, z] })
    o.drops = [{ id: 20000, pos: [x + 50, y + 50, z], radius: 8, lands_in: 5, capture_s: 4, progress: 0, holder: null }]
    o.events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.1, by: 7 }, { type: 'hit', target: 7, amount: 45, weapon: 'gun' }, { type: 'kill', target: 9 }, { type: 'take_failed', id: 8001, reason: 'full' })
    o.offer = { id: i, expires: o.t + 5, choices: [{ id: 'gun_rate' }, { id: 'armor' }, { id: 'sensors' }] }
    return o
  }
  const N = QUICK ? 600 : 2000
  let threw = 0, invalid = 0, first = '', internal = 0, fuzzMax = 0
  for (const [label, ctx] of [['map', ctxMap], ['no map', ctxNone]]) {
    let brain = createBrain(hello, ctx)
    for (let i = 0; i < N; i++) {
      if (i % 250 === 0) brain = createBrain(i % 500 === 0 ? hello : { seed: 'x', config: { mech: null, weapons: { gun: 5 } } }, ctx)
      let o = streamObs[Math.floor(rnd() * streamObs.length)]
      o = rnd() < 0.6 ? rich(o, i) : JSON.parse(JSON.stringify(o))
      if (rnd() < 0.9) mutate(o, 0)
      if (rnd() < 0.01) o = pickJunk()
      let a
      const tf = performance.now()
      try { a = brain.act(o, tf + (rnd() < 0.05 ? -5 : 27)) } catch (e) { threw++; if (!first) first = label + ': threw ' + (e && e.stack) }
      fuzzMax = Math.max(fuzzMax, performance.now() - tf)
      const v = validAction(a)
      if (v) { invalid++; if (!first) first = label + ': invalid ' + v + ' ' + JSON.stringify(a) }
    }
    internal += brain.debugState().counters.errors
  }
  check(`fuzz: ${N} perturbed observations x 2 (map / no map) never throw, always a valid action`, threw === 0 && invalid === 0 && fuzzMax <= 25, first || `threw 0, invalid 0, slowest decision ${fx(fuzzMax)} ms, stage errors caught inside the last brains: ${internal}`)
  if (internal) console.log('      note: internal stage errors (caught, previous channel output reused): ' + logs.filter((l) => l.includes('failed')).slice(-3).join('\n      '))
}

// ============================================================================ summary
if (allTimes.length) {
  const mean = allTimes.reduce((a, b) => a + b, 0) / allTimes.length
  check('decision time over all closed-loop scenarios: mean<=4 p99<=15 max<=25 ms', mean <= 4 && quant(allTimes, 0.99) <= 15 && Math.max(...allTimes) <= 25,
    `${allTimes.length} decisions, mean ${fx(mean)} p99 ${fx(quant(allTimes, 0.99))} max ${fx(Math.max(...allTimes))} ms`)
}
const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? '  FAILED: ' + failed.map((f) => f.name).join(' | ') : ''))
const errLogs = logs.filter((l) => l.includes('failed'))
if (errLogs.length) console.log('brain error logs (first 3):\n' + errLogs.slice(0, 3).join('\n'))
process.exit(failed.length ? 1 : 0)
