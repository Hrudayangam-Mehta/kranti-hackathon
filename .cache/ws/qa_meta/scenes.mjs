// independent QA scenes: bun scenes.mjs <bot dir (with lib/)>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const KP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const DIR = process.argv[2]
const lines = gunzipSync(readFileSync(KP + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello0 = lines[0], OBS = lines.filter((l) => l.type === 'obs')
const { World } = await import(DIR + '/lib/world.js'), { Nav } = await import(DIR + '/lib/nav.js'), { createBrain } = await import(DIR + '/lib/brain.js')
const { META_ORDERS, META_K } = await import(DIR + '/lib/meta.js')
const world = World.loadSync(KP + '/kit/arena')
let pass = 0, fail = 0
const ok = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`) }
const clone = (o) => JSON.parse(JSON.stringify(o))
const mk = (table, slot = 3, extra = {}) => { const h = clone(hello0); h.slot = slot; return createBrain(h, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { saltTable: table, fuseMs: 1e9, ...extra }) }
const run = (b, n, f) => { let a; for (let i = 0; i < n; i++) { const o = clone(OBS[i]); if (f) f(o, i); a = b.act(o, performance.now() + 1e6) } return a }

// --- slot parsing
{
  const cases = [['1211111111111111', 3, false], ['121m111111111111', 3, true], ['121M111111111111', 3, false], ['m211111111111111', 3, false], ['mmmmmmmmmmmmmmm', 3, false], ['mmmmmmmmmmmmmmmmm', 3, false], ['', 3, false],
    ['mmmmmmmm11111111', 7, true], ['mmmmmmmm11111111', 8, false], ['12111111mmmmmmmm', 7, false], ['12111111mmmmmmmm', 8, true], ['12111111mmmmmmmm', 15, true], ['mmmmmmmmmmmmmmmm', 16, false], ['mmmmmmmmmmmmmmmm', -1, false]]
  let bad = []
  for (const [tb, sl, want] of cases) { const b = mk(tb, sl); if ((!!b._B.meta) !== want) bad.push(tb + '@' + sl) }
  ok('slot parsing: meta object only for a lower-case m at our slot in a 16-char table', bad.length === 0, bad.join(' '))
  const h = clone(hello0); delete h.slot
  const b = createBrain(h, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { saltTable: 'mmmmmmmmmmmmmmmm', fuseMs: 1e9 })
  ok('slot parsing: hello without a slot -> no meta', b._B.meta === null)
}
// --- order tables against my own reading of META_SPEC section 2
{
  const BASE = 'plating armor nanites laser_damage gun_damage gun_mag laser_charge lightning_efficiency servos gun_rate lightning_chain lightning_range capacitor reactor gyros jets mortar_reload mortar_splash mortar_velocity gun_velocity sensors laser_pierce'.split(' ')
  const before = (o, a, b) => o.indexOf(a) < o.indexOf(b)
  let bad = []
  for (let bits = 0; bits < 16; bits++) {
    const o = META_ORDERS[bits], SQ = bits & 1, LZ0 = bits & 2, LZ1 = bits & 4, GN0 = bits & 8
    const errs = []
    if (o[0] !== 'plating') errs.push('plating not first')
    if (o.length !== 22 || BASE.some((x) => !o.includes(x))) errs.push('ids')
    if (LZ0 ? !(o[1] === 'laser_damage' && o[2] === 'armor') : o[1] !== 'armor') errs.push('armor/lens')
    if (SQ && !(before(o, 'laser_damage', 'nanites') && before(o, 'gun_damage', 'nanites'))) errs.push('SQ')
    if (!SQ && !LZ0 && !LZ1 && !GN0 && o[2] !== 'nanites') errs.push('nanites third')
    if (!SQ && !GN0 && !before(o, 'nanites', 'gun_damage')) errs.push('lowhp nanites before gun_damage')
    if (LZ1 && !before(o, 'laser_damage', 'nanites')) errs.push('LZ1')
    if (GN0 && !(before(o, 'gun_damage', 'nanites') && before(o, 'gun_mag', 'nanites'))) errs.push('GN0')
    for (const late of ['gun_rate', 'laser_pierce', 'mortar_reload', 'mortar_splash', 'mortar_velocity', 'sensors']) if (o.indexOf(late) < 6) errs.push('early ' + late)
    // relative order of everything else is the base order
    const rest = o.filter((x) => !['nanites', 'laser_damage', 'gun_damage', 'gun_mag'].includes(x)), restB = BASE.filter((x) => !['nanites', 'laser_damage', 'gun_damage', 'gun_mag'].includes(x))
    if (rest.join() !== restB.join()) errs.push('rest order')
    if (errs.length) bad.push(bits + ':' + errs.join('/'))
  }
  ok('orders: 16 tables agree with META_SPEC section 2', bad.length === 0, bad.join(' '))
  console.log('      SQUAD default order head: ' + META_ORDERS[1].slice(0, 7).join(' '))
}
// --- update(): state -> bits, firewall, levels
{
  const b = mk('121m111111111111'); run(b, 21, (o) => { o.mechs = [] })
  const B = b._B, M = B.meta, me = B.me
  const o = clone(OBS[21]); o.mechs = []
  const st = (f) => { B.env = 'SQUAD'; B.foreignDeaths = 0; B.aliveN = 16; B.nLos = 0; B.counters.kills = 0; me.hpf = 1; me.cubes = 0; me.t = 20; me.laser = null; const oo = clone(o); oo.self.upgrades = []; f && f(oo); M.update(oo); return M }
  ok('update: on in SQUAD with the firewall', st().on === true)
  ok('update: off in FFA', (st(() => { B.env = 'FFA' }), M.on === false))
  B.env = 'SQUAD'
  ok('update: off after a foreign death', (st(() => { B.foreignDeaths = 1 }), M.on === false))
  ok('update: off at <= 3 alive', (st(() => { B.aliveN = 3 }), M.on === false))
  ok('update: bits no laser, 0 kills, t 20 = SQ+GN0 (9)', st().bits === 9, 'bits ' + M.bits)
  ok('update: bits no laser, t 50 = SQ (1)', st(() => { me.t = 50 }).bits === 1, 'bits ' + M.bits)
  ok('update: bits no laser, 1 kill = SQ (1)', st(() => { B.counters.kills = 1 }).bits === 1)
  const LZ = { charge: 0, full: 1 }
  ok('update: bits laser, 0 lens, 0 kills, t 20 = SQ+LZ0 (3)', st(() => { me.laser = LZ }).bits === 3, 'bits ' + M.bits)
  ok('update: bits laser, 1 lens (object form), 3 cubes = SQ+LZ1 (5)', st((oo) => { me.laser = LZ; me.cubes = 3; oo.self.upgrades = [{ id: 'laser_damage' }] }).bits === 5, 'bits ' + M.bits)
  ok('update: bits laser, 1 lens, 2 cubes = SQ (1)', st((oo) => { me.laser = LZ; me.cubes = 2; oo.self.upgrades = ['laser_damage'] }).bits === 1, 'bits ' + M.bits)
  ok('update: hp 30% with zero lines drops SQ (nanites third)', st(() => { me.hpf = 0.3; me.t = 60 }).bits === 0, 'bits ' + M.bits)
  ok('update: hp 30% with one line keeps SQ', st(() => { me.hpf = 0.3; me.t = 60; B.nLos = 1 }).bits === 1, 'bits ' + M.bits)
  ok('update: plating stacks counted (3)', st((oo) => { oo.self.upgrades = ['plating', 'plating', { id: 'plating' }, 'armor'] }).plating === 3)
  ok('update: set c writes reloadAt 8, gunFinish, wantMortar false, lightR 35', st() && M.reloadAt === 8 && M.gunFinish === true && M.wantMortar === false && M.lightR === 35)
  ok('update: laserSeek -1 at 2 kills, 4 at 3 kills', st(() => { B.counters.kills = 2 }).laserSeek === -1 && st(() => { B.counters.kills = 3 }).laserSeek === 4)
  // cube reach matrix
  st()
  const cube = { x: me.x + 40, y: me.y, z: me.z, id: 77 }
  const R = (lines, cubes, contact, baseR, kc = false, kro = true, losing = false) => { B.nLos = lines; me.cubes = cubes; B.losing = losing; return M.cubeReach(cube, kc, kro, contact, baseR) }
  const thr = [0, 2, 5, 9].map((c) => R(0, c, true, 70) + '/' + R(1, c, true, 70) + '/' + R(2, c, true, 70) + '/' + R(3, c, true, 70))
  ok('cube: threshold cubes (count becomes 1,3,6,10) 100 m at <=1 line, 30 m at 2+', thr.every((s) => s === '100/100/30/30'), thr.join(' '))
  const oth = [1, 3, 4, 7, 8].map((c) => R(0, c, true, 70) + '/' + R(1, c, true, 70) + '/' + R(2, c, true, 70))
  ok('cube: other cubes in contact 52 / 52 / 30', oth.every((s) => s === '52/52/30'), oth.join(' '))
  ok('cube: LOSING keeps today\'s 12 m', R(1, 3, true, 12, false, true, true) === 12 && R(1, 2, true, 12, false, true, true) === 12)
  ok('cube: at 10..12 refused, 13 and 14 taken, 15 refused', [10, 11, 12].every((c) => R(0, c, false, 60) === 0) && R(0, 13, false, 60) > 0 && R(0, 14, false, 60) > 0 && R(0, 15, false, 60) === 0)
  const low = R(1, 3, true, 40), lowT = R(1, 2, true, 40)
  console.log(`INFO  cube at hp <= 50% (today's reach 40 m, grabCubeLo): meta gives other cube ${low} m, threshold cube ${lowT} m at one line`)
  B.killDrops.push({ x: cube.x, y: cube.y, t: me.t })
  const pl = [0, 1, 2, 3, 4].map((l) => R(l, 3, true, 200, true))
  ok('pile n=2: 115/115/58/25/25 for 0..4 lines', pl.join() === '115,115,58,25,25', pl.join())
  for (let k = 0; k < 3; k++) B.cubes.set(900 + k, { x: cube.x + k, y: cube.y, z: cube.z, id: 900 + k, seen: me.t })
  const pl3 = [1, 2, 3].map((l) => R(l, 3, true, 200, true))
  ok('pile n=3: 115 / 87 / 25', pl3.join() === '115,87,25', pl3.join())
  const lowP = R(1, 3, true, 40, true, true)
  console.log(`INFO  kill pile at hp <= 50% (today's reach 40 m): meta gives ${lowP} m at one line`)
  for (let k = 0; k < 3; k++) B.cubes.delete(900 + k)
}
// --- end to end: offer answered on an m slot vs a 1 slot; FFA; not-held penalty
{
  const sc = (table, offer, f, extra) => { const b = mk(table, 3, extra); const a = run(b, 31, (o, i) => { o.mechs = []; o.events = []; f && f(o, b._B); if (i === 30) o.offer = { id: 5, expires: o.t + 5, choices: offer.map((id) => ({ id })) } }); return offer[a.pick] }
  const M_ = '121m111111111111', B_ = '1211111111111111'
  ok('e2e: laser_damage not picked without a laser (penalty kept): armor', sc(M_, ['laser_damage', 'lightning_chain', 'armor']) === 'armor')
  ok('e2e: lens penalty 60 still under mortar 80 / unknown 100', sc(M_, ['laser_damage', 'mortar_reload', 'bogus']) === sc(B_, ['laser_damage', 'mortar_reload', 'bogus']))
  ok('e2e: m slot gun_damage over nanites, 1 slot nanites', sc(M_, ['nanites', 'gun_damage', 'servos']) === 'gun_damage' && sc(B_, ['nanites', 'gun_damage', 'servos']) === 'nanites')
  ok('e2e: forced FFA m slot = 1 slot (nanites)', sc(M_, ['nanites', 'gun_damage', 'servos'], null, { env: 'ffa' }) === 'nanites')
  ok('e2e: 2 plating stacks: plating over armor and gun_damage', sc(M_, ['armor', 'gun_damage', 'plating'], (o) => { o.self.upgrades = ['plating', 'plating'] }) === 'plating')
  ok('e2e: after a foreign death the m slot answers like the 1 slot', sc(M_, ['nanites', 'gun_damage', 'servos'], (o, B) => { B.foreignDeaths = 1 }) === 'nanites')
}
console.log(`\n${pass} passed, ${fail} failed`)
