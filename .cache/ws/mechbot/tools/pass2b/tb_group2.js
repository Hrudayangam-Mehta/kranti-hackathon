  // 5. check2a FAIL fixes on the real map (scenarios ported from tools/check2a/ffa_scen.js; FFA forced, t 100, 12 alive)
  {
    const face2 = (e, A) => { e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) }
    const bigZ = (x, y) => ({ center: [x, y], radius: 3000, next_center: [x, y], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 })
    const spot2 = (seed, dLo, dHi) => {
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
    const drive2 = (ar, br, secs, hook) => { for (let k = 0; k < Math.round(secs * 10); k++) { const o = ar.obs(); o.alive = 12; const a = br.act(o, performance.now() + 27.5); allTimes.push(0); if (hook) hook(ar, o, a, br); ar.step(a) } }
    const FON = { env: 'ffa', warmup: false }, F3OFF = { env: 'ffa', warmup: false, select: { ffaThirdFix: 'off' } }, F4OFF = { env: 'ffa', warmup: false, select: { ffaBreakFix: 'off' } }
    // rule 3: a 45% mech busy with another (torso ~90 deg off us, 140-160 m, cover within 6 m) is shot after >= 1.5 s busy
    const r3 = []
    let n3 = 0, ok3 = true
    for (let sd = 701; sd < 2000 && n3 < 2; sd++) {
      const sp = spot2(sd, 140, 160)
      if (!sp) continue
      const L = Math.hypot(sp.ex - sp.x, sp.ey - sp.y), ux = (sp.ex - sp.x) / L, uy = (sp.ey - sp.y) / L
      let bx = NaN, by = NaN
      for (const sg of [1, -1]) {
        const qx = sp.ex - sg * uy * 70, qy = sp.ey + sg * ux * 70
        if (nav.passableAt(qx, qy) && world.canSee(sp.x, sp.y, nav.levelAt(sp.x, sp.y) + 8, qx, qy, nav.levelAt(qx, qy) + 6) && Math.hypot(qx - sp.x, qy - sp.y) < 190) { bx = qx; by = qy; break }
      }
      if (!(bx === bx)) continue
      const run3 = (over, hpA, withB) => {
        const en = [{ id: 23, x: sp.ex, y: sp.ey, hp: hpA, maxHp: 1400, script: (e) => { e.yaw = Math.atan2(by - e.y, bx - e.x); e.vx = 0; e.vy = 0 } }]
        if (withB) en.push({ id: 24, x: bx, y: by, hp: 1400, script: (e) => { e.yaw = Math.atan2(sp.ey - e.y, sp.ex - e.x); e.vx = 0; e.vy = 0 } })
        const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(uy, ux), pinned: true }, enemies: en, zone: bigZ(sp.x, sp.y) })
        ar.t = 100
        const br = createBrain0(hello, ctxMap, over)
        let first = -1, hideNear = 0, tgtAt = -1
        drive2(ar, br, 8, (a, o, act, b) => { const B = b._B; if (B.hide.state === 'found' && B.hide.dist <= 6) hideNear++; if (B.target && B.target.id === 23 && tgtAt < 0) tgtAt = a.t - 100; if (first < 0 && act.fire[0] && B.target && B.target.id === 23) first = a.t - 100 })
        return { tgtAt: +tgtAt.toFixed(1), first: +first.toFixed(1), hideNear }
      }
      const busy = run3(FON, 630, true)
      if (busy.hideNear < 40) continue
      n3++
      const alone = run3(FON, 630, false), busy60 = run3(FON, 840, true), busyOff = run3(F3OFF, 630, true)
      ok3 = ok3 && busy.first >= 1.5 && busy.tgtAt >= 1.5 && alone.tgtAt < 0 && busy60.tgtAt < 0 && busyOff.first < 0
      r3.push(`spot ${sd}: busy 45% target ${busy.tgtAt} s, shot ${busy.first} s | alone 45% target ${alone.tgtAt} | busy 60% target ${busy60.tgtAt} | ffaThirdFix off: shot ${busyOff.first}`)
    }
    check('pass2b rule 3 (check2a FAIL fixed): a 45% mech busy with another is shot after >= 1.5 s (not held by the DEFENSIVE silence); alone or at 60% it is not a target; ffaThirdFix off holds it (2 spots)', n3 === 2 && ok3, r3.join(' || '))
    // rule 4: a healthy gun mech shoots us from 110-150 m: inside the break >= 20 m from the last-seen point and > 9 s unseen
    const shooter = (dps) => (e, t, A) => { face2(e, A); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? dps : 0 }
    const r4 = []
    let n4 = 0, ok4 = 0, okOff = 0
    for (let sd = 401; sd < 460 && n4 < 3; sd++) {
      const sp = spot2(sd, 110, 150)
      if (!sp) continue
      const run4 = (over) => {
        const ar = new Arena({ cfg, world, nav, seed: sd, me: { x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, enemies: [{ id: 19, x: sp.ex, y: sp.ey, hp: 1400, script: shooter(25) }], zone: bigZ(sp.x, sp.y) })
        ar.t = 100
        const br = createBrain0(hello, ctxMap, over)
        let brk = 0, sx = sp.x, sy = sp.y, unseen = 0, maxU = 0, maxRel = 0, fired = 0
        drive2(ar, br, 30, (a, o, act, b) => {
          const B = b._B, vis = a.t - B.lastLosInT <= 0.2
          if (vis) { sx = a.me.x; sy = a.me.y; unseen = 0 } else unseen += 0.1
          if (B.ffaBreak) { brk++; if (act.fire[0]) fired++; if (!vis) { maxRel = Math.max(maxRel, Math.hypot(a.me.x - sx, a.me.y - sy)); maxU = Math.max(maxU, unseen) } }
        })
        return { brk, maxRel: +maxRel.toFixed(1), maxU: +maxU.toFixed(1), fired, dmg: Math.round(ar.stats.dmgTaken) }
      }
      const on = run4(FON)
      if (on.brk === 0) continue
      n4++
      const off = run4(F4OFF)
      if (on.maxRel >= 20 && on.maxU >= 9) ok4++
      if (off.maxRel >= 20 && off.maxU >= 9) okOff++
      r4.push(`spot ${sd}: on ${JSON.stringify(on)} | ffaBreakFix off ${JSON.stringify(off)}`)
    }
    check('pass2b rule 4 (check2a FAIL fixed): inside the sight break >= 20 m from the last-seen point and >= 9 s out of sight (3 spots; ffaBreakFix off: fewer)', n4 === 3 && ok4 === 3 && okOff < 3, `${ok4}/${n4} spots (fix off ${okOff}/${n4}) || ` + r4.join(' || '))
  }
