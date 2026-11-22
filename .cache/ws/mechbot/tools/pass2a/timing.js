// A/B decision timing on a stream: bun timing.js <libDir> <kit|file> <auto|squad|ffa> [passes]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, f, env, np] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { World } = await import(P + '/bot/lib/world.js')
const msgs = gunzipSync(readFileSync(f === 'kit' ? P + '/kit/check/stream.jsonl.gz' : f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
const world = World.loadSync(P + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: hello.config.mech.step_up, maxSlopeDeg: hello.config.mech.max_slope_deg })
const out = []
for (let pass = 0; pass < (+np || 3); pass++) {
  const b = createBrain(hello, { world, nav, log: () => {} }, env === 'ffa' ? { env: 'ffa' } : env === 'squad' ? { select: { env: 'squad' } } : {})
  const ts = []
  for (const o of msgs) if (o.type === 'obs') { const t0 = performance.now(); b.act(o, t0 + 27.5); ts.push(performance.now() - t0) }
  ts.sort((a, c) => a - c)
  out.push(`p50 ${ts[Math.floor(ts.length * 0.5)].toFixed(2)} p99 ${ts[Math.floor(ts.length * 0.99)].toFixed(2)} max ${ts[ts.length - 1].toFixed(2)}`)
}
console.log(lib.split('/').slice(-1)[0], f.split('/').slice(-1)[0], env, out.join(' | '))
