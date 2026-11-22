// QA probe: probe.js <libDir> <seed> : one squad sim match; prints behaviour evidence as one JSON line. OVR env as recs.js.
const lib = process.argv[2], seed = +process.argv[3]
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos'
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ref_bot/lib/nav.js')
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const ctx = makeContext({ quiet: true })
let brain = null, n = 0, fwN = 0, fwEndT = -1, laserT = -1, lightT = -1, mortarT = -1, maxMs = 0
let prevShots = 0, prevKills = 0, prevCubes = 0, prevCharge = 0, prevTgt = null
const rel = [], kills = [], cubeGains = [], walk = []
let corpseRushN = 0, ep = null, sweepYaw = 0, prevYaw = null, lgsOnLastT = -1, lgsBoostN = 0
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const B = brain._B
    const chargeBefore = B.me && B.me.laser ? B.me.laser.charge : 0
    const t0 = performance.now(); const a = brain.act(obs, t0 + 27.5); const ms = performance.now() - t0; if (ms > maxMs) maxMs = ms
    const me = B.me, t = me.t, c = B.counters; n++
    const fw = !!(B.hunt && B.hunt.firewall()); if (fw) { fwN++; fwEndT = t }
    if (laserT < 0 && me.laser) laserT = t; if (lightT < 0 && me.lightning) lightT = t; if (mortarT < 0 && me.mortar) mortarT = t
    if (t <= 3 && prevYaw !== null) sweepYaw += Math.abs(Math.atan2(Math.sin(me.yaw - prevYaw), Math.cos(me.yaw - prevYaw))); prevYaw = me.yaw
    if (B.lgsOn) lgsOnLastT = t
    if ((c.laserShots || 0) > prevShots) { const lz = me.laser; const tg = B.target || prevTgt
      rel.push({ t: +t.toFixed(1), frac: lz ? +(lz.charge / lz.full).toFixed(2) : -1, fw, hpf: tg ? +(tg.hp / tg.maxHp).toFixed(2) : -1, hp: tg ? Math.round(tg.hp) : -1, npc: tg ? !!tg.npc : null }) }
    prevShots = c.laserShots || 0
    if ((c.kills || 0) > prevKills) kills.push({ t: +t.toFixed(1), x: B.lastKillX, y: B.lastKillY, fw, walk: ep && t - ep.t1 <= 2 ? 1 : 0 })
    prevKills = c.kills || 0
    if (me.cubes > prevCubes) { const k = kills[kills.length - 1]; cubeGains.push({ t: +t.toFixed(1), n: me.cubes - prevCubes, sinceKill: k ? +(t - k.t).toFixed(1) : -1, dCorpse: k ? Math.round(Math.hypot(me.x - k.x, me.y - k.y)) : -1, fw }) }
    prevCubes = me.cubes
    const g = B.grab
    if (g && g.rush && t - B.lastKillT <= 8 && Math.hypot(g.x - B.lastKillX, g.y - B.lastKillY) <= 25) corpseRushN++
    if (B.fkWalk && B.target) { const tg = B.target
      if (!ep || ep.id !== tg.id || t - ep.t1 > 0.5) { ep = { id: tg.id, t0: +t.toFixed(1), t1: t, d0: Math.round(tg.dist), dMin: tg.dist, n: 0, boost: 0, killed: false, hpf0: +(tg.hp / tg.maxHp).toFixed(2) }; walk.push(ep) }
      ep.t1 = t; ep.n++; if (tg.dist < ep.dMin) ep.dMin = tg.dist; if (a.boost) ep.boost++ }
    prevTgt = B.target
    a.tick = obs.tick; return a } })
const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
for (const e of walk) { e.killed = kills.some((k) => k.t >= e.t0 && k.t <= e.t1 + 2); e.t1 = +e.t1.toFixed(1); e.dMin = Math.round(e.dMin) }
const c = brain._B.counters
console.log(JSON.stringify({ seed, kills: r.kills, alive: +r.timeAlive.toFixed(1), cause: r.cause, errors: c.errors || 0, fuse: c.fuse || 0, maxMs: +maxMs.toFixed(1), n, fwN, fwEndT: +fwEndT.toFixed(1),
  laserT: +laserT.toFixed(1), lightT: +lightT.toFixed(1), mortarT: +mortarT.toFixed(1), sweepYaw: +sweepYaw.toFixed(2), lgsOnLastT: +lgsOnLastT.toFixed(1),
  cnt: { lgsSweep: c.lgsSweep || 0, lgsOn: c.lgsOn || 0, lgsBoost: c.lgsBoost || 0, lgsStopDmg: c.lgsStopDmg || 0, fkWalk: c.fkWalk || 0, fkBlink: c.fkBlink || 0, boostCharge: c.boostCharge || 0, boostSpend: c.boostSpend || 0, laserShots: c.laserShots || 0, laserHits: c.laserHits || 0 },
  rel, killsL: kills, cubeGains, corpseRushN, walk }))
