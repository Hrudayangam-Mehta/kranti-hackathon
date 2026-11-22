// Cost of the body resize (nav.setBody inside senseSelf) in the REAL bot process: the kit's recorded stream,
// with self.cubes stepping up at chosen decisions (stats scaled like the server does). Fresh process per run.
// Prints main-thread CPU ms (from /proc schedstat) of the decisions where the cube count changed.
import { loadStream, ARENA, pct } from './common.js'
import { drive } from './drive.js'
const lines = loadStream()
const hello = { ...lines[0], map: { dir: ARENA, files: ['v2/world.json', 'v2/terrain.i16'] } }
const obs = lines.filter((l) => l.type === 'obs')
const span = obs[obs.length - 1].tick + 2
const stepsAt = [60, 200, 201, 202, 400, 600, 601, 602, 603, 800, 1000, 1100]   // decision indices where cubes += 1 (kill drops come in bursts)
const cubesAt = (n) => stepsAt.filter((s) => s <= n).length
const runs = Number(process.argv[2] || 6)
const all = stepsAt.map(() => [])
let others = []
for (let r = 0; r < runs; r++) {
  const res = await drive({ hello, total: 1200, label: 'cube steps', nextObs: (n) => {
    const o = JSON.parse(JSON.stringify(obs[n % obs.length])); const rep = (n / obs.length) | 0
    o.tick += rep * span; o.t = +(o.t + rep * span / 20).toFixed(2)
    const c = cubesAt(n), sc = 1 + 0.05 * c
    o.self.cubes = c
    for (const k of ['radius', 'height', 'eye_height', 'muzzle_height']) o.self.stats[k] = +(o.self.stats[k] * sc).toFixed(4)
    return o
  } })
  const row = stepsAt.map((s, i) => { all[i].push(res.cpuM[s]); return `${res.cpuM[s].toFixed(1)}/${res.cpuA[s].toFixed(1)}/${res.lat[s].toFixed(1)}` })
  others = others.concat(res.cpuM.filter((_, n) => !stepsAt.includes(n)))
  console.log(`run ${r}: main/all/wall ms at cube steps: ${row.join('  ')}   | bot said: ${res.stderr.trim().split('\n').pop()}`)
}
console.log('main-thread CPU at the k-th resize (min..max over runs):', all.map((a, i) => `#${i + 1}: ${Math.min(...a).toFixed(1)}..${Math.max(...a).toFixed(1)}`).join('  '))
console.log(`all other decisions: main-thread CPU p50 ${pct(others, 0.5).toFixed(2)} p99 ${pct(others, 0.99).toFixed(2)} max ${Math.max(...others).toFixed(1)} ms`)
