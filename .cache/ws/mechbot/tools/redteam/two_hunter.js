// Red-team tool: the builder's scripted duel (tools/test_brain.js "duel") against 1 or 2 hunters, with a phase trace.
//   bun tools/redteam/two_hunter.js [--n 2] [--overrides '{...}'] [--trace seed]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Arena, rng32 } from '../arena_micro.js'
import { World } from './snap/bot/lib/world.js'
import { Nav } from './snap/bot/lib/nav.js'
import { createBrain } from './snap/bot/lib/brain.js'
const ROOT = new URL('./snap/', import.meta.url).pathname
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const nEn = parseInt(arg('n', '2'), 10), traceSeed = parseInt(arg('trace', '-1'), 10)
const overrides = { warmup: false, planMinMs: -1e9, optMinMs: -1e9, slowMs: 1e9, ...(arg('overrides', null) ? JSON.parse(arg('overrides')) : {}) }
const lines = gunzipSync(readFileSync(ROOT + 'kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config
const world = World.loadSync(ROOT + 'kit/arena')
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
function hunter() {
  let path = null, pt = -9, wp = 1
  return (e, t, ar, dt) => {
    const me = ar.me, d = Math.hypot(me.x - e.x, me.y - e.y)
    const los = world.shotClear(e.x, e.y, e.z + 7, me.x, me.y, me.z + 4.5) && (world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 4.5) || world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + 9))
    e.yaw = Math.atan2(me.y - e.y, me.x - e.x)
    const moving = me.vx * me.vx + me.vy * me.vy > 30 && d > 60
    e.dps = los && d < 230 ? 107 * (d < 40 ? 0.85 : d < 90 ? 0.7 : d < 160 ? 0.45 : 0.25) * (moving ? 0.6 : 1) : 0
    if (los && d < 75) { e.vx = 0; e.vy = 0; return }
    if (t - pt > 1) { pt = t; const r = nav.findPath(e.x, e.y, me.x, me.y, { maxExpand: 6000 }); path = r.pts; wp = 1 }
    if (path && path.length > 1) {
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - e.x, path[wp][1] - e.y) < 2) wp++
      const tx = path[wp][0] - e.x, ty = path[wp][1] - e.y, l = Math.hypot(tx, ty) || 1
      e.vx = tx / l * cfg.mech.walk_speed; e.vy = ty / l * cfg.mech.walk_speed
      e.x += e.vx * dt; e.y += e.vy * dt
    }
  }
}
function duel(seed) {
  const rnd = rng32(seed), Bd = world.bounds
  let mx = 0, my = 0
  for (let k = 0; k < 5000; k++) { mx = Bd.minX + 80 + rnd() * (Bd.maxX - Bd.minX - 160); my = Bd.minY + 80 + rnd() * (Bd.maxY - Bd.minY - 160); if (nav.passableAt(mx, my) && nav.component(mx, my) === nav.mainComponent && nav.wallDistAt(mx, my) > 4) break }
  const enemies = []
  for (let i = 0; i < nEn; i++) {
    let ex = mx, ey = my
    for (let k = 0; k < 2000; k++) { const a = rnd() * 6.283, d = 150 + rnd() * 80; ex = mx + d * Math.cos(a); ey = my + d * Math.sin(a); if (nav.passableAt(ex, ey) && nav.component(ex, ey) === nav.mainComponent) break }
    enemies.push({ id: 10 + i, x: ex, y: ey, hp: cfg.mech.hp, script: hunter() })
  }
  const ar = new Arena({ cfg, world, nav, seed, me: { x: mx, y: my, yaw: 0 }, enemies, zone: { center: [mx, my], radius: 3000, next_center: [mx, my], next_radius: 2500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } })
  const brain = createBrain(hello, { world, nav, log: () => {} }, overrides)
  const B = brain._B
  const S = { legT: {}, dmgLeg: {}, still: 0, ls: [], modeSw: 0, tgtSw: 0, dealt: [0, 0], noLosFight: 0, healT: 0, exposedT: 0, firing: 0, losOutT: 0 }
  let prevTgt = -1, prevStance = '', hp0 = ar.me.hp
  for (let k = 0; k < 900 && ar.me.hp > 0; k++) {
    const obs = ar.obs()
    const a = brain.act(obs, performance.now() + 1e6)
    const key = B.mode + '/' + B.legKind
    S.legT[key] = (S.legT[key] || 0) + 0.1
    const exposed = ar.enemies.some((e) => e.alive && e.dps > 0)
    if (exposed) S.exposedT += 0.1
    if (exposed && Math.hypot(ar.me.vx, ar.me.vy) < 1.5) S.still += 0.1
    if (B.stance === 'LAST-STAND' && prevStance !== 'LAST-STAND') S.ls.push({ t: +ar.t.toFixed(1), hpf: +(ar.me.hp / ar.me.maxHp).toFixed(2), A: Math.round(B.A), tCover: +B.tCover.toFixed(1) })
    prevStance = B.stance
    const tid = B.target ? B.target.id : -1
    if (tid !== prevTgt && tid >= 0 && prevTgt >= 0) S.tgtSw++
    if (tid >= 0) prevTgt = tid
    if (a.fire[0] || a.fire[1]) S.firing += 0.1
    if (B.target && B.target.losOut) S.losOutT += 0.1
    if (traceSeed === seed && k % 5 === 0) console.log(`${ar.t.toFixed(1).padStart(5)} hp ${String(Math.round(ar.me.hp)).padStart(4)} ${key.padEnd(20)} ${B.stance.slice(0, 4)} tgt ${tid} A ${String(Math.round(B.A)).padStart(3)} n1 ${B.n1} nLos ${B.nLos} hide ${B.hide.state}/${Math.round(B.hide.dist)} sp ${Math.hypot(ar.me.vx, ar.me.vy).toFixed(1)} fire ${a.fire[0] ? 'G' : '-'} e:${ar.enemies.map((e) => `${Math.round(e.hp)}@${Math.round(Math.hypot(e.x - ar.me.x, e.y - ar.me.y))}${e.dps > 0 ? '*' : ''}`).join(' ')}`)
    ar.step(a)
    const lost = hp0 - ar.me.hp
    if (lost > 0) S.dmgLeg[key] = (S.dmgLeg[key] || 0) + lost
    hp0 = ar.me.hp
    if (ar.enemies.every((e) => !e.alive)) break
  }
  const r = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, Math.round(v)]))
  return { seed, kills: ar.enemies.filter((e) => !e.alive).length, hp: Math.round(Math.max(0, ar.me.hp)), t: +ar.t.toFixed(0), enemyHp: ar.enemies.map((e) => Math.round(Math.max(0, e.hp))), acc: `${ar.stats.hits}/${ar.stats.shots}`, exposed_s: +S.exposedT.toFixed(0), still_s: +S.still.toFixed(1), firing_s: +S.firing.toFixed(0), tgtSwitches: S.tgtSw, lastStand: S.ls, legT: r(S.legT), dmgLeg: r(S.dmgLeg) }
}
let wins = 0
for (const s of [1, 2, 3, 4, 5, 6]) { const r = duel(s); if (r.kills === nEn && r.hp > 0) wins++; console.log(JSON.stringify(r)) }
console.log(`won ${wins}/6 against ${nEn} scripted hunter(s)`, JSON.stringify(overrides))
