// Combat-shaped fuzz: persistent enemies that become visible / hidden for seconds at a time, attack in bursts
// (also while not listed -> remembered or phantom tracks), drones that plink from outside the view, our own
// hits and kills, hp sliding, weapons swapping. All observations are schema-legal. Counts internal stage errors.
//   taskset -c 0 bun fuzz_combat.js [--episodes 400] [--seed 1] [--nomap]
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mkNpc, mkZone, weapon, rawProblems, mulberry } from './common.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const EP = Number(arg('--episodes', '400')), LEN = Number(arg('--len', '250')), nomap = args.includes('--nomap')
const rnd = mulberry(Number(arg('--seed', '1')))
const ri = (n) => Math.floor(rnd() * n), pick = (a) => a[ri(a.length)], ch = (p) => rnd() < p
const b = world.bounds
const stand = () => { for (;;) { const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY); if (nav.passableAt(x, y)) return [x, y] } }
const WK = ['laser', 'lightning', 'mortar']
const tot = { errors: {}, raw: {}, thrown: 0, n: 0, logs: [], firstScene: {} }
for (let ep = 0; ep < EP; ep++) {
  const logs = []
  const brain = createBrain(hello, { world: nomap ? null : world, nav: nomap ? null : nav, log: (...a) => logs.push(a.join(' ')) }, { warmup: false })
  if (!nomap) nav.setBody(cfg.mech.radius, cfg.mech.height)
  let [sx, sy] = stand()
  const ne = 1 + ri(5)
  const en = Array.from({ length: ne }, (_, i) => { const a = rnd() * 6.283, r = 25 + rnd() * 180; const q = nav.nearestPassable(sx + r * Math.cos(a), sy + r * Math.sin(a), 30) || { x: sx + r, y: sy }; return { id: i < 3 ? i : i + 1, x: q.x, y: q.y, hp: pick([1400, 1400, 900, 400, 120, 40]), vis: ch(0.7), atk: ch(0.5), w: ch(0.5) ? ['gun'] : ['gun', pick(WK)], dead: false, cd: 0 } })
  const drones = Array.from({ length: ch(0.5) ? 1 + ri(2) : 0 }, (_, i) => ({ id: 100 + i, x: sx + 60 * Math.cos(i * 3), y: sy + 60 * Math.sin(i * 3), vis: ch(0.3), atk: ch(0.7), cd: 0, hp: 350 }))
  let hp = pick([1400, 1400, 1000, 600, 300]), load = [weapon(cfg, 'gun'), ch(0.5) ? weapon(cfg, pick(WK)) : null], last = null, cubes = 0
  let prevErr = 0
  for (let k = 0; k < LEN; k++) {
    const t = 30 + k * 0.1
    if (last && Number.isFinite(last.move[0])) { const nx = sx + last.move[0] * 1.17, ny = sy + last.move[1] * 1.17; if (nomap || (nav.passableAt(nx, ny) && nav.walkLine(sx, sy, nx, ny))) { sx = nx; sy = ny } }
    const sz = nomap ? 0 : nav.levelAt(sx, sy)
    const events = [], mechs = []
    for (const e of en) {
      if (e.dead) continue
      if (ch(0.04)) e.vis = !e.vis
      if (ch(0.05)) e.atk = !e.atk
      e.x += (rnd() - 0.5) * 2; e.y += (rnd() - 0.5) * 2
      e.cd -= 0.1
      if (e.atk && e.cd <= 0) { e.cd = pick([0.24, 0.24, 0.5, 1.0, 1.65]); const w = pick(e.w); const amt = { gun: 45, laser: 315, lightning: 60, mortar: 160 }[w]; hp -= amt; events.push({ type: 'damaged', amount: amt, weapon: w, bearing: +Math.atan2(e.y - sy, e.x - sx).toFixed(3), by: e.id, ...(ch(0.2) ? { rear: true } : {}) }) }
      if (e.vis && last && last.fire && (last.fire[0] || last.fire[1]) && ch(0.5)) { e.hp -= 45; events.push({ type: 'hit', target: e.id, amount: 45, weapon: 'gun' }); if (e.hp <= 0) { e.dead = true; events.push({ type: 'kill', target: e.id }); continue } }
      if (e.vis) mechs.push(mkMech(e.id, [+e.x.toFixed(2), +e.y.toFixed(2), nomap ? 0 : +nav.levelAt(e.x, e.y).toFixed(2)], { vel: [+(rnd() * 20 - 10).toFixed(1), +(rnd() * 20 - 10).toFixed(1), 0], aim: [+(ch(0.6) ? Math.atan2(sy - e.y, sx - e.x) : rnd() * 6.28 - 3.14).toFixed(3), 0], hp: Math.max(1, e.hp), weapons: e.w, charging: e.w.includes('laser') && ch(0.2), cubes: ri(4) }))
    }
    for (const d of drones) {
      if (ch(0.03)) d.vis = !d.vis
      d.cd -= 0.1
      if (d.atk && d.cd <= 0) { d.cd = 1; hp -= 25; events.push({ type: 'damaged', amount: 25, weapon: 'npc', bearing: +Math.atan2(d.y - sy, d.x - sx).toFixed(3), by: d.id }) }
      if (d.vis) mechs.push(mkNpc(d.id, [d.x, d.y, nomap ? 0 : nav.levelAt(d.x, d.y)], { hp: d.hp }))
    }
    if (ch(0.02)) events.push({ type: 'damaged', amount: 2, weapon: 'zone', bearing: null, by: null })
    if (hp < 80) hp = pick([1400, 900, 500])          // healed / new life for the next part of the episode
    if (ch(0.01)) { cubes++; events.push({ type: 'pickup', cubes }) }
    if (ch(0.01)) load[1] = ch(0.3) ? null : weapon(cfg, pick(WK))
    for (const w of load) if (w) { if (w.kind === 'gun') { if (last && last.fire && last.fire[0] && w.ammo > 0) w.ammo--; if (w.ammo === 0 && w.reload <= 0) w.reload = 2.4; if (w.reload > 0) { w.reload = +(w.reload - 0.1).toFixed(2); if (w.reload <= 0) { w.reload = 0; w.ammo = 12 } } } if (w.kind === 'laser') { const s = load.indexOf(w); w.charge = last && last.fire && last.fire[s] ? +Math.min(0.75, w.charge + 0.1).toFixed(2) : 0 } }
    const obs = mkObs(cfg, 600 + k * 2, { t, alive: 16 - en.filter((e) => e.dead).length, self: mkSelf(cfg, { pos: [+sx.toFixed(2), +sy.toFixed(2), sz], hp: Math.max(1, hp), cubes, weapons: JSON.parse(JSON.stringify(load)), aim: last && last.aim ? last.aim : [0, 0] }), mechs, events,
      zone: mkZone({ center: [sx, sy], radius: 400, next_center: [sx + 50, sy], next_radius: 300, shrink_start: 200, shrink_end: 240 }) })
    let a = null
    try { a = brain.act(obs, performance.now() + 27.5) } catch (e) { tot.thrown++; tot.logs.push('THROW ' + (e && e.stack || e)) }
    tot.n++
    for (const p of rawProblems(a)) { const kk = p.replace(/=.*/, ''); tot.raw[kk] = (tot.raw[kk] || 0) + 1 }
    last = a
  }
  const st = brain.debugState()
  for (const [s, v] of Object.entries(st.errors)) { tot.errors[s] = (tot.errors[s] || 0) + v; tot.eps = tot.eps || {}; tot.eps[s] = (tot.eps[s] || 0) + 1 }
  for (const l of logs.filter((l) => /failed/.test(l))) tot.logs.push(l)
}
console.log(`combat fuzz ${nomap ? '(no map) ' : ''}${EP} episodes x ${LEN} = ${tot.n} decisions: throws ${tot.thrown}; stage errors ${JSON.stringify(tot.errors)} (episodes affected ${JSON.stringify(tot.eps || {})}); raw problems ${JSON.stringify(tot.raw)}`)
const seen = new Set()
for (const l of tot.logs) { const key = l.replace(/tick \d+/, '').split('\n').slice(0, 2).join('|'); if (seen.has(key)) continue; seen.add(key); console.log(l.split('\n').slice(0, 3).join('\n   ').slice(0, 600)) }
