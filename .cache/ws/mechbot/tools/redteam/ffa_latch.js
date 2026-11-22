// Red-team tool: false FFA latches of the brain in simulator SQUAD matches (every latch here is false by construction).
//   bun tools/redteam/ffa_latch.js --n 96
import { makeContext, playMatch } from './snap/sim/run.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const args = process.argv.slice(2)
const n = parseInt(args[args.indexOf('--n') + 1] || '96', 10)
const ctx = makeContext({ quiet: true })
let nav = null, latched = 0
const rows = []
for (let seed = 1; seed <= n; seed++) {
  let brain = null, logs = [], d12 = -1, kills = 0, lastAlive = 16, tEnd = 0, foreign = 0
  const team = () => ({
    name: 'ours', hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: (...a) => logs.push(a.join(' ')) }, { planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick
      for (const e of obs.events || []) if (e.type === 'kill') kills++
      lastAlive = obs.alive; tEnd = obs.t
      foreign = (16 - obs.alive) - kills
      if (d12 < 0 && obs.t < 200 && foreign >= 3) d12 = obs.t          // the doctrine D12 rule
      return a
    },
  })
  const rec = await playMatch(seed, { mode: 'squad', keep: false }, ctx, { team, opponents: [] })
  const l = logs.find((s) => s.includes('FFA latched'))
  if (l || d12 >= 0) rows.push({ seed, code: l || null, d12rule: d12, foreignDeathsAtEnd: foreign, score: rec.score, tEnd })
  if (l) latched++
}
console.log(JSON.stringify({ matches: n, codeLatched: latched, d12RuleWouldLatch: rows.filter((r) => r.d12rule >= 0).length }))
for (const r of rows) console.log(JSON.stringify(r))
process.exit(0)
