// Layer 1: senses, tracks and bookkeeping. Turns one observation into the brain's world model.
// Every field of the observation may be missing, null, NaN or absurdly large: nothing here trusts its input.

import { angDiff, clamp, shellImpact, wrapPi } from './aim.js'

const BIG = 1e5
export const fnum = (v, d = 0) => (typeof v === 'number' && v === v && v > -BIG * 1e3 && v < BIG * 1e3 ? v : d)
const cnum = (v, d, lo, hi) => { const x = fnum(v, d); return x < lo ? lo : x > hi ? hi : x }
const isArr = Array.isArray
const RING = 16

export function vecOk(a, n) {
  if (!isArr(a) || a.length < n) return false
  for (let i = 0; i < n; i++) { const v = a[i]; if (typeof v !== 'number' || !(v > -BIG && v < BIG)) return false }
  return true
}

function newRing() { return { t: new Float64Array(RING), a: new Float32Array(RING), i: 0, n: 0 } }
function ringPush(r, t, a) { r.t[r.i] = t; r.a[r.i] = a; r.i = (r.i + 1) % RING; if (r.n < RING) r.n++ }
/** Sum of the amounts newer than t0; the sample count is left in ringSum.count. */
export function ringSum(r, t0) {
  let s = 0, c = 0
  for (let k = 0; k < r.n; k++) if (r.t[k] >= t0) { s += r.a[k]; c++ }
  ringSum.count = c
  return s
}
ringSum.count = 0

export function newSelf(cfg) {
  const m = cfg.mech
  return {
    id: -1, t: 0, dt: 0.1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, speed: 0,
    hp: m.hp, maxHp: m.hp, hpf: 1, energy: m.energy, maxEnergy: m.energy, grounded: true, cubes: 0, inZone: true,
    radius: m.radius, height: m.height, eyeH: m.eye_height, muzzleH: m.muzzle_height,
    walk: m.walk_speed, boostSpeed: m.boost_speed, accel: m.ground_accel, turnRate: m.turn_rate, pitchRate: m.pitch_rate,
    minPitch: m.min_pitch, maxPitch: m.max_pitch, regenDelay: m.regen_delay, regenPerS: m.regen_per_s,
    chargeMoveMult: m.charge_move_mult, rearMult: m.rear_mult, dmgMult: 1,
    weapons: [null, null], gun: null, laser: null, lightning: null, mortar: null,
    dmgIn: newRing(), lastHurtT: -99, lastHurtBearing: 0, lastHurtBy: -1, lastDealtT: -99, lastShotT: -99,
    hasPos: false, upgrades: 0, lastShotAtT: -99,
  }
}

function newTrack(id, kind) {
  return {
    id, kind, npc: kind === 'npc', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, evx: 0, evy: 0, yaw: 0, pitch: 0,
    hp: 1400, maxHp: 1400, cubes: 0, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false,
    charging: false, chargeT0: -99, chargeYaw0: 0, radius: 2.5, height: 9, muzzleH: 7,
    firstSeen: 0, lastSeen: -99, listed: false, phantom: false, envT: -99, rearOn: false, secure: false, conf: 0, dist: 1e9, bearing: 0, aimAtMe: false,
    perpSign: 0, revT: new Float64Array(4), revI: 0, revs: 0,
    steadySince: 0, pvx: 0, pvy: 0, airborne: false, airT0: -99, hostileAimT: -99, hostile: false,
    magN: 0, lastBulletT: -99, magStartT: -99, chargeAtMeT: -99,
    dmgIn: newRing(), dmgOut: newRing(), lastDmgInT: -99, lastDmgOutT: -99, dmgInD: 1e9, nearHostT: -99,
    losOut: false, losIn: false, losInT: -99, losOutT: -99, a: 0, b: 0, tau: 1e9, index: 0, hpPrev: 1400, hpPrevT: 0,
    // FFA bookkeeping (read only while B.env === 'FFA'; written in every posture, never used by SQUAD decisions)
    cxMult: 1, aimN: 0, chargeFirst: false, flagDropT: -99, flagSeenT: -99, lastBeamT: -99, chargeMeas: 0, chargeMeasCubes: -1,
    busyWith: -1, busySince: -99, busyLastT: -99, busyLastWith: -1, duelWonT: -99, thirdExitT: -99, thirdT: -99, peekT0: -99, closeSince: -1, cubesKnown: false,
    twoOkT: -99,                                                       // R3a2 Z8 (FFA only)
  }
}

function senseSelf(B, obs) {
  const me = B.me, cfg = B.cfg, m = cfg.mech, s = (obs.self && typeof obs.self === 'object') ? obs.self : {}
  const t = fnum(obs.t, me.t + 0.1)
  me.dt = clamp(t - me.t, 0.05, 1)
  if (!(t > me.t)) me.dt = 0.1
  me.t = t
  if (Number.isInteger(s.id)) me.id = s.id
  if (vecOk(s.pos, 3)) { me.x = s.pos[0]; me.y = s.pos[1]; me.z = s.pos[2]; me.hasPos = true }
  if (vecOk(s.vel, 2)) { me.vx = s.vel[0]; me.vy = s.vel[1]; me.vz = fnum(s.vel[2], 0) } else { me.vx = me.vy = me.vz = 0 }
  me.speed = Math.hypot(me.vx, me.vy)
  if (vecOk(s.aim, 2)) { me.yaw = wrapPi(s.aim[0]); me.pitch = clamp(s.aim[1], -1.57, 1.57) }
  me.maxHp = cnum(s.max_hp, me.maxHp, 1, 1e6)
  me.hp = cnum(s.hp, me.hp, 0, 1e6)
  me.hpf = clamp(me.hp / me.maxHp, 0, 1)
  me.maxEnergy = cnum(s.max_energy, me.maxEnergy, 1, 1e5)
  me.energy = cnum(s.energy, me.energy, 0, 1e5)
  me.grounded = s.grounded !== false
  const cubes = cnum(s.cubes, me.cubes, 0, 1000)
  me.inZone = s.in_zone !== false
  me.upgrades = isArr(s.upgrades) ? s.upgrades.length : me.upgrades
  const st = (s.stats && typeof s.stats === 'object') ? s.stats : {}
  const scale = 1 + fnum(cfg.cubes.size_per_cube, 0.05) * cubes
  // the protocol only promises eye / muzzle height in stats: the body never counts smaller than the cube formula
  me.radius = Math.max(cnum(st.radius, 0, 0, 30), Math.min(30, m.radius * scale))
  me.height = Math.max(cnum(st.height, 0, 0, 100), Math.min(100, m.height * scale))
  me.eyeH = cnum(st.eye_height, m.eye_height * scale, 0.5, 100)
  me.muzzleH = cnum(st.muzzle_height, m.muzzle_height * scale, 0.5, 100)
  me.walk = cnum(st.walk_speed, m.walk_speed, 1, 100)
  me.boostSpeed = cnum(st.boost_speed, m.boost_speed, 1, 200)
  me.accel = cnum(st.ground_accel, m.ground_accel, 1, 1000)
  me.turnRate = cnum(st.turn_rate, m.turn_rate, 0.1, 100)
  me.pitchRate = cnum(st.pitch_rate, m.pitch_rate, 0.1, 100)
  me.minPitch = cnum(st.min_pitch, m.min_pitch, -1.57, 0)
  me.maxPitch = cnum(st.max_pitch, m.max_pitch, 0, 1.57)
  me.regenDelay = cnum(st.regen_delay, m.regen_delay, 0, 100)
  me.regenPerS = cnum(st.regen_per_s, m.regen_per_s, 0, 1e4)
  me.chargeMoveMult = cnum(st.charge_move_mult, m.charge_move_mult, 0.05, 1)
  me.rearMult = cnum(st.rear_mult, m.rear_mult, 1, 10)
  me.dmgMult = 1 + fnum(cfg.cubes.damage_per_cube, 0.04) * Math.min(cubes, fnum(cfg.cubes.stat_cap, 10))
  if (cubes !== me.cubes || B.bodyR !== me.radius) {
    me.cubes = cubes
    if (B.nav && B.bodyR !== me.radius) { try { B.nav.setBody(me.radius, me.height) } catch { /* keep the old body */ } }
    B.bodyR = me.radius
  }

  // weapons
  me.gun = me.laser = me.lightning = me.mortar = null
  const ws = isArr(s.weapons) ? s.weapons : []
  for (let i = 0; i < 2; i++) {
    const w = ws[i]
    if (!w || typeof w !== 'object' || typeof w.kind !== 'string') { me.weapons[i] = null; continue }
    let o = me.weapons[i]
    if (!o || o.kind !== w.kind) o = me.weapons[i] = { kind: w.kind, slot: i, cooldown: 0, ammo: 0, reload: 0, charge: 0, st: null, prevAmmo: -1, fullSince: -1, heldT: 0 }
    const base = cfg.weapons[w.kind] || {}
    const ws2 = (w.stats && typeof w.stats === 'object') ? w.stats : base
    o.st = ws2
    o.cooldown = cnum(w.cooldown, 0, 0, 100)
    o.reload = cnum(w.reload, 0, 0, 100)
    o.charge = cnum(w.charge, 0, 0, 100)
    o.damage = cnum(ws2.damage, fnum(base.damage, 0), 0, 1e5)
    o.range = cnum(ws2.range, fnum(base.range, 0), 0, 1e5)
    o.cd = cnum(ws2.cooldown, fnum(base.cooldown, 0.25), 0.01, 100)
    if (w.kind === 'gun') {
      o.mag = cnum(ws2.mag, fnum(base.mag, 12), 1, 1000)
      o.prevAmmo = o.ammo
      o.ammo = cnum(w.ammo, o.mag, 0, 1000)
      o.speed = cnum(ws2.speed, fnum(base.speed, 252), 5, 1e5)
      o.reloadS = cnum(ws2.reload, fnum(base.reload, 2.4), 0, 100)
      o.spread = cnum(ws2.spread_deg, fnum(base.spread_deg, 0.6), 0, 30) * Math.PI / 180
      o.dps = o.damage * o.mag / Math.max(0.05, (o.mag - 1) * o.cd + o.reloadS)
      if (!me.gun) me.gun = o
    } else if (w.kind === 'laser') {
      o.full = cnum(ws2.charge ?? ws2.charge_s, fnum(base.charge, 0.75), 0.01, 30)
      o.minFrac = cnum(ws2.min_frac, fnum(base.min_frac, 0.35), 0, 1)
      o.holdS = cnum(ws2.hold_s, fnum(base.hold_s, 2), 0, 60)
      o.cookoff = cnum(ws2.cookoff, fnum(base.cookoff, 0.6), 0, 10)
      o.dps = o.damage / Math.max(0.1, o.full + o.cd)
      if (!me.laser) me.laser = o
    } else if (w.kind === 'lightning') {
      o.cone = cnum(ws2.cone_deg, fnum(base.cone_deg, 30), 1, 360) * Math.PI / 180
      o.energy = cnum(ws2.energy, fnum(base.energy, 3), 0, 1000)
      o.dps = o.damage / o.cd
      if (!me.lightning) me.lightning = o
    } else if (w.kind === 'mortar') {
      o.speed = cnum(ws2.speed, fnum(base.speed, 72), 5, 1e4)
      o.gravity = cnum(ws2.gravity, fnum(base.gravity, 22), 0.1, 1e3)
      o.splashR = cnum(ws2.splash_radius, fnum(base.splash_radius, 7), 0, 100)
      o.dps = 60
      if (!me.mortar) me.mortar = o
    }
  }
}

function senseTracks(B, obs) {
  const me = B.me, P = B.P, cfg = B.cfg, t = me.t, tracks = B.tracks
  for (const tr of tracks.values()) tr.listed = false
  const list = isArr(obs.mechs) ? obs.mechs : []
  const n = Math.min(list.length, 48)
  const sizePer = fnum(cfg.cubes.size_per_cube, 0.05)
  const bd = B.world ? B.world.bounds : null, pad = P.boundsPad
  for (let k = 0; k < n; k++) {
    const m = list[k]
    if (!m || typeof m !== 'object' || !Number.isInteger(m.id) || m.id === me.id || !vecOk(m.pos, 3)) continue
    const kind = m.kind === 'npc' ? 'npc' : 'mech'
    let tr = tracks.get(m.id)
    if (!tr) {
      if (tracks.size >= 64) continue
      tr = newTrack(m.id, kind); tr.firstSeen = t; tracks.set(m.id, tr)
      tr.evx = vecOk(m.vel, 2) ? m.vel[0] : 0; tr.evy = vecOk(m.vel, 2) ? m.vel[1] : 0
      if (kind === 'mech') B.everSawMech = true
    }
    const gap = t - tr.lastSeen > 0.35
    tr.listed = true; tr.lastSeen = t; tr.phantom = false
    tr.x = m.pos[0]; tr.y = m.pos[1]; tr.z = m.pos[2]
    if (bd) { tr.x = clamp(tr.x, bd.minX - pad, bd.maxX + pad); tr.y = clamp(tr.y, bd.minY - pad, bd.maxY + pad); tr.z = clamp(tr.z, -500, 1500) }
    if (vecOk(m.vel, 2)) { tr.vx = m.vel[0]; tr.vy = m.vel[1]; tr.vz = fnum(m.vel[2], 0) } else { tr.vx = tr.vy = tr.vz = 0 }
    // steadiness (D2 long-flight gate) and airborne state (ballistic lead)
    if (gap || Math.hypot(tr.vx - tr.pvx, tr.vy - tr.pvy) > P.steadyDv * Math.min(1, me.dt / 0.1)) tr.steadySince = t
    tr.pvx = tr.vx; tr.pvy = tr.vy
    const gz = B.groundFn ? B.groundFn(tr.x, tr.y) : tr.z
    const air = Math.abs(tr.vz) > 0.5 || tr.z - gz > 0.6
    if (air && !tr.airborne) tr.airT0 = t
    tr.airborne = air
    if (gap) { tr.hpPrevT = -99 }
    tr.evx += P.velEma * (tr.vx - tr.evx); tr.evy += P.velEma * (tr.vy - tr.evy)
    if (vecOk(m.aim, 2)) { tr.yaw = wrapPi(m.aim[0]); tr.pitch = m.aim[1] }
    tr.maxHp = cnum(m.max_hp, tr.npc ? fnum(cfg.npc.hp, 350) : tr.maxHp, 1, 1e6)
    const hp = cnum(m.hp, tr.hp > tr.maxHp ? tr.maxHp : tr.hp, 0, 1e6)
    if (tr.hpPrevT < 0) { tr.hpPrev = hp; tr.hpPrevT = t }
    else if (t - tr.hpPrevT >= 0.45) { tr.hpPrev = tr.hp; tr.hpPrevT = t }
    tr.hp = hp
    tr.cubes = cnum(m.cubes, 0, 0, 1000)
    tr.cubesKnown = typeof m.cubes === 'number'
    const sc = 1 + sizePer * tr.cubes
    if (tr.npc) { tr.radius = fnum(cfg.npc.radius, 1.8); tr.height = fnum(cfg.npc.height, 3.5); tr.muzzleH = tr.height * 0.8 }
    else { tr.radius = cfg.mech.radius * sc; tr.height = cfg.mech.height * sc; tr.muzzleH = cfg.mech.muzzle_height * sc }
    if (isArr(m.weapons)) {
      tr.hasGun = m.weapons.includes('gun'); tr.hasLaser = m.weapons.includes('laser')
      tr.hasLightning = m.weapons.includes('lightning'); tr.hasMortar = m.weapons.includes('mortar')
    }
    const ch = m.charging === true
    if (ch && !tr.charging) { tr.chargeT0 = t; tr.chargeYaw0 = tr.yaw; tr.chargeFirst = !gap }
    if (!ch && tr.charging && !gap) tr.flagDropT = t
    if (ch) tr.flagSeenT = t
    tr.charging = ch
  }
  // derived quantities, dead reckoning and forgetting
  const aimTol = P.aimAtMeDeg * Math.PI / 180
  for (const tr of tracks.values()) {
    const age = t - tr.lastSeen
    if (!tr.listed) {
      if (age > P.trackForget || (tr.npc && age > 6)) { tracks.delete(tr.id); continue }
      if (age <= P.trackDeadReckon) { tr.x += tr.vx * me.dt; tr.y += tr.vy * me.dt } else { tr.vx = tr.vy = tr.vz = 0; tr.evx = tr.evy = 0 }
      tr.charging = false
    }
    tr.conf = tr.listed ? 1 : Math.exp(-age / 4)
    const dx = tr.x - me.x, dy = tr.y - me.y
    tr.dist = Math.hypot(dx, dy, tr.z - me.z)
    tr.bearing = Math.atan2(dy, dx)
    tr.aimAtMe = tr.listed && Math.abs(angDiff(wrapPi(tr.bearing + Math.PI), tr.yaw)) < aimTol
    if (tr.listed && tr.dist > 1) {
      const h = Math.hypot(dx, dy) || 1
      const perp = (-dy * tr.vx + dx * tr.vy) / h
      if (Math.abs(perp) > P.revMinPerp) {
        const sg = perp > 0 ? 1 : -1
        if (tr.perpSign !== 0 && sg !== tr.perpSign) { tr.revT[tr.revI] = t; tr.revI = (tr.revI + 1) & 3 }
        tr.perpSign = sg
      }
    }
    let rv = 0
    for (let k = 0; k < 4; k++) if (tr.revT[k] > 0 && t - tr.revT[k] <= P.revWindow) rv++
    tr.revs = rv
  }
}

function senseEvents(B, obs) {
  const me = B.me, t = me.t, ev = isArr(obs.events) ? obs.events : []
  const n = Math.min(ev.length, 64)
  for (let k = 0; k < n; k++) {
    const e = ev[k]
    if (!e || typeof e !== 'object') continue
    if (e.type === 'damaged') {
      const amt = cnum(e.amount, 0, 0, 1e5)
      ringPush(me.dmgIn, t, amt)
      me.lastHurtT = t
      B.counters.dmgIn += amt
      if (Number.isInteger(e.by)) {
        me.lastHurtBy = e.by
        if (typeof e.bearing === 'number' && e.bearing === e.bearing) me.lastHurtBearing = wrapPi(fnum(e.bearing, 0))
        let tr = B.tracks.get(e.by)
        if (!tr && e.by >= 0 && B.tracks.size < 64 && typeof e.bearing === 'number' && e.bearing === e.bearing) {
          // hit by something we have never seen: a phantom track on the damage bearing at a typical range
          const npc = e.by >= 100
          const gd = npc ? 40 : e.weapon === 'lightning' ? 35 : e.weapon === 'laser' ? 130 : e.weapon === 'mortar' ? 90 : 110
          tr = newTrack(e.by, npc ? 'npc' : 'mech'); tr.firstSeen = t; tr.phantom = true
          tr.x = me.x + Math.cos(me.lastHurtBearing) * gd; tr.y = me.y + Math.sin(me.lastHurtBearing) * gd; tr.z = me.z
          tr.hasGun = e.weapon === 'gun'; tr.hasLaser = e.weapon === 'laser'; tr.hasLightning = e.weapon === 'lightning'; tr.hasMortar = e.weapon === 'mortar'
          if (npc) { tr.maxHp = tr.hp = fnum(B.cfg.npc.hp, 350); tr.radius = 1.8; tr.height = 3.5; tr.muzzleH = 2.8 }
          B.tracks.set(e.by, tr)
        }
        if (tr) {
          ringPush(tr.dmgIn, t, amt); tr.lastDmgInT = t
          if (!tr.listed) {
            // not in view but shooting us: keep it alive as a threat near its last known place
            if (tr.phantom) { tr.x += (me.x + Math.cos(me.lastHurtBearing) * Math.hypot(tr.x - me.x, tr.y - me.y) - tr.x) * 0.5; tr.y += (me.y + Math.sin(me.lastHurtBearing) * Math.hypot(tr.x - me.x, tr.y - me.y) - tr.y) * 0.5 }
            if (t - tr.lastSeen > 2.5) tr.lastSeen = t - 2.5
            B.unseenHurtT = t; B.unseenHurtBearing = me.lastHurtBearing
          }
        } else { B.unseenHurtT = t; B.unseenHurtBearing = me.lastHurtBearing }
        if (e.by >= 0) me.lastShotAtT = t
        if (e.rear === true) B.rearHitT = t
        if (e.by >= 0 && e.by < 100) B.attackers.add(e.by)
      }
    } else if (e.type === 'hit') {
      const amt = cnum(e.amount, 0, 0, 1e5)
      me.lastDealtT = t
      B.counters.dmgOut += amt
      const tr = Number.isInteger(e.target) ? B.tracks.get(e.target) : null
      if (tr) { ringPush(tr.dmgOut, t, amt); tr.lastDmgOutT = t }
      if (e.weapon === 'gun' && tr && !tr.npc) B.gunStat.hit(tr.dist)
      if (e.weapon === 'laser') B.counters.laserHits++
    } else if (e.type === 'kill') {
      B.counters.kills++
      B.lastKillT = t
      const tr = Number.isInteger(e.target) ? B.tracks.get(e.target) : null
      if (tr) {
        B.lastKillX = tr.x; B.lastKillY = tr.y; B.tracks.delete(tr.id)
        B.killDrops.push({ x: tr.x, y: tr.y, t }); if (B.killDrops.length > 6) B.killDrops.shift()
      }
      if (B.target && tr && B.target.id === tr.id) B.target = null
      B.ourKills.add(e.target)
    } else if (e.type === 'take_failed') {
      if (Number.isInteger(e.id) && (e.reason === 'have' || e.reason === 'full' || e.reason === 'gone')) {
        B.badPickups.set(e.id, t); if (e.reason === 'gone') B.pickups.delete(e.id)
      }
    } else if (e.type === 'took') {
      if (Number.isInteger(e.id)) B.pickups.delete(e.id)
    }
  }
}

/** E10: a beam that ends on us from a mech we do not list -> phantom attacker at the beam's origin. */
function senseBeams(B, obs) {
  const me = B.me, t = me.t, list = isArr(obs.beams) ? obs.beams : []
  for (let k = 0; k < Math.min(list.length, 16); k++) {
    const b = list[k]
    if (!b || typeof b !== 'object' || !Number.isInteger(b.by) || b.by === me.id || !isArr(b.path) || b.path.length < 2) continue
    if (b.kind === 'laser') laserBeamSeen(B, b, t)
    const s = b.path[0], e = b.path[b.path.length - 1]
    if (!vecOk(s, 3) || !vecOk(e, 3) || Math.hypot(e[0] - me.x, e[1] - me.y) > 8) continue
    let tr = B.tracks.get(b.by)
    if (tr && tr.listed) continue
    if (!tr) { if (B.tracks.size >= 64) continue; tr = newTrack(b.by, 'mech'); tr.firstSeen = t; tr.phantom = true; B.tracks.set(b.by, tr) }
    tr.x = s[0]; tr.y = s[1]; tr.z = s[2] - (B.cfg.mech.muzzle_height || 7)
    if (b.kind === 'laser') tr.hasLaser = true; else if (b.kind === 'lightning') tr.hasLightning = true
    if (t - tr.lastSeen > 2.5) tr.lastSeen = t - 2.5
    B.unseenHurtT = t; B.unseenHurtBearing = Math.atan2(s[1] - me.y, s[0] - me.x)
  }
}

/**
 * Dossier rule 1 / M12 bookkeeping (decision-neutral; read only in FFA): the time of each listed mech's laser beam and,
 * when its flag was seen from its first tick, the measured charge time (the shortest since its cube count last changed).
 */
function laserBeamSeen(B, b, t) {
  const tr = B.tracks.get(b.by)
  if (!tr || tr.npc) return
  const bt = t - cnum(b.age, 0, 0, 2)
  if (bt - tr.lastBeamT <= 0.3) return
  tr.lastBeamT = bt
  const d = bt - tr.chargeT0
  if (tr.chargeFirst && d >= 0.1 && d <= 4) {
    if (tr.chargeMeasCubes !== tr.cubes) { tr.chargeMeas = d; tr.chargeMeasCubes = tr.cubes } else if (d < tr.chargeMeas) tr.chargeMeas = d
  }
  tr.chargeFirst = false
}

function remember(map, list, t, withKind) {
  if (!isArr(list)) return
  const n = Math.min(list.length, 64)
  for (let k = 0; k < n; k++) {
    const o = list[k]
    if (!o || typeof o !== 'object' || !Number.isInteger(o.id) || !vecOk(o.pos, 3)) continue
    let r = map.get(o.id)
    if (!r) {
      if (map.size >= 128) { const first = map.keys().next().value; map.delete(first) }
      r = { id: o.id, x: 0, y: 0, z: 0, hp: 300, kind: '', seen: t, first: t, miss: 0 }
      map.set(o.id, r)
    }
    r.x = o.pos[0]; r.y = o.pos[1]; r.z = o.pos[2]; r.seen = t; r.miss = 0
    if (typeof o.hp === 'number') r.hp = fnum(o.hp, 300)
    if (withKind) r.kind = typeof o.kind === 'string' ? o.kind : ''
  }
}

function forget(B, map) {
  const me = B.me, P = B.P, t = me.t, w = B.world
  const near = fnum(B.cfg.vision.near_range, 45), half = fnum(B.cfg.vision.fov_deg, 120) * Math.PI / 360
  for (const r of map.values()) {
    if (r.seen === t) continue
    if (t - r.seen > P.objForget) { map.delete(r.id); continue }
    const dx = r.x - me.x, dy = r.y - me.y, d = Math.hypot(dx, dy)
    if (d > P.objNear) continue
    const inView = d < near - 2 || Math.abs(angDiff(me.yaw, Math.atan2(dy, dx))) < half - 0.1
    if (!inView) continue
    if (w && !w.canSee(me.x, me.y, me.z + me.eyeH, r.x, r.y, r.z + 1)) continue
    if (++r.miss >= 3) map.delete(r.id)
  }
}

function senseShells(B, obs) {
  const me = B.me, t = me.t, shells = B.shells, w = B.world
  for (const s of shells.values()) if (s.t < t - 0.2) shells.delete(s.id)
  const list = isArr(obs.projectiles) ? obs.projectiles : []
  const n = Math.min(list.length, 64)
  const g = fnum(B.cfg.weapons.mortar && B.cfg.weapons.mortar.gravity, 22)
  const gf = w ? B.groundFn : () => me.z
  let bullets = 0
  const bl = B.bullets
  for (const b of bl.values()) if (b.t < t - 0.15) bl.delete(b.id)
  for (let k = 0; k < n; k++) {
    const p = list[k]
    if (!p || typeof p !== 'object' || !vecOk(p.pos, 3) || !vecOk(p.vel, 3)) continue
    if (p.kind !== 'mortar') {
      bullets++
      if (!Number.isInteger(p.id) || (bl.size >= 32 && !bl.has(p.id))) continue
      let b = bl.get(p.id)
      if (!b) { b = { id: p.id, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t, npc: p.kind === 'npc' }; bl.set(p.id, b); if (!b.npc) attribute(B, p) }
      b.x = p.pos[0]; b.y = p.pos[1]; b.z = p.pos[2]; b.vx = p.vel[0]; b.vy = p.vel[1]; b.vz = p.vel[2]; b.t = t
      continue
    }
    if (shells.size >= 12 && !shells.has(p.id)) continue
    const im = shellImpact(p.pos[0], p.pos[1], p.pos[2], p.vel[0], p.vel[1], p.vel[2], g, gf, 8, 0.05)
    shells.set(p.id, { id: p.id, x: im.x, y: im.y, t: t + im.t })
  }
  B.bulletsSeen = bullets
}

/** First sight of an enemy gun bullet: find the listed mech it came from (magazine rhythm, D4). */
function attribute(B, p) {
  const t = B.me.t, sp = Math.hypot(p.vel[0], p.vel[1], p.vel[2]) || 1
  const ux = p.vel[0] / sp, uy = p.vel[1] / sp
  let best = null, bestE = 6
  for (let k = 0; k < B.trackList.length; k++) {
    const tr = B.trackList[k]
    if (tr.npc || !tr.listed || !tr.hasGun) continue
    const dx = p.pos[0] - tr.x, dy = p.pos[1] - tr.y
    const along = dx * ux + dy * uy
    if (along < -3 || along > 60) continue
    const e = Math.abs(dx * uy - dy * ux)
    if (e < bestE) { bestE = e; best = tr }
  }
  if (!best) return
  if (t - best.lastBulletT >= B.P.magSilence) { best.magN = 0; best.magStartT = t; B.magStartT = t }
  best.magN++; best.lastBulletT = t
  // R6 IO12: fire time of this bullet (it is 3 m + one tick of travel out at the end of its fire tick) and the cadence
  const tk = 0.05, out = Math.max(0, (p.pos[0] - best.x) * ux + (p.pos[1] - best.y) * uy)
  const ft = t - Math.max(0, Math.round((out - 3) / (sp * tk)) - 1) * tk
  const gap = ft - (best.shotT1 || -99)
  if (gap > 0.17 && gap < 0.42) best.shotGap = gap
  else if (gap >= 0.42) best.shotGap = best.shotGap || 0.3
  best.shotT1 = ft
}

function senseSounds(B, obs) {
  const heard = B.heard, me = B.me
  const dec = Math.pow(0.977, me.dt / 0.1)
  for (let i = 0; i < 12; i++) heard[i] *= dec
  const list = isArr(obs.sounds) ? obs.sounds : []
  const n = Math.min(list.length, 32)
  for (let k = 0; k < n; k++) {
    const s = list[k]
    if (!s || typeof s !== 'object' || typeof s.bearing !== 'number' || !(s.bearing === s.bearing)) continue
    const b = wrapPi(fnum(s.bearing, 0))
    const sec = ((Math.floor((b + Math.PI) / (Math.PI / 6)) % 12) + 12) % 12
    let wgt = s.dist === 'near' ? 1.5 : s.dist === 'mid' ? 1 : 0.3
    if (s.kind === 'step' || s.kind === 'reload') wgt = 3; else if (s.kind === 'boost' || s.kind === 'jet') wgt = 2
    else if (s.kind === 'death') { B.deathsHeard++; wgt = 0.5 }
    heard[sec] += wgt; heard[(sec + 1) % 12] += wgt * 0.5; heard[(sec + 11) % 12] += wgt * 0.5
  }
}

function senseZone(B, obs) {
  const z = B.zone, o = obs.zone
  if (!o || typeof o !== 'object' || !vecOk(o.center, 2)) return   // keep the last known zone
  z.known = true
  z.cx = o.center[0]; z.cy = o.center[1]; z.r = cnum(o.radius, 1e6, 0, 1e6)
  if (vecOk(o.next_center, 2)) { z.nx = o.next_center[0]; z.ny = o.next_center[1] } else { z.nx = z.cx; z.ny = z.cy }
  z.nr = cnum(o.next_radius, z.r, 0, 1e6)
  if (z.nr > z.r) z.nr = z.r
  z.t0 = fnum(o.shrink_start, 1e9); z.t1 = fnum(o.shrink_end, z.t0)
  if (z.t1 < z.t0) z.t1 = z.t0
  z.dps = cnum(o.dps, 20, 0, 1e5)
  // In the last phases we behave as if the next circle were smaller (stay near the centre).
  z.nrEff = z.nr <= B.P.zoneLateR ? z.nr * B.P.zoneLateFrac : z.nr
}

/** Radius-minus-distance (metres inside, negative = outside) of the point at absolute time tAbs. */
export function zoneSlack(B, x, y, tAbs) {
  const z = B.zone
  if (!z.known) return 1e6
  const now = B.me.t, start = Math.max(now, z.t0)
  let u = 0
  if (tAbs > start) u = z.t1 > start ? Math.min(1, (tAbs - start) / (z.t1 - start)) : 1
  const cx = z.cx + (z.nx - z.cx) * u, cy = z.cy + (z.ny - z.cy) * u, r = z.r + (Math.min(z.nrEff, z.r) - z.r) * u
  return r - Math.hypot(x - cx, y - cy)
}

/** Seconds until the point is outside the (shrinking) zone; Infinity when it is inside the next circle. */
export function timeUntilOutside(B, x, y, margin = 1) {
  const z = B.zone
  if (!z.known) return Infinity
  const now = B.me.t
  if (Math.hypot(x - z.nx, y - z.ny) <= z.nrEff - margin) {
    return zoneSlack(B, x, y, now) >= margin ? Infinity : 0
  }
  if (zoneSlack(B, x, y, now) < margin) return 0
  const end = Math.max(z.t1, now)
  for (let k = 1; k <= 240; k++) {
    const tt = now + k * 0.5
    if (tt >= end) break
    if (zoneSlack(B, x, y, tt) < margin) return tt - now - 0.5
  }
  return Math.max(0, end - now)
}

export function sense(B, obs) {
  senseSelf(B, obs)
  senseTracks(B, obs)
  senseEvents(B, obs)
  senseBeams(B, obs)
  const t = B.me.t
  remember(B.crates, obs.crates, t, false)
  remember(B.cubes, obs.cubes, t, false)
  remember(B.pickups, obs.pickups, t, true)
  if ((B.tick & 1) === 0) { forget(B, B.crates); forget(B, B.cubes); forget(B, B.pickups) }
  senseShells(B, obs)
  senseSounds(B, obs)
  senseZone(B, obs)
  // supply drops
  B.drops.length = 0
  if (isArr(obs.drops)) {
    for (let k = 0; k < Math.min(obs.drops.length, 8); k++) {
      const d = obs.drops[k]
      if (!d || typeof d !== 'object' || !vecOk(d.pos, 2)) continue
      B.drops.push({ id: fnum(d.id, 0), x: d.pos[0], y: d.pos[1], radius: cnum(d.radius, 8, 1, 100), landsIn: cnum(d.lands_in, 0, 0, 1e4),
        captureS: cnum(d.capture_s, 4, 0, 100), progress: cnum(d.progress, 0, 0, 100), holder: Number.isInteger(d.holder) ? d.holder : -1 })
    }
  }
  // our own shots (ammo decrements) feed the per-band accuracy statistic
  const g = B.me.gun
  if (g && g.prevAmmo > g.ammo && g.prevAmmo - g.ammo <= 3) {
    B.me.lastShotT = t
    B.counters.shots += g.prevAmmo - g.ammo
    if (B.target && !B.target.npc) B.gunStat.shot(B.target.dist, g.prevAmmo - g.ammo)
  }
  // live track list sorted by distance (reused array)
  const L = B.trackList
  L.length = 0
  for (const tr of B.tracks.values()) L.push(tr)
  L.sort(byDist)
}
const byDist = (a, b) => a.dist - b.dist

/** Per-25 m-band gun accuracy: prior until 12 shots were fired in the band. */
export function makeGunStat(P) {
  const shots = new Float32Array(12), hits = new Float32Array(12)
  const band = (d) => Math.max(0, Math.min(11, Math.floor(d / 25)))
  return {
    shot(d, n) { shots[band(d)] += n },
    hit(d) { hits[band(d)] += 1 },
    q(d) {
      const bins = P.rangeBins, pr = d < bins[0] ? P.qOut[0] : d < bins[1] ? P.qOut[1] : d < bins[2] ? P.qOut[2] : P.qOut[3]
      const k = band(d)
      if (shots[k] < 12) return pr
      const w = Math.min(1, shots[k] / 48)
      return clamp(pr * (1 - w) + (hits[k] / shots[k]) * w, 0.1, 1)
    },
    dump() { return { shots: Array.from(shots), hits: Array.from(hits) } },
  }
}
