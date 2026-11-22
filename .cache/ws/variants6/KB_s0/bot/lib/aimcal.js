// Owner request R3 (calibration half, PARAMS.aimCalOn): online calibration of the laser from our own beams.
// At release firecontrol.js records the shot (intended beam, the torso aim predicted for the release, target state).
// When our beam shows up in obs.beams (by === self id; path from our muzzle to where it stopped):
//   - aim bias (yaw, pitch): beam direction minus the predicted torso aim at release, a bounded running mean;
//   - latency: the release time from the beam's `age` (protocol example and the simulator: age = obs time - fire
//     time + one tick), against the lead we used; a bounded running mean of the difference;
//   - the miss vector against the target body at the release time (lateral / vertical metres) is kept as a running
//     diagnostic; a beam that stopped short of the target (cover), a gross miss or a manoeuvring target is not used.
// All corrections decay back to zero with calDecayS when no new beams arrive.
// firecontrol.js subtracts the aim bias from the laser command and adds the latency to the laser lead.
// If own beams never appear (the protocol text says beams of *other* mechs), nothing is learned and nothing changes.

import { angDiff, clamp } from './aim.js'

const ok3 = (a) => Array.isArray(a) && a.length >= 3 && a.every((v) => typeof v === 'number' && v === v && Math.abs(v) < 1e6)

export function makeAimCal(B) {
  const P = B.P
  const cal = { yaw: 0, pitch: 0, lat: 0, beams: 0, used: 0, blocked: 0, noBeam: 0, outliers: 0, missLat: 0, missV: 0, lastT: -1 }
  let pend = null

  function onRelease(p) { if (P.aimCalOn) { p.n = 0; pend = p } }
  const yaw = () => (P.aimCalOn ? cal.yaw : 0)
  const pitch = () => (P.aimCalOn ? cal.pitch : 0)
  const lat = () => (P.aimCalOn ? cal.lat : 0)

  function sense(obs) {
    const me = B.me, t = me.t
    if (cal.lastT >= 0 && t > cal.lastT) {
      const f = Math.exp(-(t - cal.lastT) / P.calDecayS)
      cal.yaw *= f; cal.pitch *= f; cal.lat *= f
    }
    cal.lastT = t
    if (!P.aimCalOn || !pend || !(t > pend.t)) return
    pend.n++
    let beam = null
    const bl = Array.isArray(obs.beams) ? obs.beams : []
    for (let k = 0; k < Math.min(bl.length, 16); k++) {
      const b = bl[k]
      if (!b || typeof b !== 'object' || b.by !== me.id || b.kind !== 'laser' || !Array.isArray(b.path) || b.path.length < 2) continue
      const o = b.path[0], e = b.path[b.path.length - 1]
      if (ok3(o) && ok3(e)) { beam = { o, e, age: typeof b.age === 'number' && b.age === b.age ? clamp(b.age, 0, 0.5) : NaN }; break }
    }
    if (!beam) { if (pend.n >= 2) { cal.noBeam++; pend = null } return }
    const p = pend
    pend = null
    cal.beams++
    B.counters.calBeams = cal.beams
    const ox = beam.o[0], oy = beam.o[1], oz = beam.o[2]
    const dx = beam.e[0] - ox, dy = beam.e[1] - oy, dz = beam.e[2] - oz
    const dh = Math.hypot(dx, dy)
    if (dh < 1) return
    // 1. aim bias: where the beam went against where the torso was predicted to point at release
    const by = angDiff(p.pyaw, Math.atan2(dy, dx)), bp = Math.atan2(dz, dh) - p.ppitch
    if (Math.abs(by) > 0.08 || Math.abs(bp) > 0.08) { cal.outliers++; return }      // not an aim error (swap, short, slew)
    const g = P.calGain
    if (p.settled) {                                   // only when the torso sat on its command at release
      cal.yaw = clamp(cal.yaw + g * (by - cal.yaw), -P.calMaxRad, P.calMaxRad)       // by is the whole bias (absolute)
      cal.pitch = clamp(cal.pitch + g * (bp - cal.pitch), -P.calMaxRad, P.calMaxRad)
    }
    // 2. latency: the release time from the beam's age, against the lead used for this shot
    const tau = beam.age === beam.age ? clamp(t - beam.age + P.tickS, p.t, t) : p.t + p.tl
    if (beam.age === beam.age) cal.lat = clamp(cal.lat + P.calLatGain * ((tau - p.t) - p.tl), -P.calMaxLat, P.calMaxLat)
    // 3. miss vector against the body at the release time (diagnostic running means)
    const tr = B.tracks.get(p.id)
    if (tr && tr.listed && t - p.t < 0.5) {
      const f = (tau - p.t) / Math.max(1e-3, t - p.t)
      const ax = p.x + (tr.x - p.x) * f, ay = p.y + (tr.y - p.y) * f, az = p.z + (tr.z - p.z) * f
      const ex = dx / dh, ey = dy / dh, hx = ax - ox, hy = ay - oy
      const s = hx * ex + hy * ey
      const latM = ex * hy - ey * hx                     // target axis left of the beam (m)
      const vMiss = oz + dz / dh * s - (az + tr.height * p.frac)
      if (dh < s - tr.radius - 1) cal.blocked++
      else if (Math.abs(latM) > P.calMissMax || Math.abs(vMiss) > P.calMissMax || Math.hypot(tr.vx - p.vx, tr.vy - p.vy) > 2 * P.steadyDv) cal.outliers++
      else { cal.used++; cal.missLat += 0.3 * (latM - cal.missLat); cal.missV += 0.3 * (vMiss - cal.missV) }
    }
  }

  return { onRelease, sense, yaw, pitch, lat, state: cal }
}
