// Cost of a decision as the body grows (cubes 0..45): ZONE walk toward a far circle from several spots.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mkZone, pct } from './common.js'
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const acc = {}
function wrap(obj, name) {
  const f = obj[name].bind(obj)
  acc[name] = { n: 0, ms: 0, max: 0 }
  obj[name] = (...a) => { const t0 = performance.now(); const r = f(...a); const dt = performance.now() - t0; const s = acc[name]; s.n++; s.ms += dt; if (dt > s.max) s.max = dt; return r }
}
for (const n of ['findPath', 'setBody', 'walkLine', 'nearestPassable', 'nearestPassableIdx', 'component', 'passableAt', 'levelAt', 'wallDistAt']) wrap(nav, n)
for (const n of ['shotClear', 'canSee']) wrap(world, n)
const spots = [[0, 0], [300, -200], [-400, 250], [200, 300]].map(([x, y]) => nav.nearestPassable(x, y, 80))
console.log('cubes  radius  passable%  mean ms  p99 ms  max ms   | attribution of the slowest decision')
for (const cubes of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]) {
  const sc = 1 + 0.05 * cubes
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  const ts = []; let worst = 0, worstD = ''
  for (let rep = 0; rep < 2; rep++) for (let s = 0; s < spots.length; s++) {
    let x = spots[s].x, y = spots[s].y, last = null
    for (let k = 0; k < 150; k++) {
      if (last) { const nx = x + last.move[0] * 1.17, ny = y + last.move[1] * 1.17; if (nav.passableAt(nx, ny)) { x = nx; y = ny } }
      const n = rep * 100000 + s * 1000 + k
      const obs = mkObs(cfg, 4000 + n * 2, { self: mkSelf(cfg, { pos: [x, y, nav.levelAt(x, y)], cubes, in_zone: false, max_hp: 1960, hp: 1500 }), zone: mkZone({ center: [x + 500, y + 100], radius: 300, next_center: [x + 520, y + 120], next_radius: 200, shrink_start: 0, shrink_end: 1e4, dps: 35 }),
        mechs: k % 2 ? [mkMech(5, [x + 80, y + 20, nav.levelAt(x + 80, y + 20)])] : [] })
      for (const q in acc) { acc[q].n = 0; acc[q].ms = 0; acc[q].max = 0 }
      const t0 = performance.now()
      last = brain.act(obs, t0 + 27.5)
      const ms = performance.now() - t0
      if (rep === 1) { ts.push(ms); if (ms > worst) { worst = ms; worstD = Object.entries(acc).filter(([, v]) => v.ms > 0.3).map(([q, v]) => `${q} n=${v.n} ${v.ms.toFixed(1)}ms`).join('; ') } }
    }
  }
  let pass = 0; for (let c = 0; c < nav.n; c++) pass += nav.pass[c]
  console.log(`${String(cubes).padStart(5)}  ${(2.5 * sc).toFixed(2).padStart(6)}  ${(pass / nav.n * 100).toFixed(1).padStart(8)}  ${(ts.reduce((s, v) => s + v, 0) / ts.length).toFixed(2).padStart(7)}  ${pct(ts, 0.99).toFixed(1).padStart(6)}  ${worst.toFixed(1).padStart(6)}   | ${worstD}`)
}
