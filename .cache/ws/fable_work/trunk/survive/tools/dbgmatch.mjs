// bun dbgmatch.mjs <lib> <seed> <select json>: closed-loop sim match (CFGJ honoured) printing the svDrop state every 0.5 s while latched
import { readFileSync } from 'node:fs'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const W = S + '/r7work'
const [lib, seedS, sel] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(S + '/fable_work/chaos/sim/run.js')
let cfgObj = null
if (process.env.CFGJ) { const { loadConfig } = await import(S + '/fable_work/chaos/sim/config.js'); cfgObj = loadConfig(); const pj = JSON.parse(process.env.CFGJ); for (const k of Object.keys(pj)) cfgObj[k] = { ...cfgObj[k], ...pj[k] } }
const ctx = makeContext(cfgObj ? { quiet: true, configObject: cfgObj } : { quiet: true })
let brain = null
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, { fuseMs: 1e9, salt: 1, select: JSON.parse(sel) }); return { type: 'ready', name: 'ours' } },
  act(obs) { const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick; const B = brain._B, st = B.sv && B.sv.state
    if (st && st.dropId >= 0 && B.tick % 5 === 0) { const d = B.drops.find((x) => x.id === st.dropId)
      console.log(`t ${B.me.t.toFixed(1)} hp ${B.me.hpf.toFixed(2)} mode ${B.mode} leg ${B.legKind} dist ${d ? Math.hypot(d.x - B.me.x, d.y - B.me.y).toFixed(1) : '-'} dz ${d ? (B.me.z).toFixed(1) : ''} lands ${d ? d.landsIn : ''} holder ${d ? d.holder : ''} prog ${d ? d.progress : ''} move ${a.move.map((v) => v.toFixed(2))} boost ${a.boost} tgt ${B.target ? B.target.id + '@' + B.target.dist.toFixed(0) : '-'} nLos ${B.nLos} inRing ${B.trackList.filter((tr) => !tr.npc && d && Math.hypot(tr.x - d.x, tr.y - d.y) <= d.radius).length}`) }
    return a } })
const r = await playMatch(+seedS, { mode: 'squad' }, ctx, { team, opponents: [] })
console.log('kills', r.kills, 'alive', r.timeAlive, 'cause', r.cause)
