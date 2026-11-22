// One bounded equipment comparison. It owns only offered pick / replacement
// recommendations; observed inventory, targets, modes and firing stay elsewhere.
import { angDiff, clamp, intercept } from './aim.js'
import { equipmentContext, equipmentRouteTiming } from './meta_context.js'

const n = (x, d = 0) => Number.isFinite(x) ? x : d
const KINDS = new Set(['gun', 'laser', 'lightning'])
const ROLES = new Set(['harvester', 'quartermaster', 'reaper', 'lancer', 'interceptor', 'endgame'])
const SUPPORTED = new Set([
  'mech.hp', 'mech.armor', 'mech.walk_speed', 'mech.boost_speed', 'mech.energy', 'mech.energy_regen', 'mech.boost_drain',
  'mech.regen_per_s', 'mech.regen_delay', 'mech.turn_rate', 'mech.pitch_rate',
  'weapons.gun.damage', 'weapons.gun.cooldown', 'weapons.gun.speed', 'weapons.gun.range', 'weapons.gun.mag', 'weapons.gun.reload',
  'weapons.laser.damage', 'weapons.laser.charge', 'weapons.lightning.damage', 'weapons.lightning.energy',
])

export function makeEquipmentMeta(B) {
  const P = B.P, cfg = B.cfg, index = new Map(), pending = new Map()
  const state = { role: P.equipmentRole, pick: null, pickup: null }
  B.equipmentMetaState = state
  let signature = '', changedAt = -99
  const enabled = () => P.equipmentMeta === true && ROLES.has(P.equipmentRole)
  const defs = Array.isArray(cfg.upgrades) ? cfg.upgrades : []
  if (defs.length <= 64) for (const u of defs) if (u && typeof u.id === 'string') index.set(u.id, index.has(u.id) ? null : u)
  const context = () => enabled() ? equipmentContext(B) : null // fresh per comparison; never cached across stages

  function normalized(kind, st, held = null) {
    const base = cfg.weapons[kind] || {}, get = (k, d) => Math.max(0, n(st[k], n(base[k], d)))
    const w = { ...(held || {}), kind, st: { ...st }, damage: get('damage', 0), range: get('range', 0), cd: Math.max(.01, get('cooldown', 1)),
      cooldown: held ? held.cooldown : Math.max(get('cooldown', 1), n(cfg.loot.equip_s, 1)), charge: held ? held.charge : 0, reload: held ? held.reload : 0 }
    if (kind === 'gun') {
      Object.assign(w, { mag: Math.max(1, Math.floor(get('mag', 12))), ammo: held ? held.ammo : 0, reloadS: get('reload', 2.4), speed: get('speed', 252) })
      if (!held) w.reload = w.cooldown + w.reloadS // unknown dropped magazine is never a free refill
    }
    if (kind === 'laser') Object.assign(w, { full: Math.max(.01, get('charge', .75)), cookoff: get('cookoff', .6) })
    if (kind === 'lightning') Object.assign(w, { energy: get('energy', 3), cone: get('cone_deg', 30) * Math.PI / 180 })
    return w
  }
  function snapshot() {
    const me = B.me
    return { stats: { ...cfg.mech, ...(me.stats || {}) }, weapons: me.weapons.map(w => w ? normalized(w.kind, w.st, w) : null),
      hp: me.hp, maxHp: me.maxHp, energy: me.energy, maxEnergy: me.maxEnergy }
  }
  function descriptor(id) {
    const u = index.get(id)
    if (!u || !Array.isArray(u.effects) || !u.effects.length || u.effects.length > 8) return null
    for (const e of u.effects) if (!e || typeof e.path !== 'string' || !SUPPORTED.has(e.path) ||
      (e.mul !== undefined && !Number.isFinite(e.mul)) || (e.add !== undefined && !Number.isFinite(e.add)) || (e.mul === undefined && e.add === undefined)) return null
    return u
  }
  function project(base, u) {
    const s = { ...base, stats: { ...base.stats }, weapons: base.weapons.map(w => w ? { ...w, st: { ...w.st } } : null) }
    for (const e of u.effects) {
      const p = e.path.split('.'), value = x => x * n(e.mul, 1) + n(e.add)
      if (p[0] === 'mech') {
        if (!Number.isFinite(s.stats[p[1]])) return null
        const x = value(s.stats[p[1]])
        if (!Number.isFinite(x) || x < 0 || (['hp', 'walk_speed', 'boost_speed', 'turn_rate', 'pitch_rate'].includes(p[1]) && x <= 0)) return null
        s.stats[p[1]] = x
      } else {
        const w = s.weapons.find(w => w && w.kind === p[1])
        if (!w || !Number.isFinite(w.st[p[2]])) return null
        const x = value(w.st[p[2]])
        if (!Number.isFinite(x) || x < 0 || (['cooldown', 'speed', 'mag', 'charge'].includes(p[2]) && x <= 0)) return null
        w.st[p[2]] = x
      }
    }
    s.weapons = s.weapons.map(w => w ? normalized(w.kind, w.st, w) : null)
    s.maxHp = base.maxHp * s.stats.hp / Math.max(1, base.stats.hp)
    s.maxEnergy = base.maxEnergy * s.stats.energy / Math.max(1, base.stats.energy)
    // A change in capacity is not an authoritative refill or timer reset.
    s.hp = Math.min(base.hp, s.maxHp); s.energy = Math.min(base.energy, s.maxEnergy)
    return s
  }
  function prospective(kind) {
    if (!KINDS.has(kind) || !Array.isArray(B.me.upgradeIds) || B.me.upgradeIds.length > 64) return null
    const st = { ...(cfg.weapons[kind] || {}) }
    for (const id of B.me.upgradeIds) {
      const u = index.get(id)
      if (!u || !Array.isArray(u.effects) || u.effects.length > 8) return null
      for (const e of u.effects) {
        if (!e || typeof e.path !== 'string' || !e.path.startsWith('weapons.' + kind + '.')) continue
        if (!SUPPORTED.has(e.path)) return null
        const key = e.path.slice(('weapons.' + kind + '.').length)
        if (key.includes('.') || !Object.hasOwn(st, key) || !Number.isFinite(st[key]) ||
          (e.mul !== undefined && !Number.isFinite(e.mul)) || (e.add !== undefined && !Number.isFinite(e.add))) return null
        if (e.mul === undefined && e.add === undefined) return null
        const value = st[key] * n(e.mul, 1) + n(e.add)
        if (!Number.isFinite(value) || value < 0 || (['cooldown', 'speed', 'mag', 'charge'].includes(key) && value <= 0)) return null
        st[key] = value
      }
    }
    return normalized(kind, st)
  }
  function subject(ctx) {
    if (ctx?.task === 'resource') {
      const l = B.loot
      if (!l) return null
      if (l.type === 'drone') { const tr = B.tracks.get(l.id); if (tr?.listed && tr.losOut && tr.hp > 0) return tr }
      if (l.type === 'crate') {
        const c = B.crates.get(l.id)
        if (c && B.me.t - c.seen <= .5 && c.hp > 0) return { ...c, crate: true, height: n(cfg.crates.height, 2.4), vx: 0, vy: 0, vz: 0, steadySince: -99 }
      }
      return null // A non-fought visible mech is not a resource objective.
    }
    if (ctx?.contact?.fresh && ctx.contact.shotClear && ctx.contact.pitchReachable) {
      const tr = B.tracks.get(ctx.contact.id)
      if (tr && tr.listed && !tr.phantom && tr.hp > 0) return tr
    }
    return null
  }
  function arcRecipient(w, tr, yaw, pitch) {
    const me = B.me, radius = me.radius + .5, c = Math.cos(pitch)
    const x = me.x + Math.cos(yaw) * radius * c, y = me.y + Math.sin(yaw) * radius * c, z = me.z + me.muzzleH + Math.sin(pitch) * radius
    let best = null, near = w.range, tie = false
    const consider = (o, height) => {
      const d = Math.hypot(o.x - x, o.y - y, o.z + height * .5 - z)
      if (d > near + 1e-6 || Math.abs(angDiff(yaw, Math.atan2(o.y - y, o.x - x))) > w.cone) return
      if (B.world && !B.world.shotClear(x, y, z, o.x, o.y, o.z + height * .5)) return
      if (best && Math.abs(d - near) <= 1e-6 && best.id !== o.id) tie = true
      else if (!best || d < near) { near = d; best = o; tie = false }
    }
    if (B.world && !B.world.shotClear(me.x, me.y, me.z + me.muzzleH, x, y, z)) return false
    for (const o of B.trackList) if (o.listed && !o.phantom && o.hp > 0) consider(o, o.height)
    for (const o of B.crates.values()) if (me.t - o.seen <= .5 && o.hp > 0) consider(o, n(cfg.crates.height, 2.4))
    return !tie && best?.id === tr.id
  }
  function muzzleClear(yaw, pitch, tx, ty, tz) {
    if (!B.world) return false
    const me = B.me, off = me.radius + .5, c = Math.cos(pitch)
    const x = me.x + off * c * Math.cos(yaw), y = me.y + off * c * Math.sin(yaw), z = me.z + me.muzzleH + off * Math.sin(pitch)
    if (!B.world.shotClear(me.x, me.y, me.z + me.muzzleH, x, y, z)) return false
    const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz), f = d > 1 ? (d - 1) / d : 0
    return B.world.shotClear(x, y, z, x + dx * f, y + dy * f, z + dz * f)
  }
  function capacity(w, s, tr, horizon) {
    if (!w || !tr || !KINDS.has(w.kind) || (tr.crate && w.kind !== 'gun')) return null
    if (B.holdFire && !(w.kind === 'laser' && w.charge > 0)) return null
    const me = B.me, H = clamp(n(horizon), 0, 8), r = Math.hypot(tr.x - me.x, tr.y - me.y), tz = tr.z + n(tr.height, 9) * .5
    const dz = tz - me.z - me.muzzleH, distance = Math.hypot(r, dz)
    let yaw = Math.atan2(tr.y - me.y, tr.x - me.x), pitch = Math.atan2(dz, r), flight = 0
    if (H <= 0 || pitch < me.minPitch || pitch > me.maxPitch || distance > w.range ||
      (B.world && !B.world.shotClear(me.x, me.y, me.z + me.muzzleH, tr.x, tr.y, tz))) return null
    if (w.kind === 'gun') {
      const q = intercept(me.x, me.y, me.z + me.muzzleH, tr.x, tr.y, tz, n(tr.vx), n(tr.vy), n(tr.vz), Math.max(1, w.speed), me.radius + .5)
      if (!q || q.dist > w.range * P.gunRangeFrac || q.pitch < me.minPitch || q.pitch > me.maxPitch) return null
      if (!muzzleClear(q.yaw, q.pitch, q.x, q.y, q.z)) return null
      const steady = tr.crate || me.t - n(tr.steadySince, me.t) >= P.steadyS
      const ffa = !tr.crate && B.env === 'FFA' && P.ffaRules === true
      if (ffa ? (B.ffa.reverser(tr) ? q.t > P.ffaRevFlight : q.t > P.gunFlightMax && !(steady && q.t <= P.ffaSteadyFlight)) : q.t > P.gunFlightMax && !steady) return null
      yaw = q.yaw; pitch = q.pitch; flight = q.t
    }
    const turnMult = me.laser?.charge > 0 ? Math.max(.05, n(me.laser.st.charge_turn_mult, 1)) : 1
    const turn = Math.max(Math.abs(angDiff(me.yaw, yaw)) / Math.max(.01, n(s.stats.turn_rate, me.turnRate) * turnMult),
      Math.abs(me.pitch - pitch) / Math.max(.01, n(s.stats.pitch_rate, me.pitchRate) * turnMult))
    const guard = P.tickS * Math.max(1, n(cfg.match.decide_every, 2)), cd = Math.max(.01, w.cd)
    let first = Infinity, shots = 0, chance = 1, shotTime = () => Infinity
    if (w.kind === 'gun') {
      const mag = Math.max(1, Math.floor(w.mag)), ammo = w.reload > 0 || w.ammo <= 0 ? mag : Math.floor(w.ammo)
      const refill = w.reload > 0 ? w.reload : w.ammo <= 0 ? w.reloadS : 0
      first = Math.max(w.cooldown, refill, turn) + flight + guard
      if (first <= H) {
        shots = Math.min(ammo, 1 + Math.floor((H - first) / cd))
        const next = first + Math.max(0, ammo - 1) * cd + Math.max(w.reloadS, cd)
        if (shots === ammo && next <= H) {
          const cycle = (mag - 1) * cd + Math.max(w.reloadS, cd), left = H - next, full = Math.floor(left / cycle)
          shots += full * mag + Math.min(mag, 1 + Math.floor((left - full * cycle) / cd))
        }
        shotTime = count => count <= ammo ? first + (count - 1) * cd :
          next + Math.floor((count - ammo - 1) / mag) * ((mag - 1) * cd + Math.max(w.reloadS, cd)) + ((count - ammo - 1) % mag) * cd
      }
      chance = tr.crate ? 1 : clamp(n(P.pfOwnHit0, .8) - n(P.pfOwnHitK, .003) * Math.max(0, distance - n(P.pfHitR0, 40)), n(P.pfOwnHitMin, .15), n(P.pfOwnHit0, .8))
    } else if (w.kind === 'laser') {
      const range = B.p26on ? w.range - 5 : w.range * P.laserRangeFrac
      if (distance > range || (w.charge <= 0 && (B.noCharge || (B.p26on && B.prof?.laserVeto(tr))))) return null
      if (!muzzleClear(yaw, pitch, tr.x, tr.y, tz)) return null
      const left = Math.max(0, w.full - w.charge)
      const shortWait = Math.max(0, n(me.shortUntil, -99) - me.t)
      first = Math.max(turn, w.charge > 0 ? Math.max(w.cooldown, left) : Math.max(w.cooldown, shortWait) + left) + guard
      if (first <= H) shots = 1 + Math.floor((H - first) / Math.max(.01, w.full + cd))
      shotTime = count => first + (count - 1) * (w.full + cd)
      if (tr.hasMortar) chance += w.cookoff
    } else {
      if (distance > w.range * P.lightRangeFrac || !arcRecipient(w, tr, yaw, pitch)) return null
      first = Math.max(turn, w.cooldown) + guard
      const drain = Math.max(0, me.grounded ? n(s.stats.boost_drain, 17) : n(s.stats.jet_drain, 15)), move = B.cmd.boost ? drain * H : 0
      const regen = !B.cmd.boost ? Math.max(0, first - n(s.stats.energy_regen_delay, .6)) * n(s.stats.energy_regen, 18) : 0
      const fuel = Math.max(0, Math.min(s.maxEnergy, s.energy + regen) - Math.max(P.lightReserve, P.boostReserve) - move)
      if (first <= H) shots = Math.min(1 + Math.floor((H - first) / cd), Math.floor(fuel / Math.max(.01, w.energy)))
      shotTime = count => first + (count - 1) * cd
      chance = n(P.pfLightK, .9)
    }
    const perShot = w.damage * me.dmgMult * chance, needed = perShot > 0 ? Math.ceil(tr.hp / perShot) : Infinity
    return { damage: Math.max(0, shots * perShot), completion: needed > 0 && needed <= shots ? shotTime(needed) : Infinity }
  }
  function damage(w, s, tr, H) { return capacity(w, s, tr, H)?.damage || 0 }
  function power(s, tr, H) { return Math.max(0, ...s.weapons.map(w => damage(w, s, tr, H))) }
  function completion(s, tr, H) {
    return Math.min(Infinity, ...s.weapons.map(w => capacity(w, s, tr, H)?.completion ?? Infinity))
  }
  function arrival(s, ctx) {
    const route = ctx?.route, me = B.me
    if (!route || !Number.isFinite(route.distance) || route.distance < 0 || !me.grounded || !(route.acceleration > 0)) return null
    const mult = me.laser?.charge > 0 ? me.chargeMoveMult : 1
    // Reprice only the current walk/boost command, retaining the same checked
    // direct segment and its acceleration/turn allowance. No new boost plan.
    const speed = Math.max(1, n(B.cmd.boost ? s.stats.boost_speed : s.stats.walk_speed, B.cmd.boost ? me.boostSpeed : me.walk) * mult)
    const allowance = route.launchAllowance + (speed - route.speed) / route.acceleration
    const time = route.distance / speed + allowance
    if (B.cmd.boost && time * Math.max(0, n(s.stats.boost_drain, 17)) > Math.max(0, s.energy - P.boostReserve)) return null
    const timing = equipmentRouteTiming(B, route, time)
    if (!timing) return null
    let complete = time
    if (ctx.task === 'capture') {
      const task = B.dropTask, d = task && B.drops.find(x => Number.isInteger(task.id) ? x.id === task.id : Math.hypot(x.x - task.x, x.y - task.y) < .01)
      if (!d || (d.holder >= 0 && d.holder !== me.id) || B.trackList.some(tr => tr.listed && !tr.npc && tr.hp > 0 && Math.hypot(tr.x - d.x, tr.y - d.y) <= d.radius)) return null
      const owned = d.holder === me.id && Math.hypot(me.x - d.x, me.y - d.y) <= d.radius
      complete = Math.max(time, n(d.landsIn)) + Math.max(0, n(d.captureS, 4) - (owned ? n(d.progress) : 0))
    }
    return { time, complete, safe: timing.safe && complete <= timing.deadline && complete <= timing.knownFor, deadline: timing.deadline }
  }
  function health(s, ctx) {
    const rw = ctx?.recoveryWindow
    if (!rw?.eligible || !B.me.inZone) return s.hp
    const H = Math.min(n(rw.horizon), n(ctx.remaining)), wait = Math.max(0, n(s.stats.regen_delay, B.me.regenDelay) - (B.me.t - Math.max(B.me.lastHurtT, B.me.lastDealtT)))
    return Math.min(s.maxHp, s.hp + Math.max(0, H - wait) * Math.max(0, n(s.stats.regen_per_s, B.me.regenPerS)))
  }
  function gain(base, next, ctx, tr) {
    const H = Math.max(0, Math.min(4, n(ctx.horizon, 4), n(ctx.remaining))), combat = ctx.task === 'fight' || ctx.task === 'resource'
    if (H <= 0) return 0
    const beforeRoute = arrival(base, ctx), afterRoute = arrival(next, ctx)
    let value = 0
    if (ctx.task === 'resource' && tr) {
      // The resource is useful after a finite kill AND collection. No damage
      // bonus for shooting an object whose current checked route cannot finish.
      const limit = Math.min(12, n(ctx.remaining), n(ctx.route?.knownFor), beforeRoute?.deadline ?? 0)
      const before = completion(base, tr, H) + (beforeRoute?.time ?? Infinity) + 2 * P.tickS
      const after = completion(next, tr, H) + (afterRoute?.time ?? Infinity) + 2 * P.tickS
      if (afterRoute?.safe && after <= limit) {
        if (beforeRoute?.safe && before <= limit) value += (before - after) / Math.max(1, before)
        else value += 1 // one newly feasible bounded collection, no reward/placement claim
      }
    } else if (combat && tr) {
      const before = power(base, tr, H), after = power(next, tr, H)
      value += (Math.min(tr.hp, after) - Math.min(tr.hp, before)) / Math.max(1, tr.hp)
      if (before >= tr.hp && after >= tr.hp && H > 0) value += (completion(base, tr, H) - completion(next, tr, H)) / H
    }
    if (ctx.exposure?.weaponLines > 0) {
      const a = clamp(n(base.stats.armor), 0, .95), b = clamp(n(next.stats.armor), 0, .95)
      value += (next.hp / (1 - b) - base.hp / (1 - a)) / Math.max(1, base.maxHp)
    }
    if (!combat) value += (health(next, ctx) - health(base, ctx)) / Math.max(1, base.maxHp)
    if (beforeRoute?.safe && afterRoute?.safe && ['route', 'capture', 'resource'].includes(ctx.task) && !(ctx.task === 'resource' && tr)) value += (beforeRoute.complete - afterRoute.complete) / Math.max(1, beforeRoute.complete)
    return Number.isFinite(value) ? value : null
  }
  function pick(offer, fallback) {
    state.pick = null
    if (!enabled() || !offer || !Array.isArray(offer.choices) || !offer.choices.length || offer.choices.length > 3 || (Number.isFinite(offer.expires) && offer.expires < B.me.t)) return fallback
    const ctx = context(), base = snapshot(), tr = subject(ctx)
    if (!ctx || !(ctx.remaining > 0)) return fallback
    if (['fight', 'resource'].includes(ctx.task) && base.weapons.some(w => w && !KINDS.has(w.kind))) {
      state.pick = { reason: 'unmodelled-held-channel', fallback }; return fallback
    }
    const scores = [], feasible = [], originalRoute = arrival(base, ctx)
    for (const c of offer.choices) {
      const u = descriptor(c?.id), next = u && project(base, u)
      if (!next) { state.pick = { reason: 'whole-offer-unsupported', fallback }; return fallback }
      const score = gain(base, next, ctx, tr)
      if (score === null) return fallback
      scores.push(score)
      const route = arrival(next, ctx)
      feasible.push(ctx.task === 'route' && originalRoute && !originalRoute.safe && route?.safe ? 1 : 0)
    }
    if (!Number.isInteger(fallback) || fallback < 0 || fallback >= scores.length) return fallback
    let best = fallback
    for (let i = 0; i < scores.length; i++) if (feasible[i] > feasible[best] || feasible[i] === feasible[best] && scores[i] > scores[best] + 1e-6) best = i
    state.pick = { task: ctx.task, phase: ctx.phase, fallback, chosen: best, scores, feasible, reason: best === fallback ? 'stable-fallback-or-best' : feasible[best] ? 'rotation-now-feasible' : 'finite-context-gain' }
    return feasible[best] || scores[best] > 1e-6 ? best : fallback
  }
  function safeFallback(fallback, kind, base, tr) {
    if (!fallback || fallback.drop < 0) return fallback
    const w = base.weapons[fallback.drop], other = base.weapons[1 - fallback.drop]
    if (!w || (w.kind === 'laser' && w.charge > 0)) return null
    if (tr && damage(w, base, tr, 1) > 0 && damage(other, base, tr, 1) <= 0) return null
    if (!tr && KINDS.has(w.kind) && (!other || (other.kind === 'lightning' && base.energy <= P.lightReserve))) return null
    return fallback
  }
  function pickup(kind, fallback) {
    state.pickup = null
    if (!enabled()) return fallback
    const me = B.me, sig = me.weapons.map(w => w?.kind || '-').join(':')
    if (signature !== sig) { if (signature) changedAt = me.t; signature = sig; pending.clear() }
    if (me.weapons.some(w => w?.kind === kind)) return null
    if (me.weapons.some(w => !w)) return fallback
    const ctx = context(), base = snapshot(), tr = subject(ctx), safe = safeFallback(fallback, kind, base, tr)
    if (me.t - changedAt < 4) return null
    if (!KINDS.has(kind) || base.weapons.some(w => w && !KINDS.has(w.kind)) || !tr || tr.crate || tr.npc || !ctx || !ctx.contact?.fresh) return safe
    if (ctx.urgent || B.zoneUrgent || B.losing || B.mustDisengage || B.holdFire || ctx.task !== 'fight') { pending.delete(kind); return null }
    const incoming = prospective(kind), H = Math.max(0, Math.min(4, n(ctx.horizon, 4), n(ctx.remaining)))
    if (!incoming || H <= 0) return safe
    const before = power(base, tr, H), immediate = base.weapons.map(w => damage(w, base, tr, 1))
    let slot = -1, best = before
    for (let i = 0; i < 2; i++) {
      const old = base.weapons[i]
      if (!old || (old.kind === 'laser' && old.charge > 0)) continue
      const next = { ...base, weapons: base.weapons.map((w, j) => j === i ? incoming : w) }
      if (immediate[i] > 0 && immediate[1 - i] <= 0 && damage(incoming, next, tr, 1) <= 0) continue
      const after = power(next, tr, H)
      if (after > best + Math.max(1, before * .1)) { best = after; slot = i }
    }
    if (slot < 0) { pending.delete(kind); state.pickup = { kind, before, after: best, reason: 'measured-no-gain' }; return null }
    // A new range band / location / circle / target starts a new short intent.
    // Every invocation still rechecks current timers, fuel and danger above.
    const key = [tr.id, slot, ctx.task, ctx.phase, ctx.alive ?? B.aliveN,
      Math.floor(me.x / 8), Math.floor(me.y / 8), Math.floor(ctx.contact.horizontalRange / 8),
      ctx.inZone, ctx.exposure.credibleCount, ctx.exposure.unknownLines].join(':'), old = pending.get(kind)
    const p = old && old.key === key && me.t - old.last <= .3 ? old : { key, since: me.t, last: me.t }
    p.last = me.t; pending.set(kind, p)
    const ready = me.t - p.since >= .2 - 1e-6
    state.pickup = { kind, slot, task: ctx.task, phase: ctx.phase, before, after: best, since: p.since, ready, reason: 'finite-pair-gain' }
    return ready ? { drop: slot } : null
  }
  return { pick, pickup, state, snapshot, project, descriptor, prospective, damage, gain, subject, arrival, capacity }
}
