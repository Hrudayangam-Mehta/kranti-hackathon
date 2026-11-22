// Review tool: every stretch the brain spends outside the zone in N squad matches: when, how long, in which mode / leg,
// what the zone margin was just before, and the zone damage taken.
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '101'), 10), n = parseInt(arg('matches', '60'), 10)
let total = 0, dmg = 0, episodes = 0, matches = 0
const byLeg = {}
for (let s = seed0; s < seed0 + n; s++) {
  const { rows } = await runTrace(s, {})
  let ep = null, any = false
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    for (const e of r.evs) if (e.type === 'damaged' && e.weapon === 'zone') dmg += e.amount
    if (!r.inZone) {
      total++; any = true
      if (!ep) { const b = rows[Math.max(0, i - 10)]; ep = { seed: s, t0: r.t, n: 0, before: `${b.mode}/${b.leg} zm=${b.zm} tgt=${b.tgt} d=${b.td}`, zone: `r=${r.zone.radius.toFixed(0)}->${r.zone.next_radius} shrink ${r.zone.shrink_start}-${r.zone.shrink_end}` } ; episodes++ }
      ep.n++
      byLeg[r.mode + '/' + r.leg] = (byLeg[r.mode + '/' + r.leg] || 0) + 1
    } else if (ep) { if (ep.n >= 5) console.log(`seed ${ep.seed} t=${ep.t0} outside for ${(ep.n / 10).toFixed(1)} s; 1 s before: ${ep.before}; zone ${ep.zone}`); ep = null }
  }
  if (ep && ep.n >= 5) console.log(`seed ${ep.seed} t=${ep.t0} outside for ${(ep.n / 10).toFixed(1)} s (until death); 1 s before: ${ep.before}; zone ${ep.zone}`)
  if (any) matches++
}
console.log(JSON.stringify({ matches: n, matchesWithTimeOutside: matches, decisionsOutside: total, episodes, zoneDamage: Math.round(dmg), byLeg }))
process.exit(0)
