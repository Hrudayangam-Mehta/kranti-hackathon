// Panel round 2 (architecture): shared loaders. DEV ONLY. Run: P/bun tools/panel_r2/<script>.js
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { World } from '../../bot/lib/world.js'
import { Nav } from '../../bot/lib/nav.js'

export const HERE = dirname(fileURLToPath(import.meta.url))
export const P = join(HERE, '..', '..')
export const TICK = 0.05
// mech row: [id,x,y,z,aim_yaw,aim_pitch,hp,energy,flags,cubes,max_hp,slot0,slot1]; flags 1 grounded, 2 boost/jet, 4 charging
export const MI = 0, MX = 1, MY = 2, MZ = 3, MYAW = 4, MPIT = 5, MHP = 6, MEN = 7, MFL = 8, MCU = 9, MMAX = 10, MS0 = 11, MS1 = 12

export function loadWorld() { return World.loadSync(join(P, 'kit', 'arena')) }
export function loadNav(world, opts) { return new Nav(world, opts) }
export function loadConfig() { return JSON.parse(readFileSync(join(P, 'notes', 'hello_example.json'), 'utf8')).config }

export function loadReplay() {
  const txt = gunzipSync(readFileSync(join(P, 'replay', 'mech16.jsonl.gz'))).toString('utf8')
  const lines = txt.split('\n').filter(Boolean).map(l => JSON.parse(l))
  const hdr = lines[0], res = lines[lines.length - 1], frames = lines.slice(1, -1)
  const nf = frames.length
  const ids = hdr.mechs.map(m => m.id).sort((a, b) => a - b)
  const names = {}; for (const m of hdr.mechs) names[m.id] = m.name
  const m = {}; for (const id of ids) m[id] = new Array(nf).fill(null)
  const events = []
  frames.forEach((fr, k) => {
    for (const row of fr.m) m[row[0]][k] = row
    for (const e of fr.ev || []) events.push(e)
  })
  const ticks = frames.map(f => f.t)
  return { hdr, res, frames, nf, ids, names, m, events, ticks }
}

export function pct(arr, q) {
  if (!arr.length) return NaN
  const a = Float64Array.from(arr).sort()
  const x = (a.length - 1) * q, i = Math.floor(x), f = x - i
  return i + 1 < a.length ? a[i] * (1 - f) + a[i + 1] * f : a[i]
}
export const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN
export const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : String(v)
export function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }

/** Protocol section 8 vision: eye -> target centre or top; 45 m all round, or 200 m inside the 120 degree yaw wedge. */
export function sees(world, o, t, cfg) {
  const so = 1 + 0.05 * o[MCU], st = 1 + 0.05 * t[MCU]
  const dx = t[MX] - o[MX], dy = t[MY] - o[MY]
  const d = Math.hypot(dx, dy)
  const near = (cfg?.near ?? 45), range = (cfg?.range ?? 200), half = (cfg?.halfFov ?? Math.PI / 3)
  let inRange = false
  if (d <= near) inRange = true
  else if (d <= range && Math.abs(angDiff(Math.atan2(dy, dx), o[MYAW])) <= half) inRange = true
  if (!inRange) return false
  const ez = o[MZ] + 8 * so
  return world.canSee(o[MX], o[MY], ez, t[MX], t[MY], t[MZ] + 4.5 * st) || world.canSee(o[MX], o[MY], ez, t[MX], t[MY], t[MZ] + 9 * st)
}
