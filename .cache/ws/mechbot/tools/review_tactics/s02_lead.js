// Scenario 2: lead / latency. Hit rate of the gun against a steadily walking target (turn every 12 s) while our
// own legs stand still or jink as usual, for latency 0.10 (default) and 0.05, with readyCd 0.05 (default) and 0.10.
// 6 seeds x 60 s per cell. In the simulator a ready gun fires on the first tick after the decision (t + 0.05 s).
import { brainBot, runScenario, scripted, OPEN } from './scen.js'
const walker = (period) => scripted('walker', (obs, s) => {
  if (s.next === undefined) { s.sign = 1; s.next = period / 2 }
  if (obs.t >= s.next) { s.sign = -s.sign; s.next += period }
  return { move: [0, s.sign] }
})
const variants = [['latency 0.10, readyCd 0.05 (shipped)', {}], ['latency 0.05, readyCd 0.05', { latency: 0.05 }], ['latency 0.10, readyCd 0.10', { readyCd: 0.1 }], ['latency 0.05, readyCd 0.10', { latency: 0.05, readyCd: 0.1 }], ['latency 0.075, readyCd 0.10', { latency: 0.075, readyCd: 0.1 }]]
console.log('range  our legs   variant                                 shots  hits  hit%  dmg/s')
for (const R of [75, 110, 150, 190]) for (const legs of ['still', 'jink']) for (const [vname, ov] of variants) {
  let shots = 0, hits = 0, dmg = 0, T = 0
  for (let seed = 1; seed <= 6; seed++) {
    let M = null
    const o = legs === 'still' ? { rPrefGun: R, bandLo: 0, bandHi: 400, radialGain: 0, strafeGain: 0 } : { rPrefGun: R, bandLo: R - 20, bandHi: R + 20 }
    const ours = brainBot({ ...ov, ...o }, () => { if (M) { M.mechs[1].hp = 1400; M.mechs[0].hp = 1400 } })
    const { res } = runScenario({ bots: [ours, walker(12)], seed, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], maxT: 60, setup(m) { M = m } })
    shots += res.mechs[0].shotsFired; hits += res.mechs[0].shotsHit; dmg += res.mechs[0].dmgDealt; T += 60
  }
  console.log(`${String(R).padStart(4)}   ${legs.padEnd(9)}  ${vname.padEnd(38)} ${String(shots).padStart(5)} ${String(hits).padStart(5)}  ${(100 * hits / Math.max(1, shots)).toFixed(1).padStart(4)}%  ${(dmg / T).toFixed(0).padStart(4)}`)
}
