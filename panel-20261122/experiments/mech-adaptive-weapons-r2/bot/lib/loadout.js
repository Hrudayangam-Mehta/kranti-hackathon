// Contextual equipment choices use the tactical owner's one readiness model.
// This module never owns movement, targets, fire or authoritative inventory.
import { angDiff, clamp } from './aim.js'

const num = (x, d = 0) => Number.isFinite(x) ? x : d

export function makeLoadout(B) {
  const upgrades = Array.isArray(B.cfg.upgrades) ? B.cfg.upgrades : []
  const pending = new Map()
  let signature = '', changedAt = -99
  const active = () => B.p26on === true && B.P.adaptiveEquipment === true && typeof B.prof?.readyDamage === 'function' && B.hunt?.firewall() === true
  const target = () => B.target && B.target.listed && !B.target.phantom && B.target.hp > 0 ? B.target : null
  const horizon = () => Math.max(0.5, Math.min(4, num(B.cfg.match.duration_s, 480) - B.me.t))

  function normalize(kind, st, held = null) {
    const base = B.cfg.weapons[kind] || {}, n = (k, d) => Math.max(0, num(st[k], num(base[k], d)))
    const w = { ...(held || {}), kind, st, damage: n('damage', 0), range: n('range', 0), cd: Math.max(0.01, n('cooldown', 1)),
      cooldown: held ? held.cooldown : Math.max(n('cooldown', 1), num(B.cfg.loot.equip_s, 1)),
      charge: held ? held.charge : 0, reload: held ? held.reload : 0 }
    if (kind === 'gun') Object.assign(w, { mag: n('mag', 12), ammo: held ? held.ammo : 0, reloadS: n('reload', 2.4), speed: n('speed', 252), spread: n('spread_deg', 0.6) * Math.PI / 180 })
    if (kind === 'gun' && !held) w.reload = w.cooldown + w.reloadS
    if (kind === 'laser') Object.assign(w, { full: Math.max(0.01, n('charge', 0.75)), minFrac: n('min_frac', 0.35), cookoff: n('cookoff', 0.6) })
    if (kind === 'lightning') Object.assign(w, { energy: n('energy', 3), cone: n('cone_deg', 30) * Math.PI / 180 })
    if (kind === 'mortar') Object.assign(w, { speed: n('speed', 72), gravity: n('gravity', 22), splashR: n('splash_radius', 7) })
    return w
  }

  function prospective(kind) {
    const st = { ...(B.cfg.weapons[kind] || {}) }
    const ids = Array.isArray(B.me.upgradeIds) ? B.me.upgradeIds : []
    for (const id of ids) {
      const u = upgrades.find((u) => u && u.id === id)
      if (!u) continue
      for (const e of Array.isArray(u.effects) ? u.effects : []) {
        const prefix = 'weapons.' + kind + '.'
        if (typeof e.path !== 'string' || !e.path.startsWith(prefix)) continue
        const key = e.path.slice(prefix.length)
        if (key.includes('.') || !Number.isFinite(st[key])) continue
        st[key] = st[key] * num(e.mul, 1) + num(e.add, 0)
      }
    }
    return normalize(kind, st)
  }

  function damage(w, tr, seconds = horizon()) {
    if (!w || !tr || !active()) return 0
    return Math.max(0, num(B.prof.readyDamage(w, Math.hypot(tr.x - B.me.x, tr.y - B.me.y), tr, seconds)))
  }

  function pickup(kind, fallback) {
    if (!active() || !['gun', 'laser', 'lightning', 'mortar'].includes(kind)) return fallback
    const me = B.me, sig = me.weapons.map(w => w?.kind || '-').join(':')
    if (signature !== sig) { if (signature) changedAt = me.t; signature = sig; pending.clear() }
    if (me.weapons.some(w => w?.kind === kind)) return null
    const tr = target()
    if (me.weapons.some(w => !w)) return fallback
    if (me.t - changedAt < 4) return null
    if (!tr) return fallback
    if (B.zoneUrgent || B.losing || B.mustDisengage || B.holdFire) { pending.delete(kind); return null }
    const next = prospective(kind), gain = damage(next, tr)
    // A future pickup is worth the equip/reload downtime only with a clear
    // advantage. Unsupported immediate mortar damage remains zero; do not
    // invent a lethal shot to justify a swap.
    let slot = -1, advantage = 0
    for (let i = 0; i < me.weapons.length; i++) {
      const w = me.weapons[i]
      if (!w || (w.kind === 'laser' && w.charge > 0)) continue
      const delta = gain - 1.2 * damage(w, tr) - Math.max(1, num(B.cfg.weapons.gun.damage, 45))
      if (delta > advantage) { advantage = delta; slot = i }
    }
    if (slot < 0) { pending.delete(kind); return null }
    let p = pending.get(kind)
    if (!p || p.target !== tr.id || p.slot !== slot || me.t - p.last > 0.3) p = { target: tr.id, slot, since: me.t, last: me.t }
    p.last = me.t; pending.set(kind, p)
    return me.t - p.since >= 0.2 - 1e-6 ? { drop: slot } : null
  }

  function utility(upgrade, tr, seconds) {
    const me = B.me, current = me.weapons.map(w => w ? { ...w.st } : null), stats = { ...B.cfg.mech, ...(me.stats || {}) }
    const nextStats = { ...stats }
    let known = false
    for (const e of Array.isArray(upgrade?.effects) ? upgrade.effects : []) {
      if (!e || typeof e.path !== 'string') continue
      const p = e.path.split('.')
      if (p.length === 2 && p[0] === 'mech' && Number.isFinite(nextStats[p[1]])) {
        nextStats[p[1]] = nextStats[p[1]] * num(e.mul, 1) + num(e.add, 0); known = true
      } else if (p.length === 3 && p[0] === 'weapons') {
        for (let i = 0; i < me.weapons.length; i++) if (me.weapons[i]?.kind === p[1] && Number.isFinite(current[i][p[2]])) {
          current[i][p[2]] = current[i][p[2]] * num(e.mul, 1) + num(e.add, 0); known = true
        }
      }
    }
    if (!known) return null
    let before = 0, after = 0
    if (tr) for (let i = 0; i < me.weapons.length; i++) {
      const w = me.weapons[i]
      if (!w) continue
      before += damage(w, tr, seconds)
      after += damage(normalize(w.kind, current[i], w), tr, seconds)
    }
    const outgoing = clamp((after - before) / Math.max(before, num(B.cfg.weapons.gun.damage, 45), 1), 0, 1)
    const armor = clamp(num(stats.armor), 0, 0.95), armorNext = clamp(num(nextStats.armor), 0, 0.95)
    const health = Math.max(1, num(stats.hp, me.maxHp)), healthNext = Math.max(1, num(nextStats.hp, health))
    const durability = healthNext / health * (1 - armor) / (1 - armorNext) - 1
    const quiet = !B.zoneUrgent && me.inZone && B.p26?.hot === 0 && me.t - me.lastHurtT > 1
    const missing = Math.max(0, me.maxHp - me.hp)
    const healing = (st) => Math.min(missing, Math.max(0, seconds - Math.max(0, num(st.regen_delay, me.regenDelay) - (me.t - Math.max(me.lastHurtT, me.lastDealtT)))) * num(st.regen_per_s, me.regenPerS))
    const recovery = quiet ? Math.max(0, healing(nextStats) - healing(stats)) / me.maxHp : 0
    const move = B.hasGoal ? Math.hypot(B.goalX - me.x, B.goalY - me.y) / Math.max(1, me.walk) : 0
    const travelShare = move / Math.max(0.01, move + seconds)
    const mobility = travelShare * Math.max(0, 1 - num(stats.walk_speed, me.walk) / Math.max(1, num(nextStats.walk_speed, me.walk)))
    const turn = tr ? Math.abs(angDiff(me.yaw, tr.bearing)) : 0
    const aim = Math.max(0, Math.min(seconds, turn / Math.max(0.1, num(stats.turn_rate, me.turnRate))) - Math.min(seconds, turn / Math.max(0.1, num(nextStats.turn_rate, me.turnRate)))) / seconds
    return (1 + outgoing) * (1 + Math.max(0, durability) + recovery) - 1 + mobility + aim
  }

  function pick(choices, fallback) {
    if (!active()) return fallback
    const tr = target(), seconds = horizon()
    let best = fallback, bestValue = -1
    for (let i = 0; i < Math.min(3, choices.length); i++) {
      const id = choices[i]?.id, u = upgrades.find(u => u?.id === id)
      const score = utility(u, tr, seconds)
      // Missing/no measured effect keeps the existing order. Utility ties do
      // not invent a preference from the display order of offered choices.
      if (score !== null && (score > bestValue + 1e-6 || (Math.abs(score - bestValue) <= 1e-6 && i === fallback))) { bestValue = score; best = i }
    }
    return bestValue > 1e-6 ? best : fallback
  }

  return { pickup, pick, prospective, utility, damage }
}
