#!/usr/bin/env bun
// DEV ONLY (red team): spawn OUR bot inside walkable regions that are cut off from the main one (stadium bowl,
// courtyards) and watch whether it gets out before the zone closes over it. Opponents: simulator house bots
// (free-for-all types), in-process. The simulator itself never spawns there; the real server's rule is unknown.
//   bun tools/redteam/enclosed_test.js [--overrides '{"env":"ffa"}'] [--seconds 200]
import { makeContext, resolveBot } from '../../sim/run.js'
import { Match } from '../../sim/sim.js'
import { FFA_TYPES, HouseBot } from '../../sim/house.js'
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const overrides = JSON.parse(arg('--overrides', '{}'))
const seconds = parseFloat(arg('--seconds', '200'))
const ctx = makeContext({ quiet: true, overridesObject: overrides })
const nav = ctx.nav
nav.setBody(2.5, 9)
const b = ctx.world.bounds, comps = new Map()
for (let x = b.minX; x <= b.maxX; x += 4) for (let y = b.minY; y <= b.maxY; y += 4) {
  if (!nav.passableAt(x, y)) continue
  const c = nav.component(x, y)
  let e = comps.get(c); if (!e) { e = { c, n: 0, sx: 0, sy: 0, minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, pts: [] }; comps.set(c, e) }
  e.n++; e.sx += x; e.sy += y; e.minX = Math.min(e.minX, x); e.maxX = Math.max(e.maxX, x); e.minY = Math.min(e.minY, y); e.maxY = Math.max(e.maxY, y); if (e.pts.length < 400) e.pts.push([x, y])
}
const list = [...comps.values()].sort((a, c) => c.n - a.n)
const main = list[0].c
const zc = ctx.cfg.zone.start_center
const team = await resolveBot('ours', ctx)
let k = 0
for (const e of list.slice(1, 7)) {
  // the cell of the region nearest to its centroid, on the ground (not a roof: level within 3 m of terrain)
  const cx = e.sx / e.n, cy = e.sy / e.n
  let best = null, bd = Infinity
  for (const p of e.pts) { const d = Math.hypot(p[0] - cx, p[1] - cy); const onGround = Math.abs(nav.levelAt(p[0], p[1]) - ctx.world.ground(p[0], p[1])) < 3; if (onGround && d < bd) { bd = d; best = p } }
  const roof = !best
  if (!best) best = e.pts[e.pts.length >> 1]
  const seed = 500 + k++
  const bots = Array.from({ length: 16 }, (_, i) => i === 0 ? team({ seed, slot: 0, tag: 'team' }) : new HouseBot(FFA_TYPES[(i + seed) % FFA_TYPES.length], { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: 'ffa', mapDir: ctx.mapDir, focus: 0, maxDecisions: seconds * 10 })
  const me = m.mechs[0]
  me.x = best[0]; me.y = best[1]; me.z = nav.levelAt(best[0], best[1])
  let outT = null, zoneT0 = null
  const orig = bots[0].act.bind(bots[0])
  bots[0].act = (obs) => {
    const p = obs.self.pos
    if (outT === null && nav.passableAt(p[0], p[1]) && nav.component(p[0], p[1]) === main) outT = obs.t
    if (zoneT0 === null && !obs.self.in_zone) zoneT0 = obs.t
    return orig(obs)
  }
  const res = await m.run()
  const r = res.mechs[0]
  console.log(`region ${e.c}: ${e.n * 16} m2, x ${e.minX}..${e.maxX}, y ${e.minY}..${e.maxY}${roof ? ' (roof level)' : ''}, ${Math.round(Math.hypot(cx - zc[0], cy - zc[1]))} m from the first centre | start (${best[0]}, ${best[1]}) | left the region at ${outT === null ? 'NEVER' : outT.toFixed(1) + ' s'} | first outside the zone at ${zoneT0 === null ? '-' : zoneT0.toFixed(1) + ' s'} | ${r.alive ? 'alive at ' + res.t.toFixed(0) + ' s, hp ' + r.hp : 'died at ' + r.timeAlive.toFixed(1) + ' s by ' + r.cause} | place ${r.place}`)
}
process.exit(0)
