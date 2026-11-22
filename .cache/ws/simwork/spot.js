import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { makeRng } from '../mechbot/sim/rng.js'
const ctx = makeContext({}); const w = ctx.world, cfg0 = ctx.cfg
const bots = Array.from({ length: 16 }, () => ({ name: 's', hello() {}, act: (o) => ({ tick: o.tick }) }))
const m = new Match({ world: w, nav: ctx.nav, collider: ctx.collider, seed: 1, config: cfg0, bots })
const NEAR = [[60, 0], [40, 0], [30, 0], [30, 10], [-30, 0], [20, 2], [22, -2], [6, 0], [35, 0], [-40, 0], [80, 0], [0, 12]]
const FAR = [[100, 0], [0, 100], [-100, 0], [-100, 30], [150, 80], [205, 0]]
const rng = makeRng(4242)
let cand = 0, failN = {}, failF = {}, nearOk = 0
for (let k = 0; k < 20000; k++) {
  const p = m._groundPoint(rng, cfg0.zone.start_center[0], cfg0.zone.start_center[1], 420, 24, 60, 1)
  if (!p) continue
  cand++
  let ok = true
  for (const [dx, dy] of NEAR) {
    const x = p[0] + dx, y = p[1] + dy, g = w.surfaceZ(x, y)
    let why = null
    if (!ctx.nav.passableAt(x, y)) why = 'pass'; else if (ctx.nav.wallDistAt(x, y) < 6) why = 'wall'; else if (Math.abs(g - p[2]) > 1.2) why = 'flat'; else if (Math.abs(g - w.ground(x, y)) > 0.01) why = 'prism'; else if (!w.canSee(p[0], p[1], p[2] + 8, x, y, g + 4.5)) why = 'see'
    if (why) { failN[why] = (failN[why] || 0) + 1; ok = false; break }
  }
  if (!ok) continue
  nearOk++
  for (const [dx, dy] of FAR) {
    const x = p[0] + dx, y = p[1] + dy, g = w.surfaceZ(x, y)
    let why = null
    if (Math.abs(g - w.ground(x, y)) > 0.01) why = 'prism'; else if (w.bodyBlocked(x, y, g, 2.5, 9, 1.2)) why = 'blocked'; else if (!w.canSee(p[0], p[1], p[2] + 8, x, y, g + 4.5)) why = 'see' + dx
    if (why) { failF[why] = (failF[why] || 0) + 1; ok = false; break }
  }
  if (ok) { console.log('FOUND', p); break }
}
console.log({ cand, nearOk, failN, failF })
