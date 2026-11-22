// Ground boost outside the zone: the brain boosts whenever energy > 1-2, so once the tank is empty it spends each
// trickle at once and pays energy_regen_delay (0.6 s without spending) on every cycle. Energy model from the
// protocol numbers only: boost_drain 17/s while boosting, energy_regen 18/s after energy_regen_delay 0.6 s.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkZone } from './common.js'
const hello = realHello(), cfg = hello.config, m = cfg.mech
const { createBrain } = await loadBrainModule()
function run(policy) {
  const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false })
  let x = 0, energy = 100, since = 9, boostTicks = 0, dist = 0, lateBoost = 0, bank = false
  const N = 900
  for (let k = 0; k < N; k++) {
    const obs = mkObs(cfg, 4000 + k * 2, { self: mkSelf(cfg, { pos: [x, 0, 0], vel: [11, 0, 0], energy: +energy.toFixed(1), in_zone: false, hp: 1300 }), zone: mkZone({ center: [x + 3000, 0], radius: 300, next_center: [x + 3000, 0], next_radius: 200, shrink_start: 0, shrink_end: 1, dps: 20 }) })
    const a = brain.act(obs, performance.now() + 27.5)
    let want = a.boost
    if (policy === 'batch') { if (energy >= 60) bank = true; if (energy <= 2) bank = false; want = bank }   // hysteresis: refill to 60, then spend
    const boosting = want && energy > 0
    if (boosting) { energy = Math.max(0, energy - m.boost_drain * 0.1); since = 0; boostTicks++; if (k >= 300) lateBoost++ } else { since += 0.1; if (since >= m.energy_regen_delay) energy = Math.min(100, energy + m.energy_regen * 0.1) }
    const sp = boosting ? m.boost_speed : m.walk_speed
    x += a.move[0] * sp * 0.1; dist += a.move[0] * sp * 0.1
  }
  console.log(`${policy.padEnd(34)} 90 s outside the zone: ${dist.toFixed(0)} m, boosting ${(boostTicks / N * 100).toFixed(0)}% of decisions (${(lateBoost / 600 * 100).toFixed(0)}% after the first 30 s), mean speed after 30 s ${(m.walk_speed + (m.boost_speed - m.walk_speed) * lateBoost / 600).toFixed(1)} m/s`)
}
run('brain as is (boost if energy > 1)')
run('batch')
