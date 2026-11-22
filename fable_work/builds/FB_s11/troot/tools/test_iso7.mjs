// R7a item 6 tests: ISO (isolate any / near; R5 3.1, GP I3). Real map, two hostile lines; the posEval goal of the isolate
// branch is replaced inside its 0.3 s cache window to place the best cell at 25 m / 8 m with or without exposure to the
// non-target threat. usage: bun test_iso7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FB_s11/troot'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
// open ground: us and two points at 80 m / 100 m with clear lines both ways
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const clearTo = (x, y, z) => world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5)
const pts = []
for (let k = 0; k < 72 && pts.length < 2; k++) {
  const r = pts.length === 0 ? 80 : 100, a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y)) continue
  const z = nav.levelAt(x, y)
  if (z - world.ground(x, y) < 1 && clearTo(x, y, z)) pts.push({ x, y, z, a })
}
const Wp = cfg.weapons
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const obs = (k, t) => ({ type: 'obs', tick: 2 * k, t, alive: 12, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [pts[0].a, 0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100, grounded: true,
  cubes: 0, upgrades: [], in_zone: true, weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech },
  mechs: pts.map((p, i) => ({ id: 30 + i, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [p.a + Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })),
  projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], drops: [], zone, offer: null,
  events: [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: pts[0].a, by: 30 }, { type: 'damaged', amount: 45, weapon: 'gun', bearing: pts[1].a, by: 31 }] })
check('setup: two hostile mechs at 80 m / 100 m with clear lines on open ground', pts.length === 2, pts.map((p) => `(${p.x.toFixed(0)}, ${p.y.toFixed(0)})`).join(' '))
function leg(sel, cellD, xOther, over) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, ...(over || {}), select: { ...KS, ...sel } }), B = b._B
  for (let k = 0; k < 6; k++) b.act(obs(k, 40 + k * 0.1), performance.now() + 1e6)
  // the next decision reuses B.posGoal (evalPeriod 0.3 s): put its cell at cellD metres, away from both threats
  const ax = me0.x - Math.cos(pts[0].a) * cellD, ay = me0.y - Math.sin(pts[0].a) * cellD
  const ok = B.posGoal.kind === 'fight'
  Object.assign(B.posGoal, { ok: true, kind: 'fight', x: ax, y: ay, xOther, t: B.me.t, t0: B.me.t })
  b.act(obs(6, 40.6), performance.now() + 1e6)
  return { leg: B.legKind, iso: B.A - (B.target ? B.target.a : 0) > 20 && B.nLos >= 2, evalOk: ok, iso0: B.counters.isoStand || 0 }
}
if (pts.length === 2) {
  const r = { any25: leg({ isolate: 'any' }, 25, 0), near25: leg({ isolate: 'near' }, 25, 0), near8: leg({ isolate: 'near' }, 8, 0), near8x: leg({ isolate: 'near' }, 8, 40), any8x: leg({ isolate: 'any' }, 8, 40) }
  check('ISO two lines (isolate branch active)', Object.values(r).every((v) => v.iso && v.evalOk), JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.iso]))))
  check('ISO best cell 25 m: any -> isolate, near -> standoff', r.any25.leg === 'isolate' && r.near25.leg === 'standoff', `any ${r.any25.leg}, near ${r.near25.leg}`)
  check('ISO cell 8 m with xOther 0 -> isolate; 8 m exposed to the other threat -> standoff (any: isolate)', r.near8.leg === 'isolate' && r.near8x.leg === 'standoff' && r.any8x.leg === 'isolate', `near 8 m ${r.near8.leg}, near 8 m exposed ${r.near8x.leg}, any 8 m exposed ${r.any8x.leg}`)
  const ff = leg({ isolate: 'near' }, 25, 0, { env: 'ffa' }), ffa = leg({ isolate: 'any' }, 25, 0, { env: 'ffa' })
  check('ISO firewall: FFA identical to any', ff.leg === ffa.leg, `near ${ff.leg}, any ${ffa.leg}`)
}
console.log(`\n${pass}/${pass + fail} ISO checks passed`)
process.exit(fail ? 1 : 0)
