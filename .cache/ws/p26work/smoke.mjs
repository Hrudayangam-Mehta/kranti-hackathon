// usage: bun smoke.mjs <botdir> [overrides json] : kit stream, per-decision ms, errors, mode / leg histogram
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [D, ovs] = process.argv.slice(2)
const ov = ovs ? JSON.parse(ovs) : undefined
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const { World } = await import(D + '/lib/world.js'), { Nav } = await import(D + '/lib/nav.js'), { createBrain } = await import(D + '/lib/brain.js')
const world = World.loadSync(P + '/kit/arena')
const t0 = performance.now()
const br = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: (...a) => console.error(...a) }, ov)
console.log('create ms', (performance.now() - t0).toFixed(0))
let worst = 0, wi = -1, sum = 0
const hist = {}
for (let i = 0; i < obs.length; i++) {
  const o = obs[i]
  const a0 = performance.now()
  br.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6)
  const ms = performance.now() - a0
  sum += ms; if (ms > worst) { worst = ms; wi = i }
  const d = br.debugState(); const k = `${d.mode}/${d.leg}` + (d.p26 ? `/${d.p26.phase}` : '')
  hist[k] = (hist[k] || 0) + 1
}
const d = br.debugState()
console.log(`decisions ${obs.length} worst ${worst.toFixed(2)} ms at ${wi} mean ${(sum / obs.length).toFixed(2)} errors ${d.counters.errors} ${JSON.stringify(d.errors)}`)
console.log(JSON.stringify(hist))
const c = d.counters, pc = {}
for (const k of Object.keys(c)) if (k.startsWith('pf')) pc[k] = c[k]
console.log('p26 counters', JSON.stringify(pc), 'p26', JSON.stringify(d.p26))
