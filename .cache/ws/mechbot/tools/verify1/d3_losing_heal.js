// D3: LOSING table (with finish exception and hysteresis), HEAL entry / exit, healExit preset. No map (pure logic).
import { createBrain, hello, ctxNone, check, fx, mkObs, mech, dmgBy, cfg } from './common.js'
const H = cfg.mech.hp
// n threats around us at 80 m, all aiming at us and having hit us (events every second), our hp fraction hpf, target hp fraction thf
function losingAfter(n, hpf, thf, over = {}, secs = 2, spread = 1) {
  const b = createBrain(hello, ctxNone, { warmup: false, ...over })
  let st = null, modes = {}
  for (let k = 0; k < secs * 10; k++) {
    const t = 100 + k * 0.1
    const mechs = [], events = []
    for (let i = 0; i < n; i++) { const a = i * spread * 2 * Math.PI / Math.max(1, n); mechs.push(mech(10 + i, 80 * Math.cos(a), 80 * Math.sin(a), { hp: (i === 0 ? thf : 1) * H })); if (k % 10 === 0) events.push(dmgBy(10 + i, 45, a)) }
    b.act(mkObs({ t, mechs, events, self: { hp: hpf * H } }), performance.now() + 27)
    st = b.debugState(); modes[st.mode] = (modes[st.mode] || 0) + 1
  }
  return { losing: st.losing, mode: st.mode, modes }
}
const rows = [
  // [threats, our hp, target hp, expected LOSING, label]
  [1, 0.34, 0.45, true, '1 threat, hp 34%, target 45% (>= ours+10)'],
  [1, 0.34, 0.40, false, '1 threat, hp 34%, target 40% (< ours+10)'],
  [1, 0.36, 1.00, false, '1 threat, hp 36%'],
  [2, 0.49, 1.00, true, '2 threats, hp 49%'],
  [2, 0.51, 1.00, false, '2 threats, hp 51%'],
  [3, 0.59, 1.00, true, '3 threats, hp 59%'],
  [3, 0.61, 1.00, false, '3 threats, hp 61%'],
  [5, 0.59, 1.00, true, '5 threats, hp 59%'],
  [6, 1.00, 1.00, true, '6 threats, hp 100%'],
  [2, 0.30, 0.15, false, 'finish: 2 threats 60 deg apart, hp 30%, target 15%', 1 / 6],
  [2, 0.30, 0.15, true, 'finish row with the threats 180 deg apart (torso-veto flip, see D5 check): LOSING expected only because of the flip'],
  [3, 0.30, 0.15, true, 'no finish with 3 threats: hp 30%, target 15%'],
  [1, 0.10, 0.15, false, 'finish: 1 threat, hp 10%, target 15%'],
]
const bad = []
for (const [n, h, th, exp, label, sp] of rows) { const r = losingAfter(n, h, th, {}, 2, sp ?? 1); if (r.losing !== exp) bad.push(`${label}: losing=${r.losing} (want ${exp}) modes ${JSON.stringify(r.modes)}`); else console.log(`   ok  ${label}: losing=${r.losing} mode ${r.mode}`) }
check('D3 LOSING table literal (12 rows incl. finish exception)', bad.length === 0, bad.length ? bad.join(' | ') : '13/13 rows as written')
// LOSING -> DISENGAGE mode (break the line), still shooting
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  let dis = 0, fire = 0
  for (let k = 0; k < 30; k++) {
    const t = 100 + k * 0.1
    const mechs = [mech(10, 80, 0, { hp: H }), mech(11, -80, 0, { hp: H })]
    const a = b.act(mkObs({ t, mechs, events: k % 10 === 0 ? [dmgBy(10), dmgBy(11, 45, Math.PI)] : [], self: { hp: 0.45 * H } }), performance.now() + 27)
    const st = b.debugState(); if (st.mode === 'DISENGAGE') dis++; if (a.fire[0]) fire++
  }
  check('D3 LOSING retreat keeps shooting (2 threats, 45% hp)', dis >= 25 && fire > 0, `DISENGAGE ${dis}/30 decisions, gun trigger down on ${fire}`)
}
// hysteresis: 2 threats, hp drops to 48% (LOSING), then rises to 52% (stays LOSING: needs > 55%), then 56% (leaves)
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  const seq = [[0.48, 20], [0.52, 30], [0.56, 30]]
  const out = []
  let t = 100
  for (const [hpf, n] of seq) { let last = null; for (let k = 0; k < n; k++) { t += 0.1; const mechs = [mech(10, 80, 0), mech(11, -80, 0)]; b.act(mkObs({ t, mechs, events: Math.round(t * 10) % 10 === 0 ? [dmgBy(10), dmgBy(11, 45, Math.PI)] : [], self: { hp: hpf * H } }), performance.now() + 27); last = b.debugState().losing } out.push(`${hpf}:${last}`) }
  check('D3 LOSING hysteresis +5 points', out.join(' ') === '0.48:true 0.52:true 0.56:false', out.join(' '))
}
// HEAL entry: out of contact (nobody listed, not shot) 1.5 s, hp < 55%
function healRun(hpf, secs, over = {}, hpRise = 0) {
  const b = createBrain(hello, ctxNone, { warmup: false, ...over })
  const modes = []; let hp = hpf
  for (let k = 0; k < secs * 10; k++) { hp = Math.min(1, hp + hpRise); b.act(mkObs({ t: 100 + k * 0.1, self: { hp: hp * H } }), performance.now() + 27); modes.push([b.debugState().mode, hp]) }
  return modes
}
{
  const m54 = healRun(0.54, 3), m56 = healRun(0.56, 3)
  const first = m54.findIndex((m) => m[0] === 'HEAL')
  check('D3 HEAL entry below 55% out of contact (54% enters, 56% does not)', first >= 0 && !m56.some((m) => m[0] === 'HEAL'), `54%: HEAL from decision ${first} (t+${fx(first * 0.1, 1)} s) | 56%: modes ${[...new Set(m56.map((m) => m[0]))]}`)
  const r = healRun(0.5, 20, {}, 0.003)
  const exit = r.findIndex((m, i) => i > 0 && r[i - 1][0] === 'HEAL' && m[0] !== 'HEAL')
  const r90 = healRun(0.5, 30, { select: { healExit: '90' } }, 0.003)
  const exit90 = r90.findIndex((m, i) => i > 0 && r90[i - 1][0] === 'HEAL' && m[0] !== 'HEAL')
  check('D3 HEAL exit at healExit 70% (preset healExit=90 -> 90%)', exit > 0 && Math.abs(r[exit][1] - 0.7) < 0.01 && exit90 > 0 && Math.abs(r90[exit90][1] - 0.9) < 0.01,
    `default exit at hp ${exit > 0 ? fx(r[exit][1], 3) : 'never'} | healExit=90: exit at ${exit90 > 0 ? fx(r90[exit90][1], 3) : 'never'}`)
}
// HEAL after LOSING: 2 threats at 45% -> LOSING; threats vanish; hp 80% (< 90%) within 6 s -> HEAL; exit after 6 s at 70% rule
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  let t = 100; const tl = []
  for (let k = 0; k < 20; k++) { t += 0.1; b.act(mkObs({ t, mechs: [mech(10, 80, 0), mech(11, -80, 0)], events: k % 10 === 0 ? [dmgBy(10), dmgBy(11, 45, Math.PI)] : [], self: { hp: 0.45 * H } }), performance.now() + 27) }
  const wasLosing = b.debugState().losing
  for (let k = 0; k < 120; k++) { t += 0.1; b.act(mkObs({ t, self: { hp: 0.8 * H } }), performance.now() + 27); tl.push(b.debugState().mode) }
  const heal = tl.filter((m) => m === 'HEAL').length, firstHeal = tl.indexOf('HEAL'), lastHeal = tl.lastIndexOf('HEAL')
  check('D3 HEAL after a LOSING retreat while hp < 90% (6 s window), then leaves (80% >= healExit)', wasLosing && heal > 0 && lastHeal < 119,
    `losing before ${wasLosing}; HEAL decisions ${heal}, from +${fx(firstHeal * 0.1, 1)} s to +${fx(lastHeal * 0.1, 1)} s after the threats vanished; final ${tl[119]}`)
}
// HEAL left when a mech gets a line and we are not LOSING (hp 50%, 1 threat at full hp: not LOSING -> FIGHT)
{
  const b = createBrain(hello, ctxNone, { warmup: false })
  let t = 100
  for (let k = 0; k < 30; k++) { t += 0.1; b.act(mkObs({ t, self: { hp: 0.5 * H } }), performance.now() + 27) }
  const before = b.debugState().mode
  const ms = []
  for (let k = 0; k < 15; k++) { t += 0.1; b.act(mkObs({ t, mechs: [mech(10, 90, 0)], events: k === 0 ? [dmgBy(10)] : [], self: { hp: 0.5 * H } }), performance.now() + 27); ms.push(b.debugState().mode) }
  check('D3 HEAL left when a mech has a line and we are not LOSING', before === 'HEAL' && ms.slice(-5).every((m) => m === 'FIGHT'), `before ${before}; then ${ms.join(',')}`)
}
// no hiding when not LOSING and hp >= 55%: 1 threat at 60% hp -> FIGHT
{
  const r = losingAfter(1, 0.6, 1.0, {}, 3)
  check('D3 no hide at hp >= 55% when not LOSING (1 threat, 60%)', !r.losing && r.mode === 'FIGHT' && !r.modes.HEAL && !r.modes.DISENGAGE, JSON.stringify(r.modes))
}
