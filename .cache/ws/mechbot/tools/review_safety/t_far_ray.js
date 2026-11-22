// world._rayTerrain marches the part of a segment that lies outside the terrain grid in 0.5 m steps (no block
// skipping there, guard 400000 iterations). Cost of rays whose far end is off the map, and what the brain does
// with a listed mech whose position is far outside the bounds (not a legal observation; robustness only).
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech } from './common.js'
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const b = world.bounds
const q = nav.nearestPassable(b.maxX - 40, 0, 60), z = nav.levelAt(q.x, q.y)
for (const far of [300, 1000, 5000, 20000, 90000]) {
  let best = Infinity
  for (let r = 0; r < 5; r++) { const t0 = performance.now(); world.shotClear(q.x, q.y, z + 7, q.x + far, q.y + far * 0.1, z + 4.5); best = Math.min(best, performance.now() - t0) }
  console.log(`shotClear from the east edge to a point ${far} m further east: ${best.toFixed(3)} ms (min of 5)`)
}
for (const far of [200, 5000, 90000]) {
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  let worst = Infinity, all = []
  for (let k = 0; k < 40; k++) {
    const obs = mkObs(cfg, k * 2, { self: mkSelf(cfg, { pos: [q.x, q.y, z] }), mechs: Array.from({ length: 10 }, (_, i) => mkMech(i < 3 ? i : i + 1, [q.x + far, q.y + far * 0.02 * (i - 5), z])), events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 5 }] })
    const t0 = performance.now(); brain.act(obs, t0 + 27.5); all.push(performance.now() - t0)
  }
  all.sort((a, b) => a - b)
  console.log(`decision with 10 listed mechs ${far} m east of the map edge: median ${all[20].toFixed(2)} ms, min ${all[0].toFixed(2)} ms; overruns ${brain.debugState().counters.overruns}`)
}
