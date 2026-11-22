// selectTarget null dereference, ground-level variants (30 random street geometries) and the no-map variant.
// Sequence: mech 5 (hp 400, 60 m away) fires a 3-round burst at us (0.5 s), then steps behind a building while
// it stays listed (protocol section 8: "you keep tracking its real, current position for memory_s (5 s)").
// A drone we never saw (id 107) hits us once per second. No-map variant: mech 5 leaves the list instead.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mulberry } from './common.js'
const hello = realHello(), cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const rnd = mulberry(8), b = world.bounds
function scene() {
  for (;;) {
    const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY)
    if (!nav.passableAt(x, y) || nav.comp[nav.idx(x, y)] !== nav.mainComponent) continue
    const z = nav.levelAt(x, y)
    if (Math.abs(z - world.ground(x, y)) > 0.5) continue
    // open = a spot with a line both ways, hid = a spot 6-14 m from it without any line
    const a = rnd() * 6.283, d = 50 + rnd() * 30
    const ox = x + d * Math.cos(a), oy = y + d * Math.sin(a)
    if (!nav.passableAt(ox, oy)) continue
    const oz = nav.levelAt(ox, oy)
    if (Math.abs(oz - z) > 3 || !world.shotClear(x, y, z + 7, ox, oy, oz + 4.5) || !world.shotClear(ox, oy, oz + 7, x, y, z + 4.5)) continue
    for (let k = 0; k < 40; k++) {
      const a2 = rnd() * 6.283, d2 = 6 + rnd() * 8, hx = ox + d2 * Math.cos(a2), hy = oy + d2 * Math.sin(a2)
      if (!nav.passableAt(hx, hy) || !nav.walkLine(ox, oy, hx, hy)) continue
      const hz = nav.levelAt(hx, hy)
      const any = world.shotClear(x, y, z + 7, hx, hy, hz + 4.5) || world.shotClear(x, y, z + 7, hx, hy, hz + 7.65) || world.shotClear(hx, hy, hz + 7, x, y, z + 4.5) || world.shotClear(hx, hy, hz + 7, x, y, z + 8.1)
      if (!any) return { S: [x, y, z], open: [ox, oy, oz], hid: [hx, hy, hz] }
    }
  }
}
function run(sc, withMap) {
  const logs = []
  const brain = createBrain(hello, { world: withMap ? world : null, nav: withMap ? nav : null, log: (...a) => logs.push(a.join(' ')) }, { warmup: false })
  if (withMap) nav.setBody(2.5, 9)
  let errTicks = 0, prev = 0, noTarget = 0, first = -1
  for (let k = 0; k < 80; k++) {
    const events = []
    const visible = k < 12
    if (k >= 6 && k <= 10 && k % 2 === 0) events.push({ type: 'damaged', amount: 45, weapon: 'gun', bearing: Math.atan2(sc.open[1] - sc.S[1], sc.open[0] - sc.S[0]), by: 5 })
    if (k % 10 === 3) events.push({ type: 'damaged', amount: 25, weapon: 'npc', bearing: 2.5, by: 107 })
    const pos = k < 11 ? sc.open : sc.hid
    const listed = withMap ? k < 60 : visible          // map: remembered by the server for 5 s; no map: gone from the list
    const obs = mkObs(cfg, 400 + k * 2, { self: mkSelf(cfg, { pos: sc.S, hp: 1100 }), mechs: listed ? [mkMech(5, pos, { hp: 400, aim: [Math.atan2(sc.S[1] - pos[1], sc.S[0] - pos[0]), 0] })] : [], events })
    brain.act(obs, performance.now() + 27.5)
    const e = brain._B.counters.errors
    if (e > prev) { errTicks++; if (first < 0) first = k }
    prev = e
  }
  return { errTicks, first, stages: brain.debugState().errors, log: logs[0] }
}
let hitMap = 0, hitNo = 0, total = 30, sample = null, ticks = 0
for (let i = 0; i < total; i++) {
  const sc = scene()
  const r = run(sc, true); if (r.errTicks) { hitMap++; ticks += r.errTicks; if (!sample) sample = r }
  const r2 = run(sc, false); if (r2.errTicks) { hitNo++; if (!sample) sample = r2 }
}
console.log(`with map: assess stage threw in ${hitMap}/${total} street scenes (mean ${(ticks / Math.max(1, hitMap)).toFixed(1)} decisions each); without map: ${hitNo}/${total}`)
if (sample) console.log('first error at decision', sample.first, JSON.stringify(sample.stages), '\n  ' + String(sample.log).split('\n').slice(0, 2).join(' | ').slice(0, 300))
