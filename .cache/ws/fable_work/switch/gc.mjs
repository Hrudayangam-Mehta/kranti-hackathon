import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { memoryUsage } from 'bun:jsc'
const [dir, stream, mapdir, mode] = process.argv.slice(2)
const lines = gunzipSync(readFileSync(stream)).toString().split('\n').filter(Boolean)
const { World } = await import(dir + '/lib/world.js'); const { Nav } = await import(dir + '/lib/nav.js'); const mod = await import(dir + '/lib/brain.js')
const hello = JSON.parse(lines[0]); const world = World.loadSync(mapdir, { files: hello.map.files }); const m = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
const brain = mod.createBrain(hello, { world, nav, log: () => {} })
let c0 = performance.now(); for (let i = 0; i < 1000; i++) memoryUsage(); console.log('memoryUsage() cost ms', ((performance.now() - c0) / 1000).toFixed(4))
const gcs = [], all = [], idle = []
let prev = memoryUsage().current, n = 0
for (let i = 1; i < lines.length; i++) {
  const t0 = performance.now(); const obs = JSON.parse(lines[i]); if (obs.type !== 'obs') continue
  const a = brain.act(obs, t0 + 27.5); JSON.stringify(a); const ms = performance.now() - t0
  const cur = memoryUsage().current
  all.push(ms); if (cur < prev - 2e5) gcs.push({ ms, drop: (prev - cur) / 1e6, k: n })
  prev = cur; n++
  if (mode === 'idle' && n % 20 === 0) { const g0 = performance.now(); Bun.gc(true); idle.push(performance.now() - g0); prev = memoryUsage().current }
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0 }
console.log(mode || 'plain', 'decisions', n, 'p50', q(all, .5).toFixed(2), 'p99', q(all, .99).toFixed(2), 'max', Math.max(...all).toFixed(1), '| in-decision heap drops', gcs.length, 'every', (n / Math.max(1, gcs.length)).toFixed(0), 'decisions; their wall ms p10/p50/p90/max', q(gcs.map(g => g.ms), .1).toFixed(1), q(gcs.map(g => g.ms), .5).toFixed(1), q(gcs.map(g => g.ms), .9).toFixed(1), Math.max(0, ...gcs.map(g => g.ms)).toFixed(1), 'drop MB p50', q(gcs.map(g => g.drop), .5).toFixed(1), 'heap MB', (prev / 1e6).toFixed(0))
if (idle.length) console.log(' idle Bun.gc(true) every 20 decisions: n', idle.length, 'ms p10/p50/p90/max', q(idle, .1).toFixed(1), q(idle, .5).toFixed(1), q(idle, .9).toFixed(1), Math.max(...idle).toFixed(1))
