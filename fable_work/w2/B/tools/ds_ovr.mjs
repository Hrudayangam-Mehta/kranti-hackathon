// ds_ovr.mjs <botA> <botB> '<overrides JSON for B>' [reps]: kit stream, decisions that differ (A default, B with overrides),
// and the decision time of both brains, interleaved per decision in one process (same load), summed over reps passes
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [A, Bd, ovs, repS] = process.argv.slice(2)
const ovB = ovs ? JSON.parse(ovs) : {}, reps = +(repS || 1)
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const mk = async (dir, ov) => {
  const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
  const world = World.loadSync(P + '/kit/arena')
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { fuseMs: 1e9, ...ov })
}
let ta = 0, tb = 0, n = 0, d = 0, first = -1
for (let r = 0; r < reps; r++) {
  const a = await mk(A, {}), b = await mk(Bd, ovB)
  let k = 0
  for (const o of obs) {
    const oa = JSON.parse(JSON.stringify(o)), ob = JSON.parse(JSON.stringify(o))
    const t0 = performance.now(); const x = JSON.stringify(a.act(oa, performance.now() + 1e6)); const t1 = performance.now()
    const y = JSON.stringify(b.act(ob, performance.now() + 1e6)); const t2 = performance.now()
    ta += t1 - t0; tb += t2 - t1; k++
    if (r === 0) { n++; if (x !== y) { d++; if (first < 0) first = k } }
  }
}
console.log(`decisions ${n}, differ ${d}, first difference at ${first}; decision time A ${(ta / reps / n).toFixed(3)} ms, B ${(tb / reps / n).toFixed(3)} ms (B/A ${(tb / ta).toFixed(3)}, ${reps} passes)`)
