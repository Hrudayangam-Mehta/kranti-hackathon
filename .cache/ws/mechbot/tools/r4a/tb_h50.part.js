// ============================================================================ group h50: build R4a (notes/build_spec_r4.md section 2)
// hunt (off / h50 / lite) and seek (off / on) on the leader's presets (V4 = V1 + retreat d3) unless a test says otherwise.
if (want('h50')) {
  const W = cfg.weapons
  const HB = (sel, over, ctx) => createBrain0(hello, ctx || ctxNone, { warmup: false, ...(over || {}), select: { retreat: 'd3', ...(sel || {}) } })
  const driveH = (ar, br, secs, hook, pre) => { for (let k = 0; k < Math.round(secs * 10); k++) { const o = ar.obs(); if (pre) pre(ar, o, k); const t0 = performance.now(); const a = br.act(o, t0 + 27.5); allTimes.push(performance.now() - t0); if (hook) hook(ar, o, a, br, k); ar.step(a) } }
  const alive = (n) => (a, o) => { o.alive = n }
  const wobs = (weapons, extra) => {
    const o = JSON.parse(JSON.stringify(streamObs[0]))
    o.mechs = []; o.events = []; o.sounds = []; o.t = 60; o.alive = 12
    o.self.weapons = weapons.map((k) => k === 'gun' ? { kind: 'gun', ammo: 12, reload: 0, cooldown: 0, stats: W.gun } : k === 'laser' ? { kind: 'laser', charge: 0, cooldown: 0, stats: W.laser } : { kind: k, cooldown: 0, stats: W[k] })
    o.self.energy = 100; o.self.cubes = 0; o.self.hp = cfg.mech.hp; o.self.max_hp = cfg.mech.hp
    return Object.assign(o, extra || {})
  }
  const ring0 = () => ({ t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 })
  const fill = (r, t, n, amt) => { for (let k = 0; k < n; k++) { r.t[k] = t - 0.2 - 0.5 * k; r.a[k] = amt } r.n = n; r.i = n }
  const trk = (B, id, d, extra) => ({ id, kind: 'mech', npc: false, listed: true, phantom: false, conf: 1, x: B.me.x + d, y: B.me.y, z: 0, vx: 0, vy: 0, evx: 0, evy: 0, hp: 1400, maxHp: 1400, dist: d, bearing: 0, yaw: Math.PI,
    rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, steadySince: B.me.t, losOut: true, losIn: false, losOutT: B.me.t, losInT: -99, lastSeen: B.me.t,
    lastDmgInT: -99, lastDmgOutT: -99, dmgIn: ring0(), dmgOut: ring0(), hostile: false, aimAtMe: false, finishable: false, h50Ok: false, a: 0, b: 100, magN: 0, lastBulletT: -99, ...(extra || {}) })
  const setTracks = (B, L) => { B.trackList = L; B.tracks = new Map(L.map((tr) => [tr.id, tr])) }

  // T1 burst3 table (GP 1.3, within 1%) and the gate on current hp
  {
    const b3 = (weapons, d, extra, cubes) => {
      const br = HB({ hunt: 'h50' }); const B = br._B
      br.act(wobs(weapons, cubes ? { self: { ...wobs(weapons).self, cubes } } : null), performance.now() + 27)
      const tr = trk(B, 10, d, { steadySince: d > 140 ? B.me.t : -99, ...(extra || {}) })
      return B.hunt.burst3(tr)
    }
    const near = (v, w) => Math.abs(v - w) <= 0.01 * w
    const g30 = b3(['gun'], 30), g60 = b3(['gun'], 60), g100 = b3(['gun'], 100), g130 = b3(['gun'], 130), g160 = b3(['gun'], 160)
    const g5 = b3(['gun'], 30, null, 5), gl30 = b3(['gun', 'laser'], 30), gl100 = b3(['gun', 'laser'], 100), gl160 = b3(['gun', 'laser'], 160), gli30 = b3(['gun', 'lightning'], 30)
    const rear60 = b3(['gun'], 60, { rearOn: true })
    const tab = near(g30, 513) && near(g60, 486) && near(g100, 405) && near(g130, 405) && g160 === 0 && near(g5, 616) && near(gl30, 828) && near(gl100, 720) && near(gl160, 315) && near(gli30, 993)
    // gate words (GP T1): gun + laser at 115 m vs 1400 yes / 1500 no; gun at 60 m vs 1400 no / 900 yes / rear 1400 yes
    const gl115 = b3(['gun', 'laser'], 115)
    const words = gl115 >= 0.5 * 1400 && !(gl115 >= 0.5 * 1500) && !(g60 >= 0.5 * 1400) && g60 >= 0.5 * 900 && rear60 >= 0.5 * 1400
    check('h50 T1 burst3: gun 513 / 486 / 405 / 405 / 0 at 30 / 60 / 100 / 130 / 160 m, 5 cubes 616, gun + laser 828 / 720 / 315, gun + lightning 993 (GP 1.3, 1%); gate on current hp',
      tab && words, `gun ${[g30, g60, g100, g130, g160].map((v) => fx(v, 0)).join(' / ')} | 5 cubes ${fx(g5, 0)} | +laser ${[gl30, gl100, gl160].map((v) => fx(v, 0)).join(' / ')} | +lightning ${fx(gli30, 0)} | 115 m +laser ${fx(gl115, 0)} vs 700 / 750 | rear 60 m ${fx(rear60, 0)}`)
  }
  // T2 / T3 / T4 the seek: remembered prey, gunfire, parking ring (and seek 'on' alone; off = roam; hp 55% = roam)
  {
    const prey = (sel, hp) => {
      const ar = new Arena({ cfg, seed: 401, me: { x: 0, y: 0, yaw: 0, hp: hp || cfg.mech.hp } })
      ar.t = 40
      const br = HB(sel)
      let leg = '', gx = 0, gy = 0, mode = '', leg0 = ''
      driveH(ar, br, 8.05, (a, o, act, b, k) => { const B = b._B; leg = B.legKind; gx = B.goalX; gy = B.goalY; mode = B.mode; if (k === 2) leg0 = leg }, (a, o, k) => {
        o.alive = 14
        if (k === 0) o.mechs = [{ id: 10, kind: 'mech', pos: [300, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }]
      })
      return { leg, leg0, mode, g: [+gx.toFixed(1), +gy.toFixed(1)], x: +ar.me.x.toFixed(1) }
    }
    const p = prey({ hunt: 'h50' }), ps = prey({ seek: 'on' }), po = prey({}), plo = prey({ hunt: 'h50' }, 0.55 * cfg.mech.hp)
    const okP = p.mode === 'HOLD' && p.leg === 'hunt' && Math.hypot(p.g[0] - 300, p.g[1]) < 1 && p.x > 60 && ps.leg === 'hunt' && po.leg === 'roam' && plo.leg0 === 'roam'
    check('h50 T2 seek: a mech remembered 300 m away, seen 8 s ago -> HOLD, legKind hunt, goal at it (seek on alone too); hunt off -> roam; at 55% hp -> roam', okP,
      `h50 ${JSON.stringify(p)} | seek on ${ps.leg} | off ${po.leg} | 55% hp (0.2 s, before the regen) ${plo.leg0}`)
    const sound = (sel) => {
      const ar = new Arena({ cfg, seed: 402, me: { x: 0, y: 0, yaw: 0 } })
      ar.t = 40
      const br = HB(sel)
      let leg = '', g = null
      driveH(ar, br, 0.5, (a, o, act, b, k) => { if (k === 0) { leg = b._B.legKind; g = [+b._B.goalX.toFixed(1), +b._B.goalY.toFixed(1)] } }, (a, o, k) => { o.alive = 14; if (k === 0) o.sounds = [{ kind: 'gun', bearing: 1.0, dist: 'mid', age: 2.0 }] })
      return { leg, g }
    }
    const s = sound({ hunt: 'h50' }), ss = sound({ seek: 'on' }), so = sound({})
    const ex = [120 * Math.cos(1), 120 * Math.sin(1)]
    const okS = s.leg === 'huntsnd' && Math.hypot(s.g[0] - ex[0], s.g[1] - ex[1]) < 1 && ss.leg === 'huntsnd' && so.leg === 'roam'
    check('h50 T3 seek: nothing listed, a mid gun sound at 1.0 rad heard 2 s ago -> goal 120 m along 1.0 rad (seek on alone too; off -> roam)', okS,
      `h50 ${JSON.stringify(s)} (expected ${ex.map((v) => v.toFixed(1))}) | seek on ${ss.leg} | off ${so.leg}`)
    const ringRun = () => {
      const z = { center: [0, 0], radius: 400, next_center: [0, 0], next_radius: 300, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
      const ar = new Arena({ cfg, seed: 403, me: { x: -30, y: 0, yaw: 0 }, zone: z })
      ar.t = 40
      const br = HB({ hunt: 'h50' })
      const goals = []
      driveH(ar, br, 14, (a, o, act, b) => { const B = b._B; if (B.legKind !== 'huntring') return; const g = [+B.goalX.toFixed(1), +B.goalY.toFixed(1)]; const l = goals[goals.length - 1]; if (!l || Math.hypot(l[0] - g[0], l[1] - g[1]) > 1) goals.push(g) }, alive(14))
      return goals
    }
    const gs = ringRun()
    const R = 0.41 * 300, ang = gs.map((g) => Math.atan2(g[1], g[0]))
    const steps = ang.slice(1).map((a, i) => Math.abs(((a - ang[i] + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI)
    const okR = gs.length >= 2 && Math.hypot(gs[0][0] + R, gs[0][1]) < 1 && gs.every((g) => Math.abs(Math.hypot(g[0], g[1]) - R) < 1) && steps.every((d) => Math.abs(d - 30) < 1)
    check('h50 T4 seek: nothing known -> the 0.41 x next-radius ring point nearest to us, then 30 deg further after each arrival within 45 m', okR,
      `goals ${JSON.stringify(gs)} | ring R ${R.toFixed(1)} | steps ${steps.map((v) => v.toFixed(1)).join(', ')} deg`)
  }
  // T5 prey choice: 150 / 170 m with 1400 / 700 hp -> the 700 hp one; 150 / 250 m -> the nearer; reachability (roof, zone)
  {
    const pick = (dA, hpA, dB, hpB, ctx, extraA) => {
      const br = HB({ hunt: 'h50' }, null, ctx); const B = br._B
      br.act(wobs(['gun']), performance.now() + 27)
      B.me.t = 60; B.zone.known = false
      setTracks(B, [trk(B, 10, dA, { hp: hpA, listed: false, lastSeen: 55, ...(extraA || {}) }), trk(B, 11, dB, { hp: hpB, listed: false, lastSeen: 55 })])
      B.hunt.updatePrey()
      const p = B.hunt.prey()
      return p ? p.id : -1
    }
    const a = pick(150, 1400, 170, 700), b = pick(150, 1400, 250, 700), c = pick(150, 1400, 170, 1400, null, { hostile: true }), d = pick(150, 1400, 170, 1400, null, { hasLaser: true })
    // a mech on a roof (z 10 m above the ground) is not reachable prey
    let roof = -2
    {
      const br = HB({ hunt: 'h50' }, null, ctxMap); const B = br._B
      br.act(wobs(['gun']), performance.now() + 27)
      const q = nav.nearestPassable(0, 0, 80); B.me.x = q.x; B.me.y = q.y; B.me.t = 60; B.zone.known = false
      const qa = nav.nearestPassable(q.x + 140, q.y, 30), qb = nav.nearestPassable(q.x - 160, q.y, 30)
      const A = trk(B, 10, Math.hypot(qa.x - q.x, qa.y - q.y), { x: qa.x, y: qa.y, z: world.ground(qa.x, qa.y) + 10, hp: 700 }), Bt = trk(B, 11, Math.hypot(qb.x - q.x, qb.y - q.y), { x: qb.x, y: qb.y, z: world.ground(qb.x, qb.y), hp: 1400 })
      setTracks(B, [A, Bt]); B.hunt.updatePrey(); roof = B.hunt.prey() ? B.hunt.prey().id : -1
    }
    check('h50 T5 prey: 150 / 170 m at 1400 / 700 hp -> the 700 hp one; 150 / 250 m -> the nearer; equal hp: hostile -80 wins, laser +60 loses; a roof mech is skipped', a === 11 && b === 10 && c === 10 && d === 11 && roof === 11,
      `150/170 -> ${a} | 150/250 -> ${b} | hostile at 150 -> ${c} | laser at 150 -> ${d} | roof 700 hp vs ground 1400 hp -> ${roof}`)
  }
  // T6 / T7: gun only, a fresh 1400 hp non-hostile mech at 80 m with a line -> no first shot (off: shot); at 600 hp (current) the
  // gate opens; it fires at us -> answered at once
  {
    const run = (sel, hp, fireAt) => {
      const ar = new Arena({ cfg, seed: 404, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp, maxHp: 1400, dps: 0, script: (e, t, A) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI + 0.8; if (fireAt && t >= fireAt) { face(e, A); e.dps = 40 } } }] })
      ar.t = 40
      const br = HB(sel)
      let shots = 0, tgtAt = -1, hurtAt = -1, shotAt = -1
      driveH(ar, br, 6, (a, o, act, b) => {
        if (hurtAt < 0 && o.events.some((e) => e.type === 'damaged')) hurtAt = o.t
        if (b._B.target && b._B.target.id === 10 && tgtAt < 0) tgtAt = o.t
        if (act.fire[0]) { shots++; if (shotAt < 0) shotAt = o.t }
      }, alive(14))
      return { shots, tgtAt, hurtAt, shotAt }
    }
    const h = run({ hunt: 'h50' }, 1400), l = run({ hunt: 'lite' }, 1400), o = run({}, 1400), cur = run({ hunt: 'h50' }, 600)
    check('h50 T6 gate: gun only, fresh 1400 hp non-hostile mech at 80 m with a line -> no first shot (h50, lite); hunt off shoots; the same mech at 600 hp (current) -> engaged',
      h.shots === 0 && h.tgtAt < 0 && l.shots === 0 && o.shots > 0 && cur.shots > 0, `h50 ${JSON.stringify(h)} | lite ${l.shots} | off ${o.shots} | 600 hp: ${cur.shots} shots, target at ${cur.tgtAt}`)
    const f = run({ hunt: 'h50' }, 1400, 43)
    check('h50 T7: the same mech starts hitting us -> answered at once (target within 0.2 s of the first hit, shots follow)', f.hurtAt > 0 && f.tgtAt >= 0 && f.tgtAt - f.hurtAt <= 0.21 && f.shots > 0,
      `first hit ${f.hurtAt} s, target ${f.tgtAt} s, first shot ${f.shotAt} s, shots ${f.shots}`)
  }
  // T8 reserve: two lines totalling 400 dps, our hp 600, TTK about 2.6 s -> no commit on the non-hostile mech; 40 dps -> commit
  {
    const run = (dps) => {
      const br = HB({ hunt: 'h50' }); const B = br._B
      br.act(wobs(['gun']), performance.now() + 27)
      const t = B.me.t = 60; B.me.hp = 600; B.me.hpf = 600 / B.me.maxHp; B.aliveN = 12; B.foreignDeaths = 0; B.zone.known = false
      const T = trk(B, 10, 60, { hp: 486 })
      const L1 = trk(B, 11, 90, { losInT: t, losIn: true }), L2 = trk(B, 12, 95, { losInT: t, losIn: true })
      fill(L1.dmgIn, t, 4, dps * 3 / 8); fill(L2.dmgIn, t, 4, dps * 3 / 8)
      setTracks(B, [T, L1, L2])
      B.hunt.pre({ events: [], sounds: [] })
      return { ok: T.h50Ok, IN: +B.h50.IN.toFixed(0), ttk: B.hunt.ttk(T), b3: +B.hunt.burst3(T).toFixed(0) }
    }
    const hi = run(400), lo = run(40)
    check('h50 T8 reserve: target 486 hp at 60 m (burst 486), two lines of 400 dps in total, hp 600 -> gate shut; two lines of 40 dps -> open', !hi.ok && lo.ok && Math.abs(hi.IN - 400) <= 1,
      `400 dps: ${JSON.stringify(hi)} | 40 dps: ${JSON.stringify(lo)}`)
  }
  // T9 commit: committed at 45% hp with 2 lines -> FIGHT (d3 and pulse retreat would retreat); at 24% -> DISENGAGE; 3 lines at 39% -> DISENGAGE
  {
    const { decideMode } = await import('../bot/lib/tactics.js')
    const unit = (sel, hpf, lines, commit) => {
      const br = HB(sel); const B = br._B
      br.act(wobs(['gun']), performance.now() + 27)
      const t = B.me.t = 60; B.zone.known = false
      const A = trk(B, 10, 100, { hostile: true, losInT: t, lastDmgInT: t }), C = trk(B, 11, 120, { hostile: true, losInT: t, lastDmgInT: t })
      setTracks(B, [A, C])
      B.target = A; B.hide.state = 'found'; B.hide.dist = 12; B.hide.x = B.me.x - 12; B.hide.y = B.me.y; B.aliveN = 12; B.mode = 'FIGHT'; B.modeSince = 0
      B.me.hp = hpf * B.me.maxHp; B.me.hpf = hpf; B.threats = 2; B.threat1 = A; B.lastLosInT = t; B.me.lastShotAtT = t
      if (commit) { B.h50.on = true; B.h50.commit = A; B.h50.lines = lines }
      decideMode(B)
      return B.mode
    }
    const c45 = unit({ hunt: 'h50' }, 0.45, 2, true), d45 = unit({}, 0.45, 2, false), p45 = unit({ retreat: 'pulse', hunt: 'h50' }, 0.45, 2, true), pd45 = unit({ retreat: 'pulse' }, 0.45, 2, false)
    const c24 = unit({ hunt: 'h50' }, 0.24, 2, true), c39 = unit({ hunt: 'h50' }, 0.39, 3, true), c41 = unit({ hunt: 'h50' }, 0.41, 3, true)
    check('h50 T9 commit: at 45% with 2 lines -> FIGHT (d3 / pulse without the commit: DISENGAGE); 24% -> DISENGAGE; 3 lines: 39% DISENGAGE, 41% FIGHT',
      c45 === 'FIGHT' && d45 === 'DISENGAGE' && p45 === 'FIGHT' && pd45 === 'DISENGAGE' && c24 === 'DISENGAGE' && c39 === 'DISENGAGE' && c41 === 'FIGHT',
      `V4+h50 45% ${c45}, V4 ${d45} | V1+h50 ${p45}, V1 ${pd45} | 24% ${c24} | 3 lines 39% ${c39}, 41% ${c41}`)
  }
  // commit and leave: post() commits on the gate / a hostile pick; leave when it dies, the burst is under 30% with the laser cooling
  // more than 1 s, or 3 s pass without our damage on it
  {
    const mk = () => {
      const br = HB({ hunt: 'h50' }); const B = br._B
      br.act(wobs(['gun', 'laser']), performance.now() + 27)
      B.me.t = 60; B.aliveN = 12; B.foreignDeaths = 0; B.zone.known = false
      return B
    }
    const res = []
    { const B = mk(); const A = trk(B, 10, 110, { hp: 600 }); setTracks(B, [A]); B.hunt.pre({}); B.target = A; B.hunt.post(); res.push(['gate', A.h50Ok && B.h50.commit === A]) }
    { const B = mk(); const A = trk(B, 10, 110, { hp: 1400 }); setTracks(B, [A]); B.me.weapons[1].cooldown = 1.6; B.hunt.pre({}); B.target = A; B.hunt.post(); res.push(['no gate, not hostile', !A.h50Ok && B.h50.commit === null]) }
    { const B = mk(); const A = trk(B, 10, 110, { hp: 1400, hostile: true }); setTracks(B, [A]); B.hunt.pre({}); B.target = A; B.hunt.post(); res.push(['hostile', B.h50.commit === A]) }
    {
      const B = mk(); const A = trk(B, 10, 110, { hp: 1300, lastDmgOutT: 60 }); setTracks(B, [A]); B.h50.on = true; B.h50.commit = A; B.h50.commitT = 59
      B.me.weapons[1].cooldown = 0.9; B.me.gun.ammo = 4; B.hunt.pre({}); const keep09 = B.h50.commit === A
      B.me.weapons[1].cooldown = 1.2; B.hunt.pre({}); res.push(['leave: burst < 30% with the laser cooling > 1 s', keep09 && B.h50.commit === null])
    }
    { const B = mk(); const A = trk(B, 10, 110, { hp: 900, lastDmgOutT: 56.9 }); setTracks(B, [A]); B.h50.on = true; B.h50.commit = A; B.h50.commitT = 55; B.hunt.pre({}); res.push(['leave: 3 s without our damage', B.h50.commit === null]) }
    { const B = mk(); const A = trk(B, 10, 110, { hp: 900, lastDmgOutT: 59.5 }); setTracks(B, [A]); B.h50.on = true; B.h50.commit = A; B.h50.commitT = 55; B.hunt.pre({}); const k = B.h50.commit === A; setTracks(B, []); B.hunt.pre({}); res.push(['keep while hitting; leave when it is gone', k && B.h50.commit === null]) }
    const bad = res.filter((r) => !r[1]).map((r) => r[0])
    check('h50 commit / leave: gate pick and hostile pick commit, a non-gated idle pick does not; leave at burst < 30% with the laser cooling > 1 s, after 3 s without our damage, when gone',
      bad.length === 0, bad.length ? 'FAIL ' + bad.join(', ') : res.map((r) => r[0]).join(' | '))
  }
  // T10 / T11 the pulse: our kill with one other line on us, hide cell at tCover 1.0 s -> DISENGAGE, back to FIGHT when the laser
  // cooldown <= 0.3 s and the gun holds >= 8 rounds, never after 4.0 s; tCover 2.5 s -> no pulse; lite -> never
  {
    const { decideMode } = await import('../bot/lib/tactics.js')
    const run = (sel, tCover, reloads) => {
      const br = HB(sel); const B = br._B
      br.act(wobs(['gun', 'laser']), performance.now() + 27)
      let t = B.me.t = 60
      B.aliveN = 12; B.foreignDeaths = 0; B.zone.known = false
      const V = trk(B, 10, 100, { hp: 200, hostile: true }), O = trk(B, 11, 110, { hostile: true, losInT: t, losIn: true, lastDmgInT: t })
      setTracks(B, [V, O]); B.hunt.pre({})                                        // the victim is seen before its death
      const g = B.me.gun, lz = B.me.laser
      g.ammo = 5; g.reload = 0; lz.cooldown = 1.65; lz.charge = 0
      B.hide.state = 'found'; B.hide.dist = tCover * B.me.walk / B.P.pathFactor; B.hide.x = B.me.x - B.hide.dist; B.hide.y = B.me.y
      B.mode = 'FIGHT'; B.modeSince = 0; B.me.hp = 0.8 * B.me.maxHp; B.me.hpf = 0.8
      B.killDrops.push({ x: V.x, y: V.y, t }); B.lastKillT = t
      setTracks(B, [O])
      let start = -1, end = -1, maxLen = 0, reloadAt = -1
      for (let k = 0; k <= 60; k++) {
        t = B.me.t = +(60 + k * 0.1).toFixed(2)
        O.losInT = t; O.lastDmgInT = t
        if (k > 0) { lz.cooldown = Math.max(0, lz.cooldown - 0.1); if (g.reload > 0) { g.reload = Math.max(0, +(g.reload - 0.1).toFixed(2)); if (g.reload === 0) g.ammo = g.mag } }
        B.hunt.pre({ events: k === 0 ? [{ type: 'kill', target: 10 }] : [] })
        B.target = O; B.threats = 1; B.threat1 = O; B.lastLosInT = t
        B.hunt.post()
        decideMode(B)
        if (B.h50Pulse && reloads && g.ammo < B.P.h50MagMin && g.reload === 0 && reloadAt < 0) { reloadAt = t; g.reload = g.reloadS; g.ammo = 0 }   // firecontrol's forced reload
        if (B.mode === 'DISENGAGE' && start < 0) start = t
        if (start >= 0 && end < 0 && B.mode !== 'DISENGAGE') end = t
        if (B.h50Pulse) maxLen = Math.max(maxLen, t - start)
      }
      return { start, end, len: end > 0 ? +(end - start).toFixed(2) : -1, pulses: B.counters.h50Pulses || 0, reloadAt }
    }
    const a = run({ hunt: 'h50' }, 1.0, true), b = run({ hunt: 'h50' }, 1.0, false), c = run({ hunt: 'h50' }, 2.5, true), d = run({ hunt: 'lite' }, 1.0, true)
    // a: reload 2.4 s from the first pulse decision -> 8+ rounds at 62.4 s, laser ready at 61.4 s -> FIGHT from 62.4 s (+ the 0.6 s mode hold at most)
    check('h50 T10 pulse: kill with one other line, cover at 1.0 s -> DISENGAGE at once, FIGHT again when reloaded (laser <= 0.3 s, >= 8 rounds), never after 4.0 s; cover at 2.5 s -> no pulse',
      a.start === 60 && a.end >= 62.4 && a.end <= 63.1 && b.start === 60 && b.end >= 64 && b.end <= 64.1 && c.start < 0 && c.pulses === 0,
      `reloaded: ${JSON.stringify(a)} | gun never reloads: ${JSON.stringify(b)} | cover 2.5 s: ${JSON.stringify(c)}`)
    check('h50 T11 lite: the same kill never starts a pulse', d.start < 0 && d.pulses === 0, JSON.stringify(d))
    // (b) the burst spent (gun reloading, laser cooling > 1 s) with 2 lines on us -> a pulse too
    const spent = () => {
      const br = HB({ hunt: 'h50' }); const B = br._B
      br.act(wobs(['gun', 'laser']), performance.now() + 27)
      const t = B.me.t = 60; B.aliveN = 12; B.foreignDeaths = 0; B.zone.known = false
      const A = trk(B, 10, 100, { hostile: true, losInT: t, losIn: true }), C = trk(B, 11, 110, { hostile: true, losInT: t, losIn: true })
      setTracks(B, [A, C]); B.me.gun.reload = 1.5; B.me.gun.ammo = 0; B.me.laser.cooldown = 1.4
      B.hide.state = 'found'; B.hide.dist = 8; B.mode = 'FIGHT'; B.modeSince = 0; B.me.hp = 0.8 * B.me.maxHp; B.me.hpf = 0.8
      B.hunt.pre({}); B.target = A; B.threats = 2; B.threat1 = A; B.hunt.post(); decideMode(B)
      const m2 = B.mode
      setTracks(B, [A]); B.h50.pulseUntil = -1; B.mode = 'FIGHT'; B.hunt.pre({}); B.hunt.post(); decideMode(B)
      return [m2, B.mode]
    }
    const sp = spent()
    check('h50 pulse (b): burst spent with 2 lines on us -> DISENGAGE; with 1 line -> FIGHT', sp[0] === 'DISENGAGE' && sp[1] === 'FIGHT', sp.join(' / '))
  }
  // T12 / T13 firewall: FFA posture, a foreign death, the late zone (next radius 60) and 3 alive -> actions identical to hunt off.
  // From 19.8 s: the opening guard (20 s) covers the one decision the foreign-death count lags (stance runs after the target choice)
  {
    const run = (sel, over, pre, zone) => {
      const ar = new Arena({ cfg, seed: 405, me: { x: 0, y: 0, yaw: 0 }, zone, enemies: [{ id: 10, x: 80, y: 0, hp: 1400, dps: 0, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI + 0.8 } },
        { id: 11, x: -150, y: 120, hp: 700, dps: 0, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = 0 } }] })
      ar.t = 19.8
      const br = HB(sel, over)
      const acts = []
      driveH(ar, br, 28, (a, o, act) => acts.push(JSON.stringify(act)), (a, o, k) => { o.sounds = k === 5 ? [{ kind: 'gun', bearing: 2.0, dist: 'far', age: 0.1 }] : []; pre(a, o, k) })
      return acts.join('\n')
    }
    const fd = (a, o, k) => { o.alive = k === 0 ? 16 : 15 }, sq = (a, o) => { o.alive = 14 }, a3 = (a, o) => { o.alive = 3 }
    const late = { center: [0, 0], radius: 300, next_center: [0, 0], next_radius: 60, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
    const cases = [['FFA', { env: 'ffa' }, sq, undefined], ['foreign death', {}, fd, undefined], ['late zone', {}, sq, late], ['3 alive', {}, a3, undefined]]
    const out = []
    for (const [nm, over, pre, z] of cases) {
      const off = run({}, over, pre, z), h = run({ hunt: 'h50' }, over, pre, z), s = run({ seek: 'on' }, over, pre, z)
      out.push([nm, off === h && off === s])
    }
    const ctl = run({}, {}, sq) !== run({ hunt: 'h50' }, {}, sq)
    check('h50 T12 / T13 firewall: FFA posture, after a foreign death, late zone (next radius 60), 3 alive -> hunt h50 and seek on act exactly like off (control: SQUAD differs)',
      out.every((r) => r[1]) && ctl, out.map((r) => `${r[0]} ${r[1] ? 'identical' : 'DIFFERENT'}`).join(' | ') + ` | control SQUAD differs ${ctl}`)
  }
  // defaults: hunt off and seek off; the presets resolve
  {
    const d = resolveParams({}), h = resolveParams({ select: { hunt: 'h50' } }), l = resolveParams({ select: { hunt: 'lite' } }), s = resolveParams({ select: { seek: 'on' } })
    check('h50 presets: defaults hunt off / seek off; h50 = hunt50 + pulse; lite = hunt50 without the pulse; seek on = seek only',
      d.hunt50 === false && d.h50Pulse === false && d.seekOn === false && h.hunt50 && h.h50Pulse && l.hunt50 && !l.h50Pulse && s.seekOn && !s.hunt50,
      `default ${d.hunt50}/${d.h50Pulse}/${d.seekOn} | h50 ${h.hunt50}/${h.h50Pulse} | lite ${l.hunt50}/${l.h50Pulse} | seek ${s.seekOn}/${s.hunt50}`)
  }
}

