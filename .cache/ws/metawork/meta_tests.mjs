// usage: bun meta_tests.mjs <MX_meta dir> : synthetic scenes for the META_SPEC v1 rules (meta slot vs salt-1 slot,
// same code, same salt), forced FFA identity, kit-stream decision time, injected-offer stream.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const KP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const DIR = process.argv[2]
const lines = gunzipSync(readFileSync(KP + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const hello = lines[0], OBS = lines.filter((l) => l.type === 'obs')
const { World } = await import(DIR + '/lib/world.js'), { Nav } = await import(DIR + '/lib/nav.js'), { createBrain } = await import(DIR + '/lib/brain.js')
const { bandFor } = await import(DIR + '/lib/tactics.js')
const { META_ORDERS, META_K } = await import(DIR + '/lib/meta.js')
const world = World.loadSync(KP + '/kit/arena')
const META = '121m111111111111', BASE = '1211111111111111'      // hello.slot = 3
const cfg = hello.config
let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) pass++; else fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`) }
const clone = (o) => JSON.parse(JSON.stringify(o))
const brain = (table, extra = {}) => createBrain(hello, { world, nav: new Nav(world, { cell: 2, stepUp: 1.2, maxSlopeDeg: 50 }), log: () => {} }, { saltTable: table, fuseMs: 1e9, ...extra })
const laserW = () => ({ kind: 'laser', cooldown: 0, charge: 0, stats: cfg.weapons.laser })

// ---------------------------------------------------------------- 1. upgrade offers (set a): R1 hp before damage
/** Play kit observations 0..29 with no mechs, then decision 30 with the scene's offer; returns { pick id, B }. */
function offerScene(table, sc, extra) {
  const b = brain(table, extra)
  let a = null
  for (let i = 0; i <= 30; i++) {
    const o = clone(OBS[i]); o.mechs = []; o.events = []
    if (sc.t != null) o.t = sc.t + (i - 30) * 0.1
    if (sc.laser) o.self.weapons[1] = laserW()
    if (sc.ups) o.self.upgrades = sc.ups.slice()
    if (sc.cubes != null) o.self.cubes = sc.cubes
    if (sc.hpf != null) o.self.hp = Math.round(o.self.max_hp * sc.hpf)
    b._B.counters.kills = sc.kills || 0
    if (i === 30) o.offer = { id: 1, expires: o.t + 5, choices: sc.offer.map((id) => ({ id })) }
    a = b.act(o, performance.now() + 1e6)
  }
  return { id: sc.offer[a.pick], B: b._B }
}
const scenes = [
  { name: 'plating first (stacks 0) over damage', offer: ['gun_rate', 'gun_damage', 'plating'], want: 'plating', base: 'plating' },
  { name: 'plating stacks 3: armor first', offer: ['gun_rate', 'armor', 'laser_damage'], ups: ['plating', 'plating', 'plating'], laser: true, t: 60, kills: 1, want: 'armor', base: 'armor' },
  { name: 'no laser, 0 kills, t<45: gun_damage above nanites', offer: ['nanites', 'gun_damage', 'gun_mag'], want: 'gun_damage', base: 'nanites' },
  { name: 'no laser, 0 kills, t<45: gun_mag above nanites', offer: ['nanites', 'sensors', 'gun_mag'], want: 'gun_mag', base: 'nanites' },
  { name: 'SQUAD t=60 1 kill: nanites below gun_damage', offer: ['nanites', 'gun_damage', 'servos'], t: 60, kills: 1, want: 'gun_damage', base: 'nanites' },
  { name: 'hp 30% at zero lines: nanites third again', offer: ['nanites', 'gun_damage', 'servos'], t: 60, kills: 1, hpf: 0.3, want: 'nanites', base: 'nanites' },
  { name: 'laser, 0 lens, 0 kills, t<45: laser_damage above armor', offer: ['armor', 'laser_damage', 'nanites'], laser: true, want: 'laser_damage', base: 'armor' },
  { name: 'laser, 0 lens, t>=45: armor stays above laser_damage', offer: ['armor', 'laser_damage', 'nanites'], laser: true, t: 60, want: 'armor', base: 'armor' },
  { name: 'laser, 1 lens, 3 cubes: laser_damage above nanites (hp 30%)', offer: ['nanites', 'laser_damage', 'gun_damage'], laser: true, ups: ['laser_damage'], cubes: 3, t: 60, kills: 2, hpf: 0.3, want: 'laser_damage', base: 'nanites' },
  { name: 'never plating below an override', offer: ['laser_damage', 'gun_damage', 'plating'], laser: true, want: 'plating', base: 'plating' },
  { name: 'gun_rate after gun_mag (late)', offer: ['gun_rate', 'gun_mag', 'sensors'], t: 100, kills: 2, ups: ['plating', 'plating', 'plating', 'armor', 'armor', 'armor'], want: 'gun_mag', base: 'gun_rate' },
]
for (const sc of scenes) {
  const m = offerScene(META, sc), b = offerScene(BASE, sc)
  ok(`offer: ${sc.name}`, m.id === sc.want && b.id === sc.base, `meta ${m.id} (want ${sc.want}), salt-1 ${b.id} (today ${sc.base}), bits ${m.B.meta ? m.B.meta.bits : '-'}`)
}
{
  const f = offerScene(META, { offer: ['nanites', 'gun_damage', 'gun_mag'] }, { env: 'ffa' })
  ok('offer: forced FFA keeps today\'s order', f.id === 'nanites' && f.B.meta && f.B.meta.on === false, `pick ${f.id}`)
}
{
  let above = 0
  for (const o of META_ORDERS) if (o[0] !== 'plating' || o.length !== 22 || new Set(o).size !== 22) above++
  ok('orders: 16 states, plating always first, 22 distinct ids, no mortar_damage / mortar_rate', above === 0 && !META_ORDERS.some((o) => o.includes('mortar_damage') || o.includes('mortar_rate')))
}

// ---------------------------------------------------------------- 2. pickup wants (set b): R2 never leave a fight for an item
{
  const b = brain(META), B = b._B
  for (let i = 0; i <= 20; i++) { const o = clone(OBS[i]); o.mechs = []; b.act(o, performance.now() + 1e6) }
  const M = B.meta, me = B.me
  const cube = { x: me.x + 40, y: me.y, z: me.z, id: 1 }
  const R = (lines, cubes, contact, baseR, kc = false, kro = true) => { B.nLos = lines; me.cubes = cubes; B.losing = false; return M.cubeReach(cube, kc, kro, contact, baseR) }
  ok('cube: threshold (2 -> 3) at 1 line reaches 100 m', R(1, 2, true, 70) === 100)
  ok('cube: threshold at 2 lines only 30 m', R(2, 2, true, 70) === 30)
  ok('cube: other cube at 1 line 52 m, 2 lines 30 m', R(1, 3, true, 70) === 52 && R(2, 3, true, 70) === 30)
  ok('cube: other cube at zero lines (LOOT) keeps today\'s reach', R(0, 3, false, 60) === 60)
  ok('cube: refused at 10 cubes, wanted at 13 (within 2 of 15)', R(0, 10, false, 60) === 0 && R(0, 13, false, 60) > 0)
  B.killDrops.push({ x: cube.x, y: cube.y, t: me.t })
  const p1 = R(1, 3, true, 200, true), p2 = R(2, 3, true, 200, true), p3 = R(3, 3, true, 200, true), p0 = R(0, 3, false, 200, true)
  ok('pile (n = 2): 115 m at 0-1 line, 58 m at 2 lines, 25 m at 3+ lines', p0 === 115 && p1 === 115 && p2 === 58 && p3 === 25, `${p0} ${p1} ${p2} ${p3}`)
  ok('pile: killReachOk false caps at today\'s non-kill reach', R(1, 3, true, 40, true, false) === 40)
  // abort after 6 s of walking at the pile
  B.grab = { type: 'cube', x: cube.x, y: cube.y }
  const t0 = me.t
  M.update({ self: { upgrades: [] } }); me.t = t0 + 6.5; M.update({ self: { upgrades: [] } })
  ok('pile: walk abandoned after 6 s (cubes become ordinary cubes)', M.pileAbortT === B.killDrops[B.killDrops.length - 1].t && R(1, 3, true, 70, true) === 52)
  me.t = t0; B.grab = null; B.killDrops.length = 0
  // crates and drones
  me.hpf = 0.5; ok('crate: 7 gun rounds and hp >= 40% (300 hp crate at 50% hp)', M.crateOk({ hp: 300 }) === true && M.crateOk({ hp: 400 }) === false)
  me.hpf = 0.3; ok('crate: refused under 40% hp', M.crateOk({ hp: 300 }) === false)
  me.hpf = 0.6; M.mechSeenT = me.t - 1; const d1 = M.droneOk(); M.mechSeenT = me.t - 5; const d2 = M.droneOk(); me.hpf = 0.45; const d3 = M.droneOk()
  ok('drone: hp >= 50% and no mech seen for 4 s', d1 === false && d2 === true && d3 === false)
}
/** Pickup scene: decision i0..i0+k with one pickup placed `dist` m away on open ground (or at our feet). */
function pickupScene(table, kind, dist, kills, t, extra) {
  const b = brain(table, extra), B = b._B
  let a = null, at = null, took = false
  for (let i = 0; i <= 12; i++) {
    const o = clone(OBS[i]); o.mechs = []; o.events = []
    if (t != null) o.t = t + i * 0.1
    B.counters.kills = kills
    if (!at) {
      const [x, y] = o.self.pos
      for (let k = 0; k < 16 && !at; k++) {
        const ang = k * Math.PI / 8, px = x + dist * Math.cos(ang), py = y + dist * Math.sin(ang)
        if (dist < 1 || (B.nav && B.nav.passableAt(px, py) && B.nav.walkLine(x, y, px, py))) at = [px, py, B.nav ? B.nav.levelAt(px, py) : o.self.pos[2]]
      }
    }
    o.pickups = [{ id: 9001, kind, pos: dist < 1 ? o.self.pos.slice() : at }]
    a = b.act(o, performance.now() + 1e6)
    if (a.take === 9001) took = true
  }
  return { a, B, took, goal: (B.grab && B.grab.id === 9001) || (B.loot && B.loot.id === 9001) }
}
{
  const m = pickupScene(META, 'mortar', 0, 0, 100), b = pickupScene(BASE, 'mortar', 0, 0, 100)
  ok('mortar: never taken in SQUAD (empty slot, nothing better for 60 s)', !m.took && b.took, `meta took ${m.took}, salt-1 took ${b.took}, mortarNo ${m.B.meta.cnt.mortarNo}`)
  const m0 = pickupScene(META, 'laser', 30, 0), m3 = pickupScene(META, 'laser', 30, 3), b3 = pickupScene(BASE, 'laser', 30, 3)
  ok('laser at 30 m, none held: sought at 0 kills, on-path only from 3 kills', m0.goal && !m3.goal && b3.goal, `meta k0 ${m0.goal}, meta k3 ${m3.goal}, salt-1 k3 ${b3.goal}`)
  const l50 = pickupScene(META, 'lightning', 50, 0), b50 = pickupScene(BASE, 'lightning', 50, 0), l20 = pickupScene(META, 'lightning', 20, 0)
  ok('lightning into the empty slot only within 35 m', !l50.goal && l20.goal && b50.goal, `meta 50 m ${l50.goal}, meta 20 m ${l20.goal}, salt-1 50 m ${b50.goal}`)
}

// ---------------------------------------------------------------- 2b. finish and reload (set c)
/** Kit decisions i0..i1 as recorded, but every listed mech at `hp`, a full laser in slot 1 and the gun at `ammo` rounds;
 *  from `strip` on the mechs are removed (the lull). Returns per decision the action and the meta counters. */
function fightScene(table, { hp, ammo, strip = 1e9, i0 = 60, i1 = 160, pull = 0 }) {
  const b = brain(table), B = b._B, acts = []
  for (let i = 0; i <= i1; i++) {
    const o = clone(OBS[i])
    if (i >= i0) {
      for (const m of o.mechs) {
        if (hp != null) m.hp = hp
        if (pull > 0) {
          // the recorded mech pulled in to `pull` m on its own bearing (gun flight under gunFlightMax)
          const dx = m.pos[0] - o.self.pos[0], dy = m.pos[1] - o.self.pos[1], d = Math.hypot(dx, dy) || 1
          m.pos[0] = o.self.pos[0] + dx / d * pull; m.pos[1] = o.self.pos[1] + dy / d * pull
          m.pos[2] = world.ground(m.pos[0], m.pos[1])
        }
      }
      o.self.weapons[1] = { ...laserW(), charge: cfg.weapons.laser.charge }
      if (ammo != null) { o.self.weapons[0].ammo = ammo; o.self.weapons[0].reload = 0 }
      if (i >= strip) { o.mechs = []; o.events = []; o.projectiles = [] }
    }
    acts.push(b.act(o, performance.now() + 1e6))
  }
  return { acts, B }
}
{
  const m = fightScene(META, { hp: 80, ammo: 12, pull: 90 }), b = fightScene(BASE, { hp: 80, ammo: 12, pull: 90 })
  let held = 0, rel = 0, gunM = 0, gunB = 0
  for (let i = 60; i < m.acts.length; i++) {
    if (m.acts[i].fire[1] && !b.acts[i].fire[1]) held++
    if (!m.acts[i].fire[1] && b.acts[i].fire[1]) rel++
    if (m.acts[i].fire[0]) gunM++
    if (b.acts[i].fire[0]) gunB++
  }
  const c = m.B.meta.cnt
  ok('gun finish: a target the gun kills in 2 rounds keeps the beam held (gun fires)', c.gunFin > 0 && c.gunFinHold > 0 && held > 0 && gunM > 0, `gunFin ${c.gunFin}, held-instead-of-release ${c.gunFinHold}, decisions with the beam held only by the meta ${held}, gun shots meta ${gunM} / salt-1 ${gunB} (mech pulled to 90 m, 80 hp)`)
  const m2 = fightScene(META, { hp: 300, ammo: 12, pull: 90 })
  ok('gun finish: not for a target above 90 hp x damage multiplier', m2.B.meta.cnt.gunFin === 0)
}
{
  let found = null
  for (const strip of [100, 110, 120, 130, 140, 150, 170, 190]) {
    const m = fightScene(META, { ammo: 7, strip, i1: strip + 40 }), b = fightScene(BASE, { ammo: 7, strip, i1: strip + 40 })
    const fm = m.acts.findIndex((a, i) => i >= strip && a.reload), fb = b.acts.findIndex((a, i) => i >= strip && a.reload)
    if (fm >= 0 && (fb < 0 || fb > fm)) { found = { strip, fm, fb, n: m.B.meta.cnt.reload8 }; break }
  }
  ok('reload: in a lull with 7 rounds the meta reloads first (today waits for <= 4 or 2 s quiet without a target)', !!found && found.n > 0, found ? `lull from decision ${found.strip}: meta reloads at ${found.fm}, salt-1 at ${found.fb}, reload8 ${found.n}` : 'no lull found')
}

// ---------------------------------------------------------------- 3. range band (deferred in v1: unchanged)
{
  const m = brain(META), b = brain(BASE)
  for (let i = 0; i <= 5; i++) { m.act(clone(OBS[i]), performance.now() + 1e6); b.act(clone(OBS[i]), performance.now() + 1e6) }
  const g1 = { ...bandFor(m._B) }, g2 = { ...bandFor(b._B) }
  const oL = clone(OBS[6]); oL.self.weapons[1] = laserW()
  m.act(clone(oL), performance.now() + 1e6); b.act(clone(oL), performance.now() + 1e6)
  const l1 = { ...bandFor(m._B) }, l2 = { ...bandFor(b._B) }
  ok('band: gun 55-95 and laser 125-185 as today (band overrides deferred in v1)', JSON.stringify(g1) === JSON.stringify(g2) && JSON.stringify(l1) === JSON.stringify(l2) && g1.lo === 55 && g1.hi === 95 && l1.lo === 125 && l1.hi === 185, `gun ${g1.lo}-${g1.hi}, laser ${l1.lo}-${l1.hi}`)
}

// ---------------------------------------------------------------- 4. T-F2 forced FFA identical; 5. decision time; 6. injected offer
function stream(table, extra, inject) {
  const b = brain(table, { ...extra })
  const out = [], cpu = []
  for (let i = 0; i < OBS.length; i++) {
    const o = clone(OBS[i])
    if (inject && i === 30) o.offer = { id: 5, expires: o.t + 5, choices: [{ id: 'nanites' }, { id: 'gun_damage' }, { id: 'gun_mag' }] }
    const c0 = process.cpuUsage()
    const a = b.act(o, performance.now() + 1e6)
    const c = process.cpuUsage(c0)
    cpu.push((c.user + c.system) / 1000)
    out.push(JSON.stringify(a))
  }
  return { out, cpu, B: b._B }
}
{
  const m = stream(META, { env: 'ffa' }), b = stream(BASE, { env: 'ffa' })
  const d = m.out.filter((x, i) => x !== b.out[i]).length
  ok('T-F2: forced FFA, meta slot = salt-1 slot on the kit stream', d === 0 && m.B.meta.cnt.dec === 0, `differ ${d} of ${m.out.length}, meta decisions on ${m.B.meta.cnt.dec}`)
}
{
  const m = stream(META, {}), b = stream(BASE, {})
  const d = m.out.filter((x, i) => x !== b.out[i]).length
  const s = m.cpu.slice().sort((x, y) => x - y), worst = s[s.length - 1], p99 = s[Math.floor(s.length * 0.99)]
  ok('kit stream: meta slot on in SQUAD and identical actions (no offer, kill or quiet low magazine in it)', d === 0 && m.B.meta.cnt.dec > 0, `differ ${d}, meta on ${m.B.meta.cnt.dec} decisions, counters ${JSON.stringify(m.B.meta.cnt)}`)
  ok('decision time: worst < 15 ms CPU on the kit stream (meta slot)', worst < 15, `worst ${worst.toFixed(2)} ms, p99 ${p99.toFixed(2)} ms, mean ${(m.cpu.reduce((x, y) => x + y, 0) / m.cpu.length).toFixed(2)} ms CPU`)
  const mi = stream(META, {}, true), bi = stream(BASE, {}, true)
  const di = []
  mi.out.forEach((x, i) => { if (x !== bi.out[i]) di.push(i) })
  const pm = JSON.parse(mi.out[30]).pick, pb = JSON.parse(bi.out[30]).pick
  ok('kit stream + offer at decision 30: the meta acts (gun_damage, today nanites)', pm === 1 && pb === 0, `meta pick ${pm}, salt-1 pick ${pb}, decisions that differ ${di.length} (first ${di[0]})`)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
