// Verifier identity compare: bun idc.mjs <tagA> <tagB> [job list, comma]  (tw_scratch/vfy/id/<tag>/<job>.{jsonl,meta.json})
// Byte-compares the decision streams; prints first differing decision, counts, health (fuse / errors / worst ms) per side.
import { readFileSync, existsSync } from 'node:fs'
const V = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/vfy/id'
const [A, B, jobArg] = process.argv.slice(2)
const ALL = 'kit_squad kit_auto l4800_squad l4800_auto l11_squad l11_auto l23p_squad l23p_auto sq1 sq2 sq3 sq4 sq5 sq6 kit_ffa f1_auto f1_ffa f2_auto f2_ffa f3_auto f3_ffa f4_auto f4_ffa ff411 ff412 ff413 ff414'.split(' ')
const jobs = jobArg ? jobArg.split(',') : ALL
let same = 0, diff = 0, miss = 0
const h = { A: { fuse: 0, err: 0, maxMs: 0 }, B: { fuse: 0, err: 0, maxMs: 0 } }
for (const j of jobs) {
  const fa = `${V}/${A}/${j}`, fb = `${V}/${B}/${j}`
  if (!existsSync(fa + '.meta.json') || !existsSync(fb + '.meta.json')) { miss++; console.log(`  ${j}: MISSING`); continue }
  const ma = JSON.parse(readFileSync(fa + '.meta.json', 'utf8')), mb = JSON.parse(readFileSync(fb + '.meta.json', 'utf8'))
  for (const [k, m] of [['A', ma], ['B', mb]]) { h[k].fuse += m.fuse || 0; h[k].err += m.errors || 0; h[k].maxMs = Math.max(h[k].maxMs, m.maxMs || 0) }
  const x = readFileSync(fa + '.jsonl', 'utf8'), y = readFileSync(fb + '.jsonl', 'utf8')
  if (x === y) { same++; console.log(`  ${j}: identical (${ma.n} decisions, hash ${ma.hash}, latchTick ${ma.latchTick}, firstForeign ${ma.firstForeignTick}, env ${ma.env})`) }
  else {
    diff++
    const X = x.split('\n'), Y = y.split('\n'); let first = -1, d = 0
    for (let i = 0; i < Math.max(X.length, Y.length); i++) if (X[i] !== Y[i]) { d++; if (first < 0) first = i }
    console.log(`  ${j}: DIFFERENT first at decision ${first} (${d} lines; n ${ma.n} vs ${mb.n}; hash ${ma.hash} vs ${mb.hash}; latchTick ${ma.latchTick} vs ${mb.latchTick}; firstForeign ${ma.firstForeignTick} vs ${mb.firstForeignTick}; env ${ma.env} vs ${mb.env})`)
  }
}
console.log(`${A} vs ${B}: ${same}/${jobs.length} byte-identical, ${diff} different, ${miss} missing; health A fuse ${h.A.fuse} errors ${h.A.err} worst ${h.A.maxMs} ms; B fuse ${h.B.fuse} errors ${h.B.err} worst ${h.B.maxMs} ms`)
