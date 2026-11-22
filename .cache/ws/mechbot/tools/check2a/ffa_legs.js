// check2a: open-loop replay of the captured FFA streams (env auto, the pass-2a brain alone): which FFA legs / aims occur after the latch
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const world = World.loadSync(P + '/kit/arena')
const tot = {}
for (const s of [1, 2, 3]) {
  const msgs = gunzipSync(readFileSync(`${P}/tools/check2a/streams/ffa_s${s}.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hello = msgs[0], mc = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const br = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  let maxMs = 0
  for (const o of msgs.slice(1)) {
    const t0 = performance.now(); br.act(o, t0 + 27.5); const ms = performance.now() - t0; if (ms > maxMs) maxMs = ms
    const B = br._B
    if (B.env !== 'FFA') continue
    const k = 'leg:' + B.legKind, a = 'aim:' + B.aimKind
    tot[k] = (tot[k] || 0) + 1; tot[a] = (tot[a] || 0) + 1; tot.ffaDecisions = (tot.ffaDecisions || 0) + 1
    if (B.ffaBreak) tot.ffaBreak = (tot.ffaBreak || 0) + 1
    tot['mode:' + B.mode] = (tot['mode:' + B.mode] || 0) + 1
  }
  const st = br.debugState(); tot.errors = (tot.errors || 0) + st.counters.errors; tot.fuse = (tot.fuse || 0) + st.counters.fuse; tot.maxMs = Math.max(tot.maxMs || 0, +maxMs.toFixed(1))
}
console.log(JSON.stringify(tot))
