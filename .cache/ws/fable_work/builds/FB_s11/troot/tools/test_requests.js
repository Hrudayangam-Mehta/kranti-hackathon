// Tests for the owner requests R1-R3 (lib/steal.js, lib/scan.js, lib/aimcal.js and their hooks). DEV ONLY.
// Run:  taskset -c 3 bun test_requests.js            (each scenario runs with the request switch on and off)
// Closed-loop scenarios in the micro-arena (arena_req.js), a real-map scenario for the low wall, fuzz, timing.

import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { ArenaReq } from './arena_req.js'
import { rng32 } from './arena_micro.js'

const ROOT = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FB_s11/troot'
const { World } = await import('../bot/lib/world.js')
const { Nav } = await import('../bot/lib/nav.js')
const { createBrain: createBrain0 } = await import('../bot/lib/brain.js')
// pass 2b (live bot): TR_SELECT='{"openFarm":"off"}' (JSON) adds preset choices to every brain (explicit selects win)
const TR_SELECT = process.env.TR_SELECT ? JSON.parse(process.env.TR_SELECT) : null
const createBrain = (h, c, o) => TR_SELECT ? createBrain0(h, c, { ...(o || {}), select: { ...TR_SELECT, ...((o && o.select) || {}) } }) : createBrain0(h, c, o)
const PR = (await import('../bot/lib/params.js')).resolveParams({})
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const want = (n) => !ONLY || n.includes(ONLY)

const lines = gunzipSync(readFileSync(join(ROOT, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello')
const streamObs = lines.filter((l) => l.type === 'obs')
const cfg = hello.config
const world = World.loadSync(join(ROOT, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const ctxMap = { world, nav, log: () => {} }
const ctxNone = { world: null, nav: null, log: () => {} }
createBrain(hello, ctxMap)        // start-up rehearsal once (not timed below)

const results = []
const fx = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v))
function check(name, passed, detail) { results.push({ name, passed: !!passed }); console.log((passed ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail) }
const allTimes = []
const R1OFF = { stealOn: false, crateGateOn: false }, R2OFF = { scanOn: false }, R3OFF = { headAimOn: false, aimCalOn: false }
// pass 2b (live bot): the FFA idle legs walk to a post at 0.45 of the next radius (pass 2a D11); FFA runs get a zone whose
// band passes through the start point so the scenario geometry stays as the prototype had it
const FFAZ = { center: [-1800, 0], radius: 5000, next_center: [-1800, 0], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI }

function validAction(a) {
  if (!a || typeof a !== 'object') return 'not an object'
  if (!Array.isArray(a.move) || a.move.length !== 2 || !a.move.every(Number.isFinite) || Math.hypot(a.move[0], a.move[1]) > 1 + 1e-9) return 'move'
  if (!Array.isArray(a.aim) || a.aim.length !== 2 || !a.aim.every(Number.isFinite)) return 'aim'
  if (!Array.isArray(a.fire) || a.fire.length !== 2 || !a.fire.every((f) => typeof f === 'boolean')) return 'fire'
  if (typeof a.boost !== 'boolean') return 'boost'
  if ('take' in a && !(Number.isInteger(a.take) && a.take >= 0)) return 'take'
  if ('drop' in a && !(a.drop === 0 || a.drop === 1)) return 'drop'
  if ('pick' in a && !(Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2)) return 'pick'
  return null
}
function drive(ar, brain, seconds, hook, obsHook) {
  let bad = null
  for (let k = 0; k < Math.round(seconds * 10); k++) {
    const obs = ar.obs()
    if (obsHook) obsHook(ar, obs)
    const t0 = performance.now()
    const a = brain.act(obs, t0 + 27.5)
    allTimes.push(performance.now() - t0)
    const v = validAction(a)
    if (v && !bad) bad = `tick ${obs.tick}: ${v}`
    if (hook && hook(ar, obs, a, brain) === true) break
    ar.step(a)
  }
  return bad
}
const BIG = 1e7

// ============================================================================ R1a crate shot by another mech
if (want('r1a')) {
  // (i) SQUAD, the shooter 160 m beyond the crate (unseen): we spend no ammunition and stand on the spot at the break
  // (ii) FFA, the shooter 25.5 m from the crate walks onto the cube after the break (house bots do, 35 m)
  const run = (over, ffa) => {
    const cx = ffa ? -55 : 85, cy = ffa ? 55 : 10, crate = { id: 1007, pos: [cx, cy, 0], hp: 300 }
    const sx = cx, sy = ffa ? cy + 25.5 : 170
    const ar = new ArenaReq({ cfg, seed: 3, me: { x: 0, y: 0, yaw: ffa ? Math.PI : 0 }, crates: [crate], ...(ffa ? { zone: FFAZ } : {}),
      enemies: [{ id: 9, x: sx, y: sy, hp: BIG, weapons: ['gun'], script: (e, t, a, dt) => {
        if (crate.hp > 0) { a.shootCrate(e, crate, ffa ? 40 : 50, dt, 'laser'); return }
        const c = a.cubes[0]
        if (!c) { e.vx = 0; e.vy = 0; return }
        const dx = c.pos[0] - e.x, dy = c.pos[1] - e.y, d = Math.hypot(dx, dy)
        e.vx = dx / d * cfg.mech.walk_speed; e.vy = dy / d * cfg.mech.walk_speed; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx)
      } }] })
    ar.enemies[0].takes = true
    ar.t = ffa ? 120 : 60
    const brain = createBrain(hello, ctxNone, { ...(ffa ? { env: 'ffa' } : {}), ...over })
    let atBreak = -1, shotsAtCrate = 0, nearSince = -1
    const bad = drive(ar, brain, 16, (a, obs, act) => {
      const d = Math.hypot(a.me.x - cx, a.me.y - cy)
      if (d <= cfg.cubes.pickup_radius && nearSince < 0) nearSince = a.t
      if (act.fire && act.fire[0] && crate.hp > 0) shotsAtCrate++
      if (crate.hp <= 0 && atBreak < 0) atBreak = d
    })
    const st = brain.debugState(), br = ar.log.find((l) => l.e === 'crate')
    return { cubes: ar.me.cubes, theirs: ar.stats.enemyCubes || 0, laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), shotsAtCrate, atBreak,
      lead: nearSince >= 0 && br ? br.t - nearSince : NaN, steals: st.counters.steals || 0, keeps: st.counters.stealKeeps || 0, bad }
  }
  const on = run({}, false), off = run(R1OFF, false), fon = run({}, true), foff = run(R1OFF, true)
  check('R1a crate shot by another mech: no ammunition spent, on the spot at the break (+-1 s), cube + laser ours; FFA shooter 25.5 m away walking to the cube -> ours', on.cubes === 1 && on.laser && on.shotsAtCrate === 0 && on.lead >= -1 && on.lead <= 2.5 && fon.cubes === 1 && fon.theirs === 0 && !on.bad && !fon.bad,
    `SQUAD on: cube ${on.cubes}, laser ${on.laser}, crate shots ${on.shotsAtCrate}, at the spot ${fx(on.lead, 1)} s before the break, steals ${on.steals} | off: cube ${off.cubes}, laser ${off.laser}, crate shots ${off.shotsAtCrate}, ${fx(off.lead, 1)} s | FFA on: cube ${fon.cubes} (shooter ${fon.theirs}), laser ${fon.laser}, kept in its sight ${fon.keeps} | off: cube ${foff.cubes} (shooter ${foff.theirs}), laser ${foff.laser}`)
}

// ============================================================================ R1b kill drops (FFA)
if (want('r1b')) {
  // pass 2b: the victim stands 40 m away (inside the 45 m all-round sense): the live FFA torso (rule 8 courtesy 0.3 rad +
  // the scan) may face away at the moment of death beyond 45 m, and a death we do not see is not ours to rush
  const AX = 36, AY = 18
  const run = (over, survX, survY = AY - 60) => {
    const A = { id: 11, x: AX, y: AY, hp: 900, weapons: ['gun', 'laser'], script: (e, t, a) => { e.yaw = -Math.PI / 2; if (t >= 122 && e.alive) a.kill(e) } }
    const Bm = { id: 12, x: survX, y: survY, hp: 1000, weapons: ['gun'], script: (e, t, a, dt) => {
      if (t < 122) { e.yaw = Math.atan2(AY - e.y, AX - e.x); return }
      const dx = AX - e.x, dy = AY - e.y, d = Math.hypot(dx, dy)
      if (d > 0.5) { e.vx = dx / d * 8; e.vy = dy / d * 8; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } else { e.vx = 0; e.vy = 0 }
    } }
    A.cubes = 2
    const ar = new ArenaReq({ cfg, seed: 5, me: { x: 0, y: 0, yaw: 0 }, enemies: [A, Bm], zone: FFAZ })
    ar.enemies[0].cubes = 2; ar.enemies[1].takes = true
    ar.t = 120
    const brain = createBrain(hello, ctxNone, { env: 'ffa', ...over })
    let minD = 1e9
    // pass 2b: 12 / 11 alive reported (the micro-arena's 3 / 2 is the R2 late game, whose sweep looks away from the death)
    const bad = drive(ar, brain, 9, (a) => { if (a.t > 122) minD = Math.min(minD, Math.hypot(a.me.x - AX, a.me.y - AY)) }, (a, obs) => { obs.alive = 9 + obs.alive })
    return { cubes: ar.me.cubes, laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), enemyCubes: ar.stats.enemyCubes || 0, minD, deaths: brain.debugState().counters.deathsSeen || 0, bad }
  }
  const far = run({}, AX), farOff = run(R1OFF, AX)
  const near = run({}, AX, AY - 8)          // the survivor stands 8 m from the drops: leave them
  // pass 2b: >= 2 cubes (prototype >= 3): the survivor walking at the drops aims at us and turns hostile (D0 / K2), so the
  // live brain fights it after the laser and two cubes; with R1 off nothing is taken
  check('R1b kill drops: first by path time -> cubes + laser are ours; survivor closer -> we stay away', far.cubes >= 2 && far.laser && far.deaths === 1 && farOff.cubes === 0 && near.minD > 25 && !far.bad && !near.bad,
    `first: cubes ${far.cubes}, laser ${far.laser}, survivor got ${far.enemyCubes} cubes, death seen ${far.deaths} | off: cubes ${farOff.cubes}, laser ${farOff.laser} | survivor 8 m away: our closest approach ${fx(near.minD, 0)} m`)
}

// ============================================================================ R1d pickup another mech walks toward
if (want('r1d')) {
  const run = (over, ex) => {
    const ar = new ArenaReq({ cfg, seed: 7, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8050, kind: 'laser', pos: [40, 0, 0] }],
      enemies: [{ id: 13, x: ex, y: 0, hp: BIG, weapons: ['gun'], script: (e, t, a, dt) => {
        const dx = 40 - e.x, d = Math.abs(dx)
        e.yaw = Math.PI / 2
        if (d > 0.3 && a.pickups.length) { e.vx = Math.sign(dx) * 10; e.x += e.vx * dt } else e.vx = 0
      } }] })
    ar.enemies[0].takes = true
    ar.t = 80         // pass 2b: after the farm-first opening (inside it a non-hostile mech is not fought, so the idle roam differs)
    const brain = createBrain(hello, ctxNone, over)
    let minE = 1e9
    const bad = drive(ar, brain, 8, (a) => { minE = Math.min(minE, Math.hypot(a.me.x - a.enemies[0].x, a.me.y - a.enemies[0].y)) })
    return { laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), theirs: ar.stats.enemyTakes || 0, minE, endX: ar.me.x, bad }
  }
  const first = run({}, 120), lose = run({}, 56), loseOff = run(R1OFF, 56)
  check('R1d pickup another mech walks to: ours when first; left alone when it gets there first', first.laser && lose.endX < 20 && !first.bad && !lose.bad,
    `first: laser ${first.laser} | it is 16 m away: they took it ${lose.theirs}, our end x ${fx(lose.endX, 0)} m, closest to it ${fx(lose.minE, 0)} m | off: end x ${fx(loseOff.endX, 0)} m, closest ${fx(loseOff.minE, 0)} m`)
}

// ============================================================================ R1e supply drops
if (want('r1e')) {
  const base = streamObs[60], [x, y, z] = base.self.pos
  const mk = (t, mechs) => ({ ...JSON.parse(JSON.stringify(base)), tick: Math.round(t * 20), t, mechs, events: [], projectiles: [], beams: [], sounds: [],
    drops: [{ id: 20001, pos: [x + 30, y, z], radius: 8, lands_in: 3, capture_s: 4, progress: 0, holder: null }],
    zone: { center: [x, y], radius: 600, next_center: [x, y], next_radius: 500, shrink_start: 999, shrink_end: 1200, dps: 20 } })
  const mech = (id, px, py, vx) => ({ id, kind: 'mech', pos: [px, py, z], vel: [vx, 0, 0], aim: [Math.PI / 2, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })
  const modeOf = (over, mechs) => { const b = createBrain(hello, ctxNone, over); let m = ''; for (let k = 0; k < 6; k++) { b.act(mk(30 + k * 0.1, mechs), performance.now() + 27); m = b.debugState().mode } return m }   // t 30: opening, no fight with a quiet mech
  const free = modeOf({}, []), ring = modeOf({}, [mech(7, x + 31, y + 2, 0)]), racer = modeOf({}, [mech(7, x + 110, y, -19)]), racerOff = modeOf(R1OFF, [mech(7, x + 110, y, -19)])
  check('R1e supply drop: free -> DROP; mech in the ring or racing there first -> no DROP', free === 'DROP' && ring !== 'DROP' && racer !== 'DROP',
    `free ${free} | mech in the ring ${ring} | mech 80 m beyond the ring boosting at it ${racer} (off: ${racerOff})`)
}

// ============================================================================ R1 smart crate shooting
if (want('r1gate')) {
  const run = (over, soundUntil) => {
    const crate = { id: 1009, pos: [25, 0, 0], hp: 300 }
    const ar = new ArenaReq({ cfg, seed: 9, me: { x: 0, y: 0, yaw: 0 }, crates: [crate], enemies: [],
      sounds: (a) => (a.t < soundUntil && Math.round(a.t * 10) % 5 === 0 ? [{ kind: 'step', bearing: 2.0, dist: 'near', age: 0.05 }] : []) })
    ar.t = 60
    const brain = createBrain(hello, ctxNone, over)
    let first = -1
    drive(ar, brain, 25, (a, obs, act) => { if (first < 0 && act.fire && act.fire[0]) first = a.t - 60 })
    return { first, cubes: ar.me.cubes }
  }
  // pass 2b: the smart-shooting gate is FFA-only by default (SQUAD keeps D6); its mechanism is tested with crateGate=all
  const GATE = { select: { crateGate: 'all' } }
  const quiet = run(GATE, 0), heard = run(GATE, 66), heardOff = run(R1OFF, 66)
  // regen: hp 93% hurt 1 s ago, a drone 35 m away: the drone is started only once hp >= 97%
  const runDrone = (over) => {
    const ar = new ArenaReq({ cfg, seed: 11, me: { x: 0, y: 0, yaw: 0, hp: 0.93 * cfg.mech.hp },
      enemies: [{ id: 120, kind: 'npc', x: 35, y: 5, hp: 350, maxHp: 350, radius: 1.8, height: 3.5, weapons: [], script: (e) => { e.yaw = Math.PI } }] })
    ar.t = 60; ar.me.lastDmgT = 59
    const brain = createBrain(hello, ctxNone, over)
    let first = -1, hpAt = 0
    drive(ar, brain, 12, (a, obs, act) => { if (first < 0 && act.fire && act.fire[0]) { first = a.t - 60; hpAt = a.me.hp / a.me.maxHp } })
    return { first, hpAt }
  }
  const dr = runDrone(GATE), drOff = runDrone(R1OFF)
  check('R1 smart shooting: no crate shot while a mech is heard nearby; no drone started while regeneration is pending', quiet.first >= 0 && heard.first >= 6 + PR.crateQuietS - 0.1 && quiet.cubes === 1 && dr.first >= 0 && dr.hpAt >= 0.965,
    `quiet: first crate shot at ${fx(quiet.first, 1)} s | steps heard until 6 s: ${fx(heard.first, 1)} s (off: ${fx(heardOff.first, 1)} s) | drone at 93% hp: first shot ${fx(dr.first, 1)} s at hp ${fx(dr.hpAt * 100, 1)}% (off: ${fx(drOff.first, 1)} s at ${fx(drOff.hpAt * 100, 1)}%)`)
}

// ============================================================================ R2 late-game scan
if (want('r2')) {
  const runIdle = (over, bearing, t0) => {
    const D = 120, ex = D * Math.cos(bearing), ey = D * Math.sin(bearing)
    const ar = new ArenaReq({ cfg, seed: 13, me: { x: 0, y: 0, yaw: 0 },
      enemies: [{ id: 15, x: ex, y: ey, hp: BIG, weapons: ['gun'], script: (e) => { e.yaw = Math.atan2(-e.y, -e.x) + 0.6 } }],
      sounds: (a) => [{ kind: 'gun', bearing: 0.1, dist: 'mid', age: 0.05 }] })
    ar.t = t0
    const brain = createBrain(hello, ctxNone, over)
    let seenAt = -1
    drive(ar, brain, 10, (a, obs) => { if (seenAt < 0 && obs.mechs.some((m) => m.id === 15)) { seenAt = a.t - t0; return true } })
    return seenAt < 0 ? 99 : seenAt
  }
  const bears = [Math.PI, 2.2, -2.2, 2.7, -2.7, 1.9]
  const on = bears.map((b) => runIdle({}, b, 300)), off = bears.map((b) => runIdle(R2OFF, b, 300))
  // engaged: a target in front, a weaker attacker hitting our rear
  const runRear = (over) => {
    const ar = new ArenaReq({ cfg, seed: 17, me: { x: 0, y: 0, yaw: 0, pinned: true },
      enemies: [{ id: 16, x: 100, y: 0, hp: BIG, weapons: ['gun'], dps: 30, script: (e, t, a) => { e.yaw = Math.PI } },
        { id: 17, x: -90, y: 10, hp: BIG, weapons: ['gun'], dps: 30, script: (e, t, a) => { e.yaw = Math.atan2(-e.y, -e.x) } }] })
    ar.t = 300
    const brain = createBrain(hello, ctxNone, over)
    let firstRear = -1, faced = -1
    drive(ar, brain, 8, (a) => {
      if (firstRear < 0 && (a.stats.rearHits || 0) > 0) firstRear = a.t
      if (firstRear >= 0 && faced < 0 && Math.abs(wrap(Math.atan2(10 - a.me.y, -90 - a.me.x) - a.me.yaw)) < Math.PI / 2) faced = a.t - firstRear
    })
    return { faced: faced < 0 ? 99 : faced, rear: ar.stats.rearHits || 0, taken: ar.stats.dmgTaken }
  }
  // R3a2 P3 (focus add) runs R2's rear pick in FFA only: this SQUAD check of the rear pick runs with focus mult
  const FM = (o) => ({ ...o, select: { ...((o && o.select) || {}), focus: 'mult' } })
  const rOn = runRear(FM({})), rOff = runRear(FM(R2OFF))
  // continuous idle sweep, open ground and the real map (walls / approaches): the largest blind time of an open sector
  const runSweep = (ctx, x, y) => {
    const ar = new ArenaReq({ cfg, world: ctx.world, nav: ctx.nav, seed: 37, me: { x, y, yaw: 0 }, enemies: [], sounds: (a) => [{ kind: 'gun', bearing: 0.1, dist: 'mid', age: 0.05 }] })
    ar.t = 300
    const brain = createBrain(hello, ctx, {})
    drive(ar, brain, 30)
    return brain.debugState().scan.maxBlind
  }
  const q = nav.nearestPassable((world.bounds.minX + world.bounds.maxX) / 2, (world.bounds.minY + world.bounds.maxY) / 2, 80)
  const swOpen = runSweep(ctxNone, 0, 0), swMap = runSweep(ctxMap, q.x, q.y)
  check('R2 idle sweep (30 s, late game): no open approach blind for more than 3 s', swOpen <= 3.0 && swMap <= 3.0, `open ground: max blind ${fx(swOpen, 2)} s | real map near the centre: ${fx(swMap, 2)} s`)
  check('R2 late game idle: a silent mech 120 m behind (sound in front) is seen within 3 s', Math.max(...on) <= 3.0,
    `on: ${on.map((v) => fx(v, 1)).join(' / ')} s | off: ${off.map((v) => fx(v, 1)).join(' / ')} s (99 = not within 10 s)`)
  check('R2 engaged: a 30 dps rear attacker (45 with the rear multiplier, under the 60 dps veto) is faced within 1.5 s', rOn.faced <= 1.5,
    `on: faced after ${fx(rOn.faced, 2)} s, rear hits ${rOn.rear}, damage taken ${fx(rOn.taken, 0)} | off: ${rOff.faced >= 99 ? 'never' : fx(rOff.faced, 2) + ' s'}, rear hits ${rOff.rear}, damage taken ${fx(rOff.taken, 0)}`)
}

// ============================================================================ R3 low wall: only the top shows
if (want('r3wall')) {
  // search the real map: shooter S and target T 100-170 m apart, centre line blocked, 0.8 h line clear, T visible
  const rnd = rng32(31)
  let found = null
  const m = cfg.mech, bd = world.bounds
  for (let i = 0; i < 60000 && !found; i++) {
    const sx = bd.minX + 60 + rnd() * (bd.maxX - bd.minX - 120), sy = bd.minY + 60 + rnd() * (bd.maxY - bd.minY - 120)
    if (!nav.passableAt(sx, sy) || nav.wallDistAt(sx, sy) < 4) continue
    const a = rnd() * Math.PI * 2, D = 100 + rnd() * 70, tx = sx + D * Math.cos(a), ty = sy + D * Math.sin(a)
    if (!nav.passableAt(tx, ty)) continue
    const sz = nav.levelAt(sx, sy), tz = nav.levelAt(tx, ty)
    const mz = sz + m.muzzle_height
    if (world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.5) || world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.35)) continue
    if (!world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.8)) continue
    if (!world.canSee(sx, sy, sz + m.eye_height, tx, ty, tz + m.height)) continue
    // the muzzle offset (3 m out along the aim) must also clear at 0.8 h
    const ux = Math.cos(a), uy = Math.sin(a)
    if (!world.shotClear(sx + ux * 3, sy + uy * 3, mz, tx, ty, tz + m.height * 0.8)) continue
    found = { sx, sy, tx, ty, D }
  }
  if (!found) check('R3 low wall scenario found', false, 'no location')
  else {
    const run = (over) => {
      const f = found
      const ar = new ArenaReq({ cfg, world, nav, seed: 19, me: { x: f.sx, y: f.sy, yaw: Math.atan2(f.ty - f.sy, f.tx - f.sx), pinned: true, weapons: ['gun', 'laser'] },
        enemies: [{ id: 18, x: f.tx, y: f.ty, hp: BIG, weapons: ['gun'], script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) + 0.5 } }] })
      ar.t = 100
      const brain = createBrain(hello, { world, nav, log: () => {} }, { rPrefLaser: f.D, laserLo: f.D - 30, laserHi: f.D + 30, ...over })
      drive(ar, brain, 15)
      return { beams: ar.stats.beams, hits: ar.stats.beamHits, shots: ar.stats.shots, ghits: ar.stats.hits }
    }
    const on = run({}), off = run(R3OFF)
    check('R3 low wall: target with only the top over cover at 100-170 m -> laser hits', on.beams >= 4 && on.hits >= 0.75 * on.beams,
      `at ${fx(found.D, 0)} m: on: beams ${on.hits}/${on.beams} hit, gun ${on.ghits}/${on.shots} | off: beams ${off.hits}/${off.beams} hit, gun ${off.ghits}/${off.shots}`)
  }
}

// ============================================================================ R3 calibration: injected systematic aim error
if (want('r3cal')) {
  const run = (over, bias, ownBeams = true) => {
    const ar = new ArenaReq({ cfg, seed: 23, ownBeams, laserBias: bias, me: { x: 0, y: 0, yaw: 0, pinned: true, weapons: ['gun', 'laser'] },
      enemies: [{ id: 19, x: 150, y: 0, hp: BIG, weapons: ['gun'], script: (e, t, a, dt) => { e.vy = 3 * Math.sin(t * 0.4); e.y += e.vy * dt; e.yaw = Math.PI + 0.6 } }] })
    ar.t = 100
    const brain = createBrain(hello, ctxNone, { rPrefLaser: 150, laserLo: 120, laserHi: 180, ...over })
    drive(ar, brain, 30)
    const log = ar.stats.beamLog || []
    const early = log.slice(0, 3), late = log.slice(3, 15)
    const st = brain.debugState().cal
    return { n: log.length, earlyHit: early.filter((b) => b.hit).length, lateHit: late.filter((b) => b.hit).length, lateN: late.length, yaw: st.yaw, pitch: st.pitch, lat: st.lat }
  }
  const bias = [0.02, 0.012]
  // pass 2b: aimCalOn is off by default (our own beams are not in obs.beams); the merged code is tested switched on
  const CAL = { aimCalOn: true }
  const on = run(CAL, bias), off = run({ aimCalOn: false }, bias), clean = run(CAL, [0, 0]), noBeams = run(CAL, bias, false)
  check('R3 calibration: a hidden 0.02 rad yaw / 0.012 rad pitch beam error is learnt within 3 beams', on.lateN >= 8 && on.lateHit >= 0.85 * on.lateN && off.lateHit <= 0.25 * off.lateN && Math.abs(on.yaw - bias[0]) < 0.004 && Math.abs(on.pitch - bias[1]) < 0.004,
    `on: beams 4-15 ${on.lateHit}/${on.lateN} hit (1-3: ${on.earlyHit}/3), learnt yaw ${fx(on.yaw, 4)} pitch ${fx(on.pitch, 4)} latency ${fx(on.lat, 3)} s | off: ${off.lateHit}/${off.lateN} | no bias: ${clean.lateHit}/${clean.lateN}, learnt yaw ${fx(clean.yaw, 4)} | own beams absent: ${noBeams.lateHit}/${noBeams.lateN}, learnt yaw ${fx(noBeams.yaw, 4)}`)
}

// ============================================================================ fuzz with the new fields
if (want('fuzz')) {
  const rnd = rng32(4242)
  const junk = [null, undefined, NaN, Infinity, -1e308, 1e12, '', 'x', [], {}, true, -1, 0, [NaN, NaN, NaN], [null]]
  const pj = () => junk[Math.floor(rnd() * junk.length)]
  function mutate(o, depth) {
    if (o === null || typeof o !== 'object') return
    for (const k of (Array.isArray(o) ? o.map((_, i) => i) : Object.keys(o))) {
      const r = rnd()
      if (r < 0.03) { if (Array.isArray(o)) o[k] = pj(); else delete o[k] } else if (r < 0.07) o[k] = pj()
      else if (r < 0.09 && typeof o[k] === 'number') o[k] *= rnd() < 0.5 ? 1e9 : -1e9
      else if (depth < 6) mutate(o[k], depth + 1)
    }
  }
  const rich = (o, i) => {
    o = JSON.parse(JSON.stringify(o))
    const [x, y, z] = o.self.pos, me = o.self.id
    o.t = [60, 150, 260, 380][i % 4]; o.alive = 16 - (i % 9)
    o.self.weapons[1] = i % 3 ? { kind: 'laser', cooldown: 0, charge: (i % 4) * 0.25, stats: cfg.weapons.laser } : null
    o.mechs.push({ id: 7, kind: 'mech', pos: [x + 80, y + 10, z], vel: [3, -9, 0], aim: [Math.atan2(-40, -25), 0], hp: 700, max_hp: 1400, cubes: 2, weapons: ['gun', 'laser'], charging: i % 2 === 0 })
    if (i % 5) o.mechs.push({ id: 8, kind: 'mech', pos: [x + 20 + (i % 7), y + 60, z], vel: [0, -5, 0], aim: [-1.2, 0], hp: 400 + i % 900, max_hp: 1400, cubes: 1, weapons: ['gun', 'lightning'], charging: false })
    o.mechs.push({ id: 104, kind: 'npc', pos: [x - 30, y + 20, z], vel: [1, 0, 0], aim: [0, 0], hp: 350 - (i % 7) * 40, max_hp: 350 })
    o.crates.push({ id: 1001, pos: [x + 55, y - 30, z], hp: 300 - (i % 6) * 45 }, { id: 1002, pos: [x + 20, y + 20, z], hp: 300 })
    o.cubes.push({ id: 5001, pos: [x + 5, y + 5, z] }); o.pickups.push({ id: 8001, kind: ['laser', 'lightning', 'mortar'][i % 3], pos: [x + 2, y, z] })
    o.beams.push({ by: me, kind: 'laser', path: [[x + 3, y, z + 7], [x + 80, y + 10, z + 6]], age: 0.1 }, { by: 7, kind: 'laser', path: [[x + 80, y + 10, z + 7], [x + 55, y - 30, z + 1]], age: 0.05 })
    o.sounds.push({ kind: 'death', bearing: 0.3, dist: 'near', age: 0.05 }, { kind: 'step', bearing: -2, dist: 'near', age: 0.05 })
    o.events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 2.9, by: 8, rear: true }, { type: 'hit', target: 1001, amount: 45, weapon: 'gun' }, { type: 'hit', target: 7, amount: 315, weapon: 'laser' })
    o.drops = [{ id: 20000, pos: [x + 40, y + 10, z], radius: 8, lands_in: i % 5, capture_s: 4, progress: i % 3, holder: i % 4 ? null : 8 }]
    o.zone = { center: [x, y], radius: 300, next_center: [x + 10, y], next_radius: [300, 140, 70, 25][i % 4], shrink_start: o.t - 5, shrink_end: o.t + 30, dps: 60 }
    return o
  }
  const N = 3000
  let threw = 0, invalid = 0, first = '', maxMs = 0, internal = 0
  for (const [label, ctx] of [['map', ctxMap], ['no map', ctxNone]]) {
    let brain = createBrain(hello, ctx, { env: rnd() < 0.5 ? 'ffa' : 'auto' })
    for (let i = 0; i < N; i++) {
      if (i % 300 === 0) { internal += brain.debugState().counters.errors; brain = createBrain(hello, ctx, { env: i % 600 ? 'ffa' : 'auto' }) }
      let o = rich(streamObs[Math.floor(rnd() * streamObs.length)], i)
      if (rnd() < 0.85) mutate(o, 0)
      if (rnd() < 0.01) o = pj()
      const t0 = performance.now()
      let a
      try { a = brain.act(o, t0 + 27) } catch (e) { threw++; if (!first) first = String(e && e.stack) }
      maxMs = Math.max(maxMs, performance.now() - t0)
      const v = validAction(a)
      if (v) { invalid++; if (!first) first = label + ' invalid ' + v }
    }
    internal += brain.debugState().counters.errors
  }
  check(`fuzz: ${N} x 2 rich perturbed observations (crates hit by others, own beams, rear hits, deaths, late zones, FFA) never throw, valid actions`, threw === 0 && invalid === 0 && maxMs <= 25,
    first || `threw 0, invalid 0, slowest ${fx(maxMs)} ms, internal stage errors caught ${internal}`)
}

// ============================================================================ decision time (one core)
if (want('time')) {
  const timeRun = (over) => {
    const ts = []
    for (let pass = 0; pass < 3; pass++) {
      const b = createBrain(hello, ctxMap, over)
      for (const o of streamObs) { const t0 = performance.now(); b.act(o, t0 + 27.5); if (pass === 2) ts.push(performance.now() - t0) }
    }
    ts.sort((a, b) => a - b)
    return { mean: ts.reduce((a, b) => a + b, 0) / ts.length, p99: ts[Math.floor(ts.length * 0.99)], max: ts[ts.length - 1] }
  }
  const on = timeRun({}), off = timeRun({ ...R1OFF, ...R2OFF, ...R3OFF })
  const s = Float64Array.from(allTimes).sort()
  const mean = allTimes.reduce((a, b) => a + b, 0) / Math.max(1, allTimes.length)
  check('decision time: stream replay with the map (warm pass) and all request scenarios: mean <= 4, p99 <= 15, max <= 25 ms', on.mean <= 4 && on.p99 <= 15 && on.max <= 25 && (allTimes.length === 0 || (mean <= 4 && s[Math.floor(s.length * 0.99)] <= 15 && s[s.length - 1] <= 25)),
    `stream on: mean ${fx(on.mean)} p99 ${fx(on.p99)} max ${fx(on.max)} | off: mean ${fx(off.mean)} p99 ${fx(off.p99)} max ${fx(off.max)} | scenarios: ${allTimes.length} decisions, mean ${fx(mean)} p99 ${fx(s[Math.floor(s.length * 0.99)])} max ${fx(s[s.length - 1])} ms`)
}

const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? '  FAILED: ' + failed.map((f) => f.name).join(' | ') : ''))
process.exit(failed.length ? 1 : 0)
