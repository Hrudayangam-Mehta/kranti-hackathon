import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2]))
const F = all.flatMap(r => r.frames.map(f => ({ ...f, seed: r.seed })))
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const ms = F.map(f => f.ms)
console.log('decisions', F.length, 'p50', q(ms, .5).toFixed(2), 'p90', q(ms, .9).toFixed(2), 'p99', q(ms, .99).toFixed(2), 'p999', q(ms, .999).toFixed(2), 'max', Math.max(...ms).toFixed(1), 'mean', (ms.reduce((a, b) => a + b) / ms.length).toFixed(2))
if (F[0].cpu !== undefined) { const c = F.map(f => f.cpu); console.log('CPU ms/decision p50', q(c, .5).toFixed(2), 'p99', q(c, .99).toFixed(2), 'p999', q(c, .999).toFixed(2), 'max', Math.max(...c).toFixed(1), '| wall>10ms', F.filter(f => f.ms > 10).length, 'of which cpu<half wall (preempted)', F.filter(f => f.ms > 10 && f.cpu < f.ms / 2).length, '| heap drops (GC inside decision)', F.filter(f => f.h1 < f.h0 - 1e5).length, 'their wall ms max', Math.max(0, ...F.filter(f => f.h1 < f.h0 - 1e5).map(f => f.ms)).toFixed(1), 'cpu max', Math.max(0, ...F.filter(f => f.h1 < f.h0 - 1e5).map(f => f.cpu)).toFixed(1), 'heap max MB', (Math.max(...F.map(f => f.h1)) / 1e6).toFixed(1)) }
const st = {}
for (const f of F) for (const k in f.st) { (st[k] ||= []).push(f.st[k]) }
for (const k in st) console.log(' stage', k.padEnd(9), 'mean', (st[k].reduce((a, b) => a + b) / st[k].length).toFixed(3), 'p99', q(st[k], .99).toFixed(2), 'max', Math.max(...st[k]).toFixed(1))
const fp = F.filter(f => f.findPathN)
console.log('findPath decisions', fp.length, (100 * fp.length / F.length).toFixed(1) + '%', 'calls', fp.reduce((a, f) => a + f.findPathN, 0), 'ms mean', (fp.reduce((a, f) => a + f.findPathMs, 0) / fp.length).toFixed(2), 'max', Math.max(...fp.map(f => f.findPathMs)).toFixed(1), 'exp p50/p90/p99/max', q(fp.map(f => f.exp), .5), q(fp.map(f => f.exp), .9), q(fp.map(f => f.exp), .99), Math.max(...fp.map(f => f.exp)), 'fail', fp.filter(f => !f.pok).length, 'multi', fp.filter(f => f.findPathN > 1).length)
console.log('total ms', ms.reduce((a, b) => a + b).toFixed(0), 'findPath ms', fp.reduce((a, f) => a + f.findPathMs, 0).toFixed(0), 'walkLine ms', F.reduce((a, f) => a + (f.walkLineMs || 0), 0).toFixed(0), 'walkLine calls/dec', (F.reduce((a, f) => a + (f.walkLineN || 0), 0) / F.length).toFixed(1))
// by legkind
const by = {}
for (const f of fp) { const k = f.m + '/' + f.lk; (by[k] ||= { n: 0, exp: 0, ms: 0, mx: 0, fail: 0 }); by[k].n++; by[k].exp += f.exp; by[k].ms += f.findPathMs; by[k].mx = Math.max(by[k].mx, f.exp); if (!f.pok) by[k].fail++ }
const tot = {}; for (const f of F) { const k = f.m + '/' + f.lk; tot[k] = (tot[k] || 0) + 1 }
console.log('A* by mode/leg: n, share of leg decisions, mean exp, max exp, fails')
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].exp - a[1].exp).slice(0, 14)) console.log(' ', k.padEnd(22), v.n, (100 * v.n / tot[k]).toFixed(0) + '%', Math.round(v.exp / v.n), v.mx, v.fail)
// consecutive-decision A* runs (repeat planning)
let runs = [], cur = 0, ps = -1
for (const f of F) { if (f.seed !== ps) { if (cur) runs.push(cur); cur = 0; ps = f.seed } if (f.findPathN) cur++; else { if (cur) runs.push(cur); cur = 0 } }
console.log('A* run lengths (consecutive decisions): 1:', runs.filter(r => r === 1).length, '2-3:', runs.filter(r => r > 1 && r <= 3).length, '4-9:', runs.filter(r => r > 3 && r < 10).length, '10+:', runs.filter(r => r >= 10).length, 'max', Math.max(...runs))
// same-goal replans: goal within 4 m of the previous plan's goal within 2 s
let same = 0, prev = null, sameFail = 0
for (const f of fp) { if (prev && prev.seed === f.seed && f.t - prev.t < 1.95 && Math.hypot(f.gx - prev.gx, f.gy - prev.gy) <= 4) { same++; if (!prev.pok) sameFail++ } prev = f }
console.log('replans to the same goal (<=4 m) inside 2 s:', same, 'of which after a failed plan', sameFail)
// oscillation: mode ABA within 1 s, leg ABA within 1 s, target ABA, move reversal
const aba = (key, win) => { let n = 0; const tr = []; let ps = -1
  for (const f of F) { if (f.seed !== ps) { tr.length = 0; ps = f.seed } const v = f[key]; if (!tr.length || tr[tr.length - 1].v !== v) { tr.push({ v, t: f.t }); const L = tr.length; if (L >= 3 && tr[L - 3].v === v && f.t - tr[L - 2].t <= win) n++ } } return n }
console.log('ABA within 1 s: mode', aba('m', 1), 'leg', aba('lk', 1), 'target', aba('tg', 1), '| changes: mode', aba2('m'), 'leg', aba2('lk'), 'target', aba2('tg'))
function aba2(key) { let n = 0, p = null, ps = -1; for (const f of F) { if (f.seed === ps && f[key] !== p) n++; p = f[key]; ps = f.seed } return n }
let rev = 0, goalJump = 0, pf = null, still = 0, slowmv = 0
for (const f of F) { if (pf && pf.seed === f.seed) { const d = f.mx * pf.mx + f.my * pf.my, l1 = Math.hypot(f.mx, f.my), l0 = Math.hypot(pf.mx, pf.my); if (l1 > .5 && l0 > .5 && d / (l1 * l0) < -0.5) rev++; if (f.gX !== null && pf.gX !== null && Math.hypot(f.gX - pf.gX, f.gY - pf.gY) > 15) goalJump++ } if (Math.hypot(f.mx, f.my) < 0.05) still++; else if (Math.hypot(f.mx, f.my) < 0.45) slowmv++; pf = f }
console.log('stick reversals (>120 deg between decisions):', rev, (100 * rev / F.length).toFixed(1) + '%', 'goal jumps > 15 m:', goalJump, 'still decisions', (100 * still / F.length).toFixed(1) + '%', 'silent-stick', (100 * slowmv / F.length).toFixed(1) + '%')
const top = [...F].sort((a, b) => b.ms - a.ms).slice(0, 12)
for (const f of top) console.log(' slow', f.seed, f.t, f.ms.toFixed(1), 'cpu', (f.cpu ?? -1).toFixed(1), 'gc', f.h1 < f.h0 - 1e5 ? 1 : 0, f.m + '/' + f.lk, 'A*', f.findPathN || 0, 'exp', f.exp || 0, (f.findPathMs || 0).toFixed(1), Object.entries(f.st).filter(e => e[1] > 1).map(e => e[0] + ':' + e[1].toFixed(1)).join(' '))
const legs = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 14).map(e => e[0] + ' ' + (100 * e[1] / F.length).toFixed(1) + '%').join(', '); console.log('leg share:', legs)
