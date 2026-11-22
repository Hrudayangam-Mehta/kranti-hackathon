// checkR3a2: which R3a2 preset moves the ZONE path goal at fuzz decision #765 (V1 with one preset reverted at a time)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot', C = P + '/tools/checkR3a2'
const msgs = gunzipSync(readFileSync(C + '/out/fuzz3000.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const { World } = await import(P + '/bot/lib/world.js'); const { Nav } = await import(P + '/bot/lib/nav.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const W = +(process.argv[2] || 765)
for (const [tag, sel] of [['V1', {}], ['far', { laserRange: 'far' }], ['farm90', { farmHp: '90' }], ['fe-off', { fightEarly: 'off' }], ['laserEcon-off', { laserEcon: 'off' }], ['focus-mult', { focus: 'mult' }], ['retreat-d3', { retreat: 'd3' }], ['boost-off', { boost: 'off' }], ['upg-std', { upg: 'std' }], ['r3a2-off', { r3a2: 'off' }]]) {
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  let calls = []
  const f0 = nav.findPath
  nav.findPath = function (...a) { const t0 = performance.now(); const r = f0.apply(this, a); calls.push(`goal ${a[2].toFixed(1)},${a[3].toFixed(1)} exp ${r && r.expanded} ${(performance.now() - t0).toFixed(1)} ms`); return r }
  const br = createBrain(hello, { world, nav, log: () => {} }, { select: { env: 'squad', ...sel } })
  let firstDiv = -1
  for (let i = 0; i <= W; i++) { calls = []; br.act(obs[i], performance.now() + 27.5) }
  const B = br._B
  console.log(tag.padEnd(14), '#' + W, B.mode, B.legKind, calls.join(' ; ') || '(no search)', '| zone goal', B.zoneGoal ? JSON.stringify(B.zoneGoal) : '')
}
