// Ballistics and aiming maths. Pure functions, no allocations beyond the small result objects.
//
// Conventions (protocol section 5): x east, y north, z up, metres, seconds, radians.
// Yaw is measured from +x counter-clockwise, pitch is up-positive, and a direction vector is
// [cos(pitch)cos(yaw), cos(pitch)sin(yaw), sin(pitch)].
// Every shot leaves `muzzleOffset` metres (mech radius + 0.5) out along the aim from the muzzle point.

export const TAU = Math.PI * 2

export function wrapPi(a) {
  a = (a + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}

/** Signed smallest rotation from angle a to angle b. */
export function angDiff(a, b) {
  return wrapPi(b - a)
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * Straight-line projectile intercept (gun bullets, drone bullets).
 * Shooter muzzle at M = (mx,my,mz); target point T moving with constant velocity V; projectile speed s.
 * The projectile starts `off` metres along the firing direction, so it meets the target when
 * |T + V t - M| = s t + off. That is a quadratic in t; the smallest positive root is the answer.
 * Returns null when no intercept exists (target faster than the bullet and escaping).
 */
export function intercept(mx, my, mz, tx, ty, tz, vx, vy, vz, s, off = 0) {
  const rx = tx - mx, ry = ty - my, rz = tz - mz
  const a = vx * vx + vy * vy + vz * vz - s * s
  const b = 2 * (rx * vx + ry * vy + rz * vz - off * s)
  const c = rx * rx + ry * ry + rz * rz - off * off
  let t
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-12) return null
    t = -c / b
  } else {
    const disc = b * b - 4 * a * c
    if (disc < 0) return null
    const sq = Math.sqrt(disc)
    const t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a)
    t = Math.min(t1, t2)
    if (t <= 1e-6) t = Math.max(t1, t2)
  }
  if (!(t > 1e-6) || !Number.isFinite(t)) return null
  const px = rx + vx * t, py = ry + vy * t, pz = rz + vz * t
  const h = Math.hypot(px, py)
  return { t, yaw: Math.atan2(py, px), pitch: Math.atan2(pz, h), x: tx + vx * t, y: ty + vy * t, z: tz + vz * t, dist: Math.hypot(h, pz) }
}

/** Direct (hitscan) aim at a point: used for lasers and for looking at things. */
export function aimAt(mx, my, mz, tx, ty, tz) {
  const dx = tx - mx, dy = ty - my, dz = tz - mz
  const h = Math.hypot(dx, dy)
  return { yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, h), dist: Math.hypot(h, dz) }
}

/**
 * Mortar firing solution (low arc by default). Shell speed v, gravity g, launched from the tube point
 * (mx,my,mz) plus `off` metres along the aim. Target point T with velocity V (the horizontal part is
 * used for lead; the target is assumed to stay on its ground height).
 * Returns { yaw, pitch, t } or null when out of range.
 */
export function mortarSolve(mx, my, mz, tx, ty, tz, vx, vy, v, g, off = 0, high = false) {
  let px = tx, py = ty, pitch = 0.3, t = 0, yaw = Math.atan2(ty - my, tx - mx)
  for (let it = 0; it < 9; it++) {
    yaw = Math.atan2(py - my, px - mx)
    // launch point after the muzzle offset
    const lx = mx + Math.cos(pitch) * Math.cos(yaw) * off
    const ly = my + Math.cos(pitch) * Math.sin(yaw) * off
    const lz = mz + Math.sin(pitch) * off
    const D = Math.hypot(px - lx, py - ly)
    const h = tz - lz
    if (D < 1e-3) return null
    const v2 = v * v
    const disc = v2 * v2 - g * (g * D * D + 2 * h * v2)
    if (disc < 0) return null
    const sq = Math.sqrt(disc)
    const tanT = (v2 + (high ? sq : -sq)) / (g * D)
    pitch = Math.atan(tanT)
    const ch = v * Math.cos(pitch)
    if (ch < 1e-6) return null
    t = D / ch
    px = tx + vx * t
    py = ty + vy * t
  }
  return { yaw, pitch, t, x: px, y: py }
}

/**
 * Where does a ballistic shell land? Integrates position/velocity under gravity until it reaches the
 * ground height given by groundFn(x, y) (or time runs out). Returns { x, y, z, t }.
 */
export function shellImpact(x, y, z, vx, vy, vz, g, groundFn, maxT = 8, dt = 0.05) {
  let t = 0
  while (t < maxT) {
    const nx = x + vx * dt, ny = y + vy * dt, nvz = vz - g * dt
    const nz = z + (vz + nvz) * 0.5 * dt
    const gz = groundFn(nx, ny)
    if (nz <= gz) {
      const above0 = z - groundFn(x, y)   // height above ground before the step (>= 0)
      const below1 = gz - nz              // depth below ground after the step (>= 0)
      const f = above0 + below1 > 1e-9 ? clamp(above0 / (above0 + below1), 0, 1) : 0
      return { x: x + (nx - x) * f, y: y + (ny - y) * f, z: gz, t: t + dt * f }
    }
    x = nx; y = ny; z = nz; vz = nvz; t += dt
  }
  return { x, y, z, t }
}

/**
 * Closest approach of a straight-flying projectile (position p, velocity v) to a point q within the
 * next maxT seconds. Returns { t, d } (time of closest approach and 3D miss distance).
 */
export function closestApproach(px, py, pz, vx, vy, vz, qx, qy, qz, maxT = 3) {
  const rx = qx - px, ry = qy - py, rz = qz - pz
  const vv = vx * vx + vy * vy + vz * vz
  let t = vv > 1e-9 ? (rx * vx + ry * vy + rz * vz) / vv : 0
  t = clamp(t, 0, maxT)
  const dx = rx - vx * t, dy = ry - vy * t, dz = rz - vz * t
  return { t, d: Math.hypot(dx, dy, dz) }
}

/** Seconds the torso needs to slew from (yaw0,pitch0) to (yaw1,pitch1). */
export function slewTime(yaw0, pitch0, yaw1, pitch1, turnRate, pitchRate) {
  return Math.max(Math.abs(angDiff(yaw0, yaw1)) / Math.max(turnRate, 1e-6), Math.abs(pitch1 - pitch0) / Math.max(pitchRate, 1e-6))
}

/**
 * Is the torso pointing well enough to hit a cylinder of the given radius/height at this distance?
 * `k` < 1 keeps shots inside the body rather than at its silhouette edge.
 */
export function onTarget(curYaw, curPitch, wantYaw, wantPitch, dist, radius, height, k = 0.7) {
  const yawTol = Math.atan2(radius * k, Math.max(dist, 1))
  const pitchTol = Math.atan2(height * 0.5 * k, Math.max(dist, 1))
  return Math.abs(angDiff(curYaw, wantYaw)) <= yawTol && Math.abs(wantPitch - curPitch) <= pitchTol
}

/** Unit direction vector for yaw/pitch. Writes into out (length 3) and returns it. */
export function dirOf(yaw, pitch, out) {
  const c = Math.cos(pitch)
  out[0] = c * Math.cos(yaw); out[1] = c * Math.sin(yaw); out[2] = Math.sin(pitch)
  return out
}

/**
 * Laser damage fraction for a given charge time (protocol: min_frac at zero charge, 1 at full).
 * The scaling between is taken as linear in charge time.
 */
export function laserFrac(chargeS, fullS, minFrac) {
  return minFrac + (1 - minFrac) * clamp(chargeS / Math.max(fullS, 1e-6), 0, 1)
}

/** Small deterministic PRNG (mulberry32) so behaviour is reproducible from hello.seed. */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
