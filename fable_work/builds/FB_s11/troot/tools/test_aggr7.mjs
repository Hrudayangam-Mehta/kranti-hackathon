// R7a item 3 tests: preset aggr (off / h70 = KA / any70 = KB, the KB line verbatim), healDoc (off / on) and the ioMerge
// switch. Real map for the unengaged gate (a listed mech at ~180 m with no line either way).
// usage: bun test_aggr7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FB_s11/troot'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { resolveParams, PRESETS } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const brainOf = (sel, map, extra) => createBrain(hello, map ? { world, nav, log: () => {} } : { world: null, nav: null, log: () => {} }, { warmup: false, ...(extra || {}), select: { ...KS, ...sel } })
// presets
const P0 = resolveParams({}), Ph = resolveParams({ select: { aggr: 'h70' } }), Pa = resolveParams({ select: { aggr: 'any70' } })
check('aggr presets: off = defaults, h70 = 0.7 / 8 / 0.7 (KA), any70 = 0.7 / 0 / 0.7 (KB)',
  P0.unengagedHpf === 0.9 && P0.unengagedS === 20 && P0.h50SeekHpf === 0.6 && Ph.unengagedHpf === 0.7 && Ph.unengagedS === 8 && Ph.h50SeekHpf === 0.7 &&
  Pa.unengagedHpf === 0.7 && Pa.unengagedS === 0 && Pa.h50SeekHpf === 0.7 && P0.selected.aggr === 'off',
  `off ${P0.unengagedHpf}/${P0.unengagedS}/${P0.h50SeekHpf}, h70 ${Ph.unengagedHpf}/${Ph.unengagedS}/${Ph.h50SeekHpf}, any70 ${Pa.unengagedHpf}/${Pa.unengagedS}/${Pa.h50SeekHpf}`)
const Hd = resolveParams({ select: { healDoc: 'on' } }), sk = Object.keys(resolveParams({}).selected)
check('healDoc: off = 0.55 / 0.7, on = 0.7 / 0.8, last SELECT key', P0.healEnterHp === 0.55 && P0.healExit === 0.7 && Hd.healEnterHp === 0.7 && Hd.healExit === 0.8 && sk[sk.length - 1] === 'healDoc',
  `off ${P0.healEnterHp}/${P0.healExit}, on ${Hd.healEnterHp}/${Hd.healExit}, last key ${sk[sk.length - 1]}`)
const Hf = resolveParams({ select: { healDoc: 'full' } }), Cw = resolveParams({ select: { seekCrowd: 'wide' } })
check('healDoc full = enter 0.7, SQUAD exit hfExit 1.0 (HF), healExit unchanged; seekCrowd wide = h50CrowdR 120, off = 60', Hf.healEnterHp === 0.7 && Hf.hfExit === 1.0 && Hf.healExit === 0.7 && Cw.h50CrowdR === 120 && P0.h50CrowdR === 60 && P0.selected.seekCrowd === 'off',
  `full ${Hf.healEnterHp}/${Hf.hfExit} (healExit ${Hf.healExit}), crowd ${P0.h50CrowdR} -> ${Cw.h50CrowdR}`)
check('ioMerge / pocketCfg switches: default on, select off -> off', P0.ioMerge === true && resolveParams({ select: { ioMerge: 'off' } }).ioMerge === false && P0.pocketCfg === true && resolveParams({ select: { pocketCfg: 'off' } }).pocketCfg === false,
  `ioMerge ${P0.ioMerge}, pocketCfg ${P0.pocketCfg}`)
// a pair of standing points ~180 m apart with no line either way
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
let far = null
for (let r = 175; r <= 195 && !far; r += 5) for (let k = 0; k < 72 && !far; k++) {
  const a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
  const z = nav.levelAt(x, y)
  const clear = world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) || world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 8) ||
    world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5) || world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 8.1)
  if (!clear && z - world.ground(x, y) < 1) far = { x, y, z, r }
}
const Wp = cfg.weapons
const gunW = () => ({ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun })
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
function obs(k, t, hpf, mechs, alive = 16) {
  return { type: 'obs', tick: 2 * k, t, alive, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * hpf, max_hp: 1400, energy: 100, max_energy: 100, grounded: true,
    cubes: 0, upgrades: [], in_zone: true, weapons: [gunW(), null], stats: cfg.mech }, mechs, projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [], zone, offer: null }
}
const farMech = () => ({ id: 11, kind: 'mech', pos: [far.x, far.y, far.z], vel: [0, 0, 0], aim: [Math.atan2(far.y - me0.y, far.x - me0.x), 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })
function play(sel, hpf, t0, t1, opts = {}) {
  const b = brainOf(sel, true, opts.env ? { env: opts.env } : null), B = b._B
  let k = 0
  for (let t = t0; t <= t1 + 1e-9; t += 0.1) {
    if (opts.contactT !== undefined && k === 0) B.lastContactT = opts.contactT
    b.act(obs(k, t, hpf, opts.noMech ? [] : [farMech()], opts.alive && t >= opts.aliveAt ? opts.alive : 16), performance.now() + 1e6)
    if (opts.contactT !== undefined && k === 0) B.lastContactT = opts.contactT
    k++
  }
  return B
}
check('setup: listed mech ~180 m away with no line either way on the real map', !!far, far ? `us (${me0.x.toFixed(0)}, ${me0.y.toFixed(0)}), it at ${far.r} m` : 'no such pair')
if (far) {
  const tgtOf = (B) => (B.target ? B.target.id : -1)
  const V = ['off', 'h70', 'any70', 'any70f']
  const r75 = {}, r65 = {}, r92 = {}, q5 = {}, q10 = {}, fw = {}, ff = {}
  for (const v of V) {
    r75[v] = tgtOf(play({ aggr: v }, 0.75, 40, 41)); r65[v] = tgtOf(play({ aggr: v }, 0.65, 40, 41)); r92[v] = tgtOf(play({ aggr: v }, 0.92, 40, 41))
    q5[v] = tgtOf(play({ aggr: v }, 0.92, 40, 40, { contactT: 35 })); q10[v] = tgtOf(play({ aggr: v }, 0.92, 40, 40, { contactT: 30 }))
    ff[v] = tgtOf(play({ aggr: v }, 0.75, 100, 101, { env: 'ffa' }))
  }
  check('A1 hp 75%: off ignores the unengaged mech; h70, any70 and any70f take it', r75.off === -1 && r75.h70 === 11 && r75.any70 === 11 && r75.any70f === 11, JSON.stringify(r75))
  check('A1 hp 65%: no value takes it', Object.values(r65).every((v) => v === -1), JSON.stringify(r65))
  check('A1 hp 92%: every value takes it (the old 90% / 20 s gate)', Object.values(r92).every((v) => v === 11), JSON.stringify(r92))
  check('A2 contact 5 s ago: only any70 / any70f (no quiet time) take it', q5.off === -1 && q5.h70 === -1 && q5.any70 === 11 && q5.any70f === 11, JSON.stringify(q5))
  check('A2 contact 10 s ago: h70 and any70 take it (8 s / 0 s), off waits for 20 s', q10.off === -1 && q10.h70 === 11 && q10.any70 === 11, JSON.stringify(q10))
  check('A3 FFA posture: no unengaged candidate under any value', Object.values(ff).every((v) => v === -1), JSON.stringify(ff))
  // any70f firewall: after a foreign death (alive 16 -> 15 at 30 s) any70f is back at 0.9 / 20 (hp 75%: no target), any70 is not
  const fd = {}
  for (const v of ['off', 'any70', 'any70f']) fd[v] = tgtOf(play({ aggr: v }, 0.75, 29, 41, { alive: 15, aliveAt: 30 }))
  check('A4 any70f after a foreign death: closed (as off); any70 (KB, no firewall) still takes it', fd.off === -1 && fd.any70 === 11 && fd.any70f === -1, JSON.stringify(fd))
}
// seek start at 70 % under h70 / any70 (no mech in sight, a gun sound 1 s ago): off seeks only from 60 % already, so 65 % separates
{
  const run = (v, hpf) => {
    const b = brainOf({ aggr: v }, false), B = b._B
    for (let k = 0; k < 5; k++) { const o = obs(k, 40 + k * 0.1, hpf, []); o.sounds = k === 0 ? [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }] : []; b.act(o, performance.now() + 1e6) }
    return B.legKind
  }
  const s = { off65: run('off', 0.65), h70_65: run('h70', 0.65), any70_65: run('any70', 0.65), h70_75: run('h70', 0.75) }
  check('seek start: off seeks at 65% (60% rule), h70 / any70 not below 70%, h70 seeks at 75%', /^hunt/.test(s.off65) && !/^hunt/.test(s.h70_65) && !/^hunt/.test(s.any70_65) && /^hunt/.test(s.h70_75), JSON.stringify(s))
}
// healDoc on: out of contact at 65 % -> HEAL (enter 70 %); off -> no HEAL (enter 55 %)
{
  const run = (v) => {
    const b = brainOf({ healDoc: v }, true), B = b._B
    const modes = []
    for (let k = 0; k < 30; k++) { b.act(obs(k, 60 + k * 0.1, 0.65, []), performance.now() + 1e6); modes.push(B.mode) }
    return modes[modes.length - 1]
  }
  const m = { off: run('off'), on: run('on') }
  check('healDoc on: 65% out of contact -> HEAL; off -> no HEAL', m.on === 'HEAL' && m.off !== 'HEAL', JSON.stringify(m))
}
console.log(`\n${pass}/${pass + fail} aggr / healDoc checks passed`)
process.exit(fail ? 1 : 0)
