const SP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const { World } = await import(SP + '/variants7/MX_p26/lib/world.js'), { Nav } = await import(SP + '/variants7/MX_p26/lib/nav.js')
const world = World.loadSync(SP + '/mechbot/kit/arena'), nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const me = { x: 97.3, y: -48.1 }
for (const b of [0, 0.3, -0.3, 0.75 * Math.PI, Math.PI, Math.PI / 2, -Math.PI / 2]) {
  const x = me.x + 30 * Math.cos(b), y = me.y + 30 * Math.sin(b)
  const r = nav.findPath(me.x, me.y, x, y, { maxExpand: 2500 })
  console.log(b.toFixed(2), 'walkLine', nav.walkLine(me.x, me.y, x, y), 'ok', r.ok, 'len', r.len.toFixed(1), 'exp', r.expanded, 'pass', nav.passableAt(x, y))
}
