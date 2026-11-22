// Verifier (pass 1) shared helpers: hello/config from the kit stream, observation builders, a decision driver.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
export const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
export const lines = gunzipSync(readFileSync(P + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
export const hello = lines.find((l) => l.type === 'hello')
export const streamObs = lines.filter((l) => l.type === 'obs')
export const cfg = hello.config
export const { createBrain } = await import(P + '/bot/lib/brain.js')
export const { resolveParams, PARAMS } = await import(P + '/bot/lib/params.js')
export const { Arena } = await import(P + '/tools/arena_micro.js')
let _map = null
export async function mapCtx() {
  if (_map) return _map
  const { World } = await import(P + '/bot/lib/world.js'); const { Nav } = await import(P + '/bot/lib/nav.js')
  const world = World.loadSync(P + '/kit/arena')
  const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
  _map = { world, nav, log: () => {} }
  return _map
}
export const ctxNone = { world: null, nav: null, log: () => {} }
export const results = []
export function check(name, passed, detail) {
  results.push({ name, passed: !!passed, detail })
  console.log((passed ? 'PASS  ' : 'FAIL  ') + name + '  ::  ' + detail)
}
export const fx = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v))
const W = cfg.weapons
export const wpn = (kind, extra = {}) => (kind ? { kind, cooldown: 0, stats: W[kind], ...(kind === 'gun' ? { ammo: W.gun.mag, reload: 0 } : {}), ...(kind === 'laser' ? { charge: 0 } : {}), ...extra } : null)
/** an observation at (0,0) on flat ground (no map), our mech facing +x. */
export function mkObs(o = {}) {
  const m = cfg.mech
  const t = o.t ?? 100
  const self = { id: 3, pos: [0, 0, 0], vel: [0, 0, 0], aim: [0, 0], hp: m.hp, max_hp: m.hp, energy: 100, max_energy: m.energy, grounded: true, cubes: 0, upgrades: [], in_zone: true,
    weapons: [wpn('gun'), null], stats: { ...m }, ...(o.self || {}) }
  return { type: 'obs', tick: Math.round(t * 20), t, alive: o.alive ?? 16, self, mechs: o.mechs || [], projectiles: o.projectiles || [], crates: o.crates || [], cubes: o.cubes || [], pickups: o.pickups || [],
    sounds: [], beams: o.beams || [], events: o.events || [], drops: o.drops || [],
    zone: o.zone || { center: [0, 0], radius: 2000, next_center: [0, 0], next_radius: 1500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }, offer: o.offer ?? null }
}
/** a mech at (x, y) aiming at (ax, ay) (default: at us at the origin). */
export function mech(id, x, y, o = {}) {
  const ax = o.ax ?? 0, ay = o.ay ?? 0
  return { id, kind: o.kind || 'mech', pos: [x, y, o.z ?? 0], vel: o.vel || [0, 0, 0], aim: [o.yaw ?? Math.atan2(ay - y, ax - x), 0], hp: o.hp ?? cfg.mech.hp, max_hp: o.maxHp ?? cfg.mech.hp,
    cubes: o.cubes ?? 0, weapons: o.weapons || ['gun'], charging: !!o.charging }
}
export const dmgBy = (id, amount = 45, bearing = 0) => ({ type: 'damaged', amount, weapon: 'gun', bearing, by: id })
