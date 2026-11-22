import { Match } from '../mechbot/sim/sim.js'
import { makeContext, resolveBot } from '../mechbot/sim/run.js'
import { makeSquad } from '../mechbot/sim/house.js'
import { hashSeed } from '../mechbot/sim/rng.js'
const spec = process.argv[2] || 'sim/baseline_bot.js', N = parseInt(process.argv[3] || '5', 10), seed0 = parseInt(process.argv[4] || '1', 10)
const ctx = makeContext({ params: process.env.PARAMS || null })
const team = await resolveBot(spec, ctx)
for (let k = 0; k < N; k++) {
  const seed = seed0 + k, n = 16, slot = hashSeed(seed, 77) % n
  const bots = new Array(n); bots[slot] = team({ seed, slot })
  const sq = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: hashSeed(seed, 91) })
  let q = 0
  for (let i = 0; i < n; i++) if (i !== slot) { const b = sq.bots[q++]; b.team = 1; bots[i] = b }
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: 'squad', focus: slot })
  const inc = new Map(), out = new Map()
  const orig = m._hurtMech.bind(m)
  m._hurtMech = (e, base, weapon, by, sx, sy, eff) => {
    const hp0 = e.hp
    orig(e, base, weapon, by, sx, sy, eff)
    const amt = hp0 - e.hp
    if (e.id === slot) { const key = by < 100 ? `${bots[by].type}${by}/${sq.squad.role(by)}/${weapon}` : `npc/${weapon}`; const a = inc.get(key) || [0, m.t, m.t, 0]; a[0] += amt; a[2] = m.t; a[3]++; inc.set(key, a) }
    else if (by === slot) { const key = `${bots[e.id].type}${e.id}/${sq.squad.role(e.id)}`; const a = out.get(key) || [0, m.t, m.t, 0]; a[0] += amt; a[2] = m.t; a[3]++; out.set(key, a) }
  }
  const r = await m.run()
  const me = r.mechs[slot]
  console.log(`seed ${seed} place ${me.place} kills ${me.kills} t=${me.timeAlive.toFixed(1)} shots ${me.shotsFired} hit ${me.shotsHit} dealt ${me.dmgDealt} deadSquad ${r.mechs.filter((x) => !x.alive && x.id !== slot).map((x) => bots[x.id].type + '@' + x.timeAlive.toFixed(0) + ':' + x.cause).join(',')}`)
  console.log('   IN :', [...inc.entries()].map(([k2, a]) => `${k2} ${Math.round(a[0])} (${a[1].toFixed(0)}-${a[2].toFixed(0)}s, ${a[3]} hits)`).join(' | '))
  console.log('   OUT:', [...out.entries()].map(([k2, a]) => `${k2} ${Math.round(a[0])} (${a[1].toFixed(0)}-${a[2].toFixed(0)}s)`).join(' | '))
}
process.exit(0)
