// Panel 4: how far is the nearest hide cell (no line of fire from an enemy muzzle to our centre AND head)
// from a random exposed ground position, and how often does a hide cell have a peek neighbour within 4 m?
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
let s = 4242
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
const b = world.bounds
const zc = [41.3, -72.8]
function exposed(ex, ey, ez, x, y, z) {
  return world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || world.shotClear(ex, ey, ez + 7, x, y, z + 8.5)
}
const res = {}
for (const E of [1, 2, 3]) {
  const dist = [], pathd = [], peek = [], wall = []
  let trials = 0, guard = 0
  while (trials < 1500 && guard++ < 400000) {
    const ang0 = rnd() * 6.283, r0 = Math.sqrt(rnd()) * 380
    const x = zc[0] + Math.cos(ang0) * r0, y = zc[1] + Math.sin(ang0) * r0
    if (x < b.minX + 10 || x > b.maxX - 10 || y < b.minY + 10 || y > b.maxY - 10) continue
    if (!nav.passableAt(x, y)) continue
    const z = world.ground(x, y)
    const en = []
    let ok = true
    for (let e = 0; e < E && ok; e++) {
      let found = false
      for (let t = 0; t < 40 && !found; t++) {
        const a = rnd() * 6.283, d = 60 + rnd() * 90
        const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d
        if (ex < b.minX + 5 || ex > b.maxX - 5 || ey < b.minY + 5 || ey > b.maxY - 5) continue
        if (!nav.passableAt(ex, ey)) continue
        const ez = world.ground(ex, ey)
        if (!world.shotClear(ex, ey, ez + 7, x, y, z + 4.5)) continue   // enemy must currently have a line of fire
        en.push(ex, ey, ez); found = true
      }
      if (!found) ok = false
    }
    if (!ok) continue
    trials++
    // nearest hide cell within 40 m on the 2 m grid
    const i0 = Math.floor((x - nav.x0) / 2), j0 = Math.floor((y - nav.y0) / 2), rc = 20
    let bestD = Infinity, bx = 0, by = 0
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
      const dd = Math.hypot(di, dj) * 2
      if (dd > 40 || dd >= bestD) continue
      const i = i0 + di, j = j0 + dj
      if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
      const cx = nav.x0 + (i + 0.5) * 2, cy = nav.y0 + (j + 0.5) * 2, cz = world.ground(cx, cy)
      let ex = false
      for (let k = 0; k < en.length && !ex; k += 3) ex = exposed(en[k], en[k + 1], en[k + 2], cx, cy, cz)
      if (!ex) { bestD = dd; bx = cx; by = cy }
    }
    dist.push(bestD)
    if (bestD < Infinity) {
      const p = nav.findPath(x, y, bx, by, { maxExpand: 4000 })
      pathd.push(p.ok ? p.len : Infinity)
      wall.push(nav.wallDistAt(bx, by))
      // peek neighbour: a passable cell within 4 m of the hide cell with a line of fire to enemy 0 (muzzle -> their centre)
      let pk = false
      const hi = Math.floor((bx - nav.x0) / 2), hj = Math.floor((by - nav.y0) / 2)
      for (let dj = -2; dj <= 2 && !pk; dj++) for (let di = -2; di <= 2 && !pk; di++) {
        if (!di && !dj) continue
        const i = hi + di, j = hj + dj
        if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
        const cx = nav.x0 + (i + 0.5) * 2, cy = nav.y0 + (j + 0.5) * 2, cz = world.ground(cx, cy)
        if (world.shotClear(cx, cy, cz + 7, en[0], en[1], en[2] + 4.5) && nav.walkLine(bx, by, cx, cy)) pk = true
      }
      peek.push(pk ? 1 : 0)
    } else pathd.push(Infinity)
  }
  const q = (a, p) => { const c = Float64Array.from(a).sort(); return c[Math.min(c.length - 1, Math.floor(p * c.length))] }
  const frac = (a, lim) => +(a.filter((v) => v <= lim).length / a.length).toFixed(3)
  res['E' + E] = {
    trials,
    straight: { le10: frac(dist, 10), le20: frac(dist, 20), le30: frac(dist, 30), le40: frac(dist, 40), median: q(dist, 0.5) },
    path: { le15: frac(pathd, 15), le25: frac(pathd, 25), le40: frac(pathd, 40), le60: frac(pathd, 60), median: +q(pathd, 0.5).toFixed(1), p75: +q(pathd, 0.75).toFixed(1) },
    peekNeighbourFrac: +(peek.reduce((x, y) => x + y, 0) / Math.max(1, peek.length)).toFixed(3),
    hideWallDistMedian: +q(wall, 0.5).toFixed(1)
  }
}
console.log(JSON.stringify(res, null, 1))
