// Scenario 15: trace of the 1 v 1 of scenario 14 (standing exact-lead gun shooter at 75 m, full hp both).
// Prints every mode / leg change with both hp values, plus totals: time per mode, shots, hits each way.
import { brainBot, runScenario, scripted, leadAim, env } from './scen.js'
const args = process.argv.slice(2)
const spot = { x: Number(args[0] ?? -244), y: Number(args[1] ?? 14) }, seed = Number(args[2] ?? 1)
const ov = args[3] ? JSON.parse(args[3]) : {}
const mech = scripted('mech', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0] }
})
const { world, nav } = env()
const clear = (dir) => nav.passableAt(spot.x + dir * 75, spot.y) && world.shotClear(spot.x, spot.y, nav.levelAt(spot.x, spot.y) + 7, spot.x + dir * 75, spot.y, nav.levelAt(spot.x + dir * 75, spot.y) + 4.5)
const dir = clear(1) ? 1 : -1
let M = null
const ours = brainBot(ov, (row, obs, a, B) => { row.ehp = M ? M.mechs[1].hp : 0; row.fightOk = B.fightOk; row.winning = B.winning; row.tCover = B.tCover; row.tlos = B.target ? (B.target.losOut ? 'o' : '-') + (B.target.losIn ? 'i' : '-') : '' })
const { res } = runScenario({ bots: [ours, mech], seed, maxT: 90, place: [{ x: spot.x, y: spot.y, yaw: 0 }, { x: spot.x + dir * 75, y: spot.y, yaw: 0 }], setup(m) { M = m } })
let prev = null
const tm = {}
for (const r of ours.rows) {
  const key = r.mode + '/' + r.leg
  tm[r.mode] = (tm[r.mode] || 0) + 0.1
  if (!prev || prev.mode + '/' + prev.leg !== key) console.log(`t=${r.t.toFixed(1).padStart(5)} ${key.padEnd(20)} ${r.st.slice(0, 4)} hp ${r.hp.toFixed(0).padStart(4)} enemy ${r.ehp.toFixed(0).padStart(4)} d=${r.td.toFixed(0).padStart(3)} los=${r.tlos} A=${r.A.toFixed(0).padStart(3)} fightOk=${r.fightOk ? 1 : 0} winning=${r.winning ? 1 : 0} tCover=${r.tCover.toFixed(1)} hide=${r.hide} ammo=${r.ammo}`)
  prev = r
}
console.log(JSON.stringify({ us: { alive: res.mechs[0].alive, hp: res.mechs[0].hp, shots: res.mechs[0].shotsFired, hits: res.mechs[0].shotsHit }, enemy: { alive: res.mechs[1].alive, hp: res.mechs[1].hp, shots: res.mechs[1].shotsFired, hits: res.mechs[1].shotsHit }, secondsPerMode: Object.fromEntries(Object.entries(tm).map(([k, v]) => [k, +v.toFixed(1)])) }))
