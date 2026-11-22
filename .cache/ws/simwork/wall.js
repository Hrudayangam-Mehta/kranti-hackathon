import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
const ctx = makeContext({}); const w = ctx.world, cfg0 = ctx.cfg
const bots = Array.from({ length: 16 }, () => ({ name: 's', hello() {}, act: (o) => ({ tick: o.tick }) }))
const m = new Match({ world: w, nav: ctx.nav, collider: ctx.collider, seed: 1, config: cfg0, bots })
const q = m.mechs[0]
let best = null
for (const p of w.prisms) {
  if (p.kind !== 'building' || p.top - p.base < 12) continue
  const cx = (p.minX + p.maxX) / 2, cy = (p.minY + p.maxY) / 2
  const d = Math.hypot(cx - 0, cy - 0)
  if (!best || d < best.d) best = { p, cx, cy, d }
}
console.log('prism', best.p.minX, best.p.maxX, best.p.minY, best.p.maxY, best.p.base, best.p.top, 'ground', w.ground(best.cx, best.cy))
const c = ctx.nav.nearestPassable(best.cx + (best.p.maxX - best.p.minX) / 2 + 12, best.cy, 40)
q.x = c.x; q.y = c.y; q.z = w.surfaceZ(c.x, c.y); q.grounded = true
const dir = Math.atan2(best.cy - q.y, best.cx - q.x) + 0.5
for (let k = 0; k < 60; k++) {
  q.mvx = Math.cos(dir); q.mvy = Math.sin(dir)
  m._tick(); m._tick()
  if (k % 4 === 0) console.log(k, q.x.toFixed(2), q.y.toFixed(2), q.z.toFixed(2), 'v', q.vx.toFixed(2), q.vy.toFixed(2), q.grounded, 'pen', m.col.wallPen(q.x, q.y, q.z, 2.5, 9, 1.2).toFixed(3), 'wd', ctx.nav.wallDistAt(q.x, q.y).toFixed(1))
}
