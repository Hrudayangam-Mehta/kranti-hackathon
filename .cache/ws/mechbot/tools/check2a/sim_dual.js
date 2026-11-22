// check2a: squad simulator matches (closed loop, the pass-2a brain drives) with the pre-pass-2a brain in lockstep on
// the same observations. Per match: score, latch (new and base), pre-latch action mismatches, fuse / stage errors.
//   bun sim_dual.js <from> <to> [mode squad|ffa] [envOverride]
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
const CAP = process.env.CAPTURE || ''
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [from, to] = [+process.argv[2], +process.argv[3]], mode = process.argv[4] || 'squad', envOv = process.argv[5] || ''
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain, DUAL } = await import('./dual.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const rows = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, maxMs = 0, n = 0, latchTick = -1, baseLatchTick = -1
  const pre0 = DUAL.preMism, post0 = DUAL.postMism, env0 = DUAL.envMism, preN0 = DUAL.pre
  const h = createHash('sha256')
  const cap = []
  const team = () => ({ name: 'ours',
    hello(hh) { if (CAP) cap.push(JSON.stringify(hh)); const mc = hh.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(hh, { world: ctx.world, nav, log: () => {} }, envOv ? { env: envOv } : undefined); return { type: 'ready', name: 'ours' } },
    act(obs) { if (CAP) cap.push(JSON.stringify(obs)); const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; n++; if (ms > maxMs) maxMs = ms
      h.update(JSON.stringify(a) + '\n')
      if (latchTick < 0 && brain._B.env === 'FFA') latchTick = obs.tick
      if (baseLatchTick < 0 && brain._base._B.env === 'FFA') baseLatchTick = obs.tick
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  if (CAP) writeFileSync(`${CAP}/${mode}_s${seed}.jsonl.gz`, gzipSync(cap.join('\n') + '\n'))
  const s = brain.debugState(), sb = brain._base.debugState()
  rows.push({ seed, score: r.score, kills: r.kills, cause: r.cause, alive: r.timeAlive, n, env: s.env, latchTick, baseEnv: sb.env, baseLatchTick, ffaLatchT: s.ffaLatchT,
    preMism: DUAL.preMism - pre0, pre: DUAL.pre - preN0, postMism: DUAL.postMism - post0, envMism: DUAL.envMism - env0,
    fuseN: s.counters.fuse, fuseB: sb.counters.fuse, errN: s.counters.errors, errB: sb.counters.errors, hash: h.digest('hex').slice(0, 16), maxMsPair: +maxMs.toFixed(1) })
  console.log(JSON.stringify(rows[rows.length - 1]))
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
console.log('SUMMARY ' + JSON.stringify({ mode, envOv, matches: rows.length, meanScore: +(sum('score') / rows.length).toFixed(3), latchedNew: rows.filter((r) => r.env === 'FFA').length, latchedBase: rows.filter((r) => r.baseEnv === 'FFA').length,
  preDecisions: sum('pre'), preMism: sum('preMism'), postMism: sum('postMism'), envMism: sum('envMism'), fuseN: sum('fuseN'), fuseB: sum('fuseB'), errN: sum('errN'), errB: sum('errB') }))
