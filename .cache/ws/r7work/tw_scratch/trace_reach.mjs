// Per PARAMS key: decisions (of all decisions in SQUAD posture with the TW firewall open) in which the key was read at all.
//   bun trace_reach.mjs <libDir> <seed> <out.json>   (squad sim match; select / salt from the lib's own params.js)
import { writeFileSync } from 'node:fs'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, seed, out] = process.argv.slice(2)
let cur = null, wrapped = 0, open = false
const seen = new Set(), reach = {}
globalThis.__wrapP = (P) => { wrapped++; if (wrapped > 1) return P; return new Proxy(P, { get(o, k, r) { if (open && typeof k === 'string' && !seen.has(k)) seen.add(k); return Reflect.get(o, k, r) } }) }
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const ctx = makeContext({ quiet: true })
let brain = null, nOpen = 0, n = 0
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9 }); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const B = brain._B
    open = B.env !== 'FFA' && B.hunt.firewall(); seen.clear()
    const a = brain.act(obs, performance.now() + 25); a.tick = obs.tick
    n++; if (open) { nOpen++; for (const k of seen) reach[k] = (reach[k] || 0) + 1 }
    open = false
    return a } })
const r = await playMatch(+seed, { mode: 'squad' }, ctx, { team, opponents: [] })
writeFileSync(out, JSON.stringify({ n, nOpen, kills: r.kills, reach }))
console.log(seed, n, nOpen, r.kills)
