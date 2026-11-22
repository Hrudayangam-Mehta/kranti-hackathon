// trace.js <libDir> <seed> <out.jsonl>: closed-loop squad match (chaos simulator) recording per decision the brain state
// (tick, t, mode, leg, target, hp, cubes, kills, nLos, rPrefNow, grab, loot, fm counters). env OVR = overrides JSON.
import { writeFileSync } from 'node:fs'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const [lib, seedS, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(S + '/r7work/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(S + '/fable_work/chaos/sim/run.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ctx = makeContext({ quiet: true })
let brain = null
const rows = []
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) { const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick; const B = brain._B, c = B.counters
    const fm = {}; for (const k of Object.keys(c)) if (k.startsWith('fm')) fm[k] = c[k]
    rows.push(JSON.stringify({ tick: obs.tick, t: +B.me.t.toFixed(2), a: JSON.stringify(a), mode: B.mode, leg: B.legKind, tgt: B.target ? B.target.id + '@' + Math.round(B.target.dist) : '-', hp: Math.round(B.me.hp), cubes: B.me.cubes, kills: c.kills,
      nLos: B.nLos, r: B.rPrefNow, grab: B.grab ? B.grab.type + (B.grab.rush ? '!' : '') + '@' + Math.round(Math.hypot(B.grab.x - B.me.x, B.grab.y - B.me.y)) : '', loot: B.loot ? B.loot.type + '@' + Math.round(Math.hypot(B.loot.x - B.me.x, B.loot.y - B.me.y)) : '', fm }))
    return a } })
const r = await playMatch(+seedS, { mode: 'squad' }, ctx, { team, opponents: [] })
writeFileSync(out, rows.join('\n') + '\n')
console.log(JSON.stringify({ kills: r.kills, alive: r.timeAlive, cause: r.cause, n: rows.length }))
