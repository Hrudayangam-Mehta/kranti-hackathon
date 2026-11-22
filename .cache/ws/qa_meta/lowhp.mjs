import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const KP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const DIR = process.argv[2]
const lines = gunzipSync(readFileSync(KP + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], OBS = lines.filter((l) => l.type === 'obs')
const { World } = await import(DIR + '/lib/world.js'), { Nav } = await import(DIR + '/lib/nav.js'), { createBrain } = await import(DIR + '/lib/brain.js')
const world = World.loadSync(KP + '/kit/arena')
const clone = (o) => JSON.parse(JSON.stringify(o))
function scene(table, hpf, dist, selfCubes) {
  const b = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { saltTable: table, fuseMs: 1e9, select: { env: 'squad' } }), B = b._B
  let grabN = 0, legN = 0, n = 0, lines1 = 0, modes = {}
  for (let i = 0; i <= 130; i++) {
    const o = clone(OBS[i])
    o.self.hp = Math.round(o.self.max_hp * hpf); o.self.cubes = selfCubes
    if (i >= 60) {
      const [x, y] = o.self.pos; let at = null
      for (let k = 0; k < 32 && !at; k++) { const ang = k * Math.PI / 16, px = x + dist * Math.cos(ang), py = y + dist * Math.sin(ang); if (B.nav.passableAt(px, py) && B.nav.walkLine(x, y, px, py)) at = [px, py, B.nav.levelAt(px, py)] }
      if (at) o.cubes = [{ id: 9002, pos: at }]
    }
    b.act(o, performance.now() + 1e6)
    if (i >= 60) { n++; if (B.nLos >= 1) lines1++; if (B.grab && B.grab.id === 9002) grabN++; if (B.legKind === 'grab' || B.legKind === 'healcube') legN++; modes[B.mode] = (modes[B.mode] || 0) + 1 }
  }
  return { n, lines1, grabN, legN, modes, cubeDiff: B.meta ? B.meta.cnt.cubeDiff : null }
}
for (const [hpf, dist, sc] of [[0.45, 48, 3], [0.45, 90, 2], [0.9, 48, 3], [0.9, 90, 2]]) {
  console.log(`hp ${hpf * 100}% cube at ${dist} m (we hold ${sc})`, 'META', JSON.stringify(scene('121m111111111111', hpf, dist, sc)), 'BASE', JSON.stringify(scene('1211111111111111', hpf, dist, sc)))
}
