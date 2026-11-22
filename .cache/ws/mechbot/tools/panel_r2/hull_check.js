// Guard against an artefact: count ALL gun fire events (not only those with an inferred target) whose barrel points
// within 4 deg (yaw) of a mech the shooter sees, split by whether that mech's centre line is clear. DEV ONLY.
import { loadWorld, loadReplay, sees, angDiff, fmt, MX, MY, MZ, MCU, MYAW, MPIT } from './common.js'
const w = loadWorld(), R = loadReplay()
const fi = (tick) => { let lo = 0, hi = R.nf - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.ticks[mid] <= tick) lo = mid; else hi = mid - 1 } return lo }
let total = 0, clear = 0, hull = 0, nobody = 0
for (const e of R.events) {
  if (e.e !== 'fire' || e.w !== 'gun' || e.id >= 100) continue
  total++
  const k = fi(e.t); const S = R.m[e.id][k]; if (!S) continue
  let best = null, bd = 0.07
  for (const t of R.ids) { if (t === e.id) continue; const T = R.m[t][k]; if (!T) continue; const d = Math.hypot(T[MX] - S[MX], T[MY] - S[MY]); if (d > 260 || d < 5) continue; const off = Math.abs(angDiff(Math.atan2(T[MY] - S[MY], T[MX] - S[MX]), S[MYAW])); if (off < bd && sees(w, S, T)) { bd = off; best = T } }
  if (!best) { nobody++; continue }
  const sc = 1 + 0.05 * best[MCU]
  if (w.shotClear(S[MX], S[MY], S[MZ] + 7, best[MX], best[MY], best[MZ] + 4.5 * sc)) clear++; else hull++
}
console.log(`gun fire events ${total}: barrel within 4 deg of a seen mech with a clear centre line ${clear}; of a seen mech whose centre is hidden ${hull}; no seen mech near the barrel line ${nobody} (crates, drones, leads on fast crossers)`)
