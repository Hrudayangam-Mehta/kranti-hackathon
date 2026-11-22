// probe: how often the e5 pre-conditions hold in sim matches (CH1 behaviour, no preset): decisions with a listed mech target
// without a line, laser ready and in range; closing speed histogram; predicted-line clear fraction
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const R = S + '/r7work', W = S + '/fable_work/chaos'
const lib = S + '/fable_work/w2/A/tree/lib'
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(R + '/ref_bot/lib/nav.js')
const FNV = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on', aggr: 'any70f', loseCover: 'never', fb: 'on' }
const CH1 = { focus: 'kill', laserGrab: 'spawn', cubes: 'snow', laserRange: 'midsq', boostCharge: 'on', farmHp: '50sq', cratePath: '80', upg: 'laser', upgFix: 'on' }
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const ctx = makeContext({ quiet: true })
const H = { n: 0, laserDec: 0, tgtListedNoLos: 0, ready: 0, close: [0, 0, 0, 0, 0], clear: 0, all: 0 }
for (const seed of process.argv.slice(2).map(Number)) {
  let brain = null
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, { select: { ...FNV, ...CH1 }, salt: 1, fuseMs: 1e9 }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick
      const B = brain._B, me = B.me, tg = B.target, lz = me.laser
      H.n++
      if (lz) H.laserDec++
      if (lz && tg && !tg.npc && tg.listed && !tg.losOut) {
        H.tgtListedNoLos++
        if (lz.cooldown <= 0.11 && lz.charge === 0 && tg.dist <= 260) {
          H.ready++
          const dx = me.x - tg.x, dy = me.y - tg.y, d = Math.hypot(dx, dy), c = (dx * (tg.vx - me.vx) + dy * (tg.vy - me.vy)) / d
          H.close[c < 0 ? 0 : c < 4 ? 1 : c < 6 ? 2 : c < 8 ? 3 : 4]++
          const w = B.world, mz = me.z + me.muzzleH
          if ([0.5, 1, 1.5].some((T) => w.shotClear(me.x, me.y, mz, tg.x + tg.vx * T, tg.y + tg.vy * T, tg.z + tg.height * 0.5))) { H.clear++; if (c >= 8) H.all++ }
        }
      }
      return a } })
  await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
}
console.log(JSON.stringify(H))
