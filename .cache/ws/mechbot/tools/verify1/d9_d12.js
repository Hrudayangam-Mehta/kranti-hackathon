// D9 zone triggers / goal / late zone / final shrink; D12 latch unit cases.
import { createBrain, hello, ctxNone, check, fx, mkObs, mech, dmgBy, cfg, Arena } from './common.js'
const Z = (o) => ({ center: [0, 0], radius: 300, next_center: [0, 0], next_radius: 200, shrink_start: 1e6, shrink_end: 2e6, dps: 20, ...o })
function zoneAt(x, y, zone, t = 100, secs = 0.6) {
  const b = createBrain(hello, ctxNone, { warmup: false })
  let st = null, a = null
  for (let k = 0; k < secs * 10; k++) { const o = mkObs({ t: t + k * 0.1, zone }); o.self.pos = [x, y, 0]; o.self.in_zone = Math.hypot(x - zone.center[0], y - zone.center[1]) <= zone.radius; a = b.act(o, performance.now() + 27); st = b.debugState() }
  return { urgent: b._B.zoneUrgent, mode: st.mode, goal: st.goal, a }
}
{
  const rows = []
  // beyond 0.9 r (280 of 300), next 200 at same centre, no shrink soon -> ZONE
  rows.push(['beyond 0.9 r (280/300)', zoneAt(280, 0, Z({})), true])
  // inside 0.9 r and inside 0.8 nr (150 of r 300, nr 200 -> 0.8nr = 160): no ZONE
  rows.push(['inside 0.9 r and 0.8 nr (150 m)', zoneAt(150, 0, Z({})), false])
  // 0.85 nr (170 m), circle shrinking -> ZONE
  rows.push(['170 m (> 0.8 nr) while shrinking', zoneAt(170, 0, Z({ shrink_start: 90, shrink_end: 160 })), true])
  // 170 m, shrink in 100 s (> path time + 12) -> no ZONE
  rows.push(['170 m, shrink in 100 s', zoneAt(170, 0, Z({ shrink_start: 200, shrink_end: 260 })), false])
  // 170 m, shrink in 10 s (< path time + 12) -> ZONE
  rows.push(['170 m, shrink in 10 s', zoneAt(170, 0, Z({ shrink_start: 110, shrink_end: 170 })), true])
  // outside the current circle -> ZONE
  rows.push(['outside (320/300)', zoneAt(320, 0, Z({})), true])
  const bad = rows.filter((r) => (r[1].mode === 'ZONE') !== r[2])
  check('D9 zone triggers (outside, > 0.9 r, > 0.8 nr while shrinking or shrink soon)', bad.length === 0, rows.map((r) => `${r[0]}: ${r[1].mode}${(r[1].mode === 'ZONE') !== r[2] ? ' (WRONG)' : ''}`).join(' | '))
  // goal on our side at 0.5 nr
  const g = rows[0][1].goal
  check('D9 zone goal at 0.5 of the next radius on our side', g && Math.abs(Math.hypot(g[0], g[1]) - 100) < 3 && g[0] > 0 && Math.abs(g[1]) < 3, `goal ${g ? g.map((v) => fx(v, 1)) : null} (want ~(100, 0))`)
}
// late zone (nr <= 70) with a target: converge on the next centre and fight from there
{
  const ar = new Arena({ cfg, seed: 51, me: { x: 60, y: 0, yaw: Math.PI }, enemies: [{ id: 10, x: -40, y: 30, hp: 1e7, dps: 8, script: (e, t, a) => { e.x = -40; e.y = 30; e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } }],
    zone: { center: [0, 0], radius: 120, next_center: [10, -10], next_radius: 60, shrink_start: 70, shrink_end: 100, dps: 20 } })
  ar.t = 60
  const b = createBrain(hello, ctxNone, { warmup: false })
  const legs = {}; let fires = 0
  for (let k = 0; k < 200; k++) { const a = b.act(ar.obs(), performance.now() + 27); const l = b.debugState().leg; legs[l] = (legs[l] || 0) + 1; if (a.fire[0]) fires++; ar.step(a); if (ar.me.hp < 600) ar.me.hp = 1400 }
  const dEnd = Math.hypot(ar.me.x - 10, ar.me.y + 10)
  check('D9 late zone (nr 60): converges on the next centre, fights from there, never outside', dEnd <= 60 * 0.35 + 3 && ar.stats.outsideTicks === 0 && fires > 20,
    `end distance to next centre ${fx(dEnd, 1)} m, ticks outside ${ar.stats.outsideTicks}, trigger decisions ${fires}, legs ${JSON.stringify(legs)}`)
}
// final shrink: next radius 0 while shrinking -> goal is the moving centre (1 s ahead)
{
  const zone = { center: [0, 0], radius: 40, next_center: [30, 0], next_radius: 0, shrink_start: 95, shrink_end: 115, dps: 20 }
  const r = zoneAt(10, 20, zone, 100, 0.6)
  const u = (100.5 + 1 - 95) / 20, cx = 30 * u
  check('D9 final shrink: stands on the moving centre', r.goal && Math.hypot(r.goal[0] - cx, r.goal[1]) < 2, `goal ${r.goal ? r.goal.map((v) => fx(v, 1)) : null}, moving centre 1 s ahead ~(${fx(cx, 1)}, 0); mode ${r.mode}`)
}
// D12 latch unit cases: alive counts and our kills
function latch(seq, over = {}) {
  const b = createBrain(hello, ctxNone, { warmup: false, ...over })
  for (const [t, alive, events] of seq) b.act(mkObs({ t, alive, events: events || [] }), performance.now() + 27)
  const s = b.debugState(); return `${s.env}${s.ffaLatchT >= 0 ? '@' + fx(s.ffaLatchT, 1) : ''}`
}
{
  const r = {
    three: latch([[10, 16], [30, 15], [50, 14], [70, 13], [71, 13]]),
    two: latch([[10, 16], [30, 15], [50, 14], [190, 14]]),
    oursOne: latch([[10, 16], [30, 15, [{ type: 'kill', target: 20 }]], [50, 14], [70, 13], [71, 13]]),
    oursThenMore: latch([[10, 16], [30, 15, [{ type: 'kill', target: 20 }]], [50, 14], [70, 13], [90, 12]]),
    late: latch([[10, 16], [150, 15], [195, 14], [205, 13], [230, 12]]),
    squadForced: latch([[10, 16], [30, 15], [50, 14], [70, 13]], { select: { env: 'squad' } }),
  }
  const ok = r.three.startsWith('FFA@70') && r.two === 'SQUAD' && r.oursOne === 'SQUAD' && r.oursThenMore.startsWith('FFA@90') && r.late === 'SQUAD' && r.squadForced === 'SQUAD'
  check('D12 latch: 3 foreign deaths before 200 s latch; 2 do not; our kills subtract; deaths after 200 s ignored; env=squad preset', ok, JSON.stringify(r))
}
