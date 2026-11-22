// Shared helpers for the safety review: real hello, map loading, observation builders, action validator.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HERE = dirname(fileURLToPath(import.meta.url))
export const P = resolve(HERE, '..', '..')
export const ARENA = join(P, 'kit', 'arena')

export function loadStream() {
  const txt = gunzipSync(readFileSync(join(P, 'kit', 'check', 'stream.jsonl.gz'))).toString('utf8')
  return txt.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
}
export function realHello() {
  const h = loadStream()[0]
  h.map = { dir: ARENA, files: ['v2/world.json', 'v2/terrain.i16'] }
  return h
}
export async function loadMap(hello) {
  const { World } = await import(join(P, 'bot', 'lib', 'world.js'))
  const { Nav } = await import(join(P, 'bot', 'lib', 'nav.js'))
  const world = World.loadSync(hello.map.dir)
  const m = hello.config.mech
  const nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
  return { world, nav }
}
// MECH_LIB=<dir> loads the brain from a patched COPY of bot/lib (tools/review_safety/lib_fix) to check a proposed fix.
export const LIB = process.env.MECH_LIB ? resolve(process.env.MECH_LIB) : join(P, 'bot', 'lib')
export async function loadBrainModule() { return import(join(LIB, 'brain.js')) }

export function mulberry(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export function weapon(cfg, kind, extra = {}) {
  const st = { ...cfg.weapons[kind] }
  const w = { kind, cooldown: 0, stats: st }
  if (kind === 'gun') { w.ammo = st.mag; w.reload = 0 }
  if (kind === 'laser') w.charge = 0
  return { ...w, ...extra }
}
export function mkSelf(cfg, o = {}) {
  const cubes = o.cubes ?? 0
  const sc = 1 + (cfg.cubes.size_per_cube ?? 0.05) * cubes
  const m = cfg.mech
  const stats = { ...m, radius: m.radius * sc, height: m.height * sc, eye_height: m.eye_height * sc, muzzle_height: m.muzzle_height * sc }
  return {
    id: 3, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: m.hp, max_hp: m.hp, energy: m.energy, max_energy: m.energy,
    grounded: true, cubes, upgrades: [], weapons: [weapon(cfg, 'gun'), null], in_zone: true, stats, ...o,
  }
}
export function mkMech(id, pos, o = {}) {
  return { id, kind: 'mech', pos, vel: [0, 0, 0], aim: [0, 0], hp: 1400, max_hp: 1400, cubes: 0, weapons: ['gun'], charging: false, ...o }
}
export function mkNpc(id, pos, o = {}) {
  return { id, kind: 'npc', pos, vel: [0, 0, 0], aim: [0, 0], hp: 350, max_hp: 350, ...o }
}
export function mkZone(o = {}) {
  return { center: [41.3, -72.8], radius: 560, next_center: [0, 0], next_radius: 380, shrink_start: 60, shrink_end: 110, dps: 20, ...o }
}
export function mkObs(cfg, tick, o = {}) {
  return {
    type: 'obs', tick, t: tick / 20, alive: 16, self: mkSelf(cfg), mechs: [], projectiles: [], crates: [], cubes: [], pickups: [],
    sounds: [], beams: [], events: [], zone: mkZone(), offer: null, drops: [], ...o,
  }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
/** Validate one bot->server action line object against mechfight.schema.json (Action) plus the protocol text. */
export function validateAction(a, tick) {
  const bad = []
  if (!a || typeof a !== 'object' || Array.isArray(a)) return ['not an object']
  if (a.tick !== tick) bad.push(`tick ${a.tick} != ${tick}`)
  const vec2 = (v) => Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1])
  if ('move' in a) { if (!vec2(a.move)) bad.push('move not Vec2: ' + JSON.stringify(a.move)); else if (Math.hypot(a.move[0], a.move[1]) > 1.0005) bad.push('move length > 1') }
  if ('aim' in a) { if (!vec2(a.aim)) bad.push('aim not Vec2: ' + JSON.stringify(a.aim)) }
  for (const k of ['boost', 'jump', 'reload']) if (k in a && typeof a[k] !== 'boolean') bad.push(k + ' not boolean')
  if ('fire' in a) { if (!(Array.isArray(a.fire) && a.fire.length === 2 && a.fire.every((x) => typeof x === 'boolean'))) bad.push('fire not [bool,bool]') }
  if ('pick' in a && !(Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2)) bad.push('pick ' + a.pick)
  if ('take' in a && !isNum(a.take)) bad.push('take ' + a.take)
  if ('drop' in a && !(a.drop === 0 || a.drop === 1)) bad.push('drop ' + a.drop)
  return bad
}
/** Raw brain output check (before bot.js sanitises): flags NaN / Infinity / wrong types. */
export function rawProblems(a) {
  const bad = []
  if (!a || typeof a !== 'object') return ['brain returned ' + a]
  const chk = (name, v) => { if (!isNum(v)) bad.push(`${name}=${v}`) }
  if (!Array.isArray(a.move)) bad.push('move missing'); else { chk('move[0]', a.move[0]); chk('move[1]', a.move[1]) }
  if (!Array.isArray(a.aim)) bad.push('aim missing'); else { chk('aim[0]', a.aim[0]); chk('aim[1]', a.aim[1]) }
  if (!Array.isArray(a.fire) || typeof a.fire[0] !== 'boolean' || typeof a.fire[1] !== 'boolean') bad.push('fire bad')
  if ('pick' in a && !Number.isInteger(a.pick)) bad.push('pick=' + a.pick)
  if ('take' in a && !Number.isInteger(a.take)) bad.push('take=' + a.take)
  if ('drop' in a && !(a.drop === 0 || a.drop === 1)) bad.push('drop=' + a.drop)
  return bad
}
export function pct(arr, p) { if (!arr.length) return 0; const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
