// D5 "never leave a target under 25% hp for a fresh one" vs the torso-veto target rule (attacker > 80 deg off).
import { createBrain, hello, ctxNone, check, mkObs, mech, dmgBy, cfg } from './common.js'
const H = cfg.mech.hp
function run(attAngleDeg, ourHp, secs, startWith10First) {
  const b = createBrain(hello, ctxNone, { warmup: false })
  const tl = []
  const a2 = attAngleDeg * Math.PI / 180
  for (let k = 0; k < secs * 10; k++) {
    const t = 100 + k * 0.1
    const mechs = [mech(10, 80, 0, { hp: 0.15 * H })]
    const events = []
    if (k % 10 === 0) events.push(dmgBy(10, 45, 0))
    if (!startWith10First || k >= 10) { mechs.push(mech(11, 80 * Math.cos(a2), 80 * Math.sin(a2))); if (k % 3 === 0) events.push(dmgBy(11, 45, a2)) }
    b.act(mkObs({ t, mechs, events, self: { hp: ourHp * H } }), performance.now() + 27)
    tl.push(b.debugState().target)
  }
  return tl
}
const s = (tl) => tl.map((x) => x === 10 ? 'a' : x === 11 ? 'B' : '-').join('')
const r1 = run(180, 0.8, 4, true)
const r2 = run(180, 0.8, 4, false)
const r3 = run(60, 0.8, 4, true)
const left1 = r1.slice(10).some((x) => x !== 10), left2 = r2.some((x) => x !== 10)
console.log('a = mech 10 (15% hp, finishable, 80 m), B = mech 11 (full hp, attacker, 180 deg off), one char per decision')
console.log('10 alone first, then 11 appears behind us:', s(r1))
console.log('both from the start:                       ', s(r2))
console.log('11 appears 60 deg off (no veto):          ', s(r3))
check('D5 a target under 25% hp is never left for a fresh one (attacker behind us)', !left1 && !left2,
  `10 first: ${s(r1)} | both at once: ${s(r2)} (a = the 15% target, B = the fresh attacker)`)
