// Scenario 11: gun + laser against a passive target (walking steadily / strafing with 1.5 s turns) at 100 / 150 / 190 m.
// Counts beams, beam hits, the cycle time between beams, gun shots and hits, and compares total damage with gun only.
import { brainBot, runScenario, scripted, OPEN } from './scen.js'
const walker = (period) => scripted('walker', (obs, s) => {
  if (s.next === undefined) { s.sign = 1; s.next = period / 2 }
  if (obs.t >= s.next) { s.sign = -s.sign; s.next += period }
  return { move: [0, s.sign] }
})
console.log('range target    loadout     | beams hits  cycle_s | gun shots hits | dmg/s | speed while charging / not (m/s)')
for (const R of [100, 150, 190]) for (const [tn, period] of [['steady', 12], ['strafe', 1.5]]) for (const w of [null, 'laser']) {
  let beams = 0, bh = 0, gs = 0, gh = 0, dmg = 0, cyc = 0, cycN = 0, spC = 0, nC = 0, spN = 0, nN = 0
  for (let seed = 1; seed <= 3; seed++) {
    let M = null
    const ours = brainBot({ rPrefGun: R, bandLo: R - 20, bandHi: R + 20, rPrefLaser: R }, (row, obs, a, B) => { if (M) { M.mechs[0].hp = 1400; M.mechs[1].hp = 1400 } row.lcharge = B.me.laser ? B.me.laser.charge : 0; row.lcd = B.me.laser ? B.me.laser.cooldown : 0 })
    const { res } = runScenario({ bots: [ours, walker(period)], seed, maxT: 60, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0, weapon: w }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], setup(m) { M = m } })
    let last = -1, prevCd = 0
    for (const r of ours.rows) {
      for (const e of r.evs) if (e.type === 'hit') { if (e.weapon === 'laser') bh++; else if (e.weapon === 'gun') gh++ }
      if (r.lcd > prevCd + 0.5) { beams++; if (last >= 0) { cyc += r.t - last; cycN++ } last = r.t }
      prevCd = r.lcd
      if (r.lcharge > 0) { spC += r.spd; nC++ } else { spN += r.spd; nN++ }
    }
    gs += res.mechs[0].shotsFired; dmg += res.mechs[0].dmgDealt
  }
  console.log(`${String(R).padStart(4)}  ${tn.padEnd(8)}  ${(w || 'gun only').padEnd(10)} | ${String(beams).padStart(5)} ${String(bh).padStart(4)}  ${(cycN ? cyc / cycN : 0).toFixed(2).padStart(6)} | ${String(gs).padStart(8)} ${String(gh).padStart(5)} | ${(dmg / 180).toFixed(0).padStart(5)} | ${(nC ? spC / nC : 0).toFixed(1)} / ${(spN / Math.max(1, nN)).toFixed(1)}`)
}
