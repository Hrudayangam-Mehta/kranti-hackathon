// check2b: decision time of the live brain on one stream (fresh process: rehearsal + JIT as in a match).
//   bun timing.js <stream|kit> <squad|auto|ffa> [nomap]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [file, env, mapArg] = process.argv.slice(2)
const T0 = performance.now()
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const msgs = gunzipSync(readFileSync(file === 'kit' ? P + '/kit/check/stream.jsonl.gz' : file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
let ctx = { world: null, nav: null, log: () => {} }
if (mapArg !== 'nomap') { const world = World.loadSync(P + '/kit/arena'); const mc = hello.config.mech; const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); ctx = { world, nav, log: () => {} } }
const ov = env === 'ffa' ? { env: 'ffa' } : env === 'squad' ? { select: { env: 'squad' } } : {}
const brain = createBrain(hello, ctx, ov)
await new Promise((r) => setTimeout(r, 600))      // as bot.js
const initMs = performance.now() - T0
const ts = []
let ffaN = 0
for (const o of msgs) { if (o.type !== 'obs') continue; const t0 = performance.now(); brain.act(o, t0 + 27.5); ts.push(performance.now() - t0); if (brain._B.env === 'FFA') ffaN++ }
const s = [...ts].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
const worst = ts.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, i]) => `${v.toFixed(1)}@${i}`)
console.log(JSON.stringify({ file: file.split('/').pop(), env, map: mapArg !== 'nomap', jit: process.env.BUN_JSC_useConcurrentJIT, n: ts.length, ffaN, initMs: Math.round(initMs), p50: +q(0.5).toFixed(2), p99: +q(0.99).toFixed(2), max: +s[s.length - 1].toFixed(2), over10: ts.filter((v) => v > 10).length, over15: ts.filter((v) => v > 15).length, over20: ts.filter((v) => v > 20).length, worst, fuse: brain.debugState().counters.fuse }))
