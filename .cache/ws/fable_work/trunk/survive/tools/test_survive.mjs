// Engineer S unit tests (lib/survive.js): defaults, T-F2 per preset (acts in SQUAD; forced FFA and one foreign death
// byte-identical to 'off'), and one synthetic trigger scene per rule with its own assertions. Base = the tree's SELECT (CH1).
// usage: bun test_survive.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const BOT = process.argv[2] || join(S, 'fable_work/trunk/survive/tree')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { PRESETS, SELECT, resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(S, 'mechbot/kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(S, 'mechbot/kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const Wp = cfg.weapons, HP = cfg.mech.hp
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const lineBoth = (a, b) => world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) && world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5)
const lineNone = (a, b) => !(world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) || world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 8) || world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5) || world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 8.1))
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
const zoneOf = (nr) => ({ center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: nr, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 })
// o: hpf, laser {charge, cooldown}, ammo, mechs, events, drops, crates, pickups, energy, zoneNr, stats, pos
const obsB = (k, t, o = {}) => ({ type: 'obs', tick: 2 * k, t, alive: o.alive || 16, self: { id: 3, pos: o.pos || [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: o.aim || [0, 0], hp: HP * (o.hpf || 1), max_hp: HP,
  energy: o.energy === undefined ? 100 : o.energy, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
  weapons: [{ kind: 'gun', cooldown: 0, ammo: o.ammo === undefined ? 12 : o.ammo, reload: 0, stats: Wp.gun }, o.laser ? { kind: 'laser', cooldown: o.laser.cooldown || 0, charge: o.laser.charge || 0, stats: Wp.laser } : null],
  stats: o.stats || cfg.mech }, mechs: o.mechs || [], projectiles: [], crates: o.crates || [], cubes: [], pickups: o.pickups || [], sounds: [], beams: [],
  events: o.events || [], drops: o.drops || [], zone: zoneOf(o.zoneNr || 400), offer: null })
const mech = (id, p, o = {}) => ({ id, kind: o.kind || 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [o.aim === undefined ? Math.atan2(me0.y - p.y, me0.x - p.x) : o.aim, 0], hp: (o.maxHp || HP) * (o.hpf || 1), max_hp: o.maxHp || HP, cubes: 0, weapons: o.kind === 'npc' ? [] : ['gun'], charging: false })
const hit = (id, p, amount = 45) => ({ type: 'damaged', amount, weapon: 'gun', bearing: Math.atan2(p.y - me0.y, p.x - me0.x), by: id })
const parseA = (s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1))
/** Scripted scene, closed over the last action (mk(k, t, lastAction, B)); trace = action + mode/leg/target/aimKind. */
function run(sel, mk, o = {}) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(o.env ? { env: o.env } : {}), ...(o.ov || {}), select: { ...sel } }), B = b._B
  const tr = [], n = o.n || 14, t0 = o.t0 || 100
  for (let j = 0; j < 2; j++) { const o0 = obsB(0, t0 - 0.2 + j * 0.1, {}); o0.alive = 16 - (j ? (o.fd || 0) : 0); o0.tick = -4 + 2 * j; b.act(o0, performance.now() + 1e6) }
  let last = null
  for (let k = 0; k < n; k++) {
    const ob = mk(k, +(t0 + k * 0.1).toFixed(2), last, B); ob.alive = (ob.alive || 16) - (o.fd || 0)
    const a = b.act(ob, performance.now() + 1e6)
    last = a
    tr.push(JSON.stringify(a) + B.mode + '/' + B.legKind + '/' + (B.target ? B.target.id : '-') + '/' + B.aimKind)
  }
  return { s: tr.join('|'), last: tr[tr.length - 1], tr, B, c: B.counters }
}
function tf2(name, key, val, mk, o = {}, detail = () => '') {
  const off = Object.keys(PRESETS[key])[0]
  const on = run({ [key]: val }, mk, o), of = run({ [key]: off }, mk, o)
  const fOn = run({ [key]: val }, mk, { ...o, env: 'ffa' }), fOf = run({ [key]: off }, mk, { ...o, env: 'ffa' })
  const dOn = run({ [key]: val }, mk, { ...o, fd: 1 }), dOf = run({ [key]: off }, mk, { ...o, fd: 1 })
  const ok = on.s !== of.s && fOn.s === fOf.s && dOn.s === dOf.s
  check(`T-F2 ${name}: ${key} '${val}' acts in SQUAD; forced FFA and one foreign death identical to '${off}'`, ok, `SQUAD differs ${on.s !== of.s}, FFA identical ${fOn.s === fOf.s}, firewall identical ${dOn.s === dOf.s} | ${detail(on, of)}`)
  return { on, of }
}
const svc = (c) => Object.keys(c).filter((k) => k.startsWith('sv')).map((k) => k + '=' + c[k]).join(' ')

// ---------------------------------------------------------------- defaults
{
  const P0 = resolveParams({})
  const keys = ['svDrop', 'svRegen', 'svFire', 'svFarm']
  check('D1 defaults: every sv preset at its old value (first option, empty)', keys.every((k) => SELECT[k] === 'off' && Object.keys(PRESETS[k])[0] === 'off' && Object.keys(PRESETS[k].off).length === 0) &&
    P0.svDropOn === false && P0.svRegenOn === false && P0.svFireOn === false && P0.svFarmOn === false, keys.map((k) => k + ':' + SELECT[k]).join(' '))
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  check('D2 all off: B.sv undefined, B.regen undefined, B.dl null', b._B.sv === undefined && b._B.regen === undefined && b._B.dl === null, `sv ${typeof b._B.sv}`)
  const P1 = resolveParams({ select: { svDrop: 'first' } }), P2 = resolveParams({ select: { svDrop: 'first100' } })
  check('D3 svDrop values: first = 0.9, first100 = 1.0', P1.svDropOn === true && P1.svDropHpf === 0.9 && P2.svDropOn === true && P2.svDropHpf === 1.0, `${P1.svDropHpf} ${P2.svDropHpf}`)
}

// ---------------------------------------------------------------- svDrop (FB4)
const tgtP = ring(95, 120, (p) => lineBoth(me0, p))[0]
const dropP = ring(40, 55, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y) && (!tgtP || Math.hypot(p.x - tgtP.x, p.y - tgtP.y) > 40))[0]
const drop = (p, lands, o = {}) => ({ id: 20001, pos: [p.x, p.y, p.z], radius: o.radius || cfg.drops.radius, lands_in: lands, capture_s: o.capture_s || cfg.drops.capture_s, progress: o.progress || 0, holder: o.holder === undefined ? null : o.holder })
if (tgtP && dropP) {
  const dir = Math.atan2(dropP.y - me0.y, dropP.x - me0.x)
  const towards = (s) => { const a = parseA(s); const l = Math.hypot(a.move[0], a.move[1]); return l > 0.3 && (a.move[0] * Math.cos(dir) + a.move[1] * Math.sin(dir)) / l > 0.7 }
  const fight = (hpf, dr, o = {}) => (k, t) => obsB(k, t, { hpf, mechs: [mech(10, tgtP)], events: k % 4 === 0 ? [hit(10, tgtP)] : [], drops: dr ? [dr] : [], zoneNr: o.zoneNr, energy: o.energy })
  const r = tf2('DR1 hp 80%, landed drop at 40-55 m, a target hitting us from 100 m', 'svDrop', 'first', fight(0.8, drop(dropP, 0)), { n: 10 },
    (on, of) => `modes on ${on.tr.slice(-3).map((s) => s.split('}').pop().split('/')[0]).join(',')} off ${of.tr.slice(-1)[0].split('}').pop().split('/')[0]}; ${svc(on.c)}`)
  const m = r.on.tr.map((s) => s.split('}').pop().split('/')[0])
  check('DR1b DROP outranks FIGHT, legs walk to the ring, torso stays on the target', m.slice(1).every((x) => x === 'DROP') && r.on.tr.slice(1).every(towards) &&
    r.on.tr.slice(-4).some((s) => s.endsWith('/10/gun') || s.endsWith('/10/laser')), `modes ${m.join(',')} toward ${r.on.tr.map(towards).join(',')} aim ${r.on.last.split('/').slice(-2).join('/')}`)
  check('DR1c boost beyond 12 m with energy > 8', r.on.tr.slice(1).every((s) => parseA(s).boost === true) && (r.on.c.svDropBoost || 0) > 0, `boosts ${r.on.tr.map((s) => parseA(s).boost).join(',')}`)
  const lowE = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 0), { energy: 6 }), { n: 6 })
  check('DR1d no boost at energy 6', lowE.tr.slice(1).every((s) => parseA(s).boost !== true) && lowE.c.svDropGo > 0, `boosts ${lowE.tr.map((s) => parseA(s).boost).join(',')}`)
  // hp threshold: 95% -> 'first' (90%) stays out, 'first100' goes
  const h95a = run({ svDrop: 'first' }, fight(0.95, drop(dropP, 0)), { n: 6 }), h95b = run({ svDrop: 'first100' }, fight(0.95, drop(dropP, 0)), { n: 6 })
  check('DR2 hp 95%: first stays in the fight, first100 takes the drop', !(h95a.c.svDropGo > 0) && h95b.c.svDropGo > 0 && h95b.B.mode === 'DROP', `first ${h95a.B.mode} first100 ${h95b.B.mode}`)
  const full = run({ svDrop: 'first100' }, fight(1.0, drop(dropP, 0)), { n: 6 })
  check('DR3 hp 100%: first100 does not fire', !(full.c.svDropGo > 0), `mode ${full.B.mode}`)
  // timing: 40-55 m is ~4 s of walk; landing in 20 s is too early, in 5 s is taken
  const early = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 20)), { n: 6 }), ok5 = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 5)), { n: 6 })
  check('DR4 landing 20 s away: not yet; landing 5 s away: go', !(early.c.svDropGo > 0) && ok5.c.svDropGo > 0, `early ${early.B.mode} 5 s ${ok5.B.mode}`)
  // 'timely': in the ring at most svDropLateS (3) after the landing. Ring walk rw (straight line): a landed drop is skipped when
  // rw > 3 (here forced with svDropLateS = rw - 1 so the case does not depend on the point found), one landing in rw s is taken
  const rw = (Math.hypot(dropP.x - me0.x, dropP.y - me0.y) - cfg.drops.radius) / cfg.mech.walk_speed
  const tl0 = run({ svDrop: 'timely' }, fight(0.8, drop(dropP, 0)), { n: 6, ov: { svDropLateS: rw - 1 } }), tl2 = run({ svDrop: 'timely' }, fight(0.8, drop(dropP, +rw.toFixed(1))), { n: 6 }), tlF = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 0)), { n: 6 })
  check('DR4b timely: a late arrival is skipped, an on-time one taken; first (no late limit) takes the landed one', !(tl0.c.svDropGo > 0) && tl2.c.svDropGo > 0 && tlF.c.svDropGo > 0, `late ${tl0.B.mode} on time ${tl2.B.mode} first ${tlF.B.mode} (ring walk ${rw.toFixed(1)} s)`)
  tf2('DR4c timely (landing when we reach the ring)', 'svDrop', 'timely', fight(0.8, drop(dropP, +rw.toFixed(1))), { n: 8 })
  // outside the next zone (next radius 30 m around us)
  const outZ = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 0), { zoneNr: 30 }), { n: 6 })
  check('DR5 drop outside the next zone: ignored', !(outZ.c.svDropGo > 0), `mode ${outZ.B.mode}`)
  // another holder about to finish (0.3 s left) vs one that just started
  const held = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 0, { holder: 77, progress: cfg.drops.capture_s - 0.3 })), { n: 6 })
  const held2 = run({ svDrop: 'first' }, fight(0.8, drop(dropP, 0, { holder: 77, progress: 0.2 })), { n: 6 })
  check('DR6 a holder finishing first: ignored; a holder that just started: we step in', !(held.c.svDropGo > 0) && held2.c.svDropGo > 0, `finishing ${held.B.mode} started ${held2.B.mode}`)
  // stand: we are on the centre -> move [0, 0]
  const onC = run({ svDrop: 'first' }, (k, t) => ({ ...fight(0.8, drop({ x: me0.x + 1, y: me0.y, z: me0.z }, 0, { holder: 3, progress: 0.1 * k }))(k, t) }), { n: 6 })
  check('DR7 within 2 m of the centre: stand (move 0), still DROP, hold counted', onC.tr.slice(1).every((s) => { const a = parseA(s); return Math.hypot(a.move[0], a.move[1]) < 0.35 }) && onC.B.mode === 'DROP' && onC.c.svDropIn > 0,
    `moves ${onC.tr.map((s) => parseA(s).move.map((v) => v.toFixed(2)).join(':')).join(' ')} ${svc(onC.c)}`)
  // latch: after the drop event (capture) the rule ends
  const cap = run({ svDrop: 'first' }, (k, t) => { const o = fight(0.8, k < 4 ? drop(dropP, 0) : null)(k, t); if (k === 4) o.events = [{ type: 'drop', id: 20001, cubes: 3 }]; return o }, { n: 8 })
  check('DR8 capture event ends the latch; FIGHT again', cap.c.svDropCap === 1 && cap.B.dl === null && cap.B.mode !== 'DROP', `cap ${cap.c.svDropCap} mode ${cap.B.mode}`)
  // urgent zone outranks it: put us outside the zone
  const zoneU = run({ svDrop: 'first' }, (k, t) => { const o = fight(0.8, drop(dropP, 0))(k, t); o.zone = { center: [me0.x + 900, me0.y], radius: 100, next_center: [me0.x + 900, me0.y], next_radius: 60, shrink_start: t - 10, shrink_end: t + 5, dps: 20 }; o.self.in_zone = false; return o }, { n: 6 })
  check('DR9 info: urgent zone first (drop outside the next zone anyway)', true, `mode ${zoneU.B.mode}`)
} else check('svDrop scene geometry', false, `target ${!!tgtP} drop ${!!dropP}`)

// ---------------------------------------------------------------- svRegen 'hold' (FB5)
const droneP = ring(30, 40, (p) => lineBoth(me0, p))[0]
if (droneP) {
  // hp 60%, a drone 30-40 m away (farm target), no mech line, no hit on us: the legacy shoots the drone, the hold does not
  const dr = (hpf, o = {}) => (k, t) => obsB(k, t, { hpf, ammo: o.ammo, mechs: [mech(150, droneP, { kind: 'npc', maxHp: 350, aim: 0 })], events: o.ev ? o.ev(k) : [] })
  const r = tf2('RG1 hp 60%, a drone to farm, no line on us', 'svRegen', 'hold', dr(0.6), { n: 14 }, (on, of) => `gun shots on ${on.tr.filter((s) => parseA(s).fire[0]).length} off ${of.tr.filter((s) => parseA(s).fire[0]).length}; ${svc(on.c)}`)
  const shotsOn = r.on.tr.filter((s) => parseA(s).fire[0]).length, shotsOff = r.of.tr.filter((s) => parseA(s).fire[0]).length
  check('RG1b the hold silences the gun on the drone; the legacy fires', shotsOn === 0 && shotsOff > 0 && r.on.c.svHold === 1 && r.on.B.regen.hold === true, `on ${shotsOn} off ${shotsOff} target ${r.on.B.target ? r.on.B.target.id : '-'}`)
  const rl = run({ svRegen: 'hold' }, dr(0.6, { ammo: 9 }), { n: 6 }), rl0 = run({ svRegen: 'off' }, dr(0.6, { ammo: 9 }), { n: 6 })
  check('RG2 the hold reloads to full (ammo 9)', rl.tr.some((s) => parseA(s).reload === true) && !rl0.tr.some((s) => parseA(s).reload === true), `on ${rl.tr.map((s) => !!parseA(s).reload).join(',')} off ${rl0.tr.map((s) => !!parseA(s).reload).join(',')}`)
  const hi = run({ svRegen: 'hold' }, dr(0.8), { n: 10 })
  check('RG3 hp 80%: no hold', !(hi.c.svHold > 0), `${svc(hi.c)}`)
  // release on the decision a line opens: a mech with a line appears at k = 8
  const mP = ring(95, 120, (p) => lineBoth(me0, p))[0]
  const ln = run({ svRegen: 'hold' }, (k, t) => { const o = dr(0.6)(k, t); if (k >= 8 && mP) o.mechs.push(mech(11, mP)); return o }, { n: 12 })
  check('RG4 a line opens: released that decision', ln.c.svHold === 1 && ln.c.svHoldEndLine === 1 && ln.B.regen.hold === false, `${svc(ln.c)}`)
  // release at 80%: hp climbs past 80% at k = 9
  const up = run({ svRegen: 'hold' }, (k, t) => dr(k < 9 ? 0.6 : 0.81)(k, t), { n: 12 })
  check('RG5 hp reaches 80%: released', up.c.svHoldEndHp === 1 && up.B.regen.hold === false, `${svc(up.c)}`)
  // 12 s cap, then the cool-down
  const cap = run({ svRegen: 'hold' }, dr(0.6), { n: 140 })
  check('RG6 12 s cap: one hold, released by time, not re-entered within the cool-down', cap.c.svHold === 1 && cap.c.svHoldEndTime === 1, `${svc(cap.c)}`)
  // a hit 1 s ago blocks the entry; the regen clock reads the mech's own delay (stats.regen_delay 3.5)
  const hurt = run({ svRegen: 'hold' }, dr(0.6, { ev: (k) => (k === 3 ? [{ type: 'damaged', amount: 25, weapon: 'npc', bearing: 0, by: 150 }] : []) }), { n: 14 })
  const tHurt = 100 + 0.3
  check('RG7 hit at k = 3: no hold before 1.5 s later', hurt.c.svHold === 1 && hurt.B.regen.at.toFixed(2) === (tHurt + cfg.mech.regen_delay).toFixed(2), `hold ${hurt.c.svHold} regen.at ${hurt.B.regen.at} (hurt ${tHurt} + ${cfg.mech.regen_delay})`)
  const nan = run({ svRegen: 'hold' }, (k, t) => { const o = dr(0.6, { ev: (k) => (k === 0 ? [{ type: 'damaged', amount: 25, weapon: 'npc', bearing: 0, by: 150 }] : []) })(k, t); o.self.stats = { ...cfg.mech, regen_delay: 3.5, regen_per_s: 72 }; return o }, { n: 4 })
  check('RG8 regen clock from obs.self.stats (delay 3.5, 72/s): at = hurt + 3.5, lost = 252', Math.abs(nan.B.regen.at - 103.5) < 1e-6 && Math.abs(nan.B.regen.lost - 252) < 1e-6 && nan.B.regen.running === false, `at ${nan.B.regen.at} lost ${nan.B.regen.lost}`)
} else check('svRegen scene geometry', false, 'no drone point')

// ---------------------------------------------------------------- svFire 'rhythm'
{
  // no mech: ammo 8 after a shot at k = 1 (ammo 9 -> 8): rhythm reloads 1.5 s after the shot, the legacy at 2 s
  const sc = (k, t) => obsB(k, t, { ammo: k < 1 ? 9 : 8 })
  const r = tf2('RH1 ammo 8 of 12, no mech, quiet after our last shot', 'svFire', 'rhythm', sc, { n: 25 }, (on, of) => `first reload on k=${on.tr.findIndex((s) => parseA(s).reload)} off k=${of.tr.findIndex((s) => parseA(s).reload)}; ${svc(on.c)}`)
  const kOn = r.on.tr.findIndex((s) => parseA(s).reload), kOff = r.of.tr.findIndex((s) => parseA(s).reload)
  check('RH1b two thirds after 1.5 s quiet (before the legacy 2 s rule)', kOn >= 15 && kOn <= 17 && kOff > kOn && r.on.c.svRlMid > 0, `on k ${kOn} off k ${kOff}`)
  // a target mech behind a wall (no line either way), ammo 10, quiet: the legacy never reloads (target set), rhythm after 6 s
  const wall = ring(60, 90, (p) => lineNone(me0, p))[0]
  if (wall) {
    const sw = (k, t) => obsB(k, t, { ammo: k < 1 ? 11 : 10, mechs: [mech(12, wall)], events: k === 0 ? [hit(12, wall)] : [] })
    const a = run({ svFire: 'rhythm' }, sw, { n: 70 }), b = run({ svFire: 'off' }, sw, { n: 70 })
    check('RH2 info: target behind a wall, ammo 10 (top-up after 6 s quiet)', true, `target ${a.B.target ? a.B.target.id : '-'} on k=${a.tr.findIndex((s) => parseA(s).reload)} off k=${b.tr.findIndex((s) => parseA(s).reload)} ${svc(a.c)}`)
  }
  // a target with a line: never a rhythm reload (ammo 3, nothing quiet)
  const tl = ring(95, 120, (p) => lineBoth(me0, p))[0]
  if (tl) {
    const st = (k, t) => obsB(k, t, { ammo: 3, mechs: [mech(13, tl, { aim: 0 })] })
    const a = run({ svFire: 'rhythm' }, st, { n: 20 })
    check('RH3 a target with a line: no rhythm reload', !(a.c.svRlLow > 0 || a.c.svRlMid > 0 || a.c.svRlTop > 0), `${svc(a.c)} target ${a.B.target ? a.B.target.id : '-'}`)
  }
  // nothing in view and a third or less: at once (no quiet needed), ammo 4 with a fresh line memory
  const lo = run({ svFire: 'rhythm' }, (k, t) => obsB(k, t, { ammo: k < 1 ? 5 : 4 }), { n: 3 })
  check('RH4 info: a third, nothing in view', true, `reloads ${lo.tr.map((s) => !!parseA(s).reload).join(',')} ${svc(lo.c)}`)
}

// ---------------------------------------------------------------- svFarm 'laser' (FB7)
const crP = ring(60, 90, (p) => world.shotClear(me0.x, me0.y, me0.z + 7, p.x, p.y, p.z + 1.2))[0]
const crN = ring(30, 45, (p) => world.shotClear(me0.x, me0.y, me0.z + 7, p.x, p.y, p.z + 1.2))[0]
if (crP && crN) {
  const full = Wp.laser.charge
  // the laser charge follows our trigger (open loop otherwise): +0.1 s per held decision, 0 after a release (cooldown)
  const beam = (cr, o = {}) => { let ch = 0, cd = 0; return (k, t, last) => {
    if (last) { if (last.fire[1]) ch = Math.min(full, ch + 0.1); else if (ch > 0) { ch = 0; cd = Wp.laser.cooldown } else cd = Math.max(0, cd - 0.1) }
    const ob = obsB(k, t, { laser: { charge: ch, cooldown: cd }, crates: [{ id: 1101, pos: [cr.x, cr.y, cr.z], hp: 300 }], mechs: o.mech && k < 2 ? [mech(14, o.mech, { aim: 0 })] : [] })
    if (last) ob.self.aim = last.aim
    return ob
  } }
  const r = tf2('CB1 laser ready, a crate with a line at 60-90 m, no mech seen', 'svFarm', 'laser', beam(crP), { n: 20 }, (on, of) => `held on ${on.tr.filter((s) => parseA(s).fire[1]).length} off ${of.tr.filter((s) => parseA(s).fire[1]).length}; ${svc(on.c)}`)
  const yaw = Math.atan2(crP.y - me0.y, crP.x - me0.x)
  check('CB1b one full beam: trigger held, torso on the crate, released once, gun silent while charging', r.on.c.svCbBeam === 1 && r.on.tr.some((s) => s.endsWith('cratebeam') && Math.abs(parseA(s).aim[0] - yaw) < 0.05) &&
    r.on.tr.filter((s) => s.endsWith('cratebeam')).every((s) => !parseA(s).fire[0]), `beams ${r.on.c.svCbBeam} start ${r.on.c.svCbStart} aim ${r.on.tr.map((s) => s.split('/').pop()).join(',')}`)
  // a mech seen 0.1-0.2 s before (then gone): 50 m limit -> the 60-90 m crate waits, the 30-45 m crate is beamed
  const mP = ring(150, 170, (p) => true)[0]
  // (the mech is our target until it is dropped about 1.7 s after it left the list; the scene runs 3.6 s, inside the 4 s window)
  const farM = run({ svFarm: 'laser' }, beam(crP, { mech: mP }), { n: 36 }), nearM = run({ svFarm: 'laser' }, beam(crN, { mech: mP }), { n: 36 })
  check('CB2 a mech seen in the last 4 s: 50 m reach (far crate no, near crate yes)', !(farM.c.svCbStart > 0) && nearM.c.svCbBeam === 1, `far ${svc(farM.c)} near ${svc(nearM.c)} | near first beam decision ${nearM.tr.findIndex((s) => s.endsWith('cratebeam'))}`)
  const cd = run({ svFarm: 'laser' }, (k, t) => obsB(k, t, { laser: { charge: 0, cooldown: 1.0 }, crates: [{ id: 1101, pos: [crP.x, crP.y, crP.z], hp: 300 }] }), { n: 6 })
  check('CB3 laser on cooldown: no beam', !(cd.c.svCbStart > 0), svc(cd.c))
  const weak = run({ svFarm: 'laser' }, (k, t) => obsB(k, t, { laser: {}, crates: [{ id: 1101, pos: [crP.x, crP.y, crP.z], hp: 60 }] }), { n: 6 })
  check('CB4 a nearly broken crate (60 hp): left to the gun', !(weak.c.svCbStart > 0), svc(weak.c))
} else check('svFarm scene geometry', false, `far ${!!crP} near ${!!crN}`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
