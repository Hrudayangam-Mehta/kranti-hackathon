import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { HouseBot, FFA_TYPES } from '../mechbot/sim/house.js'
const ctx = makeContext({ oldBalance: true, params: process.env.PARAMS || null })
for (let k = 0; k < 6; k++) {
  const bots = FFA_TYPES.map((t) => new HouseBot(t, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 1 + k, config: ctx.cfg, bots, mode: 'ffa' })
  const dmg = new Map()
  const orig = m._hurtMech.bind(m)
  m._hurtMech = (e, base, weapon, by, sx, sy, eff) => {
    const hp0 = e.hp
    const d = by >= 0 && by < 100 ? Math.hypot(m.mechs[by].x - e.x, m.mechs[by].y - e.y) : 0
    orig(e, base, weapon, by, sx, sy, eff)
    const a = dmg.get(e.id) || []; a.push([m.t, by, weapon, hp0 - e.hp, d]); dmg.set(e.id, a)
  }
  const orig2 = m._kill.bind(m)
  let n = 0
  m._kill = (mm, by, weapon) => {
    if (n++ < 3) {
      const a = dmg.get(mm.id) || []
      const byW = {}; const byA = {}; let dist = 0
      for (const [t, b, w, amt, d] of a) { byW[w] = (byW[w] || 0) + amt; byA[b] = (byA[b] || 0) + amt; dist += d }
      console.log(`seed ${1 + k} t=${m.t.toFixed(1)} victim ${bots[mm.id].type} first hit t=${a[0]?.[0].toFixed(1)} hits ${a.length} meanDist ${(dist / a.length).toFixed(0)} byWeapon ${JSON.stringify(Object.fromEntries(Object.entries(byW).map(([q, v]) => [q, Math.round(v)])))} attackers ${Object.entries(byA).map(([q, v]) => `${q < 100 ? bots[q].type : 'npc'}:${Math.round(v)}`).join(',')} total ${Math.round(mm.dmgTaken)}`)
    }
    orig2(mm, by, weapon)
  }
  m.runSync()
}
