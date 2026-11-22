// check2b: determinism. Replays a stream into the live brain (plain defaults) and prints the sha256 of all actions.
//   bun det.js <stream|kit> <squad|auto|ffa>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [file, env] = process.argv.slice(2)
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const msgs = gunzipSync(readFileSync(file === 'kit' ? P + '/kit/check/stream.jsonl.gz' : file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const ov = env === 'ffa' ? { env: 'ffa' } : env === 'squad' ? { select: { env: 'squad' } } : {}
const t0 = performance.now()
const brain = createBrain(hello, { world, nav, log: () => {} }, ov)
const reh = brain.debugState().rehearsal
const h = createHash('sha256'); let n = 0, maxMs = 0
for (const o of msgs) { if (o.type !== 'obs') continue; const a0 = performance.now(); const a = brain.act(o, a0 + 27.5); const ms = performance.now() - a0; if (ms > maxMs) maxMs = ms; h.update(JSON.stringify(a) + '\n'); n++ }
const st = brain.debugState()
console.log(JSON.stringify({ file: file.split('/').pop(), env, n, hash: h.digest('hex').slice(0, 20), env_end: st.env, fuse: st.counters.fuse, overruns: st.counters.overruns, errors: st.counters.errors, maxMs: +maxMs.toFixed(1), rehearsalMs: reh ? Math.round(reh.ms) : null, initMs: Math.round(performance.now() - t0) }))
