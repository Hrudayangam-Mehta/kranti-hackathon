// zone position profile: dist to the next centre relative to the next radius, outside time, from traces
import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { Match } from '../sim/sim.js'
import { World } from '../bot/lib/world.js'
import { loadConfig } from '../sim/config.js'
const [dir, ...tags] = process.argv.slice(2)
const world = World.loadSync('/srv/mech-sparring/_arena'), cfg = loadConfig()
const zoneFor = new Map()
function phasesFor(seed) {
  if (!zoneFor.has(seed)) { const bots = Array.from({ length: 16 }, (_, i) => ({ name: 'd' + i, team: i ? 1 : null, act() { return null }, hello() { return { type: 'ready' } } })); const m = new Match({ world, seed, config: cfg, bots, mode: 'squad' }); zoneFor.set(seed, m.phases) }
  return zoneFor.get(seed)
}
for (const tag of tags) {
  const acc = { n: 0, frames: 0, outside: 0, relBins: {}, at: {} }
  for (let seed = 1; seed <= 21; seed++) {
    const f = join(dir, `${tag}_m${seed}.json.gz`); if (!existsSync(f)) continue
    const tr = JSON.parse(gunzipSync(readFileSync(f)))
    const ph = phasesFor(seed)
    acc.n++
    for (const fr of tr.frames) {
      let i = 0; while (i < ph.length - 1 && fr.t >= ph[i].s1) i++
      const to = ph[i].to
      const rel = Math.hypot(fr.x - to.x, fr.y - to.y) / to.r
      acc.frames++
      if (!fr.iz) acc.outside++
      for (const tt of [20, 40, 60, 80, 100]) if (Math.abs(fr.t - tt) < 0.05) (acc.at[tt] = acc.at[tt] || []).push(rel)
    }
  }
  const med = (a) => { a = (a || []).slice().sort((p, q) => p - q); return a.length ? a[a.length >> 1].toFixed(2) : '-' }
  console.log(tag.padEnd(24), 'outside share', (acc.outside / acc.frames).toFixed(3), 'dist/nextR median at', Object.fromEntries([20, 40, 60, 80, 100].map((t) => [t, med(acc.at[t]) + ` n${(acc.at[t] || []).length}`])))
}
