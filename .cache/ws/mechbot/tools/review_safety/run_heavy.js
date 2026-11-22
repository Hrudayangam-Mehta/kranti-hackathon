// Worst-case stream through the real bot process: taskset -c 1 bun run_heavy.js [--ticks 6000] [--node] [--cpu 0]
import { realHello, loadMap } from './common.js'
import { drive, report } from './drive.js'
import { makeHeavy } from './gen_heavy.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const hello = realHello()
const { world, nav } = await loadMap(hello)
const total = Number(arg('--ticks', '6000'))
const gen = makeHeavy(hello, world, nav, { seed: Number(arg('--seed', '11')), mechs: Number(arg('--mechs', '15')), projectiles: Number(arg('--proj', '10')), cubes: args.includes('--no-cubes') ? false : undefined })
let bytes = 0, maxBytes = 0
const res = await drive({ hello, total, label: `heavy x${total} (15 mechs, 10 projectiles)`, actionsFile: arg('--actions', null), memLimitMb: Number(arg('--as-mb', '0')),
  nextObs: (n, last) => { const o = gen(n, last); const l = JSON.stringify(o).length; bytes += l; if (l > maxBytes) maxBytes = l; return o } })
report(res)
console.log(`obs line bytes: mean ${(bytes / Math.max(1, res.lat.length)).toFixed(0)} max ${maxBytes}`)
