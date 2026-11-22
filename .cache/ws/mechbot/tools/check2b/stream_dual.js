// check2b: open-loop replay of an observation stream into the twins.  bun stream_dual.js <file|kit> <squad|auto|none> [map|nomap] [perturbSeed]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [file, env, mapArg, pseed] = process.argv.slice(2)
const { createBrain, DUAL } = await import('./dual.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const msgs = gunzipSync(readFileSync(file === 'kit' ? P + '/kit/check/stream.jsonl.gz' : file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
let ctx = { world: null, nav: null, log: () => {} }
if (mapArg !== 'nomap') { const world = World.loadSync(P + '/kit/arena'); const mc = hello.config.mech; const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); ctx = { world, nav, log: () => {} } }
let a = (+pseed || 0) >>> 0
const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const brain = createBrain(hello, ctx, env === 'none' ? undefined : { select: { env } })
let latch = -1
for (const o of msgs) {
  if (o.type !== 'obs') continue
  if (pseed && Array.isArray(o.mechs)) {
    o.mechs = o.mechs.filter(() => rnd() > 0.05)
    for (const m of o.mechs) { if (Array.isArray(m.pos)) { m.pos[0] += (rnd() - 0.5) * 6; m.pos[1] += (rnd() - 0.5) * 6 } if (typeof m.hp === 'number' && rnd() < 0.1) m.hp = Math.max(1, m.hp * rnd()) }
  }
  brain.act(o, performance.now() + 27.5)
  if (latch < 0 && brain._B.env === 'FFA') latch = o.tick
}
const s = brain.debugState(), sb = brain._base.debugState()
console.log(JSON.stringify({ file: file.split('/').pop(), env, map: mapArg !== 'nomap', pseed: pseed || 0, decisions: DUAL.decisions, pre: DUAL.pre, preMism: DUAL.preMism, post: DUAL.post, postMism: DUAL.postMism, envMism: DUAL.envMism, latchTick: latch, envNew: s.env, envBase: sb.env, fuseN: s.counters.fuse, fuseB: sb.counters.fuse, errN: s.counters.errors, errB: sb.counters.errors, first: DUAL.first.slice(0, 2) }))
