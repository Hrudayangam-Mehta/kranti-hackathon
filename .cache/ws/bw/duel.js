import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { Arena, rng32 } = await import(P + '/tools/arena_micro.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], cfg = hello.config
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2 })
const seed = +(process.argv[2] || 1), nEn = +(process.argv[3] || 1), verbose = process.argv[4] !== 'q'
const rnd = rng32(seed), Bd = world.bounds
function spot() {
  for (let k = 0; k < 5000; k++) {
    const x = Bd.minX + 80 + rnd() * (Bd.maxX - Bd.minX - 160), y = Bd.minY + 80 + rnd() * (Bd.maxY - Bd.minY - 160)
    if (nav.passableAt(x, y) && nav.component(x, y) === nav.mainComponent && nav.wallDistAt(x, y) > 4) return [x, y]
  }
}
const [mx, my] = spot()
const enemies = []
for (let i = 0; i < nEn; i++) {
  let ex, ey
  for (let k = 0; k < 2000; k++) { const a = rnd() * 6.283, d = 150 + rnd() * 80; ex = mx + d * Math.cos(a); ey = my + d * Math.sin(a); if (nav.passableAt(ex, ey) && nav.component(ex, ey) === nav.mainComponent) break }
  // hunter: walks a path toward us until 70 m with a line of fire, shoots with p(d) accuracy
  let path = null, pt = -9, wp = 1
  enemies.push({ id: 10 + i, x: ex, y: ey, hp: 1400, dps: 0, script: (e, t, ar, dt) => {
    const me = ar.me, d = Math.hypot(me.x - e.x, me.y - e.y)
    const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) && (world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 4.5) || world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 9))
    e.yaw = Math.atan2(me.y - e.y, me.x - e.x)
    e.dps = los && d < 230 ? 107 * (d < 40 ? 0.85 : d < 90 ? 0.7 : d < 160 ? 0.45 : 0.25) * (ar.me.vx * ar.me.vx + ar.me.vy * ar.me.vy > 30 && d > 60 ? 0.6 : 1) : 0
    if (los && d < 75) { e.vx = 0; e.vy = 0; return }
    if (t - pt > 1) { pt = t; const r = nav.findPath(e.x, e.y, me.x, me.y, { maxExpand: 6000 }); path = r.pts; wp = 1 }
    if (path && path.length > 1) {
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - e.x, path[wp][1] - e.y) < 2) wp++
      const tx = path[wp][0] - e.x, ty = path[wp][1] - e.y, l = Math.hypot(tx, ty) || 1
      e.vx = tx / l * 11.7; e.vy = ty / l * 11.7
      e.x += e.vx * dt; e.y += e.vy * dt
    }
  } })
}
const ar = new Arena({ cfg, world, nav, seed, me: { x: mx, y: my, yaw: 0 }, enemies,
  zone: { center: [mx, my], radius: 3000, next_center: [mx, my], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
const brain = createBrain(hello, { world, nav, log: (...a) => console.log('LOG', ...a) })
let last = ''
const hist = {}
for (let k = 0; k < 1200; k++) {
  const obs = ar.obs()
  const tq = performance.now()
  const pl0 = brain.debugState().counters.plans, ev0 = brain.debugState().counters.evals
  const a = brain.act(obs, tq + 27)
  const dtq = performance.now() - tq
  const st = brain.debugState()
  if (dtq > 6) console.log('SLOW', dtq.toFixed(1), 'ms at', ar.t.toFixed(1), st.mode + '/' + st.leg, 'plans', st.counters.plans - pl0, 'evals', st.counters.evals - ev0, 'hide', st.hide)
  const key = st.mode + '/' + st.leg
  hist[key] = (hist[key] || 0) + 1
  if (verbose && (k % 20 === 0 || key !== last)) {
    const e = ar.enemies.filter((e) => e.alive).sort((a, b) => Math.hypot(a.x - ar.me.x, a.y - ar.me.y) - Math.hypot(b.x - ar.me.x, b.y - ar.me.y))[0]
    console.log(ar.t.toFixed(1), key.padEnd(20), 'hp', ar.me.hp.toFixed(0), 'en', ar.enemies.map((e) => e.hp.toFixed(0)).join(','), 'd', e ? Math.hypot(e.x - ar.me.x, e.y - ar.me.y).toFixed(0) : '-', 'A', st.A.toFixed(0), 'hide', st.hide, 'aim', st.aim, 'shots', ar.stats.shots, 'hits', ar.stats.hits, 'tgt', st.target)
  }
  last = key
  ar.step(a)
  if (ar.me.hp <= 0) { console.log('WE DIED at', ar.t.toFixed(1)); break }
  if (ar.enemies.every((e) => !e.alive) && ar.me.hp >= 0.95 * 1400) { console.log('ALL DEAD and healed at', ar.t.toFixed(1)); break }
}
const st = brain.debugState()
console.log('RESULT seed', seed, 'kills', ar.enemies.filter((e) => !e.alive).length + '/' + nEn, 'hp', ar.me.hp.toFixed(0), 't', ar.t.toFixed(0), 'shots', ar.stats.shots, 'hits', ar.stats.hits, JSON.stringify(hist), 'stuck', st.counters.stuck, 'err', st.counters.errors, 'modeSw', st.counters.modeSwitches)
