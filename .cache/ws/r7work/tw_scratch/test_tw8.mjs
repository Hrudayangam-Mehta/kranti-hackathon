// R7a checkpoint 08 TW: SQUAD-only override layer (params.js sqOverrides / SQ_REFUSED / checkSqOverrides, brain.js twSync).
//   bun test_tw8.mjs <bot dir> [reference bot dir for the tw-off resolved-params check, default r7work/ckpt_07_LG]
// (a) an override changes SQUAD decisions in a synthetic scene on the real map; (b) forced FFA with the override is
// byte-identical to no override; (c) after a foreign death the override is reverted (and the late zone / 3 alive close it
// too); plus resolve-time collection, refusal and the tw-off identity of the resolved params.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const BOT = process.argv[2] || join(W, 'ckpt_08_TW'), REF = process.argv[3] || join(W, 'ckpt_07_LG')
const imp = (d, f) => import(pathToFileURL(join(d, 'lib', f)).href)
const { World } = await imp(BOT, 'world.js'), { Nav } = await imp(BOT, 'nav.js'), { createBrain } = await imp(BOT, 'brain.js')
const PM = await imp(BOT, 'params.js'), PR = await imp(REF, 'params.js')
const { PRESETS, SELECT, PARAMS, SQ_REFUSED, resolveParams, checkSqOverrides } = PM
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const SELS = { DEF: {}, KS, KB: { ...KS, aggr: 'any70' }, KSF: { ...KS, aggr: 'any70f', fb: 'on' } }
const OV = { lose3Hpf: 0.5 }                                     // the generic override of the decision-time scenes

// ---- 0. the rehearsal (first brain of the process) with an override: runs, and the main P keeps its base value until act()
{
  const logs = []
  const b = createBrain(hello, { world, nav, log: (s) => logs.push(String(s)) }, { select: KS, sqOverrides: OV })
  const st = b.debugState()
  check('rehearsal with an override runs; main P untouched before the first decision', !!st.rehearsal && !logs.some((s) => /failed/.test(s)) && b._B.P.lose3Hpf === 0.6 && b._B.twOn === false,
    `rehearsal ${st.rehearsal ? Math.round(st.rehearsal.ms) + ' ms' : 'none'}, failures ${logs.filter((s) => /failed/.test(s)).length}, lose3Hpf ${b._B.P.lose3Hpf}`)
}

// ---- 1. resolve time
{
  const sk = Object.keys(SELECT)
  check('tw preset: only "off" (empty), SELECT tw "off", placed just before healDoc (still the last key)', JSON.stringify(PRESETS.tw) === '{"off":{}}' && SELECT.tw === 'off' && sk[sk.length - 1] === 'healDoc' && sk[sk.length - 2] === 'tw',
    `tw ${JSON.stringify(PRESETS.tw)}, last keys ${sk.slice(-3).join(',')}`)
  const rows = []
  let same = true
  for (const [n, sel] of Object.entries(SELS)) {
    const a = resolveParams({ select: sel }), b = PR.resolveParams({ select: sel })
    const ka = Object.keys(a).filter((k) => k !== 'selected'), kb = Object.keys(b).filter((k) => k !== 'selected')
    const ok = ka.length === kb.length && ka.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k])) && !('sqOverrides' in a)
    if (!ok) same = false
    rows.push(`${n} ${ok ? 'same' : 'DIFF'} (${ka.length} keys)`)
  }
  check('tw off: resolved params identical to the reference tree, no sqOverrides key (DEF / KS / KB / KSF)', same, rows.join(', '))
  // collection over presets, SELECT order, later presets win; plain keys of the same preset value still apply to P
  PRESETS.tw.tA = { sqOverrides: { lose3Hpf: 0.5, h50SeekFromS: 10 } }
  PRESETS.healDoc.tB = { healEnterHp: 0.5, sqOverrides: { lose3Hpf: 0.45 } }
  PRESETS.aggr.tC = { sqOverrides: { h50SeekFromS: 15, killCubeR: 150 } }
  const c1 = resolveParams({ select: { tw: 'tA' } }), c2 = resolveParams({ select: { aggr: 'tC', tw: 'tA', healDoc: 'tB' } })
  check('collection: merged in SELECT order (aggr < tw < healDoc), later wins; plain preset keys still go to P; frozen copy',
    JSON.stringify(c1.sqOverrides) === '{"lose3Hpf":0.5,"h50SeekFromS":10}' && JSON.stringify(c2.sqOverrides) === '{"h50SeekFromS":10,"killCubeR":150,"lose3Hpf":0.45}' &&
    c2.healEnterHp === 0.5 && c2.lose3Hpf === 0.6 && c2.h50SeekFromS === 20 && Object.isFrozen(c2.sqOverrides),
    `tw tA ${JSON.stringify(c1.sqOverrides)}; aggr tC + tw tA + healDoc tB ${JSON.stringify(c2.sqOverrides)}, P.healEnterHp ${c2.healEnterHp}, P.lose3Hpf ${c2.lose3Hpf}`)
  const c3 = resolveParams({ select: { tw: 'tA' }, sqOverrides: { killCubeR: 120 } })
  check('a plain overrides.sqOverrides replaces the preset set (the rehearsal copies P this way)', JSON.stringify(c3.sqOverrides) === '{"killCubeR":120}', JSON.stringify(c3.sqOverrides))
  // refusal
  const refused = []
  for (const k of Object.keys(SQ_REFUSED)) {
    const v = PARAMS[k] === null ? {} : PARAMS[k]
    try { resolveParams({ sqOverrides: { [k]: v } }); refused.push(`${k}:ACCEPTED`) } catch (e) { if (!/refused/.test(e.message)) refused.push(`${k}:${e.message}`) }
  }
  check(`refusal: every SQ_REFUSED key (${Object.keys(SQ_REFUSED).length}) throws at resolve time`, refused.length === 0, refused.length ? refused.join(' ') : Object.keys(SQ_REFUSED).join(' '))
  const viaPreset = (() => { PRESETS.tw.tBad = { sqOverrides: { hideMaxR: 80 } }; try { resolveParams({ select: { tw: 'tBad' } }); return 'accepted' } catch (e) { return e.message } })()
  const typo = (() => { try { resolveParams({ sqOverrides: { lose3hpf: 0.5 } }); return 'accepted' } catch (e) { return e.message } })()
  const type = (() => { try { checkSqOverrides({ lose3Hpf: '0.5' }); return 'accepted' } catch (e) { return e.message } })()
  const nan = (() => { try { checkSqOverrides({ lose3Hpf: NaN }); return 'accepted' } catch (e) { return e.message } })()
  const arr = (() => { try { checkSqOverrides({ ffaProx: 70 }); return 'accepted' } catch (e) { return e.message } })()
  check('refusal through a preset value, a typo key, a string / NaN number, a scalar for an array key', [viaPreset, typo, type, nan, arr].every((m) => /refused/.test(m)), [viaPreset, typo, type, nan, arr].join(' | '))
  check('the init-only list covers the init reads found by the P-read trace (warmup ... anchorCfg) and the firewall keys',
    ['warmup', 'rehearseN', 'rehearseFfaN', 'warmPocket', 'rngSalt', 'salt', 'anchorCfg', 'arenaMargin', 'hideMaxR', 'hideStep', 'aimLadder', 'gunLadderTop', 'ffaCounters', 'counterParams', 'cxFinish', 'cxKiterRamp', 'cxBrawler', 'env', 'h50ForeignMax', 'h50LateAlive', 'zoneLateR'].every((k) => k in SQ_REFUSED),
    `${Object.keys(SQ_REFUSED).length} refused keys`)
  delete PRESETS.tw.tA; delete PRESETS.healDoc.tB; delete PRESETS.aggr.tC; delete PRESETS.tw.tBad
}

// ---- 2. decision time: three hostile mechs with lines at 80 / 100 / 120 m hitting us, our hp 58% (KS: lose3Hpf 0.6 -> LOSING)
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const clearTo = (x, y, z) => world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5)
const pts = []
for (const r of [80, 100, 120]) for (let k = 0; k < 72; k++) {
  const a = k * Math.PI / 36 + pts.length * 0.05, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y)) continue
  const z = nav.levelAt(x, y)
  if (z - world.ground(x, y) < 1 && clearTo(x, y, z) && pts.every((p) => Math.hypot(p.x - x, p.y - y) > 30)) { pts.push({ x, y, z, a }); break }
}
const Wp = cfg.weapons
function obsAt(k, opts) {
  const t = 40 + k * 0.1
  const alive = opts.aliveAt !== undefined && k >= opts.aliveAt ? opts.aliveTo : 12
  const nr = opts.zoneAt !== undefined && k >= opts.zoneAt ? 60 : 400
  return { type: 'obs', tick: 2 * k, t, alive,
    self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * opts.hpf, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
      weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech },
    mechs: pts.map((p, i) => ({ id: 30 + i, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [p.a + Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })),
    projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], drops: [], offer: null,
    events: pts.map((p, i) => ({ type: 'damaged', amount: 45, weapon: 'gun', bearing: p.a, by: 30 + i })),
    zone: { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: nr, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 } }
}
function run(sq, env, opts) {
  const ov = { warmup: false, fuseMs: 1e9, select: KS, ...(env ? { env } : {}), ...(sq ? { sqOverrides: sq } : {}) }   // fuse off: the machine is shared
  const b = createBrain(hello, { world, nav, log: () => {} }, ov), B = b._B
  const acts = [], modes = [], p3 = [], on = []
  for (let k = 0; k < (opts.n || 14); k++) {
    const a = b.act(obsAt(k, opts), performance.now() + 1e6)
    acts.push(JSON.stringify(a) + B.mode + B.legKind); modes.push(B.mode[0]); p3.push(B.P.lose3Hpf); on.push(B.twOn ? 1 : 0)
  }
  return { s: acts.join('|'), modes: modes.join(''), p3, on: on.join(''), B, b }
}
if (pts.length === 3) {
  const base = run(null, null, { hpf: 0.58 }), ovr = run(OV, null, { hpf: 0.58 })
  check('(a) SQUAD: the override changes the decisions (lose3Hpf 0.6 -> 0.5 at 58% hp, three lines: no LOSING retreat)',
    base.s !== ovr.s && base.modes.includes('D') && !ovr.modes.includes('D') && ovr.on === '1'.repeat(14) && ovr.B.counters.twFlips === 1 && ovr.B.counters.twDecisions === 14,
    `modes base ${base.modes} / override ${ovr.modes}; layer on ${ovr.on}; flips ${ovr.B.counters.twFlips}`)
  const ff0 = run(null, 'ffa', { hpf: 0.58 }), ff1 = run(OV, 'ffa', { hpf: 0.58 })
  check('(b) forced FFA: with the override byte-identical to no override (actions, modes, legs), P never written', ff0.s === ff1.s && ff1.on === '0'.repeat(14) && !ff1.B.counters.twFlips && ff1.p3.every((v) => v === 0.6),
    `FFA modes ${ff0.modes} / ${ff1.modes}, identical ${ff0.s === ff1.s}, flips ${ff1.B.counters.twFlips || 0}`)
  // control: the same value as a plain preset twin (not SQUAD-only) acts in forced FFA; ffaRules off so that the d3 LOSING
  // thresholds decide the FFA mode here (with the FFA rules on, rule 4's line break retreats at 58% either way)
  PRESETS.fb.tPlain = { lose3Hpf: 0.5 }
  const runSel = (sel, env, sq) => { const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, select: { ...KS, ...sel }, ...(env ? { env } : {}), ...(sq ? { sqOverrides: sq } : {}) }); const o = [], m = []; for (let k = 0; k < 14; k++) { const a = b.act(obsAt(k, { hpf: 0.58 }), performance.now() + 1e6); o.push(JSON.stringify(a) + b._B.mode + b._B.legKind); m.push(b._B.mode[0]) } return { s: o.join('|'), m: m.join(''), p3: b._B.P.lose3Hpf } }
  const fBase = runSel({ ffaRules: 'off' }, 'ffa'), fPlain = runSel({ ffaRules: 'off', fb: 'tPlain' }, 'ffa'), fOv = runSel({ ffaRules: 'off' }, 'ffa', OV)
  check('control (forced FFA, ffaRules off): as a plain preset the value acts in FFA, as a SQUAD-only override it does not', fPlain.s !== fBase.s && fOv.s === fBase.s && fPlain.p3 === 0.5 && fOv.p3 === 0.6,
    `FFA modes base ${fBase.m} / plain preset ${fPlain.m} / override ${fOv.m}; P.lose3Hpf ${fPlain.p3} / ${fOv.p3}`)
  delete PRESETS.fb.tPlain
  // (c) a foreign death at decision 6 (alive 12 -> 11, no kill of ours): reverted in that decision, after the stance stage
  const fd = run(OV, null, { hpf: 0.58, aliveAt: 6, aliveTo: 11 }), fd0 = run(null, null, { hpf: 0.58, aliveAt: 6, aliveTo: 11 })
  const pSame = Object.keys(fd0.B.P).every((k) => k === 'sqOverrides' || JSON.stringify(fd.B.P[k]) === JSON.stringify(fd0.B.P[k]))
  check('(c) foreign death: reverted at the death decision (P back to base, every key), FIGHT until it, LOSING retreat from the next decision as without override',
    fd.B.foreignDeaths === 1 && fd.on === '111111' + '0'.repeat(8) && fd.p3.slice(0, 6).every((v) => v === 0.5) && fd.p3.slice(6).every((v) => v === 0.6) && pSame &&
    !fd.modes.slice(0, 7).includes('D') && fd.modes.slice(7) === fd0.modes.slice(7) && fd.B.counters.twFlips === 2,
    `layer on ${fd.on}, lose3Hpf ${fd.p3.join(',')}, modes ${fd.modes} vs no override ${fd0.modes}, flips ${fd.B.counters.twFlips}, P equal ${pSame}`)
  const lz = run(OV, null, { hpf: 0.58, zoneAt: 6 }), a3 = run(OV, null, { hpf: 0.58, aliveAt: 6, aliveTo: 3 })
  check('(c2) late zone (next radius 400 -> 60 at decision 6) and 3 alive close the firewall: reverted in that decision',
    lz.on === '111111' + '0'.repeat(8) && lz.p3[6] === 0.6 && a3.on === '111111' + '0'.repeat(8) && a3.p3[6] === 0.6 && lz.B.counters.twFlips === 2 && a3.B.counters.twFlips === 2,
    `zone: on ${lz.on} lose3Hpf@6 ${lz.p3[6]}; alive 3: on ${a3.on} lose3Hpf@6 ${a3.p3[6]}`)
  // the in-flight decision of the zone case: sense saw the 60 m radius, so assess / mode of decision 6 already ran on base values
  check('(c3) O(keys): one write per key per flip (flips 1 on, 1 off), no per-decision writes', ovr.B.counters.twFlips === 1 && fd.B.counters.twFlips === 2, `flips ${ovr.B.counters.twFlips} / ${fd.B.counters.twFlips}`)
  const off = run({}, null, { hpf: 0.58 })
  check('empty override set {} = no layer (no flips, identical stream)', off.s === base.s && !off.B.counters.twFlips, `identical ${off.s === base.s}`)
} else check('scene: three clear lines found', false, `found ${pts.length}`)

console.log(`\n${pass}/${pass + fail} TW checks passed`)
process.exit(fail ? 1 : 0)
