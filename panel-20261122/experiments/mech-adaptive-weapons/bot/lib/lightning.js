import { angDiff } from './aim.js'

// Test physical recipients before tactical legality: an unwanted nearer crate
// or drone still takes the arc. The wider blocker cone is conservative at the
// undocumented boundary; only the narrower aim cone admits a shot.
export function lightningRecipient(B, yaw, pitch, position) {
  const me = B.me, li = me.lightning
  if (!li) return null
  const off = me.radius + 0.5, c = Math.cos(pitch)
  const x = position.x + off * c * Math.cos(yaw), y = position.y + off * c * Math.sin(yaw), z = position.z + me.muzzleH + off * Math.sin(pitch)
  if (B.world && !B.world.shotClear(position.x, position.y, position.z + me.muzzleH, x, y, z)) return null
  let first = null, nearest = li.range
  const consider = (o, height, crate) => {
    const d = Math.hypot(o.x - x, o.y - y, o.z + height * 0.5 - z)
    const a = Math.abs(angDiff(yaw, Math.atan2(o.y - y, o.x - x)))
    if (d > nearest + 1e-6 || a > Math.min(Math.PI, li.cone)) return
    if (B.world && !B.world.shotClear(x, y, z, o.x, o.y, o.z + height * 0.5)) return
    if (first && Math.abs(d - nearest) <= 1e-6 && first.object.id !== o.id) first.ambiguous = true
    else if (!first || d < nearest) { nearest = d; first = { object: o, crate, distance: d, angle: a, ambiguous: false } }
  }
  for (const tr of B.trackList) if (tr.listed && !tr.phantom && tr.hp > 0) consider(tr, tr.height, false)
  for (const cr of B.crates.values()) if (me.t - cr.seen <= 0.5 && cr.hp !== 0) consider(cr, B.cfg.crates.height || 2.4, true)
  return first
}

export function lightningEnergy(B) {
  const me = B.me, li = me.lightning
  if (!li) return false
  const window = B.P.tickS * Math.max(1, B.cfg.match.decide_every || 2)
  const pulses = Math.max(1, Math.ceil(window / Math.max(0.01, li.cd)))
  const stats = me.stats || B.cfg.mech
  const drain = me.grounded ? stats.boost_drain ?? B.cfg.mech.boost_drain ?? 17 : stats.jet_drain ?? B.cfg.mech.jet_drain ?? 15
  const move = B.cmd.boost ? Math.max(0, drain) * window : 0
  const reserve = Math.max(B.killSecure ? B.P.lightMinEnergy : B.P.lightReserve, B.zoneUrgent ? B.P.boostReserve : 0)
  return me.energy - pulses * li.energy - move >= reserve
}
