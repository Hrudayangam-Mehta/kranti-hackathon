// Wave-2 C trigger / T-F2 tests for lib/move2.js (mv_flip, mv_close, mv_zig, mv_arc, mv_rim, mv_meas). For every rule one
// synthetic scene of its trigger: in the SQUAD posture it acts (its counter moves, the action / leg trace differs from 'off');
// with env forced to FFA and after one foreign death the trace is identical to 'off'. Scene machinery follows
// fable_work/chaos/tools/test_chaos.mjs (same team). usage: bun test_move2.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const W = S + '/fable_work/chaos'
const BOT = process.argv[2] || S + '/fable_work/w2/C/tree'
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { PRESETS, SELECT, PARAMS, resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const Wp = cfg.weapons, HP = cfg.mech.hp
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const lineBoth = (a, b) => world.shotClear(a.x, a.y, a.z + 7, b.x, b.y, b.z + 4.5) && world.shotClear(b.x, b.y, b.z + 7, a.x, a.y, a.z + 4.5)
function ring(r0, r1, pred, from = me0, max = 1, a0 = 0) {
  const out = []
  for (let r = r0; r <= r1 && out.length < max; r += 5) for (let k = 0; k < 72 && out.length < max; k++) {
    const a = a0 + k * Math.PI / 36, x = from.x + r * Math.cos(a), y = from.y + r * Math.sin(a)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
    const p = { x, y, z: nav.levelAt(x, y), a }
    if (p.z - world.ground(x, y) < 1 && pred(p)) out.push(p)
  }
  return out
}
const zone0 = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const obsB = (k, t, o = {}) => {
  const ob = { type: 'obs', tick: 2 * k, t, alive: o.alive || 16, self: { id: 3, pos: o.pos || [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: o.aim || [0, 0], hp: HP * (o.hpf || 1), max_hp: HP,
    energy: o.energy === undefined ? 100 : o.energy, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
    weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, o.charge !== undefined ? { kind: 'laser', cooldown: 0, charge: o.charge, stats: Wp.laser } : null], stats: cfg.mech },
  mechs: o.mechs || [], projectiles: o.proj || [], crates: [], cubes: o.cubes || [], pickups: o.pickups || [], sounds: [], beams: [], events: o.events || [], drops: [], zone: o.zone || zone0, offer: null }
  return ob
}
const mech = (id, p, o = {}) => ({ id, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [o.aim === undefined ? Math.atan2(me0.y - p.y, me0.x - p.x) : o.aim, 0], hp: HP * (o.hpf || 1), max_hp: HP, cubes: 0, weapons: o.weapons || ['gun'], charging: false })
const hit = (id, p, amount = 45, extra = {}) => ({ type: 'damaged', amount, weapon: 'gun', bearing: Math.atan2(p.y - me0.y, p.x - me0.x), by: id, ...extra })
/** a gun bullet from p toward us, first seen 30 m out of the muzzle */
const bullet = (id, p) => { const dx = me0.x - p.x, dy = me0.y - p.y, l = Math.hypot(dx, dy); const ux = dx / l, uy = dy / l; return { id, kind: 'gun', pos: [p.x + ux * 30, p.y + uy * 30, p.z + 6], vel: [ux * Wp.gun.speed, uy * Wp.gun.speed, -0.5] } }
/** Run a scripted scene; returns the trace, the brain and its counters. o.fd = foreign deaths from the start, o.noMap = no world / nav. */
function run(sel, mk, o = {}) {
  const ctx = o.noMap ? { world: null, nav: null, log: () => {} } : { world, nav, log: () => {} }
  const b = createBrain(hello, ctx, { warmup: false, fuseMs: 1e9, ...(o.env ? { env: o.env } : {}), ...(o.ov || {}), select: { ...sel } }), B = b._B
  const tr = [], n = o.n || 14
  for (let j = 0; j < 2; j++) { const o0 = obsB(0, (o.t0 || 60) - 0.2 + j * 0.1, { zone: mk(0, 60).zone }); o0.alive = mk(0, 60).alive - (j ? (o.fd || 0) : 0); o0.tick = -4 + 2 * j; b.act(o0, performance.now() + 1e6) }
  for (let k = 0; k < n; k++) {
    if (o.pre) o.pre(B, k)
    const ob = mk(k, (o.t0 || 60) + k * 0.1); if (o.fd) ob.alive -= o.fd
    const a = b.act(ob, performance.now() + 1e6)
    tr.push(JSON.stringify(a) + B.mode + '/' + B.legKind + '/' + (B.target ? B.target.id : '-'))
  }
  return { s: tr.join('|'), last: tr[tr.length - 1], tr, B, c: B.counters }
}
const legs = (r) => r.tr.map((s) => s.split('}').slice(-1)[0].split('/')[1])
const hist = (a) => { const h = {}; for (const x of a) h[x] = (h[x] || 0) + 1; return JSON.stringify(h) }
/** on acts (trace differs from off), forced FFA and one foreign death are identical to off. */
function tf2(name, key, mk, o = {}, detail = () => '') {
  const sel = { [key]: 'on', ...(o.sel || {}) }, sel0 = { [key]: 'off', ...(o.sel || {}) }
  const on = run(sel, mk, o), of = run(sel0, mk, o)
  const fOn = run(sel, mk, { ...o, env: 'ffa' }), fOf = run(sel0, mk, { ...o, env: 'ffa' })
  const dOn = run(sel, mk, { ...o, fd: 1 }), dOf = run(sel0, mk, { ...o, fd: 1 })
  const ok = on.s !== of.s && fOn.s === fOf.s && dOn.s === dOf.s
  check(`${name}: ${key} 'on' acts in SQUAD; forced FFA and one foreign death identical to 'off'`, ok, `SQUAD differs ${on.s !== of.s}, FFA identical ${fOn.s === fOf.s}, firewall identical ${dOn.s === dOf.s} | ${detail(on, of)}`)
  return { on, of, fOn, dOn }
}

// ---------------------------------------------------------------- defaults
{
  const P0 = resolveParams({})
  const keys = ['mv_meas', 'mv_flip', 'mv_close', 'mv_zig', 'mv_arc', 'mv_rim']
  check('defaults: every mv_ preset at its old value; B.mv2 not created', keys.every((k) => SELECT[k] === 'off' && Object.keys(PRESETS[k])[0] === 'off' && Object.keys(PRESETS[k].off).length === 0) &&
    !P0.mvMeas && !P0.mvFlip && !P0.mvClose && !P0.mvZig && !P0.mvArc && !P0.mvRim && createBrain(hello, { world, nav, log: () => {} }, { warmup: false })._B.mv2 === undefined,
  keys.map((k) => k + ':' + SELECT[k]).join(' '))
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, select: { mv_meas: 'on' } })
  check('mv_meas on: B.mv2 created', !!b._B.mv2, 'ok')
}
const pT = ring(138, 145, (p) => lineBoth(me0, p))[0]
const p55 = ring(52, 58, (p) => lineBoth(me0, p))[0]
const p100 = ring(98, 104, (p) => lineBoth(me0, p))[0]
const pB = ring(105, 115, (p) => lineBoth(me0, p))[0]
const c50 = ring(45, 55, (p) => nav.walkLine(me0.x, me0.y, p.x, p.y) && (!pB || Math.hypot(p.x - pB.x, p.y - pB.y) > 60))[0]
check('scene geometry', !!(pT && p55 && p100 && pB && c50), `pT ${!!pT} p55 ${!!p55} p100 ${!!p100} pB ${!!pB} c50 ${!!c50}`)

// ---------------------------------------------------------------- F1 mv_flip: a hostile gun at 140 m, open ground
if (pT) {
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, pT)], events: k % 3 === 0 ? [hit(10, pT)] : [] })
  const r = tf2('F1a flip clock at 140 m', 'mv_flip', sc, { n: 50 }, (on, of) => `jinks on ${on.c.jinks} off ${of.c.jinks}, mvFlip ${on.c.mvFlip || 0}, legs ${hist(legs(on))}`)
  check('F1b more reversals (expected interval 0.62 s against U(0.8, 1.6))', (r.on.c.mvFlip || 0) > 0 && r.on.c.jinks > r.of.c.jinks && !(r.fOn.c.mvFlip > 0) && !(r.dOn.c.mvFlip > 0), `jinks ${r.of.c.jinks} -> ${r.on.c.jinks} in 5 s, FFA mvFlip ${r.fOn.c.mvFlip || 0}, fd mvFlip ${r.dOn.c.mvFlip || 0}`)
  // laser charging, a new bullet from the target every decision
  const full = Wp.laser.charge || 0.75
  const sb = (k, t) => obsB(k, t, { charge: 0.3 * full, mechs: [mech(10, pT)], proj: [bullet(5000 + k, pT)], events: k % 3 === 0 ? [hit(10, pT)] : [] })
  const r2 = tf2('F1c new bullets while our laser charges', 'mv_flip', sb, { n: 20 }, (on, of) => `jinks on ${on.c.jinks} off ${of.c.jinks}, mvFlipBul ${on.c.mvFlipBul || 0}`)
  check('F1d bullet flips with the 0.4 s floor', (r2.on.c.mvFlipBul || 0) > 0 && r2.on.c.jinks <= 1 + 20 * 0.1 / 0.4 + 1, `mvFlipBul ${r2.on.c.mvFlipBul || 0}, jinks ${r2.on.c.jinks}`)
  // inside mvFlipMinR (a shooter at 55 m): F1 does not act
  if (p55) {
    const sn = (k, t) => obsB(k, t, { mechs: [mech(10, p55)], events: k % 3 === 0 ? [hit(10, p55)] : [] })
    const a = run({ mv_flip: 'on' }, sn, { n: 30 }), b = run({ mv_flip: 'off' }, sn, { n: 30 })
    check('F1e no F1 flips with the shooter at 55 m', !(a.c.mvFlip > 0) && a.s === b.s, `mvFlip ${a.c.mvFlip || 0}, identical ${a.s === b.s}`)
  }
}
// ---------------------------------------------------------------- F2 mv_close: a hostile gun at 55 m
if (p55) {
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, p55)], events: k % 3 === 0 ? [hit(10, p55)] : [] })
  const r = tf2('F2a back off a gun at 55 m', 'mv_close', sc, { n: 12 }, (on, of) => `legs on ${hist(legs(on))} off ${hist(legs(of))}, backOff70 ${on.c.backOff70 || 0}`)
  const boosts = r.on.tr.filter((s) => s.includes('"boost":true')).length
  const away = r.on.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1))).filter((a) => (a.move[0] * (p55.x - me0.x) + a.move[1] * (p55.y - me0.y)) < 0).length
  check('F2b full stick away with boost, no strafe', (r.on.c.backOff70 || 0) >= 10 && boosts >= 10 && away >= 10, `backOff70 ${r.on.c.backOff70}, boosts ${boosts}, moves away ${away} of 12`)
}
if (p100) {
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, p100)], events: k % 3 === 0 ? [hit(10, p100)] : [] })
  const r = tf2('F2c gun-only band at 100 m', 'mv_close', sc, { n: 8 }, (on, of) => `rPrefNow on ${on.B.rPrefNow} off ${of.B.rPrefNow}`)
  check('F2d band holds 105 m (90-125)', r.on.B.rPrefNow === 105 && r.of.B.rPrefNow === 75, `${r.on.B.rPrefNow} / ${r.of.B.rPrefNow}`)
}
// ---------------------------------------------------------------- F3 mv_zig: a cube grab at 50 m under a gun at 110 m
if (pB && c50) {
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, pB)], events: k % 3 === 0 ? [hit(10, pB)] : [], cubes: [{ id: 701, pos: [c50.x, c50.y, c50.z] }] })
  const r = tf2('F3a zigzag cube walk under fire', 'mv_zig', sc, { n: 14 }, (on, of) => `legs on ${hist(legs(on))} off ${hist(legs(of))}, zigWalk ${on.c.zigWalk || 0}`)
  // heading of the move relative to the straight line to the cube: about +-45 deg when zigging
  const ang = (r) => r.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1))).map((a) => Math.round(Math.atan2(a.move[1], a.move[0]) * 180 / Math.PI))
  check('F3b grab legs rotated, both signs', (r.on.c.zigWalk || 0) >= 8 && legs(r.on).filter((k) => k === 'grab').length >= 8, `zigWalk ${r.on.c.zigWalk}, headings on ${ang(r.on).join(',')} off ${ang(r.of).join(',')}`)
}
// ---------------------------------------------------------------- F4 mv_arc: target ahead, a second line 120 deg off (no map: no isolate)
{
  const a0 = 0.3, T = { x: me0.x + 100 * Math.cos(a0), y: me0.y + 100 * Math.sin(a0), z: me0.z }, H = { x: me0.x + 100 * Math.cos(a0 + 2.1), y: me0.y + 100 * Math.sin(a0 + 2.1), z: me0.z }
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, T, { hpf: 0.6 }), mech(11, H)], events: k % 3 === 0 ? [hit(10, T)] : k % 3 === 1 ? [hit(11, H)] : [] })
  const r = tf2('F4a arc back (second line 120 deg off, no map)', 'mv_arc', sc, { n: 14, noMap: true }, (on, of) => `legs on ${hist(legs(on))} off ${hist(legs(of))}, arcBack ${on.c.arcBack || 0}, target ${on.B.target && on.B.target.id}`)
  const tgtId = r.on.B.target ? r.on.B.target.id : -1, U = tgtId === 11 ? H : T, A = tgtId === 11 ? T : H
  const mv = r.on.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)).move)
  const ux = (U.x - me0.x) / 100, uy = (U.y - me0.y) / 100, ax = (A.x - me0.x) / 100, ay = (A.y - me0.y) / 100, wx = -(ux + ax), wy = -(uy + ay)
  const back = mv.filter((m) => m[0] * wx + m[1] * wy > 0).length
  check('F4b legs move along -(uT + uA)', (r.on.c.arcBack || 0) >= 10 && back >= 10, `arcBack ${r.on.c.arcBack}, moves with a positive -(uT+uA) part ${back} of 14`)
  // rear hit only: one target ahead, a 'damaged' with rear from 150 deg off by an unseen mech
  const sr = (k, t) => obsB(k, t, { mechs: [mech(10, T)], events: k % 3 === 0 ? [hit(10, T)] : k === 4 ? [{ type: 'damaged', amount: 67, weapon: 'gun', bearing: a0 + 2.6, by: 12, rear: true }] : [] })
  const r2 = tf2('F4c rear hit (1.5 s memory, no map)', 'mv_arc', sr, { n: 12, noMap: true }, (on, of) => `arcBack ${on.c.arcBack || 0}, mvRearDmg ${on.c.mvRearDmg || 0}`)
  check('F4d rear damage counted', (r2.on.c.mvRearDmg || 0) === 67 && (r2.on.c.arcBack || 0) > 0, `mvRearDmg ${r2.on.c.mvRearDmg || 0} arcBack ${r2.on.c.arcBack || 0}`)
}
{
  // isolate cell under F4: two hostile lines, the target ahead, the other 120 deg off; the posEval goal is forced to 35 m
  const a0 = 0.3
  const T = ring(95, 110, (p) => lineBoth(me0, p), me0, 1, a0)[0]
  const H = T && ring(95, 115, (p) => lineBoth(me0, p) && Math.abs(Math.atan2(Math.sin(p.a - T.a), Math.cos(p.a - T.a))) > 1.9, me0, 1, T.a + 1.9)[0]
  if (T && H) {
    const mk = (k, t, en) => obsB(k, t, { energy: en, mechs: [mech(30, T, { hpf: 0.7 }), mech(31, H)], events: [hit(30, T), hit(31, H)] })
    const runI = (v, en, d, o = {}) => {
      const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(o.env ? { env: o.env } : {}), select: { mv_arc: v } }), B = b._B
      for (let k = 0; k < 6; k++) { const ob = mk(k, 40 + k * 0.1, en); if (o.fd) ob.alive -= 1; b.act(ob, performance.now() + 1e6) }
      const back = Math.atan2(me0.y - T.y, me0.x - T.x)
      Object.assign(B.posGoal, { ok: true, kind: 'fight', x: me0.x + Math.cos(back) * d, y: me0.y + Math.sin(back) * d, xOther: 0, los: true, t: B.me.t, t0: B.me.t })
      const ob = mk(6, 40.6, en); if (o.fd) ob.alive -= 1
      const a = b.act(ob, performance.now() + 1e6)
      return { s: JSON.stringify(a) + B.legKind, c: B.counters, leg: B.legKind, boost: a.boost }
    }
    const on = runI('on', 40, 35), of = runI('off', 40, 35)
    check('F4e isolate cell at 35 m refused at energy 40 (walk reach 25 m)', (on.c.coverRefused || 0) > 0 && on.s !== of.s && runI('on', 40, 35, { env: 'ffa' }).s === runI('off', 40, 35, { env: 'ffa' }).s,
      `on ${on.leg} refused ${on.c.coverRefused || 0} near ${on.c.coverNear || 0} | off ${of.leg}`)
    const on2 = runI('on', 100, 35)
    check('F4f info: same cell at energy 100 (boost reach 45 m): taken with boost if it cuts a line', true, `leg ${on2.leg} boost ${on2.boost} near ${on2.c.coverNear || 0} refused ${on2.c.coverRefused || 0}`)
  } else check('F4 isolate geometry', false, `T ${!!T} H ${!!H}`)
}
// ---------------------------------------------------------------- F5 mv_rim: zone 'far' trigger, then the rim pull in a fight
{
  // next centre 0.85 nr from us, shrink in 5 s: the legacy 'far' trigger fires (ZONE); the rim rule keeps us (inside the next circle)
  const nr = 380, ang = Math.atan2(bd.maxY - me0.y, bd.maxX - me0.x)
  const nc = [me0.x + Math.cos(ang) * 0.85 * nr * 0.6, me0.y + Math.sin(ang) * 0.85 * nr * 0.6]
  // keep the next centre inside the arena: shrink the radius so that dNext / nr = 0.85
  const dN = Math.hypot(nc[0] - me0.x, nc[1] - me0.y), nr2 = dN / 0.85
  const zf = { center: nc, radius: nr2 * 1.5, next_center: nc, next_radius: nr2, shrink_start: 65, shrink_end: 115, dps: 20 }
  const sc = (k, t) => obsB(k, t, { zone: zf })
  const r = tf2('F5a no ZONE walk from 0.85 nr before the shrink (idle)', 'mv_rim', sc, { n: 12 }, (on, of) => `modes on ${hist(on.tr.map((s) => s.split('}').slice(-1)[0].split('/')[0]))} off ${hist(of.tr.map((s) => s.split('}').slice(-1)[0].split('/')[0]))}, zoneFarSkipped ${on.c.zoneFarSkipped || 0}, nr ${nr2.toFixed(0)}`)
  check('F5b legacy walks (ZONE), rim holds (zoneFarSkipped)', (r.on.c.zoneFarSkipped || 0) > 0 && r.of.tr.some((s) => s.includes('ZONE/')) && !r.on.tr.some((s) => s.includes('ZONE/')), `zoneFarSkipped ${r.on.c.zoneFarSkipped || 0}`)
  // outside the next circle with the edge close: both walk
  const zo = { center: nc, radius: dN + 6, next_center: nc, next_radius: dN * 0.7, shrink_start: 59, shrink_end: 70, dps: 20 }
  const a = run({ mv_rim: 'on' }, (k, t) => obsB(k, t, { zone: zo }), { n: 6 }), b = run({ mv_rim: 'off' }, (k, t) => obsB(k, t, { zone: zo }), { n: 6 })
  check('F5c edge 6 m away and closing: the rim rule walks too', a.tr.every((s) => s.includes('ZONE/')) && b.tr.every((s) => s.includes('ZONE/')), `on ${a.last.split('}').slice(-1)[0]} off ${b.last.split('}').slice(-1)[0]} rimUrgOnly ${a.c.rimUrgOnly || 0}`)
  // a fight at 0.4 nr: the stand-off is pulled toward the rim
  if (p100) {
    const zi = { center: [me0.x - 0.4 * 380, me0.y], radius: 560, next_center: [me0.x - 0.4 * 380, me0.y], next_radius: 380, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
    const sf = (k, t) => obsB(k, t, { zone: zi, mechs: [mech(10, p100)], events: k % 3 === 0 ? [hit(10, p100)] : [] })
    const r2 = tf2('F5d fight at 0.4 nr: rim pull', 'mv_rim', sf, { n: 10 }, (on, of) => `rimPull ${on.c.rimPull || 0}, rimHold ${on.c.rimHold || 0}`)
    const outw = (r) => r.tr.map((s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)).move[0]).reduce((a, b) => a + b, 0) / r.tr.length
    check('F5e mean outward (+x) stick larger', (r2.on.c.rimPull || 0) > 0 && outw(r2.on) > outw(r2.of) + 0.1, `mean outward stick on ${outw(r2.on).toFixed(2)} off ${outw(r2.of).toFixed(2)}`)
  }
}
// ---------------------------------------------------------------- mv_meas: counters only
if (pT) {
  const sc = (k, t) => obsB(k, t, { mechs: [mech(10, pT)], proj: [bullet(6000 + k, pT)], events: k % 3 === 0 ? [hit(10, pT)] : [] })
  const a = run({ mv_meas: 'on' }, sc, { n: 20 }), b = run({ mv_meas: 'off' }, sc, { n: 20 })
  const mvc = Object.keys(a.c).filter((k) => k.startsWith('mv')).map((k) => k + '=' + a.c[k]).join(' ')
  const sum = (p) => Object.keys(a.c).filter((k) => k.startsWith(p)).reduce((s, k) => s + a.c[k], 0)
  check('M1 mv_meas: identical actions, counters filled', a.s === b.s && sum('mvGunSeen') > 0 && sum('mvGunHit') > 0 && sum('mvLine') > 0, `identical ${a.s === b.s} ` + mvc)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
