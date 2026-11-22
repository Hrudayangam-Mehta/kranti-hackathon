// Tests for the practice profile p26 (MX_p26 lib/prof.js). usage: bun test_p26.mjs
//  1 identity: prof off against MX_base2 on the kit stream (tables '' / '1211111111111111', hello slot 3 as recorded and slot 1);
//    fuseMs 1e9 here (the 30 ms emergency fuse is a wall-clock test and would make a cold-JIT comparison timing-dependent)
//  2 T-F2: env forced FFA, prof p26 against MX_base2 on the kit stream, plus a drop scene that acts in SQUAD
//  3 one synthetic scene per major rule on the kit map (SQUAD posture): gate, fight test, retreat latch, drop priority,
//    grab, reload; each must act under p26 and the off brain must differ (or the p26 rule must be visible in its state)
//  4 worst decision on the kit stream with p26 (warm-up included, as the bot runs)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const SP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const KIT = SP + '/mechbot/kit'
const BASE = SP + '/variants7/MX_base2', NEW = SP + '/variants7/MX_p26'
const lines = gunzipSync(readFileSync(KIT + '/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello0 = lines[0], streamObs = lines.filter((l) => l.type === 'obs')
const cfg = hello0.config, Wp = cfg.weapons
const mods = {}
const ALL = SP + '/variants7/P26_all/bot'
for (const [k, d] of [['base', BASE], ['new', NEW], ['all', ALL]]) mods[k] = { World: (await import(d + '/lib/world.js')).World, Nav: (await import(d + '/lib/nav.js')).Nav, createBrain: (await import(d + '/lib/brain.js')).createBrain }
const world = mods.new.World.loadSync(KIT + '/arena')
const mk = (which, ov, hello) => { const m = mods[which]; return m.createBrain(hello || hello0, { world, nav: new m.Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, ov) }
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  ::  ' + detail : '')); if (ok) pass++; else fail++ }
const clone = (o) => JSON.parse(JSON.stringify(o))
function stream(a, b, n = streamObs.length) {
  let d = 0, first = -1
  for (let i = 0; i < n; i++) {
    const x = JSON.stringify(a.act(clone(streamObs[i]), performance.now() + 1e6)), y = JSON.stringify(b.act(clone(streamObs[i]), performance.now() + 1e6))
    if (x !== y) { d++; if (first < 0) first = i }
  }
  return { d, first }
}

// ---------------------------------------------------------------- 1 identity
for (const tab of ['', '1211111111111111']) for (const slot of [3, 1]) {
  const h = { ...hello0, slot }
  const r = stream(mk('base', { saltTable: tab, warmup: false, fuseMs: 1e9 }, h), mk('new', { saltTable: tab, warmup: false, fuseMs: 1e9 }, h))
  check(`identity prof off vs MX_base2, table '${tab}', slot ${slot}`, r.d === 0, `${streamObs.length} decisions, differ ${r.d}`)
}
{
  const h = { ...hello0, slot: 1 }
  const r = stream(mk('base', { saltTable: '', warmup: false, fuseMs: 1e9 }, h), mk('base', { saltTable: '1211111111111111', warmup: false, fuseMs: 1e9 }, h))
  check(`control: table '1211111111111111' acts on slot 1 (salt 2)`, r.d > 0, `differ ${r.d}`)
}

// ---------------------------------------------------------------- 2 T-F2 forced FFA
{
  const r = stream(mk('base', { env: 'ffa', warmup: false, fuseMs: 1e9 }), mk('new', { env: 'ffa', warmup: false, fuseMs: 1e9, select: { prof: 'p26' } }))
  check('T-F2 kit stream: env ffa, prof p26 identical to MX_base2', r.d === 0, `differ ${r.d}`)
  const ra = stream(mk('base', { env: 'ffa', warmup: false, fuseMs: 1e9 }), mk('all', { env: 'ffa', warmup: false, fuseMs: 1e9 }))
  check('T-F2 kit stream: env ffa, P26_all bundle source (table 1111111111111111 + prof p26) identical to MX_base2', ra.d === 0, `differ ${ra.d}`)
  const r2 = stream(mk('base', { warmup: false }), mk('new', { warmup: false, select: { prof: 'p26' } }))
  check('control: kit stream SQUAD-auto, prof p26 acts (differs from base)', r2.d > 0, `differ ${r2.d}, first ${r2.first}`)
}

// ---------------------------------------------------------------- scenes on the kit map
const nav0 = new mods.new.Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 })
const bd = world.bounds
const q0 = nav0.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
// a standing point with clear lines to the east out to 200 m
let me0 = null
for (let r = 0; r < 300 && !me0; r += 6) for (let k = 0; k < 24 && !me0; k++) {
  const a = k * Math.PI / 12, x = q0.x + r * Math.cos(a), y = q0.y + r * Math.sin(a)
  if (!nav0.passableAt(x, y)) continue
  const z = nav0.levelAt(x, y)
  let ok = nav0.wallDistAt(x, y) > 12
  for (const d of [30, 60, 100, 130, 150, 200]) for (const b of [0, 0.15, -0.15]) {
    const tx = x + d * Math.cos(b), ty = y + d * Math.sin(b), tz = nav0.passableAt(tx, ty) ? nav0.levelAt(tx, ty) : -99
    if (tz < -50 || Math.abs(tz - z) > 3 || !world.shotClear(x, y, z + 7, tx, ty, tz + 4.5) || !world.shotClear(tx, ty, tz + 7, x, y, z + 4.5)) ok = false
  }
  if (ok) me0 = { x, y, z }
}
check('scene map: open standing point found', !!me0, me0 ? `${me0.x.toFixed(0)},${me0.y.toFixed(0)}` : 'none')
const at = (d, b = 0) => { const x = me0.x + d * Math.cos(b), y = me0.y + d * Math.sin(b); return [x, y, nav0.levelAt(x, y)] }
const gunW = (ammo = 12, reload = 0) => ({ kind: 'gun', cooldown: 0, ammo, reload, stats: Wp.gun })
const laserW = () => ({ kind: 'laser', cooldown: 0, charge: 0, stats: Wp.laser })
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
function mech(id, d, b, extra) {
  const p = at(d, b)
  return { id, kind: 'mech', pos: p, vel: [0, 0, 0], aim: [Math.atan2(me0.y - p[1], me0.x - p[0]), 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false, ...(extra || {}) }
}
function obs(k, t, o) {
  return { type: 'obs', tick: 2 * k, t, alive: 16, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * (o.hpf ?? 1), max_hp: 1400, energy: o.energy ?? 100, max_energy: 100, grounded: true,
    cubes: o.cubes ?? 0, upgrades: [], in_zone: true, weapons: o.weapons || [gunW(o.ammo ?? 12), null], stats: cfg.mech }, mechs: o.mechs || [], projectiles: [], crates: o.crates || [], cubes: o.cubeList || [],
    pickups: o.pickups || [], sounds: [], beams: [], events: o.events || [], drops: o.drops || [], zone, offer: null }
}
/** Run a scene: steps [{ n, t0?, ...obs opts, ev(k) -> events }] on a fresh brain; returns per-decision { mode, leg, act, p26 }. */
function scene(which, sel, steps, ov) {
  const b = mk(which, { warmup: false, fuseMs: 1e9, ...(ov || {}), ...(sel ? { select: sel } : {}) })
  const out = []
  let k = 0, t = steps[0].t0 ?? 30
  for (const st of steps) {
    if (st.t0 !== undefined) t = st.t0
    for (let i = 0; i < (st.n || 1); i++) {
      const o = obs(k, t, { ...st, events: st.ev ? st.ev(i) : [] })
      const a = b.act(o, performance.now() + 1e6)
      const d = b.debugState()
      out.push({ t, mode: d.mode, leg: d.leg, tgt: d.target, a, p26: d.p26, hold: b._B.holdFire, ctr: { ...b._B.counters }, B: b._B })
      k++; t = +(t + 0.1).toFixed(2)
    }
  }
  return out
}
const last = (r) => r[r.length - 1]
const P26 = { prof: 'p26' }
const hit = (by, amt = 45) => [{ type: 'damaged', amount: amt, weapon: 'gun', bearing: 0, by }]

// 3a gate: t 30 s, a mech at 130 m with a line hits us every decision: not answered (keeps farming above 70%), hides at
// 65%; the same mech at 80 m is answered
{
  const steps = [{ t0: 30, n: 12, mechs: [mech(5, 130, 0)], ev: (i) => (i % 2 ? hit(5) : []), cubeList: [{ id: 5001, pos: at(40, Math.PI) }] }]
  const p = scene('new', P26, steps), o = scene('new', null, steps)
  check('gate: hunter at 130 m hitting us is not answered (no target, not FIGHT)', last(p).tgt === null && last(p).mode !== 'FIGHT' && last(p).p26.phase === 'gate',
    `p26 ${last(p).mode}/${last(p).leg} tgt ${last(p).tgt} | off ${last(o).mode}/${last(o).leg} tgt ${last(o).tgt}`)
  const steps2 = [{ t0: 30, n: 12, hpf: 0.65, mechs: [mech(5, 130, 0)], ev: (i) => (i % 2 ? hit(5) : []) }]
  const p2 = scene('new', P26, steps2)
  check('gate: under 70% it hides (DISENGAGE) without answering', last(p2).mode === 'DISENGAGE' && last(p2).tgt === null && (last(p2).B.counters.pfGateHide || 0) > 0, `${last(p2).mode} tgt ${last(p2).tgt}`)
  const steps3 = [{ t0: 30, n: 12, mechs: [mech(5, 80, 0)], ev: (i) => (i % 2 ? hit(5) : []) }]
  const p3 = scene('new', P26, steps3)
  check('gate: the same hunter at 80 m is answered (target, FIGHT)', last(p3).tgt === 5 && last(p3).mode === 'FIGHT', `${last(p3).mode} tgt ${last(p3).tgt}`)
  const steps4 = [{ t0: 80, n: 12, mechs: [mech(5, 200, 0)] }]
  const p4 = scene('new', P26, steps4)
  check('after the opening: a calm mech at 200 m is attacked on sight above 35%', last(p4).tgt === 5 && last(p4).mode === 'FIGHT' && last(p4).p26.phase === 'open', `${last(p4).mode} tgt ${last(p4).tgt} phase ${last(p4).p26.phase}`)
  const steps5 = [{ t0: 80, n: 12, hpf: 0.3, mechs: [mech(5, 200, 0)] }]
  const p5 = scene('new', P26, steps5)
  check('after the opening: at 30% hp a calm mech at 200 m is not a target', last(p5).tgt === null, `${last(p5).mode} tgt ${last(p5).tgt}`)
  const steps6 = [{ t0: 10, n: 12, mechs: [mech(5, 130, 0, { aim: [0, 0] })] }]
  const p6 = scene('new', P26, steps6)
  check('unsure phase (10 s): a calm mech at 130 m (not aiming) is not a target', last(p6).tgt === null && last(p6).p26.phase === 'unsure', `${last(p6).mode} tgt ${last(p6).tgt}`)
  const p7 = scene('new', P26, [{ t0: 10, n: 12, mechs: [mech(5, 130, 0)] }])
  check('unsure phase: a mech aiming at us for 0.6 s+ becomes hostile and a target', last(p7).tgt === 5, `${last(p7).mode} tgt ${last(p7).tgt}`)
}

// 3b fight test: one gun mech at 100 m: fight; four hostile gun + laser mechs at 100 m: no fight (retreat under fire)
{
  const one = scene('new', P26, [{ t0: 100, n: 10, weapons: [gunW(), laserW()], mechs: [mech(5, 100, 0)], ev: (i) => (i % 3 ? [] : hit(5)) }])
  const r1 = last(one)
  check('fight test: one gun hunter at 100 m -> FIGHT (ttk < ttd)', r1.mode === 'FIGHT' && r1.p26.fight === true, `ttk ${r1.p26.ttk.toFixed(1)} ttd ${r1.p26.ttd.toFixed(1)} hold ${r1.p26.hold}`)
  const four = [5, 6, 7, 8].map((id, j) => mech(id, 100, (j - 1.5) * 0.08, { weapons: ['gun', 'laser'] }))
  const many = scene('new', P26, [{ t0: 100, n: 10, weapons: [gunW(), laserW()], mechs: four, ev: (i) => hit(5 + (i % 4)) }])
  const r2 = last(many), off2 = last(scene('new', null, [{ t0: 100, n: 10, weapons: [gunW(), laserW()], mechs: four, ev: (i) => hit(5 + (i % 4)) }]))
  check('fight test: four hostile gun + laser shooters at 100 m -> no fight, DISENGAGE (still shooting)', r2.mode === 'DISENGAGE' && r2.p26.fight === false && !r2.B.holdFire,
    `ttk ${r2.p26.ttk.toFixed(1)} ttd ${r2.p26.ttd.toFixed(1)} | off ${off2.mode}`)
  const fin = scene('new', P26, [{ t0: 100, n: 10, hpf: 0.3, weapons: [gunW(), laserW()], mechs: [5, 6, 7, 8].map((id, j) => mech(id, 100, (j - 1.5) * 0.08, { weapons: ['gun', 'laser'], hp: id === 5 ? 150 : 1400 })), ev: (i) => hit(5 + (i % 4)) }])
  check('fight test: finishing (kill < 1.6 s) overrides the retreat latch', last(fin).mode === 'FIGHT' && last(fin).p26.finishing === true && last(fin).tgt === 5, `${last(fin).mode} tgt ${last(fin).tgt}`)
  check('range: hold 100 m against gun + laser hunters', r2.p26.hold === 100, `hold ${r2.p26.hold}`)
  const lt = scene('new', P26, [{ t0: 100, n: 4, weapons: [gunW(), laserW()], mechs: [mech(5, 100, 0, { weapons: ['laser', 'lightning'] })] }])
  check('range: hold 55 m against laser + lightning', last(lt).p26.hold === 55, `hold ${last(lt).p26.hold}`)
}

// 3c retreat latch: 30% and hit -> latch (DISENGAGE); not under fire -> hold fire; 60% quiet, no mech in view 6 s -> ends
{
  const st = [{ t0: 120, n: 6, hpf: 0.3, weapons: [gunW(), laserW()], mechs: [mech(5, 120, 0)], ev: (i) => (i < 3 ? hit(5) : []) },
    { n: 30, hpf: 0.45, weapons: [gunW(), laserW()], mechs: [mech(5, 120, 0)] },
    { n: 5, hpf: 0.6, weapons: [gunW(), laserW()], mechs: [] },
    { n: 60, hpf: 0.6, weapons: [gunW(), laserW()], mechs: [] }]
  const r = scene('new', P26, st)
  const early = r[5], held = r[35], end = last(r)
  check('latch: under 35% while hit -> DISENGAGE, latched', early.mode === 'DISENGAGE' && early.p26.latch === true, `${early.mode} latch ${early.p26.latch}`)
  const uf = r[2]
  check('latch: latched and under fire (2.5 s) -> keeps shooting back', uf.p26.latch === true && uf.hold === false && uf.a.fire[0] === true, `hold ${uf.hold} fire ${uf.a.fire}`)
  check('latch: latched and not under fire -> holds fire (gun silent, no new laser charge)', held.p26.latch === true && held.hold === true && !held.a.fire[0], `hold ${held.hold} fire ${held.a.fire}`)
  check('latch: above 55% with no mech in view and no hit for 6 s -> ends', end.p26.latch === false && (end.ctr.pfLatchEnd || 0) === 1 && r[60].p26.latch === true, `latch at 6.0 s quiet ${r[60].p26.latch}, end ${end.p26.latch}`)
  const off = scene('new', null, st)
  check('latch: off brain differs (no hold-fire latch)', off[35].hold !== true || off[35].mode !== 'DISENGAGE', `off ${off[35].mode} holdFire ${off[35].hold}`)
}

// 3d drop priority: 90% hp, a landed drop 90 m away inside the next circle, a hostile mech in a duel -> DROP, still firing
{
  const st = [{ t0: 140, n: 12, hpf: 0.9, weapons: [gunW(), laserW()], mechs: [mech(5, 100, 0.1)], ev: (i) => (i % 3 ? [] : hit(5)),
    drops: [{ id: 20001, pos: at(90, Math.PI / 2).slice(0, 3), radius: 8, lands_in: 0, capture_s: 4, progress: 0, holder: null }] }]
  const p = scene('new', P26, st), o = scene('new', null, st)
  const fired = p.some((x) => x.a.fire[0] || x.a.fire[1])
  check('drop: below 100% a drop within 200 m beats the fight (DROP mode)', last(p).mode === 'DROP' && last(p).leg === 'p26drop', `p26 ${last(p).mode}/${last(p).leg} | off ${last(o).mode}/${last(o).leg}`)
  check('drop: keeps aiming / firing on the way', fired && last(p).tgt === 5, `fired ${fired} tgt ${last(p).tgt}`)
  const late = scene('new', P26, [{ ...st[0], drops: [{ id: 20002, pos: at(90, Math.PI / 2).slice(0, 3), radius: 8, lands_in: 20, capture_s: 4, progress: 0, holder: null }] }])
  check('drop: one landing 20 s from now (> arrival + 3 s) is not taken', last(late).mode !== 'DROP', `${last(late).mode}`)
  const full = scene('new', P26, [{ ...st[0], hpf: 1 }])
  check('drop: at full health no priority drop', last(full).mode !== 'DROP', `${last(full).mode}`)
  const ffa = scene('new', P26, st, { env: 'ffa' }), ffa0 = scene('base', null, st, { env: 'ffa' })
  check('T-F2 drop scene: forced FFA identical to MX_base2', JSON.stringify(ffa.map((x) => x.a)) === JSON.stringify(ffa0.map((x) => x.a)), `ffa ${last(ffa).mode} / base ${last(ffa0).mode}`)
}

// 3e grab: a laser pickup 30 m away (no mech within 30 m of it), a hostile at 140 m -> grab (priority over fighting)
{
  const st = [{ t0: 100, n: 10, mechs: [mech(5, 140, 0)], ev: (i) => (i % 3 ? [] : hit(5)), pickups: [{ id: 8001, kind: 'laser', pos: at(30, Math.PI / 2) }] }]
  const p = scene('new', P26, st), o = scene('new', null, st)
  check('grab: laser within 45 m -> grab legs over the fight', last(p).leg === 'p26grab' && (last(p).B.counters.pfGrab || 0) > 0, `p26 ${last(p).mode}/${last(p).leg} | off ${last(o).mode}/${last(o).leg}`)
  const st2 = [{ ...st[0], mechs: [mech(5, 140, 0), mech(6, 45, Math.PI / 2, { aim: [0, 0] })], pickups: [{ id: 8001, kind: 'laser', pos: at(30, Math.PI / 2) }] }]
  const p2 = scene('new', P26, st2)
  check('grab: not with a mech within 30 m of the item', last(p2).leg !== 'p26grab', `${last(p2).mode}/${last(p2).leg}`)
  const st3 = [{ ...st[0], hpf: 0.25 }]
  const p3 = scene('new', P26, st3)
  check('grab: not at 25% hp', last(p3).leg !== 'p26grab', `${last(p3).mode}/${last(p3).leg}`)
  const st4 = [{ t0: 100, n: 10, mechs: [], pickups: [{ id: 8002, kind: 'mortar', pos: at(10, Math.PI / 2) }] }]
  const p4 = scene('new', P26, st4)
  check('loadout: never a mortar (no grab, no loot, no take)', !p4.some((x) => x.leg === 'p26grab' || x.a.take !== undefined) && !(last(p4).B.loot && last(p4).B.loot.type === 'pickup'), `${last(p4).mode}/${last(p4).leg}`)
}

// 3f reload: 7 of 12 rounds, nothing in view, 2 s quiet -> reload; 10 of 12 with a mech in view: only after 6 s quiet
{
  const r1 = scene('new', P26, [{ t0: 100, n: 20, ammo: 7, mechs: [] }])
  const i1 = r1.findIndex((x) => x.a.reload)
  check('reload: 7/12, no mech in view -> reload after 1.5 s quiet', i1 >= 0, `first reload at decision ${i1}`)
  const st = [{ t0: 100, n: 80, ammo: 10, mechs: [mech(5, 230, 0, { aim: [0, 0] })], ev: (i) => (i === 0 ? hit(5) : []) }]
  const r2 = scene('new', P26, st, { pfAtkR: 100 }), o2 = scene('new', null, st, { pfAtkR: 100 })
  const i2 = r2.findIndex((x) => x.a.reload), j2 = o2.findIndex((x) => x.a.reload)
  check('reload: 10/12 with a mech in view -> only after 6 s quiet', i2 >= 55 && i2 <= 70, `p26 first reload at ${i2} (t+${(i2 * 0.1).toFixed(1)} s), off at ${j2}`)
  const r3 = scene('new', P26, [{ t0: 100, n: 10, ammo: 3, mechs: [] }])
  check('reload: 3/12 nothing in view -> at once', r3[0].a.reload === true, `${r3[0].a.reload}`)
}

// 3h hunt objective: after the opening above 80%, a mech seen 60 m away that vanished is walked to once the 6 s target
// memory has run out (value 120 - 3 / s of age - 1.3 / m)
{
  const r = scene('new', P26, [{ t0: 100, n: 10, mechs: [mech(5, 60, 0, { aim: [0, 0] })] }, { n: 90, mechs: [] }])
  const i = r.findIndex((x) => x.leg === 'p26hunt')
  check('hunt: a mech seen in the last 20 s is walked to (LOOT hunt) after the target memory', i > 60 && r[i].mode === 'LOOT' && (r[i].ctr.pfHunt || 0) > 0, `first hunt leg at decision ${i}, regain before: ${r[30].mode}/${r[30].leg}`)
  const r2 = scene('new', P26, [{ t0: 100, n: 10, hpf: 0.7, mechs: [mech(5, 60, 0, { aim: [0, 0] })] }, { n: 90, hpf: 0.7, mechs: [] }])
  check('hunt: not at 70% hp', !r2.some((x) => x.leg === 'p26hunt'), `${last(r2).mode}/${last(r2).leg}`)
}

// 3g upgrade order and laser rungs (state checks)
{
  const b = mk('new', { warmup: false, select: P26 })
  const o = obs(0, 50, { mechs: [] }); o.offer = { id: 1, expires: 55, choices: [{ id: 'nanites' }, { id: 'laser_damage' }, { id: 'gun_damage' }] }
  o.self.weapons = [gunW(), laserW()]
  const a = b.act(o, performance.now() + 1e6)
  const b0 = mk('base', { warmup: false }), a0 = b0.act(clone(o), performance.now() + 1e6)
  check('upgrades: laser_damage before nanites (p26 order); base takes nanites', a.pick === 1 && a0.pick === 0, `p26 pick ${a.pick}, base ${a0.pick}`)
  check('laser rungs 85 / 68 / 30 / 12 %', JSON.stringify(b._B.prof.rungs) === '[0.85,0.68,0.3,0.12]', JSON.stringify(b._B.prof.rungs))
}

// ---------------------------------------------------------------- 4 CPU
{
  const b = mk('new', { select: P26 })
  let worst = 0, sum = 0
  for (const o of streamObs) { const t0 = performance.now(); b.act(clone(o), t0 + 1e6); const ms = performance.now() - t0; sum += ms; if (ms > worst) worst = ms }
  check('CPU: worst decision on the kit stream with p26 < 15 ms', worst < 15, `worst ${worst.toFixed(2)} ms, mean ${(sum / streamObs.length).toFixed(2)} ms, errors ${b._B.counters.errors}`)
  check('kit stream with p26: no stage errors', b._B.counters.errors === 0, JSON.stringify(b._B.errorsByStage))
}
console.log(`\n${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
