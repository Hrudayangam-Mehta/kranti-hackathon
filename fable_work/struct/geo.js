// Structural feasibility: roofs / perches / exposure / pockets. Read-only on lib and kit.
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const { World } = await import(join(S, 'r7work/ckpt_07_LG/lib/world.js'))
const { Nav } = await import(join(S, 'r7work/ckpt_07_LG/lib/nav.js'))
const t0 = performance.now()
const world = World.loadSync(join(S, 'mechbot/kit/arena'))
const nav = new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
console.log('load ms', (performance.now() - t0).toFixed(0), 'nav', nav.nx, nav.ny, 'components', nav.compSizes.length, 'main', nav.mainComponent)
const out = {}
// ---------- A. replay: who stands on structures, who gets hit there
{
  const lines = gunzipSync(readFileSync(join(S, 'mechbot/replay/mech16.jsonl.gz'))).toString().split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const hdr = lines[0], fr = lines.filter((l) => l.m)
  const st = new Map(); const pos = new Map()
  for (const f of fr) {
    const p = new Map(); pos.set(f.t, p)
    for (const m of f.m) {
      p.set(m[0], m)
      if (m[6] <= 0 || !(m[8] & 1)) continue
      let s = st.get(m[0]); if (!s) st.set(m[0], s = { n: 0, hi: 0, maxE: 0, offNav: 0 })
      const e = m[3] - world.ground(m[1], m[2])
      s.n++; if (e > 4) s.hi++; if (e > s.maxE) s.maxE = e
      const c = nav.idx(m[1], m[2]); if (c < 0 || !nav.pass[c] || Math.abs(nav.level[c] - m[3]) > 1.5) s.offNav++
    }
  }
  console.log('\nA. replay: grounded frames on a structure (>4 m above terrain), off-nav = standing where the nav grid has no cell at that height')
  for (const [id, s] of [...st].sort((a, b) => a[0] - b[0])) console.log(`  ${id} ${hdr.mechs[id].name.padEnd(10)} grounded ${s.n}  elevated ${(100 * s.hi / s.n).toFixed(0)}%  max ${s.maxE.toFixed(1)} m  offNav ${(100 * s.offNav / s.n).toFixed(0)}%`)
  // hits by elevation of the victim and shooter
  let b = { lowlow: [0, 0], hiVictim: [0, 0], hiShooter: [0, 0] }
  const ts = [...pos.keys()]
  for (const f of fr) for (const e of f.ev || []) {
    if (e.e !== 'hit' || e.src == null || e.src >= 100 || e.dst >= 100) continue
    const p = pos.get(f.t), a = p.get(e.src), d = p.get(e.dst); if (!a || !d) continue
    const ea = a[3] - world.ground(a[1], a[2]), ed = d[3] - world.ground(d[1], d[2])
    const k = ed > 4 ? 'hiVictim' : ea > 4 ? 'hiShooter' : 'lowlow'
    b[k][0]++; b[k][1] += e.amt
  }
  console.log('  mech-on-mech hits [count, damage]:', JSON.stringify(b))
}
// ---------- B. roofs
const HIT = [[76, 0.98], [101, 0.87], [126, 0.75], [151, 0.53], [176, 0.38], [202, 0.29], [230, 0.27]]
const pHit = (r) => { for (const [d, p] of HIT) if (r <= d) return p; return 0 }
const B = world.bounds, step = 2
const gx0 = B.minX, gy0 = B.minY, gnx = Math.ceil((B.maxX - B.minX) / step), gny = Math.ceil((B.maxY - B.minY) / step)
const top = new Float32Array(gnx * gny), gnd = new Float32Array(gnx * gny), pid = new Int32Array(gnx * gny)
for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) {
  const x = gx0 + (i + 0.5) * step, y = gy0 + (j + 0.5) * step, k = j * gnx + i
  top[k] = world.surfaceZ(x, y); gnd[k] = world.ground(x, y); pid[k] = world.surfacePrism(x, y)
}
// roof cell: on a prism top >= 6 m above terrain. setback = distance to nearest cell whose top differs by > 1.2 m (edge or a higher wall)
const roof = new Uint8Array(gnx * gny)
for (let k = 0; k < roof.length; k++) roof[k] = pid[k] >= 0 && top[k] - gnd[k] >= 6 ? 1 : 0
const setback = new Float32Array(gnx * gny), dropSide = new Float32Array(gnx * gny)
const RM = 8
for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) {
  const k = j * gnx + i; if (!roof[k]) continue
  let best = RM * step + 1
  for (let dj = -RM; dj <= RM; dj++) for (let di = -RM; di <= RM; di++) {
    const ii = i + di, jj = j + dj; const d = Math.hypot(di, dj) * step; if (d >= best) continue
    if (ii < 0 || jj < 0 || ii >= gnx || jj >= gny || Math.abs(top[jj * gnx + ii] - top[k]) > 1.2) best = d
  }
  setback[k] = best
}
// group roofs by prism
const roofs = new Map()
for (let k = 0; k < roof.length; k++) if (roof[k]) {
  let r = roofs.get(pid[k]); if (!r) roofs.set(pid[k], r = { id: pid[k], cells: 0, maxSet: 0, bestK: -1, H: 0, zTop: top[k] })
  r.cells++; r.H += top[k] - gnd[k]
  if (setback[k] > r.maxSet) { r.maxSet = setback[k]; r.bestK = k }
}
const roofList = [...roofs.values()].map((r) => ({ ...r, H: r.H / r.cells, area: r.cells * step * step }))
const usable = roofList.filter((r) => r.maxSet >= 6 && r.area >= 300)
console.log(`\nB. roofs: ${roofList.length} prism tops >= 6 m above terrain; ${usable.length} with a point >= 6 m from every edge and area >= 300 m2`)
const hb = [[6, 15], [15, 25], [25, 40], [40, 59], [59, 999]]
for (const [a, b] of hb) console.log(`  height ${a}-${b} m: ${usable.filter((r) => r.H >= a && r.H < b).length} roofs, area ${usable.filter((r) => r.H >= a && r.H < b).reduce((s, r) => s + r.area, 0)} m2`)
// climb needed from the adjacent ground: lowest passable main-component cell within 12 m of the roof edge
function climbTo(r) {
  let best = Infinity, at = null
  const k = r.bestK, i0 = k % gnx, j0 = (k / gnx) | 0
  // search ring around the roof: any nav main cell within 60 m of bestK, adjacent (<= 8 m) to a cell of this roof
  for (let dj = -40; dj <= 40; dj++) for (let di = -40; di <= 40; di++) {
    const ii = i0 + di, jj = j0 + dj; if (ii < 1 || jj < 1 || ii >= gnx - 1 || jj >= gny - 1) continue
    const kk = jj * gnx + ii; if (pid[kk] !== r.id) continue
    for (const [ei, ej] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
      const x = gx0 + (ii + ei + 0.5) * step, y = gy0 + (jj + ej + 0.5) * step
      const c = nav.idx(x, y); if (c < 0 || !nav.pass[c] || nav.comp[c] !== nav.mainComponent) continue
      const cl = r.zTop - nav.level[c]; if (cl < best) { best = cl; at = [x, y] }
    }
  }
  return { climb: best, at }
}
// ---------- C. exposure
// ground shooters: passable main-component nav cells on a 6 m lattice
const shooters = []
for (let j = 0; j < nav.ny; j += 3) for (let i = 0; i < nav.nx; i += 3) { const c = j * nav.nx + i; if (nav.pass[c] && nav.comp[c] === nav.mainComponent) shooters.push([nav.cellX(c), nav.cellY(c), nav.level[c]]) }
console.log(`\nC. exposure: ${shooters.length} ground shooter cells (6 m lattice, main component). Line = shooter muzzle (level+7) to our body centre (feet+4.5) with shotClear.`)
function exposure(x, y, z) {
  let n = 0, lines = 0, w = 0, near = 0, nearLines = 0, minR = Infinity, close60 = 0, close60L = 0
  for (const s of shooters) {
    const r = Math.hypot(s[0] - x, s[1] - y); if (r > 230 || r < 3) continue
    n++; if (r <= 100) near++; if (r <= 60) close60++
    if (!world.shotClear(s[0], s[1], s[2] + 7, x, y, z + 4.5)) continue
    lines++; w += pHit(r); if (r <= 100) nearLines++; if (r <= 60) close60L++; if (r < minR) minR = r
  }
  return { n, frac: lines / Math.max(1, n), wfrac: w / Math.max(1, n), near: nearLines / Math.max(1, near), c60: close60L / Math.max(1, close60), minR }
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
// baseline: random ground cells
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const base = []
while (base.length < 400) { const s = shooters[(rnd() * shooters.length) | 0]; base.push({ x: s[0], y: s[1], ...exposure(s[0], s[1], s[2]) }) }
const sm = (arr, f) => `p10 ${q(arr.map(f), 0.1).toFixed(3)} p50 ${q(arr.map(f), 0.5).toFixed(3)} p90 ${q(arr.map(f), 0.9).toFixed(3)} mean ${(arr.map(f).reduce((a, b) => a + b, 0) / arr.length).toFixed(3)}`
console.log('  GROUND baseline (400 random cells):')
console.log('    line fraction within 230 m     :', sm(base, (e) => e.frac))
console.log('    hit-weighted fraction          :', sm(base, (e) => e.wfrac))
console.log('    line fraction within 100 m     :', sm(base, (e) => e.near))
console.log('    line fraction within 60 m      :', sm(base, (e) => e.c60))
// roofs: centre perch (max setback) for each usable roof with H <= 55
const perch = []
for (const r of usable) {
  if (r.H > 55) continue
  const k = r.bestK, x = gx0 + (k % gnx + 0.5) * step, y = gy0 + (((k / gnx) | 0) + 0.5) * step
  const e = exposure(x, y, top[k]); const cl = climbTo(r)
  perch.push({ id: r.id, kind: world.prisms[r.id] && world.prisms[r.id].kind, x, y, z: top[k], H: r.H, area: r.area, set: r.maxSet, climb: cl.climb, ...e })
}
console.log(`  ROOF perches (centre point of ${perch.length} usable roofs with height <= 55 m):`)
console.log('    line fraction within 230 m     :', sm(perch, (e) => e.frac))
console.log('    hit-weighted fraction          :', sm(perch, (e) => e.wfrac))
console.log('    line fraction within 100 m     :', sm(perch, (e) => e.near))
console.log('    line fraction within 60 m      :', sm(perch, (e) => e.c60))
console.log('    nearest ground cell with a line:', sm(perch.filter((e) => e.minR < 1e9), (e) => e.minR), ' roofs with NO ground line at all:', perch.filter((e) => e.minR === Infinity).length)
perch.sort((a, b) => a.wfrac - b.wfrac)
console.log('  best 15 perches by hit-weighted exposure  [x y z | H area setback climb | frac wfrac near100 near60 minR]')
for (const p of perch.slice(0, 15)) console.log(`    ${p.x.toFixed(0)} ${p.y.toFixed(0)} ${p.z.toFixed(1)} | H ${p.H.toFixed(0)} area ${p.area} set ${p.set.toFixed(0)} climb ${p.climb.toFixed(1)} | ${p.frac.toFixed(3)} ${p.wfrac.toFixed(3)} ${p.near.toFixed(3)} ${p.c60.toFixed(3)} ${p.minR.toFixed(0)}`)
// coverage: distance from random ground cells to the nearest good perch (wfrac < 0.03, climb <= 45)
const good = perch.filter((p) => p.wfrac <= 0.03 && p.climb <= 45)
const dist = base.map((b) => Math.min(...good.map((p) => Math.hypot(p.x - b.x, p.y - b.y))))
console.log(`  good perches (hit-weighted exposure <= 0.03 and climb <= 45 m): ${good.length}; distance from a random ground cell to the nearest: p50 ${q(dist, 0.5).toFixed(0)} m p90 ${q(dist, 0.9).toFixed(0)} m`)
// zone: default centre (41.3,-72.8). count good perches inside r=380, 240, 140 of the START centre (the real centre drifts)
const zc = [41.3, -72.8]
for (const r of [560, 380, 240, 140]) console.log(`    good perches within ${r} m of the start centre: ${good.filter((p) => Math.hypot(p.x - zc[0], p.y - zc[1]) <= r).length}`)
// edge peek: at a good perch, exposure when standing 3 m from the nearest edge (toward +x,-x,+y,-y edge walk)
function edgePoint(p, ux, uy) {
  let x = p.x, y = p.y
  for (let s = 0; s < 80; s++) { const nx_ = x + ux, ny_ = y + uy; if (Math.abs(world.surfaceZ(nx_ + ux * 3, ny_ + uy * 3) - p.z) > 1.2) break; x = nx_; y = ny_ }
  return [x, y]
}
const edge = []
for (const p of good.slice(0, 40)) for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const [x, y] = edgePoint(p, ux, uy); edge.push(exposure(x, y, p.z)) }
console.log('  EDGE stance (3 m from the roof edge, 4 sides of the 40 best perches):')
console.log('    line fraction within 230 m     :', sm(edge, (e) => e.frac))
console.log('    hit-weighted fraction          :', sm(edge, (e) => e.wfrac))
console.log('    line fraction within 60 m      :', sm(edge, (e) => e.c60))
// ---------- D. ground low-exposure cells (choke / interior candidates) and pockets
const allG = []
for (let q_ = 0; q_ < shooters.length; q_ += 4) { const s = shooters[q_]; allG.push({ x: s[0], y: s[1], wd: nav.wallDistAt(s[0], s[1]), ...exposure(s[0], s[1], s[2]) }) }
allG.sort((a, b) => a.wfrac - b.wfrac)
console.log(`\nD. ground cells scanned ${allG.length} (24 m lattice subset). Lowest hit-weighted exposure:`)
for (const g of allG.slice(0, 12)) console.log(`    ${g.x.toFixed(0)} ${g.y.toFixed(0)} wallDist ${g.wd.toFixed(1)} | frac ${g.frac.toFixed(3)} wfrac ${g.wfrac.toFixed(3)} near100 ${g.near.toFixed(3)} near60 ${g.c60.toFixed(3)}`)
console.log('    share of ground cells with hit-weighted exposure <= 0.03:', (allG.filter((g) => g.wfrac <= 0.03).length / allG.length).toFixed(3), ' <= 0.05:', (allG.filter((g) => g.wfrac <= 0.05).length / allG.length).toFixed(3))
// pockets = non-main components >= 25 cells
const comps = []
for (let k = 0; k < nav.compSizes.length; k++) if (k !== nav.mainComponent && nav.compSizes[k] >= 25) comps.push({ k, size: nav.compSizes[k], sx: 0, sy: 0, sz: 0, n: 0 })
const byK = new Map(comps.map((c) => [c.k, c]))
for (let c = 0; c < nav.n; c++) { const o = byK.get(nav.comp[c]); if (o && nav.pass[c]) { o.sx += nav.cellX(c); o.sy += nav.cellY(c); o.sz += nav.level[c] - world.ground(nav.cellX(c), nav.cellY(c)); o.n++ } }
console.log(`\n  pockets (ground components other than main, >= 25 cells): ${comps.length}`)
for (const o of comps.sort((a, b) => b.size - a.size)) {
  const x = o.sx / o.n, y = o.sy / o.n; const c = nav.nearestPassableIdx(x, y, 40)
  const px = nav.cellX(c), py = nav.cellY(c); const e = exposure(px, py, nav.level[c]); const hp = nav.hopPlan(px, py)
  console.log(`    comp ${o.k} cells ${o.size} (${(o.size * 4)} m2) centre ${x.toFixed(0)},${y.toFixed(0)} mean height over terrain ${(o.sz / o.n).toFixed(1)} | frac ${e.frac.toFixed(3)} wfrac ${e.wfrac.toFixed(3)} near60 ${e.c60.toFixed(3)} minR ${e.minR.toFixed(0)} | exit climb ${hp ? hp.climb.toFixed(1) : 'none'} hop ${hp ? hp.hopLen.toFixed(0) : '-'}`)
}
writeFileSync(join(S, 'fable_work/struct/geo_out.json'), JSON.stringify({ perch, base: base.slice(0, 50), ground: allG.slice(0, 50) }))
console.log('total ms', (performance.now() - t0).toFixed(0))
