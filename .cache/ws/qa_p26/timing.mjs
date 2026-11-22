// CPU time per decision (process.cpuUsage): bun timing.mjs <libDir> <stream.gz> <env> <slot> ; env OVR
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
if (env === 'ffa') ov.env = 'ffa'
const brain = createBrain(hello, { world, nav, log: () => {} }, ov)
const cpu = [], wall = []
let onN = 0
for (const o of msgs) if (o.type === 'obs') {
  const c0 = process.cpuUsage(), t0 = performance.now()
  brain.act(o, t0 + 27.5)
  const c = process.cpuUsage(c0); cpu.push((c.user + c.system) / 1000); wall.push(performance.now() - t0)
  if (brain._B.p26on) onN++
}
const s = Float64Array.from(cpu).sort(), n = s.length, w = Float64Array.from(wall).sort()
const st = brain.debugState()
console.log(JSON.stringify({ lib: lib.split('/').slice(-3, -1).join('/'), env, slot: +slot, n, p26on: onN, finalEnv: st.env, fuse: (st.counters || {}).fuse || 0, errors: (st.counters || {}).errors || 0,
  meanCpu: +(cpu.reduce((a, b) => a + b, 0) / n).toFixed(3), p99Cpu: +s[Math.floor(n * 0.99)].toFixed(2), maxCpu: +s[n - 1].toFixed(2), p99Wall: +w[Math.floor(n * 0.99)].toFixed(2), maxWall: +w[n - 1].toFixed(2) }))
