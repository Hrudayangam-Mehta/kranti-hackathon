// Panel 4: tick-time tail under (A) per-tick object churn vs (B) preallocated typed arrays; and cold-JIT cost.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
const world = World.loadSync(arenaDir)
const nav = new Nav(world, { cell: 2 })
let s = 99
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
const b = world.bounds
const anchors = []
while (anchors.length < 200) {
  const x = b.minX + 60 + rnd() * (b.maxX - b.minX - 120), y = b.minY + 60 + rnd() * (b.maxY - b.minY - 120)
  if (nav.passableAt(x, y)) anchors.push([x, y, world.ground(x, y)])
}
const obs = { type: 'obs', tick: 1, t: 1, alive: 16, self: { pos: [1, 2, 3], vel: [1, 2, 3], aim: [0, 0], weapons: [{ kind: 'gun', stats: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } }, null], stats: {} },
  mechs: [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [], zone: {} }
for (let i = 0; i < 15; i++) obs.mechs.push({ id: i, kind: 'mech', pos: [1.11, 2.22, 3.33], vel: [1.1, 2.2, 0], aim: [0.5, 0.1], hp: 900, max_hp: 1400, cubes: 2, weapons: ['gun', 'laser'], charging: false })
for (let i = 0; i < 40; i++) obs.projectiles.push({ id: i, kind: 'gun', pos: [1.11, 2.22, 3.33], vel: [100.1, 200.2, -3.3] })
const line = JSON.stringify(obs)

const MAXC = 1600
const cx = new Float32Array(MAXC), cy = new Float32Array(MAXC), cz = new Float32Array(MAXC), sc = new Float32Array(MAXC)
function evalTyped(a, en, R) {
  let n = 0
  const i0 = Math.floor((a[0] - nav.x0) / 2), j0 = Math.floor((a[1] - nav.y0) / 2), rc = Math.ceil(R / 2)
  for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
    if (di * di + dj * dj > rc * rc) continue
    const i = i0 + di, j = j0 + dj
    if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
    const x = nav.x0 + (i + 0.5) * 2, y = nav.y0 + (j + 0.5) * 2, z = world.ground(x, y)
    let e = 0
    for (let k = 0; k < en.length; k += 3) {
      if (world.shotClear(en[k], en[k + 1], en[k + 2] + 7, x, y, z + 4.5)) e += 1
      if (world.shotClear(en[k], en[k + 1], en[k + 2] + 7, x, y, z + 8.5)) e += 0.5
    }
    cx[n] = x; cy[n] = y; cz[n] = z; sc[n] = -e; n++
  }
  let best = 0
  for (let k = 1; k < n; k++) if (sc[k] > sc[best]) best = k
  return best
}
function evalObjects(a, en, R) {
  const cands = []
  const i0 = Math.floor((a[0] - nav.x0) / 2), j0 = Math.floor((a[1] - nav.y0) / 2), rc = Math.ceil(R / 2)
  for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
    if (di * di + dj * dj > rc * rc) continue
    const i = i0 + di, j = j0 + dj
    if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny || !nav.passable(i, j)) continue
    const x = nav.x0 + (i + 0.5) * 2, y = nav.y0 + (j + 0.5) * 2, z = world.ground(x, y)
    const c = { pos: [x, y, z], exposure: [], score: 0 }
    for (let k = 0; k < en.length; k += 3) {
      c.exposure.push({ centre: world.shotClear(en[k], en[k + 1], en[k + 2] + 7, x, y, z + 4.5), head: world.shotClear(en[k], en[k + 1], en[k + 2] + 7, x, y, z + 8.5) })
    }
    c.score = -c.exposure.reduce((q, v) => q + (v.centre ? 1 : 0) + (v.head ? 0.5 : 0), 0)
    cands.push(c)
  }
  return cands.sort((p, q) => q.score - p.score)[0]
}
function run(label, fn, N, R) {
  const times = new Float64Array(N)
  for (let k = 0; k < N; k++) {
    const a = anchors[k % anchors.length]
    const t = performance.now()
    const o = JSON.parse(line)          // unavoidable per-tick allocation
    const en = [a[0] + 80, a[1] + 30, a[2], a[0] - 60, a[1] + 90, a[2], a[0] + 20, a[1] - 110, a[2]]
    fn(a, en, R)
    const out = JSON.stringify({ tick: o.tick, move: [0.5, 0.5], aim: [1, 0], fire: [true, false], boost: false })
    times[k] = performance.now() - t
    if (out.length < 5) throw new Error('x')
  }
  const first = times[0], first10 = Math.max(...times.subarray(0, 10))
  const c = Float64Array.from(times).sort()
  const mean = times.reduce((x, y) => x + y, 0) / N
  console.log(JSON.stringify({ label, R, N, firstMs: +first.toFixed(2), maxFirst10Ms: +first10.toFixed(2), meanMs: +mean.toFixed(3), p99Ms: +c[Math.floor(0.99 * N)].toFixed(3), p999Ms: +c[Math.floor(0.999 * N)].toFixed(3), maxMs: +c[N - 1].toFixed(2) }))
}
// cold start first (no warm-up): what the first real ticks would cost
run('typed-cold', evalTyped, 4200, 30)
run('typed-warm', evalTyped, 4200, 30)
run('objects', evalObjects, 4200, 30)
run('typed-warm-R40', evalTyped, 4200, 40)
console.log(JSON.stringify({ rssMB: +(process.memoryUsage().rss / 1048576).toFixed(0), heapUsedMB: +(process.memoryUsage().heapUsed / 1048576).toFixed(0) }))
