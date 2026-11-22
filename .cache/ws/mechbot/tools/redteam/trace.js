// Red-team tool: per-decision trace of one simulator match on the frozen snapshot.
//   bun tools/redteam/trace.js --seed 5 [--every 3] [--from 0] [--to 999]
import { makeContext, playMatch } from './snap/sim/run.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed = parseInt(arg('seed', '1'), 10), every = parseInt(arg('every', '3'), 10), from = parseFloat(arg('from', '0')), to = parseFloat(arg('to', '1e9'))
const ctx = makeContext({ quiet: true })
let brain = null, k = 0
const team = () => ({
  name: 'ours', hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: (...a) => console.log('[brain]', ...a) }, { planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 }); return { type: 'ready', name: 'ours' } },
  act(obs) {
    const a = brain.act(obs, performance.now() + 1e6); a.tick = obs.tick
    const B = brain._B, me = B.me, tg = B.target
    const ev = (obs.events || []).filter((e) => e.type !== 'pickup').map((e) => e.type === 'damaged' ? `D${Math.round(e.amount)}${(e.weapon || '?')[0]}${e.by ?? 'z'}${e.rear ? 'R' : ''}` : e.type === 'hit' ? `H${Math.round(e.amount)}>${e.target}` : e.type === 'kill' ? `KILL${e.target}` : e.type).join(' ')
    k++
    if (obs.t >= from && obs.t <= to && (k % every === 0 || ev)) {
      const ms = (obs.mechs || []).filter((m) => m.kind === 'mech').map((m) => `${m.id}:${Math.round(Math.hypot(m.pos[0] - me.x, m.pos[1] - me.y))}m/${Math.round(m.hp)}/${(m.weapons || []).map((w) => w[0]).join('')}${m.charging ? '!' : ''}`).join(' ')
      console.log(`${obs.t.toFixed(1).padStart(6)} hp${String(Math.round(me.hp)).padStart(5)} ${(B.mode + '/' + B.legKind).padEnd(19)} ${B.stance.slice(0, 4)} t${tg ? tg.id : '-'} A${String(Math.round(B.A)).padStart(4)} n1 ${B.n1} hide ${B.hide.state[0]}${String(Math.round(B.hide.dist || 0)).padStart(3)} sp${me.speed.toFixed(0).padStart(3)} ${a.fire[0] ? 'G' : '-'}${a.fire[1] ? 'X' : '-'}${a.reload ? 'r' : '-'} am${me.gun ? me.gun.ammo : '-'} ${me.weapons[1] ? me.weapons[1].kind.slice(0, 3) : '---'} c${me.cubes} | ${ms} | ${ev}`)
    }
    return a
  },
})
const rec = await playMatch(seed, { mode: 'squad', keep: false }, ctx, { team, opponents: [] })
console.log(JSON.stringify({ seed, score: rec.score, kills: rec.kills, t: rec.timeAlive, cause: rec.cause, killer: rec.killerName, dealt: rec.dmgDealt, taken: rec.dmgTaken }))
process.exit(0)
