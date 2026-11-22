// QA: worst decision time on the kit stream, wall and CPU (process.cpuUsage), per build lib. usage: bun kitms.mjs <lib>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const lib = process.argv[2]
const { createBrain } = await import(lib + '/brain.js'), { World } = await import(lib + '/world.js'), { Nav } = await import(lib + '/nav.js')
const msgs = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), mc = hello.config.mech
const world = World.loadSync(S + '/mechbot/kit/arena')
const res = []
for (let rep = 0; rep < 3; rep++) {
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const brain = createBrain(hello, { world, nav, log: () => {} }, { fuseMs: 1e9 })
  let mw = 0, mcpu = 0, h = createHash('sha256'), n = 0
  for (const o of msgs) if (o.type === 'obs') {
    const c0 = process.cpuUsage(), t0 = performance.now()
    const a = brain.act(o, t0 + 27.5)
    const w = performance.now() - t0, c = process.cpuUsage(c0), cm = (c.user + c.system) / 1000
    if (w > mw) mw = w; if (cm > mcpu) mcpu = cm
    h.update(JSON.stringify({ tick: o.tick, ...a }) + '\n'); n++
  }
  res.push({ wall: +mw.toFixed(1), cpu: +mcpu.toFixed(1), hash: h.digest('hex').slice(0, 12), n, fuse: brain.debugState().counters.fuse || 0 })
}
console.log(JSON.stringify(res))
