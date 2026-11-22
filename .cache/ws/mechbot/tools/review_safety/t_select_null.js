// Targeted: selectTarget() dereferences `best` when every candidate got an index <= -1.
// Scene (legal): a nearly dead mech Y that hit us 3 times ducks behind a building (still listed: vision memory),
// while a drone we never saw keeps hitting us from outside our view (phantom track -> A > 0, not a candidate).
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mulberry } from './common.js'
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const rnd = mulberry(3), b = world.bounds
// find S and Y with no line either way (centre and head), 50-70 m apart
let S = null, Y = null
for (let k = 0; k < 200000 && !S; k++) {
  const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY)
  if (!nav.passableAt(x, y)) continue
  const a = rnd() * 6.283, d = 50 + rnd() * 20, x2 = x + d * Math.cos(a), y2 = y + d * Math.sin(a)
  if (!nav.passableAt(x2, y2)) continue
  const z = nav.levelAt(x, y), z2 = nav.levelAt(x2, y2)
  const clear = (h1, h2) => world.shotClear(x, y, z + h1, x2, y2, z2 + h2) || world.shotClear(x2, y2, z2 + h2, x, y, z + h1)
  if (!clear(7, 4.5) && !clear(7, 7.65) && !clear(4.5, 7) && !clear(8.1, 7) && !clear(8, 8)) { S = [x, y, z]; Y = [x2, y2, z2] }
}
console.log('self', S.map((v) => +v.toFixed(1)), 'Y', Y.map((v) => +v.toFixed(1)))
for (const yHp of [1400, 400, 100, 40]) {
  const logs = []
  const brain = createBrain(hello, { world, nav, log: (...a) => logs.push(a.join(' ')) }, { warmup: false })
  let firstErrTick = -1, nullTargetTicks = 0, errTicks = 0, prevErr = 0, tgtAtErr = null
  for (let k = 0; k < 70; k++) {
    const events = []
    if (k >= 2 && k <= 4) events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: Math.atan2(Y[1] - S[1], Y[0] - S[0]), by: 5 })
    if (k >= 4 && k % 10 === 5) events.push({ type: 'damaged', amount: 25, weapon: 'npc', bearing: -2.0, by: 107 })     // unseen drone, 1 shot per second
    const obs = mkObs(cfg, k * 2, { self: mkSelf(cfg, { pos: S, hp: 1000 }), mechs: [mkMech(5, Y, { hp: yHp })], events })
    brain.act(obs, performance.now() + 27.5)
    const B = brain._B
    const e = B.counters.errors
    if (e > prevErr) { errTicks++; if (firstErrTick < 0) { firstErrTick = k; tgtAtErr = B.target ? B.target.id : null } }
    prevErr = e
    if (k > 20 && !B.target) nullTargetTicks++
  }
  const st = brain.debugState()
  console.log(`Y hp ${String(yHp).padStart(4)}: stage errors ${JSON.stringify(st.errors)} on ${errTicks} decisions (first at decision ${firstErrTick}, target then ${tgtAtErr}); decisions without a target after #20: ${nullTargetTicks}`)
  if (logs.length) console.log('   ' + logs[0].split('\n').slice(0, 3).join(' | ').slice(0, 400))
}
