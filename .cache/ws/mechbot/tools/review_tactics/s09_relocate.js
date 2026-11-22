// Scenario 9: jink discipline during our reload. An exact first-order shooter (what the house bots are) stands
// 100 m away and fires its gun at us for 60 s. Same shooter with and without a laser in its second slot (it never
// fires the laser). Against a laser or mortar holder the brain replaces the jink by a one-direction "relocate"
// during every reload, i.e. it moves steadily for 2.4 s of each 5.3 s gun cycle.
import { brainBot, runScenario, scripted, leadAim, OPEN } from './scen.js'
const shooter = scripted('shooter', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0] }
})
console.log('enemy second weapon | our damage taken per min | hits taken while our gun reloads / s | otherwise / s | relocate decisions | lateral reversals during reload')
for (const w of [null, 'laser', 'mortar']) {
  let taken = 0, hitsReload = 0, hitsOther = 0, tReload = 0, tOther = 0, reloc = 0, revReload = 0, n = 0
  for (let seed = 1; seed <= 4; seed++) {
    let M = null
    const ours = brainBot({ rPrefGun: 100, bandLo: 80, bandHi: 120 }, (row, obs, a, B) => { if (M) { M.mechs[0].hp = 1400; M.mechs[1].hp = 1400 } row.reloading = !!(B.me.gun && (B.me.gun.reload > 0 || B.me.gun.ammo === 0)); row.vx = B.me.vx; row.vy = B.me.vy })
    runScenario({ bots: [ours, shooter], seed, maxT: 60, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + 100, y: OPEN.y, yaw: Math.PI, weapon: w }], setup(m) { M = m } })
    let prevSign = 0
    for (const r of ours.rows) {
      n++
      const h = r.evs.filter((e) => e.type === 'damaged' && e.weapon === 'gun').length
      taken += r.evs.filter((e) => e.type === 'damaged').reduce((s, e) => s + e.amount, 0)
      if (r.reloading) { hitsReload += h; tReload += 0.1 } else { hitsOther += h; tOther += 0.1 }
      if (r.leg === 'relocate') reloc++
      const sign = Math.abs(r.vy) > 2 ? Math.sign(r.vy) : 0      // the enemy is due east, so vy is the lateral speed
      if (sign && prevSign && sign !== prevSign && r.reloading) revReload++
      if (sign) prevSign = sign
    }
  }
  console.log(`${String(w).padEnd(19)} | ${(taken / 4).toFixed(0).padStart(24)} | ${(hitsReload / tReload).toFixed(2).padStart(35)} | ${(hitsOther / tOther).toFixed(2).padStart(13)} | ${String(reloc).padStart(18)} | ${revReload}`)
}
