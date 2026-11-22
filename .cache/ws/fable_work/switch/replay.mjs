// open-loop stream replay, per-decision minimum over R repeats (removes scheduler noise). usage: bun replay.mjs <dir> <stream.gz> <mapdir> [R] [answers.out]
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const [dir, stream, mapdir, Rs, ansOut] = process.argv.slice(2)
const R = +(Rs || 3)
const lines = gunzipSync(readFileSync(stream)).toString().split('\n').filter(Boolean)
const { World } = await import(dir + '/lib/world.js'); const { Nav } = await import(dir + '/lib/nav.js'); const mod = await import(dir + '/lib/brain.js')
const hello = JSON.parse(lines[0])
const world = World.loadSync(mapdir, { files: hello.map.files })
const min = [], stg = [], parse = [], info = []
let answers = ''
for (let r = 0; r < R; r++) {
  const m = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
  let cur = null
  for (const fn of ['findPath']) { const f0 = nav[fn]; nav[fn] = function (...a) { const q = performance.now(); const x = f0.apply(this, a); if (cur) { cur.n++; cur.ms += performance.now() - q; cur.exp += nav.lastExpanded || 0 } return x } }
  const brain = mod.createBrain(hello, { world, nav, log: () => {} })
  const B = brain._B
  let k = 0
  for (let i = 1; i < lines.length; i++) {
    const p0 = performance.now(); const obs = JSON.parse(lines[i]); const pm = performance.now() - p0
    if (obs.type !== 'obs') continue
    cur = { n: 0, ms: 0, exp: 0 }
    const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0
    const s1 = JSON.stringify(a)
    if (r === 0) { min.push(ms); parse.push(pm); stg.push({ ...(B.prof || {}) }); info.push({ t: obs.t, m: B.mode, lk: B.legKind, ...cur, bytes: lines[i].length }); answers += s1 + '\n' }
    else { if (ms < min[k]) min[k] = ms; if (pm < parse[k]) parse[k] = pm; if (B.prof) for (const n in B.prof) if (B.prof[n] < stg[k][n]) stg[k][n] = B.prof[n]; if (cur.n && cur.ms < info[k].ms) info[k].ms = cur.ms }
    k++
  }
  if (r === 0) { const g0 = performance.now(); Bun.gc(true); console.log('full sync GC after one pass: ' + (performance.now() - g0).toFixed(1) + ' ms; heapUsed MB ' + (process.memoryUsage().heapUsed / 1e6).toFixed(0) + ' rss MB ' + (process.memoryUsage().rss / 1e6).toFixed(0)) }
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const sum = (a) => a.reduce((x, y) => x + y, 0)
console.log(`decisions ${min.length} (min of ${R}): act p50 ${q(min, .5).toFixed(2)} p90 ${q(min, .9).toFixed(2)} p99 ${q(min, .99).toFixed(2)} p999 ${q(min, .999).toFixed(2)} max ${Math.max(...min).toFixed(2)} mean ${(sum(min) / min.length).toFixed(3)}; JSON.parse p50 ${q(parse, .5).toFixed(2)} max ${Math.max(...parse).toFixed(2)} mean ${(sum(parse) / parse.length).toFixed(3)}; obs bytes p50 ${q(info.map(i => i.bytes), .5)} max ${Math.max(...info.map(i => i.bytes))}`)
if (Object.keys(stg[5] || {}).length) { const names = Object.keys(stg[5]); for (const n of names) { const a = stg.map(s => s[n] || 0); console.log('  ' + n.padEnd(9) + ' mean ' + (sum(a) / a.length).toFixed(3) + ' share ' + (100 * sum(a) / sum(min)).toFixed(0) + '% p99 ' + q(a, .99).toFixed(2) + ' max ' + Math.max(...a).toFixed(2)) } }
const fp = info.filter(i => i.n); console.log(`A* decisions ${fp.length} (${(100 * fp.length / info.length).toFixed(1)}%), ms total ${sum(fp.map(i => i.ms)).toFixed(0)} of ${sum(min).toFixed(0)}, exp max ${Math.max(0, ...fp.map(i => i.exp))}, ms max ${Math.max(0, ...fp.map(i => i.ms)).toFixed(2)}`)
const top = min.map((ms, k) => ({ ms, k })).sort((a, b) => b.ms - a.ms).slice(0, 8)
for (const t of top) console.log('  slow', info[t.k].t, t.ms.toFixed(2), info[t.k].m + '/' + info[t.k].lk, 'A*', info[t.k].n, 'exp', info[t.k].exp, Object.entries(stg[t.k]).filter(e => e[1] > 0.5).map(e => e[0] + ':' + e[1].toFixed(1)).join(' '))
if (ansOut) writeFileSync(ansOut, answers)
