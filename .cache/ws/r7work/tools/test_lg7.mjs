// R7a item 7 tests: LG (laserGrab std / wide / wide45; R5 3.2, GP I1, the r7 grab-yield amendment), no map.
// usage: bun test_lg7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { createBrain } = await imp('brain.js'), { resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const Wp = cfg.weapons
const zone = { center: [0, 0], radius: 600, next_center: [0, 0], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
function obs(k, t, o) {
  return { type: 'obs', tick: 2 * k, t, alive: 12, self: { id: 3, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * (o.hpf || 1), max_hp: 1400, energy: 100, max_energy: 100, grounded: true,
    cubes: 0, upgrades: [], in_zone: true, weapons: o.laser ? [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, { kind: 'laser', cooldown: 0, charge: 0, stats: Wp.laser }] : [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech },
    mechs: o.mechs, projectiles: [], crates: [], cubes: [], pickups: o.pickups || [{ id: 8001, kind: 'laser', pos: [0, 90, 0] }], sounds: [], beams: [], events: o.events ? o.events(k) : [], drops: [], zone, offer: null }
}
const mech = (id, x, y, extra) => ({ id, kind: 'mech', pos: [x, y, 0], vel: [0, 0, 0], aim: [Math.atan2(-y, -x), 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false, ...(extra || {}) })
const hit = (by) => ({ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by })
function run(sel, o, n = 3, over) {
  const b = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, ...(over || {}), select: { ...KS, ...sel } }), B = b._B
  let a = null
  for (let k = 0; k < n; k++) a = b.act(obs(k, (o.t0 || 30) + k * 0.1, o), performance.now() + 1e6)
  return { grab: B.grab ? `${B.grab.type}:${B.grab.id}` : '-', leg: B.legKind, tgt: B.target ? B.target.id : -1, mode: B.mode, lgKnown: B.lgKnown, a: JSON.stringify(a), hold: B.counters.lgHold || 0 }
}
const P0 = resolveParams({}), Pw = resolveParams({ select: { laserGrab: 'wide' } }), P45 = resolveParams({ select: { laserGrab: 'wide45' } })
check('LG presets: std off; wide 130 m / 50% / 1 line / yield 1 s / 200 m / 90 s; wide45 45 s', P0.grabLaserWide === false && Pw.grabLaserWide === true && Pw.lgGrabR === 130 && Pw.lgUntilT === 90 && P45.lgUntilT === 45 && P0.selected.laserGrab === 'std',
  `std ${P0.grabLaserWide}, wide ${Pw.lgGrabR} / ${Pw.lgHpf} / ${Pw.lgYieldS} / ${Pw.lgKnownPath} / ${Pw.lgUntilT}, wide45 ${P45.lgUntilT}`)
// GP I1: 1v1 at 110 m (hostile, hitting us), laser 90 m away -> wide grabs in one decision; std does not (60 m reach)
const one = { mechs: [mech(10, 110, 0)], events: (k) => (k === 0 ? [hit(10)] : []) }
const w1 = run({ laserGrab: 'wide' }, one, 1), s1 = run({ laserGrab: 'std' }, one, 1)
check('LG 1v1 at 110 m, laser 90 m: wide grabs in the first decision (leg grab), std does not', w1.grab === 'pickup:8001' && w1.leg === 'grab' && s1.grab === '-', `wide ${w1.grab} / ${w1.leg}, std ${s1.grab} / ${s1.leg}`)
// two lines on us -> no wide grab
const two = { mechs: [mech(10, 110, 0), mech(11, -100, 20)], events: (k) => (k === 0 ? [hit(10), hit(11)] : []) }
const w2 = run({ laserGrab: 'wide' }, two, 1)
check('LG two lines on us: no grab', w2.grab === '-', `wide ${w2.grab}, leg ${w2.leg}`)
// grab yield: a drone hitting us (top attacker, not the target) -> no wide grab
const yd = { mechs: [mech(10, 110, 0), { id: 120, kind: 'npc', pos: [30, -20, 0], vel: [0, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 }], events: (k) => (k === 0 ? [hit(10), hit(120), hit(120)] : [hit(120)]) }
const w3 = run({ laserGrab: 'wide' }, yd, 2)
check('LG yield: a new attacker (drone) hit us within 1 s -> no wide grab', w3.grab === '-', `wide ${w3.grab}, target ${w3.tgt}`)
// low hp (40%) -> no wide grab
const w4 = run({ laserGrab: 'wide' }, { ...one, hpf: 0.4 }, 1)
check('LG hp 40%: no wide grab', w4.grab === '-', `wide ${w4.grab}`)
// laser-first window: a non-hostile mech at 170 m closing at 5 m/s is engaged() (a candidate under std); under wide with the
// laser known it is not; a hostile mech is still answered
const cl = { mechs: [mech(12, 170, 0, { vel: [-5, 0, 0], aim: [Math.PI / 2, 0] })] }
const sC = run({ laserGrab: 'std' }, cl, 3), wC = run({ laserGrab: 'wide' }, cl, 3)
check('LG laser-first window: closing non-hostile mech at 170 m is a candidate under std, not under wide', sC.tgt === 12 && wC.tgt === -1 && wC.lgKnown && wC.hold > 0, `std target ${sC.tgt}, wide target ${wC.tgt} (lgKnown ${wC.lgKnown}, held ${wC.hold})`)
const hC = run({ laserGrab: 'wide' }, { mechs: [mech(12, 170, 0, { vel: [-5, 0, 0] })], events: (k) => (k === 0 ? [hit(12)] : []) }, 3)
check('LG laser-first window: a hostile mech is still answered', hC.tgt === 12, `target ${hC.tgt}`)
const late = run({ laserGrab: 'wide' }, { ...cl, t0: 95 }, 3), l45 = run({ laserGrab: 'wide45' }, { ...cl, t0: 50 }, 3)
check('LG after lgUntilT (90 s; wide45 45 s): the engaged clause is back', late.tgt === 12 && l45.tgt === 12, `wide at 95 s ${late.tgt}, wide45 at 50 s ${l45.tgt}`)
// laser held -> identical to std
const lh = { mechs: [mech(10, 110, 0), mech(12, 170, 0, { vel: [-5, 0, 0], aim: [Math.PI / 2, 0] })], laser: true, events: (k) => (k === 0 ? [hit(10)] : []) }
const wl = run({ laserGrab: 'wide' }, lh, 6), sl = run({ laserGrab: 'std' }, lh, 6)
check('LG laser held: identical to std', wl.a === sl.a && wl.grab === sl.grab && wl.tgt === sl.tgt, `wide ${wl.grab} t${wl.tgt}, std ${sl.grab} t${sl.tgt}`)
// T-F2: forced FFA -> identical to std in the acting cases above
const f1 = run({ laserGrab: 'wide' }, one, 3, { env: 'ffa' }), f1s = run({ laserGrab: 'std' }, one, 3, { env: 'ffa' })
const f2 = run({ laserGrab: 'wide' }, cl, 3, { env: 'ffa' }), f2s = run({ laserGrab: 'std' }, cl, 3, { env: 'ffa' })
check('T-F2 laserGrab wide: forced FFA identical to std (grab case and engaged case)', f1.a === f1s.a && f1.grab === f1s.grab && f2.a === f2s.a && f2.tgt === f2s.tgt, `grab ${f1.grab}/${f1s.grab}, target ${f2.tgt}/${f2s.tgt}`)
console.log(`\n${pass}/${pass + fail} LG checks passed`)
process.exit(fail ? 1 : 0)
