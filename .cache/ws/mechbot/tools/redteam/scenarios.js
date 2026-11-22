#!/usr/bin/env bun
// DEV ONLY (red team): deterministic free-for-all scenario checks. No simulator, no foreign code: our brain is
// stepped against scripted mechs on the real map with a plain kinematic model of our own mech (walk / boost
// speed, torso slew, 120 deg view wedge, building sight lines). Each check states the doctrine expectation
// (D0, D11, D3, D4 of DOCTRINE V4) and prints PASS / FAIL with the measured numbers.
//
//   taskset -c 0 ./bun tools/redteam/scenarios.js            (all)      --only=<word>   --verbose
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { World } from '../../bot/lib/world.js'
import { Nav } from '../../bot/lib/nav.js'
import { createBrain } from '../../bot/lib/brain.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const hello = JSON.parse(readFileSync(join(ROOT, 'notes', 'hello_example.json'), 'utf8'))
const cfg = hello.config, mc = cfg.mech
const world = World.loadSync(join(ROOT, 'kit', 'arena'))
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const verbose = process.argv.includes('--verbose')
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }

function freshNav() { const n = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); n.setBody(mc.radius, mc.height); return n }
const nav0 = freshNav()

/** An open point (walls >= minWall away) with a clear 2-way line to a point `d` metres away at bearing `brg`. */
function findOpen(d, brg, minWall = 30) {
  for (let r = 0; r < 400; r += 12) for (let k = 0; k < 16; k++) {
    const x = 41 + r * Math.cos(k * Math.PI / 8), y = -73 + r * Math.sin(k * Math.PI / 8)
    if (!nav0.passableAt(x, y) || nav0.wallDistAt(x, y) < minWall) continue
    const ex = x + d * Math.cos(brg), ey = y + d * Math.sin(brg)
    if (!nav0.passableAt(ex, ey)) continue
    const z = world.ground(x, y), ez = world.ground(ex, ey)
    if (world.shotClear(x, y, z + 7, ex, ey, ez + 4.5) && world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) && world.canSee(x, y, z + 8, ex, ey, ez + 4.5)) return { x, y, ex, ey }
  }
  throw new Error('no open point found')
}

/**
 * Step the brain. `enemies(t, S)` returns scripted mechs [{id,x,y,vx,vy,yaw,hp,weapons,charging, shoots}];
 * S = our state. Scripted effects: `dmg` [{by, amount, weapon}] applied per decision by the script.
 */
function run({ start, overrides, t0 = 5, seconds = 8, alive = 16, hp = mc.hp, weapons = ['gun', null], script }) {
  const nav = freshNav()
  const brain = createBrain({ ...hello, seed: 12345 }, { world, nav, log: () => {} }, { warmup: false, ...overrides })
  const S = { x: start.x, y: start.y, z: world.ground(start.x, start.y), vx: 0, vy: 0, yaw: start.yaw ?? 0, pitch: 0, hp, energy: 100, t: t0, charge: 0, cd: [0, 0], ammo: 12, reload: 0 }
  const log = []
  let fired = 0, firedGun = 0, firstFireT = null, boostTicks = 0, seenTicks = 0, losInTicks = 0, path = 0, stillTicks = 0
  const shotLog = []
  let firstLosBreakT = null, hitsTaken = 0
  const wp = (kind, i) => kind ? { kind, cooldown: S.cd[i], stats: cfg.weapons[kind], ...(kind === 'gun' ? { ammo: S.ammo, reload: S.reload } : {}), ...(kind === 'laser' ? { charge: S.charge } : {}) } : null
  for (let k = 0; k < seconds * 10; k++) {
    const t = S.t
    const sc = script(t - t0, S) || {}
    const mechs = []
    let anyLosIn = false
    for (const e of sc.mechs || []) {
      const ez = world.ground(e.x, e.y)
      const d = Math.hypot(e.x - S.x, e.y - S.y)
      const brg = Math.atan2(e.y - S.y, e.x - S.x)
      const sight = world.canSee(S.x, S.y, S.z + 8, e.x, e.y, ez + 4.5) || world.canSee(S.x, S.y, S.z + 8, e.x, e.y, ez + 9)
      const vis = sight && (d <= 45 || (d <= 200 && Math.abs(wrap(brg - S.yaw)) <= Math.PI / 3))
      e._vis = vis; e._d = d
      e._los = world.shotClear(e.x, e.y, ez + 7, S.x, S.y, S.z + 4.5)
      if (e._los) anyLosIn = true
      if (vis) mechs.push({ id: e.id, kind: 'mech', pos: [e.x, e.y, ez], vel: [e.vx || 0, e.vy || 0, 0], aim: [e.yaw ?? wrap(brg + Math.PI), 0], hp: e.hp ?? 1400, max_hp: 1400, cubes: e.cubes || 0, weapons: e.weapons || ['gun'], charging: !!e.charging })
    }
    const events = []
    for (const d of sc.dmg || []) {
      const e = (sc.mechs || []).find((m) => m.id === d.by)
      if (!e || (d.needLos !== false && !e._los)) continue
      const brg = Math.atan2(e.y - S.y, e.x - S.x)
      const rear = Math.abs(wrap(brg - S.yaw)) > Math.PI / 2
      const amt = d.amount * (rear ? 1.5 : 1)
      S.hp -= amt; hitsTaken++
      events.push({ type: 'damaged', amount: amt, weapon: d.weapon || 'gun', bearing: brg, by: d.by, ...(rear ? { rear: true } : {}) })
    }
    if (S.hp <= 0) { log.push({ t, dead: true }); break }
    const obs = {
      type: 'obs', tick: Math.round(t * 20), t, alive: sc.alive ?? alive,
      self: { id: 3, pos: [S.x, S.y, S.z], vel: [S.vx, S.vy, 0], aim: [S.yaw, S.pitch], hp: S.hp, max_hp: mc.hp, energy: S.energy, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
        weapons: [wp(weapons[0], 0), wp(weapons[1], 1)], stats: { ...mc } },
      mechs, projectiles: sc.projectiles || [], crates: sc.crates || [], cubes: [], pickups: [], sounds: sc.sounds || [], beams: sc.beams || [], events, drops: [],
      zone: { center: cfg.zone.start_center, radius: 560, next_center: cfg.zone.start_center, next_radius: 380, shrink_start: 60, shrink_end: 110, dps: 20 }, offer: null,
    }
    const a = brain.act(obs, performance.now() + 25)
    const st = brain.debugState()
    // kinematics
    const mv = a.move || [0, 0], ml = Math.min(1, Math.hypot(mv[0], mv[1]))
    const charging = weapons.includes('laser') && a.fire && a.fire[weapons.indexOf('laser')]
    let sp = (a.boost && S.energy > 1 && ml > 0 ? mc.boost_speed : mc.walk_speed) * (charging ? 0.5 : 1)
    if (a.boost && ml > 0) { S.energy = Math.max(0, S.energy - mc.boost_drain * 0.1); boostTicks++ } else S.energy = Math.min(100, S.energy + mc.energy_regen * 0.1)
    const dn = Math.hypot(mv[0], mv[1]) || 1
    const tvx = mv[0] / dn * ml * sp, tvy = mv[1] / dn * ml * sp
    const dvx = tvx - S.vx, dvy = tvy - S.vy, dv = Math.hypot(dvx, dvy), stp = mc.ground_accel * 0.1
    if (dv <= stp) { S.vx = tvx; S.vy = tvy } else { S.vx += dvx / dv * stp; S.vy += dvy / dv * stp }
    const nx = S.x + S.vx * 0.1, ny = S.y + S.vy * 0.1
    if (nav0.passableAt(nx, ny)) { path += Math.hypot(nx - S.x, ny - S.y); S.x = nx; S.y = ny; S.z = world.ground(nx, ny) } else { S.vx = 0; S.vy = 0 }
    if (Math.hypot(S.vx, S.vy) < 1) stillTicks++
    if (a.aim) { const dy = wrap(a.aim[0] - S.yaw); S.yaw = wrap(S.yaw + Math.max(-0.4, Math.min(0.4, dy))); S.pitch = a.aim[1] }
    const f = a.fire || [false, false]
    for (let i = 0; i < 2; i++) S.cd[i] = Math.max(0, S.cd[i] - 0.1)
    if (S.reload > 0) { S.reload = Math.max(0, S.reload - 0.1); if (S.reload === 0) S.ammo = 12 }
    const gi = weapons.indexOf('gun')
    if (gi >= 0 && f[gi] && S.ammo > 0 && S.reload <= 0 && S.cd[gi] <= 0.05) { firedGun++; S.ammo--; S.cd[gi] = 0.24; shotLog.push({ t: +(t - t0).toFixed(1), d: sc.mechs && sc.mechs[0] ? Math.round(sc.mechs[0]._d) : null }); if (S.ammo === 0) S.reload = 2.4 }
    if (f[0] || f[1]) { fired++; if (firstFireT === null) firstFireT = t - t0 }
    if (mechs.length) seenTicks++
    if (anyLosIn) losInTicks++
    else if (firstLosBreakT === null) firstLosBreakT = +(t - t0).toFixed(1)
    log.push({ t: +(t - t0).toFixed(1), mode: st.mode, leg: st.leg, st: st.stance, env: st.env, tgt: st.target, hp: Math.round(S.hp), x: +S.x.toFixed(1), y: +S.y.toFixed(1), sp: +Math.hypot(S.vx, S.vy).toFixed(1), fire: f[0] || f[1] ? 1 : 0, boost: a.boost ? 1 : 0, yaw: +S.yaw.toFixed(2), los: anyLosIn ? 1 : 0, seen: mechs.length })
    S.t = +(S.t + 0.1).toFixed(1)
  }
  return { S, log, fired, firedGun, firstFireT, boostTicks, seenTicks, losInTicks, path, stillTicks, n: log.length, shotLog, firstLosBreakT, hitsTaken }
}

const results = []
function check(name, doctrine, fn) {
  if (only && !name.includes(only)) return
  let r
  try { r = fn() } catch (e) { r = { pass: false, detail: 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e) } }
  results.push({ name, doctrine, ...r })
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${name}  [${doctrine}]\n      ${r.detail}`)
  if (verbose && r.log) for (const l of r.log.filter((_, i) => i % 5 === 0)) console.log('      ' + JSON.stringify(l))
}

// ---------------------------------------------------------------- S1: idle mech in the opening (D0 guard)
for (const env of ['auto', 'ffa']) {
  check(`idle-mech-150m-opening env=${env}`, env === 'auto' ? 'D0: no fight with a non-hostile mech before 40 s' : 'D11: never walk at an enemy, no voluntary fight before 90 s', () => {
    const o = findOpen(150, 0)
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env }, t0: 5, seconds: 8,
      script: () => ({ mechs: [{ id: 7, x: o.ex, y: o.ey, yaw: Math.PI / 2, hp: 1400, weapons: ['gun'] }] }) })
    const d1 = Math.hypot(o.ex - r.S.x, o.ey - r.S.y)
    return { pass: r.firedGun === 0 && d1 >= 148, detail: `gun shots ${r.firedGun} (trigger first down at ${r.firstFireT}s), range 150 -> ${d1.toFixed(0)} m, boosted ${r.boostTicks / 10}s, last mode ${r.log[r.log.length - 1].mode}/${r.log[r.log.length - 1].leg}`, log: r.log }
  })
}
// ---------------------------------------------------------------- S2: idle mech far (190 m): do we walk at it?
for (const env of ['auto', 'ffa']) {
  check(`idle-mech-190m-walk env=${env}`, 'D0/D5/D11: a mech outside band + 40 m is not a candidate; never approach', () => {
    const o = findOpen(190, 0)
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env }, t0: 45, seconds: 10,
      script: () => ({ mechs: [{ id: 7, x: o.ex, y: o.ey, yaw: Math.PI / 2, hp: 1400, weapons: ['gun', 'laser'] }] }) })
    const d1 = Math.hypot(o.ex - r.S.x, o.ey - r.S.y)
    return { pass: d1 >= 185 && r.firedGun === 0, detail: `range 190 -> ${d1.toFixed(0)} m in 10 s, gun shots ${r.firedGun}, boosted ${r.boostTicks / 10}s, mode ${r.log[r.log.length - 1].mode}/${r.log[r.log.length - 1].leg}`, log: r.log }
  })
}
// ---------------------------------------------------------------- S3: hostile mech shoots: return fire at once
for (const env of ['auto', 'ffa']) {
  check(`hostile-return-fire env=${env}`, 'D0: shoot back at once when hostile', () => {
    const o = findOpen(110, 0)
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env }, t0: 5, seconds: 5,
      script: (t) => ({ mechs: [{ id: 7, x: o.ex, y: o.ey, hp: 1400, weapons: ['gun'] }], dmg: t >= 1 && Math.round(t * 10) % 5 === 0 ? [{ by: 7, amount: 45 }] : [] }) })
    return { pass: r.firstFireT !== null && r.firstFireT <= 1.6, detail: `first hit on us at 1.0 s, our first shot at ${r.firstFireT} s, gun shots ${r.firedGun}`, log: r.log }
  })
}
// ---------------------------------------------------------------- S4: a beam from beyond our vision range while healing
check('unseen-laser-230m-heal env=ffa', 'D3/D11: never stay in a cell the shooter can see; the laser reaches 280 m, our eyes 200 m', () => {
  const o = findOpen(230, Math.PI, 14)             // shooter 230 m to the west (never listed), we face east
  const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env: 'ffa' }, t0: 60, seconds: 15, hp: 900,
    script: (t) => ({ mechs: [{ id: 9, x: o.ex, y: o.ey, hp: 1400, weapons: ['gun', 'laser'] }], dmg: t >= 0.5 && Math.abs((t % 2.4) - 0.5) < 0.051 ? [{ by: 9, amount: 315, weapon: 'laser' }] : [] }) })
  const dead = r.log[r.log.length - 1].dead
  return { pass: !dead && r.hitsTaken <= 2, detail: `${dead ? 'DIED' : 'hp ' + Math.round(r.S.hp) + ' of 900'} after 15 s; beams taken ${r.hitsTaken} of 7 offered (each needs a line at release); line first broken at ${r.firstLosBreakT === null ? 'never' : r.firstLosBreakT + ' s'}; shooter had a line ${r.losInTicks / 10}s; standing still ${(100 * r.stillTicks / r.n).toFixed(0)}%; last ${r.log[r.log.length - 1].mode}/${r.log[r.log.length - 1].leg}`, log: r.log }
})
// ---------------------------------------------------------------- S5: laser stand-off carrier out-ranges our gun
for (const env of ['auto', 'ffa']) {
  check(`laser-kiter-170m env=${env}`, 'D11: laser carrier at 100+ m: fight only from a corner; break its sight line at release time. D2 gate: no gun fire at flight > 0.55 s', () => {
    const o = findOpen(170, 0, 25)
    let lastD = 170
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env }, t0: 50, seconds: 12,
      script: (t, S) => {
        // kiter: keeps 170 m by backing off at walk speed along the line (never lets us close), beam every 2.4 s
        const d = Math.hypot(o.ex - S.x, o.ey - S.y)
        if (d < 165) { const ux = (o.ex - S.x) / d, uy = (o.ey - S.y) / d; const nx = o.ex + ux * 1.17, ny = o.ey + uy * 1.17; if (nav0.passableAt(nx, ny)) { o.ex = nx; o.ey = ny } }
        lastD = d
        const ph = (t % 2.4)
        const charging = ph >= 1.65
        const beam = Math.abs(ph - 2.3) < 0.051
        return { mechs: [{ id: 7, x: o.ex, y: o.ey, hp: 1400, weapons: ['gun', 'laser'], charging }], dmg: beam ? [{ by: 7, amount: 315, weapon: 'laser' }] : [] }
      } })
    const lost = mc.hp - r.S.hp
    const dead = r.log[r.log.length - 1].dead
    const far = r.shotLog.filter((q) => q.d !== null && q.d / 252 > 0.55).length
    return { pass: !dead && lost <= 315 && far === 0, detail: `${dead ? 'DIED' : 'hp lost ' + Math.round(lost)} in 12 s (5 beams offered), gun shots ${r.firedGun}, of which ${far} at a flight time over 0.55 s (about ${lastD.toFixed(0)} m), shooter kept its line ${r.losInTicks / 10}s of 12, line first broken at ${r.firstLosBreakT}s, we boosted ${r.boostTicks / 10}s`, log: r.log }
  })
}
// ---------------------------------------------------------------- S6: quiet spawn: what do we do with nobody near?
for (const env of ['auto', 'ffa']) {
  check(`quiet-spawn-crate env=${env}`, 'D6/D11: farming is fine only with the nearest mech beyond 150 m; gun fire carries 320 m', () => {
    const o = findOpen(40, 0)
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env }, t0: 2, seconds: 8,
      script: (t, S) => ({ crates: 12 - S.ammo < 7 && S.reload <= 0 ? [{ id: 1001, pos: [o.ex, o.ey, world.ground(o.ex, o.ey)], hp: 300 - 45 * (12 - S.ammo) }] : [] }) })
    return { pass: true, detail: `(informational) gun shots at the crate ${r.firedGun} in 8 s, each heard to 320 m (crate break 220 m); mode ${r.log[r.log.length - 1].mode}/${r.log[r.log.length - 1].leg}`, log: r.log }
  })
}
// ---------------------------------------------------------------- S7: strafe timing must not be computable by an observer
// Two matches that look the same to an opponent (our seat, position, hp, target) but differ in what only we
// can see (our energy, the random bearing noise of the sounds we hear) must not produce the same reversal
// schedule. Today the schedule is a pure function of hello.seed (fixed per seat, rule L11) and rngSalt (public).
check('strafe-schedule-predictable', 'rule: nothing may depend on secrecy (hello.seed is fixed per seat, the salt is in the public source)', () => {
  const o = findOpen(100, 0)
  const flipTimes = (privNoise) => {
    let prev = null
    const times = []
    const r = run({ start: { x: o.x, y: o.y, yaw: 0 }, overrides: { env: 'squad' }, t0: 50, seconds: 8,
      script: (t) => ({ mechs: [{ id: 7, x: o.ex, y: o.ey, hp: 1400, weapons: ['gun'] }], dmg: Math.round(t * 10) % 5 === 0 ? [{ by: 7, amount: 1 }] : [],
        sounds: [{ kind: 'gun', bearing: 0.01 * privNoise + 0.003 * Math.sin(t * privNoise), dist: 'mid', age: 0.05 }] }) })
    // a reversal = the sign of our velocity component perpendicular to the line to the target flips
    for (const l of r.log) { const sgn = Math.sign(l.y - (prev ? prev.y : l.y)); if (prev && sgn !== 0 && prev.sgn !== 0 && sgn !== prev.sgn) times.push(l.t); prev = { y: l.y, sgn: sgn || (prev ? prev.sgn : 0) } }
    return times
  }
  const a = flipTimes(1), b = flipTimes(7)
  const same = JSON.stringify(a) === JSON.stringify(b)
  return { pass: !same && a.length >= 3, detail: `reversal times with private noise A ${JSON.stringify(a.slice(0, 6))}, with private noise B ${JSON.stringify(b.slice(0, 6))}: ${same ? 'IDENTICAL, so an opponent who knows our seat seed (16 values) and reads rngSalt can precompute every reversal' : 'different'}` }
})

const fails = results.filter((r) => !r.pass).length
console.log(`\n${results.length - fails}/${results.length} scenario checks pass`)
process.exit(0)
