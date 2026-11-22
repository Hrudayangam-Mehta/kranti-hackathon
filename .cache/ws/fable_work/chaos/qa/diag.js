// QA diagnostic of the opening laser run: diag.js <lib> <seed>
const lib = process.argv[2], seed = +process.argv[3]
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos'
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ctx = makeContext({ quiet: true })
let brain = null, stopT = -1, firstLaserSeenT = -1, firstHurtT = -1, laserT = -1, pc = 0, wb = []
const modes = {}, legs = {}, loots = {}, row = []
let minLaserD = 1e9, lasersObs = 0, obsLaserMax = 0, wbLeg = {}
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const B = brain._B
    const a = brain.act(obs, performance.now() + 27.5); const me = B.me, t = me.t, c = B.counters
    if (stopT < 0 && (c.lgsStopDmg || 0) > 0) stopT = t
    if (firstHurtT < 0 && me.lastHurtT > 0) firstHurtT = t
    if (laserT < 0 && me.laser) laserT = t
    const nl = [...B.pickups.values()].filter((p) => p.kind === 'laser')
    const ol = (obs.pickups || []).filter((p) => p.kind === 'laser').length; if (ol > obsLaserMax) obsLaserMax = ol
    if (nl.length && firstLaserSeenT < 0) firstLaserSeenT = t
    if (t < 25) {
      for (const p of nl) { const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < minLaserD) minLaserD = d }
      if (B.lgsOn) { modes[B.mode] = (modes[B.mode] || 0) + 1; legs[B.legKind] = (legs[B.legKind] || 0) + 1; const k = B.loot ? B.loot.type + (B.loot.obj && B.loot.obj.kind ? ':' + B.loot.obj.kind : '') : 'none'; loots[k] = (loots[k] || 0) + 1; if (nl.length) pc++ }
    }
    if (B.fkWalk && a.boost) { const k = B.mode + '/' + B.legKind; wbLeg[k] = (wbLeg[k] || 0) + 1 }
    a.tick = obs.tick; return a } })
const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
console.log(JSON.stringify({ seed, kills: r.kills, laserT: +laserT.toFixed(1), stopT: +stopT.toFixed(1), firstHurtT: +firstHurtT.toFixed(1), firstLaserSeenT: +firstLaserSeenT.toFixed(1), minLaserD: Math.round(minLaserD), obsLaserMax, lgsOnWithLaserKnown: pc, modes, legs, loots, walkBoost: wbLeg }))
