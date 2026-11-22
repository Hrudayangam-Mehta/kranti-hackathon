import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0]
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2 })
for (const useMap of [true, false]) {
  const logs = []
  const brain = createBrain(hello, useMap ? { world, nav, log: (...a) => logs.push(a.join(' ')) } : { world: null, nav: null, log: (...a) => logs.push(a.join(' ')) })
  const times = []
  let modes = {}
  for (const o of lines) {
    if (o.type !== 'obs') continue
    const t0 = performance.now()
    const a = brain.act(o, t0 + 27.5)
    times.push(performance.now() - t0)
    const d = brain.debugState()
    modes[d.mode + '/' + d.leg] = (modes[d.mode + '/' + d.leg] || 0) + 1
  }
  times.sort((a, b) => a - b)
  console.log(useMap ? 'MAP' : 'NOMAP', 'mean', (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2), 'p99', times[Math.floor(times.length * 0.99)].toFixed(2), 'max', times[times.length - 1].toFixed(2))
  console.log(JSON.stringify(modes))
  console.log(JSON.stringify(brain.debugState().counters), JSON.stringify(brain.debugState().errors))
  for (const l of logs.slice(0, 5)) console.log('LOG', l)
}
