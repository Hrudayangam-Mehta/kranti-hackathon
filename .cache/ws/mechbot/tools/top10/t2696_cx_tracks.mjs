// DEV ONLY (scratch). Synthetic tracks of team 2696's 5.60 build (proj1 lot 4374077, profile f75kite) in a free-for-all,
// built from the numbers in notes/intel/top_2696.md (our own restatement), run through bot/lib/counters.js (read-only
// import) and through the scratch copy tools/top10/t2696_cx_mod.js (proposed changes). Nothing from another team runs.
//   node t2696_cx_tracks.mjs [--seeds=10] [--verbose] [--mod-params='{"k":v}'] [--orig-params='{"k":v}']
import * as ORIG from '../../bot/lib/counters.js'
import * as MOD from './t2696_cx_mod.js'

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d }
const NSEEDS = +arg('seeds', 10)
const VERBOSE = process.argv.includes('--verbose')
const MODP = JSON.parse(arg('mod-params', '{}')), ORIGP = JSON.parse(arg('orig-params', '{}'))

function rng32(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function gauss(r) { let u = r(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) }
const U = (r, a, b) => a + (b - a) * r()
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI }
const DT = 0.1, WALK = 11.7, BOOST = 19.5, ACC = 58.5
const HELLO = { type: 'hello', slot: 3, seed: 1, config: { mech: { walk_speed: WALK, boost_speed: BOOST, hp: 1400 } } }
// 2696 numbers (top_2696.md sections 3.1, 6, 7.1, 8)
const SWEEP_AMP = 1.90, SWEEP_T = 5.7          // idle torso sweep +-109 deg about the walking direction, 5.7 s period
const SPAWN_TURN_S = 1.7, SPAWN_TURN_W = 4      // one full turn at 4 rad/s at spawn
const CRATE_STOP = 14.5, CRATE_SHOOT_S = 1.7    // stops 14-15 m from a crate; 300 hp / 45 per round = 7 rounds at 0.24 s
const HOLD_GL = 100, HOLD_LZ = 55, HOLD_Q = 170 // held range vs gun(+laser) / vs laser+lightning / quiet-final practice kite
const RET_HPF = 0.35, RET_EXIT = 0.80, REP_DELAY = 5, REP_RATE = 45, RET_BOOST_S = 2.6

class World {
  constructor(seed, opt = {}) {
    this.r = rng32(seed); this.t = 0; this.tick = 0
    this.me = { id: 3, x: 0, y: 0, hp: 1260, weapons: opt.myWeapons || ['gun', 'laser'] }
    this.actors = []; this.crates = []; this.alive = opt.alive ?? 10; this.events = []; this.beams = []; this.nextCrate = 1001
    this.noise = { pos: 0.4, vel: 0.6, aim: 0.04, drop: 0.05 }
  }
  add(a) { this.actors.push(a); return a }
  step() {
    this.events = []; this.beams = []
    for (const a of this.actors) {
      a.script(a, this)
      const dvx = a.cvx - a.vx, dvy = a.cvy - a.vy, dv = Math.hypot(dvx, dvy), mx = ACC * DT
      if (dv > mx) { a.vx += dvx / dv * mx; a.vy += dvy / dv * mx } else { a.vx = a.cvx; a.vy = a.cvy }
      a.x += a.vx * DT; a.y += a.vy * DT
    }
    this.t += DT; this.tick += 2
  }
  obs() {
    const r = this.r, N = this.noise, g = (s) => gauss(r) * s
    const mechs = []
    for (const a of this.actors) {
      if (a.hidden || r() < N.drop) continue
      mechs.push({ id: a.id, kind: 'mech', pos: [a.x + g(N.pos), a.y + g(N.pos), 0], vel: [a.vx + g(N.vel), a.vy + g(N.vel), 0],
        aim: [wrap(a.yaw + g(N.aim)), 0], hp: Math.round(a.hp), max_hp: a.maxHp, cubes: a.cubes, weapons: a.weapons.slice(), charging: !!a.charging })
    }
    const me = this.me
    return { type: 'obs', tick: this.tick, t: +this.t.toFixed(3), alive: this.alive,
      self: { id: me.id, pos: [me.x, me.y, 0], vel: [0, 0, 0], aim: [0, 0], hp: me.hp, max_hp: 1400, energy: 80, max_energy: 100, grounded: true, cubes: 2,
        weapons: me.weapons.map((k) => ({ kind: k, cooldown: 0 })) },
      mechs, projectiles: [], crates: this.crates.map((c) => ({ id: c.id, pos: [c.x, c.y, 0], hp: 300 })), cubes: [], pickups: [], sounds: [],
      beams: this.beams, events: this.events, drops: [] }
  }
}
function actor(id, x, y, weapons, script, extra = {}) {
  return { id, x, y, vx: 0, vy: 0, cvx: 0, cvy: 0, yaw: 0, hp: 1400, maxHp: 1400, cubes: 0, weapons, charging: false,
    side: 1, sideT: 0, phase: 0, phaseT: 0, cd: 0, chargeT: 0, mag: 12, shotT: 0, reloadT: 0, script, ...extra }
}
const bearing = (a, x, y) => Math.atan2(y - a.y, x - a.x)
const dist = (a, x, y) => Math.hypot(x - a.x, y - a.y)
function moveToward(a, x, y, speed) { const d = dist(a, x, y) || 1; a.cvx = (x - a.x) / d * speed; a.cvy = (y - a.y) / d * speed; return d }
function sweepYaw(a, w) { const h = Math.hypot(a.vx, a.vy) > 2 ? Math.atan2(a.vy, a.vx) : a.head ?? 0; a.head = h; return wrap(h + SWEEP_AMP * Math.sin(2 * Math.PI * (w.t - (a.sweep0 || 0)) / SWEEP_T)) }
// hold a band around (tx, ty) with sideways strafing; reversals every lo..hi s (proj1 0.35-0.9 s)
function strafeBand(a, w, tx, ty, lo, hi, speed) {
  if (w.t >= a.sideT) { a.side = -a.side; a.sideT = w.t + U(w.r, 0.35, 0.9) }
  const dx = tx - a.x, dy = ty - a.y, R = Math.hypot(dx, dy) || 1, ux = dx / R, uy = dy / R
  const radial = R > hi ? 1 : R < lo ? -1 : 0
  let vx = ux * radial - uy * 0.9 * a.side, vy = uy * radial + ux * 0.9 * a.side
  const l = Math.hypot(vx, vy) || 1
  a.cvx = vx / l * speed; a.cvy = vy / l * speed
  return R
}
function gunAt(a, w, R, pHit, atMe) {
  if (R > 230) return
  if (a.reloadT > 0) { a.reloadT -= DT; if (a.reloadT <= 0) a.mag = 12; return }
  a.shotT += DT
  while (a.shotT >= 0.24 && a.mag > 0) { a.shotT -= 0.24; a.mag--; if (atMe && w.r() < pHit) w.events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: a.id }) }
  if (a.mag === 0) { a.reloadT = 2.4; a.shotT = 0 }
}
// full charge only (0.75 s), then beam; returns true on release
function laserCycle(a, w, tx, ty, pHit, atMe) {
  a.charging = true; a.chargeT += DT
  if (a.chargeT >= 0.75 - 1e-9) {
    a.charging = false; a.chargeT = 0
    w.beams.push({ by: a.id, kind: 'laser', path: [[a.x, a.y, 7], [tx, ty, 4.5]], age: 0.1 })
    if (atMe && w.r() < pHit) w.events.push({ type: 'damaged', amount: 315, weapon: 'laser', bearing: 0, by: a.id })
    return true
  }
  return false
}
function placeAt(w, R, b) { b = b ?? U(w.r, -Math.PI, Math.PI); return [R * Math.cos(b), R * Math.sin(b)] }

// a wandering bystander (gun + laser) 150-250 m out, so 2696's sweep can cross other mechs too
function bystander(w, id) {
  const [x, y] = placeAt(w, U(w.r, 170, 230))
  return w.add(actor(id, x, y, ['gun', 'laser'], (a, w) => {
    a.phaseT -= DT
    if (a.phaseT <= 0) { a.phaseT = U(w.r, 3, 7); const b = U(w.r, -Math.PI, Math.PI); a.hx = Math.cos(b); a.hy = Math.sin(b) }
    if (Math.hypot(a.x, a.y) > 250) { const b = Math.atan2(-a.y, -a.x); a.hx = Math.cos(b); a.hy = Math.sin(b) }
    a.cvx = a.hx * WALK * 0.8; a.cvy = a.hy * WALK * 0.8; a.yaw = wrap(Math.atan2(a.hy, a.hx) + 0.8 * Math.sin(w.t))
  }, { phaseT: 0 }))
}

// ------------------------------------------------------------------------------------------------ 2696 phase scripts
// Farming: spawn turn, then a crate circuit (legs 40-80 m, crates kept 100-210 m from us), torso sweep while walking,
// torso on the crate during the 14.5 m stop; laserCrates = it spends a full charge on each crate (nobody in its view)
function farm(weapons, laserCrates) {
  return (id, w) => {
    const [x, y] = placeAt(w, U(w.r, 140, 170))
    bystander(w, 8); bystander(w, 9)
    const newCrate = (a) => {
      for (let k = 0; k < 50; k++) {
        const b = U(w.r, -Math.PI, Math.PI), L = U(w.r, 40, 80), cx = a.x + Math.cos(b) * L, cy = a.y + Math.sin(b) * L, R = Math.hypot(cx, cy)
        if (R >= 100 && R <= 210) { const c = { id: w.nextCrate++, x: cx, y: cy }; w.crates.push(c); return c }
      }
      const c = { id: w.nextCrate++, x: a.x * 1.1 + 30, y: a.y * 1.1 }; w.crates.push(c); return c
    }
    return actor(id, x, y, weapons, (a, w) => {
      if (w.t < SPAWN_TURN_S) { a.cvx = 0; a.cvy = 0; a.yaw = wrap(a.yaw + SPAWN_TURN_W * DT); a.sweep0 = w.t; return }
      if (!a.crate) { a.crate = newCrate(a); a.phase = 0 }
      const c = a.crate
      if (a.phase === 0) {                       // walk to the stop point, sweeping
        const d = dist(a, c.x, c.y)
        if (d <= CRATE_STOP + 0.5) { a.phase = 1; a.phaseT = laserCrates ? 0.85 : CRATE_SHOOT_S; a.cvx = 0; a.cvy = 0 }
        else { moveToward(a, c.x, c.y, WALK); a.yaw = sweepYaw(a, w) }
      } else if (a.phase === 1) {                // stop: torso on the crate, gun (or one full laser charge)
        a.cvx = 0; a.cvy = 0; a.yaw = bearing(a, c.x, c.y)
        if (laserCrates) laserCycle(a, w, c.x, c.y, 0, false)
        a.phaseT -= DT
        if (a.phaseT <= 0) { a.charging = false; a.chargeT = 0; w.crates = w.crates.filter((q) => q !== c); a.phase = 2 }
      } else {                                   // walk onto the cube
        const d = moveToward(a, c.x, c.y, WALK); a.yaw = sweepYaw(a, w)
        if (d < 1.5) { a.cubes++; a.crate = null }
      }
    })
  }
}
// Fighting us (we are hostile to it): hold `hold` m (band +-8), strafe reversals 0.35-0.9 s, torso on us. Laser caution:
// with our laser ready it waits behind its corner (still, torso on us) and steps out after our beam (every 2.4 s):
// 1.5 s out, full charge then release at us, gun while out.
function fightUs(hold, cover = true) {
  return (id, w) => {
    const [x, y] = placeAt(w, hold + U(w.r, -4, 4))
    bystander(w, 8)
    return actor(id, x, y, ['gun', 'laser'], (a, w) => {
      const cyc = (w.t + a.off) % 2.4, out = !cover || cyc < 1.5
      const R = Math.hypot(a.x, a.y)
      a.yaw = bearing(a, 0, 0)
      if (out) { strafeBand(a, w, 0, 0, hold - 8, hold + 8, a.charging ? WALK / 2 : WALK); if (cyc < 1.4) laserCycle(a, w, 0, 0, 0.6, true); gunAt(a, w, R, 0.3, true) }
      else { a.cvx = 0; a.cvy = 0; a.charging = false; a.chargeT = 0 }
    }, { off: U(w.r, 0, 2.4) })
  }
}
// Fighting another mech X (id 7) at 100 m while we watch from the side; then (retreat variants) at t = tRet its hp is 35%:
// it boosts 2.6 s straight away from X, then sits still with its torso on X's bearing (watches only its last attacker),
// holds fire, repairs from 5 s at 45 hp/s, returns at 80% (about 19 s) and walks back to 100 m of X.
// xHidden: X drops out of our listing at tRet; lastIsUs: we were its last attacker (torso on us; control)
function fightOther(opt = {}) {
  const tRet = opt.tRet ?? Infinity, theta = (opt.thetaDeg ?? 90) * Math.PI / 180
  return (id, w) => {
    // 2696 at Q (160 m from us); X 100 m from it, theta off the line from 2696 to us (90 = we watch from the side,
    // 15 = X stands almost between us and 2696, so a torso on X is nearly on us)
    const b0 = U(w.r, -Math.PI, Math.PI), qx = Math.cos(b0) * 160, qy = Math.sin(b0) * 160
    const toUs = Math.atan2(-qy, -qx), bu = toUs + (w.r() < 0.5 ? theta : -theta)
    const X = w.add(actor(7, qx + Math.cos(bu) * 100, qy + Math.sin(bu) * 100, ['gun', 'laser'], (a, w) => {
      a.hidden = !!opt.xHidden && w.t >= tRet
      const p = w.actors.find((q) => q.id === id)
      a.yaw = bearing(a, p.x, p.y); a.cvx = 0; a.cvy = 0
    }))
    return actor(id, qx, qy, ['gun', 'laser'], (a, w) => {
      const t = w.t
      const tx = opt.lastIsUs ? 0 : X.x, ty = opt.lastIsUs ? 0 : X.y
      if (t < tRet) {
        if (t >= tRet - 15) a.hp = 1400 * (1 - (1 - RET_HPF) * (t - (tRet - 15)) / 15)
        a.yaw = bearing(a, X.x, X.y)
        const R = strafeBand(a, w, X.x, X.y, 92, 108, a.charging ? WALK / 2 : WALK)
        const cyc = (t + a.off) % 2.4
        if (cyc < 1.4) laserCycle(a, w, X.x, X.y, 0, false); else { a.charging = false; a.chargeT = 0 }
        gunAt(a, w, R, 0, false)
        return
      }
      a.charging = false; a.chargeT = 0
      if (!a.retT) { a.retT = t; a.awayB = bearing(a, tx, ty) + Math.PI }
      const s = t - a.retT
      a.yaw = bearing(a, tx, ty)                               // torso stays on its last attacker
      if (a.hp < RET_EXIT * 1400 && !a.back) {
        if (s < RET_BOOST_S) { a.cvx = Math.cos(a.awayB) * BOOST; a.cvy = Math.sin(a.awayB) * BOOST } else { a.cvx = 0; a.cvy = 0 }
        if (s >= REP_DELAY) a.hp = Math.min(RET_EXIT * 1400, a.hp + REP_RATE * DT)
        if (a.hp >= RET_EXIT * 1400 - 1e-6) a.back = true
      } else {
        a.back = true
        const R = strafeBand(a, w, X.x, X.y, 92, 108, WALK)
        a.yaw = bearing(a, X.x, X.y)
        if (R < 115) { const cyc = (t + a.off) % 2.4; if (cyc < 1.4) laserCycle(a, w, X.x, X.y, 0, false); gunAt(a, w, R, 0, false) }
      }
    }, { off: U(w.r, 0, 2.4) })
  }
}
// Quiet final (nobody dead by 20 s; it thinks it is in practice): fixed 170 m kite, boost back inside 145 m, torso on
// us, laser at full charge every 2.4 s, gun at 170 m
function quietKite(id, w) {
  const [x, y] = placeAt(w, U(w.r, 160, 180))
  return actor(id, x, y, ['gun', 'laser'], (a, w) => {
    const R = Math.hypot(a.x, a.y)
    a.yaw = bearing(a, 0, 0)
    if (R < 145) { a.cvx = a.x / R * BOOST; a.cvy = a.y / R * BOOST } else strafeBand(a, w, 0, 0, 162, 178, a.charging ? WALK / 2 : WALK)
    if ((w.t + a.off) % 2.4 < 1.4) laserCycle(a, w, 0, 0, 0.5, true); else { a.charging = false; a.chargeT = 0 }
    gunAt(a, w, R, 0.15, true)
  }, { off: U(w.r, 0, 2.4) })
}

// ------------------------------------------------------------------------------------------------ backfire controls
// (other families, from the counter_hookup / dossier numbers; not 2696)
const wounded = (make, hpf) => (id, w) => { const a = make(id, w); const s0 = a.script; a.script = (b, w) => { s0(b, w); b.hp = hpf * 1400 }; return a }
// A-bot-like kiter: gun + laser 125-185 m, charging at us every 2.4 s, gun at us
function kiterAtUs(id, w) {
  const [x, y] = placeAt(w, U(w.r, 140, 175))
  return actor(id, x, y, ['gun', 'laser'], (a, w) => {
    const R = strafeBand(a, w, 0, 0, 125, 185, a.charging ? WALK / 2 : WALK); a.yaw = bearing(a, 0, 0)
    if ((w.t + a.off) % 2.4 < 1.4) laserCycle(a, w, 0, 0, 0.8, true); else { a.charging = false; a.chargeT = 0 }
    gunAt(a, w, R, 0.3, true)
  }, { off: U(w.r, 0, 2.4) })
}
// gun-only strafer at 70 m shooting us (TTUN / ImagineLosing shape)
function strafAtUs(id, w) {
  const [x, y] = placeAt(w, U(w.r, 65, 80))
  return actor(id, x, y, ['gun'], (a, w) => { const R = strafeBand(a, w, 0, 0, 55, 85, WALK); a.yaw = bearing(a, 0, 0); gunAt(a, w, R, 0.5, true) })
}
// a mech fighting X (id 7, hidden from us) at `hold` m, side-on to us (90 deg), with `weapons`; lightning carriers close
function busyWith(weapons, hold) {
  return (id, w) => {
    const b0 = U(w.r, -Math.PI, Math.PI), qx = Math.cos(b0) * 130, qy = Math.sin(b0) * 130
    const bu = Math.atan2(-qy, -qx) + Math.PI / 2
    const X = w.add(actor(7, qx + Math.cos(bu) * hold, qy + Math.sin(bu) * hold, ['gun'], (a) => { a.hidden = true; a.cvx = 0; a.cvy = 0 }))
    return actor(id, qx, qy, weapons, (a, w) => {
      const R = strafeBand(a, w, X.x, X.y, hold - 8, hold + 8, WALK); a.yaw = bearing(a, X.x, X.y)
      if (weapons.includes('laser')) { if ((w.t + a.off) % 2.4 < 1.4) laserCycle(a, w, X.x, X.y, 0, false); else { a.charging = false; a.chargeT = 0 } }
      gunAt(a, w, R, 0, false)
      if (weapons.includes('lightning') && R < 44 && (a.lt = (a.lt || 0) + DT) >= 0.25) { a.lt = 0; w.beams.push({ by: a.id, kind: 'lightning', path: [[a.x, a.y, 7], [X.x, X.y, 4.5]], age: 0.1 }) }
    }, { off: U(w.r, 0, 2.4) })
  }
}
// gun + laser passing us at 60 m, torso sweeping +-52 deg about its heading, never charging (must not read LB)
function passer60(id, w) {
  const b = U(w.r, -Math.PI, Math.PI), hx = Math.cos(b), hy = Math.sin(b)
  return actor(id, -hx * 200 - hy * 60, -hy * 200 + hx * 60, ['gun', 'laser'], (a, w) => { a.cvx = hx * WALK; a.cvy = hy * WALK; a.yaw = wrap(b + 0.9 * Math.sin(w.t * 2 * Math.PI / 4.8)) })
}
// laser + lightning (no gun) holding 55 m charging at us (must not read LB)
function dual55(id, w) {
  const [x, y] = placeAt(w, U(w.r, 52, 58))
  return actor(id, x, y, ['laser', 'lightning'], (a, w) => {
    strafeBand(a, w, 0, 0, 50, 60, a.charging ? WALK / 2 : WALK); a.yaw = bearing(a, 0, 0)
    if ((w.t + a.off) % 2.4 < 1.4) laserCycle(a, w, 0, 0, 0.6, true); else { a.charging = false; a.chargeT = 0 }
  }, { off: U(w.r, 0, 2.4) })
}

const GL = ['gun', 'laser'], LZ = ['laser', 'lightning']
const TRACKS = [
  { name: 'farm-gun (opening / mid-game farming, gun only)', make: farm(['gun'], false), my: GL, dur: 60, win: [[5, 60, 'farming']] },
  { name: 'farm-gun+laser (farming, laser found, we are in its view)', make: farm(GL, false), my: GL, dur: 60, win: [[5, 60, 'farming']] },
  { name: 'farm-laser-crates (farming, full charge on each crate)', make: farm(GL, true), my: GL, dur: 60, win: [[5, 60, 'farming']] },
  { name: 'kite-100 vs our gun+laser, corner peeks', make: fightUs(HOLD_GL, true), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'kite-100 vs our gun+laser, open strafe', make: fightUs(HOLD_GL, false), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'kite-95 vs our gun+laser, corner peeks', make: fightUs(95, true), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'kite-55 vs our laser+lightning, corner peeks', make: fightUs(HOLD_LZ, true), my: LZ, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'fights another mech at 100 m (we watch from the side)', make: fightOther(), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'kite-70 vs our gun+laser, corner peeks (LB/LK boundary)', make: fightUs(70, true), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'kite-85 vs our gun+laser, corner peeks (LB/LK boundary)', make: fightUs(85, true), my: GL, dur: 40, win: [[5, 40, 'kiting']] },
  { name: 'retreat at 35%, attacker hidden from us, we 90 deg off its torso', make: fightOther({ tRet: 20, xHidden: true }), my: GL, dur: 45, win: [[10, 20, 'fight'], [20, 23, 'ret boost'], [23, 26.5, 'ret <=40%'], [26.5, 29.6, 'ret 40-50%'], [29.6, 39, 'ret 50-80%']] },
  { name: 'retreat at 35%, attacker hidden from us, we 45 deg off its torso', make: fightOther({ tRet: 20, xHidden: true, thetaDeg: 45 }), my: GL, dur: 45, win: [[10, 20, 'fight'], [20, 23, 'ret boost'], [23, 26.5, 'ret <=40%'], [26.5, 29.6, 'ret 40-50%'], [29.6, 39, 'ret 50-80%']] },
  { name: 'retreat at 35%, attacker in our view, we 90 deg off its torso', make: fightOther({ tRet: 20 }), my: GL, dur: 45, win: [[10, 20, 'fight'], [20, 23, 'ret boost'], [23, 26.5, 'ret <=40%'], [26.5, 29.6, 'ret 40-50%'], [29.6, 39, 'ret 50-80%']] },
  { name: 'retreat at 35% (control: its attacker almost in line with us, torso 15 deg off us)', make: fightOther({ tRet: 20, xHidden: true, thetaDeg: 15 }), my: GL, dur: 45, win: [[10, 20, 'fight'], [20, 23, 'ret boost'], [23, 26.5, 'ret <=40%'], [26.5, 29.6, 'ret 40-50%'], [29.6, 39, 'ret 50-80%']] },
  { name: 'retreat at 35% from US (control: torso on us)', make: fightOther({ tRet: 20, lastIsUs: true }), my: GL, dur: 45,
    win: [[23, 26.5, 'ret <=40%'], [26.5, 29.6, 'ret 40-50%']] },
  { name: 'quiet-final 170 m kite (module inert in SQUAD; read only)', make: quietKite, my: GL, dur: 40, win: [[5, 40, 'kite170']] },
  { name: 'BACKFIRE wounded (40%) kiter charging at us', make: wounded(kiterAtUs, 0.4), my: GL, dur: 30, win: [[8, 30, 'wounded']] },
  { name: 'BACKFIRE wounded (40%) gun strafer shooting us', make: wounded(strafAtUs, 0.4), my: GL, dur: 30, win: [[8, 30, 'wounded']] },
  { name: 'BACKFIRE wounded (40%) gun strafer busy with a hidden mech, side-on', make: wounded(busyWith(['gun'], 70), 0.4), my: GL, dur: 30, win: [[8, 30, 'wounded']] },
  { name: 'BACKFIRE wounded (40%) gun+lightning closer on a hidden mech at 28 m, side-on', make: wounded(busyWith(['gun', 'lightning'], 28), 0.4), my: GL, dur: 30, win: [[8, 30, 'wounded']] },
  { name: 'BACKFIRE healthy gun+laser at 60 m fighting a hidden mech, side-on (LB third-party view)', make: busyWith(['gun', 'laser'], 60), my: GL, dur: 30, win: [[8, 30, 'healthy']] },
  { name: 'BACKFIRE gun+laser passing at 60 m, never aiming or charging', make: passer60, my: GL, dur: 30, win: [[6, 30, 'passing']] },
  { name: 'BACKFIRE laser+lightning holding 55 m, charging at us', make: dual55, my: GL, dur: 30, win: [[6, 30, 'dual55']] },
]

function ctxFor(my) {
  const laser = my.includes('laser'), light = my.includes('lightning'), gun = my.includes('gun')
  return { env: 'FFA', bandLo: laser ? 125 : 55, bandHi: laser ? 185 : 95, myLaser: laser, myLightning: light, myGun: gun, myHpf: +arg('myhpf', 0.9), myHp: 1400 * +arg('myhpf', 0.9), myEnergy: 80, alive: +arg('alive', 10) }
}

function runOne(lib, params, tr, seed) {
  const w = new World(seed, { myWeapons: tr.my })
  const a = w.add(tr.make(5, w))
  const c = lib.createCounters(HELLO, params)
  const ctx = ctxFor(tr.my)
  const rows = []
  // D0-style instantaneous aim test on the same observations (12 deg inside 160 m), memory 1 s, and with a 0.3 s dwell
  let lastOn = -99, run = 0, lastDw = -99, lastDw6 = -99, nD0 = 0, nDw = 0, nDw6 = 0, nObs = 0
  for (let k = 0; k < tr.dur / DT; k++) {
    w.step()
    const o = w.obs()
    c.update(o, o.t)
    const m = o.mechs.find((q) => q.id === 5)
    if (m) {
      const d = Math.hypot(m.pos[0], m.pos[1]), b = Math.atan2(-m.pos[1], -m.pos[0])
      const on = d < 160 && Math.abs(wrap(m.aim[0] - b)) < 12 * Math.PI / 180
      if (on) { lastOn = o.t; run++ } else run = 0
      if (run >= 3) lastDw = o.t
      if (run >= 6) lastDw6 = o.t
    } else run = 0
    if (o.t >= 2) { nObs++; if (o.t - lastOn <= 1.0) nD0++; if (o.t - lastDw <= 1.0) nDw++; if (o.t - lastDw6 <= 1.0) nDw6++ }
    const r = c.archetypeOf(5), v = c.adviceFor(5, ctx)
    rows.push({ t: o.t, label: r.archetype, conf: r.confidence, reason: v.reason, level: v.engageLevel, lo: v.lo, hi: v.hi, mult: v.targetMult, w: v.weight, hpf: a.hp / a.maxHp })
  }
  return { rows, d0: nD0 / Math.max(1, nObs), dwell: nDw / Math.max(1, nObs), dwell6: nDw6 / Math.max(1, nObs) }
}

function summarize(lib, params, tr) {
  const per = tr.win.map(() => ({ labels: {}, reasons: {}, levels: [0, 0, 0, 0], n: 0, lo: 0, hi: 0, mult: 0 }))
  let d0 = 0, dw = 0, dw6 = 0
  for (let s = 1; s <= NSEEDS; s++) {
    const { rows, d0: a, dwell: b, dwell6: c6 } = runOne(lib, params, tr, s * 7919 + tr.name.length)
    d0 += a; dw += b; dw6 += c6
    for (const r of rows) tr.win.forEach(([t0, t1], i) => {
      if (r.t < t0 || r.t >= t1) return
      const P = per[i]
      P.n++; P.labels[r.label] = (P.labels[r.label] || 0) + 1; P.reasons[r.reason] = (P.reasons[r.reason] || 0) + 1; P.levels[r.level]++
      P.lo += r.lo; P.hi += r.hi; P.mult += r.mult
    })
  }
  const fmt = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join(', ')
  return { per: per.map((P, i) => ({ win: tr.win[i][2], labels: fmt(P.labels, P.n), reasons: fmt(P.reasons, P.n),
    levels: P.levels.map((x) => (100 * x / P.n).toFixed(0) + '%').join('/'), band: `${(P.lo / P.n).toFixed(0)}-${(P.hi / P.n).toFixed(0)}`, mult: (P.mult / P.n).toFixed(2) })),
    d0: d0 / NSEEDS, dwell: dw / NSEEDS, dwell6: dw6 / NSEEDS }
}

console.log(`seeds ${NSEEDS}; FFA ctx (myHpf 0.9, alive 10); levels = avoid/respond-only/opportunistic/attack share of decisions`)
for (const tr of TRACKS) {
  const A = summarize(ORIG, ORIGP, tr), B = summarize(MOD, MODP, tr)
  console.log(`\n== ${tr.name}   [our ${tr.my.join('+')}]   D0 aim flag ${(100 * A.d0).toFixed(0)}% of decisions, with 0.3 s dwell ${(100 * A.dwell).toFixed(0)}%, 0.6 s ${(100 * A.dwell6).toFixed(0)}%`)
  A.per.forEach((p, i) => {
    const q = B.per[i]
    console.log(`  ${p.win.padEnd(11)} BEFORE labels: ${p.labels}`)
    console.log(`  ${''.padEnd(11)}        advice: ${p.reasons} | lvl ${p.levels} | band ${p.band} | x${p.mult}`)
    if (q.labels !== p.labels || q.reasons !== p.reasons || q.band !== p.band || q.mult !== p.mult) {
      console.log(`  ${''.padEnd(11)} AFTER  labels: ${q.labels}`)
      console.log(`  ${''.padEnd(11)}        advice: ${q.reasons} | lvl ${q.levels} | band ${q.band} | x${q.mult}`)
    } else console.log(`  ${''.padEnd(11)} AFTER  (identical)`)
  })
}
