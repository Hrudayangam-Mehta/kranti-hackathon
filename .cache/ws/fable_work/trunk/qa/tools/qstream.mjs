// QA stream diff (independent of the integrator's tools). usage: bun qstream.mjs <stream.jsonl.gz> <botdirA> <botdirB> [botdirC]
// env SLOT (hello.slot rewritten on all sides), FUSE=1 ({fuseMs:1e9} on all sides), OVR (extra overrides JSON merged on all sides),
// ENV=squad|ffa (squad: select.env='squad'; ffa: plain override env:'ffa' as recs.js does). Each side loads its own lib/*.js.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [stream, ...dirs] = process.argv.slice(2)
const lines = gunzipSync(readFileSync(stream)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), obs = lines.filter((l) => l.type === 'obs')
if (process.env.SLOT !== undefined && process.env.SLOT !== '') hello.slot = +process.env.SLOT
const mk = async (dir) => {
  const { World } = await import(dir + '/lib/world.js'), { Nav } = await import(dir + '/lib/nav.js'), { createBrain } = await import(dir + '/lib/brain.js')
  const world = World.loadSync(P + '/kit/arena')
  const mc = hello.config.mech
  const ov = { ...(process.env.OVR ? JSON.parse(process.env.OVR) : {}) }
  if (process.env.FUSE === '1') ov.fuseMs = 1e9
  if (process.env.ENV === 'squad') ov.select = { ...(ov.select || {}), env: 'squad' }
  if (process.env.ENV === 'ffa') ov.env = 'ffa'
  return createBrain(JSON.parse(JSON.stringify(hello)), { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, ov)
}
const brains = []
for (const d of dirs) brains.push(await mk(d))
const hs = dirs.map(() => createHash('sha256'))
let n = 0; const diff = dirs.map(() => 0), first = dirs.map(() => -1)
for (const o of obs) {
  const outs = brains.map((b) => JSON.stringify(b.act(JSON.parse(JSON.stringify(o)), performance.now() + 1e6)))
  n++
  outs.forEach((s, i) => hs[i].update(s + '\n'))
  for (let i = 1; i < outs.length; i++) if (outs[i] !== outs[0]) { diff[i]++; if (first[i] < 0) first[i] = n }
}
const info = brains.map((b) => { const B = b._B, c = B.counters || {}; const sv = Object.entries(c).filter(([k]) => k.startsWith('sv')).map(([k, v]) => k + '=' + v).join(',')
  return `variant=${B.variant ? B.variant.ch + '/' + B.variant.name + '/salt' + B.variant.salt : 'none'} live=${B.variantLive === undefined ? '-' : B.variantLive} offTick=${c.variantOffTick ?? '-'} env=${B.env} fd=${B.foreignDeaths} err=${c.errors || 0} fuse=${c.fuse || 0} sv[${sv}]` })
console.log(`slot ${hello.slot} env=${process.env.ENV || 'auto'} fuse=${process.env.FUSE === '1'} decisions ${n}`)
// final P of each side against A on the keys both hold (the V-guard must have written the base back), plus keys only one side has
const pd = brains.map((b, i) => { if (!i) return ''; const A = brains[0]._B.P, B = b._B.P; const both = Object.keys(A).filter((k) => k in B && k !== 'selected')
  const dif = both.filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k])); const onlyB = Object.keys(B).filter((k) => !(k in A)).length, onlyA = Object.keys(A).filter((k) => !(k in B)).length
  return `Pdiff(shared ${both.length}): ${dif.length}${dif.length ? ' [' + dif.slice(0, 8).join(',') + ']' : ''} onlyB ${onlyB} onlyA ${onlyA}` })
dirs.forEach((d, i) => console.log(`  ${String.fromCharCode(65 + i)} ${hs[i].digest('hex').slice(0, 16)} ${i ? `vs A: differ ${diff[i]} first ${first[i]}` : '(reference)'} | ${info[i]} | ${pd[i]} | ${d.replace(/.*scratchpad\//, '')}`))
