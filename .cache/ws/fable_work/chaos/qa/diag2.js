const lib = process.argv[2], seed = +process.argv[3], T1 = +(process.argv[4] || 12)
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos'
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ctx = makeContext({ quiet: true })
let brain = null, nav = null, last = ''
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const B = brain._B
    const a = brain.act(obs, performance.now() + 27.5); const me = B.me, t = me.t
    if (t < T1) {
      const nl = [...B.pickups.values()].filter((p) => p.kind === 'laser').map((p) => Math.round(Math.hypot(p.x - me.x, p.y - me.y)) + 'm' + (B.badPickups.has(p.id) ? 'BAD' : ''))
      const near = B.trackList.filter((tr) => !tr.npc).map((tr) => Math.round(tr.dist)).sort((x, y) => x - y).slice(0, 3)
      const s = `${B.mode}/${B.legKind} lgs${B.lgsOn ? 1 : 0}${B.lgsSweep ? 'S' : ''} loot ${B.loot ? B.loot.type : '-'} grab ${B.grab ? B.grab.type : '-'} lasers [${nl}] mechs [${near}] A ${Math.round(B.A)} nLos ${B.nLos} saw ${B.everSawMech ? 1 : 0} quietFor ${(t - B.lastContactT).toFixed(0)} zoneR ${Math.round(B.zone.r)} inZone ${me.inZone ? 1 : 0} boost ${a.boost ? 1 : 0}`
      if (s !== last) { console.log(t.toFixed(1), 'hp', Math.round(me.hpf * 100), s); last = s }
    }
    a.tick = obs.tick; return a } })
await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
