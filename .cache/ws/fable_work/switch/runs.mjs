import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2]))
for (const r of all) { let run = []; for (const f of r.frames) { if (f.findPathN) run.push(f); else { if (run.length >= 4) console.log('seed', r.seed, 't', run[0].t, 'len', run.length, run[0].m + '/' + run[0].lk, 'exp', run.map(f => f.exp).join(','), 'ok', run.map(f => f.pok).join(''), 'goal', run.slice(0, 4).map(f => f.gx + ':' + f.gy).join(' '), 'ms', run.map(f => f.findPathMs.toFixed(1)).join(',')); run = [] } } }
// same-goal replans detail
for (const r of all) { let prev = null; for (const f of r.frames) { if (!f.findPathN) continue; if (prev && f.t - prev.t < 1.95 && Math.hypot(f.gx - prev.gx, f.gy - prev.gy) <= 4 && f.t - prev.t > 0.11) console.log(' same', r.seed, prev.t, '->', f.t, prev.m + '/' + prev.lk, '->', f.m + '/' + f.lk, 'ok', prev.pok, f.pok, 'exp', prev.exp, f.exp); prev = f } }
