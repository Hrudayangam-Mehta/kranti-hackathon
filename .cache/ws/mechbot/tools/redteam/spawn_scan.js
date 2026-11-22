#!/usr/bin/env bun
// DEV ONLY (red team): where does the simulator spawn mechs, and how many spawns are in a walkable region that is
// cut off from the main one (courtyards, the stadium bowl)? Lists the seeds / slots so they can be replayed.
import { makeContext } from '../../sim/run.js'
import { Match } from '../../sim/sim.js'
import { hashSeed } from '../../sim/rng.js'
const ctx = makeContext({ quiet: true })
const nav = ctx.nav
nav.setBody(2.5, 9)
// size of each component, sampled on a 4 m lattice
const b = ctx.world.bounds, size = new Map()
for (let x = b.minX; x <= b.maxX; x += 4) for (let y = b.minY; y <= b.maxY; y += 4) { if (!nav.passableAt(x, y)) continue; const c = nav.component(x, y); size.set(c, (size.get(c) || 0) + 1) }
const main = [...size.entries()].sort((a, c) => c[1] - a[1])[0][0]
console.log('components', size.size, 'main', main, 'cells(4 m lattice)', size.get(main), 'others', [...size.entries()].filter((e) => e[0] !== main).sort((a, c) => c[1] - a[1]).slice(0, 8))
const N = parseInt(process.argv[2] || '300', 10)
let cut = 0, total = 0, ours = [], near = [], wall = []
const dummy = () => ({ name: 'x', hello() { return { type: 'ready', name: 'x' } }, act() { return null } })
for (let seed = 1; seed <= N; seed++) {
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots: Array.from({ length: 16 }, dummy), mode: 'ffa', mapDir: ctx.mapDir })
  const slot = hashSeed(seed, 77) % 16
  let dmin = Infinity
  for (const q of m.mechs) {
    total++
    const c = nav.passableAt(q.x, q.y) ? nav.component(q.x, q.y) : -2
    if (c !== main) { cut++; if (q.id === slot) ours.push({ seed, slot, x: Math.round(q.x), y: Math.round(q.y), comp: c, cells: size.get(c) || 0 }) }
    if (q.id !== slot) { const d = Math.hypot(q.x - m.mechs[slot].x, q.y - m.mechs[slot].y); if (d < dmin) dmin = d }
  }
  near.push(dmin); wall.push(nav.wallDistAt(m.mechs[slot].x, m.mechs[slot].y))
}
near.sort((a, c) => a - c)
console.log(`spawns ${total}, outside the main walkable region ${cut} (${(100 * cut / total).toFixed(1)}%)`)
console.log('our seat cut off in', ours.length, 'of', N, 'seeds:', JSON.stringify(ours.slice(0, 20)))
console.log(`nearest mech at spawn: min ${near[0].toFixed(0)} m, 10% ${near[Math.floor(N * 0.1)].toFixed(0)}, median ${near[N >> 1].toFixed(0)}, 90% ${near[Math.floor(N * 0.9)].toFixed(0)}; under 150 m in ${(100 * near.filter((d) => d < 150).length / N).toFixed(0)}% of seeds, under 200 m in ${(100 * near.filter((d) => d < 200).length / N).toFixed(0)}%`)
process.exit(0)
