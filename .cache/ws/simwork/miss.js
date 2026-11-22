import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { HouseBot, FFA_TYPES } from '../mechbot/sim/house.js'
const ctx = makeContext({ oldBalance: true })
let shown = 0
for (let k = 0; k < 3 && shown < 25; k++) {
  const bots = FFA_TYPES.map((t) => new HouseBot(t, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 100 + k, config: ctx.cfg, bots, mode: 'ffa' })
  const origFire = m._fireGun.bind(m)
  m._fireGun = (mm, st) => {
    const n0 = m.shots.length
    origFire(mm, st)
    const s = m.shots[m.shots.length - 1]
    if (m.shots.length > n0 && s.tgt < 100 && s.tof < 0.3) {
      const e = m.mechs[s.tgt]
      const brg = Math.atan2(e.y - mm.y, e.x - mm.x), el = Math.atan2(e.z + 4.5 - mm.z - 7, Math.hypot(e.x - mm.x, e.y - mm.y))
      s.dbg = `t=${m.t.toFixed(2)} ${bots[mm.id].type}->${bots[e.id].type} d=${s.range.toFixed(0)} yawErr=${((mm.yaw - brg) * 57.3).toFixed(1)} cmdErr=${((mm.cmdYaw - brg) * 57.3).toFixed(1)} pitch=${(mm.pitch * 57.3).toFixed(1)} el=${(el * 57.3).toFixed(1)} tv=${Math.hypot(e.vx, e.vy).toFixed(1)} tgnd=${e.grounded} dz=${(e.z - mm.z).toFixed(1)} sgnd=${mm.grounded} blockedMuzzle=${m._o[3]} clear=${ctx.world.shotClear(mm.x, mm.y, mm.z + 7, e.x, e.y, e.z + 4.5)}`
    }
  }
  m.runSync()
  for (const s of m.shots) if (s.dbg && !s.hit && shown < 25) { console.log(s.dbg); shown++ }
}
