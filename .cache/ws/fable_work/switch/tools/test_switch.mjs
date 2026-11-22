// Fable switch panel unit tests: trigger of each preset in the SQUAD posture, and T-F2 (forced FFA byte-identical to the old
// value) + firewall (one foreign death -> identical). usage: bun test_switch.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch'
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
  const off = Object.keys(PRESETS[key])[0]
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
if (tgtP && dropNear && dropFar) {
  const fight = (o = {}) => (k, t) => obsB(k, t, { hpf: o.hpf || 1, mechs: [mech(10, tgtP), ...(o.extra || [])], events: k % (o.every || 10) === 0 ? [hit(10, tgtP, o.dmg || 45)] : [], drops: o.drops })
  const r1 = tf2('DL1 landed drop 20-30 m away, hostile target with a line, hp 100%', 'dropLife', 'on', fight({ drops: [drop(dropNear, 0)] }), {}, (on, of) => `off ${of.last.slice(-18)} on ${on.last.slice(-18)} dlCap ${on.c.dlCap}`)
  check('DL1b capture: DROP outranks FIGHT, the target is kept and the trigger is down', r1.on.B.mode === 'DROP' && !!r1.on.B.target && r1.on.tr.some((s) => s.includes('"fire":[true')) && r1.of.B.mode === 'FIGHT', `on mode ${r1.on.B.mode} leg ${r1.on.B.legKind} target ${r1.on.B.target && r1.on.B.target.id}`)
  const r2 = tf2('DL2 announced drop 140-170 m away landing in 12 s (pull out of the fight)', 'dropLife', 'on', fight({ drops: [drop(dropFar, 12)] }), { dbg: (B, k) => { if (k === 5 && process.env.DBG) console.log('DL2', JSON.stringify(B.dl), B.A, B.me.walk, B.drops.length, B.lastStand, B.hunt.firewall()) } }, (on) => `on ${on.last.slice(-20)} dlGo ${on.c.dlGo} dlPull ${on.c.dlPull}`)
  check('DL2b pull: mode stays FIGHT, legs dropgo', r2.on.B.mode === 'FIGHT' && r2.on.B.legKind === 'dropgo' && r2.on.c.dlPull > 0, `mode ${r2.on.B.mode} leg ${r2.on.B.legKind}`)
  same('DL3 drop 20-30 m away landing in 25 s: not yet time to walk, no pull', 'dropLife', 'on', fight({ drops: [drop(dropNear, 25)] }), {})
  const inRing = { x: dropNear.x + 3, y: dropNear.y, z: dropNear.z }
  const r4 = run({ dropLife: 'on' }, fight({ drops: [drop(dropNear, 0, { holder: 11, progress: 1 })], extra: [mech(11, inRing)] }), {})
  check('DL4 contest: another mech inside the ring -> no capture stand (mode FIGHT), counted', r4.B.mode === 'FIGHT' && !r4.c.dlCap && r4.c.dlContest > 0, `mode ${r4.B.mode} dlContest ${r4.c.dlContest} inRing ${r4.B.dl && r4.B.dl.inRing}`)
  const r5 = run({ dropLife: 'on' }, fight({ hpf: 0.12, dmg: 120, every: 1, drops: [drop(dropNear, 0)] }), { n: 30 })
  check('DL5 hp rule: hp 12% under 100+ dps cannot pay the walk + capture -> no capture, no pull', !!r5.B.dl && r5.B.dl.hpOk === false && r5.B.dl.capture === false && r5.B.dl.go === false && r5.c.dlNoHp > 0, `A ${r5.B.A.toFixed(0)} hp ${r5.B.me.hp.toFixed(0)} tIn ${r5.B.dl && r5.B.dl.tIn.toFixed(1)} mode ${r5.B.mode}`)
  const farAway = ring(300, 340, () => true)[0]
  if (farAway) same('DL6 drop 300+ m away landing in 5 s (not reachable by landing + dlLateS)', 'dropLife', 'on', fight({ drops: [drop(farAway, 5)] }), {})
  const r7 = tf2('DL7 no target, announced drop landing in 10 s 140-170 m away (idle legs go to the ring)', 'dropLife', 'on', (k, t) => obsB(k, t, { drops: [drop(dropFar, 10)] }), {}, (on, of) => `off ${of.last.slice(-14)} on ${on.last.slice(-14)}`)
  const mk9 = (k, t) => obsB(k, t, { drops: [drop(dropFar, 25)] })
  const r9 = run({ dropLife: 'idle' }, mk9, {}), r9on = run({ dropLife: 'on' }, mk9, {}), r9off = run({ dropLife: 'off' }, mk9, {})
  const r9f = run({ dropLife: 'idle' }, mk9, { env: 'ffa' }), r9f0 = run({ dropLife: 'off' }, mk9, { env: 'ffa' }), r9d = run({ dropLife: 'idle' }, mk9, { fd: 1 }), r9d0 = run({ dropLife: 'off' }, mk9, { fd: 1 })
  check("DL9 value 'idle': no target, drop 140-170 m away just announced (25 s): idle walks to it (DROP / dropgo), on = off; FFA and firewall identical to off", r9.B.mode === 'DROP' && r9.B.legKind === 'dropgo' && r9.c.dlIdle > 0 && r9on.s === r9off.s && r9f.s === r9f0.s && r9d.s === r9d0.s, `idle ${r9.last.slice(-14)} on ${r9on.last.slice(-12)} dlIdle ${r9.c.dlIdle}`)
  const r9b = run({ dropLife: 'idle' }, fight({ drops: [drop(dropNear, 25)] }), {}), r9b0 = run({ dropLife: 'off' }, fight({ drops: [drop(dropNear, 25)] }), {})
  check("DL9b value 'idle' with a target and not yet time to walk: the fight is untouched", r9b.s === r9b0.s, `last ${r9b.last.slice(-20)}`)
  // numbers come from the observation / config: a 20 m ring with a mech 12 m from the centre is contested, with the 8 m ring it is not
  const m12 = { x: dropNear.x + 12, y: dropNear.y, z: dropNear.z }
  const big = run({ dropLife: 'on' }, (k, t) => obsB(k, t, { mechs: [mech(10, tgtP), mech(11, m12)], events: [hit(10, tgtP)], drops: [{ ...drop(dropNear, 0), radius: 20 }] }), {})
  const small = run({ dropLife: 'on' }, (k, t) => obsB(k, t, { mechs: [mech(10, tgtP), mech(11, m12)], events: [hit(10, tgtP)], drops: [drop(dropNear, 0)] }), {})
  check('DL8 ring radius is read from the drop (20 m ring contested by a mech at 12 m, 8 m ring not)', big.B.dl.inRing === 1 && small.B.dl.inRing === 0 && small.B.dl.radius === cfg.drops.radius, `radius ${big.B.dl.radius} / ${small.B.dl.radius}`)
} else check('dropLife scene', false, 'no geometry')

// ---------------------------------------------------------------- util
{
  const A = ring(80, 100, (p) => lineBoth(me0, p))[0]
  const Bp = A ? ring(80, 110, (p) => lineBoth(me0, p) && Math.abs(Math.atan2(Math.sin(p.a - A.a), Math.cos(p.a - A.a))) > 1.75)[0] : null
  if (A && Bp) {
    // T-U2: hp 55%, A at 30% hp is the target and fires, then B (100%) starts firing harder from > 100 deg away
    const mk = (k, t) => obsB(k, t, { hpf: 0.55, alive: 13, mechs: [mech(20, A, { hpf: 0.3 }), mech(21, Bp)], events: k < 8 ? [hit(20, A, 20)] : [hit(20, A, 20), hit(21, Bp, 60)] })
    const r = tf2('U2 target discipline (2 lines, torso veto toward a fresh attacker)', 'util', 'tgt', mk, { n: 40 }, (on, of) => `off target ${of.B.target && of.B.target.id} on target ${on.B.target && on.B.target.id} keep ${on.c.uTgtKeep || 0} switch ${on.c.uTgtSwitch || 0} vetoes ${on.c.aimVetoes || 0}`)
    check('U2b tgt stays on the 30% mech; off turned to the fresh attacker at least once', r.on.tr.slice(10).every((s) => s.endsWith('/20')) && r.of.tr.some((s) => s.endsWith('/21')), `on last ${r.on.last.slice(-12)}`)
    // T-U4: hp 12%, both fresh and firing hard (pK 0 for all): base pick
    const mk4 = (k, t) => obsB(k, t, { hpf: 0.12, alive: 13, mechs: [mech(20, A), mech(21, Bp)], events: [hit(20, A, 60), hit(21, Bp, 60)] })
    const r4 = run({ util: 'tgt' }, mk4, { n: 25 }), r40 = run({ util: 'off' }, mk4, { n: 25 })
    check('U4 every U_F 0 (hp 12%, two fresh attackers): tgt returns the base pick', r4.tr.map((s) => s.split('/').pop()).join() === r40.tr.map((s) => s.split('/').pop()).join() && (r4.c.uTgtNone || 0) > 0, `uTgtNone ${r4.c.uTgtNone}`)
  } else check('util tgt scene', false, 'no geometry')
  const far = ring(110, 130, (p) => !lineAny(me0, p))[0]
  if (far) {
    const calm = (o = {}) => (k, t) => obsB(k, t, { hpf: o.hpf || 0.72, alive: o.alive || 13, laser: o.laser, mechs: [mech(30, far, { aim: Math.atan2(me0.y - far.y, me0.x - far.x) + 1.0, hpf: o.mhpf || 1 })], events: o.hitFrom !== undefined && k >= o.hitFrom ? [hit(30, far)] : [] })
    const r = tf2('U5 wait: gun only, k 3, hp 72%, calm mech at 110-130 m without a line', 'util', 'wait', calm(), { n: 20, dbg: (B, k) => { if (k === 5 && process.env.DBG && B.util) { const tr = B.trackList[0]; console.log('U5', JSON.stringify(B.util.state()), tr && [tr.hostile, tr.losIn, tr.dist, tr.finishable, B.util.uFight(tr, true)], B.nLos, B.aliveN, B.foreignDeaths) } } }, (on, of) => `off ${of.last.slice(-16)} on ${on.last.slice(-16)} uHold ${on.c.uHold}`)
    check('U5b wait: target null, legs uwait; off: target = the mech', r.on.B.target === null && r.on.B.legKind === 'uwait' && r.on.c.uHold > 0 && !!r.of.B.target && r.of.B.target.id === 30, `on target ${r.on.B.target} leg ${r.on.B.legKind}`)
    const r6 = run({ util: 'wait' }, calm({ hitFrom: 12 }), { n: 16 })
    check('U6 the withheld mech hits us: the wait ends on that decision (target = it, mode FIGHT)', r6.tr[11].endsWith('/-') && r6.tr[12].endsWith('/30') && r6.B.mode === 'FIGHT', `${r6.tr[11].slice(-14)} -> ${r6.tr[12].slice(-14)} -> ${r6.last.slice(-16)}`)
    same('U7a k 1 (15 alive)', 'util', 'wait', calm({ alive: 15 }), { n: 20 })
    same('U7b laser held', 'util', 'wait', calm({ laser: true }), { n: 20 })
    same('U7c hp 96%', 'util', 'wait', calm({ hpf: 0.96 }), { n: 20 })
    same('U7d the mech is finishable (hp 3%)', 'util', 'wait', calm({ mhpf: 0.03 }), { n: 20 })
    const r8 = run({ util: 'wait' }, calm(), { n: 215 })
    const i0 = r8.tr.findIndex((s) => s.includes('/uwait')), i1 = r8.tr.findIndex((s, i) => i > i0 && !s.endsWith('/-'))
    const again = r8.tr.findIndex((s, i) => i > i1 && s.includes('/uwait'))
    check('U8 wait limit: ends after uWaitMaxS 14 s, not re-entered for uWaitRearmS 6 s', i0 >= 0 && i1 > 0 && Math.abs((i1 - i0) * 0.1 - 14) <= 0.3 && (again < 0 || (again - i1) * 0.1 >= 5.9), `wait ${((i1 - i0) * 0.1).toFixed(1)} s, re-entry after ${again < 0 ? 'none in the run' : ((again - i1) * 0.1).toFixed(1) + ' s'}`)
    const ron = tf2('U-on: both parts (wait scene)', 'util', 'on', calm(), { n: 20 }, (on) => `uHold ${on.c.uHold}`)
  } else check('util wait scene', false, 'no geometry')
}
// ---------------------------------------------------------------- pauseMove
{
  let found = null
  const T = ring(95, 110, (p) => lineBoth(me0, p))
  for (const tp of T) {
    const ux = (tp.x - me0.x) / Math.hypot(tp.x - me0.x, tp.y - me0.y), uy = (tp.y - me0.y) / Math.hypot(tp.x - me0.x, tp.y - me0.y), st = cfg.mech.walk_speed * 0.7
    const sides = [{ x: me0.x - uy * st, y: me0.y + ux * st }, { x: me0.x + uy * st, y: me0.y - ux * st }]
    const H = ring(40, 160, (p) => !lineAny(me0, p) && sides.some((s) => world.shotClear(p.x, p.y, p.z + 7, s.x, s.y, me0.z + 4.5)), me0, 12)
    for (const h of H) {
      const mk = (k, t) => obsB(k, t, { mechs: [mech(40, tp), mech(41, h, { aim: 0 })], events: [hit(40, tp)] })
      const on = run({ pauseMove: 'on' }, mk, { n: 30 })
      if ((on.c.pmPause || 0) > 0) { found = { mk, on }; break }
    }
    if (found) break
  }
  if (found) {
    tf2('PM1 strafe-side line test (a hidden non-target mech would get a line on the strafe point)', 'pauseMove', 'on', found.mk, { n: 30 }, (on) => `pmPause ${on.c.pmPause} pmStand ${on.c.pmStand || 0}`)
  } else check('PM1 strafe scene', false, 'no geometry found')
}
// isolate scene (shared by pauseMove walk test and isoDwell): two hostile mechs at 80 / 100 m with lines, both hitting us
const pts = []
for (let k = 0; k < 72 && pts.length < 2; k++) {
  const r = pts.length === 0 ? 80 : 100, a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y)) continue
  const p = { x, y, z: nav.levelAt(x, y), a }
  if (p.z - world.ground(x, y) < 1 && lineBoth(me0, p) && (pts.length === 0 || Math.abs(a - pts[0].a) > 0.5)) pts.push(p)
}
if (pts.length === 2) {
  const cell = (d, ang = 0) => ({ x: me0.x - Math.cos(pts[0].a + ang) * d, y: me0.y - Math.sin(pts[0].a + ang) * d })
  const mkI = (o = {}) => (k, t) => obsB(k, t, { pos: o.pos && k >= (o.posFrom || 0) ? o.pos : undefined, mechs: pts.map((p, i) => mech(30 + i, p, { hpf: i === 0 && o.t0hpf ? o.t0hpf : 1 })), events: [hit(30, pts[0]), hit(31, pts[1])] })
  const goal = (B, c, xo = 0) => Object.assign(B.posGoal, { ok: true, kind: 'fight', x: c.x, y: c.y, xOther: xo, los: true, t: B.me.t, t0: B.me.t })
  // pauseMove walk test: the posEval cell is exposed to the other mech (xOther 1) -> stand-off instead of the isolate walk
  tf2('PM2 isolate cell with exposure to the non-target mech (xOther > 0): no walk', 'pauseMove', 'on', mkI(), { n: 10, pre: (B, k) => { if (k >= 6) goal(B, cell(25), 1) } }, (on, of) => `off ${of.last.slice(-14)} on ${on.last.slice(-14)} pmIsoNo ${on.c.pmIsoNo}`)
  // isoDwell T: (a) cell change inside isoCellS: the committed cell is kept
  const preA = (B, k) => { if (k === 6) goal(B, cell(25)); if (k >= 7) goal(B, cell(25, 0.6)) }
  const rA = tf2('ID1 isolate goal jumps 15 m on the next evaluation', 'isoDwell', 'on', mkI(), { n: 12, pre: preA }, (on, of) => `goal on ${on.B.goalX.toFixed(1)},${on.B.goalY.toFixed(1)} off ${of.B.goalX.toFixed(1)},${of.B.goalY.toFixed(1)}`)
  const c0 = cell(25), c1 = cell(25, 0.6)
  check('ID1b on keeps the committed cell, off walks to the new one', Math.hypot(rA.on.B.goalX - c0.x, rA.on.B.goalY - c0.y) < 3 && Math.hypot(rA.of.B.goalX - c1.x, rA.of.B.goalY - c1.y) < 3 && rA.on.B.legKind === 'isolate', `on leg ${rA.on.B.legKind}`)
  // (b) arrival: we stand 2 m from the cell: on holds it for isoStayS (legs isolate), off drops to the stand-off at once
  const near = cell(2.2), posN = [near.x, near.y, me0.z]
  const rB = run({ isoDwell: 'on' }, mkI({ pos: posN, posFrom: 8 }), { n: 22, pre: (B, k) => { if (k >= 6) goal(B, cell(4.2)) } })
  const rB0 = run({ isoDwell: 'off' }, mkI({ pos: posN, posFrom: 8 }), { n: 22, pre: (B, k) => { if (k >= 6) goal(B, cell(4.2)) } })
  const holdN = rB.tr.slice(8).filter((s) => s.includes('/isolate/')).length, holdN0 = rB0.tr.slice(8).filter((s) => s.includes('/isolate/')).length
  check('ID2 arrival: the cell is held for isoStayS 0.8 s, then released; off leaves at once', (rB.c.isoHold || 0) >= 7 && rB.c.isoHold <= 9 && rB.tr.slice(8, 16).every((s) => s.includes('/isolate/')) && holdN0 < 8 && !(rB0.c.isoHold > 0), `isolate decisions after arrival on ${holdN} off ${holdN0} isoHold ${rB.c.isoHold}`)
  // (c) target change: out at once (the first mech disappears below 25% rule: swap ids so the target changes)
  const mkC = (k, t) => obsB(k, t, { mechs: k < 8 ? pts.map((p, i) => mech(30 + i, p)) : [mech(31, pts[1])], events: k < 8 ? [hit(30, pts[0]), hit(31, pts[1])] : [hit(31, pts[1])] })
  const rC = run({ isoDwell: 'on' }, mkC, { n: 12, pre: (B, k) => { if (k === 6) goal(B, cell(25)) } })
  const rC0 = run({ isoDwell: 'off' }, mkC, { n: 12, pre: (B, k) => { if (k === 6) goal(B, cell(25)) } })
  check('ID3 target change: isolate is left at once (same legs as off after the change)', rC.tr.slice(9).every((s, i) => s.split('/').slice(-2).join('/') === rC0.tr.slice(9)[i].split('/').slice(-2).join('/')), `on ${rC.last.slice(-16)} off ${rC0.last.slice(-16)}`)
} else check('isolate scene', false, 'no geometry')
// ---------------------------------------------------------------- upgFix
{
  const offer = { id: 7, choices: [{ id: 'mortar_velocity' }, { id: 'mortar_reload' }, { id: 'mortar_velocity' }] }
  const mk = (k, t) => obsB(k, t, { offer: k >= 2 ? offer : null })
  const pk = (r) => { const m = /"pick":(\d)/.exec(r.last); return m ? +m[1] : -1 }
  const r = tf2('UF1 offer mortar_velocity / mortar_reload / mortar_velocity', 'upgFix', 'on', mk, { n: 4 }, (on, of) => `pick off ${pk(of)} on ${pk(on)}`)
  const ups = cfg.upgrades.map((u) => u.id)
  check('UF2 validation at match start in every value: 2 unknown ids counted; on: fixed order holds only config ids, all of them', r.of.c.upgUnknown === 2 && r.on.c.upgUnknown === 2 && r.of.B.upgCheck.unknown.join() === 'mortar_damage,mortar_rate' && r.on.B.upgOrder.every((id) => ups.includes(id)) && ups.every((id) => r.on.B.upgOrder.includes(id)) && r.of.B.upgOrder === null,
    `unknown ${r.of.B.upgCheck.unknown} missing ${r.of.B.upgCheck.missing} fixed tail ${r.on.B.upgOrder.slice(17).join(',')}`)
  const sp = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, select: { ...FNV, upg: 'speed', upgFix: 'on' } })._B
  check('UF3 upg speed + upgFix on: order valid', sp.upgOrder.every((id) => ups.includes(id)) && sp.upgOrder[2] === 'servos', sp.upgOrder.slice(0, 4).join(','))
}
// ---------------------------------------------------------------- FU
{
  const mk = (k, t) => obsB(k, t, { mechs: pts.length === 2 ? pts.map((p, i) => mech(30 + i, p)) : [], events: pts.length === 2 ? [hit(30, pts[0]), hit(31, pts[1])] : [] })
  const wall = run({ fuse: 'wall' }, mk, { n: 20, ov: { fuseMs: -1 } }), work = run({ fuse: 'work' }, mk, { n: 20, ov: { fuseMs: -1 } }), work0 = run({ fuse: 'work' }, mk, { n: 20, ov: { fuseExpand: -1 } }), ref = run({ fuse: 'wall' }, mk, { n: 20 })
  check('FU: wall fuse trips on the clock (fuseMs -1), work fuse ignores it and equals the no-trip run; trips on the cell count (fuseExpand -1)', wall.c.fuse > 0 && work.c.fuse === 0 && work.s === ref.s && work0.c.fuse > 0, `fuse wall ${wall.c.fuse} work ${work.c.fuse} work/expand ${work0.c.fuse}`)
}
console.log(`\n${pass}/${pass + fail} switch checks passed`)
process.exit(fail ? 1 : 0)
