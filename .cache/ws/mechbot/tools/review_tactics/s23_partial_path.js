// Scenario 23: the path flip-flop of scenario 22. The mover plans with maxExpand = PARAMS.pathExpand (4000) and follows
// whatever comes back, including partial paths. From two points 3 m apart in the pocket where the brain oscillated,
// print what findPath returns for 4000 / 8000 / 25000 expansions: complete or partial, length, first heading, time.
import { getCtx } from './lib_trace.js'
const { nav } = getCtx()
nav.setBody(2.5 * 1.1, 9 * 1.1)                      // the brain had two cubes at that time
const goal = [11, 178]
for (const from of [[48, 221], [50, 223], [49, 222], [47, 220]]) {
  for (const maxExpand of [2000, 4000, 8000, 25000]) {
    const t0 = performance.now()
    const r = nav.findPath(from[0], from[1], goal[0], goal[1], { maxExpand })
    const ms = performance.now() - t0
    const p1 = r.pts && r.pts.length > 1 ? r.pts[1] : null
    const head = p1 ? Math.atan2(p1[1] - from[1], p1[0] - from[0]) * 180 / Math.PI : NaN
    const end = r.pts && r.pts.length ? r.pts[r.pts.length - 1] : [NaN, NaN]
    console.log(`from (${from}) maxExpand ${String(maxExpand).padStart(5)}: ok=${r.ok} partial=${r.partial} len ${r.len.toFixed(0).padStart(4)} m, ${r.pts.length} pts, first heading ${head.toFixed(0).padStart(4)} deg, path ends ${Math.hypot(end[0] - goal[0], end[1] - goal[1]).toFixed(0)} m from the goal, expanded ${r.expanded}, ${ms.toFixed(1)} ms`)
  }
}
console.log('straight distance', Math.hypot(48 - 11, 221 - 178).toFixed(0), 'm; walkLine', nav.walkLine(48, 221, 11, 178))
