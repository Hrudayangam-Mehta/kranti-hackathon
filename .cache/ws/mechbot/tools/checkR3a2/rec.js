// checkR3a2 (independent checker): record a brain's actions, per-decision time and path searches.
//   bun rec.js <libDir> stream <file.jsonl.gz> <auto|squad> <out>      open loop, the recorded observations
//   bun rec.js <libDir> squad <seed> - <out>                           closed loop, simulator squad match
//   bun rec.js <libDir> ffa <seed> - <out>                             closed loop, simulator free-for-all
// OVR env: JSON overrides for createBrain (third argument). Writes <out>.jsonl (one action per decision, with tick)
// and <out>.meta.json (n, hash, env, latch tick, modes, per-decision ms and path-search counts).
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, cmd, a1, a2, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const lines = [], ms = [], ps = [], modes = {}, envs = []
let latchTick = -1, searches = 0, brain = null, healN = 0
function countNav(nav) {
  const f = nav.findPath
  nav.findPath = function (...a) { searches++; return f.apply(this, a) }
  return nav
}
function rec(obs) {
  searches = 0
  const t0 = performance.now()
  const a = brain.act(obs, t0 + 27.5)
  const dt = performance.now() - t0
  ms.push(Math.round(dt * 1000) / 1000); ps.push(searches)
  lines.push(JSON.stringify({ tick: obs.tick, ...a }))
  const B = brain._B
  modes[B.mode] = (modes[B.mode] || 0) + 1
  if (latchTick < 0 && B.env === 'FFA') latchTick = obs.tick
  return a
}
function finish(extra) {
  const h = createHash('sha256'); for (const s of lines) h.update(s + '\n')
  writeFileSync(out + '.jsonl', lines.join('\n') + '\n')
  const st = brain.debugState()
  const sorted = Float64Array.from(ms).sort()
  const meta = { cmd, a1, a2, n: lines.length, hash: h.digest('hex').slice(0, 24), env: brain._B.env, latchTick, modes,
    fuse: st.counters.fuse, errors: st.counters.errors, maxMs: sorted[sorted.length - 1], p99: sorted[Math.floor(sorted.length * 0.99)],
    maxPath: Math.max(...ps), ...extra, ms, ps }
  writeFileSync(out + '.meta.json', JSON.stringify(meta))
  const { ms: _m, ps: _p, ...short } = meta
  console.log(JSON.stringify(short))
}
if (cmd === 'stream') {
  const msgs = gunzipSync(readFileSync(a1)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(P + '/bot/lib/world.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const nav = countNav(new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }))
  brain = createBrain(hello, { world, nav, log: () => {} }, { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } })
  for (const o of msgs) if (o.type === 'obs') rec(o)
  finish({})
} else if (cmd === 'squad' || cmd === 'ffa') {
  const seed = +a1
  const { makeContext, playMatch } = await import(P + '/sim/run.js')
  const ctx = makeContext({ quiet: true })
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = countNav(new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = rec(obs); a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: cmd }, ctx, { team, opponents: [] })
  finish({ score: r.score, kills: r.kills, alive: r.timeAlive, cause: r.cause, place: r.place })
}
