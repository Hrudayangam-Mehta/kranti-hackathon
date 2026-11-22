// Scenario 8: LAST-STAND without a shot fired. Three mechs stand 80 m away on open ground and aim at us but never
// shoot. The "doomed" test uses the prior dps of every aiming mech, so the brain can declare a last stand at full hp,
// walk to a wall cell ("bastion") and stop moving.
import { brainBot, runScenario, scripted, leadAim, OPEN } from './scen.js'
const watcher = (fire) => scripted('watcher', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [fire && obs.t > 6, false] } : { move: [0, 0] }
})
for (const [label, fire, n] of [['3 mechs aiming, never shooting', false, 3], ['2 mechs aiming, never shooting', false, 2], ['3 mechs, shooting from t=6 s', true, 3]]) {
  let M = null
  const ours = brainBot({}, (row, obs, a, B) => { row.doomed = B.doomed; row.tCover = B.tCover; if (M) for (let i = 1; i <= n; i++) M.mechs[i].hp = 1400 })
  const bots = [ours], place = [{ x: OPEN.x, y: OPEN.y, yaw: 0 }]
  for (let i = 0; i < n; i++) { bots.push(watcher(fire)); const a = (i - 1) * 0.5; place.push({ x: OPEN.x + 80 * Math.cos(a), y: OPEN.y + 80 * Math.sin(a), yaw: Math.PI }) }
  const { res } = runScenario({ bots, seed: 2, maxT: 20, place, setup(m) { M = m } })
  const rows = ours.rows
  const ls = rows.filter((r) => r.st === 'LAST-STAND')
  const first = ls[0]
  const still = ls.filter((r) => r.spd < 1).length
  const stillAll = rows.filter((r) => r.t > 2 && r.spd < 1).length
  const dmg = rows.reduce((s, r) => s + r.evs.filter((e) => e.type === 'damaged').reduce((q, e) => q + e.amount, 0), 0)
  console.log(`${label}: LAST-STAND on ${ls.length}/${rows.length} decisions${first ? `, first at t=${first.t} with hp ${first.hp.toFixed(0)} (A=${first.A.toFixed(0)}, tCover=${first.tCover.toFixed(1)} s, hide=${first.hide})` : ''}; standing still on ${still} of them; standing still overall after t=2: ${stillAll}/${rows.filter((r) => r.t > 2).length}; damage taken ${dmg.toFixed(0)}; alive ${res.mechs[0].alive}`)
  const legs = {}
  for (const r of rows) legs[r.mode + '/' + r.leg + '/' + r.st.slice(0, 4)] = (legs[r.mode + '/' + r.leg + '/' + r.st.slice(0, 4)] || 0) + 1
  console.log('   ', JSON.stringify(legs))
}
