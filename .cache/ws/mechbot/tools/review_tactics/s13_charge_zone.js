// Scenario 13 (brain only): a laser charge that is already running is kept while ZONE or the shell dodge needs
// full speed (spec section 2: "Never charge when ZONE or DODGE needs full speed"). B.noCharge only blocks the START.
import { createBrain } from '../../bot/lib/brain.js'
import { readFileSync } from 'node:fs'
const hello = JSON.parse(readFileSync(new URL('../../notes/hello_example.json', import.meta.url), 'utf8'))
const W = hello.config.weapons
function obsAt(t, o) {
  return { type: 'obs', tick: Math.round(t * 20), t, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: o.inZone,
      weapons: [{ kind: 'gun', cooldown: 0.2, ammo: 12, reload: 0, stats: W.gun }, { kind: 'laser', cooldown: 0, charge: o.charge, stats: W.laser }], stats: hello.config.mech },
    mechs: [{ id: 5, kind: 'mech', pos: [120, 0, 0], vel: [0, 9, 0], aim: [1.5, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }],
    projectiles: o.shell ? [{ id: 900, kind: 'mortar', pos: [30, 0, 20], vel: [-30, 0, -5] }] : [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [],
    zone: o.inZone ? { center: [0, 0], radius: 500, next_center: [0, 0], next_radius: 400, shrink_start: 600, shrink_end: 700, dps: 20 } : { center: [300, 0], radius: 200, next_center: [300, 0], next_radius: 150, shrink_start: 600, shrink_end: 700, dps: 60 }, offer: null }
}
for (const [label, o] of [['inside the zone, no shell (control)', { inZone: true }], ['OUTSIDE the zone, 100 m from the edge (ZONE mode, boost)', { inZone: false }], ['mortar shell landing on us (shell dodge)', { inZone: true, shell: true }]]) {
  const b = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false })
  let charge = 0, out = []
  for (let k = 0; k < 12; k++) {
    const t = 5 + k * 0.1
    // the first three decisions are always the control situation, so a charge is already running when the trouble starts
    const a = b.act(obsAt(t, k < 3 ? { inZone: true, charge } : { ...o, charge }), performance.now() + 30)
    const d = b.debugState()
    out.push(`${charge.toFixed(1)}:${a.fire[1] ? 'HOLD' : 'up'}(${d.mode}/${d.leg}${a.boost ? ',boost' : ''})`)
    if (a.fire[1]) charge = Math.min(0.75, charge + 0.1); else charge = 0
  }
  console.log(`${label}\n   charge:trigger per decision -> ${out.join(' ')}`)
}
