// R3a2: simulator sanity (information only). bun sanity.js <squad|ffa> <from> <to>; LIB = brain lib dir, OVR = overrides JSON
// Per match: score, kills, alive s, kills per minute alive, first damage on a mech (s), errors, stuck, zone death, latch,
// slowest decision, boost share of FIGHT decisions, HEAL decisions.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [mode, from, to] = [process.argv[2] || 'squad', +(process.argv[3] || 1), +(process.argv[4] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const LIB = process.env.LIB || P + '/bot/lib'
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(LIB + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const rows = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, maxMs = 0, n = 0, firstDmg = -1, fight = 0, fightBoost = 0, heal = 0, laserT = -1
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms
      const B = brain._B
      if (firstDmg < 0 && Array.isArray(obs.events)) for (const e of obs.events) if (e && e.type === 'hit' && Number.isInteger(e.target) && e.target < 100) { firstDmg = obs.t; break }
      if (B.mode === 'FIGHT') { fight++; if (a.boost) fightBoost++ }
      if (B.mode === 'HEAL') heal++
      if (laserT < 0 && B.me.laser) laserT = obs.t
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  const s = brain.debugState(), c = s.counters
  rows.push({ seed, mode, score: r.score, kills: r.kills, cause: r.cause, alive: +r.timeAlive.toFixed(1), kpm: +(r.kills / Math.max(1, r.timeAlive) * 60).toFixed(2), firstDmg: +firstDmg.toFixed(1), laserT: +laserT.toFixed(1),
    stuck: c.stuck, noProgress: c.noProgress, fuse: c.fuse, errors: c.errors, latchT: s.ffaLatchT, env: s.env, maxMs: +maxMs.toFixed(1), n,
    fightShare: +(fight / Math.max(1, n)).toFixed(2), boostInFight: +(fightBoost / Math.max(1, fight)).toFixed(2), heal, spend: c.boostSpend || 0 })
  console.log(JSON.stringify(rows[rows.length - 1]))
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
const fd = rows.filter((r) => r.firstDmg >= 0).map((r) => r.firstDmg).sort((a, b) => a - b)
console.log('SUMMARY', JSON.stringify({ lib: LIB.includes('bot_502') ? '5.02' : 'R3a2', mode, matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(2), kills: sum('kills'), alive: +sum('alive').toFixed(1),
  kpm: +(sum('kills') / Math.max(1, sum('alive')) * 60).toFixed(2), firstDmgMedian: fd.length ? fd[Math.floor((fd.length - 1) / 2)] : -1, firstDmg: rows.map((r) => r.firstDmg),
  stuck: sum('stuck'), fuse: sum('fuse'), errors: sum('errors'), zoneDeaths: rows.filter((r) => r.cause === 'zone').length, latched: rows.filter((r) => r.env === 'FFA').length,
  maxMs: Math.max(...rows.map((r) => r.maxMs)), heal: sum('heal'), boostInFight: +(rows.reduce((a, r) => a + r.boostInFight, 0) / rows.length).toFixed(2), causes: rows.reduce((o, r) => { o[r.cause] = (o[r.cause] || 0) + 1; return o }, {}) }))
