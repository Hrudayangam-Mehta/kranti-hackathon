// lt.js <libDir> <seed> : one squad sim match (OVR as recs.js); prints {seed, kills, alive, laserT (first decision we hold a laser), lightT}
const lib = process.argv[2], seed = +process.argv[3]
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos'
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ctx = makeContext({ quiet: true })
let brain = null, laserT = -1, lightT = -1
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) { const a = brain.act(obs, performance.now() + 27.5); const me = brain._B.me; if (laserT < 0 && me.laser) laserT = me.t; if (lightT < 0 && me.lightning) lightT = me.t; a.tick = obs.tick; return a } })
const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
console.log(JSON.stringify({ seed, kills: r.kills, alive: r.timeAlive, laserT, lightT }))
