// usage: bun smoke2.mjs <botdir> <stream.gz> <mapdir> [overrides json] : per-decision ms (warm-up as shipped), worst 5
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const [D, S, MD, ovs] = process.argv.slice(2)
const ov = ovs ? JSON.parse(ovs) : undefined
const lines = gunzipSync(readFileSync(S)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const { World } = await import(D + '/lib/world.js'), { Nav } = await import(D + '/lib/nav.js'), { createBrain } = await import(D + '/lib/brain.js')
const world = World.loadSync(MD, { files: hello.map && hello.map.files || [] })
const m = hello.config.mech
const br = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 }), log: () => {} }, ov)
await new Promise((r) => setTimeout(r, 600))
const ms = []
for (const o of obs) { const t0 = performance.now(); br.act(JSON.parse(JSON.stringify(o)), t0 + 1e6); ms.push([performance.now() - t0, o.t, br.debugState().mode + '/' + br.debugState().leg]) }
const s = [...ms].sort((a, b) => b[0] - a[0])
console.log('worst', s.slice(0, 5).map((x) => `${x[0].toFixed(1)}ms@${x[1]}${x[2]}`).join(' '), 'mean', (ms.reduce((a, x) => a + x[0], 0) / ms.length).toFixed(2), 'p26', JSON.stringify(br.debugState().p26 && br.debugState().p26.phase), 'errors', br._B.counters.errors)
