// F5 (1.14): why do hide-leg episodes end before reaching the cell? Per episode: start distance, best distance,
// how it ended (next mode / leg, cell restart), duration. Usage: bun f5_hide_why.js --seed 1 --matches 20 [--overrides '{}']
import { runTrace } from './lib_trace2.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '20'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const ends = {}, eps = [], HR = {}, DS = {}, HD = []
const R = { spans: 0, reached: 0, broke: 0, neither: 0, died: 0, restarts: 0 }
for (let s = seed0; s < seed0 + n; s++) {
  const hook = (row, obs, a, B) => { row.losing = B.losing; row.hp0 = B.hide.state; row.dead = false }
  const { rows, brain } = await runTrace(s, { overrides, hook })
  for (const [k, v] of Object.entries(brain._B.counters)) if (k.startsWith('hr_')) HR[k] = (HR[k] || 0) + v
  let ep = null, sp = null
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const ret = r.mode === 'DISENGAGE' || r.mode === 'HEAL'
    if (r.mode === 'DISENGAGE') { const k = r.hide + '/' + r.leg; DS[k] = (DS[k] || 0) + 1; if (r.leg === 'hide') HD.push(r.hd) }
    if (ret) {
      if (!sp) { sp = { reached: false, broke: false }; R.spans++ }
      if (r.leg === 'hide' && r.hd < 3) sp.reached = true
      if (r.losInAge >= 1.5) sp.broke = true
      if (r.hide === 'run') sp.run = true
    } else if (sp) { if (sp.reached) R.reached++; else if (sp.broke) R.broke++; else R.neither++; sp = null }
    if (r.leg === 'hide') {
      if (!ep) ep = { s, t0: r.t, d0: r.hd, best: r.hd, hx: r.hx, hy: r.hy, jumps: 0, mode0: r.mode, hp0: r.hpf }
      if (Math.hypot(r.hx - ep.hx, r.hy - ep.hy) > 6) { ep.jumps++; ep.hx = r.hx; ep.hy = r.hy }
      ep.best = Math.min(ep.best, r.hd); ep.t1 = r.t
      if (r.hd < 3) ep.arrived = true
    } else if (ep) {
      const why = ep.arrived ? 'arrived' : `${r.mode}/${r.leg}/hide=${r.hide}${r.losing ? '/L' : ''}`
      ep.why = why; eps.push(ep); ends[why] = (ends[why] || 0) + 1; ep = null
    }
  }
  if (sp) { R.died++; if (sp.reached) R.reached++; else if (sp.broke) R.broke++; else R.neither++ }
  if (ep) { ep.why = 'match end'; eps.push(ep); ends['match end'] = (ends['match end'] || 0) + 1 }
}
HD.sort((a, b) => a - b); console.log('DISENGAGE decisions by hide state / leg:', JSON.stringify(DS), ' hide-leg cell distance quartiles', [0.25, 0.5, 0.75].map((q) => HD[Math.floor(q * HD.length)]).join('/'))
console.log('hide restarts:', JSON.stringify(HR))
console.log('retreat spans (DISENGAGE/HEAL):', JSON.stringify(R))
const arr = eps.filter((e) => e.arrived).length
console.log(`episodes ${eps.length}, arrived ${arr} (${(100 * arr / Math.max(1, eps.length)).toFixed(0)}%)`)
console.log(Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${v}  ${k}`).join('\n'))
const dur = eps.filter((e) => !e.arrived).map((e) => (e.t1 - e.t0 + 0.1))
dur.sort((a, b) => a - b)
console.log('not-arrived durations s (quartiles):', [0.25, 0.5, 0.75].map((q) => dur[Math.floor(q * dur.length)]?.toFixed(1)).join(' / '), ' start dist (median):', eps.filter((e) => !e.arrived).map((e) => e.d0).sort((a, b) => a - b)[Math.floor(dur.length / 2)])
for (const e of eps.slice(0, 40)) console.log(`  seed ${e.s} t ${e.t0.toFixed(1)}-${e.t1.toFixed(1)} ${e.mode0} hp ${e.hp0.toFixed(2)} d0 ${e.d0} best ${e.best} jumps ${e.jumps} -> ${e.why}`)
