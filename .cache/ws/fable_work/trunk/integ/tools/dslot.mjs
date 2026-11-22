// integ dslot.mjs = trunk/tools/dstream.mjs + env SLOT (hello.slot rewritten on both sides). FUSE=1: {fuseMs: 1e9} both sides.
// usage: bun dslot.mjs <botdirA> <botdirB> : decisions that differ on the kit stream (same world, fresh nav each)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [A, B] = process.argv.slice(2)
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], obs = lines.filter((l) => l.type === 'obs')
if (process.env.SLOT !== undefined && process.env.SLOT !== '') hello.slot = +process.env.SLOT
const mk = async (dir) => {
  const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
  const world = World.loadSync(P + '/kit/arena')
  const ov = process.env.FUSE === '1' ? { fuseMs: 1e9 } : {}
  return createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, ov)
}
const a = await mk(A), b = await mk(B)
let n = 0, d = 0, first = -1
for (const o of obs) {
  const x = JSON.stringify(a.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  const y = JSON.stringify(b.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6))
  n++; if (x !== y) { d++; if (first < 0) first = n }
}
const va = a._B.variant, vb = b._B.variant
console.log(`slot ${hello.slot}: decisions ${n}, differ ${d}, first difference at ${first}; A variant ${va ? va.ch + '/' + va.name : '-'} B variant ${vb ? vb.ch + '/' + vb.name : '-'}`)
