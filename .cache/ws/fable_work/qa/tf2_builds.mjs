// QA: T-F2 on the baked SELECT of each build (no select override) against the 8cdafe2 source (variants6/FSLCL15_s1)
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const BASE = S + '/variants6/FSLCL15_s1/bot'
const lines = gunzipSync(readFileSync(S + '/mechbot/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, streamObs = lines.filter((l) => l.type === 'obs'), Wp = cfg.weapons
const ring0 = () => ({ t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 })
async function load(bot) { const imp = (f) => import(pathToFileURL(join(bot, 'lib', f)).href)
  const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { decideMode, finUpdate } = await imp('tactics.js')
  const world = World.loadSync(S + '/mechbot/kit/arena'); const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
  return { createBrain, decideMode, finUpdate, world, nav } }
function sceneA(M, env, opts) {
  const br = M.createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, ...(env ? { env } : {}) }), B = br._B
  const o = JSON.parse(JSON.stringify(streamObs[0])); o.mechs = []; o.events = []; o.sounds = []; o.t = 60; o.alive = 12
  o.self.weapons = [{ kind: 'gun', ammo: 12, reload: 0, cooldown: 0, stats: Wp.gun }]; o.self.hp = cfg.mech.hp; o.self.max_hp = cfg.mech.hp
  br.act(o, performance.now() + 1e6)
  B.me.t = 60; B.zone.known = false; B.zoneUrgent = false; B.aliveN = 12; B.foreignDeaths = 0
  const trk = (id, d) => ({ id, kind: 'mech', npc: false, listed: true, phantom: false, conf: 1, x: B.me.x + d, y: B.me.y, z: 0, vx: 0, vy: 0, evx: 0, evy: 0, hp: 1400, maxHp: 1400, dist: d, bearing: 0, yaw: Math.PI,
    rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, steadySince: 60, losOut: true, losIn: true, losOutT: 60, losInT: 60, lastSeen: 60,
    lastDmgInT: 60, lastDmgOutT: 60, dmgIn: ring0(), dmgOut: ring0(), hostile: true, aimAtMe: true, finishable: false, h50Ok: false, a: 83, b: 100, magN: 0, lastBulletT: -99 })
  const L = [trk(10, 90), trk(11, 110), trk(12, 120)]; if (opts.noTracks) L.length = 0
  B.trackList = L; B.tracks = new Map(L.map((tr) => [tr.id, tr])); B.target = L[0] || null; B.mode = opts.mode || 'FIGHT'; B.modeSince = 0; B.attackers3 = 0
  B.hide.state = 'found'; B.hide.dist = opts.coverM || 12; B.hide.x = B.me.x - B.hide.dist; B.hide.y = B.me.y
  const out = []
  for (let r = 0; r < opts.rep; r++) { B.me.t = +(B.me.t + 0.1).toFixed(2); B.me.hp = opts.hp; B.me.hpf = opts.hp / B.me.maxHp; B.me.gun.ammo = 12; B.me.gun.reload = 0
    B.threats = opts.n; B.threat1 = L[0] || null; B.A = opts.n * 83
    if (opts.quiet) { B.lastLosInT = Math.min(B.lastLosInT, B.me.t - 2); B.me.lastShotAtT = Math.min(B.me.lastShotAtT, B.me.t - 2) } else { B.lastLosInT = B.me.t; B.me.lastShotAtT = B.me.t }
    M.finUpdate(B); M.decideMode(B); out.push(B.mode) }
  return out[out.length - 1]
}
function sceneB(M, env, hpf) {
  const { world, nav } = M
  const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80), me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
  let far = null
  for (let r = 175; r <= 195 && !far; r += 5) for (let k = 0; k < 72 && !far; k++) { const a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
    const z = nav.levelAt(x, y)
    const clear = world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) || world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 8) || world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5) || world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 8.1)
    if (!clear && z - world.ground(x, y) < 1) far = { x, y, z } }
  const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
  const b = M.createBrain(hello, { world, nav, log: () => {} }, { warmup: false, ...(env ? { env } : {}) }); const acts = []
  for (let k = 0; k < 12; k++) { const o = { type: 'obs', tick: 2 * k, t: 40 + k * 0.1, alive: 12, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * hpf, max_hp: 1400, energy: 100, max_energy: 100, grounded: true,
      cubes: 0, upgrades: [], in_zone: true, weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech },
      mechs: [{ id: 11, kind: 'mech', pos: [far.x, far.y, far.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }], projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: [], drops: [], zone, offer: null }
    acts.push(JSON.stringify(b.act(o, performance.now() + 1e6)) + b._B.mode + b._B.legKind) }
  return acts.join('|')
}
const cells = [[8, 700], [16, 700], [30, 700], [8, 294], [30, 294], [8, 180], [30, 180]]
function probe(M, env) {
  return { lc: cells.map(([c, h]) => sceneA(M, env, { coverM: c, hp: h, n: 3, rep: 5 })).join(' '),
    heal50: sceneA(M, env, { mode: 'HOLD', hp: 700, n: 0, quiet: true, rep: 25 }) + '/' + sceneA(M, env, { mode: 'HOLD', noTracks: true, hp: 700, n: 0, quiet: true, rep: 25 }),
    heal35: sceneA(M, env, { mode: 'HOLD', noTracks: true, hp: 490, n: 0, quiet: true, rep: 25 }),
    a65: sceneB(M, env, 0.65), a75: sceneB(M, env, 0.75), a55: sceneB(M, env, 0.55) }
}
const B0 = await load(BASE), b0 = { sq: probe(B0, null), ff: probe(B0, 'ffa') }
console.log('columns LC: cover 8/16/30 m at 50% hp, 8/30 m at 21%, 8/30 m at 12.9% (3 lines on us)')
console.log('BASE 8cdafe2 SQUAD lc: ' + b0.sq.lc + ' | heal at 50% ' + b0.sq.heal50 + ' at 35% ' + b0.sq.heal35)
let bad = 0
for (const n of process.argv.slice(2)) {
  const M = await load(S + '/fable_work/builds/' + n + '/bot'), sq = probe(M, null), ff = probe(M, 'ffa')
  const d = Object.keys(sq).filter((k) => sq[k] !== b0.sq[k]), df = Object.keys(ff).filter((k) => ff[k] !== b0.ff[k])
  if (df.length) bad++
  console.log(`${n}: SQUAD differs from base on [${d}] | forced FFA differs on [${df}] | lc ${sq.lc} | heal50 ${sq.heal50} heal35 ${sq.heal35}`)
}
process.exit(bad ? 1 : 0)
