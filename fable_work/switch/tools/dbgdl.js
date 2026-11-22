// R7a identity recorder (adapted from our tools/r4a/record.js and tools/checkR4a/rec.js).
//   bun rec7.js <libDir> stream <file.jsonl.gz> <auto|squad|ffa> <out>     open loop on recorded observations
//   bun rec7.js <libDir> match <seed> <squad|ffa> <out>                     closed loop, simulator match (sim = r7work/sim)
// env OVR = overrides JSON for createBrain. Writes <out>.jsonl (one action per decision with its tick) and <out>.meta.json,
// prints the meta (without per-decision arrays) on stdout. World / Nav always come from the frozen reference copy.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, cmd, a1, a2, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const lines = [], ms = []
let dropEv = 0, latchTick = -1, ffTick = -1, searches = 0, maxPath = 0, brain = null, lastFinT = -99, finNearN = 0, nonHostFD = 0
const modes = {}, legs = {}
function countNav(nav) { const f = nav.findPath; nav.findPath = function (...a) { searches++; return f.apply(this, a) }; return nav }
function rec(obs) {
  searches = 0; if (Array.isArray(obs.events)) for (const e of obs.events) if (e && e.type === 'drop') dropEv++
  const t0 = performance.now()
  const a = brain.act(obs, t0 + 27.5)
  ms.push(performance.now() - t0)
  if (searches > maxPath) maxPath = searches
  lines.push(JSON.stringify({ tick: obs.tick, ...a })); { const B = brain._B, d = B.dl, od = (obs.drops || [])[0]; if (obs.tick % 10 === 0 && obs.t > 20) console.error(obs.t.toFixed(1), "hp", Math.round(B.me.hp), B.mode, B.legKind, "A", Math.round(B.A), "nLos", B.nLos, "tgt", B.target ? B.target.id + ":" + Math.round(B.target.dist) : "-", d ? `dl dist ${d.dist.toFixed(0)} lands ${d.landsIn.toFixed(0)} cap ${d.capture} go ${d.go} ring ${d.inRing} hpOk ${d.hpOk}` : "dl -", od ? `drop holder ${od.holder} prog ${od.progress} lands ${od.lands_in}` : "", "alive", obs.alive) }
  const B = brain._B
  modes[B.mode] = (modes[B.mode] || 0) + 1
  legs[B.legKind] = (legs[B.legKind] || 0) + 1
  if (latchTick < 0 && B.env === 'FFA') latchTick = obs.tick
  if (ffTick < 0 && B.foreignDeaths > 0) ffTick = obs.tick
  if (B.finNear) { lastFinT = B.me.t; finNearN++ }
  if (B.env !== 'FFA' && B.foreignDeaths > 0 && B.target && !B.target.npc && !B.target.hostile) nonHostFD++
  return a
}
function finish(extra) {
  const h = createHash('sha256'); for (const s of lines) h.update(s + '\n')
  writeFileSync(out + '.jsonl', lines.join('\n') + '\n')
  const st = brain.debugState(), c = st.counters || {}
  const sorted = Float64Array.from(ms).sort()
  const meta = { cmd, a1, a2, n: lines.length, hash: h.digest('hex').slice(0, 24), env: st.env, latchTick, firstForeignTick: ffTick,
    fuse: c.fuse || 0, errors: c.errors || 0, stuck: c.stuck || 0, maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
    p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100, maxPath, modes, legs, counters: c, lastFinT, finNearN, nonHostFD, lastT: brain._B.me.t, dropEv, ...extra }
  writeFileSync(out + '.meta.json', JSON.stringify(meta))
  const { counters: _c, legs: _l, ...short } = meta
  console.log(JSON.stringify(short))
}
if (cmd === 'stream') {
  const msgs = gunzipSync(readFileSync(a1)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(W + '/ref_bot/lib/world.js')
  const world = World.loadSync(W + '/kit/arena')
  const mc = hello.config.mech
  const nav = countNav(new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }))
  const ov = { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } }
  if (a2 === 'ffa') ov.env = 'ffa'
  brain = createBrain(hello, { world, nav, log: () => {} }, ov)
  for (const o of msgs) if (o.type === 'obs') rec(o)
  finish({})
} else if (cmd === 'match') {
  const seed = +a1, mode = a2
  const { makeContext, playMatch } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch/sim/run.js')
  // CFGJ = JSON patch of config sections (e.g. {"drops":{"times":[30,55,80],"fall_s":15}}): a modified rule set, for mechanism runs only
  let cfgObj = null
  if (process.env.CFGJ) { const { loadConfig } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch/sim/config.js'); cfgObj = loadConfig(); const pj = JSON.parse(process.env.CFGJ); for (const k of Object.keys(pj)) cfgObj[k] = { ...cfgObj[k], ...pj[k] } }
  const ctx = makeContext(cfgObj ? { quiet: true, configObject: cfgObj } : { quiet: true })
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = countNav(new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = rec(obs); a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode }, ctx, { team, opponents: [] })
  finish({ score: r.score, kills: r.kills, alive: r.timeAlive, cause: r.cause, place: r.place })
} else { console.error('usage'); process.exit(2) }
