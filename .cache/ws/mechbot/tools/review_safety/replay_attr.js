// Replays a recorded obs stream (hello + obs lines) through a fresh brain and attributes the time of slow ticks
// to the nav / world primitives (wrappers; the brain itself is not modified).
//   bun replay_attr.js <stream.jsonl> [--no-warmup] [--thresh 8]
import { readFileSync } from 'node:fs'
import { loadMap, loadBrainModule, pct } from './common.js'
const file = process.argv[2]
const thresh = Number((process.argv.find((a) => a.startsWith('--thresh=')) || '--thresh=8').slice(9))
const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0]
const { world, nav } = await loadMap({ ...hello, map: { dir: (await import('./common.js')).ARENA } })
const { createBrain } = await loadBrainModule()
const acc = {}
function wrap(obj, name) {
  const f = obj[name].bind(obj)
  acc[name] = { n: 0, ms: 0, max: 0 }
  obj[name] = (...a) => { const t0 = performance.now(); const r = f(...a); const dt = performance.now() - t0; const s = acc[name]; s.n++; s.ms += dt; if (dt > s.max) s.max = dt; return r }
}
for (const n of ['findPath', 'setBody', 'walkLine', 'nearestPassable', 'nearestPassableIdx', 'component']) wrap(nav, n)
for (const n of ['shotClear', 'canSee']) wrap(world, n)
const logs = []
const brain = createBrain(hello, { world, nav, log: (...a) => logs.push(a.join(' ')) }, process.argv.includes('--no-warmup') ? { warmup: false } : undefined)
for (const k in acc) acc[k] = { n: 0, ms: 0, max: 0 }
const ts = []
let prev = null
for (let i = 1; i < lines.length; i++) {
  const obs = lines[i]
  if (obs.type !== 'obs') continue
  for (const k in acc) { acc[k].n = 0; acc[k].ms = 0; acc[k].max = 0 }
  const t0 = performance.now()
  brain.act(obs, t0 + 27.5)
  const ms = performance.now() - t0
  ts.push(ms)
  if (ms > thresh) {
    const B = brain._B
    const parts = Object.entries(acc).filter(([, s]) => s.n).map(([k, s]) => `${k} n=${s.n} ${s.ms.toFixed(2)}ms(max ${s.max.toFixed(2)})`).join('; ')
    console.log(`tick ${obs.tick} t=${obs.t} ${ms.toFixed(1)} ms mode=${B.mode}/${B.legKind} cubes=${obs.self.cubes} mechs=${obs.mechs.length} hide=${B.hide.state} | ${parts}`)
  }
}
console.log(`decisions ${ts.length}: mean ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(3)} p50 ${pct(ts, 0.5).toFixed(3)} p99 ${pct(ts, 0.99).toFixed(2)} max ${Math.max(...ts).toFixed(1)} ms`)
console.log('errors', JSON.stringify(brain.debugState().errors), logs.filter((l) => /fail/.test(l)).slice(0, 3))
