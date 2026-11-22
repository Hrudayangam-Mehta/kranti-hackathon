// Panel R5: our own gun hit rate by 25 m band in the simulator (B.gunStat: shots at a mech target, gun hits on mechs).
//   OVR='{"revCount":99}' TAG=full bun gunrate.js 1 10
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const V4 = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const TAG = process.env.TAG || 'V4'
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(V4 + '/lib/brain.js')
const { Nav } = await import(V4 + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const S = new Float64Array(12), H = new Float64Array(12)
let kills = 0, life = 0
for (let seed = from; seed <= to; seed++) {
  let brain = null, lastT = 0
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = brain.act(obs, performance.now() + 27.5); lastT = obs.t; if (Array.isArray(obs.events)) for (const e of obs.events) if (e && e.type === 'kill') kills++; a.tick = obs.tick; return a } })
  await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  const d = brain._B.gunStat.dump()
  for (let k = 0; k < 12; k++) { S[k] += d.shots[k]; H[k] += d.hits[k] }
  life += lastT
}
const row = []
for (let k = 0; k < 8; k++) row.push(`${k * 25}-${k * 25 + 25}: ${H[k]}/${S[k]} ${S[k] ? (100 * H[k] / S[k]).toFixed(0) : '-'}%`)
console.log(`${TAG} seeds ${from}-${to}: life ${(life / (to - from + 1)).toFixed(1)} s, kills ${kills}; gun hits/shots by band: ${row.join(', ')}`)
