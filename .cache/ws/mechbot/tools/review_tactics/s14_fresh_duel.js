// Scenario 14: one fresh mech 75 m away that only aims at us (never shoots), near buildings so a hide cell exists.
// Does the brain accept the duel at full hp? (Finish-or-flee: hp - H_esc >= tau * A with prior dps numbers.)
// Then the same with the mech shooting (exact first-order lead): how the 1 v 1 goes, shipped vs readyCd 0.10.
import { brainBot, runScenario, scripted, leadAim, env } from './scen.js'
const { world, nav } = env()
// a spot with a wall 8-14 m away and a clear, walkable 80 m line to the east or west
const spots = []
for (let x = -300; x < 350 && spots.length < 4; x += 14) for (let y = -280; y < 250 && spots.length < 4; y += 14) {
  if (!nav.passableAt(x, y)) continue
  const wd = nav.wallDistAt(x, y)
  if (wd < 8 || wd > 14) continue
  for (const dir of [1, -1]) {
    const x2 = x + dir * 75
    if (!nav.passableAt(x2, y) || !nav.walkLine(x, y, x2, y) || nav.wallDistAt(x2, y) < 6) continue
    if (!world.shotClear(x, y, nav.levelAt(x, y) + 7, x2, y, nav.levelAt(x2, y) + 4.5)) continue
    if (spots.every((s) => Math.hypot(s.x - x, s.y - y) > 120)) spots.push({ x, y, x2 })
    break
  }
}
const mech = (fire) => scripted('mech', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [fire, false] } : { move: [0, 0] }
})
for (const s of spots) {
  const ours = brainBot({}, (row, obs, a, B) => { row.fightOk = B.fightOk; row.tCover = B.tCover })
  runScenario({ bots: [ours, mech(false)], seed: 1, maxT: 15, place: [{ x: s.x, y: s.y, yaw: 0 }, { x: s.x2, y: s.y, yaw: 0 }] })
  const rows = ours.rows.filter((r) => r.t >= 1)
  const m = {}
  for (const r of rows) m[r.mode] = (m[r.mode] || 0) + 1
  const notOk = rows.filter((r) => r.tgt === 1 && !r.fightOk).length
  const dealt = ours.rows.reduce((q, r) => q + r.evs.filter((e) => e.type === 'hit').reduce((z, e) => z + e.amount, 0), 0)
  console.log(`spot (${s.x},${s.y}) passive aiming mech at 75 m, we are at 100% hp and never hit: modes ${JSON.stringify(m)}; decisions with fightOk=false: ${notOk}/${rows.length}; damage we dealt in 15 s: ${dealt.toFixed(0)} (a standing shooter deals about ${Math.round(15 * 95)})`)
}
console.log('\n1 v 1 against a standing exact-lead gun shooter at 75 m (full hp both, fight to the death, 90 s cap):')
for (const [name, ov] of [['shipped', {}], ['readyCd 0.10', { readyCd: 0.1 }]]) {
  let wins = 0, n = 0, left = 0, tSum = 0
  for (const s of spots) for (let seed = 1; seed <= 3; seed++) {
    const ours = brainBot(ov)
    const { res } = runScenario({ bots: [ours, mech(true)], seed, maxT: 90, place: [{ x: s.x, y: s.y, yaw: 0 }, { x: s.x2, y: s.y, yaw: 0 }] })
    n++
    if (res.mechs[0].alive && !res.mechs[1].alive) { wins++; tSum += res.mechs[1].timeAlive }
    left += res.mechs[1].alive ? res.mechs[1].hp : 0
  }
  console.log(`  ${name.padEnd(13)} kills ${wins}/${n}${wins ? ` (mean time to kill ${(tSum / wins).toFixed(1)} s)` : ''}; mean enemy hp left when we did not kill it ${(left / Math.max(1, n - wins)).toFixed(0)}`)
}
