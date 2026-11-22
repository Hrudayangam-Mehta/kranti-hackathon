import { MODE } from './params.js'
import { setTarget } from './tactics.js'
import { zoneSlack } from './senses.js'

export function makePressure(B, mover) {
  const P = B.P, burst = P.pressurePolicy === 'burst'
  const enabled = burst || P.pressurePolicy === 'push'
  const S = { on: false, since: -1, reason: '', phase: 'setup', target: null, shot: null, targetSince: -1, score: Infinity, range: 60, ttk: 99, burst: 0, support: 0, finish: false, waypoint: 0, seekX: 0, seekY: 0, seekUntil: -1, lastX: 0, lastY: 0, lastT: -99, capture: null, captureId: -1, captureUntil: -1 }
  const threshold = Array.isArray(B.cfg.cubes.upgrade_thresholds) ? B.cfg.cubes.upgrade_thresholds.find((x) => Number.isFinite(x) && x > 0) ?? 1 : 1
  const gunReady = (g) => !g ? Infinity : g.reload > 0 ? Math.max(g.cooldown, g.reload) : g.ammo > 0 ? g.cooldown : Math.max(g.cooldown, g.reloadS)
  const laserReady = (lz) => !lz ? Infinity : lz.charge > 0 ? Math.max(0, lz.full - lz.charge) : lz.cooldown + lz.full
  const active = () => S.on
  const armorFactor = 1 - Math.max(0, Math.min(1, Number.isFinite(B.cfg.mech.armor) ? B.cfg.mech.armor : 0))

  function legal(tr) {
    return !!tr && !tr.npc && !tr.phantom && tr.hp > 0 && tr.conf >= 0.15 && B.me.t - tr.lastSeen <= 8
  }

  function rangeFor(tr) {
    const me = B.me
    let r = me.gun ? (burst ? 78 : 55) : me.laser ? (burst ? 100 : 78) : 55
    if (me.lightning && me.energy >= me.lightning.energy * 2) r = Math.max(12, me.lightning.range * (burst ? 0.80 : 0.68))
    else if (me.laser && !me.gun) r = Math.min(r, me.laser.range * 0.65)
    else if (me.gun) r = Math.min(r, me.gun.range * 0.65)
    if (tr.hasLightning && !me.lightning) r = Math.max(r, Math.min(65, (B.cfg.weapons.lightning.range || 45) + 9))
    return Math.max(8, r)
  }

  function damageRate(tr, range) {
    const me = B.me, g = me.gun, lz = me.laser, li = me.lightning
    let d = 0
    if (g && range <= g.range) d += g.damage * g.mag / Math.max(0.05, (g.mag - 1) * g.cd + g.reloadS) * B.gunStat.q(range)
    if (lz && range <= lz.range) d += lz.damage * (tr.hasMortar ? 1 + lz.cookoff : 1) / Math.max(0.05, lz.cd + lz.full)
    if (li && range <= li.range && me.energy >= li.energy) d += li.damage / Math.max(0.05, li.cd)
    return Math.max(1, d * me.dmgMult * armorFactor)
  }

  function burstDamage(tr, range, horizon = 1.5) {
    const me = B.me, g = me.gun, lz = me.laser, li = me.lightning
    let d = 0
    if (g && range <= g.range) {
      const first = gunReady(g) + range / Math.max(1, g.speed)
      if (first <= horizon) {
        const ammo = g.reload > 0 || g.ammo <= 0 ? g.mag : g.ammo
        const n = Math.min(ammo, 1 + Math.floor((horizon - first) / Math.max(0.01, g.cd)))
        d += n * g.damage * B.gunStat.q(range)
      }
    }
    if (lz && range <= lz.range && laserReady(lz) + P.latency <= horizon) d += lz.damage * (tr.hasMortar ? 1 + lz.cookoff : 1)
    if (li && range <= li.range && li.cooldown <= horizon) {
      const n = Math.min(Math.floor(me.energy / Math.max(0.01, li.energy)), 1 + Math.floor((horizon - li.cooldown) / Math.max(0.01, li.cd)))
      d += Math.max(0, n) * li.damage
    }
    return d * me.dmgMult * armorFactor
  }

  function support(tr) {
    let n = 0
    const L = B.trackList
    for (let i = 0; i < Math.min(L.length, 48); i++) {
      const other = L[i]
      if (other === tr || !legal(other)) continue
      const d = Math.hypot(other.x - tr.x, other.y - tr.y)
      if (d < 85) n += (1 - d / 85) * Math.max(0.25, other.conf)
    }
    return n
  }

  function select() {
    const me = B.me, t = me.t, L = B.trackList, nav = B.nav
    const component = nav ? nav.component(me.x, me.y) : -1
    let best = null, bestScore = Infinity, bestRange = 60, bestTtk = 99, bestBurst = 0, bestSupport = 0, shot = null, shotScore = Infinity
    for (let i = 0; i < Math.min(L.length, 48); i++) {
      const tr = L[i]
      if (!legal(tr)) continue
      const range = rangeFor(tr), attackRange = Math.min(tr.dist, range)
      const ttk = tr.hp / damageRate(tr, attackRange)
      const hit = burstDamage(tr, attackRange), nearby = support(tr)
      const approach = Math.max(0, tr.dist - range) / Math.max(1, me.walk)
      const finish = tr.listed && tr.losOut && burstDamage(tr, tr.dist) >= tr.hp
      const age = Math.max(0, t - tr.lastSeen)
      let score = burst ? 2.4 * tr.hp / Math.max(1, hit) + 0.30 * approach + 1.1 * nearby : ttk + 0.40 * approach + 0.55 * nearby
      score += age * 0.4 + (tr.losOut ? 0 : 1.2)
      if (!tr.losOut && nav && component >= 0) {
        const destination = nav.component(tr.x, tr.y)
        if (destination >= 0 && destination !== component) score += 12
      }
      if (!tr.losOut && mover.isAbandoned(tr.x, tr.y)) score += 10
      if (finish) score -= 3
      if (tr === S.target) score -= t - S.targetSince < 1.2 ? 1.6 : 0.8
      if (score < bestScore) { best = tr; bestScore = score; bestRange = range; bestTtk = ttk; bestBurst = hit; bestSupport = nearby }
      if (tr.listed && tr.losOut) {
        const fireScore = tr.hp / damageRate(tr, tr.dist) - (tr === S.target ? 0.5 : 0) - (finish ? 2 : 0)
        if (fireScore < shotScore) { shot = tr; shotScore = fireScore }
      }
    }
    if (best !== S.target) { S.targetSince = t; B.counters.pressureTargets = (B.counters.pressureTargets || 0) + (best ? 1 : 0) }
    S.target = best; S.score = bestScore; S.range = bestRange; S.ttk = bestTtk; S.burst = bestBurst; S.support = bestSupport
    S.shot = best && best.listed && best.losOut ? best : shot
    S.finish = !!(S.shot && burstDamage(S.shot, S.shot.dist) >= S.shot.hp)
    setTarget(B, S.shot || best)
    if (best && best.listed) { S.lastX = best.x; S.lastY = best.y; S.lastT = t }
    if (best) { best.finishable = S.finish && S.shot === best; best.secure = best.finishable }
  }

  function captureFinish() {
    const me = B.me, t = me.t
    S.capture = null
    if (!me.inZone) return
    for (const d of B.drops) {
      const left = Math.max(0, d.captureS - d.progress)
      if (d.holder !== me.id || d.landsIn > 0 || d.progress <= 0 || left > 0.600001 || Math.hypot(me.x - d.x, me.y - d.y) > d.radius) continue
      if (zoneSlack(B, d.x, d.y, t + left + P.tickS) < 0) continue
      let contested = false
      for (const tr of B.trackList) if (!tr.npc && tr.listed && tr.hp > 0 && Math.hypot(tr.x - d.x, tr.y - d.y) <= d.radius) { contested = true; break }
      if (contested) continue
      if (S.captureId !== d.id) { S.captureId = d.id; S.captureUntil = t + left + 0.1 }
      if (t > S.captureUntil) continue
      S.capture = d
      break
    }
  }

  function update(obs) {
    if (!enabled) return
    const me = B.me, t = me.t
    if (!S.on) {
      const offer = obs && obs.offer
      const pending = !!(offer && Array.isArray(offer.choices) && offer.choices.length > 0 && me.cubes >= threshold)
      const upgraded = me.upgrades > 0 || pending
      if ((me.laser || me.lightning) && upgraded) S.reason = 'secondary-and-upgrade'
      else if (t >= 60 && me.gun && upgraded) S.reason = 'upgraded-gun-deadline'
      else if (t >= 90 && (me.gun || me.laser || me.lightning || me.mortar)) S.reason = 'armed-deadline'
      if (!S.reason) return
      S.on = true; S.since = t; B.counters.pressureCommits = (B.counters.pressureCommits || 0) + 1
    }
    B.pressureActive = true
    B.pressureEnergyReserve = me.lightning ? Math.max(me.lightning.energy, Math.min(8, 2 * me.lightning.energy)) : 0
    select()
    captureFinish()
  }

  function mode() {
    if (!S.on) return
    const t = B.me.t
    B.holdFire = false; B.holdFirst = false; B.mustDisengage = false; B.losing = false; B.doomed = false
    B.fightOk = true; B.finishing = S.finish; B.finish = S.finish; B.killSecure = S.finish
    B.loot = null; B.grab = null; B.dropTask = S.capture; B.shootCrate = null; B.farmNpc = -1; B.idleWait = 0
    B.stance = 'OFFENSIVE'
    const want = B.zoneUrgent ? MODE.ZONE : S.capture ? MODE.DROP : S.target ? MODE.FIGHT : MODE.HOLD
    if (B.mode !== want) { B.mode = want; B.modeSince = t; B.counters.modeSwitches++ }
    S.phase = B.zoneUrgent ? 'zone' : S.capture ? 'capture-finish' : S.target ? 'commit' : 'seek'
    if (B.p26) {
      B.p26.shot = S.shot; B.p26.fight = true; B.p26.finishing = S.finish; B.p26.latch = false; B.p26.avoid = false
      B.p26.grab = null; B.p26.leg = ''; B.p26.hold = S.range; B.p26.phase = 'pressure'
    }
  }

  function allCooling() {
    const me = B.me
    const gun = gunReady(me.gun) > 0.35
    const laser = laserReady(me.laser) > 0.5
    const li = me.lightning
    const light = !li || me.energy < li.energy || li.cooldown > 0.25 || !S.target || S.target.dist > li.range
    return gun && laser && light
  }

  function seek() {
    const me = B.me, t = me.t, z = B.zone
    if (t - S.lastT < 12 && Math.hypot(me.x - S.lastX, me.y - S.lastY) > 10) {
      mover.moveTo(S.lastX, S.lastY, 1, 4); B.lookHint = true; B.lookX = S.lastX; B.lookY = S.lastY
      B.legKind = 'pressure-pursue'; return
    }
    if (t >= S.seekUntil || Math.hypot(me.x - S.seekX, me.y - S.seekY) < 8) {
      let heard = -1, weight = 0.5
      for (let i = 0; i < 12; i++) if (B.heard[i] > weight) { weight = B.heard[i]; heard = i }
      if (heard >= 0) {
        const a = -Math.PI + (heard + 0.5) * Math.PI / 6
        S.seekX = me.x + 75 * Math.cos(a); S.seekY = me.y + 75 * Math.sin(a)
      } else if (z.known) {
        const a = S.waypoint++ * Math.PI / 3, r = Math.max(0, Math.min(90, z.nrEff * 0.45))
        S.seekX = z.nx + r * Math.cos(a); S.seekY = z.ny + r * Math.sin(a)
      } else {
        const a = me.yaw + (S.waypoint++ % 3 - 1) * 0.7
        S.seekX = me.x + 50 * Math.cos(a); S.seekY = me.y + 50 * Math.sin(a)
      }
      S.seekUntil = t + 3
    }
    mover.moveTo(S.seekX, S.seekY, 1, 4)
    B.lookHint = true; B.lookX = S.seekX; B.lookY = S.seekY; B.legKind = 'pressure-seek'
  }

  function legs() {
    if (!S.on) return false
    const me = B.me, cmd = B.cmd, tr = S.target
    if (B.zoneUrgent) {
      mover.zoneLegs(); B.noCharge = B.zoneMargin < 3 || !me.inZone; B.legKind = 'pressure-zone'; return true
    }
    if (S.capture) { mover.moveTo(S.capture.x, S.capture.y, 1, 0.5); B.legKind = 'pressure-capture-finish'; return true }
    if (!tr) { seek(); return true }
    let range = S.range
    if (burst && !S.finish && allCooling()) { S.phase = 'cycle'; range += Math.min(16, range * 0.2) }
    B.rPrefNow = range
    if (!tr.losOut || tr.dist > range + 7) {
      mover.moveTo(tr.x, tr.y, 1, tr.losOut ? range : Math.min(12, range * 0.2))
      B.legKind = 'pressure-close'
    } else {
      if (!mover.standoff(tr.x, tr.y, range, true, true, range - 5, range + 5, burst ? 0.8 : 0.4)) mover.moveTo(tr.x, tr.y, 1, Math.max(4, range - 8))
      B.legKind = S.phase === 'cycle' ? 'pressure-cycle' : 'pressure-fire'
    }
    const reserve = B.pressureEnergyReserve || 0
    if (me.grounded && me.energy > reserve + 5 && tr.dist > range + 10) cmd.boost = true
    return true
  }

  function wantReload() {
    const me = B.me, g = me.gun
    if (!g || g.reload > 0 || g.ammo >= g.mag) return false
    if (g.ammo <= 0) return true
    if (B.out.fire[g.slot]) return false
    if (!S.shot) return g.ammo <= g.mag / 2
    return burst && g.ammo <= Math.max(1, Math.floor(g.mag / 6)) && me.laser && laserReady(me.laser) <= 0.2 && !S.finish
  }

  function hands(obs) {
    if (!S.on) return
    B.out.reload = wantReload()
    const choices = obs && obs.offer && obs.offer.choices
    if (!Array.isArray(choices) || choices.length === 0) return
    const me = B.me
    const order = burst ? ['laser_damage', 'laser_charge', 'lightning_efficiency', 'lightning_range', 'gun_damage', 'gyros', 'gun_velocity', 'gun_rate', 'gun_mag', 'lightning_chain', 'servos', 'plating', 'armor', 'capacitor', 'reactor', 'jets', 'sensors', 'nanites'] :
      ['lightning_efficiency', 'laser_damage', 'gun_rate', 'gun_damage', 'laser_charge', 'lightning_range', 'gun_mag', 'gyros', 'servos', 'plating', 'armor', 'lightning_chain', 'reactor', 'capacitor', 'gun_velocity', 'jets', 'sensors', 'nanites']
    let best = 0, score = Infinity
    for (let i = 0; i < Math.min(3, choices.length); i++) {
      const id = choices[i] && choices[i].id
      if (typeof id !== 'string') continue
      const at = order.indexOf(id)
      let s = at < 0 ? 80 : at
      if (id.startsWith('gun_') && !me.gun) s += 100
      if (id.startsWith('laser_') && !me.laser) s += 100
      if (id.startsWith('lightning_') && !me.lightning) s += 100
      if (id.startsWith('mortar_') && !me.mortar) s += 100
      if (s < score) { score = s; best = i }
    }
    B.out.pick = best
  }

  function wrapProfile(prof) {
    if (!prof) return
    const fireTarget = prof.fireTarget, isLegal = prof.isLegal, crateShot = prof.crateShot, reload = prof.wantReload, laserVeto = prof.laserVeto
    prof.fireTarget = () => S.on ? S.shot || S.target : fireTarget()
    prof.isLegal = (tr) => S.on ? legal(tr) : isLegal(tr)
    prof.crateShot = () => S.on ? null : crateShot()
    prof.wantReload = (object) => S.on ? wantReload() : reload(object)
    prof.laserVeto = (target) => S.on ? false : laserVeto(target)
  }

  function debug() {
    return { policy: P.pressurePolicy, active: S.on, since: S.since, reason: S.reason, phase: S.phase, target: S.target ? S.target.id : null, range: S.range, ttk: S.ttk, burst: S.burst, support: S.support, finish: S.finish }
  }

  return { active, update, mode, legs, hands, wrapProfile, legal, damageRate, burstDamage, rangeFor, allCooling, wantReload, debug, state: S }
}
