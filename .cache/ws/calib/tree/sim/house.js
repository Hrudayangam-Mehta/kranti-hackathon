// DEV ONLY: stand-ins for the organisers' house bots, written from the behaviour statistics in
// notes/forensics.md and notes/housebot_model.json (first-order gun lead, fire on "cooldown 0", strafing with
// random reversals, the fixed jump-jet hop, range bands per type, loot / crate / drone habits, zone rotation at
// the announcement) plus the practice SQUAD controller described on the track page (shared vision, never fights
// itself, hunts the team bot weakest tier first, more hunters as the squad is thinned out, everybody late).
//
// Everything tunable sits in HOUSE (levels / types) and SQUAD so a calibration run can replace it:
//   import { HOUSE, SQUAD, mergeParams, makeSquad, makeHouseBot } from './house.js'
// A house bot is an ordinary in-process bot: { name, hello(h), act(obs) -> action }. It only uses what a real
// bot gets (the observation) plus the map; the squad shares what its members see.

import { makeRng } from './rng.js'

const PI = Math.PI, TAU = 2 * PI, DEG = PI / 180
const wrap = (a) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI }
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

// ---------------------------------------------------------------------------------------------------------
// Parameter table. Distances that depend on bullet speed are given as gun flight time (seconds) so the same
// table works for the old replay balance (140 m/s) and the current one (252 m/s): range = tof * gun.speed.
// ---------------------------------------------------------------------------------------------------------
const BASE = {
  aimSigmaDeg: 0,          // extra aim error (1 sigma, per axis) on top of the weapon spread
  aimDriftS: 0.6,          // correlation time of that error
  lead: 1.0,               // fraction of the first-order lead applied
  reactionS: 0.7,          // median time from first sight of a target to the first shot ...
  reactionSigma: 0.8,      // ... log-normal spread (replay: p10 0.25, p50 1.15, p75 3 s after a line opens)
  fireProb: 0.65,          // chance per decision to pull the trigger when a shot is available (duty 0.75 in the replay)
  aimTolDeg: 2.5,          // fire only when the torso is this close to the wanted aim
  maxTof: 0.85,            // open fire up to this gun flight time
  commitTof: 0.4,          // fights (strafes, holds range) a target inside this flight time; farther ones are only shot at in passing
  prefTof: [0.28, 0.42],   // range band the bot tries to hold (gun flight time)
  closeFrac: 0.3,          // move fraction toward the target when too far
  backFrac: 0.1,           // move fraction away when too near
  strafeFrac: 0.8,         // sideways move fraction while fighting
  strafeS: [1.1, 0.72],    // seconds between strafe reversals: log-normal [median, sigma] (replay p10 0.4, p50 1.1, p90 2.7)
  jinkS: [0.25, 0.7],      // seconds between small heading / speed changes while fighting
  jinkDeg: 55,             // size of those heading changes
  speedVar: 0.45,          // and of the speed changes (move length 1-speedVar .. 1)
  zigDeg: 50,              // travelling: the heading swings this far to either side of the path, reversing like a strafe
  standProb: 0,            // chance to stand still for a strafe interval
  crateOverMech: 0.15,     // chance to prefer a wanted crate over a mech that is not close
  hopPerMin: 5,            // jump-jet hops per minute when travelling
  hopPerMinFight: 6,       // ... when fighting
  lootRadius: 110,         // walks this far for a second weapon
  cubeRadius: 35,          // walks this far for a cube
  crateRange: 60,          // shoots crates within this distance when nothing else is going on
  crateProb: 0.5,          // chance to care about a given crate
  npcProb: 0.2,            // chance to attack a drone it sees (always answers one that hurt it)
  dropProb: 0.4,           // chance to go for a supply drop within dropRadius
  dropRadius: 160,
  mortarRange: [38, 140],  // metres
  mortarProb: 0.25,        // chance per decision to switch the torso to the mortar when it is ready
  laserMaxTof: 0.75,
  openingS: 12,            // at the start it loots and ignores mechs that are neither close nor shooting at it
  targetNearPow: 3,        // target choice weight = 1 / distance^pow (3: the nearest of two is taken about 2 times in 3)
  targetRunS: [1.9, 1.0],  // how long it stays on one target before choosing again: log-normal [median, sigma]
  dodge: 0,                // chance to reverse the strafe right after being hit
  // Replay: grounded targets are hit 86% at 0.3-0.4 s of bullet flight, 32% at 0.5-0.6 s and about 22% beyond,
  // airborne ones far more often, and it makes no difference whether the target had the shooter in view. A
  // reversal that starts within 0.1 s of the shot explains that step; random strafing does not. The stand-ins
  // therefore reverse across the bearing of a gun they hear. (Inferred behaviour, tuned to those numbers.)
  dodgeSound: 0.75,        // chance to brake / reverse sideways when it hears a gun
  dodgeSoundS: 0.4,        // length of that manoeuvre and the shortest time between two of them
  dodgeShot: 0,            // alternative trigger: chance to side-step a bullet it SEES coming (off: the replay shows no view dependence)
  dodgeMinS: 0.12,         // a seen bullet closer than this (seconds) cannot be reacted to
  turnDelayS: 1.6,         // delay before turning toward an attacker it cannot see
  holdFrac: [0.2, 0.6],    // where in the next circle it waits (fraction of the radius)
  boost: 0.5,              // 0..1 how freely it spends energy on running
  swap: false,             // swaps its second weapon for a preferred kind
  weaponPref: ['laser', 'lightning', 'mortar'],
  upgrades: ['plating', 'gun_damage', 'reactor', 'armor', 'nanites', 'gyros', 'gun_mag', 'servos'],
}

export const HOUSE = {
  // practice tiers. Easy is not in the replay: its numbers are a guess to be calibrated against real scores.
  easy: { ...BASE, aimSigmaDeg: 5, aimDriftS: 0.9, lead: 0.4, reactionS: 2.0, fireProb: 0.25, aimTolDeg: 5, maxTof: 0.5, commitTof: 0.45, prefTof: [0.22, 0.36], strafeFrac: 0.45, strafeS: [2.2, 0.5], jinkDeg: 20, speedVar: 0.2, zigDeg: 15, dodgeShot: 0, dodgeSound: 0, standProb: 0.4, hopPerMin: 2, hopPerMinFight: 2, lootRadius: 50, crateProb: 0.2, npcProb: 0.05, dropProb: 0.15, mortarProb: 0.1, turnDelayS: 2.6, boost: 0.2 },
  medium: { ...BASE, dodgeSound: 0.3, aimSigmaDeg: 2.0, lead: 0.9, reactionS: 1.2, fireProb: 0.45, aimTolDeg: 3.5, maxTof: 0.75, prefTof: [0.2, 0.33], closeFrac: 0.5, strafeFrac: 0.9, strafeS: [0.9, 0.7], hopPerMin: 3.1, hopPerMinFight: 4.4, crateProb: 0.4, turnDelayS: 2.0, upgrades: ['armor', 'reactor', 'plating', 'gun_damage', 'laser_damage'] },
  hard: { ...BASE, aimSigmaDeg: 0.3, maxTof: 0.9, prefTof: [0.25, 0.5], closeFrac: 0.3, backFrac: 0, strafeFrac: 0.8, hopPerMin: 5, hopPerMinFight: 5.6, crateProb: 0.7, crateRange: 90, crateOverMech: 0.3, upgrades: ['plating', 'gun_mag', 'nanites', 'gun_damage', 'armor'] },
  expert: { ...BASE, aimSigmaDeg: 0, reactionS: 0.5, maxTof: 0.8, prefTof: [0.55, 0.72], closeFrac: 0.4, backFrac: 0.15, strafeFrac: 0.8, strafeS: [0.9, 0.7], hopPerMin: 4.3, hopPerMinFight: 7.7, crateProb: 0.1, crateRange: 30, crateOverMech: 0, npcProb: 0.8, dodge: 0.3, turnDelayS: 1.2, boost: 0.7, upgrades: ['gun_damage', 'reactor', 'plating', 'armor', 'gyros'] },
  // free-for-all personalities seen in the replay ('medium' above is the practice tier; the replay's medium is 'ffa_medium')
  ffa_medium: { ...BASE, aimSigmaDeg: 0.8, lead: 0.9, maxTof: 0.75, prefTof: [0.2, 0.33], closeFrac: 0.5, strafeFrac: 0.9, strafeS: [0.9, 0.7], hopPerMin: 3.1, hopPerMinFight: 4.4, crateProb: 0.4, upgrades: ['armor', 'reactor', 'plating', 'gun_damage', 'laser_damage'] },
  brawler: { ...BASE, prefTof: [0.05, 0.15], commitTof: 1.0, closeFrac: 0.65, backFrac: 0, strafeFrac: 0.5, strafeS: [1.4, 0.72], maxTof: 1.4, hopPerMin: 7, hopPerMinFight: 6.6, crateProb: 0.3, npcProb: 0.1, boost: 0.8, weaponPref: ['lightning', 'laser', 'mortar'], upgrades: ['gun_damage', 'lightning_efficiency', 'lightning_chain', 'plating', 'servos'] },
  sniper: { ...BASE, prefTof: [0.5, 1.0], commitTof: 0.9, maxTof: 1.4, closeFrac: 0.15, backFrac: 0.17, strafeFrac: 0.5, strafeS: [1.0, 0.8], standProb: 0.3, hopPerMin: 7, hopPerMinFight: 6, crateProb: 0.4, crateRange: 120, upgrades: ['gyros', 'plating', 'gun_velocity', 'gun_damage'] },
  thirdparty: { ...BASE, prefTof: [0.7, 1.2], maxTof: 0.7, closeFrac: 0.05, backFrac: 0.5, strafeFrac: 0.65, hopPerMin: 7.8, hopPerMinFight: 12, crateProb: 0.5, weaponPref: ['mortar', 'laser', 'lightning'], mortarProb: 0.5, upgrades: ['mortar_splash', 'nanites', 'plating', 'servos'] },
  farmer: { ...BASE, prefTof: [0.72, 0.86], commitTof: 0.6, maxTof: 1.2, closeFrac: 0.3, backFrac: 0.2, strafeFrac: 0.65, strafeS: [1.55, 0.65], hopPerMin: 5.5, hopPerMinFight: 8.4, crateProb: 1, crateRange: 170, crateOverMech: 0.6, lootRadius: 150, swap: true, weaponPref: ['mortar', 'lightning', 'laser'], mortarProb: 0.4, upgrades: ['mortar_reload', 'plating', 'gun_damage', 'reactor'] },
}

export const SQUAD = {
  roster: ['easy', 'easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard', 'expert', 'expert', 'expert'],
  tierOrder: ['easy', 'medium', 'hard', 'expert', 'farmer', 'thirdparty', 'sniper', 'brawler'],   // weakest first
  hunterCount: null,       // optional function (kills, t, { alive, late, passive, zonePhase }) -> hunters; replaces the schedule below
  huntersStart: 1,         // hunters at the start
  huntersPerKill: 1,       // extra hunter per dead squad member
  huntersMax: 15,
  allFromS: 300,           // everybody hunts from this time ...
  allInLastPhases: 2,      // ... or when the zone is in its last N phases
  passiveFactor: 0.5,      // hunter count multiplier while the team bot has not hurt anybody for passiveWindowS
  passiveWindowS: 25,
  passiveMinHunters: 1,
  defendRadius: 15,        // a non-hunter fights back when the team bot comes this close ...
  fightBackS: 1.5,         // ... or for this long after the team bot hurt it
  holdFireMult: 0.25,      // trigger duty of a non-hunter that is only fighting back
  holdSecondary: false,    // may a non-hunter use its second weapon when fighting back
  reassignS: 3,            // hunters are re-chosen at most this often
  knows: 'vision',         // 'vision' = only what a member currently sees (5 s server memory), 'always' = omniscient
  lostAfterS: 6,           // a shared sighting older than this is only a place to search
  searchRadiusFrac: 0.6,   // unseen target: search points inside this fraction of the current zone
  friendlyLineCheck: true, // hold fire when a squad mate stands in the line
  huntClose: 0.6,          // move fraction toward the target for a hunter outside its range band (chase aggressiveness)
  huntPrefTof: null,       // range band [lo, hi] (gun flight time) used by hunters instead of their tier's prefTof; null = tier's own
}

export function mergeParams(over) {
  const house = {}, squad = { ...SQUAD }
  for (const k in HOUSE) house[k] = { ...HOUSE[k] }
  if (over) {
    const src = over.house || over.levels || over.HOUSE
    for (const k in src || {}) house[k] = { ...(house[k] || BASE), ...src[k] }
    Object.assign(squad, over.squad || over.SQUAD || {})
  }
  return { house, squad }
}

// ---------------------------------------------------------------------------------------------------------
// Squad controller
// ---------------------------------------------------------------------------------------------------------
export class Squad {
  constructor(params, seed = 1) {
    this.P = params
    this.rng = makeRng(seed)
    this.members = new Map()        // id -> { bot, tier, alive, x, y, hunter }
    this.enemies = new Map()        // id -> { x, y, z, vx, vy, vz, t, hp, cubes, weapons, lastHurtT }
    this.tick = -1; this.t = 0
    this.hunters = new Set()
    this.lastAssignT = -1e9
    this.total = 0
    this.zonePhase = 0; this.nPhases = 6
    this.search = null
    this.zone = null
  }

  add(bot) { this.members.set(bot.id, { bot, tier: bot.type, alive: true, x: 0, y: 0, seenTick: -1 }); this.total = this.members.size }
  isMember(id) { return this.members.has(id) }

  /** Called by every member with its observation: shared vision and bookkeeping. */
  report(bot, obs) {
    const t = obs.t
    if (obs.tick !== this.tick) { this._plan(obs); this.tick = obs.tick; this.t = t }
    const me = this.members.get(bot.id)
    me.x = obs.self.pos[0]; me.y = obs.self.pos[1]; me.seenTick = obs.tick
    for (const m of obs.mechs) {
      if (m.kind !== 'mech' || this.members.has(m.id)) continue
      let e = this.enemies.get(m.id)
      if (!e) { e = { id: m.id, lastHurtT: -1e9, firstT: t }; this.enemies.set(m.id, e) }
      e.x = m.pos[0]; e.y = m.pos[1]; e.z = m.pos[2]; e.vx = m.vel[0]; e.vy = m.vel[1]; e.vz = m.vel[2]
      e.hp = m.hp; e.cubes = m.cubes || 0; e.weapons = m.weapons || []; e.t = t; e.tick = obs.tick
    }
    for (const ev of obs.events) {
      if (ev.type === 'damaged' && ev.by !== null && ev.by < 100 && !this.members.has(ev.by)) {
        let e = this.enemies.get(ev.by)
        if (!e) { e = { id: ev.by, t: -1e9, firstT: t, x: me.x + Math.cos(ev.bearing) * 60, y: me.y + Math.sin(ev.bearing) * 60, z: obs.self.pos[2], vx: 0, vy: 0, vz: 0, hp: 0, cubes: 0, weapons: [] }; this.enemies.set(ev.by, e) }
        e.lastHurtT = t
        if (t - e.t > 2) { e.hintX = me.x + Math.cos(ev.bearing) * 70; e.hintY = me.y + Math.sin(ev.bearing) * 70; e.hintT = t }
      }
    }
  }

  _plan(obs) {
    const P = this.P, t = obs.t
    // who is still alive: a member that did not report on the previous decision is dead
    let alive = 0
    for (const m of this.members.values()) {
      if (this.tick >= 0 && m.alive && m.seenTick < this.tick) m.alive = false
      if (m.alive) alive++
    }
    const kills = this.total - alive
    const z = obs.zone
    this.zone = z
    // zone phase from the announced next radius
    if (this.radii) { const i = this.radii.indexOf(z.next_radius); if (i >= 0) this.zonePhase = i }
    // hunter schedule h(kills, t): the defaults, or a function given as SQUAD.hunterCount (code only, not JSON)
    const late = t >= P.allFromS || (this.radii && this.zonePhase >= this.radii.length - P.allInLastPhases)
    const tgt = this.primary()
    const passive = !tgt || t - tgt.lastHurtT > P.passiveWindowS
    let want
    if (typeof P.hunterCount === 'function') want = P.hunterCount(kills, t, { alive, late, passive, zonePhase: this.zonePhase })
    else {
      want = Math.floor(P.huntersStart + P.huntersPerKill * kills + 1e-9)
      if (!late && passive) want = Math.max(P.passiveMinHunters, Math.floor(want * P.passiveFactor))
      if (late) want = alive
    }
    want = clamp(want, 0, Math.min(alive, P.huntersMax))
    this.want = want; this.kills = kills; this.late = late
    // drop dead hunters, then top up weakest tier first (nearest to the target inside a tier)
    for (const id of [...this.hunters]) if (!this.members.get(id).alive) this.hunters.delete(id)
    if (this.hunters.size !== want && (this.hunters.size < want || t - this.lastAssignT >= P.reassignS)) {
      this.lastAssignT = t
      const rank = (m) => { const i = P.tierOrder.indexOf(m.tier); return i < 0 ? 99 : i }
      const tx = tgt ? tgt.x : z.center[0], ty = tgt ? tgt.y : z.center[1]
      const pool = [...this.members.values()].filter((m) => m.alive)
        .sort((a, b) => rank(a) - rank(b) || (this.hunters.has(b.bot.id) - this.hunters.has(a.bot.id)) || Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty) || a.bot.id - b.bot.id)
      this.hunters = new Set(pool.slice(0, want).map((m) => m.bot.id))
    }
    // search point for an unseen target
    if (!this.search || t >= this.search.until || this.search.reached) {
      const a = this.rng() * TAU, r = z.radius * P.searchRadiusFrac * Math.sqrt(this.rng())
      this.search = { x: z.center[0] + Math.cos(a) * r, y: z.center[1] + Math.sin(a) * r, until: t + 25, reached: false }
      if (t < 1) { this.search.x = z.center[0]; this.search.y = z.center[1] }
    }
  }

  /** The team bot as the squad knows it (most recently seen enemy), or null. */
  primary() {
    let best = null
    for (const e of this.enemies.values()) if (!e.dead && (!best || e.t > best.t)) best = e
    return best
  }

  role(id) { return this.hunters.has(id) ? 'hunt' : 'hold' }
  enemy(id) { return this.enemies.get(id) || null }
  noteDead(id) { const e = this.enemies.get(id); if (e) e.dead = true }
}

// ---------------------------------------------------------------------------------------------------------
// One house bot
// ---------------------------------------------------------------------------------------------------------
export class HouseBot {
  constructor(type, ctx) {
    this.type = type
    this.P = ctx.params[type] || ctx.params.medium
    this.world = ctx.world; this.nav = ctx.nav
    this.squad = ctx.squad || null
    this.squadP = ctx.squadParams || SQUAD
    this.name = (this.squad ? 'squad:' : 'house:') + type
    this.id = -1
    this.omni = ctx.omniscient || null     // optional (id) -> {x,y,z,vx,vy,vz} for squad.knows === 'always'
  }

  hello(h) {
    this.id = h.slot
    this.cfg = h.config
    this.rng = makeRng((h.seed ^ 0x2545f491) >>> 0)
    const R = this.rng
    this.tracks = new Map()
    this.side = R() < 0.5 ? 1 : -1
    this.strafeUntil = 0; this.standing = false
    this.jinkUntil = 0; this.jinkAng = 0; this.jinkSpd = 1
    this.dodgeUntil = -1; this.dodgeX = 0; this.dodgeY = 0; this.shotSeen = new Map(); this.soundDodgeAt = 0
    this.errYaw = 0; this.errPitch = 0
    this.hopUntil = -1; this.nextHopT = 2 + R() * 10
    this.path = null; this.pathT = -1e9; this.pathGX = 1e9; this.pathGY = 1e9
    this.scanPhase = R() * TAU
    this.holdAng = R() * TAU; this.holdFrac = R.range(this.P.holdFrac[0], this.P.holdFrac[1]); this.holdKey = -1
    this.hurtBy = new Map()             // attacker id -> last time
    this.lookYaw = null; this.lookUntil = -1; this.lookAt = 1e9
    this.target = -1; this.targetSince = 0; this.retargetAt = 0
    this.crateSkip = new Set(); this.crateWant = new Set(); this.npcWant = new Map(); this.crateOver = new Map()
    this.dropChoice = new Map()
    this.badPickup = new Map()
    this.mortarMode = 0
    this.stuckT = 0; this.stuckX = 0; this.stuckY = 0; this.unstickUntil = -1; this.unstickDir = 0
    this.boosting = false
    this.lastYaw = 0
    this.wander = null
    if (this.squad) { this.squad.add(this); this.squad.radii = h.config.zone.phases.map((p) => p.radius) }
    return { type: 'ready', name: this.name }
  }

  // -------------------------------------------------------------------------------------------- helpers

  _isEnemyMech(m) { return m.kind === 'mech' && !(this.squad && this.squad.isMember(m.id)) }

  _clearShot(me, x, y, z, hgt) {
    const w = this.world, ex = me.pos[0], ey = me.pos[1], ez = me.pos[2] + me.stats.muzzle_height
    return w.shotClear(ex, ey, ez, x, y, z + hgt * 0.5) || w.shotClear(ex, ey, ez, x, y, z + hgt * 0.9)
  }

  /** Would a squad mate catch this shot? (cheap 2D corridor test against members seen in this observation) */
  _mateInLine(obs, tx, ty) {
    if (!this.squad || !this.squadP.friendlyLineCheck) return false
    const sx = obs.self.pos[0], sy = obs.self.pos[1]
    const dx = tx - sx, dy = ty - sy, l2 = dx * dx + dy * dy
    if (l2 < 1) return false
    for (const m of obs.mechs) {
      if (m.kind !== 'mech' || !this.squad.isMember(m.id)) continue
      const u = ((m.pos[0] - sx) * dx + (m.pos[1] - sy) * dy) / l2
      if (u <= 0.02 || u >= 0.98) continue
      const px = sx + dx * u - m.pos[0], py = sy + dy * u - m.pos[1]
      if (px * px + py * py < 12) return true
    }
    return false
  }

  /** First-order intercept of a target (pos/vel, body height hgt) for a projectile of the given speed. */
  _lead(me, tp, tv, hgt, speed, grounded) {
    const P = this.P
    const sx = me.pos[0], sy = me.pos[1], sz = me.pos[2] + me.stats.muzzle_height
    const cz = tp[2] + hgt * 0.5
    let t = Math.hypot(tp[0] - sx, tp[1] - sy, cz - sz) / speed
    let ax = tp[0], ay = tp[1], az = cz
    for (let k = 0; k < 2; k++) {
      ax = tp[0] + tv[0] * t * P.lead; ay = tp[1] + tv[1] * t * P.lead
      az = cz
      if (!grounded) {
        // airborne: ballistic guess, not below the ground under the predicted point
        az = cz + tv[2] * t - 0.5 * this.cfg.mech.gravity * t * t
        const g = this.world.ground(ax, ay) + hgt * 0.5
        if (az < g) az = g
      }
      t = Math.hypot(ax - sx, ay - sy, az - sz) / speed
    }
    return [Math.atan2(ay - sy, ax - sx), Math.atan2(az - sz, Math.hypot(ax - sx, ay - sy) || 1), t]
  }

  _strafeInterval() {
    const P = this.P
    return Math.max(0.3, P.strafeS[0] * Math.exp(this.rng.gauss() * P.strafeS[1]))
  }

  /** Low-arc mortar pitch to reach horizontal distance d and height difference h, or null. */
  _mortarPitch(d, h, v, g) {
    const disc = v * v * v * v - g * (g * d * d + 2 * h * v * v)
    if (disc < 0 || d < 1) return null
    return Math.atan((v * v - Math.sqrt(disc)) / (g * d))
  }

  _planPath(x, y, gx, gy, t, force) {
    const moved = Math.hypot(gx - this.pathGX, gy - this.pathGY)
    if (!force && this.path && t - this.pathT < 1.4 && moved < 10) return
    if (!force && this.path && t - this.pathT < 0.45) return
    this.pathT = t + this.rng() * 0.3; this.pathGX = gx; this.pathGY = gy
    if (this.nav.walkLine(x, y, gx, gy)) { this.path = { pts: [[x, y], [gx, gy]], direct: true }; return }
    let r = null
    try { r = this.nav.findPath(x, y, gx, gy, { maxExpand: 9000 }) } catch { r = null }
    this.path = r && r.pts && r.pts.length >= 2 ? { pts: r.pts, direct: false } : { pts: [[x, y], [gx, gy]], direct: true }
  }

  /** Unit move vector toward (gx,gy) along the planned path. */
  _steer(x, y, gx, gy, t) {
    this._planPath(x, y, gx, gy, t, false)
    const pts = this.path.pts
    let k = this.nav.nextWaypoint(pts, x, y, 2.6)
    if (k < 0) k = pts.length - 1
    let wx = pts[k][0], wy = pts[k][1]
    if (k === pts.length - 1 && this.path.direct) { wx = gx; wy = gy }
    const dx = wx - x, dy = wy - y, d = Math.hypot(dx, dy)
    if (d < 0.3) return [0, 0]
    return [dx / d, dy / d]
  }

  // -------------------------------------------------------------------------------------------- decision

  act(obs) {
    const P = this.P, me = obs.self, t = obs.t, R = this.rng
    const x = me.pos[0], y = me.pos[1], z = me.pos[2]
    const squad = this.squad
    if (squad) squad.report(this, obs)
    const role = squad ? squad.role(this.id) : 'solo'
    const act = { tick: obs.tick, move: [0, 0], boost: false, fire: [false, false] }
    const gunSlot = me.weapons[0] && me.weapons[0].kind === 'gun' ? 0 : me.weapons[1] && me.weapons[1].kind === 'gun' ? 1 : -1
    const secSlot = gunSlot === 0 ? 1 : 0
    const gun = gunSlot >= 0 ? me.weapons[gunSlot] : null
    const sec = me.weapons[secSlot] && me.weapons[secSlot].kind !== 'gun' ? me.weapons[secSlot] : null
    const gunSpeed = gun ? gun.stats.speed : this.cfg.weapons.gun.speed

    // ---- events
    let hitNow = false
    for (const ev of obs.events) {
      if (ev.type === 'damaged' && ev.by !== null) {
        this.hurtBy.set(ev.by, t); hitNow = true
        if (ev.bearing !== null && this.lookYaw === null) { this.lookYaw = ev.bearing; this.lookAt = t + P.turnDelayS * (0.6 + 0.8 * R()); this.lookUntil = this.lookAt + 3 }
      } else if (ev.type === 'take_failed') this.badPickup.set(ev.id, t)
      else if (ev.type === 'kill' && squad) squad.noteDead(ev.target)
    }
    if (hitNow && P.dodge > 0 && R() < P.dodge) { this.side = -this.side; this.strafeUntil = t + this._strafeInterval() }

    // ---- tracks of what is in the observation
    let nearestEnemy = null, nearestD = 1e9
    const seenNow = new Set()
    for (const m of obs.mechs) {
      seenNow.add(m.id)
      let tr = this.tracks.get(m.id)
      if (!tr || t - tr.lastT > 1.0) { tr = { firstT: t, lastT: t, react: P.reactionS * Math.exp(R.gauss() * P.reactionSigma) }; this.tracks.set(m.id, tr) }
      tr.lastT = t
      if (this._isEnemyMech(m)) { const d = Math.hypot(m.pos[0] - x, m.pos[1] - y); if (d < nearestD) { nearestD = d; nearestEnemy = m } }
    }

    // ---- choose a mech to fight
    // Replay: with several candidates the nearest is picked two times in three, a run on one target lasts a
    // median 1.9 s (p90 11.5 s) and the bot then often turns to another one. Modelled as a weighted re-draw.
    let tgt = null, tgtD = 1e9
    {
      const maxR = Math.min(P.maxTof * gunSpeed, gun ? gun.stats.range : 230) * 1.15
      const cand = []
      let cur = null, wsum = 0
      for (const m of obs.mechs) {
        if (!this._isEnemyMech(m)) continue
        const d = Math.hypot(m.pos[0] - x, m.pos[1] - y, m.pos[2] - z)
        const hb = this.hurtBy.get(m.id)
        if (role === 'hold' && !(d < this.squadP.defendRadius || (hb !== undefined && t - hb < this.squadP.fightBackS))) continue
        if (d > maxR && role !== 'hunt' && !(hb !== undefined && t - hb < 4)) continue
        if (t < P.openingS && role !== 'hunt' && d > P.commitTof * gunSpeed && !(hb !== undefined && t - hb < 4)) continue   // opening: loot first
        let w = 1 / Math.pow(Math.max(d, 15), P.targetNearPow)
        if (hb !== undefined && t - hb < 3) w *= 1.6
        cand.push([m, d, w]); wsum += w
        if (m.id === this.target) cur = cand[cand.length - 1]
      }
      let pick = cur
      if (cand.length && (!cur || t >= this.retargetAt)) {
        let u = R() * wsum
        pick = cand[cand.length - 1]
        for (const c of cand) { u -= c[2]; if (u <= 0) { pick = c; break } }
        this.retargetAt = t + P.targetRunS[0] * Math.exp(R.gauss() * P.targetRunS[1])
      }
      if (pick) { tgt = pick[0]; tgtD = pick[1] }
      const id = tgt ? tgt.id : -1
      if (id !== this.target) { this.target = id; this.targetSince = t }
    }
    // shared sighting for a hunter that does not see the target itself
    let shared = null
    if (!tgt && role === 'hunt') {
      const e = squad.primary()
      if (e) {
        if (this.squadP.knows === 'always' && this.omni) { const q = this.omni(e.id); if (q) { e.x = q.x; e.y = q.y; e.z = q.z; e.t = t } }
        shared = e
      }
    }

    // a target is fought (strafing, range keeping) when it is close, when it hurt us, or when we hunt it;
    // otherwise it is only shot at while the bot goes about its business
    let commit = false
    if (tgt) {
      const hb = this.hurtBy.get(tgt.id)
      if (role === 'hold') commit = tgtD <= this.squadP.defendRadius
      else commit = role === 'hunt' || tgtD <= P.commitTof * gunSpeed || (hb !== undefined && t - hb < 5)
    }

    // ---- secondary targets: drones and crates
    let npc = null, crate = null
    if (!commit && role !== 'hunt') {
      let cd = P.crateRange
      for (const c of obs.crates) {
        if (this.crateSkip.has(c.id)) continue
        if (!this.crateWant.has(c.id)) { if (R() < P.crateProb) this.crateWant.add(c.id); else { this.crateSkip.add(c.id); continue } }
        const d = Math.hypot(c.pos[0] - x, c.pos[1] - y)
        if (d < cd) { cd = d; crate = c }
      }
      if (crate && tgt) {
        // keep one decision per crate: shoot it although a mech is in view?
        if (this.crateOver.get(crate.id) === undefined) this.crateOver.set(crate.id, R() < P.crateOverMech)
        if (!this.crateOver.get(crate.id)) crate = null
      }
    }
    {
      let bd = 1e9
      for (const m of obs.mechs) {
        if (m.kind !== 'npc') continue
        const d = Math.hypot(m.pos[0] - x, m.pos[1] - y)
        let want = this.npcWant.get(m.id)
        if (want === undefined) { want = R() < P.npcProb; this.npcWant.set(m.id, want) }
        const hb = this.hurtBy.get(m.id)
        const angry = hb !== undefined && t - hb < 6 && d < 95
        if (!(want && d < 70) && !angry) continue
        if (tgt && !(angry && d < tgtD * 0.8)) continue          // a mech comes first unless the drone is the nearer threat
        if (d < bd) { bd = d; npc = m }
      }
      if (npc) { crate = null; if (tgt) { tgt = null; commit = false } }
    }
    const shootCrate = !!crate && !!tgt

    // ---- where to go
    const zn = obs.zone
    const dC = Math.hypot(x - zn.center[0], y - zn.center[1])
    const dN = Math.hypot(x - zn.next_center[0], y - zn.next_center[1])
    const shrinking = t >= zn.shrink_start
    const edgeMargin = zn.radius - dC
    const zoneUrgent = !me.in_zone || edgeMargin < (shrinking ? 28 : 10) || (shrinking && dN > zn.next_radius && (zn.shrink_end - t) * me.stats.walk_speed * 0.8 < dN - zn.next_radius + 15)
    let goal = null, goalKind = ''
    if (zoneUrgent) {
      goal = [zn.next_center[0], zn.next_center[1]]; goalKind = 'zone'
      const k = Math.max(0, zn.next_radius * 0.5) / (dN || 1)
      if (dN > 1) goal = [zn.next_center[0] + (x - zn.next_center[0]) * Math.min(1, k), zn.next_center[1] + (y - zn.next_center[1]) * Math.min(1, k)]
    }
    if (!goal && !commit && shared && !tgt) {
      const age = t - shared.t
      if (age <= this.squadP.lostAfterS) { goal = [shared.x + shared.vx * Math.min(age, 1), shared.y + shared.vy * Math.min(age, 1)]; goalKind = 'hunt' }
      else if (shared.hintT !== undefined && t - shared.hintT < 12) { goal = [shared.hintX, shared.hintY]; goalKind = 'hunt' }
      else if (Math.hypot(shared.x - x, shared.y - y) > 25 && age < 20) { goal = [shared.x, shared.y]; goalKind = 'hunt' }
    }
    if (!goal && !commit && role === 'hunt') {
      const s = squad.search
      if (Math.hypot(s.x - x, s.y - y) < 18) s.reached = true
      goal = [s.x, s.y]; goalKind = 'search'
    }
    // supply drop
    if (!goal && !commit && role !== 'hunt') {
      for (const d of obs.drops) {
        let c = this.dropChoice.get(d.id)
        if (c === undefined) { c = R() < P.dropProb && Math.hypot(d.pos[0] - x, d.pos[1] - y) < P.dropRadius; this.dropChoice.set(d.id, c) }
        if (c) { goal = [d.pos[0], d.pos[1]]; goalKind = 'drop'; break }
      }
    }
    // loot: second weapon, cubes
    let takeId = -1, takeDrop = -1
    if (!goal && !commit && role !== 'hunt') {
      let bd = P.lootRadius, best = null
      const have = sec ? sec.kind : null
      for (const p of obs.pickups) {
        if (p.kind === 'gun' || p.kind === have) continue
        const bt = this.badPickup.get(p.id)
        if (bt !== undefined && t - bt < 15) continue
        if (have && !(P.swap && P.weaponPref.indexOf(p.kind) < P.weaponPref.indexOf(have))) continue
        if (p.pos[2] - this.world.ground(p.pos[0], p.pos[1]) > 2.5) continue          // roof loot is left alone
        const d = Math.hypot(p.pos[0] - x, p.pos[1] - y)
        if (d < bd) { bd = d; best = p }
      }
      if (best) {
        goal = [best.pos[0], best.pos[1]]; goalKind = 'loot'
        if (bd < this.cfg.loot.pickup_radius - 0.6 && Math.abs(best.pos[2] - z) < 4) { takeId = best.id; if (have) takeDrop = secSlot }
      }
    }
    if (!goal && (!commit || tgtD > 90)) {
      let bd = P.cubeRadius, best = null
      for (const c of obs.cubes) {
        if (c.pos[2] - this.world.ground(c.pos[0], c.pos[1]) > 2.5 && Math.abs(c.pos[2] - z) > 3) continue
        const d = Math.hypot(c.pos[0] - x, c.pos[1] - y)
        if (d < bd) { bd = d; best = c }
      }
      if (best && (!commit || role !== 'hunt')) { goal = [best.pos[0], best.pos[1]]; goalKind = 'cube' }
    }
    if (!goal && !commit && crate && Math.hypot(crate.pos[0] - x, crate.pos[1] - y) > 30 && crate.pos[2] - this.world.ground(crate.pos[0], crate.pos[1]) < 2.5) { goal = [crate.pos[0], crate.pos[1]]; goalKind = 'crate' }
    // rotate into the next circle and wait there
    if (!goal && !commit) {
      const key = zn.next_radius
      if (key !== this.holdKey) { this.holdKey = key; this.holdAng = R() * TAU; this.holdFrac = R.range(P.holdFrac[0], P.holdFrac[1]); this.hold = null }
      if (!this.hold) {
        const hx = zn.next_center[0] + Math.cos(this.holdAng) * zn.next_radius * this.holdFrac, hy = zn.next_center[1] + Math.sin(this.holdAng) * zn.next_radius * this.holdFrac
        const q = this.nav.nearestPassable(hx, hy, 30)
        this.hold = q ? [q.x, q.y] : [zn.next_center[0], zn.next_center[1]]
      }
      const dh = Math.hypot(this.hold[0] - x, this.hold[1] - y)
      if (dh > 12) { goal = this.hold; goalKind = 'rotate' } else if (!this.wander || t > this.wander.until || Math.hypot(this.wander.x - x, this.wander.y - y) < 4) {
        const a = R() * TAU, r = 10 + R() * 25
        const q = this.nav.nearestPassable(this.hold[0] + Math.cos(a) * r, this.hold[1] + Math.sin(a) * r, 12)
        this.wander = { x: q ? q.x : this.hold[0], y: q ? q.y : this.hold[1], until: t + 6 + R() * 8 }
      }
      if (!goal && this.wander) { goal = [this.wander.x, this.wander.y]; goalKind = 'wander' }
    }

    // ---- a gun is heard: reverse the sideways motion (replay: the hit rate on grounded targets drops from 86% to
    // 32% between 0.35 and 0.55 s of flight and then stays flat, with or without a view of the shooter)
    if (P.dodgeSound > 0 && t >= this.soundDodgeAt && me.grounded) {
      for (const sd of obs.sounds) {
        if (sd.kind !== 'gun') continue
        if (R() < P.dodgeSound) {
          // brake / reverse across the line to the shot
          const nx = -Math.sin(sd.bearing), ny = Math.cos(sd.bearing)
          const vn = me.vel[0] * nx + me.vel[1] * ny
          let sgn = Math.abs(vn) > 1.5 ? -Math.sign(vn) : (R() < 0.5 ? 1 : -1)
          if (!this.nav.passableAt(x + nx * sgn * 5, y + ny * sgn * 5)) sgn = -sgn
          this.dodgeUntil = t + P.dodgeSoundS; this.dodgeX = nx * sgn; this.dodgeY = ny * sgn
        }
        this.soundDodgeAt = t + P.dodgeSoundS
        break
      }
    }

    // ---- incoming bullets: side-step the ones it sees (decided once per bullet)
    if (P.dodgeShot > 0 && me.grounded && obs.projectiles.length) {
      for (const p of obs.projectiles) {
        if (p.kind === 'mortar') continue
        let care = this.shotSeen.get(p.id)
        if (care === undefined) { care = R() < P.dodgeShot; this.shotSeen.set(p.id, care) }
        if (!care) continue
        const rx = x - p.pos[0], ry = y - p.pos[1], rz = z + me.stats.height * 0.5 - p.pos[2]
        const vx = p.vel[0] - me.vel[0], vy = p.vel[1] - me.vel[1], vz = p.vel[2]
        const v2 = vx * vx + vy * vy + vz * vz
        const tc = (rx * vx + ry * vy + rz * vz) / v2
        if (tc < P.dodgeMinS || tc > 1.4) continue
        const ox = rx - vx * tc, oy = ry - vy * tc, oz = rz - vz * tc
        if (Math.hypot(ox, oy) > me.stats.radius + 1.8 || Math.abs(oz) > me.stats.height * 0.5 + 1.5) continue
        // it would hit if I kept my velocity: brake / reverse across its path (or step off it when standing)
        const bl = Math.hypot(p.vel[0], p.vel[1]) || 1
        const nx = -p.vel[1] / bl, ny = p.vel[0] / bl
        const vn = me.vel[0] * nx + me.vel[1] * ny
        let sgn = Math.abs(vn) > 1 ? -Math.sign(vn) : (ox * nx + oy * ny >= 0 ? 1 : -1)
        if (!this.nav.passableAt(x + nx * sgn * 5, y + ny * sgn * 5)) sgn = -sgn
        if (tc > this.dodgeUntil - t) { this.dodgeUntil = t + tc; this.dodgeX = nx * sgn; this.dodgeY = ny * sgn }
      }
      if (this.shotSeen.size > 400) this.shotSeen.clear()
    }

    // ---- legs
    let mx = 0, my = 0, wantBoost = false
    const fighting = commit && !(goalKind === 'zone' && !me.in_zone)
    if (fighting) {
      const dx = tgt.pos[0] - x, dy = tgt.pos[1] - y, d = Math.hypot(dx, dy) || 1
      const rx = dx / d, ry = dy / d
      if (t >= this.strafeUntil) {
        this.side = -this.side
        this.standing = R() < P.standProb
        this.strafeUntil = t + this._strafeInterval()
      }
      const band = role === 'hunt' && this.squadP.huntPrefTof ? this.squadP.huntPrefTof : P.prefTof
      const lo = band[0] * gunSpeed, hi = band[1] * gunSpeed
      let radial = 0
      const los = this._clearShot(me, tgt.pos[0], tgt.pos[1], tgt.pos[2], 9)
      if (sec && sec.kind === 'lightning' && me.energy > 12) radial = d > sec.stats.range * 0.75 ? Math.max(P.closeFrac, 0.8) : 0
      else if (d > hi) radial = P.closeFrac
      else if (d < lo) radial = -P.backFrac
      if (role === 'hunt' && d > hi) radial = Math.max(radial, this.squadP.huntClose ?? 0.6)
      if (!los) {
        // no line: walk the path toward the target instead of strafing in place
        const s = this._steer(x, y, tgt.pos[0], tgt.pos[1], t)
        mx = s[0]; my = s[1]
      } else {
        const sf = this.standing ? 0 : P.strafeFrac
        mx = rx * radial - ry * this.side * sf; my = ry * radial + rx * this.side * sf
        if (t >= this.jinkUntil) { this.jinkUntil = t + R.range(P.jinkS[0], P.jinkS[1]); this.jinkAng = R.range(-1, 1) * P.jinkDeg * DEG; this.jinkSpd = 1 - R() * P.speedVar }
        if (!this.standing) {
          const ca = Math.cos(this.jinkAng) * this.jinkSpd, sa = Math.sin(this.jinkAng) * this.jinkSpd
          const jx = mx * ca - my * sa, jy = mx * sa + my * ca
          mx = jx; my = jy
        }
        // do not strafe into a wall: flip the side when the next few metres are not standable
        if (!this.nav.passableAt(x + mx * 4.5, y + my * 4.5)) {
          this.side = -this.side
          mx = rx * radial - ry * this.side * sf; my = ry * radial + rx * this.side * sf
          if (!this.nav.passableAt(x + mx * 4.5, y + my * 4.5)) { mx = rx * radial; my = ry * radial }
        }
      }
      if (goalKind === 'zone') { const s = this._steer(x, y, goal[0], goal[1], t); mx = mx * 0.4 + s[0]; my = my * 0.4 + s[1] }
      if (goalKind === 'cube' && goal) { const s = this._steer(x, y, goal[0], goal[1], t); mx = s[0]; my = s[1] }
      wantBoost = P.boost > 0.6 && d > hi * 1.5
    } else if (goal) {
      const gd = Math.hypot(goal[0] - x, goal[1] - y)
      if (goalKind === 'drop' && gd < 3) { mx = 0; my = 0 } else {
        const s = this._steer(x, y, goal[0], goal[1], t)
        mx = s[0]; my = s[1]
        if (gd < 3 && goalKind !== 'loot' && goalKind !== 'cube') { mx *= 0.4; my *= 0.4 }
        else if (gd > 12 && P.zigDeg > 0 && goalKind !== 'zone') {
          // zigzag while travelling (house bots never walk a straight line for long)
          if (t >= this.strafeUntil) { this.side = -this.side; this.strafeUntil = t + this._strafeInterval() }
          if (t >= this.jinkUntil) { this.jinkUntil = t + R.range(P.jinkS[0], P.jinkS[1]); this.jinkAng = R.range(-0.4, 0.4) * P.zigDeg * DEG; this.jinkSpd = 1 - R() * P.speedVar * 0.6 }
          const ang = this.side * P.zigDeg * DEG + this.jinkAng
          const ca = Math.cos(ang) * this.jinkSpd, sa = Math.sin(ang) * this.jinkSpd
          const jx = mx * ca - my * sa, jy = mx * sa + my * ca
          if (this.nav.passableAt(x + jx * 5, y + jy * 5)) { mx = jx; my = jy }
        }
      }
      wantBoost = !me.in_zone || (goalKind === 'zone') || ((goalKind === 'hunt' || goalKind === 'search' || goalKind === 'rotate' || goalKind === 'drop') && gd > 70 && P.boost > 0.3)
    }
    if (t < this.dodgeUntil) { mx = this.dodgeX; my = this.dodgeY; this.strafeUntil = Math.max(this.strafeUntil, this.dodgeUntil + 0.2) }
    const ml = Math.hypot(mx, my)
    if (ml > 1) { mx /= ml; my /= ml }

    // energy use with hysteresis; lightning carriers keep a reserve
    const reserve = sec && sec.kind === 'lightning' ? 55 : 30 - 20 * P.boost
    if (this.boosting) { if (me.energy < reserve || !wantBoost) this.boosting = false } else if (wantBoost && me.energy > reserve + 30 && (me.in_zone ? R() < 0.08 + 0.2 * P.boost : true)) this.boosting = true
    if (!me.in_zone && me.energy > 5 && ml > 0.1) this.boosting = true

    // stuck: hop and sidestep
    if (t - this.stuckT >= 1) {
      const moved = Math.hypot(x - this.stuckX, y - this.stuckY)
      if (ml > 0.5 && moved < 1.2 && me.grounded && !(goalKind === 'drop')) {
        this.unstickUntil = t + 0.9; this.unstickDir = R() * TAU
        this.hopUntil = t + 1.3; act.jump = true
        this.pathT = -1e9
      }
      this.stuckT = t; this.stuckX = x; this.stuckY = y
    }
    if (t < this.unstickUntil) { mx = Math.cos(this.unstickDir); my = Math.sin(this.unstickDir) }

    // the standard hop: jump, jet 1.5 s, coast
    if (t >= this.nextHopT) {
      const rate = (fighting ? P.hopPerMinFight : P.hopPerMin) / 60
      this.nextHopT = t + (rate > 0 ? -Math.log(1 - R()) / rate : 1e9)
      if (me.grounded && me.energy > 40 && rate > 0 && ml > 0.2) { act.jump = true; this.hopUntil = t + 1.5 }
    }
    let jet = false
    if (t < this.hopUntil) { if (me.grounded && !act.jump && t > this.hopUntil - 1.3) this.hopUntil = -1; else jet = true }
    act.move = [mx, my]
    act.boost = jet || (this.boosting && me.grounded)

    // ---- torso and triggers
    let yaw = null, pitch = 0
    const rho = Math.exp(-0.1 / P.aimDriftS), sg = P.aimSigmaDeg * DEG * Math.sqrt(1 - rho * rho)
    this.errYaw = this.errYaw * rho + R.gauss() * sg; this.errPitch = this.errPitch * rho + R.gauss() * sg * 0.6
    const fire = [false, false]
    const aimAt = shootCrate ? null : (tgt || npc)
    if (aimAt) {
      const isMech = aimAt.kind === 'mech'
      const hgt = isMech ? this.cfg.mech.height * (1 + this.cfg.cubes.size_per_cube * (aimAt.cubes || 0)) : this.cfg.npc.height
      const d = Math.hypot(aimAt.pos[0] - x, aimAt.pos[1] - y, aimAt.pos[2] - z)
      const tr = this.tracks.get(aimAt.id)
      const reacted = tr && t - tr.firstT >= tr.react
      const grounded = !isMech || Math.abs(aimAt.vel[2]) < 0.3
      const L = this._lead(me, aimAt.pos, aimAt.vel, hgt, gunSpeed, grounded)
      yaw = L[0] + this.errYaw; pitch = L[1] + this.errPitch
      const clear = this._clearShot(me, aimAt.pos[0], aimAt.pos[1], aimAt.pos[2], hgt) && !this._mateInLine(obs, aimAt.pos[0], aimAt.pos[1])
      const inRange = d < Math.min(P.maxTof * gunSpeed, gun ? gun.stats.range : 0)
      let gunOk = true
      // second weapon
      if (sec && isMech && (role !== 'hold' || this.squadP.holdSecondary || (sec.charge || 0) > 0)) {
        const st = sec.stats
        if (sec.kind === 'laser') {
          const charge = sec.charge || 0
          if (charge > 0) {
            // charging: track the target, let go at full charge with a direct bearing
            const full = charge >= st.charge - 0.051
            if (full) { yaw = Math.atan2(aimAt.pos[1] + aimAt.vel[1] * 0.05 - y, aimAt.pos[0] + aimAt.vel[0] * 0.05 - x) + this.errYaw; pitch = Math.atan2(aimAt.pos[2] + hgt * 0.5 - z - me.stats.muzzle_height, Math.hypot(aimAt.pos[0] - x, aimAt.pos[1] - y) || 1) + this.errPitch }
            fire[secSlot] = !full
          } else if (sec.cooldown <= 0 && clear && reacted && d < Math.min(st.range * 0.92, P.laserMaxTof * gunSpeed * 1.6)) fire[secSlot] = true
        } else if (sec.kind === 'lightning') {
          if (d < st.range * 0.96 && me.energy >= st.energy && clear && Math.abs(wrap(Math.atan2(aimAt.pos[1] - y, aimAt.pos[0] - x) - me.aim[0])) < st.cone_deg * DEG * 0.85) fire[secSlot] = true
        } else if (sec.kind === 'mortar') {
          if (this.mortarMode > 0) this.mortarMode--
          const dh = Math.hypot(aimAt.pos[0] - x, aimAt.pos[1] - y)
          if (sec.cooldown <= 0 && reacted && dh >= P.mortarRange[0] && dh <= P.mortarRange[1] && (this.mortarMode > 0 || ((gun && gun.reload > 0) || R() < P.mortarProb))) {
            if (this.mortarMode === 0) this.mortarMode = 8
            // linear lead to a ground point
            const tubeZ = z + me.stats.height + 0.5
            let tf = dh / (st.speed * 0.9), px = aimAt.pos[0], py = aimAt.pos[1], th = null
            for (let k = 0; k < 2; k++) {
              px = aimAt.pos[0] + aimAt.vel[0] * tf * P.lead; py = aimAt.pos[1] + aimAt.vel[1] * tf * P.lead
              const dd = Math.hypot(px - x, py - y)
              th = this._mortarPitch(Math.max(1, dd - 3), this.world.ground(px, py) + 1 - tubeZ, st.speed, st.gravity)
              if (th === null) break
              tf = dd / (st.speed * Math.cos(th))
            }
            if (th !== null && th <= me.stats.max_pitch) {
              yaw = Math.atan2(py - y, px - x) + this.errYaw; pitch = th + this.errPitch
              gunOk = false
              if (Math.abs(wrap(yaw - me.aim[0])) < 0.03 && Math.abs(pitch - me.aim[1]) < 0.03 && !this._mateInLine(obs, px, py)) { fire[secSlot] = true; this.mortarMode = 0 }
            } else this.mortarMode = 0
          }
        }
      }
      if (gun && gunOk && clear && inRange && reacted && gun.cooldown <= 0 && gun.ammo > 0 && gun.reload <= 0) {
        const off = Math.hypot(wrap(yaw - me.aim[0]), pitch - me.aim[1])
        if (off < P.aimTolDeg * DEG + Math.abs(this.errYaw) && R() < P.fireProb * (role === 'hold' ? this.squadP.holdFireMult : 1)) fire[gunSlot] = true
      }
      act._tgt = aimAt.id
    } else if (crate) {
      const cz = crate.pos[2] + this.cfg.crates.height * 0.5
      yaw = Math.atan2(crate.pos[1] - y, crate.pos[0] - x) + this.errYaw
      pitch = Math.atan2(cz - z - me.stats.muzzle_height, Math.hypot(crate.pos[0] - x, crate.pos[1] - y) || 1) + this.errPitch
      const w = this.world
      const clear = w.shotClear(x, y, z + me.stats.muzzle_height, crate.pos[0], crate.pos[1], cz)
      if (!clear) this.crateSkip.add(crate.id)
      if (gun && clear && gun.cooldown <= 0 && gun.ammo > 0 && gun.reload <= 0 && Math.hypot(wrap(yaw - me.aim[0]), pitch - me.aim[1]) < 0.03) fire[gunSlot] = true
      if (sec && sec.kind === 'lightning' && Math.hypot(crate.pos[0] - x, crate.pos[1] - y) < sec.stats.range * 0.9 && me.energy > 50) fire[secSlot] = true
      act._tgt = crate.id
    } else {
      // nobody to shoot: look where the damage came from, else sweep around the heading
      if (this.lookYaw !== null && t >= this.lookAt && t < this.lookUntil) yaw = this.lookYaw
      else {
        const heading = ml > 0.1 ? Math.atan2(my, mx) : this.lastYaw
        if (shared && t - shared.t < 8) yaw = Math.atan2(shared.y - y, shared.x - x)
        else yaw = heading + 46 * DEG * Math.sin(TAU * t / 4.7 + this.scanPhase)
        if (ml > 0.1) this.lastYaw = heading
      }
      // a laser left charging is let go
    }
    if (this.lookYaw !== null && t >= this.lookUntil) this.lookYaw = null
    if (aimAt && this.lookYaw !== null) this.lookYaw = null
    if (yaw !== null) act.aim = [wrap(yaw), clamp(pitch, me.stats.min_pitch, me.stats.max_pitch)]
    act.fire = fire
    if (gun && gun.reload <= 0 && gun.ammo > 0 && gun.ammo <= 3 && !aimAt && !crate) act.reload = true

    // ---- loot and upgrades
    if (takeId >= 0) { act.take = takeId; if (takeDrop >= 0) act.drop = takeDrop }
    if (obs.offer) {
      let pick = 0, br = 1e9
      obs.offer.choices.forEach((c, i) => { const r = P.upgrades.indexOf(c.id); if (r >= 0 && r < br) { br = r; pick = i } })
      act.pick = pick
    }
    return act
  }
}

/** A lone house bot of the given type (free-for-all). */
export function makeHouseBot(type, ctx) {
  const p = ctx.params || mergeParams(null).house
  return new HouseBot(type, { world: ctx.world, nav: ctx.nav, params: p })
}

/** The practice squad: `roster` house bots that share one controller. Returns { bots, squad }. */
export function makeSquad(ctx) {
  const merged = ctx.merged || mergeParams(ctx.paramsOverride)
  const squad = new Squad(merged.squad, ctx.seed ?? 1)
  const roster = ctx.roster || merged.squad.roster
  const bots = roster.map((type) => new HouseBot(type, { world: ctx.world, nav: ctx.nav, params: merged.house, squad, squadParams: merged.squad, omniscient: ctx.omniscient }))
  return { bots, squad }
}

// the roster of the official replay, slot by slot
export const FFA_TYPES = ['expert', 'hard', 'brawler', 'sniper', 'thirdparty', 'farmer', 'expert', 'hard', 'ffa_medium', 'brawler', 'sniper', 'thirdparty', 'farmer', 'expert', 'hard', 'ffa_medium']
