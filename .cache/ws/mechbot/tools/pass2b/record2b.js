// pass 2a: record the brain's actions on one stream or one simulator squad match, for the SQUAD identity proof.
//   bun record.js <libDir> stream <kit|file.jsonl.gz> <auto|squad> <out.jsonl>
//   bun record.js <libDir> match <seed> <out.jsonl>
// Prints one JSON line: { n, hash, env, latchTick, ... }. Every action line is {tick, ...action}.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, cmd, a1, a2, a3] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const lines = []
let latchTick = -1
function rec(brain, obs) {
  const a = brain.act(obs, performance.now() + 27.5)
  lines.push(JSON.stringify({ tick: obs.tick, ...a }))
  if (latchTick < 0 && brain._B.env === 'FFA') latchTick = obs.tick
  return a
}
function finish(out, extra) {
  const h = createHash('sha256'); for (const s of lines) h.update(s + '\n')
  writeFileSync(out, lines.join('\n') + '\n')
  console.log(JSON.stringify({ cmd, a1, a2, n: lines.length, hash: h.digest('hex').slice(0, 20), latchTick, ...extra }))
}
if (cmd === 'stream') {
  const file = a1 === 'kit' ? P + '/kit/check/stream.jsonl.gz' : a1
  const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(P + '/bot/lib/world.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
  const brain = createBrain(hello, { world, nav, log: () => {} }, { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } })
  for (const o of msgs) if (o.type === 'obs') rec(brain, o)
  const st = brain.debugState()
  finish(a3, { env: st.env, fuse: st.counters.fuse, errors: st.counters.errors })
} else if (cmd === 'match') {
  const seed = +a1
  const { makeContext, playMatch } = await import(P + '/sim/run.js')
  const ctx = makeContext({ quiet: true })
  let brain = null
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, process.env.OVR ? JSON.parse(process.env.OVR) : {}); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = rec(brain, obs); a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team })
  const st = brain.debugState()
  finish(a2, { score: r.score, kills: r.kills, alive: r.timeAlive, cause: r.cause, env: st.env, fuse: st.counters.fuse, errors: st.counters.errors })
}
