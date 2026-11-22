// checkR4a: profile chosen decisions of one stream (A* time, hunt hook time, mode, leg, target) for the V4 snapshot and H.
//   bun prof.js <stream.jsonl.gz> <squad|auto> <i0> <i1>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const SN = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_r3a2/lib'
const [file, env, i0, i1] = process.argv.slice(2)
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const { World } = await import(P + '/bot/lib/world.js'); const { Nav } = await import(P + '/bot/lib/nav.js')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
async function run(lib, sel) {
  const { createBrain } = await import(lib + '/brain.js')
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  let aT = 0, aN = 0, aExp = 0
  const f = nav.findPath; nav.findPath = function (...a) { const t0 = performance.now(); try { const r = f.apply(this, a); aExp += (r && r.expanded) || 0; return r } finally { aT += performance.now() - t0; aN++ } }
  const br = createBrain(hello, { world, nav, log: () => {} }, { select: { ...sel, ...(env === 'squad' ? { env: 'squad' } : {}) } })
  const rows = []
  for (let i = 0; i < obs.length; i++) {
    aT = 0; aN = 0; aExp = 0
    const o = JSON.parse(JSON.stringify(obs[i])), t0 = performance.now()
    br.act(o, t0 + 27.5)
    const dt = performance.now() - t0, B = br._B
    if (i >= +i0 && i <= +i1) rows.push({ i, t: B.me.t, ms: dt, aT, aN, aExp, mode: B.mode, leg: B.legKind, tgt: B.target ? B.target.id : -1, hide: B.hide.state, on: B.h50 ? B.h50.on : '-', commit: B.h50 && B.h50.commit ? B.h50.commit.id : -1 })
  }
  return rows
}
const S = [], H = []
for (let r = 0; r < 3; r++) { S.push(await run(SN, { retreat: 'd3' })); H.push(await run(P + '/bot/lib', { retreat: 'd3', hunt: 'h50' })) }
for (let k = 0; k < S[0].length; k++) {
  const s = S.map((x) => x[k]).sort((a, b) => a.ms - b.ms)[0], h = H.map((x) => x[k]).sort((a, b) => a.ms - b.ms)[0]
  if (h.ms - s.ms > 1.5 || k === 0) console.log(`#${s.i} t ${s.t.toFixed(1)} | V4 ${s.ms.toFixed(2)} ms A* ${s.aN} ${s.aT.toFixed(2)} ms ${s.mode}/${s.leg} tgt ${s.tgt} hide ${s.hide} | H ${h.ms.toFixed(2)} ms A* ${h.aN} ${h.aT.toFixed(2)} ms (${h.aExp} exp) ${h.mode}/${h.leg} tgt ${h.tgt} commit ${h.commit} hide ${h.hide} | extra ${(h.ms - s.ms).toFixed(2)} non-A* extra ${((h.ms - h.aT) - (s.ms - s.aT)).toFixed(2)}`)
}
