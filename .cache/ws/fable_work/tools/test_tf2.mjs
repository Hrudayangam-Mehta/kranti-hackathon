// R7a T-F2 harness (build_spec_r7 3.5 (iii), critic amendment 14): for every practice preset one synthetic case of its
// trigger state. In the SQUAD posture the preset must act (the action / mode sequence differs from its old value); with
// env forced to FFA the same case must be identical to the old value. usage: bun test_tf2.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { World } = await imp('world.js'), { Nav } = await imp('nav.js'), { createBrain } = await imp('brain.js'), { decideMode, finUpdate } = await imp('tactics.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, streamObs = lines.filter((l) => l.type === 'obs')
const world = World.loadSync(join(W, 'kit', 'arena'))
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const Wp = cfg.weapons
const ring0 = () => ({ t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 })

// ---- scene A: decideMode on a synthetic state (LX, LC, FIN, healDoc), no map
function sceneA(sel, env, opts = {}) {
  const br = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, ...(env ? { env } : {}), select: { ...KS, ...sel } }), B = br._B
  const o = JSON.parse(JSON.stringify(streamObs[0])); o.mechs = []; o.events = []; o.sounds = []; o.t = 60; o.alive = 12
  o.self.weapons = [{ kind: 'gun', ammo: 12, reload: 0, cooldown: 0, stats: Wp.gun }]; o.self.hp = cfg.mech.hp; o.self.max_hp = cfg.mech.hp
  br.act(o, performance.now() + 1e6)
  B.me.t = 60; B.zone.known = false; B.zoneUrgent = false; B.aliveN = 12; B.foreignDeaths = 0
  const trk = (id, d, extra) => ({ id, kind: 'mech', npc: false, listed: true, phantom: false, conf: 1, x: B.me.x + d, y: B.me.y, z: 0, vx: 0, vy: 0, evx: 0, evy: 0, hp: 1400, maxHp: 1400, dist: d, bearing: 0, yaw: Math.PI,
    rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, steadySince: 60, losOut: true, losIn: true, losOutT: 60, losInT: 60, lastSeen: 60,
    lastDmgInT: 60, lastDmgOutT: 60, dmgIn: ring0(), dmgOut: ring0(), hostile: true, aimAtMe: true, finishable: false, h50Ok: false, a: 83, b: 100, magN: 0, lastBulletT: -99, ...(extra || {}) })
  const L = [trk(10, 90, { hp: opts.tgtHp || 1400 }), trk(11, 110), trk(12, 120)]
  if (opts.noTracks) L.length = 0
  B.trackList = L; B.tracks = new Map(L.map((tr) => [tr.id, tr]))
  B.target = L[0] || null; B.mode = opts.mode || 'FIGHT'; B.modeSince = 0; B.attackers3 = 0
  B.hide.state = 'found'; B.hide.dist = opts.coverM || 12; B.hide.x = B.me.x - B.hide.dist; B.hide.y = B.me.y
  const out = []
  for (const st of opts.steps) {
    for (let r = 0; r < (st.rep || 1); r++) {
      B.me.t = +(B.me.t + 0.1).toFixed(2); B.me.hp = st.hp; B.me.hpf = st.hp / B.me.maxHp
      B.me.gun.ammo = st.ammo === undefined ? 12 : st.ammo; B.me.gun.reload = st.reload || 0
      B.threats = st.n; B.threat1 = L[0] || null; B.A = st.n * 83
      if (st.quiet) { B.lastLosInT = Math.min(B.lastLosInT, B.me.t - 2); B.me.lastShotAtT = Math.min(B.me.lastShotAtT, B.me.t - 2) } else { B.lastLosInT = B.me.t; B.me.lastShotAtT = B.me.t }
      finUpdate(B); decideMode(B); out.push(B.mode)
    }
  }
  return out.join(',')
}
const casesA = [
  ['loseExit', 'on', { steps: [{ n: 2, hp: 630, rep: 20 }, { n: 1, hp: 630 }, { n: 2, hp: 630 }] }],
  ['loseCover', 'near', { coverM: 30, steps: [{ n: 3, hp: 700, rep: 5 }] }],
  ['loseCover', 'low15', { coverM: 30, steps: [{ n: 3, hp: 700, rep: 5 }] }],
  ['loseCover', 'oneHit', { coverM: 30, steps: [{ n: 3, hp: 700, rep: 5 }] }],
  ['loseCover', 'never', { coverM: 30, steps: [{ n: 3, hp: 700, rep: 5 }] }],
  ['loseCover', 'c075', { coverM: 30, steps: [{ n: 3, hp: 700, rep: 5 }] }],
  ['finish', 'ttk', { tgtHp: 200, steps: [{ n: 3, hp: 700, ammo: 6, rep: 5 }] }],
  ['finish', 'ttkb', { tgtHp: 200, steps: [{ n: 3, hp: 800, ammo: 0, reload: 2.3, rep: 2 }, { n: 0, hp: 800, ammo: 0, reload: 0.5, quiet: true, rep: 20 }, { n: 3, hp: 800, rep: 3 }] }],
  ['healDoc', 'on', { mode: 'HOLD', steps: [{ n: 0, hp: 910, quiet: true, rep: 25 }] }],
  ['healDoc', 'full', { mode: 'HEAL', steps: [{ n: 0, hp: 1050, quiet: true, rep: 10 }] }],
  ['healDoc', 'on', { mode: 'HOLD', noTracks: true, steps: [{ n: 0, hp: 910, quiet: true, rep: 25 }] }],
  ['healDoc', 'full', { mode: 'HEAL', noTracks: true, steps: [{ n: 0, hp: 1050, quiet: true, rep: 10 }] }],
  ['healDoc', 'low', { mode: 'HOLD', steps: [{ n: 0, hp: 700, quiet: true, rep: 25 }] }],
  ['healDoc', 'low', { mode: 'HOLD', noTracks: true, steps: [{ n: 0, hp: 700, quiet: true, rep: 25 }] }],
]
for (const [key, val, opts] of casesA) {
  const sq = sceneA({ [key]: val }, null, opts), sq0 = sceneA({ [key]: Object.keys((await imp('params.js')).PRESETS[key])[0] }, null, opts)
  const ff = sceneA({ [key]: val }, 'ffa', opts), ff0 = sceneA({ [key]: Object.keys((await imp('params.js')).PRESETS[key])[0] }, 'ffa', opts)
  check(`T-F2 ${key} '${val}': acts in SQUAD, identical to its old value in forced FFA`, sq !== sq0 && ff === ff0, `SQUAD ${sq0.split(',').slice(-3)} -> ${sq.split(',').slice(-3)} | FFA ${ff0.split(',').slice(-3)} / ${ff.split(',').slice(-3)}`)
}

// ---- Fable line: each new value against its base 'low15' / 'off' (SQUAD acts where intended, forced FFA identical)
{
  const lc = (v, env, coverM, hp) => sceneA({ loseCover: v }, env, { coverM, steps: [{ n: 3, hp, rep: 5 }] }).split(',').pop()
  const row = (v) => [[8, 700], [30, 700], [8, 294], [30, 294], [8, 180], [30, 180], [16, 700]].map(([c, h]) => lc(v, null, c, h)).join(' ')
  const rowF = (v) => [[8, 700], [30, 700], [8, 294], [30, 294], [8, 180], [30, 180], [16, 700]].map(([c, h]) => lc(v, 'ffa', c, h)).join(' ')
  // columns: cover 8 m / 30 m at 50% hp, at 21% hp, at 12.9% hp, then cover 16 m at 50%
  const want = { low15: 'DISENGAGE FIGHT DISENGAGE FIGHT DISENGAGE DISENGAGE', oneHit: 'FIGHT FIGHT DISENGAGE DISENGAGE DISENGAGE DISENGAGE', never: 'FIGHT FIGHT FIGHT FIGHT FIGHT FIGHT' }
  for (const v of ['low15', 'oneHit', 'never']) { const r = row(v); check(`Fable loseCover '${v}' decision table (3 lines; cover 8/30 m at 50%, 21%, 12.9% hp)`, r.split(' ').slice(0, 6).join(' ') === want[v] && rowF(v) === rowF('off'), `${r} | FFA = off ${rowF(v) === rowF('off')}`) }
  // c075: find a cover distance between 0.75 s and 1.5 s of travel: low15 leaves, c075 fights on; at 4 m both leave
  let mid = null
  for (let c = 6; c <= 40 && mid === null; c += 1) if (lc('low15', null, c, 700) === 'DISENGAGE' && lc('c075', null, c, 700) === 'FIGHT') mid = c
  check(`Fable loseCover 'c075' vs low15: a cover distance where low15 leaves and c075 fights on; near cover both leave; forced FFA = off`, mid !== null && lc('c075', null, 3, 700) === 'DISENGAGE' && rowF('c075') === rowF('off'), `first such cover distance ${mid} m; c075 at 3 m ${lc('c075', null, 3, 700)}`)
}
// ---- scene B: the real map (aggr: an unengaged mech at 175 m with no line; ISO: two hostile lines on open ground)
const bd = world.bounds, q0 = nav.nearestPassable((bd.minX + bd.maxX) / 2, (bd.minY + bd.maxY) / 2, 80)
const me0 = { x: q0.x, y: q0.y, z: nav.levelAt(q0.x, q0.y) }
let far = null
for (let r = 175; r <= 195 && !far; r += 5) for (let k = 0; k < 72 && !far; k++) {
  const a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
  if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.component(me0.x, me0.y)) continue
  const z = nav.levelAt(x, y)
  const clear = world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) || world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 8) || world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5) || world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 8.1)
  if (!clear && z - world.ground(x, y) < 1) far = { x, y, z }
}
const zone = { center: [me0.x, me0.y], radius: 600, next_center: [me0.x, me0.y], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }
const obsB = (k, t, hpf, mechs, events) => ({ type: 'obs', tick: 2 * k, t, alive: 12, self: { id: 3, pos: [me0.x, me0.y, me0.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400 * hpf, max_hp: 1400, energy: 100, max_energy: 100, grounded: true,
  cubes: 0, upgrades: [], in_zone: true, weapons: [{ kind: 'gun', cooldown: 0, ammo: 12, reload: 0, stats: Wp.gun }, null], stats: cfg.mech }, mechs, projectiles: [], crates: [], cubes: [], pickups: [], sounds: [], beams: [], events: events || [], drops: [], zone, offer: null })
function runB(sel, env, mk, n = 12) {
  const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, ...(env ? { env } : {}), select: { ...KS, ...sel } })
  const acts = []
  for (let k = 0; k < n; k++) { const a = b.act(mk(k, 40 + k * 0.1), performance.now() + 1e6); acts.push(JSON.stringify(a) + b._B.mode + b._B.legKind) }
  return acts.join('|')
}
if (far) {
  const mkA = (k, t) => obsB(k, t, 0.75, [{ id: 11, kind: 'mech', pos: [far.x, far.y, far.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }])
  for (const v of ['h70', 'any70', 'any70f']) {
    const sq = runB({ aggr: v }, null, mkA), sq0 = runB({ aggr: 'off' }, null, mkA), ff = runB({ aggr: v }, 'ffa', mkA), ff0 = runB({ aggr: 'off' }, 'ffa', mkA)
    check(`T-F2 aggr '${v}': acts in SQUAD (unengaged mech at 75%), identical to off in forced FFA`, sq !== sq0 && ff === ff0, `SQUAD differs ${sq !== sq0}, FFA identical ${ff === ff0}`)
  }
  {
    // Fable F4: any60f at 65% hp (below the any70f gate): acts against 'off' and against 'any70f' in SQUAD, identical to both in forced FFA
    const mk65 = (k, t) => obsB(k, t, 0.65, [{ id: 11, kind: 'mech', pos: [far.x, far.y, far.z], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }])
    const sq = runB({ aggr: 'any60f' }, null, mk65), sq0 = runB({ aggr: 'off' }, null, mk65), sq7 = runB({ aggr: 'any70f' }, null, mk65)
    const ff = runB({ aggr: 'any60f' }, 'ffa', mk65), ff0 = runB({ aggr: 'off' }, 'ffa', mk65), ff7 = runB({ aggr: 'any70f' }, 'ffa', mk65)
    check(`T-F2 aggr 'any60f': acts in SQUAD (unengaged mech at 65%) vs off and vs any70f, identical to both in forced FFA`, sq !== sq0 && sq !== sq7 && ff === ff0 && ff === ff7, `SQUAD differs off ${sq !== sq0} any70f ${sq !== sq7}, FFA identical ${ff === ff0 && ff === ff7}`)
  }
}
{
  // ISO: two hostile mechs at 80 / 100 m with lines; the posEval goal is placed at 25 m inside its 0.3 s cache window
  const clearTo = (x, y, z) => world.shotClear(me0.x, me0.y, me0.z + 7, x, y, z + 4.5) && world.shotClear(x, y, z + 7, me0.x, me0.y, me0.z + 4.5)
  const pts = []
  for (let k = 0; k < 72 && pts.length < 2; k++) {
    const r = pts.length === 0 ? 80 : 100, a = k * Math.PI / 36, x = me0.x + r * Math.cos(a), y = me0.y + r * Math.sin(a)
    if (!nav.passableAt(x, y)) continue
    const z = nav.levelAt(x, y)
    if (z - world.ground(x, y) < 1 && clearTo(x, y, z)) pts.push({ x, y, z, a })
  }
  const mkI = (k, t) => obsB(k, t, 1, pts.map((p, i) => ({ id: 30 + i, kind: 'mech', pos: [p.x, p.y, p.z], vel: [0, 0, 0], aim: [p.a + Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false })),
    [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: pts[0].a, by: 30 }, { type: 'damaged', amount: 45, weapon: 'gun', bearing: pts[1].a, by: 31 }])
  const runI = (v, env) => {
    const b = createBrain(hello, { world, nav, log: () => {} }, { warmup: false, ...(env ? { env } : {}), select: { ...KS, isolate: v } }), B = b._B
    for (let k = 0; k < 6; k++) b.act(mkI(k, 40 + k * 0.1), performance.now() + 1e6)
    Object.assign(B.posGoal, { ok: true, kind: 'fight', x: me0.x - Math.cos(pts[0].a) * 25, y: me0.y - Math.sin(pts[0].a) * 25, xOther: 0, t: B.me.t, t0: B.me.t })
    const a = b.act(mkI(6, 40.6), performance.now() + 1e6)
    return JSON.stringify(a) + B.legKind
  }
  if (pts.length === 2) check(`T-F2 isolate 'near': acts in SQUAD (cell 25 m), identical to 'any' in forced FFA`, runI('near') !== runI('any') && runI('near', 'ffa') === runI('any', 'ffa'), `SQUAD ${runI('any').slice(-12)} -> ${runI('near').slice(-12)}`)
}
{
  // CR: two prey mechs (no map, not candidates: 150 / 180 m, not aiming, not closing); A has a neighbour 90 m away
  const o0 = { x: 0, y: 0, z: 0 }
  const mkC = (k, t) => { const o = obsB(k, t, 1, [
    { id: 40, kind: 'mech', pos: [150, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false },
    { id: 41, kind: 'mech', pos: [150, 90, 0], vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false },
    { id: 42, kind: 'mech', pos: [-180, 0, 0], vel: [0, 0, 0], aim: [Math.PI, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false }]); o.self.pos = [0, 0, 0]; o.zone = { center: [0, 0], radius: 600, next_center: [0, 0], next_radius: 400, shrink_start: 1e4, shrink_end: 1e4 + 50, dps: 20 }; return o }
  const runC = (v, env) => { const b = createBrain(hello, { world: null, nav: null, log: () => {} }, { warmup: false, ...(env ? { env } : {}), select: { ...KS, seekCrowd: v } }); let a = null; for (let k = 0; k < 10; k++) a = b.act(mkC(k, 40 + k * 0.1), performance.now() + 1e6); const p = b._B.hunt.prey(); return JSON.stringify(a) + (p ? p.id : -1) + b._B.legKind }
  check(`T-F2 seekCrowd 'wide': acts in SQUAD (prey choice), identical to 'off' in forced FFA`, runC('wide') !== runC('off') && runC('wide', 'ffa') === runC('off', 'ffa'), `SQUAD prey/leg ${runC('off').slice(-8)} -> ${runC('wide').slice(-8)}`)
}
console.log(`\n${pass}/${pass + fail} T-F2 checks passed`)
process.exit(fail ? 1 : 0)
