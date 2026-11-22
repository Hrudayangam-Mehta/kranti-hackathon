import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { HouseBot, FFA_TYPES } from '../mechbot/sim/house.js'
const N = parseInt(process.argv[2] || '4', 10), old = process.argv[3] !== 'new', seed0 = parseInt(process.argv[4] || '1', 10)
const ctx = makeContext({ oldBalance: old, params: process.env.PARAMS || null })
const agg = { first: [], last: [], bands: [[0, 0], [0, 0], [0, 0], [0, 0]], wall: [], weapons: {}, crates: [], npcs: [], zoneDeaths: 0, alive200: [], takes: 0, lasers: 0, mortars: 0, dmgBy: {}, t5: [], t10: [] }
for (let k = 0; k < N; k++) {
  const bots = FFA_TYPES.map((t) => new HouseBot(t, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }))
  const m = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: seed0 + k, config: ctx.cfg, bots, mode: 'ffa' })
  const t0 = performance.now()
  const r = m.runSync()
  agg.wall.push(performance.now() - t0)
  const s = r.stats
  agg.first.push(s.firstDeathT); agg.last.push(r.t)
  s.gunBands.forEach((b, i) => { agg.bands[i][0] += b.hit; agg.bands[i][1] += b.n })
  for (const d of s.deaths) { agg.weapons[d.weapon] = (agg.weapons[d.weapon] || 0) + 1 }
  agg.crates.push(s.cratesDestroyed); agg.npcs.push(s.npcsKilled)
  agg.t5.push(s.deaths[4]?.t ?? null); agg.t10.push(s.deaths[9]?.t ?? null)
  agg.takes += m.log.filter((e) => e.e === 'take').length; agg.lasers += m.log.filter((e) => e.e === 'laser').length; agg.mortars += m.log.filter((e) => e.e === 'mortar').length
  for (const q of r.mechs) for (const w in q.dmgBy) agg.dmgBy[w] = (agg.dmgBy[w] || 0) + q.dmgBy[w]
  agg.aliveS = (agg.aliveS || 0) + r.mechs.reduce((q, x) => q + x.timeAlive, 0)
  agg.shots = (agg.shots || 0) + r.mechs.reduce((q, x) => q + x.shotsFired, 0)
  agg.taken = (agg.taken || 0) + r.mechs.reduce((q, x) => q + x.dmgTaken, 0)
  const errs = m.log.filter((e) => e.e === 'bot_error')
  if (errs.length) console.log('BOT ERROR', errs[0].msg)
  if (process.argv[5]) console.log(k, 'first', s.firstDeathT, 'end', r.t, 'deaths', s.deaths.map((d) => `${d.t.toFixed(0)}:${r.mechs[d.id].name.slice(6)}<${d.by >= 0 && d.by < 16 ? r.mechs[d.by].name.slice(6) : d.by}/${d.weapon}`).join(' '), 'win', r.mechs.find((q) => q.place === 1)?.name)
}
const med = (a) => { const b = a.filter((v) => v !== null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null }
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
console.log(`matches ${N} ${old ? 'OLD' : 'NEW'} balance: first death median ${med(agg.first)} mean ${mean(agg.first).toFixed(1)} | 5th ${med(agg.t5)} 10th ${med(agg.t10)} | end median ${med(agg.last)} mean ${mean(agg.last).toFixed(1)} | wall mean ${(mean(agg.wall) / 1000).toFixed(2)}s`)
console.log('gun bands 0-40/40-80/80-130/130+:', agg.bands.map((b) => `${b[0]}/${b[1]}=${(100 * b[0] / (b[1] || 1)).toFixed(0)}%`).join('  '), '(replay 98 / 78 / 29 / 18)')
console.log('killing weapons', JSON.stringify(agg.weapons), 'crates/match', mean(agg.crates).toFixed(1), 'npcs/match', mean(agg.npcs).toFixed(1), 'takes/match', (agg.takes / N).toFixed(1), 'lasers', (agg.lasers / N).toFixed(1), 'mortars', (agg.mortars / N).toFixed(1))
console.log('alive mech-s/match', (agg.aliveS / N).toFixed(0), '(replay 1976) shots/alive-s', (agg.shots / agg.aliveS).toFixed(2), '(replay 0.54) dmg taken/match', (agg.taken / N).toFixed(0), '(replay ~39000)')
const tot = Object.values(agg.dmgBy).reduce((s, v) => s + v, 0)
console.log('damage share', Object.entries(agg.dmgBy).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(' '), 'total/match', (tot / N).toFixed(0))
