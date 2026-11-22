// panel R4: why the V1 build rarely holds a laser in the simulator (read-only probe). bun laserprobe.js <from> <to>
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
for (let seed = from; seed <= to; seed++) {
  let brain = null, firstLaserSeen = null, nearestLaserSeen = 1e9, laserSeenN = new Set(), kills = [], laserT = -1, inContactWithLaserNear = 0, lootLaser = 0, grabLaser = 0
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, me = B.me, t = obs.t
      if (!me.laser) for (const p of obs.pickups || []) if (p.kind === 'laser') {
        const d = Math.hypot(p.pos[0] - me.x, p.pos[1] - me.y)
        laserSeenN.add(p.id)
        if (!firstLaserSeen) firstLaserSeen = { t: +t.toFixed(1), d: Math.round(d) }
        if (d < nearestLaserSeen) nearestLaserSeen = Math.round(d)
        if (d < 120 && B.mode === 'FIGHT') inContactWithLaserNear += 0.1
      }
      if (!me.laser && B.loot && B.loot.type === 'pickup') lootLaser += 0.1
      if (!me.laser && B.grab && B.grab.type === 'pickup') grabLaser += 0.1
      for (const e of obs.events || []) if (e && e.type === 'kill' && e.target < 100) { const tr = B.tracks.get(e.target); kills.push({ t: +t.toFixed(1), d: tr ? Math.round(tr.dist) : -1, vLaser: tr ? !!tr.hasLaser : null, vLight: tr ? !!tr.hasLightning : null }) }
      if (laserT < 0 && me.laser) laserT = +t.toFixed(1)
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  console.log(JSON.stringify({ seed, score: r.score, alive: +r.timeAlive.toFixed(1), laserT, lasersSeenWithoutOne: laserSeenN.size, firstLaserSeen, nearestLaserSeen, fightWithLaserUnder120mS: +inContactWithLaserNear.toFixed(1), lootGoalPickupS: +lootLaser.toFixed(1), grabPickupS: +grabLaser.toFixed(1), kills }))
}
