// ============================================================================ group rc: release-candidate fixes (check2b FAIL 2 and 3)
if (want('rc')) {
  const { ArenaReq } = await import('./arena_req.js')
  const DEF = (over) => createBrain0(hello, ctxNone, over || {})
  const driveA = (ar, br, secs, hook, pre) => { for (let k = 0; k < Math.round(secs * 10); k++) { const o = ar.obs(); if (pre) pre(ar, o); const t0 = performance.now(); const a = br.act(o, t0 + 27.5); allTimes.push(performance.now() - t0); if (hook) hook(ar, o, a, br); ar.step(a) } }
  const walkTo = (e, x, y, v, dt) => { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 0.4) { e.vx = dx / d * v; e.vy = dy / d * v; e.x += e.vx * dt; e.y += e.vy * dt; e.yaw = Math.atan2(dy, dx) } else { e.vx = 0; e.vy = 0 } }
  const FFAZ = (x, y) => ({ center: [x - 1800, y], radius: 5000, next_center: [x - 1800, y], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
  // 1. farm-first gate: a mech that turns to us at 85-95 m and hits 1-2 s later (after our line-break walk took us past
  //    100 m) is answered; a 125 m shooter still is not; preset openFarm=d0 answers an aim-only mech at 60 m at once
  {
    const run = (over, D, mode, dps) => {
      const ex = D * Math.cos(0.25), ey = D * Math.sin(0.25)
      const ar = new ArenaReq({ cfg, seed: 401, me: { x: 0, y: 0, yaw: 0.25 }, enemies: [{ id: 71, x: ex, y: ey, hp: 1400, weapons: ['gun'], dps: mode === 'shoot' ? dps : 0,
        script: (e, t, a) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } }] })
      ar.t = 50
      const br = DEF(over)
      let shots = 0, dis = 0, first = -1
      driveA(ar, br, 6, (a, o, act, b) => { if (act.fire && act.fire[0]) { shots++; if (first < 0) first = +(a.t - 50).toFixed(1) } if (b._B.mode === 'DISENGAGE') dis++ })
      return { shots, dis, first, hpLost: Math.round(ar.stats.dmgTaken) }
    }
    const s85 = run({}, 85, 'shoot', 20), s95 = run({}, 95, 'shoot', 40), s125 = run({}, 125, 'shoot', 20)
    const aim60 = run({}, 60, 'aim'), aim60d0 = run({ select: { openFarm: 'd0' } }, 60, 'aim'), s125d0 = run({ select: { openFarm: 'd0' } }, 125, 'shoot', 20)
    const ok = s85.shots > 0 && s85.first <= 4 && s95.shots > 0 && s95.first <= 4 && s125.shots === 0 && s125.dis > 20 && aim60.shots === 0 && aim60d0.shots > 0 && aim60d0.first <= 1 && s125d0.shots > 0
    check('rc openFarm: a mech turning to us at 85 / 95 m and hitting 1-2 s later is answered (check2b FAIL 3); 125 m still not; preset d0 answers any D0-hostile (aim-only 60 m, 125 m shooter) at once', ok,
      `85 m ${JSON.stringify(s85)} | 95 m 40 dps ${JSON.stringify(s95)} | 125 m ${JSON.stringify(s125)} | aim 60 m default ${JSON.stringify(aim60)} d0 ${JSON.stringify(aim60d0)} | 125 m d0 ${JSON.stringify(s125d0)}`)
  }
  // 2. R1b kill drops: we are first (victim 30-40 m, survivor 65 m to the side) and the survivor walks to its drops,
  //    turning its torso to us on the way: cubes and laser still ours (check2b FAIL 2); a survivor 22 m from them: we stay away
  {
    const run = (over, vx, vy, survD, stand, side) => {
      const ang = Math.atan2(vy, vx), sx = vx + survD * Math.cos(ang + side), sy = vy + survD * Math.sin(ang + side)
      const A = { id: 41, x: vx, y: vy, hp: 900, weapons: ['gun', 'laser'], script: (e, t, a) => { e.yaw = Math.atan2(sy - e.y, sx - e.x); e.vx = 0; e.vy = 0; if (t >= 122.5 && e.alive) a.kill(e) } }
      const Bm = { id: 42, x: sx, y: sy, hp: 1000, weapons: ['gun'], script: (e, t, a, dt) => { if (t < 122.5 || stand) { e.yaw = Math.atan2(vy - e.y, vx - e.x); e.vx = 0; e.vy = 0; return } walkTo(e, vx, vy, 8, dt) } }
      const ar = new ArenaReq({ cfg, seed: 7, me: { x: 0, y: 0, yaw: Math.atan2(vy, vx) }, enemies: [A, Bm], zone: FFAZ(0, 0) })
      ar.enemies[0].cubes = 3; ar.enemies[1].takes = true
      ar.t = 120
      const br = DEF({ env: 'ffa', ...over })
      let minD = 1e9
      driveA(ar, br, 10, (a) => { if (a.t > 122.5) minD = Math.min(minD, Math.hypot(a.me.x - vx, a.me.y - vy)) }, (a, o) => { o.alive = 9 + o.alive })
      return { cubes: ar.me.cubes, laser: !!(ar.me.weapons[1] && ar.me.weapons[1].kind === 'laser'), minD: +minD.toFixed(1) }
    }
    const geo = []
    let okN = 0
    for (let i = 0; i < 8; i += 2) {
      const b = -Math.PI + i * Math.PI / 4 + 0.3, r = 30 + (i % 3) * 5, w = run({}, r * Math.cos(b), r * Math.sin(b), 65, false, i % 4 ? 1.5 : -1.5)
      if (w.cubes >= 3 && w.laser) okN++
      geo.push(`${i}: c${w.cubes}${w.laser ? '+L' : ''}`)
    }
    const walk70 = run({}, -22, 28, 70, false, 1.5), second = run({}, 30, -18, 22, false, 1.5)
    const ok = okN === 4 && walk70.cubes >= 3 && walk70.laser && second.minD > 20 && second.cubes === 0
    check('rc R1b: survivor walking to its drops (torso turning to us) after we started first -> >= 3 cubes + laser ours (4 geometries + the check2b trace one); survivor 22 m from them -> we stay away', ok,
      `walking ${okN}/4 (${geo.join(' | ')}) | trace geometry ${JSON.stringify(walk70)} | survivor 22 m ${JSON.stringify(second)}`)
  }
}

