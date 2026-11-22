// Scenario 3: torso veto versus the fire gate. A nearly dead target stands east of us (kill-secure), a shooter
// stands west of us and hits us for more than 60 dps. The veto (stance.aimVeto) runs AFTER fire control decided
// the triggers, so it can turn the torso away from the target while `fire` stays true.
import { brainBot, runScenario, scripted, leadAim, OPEN } from './scen.js'
const shooter = scripted('shooter', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  if (!t) return { move: [0, 0] }
  return { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] }
})
const dummy = scripted('dummy', () => ({ move: [0, 0] }))
let M = null
const ours = brainBot({}, (row, obs, a, B) => {
  if (M) { M.mechs[1].hp = 120; M.mechs[0].hp = Math.max(M.mechs[0].hp, 1200) }   // keep the situation frozen
  const tg = B.target
  row.tgtBearing = tg ? Math.atan2(tg.y - B.me.y, tg.x - B.me.x) : null
  row.vetoes = B.counters.aimVetoes || 0
})
const { res } = runScenario({ bots: [ours, dummy, shooter], seed: 3, maxT: 20,
  place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + 70, y: OPEN.y, yaw: Math.PI }, { x: OPEN.x - 70, y: OPEN.y, yaw: 0 }], setup(m) { M = m } })
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
let fireTicks = 0, fireOff = 0, tgtEast = 0, n = 0, maxOff = 0
for (const r of ours.rows) {
  if (r.t < 3) continue
  n++
  if (r.tgt === 1) tgtEast++
  if (r.f0 && r.tgt === 1) {
    fireTicks++
    const off = Math.abs(wrap(r.aimYaw - r.tgtBearing))
    if (off > 0.1) fireOff++
    if (off > maxOff) maxOff = off
  }
}
const last = ours.rows[ours.rows.length - 1]
console.log(`decisions after t=3: ${n}; target = the kill-secure mech on ${tgtEast}`)
console.log(`decisions with gun trigger down on that target: ${fireTicks}; of those with the commanded yaw more than 0.1 rad off the target: ${fireOff} (worst ${(maxOff * 180 / Math.PI).toFixed(0)} deg)`)
console.log(`aim vetoes counted by the brain: ${last.vetoes}; shots fired ${res.mechs[0].shotsFired}, shots hit ${res.mechs[0].shotsHit}`)
for (const r of ours.rows.filter((r) => r.t >= 5 && r.t < 6.0)) console.log(`  t=${r.t.toFixed(1)} mode=${r.mode} tgt=${r.tgt} aimKind=${r.aim} cmdYaw=${(r.aimYaw * 180 / Math.PI).toFixed(0)} tgtBearing=${r.tgtBearing === null ? '-' : (r.tgtBearing * 180 / Math.PI).toFixed(0)} fire=${r.f0} ammo=${r.ammo}`)
