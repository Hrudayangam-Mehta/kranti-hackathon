// Body movement for the dev simulator: an upright cylinder walking, sliding, stepping, jumping and jetting
// over the map of bot/lib/world.js (terrain + prisms). Implements protocol section 7 "Movement":
//   walls stop the part of a move that goes into them (slide), ledges up to step_up are walked up, slopes
//   steeper than max_slope_deg cannot be walked up, overhangs that clear the head are walked under and stop a
//   jet, an eave over part of the body stops a jet and the body is slid out (0.6 m per tick), a body coming
//   down past a roof edge lands on the edge and is slid off (0.6 m per tick) unless it walks onto the roof.
// Geometry queries (ground, surfaceZ, ray casts) come from World; this file only adds what a moving cylinder
// needs on top of it: the push-out vector against walls and footprint (not centre point) overlap tests.

const CELL = 16
const SLIDE = 0.6          // metres per tick a body is slid out from under an eave / off a roof edge

export class Collider {
  constructor(world) {
    this.world = world
    this.P = world.prisms
    const b = world.bounds
    this.b = b
    this.x0 = b.minX - CELL; this.y0 = b.minY - CELL
    this.nx = Math.ceil((b.maxX - b.minX) / CELL) + 3
    this.ny = Math.ceil((b.maxY - b.minY) / CELL) + 3
    const lists = Array.from({ length: this.nx * this.ny }, () => [])
    for (let k = 0; k < this.P.length; k++) {
      const p = this.P[k]
      const i0 = Math.max(0, Math.floor((p.minX - this.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((p.maxX - this.x0) / CELL))
      const j0 = Math.max(0, Math.floor((p.minY - this.y0) / CELL)), j1 = Math.min(this.ny - 1, Math.floor((p.maxY - this.y0) / CELL))
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) lists[j * this.nx + i].push(k)
    }
    this.cells = lists.map((l) => Int32Array.from(l))
    this.stamp = new Uint32Array(this.P.length)
    this.gen = 0
    // scratch outputs
    this.nX = 0; this.nY = 0          // push-out direction of wallPen
    this.qx = 0; this.qy = 0; this.qd = 0; this.qIn = false   // nearest footprint point / distance / centre inside
    this.sx = 0; this.sy = 0; this.sIn = false                // support / ceiling prism contact point
  }

  /** Nearest point on the prism footprint boundary to (x,y): sets qx,qy,qd and qIn (centre inside footprint). */
  _contact(p, x, y) {
    const E = p.edges
    let best = Infinity, bx = x, by = y, inside = false
    for (let e = 0; e < E.length; e += 4) {
      const x0 = E[e], y0 = E[e + 1], x1 = E[e + 2], y1 = E[e + 3]
      if ((y0 > y) !== (y1 > y) && x < (x1 - x0) * (y - y0) / (y1 - y0) + x0) inside = !inside
      const ex = x1 - x0, ey = y1 - y0, l2 = ex * ex + ey * ey
      let u = l2 > 1e-12 ? ((x - x0) * ex + (y - y0) * ey) / l2 : 0
      if (u < 0) u = 0; else if (u > 1) u = 1
      const px = x0 + ex * u, py = y0 + ey * u
      const d2 = (px - x) * (px - x) + (py - y) * (py - y)
      if (d2 < best) { best = d2; bx = px; by = py }
    }
    this.qx = bx; this.qy = by; this.qd = Math.sqrt(best); this.qIn = inside
  }

  /**
   * Deepest overlap of the cylinder (feet z, radius r, height h) with a wall: a prism whose top is more than
   * stepUp above the feet and whose underside is below the head, or the map edge. Returns the depth in metres
   * (0 = free) and leaves the unit push-out direction in nX,nY.
   */
  wallPen(x, y, z, r, h, stepUp) {
    let depth = 0, nx = 0, ny = 0
    const b = this.b
    let d = b.minX + r - x; if (d > depth) { depth = d; nx = 1; ny = 0 }
    d = x + r - b.maxX; if (d > depth) { depth = d; nx = -1; ny = 0 }
    d = b.minY + r - y; if (d > depth) { depth = d; nx = 0; ny = 1 }
    d = y + r - b.maxY; if (d > depth) { depth = d; nx = 0; ny = -1 }
    const zLo = z + stepUp, zHi = z + h
    const i0 = Math.max(0, Math.floor((x - r - this.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((x + r - this.x0) / CELL))
    const j0 = Math.max(0, Math.floor((y - r - this.y0) / CELL)), j1 = Math.min(this.ny - 1, Math.floor((y + r - this.y0) / CELL))
    const gen = ++this.gen, st = this.stamp, P = this.P
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const L = this.cells[j * this.nx + i]
        for (let q = 0; q < L.length; q++) {
          const k = L[q]
          if (st[k] === gen) continue
          st[k] = gen
          const p = P[k]
          if (p.top <= zLo || p.base >= zHi) continue
          if (x + r < p.minX || x - r > p.maxX || y + r < p.minY || y - r > p.maxY) continue
          this._contact(p, x, y)
          if (this.qIn) {
            const dd = this.qd + r
            if (dd > depth) {
              depth = dd
              if (this.qd > 1e-9) { nx = (this.qx - x) / this.qd; ny = (this.qy - y) / this.qd } else { nx = 1; ny = 0 }
            }
          } else if (this.qd < r) {
            const dd = r - this.qd
            if (dd > depth) {
              depth = dd
              if (this.qd > 1e-9) { nx = (x - this.qx) / this.qd; ny = (y - this.qy) / this.qd } else { nx = 1; ny = 0 }
            }
          }
        }
      }
    }
    this.nX = nx; this.nY = ny
    return depth
  }

  /**
   * Footprint scan. mode 0: lowest prism underside in [zLo, zHi) that the circle overlaps (ceiling for a jet);
   * mode 1: highest prism top in [zLo, zHi] that the circle overlaps (roof edge under a falling body).
   * Returns the height (Infinity / -Infinity when none) and leaves the contact point in sx,sy and sIn.
   */
  footprint(x, y, r, zLo, zHi, mode) {
    let best = mode === 0 ? Infinity : -Infinity
    const i0 = Math.max(0, Math.floor((x - r - this.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((x + r - this.x0) / CELL))
    const j0 = Math.max(0, Math.floor((y - r - this.y0) / CELL)), j1 = Math.min(this.ny - 1, Math.floor((y + r - this.y0) / CELL))
    const gen = ++this.gen, st = this.stamp, P = this.P
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const L = this.cells[j * this.nx + i]
        for (let q = 0; q < L.length; q++) {
          const k = L[q]
          if (st[k] === gen) continue
          st[k] = gen
          const p = P[k]
          const v = mode === 0 ? p.base : p.top
          if (v < zLo || v > zHi) continue
          if (mode === 0 ? v >= best : v <= best) continue
          if (x + r < p.minX || x - r > p.maxX || y + r < p.minY || y - r > p.maxY) continue
          this._contact(p, x, y)
          if (this.qIn || this.qd < r - 0.02) { best = v; this.sx = this.qx; this.sy = this.qy; this.sIn = this.qIn }
        }
      }
    }
    return best
  }
}

/**
 * Advance one body by one tick. m: {x,y,z,vx,vy,vz,grounded,radius,height}. (wantX,wantY) is the commanded
 * move direction (only used to decide whether a body perched on a roof edge is walking onto the roof).
 * Velocity must already hold this tick's value (acceleration, jump, jet and gravity are applied by the caller).
 * Returns true when a wall, slope or ceiling changed the motion.
 */
export function moveBody(col, m, dt, wantX, wantY, stepUp, slopeTan) {
  const w = col.world, r = m.radius, h = m.height
  const ox = m.x, oy = m.y
  let x = ox, y = oy, z = m.z
  let dx = m.vx * dt, dy = m.vy * dt
  let hit = false

  if (dx !== 0 || dy !== 0) {
    if (m.grounded && z - w.ground(x, y) < 0.06) {
      // slope limit: the terrain rise over +-1 m along the direction of travel
      const dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl
      if ((w.ground(x + ux, y + uy) - w.ground(x - ux, y - uy)) * 0.5 > slopeTan) {
        const gx = (w.ground(x + 1, y) - w.ground(x - 1, y)) * 0.5, gy = (w.ground(x, y + 1) - w.ground(x, y - 1)) * 0.5
        const g2 = gx * gx + gy * gy
        if (g2 > 1e-9) { const k = (dx * gx + dy * gy) / g2; if (k > 0) { dx -= k * gx; dy -= k * gy } }
        const d2 = Math.hypot(dx, dy)
        if (d2 > 1e-6) {
          const vx = dx / d2, vy = dy / d2
          if ((w.ground(x + vx, y + vy) - w.ground(x - vx, y - vy)) * 0.5 > slopeTan) { dx = 0; dy = 0 }
        } else { dx = 0; dy = 0 }
        hit = true
      }
    }
    const len = Math.hypot(dx, dy)
    if (len > 0) {
      const n = Math.max(1, Math.ceil(len / (r * 0.4)))
      const sx = dx / n, sy = dy / n
      for (let s = 0; s < n; s++) {
        const px = x, py = y
        x += sx; y += sy
        let free = false
        for (let it = 0; it < 4; it++) {
          const d = col.wallPen(x, y, z, r, h, stepUp)
          if (d <= 1e-4) { free = true; break }
          x += col.nX * (d + 0.001); y += col.nY * (d + 0.001)
          hit = true
        }
        if (!free && col.wallPen(x, y, z, r, h, stepUp) > 1e-4) { x = px; y = py; break }
        if (w.ground(x, y) > z + stepUp) { x = px; y = py; hit = true; break }   // hillside taller than a step
      }
    }
  }

  if (m.grounded) {
    const s = w.surfaceZ(x, y, z + stepUp)
    if (s > z + 1e-6) {
      // step up, unless the head would go into an overhang there
      if (col.wallPen(x, y, s, r, h, stepUp) > 0.01 || w.ceilingZ(x, y, s + 0.02) < s + h) { x = ox; y = oy; hit = true } else z = s
    } else {
      const drop = z - s
      if (drop <= 0.3 + Math.hypot(x - ox, y - oy) * 1.4) z = s
      else {
        const top = col.footprint(x, y, r, z - 0.05, z + 0.05, 1)
        if (top > -Infinity && !col.sIn) {
          // perched on a roof edge: walk on, or be slid off
          const tx = col.sx - x, ty = col.sy - y, tl = Math.hypot(tx, ty) || 1
          if ((wantX * tx + wantY * ty) / tl <= 0.1) {
            const sl = Math.min(SLIDE, r - tl + 0.03)
            const nx = x - tx / tl * sl, ny = y - ty / tl * sl
            if (col.wallPen(nx, ny, z, r, h, stepUp) <= 1e-4 && w.ground(nx, ny) <= z + stepUp) { x = nx; y = ny }
          }
          z = top
        } else { m.grounded = false; m.vz = 0 }
      }
    }
  } else {
    let nz = z + m.vz * dt
    const s = w.surfaceZ(x, y, z + stepUp)
    if (m.vz > 0) {
      const c = col.footprint(x, y, r, z + h - 0.01, nz + h + 0.01, 0)
      if (nz + h > c) {
        nz = Math.max(z, c - h); m.vz = 0; hit = true
        if (!col.sIn) {
          const tx = col.sx - x, ty = col.sy - y, tl = Math.hypot(tx, ty) || 1
          const sl = Math.min(SLIDE, r - tl + 0.03)
          const nx = x - tx / tl * sl, ny = y - ty / tl * sl
          if (col.wallPen(nx, ny, nz, r, h, stepUp) <= 1e-4 && w.ground(nx, ny) <= nz + stepUp) { x = nx; y = ny }
        }
      }
      z = nz < s ? s : nz
    } else if (nz <= s) {
      z = s; m.grounded = true; m.vz = 0
    } else {
      const top = col.footprint(x, y, r, nz, z + 0.01, 1)
      if (top > s) { z = top; m.grounded = true; m.vz = 0 } else z = nz
    }
  }

  if (hit) { m.vx = (x - ox) / dt; m.vy = (y - oy) / dt }
  m.x = x; m.y = y; m.z = z
  return hit
}

/** Entry fraction in [0,1] of the segment p -> p+d into an upright cylinder (axis cx,cy, z0..z1, radius R), or -1. */
export function segCylinder(px, py, pz, dx, dy, dz, cx, cy, z0, z1, R) {
  const fx = px - cx, fy = py - cy
  const a = dx * dx + dy * dy, c = fx * fx + fy * fy - R * R
  let t0, t1
  if (a < 1e-12) { if (c > 0) return -1; t0 = 0; t1 = 1 } else {
    const b = fx * dx + fy * dy, disc = b * b - a * c
    if (disc < 0) return -1
    const s = Math.sqrt(disc)
    t0 = (-b - s) / a; t1 = (-b + s) / a
  }
  let u0 = -Infinity, u1 = Infinity
  if (Math.abs(dz) < 1e-12) { if (pz < z0 || pz > z1) return -1 } else {
    u0 = (z0 - pz) / dz; u1 = (z1 - pz) / dz
    if (u0 > u1) { const q = u0; u0 = u1; u1 = q }
  }
  const lo = Math.max(t0, u0, 0), hi = Math.min(t1, u1, 1)
  return lo <= hi ? lo : -1
}
