// panel R4 gameplay review: where the bot spends time and hp in the (uncalibrated) simulator. Read-only on bot/ and sim/.
// bun legshare.js <from> <to>   env OVR = overrides JSON (e.g. {"select":{"fightEarly":"off"}}), TAG = label
// Per decision: mode/legKind time, hp lost while in it, damage dealt; per match: laser time, idle share, damage into
// mechs that were not killed, time from each kill to the next damage dealt on a mech, burst-gate statistics.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const TAG = process.env.TAG || 'V1'
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const agg = { leg: {}, mode: {}, matches: [] }
const add = (o, k, dt, dhp, dout) => { const r = o[k] || (o[k] = { t: 0, hpLost: 0, dmgOut: 0 }); r.t += dt; r.hpLost += dhp; r.dmgOut += dout }
for (let seed = from; seed <= to; seed++) {
  let brain = null, lastT = 0, lastHp = -1, laserT = -1, lastKillT = -1, gaps = [], dmgTo = new Map(), killed = new Set(), firstDmg = -1
  let noTgtT = 0, holdT = 0, gunOnlyFightT = 0, fightT = 0, sw = 0, lastTgt = null, burstOkT = 0, burstChk = 0, lowHpFresh = 0
  const legs = {}, modes = {}
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, me = B.me, t = obs.t
      const dt = lastHp < 0 ? 0 : t - lastT
      const hp = obs.self ? obs.self.hp : me.hp
      const dhp = lastHp < 0 ? 0 : Math.max(0, lastHp - hp)
      let dout = 0
      if (Array.isArray(obs.events)) for (const e of obs.events) {
        if (!e) continue
        if (e.type === 'hit' && Number.isInteger(e.target) && e.target < 100 && typeof e.amount === 'number') {
          dout += e.amount; dmgTo.set(e.target, (dmgTo.get(e.target) || 0) + e.amount)
          if (firstDmg < 0) firstDmg = t
          if (lastKillT >= 0) { gaps.push(+(t - lastKillT).toFixed(1)); lastKillT = -1 }
        }
        if (e.type === 'kill' && Number.isInteger(e.target) && e.target < 100) { killed.add(e.target); lastKillT = t }
      }
      const lk = (B.mode || '-') + '/' + (B.legKind || '-')
      add(legs, lk, dt, dhp, dout); add(modes, B.mode || '-', dt, dhp, dout)
      if (!B.target) noTgtT += dt
      if (B.mode === 'HOLD') holdT += dt
      if (B.mode === 'FIGHT') { fightT += dt; if (!me.laser) gunOnlyFightT += dt }
      if (B.target !== lastTgt) { if (B.target && lastTgt) sw++; lastTgt = B.target }
      // the hunt50 gate as specified in notes/panel_r4_gameplay.md, evaluated on the current target (statistics only)
      const tr = B.target
      if (tr && !tr.npc && B.mode === 'FIGHT') {
        burstChk++
        const g = me.gun, lz = me.laser, rm = tr.rearOn ? me.rearMult : 1
        let d = 0
        if (g && tr.dist <= g.range * 0.97) { const shots = g.reload > 0 ? Math.max(0, Math.floor((3 - g.reload) / Math.max(0.24, g.cd))) : Math.min(g.ammo, Math.floor(3 / Math.max(0.24, g.cd)) + 1); d += Math.min(shots, g.mag) * g.damage * me.dmgMult * B.gunStat.q(tr.dist) * rm }
        if (lz && tr.dist <= lz.range * 0.93 && lz.cooldown + Math.max(0, lz.full - lz.charge) <= 1.5) d += lz.damage * me.dmgMult * rm
        if (me.lightning && tr.dist <= 45) d += Math.min(12, Math.max(0, Math.floor((me.energy - 15) / 3))) * 60 * me.dmgMult * rm
        if (d >= 0.5 * tr.hp) burstOkT += dt
        if (me.hpf < 0.55 && tr.hp > 0.9 * tr.maxHp) lowHpFresh += dt
      }
      if (laserT < 0 && me.laser) laserT = t
      lastT = t; lastHp = hp
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  let wasted = 0
  for (const [id, v] of dmgTo) if (!killed.has(id)) wasted += v
  const alive = r.timeAlive
  for (const k of Object.keys(legs)) { add(agg.leg, k, legs[k].t, legs[k].hpLost, legs[k].dmgOut) }
  for (const k of Object.keys(modes)) { add(agg.mode, k, modes[k].t, modes[k].hpLost, modes[k].dmgOut) }
  const row = { seed, score: r.score, kills: r.kills, alive: +alive.toFixed(1), cause: r.cause, firstDmg: +firstDmg.toFixed(1), laserT: +laserT.toFixed(1), wastedDmg: Math.round(wasted),
    killToNextDmg: gaps, noTargetShare: +(noTgtT / alive).toFixed(2), holdShare: +(holdT / alive).toFixed(2), fightShare: +(fightT / alive).toFixed(2), gunOnlyFightShare: +(gunOnlyFightT / Math.max(1e-9, fightT)).toFixed(2),
    targetSwitches: sw, burstGateShare: +(burstOkT / Math.max(1e-9, fightT)).toFixed(2), lowHpVsFreshS: +lowHpFresh.toFixed(1) }
  agg.matches.push(row)
  console.log(JSON.stringify(row))
}
const tot = agg.matches.reduce((a, r) => a + r.alive, 0)
const tab = (o) => Object.entries(o).sort((a, b) => b[1].t - a[1].t).map(([k, v]) => `${k.padEnd(26)} ${(100 * v.t / tot).toFixed(1).padStart(5)}% time  hpLost ${Math.round(v.hpLost).toString().padStart(6)}  (${(v.hpLost / Math.max(1e-9, v.t)).toFixed(0).padStart(4)}/s)  dmgOut ${Math.round(v.dmgOut).toString().padStart(6)} (${(v.dmgOut / Math.max(1e-9, v.t)).toFixed(0)}/s)`).join('\n')
console.log(`== ${TAG}: ${agg.matches.length} matches, score ${(agg.matches.reduce((a, r) => a + r.score, 0) / agg.matches.length).toFixed(2)}, alive ${(tot / agg.matches.length).toFixed(1)} s, kills/min ${(60 * agg.matches.reduce((a, r) => a + r.kills, 0) / tot).toFixed(2)}`)
console.log('-- by mode\n' + tab(agg.mode))
console.log('-- by mode/leg\n' + tab(agg.leg))
