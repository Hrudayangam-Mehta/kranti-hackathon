// Structured fuzz: random but schema-legal observation sequences (episodes with continuity), on the real map and
// without a map. Optional --garbage adds illegal mutations (null / NaN / wrong types / missing fields).
//   taskset -c 0 bun fuzz.js [--episodes 300] [--seed 1] [--garbage] [--nomap]
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mkNpc, mkZone, weapon, rawProblems, mulberry, pct } from './common.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const EP = Number(arg('--episodes', '300')), LEN = Number(arg('--len', '120'))
const garbage = args.includes('--garbage'), nomap = args.includes('--nomap')
const rnd = mulberry(Number(arg('--seed', '1')))
const ri = (n) => Math.floor(rnd() * n), pick = (a) => a[ri(a.length)], ch = (p) => rnd() < p
const b = world.bounds
const anyPos = () => { const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY); return [x, y] }
const standPos = () => { for (let k = 0; k < 50; k++) { const [x, y] = anyPos(); if (nav.passableAt(x, y)) return [x, y] } return [0, 0] }
const z = (x, y) => +nav.levelAt(x, y).toFixed(2)
const WK = ['gun', 'laser', 'lightning', 'mortar']
function rndWeapon(kind, up) {
  const w = weapon(cfg, kind)
  if (up) for (const k of Object.keys(w.stats)) if (ch(0.3)) w.stats[k] = +(w.stats[k] * pick([0.5, 0.75, 0.87, 1.15, 1.3, 2])).toFixed(3)
  w.cooldown = ch(0.5) ? 0 : +(rnd() * 2).toFixed(2)
  if (kind === 'gun') { w.ammo = ch(0.2) ? 0 : ri(w.stats.mag + 1); w.reload = ch(0.2) ? +(rnd() * 2.4).toFixed(2) : 0 }
  if (kind === 'laser') w.charge = ch(0.5) ? 0 : +(rnd() * 3).toFixed(2)
  return w
}
function rndLoadout() {
  const r = rnd()
  if (r < 0.3) return [rndWeapon('gun', ch(0.3)), null]
  if (r < 0.35) return [null, null]
  if (r < 0.4) return [null, rndWeapon(pick(WK))]
  const a = pick(WK); let c = pick(WK); while (c === a) c = pick(WK)
  return [rndWeapon(a, ch(0.3)), rndWeapon(c, ch(0.3))]
}
const G = [null, undefined, NaN, Infinity, -Infinity, 'x', {}, [], true, 1e308, -1, 0, '', [null], [NaN, NaN, NaN]]
function mutate(o, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 4) return
  const keys = Object.keys(o)
  for (const k of keys) {
    if (depth === 0 && (k === 'tick' || k === 'type')) continue
    if (ch(0.03)) { if (ch(0.3)) delete o[k]; else o[k] = pick(G) } else mutate(o[k], depth + 1)
  }
}

const stats = { thrown: 0, errors: {}, raw: {}, times: [], slow: [], logs: [] }
let tick = 0
for (let ep = 0; ep < EP; ep++) {
  const brain = createBrain(hello, { world: nomap ? null : world, nav: nomap ? null : nav, log: (...a) => stats.logs.push(`[ep ${ep}] ` + a.join(' ')) }, { warmup: false })
  if (!nomap) nav.setBody(cfg.mech.radius, cfg.mech.height)
  let [sx, sy] = ch(0.85) ? standPos() : anyPos()
  let cubes = ch(0.6) ? 0 : ri(45), load = rndLoadout(), hpf = 1
  const roster = Array.from({ length: ri(16) }, (_, i) => ({ id: i < 3 ? i : i + 1, p: standPos(), kinds: ch(0.1) ? undefined : (() => { const s = ['gun']; if (ch(0.5)) s.push(pick(WK.slice(1))); return ch(0.05) ? [] : s })(), near: ch(0.6) }))
  const npcs = Array.from({ length: ch(0.4) ? ri(13) : 0 }, (_, i) => ({ id: 100 + i, p: standPos() }))
  for (const m of [...roster, ...npcs]) if (m.near !== false) { const a = rnd() * 6.283, r = pick([0, 3, 20, 44, 46, 90, 150, 199, 230, 400]); const q = nav.nearestPassable(sx + r * Math.cos(a), sy + r * Math.sin(a), 25); m.p = q ? [q.x, q.y] : [sx + r * Math.cos(a), sy + r * Math.sin(a)] }
  const zoneKind = ri(6)
  const loot = { crates: Array.from({ length: ri(12) }, (_, i) => ({ id: 1000 + i, p: [sx + (rnd() - 0.5) * 120, sy + (rnd() - 0.5) * 120] })), cubes: Array.from({ length: ri(14) }, (_, i) => ({ id: 5000 + i, p: [sx + (rnd() - 0.5) * 60, sy + (rnd() - 0.5) * 60] })), pickups: Array.from({ length: ri(10) }, (_, i) => ({ id: 8000 + i, kind: pick(WK), p: [sx + (rnd() - 0.5) * (ch(0.3) ? 6 : 80), sy + (rnd() - 0.5) * (ch(0.3) ? 6 : 80)] })) }
  let t0tick = tick = ch(0.1) ? 9000 + ri(1000) : ri(8000) & ~1
  let last = null, grounded = true
  for (let k = 0; k < LEN; k++) {
    tick += ch(0.9) ? 2 : pick([4, 10, 20, 200])
    // self follows its own command when the line is walkable
    if (last && Array.isArray(last.move) && Number.isFinite(last.move[0])) { const nx = sx + last.move[0] * 1.17, ny = sy + last.move[1] * 1.17; if (nomap || (nav.passableAt(nx, ny) && nav.walkLine(sx, sy, nx, ny))) { sx = nx; sy = ny } }
    if (ch(0.01)) [sx, sy] = anyPos()                       // teleport (knock-back, respawned test input)
    if (ch(0.02)) load = rndLoadout()
    if (ch(0.03)) cubes += 1 + ri(3)
    if (ch(0.05)) hpf = pick([0, 0.05, 0.2, 0.39, 0.5, 0.69, 0.9, 1])
    if (ch(0.05)) grounded = !grounded
    for (const w of load) if (w) { if (w.kind === 'laser') w.charge = ch(0.3) ? 0 : +Math.min(3, w.charge + 0.1).toFixed(2); if (w.kind === 'gun' && ch(0.3)) w.ammo = Math.max(0, w.ammo - 1); w.cooldown = Math.max(0, +(w.cooldown - 0.1).toFixed(2)) }
    const sz = z(sx, sy) + (grounded ? 0 : rnd() * 30)
    const maxHp = Math.round(cfg.mech.hp * (1 + 0.04 * Math.min(cubes, 10)))
    const mechs = []
    for (const m of roster) {
      if (ch(0.25)) continue
      m.p[0] += (rnd() - 0.5) * 2.4; m.p[1] += (rnd() - 0.5) * 2.4
      const o = { vel: [+(rnd() * 24 - 12).toFixed(2), +(rnd() * 24 - 12).toFixed(2), ch(0.1) ? +(rnd() * 20 - 10).toFixed(2) : 0], aim: [+(rnd() * 6.283 - 3.1415).toFixed(3), +(rnd() * 2 - 0.7).toFixed(3)], hp: ch(0.05) ? 0 : ri(1960), max_hp: 1400 + 56 * ri(11), cubes: ri(30), weapons: m.kinds, charging: ch(0.2) }
      if (ch(0.1)) { delete o.hp; delete o.max_hp }
      if (ch(0.05)) { delete o.cubes; delete o.charging }
      if (m.kinds === undefined) delete o.weapons
      mechs.push(mkMech(m.id, [+m.p[0].toFixed(2), +m.p[1].toFixed(2), +(z(m.p[0], m.p[1]) + (ch(0.05) ? rnd() * 40 : 0)).toFixed(2)], o))
    }
    for (const m of npcs) if (ch(0.7)) mechs.push(mkNpc(m.id, [+m.p[0].toFixed(2), +m.p[1].toFixed(2), z(m.p[0], m.p[1])], ch(0.3) ? { hp: undefined, max_hp: undefined } : {}))
    const ids = mechs.map((m) => m.id)
    const projectiles = Array.from({ length: ch(0.5) ? 0 : ri(13) }, (_, i) => ({ id: 200 + ri(400), kind: pick(['gun', 'mortar', 'npc', 'mortar']), pos: [sx + (rnd() - 0.5) * 100, sy + (rnd() - 0.5) * 100, sz + rnd() * 60], vel: ch(0.1) ? [0, 0, 0] : [(rnd() - 0.5) * 144, (rnd() - 0.5) * 144, (rnd() - 0.5) * 100] }))
    const events = []
    const ne = ch(0.6) ? 0 : ri(6)
    for (let i = 0; i < ne; i++) {
      const r = ri(12)
      if (r < 4) { const by = ch(0.15) ? null : ch(0.7) && ids.length ? pick(ids) : pick([0, 7, 15, 100, 111, 104]); events.push({ type: 'damaged', amount: pick([20, 25, 45, 60, 90, 315, 500, 0.5]), weapon: by === null ? 'zone' : pick(['gun', 'mortar', 'laser', 'lightning', 'npc']), bearing: by === null ? null : +(rnd() * 6.283 - 3.1415).toFixed(3), by, ...(ch(0.3) ? { rear: true } : {}) }) }
      else if (r < 6) events.push({ type: 'hit', target: ids.length && ch(0.8) ? pick(ids) : pick([1003, 9, 104]), amount: 45, weapon: pick(WK), ...(ch(0.2) ? { effect: pick(['cookoff', 'short', 'concuss']) } : {}) })
      else if (r === 6) events.push({ type: 'kill', target: ids.length ? pick(ids) : 9 })
      else if (r === 7) events.push({ type: 'take_failed', id: 8000 + ri(12), reason: pick(['gone', 'range', 'have', 'full', 'busy']) })
      else if (r === 8) events.push({ type: 'took', id: 8000 + ri(12), kind: pick(WK), slot: ri(2) })
      else if (r === 9) events.push({ type: 'effect', effect: pick(['cookoff', 'short', 'concuss']), by: ri(16) })
      else if (r === 10) events.push({ type: 'pickup', cubes })
      else events.push(pick([{ type: 'drop', id: 20000, cubes }, { type: 'upgrade', id: 'armor' }, { type: 'dropped', id: 8100, kind: 'mortar', slot: 1 }]))
    }
    const t = tick / 20
    const zone = [
      () => mkZone(),
      () => mkZone({ center: [sx, sy], radius: 0, next_center: [sx, sy], next_radius: 0, shrink_start: t - 50, shrink_end: t - 25, dps: 260 }),
      () => mkZone({ center: [sx + 300, sy], radius: 140, next_center: [sx + 320, sy + 10], next_radius: 70, shrink_start: t + 3, shrink_end: t + 33, dps: 60 }),
      () => mkZone({ center: [sx + 20, sy], radius: Math.max(0, 70 - k), next_center: [sx + 25, sy + 4], next_radius: 25, shrink_start: t - k / 10, shrink_end: t - k / 10 + 7, dps: 100 }),
      () => mkZone({ center: [sx, sy], radius: 25, next_center: [sx + 3, sy], next_radius: 0, shrink_start: t, shrink_end: t, dps: 260 }),
      () => mkZone({ center: [41.3, -72.8], radius: 380, next_center: anyPos(), next_radius: 240, shrink_start: t + 1, shrink_end: t + 41, dps: 35 }),
    ][zoneKind]()
    const self = mkSelf(cfg, { pos: [+sx.toFixed(2), +sy.toFixed(2), +sz.toFixed(2)], vel: [+(rnd() * 20 - 10).toFixed(2), +(rnd() * 20 - 10).toFixed(2), grounded ? 0 : +(rnd() * 20 - 10).toFixed(2)], aim: [+(rnd() * 6.283 - 3.1415).toFixed(3), +(rnd() * 2 - 0.7).toFixed(3)], cubes,
      hp: Math.round(maxHp * hpf), max_hp: maxHp, energy: pick([0, 1, 5, 24, 26, 60, 100, 130]), max_energy: pick([100, 130]), grounded, in_zone: ch(0.8), weapons: JSON.parse(JSON.stringify(load)), upgrades: ch(0.3) ? ['armor', 'gun_rate'] : [] })
    if (ch(0.2)) self.stats = { ...cfg.mech }      // stats not size-scaled
    const obs = mkObs(cfg, tick, { t, alive: 1 + ri(16), self, mechs, projectiles, events, zone,
      crates: loot.crates.filter(() => ch(0.7)).map((c) => ({ id: c.id, pos: [c.p[0], c.p[1], z(c.p[0], c.p[1]) + (ch(0.2) ? 20 : 0)], ...(ch(0.9) ? { hp: pick([300, 255, 30, 0]) } : {}) })),
      cubes: loot.cubes.filter(() => ch(0.7)).map((c) => ({ id: c.id, pos: [c.p[0], c.p[1], z(c.p[0], c.p[1])] })),
      pickups: loot.pickups.filter(() => ch(0.7)).map((c) => ({ id: c.id, kind: c.kind, pos: [c.p[0], c.p[1], z(c.p[0], c.p[1])] })),
      sounds: Array.from({ length: ri(6) }, () => ({ kind: pick(['gun', 'mortar', 'explosion', 'laser', 'laser_charge', 'lightning', 'jet', 'death', 'crate', 'npc_gun', 'step', 'boost', 'reload', 'drop']), bearing: +(rnd() * 6.283 - 3.1415).toFixed(3), dist: pick(['near', 'mid', 'far']), age: +(rnd() * 0.1).toFixed(2) })),
      beams: ids.length && ch(0.2) ? [{ by: pick(ids), kind: pick(['laser', 'lightning']), path: Array.from({ length: 1 + ri(4) }, () => [sx + (rnd() - 0.5) * 200, sy + (rnd() - 0.5) * 200, sz + 5]), age: 0.1 }] : [],
      drops: ch(0.3) ? [{ id: 20000 + ri(3), pos: [sx + (rnd() - 0.5) * 200, sy + (rnd() - 0.5) * 200, sz], radius: 8, lands_in: pick([0, 0, 3, 11.3, 25]), capture_s: 4, progress: +(rnd() * 4).toFixed(1), holder: pick([null, null, 3, 7]) }] : [],
      offer: ch(0.1) ? { id: ri(9), expires: t + 5, choices: Array.from({ length: pick([3, 3, 3, 2, 1]) }, () => ({ id: pick(cfg.upgrades.map((u) => u.id).concat(['brand_new'])), name: 'n', desc: 'd' })) } : null })
    if (garbage) mutate(obs)
    const tA = performance.now()
    let a = null
    try { a = brain.act(obs, tA + 27.5) } catch (e) { stats.thrown++; stats.logs.push('THROW ' + (e && e.stack || e)) }
    const ms = performance.now() - tA
    stats.times.push(ms)
    if (ms > 20) stats.slow.push(`${ms.toFixed(1)}ms ep ${ep} k ${k} cubes ${cubes} mode ${brain._B.mode}/${brain._B.legKind}`)
    for (const p of rawProblems(a)) { const kk = p.replace(/=.*/, ''); stats.raw[kk] = (stats.raw[kk] || 0) + 1; if (stats.raw[kk] <= 2) stats.logs.push(`RAW ${p} ep ${ep} k ${k} ${JSON.stringify(a)}`) }
    last = a
  }
  const st = brain.debugState()
  for (const [k, v] of Object.entries(st.errors)) stats.errors[k] = (stats.errors[k] || 0) + v
}
const ts = stats.times
console.log(`${garbage ? 'GARBAGE' : 'LEGAL'} ${nomap ? 'nomap' : 'map'} fuzz: ${EP} episodes x ${LEN} = ${ts.length} decisions; throws ${stats.thrown}; stage errors ${JSON.stringify(stats.errors)}; raw problems ${JSON.stringify(stats.raw)}`)
console.log(`time: mean ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(3)} p99 ${pct(ts, 0.99).toFixed(2)} p999 ${pct(ts, 0.999).toFixed(2)} max ${Math.max(...ts).toFixed(1)} ms; >20ms: ${stats.slow.length}`)
for (const s of stats.slow.slice(0, 8)) console.log('  slow', s)
const seen = new Set()
for (const l of stats.logs.filter((l) => /failed|THROW|RAW/.test(l))) { const key = l.replace(/\[ep \d+\] /, '').replace(/tick \d+/, '').split('\n').slice(0, 2).join('|').replace(/ep \d+ k \d+.*/, ''); if (seen.has(key)) continue; seen.add(key); console.log(l.split('\n').slice(0, 4).join('\n').slice(0, 700)) }
