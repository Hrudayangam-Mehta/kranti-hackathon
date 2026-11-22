// profile.js STREAM.jsonl[.gz] [--no-wrap]
// Runs the real brain (bot/lib, unmodified) in-process over a recorded stream, wraps Nav / World methods with
// timers (unless --no-wrap) and prints, per slow decision, the time spent in each wrapped method; plus totals.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('../../../', import.meta.url).pathname
const { World } = await import(P + 'bot/lib/world.js')
const { Nav } = await import(P + 'bot/lib/nav.js')
const { createBrain } = await import(P + 'bot/lib/brain.js')
const file = process.argv[2]
const wrap = !process.argv.includes('--no-wrap')
let raw = readFileSync(file)
if (file.endsWith('.gz')) raw = gunzipSync(raw)
const msgs = raw.toString('utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
const obsLines = raw.toString('utf8').split('\n').filter((l) => l.includes('"type":"obs"'))
const now = () => performance.now()
const acc = new Map(), tot = new Map()
function wrapProto(proto, names, tag) {
  for (const n of names) {
    const f = proto[n]
    if (typeof f !== 'function') continue
    let depth = 0
    proto[n] = function (...a) {
      if (depth) return f.apply(this, a)
      depth++
      const t = now()
      try { return f.apply(this, a) } finally {
        depth--
        const d = now() - t, k = tag + '.' + n
        const e = acc.get(k) || [0, 0]; e[0] += d; e[1]++; acc.set(k, e)
      }
    }
  }
}
if (wrap) {
  wrapProto(Nav.prototype, ['findPath', 'hopPlan', 'setBody', 'nearestPassable', 'nearestPassableIdx', 'component', 'walkLine', 'pathLength', 'reachable', 'passableAt', 'levelAt', 'wallDistAt'], 'nav')
  wrapProto(World.prototype, ['_cast', 'transmittance', 'surfaceZ', 'ground', 'bodyBlocked', 'ceilingZ', 'prismAt', 'inSolid'], 'world')
}
const t0 = now()
const world = World.loadSync(P + 'kit/arena')
const m = hello.config.mech || {}
const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
const tNav = now()
const brain = createBrain(hello, { world, nav, log: () => {} })
const tBrain = now()
acc.clear()
const rows = []
for (let i = 0; i < obsLines.length; i++) {
  const s = now()
  const o = JSON.parse(obsLines[i])
  const tp = now()
  acc.clear()
  brain.act(o, s + 27.5)
  const e = now()
  const parts = [...acc.entries()].map(([k, v]) => [k, v[0], v[1]])
  for (const [k, ms, n] of parts) { const t = tot.get(k) || [0, 0, 0]; t[0] += ms; t[1] += n; if (ms > t[2]) t[2] = ms; tot.set(k, t) }
  rows.push({ i, parse: tp - s, act: e - tp, parts })
}
const acts = rows.map((r) => r.act).sort((a, b) => a - b)
const q = (p) => acts[Math.min(acts.length - 1, Math.floor(p * acts.length))]
console.log(`load world+nav ${(tNav - t0).toFixed(0)} ms, createBrain (rehearsal) ${(tBrain - tNav).toFixed(0)} ms, decisions ${rows.length}`)
console.log(`act ms: p50 ${q(0.5).toFixed(2)} p90 ${q(0.9).toFixed(2)} p99 ${q(0.99).toFixed(2)} p999 ${q(0.999).toFixed(2)} max ${q(1).toFixed(2)}; parse max ${Math.max(...rows.map((r) => r.parse)).toFixed(2)}`)
console.log('totals (ms, calls, worst single-decision ms):')
for (const [k, v] of [...tot.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 14)) console.log(`  ${k.padEnd(26)} ${v[0].toFixed(1).padStart(8)} ${String(v[1]).padStart(8)} ${v[2].toFixed(2).padStart(7)}`)
console.log('slowest decisions:')
for (const r of [...rows].sort((a, b) => b.act - a.act).slice(0, 12)) {
  const top = r.parts.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, ms, n]) => `${k} ${ms.toFixed(2)}ms x${n}`).join(', ')
  console.log(`  i=${String(r.i).padStart(5)} act ${r.act.toFixed(2).padStart(6)} ms  ${top}`)
}
