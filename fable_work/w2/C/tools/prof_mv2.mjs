// time spent inside the B.mv2 hooks per decision on a stream (all six presets on), against the whole decision
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const lib = S + '/fable_work/w2/C/tree/lib', W = S + '/r7work'
const { createBrain } = await import(lib + '/brain.js'), { Nav } = await import(W + '/ref_bot/lib/nav.js'), { World } = await import(W + '/ref_bot/lib/world.js')
const msgs = gunzipSync(readFileSync(process.argv[2])).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), world = World.loadSync(W + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const sel = { mv_meas: 'on', mv_flip: 'on', mv_close: 'on', mv_zig: 'on', mv_arc: 'on', mv_rim: 'on' }
const br = createBrain(hello, { world, nav, log: () => {} }, { fuseMs: 1e9, select: { ...sel, env: 'squad' } }), B = br._B
let acc = 0
for (const k of Object.keys(B.mv2)) { const f = B.mv2[k]; if (typeof f !== 'function' || k === 'state') continue; B.mv2[k] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a) } finally { acc += performance.now() - t0 } } }
const rows = []
for (const o of msgs) if (o.type === 'obs') { acc = 0; const t0 = performance.now(); br.act(o, t0 + 1e6); rows.push([performance.now() - t0, acc, o.tick, B.mode, B.legKind]) }
const first = rows.filter((r) => r[1] > 1).map((r) => [r[2], r[1].toFixed(2), r[4]]); console.log("decisions with > 1 ms in mv2 [tick, ms, leg]:", JSON.stringify(first))
rows.sort((a, b) => b[0] - a[0])
console.log('slowest decisions [ms total, ms in mv2, tick, mode, leg]:', JSON.stringify(rows.slice(0, 6).map((r) => [r[0].toFixed(1), r[1].toFixed(2), r[2], r[3], r[4]])))
const mv = rows.map((r) => r[1]).sort((a, b) => b - a)
console.log(`mv2 per decision: max ${mv[0].toFixed(2)} ms, p99 ${mv[Math.floor(mv.length * 0.01)].toFixed(3)} ms, mean ${(mv.reduce((a, b) => a + b, 0) / mv.length).toFixed(4)} ms over ${mv.length}`)
