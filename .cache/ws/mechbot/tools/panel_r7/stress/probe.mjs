// probe the map at given points: ground, nav level, component, wall distance, prism under/over, path to a goal
// usage: bun probe.mjs x y gx gy
import { World } from '../../../bot/lib/world.js'
import { Nav } from '../../../bot/lib/nav.js'
const [x, y, gx, gy] = process.argv.slice(2).map(Number)
const w = World.loadSync(process.env.PR7_MAPDIR || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/arena')
const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const c = nav.idx(x, y)
console.log({ ground: w.ground(x, y), level: nav.levelAt(x, y), surfZ: w.surfaceZ(x, y, nav.levelAt(x, y) + 0.6), pass: nav.passableAt(x, y), comp: nav.component(x, y), main: nav.mainComponent, compSize: nav.compSizes[nav.comp[c]], wallDist: nav.wallDistAt(x, y), prism: w.surfacePrism(x, y), clearance: nav.clearance[c] })
const pid = w.surfacePrism(x, y); if (pid >= 0) { const p = w.prisms[pid]; console.log('prism', pid, p.kind, 'base', p.base, 'top', p.top) }
const r = nav.findPath(x, y, gx, gy, { maxExpand: 25000 })
console.log('path', r && { ok: r.ok, len: r.len, n: r.pts && r.pts.length, pts: r.pts && r.pts.filter((_, i) => i % 5 === 0).map((p) => [Math.round(p[0]), Math.round(p[1])]) })
console.log('walkLine', nav.walkLine(x, y, gx, gy), 'reachable', nav.reachable(x, y, gx, gy))
for (let a = 0; a < 8; a++) { const dx = Math.cos(a * Math.PI / 4), dy = Math.sin(a * Math.PI / 4); let k = 0; for (; k < 30; k++) if (!nav.walkLine(x, y, x + dx * (k + 1), y + dy * (k + 1))) break; process.stdout.write(`dir${a * 45}:${k}m `) }
console.log()
