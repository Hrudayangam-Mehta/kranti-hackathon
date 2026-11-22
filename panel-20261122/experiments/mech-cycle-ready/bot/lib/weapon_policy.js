import { angDiff, clamp, makeRng, wrapPi } from './aim.js'

const FORWARD = [1, -1], BACKWARD = [-1, 1]
const value = (x, fallback) => Number.isFinite(x) ? x : fallback

export function makeWeaponPolicy(B) {
  const P = B.P, cfg = B.cfg
  const rng = makeRng(((B.rngSeed || 0) ^ 0x31f78a29) >>> 0)
  const pending = new Map(), answers = new Map(), dodge = new Map()
  let cachedTick = -1, cachedTime = -1, cachedEnv = '', cachedTarget = -1, cachedZone = false, cachedPressure = false
  let signature = '', lastEquip = -99, context = null
  let armorAdd = 0, armorMul = 1
  for (const upgrade of Array.isArray(cfg.upgrades) ? cfg.upgrades : []) {
    const stacks = clamp(value(upgrade && upgrade.max, 0), 0, 20)
    for (const effect of Array.isArray(upgrade && upgrade.effects) ? upgrade.effects : []) {
      if (!effect || effect.path !== 'mech.armor') continue
      armorAdd += Math.max(0, value(effect.add, 0)) * stacks
      armorMul *= Math.max(1, value(effect.mul, 1)) ** stacks
    }
  }
  const damageFloor = Math.max(0, 1 - (Math.max(0, value(cfg.mech.armor, 0)) + armorAdd) * armorMul)
  const on = () => P.weaponCycle === true
  const decisionS = () => P.tickS * Math.max(1, value(cfg.match.decide_every, 2))
  const turnMult = () => B.me.laser && B.me.laser.charge > 0 ? clamp(value(B.me.laser.st.charge_turn_mult, 1), 0.05, 10) : 1
  const reserve = () => B.pressureActive && Number.isFinite(B.pressureEnergyReserve)
    ? Math.max(0, B.pressureEnergyReserve) : B.killSecure ? P.lightMinEnergy : P.lightReserve

  function slew(yaw, pitch) {
    const me = B.me, mult = turnMult()
    return Math.max(Math.abs(angDiff(me.yaw, yaw)) / Math.max(0.01, me.turnRate * mult),
      Math.abs(pitch - me.pitch) / Math.max(0.01, me.pitchRate * mult))
  }

  function laserAim(target, beam, gun) {
    const me = B.me, lz = me.laser
    if (!lz || (lz.charge <= 0 && lz.cooldown > P.tickS)) return false
    const full = lz.charge >= P.laserFullFrac * lz.full
    if (full) return true
    if (!beam.clear) return false
    const beamTurn = slew(beam.yaw, beam.pitch)
    const chargeWait = lz.charge > 0 ? Math.max(0, lz.full - lz.charge) : lz.cooldown + lz.full
    const beamEta = Math.max(beamTurn, beam.kill ? 0 : chargeWait)
    const gunFinish = gun.ready && gun.aligned && me.gun &&
      me.gun.damage * me.dmgMult * damageFloor >= target.hp && gun.delay + gun.flight + P.tickS < beamEta
    if (gunFinish) return false
    if (beam.kill) return true
    return !gun.ready || chargeWait <= beamTurn + decisionS() + P.tickS
  }

  function energyOk() {
    const me = B.me, li = me.lightning
    if (!li) return false
    const window = decisionS()
    const pulses = 1 + Math.floor(Math.max(0, window - li.cooldown - 1e-9) / Math.max(0.01, li.cd))
    const move = B.cmd.boost ? window * Math.max(0, value(me.grounded ? cfg.mech.boost_drain : cfg.mech.jet_drain, me.grounded ? 17 : 15)) : 0
    const floor = Math.max(reserve(), B.zoneUrgent ? P.boostReserve : 0)
    return me.energy - pulses * li.energy - move >= floor
  }

  function legal(tr, target) {
    if (!tr || B.holdFire) return false
    const me = B.me, p6 = B.p26on && B.hunt && B.hunt.firewall()
    if (tr.npc) return me.t - tr.lastDmgInT <= 3 || tr === target || (p6 && me.energy > P.pfLightEnergyNpc * me.maxEnergy)
    if (B.pressureActive) return true
    if (p6) return B.prof.isLegal(tr)
    return tr === target || tr === B.target || tr.hostile || me.t - tr.lastDmgInT <= 3
  }

  function nearestLightning(yaw, origin) {
    const me = B.me, li = me.lightning
    if (!li) return null
    let best = null, distance = li.range
    const blockerAngle = Math.min(Math.PI, li.cone)
    const consider = (object, z, crate) => {
      const dx = object.x - origin.x, dy = object.y - origin.y, dz = z - origin.z
      const d = Math.hypot(dx, dy, dz)
      if (d > distance + 1e-6 || Math.abs(angDiff(yaw, Math.atan2(dy, dx))) > blockerAngle) return
      if (B.world && !B.world.shotClear(origin.x, origin.y, origin.z, object.x, object.y, z)) return
      if (best && Math.abs(d - distance) <= 1e-6 && object.id !== best.object.id) best.ambiguous = true
      else if (d < distance || !best) {
        distance = d; best = { object, crate, distance: d, ambiguous: false }
      }
    }
    for (const tr of B.trackList) if (tr.listed && tr.hp > 0) consider(tr, tr.z + tr.height * 0.5, false)
    for (const c of B.crates.values()) if (me.t - c.seen <= 0.5 && c.hp !== 0) consider(c, c.z + (cfg.crates.height || 2.4) * 0.5, true)
    return best
  }

  function lightningAligned(first, yaw, origin) {
    if (!first || first.ambiguous) return false
    const li = B.me.lightning, angle = Math.max(0, li.cone / 2 - P.lightConeMarginDeg * Math.PI / 180)
    return first.distance <= li.range - 1 && Math.abs(angDiff(yaw, Math.atan2(first.object.y - origin.y, first.object.x - origin.x))) <= angle
  }

  function interruptAim(target, committedBeam, origin) {
    const me = B.me, li = me.lightning, lz = me.laser
    if (!on() || !li || B.holdFire || committedBeam || li.cooldown > P.readyCd || !energyOk()) return null
    if (lz && lz.charge >= P.laserFullFrac * lz.full) return null
    const delay = P.tickS * Math.max(1, Math.ceil(li.cooldown / P.tickS - 1e-6))
    let best = null, bestEta = Infinity
    for (const tr of B.trackList) {
      if (tr.npc || !tr.listed || !tr.charging || !tr.hasLaser || !legal(tr, target)) continue
      if (!(tr.aimAtMe || me.t - tr.lastDmgInT <= 1.5)) continue
      const yaw = Math.atan2(tr.y - origin.y, tr.x - origin.x)
      const pitch = Math.atan2(tr.z + tr.height * 0.5 - origin.z, Math.hypot(tr.x - origin.x, tr.y - origin.y))
      if (pitch < me.minPitch || pitch > me.maxPitch) continue
      const actual = wrapPi(me.yaw + clamp(angDiff(me.yaw, yaw), -me.turnRate * turnMult() * delay, me.turnRate * turnMult() * delay))
      const first = nearestLightning(actual, origin)
      if (!first || first.crate || first.object !== tr || !lightningAligned(first, actual, origin)) continue
      const eta = slew(yaw, pitch)
      if (eta < bestEta) { bestEta = eta; best = { yaw, pitch, target: tr } }
    }
    return best
  }

  function refresh() {
    const me = B.me, targetId = B.target ? B.target.id : -1
    const sig = me.weapons.map((w) => w ? w.kind : '-').join(':')
    if (sig !== signature) {
      if (signature) lastEquip = me.t
      signature = sig; pending.clear(); answers.clear(); cachedTick = -1
    }
    if (cachedTick === B.tick && cachedTime === me.t && cachedEnv === B.env && cachedTarget === targetId && cachedZone === B.zoneUrgent && cachedPressure === !!B.pressureActive) return
    if (cachedTarget !== targetId || cachedEnv !== B.env) pending.clear()
    cachedTick = B.tick; cachedTime = me.t; cachedEnv = B.env; cachedTarget = targetId; cachedZone = B.zoneUrgent; cachedPressure = !!B.pressureActive
    answers.clear()
    context = B.target && B.target.listed && B.target.hp > 0 ? B.target : null
    if (!context) for (const tr of B.trackList) {
      if (!tr.npc && tr.listed && tr.hp > 0 && (tr.hostile || me.t - tr.lastDmgInT <= 3 || tr.aimAtMe)) { context = tr; break }
    }
  }

  function capacity(kind, held, tr) {
    const me = B.me, base = cfg.weapons[kind] || {}, st = held ? held.st : base
    const read = (key, fallback) => Math.max(0, value(st[key], value(base[key], fallback)))
    const horizon = 4, range = held ? held.range : read('range', 0)
    if (!tr.losOut || tr.dist > range - 1) return 0
    const damage = (held ? held.damage : read('damage', 0)) * me.dmgMult
    const cd = Math.max(0.01, held ? held.cd : read('cooldown', 1))
    const equip = held ? 0 : Math.max(value(cfg.loot.equip_s, 1), cd)
    const pitch = Math.atan2(tr.z + tr.height * 0.5 - me.z - me.muzzleH, Math.hypot(tr.x - me.x, tr.y - me.y))
    if (pitch < me.minPitch || pitch > me.maxPitch) return 0
    const turn = slew(tr.bearing, pitch)
    if (kind === 'gun') {
      const mag = Math.max(1, held ? held.mag : read('mag', 12)), reload = held ? held.reloadS : read('reload', 2.4)
      let ammo = held ? held.ammo : mag, wait = Math.max(equip, held ? Math.max(held.cooldown, held.reload) : 0)
      if (!held) wait += reload // Pickup metadata does not reveal a dropped gun's remaining ammunition.
      if (held && held.reload > 0) ammo = mag
      if (ammo <= 0) { ammo = mag; wait = Math.max(wait, reload) }
      const travel = tr.dist / Math.max(5, held ? held.speed : read('speed', 252))
      wait = Math.max(wait, turn) + travel
      if (wait > horizon) return 0
      let shots = Math.min(ammo, 1 + Math.floor((horizon - wait) / cd))
      if (shots === ammo) {
        const next = wait + (ammo - 1) * cd + Math.max(reload, cd)
        if (next <= horizon) shots += Math.min(mag, 1 + Math.floor((horizon - next) / cd))
      }
      const spread = held ? held.spread : read('spread_deg', 0.6) * Math.PI / 180
      const fit = Math.min(1, (tr.radius + 0.3) / Math.max(0.1, tr.dist * Math.max(spread, 0.001)))
      return shots * damage * fit * (tr.revs >= P.revCount ? 0.7 : 1)
    }
    if (kind === 'laser') {
      const full = Math.max(0.01, held ? held.full : read('charge', 0.75))
      const charge = held ? held.charge : 0
      const wait = Math.max(turn, Math.max(equip, held && charge <= 0 ? held.cooldown : 0) + Math.max(0, full - charge))
      if (wait > horizon) return 0
      const shots = 1 + Math.floor((horizon - wait) / (full + cd))
      let score = shots * damage * (tr.hasMortar ? 1 + read('cookoff', 0.6) : 1)
      if (tr.hasLightning) {
        const lostTravel = me.walk * (1 - me.chargeMoveMult) * Math.max(0, full - charge) * shots
        score /= 1 + lostTravel / Math.max(5, tr.dist - value(cfg.weapons.lightning.range, 45))
      }
      return score
    }
    if (kind === 'lightning') {
      const wait = Math.max(turn, equip, held ? held.cooldown : 0)
      if (wait > horizon) return 0
      const cost = Math.max(0.01, held ? held.energy : read('energy', 3))
      const shots = Math.min(1 + Math.floor((horizon - wait) / cd), Math.floor(Math.max(0, me.energy - reserve()) / cost))
      return shots * damage + (shots > 0 && tr.hasLaser && tr.charging ? damage : 0)
    }
    return 0
  }

  function pickup(kind, fallback) {
    if (!on() || !['gun', 'laser', 'lightning'].includes(kind)) return fallback
    refresh()
    if (answers.has(kind)) return answers.get(kind)
    const me = B.me
    let result = null
    if (me.weapons.some((w) => w && w.kind === kind)) { pending.delete(kind); answers.set(kind, null); return null }
    if (me.weapons.some((w) => !w)) { pending.delete(kind); result = fallback }
    else if (me.t - lastEquip < 4) pending.delete(kind)
    else if (!context) {
      pending.delete(kind)
      const slot = fallback && fallback.drop
      if ((slot === 0 || slot === 1) && !(me.weapons[slot].kind === 'laser' && me.weapons[slot].charge > 0)) result = fallback
    } else if (!B.zoneUrgent && (B.pressureActive || !B.mustDisengage) && (B.pressureActive || !(me.hpf < 0.3 && me.t - me.lastHurtT <= 3))) {
      const gain = capacity(kind, null, context)
      let slot = -1, bestGain = 0
      for (let i = 0; i < 2; i++) {
        const w = me.weapons[i]
        if (!w || (w.kind === 'laser' && w.charge > 0) || (!B.pressureActive && B.env !== 'FFA' && w.kind === 'gun')) continue
        const old = capacity(w.kind, w, context), advantage = gain - old * 1.25 - 60
        if (advantage > bestGain) { bestGain = advantage; slot = i }
      }
      if (slot >= 0) {
        let entry = pending.get(kind)
        if (!entry || entry.slot !== slot || entry.target !== context.id || me.t - entry.last > Math.max(0.3, decisionS() * 2.1)) {
          entry = { slot, target: context.id, since: me.t, last: me.t }; pending.set(kind, entry)
        }
        entry.last = me.t
        if (me.t - entry.since + 1e-6 >= (B.pressureActive ? decisionS() : 0.5)) result = { drop: slot }
      } else pending.delete(kind)
    } else pending.delete(kind)
    answers.set(kind, result)
    return result
  }

  function pickupLimits() {
    return { range: Math.max(0, Math.min(value(P.takeReach, 3.6), value(cfg.loot.pickup_radius, 4))),
      height: Math.max(0, Math.min(value(P.takeDz, 3.8), 4)) }
  }

  function preparePickups() {
    if (!on() || !B.pressureActive || B.me.weapons.some(w => !w)) return
    refresh()
    if (!context) return
    const me = B.me, limits = pickupLimits()
    const nearby = limits.range + Math.max(me.walk, me.boostSpeed) * Math.max(0.5, 2.1 * decisionS())
    for (const p of B.pickups.values()) {
      if (me.t - p.seen > 1.5 || Math.abs(p.z - me.z) > limits.height || Math.hypot(p.x - me.x, p.y - me.y) > nearby) continue
      pickup(p.kind, null)
    }
  }

  function dodgeSides(id) {
    if (!on() || P.weaponVariety !== true) return FORWARD
    if (!dodge.has(id)) {
      if (dodge.size >= 64) dodge.delete(dodge.keys().next().value)
      dodge.set(id, rng() < 0.5 ? FORWARD : BACKWARD)
    }
    return dodge.get(id)
  }

  return { on, turnMult, slew, laserAim, energyOk, legal, nearestLightning, lightningAligned, interruptAim, capacity, pickup, pickupLimits, preparePickups, dodgeSides }
}
