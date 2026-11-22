import { readFileSync } from 'node:fs'
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')))
const recs = (j) => (j.matches || j.records || j.results || j).filter ? (j.matches || j.records || j.results || j) : Object.values(j)
const A = recs(a), Bv = recs(b)
let line = '', diff = 0
for (let i = 0; i < A.length; i++) { const x = A[i], y = Bv.find((r) => r.seed === x.seed); const d = (y.score - x.score); diff += d; line += `s${x.seed}:${x.score}->${y.score}${d ? '' : ''} ` }
console.log(line); console.log('mean paired diff', (diff / A.length).toFixed(3))
