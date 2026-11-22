import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const B = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/req_bot'
const ROOT = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { ArenaReq } = await import(B + '/arena_req.js')
const { createBrain } = await import(B + '/lib/brain.js')
const lines = gunzipSync(readFileSync(ROOT + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, m = cfg.mech
// target strafing at 150 m with house-bot hops (jump 11 m/s + 1.5 s jet, apex ~15 m) every 3 s
function run(over, D, hop) {
  const ar = new ArenaReq({ cfg, seed: 29, me: { x: 0, y: 0, yaw: 0, pinned: true, weapons: ['gun', 'laser'] },
    enemies: [{ id: 21, x: D, y: 0, hp: 1e7, weapons: ['gun'], script: (e, t, a, dt) => {
      e.vy = (Math.floor(t / 1.3) % 2 ? 1 : -1) * 11.7; e.y += e.vy * dt; e.yaw = Math.PI
      if (hop) {
        e.air = e.air || { z: 0, vz: 0, t0: -9 }
        const A = e.air
        if (A.z <= 0 && t - A.t0 > 3) { A.vz = m.jump_speed; A.t0 = t }
        if (t - A.t0 < 1.5) A.vz = Math.min(m.max_rise_speed, A.vz + m.jet_accel * dt)
        A.vz -= m.gravity * dt; A.z = Math.max(0, A.z + A.vz * dt); if (A.z === 0 && A.vz < 0) A.vz = 0
        e.vz = A.vz; e.hz = A.z
      }
    } }] })
  // the arena pins enemies to the ground: lift it after each step via a wrapper
  const step0 = ar.step.bind(ar)
  ar.step = (a) => step0(a)
  const obs0 = ar.obs.bind(ar)
  ar.obs = () => { const o = obs0(); for (const q of o.mechs) if (q.id === 21) { q.pos[2] = Math.round(ar.enemies[0].z * 100) / 100; q.vel[2] = Math.round((ar.enemies[0].vz || 0) * 100) / 100 } return o }
  ar.t = 100
  const brain = createBrain(hello, { world: null, nav: null, log: () => {} }, { rPrefLaser: D, laserLo: D - 30, laserHi: D + 30, ...over })
  for (let k = 0; k < 600; k++) { const o = ar.obs(); const a = brain.act(o, performance.now() + 27); ar.step(a) }
  return `${ar.stats.beamHits}/${ar.stats.beams} beams, gun ${ar.stats.hits}/${ar.stats.shots}`
}
for (const D of [110, 150, 180]) for (const hop of [false, true]) console.log(`D ${D} hop ${hop}: on ${run({}, D, hop)} | off ${run({ headAimOn: false, aimCalOn: false }, D, hop)}`)
