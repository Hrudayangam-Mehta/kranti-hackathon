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
import { MODE, PARAMS, STANCES } from './params.js'
import { fnum, makeGunStat, newSelf, sense } from './senses.js'
import { assess, decideMode, makeHideSearch, makePosEval, selectTarget } from './tactics.js'
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
/**
 * Runs a scratch brain through synthetic observations (loot, duel, low hp, last stand, zone, shells, laser,
 * hidden pursuer, lightning) so the JIT has compiled every path before the first real decision. Done once per
 * process, during the hello budget; capped at 1.2 s.
 */
function warmUp(hello, ctx, P, cfg) {
  const t0 = performance.now()
  const world = (ctx && ctx.world) || null, nav = (ctx && ctx.nav) || null
  const b = createBrain(hello, { world, nav, log: () => {} }, { ...P, warmup: false, debug: false })
  let x = 0, y = 0, z = 0
  if (nav && world) {
    const bd = world.bounds, q = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
    if (q) { x = q.x; y = q.y; z = nav.levelAt(x, y) }
  }
  const W = cfg.weapons, m = cfg.mech
  const wp = (kind, extra) => ({ kind, cooldown: 0, stats: W[kind], ...extra })
  for (let k = 0; k < 200 && performance.now() - t0 < 1200; k++) {
    const ph = (k / 20) | 0, i = k % 20, t = k * 0.1
    const ex = x + 105 * Math.cos(ph), ey = y + 105 * Math.sin(ph)
    const mech = (id, px, py, hp, weapons) => ({ id, kind: 'mech', pos: [px, py, nav ? nav.levelAt(px, py) : z], vel: [3, -8, 0], aim: [Math.atan2(y - py, x - px), 0], hp, max_hp: m.hp, cubes: 1, weapons, charging: ph === 5 })
    const o = {
      type: 'obs', tick: k * 2, t, alive: 16,
      self: { id: 3, pos: [x + Math.sin(k * 0.3) * 3, y + Math.cos(k * 0.2) * 3, z], vel: [8 * Math.cos(k * 0.3), 6 * Math.sin(k * 0.2), 0], aim: [k * 0.2 % 3, 0],
        hp: ph === 2 ? m.hp * 0.3 : ph === 3 ? m.hp * 0.12 : m.hp * (ph === 0 ? 1 : 0.8), max_hp: m.hp, energy: 80, max_energy: m.energy, grounded: true, cubes: 0, upgrades: [], in_zone: ph !== 4,
        weapons: [wp('gun', { ammo: 12 - (i % 13), reload: i === 13 ? 1.2 : 0 }), ph === 5 || ph === 6 ? wp('laser', { charge: (i % 9) * 0.1 }) : ph >= 7 ? wp(ph === 7 ? 'lightning' : 'mortar', {}) : null], stats: m },
      mechs: ph === 0 || ph === 4 ? [] : ph === 3 || ph === 9 ? [mech(5, ex, ey, 900, ['gun', 'laser']), mech(6, x - 60, y + 40, 1300, ['gun', 'mortar'])] : [mech(5, ph === 7 ? x + 30 : ex, ph === 7 ? y + 5 : ey, ph === 8 ? 250 : 1100, ['gun'])],
      projectiles: ph === 5 ? [{ id: 400 + (k >> 3), kind: 'mortar', pos: [x + 40 - i * 2, y, z + 25], vel: [-40, 0, -2 * i] }] : [],
      crates: ph === 0 ? [{ id: 1001, pos: [x + 20, y + 14, z], hp: 300 }] : [], cubes: ph === 0 || ph === 4 ? [{ id: 5001, pos: [x - 12, y + 9, z] }] : [],
      pickups: [{ id: 8001, kind: ph % 2 ? 'laser' : 'lightning', pos: [x + 2, y + 1, z] }], sounds: [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }], beams: [],
      events: ph >= 1 && i % 3 === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.3, by: ph === 6 ? 9 : 5 }, { type: 'hit', target: 5, amount: 45, weapon: 'gun' }] : [],
      drops: ph === 9 ? [{ id: 20000, pos: [x + 30, y - 30, z], radius: 8, lands_in: 3, capture_s: 4, progress: 0, holder: null }] : [],
      zone: { center: [x + (ph === 4 ? 700 : 0), y, 0].slice(0, 2), radius: 500, next_center: [x + (ph === 4 ? 700 : 30), y], next_radius: 300, shrink_start: t + 5, shrink_end: t + 40, dps: 20 },
      offer: ph === 9 ? { id: 1, expires: t + 5, choices: [{ id: 'gun_rate' }, { id: 'armor' }, { id: 'sensors' }] } : null,
    }
    b.act(o, performance.now() + 25)
  }
  return performance.now() - t0
}

export function createBrain(hello, ctx, overrides) {
  const P = { ...PARAMS, ...(isObj(overrides) ? overrides : {}) }
  const cfg = normalizeConfig(hello && hello.config)
  const world = (ctx && ctx.world) || null, nav = (ctx && ctx.nav) || null
  const log = (ctx && typeof ctx.log === 'function') ? ctx.log : () => {}
  const seed = ((fnum(hello && hello.seed, 12345) >>> 0) ^ P.rngSalt) >>> 0
  if (P.warmup && !warmed) {
    warmed = true
    try { const ms = warmUp(hello, ctx, P, cfg); log(`brain warm-up ${ms.toFixed(0)} ms`) } catch (e) { log('brain warm-up failed: ' + (e && e.stack ? e.stack : e)) }
  }

  const B = {
    P, cfg, world, nav, log, rng: makeRng(seed),
    tick: 0, deadline: 0, planTick: -1, bodyR: -1, budgetScale: 1,
    me: newSelf(cfg), tracks: new Map(), trackList: [], crates: new Map(), cubes: new Map(), pickups: new Map(), drops: [],
    shells: new Map(), heard: new Float32Array(12), badPickups: new Map(), attackers: new Set(), ourKills: new Set(),
    zone: { known: false, cx: 0, cy: 0, r: 1e6, nx: 0, ny: 0, nr: 1e6, nrEff: 1e6, t0: 1e9, t1: 1e9, dps: 0 },
    groundFn: world ? (x, y) => world.ground(x, y) : null,
    gunStat: makeGunStat(P), scratch8: new Float64Array(16),
    everSawMech: false, deathsHeard: 0, bulletsSeen: 0,
    unseenHurtT: -99, unseenHurtBearing: 0, rearHitT: -99, lastKillT: -99, lastKillX: 0, lastKillY: 0,
    // assessment
    A: 0, n1: 0, nLos: 0, n120: 0, nearestMech: null, topAttacker: null, lastLosInT: -99,
    target: null, targetSince: 0, killSecure: false, lostTarget: null, lostTargetT: -99, lostX: 0, lostY: 0, lostZ: 0,
    fightOk: false, winning: false, finish: false, tCover: 3, farmNpc: -1, lastEnemy: null, idleWait: 4,
    mode: '', modeSince: -99, holdFire: false, stance: 'OPPORTUNIST', env: 'SQUAD',
    eff: { rLo: P.bandLo, rHi: P.bandHi, rPref: P.rPrefGun, loot: 80, peekMax: 2.9, hideMin: 2.4 },
    zoneUrgent: false, zoneMargin: Infinity, zoneTOut: Infinity,
    hide: { state: 'idle', x: 0, y: 0, z: 0, dist: 0, t: -99, cursor: 0, ox: 0, oy: 0, bestCost: Infinity, firstR: Infinity, bx: 0, by: 0, bd: 0, t0: 0, comp: -1 },
    posGoal: { ok: false, kind: '', x: 0, y: 0, score: 0, t: -99, t0: -99, los: false, exposed: 0 },
    loot: null, dropTask: null, shootCrate: null, lookHint: false, lookX: 0, lookY: 0,
    // channels
    cmd: { mx: 0, my: 0, boost: false, jump: false },
    out: { aim: [0, 0], fire: [false, false], reload: false, pick: -1, take: -1, drop: -1 },
    goalX: 0, goalY: 0, hasGoal: false, dodging: false, hidePhase: false, noCharge: false, peekSoon: false, jinkTurn: false,
    aimKind: 'none', gunLos: false, rush: false, legKind: '', lastStand: false, mustDisengage: false, holdFirst: false, doomed: false, Padv: Infinity, ambushAim: false,
    counters: { ticks: 0, errors: 0, plans: 0, evals: 0, jinks: 0, dodges: 0, stuck: 0, abandons: 0, shots: 0, laserShots: 0, laserHits: 0,
      kills: 0, dmgIn: 0, dmgOut: 0, modeSwitches: 0, targetSwitches: 0, skipped: 0, overruns: 0, slow: 0 },
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
  const timeLeft = () => B.deadline - now()
  let lastEvalT = -9, slowUntil = -1
  const holdSpot = { x: 0, y: 0, t: -99, ok: false }
  let lastAct = { move: [0, 0], boost: false, aim: [0, 0], fire: [false, false] }

  function evalMaybe(kind) {
    const t = B.me.t
    if (!nav || !world) return false
    if (t - lastEvalT < P.evalPeriod && B.posGoal.kind === kind) return B.posGoal.ok
    if (timeLeft() < P.optMinMs + 2) { B.counters.skipped++; return B.posGoal.ok && B.posGoal.kind === kind }
    lastEvalT = t
    return posEval.evaluate(kind)
  }

  // ------------------------------------------------------------------ legs per mode
  function holdLegs(silent) {
    const me = B.me, t = me.t, z = B.zone
    if (stance.idleLegs()) return
    if (t - holdSpot.t > 3 || !holdSpot.ok) {
      holdSpot.t = t; holdSpot.ok = true; holdSpot.x = me.x; holdSpot.y = me.y
      const inside = !z.known || Math.hypot(me.x - z.nx, me.y - z.ny) < z.nrEff - 8
      if (!inside) { const g = mover.zoneGoal(); holdSpot.x = g.x; holdSpot.y = g.y }
      else if (nav) {
        // nearest cell with a wall close behind it (a post), inside the next circle
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

  function retreatLegs() {
    const me = B.me, t = me.t, h = B.hide, cmd = B.cmd
    const top = B.topAttacker || B.target || B.nearestMech
    const exposed = t - B.lastLosInT <= 0.5 || t - me.lastShotAtT <= 1.0
    if (!exposed && stance.escapeLegs()) return
    if (!exposed && B.mode === MODE.HEAL && B.loot && B.loot.type === 'cube' && B.A === 0 && t - B.lastLosInT > 3 && !(B.nearestMech && B.nearestMech.conf > 0.5 && B.nearestMech.dist < P.lootQuietR)) {
      econ.lootLegs(); B.legKind = 'killdrop'; B.hidePhase = true; return
    }
    if (h.state === 'found' && !mover.isAbandoned(h.x, h.y)) {
      const d0 = Math.hypot(h.x - me.x, h.y - me.y)
      const d = mover.moveTo(h.x, h.y, exposed || d0 > 20 ? 1 : P.silentStick, 0.9)
      B.hidePhase = d < 3 || !exposed
      B.legKind = 'hide'
      if (exposed && B.A > 0 && me.energy >= P.boostReserve && (me.hp / B.A < P.boostLifeS || d <= P.boostGap) && d > 4) cmd.boost = true
      // a path that turned out much longer than the straight line is a bad hide cell
      if (mover.path.pts && mover.path.len > Math.max(40, d * 2.5) && t - h.t < 1) { hideSearch.markBad(h.x, h.y); hideSearch.start() }
      return
    }
    if (!top || !exposed) {
      B.hidePhase = !exposed
      // quiet and nobody tracked nearby: regeneration continues while walking, so fetch the cubes of our kill
      if (!exposed && B.loot && B.loot.type === 'cube' && B.A === 0 && !(B.nearestMech && B.nearestMech.conf > 0.5 && B.nearestMech.dist < P.lootQuietR)) { econ.lootLegs(); B.legKind = 'killdrop'; return }
      B.legKind = 'hold'; holdLegs(true); return
    }
    // no hide cell known: least exposed cell nearby, else back away with a jink
    B.legKind = 'retreat'
    if (evalMaybe('retreat') && B.posGoal.kind === 'retreat' && Math.hypot(B.posGoal.x - me.x, B.posGoal.y - me.y) > 3) {
      mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1)
    } else if (!mover.standoff(top.x, top.y, 400, top.dist > P.jinkMinR, true)) {
      const ax = me.x - top.x, ay = me.y - top.y, l = Math.hypot(ax, ay) || 1
      mover.moveTo(me.x + ax / l * 25, me.y + ay / l * 25, 1, 1)
    }
    if (B.A > 0 && me.energy >= P.boostReserve && me.hp / B.A < P.boostLifeS) cmd.boost = true
  }

  function fightLegs() {
    const me = B.me, t = me.t, tgt = B.target, h = B.hide, cmd = B.cmd, eff = B.eff
    if (!tgt) { holdLegs(false); return }
    if (stance.fightLegs()) return
    // preferred range for the weapon matchup
    let rPref = eff.rPref
    if (me.laser && B.stance !== 'OFFENSIVE') rPref = Math.max(rPref, P.rPrefLaser)
    if (me.lightning) {
      if (!B.rush && B.nLos <= 1 && B.n120 <= 1 && me.energy >= P.rushEnergy && me.hpf >= P.rushHpf && tgt.dist < 160) B.rush = true
      else if (B.rush && (me.energy < P.lightReserve || me.hpf < 0.45 || B.nLos > 1)) B.rush = false
    } else B.rush = false
    if (B.rush) rPref = P.rushR
    else if (tgt.hasLightning) rPref = Math.max(rPref, P.lightAvoid + me.radius + 25)
    if (!B.rush && tgt.hp <= P.finishHp && B.nLos <= 1 && !tgt.hasLightning) rPref = Math.min(rPref, 70)
    if (me.gun) rPref = Math.min(rPref, me.gun.range * 0.8)
    B.rPrefNow = rPref
    const gunBusy = !me.gun || me.gun.reload > 0.7 || (me.gun.ammo === 0)
    const laserUp = !!(me.laser && (me.laser.charge > 0 || me.laser.cooldown < 0.4))
    const chargingAtMe = tgt.charging && Math.abs(wrapPi(tgt.yaw - tgt.bearing - Math.PI)) < P.laserAimDeg * Math.PI / 180
    if (h.state === 'found') {
      // a laser about to fire at us, or a reload: step behind the corner when it is close
      if (chargingAtMe && h.dist <= (me.energy >= P.boostReserve ? P.laserHideBoost : P.laserHideWalk)) {
        mover.moveTo(h.x, h.y, 1, 0.8); cmd.boost = me.energy >= P.boostReserve; B.legKind = 'beamhide'; return
      }
      if (gunBusy && !laserUp && !B.rush && h.dist <= P.hideReloadDist && me.gun && me.gun.reload > 0.5) {
        mover.moveTo(h.x, h.y, 1, 0.8); B.hidePhase = true; B.legKind = 'reloadhide'; return
      }
    }
    if (!tgt.losOut) {
      // no line to the target: a nearby cell that has one, else walk at it while the chase is worth it
      B.legKind = 'regain'
      if (evalMaybe('fight') && B.posGoal.kind === 'fight' && B.posGoal.los) { mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1); return }
      const chase = (B.winning || tgt.hp < tgt.maxHp * P.chaseHpf || B.A === 0) && (t - tgt.losOutT < P.chaseS || t - B.targetSince < P.chaseS || tgt.listed)
      if (chase && tgt.dist > 12) {
        mover.moveTo(tgt.x, tgt.y, 1, 6)
        if (B.killSecure && me.energy >= P.boostReserve + 10) cmd.boost = true
      } else holdLegs(false)
      return
    }
    // a second attacker has a line on us: prefer a cell that keeps the duel isolated
    if (B.A - tgt.a > 20 && B.nLos >= 2 && nav && world) {
      if (evalMaybe('fight') && B.posGoal.kind === 'fight' && Math.hypot(B.posGoal.x - me.x, B.posGoal.y - me.y) > 3) {
        mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1); B.legKind = 'isolate'; return
      }
    }
    // open ground: stand-off range with a seeded jink
    const threatened = t - B.lastLosInT <= 0.5
    // M3: against a laser or mortar the reload is spent relocating in one direction (>= 10 m), not jinking
    const relocating = gunBusy && (tgt.hasLaser || tgt.hasMortar)
    const doJink = threatened && tgt.dist > P.jinkMinR && !relocating
    B.legKind = relocating ? 'relocate' : 'standoff'
    if (!mover.standoff(tgt.x, tgt.y, rPref, doJink, threatened || tgt.dist < rPref + 20)) {
      if (tgt.dist > rPref) mover.moveTo(tgt.x, tgt.y, 1, 5)
      else if (evalMaybe('fight') && B.posGoal.ok) mover.moveTo(B.posGoal.x, B.posGoal.y, 1, 1)
      else { const ax = me.x - tgt.x, ay = me.y - tgt.y, l = Math.hypot(ax, ay) || 1; mover.moveTo(me.x + ax / l * 20, me.y + ay / l * 20, 1, 1) }
    }
    if (B.killSecure && tgt.dist > (me.gun ? me.gun.range * 0.9 : 200) && me.energy >= P.boostReserve + 10) cmd.boost = true
    if (B.rush && tgt.dist > P.rushR + 15 && me.energy >= 60) cmd.boost = true
  }

  /** Stance outcomes that override the mode chosen from the layer 4 rules (survival veto, last stand). */
  function applyVetoes() {
    const t = B.me.t
    if (B.mode === MODE.ZONE) return
    if (B.lastStand && B.target && B.mode !== MODE.FIGHT) { B.mode = MODE.FIGHT; B.modeSince = t; B.holdFire = false }
    else if (B.mustDisengage && B.mode === MODE.FIGHT) { B.mode = MODE.DISENGAGE; B.modeSince = t }
  }

  function legs() {
    const cmd = B.cmd
    cmd.mx = 0; cmd.my = 0; cmd.boost = false; cmd.jump = false
    B.hasGoal = false; B.dodging = false; B.hidePhase = false; B.noCharge = false; B.shootCrate = null; B.lookHint = false; B.peekSoon = false; B.ambushAim = false
    B.legKind = ''
    B.wantJet = false
    if (mover.hop.air && mover.pocketExit(B.zone.nx, B.zone.ny)) { B.legKind = 'hop'; B.noCharge = true; mover.stuckCheck(); return }   // FIX prototype: finish a hop whatever the mode
    if (!(B.mode === MODE.ZONE && B.zoneMargin < 1) && mover.shellDodge()) { B.noCharge = true; B.legKind = 'dodge'; return }
    switch (B.mode) {
      case MODE.ZONE: mover.zoneLegs(); B.noCharge = B.zoneMargin < 3 || !B.me.inZone; B.legKind = 'zone'; break
      case MODE.HEAL: case MODE.DISENGAGE: retreatLegs(); break
      case MODE.FIGHT: fightLegs(); break
      case MODE.DROP: econ.dropLegs(); B.legKind = 'drop'; break
      case MODE.LOOT: econ.lootLegs(); B.legKind = 'loot'; break
      default: holdLegs(false); if (!B.legKind) B.legKind = 'hold'
    }
    // energy discipline: lightning needs the tank when an enemy is close
    if (cmd.boost && B.me.lightning && B.nearestMech && B.nearestMech.dist < 60 && !B.me.gun) cmd.boost = false
    if (cmd.boost && B.me.energy < 2) cmd.boost = false
    if (cmd.boost && !B.me.grounded && !B.wantJet) cmd.boost = false   // FIX: in the air boost is the jet (protocol section 6)
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
    if (P.debug) a.debug = { label: `${B.mode}/${B.legKind} ${B.stance[0]} t${B.target ? B.target.id : '-'} hp${Math.round(B.me.hp)}`.slice(0, 80) }
    lastAct = a
    return a
  }

  function act(obs, deadlineMs) {
    const t0 = now()
    try {
      B.tick++
      B.counters.ticks++
      B.deadline = (typeof deadlineMs === 'number' && Number.isFinite(deadlineMs)) ? Math.min(deadlineMs, t0 + 40) : t0 + 25
      if (!obs || typeof obs !== 'object') return { move: [0, 0], boost: false, aim: [lastAct.aim[0], lastAct.aim[1]], fire: [false, false] }
      const cmd = B.cmd, out = B.out
      const pmx = cmd.mx, pmy = cmd.my, pb = cmd.boost, py = out.aim[0], pp = out.aim[1]
      if (!stage('sense', () => sense(B, obs))) { /* keep going with the previous model */ }
      stage('assess', () => { assess(B); selectTarget(B) })
      stage('econ', () => econ.update())
      stage('zone', () => mover.zoneCheck())
      stage('mode', () => {
        const heading = B.mode === MODE.HEAL || B.mode === MODE.DISENGAGE || B.legKind === 'reloadhide' || B.legKind === 'beamhide'
        hideSearch.maintain(heading)
        if (B.hide.state === 'run' && timeLeft() > P.optMinMs) hideSearch.run(P.hideRays * B.budgetScale)
        decideMode(B)
      })
      stage('stance', () => { stance.update(obs); applyVetoes() })
      if (!stage('legs', legs)) { cmd.mx = pmx; cmd.my = pmy; cmd.boost = pb; cmd.jump = false }
      if (!stage('fire', () => { fc.run(); stance.aimVeto() })) { out.aim[0] = py; out.aim[1] = pp; out.fire[0] = false; out.fire[1] = false; out.reload = false }
      if (!stage('hands', () => { econ.hands(); econ.pick(obs) })) { out.take = -1; out.drop = -1; out.pick = -1 }
      const a = build()
      const tEnd = now()
      if (tEnd > B.deadline) B.counters.overruns++
      // a slow decision halves the optional budgets (rays, A* expansions) for the next 20 decisions
      if (tEnd - t0 > P.slowMs) { slowUntil = B.tick + 20; B.counters.slow++ }
      B.budgetScale = B.tick < slowUntil ? 0.5 : 1
      return a
    } catch (e) {
      B.noteError('act', e)
      return { move: [lastAct.move[0], lastAct.move[1]], boost: false, aim: [lastAct.aim[0], lastAct.aim[1]], fire: [false, false] }
    }
  }

  function debugState() {
    return {
      mode: B.mode, stance: B.stance, env: B.env, target: B.target ? B.target.id : null,
      goal: B.hasGoal ? [B.goalX, B.goalY] : null, hp: B.me.hp, counters: { ...B.counters },
      leg: B.legKind, aim: B.aimKind, A: B.A, n1: B.n1, hide: B.hide.state, zoneMargin: B.zoneMargin,
      errors: { ...B.errorsByStage }, gun: B.gunStat.dump(), F: stance.F ? stance.F() : 0, Q: stance.Q ? stance.Q() : 0,
    }
  }

  return { act, debugState, _B: B }
}
