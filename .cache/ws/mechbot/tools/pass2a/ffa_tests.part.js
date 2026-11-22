// ============================================================================ pass 2a: FFA rules (env forced to FFA), SQUAD bit-identity
if (want('ffa')) {
  const FFA = { env: 'ffa', warmup: false }
  const ffaB = (ctx, over) => createBrain(hello, ctx, { ...FFA, ...(over || {}) })
  const sqB = (ctx, over) => createBrain(hello, ctx, { env: 'squad', warmup: false, ...(over || {}) })
  const offAim = (yaw, ax, ay, bx, by) => Math.abs(Math.atan2(Math.sin(yaw - Math.atan2(by - ay, bx - ax)), Math.cos(yaw - Math.atan2(by - ay, bx - ax))))
  // a spot on the real map with walls near us and a mech position 110-150 m away with a line both ways
  function ffaSpot(seed, dLo = 110, dHi = 150) {
    const rnd = rng32(seed), Bd = world.bounds
    for (let k = 0; k < 200000; k++) {
      const x = Bd.minX + 90 + rnd() * (Bd.maxX - Bd.minX - 180), y = Bd.minY + 90 + rnd() * (Bd.maxY - Bd.minY - 180)
      if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent || nav.wallDistAt(x, y) > 8 || nav.wallDistAt(x, y) < 4) continue
      const a = rnd() * 6.283, d = dLo + rnd() * (dHi - dLo), ex = x + d * Math.cos(a), ey = y + d * Math.sin(a)
      if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
      const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
      if (!world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || !world.shotClear(x, y, z + 7, ex, ey, ez + 4.5)) continue
      return { x, y, ex, ey }
    }
    return null
  }
  const bigZone = (x, y) => ({ center: [x, y], radius: 3000, next_center: [x, y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
  // a static gun shooter that fires (dps) whenever it has a line on us
  const shooter = (dps) => (e, t, ar) => { face(e, ar); const me = ar.me; e.dps = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) ? dps : 0 }

  // 1. SQUAD bit-identity inside the suite: the kit stream with the FFA module and rules on / off gives the same actions
  {
    const run = (sel) => { const b = createBrain(hello, ctxMap, { warmup: false, select: { env: 'squad', ...sel } }); return streamObs.map((o) => JSON.stringify(b.act(o, performance.now() + 27))).join('\n') }
    const on = run({}), off = run({ ffaCounters: 'off', ffaRules: 'off' })
    const b = createBrain(hello, ctxMap, { warmup: false, select: { env: 'squad' } }); for (const o of streamObs) b.act(o, performance.now() + 27)
    const B = b._B
    check('ffa: SQUAD bit-identity: kit stream actions identical with ffaCounters/ffaRules on and off; module inert (no rank, neutral advice)', on === off && B.cxRank === null && B.cx && !B.cx.adviceFor(streamObs[0].mechs.length ? streamObs[0].mechs[0].id : 0, B.cxCtx).active && B.ffaBreak === false,
      `${streamObs.length} actions ${on === off ? 'identical' : 'DIFFER'}; cxRank ${B.cxRank}, ctx env ${B.cxCtx.env}`)
  }

  // 2. counter module wired in FFA: a motionless, calm mech reads HIDER; advice reaches the brain (rank, cxMult, avoid = never a target, hold fire)
  {
    const mk = () => { const ar = new Arena({ cfg, seed: 201, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 140, y: 0, hp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = 0.0 } }] }); ar.t = 100; return ar }
    const ar = mk(), br = ffaB(ctxNone)
    let tgtDec = 0, shots0 = 0
    drive(ar, br, 14, (a, obs, act, b) => { if (a.t > 106 && b._B.target && b._B.target.id === 10) tgtDec++ })
    shots0 = ar.stats.shots + ar.stats.beams
    const B = br._B, rd = B.cx.archetypeOf(10), adv = B.cx.adviceFor(10, B.cxCtx), rank = B.cxRank ? B.cxRank.map((r) => r.id) : null
    const ok = rd.archetype === 'HIDER' && rd.confidence >= 0.5 && adv.active && adv.engage === 'avoid' && rank && rank[0] === 10 && tgtDec === 0 && shots0 === 0
    check('ffa: counter module wired (hookup steps 1-10): calm motionless mech reads HIDER, advice avoid -> never targeted, no shot; threat rank fills', ok,
      `read ${rd.archetype} conf ${fx(rd.confidence)} | advice ${adv.reason} ${adv.engage} band ${fx(adv.lo, 0)}-${fx(adv.hi, 0)} | rank ${JSON.stringify(rank)} | target decisions ${tgtDec}, shots ${shots0}`)
  }

  // 3. D11 hider counter: out-farm it (a drone farmed with the hider 140 m away) and pass it at 120 m (a cube 70 m from it is left)
  {
    const mk = (cubeX) => { const ar = new Arena({ cfg, seed: 202, me: { x: 0, y: 0, yaw: Math.PI }, cubes: [{ id: 5001, pos: [cubeX, 30, 0] }],
      enemies: [{ id: 10, x: 140, y: 0, hp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = 0 } }, { id: 120, kind: 'npc', x: -40, y: 0, hp: 350, maxHp: 350, script: (e) => { e.vx = 0; e.vy = 0 } }] }); ar.t = 100; return ar }
    const res = (over, cubeX) => {
      const ar = mk(cubeX), br = ffaB(ctxNone, over)
      let farm = 0, cubeGoal = 0
      drive(ar, br, 14, (a, obs, act, b) => { const B = b._B; if (a.t > 108) { if (B.loot && B.loot.type === 'drone') farm++; if (B.loot && B.loot.type === 'cube') cubeGoal++ } })
      return { farm, cubeGoal, cubes: ar.stats.cubesTaken || 0 }
    }
    const on = res({}, 85), off = res({ select: { ffaRules: 'off' } }, 85), far = res({}, -10)
    const ok = on.farm > 0 && off.farm === 0 && on.cubeGoal === 0 && on.cubes === 0 && far.cubes === 1
    check('ffa: D11 hider counter: farm a drone with a confident hider 140 m away (rules off: no farming under 150 m); never loot within 120 m of it', ok,
      `rules on: farm decisions ${on.farm}, cube 55 m from the hider chosen ${on.cubeGoal}x taken ${on.cubes} | rules off: farm ${off.farm} | cube 150 m from it taken ${far.cubes}`)
  }

  // 4. rule 1 hide budget: charge time measured on a first-tick flag, else by cubes (0.75 / 0.56 / 0.42 s); reach = budget x speed
  {
    const br = ffaB(ctxNone), B = br._B
    const base = JSON.parse(JSON.stringify(streamObs[0])), [x, y, z] = base.self.pos
    const feed = (k, charging, beams, cubes) => {
      const o = JSON.parse(JSON.stringify(base)); o.tick = k * 2; o.t = 100 + k * 0.1; o.events = []; o.projectiles = []; o.beams = beams || []
      o.mechs = [{ id: 7, kind: 'mech', pos: [x + 120, y, z], vel: [0, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes, weapons: ['gun', 'laser'], charging }]
      br.act(o, performance.now() + 27)
    }
    feed(0, false, null, 2); feed(1, false, null, 2)
    for (let k = 2; k < 9; k++) feed(k, true, null, 2)
    feed(9, false, [{ by: 7, kind: 'laser', path: [[x + 120, y, z + 7], [x, y, z + 5]], age: 0.0 }], 2)
    const tr = B.tracks.get(7), meas = B.ffa.chargeTime(tr)
    feed(10, false, null, 3)
    const after = B.ffa.chargeTime(tr)
    const tc = (cubes, known) => B.ffa.chargeTime({ cubes, cubesKnown: known, chargeMeas: 0, chargeMeasCubes: -1 })
    const c0 = tc(0, true), c2 = tc(2, true), c5 = tc(5, true), cu = tc(0, false)
    // reach while a 5-cube laser charges at us, 0.1 s after its first flag tick
    feed(11, false, null, 5); feed(12, true, null, 5)
    const reachB = B.ffa.hideReach(true), reachW = B.ffa.hideReach(false)
    const ok = Math.abs(meas - 0.7) < 0.051 && Math.abs(after - 0.421875) < 1e-6 && Math.abs(c0 - 0.75) < 1e-9 && Math.abs(c2 - 0.5625) < 1e-9 && Math.abs(c5 - 0.421875) < 1e-9 && Math.abs(cu - 0.421875) < 1e-9 &&
      reachW > 3 && reachW < 5.2 && reachB > 5.5 && reachB < 8
    check('ffa: rule 1 hide budget: measured first-tick charge (0.7 s), cube bounds 0.75/0.56/0.42 s (unknown 0.42), reach = (charge - 0.1 s) x speed', ok,
      `measured ${fx(meas, 3)} s, after a cube change ${fx(after, 3)} | 0 cubes ${fx(c0, 3)}, 2 ${fx(c2, 3)}, 5 ${fx(c5, 3)}, unknown ${fx(cu, 3)} | reach walk ${fx(reachW, 1)} m, boost ${fx(reachB, 1)} m`)
  }

  // 5. rule 1 beam clock: closed while its laser is ready; open 1.65 s after its flag drop; timer peeks 2.9 s after a flag / 4.3 s after leaving its line, 0.6 s long
  {
    const br = ffaB(ctxNone), B = br._B
    const base = JSON.parse(JSON.stringify(streamObs[0])); base.self.hp = 1400; base.self.weapons = [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0 }, { kind: 'laser', cooldown: 0, charge: 0 }]
    const o = JSON.parse(JSON.stringify(base)); o.t = 100; o.tick = 2000; o.mechs = []; br.act(o, performance.now() + 27)
    const at = (t) => { B.me.t = t }
    const T = { hasLaser: true, charging: false, flagDropT: -99, flagSeenT: -99, losInT: 100, peekT0: -99 }
    at(101); const c1 = B.ffa.peekOpen(T)                                   // hidden 1 s, no flag seen: closed
    at(104.4); const o1 = B.ffa.peekOpen(T); T.losInT = 104.5; at(104.8); const o1b = B.ffa.peekOpen(T); at(105.1); const c1b = B.ffa.peekOpen(T)
    T.flagSeenT = 106; T.losInT = 106; at(107); const c2 = B.ffa.peekOpen(T); at(108.95); const o2 = B.ffa.peekOpen(T)
    T.flagDropT = 110; T.peekT0 = -99; T.losInT = 110; at(111); const o3 = B.ffa.peekOpen(T); at(111.8); const c3 = B.ffa.peekOpen(T)
    T.charging = true; T.flagDropT = -99; at(112); const c4 = B.ffa.peekOpen(T); T.charging = false
    B.me.hpf = 0.4; T.flagSeenT = -99; T.losInT = 112; T.peekT0 = -99; at(116.5); const c5 = B.ffa.peekOpen(T); B.me.hpf = 1
    at(124.5); const o5 = B.ffa.peekOpen(T)
    const ok = !c1 && o1 && o1b && !c1b && !c2 && o2 && o3 && !c3 && !c4 && !c5 && o5
    check('ffa: rule 1 beam clock (M8 / K4): hold cover while its laser is ready; peek 1.65 s after its beam, or 0.6 s on the 2.9 s / 4.3 s timers; never below 50% hp; 12 s cap', ok,
      `closed 1 s after hiding ${!c1}, 4.3 s timer open ${o1} and held while exposed ${o1b}, closed after 0.6 s ${!c1b} | flag seen: closed at 1 s ${!c2}, open at 2.9 s ${o2} | after its beam open ${o3}, closed after 1.65 s ${!c3} | charging closed ${!c4} | 40% hp closed ${!c5} | 12 s cap open ${o5}`)
  }

  // 6. rule 2: our laser charges 0.4 rad off the target and swings on to release (SQUAD charges on the target)
  {
    const mk = () => { const ar = new Arena({ cfg, seed: 206, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 10, x: 130, y: 10, hp: 500, maxHp: 1400, script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI / 2 } }] }); ar.t = 100; return ar }
    const res = (mkB) => {
      const ar = mk(), br = mkB()
      const offs = []
      drive(ar, br, 12, (a, obs, act) => {
        const w = a.me.weapons[1]
        if (w && w.charge > 0 && w.charge < 0.75 * 0.75) offs.push(offAim(a.me.yaw, a.me.x, a.me.y, a.enemies[0].x, a.enemies[0].y))
      })
      return { med: offs.length ? quant(offs, 0.5) : NaN, n: offs.length, beams: ar.stats.beams, hits: ar.stats.beamHits }
    }
    const f = res(() => ffaB(ctxNone)), s = res(() => sqB(ctxNone))
    const ok = f.n > 3 && f.med > 0.3 && f.med < 0.5 && f.hits >= 1 && f.hits >= f.beams - 1 && s.med < 0.1
    check('ffa: rule 2: laser charged 0.35-0.45 rad off the target, swung on at release; beams still hit (SQUAD: on target)', ok,
      `FFA median off-axis while charging ${fx(f.med, 3)} rad (${f.n} decisions), beams ${f.beams} hits ${f.hits} | SQUAD ${fx(s.med, 3)} rad, beams ${s.beams} hits ${s.hits}`)
  }

  // 7. rule 3 + D11 timing + rule 8: first-shot gate (busy 1.5 s, under half hp, outside its wedge, 60-190 m, cover within 6 m; finish at 40%; duel survivor)
  {
    const br = ffaB(ctxMap), B = br._B
    const base = JSON.parse(JSON.stringify(streamObs[0])), [x, y, z] = base.self.pos
    // bookkeeping through real observations: A (id 7) aims at B (id 8) for 2 s, then B dies (alive 16 -> 15, not our kill)
    for (let k = 0; k < 25; k++) {
      const o = JSON.parse(JSON.stringify(base)); o.tick = 4000 + k * 2; o.t = 100 + k * 0.1; o.events = []; o.projectiles = []; o.beams = []; o.alive = k < 22 ? 16 : 15
      o.mechs = [{ id: 7, kind: 'mech', pos: [x + 120, y, z], vel: [0, 0, 0], aim: [Math.PI / 2, 0], hp: 600, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }]
      if (k < 22) o.mechs.push({ id: 8, kind: 'mech', pos: [x + 120, y + 90, z], vel: [0, 0, 0], aim: [-Math.PI / 2, 0], hp: 200, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })
      br.act(o, performance.now() + 27)
    }
    const A = B.tracks.get(7), busyS = 2.1, survivor = B.me.t - A.duelWonT
    const t = B.me.t
    const tr = (o) => ({ listed: true, npc: false, busyWith: 8, busySince: t - 2, hp: 600, maxHp: 1400, yaw: Math.PI / 2, bearing: 0, dist: 100, cubes: 0, cubesKnown: true, thirdExitT: -99, duelWonT: -99, finishable: false, x: x + 100, y, conf: 1, ...o })
    B.hide.state = 'found'; B.hide.dist = 4; B.ffaOpen = true
    const cases = {
      third: B.ffa.firstShotOk(tr({})), busy1s: B.ffa.firstShotOk(tr({ busySince: t - 1 })), healthy: B.ffa.firstShotOk(tr({ hp: 800 })), facing: B.ffa.firstShotOk(tr({ yaw: Math.PI + 0.3 })),
      close3cubes: B.ffa.firstShotOk(tr({ dist: 70, cubes: 4 })), far: B.ffa.firstShotOk(tr({ dist: 200 })), finish: B.ffa.firstShotOk(tr({ busyWith: -1, hp: 540 })), calm: B.ffa.firstShotOk(tr({ busyWith: -1 })),
      survivor: B.ffa.firstShotOk(tr({ busyWith: -1, duelWonT: t - 2 })), exitHeld: B.ffa.firstShotOk(tr({ thirdExitT: t - 2 })),
    }
    B.hide.dist = 10; const noCover = B.ffa.firstShotOk(tr({}))
    B.hide.dist = 4; B.ffaOpen = false; const early = B.ffa.firstShotOk(tr({}))
    const ok = A.busyWith === -1 && A.busyLastWith === 8 && survivor >= 0 && survivor < 0.5 && cases.third && !cases.busy1s && !cases.healthy && !cases.facing && !cases.close3cubes && !cases.far && cases.finish && !cases.calm && cases.survivor && !cases.exitHeld && !noCover && !early
    check('ffa: rule 3 / D11 third-party timing / rule 8: first shot only at a busy (1.5 s) mech under half hp from outside its wedge with cover, at a finish (<= 40%) or at a duel survivor', ok,
      `busy bookkeeping: last busy with ${A.busyLastWith}, duel won ${fx(survivor, 2)} s ago | ${Object.entries(cases).map(([k, v]) => k + ' ' + v).join(', ')}, no cover ${noCover}, before 90 s ${early}`)
  }

  // 8. rules 4 / 10: hit by a healthy mech -> answer fire while breaking the line, move 20 m from where it last saw us, stay out of sight 9 s (SQUAD fights)
  {
    const sp = ffaSpot(208)
    const run = (mkB) => {
      const ar = new Arena({ cfg, world, nav, seed: 208, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, zone: bigZone(sp.x, sp.y), enemies: [{ id: 10, x: sp.ex, y: sp.ey, hp: 1400, script: shooter(70) }] })
      ar.t = 100
      const br = mkB()
      let tTrig = -1, tEnd = -1, lastSeenT = -1, lsx = 0, lsy = 0, endGap = -1, endMove = -1, shotsBreak = 0, prevShots = 0, modes = {}
      drive(ar, br, 30, (a, obs, act, b) => {
        const B = b._B, e = a.enemies[0], me = a.me
        const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) || world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 8.5)
        if (los) { lastSeenT = a.t; lsx = me.x; lsy = me.y }
        modes[B.mode] = (modes[B.mode] || 0) + 1
        const ns = a.stats.shots + a.stats.beams - prevShots; prevShots = a.stats.shots + a.stats.beams
        if (B.ffaBreak && tTrig < 0) tTrig = a.t
        if (B.ffaBreak && los) shotsBreak += ns
        if (tTrig >= 0 && tEnd < 0 && !B.ffaBreak) { tEnd = a.t; endGap = a.t - lastSeenT; endMove = Math.hypot(me.x - lsx, me.y - lsy) }
      })
      return { tTrig, tEnd, endGap, endMove, shotsBreak, modes, hp: ar.me.hp }
    }
    if (!sp) check('ffa: rule 4 scenario found', false, 'no spot')
    else {
      const f = run(() => ffaB(ctxMap)), s = run(() => sqB(ctxMap))
      const ok = f.tTrig > 0 && f.tTrig < 102 && f.shotsBreak > 0 && f.tEnd > 0 && f.endGap >= 8.9 && f.endMove >= 20 && s.tTrig < 0 && (s.modes.FIGHT || 0) > (s.modes.DISENGAGE || 0)
      check('ffa: rule 4 / 10: shot by a healthy mech -> fire back while breaking the line, relocate >= 20 m, out of sight >= 9 s, then resume (SQUAD fights)', ok,
        `FFA: break at ${fx(f.tTrig, 1)} s, shots while exposed in the break ${f.shotsBreak}, ended at ${fx(f.tEnd, 1)} s: unseen ${fx(f.endGap, 1)} s, ${fx(f.endMove, 0)} m from the last-seen point; modes ${JSON.stringify(f.modes)} | SQUAD: break ${f.tTrig < 0 ? 'n/a' : s.tTrig}, modes ${JSON.stringify(s.modes)}`)
    }
  }

  // 9. rules 9 / 8 / 10 triggers: wounded in a calm mech's view breaks the line; healthy in its view does not; a finish (35%) is exempt
  {
    const sp = ffaSpot(209)
    const run = (hp, ehp, dps) => {
      const ar = new Arena({ cfg, world, nav, seed: 209, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x), hp }, zone: bigZone(sp.x, sp.y),
        enemies: [{ id: 10, x: sp.ex, y: sp.ey, hp: ehp, maxHp: 1400, script: dps ? shooter(dps) : (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(sp.y - e.y, sp.x - e.x) + 1.2 } }] })
      ar.t = 100
      const br = ffaB(ctxMap)
      let trig = -1
      drive(ar, br, 4, (a, obs, act, b) => { if (b._B.ffaBreak && trig < 0) trig = a.t })
      return trig
    }
    if (!sp) check('ffa: rule 9 scenario found', false, 'no spot')
    else {
      const wounded = run(0.45 * 1400, 1400, 0), healthy = run(1400, 1400, 0), finish = run(1400, 490, 60), shot = run(1400, 1400, 60)
      const ok = wounded > 0 && healthy < 0 && finish < 0 && shot > 0
      check('ffa: rules 9 / 8 / 4: wounded (45%) in a calm mech\'s view breaks the line; healthy in view does not; a 35% attacker is finished, not fled', ok,
        `wounded: break at ${fx(wounded, 1)} s | healthy: ${healthy < 0 ? 'no break' : healthy} | shot by a 35% mech: ${finish < 0 ? 'no break (finish)' : finish} | shot by a healthy mech: break at ${fx(shot, 1)} s`)
    }
  }

  // 10. rule 5: keep 50+ m from a lightning carrier walking in (we walk away), unless we hold lightning and more hp
  {
    const mk = (weapons) => { const ar = new Arena({ cfg, seed: 210, me: { x: 0, y: 0, yaw: 0, weapons }, enemies: [{ id: 10, x: 75, y: 0, hp: 1400, weapons: ['gun', 'lightning'], dps: 20,
      script: (e, t, a, dt) => { face(e, a); const dx = a.me.x - e.x, dy = a.me.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 9; e.vy = dy / d * 9; e.x += e.vx * dt; e.y += e.vy * dt } }] }); ar.t = 100; return ar }
    const res = (weapons, mkB) => { const ar = mk(weapons), br = mkB(); let minD = 1e9, keep = 0; drive(ar, br, 15, (a, obs, act, b) => { minD = Math.min(minD, Math.hypot(a.enemies[0].x - a.me.x, a.enemies[0].y - a.me.y)); if (b._B.legKind === 'lightkeep') keep++ }); return { minD, keep } }
    const f = res(['gun', null], () => ffaB(ctxNone)), fl = res(['gun', 'lightning'], () => ffaB(ctxNone)), s = res(['gun', null], () => sqB(ctxNone))
    const ok = f.minD >= 40 && f.keep > 20 && fl.keep === 0 && s.minD < f.minD
    check('ffa: rule 5: a lightning carrier walking in at 9 m/s is kept beyond 40 m (we walk away); not when we hold lightning and more hp; SQUAD lets it close', ok,
      `FFA gun: min ${fx(f.minD, 1)} m, lightkeep ${f.keep} decisions | FFA with lightning: lightkeep ${fl.keep}, min ${fx(fl.minD, 1)} m | SQUAD: min ${fx(s.minD, 1)} m`)
  }

  // 11. rule 6: gun gate by target motion (sub-second reverser only under 0.3 s of flight; steady waiver to 0.8 s)
  {
    const mkS = (D, period) => { const ar = new Arena({ cfg, seed: 211, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [{ id: 10, x: D, y: 0, hp: BIGHP, dps: 4, script: strafer(D, period, 10) }] }); ar.t = 100; return ar }
    const mkW = (D) => { const ar = new Arena({ cfg, seed: 212, me: { x: 0, y: 0, yaw: 0, pinned: true }, enemies: [{ id: 10, x: D, y: -150, hp: BIGHP, dps: 4, script: crossing(D, 1e9, 6) }] }); ar.t = 100; return ar }
    const shots = (ar, mkB) => { const br = mkB(); drive(ar, br, 12); return ar.stats.shots }
    const revF = shots(mkS(110, 0.7), () => ffaB(ctxNone)), revS = shots(mkS(110, 0.7), () => sqB(ctxNone)), slowF = shots(mkS(110, 1.6), () => ffaB(ctxNone))
    const farF = shots(mkW(200), () => ffaB(ctxNone)), farS = shots(mkW(200), () => sqB(ctxNone)), midF = shots(mkW(160), () => ffaB(ctxNone))
    const tr = { revT: new Float64Array([100.1, 100.9, 101.7, 102.5]) }, tr2 = { revT: new Float64Array([99.6, 101.0, 102.4, 0]) }
    const br = ffaB(ctxNone); br._B.me.t = 102.6
    const ok = revF === 0 && revS > 10 && slowF > 10 && farF === 0 && farS > 10 && midF > 10 && br._B.ffa.reverser(tr) && !br._B.ffa.reverser(tr2)
    check('ffa: rule 6: no gun at a 0.7 s reverser at 110 m (0.44 s flight; SQUAD fires), fires at a 1.6 s one; steady walker fired at 160 m, not at 200 m (0.8 s cap; SQUAD fires)', ok,
      `reverser 110 m: FFA ${revF} shots, SQUAD ${revS} | slow reverser FFA ${slowF} | steady 160 m FFA ${midF} | steady 200 m FFA ${farF}, SQUAD ${farS} | median-gap test ${br._B.ffa.reverser(tr)}/${br._B.ffa.reverser(tr2)}`)
  }

  // 12. rule 8: calm courtesy: torso 0.3 rad off a calm mech, no first shot at a healthy calm mech, a 35% mech is finished; no loot inside 45 m of it
  {
    const mk = (ehp, cube) => { const ar = new Arena({ cfg, seed: 212, me: { x: 0, y: 0, yaw: 0 }, cubes: cube ? [{ id: 5002, pos: [100, 20, 0] }] : [], enemies: [{ id: 10, x: 110, y: 0, hp: ehp, maxHp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI / 2 } }] }); ar.t = 100; return ar }
    const res = (ehp, cube, mkB) => {
      const ar = mk(ehp, cube), br = mkB()
      let trackOff = 1e9, nTrack = 0
      drive(ar, br, 10, (a, obs, act, b) => { if (b._B.aimKind === 'track') { nTrack++; trackOff = Math.min(trackOff, offAim(act.aim[0], a.me.x, a.me.y, a.enemies[0].x, a.enemies[0].y)) } })
      return { shots: ar.stats.shots + ar.stats.beams, trackOff, nTrack, cubes: ar.stats.cubesTaken || 0, ehp: ar.enemies[0].hp }
    }
    const calm = res(1400, true, () => ffaB(ctxNone)), fin = res(490, false, () => ffaB(ctxNone)), off = res(1400, true, () => ffaB(ctxNone, { select: { ffaRules: 'off' } }))
    const ok = calm.shots === 0 && calm.nTrack > 0 && calm.trackOff >= 0.29 && calm.cubes === 0 && fin.shots > 0 && off.cubes === 1
    check('ffa: rule 8 calm courtesy: no first shot at a healthy calm mech, torso >= 0.3 rad off it, no cube inside 45 m of it (rules off: taken); a 35% mech is finished', ok,
      `calm: shots ${calm.shots}, track-look decisions ${calm.nTrack} min off-bearing ${fx(calm.trackOff, 2)} rad, cube 22 m from it taken ${calm.cubes} | 35%: shots ${fin.shots}, its hp ${fx(fin.ehp, 0)} | rules off: cube ${off.cubes}`)
  }

  // 13. D11 boost rarely: a hostile mech inside 90 m with our laser: SQUAD boosts away (D2), FFA walks
  {
    const mk = () => { const ar = new Arena({ cfg, seed: 213, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'] }, enemies: [{ id: 10, x: 70, y: 0, hp: BIGHP, dps: 30, script: (e, t, a) => { face(e, a); e.vx = 0; e.vy = 0 } }] }); ar.t = 100; return ar }
    const res = (mkB) => { const ar = mk(), br = mkB(); let boosts = 0; drive(ar, br, 8, (a, obs, act) => { if (act.boost) boosts++ }); return boosts }
    const f = res(() => ffaB(ctxNone)), s = res(() => sqB(ctxNone))
    check('ffa: D11 boost rarely: no laser-band boost-away in FFA (SQUAD boosts away from a mech inside 90 m)', f === 0 && s > 5, `boost decisions FFA ${f}, SQUAD ${s}`)
  }

  // 14. D11 final-point hp race: from 390 s stand on next_center (SQUAD follows the moving centre)
  {
    const zone = { center: [0, 0], radius: 25, next_center: [14, 6], next_radius: 0, shrink_start: 390, shrink_end: 415, dps: 260 }
    const res = (mkB) => {
      const ar = new Arena({ cfg, seed: 214, me: { x: -4, y: -3, yaw: 0 }, zone, enemies: [] }); ar.t = 386
      const br = mkB()
      const d = []
      drive(ar, br, 27, (a) => { if (a.t >= 400 && a.t <= 413) d.push(Math.hypot(a.me.x - 14, a.me.y - 6)) })
      return { mean: d.reduce((p, q) => p + q, 0) / Math.max(1, d.length), max: Math.max(...d), out: ar.stats.outsideTicks, hp: ar.me.hp }
    }
    const f = res(() => ffaB(ctxNone)), s = res(() => sqB(ctxNone))
    const ok = f.max < 2.5 && f.out <= 6 && s.mean > f.mean + 2
    check('ffa: D11 final-point hp race: from 390 s we stand on next_center (within 2.5 m, no zone damage); SQUAD tracks the moving centre', ok,
      `FFA: mean ${fx(f.mean, 2)} m, max ${fx(f.max, 2)} m from next_center 400-413 s, ticks outside ${f.out}, hp ${fx(f.hp, 0)} | SQUAD: mean ${fx(s.mean, 2)} m, outside ${s.out}`)
  }

  // 15. addendum K2 (FFA only): an aim sweep crossing us for one decision is not hostility; 3 decisions are; SQUAD keeps D0's instant aim rule
  {
    const base = JSON.parse(JSON.stringify(streamObs[0])), [x, y, z] = base.self.pos
    const run = (mkB, aimSeq) => {
      const br = mkB(), B = br._B
      let hostile = false
      aimSeq.forEach((onUs, k) => {
        const o = JSON.parse(JSON.stringify(base)); o.tick = 6000 + k * 2; o.t = 100 + k * 0.1; o.events = []; o.projectiles = []; o.beams = []
        o.mechs = [{ id: 7, kind: 'mech', pos: [x + 120, y, z], vel: [0, 0, 0], aim: [onUs ? Math.PI : Math.PI / 2, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }]
        br.act(o, performance.now() + 27)
        const tr = B.tracks.get(7); if (tr && tr.hostile && B.env === 'FFA') hostile = true; if (tr && tr.hostile && B.env !== 'FFA') hostile = true
      })
      return hostile
    }
    const sweep = [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0], dwell = [0, 0, 1, 1, 1, 1, 0]
    const fS = run(() => ffaB(ctxNone), sweep), fD = run(() => ffaB(ctxNone), dwell), sS = run(() => sqB(ctxNone), sweep)
    check('ffa: addendum K2 (FFA only): a 1-2 decision aim sweep is not hostility, 3 decisions are; SQUAD unchanged (instant)', !fS && fD && sS, `FFA sweep hostile ${fS}, FFA 0.3 s dwell hostile ${fD}, SQUAD sweep hostile ${sS}`)
  }

  // 16. counter-module corrections (dossier section 6, M3 / M5, addendum K3): rusher capped at opportunistic; wounded hider at <= 40% -> finish (attack); farmer strike gated
  {
    const { createCounters } = await import('../bot/lib/counters.js')
    const feedC = (c, n, mech, extra) => { for (let k = 0; k < n; k++) c.update({ t: 100 + k * 0.1, self: { id: 3, pos: [0, 0, 0], hp: 1400, max_hp: 1400, energy: 100, weapons: [{ kind: 'gun' }, { kind: 'laser' }] }, mechs: [{ kind: 'mech', vel: [0, 0, 0], cubes: 0, weapons: ['gun'], charging: false, ...mech }], ...(extra || {}) }, 100 + k * 0.1) }
    const ctx = { env: 'FFA', bandLo: 125, bandHi: 185, myLaser: true, myLightning: false, myGun: true, myHpf: 1, myHp: 1400, myEnergy: 100, alive: 12 }
    const c1 = createCounters(hello); feedC(c1, 120, { id: 5, pos: [150, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400 })
    const c2 = createCounters(hello); feedC(c2, 120, { id: 5, pos: [150, 0, 0], aim: [0, 0], hp: 500, max_hp: 1400 })
    const c3 = createCounters(hello); feedC(c3, 120, { id: 5, pos: [150, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400 })
    const a1 = { ...c1.adviceFor(5, ctx) }, a2 = { ...c2.adviceFor(5, ctx) }, a3 = { ...c3.adviceFor(5, { ...ctx, alive: 6 }) }
    const { COUNTER_PARAMS: CP } = await import('../bot/lib/counters.js')
    const ok = a1.reason === 'HD/pass' && a1.engage === 'avoid' && a2.reason === 'HD/finish' && a2.engage === 'attack' && a3.reason === 'HD/strafer' && CP.brLevel === 2 && CP.hdWoundHpf === 0.4 && CP.fmStrikeTgtHpf === 0.5 && CP.hdHarvestTgtHpf === 0.4
    check('ffa: counter corrections: healthy hider pass (avoid); hider at 36% -> HD/finish (attack, K3); at 6 alive a gun hider reads as strafer (M5); BR capped (M3); strike / harvest gated 50% / 40%', ok,
      `healthy ${a1.reason} ${a1.engage} | 36% ${a2.reason} ${a2.engage} band ${fx(a2.lo, 0)}-${fx(a2.hi, 0)} | 6 alive ${a3.reason} ${a3.engage} | brLevel ${CP.brLevel}, hdWoundHpf ${CP.hdWoundHpf}, fmStrikeTgtHpf ${CP.fmStrikeTgtHpf}, hdHarvestTgtHpf ${CP.hdHarvestTgtHpf}`)
  }
}

