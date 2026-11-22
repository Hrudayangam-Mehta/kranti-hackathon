// DEV ONLY: local match simulator for protocol mechfight/1, written from kit/protocol.md sections 2-11 and the
// numbers of a real hello.config. Deterministic 20 Hz physics, one observation / action exchange every
// `decide_every` ticks. Geometry, sight lines and walkability come from bot/lib/world.js and bot/lib/nav.js.
// See README.md for the list of rules implemented and every assumption made where the protocol is silent.
//
//   const m = new Match({ world, nav, seed, config, bots, mode })
//   const result = m.runSync()            // every bot in-process
//   const result = await m.run()          // any mix of in-process and external (procbot.js) bots
//
// bots[i]: { name, hello(h), act(obs) -> action, end?(msg), async?: true, team?: number }
//   hello() and act() may return promises when `async` is set (external processes); an act() that resolves to
//   null counts as a missed answer (coast, protocol section 2). Bots with the same `team` form a squad: with
//   friendlyFire off (the default) their shots pass through each other.

import { Nav } from '../bot/lib/nav.js'
import { distToPrismEdge2D } from '../bot/lib/world.js'
import { Collider, moveBody, segCylinder } from './physics.js'
import { makeRng, hashSeed } from './rng.js'

const PI = Math.PI, TAU = 2 * Math.PI, DEG = PI / 180
const wrap = (a) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI }
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const r1 = (v) => Math.round(v * 10) / 10
const r2 = (v) => Math.round(v * 100) / 100
const r3 = (v) => Math.round(v * 1000) / 1000
const fin = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const SIZE_KEYS = ['radius', 'height', 'eye_height', 'muzzle_height']
const ID_NPC = 100, ID_CRATE = 1000, ID_CUBE = 5000, ID_PICKUP = 8000, ID_DROP = 20000
const NPC_BULLET_RANGE = 150      // assumption: the protocol gives no range for drone bullets
const CUBE_H = 1.0, PICKUP_H = 1.0

export const DEFAULT_OPTIONS = {
  latency: 0,              // extra decisions between an answer and its application (0 = protocol lockstep)
  friendlyFire: null,      // null: off between bots that share a `team`, on otherwise
  focus: null,             // slot whose death ends the match early (squad practice); null = play to the end
  shareTiedPlace: 'best',  // mechs dying on the same tick share the best place of the group ('worst' = the other reading)
  lightningHalfCone: true, // cone_deg is the half angle ("within cone_deg of your aim yaw")
  collectShots: true,      // keep a per-shot gun log (range, hit) for statistics
  maxDecisions: Infinity,
}

export class Match {
  constructor(o) {
    this.world = o.world
    this.cfg = JSON.parse(JSON.stringify(o.config))
    const mc = this.cfg.mech
    this.nav = o.nav || new Nav(o.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
    this.seed = (o.seed ?? 1) >>> 0
    this.mode = o.mode || 'ffa'
    this.opt = { ...DEFAULT_OPTIONS, ...(o.options || {}) }
    for (const k of Object.keys(DEFAULT_OPTIONS)) if (o[k] !== undefined) this.opt[k] = o[k]
    // a bot may also be given as { name, make(hello) -> { act(obs) } } (the form used in SPEC.md)
    this.bots = o.bots.map((b) => {
      if (typeof b.act === 'function' || typeof b.make !== 'function') return b
      const w = { name: b.name, team: b.team, inner: null, hello(h) { w.inner = b.make(h); return { type: 'ready', name: b.name } }, act(obs) { return w.inner.act(obs) }, end(msg) { if (w.inner && w.inner.end) w.inner.end(msg) } }
      return w
    })
    // squad practice: the one bot without a team is the team bot; its death ends the match
    if (this.mode === 'squad' && this.opt.focus === null && o.focus === undefined) {
      const solo = this.bots.map((b, i) => (b.team === undefined || b.team === null ? i : -1)).filter((i) => i >= 0)
      if (solo.length === 1) this.opt.focus = solo[0]
    }
    this.mapDir = o.mapDir || '/arena'
    this.col = o.collider || new Collider(o.world)
    this.dt = 1 / this.cfg.match.tick_hz
    this.every = this.cfg.match.decide_every
    this.slopeTan = Math.tan(mc.max_slope_deg * DEG)
    this.tick = 0; this.t = 0
    this.rWorld = makeRng(hashSeed(this.seed, 1))
    this.rPhys = makeRng(hashSeed(this.seed, 2))
    this.rSound = makeRng(hashSeed(this.seed, 3))
    this.rLoot = makeRng(hashSeed(this.seed, 4))
    this.rNpc = makeRng(hashSeed(this.seed, 5))
    this.upDefs = new Map(this.cfg.upgrades.map((u) => [u.id, u]))
    this.projectiles = []; this.nextProj = 1
    this.cubes = []; this.nextCube = ID_CUBE
    this.pickups = []; this.nextPickup = ID_PICKUP
    this.shots = []                 // gun shot log: {by, tgt, range, tof, hit, t}
    this.log = []                   // match events for analysis: {t, e, ...}
    // optional per-match trace of one slot (analysis only; off by default): { slot, hook(match, frame), worldEvery }
    this.trace = o.trace || null
    this.tr = this.trace ? { slot: this.trace.slot, frames: [], dmg: [], npc: [], cubes: [], world: [], zaps: 0 } : null
    this.over = false
    this._o = [0, 0, 0, false]      // muzzle scratch
    this._setupZone()
    this._setupActors()
    this._setupLoot()
    this._setupDrops()
    this.aliveCount = this.mechs.length
    this.deathsThisTick = []
  }

  // ------------------------------------------------------------------------------------------- set-up

  _setupZone() {
    const z = this.cfg.zone, R = this.rWorld
    const circles = [{ x: z.start_center[0], y: z.start_center[1], r: z.start_radius }]
    const ph = []
    let t = 0
    for (const p of z.phases) {
      const c = circles[circles.length - 1]
      // next circle entirely inside the current one: centre uniform in the disc of radius (r - r_next)
      const a = R() * TAU, d = Math.max(0, c.r - p.radius) * Math.sqrt(R())
      const n = { x: r2(c.x + Math.cos(a) * d), y: r2(c.y + Math.sin(a) * d), r: p.radius }
      circles.push(n)
      ph.push({ from: c, to: n, t0: t, s0: t + p.hold_s, s1: t + p.hold_s + p.shrink_s, dps: p.dps })
      t += p.hold_s + p.shrink_s
    }
    this.phases = ph
    this.zoneEnd = t
    this.zone = { x: circles[0].x, y: circles[0].y, r: circles[0].r, dps: ph[0].dps, phase: 0 }
    this._zoneAt(0)
  }

  _zoneAt(t) {
    const ph = this.phases
    let i = 0
    while (i < ph.length - 1 && t >= ph[i].s1) i++
    const p = ph[i], z = this.zone
    z.phase = i; z.dps = p.dps
    if (t <= p.s0) { z.x = p.from.x; z.y = p.from.y; z.r = p.from.r } else if (t >= p.s1) { z.x = p.to.x; z.y = p.to.y; z.r = p.to.r } else {
      const f = (t - p.s0) / (p.s1 - p.s0)
      z.x = p.from.x + (p.to.x - p.from.x) * f; z.y = p.from.y + (p.to.y - p.from.y) * f; z.r = p.from.r + (p.to.r - p.from.r) * f
    }
  }

  /** Random standable ground point (main walking component) within R of (cx,cy); null when none is found. */
  _groundPoint(rng, cx, cy, R, clear = 4, margin = 0, tries = 400) {
    const nav = this.nav, b = this.world.bounds
    for (let k = 0; k < tries; k++) {
      const a = rng() * TAU, d = R * Math.sqrt(rng())
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d
      if (x < b.minX + margin || x > b.maxX - margin || y < b.minY + margin || y > b.maxY - margin) continue
      const c = nav.idx(x, y)
      if (c < 0 || !nav.pass[c] || nav.comp[c] !== nav.mainComponent || nav.wallDist[c] < clear) continue
      if (nav.clearance[c] < 1e9) continue                       // open sky only
      return [x, y, this.world.surfaceZ(x, y, nav.level[c] + 0.6)]
    }
    return null
  }

  /** Random point on a building roof (4-40 m above the terrain, 2 m from the roof edge). */
  _roofPoint(rng, cx, cy, R, tries = 3000) {
    const w = this.world, b = w.bounds
    for (let k = 0; k < tries; k++) {
      const a = rng() * TAU, d = R * Math.sqrt(rng())
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d
      if (x < b.minX + 5 || x > b.maxX - 5 || y < b.minY + 5 || y > b.maxY - 5) continue
      const id = w.surfacePrism(x, y)
      if (id < 0) continue
      const p = w.prisms[id], up = p.top - w.ground(x, y)
      if (up < 4 || up > 40 || distToPrismEdge2D(p, x, y) < 2) continue
      return [x, y, p.top]
    }
    return null
  }

  _setupActors() {
    const cfg = this.cfg, R = this.rWorld, zc = cfg.zone.start_center, zr = cfg.zone.start_radius
    const n = Math.min(this.bots.length, cfg.match.mechs)
    const spawnR = zr * cfg.match.spawn_zone_fraction
    const pts = []
    let sep = cfg.match.spawn_min_separation
    for (let i = 0; i < n; i++) {
      let p = null
      for (let round = 0; round < 60 && !p; round++) {
        const c = this._groundPoint(R, zc[0], zc[1], spawnR, 5, cfg.match.arena_margin, 60)
        if (c && pts.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) >= sep)) p = c
        else if (round % 20 === 19) sep *= 0.85              // crowded map: relax the separation
      }
      pts.push(p || this._groundPoint(R, zc[0], zc[1], spawnR, 3, 0, 5000) || [zc[0], zc[1], this.world.surfaceZ(zc[0], zc[1])])
    }
    this.mechs = pts.map((p, id) => this._newMech(id, p))
    this.npcs = []
    const nc = cfg.npc
    for (let i = 0; i < nc.count; i++) {
      const p = this._groundPoint(R, zc[0], zc[1], zr, 3, 10) || [zc[0], zc[1], 0]
      this.npcs.push({
        id: ID_NPC + i, idx: i, alive: true, x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, yaw: R() * TAU - PI, pitch: 0, hp: nc.hp,
        hx: p[0], hy: p[1], target: -1, attackedBy: -1, attackedT: -1e9, cooldown: R() * nc.cooldown, gx: p[0], gy: p[1], wait: R() * 3,
        back: false, radius: nc.radius, height: nc.height, scan: i % 4,
      })
    }
  }

  _newMech(id, p) {
    const cfg = this.cfg, mc = cfg.mech, zc = cfg.zone.start_center
    const m = {
      id, alive: true, x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, vz: 0, grounded: true,
      yaw: Math.atan2(zc[1] - p[1], zc[0] - p[0]), pitch: 0, cmdYaw: 0, cmdPitch: 0,
      hp: mc.hp, maxHp: mc.hp, energy: mc.energy, cubes: 0, upgrades: [], upCount: new Map(),
      stats: { ...mc }, wstats: {}, radius: mc.radius, height: mc.height,
      slots: [this._newWeapon('gun'), null],
      mvx: 0, mvy: 0, boost: false, fire0: false, fire1: false, jump: false, idle: false,
      oneShot: null, actQ: [], lastAct: null, missT: -1,
      lastCombatT: -1e9, lastSpendT: -1e9, stepT: 0, jetT: 0, shortUntil: -1e9, charging: false, inZone: true,
      events: [], sounds: [], beams: [], zoneDmg: 0,
      seenM: new Float64Array(cfg.match.mechs).fill(-1e9), seenN: new Float64Array(cfg.npc.count).fill(-1e9),
      offer: null, offerSeq: 0, pendingOffers: 0,
      kills: 0, dmgDealt: 0, dmgTaken: 0, dmgBy: {}, deathT: null, deathBy: null, deathWeapon: null, place: 0,
      team: this.bots[id].team ?? null, lates: 0, missed: 0, shotsFired: 0, shotsHit: 0, crashed: false,
    }
    m.yaw = r3(m.yaw); m.cmdYaw = m.yaw
    this._recalc(m)
    return m
  }

  _newWeapon(kind) {
    return { kind, cooldown: 0, ammo: kind === 'gun' ? this.cfg.weapons.gun.mag : 0, reload: 0, charge: 0, charging: false, full: 0, released: false }
  }

  _setupLoot() {
    const cfg = this.cfg, R = this.rWorld, zc = cfg.zone.start_center, zr = cfg.zone.start_radius
    this.crates = []
    const nCr = cfg.crates.count, roofCr = Math.round(nCr * cfg.crates.roof_fraction)
    for (let i = 0; i < nCr; i++) {
      const p = (i < roofCr && this._roofPoint(R, zc[0], zc[1], zr)) || this._groundPoint(R, zc[0], zc[1], zr, 3, 10) || [zc[0], zc[1], 0]
      this.crates.push({ id: ID_CRATE + i, alive: true, x: p[0], y: p[1], z: p[2], hp: cfg.crates.hp })
    }
    const nF = cfg.loot.floor_count, roofF = Math.round(nF * cfg.loot.floor_roof_fraction)
    for (let i = 0; i < nF; i++) {
      const p = (i < roofF && this._roofPoint(R, zc[0], zc[1], zr)) || this._groundPoint(R, zc[0], zc[1], zr, 3, 10) || [zc[0], zc[1], 0]
      this._spawnPickup(this._lootKind(R), p[0], p[1], p[2], null)
    }
  }

  _lootKind(rng) {
    const w = this.cfg.loot.weights
    let tot = 0
    for (const k in w) tot += w[k]
    let u = rng() * tot
    for (const k in w) { u -= w[k]; if (u < 0) return k }
    return 'mortar'
  }

  _spawnPickup(kind, x, y, z, state) {
    const p = { id: this.nextPickup++, kind, x, y, z, state }
    this.pickups.push(p)
    return p
  }

  _setupDrops() {
    const d = this.cfg.drops, R = this.rWorld
    this.drops = d.times.map((callT, i) => {
      // lands inside the circle the zone is closing to when the drop is called
      let k = 0
      while (k < this.phases.length - 1 && callT >= this.phases[k].s1) k++
      const c = this.phases[k].to
      const p = this._groundPoint(R, c.x, c.y, Math.max(6, c.r * d.spread), 6, 12, 600) || [c.x, c.y, this.world.surfaceZ(c.x, c.y)]
      return { id: ID_DROP + i, x: p[0], y: p[1], z: p[2], callT, landT: callT + d.fall_s, state: 0, holder: -1, progress: 0 }
    })
  }

  // ------------------------------------------------------------------------------------------- stats / upgrades

  /** Recompute a mech's numbers from the config, its upgrades and its cubes. */
  _recalc(m) {
    const cfg = this.cfg, mc = cfg.mech, cc = cfg.cubes
    const st = { ...mc }
    const ws = {}
    for (const k in cfg.weapons) ws[k] = { ...cfg.weapons[k] }
    for (const id of m.upgrades) {
      const def = this.upDefs.get(id)
      if (!def) continue
      for (const e of def.effects) {
        const parts = e.path.split('.')
        const tgt = parts[0] === 'mech' ? st : parts[0] === 'weapons' ? ws[parts[1]] : null
        const key = parts[parts.length - 1]
        if (!tgt || typeof tgt[key] !== 'number') continue
        if (e.mul !== undefined) tgt[key] *= e.mul
        if (e.add !== undefined) tgt[key] += e.add
      }
    }
    const scale = 1 + cc.size_per_cube * m.cubes
    for (const k of SIZE_KEYS) st[k] = mc[k] * scale
    for (const k in st) st[k] = Math.round(st[k] * 1e4) / 1e4
    for (const k in ws) for (const q in ws[k]) ws[k][q] = Math.round(ws[k][q] * 1e4) / 1e4
    ws.gun.mag = Math.round(ws.gun.mag)
    m.stats = st; m.wstats = ws
    m.radius = st.radius; m.height = st.height
    const newMax = Math.round(st.hp * (1 + cc.hp_per_cube * Math.min(m.cubes, cc.stat_cap)) * 100) / 100
    if (newMax > m.maxHp) m.hp += newMax - m.maxHp          // "healing the difference"
    m.maxHp = newMax
    if (m.hp > m.maxHp) m.hp = m.maxHp
    if (m.energy > st.energy) m.energy = st.energy
    m.dmgMul = 1 + cc.damage_per_cube * Math.min(m.cubes, cc.stat_cap)
    m.regenDelay = Math.max(0, st.regen_delay)
  }

  _giveCubes(m, n) {
    const th = this.cfg.cubes.upgrade_thresholds
    for (let i = 0; i < n; i++) {
      m.cubes++
      if (th.includes(m.cubes)) m.pendingOffers++
    }
    this._recalc(m)
  }

  _drawOffer(m) {
    const pool = []
    for (const u of this.cfg.upgrades) {
      if ((m.upCount.get(u.id) || 0) >= u.max) continue
      if (u.requires && !(m.slots[0]?.kind === u.requires || m.slots[1]?.kind === u.requires)) continue
      pool.push(u)
    }
    if (pool.length === 0) return
    const choices = []
    for (let k = 0; k < 3 && pool.length; k++) {
      const u = pool.splice(this.rLoot.int(pool.length), 1)[0]
      choices.push({ id: u.id, name: u.name, desc: u.desc })
    }
    m.offer = { id: ++m.offerSeq, expires: r2(this.t + this.cfg.bot.offer_timeout_s), choices }
  }

  _applyUpgrade(m, i) {
    const c = m.offer.choices[i] || m.offer.choices[0]
    m.offer = null
    m.upgrades.push(c.id)
    m.upCount.set(c.id, (m.upCount.get(c.id) || 0) + 1)
    this._recalc(m)
    m.events.push({ type: 'upgrade', id: c.id })
    this.log.push({ t: this.t, e: 'upgrade', id: m.id, up: c.id })
  }

  // ------------------------------------------------------------------------------------------- messages

  helloFor(i) {
    return {
      type: 'hello', protocol: 'mechfight/1', slot: i, seed: hashSeed(this.opt.botSeedBase ?? 0x51ed270b, i),
      map: { dir: this.mapDir, files: ['v2/world.json', 'v2/terrain.i16'] }, config: JSON.parse(JSON.stringify(this.cfg)),
    }
  }

  _teamOf(id) { return id >= 0 && id < this.mechs.length ? this.mechs[id].team : null }
  _friendly(a, b) {
    if (a === b) return true
    if (this.opt.friendlyFire === true) return false
    const ta = this._teamOf(a)
    return ta !== null && ta !== undefined && ta === this._teamOf(b)
  }

  // ------------------------------------------------------------------------------------------- sounds / beams

  _sound(kind, x, y, src) {
    const range = this.cfg.sound.range[kind]
    if (!range) return
    const r2max = range * range, sc = this.cfg.sound
    for (const m of this.mechs) {
      if (!m.alive || m.id === src) continue
      const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy
      if (d2 > r2max) continue
      const d = Math.sqrt(d2)
      const bearing = wrap(Math.atan2(dy, dx) + this.rSound.gauss() * sc.bearing_noise_deg * DEG * m.stats.hearing)
      m.sounds.push({ kind, bearing: r3(bearing), dist: d < sc.near ? 'near' : d < sc.mid ? 'mid' : 'far', tick: this.tick })
    }
  }

  _beam(by, kind, path) {
    const pts = path.map((p) => [r2(p[0]), r2(p[1]), r2(p[2])])
    for (const m of this.mechs) {
      if (!m.alive || m.id === by) continue
      let vis = false
      for (let i = 0; i < path.length && !vis; i++) {
        vis = this._seesPoint(m, path[i][0], path[i][1], path[i][2])
        if (!vis && i > 0) vis = this._seesPoint(m, (path[i][0] + path[i - 1][0]) / 2, (path[i][1] + path[i - 1][1]) / 2, (path[i][2] + path[i - 1][2]) / 2)
      }
      if (vis) m.beams.push({ by, kind, path: pts, tick: this.tick })
    }
  }

  // ------------------------------------------------------------------------------------------- vision

  /** Protocol section 8: near circle (canopy ignored) or far wedge (canopy fades), eye to the given point. */
  _seesPoint(m, x, y, z) {
    const dx = x - m.x, dy = y - m.y, dz = z - m.z
    const d2 = dx * dx + dy * dy + dz * dz
    const v = this.cfg.vision, st = m.stats
    const near = v.near_range + st.near_range_bonus
    const ez = m.z + st.eye_height
    if (d2 <= near * near) return this.world.sightClear(m.x, m.y, ez, x, y, z)
    const far = v.range + st.vision_bonus
    if (d2 > far * far) return false
    if (Math.abs(wrap(Math.atan2(dy, dx) - m.yaw)) > v.fov_deg * DEG * 0.5) return false
    return v.canopy_blocks ? this.world.canSee(m.x, m.y, ez, x, y, z) : this.world.sightClear(m.x, m.y, ez, x, y, z)
  }

  /** An object is seen when the eye has a line to its centre or its top (feet at z, height h). */
  _seesBody(m, x, y, z, h) {
    const dx = x - m.x, dy = y - m.y, dz = z - m.z
    const d2 = dx * dx + dy * dy + dz * dz
    const v = this.cfg.vision, st = m.stats
    const near = v.near_range + st.near_range_bonus
    const ez = m.z + st.eye_height, w = this.world
    if (d2 <= near * near) return w.sightClear(m.x, m.y, ez, x, y, z + h * 0.5) || w.sightClear(m.x, m.y, ez, x, y, z + h)
    const far = v.range + st.vision_bonus
    if (d2 > far * far) return false
    if (Math.abs(wrap(Math.atan2(dy, dx) - m.yaw)) > v.fov_deg * DEG * 0.5) return false
    if (v.canopy_blocks) return w.canSee(m.x, m.y, ez, x, y, z + h * 0.5) || w.canSee(m.x, m.y, ez, x, y, z + h)
    return w.sightClear(m.x, m.y, ez, x, y, z + h * 0.5) || w.sightClear(m.x, m.y, ez, x, y, z + h)
  }

  // ------------------------------------------------------------------------------------------- observation

  _obs(m) {
    const cfg = this.cfg, t = this.t, tick = this.tick, dt = this.dt, mem = cfg.vision.memory_s
    const weapons = m.slots.map((w) => {
      if (!w) return null
      const o = { kind: w.kind, cooldown: r2(Math.max(0, w.cooldown)), stats: { ...m.wstats[w.kind] } }
      if (w.kind === 'gun') { o.ammo = w.ammo; o.reload = r2(Math.max(0, w.reload)) }
      if (w.kind === 'laser') o.charge = r2(w.charge)
      return o
    })
    const mechs = []
    for (const e of this.mechs) {
      if (!e.alive || e === m) continue
      if (this._seesBody(m, e.x, e.y, e.z, e.height)) m.seenM[e.id] = t
      if (t - m.seenM[e.id] > mem) continue
      const o = { id: e.id, kind: 'mech', pos: [r2(e.x), r2(e.y), r2(e.z)], vel: [r2(e.vx), r2(e.vy), r2(e.vz)], aim: [r3(e.yaw), r3(e.pitch)] }
      if (cfg.vision.show_enemy_hp) { o.hp = r1(e.hp); o.max_hp = r1(e.maxHp) }
      o.cubes = e.cubes
      o.weapons = []
      for (const w of e.slots) if (w) o.weapons.push(w.kind)
      o.charging = e.charging
      mechs.push(o)
    }
    for (const e of this.npcs) {
      if (!e.alive) continue
      if (this._seesBody(m, e.x, e.y, e.z, e.height)) m.seenN[e.idx] = t
      if (t - m.seenN[e.idx] > mem) continue
      mechs.push({ id: e.id, kind: 'npc', pos: [r2(e.x), r2(e.y), r2(e.z)], vel: [r2(e.vx), r2(e.vy), 0], aim: [r3(e.yaw), r3(e.pitch)], hp: r1(e.hp), max_hp: cfg.npc.hp })
    }
    const projectiles = []
    for (const p of this.projectiles) {
      if (p.by === m.id) continue
      if (!this._seesPoint(m, p.x, p.y, p.z)) continue
      projectiles.push({ id: p.id, kind: p.kind, pos: [r2(p.x), r2(p.y), r2(p.z)], vel: [r2(p.vx), r2(p.vy), r2(p.vz)] })
    }
    const crates = [], cubes = [], pickups = []
    const ch = cfg.crates.height
    for (const c of this.crates) if (c.alive && this._seesBody(m, c.x, c.y, c.z, ch)) crates.push({ id: c.id, pos: [r2(c.x), r2(c.y), r2(c.z)], hp: r1(c.hp) })
    for (const c of this.cubes) if (this._seesBody(m, c.x, c.y, c.z, CUBE_H)) cubes.push({ id: c.id, pos: [r2(c.x), r2(c.y), r2(c.z)] })
    for (const p of this.pickups) if (this._seesBody(m, p.x, p.y, p.z, PICKUP_H)) pickups.push({ id: p.id, kind: p.kind, pos: [r2(p.x), r2(p.y), r2(p.z)] })
    const sounds = m.sounds.map((s) => ({ kind: s.kind, bearing: s.bearing, dist: s.dist, age: r2((tick - s.tick + 1) * dt) }))
    const beams = m.beams.map((b) => ({ by: b.by, kind: b.kind, path: b.path, age: r2((tick - b.tick + 1) * dt) }))
    const events = m.events
    if (m.zoneDmg > 0) { events.push({ type: 'damaged', amount: r2(m.zoneDmg), weapon: 'zone', bearing: null, by: null }); m.zoneDmg = 0 }
    m.sounds = []; m.beams = []; m.events = []
    const drops = []
    for (const d of this.drops) {
      if (d.state === 0 || d.state === 3) continue
      drops.push({ id: d.id, pos: [r2(d.x), r2(d.y), r2(d.z)], radius: cfg.drops.radius, lands_in: r2(Math.max(0, d.landT - t)), capture_s: cfg.drops.capture_s, progress: r2(d.progress), holder: d.holder < 0 ? null : d.holder })
    }
    const z = this.zone, p = this.phases[z.phase]
    const st = { ...m.stats }
    for (const k of SIZE_KEYS) st[k] = r3(st[k])
    return {
      type: 'obs', tick, t: r2(t), alive: this.aliveCount,
      self: {
        id: m.id, pos: [r2(m.x), r2(m.y), r2(m.z)], vel: [r2(m.vx), r2(m.vy), r2(m.vz)], aim: [r3(m.yaw), r3(m.pitch)],
        hp: r1(m.hp), max_hp: r1(m.maxHp), energy: r1(m.energy), max_energy: m.stats.energy, grounded: m.grounded,
        cubes: m.cubes, upgrades: m.upgrades.slice(), weapons, in_zone: m.inZone, stats: st,
      },
      mechs, projectiles, crates, cubes, pickups, sounds, beams, events,
      zone: { center: [r2(z.x), r2(z.y)], radius: r2(z.r), next_center: [p.to.x, p.to.y], next_radius: p.to.r, shrink_start: p.s0, shrink_end: p.s1, dps: z.dps },
      offer: m.offer ? { id: m.offer.id, expires: m.offer.expires, choices: m.offer.choices.map((c) => ({ ...c })) } : null,
      drops,
    }
  }

  // ------------------------------------------------------------------------------------------- actions

  /** Server-side reading of a bot answer. Returns null when the answer is missing or carries the wrong tick. */
  _readAction(m, a, tick) {
    if (!a || typeof a !== 'object' || a.tick !== tick) return null
    const mc = m.stats
    const out = { mx: 0, my: 0, boost: a.boost === true, jump: a.jump === true, yaw: null, pitch: null, f0: false, f1: false, reload: a.reload === true, pick: -1, take: -1, drop: -1, tgt: -1 }
    if (Array.isArray(a.move)) {
      let x = fin(a.move[0]), y = fin(a.move[1])
      const l = Math.hypot(x, y)
      if (l > 1) { x /= l; y /= l }
      out.mx = x; out.my = y
    }
    if (Array.isArray(a.aim) && Number.isFinite(a.aim[0]) && Number.isFinite(a.aim[1])) { out.yaw = wrap(a.aim[0]); out.pitch = clamp(a.aim[1], mc.min_pitch, mc.max_pitch) }
    if (Array.isArray(a.fire)) { out.f0 = a.fire[0] === true; out.f1 = a.fire[1] === true }
    if (Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2) out.pick = a.pick
    if (typeof a.take === 'number' && Number.isFinite(a.take)) out.take = a.take
    if (a.drop === 0 || a.drop === 1) out.drop = a.drop
    if (Number.isInteger(a._tgt)) out.tgt = a._tgt            // optional bookkeeping hint (unknown fields are ignored by the rules)
    return out
  }

  /** Apply the answers of this decision (index = slot; undefined/null = no valid answer). */
  _applyAnswers(answers) {
    const tick = this.tick, L = this.opt.latency
    for (const m of this.mechs) {
      if (!m.alive) continue
      let act = this._readAction(m, answers[m.id], tick)
      if (L > 0) { m.actQ.push(act); act = m.actQ.length > L ? m.actQ.shift() : { mx: 0, my: 0, boost: false, jump: false, yaw: null, pitch: null, f0: false, f1: false, reload: false, pick: -1, take: -1, drop: -1, tgt: -1 } }
      if (act) {
        m.missT = -1; m.idle = false
        m.mvx = act.mx; m.mvy = act.my; m.boost = act.boost
        if (act.yaw !== null) { m.cmdYaw = act.yaw; m.cmdPitch = act.pitch }
        m.fire0 = act.f0; m.fire1 = act.f1; m.jump = act.jump
        m.oneShot = act; m.tgtHint = act.tgt
      } else {
        // no answer: coast on the continuous parts, drop the one-shot parts; idle after coast_s
        m.missed++
        if (m.missT < 0) m.missT = this.t
        m.fire0 = false; m.fire1 = false; m.jump = false; m.oneShot = null
        if (this.t - m.missT > this.cfg.bot.coast_s - 1e-9) { m.idle = true; m.mvx = 0; m.mvy = 0; m.boost = false }
      }
    }
  }

  // ------------------------------------------------------------------------------------------- tick

  _tick() {
    const dt = this.dt, cfg = this.cfg
    this.tick++
    const t = this.tick * dt
    this.t = t
    const first = (this.tick - 1) % this.every === 0
    this._zoneAt(t)
    for (const m of this.mechs) if (m.alive) this._moveMech(m, first)
    this._separate()
    if (first) this._oneShots()
    for (const m of this.mechs) if (m.alive) this._weapons(m)
    for (const n of this.npcs) if (n.alive) this._npc(n)
    this._projectiles()
    this._cubePickups()
    this._dropsTick()
    // zone, regeneration, offers
    const z = this.zone
    for (const m of this.mechs) {
      if (!m.alive) continue
      const dx = m.x - z.x, dy = m.y - z.y
      m.inZone = dx * dx + dy * dy <= z.r * z.r
      if (!m.inZone) {
        const d = Math.min(m.hp, z.dps * dt)
        m.hp -= d; m.zoneDmg += d; m.dmgTaken += d; m.lastCombatT = t
        if (m.hp <= 0.005) this._kill(m, -1, 'zone')
      } else if (m.hp < m.maxHp && t - m.lastCombatT >= m.regenDelay - 1e-9) {
        m.hp = Math.min(m.maxHp, m.hp + m.stats.regen_per_s * dt)
      }
      if (!m.alive) continue
      if (m.offer && t >= m.offer.expires - 1e-9) this._applyUpgrade(m, 0)
      if (!m.offer && m.pendingOffers > 0) { m.pendingOffers--; this._drawOffer(m) }
    }
    this._placeDeaths()
  }

  _moveMech(m, first) {
    const dt = this.dt, st = m.stats, t = this.t
    // torso
    const tm = m.charging ? this.cfg.weapons.laser.charge_turn_mult : 1
    const dyaw = wrap(m.cmdYaw - m.yaw), my = st.turn_rate * tm * dt
    m.yaw = Math.abs(dyaw) <= my ? m.cmdYaw : wrap(m.yaw + Math.sign(dyaw) * my)
    const dp = clamp(m.cmdPitch, st.min_pitch, st.max_pitch) - m.pitch, mp = st.pitch_rate * tm * dt
    m.pitch = Math.abs(dp) <= mp ? m.pitch + dp : m.pitch + Math.sign(dp) * mp
    // legs
    let spent = false
    const moving = m.mvx !== 0 || m.mvy !== 0
    let speed = st.walk_speed
    if (m.grounded && m.boost && moving && m.energy > 0) {
      speed = st.boost_speed
      m.energy = Math.max(0, m.energy - st.boost_drain * dt); spent = true
    }
    if (m.charging) speed *= st.charge_move_mult
    const wx = m.mvx * speed, wy = m.mvy * speed
    const acc = (m.grounded ? st.ground_accel : st.air_accel) * dt
    const ax = wx - m.vx, ay = wy - m.vy, al = Math.hypot(ax, ay)
    if (al <= acc) { m.vx = wx; m.vy = wy } else { m.vx += ax / al * acc; m.vy += ay / al * acc }
    if (m.grounded && first && m.jump) { m.vz = st.jump_speed; m.grounded = false }
    let jet = false
    if (!m.grounded) {
      if (m.boost && m.energy > 0) {
        m.vz = Math.min(m.vz + st.jet_accel * dt, st.max_rise_speed)
        m.energy = Math.max(0, m.energy - st.jet_drain * dt); spent = true; jet = true
      }
      m.vz -= st.gravity * dt
    }
    if (spent) m.lastSpendT = t
    else if (t - m.lastSpendT >= st.energy_regen_delay - 1e-9 && m.energy < st.energy) m.energy = Math.min(st.energy, m.energy + st.energy_regen * dt)
    moveBody(this.col, m, dt, m.mvx, m.mvy, st.step_up, this.slopeTan)
    // footsteps and jets
    const sc = this.cfg.sound
    if (m.grounded && Math.hypot(m.vx, m.vy) > sc.step_speed) {
      m.stepT += dt
      if (m.stepT >= sc.step_every - 1e-9) { m.stepT = 0; this._sound(speed > st.walk_speed ? 'boost' : 'step', m.x, m.y, m.id) }
    } else if (m.grounded) m.stepT = 0
    if (jet) { if (m.jetT <= 0) { this._sound('jet', m.x, m.y, m.id); m.jetT = sc.step_every } m.jetT -= dt } else m.jetT = 0
  }

  /** "Overlapping mechs are pushed apart." */
  _separate() {
    const M = this.mechs, n = M.length
    for (let i = 0; i < n; i++) {
      const a = M[i]
      if (!a.alive) continue
      for (let j = i + 1; j < n; j++) {
        const b = M[j]
        if (!b.alive) continue
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.radius + b.radius
        const d2 = dx * dx + dy * dy
        if (d2 >= rr * rr || a.z >= b.z + b.height || b.z >= a.z + a.height) continue
        const d = Math.sqrt(d2)
        const ux = d > 1e-6 ? dx / d : 1, uy = d > 1e-6 ? dy / d : 0
        const push = (rr - d) * 0.5
        this._nudge(a, -ux * push, -uy * push)
        this._nudge(b, ux * push, uy * push)
      }
    }
  }

  _nudge(m, dx, dy) {
    const x = m.x + dx, y = m.y + dy
    if (this.col.wallPen(x, y, m.z, m.radius, m.height, m.stats.step_up) > 1e-4) return
    if (this.world.ground(x, y) > m.z + m.stats.step_up) return
    m.x = x; m.y = y
  }

  // ------------------------------------------------------------------------------------------- one-shot actions

  _oneShots() {
    const cfg = this.cfg, t = this.t
    const wants = []
    for (const m of this.mechs) {
      const a = m.oneShot
      if (!m.alive || !a) continue
      m.oneShot = null
      if (a.pick >= 0 && m.offer) this._applyUpgrade(m, Math.min(a.pick, m.offer.choices.length - 1))
      if (a.reload) for (const w of m.slots) if (w && w.kind === 'gun' && w.reload <= 0 && w.ammo < m.wstats.gun.mag) this._startReload(m, w)
      if (a.take >= 0) wants.push([m, a])
      else if (a.drop >= 0) this._dropSlot(m, a.drop)
    }
    if (wants.length === 0) return
    // the closer mech wins a contested pickup
    const dist = (m, p) => Math.hypot(p.x - m.x, p.y - m.y)
    const byId = new Map(this.pickups.map((p) => [p.id, p]))
    wants.sort((u, v) => {
      const pu = byId.get(u[1].take), pv = byId.get(v[1].take)
      return (pu ? dist(u[0], pu) : 1e9) - (pv ? dist(v[0], pv) : 1e9) || u[0].id - v[0].id
    })
    for (const [m, a] of wants) {
      const p = byId.get(a.take)
      const fail = (reason) => m.events.push({ type: 'take_failed', id: a.take, reason })
      if (!p || p.taken) { fail('gone'); continue }
      if (dist(m, p) > cfg.loot.pickup_radius || Math.abs(p.z - m.z) > 4) { fail('range'); continue }
      if (m.slots.some((w) => w && w.kind === p.kind)) { fail('have'); continue }
      let slot = m.slots[0] === null ? 0 : m.slots[1] === null ? 1 : -1
      if (a.drop >= 0 && m.slots[a.drop] !== null) slot = a.drop
      if (slot < 0) { fail('full'); continue }
      if (m.slots[slot] && m.slots[slot].charging) { fail('busy'); continue }
      if (m.slots[slot]) this._dropSlot(m, slot)
      p.taken = true
      const w = this._newWeapon(p.kind)
      if (p.state) { w.ammo = p.state.ammo; if (w.ammo <= 0) w.reload = m.wstats.gun.reload }
      w.cooldown = Math.max(cfg.loot.equip_s, m.wstats[p.kind].cooldown)
      m.slots[slot] = w
      m.events.push({ type: 'took', id: p.id, kind: p.kind, slot })
      this.log.push({ t, e: 'take', id: m.id, kind: p.kind })
    }
    this.pickups = this.pickups.filter((p) => !p.taken)
  }

  _dropSlot(m, slot) {
    const w = m.slots[slot]
    if (!w || w.charging) return false
    const p = this._spawnPickup(w.kind, m.x, m.y, m.z, w.kind === 'gun' ? { ammo: w.ammo } : null)
    m.slots[slot] = null
    m.events.push({ type: 'dropped', id: p.id, kind: w.kind, slot })
    return true
  }

  _startReload(m, w) {
    w.reload = m.wstats.gun.reload
    this._sound('reload', m.x, m.y, m.id)
  }

  // ------------------------------------------------------------------------------------------- weapons

  /** Shot origin: `radius + 0.5` out along the aim from the body axis at height hz, less if a wall is closer. */
  _muzzle(m, hz, yaw, pitch) {
    const cp = Math.cos(pitch), L = m.radius + 0.5
    const ax = m.x, ay = m.y, az = m.z + hz
    const dx = cp * Math.cos(yaw), dy = cp * Math.sin(yaw), dz = Math.sin(pitch)
    const f = this.world.rayShot(ax, ay, az, ax + dx * L, ay + dy * L, az + dz * L)
    const o = this._o
    const k = f < 1 ? Math.max(0, L * f - 0.02) : L
    o[0] = ax + dx * k; o[1] = ay + dy * k; o[2] = az + dz * k; o[3] = f < 1
    return o
  }

  _weapons(m) {
    const dt = this.dt, t = this.t
    let charging = false
    for (let s = 0; s < 2; s++) {
      const w = m.slots[s]
      if (!w) continue
      const st = m.wstats[w.kind]
      const held = (s === 0 ? m.fire0 : m.fire1) && !m.idle
      const prev = w.cooldown
      let ready = false, rem = 0
      if (prev > 0) { const c = prev - dt; if (c <= 1e-9) { ready = true; rem = Math.min(0, c); w.cooldown = 0 } else w.cooldown = c } else ready = true
      if (w.kind === 'gun') {
        if (w.reload > 0) { w.reload -= dt; if (w.reload <= 1e-9) { w.reload = 0; w.ammo = st.mag } }
        if (held && ready && w.reload <= 0 && w.ammo > 0) {
          w.cooldown = st.cooldown + rem
          w.ammo--
          this._fireGun(m, st)
          if (w.ammo <= 0) this._startReload(m, w)
        }
      } else if (w.kind === 'mortar') {
        if (held && ready) { w.cooldown = st.cooldown + rem; this._fireMortar(m, st) }
      } else if (w.kind === 'lightning') {
        if (held && ready && m.energy >= st.energy) {
          w.cooldown = st.cooldown + rem
          m.energy -= st.energy; m.lastSpendT = t
          this._zap(m, st)
        }
      } else if (w.kind === 'laser') {
        if (w.charging) {
          if (w.charge < st.charge - 1e-9) w.charge = Math.min(st.charge, w.charge + dt); else w.full += dt
          if (!held) w.released = true
          if ((w.released && w.charge >= st.min_charge - 1e-9) || w.full >= st.hold_s - 1e-9) {
            const frac = st.min_frac + (1 - st.min_frac) * Math.min(1, w.charge / st.charge)
            w.charging = false; w.charge = 0; w.full = 0; w.released = false
            w.cooldown = st.cooldown
            this._fireLaser(m, st, frac)
          } else charging = true
        } else if (held && ready && t >= m.shortUntil) {
          w.charging = true; w.charge = dt; w.full = 0; w.released = false; charging = true
          this._sound('laser_charge', m.x, m.y, m.id)
        }
      }
    }
    m.charging = charging
  }

  _fireGun(m, st) {
    const sp = st.spread_deg * DEG
    const yaw = m.yaw + this.rPhys.gauss() * sp, pitch = m.pitch + this.rPhys.gauss() * sp
    const o = this._muzzle(m, m.stats.muzzle_height, yaw, pitch)
    const cp = Math.cos(pitch)
    m.shotsFired++
    this._sound('gun', m.x, m.y, m.id)
    let rec = null
    if (this.opt.collectShots) {
      rec = this._shotRecord(m, o, cp * Math.cos(yaw), cp * Math.sin(yaw), Math.sin(pitch), st.speed)
      if (rec) this.shots.push(rec)
    }
    if (o[3]) return                                     // barrel in a wall: the shot stops there
    this.projectiles.push({
      id: this.nextProj++, kind: 'gun', by: m.id, x: o[0], y: o[1], z: o[2],
      vx: cp * Math.cos(yaw) * st.speed, vy: cp * Math.sin(yaw) * st.speed, vz: Math.sin(pitch) * st.speed,
      left: st.range, dmg: st.damage * m.dmgMul, g: 0, ttl: 1e9, rad: this.cfg.projectile.gun_radius, rec, born: this.tick,
    })
  }

  /** Statistics only: which enemy mech a bullet was meant for (the bot's hint, else the smallest angle). */
  _shotRecord(m, o, dx, dy, dz, speed) {
    if (m.tgtHint >= 100) return { by: m.id, tgt: m.tgtHint, range: 0, tof: 0, hit: false, t: this.t }     // drone or crate
    let best = null, bestA = 0.14
    for (const e of this.mechs) {
      if (!e.alive || e === m || this._friendly(m.id, e.id)) continue
      const ex = e.x - o[0], ey = e.y - o[1], ez = e.z + e.height * 0.5 - o[2]
      const d = Math.hypot(ex, ey, ez)
      if (d > 260) continue
      if (m.tgtHint === e.id) { best = e; break }
      const a = Math.acos(clamp((ex * dx + ey * dy + ez * dz) / (d || 1), -1, 1))
      if (a < bestA) { bestA = a; best = e }
    }
    if (!best) return null
    const range = Math.hypot(best.x - m.x, best.y - m.y, best.z - m.z)
    return { by: m.id, tgt: best.id, range, tof: range / speed, hit: false, t: this.t, air: !best.grounded }
  }

  _fireMortar(m, st) {
    const o = this._muzzle(m, m.stats.height + 0.5, m.yaw, m.pitch)
    const cp = Math.cos(m.pitch)
    this._sound('mortar', m.x, m.y, m.id)
    this.log.push({ t: this.t, e: 'mortar', id: m.id })
    if (o[3]) { this._explode(o[0], o[1], o[2], m.id, st, m.dmgMul, -1, -1); return }
    this.projectiles.push({
      id: this.nextProj++, kind: 'mortar', by: m.id, x: o[0], y: o[1], z: o[2],
      vx: cp * Math.cos(m.yaw) * st.speed, vy: cp * Math.sin(m.yaw) * st.speed, vz: Math.sin(m.pitch) * st.speed,
      left: 1e9, dmg: 0, g: st.gravity, ttl: st.ttl, rad: 0, st: { ...st }, mul: m.dmgMul, born: this.tick,
    })
  }

  _fireLaser(m, st, frac) {
    const o = this._muzzle(m, m.stats.muzzle_height, m.yaw, m.pitch)
    const ox = o[0], oy = o[1], oz = o[2]
    this._sound('laser', m.x, m.y, m.id)
    const lzr = { t: this.t, e: 'laser', id: m.id, frac }
    this.log.push(lzr)
    if (o[3]) { this._beam(m.id, 'laser', [[ox, oy, oz], [ox, oy, oz]]); return }
    const cp = Math.cos(m.pitch)
    const dx = cp * Math.cos(m.yaw) * st.range, dy = cp * Math.sin(m.yaw) * st.range, dz = Math.sin(m.pitch) * st.range
    let fEnd = this.world.rayShot(ox, oy, oz, ox + dx, oy + dy, oz + dz)
    const hits = []
    for (const e of this.mechs) {
      if (!e.alive || this._friendly(m.id, e.id)) continue
      const f = segCylinder(ox, oy, oz, dx, dy, dz, e.x, e.y, e.z, e.z + e.height, e.radius)
      if (f >= 0 && f < fEnd) hits.push([f, 0, e])
    }
    for (const e of this.npcs) {
      if (!e.alive) continue
      const f = segCylinder(ox, oy, oz, dx, dy, dz, e.x, e.y, e.z, e.z + e.height, e.radius)
      if (f >= 0 && f < fEnd) hits.push([f, 1, e])
    }
    const cc = this.cfg.crates
    for (const e of this.crates) {
      if (!e.alive) continue
      const f = segCylinder(ox, oy, oz, dx, dy, dz, e.x, e.y, e.z, e.z + cc.height, cc.radius)
      if (f >= 0 && f < fEnd) hits.push([f, 2, e])
    }
    hits.sort((a, b) => a[0] - b[0])
    const cap = 1 + Math.round(st.pierce || 0)          // targets the beam can strike before it stops
    const n = Math.min(hits.length, cap)
    const base = st.damage * frac * m.dmgMul
    if (this.tr) { let mh = 0; for (let i = 0; i < n; i++) if (hits[i][1] === 0) mh++; lzr.mh = mh; lzr.nh = n }
    for (let i = 0; i < n; i++) {
      const [, kind, e] = hits[i]
      if (kind === 0) {
        const cook = e.slots.some((w) => w && w.kind === 'mortar')
        this._hurtMech(e, cook ? base * (1 + st.cookoff) : base, 'laser', m.id, ox, oy, cook ? 'cookoff' : null)
      } else if (kind === 1) this._hurtNpc(e, base, 'laser', m.id)
      else this._hurtCrate(e, base, 'laser', m.id)
    }
    if (hits.length >= cap) fEnd = hits[cap - 1][0]
    this._beam(m.id, 'laser', [[ox, oy, oz], [ox + dx * fEnd, oy + dy * fEnd, oz + dz * fEnd]])
  }

  _zap(m, st) {
    const w = this.world, cc = this.cfg.crates
    const ox = m.x, oy = m.y, oz = m.z + m.stats.muzzle_height
    const half = st.cone_deg * DEG * (this.opt.lightningHalfCone ? 1 : 0.5)
    this._sound('lightning', m.x, m.y, m.id)
    if (this.tr && m.id === this.tr.slot) this.tr.zaps++
    // candidates: [kind, entity, x, y, zCentre]
    const cand = []
    const reach = st.range + st.chain_range * (st.chain + 1)
    for (const e of this.mechs) if (e.alive && e !== m && !this._friendly(m.id, e.id) && Math.abs(e.x - ox) < reach && Math.abs(e.y - oy) < reach) cand.push([0, e, e.x, e.y, e.z + e.height * 0.5])
    for (const e of this.npcs) if (e.alive && Math.abs(e.x - ox) < reach && Math.abs(e.y - oy) < reach) cand.push([1, e, e.x, e.y, e.z + e.height * 0.5])
    for (const e of this.crates) if (e.alive && Math.abs(e.x - ox) < reach && Math.abs(e.y - oy) < reach) cand.push([2, e, e.x, e.y, e.z + cc.height * 0.5])
    let first = null, bd = st.range
    for (const c of cand) {
      const dx = c[2] - ox, dy = c[3] - oy, dz = c[4] - oz
      const d = Math.hypot(dx, dy, dz)
      if (d > bd) continue
      if (Math.abs(wrap(Math.atan2(dy, dx) - m.yaw)) > half) continue
      if (!w.shotClear(ox, oy, oz, c[2], c[3], c[4])) continue
      bd = d; first = c
    }
    const path = [[ox, oy, oz]]
    if (!first) {
      const cp = Math.cos(m.pitch)
      const dx = cp * Math.cos(m.yaw) * st.range, dy = cp * Math.sin(m.yaw) * st.range, dz = Math.sin(m.pitch) * st.range
      const f = w.rayShot(ox, oy, oz, ox + dx, oy + dy, oz + dz)
      path.push([ox + dx * f, oy + dy * f, oz + dz * f])
      this._beam(m.id, 'lightning', path)
      return
    }
    let dmg = st.damage * m.dmgMul
    let cur = first, sx = ox, sy = oy
    const done = new Set()
    for (let jump = 0; cur; jump++) {
      done.add(cur[1])
      path.push([cur[2], cur[3], cur[4]])
      if (cur[0] === 0) {
        const e = cur[1]
        const hasLaser = e.slots.some((q) => q && q.kind === 'laser')
        if (hasLaser) {
          for (const q of e.slots) if (q && q.kind === 'laser') { q.charging = false; q.charge = 0; q.full = 0; q.released = false }
          e.shortUntil = this.t + st.short_s; e.charging = false
        }
        this._hurtMech(e, dmg, 'lightning', m.id, sx, sy, hasLaser ? 'short' : null)
      } else if (cur[0] === 1) this._hurtNpc(cur[1], dmg, 'lightning', m.id)
      else this._hurtCrate(cur[1], dmg, 'lightning', m.id)
      if (jump >= st.chain) break
      let nxt = null, nd = st.chain_range
      for (const c of cand) {
        if (done.has(c[1])) continue
        const d = Math.hypot(c[2] - cur[2], c[3] - cur[3], c[4] - cur[4])
        if (d > nd || !w.shotClear(cur[2], cur[3], cur[4], c[2], c[3], c[4])) continue
        nd = d; nxt = c
      }
      sx = cur[2]; sy = cur[3]
      cur = nxt
      dmg *= st.chain_falloff
    }
    this._beam(m.id, 'lightning', path)
  }

  // ------------------------------------------------------------------------------------------- projectiles

  _projectiles() {
    const dt = this.dt, w = this.world, cc = this.cfg.crates
    const P = this.projectiles
    let keep = 0
    for (let i = 0; i < P.length; i++) {
      const p = P[i]
      if (p.g) p.vz -= p.g * dt
      let dx = p.vx * dt, dy = p.vy * dt, dz = p.vz * dt
      let len = Math.hypot(dx, dy, dz), last = false
      if (len > p.left) { const k = p.left / len; dx *= k; dy *= k; dz *= k; len = p.left; last = true }
      p.ttl -= dt
      let f = w.rayShot(p.x, p.y, p.z, p.x + dx, p.y + dy, p.z + dz)
      let hitKind = f < 1 ? 3 : -1, hit = null
      const mx = p.x + dx * 0.5, my = p.y + dy * 0.5, reach = len * 0.5 + 8
      for (const e of this.mechs) {
        if (!e.alive) continue
        if (Math.abs(e.x - mx) > reach || Math.abs(e.y - my) > reach) continue
        // own bullets never hit the shooter; an own shell can (not on the tick it leaves the tube)
        if (p.by === e.id ? (p.kind !== 'mortar' || p.born === this.tick) : (p.by < 100 && this._friendly(p.by, e.id))) continue
        const q = segCylinder(p.x, p.y, p.z, dx, dy, dz, e.x, e.y, e.z, e.z + e.height, e.radius + p.rad)
        if (q >= 0 && q < f) { f = q; hitKind = 0; hit = e }
      }
      if (p.kind !== 'npc') {
        for (const e of this.npcs) {
          if (!e.alive || Math.abs(e.x - mx) > reach || Math.abs(e.y - my) > reach) continue
          const q = segCylinder(p.x, p.y, p.z, dx, dy, dz, e.x, e.y, e.z, e.z + e.height, e.radius + p.rad)
          if (q >= 0 && q < f) { f = q; hitKind = 1; hit = e }
        }
        for (const e of this.crates) {
          if (!e.alive || Math.abs(e.x - mx) > reach || Math.abs(e.y - my) > reach) continue
          const q = segCylinder(p.x, p.y, p.z, dx, dy, dz, e.x, e.y, e.z, e.z + cc.height, cc.radius + p.rad)
          if (q >= 0 && q < f) { f = q; hitKind = 2; hit = e }
        }
      }
      if (hitKind >= 0) {
        const hx = p.x + dx * f, hy = p.y + dy * f, hz = p.z + dz * f
        if (this.tr && p.rec && hitKind === 3 && (p.rec.tgt === this.tr.slot || p.by === this.tr.slot)) { const tg = this.mechs[p.rec.tgt]; p.rec.wall = tg ? r1(Math.hypot(hx - tg.x, hy - tg.y)) : -1 }
        if (p.kind === 'mortar') {
          const back = len > 1e-6 ? 0.05 / len : 0
          this._explode(hx - dx * back, hy - dy * back, hz - dz * back, p.by, p.st, p.mul, hitKind, hit)
        } else if (hitKind === 0) {
          if (p.rec && p.rec.tgt === hit.id) p.rec.hit = true
          if (p.by < 100) this.mechs[p.by].shotsHit++
          this._hurtMech(hit, p.dmg, p.kind, p.by, hit.x - p.vx, hit.y - p.vy, null)
        } else if (hitKind === 1) { if (p.rec && p.rec.tgt === hit.id) p.rec.hit = true; this._hurtNpc(hit, p.dmg, p.kind, p.by) } else if (hitKind === 2) { if (p.rec && p.rec.tgt === hit.id) p.rec.hit = true; this._hurtCrate(hit, p.dmg, p.kind, p.by) }
        continue
      }
      p.x += dx; p.y += dy; p.z += dz; p.left -= len
      if (last || p.left <= 1e-6) continue
      if (p.ttl <= 1e-9) { if (p.kind === 'mortar') this._explode(p.x, p.y, p.z, p.by, p.st, p.mul, -1, null); continue }
      P[keep++] = p
    }
    P.length = keep
  }

  /** Mortar blast at (x,y,z). directKind/direct: what the shell itself struck (0 mech, 1 npc, 2 crate) or -1. */
  _explode(x, y, z, by, st, mul, directKind, direct) {
    const w = this.world, R = st.splash_radius, cc = this.cfg.crates
    this._sound('explosion', x, y, -1)
    const owner = by < 100 ? this.mechs[by] : null
    const fall = (d) => 1 - (1 - st.splash_edge) * d / R
    for (const e of this.mechs) {
      if (!e.alive) continue
      const self = e.id === by
      if (!self && this._friendly(by, e.id)) continue
      let f, dmg
      const ax = e.x - x, ay = e.y - y
      if (directKind === 0 && direct === e) { f = 1; dmg = st.damage } else {
        const cz = clamp(z, e.z, e.z + e.height)
        const d = Math.max(0, Math.hypot(ax, ay, cz - z) - e.radius)
        if (d > R) continue
        if (!w.shotClear(x, y, z, e.x, e.y, e.z + e.height * 0.5) && !w.shotClear(x, y, z, e.x, e.y, e.z + e.height * 0.9)) continue   // "blocked by walls"
        f = fall(d); dmg = st.splash * f
      }
      dmg *= mul
      if (self) dmg *= e.stats.self_damage_mult
      // concussion: thrown away from the blast, energy drained, scaled by the same falloff
      const al = Math.hypot(ax, ay)
      const ux = al > 1e-6 ? ax / al : Math.cos(e.yaw), uy = al > 1e-6 ? ay / al : Math.sin(e.yaw)
      e.vx += ux * st.knock * f; e.vy += uy * st.knock * f; e.vz += st.knock_up * f
      e.grounded = false
      e.energy = Math.max(0, e.energy - st.drain * f)
      e.events.push({ type: 'effect', effect: 'concuss', by })
      this._hurtMech(e, dmg, 'mortar', by, x, y, 'concuss')
    }
    for (const e of this.npcs) {
      if (!e.alive) continue
      if (directKind === 1 && direct === e) { this._hurtNpc(e, st.damage * mul, 'mortar', by); continue }
      const d = Math.max(0, Math.hypot(e.x - x, e.y - y, clamp(z, e.z, e.z + e.height) - z) - e.radius)
      if (d <= R && w.shotClear(x, y, z, e.x, e.y, e.z + e.height * 0.5)) this._hurtNpc(e, st.splash * fall(d) * mul, 'mortar', by)
    }
    for (const e of this.crates) {
      if (!e.alive) continue
      if (directKind === 2 && direct === e) { this._hurtCrate(e, st.damage * mul, 'mortar', by); continue }
      const d = Math.max(0, Math.hypot(e.x - x, e.y - y, clamp(z, e.z, e.z + cc.height) - z) - cc.radius)
      if (d <= R && w.shotClear(x, y, z, e.x, e.y, e.z + cc.height * 0.5)) this._hurtCrate(e, st.splash * fall(d) * mul, 'mortar', by)
    }
    if (owner) this.log.push({ t: this.t, e: 'boom', id: by, x, y, z })
  }

  // ------------------------------------------------------------------------------------------- damage

  /** Weapon damage to a mech. (sx,sy): the point the shot came from (rear armour, bearing). `by` is a mech or NPC id. */
  _hurtMech(e, base, weapon, by, sx, sy, effect) {
    if (!e.alive) return
    const st = e.stats, t = this.t
    const bearing = Math.atan2(sy - e.y, sx - e.x)
    let amt = base
    const rear = Math.abs(wrap(bearing - e.yaw)) > st.front_arc_deg * DEG * 0.5
    if (rear) amt *= st.rear_mult
    amt *= Math.max(0, 1 - st.armor)
    if (amt > e.hp) amt = e.hp
    amt = r2(amt)
    e.hp -= amt; e.dmgTaken += amt; e.lastCombatT = t
    const ev = { type: 'damaged', amount: amt, weapon, bearing: r3(bearing), by }
    if (rear) ev.rear = true
    e.events.push(ev)
    if (effect && effect !== 'concuss') e.events.push({ type: 'effect', effect, by })
    const a = by >= 0 && by < 100 ? this.mechs[by] : null
    if (this.tr && (e.id === this.tr.slot || by === this.tr.slot)) {
      const dd = a && a !== e ? Math.hypot(a.x - e.x, a.y - e.y, a.z - e.z) : -1
      this.tr.dmg.push([r2(t), by, e.id, amt, weapon, r1(dd), rear ? 1 : 0, r1(e.hp)])
    }
    if (a && a !== e) {
      a.dmgDealt += amt; a.lastCombatT = t
      a.dmgBy[weapon] = (a.dmgBy[weapon] || 0) + amt
      const h = { type: 'hit', target: e.id, amount: amt, weapon }
      if (effect) h.effect = effect
      if (rear) h.rear = true
      a.events.push(h)
    }
    if (e.hp <= 0.005) this._kill(e, by, weapon)
  }

  _hurtNpc(n, base, weapon, by) {
    if (!n.alive) return
    const amt = r2(Math.min(n.hp, base))
    n.hp -= amt
    if (this.tr && by === this.tr.slot) this.tr.npc.push([r2(this.t), 'n', n.id, amt, weapon, n.hp <= 1e-9 ? 1 : 0])
    const a = by >= 0 && by < 100 ? this.mechs[by] : null
    if (a) {
      a.lastCombatT = this.t
      a.events.push({ type: 'hit', target: n.id, amount: amt, weapon })
      n.attackedBy = by; n.attackedT = this.t
    }
    if (n.hp <= 1e-9) {
      n.alive = false
      this.log.push({ t: this.t, e: 'npc_dead', id: n.id, by })
      for (let i = 0; i < this.cfg.npc.cubes; i++) this._spawnCube(n.x, n.y, n.z, i, this.cfg.npc.cubes)
    }
  }

  _hurtCrate(c, base, weapon, by) {
    if (!c.alive) return
    const amt = r2(Math.min(c.hp, base))
    c.hp -= amt
    if (this.tr && by === this.tr.slot) this.tr.npc.push([r2(this.t), 'c', c.id, amt, weapon, c.hp <= 1e-9 ? 1 : 0])
    const a = by >= 0 && by < 100 ? this.mechs[by] : null
    if (a) a.events.push({ type: 'hit', target: c.id, amount: amt, weapon })     // does not reset the regen timer
    if (c.hp <= 1e-9) {
      c.alive = false
      this._sound('crate', c.x, c.y, -1)
      this.log.push({ t: this.t, e: 'crate', id: c.id, by })
      for (let i = 0; i < this.cfg.crates.cubes; i++) this._spawnCube(c.x, c.y, c.z, i, this.cfg.crates.cubes)
      if (this.rLoot() < this.cfg.loot.crate_weapon_chance) this._spawnPickup(this._lootKind(this.rLoot), c.x, c.y, c.z, null)
    }
  }

  _spawnCube(x, y, z, i, n) {
    let px = x, py = y
    if (n > 1) { const a = TAU * i / n + this.rLoot() * 0.8, d = 1.2 + this.rLoot() * 1.3; px += Math.cos(a) * d; py += Math.sin(a) * d }
    const s = this.world.surfaceZ(px, py, z + 1.5)
    this.cubes.push({ id: this.nextCube++, x: px, y: py, z: Math.max(s, z - 3) > z + 1.5 ? z : Math.max(s, z - 3) })
  }

  _kill(m, by, weapon) {
    if (!m.alive) return
    m.alive = false; m.hp = 0
    m.deathT = this.t; m.deathBy = by; m.deathWeapon = weapon
    { const k = by >= 0 && by < 100 ? this.mechs[by] : null; m.deathRange = k && k !== m ? Math.hypot(k.x - m.x, k.y - m.y, k.z - m.z) : null }   // distance to the killer when the last hit landed
    this.deathsThisTick.push(m)
    this._sound('death', m.x, m.y, m.id)
    const a = by >= 0 && by < 100 ? this.mechs[by] : null
    if (a && a !== m) { a.kills++; a.events.push({ type: 'kill', target: m.id }) }
    const n = m.cubes + this.cfg.cubes.death_drop_extra
    for (let i = 0; i < n; i++) this._spawnCube(m.x, m.y, m.z, i, Math.max(n, 2))
    if (this.cfg.loot.death_drop) for (const w of m.slots) if (w && w.kind !== 'gun') this._spawnPickup(w.kind, m.x, m.y, m.z, null)
    this.log.push({ t: this.t, e: 'death', id: m.id, by, weapon })
    // drones forget a dead target
    for (const q of this.npcs) if (q.target === m.id) q.target = -1
  }

  _placeDeaths() {
    const D = this.deathsThisTick
    if (D.length === 0) return
    const before = this.aliveCount
    const place = this.opt.shareTiedPlace === 'worst' ? before : before - D.length + 1
    for (const m of D) m.place = place
    this.aliveCount = before - D.length
    this.deathsThisTick = []
    if (this._onDeath) for (const m of D) this._onDeath(m)
  }

  // ------------------------------------------------------------------------------------------- cubes / drops

  _cubePickups() {
    if (this.cubes.length === 0) return
    const R = this.cfg.cubes.pickup_radius, R2 = R * R
    let keep = 0
    for (const c of this.cubes) {
      let best = null, bd = R2
      for (const m of this.mechs) {
        if (!m.alive) continue
        const dx = m.x - c.x, dy = m.y - c.y, d2 = dx * dx + dy * dy
        if (d2 > bd || Math.abs(m.z - c.z) > 4) continue
        if (d2 < bd || !best) { bd = d2; best = m }           // ties keep the lower id (mechs are scanned in id order)
      }
      if (best) {
        this._giveCubes(best, 1)
        if (this.tr && best.id === this.tr.slot) this.tr.cubes.push([r2(this.t), best.cubes])
        best.events.push({ type: 'pickup', cubes: best.cubes })
      } else this.cubes[keep++] = c
    }
    this.cubes.length = keep
  }

  _dropsTick() {
    const dc = this.cfg.drops, t = this.t, dt = this.dt
    for (const d of this.drops) {
      if (d.state === 3) continue
      if (d.state === 0) { if (t >= d.callT - 1e-9) d.state = 1; else continue }
      if (d.state === 1) { if (t >= d.landT - 1e-9) { d.state = 2; this._sound('drop', d.x, d.y, -1) } else continue }
      let only = null, cnt = 0
      for (const m of this.mechs) {
        if (!m.alive) continue
        if (Math.hypot(m.x - d.x, m.y - d.y) <= dc.radius && Math.abs(m.z - d.z) <= 6) { cnt++; only = m }
      }
      if (cnt === 0) { d.holder = -1; d.progress = 0 } else if (cnt === 1) {
        if (d.holder !== only.id) { d.holder = only.id; d.progress = 0 }
        d.progress += dt
        if (d.progress >= dc.capture_s - 1e-9) {
          d.state = 3
          this._giveCubes(only, dc.cubes)
          if (dc.repair) only.hp = only.maxHp
          only.energy = only.stats.energy
          only.events.push({ type: 'drop', id: d.id, cubes: only.cubes })
          this.log.push({ t, e: 'drop', id: only.id })
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------- drones

  _npc(n) {
    const nc = this.cfg.npc, dt = this.dt, t = this.t, w = this.world
    if (n.cooldown > 0) n.cooldown -= dt
    const dHome = Math.hypot(n.x - n.hx, n.y - n.hy)
    const ez = n.z + n.height * 0.8
    let tgt = n.target >= 0 ? this.mechs[n.target] : null
    if (tgt) {
      const d = Math.hypot(tgt.x - n.x, tgt.y - n.y)
      if (!tgt.alive || d >= nc.deaggro_range || dHome >= nc.chase_leash) { n.target = -1; tgt = null; n.back = true }
    }
    if (n.back && dHome <= nc.leash * 0.5) n.back = false
    if (!tgt && !n.back) {
      // whoever attacked it, else the nearest mech in range with a line of sight while it is near home
      if (n.attackedBy >= 0 && t - n.attackedT < 10 && this.mechs[n.attackedBy].alive) { n.target = n.attackedBy; tgt = this.mechs[n.target] }
      else if (dHome <= nc.leash + 0.5 && (this.tick + n.scan) % 4 === 0) {
        let bd = nc.aggro_range
        for (const m of this.mechs) {
          if (!m.alive) continue
          const d = Math.hypot(m.x - n.x, m.y - n.y, m.z - n.z)
          if (d < bd && w.sightClear(n.x, n.y, ez, m.x, m.y, m.z + m.height * 0.5)) { bd = d; tgt = m }
        }
        if (tgt) n.target = tgt.id
      }
    }
    let mx = 0, my = 0, speed = 0
    if (tgt) {
      const dx = tgt.x - n.x, dy = tgt.y - n.y, dz = tgt.z + tgt.height * 0.5 - ez
      const d = Math.hypot(dx, dy)
      const los = w.shotClear(n.x, n.y, ez, tgt.x, tgt.y, tgt.z + tgt.height * 0.5)
      const tof = d / nc.projectile_speed
      const ax = dx + tgt.vx * tof, ay = dy + tgt.vy * tof
      n.yaw = Math.atan2(ay, ax); n.pitch = Math.atan2(dz, Math.hypot(ax, ay) || 1)
      if (los && n.cooldown <= 1e-9 && d < NPC_BULLET_RANGE) {
        n.cooldown = nc.cooldown
        const sp = nc.spread_deg * DEG
        const yaw = n.yaw + this.rNpc.gauss() * sp, pitch = n.pitch + this.rNpc.gauss() * sp, cp = Math.cos(pitch)
        const L = n.radius + 0.5
        this._sound('npc_gun', n.x, n.y, -1)
        this.projectiles.push({
          id: this.nextProj++, kind: 'npc', by: n.id, x: n.x + cp * Math.cos(yaw) * L, y: n.y + cp * Math.sin(yaw) * L, z: ez + Math.sin(pitch) * L,
          vx: cp * Math.cos(yaw) * nc.projectile_speed, vy: cp * Math.sin(yaw) * nc.projectile_speed, vz: Math.sin(pitch) * nc.projectile_speed,
          left: NPC_BULLET_RANGE, dmg: nc.damage, g: 0, ttl: 1e9, rad: this.cfg.projectile.npc_radius, born: this.tick,
        })
      }
      if (!los && d > 1) { mx = dx / d; my = dy / d; speed = nc.speed }       // chase to regain the line
    } else if (n.back || dHome > nc.leash) {
      const d = dHome || 1
      mx = (n.hx - n.x) / d; my = (n.hy - n.y) / d; speed = nc.speed * 0.6
    } else {
      // wander around home
      n.wait -= dt
      const gd = Math.hypot(n.gx - n.x, n.gy - n.y)
      if (gd < 1 || n.wait <= 0) {
        const a = this.rNpc() * TAU, r = nc.leash * 0.85 * Math.sqrt(this.rNpc())
        n.gx = n.hx + Math.cos(a) * r; n.gy = n.hy + Math.sin(a) * r; n.wait = 4 + this.rNpc() * 6
      } else { mx = (n.gx - n.x) / gd; my = (n.gy - n.y) / gd; speed = nc.speed * 0.6; n.yaw = Math.atan2(my, mx); n.pitch = 0 }
    }
    n.vx = 0; n.vy = 0
    if (speed > 0) {
      const x = n.x + mx * speed * dt, y = n.y + my * speed * dt
      const s = w.surfaceZ(x, y, n.z + 1.2)
      if (!w.bodyBlocked(x, y, n.z, n.radius, n.height, 1.2) && s - n.z <= 1.2 && n.z - s <= 2.5) { n.x = x; n.y = y; n.z = s; n.vx = mx * speed; n.vy = my * speed } else n.wait = 0
    }
  }

  // ------------------------------------------------------------------------------------------- match loop

  _alive() { return this.mechs.filter((m) => m.alive) }

  _isOver() {
    if (this.aliveCount <= 1) return true
    if (this.t >= this.cfg.match.duration_s - 1e-9) return true
    if (this.opt.focus !== null && !this.mechs[this.opt.focus].alive) return true
    if (this.decisions >= this.opt.maxDecisions) return true
    return false
  }

  _finish() {
    // the clock ran out (or the match was stopped): survivors are ranked by HP
    const alive = this._alive().sort((a, b) => b.hp - a.hp || a.id - b.id)
    let place = 1
    for (let i = 0; i < alive.length; i++) {
      if (i > 0 && alive[i].hp < alive[i - 1].hp) place = i + 1
      alive[i].place = place
    }
    this.over = true
    return this.result()
  }

  result() {
    const per = this.mechs.map((m) => ({
      id: m.id, name: this.names?.[m.id] ?? this.bots[m.id].name ?? `bot${m.id}`, place: m.place, score: this.mechs.length - m.place, kills: m.kills,
      timeAlive: m.deathT ?? this.t, alive: m.alive, hp: r1(m.hp), cubes: m.cubes, upgrades: m.upgrades.slice(),
      dmgDealt: Math.round(m.dmgDealt), dmgTaken: Math.round(m.dmgTaken), dmgBy: m.dmgBy,
      cause: m.alive ? null : m.deathWeapon, killedBy: m.alive ? null : (m.deathBy >= 0 ? m.deathBy : null),
      deathRange: m.alive || m.deathRange == null ? null : r1(m.deathRange),
      shotsFired: m.shotsFired, shotsHit: m.shotsHit, missed: m.missed, lates: m.lates,
      loadout: m.slots.filter(Boolean).map((w) => w.kind),
    }))
    return {
      seed: this.seed, mode: this.mode, t: this.t, ticks: this.tick, decisions: this.decisions,
      places: per.map((p) => p.place), kills: per.map((p) => p.kills), deathT: per.map((p) => (p.alive ? null : p.timeAlive)),
      mechs: per, stats: this.stats(),
      ...(this.tr ? { trace: this.tr } : {}),
    }
  }

  stats() {
    const deaths = this.log.filter((e) => e.e === 'death')
    const bands = [[0, 40], [40, 80], [80, 130], [130, 1e9]].map(([a, b]) => ({ lo: a, hi: b, n: 0, hit: 0 }))
    for (const s of this.shots) {
      if (s.tgt >= 100) continue
      for (const b of bands) if (s.range >= b.lo && s.range < b.hi) { b.n++; if (s.hit) b.hit++ }
    }
    return {
      firstDeathT: deaths.length ? deaths[0].t : null, lastDeathT: deaths.length ? deaths[deaths.length - 1].t : null,
      deaths: deaths.map((d) => ({ t: d.t, id: d.id, by: d.by, weapon: d.weapon })),
      gunBands: bands, gunShots: this.shots.length,
      cratesDestroyed: this.crates.filter((c) => !c.alive).length, npcsKilled: this.npcs.filter((n) => !n.alive).length,
    }
  }

  _sendEnd(m) {
    const b = this.bots[m.id]
    if (m.endSent || !b.end) return
    m.endSent = true
    try { return b.end({ type: 'end', place: m.place, kills: m.kills }) } catch { /* ignore */ }
  }

  /** In-process bots only: plays the whole match synchronously. */
  runSync() {
    const bots = this.bots, M = this.mechs
    this.names = bots.map((b) => b.name)
    for (const m of M) bots[m.id].hello(this.helloFor(m.id))
    this.decisions = 0
    this._onDeath = (m) => { this._sendEnd(m) }
    const answers = new Array(M.length)
    while (!this._isOver()) {
      for (const m of M) {
        if (!m.alive) { answers[m.id] = null; continue }
        const obs = this._obs(m)
        try { answers[m.id] = bots[m.id].act(obs) } catch (e) { answers[m.id] = null; if (!m.crashed) { m.crashed = true; this.log.push({ t: this.t, e: 'bot_error', id: m.id, msg: String(e?.stack || e) }) } }
      }
      this._applyAnswers(answers)
      if (this.tr) this._traceFrame()
      this.decisions++
      for (let k = 0; k < this.every && !this._tickEnds(); k++) this._tick()
    }
    const res = this._finish()
    for (const m of M) this._sendEnd(m)
    return res
  }

  /** Trace only: one frame of the traced slot per decision (plus every mech every `worldEvery` decisions). */
  _traceFrame() {
    const tr = this.tr, m = this.mechs[tr.slot]
    if (!m.alive) return
    const z = this.zone
    const fr = {
      t: r2(this.t), x: r1(m.x), y: r1(m.y), z: r1(m.z), hp: Math.round(m.hp), mhp: Math.round(m.maxHp), en: Math.round(m.energy), cu: m.cubes, up: m.upgrades.length,
      ld: m.slots.filter(Boolean).map((w) => w.kind[0] + (w.kind === 'lightning' ? 'i' : '')).join(''), mv: [r2(m.mvx), r2(m.mvy)], b: m.boost ? 1 : 0,
      v: r1(Math.hypot(m.vx, m.vy)), g: m.grounded ? 1 : 0, iz: m.inZone ? 1 : 0, ze: r1(z.r - Math.hypot(m.x - z.x, m.y - z.y)), f: (m.fire0 ? 1 : 0) + (m.fire1 ? 2 : 0),
      ch: m.charging ? 1 : 0, vx: r1(m.vx), vy: r1(m.vy),
    }
    if (this.trace.hook) { try { this.trace.hook(this, fr) } catch (e) { fr.hookErr = String(e).slice(0, 80) } }
    tr.frames.push(fr)
    const we = this.trace.worldEvery || 5
    if (this.decisions % we === 0) tr.world.push([r2(this.t), this.mechs.filter((q) => q.alive).map((q) => [q.id, r1(q.x), r1(q.y), r1(q.z), Math.round(q.hp), this.bots[q.id].target ?? -1, q.slots.filter(Boolean).map((w) => w.kind[0] + (w.kind === 'lightning' ? 'i' : '')).join(''), q.charging ? 1 : 0])])
  }

  _tickEnds() { return this.aliveCount <= 1 || (this.opt.focus !== null && !this.mechs[this.opt.focus].alive) }

  /** Any mix of in-process and external bots. External answers are awaited together (lockstep). */
  async run() {
    const bots = this.bots, M = this.mechs
    if (!bots.some((b) => b.async)) return this.runSync()
    const ready = await Promise.all(M.map(async (m) => {
      try { return await bots[m.id].hello(this.helloFor(m.id)) } catch (e) { this.log.push({ t: 0, e: 'bot_error', id: m.id, msg: String(e?.message || e) }); return null }
    }))
    this.names = bots.map((b, i) => (ready[i] && ready[i].name) || b.name)
    this.decisions = 0
    const pendingEnds = []
    this._onDeath = (m) => { const p = this._sendEnd(m); if (p && p.then) pendingEnds.push(p) }
    const answers = new Array(M.length)
    while (!this._isOver()) {
      const waits = []
      for (const m of M) {
        answers[m.id] = null
        if (!m.alive) continue
        const obs = this._obs(m), b = bots[m.id]
        if (b.async) waits.push(b.act(obs).then((a) => { answers[m.id] = a }, () => { answers[m.id] = null }))
        else { try { answers[m.id] = b.act(obs) } catch { answers[m.id] = null } }
      }
      if (waits.length) await Promise.all(waits)
      for (const m of M) { const b = bots[m.id]; if (b.async && m.alive) { m.lates = b.lates || 0 } }
      this._applyAnswers(answers)
      if (this.tr) this._traceFrame()
      this.decisions++
      for (let k = 0; k < this.every && !this._tickEnds(); k++) this._tick()
    }
    const res = this._finish()
    for (const m of M) { const p = this._sendEnd(m); if (p && p.then) pendingEnds.push(p) }
    await Promise.all(pendingEnds)
    for (const m of M) { const b = bots[m.id]; if (b.async) res.mechs[m.id].lates = b.lates || 0 }
    return res
  }
}
