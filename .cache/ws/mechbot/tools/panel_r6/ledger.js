// Panel R6 reward economist: fight / lull ledger of a brain in the local simulator (behaviour only; the simulator's
// within-bot score deltas have had the wrong sign six times). Read-only on bot/, sim/ and variants/.
// bun ledger.js <from> <to>   env BOT = brain dir (default variants/V4/bot), OVR = overrides JSON, TAG = label
// Episode = mech contact (we hit a mech or a mech hit us) separated by >= 3 s of no mech contact. Per episode: entry hp,
// laser held, distinct attackers, kills, hp lost, damage dealt, death. Lull = from an episode's end to the next contact.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const BOT = process.env.BOT || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const TAG = process.env.TAG || 'V4'
const GAP = 3
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(BOT + '/lib/brain.js')
const { Nav } = await import(BOT + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const EP = [], LU = [], M = []
for (let seed = from; seed <= to; seed++) {
  let brain = null, lastT = 0, lastHp = -1, ep = null, lull = null, lastContact = -99
  const mt = { seed, regen: 0, healT: 0, heal70T: 0, cubes: 0, zoneHp: 0, npcHp: 0, outT: 0, crateHits: 0, droneHits: 0, lootT: 0, holdT: 0, idleFullT: 0 }
  const closeEp = (t, died) => {
    if (!ep) return
    ep.dur = +(Math.max(0, (died ? t : ep.last) - ep.t0)).toFixed(1); ep.died = died; ep.nAtt = ep.att.size; delete ep.att
    EP.push(ep); ep = null
    if (!died) lull = { seed, t0: lastContact, hp0: lastHp, maxHp0: 0, regen: 0, healT: 0, endBy: null, len: 0 }
  }
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, t = obs.t, s = obs.self
      const dt = lastHp < 0 ? 0 : t - lastT
      const hp = s ? s.hp : lastHp, maxHp = s ? s.max_hp : 1400
      let contact = false, gotCube = false, dmgIn = 0, dmgOut = 0, kills = 0
      const att = []
      if (Array.isArray(obs.events)) for (const e of obs.events) {
        if (!e) continue
        if (e.type === 'damaged') {
          if (Number.isInteger(e.by) && e.by < 100) { contact = true; dmgIn += e.amount; att.push(e.by) }
          else if (e.weapon === 'zone') mt.zoneHp += e.amount
          else if (e.weapon === 'npc') mt.npcHp += e.amount
          if (ep) ep.hpLost += e.amount
        }
        if (e.type === 'hit' && Number.isInteger(e.target)) {
          if (e.target < 100) { contact = true; dmgOut += e.amount } else if (e.target < 1000) mt.droneHits++; else mt.crateHits++
        }
        if (e.type === 'kill' && Number.isInteger(e.target) && e.target < 100) kills++
        if (e.type === 'pickup' || e.type === 'drop' || e.type === 'upgrade') gotCube = true
        if (e.type === 'pickup') mt.cubes = e.cubes
      }
      if (lastHp >= 0 && hp > lastHp && !gotCube) { mt.regen += hp - lastHp; if (lull) lull.regen += hp - lastHp }
      if (B.mode === 'HEAL') { mt.healT += dt; if (lull) lull.healT += dt }
      if (B.mode === 'LOOT') mt.lootT += dt
      if (B.mode === 'HOLD') { mt.holdT += dt; if (hp >= maxHp - 1) mt.idleFullT += dt }
      if (s && s.in_zone === false) mt.outT += dt
      if (contact) {
        if (lull) { lull.len = +(t - lull.t0).toFixed(1); lull.hp1 = hp; lull.maxHp = maxHp; lull.ours = dmgOut > 0 && dmgIn === 0; lull.healEver = lull.healT > 0; LU.push(lull); lull = null }
        if (ep && t - lastContact > GAP) closeEp(lastContact, false), (lull && (lull.len = +(t - lull.t0).toFixed(1), lull.hp1 = hp, lull.maxHp = maxHp, LU.push(lull), lull = null))
        if (!ep) {
          const ws = s && Array.isArray(s.weapons) ? s.weapons.filter(Boolean).map((w) => w.kind) : []
          ep = { seed, t0: +t.toFixed(1), hpf0: +((lastHp >= 0 ? lastHp : hp) / maxHp).toFixed(3), hp0: lastHp >= 0 ? lastHp : hp, laser: ws.includes('laser'), cubes0: mt.cubes, kills: 0, hpLost: dmgIn, dmgOut: 0, att: new Set(), last: t }
        }
        for (const id of att) ep.att.add(id)
        ep.dmgOut += dmgOut; ep.kills += kills; ep.last = t
        lastContact = t
      } else if (ep && kills) ep.kills += kills
      if (ep && t - lastContact > GAP) closeEp(lastContact, false)
      lastT = t; lastHp = hp
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  if (ep) closeEp(lastT, true)
  else if (lull) { lull.len = +(lastT - lull.t0).toFixed(1); lull.endBy = 'death-no-contact'; LU.push(lull); lull = null }
  mt.score = r.score; mt.kills = r.kills; mt.alive = +r.timeAlive.toFixed(1); mt.cause = r.cause
  for (const k of ['regen', 'healT', 'zoneHp', 'npcHp', 'outT', 'lootT', 'holdT', 'idleFullT']) mt[k] = +mt[k].toFixed(1)
  M.push(mt)
  console.log(JSON.stringify(mt))
}
// ---- summaries
const n = M.length, sum = (a, f) => a.reduce((x, r) => x + f(r), 0)
console.log(`== ${TAG} seeds ${from}-${to}: score ${(sum(M, (r) => r.score) / n).toFixed(2)}, alive ${(sum(M, (r) => r.alive) / n).toFixed(1)} s, kills ${(sum(M, (r) => r.kills) / n).toFixed(2)}, regen ${(sum(M, (r) => r.regen) / n).toFixed(0)} hp/match, HEAL ${(sum(M, (r) => r.healT) / n).toFixed(1)} s/match, HOLD ${(sum(M, (r) => r.holdT) / n).toFixed(1)} s (at full hp ${(sum(M, (r) => r.idleFullT) / n).toFixed(1)}), LOOT ${(sum(M, (r) => r.lootT) / n).toFixed(1)} s, outside zone ${(sum(M, (r) => r.outT) / n).toFixed(1)} s, zone hp ${(sum(M, (r) => r.zoneHp) / n).toFixed(0)}, drone hp ${(sum(M, (r) => r.npcHp) / n).toFixed(0)}, crate hits ${(sum(M, (r) => r.crateHits) / n).toFixed(1)}, drone hits ${(sum(M, (r) => r.droneHits) / n).toFixed(1)}`)
const bins = [[0, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.01]]
const row = (lab, a) => {
  if (!a.length) return `${lab.padEnd(30)} n   0`
  const k = sum(a, (e) => e.kills), d = sum(a, (e) => e.died ? 1 : 0), hl = sum(a, (e) => e.hpLost), du = sum(a, (e) => e.dur), out = sum(a, (e) => e.dmgOut)
  return `${lab.padEnd(30)} n ${String(a.length).padStart(3)}  kills/ep ${(k / a.length).toFixed(2)}  P(death) ${(d / a.length).toFixed(2)}  hp lost/ep ${(hl / a.length).toFixed(0).padStart(4)}  dur ${(du / a.length).toFixed(1).padStart(4)} s  out/in ${(out / Math.max(1, hl)).toFixed(2)}  hp per kill ${(hl / Math.max(1e-9, k)).toFixed(0)}  kills/s ${(k / Math.max(1e-9, du)).toFixed(3)}`
}
console.log('-- episodes by entry hp')
for (const [lo, hi] of bins) console.log(row(`entry hp ${Math.round(lo * 100)}-${Math.min(100, Math.round(hi * 100))}%`, EP.filter((e) => e.hpf0 >= lo && e.hpf0 < hi)))
console.log('-- episodes by attackers (distinct mechs that hit us)')
for (const [lo, hi, lab] of [[0, 1, '0 attackers'], [1, 2, '1 attacker'], [2, 3, '2 attackers'], [3, 99, '3+ attackers']]) console.log(row(lab, EP.filter((e) => e.nAtt >= lo && e.nAtt < hi)))
console.log('-- episodes by laser at entry')
console.log(row('laser held', EP.filter((e) => e.laser))); console.log(row('gun only', EP.filter((e) => !e.laser)))
console.log('-- episodes by entry hp x attackers <= 1 / >= 2')
for (const [lo, hi] of bins) { console.log(row(`  ${Math.round(lo * 100)}-${Math.min(100, Math.round(hi * 100))}% & <=1 att`, EP.filter((e) => e.hpf0 >= lo && e.hpf0 < hi && e.nAtt <= 1))); console.log(row(`  ${Math.round(lo * 100)}-${Math.min(100, Math.round(hi * 100))}% & >=2 att`, EP.filter((e) => e.hpf0 >= lo && e.hpf0 < hi && e.nAtt >= 2))) }
console.log('-- lulls (episode end -> next contact)')
const L = LU.slice().sort((a, b) => a.len - b.len)
const q = (p) => L.length ? L[Math.min(L.length - 1, Math.floor(p * L.length))].len : 0
console.log(`n ${L.length}; length p10 ${q(0.1)} p25 ${q(0.25)} p50 ${q(0.5)} p75 ${q(0.75)} p90 ${q(0.9)} s; mean ${(sum(L, (l) => l.len) / Math.max(1, L.length)).toFixed(1)} s; regen per lull ${(sum(L, (l) => l.regen) / Math.max(1, L.length)).toFixed(0)} hp; HEAL per lull ${(sum(L, (l) => l.healT) / Math.max(1, L.length)).toFixed(1)} s`)
for (const Lm of [5, 8, 10, 13, 15, 20, 25]) console.log(`  P(lull >= ${String(Lm).padStart(2)} s) = ${(L.filter((l) => l.len >= Lm).length / Math.max(1, L.length)).toFixed(2)}`)
const hl = L.filter((l) => l.hp0 / 1400 < 0.7)
const own = (a) => a.filter((l) => l.ours).length
console.log(`next contact opened by us (we hit first, not hit that tick): all ${own(L)}/${L.length}; lulls under 70% ${own(L.filter((l) => l.hp0 / 1400 < 0.7))}/${L.filter((l) => l.hp0 / 1400 < 0.7).length}; under 90% ${own(L.filter((l) => l.hp0 / 1400 < 0.9))}/${L.filter((l) => l.hp0 / 1400 < 0.9).length}`)
console.log(`lulls starting under 70% hp: ${hl.length}; mean length ${(sum(hl, (l) => l.len) / Math.max(1, hl.length)).toFixed(1)} s; regen ${(sum(hl, (l) => l.regen) / Math.max(1, hl.length)).toFixed(0)} hp; HEAL ${(sum(hl, (l) => l.healT) / Math.max(1, hl.length)).toFixed(1)} s`)
if (process.env.DUMP) { const fs = await import('node:fs'); fs.writeFileSync(process.env.DUMP, JSON.stringify({ M, EP, LU })) }
