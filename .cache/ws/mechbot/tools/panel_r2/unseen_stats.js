// Replay check 1 for the belief module: once a mech drops out of an observer's knowledge, how far does it get?
// "seen" = protocol vision rule (120 deg / 200 m wedge or 45 m, eye -> centre or top, canopy). "tracked" = seen in
// the last 5 s (server memory gives the TRUE position during that time). Old balance in the replay: walk 9.0 m/s
// (today 11.7), so distances are also printed as a multiple of walk speed x time.
import { loadWorld, loadNav, loadReplay, sees, pct, mean, fmt, angDiff, MX, MY, MZ, MYAW, MHP, MFL } from './common.js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { HERE } from './common.js'
const w = loadWorld(), R = loadReplay()
const ids = R.ids, nf = R.nf, NI = ids.length
const VWALK_REPLAY = 9.0
// ---- visibility matrix
const t0 = performance.now()
const vis = {}
let pairs = 0, seenFrames = 0, bothAlive = 0
for (const o of ids) for (const t of ids) {
  if (o === t) continue
  const v = new Uint8Array(nf)
  const A = R.m[o], B = R.m[t]
  for (let k = 0; k < nf; k++) {
    if (!A[k] || !B[k]) continue
    bothAlive++
    if (sees(w, A[k], B[k])) { v[k] = 1; seenFrames++ }
  }
  vis[o * 16 + t] = v; pairs++
}
console.log(`visibility matrix: ${pairs} ordered pairs, ${nf} frames, ${(performance.now() - t0).toFixed(0)} ms; an alive pair has sight ${fmt(100 * seenFrames / bothAlive)}% of the time`)
// per observer: how many others are seen / tracked (5 s memory) / unknown, averaged over its life
let sSeen = 0, sTrk = 0, sUnk = 0, sN = 0
const lastSeen = {}
for (const o of ids) {
  const ls = {}; for (const t of ids) ls[t] = -1e9
  for (let k = 0; k < nf; k++) {
    if (!R.m[o][k]) continue
    let a = 0, b = 0, c = 0
    for (const t of ids) {
      if (t === o || !R.m[t][k]) continue
      if (vis[o * 16 + t][k]) { ls[t] = k; a++ } else if (k - ls[t] <= 50) b++; else c++
    }
    sSeen += a; sTrk += b; sUnk += c; sN++
  }
}
console.log(`per observer-frame: in sight ${fmt(sSeen / sN, 2)}, in 5 s memory ${fmt(sTrk / sN, 2)}, untracked ${fmt(sUnk / sN, 2)} other live mechs`)
// ---- sight-loss episodes: last seen frame k0 (vis 1 -> 0), until seen again / death / end
const eps = []
for (const o of ids) for (const t of ids) {
  if (o === t) continue
  const v = vis[o * 16 + t], A = R.m[o], B = R.m[t]
  for (let k = 1; k < nf; k++) {
    if (v[k - 1] && !v[k] && A[k] && B[k]) {
      let e = k
      while (e < nf && !v[e] && A[e] && B[e]) e++
      const reappear = e < nf && A[e] && B[e] && v[e]
      eps.push({ o, t, k0: k - 1, k1: e, reappear })
    }
  }
}
const durs = eps.map(e => (e.k1 - e.k0) / 10)
console.log(`sight-loss episodes: ${eps.length}; unseen duration p50 ${fmt(pct(durs, .5))} s p75 ${fmt(pct(durs, .75))} p90 ${fmt(pct(durs, .9))}; share lasting > 5 s (track really lost) ${fmt(100 * durs.filter(d => d > 5).length / durs.length)}%; end by re-sighting ${fmt(100 * eps.filter(e => e.reappear).length / eps.length)}%`)
// displacement from the last seen position after tau s unseen
function disp(eps, from, taus) {
  for (const tau of taus) {
    const d = [], dn = []
    for (const e of eps) {
      const ka = e.k0 + from, kb = ka + Math.round(tau * 10)
      if (kb >= e.k1) continue                     // still unseen at that time
      const a = R.m[e.t][ka], b = R.m[e.t][kb]
      if (!a || !b) continue
      const x = Math.hypot(b[MX] - a[MX], b[MY] - a[MY]); d.push(x); dn.push(x / (VWALK_REPLAY * tau))
    }
    console.log(`  after ${tau} s: n=${d.length}  displacement p10 ${fmt(pct(d, .1))} p50 ${fmt(pct(d, .5))} p90 ${fmt(pct(d, .9))} max ${fmt(Math.max(...d))} m ; as a fraction of walk speed x time p50 ${fmt(pct(dn, .5), 2)} p90 ${fmt(pct(dn, .9), 2)} max ${fmt(Math.max(...dn), 2)} ; share within 16 m of the last position ${fmt(100 * d.filter(x => x <= 16).length / d.length)}% ; scaled to today's walk speed p50 ${fmt(pct(d, .5) * 1.3)} p90 ${fmt(pct(d, .9) * 1.3)} m`)
  }
}
console.log('displacement from the LAST SEEN position (no memory):')
disp(eps, 0, [2, 5, 10, 20])
const lost = eps.filter(e => e.k1 - e.k0 > 50)
console.log(`displacement from the LAST KNOWN position (end of the 5 s memory), episodes longer than 5 s: ${lost.length}`)
disp(lost, 50, [2, 5, 10, 20])
// direction of travel relative to the observer: does the lost mech come closer (pursuit) or go away?
for (const tau of [5, 10]) {
  let closer = 0, away = 0, n = 0; const dr = []
  for (const e of lost) {
    const ka = e.k0 + 50, kb = ka + tau * 10
    if (kb >= e.k1) continue
    const a = R.m[e.t][ka], b = R.m[e.t][kb], oa = R.m[e.o][ka], ob = R.m[e.o][kb]
    if (!a || !b || !oa || !ob) continue
    const d0 = Math.hypot(a[MX] - oa[MX], a[MY] - oa[MY]), d1 = Math.hypot(b[MX] - ob[MX], b[MY] - ob[MY])
    dr.push(d1 - d0); n++; if (d1 < d0 - 8) closer++; else if (d1 > d0 + 8) away++
  }
  console.log(`  range change over ${tau} s untracked: closer by > 8 m ${fmt(100 * closer / n)}%, farther by > 8 m ${fmt(100 * away / n)}%, median change ${fmt(pct(dr, .5))} m (n=${n})`)
}
// where does it reappear, relative to the last known position and to the speed-limited disc?
{
  const rows = []
  for (const e of lost) {
    if (!e.reappear) continue
    const a = R.m[e.t][e.k0 + 50], b = R.m[e.t][e.k1], o = R.m[e.o][e.k1]
    const tau = (e.k1 - e.k0 - 50) / 10
    const d = Math.hypot(b[MX] - a[MX], b[MY] - a[MY])
    const bearErr = Math.abs(angDiff(Math.atan2(b[MY] - o[MY], b[MX] - o[MX]), Math.atan2(a[MY] - o[MY], a[MX] - o[MX]))) * 180 / Math.PI
    const inWedge = Math.abs(angDiff(Math.atan2(b[MY] - o[MY], b[MX] - o[MX]), o[MYAW])) <= Math.PI / 3
    rows.push({ tau, d, frac: d / (VWALK_REPLAY * tau), bearErr, range: Math.hypot(b[MX] - o[MX], b[MY] - o[MY]), inWedge })
  }
  console.log(`re-sightings after a real track loss: ${rows.length}; untracked time p50 ${fmt(pct(rows.map(r => r.tau), .5))} s p90 ${fmt(pct(rows.map(r => r.tau), .9))} s`)
  console.log(`  distance from last known position at re-sighting p50 ${fmt(pct(rows.map(r => r.d), .5))} p90 ${fmt(pct(rows.map(r => r.d), .9))} m; inside the walk-speed disc ${fmt(100 * rows.filter(r => r.frac <= 1).length / rows.length)}%, inside 0.5 x disc ${fmt(100 * rows.filter(r => r.frac <= .5).length / rows.length)}%, inside 1.67 x (boost) ${fmt(100 * rows.filter(r => r.frac <= 1.67).length / rows.length)}%`)
  console.log(`  bearing of the re-sighting vs bearing of the last known position: within 30 deg ${fmt(100 * rows.filter(r => r.bearErr <= 30).length / rows.length)}%, within 60 deg ${fmt(100 * rows.filter(r => r.bearErr <= 60).length / rows.length)}%, median ${fmt(pct(rows.map(r => r.bearErr), .5))} deg; range at re-sighting p50 ${fmt(pct(rows.map(r => r.range), .5))} m; by proximity sensor (< 45 m) ${fmt(100 * rows.filter(r => r.range <= 45).length / rows.length)}%`)
}
// ---- first-hit analysis: when a mech takes its first damage from an attacker (no damage from that attacker in the previous 10 s),
// did the victim know where the attacker was?
{
  const lastHit = {}; let n = 0, seen = 0, mem = 0, unk = 0, never = 0; const ageUnk = [], rear = { seen: 0, mem: 0, unk: 0 }
  const everSeen = {}
  // build last seen frame lookup lazily
  const ls = {}
  for (const o of ids) for (const t of ids) { if (o === t) continue; const v = vis[o * 16 + t]; const a = new Int32Array(nf); let last = -1e6; for (let k = 0; k < nf; k++) { if (v[k]) last = k; a[k] = last } ls[o * 16 + t] = a }
  for (const e of R.events) {
    if (e.e !== 'hit' || e.src >= 100 || e.dst >= 100 || e.src === e.dst || e.w === 'zone') continue
    const key = e.src * 16 + e.dst
    const prev = lastHit[key] ?? -1e9; lastHit[key] = e.t
    if (e.t - prev < 200) continue           // 10 s in ticks
    const k = Math.min(nf - 1, Math.max(0, Math.round(e.t / 2) - 1))
    const V = R.m[e.dst][k], A = R.m[e.src][k]
    if (!V || !A) continue
    n++
    const l = ls[e.dst * 16 + e.src][k]
    const bearing = Math.atan2(A[MY] - V[MY], A[MX] - V[MX])
    const isRear = Math.abs(angDiff(bearing, V[MYAW])) > Math.PI / 2
    if (l === k) { seen++; if (isRear) rear.seen++ } else if (k - l <= 50) { mem++; if (isRear) rear.mem++ } else { unk++; if (isRear) rear.unk++; if (l < 0) never++; else ageUnk.push((k - l) / 10) }
  }
  console.log(`\nfirst hit of an engagement (attacker had not hit this victim for 10 s): ${n}`)
  console.log(`  victim had the attacker in sight ${fmt(100 * seen / n)}%, in 5 s memory ${fmt(100 * mem / n)}%, UNTRACKED ${fmt(100 * unk / n)}% (never seen before ${never}, median time since last seen ${fmt(pct(ageUnk, .5))} s)`)
  console.log(`  hit landed outside the victim's 180 deg front arc: in sight ${rear.seen}/${seen}, memory ${rear.mem}/${mem}, untracked ${rear.unk}/${unk}`)
}
writeFileSync(join(HERE, 'out_vis.bin'), Buffer.concat(ids.flatMap(o => ids.filter(t => t !== o).map(t => Buffer.from(vis[o * 16 + t])))))
console.log('visibility matrix cached to out_vis.bin')
