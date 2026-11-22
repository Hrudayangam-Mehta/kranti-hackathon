import { join } from 'node:path'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const T = join(S, 'fable_work/struct/tree/lib')
const { World } = await import(join(T, 'world.js')); const { Nav } = await import(join(T, 'nav.js'))
const { buildPerches } = await import(join(T, 'sanctuary.js')); const { resolveParams } = await import(join(T, 'params.js'))
const cfg = JSON.parse((await import('node:fs')).readFileSync(join(S, 'mechbot/notes/hello_example.json'), 'utf8')).config
const world = World.loadSync(join(S, 'mechbot/kit/arena')); const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const P = resolveParams({ select: { sanc: 'heal' } })
const tab = buildPerches(world, nav, cfg, P)
console.log('perches', tab.perches.length, 'ms', tab.ms.toFixed(0), 'minH', tab.minH.toFixed(1), 'maxClimb', tab.maxClimb.toFixed(1))
const c = cfg.zone.start_center
for (const p of tab.perches.sort((a, b) => a.expoNear - b.expoNear)) {
  const cl = Math.min(...p.launches.map((l) => l.climb))
  console.log(p.x.toFixed(0).padStart(5), p.y.toFixed(0).padStart(5), 'z', p.z.toFixed(1), 'sb', p.sb.toFixed(0), 'area', p.area, 'launches', p.launches.length, 'climb', cl.toFixed(1), 'expo', p.expo.toFixed(2), 'near', p.expoNear.toFixed(2), 'blindR', (p.sb * (cl - 7) / 4.5).toFixed(0), 'dC', Math.hypot(p.x - c[0], p.y - c[1]).toFixed(0))
}
