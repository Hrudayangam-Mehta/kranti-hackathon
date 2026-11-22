// Scenario 6: is the brain deterministic for a fixed match seed? Same seed three times in one process (and across
// processes when run again): outcome, last decision time and the clock-dependent counters of the brain.
import { runTrace } from './lib_trace.js'
const seeds = (process.argv[2] || '6,14,17').split(',').map(Number)
for (const seed of seeds) for (let rep = 0; rep < 3; rep++) {
  const { rows, rec, brain, brainLogs } = await runTrace(seed, {})
  const c = brain._B.counters
  let h = 0
  for (const r of rows) h = (h * 31 + Math.round(r.x * 10) + Math.round(r.aimYaw * 1000) + (r.f0 ? 7 : 0)) | 0
  console.log(`seed ${seed} rep ${rep}: kills ${rec.kills} alive ${rec.timeAlive}s decisions ${rows.length} traceHash ${h >>> 0} | plans ${c.plans} evals ${c.evals} skipped ${c.skipped} overruns ${c.overruns} slow ${c.slow} ${brainLogs.filter((l) => l.includes('FFA')).join('')}`)
}
process.exit(0)
