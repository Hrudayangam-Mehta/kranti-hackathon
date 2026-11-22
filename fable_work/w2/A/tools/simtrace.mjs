// simtrace.mjs <libDir> <seed> '<extra select json>' [from] [to]: closed-loop sim match (FNV + CH1 SELECT, salt 1), one line per decision
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const R = S + '/r7work', W = S + '/fable_work/chaos'
const [lib, seedS, selJ, from, to] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(R + '/ref_bot/lib/nav.js')
const FNV = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on', aggr: 'any70f', loseCover: 'never', fb: 'on' }
const CH1 = { focus: 'kill', laserGrab: 'spawn', cubes: 'snow', laserRange: 'midsq', boostCharge: 'on', farmHp: '50sq', cratePath: '80', upg: 'laser', upgFix: 'on' }
const OV = { select: { ...FNV, ...CH1, ...JSON.parse(selJ || '{}') }, salt: 1, fuseMs: 1e9 }
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const ctx = makeContext({ quiet: true })
let brain = null, i = 0
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick; i++
    const B = brain._B, tg = B.target
    if (i >= +(from || 0) && i <= +(to || 1e9)) console.log(`${i} t${B.me.t.toFixed(1)} ${B.mode}/${B.legKind} tgt${tg ? tg.id + '@' + tg.dist.toFixed(0) + ':' + Math.round(tg.hp) + (tg.losOut ? 'L' : '') + (tg.hostile ? 'H' : '') : '-'} hp${Math.round(B.me.hp)} c${B.me.cubes} k${B.counters.kills} nLos${B.nLos} lz${B.me.laser ? 1 : 0} ofG${B.ofGate ? 1 : 0} b${a.boost ? 1 : 0} f${a.fire.map((v) => v ? 1 : 0).join('')}`)
    return a } })
const r = await playMatch(+seedS, { mode: 'squad' }, ctx, { team, opponents: [] })
console.error(JSON.stringify({ kills: r.kills, alive: r.timeAlive, cause: r.cause }))
