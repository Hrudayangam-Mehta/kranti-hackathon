import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, file] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js'); const { World } = await import(W + '/ref_bot/lib/world.js')
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'); const world = World.loadSync(W + '/kit/arena'); const mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const brain = createBrain(hello, { world, nav, log: () => {} }, { fuseMs: 1e9, select: { env: 'squad' } }); const B = brain._B
let i = 0, prev = 0, prevR = 0, prevC = 0
for (const o of msgs) if (o.type === 'obs') {
  brain.act(o, performance.now() + 27.5)
  const c = B.meta.cnt
  if (c.gunFin !== prev) { console.log('gunFin', i, 'mode', B.mode, 'zoneUrgent', B.zoneUrgent, 'doomed', B.doomed, 'lastStand', B.lastStand, 'tgt hp', B.target && B.target.hp, 'nLos', B.nLos, 'laser charge', B.me.laser && B.me.laser.charge); prev = c.gunFin }
  if (c.cubeDiff !== prevC) { console.log('cubeDiff', i, 'mode', B.mode, 'zoneUrgent', B.zoneUrgent, 'hpf', B.me.hpf.toFixed(2), 'nLos', B.nLos, 'cubes', B.me.cubes, 'grab', B.grab && B.grab.type, 'loot', B.loot && B.loot.type); prevC = c.cubeDiff }
  i++
}
