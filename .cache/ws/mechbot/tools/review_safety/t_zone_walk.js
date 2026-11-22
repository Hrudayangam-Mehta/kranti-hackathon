// Does the brain reach a far zone circle on foot? Kinematic walk on the nav grid (move command x speed, wall
// sliding by axis), random starts in the main component, circle of radius 70 m centred 200-500 m away.
// Reports arrivals, time ratio against the straight line, and the cases that never arrive.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkZone, mulberry, pct } from './common.js'
const hello = realHello(), cfg = hello.config, m = cfg.mech
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const rnd = mulberry(Number(process.argv[2] || 21)), b = world.bounds
const N = Number(process.argv[3] || 120)
const mainPos = () => { for (;;) { const x = b.minX + 20 + rnd() * (b.maxX - b.minX - 40), y = b.minY + 20 + rnd() * (b.maxY - b.minY - 40); const c = nav.idx(x, y); if (c >= 0 && nav.pass[c] && nav.comp[c] === nav.mainComponent) return [x, y] } }
let ok = 0, fail = [], ratios = [], planFail = 0
for (let trial = 0; trial < N; trial++) {
  let [x, y] = mainPos(), cx, cy, d0
  for (;;) { [cx, cy] = mainPos(); d0 = Math.hypot(cx - x, cy - y); if (d0 > 200 && d0 < 500) break }
  const sx = x, sy = y
  const r0 = nav.findPath(x, y, cx, cy, { maxExpand: 4000 }); if (!r0.ok) planFail++
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  let energy = 100, arrived = -1, last = null, vx = 0, vy = 0
  const R = 70, maxK = Math.ceil((d0 / m.walk_speed) * 10 * 4) + 300
  for (let k = 0; k < maxK; k++) {
    const dz = Math.hypot(x - cx, y - cy)
    if (dz < R - 5) { arrived = k; break }
    const obs = mkObs(cfg, 3000 + k * 2, { self: mkSelf(cfg, { pos: [x, y, nav.levelAt(x, y)], vel: [vx, vy, 0], energy: +energy.toFixed(1), in_zone: false, hp: 1300 }),
      zone: mkZone({ center: [cx, cy], radius: R, next_center: [cx, cy], next_radius: R, shrink_start: 0, shrink_end: 1, dps: 20 }) })
    const a = brain.act(obs, performance.now() + 27.5)
    last = a
    const boosting = a.boost && energy > 0
    const sp = boosting ? m.boost_speed : m.walk_speed
    if (boosting) energy = Math.max(0, energy - m.boost_drain * 0.1); else energy = Math.min(100, energy + m.energy_regen * 0.1)
    const tryMove = (dx, dy) => { const nx = x + dx, ny = y + dy; if (nav.passableAt(nx, ny) && nav.walkLine(x, y, nx, ny)) { vx = dx / 0.1; vy = dy / 0.1; x = nx; y = ny; return true } return false }
    const dx = a.move[0] * sp * 0.1, dy = a.move[1] * sp * 0.1
    if (!(tryMove(dx, dy) || tryMove(dx, 0) || tryMove(0, dy))) { vx = vy = 0 }
  }
  if (arrived >= 0) { ok++; ratios.push((arrived * 0.1) / ((d0 - R) / m.walk_speed)) }
  else fail.push({ from: [Math.round(sx), Math.round(sy)], zone: [Math.round(cx), Math.round(cy)], d0: Math.round(d0), end: [Math.round(x), Math.round(y)], left: Math.round(Math.hypot(x - cx, y - cy)), firstPlanOk: r0.ok, c: brain.debugState().counters })
}
console.log(`arrived ${ok}/${N}; first 4000-expansion plan failed for ${planFail}; time / straight-line walking time: p50 ${pct(ratios, 0.5).toFixed(2)} p90 ${pct(ratios, 0.9).toFixed(2)} max ${Math.max(...ratios).toFixed(2)}`)
for (const f of fail.slice(0, 12)) console.log(`  NEVER ARRIVED from ${f.from} to circle at ${f.zone} (${f.d0} m): stopped at ${f.end}, ${f.left} m from the centre; first plan ok=${f.firstPlanOk}; plans ${f.c.plans} stuck ${f.c.stuck} abandons ${f.c.abandons}`)
