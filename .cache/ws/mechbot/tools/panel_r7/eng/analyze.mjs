// Panel R7 eng: summarise drive.mjs output (behaviour only).
import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const q = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
const f2 = (v) => (typeof v === 'number' ? (Math.round(v * 100) / 100) : v)
let N = 0, sw = 0, pp = 0, trans = {}, ppPairs = {}, losFlip = 0, losPP = 0
let shots = 0, wall = 0, hits = 0
const react = { tgt: [], fire: [], face: [], none: 0, n: 0, wasTgt: 0 }
let win = 0, winFired = 0, winTurn = 0, winAk = {}
let outZone = 0, zoneDeaths = 0, ms = [], over15 = 0, over25 = 0
let stuckEp = 0, stuckT = 0, stuckLeg = {}
const C = {}
let frames = 0, aliveS = 0, score = 0
const deaths = {}
for (const m of all) {
  N++; score += m.score; aliveS += m.alive
  deaths[m.cause] = (deaths[m.cause] || 0) + 1
  if (m.cause === 'zone') zoneDeaths++
  shots += m.shots; wall += m.wallShots; hits += m.hits
  for (const k of Object.keys(m.counters || {})) C[k] = (C[k] || 0) + m.counters[k]
  const F = m.frames; frames += F.length
  // mode switches and ping-pong (A -> B -> A inside 1.0 s)
  const sws = []
  for (let i = 1; i < F.length; i++) if (F[i].md !== F[i - 1].md) { sws.push({ t: F[i].t, a: F[i - 1].md, b: F[i].md }); trans[F[i - 1].md + '>' + F[i].md] = (trans[F[i - 1].md + '>' + F[i].md] || 0) + 1 }
  sw += sws.length
  for (let i = 1; i < sws.length; i++) if (sws[i].b === sws[i - 1].a && sws[i].t - sws[i - 1].t <= 1.0) { pp++; const k = sws[i - 1].a + '>' + sws[i - 1].b + '>' + sws[i].b; ppPairs[k] = (ppPairs[k] || 0) + 1 }
  let lf = []
  for (let i = 1; i < F.length; i++) if (F[i].ls !== F[i - 1].ls) lf.push(F[i].t)
  losFlip += lf.length
  for (let i = 2; i < lf.length; i++) if (lf[i] - lf[i - 2] <= 2.0) losPP++
  for (const r of m.react) { react.n++; if (r.wasTgt) react.wasTgt++; if (r.tgtT >= 0) react.tgt.push(r.tgtT); if (r.faceT >= 0) react.face.push(r.faceT); if (r.fireT >= 0) react.fire.push(r.fireT); else react.none++ }
  for (const f of F) {
    if (f.ready && f.tgtLos && !f.hold && f.md === 'FIGHT') { win++; if (f.f0) winFired++; else { if (f.yawErr > 0.08) winTurn++; winAk[f.ak] = (winAk[f.ak] || 0) + 1 } }
    if (!f.inZone) outZone++
  }
  for (const v of m.ms) { ms.push(v); if (v > 15) over15++; if (v > 25) over25++ }
  // stuck: wanting to move (|move| > 0.5) but slower than 1 m/s for >= 2 s on the ground
  let s0 = -1
  for (let i = 0; i < F.length; i++) {
    const f = F[i], st = f.mv > 0.5 && f.sp < 1.0 && f.gr
    if (st && s0 < 0) s0 = i
    if ((!st || i === F.length - 1) && s0 >= 0) { const d = F[i].t - F[s0].t; if (d >= 2) { stuckEp++; stuckT += d; const k = F[s0].md + '/' + F[s0].lg; stuckLeg[k] = (stuckLeg[k] || 0) + 1 } s0 = -1 }
  }
}
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(' ')
console.log(`matches ${N}  mean score ${f2(score / N)}  mean alive ${f2(aliveS / N)} s  deaths ${top(deaths)}`)
console.log(`mode switches ${sw} (${f2(sw / (frames / 600))}/min)  ping-pong<=1s ${pp} (${f2(pp / N)}/match)  top: ${top(ppPairs, 6)}`)
console.log(`transitions: ${top(trans, 12)}`)
console.log(`LOSING flips ${losFlip} (${f2(losFlip / N)}/match), on-off-on within 2 s ${losPP}`)
console.log(`gun shots ${shots}, ended in a wall ${wall} (${f2(100 * wall / Math.max(1, shots))}%), hits ${hits} (${f2(100 * hits / Math.max(1, shots))}%)`)
console.log(`laser shots ${C.laserShots || 0} hits ${C.laserHits || 0}; flightGated ${C.flightGated || 0}`)
console.log(`reaction to a new attacker (n ${react.n}, already target ${react.wasTgt}): target p50 ${f2(q(react.tgt, 0.5))} p90 ${f2(q(react.tgt, 0.9))} s; face p50 ${f2(q(react.face, 0.5))} p90 ${f2(q(react.face, 0.9))}; first fire p50 ${f2(q(react.fire, 0.5))} p90 ${f2(q(react.fire, 0.9))}; never fired at it within 6 s ${react.none}`)
console.log(`fire windows (FIGHT, gun ready, target listed with a line, in range): ${win}; fired ${f2(100 * winFired / Math.max(1, win))}%; not fired while turning >0.08 rad ${winTurn}; not-fired by aimKind ${top(winAk)}`)
console.log(`outside zone ${f2(outZone / 10)} s total; zone deaths ${zoneDeaths}`)
console.log(`decision ms p50 ${f2(q(ms, 0.5))} p99 ${f2(q(ms, 0.99))} p999 ${f2(q(ms, 0.999))} max ${f2(Math.max(...ms))}; >15 ms ${over15}; >25 ms ${over25} of ${ms.length}`)
console.log(`stuck episodes (>=2 s) ${stuckEp}, ${f2(stuckT)} s; by mode/leg ${top(stuckLeg)}`)
console.log(`counters: stuck ${C.stuck} abandons ${C.abandons} noProgress ${C.noProgress} hops ${C.hops} fuse ${C.fuse} overruns ${C.overruns} errors ${C.errors} plans ${C.plans}`)
console.log(`10-track cap: assumed lines ${C.capLos || 0}, of which the ray says no ${C.capLosFalse || 0}; decisions whose only 'line on us' was a capped false one ${C.capOnlyLos || 0}; quiet clock broken by it ${C.capQuietBroken || 0}`)
