import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Match } from '../mechbot/sim/sim.js'
import { makeContext } from '../mechbot/sim/run.js'
import { HouseBot, FFA_TYPES } from '../mechbot/sim/house.js'
import { loadSchema } from '../mechbot/sim/schema.js'
const P = '../mechbot'
const schema = loadSchema()
// 1. the validator accepts the real messages
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
let bad = 0
const realKeys = {}
const note = (path, o) => { if (o && typeof o === 'object' && !Array.isArray(o)) { const k = realKeys[path] || (realKeys[path] = new Set()); for (const q in o) k.add(q) } }
for (const m of lines) {
  const e = m.type === 'hello' ? schema.hello(m) : m.type === 'obs' ? schema.obs(m) : m.type === 'end' ? schema.end(m) : ['unknown type ' + m.type]
  if (e.length) { bad++; if (bad < 4) console.log('REAL message fails:', m.type, e.slice(0, 2)) }
  if (m.type === 'obs') {
    note('obs', m); note('self', m.self); note('zone', m.zone); note('offer', m.offer)
    for (const w of m.self.weapons) if (w) note('weapon:' + w.kind, w)
    for (const x of m.mechs) note('mech:' + x.kind, x)
    for (const k of ['projectiles', 'crates', 'cubes', 'pickups', 'sounds', 'beams', 'drops']) for (const x of m[k]) note(k, x)
    for (const x of m.events) note('event:' + x.type, x)
  }
}
console.log('real stream messages', lines.length, 'schema failures', bad)
// 2. same key sets from the simulator
const ctx = makeContext({})
const simKeys = {}
const note2 = (path, o) => { if (o && typeof o === 'object' && !Array.isArray(o)) { const k = simKeys[path] || (simKeys[path] = new Set()); for (const q in o) k.add(q) } }
const bots = FFA_TYPES.map((t) => { const b = new HouseBot(t, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house }); const act = b.act.bind(b); b.act = (m) => {
  note2('obs', m); note2('self', m.self); note2('zone', m.zone); note2('offer', m.offer)
  for (const w of m.self.weapons) if (w) note2('weapon:' + w.kind, w)
  for (const x of m.mechs) note2('mech:' + x.kind, x)
  for (const k of ['projectiles', 'crates', 'cubes', 'pickups', 'sounds', 'beams', 'drops']) for (const x of m[k]) note2(k, x)
  for (const x of m.events) note2('event:' + x.type, x)
  return act(m) }; return b })
new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed: 3, config: ctx.cfg, bots, mode: 'ffa' }).runSync()
for (const k of new Set([...Object.keys(realKeys), ...Object.keys(simKeys)])) {
  const a = [...(realKeys[k] || [])].sort(), b = [...(simKeys[k] || [])].sort()
  const onlyReal = a.filter((q) => !b.includes(q)), onlySim = b.filter((q) => !a.includes(q))
  console.log(k.padEnd(20), realKeys[k] ? (simKeys[k] ? (onlyReal.length || onlySim.length ? `DIFF real-only [${onlyReal}] sim-only [${onlySim}]` : 'same keys') : 'not produced by this sim run') : `sim only (not in the real stream): [${b}]`)
}
// value formats: decimals
const ex = lines.find((m) => m.type === 'obs' && m.mechs.length)
console.log('real self', JSON.stringify(ex.self).slice(0, 330))
console.log('real mech', JSON.stringify(ex.mechs[0]))
console.log('real stats keys', Object.keys(ex.self.stats).join(','))
