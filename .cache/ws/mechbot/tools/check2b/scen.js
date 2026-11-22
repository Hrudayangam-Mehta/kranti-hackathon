// check2b: independent behaviour scenarios for the pass 2b defaults (built by the checker; own geometry and seeds).
//   bun scen.js [--only=name]      Each scenario: plain defaults ("on") vs the one switch off.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(P + '/tools/arena_req.js')
const { rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const want = (n) => !ONLY || n.includes(ONLY)
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(P + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const ctxMap = { world, nav, log: () => {} }, ctxNone = { world: null, nav: null, log: () => {} }
createBrain(hello, ctxMap)   // the rehearsal once, outside the scenarios
const res = []
const check = (name, ok, detail) => { res.push({ name, ok: !!ok }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail) }
const fx = (v, n = 1) => (typeof v === 'number' ? v.toFixed(n) : String(v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const BIG = 1e7
const FFAZ = (x, y) => ({ center: [x - 1800, y], radius: 5000, next_center: [x - 1800, y], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
const bigZone = (x, y) => ({ center: [x, y], radius: 3000, next_center: [x, y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
function drive(ar, br, secs, hook, pre) {
  for (let k = 0; k < Math.round(secs * 10); k++) {
    const o = ar.obs()
    if (pre) pre(ar, o, br)
    const a = br.act(o, performance.now() + 27.5)
    if (hook && hook(ar, o, a, br) === true) break
    ar.step(a)
  }
}
const walkTo = (e, x, y, v, dt) => { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 0.4) { e.vx = dx / d * v; e.vy = dy / d * v; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } else { e.vx = 0; e.vy = 0 } }

// ---------------------------------------------------------------- R1a: a crate another mech is breaking
if (want('r1a')) {
  const run = (over, env, t0, shooterD, weapon, angOv) => {
    const ffa = env === 'ffa'
    const cx = ffa ? -40 : 62, cy = ffa ? -58 : -38, crate = { id: 1101, pos: [cx, cy, 0], hp: 300 }
    const ang = Math.atan2(cy, cx) + (angOv ?? (ffa ? 1.25 : 0.3)), sx = cx + shooterD * Math.cos(ang), sy = cy + shooterD * Math.sin(ang)
    const ar = new ArenaReq({ cfg, seed: 101, me: { x: 0, y: 0, yaw: Math.atan2(cy, cx) }, crates: [crate], zone: FFAZ(0, 0),
      enemies: [{ id: 31, x: sx, y: sy, hp: BIG, weapons: ['gun', weapon === 'laser' ? 'laser' : null].filter(Boolean), script: (e, t, a, dt) => {
        if (crate.hp > 0) { a.shootCrate(e, crate, 45, dt, 'laser'); return }
        const c = a.cubes[0]; if (c) walkTo(e, c.pos[0], c.pos[1], cfg.mech.walk_speed, dt); else { e.vx = 0; e.vy = 0 }
      } }] })
    ar.enemies[0].takes = true
    ar.t = t0
    const br = createBrain(hello, ctxNone, { ...(ffa ? { env: 'ffa' } : {}), ...over })
    let shotsAtCrate = 0, shotsAtMech = 0, brokeT = -1, dAtBreak = -1
    drive(ar, br, 18, (a, o, act, b) => { if (crate.hp > 0 && act.fire && act.fire[0]) { if (b._B.target) shotsAtMech++; else shotsAtCrate++ } if (crate.hp <= 0 && brokeT < 0) { brokeT = a.t; dAtBreak = Math.hypot(a.me.x - cx, a.me.y - cy) } }, ffa ? (a, o) => { o.alive = 12 } : null)
    return { cube: ar.me.cubes, theirs: ar.stats.enemyCubes || 0, laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), shotsAtCrate, shotsAtMech, dAtBreak: +dAtBreak.toFixed(1), steals: br.debugState().counters.steals || 0 }
  }
  const OFF = { select: { R1: 'off', crateGate: 'off' } }
  const sqLate = run({}, 'squad', 100, 140), sqLateOff = run(OFF, 'squad', 100, 140)
  const sqGate = run({}, 'squad', 30, 140), sqGateOff = run(OFF, 'squad', 30, 140)
  const ff = run({}, 'ffa', 150, 32, 'laser'), ffOff = run(OFF, 'ffa', 150, 32, 'laser'), ff22 = run({}, 'ffa', 150, 22, 'laser'), ffLine = run({}, 'ffa', 150, 32, 'laser', 0)
  const ok = sqLate.cube === 1 && sqLate.laser && sqLate.shotsAtCrate === 0 && sqGate.cube === 1 && sqGate.shotsAtCrate === 0 && ff.cube === 1 && ff.theirs === 0 && ff.shotsAtCrate === 0
  check('R1a crate another mech breaks (SQUAD after and inside the farm-first gate, FFA with the shooter 32 m from it walking to the cube; steal needs >= 25 m): cube + weapon ours, no ammunition on the crate', ok,
    `SQUAD t100 on ${JSON.stringify(sqLate)} off ${JSON.stringify(sqLateOff)} | SQUAD t30 on ${JSON.stringify(sqGate)} off ${JSON.stringify(sqGateOff)} | FFA on ${JSON.stringify(ff)} off ${JSON.stringify(ffOff)} | FFA shooter 22 m (inside stealShooterMinD 25) ${JSON.stringify(ff22)} | FFA shooter 32 m exactly behind the crate on our line (its torso points at us) ${JSON.stringify(ffLine)}`)
}

// ---------------------------------------------------------------- R1b: kill drops only when we are first
if (want('r1b')) {
  const run = (over, vx, vy, survD, aliveAdd, stand, side) => {
    // victim at (vx, vy); the survivor stands survD from it on the far side and walks to the drops after the death
    const ang = Math.atan2(vy, vx), sx = vx + survD * Math.cos(ang + (side ?? 1.5)), sy = vy + survD * Math.sin(ang + (side ?? 1.5))
    const A = { id: 41, x: vx, y: vy, hp: 900, weapons: ['gun', 'laser'], script: (e, t, a) => { e.yaw = Math.atan2(sy - e.y, sx - e.x); e.vx = 0; e.vy = 0; if (t >= 122.5 && e.alive) a.kill(e) } }
    const Bm = { id: 42, x: sx, y: sy, hp: 1000, weapons: ['gun'], script: (e, t, a, dt) => { if (t < 122.5 || stand) { e.yaw = Math.atan2(vy - e.y, vx - e.x); e.vx = 0; e.vy = 0; return } walkTo(e, vx, vy, 8, dt) } }
    const ar = new ArenaReq({ cfg, seed: 7, me: { x: 0, y: 0, yaw: Math.atan2(vy, vx) }, enemies: [A, Bm], zone: FFAZ(0, 0) })
    ar.enemies[0].cubes = 3; ar.enemies[1].takes = true
    ar.t = 120
    const br = createBrain(hello, ctxNone, { env: 'ffa', ...over })
    let minD = 1e9
    drive(ar, br, 10, (a) => { if (a.t > 122.5) minD = Math.min(minD, Math.hypot(a.me.x - vx, a.me.y - vy)) }, (a, o) => { o.alive = aliveAdd + o.alive })
    return { cubes: ar.me.cubes, laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), theirs: ar.stats.enemyCubes || 0, minD: +minD.toFixed(1), seen: br.debugState().counters.deathsSeen || 0 }
  }
  const OFF = { select: { R1: 'off' } }
  // victim 35.6 m from us (inside the 45 m all-round sense, the steal code uses near - 3 = 42 m); survivor to the side,
  // facing the victim: 70 m (we are first) / 25 m (it is first by path time) / 6 m
  const vx = -22, vy = 28
  const first = run({}, vx, vy, 70, 9), firstOff = run(OFF, vx, vy, 70, 9), second = run({}, vx, vy, 25, 9), near = run({}, vx, vy, 6, 9)
  const first2 = run({}, 30, -18, 65, 9), second2 = run({}, 30, -18, 22, 9)
  const ok = first.cubes >= 2 && first.laser && firstOff.cubes === 0 && second.minD > 20 && near.minD > 20 && first2.cubes >= 2 && second2.minD > 20
  check('R1b kill drops: we 35 m away and the survivor 65-70 m -> cubes + laser ours (R1 off: none); survivor 22-25 m or 6 m away (it is first) -> we stay away (> 20 m); two geometries', ok,
    `A: first ${JSON.stringify(first)} | R1 off ${JSON.stringify(firstOff)} | survivor 25 m ${JSON.stringify(second)} | survivor 6 m ${JSON.stringify(near)} || B: first ${JSON.stringify(first2)} | survivor 22 m ${JSON.stringify(second2)}`)
  // rate over 8 geometries (victim 30-40 m at 8 bearings, survivor 65 m to the side): survivor walking to its drops vs standing
  const geo = [], rate = { walk: 0, stand: 0, walkLaser: 0, standLaser: 0 }
  for (let i = 0; i < 8; i++) {
    const b = -Math.PI + i * Math.PI / 4 + 0.3, r = 30 + (i % 3) * 5, gx = r * Math.cos(b), gy = r * Math.sin(b), sd = i % 2 ? 1.5 : -1.5
    const w = run({}, gx, gy, 65, 9, false, sd), st = run({}, gx, gy, 65, 9, true, sd)
    if (w.cubes >= 3) rate.walk++; if (st.cubes >= 3) rate.stand++; if (w.laser) rate.walkLaser++; if (st.laser) rate.standLaser++
    geo.push(`${i}: walk c${w.cubes}${w.laser ? '+L' : ''} stand c${st.cubes}${st.laser ? '+L' : ''}`)
  }
  check('R1b kill drops, 8 geometries where we are first (victim 30-40 m, survivor 65 m to the side): >= 3 of 5 cubes and the laser ours in most (>= 6/8) whether the survivor walks to its drops or stands', rate.walk >= 6 && rate.walkLaser >= 6 && rate.stand >= 6 && rate.standLaser >= 6,
    `survivor walking: >= 3 cubes ${rate.walk}/8, laser ${rate.walkLaser}/8 | standing: ${rate.stand}/8, laser ${rate.standLaser}/8 || ${geo.join(' | ')}`)
  // prototype geometry (victim 67 m away, beyond the 45 m all-round sense) with the late-game alive count (3 -> 2): informational
  const proto = run({}, 60, 30, 60, 0), protoMid = run({}, 60, 30, 60, 9), protoNoScan = run({ select: { R2: 'off' } }, 60, 30, 60, 0)
  console.log(`INFO  R1b prototype geometry (victim 67 m, survivor 60 m beyond): late game (3 alive) ${JSON.stringify(proto)} | 12 alive ${JSON.stringify(protoMid)} | late game, R2 off ${JSON.stringify(protoNoScan)}`)
}

// ---------------------------------------------------------------- R2: late-game rear within 3 s
if (want('r2')) {
  const runIdle = (over, bearing, D, t0, alive) => {
    const ex = D * Math.cos(bearing), ey = D * Math.sin(bearing)
    const ar = new ArenaReq({ cfg, seed: 211, me: { x: 0, y: 0, yaw: 0 }, zone: FFAZ(0, 0),
      enemies: [{ id: 51, x: ex, y: ey, hp: BIG, weapons: ['gun'], script: (e, t, a, dt) => { e.yaw = Math.atan2(-e.y, -e.x) + 0.9; walkTo(e, e.x * 0.999, e.y * 0.999, 4, dt) } }],
      sounds: () => [{ kind: 'step', bearing: 0.05, dist: 'mid', age: 0.05 }] })
    ar.t = t0
    const br = createBrain(hello, ctxNone, over)
    let seenAt = -1
    drive(ar, br, 10, (a, o) => { if (seenAt < 0 && o.mechs.some((m) => m.id === 51)) { seenAt = a.t - t0; return true } }, (a, o) => { o.alive = alive })
    return seenAt < 0 ? 99 : +seenAt.toFixed(1)
  }
  const cases = [[Math.PI, 150], [2.5, 110], [-2.6, 170], [2.0, 130], [-1.9, 100]]
  const on = cases.map(([b, d]) => runIdle({}, b, d, 310, 4)), off = cases.map(([b, d]) => runIdle({ select: { R2: 'off' } }, b, d, 310, 4))
  const ffa = cases.map(([b, d]) => runIdle({ env: 'ffa' }, b, d, 310, 4))
  check('R2 late game (t 310, 4 alive), idle with a sound in front: a silent mech 100-170 m behind / to the rear sides is seen within 3 s (SQUAD and FFA)', Math.max(...on) <= 3 && Math.max(...ffa) <= 3,
    `SQUAD on ${on.join(' / ')} s | FFA on ${ffa.join(' / ')} s | R2 off ${off.join(' / ')} s (99 = not in 10 s)`)
  const runRear = (over) => {
    const ar = new ArenaReq({ cfg, seed: 223, me: { x: 0, y: 0, yaw: 0.3, pinned: true }, zone: FFAZ(0, 0),
      enemies: [{ id: 52, x: 95 * Math.cos(0.3), y: 95 * Math.sin(0.3), hp: BIG, weapons: ['gun'], dps: 25, script: (e) => { e.yaw = Math.atan2(-e.y, -e.x) } },
        { id: 53, x: -70, y: -60, hp: BIG, weapons: ['gun'], dps: 25, script: (e) => { e.yaw = Math.atan2(-e.y, -e.x) } }] })
    ar.t = 280
    const br = createBrain(hello, ctxNone, over)
    let firstRear = -1, faced = -1
    drive(ar, br, 8, (a) => { if (firstRear < 0 && (a.stats.rearHits || 0) > 0) firstRear = a.t; if (firstRear >= 0 && faced < 0 && Math.abs(wrap(Math.atan2(-60 - a.me.y, -70 - a.me.x) - a.me.yaw)) < Math.PI / 2) faced = a.t - firstRear })
    return { faced: faced < 0 ? 99 : +faced.toFixed(2), rearHits: ar.stats.rearHits || 0 }
  }
  const rOn = runRear({}), rOff = runRear({ select: { R2: 'off' } })
  check('R2 engaged: a 25 dps attacker at our rear (another in front) is faced within 1.5 s', rOn.faced <= 1.5, `on ${JSON.stringify(rOn)} | R2 off ${JSON.stringify(rOff)}`)
}

// ---------------------------------------------------------------- R2 + rule 8: late-game sweep keeps the courtesy offset on a calm mech (FFA)
if (want('r2r8')) {
  const run = (over) => {
    const ar = new ArenaReq({ cfg, seed: 233, me: { x: 0, y: 0, yaw: 0 }, zone: FFAZ(0, 0),
      enemies: [{ id: 55, x: 80, y: 20, hp: 1400, weapons: ['gun', 'laser'], script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(-e.y, -e.x) + 1.4 } }] })
    ar.t = 300
    const br = createBrain(hello, ctxNone, { env: 'ffa', ...over })
    let n = 0, inView = 0, courtesy = 0, direct = 0, shots = 0, gap = 0, maxGap = 0
    drive(ar, br, 12, (a, o, act) => { n++; const off = Math.abs(wrap(Math.atan2(20 - a.me.y, 80 - a.me.x) - a.me.yaw)); if (off <= Math.PI / 3) { inView++; gap = 0 } else { gap += 0.1; maxGap = Math.max(maxGap, +gap.toFixed(1)) } if (off >= 0.2 && off <= 0.45) courtesy++; if (off < 0.1) direct++; if (act.fire && act.fire[0]) shots++ }, (a, o) => { o.alive = 4 })
    return { n, inView, courtesy, direct, shots, maxGap }
  }
  const on = run({}), off = run({ select: { R2: 'off' } })
  console.log(`INFO  R2 + rule 8 (FFA, t 300, 4 alive, a calm mech 82 m away, nothing else): decisions with it in our wedge / at the 0.2-0.45 rad courtesy offset / stared at (< 0.1 rad), shots, longest time out of the wedge: on ${JSON.stringify(on)} | R2 off ${JSON.stringify(off)}`)
  check('R2 + rule 8: the sweep never stares at a calm mech, never shoots it, and comes back to it within the 5 s vision memory', on.direct <= 0.1 * on.n && on.shots === 0 && on.maxGap < 5, `on ${JSON.stringify(on)}`)
}

// ---------------------------------------------------------------- R3: laser over a low wall (real map, own search)
if (want('r3')) {
  const rnd = rng32(9137), m = cfg.mech, bd = world.bounds, spots = []
  for (let i = 0; i < 400000 && spots.length < 3; i++) {
    const sx = bd.minX + 60 + rnd() * (bd.maxX - bd.minX - 120), sy = bd.minY + 60 + rnd() * (bd.maxY - bd.minY - 120)
    if (!nav.passableAt(sx, sy) || nav.wallDistAt(sx, sy) < 4) continue
    const a = rnd() * Math.PI * 2, D = 90 + rnd() * 90, tx = sx + D * Math.cos(a), ty = sy + D * Math.sin(a)
    if (!nav.passableAt(tx, ty)) continue
    const sz = nav.levelAt(sx, sy), tz = nav.levelAt(tx, ty), mz = sz + m.muzzle_height
    if (world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.5) || world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.35)) continue
    const ux = Math.cos(a), uy = Math.sin(a)
    if (!world.shotClear(sx + ux * 3, sy + uy * 3, mz, tx, ty, tz + m.height * 0.8) || !world.shotClear(sx, sy, mz, tx, ty, tz + m.height * 0.8)) continue
    if (!world.canSee(sx, sy, sz + m.eye_height, tx, ty, tz + m.height)) continue
    if (spots.some((s) => Math.hypot(s.sx - sx, s.sy - sy) < 50)) continue
    spots.push({ sx, sy, tx, ty, D })
  }
  const run = (f, over) => {
    const ar = new ArenaReq({ cfg, world, nav, seed: 307, me: { x: f.sx, y: f.sy, yaw: Math.atan2(f.ty - f.sy, f.tx - f.sx), pinned: true, weapons: ['gun', 'laser'] },
      enemies: [{ id: 61, x: f.tx, y: f.ty, hp: BIG, weapons: ['gun'], script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) + 0.7 } }], zone: bigZone(f.sx, f.sy) })
    ar.t = 110
    const br = createBrain(hello, ctxMap, { rPrefLaser: f.D, laserLo: f.D - 30, laserHi: f.D + 30, ...over })
    drive(ar, br, 15)
    return { beams: ar.stats.beams, hits: ar.stats.beamHits }
  }
  const out = []; let okN = 0
  for (const f of spots) {
    const on = run(f, {}), off = run(f, { select: { R3: 'off' } })
    if (on.beams >= 3 && on.hits >= 0.75 * on.beams) okN++
    out.push(`${fx(f.D, 0)} m: on ${on.hits}/${on.beams} | off ${off.hits}/${off.beams}`)
  }
  check('R3 laser head aim: only the top of the target clears a low wall (3 own spots, 90-180 m) -> >= 75% of beams hit', spots.length === 3 && okN === 3, out.join(' || '))
}

// ---------------------------------------------------------------- C1 finish rail (counter module through the brain, kit stream house bot)
if (want('c1')) {
  const obs = lines.filter((l) => l.type === 'obs')
  const run = (over) => {
    const br = createBrain(hello, ctxMap, { env: 'ffa', ...over }), B = br._B
    let before = null, after = null
    for (const o0 of obs) {
      const o = JSON.parse(JSON.stringify(o0))
      const mod = o.t >= 27
      if (mod) {
        o.events = (o.events || []).filter((e) => !(e.type === 'damaged' && e.by === 10))
        for (const m of o.mechs || []) if (m.id === 10) { m.hp = Math.round(0.45 * m.max_hp); m.charging = false; m.aim = [Math.atan2(m.pos[1] - o.self.pos[1], m.pos[0] - o.self.pos[0]), 0] }
      }
      br.act(o, performance.now() + 27.5)
      if (!B.cx || !B.cxCtx) continue
      const adv = B.cx.adviceFor(10, B.cxCtx)
      const rec = { t: o.t, label: B.cx.archetypeOf ? B.cx.archetypeOf(10) : '', level: adv.engageLevel, reason: adv.reason, mult: +(+adv.targetMult).toFixed(2), active: adv.active }
      if (!mod) before = rec; else after = rec
    }
    return { before, after }
  }
  const on = run({}), off = run({ select: { cxFinish: 'off' } })
  const ok = on.after && /finish/.test(String(on.after.reason)) && on.after.level >= 2 && off.after && !/finish/.test(String(off.after.reason))
  check('C1 finish rail: the kit-stream house bot (read LASER_KITER) at 45%, torso away, not charging, not hitting us -> engage level 2 "*/finish" (cxFinish off: not)', ok,
    `on before ${JSON.stringify(on.before)} after ${JSON.stringify(on.after)} | off after ${JSON.stringify(off.after)}`)
}

// ---------------------------------------------------------------- farm-first opening (SQUAD)
if (want('openfarm')) {
  // e: one mech, at distance D, bearing 0.25 rad, in our view; mode: 'calm' (torso away, no fire) | 'aim' (aims at us, no fire) | 'shoot' (aims, 20 dps)
  const run = (over, t0, D, mode, secs, cubes, hook, dps) => {
    const ex = D * Math.cos(0.25), ey = D * Math.sin(0.25)
    const ar = new ArenaReq({ cfg, seed: 401, me: { x: 0, y: 0, yaw: 0.25, cubes: cubes || 0 }, enemies: [{ id: 71, x: ex, y: ey, hp: 1400, weapons: ['gun'], dps: mode === 'shoot' ? (dps || 20) : 0,
      script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = mode === 'calm' ? Math.atan2(a.me.y - e.y, a.me.x - e.x) + 1.6 : Math.atan2(a.me.y - e.y, a.me.x - e.x) } }] })
    ar.t = t0
    const br = createBrain(hello, ctxNone, over)
    let shots = 0, tgt = 0, dis = 0, firstShotT = -1, gate = 0
    drive(ar, br, secs, (a, o, act, b) => { const B = b._B; if (act.fire && act.fire[0]) { shots++; if (firstShotT < 0) firstShotT = +(a.t - t0).toFixed(1) } if (B.target && B.target.id === 71) tgt++; if (B.mode === 'DISENGAGE') dis++; if (B.ofGate) gate++ }, hook)
    return { shots, tgt, dis, gate, firstShotT, hits: ar.stats.hits, endT: br._B.ofEndT, hpLost: Math.round(ar.stats.dmgTaken), firstHitD: +(+(br._B.tracks.get(71) || {}).dmgInD).toFixed(0) }
  }
  const OFF = { select: { openFarm: 'off' } }
  const calm50 = run({}, 50, 70, 'calm', 6), calm50off = run(OFF, 50, 70, 'calm', 6)
  const calm76 = run({}, 76, 70, 'calm', 6), calm50c10 = run({}, 50, 70, 'calm', 6, 10)
  const cross = run({}, 72, 70, 'calm', 8)       // the 75 s end inside the run
  const shoot60 = run({}, 50, 60, 'shoot', 6), shoot85f = run({}, 50, 85, 'shoot', 6, 0, null, 60), shoot85 = run({}, 50, 85, 'shoot', 6), shoot95 = run({}, 50, 95, 'shoot', 6, 0, null, 40), shoot125 = run({}, 50, 125, 'shoot', 6), shoot125off = run(OFF, 50, 125, 'shoot', 6)
  const aim60 = run({}, 50, 60, 'aim', 6), aim60off = run(OFF, 50, 60, 'aim', 6)
  // gate ends for good: 10 cubes at t 50, cubes taken away after 1 s: still fights
  const forGood = run({}, 50, 70, 'calm', 6, 10, (a, o) => { if (a.t >= 51) { a.me.cubes = 3; o.self.cubes = 3 } })
  const ok1 = calm50.shots === 0 && calm50.tgt === 0 && calm50.gate > 50 && calm50off.shots > 0
  const ok2 = calm76.shots > 0 && calm50c10.shots > 0 && cross.firstShotT >= 3 - 0.05 && forGood.shots > 0
  const ok3 = shoot60.shots > 0 && shoot60.firstShotT <= 3 && shoot85f.shots > 0 && shoot85f.firstShotT <= 2 && shoot125.shots === 0 && shoot125.dis > 20
  const ok4 = shoot85.shots > 0 && shoot95.shots > 0
  check('farm-first: a calm mech 70 m away in view at t 50 is not shot (openFarm off: shot)', ok1, `on ${JSON.stringify(calm50)} | off ${JSON.stringify(calm50off)}`)
  check('farm-first ends at 75 s or 10 cubes, for good: calm mech shot at t 76, with 10 cubes at t 50, from t 75 when starting at t 72, and after the cubes drop again', ok2,
    `t76 ${JSON.stringify(calm76)} | 10 cubes ${JSON.stringify(calm50c10)} | t72->75 ${JSON.stringify(cross)} | 10 then 3 cubes ${JSON.stringify(forGood)}`)
  check('farm-first answers a hit from within 100 m (60 m at 20 dps, 85 m at 60 dps: answered) and breaks the line from a 125 m shooter (no shot, DISENGAGE)', ok3,
    `60 m ${JSON.stringify(shoot60)} | 85 m 60 dps ${JSON.stringify(shoot85f)} | 125 m ${JSON.stringify(shoot125)} | 125 m openFarm off ${JSON.stringify(shoot125off)}`)
  check('farm-first answers a mech that starts shooting us from 85-95 m (first hit 1.1-2.3 s after it turns to us; open ground, no cover)', ok4,
    `85 m 20 dps ${JSON.stringify(shoot85)} | 95 m 40 dps ${JSON.stringify(shoot95)} (hpLost = our damage taken in 6 s; firstHitD = range at its last hit)`)
  console.log(`INFO  farm-first vs D0: a mech aiming at us from 60 m (hostile by D0, no damage yet) at t 50: on ${JSON.stringify(aim60)} | openFarm off ${JSON.stringify(aim60off)}`)
}

// ---------------------------------------------------------------- FFA spots with cover (real map, own seeds)
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
const mid = (a, o) => { o.alive = 12 }
if (want('rule4')) {
  const out = []
  let done = 0, ok = 0, okOff = 0, okReal = 0
  for (let sd = 1501; sd < 1700 && done < 4; sd++) {
    const sp = spot(sd, 95, 145)
    if (!sp) continue
    const mk = (over, hp) => {
      const ar = new ArenaReq({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, zone: bigZone(sp.x, sp.y),
        enemies: [{ id: 81, x: sp.ex, y: sp.ey, hp, maxHp: 1400, script: (e, t, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? 25 : 0 } }] })
      ar.t = 100
      const br = createBrain(hello, ctxMap, { env: 'ffa', ...over })
      let brk = 0, sx = sp.x, sy = sp.y, unseen = 0, maxRelUnseen = 0, maxUnseenInBreak = 0, fired = 0, endReason = ''
      drive(ar, br, 30, (a, o, act, b) => {
        const B = b._B, vis = a.t - B.lastLosInT <= 0.2
        if (vis) { sx = a.me.x; sy = a.me.y; unseen = 0 } else unseen += 0.1
        if (B.ffaBreak) { brk++; if (act.fire[0]) fired++; if (!vis) { maxRelUnseen = Math.max(maxRelUnseen, Math.hypot(a.me.x - sx, a.me.y - sy)); maxUnseenInBreak = Math.max(maxUnseenInBreak, unseen) } }
      }, mid)
      return { brk, fired, maxRelUnseen: +maxRelUnseen.toFixed(1), maxUnseen: +maxUnseenInBreak.toFixed(1), enemyHp: Math.round(ar.enemies[0].hp), dmg: Math.round(ar.stats.dmgTaken) }
    }
    const on = mk({}, BIG), off = mk({ select: { ffaBreakFix: 'off' } }, BIG)
    if (on.brk === 0 && off.brk === 0) continue
    done++
    const real = mk({}, 1400)
    if (on.maxRelUnseen >= 20 && on.maxUnseen >= 9) ok++
    if (off.maxRelUnseen >= 20 && off.maxUnseen >= 9) okOff++
    if (real.maxRelUnseen >= 20 && real.maxUnseen >= 9) okReal++
    out.push(`seed ${sd}: on ${JSON.stringify(on)} | fix off ${JSON.stringify(off)} | 1400 hp shooter ${JSON.stringify(real)}`)
  }
  check('rule 4 sight break (own 4 spots, 95-145 m, an unkillable 25 dps shooter): >= 20 m from the last-seen point and >= 9 s unseen inside the break', done === 4 && ok === 4,
    `${ok}/${done} (fix off ${okOff}/${done}; 1400 hp shooter ${okReal}/${done}) || ` + out.join(' || '))
}
if (want('rule3')) {
  const out = []
  let n = 0, pass = true
  for (let sd = +(process.env.R3FROM || 3001); sd < +(process.env.R3TO || 3600) && n < 3; sd++) {
    const sp = spot(sd, +(process.env.R3LO || 135), +(process.env.R3HI || 175))
    if (!sp) continue
    const L = Math.hypot(sp.ex - sp.x, sp.ey - sp.y), ux = (sp.ex - sp.x) / L, uy = (sp.ey - sp.y) / L
    let bx = NaN, by = NaN
    for (const sg of [1, -1]) {
      const qx = sp.ex - sg * uy * 70 + ux * +(process.env.R3BEYOND ?? 15), qy = sp.ey + sg * ux * 70 + uy * +(process.env.R3BEYOND ?? 15)
      if (nav.passableAt(qx, qy) && world.canSee(sp.x, sp.y, nav.levelAt(sp.x, sp.y) + 8, qx, qy, nav.levelAt(qx, qy) + 6) && Math.hypot(qx - sp.x, qy - sp.y) < 190) { bx = qx; by = qy; break }
    }
    if (!(bx === bx)) continue
    // pre-filter: a passable point 2-6 m from us hidden from A and B (centre, 0.9 h and top), so the hide search can find cover within 6 m
    const hid = (px, py) => { const pz = nav.levelAt(px, py); for (const [qx, qy] of [[sp.ex, sp.ey], [bx, by]]) { const qz = nav.levelAt(qx, qy); if (world.shotClear(qx, qy, qz + 7, px, py, pz + 4.5) || world.shotClear(qx, qy, qz + 7, px, py, pz + 8.1) || world.canSee(qx, qy, qz + 8, px, py, pz + 9)) return false } return true }
    let cover = false
    for (let r = 2; r <= 6 && !cover; r += 1) for (let k = 0; k < 24 && !cover; k++) { const px = sp.x + r * Math.cos(k * Math.PI / 12), py = sp.y + r * Math.sin(k * Math.PI / 12); if (nav.passableAt(px, py) && hid(px, py)) cover = true }
    if (!cover && !process.env.R3NOPRE) continue
    const run = (over, hpA, withB) => {
      const en = [{ id: 91, x: sp.ex, y: sp.ey, hp: hpA, maxHp: 1400, script: (e) => { e.yaw = Math.atan2(by - e.y, bx - e.x); e.vx = 0; e.vy = 0 } }]
      if (withB) en.push({ id: 92, x: bx, y: by, hp: 1400, script: (e) => { e.yaw = Math.atan2(sp.ey - e.y, sp.ex - e.x); e.vx = 0; e.vy = 0 } })
      const ar = new ArenaReq({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(uy, ux), pinned: true }, enemies: en, zone: bigZone(sp.x, sp.y) })
      ar.t = 100
      const br = createBrain(hello, ctxMap, { env: 'ffa', ...over })
      let tgtAt = -1, firstShot = -1, hideNear = 0
      drive(ar, br, 8, (a, o, act, b) => { const B = b._B; if (process.env.DBG3 === '2' && Math.round(a.t * 10) % 10 === 0) console.log('h', a.t.toFixed(1), B.hide.state, (+B.hide.dist).toFixed(1), B.mode, B.target ? B.target.id : '-', B.stance, 'busy', (B.tracks.get(91) || {}).busyWith, 'open', B.ffaOpen); if (B.hide.state === 'found' && B.hide.dist <= 6) hideNear++; if (tgtAt < 0 && B.target && B.target.id === 91) tgtAt = +(a.t - 100).toFixed(1); if (firstShot < 0 && act.fire && act.fire[0]) firstShot = +(a.t - 100).toFixed(1) }, mid)
      return { tgtAt, firstShot, hideNear, hits: ar.stats.hits }
    }
    const busy = run({}, 630, true)
    if (process.env.DBG3) console.log('dbg3', sd, JSON.stringify(busy))
    if (busy.hideNear < 40) continue
    n++
    const busyOff = run({ select: { ffaThirdFix: 'off' } }, 630, true), alone = run({}, 630, false), busy60 = run({}, 840, true), lone38 = run({}, 532, false)
    const ok = busy.tgtAt >= 1.5 && busy.firstShot >= 1.5 && busy.firstShot <= 5 && alone.firstShot < 0 && busy60.firstShot < 0 && lone38.firstShot >= 0 && lone38.firstShot <= 2
    pass = pass && ok
    out.push(`spot ${sd}: busy 45% ${JSON.stringify(busy)} | fix off ${JSON.stringify(busyOff)} | alone 45% ${JSON.stringify(alone)} | busy 60% ${JSON.stringify(busy60)} | lone 38% ${JSON.stringify(lone38)}`)
  }
  check('rule 3 third party (own 3 spots, 135-175 m): a 45% mech busy with another is targeted and shot after >= 1.5 s; not alone or at 60%; a lone 38% mech (rule 8 finish) is shot within 2 s', n === 3 && pass, out.join(' || '))
}
const bad = res.filter((r) => !r.ok)
console.log(`\n${res.length - bad.length}/${res.length} scenario checks passed` + (bad.length ? '  FAILED: ' + bad.map((r) => r.name.slice(0, 60)).join(' | ') : ''))
