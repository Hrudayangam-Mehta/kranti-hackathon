import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const file = process.argv[2] === 'kit' ? P + '/kit/check/stream.jsonl.gz' : process.argv[2]
const env = process.argv[3] || 'auto'
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { World } = await import(P + '/bot/lib/world.js')
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
const world = World.loadSync(P + '/kit/arena')
const mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const brain = createBrain(hello, { world, nav, log: (s) => console.log(s) }, env === 'ffa' ? { env: 'ffa' } : env === 'squad' ? { select: { env: 'squad' } } : {})
const legs = {}
const times = []; for (const o of msgs) if (o.type === "obs") { const t0 = performance.now(); brain.act(o, t0 + 27.5); times.push(performance.now() - t0); const B = brain._B; legs[B.mode + '/' + B.legKind] = (legs[B.mode + '/' + B.legKind] || 0) + 1 }
const st = brain.debugState()
times.sort((a, b) => a - b); console.log(JSON.stringify({ n: times.length, meanMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3), p99: +times[Math.floor(times.length * 0.99)].toFixed(2), max: +times[times.length - 1].toFixed(2), fuse: st.counters.fuse, errors: st.errors, env: st.env, ffaBreaks: st.ffaBreaks, legs }))
