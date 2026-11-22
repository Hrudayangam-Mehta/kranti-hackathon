// closed-loop sim profiler (behaviour/timing only). usage: bun drive.mjs --brain prof --seeds 1-6 --out f.json
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const { makeContext, playMatch } = await import(P + '/mechbot/sim/run.js')
const { brainBotFactory } = await import(P + '/mechbot/sim/ourbot.js')
import { writeFileSync } from 'node:fs'
import { heapStats } from 'bun:jsc'
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const sr = arg('--seeds', '1-4').split('-').map(Number)
const brainDir = arg('--brain', 'prof'), out = arg('--out', null), mode = arg('--mode', 'squad')
const ov = JSON.parse(arg('--ov', '{}'))
const mod = await import(P + '/fable_work/switch/' + brainDir + '/lib/brain.js')
const ctx = makeContext({ overridesObject: ov })
const all = []
for (let seed = sr[0]; seed <= (sr[1] || sr[0]); seed++) {
  const base = brainBotFactory(mod, { world: ctx.world, overrides: ov, quiet: true, name: 'ours' })
  const F = []; let holder = null, cur = null
  const team = (info) => {
    const b = base(info); holder = b
    const act0 = b.act.bind(b); const hello0 = b.hello.bind(b)
    b.hello = (h) => { const r = hello0(h); const B = b.brain && b.brain._B
      if (B && B.nav && !B.nav.__w) { const nav = B.nav; nav.__w = 1
        for (const fn of ['findPath', 'walkLine', 'nearestPassable', 'pathLength']) { const f0 = nav[fn]; if (!f0) continue
          nav[fn] = function (...a) { const q = performance.now(); const r = f0.apply(this, a); if (cur) { const d = performance.now() - q; cur[fn + 'N'] = (cur[fn + 'N'] || 0) + 1; cur[fn + 'Ms'] = (cur[fn + 'Ms'] || 0) + d; if (fn === 'findPath') { cur.exp = (cur.exp || 0) + (nav.lastExpanded || 0); cur.pok = r && r.ok ? 1 : 0; cur.gx = Math.round(a[2]); cur.gy = Math.round(a[3]) } } return r } } }
      return r }
    b.act = (obs) => {
      cur = {}
      const h0 = 0, c0 = process.cpuUsage(); const t0 = performance.now(); const a = act0(obs); const ms = performance.now() - t0; const cu = process.cpuUsage(c0); const h1 = 0
      const B = b.brain && b.brain._B
      if (B) F.push({ t: obs.t, ms, cpu: (cu.user + cu.system) / 1000, h0, h1, m: B.mode, lk: B.legKind, tg: B.target ? B.target.id : -1, st: { ...(B.prof || {}) }, ...cur, gX: B.hasGoal ? Math.round(B.goalX) : null, gY: B.hasGoal ? Math.round(B.goalY) : null, mx: a.move[0], my: a.move[1], f0: a.fire[0], hp: obs.self.hp, x: obs.self.pos[0], y: obs.self.pos[1], nm: (obs.mechs || []).length, a })
      cur = null
      return a
    }
    return b
  }
  const rec = await playMatch(seed, { mode, trace: false, keep: true }, ctx, { team, opponents: [] })
  const B = holder && holder.brain && holder.brain._B
  all.push({ seed, place: rec.place, score: rec.score, alive: rec.timeAlive, dmgIn: rec.dmgTaken, dmgOut: rec.dmgDealt, counters: B ? { ...B.counters } : null, errors: B ? { ...B.errorsByStage } : null, frames: F })
  process.stderr.write(`seed ${seed} place ${rec.place} score ${rec.score} alive ${rec.timeAlive} n ${F.length} max ${Math.max(...F.map(f => f.ms)).toFixed(1)}\n`)
}
if (out) writeFileSync(out, JSON.stringify(all))
