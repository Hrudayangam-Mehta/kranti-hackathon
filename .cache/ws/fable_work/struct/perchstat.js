import { join } from 'node:path'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const { World } = await import(join(S, 'r7work/ckpt_07_LG/lib/world.js'))
const { Nav } = await import(join(S, 'r7work/ckpt_07_LG/lib/nav.js'))
const world = World.loadSync(join(S, 'mechbot/kit/arena')), nav = new Nav(world, { cell: 2 })
const t0 = performance.now()
const { buildPerches } = await import(join(S, 'fable_work/struct/roofbot.js'))
const P = buildPerches(world, nav)
console.log('perches (H>=', process.env.STRUCT_MINH || 17, ', setback >=', process.env.STRUCT_MINSET || 9, '):', P.length, 'build ms', (performance.now() - t0).toFixed(0))
const zc = [41.3, -72.8]
for (const r of [560, 380, 240, 140]) console.log('  within', r, 'm of the start centre:', P.filter((p) => Math.hypot(p.x - zc[0], p.y - zc[1]) <= r - 25).length)
// replay spawns: distance to nearest perch launch
const sp = [[211.9,-270.59],[-360.07,-31.64],[-307.02,106.14],[120.75,-88.44],[1.77,-270.24],[-212.26,-46.48],[73.99,213.71],[335.74,-184.33],[393.84,193.81],[-273.49,-256.62],[301.59,-4.8],[459.75,-84.76],[-142.41,269.29],[8.57,13.36],[-130.87,89.01],[205.33,263.32]]
const d = sp.map((s) => Math.min(...P.flatMap((p) => p.launches.map((l) => Math.hypot(l.x - s[0], l.y - s[1]))))).sort((a, b) => a - b)
console.log('  distance from the 16 replay spawns to the nearest launch cell: min', d[0].toFixed(0), 'median', d[8].toFixed(0), 'max', d[15].toFixed(0), 'm  (walk 11.7 m/s)')
console.log('  climb heights:', P.map((p) => Math.min(...p.launches.map((l) => p.z - l.z)).toFixed(0)).sort((a, b) => a - b).join(' '))
