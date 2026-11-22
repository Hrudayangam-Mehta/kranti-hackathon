// R7a item 5 tests: FIN (finish off / ttk / ttkb; R5 3.1, AL item 1 T1-T4), decideMode on synthetic brain states (no map).
// usage: bun test_fin7.mjs [bot dir]
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work'
const BOT = process.argv[2] || join(W, 'bot')
const imp = (f) => import(pathToFileURL(join(BOT, 'lib', f)).href)
const { createBrain } = await imp('brain.js'), { decideMode, finUpdate } = await imp('tactics.js')
const lines = gunzipSync(readFileSync(join(W, 'kit/check/stream.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines.find((l) => l.type === 'hello'), cfg = hello.config, streamObs = lines.filter((l) => l.type === 'obs')
let pass = 0, fail = 0
const check = (name, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail); if (ok) pass++; else fail++ }
const ctxNone = { world: null, nav: null, log: () => {} }
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const HB = (sel, over) => createBrain(hello, ctxNone, { warmup: false, ...(over || {}), select: { ...KS, ...(sel || {}) } })
const Wp = cfg.weapons
const wobs = () => {
  const o = JSON.parse(JSON.stringify(streamObs[0]))
  o.mechs = []; o.events = []; o.sounds = []; o.t = 60; o.alive = 12
  o.self.weapons = [{ kind: 'gun', ammo: 12, reload: 0, cooldown: 0, stats: Wp.gun }]
  o.self.energy = 100; o.self.cubes = 0; o.self.hp = cfg.mech.hp; o.self.max_hp = cfg.mech.hp
  return o
}
const ring0 = () => ({ t: new Float64Array(16).fill(-99), a: new Float32Array(16), i: 0, n: 0 })
const trk = (B, id, d, extra) => ({ id, kind: 'mech', npc: false, listed: true, phantom: false, conf: 1, x: B.me.x + d, y: B.me.y, z: 0, vx: 0, vy: 0, evx: 0, evy: 0, hp: 1400, maxHp: 1400, dist: d, bearing: 0, yaw: Math.PI,
  rearOn: false, hasGun: true, hasLaser: false, hasLightning: false, hasMortar: false, cubes: 0, steadySince: B.me.t, losOut: true, losIn: true, losOutT: B.me.t, losInT: B.me.t, lastSeen: B.me.t,
  lastDmgInT: B.me.t, lastDmgOutT: B.me.t, dmgIn: ring0(), dmgOut: ring0(), hostile: true, aimAtMe: true, finishable: false, h50Ok: false, a: 83, b: 100, magN: 0, lastBulletT: -99, ...(extra || {}) })
const setTracks = (B, L) => { B.trackList = L; B.tracks = new Map(L.map((tr) => [tr.id, tr])) }
/** Target 200 hp at 90 m and two more hostile lines (B.A 250); step() runs finUpdate + decideMode once per 0.1 s. */
function scene(sel, over, opts = {}) {
  const br = HB(sel, over), B = br._B
  br.act(wobs(), performance.now() + 1e6)
  B.me.t = 60; B.zone.known = !!opts.late; if (opts.late) { B.zone.nr = 60; B.zone.r = 120 } B.zoneUrgent = false; B.aliveN = opts.alive || 12; B.foreignDeaths = 0
  const L = [trk(B, 10, 90, { hp: 200 }), trk(B, 11, 110), trk(B, 12, 120)]
  setTracks(B, L)
  B.target = L[0]; B.mode = 'FIGHT'; B.modeSince = 0; B.attackers3 = 0
  B.hide.state = 'found'; B.hide.dist = 12; B.hide.x = B.me.x - 12; B.hide.y = B.me.y
  const step = (o) => {
    B.me.t = +(B.me.t + 0.1).toFixed(2)
    const hp = o.hp === undefined ? 700 : o.hp
    B.me.hp = hp; B.me.hpf = hp / B.me.maxHp
    const g = B.me.gun; g.ammo = o.ammo === undefined ? 12 : o.ammo; g.reload = o.reload || 0; g.cooldown = 0
    const quiet = !!o.quiet
    B.threats = quiet ? 0 : 3; B.threat1 = L[0]; B.A = quiet ? 0 : 250
    if (!quiet) { B.lastLosInT = B.me.t; B.me.lastShotAtT = B.me.t } else { B.lastLosInT = Math.min(B.lastLosInT, B.me.t - 2); B.me.lastShotAtT = Math.min(B.me.lastShotAtT, B.me.t - 2) }
    finUpdate(B)
    decideMode(B)
    return B.mode
  }
  return { B, step }
}
const V = ['off', 'ttk', 'ttkb']
// T1: three lines (B.A 250), our hp 700, ammo 6 -> not LOSING (near kill: TTK 1.2 s, 250 x 1.5 = 375 <= 700 - 275)
{
  const r = {}, st = {}
  for (const v of V) { const s = scene({ finish: v }); let m = ''; for (let k = 0; k < 5; k++) m = s.step({ ammo: 6 }); r[v] = m; st[v] = { near: s.B.finNear, T: +s.B.finT.toFixed(2), in3: s.B.finIn3, losing: s.B.losing } }
  check('FIN T1 ammo 6, three lines, hp 700: off LOSING (DISENGAGE); ttk / ttkb keep fighting', r.off === 'DISENGAGE' && r.ttk === 'FIGHT' && r.ttkb === 'FIGHT' && st.ttkb.near && !st.ttkb.losing, `${JSON.stringify(r)} ${JSON.stringify(st.ttkb)}`)
}
// T2 (hp 800 = 57%: LOSING with 3 lines, above the 55% HEAL entry): ammo 0 and reload 2.4 -> DISENGAGE; quiet while reloading: off / ttk HEAL (after LOSING), ttkb no HEAL (armed);
// reloaded (ammo 12), target still 200 hp, lines back -> ttk FIGHT within one decision, off / ttk DISENGAGE
{
  const r = {}
  for (const v of V) {
    const s = scene({ finish: v })
    const a = []; for (let k = 0; k < 20; k++) a.push(s.step({ hp: 800, ammo: 0, reload: 2.4 - 0.1 * k > 0.5 ? 2.4 - 0.1 * k : 0.5 }))
    const b = []; for (let k = 0; k < 20; k++) b.push(s.step({ hp: 800, ammo: 0, reload: 0.5, quiet: true }))
    const c = []; for (let k = 0; k < 3; k++) c.push(s.step({ hp: 800, ammo: 12 }))
    r[v] = { phase1: a[2], late1: a[a.length - 1], quiet: b[b.length - 1], reloaded: c.join(',') }
  }
  check('FIN T2 empty gun (reload 2.2 s left, TTK 3.4 s) with 3 lines: DISENGAGE for every value; with 0.5 s left (TTK 1.7 s) ttk / ttkb fight, off retreats', V.every((v) => r[v].phase1 === 'DISENGAGE') && r.off.late1 === 'DISENGAGE' && r.ttk.late1 === 'FIGHT' && r.ttkb.late1 === 'FIGHT', JSON.stringify(r))
  check('FIN T2 quiet while reloading: off / ttk HEAL (afterLose), ttkb no HEAL while the kill is armed', r.off.quiet === 'HEAL' && r.ttk.quiet === 'HEAL' && r.ttkb.quiet !== 'HEAL', `off ${r.off.quiet}, ttk ${r.ttk.quiet}, ttkb ${r.ttkb.quiet}`)
  check('FIN T2 reloaded, target 200 hp, lines back: ttkb FIGHT in the first decision; off stays out', r.ttkb.reloaded.split(',')[0] === 'FIGHT' && r.off.reloaded.split(',')[0] !== 'FIGHT', `off ${r.off.reloaded}, ttk ${r.ttk.reloaded}, ttkb ${r.ttkb.reloaded}`)
}
// T3: our hp 300 -> HEAL as V4 (quiet), and no near kill (250 x 1.5 > 300 - 275)
{
  const r = {}
  for (const v of V) { const s = scene({ finish: v }); for (let k = 0; k < 5; k++) s.step({ hp: 300, ammo: 0, reload: 2 }); let m = ''; for (let k = 0; k < 20; k++) m = s.step({ hp: 300, ammo: 12, quiet: true }); r[v] = { m, near: s.B.finNear } }
  check('FIN T3 hp 300: HEAL under every value (V4 rule), no near kill', V.every((v) => r[v].m === 'HEAL' && !r[v].near), JSON.stringify(r))
}
// T4: FFA, late zone (next radius 60 m), 3 alive -> identical to off
{
  const seq = (sel, over, opts) => { const s = scene(sel, over, opts); const m = []; for (let k = 0; k < 10; k++) m.push(s.step({ ammo: 6 })); for (let k = 0; k < 10; k++) m.push(s.step({ ammo: 0, reload: 1, quiet: true })); return m.join(',') }
  const f = seq({ finish: 'ttkb' }, { env: 'ffa' }) === seq({ finish: 'off' }, { env: 'ffa' })
  const z = seq({ finish: 'ttkb' }, null, { late: true }) === seq({ finish: 'off' }, null, { late: true })
  const a = seq({ finish: 'ttkb' }, null, { alive: 3 }) === seq({ finish: 'off' }, null, { alive: 3 })
  const ctl = seq({ finish: 'ttkb' }) !== seq({ finish: 'off' })
  check('FIN T4 firewall: FFA / late zone / 3 alive identical to off (control differs)', f && z && a && ctl, `ffa ${f}, late ${z}, 3 alive ${a}, control differs ${ctl}`)
}
console.log(`\n${pass}/${pass + fail} FIN checks passed`)
process.exit(fail ? 1 : 0)
