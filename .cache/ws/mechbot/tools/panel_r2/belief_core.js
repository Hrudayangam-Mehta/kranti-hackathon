// Reference implementation of the proposed belief module (coarse occupancy layers). DEV ONLY: it is the thing the
// replay validation and the cost benchmark run; the shipped module should be rewritten inside bot/lib by its owner.
export class BeliefGrid {
  constructor(world, nav, opts = {}) {
    this.world = world; this.nav = nav
    const K = this.K = opts.k ?? 4                       // nav cells per coarse cell side (4 x 2 m = 8 m)
    const cs = this.cs = K * nav.cell
    const cnx = this.cnx = Math.ceil(nav.nx / K), cny = this.cny = Math.ceil(nav.ny / K), cn = this.cn = cnx * cny
    this.x0 = nav.x0; this.y0 = nav.y0
    this.open = new Uint8Array(cn); this.repX = new Float32Array(cn); this.repY = new Float32Array(cn); this.repZ = new Float32Array(cn)
    this.link = new Uint8Array(cn)                        // bit d: may walk to coarse neighbour d (0 = +x, ccw, 45 deg steps)
    this.DI = [1, 1, 0, -1, -1, -1, 0, 1]; this.DJ = [0, 1, 1, 1, 0, -1, -1, -1]
    this.W = [1, 0.25, 1, 0.25, 1, 0.25, 1, 0.25]          // isotropic 9-point stencil weights
    const rep = new Int32Array(cn).fill(-1)
    for (let cj = 0; cj < cny; cj++) for (let ci = 0; ci < cnx; ci++) {
      const c = cj * cnx + ci
      const mx = this.x0 + (ci + 0.5) * cs, my = this.y0 + (cj + 0.5) * cs
      let best = -1, bd = 1e9, cnt = 0
      for (let j = cj * K; j < Math.min(nav.ny, cj * K + K); j++) for (let i = ci * K; i < Math.min(nav.nx, ci * K + K); i++) {
        const q = j * nav.nx + i
        if (!nav.pass[q]) continue
        cnt++
        const d = Math.abs(nav.cellX(q) - mx) + Math.abs(nav.cellY(q) - my)
        if (d < bd) { bd = d; best = q }
      }
      if (cnt >= 2) { this.open[c] = 1; rep[c] = best; this.repX[c] = nav.cellX(best); this.repY[c] = nav.cellY(best); this.repZ[c] = nav.level[best] } else { this.repX[c] = mx; this.repY[c] = my; this.repZ[c] = world.ground(mx, my) }
    }
    // links: local flood over the nav cells of the two coarse cells (2 x 2 block for diagonals)
    const seen = new Int32Array(nav.n).fill(-1); const st = new Int32Array(8 * K * K); let gen = 0
    for (let cj = 0; cj < cny; cj++) for (let ci = 0; ci < cnx; ci++) {
      const c = cj * cnx + ci
      if (!this.open[c]) continue
      for (let d = 0; d < 4; d++) {                        // undirected: test half the directions
        const ni = ci + this.DI[d], nj = cj + this.DJ[d]
        if (ni < 0 || nj < 0 || ni >= cnx || nj >= cny) continue
        const q = nj * cnx + ni
        if (!this.open[q]) continue
        const i0 = Math.min(ci, ni) * K, i1 = Math.min(nav.nx, (Math.max(ci, ni) + 1) * K) - 1
        const j0 = Math.min(cj, nj) * K, j1 = Math.min(nav.ny, (Math.max(cj, nj) + 1) * K) - 1
        gen++; let sp = 0; st[sp++] = rep[c]; seen[rep[c]] = gen; let ok = false
        while (sp && !ok) {
          const a = st[--sp]; const ai = a % nav.nx, aj = (a / nav.nx) | 0
          for (let e = 0; e < 8; e++) {
            const bi = ai + this.DI[e], bj = aj + this.DJ[e]
            if (bi < i0 || bi > i1 || bj < j0 || bj > j1) continue
            const b = bj * nav.nx + bi
            if (seen[b] === gen || !nav.canStep(ai, aj, bi, bj)) continue
            if (b === rep[q]) { ok = true; break }
            seen[b] = gen; st[sp++] = b
          }
        }
        if (ok) { this.link[c] |= 1 << d; this.link[q] |= 1 << ((d + 4) & 7) }
      }
    }
    this.scratch = new Float32Array(cn)
    this.visList = new Int32Array(cn); this.visN = 0
    this.rays = 0
  }
  cellOf(x, y) {
    const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((y - this.y0) / this.cs)
    if (i < 0 || j < 0 || i >= this.cnx || j >= this.cny) return -1
    return j * this.cnx + i
  }
  newLayer() { return { m: new Float32Array(this.cn), i0: 0, i1: -1, j0: 0, j1: -1, alive: 1 } }
  clear(L) { if (L.i1 >= L.i0) for (let j = L.j0; j <= L.j1; j++) L.m.fill(0, j * this.cnx + L.i0, j * this.cnx + L.i1 + 1); L.i1 = -1; L.i0 = 0; L.j0 = 0; L.j1 = -1 }
  seedPoint(L, x, y) {
    this.clear(L)
    let c = this.cellOf(x, y); if (c < 0) return
    const i = c % this.cnx, j = (c / this.cnx) | 0
    L.m[c] = 1; L.i0 = L.i1 = i; L.j0 = L.j1 = j
  }
  seedMask(L, fn) {
    this.clear(L); let s = 0
    for (let c = 0; c < this.cn; c++) if (this.open[c] && fn(this.repX[c], this.repY[c])) { L.m[c] = 1; s++ }
    if (s) for (let c = 0; c < this.cn; c++) L.m[c] /= s
    L.i0 = 0; L.i1 = this.cnx - 1; L.j0 = 0; L.j1 = this.cny - 1
  }
  /** One diffusion sub-step: a fraction lam of every cell's mass leaves to linked neighbours (stencil weights,
   *  optionally tilted by bias(dirIndex, cell) > 0). Mass in a cell with no links stays. Grows the active box by 1. */
  diffuse(L, lam, bias) {
    if (L.i1 < L.i0) return
    const cnx = this.cnx, m = L.m, s = this.scratch, link = this.link, W = this.W, DI = this.DI, DJ = this.DJ
    const i0 = Math.max(0, L.i0 - 1), i1 = Math.min(cnx - 1, L.i1 + 1), j0 = Math.max(0, L.j0 - 1), j1 = Math.min(this.cny - 1, L.j1 + 1)
    for (let j = j0; j <= j1; j++) s.fill(0, j * cnx + i0, j * cnx + i1 + 1)
    for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) {
      const c = j * cnx + i, v = m[c]
      if (v === 0) continue
      const lk = link[c]
      if (!lk) { s[c] += v; continue }
      let sw = 0
      if (bias) { for (let d = 0; d < 8; d++) if (lk >> d & 1) sw += W[d] * bias(d, c) } else for (let d = 0; d < 8; d++) if (lk >> d & 1) sw += W[d]
      // a cell with few exits keeps proportionally more (walls slow the spread)
      const out = v * lam * Math.min(1, sw / 5), k = out / sw
      s[c] += v - out
      for (let d = 0; d < 8; d++) if (lk >> d & 1) s[c + DI[d] + DJ[d] * cnx] += k * W[d] * (bias ? bias(d, c) : 1)
    }
    let a0 = cnx, a1 = -1, b0 = this.cny, b1 = -1
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = j * cnx + i; let v = s[c]
      if (v < 1e-7) v = 0
      m[c] = v
      if (v) { if (i < a0) a0 = i; if (i > a1) a1 = i; if (j < b0) b0 = j; if (j > b1) b1 = j }
    }
    L.i0 = a0; L.i1 = a1; L.j0 = b0; L.j1 = b1
  }
  total(L) { let t = 0; if (L.i1 >= L.i0) for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) t += L.m[j * this.cnx + i]; return t }
  normalise(L) { const t = this.total(L); if (t > 0) { const k = 1 / t; for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) L.m[j * this.cnx + i] *= k } return t }
  /** Cells our sensors cover right now (protocol section 8), optionally only where maskSum > eps. One or two rays per cell. */
  computeVisible(ox, oy, eyeZ, yaw, cfg, maskSum, eps) {
    const near = cfg?.near ?? 45, range = cfg?.range ?? 200, half = cfg?.halfFov ?? Math.PI / 3, w = this.world
    const cnx = this.cnx, cs = this.cs
    const i0 = Math.max(0, Math.floor((ox - range - this.x0) / cs)), i1 = Math.min(cnx - 1, Math.floor((ox + range - this.x0) / cs))
    const j0 = Math.max(0, Math.floor((oy - range - this.y0) / cs)), j1 = Math.min(this.cny - 1, Math.floor((oy + range - this.y0) / cs))
    let n = 0
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = j * cnx + i
      if (!this.open[c] || (maskSum && maskSum[c] <= eps)) continue
      const dx = this.repX[c] - ox, dy = this.repY[c] - oy, d2 = dx * dx + dy * dy
      if (d2 > range * range) continue
      if (d2 > near * near) { let a = Math.atan2(dy, dx) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (a > half || a < -half) continue }
      this.rays++
      if (w.canSee(ox, oy, eyeZ, this.repX[c], this.repY[c], this.repZ[c] + 4.5) || (this.rays++, w.canSee(ox, oy, eyeZ, this.repX[c], this.repY[c], this.repZ[c] + 9))) this.visList[n++] = c
    }
    this.visN = n
    return n
  }
  /** Negative evidence: we looked at these cells and the mech was not listed. pd = probability we would have seen it. */
  cull(L, pd) {
    const keep = 1 - pd, m = L.m; let removed = 0
    for (let q = 0; q < this.visN; q++) { const c = this.visList[q]; const v = m[c]; if (v) { removed += v * pd; m[c] = v * keep } }
    return removed
  }
  /** Mass of the layer that agrees with a sound (bearing with Gaussian error sigma, distance class [dmin,dmax]). */
  soundLik(ox, oy, bearing, sigma, dmin, dmax, c) {
    const dx = this.repX[c] - ox, dy = this.repY[c] - oy, d = Math.hypot(dx, dy)
    if (d < dmin - this.cs || d > dmax + this.cs) return 0
    let a = Math.atan2(dy, dx) - bearing; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI
    const halfCell = Math.atan2(this.cs * 0.5, Math.max(d, this.cs))          // a cell subtends this much: widen sigma accordingly
    const s = Math.hypot(sigma, halfCell)
    return Math.exp(-0.5 * (a / s) * (a / s))
  }
  explained(L, ox, oy, bearing, sigma, dmin, dmax) {
    let e = 0
    for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const c = j * this.cnx + i, v = L.m[c]; if (v) e += v * this.soundLik(ox, oy, bearing, sigma, dmin, dmax, c) }
    return e
  }
  applySound(L, ox, oy, bearing, sigma, dmin, dmax, floor = 0.05) {
    for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const c = j * this.cnx + i, v = L.m[c]; if (v) L.m[c] = v * (floor + this.soundLik(ox, oy, bearing, sigma, dmin, dmax, c)) }
    this.normalise(L)
  }
  /** Best 120 degree wedge (10 degree steps) of sum_layers alive * mass * g(distance). Returns {yaw, covered, total}. */
  bestWedge(layers, weights, ox, oy, g) {
    const H = this._hist || (this._hist = new Float64Array(36)); H.fill(0)
    for (let l = 0; l < layers.length; l++) {
      const L = layers[l], wl = weights ? weights[l] : L.alive
      if (!wl || L.i1 < L.i0) continue
      for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) {
        const c = j * this.cnx + i, v = L.m[c]
        if (!v) continue
        const dx = this.repX[c] - ox, dy = this.repY[c] - oy
        const gg = g(Math.hypot(dx, dy)); if (!gg) continue
        let b = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 18)); if (b > 35) b = 35; if (b < 0) b = 0
        H[b] += wl * v * gg
      }
    }
    let best = -1, bi = 0, tot = 0
    for (let b = 0; b < 36; b++) tot += H[b]
    for (let b = 0; b < 36; b++) { let s = 0; for (let k = 0; k < 12; k++) s += H[(b + k) % 36]; if (s > best) { best = s; bi = b } }
    return { yaw: -Math.PI + (bi + 6) * Math.PI / 18, covered: best, total: tot }
  }
}
