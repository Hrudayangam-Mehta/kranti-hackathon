// Scenario 1: gun cadence and hit rate against a standing / walking / strafing dummy at 50 / 100 / 150 / 200 m.
// Reports shots fired in 30 s, mean gap between shots inside a magazine, hits / shots, per variant of the brain.
import { brainBot, runScenario, scripted, OPEN } from './scen.js'

function walker(period) {
  // walks perpendicular to the line to mech 0, reversing every `period` seconds (0 = stands still, Infinity = never reverses)
  return scripted('walker', (obs, s) => {
    if (period === 0) return { move: [0, 0] }
    const me = obs.self
    if (s.x0 === undefined) { s.x0 = me.pos[0]; s.y0 = me.pos[1]; s.sign = 1; s.next = period }
    if (obs.t >= s.next) { s.sign = -s.sign; s.next += period }
    return { move: [0, s.sign] }            // the shooter stands to the east or west, so north/south is across
  })
}
const variants = [['default', {}], ['readyCd 0.10', { readyCd: 0.1 }], ['latency 0.05', { latency: 0.05 }], ['readyCd 0.10 + latency 0.05', { readyCd: 0.1, latency: 0.05 }]]
const cases = [['standing', 0], ['walking across, turn 6 s', 6], ['strafing, turn 1.5 s', 1.5]]
console.log('range  target                     variant                       shots  gap_s  hits  hit%   dmg/s')
for (const R of [50, 100, 150, 200]) for (const [cname, period] of cases) for (const [vname, ov] of variants) {
  // our brain stands still (fight legs disabled by a huge stand-off band) so only fire control is measured
  let M = null
  const ours = brainBot({ ...ov, rPrefGun: R, bandLo: 0, bandHi: 400, radialGain: 0, strafeGain: 0 }, () => { if (M) M.mechs[1].hp = 1400 })
  const tgt = walker(period)
  const { match, res } = runScenario({ bots: [ours, tgt], place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], maxT: 30,
    setup(m) { M = m } })
  let shots = 0, gaps = 0, gapN = 0, last = -1, prevAmmo = -1
  for (const r of ours.rows) {
    if (prevAmmo >= 0 && r.ammo < prevAmmo) { shots += prevAmmo - r.ammo; if (last >= 0 && r.t - last < 0.5) { gaps += r.t - last; gapN++ } last = r.t }
    prevAmmo = r.ammo
  }
  const me = res.mechs[0]
  const fight = ours.rows.filter((r) => r.mode === 'FIGHT').length / ours.rows.length
  console.log(`${String(R).padStart(4)}   ${cname.padEnd(26)} ${vname.padEnd(28)} ${String(me.shotsFired).padStart(5)}  ${(gapN ? gaps / gapN : 0).toFixed(3)}  ${String(me.shotsHit).padStart(4)}  ${(100 * me.shotsHit / Math.max(1, me.shotsFired)).toFixed(0).padStart(3)}%  ${(me.dmgDealt / 30).toFixed(0).padStart(5)}  fight ${(fight * 100).toFixed(0)}%`)
}
