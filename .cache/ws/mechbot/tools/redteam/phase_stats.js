// Red-team tool: run N simulator squad matches with our brain and aggregate where hp, time and lives are lost.
//   bun tools/redteam/phase_stats.js --from 1 --n 48 [--overrides '{"k":v}'] [--json out.json] [--deaths]
// DEV ONLY. Reads sim/ and bot/ (never writes there).
import { makeContext, playMatch } from './snap/sim/run.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const from = parseInt(arg('from', '1'), 10), n = parseInt(arg('n', '48'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const showDeaths = args.includes('--deaths')
const ctx = makeContext({ quiet: true })
let nav = null

async function one(seed) {
  const S = {
    seed, tFirstSeen: -1, tFirstDmg: -1, tLaser: -1, tSecond: -1, secondKind: '', laserAtFirstDmg: false, hpfAtFirstDmg: 1,
    legT: {}, modeT: {}, stanceT: {}, stillUnderFire: 0, idleStill: 0, idleHold: 0, dmgBy: {}, dmgLeg: {}, dmgRear: 0, dmgTotal: 0, dmgCharging: 0,
    lsEntries: [], zoneDmg: 0, outTicks: 0, kills: [], ffaT: -1, npcDmg: 0, dmgByRange: {}, dmgGunOnly: 0, dmgWithLaser: 0,
    dealtGunOnly: 0, dealtWithLaser: 0, fightRangeGun: [], fightRangeLaser: [], maxAttackers5: 0, last: [], counters: null, cubes60: -1, cubes120: -1, cubes180: -1,
    shotsWhileNoLos: 0, laserShots: 0, laserHits: 0, hpAtT: {}, chargeT: 0, chargeHeldFullT: 0, legFlips: 0, modeFlips: 0, exposedHealT: 0, attackersEver: new Set(),
    dmgWhenStill: 0, dmgWhenMoving: 0, unlistedDmg: 0, firstDmgBy: -1, firstHunterWeapons: '', atk5: [],
  }
  let prevLeg = '', prevMode = '', prevStance = '', brain = null
  const recent = []
  function teamFactory() {
    return {
      name: 'ours', errors: 0, lates: 0, n: 0, sumMs: 0, maxMs: 0,
      hello(h) {
        const mc = h.config.mech
        if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up ?? 1.2, maxSlopeDeg: mc.max_slope_deg ?? 50 })
        nav.setBody(mc.radius, mc.height)
        brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, overrides)
        return { type: 'ready', name: 'ours' }
      },
      act(obs) {
        const a = brain.act(obs, performance.now() + 27)
        a.tick = obs.tick
        const B = brain._B, me = B.me, t = obs.t, dt = 0.1
        const w1 = me.weapons[1]
        if (S.tSecond < 0 && w1) { S.tSecond = t; S.secondKind = w1.kind }
        if (S.tLaser < 0 && me.laser) S.tLaser = t
        const mechs = (obs.mechs || []).filter((m) => m.kind === 'mech')
        if (S.tFirstSeen < 0 && mechs.length) S.tFirstSeen = t
        S.legT[B.legKind] = (S.legT[B.legKind] || 0) + dt
        S.modeT[B.mode] = (S.modeT[B.mode] || 0) + dt
        S.stanceT[B.stance] = (S.stanceT[B.stance] || 0) + dt
        if (B.legKind !== prevLeg) S.legFlips++
        if (B.mode !== prevMode) S.modeFlips++
        if (B.stance === 'LAST-STAND' && prevStance !== 'LAST-STAND') S.lsEntries.push({ t, hpf: +me.hpf.toFixed(2), A: Math.round(B.A), n1: B.n1, tCover: +B.tCover.toFixed(1), hide: B.hide.state })
        prevLeg = B.legKind; prevMode = B.mode; prevStance = B.stance
        const underFire = t - B.lastLosInT <= 0.5 && B.A > 0
        if (underFire && me.speed < 1.5) S.stillUnderFire += dt
        if (mechs.length === 0 && me.speed < 1 && me.hpf >= 0.9 && B.mode === 'HOLD') S.idleStill += dt
        if (B.mode === 'HOLD') S.idleHold += dt
        if (B.mode === 'HEAL' && t - B.lastLosInT <= 0.5) S.exposedHealT += dt
        if (!me.inZone) S.outTicks++
        if (B.env === 'FFA' && S.ffaT < 0) S.ffaT = t
        if (me.laser && me.laser.charge > 0) { S.chargeT += dt; if (me.laser.charge >= me.laser.full * 0.97) S.chargeHeldFullT += dt }
        for (const mark of [60, 120, 180]) if (S['cubes' + mark] < 0 && t >= mark) S['cubes' + mark] = me.cubes
        for (const mark of [30, 60, 90, 120, 150, 180, 240, 300]) if (S.hpAtT[mark] === undefined && t >= mark) S.hpAtT[mark] = +me.hpf.toFixed(2)
        const tg = B.target
        for (const e of obs.events || []) {
          if (e.type === 'damaged') {
            const amt = e.amount || 0
            S.dmgTotal += amt
            S.dmgBy[e.weapon] = (S.dmgBy[e.weapon] || 0) + amt
            S.dmgLeg[B.legKind] = (S.dmgLeg[B.legKind] || 0) + amt
            if (e.rear) S.dmgRear += amt
            if (e.weapon === 'zone') S.zoneDmg += amt
            if (e.weapon === 'npc') S.npcDmg += amt
            if (me.laser && me.laser.charge > 0) S.dmgCharging += amt
            if (me.speed < 1.5) S.dmgWhenStill += amt; else S.dmgWhenMoving += amt
            if (me.laser) S.dmgWithLaser += amt; else S.dmgGunOnly += amt
            if (Number.isInteger(e.by) && e.by < 100) {
              S.attackersEver.add(e.by)
              recent.push({ t, by: e.by })
              const m = mechs.find((q) => q.id === e.by)
              if (!m) S.unlistedDmg += amt
              else { const d = Math.hypot(m.pos[0] - me.x, m.pos[1] - me.y); const b = d < 50 ? '<50' : d < 75 ? '50-75' : d < 100 ? '75-100' : d < 125 ? '100-125' : d < 150 ? '125-150' : '150+'; S.dmgByRange[b] = (S.dmgByRange[b] || 0) + amt }
              if (S.tFirstDmg < 0) { S.tFirstDmg = t; S.laserAtFirstDmg = !!me.laser; S.hpfAtFirstDmg = me.hpf; S.firstDmgBy = e.by; S.firstHunterWeapons = m ? (m.weapons || []).join('+') : '?' }
            }
          } else if (e.type === 'hit') {
            if (e.target < 100) { if (me.laser) S.dealtWithLaser += e.amount; else S.dealtGunOnly += e.amount }
          } else if (e.type === 'kill') S.kills.push(+t.toFixed(1))
        }
        while (recent.length && t - recent[0].t > 5) recent.shift()
        const na = new Set(recent.map((r) => r.by)).size
        if (na > S.maxAttackers5) S.maxAttackers5 = na
        if (B.mode === 'FIGHT' && tg && tg.losOut && !tg.npc) (me.laser ? S.fightRangeLaser : S.fightRangeGun).push(tg.dist)
        S.last.push({ t, hp: Math.round(me.hp), hpf: +me.hpf.toFixed(2), mode: B.mode, leg: B.legKind, st: B.stance, A: Math.round(B.A), n1: B.n1, nLos: B.nLos, sp: +me.speed.toFixed(1), na, td: tg ? Math.round(tg.dist) : -1, w1: w1 ? w1.kind : '-', inZone: me.inZone, alive: obs.alive })
        if (S.last.length > 60) S.last.shift()
        S.counters = { ...B.counters }
        return a
      },
    }
  }
  const rec = await playMatch(seed, { mode: 'squad', keep: false }, ctx, { team: teamFactory, opponents: [] })
  S.rec = rec
  S.attackersEver = S.attackersEver.size
  return S
}

const all = []
for (let s = from; s < from + n; s++) all.push(await one(s))
const mean = (f) => all.reduce((x, r) => x + f(r), 0) / all.length
const med = (arr) => { const a = arr.filter((v) => v === v).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : NaN }
const sumObj = (key) => { const o = {}; for (const r of all) for (const k in r[key]) o[k] = (o[k] || 0) + r[key][k]; return o }
const rnd = (o, div = 1) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k || '(none)', Math.round(v / div)]))
const totalT = all.reduce((x, r) => x + r.rec.timeAlive, 0)
const out = {
  n: all.length, overrides, meanScore: +mean((r) => r.rec.score).toFixed(3), meanKills: +mean((r) => r.rec.kills).toFixed(2), meanAlive: +mean((r) => r.rec.timeAlive).toFixed(1),
  scoreHist: all.reduce((h, r) => { h[r.rec.score] = (h[r.rec.score] || 0) + 1; return h }, {}),
  causes: all.reduce((h, r) => { const c = r.rec.alive ? 'alive' : `${r.rec.cause}:${r.rec.killerName}`; h[c] = (h[c] || 0) + 1; return h }, {}),
  tFirstSeen_med: med(all.map((r) => r.tFirstSeen)), tFirstDmg_med: med(all.map((r) => r.tFirstDmg)),
  tSecond_med: med(all.map((r) => r.tSecond < 0 ? 999 : r.tSecond)), tLaser_med: med(all.map((r) => r.tLaser < 0 ? 999 : r.tLaser)),
  laserEver: all.filter((r) => r.tLaser >= 0).length, laserAtFirstDmg: all.filter((r) => r.laserAtFirstDmg).length,
  secondKinds: all.reduce((h, r) => { h[r.secondKind || 'none'] = (h[r.secondKind || 'none'] || 0) + 1; return h }, {}),
  firstHunterWeapons: all.reduce((h, r) => { h[r.firstHunterWeapons || 'none'] = (h[r.firstHunterWeapons || 'none'] || 0) + 1; return h }, {}),
  dmgTaken_perMatch: Math.round(mean((r) => r.dmgTotal)), dmgBy_perMatch: rnd(sumObj('dmgBy'), all.length), dmgLeg_perMatch: rnd(sumObj('dmgLeg'), all.length), dmgByRange_perMatch: rnd(sumObj('dmgByRange'), all.length),
  rearShare: +(all.reduce((x, r) => x + r.dmgRear, 0) / all.reduce((x, r) => x + r.dmgTotal, 1)).toFixed(3),
  unlistedShare: +(all.reduce((x, r) => x + r.unlistedDmg, 0) / all.reduce((x, r) => x + r.dmgTotal, 1)).toFixed(3),
  stillShare: +(all.reduce((x, r) => x + r.dmgWhenStill, 0) / all.reduce((x, r) => x + r.dmgTotal, 1)).toFixed(3),
  chargingShare: +(all.reduce((x, r) => x + r.dmgCharging, 0) / all.reduce((x, r) => x + r.dmgTotal, 1)).toFixed(3),
  gunOnly: { taken: Math.round(mean((r) => r.dmgGunOnly)), dealt: Math.round(mean((r) => r.dealtGunOnly)) }, withLaser: { taken: Math.round(mean((r) => r.dmgWithLaser)), dealt: Math.round(mean((r) => r.dealtWithLaser)) },
  legShare: Object.fromEntries(Object.entries(sumObj('legT')).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k || '(none)', +(v / totalT).toFixed(3)])),
  modeShare: Object.fromEntries(Object.entries(sumObj('modeT')).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / totalT).toFixed(3)])),
  stanceShare: Object.fromEntries(Object.entries(sumObj('stanceT')).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / totalT).toFixed(3)])),
  stillUnderFire_s: +mean((r) => r.stillUnderFire).toFixed(1), idleStill_s: +mean((r) => r.idleStill).toFixed(1), idleHold_s: +mean((r) => r.idleHold).toFixed(1), exposedHeal_s: +mean((r) => r.exposedHealT).toFixed(1),
  lastStand: { matches: all.filter((r) => r.lsEntries.length).length, entries: all.reduce((x, r) => x + r.lsEntries.length, 0), hpfMed: med(all.flatMap((r) => r.lsEntries.map((e) => e.hpf))), above50: all.flatMap((r) => r.lsEntries).filter((e) => e.hpf >= 0.5).length },
  zoneDmg_perMatch: Math.round(mean((r) => r.zoneDmg)), outTicks_perMatch: +mean((r) => r.outTicks).toFixed(1), npcDmg_perMatch: Math.round(mean((r) => r.npcDmg)),
  ffaLatched: all.filter((r) => r.ffaT >= 0).map((r) => ({ seed: r.seed, t: r.ffaT })),
  fightRangeGun_med: Math.round(med(all.flatMap((r) => r.fightRangeGun))), fightRangeLaser_med: Math.round(med(all.flatMap((r) => r.fightRangeLaser))),
  fightRangeGun_q: [0.1, 0.25, 0.5, 0.75, 0.9].map((q) => { const a = all.flatMap((r) => r.fightRangeGun).sort((x, y) => x - y); return a.length ? Math.round(a[Math.floor(q * (a.length - 1))]) : -1 }),
  fightRangeLaser_q: [0.1, 0.25, 0.5, 0.75, 0.9].map((q) => { const a = all.flatMap((r) => r.fightRangeLaser).sort((x, y) => x - y); return a.length ? Math.round(a[Math.floor(q * (a.length - 1))]) : -1 }),
  maxAttackers5_hist: all.reduce((h, r) => { h[r.maxAttackers5] = (h[r.maxAttackers5] || 0) + 1; return h }, {}),
  attackersAtDeath_hist: all.reduce((h, r) => { const k = r.last.length ? r.last[r.last.length - 1].na : 0; h[k] = (h[k] || 0) + 1; return h }, {}),
  deathMode: all.reduce((h, r) => { const l = r.last[r.last.length - 1]; const k = r.rec.alive ? 'alive' : `${l.mode}/${l.leg}/${l.st}`; h[k] = (h[k] || 0) + 1; return h }, {}),
  cubes60: +mean((r) => Math.max(0, r.cubes60)).toFixed(2), cubes120: +mean((r) => Math.max(0, r.cubes120)).toFixed(2),
  chargeT_perMatch: +mean((r) => r.chargeT).toFixed(1), chargeHeldFull_perMatch: +mean((r) => r.chargeHeldFullT).toFixed(1),
  counters: Object.fromEntries(Object.keys(all[0].counters || {}).map((k) => [k, +mean((r) => (r.counters || {})[k] || 0).toFixed(1)])),
  modeFlipsPerMin: +(all.reduce((x, r) => x + r.modeFlips, 0) / totalT * 60).toFixed(1), legFlipsPerMin: +(all.reduce((x, r) => x + r.legFlips, 0) / totalT * 60).toFixed(1),
  lates: all.reduce((x, r) => x + (r.rec.lates || 0), 0),
}
console.log(JSON.stringify(out, null, 1))
if (showDeaths) for (const r of all) {
  const l = r.last[r.last.length - 1]
  console.log(`seed ${r.seed} score ${r.rec.score} kills ${r.rec.kills} t=${r.rec.timeAlive} cause=${r.rec.cause}:${r.rec.killerName} firstDmg=${r.tFirstDmg.toFixed(1)} laser=${r.tLaser.toFixed(1)} LS=${JSON.stringify(r.lsEntries)} end=${l.mode}/${l.leg}/${l.st} na=${l.na} sp=${l.sp} stillUF=${r.stillUnderFire.toFixed(1)} idle=${r.idleStill.toFixed(1)} zone=${Math.round(r.zoneDmg)}`)
}
if (arg('json', null)) writeFileSync(arg('json'), JSON.stringify({ summary: out, matches: all.map((r) => ({ ...r, last: r.last.slice(-20) })) }))
process.exit(0)
