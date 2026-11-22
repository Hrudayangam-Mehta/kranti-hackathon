// Layer 4: threat bookkeeping, target choice, finish-or-flee, mode selection, hide-cell search and the
// position evaluator. All geometry queries go through world/nav and are capped by ray budgets.

import { angDiff, clamp, wrapPi } from './aim.js'
import { MODE } from './params.js'
import { ringSum, zoneSlack } from './senses.js'

const HALF_PI = Math.PI / 2

function rangeBin(P, d, tab) {
  const b = P.rangeBins
  return d < b[0] ? tab[0] : d < b[1] ? tab[1] : d < b[2] ? tab[2] : d <= b[3] ? tab[3] : 0
}

/** Line-of-fire flags, dps estimates each way, aggregate threat numbers. */
export function assess(B) {
  const me = B.me, P = B.P, cfg = B.cfg, t = me.t, w = B.world, L = B.trackList
  const mz = me.z + me.muzzleH, cz = me.z + me.height * 0.5, hz = me.z + me.height * 0.9
  const gcfg = cfg.weapons.gun || {}, lcfg = cfg.weapons.laser || {}, licfg = cfg.weapons.lightning || {}
  const gunDpsCfg = (gcfg.damage || 45) * (gcfg.mag || 12) / Math.max(0.05, ((gcfg.mag || 12) - 1) * (gcfg.cooldown || 0.24) + (gcfg.reload || 2.4))
  const dpc = cfg.cubes.damage_per_cube || 0.04, cap = cfg.cubes.stat_cap || 10
  let A = 0, n1 = 0, nLos = 0, top = null, topDmg = 0, n120 = 0, nearestMech = null, lastLosIn = B.lastLosInT
  let threats = 0, threat1 = null, att3 = 0, anyHostile = false
  for (let k = 0; k < L.length; k++) {
    const tr = L[k]
    const recent = tr.listed || t - tr.lastSeen < 2
    if (recent) {
      if (w && k < 10) {
        const tcz = tr.z + tr.height * 0.5, tmz = tr.z + tr.muzzleH
        tr.losOut = tr.listed && (w.shotClear(me.x, me.y, mz, tr.x, tr.y, tcz) || w.shotClear(me.x, me.y, mz, tr.x, tr.y, tr.z + tr.height * 0.85))
        tr.losIn = w.shotClear(tr.x, tr.y, tmz, me.x, me.y, cz) || w.shotClear(tr.x, tr.y, tmz, me.x, me.y, hz)
      } else { tr.losOut = tr.listed; tr.losIn = tr.listed }
    } else { tr.losOut = false; tr.losIn = false }
    if (t - tr.lastDmgInT <= 0.6) tr.losIn = true          // it is hitting us: it has a line, seen or not
    if (tr.losOut) tr.losOutT = t
    if (tr.losIn) tr.losInT = t
    const d = tr.dist
    // ---- their dps on us
    const dmg3 = ringSum(tr.dmgIn, t - P.dmgWindow), cnt = ringSum.count
    const hurtRecently = t - tr.lastDmgInT <= 3
    let prior = 0
    if (tr.npc) {
      if (hurtRecently || d < (cfg.npc.aggro_range || 45)) prior = (cfg.npc.damage || 25) / (cfg.npc.cooldown || 1)
    } else {
      if (tr.hasGun && d <= (gcfg.range || 230)) prior += gunDpsCfg * rangeBin(P, d, P.pIn)
      if (tr.hasLaser && d <= (lcfg.range || 280)) prior += P.laserDpsIn
      if (tr.hasLightning && d < (licfg.range || 45) + me.radius) prior += P.lightDpsIn
      if (tr.hasMortar && d < 235 && d > 15) prior += P.mortarDpsIn
      prior *= 1 + dpc * Math.min(tr.cubes, cap)
      if (!tr.aimAtMe && !hurtRecently) prior *= 0.35
    }
    tr.a = cnt >= P.dmgMinSamples ? dmg3 / P.dmgWindow : prior * (tr.losIn ? 1 : 0) * tr.conf
    const losRecent = t - tr.losInT <= P.losMemory
    if (losRecent && (!tr.npc || hurtRecently)) { A += tr.a; if (!tr.npc) nLos++ }
    if (tr.losIn && !tr.npc) lastLosIn = t
    if (!tr.npc) {
      if (t - tr.losInT <= P.n1Window && (tr.aimAtMe || hurtRecently)) { n1++; if (!threat1 || tr.a > threat1.a) threat1 = tr }
      if (d < 120 && tr.conf > 0.3) n120++
      if (!nearestMech && tr.conf > 0.3) nearestMech = tr
      // D0 hostility: damaged us in the last 4 s, or aims within 12 deg of us with a line of fire inside 160 m
      if (tr.aimAtMe && tr.losIn && d <= P.hostileAimR) tr.hostileAimT = t
      if (tr.charging && tr.aimAtMe && tr.losIn) tr.chargeAtMeT = t
      tr.hostile = t - tr.lastDmgInT <= P.hostileDmgS || t - tr.hostileAimT <= P.hostileAimMemS
      if (tr.hostile) anyHostile = true
      if (t - tr.lastDmgInT <= 3) att3++
    }
    if (dmg3 > topDmg) { topDmg = dmg3; top = tr }
    // ---- our dps on it
    let b = 0
    if (me.gun && d <= me.gun.range) b += me.gun.dps * B.gunStat.q(d) * me.dmgMult
    if (me.laser && d <= me.laser.range) b += me.laser.dps * P.laserHeldFrac * me.dmgMult * (tr.hasMortar ? 1 + me.laser.cookoff : 1)
    if (me.lightning && d <= me.lightning.range) b += me.lightning.dps * me.dmgMult
    tr.rearOn = !tr.npc && Math.abs(angDiff(wrapPi(tr.bearing + Math.PI), tr.yaw)) > HALF_PI
    if (tr.rearOn) b *= P.rearMult
    if (b < 1) b = 1
    tr.b = b
    tr.tau = Math.max(1, tr.hp) / b
  }
  threats = n1
  B.A = A; B.n1 = n1; B.nLos = nLos; B.n120 = n120; B.nearestMech = nearestMech
  B.threats = threats; B.threat1 = threat1; B.attackers3 = att3
  if (anyHostile || nLos > 0 || t - me.lastHurtT <= 1) B.lastContactT = t
  if (nLos > 0 || att3 > 0) B.lastMechContactT = t
  B.bandHi = bandFor(B).hi
  // FFA (D11): no voluntary fight before 90 s; afterwards only finishable or wounded, busy mechs
  B.ffaOpen = t >= P.ffaQuietS
  if (nearestMech && nearestMech.listed) {
    if (!B.lastEnemy) B.lastEnemy = { x: 0, y: 0, t: 0 }
    B.lastEnemy.x = nearestMech.x; B.lastEnemy.y = nearestMech.y; B.lastEnemy.t = t
  }
  B.lastLosInT = lastLosIn
  B.topAttacker = top && t - top.lastDmgInT <= P.faceAttackerS ? top : null
}

/** D2 range band for the current loadout: { hold, lo, hi, backStick, boostAway } */
const bandOut = { hold: 75, lo: 55, hi: 95, backStick: 0.7, boostAway: 0, kind: 'gun' }
export function bandFor(B) {
  const me = B.me, P = B.P, o = bandOut
  if (me.laser) {
    o.kind = 'laser'; o.hold = P.rPrefLaser; o.lo = Math.min(P.laserLo, P.rPrefLaser); o.hi = Math.max(P.laserHi, P.rPrefLaser)
    o.backStick = 1; o.boostAway = P.laserBoostAway
  } else if (me.lightning && !me.laser) {
    o.kind = 'lightning'; o.hold = P.rPrefGun; o.lo = Math.min(P.bandLo, P.rPrefGun); o.hi = Math.max(P.bandHi, P.rPrefGun); o.backStick = P.gunBackStick; o.boostAway = 0
  } else {
    o.kind = 'gun'; o.hold = P.rPrefGun; o.lo = Math.min(P.bandLo, P.rPrefGun); o.hi = Math.max(P.bandHi, P.rPrefGun); o.backStick = P.gunBackStick; o.boostAway = 0
  }
  if (me.gun && o.hold > me.gun.range * 0.95 && !me.laser) { o.hold = me.gun.range * 0.9; o.hi = Math.min(o.hi, me.gun.range * 0.95) }
  return o
}

const candBuf = []
/** Expected damage of what we can still fire at it right now: rest of the magazine at the band hit rate + a ready beam. */
function burstDamage(B, tr) {
  const me = B.me, g = me.gun, lz = me.laser
  let d = 0
  const rm = tr.rearOn ? me.rearMult : 1
  if (g && tr.dist <= g.range) d += (g.reload > 0 ? 0 : g.ammo) * g.damage * me.dmgMult * B.gunStat.q(tr.dist) * rm
  if (lz && tr.dist <= lz.range && (lz.cooldown <= 0.3 || lz.charge > 0)) d += lz.damage * me.dmgMult * rm * (tr.hasMortar ? 1 + lz.cookoff : 1)
  return d
}

/**
 * D5 target choice. Candidates: hostile mechs (D0), mechs inside our band + 40 m, anything after 20 s unengaged at
 * hp >= 90% (never a non-hostile mech in the first 40 s). Score: nearest first, x2 finishable by the current burst,
 * x1.6 the mech that hit us in the last 3 s, x1.3 the current target; a target under 25% hp is never dropped for a
 * fresh one. Drones only when no mech is in contact (or the drone is a kill-secure and the mech is not).
 * The torso veto is a target rule: an attacker of >= 60 dps more than 80 deg off the target takes over, unless the
 * target is finishable / under 25% (kept for up to 1.5 s).
 */
export function selectTarget(B) {
  const me = B.me, P = B.P, t = me.t, L = B.trackList
  const ffa = B.env === 'FFA'
  const opening = t < P.openingS
  const unengaged = t - B.lastContactT >= P.unengagedS && me.hpf >= P.unengagedHpf && !opening && !ffa
  const band = B.bandHi + P.candExtra
  const contact = t - B.lastMechContactT <= 3
  candBuf.length = 0
  for (let k = 0; k < L.length && candBuf.length < 12; k++) {
    const tr = L[k]
    if (!tr.listed && (tr.phantom || t - tr.lastSeen > P.blindFireS)) continue
    if (tr.hp <= 0) continue
    if (tr.npc) {
      const hitUs = t - tr.lastDmgInT <= 3
      if (!hitUs && B.farmNpc !== tr.id) continue
      if (B.mode === MODE.HEAL && !hitUs) continue
      tr.cand = true
    } else {
      tr.finishable = burstDamage(B, tr) >= tr.hp
      const ok = tr.hostile || (!opening && !ffa && tr.dist <= band) || unengaged || (tr === B.target && t - tr.lastDmgOutT < 5) ||
        (ffa && B.ffaOpen && (tr.finishable || (tr.hp < 0.5 * tr.maxHp && !tr.aimAtMe)))
      if (!ok) continue
    }
    candBuf.push(tr)
  }
  if (candBuf.length === 0) { setTarget(B, null); B.killSecure = false; return }
  const cur = B.target
  let best = null, bestS = -Infinity, bestMech = null, bestMechS = -Infinity
  for (let k = 0; k < candBuf.length; k++) {
    const tr = candBuf[k]
    let s = 100 / (tr.dist + 20)
    if (tr.npc) {
      tr.finishable = me.gun ? tr.hp <= P.killSecureHits * me.gun.damage * me.dmgMult : false
      s *= P.wDrone
    }
    if (tr.finishable) s *= P.wFinish
    if (t - tr.lastDmgInT <= 3) s *= P.wAttacker
    if (tr === cur) s *= P.wStick
    if (!tr.losOut) s *= P.wNoLos
    if (me.laser && tr.hasMortar) s *= 1.15
    if (B.lastStand && !tr.npc) s *= tr.maxHp / Math.max(50, tr.hp)        // last stand: the quickest kill
    tr.secure = tr.finishable && tr.losOut
    tr.index = s
    if (s > bestS) { bestS = s; best = tr }
    if (!tr.npc && s > bestMechS) { bestMechS = s; bestMech = tr }
  }
  // drones are lexicographically below mechs in contact
  if (best && best.npc && bestMech && (contact || bestMech.hostile) && !(best.finishable && !bestMech.finishable)) best = bestMech
  let pick = best
  if (cur && cur !== best && B.tracks.get(cur.id) === cur && candBuf.includes(cur) && !cur.npc) {
    // never leave a target under 25% hp for a fresh one while it is still in sight (or out of it for under 2 s)
    if (cur.hp < P.keepTargetHpf * cur.maxHp && t - cur.losOutT <= P.keepNoLosS && !(best && best.finishable && !cur.finishable)) pick = cur
  }
  // torso veto as a target rule
  let att = null
  for (let k = 0; k < L.length; k++) {
    const tr = L[k]
    if (tr.npc || tr.a < 60 || t - tr.lastDmgInT > 2 || tr === pick) continue
    if (!att || tr.a > att.a) att = tr
  }
  if (att && pick && !pick.npc && Math.abs(angDiff(att.bearing, pick.bearing)) > 80 * Math.PI / 180) {
    const keep = (pick.finishable || pick.hp < P.keepTargetHpf * pick.maxHp)
    if (!keep || t - B.vetoT > P.vetoKeepS) { if (candBuf.includes(att) || att.listed || att.phantom) pick = att }
    if (B.vetoT < 0) B.vetoT = t
    B.counters.aimVetoes = (B.counters.aimVetoes || 0) + 1
  } else B.vetoT = -1
  if (att && pick && pick.npc) pick = att
  setTarget(B, pick)
  B.killSecure = !!(pick && pick.secure)
}

function setTarget(B, tr) {
  if (B.target !== tr) {
    if (B.target) { B.lostTarget = B.target; B.lostTargetT = B.me.t; B.lostX = B.target.x; B.lostY = B.target.y; B.lostZ = B.target.z + B.target.height * 0.5 }
    B.target = tr; B.targetSince = B.me.t
    if (tr) B.counters.targetSwitches++
  }
}

/** D3: LOSING predicate with a 5-point hysteresis and a 1.5 s minimum stay. */
function losing(B) {
  const me = B.me, P = B.P, t = me.t, tgt = B.target, n = B.threats
  const finishing = !!tgt && !tgt.npc && tgt.hp < P.finishHpf * tgt.maxHp && n <= P.finishThreats
  B.finishing = finishing
  if (B.env === 'FFA' && n >= 1 && me.hpf < P.ffaHideHpf && !finishing) return true
  if (finishing || n === 0) return B.losing && t - B.losingSince < P.loseMinS && n > 0
  const hys = B.losing ? P.loseHys : 0
  const hpf = me.hpf
  let lose = false
  if (n >= P.lose6) lose = true
  else if (n >= 3) lose = hpf < P.lose3Hpf + hys
  else if (n === 2) lose = hpf < P.lose2Hpf + hys
  else {
    const o = B.threat1 || tgt
    const ofrac = o ? o.hp / Math.max(1, o.maxHp) : 1
    lose = hpf < P.lose1Hpf + hys && ofrac >= hpf + P.lose1Margin - hys
  }
  if (!lose && B.losing && t - B.losingSince < P.loseMinS) lose = true
  return lose
}

/** Mode priority: ZONE > LAST-STAND fight > LOSING retreat > HEAL > FIGHT > DROP > LOOT (farm) > HOLD. */
export function decideMode(B) {
  const me = B.me, P = B.P, t = me.t, tgt = B.target, hide = B.hide
  const tCover = hide.state === 'found' ? hide.dist * P.pathFactor / me.walk : P.tCoverUnknown
  B.tCover = tCover
  const lose = losing(B)
  if (lose && !B.losing) { B.losingSince = t; B.counters.losing = (B.counters.losing || 0) + 1 }
  if (!lose && B.losing) B.losingEndT = t
  B.losing = lose
  B.fightOk = !lose; B.finish = B.finishing; B.winning = !!tgt && (tgt.maxHp - tgt.hp) > (me.maxHp - me.hp)
  const quietS = t - B.lastLosInT
  const contactNow = quietS < 0.5 || t - me.lastShotAtT < 1
  const healExit = B.env === 'FFA' ? Math.max(P.healExit, P.ffaHealExit) : P.healExit
  // HEAL (D3): out of contact for 1.5 s and hp < 55%, or hp < 90% within 6 s of a LOSING retreat; leave at
  // healExit (after the 6 s), or when a mech has a line of fire on us and we are not LOSING
  let heal = false
  const afterLose = t - B.losingEndT <= P.healAfterLoseS
  if (B.mode === MODE.HEAL) heal = !(contactNow && !lose) && (me.hpf < healExit || (afterLose && me.hpf < P.healAfterLoseHp))
  else heal = quietS >= P.healQuietS && t - me.lastShotAtT >= P.healQuietS && (me.hpf < P.healEnterHp || (afterLose && me.hpf < P.healAfterLoseHp) || (B.env === 'FFA' && me.hpf < 0.7))
  // last stand: under 25% with >= 2 attackers hitting us and no reachable cover, or the final shrink under fire
  const zl = B.zone
  const finalShrink = zl.known && zl.nr <= 0.5 && t >= zl.t0
  B.doomed = !!tgt && ((me.hpf < P.lastStandHpf && B.attackers3 >= P.lastStandAttackers && (hide.state === 'none' || tCover > 3)) || (finalShrink && B.n1 >= 1))
  let want
  if (B.zoneUrgent) want = MODE.ZONE
  else if (B.doomed) want = MODE.FIGHT
  else if (lose) want = MODE.DISENGAGE
  else if (heal) want = MODE.HEAL
  else if (tgt) want = MODE.FIGHT
  else if (t - me.lastShotAtT < 2) want = MODE.DISENGAGE          // shot by something we cannot see
  else if (B.dropTask) want = MODE.DROP
  else if (B.loot) want = MODE.LOOT
  else want = MODE.HOLD
  if (want !== B.mode) {
    const urgent = want === MODE.ZONE || B.mode === MODE.ZONE || want === MODE.DISENGAGE || B.mode === MODE.HOLD || B.mode === MODE.LOOT || !B.mode || (B.mode === MODE.HEAL && want === MODE.FIGHT)
    if (urgent || t - B.modeSince >= P.modeHold) {
      B.mode = want; B.modeSince = t; B.counters.modeSwitches++
    }
  }
  // fire is held only while healing out of contact (D3: return fire when shot; hold-fire under fire cost 0.34)
  B.holdFire = B.mode === MODE.HEAL && quietS > P.healFireQuiet && t - me.lastHurtT > 1 && !B.killSecure
}

// ------------------------------------------------------------------------------------------------
// Threat list shared by the hide search and the position evaluator (typed, capped at 4).
// ------------------------------------------------------------------------------------------------
function fillThreats(B, T, withTargetFirst) {
  const L = B.trackList
  let n = 0
  const tgt = B.target
  if (withTargetFirst && tgt && !tgt.npc) { put(T, n++, tgt, B) }
  // highest dps first, then nearest
  for (let pass = 0; pass < 2 && n < T.cap; pass++) {
    for (let k = 0; k < L.length && n < T.cap; k++) {
      const tr = L[k]
      if (tr.npc || tr.conf < 0.25 || tr.dist > 320) continue
      if (withTargetFirst && tr === tgt) continue
      if ((pass === 0) !== (tr.a > 0)) continue
      put(T, n++, tr, B)
    }
  }
  T.n = n
  return n
}
function put(T, i, tr, B) {
  T.x[i] = tr.x; T.y[i] = tr.y; T.z[i] = tr.z + tr.muzzleH
  T.a[i] = Math.max(tr.a, 20) * tr.conf; T.id[i] = tr.id
  T.vx[i] = tr.listed ? tr.evx : 0; T.vy[i] = tr.listed ? tr.evy : 0; T.los[i] = B.me.t - tr.losInT <= 1 ? 1 : 0
}
function newThreats(cap) { return { cap, n: 0, x: new Float64Array(cap), y: new Float64Array(cap), z: new Float64Array(cap), a: new Float64Array(cap), id: new Int32Array(cap), vx: new Float64Array(cap), vy: new Float64Array(cap), los: new Uint8Array(cap) } }
/** Inside the arena wall (protocol: the wall stands arena_margin inside the map bounds). */
export function inArena(B, x, y, pad = 0) {
  const w = B.world
  if (!w) return true
  const bd = w.bounds, m = B.arenaMargin + B.me.radius + pad
  return x > bd.minX + m && x < bd.maxX - m && y > bd.minY + m && y < bd.maxY - m
}

/** 1 when threat i has a line of fire on the body standing at (x,y,z feet), 0.5 head only, 0 hidden. */
function exposure(B, T, i, x, y, z) {
  const w = B.world, me = B.me
  if (w.shotClear(T.x[i], T.y[i], T.z[i], x, y, z + me.height * 0.5)) return 1
  if (w.shotClear(T.x[i], T.y[i], T.z[i], x, y, z + me.height * 0.9)) return B.env === 'FFA' ? 0.5 : B.P.headExposure
  return 0
}

// ------------------------------------------------------------------------------------------------
// Hide-cell search: a 4 m lattice out to 120 m in order of distance, time-sliced by a ray budget.
// ------------------------------------------------------------------------------------------------
export function makeHideSearch(B) {
  const P = B.P, step = P.hideStep, R = P.hideMaxR
  const offs = []
  const nR = Math.floor(R / step)
  for (let j = -nR; j <= nR; j++) for (let i = -nR; i <= nR; i++) { const d = Math.hypot(i, j) * step; if (d <= R) offs.push([i * step, j * step, d]) }
  offs.sort((a, b) => a[2] - b[2])
  const N = offs.length
  const ox = new Float32Array(N), oy = new Float32Array(N), od = new Float32Array(N)
  for (let k = 0; k < N; k++) { ox[k] = offs[k][0]; oy[k] = offs[k][1]; od[k] = offs[k][2] }
  const T = newThreats(4)
  const h = B.hide   // { state: 'idle'|'run'|'found'|'none', x, y, dist, t, cursor, ... }
  const bad = new Float64Array(12); let badN = 0

  function start() {
    h.state = B.nav && B.world ? 'run' : 'none'
    h.cursor = 0; h.ox = B.me.x; h.oy = B.me.y; h.bestCost = Infinity; h.firstR = Infinity; h.t0 = B.me.t
    h.comp = B.nav ? B.nav.component(B.me.x, B.me.y) : -1
    if (h.state === 'none') h.t = B.me.t
  }
  function isBad(x, y) {
    for (let k = 0; k < badN; k++) if (Math.abs(bad[k * 3] - x) < 5 && Math.abs(bad[k * 3 + 1] - y) < 5 && B.me.t - bad[k * 3 + 2] < 20) return true
    return false
  }
  function markBad(x, y) {
    const k = badN < 4 ? badN++ : (B.tick & 3)
    bad[k * 3] = x; bad[k * 3 + 1] = y; bad[k * 3 + 2] = B.me.t
  }
  const w = B.world
  function hidden(x, y, z) {
    for (let i = 0; i < T.n; i++) if (exposure(B, T, i, x, y, z) > 0) return false
    // also hidden from where each approaching threat will be in 3 s
    for (let i = 0; i < T.n; i++) {
      const lx = T.x[i] + T.vx[i] * P.hideLeadS, ly = T.y[i] + T.vy[i] * P.hideLeadS
      if ((T.vx[i] !== 0 || T.vy[i] !== 0) && w.shotClear(lx, ly, T.z[i], x, y, z + B.me.height * 0.5)) return false
    }
    return true
  }
  /** The cell must lie away from every threat that has a line on us (never retreat toward the attacker). */
  function awaySide(x, y, d) {
    if (d < 6) return true
    const ux = (x - h.ox) / d, uy = (y - h.oy) / d
    for (let i = 0; i < T.n; i++) {
      if (!T.los[i]) continue
      const tx = T.x[i] - h.ox, ty = T.y[i] - h.oy, tl = Math.hypot(tx, ty) || 1
      if ((ux * tx + uy * ty) / tl > P.hideAwayCos) return false
    }
    return true
  }
  function okStatic(x, y, d) {
    const nav = B.nav, me = B.me
    if (!nav.passableAt(x, y)) return false
    if (nav.wallDistAt(x, y) > P.hideWall) return false
    if (!inArena(B, x, y, 1)) return false
    if (h.comp >= 0 && nav.component(x, y) !== h.comp) return false
    if (zoneSlack(B, x, y, me.t + d * P.pathFactor / me.walk + P.healZoneS) < 2) return false
    for (let i = 0; i < T.n; i++) if (Math.hypot(T.x[i] - x, T.y[i] - y) < 25) return false
    const L = B.trackList
    for (let k = 0; k < L.length; k++) { const tr = L[k]; if (tr.npc && Math.hypot(tr.x - x, tr.y - y) < P.healDroneDist) return false }
    for (const s of B.shells.values()) if (Math.hypot(s.x - x, s.y - y) < 10) return false
    return !isBad(x, y)
  }
  /** Advance the search by at most `rays` raycasts. */
  function run(rays) {
    if (h.state !== 'run') return
    const nav = B.nav, me = B.me
    fillThreats(B, T, false)
    if (T.n === 0) { h.state = 'idle'; return }
    const perCand = T.n * 4
    let tx = 0, ty = 0
    if (T.n > 0) { const d = Math.hypot(T.x[0] - h.ox, T.y[0] - h.oy) || 1; tx = (T.x[0] - h.ox) / d; ty = (T.y[0] - h.oy) / d }
    let steps = 0
    while (h.cursor < N && rays > 0 && steps < 1500) {
      const k = h.cursor++
      steps++
      const d = od[k]
      if (d > h.firstR + P.hideExtra) { h.cursor = N; break }
      const x = h.ox + ox[k], y = h.oy + oy[k]
      if (!okStatic(x, y, d) || !awaySide(x, y, d)) continue
      rays -= perCand
      if (!hidden(x, y, nav.levelAt(x, y))) continue
      let cost = d * (d < 1 || nav.walkLine(h.ox, h.oy, x, y) ? 1 : 1.4)
      if (d > 1) cost += Math.max(0, (ox[k] * tx + oy[k] * ty) / d) * d * 0.6
      if (d < h.firstR) h.firstR = d
      if (cost < h.bestCost) { h.bestCost = cost; h.bx = x; h.by = y; h.bd = d }
    }
    if (h.cursor >= N) {
      if (h.bestCost < Infinity) { h.state = 'found'; h.x = h.bx; h.y = h.by; h.dist = Math.max(h.bd, Math.hypot(h.x - me.x, h.y - me.y)); h.t = me.t; h.z = nav.levelAt(h.x, h.y) }
      else { h.state = 'none'; h.t = me.t }
    }
  }
  /** Re-ray the chosen cell every tick; restart when it is no longer hidden or stale. */
  function maintain(heading) {
    const me = B.me, t = me.t
    if (!B.nav || !B.world) { h.state = 'none'; return }
    let anyMech = false
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.conf >= 0.25 && tr.dist <= 320) { anyMech = true; break } }
    if (!anyMech) { h.state = 'idle'; return }
    if (h.state === 'idle') { start(); return }
    if (h.state === 'none') { if (t - h.t > P.hideRetryS) start(); return }
    if (h.state === 'found') {
      fillThreats(B, T, false)
      const stale = !heading && (Math.hypot(me.x - h.ox, me.y - h.oy) > 10 || t - h.t > 4)
      // while heading for it the cell is kept until it has been exposed for 0.5 s (no re-search while running)
      const hid = hidden(h.x, h.y, h.z)
      if (hid) h.exposedSince = -1; else if (h.exposedSince < 0) h.exposedSince = t
      const exposedLong = !hid && (!heading || t - h.exposedSince >= P.hideExposedS)
      if (stale || exposedLong || zoneSlack(B, h.x, h.y, t + 5) < 1) { if (heading && !stale) markBad(h.x, h.y); start(); h.exposedSince = -1 }
      else h.dist = Math.hypot(h.x - me.x, h.y - me.y)
    }
  }
  return { start, run, maintain, markBad, threats: T, hidden: (x, y, z) => { fillThreats(B, T, false); return hidden(x, y, z) } }
}

// ------------------------------------------------------------------------------------------------
// Position evaluator: current cell + 3 rings x 16 (+ 2 far rings x 12 for retreats), scored in HP units.
// ------------------------------------------------------------------------------------------------
const RINGS = [8, 16, 28], FAR = [45, 70]
export function makePosEval(B) {
  const P = B.P, MAXC = 1 + 48 + 24
  const cx = new Float32Array(MAXC), cy = new Float32Array(MAXC), cz = new Float32Array(MAXC)
  const S = new Float32Array(MAXC), X = new Float32Array(MAXC), Lf = new Uint8Array(MAXC)
  const T = newThreats(2)
  const res = B.posGoal   // { ok, x, y, score, t, los, exposed }

  /** kind: 'fight' (wants a line to the target), 'retreat' (wants none from anyone), 'hold'. */
  function evaluate(kind) {
    const me = B.me, nav = B.nav, w = B.world, tgt = B.target, t = me.t
    if (!nav || !w) { res.ok = false; return false }
    const comp = nav.component(me.x, me.y)
    let n = 0
    cx[n] = me.x; cy[n] = me.y; n++
    for (let r = 0; r < RINGS.length; r++) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 + r * 0.19; cx[n] = me.x + RINGS[r] * Math.cos(a); cy[n] = me.y + RINGS[r] * Math.sin(a); n++ }
    if (kind === 'retreat') for (let r = 0; r < FAR.length; r++) for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + r * 0.26; cx[n] = me.x + FAR[r] * Math.cos(a); cy[n] = me.y + FAR[r] * Math.sin(a); n++ }
    fillThreats(B, T, kind === 'fight')
    const wB = kind === 'fight' ? P.wB : 0, wX = kind === 'fight' ? P.wX : 3
    const eff = B.eff
    const bT = tgt ? tgt.b : 0
    const mzOff = me.muzzleH
    let tz = 0, tx = 0, ty = 0
    if (tgt) { tx = tgt.x; ty = tgt.y; tz = tgt.z + tgt.height * 0.5 }
    // exposure at our own cell (cost of walking while exposed)
    let Xme = 0
    for (let i = 0; i < T.n; i++) Xme += T.a[i] * exposure(B, T, i, me.x, me.y, me.z)
    let best = -1, bestS = -Infinity, goalS = -Infinity
    for (let c = 0; c < n; c++) {
      const x = cx[c], y = cy[c]
      S[c] = -1e9
      if (!nav.passableAt(x, y)) continue
      if (comp >= 0 && nav.component(x, y) !== comp) continue
      if (c > 0 && !inArena(B, x, y)) continue
      const d = Math.hypot(x - me.x, y - me.y)
      const z = c === 0 ? me.z : nav.levelAt(x, y)
      cz[c] = z
      const straight = d < 1 || nav.walkLine(me.x, me.y, x, y)
      const tM = d * (straight ? 1 : 1.4) / me.walk
      let s = 0
      if (zoneSlack(B, x, y, t + tM + P.zoneArriveSlack) < 2) s -= 1e4
      let xs = 0, xOther = 0
      for (let i = 0; i < T.n; i++) {
        const e = exposure(B, T, i, x, y, z) * T.a[i]
        xs += (kind === 'fight' && i === 0 && tgt && T.id[0] === tgt.id) ? e * 0.35 : e
        if (!(tgt && T.id[i] === tgt.id)) xOther += e
      }
      X[c] = xs
      let los = 0
      if (tgt && kind === 'fight') {
        const dT = Math.hypot(tx - x, ty - y)
        los = w.shotClear(x, y, z + mzOff, tx, ty, tz) && w.canSee(x, y, z + me.eyeH, tx, ty, tz) ? 1 : 0
        const q = B.gunStat.q(dT)
        s += 5 * wB * bT * (q / Math.max(0.1, B.gunStat.q(tgt.dist))) * los
        if (los && xOther === 0 && T.n > 1) s += 60                       // isolates the duel
        const over = dT < eff.rLo ? eff.rLo - dT : dT > eff.rHi ? dT - eff.rHi : 0
        s -= 300 * over / eff.rPref
      }
      Lf[c] = los
      s -= 5 * wX * xs
      s -= Xme * tM
      s -= 2 * d
      if (nav.wallDistAt(x, y) < me.radius + 0.8) s -= 40
      const L = B.trackList
      for (let k = 0; k < L.length; k++) { const tr = L[k]; if (tr.npc && Math.hypot(tr.x - x, tr.y - y) < 47) { s -= 60; break } }
      for (const sh of B.shells.values()) if (Math.hypot(sh.x - x, sh.y - y) < 10) { s -= 1e3; break }
      if (res.ok && Math.hypot(res.x - x, res.y - y) < 3) { s += 30; goalS = s }
      S[c] = s
      if (s > bestS) { bestS = s; best = c }
    }
    B.counters.evals++
    if (best < 0) { res.ok = false; return false }
    // keep the previous goal unless the new one is clearly better
    if (res.ok && res.kind === kind && t - res.t < 3 && goalS > -1e8 && bestS - goalS < P.evalGoalKeep) { res.t0 = t; return true }
    res.ok = true; res.kind = kind; res.x = cx[best]; res.y = cy[best]; res.score = bestS; res.t = t; res.t0 = t
    res.los = Lf[best] === 1; res.exposed = X[best]
    return true
  }
  return { evaluate }
}
