// bun idcmp.mjs <dirA> <dirB>: every <name>.jsonl present in A compared byte for byte with B (identity), health of B
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const [A, Bd] = process.argv.slice(2)
let same = 0, n = 0, miss = 0, fuse = 0, err = 0
const rows = []
for (const f of readdirSync(A).filter((x) => x.endsWith('.meta.json')).sort()) {
  const name = f.replace('.meta.json', ''); n++
  if (!existsSync(`${Bd}/${name}.jsonl`) || !existsSync(`${Bd}/${name}.meta.json`)) { miss++; rows.push(`${name}: MISSING`); continue }
  const ma = JSON.parse(readFileSync(`${A}/${f}`, 'utf8')), mb = JSON.parse(readFileSync(`${Bd}/${f}`, 'utf8'))
  fuse += (ma.fuse || 0) + (mb.fuse || 0); err += (ma.errors || 0) + (mb.errors || 0)
  const x = readFileSync(`${A}/${name}.jsonl`, 'utf8'), y = readFileSync(`${Bd}/${name}.jsonl`, 'utf8')
  if (x === y) same++
  else { const X = x.split('\n'), Y = y.split('\n'); let d = 0, first = -1; for (let i = 0; i < Math.max(X.length, Y.length); i++) if (X[i] !== Y[i]) { d++; if (first < 0) first = i }
    rows.push(`${name}: DIFFERENT first at decision ${first} (${d} lines; n ${ma.n} vs ${mb.n}; kills ${ma.kills} vs ${mb.kills})`) }
}
for (const r of rows) console.log('  ' + r)
console.log(`${same}/${n} byte-identical (${miss} missing); fuse ${fuse}, errors ${err}`)
console.log(same === n ? 'IDENTICAL' : 'NOT IDENTICAL')
