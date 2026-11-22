// Worst-case observation generator: 15 visible mechs, 10 projectiles, damage every tick, loot around, zone
// pressure, body growth, changing loadouts, at the spots where path planning is most expensive. The self
// position follows the bot's own last action (simple kinematics on the nav grid) so paths are really walked.
import { mkObs, mkSelf, mkMech, mkNpc, mkZone, weapon, mulberry } from './common.js'

export function makeHeavy(hello, world, nav, o = {}) {
  const cfg = hello.config, rnd = mulberry(o.seed ?? 11)
  const b = world.bounds
  const pass = (x, y, r = 30) => nav.nearestPassable(x, y, r)
  // expensive spots: centre, the stadium bowl (other component), a map corner, dense building blocks, far edges
  const dense = []
  for (let k = 0; k < 4000 && dense.length < 6; k++) {
    const x = b.minX + 40 + rnd() * (b.maxX - b.minX - 80), y = b.minY + 40 + rnd() * (b.maxY - b.minY - 80)
    if (nav.passableAt(x, y) && nav.wallDistAt(x, y) < 5 && nav.component(x, y) === nav.mainComponent) dense.push([x, y])
  }
  const named = [[0, 0], [-277, 131], [b.minX + 30, b.minY + 30], [b.maxX - 30, b.maxY - 30], [b.minX + 30, b.maxY - 30], [b.maxX - 30, b.minY + 30]]
  const spots = [...named.map(([x, y]) => { const q = pass(x, y, 80); return [q.x, q.y] }), ...dense]
  const period = o.period ?? 250
  let sx = spots[0][0], sy = spots[0][1], svx = 0, svy = 0, spot = -1
  const kinds = [['gun'], ['gun', 'laser'], ['gun', 'mortar'], ['gun', 'lightning'], ['laser', 'lightning']]
  const loadouts = [
    (k) => [weapon(cfg, 'gun', { ammo: 12 - (k % 13), reload: k % 13 === 12 ? 1.2 : 0, cooldown: (k % 3) * 0.08 }), null],
    (k) => [weapon(cfg, 'gun', { ammo: 12 - (k % 13) }), weapon(cfg, 'laser', { charge: (k % 10) * 0.08, cooldown: k % 20 < 4 ? 1 : 0 })],
    (k) => [weapon(cfg, 'gun', { ammo: 12 - (k % 13) }), weapon(cfg, 'lightning', { cooldown: (k % 3) * 0.1 })],
    (k) => [weapon(cfg, 'gun', { ammo: 0, reload: 1 }), weapon(cfg, 'mortar', { cooldown: k % 26 < 3 ? 0 : 1 })],
    (k) => [weapon(cfg, 'laser', { charge: (k % 10) * 0.08 }), weapon(cfg, 'lightning')],
  ]
  return function next(n, last) {
    const s = Math.floor(n / period) % spots.length
    const ph = Math.floor(n / period)
    if (s !== spot) { spot = s; sx = spots[s][0]; sy = spots[s][1]; svx = svy = 0 }
    else if (last && Array.isArray(last.move)) {
      const sp = last.boost ? cfg.mech.boost_speed : cfg.mech.walk_speed
      const nx = sx + last.move[0] * sp * 0.1, ny = sy + last.move[1] * sp * 0.1
      if (nav.passableAt(nx, ny) && nav.walkLine(sx, sy, nx, ny)) { svx = (nx - sx) / 0.1; svy = (ny - sy) / 0.1; sx = nx; sy = ny } else { svx = svy = 0 }
    }
    const sz = nav.levelAt(sx, sy)
    const k = n % period
    const cubes = o.cubes === false ? 0 : Math.min(30, Math.floor(n / 180))
    const maxHp = cfg.mech.hp * (1 + 0.04 * Math.min(cubes, 10))
    const hpf = [1, 0.8, 0.45, 0.3, 0.12, 0.6][Math.floor(k / 40) % 6]
    const nm = o.mechs ?? 15
    const mechs = []
    for (let i = 0; i < nm; i++) {
      const id = i < 3 ? i : i + 1
      const r = 35 + ((i * 37) % 150), a = i * 0.42 + n * 0.004 * (i % 2 ? 1 : -1)
      const q = pass(sx + r * Math.cos(a), sy + r * Math.sin(a), 30) || { x: sx + r * Math.cos(a), y: sy + r * Math.sin(a) }
      const tx = -Math.sin(a), ty = Math.cos(a)
      mechs.push(mkMech(id, [+q.x.toFixed(2), +q.y.toFixed(2), +nav.levelAt(q.x, q.y).toFixed(2)], {
        vel: [+(9 * tx * (k % 30 < 15 ? 1 : -1)).toFixed(2), +(9 * ty * (k % 30 < 15 ? 1 : -1)).toFixed(2), 0], aim: [+Math.atan2(sy - q.y, sx - q.x).toFixed(3), 0],
        hp: 200 + ((i * 97 + n) % 1200), max_hp: 1400, cubes: i % 5, weapons: kinds[i % kinds.length], charging: i % 5 === 1 && k % 20 < 8,
      }))
    }
    for (let i = 0; i < (o.npcs ?? 3); i++) mechs.push(mkNpc(100 + i, [sx + 30 * Math.cos(i * 2.1), sy + 30 * Math.sin(i * 2.1), sz], { vel: [1, 0, 0] }))
    const projectiles = []
    for (let i = 0; i < (o.projectiles ?? 10); i++) {
      const a = i * 0.63 + n * 0.01
      if (i % 2 === 0) { const tt = 0.3 + ((n + i * 7) % 30) * 0.1; projectiles.push({ id: 400 + i + Math.floor(n / 30) * 10, kind: 'mortar', pos: [+(sx + 30 * Math.cos(a) * tt + (i - 5)).toFixed(2), +(sy + 30 * Math.sin(a) * tt).toFixed(2), +(sz + 11 * tt * tt + 1).toFixed(2)], vel: [+(-30 * Math.cos(a)).toFixed(2), +(-30 * Math.sin(a)).toFixed(2), +(-22 * tt).toFixed(2)] }) }
      else projectiles.push({ id: 300 + i, kind: i % 4 === 1 ? 'gun' : 'npc', pos: [+(sx + 60 * Math.cos(a)).toFixed(2), +(sy + 60 * Math.sin(a)).toFixed(2), sz + 7], vel: [+(-252 * Math.cos(a)).toFixed(2), +(-252 * Math.sin(a)).toFixed(2), 0] })
    }
    const events = []
    if (hpf < 1 || k % 4 === 0) for (let i = 0; i < 3; i++) { const m = mechs[(n + i * 5) % nm]; if (m) events.push({ type: 'damaged', amount: 45 + 20 * i, weapon: m.weapons[m.weapons.length - 1], bearing: +Math.atan2(m.pos[1] - sy, m.pos[0] - sx).toFixed(3), by: m.id, rear: i === 2 }) }
    if (k % 3 === 0 && nm) events.push({ type: 'hit', target: mechs[n % nm].id, amount: 45, weapon: 'gun' })
    if (k === 100) events.push({ type: 'kill', target: mechs[0] ? mechs[0].id : 1 })
    const ring = (count, r, idBase, extra) => Array.from({ length: count }, (_, i) => { const a = i * 6.283 / count + 0.3; const q = pass(sx + r * Math.cos(a), sy + r * Math.sin(a), 20) || { x: sx, y: sy }; return { id: idBase + i + s * 20, pos: [+q.x.toFixed(2), +q.y.toFixed(2), +nav.levelAt(q.x, q.y).toFixed(2)], ...(extra ? extra(i) : {}) } })
    // zone: every third phase the circle is far away (long plan, outside), else around us and shrinking
    const zmode = ph % 3
    const zc = zmode === 1 ? [sx + 600 * Math.cos(ph), sy + 600 * Math.sin(ph)] : [sx + 40, sy]
    const zone = zmode === 1 ? mkZone({ center: zc, radius: 380, next_center: zc, next_radius: 240, shrink_start: n / 10 - 5, shrink_end: n / 10 + 20, dps: 60 })
      : mkZone({ center: zc, radius: 300 - k * 0.5, next_center: [sx + 90, sy + 30], next_radius: zmode === 2 ? 25 : 140, shrink_start: n / 10 - k / 10, shrink_end: n / 10 + (period - k) / 10 + 1, dps: 35 })
    const self = mkSelf(cfg, { pos: [+sx.toFixed(2), +sy.toFixed(2), +sz.toFixed(2)], vel: [+svx.toFixed(2), +svy.toFixed(2), 0], aim: last && last.aim ? last.aim : [0, 0], cubes,
      hp: +(maxHp * hpf).toFixed(1), max_hp: maxHp, energy: 20 + (k % 80), weapons: loadouts[ph % loadouts.length](k), in_zone: zmode !== 1, grounded: k % 50 !== 49 })
    return mkObs(cfg, n * 2, {
      alive: 16 - Math.min(10, Math.floor(n / 600)), self, mechs, projectiles, events, zone,
      crates: ring(8, 30, 1000, () => ({ hp: 300 })), cubes: ring(8, 18, 5000), pickups: ring(6, 12, 8000, (i) => ({ kind: ['mortar', 'laser', 'lightning'][i % 3] })),
      sounds: [{ kind: 'gun', bearing: 1, dist: 'near', age: 0.05 }, { kind: 'step', bearing: -2, dist: 'near', age: 0.02 }, { kind: 'laser_charge', bearing: 0.4, dist: 'mid', age: 0.1 }],
      beams: k % 7 === 0 && nm > 2 ? [{ by: mechs[1].id, kind: 'laser', path: [[mechs[1].pos[0], mechs[1].pos[1], mechs[1].pos[2] + 7], [mechs[2].pos[0], mechs[2].pos[1], mechs[2].pos[2] + 4]], age: 0.1 }] : [],
      drops: ph % 4 === 3 ? [{ id: 20000, pos: [sx + 50, sy - 20, sz], radius: 8, lands_in: Math.max(0, 10 - k / 10), capture_s: 4, progress: 0, holder: null }] : [],
      offer: k % 60 === 30 ? { id: ph, expires: n / 10 + 5, choices: [{ id: 'gun_rate', name: 'a', desc: 'b' }, { id: 'armor', name: 'a', desc: 'b' }, { id: 'plating', name: 'a', desc: 'b' }] } : null,
    })
  }
}
