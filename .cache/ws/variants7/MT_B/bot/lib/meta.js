// Per-slot meta (META_SPEC v1): upgrade order, pickup reach by attacker lines, gun finish and reload.
//
//   makeMeta(B, set) -> { update(obs) }    set: 'a' upgrades, 'b' + pickups, 'c' + finish and reload (cumulative)
//
// brain.js makes it only for a slot whose saltTable character is the lower-case 'm' (that slot plays salt 1), so every
// other slot keeps B.meta === null and decides exactly as before. update() runs once per decision after 'assess' and
// writes the one preallocated B.meta. It acts only in the SQUAD posture while hunt.firewall() holds (M.on); every hook
// in economy.js / firecontrol.js reads M.on first, so with M.on false the decision is the base decision.
// No random draws, no allocation per decision.

const BASE = ['plating', 'armor', 'nanites', 'laser_damage', 'gun_damage', 'gun_mag', 'laser_charge', 'lightning_efficiency',
  'servos', 'gun_rate', 'lightning_chain', 'lightning_range', 'capacitor', 'reactor', 'gyros', 'jets', 'mortar_reload',
  'mortar_splash', 'mortar_velocity', 'gun_velocity', 'sensors', 'laser_pierce']

// order flags (bits): SQ nanites below laser_damage and gun_damage; LZ0 laser_damage above armor; LZ1 laser_damage above
// nanites; GN0 gun_damage and gun_mag above nanites. No flag ever moves an id above plating.
const SQ = 1, LZ0 = 2, LZ1 = 4, GN0 = 8
function moveBefore(a, id, ref) {
  const i = a.indexOf(id)
  if (i < 0) return
  a.splice(i, 1)
  const j = a.indexOf(ref)
  a.splice(j < 0 ? a.length : j, 0, id)
}
function moveAfter(a, id, ref) {
  const i = a.indexOf(id)
  if (i < 0) return
  a.splice(i, 1)
  const j = a.indexOf(ref)
  a.splice(j < 0 ? a.length : j + 1, 0, id)
}
export function buildOrder(bits) {
  const a = BASE.slice()
  if (bits & SQ) { moveAfter(a, 'nanites', 'laser_damage'); moveAfter(a, 'nanites', 'gun_damage') }
  if (bits & LZ0) moveBefore(a, 'laser_damage', 'armor')
  if ((bits & LZ1) && a.indexOf('laser_damage') > a.indexOf('nanites')) moveBefore(a, 'laser_damage', 'nanites')
  if (bits & GN0) {
    if (a.indexOf('gun_damage') > a.indexOf('nanites')) moveBefore(a, 'gun_damage', 'nanites')
    if (a.indexOf('gun_mag') > a.indexOf('nanites')) moveBefore(a, 'gun_mag', 'nanites')
  }
  if (a[0] !== 'plating') moveBefore(a, 'plating', a[0])
  return a
}
const ORDERS = []
for (let b = 0; b < 16; b++) ORDERS.push(buildOrder(b))
export { BASE as META_BASE_ORDER, ORDERS as META_ORDERS }

export const META_K = {
  earlyS: 45,            // laser_damage above armor / gun ids above nanites before this match time, at 0 kills
  lowHpf: 0.4,           // nanites third again under this hp fraction with no line on us
  threshR: 100, threshR2: 30,          // threshold cube: <= 1 line / 2+ lines
  cubeR1: 52, cubeR2: 30,              // other cube in contact: 1 line / 2+ lines
  pileMax: 115, pilePer: 58, pileR3: 25, pileAbortS: 6, pileNearR: 25,
  laserPathK3: 4,        // laser pickup with none held from 3 kills: on our path only
  lightR: 35,            // lightning pickup (empty slot)
  crateBullets: 7, crateHpf: 0.4, droneHpf: 0.5, droneQuietS: 4,
  reloadAt: 8, finHp: 90, finRounds: 3, finHoldS: 2,
}

export function makeMeta(B, set) {
  const P = B.P, K = META_K
  const lvl = set === 'a' ? 1 : set === 'b' ? 2 : set === 'c' || set === 'd' ? 3 : 3
  const thr = []
  const th = B.cfg && B.cfg.cubes && Array.isArray(B.cfg.cubes.upgrade_thresholds) ? B.cfg.cubes.upgrade_thresholds : [1, 3, 6, 10]
  const cap = (B.cfg && B.cfg.cubes && B.cfg.cubes.stat_cap) || 10
  for (let i = 0; i < th.length; i++) if (th[i] <= cap) thr.push(th[i])
  const M = {
    on: false, lvl, upOrder: null, bits: 0, plating: 0, lens: 0, kills: 0,
    wantMortar: true, laserSeek: -1, lightR: -1, mechSeenT: -99, farmHpf: Math.min(K.crateHpf, K.droneHpf), lastOffer: null,
    pileKdT: -1, pileT0: -99, pileAbortT: -1,
    reloadAt: 0, gunFinish: false, gFinT: -99,
    // counters: each one counts a decision point where the meta answer differs from today's code
    cnt: { dec: 0, offers: 0, orderDiff: 0, mortarNo: 0, laserK3: 0, lightCap: 0, cubeDiff: 0, pileDiff: 0, pileAbort: 0,
      cubeRefuse: 0, crateLow: 0, droneLow: 0, droneNo: 0, reload8: 0, gunFin: 0, gunFinHold: 0 },
    cubeReach, crateOk, droneOk, isThreshold,
  }

  function killDropOf(x, y) {
    const L = B.killDrops, t = B.me.t
    for (let k = L.length - 1; k >= 0; k--) { const kd = L[k]; if (t - kd.t < P.killDropS && Math.hypot(x - kd.x, y - kd.y) < K.pileNearR) return kd }
    return null
  }
  function pileN(kd) {
    let n = 0
    for (const c of B.cubes.values()) if (Math.hypot(c.x - kd.x, c.y - kd.y) < K.pileNearR) n++
    return Math.max(2, n)
  }
  function isThreshold(cubes) { for (let i = 0; i < thr.length; i++) if (thr[i] === cubes + 1) return true; return false }

  /**
   * Reach (m of path) for one cube; 0 refuses it. kc: a cube of a recent kill (economy isKillCube); kro: economy
   * killReachOk; contact: chooseGrab (true) or chooseLoot (false); baseR: the reach today's code gives this cube.
   */
  function cubeReach(c, kc, kro, contact, baseR) {
    const me = B.me, lines = B.nLos
    let r
    const kd = kc ? killDropOf(c.x, c.y) : null
    if (kd && kd.t !== M.pileAbortT) {
      r = lines >= 3 ? K.pileR3 : Math.min(K.pileMax, K.pilePer * pileN(kd) / Math.max(1, lines))
      if (!kro) r = Math.min(r, baseR)
    } else {
      const cubes = me.cubes
      if (cubes >= cap) {
        let next = Infinity
        for (let i = 0; i < th.length; i++) if (th[i] > cubes) { next = th[i]; break }
        if (next - cubes > 2) { M.cnt.cubeRefuse++; return 0 }
      }
      if (isThreshold(cubes)) r = lines <= 1 ? K.threshR : K.threshR2
      else if (!contact) r = baseR
      else r = lines >= 2 ? K.cubeR2 : K.cubeR1
    }
    if (contact && B.losing) r = Math.min(r, baseR)
    if (r !== baseR) { if (kd) M.cnt.pileDiff++; else M.cnt.cubeDiff++ }
    return r
  }
  /** Crate (LOOT, zero lines): at most crateBullets gun rounds and hp >= crateHpf. */
  function crateOk(c) {
    const me = B.me, g = me.gun
    const ok = !!g && me.hpf >= K.crateHpf && Math.max(1, c.hp) <= K.crateBullets * g.damage * me.dmgMult + 1e-6
    if (ok && me.hpf < P.farmHp) M.cnt.crateLow++
    return ok
  }
  /** Drone (LOOT): hp >= droneHpf and no mech seen for droneQuietS. */
  function droneOk() {
    const me = B.me
    const quiet = me.t - M.mechSeenT >= K.droneQuietS, ok = me.hpf >= K.droneHpf && quiet
    if (ok && me.hpf < P.farmHp) M.cnt.droneLow++
    if (!quiet && me.hpf >= P.farmHp) M.cnt.droneNo++
    return ok
  }

  function update(obs) {
    const me = B.me, t = me.t
    M.on = !!B.hunt && B.hunt.firewall() && B.env !== 'FFA'
    if (!M.on) return
    M.cnt.dec++
    const kills = B.counters.kills | 0
    M.kills = kills
    if (lvl >= 1) {
      let plating = 0, lens = 0
      const ups = obs && obs.self && Array.isArray(obs.self.upgrades) ? obs.self.upgrades : null
      if (ups) for (let i = 0; i < ups.length; i++) {
        const u = ups[i], id = typeof u === 'string' ? u : u && typeof u.id === 'string' ? u.id : ''
        if (id === 'plating') plating++
        else if (id === 'laser_damage') lens++
      }
      M.plating = plating; M.lens = lens
      let bits = 0
      if (!(me.hpf < K.lowHpf && B.nLos === 0)) bits |= SQ
      if (me.laser && lens === 0 && kills === 0 && t < K.earlyS) bits |= LZ0
      if (me.laser && lens === 1 && me.cubes >= 3) bits |= LZ1
      if (!me.laser && kills === 0 && t < K.earlyS) bits |= GN0
      M.bits = bits
      M.upOrder = ORDERS[bits]
    }
    if (lvl >= 2) {
      M.wantMortar = false
      M.laserSeek = kills >= 3 ? K.laserPathK3 : -1
      M.lightR = K.lightR
      for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.lastSeen > M.mechSeenT) M.mechSeenT = tr.lastSeen }
      // a kill pile walk is abandoned pileAbortS after it began (its cubes then count as ordinary cubes)
      const g = B.grab && B.grab.type === 'cube' ? B.grab : B.loot && B.loot.type === 'cube' ? B.loot : null
      const kd = g ? killDropOf(g.x, g.y) : null
      if (kd && kd.t !== M.pileAbortT) {
        if (kd.t !== M.pileKdT) { M.pileKdT = kd.t; M.pileT0 = t }
        else if (t - M.pileT0 > K.pileAbortS) { M.pileAbortT = kd.t; M.cnt.pileAbort++ }
      }
    }
    if (lvl >= 3) { M.reloadAt = K.reloadAt; M.gunFinish = true }
  }

  M.update = update
  return M
}
