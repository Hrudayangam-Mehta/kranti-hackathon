// panel R4: laser releases vs laser hits per match (read-only). bun laserhits.js <mode> <seeds,comma>   env OVR
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const mode = process.argv[2] || 'squad', seeds = (process.argv[3] || '1').split(',').map(Number)
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
for (const seed of seeds) {
  let brain = null, hits = 0, lastShots = 0, forced = 0, fullHeld = 0
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const B = brain._B
      const lz = B.me.laser, fs = lz ? lz.fullSince : -1, t0 = obs.t
      const a = brain.act(obs, performance.now() + 27.5)
      for (const e of obs.events || []) if (e && e.type === 'hit' && e.weapon === 'laser' && e.target < 100) hits++
      const s = B.counters.laserShots
      if (s > lastShots && lz && fs >= 0 && t0 - fs >= B.P.laserForceS - 0.051) forced++
      lastShots = s
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  console.log(JSON.stringify({ seed, mode, force: OV.laserForceS || 1.5, score: r.score, alive: +r.timeAlive.toFixed(1), laserShots: brain._B.counters.laserShots, laserHitsOnMechs: hits, forcedReleases: forced }))
}
