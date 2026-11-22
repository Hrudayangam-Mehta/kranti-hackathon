// usage: bun cnt.mjs <dir> <stream> <mapdir> <answers.out>  -> answers + plan counters
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const [dir, stream, mapdir, out] = process.argv.slice(2)
const lines = gunzipSync(readFileSync(stream)).toString().split('\n').filter(Boolean)
const { World } = await import(dir + '/lib/world.js'); const { Nav } = await import(dir + '/lib/nav.js'); const mod = await import(dir + '/lib/brain.js')
const hello = JSON.parse(lines[0]); const world = World.loadSync(mapdir, { files: hello.map.files }); const m = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
let calls = 0, exp = 0; const f0 = nav.findPath; nav.findPath = function (...a) { const r = f0.apply(this, a); calls++; exp += nav.lastExpanded || 0; return r }
const brain = mod.createBrain(hello, { world, nav, log: () => {} }); calls = 0; exp = 0
let ans = ''
for (let i = 1; i < lines.length; i++) { const o = JSON.parse(lines[i]); if (o.type !== 'obs') continue; ans += JSON.stringify(brain.act(o, performance.now() + 1e6)) + '\n' }
writeFileSync(out, ans); const c = brain._B.counters
console.log(dir.split('/').pop(), stream.split('/').pop(), 'findPath calls', calls, 'expansions', exp, 'plans', c.plans, 'cached', c.plansCached || 0, 'fuse', c.fuse)
