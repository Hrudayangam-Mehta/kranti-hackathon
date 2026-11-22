// usage: bun dstream.mjs <botdirA> <ovA json> <botdirB> <ovB json>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [A, oa, B, ob, stream] = process.argv.slice(2)
const lines = gunzipSync(readFileSync(stream || (P + '/kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const mk = async (dir, ov) => {
  const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
  const world = World.loadSync(P + '/kit/arena')
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, JSON.parse(ov))
}
const a = await mk(A, oa), b = await mk(B, ob)
let n = 0, d = 0, first = -1, mx = 0
for (const o of obs) {
  const c0 = process.cpuUsage()
  const x = JSON.stringify(a.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  const c1 = process.cpuUsage(c0); mx = Math.max(mx, (c1.user + c1.system) / 1000)
  const y = JSON.stringify(b.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  n++; if (x !== y) { d++; if (first < 0) first = n }
}
const ds = a.debugState ? a.debugState() : {}
console.log(`decisions ${n}, differ ${d}, first difference at ${first}, A worst cpu ms ${mx.toFixed(1)}, env ${ds.env}`)
