// R4a simulator sanity (information only; uncalibrated). bun sim.js <squad|ffa> <from> <to>; OVR = overrides JSON, TAG = label
// Per match: score, kills, alive, kills/min alive, errors, stuck, zone death, latch, slowest decision, most plans in one decision,
// HOLD/roam share, HOLD/hunt* share, kill -> next damage gaps, hunt50 commits / pulses / seek decisions.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [mode, from, to] = [process.argv[2] || 'squad', +(process.argv[3] || 1), +(process.argv[4] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const TAG = process.env.TAG || 'run'
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const rows = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, maxMs = 0, n = 0, lastT = 0, roamT = 0, huntT = 0, pulseT = 0, lastKillT = -1, maxPlans = 0, foreignPre = 0
  const gaps = [], times = []
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const B0 = brain._B, p0 = B0.counters.plans
      const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms; times.push(ms)
      const B = brain._B, t = obs.t, dt = n === 1 ? 0 : t - lastT
      if (B.counters.plans - p0 > maxPlans) maxPlans = B.counters.plans - p0
      if (B.mode === 'HOLD' && B.legKind === 'roam') roamT += dt
      if (B.mode === 'HOLD' && B.legKind.startsWith('hunt')) huntT += dt
      if (B.h50Pulse) pulseT += dt
      if (B.env !== 'FFA' && B.foreignDeaths > 0 && !foreignPre) foreignPre = +t.toFixed(1)
      if (Array.isArray(obs.events)) for (const e of obs.events) {
        if (!e) continue
        if (e.type === 'hit' && Number.isInteger(e.target) && e.target < 100 && lastKillT >= 0) { gaps.push(+(t - lastKillT).toFixed(1)); lastKillT = -1 }
        if (e.type === 'kill' && Number.isInteger(e.target) && e.target < 100) lastKillT = t
      }
      lastT = t
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  const s = brain.debugState(), c = s.counters, al = Math.max(1, r.timeAlive)
  times.sort((x, y) => x - y)
  rows.push({ seed, score: r.score, kills: r.kills, cause: r.cause, alive: +r.timeAlive.toFixed(1), kpm: +(r.kills / al * 60).toFixed(2), errors: c.errors, stuck: c.stuck, fuse: c.fuse,
    env: s.env, latchT: s.ffaLatchT, foreignPreLatchT: foreignPre, maxMs: +maxMs.toFixed(1), p99: +times[Math.floor(0.99 * (times.length - 1))].toFixed(2), maxPlans,
    roamShare: +(roamT / al).toFixed(3), huntShare: +(huntT / al).toFixed(3), pulseS: +pulseT.toFixed(1), gaps, commits: c.h50Commits || 0, pulses: c.h50Pulses || 0, seekN: c.h50Seek || 0 })
  console.log(JSON.stringify(rows[rows.length - 1]))
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
const g = rows.flatMap((r) => r.gaps)
console.log('SUMMARY ' + TAG + ' ' + JSON.stringify({ mode, matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(2), kills: sum('kills'), alive: +(sum('alive') / rows.length).toFixed(1),
  kpm: +(sum('kills') / Math.max(1, sum('alive')) * 60).toFixed(2), errors: sum('errors'), stuck: sum('stuck'), fuse: sum('fuse'), zoneDeaths: rows.filter((r) => r.cause === 'zone').length,
  latched: rows.filter((r) => r.env === 'FFA').length, maxMs: Math.max(...rows.map((r) => r.maxMs)), maxPlans: Math.max(...rows.map((r) => r.maxPlans)),
  roamShare: +(rows.reduce((a, r) => a + r.roamShare * r.alive, 0) / Math.max(1, sum('alive'))).toFixed(3), huntShare: +(rows.reduce((a, r) => a + r.huntShare * r.alive, 0) / Math.max(1, sum('alive'))).toFixed(3),
  gapMean: g.length ? +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(2) : -1, gapsN: g.length, gapsOver9_8: g.filter((x) => x >= 9.8).length, commits: sum('commits'), pulses: sum('pulses'), pulseS: +sum('pulseS').toFixed(1) }))
