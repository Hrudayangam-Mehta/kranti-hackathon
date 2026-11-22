// Review tool: paired A/B of brain parameter overrides over the same simulator seeds.
//   bun tools/review_tactics/ab.js --seed 1 --matches 80 --arms '[{}, {"readyCd":0.1}]'
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '40'), 10)
const arms = JSON.parse(arg('arms', '[{}]'))
const res = arms.map(() => [])
const alive = arms.map(() => 0)
for (let s = seed0; s < seed0 + n; s++) {
  for (let a = 0; a < arms.length; a++) {
    const { rec } = await runTrace(s, { overrides: arms[a] })
    res[a].push(rec.score); alive[a] += rec.timeAlive
  }
}
const mean = (v) => v.reduce((x, y) => x + y, 0) / v.length
const se = (v) => { const m = mean(v); return Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / (v.length - 1) / v.length) }
for (let a = 0; a < arms.length; a++) {
  const d = res[a].map((x, i) => x - res[0][i])
  console.log(`${JSON.stringify(arms[a]).padEnd(60)} score ${mean(res[a]).toFixed(2)} +- ${se(res[a]).toFixed(2)}  alive ${(alive[a] / n).toFixed(0)}s  paired diff vs arm0 ${mean(d).toFixed(2)} +- ${a ? se(d).toFixed(2) : '0'}`)
}
process.exit(0)
