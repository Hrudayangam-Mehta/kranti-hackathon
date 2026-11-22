// in-process squad matches with the brain's own counters (stuck, no-progress, fuse, latch, errors) per match
const P = process.argv[2], seeds = (process.argv[3] || '1-20').split('-').map(Number)
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const rows = []
for (let seed = seeds[0]; seed <= seeds[1]; seed++) {
  let brain = null, maxMs = 0, n = 0, slow = 0
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }); return { type: 'ready', name: 'ours' } },
    act(obs) { const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms; if (ms > 15) slow++; a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team })
  const s = brain.debugState(), c = s.counters
  const me = r
  rows.push({ seed, score: me.score, kills: me.kills, cause: me.cause, alive: me.timeAlive, stuck: c.stuck, noProgress: c.noProgress, abandons: c.abandons, fuse: c.fuse, errors: c.errors, hops: c.hops, latch: s.ffaLatchT, env: s.env, losing: c.losing || 0, bulletDodges: c.bulletDodges, maxMs: +maxMs.toFixed(1), slow, n })
  console.log(JSON.stringify(rows[rows.length - 1]))
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
console.log('SUMMARY', JSON.stringify({ matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(3), stuck: sum('stuck'), noProgress: sum('noProgress'), fuse: sum('fuse'), errors: sum('errors'), latched: rows.filter((r) => r.env === 'FFA').length, maxMs: Math.max(...rows.map((r) => r.maxMs)), slow: sum('slow'), causes: rows.reduce((o, r) => { o[r.cause] = (o[r.cause] || 0) + 1; return o }, {}) }))
