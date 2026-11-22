// bun pairms.mjs <libA> <libB> <stream.jsonl.gz> [env] [selB json] [reps]: decision time of two libs, interleaved decision by
// decision (A then B, then B then A on the next one) so machine load hits both alike; warm-up on (as in a match), fuseMs 1e9.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const R = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [A, B, f, env = 'squad', sb = '{}', repsS = '1'] = process.argv.slice(2)
const msgs = gunzipSync(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const { World } = await import(R + '/ref_bot/lib/world.js'), { Nav } = await import(R + '/ref_bot/lib/nav.js')
const world = World.loadSync(R + '/kit/arena'), mc = hello.config.mech
const mk = async (lib, sel) => {
  const { createBrain } = await import(lib + '/brain.js')
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, { fuseMs: 1e9, select: { ...JSON.parse(sel), env } })
}
const ta = [], tb = []
for (let r = 0; r < +repsS; r++) {
  const a = await mk(A, '{}'), b = await mk(B, sb)
  for (let i = 0; i < obs.length; i++) {
    const oa = JSON.parse(JSON.stringify(obs[i])), ob = JSON.parse(JSON.stringify(obs[i]))
    const run = (br, o, out) => { const t0 = performance.now(); br.act(o, t0 + 1e6); out.push(performance.now() - t0) }
    if (i & 1) { run(b, ob, tb); run(a, oa, ta) } else { run(a, oa, ta); run(b, ob, tb) }
  }
}
const q = (x, p) => { const s = Float64Array.from(x).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length
const row = (n, x) => `${n}: mean ${mean(x).toFixed(3)} p50 ${q(x, 0.5).toFixed(3)} p90 ${q(x, 0.9).toFixed(3)} p99 ${q(x, 0.99).toFixed(3)} max ${q(x, 1).toFixed(2)} ms`
console.log(`${f.split('/').pop()} ${env} decisions ${ta.length}`)
console.log(row('A', ta)); console.log(row('B', tb))
console.log(`B / A mean ${(mean(tb) / mean(ta)).toFixed(3)}, p90 ${(q(tb, 0.9) / q(ta, 0.9)).toFixed(3)}`)
