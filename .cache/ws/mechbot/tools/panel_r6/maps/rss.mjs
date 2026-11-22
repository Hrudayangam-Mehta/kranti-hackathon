// RSS and build time of World + Nav for a map (what bot.js builds inside the hello budget). usage: bun rss.mjs <bot dir> <map dir>
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const [BOT, DIR] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(BOT, 'lib', 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(BOT, 'lib', 'nav.js')).href)
const r0 = process.memoryUsage().rss
const t0 = performance.now()
const w = World.loadSync(DIR)
const t1 = performance.now()
const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const t2 = performance.now()
console.log(`${DIR.split('/').pop()}: cells ${nav.n}, world ${(t1 - t0).toFixed(0)} ms, nav ${(t2 - t1).toFixed(0)} ms, rss +${((process.memoryUsage().rss - r0) / 1048576).toFixed(0)} MB (total ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB)`)
