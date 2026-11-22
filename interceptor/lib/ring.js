// Bounded movement-goal selection. It never changes targets, modes or weapon triggers.
// Direct walkability is required; the existing mover owns all path following and emergency movement.
import { zoneSlack } from './senses.js'

export function makeRingPosts(B) {
  const chase = { id: -1, t: -1, best: Infinity }
  const P = B.P
  function active() {
    return P.ringInterceptor === true && B.p26on === true && B.hunt && B.hunt.firewall() &&
      B.me.t >= P.pfUnsureS && B.zone.known && B.zone.nr > P.zoneLateR && !!B.nav && !!B.world
  }
  function speed() {
    const me = B.me
    // A walking ETA is conservative about boost, including an empty energy tank.
    return Math.max(0.1, me.walk * (me.laser && me.laser.charge > 0 ? me.chargeMoveMult : 1))
  }
  function exposure(x, y) {
    const me = B.me, nav = B.nav, w = B.world, W = B.cfg.weapons
    const zz = nav.levelAt(x, y) + me.height * 0.5
    let risk = 0
    for (const tr of B.trackList) {
      if (tr.npc || tr.hp <= 0 || tr.conf < 0.3 || me.t - tr.lastSeen > 1.5) continue
      const d = Math.hypot(tr.x - x, tr.y - y)
      const range = Math.max(tr.hasGun ? W.gun.range : 0, tr.hasLaser ? W.laser.range : 0,
        tr.hasLightning ? W.lightning.range : 0, tr.hasMortar ? P.mortarMaxR : 0)
      if (d > range || !w.shotClear(tr.x, tr.y, tr.z + tr.muzzleH, x, y, zz)) continue
      const toward = Math.atan2(y - tr.y, x - tr.x)
      const facing = Math.cos(toward - tr.yaw) > 0.75
      risk += (facing ? 1 : 0.35) + (tr.charging && facing ? 1 : 0) +
        (tr.hasLightning && d <= W.lightning.range + me.radius ? 2 : 0)
    }
    return risk
  }
  function candidate(x, y, dwell = 2) {
    const me = B.me, z = B.zone, nav = B.nav, bd = B.world.bounds
    const pad = me.radius + 2, am = B.arenaMargin + pad
    if (!Number.isFinite(x + y) || x <= bd.minX + am || x >= bd.maxX - am ||
      y <= bd.minY + am || y >= bd.maxY - am) return null
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me.x, me.y) ||
      !nav.walkLine(me.x, me.y, x, y)) return null
    const d = Math.hypot(x - me.x, y - me.y), eta = d / speed() + 0.5
    if (Math.hypot(x - z.nx, y - z.ny) > z.nr - pad) return null
    // Navigation is static. Do not call a straight route clear when an observed body
    // already occupies it; future enemy movement remains uncertain.
    const dx = x - me.x, dy = y - me.y, dd = dx * dx + dy * dy
    for (const tr of B.trackList) {
      if (!tr.listed || tr.hp <= 0) continue
      const u = dd > 0 ? Math.max(0, Math.min(1, ((tr.x - me.x) * dx + (tr.y - me.y) * dy) / dd)) : 0
      if (Math.hypot(tr.x - me.x - u * dx, tr.y - me.y - u * dy) < me.radius + tr.radius + 1) return null
    }
    let risk = 0
    // Three timed route samples, plus dwell at the endpoint. This is a conservative
    // geometric admission, not a prediction of unseen projectiles or enemy movement.
    for (const u of [0, 0.5, 1]) {
      const px = me.x + (x - me.x) * u, py = me.y + (y - me.y) * u
      if (zoneSlack(B, px, py, me.t + eta * u) < pad) return null
      risk += exposure(px, py) / 3
    }
    // The circle changes its interpolation slope at these two instants. An
    // early shrink end can burn the route even when the midpoint is safe later.
    for (const when of [z.t0, z.t1]) {
      const u = (when - me.t) / eta
      if (u > 0 && u < 1 && zoneSlack(B, me.x + dx * u, me.y + dy * u, when) < pad) return null
    }
    if (zoneSlack(B, x, y, me.t + eta + dwell) < pad) return null
    return { x, y, eta, distance: d, risk, cost: eta * (1 + risk) + dwell * exposure(x, y) }
  }
  function rotate(base) {
    if (!active()) return null
    const me = B.me, z = B.zone
    const original = candidate(base.x, base.y)
    // If we cannot validate the existing route, leave its A*/pocket logic in charge.
    if (!original || original.distance < 8) return null
    let best = original
    const angle = Math.atan2(me.y - z.ny, me.x - z.nx)
    for (const da of [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3]) {
      const r = Math.min(z.nr - me.radius - 3, z.nr * 0.5)
      const p = candidate(z.nx + r * Math.cos(angle + da), z.ny + r * Math.sin(angle + da))
      if (p && p.distance <= original.distance * 1.35 + 8 && p.cost + 0.5 < best.cost) best = p
    }
    if (best === original) return null
    B.counters.ringRotations = (B.counters.ringRotations || 0) + 1
    return best
  }
  function intercept(tr, hold, lo = hold - P.pfDrift, hi = hold + P.pfDrift) {
    if (!active() || !tr || tr.npc || tr.hp <= 0 || !tr.listed || B.me.t - tr.lastSeen > 0.25 ||
      !(hold > 0) || B.zoneUrgent || (B.p26 && B.p26.finishing)) {
      chase.id = -1; return null
    }
    const me = B.me, z = B.zone
    if (chase.id !== tr.id || tr.dist < chase.best - 5) {
      chase.id = tr.id; chase.t = me.t; chase.best = tr.dist
    }
    const outside = Math.hypot(tr.x - z.nx, tr.y - z.ny) > z.nr - me.radius - 2
    const stalled = tr.dist > hold + P.pfDrift && me.t - chase.t >= 3
    if (!outside && !stalled) return null
    // Do not extrapolate a distant enemy all the way to a guessed future ring crossing.
    const horizon = Math.min(2, Math.max(0, tr.dist - hold) / speed())
    const tx = tr.x + tr.vx * horizon, ty = tr.y + tr.vy * horizon
    const a = Math.atan2(z.ny - ty, z.nx - tx)
    // Stay inside the same next-ring threshold that the existing zone owner uses;
    // otherwise a valid post would immediately trigger a conflicting return-to-zone move.
    const inner = P.zoneNextFrac * z.nr - me.radius - 2
    const stand = Math.max(hold, Math.hypot(tx - z.nx, ty - z.ny) - inner)
    let best = null
    for (const da of [0, -Math.PI / 6, Math.PI / 6]) {
      const p = candidate(tx + stand * Math.cos(a + da), ty + stand * Math.sin(a + da), 3)
      if (!p || p.distance > Math.max(60, hold) || p.eta > 8) continue
      if (Math.hypot(p.x - z.nx, p.y - z.ny) > inner + 1e-6) continue
      const r = Math.hypot(p.x - tr.x, p.y - tr.y)
      const minimum = Math.max(lo, tr.hasLightning && !me.lightning ? P.pfLightKeep : 0)
      if (r < minimum - 1e-6 || r > hi + 1e-6) continue
      const dz = tr.z + tr.height * 0.5 - B.nav.levelAt(p.x, p.y) - me.muzzleH
      const range = Math.hypot(r, dz), pitch = Math.atan2(dz, r)
      if (pitch < me.minPitch || pitch > me.maxPitch) continue
      const useful = (me.gun && range <= me.gun.range * P.gunRangeFrac) ||
        (me.laser && range <= me.laser.range * P.laserRangeFrac) ||
        (me.lightning && me.energy >= me.lightning.energy + P.lightMinEnergy && range <= me.lightning.range * P.lightRangeFrac)
      if (!useful) continue
      // The post needs a fresh physical line, independently of cached tr.losOut.
      if (!B.world.shotClear(p.x, p.y, B.nav.levelAt(p.x, p.y) + me.muzzleH,
        tr.x, tr.y, tr.z + tr.height * 0.5)) continue
      const cost = p.cost + Math.abs(r - hold) / speed()
      if (!best || cost < best.cost) best = { ...p, cost, reason: outside ? 'ring-entry' : 'stalled-chase' }
    }
    if (!best) return null
    B.counters.ringIntercepts = (B.counters.ringIntercepts || 0) + 1
    return best
  }
  return { active, candidate, rotate, intercept, chase }
}
