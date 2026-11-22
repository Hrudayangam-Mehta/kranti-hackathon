import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
const count = () => { let n = 0; for (let j = 0; j < nav.ny; j++) for (let i = 0; i < nav.nx; i++) if (nav.passable(i, j)) n++; return n }
console.log('base passable', count())
for (const c of [1, 3, 6, 10, 15]) {
  const t = performance.now()
  nav.setBody(2.5 * (1 + 0.05 * c), 9 * (1 + 0.05 * c))
  console.log(JSON.stringify({ cubes: c, radius: +(2.5 * (1 + 0.05 * c)).toFixed(2), height: +(9 * (1 + 0.05 * c)).toFixed(1), setBodyMs: +(performance.now() - t).toFixed(1), passable: count() }))
}
// time-to-step helper check
const a = 58.5, v = 11.7
const tStep = (d, vv = v) => d <= vv * vv / (2 * a) ? Math.sqrt(2 * d / a) : vv / a + (d - vv * vv / (2 * a)) / vv
console.log(JSON.stringify({ tStep4_walk: +tStep(4).toFixed(3), tStep6_walk: +tStep(6).toFixed(3), tStep4_boost: +tStep(4, 19.5).toFixed(3), tStep3_half: +tStep(3, 5.85).toFixed(3), tStep4_half: +tStep(4, 5.85).toFixed(3), brakeWalk: +(v * v / (2 * a)).toFixed(2), brakeBoost: +(19.5 * 19.5 / (2 * a)).toFixed(2) }))
