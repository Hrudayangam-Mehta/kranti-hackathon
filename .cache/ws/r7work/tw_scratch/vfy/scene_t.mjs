// Verifier synthetic scenes for the TW layer (real map, 5.38 file SELECT of the given trees, warmup off, fuse off).
//   bun scene_t.mjs
// S1 "latch inside the window": three hostile lines, hp 58%; at decision 6 alive 12 -> 9 (three foreign deaths in one
//    observation: B.foreignDeaths 3 >= ffaLatchDeaths 3, t < ffaLatchT, so stance.environment() latches FFA in that decision).
//    For one override set: (a) which override values are READ while B.env === 'FFA' (trace tree, Proxy); (b) ckpt_08 tree vs
//    the ideal-revert instrument tree (restore right after environment()): outputs of decisions 0-5 must be equal; decision 6
//    onward shows what the override did after the latch.
// S2 "latch keys": the same scene with alive 12 -> 11 at decision 6 (one foreign death): base latches only at 3 deaths;
//    sqOverrides { ffaLatchDeaths: 1 } makes this decision latch FFA permanently.
// S3 "ffaLatchT 0": alive 12 -> 11 -> 10 -> 9 at decisions 6 / 9 / 12: base closes the gate at 6 and latches FFA at 12;
//    sqOverrides { ffaLatchT: 0 } keeps the gate open through all three deaths and never latches.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const V = W + '/tw_scratch/vfy'
const L08 = V + '/v538_08/bot/lib', LID = V + '/v538_ideal/lib', LTR = V + '/v538_trace/lib'
const { World } = await import(W + '/ref_bot/lib/world.js'), { Nav } = await import(W + '/ref_bot/lib/nav.js')
const B08 = (await import(L08 + '/brain.js')).createBrain, BID = (await import(LID + '/brain.js')).createBrain, BTR = (await import(LTR + '/brain.js')).createBrain
const lines = gunzipSync(readFileSync(W + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(W + '/kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
// scene: three mechs with clear lines at 80 / 100 / 120 m (same construction as tw_scratch/test_tw8.mjs, written anew)
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
const clr = (x, y, z) => world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5)
const pts = []
for (const r of [80, 100, 120]) for (let k = 0; k < 72; k++) {
  const a = k * Math.PI / 36 + pts.length * 0.05, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y)) continue
  const z = nav.levelAt(x, y)
  if (z - world.ground(x, y) < 1 && clr(x, y, z) && pts.every((p) => Math.hypot(p.x - x, p.y - y) > 30)) { pts.push({ x, y, z, a }); break }
}
const Wp = cfg.weapons
function obsAt(k, aliveFn, hpf) {
  const t = 40 + k * 0.1
  return { type: 'obs', tick: 2 * k, t, alive: aliveFn(k),
    self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * hpf, max_hp: 1400, energy: 100, max_energy: 100, grounded: true, cubes: 0, upgrades: [], in_zone: true,
      weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech },
    mechs: pts.map((p, i) => ({ id: 30 + i, kind: 'mech', pos: [p.x + (k % 3), p.y, p.z], vel: [0, 0, 0], aim: [p.a + Math.PI, 0], hp: 1400 - 60 * Math.min(k, 10), max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })),
    projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], drops: [], offer: null,
    events: pts.map((p, i) => ({ type: 'damaged', amount: 45, weapon: 'gun', bearing: p.a, by: 30 + i })),
    zone: { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 } }
}
const same = (a, b) => a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))
function run(cb, sq, aliveFn, n, trace) {
  let reads = null, Bref = null, base = null
  if (trace) {
    reads = []
    globalThis.__twHook = (P0) => new Proxy(P0, { get(t, k, r) {
      if (Bref && base && sq && typeof k === 'string' && Object.prototype.hasOwnProperty.call(sq, k) && Bref.env === 'FFA' && same(t[k], sq[k]) && !same(sq[k], base[k]))
        reads.push({ dec: Bref.tick - 1, k, by: new Error().stack.split('\n').slice(2, 4).map((s) => s.trim().replace(/^at /, '').replace(/\(.*\/lib\//, '(')).join(' < ') })
      return Reflect.get(t, k, r) } })
  }
  const b = cb(hello, { world, nav, log: () => {} }, { warmup: false, fuseMs: 1e9, ...(sq ? { sqOverrides: sq } : {}) })
  const B = b._B
  if (trace) { base = {}; for (const k of Object.keys(sq || {})) base[k] = B.P[k]; Bref = B }
  const acts = [], env = [], on = []
  for (let k = 0; k < n; k++) { const a = b.act(obsAt(k, aliveFn, 0.58), performance.now() + 1e6); acts.push(JSON.stringify(a) + '|' + B.mode + '|' + B.legKind + '|' + B.stance + '|' + B.eff.rLo + ',' + B.eff.rHi + ',' + B.eff.rPref); env.push(B.env[0]); on.push(B.twOn ? 1 : 0) }
  if (trace) delete globalThis.__twHook
  return { acts, env: env.join(''), on: on.join(''), B, reads }
}
const firstDiff = (x, y) => { for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i; return -1 }
if (pts.length !== 3) { check('scene: three clear lines', false, `found ${pts.length}`); process.exit(1) }

// ---- S1: three foreign deaths in one observation (FFA latch inside the stance stage of decision 6)
{
  const sq = { bandHi: 130, bandLo: 90, rPrefGun: 110, ffaFinishHpf: 0.9, ffaThree: false, stanceHold: 30, stanceUp: 0.2 }
  const al = (k) => (k >= 6 ? 9 : 12)
  const a0 = run(B08, null, al, 16), a8 = run(B08, sq, al, 16), aI = run(BID, sq, al, 16), tr = run(BTR, sq, al, 16, true)
  check('S1 base: FFA latched at decision 6 (three foreign deaths at once)', a0.env === 'SSSSSS' + 'F'.repeat(10), `env ${a0.env}`)
  check('S1 ckpt_08 with override: layer on 0-5, off from 6, latch at 6', a8.on === '111111' + '0'.repeat(10) && a8.env === a0.env, `on ${a8.on} env ${a8.env}`)
  const fr = [...new Set(tr.reads.filter((r) => r.dec === 6).map((r) => r.k + ' via ' + r.by.split(' < ')[0]))]
  check('S1 (a) no override value is read in the FFA posture (decision 6 onward)', tr.reads.length === 0,
    `${tr.reads.length} reads in FFA posture: ${fr.join('; ')}; decisions ${[...new Set(tr.reads.map((r) => r.dec))].join(',')}`)
  const d = firstDiff(a8.acts, aI.acts)
  check('S1 (b) ckpt_08 equals the ideal-revert instrument (an override cannot change a decision after the latch)', d === -1,
    d < 0 ? 'identical' : `first difference at decision ${d}: ckpt_08 ${a8.acts[d]}  vs ideal ${aI.acts[d]}; differing decisions ${a8.acts.filter((s, i) => s !== aI.acts[i]).length} of 16`)
}
// ---- S1b: the same with the single top-12 candidate bandHi 115 only
{
  const sq = { bandHi: 115 }
  const al = (k) => (k >= 6 ? 9 : 12)
  const a8 = run(B08, sq, al, 16), aI = run(BID, sq, al, 16), tr = run(BTR, sq, al, 16, true)
  const d = firstDiff(a8.acts, aI.acts)
  check('S1b candidate bandHi 115: not read in the FFA posture, ckpt_08 equals ideal-revert', tr.reads.length === 0 && d === -1,
    `reads in FFA posture ${tr.reads.length} (${[...new Set(tr.reads.map((r) => r.k + '@' + r.dec + ' via ' + r.by.split(' < ')[0]))].join('; ')}); first output difference ${d}${d >= 0 ? ': ' + a8.acts[d] + ' vs ' + aI.acts[d] : ''}`)
}
// ---- S2: ffaLatchDeaths 1 at one foreign death
{
  const al = (k) => (k >= 6 ? 11 : 12)
  const a0 = run(B08, null, al, 16), a1 = run(B08, { ffaLatchDeaths: 1 }, al, 16)
  check('S2 base: one foreign death closes the gate and does NOT latch FFA', a0.env === 'S'.repeat(16), `env ${a0.env}`)
  check('S2 sqOverrides { ffaLatchDeaths: 1 } (accepted by checkSqOverrides) must not change the posture', a1.env === a0.env,
    `env with override ${a1.env} (FFA from decision ${a1.env.indexOf('F')}); layer on ${a1.on}; differing decisions ${a1.acts.filter((s, i) => s !== a0.acts[i]).length} of 16`)
}
// ---- S3: ffaLatchT 0
{
  const al = (k) => (k >= 12 ? 9 : k >= 9 ? 10 : k >= 6 ? 11 : 12)
  const a0 = run(B08, null, al, 20), a1 = run(B08, { ffaLatchT: 0 }, al, 20)
  check('S3 base: gate closes at the first foreign death (6), FFA latch at the third (12)', a0.on === '' + '0'.repeat(20) && a0.env === 'S'.repeat(12) + 'F'.repeat(8) && a0.B.foreignDeaths === 3, `env ${a0.env}, foreign deaths ${a0.B.foreignDeaths}`)
  check('S3 sqOverrides { ffaLatchT: 0 } (accepted) must still close the gate at the first foreign death and keep the latch', a1.on.slice(6) === '0'.repeat(14) && a1.env === a0.env,
    `layer on ${a1.on}; env ${a1.env}; B.foreignDeaths ${a1.B.foreignDeaths}; twFlips ${a1.B.counters.twFlips}; differing decisions ${a1.acts.filter((s, i) => s !== a0.acts[i]).length} of 20`)
}
console.log(`\n${pass}/${pass + fail} verifier scene checks passed`)
