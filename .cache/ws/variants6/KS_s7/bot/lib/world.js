// Map geometry for the Mech Royale arena (v2/world.json + terrain.i16).
//
// Terrain is a 1 m vertex grid sampled bilinearly; every other solid is a vertical prism (footprint ring minus
// holes, between `base` and `top`); trees are a trunk cylinder plus a crown ellipsoid that only matter for sight.
// Everything a ray query touches lives in flat typed arrays, queries walk a uniform 16 m grid with a DDA and
// use stamp arrays so an item spanning several cells is tested once. No query allocates.
//
// Segment tests take the two end points (a -> b) and return the fraction t in [0,1] of the first hit, 1 = clear.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'

const G = 16            // uniform grid cell size, metres
const INV_G = 1 / G
const TB = 8            // terrain skip-block size, in terrain vertices
const TINY = 1e-9
const MARCH = 0.5       // terrain ray-march sample spacing, horizontal metres

/** Even-odd containment test against a flat edge list [x0,y0,x1,y1, ...] restricted to [s,e). */
export function pointInEdges(E, s, e, x, y) {
  let inside = false
  for (let i = s; i < e; i += 4) {
    const y0 = E[i + 1], y1 = E[i + 3]
    if ((y0 > y) !== (y1 > y)) {
      const x0 = E[i]
      if (x < (E[i + 2] - x0) * (y - y0) / (y1 - y0) + x0) inside = !inside
    }
  }
  return inside
}

/** True when (x,y) is inside the prism footprint (ring minus holes). Heights are not considered. */
export function pointInPrism2D(prism, x, y) {
  if (x < prism.minX || x > prism.maxX || y < prism.minY || y > prism.maxY) return false
  const E = prism.edges
  return pointInEdges(E, 0, E.length, x, y)
}

/** Distance from (x,y) to the nearest footprint edge of the prism (unsigned: also valid inside). */
export function distToPrismEdge2D(prism, x, y) {
  const E = prism.edges
  let best = Infinity
  for (let i = 0; i < E.length; i += 4) {
    const x0 = E[i], y0 = E[i + 1]
    const ex = E[i + 2] - x0, ey = E[i + 3] - y0
    const l2 = ex * ex + ey * ey
    let u = l2 > TINY ? ((x - x0) * ex + (y - y0) * ey) / l2 : 0
    if (u < 0) u = 0; else if (u > 1) u = 1
    const px = x0 + ex * u - x, py = y0 + ey * u - y
    const d2 = px * px + py * py
    if (d2 < best) best = d2
  }
  return Math.sqrt(best)
}

function toHeights(buf, n, scale) {
  const h = new Float32Array(n)
  if (buf instanceof Int16Array) {
    for (let i = 0; i < n; i++) h[i] = buf[i] * scale
    return h
  }
  let u8
  if (buf instanceof ArrayBuffer) u8 = new Uint8Array(buf)
  else if (ArrayBuffer.isView(buf)) u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  else throw new Error('terrain buffer: unsupported type')
  if (u8.byteLength < n * 2) throw new Error('terrain buffer too small: ' + u8.byteLength + ' < ' + n * 2)
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  for (let i = 0; i < n; i++) h[i] = dv.getInt16(i * 2, true) * scale
  return h
}

export class World {
  /** dir = hello.map.dir. Reads <dir>/v2/world.json and the terrain file it names (synchronously). */
  static loadSync(dir, opts) {
    const files = Array.isArray(opts && opts.files) ? opts.files.filter((f) => typeof f === 'string') : []
    let base = null
    const at = (f) => (isAbsolute(f) ? f : join(dir, f))
    const wj = files.find((f) => f === 'world.json' || f.endsWith('/world.json'))
    if (wj) {
      const cand = at(wj.slice(0, wj.length - 'world.json'.length) || '.')
      if (existsSync(join(cand, 'world.json'))) base = cand
    }
    if (!base && existsSync(join(dir, 'v2', 'world.json'))) base = join(dir, 'v2')
    if (!base && existsSync(join(dir, 'world.json'))) base = dir
    if (!base) {
      let names = []
      try { names = readdirSync(dir) } catch { names = [] }
      names = names.filter((n) => existsSync(join(dir, n, 'world.json'))).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
      if (names.length) base = join(dir, names[0])
    }
    if (!base) base = join(dir, 'v2')
    const json = JSON.parse(readFileSync(join(base, 'world.json'), 'utf8'))
    let tfile = (json.terrain && json.terrain.file) || ''
    if (!tfile || !existsSync(join(base, tfile))) {
      const ti = files.find((f) => f.endsWith('.i16'))
      if (ti && existsSync(at(ti))) return new World(json, readFileSync(at(ti)), opts)
      tfile = tfile || 'terrain.i16'
    }
    const terrain = readFileSync(join(base, tfile))
    return new World(json, terrain, opts)
  }

  constructor(json, terrainBuffer, opts = {}) {
    const rules = json.rules || {}
    this.rules = rules
    this.canopyDensity = opts.canopyDensity ?? rules.canopyDensity ?? 0.35
    this.canopyBlockT = opts.canopyBlockT ?? rules.canopyBlockT ?? 0.25
    // Canopy chord (metres) beyond which the line is blocked: exp(-density * chord) < blockT.
    this.maxCanopyChord = this.canopyDensity > 0 && this.canopyBlockT > 0
      ? -Math.log(this.canopyBlockT) / this.canopyDensity : Infinity
    const b = json.bounds
    this.bounds = { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY }

    // ---- terrain ----
    const tg = json.terrain
    this.tnx = tg.nx; this.tny = tg.ny
    this.tMinX = tg.minX; this.tMinY = tg.minY
    this.tStep = tg.step || 1
    this._tInv = 1 / this.tStep
    this._fxMax = tg.nx - 1.000001
    this._fyMax = tg.ny - 1.000001
    this.h = toHeights(terrainBuffer, tg.nx * tg.ny, tg.scale ?? 0.01)
    this._buildTerrainBlocks()

    // ---- prisms ----
    const src = json.prisms || []
    const nP = src.length
    let nEdges = 0
    for (const p of src) { nEdges += p.ring.length / 2; for (const hole of p.holes || []) nEdges += hole.length / 2 }
    const E = new Float64Array(nEdges * 4)        // x0,y0,x1,y1 for every edge of every prism
    this._E = E
    this._pe0 = new Int32Array(nP); this._pe1 = new Int32Array(nP)
    this._pBase = new Float64Array(nP); this._pTop = new Float64Array(nP)
    this._pMinX = new Float64Array(nP); this._pMinY = new Float64Array(nP)
    this._pMaxX = new Float64Array(nP); this._pMaxY = new Float64Array(nP)
    this.prisms = new Array(nP)
    let w = 0
    for (let k = 0; k < nP; k++) {
      const p = src[k]
      const s = w
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      const rings = [p.ring, ...(p.holes || [])]
      for (const r of rings) {
        const n = r.length >> 1
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n
          const x0 = r[2 * i], y0 = r[2 * i + 1]
          E[w++] = x0; E[w++] = y0; E[w++] = r[2 * j]; E[w++] = r[2 * j + 1]
          if (x0 < minX) minX = x0; if (x0 > maxX) maxX = x0
          if (y0 < minY) minY = y0; if (y0 > maxY) maxY = y0
        }
      }
      this._pe0[k] = s; this._pe1[k] = w
      this._pBase[k] = p.base; this._pTop[k] = p.top
      this._pMinX[k] = minX; this._pMinY[k] = minY; this._pMaxX[k] = maxX; this._pMaxY[k] = maxY
      this.prisms[k] = { id: k, kind: p.kind, base: p.base, top: p.top, minX, minY, maxX, maxY, edges: E.subarray(s, w) }
    }

    // ---- trees ----
    const tr = json.trees || { fields: [], data: [] }
    const F = tr.fields, D = tr.data, stride = F.length
    const col = (name) => F.indexOf(name)
    const cX = col('x'), cY = col('y'), cZ = col('z'), cH = col('height'), cR = col('crownR'), cB = col('crownBase'),
      cT = col('trunkR'), cCX = col('crownX'), cCY = col('crownY')
    const nT = stride > 0 ? Math.floor(D.length / stride) : 0
    this.trees = new Array(nT)
    // per tree: x, y, trunkR^2, zLow, trunkTop, cx, cy, cz, 1/crownR, 1/rz
    const TD = new Float64Array(nT * 10)
    this._T = TD
    for (let k = 0; k < nT; k++) {
      const o = k * stride
      const x = D[o + cX], y = D[o + cY], z = D[o + cZ], height = D[o + cH], crownR = D[o + cR], crownBase = D[o + cB],
        trunkR = D[o + cT]
      const cx = cCX >= 0 ? D[o + cCX] : x, cy = cCY >= 0 ? D[o + cCY] : y
      const zb = z + crownBase, zt = z + height
      const trunkTop = z + Math.max(crownBase + 0.5 * (height - crownBase), 3)
      const cz = (zb + zt) / 2, rz = Math.max((zt - zb) / 2, 0.5)
      this.trees[k] = { id: k, x, y, z, height, crownR, crownBase, trunkR, cx, cy, cz, rz, trunkTop }
      const q = k * 10
      TD[q] = x; TD[q + 1] = y; TD[q + 2] = trunkR * trunkR; TD[q + 3] = z - 1; TD[q + 4] = trunkTop
      TD[q + 5] = cx; TD[q + 6] = cy; TD[q + 7] = cz; TD[q + 8] = 1 / crownR; TD[q + 9] = 1 / rz
    }

    // ---- uniform grid (CSR lists of prism and tree indices per cell) ----
    this._gx0 = b.minX - G; this._gy0 = b.minY - G
    this._gnx = Math.ceil((b.maxX - b.minX) / G) + 3
    this._gny = Math.ceil((b.maxY - b.minY) / G) + 3
    const pad = 0.01
    const pr = this._buildCSR(nP, (k, f) => f(this._pMinX[k] - pad, this._pMinY[k] - pad, this._pMaxX[k] + pad, this._pMaxY[k] + pad))
    this._gpS = pr.start; this._gpI = pr.items
    const tt = this._buildCSR(nT, (k, f) => {
      const t = this.trees[k], r = t.crownR
      f(Math.min(t.cx - r, t.x - t.trunkR) - pad, Math.min(t.cy - r, t.y - t.trunkR) - pad,
        Math.max(t.cx + r, t.x + t.trunkR) + pad, Math.max(t.cy + r, t.y + t.trunkR) + pad)
    })
    this._gtS = tt.start; this._gtI = tt.items
    this._stampP = new Uint32Array(nP)
    this._stampT = new Uint32Array(nT)
    this._stamp = 0
  }

  _buildTerrainBlocks() {
    // Highest vertex per 8x8 block, widened by the +x / +y / diagonal neighbour blocks so the table also bounds
    // the bilinear patches that straddle a block border. A segment above this value cannot touch the block.
    const nx = this.tnx, ny = this.tny, h = this.h
    const bnx = Math.ceil(nx / TB), bny = Math.ceil(ny / TB)
    const own = new Float32Array(bnx * bny).fill(-Infinity)
    for (let j = 0; j < ny; j++) {
      const row = j * nx, brow = Math.floor(j / TB) * bnx
      for (let i = 0; i < nx; i++) { const v = h[row + i], q = brow + Math.floor(i / TB); if (v > own[q]) own[q] = v }
    }
    const bm = new Float32Array(bnx * bny)
    for (let bj = 0; bj < bny; bj++) {
      for (let bi = 0; bi < bnx; bi++) {
        let m = own[bj * bnx + bi]
        if (bi + 1 < bnx && own[bj * bnx + bi + 1] > m) m = own[bj * bnx + bi + 1]
        if (bj + 1 < bny && own[(bj + 1) * bnx + bi] > m) m = own[(bj + 1) * bnx + bi]
        if (bi + 1 < bnx && bj + 1 < bny && own[(bj + 1) * bnx + bi + 1] > m) m = own[(bj + 1) * bnx + bi + 1]
        bm[bj * bnx + bi] = m
      }
    }
    this._bnx = bnx; this._bny = bny; this._bmax = bm
    this._bSize = TB * this.tStep
  }

  _buildCSR(n, boxOf) {
    const gnx = this._gnx, gny = this._gny, gx0 = this._gx0, gy0 = this._gy0
    const counts = new Int32Array(gnx * gny + 1)
    const span = (x0, y0, x1, y1, visit) => {
      let i0 = Math.floor((x0 - gx0) * INV_G), i1 = Math.floor((x1 - gx0) * INV_G)
      let j0 = Math.floor((y0 - gy0) * INV_G), j1 = Math.floor((y1 - gy0) * INV_G)
      if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > gnx - 1) i1 = gnx - 1; if (j1 > gny - 1) j1 = gny - 1
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) visit(j * gnx + i)
    }
    for (let k = 0; k < n; k++) boxOf(k, (x0, y0, x1, y1) => span(x0, y0, x1, y1, (c) => { counts[c + 1]++ }))
    for (let c = 0; c < gnx * gny; c++) counts[c + 1] += counts[c]
    const items = new Int32Array(counts[gnx * gny])
    const fill = counts.slice(0, gnx * gny)
    for (let k = 0; k < n; k++) boxOf(k, (x0, y0, x1, y1) => span(x0, y0, x1, y1, (c) => { items[fill[c]++] = k }))
    return { start: counts, items }
  }

  _cellOf(x, y) {
    const i = Math.floor((x - this._gx0) * INV_G), j = Math.floor((y - this._gy0) * INV_G)
    if (!(i >= 0 && j >= 0 && i < this._gnx && j < this._gny)) return -1      // also catches NaN
    return j * this._gnx + i
  }

  _nextStamp() {
    let s = this._stamp + 1
    if (s >= 0xffffffff) { this._stampP.fill(0); this._stampT.fill(0); s = 1 }
    this._stamp = s
    return s
  }

  // ------------------------------------------------------------------ point queries

  /** Bilinear terrain height (metres), clamped at the edges of the terrain grid. */
  ground(x, y) {
    let fx = (x - this.tMinX) * this._tInv, fy = (y - this.tMinY) * this._tInv
    if (fx < 0) fx = 0; else if (fx > this._fxMax) fx = this._fxMax
    if (fy < 0) fy = 0; else if (fy > this._fyMax) fy = this._fyMax
    const i = fx | 0, j = fy | 0
    const sx = fx - i, sy = fy - j
    const nx = this.tnx, k = j * nx + i, h = this.h
    return (h[k] * (1 - sx) + h[k + 1] * sx) * (1 - sy) + (h[k + nx] * (1 - sx) + h[k + nx + 1] * sx) * sy
  }

  /** Highest surface (terrain or a prism top) at (x,y) that is not above zMax. */
  surfaceZ(x, y, zMax = Infinity) {
    let r = this.ground(x, y)
    const c = this._cellOf(x, y)
    if (c < 0) return r
    const S = this._gpS, I = this._gpI, top = this._pTop
    for (let q = S[c], qe = S[c + 1]; q < qe; q++) {
      const k = I[q], t = top[k]
      if (t > zMax || t <= r) continue
      if (x < this._pMinX[k] || x > this._pMaxX[k] || y < this._pMinY[k] || y > this._pMaxY[k]) continue
      if (pointInEdges(this._E, this._pe0[k], this._pe1[k], x, y)) r = t
    }
    return r
  }

  /** Index of the prism whose top is surfaceZ(x,y,zMax), or -1 when that surface is terrain. */
  surfacePrism(x, y, zMax = Infinity) {
    let r = this.ground(x, y), id = -1
    const c = this._cellOf(x, y)
    if (c < 0) return -1
    const S = this._gpS, I = this._gpI, top = this._pTop
    for (let q = S[c], qe = S[c + 1]; q < qe; q++) {
      const k = I[q], t = top[k]
      if (t > zMax || t <= r) continue
      if (x < this._pMinX[k] || x > this._pMaxX[k] || y < this._pMinY[k] || y > this._pMaxY[k]) continue
      if (pointInEdges(this._E, this._pe0[k], this._pe1[k], x, y)) { r = t; id = k }
    }
    return id
  }

  /** Lowest prism underside at or above z over the point (x,y), or Infinity under open sky. */
  ceilingZ(x, y, z) {
    let best = Infinity
    const c = this._cellOf(x, y)
    if (c < 0) return best
    const S = this._gpS, I = this._gpI, base = this._pBase, zMin = z - 0.01
    for (let q = S[c], qe = S[c + 1]; q < qe; q++) {
      const k = I[q], bz = base[k]
      if (bz < zMin || bz >= best) continue
      if (x < this._pMinX[k] || x > this._pMaxX[k] || y < this._pMinY[k] || y > this._pMaxY[k]) continue
      if (pointInEdges(this._E, this._pe0[k], this._pe1[k], x, y)) best = bz
    }
    return best
  }

  /** Index of a prism whose volume contains the point, or -1. */
  prismAt(x, y, z) {
    const c = this._cellOf(x, y)
    if (c < 0) return -1
    const S = this._gpS, I = this._gpI
    for (let q = S[c], qe = S[c + 1]; q < qe; q++) {
      const k = I[q]
      if (z < this._pBase[k] || z > this._pTop[k]) continue
      if (x < this._pMinX[k] || x > this._pMaxX[k] || y < this._pMinY[k] || y > this._pMaxY[k]) continue
      if (pointInEdges(this._E, this._pe0[k], this._pe1[k], x, y)) return k
    }
    return -1
  }

  /** Inside a prism volume (ring minus holes, base <= z <= top) or below the terrain. */
  inSolid(x, y, z) {
    if (z < this.ground(x, y)) return true
    return this.prismAt(x, y, z) >= 0
  }

  /**
   * Would an upright cylinder (feet at z, given radius/height) overlap a wall? A prism is a wall for the body when
   * its top is more than stepUp above the feet and its base is below the head; the map edge is a wall too.
   * Terrain steepness is not part of this test (see Nav.canStep).
   */
  bodyBlocked(x, y, z, radius, height, stepUp = 1.2) {
    const b = this.bounds
    if (x - radius < b.minX || x + radius > b.maxX || y - radius < b.minY || y + radius > b.maxY) return true
    const gnx = this._gnx, gny = this._gny
    let i0 = Math.floor((x - radius - this._gx0) * INV_G), i1 = Math.floor((x + radius - this._gx0) * INV_G)
    let j0 = Math.floor((y - radius - this._gy0) * INV_G), j1 = Math.floor((y + radius - this._gy0) * INV_G)
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > gnx - 1) i1 = gnx - 1; if (j1 > gny - 1) j1 = gny - 1
    const S = this._gpS, I = this._gpI, E = this._E
    const zLo = z + stepUp, zHi = z + height, r2 = radius * radius
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const c = j * gnx + i
        for (let q = S[c], qe = S[c + 1]; q < qe; q++) {
          const k = I[q]
          if (this._pTop[k] <= zLo || this._pBase[k] >= zHi) continue
          if (x + radius < this._pMinX[k] || x - radius > this._pMaxX[k] || y + radius < this._pMinY[k] || y - radius > this._pMaxY[k]) continue
          const e0 = this._pe0[k], e1 = this._pe1[k]
          if (pointInEdges(E, e0, e1, x, y)) return true
          for (let e = e0; e < e1; e += 4) {
            const x0 = E[e], y0 = E[e + 1], ex = E[e + 2] - x0, ey = E[e + 3] - y0
            const l2 = ex * ex + ey * ey
            let u = l2 > TINY ? ((x - x0) * ex + (y - y0) * ey) / l2 : 0
            if (u < 0) u = 0; else if (u > 1) u = 1
            const px = x0 + ex * u - x, py = y0 + ey * u - y
            if (px * px + py * py < r2) return true
          }
        }
      }
    }
    return false
  }

  // ------------------------------------------------------------------ segment queries

  /** Bullets, lasers, shells: blocked by prisms and terrain. Returns hit fraction, 1 when clear. */
  rayShot(ax, ay, az, bx, by, bz) { return this._cast(ax, ay, az, bx, by, bz, 0) }

  /** Sight line: blocked by prisms, terrain and tree trunks (canopy is handled by canopyChord / canSee). */
  raySight(ax, ay, az, bx, by, bz) { return this._cast(ax, ay, az, bx, by, bz, 1) }

  /** True when nothing solid (prism, terrain) lies on the segment. */
  shotClear(ax, ay, az, bx, by, bz) { return this._cast(ax, ay, az, bx, by, bz, 2) >= 1 }

  /** True when the sight line is clear of prisms, terrain and trunks AND the canopy lets enough through. */
  canSee(ax, ay, az, bx, by, bz) { return this._cast(ax, ay, az, bx, by, bz, 3) >= 1 }

  /** Sight line ignoring canopy (the 45 m proximity sensors): prisms, terrain and trunks only. */
  sightClear(ax, ay, az, bx, by, bz) { return this._cast(ax, ay, az, bx, by, bz, 4) >= 1 }

  /** Canopy transmittance exp(-density * chord) along the segment (1 = no foliage). */
  transmittance(ax, ay, az, bx, by, bz) {
    return Math.exp(-this.canopyDensity * this.canopyChord(ax, ay, az, bx, by, bz))
  }

  /**
   * Core segment walk. mode: 0 shot (first hit: prisms + terrain), 1 sight (first hit: + trunks),
   * 2 shot any-hit, 3 sight any-hit + canopy limit, 4 sight any-hit without canopy.
   * Any-hit modes return 0 when blocked and 1 when clear.
   */
  _cast(ax, ay, az, bx, by, bz, mode) {
    const dx = bx - ax, dy = by - ay, dz = bz - az
    const fin = ax + ay + az + dx + dy + dz
    if (fin - fin !== 0) return 0            // NaN or infinite coordinates: report blocked, never loop
    const trunks = mode === 1 || mode >= 3, any = mode >= 2, canopy = mode === 3
    let best = 1
    const gnx = this._gnx, gny = this._gny
    const X0 = this._gx0, Y0 = this._gy0, X1 = X0 + gnx * G, Y1 = Y0 + gny * G
    // Clip the parameter range to the grid rectangle.
    let t0 = 0, t1 = 1, inGrid = true
    if (dx > 0) { const a = (X0 - ax) / dx, b = (X1 - ax) / dx; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (dx < 0) { const a = (X1 - ax) / dx, b = (X0 - ax) / dx; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (ax < X0 || ax >= X1) inGrid = false
    if (dy > 0) { const a = (Y0 - ay) / dy, b = (Y1 - ay) / dy; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (dy < 0) { const a = (Y1 - ay) / dy, b = (Y0 - ay) / dy; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (ay < Y0 || ay >= Y1) inGrid = false

    if (inGrid && t0 <= t1) {
      const stamp = this._nextStamp()
      const E = this._E, pe0 = this._pe0, pe1 = this._pe1, pBase = this._pBase, pTop = this._pTop
      const pMinX = this._pMinX, pMinY = this._pMinY, pMaxX = this._pMaxX, pMaxY = this._pMaxY
      const gpS = this._gpS, gpI = this._gpI, stampP = this._stampP
      const gtS = this._gtS, gtI = this._gtI, stampT = this._stampT, TD = this._T
      const flatX = dx > -TINY && dx < TINY, flatY = dy > -TINY && dy < TINY, flatZ = dz > -TINY && dz < TINY
      const ix = flatX ? 0 : 1 / dx, iy = flatY ? 0 : 1 / dy, iz = flatZ ? 0 : 1 / dz
      const m2 = dx * dx + dy * dy
      const len3 = canopy ? Math.sqrt(m2 + dz * dz) : 0
      const maxChord = this.maxCanopyChord
      let chord = 0

      let ci = Math.floor((ax + dx * t0 - X0) * INV_G), cj = Math.floor((ay + dy * t0 - Y0) * INV_G)
      if (ci < 0) ci = 0; else if (ci >= gnx) ci = gnx - 1
      if (cj < 0) cj = 0; else if (cj >= gny) cj = gny - 1
      const si = dx > 0 ? 1 : -1, sj = dy > 0 ? 1 : -1
      let tmx = dx > 0 ? (X0 + (ci + 1) * G - ax) / dx : dx < 0 ? (X0 + ci * G - ax) / dx : Infinity
      let tmy = dy > 0 ? (Y0 + (cj + 1) * G - ay) / dy : dy < 0 ? (Y0 + cj * G - ay) / dy : Infinity
      const tdx = dx !== 0 ? G / Math.abs(dx) : Infinity, tdy = dy !== 0 ? G / Math.abs(dy) : Infinity

      for (;;) {
        const c = cj * gnx + ci
        // ---- prisms in this cell
        for (let q = gpS[c], qe = gpS[c + 1]; q < qe; q++) {
          const k = gpI[q]
          if (stampP[k] === stamp) continue
          stampP[k] = stamp
          // Slab test of [0,best] against the prism's box.
          const base = pBase[k], top = pTop[k]
          let lo = 0, hi = best
          if (flatZ) { if (az < base || az > top) continue }
          else {
            let a = (base - az) * iz, b = (top - az) * iz
            if (a > b) { const s = a; a = b; b = s }
            if (a > lo) lo = a; if (b < hi) hi = b
            if (lo > hi) continue
          }
          const minX = pMinX[k], maxX = pMaxX[k]
          if (flatX) { if (ax < minX || ax > maxX) continue }
          else {
            let a = (minX - ax) * ix, b = (maxX - ax) * ix
            if (a > b) { const s = a; a = b; b = s }
            if (a > lo) lo = a; if (b < hi) hi = b
            if (lo > hi) continue
          }
          const minY = pMinY[k], maxY = pMaxY[k]
          if (flatY) { if (ay < minY || ay > maxY) continue }
          else {
            let a = (minY - ay) * iy, b = (maxY - ay) * iy
            if (a > b) { const s = a; a = b; b = s }
            if (a > lo) lo = a; if (b < hi) hi = b
            if (lo > hi) continue
          }
          const e0 = pe0[k], e1 = pe1[k]
          // Start point inside the solid: blocked at once.
          if (az >= base && az <= top && ax >= minX && ax <= maxX && ay >= minY && ay <= maxY &&
              pointInEdges(E, e0, e1, ax, ay)) return 0
          // Side walls.
          for (let e = e0; e < e1; e += 4) {
            const x0 = E[e], y0 = E[e + 1]
            const ex = E[e + 2] - x0, ey = E[e + 3] - y0
            const den = dx * ey - dy * ex
            if (den > -TINY && den < TINY) continue
            const hx = x0 - ax, hy = y0 - ay
            const un = hx * dy - hy * dx            // position along the edge, times den
            if (den > 0) { if (un < 0 || un > den) continue } else if (un > 0 || un < den) continue
            const t = (hx * ey - hy * ex) / den
            if (t < 0 || t >= best) continue
            const z = az + dz * t
            if (z < base || z > top) continue
            best = t
          }
          // Caps: the top only when travelling down, the underside only when travelling up.
          if (!flatZ) {
            const t = ((dz < 0 ? top : base) - az) * iz
            if (t >= 0 && t < best) {
              const x = ax + dx * t, y = ay + dy * t
              if (x >= minX && x <= maxX && y >= minY && y <= maxY && pointInEdges(E, e0, e1, x, y)) best = t
            }
          }
          if (any && best < 1) return 0
        }
        // ---- trees in this cell
        if (trunks) {
          for (let q = gtS[c], qe = gtS[c + 1]; q < qe; q++) {
            const k = gtI[q]
            if (stampT[k] === stamp) continue
            stampT[k] = stamp
            const o = k * 10
            if (m2 >= TINY) {
              const fx = ax - TD[o], fy = ay - TD[o + 1]
              const hb = fx * dx + fy * dy
              const disc = hb * hb - m2 * (fx * fx + fy * fy - TD[o + 2])
              if (disc >= 0) {
                const t = (-hb - Math.sqrt(disc)) / m2
                if (t >= 0 && t < best) {
                  const z = az + dz * t
                  if (z >= TD[o + 3] && z <= TD[o + 4]) { if (any) return 0; best = t }
                }
              }
            }
            if (canopy) {
              const ir = TD[o + 8], irz = TD[o + 9]
              const sx = (ax - TD[o + 5]) * ir, sy = (ay - TD[o + 6]) * ir, sz = (az - TD[o + 7]) * irz
              const ux = dx * ir, uy = dy * ir, uz = dz * irz
              const qa = ux * ux + uy * uy + uz * uz
              if (qa >= TINY) {
                const qb = sx * ux + sy * uy + sz * uz
                const disc = qb * qb - qa * (sx * sx + sy * sy + sz * sz - 1)
                if (disc > 0) {
                  const s = Math.sqrt(disc)
                  let v0 = (-qb - s) / qa, v1 = (-qb + s) / qa
                  if (v1 >= 0 && v0 <= 1) {
                    if (v0 < 0) v0 = 0; if (v1 > 1) v1 = 1
                    chord += (v1 - v0) * len3
                    if (chord > maxChord) return 0
                  }
                }
              }
            }
          }
        }
        // ---- next cell
        let tn
        if (tmx < tmy) { tn = tmx; tmx += tdx; ci += si } else { tn = tmy; tmy += tdy; cj += sj }
        if (tn > best || tn > t1) break
        if (ci < 0 || ci >= gnx || cj < 0 || cj >= gny) break
      }
    }
    const tt = this._rayTerrain(ax, ay, az, dx, dy, dz, best, any)
    if (any) return tt < best ? 0 : 1
    return tt
  }

  /** Metres of the segment that lie inside tree crown ellipsoids (overlapping crowns add up). */
  canopyChord(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az
    const fin = ax + ay + az + dx + dy + dz
    if (fin - fin !== 0) return 0
    const gnx = this._gnx, gny = this._gny
    const X0 = this._gx0, Y0 = this._gy0, X1 = X0 + gnx * G, Y1 = Y0 + gny * G
    let t0 = 0, t1 = 1
    if (dx > 0) { const a = (X0 - ax) / dx, b = (X1 - ax) / dx; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (dx < 0) { const a = (X1 - ax) / dx, b = (X0 - ax) / dx; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (ax < X0 || ax >= X1) return 0
    if (dy > 0) { const a = (Y0 - ay) / dy, b = (Y1 - ay) / dy; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (dy < 0) { const a = (Y1 - ay) / dy, b = (Y0 - ay) / dy; if (a > t0) t0 = a; if (b < t1) t1 = b }
    else if (ay < Y0 || ay >= Y1) return 0
    if (t0 > t1) return 0
    const stamp = this._nextStamp()
    const gtS = this._gtS, gtI = this._gtI, stampT = this._stampT, TD = this._T
    const len3 = Math.sqrt(dx * dx + dy * dy + dz * dz)
    let chord = 0
    let ci = Math.floor((ax + dx * t0 - X0) * INV_G), cj = Math.floor((ay + dy * t0 - Y0) * INV_G)
    if (ci < 0) ci = 0; else if (ci >= gnx) ci = gnx - 1
    if (cj < 0) cj = 0; else if (cj >= gny) cj = gny - 1
    const si = dx > 0 ? 1 : -1, sj = dy > 0 ? 1 : -1
    let tmx = dx > 0 ? (X0 + (ci + 1) * G - ax) / dx : dx < 0 ? (X0 + ci * G - ax) / dx : Infinity
    let tmy = dy > 0 ? (Y0 + (cj + 1) * G - ay) / dy : dy < 0 ? (Y0 + cj * G - ay) / dy : Infinity
    const tdx = dx !== 0 ? G / Math.abs(dx) : Infinity, tdy = dy !== 0 ? G / Math.abs(dy) : Infinity
    for (;;) {
      const c = cj * gnx + ci
      for (let q = gtS[c], qe = gtS[c + 1]; q < qe; q++) {
        const k = gtI[q]
        if (stampT[k] === stamp) continue
        stampT[k] = stamp
        const o = k * 10
        const ir = TD[o + 8], irz = TD[o + 9]
        const sx = (ax - TD[o + 5]) * ir, sy = (ay - TD[o + 6]) * ir, sz = (az - TD[o + 7]) * irz
        const ux = dx * ir, uy = dy * ir, uz = dz * irz
        const qa = ux * ux + uy * uy + uz * uz
        if (qa < TINY) continue
        const qb = sx * ux + sy * uy + sz * uz
        const disc = qb * qb - qa * (sx * sx + sy * sy + sz * sz - 1)
        if (disc <= 0) continue
        const s = Math.sqrt(disc)
        let v0 = (-qb - s) / qa, v1 = (-qb + s) / qa
        if (v1 < 0 || v0 > 1) continue
        if (v0 < 0) v0 = 0; if (v1 > 1) v1 = 1
        chord += (v1 - v0) * len3
      }
      let tn
      if (tmx < tmy) { tn = tmx; tmx += tdx; ci += si } else { tn = tmy; tmy += tdy; cj += sj }
      if (tn > t1) break
      if (ci < 0 || ci >= gnx || cj < 0 || cj >= gny) break
    }
    return chord
  }

  /**
   * Terrain test on the parameter range [0,tEnd]. The segment is sampled every 0.5 m of horizontal travel and
   * the first sample below ground is refined by bisection, so features thinner than the sample spacing can be
   * missed (the organisers' client behaves the same way; the sampling sequence here follows it: 8 m blocks
   * lying wholly below the segment are skipped and sampling resumes just past the block border).
   * Returns the hit fraction, or tEnd when clear.
   */
  _rayTerrain(ax, ay, az, dx, dy, dz, tEnd, any) {
    if (az < this.ground(ax, ay)) return 0
    if (tEnd <= 0) return tEnd
    const hl = Math.sqrt(dx * dx + dy * dy)
    const F = this._bSize, mx = this.tMinX, my = this.tMinY
    const bnx = this._bnx, bny = this._bny, bmax = this._bmax
    let bi = Math.floor((ax - mx) / F), bj = Math.floor((ay - my) / F)
    let t = 0, tn = tEnd, hit = false
    if (!(hl > TINY)) {
      // Vertical segment: it stays in one block and only its far end is sampled.
      const zEnd = az + dz * tEnd
      const top = (bi >= 0 && bj >= 0 && bi < bnx && bj < bny) ? bmax[bj * bnx + bi] : Infinity
      if ((az < zEnd ? az : zEnd) > top) return tEnd
      hit = zEnd < this.ground(ax + dx * tEnd, ay + dy * tEnd)
    } else {
      const dt = MARCH * this.tStep / hl
      const si = dx > 0 ? 1 : -1, sj = dy > 0 ? 1 : -1
      // Parameters at which the walk leaves the current block along x and along y.
      let tmx = dx > TINY ? (mx + bi * F + F - ax) / dx : dx < -TINY ? (mx + bi * F - ax) / dx : Infinity
      let tmy = dy > TINY ? (my + bj * F + F - ay) / dy : dy < -TINY ? (my + bj * F - ay) / dy : Infinity
      const tdx = (dx > TINY || dx < -TINY) ? F / Math.abs(dx) : Infinity
      const tdy = (dy > TINY || dy < -TINY) ? F / Math.abs(dy) : Infinity
      for (let guard = 0; t < tEnd && guard < 400000; guard++) {
        // block that contains the current sample
        for (; guard < 400000; guard++) {
          if (tmx <= tmy) { if (t < tmx) break; tmx += tdx; bi += si } else { if (t < tmy) break; tmy += tdy; bj += sj }
        }
        let tExit = (tmx < tmy ? tmx : tmy) + 1e-6
        if (tExit > tEnd) tExit = tEnd
        if (bi >= 0 && bj >= 0 && bi < bnx && bj < bny) {
          const zA = az + dz * t, zB = az + dz * tExit
          if ((zA < zB ? zA : zB) > bmax[bj * bnx + bi]) { t = tExit; continue }
        }
        tn = t + dt
        if (tn > tEnd) tn = tEnd
        if (az + dz * tn < this.ground(ax + dx * tn, ay + dy * tn)) { hit = true; break }
        if (tn >= tEnd) break
        t = tn
      }
    }
    if (!hit) return tEnd
    if (any) return 0
    let lo = t, hi = tn
    for (let it = 0; it < 20; it++) {
      const mid = (lo + hi) / 2
      if (az + dz * mid < this.ground(ax + dx * mid, ay + dy * mid)) hi = mid; else lo = mid
    }
    return hi
  }
}
