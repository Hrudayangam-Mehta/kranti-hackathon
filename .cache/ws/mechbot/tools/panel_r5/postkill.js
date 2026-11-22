// Panel R5: what V4 does in the 3 s after each of its kills (simulator, behaviour only).
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const V4 = process.env.BOT || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(V4 + '/lib/brain.js')
const { Nav } = await import(V4 + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const agg = {}, T = { kills: 0, ghost: 0, ghostT: 0, healAfter: 0 }
for (let seed = from; seed <= to; seed++) {
  let brain = null, killT = -99, lastT = 0, ghostOn = false
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, {}); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, t = obs.t, dt = t - lastT
      lastT = t
      if (Array.isArray(obs.events) && obs.events.some((e) => e && e.type === 'kill' && e.target < 100)) { killT = t; T.kills++; ghostOn = false }
      if (t - killT <= 3) {
        const k = (B.mode || '-') + '/' + (B.legKind || '-') + (B.target ? '' : ' (no target)')
        agg[k] = (agg[k] || 0) + dt
        if (B.mode === 'DISENGAGE' && !B.target && !B.losing) { T.ghostT += dt; if (!ghostOn) { ghostOn = true; T.ghost++ } }
        if (B.mode === 'HEAL') T.healAfter += dt
      }
      a.tick = obs.tick; return a } })
  await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
}
console.log(`seeds ${from}-${to}: ${T.kills} kills; post-kill DISENGAGE with no target and not LOSING after ${T.ghost} kills, ${T.ghostT.toFixed(1)} s in all; HEAL within 3 s of a kill ${T.healAfter.toFixed(1)} s`)
console.log('time in the 3 s after a kill, by mode/leg: ' + Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '))
