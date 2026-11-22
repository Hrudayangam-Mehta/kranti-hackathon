// Review helper: small closed-loop scenarios in the dev simulator (our brain against scripted mechs placed by hand).
import { Match } from '../../sim/sim.js'
import { World } from '../../bot/lib/world.js'
import { Nav } from '../../bot/lib/nav.js'
import { Collider } from '../../sim/physics.js'
import { loadConfig, MAP_DIR } from '../../sim/config.js'
import { createBrain } from '../../bot/lib/brain.js'

let E = null
export function env() {
  if (E) return E
  const world = World.loadSync(MAP_DIR)
  const cfg = loadConfig()
  const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
  const brainNav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
  E = { world, nav, brainNav, cfg, collider: new Collider(world) }
  return E
}
export const OPEN = { x: -332.38, y: -173.09 }     // most open point of the map (150 m clear in nearly all directions)

/** Our brain as an in-process bot; keeps one trace row per decision in bot.rows. */
export function brainBot(overrides, hook, pre) {
  const e = env()
  const bot = {
    name: 'ours', rows: [], brain: null, logs: [],
    hello(h) {
      e.brainNav.setBody(h.config.mech.radius, h.config.mech.height)
      bot.brain = createBrain(h, { world: e.world, nav: e.brainNav, log: (...a) => bot.logs.push(a.join(' ')) }, { warmup: false, ...(overrides || {}) })
      return { type: 'ready', name: 'ours' }
    },
    act(obs) {
      if (pre) pre(obs, bot.brain)
      const a = bot.brain.act(obs, performance.now() + 27)
      a.tick = obs.tick
      const B = bot.brain._B, me = B.me, tg = B.target
      const row = { t: obs.t, x: me.x, y: me.y, hp: me.hp, hpf: me.hpf, en: me.energy, mode: B.mode, leg: B.legKind, st: B.stance, env: B.env, tgt: tg ? tg.id : -1, td: tg ? tg.dist : -1,
        A: B.A, n1: B.n1, nLos: B.nLos, hide: B.hide.state, hd: B.hide.dist, hx: B.hide.x, hy: B.hide.y, mx: a.move[0], my: a.move[1], boost: !!a.boost, f0: !!a.fire[0], f1: !!a.fire[1], reload: !!a.reload,
        aimYaw: a.aim[0], aimPitch: a.aim[1], yaw: me.yaw, pitch: me.pitch, aim: B.aimKind, spd: me.speed, ammo: me.gun ? me.gun.ammo : -1, cd: me.gun ? me.gun.cooldown : -1,
        inZone: me.inZone, zm: B.zoneMargin, hold: B.holdFire, evs: obs.events || [], zone: obs.zone, goal: B.hasGoal ? [B.goalX, B.goalY] : null, w1: me.weapons[1] ? { ...me.weapons[1] } : null, cubes: me.cubes,
        take: a.take, drop: a.drop, pick: a.pick, loot: B.loot ? B.loot.type : '', lastLosInAge: obs.t - B.lastLosInT }
      if (hook) hook(row, obs, a, B)
      bot.rows.push(row)
      return a
    },
  }
  return bot
}

/** A scripted mech: policy(obs, state) -> partial action. */
export function scripted(name, policy) {
  const state = {}
  return { name, state, hello() { return { type: 'ready', name } }, act(obs) { const a = policy(obs, state) || {}; a.tick = obs.tick; return a } }
}
export const idle = () => scripted('idle', () => ({ move: [0, 0] }))

/** First-order gun lead from an observation (what the house bots do), for scripted shooters. */
export function leadAim(obs, tgt, speed = 252) {
  const me = obs.self, sx = me.pos[0], sy = me.pos[1], sz = me.pos[2] + (me.stats.muzzle_height || 7)
  let tx = tgt.pos[0], ty = tgt.pos[1]
  const tz = tgt.pos[2] + 4.5
  let t = Math.hypot(tx - sx, ty - sy) / speed
  for (let i = 0; i < 3; i++) { tx = tgt.pos[0] + tgt.vel[0] * (t + 0.05); ty = tgt.pos[1] + tgt.vel[1] * (t + 0.05); t = Math.hypot(tx - sx, ty - sy) / speed }
  return [Math.atan2(ty - sy, tx - sx), Math.atan2(tz - sz, Math.hypot(tx - sx, ty - sy))]
}

/**
 * runScenario({ bots, place: [{x,y,yaw,hp,weapon,cubes}], seed, cfgEdit(cfg), setup(match), maxT, keepWorld })
 * Places mechs by hand, removes drones / crates / pickups / supply drops unless keepWorld, runs to maxT.
 */
export function runScenario(o) {
  const e = env()
  const cfg = JSON.parse(JSON.stringify(e.cfg))
  cfg.match.mechs = o.bots.length
  if (!o.zone) { cfg.zone.start_center = [OPEN.x, OPEN.y]; cfg.zone.start_radius = 3000; cfg.zone.phases = [{ hold_s: 9000, shrink_s: 10, radius: 2900, dps: 20 }] } else Object.assign(cfg.zone, o.zone)
  if (o.cfgEdit) o.cfgEdit(cfg)
  const match = new Match({ world: e.world, nav: e.nav, collider: e.collider, seed: o.seed ?? 1, config: cfg, bots: o.bots, mode: 'ffa', focus: o.focus ?? null, maxDecisions: Math.round((o.maxT ?? 30) * 10) })
  if (!o.keepWorld) {
    for (const n of match.npcs) n.alive = false
    for (const c of match.crates) c.alive = false
    match.pickups.length = 0; match.cubes.length = 0
    if (match.drops) for (const d of match.drops) d.state = 3
  }
  if (o.zoneFixed) {
    // exact circles instead of the random nested ones: [{x,y,r}, ...] one more than the phases
    const c = o.zoneFixed
    for (let i = 0; i < match.phases.length; i++) { match.phases[i].from = c[i]; match.phases[i].to = c[i + 1] }
    match._zoneAt(0)
  }
  ;(o.place || []).forEach((p, i) => {
    const m = match.mechs[i]
    if (!m || !p) return
    m.x = p.x; m.y = p.y; m.z = e.nav.levelAt(p.x, p.y)
    if (p.yaw !== undefined) { m.yaw = p.yaw; m.cmdYaw = p.yaw }
    if (p.hp !== undefined) m.hp = p.hp
    if (p.weapon) { m.slots[1] = match._newWeapon(p.weapon); match._recalc(m) }
    if (p.energy !== undefined) m.energy = p.energy
    if (p.cubes) { match._giveCubes(m, p.cubes) }
  })
  if (o.setup) o.setup(match)
  const res = match.runSync()
  return { match, res }
}
