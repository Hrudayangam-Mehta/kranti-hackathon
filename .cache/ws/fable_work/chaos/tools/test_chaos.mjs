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
// ---------------------------------------------------------------- chaos scenes
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
if (pA && pB && p140 && p100) {
  // R1 focus 'kill': cost picks the 30% mech at 110 m over a fresh one at 60 m
  const two = (k, t) => obsC(k, t, { mechs: [mech(10, pA), mech(11, pB, { hpf: 0.3 })], events: k % 5 === 0 ? [hit(10, pA)] : [] })
  const r1 = tf2('FK1 target cost (60 m fresh / 110 m at 30%)', 'focus', 'kill', two, { n: 8 }, (on, of) => `target kill ${tid(on)} mult ${tid(of)}`)
  check('FK1b kill picks the 30% mech', tid(r1.on) === '11' && tid(r1.of) === '10', `kill ${tid(r1.on)} mult ${tid(r1.of)}`)
  // R1 walk-in: a 30% target at 60 m, our hp 100%, one line: hold 20 m, no boost
  const weak = (k, t) => obsC(k, t, { mechs: [mech(10, pA, { hpf: 0.3 })], events: k % 4 === 0 ? [hit(10, pA)] : [] })
  const r2 = tf2('FK2 finish walk-in (30% target, 1 line)', 'focus', 'kill', weak, { n: 10 }, (on, of) => `rPrefNow kill ${on.B.rPrefNow} mult ${of.B.rPrefNow}, fkWalk ${on.c.fkWalk}, boosts kill ${on.tr.filter((s) => s.includes('"boost":true')).length}`)
  check('FK2b walk-in holds 20 m and never boosts', r2.on.B.rPrefNow === 20 && (r2.on.c.fkWalk || 0) > 0 && r2.on.tr.every((s) => !s.includes('"boost":true')), `rPrefNow ${r2.on.B.rPrefNow} fkWalk ${r2.on.c.fkWalk}`)
  const strong = (k, t) => obsC(k, t, { hpf: 0.4, mechs: [mech(10, pA, { hpf: 0.3 })], events: k % 4 === 0 ? [hit(10, pA)] : [] })
  const r2c = run(sel1('focus', 'kill'), strong, { n: 8 })
  check('FK2c no walk-in at our hp 40%', !(r2c.c.fkWalk > 0), `fkWalk ${r2c.c.fkWalk || 0}`)
  // R1 lethal partial release: charge 0.4 of full on a target whose hp is 0.85 x the partial estimate (no rear: it faces us)
  const lz = Wp.laser, full = lz.charge_s || lz.full_charge_s || lz.charge || 0.75, mf = lz.min_frac !== undefined ? lz.min_frac : 0.35
  const est = (mf + (1 - mf) * 0.4) * lz.damage
  const yaw0 = Math.atan2(p100.y - me0.y, p100.x - me0.x)
  const relScene = (frac) => (k, t) => obsC(k, t, { laser: true, charge: 0.4 * full, aim: [yaw0, Math.atan2((p100.z + 4.5) - (me0.z + 7), 100)], mechs: [{ ...mech(10, p100), hp: frac * est }] })
  const r3 = tf2('FK3 partial charge, hp 0.85 x estimate', 'focus', 'kill', relScene(0.85), { n: 2 }, (on, of) => `laser held kill ${on.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)).fire[1]).join(',')} mult ${of.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)).fire[1]).join(',')}`)
  const fire1 = (r) => r.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)).fire[1]).join(',')
  const r3b = run(sel1('focus', 'kill'), relScene(0.6), { n: 2 }), r3c = run(sel1('focus', 'mult'), relScene(0.6), { n: 2 })
  check('FK3b hp 0.6 x estimate: both release', fire1(r3b) === fire1(r3c) && fire1(r3b).startsWith('false'), `kill ${fire1(r3b)} mult ${fire1(r3c)} est ${est.toFixed(0)} full ${full}`)
  // R1 blink hold: a charging laser whose phantom target drops out of the picture for 0.5 s keeps the trigger
  // (scene: the target is listed for 3 decisions, then unlisted and no longer in the sensor list)
  const blink = (k, t) => obsC(k, t, { laser: true, charge: k >= 3 ? 0.3 * full : 0, mechs: k < 3 ? [mech(10, p140, { hpf: 0.9 })] : [], events: k < 3 ? [hit(10, p140)] : [] })
  const r4 = run(sel1('focus', 'kill'), blink, { n: 8 }), r4o = run(sel1('focus', 'mult'), blink, { n: 8 })
  check('FK4 blink: info only', true, `fkBlink ${r4.c.fkBlink || 0}, trace differs ${r4.s !== r4o.s}`)

  // R5 laserRange 'midsq': laser held, target at 140 m -> hold 115 m (mid) instead of 150 m
  const lzT = (k, t) => obsC(k, t, { laser: true, mechs: [mech(10, p140)], events: k % 4 === 0 ? [hit(10, p140)] : [] })
  const r5 = tf2('LR1 laser band at 140 m', 'laserRange', 'midsq', lzT, { n: 8 }, (on, of) => `rPrefNow midsq ${on.B.rPrefNow} far ${of.B.rPrefNow}`)
  check('LR1b midsq holds 115 m', r5.on.B.rPrefNow === 115 && r5.of.B.rPrefNow === 150, `${r5.on.B.rPrefNow} / ${r5.of.B.rPrefNow}`)
  // existing 'mid' (not FFA-gated): forced FFA is changed (the reason for 'midsq')
  const mFf = run({ laserRange: 'mid' }, lzT, { n: 8, env: 'ffa' }), fFf = run({ laserRange: 'far' }, lzT, { n: 8, env: 'ffa' })
  check('LR2 info: existing mid changes forced FFA (why midsq)', true, `forced FFA differs ${mFf.s !== fFf.s}`)
  // R5 boostCharge: laser charging, two mechs hitting us at 30% hp (a retreat), energy 100
  const bc = (k, t) => obsC(k, t, { hpf: 0.3, laser: true, charge: 0.2 * full, mechs: [mech(10, pB), mech(11, p140)], events: [hit(10, pB, 30), hit(11, p140, 30)] })
  const r6 = tf2('BC1 charging under fire (boostSpend off, to see the trigger)', 'boostCharge', 'on', bc, { n: 8, ov: { boostSpend: false } }, (on, of) => `boostCharge ${on.c.boostCharge || 0}, modes ${on.tr.map((s) => s.split('}').slice(-1)[0].split('/')[0]).join(',')}`)
} else check('chaos scene geometry', false, `pA ${!!pA} pB ${!!pB} p140 ${!!p140} p100 ${!!p100}`)

// R2 laserGrab 'spawn': sweep at spawn, the laser 150-170 m away, no mortar, no lightning before 40 s
const lp = ring(150, 170, (p) => true)[0]
if (lp) {
  const spawn = (k, t) => obsC(k, t, { pickups: [{ id: 501, kind: 'laser', pos: [lp.x, lp.y, lp.z] }] })
  const s1 = tf2('LG1 spawn sweep + laser run', 'laserGrab', 'spawn', spawn, { n: 30, t0: 0.3 }, (on, of) => `sweep ${on.c.lgsSweep || 0} boost ${on.c.lgsBoost || 0} loot ${on.B.loot ? on.B.loot.type + ':' + (on.B.loot.obj && on.B.loot.obj.kind) : '-'} / off ${of.B.loot ? of.B.loot.type : '-'}`)
  check('LG1b sweep turns the torso, then the laser run boosts', (s1.on.c.lgsSweep || 0) >= 10 && (s1.on.c.lgsBoost || 0) > 0 && s1.on.B.loot && s1.on.B.loot.obj.kind === 'laser', `sweep ${s1.on.c.lgsSweep} boost ${s1.on.c.lgsBoost}`)
  const late = run(sel1('laserGrab', 'spawn'), spawn, { n: 10, t0: 30 })
  check('LG2 no laser run after 25 s', !(late.c.lgsOn > 0), `lgsOn ${late.c.lgsOn || 0}`)
  const hurt = run(sel1('laserGrab', 'spawn'), (k, t) => obsC(k, t, { pickups: spawn(k, t).pickups, mechs: [mech(10, pA || lp)], events: k === 3 ? [hit(10, pA || lp)] : [] }), { n: 10, t0: 0.3 })
  check('LG3 first damage from inside 100 m ends the run', (hurt.c.lgsStopDmg || 0) === 1, `stop ${hurt.c.lgsStopDmg || 0} on ${hurt.c.lgsOn}`)
}
const near2 = { x: me0.x + 1.5, y: me0.y, z: me0.z }
const take = (kind, t0) => [run(sel1('laserGrab', 'spawn'), (k, t) => obsC(k, t, { pickups: [{ id: 601, kind, pos: [near2.x, near2.y, near2.z] }] }), { n: 3, t0 }), run(sel1('laserGrab', 'std'), (k, t) => obsC(k, t, { pickups: [{ id: 601, kind, pos: [near2.x, near2.y, near2.z] }] }), { n: 3, t0 })]
const tk = (r) => r.tr.some((s) => s.includes('"take":601'))
{ const [a, b] = take('mortar', 70); check('LG4 mortar at 2 m, t 70: spawn never takes it, std does', !tk(a) && tk(b), `spawn ${tk(a)} std ${tk(b)}`) }
{ const [a, b] = take('lightning', 30); check('LG5 lightning at 2 m, t 30 laser-less: spawn waits, std takes', !tk(a) && tk(b), `spawn ${tk(a)} std ${tk(b)}`) }
{ const [a, b] = take('lightning', 45); check('LG6 lightning at t 45: both take', tk(a) && tk(b), `spawn ${tk(a)} std ${tk(b)}`) }
{ const a = run({ laserGrab: 'spawn' }, (k, t) => obsC(k, t, { pickups: [{ id: 601, kind: 'mortar', pos: [near2.x, near2.y, near2.z] }] }), { n: 3, t0: 70, env: 'ffa' }), b = run({ laserGrab: 'std' }, (k, t) => obsC(k, t, { pickups: [{ id: 601, kind: 'mortar', pos: [near2.x, near2.y, near2.z] }] }), { n: 3, t0: 70, env: 'ffa' })
  check('LG7 forced FFA: mortar rule identical', a.s === b.s, `identical ${a.s === b.s}`) }

// R4 cubes 'snow': hp 45%, a cube 50-60 m away during a fight; and the corpse rush after our kill
const c55 = ring(50, 60, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y))[0]
if (c55 && pB) {
  const sc = (k, t) => obsC(k, t, { hpf: 0.45, mechs: [mech(10, pB)], events: k % 5 === 0 ? [hit(10, pB)] : [], cubes: [{ id: 701, pos: [c55.x, c55.y, c55.z] }] })
  const r = tf2('SN1 cube at 55 m, hp 45%, in a fight', 'cubes', 'snow', sc, { n: 8 }, (on, of) => `grab snow ${on.B.grab ? on.B.grab.type : '-'} off ${of.B.grab ? of.B.grab.type : '-'}`)
  check('SN1b snow grabs at 45% (floor 25%), off does not (floor 50%)', !!r.on.B.grab && !r.of.B.grab, '')
}
const kp = ring(85, 100, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y) && lineBoth(me0, p))[0]
if (kp && pA) {
  const ks = (k, t) => obsC(k, t, { mechs: k < 2 ? [mech(12, kp, { hpf: 0.05 })] : [mech(10, pA)], events: k === 2 ? [{ type: 'kill', target: 12 }] : k % 5 === 0 ? [hit(10, pA)] : [],
    cubes: k >= 3 ? [{ id: 801, pos: [kp.x + 1, kp.y, kp.z] }, { id: 802, pos: [kp.x - 1, kp.y, kp.z] }] : [], pickups: k >= 3 ? [{ id: 803, kind: 'laser', pos: [kp.x, kp.y + 1, kp.z] }] : [] })
  const r = tf2('SN2 corpse at 90 m after our kill', 'cubes', 'snow', ks, { n: 10 }, (on, of) => `grab snow ${on.B.grab ? on.B.grab.type + ' rush ' + on.B.grab.rush : '-'} off ${of.B.grab ? of.B.grab.type + ' rush ' + of.B.grab.rush : '-'}`)
  check('SN2b snow rushes the corpse (laser we lack)', !!r.on.B.grab && r.on.B.grab.rush === true, '')
}

// R8 farmHp '50sq' (hp 60%, a crate at 40-60 m), cratePath '80' (crate 100-140 m), upg 'laser'
const cr = ring(40, 60, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y))[0], crF = ring(100, 120, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y))[0]
if (cr && crF) {
  const fs = (k, t) => obsC(k, t, { hpf: 0.6, crates: [{ id: 901, pos: [cr.x, cr.y, cr.z], hp: 100 }] })
  const r = tf2('FH1 crate at 50 m, hp 60%', 'farmHp', '50sq', fs, { n: 6, t0: 100, off: '90' }, (on, of) => `loot 50sq ${on.B.loot ? on.B.loot.type : '-'} 90 ${of.B.loot ? of.B.loot.type : '-'}`)
  check('FH1b 50sq farms at 60%', r.on.B.loot && r.on.B.loot.type === 'crate' && !r.of.B.loot, '')
  const cf = (k, t) => obsC(k, t, { crates: [{ id: 902, pos: [crF.x, crF.y, crF.z], hp: 100 }] })
  const r2 = tf2('CP1 crate at 100-120 m', 'cratePath', '80', cf, { n: 6, t0: 100, off: 'std' }, (on, of) => `loot 80 ${on.B.loot ? on.B.loot.type : '-'} std ${of.B.loot ? of.B.loot.type : '-'}`)
  check('CP1b 80 skips it, std farms it', !r2.on.B.loot && r2.of.B.loot && r2.of.B.loot.type === 'crate', '')
}
const pk = (r) => { const m = r.tr.map((s) => s.match(/"pick":(\d)/)).filter(Boolean); return m.length ? m[m.length - 1][1] : '-' }
{
  const offer = { id: 7, choices: [{ id: 'nanites' }, { id: 'laser_damage' }, { id: 'gun_rate' }] }
  const mk = (k, t) => obsC(k, t, { laser: true, offer: k >= 2 ? offer : null })
  const r = tf2('UP1 offer nanites / laser_damage / gun_rate (laser held)', 'upg', 'laser', mk, { n: 4 }, (on, of) => `pick laser ${pk(on)} std ${pk(of)}`)
  check('UP1b laser order takes laser_damage', pk(r.on) === '1' && pk(r.of) === '0', '')
  const offer2 = { id: 8, choices: [{ id: 'plating' }, { id: 'armor' }, { id: 'gun_rate' }] }
  const mk2 = (k, t) => obsC(k, t, { upgrades: ['plating'], offer: k >= 2 ? offer2 : null })
  const a = run(sel1('upg', 'laser'), mk2, { n: 4 }), b = run(sel1('upg', 'std'), mk2, { n: 4 })
  check('UP2 one plating taken: laser order takes armor (plating is its 5th entry), std plating', pk(a) === '1' && pk(b) === '0', `laser ${pk(a)} std ${pk(b)}`)
  const a2 = run({ upg: 'laser', upgFix: 'on' }, mk2, { n: 4 })
  check('UP3 with upgFix on: same pick', pk(a2) === '1', `pick ${pk(a2)} order ${a2.B.upgOrderSq ? a2.B.upgOrderSq.slice(0, 8).join(',') : '-'}`)
}
console.log(`\n${pass} passed, ${fail} failed`)
