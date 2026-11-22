// checkR3a2 fuzz: N mutated observations per configuration into one stateful brain each (V1 SQUAD auto, V1 forced FFA,
// V1 forced squad env), plus a fuzzed stream file for the bundle over the pipe.
//   bun fuzz.js [N=3000] [outStream.jsonl.gz]
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const N = +(process.argv[2] || 3000), outStream = process.argv[3] || null
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { rng32 } = await import(P + '/tools/arena_micro.js')
const load = (f) => gunzipSync(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const src = [...load(P + '/kit/check/stream.jsonl.gz'), ...load(P + '/tools/check2a/streams/ffa_s1.jsonl.gz'), ...load(P + '/tools/pass2a/out/long11.jsonl.gz').filter((m, i) => i % 7 === 0)]
const hello = src.find((m) => m.type === 'hello')
const pool = src.filter((m) => m.type === 'obs')
const world = World.loadSync(P + '/kit/arena')
const mc = hello.config.mech
const R = rng32(20261121)
const pickA = (a) => a[Math.floor(R() * a.length)]
const JUNK = [null, undefined, NaN, Infinity, -Infinity, -1, 0, 1e9, -1e9, 2.5, '3', 'x', [], {}, true, [NaN, NaN, NaN], [1e12, -1e12, 0]]
const junk = () => pickA(JUNK)
const MUT = [
  (o) => { o.alive = pickA([-1, 0, 1, 2, 3, 4, 16, 64, 65, 2.5, '3', null, undefined, NaN]) },
  (o) => { o.alive = pickA([2, 3]) },                                          // final-only code paths
  (o) => { if (o.zone) o.zone.radius = pickA([0, 0.1, 25, -5, NaN, null, 1e9]) },
  (o) => { if (o.zone) { o.zone.next_radius = pickA([0, 0.3, 70, 71, -1, NaN, null]); o.zone.shrink_start = pickA([o.t, o.t - 1, o.t + 1, NaN, null, '390']) } },
  (o) => { if (o.zone) { o.zone.dps = pickA([0, 60, 260, -10, NaN, 1e9]); o.zone.next_center = pickA([[0, 0], null, [NaN, 0], 'c', [1e9, 1e9]]) } },
  (o) => { o.zone = pickA([null, {}, { center: null }, 7]) },
  (o) => { o.drops = pickA([null, {}, [null], [{ id: 1, pos: [NaN, 0, 0] }], [{ id: 2, pos: [o.self.pos[0] + 50, o.self.pos[1], 0], radius: 8, lands_in: 5, capture_s: 4, progress: 0, holder: -1 }], [{ pos: 'x' }], Array(20).fill({ id: 3, pos: [0, 0, 0] })]) },
  (o) => { if (Array.isArray(o.mechs) && o.mechs.length) { const m = pickA(o.mechs); if (m && typeof m === 'object') m[pickA(['max_hp', 'hp', 'pos', 'vel', 'aim', 'cubes', 'weapons', 'charging', 'id', 'kind'])] = junk() } },
  (o) => { if (Array.isArray(o.mechs) && o.mechs.length) { const m = pickA(o.mechs); if (m) { m.max_hp = pickA([0, 1, 1e6, 3000]); m.hp = pickA([0, -5, 1, m.max_hp, 5000]) } } },
  (o) => { o.mechs = pickA([null, {}, [null, 3, 'm'], []]) },
  (o) => { if (o.self) o.self[pickA(['max_hp', 'hp', 'energy', 'pos', 'vel', 'aim', 'cubes', 'weapons', 'grounded', 'in_zone', 'upgrades', 'id'])] = junk() },
  (o) => { if (o.self) { o.self.max_hp = pickA([1400, 1800, 2400, 0, 1]); o.self.hp = pickA([1, 200, 500, 1400, 3000]) } },
  (o) => { if (o.self && Array.isArray(o.self.weapons)) o.self.weapons = pickA([[null, null], [{ kind: 'laser', charge: NaN }, null], [{ kind: 'gun', ammo: -1 }, { kind: 'laser', charge: 9 }], [{ kind: 'lightning' }, { kind: 'mortar' }], 'w', [{ kind: 'gun', stats: null }, { kind: 'laser', stats: {} }]]) },
  (o) => { o.offer = pickA([null, {}, { id: 1, choices: [] }, { id: 2, choices: [{ id: 'servos' }, { id: 'plating' }, { id: 'nonsense' }] }, { id: 3, choices: 'x' }, { choices: [null, 5] }]) },
  (o) => { o.events = pickA([null, 'e', [null, 1], [{ type: 'damaged', amount: NaN, by: 7, bearing: NaN }], [{ type: 'kill', target: -1 }], [{ type: 'damaged', amount: 300, weapon: 'laser', by: 1e9, bearing: 1 }], Array(200).fill({ type: 'hit', target: 5, amount: 1 })]) },
  (o) => { o.pickups = pickA([null, [{ id: 9, kind: 'laser', pos: [NaN, 0, 0] }], [{ id: 10, kind: 'laser', pos: [o.self.pos[0] + 230, o.self.pos[1], 0] }], [{ kind: 'mortar' }], 'p']) },
  (o) => { o[pickA(['projectiles', 'crates', 'cubes', 'sounds', 'beams'])] = pickA([null, 'x', [null], [{ pos: [NaN, 1, 2] }], Array(300).fill({ id: 1, pos: [0, 0, 0] })]) },
  (o) => { o.t = pickA([o.t, o.t + 0.1, o.t - 50, 0, 405, 376, 410, 1e6, NaN, null]) },
  (o) => { o.tick = pickA([o.tick, -1, 1e9, 2.5, null]) },
  (o) => { delete o[pickA(['self', 'zone', 'mechs', 't', 'tick'])] },
]
function validAction(a) {
  if (!a || typeof a !== 'object') return 'not an object'
  if (!Array.isArray(a.move) || a.move.length !== 2 || !a.move.every(Number.isFinite)) return 'move'
  if (Math.hypot(a.move[0], a.move[1]) > 1 + 1e-9) return 'move length'
  if (!Array.isArray(a.aim) || a.aim.length !== 2 || !a.aim.every(Number.isFinite)) return 'aim'
  if (!Array.isArray(a.fire) || a.fire.length !== 2 || !a.fire.every((f) => typeof f === 'boolean')) return 'fire'
  if (typeof a.boost !== 'boolean') return 'boost'
  if ('pick' in a && a.pick !== undefined && !(Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2)) return 'pick'
  if ('take' in a && a.take !== undefined && !(Number.isInteger(a.take) && a.take >= 0)) return 'take'
  if ('drop' in a && a.drop !== undefined && !(a.drop === 0 || a.drop === 1)) return 'drop'
  return null
}
function makeSeq(n) {
  const seq = []
  let t = 0, tick = 0
  for (let k = 0; k < n; k++) {
    const base = pool[Math.floor(R() * pool.length)]
    const o = JSON.parse(JSON.stringify(base))
    t += 0.1; tick += 2
    o.t = Math.round((R() < 0.3 ? 360 + R() * 55 : t % 420) * 1000) / 1000; o.tick = tick
    const m = 1 + Math.floor(R() * 4)
    for (let i = 0; i < m; i++) { try { pickA(MUT)(o) } catch { /* mutation needed a field that is gone */ } }
    seq.push(o)
  }
  return seq
}
const seq = makeSeq(N)
const out = {}
for (const [tag, ov] of [['V1-auto', {}], ['V1-ffa', { env: 'ffa', warmup: false }], ['V1-squad', { select: { env: 'squad' } }], ['O502-ffa', { env: 'ffa', warmup: false, select: { laserRange: 'far', farmHp: '90', fightEarly: 'off', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'off', upg: 'std', ffaDropGate: 'off', finalPoint: 'off', ffaTwo: 'off', ffaThree: 'off', ffaGate: 'off' } }]]) {
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  const br = createBrain(hello, { world, nav, log: () => {} }, ov)
  let throws = 0, invalid = 0, worst = 0, firstBad = ''
  for (const o0 of seq) {
    const o = JSON.parse(JSON.stringify(o0))
    let a
    const t0 = performance.now()
    try { a = br.act(o, t0 + 27.5) } catch (e) { throws++; if (!firstBad) firstBad = 'throw ' + String(e).slice(0, 80); continue }
    worst = Math.max(worst, performance.now() - t0)
    const v = validAction(a); if (v) { invalid++; if (!firstBad) firstBad = 'invalid ' + v }
  }
  const st = br.debugState()
  out[tag] = { n: seq.length, throws, invalid, worstMs: +worst.toFixed(2), errors: st.counters.errors, fuse: st.counters.fuse, env: br._B.env, firstBad }
}
console.log(JSON.stringify(out, null, 1))
if (outStream) writeFileSync(outStream, gzipSync(seq.filter((o) => o.self && typeof o.self === 'object' && !Array.isArray(o.self)).reduce((s, o) => s + JSON.stringify({ type: 'obs', ...o }) + '\n', JSON.stringify(hello) + '\n')))
