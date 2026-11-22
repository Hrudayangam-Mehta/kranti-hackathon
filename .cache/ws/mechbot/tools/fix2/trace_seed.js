// print a decision trace of one squad match: bun trace_seed.js <seed> <t0> <t1> [every] [overridesJSON]
import { runTrace, fmtRow } from '../review_tactics/lib_trace.js'
const [seed, t0, t1, every = '0.5', ov] = process.argv.slice(2)
const hook = (row, obs, a, B) => { row.grab = B.grab ? `${B.grab.type}@${Math.round(Math.hypot(B.grab.x - B.me.x, B.grab.y - B.me.y))}` : '' }
const { rows, rec } = await runTrace(+seed, { overrides: ov ? JSON.parse(ov) : undefined, hook })
let last = -9
for (const r of rows) if (r.t >= +t0 && r.t <= +t1 && (r.t - last >= +every - 1e-6 || r.ev.includes('KILL'))) { last = r.t; console.log(fmtRow(r), r.grab, r.loot) }
console.log('score', rec.score, 'alive', rec.timeAlive, rec.cause, rec.killRange)
