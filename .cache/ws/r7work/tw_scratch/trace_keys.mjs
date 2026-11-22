// Trace which P keys are read at createBrain time (init) and which during act() (decision time).
//   bun trace_keys.mjs <libDir> <match|stream> <seed|file> <squad|ffa|auto> [selectJSON]
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, cmd, a1, a2, selJ, out] = process.argv.slice(2)
const sel = selJ ? JSON.parse(selJ) : {}
const initK = new Set(), actK = new Set()
let phase = 'init', wrapped = 0
globalThis.__wrapP = (P) => {
  wrapped++
  if (wrapped > 1) return P            // only the main brain (warmup off anyway)
  return new Proxy(P, { get(o, k, r) { if (typeof k === 'string') (phase === 'init' ? initK : actK).add(k); return Reflect.get(o, k, r) } })
}
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const OV = { warmup: false, select: sel, salt: 1 }
let brain = null
if (cmd === 'stream') {
  const msgs = gunzipSync(readFileSync(a1)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(W + '/ref_bot/lib/world.js')
  const world = World.loadSync(W + '/kit/arena')
  const mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const ov = { ...OV, select: { ...sel, ...(a2 === 'squad' ? { env: 'squad' } : {}) } }
  if (a2 === 'ffa') ov.env = 'ffa'
  brain = createBrain(hello, { world, nav, log: () => {} }, ov)
  phase = 'act'
  for (const o of msgs) if (o.type === 'obs') brain.act(o, performance.now() + 25)
} else {
  const { makeContext, playMatch } = await import(W + '/sim/run.js')
  const ctx = makeContext({ quiet: true })
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, a2 === 'ffa' ? { ...OV, env: 'ffa' } : OV); phase = 'act'; return { type: 'ready', name: 'ours' } },
    act(obs) { const a = brain.act(obs, performance.now() + 25); a.tick = obs.tick; return a } })
  await playMatch(+a1, { mode: a2 }, ctx, { team, opponents: [] })
}
writeFileSync(out, JSON.stringify({ init: [...initK].sort(), act: [...actK].sort() }))
console.log('init', initK.size, 'act', actK.size)
