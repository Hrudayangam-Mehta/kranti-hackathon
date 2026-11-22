import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const D = process.argv[2]
const fs = readdirSync(D).filter((f) => /^sq\d+\.json$/.test(f))
let n = 0, nOpen = 0, kills = 0; const R = {}, M = {}
for (const f of fs) { const j = JSON.parse(readFileSync(D + '/' + f, 'utf8')); n += j.n; nOpen += j.nOpen; kills += j.kills; for (const [k, v] of Object.entries(j.reach)) { R[k] = (R[k] || 0) + v; M[k] = (M[k] || 0) + 1 } }
const out = {}
for (const k of Object.keys(R)) out[k] = { share: +(R[k] / nOpen).toFixed(4), matches: M[k] }
writeFileSync(D + '/reach_sum.json', JSON.stringify({ seeds: fs.length, n, nOpen, kills, keys: out }))
const keys = (process.argv[3] || '').split(',').filter(Boolean)
console.log(`seeds ${fs.length}, decisions ${n}, gate open ${nOpen} (${(100 * nOpen / n).toFixed(1)}%), kills ${kills}`)
for (const k of keys) console.log(k, out[k] ? `${(100 * out[k].share).toFixed(1)}% of gate-open decisions, ${out[k].matches}/${fs.length} matches` : 'NOT READ')
