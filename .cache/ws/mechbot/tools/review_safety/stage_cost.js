// Cost of each expensive brain routine in isolation, at many spots of the real map, with 15 listed mechs
// (4 become threats). Each (spot, routine) is timed 3 times and the MINIMUM is kept, so stalls caused by other
// jobs on this machine drop out; the table shows the worst spot. One CPU, Bun.
import { join } from 'node:path'
import { P, realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mkZone, weapon, mulberry, pct } from './common.js'
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const tactics = await import(join(P, 'bot', 'lib', 'tactics.js'))
const stanceMod = await import(join(P, 'bot', 'lib', 'stance.js'))
const moverMod = await import(join(P, 'bot', 'lib', 'mover.js'))
const senses = await import(join(P, 'bot', 'lib', 'senses.js'))
const rnd = mulberry(5), b = world.bounds
const spots = []
while (spots.length < 250) { const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY); if (nav.passableAt(x, y)) spots.push([x, y]) }
// plus the bowl and wall-hugging cells
for (let c = 0, n = 0; c < nav.n && n < 30; c += 997) if (nav.comp[c] === 16) { spots.push([nav.cellX(c), nav.cellY(c)]); n++ }
const res = {}
const rec = (name, ms) => { (res[name] = res[name] || []).push(ms) }
const min3 = (fn, prep) => { let m = Infinity; for (let r = 0; r < 3; r++) { if (prep) prep(); const t0 = performance.now(); fn(); const dt = performance.now() - t0; if (dt < m) m = dt } return m }
for (let pass = 0; pass < 2; pass++) {
  for (const k in res) delete res[k]
  for (const [x, y] of spots) {
    const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
    const B = brain._B
    const z = nav.levelAt(x, y)
    const mechs = Array.from({ length: 15 }, (_, i) => { const a = i * 0.42, r = 40 + (i * 37) % 160; const q = nav.nearestPassable(x + r * Math.cos(a), y + r * Math.sin(a), 30) || { x: x + r * Math.cos(a), y: y + r * Math.sin(a) }; return mkMech(i < 3 ? i : i + 1, [q.x, q.y, nav.levelAt(q.x, q.y)], { aim: [Math.atan2(y - q.y, x - q.x), 0], weapons: ['gun', 'laser'] }) })
    const mk = (k, extra = {}) => mkObs(cfg, 2000 + k * 2, { self: mkSelf(cfg, { pos: [x, y, z], hp: 500, weapons: [weapon(cfg, 'gun'), weapon(cfg, 'laser')] }), mechs,
      projectiles: Array.from({ length: 10 }, (_, i) => ({ id: 400 + i, kind: 'mortar', pos: [x + 20 + i, y + i, z + 30], vel: [-20, 0, 5] })),
      events: mechs.slice(0, 4).map((m) => ({ type: 'damaged', amount: 45, weapon: 'gun', bearing: Math.atan2(m.pos[1] - y, m.pos[0] - x), by: m.id })),
      crates: Array.from({ length: 12 }, (_, i) => ({ id: 1000 + i, pos: [x + 25 * Math.cos(i), y + 25 * Math.sin(i), z], hp: 300 })), cubes: Array.from({ length: 12 }, (_, i) => ({ id: 5000 + i, pos: [x + 15 * Math.cos(i), y + 15 * Math.sin(i), z] })),
      zone: mkZone({ center: [x + 450, y + 100], radius: 300, next_center: [x + 450, y + 100], next_radius: 200, shrink_start: 90, shrink_end: 130 }), ...extra })
    // a few whole decisions to populate tracks / threats (also timed as "whole decision")
    for (let k = 0; k < 6; k++) { const o = mk(k); const t0 = performance.now(); brain.act(o, t0 + 27.5); if (k >= 2) rec('whole decision (as wired)', performance.now() - t0) }
    B.deadline = performance.now() + 1e6
    const hs = tactics.makeHideSearch(B), pe = tactics.makePosEval(B)
    const mover = moverMod.makeMover(B), st = stanceMod.makeStance(B, mover, hs, pe)
    rec('sense() (15 mechs, 10 shells, 24 loot objects)', min3(() => senses.sense(B, mk(7))))
    rec('assess + selectTarget', min3(() => { tactics.assess(B); tactics.selectTarget(B) }))
    rec('hide search: one slice (300 rays)', min3(() => hs.run(300), () => { hs.start() }))
    rec('hide search: whole lattice (no slicing)', min3(() => { for (let g = 0; g < 400 && B.hide.state === 'run'; g++) hs.run(300) }, () => { hs.start() }))
    rec('posEval retreat (73 cells)', min3(() => pe.evaluate('retreat'), () => { B.posGoal.ok = false }))
    rec('posEval fight (49 cells)', min3(() => pe.evaluate('fight'), () => { B.posGoal.ok = false }))
    B.target = B.target || B.trackList.find((t) => !t.npc) || null
    // bastion (LAST-STAND legs): 30 cells x 12 rays
    rec('bastion search (stance.fightLegs, LAST-STAND)', min3(() => { st.fightLegs() }, () => { B.lastStand = true; B.me.t += 3 }))
    B.lastStand = false
    rec('escape search (24 cells x hidden)', min3(() => { st.escapeLegs() }, () => { B.mode = 'DISENGAGE'; B.lastLosInT = B.me.t - 5; B.me.t += 7 }))
    rec('zone path (findPath 4000) to a goal 450 m away', min3(() => nav.findPath(x, y, x + 450 * 0.8, y + 100, { maxExpand: 4000 })))
    const tg = B.trackList[B.trackList.length - 1]
    rec('ambush path enemy -> us + rays', min3(() => { const r = nav.findPath(tg.x, tg.y, x, y, { maxExpand: 4000 }); if (r && r.pts) for (let k = 1; k < r.pts.length; k++) { const seg = Math.hypot(r.pts[k][0] - r.pts[k - 1][0], r.pts[k][1] - r.pts[k - 1][1]); const steps = Math.min(12, Math.max(1, Math.ceil(seg / 4))); for (let s = 1; s <= steps; s++) { const px = r.pts[k - 1][0] + (r.pts[k][0] - r.pts[k - 1][0]) * s / steps, py = r.pts[k - 1][1] + (r.pts[k][1] - r.pts[k - 1][1]) * s / steps; world.shotClear(x, y, z + 7, px, py, nav.levelAt(px, py) + 4.5) } } }))
  }
}
console.log('routine'.padEnd(52), 'mean    p99    worst spot (ms, min of 3 repeats)')
let sum = 0
for (const [k, a] of Object.entries(res)) { const mx = Math.max(...a); console.log(k.padEnd(52), (a.reduce((s, v) => s + v, 0) / a.length).toFixed(3).padStart(6), pct(a, 0.99).toFixed(2).padStart(6), mx.toFixed(2).padStart(7)); if (!/whole|lattice/.test(k)) sum += mx }
console.log(`sum of the worst spots of every routine that can run in one decision: ${sum.toFixed(1)} ms`)
