// Same simulator seed played several times in one process. The simulator and the house bots use no wall clock
// and no Math.random (grep), so any difference comes from the brain's wall-clock gates (planMinMs, optMinMs,
// slowMs -> budgetScale). Second pass: the same with those gates neutralised through createBrain overrides.
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { P } from './common.js'
const { makeContext, playMatch } = await import(join(P, 'sim', 'run.js'))
const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
const brainMod = await import(join(P, 'bot', 'lib', 'brain.js'))
const ctx = makeContext({ quiet: true })
let nav = null
async function play(seed, overrides) {
  const h = createHash('sha1'); let brain = null, n = 0, firstDiffHash = []
  const f = { team: () => ({ name: 'ours',
    hello(hh) { const mc = hh.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = brainMod.createBrain(hh, { world: ctx.world, nav, log: () => {} }, overrides); return { type: 'ready', name: 'ours' } },
    act(obs) { const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick; const s = JSON.stringify(a); h.update(s); firstDiffHash.push(s); n++; return a } }), opponents: [] }
  const rec = await playMatch(seed, { mode: 'ffa' }, ctx, f)
  const c = brain._B.counters
  return { place: rec.place, alive: rec.timeAlive, n, hash: h.digest('hex').slice(0, 10), acts: firstDiffHash, slow: c.slow, skipped: c.skipped, overruns: c.overruns }
}
const seeds = (process.argv[2] || '1,2').split(',').map(Number), reps = Number(process.argv[3] || 4)
for (const [label, ov] of [['default gates', undefined], ['gates neutralised (planMinMs/optMinMs = -1e9, slowMs = 1e9)', { planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 }]]) {
  console.log('== ' + label)
  for (const seed of seeds) {
    const rs = []
    for (let r = 0; r < reps; r++) rs.push(await play(seed, ov))
    let firstDiff = -1
    for (let r = 1; r < reps && firstDiff < 0; r++) for (let k = 0; k < Math.min(rs[0].acts.length, rs[r].acts.length); k++) if (rs[0].acts[k] !== rs[r].acts[k]) { firstDiff = k; break }
    console.log(`seed ${seed}: ` + rs.map((r) => `place ${r.place} alive ${r.alive}s n=${r.n} #${r.hash} slow=${r.slow} skipped=${r.skipped} overruns=${r.overruns}`).join(' | ') + ` => ${new Set(rs.map((r) => r.hash)).size === 1 ? 'IDENTICAL' : 'DIFFERENT (first differing decision #' + firstDiff + ')'}`)
  }
}
