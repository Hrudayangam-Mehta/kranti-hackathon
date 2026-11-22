// Scenario 12: the "halve the lateral lead when the target reversed twice in 2 s" rule (revCount / revLeadScale).
// Target strafes across with random reversal intervals like a house bot (uniform in [lo, hi]); our legs stand still.
// Hit rate with the rule (shipped) and without it (revCount 99), readyCd 0.10 in both so the cadence is equal.
import { brainBot, runScenario, scripted, OPEN } from './scen.js'
function strafer(lo, hi, seed) {
  let a = seed * 2654435761 >>> 0
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  return scripted('strafer', (obs, s) => {
    if (s.next === undefined) { s.sign = 1; s.next = lo + (hi - lo) * rnd() }
    if (obs.t >= s.next) { s.sign = -s.sign; s.next = obs.t + lo + (hi - lo) * rnd() }
    return { move: [0, s.sign] }
  })
}
console.log('range  reversal interval   | shipped: shots hits hit% | no halving: shots hits hit% | lead scale 0.75: hit%')
for (const R of [75, 100, 130, 150]) for (const [lo, hi] of [[0.35, 1.6], [0.35, 1.9], [0.8, 1.6], [0.4, 0.8]]) {
  const out = []
  for (const ov of [{}, { revCount: 99 }, { revLeadScale: 0.75 }]) {
    let shots = 0, hits = 0
    for (let seed = 1; seed <= 6; seed++) {
      let M = null
      const ours = brainBot({ readyCd: 0.1, rPrefGun: R, bandLo: 0, bandHi: 400, radialGain: 0, strafeGain: 0, ...ov }, () => { if (M) M.mechs[1].hp = 1400 })
      const { res } = runScenario({ bots: [ours, strafer(lo, hi, seed)], seed, maxT: 40, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], setup(m) { M = m } })
      shots += res.mechs[0].shotsFired; hits += res.mechs[0].shotsHit
    }
    out.push([shots, hits])
  }
  console.log(`${String(R).padStart(4)}   U(${lo}, ${hi})`.padEnd(27) + `|          ${String(out[0][0]).padStart(5)} ${String(out[0][1]).padStart(4)} ${(100 * out[0][1] / out[0][0]).toFixed(0).padStart(3)}% |             ${String(out[1][0]).padStart(5)} ${String(out[1][1]).padStart(4)} ${(100 * out[1][1] / out[1][0]).toFixed(0).padStart(3)}% | ${(100 * out[2][1] / out[2][0]).toFixed(0).padStart(3)}%`)
}
