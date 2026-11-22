// Equivariance probe: runs the brain in-process (as bot/bot.js wires it) over a map's transformed conformance
// stream and records every action plus the brain's mode / leg / target. compare.py maps the actions of a
// transformed map back and diffs them against the base map: a bot with no absolute-coordinate dependence
// gives the same decisions (up to grid anchoring for mirrors / rotations; exactly for grid-aligned translations).
// usage: bun equiv.mjs <bot dir> <map name> <out.json> [overrides.json]
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const [BOT, NAME, OUT, OVR] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(BOT, 'lib', 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(BOT, 'lib', 'nav.js')).href)
const { createBrain } = await import(pathToFileURL(join(BOT, 'lib', 'brain.js')).href)
const lines = gunzipSync(readFileSync(join(HERE, NAME, 'stream.jsonl.gz'))).toString('utf8').split('\n').filter((l) => l.trim())
const msgs = lines.map((l) => JSON.parse(l))
const hello = msgs[0]
hello.map.dir = join(HERE, NAME)
let world = null
for (const sub of ['', hello.map.files[0].split('/')[0]]) {
  try { world = World.loadSync(join(HERE, NAME, sub)); break } catch { /* next */ }
}
const m = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
const brain = createBrain(hello, { world, nav, log: () => {} }, OVR ? JSON.parse(readFileSync(OVR, 'utf8')) : undefined)
const rec = []
let worst = 0
for (const o of msgs) {
  if (o.type !== 'obs') continue
  const t0 = performance.now()
  const a = brain.act(o, t0 + 27.5)
  const ms = performance.now() - t0
  if (ms > worst) worst = ms
  const B = brain._B
  rec.push({ tick: o.tick, move: a.move, aim: a.aim, fire: a.fire, boost: !!a.boost, jump: !!a.jump, take: a.take ?? -1,
    mode: B.mode, leg: B.legKind, tgt: B.target ? B.target.id : -1, goal: B.hasGoal ? [B.goalX, B.goalY] : null, hide: B.hide.state,
    hx: B.hide.state === 'found' ? [B.hide.x, B.hide.y] : null })
}
writeFileSync(OUT, JSON.stringify({ name: NAME, worstMs: worst, errors: brain._B.counters.errors, stages: brain._B.errorsByStage, rec }))
console.log(`${NAME}: ${rec.length} decisions, worst ${worst.toFixed(1)} ms, errors ${brain._B.counters.errors}`)
