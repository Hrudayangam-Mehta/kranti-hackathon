// Edge-case observations (odd but legal per protocol.md / schema) fed to a fresh brain, with and without the map.
// Reports: throws out of act(), internal stage errors (B.errorsByStage), NaN/Infinity in the raw action, slow ticks.
import { realHello, loadMap, loadBrainModule, mkObs, mkSelf, mkMech, mkNpc, mkZone, weapon, rawProblems, pct } from './common.js'

const hello = realHello()
const cfg = hello.config
const { world, nav } = await loadMap(hello)
const { createBrain } = await loadBrainModule()
const logs = []
const log = (...a) => logs.push(a.join(' '))

// a standable spot on open ground near the centre of the map, and a few others
const q0 = nav.nearestPassable(0, 0, 80)
const X = q0.x, Y = q0.y, Z = nav.levelAt(X, Y)
const at = (dx, dy) => { const q = nav.nearestPassable(X + dx, Y + dy, 40) || { x: X + dx, y: Y + dy }; return [q.x, q.y, nav.levelAt(q.x, q.y)] }
const self = (o = {}) => mkSelf(cfg, { pos: [X, Y, Z], ...o })
const G = (e) => weapon(cfg, 'gun', e), LZ = (e) => weapon(cfg, 'laser', e), LI = (e) => weapon(cfg, 'lightning', e), MO = (e) => weapon(cfg, 'mortar', e)
const enemy = (id, dx, dy, o) => mkMech(id, at(dx, dy), { aim: [Math.atan2(-dy, -dx), 0], ...o })
const hitBy = (id, w = 'gun', amt = 45) => ({ type: 'damaged', amount: amt, weapon: w, bearing: 0.3, by: id })

const cases = {
  'baseline gun + null': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [enemy(5, 100, 10)] }),
  'both slots null (gun dropped)': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [null, null] }), mechs: [enemy(5, 60, 10)], events: k % 3 ? [] : [hitBy(5)] }),
  'slots laser + lightning, no gun': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [LZ({ charge: (k % 9) * 0.1 }), LI()] }), mechs: [enemy(5, 30, 5)], events: k % 3 ? [] : [hitBy(5)] }),
  'slots mortar + laser, no gun': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [MO(), LZ({ charge: (k % 9) * 0.1 })] }), mechs: [enemy(5, 80, 5, { weapons: ['gun', 'mortar'] })], events: k % 3 ? [] : [hitBy(5)] }),
  'slots lightning + mortar, no gun': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [LI(), MO()] }), mechs: [enemy(5, 40, 5)], events: k % 3 ? [] : [hitBy(5)] }),
  'slot0 null, slot1 gun': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [null, G()] }), mechs: [enemy(5, 100, 10)] }),
  'slot0 laser, slot1 gun (swapped)': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [LZ({ charge: (k % 9) * 0.1 }), G({ ammo: k % 13 })] }), mechs: [enemy(5, 100, 10)] }),
  'weapon stats empty {}': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [{ kind: 'gun', cooldown: 0, stats: {} }, { kind: 'laser', cooldown: 0, stats: {} }] }), mechs: [enemy(5, 100, 10)] }),
  'weapon only required fields (no ammo/reload/charge)': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [{ kind: 'gun', cooldown: 0, stats: cfg.weapons.gun }, { kind: 'laser', cooldown: 0, stats: cfg.weapons.laser }] }), mechs: [enemy(5, 100, 10)] }),
  'no mechs': (k) => mkObs(cfg, k * 2, { self: self() }),
  '15 mechs': (k) => mkObs(cfg, k * 2, { self: self(), mechs: Array.from({ length: 15 }, (_, i) => enemy(i < 3 ? i : i + 1, 120 * Math.cos(i * 0.42), 120 * Math.sin(i * 0.42), { weapons: [['gun'], ['gun', 'laser'], ['gun', 'mortar'], ['gun', 'lightning']][i % 4], charging: i % 4 === 1 })), events: [hitBy(k % 15)] }),
  '15 mechs + 12 npcs': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [...Array.from({ length: 15 }, (_, i) => enemy(i < 3 ? i : i + 1, 90 * Math.cos(i * 0.42), 90 * Math.sin(i * 0.42))), ...Array.from({ length: 12 }, (_, i) => mkNpc(100 + i, at(40 * Math.cos(i), 40 * Math.sin(i))))], events: [hitBy(100 + (k % 12), 'npc', 25)] }),
  'npc only': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [mkNpc(104, at(20, 5))], events: k % 2 ? [] : [hitBy(104, 'npc', 25)] }),
  'actor with only required fields': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [{ id: 5, kind: 'mech', pos: at(80, 0), vel: [0, 0, 0], aim: [3, 0] }, { id: 101, kind: 'npc', pos: at(-20, 0), vel: [0, 0, 0], aim: [0, 0] }], events: [hitBy(5)] }),
  'enemy hp hidden + hp 0': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [enemy(5, 80, 0, { hp: 0 }), enemy(6, -80, 0, { hp: undefined, max_hp: undefined })] }),
  'self hp 0': (k) => mkObs(cfg, k * 2, { self: self({ hp: 0 }), mechs: [enemy(5, 80, 0)], events: [hitBy(5)] }),
  'self hp 0, max_hp 0, energy 0, max_energy 0': (k) => mkObs(cfg, k * 2, { self: self({ hp: 0, max_hp: 0, energy: 0, max_energy: 0 }), mechs: [enemy(5, 80, 0)], events: [hitBy(5)] }),
  'cubes 40 (body 3x)': (k) => mkObs(cfg, k * 2, { self: self({ cubes: 40, max_hp: 1960, hp: 1960 }), mechs: [enemy(5, 100, 0, { cubes: 40 })], events: k % 3 ? [] : [hitBy(5)] }),
  'cubes 40, stats not scaled': (k) => mkObs(cfg, k * 2, { self: { ...self({ cubes: 40 }), stats: { ...cfg.mech } }, mechs: [enemy(5, 100, 0, { cubes: 40 })] }),
  'cubes 200': (k) => mkObs(cfg, k * 2, { self: self({ cubes: 200 }), mechs: [enemy(5, 100, 0, { cubes: 200 })] }),
  'zone radius 0': (k) => mkObs(cfg, k * 2, { self: self({ in_zone: false }), zone: mkZone({ center: [X, Y], radius: 0, next_center: [X, Y], next_radius: 0, shrink_start: 400, shrink_end: 425, dps: 260 }), events: [{ type: 'damaged', amount: 26, weapon: 'zone', bearing: null, by: null }] }),
  'zone radius 0, standing on the centre': (k) => mkObs(cfg, k * 2, { self: self({ in_zone: false }), zone: mkZone({ center: [X, Y], radius: 0, next_center: [X, Y], next_radius: 0, shrink_start: 0, shrink_end: 0, dps: 260 }), mechs: [enemy(5, 30, 0)] }),
  'zone shrinking to 0 with enemy': (k) => mkObs(cfg, 8000 + k * 2, { self: self(), zone: mkZone({ center: [X + 10, Y], radius: 25 - k * 0.1, next_center: [X + 12, Y + 3], next_radius: 0, shrink_start: 400, shrink_end: 425, dps: 260 }), mechs: [enemy(5, 30, 0)], events: [hitBy(5)] }),
  't beyond 480': (k) => mkObs(cfg, 9600 + k * 2, { self: self(), mechs: [enemy(5, 100, 10)] }),
  't huge (1e7)': (k) => mkObs(cfg, 2e8 + k * 2, { self: self(), mechs: [enemy(5, 100, 10)] }),
  'first tick is 0 then gap of 10 ticks': (k) => mkObs(cfg, k * 10, { self: self(), mechs: [enemy(5, 100, 10)], events: k % 2 ? [] : [hitBy(5)] }),
  'tick gaps of 100': (k) => mkObs(cfg, k * 100, { self: self(), mechs: k % 2 ? [] : [enemy(5, 100, 10)] }),
  'time goes backwards / repeats': (k) => mkObs(cfg, 400 - (k % 4) * 2, { self: self(), mechs: [enemy(5, 100, 10)] }),
  'enemy at our exact position': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [mkMech(5, [X, Y, Z])], events: [hitBy(5)] }),
  'enemy directly above (same x,y)': (k) => mkObs(cfg, k * 2, { self: self({ weapons: [G(), LZ({ charge: (k % 9) * 0.1 })] }), mechs: [mkMech(5, [X, Y, Z + 30], { vel: [0, 0, 8] })], events: [hitBy(5)] }),
  'self airborne': (k) => mkObs(cfg, k * 2, { self: self({ grounded: false, pos: [X, Y, Z + 20], vel: [3, 4, -9] }), mechs: [enemy(5, 100, 10)] }),
  'self outside map bounds': (k) => mkObs(cfg, k * 2, { self: self({ pos: [world.bounds.maxX + 50, world.bounds.maxY + 50, 0] }), mechs: [mkMech(5, [world.bounds.maxX + 150, world.bounds.maxY + 50, 0])] }),
  'self at map corner': (k) => mkObs(cfg, k * 2, { self: self({ pos: [world.bounds.minX + 1, world.bounds.minY + 1, world.ground(world.bounds.minX + 1, world.bounds.minY + 1)] }), mechs: [enemy(5, 100, 10)] }),
  'self inside a building': (k) => { const p = world.prisms.find((p) => p.kind === 'building' && p.maxX - p.minX > 30); const x = (p.minX + p.maxX) / 2, y = (p.minY + p.maxY) / 2; return mkObs(cfg, k * 2, { self: self({ pos: [x, y, world.ground(x, y)] }), mechs: [enemy(5, 100, 10)], events: [hitBy(5)] }) },
  'self on a roof': (k) => { const p = world.prisms.find((p) => p.kind === 'building' && p.maxX - p.minX > 30); const x = (p.minX + p.maxX) / 2, y = (p.minY + p.maxY) / 2; return mkObs(cfg, k * 2, { self: self({ pos: [x, y, p.top] }), mechs: [enemy(5, 100, 10)], events: [hitBy(5)] }) },
  'offer: 3 choices': (k) => mkObs(cfg, k * 2, { self: self(), offer: { id: 1 + (k >> 3), expires: k * 0.1 + 5, choices: [{ id: 'gun_rate', name: 'a', desc: 'b' }, { id: 'armor', name: 'a', desc: 'b' }, { id: 'sensors', name: 'a', desc: 'b' }] } }),
  'offer: 1 choice / unknown ids / empty': (k) => mkObs(cfg, k * 2, { self: self(), offer: k % 3 === 0 ? { id: k, expires: 5, choices: [{ id: 'zzz', name: 'a', desc: 'b' }] } : k % 3 === 1 ? { id: k, expires: 5, choices: [] } : { id: k, expires: 5, choices: [{ id: 'x', name: '', desc: '' }, { id: 'y', name: '', desc: '' }] } }),
  'all event types': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [enemy(5, 100, 10)], events: [
    { type: 'damaged', amount: 20, weapon: 'zone', bearing: null, by: null }, { type: 'damaged', amount: 90, weapon: 'lightning', bearing: 0.9, by: 9, rear: true },
    { type: 'damaged', amount: 25, weapon: 'npc', bearing: -3.1, by: 111 }, { type: 'hit', target: 5, amount: 45, weapon: 'gun', effect: 'cookoff', rear: true }, { type: 'hit', target: 1007, amount: 45, weapon: 'gun' },
    { type: 'effect', effect: 'concuss', by: 5 }, { type: 'drop', id: 20000, cubes: 3 }, { type: 'kill', target: 5 }, { type: 'kill', target: 12 }, { type: 'pickup', cubes: 4 }, { type: 'upgrade', id: 'armor' },
    { type: 'took', id: 8013, kind: 'laser', slot: 1 }, { type: 'dropped', id: 8014, kind: 'mortar', slot: 1 }, { type: 'take_failed', id: 8015 + k, reason: ['gone', 'range', 'have', 'full', 'busy'][k % 5] }, { type: 'future_event', foo: 1 }] }),
  'drops (falling, landed, held)': (k) => mkObs(cfg, 1500 + k * 2, { self: self(), drops: [
    { id: 20000, pos: at(30, 20), radius: 8, lands_in: Math.max(0, 5 - k * 0.1), capture_s: 4, progress: 0, holder: null },
    { id: 20001, pos: at(-60, 20), radius: 8, lands_in: 0, capture_s: 4, progress: 1.5, holder: 7 }, { id: 20002, pos: [X, Y, Z], radius: 8, lands_in: 0, capture_s: 4, progress: 2, holder: 3 }] }),
  'beams (1 point, many points, own id)': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [enemy(5, 100, 10), enemy(6, 110, 30)], beams: [
    { by: 5, kind: 'laser', path: [[X + 100, Y + 10, Z + 7]], age: 0.1 }, { by: 5, kind: 'lightning', path: Array.from({ length: 9 }, (_, i) => [X + 100 + i, Y + 30, Z + 5]), age: 0.05 }, { by: 6, kind: 'laser', path: [], age: 0 }] }),
  'projectiles: shells overhead / zero velocity / npc / gun': (k) => mkObs(cfg, k * 2, { self: self(), mechs: [enemy(5, 100, 10, { weapons: ['gun', 'mortar'] })], projectiles: [
    { id: 300, kind: 'mortar', pos: [X, Y, Z + 40 - k], vel: [0, 0, -20] }, { id: 301, kind: 'mortar', pos: [X + 5, Y, Z + 10], vel: [0, 0, 0] }, { id: 302, kind: 'mortar', pos: [X + 60, Y, Z + 30], vel: [-50, 0, 30] },
    { id: 303, kind: 'npc', pos: [X + 20, Y, Z + 3], vel: [-90, 0, 0] }, { id: 304, kind: 'gun', pos: [X + 30, Y + 1, Z + 7], vel: [-252, 0, 0] },
    ...Array.from({ length: 10 }, (_, i) => ({ id: 310 + i, kind: 'mortar', pos: [X + 10 * i, Y + 3 * i, Z + 50], vel: [-10 * i, -3 * i, 5] }))] }),
  'loot everywhere (crates, cubes, pickups incl. gun)': (k) => mkObs(cfg, k * 2, { self: self({ weapons: k % 2 ? [G(), LZ()] : [G(), null] }),
    crates: Array.from({ length: 36 }, (_, i) => ({ id: 1000 + i, pos: at(60 * Math.cos(i), 60 * Math.sin(i)), hp: 300 })), cubes: Array.from({ length: 30 }, (_, i) => ({ id: 5000 + i, pos: at(30 * Math.cos(i), 30 * Math.sin(i)) })),
    pickups: [...Array.from({ length: 40 }, (_, i) => ({ id: 8000 + i, kind: ['mortar', 'laser', 'lightning', 'gun'][i % 4], pos: at(i < 4 ? 1 : 50 * Math.cos(i), i < 4 ? 1 : 50 * Math.sin(i)) }))] }),
  'crate with no hp field': (k) => mkObs(cfg, k * 2, { self: self(), crates: [{ id: 1001, pos: at(20, 5) }] }),
  'sounds of every kind': (k) => mkObs(cfg, k * 2, { self: self(), sounds: ['gun', 'mortar', 'explosion', 'laser', 'laser_charge', 'lightning', 'jet', 'death', 'crate', 'npc_gun', 'step', 'boost', 'reload', 'drop', 'new_kind'].map((kind, i) => ({ kind, bearing: -Math.PI + i * 0.44, dist: ['near', 'mid', 'far'][i % 3], age: 0.05 })) }),
  'stadium bowl, zone elsewhere': (k) => { const b = nav.nearestPassable(-277, 131, 60); return mkObs(cfg, 2400 + k * 2, { self: self({ pos: [b.x, b.y, nav.levelAt(b.x, b.y)], in_zone: k > 30 ? false : true }), zone: mkZone({ center: [100, -50], radius: 420 - k, next_center: [150, -60], next_radius: 240, shrink_start: 100, shrink_end: 150 }), mechs: [mkMech(5, [b.x + 60, b.y + 10, nav.levelAt(b.x + 60, b.y + 10)])] }) },
}

function run(name, mk, withMap, N = 80) {
  const b = createBrain(hello, { world: withMap ? world : null, nav: withMap ? nav : null, log }, { warmup: false })
  if (withMap) nav.setBody(cfg.mech.radius, cfg.mech.height)
  const times = []; let thrown = 0, raw = new Map(), firstThrow = ''
  for (let k = 0; k < N; k++) {
    const obs = mk(k)
    const t0 = performance.now()
    let a
    try { a = b.act(obs, t0 + 27.5) } catch (e) { thrown++; if (!firstThrow) firstThrow = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); continue }
    times.push(performance.now() - t0)
    for (const p of rawProblems(a)) raw.set(p.replace(/=.*/, ''), (raw.get(p.replace(/=.*/, '')) || 0) + 1)
  }
  const st = b.debugState()
  const errs = Object.keys(st.errors).length ? JSON.stringify(st.errors) : ''
  const flag = thrown || errs || raw.size ? 'FAIL' : 'ok  '
  console.log(`${flag} ${withMap ? 'map  ' : 'nomap'} ${name.padEnd(52)} max ${Math.max(...times, 0).toFixed(1).padStart(5)} ms  p50 ${pct(times, 0.5).toFixed(2)}  mode=${st.mode} ${thrown ? 'THROWS=' + thrown + ' ' + firstThrow : ''} ${errs ? 'stageErrors=' + errs : ''} ${raw.size ? 'raw=' + JSON.stringify([...raw]) : ''}`)
  return { thrown, errs, raw }
}
// warm the JIT first so times are meaningful
run('warm', cases['15 mechs'], true, 200); logs.length = 0
const only = process.argv[2]
for (const [name, mk] of Object.entries(cases)) {
  if (only && !name.includes(only)) continue
  run(name, mk, true)
  run(name, mk, false)
}
const errLogs = logs.filter((l) => /failed/.test(l))
console.log('\nfirst error logs (deduplicated by stage):')
const seen = new Set()
for (const l of errLogs) { const key = l.split('\n')[0].replace(/tick \d+/, '') + (l.split('\n')[1] || ''); if (seen.has(key)) continue; seen.add(key); console.log(l.split('\n').slice(0, 4).join('\n')) }
