// R4a: time spent inside the hunt module per decision (pre + post + pulseUpdate + seekLegs), simulator squad seeds, one core.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : { select: { retreat: 'd3', hunt: 'h50' } }
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null, acc = 0, worst = 0, n = 0, sumT = 0, ttkMax = 0
const per = []
for (let seed = 1; seed <= 6; seed++) {
  let brain = null
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV)
      const H = brain._B.hunt
      for (const k of ['pre', 'post', 'pulseUpdate', 'seekLegs']) { const f = H[k]; H[k] = (...a) => { const t0 = performance.now(); const r = f(...a); acc += performance.now() - t0; return r } }
      return { type: 'ready', name: 'ours' } },
    act(obs) { acc = 0; const a = brain.act(obs, performance.now() + 27.5); n++; sumT += acc; if (acc > worst) worst = acc; per.push(acc); a.tick = obs.tick; return a } })
  await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
}
per.sort((a, b) => a - b)
console.log(JSON.stringify({ sel: OV.select, decisions: n, meanMs: +(sumT / n).toFixed(4), p99: +per[Math.floor(0.99 * (per.length - 1))].toFixed(3), maxMs: +worst.toFixed(3) }))
