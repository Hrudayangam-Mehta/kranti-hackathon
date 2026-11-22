// Integrator copy of trunk/tools/test_variant.mjs for the merged tree (trunk + lib/survive.js).
// bun test_variant_m.mjs [mergedLib] [mxLib] [ch1Lib] [sv4Lib]
//  U1 every table character x slot x env: pure salts (digits, UPPER-case, undeclared lower-case) -> seed and P equal MX_base with
//     the same table; 'b' -> CH1_s1; 'c' -> SV4 (survive tree, CH1 SELECT + svDrop first, svRegen hold, svFire rhythm, svFarm laser);
//     declared letters under forced FFA -> the salt-1 base (B.sv not created)
//  U2 every VARIANTS select entry is a FW_PRESETS value and a real PRESETS option
//  G2b 'b' and 'c' in slot 3 on the kit stream: guard fires on the first decision with the firewall down, P deep-equals the base
//     afterwards, lgs flags not left true, never returns; for 'c': B.sv not live after the guard, no sv counter moves, B.dl not ours
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const [TRL, MXL, CHL, SVL] = [process.argv[2] || S + '/fable_work/trunk/trunk/merged/lib', process.argv[3] || S + '/variants7/MX_base/lib',
  process.argv[4] || S + '/fable_work/chaos/builds/CH1_s1/bot/lib', process.argv[5] || S + '/fable_work/trunk/survive/builds/SV4/bot/lib']
const tr = await import(TRL + '/brain.js'), mx = await import(MXL + '/brain.js'), ch = await import(CHL + '/brain.js'), sv = await import(SVL + '/brain.js')
const trP = await import(TRL + '/params.js')
const lines = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello0 = lines.find((l) => l.type === 'hello'), obs = lines.filter((l) => l.type === 'obs')
let pass = 0, fail = 0
const fails = []
const check = (name, ok, detail) => { if (ok) pass++; else { fail++; if (fails.length < 40) fails.push(name + ' :: ' + detail) } }
const NEW = new Set(['saltTable', 'variantTable', 'variantRevert', 'selected'])
const draws = (b) => { const r = b._B.rng; return [r(), r(), r(), r()].map((x) => x.toFixed(12)).join(',') }
const mk = (lib, slot, ov) => lib.createBrain({ ...hello0, slot }, { world: null, nav: null, log: () => {} }, { warmup: false, ...ov })
const trBase = trP.resolveParams({})
function cmpP(Pa, Pb, refKeys) {
  const ks = Object.keys(refKeys).filter((k) => !NEW.has(k))
  return ks.filter((k) => JSON.stringify(Pa[k]) !== JSON.stringify(Pb[k]))
}
const WANT_B = ['boostCharge', 'focusKill', 'lgSpawn', 'cubeSnow', 'sqCratePath', 'sqFarmHp', 'sqLaserMid', 'upgFix', 'upgradeOrderSq']
const WANT = { b: WANT_B.slice().sort().join(','), c: [...WANT_B, 'svDropOn', 'svRegenOn', 'svFireOn', 'svFarmOn'].sort().join(',') }
const REF = { b: ch, c: sv }
const refA = { b: mk(ch, 3, {}), c: mk(sv, 3, {}) }
const refSeed = { b: draws(refA.b), c: draws(refA.c) }
const refS = { b: mk(ch, 3, { select: { env: 'squad' } }), c: mk(sv, 3, { select: { env: 'squad' } }) }
// ---- U1
const chars = ['', '0', ...'123456789', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', '-', ' ', '.']
const slots = [-1, ...Array.from({ length: 16 }, (_, i) => i), 16, 3.5, undefined]
let nU = 0
for (const slot of slots) for (const c of chars) for (const key of ['saltTable', 'variantTable']) {
  if (key === 'variantTable' && c !== 'b' && c !== 'c' && c !== '2' && c !== 'Z' && c !== 'K' && c !== 'd') continue
  const s = Number.isInteger(slot) && slot >= 0 && slot < 16 ? slot : 3
  const tab = c === '' ? '' : '1'.repeat(s) + c + '1'.repeat(15 - s)
  for (const env of ['auto', 'squad', 'ffa']) {
    const ovE = env === 'ffa' ? { env: 'ffa' } : env === 'squad' ? { select: { env: 'squad' } } : {}
    const a = mk(tr, slot, { [key]: tab, ...ovE }), A = a._B, sa = draws(a)
    const declared = Number.isInteger(slot) && slot >= 0 && slot < 16 && (c === 'b' || c === 'c')
    const name = `U1 ${key}='${tab}' slot=${slot} env=${env}`
    nU++
    if (!declared) {
      const m = mk(mx, slot, { saltTable: tab, ...ovE }), sm = draws(m)
      check(name + ' seed', sa === sm, `${sa} vs ${sm}`)
      const bad = cmpP(A.P, m._B.P, m._B.P)
      check(name + ' P', bad.length === 0, 'keys ' + bad.join(','))
      const extra = Object.keys(A.P).filter((k) => !(k in m._B.P) && !NEW.has(k) && JSON.stringify(A.P[k]) !== JSON.stringify(trBase[k]))
      check(name + ' extra keys inert', extra.length === 0, extra.join(','))
      check(name + ' no variant, no sv', A.variantLive === false && A.variant.select === null && A.variantKeys.length === 0 && A.sv === undefined && A.regen === undefined, JSON.stringify(A.variant))
    } else if (env === 'ffa') {
      const b = mk(tr, slot, { saltTable: '1'.repeat(16), env: 'ffa' }), sb = draws(b)
      check(name + ' T-F2 seed = salt 1', sa === sb, `${sa} vs ${sb}`)
      const bad = cmpP(A.P, b._B.P, b._B.P)
      check(name + ' T-F2 P = base', bad.length === 0, 'keys ' + bad.join(','))
      check(name + ' T-F2 not live, no sv', A.variantLive === false && A.sv === undefined, '')
    } else {
      const cb = env === 'squad' ? refS[c] : refA[c]
      check(name + ` seed = ref ${c}`, sa === refSeed[c], `${sa} vs ${refSeed[c]}`)
      const bad = cmpP(A.P, cb._B.P, cb._B.P)
      check(name + ` P = ref ${c}`, bad.length === 0, 'keys ' + bad.join(','))
      const sa2 = A.P.selected || {}, sr = cb._B.P.selected || {}
      const selBad = Object.keys(sr).filter((k) => sa2[k] !== sr[k]).concat(Object.keys(sa2).filter((k) => !(k in sr) && sa2[k] !== 'off'))
      check(name + ` selected = ref ${c} (extra keys 'off')`, selBad.length === 0, selBad.join(','))
      check(name + ' live, revert keys', A.variantLive === true && A.variantKeys.slice().sort().join(',') === WANT[c], A.variantKeys.join(','))
      check(name + ` upgOrder / upgOrderSq = ref ${c}`, JSON.stringify([A.upgOrder, A.upgOrderSq]) === JSON.stringify([cb._B.upgOrder, cb._B.upgOrderSq]), '')
      check(name + ` sv created iff c`, (c === 'c') === (A.sv !== undefined) && (c === 'c') === (cb._B.sv !== undefined), `${A.sv !== undefined} ${cb._B.sv !== undefined}`)
    }
  }
}
console.log(`U1 cases ${nU}`)
// ---- U2
for (const [c, v] of Object.entries(trP.VARIANTS)) {
  check(`U2 ${c} lower-case`, c >= 'a' && c <= 'z' && c.length === 1, c)
  check(`U2 ${c} shape`, typeof v.name === 'string' && Number.isInteger(v.salt) && v.salt > 0 && v.select && typeof v.select === 'object', JSON.stringify(v))
  for (const [k, val] of Object.entries(v.select)) {
    check(`U2 ${c}.${k}=${val} in FW_PRESETS`, Array.isArray(trP.FW_PRESETS[k]) && trP.FW_PRESETS[k].includes(val), '')
    check(`U2 ${c}.${k}=${val} is a PRESETS option`, !!(trP.PRESETS[k] && trP.PRESETS[k][val]), '')
  }
}
check('U2 b unchanged (CH1 select)', JSON.stringify(trP.VARIANTS.b.select) === JSON.stringify({ laserRange: 'midsq', farmHp: '50sq', focus: 'kill', upg: 'laser', laserGrab: 'spawn', cubes: 'snow', boostCharge: 'on', cratePath: '80', upgFix: 'on' }), '')
check('U2 c = b + four sv', JSON.stringify(trP.VARIANTS.c.select) === JSON.stringify({ ...trP.VARIANTS.b.select, svDrop: 'first', svRegen: 'hold', svFire: 'rhythm', svFarm: 'laser' }) && trP.VARIANTS.c.salt === 1, JSON.stringify(trP.VARIANTS.c))
// ---- G2b
async function g2b(lib, label, tab) {
  const { World } = await import(lib + '/world.js'), { Nav } = await import(lib + '/nav.js'), { createBrain } = await import(lib + '/brain.js')
  const world = World.loadSync(S + '/mechbot/kit/arena')
  const mc = hello0.config.mech
  const b = createBrain(hello0, { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, { fuseMs: 1e9, saltTable: tab })
  const base = tr.createBrain(hello0, { world: null, nav: null, log: () => {} }, { fuseMs: 1e9, saltTable: '1'.repeat(16) })
  const B = b._B
  let offAt = -1, fwDownFirst = -1, back = false, lgsLeft = 0, okAfter = true, svLiveAfter = 0, svMoved = 0, dlOurs = 0, holdAfter = 0
  const svC = () => JSON.stringify(Object.entries(B.counters).filter(([k]) => k.startsWith('sv')).sort())
  let svSnap = null, svBefore = svC()
  for (let i = 0; i < obs.length; i++) {
    const wasLive = B.variantLive
    b.act(JSON.parse(JSON.stringify(obs[i])), performance.now() + 1e6)
    const fw = B.hunt.firewall()
    if (!fw && fwDownFirst < 0) fwDownFirst = i
    if (wasLive && !B.variantLive) { offAt = i; svSnap = svC() }
    if (!wasLive && B.variantLive) back = true
    if (offAt >= 0 && i >= offAt) {
      if (B.lgsOn === true || B.lgsSweep === true) lgsLeft++
      const bad = Object.keys(base._B.P).filter((k) => !NEW.has(k) && JSON.stringify(B.P[k]) !== JSON.stringify(base._B.P[k]))
      if (bad.length) { okAfter = false; if (i === offAt) console.log(label, 'P differs from base after the guard:', bad.join(',')) }
      if (B.sv) {
        if (B.sv.live()) svLiveAfter++
        if (svC() !== svSnap) svMoved++
        if (B.dl && B.dl.sv === true) dlOurs++
        if (B.regen && B.regen.hold) holdAfter++
      }
    }
  }
  return { label, tab, decisions: obs.length, offAt, fwDownFirst, back, lgsLeft, okAfter, offTick: B.counters.variantOffTick, sv: !!B.sv, svLiveAfter, svMoved, dlOurs, holdAfter,
    svCountersAtGuard: svSnap, svCountersEnd: svC(), svCountersStart: svBefore }
}
for (const [lab, tab] of [['b3', '111b111111111111'], ['c3', '111c111111111111']]) {
  const g = await g2b(TRL, lab, tab)
  console.log('G2b', JSON.stringify(g))
  check(`G2b ${lab} guard fired`, g.offAt >= 0, JSON.stringify(g))
  check(`G2b ${lab} guard on the first decision with the firewall down (or the next one)`, g.offAt === g.fwDownFirst || g.offAt === g.fwDownFirst + 1, `off ${g.offAt} fw down ${g.fwDownFirst}`)
  check(`G2b ${lab} P = base after the guard`, g.okAfter, '')
  check(`G2b ${lab} lgs flags not left true`, g.lgsLeft === 0, String(g.lgsLeft))
  check(`G2b ${lab} never returns`, !g.back, '')
  check(`G2b ${lab} sv iff c`, g.sv === (lab === 'c3'), '')
  if (lab === 'c3') check('G2b c3 after the guard: sv not live, no sv counter moves, B.dl not ours, no hold', g.svLiveAfter === 0 && g.svMoved === 0 && g.dlOurs === 0 && g.holdAfter === 0, JSON.stringify(g))
}
console.log(`PASS ${pass}  FAIL ${fail}`)
for (const f of fails) console.log('FAIL ' + f)
process.exit(fail ? 1 : 0)
