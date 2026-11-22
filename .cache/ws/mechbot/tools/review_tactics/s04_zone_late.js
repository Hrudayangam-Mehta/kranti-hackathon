// Scenario 4: the last zone phases (70 -> 25 -> 0 m). Where does the brain stand, how long is it outside, does it
// oscillate between ZONE and the fight legs when an enemy stands inside the small circle?
import { brainBot, runScenario, scripted, leadAim, OPEN } from './scen.js'
const C0 = { x: OPEN.x, y: OPEN.y, r: 70 }, C1 = { x: OPEN.x + 30, y: OPEN.y + 5, r: 25 }, C2 = { x: OPEN.x + 38, y: OPEN.y + 10, r: 0 }
const zone = { start_center: [C0.x, C0.y], start_radius: 70, phases: [{ hold_s: 10, shrink_s: 25, radius: 25, dps: 160 }, { hold_s: 15, shrink_s: 25, radius: 0, dps: 260 }] }
const shooter = (fire) => scripted('enemy', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  // the enemy walks to the centre of the next circle and (optionally) shoots
  const c = obs.zone.next_center, me = obs.self, dx = c[0] - me.pos[0], dy = c[1] - me.pos[1], d = Math.hypot(dx, dy)
  const a = { move: d > 2 ? [dx / d, dy / d] : [0, 0] }
  if (t) { a.aim = leadAim(obs, t); a.fire = [fire, false] }
  return a
})
function run(label, enemy, ourPlace, enemyPlace, ov = {}, freeze = true) {
  let M = null
  const ours = brainBot(ov, (row, obs, a, B) => {
    row.zc = obs.zone.center; row.zr = obs.zone.radius; row.nc = obs.zone.next_center; row.nr = obs.zone.next_radius
    if (M && freeze) { if (M.mechs[1].alive) M.mechs[1].hp = 1400; M.mechs[0].hp = Math.max(M.mechs[0].hp, 1400) }   // nobody dies of gun fire: only the zone behaviour is studied
    if (M) M.mechs[2].hp = 1e9
  })
  // mech 2 is an invisible bystander far away that keeps the match running
  const far = scripted('far', () => ({ move: [0, 0] }))
  const bots = [ours, enemy || scripted('none', () => ({ move: [0, 0] })), far]
  const place = [ourPlace, enemy ? enemyPlace : { x: OPEN.x + 700, y: OPEN.y + 420 }, { x: OPEN.x + 760, y: OPEN.y + 420 }]
  const { res } = runScenario({ bots, seed: 5, maxT: 76, zone, zoneFixed: [C0, C1, C2], place, setup(m) { M = m; if (!enemy) m.mechs[1].hp = 1e9 } })
  const rows = ours.rows
  let out = 0, zoneMode = 0, sw = 0, prev = '', edgeTicks = 0, zoneDmg = 0, zoneDmgBefore70 = 0, modes = {}, far5 = 0, n5 = 0
  for (const r of rows) {
    if (!r.inZone) out++
    modes[r.mode + '/' + r.leg] = (modes[r.mode + '/' + r.leg] || 0) + 1
    if (r.mode === 'ZONE') zoneMode++
    if (prev && prev !== r.mode && (prev === 'ZONE' || r.mode === 'ZONE')) sw++
    prev = r.mode
    const dC = Math.hypot(r.x - r.zc[0], r.y - r.zc[1])
    if (r.zr - dC < 4 && r.t < 70) edgeTicks++
    if (r.t >= 50 && r.t < 74) { n5++; if (Math.hypot(r.x - r.nc[0], r.y - r.nc[1]) > 3) far5++ }
    for (const e of r.evs) if (e.type === 'damaged' && e.weapon === 'zone') { zoneDmg += e.amount; if (r.t < 74.5) zoneDmgBefore70 += e.amount }
  }
  console.log(`\n== ${label}\n   decisions outside the zone before t=74.5: ${rows.filter((r) => !r.inZone && r.t < 74.5).length}; zone damage before t=74.5 (zone still open): ${zoneDmgBefore70.toFixed(0)} hp; within 4 m of the edge before t=70: ${edgeTicks}; ZONE<->other mode switches ${sw}; final shrink (t=50..74): ${far5}/${n5} decisions more than 3 m from the final centre\n   legs: ${JSON.stringify(modes)}`)
  for (const t of [1, 9.9, 20, 30, 34.9, 45, 49.9, 55, 60, 65, 70, 72, 74]) {
    const r = rows.find((q) => Math.abs(q.t - t) < 0.051)
    if (!r) continue
    console.log(`  t=${String(r.t).padStart(5)} zone r=${r.zr.toFixed(0).padStart(3)} next r=${String(r.nr).padStart(2)} | dist to centre ${Math.hypot(r.x - r.zc[0], r.y - r.zc[1]).toFixed(1).padStart(5)}, to next centre ${Math.hypot(r.x - r.nc[0], r.y - r.nc[1]).toFixed(1).padStart(5)} | ${r.mode}/${r.leg} inZone=${r.inZone} zm=${Number.isFinite(r.zm) ? r.zm.toFixed(1) : 'inf'} tgt=${r.tgt} d=${r.td.toFixed(0)} boost=${r.boost}`)
  }
  return rows
}
run('A. alone, start 40 m outside the next circle', null, { x: C0.x - 35, y: C0.y - 30 })
run('B. passive enemy that walks to the next centre and stands there', shooter(false), { x: C0.x - 35, y: C0.y - 30 }, { x: C1.x, y: C1.y + 10 })
run('C. shooting enemy that walks to the next centre', shooter(true), { x: C0.x - 35, y: C0.y - 30 }, { x: C1.x, y: C1.y + 10 })
