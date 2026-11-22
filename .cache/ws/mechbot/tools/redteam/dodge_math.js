// Red-team tool: how often does an exact first-order-intercept gun hit us, by range and by our strafe policy?
//   bun tools/redteam/dodge_math.js
// Model (protocol + forensics): shooter fires 12 shots, one per 0.24 s, then reloads 2.4 s; aims at the body centre
// with the linear lead from our velocity at its decision (every 0.1 s), shot leaves on the next 0.05 s tick; 252 m/s;
// Gaussian spread 0.6 deg per axis. We strafe across its line: speed 11.7 m/s (5.85 while charging a laser),
// ground acceleration 58.5 m/s2 toward the commanded velocity, decisions every 0.1 s. A shot hits when it passes
// within 2.5 m (body) + 0.3 m (bullet) of our centre. One lateral dimension (the radial part of our motion is ignored).
const V = 252, ACC = 58.5, WALK = 11.7, HITR = 2.8, CD = 0.24, MAG = 12, RELOAD = 2.4, DT = 0.05
let seed = 7
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }

// policy(state) -> commanded lateral velocity sign (-1, 0, 1); state = { t, x, v, dir, bullets:[{tHit, xAim}], lastFlip, magStartSeen }
function simulate(R, policy, { speed = WALK, spreadDeg = 0.6, seconds = 4000, see = true, hitR = HITR } = {}) {
  const T = R / V, sig = R * spreadDeg * Math.PI / 180
  let t = 0, x = 0, v = speed, dir = 1, shots = 0, hits = 0, cd = 0, ammo = MAG, reload = 0, flips = 0
  const bullets = []
  const st = { t: 0, x: 0, v: 0, dir: 1, bullets, lastFlip: -9, nextFlip: 0, T, lastShotSeenT: -9, flip() { this.dir = -this.dir; this.lastFlip = this.t; flips++ } }
  const n = Math.round(seconds / DT)
  for (let k = 0; k < n; k++) {
    if (k % 2 === 0) {
      // --- both decide on the same observation (lockstep)
      st.t = t; st.x = x; st.v = v
      st.visible = see ? bullets.filter((b) => !b.seen) : []
      const c = policy(st)
      for (const b of bullets) b.seen = true
      dir = c
      // shooter: fire when ready; aim point = x + v * T (first-order intercept, no delay, no acceleration term)
      st.fireNow = false
      if (reload <= 0 && cd <= 0.1 + 1e-9) st.aim = x + v * T, st.fireNow = true
    }
    // shooter trigger held: one shot whenever the cooldown allows, at this tick
    if (reload > 0) { reload -= DT; if (reload <= 0) ammo = MAG }
    else if (cd <= 1e-9 && st.fireNow) {
      bullets.push({ tHit: t + T, xAim: st.aim + gauss() * sig, seen: false, tFire: t })
      cd = CD; ammo--; shots++
      if (ammo === 0) reload = RELOAD
    }
    if (cd > 0) cd -= DT
    // our motion
    const tv = dir * speed, dv = tv - v, step = ACC * DT
    v = Math.abs(dv) <= step ? tv : v + Math.sign(dv) * step
    x += v * DT
    t += DT
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].tHit <= t) { if (Math.abs(bullets[i].xAim - x) < hitR) hits++; bullets.splice(i, 1) }
  }
  return { hit: hits / shots, flipsPerS: flips / seconds, shotsPerS: shots / seconds }
}

const constant = () => (s) => s.dir
const still = () => () => 0
const timer = (lo, hi) => () => (s) => { if (s.t >= s.nextFlip) { s.flip(); s.nextFlip = s.t + lo + (hi - lo) * rnd() } return s.dir }
// bullet-reactive (doctrine D4): flip when a newly seen bullet would pass within body + 1.2 m of where we will be,
// at most once per `minGap` seconds
const reactive = (minGap, brake = false) => () => (s) => {
  let threat = false
  for (const b of s.bullets) { const dtb = b.tHit - s.t; if (dtb <= 0 || dtb > 0.9) continue; const xp = s.x + s.v * dtb; if (Math.abs(b.xAim - xp) < 2.5 + 1.2) threat = true }
  if (threat && s.t - s.lastFlip >= minGap) s.flip()
  return brake && s.t - s.lastFlip < 0.25 ? 0 : s.dir
}
// magazine-synchronised: one flip when a magazine starts (first bullet after >= 2 s of silence) plus a slow timer
const magSync = (lo, hi) => () => (s) => {
  if (s.visible.length) { if (s.t - s.lastShotSeenT >= 2) { s.flip(); s.nextFlip = s.t + lo + (hi - lo) * rnd() } s.lastShotSeenT = s.t }
  if (s.t >= s.nextFlip) { s.flip(); s.nextFlip = s.t + lo + (hi - lo) * rnd() }
  return s.dir
}
// flight-time timer: flip period tied to the bullet flight time (the reversal must begin early in each flight)
const tofTimer = (k, floor) => () => (s) => { const p = Math.max(floor, k * s.T + 0.3); if (s.t >= s.nextFlip) { s.flip(); s.nextFlip = s.t + p * (0.85 + 0.3 * rnd()) } return s.dir }

const RANGES = [55, 75, 95, 115, 130, 150, 185]
const POL = [
  ['stand still', still],
  ['constant strafe', constant],
  ['timer U(0.5,1.0) = code today', timer(0.5, 1.0)],
  ['timer U(0.8,1.6) = doctrine D4', timer(0.8, 1.6)],
  ['timer U(0.35,1.05) = the 5.19 bot', timer(0.35, 1.05)],
  ['timer 1.1 s median (house bots)', timer(0.6, 1.6)],
  ['D4 timer + flip at magazine start', magSync(0.8, 1.6)],
  ['bullet-reactive, no minimum gap', reactive(0)],
  ['bullet-reactive, gap >= 0.4 s', reactive(0.4)],
  ['bullet-reactive, gap >= 0.8 s (D4 floor)', reactive(0.8)],
  ['bullet-reactive brake, gap >= 0.4 s', reactive(0.4, true)],
  ['fixed 0.45 s', timer(0.45, 0.45)], ['fixed 0.6 s', timer(0.6, 0.6)], ['fixed 0.8 s', timer(0.8, 0.8)],
]
console.log('gun hit rate on us by range (m); flight time s: ' + RANGES.map((r) => (r / V).toFixed(2)).join(' '))
console.log('policy'.padEnd(44) + RANGES.map((r) => String(r).padStart(6)).join('') + '   flips/s')
for (const [name, mk] of POL) {
  let line = name.padEnd(44), f = 0
  for (const R of RANGES) { seed = 7; const r = simulate(R, mk()); line += r.hit.toFixed(2).padStart(6); f = r.flipsPerS }
  console.log(line + '   ' + f.toFixed(2))
}
console.log('\nsame, while we charge our laser (half speed 5.85 m/s):')
for (const [name, mk] of POL.slice(2, 9)) {
  let line = name.padEnd(44)
  for (const R of RANGES) { seed = 7; line += simulate(R, mk(), { speed: WALK / 2 }).hit.toFixed(2).padStart(6) }
  console.log(line)
}
console.log('\nsame at full speed for a 10-cube body (radius 3.75 m, hit radius 4.05 m):')
for (const [name, mk] of POL.slice(2, 9)) {
  let line = name.padEnd(44)
  for (const R of RANGES) { seed = 7; line += simulate(R, mk(), { hitR: 4.05 }).hit.toFixed(2).padStart(6) }
  console.log(line)
}
// best fixed period per range
console.log('\nbest fixed reversal period per range (search 0.3 .. 1.6 s):')
for (const R of RANGES) {
  let best = 9, bp = 0
  for (let p = 0.3; p <= 1.61; p += 0.05) { seed = 7; const r = simulate(R, timer(p, p)(), { seconds: 1500 }); if (r.hit < best) { best = r.hit; bp = p } }
  console.log(`  ${R} m (flight ${(R / V).toFixed(2)} s): period ${bp.toFixed(2)} s -> hit ${best.toFixed(2)}`)
}
// physics note: lateral deviation from the linear prediction t seconds after a full reversal starts
const dev = (t, sp) => { const tr = 2 * sp / ACC; return t <= tr ? 0.5 * ACC * t * t : 0.5 * ACC * tr * tr + 2 * sp * (t - tr) }
const tNeed = (sp, r) => { for (let t = 0; t < 2; t += 0.001) if (dev(t, sp) >= r) return t; return 9 }
console.log(`\ntime after the reversal starts until we are ${HITR} m off the predicted point: full speed ${tNeed(WALK, HITR).toFixed(2)} s, charging ${tNeed(WALK / 2, HITR).toFixed(2)} s, 10-cube body (4.05 m) ${tNeed(WALK, 4.05).toFixed(2)} s`)
console.log(`a bullet is first listed 0.05-0.10 s after it leaves, so a reaction to a seen bullet can only make it miss beyond ${((tNeed(WALK, HITR) + 0.05) * V).toFixed(0)}-${((tNeed(WALK, HITR) + 0.10) * V).toFixed(0)} m`)
