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
      if (t - tr.losInT <= P.n1Window && (tr.aimAtMe || hurtRecently)) n1++
      if (d < 120 && tr.conf > 0.3) n120++
      if (!nearestMech && tr.conf > 0.3) nearestMech = tr
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
  B.A = A; B.n1 = n1; B.nLos = nLos; B.n120 = n120; B.nearestMech = nearestMech
  if (nearestMech && nearestMech.listed) {
    if (!B.lastEnemy) B.lastEnemy = { x: 0, y: 0, t: 0 }
    B.lastEnemy.x = nearestMech.x; B.lastEnemy.y = nearestMech.y; B.lastEnemy.t = t
  }
  B.lastLosInT = lastLosIn
  B.topAttacker = top && t - top.lastDmgInT <= P.faceAttackerS ? top : null
}

const candBuf = []
/** Target index I = V / tau with kill-secure override and switching hysteresis. */
export function selectTarget(B) {
  const me = B.me, P = B.P, t = me.t, L = B.trackList
  candBuf.length = 0
  for (let k = 0; k < L.length && candBuf.length < 12; k++) {
    const tr = L[k]
    if (tr.npc && !(t - tr.lastDmgInT <= 3) && !(B.farmNpc === tr.id)) continue
    if (!tr.listed && (tr.phantom || t - tr.lastSeen > P.blindFireS)) continue
    if (tr.hp <= 0) continue
    candBuf.push(tr)
  }
  if (candBuf.length === 0) { setTarget(B, null); B.killSecure = false; return }
  // median tau
  let tauMed = 1
  {
    const n = candBuf.length
    const taus = B.scratch8
    for (let k = 0; k < n; k++) taus[k] = candBuf[k].tau
    for (let i = 1; i < n; i++) { const v = taus[i]; let j = i - 1; while (j >= 0 && taus[j] > v) { taus[j + 1] = taus[j]; j-- } taus[j + 1] = v }
    tauMed = Math.max(0.5, taus[n >> 1])
  }
  const A = B.A
  let best = null, bestI = -Infinity   // FIX: an index is never NaN here, so the first candidate always wins
  const gunHit = me.gun ? me.gun.damage * me.dmgMult : 0
  const laserHit = me.laser && (me.laser.cooldown <= 0.3 || me.laser.charge > 0) ? me.laser.damage * me.dmgMult : 0
  for (let k = 0; k < candBuf.length; k++) {
    const tr = candBuf[k]
    const V = A > 0 && !B.lastStand ? 1 + Math.min(2, (me.hp / A) * tr.a / (Math.max(1, A - tr.a + 1) * tauMed)) : 1   // FIX: tr.a may not be part of A
    let I = V / tr.tau
    if (!tr.losOut) I *= 0.3
    if (tr.npc) I *= 0.5
    const rm = tr.rearOn ? P.rearMult : 1
    tr.secure = tr.losOut && ((me.gun && tr.dist <= me.gun.range * P.gunRangeFrac && tr.hp <= P.killSecureHits * gunHit * rm) ||
      (laserHit > 0 && tr.dist <= me.laser.range * P.laserRangeFrac && tr.hp <= laserHit * rm * (tr.hasMortar ? 1 + me.laser.cookoff : 1)))
    if (tr.secure) I = 1e3 + 1e3 / (1 + tr.hp)
    // a laser prefers mortar holders when otherwise equal (cook-off)
    if (me.laser && tr.hasMortar) I *= 1.15
    tr.index = I
    if (I > bestI) { bestI = I; best = tr }
  }
  const cur = B.target
  let pick = best
  if (cur && cur !== best && B.tracks.get(cur.id) === cur && candBuf.includes(cur)) {
    const lostLos = t - cur.losOutT > P.switchNoLosS && !!best && best.losOut   // FIX: null guard
    if (!(bestI >= P.switchRatio * cur.index) && !lostLos) pick = cur
  }
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

/** Mode priority: ZONE > HEAL > FIGHT / DISENGAGE > DROP > LOOT > HOLD, with a 0.6 s hold. */
export function decideMode(B) {
  const me = B.me, P = B.P, t = me.t, tgt = B.target, A = B.A, hide = B.hide
  const tCover = hide.state === 'found' ? hide.dist * P.pathFactor / me.walk : P.tCoverUnknown
  B.tCover = tCover
  const hEsc = A * (tCover + 1) + P.hEscBase
  const noHide = hide.state === 'none' || !B.nav
  let fightOk = false, winning = false, finish = false
  if (tgt) {
    finish = (tgt.hp <= P.finishHp && A <= P.finishA) || B.killSecure
    winning = (tgt.maxHp - tgt.hp) > (me.maxHp - me.hp)
    // a lone hunter: after the kill nothing shoots, so only a short escape reserve is held back
    const lone = B.nLos <= 1 && B.n120 <= 1
    const hE = lone ? A * (Math.min(tCover, P.tCoverCapDuel) + 1) + P.hEscBase : hEsc
    // hysteresis: a running fight is kept until the margin is clearly negative, a broken-off one is resumed
    // only when it is clearly positive (no flip-flop between the corner and the open)
    const hys = (B.mode === MODE.FIGHT ? -1 : B.mode === MODE.DISENGAGE ? 1 : 0) * P.fightHys * me.maxHp
    fightOk = (me.hp - hE - tgt.tau * A >= hys) || finish || noHide || (winning && lone && me.hp - P.hEscBase >= tgt.tau * A * 0.8)
  }
  B.fightOk = fightOk; B.winning = winning; B.finish = finish
  const quiet = t - B.lastLosInT > 1.0
  const stance = B.stance
  let want
  // doomed: we would die before reaching cover, so every remaining second goes into the best target
  B.doomed = !!tgt && A > 0 && me.hp < A * (tCover + 1) && t - B.lastLosInT < 0.5
  if (B.zoneUrgent) want = MODE.ZONE
  else if ((stance === 'LAST-STAND' || B.doomed) && tgt) want = MODE.FIGHT
  else if (me.hpf < P.healEnter && !(finish || (fightOk && winning))) want = MODE.HEAL
  else if (me.hpf < P.healSoft && !fightOk) want = MODE.HEAL
  else if (me.hpf < P.healExit && quiet && !(tgt && winning && t - tgt.losOutT < P.chaseS && tgt.listed)) want = MODE.HEAL
  else if (tgt && (A > 0 || tgt.dist <= P.lootQuietR || !B.loot || me.hpf < P.lootHpf)) want = fightOk ? MODE.FIGHT : MODE.DISENGAGE
  else if (!tgt && t - me.lastShotAtT < 2) want = MODE.DISENGAGE
  else if (B.dropTask) want = MODE.DROP
  else if (B.loot) want = MODE.LOOT
  else if (tgt) want = fightOk ? MODE.FIGHT : MODE.DISENGAGE
  else if (t - me.lastShotAtT < 2) want = MODE.DISENGAGE          // shot by something we cannot see
  else want = MODE.HOLD
  if (want !== B.mode) {
    const urgent = want === MODE.ZONE || B.mode === MODE.ZONE || (want === MODE.HEAL && me.hpf < P.healEnter) || !B.mode
    if (urgent || t - B.modeSince >= P.modeHold) {
      B.mode = want; B.modeSince = t; B.counters.modeSwitches++
    }
  }
  B.holdFire = B.mode === MODE.HEAL && t - B.lastLosInT > P.healFireQuiet && !B.killSecure
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
}
function newThreats(cap) { return { cap, n: 0, x: new Float64Array(cap), y: new Float64Array(cap), z: new Float64Array(cap), a: new Float64Array(cap), id: new Int32Array(cap) } }

/** 1 when threat i has a line of fire on the body standing at (x,y,z feet), 0.5 head only, 0 hidden. */
function exposure(B, T, i, x, y, z) {
  const w = B.world, me = B.me
  if (w.shotClear(T.x[i], T.y[i], T.z[i], x, y, z + me.height * 0.5)) return 1
  if (w.shotClear(T.x[i], T.y[i], T.z[i], x, y, z + me.height * 0.9)) return 0.5
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
  function hidden(x, y, z) {
    for (let i = 0; i < T.n; i++) if (exposure(B, T, i, x, y, z) > 0) return false
    return true
  }
  function okStatic(x, y, d) {
    const nav = B.nav, me = B.me
    if (!nav.passableAt(x, y)) return false
    if (nav.wallDistAt(x, y) > P.hideWall) return false
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
    const perCand = T.n * 2
    let tx = 0, ty = 0
    if (T.n > 0) { const d = Math.hypot(T.x[0] - h.ox, T.y[0] - h.oy) || 1; tx = (T.x[0] - h.ox) / d; ty = (T.y[0] - h.oy) / d }
    let steps = 0
    while (h.cursor < N && rays > 0 && steps < 1500) {
      const k = h.cursor++
      steps++
      const d = od[k]
      if (d > h.firstR + P.hideExtra) { h.cursor = N; break }
      const x = h.ox + ox[k], y = h.oy + oy[k]
      if (!okStatic(x, y, d)) continue
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
      if (stale || !hidden(h.x, h.y, h.z) || zoneSlack(B, h.x, h.y, t + 5) < 1) { if (heading && !stale) markBad(h.x, h.y); start() }
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
