// Red-team tool: the last three zone phases on the real map, alone and with one scripted shooter 60 m away.
//   bun tools/redteam/late_zone.js
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Arena, rng32 } from '../arena_micro.js'
import { World } from './snap/bot/lib/world.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const ROOT = new URL('./snap/', import.meta.url).pathname
const lines = gunzipSync(readFileSync(ROOT + 'kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(ROOT + 'kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const rnd = rng32(11)
const ok = (x, y) => nav.passableAt(x, y) && nav.component(x, y) === nav.mainComponent
function pick(cx, cy, rMin, rMax) { for (let k = 0; k < 4000; k++) { const a = rnd() * 6.283, r = rMin + rnd() * (rMax - rMin), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (ok(x, y)) return [x, y] } return null }
const PH = [{ name: '140 -> 70', r0: 140, r1: 70, hold: 30, shrink: 30, dps: 100 }, { name: '70 -> 25', r0: 70, r1: 25, hold: 25, shrink: 25, dps: 160 }, { name: '25 -> 0', r0: 25, r1: 0, hold: 15, shrink: 25, dps: 260 }]
for (const ph of PH) {
  const res = []
  for (let trial = 0; trial < 12; trial++) {
    let c = null
    for (let k = 0; k < 500 && !c; k++) { const x = -350 + rnd() * 800, y = -330 + rnd() * 560; if (ok(x, y)) c = [x, y] }
    const nc = ph.r1 > 0 ? pick(c[0], c[1], 0, ph.r0 - ph.r1) : pick(c[0], c[1], 0, ph.r0 * 0.9)
    const st = pick(c[0], c[1], ph.r0 * 0.6, ph.r0 * 0.95)
    if (!nc || !st) continue
    const zone = { center: c, radius: ph.r0, next_center: nc, next_radius: ph.r1, shrink_start: ph.hold, shrink_end: ph.hold + ph.shrink, dps: ph.dps }
    const ar = new Arena({ cfg, world, nav, seed: 100 + trial, me: { x: st[0], y: st[1], yaw: 0 }, zone })
    const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9 })
    let tDead = -1, zoneDmg = 0, hpPrev = ar.me.hp, dEnd = 0
    const T = ph.hold + ph.shrink
    for (let k = 0; k < T * 10 && ar.me.hp > 0; k++) {
      const obs = ar.obs(); const a = brain.act(obs, performance.now() + 1e6); ar.step(a)
      if (ar.me.hp < hpPrev) zoneDmg += hpPrev - ar.me.hp
      hpPrev = ar.me.hp
      if (ar.me.hp <= 0) tDead = ar.t
      // distance from the moving centre in the last 5 s of the shrink
      if (ar.t > T - 5) dEnd = Math.max(dEnd, Math.hypot(ar.me.x - ar.zc.x, ar.me.y - ar.zc.y) - ar.zc.r)
    }
    res.push({ outTicks: ar.stats.outsideTicks, zoneDmg: Math.round(zoneDmg), tDead, hp: Math.round(Math.max(0, ar.me.hp)), tEnd: +ar.t.toFixed(1), overEdgeLate: +dEnd.toFixed(1) })
  }
  const dead = res.filter((r) => r.tDead >= 0)
  console.log(`${ph.name} (dps ${ph.dps}): trials ${res.length}, any zone damage in ${res.filter((r) => r.zoneDmg > 0).length}, mean zone damage ${Math.round(res.reduce((s, r) => s + r.zoneDmg, 0) / res.length)}, dead before the phase ends ${dead.length} (at ${dead.map((r) => r.tDead.toFixed(0)).join(', ')} s of ${ph.hold + ph.shrink}), hp at end ${res.map((r) => r.hp).join(' ')}`)
}
