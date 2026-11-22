// Closed-loop sanity of the trigger semantics in the dev simulator: laser charge/release, lightning, reload,
// take/drop, pick. Prints the brain's counters plus what the simulator recorded for our mech.
import { join } from 'node:path'
import { P } from './common.js'
const { makeContext, playMatch } = await import(join(P, 'sim', 'run.js'))
const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
const brainMod = await import(join(P, 'bot', 'lib', 'brain.js'))
const ctx = makeContext({ quiet: true })
let nav = null
const seeds = (process.argv[2] || '1,2,3,4').split(',').map(Number)
const tot = { laserStart: 0, laserFullRel: 0, laserEarlyRel: 0, laserAuto: 0, laserHit: 0, took: 0, takeSent: 0, takeFailed: {}, picks: 0, offers: 0, reloadSent: 0, lightFire: 0, lightHit: 0, mortarFire: 0, jump: 0, errors: 0 }
for (const seed of seeds) {
  let brain = null, prev = null, prevAct = null
  const f = { team: () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = brainMod.createBrain(h, { world: ctx.world, nav, log: () => {} }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick
      const me = obs.self
      for (let s = 0; s < 2; s++) {
        const w = me.weapons[s], pw = prev && prev.self.weapons[s]
        if (w && w.kind === 'laser' && pw && pw.kind === 'laser') {
          if (pw.charge === 0 && w.charge > 0) tot.laserStart++
          if (pw.charge > 0 && w.charge === 0) { const full = pw.charge >= 0.97 * (w.stats.charge || 0.75) - 0.11; if (prevAct && prevAct.fire[s]) tot.laserAuto++; else if (full) tot.laserFullRel++; else tot.laserEarlyRel++ }
        }
        if (w && w.kind === 'lightning' && a.fire[s]) tot.lightFire++
        if (w && w.kind === 'mortar' && a.fire[s]) tot.mortarFire++
      }
      for (const e of obs.events) { if (e.type === 'hit' && e.weapon === 'laser') tot.laserHit++; if (e.type === 'hit' && e.weapon === 'lightning') tot.lightHit++; if (e.type === 'took') tot.took++; if (e.type === 'take_failed') tot.takeFailed[e.reason] = (tot.takeFailed[e.reason] || 0) + 1 }
      if ('take' in a) tot.takeSent++
      if (obs.offer) tot.offers++
      if ('pick' in a) tot.picks++
      if (a.reload) tot.reloadSent++
      if (a.jump) tot.jump++
      prev = obs; prevAct = a
      return a
    } }), opponents: [] }
  const rec = await playMatch(seed, { mode: 'ffa' }, ctx, f)
  tot.errors += brain._B.counters.errors
  console.log(`seed ${seed}: place ${rec.place} alive ${rec.timeAlive}s loadout ${JSON.stringify(rec.loadout)} cubes ${rec.cubes} upgrades ${JSON.stringify(rec.upgrades)}`)
}
console.log(JSON.stringify(tot, null, 1))
