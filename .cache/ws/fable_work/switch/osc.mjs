import { readFileSync } from 'node:fs'
const all = [...JSON.parse(readFileSync('p16.json')), ...JSON.parse(readFileSync('p28.json'))]
const pairs = {}, dw = {}, tgt = []; let N = 0, mt = 0
for (const r of all) { const tr = []; let last = null, since = 0, lt = null, lts = 0
  for (const f of r.frames) { N++; const v = f.m + '/' + f.lk
    if (v !== last) { if (last !== null) { (dw[last] ||= []).push(f.t - since) } tr.push({ v, t: f.t }); const L = tr.length; if (L >= 3 && tr[L - 3].v === v && f.t - tr[L - 2].t <= 1) { const k = [v, tr[L - 2].v].sort().join(' <> '); pairs[k] = (pairs[k] || 0) + 1 } last = v; since = f.t }
    if (f.tg !== lt) { if (lt !== null && lt >= 0) tgt.push(f.t - lts); lt = f.tg; lts = f.t } }
  mt += r.frames.length / 10 }
console.log('matches', all.length, 'match-seconds', mt.toFixed(0))
console.log('leg ABA within 1 s by pair (per match):'); for (const [k, v] of Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log('  ', k, v, (v / all.length).toFixed(1))
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * s.length)] }
console.log('dwell per leg kind (s): n, p25, p50, share of dwells <= 0.3 s'); for (const [k, v] of Object.entries(dw).sort((a, b) => b[1].length - a[1].length).slice(0, 14)) console.log('  ', k.padEnd(20), v.length, q(v, .25).toFixed(1), q(v, .5).toFixed(1), (100 * v.filter(x => x <= 0.31).length / v.length).toFixed(0) + '%')
console.log('target holds: n', tgt.length, 'p25', q(tgt, .25).toFixed(1), 'p50', q(tgt, .5).toFixed(1), '<=0.3 s', (100 * tgt.filter(x => x <= 0.31).length / tgt.length).toFixed(0) + '%')
// stick reversal by leg
const rv = {}; const cnt = {}; for (const r of all) { let p = null; for (const f of r.frames) { const k = f.m + '/' + f.lk; cnt[k] = (cnt[k] || 0) + 1; if (p) { const l1 = Math.hypot(f.mx, f.my), l0 = Math.hypot(p.mx, p.my); if (l1 > .5 && l0 > .5 && (f.mx * p.mx + f.my * p.my) / (l1 * l0) < -0.5) rv[k] = (rv[k] || 0) + 1 } p = f } }
console.log('stick reversals by leg (n, per 100 decisions of that leg):', Object.entries(rv).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + v + ' ' + (100 * v / cnt[k]).toFixed(1)).join('; '))
// still (pause) by mode
const stl = {}; for (const r of all) for (const f of r.frames) { if (Math.hypot(f.mx, f.my) < 0.05) { const k = f.m + '/' + f.lk; stl[k] = (stl[k] || 0) + 1 } }
console.log('still decisions by leg:', Object.entries(stl).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + v + ' (' + (100 * v / cnt[k]).toFixed(0) + '%)').join('; '))
