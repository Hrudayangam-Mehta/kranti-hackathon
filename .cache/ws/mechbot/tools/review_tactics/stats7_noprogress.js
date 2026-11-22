// Review tool: goal-directed walking without progress. Over N squad matches, 5 s windows in a path-following leg
// (hold / zone / loot / hide / pull / drop / killdrop / escape / regain) in which the legs were commanded on >= 80% of
// the decisions, the goal stayed within 6 m, and the mech ended less than 6 m from where it started and no closer
// than 3 m to the goal than before. Also counts reversals of the commanded direction inside those windows.
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '101'), 10), n = parseInt(arg('matches', '60'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const LEGS = new Set(['hold', 'zone', 'loot', 'hide', 'pull', 'drop', 'killdrop', 'escape', 'regain'])
let windows = 0, matches = 0, ticks = 0, byLeg = {}, list = []
for (let s = seed0; s < seed0 + n; s++) {
  const { rows } = await runTrace(s, { overrides })
  ticks += rows.length
  let any = false
  for (let i = 0; i + 50 < rows.length; i += 50) {
    const a = rows[i], b = rows[i + 50]
    if (!a.goal || !b.goal || Math.hypot(a.goal[0] - b.goal[0], a.goal[1] - b.goal[1]) > 6) continue
    let cmd = 0, ok = true, rev = 0, prev = null
    for (let k = i; k < i + 50; k++) {
      const r = rows[k]
      if (!LEGS.has(r.leg)) { ok = false; break }
      if (Math.hypot(r.mx, r.my) > 0.4) { cmd++; if (prev && r.mx * prev.mx + r.my * prev.my < -0.3 * Math.hypot(r.mx, r.my) * Math.hypot(prev.mx, prev.my)) rev++; prev = r }
    }
    if (!ok || cmd < 40) continue
    const moved = Math.hypot(b.x - a.x, b.y - a.y)
    const dA = Math.hypot(a.goal[0] - a.x, a.goal[1] - a.y), dB = Math.hypot(b.goal[0] - b.x, b.goal[1] - b.y)
    if (moved < 6 && dB > dA - 3 && dA > 8) {
      windows++; any = true
      byLeg[a.leg] = (byLeg[a.leg] || 0) + 1
      if (list.length < 12) list.push(`seed ${s} t=${a.t.toFixed(0)}-${b.t.toFixed(0)} ${a.mode}/${a.leg} goal ${dA.toFixed(0)} m away, moved ${moved.toFixed(1)} m, ${rev} reversals of the commanded direction`)
    }
  }
  if (any) matches++
}
console.log(JSON.stringify({ matches: n, 'matches with at least one 5 s no-progress window': matches, 'no-progress windows (5 s each)': windows, 'seconds per match': (windows * 5 / n).toFixed(1), byLeg }, null, 1))
for (const l of list) console.log('  ' + l)
process.exit(0)
