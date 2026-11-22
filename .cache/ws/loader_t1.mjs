import { World } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot/lib/world.js'
const L = process.argv[2]
const ref = World.loadSync('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/arena')
const sig = (w) => [w.prisms.length, w.trees.length, w.ground(10, 20).toFixed(4), w.ground(-150, 77).toFixed(4)].join(',')
const cases = [
  ['v2 files', L + '/a', ['v2/world.json', 'v2/terrain.i16']],
  ['v3 files', L + '/b', ['v3/world.json', 'v3/terrain.i16']],
  ['flat files', L + '/c', ['world.json', 'terrain.i16']],
  ['no files, newest version dir', L + '/d', []],
  ['custom terrain name', L + '/e', ['mapX/world.json', 'mapX/height.i16']],
  ['wrong files fall back', L + '/a', ['nope/world.json']],
  ['absolute files', '/nonexistent', [L + '/b/v3/world.json', L + '/b/v3/terrain.i16']],
  ['dir itself, flat name', L + '/c', ['world.json']],
]
for (const [name, dir, files] of cases) {
  try { const w = World.loadSync(dir, { files }); console.log((sig(w) === sig(ref) ? 'PASS ' : 'FAIL ') + name, sig(w)) }
  catch (e) { console.log('FAIL ' + name + ' threw ' + e.message) }
}
