// Panel R2: calibrate ffa_mc.js against the replay's death timeline and re-test the headline result. Run: node calib.js
import { match, run } from './ffa_mc.js'
const INF = 1e9, H = { kind: 'hunter' }, EV = { kind: 'th', th: [INF, INF, 1.35, 1.25, 1.0] }
const DEF = { hide: 0.35, tauLos: 4, hunterHeal: 0.35, hunterResume: 0.8, seekSound: 1, lootRate: 1 / 35, lootCap: 4, killCubes: 0.5, jink: 0.6, ourSkill: 1.0, react: 1.0, bandLo: 70, bandHi: 110, chase: 1.0, lethal: 1.0 }
console.log('replay (older balance): death number 1/5/8/12/15 at 42 / 70 / 125 / 161 / 210 s')
for (const lethal of [1.0, 0.6, 0.45, 0.35]) {
  const par = { ...DEF, lethal }, ks = [1, 5, 8, 12, 15], acc = ks.map(() => 0), M = 300
  for (let k = 0; k < M; k++) { const r = match(1 + k * 7919, H, par), ts = []; for (let i = 0; i < 16; i++) if (!r.aliveEnd[i]) ts.push(r.deathTs[i]); ts.sort((a, b) => a - b); ks.forEach((q, n) => { acc[n] += ts[Math.min(q, ts.length) - 1] }) }
  const e = run(EV, 600, par), c = run(H, 600, par)
  const harsh = { ...par, bandLo: 40, bandHi: 70, chase: 1.25, hide: 1, jink: 1 }, eh = run(EV, 600, harsh), ch = run(H, 600, harsh)
  console.log(`lethal ${lethal}: deaths at ${acc.map(v => (v / M).toFixed(0)).join(' / ')} s | evader ${e.mean.toFixed(2)} ±${e.se.toFixed(2)} (top4 ${(e.top4 * 100).toFixed(0)}%, win ${(e.win * 100).toFixed(0)}%) vs clone ${c.mean.toFixed(2)} | harsh variant: evader ${eh.mean.toFixed(2)} ±${eh.se.toFixed(2)} vs clone ${ch.mean.toFixed(2)}`)
}
