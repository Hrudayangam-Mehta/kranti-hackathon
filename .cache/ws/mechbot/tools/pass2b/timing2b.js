// check2a: decision time of one brain (new = bot/lib, base = check2a/base_tree/lib) on the kit stream and the captured FFA streams
//   taskset -c 0 env <Dockerfile BUN_JSC_*> bun timing.js <new|base> <kit|ffa1|ffa2|ffa3> [reps]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [which, src, reps0] = process.argv.slice(2), reps = +(reps0 || 1)
const lib = which === 'base' ? P + '/tools/check2a/base_tree/lib' : which === 'snap' ? '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_pass2a/lib' : P + '/bot/lib'
const { createBrain } = await import(lib + '/brain.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const file = src === 'kit' ? P + '/kit/check/stream.jsonl.gz' : `${P}/tools/check2a/streams/ffa_s${src.slice(3)}.jsonl.gz`
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const ts = []
let ffa = 0
const slow = []
for (let r = 0; r < reps; r++) {
  const br = createBrain(hello, { world, nav, log: () => {} }, process.env.OVR ? JSON.parse(process.env.OVR) : undefined)      // first brain runs the start-up rehearsal (as in a match)
  for (const o of obs) { const t0 = performance.now(); br.act(JSON.parse(JSON.stringify(o)), t0 + 27.5); const dt = performance.now() - t0; ts.push(dt); if (dt > 12) slow.push([o.tick, +dt.toFixed(1), br._B.env, br._B.legKind, br._B.mode]); if (br._B.env === 'FFA') ffa++ }
}
ts.sort((a, b) => a - b)
const q = (p) => ts[Math.min(ts.length - 1, Math.floor(p * ts.length))]
console.log(JSON.stringify({ which, src, n: ts.length, ffaDecisions: ffa, mean: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(3), p50: +q(0.5).toFixed(2), p99: +q(0.99).toFixed(2), max: +ts[ts.length - 1].toFixed(2), over15: ts.filter((x) => x > 15).length, slow }))
