// R7a item 2 tests: IO-A (io 'v4' / 'all': T-IO4 reload edge, T-IO1 / IO2 lead changes), IO7 (laser charge held through
// an exception) and IO8 (events / sounds / beams of skipped observations merged). Synthetic observations, no map.
// usage: bun test_io7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { createBrain } = await imp('brain.js'), { mergeSkipped } = await imp('io.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const brainOf = (sel) => createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, select: { retreat: 'd3', ...sel } })
const W8 = cfg.weapons
function obsAt(k, o) {
  const t = 30 + k * 0.1
  const me = { id: 3, pos: [0, 0, 0], vel: [0, 0, 0], aim: o.aim || [0, 0], hp: 1400, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
    weapons: o.weapons, stats: cfg.mech }
  return { type: 'obs', tick: 600 + 2 * k, t, alive: 16, self: me,
    mechs: o.mechs || [], projectiles: [], crates: [], cubes: [], pickups: [], sounds: o.sounds || [], beams: [], events: o.events || [], drops: [],
    zone: { center: [0, 0], radius: 900, next_center: [0, 0], next_radius: 600, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }, offer: null }
}
const mech = (id, x, y, extra) => ({ id, kind: 'mech', pos: [x, y, 0], vel: [0, 0, 0], aim: [Math.atan2(-y, -x), 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false, ...extra })
const gunW = (extra) => ({ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: W8.gun, ...extra })
const laserW = (extra) => ({ kind: 'laser', cooldown: 0, charge: 0, stats: W8.laser, ...extra })

// ---- T-IO4: the reload read-out ends inside this decision -> io 'all' holds the trigger; io 'v4' waits for the magazine
{
  const res = {}
  for (const io of ['v4', 'all']) for (const rl of [0.05, 0.10, 0.15]) {
    const b = brainOf({ io })
    let a = null
    // the target stands still at 60 m on our torso line (hostile: it hit us), so only the reload read-out decides
    for (let k = 0; k < 4; k++) {
      const ev = k === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 7 }] : []
      a = b.act(obsAt(k, { aim: [0, 0.03], mechs: [mech(7, 60, 0, { aim: [Math.PI, 0] })], weapons: [gunW(k < 3 ? {} : { ammo: 0, reload: rl }), null], events: ev }), performance.now() + 1e6)
    }
    res[`${io}_${rl}`] = a.fire[0]
  }
  check('T-IO4 io all: trigger held at reload 0.05 and 0.10, not at 0.15', res['all_0.05'] === true && res['all_0.1'] === true && res['all_0.15'] === false, JSON.stringify(res))
  check('T-IO4 io v4: no trigger while the reload read-out is above 0 (V4)', res['v4_0.05'] === false && res['v4_0.1'] === false && res['v4_0.15'] === false, JSON.stringify(res))
}
// ---- T-IO1 / T-IO2: a crossing target -> the gun lead (and the laser lead) differ between v4 and all; v4 = plain V4
{
  const aims = {}
  for (const io of ['v4', 'all']) {
    const b = brainOf({ io })
    let a = null
    for (let k = 0; k < 3; k++) a = b.act(obsAt(k, { aim: [Math.atan2(5, 120), 0.0], mechs: [mech(8, 120, 5 + k * 1.17, { vel: [0, 11.7, 0], aim: [Math.PI, 0] })], weapons: [gunW(), null],
      events: k === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.04, by: 8 }] : [] }), performance.now() + 1e6)
    aims[io] = a.aim[0]
  }
  const d = aims.all - aims.v4
  check('T-IO1 io all leads a 11.7 m/s crosser at 120 m half a tick less than v4', d < 0 && Math.abs(d) * 120 > 0.1 && Math.abs(d) * 120 < 0.6, `yaw v4 ${aims.v4.toFixed(5)}, all ${aims.all.toFixed(5)}, lateral difference ${(d * 120).toFixed(3)} m (half a tick x 11.7 m/s = 0.29 m)`)
}
// ---- T-IO7: an exception inside the fire stage while the laser charges keeps the trigger held and the previous aim
{
  const b = brainOf({})
  const B = b._B
  const mk = (k) => obsAt(k, { aim: [0, 0], mechs: [mech(9, 130, 0, { aim: [Math.PI, 0], weapons: ['gun'] })], weapons: [gunW(), laserW({ charge: 0.1 + 0.1 * k })],
    events: k === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 9 }] : [] })
  let a = null
  for (let k = 0; k < 3; k++) a = b.act(mk(k), performance.now() + 1e6)
  const held = a.fire[1] === true, prevAim = a.aim.slice()
  Object.defineProperty(B, 'ambushAim', { configurable: true, get() { throw new Error('test exception in the fire stage') }, set(v) {} })
  const e0 = B.counters.errors
  const a2 = b.act(mk(3), performance.now() + 1e6)
  delete B.ambushAim; B.ambushAim = false
  check('T-IO7 fire-stage exception at charge 0.40: laser trigger kept, previous aim kept', held && B.counters.errors === e0 + 1 && a2.fire[1] === true && a2.aim[0] === prevAim[0] && a2.aim[1] === prevAim[1],
    `held before ${held}, errors +${B.counters.errors - e0} (${JSON.stringify(B.errorsByStage)}), after: fire ${JSON.stringify(a2.fire)}, aim ${a2.aim.map((v) => v.toFixed(4))} vs ${prevAim.map((v) => v.toFixed(4))}`)
  // the same exception with the charge full or no charge: released as before (no change outside a partial charge)
  const b2 = brainOf({}), B2 = b2._B
  for (let k = 0; k < 3; k++) b2.act(obsAt(k, { aim: [0, 0], mechs: [mech(9, 130, 0, { aim: [Math.PI, 0] })], weapons: [gunW(), laserW({ charge: 0 })], events: k === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0, by: 9 }] : [] }), performance.now() + 1e6)
  Object.defineProperty(B2, 'ambushAim', { configurable: true, get() { throw new Error('x') }, set(v) {} })
  const a3 = b2.act(obsAt(3, { aim: [0, 0], mechs: [mech(9, 130, 0, { aim: [Math.PI, 0] })], weapons: [gunW(), laserW({ charge: 0 })] }), performance.now() + 1e6)
  check('T-IO7 no charge: the exception releases everything as before', a3.fire[0] === false && a3.fire[1] === false, `fire ${JSON.stringify(a3.fire)}`)
}
// ---- T-IO8: a backlog of 3 observations, the oldest with a kill and a damaged event; sounds age by 0.1 per skipped decision
{
  const b = brainOf({}), B = b._B
  b.act(obsAt(0, { mechs: [mech(5, 150, 0), mech(6, -150, 40)], weapons: [gunW(), null] }), performance.now() + 1e6)
  const o1 = obsAt(1, { mechs: [mech(6, -150, 40)], weapons: [gunW(), null], events: [{ type: 'kill', target: 5 }, { type: 'damaged', amount: 45, weapon: 'gun', bearing: 2.9, by: 6 }], sounds: [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }] })
  o1.alive = 15
  const o2 = obsAt(2, { mechs: [mech(6, -150, 40)], weapons: [gunW(), null], sounds: [{ kind: 'laser', bearing: -1, dist: 'far', age: 0.1 }] }); o2.alive = 15
  const o3 = obsAt(3, { mechs: [mech(6, -150, 40)], weapons: [gunW(), null] }); o3.alive = 15
  const m = mergeSkipped(mergeSkipped(o1, o2), o3)
  const ages = m.sounds.map((s) => `${s.kind} ${s.age.toFixed(2)}`)
  const dmg0 = B.counters.dmgIn
  b.act(m, performance.now() + 1e6)
  check('T-IO8 kill and damage of a skipped observation reach the brain', B.ourKills.has(5) && B.counters.dmgIn - dmg0 === 45 && B.foreignDeaths === 0,
    `ourKills ${[...B.ourKills]}, dmgIn +${B.counters.dmgIn - dmg0}, foreignDeaths ${B.foreignDeaths}, events ${m.events.length}`)
  check('T-IO8 sound ages grow by the skipped time (0.1 s per decision)', ages.join(',') === 'gun 0.25,laser 0.20', ages.join(', '))
  // without the merge the kill is lost and the death counts as foreign
  const b2 = brainOf({}), B2 = b2._B
  b2.act(obsAt(0, { mechs: [mech(5, 150, 0), mech(6, -150, 40)], weapons: [gunW(), null] }), performance.now() + 1e6)
  const p3 = obsAt(3, { mechs: [mech(6, -150, 40)], weapons: [gunW(), null] }); p3.alive = 15
  b2.act(p3, performance.now() + 1e6)
  check('T-IO8 control: the newest observation alone loses the kill (foreign death 1)', !B2.ourKills.has(5) && B2.foreignDeaths === 1, `ourKills ${[...B2.ourKills]}, foreignDeaths ${B2.foreignDeaths}`)
  // caps: the newest entries are kept
  const big = { t: 1, tick: 2, events: Array.from({ length: 60 }, (_, i) => ({ type: 'hit', target: 9, amount: i })) }
  const nb = { t: 1.1, tick: 4, events: Array.from({ length: 10 }, (_, i) => ({ type: 'hit', target: 9, amount: 100 + i })) }
  mergeSkipped(big, nb)
  check('T-IO8 cap 64 keeps the newest events', nb.events.length === 64 && nb.events[63].amount === 109 && nb.events[0].amount === 6, `${nb.events.length} events, first ${nb.events[0].amount}, last ${nb.events[63].amount}`)
}
console.log(`\n${pass}/${pass + fail} IO checks passed`)
process.exit(fail ? 1 : 0)
