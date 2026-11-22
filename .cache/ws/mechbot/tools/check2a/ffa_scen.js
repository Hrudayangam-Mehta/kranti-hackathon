// check2a: independent FFA scenarios (built by the checker, not the engineer's tests). Micro-arena, env forced.
//   bun ffa_scen.js [--only=name]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(P + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const ctxMap = { world, nav, log: () => {} }, ctxNone = { world: null, nav: null, log: () => {} }
const ON = { env: 'ffa', warmup: false }, OFF = { env: 'ffa', warmup: false, select: { ffaRules: 'off' } }
const OFF2 = { env: 'ffa', warmup: false, select: { ffaRules: 'off', ffaCounters: 'off' } }, SQ = { warmup: false, select: { env: 'squad' } }
const res = []
const check = (name, ok, detail) => { res.push({ name, ok: !!ok }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail) }
const want = (n) => !ONLY || n.includes(ONLY)
const fx = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
function drive(ar, br, secs, hook, pre) {
  for (let k = 0; k < Math.round(secs * 10); k++) {
    const o = ar.obs()
    if (pre) pre(ar, o, br)
    const a = br.act(o, performance.now() + 27.5)
    if (hook) hook(ar, o, a, br)
    ar.step(a)
  }
}
const bigZone = (x, y) => ({ center: [x, y], radius: 3000, next_center: [x, y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })

// ---------------------------------------------------------------- rule 6: sub-second reverser / steady waiver cap
if (want('rule6')) {
  // a finish-weak (35%) strafer north-south at 9 m/s, reversing every gap s, us pinned with the gun; t = 100 (ffaOpen)
  const run = (over, d, gap) => {
    const ar = new Arena({ cfg, seed: 61, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [{ id: 12, x: d, y: 0, hp: 500, maxHp: 1400,
      script: (e, t) => { face(e, { me: { x: 0, y: 0 } }); e.yaw += 1.2; const s = gap > 0 ? (Math.floor(t / gap) % 2 ? 1 : -1) : 1; e.vy = 9 * s; e.vx = 0; e.y += e.vy * 0.05; if (gap <= 0) { e.vx = 0 } } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let fire = 0, n = 0
    drive(ar, br, 10, (a, o, act) => { if (a.t > 102) { n++; if (act.fire[0]) fire++ } })
    return fire
  }
  const r = { onRev05: run(ON, 130, 0.5), offRev05: run(OFF, 130, 0.5), sqRev05: run(SQ, 130, 0.5), onRev17: run(ON, 130, 1.7) }
  check('rule 6: gun silent at a 0.5 s reverser at 130 m (0.52 s flight) with rules on; fires with rules off / SQUAD; fires at a 1.7 s reverser', r.onRev05 === 0 && r.offRev05 > 5 && r.sqRev05 > 5 && r.onRev17 > 5, JSON.stringify(r))
  // steady walker (constant 9 m/s north, no reversal); bullets at 200 m/s (obs weapon stats) so 0.8 s of flight is inside vision
  const cfg200 = JSON.parse(JSON.stringify(cfg)); cfg200.weapons.gun.speed = 200
  const runS = (over, d) => {
    const ar = new Arena({ cfg: cfg200, seed: 62, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [{ id: 12, x: d, y: -50, hp: 500, maxHp: 1400,
      script: (e) => { e.yaw = Math.PI / 2; e.vx = 0; e.vy = 9; e.y += 9 * 0.05 } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let fire = 0, fl = []
    drive(ar, br, 11, (a, o, act) => { if (a.t > 102) { if (act.fire[0]) fire++ } })
    return fire
  }
  const s = { on140: runS(ON, 140), on175: runS(ON, 175), off175: runS(OFF, 175), sq175: runS(SQ, 175) }
  check('rule 6: steady waiver capped at 0.8 s flight (200 m/s bullets): fires at a steady walker at 140 m (~0.7 s), not at 175 m (~0.88 s); rules off / SQUAD fire at 175 m', s.on140 > 5 && s.on175 === 0 && s.off175 > 5, JSON.stringify(s) + ' (SQUAD has no candidate at 175 m: band rule, not rule 6)')
}

// ---------------------------------------------------------------- rule 7 / D11: final-point hp race from 390 s
if (want('rule7')) {
  const run = (over, t0) => {
    // final shrink under way: circle centre moving from (0,0) toward next_center (14, 6), radius 40 -> 0
    const zone = { center: [0, 0], radius: 40, next_center: [14, 6], next_radius: 0, shrink_start: t0 - 5, shrink_end: t0 + 25, dps: 20 }
    const ar = new Arena({ cfg, seed: 71, me: { x: -10, y: -8, yaw: 0 }, enemies: [], zone })
    ar.t = t0
    // the arena keeps the circle fixed; interpolate it ourselves each step like the game does
    const br = createBrain(hello, ctxNone, over)
    const d = []
    drive(ar, br, 12, (a) => { const u = Math.min(1, Math.max(0, (a.t - zone.shrink_start) / (zone.shrink_end - zone.shrink_start))); a.zc.x = 14 * u; a.zc.y = 6 * u; a.zc.r = 40 * (1 - u); if (a.t > t0 + 6) d.push(Math.hypot(a.me.x - 14, a.me.y - 6)) },
      (a, o) => { o.zone.center = [a.zc.x, a.zc.y]; o.zone.radius = a.zc.r })
    return { mean: d.reduce((p, q) => p + q, 0) / d.length, max: Math.max(...d), outside: ar.stats.outsideTicks }
  }
  const on = run(ON, 392), off = run(OFF, 392), sq = run(SQ, 392), early = run(ON, 375), earlyOff = run(OFF, 375)
  check('rule 7: from 390 s (final circle, nr 0) FFA stands on next_center (<= 2 m) while rules-off / SQUAD track the moving centre; before 390 s identical to rules off',
    on.max <= 2 && off.mean > on.mean + 1 && sq.mean > on.mean + 1 && Math.abs(early.mean - earlyOff.mean) < 1e-9 && on.outside === 0,
    `on ${JSON.stringify(on)} | off ${JSON.stringify(off)} | squad ${JSON.stringify(sq)} | 375 s on ${fx(early.mean)} vs off ${fx(earlyOff.mean)}`)
}

// ---------------------------------------------------------------- K2: aim dwell (FFA only)
if (want('k2')) {
  // a mech 120 m away whose torso points at us for n consecutive decisions (2 ticks each), otherwise 1 rad away
  const run = (over, n) => {
    const ar = new Arena({ cfg, seed: 81, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [{ id: 14, x: 120, y: 0, hp: 1400, script: (e, t) => { face(e, { me: { x: 0, y: 0 } }); const k = Math.floor((t - 100) * 10); if (!(k >= 20 && k < 20 + n)) e.yaw += 1.0 } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let hostile = false
    drive(ar, br, 4, (a, o, act, b) => { const tr = b._B.tracks.get(14); if (tr && tr.hostile) hostile = true })
    return hostile
  }
  const r = { on1: run(ON, 1), on2: run(ON, 2), on3: run(ON, 3), off1: run(OFF, 1), sq1: run(SQ, 1), dwellSq1: run({ ...SQ, select: { env: 'squad', aimDwell: 'on' } }, 1) }
  check('K2: in FFA 1-2 aim decisions are not hostility, 3 are; rules-off FFA and SQUAD hostile at once; preset aimDwell=on applies it in SQUAD', !r.on1 && !r.on2 && r.on3 && r.off1 && r.sq1 && !r.dwellSq1, JSON.stringify(r))
}

// ---------------------------------------------------------------- rule 8: courtesy torso, no loot near a calm mech, finish allowed
if (want('rule8')) {
  const run = (over, hp) => {
    const ar = new Arena({ cfg, seed: 91, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 15, x: 100, y: 30, hp, maxHp: 1400, script: (e) => { e.yaw = 0.3; e.vx = 0; e.vy = 0 } }],
      cubes: [{ id: 7001, pos: [70, 10, 0] }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let trackOff = [], fired = 0
    drive(ar, br, 15, (a, o, act, b) => { const B = b._B; if (B.aimKind === 'track' && B.nearestMech && B.nearestMech.id === 15) trackOff.push(Math.abs(wrap(act.aim[0] - Math.atan2(30 - a.me.y, 100 - a.me.x)))); if (act.fire[0]) fired++ })
    return { cube: ar.stats.cubesTaken || 0, fired, trackOffMin: trackOff.length ? Math.min(...trackOff) : -1, nTrack: trackOff.length }
  }
  const R8 = { env: 'ffa', warmup: false, select: { ffaCounters: 'off' } }
  const on = run(ON, 1400), r8 = run(R8, 1400), off = run(OFF2, 1400), fin = run(R8, 450)
  check('rule 8 (counters off to isolate it): calm mech facing away 104 m off: cube 32 m from it not taken, no first shot, torso track >= 0.3 rad off; rules off takes the cube with an on-target track; a 32% mech is shot',
    r8.cube === 0 && r8.fired === 0 && r8.nTrack > 0 && r8.trackOffMin >= 0.29 && on.cube === 0 && on.fired === 0 && off.cube > 0 && off.trackOffMin < 0.05 && fin.fired > 0, `rule8 ${JSON.stringify(r8)} | full ${JSON.stringify(on)} | off ${JSON.stringify(off)} | 32% ${JSON.stringify(fin)}`)
}

// ---------------------------------------------------------------- rule 2: laser charged 0.4 rad off the target, swung on at release
if (want('rule2')) {
  const run = (over) => {
    const ar = new Arena({ cfg, seed: 21, me: { x: 0, y: 0, yaw: 0, pinned: true, weapons: ['gun', 'laser'] }, enemies: [{ id: 16, x: 140, y: 40, hp: 450, maxHp: 1400, script: (e) => { e.yaw = 0.2; e.vx = 0; e.vy = 0 } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    const offs = [], rel = []
    let gunWhileOff = 0
    drive(ar, br, 10, (a, o, act, b) => {
      const lz = o.self.weapons[1], brg = Math.atan2(40 - a.me.y, 140 - a.me.x)
      const off = Math.abs(wrap(act.aim[0] - brg))
      if (lz && lz.charge > 0 && act.fire[1]) { offs.push(off); if (act.fire[0] && off > 0.2) gunWhileOff++ }
      if (lz && lz.charge > 0 && !act.fire[1]) rel.push(Math.abs(wrap(a.me.yaw - brg)))
    })
    offs.sort((p, q) => p - q)
    return { n: offs.length, med: offs.length ? +offs[offs.length >> 1].toFixed(3) : -1, beams: ar.stats.beams, hits: ar.stats.beamHits, gunWhileOff, relYawMax: rel.length ? +Math.max(...rel).toFixed(3) : -1 }
  }
  const on = run(ON), off = run(OFF), sq = run(SQ)
  check('rule 2: our laser charges with the torso ~0.4 rad off a 32% mech at 145 m, gun silent while off, swings on so beams still hit; rules off charges on target',
    on.n > 3 && Math.abs(on.med - 0.4) < 0.06 && on.gunWhileOff === 0 && on.hits >= 1 && on.hits === on.beams && off.med < 0.05 && off.hits >= 1, `on ${JSON.stringify(on)} | off ${JSON.stringify(off)} | squad ${JSON.stringify(sq)}`)
}

// ---------------------------------------------------------------- rule 5: lightning carrier keep-away
if (want('rule5')) {
  const run = (over, myW, theirHp) => {
    // a calm lightning carrier (torso 0.6 rad off us, never shoots) walks at us at 9 m/s from 110 m; we are free to move
    const ar = new Arena({ cfg, seed: 51, me: { x: 0, y: 0, yaw: 0, weapons: myW }, enemies: [{ id: 17, x: 110, y: 0, hp: theirHp, maxHp: 1400, weapons: ['gun', 'lightning'],
      script: (e, t, A) => { const dx = A.me.x - e.x, dy = A.me.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = 9 * dx / d; e.vy = 9 * dy / d; e.x += e.vx * 0.05; e.y += e.vy * 0.05; e.yaw = Math.atan2(dy, dx) + 0.6 } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let dmin = 1e9, legs = {}
    drive(ar, br, 14, (a, o, act, b) => { const e = a.enemies[0]; const d = Math.hypot(e.x - a.me.x, e.y - a.me.y); if (a.t > 103) dmin = Math.min(dmin, d); legs[b._B.legKind] = (legs[b._B.legKind] || 0) + 1 })
    return { dmin: +dmin.toFixed(1), lightkeep: legs.lightkeep || 0 }
  }
  const on = run(ON, ['gun', null], 1400), off = run(OFF, ['gun', null], 1400), mine = run(ON, ['gun', 'lightning'], 1300)
  check('rule 5: a calm lightning carrier walking in at 9 m/s is kept beyond ~50 m (lightkeep legs); rules off lets it close; not when we hold lightning and >= its hp',
    on.dmin >= 47 && on.lightkeep > 10 && off.dmin < 30 && mine.lightkeep === 0, `on ${JSON.stringify(on)} | off ${JSON.stringify(off)} | we hold lightning 1400 vs 1300 ${JSON.stringify(mine)}`)
}

// ---------------------------------------------------------------- D11 boost rarely (zone travel still boosts)
if (want('boost')) {
  const zoneRun = (over) => {
    const zone = { center: [400, 0], radius: 120, next_center: [400, 0], next_radius: 80, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
    const ar = new Arena({ cfg, seed: 31, me: { x: 0, y: 0, yaw: 0 }, enemies: [], zone })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let boost = 0, zoneDec = 0
    drive(ar, br, 8, (a, o, act, b) => { if (b._B.mode === 'ZONE') zoneDec++; if (act.boost) boost++ })
    return { boost, zoneDec }
  }
  const rushRun = (over) => {
    // gun + lightning, a calm 32% mech 80 m away: D2 rush (boost in from < 90 m at energy > 70)
    const ar = new Arena({ cfg, seed: 32, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'lightning'] }, enemies: [{ id: 18, x: 80, y: 0, hp: 450, maxHp: 1400, script: (e) => { e.yaw = 0.5; e.vx = 0; e.vy = 0 } }] })
    ar.t = 100
    const br = createBrain(hello, ctxNone, over)
    let boost = 0
    drive(ar, br, 6, (a, o, act) => { if (act.boost) boost++ })
    return { boost }
  }
  const zOn = zoneRun(ON), zOff = zoneRun(OFF), rOn = rushRun(ON), rOff = rushRun(OFF)
  check('D11 boost rarely: FFA still boosts for the zone (ZONE mode), but not on the lightning rush-in at a 32% mech 80 m away (rules off boosts in)',
    zOn.boost > 3 && zOn.zoneDec > 10 && rOn.boost === 0 && rOff.boost > 0, `zone on ${JSON.stringify(zOn)} off ${JSON.stringify(zOff)} | rush on ${JSON.stringify(rOn)} off ${JSON.stringify(rOff)}`)
}

// ---------------------------------------------------------------- map spots with cover: rules 1, 3, 4, 9
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
const mid = (a, o) => { o.alive = 12 }          // mid-game FFA (12 alive): not the last-four OFFENSIVE posture
const shooterAt = (dps) => (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? dps : 0 }

if (want('rule4')) {
  // a healthy gun mech starts shooting us at 110-150 m (hostile, not a finish); we have the gun, cover within ~6 m
  let done = 0, okN = 0, sightN = 0
  const out = []
  for (let sd = 401; sd < 460 && done < 3; sd++) {
    const sp = spot(sd, 110, 150)
    if (!sp) continue
    const mk = (over) => {
      const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, enemies: [{ id: 19, x: sp.ex, y: sp.ey, hp: 1400, script: shooterAt(25) }], zone: bigZone(sp.x, sp.y) })
      ar.t = 100
      const br = createBrain(hello, ctxMap, over)
      let breakDec = 0, firstBreakT = -1, endT = -1, seenX = sp.x, seenY = sp.y, maxRel = 0, unseen = 0, maxUnseen = 0, firedInBreak = 0, fightDec = 0, maxRelUnseen = 0, maxUnseenInBreak = 0
      drive(ar, br, 30, (a, o, act, b) => {
        const B = b._B
        if (B.ffaBreak) { breakDec++; if (firstBreakT < 0) firstBreakT = a.t; if (act.fire[0]) firedInBreak++ }
        else if (firstBreakT > 0 && endT < 0) endT = a.t
        if (B.mode === 'FIGHT') fightDec++
        const vis = a.t - B.lastLosInT <= 0.2
        if (vis) { seenX = a.me.x; seenY = a.me.y; unseen = 0 } else { unseen += 0.1; maxUnseen = Math.max(maxUnseen, unseen) }
        if (B.ffaBreak) { maxRel = Math.max(maxRel, Math.hypot(a.me.x - seenX, a.me.y - seenY)); if (!vis) { maxRelUnseen = Math.max(maxRelUnseen, Math.hypot(a.me.x - seenX, a.me.y - seenY)); maxUnseenInBreak = Math.max(maxUnseenInBreak, unseen) } }
      }, mid)
      return { breakDec, firstBreakT: +firstBreakT.toFixed(1), endT: +endT.toFixed(1), maxRelUnseen: +maxRelUnseen.toFixed(1), maxUnseenInBreak: +maxUnseenInBreak.toFixed(1), firedInBreak, fightDec, dmgTaken: Math.round(ar.stats.dmgTaken) }
    }
    const on = mk(ON), off = mk(OFF)
    if (on.firstBreakT < 0 && off.fightDec === 0) continue
    done++
    if (on.firstBreakT > 0 && on.firedInBreak > 0 && off.breakDec === 0 && off.fightDec > on.fightDec) okN++
    if (on.maxRelUnseen >= 20 && on.maxUnseenInBreak >= 9) sightN++
    out.push(`seed ${sd}: on ${JSON.stringify(on)} off ${JSON.stringify(off)}`)
  }
  check('rule 4 trigger: shot by a healthy mech -> break (DISENGAGE) while answering fire; rules off stays in FIGHT (3 spots)', done === 3 && okN === 3, out.join(' || '))
  check('rule 4 sight break: inside the break we get >= 20 m from the last-seen point and >= 9 s out of its sight (3 spots)', done === 3 && sightN === 3, `spots meeting it: ${sightN}/${done} (see the line above; also tools/check2a/rule4_sim.js in the dev simulator)`)
}

if (want('rule9')) {
  // wounded in a calm mech's view: < 50% within 200 m, < 65% within 115 m -> break; healthy -> no break
  const out = []
  let pass = true, done = 0
  for (let sd = 501; sd < 600 && done < 2; sd++) {
    const sp = spot(sd, 90, 105)
    if (!sp) continue
    const spF = spot(sd + 1000, 140, 180)
    if (!spF) continue
    const run = (over, hpf, far) => {
      const q = far ? spF : sp, ex = q.ex, ey = q.ey
      sp.x0 = q.x; sp.y0 = q.y
      const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: q.x, y: q.y, yaw: Math.atan2(ey - q.y, ex - q.x), hp: 1400 * hpf }, enemies: [{ id: 20, x: ex, y: ey, hp: 1400, script: (e, t, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) + 1.2; e.vx = 0; e.vy = 0 } }], zone: bigZone(sp.x, sp.y) })
      ar.t = 100
      const br = createBrain(hello, ctxMap, over)
      let brk = 0, losIn = 0
      drive(ar, br, 6, (a, o, act, b) => { if (b._B.ffaBreak) brk++; const tr = b._B.tracks.get(20); if (tr && tr.losIn) losIn++ }, mid)
      return { brk, losIn }
    }
    const a45 = run(ON, 0.45, false), a60 = run(ON, 0.60, false), a60far = run(ON, 0.60, true), a80 = run(ON, 0.80, false), off45 = run(OFF, 0.45, false)
    if (a45.losIn === 0 || a60far.losIn === 0 || a80.losIn === 0) continue
    done++
    const ok = a45.brk > 0 && a60.brk > 0 && a60far.brk === 0 && a80.brk === 0 && off45.brk === 0
    pass = pass && ok
    out.push(`seed ${sd} (${fx(Math.hypot(sp.ex - sp.x, sp.ey - sp.y), 0)} m): 45% ${JSON.stringify(a45)} 60% ${JSON.stringify(a60)} 60%@${fx(Math.hypot(spF.ex - spF.x, spF.ey - spF.y), 0)} m ${JSON.stringify(a60far)} 80% ${JSON.stringify(a80)} off45 ${JSON.stringify(off45)}`)
  }
  check('rules 9 / 8d: break at 45% (calm mech ~100 m with a line) and at 60% inside 115 m, not at 60% at 140-180 m nor at 80%; rules off never', done === 2 && pass, out.join(' || '))
}


// ---------------------------------------------------------------- rule 1: hide budget from the measured charge time / cube bounds
if (want('rule1')) {
  // a hostile laser holder 120-140 m away charges at us for C s every 3 s; the micro-arena has no beams, so the beam is
  // injected into the observation in the decision after the charge flag drops (as the game reports it)
  const C1 = 0.6
  const run = (cubes, unknown) => {
    let sp = null
    for (let sd = 601; sd < 700 && !sp; sd++) sp = spot(sd, 120, 140)
    const ar = new Arena({ cfg, world, nav, seed: 601, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, enemies: [{ id: 21, x: sp.ex, y: sp.ey, hp: 1400, weapons: ['gun', 'laser'],
      script: (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; const ph = (t - 100.25) % 3; e.charging = ph >= 0 && ph < C1 } }], zone: bigZone(sp.x, sp.y) })
    ar.enemies[0].cubes = cubes
    ar.t = 100
    const br = createBrain(hello, ctxMap, ON)
    let wasCh = false, before = null, after = null, nCharge = 0, agree = 0, disagree = 0, formulaBad = 0
    drive(ar, br, 8, (a, o, act, b) => {
      const B = b._B, tr = B.tracks.get(21)
      if (!tr) return
      if (before === null && tr.lastBeamT < 0 && tr.chargeAtMeT === B.me.t) before = B.ffa.chargeTime(tr)
      if (tr.lastBeamT > 0) after = { meas: +tr.chargeMeas.toFixed(3), ct: +B.ffa.chargeTime(tr).toFixed(3) }
      if (tr.chargeAtMeT === B.me.t && B.hide.state === 'found') {
        nCharge++
        const me = B.me, canBoost = me.energy >= B.P.boostReserve && me.grounded
        const ownCh = !!(me.laser && me.laser.charge > 0)
        const v = ownCh ? me.walk * me.chargeMoveMult : canBoost ? me.boostSpeed : me.walk
        const left = tr.chargeT0 + B.ffa.chargeTime(tr) - 0.1 - me.t
        const exp = left <= 0 ? 0 : left * v + 1, got = B.ffa.hideReach(canBoost)
        if (Math.abs(exp - got) > 1e-9) formulaBad++
        if ((B.legKind === 'beamhide') === (B.hide.dist <= got)) agree++; else disagree++
      }
    }, (a, o) => {
      o.alive = 12
      const m = o.mechs.find((q) => q.id === 21)
      if (m && unknown) delete m.cubes
      if (m) { if (wasCh && !m.charging) o.beams = [{ by: 21, kind: 'laser', path: [m.pos.map((v, i) => v + (i === 2 ? 7 : 0)), [a.me.x, a.me.y, a.me.z + 4]], age: 0.05 }]; wasCh = !!m.charging }
    })
    return { before: before === null ? null : +before.toFixed(4), after, nCharge, agree, disagree, formulaBad }
  }
  const c0 = run(0, false), c1 = run(1, false), c3 = run(3, false), cu = run(0, true)
  const ok = c0.before === 0.75 && c1.before === 0.5625 && c3.before === 0.4219 && cu.before === 0.4219 && c0.after && Math.abs(c0.after.meas - C1) <= 0.1 && c0.after.ct === c0.after.meas &&
    [c0, c1, c3, cu].every((r) => r.formulaBad === 0 && r.disagree === 0 && r.nCharge > 0)
  check('rule 1: hide budget: before any beam 0.75 / 0.56 / 0.42 s for 0 / 1 / 3 cubes (unknown 0.42); after a beam the measured charge (scripted 0.6 s) is used; reach = (charge - 0.1 s left) x speed + 1; beamhide iff the cell is within reach',
    ok, `0 cubes ${JSON.stringify(c0)} | 1 ${JSON.stringify(c1)} | 3 ${JSON.stringify(c3)} | unknown ${JSON.stringify(cu)}`)
}

// ---------------------------------------------------------------- rule 1 beam clock: peekOpen state cases (white box, our own cases)
if (want('peek')) {
  const ar = new Arena({ cfg, seed: 11, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 22, x: 150, y: 0, hp: 1400, weapons: ['gun', 'laser'], script: (e) => { e.yaw = Math.PI } }] })
  ar.t = 100
  const br = createBrain(hello, ctxNone, ON)
  drive(ar, br, 1.5)
  const B = br._B, tr = B.tracks.get(22), t = B.me.t
  const base = { hasLaser: true, charging: false, flagDropT: -99, flagSeenT: -99, losInT: t - 1, peekT0: -99 }
  const cs = [
    ['beam 1.2 s ago -> open', { flagDropT: t - 1.2 }, true], ['beam 2.0 s ago, line lost 1 s ago -> closed', { flagDropT: t - 2.0 }, false],
    ['charging now (beam 3 s ago) -> closed', { charging: true, flagDropT: t - 3 }, false], ['charging but beam 1 s ago -> open', { charging: true, flagDropT: t - 1 }, true],
    ['line lost 4.4 s ago, no flag -> timer peek open', { losInT: t - 4.4 }, true], ['line lost 4.2 s ago -> closed', { losInT: t - 4.2 }, false],
    ['flag seen 3.0 s ago (after line) -> open', { flagSeenT: t - 3.0, losInT: t - 3.5 }, true], ['flag seen 2.7 s ago -> closed', { flagSeenT: t - 2.7, losInT: t - 3.5 }, false],
    ['timer due but hp 45% -> closed', { losInT: t - 5, hpf: 0.45 }, false], ['line lost 12.5 s ago -> open (cap)', { losInT: t - 12.5, hpf: 0.45 }, true],
    ['peek started 0.4 s ago -> open', { peekT0: t - 0.4 }, true], ['no laser -> open', { hasLaser: false }, true],
    ['timer due, our laser cooling 1 s -> closed', { losInT: t - 5, lzcd: 1.0 }, false],
  ]
  const bad = []
  const hpf0 = B.me.hpf, lz = B.me.laser, cd0 = lz ? lz.cooldown : 0, ch0 = lz ? lz.charge : 0
  for (const [name, st, want2] of cs) {
    Object.assign(tr, base, st); B.me.hpf = st.hpf ?? 1
    if (lz) { lz.cooldown = st.lzcd ?? 0; lz.charge = 0 }
    const got = B.ffa.peekOpen(tr)
    if (got !== want2) bad.push(`${name}: got ${got}`)
  }
  B.me.hpf = hpf0; if (lz) { lz.cooldown = cd0; lz.charge = ch0 }
  check('rule 1 beam clock: 13 peekOpen state cases (1.65 s after a beam, 2.9 s after a flag, 4.3 s after the line, 0.6 s peek, laser ready, hp > 50%, 12 s cap)', bad.length === 0 && !!lz, bad.length ? bad.join('; ') : 'all 13 as specified')
}

// ---------------------------------------------------------------- rule 3: third-party first shot at a busy wounded mech
if (want('rule3')) {
  const out = []
  let n = 0, pass = true
  for (let sd = 701; sd < 800 && n < 2; sd++) {
    const sp = spot(sd, 140, 160)
    if (!sp) continue
    const ux = (sp.ex - sp.x) / Math.hypot(sp.ex - sp.x, sp.ey - sp.y), uy = (sp.ey - sp.y) / Math.hypot(sp.ex - sp.x, sp.ey - sp.y)
    // B stands 70 m to one side of A (A's torso ~90 deg off us), passable and in our view
    let bx = NaN, by = NaN
    for (const sg of [1, -1]) {
      const qx = sp.ex - sg * uy * 70, qy = sp.ey + sg * ux * 70
      if (nav.passableAt(qx, qy) && world.canSee(sp.x, sp.y, nav.levelAt(sp.x, sp.y) + 8, qx, qy, nav.levelAt(qx, qy) + 6) && Math.hypot(qx - sp.x, qy - sp.y) < 190) { bx = qx; by = qy; break }
    }
    if (!(bx === bx)) continue
    const run = (over, hpA, withB, facing, walk) => {
      const en = [{ id: 23, x: sp.ex, y: sp.ey, hp: hpA, maxHp: 1400, script: (e, t, A) => { if (facing) face(e, A); else e.yaw = Math.atan2(by - e.y, bx - e.x); e.vx = 0; e.vy = 0; if (walk) { const sg = Math.floor(t / 2) % 2 ? 1 : -1; const nx = e.x - uy * 4 * sg * 0.05, ny = e.y + ux * 4 * sg * 0.05; if (nav.passableAt(nx, ny)) { e.vx = -uy * 4 * sg; e.vy = ux * 4 * sg; e.x = nx; e.y = ny } } } }]
      if (withB) en.push({ id: 24, x: bx, y: by, hp: 1400, script: (e) => { e.yaw = Math.atan2(sp.ey - e.y, sp.ex - e.x); e.vx = 0; e.vy = 0 } })
      const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(uy, ux), pinned: true }, enemies: en, zone: bigZone(sp.x, sp.y) })
      ar.t = 100
      const br = createBrain(hello, ctxMap, over)
      let firstShot = -1, hideNear = 0, dec = 0, tgtAt = -1, held = 0
      drive(ar, br, 8, (a, o, act, b) => { const B = b._B; dec++; if (process.env.DBG3 && dec % 5 === 0) console.log('dbg3', hpA, withB, (a.t - 100).toFixed(1), 'tgt', B.target ? B.target.id : -1, 'mode', B.mode, 'st', B.stance, 'holdFirst', B.holdFirst, 'holdFire', B.holdFire, 'aimK', B.aimKind, 'hide', B.hide.state, B.hide.dist.toFixed(1), 'busy', B.tracks.get(23) ? B.tracks.get(23).busyWith : 'x', 'L23', B.tracks.get(23) ? B.tracks.get(23).listed : 'x', 'L24', B.tracks.get(24) ? B.tracks.get(24).listed : 'x', 'open', B.ffaOpen, 'tme', B.me.t.toFixed(1), 'hp23', B.tracks.get(23) ? [B.tracks.get(23).hp, B.tracks.get(23).maxHp, B.tracks.get(23).aimAtMe, B.tracks.get(23).hostile, B.tracks.get(23).dist.toFixed(0)].join('/') : 'x', 'cx', B.cx && B.tracks.get(23) ? B.cx.adviceFor(23, B.cxCtx).reason : '', 'fire', act.fire[0]); if (B.hide.state === 'found' && B.hide.dist <= 6) hideNear++; if (B.target && B.target.id === 23) { if (tgtAt < 0) tgtAt = +(a.t - 100).toFixed(1); if (B.holdFirst) held++ } if (firstShot < 0 && act.fire[0] && B.target && B.target.id === 23) firstShot = +(a.t - 100).toFixed(1) }, (a, o) => { o.alive = 12 })
      return { tgtAt, firstShot, held, hideNear, dec }
    }
    const busy45 = run(ON, 630, true, false)
    if (busy45.hideNear < 40) continue
    n++
    const alone45 = run(ON, 630, false, false), busy60 = run(ON, 840, true, false), off45 = run(OFF, 630, false, false), fin38 = run(ON, 532, false, false), fin20 = run(ON, 280, false, false), fin38w = run(ON, 532, false, false, true), busy45w = run(ON, 630, true, false, true)
    const ok = busy45.firstShot >= 1.5 && alone45.firstShot < 0 && busy60.firstShot < 0 && busy45.tgtAt >= 1.5 && alone45.tgtAt < 0 && busy60.tgtAt < 0 && fin38.firstShot >= 0
    pass = pass && ok
    out.push(`spot ${sd}: busy 45% ${JSON.stringify(busy45)} | alone 45% ${JSON.stringify(alone45)} | busy 60% ${JSON.stringify(busy60)} | rules off alone 45% ${JSON.stringify(off45)} | lone 38% (finish, rule 8) ${JSON.stringify(fin38)} | lone 20% ${JSON.stringify(fin20)} | lone 38% walking (no hider read) ${JSON.stringify(fin38w)} | busy 45% walking ${JSON.stringify(busy45w)}`)
  }
  check('rule 3 / rule 8 first shot: a 45% mech busy with another (torso ~90 deg off us, ~155 m, cover within 6 m) is targeted only after >= 1.5 s busy and then shot; not targeted alone or at 60%; a lone 38% calm mech (finish) is shot', n === 2 && pass, out.join(' || '))
}

// ---------------------------------------------------------------- rule 10: a second line of fire while a (finish-weak) hostile is near
if (want('rule10')) {
  const out = []
  let n = 0, pass = true
  for (let sd = 801; sd < 900 && n < 2; sd++) {
    const sp = spot(sd, 100, 130), sp2 = spot(sd + 500, 90, 120)
    if (!sp || !sp2) continue
    const run = (second) => {
      // A: 35% hostile (aims at us, never fires) -> a finish, not a break trigger alone; C: healthy calm mech with a line
      const en = [{ id: 25, x: sp.ex, y: sp.ey, hp: 490, maxHp: 1400, script: (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0 } }]
      const cx = sp.x + (sp2.ex - sp2.x), cy = sp.y + (sp2.ey - sp2.y)
      if (second) en.push({ id: 26, x: cx, y: cy, hp: 1400, script: (e, t, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) + 1.0; e.vx = 0; e.vy = 0 } })
      const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: 0, pinned: true }, enemies: en, zone: bigZone(sp.x, sp.y) })
      ar.t = 100
      const br = createBrain(hello, ctxMap, ON)
      let brk = 0, nLos2 = 0
      drive(ar, br, 3, (a, o, act, b) => { if (b._B.ffaBreak) brk++; if (b._B.nLos >= 2) nLos2++ }, (a, o) => { o.alive = 12 })
      return { brk, nLos2 }
    }
    const one = run(false), two = run(true)
    if (two.nLos2 < 5) continue
    n++
    const ok = one.brk === 0 && two.brk > 0
    pass = pass && ok
    out.push(`spot ${sd}: hostile 35% alone ${JSON.stringify(one)} | + calm mech with a line ${JSON.stringify(two)}`)
  }
  check('rule 10: a 35% hostile alone is not a break trigger (finish); with a second mech holding a line on us it is', n === 2 && pass, out.join(' || '))
}

// ---------------------------------------------------------------- D11 hider counter: out-farm a quiet hider, pass it at 120 m
if (want('hider')) {
  // geometry on the real map: we read a motionless calm mech H from S1 (line, ~130 m), then stand at S2 (no line from H,
  // H still within 150 m and remembered); a drone 35-45 m from S2. Old D11 gate: no farming with a mech inside 150 m.
  const rnd = rng32(4242), Bd = world.bounds
  let G = null
  for (let k = 0; k < 400000 && !G; k++) {
    const x2 = Bd.minX + 120 + rnd() * (Bd.maxX - Bd.minX - 240), y2 = Bd.minY + 120 + rnd() * (Bd.maxY - Bd.minY - 240)
    if (!nav.passableAt(x2, y2) || nav.component(x2, y2) !== nav.mainComponent) continue
    const a = rnd() * 2 * Math.PI, d = 125 + rnd() * 15, hx = x2 + d * Math.cos(a), hy = y2 + d * Math.sin(a)
    if (!nav.passableAt(hx, hy) || nav.component(hx, hy) !== nav.mainComponent) continue
    const z2 = nav.levelAt(x2, y2), hz = nav.levelAt(hx, hy)
    if (world.shotClear(hx, hy, hz + 7, x2, y2, z2 + 8.1) || world.shotClear(hx, hy, hz + 7, x2, y2, z2 + 4.5) || world.canSee(x2, y2, z2 + 8, hx, hy, hz + 6)) continue
    let s1 = null
    for (let j = 0; j < 12 && !s1; j++) { const b = j * Math.PI / 6, x1 = x2 + 25 * Math.cos(b), y1 = y2 + 25 * Math.sin(b); if (nav.passableAt(x1, y1) && world.canSee(x1, y1, nav.levelAt(x1, y1) + 8, hx, hy, hz + 6) && world.shotClear(hx, hy, hz + 7, x1, y1, nav.levelAt(x1, y1) + 4.5)) s1 = { x1, y1 } }
    if (!s1) continue
    let dr = null
    for (let j = 0; j < 12 && !dr; j++) { const b = j * Math.PI / 6, dx = x2 + 40 * Math.cos(b), dy = y2 + 40 * Math.sin(b); if (Math.hypot(dx - hx, dy - hy) > Math.hypot(x2 - hx, y2 - hy) && nav.passableAt(dx, dy) && world.shotClear(x2, y2, z2 + 7, dx, dy, nav.levelAt(dx, dy) + 2) && !world.shotClear(hx, hy, hz + 7, dx, dy, nav.levelAt(dx, dy) + 2)) dr = { dx, dy } }
    if (!dr) continue
    G = { x2, y2, hx, hy, ...s1, ...dr }
  }
  const run = (over) => {
    const ar = new Arena({ cfg, world, nav, seed: 41, me: { x: G.x1, y: G.y1, yaw: Math.atan2(G.hy - G.y1, G.hx - G.x1), pinned: true }, enemies: [{ id: 27, x: G.hx, y: G.hy, hp: 1400, script: (e, t, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) + 1.5; e.vx = 0; e.vy = 0 } }], zone: bigZone(G.x2, G.y2) })
    ar.t = 100
    const br = createBrain(hello, ctxMap, over)
    let read = null
    drive(ar, br, 6, (a, o, act, b) => { const r = b._B.cx && b._B.cx.archetypeOf(27); if (r && r.archetype === 'HIDER' && r.confidence >= 0.5 && read === null) read = +(a.t - 100).toFixed(1) }, (a, o) => { o.alive = 12 })
    ar.me.x = G.x2; ar.me.y = G.y2; ar.me.z = nav.levelAt(G.x2, G.y2); ar.me.pinned = true
    ar.enemies.push({ id: 120, kind: 'npc', x: G.dx, y: G.dy, z: nav.levelAt(G.dx, G.dy), vx: 0, vy: 0, yaw: 0, pitch: 0, hp: 350, maxHp: 350, weapons: [], script: (e) => { e.vx = 0; e.vy = 0 }, dps: 0, hitAcc: 0, radius: 1.8, height: 3.5, lastSeen: -99, charging: false, alive: true, cubes: 0 })
    let droneShots = 0, hiderRemembered = 0, farmAt = null, confAtFarm = null
    drive(ar, br, 14, (a, o, act, b) => { const B = b._B, tr = B.tracks.get(27); if (tr && tr.conf > 0.3 && tr.dist < 150) hiderRemembered++; if (act.fire[0] && B.target && B.target.id === 120) droneShots++; if (farmAt === null && B.farmNpc === 120) { farmAt = +(a.t - 106).toFixed(1); confAtFarm = tr ? +tr.conf.toFixed(2) : null } if (process.env.DBGH && Math.round((a.t - 100) * 10) % 10 === 0) { const dt = B.tracks.get(120); console.log('dbgh', (a.t - 100).toFixed(1), 'mode', B.mode, 'leg', B.legKind, 'loot', B.loot ? B.loot.type + ':' + B.loot.id : '', 'farmNpc', B.farmNpc, 'tgt', B.target ? B.target.id : -1, 'A', B.A.toFixed(1), 'nLos', B.nLos, 'contact', (a.t - B.lastContactT).toFixed(1), 'hider', tr ? [tr.dist.toFixed(0), tr.conf.toFixed(2), tr.listed, tr.losIn, tr.hostile, B.ffa.isHider(tr)].join('/') : 'x', 'drone', dt ? [dt.dist.toFixed(0), dt.listed, dt.conf.toFixed(2)].join('/') : 'x', 'hpf', B.me.hpf.toFixed(2), 'mvd', Math.hypot(a.me.x - G.x2, a.me.y - G.y2).toFixed(0)) } }, (a, o) => { o.alive = 12 })
    return { readAt: read, hiderRemembered, farmAt, hiderConfAtFarm: confAtFarm }
  }
  const on = run(ON), off = run(OFF)
  check('D11 hider counter: a calm motionless mech read as HIDER from 130 m; out of its line but remembered inside 150 m, we start farming a drone 40 m away while it is still remembered (rules off: only once its track decays below conf 0.3)',
    !!G && on.readAt !== null && on.farmAt !== null && on.hiderConfAtFarm >= 0.5 && (off.farmAt === null || off.hiderConfAtFarm < 0.3), `farmAt = s after we left its line (pinned at S2) | geometry ${G ? 'found' : 'none'} | on ${JSON.stringify(on)} | off ${JSON.stringify(off)}`)
}

// ---------------------------------------------------------------- counter-module corrections (M3, M4/K3, M5) on synthetic feeds
if (want('module')) {
  const { createCounters } = await import(P + '/bot/lib/counters.js')
  const feed = (mk, secs, alive) => {
    const cx = createCounters(hello)
    for (let k = 0; k <= secs * 10; k++) {
      const t = 100 + k * 0.1
      cx.update({ type: 'obs', t, tick: k * 2, alive, self: { id: 3, pos: [0, 0, 0], hp: 1400, max_hp: 1400, energy: 100, weapons: [{ kind: 'gun' }, { kind: 'laser' }] }, mechs: [mk(t, k)], crates: [], events: [] }, t)
    }
    return cx
  }
  const ctx = (alive) => ({ env: 'FFA', bandLo: 125, bandHi: 185, myLaser: true, myLightning: false, myGun: true, myHpf: 1, myHp: 1400, myEnergy: 100, alive })
  const hider = (hp) => (t) => ({ id: 30, kind: 'mech', pos: [140, 20, 0], vel: [0, 0, 0], aim: [0.3, 0], hp, max_hp: 1400, cubes: 2, weapons: ['gun'], charging: false })
  const a1 = feed(hider(1400), 20, 12).adviceFor(30, ctx(12)), a2 = feed(hider(546), 20, 12).adviceFor(30, ctx(12)), a3 = feed(hider(588), 20, 12).adviceFor(30, ctx(12))
  const a4 = feed(hider(1400), 20, 6).adviceFor(30, ctx(6))
  // a boost rusher: runs at us at boost speed from 160 m, resets every 6 s
  const rusher = (t) => { const ph = (t - 100) % 6, d = 160 - 19.5 * ph; return { id: 31, kind: 'mech', pos: [Math.max(20, d), 0, 0], vel: [-19.5, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false } }
  const cr = feed(rusher, 24, 12), br = cr.archetypeOf(31), a5 = cr.adviceFor(31, ctx(12))
  const ok = a1.engageLevel === 0 && a1.reason === 'HD/pass' && a2.reason === 'HD/finish' && a2.engageLevel === 3 && a2.lo < a1.lo && a3.reason !== 'HD/finish' && a4.reason === 'HD/strafer' &&
    (br.archetype !== 'BOOST_RUSHER' || (a5.engageLevel <= 2 && a5.reason === 'BR/hold'))
  check('counter corrections: healthy hider -> HD/pass (avoid); at 39% -> HD/finish (attack, lower band); at 42% not a finish (40% gate); 6 alive gun hider -> HD/strafer; a boost rusher is never above opportunistic',
    ok, `100% ${a1.reason}/L${a1.engageLevel} [${fx(a1.lo, 0)}-${fx(a1.hi, 0)}] | 39% ${a2.reason}/L${a2.engageLevel} [${fx(a2.lo, 0)}-${fx(a2.hi, 0)}] | 42% ${a3.reason}/L${a3.engageLevel} | 6 alive ${a4.reason}/L${a4.engageLevel} | rusher read ${br.archetype} ${fx(br.confidence)} -> ${a5.reason}/L${a5.engageLevel}`)
}

const failed = res.filter((r) => !r.ok)
console.log(`\n${res.length - failed.length}/${res.length} checker scenarios passed` + (failed.length ? '  FAILED: ' + failed.map((f) => f.name).join(' | ') : ''))
