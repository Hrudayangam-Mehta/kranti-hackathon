// ============================================================================ fix round after verify1 (F1-F4)
if (want('fix2')) {
  // F1 (D4): a bullet led exactly on our velocity (house-bot aim, D1) from 100 / 130 m: the dodge turns hits into misses
  {
    const HITR = cfg.mech.radius + cfg.projectile.gun_radius
    const still = (e, t, a) => { e.x = 80; e.y = 0; e.vx = 0; e.vy = 0; face(e, a) }
    const pair = (K, fromD) => {
      const mk = () => { const ar = new Arena({ cfg, seed: 41, me: { x: 0, y: 0, yaw: 0 }, enemies: [{ id: 10, x: 80, y: 0, hp: BIGHP, dps: 6, script: still }] }); ar.t = 60; return ar }
      const A = mk(), Bq = mk(), bA = createBrain(hello, ctxNone, { warmup: false }), bB = createBrain(hello, ctxNone, { warmup: false })
      let bullet = null, minA = 1e9, minB = 1e9
      for (let k = 0; k < K + 14; k++) {
        const oA = A.obs(), oB = Bq.obs()
        if (k === K) {
          const me = Bq.me, v = cfg.weapons.gun.speed, ex = me.x + fromD, ey = me.y
          let tf = fromD / v
          for (let i = 0; i < 6; i++) tf = Math.hypot(me.x + me.vx * tf - ex, me.y + me.vy * tf - ey) / v
          const tx = me.x + me.vx * tf, ty = me.y + me.vy * tf, d = Math.hypot(tx - ex, ty - ey)
          bullet = { pos: [ex, ey, me.z + 4.5], vel: [(tx - ex) / d * v, (ty - ey) / d * v, 0], t0: Bq.t, life: tf + 0.2 }
        }
        if (bullet && Bq.t - bullet.t0 < bullet.life) { const dt = Bq.t - bullet.t0; oB.projectiles = [{ id: 777, kind: 'gun', pos: [bullet.pos[0] + bullet.vel[0] * dt, bullet.pos[1] + bullet.vel[1] * dt, bullet.pos[2]], vel: bullet.vel }] }
        const aA = bA.act(oA, performance.now() + 27), aB = bB.act(oB, performance.now() + 27)
        for (const [ar, act, w] of [[A, aA, 0], [Bq, aB, 1]]) {
          if (act.aim) { ar.me.cmdYaw = act.aim[0]; ar.me.cmdPitch = act.aim[1] }
          for (let s = 0; s < 2; s++) {
            ar._tick(act, s)
            if (!bullet) continue
            const dt = ar.t - bullet.t0
            if (dt < 0 || dt > bullet.life) continue
            for (let q = 0; q <= 10; q++) { const tt = dt - 0.05 + q * 0.005; if (tt < 0) continue; const dd = Math.hypot(bullet.pos[0] + bullet.vel[0] * tt - ar.me.x, bullet.pos[1] + bullet.vel[1] * tt - ar.me.y); if (w) minB = Math.min(minB, dd); else minA = Math.min(minA, dd) }
          }
        }
      }
      return [minA < HITR, minB < HITR]
    }
    let hA = 0, hB = 0, n = 0
    for (const R of [100, 130]) for (let K = 30; K < 42; K++) { const [a, b] = pair(K, R); n++; if (a) hA++; if (b) hB++ }
    check('fix2 F1 (D4) bullet dodge vs a bullet led on our motion (100 / 130 m): hits become misses', hA >= 6 && hB <= Math.floor(hA / 4), `hits without seeing the bullet ${hA}/${n}, with the dodge ${hB}/${n}`)
  }
  // F2 (D5): a target under 25% is never left for a fresh attacker behind us; a full-hp target still is
  {
    const H = cfg.mech.hp
    const mk = (id, x, y, hp) => ({ id, kind: 'mech', pos: [x, y, 0], vel: [0, 0, 0], aim: [Math.atan2(-y, -x), 0], hp, max_hp: H, cubes: 0, weapons: ['gun'], charging: false })
    const base = streamObs[0]
    const run = (hp10, firstAlone) => {
      const b = createBrain(hello, ctxNone, { warmup: false })
      const tl = []
      for (let k = 0; k < 40; k++) {
        const mechs = [mk(10, 80, 0, hp10)], events = []
        if (k % 10 === 0) events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 10 })
        if (!firstAlone || k >= 10) { mechs.push(mk(11, -80, 0, H)); if (k % 3 === 0) events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: Math.PI, by: 11 }) }
        const o = JSON.parse(JSON.stringify(base))
        Object.assign(o, { tick: k * 2, t: 100 + k * 0.1, mechs, events, projectiles: [], crates: [], cubes: [], pickups: [], beams: [], drops: [], offer: null, alive: 16 })
        o.self.pos = [0, 0, 0]; o.self.vel = [0, 0, 0]; o.self.hp = 0.8 * o.self.max_hp; o.self.grounded = true; o.self.in_zone = true
        o.zone = { center: [0, 0], radius: 2000, next_center: [0, 0], next_radius: 1500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
        b.act(o, performance.now() + 27)
        tl.push(b.debugState().target)
      }
      return tl
    }
    const s = (tl) => tl.map((x) => (x === 10 ? 'a' : x === 11 ? 'B' : '-')).join('')
    const r1 = run(0.15 * H, true), r2 = run(0.15 * H, false), r3 = run(H, false)
    const ok = r1.slice(10).every((x) => x === 10) && r2.every((x) => x === 10) && r3.slice(-10).every((x) => x === 11)
    check('fix2 F2 (D5) a target under 25% hp is never left for a fresh attacker behind us (veto kept for full-hp targets)', ok, `15% first: ${s(r1)} | 15% both: ${s(r2)} | full hp: ${s(r3)}`)
  }
  // F3 (D6): the cubes of our kills at the D2 ranges are collected; not by walking into the next hunters
  {
    const runK = (weapons, D, others) => {
      const enemies = [{ id: 10, x: D, y: 0, hp: 250, dps: 15, script: (e, t, a) => { e.x = D; e.y = 0; face(e, a) } }]
      for (const [id, x, y] of others) enemies.push({ id, x, y, hp: BIGHP, dps: 4, script: (e, t, a) => { e.x = x; e.y = y; face(e, a) } })
      const ar = new Arena({ cfg, seed: 61, me: { x: 0, y: 0, yaw: 0, weapons }, enemies })
      ar.t = 60
      const b = createBrain(hello, ctxNone, { warmup: false, ...(weapons[1] === 'laser' ? {} : { rPrefGun: D, bandLo: D - 10, bandHi: D + 10 }) })
      let killedAt = -1, got = -1, far = 0
      for (let k = 0; k < 350; k++) {
        const a = b.act(ar.obs(), performance.now() + 27); ar.step(a)
        if (killedAt < 0 && !ar.enemies[0].alive) { killedAt = ar.t; ar.cubes.push({ id: 6001, pos: [D + 1.5, 0, 0] }, { id: 6002, pos: [D - 1, 1.5, 0] }) }
        if (killedAt > 0 && got < 0 && ar.me.cubes >= 2) got = ar.t - killedAt
        if (killedAt > 0) { const g = b._B.grab; if (g && g.type === 'cube' && Math.hypot(g.x - ar.me.x, g.y - ar.me.y) > 70) far++ }
        if (ar.me.hp < 700) ar.me.hp = 1400
        if (killedAt > 0 && ar.t - killedAt > 22) break
      }
      return { killedAt, got, far }
    }
    const g = runK(['gun', null], 90, []), l = runK(['gun', 'laser'], 150, [[11, -60, 90]]), crowd = runK(['gun', 'laser'], 150, [[11, 160, 20], [12, 165, -25]])
    check('fix2 F3 (D6) kill cubes collected after a gun kill at 90 m and a laser kill at 150 m; no 70+ m grab into two hunters at the kill spot',
      g.killedAt > 0 && g.got >= 0 && g.got < 15 && l.killedAt > 0 && l.got >= 0 && l.got < 20 && crowd.killedAt > 0 && crowd.far === 0,
      `gun 90 m: ${g.got >= 0 ? fx(g.got, 1) + ' s' : 'not collected'} | laser 150 m + far hunter: ${l.got >= 0 ? fx(l.got, 1) + ' s' : 'not collected'} | two hunters at the kill spot: ${crowd.far} long grab decisions`)
  }
  // F4 (D9): the last phases (70 -> 25 -> 0 m) on the real map: inside, no ZONE <-> fight flapping
  {
    const { brainBot, runScenario, scripted, OPEN } = await import('./review_tactics/scen.js')
    const C0 = { x: OPEN.x, y: OPEN.y, r: 70 }, C1 = { x: OPEN.x + 30, y: OPEN.y + 5, r: 25 }, C2 = { x: OPEN.x + 38, y: OPEN.y + 10, r: 0 }
    const zone = { start_center: [C0.x, C0.y], start_radius: 70, phases: [{ hold_s: 10, shrink_s: 25, radius: 25, dps: 160 }, { hold_s: 15, shrink_s: 25, radius: 0, dps: 260 }] }
    const late = (withEnemy) => {
      let M = null
      const ours = brainBot({}, () => { if (M) { if (M.mechs[1].alive) M.mechs[1].hp = 1400; M.mechs[0].hp = Math.max(M.mechs[0].hp, 1400); M.mechs[2].hp = 1e9 } })
      const enemy = scripted('enemy', (obs) => { const c = obs.zone.next_center, p = obs.self.pos, dx = c[0] - p[0], dy = c[1] - p[1], d = Math.hypot(dx, dy); return { move: d > 2 ? [dx / d, dy / d] : [0, 0] } })
      const idle = scripted('idle', () => ({ move: [0, 0] }))
      const place = [{ x: C0.x - 35, y: C0.y - 30 }, withEnemy ? { x: C1.x, y: C1.y + 10 } : { x: OPEN.x + 700, y: OPEN.y + 420 }, { x: OPEN.x + 760, y: OPEN.y + 420 }]
      runScenario({ bots: [ours, withEnemy ? enemy : idle, idle], seed: 5, maxT: 76, zone, zoneFixed: [C0, C1, C2], place, setup(m) { M = m; if (!withEnemy) m.mechs[1].hp = 1e9 } })
      let dmg = 0, sw = 0, prev = ''
      for (const r of ours.rows) {
        if (prev && prev !== r.mode && (prev === 'ZONE' || r.mode === 'ZONE')) sw++
        prev = r.mode
        if (r.t < 74.5) for (const e of r.evs) if (e.type === 'damaged' && e.weapon === 'zone') dmg += e.amount
      }
      return { dmg, sw }
    }
    const A = late(false), Bz = late(true)
    check('fix2 F4 (D9) late zone: alone <= 30 hp and <= 6 mode switches; enemy on the centre <= 400 hp and <= 16 switches', A.dmg <= 30 && A.sw <= 6 && Bz.dmg <= 400 && Bz.sw <= 16,
      `alone: ${fx(A.dmg, 0)} hp zone damage, ${A.sw} ZONE<->other switches | enemy on the centre: ${fx(Bz.dmg, 0)} hp, ${Bz.sw} switches`)
  }
}

