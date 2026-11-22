// Verifier (pass 1). Closed-loop determinism of the brain in one simulator match, or open-loop replay of a stream.
//   bun determinism.js match --seed 1 [--mode squad|ffa] [--salt X] [--warp K] [--stallEvery N --stallMs M]
//                            [--warmup 0|1] [--dump file] [--record file] [--select k=v] [--maxDec N]
//   bun determinism.js stream --file obs.jsonl|kit [--salt X] [--warp K] [--stallEvery N --stallMs M] [--warmup 0|1] [--dump file]
// --warp K: performance.now runs K times faster (every decision looks K times slower to the brain).
// --stallEvery N --stallMs M: every N-th decision, the clock jumps by M ms after the brain's first clock read (a stall).
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const argv = process.argv.slice(2)
const cmd = argv[0]
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d }
const seed = +opt('seed', 1), mode = opt('mode', 'squad'), salt = opt('salt', null), warp = +opt('warp', 1)
const stallEvery = +opt('stallEvery', 0), stallMs = +opt('stallMs', 0), warmup = opt('warmup', '1') !== '0'
const dump = opt('dump', null), record = opt('record', null), maxDec = +opt('maxDec', 1e9)
const select = {}; for (let i = 0; i < argv.length; i++) if (argv[i] === '--select') { const [k, v] = argv[i + 1].split('='); select[k] = v }

// clock control
const realNow = performance.now.bind(performance)
const T0 = realNow()
let offset = 0, pendingStall = 0, callsInAct = 0, inAct = false
performance.now = () => {
  const r = T0 + (realNow() - T0) * warp + offset
  if (inAct) { callsInAct++; if (pendingStall && callsInAct >= 2) { offset += pendingStall; pendingStall = 0; return r + 0 } }
  return r
}
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const overrides = { warmup }
if (salt !== null) overrides.salt = isNaN(+salt) ? salt : +salt
if (Object.keys(select).length) overrides.select = select

const actions = []; const obsRec = []
let decN = 0
function wrapAct(brain, obs) {
  decN++
  if (stallEvery > 0 && decN % stallEvery === 0) pendingStall = stallMs
  inAct = true; callsInAct = 0
  const a = brain.act(obs, performance.now() + 27.5)
  inAct = false; pendingStall = 0
  const s = JSON.stringify({ tick: obs.tick, ...a })
  actions.push(s)
  if (record) obsRec.push(JSON.stringify(obs))
  return a
}
function finish(extra) {
  const h = createHash('sha256'); for (const s of actions) h.update(s + '\n')
  if (dump) writeFileSync(dump, actions.join('\n') + '\n')
  if (record) writeFileSync(record, obsRec.join('\n') + '\n')
  console.log(JSON.stringify({ cmd, seed, mode, salt, warp, stallEvery, stallMs, warmup, n: actions.length, hash: h.digest('hex').slice(0, 16), ...extra }))
}

if (cmd === 'match') {
  const { makeContext, playMatch, resolveBot } = await import(P + '/sim/run.js')
  const mapDir = opt('mapDir', null), opps = opt('opponents', '')
  const ctx = makeContext({ quiet: true, ...(mapDir ? { mapDir } : {}), logDir: opt('logDir', null) })
  const opponents = []
  for (const sp of opps.split(',').map((q) => q.trim()).filter(Boolean)) opponents.push(await resolveBot(sp, ctx))
  let brain = null, helloMsg = null
  const team = () => ({ name: 'ours',
    hello(h) { helloMsg = h; const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, overrides); if (record) obsRec.push(JSON.stringify(h)); return { type: 'ready', name: 'ours' } },
    act(obs) { if (actions.length >= maxDec) return { tick: obs.tick, move: [0, 0], boost: false, aim: [0, 0], fire: [false, false] }; const a = wrapAct(brain, obs); a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode, full: argv.includes('--full') }, ctx, { team, opponents })
  const st = brain.debugState()
  finish({ score: r.score, kills: r.kills, alive: r.timeAlive, cause: r.cause, deadOthers: r.deadOthers, matchT: r.matchT, wallMs: r.wallMs, fuse: st.counters.fuse, errors: st.counters.errors, env: st.env, latchT: st.ffaLatchT })
} else if (cmd === 'stream') {
  const file = opt('file', 'kit')
  let lines
  if (file === 'kit') lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  else lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = lines.find((l) => l.type === 'hello')
  const { World } = await import(P + '/bot/lib/world.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const brain = createBrain(hello, { world, nav, log: () => {} }, overrides)
  for (const o of lines) if (o.type === 'obs') wrapAct(brain, o)
  const st = brain.debugState()
  finish({ fuse: st.counters.fuse, errors: st.counters.errors, env: st.env })
}
