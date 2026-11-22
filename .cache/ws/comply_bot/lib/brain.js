// Mech Royale brain (protocol mechfight/1): senses -> assessment -> mode -> legs -> torso/triggers -> hands.
//
//   createBrain(hello, { world, nav, log }, overrides) -> { act(obs, deadlineMs), debugState() }
//
// `world` and `nav` may be null (map failed to load): the brain then steers in straight lines and treats
// every listed mech as visible. act() never throws: every stage runs inside try/catch and, when it fails,
// the previous good output of its channel (legs / torso / triggers / hands) is reused.
// Layers follow BRAIN_SPEC_V2: 1 senses.js, 2 firecontrol.js, 3 mover.js, 4 tactics.js, 5 economy.js,
// 6 and 7 stance.js. All tunables are in params.js.

import { makeRng, wrapPi } from './aim.js'
import { MODE, PARAMS, STANCES, resolveParams } from './params.js'
import { fnum, makeGunStat, newSelf, sense } from './senses.js'
import { assess, bandFor, decideMode, makeHideSearch, makePosEval, selectTarget } from './tactics.js'
import { makeMover } from './mover.js'
import { makeFireControl } from './firecontrol.js'
import { makeEconomy } from './economy.js'
import { makeStance } from './stance.js'

export { PARAMS, MODE }

// Fallback rule numbers, used only where hello.config lacks a field.
const DEF_CFG = {
  mech: { radius: 2.5, height: 9, eye_height: 8, muzzle_height: 7, hp: 1400, walk_speed: 11.7, boost_speed: 19.5, ground_accel: 58.5,
    gravity: 22, energy: 100, turn_rate: 4, pitch_rate: 3, min_pitch: -0.7, max_pitch: 1.3, regen_delay: 5, regen_per_s: 45,
    charge_move_mult: 0.5, rear_mult: 1.5, step_up: 1.2, boost_drain: 17 },
  vision: { range: 200, fov_deg: 120, near_range: 45, memory_s: 5 },
  weapons: {
    gun: { damage: 45, cooldown: 0.24, speed: 252, range: 230, spread_deg: 0.6, mag: 12, reload: 2.4 },
    mortar: { damage: 200, splash: 160, splash_radius: 7, cooldown: 2.6, speed: 72, gravity: 22 },
    laser: { damage: 315, charge: 0.75, min_charge: 0.15, min_frac: 0.35, hold_s: 2, cooldown: 1.65, range: 280, cookoff: 0.6 },
    lightning: { damage: 60, cooldown: 0.25, range: 45, cone_deg: 30, energy: 3 },
  },
  cubes: { pickup_radius: 3.5, hp_per_cube: 0.04, damage_per_cube: 0.04, stat_cap: 10, size_per_cube: 0.05 },
  crates: { hp: 300, radius: 1.4, height: 2.4 },
  loot: { pickup_radius: 4 },
  npc: { hp: 350, radius: 1.8, height: 3.5, aggro_range: 45, damage: 25, cooldown: 1 },
  drops: { radius: 8, capture_s: 4 },
  zone: {},
  match: { tick_hz: 20, decide_every: 2, mechs: 16, arena_margin: 30 },
}
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o)
function mergeNum(def, given) {
  const out = { ...def }
  if (isObj(given)) for (const k of Object.keys(given)) { const v = given[k]; if (typeof v === 'number' ? Number.isFinite(v) : v != null) out[k] = v }
  return out
}
function normalizeConfig(c) {
  c = isObj(c) ? c : {}
  const out = {}
  for (const k of Object.keys(DEF_CFG)) {
    if (k === 'weapons') {
      out.weapons = {}
      const gw = isObj(c.weapons) ? c.weapons : {}
      for (const wk of new Set([...Object.keys(DEF_CFG.weapons), ...Object.keys(gw)])) out.weapons[wk] = mergeNum(DEF_CFG.weapons[wk] || {}, gw[wk])
    } else out[k] = mergeNum(DEF_CFG[k], c[k])
  }
  return out
}

let warmed = false
/** Warm nav.setBody for the body sizes of cubes 1..12 (twice) and restore the base body (finding: first resizes 3-9 ms). */
function warmBodies(nav, cfg) {
  if (!nav || typeof nav.setBody !== 'function') return 0
  const m = cfg.mech, per = cfg.cubes.size_per_cube || 0.05
  let n = 0
  for (let rep = 0; rep < 2; rep++) for (let c = 1; c <= 12; c++) { try { nav.setBody(m.radius * (1 + per * c), m.height * (1 + per * c)); n++ } catch { /* keep going */ } }
  try { nav.setBody(m.radius, m.height) } catch { /* the base body stays */ }
  return n
}
/**
 * Start-up rehearsal (D10): a scratch brain runs through a few hundred synthetic observations (loot, duels, bullets,
 * low hp, retreat, zone phases, shells, laser, airborne targets, drones, kill cubes, pickups, drops, offers, FFA
 * deaths) so the JIT has compiled every path before the first real decision. Done once per process, inside the
 * hello budget; the scratch brain's state is thrown away and the shared nav body is restored afterwards.
 */
function warmUp(hello, ctx, P, cfg) {
  const t0 = performance.now()
  const world = (ctx && ctx.world) || null, nav = (ctx && ctx.nav) || null
  const nb = warmBodies(nav, cfg)
  const b = createBrain(hello, { world, nav, log: () => {} }, { ...P, warmup: false, debug: false })
  let x = 0, y = 0, z = 0
  if (nav && world) {
    const bd = world.bounds, q = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
    if (q) { x = q.x; y = q.y; z = nav.levelAt(x, y) }
    try { nav.hopPlan(-307, 106, { toward: [x, y] }) } catch { /* optional */ }
  }
  const W = cfg.weapons, m = cfg.mech
  const wp = (kind, extra) => ({ kind, cooldown: 0, stats: W[kind], ...extra })
  const N = Math.max(40, P.rehearseN | 0), PH = 14, per = Math.max(1, Math.floor(N / PH))
  for (let k = 0; k < N && performance.now() - t0 < 4000; k++) {
    const ph = Math.floor(k / per) % PH, i = k % per, t = k * 0.1
    const ex = x + 105 * Math.cos(ph), ey = y + 105 * Math.sin(ph)
    const air = ph === 10
    const mech = (id, px, py, hp, weapons) => ({ id, kind: 'mech', pos: [px, py, (nav ? nav.levelAt(px, py) : z) + (air ? 3 + i % 5 : 0)], vel: [3 - (i % 7), -8, air ? 4 - i : 0], aim: [Math.atan2(y - py, x - px), 0], hp, max_hp: m.hp, cubes: 1, weapons, charging: ph === 5 || ph === 11 })
    const bullets = ph === 1 || ph === 6 || ph === 11 ? [{ id: 900 + k, kind: 'gun', pos: [x + 40, y + 3 - (i % 4), z + 6], vel: [-250, -2, 0] }, { id: 2000 + k, kind: 'npc', pos: [x - 20, y, z + 3], vel: [90, 0, 0] }] : []
    const o = {
      type: 'obs', tick: k * 2, t, alive: ph === 12 ? 16 - Math.min(5, i) : 16,
      self: { id: 3, pos: [x + Math.sin(k * 0.3) * 3, y + Math.cos(k * 0.2) * 3, z], vel: [8 * Math.cos(k * 0.3), 6 * Math.sin(k * 0.2), 0], aim: [k * 0.2 % 3, 0],
        hp: ph === 2 ? m.hp * 0.3 : ph === 3 ? m.hp * 0.12 : ph === 7 ? m.hp * 0.45 : m.hp * (ph === 0 || ph === 8 ? 1 : 0.8), max_hp: m.hp, energy: (k * 7) % 101, max_energy: m.energy, grounded: ph !== 13 || i % 3 !== 0, cubes: ph === 9 ? i % 12 : 0, upgrades: [], in_zone: ph !== 4,
        weapons: [wp('gun', { ammo: 12 - (i % 13), reload: i === 13 ? 1.2 : 0, cooldown: (i % 5) * 0.05 }), ph === 5 || ph === 6 || ph === 11 ? wp('laser', { charge: (i % 9) * 0.1 }) : ph >= 7 && ph <= 8 ? wp(ph === 7 ? 'lightning' : 'mortar', {}) : null], stats: m },
      mechs: ph === 0 || ph === 4 ? [] : ph === 3 || ph === 9 || ph === 12 ? [mech(5, ex, ey, 900, ['gun', 'laser']), mech(6, x - 60, y + 40, 1300, ['gun', 'mortar'])] : [mech(5, ph === 7 ? x + 30 : ex, ph === 7 ? y + 5 : ey, ph === 8 ? 250 : 1100, ['gun', 'laser'])].concat(ph === 8 ? [{ id: 120, kind: 'npc', pos: [x + 50, y - 20, z], vel: [1, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 }] : []),
      projectiles: (ph === 5 ? [{ id: 400 + (k >> 3), kind: 'mortar', pos: [x + 40 - i * 2, y, z + 25], vel: [-40, 0, -2 * i] }] : []).concat(bullets),
      crates: ph === 0 || ph === 8 ? [{ id: 1001, pos: [x + 20, y + 14, z], hp: 300 }] : [], cubes: ph === 0 || ph === 4 || ph === 6 ? [{ id: 5001, pos: [x - 12, y + 9, z] }] : [],
      pickups: [{ id: 8001, kind: ph % 2 ? 'laser' : 'lightning', pos: [x + 2 + (ph === 6 ? 30 : 0), y + 1, z] }], sounds: [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }, { kind: 'death', bearing: -1, dist: 'far', age: 0.1 }], beams: ph === 12 ? [{ by: 5, kind: 'laser', path: [[ex, ey, z + 7], [x - 60, y + 40, z + 4]], age: 0.05 }] : [],
      events: ph >= 1 && i % 3 === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.3, by: ph === 6 ? 9 : 5 }, { type: 'hit', target: 5, amount: 45, weapon: 'gun' }].concat(ph === 6 && i === 9 ? [{ type: 'kill', target: 5 }] : []) : [],
      drops: ph === 9 ? [{ id: 20000, pos: [x + 30, y - 30, z], radius: 8, lands_in: 3 - i * 0.1, capture_s: 4, progress: 0, holder: null }] : [],
      zone: { center: [x + (ph === 4 ? 700 : 0), y], radius: ph === 13 ? 60 : 500, next_center: [x + (ph === 4 ? 700 : 30), y], next_radius: ph === 13 ? (i % 2 ? 20 : 0) : 300, shrink_start: t + (ph === 13 ? -1 : 5), shrink_end: t + 40, dps: 20 },
      offer: ph === 9 ? { id: 1 + (i >> 2), expires: t + 5, choices: [{ id: 'gun_rate' }, { id: 'armor' }, { id: 'sensors' }] } : null,
    }
    b.act(o, performance.now() + 25)
  }
  if (nav) { try { nav.setBody(cfg.mech.radius, cfg.mech.height) } catch { /* base body */ } }
  return { ms: performance.now() - t0, bodies: nb }
}

function saltHash(v) {
  const str = String(v)
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return v === 0 || v === '0' || v == null ? 0 : h
}

export function createBrain(hello, ctx, overrides) {
  const P = resolveParams(isObj(overrides) ? overrides : {})
  const cfg = normalizeConfig(hello && hello.config)
  const world = (ctx && ctx.world) || null, nav = (ctx && ctx.nav) || null
  const log = (ctx && typeof ctx.log === 'function') ? ctx.log : () => {}
  const seed = ((fnum(hello && hello.seed, 12345) >>> 0) ^ P.rngSalt ^ saltHash(P.salt)) >>> 0
  let warmInfo = null
  if (P.warmup && !warmed) {
    warmed = true
    try { warmInfo = warmUp(hello, ctx, P, cfg); log(`brain rehearsal ${warmInfo.ms.toFixed(0)} ms, ${warmInfo.bodies} body warm-ups`) } catch (e) { log('brain rehearsal failed: ' + (e && e.stack ? e.stack : e)) }
  }

  const B = {
    P, cfg, world, nav, log, rng: makeRng(seed),
    tick: 0, deadline: 0, planTick: -1, bodyR: -1, arenaMargin: fnum(cfg.match.arena_margin, P.arenaMargin),
    me: newSelf(cfg), tracks: new Map(), trackList: [], crates: new Map(), cubes: new Map(), pickups: new Map(), drops: [],
    shells: new Map(), bullets: new Map(), heard: new Float32Array(12), badPickups: new Map(), attackers: new Set(), ourKills: new Set(), killDrops: [],
    zone: { known: false, cx: 0, cy: 0, r: 1e6, nx: 0, ny: 0, nr: 1e6, nrEff: 1e6, t0: 1e9, t1: 1e9, dps: 0 },
    groundFn: world ? (x, y) => world.ground(x, y) : null,
    gunStat: makeGunStat(P), scratch8: new Float64Array(16),
    everSawMech: false, deathsHeard: 0, bulletsSeen: 0, magStartT: -99, chargeAtMeT: -99,
    unseenHurtT: -99, unseenHurtBearing: 0, rearHitT: -99, lastKillT: -99, lastKillX: 0, lastKillY: 0,
    // assessment
    A: 0, n1: 0, nLos: 0, n120: 0, nearestMech: null, topAttacker: null, lastLosInT: -99, threats: 0, threat1: null, attackers3: 0,
    lastContactT: 0, lastMechContactT: -99, bandHi: 95, ffaOpen: false, vetoT: -1,
    losing: false, losingSince: -99, losingEndT: -99, finishing: false,
    target: null, targetSince: 0, killSecure: false, lostTarget: null, lostTargetT: -99, lostX: 0, lostY: 0, lostZ: 0,
    fightOk: false, winning: false, finish: false, tCover: 3, farmNpc: -1, lastEnemy: null, idleWait: Infinity,
    mode: '', modeSince: -99, holdFire: false, stance: 'OPPORTUNIST', env: 'SQUAD', ffaLatchT: -1,
    eff: { rLo: P.bandLo, rHi: P.bandHi, rPref: P.rPrefGun, loot: 80 },
    zoneUrgent: false, zoneMargin: Infinity, zoneTOut: Infinity,
    hide: { state: 'idle', x: 0, y: 0, z: 0, dist: 0, t: -99, cursor: 0, ox: 0, oy: 0, bestCost: Infinity, firstR: Infinity, bx: 0, by: 0, bd: 0, t0: 0, comp: -1, exposedSince: -1 },
    posGoal: { ok: false, kind: '', x: 0, y: 0, score: 0, t: -99, t0: -99, los: false, exposed: 0 },
    loot: null, grab: null, dropTask: null, shootCrate: null, lookHint: false, lookX: 0, lookY: 0,
    // channels
    cmd: { mx: 0, my: 0, boost: false, jump: false },
    out: { aim: [0, 0], fire: [false, false], reload: false, pick: -1, take: -1, drop: -1 },
    goalX: 0, goalY: 0, hasGoal: false, dodging: false, hidePhase: false, noCharge: false, peekSoon: false, jinkTurn: false, wantJet: false,
    aimKind: 'none', gunLos: false, rush: false, legKind: '', lastStand: false, mustDisengage: false, holdFirst: false, doomed: false, Padv: Infinity, ambushAim: false,
    counters: { ticks: 0, errors: 0, plans: 0, evals: 0, jinks: 0, dodges: 0, bulletDodges: 0, stuck: 0, abandons: 0, shots: 0, laserShots: 0, laserHits: 0,
      kills: 0, dmgIn: 0, dmgOut: 0, modeSwitches: 0, targetSwitches: 0, overruns: 0, fuse: 0, noProgress: 0, hops: 0 },
    errorsByStage: {},
    noteError(stage, e) {
      B.counters.errors++
      B.errorsByStage[stage] = (B.errorsByStage[stage] || 0) + 1
      if (B.counters.errors <= 5) log(`brain stage ${stage} failed at tick ${B.tick}: ${e && e.stack ? e.stack : e}`)
    },
  }

  const mover = makeMover(B)
  const hideSearch = makeHideSearch(B)
  const posEval = makePosEval(B)
  const fc = makeFireControl(B)
  const econ = makeEconomy(B, mover)
  const stance = makeStance(B, mover, hideSearch, posEval)
  const now = () => performance.now()
  let lastEvalT = -9, actT0 = 0
  const holdSpot = { x: 0, y: 0, t: -99, ok: false }
  const roam = { x: 0, y: 0, t: -99, ok: false, dir: 1 }
  let lastAct = { move: [0, 0], boost: false, aim: [0, 0], fire: [false, false] }

  /** D10: the only clock test left. Never trips in normal runs (decisions take < 10 ms); every trip is counted. */
  function fuse() {
    if (now() - actT0 <= P.fuseMs) return false
    B.counters.fuse++
    return true
  }

  function evalMaybe(kind) {
    const t = B.me.t
    if (!nav || !world) return false
    if (t - lastEvalT < P.evalPeriod && B.posGoal.kind === kind) return B.posGoal.ok
    if (fuse()) return B.posGoal.ok && B.posGoal.kind === kind
    lastEvalT = t
    return posEval.evaluate(kind)
  }

  // ------------------------------------------------------------------ legs per mode
  /** A post near a wall inside the next circle (used while healing in cover and as the FFA idle post). */
  function postLegs(silent) {
    const me = B.me, t = me.t, z = B.zone
    if (t - holdSpot.t > 3 || !holdSpot.ok) {
      holdSpot.t = t; holdSpot.ok = true; holdSpot.x = me.x; holdSpot.y = me.y
      const inside = !z.known || Math.hypot(me.x - z.nx, me.y - z.ny) < z.nrEff - 8
      if (!inside) { const g = mover.zoneGoal(); holdSpot.x = g.x; holdSpot.y = g.y }
      else if (nav) {
        let best = Infinity
        const comp = nav.component(me.x, me.y)
        for (let r = 0; r <= 48 && best === Infinity; r += 6) {
          for (let k = 0; k < 12; k++) {
            const a = k * Math.PI / 6 + r * 0.1, x = me.x + r * Math.cos(a), y = me.y + r * Math.sin(a)
            if (!nav.passableAt(x, y)) continue
            const wd = nav.wallDistAt(x, y)
            if (wd > 5 || wd < me.radius + 0.6) continue
            if (comp >= 0 && nav.component(x, y) !== comp) continue
            if (z.known && Math.hypot(x - z.nx, y - z.ny) > z.nrEff - 6) continue
            const c = r + wd
            if (c < best) { best = c; holdSpot.x = x; holdSpot.y = y }
          }
          if (r === 0 && best < Infinity) break
        }
      }
    }
    const d = Math.hypot(holdSpot.x - me.x, holdSpot.y - me.y)
    mover.moveTo(holdSpot.x, holdSpot.y, silent && d < 30 ? P.silentStick : (d > 15 ? 1 : P.silentStick), 1.2)
  }

  /**
   * Idle (nothing to fight, loot or farm): SQUAD walks the zone band at full speed (0.5 of the next radius) with
   * the torso scanning, instead of standing at a wall; FFA holds a post at 0.4-0.5 of the radius (D11).
   */
  function holdLegs() {
    const me = B.me, t = me.t, z = B.zone
    if (stance.idleLegs()) return
    if (!z.known) { postLegs(false); B.legKind = 'hold'; return }
    const ffa = B.env === 'FFA'
    const frac = ffa ? (P.ffaBandLo + P.ffaBandHi) / 2 : P.zoneGoalFrac
    const R = Math.max(10, (z.nr <= P.zoneLateR ? z.nr * 0.3 : z.nr * frac))
    if (ffa) {
      const dc = Math.hypot(me.x - z.nx, me.y - z.ny)
      if (Math.abs(dc - R) < Math.max(12, R * 0.15)) { postLegs(true); B.legKind = 'post'; return }
    }
    const arrived = roam.ok && Math.hypot(roam.x - me.x, roam.y - me.y) < 8
    if (!roam.ok || arrived || t - roam.t > 25 || mover.isAbandoned(roam.x, roam.y) || Math.hypot(roam.x - z.nx, roam.y - z.ny) > z.nrEff - 4) {
      const a0 = Math.atan2(me.y - z.ny, me.x - z.nx)
      if (B.rng() < 0.15) roam.dir = -roam.dir
      const step = Math.min(1.2, 60 / R)
      const a = ffa ? a0 : a0 + roam.dir * step
      roam.x = z.nx + R * Math.cos(a); roam.y = z.ny + R * Math.sin(a); roam.t = t; roam.ok = true
      if (nav) { const q = nav.nearestPassable(roam.x, roam.y, 20); if (q && nav.component(q.x, q.y) === nav.component(me.x, me.y)) { roam.x = q.x; roam.y = q.y } }
    }
    mover.moveTo(roam.x, roam.y, 1, 3)
    B.legKind = ffa ? 'post' : 'roam'
  }

  /** D3 retreat (LOSING: break the line, keep shooting) and HEAL (in cover, stand or creep, fetch cubes within 40 m). */
  function retreatLegs() {
    const me = B.me, t = me.t, h = B.hide, cmd = B.cmd
    const top = B.topAttacker || B.target || B.nearestMech
    const exposed = t - B.lastLosInT <= 0.5 || t - me.lastShotAtT <= 1.0
    const healing = B.mode === MODE.HEAL
    if (!exposed && !healing && stance.escapeLegs()) return
    if (B.grab && (healing ? B.grab.type === 'cube' && Math.hypot(B.grab.x - me.x, B.grab.y - me.y) <= P.healCubeR : true) && (!exposed || !healing)) {
      if (econ.grabLegs(0)) { B.hidePhase = !exposed; B.legKind = healing ? 'healcube' : 'grab'; return }
    }
    if (h.state === 'found' && !mover.isAbandoned(h.x, h.y)) {
      const d0 = Math.hypot(h.x - me.x, h.y - me.y)
      const d = mover.moveTo(h.x, h.y, exposed || d0 > 20 ? 1 : P.silentStick, 0.9)
      B.hidePhase = d < 3 || !exposed
      B.legKind = 'hide'
      if (exposed && B.A > 0 && me.energy >= Math.max(P.boostReserve, me.lightning ? P.lightReserve + 10 : 0) && (me.hp / B.A < P.boostLifeS || d <= P.boostGap) && d > 4 && t - h.t > 1) cmd.boost = true
      if (mover.path.pts && mover.path.len > Math.max(40, d * 2.5) && t - h.t < 1) { hideSearch.markBad(h.x, h.y); hideSearch.start() }
      return
    }
    if (!top || !exposed) {
      B.hidePhase = !exposed
      B.legKind = 'hold'; postLegs(true); return
    }
    // no hide cell known: least exposed cell nearby, else back away with the strafe
    B.legKind = 'retreat'
    if (evalMaybe('retreat') && B.posGoal.kind === 'retreat' && Math.hypot(B.posGoal.x - me.x, B.posGoal.y - me.y) > 3) {
      mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1)
    } else if (!mover.standoff(top.x, top.y, 400, top.dist > 40, true)) {
      const ax = me.x - top.x, ay = me.y - top.y, l = Math.hypot(ax, ay) || 1
      mover.moveTo(me.x + ax / l * 25, me.y + ay / l * 25, 1, 1)
    }
    if (B.A > 0 && me.energy >= P.boostReserve && me.hp / B.A < P.boostLifeS) cmd.boost = true
  }

  /** D2 stand-off by loadout, D9 late zone, D4 laser-charge reaction and reload windows, D6 power grabs. */
  function fightLegs() {
    const me = B.me, t = me.t, tgt = B.target, h = B.hide, cmd = B.cmd, z = B.zone
    if (!tgt) { holdLegs(); return }
    if (tgt.npc && B.loot && B.loot.type === 'drone' && B.loot.id === tgt.id) { econ.lootLegs(); B.legKind = 'drone'; return }
    if (stance.fightLegs()) return
    const ffa = B.env === 'FFA'
    const bd = bandFor(B)
    let hold = bd.hold, lo = bd.lo, hi = bd.hi
    // lightning without a laser: close to 28 m, boosting in from under 90 m, only against a lone target
    if (me.lightning && !me.laser) {
      const lone = B.nLos <= 1 && B.n120 <= 1
      if (!B.rush && lone && me.energy >= P.rushEnergy && me.hpf >= P.rushHpf && tgt.dist < 160 && !tgt.npc) B.rush = true
      else if (B.rush && (me.energy < P.lightReserve || me.hpf < 0.4 || !lone)) B.rush = false
    } else B.rush = false
    if (B.rush) { hold = P.rushR; lo = P.rushR - 8; hi = P.rushR + 6 }
    // their reload (12 bullets, then 2.5 s silent): close in to the hold distance
    const reloading = tgt.magN >= P.magSize && t - tgt.lastBulletT < P.magReloadS
    if (reloading && !me.laser) hi = Math.min(hi, hold + 5)
    if (ffa && !(B.killSecure || B.finishing)) hi = Math.max(hi, tgt.dist + 1)          // D11: never walk at an enemy
    B.rPrefNow = hold
    // D4: a laser charging at us -> step behind hard cover within 6 m (9 m boosting)
    const charging = t - B.chargeAtMeT < 0.9
    if (charging && h.state === 'found') {
      const canBoost = me.energy >= P.boostReserve && me.grounded
      if (h.dist <= (canBoost ? P.laserHideBoost : P.laserHideWalk)) { mover.moveTo(h.x, h.y, 1, 0.8); cmd.boost = canBoost && h.dist > P.laserHideWalk; B.legKind = 'beamhide'; return }
    }
    // power grab while fighting (cube / laser), strafe blended in
    if (B.grab && !B.rush && econ.grabLegs(0.35)) return
    // D9: from next_radius <= 70 the legs belong to the zone: converge on the next centre and fight from there
    if (z.known && z.nr <= P.zoneLateR) {
      const dc = Math.hypot(me.x - z.nx, me.y - z.ny)
      if (dc > Math.max(8, z.nr * 0.35)) { mover.moveTo(z.nx, z.ny, 1, 2); B.legKind = 'zonefight'; return }
      if (!mover.standoff(tgt.x, tgt.y, hold, true, true, 0, 1e9, 0)) { cmd.mx = 0; cmd.my = 0 }
      B.legKind = 'zonestrafe'
      return
    }
    if (!tgt.losOut) {
      // no line to the target: a nearby cell that has one, else walk at it while the chase is worth it
      B.legKind = 'regain'
      if (evalMaybe('fight') && B.posGoal.kind === 'fight' && B.posGoal.los) { mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1); return }
      const chase = !ffa && (B.winning || tgt.hp < tgt.maxHp * P.chaseHpf || B.A === 0 || tgt.hostile) && (t - tgt.losOutT < P.chaseS || t - B.targetSince < P.chaseS || tgt.listed)
      if (chase && tgt.dist > 12) {
        mover.moveTo(tgt.x, tgt.y, 1, 6)
        if (B.killSecure && me.energy >= P.boostReserve + 10 && me.grounded) cmd.boost = true
      } else postLegs(false)
      return
    }
    // a second attacker has a line on us: prefer a cell that keeps the duel isolated
    if (B.A - tgt.a > 20 && B.nLos >= 2 && nav && world) {
      if (evalMaybe('fight') && B.posGoal.kind === 'fight' && Math.hypot(B.posGoal.x - me.x, B.posGoal.y - me.y) > 3) {
        mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1); B.legKind = 'isolate'; return
      }
    }
    // open ground: D2 dead band, always strafing
    B.legKind = 'standoff'
    if (!mover.standoff(tgt.x, tgt.y, hold, true, true, lo, hi, bd.backStick)) {
      if (tgt.dist > hi) mover.moveTo(tgt.x, tgt.y, 1, 5)
      else if (evalMaybe('fight') && B.posGoal.ok) mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1)
      else { const ax = me.x - tgt.x, ay = me.y - tgt.y, l = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / l * 20, me.y + ay / l * 20, 1, 1) }
    }
    // laser band: boost away when a mech is inside 90 m with energy > 30
    if (bd.kind === 'laser' && bd.boostAway > 0 && tgt.dist < bd.boostAway && me.energy > P.laserBoostEnergy && !tgt.npc) cmd.boost = true
    if (B.rush && tgt.dist > P.rushR + 15 && tgt.dist < P.rushBoostR && me.energy >= P.rushEnergy) cmd.boost = true
  }

  /** Stance outcomes that override the mode chosen from the layer 4 rules (last stand). */
  function applyVetoes() {
    const t = B.me.t
    if (B.mode === MODE.ZONE) return
    if (B.lastStand && B.target && B.mode !== MODE.FIGHT) { B.mode = MODE.FIGHT; B.modeSince = t; B.holdFire = false }
  }

  function legs() {
    const cmd = B.cmd, me = B.me
    cmd.mx = 0; cmd.my = 0; cmd.boost = false; cmd.jump = false
    B.hasGoal = false; B.dodging = false; B.hidePhase = false; B.noCharge = false; B.shootCrate = null; B.lookHint = false; B.peekSoon = false; B.ambushAim = false
    B.legKind = ''
    B.wantJet = false
    // a hop out of a pocket is finished whatever the mode
    if (mover.hop.air && mover.pocketExit(B.zone.nx, B.zone.ny)) { B.legKind = 'hop'; B.noCharge = true; mover.stuckCheck(); return }
    if (!(B.mode === MODE.ZONE && B.zoneMargin < 1) && mover.shellDodge()) { B.noCharge = true; B.legKind = 'dodge'; finishLegs(); return }
    switch (B.mode) {
      case MODE.ZONE: mover.zoneLegs(); B.noCharge = B.noCharge || B.zoneMargin < 3 || !me.inZone; if (!B.legKind) B.legKind = 'zone'; break
      case MODE.HEAL: case MODE.DISENGAGE: retreatLegs(); break
      case MODE.FIGHT: fightLegs(); break
      case MODE.DROP: econ.dropLegs(); B.legKind = 'drop'; break
      case MODE.LOOT: econ.lootLegs(); B.legKind = 'loot'; break
      default:
        if (B.grab && econ.grabLegs(0)) break
        if (mover.inPocket() && B.zone.known && mover.pocketExit(B.zone.nx, B.zone.ny)) break
        holdLegs()
    }
    // D4 bullet-aware dodge on top of the tactical move (not while the zone needs every metre)
    if (!(B.mode === MODE.ZONE && (!me.inZone || B.zoneMargin < 2)) && B.legKind !== 'hop' && B.legKind !== 'beamhide') mover.bulletDodge()
    finishLegs()
  }
  function finishLegs() {
    const cmd = B.cmd, me = B.me
    // energy discipline: lightning needs the tank when an enemy is close (D2 / spec section 2)
    if (cmd.boost && me.lightning && B.nearestMech && B.nearestMech.dist < 60 && me.energy < P.lightReserve + 10 && !B.rush) cmd.boost = false
    if (cmd.boost && me.energy < 2) cmd.boost = false
    // in the air boost is the jet (protocol section 6): only the pocket hop and the stuck jet may use it
    if (cmd.boost && !me.grounded && !B.wantJet) cmd.boost = false
    mover.stuckCheck()
  }

  function stage(name, fn) {
    try { fn(); return true } catch (e) { B.noteError(name, e); return false }
  }

  function build() {
    const cmd = B.cmd, out = B.out
    let mx = cmd.mx, my = cmd.my
    if (!(mx === mx) || !(my === my) || !Number.isFinite(mx) || !Number.isFinite(my)) { mx = 0; my = 0 }
    const l = Math.hypot(mx, my)
    if (l > 1) { mx /= l; my /= l }
    let yaw = out.aim[0], pitch = out.aim[1]
    if (!Number.isFinite(yaw)) yaw = B.me.yaw
    if (!Number.isFinite(pitch)) pitch = 0
    out.aim[0] = yaw; out.aim[1] = pitch
    const a = { move: [mx, my], boost: !!cmd.boost, aim: [yaw, pitch], fire: [out.fire[0] === true, out.fire[1] === true] }
    if (cmd.jump) a.jump = true
    if (out.reload) a.reload = true
    if (out.pick >= 0) a.pick = out.pick
    if (out.take >= 0) { a.take = out.take; if (out.drop === 0 || out.drop === 1) a.drop = out.drop }
    if (P.debug) a.debug = { label: `${B.mode}/${B.legKind} ${B.stance[0]}${B.env[0]} t${B.target ? B.target.id : '-'} hp${Math.round(B.me.hp)}`.slice(0, 80) }
    lastAct = a
    return a
  }

  function act(obs, deadlineMs) {
    const t0 = now()
    actT0 = t0
    try {
      B.tick++
      B.counters.ticks++
      B.deadline = (typeof deadlineMs === 'number' && Number.isFinite(deadlineMs)) ? deadlineMs : t0 + 25
      if (!obs || typeof obs !== 'object') return { move: [0, 0], boost: false, aim: [lastAct.aim[0], lastAct.aim[1]], fire: [false, false] }
      const cmd = B.cmd, out = B.out
      const pmx = cmd.mx, pmy = cmd.my, pb = cmd.boost, py = out.aim[0], pp = out.aim[1]
      if (!stage('sense', () => sense(B, obs))) { /* keep going with the previous model */ }
      stage('assess', () => {
        assess(B)
        let ch = -99
        for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (tr.chargeAtMeT > ch) ch = tr.chargeAtMeT }
        B.chargeAtMeT = ch
        selectTarget(B)
      })
      stage('econ', () => econ.update())
      stage('zone', () => mover.zoneCheck())
      stage('mode', () => {
        const heading = B.mode === MODE.HEAL || B.mode === MODE.DISENGAGE || B.legKind === 'beamhide'
        hideSearch.maintain(heading)
        if (B.hide.state === 'run' && !fuse()) hideSearch.run(P.hideRays)
        decideMode(B)
      })
      stage('stance', () => { stance.update(obs); applyVetoes() })
      if (!stage('legs', legs)) { cmd.mx = pmx; cmd.my = pmy; cmd.boost = pb && B.me.grounded; cmd.jump = false }
      if (!stage('fire', () => fc.run())) { out.aim[0] = py; out.aim[1] = pp; out.fire[0] = false; out.fire[1] = false; out.reload = false }
      if (!stage('hands', () => { econ.hands(); econ.pick(obs) })) { out.take = -1; out.drop = -1; out.pick = -1 }
      const a = build()
      if (now() > B.deadline) B.counters.overruns++
      return a
    } catch (e) {
      B.noteError('act', e)
      return { move: [lastAct.move[0], lastAct.move[1]], boost: false, aim: [lastAct.aim[0], lastAct.aim[1]], fire: [false, false] }
    }
  }

  function debugState() {
    return {
      mode: B.mode, stance: B.stance, env: B.env, ffaLatchT: B.ffaLatchT, target: B.target ? B.target.id : null,
      goal: B.hasGoal ? [B.goalX, B.goalY] : null, hp: B.me.hp, counters: { ...B.counters },
      leg: B.legKind, aim: B.aimKind, A: B.A, n1: B.n1, losing: B.losing, hide: B.hide.state, zoneMargin: B.zoneMargin,
      errors: { ...B.errorsByStage }, gun: B.gunStat.dump(), F: stance.F ? stance.F() : 0, Q: stance.Q ? stance.Q() : 0,
      selected: P.selected, rehearsal: warmInfo,
    }
  }

  return { act, debugState, _B: B }
}
