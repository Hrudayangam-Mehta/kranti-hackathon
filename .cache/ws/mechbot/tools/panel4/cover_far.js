// Panel 4: far cover search. Candidates = passable cells with wallDist in [2.5, 6] m ("wall-adjacent"), searched out to 120 m.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
let s = 777
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
const b = world.bounds, zc = [41.3, -72.8]
// global stats: share of passable cells that are wall-adjacent
let nPass = 0, nAdj = 0, nAdj4 = 0
for (let j = 0; j < nav.ny; j++) for (let i = 0; i < nav.nx; i++) {
  if (!nav.passable(i, j)) continue
  nPass++
  const w = nav.wallDist[j * nav.nx + i]
  if (w >= 2.5 && w <= 6) nAdj++
  if (w >= 2.5 && w <= 4.5) nAdj4++
}
console.log(JSON.stringify({ passableCells: nPass, wallAdj_2p5_6: nAdj, share: +(nAdj / nPass).toFixed(3), wallAdj_2p5_4p5: nAdj4 }))
const exposed = (ex, ey, ez, x, y, z) => world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || world.shotClear(ex, ey, ez + 7, x, y, z + 8.5)
for (const E of [1, 2, 3]) {
  const dAll = [], dAdj = [], cells = [], rays = [], ms = [], selfWall = []
  let trials = 0, guard = 0
  while (trials < 1200 && guard++ < 400000) {
    const a0 = rnd() * 6.283, r0 = Math.sqrt(rnd()) * 380
    const x = zc[0] + Math.cos(a0) * r0, y = zc[1] + Math.sin(a0) * r0
    if (x < b.minX + 10 || x > b.maxX - 10 || y < b.minY + 10 || y > b.maxY - 10 || !nav.passableAt(x, y)) continue
    const z = world.ground(x, y)
    const en = []; let ok = true
    for (let e = 0; e < E && ok; e++) {
      let found = false
      for (let t = 0; t < 40 && !found; t++) {
        const a = rnd() * 6.283, d = 60 + rnd() * 90
        const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d
        if (ex < b.minX + 5 || ex > b.maxX - 5 || ey < b.minY + 5 || ey > b.maxY - 5 || !nav.passableAt(ex, ey)) continue
        const ez = world.ground(ex, ey)
        if (!world.shotClear(ex, ey, ez + 7, x, y, z + 4.5)) continue
        en.push(ex, ey, ez); found = true
      }
      if (!found) ok = false
    }
    if (!ok) continue
    trials++
    selfWall.push(nav.wallDistAt(x, y))
    const t0 = performance.now()
    const i0 = Math.floor((x - nav.x0) / 2), j0 = Math.floor((y - nav.y0) / 2), rc = 60
    let best = Infinity, n = 0, r = 0
    // expanding square rings so we can stop early
    for (let ring = 0; ring <= rc && ring * 2 < best + 2; ring++) {
      for (let dj = -ring; dj <= ring; dj++) for (let di = -ring; di <= ring; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue
        const dd = Math.hypot(di, dj) * 2
        if (dd > 120 || dd >= best) continue
        const i = i0 + di, j = j0 + dj
        if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
        const w = nav.wallDist[j * nav.nx + i]
        if (w < 2.5 || w > 6) continue
        const cx = nav.x0 + (i + 0.5) * 2, cy = nav.y0 + (j + 0.5) * 2, cz = world.ground(cx, cy)
        n++
        let ex = false
        for (let k = 0; k < en.length && !ex; k += 3) { ex = exposed(en[k], en[k + 1], en[k + 2], cx, cy, cz); r += 2 }
        if (!ex) best = dd
      }
    }
    ms.push(performance.now() - t0); cells.push(n); rays.push(r)
    dAdj.push(best)
  }
  const q = (a, p) => { const c = Float64Array.from(a).sort(); return c[Math.min(c.length - 1, Math.floor(p * c.length))] }
  const frac = (a, lim) => +(a.filter((v) => v <= lim).length / a.length).toFixed(3)
  console.log(JSON.stringify({ E, trials, wallAdjHide: { le20: frac(dAdj, 20), le40: frac(dAdj, 40), le60: frac(dAdj, 60), le80: frac(dAdj, 80), le120: frac(dAdj, 120), median: +q(dAdj, 0.5).toFixed(0), p75: +q(dAdj, 0.75).toFixed(0) },
    meanCells: Math.round(cells.reduce((x, y) => x + y, 0) / cells.length), meanMs: +(ms.reduce((x, y) => x + y, 0) / ms.length).toFixed(2), p99Ms: +q(ms, 0.99).toFixed(2),
    selfWallDistMedian: +q(selfWall, 0.5).toFixed(1) }))
}
// How does starting close to a wall change things? condition on self wallDist <= 8 m
{
  const E = 2; const near = [], far = []
  let trials = 0, guard = 0
  while (trials < 2500 && guard++ < 600000) {
    const a0 = rnd() * 6.283, r0 = Math.sqrt(rnd()) * 380
    const x = zc[0] + Math.cos(a0) * r0, y = zc[1] + Math.sin(a0) * r0
    if (x < b.minX + 10 || x > b.maxX - 10 || y < b.minY + 10 || y > b.maxY - 10 || !nav.passableAt(x, y)) continue
    const z = world.ground(x, y)
    const en = []; let ok = true
    for (let e = 0; e < E && ok; e++) {
      let found = false
      for (let t = 0; t < 40 && !found; t++) {
        const a = rnd() * 6.283, d = 60 + rnd() * 90
        const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d
        if (ex < b.minX + 5 || ex > b.maxX - 5 || ey < b.minY + 5 || ey > b.maxY - 5 || !nav.passableAt(ex, ey)) continue
        const ez = world.ground(ex, ey)
        if (!world.shotClear(ex, ey, ez + 7, x, y, z + 4.5)) continue
        en.push(ex, ey, ez); found = true
      }
      if (!found) ok = false
    }
    if (!ok) continue
    trials++
    const i0 = Math.floor((x - nav.x0) / 2), j0 = Math.floor((y - nav.y0) / 2)
    let best = Infinity
    for (let dj = -20; dj <= 20; dj++) for (let di = -20; di <= 20; di++) {
      const dd = Math.hypot(di, dj) * 2
      if (dd > 40 || dd >= best) continue
      const i = i0 + di, j = j0 + dj
      if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
      const cx = nav.x0 + (i + 0.5) * 2, cy = nav.y0 + (j + 0.5) * 2, cz = world.ground(cx, cy)
      let ex = false
      for (let k = 0; k < en.length && !ex; k += 3) ex = exposed(en[k], en[k + 1], en[k + 2], cx, cy, cz)
      if (!ex) best = dd
    }
    ;(nav.wallDistAt(x, y) <= 8 ? near : far).push(best)
  }
  const frac = (a, lim) => +(a.filter((v) => v <= lim).length / a.length).toFixed(3)
  console.log(JSON.stringify({ E, startWallDist_le8: { n: near.length, hide_le10: frac(near, 10), le20: frac(near, 20), le40: frac(near, 40) }, startWallDist_gt8: { n: far.length, hide_le10: frac(far, 10), le20: frac(far, 20), le40: frac(far, 40) } }))
}
