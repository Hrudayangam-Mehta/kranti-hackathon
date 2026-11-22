// Fable w2 engineer B unit tests (lib/farm.js presets ec_harvest, ec_reach, ec_corpse, ec_picks) on the CH1 SELECT defaults:
// one synthetic trigger scene per rule (acts in SQUAD), T-F2 (forced FFA identical to the old value) and one foreign death
// identical for the SQUAD-only values; the 'on' values of ec_reach / ec_picks act in both postures by design (spec 'both'),
// so their T-F2 is run on 'sq'. usage: bun test_farm.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const BOT = process.argv[2] || join(S, 'fable_work/w2/B/tree')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { PRESETS, SELECT, PARAMS, resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(S, 'mechbot/kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(S, 'mechbot/kit/arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const Wp = cfg.weapons, HP = cfg.mech.hp
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const lineBoth = (a, b) => world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) && world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5)
const walkTo = (p) => nav.walkLine(me0.x, me0.y, p.x, p.y)
function ring(r0, r1, pred, max = 1, not = []) {
  const out = []
  for (let r = r0; r <= r1 && out.length < max; r += 5) for (let k = 0; k < 72 && out.length < max; k++) {
    const a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
    const p = { x, y, z: nav.levelAt(x, y), a }
    if (p.z - world.ground(x, y) < 1 && pred(p) && not.every((q) => Math.hypot(q.x - x, q.y - y) > 25)) out.push(p)
  }
  return out
}
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const obsB = (k, t, o = {}) => ({ type: 'obs', tick: 2 * k, t, alive: o.alive || 16, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: o.vel || [0, 0, 0], aim: o.aim || [0, 0], hp: HP * (o.hpf || 1), max_hp: HP, energy: 100, max_energy: 100, grounded: true,
  cubes: o.myCubes || 0, upgrades: o.upgrades || [], in_zone: true, weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, o.laser ? { kind: 'laser', cooldown: 0, charge: 0, stats: Wp.laser } : null], stats: cfg.mech },
  mechs: o.mechs || [], projectiles: [], crates: o.crates || [], cubes: o.cubes || [], pickups: o.pickups || [], sounds: [], beams: [], events: o.events || [], drops: [], zone, offer: o.offer || null })
const mech = (id, p, o = {}) => ({ id, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [o.aim === undefined ? Math.atan2(me0.y - p.y, me0.x - p.x) : o.aim, 0], hp: HP * (o.hpf || 1), max_hp: HP, cubes: o.cubes || 0, weapons: o.weapons || ['gun'], charging: false })
const hit = (id, p, amount = 45) => ({ type: 'damaged', amount, weapon: 'gun', bearing: Math.atan2(p.y - me0.y, p.x - me0.x), by: id })
const cube = (id, p, dx = 0, dy = 0) => ({ id, pos: [p.x + dx, p.y + dy, p.z] })
/** A scripted scene on the CH1 SELECT (+ base); returns the action / mode / leg / target trace, the brain and its counters. */
function run(sel, mk, o = {}) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(o.env ? { env: o.env } : {}), ...(o.ov || {}), select: { ...(o.base || {}), ...sel } }), B = b._B
  const tr = [], n = o.n || 14, t0 = o.t0 === undefined ? 60 : o.t0
  for (let j = 0; j < 2; j++) { const o0 = obsB(0, t0 - 0.2 + j * 0.1, {}); o0.alive = mk(0, t0).alive - (j ? (o.fd || 0) : 0); o0.tick = -4 + 2 * j; b.act(o0, performance.now() + 1e6) }
  for (let k = 0; k < n; k++) {
    const ob = mk(k, t0 + k * 0.1); if (o.fd) ob.alive -= o.fd
    const a = b.act(ob, performance.now() + 1e6)
    // the trace: the action, then loot / grab / band (internal state, so T-F2 compares those as well), then mode / leg / target
    tr.push(JSON.stringify(a) + `L${B.loot ? B.loot.type + ':' + B.loot.id : '-'} G${B.grab ? B.grab.type + ':' + B.grab.id : '-'} R${B.rPrefNow}` + B.mode + '/' + B.legKind + '/' + (B.target ? B.target.id : '-'))
  }
  return { s: tr.join('|'), last: tr[tr.length - 1], tr, B, c: B.counters }
}
/** val acts in SQUAD (trace differs from off); forced FFA and one foreign death identical to off (unless o.both). */
function tf2(name, key, val, mk, o = {}, detail = () => '') {
  const off = Object.keys(PRESETS[key])[0]
  const on = run({ [key]: val }, mk, o), of = run({ [key]: off }, mk, o)
  const fOn = run({ [key]: val }, mk, { ...o, env: 'ffa' }), fOf = run({ [key]: off }, mk, { ...o, env: 'ffa' })
  const dOn = run({ [key]: val }, mk, { ...o, fd: 1 }), dOf = run({ [key]: off }, mk, { ...o, fd: 1 })
  const ok = on.s !== of.s && fOn.s === fOf.s && dOn.s === dOf.s
  check(`${name}: ${key} '${val}' acts in SQUAD; forced FFA and one foreign death identical to '${off}'`, ok, `SQUAD differs ${on.s !== of.s}, FFA identical ${fOn.s === fOf.s}, firewall identical ${dOn.s === dOf.s} | ${detail(on, of)}`)
  return { on, of, fOn, fOf }
}
const tgt = (r) => r.last.split('/').slice(-1)[0]
const md = (r) => r.last.split('}').slice(-1)[0].replace(/^L\S+ G\S+ R\S*?(?=[A-Z]{3,})/, '')
const pk = (r) => { const m = r.tr.map((s) => s.match(/"pick":(\d)/)).filter(Boolean); return m.length ? m[m.length - 1][1] : '-' }

// ---------------------------------------------------------------- defaults: old values, no B.fm, game numbers from config
{
  const P0 = resolveParams({})
  check('D1 defaults: ec_* at their old values, every fm key inert', SELECT.ec_harvest === 'off' && SELECT.ec_reach === 'off' && SELECT.ec_corpse === 'off' && SELECT.ec_picks === 'off' &&
    P0.fmHarvest === false && P0.fmReach === false && P0.fmCorpse === false && P0.fmPicks === false && Object.keys(SELECT).slice(-1)[0] === 'healDoc',
    'SELECT ' + ['ec_harvest', 'ec_reach', 'ec_corpse', 'ec_picks'].map((k) => k + ':' + SELECT[k]).join(' ') + ', last key ' + Object.keys(SELECT).slice(-1)[0])
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  check('D2 off: B.fm undefined', b._B.fm === undefined, 'ok')
  const b2 = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, select: { ec_picks: 'on' } }), B2 = b2._B
  b2.act(obsB(0, 1, { offer: { id: 1, choices: [{ id: 'armor' }, { id: 'plating' }, { id: 'sensors' }] } }), performance.now() + 1e6)
  const ups = cfg.upgrades.map((u) => u.id), ord = B2.fm.debug().orders
  check('D3 g6 order: every config id once, no unknown id (mortar_reload / mortar_velocity, not mortar_damage / mortar_rate)',
    ord && ord.base.length === ups.length && ups.every((id) => ord.base.includes(id)) && B2.counters.fmOrderUnknown === 0 && B2.counters.fmOrderMissing === 0 && !ord.base.includes('mortar_damage'),
    `n ${ord && ord.base.length} / ${ups.length}, unknown ${B2.counters.fmOrderUnknown}, missing ${B2.counters.fmOrderMissing}; laser early ${ord.laser.slice(0, 4)}; gun early ${ord.gun.slice(0, 5)}`)
  // reach numbers against the spec (52 m one shooter, 30 m two, 150 m none; on our heading; first offer f = 0.75 -> t = 23.75 s)
  const F = B2.fm._, me = B2.me
  me.t = 0.25 * P0.fmLifeS; me.cubes = 3; me.vx = 10; me.vy = 0; me.x = 0; me.y = 0
  const o = { x: 50, y: 0 }
  B2.tick += 1; B2.trackList = []
  const val = F.cubesValue(1)
  check('D4 g2 cube value at f 0.75 (cube 4 of 6: heal 56 + 80 f + 200 / 3)', Math.abs(val - (56 + 60 + 200 / 3)) < 0.5, `value ${val.toFixed(1)} hp-eq, heading factor ahead ${F.headF(o)}, behind ${F.headF({ x: -50, y: 0 })}`)
}

// ---------------------------------------------------------------- g1 ec_harvest
const hunter = ring(135, 150, (p) => lineBoth(me0, p))[0]
const near = ring(70, 80, (p) => lineBoth(me0, p))[0]
const cb = ring(40, 55, (p) => walkTo(p), 1, [hunter || me0, near || me0])[0]
if (hunter && cb && near) {
  const sc = (p) => (k, t) => obsB(k, t, { mechs: [mech(10, p)], events: k % 4 === 1 ? [hit(10, p)] : [], cubes: [cube(701, cb)] })
  const r = tf2('H1 hunter plinks from 140 m, a cube at 50 m, t 30 s, 0 kills', 'ec_harvest', 'on', sc(hunter), { n: 14, t0: 30 },
    (on, of) => `on ${md(on)} loot ${on.B.loot ? on.B.loot.type : '-'} live ${on.c.fmHvLive || 0} gate ${on.c.fmHvGate || 0} shot ${on.c.fmHvShot || 0} | off ${md(of)}`)
  check('H1b on: no fight started (no target), LOOT walk to the cube; off fights the hunter', tgt(r.on) === '-' && r.on.B.mode === 'LOOT' && r.on.B.loot && r.on.B.loot.type === 'cube' && tgt(r.of) === '10' && (r.on.c.fmHvGate || 0) > 0,
    `on ${md(r.on)} target ${tgt(r.on)} | off ${md(r.of)} target ${tgt(r.of)}`)
  const r2a = run({ ec_harvest: 'on' }, sc(near), { n: 14, t0: 30 }), r2b = run({ ec_harvest: 'off' }, sc(near), { n: 14, t0: 30 })
  check('H2 the hunter has a line inside 90 m (75 m): the window is shut, identical to off', r2a.s === r2b.s && !(r2a.c.fmHvLive > 0), `identical ${r2a.s === r2b.s}, live ${r2a.c.fmHvLive || 0}`)
  const sk = (k, t) => { const o = sc(hunter)(k, t); if (k === 0) o.events.push({ type: 'kill', target: 55 }); return o }
  const r3a = run({ ec_harvest: 'on' }, sk, { n: 14, t0: 30 }), r3b = run({ ec_harvest: 'off' }, sk, { n: 14, t0: 30 })
  check('H3 one kill: the window is shut for good, identical to off', r3a.s === r3b.s && !(r3a.c.fmHvLive > 0), `identical ${r3a.s === r3b.s}, kills ${r3a.c.kills}`)
  const r4a = run({ ec_harvest: 'on' }, sc(hunter), { n: 14, t0: 56 }), r4b = run({ ec_harvest: 'off' }, sc(hunter), { n: 14, t0: 56 })
  check('H4 t 56 s (window ends at 55 s): identical to off', r4a.s === r4b.s, `identical ${r4a.s === r4b.s}`)
} else check('H geometry', false, `hunter ${!!hunter} near ${!!near} cube ${!!cb}`)

// ---------------------------------------------------------------- g2 ec_reach
const cFar = ring(100, 115, (p) => walkTo(p))[0]
const crN = ring(40, 55, (p) => walkTo(p))[0]
const sh = ring(55, 70, (p) => lineBoth(me0, p), 2)
const cMid = ring(50, 60, (p) => walkTo(p), 1, sh)[0]
if (cFar && crN) {
  const lone = (k, t) => obsB(k, t, { cubes: [cube(702, cFar)] })
  const r = tf2('R1 out of contact, a cube at 100-115 m (old reach 60 m)', 'ec_reach', 'sq', lone, { n: 8, t0: 100 }, (on, of) => `loot sq ${on.B.loot ? on.B.loot.type : '-'} off ${of.B.loot ? of.B.loot.type : '-'}`)
  check('R1b reach from value takes it, the old 60 m does not', r.on.B.loot && r.on.B.loot.type === 'cube' && !r.of.B.loot, `reach counter ${r.on.c.fmReachLoot || 0}`)
  const a = run({ ec_reach: 'on' }, lone, { n: 8, t0: 100, env: 'ffa' }), b = run({ ec_reach: 'off' }, lone, { n: 8, t0: 100, env: 'ffa' })
  check(`R1c 'on' acts in forced FFA too (spec 'both')`, a.s !== b.s && a.B.loot && a.B.loot.type === 'cube', `FFA differs ${a.s !== b.s}`)
  const crate = (k, t) => obsB(k, t, { hpf: 0.45, crates: [{ id: 901, pos: [crN.x, crN.y, crN.z], hp: 100 }] })
  const r2 = tf2('R2 a crate at 50 m, hp 45% (crates from 40%; old farmHp 50sq)', 'ec_reach', 'sq', crate, { n: 6, t0: 100 }, (on, of) => `loot sq ${on.B.loot ? on.B.loot.type : '-'} off ${of.B.loot ? of.B.loot.type : '-'}`)
  check('R2b the crate is farmed at 45% under sq, not under off', r2.on.B.loot && r2.on.B.loot.type === 'crate' && !r2.of.B.loot, '')
} else check('R geometry (1-2)', false, `far ${!!cFar} crate ${!!crN}`)
if (sh.length === 2 && cMid) {
  const two = (k, t) => obsB(k, t, { mechs: [mech(10, sh[0]), mech(11, sh[1])], events: k % 4 === 1 ? [hit(10, sh[0]), hit(11, sh[1])] : [], cubes: [cube(703, cMid)] })
  const r = tf2('R3 in a fight with two shooters inside 75 m, a cube at 50-60 m (old grab reach 70 m)', 'ec_reach', 'sq', two, { n: 8, t0: 60 }, (on, of) => `grab sq ${on.B.grab ? on.B.grab.type : '-'} off ${of.B.grab ? of.B.grab.type : '-'}`)
  check('R3b two shooters: reach about 30 m, the cube is left; off grabs it', !r.on.B.grab && r.of.B.grab && r.of.B.grab.type === 'cube', `fmReachGrab ${r.on.c.fmReachGrab || 0}`)
} else check('R geometry (3)', false, `shooters ${sh.length} cube ${!!cMid}`)

// ---------------------------------------------------------------- g4 ec_corpse
const kp = ring(85, 100, (p) => walkTo(p) && lineBoth(me0, p))[0]
const l2 = kp ? ring(60, 75, (p) => lineBoth(me0, p), 2, [kp]) : []
if (kp && l2.length === 2) {
  // our kill at 85-100 m (victim with vc cubes), then nl mechs with lines; the pile appears where it died
  const ks = (vc, nl) => (k, t) => obsB(k, t, {
    mechs: k < 2 ? [mech(12, kp, { hpf: 0.05, cubes: vc })].concat(l2.slice(0, nl).map((p, i) => mech(20 + i, p))) : l2.slice(0, nl).map((p, i) => mech(20 + i, p)),
    events: (k === 2 ? [{ type: 'kill', target: 12 }] : []).concat(k % 4 === 1 ? l2.slice(0, nl).map((p, i) => hit(20 + i, p)) : []),
    cubes: k >= 3 ? Array.from({ length: vc + 2 }, (_, i) => cube(810 + i, kp, (i % 3) - 1, (i >> 1) % 2)) : [] })
  const r = tf2('C1 our kill at 90 m, victim 0 cubes (n 2), 2 lines: reach 58 x 2 / 2 = 58 m', 'ec_corpse', 'on', ks(0, 2), { n: 10 },
    (on, of) => `grab on ${on.B.grab ? on.B.grab.type + ' rush ' + on.B.grab.rush : '-'} off(snow) ${of.B.grab ? of.B.grab.type + ' rush ' + of.B.grab.rush : '-'}; pile n ${on.c.fmPileN}`)
  check('C1b the pile of 2 at 90 m is left under 2 lines; snow rushes it', !(r.on.B.grab && r.on.B.grab.type === 'cube') && r.of.B.grab && r.of.B.grab.rush === true && r.on.c.fmPileN === 2, '')
  const r2 = run({ ec_corpse: 'on' }, ks(4, 1), { n: 10 })
  check('C2 victim 4 cubes (n 6), 1 line: reach 115 m, rushed by boost', r2.B.grab && r2.B.grab.type === 'cube' && r2.B.grab.rush === true && r2.c.fmPileN === 6 && (r2.c.fmPileGrab || 0) > 0, `grab ${r2.B.grab ? r2.B.grab.type + ' rush ' + r2.B.grab.rush : '-'} n ${r2.c.fmPileN}`)
  const r3 = run({ ec_corpse: 'on' }, ks(4, 1), { n: 75 })
  check('C3 abort after 6 s: the pile run ends (no rush flag)', !(r3.B.grab && r3.B.grab.rush === true), `grab at +7 s ${r3.B.grab ? r3.B.grab.type + ' rush ' + r3.B.grab.rush : '-'}`)
} else check('C geometry', false, `kill point ${!!kp} lines ${l2.length}`)
const t140 = ring(118, 124, (p) => lineBoth(me0, p))[0]
if (t140) {
  // laser held, target at 120 m on 300 hp (inside one beam + one magazine), one line: hold 100 m instead of midsq's 115 m
  const lz = (k, t) => obsB(k, t, { laser: true, mechs: [{ ...mech(10, t140), hp: 300 }], events: k % 4 === 1 ? [hit(10, t140)] : [] })
  const r = tf2('C4 near kill at 120 m with a laser, 1 line (focus mult, so no 38% walk-in)', 'ec_corpse', 'on', lz, { n: 8, base: { focus: 'mult' } }, (on, of) => `rPrefNow on ${on.B.rPrefNow} off ${of.B.rPrefNow}, fmClose ${on.c.fmClose || 0}`)
  check('C4b hold 100 m (midsq 115 m)', r.on.B.rPrefNow === 100 && r.of.B.rPrefNow === 115, `${r.on.B.rPrefNow} / ${r.of.B.rPrefNow}`)
} else check('C4 geometry', false, '')

// ---------------------------------------------------------------- g6 ec_picks
{
  const off1 = { id: 7, choices: [{ id: 'armor' }, { id: 'laser_damage' }, { id: 'nanites' }] }
  const mkL = (t0Off) => (k, t) => obsB(k, t, { laser: true, offer: k >= 2 ? off1 : null })
  const r = tf2('P1 t 30 s, laser held: armor / laser_damage / nanites', 'ec_picks', 'sq', mkL(), { n: 4, t0: 30 }, (on, of) => `pick sq ${pk(on)} off(laser order) ${pk(of)}`)
  check('P1b laser_damage moves above armor before 45 s', pk(r.on) === '1' && pk(r.of) === '0', '')
  const off2 = { id: 8, choices: [{ id: 'armor' }, { id: 'gun_rate' }, { id: 'gun_mag' }] }
  const g = run({ ec_picks: 'sq' }, (k, t) => obsB(k, t, { offer: k >= 2 ? off2 : null }), { n: 4, t0: 30 }), g0 = run({ ec_picks: 'off' }, (k, t) => obsB(k, t, { offer: k >= 2 ? off2 : null }), { n: 4, t0: 30 })
  check('P2 t 30 s, no laser: armor / gun_rate / gun_mag -> gun_mag (off: armor)', pk(g) === '2' && pk(g0) === '0', `sq ${pk(g)} off ${pk(g0)}`)
  const off3 = { id: 9, choices: [{ id: 'laser_charge' }, { id: 'nanites' }, { id: 'gun_mag' }] }
  const late = run({ ec_picks: 'sq' }, (k, t) => obsB(k, t, { laser: true, offer: k >= 2 ? off3 : null }), { n: 4, t0: 80 }), late0 = run({ ec_picks: 'off' }, (k, t) => obsB(k, t, { laser: true, offer: k >= 2 ? off3 : null }), { n: 4, t0: 80 })
  check('P3 t 80 s, laser held: laser_charge / nanites / gun_mag -> nanites (off: laser_charge)', pk(late) === '1' && pk(late0) === '0', `sq ${pk(late)} off ${pk(late0)}`)
  const a = run({ ec_picks: 'on' }, mkL(), { n: 4, t0: 30, env: 'ffa' }), b = run({ ec_picks: 'off' }, mkL(), { n: 4, t0: 30, env: 'ffa' })
  check(`P4 'on' acts in forced FFA too (spec 'both')`, pk(a) === '1' && pk(b) === '0', `FFA on ${pk(a)} off ${pk(b)}`)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
