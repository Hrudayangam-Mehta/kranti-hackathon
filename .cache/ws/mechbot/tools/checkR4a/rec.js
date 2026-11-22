// checkR4a (independent checker): record a brain's actions, per-decision time, path searches and hunt diagnostics.
//   bun rec.js <libDir> stream <file.jsonl.gz> <auto|squad|ffa> <out>   open loop on recorded observations (ffa = forced env)
//   bun rec.js <libDir> squad <seed> - <out>                          closed loop, simulator squad match
//   bun rec.js <libDir> ffa <seed> - <out>                            closed loop, simulator free-for-all
// OVR env: JSON overrides for createBrain. Writes <out>.jsonl (one action per decision, with tick) and <out>.meta.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [lib, cmd, a1, a2, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const lines = [], ms = [], ps = [], hms = [], modes = {}, legs = {}
let latchTick = -1, searches = 0, brain = null, hookMs = 0
let pulseRun = 0, pulseRunMax = 0, pulseStarts = 0, pulseBack = 0, pulseEndT = -99, pulseNotDis = 0, pulseRuns = [], prevPulse = false
let huntOn = 0, seekOk = 0, pulseDec = 0, ffBeforeLatchT = -1, holdN = 0, holdHunt = 0, holdRoam = 0, maxHuntMs = 0
function countNav(nav) {
  const f = nav.findPath
  nav.findPath = function (...a) { searches++; return f.apply(this, a) }
  return nav
}
function wrapHunt(B) {
  const h = B.hunt
  if (!h) return
  for (const k of ['pre', 'post', 'pulseUpdate', 'seekLegs']) {
    const f = h[k]
    h[k] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a) } finally { hookMs += performance.now() - t0 } }
  }
}
let wrapped = false
function rec(obs) {
  searches = 0; hookMs = 0
  if (!wrapped) { wrapHunt(brain._B); wrapped = true }
  const t0 = performance.now()
  const a = brain.act(obs, t0 + 27.5)
  const dt = performance.now() - t0
  ms.push(Math.round(dt * 1000) / 1000); ps.push(searches); hms.push(Math.round(hookMs * 1000) / 1000)
  if (hookMs > maxHuntMs) maxHuntMs = hookMs
  lines.push(JSON.stringify({ tick: obs.tick, ...a }))
  const B = brain._B
  modes[B.mode] = (modes[B.mode] || 0) + 1
  legs[B.legKind] = (legs[B.legKind] || 0) + 1
  if (B.mode === 'HOLD') { holdN++; if (/^hunt/.test(B.legKind || '')) holdHunt++; if (B.legKind === 'roam' || B.legKind === 'hold' || B.legKind === 'idle') holdRoam++ }
  if (B.h50 && B.h50.on) huntOn++
  if (B.h50 && B.h50.seekOk) seekOk++
  if (B.h50Pulse) {
    pulseDec++
    if (!prevPulse) { pulseStarts++; if (B.me.t - pulseEndT < 0.25) pulseBack++; pulseRun = 0 }
    pulseRun++; if (pulseRun > pulseRunMax) pulseRunMax = pulseRun
    if (B.mode !== 'DISENGAGE' && !B.zoneUrgent && !B.doomed) pulseNotDis++
  } else if (prevPulse) { pulseEndT = B.me.t; pulseRuns.push(pulseRun) }
  prevPulse = !!B.h50Pulse
  if (latchTick < 0 && B.env === 'FFA') latchTick = obs.tick
  if (ffBeforeLatchT < 0 && B.env !== 'FFA' && B.foreignDeaths > 0) ffBeforeLatchT = B.me.t
  return a
}
function finish(extra) {
  const h = createHash('sha256'); for (const s of lines) h.update(s + '\n')
  writeFileSync(out + '.jsonl', lines.join('\n') + '\n')
  const st = brain.debugState()
  const sorted = Float64Array.from(ms).sort()
  const c = st.counters || {}
  const meta = { cmd, a1, a2, n: lines.length, hash: h.digest('hex').slice(0, 24), env: brain._B.env, latchTick, modes, legs,
    fuse: c.fuse, errors: c.errors, stuck: c.stuck, maxMs: sorted[sorted.length - 1], p99: sorted[Math.floor(sorted.length * 0.99)],
    maxPath: Math.max(...ps), huntOn, seekOk, pulseDec, holdN, holdHunt, holdRoam, ffBeforeLatchT, maxHuntMs: Math.round(maxHuntMs * 1000) / 1000, pulseStarts, pulseBack, pulseRunMax, pulseNotDis, pulseRuns,
    h50Commits: c.h50Commits || 0, h50Pulses: c.h50Pulses || 0, h50Kills: c.h50Kills || 0, h50Seek: c.h50Seek || 0, ...extra, ms, ps, hms }
  writeFileSync(out + '.meta.json', JSON.stringify(meta))
  const { ms: _m, ps: _p, hms: _h, ...short } = meta
  console.log(JSON.stringify(short))
}
if (cmd === 'stream') {
  const msgs = gunzipSync(readFileSync(a1)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(P + '/bot/lib/world.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const nav = countNav(new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }))
  const ov = { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } }
  if (a2 === 'ffa') ov.env = 'ffa'
  brain = createBrain(hello, { world, nav, log: () => {} }, ov)
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
