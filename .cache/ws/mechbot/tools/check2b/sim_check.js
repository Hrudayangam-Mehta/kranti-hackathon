// check2b: simulator matches.  bun sim_check.js <from> <to> <squad|ffa> <plain|dual> [OVR json in env OVR]
//   plain: the live brain with plain defaults (+OVR) drives; dual: NEW(pass2b=off) drives with the pass 2a snapshot in lockstep
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [from, to] = [+process.argv[2], +process.argv[3]], mode = process.argv[4] || 'squad', kind = process.argv[5] || 'plain'
const OVR = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const lib = kind === 'dual' ? await import('./dual.js') : await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const rows = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, maxMs = 0, n = 0, latchT = -1, baseLatchT = -1, gateEndT = -1
  const pre0 = lib.DUAL ? { ...lib.DUAL } : null
  const h = createHash('sha256')
  const team = () => ({ name: 'ours',
    hello(hh) { const mc = hh.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = lib.createBrain(hh, { world: ctx.world, nav, log: () => {} }, OVR); return { type: 'ready', name: 'ours' } },
    act(obs) { const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms
      h.update(JSON.stringify(a) + '\n')
      if (latchT < 0 && brain._B.env === 'FFA') latchT = obs.t
      if (brain._base && baseLatchT < 0 && brain._base._B.env === 'FFA') baseLatchT = obs.t
      if (gateEndT < 0 && brain._B.ofEndT >= 0) gateEndT = brain._B.ofEndT
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  const s = brain.debugState(), c = s.counters
  const row = { seed, score: r.score, kills: r.kills, cause: r.cause, alive: r.timeAlive, cubes: r.cubes, n, env: s.env, latchT: +(+latchT).toFixed(2), gateEndT: +(+gateEndT).toFixed(1),
    fuse: c.fuse, errors: c.errors, stuck: c.stuck, noProgress: c.noProgress, steals: c.steals || 0, botErrors: r.errors, fallback: r.fallback, lates: r.lates, hash: h.digest('hex').slice(0, 16), maxMs: +maxMs.toFixed(1) }
  if (lib.DUAL) { const D = lib.DUAL; Object.assign(row, { baseLatchT, preMism: D.preMism - pre0.preMism, postMism: D.postMism - pre0.postMism, pre: D.pre - pre0.pre, post: D.post - pre0.post, envMism: D.envMism - pre0.envMism, fuseB: brain._base.debugState().counters.fuse }) }
  rows.push(row); console.log(JSON.stringify(row))
}
const sum = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0)
console.log('SUMMARY ' + JSON.stringify({ mode, kind, ovr: OVR, matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(3), latched: rows.filter((r) => r.env === 'FFA').length,
  zoneDeaths: rows.filter((r) => /zone/i.test(String(r.cause))).length, fuse: sum('fuse'), errors: sum('errors'), botErrors: sum('botErrors'), stuck: sum('stuck'), maxMs: Math.max(...rows.map((r) => r.maxMs)),
  ...(lib.DUAL ? { preMism: sum('preMism'), postMism: sum('postMism'), pre: sum('pre'), post: sum('post'), envMism: sum('envMism') } : {}) }))
