// Red-team tool: sight lines and enclosed pockets on the real map.
//   bun tools/redteam/map_sight.js [--samples 400] [--chains 30]
// For each zone phase (nested random circles, as the server draws them) it samples standable ground cells of the
// main component and asks: if a mech stands at distance d in a random direction, is that spot standable, in the
// zone, and joined to us by a clear line of fire both ways (muzzle 7 m -> body centre 4.5 m)?
import { World } from './snap/bot/lib/world.js'
import { Nav } from './snap/bot/lib/nav.js'
import { readFileSync } from 'node:fs'
const ROOT = new URL('./snap/', import.meta.url).pathname
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? parseFloat(args[i + 1]) : d }
const SAMPLES = arg('samples', 400), CHAINS = arg('chains', 30)
const world = World.loadSync(ROOT + 'kit/arena')
const cfg = JSON.parse(readFileSync(ROOT + 'notes/hello_example.json', 'utf8')).config
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let seed = 12345
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const MZ = 7, CZ = 4.5
const DIST = [55, 75, 95, 115, 125, 150, 185]
function los(ax, ay, bx, by) {
  const az = nav.levelAt(ax, ay), bz = nav.levelAt(bx, by)
  return world.shotClear(ax, ay, az + MZ, bx, by, bz + CZ) && world.shotClear(bx, by, bz + MZ, ax, ay, az + CZ)
}
const main = nav.mainComponent
const okCell = (x, y) => { const c = nav.idx(x, y); return c >= 0 && nav.pass[c] && nav.comp[c] === main }

// ---------------- enclosed pockets
{
  const z0 = cfg.zone.start_center, R0 = cfg.zone.start_radius, frac = cfg.match.spawn_zone_fraction
  const sizes = nav.compSizes
  let inSpawnMain = 0, inSpawnOther = 0
  const per = new Map()
  for (let c = 0; c < nav.n; c++) {
    if (!nav.pass[c] || nav.comp[c] < 0) continue
    const x = nav.cellX(c), y = nav.cellY(c)
    if (Math.hypot(x - z0[0], y - z0[1]) > R0 * frac) continue
    // roofs are not in the ground graph, so every passable cell is ground or a walk-on deck
    if (nav.comp[c] === main) inSpawnMain++
    else { inSpawnOther++; const k = nav.comp[c]; let p = per.get(k); if (!p) { p = { n: 0, sx: 0, sy: 0, minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 }; per.set(k, p) } p.n++; p.sx += x; p.sy += y; p.minX = Math.min(p.minX, x); p.maxX = Math.max(p.maxX, x); p.minY = Math.min(p.minY, y); p.maxY = Math.max(p.maxY, y) }
  }
  const pockets = [...per.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([k, p]) => {
    const cx = p.sx / p.n, cy = p.sy / p.n
    const hop = nav.hopPlan(cx, cy, { toward: z0, maxClimb: 60, maxHop: 45 })
    return { comp: k, area_m2: p.n * 4, box: [Math.round(p.minX), Math.round(p.maxX), Math.round(p.minY), Math.round(p.maxY)], hop: hop ? { climb: +hop.climb.toFixed(1), hopLen: +hop.hopLen.toFixed(1), walk: +hop.walkLen.toFixed(0) } : null }
  })
  console.log(JSON.stringify({ components: sizes.length, mainCells: sizes[main], spawnDisc: { r: R0 * frac, mainCells: inSpawnMain, pocketCells: inSpawnOther, pocketShare: +(inSpawnOther / (inSpawnMain + inSpawnOther)).toFixed(4), pockets: per.size } }))
  for (const q of pockets) console.log('pocket', JSON.stringify(q))
}

// ---------------- sight lines per zone phase
const phases = [{ radius: cfg.zone.start_radius }, ...cfg.zone.phases]
const res = phases.map((p) => ({ R: p.radius, pts: 0, d: DIST.map(() => ({ tried: 0, stand: 0, inZone: 0, clear: 0 })), keep: { n: 0, ok: 0 }, keep115: { n: 0, ok: 0 }, anyFar: 0, shareFarDirs: 0, edge: { n: 0, ok: 0 } }))
for (let ch = 0; ch < CHAINS; ch++) {
  let cx = cfg.zone.start_center[0], cy = cfg.zone.start_center[1], R = cfg.zone.start_radius
  for (let ph = 0; ph < phases.length; ph++) {
    if (ph > 0) {
      const nr = phases[ph].radius
      // the next circle lies entirely inside the current one; drops.spread 0.7 suggests a centre-biased draw, use uniform in the allowed disc
      let nxp = cx, nyp = cy
      for (let tries = 0; tries < 50; tries++) {
        const a = rnd() * 2 * Math.PI, rr = Math.sqrt(rnd()) * Math.max(0, R - nr)
        nxp = cx + rr * Math.cos(a); nyp = cy + rr * Math.sin(a)
        if (nr < 1 || okCell(nxp, nyp) || tries > 40) break
      }
      cx = nxp; cy = nyp; R = nr
    }
    if (R < 20) continue
    const out = res[ph]
    const per = Math.ceil(SAMPLES / CHAINS)
    for (let s = 0, guard = 0; s < per && guard < per * 60; guard++) {
      const a = rnd() * 2 * Math.PI, rr = Math.sqrt(rnd()) * R
      const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a)
      if (!okCell(x, y)) continue
      s++; out.pts++
      let farDirs = 0
      const K = 16
      for (let k = 0; k < K; k++) {
        const b = (k + rnd()) * 2 * Math.PI / K, ux = Math.cos(b), uy = Math.sin(b)
        let clear100 = false, clear115 = false
        for (let di = 0; di < DIST.length; di++) {
          const d = DIST[di], ex = x + ux * d, ey = y + uy * d, o = out.d[di]
          o.tried++
          let c = false
          if (okCell(ex, ey)) {
            o.stand++
            if (Math.hypot(ex - cx, ey - cy) <= R) { o.inZone++; c = los(x, y, ex, ey); if (c) o.clear++ }
          }
          if (d === 95 && c) clear100 = true
          if (d === 115 && c) clear115 = true
          if (d === 150) {
            if (clear100) { out.keep.n++; if (c) out.keep.ok++ }
            if (clear115) { out.keep115.n++; if (c) out.keep115.ok++ }
            if (c) farDirs++
          }
        }
        // can we back straight away from a hunter seen at 95 m until 150 m, staying standable + in zone + in line?
      }
      if (farDirs > 0) out.anyFar++
      out.shareFarDirs += farDirs / K
    }
    // edge pressure: hunter at 0.41 R from the centre, we at 150 m from it: how often is that inside 0.8 R?
    for (let s = 0; s < 400; s++) {
      const a = rnd() * 2 * Math.PI, hx = cx + 0.41 * R * Math.cos(a), hy = cy + 0.41 * R * Math.sin(a)
      const b = rnd() * 2 * Math.PI, x = hx + 150 * Math.cos(b), y = hy + 150 * Math.sin(b)
      out.edge.n++
      if (Math.hypot(x - cx, y - cy) <= 0.8 * R) out.edge.ok++
    }
  }
}
console.log('phase R | pts | P(line usable at d) = standable & in zone & clear both ways, for d = ' + DIST.join(', ') + ' | P(clear | standable & in zone) | keep line 95->150 | 115->150 | pts with any 150 m line | geom: 150 m from a hunter at 0.41R is within 0.8R')
for (const o of res) {
  if (!o.pts) continue
  const use = o.d.map((q) => (q.clear / q.tried).toFixed(2)).join(' ')
  const cond = o.d.map((q) => (q.inZone ? (q.clear / q.inZone).toFixed(2) : ' n/a')).join(' ')
  console.log(`${String(o.R).padStart(4)} | ${String(o.pts).padStart(4)} | ${use} | ${cond} | ${o.keep.n ? (o.keep.ok / o.keep.n).toFixed(2) : 'n/a'} (${o.keep.n}) | ${o.keep115.n ? (o.keep115.ok / o.keep115.n).toFixed(2) : 'n/a'} | ${(o.anyFar / o.pts).toFixed(2)} (mean share of directions ${(o.shareFarDirs / o.pts).toFixed(2)}) | ${(o.edge.ok / o.edge.n).toFixed(2)}`)
}
