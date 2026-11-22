import { World } from '../mechbot/bot/lib/world.js'
import { Nav } from '../mechbot/bot/lib/nav.js'
import { Match } from '../mechbot/sim/sim.js'
import { loadConfig, MAP_DIR } from '../mechbot/sim/config.js'
const t0 = performance.now()
const world = World.loadSync(MAP_DIR)
const cfg = loadConfig()
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
console.log('load ms', (performance.now() - t0).toFixed(0))
// scripted bots
const trace = []
const mk = (script) => ({ name: 's', hello() {}, act(obs) { return script(obs) } })
const bots = []
for (let i = 0; i < 16; i++) bots.push(mk((obs) => {
  const a = { tick: obs.tick }
  if (obs.self.id === 0) {
    // walk east 3 s, then hop
    const t = obs.t
    if (t < 3) a.move = [1, 0]
    else if (t < 3.05) { a.move = [0, 0]; a.jump = true; a.boost = true }
    else if (t < 4.5) a.boost = true
    a.fire = [t > 8 && t < 14, false]
    a.aim = [0.3, 0.2]
    trace.push([obs.tick, obs.self.pos.join(','), obs.self.vel.join(','), obs.self.energy, obs.self.grounded, obs.self.weapons[0].cooldown, obs.self.weapons[0].ammo, obs.self.weapons[0].reload])
  }
  return a
}))
const m = new Match({ world, nav, seed: 7, config: cfg, bots, mode: 'ffa', maxDecisions: 200 })
console.log('spawns', m.mechs.map((q) => [q.x.toFixed(0), q.y.toFixed(0), q.z.toFixed(1)].join('/')).join(' '))
console.log('zone', JSON.stringify(m.phases.map((p) => [p.to.x, p.to.y, p.to.r, p.s0, p.s1])))
console.log('drops', JSON.stringify(m.drops.map((d) => [d.x.toFixed(0), d.y.toFixed(0), d.callT])))
console.log('crates roof', m.crates.filter((c) => c.z - world.ground(c.x, c.y) > 3).length, 'pickups roof', m.pickups.filter((c) => c.z - world.ground(c.x, c.y) > 3).length)
const t1 = performance.now()
const res = m.runSync()
console.log('run ms', (performance.now() - t1).toFixed(0), 'decisions', res.decisions)
for (const r of trace) if (r[0] <= 20 || (r[0] >= 56 && r[0] <= 130) || (r[0] >= 158 && r[0] <= 300 && r[0] % 2 === 0)) console.log(r.join(' | '))
