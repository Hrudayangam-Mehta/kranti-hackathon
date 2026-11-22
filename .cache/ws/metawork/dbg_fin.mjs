import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const KP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const DIR = process.argv[2], TB = process.argv[3]
const lines = gunzipSync(readFileSync(KP + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], OBS = lines.filter((l) => l.type === 'obs')
const { World } = await import(DIR + '/lib/world.js'), { Nav } = await import(DIR + '/lib/nav.js'), { createBrain } = await import(DIR + '/lib/brain.js')
const world = World.loadSync(KP + '/kit/arena')
const b = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { saltTable: TB, fuseMs: 1e9 })
const B = b._B
for (let i = 0; i <= 160; i++) {
  const o = JSON.parse(JSON.stringify(OBS[i]))
  if (i >= 60) { for (const m of o.mechs) m.hp = 80; o.self.weapons[1] = { kind: 'laser', cooldown: 0, charge: 0.75, stats: hello.config.weapons.laser }; o.self.weapons[0].ammo = 12; o.self.weapons[0].reload = 0 }
  const a = b.act(o, performance.now() + 1e6)
  if (i >= 60 && i % 4 === 0) console.log(i, o.t, 'mechs', o.mechs.length, o.mechs[0] ? Math.round(Math.hypot(o.mechs[0].pos[0]-o.self.pos[0], o.mechs[0].pos[1]-o.self.pos[1])) : '-', 'tgt', B.target ? B.target.id + '/' + Math.round(B.target.dist) + (B.target.listed?'L':'') + (B.target.losOut?'o':'') : '-', B.mode, B.aimKind, 'gunLos', B.gunLos, JSON.stringify(a.fire), 'cd', o.self.weapons[0].cooldown, 'fg', B.counters.flightGated|0, B.meta ? B.meta.cnt.gunFin : '')
}
