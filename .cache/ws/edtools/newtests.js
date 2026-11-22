// ============================================================================ integration pass 1: one check per fix
// (reviewer findings 0.x = safety review, 1.x = tactics review; Dn = DOCTRINE V4 item)
const obsAt = (o2) => {
  const o = JSON.parse(JSON.stringify(streamObs[0]))
  Object.assign(o, { mechs: [], projectiles: [], events: [], beams: [], crates: [], cubes: [], pickups: [], drops: [], offer: null, sounds: [] }, o2.top || {})
  Object.assign(o.self, o2.self || {})
  return o
}
const t45 = (ar) => { ar.t = 45; return ar }
if (want('fix')) {
  // 0.0 pocket exit: start inside the stadium bowl (nav component 16) in the dev simulator, zone elsewhere
  {
    let detail = 'sim not found', ok = false
    if (existsSync(join(ROOT, 'sim', 'sim.js'))) {
      const { makeContext } = await import('../sim/run.js'), { Match } = await import('../sim/sim.js'), { HouseBot, FFA_TYPES } = await import('../sim/house.js')
      const sctx = makeContext({ quiet: true }), nav0 = sctx.nav
      const bowl = []
      for (let c = 0; c < nav0.n; c++) if (nav0.comp[c] === 16 && nav0.wallDist[c] > 8) bowl.push(c)
      const res = []
      for (const seed of [2, 11]) {
        let brain = null, leftAt = -1, zoneDmg = 0
        const navB = new Nav(sctx.world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
        const ours = { name: 'ours', hello(h) { brain = createBrain(h, { world: sctx.world, nav: navB, log: () => {} }); return { type: 'ready', name: 'ours' } },
          act(obs) { const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick
            if (leftAt < 0 && obs.self.grounded && nav0.component(obs.self.pos[0], obs.self.pos[1]) === nav0.mainComponent) leftAt = obs.t
            for (const e of obs.events) if (e.type === 'damaged' && e.weapon === 'zone') zoneDmg += e.amount
            return a } }
        const bots = [ours]
        for (let i = 1; i < sctx.cfg.match.mechs; i++) bots.push(new HouseBot(FFA_TYPES[(i + seed) % FFA_TYPES.length], { world: sctx.world, nav: sctx.nav, params: sctx.merged.house }))
        const match = new Match({ world: sctx.world, nav: sctx.nav, collider: sctx.collider, seed, config: sctx.cfg, bots, mode: 'ffa', mapDir: sctx.mapDir, focus: 0 })
        const c = bowl[(seed * 7919) % bowl.length], me = match.mechs[0]
        me.x = nav0.cellX(c); me.y = nav0.cellY(c); me.z = nav0.level[c]
        match.runSync()
        res.push({ seed, leftAt, zoneDmg })
      }
      ok = res.every((r) => r.leftAt >= 0 && r.leftAt <= 45 && r.zoneDmg === 0)
      detail = res.map((r) => `seed ${r.seed}: out of the bowl at ${fx(r.leftAt, 1)} s, zone damage ${fx(r.zoneDmg, 0)}`).join(' | ')
    }
    check('fix 0.0 pocket exit: a start in the stadium bowl hops out via nav.hopPlan, no zone damage', ok, detail)
  }
  // 0.1 selectTarget: wounded attacker hides (still listed by memory) while an unseen drone hits us -> no stage error
  {
    const b = createBrain(hello, ctxNone)
    let err = 0
    for (let k = 0; k < 60; k++) {
      const ev = []
      if (k < 6 && k % 2 === 0) ev.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.2, by: 5 })
      if (k % 10 === 3) ev.push({ type: 'damaged', amount: 25, weapon: 'npc', bearing: 2.5, by: 130 })
      const [x, y, z] = streamObs[0].self.pos
      const o = obsAt({ top: { tick: k * 2, t: 50 + k * 0.1, events: ev, mechs: [{ id: 5, kind: 'mech', pos: [x + 60, y + 10, z], vel: [0, 3, 0], aim: [3.1, 0], hp: 400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }] } })
      b.act(o, performance.now() + 27)
    }
    err = b.debugState().counters.errors
    check('fix 0.1 selectTarget: wounded hidden attacker plus an unseen drone never throws', err === 0, `stage errors ${err}, target ${b.debugState().target}`)
  }
  // 0.2 no running boost in the air (boost is the jet there)
  {
    const b = createBrain(hello, ctxNone)
    let airBoost = 0
    for (let k = 0; k < 30; k++) {
      const o = obsAt({ top: { tick: k * 2, t: 60 + k * 0.1, zone: { center: [0, 0], radius: 50, next_center: [0, 0], next_radius: 30, shrink_start: 0, shrink_end: 1, dps: 20 } }, self: { grounded: k % 3 !== 0, in_zone: false, energy: 90 } })
      const a = b.act(o, performance.now() + 27)
      if (!o.self.grounded && a.boost) airBoost++
    }
    check('fix 0.2 airborne: no boost while not grounded (outside the zone)', airBoost === 0, `airborne decisions with boost ${airBoost}/10`)
  }
  // 0.3 / 1.11 / D10 determinism: same observations, normal deadline vs a deadline already passed -> same actions, fuse 0
  {
    const run = (late) => { const b = createBrain(hello, ctxMap); const out = []; for (const o of streamObs.slice(0, 250)) { const t0 = performance.now(); out.push(JSON.stringify(b.act(o, late ? t0 - 5 : t0 + 27.5))) } return { s: out.join('\n'), fuse: b.debugState().counters.fuse } }
    const r1 = run(false), r2 = run(true)
    check('fix 0.3/1.11 (D10) no wall-clock behaviour: identical actions with a normal or an expired deadline, fuse never trips', r1.s === r2.s && r1.fuse === 0 && r2.fuse === 0, `identical ${r1.s === r2.s}, fuse trips ${r1.fuse}/${r2.fuse}`)
  }
  // 0.5 setBody warm-up for cubes 1..12 (twice), base body restored
  {
    const { warmBodies } = await import('../bot/lib/brain.js')
    const calls = []
    const spy = { setBody: (r, h) => calls.push([r, h]) }
    const n = warmBodies(spy, { mech: cfg.mech, cubes: cfg.cubes })
    const last = calls[calls.length - 1]
    check('fix 0.5 nav.setBody warmed at start-up for 12 cube sizes, base body restored', n === 24 && last[0] === cfg.mech.radius && last[1] === cfg.mech.height && nav.radius === cfg.mech.radius,
      `${n} warm-up resizes, last call ${last}, shared nav body ${nav.radius}`)
  }
  // 0.6 own body: never smaller than the cube formula
  {
    const b = createBrain(hello, ctxNone)
    b.act(obsAt({ top: { t: 70 }, self: { cubes: 10, stats: { ...streamObs[0].self.stats, radius: 2.5, height: 9 } } }), performance.now() + 27)
    const r = b._B.me.radius, h = b._B.me.height
    check('fix 0.6 own body size from the cube formula when stats are not scaled', Math.abs(r - 3.75) < 1e-6 && Math.abs(h - 13.5) < 1e-6, `radius ${fx(r)} height ${fx(h)} at 10 cubes`)
  }
  // 0.7 tracks far outside the map are clamped (no km-long rays)
  {
    const b = createBrain(hello, ctxMap)
    const [x, y, z] = streamObs[0].self.pos
    let worst = 0
    for (let k = 0; k < 30; k++) {
      const mechs = []
      for (let i = 0; i < 10; i++) mechs.push({ id: 20 + i, kind: 'mech', pos: [world.bounds.maxX + 90000, y + i * 10, z], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })
      const t0 = performance.now(); b.act(obsAt({ top: { tick: k * 2, t: 80 + k * 0.1, mechs } }), t0 + 27); worst = Math.max(worst, performance.now() - t0)
    }
    check('fix 0.7 ten mechs 90 km outside the map: decisions stay fast', worst < 8, `slowest decision ${fx(worst)} ms`)
  }
  // 0.8 bot.js: hello + obs + end in one write -> the obs is answered
  {
    const { spawnSync } = await import('node:child_process')
    const input = [JSON.stringify(hello), JSON.stringify(streamObs[0]), JSON.stringify({ type: 'end', place: 3, kills: 1 })].join('\n') + '\n'
    const r = spawnSync(process.execPath, [join(ROOT, 'bot', 'bot.js')], { input, encoding: 'utf8', timeout: 30000 })
    const outL = (r.stdout || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } })
    const ans = outL.filter((m) => m && m.tick === streamObs[0].tick)
    check('fix 0.8 bot.js: an obs in the same chunk as end is answered; ready first', outL[0] && outL[0].type === 'ready' && ans.length === 1, `lines ${outL.length}, answers ${ans.length}`)
  }
  // 1.0 trigger down at cooldown <= 0.1: one shot per 0.24 s inside a magazine
  {
    const ar = t45(new Arena({ cfg, seed: 101, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 70, y: 0, hp: BIGHP, dps: 1, script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    const ts = []
    let prev = 0
    drive(ar, b, 20, (a) => { if (a.stats.shots > prev) { ts.push(a.t); prev = a.stats.shots } })
    const gaps = []; for (let i = 1; i < ts.length; i++) { const g = ts[i] - ts[i - 1]; if (g < 1) gaps.push(g) }
    const mg = gaps.reduce((s, g) => s + g, 0) / Math.max(1, gaps.length)
    check('fix 1.0 (D8) gun cadence: mean gap inside a magazine <= 0.26 s', gaps.length > 20 && mg <= 0.26, `shots ${ar.stats.shots} in 20 s, mean in-magazine gap ${fx(mg, 3)} s`)
  }
  // 1.1 / 1.2 (D3): one hunter, we at 60% and it at 100%: never LOSING, never LAST-STAND; two hunters at 45%: LOSING
  {
    const mk = (hp, n) => t45(new Arena({ cfg, seed: 102, me: { x: 0, y: 0, yaw: 0, hp: hp * 1400 }, enemies: Array.from({ length: n }, (_, i) => ({ id: 10 + i, x: 80, y: i * 20, hp: 1400, dps: 20, script: (e, t, a) => face(e, a) })) }))
    const run = (hp, n) => { const ar = mk(hp, n), b = createBrain(hello, ctxNone); let lose = 0, ls = 0, dis = 0, k = 0; drive(ar, b, 4, (a, o, act, br) => { const s = br.debugState(); k++; if (s.losing) lose++; if (s.stance === 'LAST-STAND') ls++; if (s.mode === 'DISENGAGE' || s.mode === 'HEAL') dis++ }); return { lose, ls, dis, k } }
    const a = run(0.6, 1), c = run(0.45, 2)
    check('fix 1.1/1.2 (D3) LOSING table: 1 hunter at 60% hp fights on; 2 hunters at 45% -> LOSING retreat; no LAST-STAND', a.lose === 0 && a.dis === 0 && a.ls === 0 && c.lose >= 0.8 * c.k && c.ls === 0,
      `1 v 1 at 60%: losing ${a.lose}/${a.k}, retreat/heal ${a.dis}, last stand ${a.ls} | 2 v 1 at 45%: losing ${c.lose}/${c.k}, last stand ${c.ls}`)
  }
  // 1.3 strafe reversals continue through our reload against a gun + laser target
  {
    const ar = t45(new Arena({ cfg, seed: 103, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: BIGHP, dps: 30, weapons: ['gun', 'laser'], script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    let flips = 0, last = b._B.counters.jinks, rel = 0
    drive(ar, b, 15, (a, o) => { const j = b._B.counters.jinks; if (o.self.weapons[0].reload > 0) { rel++; flips += j - last } last = j })
    check('fix 1.3 strafe reversals continue during our reload against a laser holder', rel > 10 && flips >= 2, `reload decisions ${rel}, reversals during them ${flips}`)
  }
  // 1.4 (D6) power grab: a laser pickup 35 m away is taken during a fight
  {
    const ar = t45(new Arena({ cfg, seed: 104, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: BIGHP, dps: 20, script: (e, t, a) => face(e, a) }], pickups: [{ id: 8101, kind: 'laser', pos: [0, 35, 0] }] }))
    const b = createBrain(hello, ctxNone)
    drive(ar, b, 15)
    check('fix 1.4 (D6) power grab: laser pickup 35 m away taken while fighting', ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser', `slot 1: ${ar.me.weapons[1] ? ar.me.weapons[1].kind : 'empty'}, shots ${ar.stats.shots}`)
  }
  // 1.5 a drone hitting us does not take the target from a mech in a duel
  {
    const ar = t45(new Arena({ cfg, seed: 105, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 75, y: 0, hp: BIGHP, dps: 30, script: (e, t, a) => face(e, a) }, { id: 120, kind: 'npc', x: -35, y: 0, hp: 350, radius: 1.8, height: 3.5, dps: 25, script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    let onMech = 0, n = 0
    drive(ar, b, 10, (a) => { const s = b.debugState(); if (a.t > 46) { n++; if (s.target === 10) onMech++ } })
    check('fix 1.5 drone touching us during a duel: the mech stays the target', onMech >= 0.9 * n, `target on the mech ${onMech}/${n}`)
  }
  // 1.6 partial paths: the flip-flop spot of seed 156 gets a complete path (full A* budget)
  {
    const b = createBrain(hello, ctxMap)
    b.act(obsAt({ top: { t: 100 }, self: { pos: [49, 222, nav.levelAt(49, 222)] } }), performance.now() + 27)
    const B = b._B
    B.planTick = -1
    const mv = (await import('../bot/lib/mover.js')).makeMover(B)
    mv.moveTo(11, 178, 1, 1)
    check('fix 1.6 partial path: the 439 m detour from the seed-156 spot is planned completely', mv.path.ok && mv.path.len > 300, `path ok ${mv.path.ok}, length ${fx(mv.path.len, 0)} m`)
  }
  // 1.7 (D6) cubes of our kill are fetched although another mech has a line on us
  {
    const ar = t45(new Arena({ cfg, seed: 107, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 60, y: 0, hp: 100, dps: 10, script: (e, t, a) => face(e, a) }, { id: 11, x: -130, y: 40, hp: BIGHP, dps: 15, script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    let dropped = false
    drive(ar, b, 20, (a) => { if (!dropped && !a.enemies[0].alive) { dropped = true; a.cubes.push({ id: 5200, pos: [a.enemies[0].x, a.enemies[0].y, 0] }, { id: 5201, pos: [a.enemies[0].x + 2, a.enemies[0].y + 1, 0] }) } })
    check('fix 1.7 (D6) kill cubes collected in contact', dropped && ar.me.cubes === 2, `killed ${dropped}, cubes ${ar.me.cubes}/2`)
  }
  // 1.8 (D3) HEAL: not at 65% hp out of contact; at 50% heals and leaves at 70%
  {
    const run = (hp, s) => { const ar = new Arena({ cfg, seed: 108, me: { x: 0, y: 0, yaw: 0, hp: hp * 1400 } }); const b = createBrain(hello, ctxNone); let heal = 0, exitHp = -1, was = false; drive(ar, b, s, (a, o, act, br) => { const m = br.debugState().mode; if (m === 'HEAL') heal++; if (was && m !== 'HEAL' && exitHp < 0) exitHp = a.me.hp / a.me.maxHp; was = m === 'HEAL' }); return { heal, exitHp } }
    const a = run(0.65, 4), c = run(0.5, 20)
    check('fix 1.8 (D3) HEAL only below 55% out of contact, leaves at healExit', a.heal === 0 && c.heal > 20 && c.exitHp >= HEAL_EXIT - 0.01 && c.exitHp <= HEAL_EXIT + 0.06, `65%: heal decisions ${a.heal} | 50%: heal ${c.heal}, left at ${fx(c.exitHp, 3)}`)
  }
  // 1.9 torso veto as a target rule: kill-secure mech east is finished although a shooter stands west
  {
    const ar = t45(new Arena({ cfg, seed: 109, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 70, y: 0, hp: 120, dps: 5, script: (e, t, a) => face(e, a) }, { id: 11, x: -70, y: 5, hp: BIGHP, dps: 90, script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    let tKill = -1
    drive(ar, b, 8, (a) => { if (tKill < 0 && !a.enemies[0].alive) tKill = a.t - 45 })
    check('fix 1.9 torso veto: a kill-secure target is finished (not parked between two enemies)', tKill >= 0 && tKill <= 3, `kill after ${fx(tKill, 1)} s`)
  }
  // 1.12 (D9) final phases: next radius 25 with a mech on the centre -> converge, almost no zone damage
  {
    const zone = { center: [0, 0], radius: 70, next_center: [10, 5], next_radius: 25, shrink_start: 46, shrink_end: 71, dps: 100 }
    const ar = t45(new Arena({ cfg, seed: 112, me: { x: 55, y: -20, yaw: 0 }, zone, enemies: [{ id: 10, x: 10, y: 5, hp: BIGHP, dps: 8, script: (e, t, a) => face(e, a) }] }))
    const b = createBrain(hello, ctxNone)
    drive(ar, b, 30)
    check('fix 1.12 (D9) late zone with an enemy on the centre: converge, <= 3 ticks outside', ar.stats.outsideTicks <= 3, `ticks outside ${ar.stats.outsideTicks}, end distance to centre ${fx(Math.hypot(ar.me.x - 10, ar.me.y - 5), 1)} m`)
  }
  // 1.13 idle: nothing in sight on the real map -> walks (no standing at a wall)
  {
    const spot = findHealSpot()
    const ar = new Arena({ cfg, world, nav, seed: 113, me: { x: spot.x, y: spot.y, yaw: 0 }, zone: { center: [spot.x, spot.y], radius: 560, next_center: [spot.x + 50, spot.y], next_radius: 380, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
    const b = createBrain(hello, ctxMap)
    let still = 0, n = 0
    drive(ar, b, 30, (a, o) => { n++; if (Math.hypot(o.self.vel[0], o.self.vel[1]) < 0.5) still++ })
    check('fix 1.13 idle: no standing still when nothing is in sight', still <= 0.15 * n, `still ${still}/${n}, stuck events ${b.debugState().counters.stuck}`)
  }
  // 1.14 hide cell lies away from the attacker
  {
    const spot = findHealSpot()
    const ar = new Arena({ cfg, world, nav, seed: 114, me: { x: spot.x, y: spot.y, yaw: 0, hp: 0.3 * 1400 }, enemies: [{ id: 10, x: spot.ex, y: spot.ey, hp: 1400, dps: 40, script: (e, t, a) => face(e, a) }] })
    const b = createBrain(hello, ctxMap)
    let cosMax = -2, seen = 0
    drive(ar, b, 6, (a) => { const h = b._B.hide; if (h.state === 'found') { seen++; const dx = h.x - spot.x, dy = h.y - spot.y, d = Math.hypot(dx, dy); if (d > 6) { const ex = spot.ex - spot.x, ey = spot.ey - spot.y; cosMax = Math.max(cosMax, (dx * ex + dy * ey) / (d * Math.hypot(ex, ey))) } } })
    check('fix 1.14 hide cell never toward the attacker (within 60 deg)', seen > 0 && cosMax <= 0.5 + 0.1, `decisions with a cell ${seen}, max cos to the attacker ${fx(cosMax, 2)}`)
  }
  // 1.15 (D0 / D5 / D2): a quiet mech at 180 m in the opening is not engaged; a strafer at 170 m: no unsteady long shots
  {
    const ar = new Arena({ cfg, seed: 115, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 180, y: 0, hp: 1400, script: (e) => { e.yaw = 1.5 } }] })
    const b = createBrain(hello, ctxNone)
    let minD = 1e9
    drive(ar, b, 20, (a) => { minD = Math.min(minD, Math.hypot(a.enemies[0].x - a.me.x, a.enemies[0].y - a.me.y)) })
    const ar2 = t45(new Arena({ cfg, seed: 116, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 170, y: 0, hp: BIGHP, dps: 20, script: (e, t, a, dt) => { face(e, a); const s = Math.floor(t / 0.45) % 2 ? 1 : -1; e.vx = 0; e.vy = s * 9; e.y += e.vy * dt } }] }))
    const b2 = createBrain(hello, ctxNone, { rPrefGun: 170, bandLo: 160, bandHi: 180 })
    drive(ar2, b2, 10)
    const g = b2.debugState().counters.flightGated || 0
    check('fix 1.15 (D0/D5/D2) no fight with a quiet mech in the opening; no long shots at an unsteady target', ar.stats.shots === 0 && minD >= 150 && g > 0 && ar2.stats.shots <= 6,
      `opening: shots ${ar.stats.shots}, closest ${fx(minD, 0)} m | strafer at 170 m: gated ${g} decisions, shots ${ar2.stats.shots}`)
  }
  // 1.16 (D2) ranges by loadout: gun only holds 55-95 m, laser (preset far) 125-185 m
  {
    const run = (weapons) => { const ar = t45(new Arena({ cfg, seed: 117, me: { x: 0, y: 0, yaw: 0, weapons }, enemies: [{ id: 10, x: 150, y: 0, hp: BIGHP, dps: 10, script: (e, t, a) => face(e, a) }] })); const b = createBrain(hello, ctxNone); const ds = []; drive(ar, b, 20, (a) => { if (a.t > 55) ds.push(Math.hypot(a.enemies[0].x - a.me.x, a.enemies[0].y - a.me.y)) }); return ds.reduce((s, d) => s + d, 0) / ds.length }
    const dg = run(['gun', null]), dl = run(['gun', 'laser'])
    check('fix 1.16 (D2) stand-off by loadout: gun 55-95 m, laser 125-185 m', dg >= 55 && dg <= 95 && dl >= 125 && dl <= 185, `gun only mean ${fx(dg, 0)} m | gun + laser mean ${fx(dl, 0)} m`)
  }
  // 1.17 (D4) bullet-aware dodge: a bullet on a collision course changes our velocity perpendicular to it
  {
    const b = createBrain(hello, ctxNone)
    const [x, y, z] = streamObs[0].self.pos
    let side = 0
    for (let k = 0; k < 5; k++) {
      const proj = [{ id: 700 + k, kind: 'gun', pos: [x + 60, y, z + 4.5], vel: [-252, 0, 0] }]
      const a = b.act(obsAt({ top: { tick: k * 2, t: 120 + k * 0.1, projectiles: proj }, self: { vel: [0, 0, 0] } }), performance.now() + 27)
      side = Math.max(side, Math.abs(a.move[1]))
    }
    check('fix 1.17 (D4) bullet-aware dodge sidesteps a bullet aimed at us', side >= 0.8 && b.debugState().counters.bulletDodges > 0, `largest sideways stick ${fx(side)}, dodges ${b.debugState().counters.bulletDodges}`)
  }
  // 1.18 a running laser charge is released when a shell forces the dodge
  {
    const b = createBrain(hello, ctxNone)
    const [x, y, z] = streamObs[0].self.pos
    const tgt = { id: 10, kind: 'mech', pos: [x + 90, y, z], vel: [0, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }
    const lw = (c) => [streamObs[0].self.weapons[0], { kind: 'laser', cooldown: 0, charge: c, stats: cfg.weapons.laser }]
    b.act(obsAt({ top: { tick: 0, t: 130, mechs: [tgt], events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 10 }] }, self: { weapons: lw(0.3) } }), performance.now() + 27)
    const a = b.act(obsAt({ top: { tick: 2, t: 130.1, mechs: [tgt], projectiles: [{ id: 901, kind: 'mortar', pos: [x + 10, y, z + 12], vel: [-10, 0, 0] }] }, self: { weapons: lw(0.4) } }), performance.now() + 27)
    check('fix 1.18 laser charge released when the shell dodge needs full speed', a.fire[1] === false && b.debugState().leg === 'dodge', `fire ${a.fire}, leg ${b.debugState().leg}`)
  }
  // 1.19 (D6) supply drop: no walking into the ring long before the landing
  {
    const b = createBrain(hello, ctxNone)
    const [x, y, z] = streamObs[0].self.pos
    let firstDrop = -1
    for (let k = 0; k < 200 && firstDrop < 0; k++) {
      const landsIn = 20 - k * 0.1
      b.act(obsAt({ top: { tick: k * 2, t: 140 + k * 0.1, drops: [{ id: 20000, pos: [x + 30, y, z], radius: 8, lands_in: landsIn, capture_s: 4, progress: 0, holder: null }] } }), performance.now() + 27)
      if (b.debugState().mode === 'DROP') firstDrop = landsIn
    }
    check('fix 1.19 (D6) drop: start for it no earlier than 3 s plus the walk before landing', firstDrop >= 0 && firstDrop <= 3 + 30 * 1.3 / cfg.mech.walk_speed + 0.3, `DROP mode first with lands_in ${fx(firstDrop, 1)} s`)
  }
  // 1.22 lightning held, mech inside 60 m: no boost below the lightning reserve
  {
    const b = createBrain(hello, ctxNone)
    const [x, y, z] = streamObs[0].self.pos
    let boosts = 0
    for (let k = 0; k < 10; k++) {
      const tgt = { id: 10, kind: 'mech', pos: [x + 40, y, z], vel: [0, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun', 'laser'], charging: false }
      const a = b.act(obsAt({ top: { tick: k * 2, t: 150 + k * 0.1, mechs: [tgt], events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 10 }] }, self: { hp: 200, energy: 40, weapons: [streamObs[0].self.weapons[0], { kind: 'lightning', cooldown: 0, stats: cfg.weapons.lightning }] } }), performance.now() + 27)
      if (a.boost) boosts++
    }
    check('fix 1.22 lightning energy: no boost below lightReserve + 10 with a mech inside 60 m', boosts === 0, `boost decisions ${boosts}/10`)
  }
  // D10 rehearsal: a few hundred synthetic decisions at start-up
  {
    const r = firstBrainState && firstBrainState.rehearsal
    check('D10 start-up rehearsal: >= 300 synthetic decisions, under 5 s, base body restored', !!r && r.ms < 5000 && nav.radius === cfg.mech.radius && resolveParams({}).rehearseN >= 300, `rehearsal ${r ? fx(r.ms, 0) + ' ms, ' + r.bodies + ' body warm-ups' : 'missing'}`)
  }
  // presets: one string changes exactly the preset's numbers
  {
    const base = resolveParams({}), mid = resolveParams({ select: { laserRange: 'mid' } })
    const diff = Object.keys(base).filter((k) => k !== 'selected' && JSON.stringify(base[k]) !== JSON.stringify(mid[k]))
    check('presets: selecting laserRange "mid" changes only the laser band numbers', diff.length > 0 && diff.every((k) => k.startsWith('laser') || k === 'rPrefLaser'), `changed: ${diff.join(', ')}`)
  }
}

