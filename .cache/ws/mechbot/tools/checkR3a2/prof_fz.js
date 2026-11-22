// checkR3a2: per-stage time (profiling copies of the libs in tools/checkR3a2/prof) at the slowest fuzz decisions
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot', C = P + '/tools/checkR3a2'
const msgs = gunzipSync(readFileSync(C + '/out/fuzz3000.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), obs = msgs.filter((m) => m.type === 'obs')
const { World } = await import(P + '/bot/lib/world.js'); const { Nav } = await import(P + '/bot/lib/nav.js')
const world = World.loadSync(P + '/kit/arena'), mc = hello.config.mech
const watch = new Set((process.argv[2] || '285,765,2296,2263,531').split(',').map(Number))
for (const v of ['new', 'old']) {
  const { createBrain } = await import(`${C}/prof/${v}/brain.js`)
  const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
  let calls = []
  const f0 = nav.findPath
  nav.findPath = function (...a) { const t0 = performance.now(); const r = f0.apply(this, a); calls.push(`(${a.slice(0, 4).map((x) => typeof x === 'number' ? x.toFixed(1) : x).join(',')}) opts ${JSON.stringify(a[4] || {})} -> ${r ? (r.ok !== undefined ? 'ok ' + r.ok : 'r') + ' pts ' + (r.pts ? r.pts.length : '?') + ' exp ' + (r.expanded ?? '?') : 'null'} ${(performance.now() - t0).toFixed(2)} ms`); return r }
  const br = createBrain(hello, { world, nav, log: () => {} }, { select: { env: 'squad' } })
  const tot = {}
  for (let i = 0; i < obs.length; i++) {
    calls = []; const t0 = performance.now(); br.act(obs[i], t0 + 27.5); const dt = performance.now() - t0
    const B = br._B
    if (watch.has(i)) console.log(v, '#' + i, dt.toFixed(2), 'ms', JSON.stringify(Object.fromEntries(Object.entries(B.prof).map(([k, x]) => [k, +x.toFixed(2)]))), 'mode', B.mode, 'leg', B.legKind, 'tgt', B.target ? B.target.id : -1, 'hide', B.hide.state, 'tracks', B.trackList.length, 'loot', B.loot ? B.loot.type : '-', '\n   me', B.me.x.toFixed(1), B.me.y.toFixed(1), 't', B.me.t, 'zone', JSON.stringify({ k: B.zone.known, cx: B.zone.cx, cy: B.zone.cy, r: B.zone.r, nx: B.zone.nx, ny: B.zone.ny, nr: B.zone.nr, t0: B.zone.t0, t1: B.zone.t1 }), '\n   paths', calls.join(' ; '))
  }
}
