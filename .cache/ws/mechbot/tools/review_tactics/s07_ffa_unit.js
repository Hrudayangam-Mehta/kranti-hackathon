// Scenario 7 (brain only, synthetic observations): how little it takes to latch FFA.
//  (a) two deaths that are not our kills (D12 asks for three);
//  (b) no death at all: house bots re-sighted after 6 s out of memory with 60 hp less (a drone, the zone ...).
import { createBrain } from '../../bot/lib/brain.js'
import { readFileSync } from 'node:fs'
const hello = JSON.parse(readFileSync(new URL('../../notes/hello_example.json', import.meta.url), 'utf8'))
function obsAt(t, mechs, alive, events = []) {
  return { type: 'obs', tick: Math.round(t * 20), t, alive,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
      weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: hello.config.weapons.gun }, null], stats: hello.config.mech },
    mechs, projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events, drops: [],
    zone: { center: [0, 0], radius: 560, next_center: [0, 0], next_radius: 380, shrink_start: 60, shrink_end: 110, dps: 20 }, offer: null }
}
const mech = (id, x, y, hp) => ({ id, kind: 'mech', pos: [x, y, 0], vel: [0, 0, 0], aim: [1.5, 0], hp, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })

{ // (a)
  const logs = []
  const b = createBrain(hello, { world: null, nav: null, log: (m) => logs.push(m) }, { warmup: false })
  let env = ''
  for (let k = 0; k < 300; k++) {
    const t = k * 0.1
    const alive = t < 10 ? 16 : t < 20 ? 15 : 14          // two mechs die far away, no kill event for us
    b.act(obsAt(t, [], alive), performance.now() + 30)
    const d = b.debugState()
    if (d.env !== env) { console.log(`(a) t=${t.toFixed(1)} alive=${alive} env=${d.env} F=${d.F} Q=${d.Q}`); env = d.env }
  }
  console.log('(a) log:', logs.filter((l) => l.includes('FFA')).join(' | ') || 'no latch')
}
{ // (b)
  const logs = []
  const b = createBrain(hello, { world: null, nav: null, log: (m) => logs.push(m) }, { warmup: false })
  let env = '', F = -1
  for (let k = 0; k < 600; k++) {
    const t = k * 0.1
    const ms = []
    // three house bots stand 180 m away looking elsewhere; each is seen for 2 s, unseen for 6 s, then seen again 60 hp lower
    for (const [id, t0] of [[5, 2], [6, 12], [7, 22]]) {
      if (t >= t0 && t < t0 + 2) ms.push(mech(id, 180, id * 10, 1400))
      if (t >= t0 + 8 && t < t0 + 10) ms.push(mech(id, 180, id * 10, 1340))
    }
    b.act(obsAt(t, ms, 16), performance.now() + 30)
    const d = b.debugState()
    if (d.F !== F || d.env !== env) { console.log(`(b) t=${t.toFixed(1)} listed=[${ms.map((m) => m.id + ':' + m.hp)}] env=${d.env} F=${d.F} Q=${d.Q}`); env = d.env; F = d.F }
  }
  console.log('(b) log:', logs.filter((l) => l.includes('FFA')).join(' | ') || 'no latch')
}
