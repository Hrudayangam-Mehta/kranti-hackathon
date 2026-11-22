import { join } from 'node:path'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const T = join(S, 'fable_work/struct/tree/lib')
const { World } = await import(join(T, 'world.js')); const { Nav } = await import(join(T, 'nav.js'))
const { buildPerches } = await import(join(T, 'sanctuary.js')); const { resolveParams } = await import(join(T, 'params.js'))
const cfg = JSON.parse((await import('node:fs')).readFileSync(join(S, 'mechbot/notes/hello_example.json'), 'utf8')).config
const world = World.loadSync(join(S, 'mechbot/kit/arena')); const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const P = resolveParams({ select: { sanc: 'heal' } })
const tab = buildPerches(world, nav, cfg, P)
console.log('build ms', tab.ms.toFixed(0), 'perches', tab.perches.length, 'pts', tab.perches.map((p) => p.pts.length).join(','))
// worst-case shadowPoint: 24 pts x 5 tracks x 2 casts at 60-200 m
let worst = 0, sum = 0, n = 0
for (let rep = 0; rep < 5; rep++) for (const p of tab.perches) {
  const t0 = process.cpuUsage()
  let c = 0
  for (const q of p.pts) for (let k = 0; k < 5; k++) { const a = k * 1.3 + rep, r = 60 + 35 * k, x = p.x + r * Math.cos(a), y = p.y + r * Math.sin(a), z = world.ground(x, y); c += world.shotClear(x, y, z + 7, q.x, q.y, p.z + 4.5) ? 1 : 0; c += world.shotClear(x, y, z + 7, q.x, q.y, p.z + 8.3) ? 1 : 0 }
  const u = process.cpuUsage(t0), ms = (u.user + u.system) / 1000
  if (rep > 0) { worst = Math.max(worst, ms); sum += ms; n++ }
}
console.log('shadowPoint worst-case CPU ms: max', worst.toFixed(2), 'mean', (sum / n).toFixed(2))
// edgePoint worst: 54 steps x (surfaceZ + shotClear) x 6 tracks
let w2 = 0
for (const p of tab.perches) { const t0 = process.cpuUsage(); let c = 0; for (let k = 0; k < 6; k++) for (let s = 0; s < 80; s += 1.5) { c += world.surfaceZ(p.x + s, p.y); c += world.shotClear(p.x + s * 0.2, p.y, p.z + 7, p.x + 150, p.y + 30 * k, 5) ? 1 : 0 } const u = process.cpuUsage(t0); w2 = Math.max(w2, (u.user + u.system) / 1000) }
console.log('edgePoint x6 worst CPU ms', w2.toFixed(2))
