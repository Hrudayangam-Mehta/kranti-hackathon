// D5 target rule (finishable bonus, hostile-first, opening guard, drones below mechs), D7 pickups / upgrade order, D8 trigger hold.
import { createBrain, hello, ctxNone, check, fx, mkObs, mech, dmgBy, cfg, wpn } from './common.js'
const H = cfg.mech.hp
function targetAfter(mk, secs = 1, t0 = 100, self = {}) {
  const b = createBrain(hello, ctxNone, { warmup: false })
  const tl = []
  for (let k = 0; k < secs * 10; k++) { const t = t0 + k * 0.1; const o = mk(k, t); b.act(mkObs({ t, ...o, self: { ...self, ...(o.self || {}) } }), performance.now() + 27); tl.push(b.debugState().target) }
  return tl
}
const last = (tl) => tl[tl.length - 1]
// finishable bonus: hostile A at 60 m full hp vs hostile B at 80 m with 200 hp (finishable by the magazine). Both on one side.
{
  const tl = targetAfter((k) => ({ mechs: [mech(10, 60, 0), mech(11, 75, 20, { hp: 200 })], events: k % 10 === 0 ? [dmgBy(10), dmgBy(11)] : [] }))
  const tl2 = targetAfter((k) => ({ mechs: [mech(10, 60, 0), mech(11, 75, 20, { hp: 1000 })], events: k % 10 === 0 ? [dmgBy(10), dmgBy(11)] : [] }))
  check('D5 finishable bonus: a finishable mech at 78 m beats a full-hp one at 60 m', last(tl) === 11 && last(tl2) === 10, `finishable case target ${last(tl)} (want 11) | control (1000 hp) target ${last(tl2)} (want 10)`)
}
// hostile-first: A at 70 m (aiming elsewhere, never hit us) vs B at 90 m that hit us (t >= 45 so A is a candidate)
{
  const tl = targetAfter((k) => ({ mechs: [mech(10, 70, 0, { yaw: Math.PI / 2 }), mech(11, 85, 30)], events: k % 10 === 0 ? [dmgBy(11)] : [] }))
  const tl2 = targetAfter((k) => ({ mechs: [mech(10, 70, 0, { yaw: Math.PI / 2 }), mech(11, 85, 30, { yaw: -Math.PI / 2 })] }))
  check('D5 hostile-first: the mech that hit us (90 m) beats a closer quiet one (70 m)', last(tl) === 11 && last(tl2) === 10, `with hits: ${last(tl)} (want 11) | no hits: ${last(tl2)} (want 10)`)
}
// opening guard (D0): t < 40, a quiet mech at 60 m is not a target; once it hits us it is (return fire at once)
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  let tq = 0, firstT = -1, fireAfter = -1
  for (let k = 0; k < 60; k++) {
    const t = 10 + k * 0.1
    const hit = k === 30
    const a = b.act(mkObs({ t, mechs: [mech(10, 60, 0, { yaw: Math.PI / 2 })], events: hit ? [dmgBy(10)] : [] }), performance.now() + 27)
    const tg = b.debugState().target
    if (k < 30 && tg !== null) tq++
    if (k >= 30 && tg === 10 && firstT < 0) firstT = k - 30
    if (k >= 30 && a.fire[0] && fireAfter < 0) fireAfter = k - 30
  }
  check('D0 opening guard: quiet mech at 60 m untouched before 40 s; returns fire at once when hit', tq === 0 && firstT >= 0 && firstT <= 1 && fireAfter >= 0 && fireAfter <= 5,
    `target while quiet ${tq}/30; target ${firstT} decisions after the hit, trigger down ${fireAfter} decisions after`)
}
// aim-based hostility: a mech aiming at us inside 160 m is hostile; at 170 m it is not (opening)
{
  const near = targetAfter(() => ({ mechs: [mech(10, 150, 0)] }), 1, 10)
  const far = targetAfter(() => ({ mechs: [mech(10, 170, 0)] }), 1, 10)
  check('D0 hostility by aim: aiming within 12 deg inside 160 m -> target in the opening; at 170 m not', last(near) === 10 && last(far) === null, `150 m: ${last(near)} | 170 m: ${last(far)}`)
}
// drones below mechs in contact: a drone that hit us at 20 m vs a hostile mech at 90 m
{
  const tl = targetAfter((k) => ({ mechs: [mech(10, 90, 0), { ...mech(150, 20, 5, { kind: 'npc', hp: 350, maxHp: 350 }), weapons: undefined }], events: k % 5 === 0 ? [dmgBy(10), { type: 'damaged', amount: 25, weapon: 'npc', bearing: 0.2, by: 150 }] : [] }))
  check('D5 drones are below mechs in contact', tl.slice(3).every((x) => x === 10), `targets ${[...new Set(tl)].join(',')} (want 10 only after the first decisions)`)
}
// D8 trigger hold: target in line, aim already on it; gun cooldown 0.15 / 0.10 / 0.05 / 0 -> fire false / true / true / true
{
  const res = []
  for (const cd of [0.15, 0.1, 0.05, 0]) {
    const b = createBrain(hello, ctxNone, { warmup: false })
    let a = null
    for (let k = 0; k < 6; k++) a = b.act(mkObs({ t: 100 + k * 0.1, mechs: [mech(10, 60, 0)], events: k === 0 ? [dmgBy(10)] : [], self: { weapons: [wpn('gun', { cooldown: k < 5 ? 0 : cd }), null] } }), performance.now() + 27)
    res.push(`${cd}:${a.fire[0]}`)
  }
  check('D8 trigger down at cooldown <= 0.10 s', res.join(' ') === '0.15:false 0.1:true 0.05:true 0:true', res.join(' '))
}
// D7 upgrade order
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  const cases = [
    [['gun_rate', 'armor', 'sensors'], 'armor', []], [['nanites', 'plating', 'armor'], 'plating', []], [['laser_damage', 'gun_damage', 'nanites'], 'nanites', ['laser']],
    [['laser_charge', 'gun_damage', 'gun_rate'], 'laser_charge', ['laser']], [['laser_charge', 'gun_damage', 'gun_rate'], 'gun_damage', []],
    [['lightning_efficiency', 'gun_damage', 'servos'], 'lightning_efficiency', ['lightning']], [['gyros', 'servos', 'gun_mag'], 'gyros', []],
    [['capacitor', 'reactor', 'jets'], 'capacitor', []], [['gun_velocity', 'sensors', 'mortar_damage'], 'gun_velocity', []], [['sensors', 'laser_pierce', 'mortar_rate'], 'sensors', ['laser']],
    [['gun_mag', 'lightning_chain', 'lightning_range'], 'lightning_range', ['lightning']], [['laser_damage', 'laser_charge', 'plating'], 'plating', ['laser']],
  ]
  const bad = []
  let k = 0
  for (const [ch, want, extra] of cases) {
    const w1 = extra.length ? wpn(extra[0]) : null
    const bb = createBrain(hello, ctxNone, { warmup: false })
    const a = bb.act(mkObs({ t: 100 + k++ * 0.1, self: { weapons: [wpn('gun'), w1] }, offer: { id: k, expires: 105, choices: ch.map((id) => ({ id })) } }), performance.now() + 27)
    if (ch[a.pick] !== want) bad.push(`${ch.join('/')} [${extra}] -> ${ch[a.pick]} (want ${want})`)
  }
  check('D7 upgrade order (12 offers)', bad.length === 0, bad.length ? bad.join(' | ') : '12/12 picks follow plating > armor > nanites > laser_damage > laser_charge > lightning_efficiency > gun_damage > ...')
}
// D7 pickups: empty slot laser > lightning > mortar; mortar only after 60 s with nothing better seen; SQUAD keeps the gun
{
  const out = []
  const tryTake = (weapons, kind, t = 100, over = {}) => {
    const b = createBrain(hello, ctxNone, { warmup: false, ...over })
    let a = null
    for (let k = 0; k < 3; k++) a = b.act(mkObs({ t: t + k * 0.1, self: { weapons }, pickups: [{ id: 8001, kind, pos: [1.5, 0, 0] }] }), performance.now() + 27)
    return a.take === 8001 ? `take${a.drop !== undefined ? ' drop ' + a.drop : ''}` : 'no'
  }
  const rows = [
    [[wpn('gun'), null], 'laser', 'take', 'gun+empty, laser'], [[wpn('gun'), null], 'lightning', 'take', 'gun+empty, lightning'],
    [[wpn('gun'), null], 'mortar', 'take', 'gun+empty, mortar at t=100 (nothing better seen)'],
    [[wpn('gun'), wpn('lightning')], 'laser', 'take drop 1', 'gun+lightning, laser'], [[wpn('gun'), wpn('laser')], 'lightning', 'no', 'gun+laser, lightning (SQUAD keeps gun+laser)'],
    [[wpn('gun'), wpn('mortar')], 'lightning', 'take drop 1', 'gun+mortar, lightning'], [[wpn('gun'), wpn('laser', { charge: 0.4 })], 'laser', 'no', 'charging laser'],
    [[wpn('gun'), wpn('mortar')], 'laser', 'take drop 1', 'gun+mortar, laser'],
  ]
  const bad = []
  for (const [w, kind, want, label] of rows) { const r = tryTake(w, kind); out.push(`${label}: ${r}`); if (r !== want) bad.push(`${label}: ${r} (want ${want})`) }
  // mortar at t=30 with nothing better seen for 60 s yet -> no
  const early = tryTake([wpn('gun'), null], 'mortar', 30)
  if (early !== 'no') bad.push(`mortar at t=30: ${early} (want no)`)
  // FFA latched + ffaPair: gun+laser, lightning offered -> take, drop the gun
  const ffa = tryTake([wpn('gun'), wpn('laser')], 'lightning', 100, { env: 'ffa' })
  if (ffa !== 'take drop 0') bad.push(`FFA gun+laser, lightning: ${ffa} (want take drop 0)`)
  check('D7 pickups: laser > lightning > mortar, mortar after 60 s, SQUAD keeps the gun, FFA pair, no swap while charging', bad.length === 0, bad.length ? bad.join(' | ') : out.join(' | ') + ` | mortar at 30 s: ${early} | FFA: ${ffa}`)
}
