// Checks that every transformed map is the original moved by its transform: ground, surface, solids and
// sight lines at random points agree. Also times World + Nav construction per map (the bot does this inside
// the hello budget). usage: bun verify_maps.mjs <V4 bot dir> [names...]
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const BOT = process.argv[2]
const { World } = await import(pathToFileURL(join(BOT, 'lib', 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(BOT, 'lib', 'nav.js')).href)
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['mirx', 'miry', 'rot90', 'tr300', 'lift40']
const T = {
  mirx: (x, y) => [-x, y], miry: (x, y) => [x, -y], rot90: (x, y) => [-y, x], tr300: (x, y) => [x + 300, y + 300], lift40: (x, y) => [x, y],
}
const DZ = { lift40: 40 }
let seed = 12345
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 }
const base = World.loadSync(join(HERE, 'base'))
const b = base.bounds
for (const n of names) {
  const w = World.loadSync(join(HERE, n)), f = T[n], dz = DZ[n] || 0
  let bad = 0, sight = 0, sightBad = 0
  for (let k = 0; k < 4000; k++) {
    const x = b.minX + 40 + rnd() * (b.maxX - b.minX - 80), y = b.minY + 40 + rnd() * (b.maxY - b.minY - 80)
    const [u, v] = f(x, y)
    const g0 = base.ground(x, y), g1 = w.ground(u, v) - dz
    const s0 = base.surfaceZ(x, y), s1 = w.surfaceZ(u, v) - dz
    if (Math.abs(g0 - g1) > 0.02 || Math.abs(s0 - s1) > 0.02) bad++
    const x2 = x + (rnd() - 0.5) * 300, y2 = y + (rnd() - 0.5) * 300
    const [u2, v2] = f(x2, y2)
    const z0 = s0 + 8, z2 = base.surfaceZ(x2, y2) + 4.5
    const a = base.canSee(x, y, z0, x2, y2, z2), c = w.canSee(u, v, z0 + dz, u2, v2, z2 + dz)
    sight++; if (a !== c) sightBad++
  }
  const t0 = performance.now()
  const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
  const ms = performance.now() - t0
  console.log(`${n}: height mismatches ${bad}/4000, sight mismatches ${sightBad}/${sight}, nav build ${ms.toFixed(0)} ms, components ${nav.compSizes.length}, main ${nav.compSizes[nav.mainComponent]}`)
}
{
  const t0 = performance.now(); const nav = new Nav(base, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }); const ms = performance.now() - t0
  console.log(`base: nav build ${ms.toFixed(0)} ms, components ${nav.compSizes.length}, main ${nav.compSizes[nav.mainComponent]}`)
}
