import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const ar = new Arena({ cfg, seed: 961, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', null], pinned: true }, enemies: [{ id: 10, x: 80, y: 0, hp: 1400, maxHp: 1400, script: (e) => { e.vx = 0; e.vy = 0; e.yaw = Math.PI / 2 + 0.3 } }] })
ar.t = 25
const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, select: { retreat: 'd3', hunt: 'h50' } })
for (let k = 0; k < 4; k++) {
  const o = ar.obs(); o.alive = 14
  const a = br.act(o, performance.now() + 27.5)
  const B = br._B, tr = B.tracks.get(10)
  console.log(o.t, 'on', B.h50.on, 'seekOk', B.h50.seekOk, 'env', B.env, 'fd', B.foreignDeaths, 'aliveN', B.aliveN, 'z', B.zone.known, B.zone.nr, 'tgt', B.target && B.target.id, 'h50Ok', tr && tr.h50Ok, 'hostile', tr && tr.hostile, 'aimAtMe', tr && tr.aimAtMe, 'rear', tr && tr.rearOn, 'b3', tr && B.hunt.burst3(tr).toFixed(0), 'fire', JSON.stringify(a.fire), 'mode', B.mode, 'commit', B.h50.commit && B.h50.commit.id, 'lastDmgOut', tr && tr.lastDmgOutT, 'losOut', tr && tr.losOut, 'eng', B.engagedWhy, 'cands', B.trackList.length, 'fin', tr && tr.finishable, 'steal', !!B.steal)
  ar.step(a)
}
