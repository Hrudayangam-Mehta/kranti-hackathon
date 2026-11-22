// Panel 4 micro-benchmarks: how many LOS raycasts / path queries fit in a 10 Hz tick.
// Usage: bun bench.js <botLibDir> <arenaDir>
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const [libDir, arenaDir] = process.argv.slice(2)
const { World } = await import(pathToFileURL(join(libDir, 'world.js')).href)
const { Nav } = await import(pathToFileURL(join(libDir, 'nav.js')).href)
let t0 = performance.now()
const world = World.loadSync(arenaDir)
const tWorld = performance.now() - t0
t0 = performance.now()
const nav = new Nav(world, { cell: 2 })
const tNav = performance.now() - t0
console.log(JSON.stringify({ worldLoadMs: +tWorld.toFixed(1), navBuildMs: +tNav.toFixed(1), nx: nav.nx, ny: nav.ny }))

// deterministic rng
let s = 12345
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
const b = world.bounds
// pick passable anchor points
const anchors = []
let guard = 0
while (anchors.length < 400 && guard++ < 200000) {
  const x = b.minX + 40 + rnd() * (b.maxX - b.minX - 80), y = b.minY + 40 + rnd() * (b.maxY - b.minY - 80)
  if (nav.passableAt(x, y)) anchors.push([x, y, world.ground(x, y)])
}
console.log('anchors', anchors.length)

function pct(a, p) { const c = Float64Array.from(a).sort(); return c[Math.min(c.length - 1, Math.floor(p * c.length))] }

// 1) Tactical position evaluation as specified in the memo:
//    candidates on 2 m grid cells inside radius R around the mech, E enemies, 2 rays each (centre + head) + 1 outgoing ray.
for (const [R, E] of [[20, 1], [20, 3], [30, 3], [40, 3], [40, 6]]) {
  const times = [], counts = [], rays = []
  for (let k = 0; k < 200; k++) {
    const a = anchors[k % anchors.length]
    const en = []
    for (let e = 0; e < E; e++) {
      const ang = rnd() * 6.283, d = 50 + rnd() * 100
      const ex = a[0] + Math.cos(ang) * d, ey = a[1] + Math.sin(ang) * d
      en.push([ex, ey, world.ground(ex, ey)])
    }
    const t = performance.now()
    let n = 0, r = 0, acc = 0
    const i0 = Math.floor((a[0] - nav.x0) / nav.cell), j0 = Math.floor((a[1] - nav.y0) / nav.cell)
    const rc = Math.ceil(R / nav.cell)
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
      if (di * di + dj * dj > rc * rc) continue
      const i = i0 + di, j = j0 + dj
      if (i < 0 || j < 0 || i >= nav.nx || j >= nav.ny) continue
      if (!nav.passable(i, j)) continue
      const cx = nav.x0 + (i + 0.5) * nav.cell, cy = nav.y0 + (j + 0.5) * nav.cell, cz = world.ground(cx, cy)
      n++
      for (let e = 0; e < E; e++) {
        const q = en[e]
        acc += world.shotClear(q[0], q[1], q[2] + 7, cx, cy, cz + 4.5) ? 1 : 0
        acc += world.shotClear(q[0], q[1], q[2] + 7, cx, cy, cz + 8.5) ? 1 : 0
        r += 2
      }
      acc += world.shotClear(cx, cy, cz + 7, en[0][0], en[0][1], en[0][2] + 4.5) ? 1 : 0
      r++
    }
    times.push(performance.now() - t); counts.push(n); rays.push(r)
  }
  const tot = times.reduce((x, y) => x + y, 0), totR = rays.reduce((x, y) => x + y, 0)
  console.log(JSON.stringify({ test: 'fullDisc', R, E, meanCells: Math.round(counts.reduce((x, y) => x + y, 0) / counts.length),
    meanRays: Math.round(totR / rays.length), meanMs: +(tot / times.length).toFixed(3), p99Ms: +pct(times, 0.99).toFixed(3),
    usPerRay: +(1000 * tot / totR).toFixed(2) }))
}

// 2) raw ray cost by length
for (const L of [30, 80, 150, 250]) {
  const N = 20000
  let acc = 0
  const t = performance.now()
  for (let k = 0; k < N; k++) {
    const a = anchors[k % anchors.length]
    const ang = (k * 0.6180339887) % 1 * 6.283
    const bx = a[0] + Math.cos(ang) * L, by = a[1] + Math.sin(ang) * L
    acc += world.rayShot(a[0], a[1], a[2] + 7, bx, by, a[2] + 4.5)
  }
  const dt = performance.now() - t
  console.log(JSON.stringify({ test: 'rayShot', L, usPerRay: +(1000 * dt / N).toFixed(2), clearFrac: +(acc / N).toFixed(2) }))
}
for (const L of [80, 150]) {
  const N = 20000
  let acc = 0
  const t = performance.now()
  for (let k = 0; k < N; k++) {
    const a = anchors[k % anchors.length]
    const ang = (k * 0.6180339887) % 1 * 6.283
    const bx = a[0] + Math.cos(ang) * L, by = a[1] + Math.sin(ang) * L
    acc += world.canSee(a[0], a[1], a[2] + 8, bx, by, a[2] + 4.5) ? 1 : 0
  }
  const dt = performance.now() - t
  console.log(JSON.stringify({ test: 'canSee', L, usPerRay: +(1000 * dt / N).toFixed(2), clearFrac: +(acc / N).toFixed(2) }))
}

// 3) path queries by straight distance
for (const D of [30, 80, 200, 500]) {
  const times = [], exps = []
  let okN = 0
  for (let k = 0; k < 150; k++) {
    const a = anchors[k % anchors.length]
    // find a passable target ~D away
    let tx = 0, ty = 0, found = false
    for (let tries = 0; tries < 30 && !found; tries++) {
      const ang = rnd() * 6.283
      tx = a[0] + Math.cos(ang) * D; ty = a[1] + Math.sin(ang) * D
      found = nav.passableAt(tx, ty)
    }
    if (!found) continue
    const t = performance.now()
    const p = nav.findPath(a[0], a[1], tx, ty)
    times.push(performance.now() - t); exps.push(p.expanded || nav.lastExpanded || 0)
    if (p.ok) okN++
  }
  console.log(JSON.stringify({ test: 'findPath', D, n: times.length, ok: okN, meanMs: +(times.reduce((x, y) => x + y, 0) / times.length).toFixed(3),
    p90Ms: +pct(times, 0.9).toFixed(3), maxMs: +Math.max(...times).toFixed(3), meanExpanded: Math.round(exps.reduce((x, y) => x + y, 0) / exps.length) }))
}

// 4) walkLine cost (used for path-cost estimate of candidates)
{
  const N = 20000; let acc = 0
  const t = performance.now()
  for (let k = 0; k < N; k++) {
    const a = anchors[k % anchors.length]
    const ang = (k * 0.6180339887) % 1 * 6.283
    acc += nav.walkLine(a[0], a[1], a[0] + Math.cos(ang) * 30, a[1] + Math.sin(ang) * 30) ? 1 : 0
  }
  const dt = performance.now() - t
  console.log(JSON.stringify({ test: 'walkLine30m', usPerCall: +(1000 * dt / N).toFixed(2), okFrac: +(acc / N).toFixed(2) }))
}

// 5) JSON parse/stringify cost for a rich obs-sized message
{
  const obs = { type: 'obs', tick: 1, t: 1, alive: 16, self: { pos: [1, 2, 3], vel: [1, 2, 3], aim: [0, 0], weapons: [{ kind: 'gun', stats: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } }, null], stats: {} },
    mechs: [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [], zone: {} }
  for (let i = 0; i < 15; i++) obs.mechs.push({ id: i, kind: 'mech', pos: [1.11, 2.22, 3.33], vel: [1.1, 2.2, 0], aim: [0.5, 0.1], hp: 900, max_hp: 1400, cubes: 2, weapons: ['gun', 'laser'], charging: false })
  for (let i = 0; i < 60; i++) obs.projectiles.push({ id: i, kind: 'gun', pos: [1.11, 2.22, 3.33], vel: [100.1, 200.2, -3.3] })
  for (let i = 0; i < 30; i++) obs.crates.push({ id: 1000 + i, pos: [1.1, 2.2, 3.3], hp: 300 })
  const line = JSON.stringify(obs)
  const N = 5000
  let t = performance.now(); let x = 0
  for (let k = 0; k < N; k++) x += JSON.parse(line).mechs.length
  const dt = performance.now() - t
  console.log(JSON.stringify({ test: 'JSON.parse', bytes: line.length, usPerParse: +(1000 * dt / N).toFixed(1) }))
}
