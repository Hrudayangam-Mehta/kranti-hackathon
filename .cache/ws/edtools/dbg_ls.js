const P = process.argv[2]
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const { readFileSync } = await import('node:fs'); const { gunzipSync } = await import('node:zlib')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const face = (e, ar) => { e.yaw = Math.atan2(ar.me.y - e.y, ar.me.x - e.x) }
const ar = new Arena({ cfg, seed: 71, me: { x: 0, y: 0, yaw: 0, hp: 0.18 * 1400 }, enemies: [{ id: 10, x: 100, y: 0, hp: 500, dps: 45, script: (e, t, a) => face(e, a) }, { id: 11, x: 94, y: -6, hp: 1400, dps: 45, script: (e, t, a) => face(e, a) }] })
const brain = createBrain(hello, { world: null, nav: null, log: console.log })
for (let k = 0; k < 40 && ar.me.hp > 0; k++) {
  const o = ar.obs(); const a = brain.act(o, performance.now() + 27); const s = brain.debugState(); const B = brain._B
  if (k % 3 === 0) console.log(k, s.mode, s.stance, s.leg, 'tgt', s.target, B.trackList.map(t => `${t.id}:${t.index?.toFixed(2)} d${t.dist.toFixed(0)} hp${t.hp.toFixed(0)}`).join(' '), 'ls', B.lastStand, 'doom', B.doomed, 'att3', B.attackers3)
  ar.step(a)
}
