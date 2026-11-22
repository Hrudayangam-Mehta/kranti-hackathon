// Validation + benchmarks for bot/lib/world.js and bot/lib/nav.js.
// Run:  bun tools/test_world.js   (or: node tools/test_world.js)      add --quick for fewer samples
// Exit code 0 when every check passes. DEV ONLY: not part of the shipped bot.
//
// Sections: A geometry vs the organisers' client collision class (differential, dev-only oracle) and vs a
// brute force; B replay checks (terrain, solids, lasers, impacts, lightning); C navigation; D benchmarks.

import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const T_START = performance.now()
const { World, pointInPrism2D, distToPrismEdge2D, pointInEdges } = await import('../bot/lib/world.js')
const { Nav } = await import('../bot/lib/nav.js')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUICK = process.argv.includes('--quick')

// ---------------------------------------------------------------- cold init benchmark (first thing we do)
const t0 = performance.now()
const world = World.loadSync(join(ROOT, 'kit', 'arena'))
const t1 = performance.now()
const nav = new Nav(world)
const t2 = performance.now()
const initWorldMs = t1 - t0, initNavMs = t2 - t1

const checks = []
const bench = {}
const facts = {}
function check(name, passed, result) {
  checks.push({ check: name, passed: !!passed, result })
  console.log((passed ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + result)
}
function mulberry(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(3) : 'n/a') + '%'
const quant = (arr, p) => { if (!arr.length) return NaN; const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
const B = world.bounds

console.log(`init: World.loadSync ${initWorldMs.toFixed(1)} ms + new Nav ${initNavMs.toFixed(1)} ms = ${(initWorldMs + initNavMs).toFixed(1)} ms  (prisms ${world.prisms.length}, trees ${world.trees.length}, nav ${nav.nx}x${nav.ny})`)

// ================================================================ A. geometry semantics
console.log('\n--- A. geometry semantics')
const json = JSON.parse(readFileSync(join(ROOT, 'kit', 'arena', 'v2', 'world.json'), 'utf8'))
const terrBuf = readFileSync(join(ROOT, 'kit', 'arena', 'v2', json.terrain.file))
const i16 = new Int16Array(terrBuf.buffer.slice(terrBuf.byteOffset, terrBuf.byteOffset + terrBuf.byteLength))

function loadReference() {
  const f = join(ROOT, 'notes', 'official_client_collision_reference.min.js')
  if (!existsSync(f)) return null
  try {
    const Cls = new Function(readFileSync(f, 'utf8') + '\n;return Sf;')()
    const safe = { ...json, water: [] }
    return { full: new Cls(safe, i16), noTrees: new Cls({ ...safe, trees: { fields: json.trees.fields, data: [] } }, i16) }
  } catch (e) { console.log('reference class could not be evaluated:', String(e && e.message || e)); return null }
}
const ref = loadReference()

function randomSegment(rnd, out) {
  const kind = rnd()
  const ax = B.minX + rnd() * (B.maxX - B.minX), ay = B.minY + rnd() * (B.maxY - B.minY)
  let az, bx, by, bz
  if (kind < 0.6) {            // mech-like: eye height to a body somewhere else
    az = world.surfaceZ(ax, ay) + 8
    const ang = rnd() * 2 * Math.PI, len = 5 + rnd() * 245
    bx = ax + Math.cos(ang) * len; by = ay + Math.sin(ang) * len
    bz = world.ground(bx, by) + rnd() * 12
  } else if (kind < 0.85) {    // arbitrary, may start inside solids or under ground
    az = world.ground(ax, ay) - 2 + rnd() * 62
    const ang = rnd() * 2 * Math.PI, len = rnd() * 300
    bx = ax + Math.cos(ang) * len; by = ay + Math.sin(ang) * len
    bz = world.ground(bx, by) - 2 + rnd() * 62
  } else {                     // steep or vertical
    az = world.ground(ax, ay) + rnd() * 80
    const off = rnd() < 0.3 ? 0 : rnd() * 3, ang = rnd() * 2 * Math.PI
    bx = ax + Math.cos(ang) * off; by = ay + Math.sin(ang) * off
    bz = world.ground(bx, by) - 1 + rnd() * 80
  }
  out[0] = ax; out[1] = ay; out[2] = az; out[3] = bx; out[4] = by; out[5] = bz
}

if (ref) {
  const R = ref.full, rnd = mulberry(7)
  const NP = QUICK ? 20000 : 80000
  // points: ground / surfaceZ / ceilingZ / bodyBlocked
  let dG = 0, sMis = 0, cMis = 0, bMis = 0, bN = 0
  const step = json.rules.maxStep
  for (let k = 0; k < NP; k++) {
    const x = B.minX - 20 + rnd() * (B.maxX - B.minX + 40), y = B.minY - 20 + rnd() * (B.maxY - B.minY + 40)
    const g = world.ground(x, y)
    dG = Math.max(dG, Math.abs(g - R.groundHeight(x, y)))
    const zm = rnd() < 0.3 ? Infinity : g + rnd() * 40
    if (world.surfaceZ(x, y, zm) !== R.surfaceZ(x, y, zm)) sMis++
    const z = g + rnd() * 30
    if (world.ceilingZ(x, y, z) !== R.ceilingAbove(x, y, z, 0.01)) cMis++
    if (k % 4 === 0) {
      const fz = R.surfaceZ(x, y, g + step)
      const mine = world.bodyBlocked(x, y, fz, 2.5, 9, step)
      const theirs = ref.noTrees.penetration({ x, y, z: fz, radius: 2.5, height: 9 }, x, y).depth > 0
      bN++; if (mine !== theirs) bMis++
    }
  }
  check('A1 ground() equals client groundHeight', dG < 1e-9, `max |diff| ${dG.toExponential(2)} m over ${NP} points (incl. outside bounds)`)
  check('A2 surfaceZ() equals client surfaceZ', sMis === 0, `${sMis} mismatches / ${NP}`)
  check('A3 ceilingZ() equals client ceilingAbove', cMis === 0, `${cMis} mismatches / ${NP}`)
  check('A4 bodyBlocked() equals client penetration>0 (prisms + map edge)', bMis <= bN * 1e-4, `${bMis} mismatches / ${bN}`)

  // segments
  const NS = QUICK ? 20000 : 80000
  const s = new Float64Array(6)
  const st = { shot: { n: 0, same: 0, prismN: 0, prismBad: 0, terrN: 0, terrBad: 0, clearN: 0, clearBad: 0, maxPrismErr: 0, maxTerrErr: 0 },
    sight: { n: 0, same: 0, prismN: 0, prismBad: 0, terrN: 0, terrBad: 0, clearN: 0, clearBad: 0, maxPrismErr: 0, maxTerrErr: 0 } }
  let seeN = 0, seeBad = 0, chordMax = 0, anyBad = 0
  const worst = []
  for (let k = 0; k < NS; k++) {
    randomSegment(rnd, s)
    const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2])
    for (const mode of ['shot', 'sight']) {
      const o = st[mode]
      const mine = mode === 'shot' ? world.rayShot(s[0], s[1], s[2], s[3], s[4], s[5]) : world.raySight(s[0], s[1], s[2], s[3], s[4], s[5])
      const r = R.raycast(s[0], s[1], s[2], s[3], s[4], s[5], mode === 'shot' ? { trunks: false } : {})
      const theirs = r ? r.t : 1
      const err = Math.abs(mine - theirs) * len
      o.n++
      if (!r) { o.clearN++; if (mine < 1) { o.clearBad++; worst.push([mode, 'ref clear, mine hit', err.toFixed(3), Array.from(s).map(v => +v.toFixed(2)).join(',')]) } }
      else if (r.kind === 'terrain') { o.terrN++; if (err > 0.6) { o.terrBad++; worst.push([mode, 'terrain', err.toFixed(3), Array.from(s).map(v => +v.toFixed(2)).join(',')]) } if (err > o.maxTerrErr) o.maxTerrErr = err }
      else { o.prismN++; if (err > 1e-6) { o.prismBad++; worst.push([mode, r.kind, err.toFixed(6), Array.from(s).map(v => +v.toFixed(2)).join(',')]) } if (err > o.maxPrismErr) o.maxPrismErr = err }
      // any-hit variants must agree with the first-hit variants exactly
      const anyClear = mode === 'shot' ? world.shotClear(s[0], s[1], s[2], s[3], s[4], s[5]) : world.sightClear(s[0], s[1], s[2], s[3], s[4], s[5])
      if (anyClear !== (mine >= 1)) anyBad++
    }
    const los = R.lineOfSight(s[0], s[1], s[2], s[3], s[4], s[5])
    const mineSee = world.canSee(s[0], s[1], s[2], s[3], s[4], s[5])
    seeN++; if (mineSee !== los.visible) seeBad++
    const tr = R.canopyTransmittance(s[0], s[1], s[2], s[3], s[4], s[5])
    chordMax = Math.max(chordMax, Math.abs(Math.exp(-world.canopyDensity * world.canopyChord(s[0], s[1], s[2], s[3], s[4], s[5])) - tr))
    const mine2 = world.raySight(s[0], s[1], s[2], s[3], s[4], s[5]) >= 1 && world.canopyChord(s[0], s[1], s[2], s[3], s[4], s[5]) <= world.maxCanopyChord
    if (mine2 !== mineSee) anyBad++
  }
  for (const mode of ['shot', 'sight']) {
    const o = st[mode], name = mode === 'shot' ? 'rayShot' : 'raySight'
    check(`A5 ${name} vs client raycast: prism${mode === 'sight' ? '/trunk' : ''} hits`, o.prismBad === 0, `${o.prismN - o.prismBad}/${o.prismN} identical (max err ${o.maxPrismErr.toExponential(2)} m)`)
    check(`A6 ${name} vs client raycast: terrain hits (0.5 m march)`, o.terrBad <= o.terrN * 0.01, `${o.terrN - o.terrBad}/${o.terrN} within 0.6 m (max err ${o.maxTerrErr.toFixed(2)} m)`)
    check(`A7 ${name} vs client raycast: clear segments`, o.clearBad <= o.clearN * 0.002, `${o.clearN - o.clearBad}/${o.clearN} also clear`)
  }
  check('A8 canSee vs client lineOfSight.visible', seeBad <= seeN * 0.002, `${seeN - seeBad}/${seeN} agree (${pct(seeN - seeBad, seeN)})`)
  check('A9 canopy transmittance vs client', chordMax < 1e-9, `max |diff| ${chordMax.toExponential(2)}`)
  check('A10 any-hit variants (shotClear, sightClear, canSee) consistent with first-hit', anyBad === 0, `${anyBad} inconsistencies / ${NS * 3}`)
  if (worst.length) { console.log('  sample disagreements:'); for (const wv of worst.slice(0, 8)) console.log('   ', wv.join(' | ')) }
} else {
  console.log('  (client reference file not available: differential checks A1-A10 skipped)')
}

// Brute force over every prism (no grid, no stamps, no slab pruning): validates the acceleration structure.
{
  const rnd = mulberry(99), s = new Float64Array(6)
  const N = QUICK ? 3000 : 12000
  let bad = 0, hitN = 0, maxErr = 0, solidBad = 0
  const brute = (ax, ay, az, bx, by, bz) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az
    let best = 1
    for (const p of world.prisms) {
      if (az >= p.base && az <= p.top && pointInPrism2D(p, ax, ay)) return 0
      const E = p.edges
      for (let i = 0; i < E.length; i += 4) {
        const ex = E[i + 2] - E[i], ey = E[i + 3] - E[i + 1], den = dx * ey - dy * ex
        if (Math.abs(den) < 1e-9) continue
        const t = ((E[i] - ax) * ey - (E[i + 1] - ay) * ex) / den, u = ((E[i] - ax) * dy - (E[i + 1] - ay) * dx) / den
        if (t < 0 || t >= best || u < 0 || u > 1) continue
        const z = az + dz * t
        if (z >= p.base && z <= p.top) best = t
      }
      if (Math.abs(dz) > 1e-9) {
        const t = ((dz < 0 ? p.top : p.base) - az) / dz
        if (t >= 0 && t < best && pointInPrism2D(p, ax + dx * t, ay + dy * t)) best = t
      }
    }
    return best
  }
  for (let k = 0; k < N; k++) {
    randomSegment(rnd, s)
    const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2])
    const bp = brute(s[0], s[1], s[2], s[3], s[4], s[5])
    const mine = world.rayShot(s[0], s[1], s[2], s[3], s[4], s[5])
    // mine also includes terrain, so it may only be earlier than the prism-only brute force
    if (mine > bp + 1e-9) bad++
    else if (mine < bp - 1e-9) {
      const hx = s[0] + (s[3] - s[0]) * mine, hy = s[1] + (s[4] - s[1]) * mine, hz = s[2] + (s[5] - s[2]) * mine
      if (Math.abs(hz - world.ground(hx, hy)) > 0.05 && mine > 0) bad++       // earlier hit must be the terrain surface
    } else if (bp < 1) { hitN++; maxErr = Math.max(maxErr, Math.abs(mine - bp) * len) }
    // inSolid / prismAt vs brute force
    let inP = false
    for (const p of world.prisms) if (s[2] >= p.base && s[2] <= p.top && pointInPrism2D(p, s[0], s[1])) { inP = true; break }
    if ((world.prismAt(s[0], s[1], s[2]) >= 0) !== inP) solidBad++
    if (world.inSolid(s[0], s[1], s[2]) !== (inP || s[2] < world.ground(s[0], s[1]))) solidBad++
  }
  check('A11 rayShot vs all-prism brute force (grid/stamp/slab logic)', bad === 0, `${bad} violations / ${N} segments, ${hitN} identical prism hits`)
  check('A12 inSolid/prismAt vs brute force', solidBad === 0, `${solidBad} mismatches / ${N * 2}`)
}

// ================================================================ B. replay
console.log('\n--- B. replay checks')
const replayPath = join(ROOT, 'replay', 'mech16.jsonl.gz')
const lines = gunzipSync(readFileSync(replayPath)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const header = lines[0], frames = lines.filter((l) => l.m)
const DT = (header.frame_every || 2) / (header.tick_hz || 20)
{
  // B1 terrain / surface under grounded mechs ; B2 nobody inside a solid
  let n = 0, ok = 0, onRoof = 0, alive = 0, solid = 0
  const out = [], roofs = []
  for (const f of frames) for (const m of f.m) {
    if (m[6] <= 0) continue
    alive++
    if (world.inSolid(m[1], m[2], m[3] + 4.5)) solid++
    if (!(m[8] & 1)) continue
    n++
    const sz = world.surfaceZ(m[1], m[2], m[3] + 1.3)
    const d = m[3] - sz
    if (Math.abs(d) <= 0.15) ok++; else out.push([f.t, m[0], m[1], m[2], m[3], +sz.toFixed(2), +d.toFixed(2)])
    const g = world.ground(m[1], m[2])
    if (m[3] > g + 0.3) { onRoof++; roofs.push(m[3] - g) }
  }
  out.sort((a, b) => Math.abs(b[6]) - Math.abs(a[6]))
  check('B1 grounded mech z within 0.15 m of surfaceZ(x,y,z+1.3)', ok === n, `${ok}/${n} (${pct(ok, n)}); worst outliers [t,id,x,y,z,surf,d]: ${out.length ? JSON.stringify(out.slice(0, 5)) : 'none'}`)
  check('B2 no mech centre inside a solid at body height (inSolid(x,y,z+4.5))', solid === 0, `${solid}/${alive} alive mech samples inside solids`)
  facts.groundedSamples = n; facts.groundedOnPrismTops = onRoof
  facts.roofHeightAboveTerrain = { p10: +quant(roofs, 0.1).toFixed(1), p50: +quant(roofs, 0.5).toFixed(1), p90: +quant(roofs, 0.9).toFixed(1), max: +quant(roofs, 1).toFixed(1) }
}
{
  // B3 lasers
  let n = 0, clear = 0, geoN = 0, geoOk = 0, rangeN = 0, hitN = 0, minFrac = 1
  const bad = []
  for (const f of frames) for (const e of (f.ev || [])) {
    if (e.e !== 'laser') continue
    n++
    const [ax, ay, az] = e.from, [bx, by, bz] = e.to
    const len = Math.hypot(bx - ax, by - ay, bz - az)
    const t = world.rayShot(ax, ay, az, bx, by, bz)
    if (t < minFrac) minFrac = t
    if (t >= 0.97) clear++; else bad.push(['blocked early', e.t, e.id, t.toFixed(3)])
    if (e.hits && e.hits.length) { hitN++; continue }
    if (len >= 279.5) { rangeN++; continue }
    geoN++
    const ux = (bx - ax) / len, uy = (by - ay) / len, uz = (bz - az) / len
    const t2 = world.rayShot(ax, ay, az, bx + ux, by + uy, bz + uz)
    if (t2 < 1 && Math.abs(t2 * (len + 1) - len) <= 0.5) geoOk++; else bad.push(['end not on geometry', e.t, e.id, (t2 * (len + 1)).toFixed(2), len.toFixed(2)])
  }
  {
    // muzzle offset of laser shots relative to the shooter's feet (does the muzzle rise with cubes?)
    const at = new Map()
    for (const f of frames) { const mm = new Map(); for (const m of f.m) mm.set(m[0], m); at.set(f.t, mm) }
    let zmin = Infinity, zmax = -Infinity, hsum = 0, k = 0, maxCubes = 0
    for (const f of frames) for (const e of (f.ev || [])) {
      if (e.e !== 'laser') continue
      const m = (at.get(e.t) || at.get(e.t + 1) || new Map()).get(e.id) || (at.get(e.t - 1) || new Map()).get(e.id)
      if (!m) continue
      const dz = e.from[2] - m[3]
      if (Math.abs(dz - 7) > 2) continue          // shooter moved vertically between the shot and the frame
      zmin = Math.min(zmin, dz); zmax = Math.max(zmax, dz); hsum += Math.hypot(e.from[0] - m[1], e.from[1] - m[2]); k++
      if (m[9] > maxCubes) maxCubes = m[9]
    }
    facts.laserMuzzle = { shots: k, zOffsetMin: +zmin.toFixed(2), zOffsetMax: +zmax.toFixed(2), horizOffsetMean: +(hsum / Math.max(1, k)).toFixed(2), maxCubesOfShooter: maxCubes }
  }
  check('B3a laser beams: rayShot(from->to) clear to the end point (fraction >= 0.97)', clear === n, `${clear}/${n}, min fraction ${minFrac.toFixed(4)} ${bad.length ? JSON.stringify(bad.slice(0, 4)) : ''}`)
  check('B3b laser beams that stopped short of range with no hit end on geometry (1 m beyond is blocked within 0.5 m of the end)', geoOk === geoN, `${geoOk}/${geoN} (${rangeN} beams reached the 280 m range, ${hitN} ended on a target)`)
}
{
  // B4 gun / NPC bullet impacts without a target lie on geometry; flight path from first sighting is clear
  const first = new Map()
  let n = 0, onGeo = 0, pathN = 0, pathOk = 0, worstD = 0
  const bad = []
  for (const f of frames) {
    for (const e of (f.ev || [])) {
      if (e.e !== 'impact' || !(e.hit === null || e.hit === undefined)) continue
      n++
      const [x, y, z] = e.at
      let d = world.inSolid(x, y, z) ? 0 : Infinity
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        if (!a && !b && !c) continue
        const l = Math.hypot(a, b, c), R = 3
        const t = world.rayShot(x, y, z, x + a / l * R, y + b / l * R, z + c / l * R)
        if (t < 1 && t * R < d) d = t * R
      }
      if (d <= 1.5) onGeo++; else bad.push([e.t, e.p, x, y, z])
      if (d < Infinity && d > worstD) worstD = d
      const p0 = first.get(e.p)
      if (p0) {
        pathN++
        const len = Math.hypot(x - p0[2], y - p0[3], z - p0[4])
        const t = world.rayShot(p0[2], p0[3], p0[4], x, y, z)
        if ((1 - t) * len <= 0.3) pathOk++
      }
    }
    for (const p of (f.p || [])) if (!first.has(p[0])) first.set(p[0], p)
  }
  check('B4a bullet impacts with no target lie on geometry (<= 1.5 m)', onGeo === n, `${onGeo}/${n}, worst distance ${worstD.toFixed(2)} m ${bad.length ? JSON.stringify(bad.slice(0, 3)) : ''}`)
  check('B4b bullet flight line (first frame seen -> impact) is clear until 0.3 m before the impact', pathOk >= pathN * 0.99, `${pathOk}/${pathN}`)
}
{
  // B5 lightning arcs need a clear line (extra)
  let n = 0, ok = 0
  for (const f of frames) for (const e of (f.ev || [])) {
    if (e.e !== 'zap' || !e.path) continue
    for (let k = 0; k + 1 < e.path.length; k++) {
      const a = e.path[k], b = e.path[k + 1]
      n++
      if (world.rayShot(a[0], a[1], a[2], b[0], b[1], b[2]) >= 0.97) ok++
    }
  }
  check('B5 lightning arc segments are clear for rayShot (fraction >= 0.97)', ok >= n * 0.98, `${ok}/${n}`)
}
{
  // mechanics facts measured from the replay
  const prev = new Map()
  const walk = [], boost = [], dirSlope = []
  let trunkNear = 0, trunkInside = 0, alive = 0, maxRise = 0, maxFall = 0, fastLand = 0, fastLandHurt = 0
  const minWallByCubes = {}
  const wallD = (x, y, z) => {
    let best = Infinity
    for (const p of world.prisms) {
      if (p.top <= z + 1.2 || p.base >= z + 9) continue
      if (pointInPrism2D(p, x, y)) return 0
      if (x < p.minX - 6 || x > p.maxX + 6 || y < p.minY - 6 || y > p.maxY + 6) continue
      const d = distToPrismEdge2D(p, x, y); if (d < best) best = d
    }
    return best
  }
  const hurtAt = new Map()
  for (const f of frames) for (const e of (f.ev || [])) if (e.e === 'hit') { if (!hurtAt.has(e.dst)) hurtAt.set(e.dst, new Set()); hurtAt.get(e.dst).add(e.t >> 1) }
  for (const f of frames) for (const m of f.m) {
    const [id, x, y, z, , , hp, , flags, cubes] = m
    if (hp <= 0) { prev.delete(id); continue }
    alive++
    for (const t of world.trees) {
      const d = Math.hypot(x - t.x, y - t.y)
      if (d < 2.5 + t.trunkR - 0.05 && t.trunkTop > z + 1.2 && t.z - 1 < z + 9) { trunkNear++; if (d < t.trunkR) trunkInside++; break }
    }
    if (flags & 1) {
      const d = wallD(x, y, z)
      if (!(cubes in minWallByCubes) || d < minWallByCubes[cubes]) minWallByCubes[cubes] = d
    }
    const p = prev.get(id)
    if (p && f.t - p.t === (header.frame_every || 2)) {
      const run = Math.hypot(x - p.x, y - p.y), sp = run / DT, vz = (z - p.z) / DT
      if ((flags & 1) && (p.flags & 1)) {
        if ((flags & 2) && (p.flags & 2)) boost.push(sp); else if (!(flags & 2) && !(p.flags & 2) && !(flags & 4)) walk.push(sp)
        if (run > 0.2 && z > p.z && Math.abs(z - world.ground(x, y)) < 0.05 && Math.abs(p.z - world.ground(p.x, p.y)) < 0.05) {
          const ux = (x - p.x) / run, uy = (y - p.y) / run
          dirSlope.push(((world.ground(x + 1, y) - world.ground(x - 1, y)) * ux + (world.ground(x, y + 1) - world.ground(x, y - 1)) * uy) / 2)
        }
      } else {
        if (vz > maxRise) maxRise = vz
        if (vz < maxFall) maxFall = vz
        if ((flags & 1) && vz < -15) {
          fastLand++
          const hs = hurtAt.get(id)
          const recentlyHit = hs && [0, 1, 2, 3].some((q) => hs.has((f.t >> 1) - q))
          if (hp < p.hp && !recentlyHit) fastLandHurt++
        }
      }
    }
    prev.set(id, { t: f.t, x, y, z, flags, hp })
  }
  facts.walkSpeed = { p50: +quant(walk, 0.5).toFixed(2), p95: +quant(walk, 0.95).toFixed(2), p99: +quant(walk, 0.99).toFixed(2) }
  facts.boostSpeed = { p50: +quant(boost, 0.5).toFixed(2), p95: +quant(boost, 0.95).toFixed(2), p99: +quant(boost, 0.99).toFixed(2) }
  facts.maxRiseRate = +maxRise.toFixed(2); facts.maxFallRate = +maxFall.toFixed(2)
  facts.fastLandings = fastLand; facts.fastLandingsWithUnexplainedDamage = fastLandHurt
  facts.framesOverlappingTrunkCylinder = trunkNear; facts.framesCentreInsideTrunk = trunkInside; facts.aliveSamples = alive
  facts.minWallDistanceByCubes = Object.fromEntries(Object.entries(minWallByCubes).map(([k, v]) => [k, +v.toFixed(2)]))
  facts.uphillDirectionalSlope = { n: dirSlope.length, max: +quant(dirSlope, 1).toFixed(3), p999: +quant(dirSlope, 0.999).toFixed(3), tanMax: +Math.tan(50 * Math.PI / 180).toFixed(3) }
  console.log('  replay facts: ' + JSON.stringify(facts))
}

// ================================================================ C. navigation
console.log('\n--- C. navigation')
const stepUp = nav.stepUp
{
  // C1 wallDist against an exact brute force using the same wall definition relative to the cell level
  const rnd = mulberry(5)
  const N = QUICK ? 1500 : 5000
  let maxErr = 0, n = 0
  for (let k = 0; k < N; k++) {
    const c = (rnd() * nav.n) | 0
    const x = nav.cellX(c), y = nav.cellY(c)
    // wall = prism whose top is above nav.wallLo[c] (lowest nearby standing level + stepUp) and whose underside
    // is below nav.headHi[c] (highest nearby level + base body height + margin)
    let best = Math.min(30, x - B.minX, B.maxX - x, y - B.minY, B.maxY - y)
    for (const p of world.prisms) {
      if (p.top <= nav.wallLo[c] || p.base >= nav.headHi[c]) continue
      const d = distToPrismEdge2D(p, x, y); if (d < best) best = d
    }
    if (best < 0) best = 0
    if (nav.wallDist[c] === 0) { if (world.bodyBlocked(x, y, nav.level[c], 0.01, nav.baseHeight + nav.headMargin, stepUp) || best < 1e-6 || nav.wallDist[c] <= best) { n++; continue } }
    const err = Math.abs(best - nav.wallDist[c]); if (err > maxErr) maxErr = err
    n++
  }
  check('C1 wallDist vs exact brute force', maxErr <= 0.5, `max |error| ${maxErr.toExponential(2)} m over ${n} random cells (required <= 0.5 m)`)
}
{
  // C2 passable cells are free of walls for the real cylinder; level follows surfaceZ
  let n = 0, bad = 0, lvBad = 0, lvN = 0
  for (let c = 0; c < nav.n; c += 3) {
    const x = nav.cellX(c), y = nav.cellY(c)
    if (!nav.onTop[c] || nav.level[c] <= world.ground(x, y) + stepUp) { lvN++; if (Math.abs(nav.level[c] - world.surfaceZ(x, y, world.ground(x, y) + stepUp)) > 1e-4) lvBad++ }
    if (!nav.pass[c]) continue
    n++
    if (world.bodyBlocked(x, y, nav.level[c], nav.radius + nav.wallMargin - 0.01, nav.height + nav.headMargin - 0.01, stepUp)) bad++
  }
  check('C2a passable cells: real cylinder (radius+margin, height+margin) overlaps no wall', bad === 0, `${bad} blocked / ${n} passable cells sampled`)
  check('C2b cell level equals surfaceZ(x,y,ground+stepUp) (non-deck cells)', lvBad === 0, `${lvBad} mismatches / ${lvN}`)
}
{
  // C3 replay: grounded mechs at ground level stand in (or within 2 m of) a passable cell
  let n = 0, inPass = 0, near = 0, far = 0
  const comps = {}
  for (const f of frames) for (const m of f.m) {
    if (m[6] <= 0 || !(m[8] & 1)) continue
    const c = nav.idx(m[1], m[2])
    if (c < 0 || Math.abs(m[3] - nav.level[c]) > 0.6) continue       // on a roof: not the ground layer
    n++
    if (nav.pass[c]) { inPass++; comps[nav.comp[c]] = (comps[nav.comp[c]] || 0) + 1; continue }
    const q = nav.nearestPassableIdx(m[1], m[2], 4)
    if (q >= 0 && Math.hypot(nav.cellX(q) - m[1], nav.cellY(q) - m[2]) <= 2) near++; else far++
  }
  check('C3 grounded replay positions at ground level are in or within 2 m of a passable cell (>= 99%)', (inPass + near) >= n * 0.99, `${inPass + near}/${n} (${pct(inPass + near, n)}): ${inPass} in a passable cell, ${near} within 2 m, ${far} farther`)
  facts.replayGroundSamplesByComponent = comps
}
const main = nav.mainComponent
const mainCells = []
for (let c = 0; c < nav.n; c++) if (nav.comp[c] === main) mainCells.push(c)
{
  let passN = 0; for (let c = 0; c < nav.n; c++) passN += nav.pass[c]
  const sorted = [...nav.compSizes].sort((a, b) => b - a)
  facts.nav = { cells: nav.n, passable: passN, components: nav.compSizes.length, largest: sorted.slice(0, 4), deckCells: nav.promotedCells, slopeBlockedDirectedEdges: nav.slopeCutEdges }
  console.log('  nav facts: ' + JSON.stringify(facts.nav))
}

function verifyPath(r, ax, ay, bx, by, needGoal) {
  const pts = r.pts
  if (!pts.length) return 'empty'
  if (pts[0][0] !== ax || pts[0][1] !== ay) return 'does not start at the start'
  if (needGoal && (pts[pts.length - 1][0] !== bx || pts[pts.length - 1][1] !== by)) return 'does not end at the goal'
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]
    if (!nav.walkLine(x0, y0, x1, y1, true)) return `leg ${k} fails strict walkLine`
    const len = Math.hypot(x1 - x0, y1 - y0), ns = Math.max(1, Math.ceil(len / 0.25))
    for (let s = 0; s <= ns; s++) {
      const x = x0 + (x1 - x0) * s / ns, y = y0 + (y1 - y0) * s / ns
      if (!nav.passableAt(x, y)) return `leg ${k} crosses an impassable cell at ${x.toFixed(1)},${y.toFixed(1)}`
      const z = world.surfaceZ(x, y, nav.levelAt(x, y) + 0.6)
      if (world.bodyBlocked(x, y, z, nav.radius, nav.height, stepUp)) return `leg ${k}: body overlaps a wall at ${x.toFixed(1)},${y.toFixed(1)}`
    }
  }
  return null
}
// a leg between a point and the centre of its own / an adjacent cell needs no line check
const len0 = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0) <= nav.cell * Math.SQRT2 * 1.5 + 1e-9
function verifyLoose(r, ax, ay) {
  // paths between arbitrary points: interior legs are strict, the first/last leg may start or end near a wall
  const pts = r.pts
  if (!pts.length || pts[0][0] !== ax || pts[0][1] !== ay) return 'bad start'
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]
    const endLeg = k === 0 || k === pts.length - 2
    if (!(endLeg ? nav.walkLine(x0, y0, x1, y1) || len0(x0, y0, x1, y1) : nav.walkLine(x0, y0, x1, y1, true))) return `leg ${k} fails walkLine`
    const len = Math.hypot(x1 - x0, y1 - y0), ns = Math.max(1, Math.ceil(len / 0.25))
    for (let s = 0; s <= ns; s++) {
      const x = x0 + (x1 - x0) * s / ns, y = y0 + (y1 - y0) * s / ns
      if (!nav.passableAt(x, y)) return `leg ${k} crosses an impassable cell`
      const z = world.surfaceZ(x, y, nav.levelAt(x, y) + 0.6)
      if (world.bodyBlocked(x, y, z, endLeg ? nav.radius - 0.3 : nav.radius, nav.height, stepUp)) return `leg ${k}: body overlaps a wall at ${x.toFixed(1)},${y.toFixed(1)}`
    }
  }
  return null
}
const pathTimes = []
{
  // C4 300 random queries in the largest component
  const rnd = mulberry(2024)
  const NQ = 300
  // warm-up so the timings are steady-state JIT numbers
  for (let k = 0; k < 60; k++) { const a = mainCells[(rnd() * mainCells.length) | 0], b = mainCells[(rnd() * mainCells.length) | 0]; nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b)) }
  let ok = 0, partial = 0, invalid = 0, sumRatio = 0, maxRatio = 0, sumExp = 0, maxExp = 0, sumPts = 0
  const ratios = [], firstBad = []
  for (let k = 0; k < NQ; k++) {
    const a = mainCells[(rnd() * mainCells.length) | 0], b = mainCells[(rnd() * mainCells.length) | 0]
    const ax = nav.cellX(a), ay = nav.cellY(a), bx = nav.cellX(b), by = nav.cellY(b)
    const ts = performance.now()
    const r = nav.findPath(ax, ay, bx, by)
    pathTimes.push(performance.now() - ts)
    sumExp += r.expanded; if (r.expanded > maxExp) maxExp = r.expanded
    if (r.ok) {
      ok++
      const straight = Math.hypot(bx - ax, by - ay)
      if (straight > 1) { const q = r.len / straight; ratios.push(q); sumRatio += q; if (q > maxRatio) maxRatio = q }
      sumPts += r.pts.length
    } else if (r.partial) partial++
    const v = verifyPath(r, ax, ay, bx, by, r.ok)
    if (v) { invalid++; if (firstBad.length < 3) firstBad.push([ax, ay, bx, by, v]) }
  }
  bench.findPath = { queries: NQ, meanMs: +(pathTimes.reduce((s, v) => s + v, 0) / NQ).toFixed(3), p50Ms: +quant(pathTimes, 0.5).toFixed(3), p99Ms: +quant(pathTimes, 0.99).toFixed(3), maxMs: +quant(pathTimes, 1).toFixed(3), meanExpanded: Math.round(sumExp / NQ), maxExpanded: maxExp }
  check('C4a findPath: 300 random pairs inside the largest component succeed', ok === NQ, `${ok}/${NQ} ok, ${partial} partial (maxExpand 25000); mean expanded ${Math.round(sumExp / NQ)}, max ${maxExp}`)
  check('C4b findPath: every returned path re-walks with walkLine, stays in passable cells, real cylinder never overlaps a wall (0.25 m samples)', invalid === 0, `${invalid} invalid / ${NQ} ${firstBad.length ? JSON.stringify(firstBad) : ''}`)
  check('C4c findPath timing: typical query < 3 ms', bench.findPath.p50Ms < 3, `mean ${bench.findPath.meanMs} ms, p50 ${bench.findPath.p50Ms} ms, p99 ${bench.findPath.p99Ms} ms, max ${bench.findPath.maxMs} ms`)
  bench.pathRatio = { mean: +(sumRatio / ratios.length).toFixed(3), p50: +quant(ratios, 0.5).toFixed(3), p90: +quant(ratios, 0.9).toFixed(3), max: +maxRatio.toFixed(3), meanWaypoints: +(sumPts / Math.max(1, ok)).toFixed(1) }
  console.log('  path length / straight line: ' + JSON.stringify(bench.pathRatio))
}
{
  // C4d arbitrary (off-centre) end points, as a mech would have: positions hugging walls included
  const rnd = mulberry(555)
  const pick = () => {
    for (;;) {
      const c = mainCells[(rnd() * mainCells.length) | 0]
      const x = nav.cellX(c) + (rnd() * 2 - 1) * 0.98, y = nav.cellY(c) + (rnd() * 2 - 1) * 0.98
      if (!world.bodyBlocked(x, y, world.surfaceZ(x, y, nav.level[c] + 0.6), 2.5, 9, stepUp)) return [x, y]
    }
  }
  let ok = 0, invalid = 0, endExact = 0
  const N = 300, firstBad = []
  for (let k = 0; k < N; k++) {
    const [ax, ay] = pick(), [bx, by] = pick()
    const r = nav.findPath(ax, ay, bx, by)
    if (r.ok) ok++
    const last = r.pts[r.pts.length - 1]
    if (r.ok && last[0] === bx && last[1] === by) endExact++
    const v = verifyLoose(r, ax, ay)
    if (v) { invalid++; if (firstBad.length < 3) firstBad.push([+ax.toFixed(2), +ay.toFixed(2), +bx.toFixed(2), +by.toFixed(2), v]) }
  }
  check('C4d findPath between arbitrary points inside passable cells: valid polylines ending exactly at the goal', ok === N && invalid === 0 && endExact === N, `${ok}/${N} ok, ${endExact} end at the goal point, ${invalid} invalid ${firstBad.length ? JSON.stringify(firstBad) : ''}`)
}
{
  // C5 A* optimality against a plain Dijkstra on the same step graph (unsmoothed lengths)
  const rnd = mulberry(77)
  const dist = new Float64Array(nav.n), done = new Uint8Array(nav.n)
  const dijkstra = (s, t) => {
    dist.fill(Infinity); done.fill(0)
    const heap = [[0, s]]; dist[s] = 0
    while (heap.length) {
      // tiny binary heap on arrays (test only)
      const top = heap[0], last = heap.pop()
      if (heap.length) { let p = 0; for (;;) { let ch = 2 * p + 1; if (ch >= heap.length) break; if (ch + 1 < heap.length && heap[ch + 1][0] < heap[ch][0]) ch++; if (heap[ch][0] >= last[0]) break; heap[p] = heap[ch]; p = ch } heap[p] = last }
      const [d, c] = top
      if (done[c]) continue
      done[c] = 1
      if (c === t) return d
      const i = c % nav.nx, j = (c / nav.nx) | 0
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue
        if (!nav.canStep(i, j, i + di, j + dj)) continue
        const nb = (j + dj) * nav.nx + i + di, nd = d + (di && dj ? nav.cell * Math.SQRT2 : nav.cell)
        if (nd < dist[nb]) { dist[nb] = nd; let p = heap.length; heap.push([nd, nb]); while (p > 0) { const q = (p - 1) >> 1; if (heap[q][0] <= nd) break; heap[p] = heap[q]; p = q } heap[p] = [nd, nb] }
      }
    }
    return Infinity
  }
  const N = QUICK ? 6 : 20
  let bad = 0, maxDiff = 0
  for (let k = 0; k < N; k++) {
    const a = mainCells[(rnd() * mainCells.length) | 0]
    // keep the pairs near each other so Dijkstra stays cheap
    let b = a
    for (let tries = 0; tries < 200; tries++) { const q = mainCells[(rnd() * mainCells.length) | 0]; if (Math.hypot(nav.cellX(q) - nav.cellX(a), nav.cellY(q) - nav.cellY(a)) < 180) { b = q; break } }
    const r = nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b), { smooth: false, maxExpand: 1e9, weight: 1 })
    const d = dijkstra(a, b)
    const diff = Math.abs(r.len - d); if (diff > maxDiff) maxDiff = diff
    if (!r.ok || diff > 1e-2) bad++
  }
  check('C5 A* (unsmoothed) is optimal: equals Dijkstra on the same step graph', bad === 0, `${bad} differences / ${N} pairs, max |len diff| ${maxDiff.toExponential(2)} m`)
}
{
  // C6 unreachable goal: bounded time, best partial path
  const rnd = mulberry(31)
  const other = []
  for (let c = 0; c < nav.n; c++) if (nav.comp[c] >= 0 && nav.comp[c] !== main && nav.compSizes[nav.comp[c]] >= 20) other.push(c)
  let n = 0, good = 0, maxMs = 0, invalid = 0
  for (let k = 0; k < 40 && other.length; k++) {
    const a = mainCells[(rnd() * mainCells.length) | 0], b = other[(rnd() * other.length) | 0]
    const ax = nav.cellX(a), ay = nav.cellY(a), bx = nav.cellX(b), by = nav.cellY(b)
    const ts = performance.now()
    const r = nav.findPath(ax, ay, bx, by)
    const ms = performance.now() - ts; if (ms > maxMs) maxMs = ms
    n++
    if (!r.ok && r.partial && r.pts.length >= 1 && !nav.reachable(ax, ay, bx, by)) good++
    if (verifyPath(r, ax, ay, bx, by, false)) invalid++
  }
  check('C6 goal in another component: ok=false, partial=true, valid partial path, bounded time', good === n && invalid === 0, `${good}/${n} partial, ${invalid} invalid, max ${maxMs.toFixed(2)} ms (stadium interior is a separate component: ${nav.component(-276.31, 128.71) !== main})`)
  bench.findPathUnreachableMaxMs = +maxMs.toFixed(2)
}
{
  // C7 bigger body (cubes): paths stay valid, restoring the size restores the grid
  const snap = nav.pass.slice()
  const rnd = mulberry(404)
  const ts = performance.now()
  nav.setBody(2.5 * 1.4, 9 * 1.4)
  const setMs = performance.now() - ts
  let passBig = 0; for (let c = 0; c < nav.n; c++) passBig += nav.pass[c]
  let n = 0, ok = 0, invalid = 0
  for (let k = 0; k < 60; k++) {
    const a = mainCells[(rnd() * mainCells.length) | 0], b = mainCells[(rnd() * mainCells.length) | 0]
    if (!nav.pass[a] || !nav.pass[b]) continue
    const ax = nav.cellX(a), ay = nav.cellY(a), bx = nav.cellX(b), by = nav.cellY(b)
    const r = nav.findPath(ax, ay, bx, by)
    n++; if (r.ok) ok++
    if (verifyPath(r, ax, ay, bx, by, r.ok)) invalid++
  }
  const ts2 = performance.now()
  nav.setBody(2.5, 9)
  const setMs2 = performance.now() - ts2
  let same = true; for (let c = 0; c < nav.n; c++) if (nav.pass[c] !== snap[c]) { same = false; break }
  check('C7 setBody(3.5, 12.6): paths valid for the larger cylinder; setBody(2.5, 9) restores the grid', invalid === 0 && same, `${ok}/${n} ok, ${invalid} invalid, passable cells ${passBig} (vs ${snap.reduce((s, v) => s + v, 0)}), setBody ${setMs.toFixed(2)} / ${setMs2.toFixed(2)} ms`)
  bench.setBodyMs = +Math.max(setMs, setMs2).toFixed(2)
}
{
  // C8 nearestPassable is the true nearest; canStep rules
  const rnd = mulberry(9)
  let n = 0, bad = 0
  for (let k = 0; k < 400; k++) {
    const x = B.minX + rnd() * (B.maxX - B.minX), y = B.minY + rnd() * (B.maxY - B.minY)
    const p = nav.nearestPassable(x, y, 10)
    let bd = Infinity
    for (let c = 0; c < nav.n; c++) { if (!nav.pass[c]) continue; const d = Math.hypot(nav.cellX(c) - x, nav.cellY(c) - y); if (d < bd) bd = d }
    n++
    if (bd > 10) { if (p) bad++ } else if (!p || Math.abs(Math.hypot(p.x - x, p.y - y) - bd) > 1e-9 || !nav.passableAt(p.x, p.y)) bad++
  }
  let stepBad = 0, stepN = 0
  for (let k = 0; k < 20000; k++) {
    const c = (rnd() * nav.n) | 0, i = c % nav.nx, j = (c / nav.nx) | 0, d = (rnd() * 8) | 0
    const di = [1, 1, 0, -1, -1, -1, 0, 1][d], dj = [0, 1, 1, 1, 0, -1, -1, -1][d]
    if (!nav.canStep(i, j, i + di, j + dj)) continue
    stepN++
    if (!nav.passable(i, j) || !nav.passable(i + di, j + dj)) stepBad++
    if (di && dj && (!nav.passable(i + di, j) || !nav.passable(i, j + dj))) stepBad++
  }
  check('C8 nearestPassable returns the true nearest passable cell; canStep implies both passable and no corner cutting', bad === 0 && stepBad === 0, `nearestPassable ${n - bad}/${n}; ${stepBad} bad of ${stepN} allowed steps`)
}
{
  // C9 hop exits from enclosed pockets (stadium bowl)
  const spawn = header.mechs && header.mechs.find((m) => m.spawn && nav.component(m.spawn[0], m.spawn[1]) !== main)
  const starts = [[-276.31, 128.71]]
  if (spawn) starts.push([spawn.spawn[0], spawn.spawn[1]])
  let good = 0, maxMs = 0
  const notes = []
  nav.hopPlan(starts[0][0], starts[0][1])     // warm-up
  for (const [x, y] of starts) {
    const ts = performance.now()
    const pl = nav.hopPlan(x, y, { toward: [41.3, -72.8] })
    const ms = performance.now() - ts; if (ms > maxMs) maxMs = ms
    if (!pl) { notes.push('no plan'); continue }
    const walk = nav.findPath(x, y, pl.launch[0], pl.launch[1])
    // independent check of the apex: highest surface under the body along the flight line
    let hmax = pl.launchZ
    const len = Math.hypot(pl.land[0] - pl.launch[0], pl.land[1] - pl.launch[1]), ux = (pl.land[0] - pl.launch[0]) / len, uy = (pl.land[1] - pl.launch[1]) / len
    for (let d = 0; d <= len - 2.5; d += 0.5) for (const o of [-2.5, 0, 2.5]) hmax = Math.max(hmax, world.surfaceZ(pl.launch[0] + ux * d - uy * o, pl.launch[1] + uy * d + ux * o))
    const okPlan = walk.ok && nav.component(pl.land[0], pl.land[1]) === main && nav.passableAt(pl.land[0], pl.land[1]) &&
      pl.apexZ >= hmax + 0.5 && pl.climb <= 40 && world.surfaceZ(pl.launch[0], pl.launch[1]) <= pl.launchZ + 0.5
    if (okPlan) good++
    notes.push(`from ${x.toFixed(0)},${y.toFixed(0)}: walk ${pl.walkLen.toFixed(0)} m, climb ${pl.climb.toFixed(1)} m, hop ${pl.hopLen.toFixed(1)} m, apex ${pl.apexZ.toFixed(1)} vs highest obstacle ${hmax.toFixed(1)}`)
  }
  const none = nav.hopPlan(nav.cellX(mainCells[0]), nav.cellY(mainCells[0])) === null
  if (spawn) {
    // what did the house bot that spawned inside the pocket do?
    let inPocket = 0, inMain = 0, lastT = 0
    for (const f of frames) for (const m of f.m) {
      if (m[0] !== spawn.id || m[6] <= 0) continue
      lastT = f.t
      if (!(m[8] & 1)) continue
      const c = nav.idx(m[1], m[2]); if (c < 0 || Math.abs(m[3] - nav.level[c]) > 0.6) continue
      if (nav.component(m[1], m[2]) === main) inMain++; else inPocket++
    }
    const res = lines[lines.length - 1].mechs ? lines[lines.length - 1].mechs.find((m) => m.id === spawn.id) : null
    facts.stadiumSpawnBot = { groundSamplesInPocket: inPocket, groundSamplesInMain: inMain, lastAliveTick: lastT, deathT: res && res.death_t, killedWith: res && res.killed_with, place: res && res.place }
  }
  check('C9 hopPlan: stadium interior gets a walk + jump-jet exit into the main component; main component gets none', good === starts.length && none, `${good}/${starts.length} valid plans (${notes.join(' | ')}), max ${maxMs.toFixed(2)} ms`)
  facts.stadiumSpawnInReplay = spawn ? { id: spawn.id, name: spawn.name, spawn: spawn.spawn } : null
}
{
  // C10 robustness: odd inputs never throw
  let threw = 0
  const odd = [[NaN, 0], [1e9, 1e9], [-1e9, 5], [B.minX, B.minY], [B.maxX + 5, 0], [0, Infinity]]
  for (const [x, y] of odd) {
    try {
      nav.idx(x, y); nav.passableAt(x, y); nav.wallDistAt(x, y); nav.levelAt(x, y); nav.nearestPassable(x, y, 10); nav.component(x, y)
      nav.findPath(x, y, 0, 0); nav.findPath(0, 0, x, y); nav.walkLine(x, y, 0, 0); nav.walkLine(0, 0, x, y); nav.pathLength(x, y, 10, 10); nav.hopPlan(x, y)
      world.ground(x, y); world.surfaceZ(x, y); world.ceilingZ(x, y, 0); world.inSolid(x, y, 0); world.bodyBlocked(x, y, 0, 2.5, 9)
      world.rayShot(x, y, 5, 0, 0, 5); world.raySight(0, 0, 5, x, y, 5); world.canSee(x, y, 5, 0, 0, 5); world.canopyChord(0, 0, 5, x, y, 5); world.shotClear(x, y, 5, x, y, 5)
    } catch (e) { threw++; console.log('  threw for', x, y, String(e && e.message || e)) }
  }
  const z0 = world.rayShot(10, 10, 20, 10, 10, 20)
  check('C10 odd inputs (NaN, infinite, far outside the map, zero-length) never throw', threw === 0 && z0 === 1 || threw === 0 && z0 === 0, `${threw} exceptions; zero-length segment -> ${z0}`)
}

// ================================================================ D. benchmarks
console.log('\n--- D. benchmarks')
{
  const rnd = mulberry(1)
  const N = QUICK ? 50000 : 200000
  const S = new Float64Array(N * 6)
  for (let k = 0; k < N; k++) {
    // eye of a mech standing somewhere walkable -> body centre of a target 50..200 m away
    const a = mainCells[(rnd() * mainCells.length) | 0]
    const ax = nav.cellX(a) + rnd() * 2 - 1, ay = nav.cellY(a) + rnd() * 2 - 1
    const ang = rnd() * 2 * Math.PI, len = 50 + rnd() * 150
    let bx = ax + Math.cos(ang) * len, by = ay + Math.sin(ang) * len
    bx = Math.min(B.maxX - 1, Math.max(B.minX + 1, bx)); by = Math.min(B.maxY - 1, Math.max(B.minY + 1, by))
    S[k * 6] = ax; S[k * 6 + 1] = ay; S[k * 6 + 2] = world.ground(ax, ay) + 8
    S[k * 6 + 3] = bx; S[k * 6 + 4] = by; S[k * 6 + 5] = world.surfaceZ(bx, by) + 4.5
  }
  const run = (fn) => {
    let acc = 0
    for (let k = 0; k < N; k += 4) acc += +fn(S[k * 6], S[k * 6 + 1], S[k * 6 + 2], S[k * 6 + 3], S[k * 6 + 4], S[k * 6 + 5])   // warm-up
    const ts = performance.now()
    for (let k = 0; k < N; k++) { const o = k * 6; acc += +fn(S[o], S[o + 1], S[o + 2], S[o + 3], S[o + 4], S[o + 5]) }
    const ms = performance.now() - ts
    return { callsPerSec: Math.round(N / ms * 1000), usPerCall: +(ms * 1000 / N).toFixed(3), acc }
  }
  const rs = run((a, b, c, d, e, f) => world.rayShot(a, b, c, d, e, f))
  const rg = run((a, b, c, d, e, f) => world.raySight(a, b, c, d, e, f))
  const cs = run((a, b, c, d, e, f) => world.canSee(a, b, c, d, e, f))
  const sc = run((a, b, c, d, e, f) => world.shotClear(a, b, c, d, e, f))
  const cc = run((a, b, c, d, e, f) => world.canopyChord(a, b, c, d, e, f))
  let blocked = 0, seen = 0
  for (let k = 0; k < N; k++) { const o = k * 6; if (world.rayShot(S[o], S[o + 1], S[o + 2], S[o + 3], S[o + 4], S[o + 5]) < 1) blocked++; if (world.canSee(S[o], S[o + 1], S[o + 2], S[o + 3], S[o + 4], S[o + 5])) seen++ }
  bench.segments = N
  bench.rayShot = { callsPerSec: rs.callsPerSec, usPerCall: rs.usPerCall }
  bench.raySight = { callsPerSec: rg.callsPerSec, usPerCall: rg.usPerCall }
  bench.canSee = { callsPerSec: cs.callsPerSec, usPerCall: cs.usPerCall }
  bench.shotClear = { callsPerSec: sc.callsPerSec, usPerCall: sc.usPerCall }
  bench.canopyChord = { callsPerSec: cc.callsPerSec, usPerCall: cc.usPerCall }
  bench.segmentMix = { blockedForShots: +(blocked / N).toFixed(3), visible: +(seen / N).toFixed(3) }
  // point queries and straight-line walks
  const tp = performance.now()
  let acc = 0
  for (let k = 0; k < N; k++) acc += world.surfaceZ(S[k * 6], S[k * 6 + 1], S[k * 6 + 2])
  bench.surfaceZ = { usPerCall: +((performance.now() - tp) * 1000 / N).toFixed(3) }
  const timeWalk = () => {
    let wl = 0
    const tw = performance.now()
    for (let k = 0; k < N; k++) { const o = k * 6; if (nav.walkLine(S[o], S[o + 1], S[o + 3], S[o + 4])) wl++ }
    return { usPerCall: +((performance.now() - tw) * 1000 / N).toFixed(3), walkableFraction: +(wl / N).toFixed(3) }
  }
  timeWalk()                                     // warm-up
  const w1 = timeWalk(), w2 = timeWalk()
  bench.walkLine = w1.usPerCall < w2.usPerCall ? w1 : w2
  // steady-state findPath distribution on a larger sample (the C4 numbers include verification overhead effects)
  {
    const rq = mulberry(4242), ft = []
    let fok = 0, fmax = 0
    for (let k = 0; k < (QUICK ? 600 : 2200); k++) {
      const a = mainCells[(rq() * mainCells.length) | 0], b = mainCells[(rq() * mainCells.length) | 0]
      const ts = performance.now()
      const r = nav.findPath(nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b))
      const ms = performance.now() - ts
      if (k >= 200) { ft.push(ms); if (r.ok) fok++; if (r.expanded > fmax) fmax = r.expanded }
    }
    bench.findPathLarge = { queries: ft.length, ok: fok, meanMs: +(ft.reduce((s, v) => s + v, 0) / ft.length).toFixed(3), p50Ms: +quant(ft, 0.5).toFixed(3), p99Ms: +quant(ft, 0.99).toFixed(3), maxMs: +quant(ft, 1).toFixed(3), maxExpanded: fmax }
    const tb = performance.now()
    nav._search(mainCells[0], mainCells[mainCells.length - 1], 0, 0, 0, 25000, 0, null)
    bench.astar25000ExpansionsMs = +(performance.now() - tb).toFixed(2)
  }
  bench.init = { worldLoadMs: +initWorldMs.toFixed(1), navBuildMs: +initNavMs.toFixed(1), totalMs: +(initWorldMs + initNavMs).toFixed(1) }
  bench.runtime = typeof Bun !== 'undefined' ? 'bun ' + Bun.version : 'node ' + process.version
  check('D3 findPath steady state: p50 < 3 ms and worst case bounded', bench.findPathLarge.p50Ms < 3 && bench.findPathLarge.maxMs < 30, `${bench.findPathLarge.ok}/${bench.findPathLarge.queries} ok, mean ${bench.findPathLarge.meanMs} ms, p50 ${bench.findPathLarge.p50Ms} ms, p99 ${bench.findPathLarge.p99Ms} ms, max ${bench.findPathLarge.maxMs} ms; 25000 uniform-cost expansions take ${bench.astar25000ExpansionsMs} ms; walkLine ${bench.walkLine.usPerCall} us`)
  check('D1 init: World.loadSync + new Nav < 3 s (Nav < 1.5 s)', initWorldMs + initNavMs < 3000 && initNavMs < 1500, `world ${initWorldMs.toFixed(1)} ms + nav ${initNavMs.toFixed(1)} ms`)
  check('D2 rayShot < 5 microseconds typical (50-200 m eye-to-body segments)', rs.usPerCall < 5, `${rs.usPerCall} us/call = ${rs.callsPerSec} calls/s; raySight ${rg.usPerCall} us; canSee ${cs.usPerCall} us = ${cs.callsPerSec} calls/s; shotClear ${sc.usPerCall} us; canopyChord ${cc.usPerCall} us`)
  console.log('  benchmarks: ' + JSON.stringify(bench))
}

const failed = checks.filter((c) => !c.passed)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed in ${((performance.now() - T_START) / 1000).toFixed(1)} s` + (failed.length ? '  FAILED: ' + failed.map((c) => c.check).join(' ; ') : ''))
console.log('SUMMARY_JSON ' + JSON.stringify({ checks, bench, facts }))
process.exitCode = failed.length ? 1 : 0
