// checkR4a timing report: per-decision minimum over 3 repetitions, aligned (same observations) SNAP4 vs H4; sim worst.
import { readFileSync, existsSync } from 'node:fs'
const O = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants_tools/r4a/tim'
const m = (n) => existsSync(`${O}/${n}.meta.json`) ? JSON.parse(readFileSync(`${O}/${n}.meta.json`, 'utf8')) : null
const q = (a, p) => { const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
const out = []; const ARM = process.argv[2] || 'H4'
let worstExtra = 0, worstH = 0, worstS = 0, maxPS = 0, maxExtraPS = 0, huntMax = 0, huntMean = 0, huntN = 0
for (const n of ['kit', 'l4800', 'l11', 'l23p', 'cfg1200', 'f1', 'f2', 'fz']) {
  const S = [1, 2, 3].map((r) => m(`SNAP4_${n}_r${r}`)).filter(Boolean), H = [1, 2, 3].map((r) => m(`${ARM}_${n}_r${r}`)).filter(Boolean)
  if (!S.length || !H.length) { out.push(`${n}: missing`); continue }
  const N = Math.min(S[0].ms.length, H[0].ms.length)
  const sMin = [], hMin = [], hk = []
  for (let i = 0; i < N; i++) { sMin.push(Math.min(...S.map((x) => x.ms[i]))); hMin.push(Math.min(...H.map((x) => x.ms[i]))); hk.push(Math.min(...H.map((x) => x.hms[i]))) }
  let ex = 0, exAt = -1, eps = 0
  for (let i = 0; i < N; i++) { const d = hMin[i] - sMin[i]; if (d > ex) { ex = d; exAt = i } const dp = H[0].ps[i] - S[0].ps[i]; if (dp > eps) eps = dp }
  const ws = Math.max(...sMin), wh = Math.max(...hMin)
  worstExtra = Math.max(worstExtra, ex); worstH = Math.max(worstH, wh); worstS = Math.max(worstS, ws); maxPS = Math.max(maxPS, ...H[0].ps); maxExtraPS = Math.max(maxExtraPS, eps)
  huntMax = Math.max(huntMax, ...hk); huntMean += hk.reduce((a, b) => a + b, 0); huntN += hk.length
  out.push(`${n.padEnd(8)} n ${N} | V4 snap p99 ${q(sMin, 0.99).toFixed(2)} max ${ws.toFixed(2)} | H p99 ${q(hMin, 0.99).toFixed(2)} max ${wh.toFixed(2)} | worst extra ${ex.toFixed(2)} ms at ${exAt} | A* max ${Math.max(...H[0].ps)} extra ${eps} | hunt hooks max ${Math.max(...hk).toFixed(2)} p99 ${q(hk, 0.99).toFixed(3)} | huntOn ${H[0].huntOn}/${N} fuse ${H.map((x) => x.fuse).join('/')}`)
}
out.push(`STREAMS: worst aligned extra ${worstExtra.toFixed(2)} ms; worst decision H ${worstH.toFixed(2)} vs V4 snapshot ${worstS.toFixed(2)} ms; A* per decision max ${maxPS} (extra ${maxExtraPS}); hunt hooks max ${huntMax.toFixed(2)} ms mean ${(huntMean / Math.max(1, huntN)).toFixed(4)} ms`)
out.unshift("arm " + ARM + " vs SNAP4 (fixed bot/lib)"); console.log(out.join("\n")); process.exit(0)
for (let s = 1; s <= 10; s++) { const a = m(`SNAP4_sq${s}`), b = m(`H4_sq${s}`); if (!a || !b) continue; sw = Math.max(sw, a.maxMs); hw = Math.max(hw, b.maxMs); sp = Math.max(sp, a.p99); hp = Math.max(hp, b.p99); hps = Math.max(hps, b.maxPath); hk = Math.max(hk, b.maxHuntMs)
  out.push(`sim sq${s}: V4 snap max ${a.maxMs.toFixed(2)} p99 ${a.p99.toFixed(2)} | H max ${b.maxMs.toFixed(2)} p99 ${b.p99.toFixed(2)} A* ${b.maxPath} hunt hooks max ${b.maxHuntMs.toFixed(2)} fuse ${b.fuse}`) }
out.push(`SIM: worst V4 snap ${sw.toFixed(2)} ms (p99 max ${sp.toFixed(2)}), worst H ${hw.toFixed(2)} ms (p99 max ${hp.toFixed(2)}), A* max ${hps}, hunt hooks max ${hk.toFixed(2)} ms`)
console.log(out.join('\n'))
