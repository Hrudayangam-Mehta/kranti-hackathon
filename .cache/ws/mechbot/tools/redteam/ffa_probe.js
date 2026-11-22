#!/usr/bin/env bun
// DEV ONLY (red team): plays free-for-all matches in the local simulator with OUR brain in one seat and
// sandboxed public bots (started only through /srv/mech-sparring/run.sh <name>) in the other seats, and
// records what our bot did second by second: posture (env), mode, legs, target, range, who shot first.
//
//   bun tools/redteam/ffa_probe.js --field top15 --seeds 1,2,3 --out tools/redteam/out/base.json
//   bun tools/redteam/ffa_probe.js --field a,b,c --overrides '{"env":"ffa"}' --tag ffa_forced
//
// --field   "top15" | "mixed" | "hiders" | comma list of roster names (remaining seats: simulator house bots)
// --seeds   comma list of match seeds          --overrides  JSON of brain PARAMS overrides
// --tag     label written into the record      --out        json file      --timeline  keep the 1 Hz timeline
import { writeFileSync } from 'node:fs'
import { makeContext, resolveBot, playMatch } from '../../sim/run.js'
import { Nav } from '../../bot/lib/nav.js'
import * as brainMod from '../../bot/lib/brain.js'

const FIELDS = {
  top15: ['magic_53f6854', 'proj1_aggro6_cefd23f', 'proj1_kite200_b624765', 'ttun_ae1b122', 'kanyaraasi_83e4c93', 'kyoto_v15_5bd6c37', 'ttun_v8econ_b7e9a6d',
    'r1ver_ts_af337d5', 'bd_payload_9c9801e', 'prakash_v5_14b39db', 'th3r0n_expJ_7775214', 'nexus_v281_312d591', 'kestrel_G3_8671068', 'lance_171bc06_nosneak', 'whymiso_r15_be4bf88'],
  mixed: ['magic_53f6854', 'proj1_kite200_b624765', 'ttun_v8econ_b7e9a6d', 'kanyaraasi_83e4c93', 'r1ver_ts_af337d5', 'bd_payload_9c9801e', 'th3r0n_expJ_7775214', 'nexus_v281_312d591',
    'lance_171bc06', 'r1ver_py_97e0e58', 'lance_patient_42d652b', 'colton_hide_285afd7', 'ourux_hide_e5fb3a9', 'kyoto_ghost_c480a5d', 'colton_survive_b2e8df5'],
  hiders: ['colton_hide_285afd7', 'ourux_hide_e5fb3a9', 'kyoto_ghost_c480a5d', 'colton_survive_b2e8df5', 'lance_patient_42d652b', 'r1ver_py_97e0e58', 'lance_171bc06', 'bd_coverdrive_2b6420c',
    'kyoto_phantom_7723212', 'sphugne_cover_cb7a1cc', 'sphugne_evasion_6ab815c', 'magic_53f6854', 'proj1_kite200_b624765', 'ttun_v8econ_b7e9a6d', 'kanyaraasi_83e4c93'],
}
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const has = (k) => process.argv.includes(k)
const fieldArg = arg('--field', 'top15')
const field = FIELDS[fieldArg] || fieldArg.split(',').map((s) => s.trim()).filter(Boolean)
for (const n of field) if (!/^[A-Za-z0-9_]+$/.test(n)) throw new Error('bad roster name ' + n)
const seeds = arg('--seeds', '1').split(',').map((s) => parseInt(s, 10))
const overrides = JSON.parse(arg('--overrides', '{}'))
const tag = arg('--tag', 'base')
const keepTimeline = has('--timeline')
const mode = arg('--mode', 'ffa')                 // 'ffa' | 'squad' (squad: 15 simulator house bots as one squad; checks false latches)
// --shim  emulates a doctrine fix on top of the shipped brain WITHOUT touching bot/ (action post-processing):
//   nofirst    : no first shot at a mech that is not hostile (D0 definition) while more than 4 are alive
//   noapproach : nofirst + never close the range to a non-hostile visible mech
//   evade      : nofirst + walk away from the nearest visible non-hostile mech (keep strafing component), no boost
const shim = arg('--shim', '')
const shimUntil = parseFloat(arg('--shim-until', '1e9'))   // seconds; D0 guard = 40
const MAP = '/srv/mech-sparring/_arena'

const ctx = makeContext({ mapDir: MAP, timeout: 250, quiet: true })
let nav = null
function teamFactory() {
  return () => {
    let brain = null
    const rec = { latchT: null, firstShotT: null, firstHurtT: null, firstHurtBy: null, firstSeenT: null, firstSeenD: null, weFiredFirst: null,
      tl: [], win: [], modeS: {}, legS: {}, shotsBeforeHurt: 0, minNearest: Infinity, openS: 0, approachS: 0, chargeS: 0, errors: 0, laserT: null, cubes: 0 }
    let lastEnv = 'SQUAD', lastSec = -1, prevNear = null
    const bot = {
      name: 'ours', rec, errors: 0, maxMs: 0, sumMs: 0, n: 0, lates: 0,
      hello(h) {
        const mc = h.config.mech
        if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up ?? 1.2, maxSlopeDeg: mc.max_slope_deg ?? 50 })
        nav.setBody(mc.radius, mc.height)
        brain = brainMod.createBrain(h, { world: ctx.world, nav, log: () => {} }, overrides)
        return { type: 'ready', name: 'ours' }
      },
      act(obs) {
        const t0 = performance.now()
        let a
        try { a = brain.act(obs, t0 + 27) } catch (e) { bot.errors++; a = { move: [0, 0], fire: [false, false] } }
        a.tick = obs.tick
        if (shim && obs.t < shimUntil && obs.alive > 4) { try { applyShim(obs, a, brain, bot) } catch (e) { bot.errors++ } }
        const ms = performance.now() - t0
        bot.n++; bot.sumMs += ms; if (ms > bot.maxMs) bot.maxMs = ms; if (ms > 50) bot.lates++
        try {
          const B = brain._B, t = obs.t, me = obs.self
          const s = brain.debugState()
          if (s.env === 'FFA' && lastEnv !== 'FFA') rec.latchT = t
          lastEnv = s.env
          let near = Infinity
          for (const m of obs.mechs) if (m.kind === 'mech') { const d = Math.hypot(m.pos[0] - me.pos[0], m.pos[1] - me.pos[1]); if (d < near) near = d }
          if (near < Infinity && rec.firstSeenT === null) { rec.firstSeenT = t; rec.firstSeenD = Math.round(near) }
          if (near < rec.minNearest) rec.minNearest = near
          const fired = a.fire && (a.fire[0] || a.fire[1])
          const tgtMech = B.target && !B.target.npc
          if (fired && tgtMech && rec.firstShotT === null) rec.firstShotT = t
          for (const e of obs.events || []) if (e.type === 'damaged' && e.by !== null && e.by !== undefined && e.by < 16 && rec.firstHurtT === null) { rec.firstHurtT = t; rec.firstHurtBy = e.by }
          if (fired && tgtMech && rec.firstHurtT === null) rec.shotsBeforeHurt++
          if (rec.weFiredFirst === null && (rec.firstShotT !== null || rec.firstHurtT !== null)) rec.weFiredFirst = rec.firstShotT !== null && (rec.firstHurtT === null || rec.firstShotT <= rec.firstHurtT)
          rec.modeS[s.mode] = (rec.modeS[s.mode] || 0) + 0.1
          rec.legS[s.leg] = (rec.legS[s.leg] || 0) + 0.1
          // walking at a visible mech: nearest seen mech got closer by our own motion (we move toward it)
          if (near < Infinity && B.target && tgtMech) {
            const dx = B.target.x - me.pos[0], dy = B.target.y - me.pos[1], d = Math.hypot(dx, dy) || 1
            const vr = (me.vel[0] * dx + me.vel[1] * dy) / d
            if (vr > 4) rec.approachS += 0.1
          }
          const lz = me.weapons.find((w) => w && w.kind === 'laser')
          if (lz && rec.laserT === null) rec.laserT = t
          if (lz && lz.charge > 0) rec.chargeS += 0.1
          rec.cubes = me.cubes
          // LAST-STAND episodes: hp fraction when the current one began, and how long it has lasted
          if (s.stance === 'LAST-STAND') { if (!rec.ls) { rec.ls = { t0: t, hpf: me.hp / me.max_hp, n1: s.n1, A: Math.round(s.A), hide: s.hide }; rec.lsCount = (rec.lsCount || 0) + 1 } } else rec.ls = null
          if (s.stance === 'LAST-STAND') rec.lsS = (rec.lsS || 0) + 0.1
          // rolling 10 s window for the state at death
          const sp = Math.hypot(me.vel[0], me.vel[1])
          rec.win.push({ t, mode: s.mode, leg: s.leg, st: s.stance, sp, hp: me.hp, seen: obs.mechs.filter((m) => m.kind === 'mech').map((m) => m.id), near, fire: fired ? 1 : 0, tgt: s.target })
          if (rec.win.length > 100) rec.win.shift()
          const sec = Math.floor(t)
          if (keepTimeline && sec !== lastSec) {
            lastSec = sec
            rec.tl.push({ t: sec, env: s.env, mode: s.mode, leg: s.leg, st: s.stance, hp: Math.round(me.hp), tgt: s.target, tgtD: B.target ? Math.round(B.target.dist) : null, near: near < Infinity ? Math.round(near) : null,
              seen: obs.mechs.filter((m) => m.kind === 'mech').length, fire: fired ? 1 : 0, sp: Math.round(Math.hypot(me.vel[0], me.vel[1])), alive: obs.alive, cubes: me.cubes, w: me.weapons.map((w) => (w ? w.kind[0] : '-')).join('') })
          }
          prevNear = near
        } catch (e) { rec.errors++ }
        return a
      },
    }
    return bot
  }
}

const wrapA = (x) => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x }
function applyShim(obs, a, brain, bot) {
  const me = obs.self, t = obs.t
  if (!bot.sh) bot.sh = { hurtT: new Map(), suppressed: 0 }
  const sh = bot.sh
  for (const e of obs.events || []) if (e.type === 'damaged' && typeof e.by === 'number' && e.by < 16) sh.hurtT.set(e.by, t)
  let anyHostile = false, nearest = null, nd = Infinity
  for (const [, ht] of sh.hurtT) if (t - ht <= 4) anyHostile = true        // also covers attackers we cannot see
  const hostileIds = new Set()
  for (const m of obs.mechs) {
    if (m.kind !== 'mech') continue
    const dx = me.pos[0] - m.pos[0], dy = me.pos[1] - m.pos[1], d = Math.hypot(dx, dy)
    const aimsAtUs = d <= 160 && Math.abs(wrapA(Math.atan2(dy, dx) - m.aim[0])) <= 12 * Math.PI / 180
    const hurt = sh.hurtT.has(m.id) && t - sh.hurtT.get(m.id) <= 4
    const weak = m.hp <= 0.35 * m.max_hp && d <= 140
    if (aimsAtUs || hurt) { hostileIds.add(m.id); anyHostile = true } else if (weak) hostileIds.add(m.id)
    if (!(aimsAtUs || hurt) && d < nd) { nd = d; nearest = m }
  }
  const s = brain.debugState()
  if (s.stance === 'LAST-STAND' || s.mode === 'ZONE') return
  const tgt = s.target
  const tgtIsMech = typeof tgt === 'number' && tgt < 16
  // 1. first-shot rule: only at hostile (or nearly dead) mechs; crates / drones are left to the brain
  if (tgtIsMech && !hostileIds.has(tgt) && a.fire && (a.fire[0] || a.fire[1])) {
    const lz = me.weapons.findIndex((w) => w && w.kind === 'laser')
    a.fire = [false, false]; sh.suppressed++
    if (lz >= 0 && me.weapons[lz].charge > 0) a.fire[lz] = true   // keep holding a charge rather than releasing it
  }
  if (shim === 'nofirst' || anyHostile || !nearest || !a.move) return
  const ux = (nearest.pos[0] - me.pos[0]) / (nd || 1), uy = (nearest.pos[1] - me.pos[1]) / (nd || 1)
  const rad = a.move[0] * ux + a.move[1] * uy
  if (shim === 'noapproach') { if (rad > 0) { a.move = [a.move[0] - rad * ux, a.move[1] - rad * uy] } return }
  if (shim === 'evade') {
    const tx = a.move[0] - rad * ux, ty = a.move[1] - rad * uy
    let mx = -ux + 0.5 * tx, my = -uy + 0.5 * ty
    const l = Math.hypot(mx, my) || 1
    a.move = [mx / l, my / l]; a.boost = false
  }
}

const factories = { team: null, opponents: [] }
let teamBot = null
const mk = teamFactory()
factories.team = (info) => { teamBot = mk(info); return teamBot }
if (mode === 'ffa') for (const n of field) factories.opponents.push(await resolveBot(`proc:/srv/mech-sparring/run.sh ${n}`, ctx))

const out = []
for (const seed of seeds) {
  const t0 = performance.now()
  const r = await playMatch(seed, { mode, full: mode === 'ffa', latency: 0, keep: true }, ctx, factories)
  const res = r.result
  const per = res.mechs.map((m) => ({ id: m.id, name: m.name, place: m.place, t: Math.round(m.timeAlive * 10) / 10, kills: m.kills, cubes: m.cubes, cause: m.cause, by: m.killedBy, dealt: Math.round(m.dmgDealt), taken: Math.round(m.dmgTaken), loadout: m.loadout, lates: m.lates || 0, missed: m.missed || 0 }))
  const deaths = per.filter((m) => m.id !== r.slot && m.place > 1).map((m) => m.t).sort((a, b) => a - b)
  const rec = teamBot.rec
  const round = (o) => { for (const k in o) o[k] = Math.round(o[k] * 10) / 10; return o }
  const W = rec.win, last = W[W.length - 1] || {}
  const killerSeen = W.length && r.result.mechs[r.slot].killedBy !== null ? W.filter((q) => q.seen.includes(r.result.mechs[r.slot].killedBy)).length / W.length : null
  const atDeath = r.place > 1 ? { mode: last.mode, leg: last.leg, st: last.st, tgt: last.tgt ?? null, stillShare: Math.round(100 * W.filter((q) => q.sp < 1).length / Math.max(1, W.length)) / 100, fireShare: Math.round(100 * W.filter((q) => q.fire).length / Math.max(1, W.length)) / 100,
    killerSeenShare: killerSeen === null ? null : Math.round(100 * killerSeen) / 100, hp10sAgo: W.length ? Math.round(W[0].hp) : null, nearLast: last.near < Infinity ? Math.round(last.near) : null, modes: [...new Set(W.map((q) => q.mode + '/' + q.leg))].slice(-4) } : null
  const lastStand = rec.ls && r.place > 1 ? { enterHpf: Math.round(rec.ls.hpf * 100) / 100, lastedS: Math.round((r.timeAlive - rec.ls.t0) * 10) / 10, n1: rec.ls.n1, A: rec.ls.A, hide: rec.ls.hide, episodes: rec.lsCount || 0, totalS: Math.round((rec.lsS || 0) * 10) / 10 } : { episodes: rec.lsCount || 0, totalS: Math.round((rec.lsS || 0) * 10) / 10 }
  const row = { tag, seed, atDeath, lastStand, slot: r.slot, place: r.place, score: r.score, kills: r.kills, alive_s: r.timeAlive, cause: r.cause, killer: r.killerName, dealt: Math.round(r.dmgDealt), taken: Math.round(r.dmgTaken), cubes: r.cubes, loadout: r.loadout,
    latchT: rec.latchT, firstSeenT: rec.firstSeenT, firstSeenD: rec.firstSeenD, firstShotT: rec.firstShotT, firstHurtT: rec.firstHurtT, weFiredFirst: rec.weFiredFirst, shotsBeforeHurt: rec.shotsBeforeHurt,
    minNearest: Math.round(rec.minNearest), approachS: Math.round(rec.approachS * 10) / 10, chargeS: Math.round(rec.chargeS * 10) / 10, laserT: rec.laserT, modeS: round(rec.modeS), legS: round(rec.legS),
    death3T: deaths[2] ?? null, death8T: deaths[7] ?? null, othersDeadAt60: deaths.filter((d) => d <= 60).length, othersDeadAt200: deaths.filter((d) => d <= 200).length,
    oppMissed: per.reduce((q, m) => q + (m.id !== r.slot ? m.missed : 0), 0), oppLates: per.reduce((q, m) => q + (m.id !== r.slot ? m.lates : 0), 0), shimSuppressed: teamBot.sh ? teamBot.sh.suppressed : 0,
    lates: teamBot.lates, maxMs: Math.round(teamBot.maxMs), errors: teamBot.errors + rec.errors, matchT: r.matchT, wallS: Math.round((performance.now() - t0) / 100) / 10, field: per }
  if (keepTimeline) row.tl = rec.tl
  out.push(row)
  console.log(`${tag} seed ${seed}: place ${r.place} alive ${r.timeAlive}s cause ${r.cause}:${r.killerName} latch ${rec.latchT} firstSeen ${rec.firstSeenT}@${rec.firstSeenD}m firstShot ${rec.firstShotT} firstHurt ${rec.firstHurtT} weFirst ${rec.weFiredFirst} approach ${row.approachS}s minNear ${row.minNearest} death3 ${row.death3T} death8 ${row.death8T} cubes ${r.cubes} ${JSON.stringify(r.loadout)} wall ${row.wallS}s`)
}
const mean = (f) => out.reduce((s, r) => s + f(r), 0) / Math.max(1, out.length)
console.log(`${tag}: n=${out.length} mean place ${mean((r) => r.place).toFixed(2)} mean score ${mean((r) => r.score).toFixed(2)} mean alive ${mean((r) => r.alive_s).toFixed(0)}s  firedFirst ${out.filter((r) => r.weFiredFirst).length}/${out.length}`)
const file = arg('--out', null)
if (file) writeFileSync(file, JSON.stringify({ tag, mode, shim, shimUntil, field, overrides, seeds, matches: out }, null, 1))
process.exit(0)
