// DEV ONLY: a deliberately trivial reference bot. It walks straight at the centre of the next circle and
// shoots at the nearest mech it can see, with no lead, no navigation and no cover. Use it as the floor when
// comparing bots in the simulator:  bun sim/run.js --bot sim/baseline_bot.js --mode squad --matches 40
export function createBot() {
  return {
    name: 'baseline',
    hello() { return { type: 'ready', name: 'baseline' } },
    act(obs) {
      const me = obs.self
      const [x, y, z] = me.pos
      const c = obs.zone.next_center
      const toC = Math.atan2(c[1] - y, c[0] - x)
      const far = Math.hypot(c[0] - x, c[1] - y) > Math.max(6, obs.zone.next_radius * 0.3)
      const act = { tick: obs.tick, move: far ? [Math.cos(toC), Math.sin(toC)] : [0, 0], boost: !me.in_zone, aim: [toC, 0], fire: [false, false] }
      if (obs.offer) act.pick = 0
      let best = null, bd = Infinity
      for (const m of obs.mechs) {
        if (m.kind !== 'mech') continue
        const d = Math.hypot(m.pos[0] - x, m.pos[1] - y)
        if (d < bd) { bd = d; best = m }
      }
      if (best) {
        const dz = best.pos[2] + 4.5 - (z + (me.stats.muzzle_height || 7))
        act.aim = [Math.atan2(best.pos[1] - y, best.pos[0] - x), Math.atan2(dz, bd || 1)]
        act.fire = [true, true]
      }
      // hop over whatever blocks the straight line
      if (obs.tick % 60 === 0 && far) act.jump = true
      return act
    },
  }
}
export default createBot
