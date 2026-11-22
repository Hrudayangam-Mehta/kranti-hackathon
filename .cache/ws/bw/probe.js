const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
let t0 = performance.now()
const world = World.loadSync(P + '/kit/arena')
let t1 = performance.now()
const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
let t2 = performance.now()
console.log('world ms', (t1 - t0).toFixed(0), 'nav ms', (t2 - t1).toFixed(0), 'grid', nav.nx, nav.ny, 'bounds', JSON.stringify(world.bounds))
console.log('mainComponent', nav.mainComponent, 'keys', Object.keys(nav).join(','))
// spawn point in stream
const x = 320.21, y = -280.29
console.log('ground', world.ground(x, y), 'level', nav.levelAt(x, y), 'pass', nav.passableAt(x, y), 'comp', nav.component(x, y), 'wd', nav.wallDistAt(x, y))
t0 = performance.now()
let r
for (let k = 0; k < 20; k++) r = nav.findPath(x, y, -42, 7)
console.log('path ms', ((performance.now() - t0) / 20).toFixed(2), r.ok, r.pts.length, r.len.toFixed(0), r.expanded)
t0 = performance.now(); let c = 0
for (let k = 0; k < 100000; k++) { if (world.shotClear(x, y, 5, x + 100 * Math.cos(k), y + 100 * Math.sin(k), 5)) c++ }
console.log('ray us', ((performance.now() - t0) * 1000 / 100000).toFixed(2), c)
t0 = performance.now()
nav.setBody(2.625, 9.45)
console.log('setBody ms', (performance.now() - t0).toFixed(2))
