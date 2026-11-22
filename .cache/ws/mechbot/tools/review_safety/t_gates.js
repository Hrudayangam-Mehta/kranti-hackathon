// Same observation sequence, different wall-clock outcomes of the brain's time gates -> different actions?
// The sequence is the heavy generator driven by the recorded reference actions (out/heavy_a.jsonl), so every run
// sees byte-identical observations. Variants emulate what a stall does: slowMs = 0 (every decision counted
// "slow" -> budgetScale 0.5), planMinMs = 1e9 (the plan gate always finds too little time left).
import { readFileSync } from 'node:fs'
import { realHello, loadMap, loadBrainModule } from './common.js'
import { makeHeavy } from './gen_heavy.js'
const hello = realHello()
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const ref = readFileSync(new URL('./out/heavy_a.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const N = 3000
const gen = makeHeavy(hello, world, nav, { seed: 11 })
const obsSeq = []
for (let n = 0; n < N; n++) obsSeq.push(JSON.stringify(gen(n, n ? ref[n - 1] : null)))
const key = (a) => JSON.stringify([a.move.map((v) => Math.round(v * 1e4) / 1e4), a.boost, a.aim.map((v) => Math.round(v * 1e4) / 1e4), a.fire, !!a.jump, !!a.reload, a.pick, a.take, a.drop])
function run(over) {
  nav.setBody(2.5, 9)
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, ...over })
  const out = []
  for (let n = 0; n < N; n++) out.push(key(brain.act(JSON.parse(obsSeq[n]), performance.now() + 27.5)))
  return out
}
const base = run({}), again = run({})
const cmp = (a, b) => { let d = 0, first = -1; for (let i = 0; i < N; i++) if (a[i] !== b[i]) { d++; if (first < 0) first = i } return `${d} of ${N} decisions differ${d ? ' (first #' + first + ')' : ''}` }
console.log('default vs default (same process, unloaded):      ', cmp(base, again))
console.log('default vs slowMs=0 (budgetScale always 0.5):     ', cmp(base, run({ slowMs: 0 })))
console.log('default vs planMinMs=1e9 (plan gate always closed):', cmp(base, run({ planMinMs: 1e9 })))
console.log('default vs optMinMs=1e9 (optional stages skipped): ', cmp(base, run({ optMinMs: 1e9 })))
