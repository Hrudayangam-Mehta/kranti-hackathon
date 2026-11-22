// Scenario 10: how often does an exact first-order gun (the house-bot aim) hit our jink? Gun-only shooter standing
// at R, firing whole magazines for 60 s x 4 seeds; our brain holds R with its normal legs. Variants of the reversal
// interval: shipped U(0.5,1.0), doctrine D4 U(0.8,1.6), faster U(0.35,0.7), and no reversal at all.
import { brainBot, runScenario, scripted, leadAim, OPEN } from '../review_tactics/scen.js'
const shooter = scripted('shooter', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0] }
})
console.log('range | jink interval      | enemy shots | hits on us | hit rate | our dmg dealt/min')
for (const R of [75, 100, 130]) for (const [name, ov] of [['default (D4 strafe + dodge)', {}], ['bullet dodge off (dodgeHorizon 0)', { dodgeHorizon: 0 }], ['no strafe flips, dodge on', { strafeLo: 9, strafeHi: 9 }], ['no flips, no dodge', { strafeLo: 9, strafeHi: 9, dodgeHorizon: 0 }]]) {
  let shots = 0, hits = 0, dealt = 0
  for (let seed = 1; seed <= 4; seed++) {
    let M = null
    const ours = brainBot({ rPrefGun: R, bandLo: R - 20, bandHi: R + 20, ...ov }, () => { if (M) { M.mechs[0].hp = 1400; M.mechs[1].hp = 1400 } })
    const { res } = runScenario({ bots: [ours, shooter], seed, maxT: 60, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], setup(m) { M = m } })
    shots += res.mechs[1].shotsFired; hits += res.mechs[1].shotsHit; dealt += res.mechs[0].dmgDealt
  }
  console.log(`${String(R).padStart(5)} | ${name.padEnd(18)} | ${String(shots).padStart(11)} | ${String(hits).padStart(10)} | ${(100 * hits / shots).toFixed(0).padStart(7)}% | ${(dealt / 4).toFixed(0)}`)
}
