// Scenario 18: lead with the latency of the tick the shot really leaves on. With the trigger held at cooldown <= 0.10 s
// a shot leaves on the first tick after the decision (t + 0.05 s) when the read-out is <= 0.05, else on the second
// (t + 0.10 s). The review harness sets PARAMS.latency per decision from the observed cooldown (no change to bot code).
import { brainBot, runScenario, scripted, OPEN } from './scen.js'
const walker = (period) => scripted('walker', (obs, s) => {
  if (s.next === undefined) { s.sign = 1; s.next = period / 2 }
  if (obs.t >= s.next) { s.sign = -s.sign; s.next += period }
  return { move: [0, s.sign] }
})
const perShot = (obs, brain) => { const g = obs.self.weapons[0]; brain._B.P.latency = g && g.cooldown > 0.05 ? 0.10 : 0.05 }
console.log('range  our legs  variant                                   shots  hits   hit%  dmg/s')
for (const R of [75, 110, 150]) for (const legs of ['still', 'jink']) for (const [vname, ov, pre] of [['shipped (readyCd 0.05, latency 0.10)', {}, null], ['readyCd 0.10, latency 0.10', { readyCd: 0.1 }, null], ['readyCd 0.10, latency 0.05', { readyCd: 0.1, latency: 0.05 }, null], ['readyCd 0.10, latency per shot', { readyCd: 0.1 }, perShot]]) {
  let shots = 0, hits = 0, dmg = 0
  for (let seed = 1; seed <= 8; seed++) {
    let M = null
    const o = legs === 'still' ? { rPrefGun: R, bandLo: 0, bandHi: 400, radialGain: 0, strafeGain: 0 } : { rPrefGun: R, bandLo: R - 20, bandHi: R + 20 }
    const ours = brainBot({ ...ov, ...o }, () => { if (M) { M.mechs[1].hp = 1400; M.mechs[0].hp = 1400 } }, pre)
    const { res } = runScenario({ bots: [ours, walker(12)], seed, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], maxT: 60, setup(m) { M = m } })
    shots += res.mechs[0].shotsFired; hits += res.mechs[0].shotsHit; dmg += res.mechs[0].dmgDealt
  }
  console.log(`${String(R).padStart(4)}   ${legs.padEnd(8)}  ${vname.padEnd(40)} ${String(shots).padStart(5)} ${String(hits).padStart(5)}  ${(100 * hits / shots).toFixed(1)}%  ${(dmg / 480).toFixed(0).padStart(4)}`)
}
