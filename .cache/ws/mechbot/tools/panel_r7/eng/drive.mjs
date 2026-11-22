// Panel R7 eng: behaviour audit driver (sim, in-process). Behaviour and failure modes only; never rank by it.
// usage: taskset -c 2 ../../../bun drive.mjs --seeds 1-12 [--brain ibot|bot] [--ov '{"select":{"retreat":"d3"}}'] [--out f.json]
import { makeContext, playMatch } from '../../../sim/run.js'
import { brainBotFactory } from '../../../sim/ourbot.js'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const sr = arg('--seeds', '1-6').split('-').map(Number)
const seeds = []; for (let s = sr[0]; s <= (sr[1] || sr[0]); s++) seeds.push(s)
const brainDir = arg('--brain', 'ibot')
const ov = JSON.parse(arg('--ov', '{"select":{"retreat":"d3"}}'))
const mode = arg('--mode', 'squad')
const out = arg('--out', null)
const mod = await import(pathToFileURL(join(HERE, brainDir, 'lib', 'brain.js')).href)
const ctx = makeContext({ overridesObject: ov })
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a))

const all = []
for (const seed of seeds) {
  const base = brainBotFactory(mod, { world: ctx.world, overrides: ov, quiet: true, name: 'ours' })
  const F = []          // per-decision frames
  const R = { react: [], ms: [] }
  let holder = null
  const team = (info) => {
    const b = base(info); holder = b
    const act0 = b.act.bind(b)
    const lastHit = new Map()
    const pend = new Map()       // attacker id -> { t0, tgtT, fireT }
    b.act = (obs) => {
      const t0 = performance.now()
      const a = act0(obs)
      const ms = performance.now() - t0
      R.ms.push(ms)
      const B = b.brain && b.brain._B
      if (!B) return a
      const t = obs.t, me = obs.self
      // reaction clocks: a mech that starts hurting us (no hit from it in the last 5 s)
      for (const e of obs.events || []) {
        if (e.type !== 'damaged' || !Number.isInteger(e.by) || e.by > 15) continue
        const lt = lastHit.get(e.by)
        if (lt === undefined || t - lt > 5) pend.set(e.by, { id: e.by, t0: t, tgtT: -1, fireT: -1, faceT: -1, wasTgt: B.target && B.target.id === e.by })
        lastHit.set(e.by, t)
      }
      for (const p of pend.values()) {
        if (t - p.t0 > 6) { R.react.push(p); pend.delete(p.id); continue }
        const tr = B.tracks.get(p.id)
        if (p.tgtT < 0 && B.target && B.target.id === p.id) p.tgtT = t - p.t0
        if (p.faceT < 0 && tr && Math.abs(wrapPi(me.aim[0] - tr.bearing)) < 0.35) p.faceT = t - p.t0
        if (p.fireT < 0 && B.target && B.target.id === p.id && a.fire && (a.fire[0] || a.fire[1])) { p.fireT = t - p.t0; R.react.push(p); pend.delete(p.id) }
      }
      const g = B.me.gun, tg = B.target
      const ready = !!(g && g.cooldown <= 0.1 && g.ammo > 0 && g.reload <= 0)
      const tgtLos = !!(tg && !tg.npc && tg.listed && tg.losOut && g && tg.dist <= g.range * 0.97)
      F.push({ th: B.threats, fi: B.finishing ? 1 : 0, thp: tg ? Math.round(100 * tg.hp / tg.maxHp) : -1, q: Math.round(10 * (B.me.t - B.lastLosInT)) / 10, sh: Math.round(10 * (B.me.t - B.me.lastShotAtT)) / 10, tl: tg ? tg.listed : false, tlo: tg ? tg.losOut : false, td: tg ? tg.dist : -1, blind: !!(tg && !tg.listed), t, md: B.mode, lg: B.legKind, tg: tg ? tg.id : -1, hp: me.hp, x: me.pos[0], y: me.pos[1], sp: Math.hypot(me.vel[0], me.vel[1]),
        mv: Math.hypot(a.move?.[0] || 0, a.move?.[1] || 0), f0: !!(a.fire && a.fire[0]), f1: !!(a.fire && a.fire[1]), ak: B.aimKind, ready, tgtLos,
        hold: B.holdFire, yawErr: Math.abs(wrapPi(me.aim[0] - (a.aim ? a.aim[0] : me.aim[0]))), inZone: me.in_zone !== false, dps: obs.zone?.dps || 0,
        nr: obs.zone?.next_radius ?? 0, ls: B.losing, ms, alive: obs.alive, en: me.energy, gr: me.grounded })
      return a
    }
    return b
  }
  const rec = await playMatch(seed, { mode, trace: true, keep: true }, ctx, { team, opponents: [] })
  const B = holder && holder.brain && holder.brain._B
  const shots = (rec.trace?.shots || []).filter((s) => s[1] === rec.slot)
  const res = { seed, place: rec.place, score: rec.score, kills: rec.kills, alive: rec.timeAlive, cause: rec.cause, killer: rec.killerName, dmgIn: rec.dmgTaken, dmgOut: rec.dmgDealt,
    maxMs: rec.maxMs, counters: B ? { ...B.counters } : null, errors: B ? { ...B.errorsByStage } : null,
    shots: shots.length, wallShots: shots.filter((s) => s[6] !== null && s[6] !== undefined && s[6] !== false && s[6] !== 0).length, hits: shots.filter((s) => s[4]).length,
    frames: F, react: R.react, ms: R.ms, shotList: shots }
  all.push(res)
  process.stderr.write(`seed ${seed} place ${rec.place} score ${rec.score} alive ${rec.timeAlive} cause ${rec.cause}:${rec.killerName} maxMs ${rec.maxMs}\n`)
}
if (out) writeFileSync(out, JSON.stringify(all))
