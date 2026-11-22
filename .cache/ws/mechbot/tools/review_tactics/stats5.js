// Review tool: when does the brain break off a fight? Every FIGHT -> DISENGAGE / HEAL transition over N squad
// matches with our hp fraction, the number of mechs with a line of fire (nLos) and the target's hp fraction,
// checked against doctrine D3 (LOSING: 1 threat hp<35% and target >= ours+0.10; 2: <50%; 3-5: <60%; 6+: always).
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '40'), 10)
const S = { tr: 0, byN: {}, d3ok: 0, hpSum: 0, one: 0, oneHp: 0, oneAbove35: 0, oneAbove70: 0, contact1: 0, contact1NotFight: 0, contactAny: 0, contactNotFight: 0, healthyNotFight: 0, healthy: 0, score: 0,
  fightDist: [0, 0, 0, 0, 0, 0], fightTicks: 0 }
const losing = (hpf, nThr, thpf, finish) => !finish && ((nThr <= 1 && hpf < 0.35 && thpf >= hpf + 0.10) || (nThr === 2 && hpf < 0.5) || (nThr >= 3 && nThr <= 5 && hpf < 0.6) || nThr >= 6)
for (let s = seed0; s < seed0 + n; s++) {
  const hook = (row, obs, a, B) => { const tg = B.target; row.thpf = tg ? tg.hp / tg.maxHp : 1; row.finish = !!(tg && tg.hp / tg.maxHp < 0.2 && B.nLos <= 2); row.tNpc = !!(tg && tg.npc); row.gunOnly = !B.me.weapons[1] }
  const { rows, rec } = await runTrace(s, { hook })
  S.score += rec.score
  let prev = null
  for (const r of rows) {
    if (prev && prev.mode === 'FIGHT' && (r.mode === 'DISENGAGE' || r.mode === 'HEAL') && r.tgt >= 0 && !r.tNpc) {
      S.tr++; S.hpSum += r.hpf
      const k = Math.min(r.nLos, 3)
      S.byN[k] = S.byN[k] || { n: 0, hp: 0, ok: 0 }
      S.byN[k].n++; S.byN[k].hp += r.hpf
      const ok = losing(r.hpf, r.nLos, r.thpf, r.finish)
      if (ok) { S.d3ok++; S.byN[k].ok++ }
      if (r.nLos <= 1) { S.one++; S.oneHp += r.hpf; if (r.hpf >= 0.35) S.oneAbove35++; if (r.hpf >= 0.7) S.oneAbove70++ }
    }
    // contact = a listed mech target that has a line on us right now
    if (r.tgt >= 0 && !r.tNpc && r.tListed && r.losInAge <= 0.15) {
      S.contactAny++
      const lose = losing(r.hpf, r.nLos, r.thpf, r.finish)
      if (!lose) { S.healthy++; if (r.mode === 'DISENGAGE' || r.mode === 'HEAL') S.healthyNotFight++ }
      if (r.mode === 'FIGHT' && r.tLosOut && r.gunOnly && r.st !== 'LAST-STAND') { S.fightTicks++; S.fightDist[r.td < 55 ? 0 : r.td < 95 ? 1 : r.td < 125 ? 2 : r.td < 160 ? 3 : r.td < 200 ? 4 : 5]++ }
    }
    prev = r
  }
}
const f = (a, b, d = 2) => (b ? (a / b).toFixed(d) : 'n/a')
console.log(JSON.stringify({ matches: n, meanScore: f(S.score, n),
  'FIGHT -> DISENGAGE/HEAL transitions (mech target)': S.tr, 'mean own hp fraction at the transition': f(S.hpSum, S.tr), 'transitions that D3 would call LOSING': S.d3ok,
  'by mechs with a line of fire [n, mean hp fraction, D3-LOSING]': Object.fromEntries(Object.entries(S.byN).map(([k, v]) => [k === '3' ? '3+' : k, [v.n, f(v.hp, v.n), v.ok]])),
  'with at most one mech having a line': S.one, 'of those at hp >= 35%': S.oneAbove35, 'of those at hp >= 70%': S.oneAbove70,
  'decisions in contact (listed mech target with a line on us)': S.contactAny, 'of those where D3 says NOT losing': S.healthy, 'of those spent in DISENGAGE or HEAL': S.healthyNotFight,
  'gun-only FIGHT decisions with a line, by range [<55, 55-95, 95-125, 125-160, 160-200, >200]': S.fightDist.map((v) => f(v, S.fightTicks)),
}, null, 1))
process.exit(0)
