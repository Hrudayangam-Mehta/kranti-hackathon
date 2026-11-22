// trace.mjs <libDir> <stream.gz> <env squad|auto|ffa> '<select json>' [from] [to]: per decision t, mode, leg, target, hp, cubes
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const R = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, file, env, selJ, from, to] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { World } = await import(R + '/ref_bot/lib/world.js'), { Nav } = await import(R + '/ref_bot/lib/nav.js')
const msgs = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = msgs.find((m) => m.type === 'hello'), world = World.loadSync(R + '/kit/arena'), mc = hello.config.mech
const nav = new Nav(world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg })
const sel = JSON.parse(selJ || '{}')
const ov = { fuseMs: 1e9, select: { ...sel, ...(env === 'squad' ? { env: 'squad' } : {}) } }; if (env === 'ffa') ov.env = 'ffa'
const b = createBrain(hello, { world, nav, log: () => {} }, ov), B = b._B
let i = 0
for (const o of msgs) if (o.type === 'obs') {
  const a = b.act(o, performance.now() + 1e6); i++
  if (i < +(from || 0) || i > +(to || 1e9)) continue
  const tg = B.target
  console.log(`${i} t${B.me.t.toFixed(1)} ${B.mode}/${B.legKind} tgt${tg ? tg.id + '@' + tg.dist.toFixed(0) + ':' + Math.round(tg.hp) + (tg.losOut ? 'L' : '') : '-'} hp${Math.round(B.me.hp)} c${B.me.cubes} nLos${B.nLos} ofG${B.ofGate ? 1 : 0} shotAt${(B.me.t - B.me.lastShotAtT).toFixed(1)} mv${a.move.map((v) => v.toFixed(2))} b${a.boost ? 1 : 0} f${a.fire.map((v) => v ? 1 : 0).join('')}${a.reload ? ' R' : ''}`)
}
console.error(JSON.stringify(Object.fromEntries(Object.entries(B.counters).filter(([k]) => /^(en|ec|fi|gate|beam|early|ammo|reload|snap|blind|over|fkWalk|laser|kills)/.test(k)))))
