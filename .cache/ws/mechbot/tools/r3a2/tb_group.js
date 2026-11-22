// ============================================================================ group r3a2: build R3a2 (notes/build_spec_r3a2.md)
// Plain defaults (= V1, every R3a2 item on); the 5.02 behaviour through the presets' old values (SELECT_502).
if (want('r3a2')) {
  const { SELECT_502 } = await import('../bot/lib/params.js')
  const { decideMode } = await import('../bot/lib/tactics.js')
  const DEF = (over) => createBrain0(hello, ctxNone, over || {})
  const OLD = (over) => createBrain0(hello, ctxNone, { ...(over || {}), select: { ...SELECT_502, ...((over && over.select) || {}) } })
  const driveP = (ar, br, secs, hook, pre) => { for (let k = 0; k < Math.round(secs * 10); k++) { const o = ar.obs(); if (pre) pre(ar, o); const t0 = performance.now(); const a = br.act(o, t0 + 27.5); allTimes.push(performance.now() - t0); if (hook) hook(ar, o, a, br); ar.step(a) } }
  const alive = (n) => (a, o) => { o.alive = n }
  // P1 fightEarly: a mech aiming at us from 185 m (not D0-hostile: > 160 m) is engaged from 20 s; one closing at 5 m/s from
  // 178 m too; before 20 s neither; with a foreign death seen the guard stays 40 s; the 5.02 build (openFarm) never engages
  {
    const run = (mk, over, t0, secs, pre) => {
      const ar = new Arena({ cfg, seed: 331, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: mk === 'close' ? 178 : 185, y: 0, hp: 1400, script: (e, t, A, dt) => { face(e, A); if (mk === 'close') { e.vx = -5; e.vy = 0; e.x += e.vx * dt } else { e.vx = 0; e.vy = 0 } } }] })
      ar.t = t0
      const br = mk === 'old' ? OLD(over) : DEF(over)
      let first = -1, shots = 0
      driveP(ar, br, secs, (a, o, act, b) => { if (first < 0 && b._B.target && b._B.target.id === 10) first = +a.t.toFixed(2); if (act.fire[0] || act.fire[1]) shots++ }, pre || alive(12))
      return { first, shots }
    }
    let deaths = 0
    const foreign = (a, o) => { o.alive = a.t < 19.5 ? 16 : 15; if (a.t >= 19.5) deaths = 1 }
    const aim = run('aim', {}, 19, 4), close = run('close', {}, 19, 4), early = run('aim', {}, 12, 6), fd = run('aim', {}, 19, 6, foreign), old = run('old', {}, 19, 6)
    const ok = aim.first >= 20 && aim.first <= 20.6 && aim.shots > 0 && close.first >= 20 && close.first <= 20.6 && early.first < 0 && fd.first < 0 && deaths === 1 && old.first < 0
    check('r3a2 P1 fightEarly: a mech aiming at us from 185 m (or closing at 5 m/s from 178 m) is engaged at 20 s; not before; guard 40 s after a foreign death; 5.02 (openFarm) does not engage', ok,
      `aim 185 m: target at ${aim.first} s, shots ${aim.shots} | closing: ${close.first} s | t 12-18: ${early.first} | foreign death: ${fd.first} | 5.02: ${old.first}`)
  }
  // P2 laserEcon: gun only, a laser 200 m away and a crate 40 m away: the laser is fetched first (5.02: crate, laser beyond
  // 120 m never); no mortar in SQUAD (5.02 takes it after 60 s without a better weapon); a laser replaces lightning
  {
    const run = (mk) => {
      const ar = new Arena({ cfg, seed: 332, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8201, kind: 'laser', pos: [200, 0, 0] }], crates: [{ id: 1201, pos: [-40, 0, 0], hp: 300 }] })
      ar.t = 30
      const br = mk === 'old' ? OLD() : DEF()
      let firstLoot = '', laserAt = -1
      driveP(ar, br, 26, (a, o, act, b) => { const l = b._B.loot; if (!firstLoot && l) firstLoot = l.type; if (laserAt < 0 && a.me.weapons[1] && a.me.weapons[1].kind === 'laser') laserAt = +(a.t - 30).toFixed(1) }, alive(14))
      return { firstLoot, laserAt }
    }
    const mortar = (mk) => {
      const ar = new Arena({ cfg, seed: 333, me: { x: 0, y: 0, yaw: 0 }, pickups: [{ id: 8202, kind: 'mortar', pos: [20, 0, 0] }] })
      ar.t = 70
      driveP(ar, mk === 'old' ? OLD() : DEF(), 6, null, alive(14))
      return ar.me.weapons[1] ? ar.me.weapons[1].kind : 'none'
    }
    const swap = () => {
      const ar = new Arena({ cfg, seed: 334, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'lightning'] }, pickups: [{ id: 8203, kind: 'laser', pos: [150, 0, 0] }] })
      ar.t = 30
      driveP(ar, DEF(), 18, null, alive(14))
      return ar.me.weapons.map((w) => (w ? w.kind : '-')).join('+')
    }
    const n = run('new'), o = run('old'), mN = mortar('new'), mO = mortar('old'), sw = swap()
    const ok = n.firstLoot === 'pickup' && n.laserAt > 0 && n.laserAt <= 22 && o.firstLoot === 'crate' && o.laserAt < 0 && mN === 'none' && mO === 'mortar' && sw === 'gun+laser'
    check('r3a2 P2 laserEcon: gun only, a laser 200 m away beats a crate at 40 m and is taken (5.02: crate, never the laser); no mortar in SQUAD; a laser at 150 m replaces lightning', ok,
      `R3a2: first loot ${n.firstLoot}, laser after ${n.laserAt} s | 5.02: first loot ${o.firstLoot}, laser ${o.laserAt} | mortar 20 m at 70 s: R3a2 ${mN}, 5.02 ${mO} | gun+lightning, laser 150 m: ${sw}`)
  }
  // P3 focus: our target at 29% hp (100 m, hitting us) is kept when a fresh full-hp mech that also hits us appears at 60 m
  {
    const run = (mk) => {
      const ar = new Arena({ cfg, seed: 335, me: { x: 0, y: 0, yaw: 0 }, enemies: [
        { id: 10, x: 100, y: 0, hp: 410, maxHp: 1400, dps: 15, script: (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; e.hp = 410 } },
        { id: 11, x: 5000, y: 0, hp: 1400, dps: 0, script: (e, t, A) => { if (t >= 52) { e.x = 60; e.y = 15; e.dps = 15 } face(e, A); e.vx = 0; e.vy = 0 } }] })
      ar.t = 50
      const br = mk === 'old' ? OLD() : DEF()
      let onA = 0, onB = 0, n = 0
      driveP(ar, br, 8, (a, o, act, b) => { if (a.t < 53) return; n++; const tg = b._B.target; if (tg && tg.id === 10) onA++; if (tg && tg.id === 11) onB++ }, alive(12))
      return { onA, onB, n }
    }
    const n = run('new'), o = run('old')
    check('r3a2 P3 focus add: a 29% target is kept over a fresh full-hp mech at 60 m (both hitting us); 5.02 (x1.3 stickiness) switches', n.onA >= 0.9 * n.n && o.onB >= 0.5 * o.n,
      `R3a2: on the 29% target ${n.onA}/${n.n}, fresh ${n.onB} | 5.02: 29% ${o.onA}, fresh ${o.onB}/${o.n}`)
  }
  // P4 pulseRetreat: (a) 40% hp out of contact: no HEAL (5.02 heals); (b) decideMode with a found hide cell: two mechs within
  // 160 m at 45% -> DISENGAGE; the second leaves at 52 s -> back to FIGHT 1.5 s after the last LOSING decision, never HEAL
  {
    const healRun = (mk) => { const ar = new Arena({ cfg, seed: 336, me: { x: 0, y: 0, yaw: 0, hp: 0.4 * 1400 } }); ar.t = 60; let heal = 0; driveP(ar, mk === 'old' ? OLD() : DEF(), 6, (a, o, act, b) => { if (b._B.mode === 'HEAL') heal++ }, alive(12)); return heal }
    const hN = healRun('new'), hO = healRun('old')
    const unit = (mk) => {
      const br = mk === 'old' ? OLD() : DEF(), B = br._B, me = B.me
      const tr = (id, d) => ({ id, npc: false, listed: true, hp: 1400, maxHp: 1400, dist: d, x: d, y: 0, vx: 0, vy: 0, lastDmgInT: -99, losOut: true })
      const A = tr(10, 100), C = tr(11, 120)
      B.target = A; B.hide.state = 'found'; B.hide.dist = 12; B.hide.x = -12; B.hide.y = 0; B.aliveN = 12; B.mode = 'FIGHT'; B.modeSince = 0
      me.maxHp = 1400; me.hp = 0.45 * 1400; me.hpf = 0.45
      const modes = []
      let lastLose = -1, back = -1, heal = 0
      for (let k = 0; k <= 60; k++) {
        const t = +(50 + k * 0.1).toFixed(2)
        me.t = t
        const near = t < 52
        C.dist = near ? 120 : 400; C.listed = near
        B.trackList = [A, C]
        B.threats = near ? 2 : 0; B.threat1 = near ? A : null
        if (near) { B.lastLosInT = t; me.lastShotAtT = t }
        decideMode(B)
        if (B.mode === 'HEAL') heal++
        if (mk === 'new' && B.pulseLoseT === t) lastLose = t
        if (B.mode === 'DISENGAGE' && back < 0) back = -2
        if (back === -2 && B.mode !== 'DISENGAGE') back = t
        modes.push(B.mode[0])
      }
      return { lastLose, back, heal, modes: modes.join('') }
    }
    const u = unit('new'), uo = unit('old')
    const ok = hN === 0 && hO > 20 && u.lastLose === 51.9 && u.back >= 53.4 && u.back <= 53.5 && u.heal === 0 && uo.heal > 0
    check('r3a2 P4 pulseRetreat: no HEAL in SQUAD (40% out of contact; 5.02 heals); LOSING with 2 near at 45% retreats and ends 1.5 s after the last LOSING decision', ok,
      `40% quiet: HEAL decisions R3a2 ${hN}, 5.02 ${hO} | last LOSING ${u.lastLose} s, FIGHT again at ${u.back} s, HEAL ${u.heal} (${u.modes}) | 5.02: HEAL ${uo.heal} (${uo.modes})`)
  }
  // P5 boostSpend: a gun + laser fight at 115 m against a mech hitting us: boost on charging frames while energy > 30, none
  // below 30; FFA (forced) and the 5.02 build do not boost there
  {
    const run = (mk) => {
      const ar = new Arena({ cfg, seed: 337, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 10, x: 115, y: 0, hp: BIGHP, dps: 20, script: (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0 } }] })
      ar.t = 50
      const br = mk === 'old' ? OLD() : mk === 'ffa' ? DEF({ env: 'ffa', warmup: false }) : DEF()
      let hi = 0, hiB = 0, lo = 0, loB = 0
      driveP(ar, br, 20, (a, o, act, b) => {
        const lz = o.self.weapons[1], B = b._B
        if (!lz || !(lz.charge > 0) || B.mode !== 'FIGHT' || !o.self.grounded || Math.hypot(act.move[0], act.move[1]) < 0.3) return
        if (o.self.energy > 31) { hi++; if (act.boost) hiB++ } else if (o.self.energy < 29) { lo++; if (act.boost) loB++ }
      }, alive(12))
      return { hi, hiB, lo, loB, spend: br._B.counters.boostSpend || 0 }
    }
    const n = run('new'), f = run('ffa'), o = run('old')
    const ok = n.hi >= 10 && n.hiB >= 0.8 * n.hi && n.loB === 0 && f.hiB + f.loB === 0 && f.spend === 0 && o.hiB === 0
    check('r3a2 P5 boostSpend: boosts while charging under fire above 30 energy, not below; never in FFA; 5.02 never', ok,
      `R3a2: charging frames > 30 energy ${n.hiB}/${n.hi} boosted, < 30 ${n.loB}/${n.lo} | FFA ${f.hiB}/${f.hi}, ${f.loB}/${f.lo} (P5 decisions ${f.spend}) | 5.02 ${o.hiB}/${o.hi}`)
  }
  // P6 farmHp 50, P7 upgrades speed third; V1-V4 selects resolve
  {
    const P0 = DEF()._B.P
    const offer = (sel) => { const br = DEF(sel ? { select: sel } : {}); const o = JSON.parse(JSON.stringify(streamObs[0])); o.offer = { id: 1, expires: 99, choices: [{ id: 'nanites' }, { id: 'servos' }, { id: 'gun_damage' }] }; return br.act(o, performance.now() + 27).pick }
    const v2 = resolveParams({ select: { fightEarly: 'off' } }), v3 = resolveParams({ select: { boost: 'off' } }), v4 = resolveParams({ select: { retreat: 'd3' } })
    const ok = P0.farmHp === 0.5 && P0.rPrefLaser === 115 && P0.laserLo === 100 && P0.laserHi === 130 && offer() === 1 && offer({ upg: 'std' }) === 0 &&
      v2.openFarm === true && v2.fightEarly === false && v2.boostSpend === true && v3.boostSpend === false && v3.openFarm === false && v4.pulseRetreat === false && v4.focusAdd === true
    check('r3a2 defaults: farmHp 50, laser mid band 115 (100-130), servos third (std: nanites); V2 fightEarly off = openFarm on, V3 boost off, V4 retreat d3', ok,
      `farmHp ${P0.farmHp}, band ${P0.rPrefLaser} ${P0.laserLo}-${P0.laserHi}, offer [nanites, servos, gun_damage] -> ${offer()} (std ${offer({ upg: 'std' })}) | V2 openFarm ${v2.openFarm} | V3 boost ${v3.boostSpend} | V4 pulse ${v4.pulseRetreat}`)
  }
  // final-only items in FFA (unit level, env forced FFA): F1, Z5, Z8, Z9, Z10
  {
    const mkB = (over) => { const br = DEF({ env: 'ffa', warmup: false, ...(over || {}) }); const B = br._B; B.env = 'FFA'; B.me.t = 120; B.ffaOpen = true; return { br, B } }
    const mech = (id, x, y, hp, maxHp, extra) => ({ id, npc: false, listed: true, conf: 1, x, y, z: 0, vx: 0, vy: 0, hp, maxHp: maxHp || 1400, dist: Math.hypot(x, y), bearing: Math.atan2(y, x), yaw: Math.atan2(-y, -x),
      radius: 2.5, height: 9, muzzleH: 7, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, losOut: true, losIn: true, lastDmgInT: -99, lastDmgOutT: -99, lastSeen: 120,
      thirdExitT: -99, duelWonT: -99, busyWith: -1, busySince: -99, busyLastWith: -1, busyLastT: -99, magN: 0, lastBulletT: -99, charging: false, twoOkT: -99, thirdT: -99, a: 0, b: 150, finishable: false, hostile: false, ...(extra || {}) })
    const res = []
    // F1: a drop 120 m away, a mech 100 m from us (110 m from the drop): with 3 alive no DROP task; with 5 alive kept
    const drop = (n, over) => {
      const ar = new Arena({ cfg, seed: 338, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: -100, y: 0, hp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI / 2 } }] })
      ar.t = 120
      const br = DEF({ env: 'ffa', warmup: false, ...(over || {}) })
      let task = 0
      driveP(ar, br, 3, (a, o, act, b) => { if (b._B.dropTask) task++ }, (a, o) => { o.alive = n; o.drops = [{ id: 20001, pos: [120, 0, 0], radius: 8, lands_in: 8, capture_s: 4, progress: 0, holder: null }] })
      return task
    }
    const f3 = drop(3), f5 = drop(5), f3off = drop(3, { select: { ffaDropGate: 'off' } })
    res.push(['F1', f3 === 0 && f5 > 0 && f3off > 0, `drop task decisions: 3 alive ${f3}, 5 alive ${f5}, 3 alive gate off ${f3off}`])
    // Z5: at 380 s in the 25 m circle we stand on next_center (off: within the 8 m late leash); a body on the point -> its
    // current-centre side; from 405 s the mech whose E is just above ours, else our attacker
    const point = (over, occ) => {
      const z = { center: [0, 0], radius: 25, next_center: [10, 0], next_radius: 0, shrink_start: 390, shrink_end: 415, dps: 260 }
      const en = occ ? [{ id: 12, x: 10, y: 0, hp: 1400, script: (e) => { e.x = 10; e.y = 0; e.vx = 0; e.vy = 0; e.yaw = Math.PI } }] : []
      const ar = new Arena({ cfg, seed: 339, me: { x: -8, y: 6, yaw: 0 }, enemies: en, zone: z })
      ar.t = 378
      driveP(ar, DEF({ env: 'ffa', warmup: false, ...(over || {}) }), 8, null, alive(occ ? 2 : 5))
      return { d: +Math.hypot(ar.me.x - 10, ar.me.y).toFixed(2), side: +(ar.me.x - 10).toFixed(2) }
    }
    const pOn = point(), pOff = point({ select: { finalPoint: 'off' } }), pOcc = point({}, true)
    const fp = (myHp) => {
      const { B } = mkB(); B.me.t = 406; B.me.hp = myHp; B.me.x = 0; B.me.y = 0
      Object.assign(B.zone, { known: true, cx: 4, cy: 0, r: 9, nx: 10, ny: 0, nr: 0, nrEff: 0, t0: 390, t1: 415, dps: 260 })
      const a = mech(21, 6, 1, 1500), b = mech(22, 6, -1, 2600), att = mech(23, 7, 0, 900)
      B.trackList = [a, b, att]; B.topAttacker = att
      const p = B.ffa.finalPick()
      return p ? p.id : -1
    }
    res.push(['Z5', pOn.d < 1.5 && pOff.d > 1.5 && pOcc.side < 0 && Math.abs(pOcc.d - 5.4) < 1.2 && fp(1400) === 21 && fp(3000) === 23,
      `380 s on the point ${pOn.d} m (off ${pOff.d} m); occupied point: ${pOcc.d} m off, ${pOcc.side} m toward the current centre | pick at 1400 hp ${fp(1400)} (E just above), at 3000 hp ${fp(3000)} (attacker)`])
    // Z8: 2 alive. Max hp 2000 vs 1400 -> WAIT (no first shot); 1400 vs 2000 -> CLOSE (only on an opening outside its wedge); equal -> DUEL
    const two = (myMax, otherMax, extra) => {
      const { B } = mkB(); B.aliveN = 2; B.me.maxHp = myMax; B.me.hp = myMax
      const o = mech(31, 120, 0, otherMax, otherMax, extra)
      B.trackList = [o]
      B.ffa.update({ alive: 2, events: [] })
      return { mode: B.twoMode, ok: B.ffa.firstShotOk(o) }
    }
    const w = two(2000, 1400), cF = two(1400, 2000), cA = two(1400, 2000, { yaw: Math.PI / 2, magN: 12, lastBulletT: 119.5 }), du = two(1400, 1400, { b: 200 })
    res.push(['Z8', w.mode === 'WAIT' && !w.ok && cF.mode === 'CLOSE' && !cF.ok && cA.ok && du.mode === 'DUEL' && du.ok, `WAIT ${w.mode}/${w.ok} | CLOSE facing ${cF.mode}/${cF.ok}, turned away + reloading ${cA.ok} | DUEL ${du.mode}/${du.ok}`])
    // Z9: 3 alive: a wounded mech busy with another (rule 3) is not opened on; a duel survivor (D11) and a finish are
    const three = (n, extra, over) => {
      const { B } = mkB(over); B.aliveN = n; B.hide.state = 'found'; B.hide.dist = 3
      const o = mech(41, 120, 0, 600, 1400, { yaw: Math.PI / 2, busyWith: 42, busySince: 100, ...(extra || {}) })
      B.trackList = [o]
      return B.ffa.firstShotOk(o)
    }
    const r3busy = three(3), r3busy5 = three(5), r3surv = three(3, { duelWonT: 119, busyWith: -1 }), r3fin = three(3, { hp: 400 }), r3off = three(3, {}, { select: { ffaThree: 'off' } })
    res.push(['Z9', !r3busy && r3busy5 && r3surv && r3fin && r3off, `3 alive busy 43%: ${r3busy} (5 alive ${r3busy5}, ffaThree off ${r3off}) | duel survivor ${r3surv} | 29% finish ${r3fin}`])
    // Z10: a 50% mech outside the zone (60 dps) is a candidate and scores x1.5; at 70% or at 35 dps it is not; gate post
    const gate = (hpf, dps, inside) => {
      const { B } = mkB(); B.aliveN = 6; B.A = 0
      Object.assign(B.zone, { known: true, cx: 0, cy: 0, r: 140, nx: 0, ny: 0, nr: 70, nrEff: 35, t0: 300, t1: 330, dps })
      const o = mech(51, inside ? 100 : 160, 0, hpf * 1400)
      B.trackList = [o]
      return B.ffa.gateOk(o) && B.ffa.firstShotOk(o)
    }
    const post = () => {
      const { B } = mkB(); B.me.t = 240; B.A = 0; B.me.x = 0; B.me.y = 0
      Object.assign(B.zone, { known: true, cx: 0, cy: 0, r: 240, nx: 0, ny: 0, nr: 140, nrEff: 140, t0: 230, t1: 265, dps: 60 })
      B.trackList = [mech(52, 200, 0, 700)]
      const g = B.ffa.gatePost()
      return g ? `${g.x.toFixed(0)},${g.y.toFixed(0)}` : 'none'
    }
    const g50 = gate(0.5, 60), g70 = gate(0.7, 60), g35 = gate(0.5, 35), gIn = gate(0.5, 60, true), gp = post()
    res.push(['Z10', g50 && !g70 && !g35 && !gIn && gp === '115,0', `50% outside at 60 dps ${g50} | 70% ${g70} | 35 dps ${g35} | inside ${gIn} | gate post ${gp}`])
    const bad = res.filter((r) => !r[1]).map((r) => r[0])
    check('r3a2 final-only (FFA): F1 drop gate at <= 3 alive, Z5 final point + E pick, Z8 WAIT / CLOSE / DUEL, Z9 3-alive hold, Z10 zone gate', bad.length === 0, (bad.length ? 'FAIL ' + bad.join(',') + ' || ' : '') + res.map((r) => `${r[0]} ${r[2]}`).join(' || '))
  }
  // final-only items are inert in SQUAD: SQUAD posture, 3 / 2 alive, the final circle, a drop: actions identical with them off
  {
    const run = (over) => {
      const z = { center: [0, 0], radius: 25, next_center: [10, 0], next_radius: 0, shrink_start: 390, shrink_end: 415, dps: 260 }
      const ar = new Arena({ cfg, seed: 340, me: { x: -8, y: 6, yaw: 0, weapons: ['gun', 'laser'] }, zone: z, enemies: [{ id: 12, x: 12, y: 2, hp: 1400, maxHp: 2000, dps: 15, script: (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0 } },
        { id: 13, x: 30, y: -20, hp: 700, dps: 0, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = 0 } }] })
      ar.t = 400
      const br = DEF({ env: 'squad', warmup: false, ...(over || {}) })
      const acts = []
      driveP(ar, br, 10, (a, o, act) => acts.push(JSON.stringify(act)), (a, o) => { o.alive = a.t < 405 ? 3 : 2; o.drops = [{ id: 20002, pos: [-5, -5, 0], radius: 8, lands_in: 0, capture_s: 4, progress: 0, holder: null }] })
      return acts.join('\n')
    }
    const on = run(), off = run({ select: { ffaDropGate: 'off', finalPoint: 'off', ffaTwo: 'off', ffaThree: 'off', ffaGate: 'off' } })
    check('r3a2 final-only items inert in SQUAD: 100 decisions at 400-410 s, 3 then 2 alive, final circle, a drop: actions identical with F1/Z5/Z8/Z9/Z10 on and off', on === off && on.length > 0, `${on.split('\n').length} actions, identical ${on === off}`)
  }
}

