// Panel R6: identity of the io-patched copy (preset io 'v4', the default) with V4 on the kit stream, and how many actions
// change under io 'all'. Usage: bun identity.mjs
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const V4 = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot/lib'
const CP = P + '/tools/panel_r6/v4io/bot/lib'
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const { World } = await import(V4 + '/world.js'), { Nav } = await import(V4 + '/nav.js')
const world = World.loadSync(P + '/kit/arena')
const mk = () => new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const ctx = () => ({ world, nav: mk(), log: () => {} })
const A = (await import(V4 + '/brain.js')).createBrain(hello, ctx())
const B = (await import(CP + '/brain.js')).createBrain(hello, ctx())
const C = (await import(CP + '/brain.js')).createBrain(hello, ctx(), { select: { io: 'all' } })
let same = 0, diffAll = 0, n = 0
for (const o of obs) {
  const x = JSON.parse(JSON.stringify(o))
  const a = JSON.stringify(A.act(JSON.parse(JSON.stringify(x)), performance.now() + 1e6))
  const b = JSON.stringify(B.act(JSON.parse(JSON.stringify(x)), performance.now() + 1e6))
  const c = JSON.stringify(C.act(JSON.parse(JSON.stringify(x)), performance.now() + 1e6))
  n++; if (a === b) same++; if (a !== c) diffAll++
}
console.log(`identity io=v4 vs V4: ${same}/${n} identical; io=all differs on ${diffAll}/${n}`)
