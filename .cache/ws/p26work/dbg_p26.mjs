// Tests for the practice profile p26 (MX_p26 lib/prof.js). usage: bun test_p26.mjs
//  1 identity: prof off against MX_base2 on the kit stream (tables '' / '1211111111111111', hello slot 3 as recorded and slot 1)
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
for (const [k, d] of [['base', BASE], ['new', NEW]]) mods[k] = { World: (await import(d + '/lib/world.js')).World, Nav: (await import(d + '/lib/nav.js')).Nav, createBrain: (await import(d + '/lib/brain.js')).createBrain }
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
  const r = stream(mk('base', { saltTable: tab, warmup: false }, h), mk('new', { saltTable: tab, warmup: false }, h))
  check(`identity prof off vs MX_base2, table '${tab}', slot ${slot}`, r.d === 0, `${streamObs.length} decisions, differ ${r.d}`)
}
{
  const h = { ...hello0, slot: 1 }
  const r = stream(mk('base', { saltTable: '', warmup: false }, h), mk('base', { saltTable: '1211111111111111', warmup: false }, h))
  check(`control: table '1211111111111111' acts on slot 1 (salt 2)`, r.d > 0, `differ ${r.d}`)
}

// ---------------------------------------------------------------- 2 T-F2 forced FFA
{
  const r = stream(mk('base', { env: 'ffa', warmup: false }), mk('new', { env: 'ffa', warmup: false, select: { prof: 'p26' } }))
  check('T-F2 kit stream: env ffa, prof p26 identical to MX_base2', r.d === 0, `differ ${r.d}`)
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
      out.push({ t, mode: d.mode, leg: d.leg, tgt: d.target, a, p26: d.p26, B: b._B })
      k++; t = +(t + 0.1).toFixed(2)
    }
  }
  return out
}
const last = (r) => r[r.length - 1]
const P26 = { prof: 'p26' }
const hit = (by, amt = 45) => [{ type: 'damaged', amount: amt, weapon: 'gun', bearing: 0, by }]


{
  const st = [{ t0: 120, n: 6, hpf: 0.3, weapons: [gunW(), laserW()], mechs: [mech(5, 120, 0)], ev: (i) => (i < 3 ? hit(5) : []) },
    { n: 30, hpf: 0.45, weapons: [gunW(), laserW()], mechs: [mech(5, 120, 0)] }]
  const r = scene('new', { prof: 'p26' }, st)
  for (let i = 0; i < r.length; i += 3) { const x = r[i]; console.log(i, x.t, x.mode, x.leg, 'latch', x.p26.latch, 'uf', x.B.p26.underFire, 'hold', x.B.holdFire, 'lh', x.B.me.lastHurtT, 'fin', x.p26.finishing, 'ls', x.B.lastStand, x.B.stance, 'fire', x.a.fire) }
  const st2 = [{ t0: 100, n: 10, mechs: [mech(5, 140, 0)], ev: (i) => (i % 3 ? [] : hit(5)), pickups: [{ id: 8001, kind: 'laser', pos: at(30, Math.PI * 0.75) }] }]
  const r2 = scene('new', { prof: 'p26' }, st2)
  for (const x of r2) console.log(x.t, x.mode, x.leg, 'grab', JSON.stringify(x.B.p26.grab), 'pick', x.B.pickups.size, [...x.B.pickups.values()].map(p=>[p.kind, p.x.toFixed(0), p.y.toFixed(0), p.z.toFixed(1)]))
  const B = r2[0].B, p = [...B.pickups.values()][0]
  console.log('walkLine', nav0.walkLine(me0.x, me0.y, p.x, p.y), 'world ground', world.ground(p.x, p.y), 'level', nav0.levelAt(p.x,p.y))
}
