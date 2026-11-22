import { Match } from '../mechbot/sim/sim.js'
import { makeContext, resolveBot } from '../mechbot/sim/run.js'
import { makeSquad } from '../mechbot/sim/house.js'
import { hashSeed } from '../mechbot/sim/rng.js'
const spec = process.argv[2], N = parseInt(process.argv[3] || '10', 10), full = process.argv[4] === 'full'
const ctx = makeContext({ params: process.env.PARAMS || null })
const team = await resolveBot(spec, ctx)
const causes = {}, tAlive = [], scores = [], huntersAtDeath = []
let squadDeathsBefore = 0
for (let k = 0; k < N; k++) {
  const seed = 1 + k, n = 16, slot = hashSeed(seed, 77) % n
  const bots = new Array(n); bots[slot] = team({ seed, slot })
  const sq = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: hashSeed(seed, 91) })
  let q = 0
  for (let i = 0; i < n; i++) if (i !== slot) { const b = sq.bots[q++]; b.team = 1; bots[i] = b }
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: 'squad', focus: full ? null : slot })
  const r = await m.run()
  const me = r.mechs[slot]
  tAlive.push(me.timeAlive); scores.push(16 - me.place); huntersAtDeath.push(sq.squad.hunters.size)
  for (const x of r.mechs) if (x.id !== slot && !x.alive && (me.alive || x.timeAlive <= me.timeAlive)) { const c = `${bots[x.id].type}:${x.cause}`; causes[c] = (causes[c] || 0) + 1; squadDeathsBefore++ }
  if (process.argv[5]) console.log(seed, 'score', 16 - me.place, 't', me.timeAlive.toFixed(0), me.cause, 'squad deaths', r.mechs.filter((x) => x.id !== slot && !x.alive).map((x) => `${bots[x.id].type}@${x.timeAlive.toFixed(0)}:${x.cause}`).join(' '))
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
console.log(spec, 'matches', N, 'mean score', mean(scores).toFixed(2), 'mean alive', mean(tAlive).toFixed(0), 's; squad deaths before the team bot died per match', (squadDeathsBefore / N).toFixed(2), JSON.stringify(causes), 'hunters at death', mean(huntersAtDeath).toFixed(1))
process.exit(0)
