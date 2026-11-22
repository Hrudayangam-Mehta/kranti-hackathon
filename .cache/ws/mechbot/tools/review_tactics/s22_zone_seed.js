// Scenario 22: one squad match where the brain stays outside the zone (seed 156 of the dev simulator at review time).
// Prints position, distance to the zone edge and to the zone goal, path state and stuck counters around the episode.
import { runTrace, getCtx } from './lib_trace.js'
const args = process.argv.slice(2)
const seed = Number(args[0] ?? 156), from = Number(args[1] ?? 150), to = Number(args[2] ?? 225), every = Number(args[3] ?? 20)
const { nav } = getCtx()
const { rows, rec } = await runTrace(seed, { hook: (row, obs, a, B) => {
  const z = obs.zone
  row.edge = z.radius - Math.hypot(B.me.x - z.center[0], B.me.y - z.center[1])
  row.nextEdge = z.next_radius - Math.hypot(B.me.x - z.next_center[0], B.me.y - z.next_center[1])
  row.goalD = B.hasGoal ? Math.hypot(B.goalX - B.me.x, B.goalY - B.me.y) : -1
  row.gx = B.goalX; row.gy = B.goalY
  row.stuck = B.counters.stuck; row.abandons = B.counters.abandons; row.plans = B.counters.plans
  row.pass = nav.passableAt(B.me.x, B.me.y); row.gpass = B.hasGoal ? nav.passableAt(B.goalX, B.goalY) : null
  row.comp = nav.component(B.me.x, B.me.y); row.gcomp = B.hasGoal ? nav.component(B.goalX, B.goalY) : null
  row.jump = !!a.jump; row.grounded = B.me.grounded; row.zz = B.me.z
} })
let k = 0
for (const r of rows) {
  k++
  if (r.t < from || r.t > to || k % every) continue
  console.log(`t=${r.t.toFixed(1).padStart(6)} ${r.mode}/${r.leg} hp ${String(r.hp).padStart(4)} pos ${r.x.toFixed(0)},${r.y.toFixed(0)},${r.zz.toFixed(0)} sp ${r.sp} mv ${r.mv}${r.boost} inZone=${r.inZone ? 1 : 0} edge ${r.edge.toFixed(0)} nextEdge ${r.nextEdge.toFixed(0)} zm ${r.zm} goal ${r.gx.toFixed(0)},${r.gy.toFixed(0)} d=${r.goalD.toFixed(0)} goalPassable=${r.gpass} comp ${r.comp}/${r.gcomp} stuck ${r.stuck} abandons ${r.abandons} plans ${r.plans} en ${r.en} grounded=${r.grounded ? 1 : 0}`)
}
console.log(JSON.stringify({ seed, place: rec.place, kills: rec.kills, timeAlive: rec.timeAlive, cause: rec.cause }))
process.exit(0)
