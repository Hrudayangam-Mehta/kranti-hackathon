// w2/A synthetic trigger tests (one scene per preset): in the SQUAD posture the preset acts (actions differ from its old
// value and its counter moves); with env forced to FFA the same scene equals the old value; after one foreign death (alive
// 12 -> 11 before the trigger appears) the scene equals the old value. usage: bun test_w2a.mjs [lib dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const LIB = process.argv[2] || S + '/fable_work/w2/A/tree/lib'
const R = S + '/r7work'
const { createBrain } = await import(LIB + '/brain.js')
const { World } = await import(R + '/ref_bot/lib/world.js'), { Nav } = await import(R + '/ref_bot/lib/nav.js')
const lines = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, Wp = cfg.weapons
const world = World.loadSync(R + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }

// ---- geometry on the real map: our spot, points with / without a two-way line at a given range
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const clearTo = (x, y, z) => world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5) &&
  world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 8) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 8)
const blockedTo = (x, y, z) => !world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && !world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 8) &&
  !world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5) && !world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 8.1)
function pointAt(r, want, skip = []) {
  for (let k = 0; k < 144; k++) {
    const a = k * Math.PI / 72, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
    if (skip.some((p) => Math.abs(p.a - a) < 0.35)) continue
    if (!nav.passableAt(x, y)) continue
    const z = nav.levelAt(x, y)
    if (z - world.ground(x, y) > 1) continue
    if (want === 'clear' ? clearTo(x, y, z) : blockedTo(x, y, z)) return { x, y, z, a }
  }
  return null
}
const zone = { center: [me0.x, me0.y], radius: 900, next_center: [me0.x, me0.y], next_radius: 600, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const gunW = (ammo = 12, reload = 0) => ({ kind: 'gun', cooldown: 0, ammo, reload, stats: Wp.gun })
const laserW = (charge = 0, cooldown = 0) => ({ kind: 'laser', cooldown, charge, stats: Wp.laser })
const mech = (id, p, o = {}) => ({ id, kind: 'mech', pos: [p.x, p.y, p.z], vel: o.vel || [0, 0, 0], aim: [o.aimYaw === undefined ? p.a + Math.PI + 1.2 : o.aimYaw, 0], hp: o.hp || 1400, max_hp: 1400, cubes: 0, weapons: o.weapons || ['gun'], charging: false })
function obs(k, t, o) {
  return { type: 'obs', tick: 2 * k, t, alive: o.alive || 12,
    self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: o.aim || [0, 0], hp: o.hp || 1400, max_hp: 1400, energy: o.energy === undefined ? 100 : o.energy, max_energy: 100, grounded: true,
      cubes: o.cubes || 0, upgrades: [], in_zone: true, weapons: o.weapons || [gunW(), null], stats: cfg.mech },
    mechs: o.mechs || [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: o.events || [], drops: [], zone, offer: null }
}
/** Runs a scene: mk(k, t) -> obs; returns the action / mode / leg / target stream from decision `from` on and the brain. */
function run(sel, env, mk, n, from = 0, t0 = 30, setup) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(env ? { env } : {}), select: sel })
  if (setup) setup(b._B)
  const out = []
  for (let k = 0; k < n; k++) {
    const a = b.act(mk(k, +(t0 + k * 0.1).toFixed(2)), performance.now() + 1e6), B = b._B
    if (k >= from) out.push(JSON.stringify(a) + B.mode + B.legKind + (B.target ? B.target.id : '-'))
  }
  return { s: out.join('|'), B: b._B, last: out[out.length - 1] }
}
function tf2(name, key, val, mk, n, counter, opts = {}) {
  const on = { [key]: val }, off = { [key]: 'off' }
  const sq = run(on, null, mk, n, 0, opts.t0, opts.setup), sq0 = run(off, null, mk, n, 0, opts.t0, opts.setup)
  const ff = run(on, 'ffa', mk, n, 0, opts.t0, opts.setup), ff0 = run(off, 'ffa', mk, n, 0, opts.t0, opts.setup)
  const c = sq.B.counters[counter] || 0
  check(`${name}: acts in SQUAD (${counter} ${c})`, sq.s !== sq0.s && c > 0, `off ${sq0.last.slice(0, 150)}\n        on  ${sq.last.slice(0, 150)}`)
  check(`${name}: forced FFA identical to off`, ff.s === ff0.s && !(ff.B.counters[counter] > 0), `FFA same ${ff.s === ff0.s}, counter ${ff.B.counters[counter] || 0}`)
  if (opts.fd !== false) {
    // one foreign death first: decision 0 sees alive 12, decision 1 alive 11 (stance counts it after the assess stage, so the
    // firewall reads it from decision 2 on, as for every CH1 rule); the trigger scene runs from decision 2 with alive 11
    const mkF = (k, t) => (k === 0 ? obs(0, t, { alive: 12 }) : k === 1 ? obs(1, t, { alive: 11 }) : { ...mk(k - 2, t), alive: 11 })
    const fd = run(on, null, mkF, n + 2, 2, opts.t0, opts.setup), fd0 = run(off, null, mkF, n + 2, 2, opts.t0, opts.setup)
    check(`${name}: after one foreign death identical to off`, fd.s === fd0.s && !(fd.B.counters[counter] > 0), `same ${fd.s === fd0.s}, counter ${fd.B.counters[counter] || 0}`)
  }
}

const p120 = pointAt(120, 'clear'), p100 = pointAt(100, 'clear'), p60 = pointAt(60, 'clear'), p200 = pointAt(200, 'clear'), p90 = pointAt(90, 'clear')
const far = pointAt(180, 'blocked') || pointAt(170, 'blocked') || pointAt(190, 'blocked')
console.log(`me0 ${me0.x.toFixed(0)},${me0.y.toFixed(0)}; points 120:${!!p120} 100:${!!p100} 60:${!!p60} 200:${!!p200} 90:${!!p90} far:${!!far}`)
const hitBy = (id, p, amt = 45) => ({ type: 'damaged', amount: amt, weapon: 'gun', bearing: Math.atan2(p.y - me0.y, p.x - me0.x), by: id })

// en_open: t 30 s, no kill, no cube yet but the dry clock starts now: a calm lined mech at 120 m (a band candidate today)
tf2('en_open D1 gate (calm lined mech at 120 m, t 30 s)', 'en_open', 'on', (k, t) => obs(k, t, { mechs: [mech(11, p120)] }), 8, 'enOpenBlock')
// en_open strict: hit once from 120 m: answered only under 'on' (enOpenFar); 'strict' leaves it to the shot-at DISENGAGE
{
  const mk = (k, t) => obs(k, t, { mechs: [mech(11, p120, { aimYaw: p120.a + Math.PI })], events: k === 1 ? [hitBy(11, p120)] : [] })
  const a = run({ en_open: 'on' }, null, mk, 6), s = run({ en_open: 'strict' }, null, mk, 6)
  check(`en_open 'on' answers a shooter at 120 m, 'strict' does not`, a.B.target && a.B.target.id === 11 && !s.B.target, `on target ${a.B.target ? a.B.target.id : '-'} ${a.B.mode}; strict target ${s.B.target ? s.B.target.id : '-'} ${s.B.mode}`)
}
// en_band D2: gun only, a hostile mech at 100 m (hits us): today 55-95 -> walk in; D2 120-150 -> back off with the strafe
tf2('en_band D2 gun band (hostile at 100 m)', 'en_band', 'on', (k, t) => obs(k, t, { mechs: [mech(11, p100, { aimYaw: p100.a + Math.PI })], events: k % 4 === 0 ? [hitBy(11, p100)] : [] }), 12, 'enBandGun')
// en_band D4: a shooter at 60 m, energy 100: boost straight away
tf2('en_band D4 boost-away (shooter at 60 m)', 'en_band', 'on', (k, t) => obs(k, t, { mechs: [mech(11, p60, { aimYaw: p60.a + Math.PI })], events: k % 4 === 0 ? [hitBy(11, p60)] : [] }), 8, 'enAwayStart')
// en_band D3: laser held, a full-hp hostile at 110 m: today's midsq band 100-130 holds, D3 130-170 backs off
{
  const p110 = pointAt(110, 'clear')
  tf2('en_band D3 laser band (full-hp hostile at 110 m)', 'en_band', 'on', (k, t) => obs(k, t, { weapons: [gunW(), laserW(0, 1.0)], mechs: [mech(11, p110, { aimYaw: p110.a + Math.PI, weapons: ['gun', 'laser'] })], events: k % 4 === 0 ? [hitBy(11, p110)] : [] }), 12, 'enBandLaser')
}
// en_band D6: our hp 50%, a calm lined mech at 200 m after the opening: today no candidate (any70f needs 70%), D6 a target
tf2('en_band D6 lined mech at 200 m at 50% hp', 'en_band', 'on', (k, t) => obs(k, t, { hp: 700, mechs: [mech(11, p200)] }), 6, 'enD6Cand')
// en_retarget D5: hp 600 under 150 dps; current target A 1400 hp at 90 m, B 500 hp at 120 m appears at decision 4
{
  const pB = pointAt(120, 'clear', [p90])
  const mk = (k, t) => obs(k, t, { hp: 600, weapons: [gunW(), laserW(0, 0)], mechs: [mech(11, p90, { aimYaw: p90.a + Math.PI })].concat(k >= 4 ? [mech(12, pB, { hp: 450 })] : []),
    events: [hitBy(11, p90, 30)] })
  tf2('en_retarget D5 (we die first: B 450 hp appears)', 'en_retarget', 'on', mk, 10, 'enRetarget')
  // the current-target bonus 60: the same scene with the intake from an unseen mech (A did not hit us, so no -40 for A)
  const mkR = (k, t) => ({ ...mk(k, t), events: [{ ...hitBy(50, p90, 30), bearing: p90.a + 2.5 }] })
  tf2('en_retarget bonus 60 (B 450 hp cheaper than A + 60)', 'en_retarget', 'on', mkR, 10, 'enRescore')
  const r = run({ en_retarget: 'on' }, null, mk, 10), r0 = run({ en_retarget: 'off' }, null, mk, 10)
  console.log(`        target off ${r0.B.target && r0.B.target.id}, on ${r.B.target && r.B.target.id}; tDie ${r.B.en.st.tDie.toFixed(2)}, enRetarget ${r.B.counters.enRetarget || 0}`)
}
// en_contra C: hp 30% with 3 shooters at 90-120 m: close in with a boost
{
  const pA = p90, pB = pointAt(110, 'clear', [p90]), pC = pointAt(120, 'clear', [p90, pB])
  const ms = [mech(11, pA, { aimYaw: pA.a + Math.PI }), mech(12, pB, { aimYaw: pB.a + Math.PI }), mech(13, pC, { aimYaw: pC.a + Math.PI })]
  tf2('en_contra C (hp 30%, 3 shooters)', 'en_contra', 'on', (k, t) => obs(k, t, { hp: 420, mechs: ms, events: [hitBy(11, pA, 10), hitBy(12, pB, 10), hitBy(13, pC, 10)] }), 8, 'ecLegs')
}
// fi_gate e1: a still mech at 200 m, the torso 0.207 rad short of it (0.2 rad of slew in one 0.05 s tick): old gate 0.004 rad
// blocks, the new 0.0098 rad gate fires
{
  const yaw = Math.atan2(p200.y - me0.y, p200.x - me0.x), pitch = Math.atan2(p200.z + 4.5 - (me0.z + 7), 200)
  tf2('fi_gate e1 (200 m, residual 0.007 rad)', 'fi_gate', 'on', (k, t) => obs(k, t, { aim: [yaw - 0.207, pitch], mechs: [mech(11, p200, { aimYaw: p200.a + Math.PI })], events: [hitBy(11, p200)] }), 10, 'fiGateExtra', { t0: 40 })
}
// fi_save e2: full laser charge, a lined mech at 100 m with 80 hp, gun loaded: today the beam leaves, e2 holds it
tf2('fi_save e2 (80 hp mech at 100 m, full charge)', 'fi_save', 'on', (k, t) => obs(k, t, { weapons: [gunW(), laserW(0.75, 0)], mechs: [mech(11, p100, { hp: 80, aimYaw: p100.a + Math.PI, weapons: ['gun', 'laser'] })], events: [hitBy(11, p100)] }), 2, 'beamHeldForGun')
// fi_reload e3: 7 rounds, our target 180 m away behind cover (no line in or out): e3 reloads, today waits
tf2('fi_reload e3 (7 rounds, target behind cover)', 'fi_reload', 'on', (k, t) => obs(k, t, { weapons: [gunW(7), null], mechs: [mech(11, far, { aimYaw: far.a + Math.PI })], events: k === 0 ? [hitBy(11, far)] : [] }), 14, 'earlyReloads')
// fi_snap e5: a listed mech behind cover closing at 11 m/s whose position within 1.5 s is in a clear line
{
  let snapP = null
  for (let r = 150; r <= 240 && !snapP; r += 10) for (let k = 0; k < 144 && !snapP; k++) {
    const a = k * Math.PI / 72, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
    if (!nav.passableAt(x, y)) continue
    const z = nav.levelAt(x, y)
    if (z - world.ground(x, y) > 1 || !blockedTo(x, y, z)) continue
    for (const lat of [0, 3, -3, 6, -6]) {
      const vx = -11 * Math.cos(a) - lat * Math.sin(a), vy = -11 * Math.sin(a) + lat * Math.cos(a)
      const ok = [0.5, 1.0, 1.5].some((T) => world.shotClear(me0.x, me0.y, me0.z + 7, x + vx * T, y + vy * T, z + 4.5))
      if (ok) { snapP = { x, y, z, a, vx, vy }; break }
    }
  }
  if (snapP) tf2('fi_snap e5 (closing mech behind cover)', 'fi_snap', 'on', (k, t) => obs(k, t, { weapons: [gunW(), laserW(0, 0)], mechs: [{ ...mech(11, snapP, { aimYaw: snapP.a + Math.PI, weapons: ['gun', 'laser'] }), vel: [snapP.vx, snapP.vy, 0] }], events: k === 0 ? [hitBy(11, snapP)] : [] }), 3, 'fiSnapStart')
  else check('fi_snap e5 scene', false, 'no geometry found')
}
// fi_rung e6: charging (0.7 s) at a lined mech at 100 m in the open: today the 0.8 rung, e6 the 0.5 rung (pitch differs)
tf2('fi_rung e6 (0.5 rung in the open)', 'fi_rung', 'on', (k, t) => obs(k, t, { weapons: [gunW(), laserW(0.7, 0)], mechs: [mech(11, p100, { aimYaw: p100.a + Math.PI })], events: [hitBy(11, p100)] }), 1, 'fiRungAim', {
  setup: (B) => { const f = B.f2; if (f) { const r = f.laserRungs; f.laserRungs = (base) => { const x = r(base); if (x !== base) B.counters.fiRungAim = (B.counters.fiRungAim || 0) + 1; return x } } } })

console.log(`\n${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
