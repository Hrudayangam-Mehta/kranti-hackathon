// Every laser release of our mech in dev-simulator matches: charge at release, why (brain state), what it hit.
import { join } from 'node:path'
import { P } from './common.js'
const { makeContext, playMatch } = await import(join(P, 'sim', 'run.js'))
const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
const brainMod = await import(join(P, 'bot', 'lib', 'brain.js'))
const ctx = makeContext({ quiet: true })
let nav = null
const rel = []
for (const seed of (process.argv[2] || '5,7,9,11,13,14').split(',').map(Number)) {
  let brain = null, prev = null, prevAct = null, pend = null
  const f = { team: () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = brainMod.createBrain(h, { world: ctx.world, nav, log: () => {} }); return { type: 'ready', name: 'ours' } },
    act(obs) {
      if (pend) { pend.hit = obs.events.filter((e) => e.type === 'hit' && e.weapon === 'laser').map((e) => e.amount).join('+') || (pend.age++ < 1 ? null : 'miss'); if (pend.hit !== null) { rel.push(pend); pend = null } }
      const a = brain.act(obs, performance.now() + 27.5); a.tick = obs.tick
      const B = brain._B, me = obs.self
      for (let s = 0; s < 2; s++) {
        const w = me.weapons[s]
        if (w && w.kind === 'laser' && prevAct && prevAct.fire[s] && !a.fire[s] && w.charge > 0) {
          const tg = B.target
          pend = { seed, t: obs.t, charge: w.charge, full: w.stats.charge, mode: B.mode + '/' + B.legKind, aimKind: B.aimKind, tgt: tg ? `id ${tg.id} hp ${Math.round(tg.hp)} d ${Math.round(tg.dist)} listed ${tg.listed} los ${tg.losOut}` : 'none', hold: B.holdFire, noCharge: B.noCharge, age: 0, hit: null }
        }
      }
      prev = obs; prevAct = a
      return a
    } }), opponents: [] }
  await playMatch(seed, { mode: 'ffa' }, ctx, f)
  if (pend) { pend.hit = 'match ended'; rel.push(pend) }
}
let full = 0, early = 0, hits = 0
for (const r of rel) { const isFull = r.charge >= 0.97 * r.full - 1e-9; if (isFull) full++; else early++; if (r.hit && r.hit !== 'miss' && r.hit !== 'match ended') hits++; if (!isFull || r.hit === 'miss') console.log(`seed ${r.seed} t=${r.t} charge ${r.charge}/${r.full} ${isFull ? 'FULL ' : 'EARLY'} ${r.mode} aim=${r.aimKind} target: ${r.tgt} hold=${r.hold} noCharge=${r.noCharge} -> ${r.hit}`) }
console.log(`releases ${rel.length}: full ${full}, early ${early}; with a laser hit event next decision(s): ${hits}`)
