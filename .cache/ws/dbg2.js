import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { Arena } = await import(P + '/tools/arena_micro.js')
const { createBrain } = await import(P + '/bot/lib/brain.js')
const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const still = (e) => { e.vx = 0; e.vy = 0 }
for (const [sel, hpf, nAtt] of [[{ retreat: 'd3' }, 0.45, 2], [{ retreat: 'd3', hunt: 'h50' }, 0.39, 3]]) {
  const en = [{ id: 10, x: 70, y: 0, hp: 600, maxHp: 1400, dps: 30, script: (e) => { still(e); e.yaw = Math.PI } }]
  for (let k = 1; k < nAtt; k++) en.push({ id: 10 + k, x: -70 * Math.cos(k), y: 70 * Math.sin(k) * (k % 2 ? 1 : -1), hp: 1e6, maxHp: 1e6, dps: 30, script: (e) => { still(e); e.yaw = Math.atan2(-e.y, -e.x) } })
  const ar = new Arena({ cfg, seed: 971, me: { x: 0, y: 0, yaw: 0, weapons: ['gun', 'laser'], hp: Math.round(hpf * 1400), pinned: true }, enemies: en })
  for (const e of ar.enemies) e.script(e, 0, ar, 0)
  ar.t = 40
  const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, select: sel })
  for (let k = 0; k < 30; k++) {
    const o = ar.obs(); o.alive = 14; o.self.hp = Math.round(hpf * 1400)
    const a = br.act(o, performance.now() + 27.5)
    const B = br._B
    if (k % 3 === 0) console.log(JSON.stringify(sel), o.t, 'hpf', B.me.hpf.toFixed(3), 'threats', B.threats, 'lines', B.h50.lines, 'on', B.h50.on, 'commit', B.h50.commit && B.h50.commit.id, 'tgt', B.target && B.target.id, 'losing', B.losing, 'mode', B.mode, 'tracks', B.trackList.map((t) => t.id + ':' + t.dist.toFixed(0) + (t.listed ? 'L' : '') + (t.hostile ? 'H' : '')).join(' '), 'fin', B.finishing)
    ar.step(a)
  }
}
