// Chair check: passable 2 m cells and largest connected walkable component versus cube count (body size).
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
function stats() {
  const n = nav.nx * nav.ny, seen = new Uint8Array(n); let pass = 0, best = 0
  const q = new Int32Array(n)
  for (let j = 0; j < nav.ny; j++) for (let i = 0; i < nav.nx; i++) {
    if (!nav.passable(i, j)) continue
    pass++
    const s = j * nav.nx + i
    if (seen[s]) continue
    let h = 0, t = 0, size = 0; q[t++] = s; seen[s] = 1
    while (h < t) {
      const c = q[h++]; size++
      const ci = c % nav.nx, cj = (c - ci) / nav.nx
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue
        const ni = ci + di, nj = cj + dj
        if (ni < 0 || nj < 0 || ni >= nav.nx || nj >= nav.ny) continue
        const k = nj * nav.nx + ni
        if (seen[k] || !nav.passable(ni, nj)) continue
        if (!nav.canStep(ci, cj, ni, nj)) continue
        seen[k] = 1; q[t++] = k
      }
    }
    if (size > best) best = size
  }
  return { pass, best }
}
for (const c of [0, 6, 10, 15, 21, 28]) {
  const r = 2.5 * (1 + 0.05 * c), h = 9 * (1 + 0.05 * c)
  try { nav.setBody(r, h) } catch (e) { console.log('setBody failed at', c, String(e)); break }
  const s = stats()
  console.log(JSON.stringify({ cubes: c, radius: +r.toFixed(2), height: +h.toFixed(1), passable: s.pass, largestComponent: s.best }))
}
