// In-process run of the worst-case generator with per-primitive attribution of the slowest decisions.
//   taskset -c 0 bun heavy_inproc.js [--ticks 6000] [--no-cubes] [--deadline 27.5]
import { realHello, loadMap, loadBrainModule, pct, rawProblems } from './common.js'
import { makeHeavy } from './gen_heavy.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const hello = realHello()
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const total = Number(arg('--ticks', '6000')), dl = Number(arg('--deadline', '27.5'))
const gen = makeHeavy(hello, world, nav, { seed: Number(arg('--seed', '11')), cubes: args.includes('--no-cubes') ? false : undefined, mechs: Number(arg('--mechs', '15')), period: Number(arg('--period', '250')) })
const acc = {}
function wrap(obj, name) {
  const f = obj[name].bind(obj)
  acc[name] = { n: 0, ms: 0, max: 0 }
  obj[name] = (...a) => { const t0 = performance.now(); const r = f(...a); const dt = performance.now() - t0; const s = acc[name]; s.n++; s.ms += dt; if (dt > s.max) s.max = dt; return r }
}
if (!args.includes('--no-wrap')) { for (const n of ['findPath', 'setBody']) wrap(nav, n); for (const n of ['shotClear', 'canSee']) wrap(world, n); wrap(nav, 'walkLine') }
const logs = []
const brain = createBrain(hello, { world, nav, log: (...a) => logs.push(a.join(' ')) })
const ts = [], top = [], modes = {}, legs = {}, raw = {}
let last = null, maxRays = 0, maxWalk = 0
for (let n = 0; n < total; n++) {
  const obs = JSON.parse(JSON.stringify(gen(n, last)))
  for (const k in acc) { acc[k].n = 0; acc[k].ms = 0; acc[k].max = 0 }
  const t0 = performance.now()
  const a = brain.act(obs, t0 + dl)
  const ms = performance.now() - t0
  last = a
  ts.push(ms)
  const B = brain._B
  modes[B.mode] = (modes[B.mode] || 0) + 1; legs[B.legKind] = (legs[B.legKind] || 0) + 1
  for (const p of rawProblems(a)) { const k = p.replace(/=.*/, ''); raw[k] = (raw[k] || 0) + 1 }
  if (acc.shotClear) { const r = acc.shotClear.n + acc.canSee.n; if (r > maxRays) maxRays = r; if (acc.walkLine.n > maxWalk) maxWalk = acc.walkLine.n }
  if (top.length < 12 || ms > top[top.length - 1].ms) {
    top.push({ ms, n, d: `mode=${B.mode}/${B.legKind} stance=${B.stance} cubes=${obs.self.cubes} hide=${B.hide.state} | ` + Object.entries(acc).filter(([, s]) => s.n).map(([k, s]) => `${k} n=${s.n} ${s.ms.toFixed(2)}ms`).join('; ') })
    top.sort((x, y) => y.ms - x.ms); if (top.length > 12) top.length = 12
  }
}
const st = brain.debugState()
console.log(`decisions ${ts.length}: mean ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(3)} p50 ${pct(ts, 0.5).toFixed(3)} p90 ${pct(ts, 0.9).toFixed(2)} p99 ${pct(ts, 0.99).toFixed(2)} p999 ${pct(ts, 0.999).toFixed(2)} max ${Math.max(...ts).toFixed(1)} ms | >15 ${ts.filter((v) => v > 15).length} >25 ${ts.filter((v) => v > 25).length}`)
console.log('max rays in one decision', maxRays, 'max walkLines', maxWalk)
console.log('modes', JSON.stringify(modes), '\nlegs', JSON.stringify(legs))
console.log('counters', JSON.stringify(st.counters))
console.log('stage errors', JSON.stringify(st.errors), 'raw problems', JSON.stringify(raw))
for (const t of top) console.log(`  #${t.n} ${t.ms.toFixed(1)} ms ${t.d}`)
for (const l of logs.filter((l) => /fail/.test(l)).slice(0, 6)) console.log(l.split('\n').slice(0, 5).join('\n'))
const B = brain._B
console.log('state sizes: tracks', B.tracks.size, 'crates', B.crates.size, 'cubes', B.cubes.size, 'pickups', B.pickups.size, 'badPickups', B.badPickups.size, 'shells', B.shells.size, 'attackers', B.attackers.size, 'ourKills', B.ourKills.size)
