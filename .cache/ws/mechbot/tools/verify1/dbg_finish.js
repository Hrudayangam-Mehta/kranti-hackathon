import { createBrain, hello, ctxNone, mkObs, mech, dmgBy, cfg } from './common.js'
const H = cfg.mech.hp
for (const [n, thf] of [[2, 0.15], [1, 0.15]]) {
  const b = createBrain(hello, ctxNone, { warmup: false })
  for (let k = 0; k < 20; k++) {
    const t = 100 + k * 0.1, mechs = [], events = []
    for (let i = 0; i < n; i++) { const a = i * Math.PI; mechs.push(mech(10 + i, 80 * Math.cos(a), 80 * Math.sin(a), { hp: (i === 0 ? thf : 1) * H })); if (k % 10 === 0) events.push(dmgBy(10 + i, 45, a)) }
    b.act(mkObs({ t, mechs, events, self: { hp: 0.3 * H } }), performance.now() + 27)
    const B = b._B
    if (k < 4 || k % 5 === 0) console.log(n, k, 'target', B.target && B.target.id, 'hp', B.target && B.target.hp, 'threats', B.threats, 'finishing', B.finishing, 'losing', B.losing, 'mode', B.mode, 'stance', B.stance, 'lastStand', B.lastStand, 'doomed', B.doomed, 'veto', B.vetoT)
  }
}
