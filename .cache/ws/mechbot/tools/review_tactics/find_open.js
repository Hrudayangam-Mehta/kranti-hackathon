// Review helper: find open strips on the map (clear walk line and shot line) for scenario scripts.
import { getCtx } from './lib_trace.js'
const { world, nav } = getCtx()
const bd = world.bounds
console.log('bounds', bd)
const out = []
for (let x = bd.minX + 60; x < bd.maxX - 60; x += 20) for (let y = bd.minY + 60; y < bd.maxY - 60; y += 20) {
  if (Math.hypot(x - 41.3, y + 72.8) > 380) continue
  if (!nav.passableAt(x, y) || nav.wallDistAt(x, y) < 12) continue
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 8, L = 230
    const x2 = x + L * Math.cos(a), y2 = y + L * Math.sin(a)
    if (!nav.passableAt(x2, y2)) continue
    if (!nav.walkLine(x, y, x2, y2)) continue
    const z1 = nav.levelAt(x, y), z2 = nav.levelAt(x2, y2)
    if (!world.shotClear(x, y, z1 + 7, x2, y2, z2 + 4.5) || !world.canSee(x, y, z1 + 8, x2, y2, z2 + 4.5)) continue
    // lateral room at both ends and in the middle
    let room = 1e9
    for (const f of [0, 0.25, 0.5, 0.75, 1]) room = Math.min(room, nav.wallDistAt(x + (x2 - x) * f, y + (y2 - y) * f))
    out.push({ x, y, a: +a.toFixed(3), room: +room.toFixed(1), dz: +(z2 - z1).toFixed(1) })
  }
}
out.sort((p, q) => q.room - p.room)
console.log(out.slice(0, 12))
