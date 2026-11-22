// Review tool: lost trigger time. Decisions with a listed mech target, a clear line, gun loaded and off cooldown,
// inside gun range, and no trigger pull: broken down by mode and by the reason visible in the trace.
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '40'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const S = { ticks: 0, could: 0, fired: 0, byMode: {}, hold: 0, cdWait: 0, aimOff: 0, other: 0, drone: 0, lastShots: 0, emptyAtKillable: 0, reloadLos: 0, reloadTicks: 0, magsDumpedFar: 0 }
for (let s = seed0; s < seed0 + n; s++) {
  const hook = (row, obs, a, B) => {
    const g = B.me.gun, tg = B.target
    row.can = !!(g && tg && !tg.npc && tg.listed && tg.losOut && g.ammo > 0 && g.reload <= 0 && tg.dist <= g.range * 0.97)
    row.cd = g ? g.cooldown : 9
    row.yawErr = tg ? Math.abs(Math.atan2(Math.sin(B.me.yaw - tg.bearing), Math.cos(B.me.yaw - tg.bearing))) : 0
    row.reloading = !!(g && g.reload > 0)
    row.tgtHp = tg ? tg.hp : -1
    row.early = !!a.reload && g && g.ammo > 0
  }
  const { rows } = await runTrace(s, { overrides, hook })
  for (const r of rows) {
    S.ticks++
    if (r.reloading) { S.reloadTicks++; if (r.tLosOut && r.tListed) S.reloadLos++ }
    if (!r.can) continue
    S.could++
    if (r.f0) { S.fired++; continue }
    if (r.cd > 0.1) continue                       // really cooling down
    S.byMode[r.mode] = (S.byMode[r.mode] || 0) + 1
    if (r.cd > 0.05) S.cdWait++
    else if (r.hold) S.hold++
    else if (r.yawErr > 0.35) S.aimOff++
    else S.other++
  }
}
console.log(JSON.stringify({ matches: n, 'decisions with a loaded gun, listed mech target, clear line, in range': S.could, 'trigger down': S.fired,
  'trigger up although cooldown <= 0.10 s': S.byMode, 'reasons': { 'cooldown between 0.05 and 0.10 s (readyCd)': S.cdWait, 'holdFire (HEAL / first-shot policy)': S.hold, 'torso more than 20 deg off the target': S.aimOff, 'gate / other': S.other },
  'reload decisions': S.reloadTicks, 'of those with a listed target in the sights': S.reloadLos }, null, 1))
process.exit(0)
