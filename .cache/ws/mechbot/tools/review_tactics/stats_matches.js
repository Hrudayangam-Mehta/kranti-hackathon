// Review tool: aggregate behaviour statistics of our brain over N simulator matches.
//   bun tools/review_tactics/stats_matches.js --seed 1 --matches 40 [--overrides '{...}']
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '20'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const agg = { ticks: 0, mode: {}, leg: {}, stance: {}, kills: 0, score: 0, alive: 0, modeSw: 0, tgtSw: 0, stillExposed: 0, exposed: 0, stillLS: 0, lsTicks: 0,
  idleStart: 0, shots: 0, shotGapSum: 0, shotGapN: 0, boostTicks: 0, fireWhileHeal: 0, healTicks: 0, ffaLatch: 0, outZone: 0, laserMatches: 0, deaths: {}, firstDmgT: 0, firstDmgN: 0,
  exposedNoFire: 0, exposedReady: 0, hideChases: 0, rear: 0, dmgEv: 0, flap: 0 }
const inc = (o, k, v = 1) => { o[k] = (o[k] || 0) + v }
for (let s = seed0; s < seed0 + n; s++) {
  const { rows, rec, brainLogs } = await runTrace(s, { overrides })
  agg.kills += rec.kills; agg.score += rec.score; agg.alive += rec.timeAlive
  inc(agg.deaths, rec.alive ? 'alive' : rec.cause)
  if (brainLogs.some((l) => l.includes('FFA latched'))) agg.ffaLatch++
  if (rec.loadout && rec.loadout.includes('laser')) agg.laserMatches++
  let prev = null, lastShotT = -1, prevAmmo = -1, firstDmg = -1, lastSwitchT = -9
  for (const r of rows) {
    agg.ticks++
    inc(agg.mode, r.mode); inc(agg.leg, r.leg || '-'); inc(agg.stance, r.st)
    if (prev && prev.mode !== r.mode) { agg.modeSw++; if (r.t - lastSwitchT < 1.05) agg.flap++; lastSwitchT = r.t }
    if (prev && prev.tgt !== r.tgt && r.tgt >= 0 && prev.tgt >= 0) agg.tgtSw++
    const exposed = r.losInAge <= 0.15
    if (exposed) { agg.exposed++; if (r.spd < 2) agg.stillExposed++ }
    if (r.st === 'LAST-STAND') { agg.lsTicks++; if (r.spd < 2) agg.stillLS++ }
    if (r.boostB) agg.boostTicks++
    if (r.mode === 'HEAL') { agg.healTicks++; if (r.f0 || r.f1) agg.fireWhileHeal++ }
    if (!r.inZone) agg.outZone++
    if (prevAmmo >= 0 && r.ammo >= 0 && r.ammo < prevAmmo) { agg.shots += prevAmmo - r.ammo; if (lastShotT >= 0 && r.t - lastShotT < 0.45) { agg.shotGapSum += r.t - lastShotT; agg.shotGapN++ } lastShotT = r.t }
    prevAmmo = r.ammo
    for (const e of r.evs) if (e.type === 'damaged' && e.by !== null) { agg.dmgEv++; if (e.rear) agg.rear++; if (firstDmg < 0) firstDmg = r.t }
    if (firstDmg < 0 && r.nm === 0 && r.spd < 0.5 && r.mode === 'HOLD') agg.idleStart++
    prev = r
  }
  if (firstDmg >= 0) { agg.firstDmgT += firstDmg; agg.firstDmgN++ }
}
const pct = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (100 * v / agg.ticks).toFixed(1) + '%']))
console.log(JSON.stringify({
  matches: n, meanScore: (agg.score / n).toFixed(2), meanKills: (agg.kills / n).toFixed(2), meanAlive: (agg.alive / n).toFixed(1), deaths: agg.deaths,
  mode: pct(agg.mode), leg: pct(agg.leg), stance: pct(agg.stance),
  modeSwitchesPerMin: (agg.modeSw / (agg.ticks / 600)).toFixed(1), flapsUnder1s: agg.flap, targetSwitchesPerMin: (agg.tgtSw / (agg.ticks / 600)).toFixed(1),
  exposedFrac: (agg.exposed / agg.ticks).toFixed(3), stillWhileExposed: (agg.stillExposed / Math.max(1, agg.exposed)).toFixed(3),
  lastStandFrac: (agg.lsTicks / agg.ticks).toFixed(3), stillInLastStand: (agg.stillLS / Math.max(1, agg.lsTicks)).toFixed(3),
  idleStandingBeforeFirstContact_s: (agg.idleStart * 0.1 / n).toFixed(1), meanFirstDamageT: (agg.firstDmgT / Math.max(1, agg.firstDmgN)).toFixed(1),
  shots: agg.shots, meanShotGap: (agg.shotGapSum / Math.max(1, agg.shotGapN)).toFixed(3), boostFrac: (agg.boostTicks / agg.ticks).toFixed(3),
  healTicks: agg.healTicks, fireWhileHeal: agg.fireWhileHeal, ffaLatches: agg.ffaLatch, outZoneTicks: agg.outZone, laserMatches: agg.laserMatches,
  rearHitFrac: (agg.rear / Math.max(1, agg.dmgEv)).toFixed(3),
}, null, 1))
process.exit(0)
