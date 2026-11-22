// Spawn inside the stadium bowl (a separate walking component in nav.js; the official replay has a mech
// spawning there) and see whether the brain ever gets out when the zone moves away. Uses the team's dev
// simulator; our mech is moved into the bowl before the first tick. Also reports where the replay's 16
// spawns fall in the nav components.
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { P, LIB } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/review_safety/common.js'
const { makeContext } = await import(join(P, 'sim', 'run.js'))
const { Match } = await import(join(P, 'sim', 'sim.js'))
const { HouseBot, FFA_TYPES } = await import(join(P, 'sim', 'house.js'))
const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
const brainMod = await import(join(LIB, 'brain.js'))
console.log('brain from', LIB)
const ctx = makeContext({ quiet: true })
const nav0 = ctx.nav

// --- replay spawns vs components
const first = JSON.parse(gunzipSync(readFileSync(join(P, 'replay', 'mech16.jsonl.gz'))).toString('utf8').split('\n')[1])
const comps = first.m.map((m) => nav0.component(m[1], m[2]))
console.log('official replay spawn components (0 = main):', comps.join(' '), '-> mechs outside the main component:', first.m.filter((m, i) => comps[i] !== nav0.mainComponent).map((m) => `id ${m[0]} at (${m[1]}, ${m[2]}, z ${m[3]}) comp ${nav0.component(m[1], m[2])} size ${nav0.compSizes[nav0.component(m[1], m[2])]}`).join('; ') || 'none')

const bowl = []
for (let c = 0; c < nav0.n; c++) if (nav0.comp[c] === 16 && nav0.wallDist[c] > 8) bowl.push(c)
let nav = null
for (const seed of (process.argv[2] || '1,2,3,4,5,6').split(',').map(Number)) {
  const n = ctx.cfg.match.mechs, slot = 0
  let brain = null
  const stat = { n: 0, leftAt: -1, zoneDmg: 0, firstOut: -1, maxH: 0, boostAir: 0, legs: {}, errors: 0 }
  const ours = {
    name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = brainMod.createBrain(h, { world: ctx.world, nav, log: () => {} }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick
      const me = obs.self, B = brain._B
      stat.n++
      const comp = nav0.component(me.pos[0], me.pos[1])
      if (stat.leftAt < 0 && comp === nav0.mainComponent && me.grounded) stat.leftAt = obs.t
      if (!me.in_zone && stat.firstOut < 0) stat.firstOut = obs.t
      for (const e of obs.events) if (e.type === 'damaged' && e.weapon === 'zone') stat.zoneDmg += e.amount
      const h = me.pos[2] - nav0.levelAt(me.pos[0], me.pos[1]); if (h > stat.maxH) stat.maxH = h
      if (!me.in_zone) stat.legs[B.mode + '/' + B.legKind] = (stat.legs[B.mode + '/' + B.legKind] || 0) + 1
      stat.errors = B.counters.errors; if (process.env.DBG && obs.tick % 10 === 0 && B.legKind === "hop") { const h = B.mover_hop; console.log(obs.t.toFixed(1), B.mode, B.legKind, "pos", me.pos.map(v=>v.toFixed(1)).join(","), "gr", me.grounded, "en", me.energy.toFixed(0), "act", JSON.stringify(a.move), a.boost, a.jump||false, "comp", nav0.component(me.pos[0], me.pos[1])) }
      return a
    },
  }
  const bots = [ours]
  for (let i = 1; i < n; i++) bots.push(new HouseBot(FFA_TYPES[(i + seed) % FFA_TYPES.length], { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const match = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: 'ffa', mapDir: ctx.mapDir, focus: slot })
  const c = bowl[(seed * 7919) % bowl.length]
  const me = match.mechs[slot]
  me.x = nav0.cellX(c); me.y = nav0.cellY(c); me.z = nav0.level[c]
  const zph = match.phases.map((p) => Math.hypot(p.to.x - me.x, p.to.y - me.y) < p.to.r ? 'in' : 'OUT').join(',')
  const res = match.runSync()
  const r = res.mechs[slot]
  console.log(`seed ${seed}: start bowl (${me.x.toFixed(0)},${nav0.cellY(c).toFixed(0)}); bowl cell vs the 6 circles: ${zph}; place ${r.place} alive ${r.timeAlive.toFixed(1)}s cause ${r.cause}; first outside zone t=${stat.firstOut}; walked out of the bowl: ${stat.leftAt < 0 ? 'NEVER' : 't=' + stat.leftAt}; zone damage ${stat.zoneDmg.toFixed(0)}; peak height above ground ${stat.maxH.toFixed(1)} m; legs while outside ${JSON.stringify(stat.legs)}; stage errors ${stat.errors}`)
}
