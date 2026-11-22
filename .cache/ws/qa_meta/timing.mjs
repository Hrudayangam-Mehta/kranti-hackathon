// CPU time per decision: bun timing.mjs <libDir> <stream.gz> <env> <slot> ; env OVR
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, file, env, slot] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const { World } = await import(W + '/ref_bot/lib/world.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'); hello.slot = +slot
const world = World.loadSync(W + '/kit/arena'); const mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const ov = { ...OV, select: { ...(OV.select || {}), ...(env === 'squad' ? { env: 'squad' } : {}) } }
const brain = createBrain(hello, { world, nav, log: () => {} }, ov)
const cpu = []
let metaCpu = 0
for (const o of msgs) if (o.type === 'obs') {
  const c0 = process.cpuUsage()
  brain.act(o, performance.now() + 27.5)
  const c = process.cpuUsage(c0); cpu.push((c.user + c.system) / 1000)
}
const s = Float64Array.from(cpu).sort(), n = s.length
console.log(JSON.stringify({ lib: lib.split('/').slice(-3, -1).join('/'), env, slot: +slot, n, on: brain._B.meta ? brain._B.meta.cnt.dec : null, fuse: (brain.debugState().counters || {}).fuse || 0, meanCpu: +(cpu.reduce((a, b) => a + b, 0) / n).toFixed(3), p99: +s[Math.floor(n * 0.99)].toFixed(2), max: +s[n - 1].toFixed(2) }))
