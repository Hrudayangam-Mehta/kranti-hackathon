// bench_js.js DATADIR [--write-astar] : times the bot's own World._cast on the recorded casts and Nav._search on
// A* queries (the recorded base-body ones plus deterministic random pairs), checks the results against the record.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const P = new URL('../../../', import.meta.url).pathname
const { World } = await import(P + 'bot/lib/world.js')
const { Nav } = await import(P + 'bot/lib/nav.js')
const D = process.argv[2]
const f64 = (n) => { const b = readFileSync(`${D}/${n}.bin`); return new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8) }
const world = World.loadSync(P + 'kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const C = f64('casts'), nC = C.length / 8
const now = () => performance.now()
// ---- casts
let bad = 0
for (let i = 0; i < nC; i++) { const o = i * 8; if (world._cast(C[o], C[o + 1], C[o + 2], C[o + 3], C[o + 4], C[o + 5], C[o + 6]) !== C[o + 7]) bad++ }
const reps = 3, tc = []
for (let r = 0; r < reps; r++) {
  const t = now(); let s = 0
  for (let i = 0; i < nC; i++) { const o = i * 8; s += world._cast(C[o], C[o + 1], C[o + 2], C[o + 3], C[o + 4], C[o + 5], C[o + 6]) }
  tc.push(now() - t)
}
// per-decision-sized batches: the worst decision made ~250 casts; time 250-cast batches
const batch = 250, bt = []
for (let i = 0; i + batch <= nC; i += batch) {
  const t = now()
  for (let k = i; k < i + batch; k++) { const o = k * 8; world._cast(C[o], C[o + 1], C[o + 2], C[o + 3], C[o + 4], C[o + 5], C[o + 6]) }
  bt.push(now() - t)
}
bt.sort((a, b) => a - b)
// ---- A*
let A
const apath = `${D}/astar.bin`
if (process.argv.includes('--write-astar') || !existsSync(apath)) {
  const S = f64('searches'), q = []
  for (let i = 0; i < S.length; i += 10) q.push(S[i], S[i + 1], S[i + 2], S[i + 3], S[i + 4], S[i + 5], S[i + 6])
  let seed = 12345
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 }
  const main = nav.comp[nav.idx(41, -72)]
  while (q.length / 7 < 2042) {
    const a = Math.floor(rnd() * nav.n), b = Math.floor(rnd() * nav.n)
    if (!nav.pass[a] || !nav.pass[b] || nav.comp[a] !== main || nav.comp[b] !== main) continue
    const bx = nav.cellX(b), by = nav.cellY(b)
    q.push(a, b, bx, by, 0, 15000, (q.length / 7) % 2 ? 2.5 : 1.3)
  }
  A = new Float64Array(q.length / 7 * 10)
  for (let i = 0, j = 0; i < q.length; i += 7, j += 10) {
    for (let k = 0; k < 7; k++) A[j + k] = q[i + k]
    A[j + 7] = nav._search(q[i], q[i + 1], q[i + 2], q[i + 3], q[i + 4], q[i + 5], q[i + 6], null); A[j + 8] = nav._expanded; A[j + 9] = nav._best
  }
  writeFileSync(apath, Buffer.from(A.buffer))
} else A = f64('astar')
const nA = A.length / 10
let abad = 0, exp = 0
for (let j = 0; j < A.length; j += 10) {
  const r = nav._search(A[j], A[j + 1], A[j + 2], A[j + 3], A[j + 4], A[j + 5], A[j + 6], null)
  if (r !== A[j + 7] || nav._expanded !== A[j + 8]) abad++
  exp += nav._expanded
}
const ta = [], per = []
for (let r = 0; r < reps; r++) {
  const t = now()
  for (let j = 0; j < A.length; j += 10) {
    const t1 = now()
    nav._search(A[j], A[j + 1], A[j + 2], A[j + 3], A[j + 4], A[j + 5], A[j + 6], null)
    if (r === reps - 1) per.push([now() - t1, nav._expanded])
  }
  ta.push(now() - t)
}
per.sort((a, b) => b[0] - a[0])
const best = (v) => Math.min(...v)
console.log(JSON.stringify({
  engine: process.env.BUN_JSC_useFTLJIT === '0' ? 'docker-env (no FTL)' : 'default',
  casts: nC, cast_mismatch: bad, cast_total_ms: +best(tc).toFixed(1), cast_ns_each: +(best(tc) / nC * 1e6).toFixed(0),
  batch250_ms: { p50: +bt[bt.length >> 1].toFixed(3), p99: +bt[Math.floor(bt.length * 0.99)].toFixed(3), max: +bt[bt.length - 1].toFixed(3) },
  astar: nA, astar_mismatch: abad, expanded_total: exp, astar_total_ms: +best(ta).toFixed(1),
  ns_per_expansion: +(best(ta) / exp * 1e6).toFixed(1), slowest_search_ms: +per[0][0].toFixed(2), slowest_expanded: per[0][1],
}))
