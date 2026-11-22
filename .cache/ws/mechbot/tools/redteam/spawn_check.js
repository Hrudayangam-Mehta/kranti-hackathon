// Red-team tool: which known real spawn points lie in ground pockets that cannot be left on foot?
import { World } from './snap/bot/lib/world.js'
import { Nav } from './snap/bot/lib/nav.js'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const ROOT = new URL('./snap/', import.meta.url).pathname
const world = World.loadSync(ROOT + 'kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const hdr = JSON.parse(gunzipSync(readFileSync(ROOT + '../../../replay/mech16.jsonl.gz')).toString('utf8').split('\n')[0])
const pts = hdr.mechs.map((m) => ({ who: 'replay ' + m.id + ' ' + m.name, p: m.spawn }))
const st = gunzipSync(readFileSync(ROOT + 'kit/check/stream.jsonl.gz')).toString('utf8').split('\n')
pts.push({ who: 'kit stream self', p: JSON.parse(st[1]).self.pos })
let pocket = 0
for (const q of pts) {
  const [x, y, z] = q.p
  const c = nav.component(x, y), main = c === nav.mainComponent
  const lvl = nav.levelAt(x, y), roof = z - lvl > 2
  let hop = null
  if (!main && !roof) { hop = nav.hopPlan(x, y, { maxClimb: 60 }); pocket++ }
  console.log(`${q.who.padEnd(22)} (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(1)}) level ${lvl.toFixed(1)} comp ${c}${main ? ' main' : ' POCKET size ' + nav.compSizes[c] * 4 + ' m2'}${roof ? ' ON ROOF' : ''}${hop ? ` hop climb ${hop.climb.toFixed(1)} m len ${hop.hopLen.toFixed(0)} m walk ${hop.walkLen.toFixed(0)} m` : ''}`)
}
console.log(JSON.stringify({ spawns: pts.length, inPocket: pocket }))
