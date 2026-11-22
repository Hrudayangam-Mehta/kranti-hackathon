import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2]))
const F = all.flatMap(r => r.frames.map(f => ({ ...f, seed: r.seed })))
for (const f of [...F].sort((a, b) => b.cpu - a.cpu).slice(0, 14)) console.log('cpu', f.cpu.toFixed(1), 'wall', f.ms.toFixed(1), 'seed', f.seed, 't', f.t, f.m + '/' + f.lk, 'A*', f.findPathN || 0, 'exp', f.exp || 0, 'fpMs', (f.findPathMs || 0).toFixed(1), 'wl', f.walkLineN || 0, 'nm', f.nm, Object.entries(f.st).filter(e => e[1] > 1).map(e => e[0] + ':' + e[1].toFixed(1)).join(' '))
// cpu per expansion
const fp = F.filter(f => f.exp > 3000 && f.findPathMs < f.cpu * 1.2); console.log('ms per 1000 expansions (unpreempted):', fp.map(f => (1000 * f.findPathMs / f.exp).toFixed(2)).join(' '))
// first-decision / early decisions
for (const r of all.slice(0, 3)) console.log('seed', r.seed, 'first 6 cpu', r.frames.slice(0, 6).map(f => f.cpu.toFixed(1)).join(' '))
// sense-stage heavy: by nm
const hs = F.filter(f => f.st.sense > 2 && f.cpu > 2); console.log('sense > 2 ms with cpu > 2:', hs.length, 'of', F.length, 'median nm', hs.map(f => f.nm).sort((a, b) => a - b)[hs.length >> 1])
const hm = F.filter(f => f.st.mode > 1 && f.cpu > 1.5); console.log('mode stage > 1 ms (hide search):', hm.length, 'max cpu', Math.max(...hm.map(f => f.cpu)).toFixed(1))
const hl = F.filter(f => f.st.legs > 1 && f.cpu > 1.5 && !f.findPathN); console.log('legs > 1 ms without A* (posEval):', hl.length, 'max cpu', Math.max(...hl.map(f => f.cpu)).toFixed(1), [...new Set(hl.map(f => f.lk))].join(','))
