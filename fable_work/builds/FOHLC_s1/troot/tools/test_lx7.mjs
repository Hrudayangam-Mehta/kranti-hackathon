// R7a item 4 tests: LX loseExit (off / on) and LC loseCover (off / near), decideMode on synthetic brain states (no map).
// Helpers follow tools/test_brain.js group h50 (our own test code). usage: bun test_lx7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FOHLC_s1/troot'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { createBrain } = await imp('brain.js'), { decideMode } = await imp('tactics.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, streamObs = lines.filter((l) => l.type === 'obs')
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const ctxNone = { world: null, nav: null, log: () => {} }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const HB = (sel, over) => createBrain(hello, ctxNone, { warmup: false, ...(over || {}), select: { ...KS, ...(sel || {}) } })
const Wp = cfg.weapons
const wobs = (weapons) => {
  const o = JSON.parse(JSON.stringify(streamObs[0]))
  o.mechs = []; o.events = []; o.sounds = []; o.t = 60; o.alive = 12
  o.self.weapons = weapons.map((k) => k === 'gun' ? { kind: 'gun', ammo: 12, reload: 0, cooldown: 0, stats: Wp.gun } : { kind: k, charge: 0, cooldown: 0, stats: Wp[k] })
  o.self.energy = 100; o.self.cubes = 0; o.self.hp = cfg.mech.hp; o.self.max_hp = cfg.mech.hp
  return o
}
const ring0 = () => ({ t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 })
const trk = (B, id, d, extra) => ({ id, kind: 'mech', npc: false, listed: true, phantom: false, conf: 1, x: B.me.x + d, y: B.me.y, z: 0, vx: 0, vy: 0, evx: 0, evy: 0, hp: 1400, maxHp: 1400, dist: d, bearing: 0, yaw: Math.PI,
  rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, steadySince: B.me.t, losOut: true, losIn: true, losOutT: B.me.t, losInT: B.me.t, lastSeen: B.me.t,
  lastDmgInT: B.me.t, lastDmgOutT: -99, dmgIn: ring0(), dmgOut: ring0(), hostile: true, aimAtMe: true, finishable: false, h50Ok: false, a: 60, b: 100, magN: 0, lastBulletT: -99, ...(extra || {}) })
const setTracks = (B, L) => { B.trackList = L; B.tracks = new Map(L.map((tr) => [tr.id, tr])) }
/** A brain in FIGHT at t 60 against n hostile lines; returns { B, step(n, hpf, tgtHpf) -> mode } running decideMode once per 0.1 s. */
function scene(sel, over, opts = {}) {
  const br = HB(sel, over), B = br._B
  br.act(wobs(['gun']), performance.now() + 1e6)
  B.me.t = 60; B.zone.known = false; B.zoneUrgent = false; B.aliveN = 12; B.foreignDeaths = opts.foreign || 0
  const L = [0, 1, 2, 3].map((i) => trk(B, 10 + i, 90 + 10 * i))
  setTracks(B, L)
  B.target = L[0]; B.mode = 'FIGHT'; B.modeSince = 0; B.lastLosInT = 60; B.me.lastShotAtT = 60; B.attackers3 = 0
  B.hide.state = opts.hide === undefined ? 'found' : opts.hide; B.hide.dist = opts.coverM === undefined ? 12 : opts.coverM; B.hide.x = B.me.x - B.hide.dist; B.hide.y = B.me.y
  if (opts.commit) { B.h50.on = true; B.h50.commit = L[0]; B.h50.lines = 2 }
  const step = (n, hpf, tgtHpf = 1) => {
    B.me.t = +(B.me.t + 0.1).toFixed(2); B.me.hp = hpf * B.me.maxHp; B.me.hpf = hpf; B.threats = n; B.threat1 = L[0]
    L[0].hp = tgtHpf * L[0].maxHp; B.lastLosInT = B.me.t; B.me.lastShotAtT = B.me.t
    decideMode(B)
    return B.mode
  }
  return { B, step }
}
// ---------------------------------------------------------------- LX
{
  // T1: 2 lines at 45% (LOSING), after the 1.5 s minimum stay one decision with 1 line (raw false), then 2 again
  const run = (v) => { const s = scene({ loseExit: v }); const m = []; for (let k = 0; k < 20; k++) m.push(s.step(2, 0.45)); m.push(s.step(1, 0.45)); m.push(s.step(2, 0.45)); return { m, held: s.B.counters.loseHeld || 0 } }
  const off = run('off'), on = run('on')
  check('LX T1 one dip of the threat count: off leaves LOSING (FIGHT) for the dip; on stays DISENGAGE', off.m[20] === 'FIGHT' && on.m[20] === 'DISENGAGE' && on.m[21] === 'DISENGAGE' && on.held >= 1,
    `off ${off.m.slice(18).join(' ')} | on ${on.m.slice(18).join(' ')} (held ${on.held})`)
  // T2: raw false for 10 decisions -> FIGHT on the 11th (1.0 s), the mode switch is urgent once LOSING ends
  const s = scene({ loseExit: 'on' }); for (let k = 0; k < 20; k++) s.step(2, 0.45)
  const m = []; for (let k = 0; k < 12; k++) m.push(s.step(1, 0.45))
  const first = m.indexOf('FIGHT')
  check('LX T2 raw false for 10 decisions: FIGHT on the 11th', first === 10 && m.slice(0, 10).every((x) => x === 'DISENGAGE'), m.join(' '))
  // T3: the target drops to 15% hp (finishing): LOSING ends at once
  const f = scene({ loseExit: 'on' }); for (let k = 0; k < 20; k++) f.step(2, 0.45)
  const fm = f.step(2, 0.45, 0.15)
  check('LX T3 finishing exit (target 15%, 2 lines) is not delayed', fm === 'FIGHT', `mode ${fm}, finishing ${f.B.finishing}`)
  // T4: FFA, the pulse retreat and a hunt50 commit are identical to off
  const seq = (sel, over, opts) => { const q = scene(sel, over, opts); const r = []; for (let k = 0; k < 20; k++) r.push(q.step(2, 0.45)); r.push(q.step(1, 0.45)); r.push(q.step(2, 0.45)); return r.join(',') }
  const eqF = seq({ loseExit: 'on' }, { env: 'ffa' }) === seq({ loseExit: 'off' }, { env: 'ffa' })
  const eqP = seq({ loseExit: 'on', retreat: 'pulse' }) === seq({ loseExit: 'off', retreat: 'pulse' })
  const eqH = seq({ loseExit: 'on', hunt: 'h50' }, null, { commit: true }) === seq({ loseExit: 'off', hunt: 'h50' }, null, { commit: true })
  check('LX T4 FFA / pulse retreat / hunt50 commit: on = off', eqF && eqP && eqH, `ffa ${eqF}, pulse ${eqP}, commit ${eqH}`)
}
// ---------------------------------------------------------------- LC
{
  const one = (sel, n, hpf, opts) => { const s = scene(sel, null, opts); let m = ''; for (let k = 0; k < 5; k++) m = s.step(n, hpf); return { m, lc: s.B.counters.lcFight || 0 } }
  const far = (v) => one({ loseCover: v }, 3, 0.5, { coverM: 30 }), near8 = (v) => one({ loseCover: v }, 3, 0.5, { coverM: 8 })
  const low = (v) => one({ loseCover: v }, 3, 0.2, { coverM: 30 }), none = (v) => one({ loseCover: v }, 3, 0.5, { hide: 'none' })
  const r = { farOff: far('off').m, farOn: far('near').m, near8On: near8('near').m, lowOn: low('near').m, noneOn: none('near').m, noneOff: none('off').m }
  check('LC 3 lines at 50%: cover 30 m -> FIGHT (off: DISENGAGE); cover 8 m -> DISENGAGE', r.farOff === 'DISENGAGE' && r.farOn === 'FIGHT' && r.near8On === 'DISENGAGE', JSON.stringify(r))
  check('LC 20% hp with a cell 30 m away -> DISENGAGE (the < 25% clause); no cell -> FIGHT (off: DISENGAGE)', r.lowOn === 'DISENGAGE' && r.noneOn === 'FIGHT' && r.noneOff === 'DISENGAGE', JSON.stringify(r))
  const fwF = one({ loseCover: 'near' }, 3, 0.5, { coverM: 30, foreign: 1 }).m, fwP = one({ loseCover: 'near', retreat: 'pulse' }, 3, 0.5, { coverM: 30 }).m
  check('LC firewall: after a foreign death and with the pulse retreat it is inert', fwF === 'DISENGAGE' && fwP === one({ loseCover: 'off', retreat: 'pulse' }, 3, 0.5, { coverM: 30 }).m, `foreign ${fwF}, pulse ${fwP}`)
}
console.log(`\n${pass}/${pass + fail} LX / LC checks passed`)
process.exit(fail ? 1 : 0)
