// Red-team tool: start our brain inside ground pockets (real spawn of the replay's brawler in the stadium, plus the
// centre of other pockets) with a next circle that excludes the pocket. Does it get out before the zone kills it?
//   bun tools/redteam/pocket_test.js
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Arena } from '../arena_micro.js'
import { World } from './snap/bot/lib/world.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const ROOT = new URL('./snap/', import.meta.url).pathname
const lines = gunzipSync(readFileSync(ROOT + 'kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(ROOT + 'kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const starts = [{ name: 'replay spawn of brawler 2 (stadium)', x: -307.02, y: 106.14 }, { name: 'stadium bowl centre', x: -225, y: 65 }, { name: 'pocket 44', x: -185, y: 137 }, { name: 'pocket 64', x: 203, y: 211 }, { name: 'pocket 54', x: -32, y: 61 }]
for (const s of starts) {
  const q = nav.nearestPassable(s.x, s.y, 20)
  if (!q) { console.log(s.name, 'no standable cell'); continue }
  const comp0 = nav.component(q.x, q.y)
  // next circle on the far side of the map from the pocket, so the pocket is outside it
  const dx = 41.3 - q.x, dy = -72.8 - q.y, d = Math.hypot(dx, dy) || 1
  const nc = [41.3 + dx / d * 170, -72.8 + dy / d * 170]
  const zone = { center: [41.3, -72.8], radius: 560, next_center: nc, next_radius: 380, shrink_start: 60, shrink_end: 110, dps: 20 }
  const ar = new Arena({ cfg, world, nav, seed: 5, me: { x: q.x, y: q.y, yaw: 0 }, zone })
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  let leftT = -1, jumps = 0, airT = 0
  const legs = {}
  for (let k = 0; k < 1800 && ar.me.hp > 0; k++) {
    const obs = ar.obs()
    const a = brain.act(obs, performance.now() + 1e6)
    if (a.jump) jumps++
    if (!obs.self.grounded) airT += 0.1
    const B = brain._B
    legs[B.mode + '/' + B.legKind] = (legs[B.mode + '/' + B.legKind] || 0) + 0.1
    if (leftT < 0 && obs.self.grounded && nav.component(ar.me.x, ar.me.y) === nav.mainComponent && nav.passableAt(ar.me.x, ar.me.y)) leftT = ar.t
    ar.step(a)
  }
  const dNext = Math.hypot(ar.me.x - nc[0], ar.me.y - nc[1])
  const c = brain._B.counters
  console.log(`${s.name}: start comp ${comp0}${comp0 === nav.mainComponent ? ' (main)' : ' (pocket ' + nav.compSizes[comp0] * 4 + ' m2)'} start ${Math.hypot(q.x - nc[0], q.y - nc[1]).toFixed(0)} m from the next centre (radius 380) | after ${ar.t.toFixed(0)} s: hp ${Math.max(0, ar.me.hp).toFixed(0)}, ${dNext.toFixed(0)} m from next centre, reached main ground at ${leftT < 0 ? 'NEVER' : leftT.toFixed(0) + ' s'}, ticks outside zone ${ar.stats.outsideTicks}, jumps ${jumps}, air ${airT.toFixed(0)} s, stuck ${c.stuck}, abandons ${c.abandons}, plans ${c.plans} | legs ${JSON.stringify(Object.fromEntries(Object.entries(legs).map(([k, v]) => [k, Math.round(v)])))}`)
}
