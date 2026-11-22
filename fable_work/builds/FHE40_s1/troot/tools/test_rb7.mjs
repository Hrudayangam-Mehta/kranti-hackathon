// R7a item 1 tests (RB4 / RB6 / A3): pocket survey with the campus hop limits against the config limits, the climb cap,
// the pocketCfg switch on a synthetic no-exit pocket, and the start-up rehearsal on this map's largest pocket.
// usage: bun test_rb7.mjs [bot dir]   (default r7work/bot)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FHE40_s1/troot'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { makeMover } = await imp('mover.js')
const { resolveParams } = await imp('params.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
// pocket survey: every non-main component of >= 25 cells, campus limits vs config limits (59 m climb, 60 m hop)
const m = cfg.mech, js = m.jump_speed || 11, g = m.gravity || 22, rise = m.max_rise_speed || 10, jd = m.jet_drain || 15, en = m.energy || 100
const cap = Math.min(80, 0.85 * (js * js / (2 * g) + rise * en / jd))
check('RB4 climb cap from the config', Math.abs(cap - 0.85 * (js * js / (2 * g) + rise * en / jd)) < 1e-9 && cap > 40 && cap <= 80, `cap ${cap.toFixed(2)} m (jump ${js}, gravity ${g}, rise ${rise}, jet drain ${jd}, energy ${en})`)
let pockets = 0, oldNo = 0, cfgOnly = 0, bothNo = 0
for (let k = 0; k < nav.compSizes.length; k++) {
  if (k === nav.mainComponent || nav.compSizes[k] < 25) continue
  let c0 = -1
  for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k && nav.pass[c]) { c0 = c; break }
  if (c0 < 0) continue
  pockets++
  const x = nav.cellX(c0), y = nav.cellY(c0)
  const a = nav.hopPlan(x, y, { toward: [0, 0] }), b = a ? a : nav.hopPlan(x, y, { toward: [0, 0], maxClimb: cap, maxHop: 60 })
  if (!a) oldNo++
  if (!a && b) cfgOnly++
  if (!a && !b) bothNo++
}
check('RB4 pocket survey: every pocket has a campus-limit exit on this map (fallback never consulted)', oldNo === 0, `${pockets} pockets >= 25 cells, no campus exit ${oldNo}, config-only exit ${cfgOnly}, no exit at all ${bothNo}`)
// pocketCfg on a synthetic nav whose campus plan always fails: off -> null (R4a), on -> the second plan with the config limits
function fakeB(sel) {
  const P = resolveParams({ select: sel })
  const calls = []
  const fnav = { hopPlan: (x, y, o) => { calls.push(o); return o && o.maxClimb ? { launch: [x, y], land: [x + 30, y], climb: o.maxClimb, hopLen: 30, walkLen: 0, apexZ: 50, launchZ: 0, landZ: 0 } : null },
    component: () => 3, mainComponent: 0 }
  const B = { P, cfg: { mech: m, weapons: cfg.weapons, cubes: cfg.cubes }, nav: fnav, world, me: { x: 0, y: 0, z: 0, t: 0 }, counters: {}, zone: { known: false }, cmd: { mx: 0, my: 0 } }
  return { B, calls }
}
for (const [sel, want] of [[{ pocketCfg: 'off' }, false], [{ pocketCfg: 'on' }, true], [{}, true]]) {
  const { B, calls } = fakeB(sel)
  const mv = makeMover(B)
  let got = null
  if (typeof mv.hopPlanCfg === 'function') got = mv.hopPlanCfg(0, 0, 100, 0)
  else got = 'not exported'
  check(`RB4 pocketCfg ${sel.pocketCfg || '(default)'}: second plan ${want ? 'made' : 'not made'} after a campus null`, typeof got !== 'string' && (!!got === want) && B.counters.hopOldNull === 1,
    `plan ${got && typeof got === 'object' ? 'climb ' + got.climb.toFixed(1) : String(got)}, hopPlan calls ${calls.length}, hopOldNull ${B.counters.hopOldNull}`)
}
// RB6: the rehearsal runs on this map without the fixed stadium point and leaves the nav body restored
const t0 = performance.now()
const br = createBrain(hello, { world, nav, log: () => {} }, {})
const st = br.debugState()
check('RB6 rehearsal on the largest pocket runs (no fixed coordinate)', !!st.rehearsal && st.counters.errors === 0, `rehearsal ${st.rehearsal ? st.rehearsal.ms.toFixed(0) + ' ms, ' + st.rehearsal.bodies + ' body warm-ups' : 'none'}, ${(performance.now() - t0).toFixed(0)} ms total`)
console.log(`\n${pass}/${pass + fail} RB checks passed`)
process.exit(fail ? 1 : 0)
