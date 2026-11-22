// Panel R7 game lens: match-arc logger (behaviour only; never rank builds by the simulator).
// bun arc.js <from> <to>   env BOT = brain dir (default variants/V4/bot), OVR = overrides JSON
// Per match: tier of every house death before ours (time, killer, weapon), our death (time, zone phase, killer tier,
// hunters assigned), and per-decision state shares by our kill count k (mode, hp, laser, lines n1, nLos).
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const BOT = process.env.BOT || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 4)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(BOT + '/lib/brain.js')
const { Nav } = await import(BOT + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const phases = ctx.cfg.zone.phases
const zEnd = []; { let t = 0; for (const p of phases) { t += p.hold_s + p.shrink_s; zEnd.push(t) } }
const zoneTotal = zEnd[zEnd.length - 1]
const phaseAt = (t) => { for (let i = 0; i < zEnd.length; i++) if (t < zEnd[i]) return i + 1; return zEnd.length + 1 }
const S = {}   // k -> { n, mode counts, hpSum, laser, n1Sum, nLosSum, n2 }
const Z = { dec: 0, zone: 0, zoneContact: 0, zoneTarget: 0, outDec: 0, zoneHp: 0, mechHpInZoneMode: 0, mechHpAll: 0, contactDec: 0 }
const out = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, lastT = 0, laserT = -1, firstHostT = -1, firstHitOut = -1
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, t = obs.t, s = obs.self
      const k = Math.max(0, 16 - (obs.alive | 0)), kk = Math.min(k, 6)
      const row = S[kk] || (S[kk] = { n: 0, modes: {}, hp: 0, laser: 0, n1: 0, nLos: 0, two: 0, t: 0 })
      row.n++; row.modes[B.mode] = (row.modes[B.mode] || 0) + 1; row.hp += s ? s.hp / s.max_hp : 0
      row.laser += B.me.laser ? 1 : 0; row.n1 += B.n1; row.nLos += B.nLos; row.two += B.n1 >= 2 ? 1 : 0; row.t += t
      if (t < 115) {
        Z.dec++
        const contact = B.nLos >= 1 || t - B.me.lastHurtT <= 1
        if (contact) Z.contactDec++
        if (B.mode === 'ZONE') { Z.zone++; if (contact) Z.zoneContact++; if (B.target && !B.target.npc) Z.zoneTarget++ }
        if (s && s.in_zone === false) Z.outDec++
        if (Array.isArray(obs.events)) for (const e of obs.events) if (e && e.type === 'damaged') {
          if (e.weapon === 'zone') Z.zoneHp += e.amount
          else if (Number.isInteger(e.by) && e.by < 100) { Z.mechHpAll += e.amount; if (B.mode === 'ZONE') Z.mechHpInZoneMode += e.amount }
        }
      }
      if (laserT < 0 && B.me.laser) laserT = t
      if (firstHostT < 0 && Array.isArray(obs.events) && obs.events.some((e) => e && e.type === 'damaged' && Number.isInteger(e.by) && e.by < 100)) firstHostT = t
      if (firstHitOut < 0 && Array.isArray(obs.events) && obs.events.some((e) => e && e.type === 'hit' && Number.isInteger(e.target) && e.target < 100)) firstHitOut = t
      lastT = t
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad', trace: true, keep: true }, ctx, { team, opponents: [] })
  const tr = r.trace, slot = r.slot
  const tiers = tr.tiers.map((nm) => String(nm).replace(/^squad:/, ''))
  const dT = r.timeAlive
  const before = tr.deaths.filter((d) => d.id !== slot && d.t <= dT + 1e-6).map((d) => ({ t: +d.t.toFixed(1), tier: tiers[d.id], byUs: d.by === slot, w: d.weapon }))
  const rec = { seed, score: r.score, kills: r.kills, death: +dT.toFixed(1), frac: +(dT / zoneTotal).toFixed(3), phase: phaseAt(dT), cause: r.cause,
    killer: r.killedBy !== null && r.killedBy < 16 ? tiers[r.killedBy] : r.killedBy === null ? 'zone' : 'npc', killerRole: r.killerRole, hunters: r.hunters,
    laserT: laserT < 0 ? null : +laserT.toFixed(1), firstHurtT: firstHostT < 0 ? null : +firstHostT.toFixed(1), firstHitT: firstHitOut < 0 ? null : +firstHitOut.toFixed(1),
    cubes: r.cubes, upgrades: r.upgrades, before }
  out.push(rec)
  console.log(JSON.stringify(rec))
}
console.log('== by our kill count k (decision shares)')
for (const k of Object.keys(S).sort((a, b) => a - b)) {
  const r = S[k], m = Object.entries(r.modes).map(([a, b]) => `${a} ${(b / r.n * 100).toFixed(0)}%`).join(' ')
  console.log(`k=${k}${k == 6 ? '+' : ''} dec ${r.n} meanT ${(r.t / r.n).toFixed(1)} hpf ${(r.hp / r.n).toFixed(2)} laser ${(r.laser / r.n).toFixed(2)} n1 ${(r.n1 / r.n).toFixed(2)} P(n1>=2) ${(r.two / r.n).toFixed(2)} nLos ${(r.nLos / r.n).toFixed(2)} | ${m}`)
}
console.log(`== t<115 s: decisions ${Z.dec}; ZONE ${(Z.zone / Z.dec * 100).toFixed(1)}% of decisions; ZONE in contact ${(Z.zoneContact / Z.dec * 100).toFixed(1)}% (= ${(Z.zoneContact / Math.max(1, Z.contactDec) * 100).toFixed(1)}% of contact decisions); ZONE with a mech target ${(Z.zoneTarget / Z.dec * 100).toFixed(1)}%; outside zone ${(Z.outDec / Z.dec * 100).toFixed(1)}%; zone hp ${(Z.zoneHp / (to - from + 1)).toFixed(0)}/match; mech hp taken in ZONE mode ${(Z.mechHpInZoneMode / Math.max(1, Z.mechHpAll) * 100).toFixed(1)}% of ${(Z.mechHpAll / (to - from + 1)).toFixed(0)}/match`)
const fs = await import('node:fs')
fs.writeFileSync(P + `/tools/panel_r7/game/arc_${process.env.TAG || 'v4'}_${from}_${to}.json`, JSON.stringify({ out, S, Z }))
