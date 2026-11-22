// independent QA recorder: bun qarec.mjs <libDir> <stream.gz> <auto|squad|ffa> <slot|-> <out>   env OVR = overrides JSON
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, file, env, slot, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const { World } = await import(W + '/ref_bot/lib/world.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
if (slot !== '-') hello.slot = +slot
const world = World.loadSync(W + '/kit/arena')
const mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const ov = { fuseMs: 1e9, ...OV, select: { ...(OV.select || {}), ...(env === 'squad' ? { env: 'squad' } : {}) } }
if (env === 'ffa') ov.env = 'ffa'
const brain = createBrain(hello, { world, nav, log: () => {} }, ov)
const B = brain._B
const lines = [], side = []
let maxMs = 0, onN = 0, offCntChange = 0, prevCnt = '', ffaOn = 0, offers = 0, n = 0
const ms = []
for (const o of msgs) if (o.type === 'obs') {
  if (o.offer) offers++
  const t0 = performance.now()
  const a = brain.act(o, t0 + 27.5)
  const d = performance.now() - t0; ms.push(d)
  lines.push(JSON.stringify({ tick: o.tick, ...a }))
  const M = B.meta
  if (M) {
    const c = JSON.stringify(M.cnt)
    if (M.on) onN++
    if (M.on && B.env === 'FFA') ffaOn++
    if (!M.on && c !== prevCnt && n > 0) offCntChange++
    prevCnt = c
    side.push((M.on ? 1 : 0) + ' ' + B.env + ' ' + B.mode)
  } else side.push('- ' + B.env + ' ' + B.mode)
  n++
}
ms.sort((x, y) => x - y)
const st = brain.debugState(), c = st.counters || {}
writeFileSync(out + '.jsonl', lines.join('\n') + '\n')
writeFileSync(out + '.side', side.join('\n') + '\n')
const meta = { lib: lib.split('/').slice(-3).join('/'), env, slot: hello.slot, n, salt: B.P.saltTable, hasMeta: !!B.meta, onN, ffaOn, offCntChange, cnt: B.meta ? B.meta.cnt : null,
  errors: c.errors || 0, fuse: c.fuse || 0, finalEnv: B.env, offers, maxMs: +ms[ms.length - 1].toFixed(2), p99: +ms[Math.floor(n * 0.99)].toFixed(2) }
writeFileSync(out + '.meta.json', JSON.stringify(meta))
console.log(JSON.stringify(meta))
