import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const lib=S+'/fable_work/chaos/builds/CH1_s1/bot/lib'
const { createBrain } = await import(lib + '/brain.js'), { World } = await import(lib + '/world.js'), { Nav } = await import(lib + '/nav.js')
const msgs = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), mc = hello.config.mech
const world = World.loadSync(S + '/mechbot/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const b = createBrain(hello, { world, nav, log: () => {} }, { fuseMs: 1e9, warmup: false })
console.log('config ids', hello.config.upgrades.map(u=>u.id).join(','))
console.log('upgOrderSq', b._B.upgOrderSq.join(','))
console.log('upgOrder  ', b._B.upgOrder.join(','))
