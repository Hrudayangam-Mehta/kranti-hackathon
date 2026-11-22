import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const rows = []
for (const m of all) { const F = m.frames; for (let i = 0; i < F.length; i++) { const f = F[i]; rows.push({ seed: m.seed, i, t: f.t, ms: f.ms, md: f.md, lg: f.lg, prev: i ? F[i - 1].md + '/' + F[i - 1].lg : '-' }) } }
rows.sort((a, b) => b.ms - a.ms)
const by = {}
for (const r of rows.slice(0, 60)) { const k = r.md + '/' + r.lg; by[k] = (by[k] || 0) + 1 }
console.log('top 60 slow by mode/leg', Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '))
for (const r of rows.slice(0, 12)) console.log(r.seed, r.t, r.ms.toFixed(1), r.md + '/' + r.lg, 'prev', r.prev, 'frame#', r.i)
const early = rows.filter((r) => r.i < 5).sort((a, b) => b.ms - a.ms).slice(0, 5)
console.log('first-5-decisions worst', early.map((r) => r.ms.toFixed(1)).join(' '))
