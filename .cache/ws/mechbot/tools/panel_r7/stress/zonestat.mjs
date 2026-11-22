// How often does a late zone centre sit where the bot's late zoneGoal cannot resolve it? Zone circles drawn exactly as
// sim/sim.js _setupZone (centre uniform in the disc of radius r - r_next). For phases with next radius <= 70 (3, 4, 5):
// distance from the centre to the nearest standable main-component cell; zoneGoal's late search only looks 24 m out.
// usage: bun zonestat.mjs <hello.json> [nSeeds]
import { readFileSync } from 'node:fs'
import { World } from '../../../bot/lib/world.js'
import { Nav } from '../../../bot/lib/nav.js'
import { hashSeed, makeRng } from '../../../sim/rng.js'
const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8')).config, N = parseInt(process.argv[3] || '2000', 10)
const w = World.loadSync(process.env.PR7_MAPDIR || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/arena')
const nav = new Nav(w, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const TAU = Math.PI * 2
function nearestMain(x, y, maxR) {
  let best = Infinity
  for (let dy = -maxR; dy <= maxR; dy += 2) for (let dx = -maxR; dx <= maxR; dx += 2) {
    const d = Math.hypot(dx, dy); if (d >= best || d > maxR) continue
    const c = nav.idx(x + dx, y + dy)
    if (c >= 0 && nav.pass[c] && nav.comp[c] === nav.mainComponent) best = d
  }
  return best
}
const z = cfg.zone, stats = {}
for (let s = 1; s <= N; s++) {
  const R = makeRng(hashSeed(s, 1))
  let c = { x: z.start_center[0], y: z.start_center[1], r: z.start_radius }
  z.phases.forEach((p, i) => {
    const a = R() * TAU, d = Math.max(0, c.r - p.radius) * Math.sqrt(R())
    const n = { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, r: p.radius }
    if (p.radius <= 70) {
      const k = 'r' + p.radius, st = stats[k] || (stats[k] = { n: 0, gt24: 0, gt10: 0, inBld: 0, gtR: 0, d: [] })
      const dm = nearestMain(n.x, n.y, 80)
      st.n++; if (dm > 24) st.gt24++; if (dm > 10) st.gt10++; if (w.surfacePrism(n.x, n.y) >= 0) st.inBld++; if (dm > Math.max(2, p.radius * 0.5)) st.gtR++
    }
    c = n
  })
}
for (const k in stats) { const st = stats[k]; console.log(`${k}: n ${st.n}  centre on a prism ${(100 * st.inBld / st.n).toFixed(1)}%  nearest standable > 10 m ${(100 * st.gt10 / st.n).toFixed(1)}%  > 24 m (late zoneGoal gives up) ${(100 * st.gt24 / st.n).toFixed(1)}%  > half the next radius ${(100 * st.gtR / st.n).toFixed(1)}%`) }
