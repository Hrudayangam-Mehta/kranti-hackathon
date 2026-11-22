export function mortarArcClear(world, x, y, z, yaw, pitch, speed, gravity, offset, flight, ttl) {
  const total = x + y + z + yaw + pitch + speed + gravity + offset + flight + ttl
  if (!Number.isFinite(total) || speed <= 0 || gravity <= 0 || offset < 0 || flight <= 0 || ttl <= 0 || flight > ttl) return false
  const c = Math.cos(pitch), ux = c * Math.cos(yaw), uy = c * Math.sin(yaw), uz = Math.sin(pitch)
  const vx = speed * ux, vy = speed * uy, vz = speed * uz
  const end = Math.max(0, flight - 1e-6)
  const maxSpeed = Math.max(speed, Math.hypot(vx, vy, vz - gravity * end))
  const n = Math.max(1, Math.ceil(end / 0.15), Math.ceil(end * maxSpeed / 12), Math.ceil(end / Math.sqrt(0.64 / gravity)))
  if (n > 64) return false
  if (!world) return true
  const ox = x + offset * ux, oy = y + offset * uy, oz = z + offset * uz
  if (!world.shotClear(x, y, z, ox, oy, oz)) return false
  let px = ox, py = oy, pz = oz
  for (let i = 1; i <= n; i++) {
    const t = end * i / n
    const qx = ox + vx * t, qy = oy + vy * t, qz = oz + vz * t - 0.5 * gravity * t * t
    if (!world.shotClear(px, py, pz, qx, qy, qz)) return false
    px = qx; py = qy; pz = qz
  }
  return true
}

export function mortarSelfClear(x, y, vx, vy, impactX, impactY, time, splash, radius, margin) {
  const total = x + y + vx + vy + impactX + impactY + time + splash + radius + margin
  if (!Number.isFinite(total) || time < 0 || splash < 0 || radius < 0 || margin < 0) return false
  const safe = splash + radius + margin
  return Math.hypot(impactX - x, impactY - y) > safe &&
    Math.hypot(impactX - (x + vx * time), impactY - (y + vy * time)) > safe
}
