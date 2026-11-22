import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { HouseBot, FFA_TYPES } from '../mechbot/sim/house.js'
const N = parseInt(process.argv[2] || '6', 10)
const ctx = makeContext({ oldBalance: true, params: process.env.PARAMS || null })
const cell = {}
const add = (k, hit) => { const c = cell[k] || (cell[k] = [0, 0]); c[1]++; if (hit) c[0]++ }
for (let k = 0; k < N; k++) {
  const bots = FFA_TYPES.map((t) => new HouseBot(t, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 100 + k, config: ctx.cfg, bots, mode: 'ffa' })
  // sample target velocity at fire and 0.5 tof later through a tick hook
  const pend = []
  const origTick = m._tick.bind(m)
  let seen = 0
  m._tick = () => {
    origTick()
    for (; seen < m.shots.length; seen++) { const s = m.shots[seen]; if (s.tgt < 100) { const e = m.mechs[s.tgt], sh = m.mechs[s.by]; s.v0 = [e.vx, e.vy]; s.due = m.t + s.tof; let off = Math.atan2(sh.y - e.y, sh.x - e.x) - e.yaw; off = Math.abs(Math.atan2(Math.sin(off), Math.cos(off))); s.sees = off <= 1.0472 || Math.hypot(sh.x - e.x, sh.y - e.y) < 45; pend.push(s) } }
    for (let i = pend.length - 1; i >= 0; i--) { const s = pend[i]; if (m.t >= s.due) { const e = m.mechs[s.tgt]; s.dv = Math.hypot(e.vx - s.v0[0], e.vy - s.v0[1]); s.sp = Math.hypot(s.v0[0], s.v0[1]); pend.splice(i, 1) } }
  }
  m.runSync()
  for (const s of m.shots) {
    if (s.tgt >= 100 || s.dv === undefined) continue
    const band = s.tof < 0.3 ? 'a<.3' : s.tof < 0.4 ? 'b.3-.4' : s.tof < 0.5 ? 'c.4-.5' : s.tof < 0.6 ? 'd.5-.6' : s.tof < 0.8 ? 'e.6-.8' : s.tof < 1.0 ? 'f.8-1' : 'g>1'
    add(`tof ${band} ${s.air ? 'air' : 'gnd'}`, s.hit)
    if (!s.air && s.tof >= 0.5) add(`view ${s.tof < 0.7 ? '.5-.7' : s.tof < 1 ? '.7-1' : '>1'} ${s.sees ? 'sees' : 'blind'}`, s.hit)
    if (s.tof >= 0.3 && s.tof < 1.0 && !s.air) add(`dv ${s.dv < 4 ? '<4' : s.dv < 9 ? '4-9' : '>9'}`, s.hit)
    if (s.tof >= 0.3 && s.tof < 1.0 && !s.air) add(`speed0 ${s.sp < 2 ? '<2' : s.sp < 6 ? '2-6' : '>6'}`, s.hit)
  }
}
for (const k of Object.keys(cell).sort()) console.log(k.padEnd(22), `${cell[k][0]}/${cell[k][1]}`.padStart(10), (100 * cell[k][0] / cell[k][1]).toFixed(0) + '%')
console.log('replay view: .5-.7 sees 25% blind 30% | .7-1 sees 19% blind 37% | >1 sees 17% blind 37%')
console.log('replay grounded-unblocked: .3-.4 86% | .4-.5 57% | .5-.6 32% | .6-.8 23% | .8-1 22% ; dv<4 80% (15% of shots) 4-9 52% >9 22%')
