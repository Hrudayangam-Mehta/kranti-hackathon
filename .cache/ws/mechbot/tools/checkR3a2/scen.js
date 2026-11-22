// checkR3a2: the checker's own scenarios for every item of notes/build_spec_r3a2.md (not the engineer's tests).
// Run: taskset -c 0 bun tools/checkR3a2/scen.js
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { resolveParams, PARAMS } = await import(P + '/bot/lib/params.js')
const T = await import(P + '/bot/lib/tactics.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, obs0 = lines.find((l) => l.type === 'obs')
const ctx = { world: null, nav: null, log: () => {} }
// my own statement of the 5.02 values of every changed preset (not imported from params.js)
const OLD = { laserRange: 'far', farmHp: '90', fightEarly: 'off', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'off', upg: 'std',
  ffaDropGate: 'off', finalPoint: 'off', ffaTwo: 'off', ffaThree: 'off', ffaGate: 'off' }
const mk = (kind, extra) => {
  const o = { ...(extra || {}) }
  if (kind === 'old') o.select = { ...OLD, ...(o.select || {}) }
  if (kind === 'ffa') { o.env = 'ffa'; o.warmup = false }
  if (kind === 'oldffa') { o.select = { ...OLD, ...(o.select || {}) }; o.env = 'ffa'; o.warmup = false }
  return createBrain(hello, ctx, o)
}
const res = []
const check = (name, ok, detail) => { res.push({ name, ok: !!ok }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail) }
const face = (e, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) }
const still = (e) => { e.vx = 0; e.vy = 0 }
function drive(ar, br, secs, hook, pre) {
  for (let k = 0; k < Math.round(secs * 10); k++) {
    const o = ar.obs(); if (pre) pre(ar, o)
    const a = br.act(o, performance.now() + 27.5)
    if (hook) hook(ar, o, a, br)
    ar.step(a)
  }
}
const aliveN = (n) => (ar, o) => { o.alive = n }
const fx = (v, n = 1) => (typeof v === 'number' ? v.toFixed(n) : String(v))

// =============================================================== P1 fightEarly
{
  const P1 = resolveParams({})
  const firstT = (kind, enemy, t0, secs, pre) => {
    const ar = new Arena({ cfg, seed: 901, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [enemy] })
    ar.t = t0
    const br = mk(kind)
    let first = -1, band = 0
    drive(ar, br, secs, (a, o, act, b) => { band = b._B.bandHi + b._B.P.candExtra; if (first < 0 && b._B.target && b._B.target.id === 10) first = +a.t.toFixed(2) }, pre || aliveN(14))
    return { first, band }
  }
  const E = (x, yaw, extra) => ({ id: 10, x, y: 0, hp: 1400, maxHp: 1400, script: (e, t, A, dt) => { still(e); e.yaw = yaw === 'face' ? Math.atan2(A.me.y - e.y, A.me.x - e.x) : yaw }, ...(extra || {}) })
  const aim185 = firstT('new', E(185, 'face'), 15, 8)
  const aim195 = firstT('new', E(195, 'face'), 15, 8)
  const off185 = firstT('new', E(185, Math.PI - 0.30), 15, 8)
  const on185 = firstT('new', E(185, Math.PI - 0.18), 15, 8)
  const low155 = firstT('new', E(155, Math.PI / 2, { hp: 0.38 * 1400 }), 15, 8)
  const low155h = firstT('new', E(155, Math.PI / 2, { hp: 0.42 * 1400 }), 15, 8)
  const low165 = firstT('new', E(165, Math.PI / 2, { hp: 0.38 * 1400 }), 15, 8)
  const mover = (v, x0) => ({ id: 10, x: x0, y: 0, hp: 1400, maxHp: 1400, script: (e, t, A, dt) => { e.vx = -v; e.vy = 0; e.x += e.vx * dt; e.yaw = Math.PI / 2 } })
  const close4 = firstT('new', mover(4, 179), 19.8, 3)
  const close2 = firstT('new', mover(2, 179), 19.8, 3)
  let fdSeen = 0
  const fdPre = (ar, o) => { o.alive = ar.t < 16 ? 14 : 13; if (ar.t >= 16) fdSeen = 1 }
  const fd = firstT('new', E(185, 'face'), 15, 27, fdPre)
  const ffa = firstT('ffa', E(185, 'face'), 15, 10)
  const old = firstT('old', E(185, 'face'), 15, 35)
  const ok1 = aim185.first >= 20 && aim185.first <= 20.3 && aim195.first < 0 && off185.first < 0 && on185.first >= 20 && on185.first <= 20.3
  check('P1a aim clause: aims within 0.22 rad from 185 m engaged at 20.0-20.3 s; 195 m or 0.30 rad off never (by 23 s)', ok1,
    `185 face ${aim185.first} | 195 face ${aim195.first} | 185 off 0.30 ${off185.first} | 185 off 0.18 ${on185.first} | cand band ${fx(aim185.band, 0)} m`)
  check('P1b low-hp clause: 38% at 155 m (side-on) engaged from 20 s; 42% at 155 m or 38% at 165 m not', low155.first >= 20 && low155.first <= 20.3 && low155h.first < 0 && low165.first < 0,
    `38%/155 ${low155.first} | 42%/155 ${low155h.first} | 38%/165 ${low165.first}`)
  check('P1c closing clause: 4 m/s from 179 m engaged at once after 20 s; 2 m/s not (within 3 s)', close4.first >= 20 && close4.first <= 20.3 && close2.first < 0,
    `4 m/s ${close4.first} | 2 m/s ${close2.first}`)
  check('P1d guard: with a foreign death seen at 16 s the guard is 40 s (aimer engaged at 40.0-40.3)', fdSeen === 1 && fd.first >= 40 && fd.first <= 40.3, `first ${fd.first}`)
  check('P1e FFA posture unchanged (no engaged clause) and 5.02 values never engage the 185 m aimer by 50 s', ffa.first < 0 && old.first < 0, `FFA ${ffa.first} | 5.02 ${old.first}`)
  // hit / near clauses at unit level (direct selectTarget calls on a real brain state)
  const ar = new Arena({ cfg, seed: 902, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [E(120, Math.PI / 2)] })
  ar.t = 21; const br = mk('new'); drive(ar, br, 1, null, aliveN(14))
  const B = br._B, tr = B.tracks.get(10)
  const sel = (setup) => { const keep = { hp: tr.hp, dist: tr.dist, lastDmgInT: tr.lastDmgInT, hostile: tr.hostile }; B.target = null; setup(); T.selectTarget(B); const id = B.target ? B.target.id : -1; Object.assign(tr, keep); return id }
  const t = B.me.t
  const hit5 = sel(() => { B.bandHi = -100; tr.dist = 230; tr.hostile = false; tr.lastDmgInT = t - 5.9 })
  const hit7 = sel(() => { B.bandHi = -100; tr.dist = 230; tr.hostile = false; tr.lastDmgInT = t - 6.1 })
  const hit245 = sel(() => { B.bandHi = -100; tr.dist = 245; tr.hostile = false; tr.lastDmgInT = t - 1 })
  const near59 = sel(() => { B.bandHi = -100; tr.dist = 59; tr.hostile = false })
  const near61 = sel(() => { B.bandHi = -100; tr.dist = 61; tr.hostile = false })
  const nolos = sel(() => { B.bandHi = -100; tr.dist = 50; tr.hostile = false; tr.losOut = false; tr.losIn = false })
  check('P1f hit clause (6 s, 240 m line) and 60 m clause; no line no engagement', hit5 === 10 && hit7 < 0 && hit245 < 0 && near59 === 10 && near61 < 0 && nolos < 0,
    `hit 5.9 s @230 ${hit5} | 6.1 s ${hit7} | @245 ${hit245} | 59 m ${near59} | 61 m ${near61} | no line 50 m ${nolos}`)
  check('P1g preset: defaults openFarm off, fightEarly on, guard 20 s, openingS 40 kept; V2 = openFarm on (5.02 gate)',
    P1.openFarm === false && P1.fightEarly === true && P1.earlyOpenS === 20 && P1.openingS === 40 && resolveParams({ select: { fightEarly: 'off' } }).openFarm === true,
    `openFarm ${P1.openFarm} fightEarly ${P1.fightEarly} earlyOpenS ${P1.earlyOpenS} openingS ${P1.openingS}`)
}

// =============================================================== P2 laserEcon
{
  const lootRun = (kind, laserX, extra) => {
    const ar = new Arena({ cfg, seed: 911, me: { x: 0, y: 0, yaw: 0 }, pickups: laserX ? [{ id: 8301, kind: 'laser', pos: [laserX, 0, 0] }] : [],
      cubes: [{ id: 7001, pos: [0, 14, 0] }], crates: [{ id: 1301, pos: [-30, 0, 0], hp: 200 }], ...(extra || {}) })
    ar.t = 30
    const br = mk(kind)
    let first = null
    drive(ar, br, 0.5, (a, o, act, b) => { const l = b._B.loot; if (!first && l) first = l.type + (l.obj && l.obj.kind ? ':' + l.obj.kind : '') }, aliveN(14))
    return first
  }
  const l190 = lootRun('new', 190), o190 = lootRun('old', 190), o100 = lootRun('old', 100)
  // remembered pickup: seen from 150 m, then we are moved 85 / 95 m away from it (235 / 245 m), out of view
  const mem = (kind, back) => {
    const ar = new Arena({ cfg, seed: 916, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8305, kind: 'laser', pos: [150, 0, 0] }], cubes: [{ id: 7002, pos: [-back, 14, 0] }] })
    ar.t = 30; const br = mk(kind); let first = null
    drive(ar, br, 0.2, null, aliveN(14))
    ar.me.x = -back; ar.me.yaw = Math.PI
    drive(ar, br, 1.2, (a, o, act, b) => { const l = b._B.loot; first = l ? l.type + (l.obj && l.obj.kind ? ':' + l.obj.kind : '') : null }, aliveN(14))
    return first
  }
  const m235 = mem('new', 85), m245 = mem('new', 95)
  check('P2a laser seek: no laser held, a laser seen at 190 m is the first loot over a cube at 14 m and a crate at 30 m (5.02: never beyond 120 m); remembered at 235 m chosen, 245 m not',
    l190 === 'pickup:laser' && o190 !== 'pickup:laser' && m235 === 'pickup:laser' && m245 !== 'pickup:laser', `190: ${l190} | 5.02 190: ${o190} | 5.02 100: ${o100} | remembered 235: ${m235} | 245: ${m245}`)
  const otherRun = (kind, x) => {
    const ar = new Arena({ cfg, seed: 912, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8302, kind: 'lightning', pos: [x, 0, 0] }] })
    ar.t = 30; const br = mk(kind); let first = null
    drive(ar, br, 0.5, (a, o, act, b) => { const l = b._B.loot; if (!first && l) first = l.type }, aliveN(14))
    return first
  }
  check('P2b other weapon pickups keep the 120 m loot path (lightning at 115 m taken, 150 m not)', otherRun('new', 115) === 'pickup' && otherRun('new', 150) === null,
    `115: ${otherRun('new', 115)} | 150: ${otherRun('new', 150)}`)
  const mortar = (kind, t0) => {
    const ar = new Arena({ cfg, seed: 913, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8303, kind: 'mortar', pos: [12, 0, 0] }] })
    ar.t = t0; drive(ar, mk(kind), 8, null, aliveN(14))
    return ar.me.weapons[1] ? ar.me.weapons[1].kind : 'none'
  }
  const mN = mortar('new', 120), mO = mortar('old', 120), mF = mortar('ffa', 120)
  check('P2c no mortar in SQUAD (120 s, nothing better seen); FFA posture and 5.02 still take it', mN === 'none' && mO === 'mortar' && mF === 'mortar', `R3a2 ${mN} | 5.02 ${mO} | FFA ${mF}`)
  const swap = (kind) => {
    const ar = new Arena({ cfg, seed: 914, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'lightning'] }, pickups: [{ id: 8304, kind: 'laser', pos: [40, 0, 0] }] })
    ar.t = 30; drive(ar, mk(kind), 8, null, aliveN(14))
    return ar.me.weapons.map((w) => (w ? w.kind : '-')).join('+')
  }
  check('P2d a laser replaces a held lightning (gun + lightning -> gun + laser)', swap('new') === 'gun+laser', `R3a2 ${swap('new')}`)
  // band: gun + laser against a hostile static mech starting at 200 m: settle distance
  const band = (kind) => {
    const ar = new Arena({ cfg, seed: 915, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 10, x: 200, y: 0, hp: 1e7, maxHp: 1e7, dps: 3, script: (e, t, A) => { still(e); face(e, A) } }] })
    ar.t = 60; const ds = []
    drive(ar, mk(kind), 25, (a, o, act, b) => { if (a.t > 75) ds.push(Math.hypot(a.me.x - 200, a.me.y)) }, aliveN(14))
    ds.sort((x, y) => x - y); return { med: ds[ds.length >> 1], lo: ds[0], hi: ds[ds.length - 1] }
  }
  const bN = band('new'), bO = band('old'), Pn = resolveParams({})
  check('P2e laserRange mid: hold 115, band 100-130, back-off 100, boost-away 70; fight distance settles in the mid band (5.02 far band)',
    Pn.rPrefLaser === 115 && Pn.laserLo === 100 && Pn.laserHi === 130 && Pn.laserBackOff === 100 && Pn.laserBoostAway === 70 && bN.med >= 100 && bN.med <= 130 && bO.med >= 125,
    `R3a2 median ${fx(bN.med)} (${fx(bN.lo)}-${fx(bN.hi)}) | 5.02 median ${fx(bO.med)} (${fx(bO.lo)}-${fx(bO.hi)})`)
  // zone gate still applies: the 230 m laser lies outside the circle we will be in
  const zr = lootRun('new', 190, { zone: { center: [0, 0], radius: 150, next_center: [0, 0], next_radius: 140, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
  check('P2f zone gate still applies to the long laser seek (laser outside the circle not chosen)', zr !== 'pickup:laser', `zone r 150: ${zr}`)
}

// =============================================================== P3 focus
{
  // property test: random sets of 2-4 mechs appear together at t0 + 0.3 s (hitters hit us from out of view before that,
  // closers move from t0); the first target must be the argmin of the spec cost and tr.index = 1000 - cost on every one
  const M = (id, x, y, hp, extra) => ({ id, x, y, hp, maxHp: 1400, script: (e, t, A, dt) => { still(e); e.yaw = Math.atan2(y, x); e.hp = hp }, ...(extra || {}) })
  const rnd = (await import(P + '/tools/arena_micro.js')).rng32(4242)
  const cost = (B, tr) => {
    let c = tr.dist + 0.1 * tr.hp
    if (tr.finishable || tr.hp <= 0.3 * tr.maxHp) c -= 200
    if (B.me.t - tr.lastDmgInT <= 4) c -= 40
    const dx = B.me.x - tr.x, dy = B.me.y - tr.y, d = Math.hypot(dx, dy), cv = d > 1 ? (dx * tr.vx + dy * tr.vy) / d : 0
    if (cv > 1) c -= 15
    if (!tr.losOut) c += 240
    return c
  }
  let nCases = 0, nArg = 0, nIdx = 0, ties = 0, skipped = 0, flags = { low: 0, fin: 0, hit: 0, close: 0 }
  const fails = []
  for (let cs = 0; cs < 60; cs++) {
    const n = 2 + Math.floor(rnd() * 3), en = []
    for (let i = 0; i < n; i++) {
      const d = 35 + rnd() * 95, ang = (rnd() * 100 - 50) * Math.PI / 180, x = d * Math.cos(ang), y = d * Math.sin(ang)
      const hp = Math.round((0.15 + rnd() * 0.85) * 1400), hit = rnd() < 0.35, close = rnd() < 0.35 ? 1.6 + rnd() * 2.5 : 0
      en.push({ id: 10 + i, x: 9000 + i * 50, y: 0, hp, maxHp: 1400, dps: hit ? 900 : 0, script: (e, t, A, dt) => {
        e.hp = hp; if (t > 80.16) e.dps = 0
        if (t >= 80.24 && e.x > 5000) { e.x = x; e.y = y }
        if (close && e.x < 5000) { const l = Math.hypot(e.x, e.y); e.vx = -close * e.x / l; e.vy = -close * e.y / l; e.x += e.vx * dt; e.y += e.vy * dt } else still(e)
        e.yaw = Math.atan2(e.y, e.x) + Math.PI / 2 } })
    }
    const ar = new Arena({ cfg, seed: 921 + cs, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: en })
    ar.t = 80
    const br = mk('new'); let done = false
    drive(ar, br, 0.8, (a, o, act, b) => {
      const B = b._B
      if (done || !B.target || B.target.npc || a.t < 80.28) return
      done = true; nCases++
      const L = en.map((e) => B.tracks.get(e.id)).filter((tr) => tr && tr.listed)
      if (L.length !== n) { const miss = en.filter((e) => !(B.tracks.get(e.id) && B.tracks.get(e.id).listed)); const seen = o.mechs.map((m) => m.id); fails.push(`case ${cs}: ${L.length}/${n} listed (missing ${miss.map((e) => e.id + '@' + Math.round(Math.hypot(ar.enemies.find((q) => q.id === e.id).x, ar.enemies.find((q) => q.id === e.id).y)) + 'm dps' + e.dps + ' inObs ' + seen.includes(e.id) + ' trk ' + (B.tracks.get(e.id) ? (B.tracks.get(e.id).phantom ? 'phantom' : 'real') : 'none')).join(',')})`); skipped++; return }
      const cs2 = L.map((tr) => ({ tr, c: cost(B, tr) })).sort((p, q) => p.c - q.c)
      if (cs2[1].c - cs2[0].c < 1) { ties++; return }
      for (const { tr, c } of cs2) { if (tr.finishable || tr.hp <= 0.3 * tr.maxHp) flags.low++; if (tr.finishable) flags.fin++; if (B.me.t - tr.lastDmgInT <= 4) flags.hit++ }
      if (B.target === cs2[0].tr) nArg++; else fails.push(`case ${cs}: picked ${B.target.id}, argmin ${cs2[0].tr.id} (${cs2.map((q) => q.tr.id + ':' + q.c.toFixed(1)).join(' ')})`)
      if (cs2.every(({ tr, c }) => Math.abs(tr.index - (1000 - c)) < 1e-6)) nIdx++; else fails.push(`case ${cs}: index ` + cs2.map(({ tr, c }) => `${tr.id} ${tr.index.toFixed(2)} vs ${(1000 - c).toFixed(2)}`).join(' '))
    }, aliveN(14))
  }
  const graded = nCases - ties - skipped
  check('P3a cost = distance + 0.1/hp - 200 (<= 30% or finishable) - 40 (hit us in 4 s) - 15 (closing); first pick = argmin and tr.index = 1000 - cost in random sets',
    graded >= 40 && nArg === graded && nIdx === graded, `${nArg}/${graded} argmin, ${nIdx}/${graded} index exact (ties ${ties}, harness-unlisted ${skipped}); flags seen low/fin ${flags.low}/${flags.fin} hit ${flags.hit}${fails.length ? ' | ' + fails.slice(0, 6).join(' ; ') : ''}`)
  // E: current-target stickiness (-200): our target at 150 m full hp keeps against a fresh full mech appearing at 40 m
  const stick = (kind) => {
    const ar = new Arena({ cfg, seed: 922, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [
      { id: 10, x: 150, y: 0, hp: 1e6, maxHp: 1e6, script: (e, t, A) => { still(e); face(e, A); e.hp = 1400; e.maxHp = 1400 } },
      { id: 11, x: 9000, y: 0, hp: 1400, maxHp: 1400, script: (e, t, A) => { if (t >= 82) { e.x = 40; e.y = 5 } still(e); e.yaw = Math.PI / 2 } }] })
    ar.t = 80; const br = mk(kind); let on10 = 0, on11 = 0
    drive(ar, br, 6, (a, o, act, b) => { if (a.t < 83) return; const tg = b._B.target; if (tg && tg.id === 10) on10++; if (tg && tg.id === 11) on11++ }, aliveN(14))
    return { on10, on11 }
  }
  const sN = stick('new'), sO = stick('old')
  check('P3e -200 stickiness: target at 150 m kept against a fresh mech at 40 m (5.02 switches)', sN.on11 === 0 && sN.on10 > 20 && sO.on11 > 20, `R3a2 on 150 m ${sN.on10}, fresh ${sN.on11} | 5.02 on 150 m ${sO.on10}, fresh ${sO.on11}`)
  // F: torso veto (unit level): target in front 100 m, an attacker behind (a >= 60, hit us now)
  const veto = (kind, tgtHpf, ourHitAgo) => {
    const ar = new Arena({ cfg, seed: 923, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [M(10, 100, 0, 1400), M(11, -40, 0, 1400)] })
    ar.t = 80; const br = mk(kind); drive(ar, br, 0.6, null, aliveN(14))
    const B = br._B, t = B.me.t, Tg = B.tracks.get(10), At = B.tracks.get(11)
    if (!Tg || !At) return 'no tracks'
    Tg.hp = tgtHpf * 1400; Tg.lastDmgOutT = t - ourHitAgo; Tg.hostile = true
    At.a = 90; At.lastDmgInT = t; At.hostile = true; At.listed = true
    B.target = Tg
    T.selectTarget(B)
    return B.target ? B.target.id : -1
  }
  const v50 = veto('new', 0.5, 3), v37 = veto('new', 0.37, 3), v50h = veto('new', 0.5, 1), o50 = veto('old', 0.5, 3), o37 = veto('old', 0.37, 3), o50h = veto('old', 0.5, 1)
  check('P3f torso veto under add: switches to the rear attacker only if the target is >= 38% and not hit by us in 2 s (5.02: switches in all three)',
    v50 === 11 && v37 === 10 && v50h === 10 && o50 === 11 && o37 === 11 && o50h === 11, `R3a2 50%/3s ${v50}, 37% ${v37}, hit 1 s ago ${v50h} | 5.02 ${o50}, ${o37}, ${o50h}`)
  const keep25 = veto('new', 0.2, 3)
  check('P3g a target under 25% is never left for the attacker (D5 keep rule kept)', keep25 === 10, `20% target: ${keep25}`)
}

// =============================================================== P4 pulseRetreat
{
  const unit = (kind, s) => {
    const br = mk(kind), B = br._B, me = B.me
    const tr = (id, d, hpf, listed) => ({ id, npc: false, listed: listed !== false, conf: 1, hp: hpf * 1400, maxHp: 1400, dist: d, x: d, y: 0, vx: 0, vy: 0, lastDmgInT: -99, losOut: true, losIn: true, a: 50 })
    const L = s.mechs.map((m, i) => tr(10 + i, m[0], m[1], m[2]))
    me.t = 100; me.maxHp = 1400; me.hpf = s.hpf; me.hp = s.hpf * 1400
    B.trackList = L; B.target = L[0]; B.threats = s.threats ?? L.length; B.threat1 = L[0]
    B.hide.state = s.hide || 'found'; B.hide.dist = 10; B.mode = 'FIGHT'; B.modeSince = 0; B.aliveN = s.alive ?? 12
    B.zone.known = s.nr !== undefined; if (s.nr !== undefined) { B.zone.nr = s.nr }
    B.lastLosInT = 100; me.lastShotAtT = 100
    T.decideMode(B)
    return { lose: B.losing, mode: B.mode }
  }
  const cases = [
    // [label, scenario, expected losing]
    ['n2 54%', { hpf: 0.54, mechs: [[100, 1], [120, 1]] }, true], ['n2 56%', { hpf: 0.56, mechs: [[100, 1], [120, 1]] }, false],
    ['n3 79%', { hpf: 0.79, mechs: [[100, 1], [120, 1], [150, 1]] }, true], ['n3 81%', { hpf: 0.81, mechs: [[100, 1], [120, 1], [150, 1]] }, false],
    ['n1 34% vs 45%', { hpf: 0.34, mechs: [[100, 0.45]] }, true], ['n1 34% vs 43%', { hpf: 0.34, mechs: [[100, 0.43]] }, false], ['n1 36% vs 90%', { hpf: 0.36, mechs: [[100, 0.9]] }, false],
    ['2nd at 161 m, 50%', { hpf: 0.5, mechs: [[100, 1], [161, 1]] }, false], ['2nd not listed, 50%', { hpf: 0.5, mechs: [[100, 1], [100, 1, false]] }, false],
    ['n2 50% target 24%', { hpf: 0.5, mechs: [[100, 0.24], [120, 1]] }, false], ['n3 50% target 24%', { hpf: 0.5, mechs: [[100, 0.24], [120, 1], [130, 1]] }, true],
    ['n2 19% target 24%', { hpf: 0.19, mechs: [[100, 0.24], [120, 1]] }, true],
    ['late zone nr 70', { hpf: 0.5, mechs: [[100, 1], [120, 1]], nr: 70 }, false], ['nr 71', { hpf: 0.5, mechs: [[100, 1], [120, 1]], nr: 71 }, true],
    ['alive 3', { hpf: 0.5, mechs: [[100, 1], [120, 1]], alive: 3 }, false], ['alive 4', { hpf: 0.5, mechs: [[100, 1], [120, 1]], alive: 4 }, true],
  ]
  const bad = [], out = []
  for (const [lab, s, exp] of cases) { const r = unit('new', s); out.push(`${lab}=${r.lose ? 'L' : '-'}`); if (r.lose !== exp) bad.push(lab) }
  check('P4a LOSING matrix (n within 160 m listed; 55/80/35+10 thresholds; cancels: target < 25% with n <= 2 and hp > 20%, nr <= 70, alive <= 3)', bad.length === 0, (bad.length ? 'WRONG ' + bad.join(', ') + ' || ' : '') + out.join(' '))
  const nc = unit('new', { hpf: 0.4, mechs: [[100, 1], [120, 1]], hide: 'idle' }), wc = unit('new', { hpf: 0.4, mechs: [[100, 1], [120, 1]], hide: 'found' })
  check('P4b LOSING with no hide cell found stays in FIGHT; with one found it retreats (DISENGAGE)', nc.lose && nc.mode === 'FIGHT' && wc.mode === 'DISENGAGE', `no cover: losing ${nc.lose} mode ${nc.mode} | cover: ${wc.mode}`)
  // tail: LOSING decisions until 101.0 s, then hp restored: LOSING ends at 102.5 s (1.5 s after the last LOSING decision)
  {
    const br = mk('new'), B = br._B, me = B.me
    const tr = (id, d) => ({ id, npc: false, listed: true, conf: 1, hp: 1400, maxHp: 1400, dist: d, x: d, y: 0, vx: 0, vy: 0, lastDmgInT: -99, losOut: true, losIn: true, a: 50 })
    const L = [tr(10, 100), tr(11, 120)]
    B.hide.state = 'found'; B.hide.dist = 10; B.mode = 'FIGHT'; B.modeSince = 0; B.aliveN = 12; me.maxHp = 1400
    let lastL = -1, endT = -1, back = -1, healN = 0
    for (let k = 0; k <= 40; k++) {
      const t = +(100 + k * 0.1).toFixed(2); me.t = t
      me.hpf = t <= 101.0 ? 0.45 : 0.6; me.hp = me.hpf * 1400
      B.trackList = L; B.target = L[0]; B.threats = 2; B.threat1 = L[0]; B.lastLosInT = t; me.lastShotAtT = t
      T.decideMode(B)
      if (B.losing) lastL = t; else if (endT < 0 && lastL > 0) endT = t
      if (B.mode === 'HEAL') healN++
      if (endT > 0 && back < 0 && B.mode === 'FIGHT') back = t
    }
    check('P4c a retreat ends 1.5 s after the last LOSING decision (last raw 101.0 s -> LOSING through 102.4, FIGHT from 102.5); never HEAL', Math.abs(lastL - 102.4) < 1e-9 && Math.abs(endT - 102.5) < 1e-9 && back >= 102.5 && back <= 103.0 && healN === 0,
      `last LOSING ${lastL}, first not LOSING ${endT}, FIGHT ${back}, HEAL ${healN}`)
  }
  const heal = (kind) => { const ar = new Arena({ cfg, seed: 931, me: { x: 0, y: 0, yaw: 0, hp: 0.3 * 1400 } }); ar.t = 60; let n = 0; drive(ar, mk(kind), 12, (a, o, act, b) => { if (b._B.mode === 'HEAL') n++ }, aliveN(12)); return n }
  const hN = heal('new'), hO = heal('old'), hF = heal('ffa')
  check('P4d no HEAL state in SQUAD (30% hp, 12 s quiet); FFA posture and 5.02 heal', hN === 0 && hO > 30 && hF > 30, `HEAL decisions: R3a2 ${hN} | 5.02 ${hO} | FFA ${hF}`)
}

// =============================================================== P5 boostSpend
{
  const run = (kind, weapons, x, dps) => {
    const ar = new Arena({ cfg, seed: 941, me: { x: 0, y: 0, yaw: 0, weapons }, enemies: [{ id: 10, x, y: 0, hp: 1e7, maxHp: 1e7, dps, script: (e, t, A) => { still(e); face(e, A) } }] })
    ar.t = 60
    const br = mk(kind)
    const st = { pred: 0, predB: 0, fired: 0, firedBad: 0, resume: 0, low: 0, lowFired: 0, light: 0 }
    let prevSpend = 0, lowSeenT = -99
    drive(ar, br, 30, (a, o, act, b) => {
      const B = b._B, me = B.me, spend = B.counters.boostSpend || 0, fired = spend > prevSpend; prevSpend = spend
      const e = o.self.energy
      const fight = B.mode === 'FIGHT' && o.self.grounded && B.target && !B.target.npc && !B.rush
      const hot = (me.laser && me.laser.charge > 0) || B.nLos >= 1 || me.t - me.lastHurtT <= 1
      const floor = me.lightning ? B.P.lightReserve + 10 : 0
      if (fired) { st.fired++; if (!(fight && e > floor && ((hot && e > 30) || e > 25))) st.firedBad++ ; if (e < 40 && me.t - lowSeenT < 3) st.resume++ }
      if (fight && hot && e > Math.max(30.5, floor + 0.5) && Math.hypot(act.move[0], act.move[1]) >= 0.5 && !B.rush) { st.pred++; if (act.boost) st.predB++ }
      if (fight && e <= 25) { st.low++; if (fired) st.lowFired++ }
      if (me.lightning && fight && e > 30.5 && e <= floor && fired) st.light++
      if (e < 30) lowSeenT = me.t
    }, aliveN(12))
    return st
  }
  const n = run('new', ['gun', 'laser'], 110, 20), f = run('ffa', ['gun', 'laser'], 110, 20), o = run('old', ['gun', 'laser'], 110, 20), li = run('new', ['gun', 'lightning'], 35, 20)
  check('P5a boost in FIGHT when charging / under fire above 30 energy: predicate frames boosted >= 90%, no P5 boost at or below 25',
    n.pred >= 20 && n.predB >= 0.9 * n.pred && n.fired > 0 && n.firedBad === 0 && n.lowFired === 0, `pred ${n.predB}/${n.pred} boosted, P5 decisions ${n.fired}, outside rule ${n.firedBad}, at <= 25 energy ${n.lowFired}/${n.low}`)
  check('P5b no 30/60 hysteresis: P5 resumes below 40 energy within 3 s of being under 30', n.resume > 0, `resumes ${n.resume}`)
  check('P5c SQUAD only and new: FFA posture and 5.02 values never fire P5', f.fired === 0 && o.fired === 0, `FFA ${f.fired} | 5.02 ${o.fired}`)
  check('P5d lightning holder keeps its reserve (no P5 boost at 30-45 energy)', li.light === 0 && li.firedBad === 0, `lightning: P5 decisions ${li.fired}, inside the reserve ${li.light}`)
}

// =============================================================== P6 farmHp, P7 upgrades
{
  const farm = (kind, hpf) => {
    const ar = new Arena({ cfg, seed: 951, me: { x: 0, y: 0, yaw: 0, hp: hpf * 1400 }, crates: [{ id: 1401, pos: [30, 0, 0], hp: 200 }] })
    ar.t = 100; let first = null
    drive(ar, mk(kind), 0.4, (a, o, act, b) => { const l = b._B.loot; if (!first && l) first = l.type }, aliveN(12))
    return first
  }
  const f55 = farm('new', 0.55), f45 = farm('new', 0.45), o85 = farm('old', 0.85), o95 = farm('old', 0.95)
  check('P6 farmHp 50: crate farmed at 55% (not at 45%); 5.02 only above 90%', f55 === 'crate' && f45 !== 'crate' && o85 !== 'crate' && o95 === 'crate', `55% ${f55} | 45% ${f45} | 5.02 85% ${o85}, 95% ${o95}`)
  const offer = (kind, choices) => { const br = mk(kind); const o = JSON.parse(JSON.stringify(obs0)); o.offer = { id: 7, expires: 99, choices: choices.map((id) => ({ id })) }; const a = br.act(o, performance.now() + 27); return choices[a.pick] }
  const u1 = offer('new', ['nanites', 'servos', 'gun_damage']), u2 = offer('new', ['servos', 'armor', 'jets']), u3 = offer('new', ['jets', 'laser_charge', 'nanites']), u4 = offer('old', ['nanites', 'servos', 'gun_damage'])
  const order = resolveParams({}).upgradeOrder
  check('P7 speed upgrade third: plating, armor, servos, then the old order without servos (5.02: nanites over servos)',
    u1 === 'servos' && u2 === 'armor' && u3 === 'nanites' && u4 === 'nanites' && order.slice(0, 3).join() === 'plating,armor,servos' && order.length === PARAMS.upgradeOrder.length && new Set(order).size === order.length,
    `[nanites, servos, gun_damage] -> ${u1} | [servos, armor, jets] -> ${u2} | [jets, laser_charge, nanites] -> ${u3} | 5.02 -> ${u4} | order ${order.slice(0, 7).join(' ')}`)
}

// =============================================================== final-only items (FFA posture forced)
const ffaArena = (enemies, t0, extra) => { const ar = new Arena({ cfg, seed: 961, me: { x: 0, y: 0, yaw: 0, pinned: true, ...((extra && extra.me) || {}) }, enemies, ...((extra && extra.ar) || {}) }); ar.t = t0; return ar }
// F1
{
  const drop = (kind, alive, mech, dropPos) => {
    const ar = ffaArena([{ id: 10, x: mech[0], y: mech[1], hp: 1400, maxHp: 1400, script: (e) => { still(e); e.yaw = Math.PI / 2 } }], 150, { me: { yaw: Math.atan2(mech[1], mech[0]) } })
    const br = mk(kind); let task = 0
    drive(ar, br, 1, (a, o, act, b) => { if (b._B.dropTask) task++ }, (a, o) => { o.alive = alive; o.drops = [{ id: 1, pos: [dropPos[0], dropPos[1], 0], radius: 8, lands_in: 12, capture_s: 4, progress: 0, holder: null }] })
    return task
  }
  const a = drop('ffa', 3, [100, 0], [-110, 0]), b = drop('ffa', 3, [190, 0], [100, 60]), c = drop('ffa', 3, [190, 0], [-110, 0]), d = drop('ffa', 5, [100, 0], [-110, 0]), e = drop('oldffa', 3, [100, 0], [-110, 0])
  check('F1 drop gate (FFA, <= 3 alive): no drop with a mech within 150 m of us, contest radius 150 m; 5 alive and 5.02 unchanged',
    a === 0 && b === 0 && c > 0 && d > 0 && e > 0, `3 alive mech 100 m from us: ${a} | mech 190 m from us, 108 m from drop: ${b} | mech 190 m / 300 m: ${c} | 5 alive: ${d} | 5.02: ${e}`)
}
// Z5
{
  const zone = (t0) => ({ center: [6, 0], radius: 25, next_center: [0, 0], next_radius: 0, shrink_start: 390, shrink_end: 415, dps: 260 })
  const race = (kind, t0) => {
    const ar = ffaArena([], t0, { me: { x: 15, y: 0, pinned: false }, ar: { zone: zone(t0) } })
    const br = mk(kind); let on = 0, n = 0
    drive(ar, br, 1, (a, o, act, b) => { n++; if (b._B.ffa.raceOn()) on++ }, aliveN(4))
    return `${on}/${n}`
  }
  const r376 = race('ffa', 376), r374 = race('ffa', 374), o376 = race('oldffa', 376)
  // point occupied: a mech 0.5 m off the point, we approach from the east: goal r_us + r_them + 0.4 from it toward the current centre (east)
  const side = (kind) => {
    const ar = ffaArena([{ id: 10, x: 0.5, y: 0.5, hp: 1400, maxHp: 1400, script: (e) => { still(e); e.yaw = 0 } }], 380, { me: { x: 15, y: 3, pinned: true, yaw: Math.PI }, ar: { zone: zone(380) } })
    const br = mk(kind); let g = null
    drive(ar, br, 0.6, (a, o, act, b) => { g = b._B.zoneGoalNow || null }, aliveN(2))
    const B = br._B, zg = B.mover ? null : null
    const p = B.ffa.pointSide()
    return p ? { x: p.x, y: p.y } : null
  }
  const sp = side('ffa')
  const exp = { x: 0.5 + 1 * (2.5 + 2.5 + 0.4), y: 0.5 }
  check('Z5a final point: race from 375 s in the last circle (5.02 from 390); occupied point -> stand r_us + r_them + 0.4 m off on the current-centre side',
    r376.startsWith('10/') && r374.startsWith('0/') && o376.startsWith('0/') && sp && Math.abs(sp.x - exp.x) < 0.05 && Math.abs(sp.y - exp.y) < 0.05,
    `raceOn 376 s ${r376}, 374 s ${r374}, 5.02 376 s ${o376} | side point ${sp ? fx(sp.x, 2) + ',' + fx(sp.y, 2) : 'none'} (expected ${fx(exp.x, 2)},${fx(exp.y, 2)})`)
  // E pick from 405 s: three mechs on a 8 m ring around the point (same exit time): pick the smallest positive E - E_us, else the attacker
  const epick = (kind, ourHp, t0) => {
    const ring = (id, ang, hp, dps) => ({ id, x: 5 * Math.cos(ang), y: 5 * Math.sin(ang), hp, maxHp: 2000, dps: dps || 0, script: (e) => { still(e); e.hp = hp; e.yaw = ang + Math.PI } })
    const ar = ffaArena([ring(10, 0.3, 1100), ring(11, 2.4, 1300), ring(12, 4.2, 900, 60)], t0, { me: { x: 5 * Math.cos(5.5), y: 5 * Math.sin(5.5), hp: ourHp, yaw: 2 }, ar: { zone: { center: [0, 0], radius: 25, next_center: [0, 0], next_radius: 0, shrink_start: 390, shrink_end: 415, dps: 260 } } })
    const br = mk(kind); let tg = -1, hold = 0
    drive(ar, br, 1.5, (a, o, act, b) => { tg = b._B.target ? b._B.target.id : -1; if (b._B.holdFire) hold++ }, (a, o) => { o.alive = 4; o.self.hp = ourHp; o.self.max_hp = 2000 })
    return { tg, hold }
  }
  const e1 = epick('ffa', 1000, 406), e2 = epick('ffa', 1200, 406), e3 = epick('ffa', 1400, 406), e0 = epick('ffa', 1000, 403)
  check('Z5b from 405 s the target is the mech with the smallest positive E - E_us (us 1000 -> 1100 hp mech; us 1200 -> 1300; us on top -> our attacker), never held',
    e1.tg === 10 && e2.tg === 11 && e3.tg === 12 && e1.hold + e2.hold === 0, `us 1000: ${e1.tg} | 1200: ${e2.tg} | 1400: ${e3.tg} | hold-fire decisions ${e1.hold + e2.hold} | before 405 s (403): ${e0.tg}`)
}
// Z8 / Z9 / Z10 at unit level on real FFA brain states
{
  const state = (kind, alive, ourMax, them, t0, extra) => {
    const ar = ffaArena(them.map((m, i) => ({ id: 10 + i, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp || 1400, dps: m.dps || 0, script: (e, t, A) => { still(e); e.hp = m.hp; e.yaw = m.yaw === 'face' ? Math.atan2(A.me.y - e.y, A.me.x - e.x) : (m.yaw ?? Math.atan2(e.y, e.x)) } })), t0 || 150,
      { me: { yaw: Math.atan2(them[0].y, them[0].x), hp: (extra && extra.ourHp) || ourMax }, ar: (extra && extra.ar) || {} })
    const br = mk(kind, extra && extra.over)
    let stance = []
    drive(ar, br, (extra && extra.secs) || 1, (a, o, act, b) => stance.push(b._B.stance), (a, o) => { o.alive = alive; o.self.max_hp = ourMax; if (extra && extra.ourHp) o.self.hp = extra.ourHp })
    return { B: br._B, br, stance }
  }
  const fso = (s, id) => { const tr = s.B.tracks.get(id); return tr ? s.B.ffa.firstShotOk(tr) : 'no track' }
  // Z8 modes
  const wait = state('ffa', 2, 1800, [{ x: 120, y: 0, hp: 1400, maxHp: 1400 }]), waitFin = state('ffa', 2, 1800, [{ x: 120, y: 0, hp: 500, maxHp: 1400 }])
  const close = state('ffa', 2, 1400, [{ x: 120, y: 0, hp: 1750, maxHp: 1800 }]), closeOpen = state('ffa', 2, 1400, [{ x: 120, y: 0, hp: 1000, maxHp: 1800, yaw: 0 }]), closeFace = state('ffa', 2, 1400, [{ x: 120, y: 0, hp: 1000, maxHp: 1800, yaw: 'face' }])
  const duel299 = state('ffa', 2, 1699, [{ x: 120, y: 0, hp: 1400, maxHp: 1400 }]), wait300 = state('ffa', 2, 1700, [{ x: 120, y: 0, hp: 1400, maxHp: 1400 }])
  const duelHi = state('ffa', 2, 1400, [{ x: 120, y: 0, hp: 600, maxHp: 1400, yaw: 0 }]), duelLo = state('ffa', 2, 1400, [{ x: 120, y: 0, hp: 1400, maxHp: 1400, yaw: 'face' }], 150, { ourHp: 300 })
  const old2 = state('oldffa', 2, 1800, [{ x: 120, y: 0, hp: 1400, maxHp: 1400 }])
  const r8 = {
    waitMode: wait.B.twoMode, waitShot: fso(wait, 10), waitFin: fso(waitFin, 10), waitStance: wait.stance[wait.stance.length - 1],
    closeMode: close.B.twoMode, closeShot: fso(close, 10), closeOpen: fso(closeOpen, 10), closeFace: fso(closeFace, 10),
    m299: duel299.B.twoMode, m300: wait300.B.twoMode, duelHi: fso(duelHi, 10), duelHiP: fx(duelHi.B.ffa.duelP(duelHi.B.tracks.get(10)), 2), duelLo: fso(duelLo, 10), duelLoP: fx(duelLo.B.ffa.duelP(duelLo.B.tracks.get(10)), 2), oldMode: old2.B.twoMode || '(none)',
  }
  const ok8 = r8.waitMode === 'WAIT' && r8.waitShot === false && r8.waitFin === true && r8.waitStance === 'DEFENSIVE' && r8.closeMode === 'CLOSE' && r8.closeShot === false && r8.closeOpen === true && r8.closeFace === false &&
    r8.m299 === 'DUEL' && r8.m300 === 'WAIT' && r8.duelHi === true && r8.duelLo === false && r8.oldMode === '(none)'
  check('Z8 two alive: WAIT (+300 max hp: no first shot but finishes, DEFENSIVE), CLOSE (-300: only an opening from outside its wedge), DUEL at estimate >= 0.9; 5.02 none', ok8,
    Object.entries(r8).map(([k, v]) => `${k} ${v}`).join(' | '))
  // Z9: three alive, a wounded mech busy with another (rule 3 would open), not hostile: held; a finish is allowed; a hostile one is a candidate
  const zz9 = { center: [0, 0], radius: 100, next_center: [0, 0], next_radius: 60, shrink_start: 140, shrink_end: 175, dps: 60 }
  const busy = (kind, alive, hp, dps, over) => state(kind, alive, 1400, [{ x: 150, y: 0, hp, maxHp: 1400, yaw: Math.PI / 2, dps: dps || 0 }, { x: 160, y: 140, hp: 1400, maxHp: 1400, yaw: 0 }], 150, { secs: 3, ar: { zone: zz9 }, over })
  const z9 = busy('ffa', 3, 600), z9fin = busy('ffa', 3, 500), z9h = busy('ffa', 3, 1400, 30), z9o = busy('ffa', 3, 600, 0, { select: { ffaThree: 'off' } }), z9four = busy('ffa', 4, 600)
  const tgtOf = (s) => (s.B.target ? s.B.target.id : -1)
  const hold9 = (() => { const s = z9h; return s.stance.includes('OFFENSIVE') })()
  check('Z9 three alive: no first shot on a non-hostile non-finish mech; a finish (<= 40%) opens; a hostile one is a candidate; never OFFENSIVE vs it unless hostile',
    fso(z9, 10) === false && fso(z9fin, 10) === true && tgtOf(z9h) === 10 && !z9.stance.includes('OFFENSIVE') && fso(z9four, 10) === true && fso(z9o, 10) === true,
    `3 alive 43% outside a 60 dps zone: ${fso(z9, 10)} | 36%: ${fso(z9fin, 10)} | hostile target ${tgtOf(z9h)} | OFFENSIVE seen (non-hostile) ${z9.stance.includes('OFFENSIVE')} | same at 4 alive (Z10 opens) ${fso(z9four, 10)} | 3 alive with ffaThree off ${fso(z9o, 10)}`)
  // Z10: a wounded mech outside the zone (dps 60) within 190 m with a line gets a first shot; not at dps 35, not over 60% hp, not when we take > 100 dps
  const zz = (dps) => ({ center: [0, 0], radius: 100, next_center: [0, 0], next_radius: 60, shrink_start: 140, shrink_end: 175, dps })
  const g = (kind, hp, dps, x, extra) => state(kind, 6, 1400, [{ x, y: 0, hp, maxHp: 1400, yaw: Math.PI / 2 }, ...((extra && extra.more) || [])], 150, { ar: { zone: zz(dps) }, secs: 1 })
  const g1 = g('ffa', 700, 60, 150), g2 = g('ffa', 700, 35, 150), g3 = g('ffa', 900, 60, 150), g4 = g('ffa', 700, 60, 195), g5 = g('oldffa', 700, 60, 150)
  const g6 = state('ffa', 6, 1400, [{ x: 150, y: 0, hp: 700, maxHp: 1400, yaw: Math.PI / 2 }, { x: 0, y: 40, hp: 1400, maxHp: 1400, yaw: 'face', dps: 200 }], 150, { ar: { zone: zz(60) }, secs: 1.5 })
  const okA = fso(g1, 10) === true && fso(g2, 10) === false && fso(g3, 10) === false && fso(g4, 10) === false && fso(g5, 10) === false && fso(g6, 10) === false
  // the x1.5 score: read through selectTarget scores of two similar mechs, one outside
  // gate post: during the shrink, idle, a wounded mech outside the next circle -> post 25 m inside the next edge on its bearing
  const post = (kind) => {
    const ar = ffaArena([{ id: 10, x: 0, y: 160, hp: 600, maxHp: 1400, script: (e) => { still(e); e.yaw = 0; e.hp = 600 } }], 150, { me: { x: 0, y: -10, pinned: false, yaw: Math.PI / 2 }, ar: { zone: { center: [0, 0], radius: 240, next_center: [0, 0], next_radius: 140, shrink_start: 145, shrink_end: 185, dps: 60 } } })
    const br = mk(kind); let gate = 0, last = null
    drive(ar, br, 2, (a, o, act, b) => { if (b._B.legKind === 'gate') gate++; last = b._B.ffa.gatePost() }, aliveN(6))
    return { gate, gp: last ? `${fx(last.x, 1)},${fx(last.y, 1)}` : 'none' }
  }
  const p1 = post('ffa'), p0 = post('oldffa')
  check('Z10 zone gate: first shot on a < 60% mech outside a >= 60 dps zone within 190 m (not at 35 dps, 64%, 195 m, our incoming > 100 dps, 5.02); idle post 25 m inside the next edge on its bearing',
    okA && p1.gate > 0 && p1.gp === '0.0,115.0' && p0.gate === 0,
    `50% dps60 150 m ${fso(g1, 10)} | dps35 ${fso(g2, 10)} | 64% ${fso(g3, 10)} | 195 m ${fso(g4, 10)} | 5.02 ${fso(g5, 10)} | under 200 dps ${fso(g6, 10)} (A ${fx(g6.B.A, 0)}) | post ${p1.gp} legs ${p1.gate} | 5.02 legs ${p0.gate}`)
}
// FFA keeps the 40 s opening guard and HEAL (covered by P1e / P4d); variants resolve
{
  const v = (s) => resolveParams({ select: s })
  const V1 = v({}), V2 = v({ fightEarly: 'off' }), V3 = v({ boost: 'off' }), V4 = v({ retreat: 'd3' }), R = v({ r3a2: 'off' })
  const ok = V1.fightEarly && V1.laserEcon && V1.focusAdd && V1.pulseRetreat && V1.boostSpend && V1.farmHp === 0.5 && V1.ffaDropGate && V1.finalPoint && V1.ffaTwo && V1.ffaThree && V1.ffaGate &&
    !V2.fightEarly && V2.openFarm && V2.boostSpend && V2.pulseRetreat && !V3.boostSpend && V3.fightEarly && !V4.pulseRetreat && V4.boostSpend && V4.fightEarly &&
    !R.fightEarly && R.openFarm && !R.laserEcon && R.rPrefLaser === 150 && !R.focusAdd && !R.pulseRetreat && !R.boostSpend && R.farmHp === 0.9 && !R.ffaTwo
  check('Variants: V1 all on; V2 = P1 off only; V3 = P5 off only; V4 = P4 off only; r3a2 off = 5.02', ok, `V2 openFarm ${V2.openFarm} | V3 boost ${V3.boostSpend} | V4 pulse ${V4.pulseRetreat} | off band ${R.rPrefLaser}`)
}
const nf = res.filter((r) => !r.ok)
console.log(`\nSCENARIOS ${res.length - nf.length}/${res.length} PASS` + (nf.length ? '  FAILED: ' + nf.map((r) => r.name.split(' ')[0]).join(', ') : ''))
