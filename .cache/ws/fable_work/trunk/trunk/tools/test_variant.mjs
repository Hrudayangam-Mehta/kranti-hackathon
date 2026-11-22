// Trunk G1v unit + G2b: bun test_variant.mjs [trunkLib] [mxLib] [ch1Lib] [ctlLib]
//  U1 every table character x slot: seed (first B.rng draws) and resolved P equal MX_base with the same table (pure salts),
//     or CH1_s1 (declared letters b / c, env auto/squad), or the salt-1 base (declared letters under forced FFA)
//  U2 every VARIANTS select entry is a FW_PRESETS value and a real PRESETS option
//  G2b 'b' on the kit stream (real foreign death): the guard fires on the first decision with hunt.firewall() down, afterwards
//     P deep-equals the base P, B.lgsOn / B.lgsSweep are not left true, the variant never returns
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const [TRL, MXL, CHL, CTL] = [process.argv[2] || S + '/fable_work/trunk/trunk/tree/lib', process.argv[3] || S + '/variants7/MX_base/lib',
  process.argv[4] || S + '/fable_work/chaos/builds/CH1_s1/bot/lib', process.argv[5] || '']
const tr = await import(TRL + '/brain.js'), mx = await import(MXL + '/brain.js'), ch = await import(CHL + '/brain.js')
const trP = await import(TRL + '/params.js')
const lines = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello0 = lines.find((l) => l.type === 'hello'), obs = lines.filter((l) => l.type === 'obs')
let pass = 0, fail = 0
const fails = []
const check = (name, ok, detail) => { if (ok) pass++; else { fail++; if (fails.length < 40) fails.push(name + ' :: ' + detail) } }
const NEW = new Set(['saltTable', 'variantTable', 'variantRevert', 'selected'])
const draws = (b) => { const r = b._B.rng; return [r(), r(), r(), r()].map((x) => x.toFixed(12)).join(',') }
const mk = (lib, slot, ov) => lib.createBrain({ ...hello0, slot }, { world: null, nav: null, log: () => {} }, { warmup: false, ...ov })
const pick = (P, keys) => JSON.stringify(keys.map((k) => [k, P[k]]))
const trBase = trP.resolveParams({})
function cmpP(Pa, Pb, refKeys) {                       // every key of the reference except the table keys; extra keys of a at the trunk default
  const ks = Object.keys(refKeys).filter((k) => !NEW.has(k))
  const bad = ks.filter((k) => JSON.stringify(Pa[k]) !== JSON.stringify(Pb[k]))
  return bad
}
// ---- U1
const chars = ['', '0', ...'123456789', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', '-', ' ', '.']
const slots = [-1, ...Array.from({ length: 16 }, (_, i) => i), 16, 3.5, undefined]
const chB = mk(ch, 3, {}), chSeed = draws(chB), chPk = chB._B.P
let nU = 0
for (const slot of slots) for (const c of chars) for (const key of ['saltTable', 'variantTable']) {
  if (key === 'variantTable' && c !== 'b' && c !== '2' && c !== 'Z') continue   // variantTable: a few chars (no MX twin; checked against saltTable)
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
      check(name + ' no variant', A.variantLive === false && A.variant.select === null && A.variantKeys.length === 0, JSON.stringify(A.variant))
    } else if (env === 'ffa') {
      const b = mk(tr, slot, { saltTable: '1'.repeat(16), env: 'ffa' }), sb = draws(b)
      check(name + ' T-F2 seed = salt 1', sa === sb, `${sa} vs ${sb}`)
      const bad = cmpP(A.P, b._B.P, b._B.P)
      check(name + ' T-F2 P = base', bad.length === 0, 'keys ' + bad.join(','))
      check(name + ' T-F2 not live', A.variantLive === false, '')
    } else {
      const cb = env === 'squad' ? mk(ch, 3, { select: { env: 'squad' } }) : chB
      check(name + ' seed = CH1', sa === chSeed, `${sa} vs ${chSeed}`)
      const bad = cmpP(A.P, cb._B.P, cb._B.P)
      check(name + ' P = CH1', bad.length === 0, 'keys ' + bad.join(','))
      check(name + ' selected = CH1', JSON.stringify(A.P.selected) === JSON.stringify(cb._B.P.selected), '')
      const want = ['boostCharge', 'focusKill', 'lgSpawn', 'cubeSnow', 'sqCratePath', 'sqFarmHp', 'sqLaserMid', 'upgFix', 'upgradeOrderSq'].sort().join(',')
      check(name + ' live, revert keys', A.variantLive === true && A.variantKeys.slice().sort().join(',') === want, A.variantKeys.join(','))
      check(name + ' upgOrder / upgOrderSq = CH1', JSON.stringify([A.upgOrder, A.upgOrderSq]) === JSON.stringify([cb._B.upgOrder, cb._B.upgOrderSq]), '')
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
// ---- G2b on the kit stream (world + nav, warm-up as in a match), and the same run of the control lib if given
async function g2b(lib, label) {
  const { World } = await import(lib + '/world.js'), { Nav } = await import(lib + '/nav.js'), { createBrain } = await import(lib + '/brain.js')
  const world = World.loadSync(S + '/mechbot/kit/arena')
  const mc = hello0.config.mech
  const b = createBrain(hello0, { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, { fuseMs: 1e9, saltTable: '111b111111111111' })
  const base = tr.createBrain(hello0, { world: null, nav: null, log: () => {} }, { fuseMs: 1e9, saltTable: '1'.repeat(16) })   // module already warmed
  const B = b._B
  let offAt = -1, fwDownFirst = -1, back = false, lgsLeft = 0, okAfter = true
  for (let i = 0; i < obs.length; i++) {
    const wasLive = B.variantLive
    b.act(JSON.parse(JSON.stringify(obs[i])), performance.now() + 1e6)
    const fw = B.hunt.firewall()
    if (!fw && fwDownFirst < 0) fwDownFirst = i
    if (wasLive && !B.variantLive) offAt = i
    if (!wasLive && B.variantLive) back = true
    if (offAt >= 0 && i >= offAt) {
      if (B.lgsOn === true || B.lgsSweep === true) lgsLeft++
      const bad = Object.keys(base._B.P).filter((k) => !NEW.has(k) && JSON.stringify(B.P[k]) !== JSON.stringify(base._B.P[k]))
      if (bad.length) { okAfter = false; if (i === offAt) console.log(label, 'P differs from base after the guard:', bad.join(',')) }
    }
  }
  return { label, decisions: obs.length, offAt, fwDownFirst, back, lgsLeft, okAfter, offTick: B.counters.variantOffTick, lgsOnCount: B.counters.lgsOn || 0 }
}
const g = await g2b(TRL, 'trunk')
console.log('G2b', JSON.stringify(g))
check('G2b guard fired', g.offAt >= 0, JSON.stringify(g))
check('G2b guard on the first decision with the firewall down (or the next one)', g.offAt === g.fwDownFirst || g.offAt === g.fwDownFirst + 1, `off ${g.offAt} fw down ${g.fwDownFirst}`)
check('G2b P = base after the guard', g.okAfter, '')
check('G2b lgs flags not left true', g.lgsLeft === 0, String(g.lgsLeft))
check('G2b never returns', !g.back, '')
if (CTL) { const gc = await g2b(CTL, 'control'); console.log('G2b control', JSON.stringify(gc)) }
console.log(`PASS ${pass}  FAIL ${fail}`)
for (const f of fails) console.log('FAIL ' + f)
process.exit(fail ? 1 : 0)
