// bun kitdiff.mjs <libA> <libB> [stream.jsonl.gz] [env auto|squad|ffa] [selA json] [selB json]
// Open-loop action stream of two libs on one recorded stream (fuseMs 1e9 on both sides, warm-up off), decision by decision.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const R = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [A, B, f = P + '/kit/check/stream.jsonl.gz', env = 'auto', sa = '{}', sb = '{}'] = process.argv.slice(2)
const msgs = gunzipSync(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const { World } = await import(R + '/ref_bot/lib/world.js'), { Nav } = await import(R + '/ref_bot/lib/nav.js')
const world = World.loadSync(R + '/kit/arena')
const mc = hello.config.mech
const mk = async (lib, sel) => {
  const { createBrain } = await import(lib + '/brain.js')
  const ov = { fuseMs: 1e9, warmup: false, select: { ...JSON.parse(sel), ...(env === 'squad' ? { env: 'squad' } : {}) } }
  if (env === 'ffa') ov.env = 'ffa'
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, ov)
}
const a = await mk(A, sa), b = await mk(B, sb)
let n = 0, d = 0, first = -1
for (const o of obs) {
  const x = JSON.stringify(a.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  const y = JSON.stringify(b.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  n++; if (x !== y) { d++; if (first < 0) first = n }
}
const cb = b._B.counters, sv = {}
for (const k of Object.keys(cb)) if (k.startsWith('sv')) sv[k] = cb[k]
console.log(`decisions ${n}, differ ${d}, first difference at ${first}; errors A ${a._B.counters.errors} B ${cb.errors}; B sv counters ${JSON.stringify(sv)}`)
