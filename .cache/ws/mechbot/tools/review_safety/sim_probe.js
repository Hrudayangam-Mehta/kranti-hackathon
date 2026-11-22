// Closed-loop probe: our brain plays full matches in the team's dev simulator (sim/), instrumented for
// act() time, internal stage errors, NaN in the raw action and protocol-level oddities in the action.
//   bun sim_probe.js --mode ffa|squad --seeds 1,2,3 [--record out.jsonl] [--full]
import { writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { P, rawProblems, pct } from './common.js'
const { makeContext, playMatch } = await import(join(P, 'sim', 'run.js'))
const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
const brainMod = await import(join(P, 'bot', 'lib', 'brain.js'))

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const mode = arg('--mode', 'ffa')
const seeds = arg('--seeds', '1,2,3').split(',').map(Number)
const record = arg('--record', null)
const full = args.includes('--full')
const ctx = makeContext({ quiet: true })
let nav = null
const all = { times: [], errors: {}, raw: {}, odd: {}, logs: [] }

function teamFactory(info) {
  let brain = null, hello = null
  const bot = {
    name: 'ours', errors: 0, maxMs: 0, sumMs: 0, n: 0, lates: 0,
    hello(h) {
      hello = h
      const mc = h.config.mech
      if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up ?? 1.2, maxSlopeDeg: mc.max_slope_deg ?? 50 })
      nav.setBody(mc.radius, mc.height)
      brain = brainMod.createBrain(h, { world: ctx.world, nav, log: (...a) => all.logs.push(`[seed ${info.seed}] ` + a.join(' ')) })
      bot.brain = brain
      if (record) writeFileSync(record, JSON.stringify(h) + '\n')
      return { type: 'ready', name: 'ours' }
    },
    act(obs) {
      if (record) appendFileSync(record, JSON.stringify(obs) + '\n')
      const t0 = performance.now()
      let a = null
      try { a = brain.act(obs, t0 + 27.5) } catch (e) { bot.errors++; all.errors.THROW = (all.errors.THROW || 0) + 1; all.logs.push('THROW ' + (e && e.stack || e)) }
      const ms = performance.now() - t0
      all.times.push(ms); bot.n++; bot.sumMs += ms; if (ms > bot.maxMs) { bot.maxMs = ms; bot.maxTick = obs.tick; bot.maxState = `${brain._B.mode}/${brain._B.legKind} mechs=${obs.mechs.length}` }
      if (ms > 50) bot.lates++
      for (const p of rawProblems(a)) { const k = p.replace(/=.*/, ''); all.raw[k] = (all.raw[k] || 0) + 1 }
      if (a) {
        // protocol-level oddities
        const me = obs.self, odd = (k) => { all.odd[k] = (all.odd[k] || 0) + 1; if (all.odd[k] <= 2) all.logs.push(`ODD ${k} seed ${info.seed} tick ${obs.tick} mode ${brain._B.mode}/${brain._B.legKind} act ${JSON.stringify(a)} weapons ${JSON.stringify(me.weapons.map((w) => w && { k: w.kind, cd: w.cooldown, ammo: w.ammo, reload: w.reload, charge: w.charge }))}`) }
        for (let s = 0; s < 2; s++) if (a.fire[s] && !me.weapons[s]) odd('fire on an empty slot')
        if (a.boost && !me.grounded) odd('boost while airborne (= jet)')
        if (a.boost && me.energy <= 0) odd('boost with no energy')
        if (a.jump && !me.grounded) odd('jump while airborne')
        if (a.reload && !me.weapons.some((w) => w && w.kind === 'gun')) odd('reload without a gun')
        if (a.reload && me.weapons.some((w) => w && w.kind === 'gun' && w.reload > 0)) odd('reload while already reloading')
        if ('pick' in a && !obs.offer) odd('pick without an offer')
        if ('pick' in a && obs.offer && a.pick >= obs.offer.choices.length) odd('pick index out of range')
        if (obs.offer && !('pick' in a)) odd('offer not answered')
        if ('take' in a && !obs.pickups.some((p) => p.id === a.take)) odd('take of a pickup that is not listed this tick')
        if ('take' in a) { const p = obs.pickups.find((p) => p.id === a.take); if (p && (Math.hypot(p.pos[0] - me.pos[0], p.pos[1] - me.pos[1]) > 4 || Math.abs(p.pos[2] - me.pos[2]) > 4)) odd('take out of range') }
        if ('drop' in a && !('take' in a)) odd('drop without take')
        if ('drop' in a && !me.weapons[a.drop]) odd('drop of an empty slot')
        if (Math.abs(a.aim[1]) > 1.31 || a.aim[1] < -0.71) odd('pitch outside [min_pitch,max_pitch]')
        if (Math.hypot(a.move[0], a.move[1]) > 1.0001) odd('move longer than 1')
        a.tick = obs.tick
      } else a = { tick: obs.tick, move: [0, 0] }
      return a
    },
  }
  return bot
}

console.log('seed mode place kills alive_s decisions meanMs maxMs(maxAt) stageErrors')
for (const seed of seeds) {
  let last = null
  const f = { team: (info) => (last = teamFactory(info)), opponents: [] }
  const rec = await playMatch(seed, { mode, full, keep: false }, ctx, f)
  const st = last.brain.debugState()
  for (const [k, v] of Object.entries(st.errors)) all.errors[k] = (all.errors[k] || 0) + v
  console.log(`${seed} ${mode} place ${rec.place} kills ${rec.kills} alive ${rec.timeAlive}s n=${last.n} mean ${(last.sumMs / last.n).toFixed(3)} max ${last.maxMs.toFixed(1)} (tick ${last.maxTick} ${last.maxState}) errors ${JSON.stringify(st.errors)} cause ${rec.cause} counters ${JSON.stringify({ plans: st.counters.plans, evals: st.counters.evals, skipped: st.counters.skipped, overruns: st.counters.overruns, slow: st.counters.slow })}`)
}
const ts = all.times
console.log(`\nALL decisions ${ts.length}: mean ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(3)} p50 ${pct(ts, 0.5).toFixed(3)} p99 ${pct(ts, 0.99).toFixed(2)} p999 ${pct(ts, 0.999).toFixed(2)} max ${Math.max(...ts).toFixed(1)} ms; >15ms ${ts.filter((v) => v > 15).length}, >25ms ${ts.filter((v) => v > 25).length}, >50ms ${ts.filter((v) => v > 50).length}`)
console.log('stage errors', JSON.stringify(all.errors), 'raw problems', JSON.stringify(all.raw))
console.log('odd actions', JSON.stringify(all.odd, null, 1))
for (const l of all.logs.filter((l) => /failed|THROW|ODD/.test(l)).slice(0, 40)) console.log(l.split('\n').slice(0, 5).join('\n').slice(0, 900))
