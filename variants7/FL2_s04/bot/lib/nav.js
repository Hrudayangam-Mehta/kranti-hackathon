// Ground navigation: a 2 m grid over the map with exact wall distances, head clearance, slope limits,
// connected components, weighted A* with string pulling, and jump-jet exits from enclosed pockets.
//
// Model. Every cell has one walking level L (nav.level): the terrain under its centre, or the top of a prism
// the mech can stand on there (a low platform, or a deck / terrace reached from a neighbouring cell by steps
// of at most stepUp). Seen from a cell a prism is
//   - walkable     when its top is within stepUp of the lowest standing level around the cell,
//   - a wall       when its top is higher than that and its underside is below the head of the base body,
//   - an overhang  when its top is higher and its underside clears the base body (bigger bodies may not fit).
// "Around the cell" means the 3x3 block of cells: the body is not only at the centre, and on sloping ground a
// 1.1 m kerb at the centre is a 1.5 m wall two metres downhill. Judging walls against the lowest nearby
// terrain (and head room against the highest) makes neighbouring cells agree about everything that can block
// a step between them, so cell paths and straight shortcuts are free of collisions for the real cylinder.
// wallDist is the exact distance from the cell centre to the nearest wall footprint or map edge (cap 30 m).
// The body (radius, height) can stand in a cell when wallDist >= radius + wallMargin and no overhang within
// reach is lower than height + headMargin. A step to a neighbour also needs: uphill slope along the step
// <= maxSlopeDeg (terrain difference over +-1 m along the direction of travel, the rule the replay supports),
// no corner cutting on diagonals, and no ledge higher than stepUp when a prism top is involved.
//
// Trees are ignored: trunks do not block movement on the server. Roofs are not part of the graph; the ground
// graph still has several components (the stadium bowl is enclosed) which only hopPlan() can join.

const SQRT2 = Math.SQRT2
const DI = [1, 1, 0, -1, -1, -1, 0, 1]      // direction d: 0 = +x, counter-clockwise in 45 degree steps
const DJ = [0, 1, 1, 1, 0, -1, -1, -1]
const CAP = 30                               // wallDist is capped at this many metres

export class Nav {
  /**
   * opts: {cell: 2, stepUp: 1.2, maxSlopeDeg: 50, radius: 2.5, height: 9, maxScale: 2,
   *        wallMargin: 0.3, headMargin: 0.2}
   * radius/height are the base body (0 cubes); maxScale bounds how large setBody() may ever get.
   */
  constructor(world, opts = {}) {
    this.world = world
    this.cell = opts.cell ?? 2
    this.stepUp = opts.stepUp ?? 1.2
    this.maxSlopeDeg = opts.maxSlopeDeg ?? 50
    this.baseRadius = opts.radius ?? 2.5
    this.baseHeight = opts.height ?? 9
    this.maxScale = opts.maxScale ?? 2
    this.wallMargin = opts.wallMargin ?? 0.3
    this.headMargin = opts.headMargin ?? 0.2
    const b = world.bounds
    this.x0 = b.minX; this.y0 = b.minY
    this.nx = Math.max(1, Math.ceil((b.maxX - b.minX) / this.cell))
    this.ny = Math.max(1, Math.ceil((b.maxY - b.minY) / this.cell))
    this.n = this.nx * this.ny
    this._inv = 1 / this.cell
    this._off = new Int32Array(8)
    for (let d = 0; d < 8; d++) this._off[d] = DI[d] + DJ[d] * this.nx
    this._build()

    const n = this.n
    this.pass = new Uint8Array(n)            // current body can stand in the cell
    this.steps = new Uint8Array(n)           // bit d set: current body may step to neighbour d
    this.radius = -1; this.height = -1
    this.setBody(this.baseRadius, this.baseHeight)
    this._label()

    // A* scratch (allocated once)
    this._g = new Float32Array(n)
    this._par = new Int32Array(n)
    this._seen = new Uint32Array(n)
    this._closed = new Uint32Array(n)
    this._gen = 0
    this._heapCap = 1 << 18
    this._heapN = new Int32Array(this._heapCap)
    this._heapF = new Float32Array(this._heapCap)
    this._pathBuf = new Int32Array(4096)
    this._pathCost = new Float64Array(4097)
    this._rx = new Float64Array(4098)
    this._ry = new Float64Array(4098)
    this.lastExpanded = 0
    // exits of enclosed pockets (the stadium bowl, roof strips) are worked out now rather than inside a decision tick
    if (opts.precomputeHops !== false) {
      for (let k = 0; k < this.compSizes.length; k++) {
        if (k !== this.mainComponent && this.compSizes[k] >= 25) this._hopCandidates(k, 45)
      }
    }
  }

  // ------------------------------------------------------------------ grid geometry

  cx(i) { return this.x0 + (i + 0.5) * this.cell }
  cy(j) { return this.y0 + (j + 0.5) * this.cell }
  /** Cell index (j * nx + i) containing the point, or -1 outside the grid. */
  idx(x, y) {
    const i = Math.floor((x - this.x0) * this._inv), j = Math.floor((y - this.y0) * this._inv)
    if (!(i >= 0 && j >= 0 && i < this.nx && j < this.ny)) return -1      // also catches NaN
    return j * this.nx + i
  }
  cellX(c) { return this.x0 + (c % this.nx + 0.5) * this.cell }
  cellY(c) { return this.y0 + (((c / this.nx) | 0) + 0.5) * this.cell }

  // ------------------------------------------------------------------ build

  // The build is split into separate methods so each hot loop is compiled on its own.
  _build() {
    const prisms = this.world.prisms, nP = prisms.length
    this._pTop = new Float64Array(nP); this._pBase = new Float64Array(nP)
    for (let k = 0; k < nP; k++) { this._pTop[k] = prisms[k].top; this._pBase[k] = prisms[k].base }
    this._buildGround()
    this._buildCover()
    this._buildLevels()
    this._buildRefLevels()
    this._buildWalls()
    this._buildSlopes()
    this._tMin = this._tMax = this._refHi = null       // build-time scratch
  }

  /** Terrain under each cell centre, plus its lowest / highest value over the cell (9 samples). */
  _buildGround() {
    const w = this.world, cell = this.cell, nx = this.nx, ny = this.ny, n = this.n, x0 = this.x0, y0 = this.y0
    const gz = new Float32Array(n), tMin = new Float32Array(n), tMax = new Float32Array(n)
    const hc = cell * 0.5
    for (let j = 0; j < ny; j++) {
      const yc = y0 + (j + 0.5) * cell
      for (let i = 0; i < nx; i++) {
        const xc = x0 + (i + 0.5) * cell
        const g = w.ground(xc, yc)
        let lo = g, hi = g, v
        v = w.ground(xc - hc, yc - hc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc, yc - hc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc + hc, yc - hc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc - hc, yc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc + hc, yc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc - hc, yc + hc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc, yc + hc); if (v < lo) lo = v; if (v > hi) hi = v
        v = w.ground(xc + hc, yc + hc); if (v < lo) lo = v; if (v > hi) hi = v
        const c = j * nx + i
        gz[c] = g; tMin[c] = lo; tMax[c] = hi
      }
    }
    this.groundZ = gz; this._tMin = tMin; this._tMax = tMax
  }

  /** Which prism footprints cover each cell centre (scanline, same even-odd rule as the point tests). */
  _buildCover() {
    const prisms = this.world.prisms, nP = prisms.length
    const cell = this.cell, nx = this.nx, ny = this.ny, n = this.n, x0 = this.x0, y0 = this.y0, inv = this._inv
    let maxEdges = 4
    for (let k = 0; k < nP; k++) if (prisms[k].edges.length / 4 > maxEdges) maxEdges = prisms[k].edges.length / 4
    let pairs = new Int32Array(1 << 17), np = 0
    const xs = new Float64Array(maxEdges)
    for (let k = 0; k < nP; k++) {
      const p = prisms[k], E = p.edges
      let j0 = Math.ceil((p.minY - y0) * inv - 0.5), j1 = Math.floor((p.maxY - y0) * inv - 0.5)
      if (j0 < 0) j0 = 0; if (j1 > ny - 1) j1 = ny - 1
      for (let j = j0; j <= j1; j++) {
        const y = y0 + (j + 0.5) * cell
        let m = 0
        for (let e = 0; e < E.length; e += 4) {
          const ya = E[e + 1], yb = E[e + 3]
          if ((ya > y) !== (yb > y)) {
            const v = (E[e + 2] - E[e]) * (y - ya) / (yb - ya) + E[e]
            let q = m++
            while (q > 0 && xs[q - 1] > v) { xs[q] = xs[q - 1]; q-- }
            xs[q] = v
          }
        }
        // the centre is inside between the 1st and 2nd crossing, the 3rd and 4th, ...
        for (let q = 0; q + 1 < m; q += 2) {
          let i0 = Math.ceil((xs[q] - x0) * inv - 0.5), i1 = Math.ceil((xs[q + 1] - x0) * inv - 0.5) - 1
          if (i0 < 0) i0 = 0; if (i1 > nx - 1) i1 = nx - 1
          for (let i = i0; i <= i1; i++) {
            if (np + 2 > pairs.length) { const g = new Int32Array(pairs.length * 2); g.set(pairs); pairs = g }
            pairs[np++] = j * nx + i; pairs[np++] = k
          }
        }
      }
    }
    const cs = new Int32Array(n + 1)
    for (let q = 0; q < np; q += 2) cs[pairs[q] + 1]++
    for (let c = 0; c < n; c++) cs[c + 1] += cs[c]
    const ci = new Int32Array(np >> 1), fill = cs.slice(0, n)
    for (let q = 0; q < np; q += 2) ci[fill[pairs[q]]++] = pairs[q + 1]
    this._covS = cs; this._covI = ci
  }

  /** Centre of cell c inside a prism that blocks a base body standing at height z? */
  _blockedAt(c, z) {
    const cs = this._covS, ci = this._covI, pTop = this._pTop, pBase = this._pBase
    const lo = z + this.stepUp, hi = z + this.baseHeight + this.headMargin
    for (let q = cs[c], qe = cs[c + 1]; q < qe; q++) {
      const k = ci[q]
      if (pTop[k] > lo && pBase[k] < hi) return true
    }
    return false
  }

  /** Walking level per cell: terrain, a low platform, or a deck reached from a neighbour (flood). */
  _buildLevels() {
    const nx = this.nx, ny = this.ny, n = this.n, stepUp = this.stepUp
    const gz = this.groundZ, cs = this._covS, ci = this._covI, pTop = this._pTop
    const L = new Float64Array(n), onTop = new Uint8Array(n)
    for (let c = 0; c < n; c++) {
      const g = gz[c]
      let lv = g
      for (let q = cs[c], qe = cs[c + 1]; q < qe; q++) { const t = pTop[ci[q]]; if (t > lv && t <= g + stepUp) lv = t }
      L[c] = lv
      if (lv > g) onTop[c] = 1
    }
    // Decks and terraces: a cell whose centre is inside a wall may instead be stood on at a prism top that a
    // neighbouring standable cell reaches with a step of at most stepUp (flood from open ground).
    const blocked = new Uint8Array(n), queue = new Int32Array(n)
    let qh = 0, qt = 0, promoted = 0
    for (let c = 0; c < n; c++) { if (cs[c] !== cs[c + 1] && this._blockedAt(c, L[c])) blocked[c] = 1; else queue[qt++] = c }
    while (qh < qt) {
      const c = queue[qh++], zc = L[c]
      const i = c % nx, j = (c / nx) | 0
      for (let d = 0; d < 8; d++) {
        const ii = i + DI[d], jj = j + DJ[d]
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue
        const nb = jj * nx + ii
        if (!blocked[nb]) continue
        let T = -Infinity
        for (let q = cs[nb], qe = cs[nb + 1]; q < qe; q++) {
          const t = pTop[ci[q]]
          if (t > L[nb] && t <= zc + stepUp && t >= zc - stepUp && t > T) T = t
        }
        if (T === -Infinity || this._blockedAt(nb, T)) continue
        L[nb] = T; onTop[nb] = 1; blocked[nb] = 0; promoted++
        queue[qt++] = nb
      }
    }
    this.level = L
    this.onTop = onTop
    this.promotedCells = promoted
    // deck cells: standing on a prism top that is more than a step above the terrain under it (drop-offs possible)
    const deck = new Uint8Array(n)
    for (let c = 0; c < n; c++) if (L[c] > gz[c] + stepUp) deck[c] = 1
    this.deck = deck
  }

  /**
   * Reference levels for classifying prisms around a cell. The body is not only at the cell centre: along a
   * step or a straight line it stands anywhere in the cell and its neighbours, where the terrain may be lower
   * (so a low top becomes a ledge it cannot climb) or higher (less head room). Walls are therefore judged
   * against the lowest terrain of the 3x3 cell block and head room against the highest; neighbouring cells then
   * agree about every prism that can block between them.
   */
  _buildRefLevels() {
    const nx = this.nx, ny = this.ny, n = this.n, stepUp = this.stepUp, head = this.baseHeight + this.headMargin
    const L = this.level, onTop = this.onTop, tMin = this._tMin, tMax = this._tMax
    const wallLo = new Float32Array(n)     // a prism top above this is not walkable from the cell
    const headHi = new Float32Array(n)     // a prism underside below this blocks every body
    const refHi = new Float32Array(n)      // level the head room is measured from
    for (let j = 0; j < ny; j++) {
      const j0 = j > 0 ? j - 1 : 0, j1 = j < ny - 1 ? j + 1 : j
      for (let i = 0; i < nx; i++) {
        const c = j * nx + i
        let lo, hi
        if (onTop[c]) { lo = L[c]; hi = L[c] }
        else {
          lo = tMin[c]; hi = tMax[c]
          const i0 = i > 0 ? i - 1 : 0, i1 = i < nx - 1 ? i + 1 : i
          for (let jj = j0; jj <= j1; jj++) {
            for (let q = jj * nx + i0, qe = jj * nx + i1; q <= qe; q++) {
              if (tMin[q] < lo) lo = tMin[q]
              if (tMax[q] > hi) hi = tMax[q]
            }
          }
          lo -= 0.1
        }
        wallLo[c] = lo + stepUp; headHi[c] = hi + head; refHi[c] = hi
      }
    }
    this.wallLo = wallLo; this.headHi = headHi; this._refHi = refHi
  }

  /** wallDist (exact, per edge), lowest overhang within reach, head clearance at the centre. */
  _buildWalls() {
    const w = this.world, prisms = w.prisms, nP = prisms.length
    const cell = this.cell, nx = this.nx, ny = this.ny, n = this.n, x0 = this.x0, y0 = this.y0, inv = this._inv
    const stepUp = this.stepUp
    const L = this.level, onTop = this.onTop, tMin = this._tMin, cs = this._covS, ci = this._covI
    const pTop = this._pTop, pBase = this._pBase, wallLo = this.wallLo, headHi = this.headHi, refHi = this._refHi
    const cap2 = CAP * CAP
    const wd2 = new Float32Array(n).fill(cap2)
    const lowCeil = new Float32Array(n).fill(Infinity)
    const clearance = new Float32Array(n).fill(Infinity)
    for (let c = 0; c < n; c++) {
      if (cs[c] === cs[c + 1]) continue
      const lv = L[c]
      // prisms over the cell centre: judged at the centre, plus tops that stick out of the cell's own terrain
      const ownLo = onTop[c] ? lv + stepUp : Math.min(lv, tMin[c] - 0.1) + stepUp
      for (let q = cs[c], qe = cs[c + 1]; q < qe; q++) {
        const k = ci[q]
        if (pBase[k] > lv + stepUp) { const v = pBase[k] - lv; if (v < clearance[c]) clearance[c] = v }
        if (pTop[k] <= ownLo) continue
        if (pBase[k] < headHi[c]) wd2[c] = 0
        else { const v = pBase[k] - refHi[c]; if (v < lowCeil[c]) lowCeil[c] = v }
      }
    }
    const rOv = this.baseRadius * this.maxScale + this.wallMargin
    const rOv2 = rOv * rOv
    for (let k = 0; k < nP; k++) {
      const E = prisms[k].edges
      for (let e = 0; e < E.length; e += 4) this._edgePass(E[e], E[e + 1], E[e + 2], E[e + 3], pTop[k], pBase[k], wd2, lowCeil, rOv2)
    }
    const b = w.bounds
    const wd = new Float32Array(n)
    for (let j = 0; j < ny; j++) {
      const y = y0 + (j + 0.5) * cell
      const dby = Math.min(y - b.minY, b.maxY - y)
      for (let i = 0; i < nx; i++) {
        const x = x0 + (i + 0.5) * cell
        let d = Math.sqrt(wd2[j * nx + i])
        const db = Math.min(x - b.minX, b.maxX - x, dby)
        if (db < d) d = db
        wd[j * nx + i] = d > 0 ? d : 0
      }
    }
    this.wallDist = wd
    this.lowCeil = lowCeil
    this.clearance = clearance
  }

  /** Fold one footprint edge into the squared wall distances of every cell within CAP of it. */
  _edgePass(ax, ay, bx, by, top, base, wd2, lowCeil, rOv2) {
    const cell = this.cell, nx = this.nx, ny = this.ny, x0 = this.x0, y0 = this.y0, inv = this._inv
    const wallLo = this.wallLo, headHi = this.headHi, refHi = this._refHi
    const ex = bx - ax, ey = by - ay
    const l2 = ex * ex + ey * ey, il = l2 > 1e-12 ? 1 / l2 : 0
    let i0 = Math.ceil(((ax < bx ? ax : bx) - CAP - x0) * inv - 0.5), i1 = Math.floor(((ax > bx ? ax : bx) + CAP - x0) * inv - 0.5)
    let j0 = Math.ceil(((ay < by ? ay : by) - CAP - y0) * inv - 0.5), j1 = Math.floor(((ay > by ? ay : by) + CAP - y0) * inv - 0.5)
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > nx - 1) i1 = nx - 1; if (j1 > ny - 1) j1 = ny - 1
    for (let j = j0; j <= j1; j++) {
      const py = y0 + (j + 0.5) * cell - ay
      const row = j * nx
      for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) * cell - ax
        let u = (px * ex + py * ey) * il
        if (u < 0) u = 0; else if (u > 1) u = 1
        const qx = px - ex * u, qy = py - ey * u
        const d2 = qx * qx + qy * qy
        const c = row + i
        if (d2 >= wd2[c] && d2 > rOv2) continue
        if (top <= wallLo[c]) continue
        if (base < headHi[c]) { if (d2 < wd2[c]) wd2[c] = d2 }
        else if (d2 <= rOv2) { const v = base - refHi[c]; if (v < lowCeil[c]) lowCeil[c] = v }
      }
    }
  }

  /** Slope / ledge limit per directed step (bit d of slopeOk = the step to neighbour d is allowed by the ground). */
  _buildSlopes() {
    const w = this.world, cell = this.cell, nx = this.nx, ny = this.ny, n = this.n, x0 = this.x0, y0 = this.y0, inv = this._inv
    const stepUp = this.stepUp, L = this.level, onTop = this.onTop, wd = this.wallDist
    const slopeOk = new Uint8Array(n).fill(255)
    const tanMax = Math.tan(this.maxSlopeDeg * Math.PI / 180)
    // cells near steep terrain edges need the sampled test, the rest is flat enough by construction
    const rough = new Uint8Array(n)
    const h = w.h, tnx = w.tnx, tny = w.tny, ts = w.tStep
    for (let tj = 0; tj < tny; tj++) {
      for (let ti = 0; ti < tnx; ti++) {
        const v = h[tj * tnx + ti]
        const a = ti + 1 < tnx ? Math.abs(h[tj * tnx + ti + 1] - v) : 0
        const c = tj + 1 < tny ? Math.abs(h[(tj + 1) * tnx + ti] - v) : 0
        if (a > 0.6 || c > 0.6) {
          const vx = w.tMinX + ti * ts, vy = w.tMinY + tj * ts
          let i0 = Math.floor((vx - 4 - x0) * inv), i1 = Math.floor((vx + 4 - x0) * inv)
          let j0 = Math.floor((vy - 4 - y0) * inv), j1 = Math.floor((vy + 4 - y0) * inv)
          if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > nx - 1) i1 = nx - 1; if (j1 > ny - 1) j1 = ny - 1
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) rough[j * nx + i] = 1
        }
      }
    }
    let slopeCut = 0
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = j * nx + i
        if (wd[c] <= 0) { slopeOk[c] = 0; continue }
        // fast path: flat surroundings, nothing to test
        if (!rough[c] && !onTop[c] && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 &&
            !(rough[c - 1] | rough[c + 1] | rough[c - nx] | rough[c + nx] | rough[c - nx - 1] | rough[c - nx + 1] | rough[c + nx - 1] | rough[c + nx + 1]) &&
            !(onTop[c - 1] | onTop[c + 1] | onTop[c - nx] | onTop[c + nx] | onTop[c - nx - 1] | onTop[c - nx + 1] | onTop[c + nx - 1] | onTop[c + nx + 1])) continue
        let bits = 0
        const xc = x0 + (i + 0.5) * cell, yc = y0 + (j + 0.5) * cell
        for (let d = 0; d < 8; d++) {
          const ii = i + DI[d], jj = j + DJ[d]
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue
          const nb = jj * nx + ii
          let ok = true
          if (onTop[c] || onTop[nb]) {
            ok = L[nb] - L[c] <= stepUp + 1e-6
            // Between the two centres the surface must stay within a step of the prism top being walked on:
            // a deeper gap means a ledge that cannot be climbed, or a drop that leaves the top as a wall.
            for (let s = 1; s <= 3 && ok; s++) {
              const px = xc + DI[d] * cell * s * 0.25, py = yc + DJ[d] * cell * s * 0.25
              const cc = s < 2 ? c : s > 2 ? nb : (L[c] > L[nb] ? c : nb)
              if (onTop[cc] && w.surfaceZ(px, py, L[cc] + 0.01) < L[cc] - stepUp + 0.05) ok = false
            }
          } else if (rough[c] || rough[nb]) {
            // uphill limit: terrain difference over +-1 m along the direction of travel, sampled every metre
            const len = (d & 1) ? cell * SQRT2 : cell
            const ux = DI[d] * cell / len, uy = DJ[d] * cell / len
            const ns = Math.ceil(len - 1e-9)
            for (let s = 0; s <= ns && ok; s++) {
              const t = s < len ? s : len
              const px = xc + ux * t, py = yc + uy * t
              if ((w.ground(px + ux, py + uy) - w.ground(px - ux, py - uy)) * 0.5 > tanMax) ok = false
            }
          }
          if (ok) bits |= 1 << d; else slopeCut++
        }
        slopeOk[c] = bits
      }
    }
    this.slopeOk = slopeOk
    this.slopeCutEdges = slopeCut
  }

  /** Set the current body size (grows with cubes). Recomputes passability and step masks (about 2 ms). */
  setBody(radius, height) {
    if (!(radius > 0)) radius = this.baseRadius
    if (!(height > 0)) height = this.baseHeight
    if (radius === this.radius && height === this.height) return
    this.radius = radius; this.height = height
    const n = this.n, nx = this.nx, ny = this.ny
    const pass = this.pass, steps = this.steps, wd = this.wallDist, lc = this.lowCeil, cl = this.clearance
    const rMin = radius + this.wallMargin, hMin = height + this.headMargin
    this._wallMin = rMin
    for (let c = 0; c < n; c++) pass[c] = (wd[c] >= rMin && lc[c] >= hMin && cl[c] >= hMin) ? 1 : 0
    const so = this.slopeOk
    steps.fill(0)
    for (let j = 1; j < ny - 1; j++) {
      for (let c = j * nx + 1, ce = j * nx + nx - 1; c < ce; c++) {
        if (!pass[c]) continue
        const pm = pass[c + 1] | (pass[c + nx + 1] << 1) | (pass[c + nx] << 2) | (pass[c + nx - 1] << 3) |
          (pass[c - 1] << 4) | (pass[c - nx - 1] << 5) | (pass[c - nx] << 6) | (pass[c - nx + 1] << 7)
        // a diagonal needs both orthogonal neighbours (no corner cutting)
        const orth = pm & 0x55
        const diag = (orth << 1) & ((orth >> 1) | ((orth & 1) << 7))
        steps[c] = pm & so[c] & (0x55 | diag)
      }
    }
  }

  _label() {
    // Connected components of the step graph for the base body (links are treated as two-way).
    const n = this.n, steps = this.steps, pass = this.pass, off = this._off
    const comp = new Int32Array(n).fill(-1)
    const stack = new Int32Array(n)
    const sizes = []
    let id = 0
    for (let s = 0; s < n; s++) {
      if (!pass[s] || comp[s] >= 0) continue
      let sp = 0, size = 0
      stack[sp++] = s; comp[s] = id
      while (sp > 0) {
        const c = stack[--sp]
        size++
        const sb = steps[c]
        for (let d = 0; d < 8; d++) {
          const nb = c + off[d]
          if (comp[nb] >= 0 || !pass[nb]) continue
          if (((sb >> d) & 1) || ((steps[nb] >> ((d + 4) & 7)) & 1)) { comp[nb] = id; stack[sp++] = nb }
        }
      }
      sizes.push(size)
      id++
    }
    this.comp = comp
    this.compSizes = sizes
    let best = -1, bs = 0
    for (let k = 0; k < sizes.length; k++) if (sizes[k] > bs) { bs = sizes[k]; best = k }
    this.mainComponent = best
    this._basePass = this.pass.slice()
    this._mainSeed = 0
    for (let c = 0; c < n; c++) if (comp[c] === best) { this._mainSeed = c; break }
    this._hopCache = new Map()
  }

  // ------------------------------------------------------------------ cell queries

  /** Can the current body stand in cell (i,j)? */
  passable(i, j) {
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return false
    return this.pass[j * this.nx + i] === 1
  }

  /** May the current body walk from cell (i0,j0) to the 8-neighbour (i1,j1)? Directed (uphill limit). */
  canStep(i0, j0, i1, j1) {
    if (i0 < 0 || j0 < 0 || i0 >= this.nx || j0 >= this.ny) return false
    const di = i1 - i0, dj = j1 - j0
    let d
    if (dj === 0) { if (di === 1) d = 0; else if (di === -1) d = 4; else return false }
    else if (dj === 1) { if (di === 1) d = 1; else if (di === 0) d = 2; else if (di === -1) d = 3; else return false }
    else if (dj === -1) { if (di === -1) d = 5; else if (di === 0) d = 6; else if (di === 1) d = 7; else return false }
    else return false
    return ((this.steps[j0 * this.nx + i0] >> d) & 1) === 1
  }

  /** Bilinear wall distance at a point (metres, 0 outside the grid). */
  wallDistAt(x, y) {
    const fx = (x - this.x0) * this._inv - 0.5, fy = (y - this.y0) * this._inv - 0.5
    let i = Math.floor(fx), j = Math.floor(fy)
    const nx = this.nx, ny = this.ny
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) {
      const c = this.idx(x, y)
      return c < 0 ? 0 : this.wallDist[c]
    }
    const sx = fx - i, sy = fy - j, c = j * nx + i, wd = this.wallDist
    return (wd[c] * (1 - sx) + wd[c + 1] * sx) * (1 - sy) + (wd[c + nx] * (1 - sx) + wd[c + nx + 1] * sx) * sy
  }

  /** Walking surface height of the cell containing the point (terrain or a deck top). */
  levelAt(x, y) {
    const c = this.idx(x, y)
    return c < 0 ? this.world.ground(x, y) : this.level[c]
  }

  passableAt(x, y) {
    const c = this.idx(x, y)
    return c >= 0 && this.pass[c] === 1
  }

  /** Index of the passable cell whose centre is nearest to (x,y) within maxR metres, or -1. */
  nearestPassableIdx(x, y, maxR = 12) {
    const inv = this._inv, nx = this.nx, ny = this.ny, cell = this.cell
    let i0 = Math.floor((x - maxR - this.x0) * inv), i1 = Math.floor((x + maxR - this.x0) * inv)
    let j0 = Math.floor((y - maxR - this.y0) * inv), j1 = Math.floor((y + maxR - this.y0) * inv)
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > nx - 1) i1 = nx - 1; if (j1 > ny - 1) j1 = ny - 1
    const pass = this.pass
    let best = -1, bd = maxR * maxR
    for (let j = j0; j <= j1; j++) {
      const dy = this.y0 + (j + 0.5) * cell - y, dy2 = dy * dy
      if (dy2 > bd) continue
      const row = j * nx
      for (let i = i0; i <= i1; i++) {
        if (!pass[row + i]) continue
        const dx = this.x0 + (i + 0.5) * cell - x
        const d2 = dx * dx + dy2
        if (d2 <= bd) { bd = d2; best = row + i }
      }
    }
    return best
  }

  /** Centre {x,y} of the nearest passable cell within maxR metres, or null. */
  nearestPassable(x, y, maxR = 12) {
    const c = this.nearestPassableIdx(x, y, maxR)
    return c < 0 ? null : { x: this.cellX(c), y: this.cellY(c) }
  }

  /**
   * Connected-component id of the ground graph for the base body at (x,y): the cell's own id, or that of the
   * nearest standable cell within 6 m; -1 when there is none. Equal ids mean mutually reachable on foot
   * (slope-limited one-way links count as connections). nav.mainComponent is the largest one.
   */
  component(x, y) {
    const c = this.idx(x, y)
    if (c >= 0 && this.comp[c] >= 0) return this.comp[c]
    const inv = this._inv, nx = this.nx, ny = this.ny, cell = this.cell, R = 6
    let i0 = Math.floor((x - R - this.x0) * inv), i1 = Math.floor((x + R - this.x0) * inv)
    let j0 = Math.floor((y - R - this.y0) * inv), j1 = Math.floor((y + R - this.y0) * inv)
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > nx - 1) i1 = nx - 1; if (j1 > ny - 1) j1 = ny - 1
    let best = -1, bd = R * R
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * nx + i
        if (this.comp[k] < 0) continue
        const dx = this.x0 + (i + 0.5) * cell - x, dy = this.y0 + (j + 0.5) * cell - y
        const d2 = dx * dx + dy * dy
        if (d2 <= bd) { bd = d2; best = this.comp[k] }
      }
    }
    return best
  }

  /** True when both points belong to the same ground component (base body). */
  reachable(ax, ay, bx, by) {
    const a = this.component(ax, ay)
    return a >= 0 && a === this.component(bx, by)
  }

  // ------------------------------------------------------------------ straight lines

  /**
   * Walk the straight segment in 1 m samples. Every cell change must be an allowed step and the interpolated
   * wall distance must stay at radius + margin. relax bit 1 (start) / bit 2 (end): that end may be closer to a
   * wall than the margin as long as the line gains distance while moving away from it (a mech hugging a wall,
   * a goal next to one). Returns the accumulated extra cost (>= 0), or -1 when not walkable.
   */
  _line(ax, ay, bx, by, relax, costFn) {
    const nx = this.nx, ny = this.ny, inv = this._inv, x0 = this.x0, y0 = this.y0
    let i = Math.floor((ax - x0) * inv), j = Math.floor((ay - y0) * inv)
    if (i < 0 || j < 0 || i >= nx || j >= ny) return -1
    const pass = this.pass, steps = this.steps, onTop = this.onTop, level = this.level, world = this.world
    const dropMax = this.stepUp - 0.05
    let c = j * nx + i
    if (!pass[c]) return -1
    const thr = this._wallMin - 0.02
    let w0 = thr, w1 = thr
    if (relax & 1) { w0 = this.wallDistAt(ax, ay); if (w0 > thr) w0 = thr }
    else if (this.wallDistAt(ax, ay) < thr) return -1
    if (relax & 2) { w1 = this.wallDistAt(bx, by); if (w1 > thr) w1 = thr }
    const dx = bx - ax, dy = by - ay
    const len = Math.sqrt(dx * dx + dy * dy)
    let cost = 0
    if (len < 1e-9) return 0
    const ns = Math.ceil(len / (this.cell * 0.5))
    const sx = dx / ns, sy = dy / ns, sl = len / ns
    let x = ax, y = ay
    for (let s = 1; s <= ns; s++) {
      x += sx; y += sy
      if (s === ns) { x = bx; y = by }
      const ii = Math.floor((x - x0) * inv), jj = Math.floor((y - y0) * inv)
      if (ii !== i || jj !== j) {
        const di = ii - i, dj = jj - j
        let d
        if (dj === 0) d = di === 1 ? 0 : di === -1 ? 4 : -1
        else if (dj === 1) d = di === 1 ? 1 : di === 0 ? 2 : di === -1 ? 3 : -1
        else if (dj === -1) d = di === -1 ? 5 : di === 0 ? 6 : di === 1 ? 7 : -1
        else d = -1
        if (d < 0 || !((steps[c] >> d) & 1)) return -1
        i = ii; j = jj; c = j * nx + i
        if (costFn) cost += costFn(c)
      }
      // on a prism top: the surface under the sample must stay within a step of it (no walking off a ledge)
      if (onTop[c] && world.surfaceZ(x, y, level[c] + 0.01) < level[c] - dropMax) return -1
      let need = thr
      if (w0 < thr) { const v = w0 + 0.5 * s * sl; if (v < need) need = v }
      if (w1 < thr) { const v = w1 + 0.5 * (ns - s) * sl; if (v < need) need = v }
      if (this.wallDistAt(x, y) < need) return -1
    }
    return cost
  }

  /**
   * True when the current body can walk the straight segment a -> b. Both ends must lie in standable cells.
   * By default an end that is closer to a wall than the safety margin (a mech hugging a wall) is accepted as
   * long as the line gains distance while leaving it; strict = true demands the full margin everywhere.
   */
  walkLine(ax, ay, bx, by, strict = false) { return this._line(ax, ay, bx, by, strict ? 0 : 3, null) >= 0 }

  // ------------------------------------------------------------------ A*

  /**
   * One A* run from cell s towards cell t (goal: t itself, or any cell whose centre is within rGoal of (bx,by)).
   * Returns the reached cell or -1; this._best / this._bestH describe the closest explored cell,
   * this._expanded the work done, this._budgetHit whether it stopped on maxExpand.
   */
  _search(s, t, bx, by, rGoal, maxExpand, weight, costFn) {
    const nx = this.nx, cell = this.cell, steps = this.steps, off = this._off, x0 = this.x0, y0 = this.y0
    const gi = t % nx, gj = (t / nx) | 0
    const rG2 = rGoal * rGoal
    let gen = this._gen + 1
    if (gen >= 0xffffffff) { this._seen.fill(0); this._closed.fill(0); gen = 1 }
    this._gen = gen
    const g = this._g, par = this._par, seen = this._seen, closed = this._closed
    const hN = this._heapN, hF = this._heapF, hCap = this._heapCap
    const diagLen = cell * SQRT2, D2 = SQRT2 - 2
    let hs = 0

    let di0 = s % nx - gi, dj0 = ((s / nx) | 0) - gj
    if (di0 < 0) di0 = -di0; if (dj0 < 0) dj0 = -dj0
    let bestH = cell * (di0 + dj0 + D2 * (di0 < dj0 ? di0 : dj0)), bestNode = s
    g[s] = 0; par[s] = -1; seen[s] = gen
    hN[0] = s; hF[0] = bestH * weight; hs = 1

    let found = -1, expanded = 0, budgetHit = false
    while (hs > 0) {
      // pop the smallest f
      const c = hN[0]
      hs--
      if (hs > 0) {
        const ln = hN[hs], lf = hF[hs]
        let p = 0
        for (;;) {
          let ch = 2 * p + 1
          if (ch >= hs) break
          if (ch + 1 < hs && hF[ch + 1] < hF[ch]) ch++
          if (hF[ch] >= lf) break
          hN[p] = hN[ch]; hF[p] = hF[ch]; p = ch
        }
        hN[p] = ln; hF[p] = lf
      }
      if (closed[c] === gen) continue          // stale duplicate
      closed[c] = gen
      const ci = c % nx, cj = (c / nx) | 0
      if (c === t) { found = c; break }
      if (rGoal > 0) {
        const ddx = x0 + (ci + 0.5) * cell - bx, ddy = y0 + (cj + 0.5) * cell - by
        if (ddx * ddx + ddy * ddy <= rG2) { found = c; break }
      }
      let hi = ci - gi, hj = cj - gj
      if (hi < 0) hi = -hi; if (hj < 0) hj = -hj
      const hc = cell * (hi + hj + D2 * (hi < hj ? hi : hj))
      if (hc < bestH) { bestH = hc; bestNode = c }
      if (++expanded >= maxExpand) { budgetHit = true; break }
      const sb = steps[c], gc = g[c]
      for (let d = 0; d < 8; d++) {
        if (!((sb >> d) & 1)) continue
        const nb = c + off[d]
        if (closed[nb] === gen) continue
        let ng = gc + ((d & 1) ? diagLen : cell)
        if (costFn !== null) { const e = costFn(nb); if (e > 0) ng += e }
        if (seen[nb] === gen && g[nb] <= ng) continue
        g[nb] = ng; par[nb] = c; seen[nb] = gen
        let ni = ci + DI[d] - gi, nj = cj + DJ[d] - gj
        if (ni < 0) ni = -ni; if (nj < 0) nj = -nj
        const f = ng + weight * cell * (ni + nj + D2 * (ni < nj ? ni : nj))
        if (hs >= hCap) { budgetHit = true; break }
        let p = hs++
        while (p > 0) {
          const q = (p - 1) >> 1
          if (hF[q] <= f) break
          hN[p] = hN[q]; hF[p] = hF[q]; p = q
        }
        hN[p] = nb; hF[p] = f
      }
      if (budgetHit) break
    }
    this._best = bestNode; this._bestH = bestH; this._expanded = expanded; this._budgetHit = budgetHit
    return found
  }

  /**
   * A* from (ax,ay) to (bx,by) for the current body, followed by string pulling.
   * opts: {maxExpand: 25000 (total work bound), cost: (cellIdx) => extra metres >= 0 for entering the cell,
   *        radiusGoal: 0, snap: 12 (metres an end point may be moved to reach a standable cell),
   *        weight: 1.3 (heuristic weight; 1 = shortest path on the grid), smooth: true}
   * With the default weight a first run gets 60% of maxExpand; if it runs out and both ends are in the same
   * component a greedier run (weight 2.5) gets the rest.
   * Returns {ok, partial, pts, len, expanded, goalSnapped}:
   *   ok      - the goal (or a cell within radiusGoal of it) was reached; when the goal itself is not standable
   *             (inside a wall, on a roof) the nearest standable cell within `snap` stands in for it and
   *             goalSnapped is true
   *   partial - the path stops at the explored cell closest to the goal instead (then ok is false)
   *   pts     - [[x,y],...] polyline starting at (ax,ay); steer at pts[1] (see nextWaypoint); [] when there is
   *             no standable cell near an end point
   *   len     - polyline length in metres (Infinity when pts is empty)
   */
  findPath(ax, ay, bx, by, opts) {
    const o = opts || EMPTY
    let maxExpand = o.maxExpand ?? 25000
    const costFn = o.cost || null
    const rGoal = o.radiusGoal ?? 0
    const snap = o.snap ?? 12
    const nx = this.nx, cell = this.cell, pass = this.pass
    this.lastExpanded = 0

    let s = this.idx(ax, ay)
    let startSnapped = false
    if (s < 0 || !pass[s]) { s = this.nearestPassableIdx(ax, ay, snap); startSnapped = true }
    if (s < 0) return { ok: false, partial: false, pts: [], len: Infinity, expanded: 0, goalSnapped: false }
    let t = this.idx(bx, by)
    let goalExact = true
    if (t < 0 || !pass[t]) { t = this.nearestPassableIdx(bx, by, Math.max(snap, rGoal)); goalExact = false }
    if (t < 0) return { ok: false, partial: false, pts: [], len: Infinity, expanded: 0, goalSnapped: true }

    // Different base components cannot be joined on foot: only look for the nearest approach, cheaply.
    const sameComp = !(this.comp[s] >= 0 && this.comp[t] >= 0 && this.comp[s] !== this.comp[t])
    if (!sameComp && maxExpand > 6000) maxExpand = 6000

    let found, expanded, end
    if (o.weight !== undefined || !sameComp) {
      found = this._search(s, t, bx, by, rGoal, maxExpand, o.weight ?? 1.3, costFn)
      expanded = this._expanded
      end = found >= 0 ? found : this._best
    } else {
      const first = Math.max(1, Math.round(maxExpand * 0.6))
      found = this._search(s, t, bx, by, rGoal, first, 1.3, costFn)
      expanded = this._expanded
      end = found >= 0 ? found : this._best
      if (found < 0 && this._budgetHit && maxExpand - first > 0) {
        found = this._search(s, t, bx, by, rGoal, maxExpand - first, 2.5, costFn)
        expanded += this._expanded
        end = found >= 0 ? found : this._best
      }
    }
    this.lastExpanded = expanded
    const ok = found >= 0
    const par = this._par
    if (!ok && end === s && !startSnapped) {
      return { ok: false, partial: true, pts: [[ax, ay]], len: 0, expanded, goalSnapped: !goalExact }
    }

    // ---- reconstruct the cell chain start .. end
    let cnt = 0
    for (let c = end; c >= 0; c = par[c]) cnt++
    if (cnt + 2 > this._rx.length) {
      const m = cnt + 1024
      this._pathBuf = new Int32Array(m); this._pathCost = new Float64Array(m + 1)
      this._rx = new Float64Array(m + 2); this._ry = new Float64Array(m + 2)
    }
    const pb = this._pathBuf
    { let q = cnt; for (let c = end; c >= 0; c = par[c]) pb[--q] = c }
    // raw polyline: true start, cell centres, true goal (when it lies in the reached cell)
    const rx = this._rx, ry = this._ry, pc = this._pathCost
    let m = 0
    rx[m] = ax; ry[m] = ay; pc[m] = 0; m++
    for (let q = 0; q < cnt; q++) {
      const c = pb[q]
      rx[m] = this.x0 + (c % nx + 0.5) * cell; ry[m] = this.y0 + (((c / nx) | 0) + 0.5) * cell
      pc[m] = pc[m - 1] + (costFn && q > 0 ? Math.max(0, costFn(c)) : 0)
      m++
    }
    const goalPoint = ok && goalExact && end === t
    if (goalPoint) { rx[m - 1] = bx; ry[m - 1] = by }

    const pts = [[ax, ay]]
    let len = 0
    if (o.smooth === false) {
      for (let q = 1; q < m; q++) {
        if (q === 1 && !startSnapped && m > 2) continue      // the start already lies in the first cell
        pts.push([rx[q], ry[q]])
      }
    } else {
      // string pulling: from each anchor jump to the farthest raw point with a walkable straight line
      // (galloping search; every accepted shortcut is verified, adjacent raw points are steps A* validated).
      let a = 0
      const relaxFirst = !startSnapped
      while (a < m - 1) {
        let good = a + 1
        if (a === 0 && startSnapped) {
          // not standing in a walkable cell: head for the snapped cell centre first
        } else {
          const relaxA = a === 0 && relaxFirst ? 1 : 0
          const eps = 1e-6
          const okLine = (k) => {
            const cl = this._line(rx[a], ry[a], rx[k], ry[k], relaxA | (k === m - 1 && goalPoint ? 2 : 0), costFn)
            return cl >= 0 && cl <= pc[k] - pc[a] + eps
          }
          if (a === 0 && m > 2 && okLine(2)) good = 2      // skip the centre of the start cell when possible
          let step = 2, lo = good, hi = -1
          for (;;) {
            const k = Math.min(m - 1, lo + step)
            if (k <= lo) break
            if (okLine(k)) { lo = k; if (k === m - 1) break; step *= 2 } else { hi = k; break }
          }
          if (hi > 0) {
            while (hi - lo > 1) {
              const mid = (lo + hi) >> 1
              if (okLine(mid)) lo = mid; else hi = mid
            }
          }
          good = lo
        }
        pts.push([rx[good], ry[good]])
        a = good
      }
    }
    for (let q = 1; q < pts.length; q++) len += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1])
    return { ok, partial: !ok, pts, len, expanded, goalSnapped: !goalExact }
  }

  /** Walking distance estimate: the straight line when walkable, else the A* path length (Infinity if none). */
  pathLength(ax, ay, bx, by, opts) {
    if (this._line(ax, ay, bx, by, 3, null) >= 0) return Math.hypot(bx - ax, by - ay)
    const r = this.findPath(ax, ay, bx, by, opts || QUICK)
    return r.ok ? r.len : Infinity
  }

  // ------------------------------------------------------------------ leaving enclosed pockets

  /**
   * Candidate jump-jet exits of component k (base body): for every rim cell, straight hops in 16 directions
   * that end on a standable cell of the main component. Cached per component.
   * Returns {launch:Int32Array, land:Int32Array, apex:Float32Array, n}.
   */
  _hopCandidates(k, maxHop) {
    const key = k + ':' + maxHop
    let hit = this._hopCache.get(key)
    if (hit) return hit
    const w = this.world, nx = this.nx, n = this.n, cell = this.cell, comp = this.comp, bp = this._basePass
    const L = this.level, wd = this.wallDist, main = this.mainComponent, off = this._off
    const r = this.baseRadius, landClear = this.baseRadius + this.wallMargin + 0.7
    const launch = [], land = [], apex = []
    const steps = Math.floor(maxHop / cell)
    for (let c = 0; c < n; c++) {
      if (comp[c] !== k) continue
      let rim = false
      for (let d = 0; d < 8; d++) if (!bp[c + off[d]]) { rim = true; break }
      if (!rim) continue
      const xc = this.cellX(c), yc = this.cellY(c), lz = L[c]
      if (this.lowCeil[c] < Infinity || w.surfaceZ(xc, yc) > lz + 0.5) continue   // something overhead: no take-off here
      for (let a = 0; a < 16; a++) {
        const ux = Math.cos(a * Math.PI / 8), uy = Math.sin(a * Math.PI / 8)
        let hmax = lz
        for (let s = 1; s <= steps; s++) {
          const px = xc + ux * cell * s, py = yc + uy * cell * s
          const q = this.idx(px, py)
          if (q < 0) break
          if (comp[q] === k) break                             // still inside the pocket: a better rim cell lies ahead
          // highest surface under the body's width at this point of the flight
          let h = w.surfaceZ(px, py)
          const h1 = w.surfaceZ(px - uy * r, py + ux * r), h2 = w.surfaceZ(px + uy * r, py - ux * r)
          if (h1 > h) h = h1; if (h2 > h) h = h2
          if (comp[q] === main && wd[q] >= landClear && h <= L[q] + 0.5) {
            launch.push(c); land.push(q); apex.push(hmax + 1.5)
            break
          }
          if (h > hmax) hmax = h
          if (hmax - lz > 70) break
        }
      }
    }
    hit = { launch: Int32Array.from(launch), land: Int32Array.from(land), apex: Float32Array.from(apex), n: launch.length }
    this._hopCache.set(key, hit)
    return hit
  }

  /**
   * Way out of an enclosed pocket (the stadium bowl, a courtyard, a roof strip): the ground graph has several
   * components and only a jump-jet hop joins them. Returns null when (x,y) already belongs to the main
   * component (or no hop exists), else
   *   {launch:[x,y], launchZ, land:[x,y], landZ, apexZ, climb, hopLen, walkLen, cost}
   * meaning: walk to `launch` (findPath), rise there until the feet are above apexZ (jump, then boost in the
   * air), fly straight to `land`, drop. climb = apexZ - launchZ (0 = just walk off the edge).
   * opts: {maxHop: 45, maxClimb: 40, toward: [x,y] (prefer exits near this point, e.g. the zone centre), snap: 12}
   * First call for the stadium costs tens of ms (cached afterwards; the constructor pre-computes large pockets).
   */
  hopPlan(x, y, opts) {
    const o = opts || EMPTY
    const maxHop = o.maxHop ?? 45, maxClimb = o.maxClimb ?? 40
    let s = this.idx(x, y)
    if (s < 0 || !this.pass[s]) s = this.nearestPassableIdx(x, y, o.snap ?? 12)
    if (s < 0) return null
    const k = this.comp[s]
    if (k < 0 || k === this.mainComponent || this.mainComponent < 0) return null
    const cand = this._hopCandidates(k, maxHop)
    if (cand.n === 0) return null
    // walking distances from s inside the pocket (uniform-cost run that cannot reach the main component)
    this._search(s, this._mainSeed, 0, 0, 0, 1e9, 0, null)
    const gen = this._gen, closed = this._closed, g = this._g, L = this.level
    const tx = o.toward ? o.toward[0] : 0, ty = o.toward ? o.toward[1] : 0
    let best = -1, bestCost = Infinity
    for (let q = 0; q < cand.n; q++) {
      const a = cand.launch[q]
      if (closed[a] !== gen) continue
      const climb = Math.max(0, cand.apex[q] - L[a])
      if (climb > maxClimb) continue
      const b = cand.land[q]
      const hop = Math.hypot(this.cellX(b) - this.cellX(a), this.cellY(b) - this.cellY(a))
      let cost = g[a] + 1.5 * hop + 3 * climb
      if (o.toward) cost += 0.5 * Math.hypot(this.cellX(b) - tx, this.cellY(b) - ty)
      if (cost < bestCost) { bestCost = cost; best = q }
    }
    if (best < 0) return null
    const a = cand.launch[best], b = cand.land[best]
    return {
      launch: [this.cellX(a), this.cellY(a)], launchZ: L[a], land: [this.cellX(b), this.cellY(b)], landZ: L[b],
      apexZ: cand.apex[best], climb: Math.max(0, cand.apex[best] - L[a]),
      hopLen: Math.hypot(this.cellX(b) - this.cellX(a), this.cellY(b) - this.cellY(a)), walkLen: g[a], cost: bestCost,
    }
  }

  /**
   * Steering helper: index of the waypoint to head for, skipping those already within `reach` metres.
   * Returns pts.length - 1 at the end of the path, -1 for an empty path.
   */
  nextWaypoint(pts, x, y, reach = 1.5) {
    if (!pts || pts.length === 0) return -1
    let k = pts.length > 1 ? 1 : 0
    while (k < pts.length - 1 && Math.hypot(pts[k][0] - x, pts[k][1] - y) <= reach) k++
    return k
  }
}

const EMPTY = Object.freeze({})
const QUICK = Object.freeze({ maxExpand: 12000 })
