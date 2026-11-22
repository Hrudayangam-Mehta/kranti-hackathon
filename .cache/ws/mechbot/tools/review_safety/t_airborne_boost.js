// Targeted: `boost` while not grounded. protocol.md: "boost ... In the air: jet upward (jet_accel, capped at
// max_rise_speed), draining jet_drain/s." The brain sets boost for running (zone, retreat, dodge) without looking
// at self.grounded. Vertical motion below is integrated from the protocol numbers only (jump_speed, jet_accel,
// gravity, max_rise_speed, jet_drain, boost_drain, energy_regen); horizontal motion follows the command at walk
// speed in the air and boost speed on the ground.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkZone } from './common.js'
const hello = realHello(), cfg = hello.config, m = cfg.mech
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const q = nav.nearestPassable(-100, -250, 80)
function run(label, trigger, guard) {
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  let x = q.x, y = q.y, zAbove = 0, vz = 0, energy = 100, sinceSpend = 9, last = null
  let airTicks = 0, airBoost = 0, maxH = 0, dist = 0, firstAir = -1, landed = -1
  for (let k = 0; k < 160; k++) {
    const grounded = zAbove <= 0
    const obs = mkObs(cfg, 4000 + k * 2, { self: mkSelf(cfg, { pos: [x, y, nav.levelAt(x, y) + zAbove], vel: [last ? last.move[0] * 11 : 0, last ? last.move[1] * 11 : 0, vz], grounded, energy: +energy.toFixed(1), in_zone: false, hp: 1200 }),
      zone: mkZone({ center: [x + 600, y], radius: 300, next_center: [x + 600, y], next_radius: 200, shrink_start: 150, shrink_end: 190, dps: 35 }), events: [{ type: 'damaged', amount: 3.5, weapon: 'zone', bearing: null, by: null }] })
    const a = brain.act(obs, performance.now() + 27.5)
    if (guard && !grounded && brain._B.legKind !== 'stuckjet') a.boost = false      // what a grounded guard would do
    last = a
    // --- apply one decision (0.1 s) of the protocol's movement rules
    let spent = false
    if (grounded) {
      if (a.jump || trigger(k)) { vz = trigger(k) ? 0.01 : m.jump_speed; zAbove = trigger(k) ? 1.5 : 0.001 }   // trigger: a 1.5 m ledge drop
      if (a.boost && energy > 0 && Math.hypot(a.move[0], a.move[1]) > 0.1) { energy -= m.boost_drain * 0.1; spent = true }
    }
    if (zAbove > 0) {
      if (a.boost && energy > 0) { vz = Math.min(m.max_rise_speed, vz + (m.jet_accel - m.gravity) * 0.1); energy -= m.jet_drain * 0.1; spent = true } else vz -= m.gravity * 0.1
      zAbove += vz * 0.1
      if (zAbove <= 0) { zAbove = 0; vz = 0; if (firstAir >= 0 && landed < 0) landed = k }
      else { airTicks++; if (a.boost) airBoost++; if (firstAir < 0) firstAir = k }
      if (zAbove > maxH) maxH = zAbove
    }
    if (energy < 0) energy = 0
    sinceSpend = spent ? 0 : sinceSpend + 0.1
    if (sinceSpend >= m.energy_regen_delay) energy = Math.min(100, energy + m.energy_regen * 0.1)
    const sp = zAbove > 0 ? m.walk_speed : (a.boost && energy > 0 ? m.boost_speed : m.walk_speed)
    const nx = x + a.move[0] * sp * 0.1, ny = y + a.move[1] * sp * 0.1
    if (nav.passableAt(nx, ny)) { dist += Math.hypot(nx - x, ny - y); x = nx; y = ny }
  }
  console.log(`${label.padEnd(58)} airborne decisions ${String(airTicks).padStart(3)} (boost held on ${airBoost}), peak ${maxH.toFixed(1)} m above ground, first airborne #${firstAir} landed #${landed}, ground covered in 16 s: ${dist.toFixed(0)} m`)
}
run('never leaves the ground', () => false, false)
run('one 1.5 m ledge drop at decision 20 (brain as is)', (k) => k === 20, false)
run('same drop, boost suppressed while airborne', (k) => k === 20, true)
