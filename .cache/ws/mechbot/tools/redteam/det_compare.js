// Red-team tool: compare simulator result files of identical runs (same code, same seeds).
//   bun tools/redteam/det_compare.js a.json b.json [c.json ...]
import { readFileSync } from 'node:fs'
const files = process.argv.slice(2)
const runs = files.map((f) => { const j = JSON.parse(readFileSync(f, 'utf8')); const recs = j.matches || j.records || j.recs || j; const m = new Map(); for (const r of recs) m.set(r.seed, r); return m })
const seeds = [...runs[0].keys()].sort((a, b) => a - b)
let diffScore = 0, diffAny = 0
const means = runs.map((m) => seeds.reduce((s, k) => s + m.get(k).score, 0) / seeds.length)
for (const s of seeds) {
  const a = runs.map((m) => m.get(s))
  const sc = new Set(a.map((r) => r.score)), any = new Set(a.map((r) => `${r.score}/${r.kills}/${r.timeAlive}/${r.dmgDealt}/${r.dmgTaken}`))
  if (sc.size > 1) diffScore++
  if (any.size > 1) { diffAny++; console.log(`seed ${s}: ` + a.map((r) => `score ${r.score} kills ${r.kills} t ${r.timeAlive} lates ${r.lates} maxMs ${r.maxMs}`).join('  |  ')) }
}
console.log(JSON.stringify({ seeds: seeds.length, matchesThatDiffer: diffAny, matchesWithDifferentScore: diffScore, means: means.map((v) => +v.toFixed(3)), spread: +(Math.max(...means) - Math.min(...means)).toFixed(3) }))
