// pass 2b: simulator sanity matches with the live brain at its defaults (or OVR JSON): errors, stuck, zone deaths, latch
//   bun sanity.js <squad|ffa> <from> <to>
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
  let brain = null, maxMs = 0, n = 0, slow = 0, legs = {}
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) { const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms; if (ms > 15) slow++; legs[brain._B.legKind] = (legs[brain._B.legKind] || 0) + 1; a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  const s = brain.debugState(), c = s.counters
  rows.push({ seed, mode, score: r.score, kills: r.kills, cause: r.cause, alive: r.timeAlive, stuck: c.stuck, noProgress: c.noProgress, fuse: c.fuse, errors: c.errors, stageErrors: s.errors,
    latchT: s.ffaLatchT, env: s.env, steals: c.steals || 0, stealDone: c.stealDone || 0, deathsSeen: c.deathsSeen || 0, rearFaces: c.rearFaces || 0, ffaBreaks: c.ffaBreaks || 0,
    breakNoGoal: c.ffaBreakNoGoal || 0, openFarmEndT: s.openFarmEndT, maxMs: +maxMs.toFixed(1), slow, n, brk: (legs.brkmove || 0) + (legs.brkstill || 0) + (legs.brksettle || 0) })
  console.log(JSON.stringify(rows[rows.length - 1]))
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
console.log('SUMMARY', JSON.stringify({ mode, matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(2), kills: sum('kills'), stuck: sum('stuck'), noProgress: sum('noProgress'), fuse: sum('fuse'), errors: sum('errors'),
  zoneDeaths: rows.filter((r) => r.cause === 'zone').length, latched: rows.filter((r) => r.env === 'FFA').length, maxMs: Math.max(...rows.map((r) => r.maxMs)), slow: sum('slow'), steals: sum('steals'), rearFaces: sum('rearFaces'), ffaBreaks: sum('ffaBreaks'),
  causes: rows.reduce((o, r) => { o[r.cause] = (o[r.cause] || 0) + 1; return o }, {}) }))
