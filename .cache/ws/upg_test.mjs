import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const dir = process.argv[2]
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
const world = World.loadSync(P + '/kit/arena')
const b = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} })
const choices = [{ id: 'plating' }, { id: 'gun_rate' }, { id: 'nanites' }]
let out = []
for (let i = 0; i < 40; i++) {
  const o = JSON.parse(JSON.stringify(obs[i]))
  if (i === 30) o.offer = { id: 777, choices }
  const a = b.act(o, performance.now() + 1e6)
  if (i === 30) out.push(JSON.stringify({ t: o.t, pick: a.pick }))
}
console.log(dir.split('/').slice(-2).join('/'), out.join(' '))
