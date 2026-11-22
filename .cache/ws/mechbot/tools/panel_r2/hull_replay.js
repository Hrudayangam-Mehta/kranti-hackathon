// Replay: what do house bots do when only the top of their target shows (centre hidden by an edge or low wall)?
// Uses the per-shot table of tools/forensics (shooter, inferred target, fire tick, hit flag). DEV ONLY.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadWorld, loadReplay, P, fmt, pct, MX, MY, MZ, MCU, MFL, MYAW, MPIT } from './common.js'
const w = loadWorld(), R = loadReplay()
const shots = JSON.parse(readFileSync(join(P, 'tools', 'forensics', 'out', 'gunshots.json'), 'utf8'))
const fi = (tick) => { let lo = 0, hi = R.nf - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.ticks[mid] <= tick) lo = mid; else hi = mid - 1 } return lo }
const cls = { full: [0, 0, []], hull: [0, 0, []], none: [0, 0, []] }
const pitchOff = { full: [], hull: [] }
for (const o of shots) {
  if (o.tgt === null || o.tgt === undefined || o.tgt >= 100) continue
  const k = fi(o.tf); const S = R.m[o.s][k], T = R.m[o.tgt][k]; if (!S || !T) continue
  const mz = S[MZ] + 7, sc = 1 + 0.05 * T[MCU]
  const centre = w.shotClear(S[MX], S[MY], mz, T[MX], T[MY], T[MZ] + 4.5 * sc)
  const topv = w.shotClear(S[MX], S[MY], mz, T[MX], T[MY], T[MZ] + 8.7 * sc)
  const c = centre ? 'full' : topv ? 'hull' : 'none'
  cls[c][0]++; if (o.hit) cls[c][1]++; cls[c][2].push(o.rng)
  // where was the barrel pointing relative to the target's centre / top (pitch only)?
  const d = Math.hypot(T[MX] - S[MX], T[MY] - S[MY])
  if (c !== 'none' && d > 20) { const pc = Math.atan2(T[MZ] + 4.5 * sc - mz, d), pt = Math.atan2(T[MZ] + 9 * sc - mz, d); pitchOff[c].push((o.pitch - pc) / Math.max(1e-6, pt - pc)) }
}
for (const [k, v] of Object.entries(cls)) console.log(`${k === 'full' ? 'centre in the clear' : k === 'hull' ? 'centre hidden, top showing (hull-down target)' : 'centre and top hidden'}: ${v[0]} gun shots, ${v[1]} hits (${fmt(100 * v[1] / Math.max(1, v[0]), 0)}%), median range ${fmt(pct(v[2], .5), 0)} m`)
for (const k of ['full', 'hull']) console.log(`  barrel pitch between target centre (0) and top (1), ${k}: p25 ${fmt(pct(pitchOff[k], .25), 2)} p50 ${fmt(pct(pitchOff[k], .5), 2)} p75 ${fmt(pct(pitchOff[k], .75), 2)} (n=${pitchOff[k].length})`)
// exposure time: how long do pairs spend in each state while within 150 m and in the shooter's wedge?
let tFull = 0, tHull = 0
for (const a of R.ids) for (const b of R.ids) { if (a === b) continue; for (let k = 0; k < R.nf; k += 2) { const S = R.m[a][k], T = R.m[b][k]; if (!S || !T) continue; const d = Math.hypot(T[MX] - S[MX], T[MY] - S[MY]); if (d > 150 || d < 20) continue; const c = w.shotClear(S[MX], S[MY], S[MZ] + 7, T[MX], T[MY], T[MZ] + 4.5), t = w.shotClear(S[MX], S[MY], S[MZ] + 7, T[MX], T[MY], T[MZ] + 8.7); if (c) tFull++; else if (t) tHull++ } }
console.log(`pair-time within 20-150 m: centre in the clear ${fmt(tFull * 0.2, 0)} s, hull-down ${fmt(tHull * 0.2, 0)} s (${fmt(100 * tHull / (tFull + tHull), 1)}% of the time a line exists)`)
// Rate comparison: seconds during which a shooter is looking straight at a target it can see (torso within 10 deg,
// 20-200 m), split by whether the centre line is clear, and gun shots fired at that target in each state.
{
  const { sees, angDiff } = await import('./common.js')
  const byKey = new Map()
  for (const o of shots) { if (o.tgt === null || o.tgt === undefined || o.tgt >= 100) continue; const k = fi(o.tf); const key = o.s * 16 + o.tgt; if (!byKey.has(key)) byKey.set(key, new Set()); byKey.get(key).add(k) }
  let tC = 0, tH = 0, sC = 0, sH = 0; const eps = []
  for (const a of R.ids) for (const b of R.ids) {
    if (a === b) continue
    const fired = byKey.get(a * 16 + b) || new Set()
    let run = 0
    for (let k = 0; k < R.nf; k++) {
      const S = R.m[a][k], T = R.m[b][k]; if (!S || !T) { run = 0; continue }
      const d = Math.hypot(T[MX] - S[MX], T[MY] - S[MY]); if (d < 20 || d > 200) { run = 0; continue }
      if (Math.abs(angDiff(Math.atan2(T[MY] - S[MY], T[MX] - S[MX]), S[MYAW])) > 0.175) { run = 0; continue }
      if (!sees(w, S, T)) { run = 0; continue }
      const sc = 1 + 0.05 * T[MCU]
      const c = w.shotClear(S[MX], S[MY], S[MZ] + 7, T[MX], T[MY], T[MZ] + 4.5 * sc)
      if (c) { tC++; if (fired.has(k)) sC++; run = 0 } else { tH++; if (fired.has(k)) sH++; run++; if (run === 1) eps.push({ a, b, k, d }) }
    }
  }
  console.log(`\nshooter aiming within 10 deg at a target it sees (20-200 m): centre clear ${fmt(tC / 10, 0)} s with ${sC} shot-frames (${fmt(10 * sC / tC, 2)} per s); centre hidden but target still seen (top showing) ${fmt(tH / 10, 0)} s with ${sH} shot-frames (${fmt(10 * sH / Math.max(1, tH), 2)} per s) in ${eps.length} episodes`)
}
