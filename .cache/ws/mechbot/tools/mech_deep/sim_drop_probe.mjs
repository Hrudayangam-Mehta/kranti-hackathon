// Read-only probe (no sim file is modified): wraps Match.prototype._spawnCube/_spawnPickup in memory to measure where the
// simulator puts death / drone / crate drops relative to the surface, and how many get collected. House bots only, FFA, full match.
import { Match } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim/sim.js'
import { makeContext, playMatch, resolveBot } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim/run.js'
const ctx = makeContext({ quiet: true })
const W = ctx.world
const rec = []
const origCube = Match.prototype._spawnCube, origPick = Match.prototype._spawnPickup
let src = 'crate'
const origKill = Match.prototype._kill, origNpc = Match.prototype._hurtNpc
Match.prototype._kill = function (m, by, w) { src = 'mech'; const r = origKill.call(this, m, by, w); src = 'crate'; return r }
Match.prototype._hurtNpc = function (...a) { src = 'npc'; const r = origNpc.apply(this, a); src = 'crate'; return r }
Match.prototype._spawnCube = function (x, y, z, i, n) {
  const before = this.cubes.length; origCube.call(this, x, y, z, i, n)
  const c = this.cubes[before]; const s = W.surfaceZ(c.x, c.y, c.z + 0.5)
  rec.push({ kind: 'cube', src, above: c.z - s, r: Math.hypot(c.x - x, c.y - y) })
}
Match.prototype._spawnPickup = function (kind, x, y, z, st) {
  const p = origPick.call(this, kind, x, y, z, st)
  if (this.t > 0.01) { const s = W.surfaceZ(p.x, p.y, p.z + 0.5); rec.push({ kind: 'weapon', src, above: p.z - s }) }
  return p
}
const team = await resolveBot('house:expert', ctx)
const seeds = (process.argv[2] || '1,2,3').split(',').map(Number)
for (const seed of seeds) await playMatch(seed, { mode: 'ffa', full: true }, ctx, { team, opponents: [] })
for (const s of ['mech', 'npc', 'crate']) for (const k of ['cube', 'weapon']) {
  const R = rec.filter((q) => q.src === s && q.kind === k)
  if (!R.length) continue
  const fl = R.filter((q) => q.above > 0.5).length, far = R.filter((q) => q.above > 4).length
  const rr = R.filter((q) => q.r !== undefined).map((q) => q.r).sort((a, b) => a - b)
  console.log(s, k, 'n', R.length, 'floating>0.5m', fl, 'floating>4m (unreachable from the ground)', far, rr.length ? 'scatter r max ' + rr[rr.length - 1].toFixed(2) : '')
}
