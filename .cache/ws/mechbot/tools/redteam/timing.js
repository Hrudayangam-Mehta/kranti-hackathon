// Red-team tool: decision-time distribution of the brain in simulator matches, split by what heavy work ran.
//   taskset -c 0 bun tools/redteam/timing.js --n 16 [--noclock]
import { makeContext, playMatch } from './snap/sim/run.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const args = process.argv.slice(2)
const n = parseInt(args[args.indexOf('--n') + 1] || '16', 10)
const overrides = args.includes('--noclock') ? { planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 } : undefined
const ctx = makeContext({ quiet: true })
let nav = null
const all = [], by = {}
let over8 = 0, over15 = 0, over25 = 0, over50 = 0
for (let seed = 1; seed <= n; seed++) {
  let brain = null
  const team = () => ({
    name: 'ours', hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, overrides); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const B = brain._B, c0 = { ...B.counters }, hs0 = B.hide.state, cur0 = B.hide.cursor
      const t0 = performance.now()
      const a = brain.act(obs, t0 + 27.5)
      const ms = performance.now() - t0
      a.tick = obs.tick
      const plan = B.counters.plans - c0.plans, ev = B.counters.evals - c0.evals, hide = hs0 === 'run' || B.hide.cursor !== cur0
      const key = `${plan ? 'plan' : ''}${ev ? '+eval' : ''}${hide ? '+hide' : ''}` || 'light'
      const q = by[key] || (by[key] = { n: 0, sum: 0, max: 0 })
      q.n++; q.sum += ms; if (ms > q.max) q.max = ms
      all.push(ms)
      if (ms > 8) over8++; if (ms > 15) over15++; if (ms > 25) over25++; if (ms > 50) over50++
      return a
    },
  })
  await playMatch(seed, { mode: 'squad', keep: false }, ctx, { team, opponents: [] })
}
all.sort((a, b) => a - b)
const q = (p) => all[Math.min(all.length - 1, Math.floor(p * all.length))].toFixed(2)
console.log(JSON.stringify({ decisions: all.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), p999: q(0.999), max: all[all.length - 1].toFixed(1), over8ms: over8, over15ms: over15, over25ms: over25, over50ms: over50, overrides }))
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].max - a[1].max)) console.log(`  ${k.padEnd(16)} n ${String(v.n).padStart(6)} mean ${(v.sum / v.n).toFixed(2)} ms max ${v.max.toFixed(1)} ms`)
process.exit(0)
