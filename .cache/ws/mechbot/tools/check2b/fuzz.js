// check2b: fuzz 3000 observations per posture into the live brain (plain defaults) + write a process-level fuzz stream.
//   bun fuzz.js <seed> [writeStream]
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { rng32 } = await import(P + '/tools/arena_micro.js')
const { World } = await import(P + '/bot/lib/world.js')
const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const seed = +(process.argv[2] || 777)
const msgs = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), base = msgs.filter((m) => m.type === 'obs'), cfg = hello.config
const s2 = gunzipSync(readFileSync(P + '/tools/check2a/streams/ffa_s2.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.type === 'obs')
const pool = base.concat(s2)
const world = World.loadSync(P + '/kit/arena'), nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const rnd = rng32(seed)
const junk = [null, undefined, NaN, Infinity, -Infinity, -1e308, 1e12, '', 'x', [], {}, true, false, -1, 0, 0.5, [NaN, NaN, NaN], [null], [1e9, -1e9, 0], { a: 1 }]
const pj = () => junk[Math.floor(rnd() * junk.length)]
function mutate(o, depth) {
  if (o === null || typeof o !== 'object') return
  for (const k of (Array.isArray(o) ? o.map((_, i) => i) : Object.keys(o))) {
    const r = rnd()
    if (r < 0.025) { if (Array.isArray(o)) o[k] = pj(); else delete o[k] } else if (r < 0.06) o[k] = pj()
    else if (r < 0.08 && typeof o[k] === 'number') o[k] *= rnd() < 0.5 ? 1e9 : -1e9
    else if (depth < 7) mutate(o[k], depth + 1)
  }
}
function enrich(o, i) {
  const [x, y, z] = (o.self && Array.isArray(o.self.pos)) ? o.self.pos : [0, 0, 0]
  o.t = [10, 50, 80, 150, 260, 380][i % 6] + (i % 50) * 0.1; o.alive = 16 - (i % 15)
  o.mechs = (o.mechs || []).concat([{ id: 7, kind: 'mech', pos: [x + 70, y + 10, z], vel: [3, -9, 0], aim: [Math.atan2(-10, -70), 0], hp: 600, max_hp: 1400, cubes: 2, weapons: ['gun', 'laser'], charging: i % 2 === 0 },
    { id: 8, kind: 'mech', pos: [x - 40, y + 60, z], vel: [0, -5, 0], aim: [-1.2, 0], hp: 300 + i % 900, max_hp: 1400, cubes: 1, weapons: ['gun', 'lightning'], charging: false },
    { id: 104, kind: 'npc', pos: [x - 30, y + 20, z], vel: [1, 0, 0], aim: [0, 0], hp: 350 - (i % 7) * 40, max_hp: 350 }])
  o.crates = (o.crates || []).concat([{ id: 1001, pos: [x + 45, y - 30, z], hp: 300 - (i % 6) * 45 }])
  o.cubes = (o.cubes || []).concat([{ id: 5001 + (i % 3), pos: [x + 5, y + 5, z] }]); o.pickups = (o.pickups || []).concat([{ id: 8001, kind: ['laser', 'lightning', 'mortar', 'gun', 'zzz'][i % 5], pos: [x + 2, y, z] }])
  o.beams = (o.beams || []).concat([{ by: 7, kind: 'laser', path: [[x + 70, y + 10, z + 7], [x + 45, y - 30, z + 1]], age: 0.05 }, { by: 3, kind: 'laser', path: [[x, y, z + 7], [x + 70, y + 10, z + 6]], age: 0.1 }])
  o.sounds = (o.sounds || []).concat([{ kind: 'death', bearing: 0.3, dist: 'near', age: 0.05 }, { kind: 'step', bearing: -2, dist: 'near', age: 0.05 }])
  o.events = (o.events || []).concat([{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 2.9, by: 8, rear: true }, { type: 'hit', target: 1001, amount: 45, weapon: 'gun' }, { type: 'kill', target: 8 }, { type: 'took', id: 8001, kind: 'laser', slot: 1 }])
  o.drops = i % 4 ? [] : [{ id: 20000 + (i % 3), pos: [x + 30, y, z], radius: 8, lands_in: 2, capture_s: 4, progress: i % 2 ? 0.5 : 0, holder: i % 3 ? null : 7 }]
  if (i % 9 === 0) o.offer = { id: i, expires: o.t + 5, choices: [{ id: 'armor' }, { id: 'gun_rate' }, { id: 'nope' }] }
  return o
}
function validAction(a) {
  if (!a || typeof a !== 'object') return 'not an object'
  if (!Array.isArray(a.move) || a.move.length !== 2 || !a.move.every(Number.isFinite) || Math.hypot(a.move[0], a.move[1]) > 1 + 1e-9) return 'move'
  if (!Array.isArray(a.aim) || a.aim.length !== 2 || !a.aim.every(Number.isFinite)) return 'aim'
  if (!Array.isArray(a.fire) || a.fire.length !== 2 || !a.fire.every((f) => typeof f === 'boolean')) return 'fire'
  if (typeof a.boost !== 'boolean') return 'boost'
  return null
}
const out = {}, stream = [JSON.stringify(hello)]
for (const [name, ov, ctx] of [['squad', { select: { env: 'squad' } }, { world, nav, log: () => {} }], ['auto', {}, { world, nav, log: () => {} }], ['ffa', { env: 'ffa' }, { world, nav, log: () => {} }], ['ffa-nomap', { env: 'ffa' }, { world: null, nav: null, log: () => {} }]]) {
  const br = createBrain(hello, ctx, ov)
  let thrown = 0, invalid = 0, maxMs = 0, firstErr = ''
  for (let i = 0; i < 3000; i++) {
    const o = enrich(JSON.parse(JSON.stringify(pool[(i * 7) % pool.length])), i)
    o.tick = i
    if (i % 5) mutate(o, 0)
    if (name === 'auto' && stream.length <= 3000) stream.push(JSON.stringify(o))
    const t0 = performance.now()
    let a = null
    try { a = br.act(o, t0 + 27.5) } catch (e) { thrown++; if (!firstErr) firstErr = String(e && e.stack || e).slice(0, 200) }
    const ms = performance.now() - t0; if (ms > maxMs) maxMs = ms
    if (a && validAction(a)) invalid++
  }
  const st = br.debugState()
  out[name] = { thrown, invalid, internalErrors: st.counters.errors, stages: st.errorsByStage, maxMs: +maxMs.toFixed(1), fuse: st.counters.fuse, env: st.env, firstErr }
}
console.log(JSON.stringify(out))
if (process.argv[3]) {
  const extra = ['{not json', '', '[]', '{"type":"obs"}', '{"type":"obs","tick":5,"self":null}', 'null', '{"type":"nope"}']
  const lines = [stream[0]]
  for (let i = 1; i < stream.length; i++) { lines.push(stream[i]); if (i % 97 === 0) lines.push(extra[(i / 97) % extra.length | 0]) }
  lines.push(JSON.stringify({ type: 'end', place: 3, kills: 1 }))
  writeFileSync(process.argv[3], lines.join('\n') + '\n')
}
