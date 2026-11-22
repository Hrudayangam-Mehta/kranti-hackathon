// Verifier decision-time stats on one stream: bun tstat.mjs <libDir> <stream.jsonl.gz> <auto|squad|ffa> <out.json>   (env OVR)
// Same set-up as r7work/tools/rec7.js stream mode (World / Nav of ref_bot, deadline now + 27.5 ms); per-decision act() ms.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, file, env, out] = process.argv.slice(2)
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js'), { World } = await import(W + '/ref_bot/lib/world.js')
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), mc = hello.config.mech
const world = World.loadSync(W + '/kit/arena'), nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const ov = { ...OV, select: { ...(OV.select || {}), ...(env === 'squad' ? { env: 'squad' } : {}) } }
if (env === 'ffa') ov.env = 'ffa'
const b = createBrain(hello, { world, nav, log: () => {} }, ov)
const ms = [], h = createHash('sha256')
for (const o of msgs) if (o.type === 'obs') { const t0 = performance.now(); const a = b.act(o, t0 + 27.5); ms.push(performance.now() - t0); h.update(JSON.stringify({ tick: o.tick, ...a }) + '\n') }
const s = Float64Array.from(ms).sort(), q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))]
const c = b._B.counters
const r = { n: ms.length, hash: h.digest('hex').slice(0, 16), mean: ms.reduce((x, y) => x + y, 0) / ms.length, p50: q(0.5), p99: q(0.99), max: s[s.length - 1], fuse: c.fuse || 0, twFlips: c.twFlips || 0, twDecisions: c.twDecisions || 0 }
writeFileSync(out, JSON.stringify(r)); console.log(JSON.stringify(r))
