// R7a item 1 test (RB2 / RB3 / RB5 / A1 / A2): re-anchored numbers for each map's hello config, checked against the spec.
// usage: bun anchors7.mjs <bot dir>      (maps: mechbot/tools/panel_r6/maps/<name>/hello.json, read only)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const MAPS = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps'
const BOT = process.argv[2]
const { anchorToConfig, createBrain, ANCHOR_SCALED } = await import(pathToFileURL(join(BOT, 'lib', 'brain.js')).href)
const { resolveParams, PARAMS, PRESETS } = await import(pathToFileURL(join(BOT, 'lib', 'params.js')).href)
const keys = ['farmStopT', 'scanLateT', 'ffaLatchT', 'openFarmT', 'ffaQuietS', 'fpStartT', 'ffaFinalT', 'fpShootT', 'zoneLateR', 'scanLateR', 'magSize', 'magReloadS', 'laserDpsIn', 'lightDpsIn', 'mortarDpsIn', 'mortarMaxR']
const cfgOf = (n) => JSON.parse(readFileSync(join(MAPS, n, 'hello.json'), 'utf8')).config
const anch = (c, ov) => { const P = resolveParams(ov || {}); anchorToConfig(P, c, ov || null); return P }
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const vals = (P, ks) => ks.map((k) => P[k])
const eq = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
// RB2: the match clock
const T = ['farmStopT', 'scanLateT', 'ffaLatchT', 'openFarmT', 'ffaQuietS', 'fpStartT', 'ffaFinalT', 'fpShootT']
const base = anch(cfgOf('base')), zt = anch(cfgOf('zt070'))
check('RB2 default config: clock constants unchanged', eq(vals(base, T), [210, 240, 200, 75, 90, 375, 390, 405]), vals(base, T).join('/'))
check('RB2 zt070 (hold / shrink x 0.7): clock re-anchored', eq(vals(zt, T), [147, 168, 140, 52.5, 63, 262.5, 273, 283.5]), vals(zt, T).join('/'))
// RB3: zone radii
const R = ['zoneLateR', 'scanLateR']
check('RB3 default 70/140', eq(vals(base, R), [70, 140]), vals(base, R).join('/'))
const z7 = anch(cfgOf('zs070')), z13 = anch(cfgOf('zs130'))
check('RB3 zs070 49/98', eq(vals(z7, R), [49, 98]), vals(z7, R).join('/'))
check('RB3 zs130 91/182', eq(vals(z13, R), [91, 182]), vals(z13, R).join('/'))
// RB5: weapon numbers on the default config equal the old constants (1e-3)
const Wk = ['magSize', 'magReloadS', 'laserDpsIn', 'lightDpsIn', 'mortarDpsIn', 'mortarMaxR']
const P0 = resolveParams({})
check('RB5 default weapon numbers reproduced', Wk.every((k) => Math.abs(base[k] - P0[k]) <= 1e-3), Wk.map((k) => `${k} ${base[k]} (was ${P0[k]})`).join(', '))
// every key on the default config: identical to resolveParams for every map that only moves geometry
for (const n of ['base', 'v3dir', 'rot90', 'mirx', 'tr300', 'lift40', 'wide']) {
  const P = anch(cfgOf(n)), d = keys.filter((k) => P[k] !== P0[k])
  check(`default-balance map ${n}: no anchored key changes`, d.length === 0, d.length ? d.map((k) => `${k} ${P0[k]} -> ${P[k]}`).join(', ') : 'all 16 keys equal')
}
// A1: a key moved by a SELECT preset is left alone (synthetic preset zoneLateR 90 on the zs130 config, which anchors to 91)
PRESETS.__a1test = { x: { zoneLateR: 90, farmStopT: 333 } }
const a1 = anch(cfgOf('zs130'), { select: { __a1test: 'x' } })
const a1b = anch(cfgOf('zt070'), { select: { __a1test: 'x' } })
check('A1 synthetic preset zoneLateR 90 keeps 90 (zs130 would give 91)', a1.zoneLateR === 90, `zoneLateR ${a1.zoneLateR}, scanLateR ${a1.scanLateR}`)
check('A1 synthetic preset farmStopT 333 keeps 333 under zt070 (else 147)', a1b.farmStopT === 333 && a1b.scanLateT === 168, `farmStopT ${a1b.farmStopT}, scanLateT ${a1b.scanLateT}`)
const ov = anch(cfgOf('zt070'), { fpStartT: 111 })
check('A1 plain override kept', ov.fpStartT === 111 && ov.ffaFinalT === 273, `fpStartT ${ov.fpStartT}, ffaFinalT ${ov.ffaFinalT}`)
// the same through createBrain (anchoring happens there)
const hz = JSON.parse(readFileSync(join(MAPS, 'zs130', 'hello.json'), 'utf8'))
const br = createBrain(hz, { world: null, nav: null, log: () => {} }, { warmup: false, select: { __a1test: 'x' } })
const br2 = createBrain(hz, { world: null, nav: null, log: () => {} }, { warmup: false })
check('A1 through createBrain: preset 90 kept, plain 91', br._B.P.zoneLateR === 90 && br2._B.P.zoneLateR === 91, `${br._B.P.zoneLateR} / ${br2._B.P.zoneLateR}`)
delete PRESETS.__a1test
// RB3 clamp (moderator 21:58): radii only with >= 5 phases, zoneLateR in [40, 120], scanLateR in [90, 220]
{
  const c0 = cfgOf('base')
  const ph4 = JSON.parse(JSON.stringify(c0)); ph4.zone.phases = ph4.zone.phases.slice(0, 4)
  const P4 = anch(ph4)
  check('RB3 4-phase schedule: radii not anchored (stay 70 / 140)', P4.zoneLateR === 70 && P4.scanLateR === 140, `zoneLateR ${P4.zoneLateR}, scanLateR ${P4.scanLateR}`)
  const big = JSON.parse(JSON.stringify(c0)); big.zone.phases = big.zone.phases.slice(0, 5); big.zone.phases[2].radius = 400; big.zone.phases[1].radius = 900
  const Pb = anch(big)
  check('RB3 5-phase schedule with huge radii: clamped to 120 / 220', Pb.zoneLateR === 120 && Pb.scanLateR === 220, `zoneLateR ${Pb.zoneLateR}, scanLateR ${Pb.scanLateR}`)
  const sm = JSON.parse(JSON.stringify(c0)); sm.zone.phases[3].radius = 10; sm.zone.phases[2].radius = 20
  const Ps = anch(sm)
  check('RB3 6-phase schedule with tiny radii: clamped to 40 / 90', Ps.zoneLateR === 40 && Ps.scanLateR === 90, `zoneLateR ${Ps.zoneLateR}, scanLateR ${Ps.scanLateR}`)
}
// A2: every clock key of the scaled list exists in PARAMS
check('A2 scaled list keys exist in PARAMS', ANCHOR_SCALED.every((k) => typeof PARAMS[k] === 'number'), ANCHOR_SCALED.join(', '))
console.log(`\n${pass}/${pass + fail} anchor checks passed`)
process.exit(fail ? 1 : 0)
