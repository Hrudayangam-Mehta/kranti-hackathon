// Review tool: economy and retreat-geometry counters over N simulator squad matches.
//   bun tools/review_tactics/stats3.js --seed 1 --matches 60
import { runTrace, getCtx } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '40'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const { nav } = getCtx()
const S = { ticks: 0, score: 0, laserChance: 0, laserChanceTaken: 0, laserEver: 0, laserChanceS: 0, w2Chance: 0, w2Ever: 0, emptySlotEnd: 0,
  hideExposed: 0, hideToward: 0, hideTowardNear: 0, retreatDecisions: 0, closer: 0, episodes: 0, epCloser: 0,
  kills: 0, killNearCubeSeen: 0, cubeKnownNear: 0, cubeKnownNearTicks: 0, cubesEnd: 0, upgradesEnd: 0, cubeTicks40: 0, fightTicks: 0,
  holdStillQuiet: 0, quiet: 0, healStill: 0 }
for (let s = seed0; s < seed0 + n; s++) {
  let chanceT = 0, got = false, w2chance = false, ep = null
  const hook = (row, obs, a, B) => {
    const me = B.me
    let lp = Infinity, wp = Infinity
    for (const p of B.pickups.values()) {
      if (Math.abs(p.z - nav.levelAt(p.x, p.y)) > 3 || !nav.passableAt(p.x, p.y)) continue      // roof or blocked
      const d = Math.hypot(p.x - me.x, p.y - me.y)
      if (p.kind === 'laser') lp = Math.min(lp, d)
      if (p.kind === 'laser' || p.kind === 'lightning') wp = Math.min(wp, d)
    }
    row.laserD = lp; row.w2D = wp; row.hasLaser = !!me.laser; row.slot1 = !!me.weapons[1]
    let cd = Infinity
    for (const c of B.cubes.values()) { if (Math.abs(c.z - nav.levelAt(c.x, c.y)) > 3) continue; cd = Math.min(cd, Math.hypot(c.x - me.x, c.y - me.y)) }
    row.cubeD = cd
    const tg = B.topAttacker || B.target
    row.thrB = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : null; row.thrD = tg ? tg.dist : -1
  }
  const { rows, rec } = await runTrace(s, { overrides, hook })
  S.score += rec.score; S.cubesEnd += rec.cubes; S.upgradesEnd += (rec.upgrades || []).length
  let prev = null
  for (const r of rows) {
    S.ticks++
    if (!r.hasLaser && r.laserD < 60) chanceT += 0.1
    if (r.hasLaser) got = true
    if (!r.slot1 && r.w2D < 60) w2chance = true
    if ((r.leg === 'hide' || r.leg === 'retreat' || r.leg === 'escape') && r.thrB !== null && r.losInAge <= 0.5) {
      S.hideExposed++
      const m = Math.hypot(r.mx, r.my)
      if (m > 0.3) { const c = (r.mx * Math.cos(r.thrB) + r.my * Math.sin(r.thrB)) / m; if (c > 0.5) { S.hideToward++; if (r.thrD < 80) S.hideTowardNear++ } }
      if (!ep) { ep = { d0: r.thrD }; S.episodes++ }
      ep.d1 = r.thrD
    } else if (ep) { if (ep.d1 < ep.d0 - 10) S.epCloser++; ep = null }
    if (r.cubeD < 40) { S.cubeKnownNearTicks++; if (r.mode === 'FIGHT' || r.mode === 'HOLD' || r.mode === 'HEAL' || r.mode === 'DISENGAGE') S.cubeTicks40++ }
    if (r.losInAge > 3 && r.nearest > 150) { S.quiet++; if (r.spd < 0.5) S.holdStillQuiet++ }
    prev = r
  }
  if (chanceT >= 3) { S.laserChance++; S.laserChanceS += chanceT; if (got) S.laserChanceTaken++ }
  if (got) S.laserEver++
  if (w2chance) S.w2Chance++
  if (rec.loadout.length < 2) S.emptySlotEnd++
}
const f = (a, b, d = 2) => (b ? (a / b).toFixed(d) : 'n/a')
console.log(JSON.stringify({
  matches: n, meanScore: f(S.score, n),
  'matches with a ground-level laser pickup known within 60 m for >= 3 s while holding no laser': S.laserChance, 'of those, matches that ever held a laser': S.laserChanceTaken, 'mean seconds such a pickup stayed known and untaken': f(S.laserChanceS, S.laserChance, 1),
  'matches that ever held a laser': S.laserEver, 'matches that ended with an empty second slot': S.emptySlotEnd, 'matches with a laser or lightning pickup within 60 m while slot 1 was empty': S.w2Chance,
  'mean cubes / upgrades at the end': [f(S.cubesEnd, n), f(S.upgradesEnd, n)],
  'decisions with a ground cube known within 40 m': S.cubeKnownNearTicks, 'of those not in LOOT / killdrop': S.cubeTicks40,
  'exposed retreat decisions (hide / retreat / escape legs)': S.hideExposed, 'of those moving within 60 deg of the direction TO the attacker': S.hideToward, 'same with the attacker inside 80 m': S.hideTowardNear,
  'exposed retreat episodes': S.episodes, 'episodes that ended more than 10 m closer to the attacker': S.epCloser,
  'out of contact (no line 3 s, nearest mech > 150 m) decisions': S.quiet, 'of those standing still': S.holdStillQuiet,
}, null, 1))
process.exit(0)
