import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, src, reps0] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const file = src === 'kit' ? P + '/kit/check/stream.jsonl.gz' : `${P}/tools/check2a/streams/ffa_s${src.slice(3)}.jsonl.gz`
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
for (let r = 0; r < +(reps0 || 1); r++) {
  const br = createBrain(hello, { world, nav, log: () => {} })
  let k = 0
  for (const o of obs) { const t0 = performance.now(); br.act(JSON.parse(JSON.stringify(o)), t0 + 27.5); const dt = performance.now() - t0; k++
    if (dt > +(process.env.THR || 8)) { const st = br._B.stT || {}; console.log(JSON.stringify({ r, k, tick: o.tick, dt: +dt.toFixed(1), leg: br._B.legKind, mode: br._B.mode, st: Object.fromEntries(Object.entries(st).filter(([a, b]) => b > 0.5).map(([a, b]) => [a, +b.toFixed(1)])) })) } }
}
