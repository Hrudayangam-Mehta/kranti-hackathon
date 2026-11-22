// bun dbgdrop.mjs <lib> <stream> [env]: svDrop 'first100' latch transitions on a recorded stream (open loop)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const R = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, f, env = 'squad'] = process.argv.slice(2)
const msgs = gunzipSync(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello')
const { World } = await import(R + '/ref_bot/lib/world.js'), { Nav } = await import(R + '/ref_bot/lib/nav.js'), { createBrain } = await import(lib + '/brain.js')
const world = World.loadSync(R + '/kit/arena'), mc = hello.config.mech
const b = createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }), log: () => {} }, { fuseMs: 1e9, warmup: false, select: { svDrop: 'first100', env } })
const B = b._B
let prev = -1
for (const o of msgs) {
  if (o.type !== 'obs') continue
  b.act(o, performance.now() + 1e6)
  const st = B.sv.state
  if (Array.isArray(o.drops) && o.drops.length && (B.tick % 50 === 0)) console.log(`t ${B.me.t.toFixed(1)} drops ${JSON.stringify(o.drops.map((d) => [d.id, Math.round(Math.hypot(d.pos[0] - B.me.x, d.pos[1] - B.me.y)), d.lands_in, d.holder]))} hp ${B.me.hpf.toFixed(2)} fw ${B.hunt.firewall()} live ${st.live} fd ${B.foreignDeaths} alive ${B.aliveN} nr ${B.zone.nr.toFixed(0)}`)
  if (st.dropId !== prev) { console.log(`t ${B.me.t.toFixed(1)} dropId ${prev} -> ${st.dropId} mode ${B.mode} live ${st.live} lastStand ${B.lastStand} hp ${B.me.hpf.toFixed(2)} drops ${JSON.stringify(B.drops.map((d) => [d.id, Math.round(Math.hypot(d.x - B.me.x, d.y - B.me.y)), d.landsIn, Math.round(Math.hypot(d.x - B.zone.nx, d.y - B.zone.ny)), B.zone.nr]))} counters ${JSON.stringify(Object.fromEntries(Object.entries(B.counters).filter(([k]) => k.startsWith('svDrop'))))}`); prev = st.dropId }
}
