// R4a T17: decision time and A* count per decision of bot/lib on recorded streams (env squad forced, so the hunt is open
// until a foreign death), one core, Dockerfile engine settings.  bun timing.js <kit|long4800|long11|long23p|ffaN> [reps]; OVR = overrides
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [src, reps0] = process.argv.slice(2), reps = +(reps0 || 2)
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const files = { kit: P + '/kit/check/stream.jsonl.gz', long4800: P + '/tools/release_gate/long4800.jsonl.gz', long11: P + '/tools/pass2a/out/long11.jsonl.gz', long23p: P + '/tools/pass2a/out/long23p.jsonl.gz' }
const file = files[src] || `${P}/tools/check2a/streams/ffa_s${src.slice(3)}.jsonl.gz`
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((m) => JSON.parse(m))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ts = []
let maxPlans = 0, open = 0
for (let r = 0; r < reps; r++) {
  const br = createBrain(hello, { world, nav, log: () => {} }, { ...OV, select: { ...(OV.select || {}), env: 'squad' } })
  for (const o of obs) {
    const p0 = br._B.counters.plans, t0 = performance.now(); br.act(JSON.parse(JSON.stringify(o)), t0 + 27.5); ts.push(performance.now() - t0)
    maxPlans = Math.max(maxPlans, br._B.counters.plans - p0); if (br._B.h50.on || br._B.h50.seekOk) open++
  }
}
ts.sort((a, b) => a - b)
const q = (p) => ts[Math.min(ts.length - 1, Math.floor(p * ts.length))]
console.log(JSON.stringify({ src, sel: OV.select || {}, n: ts.length, huntOpen: open, mean: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(3), p50: +q(0.5).toFixed(2), p99: +q(0.99).toFixed(2), max: +ts[ts.length - 1].toFixed(2), maxPlans }))
