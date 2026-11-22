// Scenario 20: a drone joins a 1 v 1. Standing exact-lead gun shooter 75 m east of us on open ground, one drone
// 35 m west of us (inside its 45 m aggro disc). How much of the fight is spent with the drone as the target, and
// how many trigger decisions go to it, compared with the same duel without the drone?
import { brainBot, runScenario, scripted, leadAim, OPEN } from './scen.js'
const mech = scripted('mech', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0] }
})
for (const withDrone of [false, true]) {
  let kills = 0, deaths = 0, tKill = 0, n = 0, droneT = 0, total = 0, sw = 0, shotsAtDrone = 0, shots = 0, rear = 0
  for (let seed = 1; seed <= 8; seed++) {
    const ours = brainBot({ bastionWall: -100 }, (row, obs, a, B) => { row.tNpc = !!(B.target && B.target.npc) })
    const { res } = runScenario({ bots: [ours, mech], seed, maxT: 60, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + 75, y: OPEN.y, yaw: Math.PI }],
      setup(m) { if (withDrone) { const d = m.npcs[0]; d.alive = true; d.hp = 350; d.x = OPEN.x - 35; d.y = OPEN.y + 5; d.z = m.nav.levelAt(d.x, d.y); d.hx = d.x; d.hy = d.y; d.gx = d.x; d.gy = d.y } } })
    n++
    if (!res.mechs[1].alive) { kills++; tKill += res.mechs[1].timeAlive }
    if (!res.mechs[0].alive) deaths++
    let prev = null
    const tEnd = res.mechs[1].alive ? 1e9 : res.mechs[1].timeAlive
    for (const r of ours.rows) {
      if (r.t > tEnd) break
      total++
      if (r.tNpc) droneT++
      if (prev && prev.tgt !== r.tgt && prev.tgt >= 0 && r.tgt >= 0) sw++
      if (r.f0) { shots++; if (r.tNpc) shotsAtDrone++ }
      for (const e of r.evs) if (e.type === 'damaged' && e.rear) rear++
      prev = r
    }
  }
  console.log(`${withDrone ? 'with a drone 35 m behind us' : 'no drone                  '}: kills ${kills}/${n}, deaths ${deaths}, mean time to kill ${(kills ? tKill / kills : 0).toFixed(1)} s; while the mech lived: ${(100 * droneT / total).toFixed(0)}% of decisions targeted the drone, ${shotsAtDrone}/${shots} trigger decisions on it, ${sw} target switches, ${rear} rear hits taken`)
}
