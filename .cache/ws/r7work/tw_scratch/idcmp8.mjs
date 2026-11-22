// R7a identity compare: bun idcmp.mjs <tagA> <tagB> [sels comma list] [selB map e.g. DEF=ON]  (r7work/id/<tag>/<SEL>_<src>)
// Prints, per SELECT, the R3a2 identity set (14) and the FFA-inert set (14) results, and the health of tag B.
import { readFileSync, existsSync } from 'node:fs'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [A, Bt, selArg, mapArg] = process.argv.slice(2)
const sels = (selArg || 'DEF,V4,K0').split(',')
const map = {}; if (mapArg) for (const kv of mapArg.split(',')) { const [a, b] = kv.split('='); map[a] = b }
const R3 = [], FF = []
for (const s of ['kit', 'l4800', 'l11', 'l23p']) for (const e of ['squad', 'auto']) R3.push(`${s}_${e}`)
for (let k = 1; k <= 6; k++) R3.push(`sq${k}`)
for (const s of ['kit', 'f1', 'f2', 'f3', 'f4']) for (const e of ['auto', 'ffa']) FF.push(`${s}_${e}`)
for (const k of [411, 412, 413, 414]) FF.push(`ff${k}`)
const dir = (t) => t.startsWith('r7:') ? `${W}/id/${t.slice(3)}` : `${W}/tw_scratch/id/${t}`
const meta = (t, n) => { const f = `${dir(t)}/${n}.meta.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null }
const body = (t, n) => readFileSync(`${dir(t)}/${n}.jsonl`, 'utf8')
const firstDiff = (a, b) => { const x = a.split('\n'), y = b.split('\n'); for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i; return -1 }
let allOk = true, fuse = 0, err = 0, maxMs = 0, maxPath = 0, missing = 0
function run(sel, list, title) {
  const selB = map[sel] || sel
  let same = 0, miss = 0, diffDec = 0, totDec = 0; const rows = []
  for (const s of list) {
    const a = meta(A, `${sel}_${s}`), b = meta(Bt, `${selB}_${s}`)
    if (!a || !b) { miss++; rows.push(`${s}: MISSING`); continue }
    fuse += (b.fuse || 0) + (a.fuse || 0); err += (b.errors || 0) + (a.errors || 0); maxMs = Math.max(maxMs, b.maxMs || 0); maxPath = Math.max(maxPath, b.maxPath || 0)
    const x = body(A, `${sel}_${s}`), y = body(Bt, `${selB}_${s}`)
    totDec += a.n
    if (x === y) same++
    else {
      const X = x.split('\n'), Y = y.split('\n'); let d = 0; for (let i = 0; i < Math.min(X.length, Y.length); i++) if (X[i] !== Y[i]) d++
      diffDec += d
      rows.push(`${s}: DIFFERENT first at decision ${firstDiff(x, y)} (${d} of ${a.n} lines differ; n ${a.n} vs ${b.n}; fuse ${a.fuse}/${b.fuse})`)
    }
  }
  missing += miss
  console.log(`  ${title} [${sel} vs ${selB}]: ${same}/${list.length} byte-identical${miss ? ` (${miss} missing)` : ''}${diffDec ? `; differing lines ${diffDec} of ${totDec}` : ''}`)
  for (const r of rows) console.log('     ' + r)
  return same === list.length
}
console.log(`## ${A} vs ${Bt}`)
for (const sel of sels) {
  const ok1 = run(sel, R3, 'R3a2 identity set (14)')
  const ok2 = run(sel, FF, 'FFA-inert set (14)')
  if (!ok1 || !ok2) allOk = false
}
console.log(`  health: fuse ${fuse}, errors ${err}, worst decision ${maxMs} ms (in-process, shared cores), max A* per decision ${maxPath}, missing ${missing}`)
console.log(allOk && missing === 0 ? 'IDENTICAL' : 'NOT IDENTICAL')
