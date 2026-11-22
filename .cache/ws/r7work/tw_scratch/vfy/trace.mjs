// Verifier P-read trace (main brain only) for the TW layer.
//   bun trace.mjs <libDir of v538_trace> stream <file.jsonl.gz> <auto|squad|ffa> <out.json>
//   bun trace.mjs <libDir of v538_trace> match <seed> <squad|ffa> <out.json>
// env OVR = overrides JSON for createBrain. Records: keys read while createBrain runs (init) and while act() runs (act);
// every read of an override key that returns the OVERRIDE value while hunt.firewall() is closed (a "leak read"), with its
// decision, posture, foreign deaths, zone next radius, alive count and the reading function; per-decision gate state; the
// first decision after which the gate re-opened (must never happen); and P vs base after each act (must be base when closed).
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, cmd, a1, a2, out] = process.argv.slice(2)
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const st = { phase: 'init', init: new Set(), act: new Set(), leaks: [], nLeak: 0, leakKeys: {}, B: null, ov: null, base: null, dec: -1, T: null }
const same = (a, b) => a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))
let hooked = false
globalThis.__twHook = (P0) => {
  if (hooked) return P0                       // rehearsal brains: unwrapped
  hooked = true
  st.T = P0
  return new Proxy(P0, {
    get(t, k, r) {
      if (typeof k === 'string') {
        if (st.phase === 'init') st.init.add(k)
        else if (st.phase === 'act') {
          st.act.add(k)
          if (st.ov && Object.prototype.hasOwnProperty.call(st.ov, k) && st.B) {
            const B = st.B, z = B.zone
            const open = B.env !== 'FFA' && B.foreignDeaths < t.h50ForeignMax && !(z.known && z.nr <= t.zoneLateR) && !(B.aliveN > 0 && B.aliveN <= t.h50LateAlive)
            const v = t[k]
            if (!open && !same(st.ov[k], st.base[k]) && same(v, st.ov[k])) {
              st.nLeak++; st.leakKeys[k] = (st.leakKeys[k] || 0) + 1
              if (st.leaks.length < 60) {
                const fr = new Error().stack.split('\n').slice(2, 6).map((s) => s.trim().replace(/^at /, '').replace(/\(.*\/lib\//, '(').replace(/:\d+\)$/, ')')).join(' < ')
                st.leaks.push({ dec: st.dec, k, env: B.env, fd: B.foreignDeaths, nr: z.known ? z.nr : null, alive: B.aliveN, by: fr })
              }
            }
          }
        }
      }
      return Reflect.get(t, k, r)
    },
  })
}
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
let brain = null
const gate = [], reopen = [], badP = []
let latchDec = -1, ffDec = -1, firstClose = -1
function fwOpen(B) { const P = st.T, z = B.zone; return B.env !== 'FFA' && B.foreignDeaths < P.h50ForeignMax && !(z.known && z.nr <= P.zoneLateR) && !(B.aliveN > 0 && B.aliveN <= P.h50LateAlive) }
function start(b) {
  brain = b; st.B = b._B
  const P = st.T
  st.ov = P.sqOverrides || null
  st.base = {}
  if (st.ov) for (const k of Object.keys(st.ov)) st.base[k] = P[k]      // before the first act: P holds the base values
  st.phase = 'idle'
}
function rec(obs) {
  st.dec++
  st.phase = 'act'
  const a = brain.act(obs, performance.now() + 1e6)
  st.phase = 'idle'
  const B = brain._B, open = fwOpen(B)
  gate.push(open ? 1 : 0)
  if (firstClose < 0 && !open) firstClose = st.dec
  if (firstClose >= 0 && open && reopen.length < 20) reopen.push(st.dec)
  if (latchDec < 0 && B.env === 'FFA') latchDec = st.dec
  if (ffDec < 0 && B.foreignDeaths > 0) ffDec = st.dec
  if (st.ov && !open) for (const k of Object.keys(st.ov)) if (!same(st.T[k], st.base[k]) && badP.length < 20) badP.push({ dec: st.dec, k })
  return a
}
function finish(extra) {
  const c = brain._B.counters
  const res = { cmd, a1, a2, ovr: OV, n: st.dec + 1, env: brain._B.env, latchDec, firstForeignDec: ffDec, firstCloseDec: firstClose,
    reopenedAt: reopen, pNotBaseWhileClosed: badP, gateOpenShare: gate.reduce((s, x) => s + x, 0) / Math.max(1, gate.length),
    twFlips: c.twFlips || 0, twDecisions: c.twDecisions || 0, errors: c.errors || 0, nLeak: st.nLeak, leakKeys: st.leakKeys, leaks: st.leaks,
    initKeys: [...st.init].sort(), actKeys: [...st.act].sort(), ...extra }
  writeFileSync(out, JSON.stringify(res))
  const { initKeys, actKeys, leaks, ...short } = res
  console.log(JSON.stringify(short))
}
if (cmd === 'stream') {
  const msgs = gunzipSync(readFileSync(a1)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs.find((m) => m.type === 'hello')
  const { World } = await import(W + '/ref_bot/lib/world.js')
  const world = World.loadSync(W + '/kit/arena')
  const mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const ov = { ...OV, select: { ...(OV.select || {}), ...(a2 === 'squad' ? { env: 'squad' } : {}) } }
  if (a2 === 'ffa') ov.env = 'ffa'
  start(createBrain(hello, { world, nav, log: () => {} }, ov))
  for (const o of msgs) if (o.type === 'obs') rec(o)
  finish({})
} else if (cmd === 'match') {
  const { makeContext, playMatch } = await import(W + '/sim/run.js')
  const ctx = makeContext({ quiet: true })
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
      start(createBrain(h, { world: ctx.world, nav, log: () => {} }, OV)); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = rec(obs); a.tick = obs.tick; return a } })
  const r = await playMatch(+a1, { mode: a2 }, ctx, { team, opponents: [] })
  finish({ score: r.score, kills: r.kills })
} else { console.error('usage'); process.exit(2) }
