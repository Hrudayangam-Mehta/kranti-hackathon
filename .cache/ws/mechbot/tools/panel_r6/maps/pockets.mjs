// Every enclosed ground pocket (nav component other than the main one, >= 25 cells = 100 m2): does hopPlan find
// an exit with the V4 limits (maxHop 45, maxClimb 40), and with the energy-derived climb limit instead?
// usage: bun pockets.mjs <bot dir> <map name> <hello.json>
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const [BOT, NAME, HELLO] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(BOT, 'lib', 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(BOT, 'lib', 'nav.js')).href)
const cfg = JSON.parse(readFileSync(HELLO, 'utf8')).config, m = cfg.mech
const w = World.loadSync(join(HERE, NAME))
const nav = new Nav(w, { cell: 2, stepUp: m.step_up, maxSlopeDeg: m.max_slope_deg })
// climb a full tank buys: jump apex + rise at max_rise_speed for energy / jet_drain seconds
const climbCap = (m.jump_speed * m.jump_speed) / (2 * m.gravity) + m.max_rise_speed * (m.energy / m.jet_drain)
console.log(`mech: energy ${m.energy} jet_drain ${m.jet_drain} max_rise ${m.max_rise_speed} jump ${m.jump_speed} -> full-tank climb about ${climbCap.toFixed(0)} m`)
let none = 0, noneCells = 0, tot = 0, deep = 0
for (let k = 0; k < nav.compSizes.length; k++) {
  if (k === nav.mainComponent || nav.compSizes[k] < 25) continue
  tot++
  let c0 = -1
  for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k) { c0 = c; break }
  const x = nav.cellX(c0), y = nav.cellY(c0)
  const p = nav.hopPlan(x, y, {})
  const p2 = p ? p : nav.hopPlan(x, y, { maxClimb: climbCap * 0.85, maxHop: 60 })
  if (!p) { none++; noneCells += nav.compSizes[k]; if (p2) deep++ }
  if (!p) console.log(`  pocket ${k}: ${nav.compSizes[k]} cells at (${x.toFixed(0)},${y.toFixed(0)}) z ${nav.levelAt(x, y).toFixed(1)}: no exit with maxClimb 40 / maxHop 45; with the energy limit: ${p2 ? 'climb ' + p2.climb.toFixed(0) + ' m hop ' + p2.hopLen.toFixed(0) + ' m' : 'none'}`)
}
console.log(`${NAME}: ${tot} pockets >= 25 cells, ${none} without an exit (${noneCells * 4} m2), ${deep} of them reachable with the energy-derived limit`)
