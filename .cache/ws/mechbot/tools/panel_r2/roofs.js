// Roof inventory on the 2 m nav grid: standable roof patches, climb height from the ground next to them,
// one-tank reachability, area, setback, on-roof walls (penthouses), and static exposure of the best cells
// compared with the best ground cells. DEV ONLY.
import { loadWorld, loadNav, loadConfig, pct, mean, fmt } from './common.js'
const w = loadWorld(), nav = loadNav(w), cfg = loadConfig()
const M = cfg.mech
const nx = nav.nx, ny = nav.ny, n = nav.n, cell = nav.cell
const R = M.radius, H = M.height
// ---- per cell: top surface, is it a standable roof cell
const top = new Float32Array(n), gnd = new Float32Array(n), roof = new Uint8Array(n)
for (let c = 0; c < n; c++) {
  const x = nav.cellX(c), y = nav.cellY(c)
  const g = w.ground(x, y), s = w.surfaceZ(x, y)
  top[c] = s; gnd[c] = g
  if (s - g > 3 && !w.bodyBlocked(x, y, s + 0.01, R, H, M.step_up)) {
    // the whole body footprint must rest on the same roof (centre is enough for standing; require the 4 points at radius/2)
    roof[c] = 1
  }
}
// ---- patches: 4-connected roof cells with |dz| <= step_up
const comp = new Int32Array(n).fill(-1); const patches = []
const stack = new Int32Array(n)
for (let c0 = 0; c0 < n; c0++) {
  if (!roof[c0] || comp[c0] >= 0) continue
  const id = patches.length; let sp = 0; stack[sp++] = c0; comp[c0] = id
  const cells = []
  while (sp) {
    const c = stack[--sp]; cells.push(c)
    const i = c % nx, j = (c / nx) | 0
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue
      const q = b * nx + a
      if (!roof[q] || comp[q] >= 0 || Math.abs(top[q] - top[c]) > M.step_up) continue
      comp[q] = id; stack[sp++] = q
    }
  }
  patches.push({ id, cells })
}
// ---- per patch: geometry
const jetH = (E) => Math.max(0, (E - 8) / (M.jet_drain / M.max_rise_speed))   // metres climbable with E energy (8 kept for the step over the edge)
const HMAX = jetH(M.energy)
function climbTime(h) { return h / M.max_rise_speed + 0.3 }
for (const p of patches) {
  const set = new Set(p.cells)
  let zs = 0; for (const c of p.cells) zs += top[c]
  p.z = zs / p.cells.length
  p.area = p.cells.length * cell * cell
  // rim cells and what lies outside: lower (edge) or higher (wall on the roof)
  const edge = [], wall = []
  let minLaunch = Infinity, launch = -1, rimGround = []
  for (const c of p.cells) {
    const i = c % nx, j = (c / nx) | 0
    for (let d = 0; d < 8; d++) {
      const a = i + [1, 1, 0, -1, -1, -1, 0, 1][d], b = j + [0, 1, 1, 1, 0, -1, -1, -1][d]
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue
      const q = b * nx + a
      if (set.has(q)) continue
      // lower by more than a step: a drop (roof edge). Higher, or level but not standable (a wall is within body radius): on-roof wall.
      if (top[q] < top[c] - M.step_up) edge.push(c); else wall.push(c)
    }
  }
  p.edgeCells = [...new Set(edge)]; p.wallCells = [...new Set(wall)]
  // launch: nearest passable main-component ground cell within 10 m of an edge cell (ground-level)
  for (const c of p.edgeCells) {
    const i = c % nx, j = (c / nx) | 0
    for (let dj = -5; dj <= 5; dj++) for (let di = -5; di <= 5; di++) {
      const a = i + di, b = j + dj
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue
      const q = b * nx + a
      if (!nav.pass[q] || nav.comp[q] !== nav.mainComponent) continue
      const hgt = top[c] - nav.level[q]
      if (hgt < minLaunch) { minLaunch = hgt; launch = q }
    }
  }
  p.climb = minLaunch; p.launch = launch
  // setback = distance to the nearest edge cell (brute force on the rim list, fine offline), wallDist likewise
  let best = -1, bestS = -1; const sb = []
  for (const c of p.cells) {
    const x = nav.cellX(c), y = nav.cellY(c)
    let d2 = Infinity
    for (const e of p.edgeCells) { const dx = nav.cellX(e) - x, dy = nav.cellY(e) - y; const q = dx * dx + dy * dy; if (q < d2) d2 = q }
    const s = Math.sqrt(d2) + cell / 2
    sb.push(s)
    if (s > bestS) { bestS = s; best = c }
  }
  p.setbackMax = bestS; p.deep = best; p.sb = sb
}
const big = patches.filter(p => p.area >= 100)   // room for the body plus a few steps
const reach = big.filter(p => p.climb <= HMAX && p.launch >= 0)
console.log(`one tank climbs ${fmt(HMAX)} m (jet ${M.jet_drain}/s at ${M.max_rise_speed} m/s = ${fmt(M.jet_drain / M.max_rise_speed, 2)} energy/m); prisms ${w.prisms.length}`)
console.log(`standable roof cells ${roof.reduce((a, v) => a + v, 0)} (${fmt(roof.reduce((a, v) => a + v, 0) * 4 / 1e4, 2)} ha) vs ground passable ${nav.pass.reduce((a, v) => a + v, 0)} cells`)
console.log(`roof patches: ${patches.length} total; >= 100 m2: ${big.length}; of those reachable with one tank from adjacent ground: ${reach.length}; unreachable (too high or no launch cell): ${big.length - reach.length}`)
const hist = (arr, edges) => edges.slice(0, -1).map((e, i) => `${e}-${edges[i + 1]}: ${arr.filter(v => v >= e && v < edges[i + 1]).length}`).join(' | ')
console.log('climb height (m) of reachable patches:', hist(reach.map(p => p.climb), [0, 6, 10, 15, 20, 30, 45, 64]))
console.log('  p10/p50/p90:', fmt(pct(reach.map(p => p.climb), .1)), fmt(pct(reach.map(p => p.climb), .5)), fmt(pct(reach.map(p => p.climb), .9)))
console.log('area (m2) of reachable patches:', hist(reach.map(p => p.area), [100, 300, 1000, 3000, 10000, 1e9]))
console.log('max setback (m) of reachable patches:', hist(reach.map(p => p.setbackMax), [0, 8, 12, 20, 30, 45, 70, 1e9]))
console.log('climb time s / energy at p50 and p90 height:', fmt(climbTime(pct(reach.map(p => p.climb), .5))), '/', fmt(pct(reach.map(p => p.climb), .5) * 1.5 + 8, 0), ';', fmt(climbTime(pct(reach.map(p => p.climb), .9))), '/', fmt(pct(reach.map(p => p.climb), .9) * 1.5 + 8, 0))
// geometric setback needed to hide the head top (9 m) / the centre (4.5 m) from a ground muzzle (7 m) at distance D from the edge
console.log('\nsetback (m) that hides head-top | centre from a ground muzzle at D from the edge; and the deepest setback from which OUR muzzle still sees its centre')
for (const h of [8, 12, 15, 20, 25, 30, 40]) {
  const row = [60, 100, 150].map(D => `D=${D}: ${h > 7 ? fmt(9 * D / (h - 7), 0) : 'inf'} | ${h > 7 ? fmt(4.5 * D / (h - 7), 0) : 'inf'} | ${fmt(7 * D / (h - 4.5), 0)}`)
  console.log(`  roof ${h} m above the shooter's ground:  ${row.join('   ')}`)
}
// how many reachable roofs have enough setback to hide completely / hide the centre at D = 60/100/150
for (const D of [60, 100, 150]) {
  let full = 0, centre = 0, hull = 0
  for (const p of reach) {
    const h = p.climb
    if (h <= 7.5) continue
    if (p.setbackMax >= 9 * D / (h - 7)) full++
    if (p.setbackMax >= 4.5 * D / (h - 7)) centre++
    // hull-down band exists: a setback where our muzzle sees its centre but its muzzle does not see ours
    if (p.setbackMax >= 4.5 * D / (h - 7) && 7 * D / (h - 4.5) > 4.5 * D / (h - 7)) hull++
  }
  console.log(`D=${D} m: reachable roofs deep enough to hide the whole body ${full}, to hide the centre (hull-down shooting possible) ${centre} of ${reach.length}`)
}
// ---- ray-cast exposure of positions: fraction of ground muzzles on rings at D that have a clear shot to our centre / head top
function exposure(x, y, z) {
  const out = {}
  for (const D of [30, 60, 100, 150, 200]) {
    let nC = 0, nT = 0, nOur = 0, tot = 0
    for (let a = 0; a < 48; a++) {
      const ex = x + Math.cos(a * Math.PI / 24) * D, ey = y + Math.sin(a * Math.PI / 24) * D
      const q = nav.idx(ex, ey)
      if (q < 0 || !nav.pass[q]) continue
      tot++
      const ez = nav.level[q]
      const c = w.shotClear(ex, ey, ez + 7, x, y, z + 4.5), t = w.shotClear(ex, ey, ez + 7, x, y, z + 8.7)
      if (c) nC++; if (c || t) nT++
      if (w.shotClear(x, y, z + 7, ex, ey, ez + 4.5)) nOur++
    }
    out[D] = tot ? [nC / tot, nT / tot, nOur / tot, tot] : [NaN, NaN, NaN, 0]
  }
  return out
}
// roof: deepest cell of each reachable patch with area >= 300; and a "peek" cell 4 m from an edge
const rows = []
for (const p of reach.filter(p => p.area >= 300)) {
  const c = p.deep; const e = exposure(nav.cellX(c), nav.cellY(c), top[c])
  rows.push({ p, e })
}
const agg = (rows, D, k) => mean(rows.map(r => r.e[D][k]).filter(Number.isFinite))
console.log(`\nexposure of the DEEPEST cell of each reachable roof >= 300 m2 (n=${rows.length}): share of ground muzzles on a ring at D with a clear shot to our centre | to centre or head | that our muzzle can hit`)
for (const D of [30, 60, 100, 150, 200]) console.log(`  D=${D}: centre ${fmt(100 * agg(rows, D, 0), 0)}%  any part ${fmt(100 * agg(rows, D, 1), 0)}%  we can shoot ${fmt(100 * agg(rows, D, 2), 0)}%`)
for (const [lo, hi] of [[6, 12], [12, 20], [20, 35], [35, 64]]) {
  const sub = rows.filter(r => r.p.climb >= lo && r.p.climb < hi)
  if (!sub.length) continue
  console.log(`  height ${lo}-${hi} m (n=${sub.length}, median area ${fmt(pct(sub.map(r => r.p.area), .5), 0)} m2, median max setback ${fmt(pct(sub.map(r => r.p.setbackMax), .5))} m): ` + [60, 100, 150].map(D => `D=${D}: centre ${fmt(100 * agg(sub, D, 0), 0)}% any ${fmt(100 * agg(sub, D, 1), 0)}% ours ${fmt(100 * agg(sub, D, 2), 0)}%`).join('  '))
}
// ground reference: random passable ground cells, and wall-hugging ground cells (wallDist 2.8-4 m)
let s = 99; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
function sampleGround(filter, N) {
  const out = []
  let guard = 0
  while (out.length < N && guard++ < 2e6) {
    const c = (rnd() * n) | 0
    if (!nav.pass[c] || nav.comp[c] !== nav.mainComponent || !filter(c)) continue
    out.push({ e: exposure(nav.cellX(c), nav.cellY(c), nav.level[c]) })
  }
  return out
}
const gAny = sampleGround(() => true, 400), gWall = sampleGround(c => nav.wallDist[c] >= 2.8 && nav.wallDist[c] <= 4, 400)
console.log('ground, random passable cell (n=400): ' + [30, 60, 100, 150, 200].map(D => `D=${D}: centre ${fmt(100 * agg(gAny, D, 0), 0)}% any ${fmt(100 * agg(gAny, D, 1), 0)}% ours ${fmt(100 * agg(gAny, D, 2), 0)}%`).join('  '))
console.log('ground, wall-hugging cell (n=400):    ' + [30, 60, 100, 150, 200].map(D => `D=${D}: centre ${fmt(100 * agg(gWall, D, 0), 0)}% any ${fmt(100 * agg(gWall, D, 1), 0)}% ours ${fmt(100 * agg(gWall, D, 2), 0)}%`).join('  '))
// roof edge-peek cells: 3-5 m from an edge (hull-down candidates)
const peekRows = []
for (const p of reach.filter(p => p.area >= 300 && p.climb >= 12)) {
  let k = 0
  for (let q = 0; q < p.cells.length && k < 6; q += Math.max(1, (p.cells.length / 40) | 0)) {
    if (p.sb[q] >= 3 && p.sb[q] <= 5) { const c = p.cells[q]; peekRows.push({ p, e: exposure(nav.cellX(c), nav.cellY(c), top[c]) }); k++ }
  }
}
console.log(`roof cells 3-5 m from an edge, roofs >= 12 m (n=${peekRows.length}): ` + [30, 60, 100, 150, 200].map(D => `D=${D}: centre ${fmt(100 * agg(peekRows, D, 0), 0)}% any ${fmt(100 * agg(peekRows, D, 1), 0)}% ours ${fmt(100 * agg(peekRows, D, 2), 0)}%`).join('  '))
// on-roof walls (penthouses): roofs that have their own corner cover
const withWall = reach.filter(p => p.area >= 300 && p.wallCells.length >= 4)
console.log(`\nreachable roofs >= 300 m2: ${reach.filter(p => p.area >= 300).length}; with a higher structure on them (on-roof wall >= 4 rim cells): ${withWall.length}`)
// spread over the map: distance from a random ground cell to the nearest reachable roof >= 300 m2 with height >= 12
const good = reach.filter(p => p.area >= 300 && p.climb >= 12 && p.climb <= 45)
const dists = []
for (let k = 0; k < 2000; k++) {
  let c; do { c = (rnd() * n) | 0 } while (!nav.pass[c] || nav.comp[c] !== nav.mainComponent)
  let best = Infinity
  for (const p of good) { const d = Math.hypot(nav.cellX(p.launch) - nav.cellX(c), nav.cellY(p.launch) - nav.cellY(c)); if (d < best) best = d }
  dists.push(best)
}
console.log(`"good" roofs (>= 300 m2, 12-45 m): ${good.length}; straight distance from a random ground cell to the nearest launch cell: p50 ${fmt(pct(dists, .5), 0)} m p90 ${fmt(pct(dists, .9), 0)} m`)
// zone end-game: where does the default first circle put us; fraction of good roofs within 380 / 240 / 140 of the start centre
const zc = cfg.zone.start_center
for (const r of [380, 240, 140, 70]) console.log(`  good roofs with launch within ${r} m of the start centre: ${good.filter(p => Math.hypot(nav.cellX(p.launch) - zc[0], nav.cellY(p.launch) - zc[1]) <= r).length}`)
// dump the table for the engineer (top 25 by area)
console.log('\nlargest reachable roofs: id, area m2, climb m, max setback m, on-roof wall cells, launch xy')
for (const p of [...reach].sort((a, b) => b.area - a.area).slice(0, 25)) console.log(`  #${p.id} area ${p.area} climb ${fmt(p.climb)} setback ${fmt(p.setbackMax)} wallCells ${p.wallCells.length} launch (${fmt(nav.cellX(p.launch), 0)}, ${fmt(nav.cellY(p.launch), 0)})`)

// ---- hull-down: positions from which our muzzle reaches a ground target's centre while its muzzle cannot reach ours
function hull(x, y, z, D) {
  let adv = 0, mutual = 0, tot = 0
  for (let a = 0; a < 48; a++) {
    const ex = x + Math.cos(a * Math.PI / 24) * D, ey = y + Math.sin(a * Math.PI / 24) * D
    const q = nav.idx(ex, ey); if (q < 0 || !nav.pass[q]) continue
    tot++
    const ez = nav.level[q]
    const ours = w.shotClear(x, y, z + 7, ex, ey, ez + 4.5), theirs = w.shotClear(ex, ey, ez + 7, x, y, z + 4.5)
    if (ours && !theirs) adv++; else if (ours && theirs) mutual++
  }
  return tot >= 12 ? [adv / tot, mutual / tot] : null
}
console.log('\nhull-down posts (we can hit its centre, it cannot hit ours): best cell of each good roof vs best ground cell near a random point')
for (const D of [40, 60, 100, 150]) {
  const roofBest = [], roofMut = []
  for (const p of good) {
    let b = 0, bm = 0
    const stepq = Math.max(1, (p.cells.length / 60) | 0)
    for (let q = 0; q < p.cells.length; q += stepq) { const c = p.cells[q]; const h = hull(nav.cellX(c), nav.cellY(c), top[c], D); if (h && h[0] > b) { b = h[0]; bm = h[1] } }
    roofBest.push(b); roofMut.push(bm)
  }
  const gBest = [], gMut = []
  for (let k = 0; k < 60; k++) {
    let c0; do { c0 = (rnd() * n) | 0 } while (!nav.pass[c0] || nav.comp[c0] !== nav.mainComponent)
    let b = 0, bm = 0
    for (let q = 0; q < 60; q++) { const a = rnd() * 6.2832, r = rnd() * 30; const c = nav.idx(nav.cellX(c0) + Math.cos(a) * r, nav.cellY(c0) + Math.sin(a) * r); if (c < 0 || !nav.pass[c]) continue; const h = hull(nav.cellX(c), nav.cellY(c), nav.level[c], D); if (h && h[0] > b) { b = h[0]; bm = h[1] } }
    gBest.push(b); gMut.push(bm)
  }
  console.log(`  target ring ${D} m: roof best cell covers ${fmt(100 * pct(roofBest, .5), 0)}% of directions with a one-sided line (p90 ${fmt(100 * pct(roofBest, .9), 0)}%), plus ${fmt(100 * mean(roofMut), 0)}% two-sided; roofs with >= 25% one-sided: ${roofBest.filter(v => v >= 0.25).length}/${good.length}. Ground best cell within 30 m: ${fmt(100 * pct(gBest, .5), 0)}% one-sided (p90 ${fmt(100 * pct(gBest, .9), 0)}%), ${fmt(100 * mean(gMut), 0)}% two-sided`)
}
