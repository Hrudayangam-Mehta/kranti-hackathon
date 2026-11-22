// usage: bun diag_stream.mjs <botdirA> <botdirB> [overridesJSON] : first differing decisions + meta counters of A
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [A, Bd, ovs] = process.argv.slice(2)
const ov = ovs ? JSON.parse(ovs) : undefined
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
const mk = async (dir) => {
  const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
  const world = World.loadSync(P + '/kit/arena')
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, ov)
}
const a = await mk(A), b = await mk(Bd)
let n = 0, d = 0, shown = 0
for (const o of obs) {
  const ax = a.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6), bx = b.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6)
  const x = JSON.stringify(ax), y = JSON.stringify(bx)
  n++
  if (x !== y) { d++; if (shown < 4) { shown++; const s = o.self; console.log(`#${n} t=${o.t} ammo=${s.weapons[0]?.ammo} hp=${s.hp}\n  A ${x}\n  B ${y}`) } }
}
const M = a._B.meta
console.log(`decisions ${n}, differ ${d}; A meta ${M ? JSON.stringify({ on: M.on, bits: M.bits, cnt: M.cnt }) : 'null'}; A env ${a._B.env} errors ${a._B.counters.errors} B errors ${b._B.counters.errors}`)
