// Red-team tool: our own gun shots and hits on mechs by 25 m range band over simulator matches (brain's gunStat),
// plus beams taken with / without a usable hide cell and warning time from the charging flag.
import { makeContext, playMatch } from './snap/sim/run.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const n = parseInt(process.argv[2] || '48', 10)
const ctx = makeContext({ quiet: true })
let nav = null
const shots = new Float64Array(12), hits = new Float64Array(12)
let beams = 0, beamDmg = 0, beamsWarned = 0, beamsHideNear = 0, beamsHide15 = 0, totalDmg = 0, warnSum = 0, firstMagFar = 0, matches = 0, firstMagShots = 0, firstMagHits = 0
for (let seed = 1; seed <= n; seed++) {
  let brain = null
  const chargeSince = new Map()
  let firstMag = null
  const team = () => ({
    name: 'ours', hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, { planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const B = brain._B
      const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick
      for (const m of obs.mechs || []) { if (m.kind !== 'mech') continue; if (m.charging) { if (!chargeSince.has(m.id)) chargeSince.set(m.id, obs.t) } else if (chargeSince.has(m.id) && obs.t - chargeSince.get(m.id) > 0.25) { chargeSince.set(m.id, -obs.t) } }
      for (const e of obs.events || []) {
        if (e.type !== 'damaged') continue
        totalDmg += e.amount
        if (e.weapon === 'laser') {
          beams++; beamDmg += e.amount
          const cs = chargeSince.get(e.by)
          // the flag was listed for at least 0.3 s before the hit (cs > 0 = still charging at the last obs, cs < 0 = released at -cs)
          let warn = 0
          if (cs !== undefined) warn = cs > 0 ? obs.t - cs : 0
          if (warn >= 0.3) { beamsWarned++; warnSum += warn }
          if (B.hide.state === 'found' && B.hide.dist <= 9) beamsHideNear++
          if (B.hide.state === 'found' && B.hide.dist <= 15) beamsHide15++
          chargeSince.delete(e.by)
        }
      }
      for (const [id, v] of chargeSince) if (v < 0 && obs.t + v > 0.5) chargeSince.delete(id)
      // first magazine fired at a mech: range of its first shot
      const g = B.me.gun
      if (!firstMag && g && B.target && !B.target.npc && a.fire[g.slot]) firstMag = { d: B.target.dist, hp0: B.target.hp, t: obs.t, id: B.target.id }
      if (firstMag && !firstMag.done && obs.t - firstMag.t > 3.2) { firstMag.done = true; const tr = B.tracks.get(firstMag.id); if (tr) { firstMagShots += 12; firstMagHits += Math.max(0, Math.round((firstMag.hp0 - tr.hp) / 45)) } }
      return a
    },
  })
  await playMatch(seed, { mode: 'squad', keep: false }, ctx, { team, opponents: [] })
  const d = brain._B.gunStat.dump()
  for (let k = 0; k < 12; k++) { shots[k] += d.shots[k]; hits[k] += d.hits[k] }
  matches++
  if (firstMag && firstMag.d > 0.55 * 252) firstMagFar++
}
console.log('our gun on mechs by range band:')
for (let k = 0; k < 10; k++) if (shots[k] > 0) console.log(`  ${k * 25}-${k * 25 + 25} m: shots ${shots[k]} hits ${hits[k]} rate ${(hits[k] / shots[k]).toFixed(2)}`)
const far = [...shots].slice(6).reduce((a, b) => a + b, 0) + shots[5] * (150 - 139) / 25, tot = [...shots].reduce((a, b) => a + b, 0)
console.log(JSON.stringify({ matches, shotsPerMatch: +(tot / matches).toFixed(1), shareBeyond139m: +(far / tot).toFixed(3), hitRateBeyond150: +([...hits].slice(6).reduce((a, b) => a + b, 0) / Math.max(1, [...shots].slice(6).reduce((a, b) => a + b, 0))).toFixed(2), firstMagazineOpenedBeyond139m: firstMagFar, firstMagHitRate: +(firstMagHits / Math.max(1, firstMagShots)).toFixed(2), beamsTaken: beams, beamDmgShare: +(beamDmg / totalDmg).toFixed(3), beamsWithFlagWarning03s: beamsWarned, meanWarning_s: +(warnSum / Math.max(1, beamsWarned)).toFixed(2), beamsWithHideWithin9m: beamsHideNear, beamsWithHideWithin15m: beamsHide15 }))
process.exit(0)
