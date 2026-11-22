// R6 IO8 (notes/build_spec_r6.md section 1): when a backlog of observations collapses to the newest one, the skipped
// observations' `events`, `sounds` and `beams` ("since your last observation", protocol section 2) are merged into it, so
// a kill, a hit or a damage event is never lost (a lost kill of ours would count as a foreign death toward the FFA latch).
// Older entries come first; sound and beam ages grow by the time between the skipped observation and the answered one
// (0.1 s per skipped decision). The lists are capped at what senses.js reads (64 / 32 / 16), keeping the newest entries.

const CAP = { events: 64, sounds: 32, beams: 16 }
const isArr = Array.isArray

function aged(list, dt) {
  const out = []
  for (const s of list) {
    if (s && typeof s === 'object' && typeof s.age === 'number' && Number.isFinite(s.age)) out.push({ ...s, age: s.age + dt })
    else out.push(s)
  }
  return out
}

/** Merge the skipped observation `older` into the newer observation `obs` (mutates and returns `obs`). */
export function mergeSkipped(older, obs) {
  if (!older || typeof older !== 'object' || !obs || typeof obs !== 'object') return obs
  let dt = typeof obs.t === 'number' && typeof older.t === 'number' && Number.isFinite(obs.t - older.t) ? obs.t - older.t : NaN
  if (!(dt >= 0 && dt < 60)) dt = Number.isInteger(obs.tick) && Number.isInteger(older.tick) && obs.tick > older.tick ? (obs.tick - older.tick) * 0.05 : 0.1
  for (const k of ['events', 'sounds', 'beams']) {
    const a = isArr(older[k]) ? older[k] : null
    if (!a || a.length === 0) continue
    const b = isArr(obs[k]) ? obs[k] : []
    let m = (k === 'events' ? a.slice() : aged(a, dt)).concat(b)
    if (m.length > CAP[k]) m = m.slice(m.length - CAP[k])
    obs[k] = m
  }
  return obs
}
