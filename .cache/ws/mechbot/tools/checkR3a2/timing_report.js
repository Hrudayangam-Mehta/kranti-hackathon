// checkR3a2: timing report from out/tim. Per stream: per-decision minimum over 3 repetitions for V1 and SNAP (same
// observations), worst V1, worst (V1 - SNAP) per decision, p99 of the delta, and path searches (V1, SNAP, worst delta).
import { readFileSync, existsSync } from 'node:fs'
const O = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/checkR3a2/out/tim'
const m = (n) => existsSync(`${O}/${n}.meta.json`) ? JSON.parse(readFileSync(`${O}/${n}.meta.json`, 'utf8')) : null
const q = (a, p) => { const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
const rows = []
let gWorstV1 = 0, gWorstRaw = 0, gWorstSnap = 0, gDelta = -Infinity, gPathV1 = 0, gPathSnap = 0, gPathDelta = -Infinity, gP99 = 0
for (const n of ['kit', 'l4800', 'l11', 'l23p', 'cfg1200', 'f1', 'f2', 'f3', 'f4', 'fz']) for (const env of ['auto', 'squad']) {
  const V = [1, 2, 3].map((r) => m(`V1_${n}_${env}_r${r}`)), Sn = [1, 2, 3].map((r) => m(`SNAP_${n}_${env}_r${r}`))
  if (V.some((x) => !x) || Sn.some((x) => !x)) { rows.push(`${n}_${env}: missing`); continue }
  const len = Math.min(V[0].ms.length, Sn[0].ms.length)
  const vmin = [], smin = [], d = []
  let pd = -Infinity, pv = 0, psn = 0
  for (let i = 0; i < len; i++) {
    const a = Math.min(V[0].ms[i], V[1].ms[i], V[2].ms[i]), b = Math.min(Sn[0].ms[i], Sn[1].ms[i], Sn[2].ms[i])
    vmin.push(a); smin.push(b); d.push(a - b)
    pd = Math.max(pd, V[0].ps[i] - Sn[0].ps[i]); pv = Math.max(pv, V[0].ps[i]); psn = Math.max(psn, Sn[0].ps[i])
  }
  const raw = Math.max(...V.map((x) => x.maxMs)), wv = Math.max(...vmin), ws = Math.max(...smin), wd = Math.max(...d), p99d = q(d, 0.99)
  gWorstV1 = Math.max(gWorstV1, wv); gWorstRaw = Math.max(gWorstRaw, raw); gWorstSnap = Math.max(gWorstSnap, ws); gDelta = Math.max(gDelta, wd); gP99 = Math.max(gP99, q(vmin, 0.99))
  gPathV1 = Math.max(gPathV1, pv); gPathSnap = Math.max(gPathSnap, psn); gPathDelta = Math.max(gPathDelta, pd)
  rows.push(`${(n + '_' + env).padEnd(14)} n ${String(len).padStart(5)} | V1 worst ${wv.toFixed(2)} (raw ${raw.toFixed(2)}) p99 ${q(vmin, 0.99).toFixed(2)} | 5.02 worst ${ws.toFixed(2)} p99 ${q(smin, 0.99).toFixed(2)} | delta worst ${wd.toFixed(2)} p99 ${p99d.toFixed(2)} | paths V1 ${pv} 5.02 ${psn} delta ${pd}`)
}
const sims = []
for (const s of ['sq1', 'sq2', 'sq3', 'sq4', 'sq5', 'sq6', 'sq7', 'sq8', 'sq9', 'sq10', 'ff411', 'ff412', 'ff413', 'ff414']) {
  const a = m(`V1_${s}`), b = m(`SNAP_${s}`)
  if (!a || !b) { sims.push(`${s}: missing`); continue }
  sims.push(`${s.padEnd(6)} V1 n ${a.n} worst ${a.maxMs.toFixed(2)} p99 ${a.p99.toFixed(2)} paths max ${a.maxPath} | 5.02 n ${b.n} worst ${b.maxMs.toFixed(2)} p99 ${b.p99.toFixed(2)} paths max ${b.maxPath}`)
  gPathV1 = Math.max(gPathV1, a.maxPath); gPathSnap = Math.max(gPathSnap, b.maxPath); gWorstRaw = Math.max(gWorstRaw, a.maxMs)
}
console.log(rows.join('\n'))
console.log(sims.join('\n'))
console.log(`\nSUMMARY streams (per-decision min of 3): V1 worst ${gWorstV1.toFixed(2)} ms (5.02 ${gWorstSnap.toFixed(2)}), worst p99 ${gP99.toFixed(2)}; worst extra per decision ${gDelta.toFixed(2)} ms; ` +
  `worst single raw V1 decision incl. simulator ${gWorstRaw.toFixed(2)} ms; path searches per decision max V1 ${gPathV1} / 5.02 ${gPathSnap}, worst extra ${gPathDelta}`)
