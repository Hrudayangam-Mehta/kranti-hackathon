// ============================================================================ pass 2b (plain defaults; createBrain0)
if (want('pass2b')) {
  const DEF = (over) => createBrain0(hello, ctxNone, over || {})
  // 1. farm-first opening (preset openFarm): a gun mech shooting us from 140 m is not answered in the gate (we break the
  //    line), one at 80 m is; after 75 s or with 10 cubes the 140 m one is fought; openFarm off fights it at once
  {
    const run = (D, t0, over, cubes) => {
      const ar = new Arena({ cfg, seed: 251, me: { x: 0, y: 0, yaw: 0, cubes: cubes || 0 }, enemies: [{ id: 10, x: D, y: 0, hp: 1400, dps: 20, script: (e, t, A) => { e.vx = 0; e.vy = 0; e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) } }] })
      ar.t = t0
      if (cubes) ar.me.cubes = cubes
      const br = DEF(over)
      let tgt = 0, dis = 0, gate = 0
      drive(ar, br, 8, (a, o, act, b) => { const B = b._B; if (B.target && B.target.id === 10) tgt++; if (B.mode === 'DISENGAGE') dis++; if (B.ofGate) gate++ })
      return { shots: ar.stats.shots, tgt, dis, gate }
    }
    const far = run(140, 10), near = run(80, 10), late = run(140, 80), off = run(140, 10, { select: { openFarm: 'off' } }), cubed = run(140, 10, {}, 10)
    const ok = far.shots === 0 && far.tgt === 0 && far.dis > 40 && far.gate > 70 && near.shots > 5 && near.tgt > 40 && late.shots > 5 && late.gate === 0 && off.shots > 5 && cubed.shots > 5 && cubed.gate === 0
    check('pass2b openFarm: in the gate (< 10 cubes, < 75 s) a mech shooting from 140 m is not answered (break the line), one hitting us from 80 m is; fought after 75 s, with 10 cubes, or with openFarm off', ok,
      `140 m at t 10: shots ${far.shots}, as target ${far.tgt}, DISENGAGE ${far.dis}/80, gate ${far.gate} | 80 m: shots ${near.shots}, target ${near.tgt} | 140 m at t 80: shots ${late.shots}, gate ${late.gate} | openFarm off: shots ${off.shots} | 10 cubes: shots ${cubed.shots}, gate ${cubed.gate}`)
  }
  // 2. openFarm keeps farming once the line is broken: a crate 25 m away, the 140 m shooter goes quiet (out of range of
  //    sight at 400 m) at t 13; the crate is shot within openFarmQuietS + 1 s of the last line (pass 2a waits 3 s)
  {
    const run = (over) => {
      const crate = { id: 1031, pos: [-25, 0, 0], hp: 300 }
      const ar = new Arena({ cfg, seed: 252, me: { x: 0, y: 0, yaw: Math.PI }, crates: [crate], enemies: [{ id: 10, x: 140, y: 0, hp: 1400, dps: 20, script: (e, t, A) => { if (t >= 13) { e.x = 900; e.dps = 0 } e.vx = 0; e.vy = 0; e.yaw = Math.atan2(A.me.y - e.y, A.me.x - e.x) } }] })
      ar.t = 10
      const br = DEF(over)
      let first = -1
      drive(ar, br, 10, (a, o, act, b) => { if (first < 0 && a.t > 13 && act.fire && act.fire[0] && !b._B.target) first = a.t - 13 })
      return { first, cubes: ar.me.cubes }
    }
    const on = run(), off = run({ select: { openFarm: 'off' } })
    check('pass2b openFarm: farming resumes about 1 s after the shooter has no line (pass 2a: the 3 s quiet rule)', on.first >= 0 && on.first <= 2.6 && (off.first < 0 || off.first > on.first),
      `first crate shot ${fx(on.first, 1)} s after the line went (openFarm off ${fx(off.first, 1)} s), cubes ${on.cubes}`)
  }
  // 3. R1 crate gate posture: SQUAD keeps the D6 farming rules, FFA gates on a mech within crateMechR; crateGate=all gates SQUAD too
  {
    const gateAt = (env, over) => {
      const br = DEF(over), B = br._B
      B.env = env; B.me.t = 50; B.me.hp = B.me.maxHp
      B.trackList = [{ npc: false, conf: 1, dist: 80, hp: 1400 }]
      return B.steal.farmOk('crate') && B.steal.crateFireOk()
    }
    const sq = gateAt('SQUAD'), ff = gateAt('FFA'), sqAll = gateAt('SQUAD', { select: { crateGate: 'all' } }), ffOff = gateAt('FFA', { select: { crateGate: 'off' } })
    check('pass2b R1 crate gate: a mech 80 m away blocks crate farming in FFA only (SQUAD D6 unchanged); crateGate=all / off presets', sq && !ff && !sqAll && ffOff, `SQUAD ${sq} | FFA ${ff} | SQUAD crateGate=all ${sqAll} | FFA crateGate=off ${ffOff}`)
  }
  // 4. defaults and wiring: R3 laser ladder on, gun ladder off, calibration off; counter params C1 / C2 / C3
  {
    const B = DEF()._B, P0 = B.P, cp = B.cx ? B.cx.params : {}
    const ok = P0.headAimOn === true && P0.headAimGun === false && P0.aimCalOn === false && P0.stealOn === true && P0.crateGateOn === true && P0.crateGateSquad === false && P0.scanOn === true &&
      P0.openFarm === true && cp.finOn === true && cp.lkR0 === 70 && cp.lkR1 === 100 && cp.lbOn === false && P0.crateMechR === 120 && P0.crateQuietS === 2
    const Boff = DEF({ select: { pass2b: 'off' } })._B, po = Boff.P, co = Boff.cx ? Boff.cx.params : {}
    const okOff = !po.stealOn && !po.crateGateOn && !po.scanOn && !po.headAimOn && !po.aimCalOn && !po.openFarm && co.finOn === false && co.lkR0 === 80 && co.lkR1 === 110 && co.lbOn === false && !po.ffaThirdFix && !po.ffaBreakFix
    check('pass2b defaults: R1 on (crate gate FFA-only, 120 m / 2 s), R2 on, R3 laser ladder on / gun ladder off / calibration off, openFarm on, C1 on, C2 70/100, C3 off; preset pass2b=off turns every one off', ok && okOff,
      `defaults ${ok} | pass2b=off ${okOff} | cx finOn ${cp.finOn} lkR ${cp.lkR0}/${cp.lkR1} lbOn ${cp.lbOn}`)
  }
}
