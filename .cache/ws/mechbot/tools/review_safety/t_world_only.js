// world loaded but nav = null (nav module or constructor failed): replay the kit stream, a recorded sim match and
// the heavy generator through the brain and count stage errors. Also nav present but world = null.
import { readFileSync } from 'node:fs'
import { realHello, loadMap, loadBrainModule, loadStream, rawProblems } from './common.js'
import { makeHeavy } from './gen_heavy.js'
const hello = realHello()
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const kit = loadStream().filter((l) => l.type === 'obs')
const rec = readFileSync(new URL('./out/ffa1.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.type === 'obs')
for (const [label, ctx] of [['world only (nav null)', { world, nav: null }], ['nav only (world null)', { world: null, nav }]]) {
  for (const [name, mk, n] of [['kit stream', (k) => kit[k], kit.length], ['recorded sim match', (k) => rec[k], rec.length], ['heavy generator', null, 3000]]) {
    const logs = []
    const brain = createBrain(hello, { ...ctx, log: (...a) => logs.push(a.join(' ')) }, { warmup: false })
    nav.setBody(2.5, 9)
    const gen = mk || makeHeavy(hello, world, nav, { seed: 3 })
    let last = null, raw = 0, thrown = 0
    for (let k = 0; k < n; k++) { let a = null; try { a = brain.act(JSON.parse(JSON.stringify(gen(k, last))), performance.now() + 27.5) } catch { thrown++ } raw += rawProblems(a).length; last = a }
    console.log(`${label.padEnd(24)} ${name.padEnd(20)} decisions ${n} throws ${thrown} stage errors ${JSON.stringify(brain.debugState().errors)} raw problems ${raw} ${logs.filter((l) => /failed/.test(l)).slice(0, 1).map((l) => l.split('\n').slice(0, 2).join(' | ').slice(0, 260))}`)
  }
}
