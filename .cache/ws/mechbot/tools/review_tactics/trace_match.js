// Review tool: print the per-decision trace of one simulator match.
//   bun tools/review_tactics/trace_match.js --seed 3 [--every 5] [--from 0] [--to 999] [--overrides '{"k":v}']
import { fmtRow, runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed = parseInt(arg('seed', '1'), 10), every = parseInt(arg('every', '5'), 10)
const from = parseFloat(arg('from', '0')), to = parseFloat(arg('to', '1e9'))
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const { rows, rec } = await runTrace(seed, { overrides, mode: arg('mode', 'squad'), logBrain: true })
let k = 0
for (const r of rows) { k++; if (r.t < from || r.t > to) continue; if (k % every !== 0 && !r.ev) continue; console.log(fmtRow(r)) }
console.log(JSON.stringify({ seed: rec.seed, place: rec.place, kills: rec.kills, timeAlive: rec.timeAlive, cause: rec.cause, killer: rec.killerName, dealt: rec.dmgDealt, taken: rec.dmgTaken, loadout: rec.loadout, cubes: rec.cubes }))
process.exit(0)
