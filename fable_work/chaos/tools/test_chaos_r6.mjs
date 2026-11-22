// Fable chaos unit tests (R1 R2 R4 R5 R8, R6, R7): trigger of each preset in the SQUAD posture, T-F2 (forced FFA identical
// to the old value) and one foreign death identical. usage: bun test_chaos.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos'
const BOT = process.argv[2] || join(W, 'tree')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { PRESETS, SELECT, resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const FNV = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on', aggr: 'any70f', loseCover: 'never', fb: 'on' }
const Wp = cfg.weapons, HP = cfg.mech.hp
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const lineBoth = (a, b) => world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) && world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5)
const lineAny = (a, b) => world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) || world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 8) || world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5) || world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 8.1)
function ring(r0, r1, pred, from = me0, max = 1) {
  const out = []
  for (let r = r0; r <= r1 && out.length < max; r += 5) for (let k = 0; k < 72 && out.length < max; k++) {
    const a = k * Math.PI / 36, x = from.x + r * Math.cos(a), y = from.y + r * Math.sin(a)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
    const p = { x, y, z: nav.levelAt(x, y), a }
    if (p.z - world.ground(x, y) < 1 && pred(p)) out.push(p)
  }
  return out
}
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const obsB = (k, t, o = {}) => ({ type: 'obs', tick: 2 * k, t, alive: o.alive || 16, self: { id: 3, pos: o.pos || [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: HP * (o.hpf || 1), max_hp: HP, energy: 100, max_energy: 100, grounded: true,
  cubes: 0, upgrades: [], in_zone: true, weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, o.laser ? { kind: 'laser', cooldown: 0, charge: 0, stats: Wp.laser } : null], stats: cfg.mech }, mechs: o.mechs || [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [],
  events: o.events || [], drops: o.drops || [], zone, offer: o.offer || null })
const mech = (id, p, o = {}) => ({ id, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [o.aim === undefined ? Math.atan2(me0.y - p.y, me0.x - p.x) : o.aim, 0], hp: HP * (o.hpf || 1), max_hp: HP, cubes: 0, weapons: ['gun'], charging: false })
const hit = (id, p, amount = 45) => ({ type: 'damaged', amount, weapon: 'gun', bearing: Math.atan2(p.y - me0.y, p.x - me0.x), by: id })
/** Run a scripted scene; returns the action / mode / leg trace, the brain and its counters. opts.fd = foreign deaths set from the start. */
function run(sel, mk, o = {}) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(o.env ? { env: o.env } : {}), ...(o.ov || {}), select: { ...FNV, ...sel } }), B = b._B
  const tr = [], n = o.n || 14
  // a blank first observation fixes the alive base; o.fd foreign deaths = the scene's alive count is that much lower
  for (let j = 0; j < 2; j++) { const o0 = obsB(0, (o.t0 || 60) - 0.2 + j * 0.1, {}); o0.alive = mk(0, 60).alive - (j ? (o.fd || 0) : 0); o0.tick = -4 + 2 * j; b.act(o0, performance.now() + 1e6) }
  for (let k = 0; k < n; k++) {
    if (o.pre) o.pre(B, k)
    const ob = mk(k, (o.t0 || 60) + k * 0.1); if (o.fd) ob.alive -= o.fd
    if (o.dbg) o.dbg(B, k)
    const a = b.act(ob, performance.now() + 1e6)
    tr.push(JSON.stringify(a) + B.mode + '/' + B.legKind + '/' + (B.target ? B.target.id : '-'))
  }
  return { s: tr.join('|'), last: tr[tr.length - 1], tr, B, c: B.counters }
}
/** on acts (trace differs from off), forced FFA and one foreign death are identical to off. */
function tf2(name, key, val, mk, o = {}, detail = () => '') {
  const off = o.off || Object.keys(PRESETS[key])[0]
  const on = run({ [key]: val }, mk, o), of = run({ [key]: off }, mk, o)
  const fOn = run({ [key]: val }, mk, { ...o, env: 'ffa' }), fOf = run({ [key]: off }, mk, { ...o, env: 'ffa' })
  const dOn = run({ [key]: val }, mk, { ...o, fd: 1 }), dOf = run({ [key]: off }, mk, { ...o, fd: 1 })
  const ok = on.s !== of.s && fOn.s === fOf.s && (o.noFw || dOn.s === dOf.s)
  check(`${name}: ${key} '${val}' acts in SQUAD; forced FFA identical to '${off}'` + (o.noFw ? '' : '; one foreign death identical'), ok, `SQUAD differs ${on.s !== of.s}, FFA identical ${fOn.s === fOf.s}, firewall identical ${dOn.s === dOf.s} | ${detail(on, of)}`)
  return { on, of }
}
const same = (name, key, val, mk, o, detail = '') => { const off = Object.keys(PRESETS[key])[0]; const a = run({ [key]: val }, mk, o), b = run({ [key]: off }, mk, o); check(name, a.s === b.s, `identical to '${off}' ${a.s === b.s} ${detail} last ${a.last.slice(-22)}`); return a }

// ---------------------------------------------------------------- presets resolve; old values first
{
  const P0 = resolveParams({})
  check('defaults: every new preset at its old value', P0.selected.fuse === 'wall' && P0.dropLife === false && P0.utilTgt === false && P0.utilWait === false && P0.pauseMove === false && P0.isoDwell === false && P0.upgFix === false && P0.fuseWork === false,
    `SELECT ${['fuse', 'dropLife', 'util', 'pauseMove', 'isoDwell', 'upgFix'].map((k) => k + ':' + SELECT[k]).join(' ')}`)
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, select: FNV })
  check('util off: B.util undefined, B.upgOrder null, B.dl null', b._B.util === undefined && b._B.upgOrder === null && b._B.dl === null, 'ok')
}
// ---------------------------------------------------------------- dropLife
const tgtP = ring(95, 120, (p) => lineBoth(me0, p))[0]
const dropNear = ring(20, 30, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y))[0]
const dropFar = ring(140, 170, (p) => true)[0]
const drop = (p, lands, o = {}) => ({ id: 900, pos: [p.x, p.y, p.z], radius: cfg.drops.radius, lands_in: lands, capture_s: cfg.drops.capture_s, progress: o.progress || 0, holder: o.holder === undefined ? null : o.holder })
const obsC = (k, t, o = {}) => {
  const ob = obsB(k, t, o)
  if (o.charge !== undefined) ob.self.weapons[1] = { kind: 'laser', cooldown: 0, charge: o.charge, stats: Wp.laser }
  if (o.aim) ob.self.aim = o.aim
  if (o.pickups) ob.pickups = o.pickups
  if (o.crates) ob.crates = o.crates
  if (o.cubes) ob.cubes = o.cubes
  if (o.ammo !== undefined) ob.self.weapons[0].ammo = o.ammo
  if (o.upgrades) ob.self.upgrades = o.upgrades
  if (o.energy !== undefined) ob.self.energy = o.energy
  return ob
}
const P0 = resolveParams({ select: FNV })
check('defaults: chaos keys at their old values', SELECT.cubes === 'off' && SELECT.boostCharge === 'off' && SELECT.cratePath === 'std' && SELECT.alpha === 'off' &&
  P0.focusKill === false && P0.lgSpawn === false && P0.cubeSnow === false && P0.sqLaserMid === false && P0.boostCharge === false && P0.sqFarmHp === 0 && P0.sqCratePath === 0 && P0.upgradeOrderSq === null && P0.alpha === false && P0.strafeFarR === 0,
  'SELECT ' + ['cubes', 'boostCharge', 'cratePath', 'alpha', 'healDoc'].map((k) => k + ':' + SELECT[k]).join(' ') + ' last key ' + Object.keys(SELECT).slice(-1)[0])
const pA = ring(55, 65, (p) => lineBoth(me0, p))[0]
const pB = ring(105, 115, (p) => lineBoth(me0, p) && (!pA || Math.hypot(p.x - pA.x, p.y - pA.y) > 40))[0]
const p140 = ring(138, 145, (p) => lineBoth(me0, p))[0]
const p100 = ring(95, 100, (p) => lineBoth(me0, p))[0]
const tid = (r) => r.last.split('/').slice(-1)[0]
const sel1 = (key, val) => ({ [key]: val })
const hidden = ring(100, 125, (p) => !lineAny(me0, p))[0]
const p110 = ring(105, 115, (p) => lineBoth(me0, p))[0], p150 = ring(148, 160, (p) => lineBoth(me0, p))[0]
if (hidden) {
  const hs = (k, t) => obsC(k, t, { ammo: 6, mechs: [mech(10, hidden)], events: k === 0 ? [hit(10, hidden)] : [] })
  const r = tf2('AL1 ammo 6, target without a line for > 0.4 s', 'alpha', 'on', hs, { n: 12, t0: 100 }, (on, of) => `reloads alpha ${on.tr.filter((s) => s.includes('"reload":true')).length} off ${of.tr.filter((s) => s.includes('"reload":true')).length}`)
} else check('AL1 geometry', false, 'no hidden point')
if (p110 && p150) {
  const op = (ammo, p) => (k, t) => obsC(k, t, { ammo, mechs: [mech(10, p, { aim: Math.atan2(me0.y - p.y, me0.x - p.x) + 2.5 })] })
  const r = tf2('AL2 calm mech at 110 m, ammo 8: no opening', 'alpha', 'on', op(8, p110), { n: 6, t0: 100 }, (on, of) => `target alpha ${tid(on)} off ${tid(of)} noOpen ${on.c.alNoOpen || 0}`)
  const a = run(sel1('alpha', 'on'), op(12, p110), { n: 6, t0: 100 }), b = run(sel1('alpha', 'off'), op(12, p110), { n: 6, t0: 100 })
  check('AL2b full magazine at 110 m: opens like off', tid(a) === '10' && tid(b) === '10', `alpha ${tid(a)} off ${tid(b)}`)
  const c = run(sel1('alpha', 'on'), op(12, p150), { n: 6, t0: 100 }), d = run(sel1('alpha', 'off'), op(12, p150), { n: 6, t0: 100 })
  check('AL2c full magazine at 150 m: no opening (> 130 m)', tid(c) === '-' && tid(d) === '10', `alpha ${tid(c)} off ${tid(d)}`)
  // facing away preferred: two calm mechs at 110 / 150? use one facing us at 110 m and one facing away at 120 m
  const p120 = ring(118, 126, (p) => lineBoth(me0, p) && Math.hypot(p.x - p110.x, p.y - p110.y) > 30)[0]
  if (p120) {
    const two = (k, t) => obsC(k, t, { mechs: [mech(10, p110), mech(11, p120, { aim: Math.atan2(p120.y - me0.y, p120.x - me0.x) })] })
    const x = run(sel1('alpha', 'on'), two, { n: 6, t0: 100 }), y = run(sel1('alpha', 'off'), two, { n: 6, t0: 100 })
    check('AL2d info: facing-away opener preferred', true, `alpha ${tid(x)} off ${tid(y)}`)
  }
  const fz = (k, t) => obsC(k, t, { mechs: [mech(10, p110)], events: k % 4 === 0 ? [hit(10, p110)] : [] })
  const s = tf2('ST1 fight at 110 m', 'strafe', 'fast75', fz, { n: 40, off: 'd4' }, (on, of) => `strafeFar ${on.c.strafeFar || 0} jinks ${on.c.jinks} / ${of.c.jinks}`)
}
console.log(`\n${pass} passed, ${fail} failed`)
