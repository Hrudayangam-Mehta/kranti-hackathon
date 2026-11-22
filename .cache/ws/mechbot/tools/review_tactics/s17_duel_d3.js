// Scenario 17 (variants of scenario 16, retreat thresholds pushed toward doctrine D3 through overrides): 1 v 1 at 75 m near cover against a standing exact-lead gun shooter (the house-bot aim), full hp
// both, 8 spots x 3 seeds, the shooter either in front of us or behind us at the start. Brain variants by overrides.
import { brainBot, runScenario, scripted, leadAim, env } from './scen.js'
const { world, nav } = env()
const spots = []
for (let x = -300; x < 350 && spots.length < 8; x += 14) for (let y = -280; y < 250 && spots.length < 8; y += 14) {
  if (!nav.passableAt(x, y)) continue
  const wd = nav.wallDistAt(x, y)
  if (wd < 8 || wd > 14) continue
  for (const dir of [1, -1]) {
    const x2 = x + dir * 75
    if (!nav.passableAt(x2, y) || !nav.walkLine(x, y, x2, y) || nav.wallDistAt(x2, y) < 6) continue
    if (!world.shotClear(x, y, nav.levelAt(x, y) + 7, x2, y, nav.levelAt(x2, y) + 4.5)) continue
    if (spots.every((s) => Math.hypot(s.x - x, s.y - y) > 100)) spots.push({ x, y, x2, dir })
    break
  }
}
const mech = () => scripted('mech', (obs) => {
  const t = obs.mechs.find((m) => m.id === 0)
  return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0] }
})
const VARIANTS = [['no bastion + readyCd 0.10', { bastionWall: -100, readyCd: 0.1 }],
  ['... + fight on (hEscBase -5000), heal <35% / exit 70%', { bastionWall: -100, readyCd: 0.1, hEscBase: -5000, healEnter: 0.35, healSoft: 0.35, healExit: 0.7 }],
  ['... + latency 0.05', { bastionWall: -100, readyCd: 0.1, hEscBase: -5000, healEnter: 0.35, healSoft: 0.35, healExit: 0.7, latency: 0.05 }]]
console.log(`${spots.length} spots`)
console.log('start facing | variant                         | kills | mean s to kill | deaths | LAST-STAND decisions | standing still while shot at')
for (const facing of ['enemy', 'away']) for (const [name, ov] of VARIANTS) {
  let wins = 0, n = 0, tSum = 0, deaths = 0, ls = 0, still = 0, exposed = 0
  for (const s of spots) for (let seed = 1; seed <= 3; seed++) {
    const ours = brainBot(ov)
    const yaw = facing === 'enemy' ? (s.dir > 0 ? 0 : Math.PI) : (s.dir > 0 ? Math.PI : 0)
    const { res } = runScenario({ bots: [ours, mech()], seed, maxT: 90, place: [{ x: s.x, y: s.y, yaw }, { x: s.x2, y: s.y, yaw: s.dir > 0 ? Math.PI : 0 }] })
    n++
    if (!res.mechs[1].alive) { wins++; tSum += res.mechs[1].timeAlive }
    if (!res.mechs[0].alive) deaths++
    for (const r of ours.rows) { if (r.st === 'LAST-STAND') ls++; if (r.lastLosInAge <= 0.15) { exposed++; if (r.spd < 1) still++ } }
  }
  console.log(`${facing.padEnd(12)} | ${name.padEnd(54)} | ${String(wins).padStart(2)}/${n} | ${(wins ? tSum / wins : 0).toFixed(1).padStart(14)} | ${String(deaths).padStart(6)} | ${String(ls).padStart(20)} | ${(100 * still / Math.max(1, exposed)).toFixed(0)}%`)
}
