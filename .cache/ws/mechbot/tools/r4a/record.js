// R4a: record the brain's actions on one stream or one simulator match (any mode), for the identity proofs (T14 / T15).
//   bun record.js <libDir> stream <kit|ffaN|file.jsonl.gz> <auto|squad|ffa> <out.jsonl>
//   bun record.js <libDir> match <seed> <squad|ffa> <out.jsonl>
// env OVR = overrides JSON. Prints one JSON line: { n, hash, env, latchTick, firstForeignTick, ... }. Each action line is {tick, ...action}.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, cmd, a1, a2, a3] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const lines = []
let latchTick = -1, ffTick = -1, h50Ticks = 0
function rec(brain, obs) {
  const a = brain.act(obs, performance.now() + 27.5)
  lines.push(JSON.stringify({ tick: obs.tick, ...a }))
  const B = brain._B
  if (latchTick < 0 && B.env === 'FFA') latchTick = obs.tick
  if (ffTick < 0 && B.foreignDeaths > 0) ffTick = obs.tick
  if (B.h50 && (B.h50.on || B.h50.seekOk)) h50Ticks++
  return a
}
function finish(out, extra) {
  const h = createHash('sha256'); for (const s of lines) h.update(s + '\n')
  writeFileSync(out, lines.join('\n') + '\n')
  console.log(JSON.stringify({ cmd, a1, a2, n: lines.length, hash: h.digest('hex').slice(0, 20), latchTick, firstForeignTick: ffTick, huntOpenTicks: h50Ticks, ...extra }))
}
if (cmd === 'stream') {
  const file = a1 === 'kit' ? P + '/kit/check/stream.jsonl.gz' : /^ffa\d$/.test(a1) ? `${P}/tools/check2a/streams/ffa_s${a1.slice(3)}.jsonl.gz` : a1
  const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(P + '/bot/lib/world.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const ov = { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } }
  if (a2 === 'ffa') ov.env = 'ffa'
  const brain = createBrain(hello, { world, nav, log: () => {} }, ov)
  for (const o of msgs) if (o.type === 'obs') rec(brain, o)
  const st = brain.debugState()
  finish(a3, { env: st.env, fuse: st.counters.fuse, errors: st.counters.errors })
} else if (cmd === 'match') {
  const seed = +a1, mode = a2
  const { makeContext, playMatch } = await import(P + '/sim/run.js')
  const ctx = makeContext({ quiet: true })
  let brain = null
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = rec(brain, obs); a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  const st = brain.debugState()
  finish(a3, { score: r.score, kills: r.kills, alive: r.timeAlive, cause: r.cause, env: st.env, fuse: st.counters.fuse, errors: st.counters.errors })
}
