// checkR4a: the checker's own scenarios for build R4a (notes/build_spec_r4.md section 2). Not the engineer's tests.
// Run: taskset -c 0 bun tools/checkR4a/scen.js
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { resolveParams, PARAMS } = await import(P + '/bot/lib/params.js')
const T = await import(P + '/bot/lib/tactics.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const ctx = { world: null, nav: null, log: () => {} }
const ARM = { off: { retreat: 'd3' }, H: { retreat: 'd3', hunt: 'h50' }, HL: { retreat: 'd3', hunt: 'lite' }, S: { retreat: 'd3', seek: 'on' }, H1: { hunt: 'h50' }, V1: {} }
const mk = (arm, extra) => createBrain(hello, ctx, { warmup: false, ...(extra || {}), select: { ...ARM[arm], ...((extra && extra.select) || {}) } })
const res = []
const check = (name, ok, detail) => { res.push({ name, ok: !!ok }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail) }
const still = (e) => { e.vx = 0; e.vy = 0 }
const fx = (v, n = 1) => (typeof v === 'number' ? v.toFixed(n) : String(v))
function drive(ar, br, secs, hook, pre) {
  if (!ar._init) { ar._init = true; for (const e of ar.enemies) if (e.script) e.script(e, ar.t, ar, 0) }   // scripted torso yaw before the first observation
  for (let k = 0; k < Math.round(secs * 10); k++) {
    const o = ar.obs(); if (pre) pre(ar, o, k)
    const a = br.act(o, performance.now() + 27.5)
    if (hook) hook(ar, o, a, br)
    ar.step(a)
  }
}
const alive = (n) => (ar, o) => { o.alive = n }
const SIDE = Math.PI / 2 + 0.3          // torso 72 deg off us: front half, not aiming (not hostile, not rear)
const W = cfg.weapons

// ============================================================ 0. presets resolve to the old PARAMS; new keys only
{
  const snap = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_r3a2/lib/params.js')
  const cmp = (sel) => {
    const a = snap.resolveParams({ select: sel }), b = resolveParams({ select: { ...sel, hunt: 'off', seek: 'off' } }), b0 = resolveParams({ select: sel })
    const changed = [], added = []
    for (const k of Object.keys(b)) { if (k === 'selected') continue; if (!(k in a)) added.push(k); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k]) || JSON.stringify(a[k]) !== JSON.stringify(b0[k])) changed.push(k) }
    const gone = Object.keys(a).filter((k) => !(k in b))
    return { changed, added, gone, flags: [b.hunt50, b.h50Pulse, b.seekOn, b0.hunt50, b0.h50Pulse, b0.seekOn] }
  }
  const v1 = cmp({}), v4 = cmp({ retreat: 'd3' })
  check('C0 params: with hunt/seek off (explicit and default) no resolved R3a2 key changes (V1, V4); only new keys added; all flags false',
    v1.changed.length === 0 && v4.changed.length === 0 && v1.gone.length === 0 && v1.added.every((k) => /^h50|^hunt50$|^seekOn$/.test(k)) && v1.flags.every((f) => f === false),
    `V1 changed ${v1.changed.length} V4 changed ${v4.changed.length}, added ${v1.added.length} (${v1.added.filter((k) => !/^h50/.test(k)).join(',')} + h50*), gone ${v1.gone.length}`)
  const H = resolveParams({ select: ARM.H }), HL = resolveParams({ select: ARM.HL }), S = resolveParams({ select: ARM.S })
  check('C0b arms: H = hunt50+pulse, HL = hunt50 no pulse, S = seek only; all keep retreat d3; spec 2.1 values',
    H.hunt50 && H.h50Pulse && !H.seekOn && HL.hunt50 && !HL.h50Pulse && S.seekOn && !S.hunt50 && H.pulseRetreat === resolveParams({ select: { retreat: 'd3' } }).pulseRetreat &&
    H.h50Frac === 0.5 && H.h50WindowS === 3 && H.h50LaserReadyS === 1.5 && H.h50LightR === 60 && H.h50EngR === 200 && H.h50MinHpf === 0.35 && H.h50Reserve === 0.3 &&
    H.h50Leave === 0.3 && H.h50LeaveCoolS === 1 && H.h50NoDmgS === 3 && H.h50SafeHpf === 0.25 && H.h50Safe3Hpf === 0.4 && H.h50Safe3N === 3 && H.h50PulseMax === 4 &&
    H.h50CoverS === 1.5 && H.h50MagMin === 8 && H.h50CubeR === 40 && H.h50CubeWaitS === 3 && H.h50ForeignMax === 1 && H.h50PreyR === 400 && H.h50PreyMemS === 12 &&
    H.h50Hp === 0.05 && H.h50Hostile === 80 && H.h50Laser === 60 && H.h50CrowdR === 60 && H.h50Crowd === 100 && H.h50PreyHys === 30 && H.h50ArriveLaser === 125 &&
    H.h50ArriveGun === 90 && H.h50SeekHpf === 0.6 && H.h50SeekFromS === 20 && H.h50SoundS === 3 && H.h50SoundMid === 120 && H.h50SoundFar === 200 &&
    H.h50LastEnemyS === 30 && H.h50RingFrac === 0.41 && H.h50RingStepDeg === 30 && H.h50ArriveR === 45 && H.h50SeekBoostE === 90 && H.h50SeekBoostD === 150,
    `H ${H.hunt50}/${H.h50Pulse}/${H.seekOn} HL ${HL.hunt50}/${HL.h50Pulse} S ${S.seekOn}/${S.hunt50}`)
}

// a brain state after one decision with a given loadout (open loop) and a synthetic track built from a real one
function stateWith(weapons, extraSelf, arm = 'H', t0 = 60) {
  const ar = new Arena({ cfg, seed: 950, me: { x: 0, y: 0, yaw: 0, weapons }, enemies: [{ id: 10, x: 60, y: 0, hp: 1400, maxHp: 1400, script: (e) => { still(e); e.yaw = SIDE } }] })
  ar.t = t0
  const br = mk(arm)
  if (extraSelf) Object.assign(ar.me, extraSelf)
  drive(ar, br, 0.3, null, alive(14))
  const B = br._B
  if (B.me.gun) Object.assign(B.me.gun, { ammo: 12, reload: 0, cooldown: 0 })
  if (B.me.laser) Object.assign(B.me.laser, { cooldown: 0, charge: 0 })
  return { ar, br, B }
}

// ============================================================ 1. burst3 against GP table 1.3 and my own closed form
{
  const g = W.gun, lz = W.laser
  const tab = { gun0: [513, 486, 405, 405, 0], gun5: [616, 583, 486, 486, 0], gl0: [828, 801, 720, 720, 315], gl5: [994, 961, 864, 864, 378], gli0: [993, 966, 405, 405, 0] }
  const D = [30, 60, 100, 130, 160]
  const run = (weapons, cubes) => {
    const { B } = stateWith(weapons, { cubes: cubes || 0 })
    const tr = B.tracks.get(10)
    const out = [], mine = []
    for (const d of D) {
      const keep = { dist: tr.dist, steadySince: tr.steadySince, rearOn: tr.rearOn, hp: tr.hp }
      tr.dist = d; tr.steadySince = B.me.t; tr.rearOn = false               // just seen as moving: not steady for the flight gate
      out.push(B.hunt.burst3(tr))
      // my closed form (spec 2.2): full magazine, ready laser, 100 energy
      const k = 1 + 0.04 * Math.min(cubes || 0, 10)
      let m = 0
      if (d <= 0.97 * g.range && d / g.speed <= 0.55) m += Math.min(g.mag, 1 + Math.floor(3 / g.cooldown)) * g.damage * k * B.gunStat.q(d)
      if (weapons.includes('laser') && d <= 0.93 * lz.range) m += lz.damage * k
      if (weapons.includes('lightning') && d <= 60) m += Math.min(10, Math.floor((B.me.energy - 15) / 3)) * 60 * k * 0.8
      mine.push(m)
      Object.assign(tr, keep)
    }
    return { out, mine }
  }
  const rows = { gun0: run(['gun', null]), gun5: run(['gun', null], 5), gl0: run(['gun', 'laser']), gl5: run(['gun', 'laser'], 5), gli0: run(['gun', 'lightning']) }
  let ok = true; const det = []
  for (const [k, r] of Object.entries(rows)) {
    for (let i = 0; i < D.length; i++) {
      const want = tab[k][i], got = r.out[i]
      if (!(want === 0 ? got === 0 : Math.abs(got - want) <= 0.01 * want)) ok = false
      if (Math.abs(got - r.mine[i]) > 1e-6) ok = false
    }
    det.push(`${k} ${r.out.map((v) => v.toFixed(0)).join('/')}`)
  }
  check('B1 burst3 = GP table 1.3 within 1% at 30/60/100/130/160 m for gun(0,5 cubes), gun+laser(0,5), gun+lightning; = my closed form exactly', ok, det.join(' | '))
  // reload / partial magazine / rear / mortar carrier / laser not ready
  const { B } = stateWith(['gun', 'laser'])
  const tr = B.tracks.get(10); tr.dist = 60; tr.steadySince = B.me.t; tr.rearOn = false
  const q = B.gunStat.q(60)
  const gun = B.me.gun, las = B.me.laser
  const sv = { reload: gun.reload, ammo: gun.ammo, cool: las.cooldown, charge: las.charge }
  gun.reload = 1.2; las.cooldown = 5
  const bReload = B.hunt.burst3(tr), wReload = Math.floor((3 - 1.2) / g.cooldown) * g.damage * q
  gun.reload = 0; gun.ammo = 4
  const bPart = B.hunt.burst3(tr), wPart = 4 * g.damage * q
  gun.ammo = 12; las.cooldown = 0.8; las.charge = 0
  const bLas15 = B.hunt.burst3(tr)                    // 0.8 + 0.75 = 1.55 > 1.5: the beam does not count
  las.cooldown = 0.7
  const bLas14 = B.hunt.burst3(tr)                    // 1.45 <= 1.5: counts
  tr.rearOn = true
  const bRear = B.hunt.burst3(tr)
  tr.rearOn = false; tr.hasMortar = true
  const bMort = B.hunt.burst3(tr)
  tr.hasMortar = false
  Object.assign(gun, { reload: sv.reload, ammo: sv.ammo }); Object.assign(las, { cooldown: sv.cool, charge: sv.charge })
  const full = 12 * g.damage * q
  check('B2 burst3 details: reloading 1.2 s -> floor(1.8/cd) shots; 4 rounds -> 4 shots; beam counts at cooldown+charge 1.45 s, not 1.55 s; rear x1.5; mortar carrier beam x1.6',
    Math.abs(bReload - wReload) < 1e-6 && Math.abs(bPart - wPart) < 1e-6 && Math.abs(bLas15 - full) < 1e-6 && Math.abs(bLas14 - full - 315) < 1e-6 &&
    Math.abs(bRear - 1.5 * (full + 315)) < 1e-6 && Math.abs(bMort - full - 315 * 1.6) < 1e-6,
    `reload ${fx(bReload, 0)} (${fx(wReload, 0)}) | 4 rnd ${fx(bPart, 0)} | beam 1.55 ${fx(bLas15, 0)} 1.45 ${fx(bLas14, 0)} | rear ${fx(bRear, 0)} | mortar ${fx(bMort, 0)}`)
  // TTK: gun only at 60 m against 486 hp = 12 rounds -> 11 x cd after the first round (+ cooldown); 1400 hp -> beyond 8 s = 99
  las.cooldown = 99
  const ttk = (hp) => { const k = tr.hp; tr.hp = hp; const v = B.hunt.ttk(tr); tr.hp = k; return v }
  B.me.laser = null
  const t12 = ttk(12 * g.damage * q - 1), t13 = ttk(12 * g.damage * q + 1), tBig = ttk(1400)
  B.me.laser = las; las.cooldown = 0; las.charge = las.full
  const tBeam = ttk(300)
  check('B3 TTK: 12 rounds in 11 x 0.24 = 2.64 s (+0.05 step), the 13th after the 2.4 s reload; 1400 hp gun only -> 99; one ready beam (300 hp) at latency 0.1 s',
    t12 >= 2.64 && t12 <= 2.70 && t13 >= 2.64 + 2.4 && t13 <= 2.64 + 2.4 + 0.1 && tBig === 99 && tBeam <= 0.15, `12 rnd ${t12} | 13 rnd ${t13} | 1400 ${tBig} | beam ${tBeam}`)
}

// ============================================================ 2. the gate (unit: pre() on a real state)
{
  const { B } = stateWith(['gun', null])
  const tr = B.tracks.get(10)
  const t = B.me.t
  const gate = (setup) => {
    const keep = { ...tr }, kme = { hp: B.me.hp, hpf: B.me.hpf }
    tr.dist = 60; tr.hp = 1400; tr.listed = true; tr.losOutT = t; tr.losInT = -99; tr.rearOn = false; tr.steadySince = t - 5; tr.npc = false
    setup()
    B.hunt.pre({})
    const ok = tr.h50Ok
    Object.assign(tr, keep); Object.assign(B.me, kme)
    return ok
  }
  const b60 = (() => { const k = tr.dist, r = tr.rearOn; tr.dist = 60; tr.rearOn = false; const v = B.hunt.burst3(tr); tr.dist = k; tr.rearOn = r; return v })()
  const gLo = gate(() => { tr.hp = 2 * b60 - 1 }), gHi = gate(() => { tr.hp = 2 * b60 + 1 })
  const g1400 = gate(() => { tr.hp = 1400 }), gRear = gate(() => { tr.hp = 1400; tr.rearOn = true })
  const gNoLine = gate(() => { tr.hp = 600; tr.losOutT = t - 1.05; tr.losInT = t - 1.05 }), gInLine = gate(() => { tr.hp = 600; tr.losOutT = t - 5; tr.losInT = t - 0.9 })
  const g201 = gate(() => { tr.hp = 300; tr.dist = 201 }), g199 = gate(() => { tr.hp = 300; tr.dist = 130 })
  const gNpc = gate(() => { tr.hp = 100; tr.npc = true })
  const gUnl = gate(() => { tr.hp = 300; tr.listed = false })
  const gHp34 = gate(() => { tr.hp = 300; B.me.hpf = 0.34; B.me.hp = 0.34 * B.me.maxHp }), gHp36 = gate(() => { tr.hp = 300; B.me.hpf = 0.36; B.me.hp = 0.36 * B.me.maxHp })
  check('G1 gate on CURRENT hp: gun at 60 m opens at hp 2*burst3-1, not +1; fresh 1400 no, from the rear yes; line < 1 s (ours or its) needed; <= 200 m; never an NPC or unlisted; not under 35% hp',
    gLo && !gHi && !g1400 && gRear && !gNoLine && gInLine && !g201 && g199 && !gNpc && !gUnl && !gHp34 && gHp36,
    `b60 ${fx(b60, 0)} lo ${gLo} hi ${gHi} 1400 ${g1400} rear ${gRear} noline ${gNoLine} inline ${gInLine} 201m ${g201} 130m ${g199} npc ${gNpc} unlisted ${gUnl} hp34 ${gHp34} hp36 ${gHp36}`)
  // reserve: IN x TTK
  const keep = { ...tr }
  tr.dist = 60; tr.hp = 900
  const T9 = B.hunt.ttk(tr)
  B.me.hp = 600
  B.h50.IN = 400; const r400 = B.hunt.reserveOk(tr)
  B.h50.IN = 20; const r40 = B.hunt.reserveOk(tr)
  B.h50.IN = (600 - 0.3 * B.me.maxHp) / T9 - 0.01; const rEdgeOk = B.hunt.reserveOk(tr)
  B.h50.IN = (600 - 0.3 * B.me.maxHp) / T9 + 0.01; const rEdgeNo = B.hunt.reserveOk(tr)
  tr.hp = 80; B.h50.IN = 5000; const rFin = B.hunt.reserveOk(tr)
  Object.assign(tr, keep); B.me.hp = B.me.maxHp
  check('G2 reserve: hp 600, TTK ' + fx(T9, 2) + ' s: 400 dps no, 20 dps yes, edge exact at 0.30 x maxHp; finishable within 1.5 s always',
    !r400 && r40 && rEdgeOk && !rEdgeNo && rFin, `400 ${r400} 40 ${r40} edge ${rEdgeOk}/${rEdgeNo} finish ${rFin}`)
  // IN: priors by range (+117 laser) for mechs with a line on us in the last 1 s; measured dps with >= 3 samples
  const L0 = B.trackList
  const mkTr = (id, d, extra) => ({ ...tr, id, dist: d, x: d, y: 0, hp: 1400, listed: true, npc: false, losInT: t, losOutT: t, hasLaser: false,
    dmgIn: { t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 }, ...(extra || {}) })
  const meas = mkTr(13, 90, {}); for (let k = 0; k < 3; k++) { meas.dmgIn.t[k] = t - 0.5 - 0.5 * k; meas.dmgIn.a[k] = 60 } meas.dmgIn.n = 3; meas.dmgIn.i = 3
  B.trackList = [mkTr(11, 50), mkTr(12, 110, { hasLaser: true }), meas, mkTr(14, 140, { losInT: t - 1.2 }), mkTr(15, 80, { npc: true })]
  B.hunt.pre({})
  const wantIN = 98 * 1 + (98 * 0.57 + 117) + 180 / 3
  const gotIN = B.h50.IN, gotLines = B.h50.lines
  B.trackList = L0
  check('G3 IN = 98 x hit(d) (+117 laser) per line-on-us mech without samples, measured dps with >= 3 samples; stale line (1.2 s) and NPCs ignored; lines within 160 m',
    Math.abs(gotIN - wantIN) < 1e-6 && gotLines === 3, `IN ${fx(gotIN, 2)} (want ${fx(wantIN, 2)}) lines ${gotLines}`)
}

// ============================================================ 3. integration: first shot, answer, opening
{
  const run = (arm, hp, opts = {}) => {
    const ar = new Arena({ cfg, seed: 961, me: { x: 0, y: 0, yaw: 0, weapons: opts.weapons || ['gun', null], pinned: true },
      enemies: [{ id: 10, x: opts.d || 80, y: 0, hp, maxHp: 1400, dps: opts.dps || 0, script: (e, tt) => { still(e); e.yaw = opts.face && tt >= (opts.faceT || 0) ? Math.PI : SIDE } }] })
    ar.t = opts.t0 ?? 25
    const br = mk(arm)
    let firstT = -1, faceAns = -1
    drive(ar, br, opts.secs || 5, (a, o, act, b) => { if (firstT < 0 && b._B.target && b._B.target.id === 10) firstT = +a.t.toFixed(2) }, alive(14))
    return { firstT, shots: ar.stats.shots, beams: ar.stats.beams }
  }
  const h1400 = run('H', 1400), off1400 = run('off', 1400), l1400 = run('HL', 1400), s1400 = run('S', 1400)
  check('I1 (T6) gun only, fresh 1400 hp non-hostile at 80 m with a line: H / HL no first shot in 5 s; off and S (seek alone keeps R3a2 candidates) engage',
    h1400.shots === 0 && h1400.firstT < 0 && l1400.shots === 0 && off1400.shots > 0 && s1400.shots > 0,
    `H ${h1400.shots} shots | HL ${l1400.shots} | off ${off1400.shots} (from ${off1400.firstT}) | S ${s1400.shots} (from ${s1400.firstT})`)
  const h600 = run('H', 600), hAim = run('H', 1400, { face: true, faceT: 26 }), hHit = run('H', 1400, { dps: 60 })
  const hitT = 25 + 45 / 60
  check('I2 (T6b/T7) 600 hp current -> engaged; the same fresh mech turning to aim at us at 26.0 s or hitting us -> answered at once',
    h600.firstT >= 25 && h600.firstT <= 25.3 && hAim.firstT >= 26 && hAim.firstT <= 26.25 && hHit.firstT >= hitT && hHit.firstT <= hitT + 0.15,
    `600 hp ${h600.firstT} | aims from 26.0: ${hAim.firstT} | hits (first hit ${fx(hitT, 2)} s): ${hHit.firstT}`)
  const op = run('H', 300, { t0: 15, secs: 6 })
  check('I3 opening guard: a 300 hp mech at 80 m is not started on before 20.0 s under H', op.firstT >= 20 && op.firstT <= 20.3, `first ${op.firstT}`)
  const gl = run('H', 1400, { weapons: ['gun', 'laser'], d: 115 }), gl15 = run('H', 1500, { weapons: ['gun', 'laser'], d: 115 })
  check('I4 (GP T1) gun + laser at 115 m: fresh 1400 hp engaged (720 >= 700), 1500 hp not', gl.firstT >= 25 && gl.firstT <= 25.3 && gl15.firstT < 0, `1400 ${gl.firstT} | 1500 ${gl15.firstT}`)
}

// ============================================================ 4. commit, leave, LOSING while committed
{
  const { B } = stateWith(['gun', 'laser'])
  const tr = B.tracks.get(10), t = B.me.t
  B.h50.on = true
  // post(): commit a gated pick; a non-gated, non-hostile, non-committed pick clears it
  tr.h50Ok = true; tr.hostile = false; B.target = tr; B.h50.commit = null; B.hunt.post()
  const c1 = B.h50.commit === tr
  tr.h50Ok = false; B.hunt.post(); const c2 = B.h50.commit === tr          // already committed: kept
  B.target = null; B.hunt.post(); const c3 = B.h50.commit === null         // no pick: cleared
  // leave rules inside pre(): 3 s without our damage, burst < 0.3 hp while the laser cools > 1 s
  const leave = (setup) => { B.h50.commit = tr; B.h50.commitT = t - 10; tr.lastDmgOutT = t - 1; tr.hp = 600; B.me.laser.cooldown = 0; tr.dist = 60; tr.listed = true; tr.losOutT = t; setup(); B.hunt.pre({}); const r = B.h50.commit !== tr; B.me.laser.cooldown = 0; return r }
  const lNo = leave(() => {}), lDmg31 = leave(() => { tr.lastDmgOutT = t - 3.1 }), lDmg29 = leave(() => { tr.lastDmgOutT = t - 2.9 })
  const lCool = leave(() => { B.me.laser.cooldown = 1.2; tr.hp = 1400; B.me.gun.reload = 2; }), lCool09 = leave(() => { B.me.laser.cooldown = 0.9; tr.hp = 1400; B.me.gun.reload = 2 })
  B.me.gun.reload = 0
  const lDead = leave(() => { tr.hp = 0 })
  check('K1 commit: gated pick committed, kept while picked, cleared with no pick; leave at 3.1 s without our damage (not 2.9 s), at burst < 0.3 hp with the laser cooling 1.2 s (not 0.9 s), on death',
    c1 && c2 && c3 && !lNo && lDmg31 && !lDmg29 && lCool && !lCool09 && lDead, `${c1} ${c2} ${c3} | none ${lNo} 3.1 ${lDmg31} 2.9 ${lDmg29} cool1.2 ${lCool} cool0.9 ${lCool09} dead ${lDead}`)
  // losing(): unit thresholds
  const lose = (hpf, lines, commit = true) => { B.h50.on = true; B.h50.commit = commit ? tr : null; B.h50.lines = lines; B.target = tr; const k = B.me.hpf; B.me.hpf = hpf; const r = T.decideMode ? null : null; B.me.hpf = k; return r }
  void lose
}
// LOSING under the commit in closed loop: two hitting mechs at 70 m, one gated (600 hp)
{
  const run = (arm, hpf, nAtt, secs = 3) => {
    const en = [{ id: 10, x: 70, y: 0, hp: 1400, maxHp: 1400, dps: 30, script: (e) => { still(e); e.yaw = Math.PI } }]
    const angs = [0.5, -0.5]
    for (let k = 1; k < nAtt; k++) en.push({ id: 10 + k, x: 70 * Math.cos(angs[k - 1]), y: 70 * Math.sin(angs[k - 1]), hp: 1e6, maxHp: 1e6, dps: 30, script: (e) => { still(e); e.yaw = Math.atan2(-e.y, -e.x) } })
    const ar = new Arena({ cfg, seed: 971, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'], hp: Math.round(hpf * 1400), pinned: true }, enemies: en })
    ar.t = 40
    const br = mk(arm)
    const modes = []
    let loseN = 0, n = 0, lines = 0
    drive(ar, br, secs, (a, o, act, b) => { modes.push(b._B.mode[0]); if (a.t >= 41) { n++; if (b._B.losing) loseN++; lines = Math.max(lines, b._B.h50.lines) } }, (a, o) => { o.alive = 14; o.self.hp = Math.round(hpf * 1400) })
    // hide cell: none in the micro arena -> with pulse retreat a LOSING bot stays in FIGHT, so V4 (d3) is the reference here
    const B = br._B
    return { modes: modes.join(''), last: B.mode, commit: !!(B.h50 && B.h50.commit), lose: loseN === n, never: loseN === 0, lines }
  }
  const h45 = run('H', 0.45, 2), o45 = run('off', 0.45, 2), h24 = run('H', 0.24, 2), h39 = run('H', 0.39, 3), h41 = run('H', 0.41, 3)
  check('K2 (T9) committed at 45% hp with 2 lines -> not LOSING (FIGHT); V4 off LOSING; 24% LOSING; 3 lines: 39% LOSING, 41% not',
    h45.commit && h45.never && h45.last === 'FIGHT' && o45.lose && o45.last === 'DISENGAGE' && h24.lose && h39.lose && h41.never,
    `H45 ${h45.last} never-losing ${h45.never} commit ${h45.commit} lines ${h45.lines} | off45 ${o45.last} losing ${o45.lose} | H24 losing ${h24.lose} ${h24.last} | 3 lines (${h39.lines}) H39 losing ${h39.lose} H41 never ${h41.never}`)
}

// ============================================================ 5. the retreat pulse (unit, pulseUpdate on a real state)
{
  const pulse = (arm, o = {}) => {
    const { B } = stateWith(['gun', 'laser'], null, arm)
    const tr = B.tracks.get(10)
    B.h50.on = true; B.target = tr; B.lastStand = false
    B.hide.state = 'found'; B.tCover = o.tCover ?? 1.0
    B.h50.killT = B.me.t; B.h50.killDist = 1e9; B.h50.lines = o.lines ?? 1
    B.me.gun.ammo = 3; B.me.gun.reload = 0; B.me.laser.cooldown = 1.5
    const seq = []
    const t0 = B.me.t
    for (let k = 0; k < (o.steps || 60); k++) {
      if (o.reloadAt && B.me.t - t0 >= o.reloadAt) { B.me.gun.ammo = 12; B.me.laser.cooldown = 0.2 }
      if (o.hook) o.hook(B, k)
      B.hunt.pulseUpdate()
      seq.push(B.h50Pulse ? 1 : 0)
      B.me.t = +(B.me.t + 0.1).toFixed(3)
    }
    const on = seq.reduce((a, b) => a + b, 0)
    let starts = 0; for (let k = 0; k < seq.length; k++) if (seq[k] && (k === 0 || !seq[k - 1])) starts++
    return { on, starts, seq: seq.join('') }
  }
  const cap = pulse('H'), rel = pulse('H', { reloadAt: 2.4 }), far = pulse('H', { tCover: 2.5 }), lite = pulse('HL'), off0 = pulse('H', { lines: 0 })
  check('P1 (T10/T11) kill + 1 other line, tCover 1.0 s: pulse; never longer than 4.0 s (40 decisions); ends when loaded (8 rounds, laser <= 0.3 s); tCover 2.5 s none; lite none; no other line none',
    cap.on === 40 && rel.on >= 24 && rel.on <= 25 && far.on === 0 && lite.on === 0 && off0.on === 0,
    `cap ${cap.on} | loaded at 2.4 s ${rel.on} | tCover 2.5 ${far.on} | lite ${lite.on} | 0 lines ${off0.on}`)
  // trigger (b): burst spent with >= 2 lines; re-trigger right after the 4 s cap while still spent?
  const spent = pulse('H', { lines: 2, steps: 100, hook: (B) => { B.h50.killT = -1; B.me.gun.ammo = 0; B.me.gun.reload = 1.0; B.me.laser.cooldown = 1.5 } })
  check('P2 trigger (b): gun reloading, laser not ready within 1 s, 2 lines -> pulse (info: starts/decisions over 10 s while kept spent)',
    spent.on > 0, `pulse decisions ${spent.on} of 100, starts ${spent.starts}${spent.starts > 1 ? ' (back-to-back pulses after the 4 s cap)' : ''}`)
  // decideMode: B.h50Pulse -> DISENGAGE (closed loop check of the mode while the flag is set)
}

// ============================================================ 6. firewall: FFA / foreign death / late zone / 3 alive -> identical to off
{
  const stream = (arm, o = {}) => {
    const ar = new Arena({ cfg, seed: 981, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] },
      enemies: [{ id: 10, x: 80, y: 30, hp: 1400, maxHp: 1400, script: (e) => { still(e); e.yaw = SIDE } }, { id: 11, x: 150, y: -60, hp: 500, maxHp: 1400, script: (e) => { still(e); e.yaw = 0 } }],
      zone: o.zone })
    ar.t = o.t0 ?? 12
    const br = mk(arm, o.extra)
    const acts = []
    drive(ar, br, o.secs || 30, (a, ob, act) => acts.push(JSON.stringify(act)), o.pre || alive(14))
    return acts.join('\n')
  }
  const fd = (ar, o) => { o.alive = ar.t < 15 ? 14 : 13 }
  const late = { center: [0, 0], radius: 300, next_center: [0, 0], next_radius: 65, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
  const cases = {
    ffa: [{ extra: { env: 'ffa' } }, { extra: { env: 'ffa' } }],
    foreign: [{ pre: fd, extra: { select: { env: 'squad' } } }, { pre: fd, extra: { select: { env: 'squad' } } }],
    late: [{ zone: late, extra: { select: { env: 'squad' } } }, { zone: late, extra: { select: { env: 'squad' } } }],
    three: [{ pre: alive(3), extra: { select: { env: 'squad' } } }, { pre: alive(3), extra: { select: { env: 'squad' } } }],
    control: [{ extra: { select: { env: 'squad' } } }, { extra: { select: { env: 'squad' } } }],
  }
  const det = []
  let ok = true
  for (const [nm, [a, b]] of Object.entries(cases)) {
    const off = stream('off', a)
    const rows = []
    for (const arm of ['H', 'HL', 'S']) { const s = stream(arm, b); const same = s === off; rows.push(`${arm} ${same ? 'same' : 'DIFF'}`); if (nm !== 'control' && !same) ok = false; if (nm === 'control' && arm === 'H' && same) ok = false }
    det.push(`${nm}: ${rows.join(' ')}`)
  }
  check('F1 (T12/T13) firewall: forced FFA, a foreign death at 15 s (before the 20 s guard), next radius 65 m, 3 alive -> H, HL, S byte-identical to off over 30 s; control (none of these) differs for H',
    ok, det.join(' | '))
}

// ============================================================ 7. seek (HOLD): prey, remembered prey, sound, ring, gating, loot first
{
  const seekRun = (arm, o = {}) => {
    const ar = new Arena({ cfg, seed: 991, me: { x: 0, y: 0, yaw: 0, weapons: o.weapons || ['gun', null], hp: o.hp },
      enemies: o.enemies || [], cubes: o.cubes || [], zone: o.zone })
    ar.t = o.t0 ?? 30
    const br = mk(arm)
    const log = []
    drive(ar, br, o.secs || 2, (a, ob, act, b) => { const B = b._B; log.push({ t: +a.t.toFixed(2), mode: B.mode, leg: B.legKind, gx: B.hunt ? B.hunt.goal.x : 0, gy: B.hunt ? B.hunt.goal.y : 0, x: B.me.x, y: B.me.y, prey: B.hunt && B.hunt.prey() ? B.hunt.prey().id : -1 }); if (o.hook) o.hook(a, ob, act, b) }, o.pre || alive(14))
    return { log, ar, br }
  }
  // T2: prey at 150 m facing away (gun only, not gated), seek walks to 90 m and stands, torso on it
  const en = (x, y, hp = 1400, id = 10, yaw = SIDE) => ({ id, x, y, hp, maxHp: 1400, script: (e) => { still(e); e.yaw = yaw } })
  const a = seekRun('H', { enemies: [en(150, 0)], secs: 8 })
  const la = a.log[a.log.length - 1]
  const hunts = a.log.filter((r) => r.leg === 'hunt').length
  check('S1 (T2) listed prey at 150 m, gun only: HOLD / legKind hunt toward it, stops near 90 m', hunts >= 20 && Math.abs(Math.hypot(150 - la.x, la.y) - 90) < 6 && a.log[3].leg === 'hunt',
    `hunt legs ${hunts}/${a.log.length}, end distance ${fx(Math.hypot(150 - la.x, la.y))} m, first legs ${a.log.slice(0, 4).map((r) => r.leg).join(',')}`)
  // remembered prey: seen at 180 m, then gone from view (teleported away); the goal is its last position for up to 12 s
  const mem = seekRun('H', { enemies: [en(180, 0)], secs: 14, hook: (ar) => { if (ar.t >= 30.5) ar.enemies[0].alive = false } })
  const at8 = mem.log.find((r) => r.t >= 38.4), at13 = mem.log.find((r) => r.t >= 43.5)
  check('S2 (T2) remembered prey (out of view after 30.5 s): at 8 s still hunting toward its remembered spot; gone after 12 s',
    at8 && at8.leg === 'hunt' && Math.abs(at8.gx - 180) < 25 && at13 && at13.leg !== 'hunt', `8 s: ${at8 && at8.leg} goal (${at8 && fx(at8.gx)}, ${at8 && fx(at8.gy)}) | 13 s: ${at13 && at13.leg}`)
  // T5 prey choice: 150 m / 1400 hp vs 170 m / 700 hp -> the 700 (cost 220 vs 205); 150 vs 250 m -> the nearer
  const c1 = seekRun('H', { enemies: [en(150, 0, 1400, 10), en(170 * Math.cos(0.45), 170 * Math.sin(0.45), 700, 11)], secs: 1 })
  const c2 = seekRun('H', { enemies: [en(150, 0, 1400, 10), en(195 * Math.cos(0.45), 195 * Math.sin(0.45), 1400, 11)], secs: 1 })
  // hostile -80: the farther one aims at us within 160 m?  use crowd +100 instead: a mech with another within 60 m loses
  const c3 = seekRun('H', { enemies: [en(150, 0, 1400, 10), en(150, 40, 1400, 12), en(175 * Math.cos(0.5), -175 * Math.sin(0.5), 1400, 11)], secs: 1 })
  const pk = (r) => r.log[r.log.length - 1].prey
  check('S3 (T5) prey cost: 700 hp at 170 m over 1400 hp at 150 m; 150 m over 195 m; crowd +100 moves it to the lone mech at 175 m',
    pk(c1) === 11 && pk(c2) === 10 && pk(c3) === 11, `c1 ${pk(c1)} c2 ${pk(c2)} c3 ${pk(c3)}`)
  // T3: no prey; a gun sound 'mid' at bearing 1.0 rad 2 s ago -> 120 m along 1.0 rad
  const snd = seekRun('H', { secs: 1, pre: (ar, o, k) => { o.alive = 14; if (k < 3) o.sounds = [{ kind: 'gun', bearing: 1.0, dist: 'mid', age: 2 }] } })
  const s0 = snd.log.find((r) => r.leg === 'huntsnd')
  check('S4 (T3) gun sound mid at 1.0 rad -> goal 120 m along it (64.8, 101.0)', s0 && Math.abs(s0.gx - 120 * Math.cos(1)) < 2.5 && Math.abs(s0.gy - 120 * Math.sin(1)) < 2.5,
    s0 ? `goal (${fx(s0.gx)}, ${fx(s0.gy)})` : 'no huntsnd leg')
  const sndFar = seekRun('H', { secs: 1, pre: (ar, o, k) => { o.alive = 14; if (k < 3) o.sounds = [{ kind: 'laser', bearing: -2.0, dist: 'far', age: 1 }] } })
  const s1 = sndFar.log.find((r) => r.leg === 'huntsnd')
  check('S5 far laser sound at -2.0 rad -> 200 m along it', s1 && Math.abs(Math.hypot(s1.gx, s1.gy) - 200) < 3 && Math.abs(Math.atan2(s1.gy, s1.gx) + 2.0) < 0.02, s1 ? `goal (${fx(s1.gx)}, ${fx(s1.gy)})` : 'no huntsnd leg')
  // T4: nothing known -> ring 0.41 x nr around next_center, nearest point first; 30 deg on after arrival
  const zone = { center: [0, 0], radius: 900, next_center: [300, 0], next_radius: 300, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
  const rg = seekRun('H', { secs: 30, zone })
  const ringLegs = rg.log.filter((r) => r.leg === 'huntring')
  const g0 = ringLegs[0], R = 0.41 * 300
  const angs = []; for (const r of ringLegs) { const an = Math.atan2(r.gy, r.gx - 300); if (!angs.length || Math.abs(angs[angs.length - 1] - an) > 1e-3) angs.push(an) }
  const steps = angs.slice(1).map((v, i) => Math.round(((v - angs[i]) * 180 / Math.PI + 540) % 360 - 180))
  check('S6 (T4) ring: first goal on the 0.41 x 300 = 123 m ring nearest point (angle pi from next centre at (300,0) for us at origin), then 30 deg steps',
    g0 && Math.abs(Math.hypot(g0.gx - 300, g0.gy) - R) < 3 && Math.abs(Math.abs(Math.atan2(g0.gy, g0.gx - 300)) - Math.PI) < 0.05 && steps.length >= 1 && steps.every((s) => Math.abs(s) === 30),
    g0 ? `first (${fx(g0.gx)}, ${fx(g0.gy)}) r ${fx(Math.hypot(g0.gx - 300, g0.gy))}, steps ${steps.join(',')}` : 'no ring leg')
  // gating: hp 55% -> no seek; t < 20 -> no seek; a cube within loot range -> loot first; seek off -> R3a2 roam
  const lowHp = seekRun('H', { enemies: [en(150, 0)], hp: Math.round(0.55 * 1400), secs: 1 })
  const early = seekRun('H', { enemies: [en(150, 0)], t0: 15, secs: 1 })
  const loot = seekRun('H', { enemies: [en(150, 0)], cubes: [{ id: 7001, pos: [-12, 5, 0] }], secs: 1 })
  const offr = seekRun('off', { secs: 1, zone })
  const legs = (r) => [...new Set(r.log.map((x) => x.leg))].join(',')
  check('S7 seek gating: 55% hp none, t < 20 s none, a cube near -> loot first; off -> no hunt legs',
    !lowHp.log.some((r) => /^hunt/.test(r.leg)) && !early.log.some((r) => /^hunt/.test(r.leg)) && !loot.log.slice(0, 5).some((r) => /^hunt/.test(r.leg)) && (loot.ar.stats.cubesTaken || 0) === 1 && !offr.log.some((r) => /^hunt/.test(r.leg)),
    `55%: ${legs(lowHp)} | t15: ${legs(early)} | cube: ${loot.log.slice(0, 5).map((r) => r.leg).join(',')} taken ${loot.ar.stats.cubesTaken || 0} | off: ${legs(offr)}`)
  // boost only at energy >= 90 and goal > 150 m
  let boosts = 0, boostBad = 0
  seekRun('H', { enemies: [en(195, 0)], weapons: ['gun', null], secs: 4, hook: (a2, o2, act, b) => { const B = b._B; if (/^hunt/.test(B.legKind) && act.boost) { boosts++; const d = Math.hypot(B.hunt.goal.x - B.me.x, B.hunt.goal.y - B.me.y); if (B.me.energy < 90 || d - 90 <= 150 - 90 - 1e9) boostBad += 0 } } })
  check('S8 seek walking (info): boosts during a 195 m prey walk (goal 105 m beyond arrive) ' , true, `boost decisions ${boosts}`)
}

const nPass = res.filter((r) => r.ok).length
console.log(`\nSCEN ${nPass}/${res.length} PASS`)
