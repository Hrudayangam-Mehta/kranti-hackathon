// Scenario 21 (brain only): upgrade picks against doctrine D7, and the supply-drop timing rule of D6.
import { createBrain } from '../../bot/lib/brain.js'
import { readFileSync } from 'node:fs'
const hello = JSON.parse(readFileSync(new URL('../../notes/hello_example.json', import.meta.url), 'utf8'))
const W = hello.config.weapons
function obsAt(t, o = {}) {
  return { type: 'obs', tick: Math.round(t * 20), t, alive: 16,
    self: { id: 0, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
      weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: W.gun }, o.w1 ? { kind: o.w1, cooldown: 0, charge: 0, stats: W[o.w1] } : null], stats: hello.config.mech },
    mechs: [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: o.drops || [],
    zone: { center: [0, 0], radius: 500, next_center: [0, 0], next_radius: 400, shrink_start: 600, shrink_end: 700, dps: 20 }, offer: o.offer || null }
}
const D7 = ['plating', 'armor', 'nanites', 'laser_damage', 'laser_charge', 'lightning_efficiency', 'gun_damage', 'gun_rate', 'lightning_range', 'lightning_chain', 'gyros', 'servos', 'gun_mag', 'capacitor', 'reactor', 'jets', 'gun_velocity', 'sensors']
const d7pick = (ids, w1) => { let best = 0, bs = 1e9; ids.forEach((id, i) => { let s = D7.indexOf(id); if (s < 0) s = 99; if ((id === 'laser_damage' || id === 'laser_charge') && w1 !== 'laser') s = 60; if (id === 'lightning_efficiency' && w1 !== 'lightning') s = 60; if (s < bs) { bs = s; best = i } }); return best }
const cases = [[['plating', 'nanites', 'gun_damage'], null], [['armor', 'nanites', 'sensors'], null], [['plating', 'gun_damage', 'armor'], null], [['armor', 'gun_damage', 'gun_rate'], null], [['lightning_efficiency', 'servos', 'gyros'], 'lightning'], [['laser_charge', 'gun_damage', 'gun_rate'], 'laser'], [['gyros', 'servos', 'gun_mag'], null], [['nanites', 'gun_damage', 'laser_damage'], 'laser']]
const b = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false })
let t = 1, diff = 0
cases.forEach(([ids, w1], k) => {
  const a = b.act(obsAt(t, { w1, offer: { id: k + 1, expires: t + 5, choices: ids.map((id) => ({ id })) } }), performance.now() + 30)
  const want = d7pick(ids, w1)
  if (a.pick !== want) diff++
  console.log(`offer ${k + 1} [${ids.join(', ')}]${w1 ? ' holding ' + w1 : ''}: brain picks ${ids[a.pick]}, D7 order picks ${ids[want]}${a.pick !== want ? '   <-- differs' : ''}`)
  t += 1
})
console.log(`${diff}/${cases.length} offers answered differently from D7`)
// supply drop: 30 m away, lands in 20 s
const b2 = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false })
for (const landsIn of [20, 10, 4]) {
  let a = null, d = null
  for (let k = 0; k < 8; k++) { a = b2.act(obsAt(50 + k * 0.1, { drops: [{ id: 20000, pos: [30, 0, 0], radius: 8, lands_in: landsIn, capture_s: 4, progress: 0, holder: null }] }), performance.now() + 30); d = b2.debugState() }
  console.log(`drop 30 m away (2.6 s walk), lands in ${landsIn} s: mode ${d.mode}, move [${a.move.map((v) => v.toFixed(2))}] -> ${d.mode === 'DROP' && Math.hypot(a.move[0], a.move[1]) > 0.5 ? `walks now and would wait about ${(landsIn - 2.6).toFixed(0)} s in the ring (D6: arrive no more than 3 s before landing)` : 'does not go yet'}`)
}
