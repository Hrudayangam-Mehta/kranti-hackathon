// Panel 4: Killzone-style directional cover table. For every passable cell with wallDist <= 8 m store, for 16 yaw sectors,
// the free distance (m, cap 120) of a ray from the cell centre at body-centre height. Then test "post" selection rules.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
const NS = 16, CAP = 120
const nx = nav.nx, ny = nav.ny
const t0 = performance.now()
const slot = new Int32Array(nx * ny).fill(-1)
let n = 0
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (nav.passable(i, j) && nav.wallDist[j * nx + i] <= 8) slot[j * nx + i] = n++
const free = new Uint8Array(n * NS)
const cosS = new Float64Array(NS), sinS = new Float64Array(NS)
for (let k = 0; k < NS; k++) { cosS[k] = Math.cos(k * 2 * Math.PI / NS); sinS[k] = Math.sin(k * 2 * Math.PI / NS) }
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
  const sI = slot[j * nx + i]; if (sI < 0) continue
  const x = nav.x0 + (i + 0.5) * 2, y = nav.y0 + (j + 0.5) * 2, z = world.ground(x, y) + 4.5
  for (let k = 0; k < NS; k++) {
    const bx = x + cosS[k] * CAP, by = y + sinS[k] * CAP
    // shooter muzzle at ~ground+7 at the far end; flat approximation: same z + 2.5
    free[sI * NS + k] = Math.round(world.rayShot(x, y, z, bx, by, z + 2.5) * CAP)
  }
}
const buildMs = performance.now() - t0
// post metrics per cell: blocked = sectors with free < 25 m ; open = sectors with free >= 80 m
const blocked = new Uint8Array(n), open = new Uint8Array(n), run = new Uint8Array(n)
for (let sI = 0; sI < n; sI++) {
  let bl = 0, op = 0
  for (let k = 0; k < NS; k++) { const f = free[sI * NS + k]; if (f < 25) bl++; if (f >= 80) op++ }
  blocked[sI] = bl; open[sI] = op
  // longest contiguous run of blocked sectors (circular)
  let best = 0, cur = 0
  for (let k = 0; k < 2 * NS; k++) { if (free[sI * NS + (k % NS)] < 25) { cur++; if (cur > best) best = cur } else cur = 0 }
  run[sI] = Math.min(best, NS)
}
const hist = new Array(NS + 1).fill(0)
for (let sI = 0; sI < n; sI++) hist[blocked[sI]]++
console.log(JSON.stringify({ cells: n, tableKB: Math.round(n * NS / 1024), buildMs: Math.round(buildMs), blockedHist: hist }))

let s = 31337
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
const b = world.bounds
const exposed = (ex, ey, ez, x, y, z) => world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || world.shotClear(ex, ey, ez + 7, x, y, z + 8.5)
const cellsIdx = []
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (slot[j * nx + i] >= 0) cellsIdx.push(j * nx + i)
function test(label, pred, E) {
  const pool = cellsIdx.filter((c) => pred(slot[c], c))
  const hd = []; let noLos = 0, trials = 0, guard = 0, peekOk = 0, hideFound = 0
  while (trials < 1500 && guard++ < 200000 && pool.length) {
    const c = pool[Math.floor(rnd() * pool.length)]
    const i = c % nx, j = (c / nx) | 0
    const x = nav.x0 + (i + 0.5) * 2, y = nav.y0 + (j + 0.5) * 2, z = world.ground(x, y)
    // enemies at random bearings 60-150 m (must stand on passable ground); they may or may not have LOS
    const en = []; let any = false
    for (let e = 0; e < E; e++) {
      for (let t = 0; t < 60; t++) {
        const a = rnd() * 6.283, d = 60 + rnd() * 90
        const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d
        if (ex < b.minX + 5 || ex > b.maxX - 5 || ey < b.minY + 5 || ey > b.maxY - 5 || !nav.passableAt(ex, ey)) continue
        en.push(ex, ey, world.ground(ex, ey)); break
      }
    }
    if (en.length < 3 * E) continue
    trials++
    for (let k = 0; k < en.length; k += 3) if (exposed(en[k], en[k + 1], en[k + 2], x, y, z)) any = true
    if (!any) { noLos++; hd.push(0); hideFound++; continue }
    let best = Infinity, hbx = 0, hby = 0
    for (let dj = -15; dj <= 15; dj++) for (let di = -15; di <= 15; di++) {
      const dd = Math.hypot(di, dj) * 2
      if (dd > 30 || dd >= best) continue
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || !nav.passable(ii, jj)) continue
      const cx = nav.x0 + (ii + 0.5) * 2, cy = nav.y0 + (jj + 0.5) * 2, cz = world.ground(cx, cy)
      let ex = false
      for (let k = 0; k < en.length && !ex; k += 3) ex = exposed(en[k], en[k + 1], en[k + 2], cx, cy, cz)
      if (!ex && nav.walkLine(x, y, cx, cy)) { best = dd; hbx = cx; hby = cy }
    }
    hd.push(best)
    if (best < Infinity) hideFound++
  }
  const frac = (lim) => +(hd.filter((v) => v <= lim).length / hd.length).toFixed(3)
  console.log(JSON.stringify({ label, E, pool: pool.length, trials, alreadyHidden: +(noLos / trials).toFixed(3), hide_le4: frac(4), le8: frac(8), le12: frac(12), le20: frac(20), le30: frac(30) }))
}
for (const E of [1, 2, 3]) {
  test('blocked>=10 & open>=2', (sI) => blocked[sI] >= 10 && open[sI] >= 2, E)
  test('blocked>=10 & open>=1', (sI) => blocked[sI] >= 10 && open[sI] >= 1, E)
  test('any wallDist<=8', () => true, E)
  test('wallDist 3-5', (sI, c) => nav.wallDist[c] >= 3 && nav.wallDist[c] <= 5, E)
  test('blocked>=8', (sI) => blocked[sI] >= 8, E)
  test('blocked>=10', (sI) => blocked[sI] >= 10, E)
  test('blocked>=12', (sI) => blocked[sI] >= 12, E)
  test('blocked 9-13 & open>=2', (sI) => blocked[sI] >= 9 && blocked[sI] <= 13 && open[sI] >= 2, E)
}
// availability: distance from a random passable point (anywhere within 380 m of start centre) to the nearest cell with blocked>=10
{
  const zc = [41.3, -72.8]; const ds = []
  let trials = 0, guard = 0
  while (trials < 2000 && guard++ < 100000) {
    const a0 = rnd() * 6.283, r0 = Math.sqrt(rnd()) * 380
    const x = zc[0] + Math.cos(a0) * r0, y = zc[1] + Math.sin(a0) * r0
    if (x < b.minX + 10 || x > b.maxX - 10 || y < b.minY + 10 || y > b.maxY - 10 || !nav.passableAt(x, y)) continue
    trials++
    const i0 = Math.floor((x - nav.x0) / 2), j0 = Math.floor((y - nav.y0) / 2)
    let best = Infinity
    for (let ring = 0; ring <= 75 && ring * 2 < best + 2; ring++) for (let dj = -ring; dj <= ring; dj++) for (let di = -ring; di <= ring; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue
      const ii = i0 + di, jj = j0 + dj
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue
      const sI = slot[jj * nx + ii]; if (sI < 0 || blocked[sI] < 10 || open[sI] < 2) continue
      const dd = Math.hypot(di, dj) * 2; if (dd < best) best = dd
    }
    ds.push(best)
  }
  const c = Float64Array.from(ds).sort()
  console.log(JSON.stringify({ nearestPost_blocked10_open2: { median: c[c.length >> 1], p90: c[Math.floor(c.length * 0.9)], max: c[c.length - 1] } }))
}
