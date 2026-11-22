import sys
d = sys.argv[1]
def patch(fn, pairs):
    p = d + '/' + fn
    s = open(p).read()
    for old, new in pairs:
        n = s.count(old)
        if n != 1: raise SystemExit(f"{fn}: count {n}: {old[:70]!r}")
        s = s.replace(old, new)
    open(p, 'w').write(s); print('patched', p)

patch('run.js', [
("""// --map-dir D  directory holding v2/world.json (loaded here and announced as hello.map.dir; sandboxed bots need their own copy)
""", """// --map-dir D  directory holding v2/world.json (loaded here and announced as hello.map.dir; sandboxed bots need their own copy)
// --trace D    analysis: write a per-match trace of the team bot (frames per decision, damage, cubes, loot, hunters,
//              our brain's mode / target / goal when it runs in-process) to D/<tag>_m<seed>.json
"""),
("""import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'""",
 """import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'"""),
("""seeds: null, logDir: null, overrides: null, verbose: false, mapDir: null }""",
 """seeds: null, logDir: null, overrides: null, verbose: false, mapDir: null, trace: null, traceTag: null }"""),
("""    else if (a === '--map-dir') o.mapDir = val()
""", """    else if (a === '--map-dir') o.mapDir = val()
    else if (a === '--trace') o.trace = val()
    else if (a === '--trace-tag') o.traceTag = val()
"""),
("""  const match = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: o.mode, mapDir: ctx.mapDir, latency: o.latency || 0, focus: o.full ? null : slot })""",
 """  const trace = o.trace ? { slot, worldEvery: 5, hook: traceHook(bots, slot, squad) } : null
  const match = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: o.mode, mapDir: ctx.mapDir, latency: o.latency || 0, focus: o.full ? null : slot, trace })"""),
("""  if (o.keep) rec.result = res
  return rec
}""", """  if (o.trace) {
    const dir = typeof o.trace === 'string' ? o.trace : null
    const tr = res.trace
    tr.seed = seed; tr.bot = o.traceTag || String(o.bot).slice(0, 80); tr.rec = { ...rec }
    tr.deaths = res.stats.deaths; tr.shots = match.shots.filter((s) => s.by === slot || s.tgt === slot).map((s) => [r2t(s.t), s.by, s.tgt, Math.round(s.range * 10) / 10, s.hit ? 1 : 0, s.air ? 1 : 0])
    tr.events = match.log.filter((e) => e.e !== 'death' && e.e !== 'boom' && (e.id === slot || e.e === 'npc_dead' || e.e === 'crate' || e.e === 'drop' || (e.e === 'laser' && e.mh)))
    tr.tiers = res.mechs.map((m) => m.name)
    tr.zonePhases = ctx.cfg.zone.phases
    if (dir) { try { mkdirSync(dir, { recursive: true }) } catch { /* exists */ } writeFileSync(join(dir, `${(o.traceTag || 'bot').replace(/[^A-Za-z0-9._-]/g, '_')}_m${seed}.json.gz`), gzipSync(JSON.stringify(tr))) }
    if (o.keep) rec.trace = tr
  }
  if (o.keep) rec.result = res
  return rec
}

const r2t = (v) => Math.round(v * 100) / 100
/** Trace hook: hunters of the squad, every house bot's target, and our brain's state when it runs in-process. */
function traceHook(bots, slot, squad) {
  return (match, fr) => {
    if (squad) fr.hu = [...squad.hunters]
    const br = bots[slot] && bots[slot].brain && bots[slot].brain._B
    if (br) {
      fr.md = br.mode; fr.lg = br.legKind; fr.tg = br.target ? br.target.id : -1; fr.td = br.target ? Math.round(br.target.dist) : -1
      fr.ls = br.losing ? 1 : 0; fr.st = br.stance; fr.env = br.env; fr.A = Math.round(br.A || 0); fr.th = br.threats; fr.nl = br.nLos
      fr.gr = br.grab ? br.grab.type || '?' : ''; fr.lo = br.loot ? br.loot.type || '?' : ''; fr.hd = br.hide ? br.hide.state : ''; fr.rp = Math.round(br.rPrefNow || 0)
      fr.ak = br.aimKind; fr.hf = br.holdFire ? 1 : 0; fr.fi = br.finishing ? 1 : 0; fr.ks = br.killSecure ? 1 : 0
      if (br.hasGoal) fr.gl = [Math.round(br.goalX), Math.round(br.goalY)]
      fr.o = [br.out.fire[0] ? 1 : 0, br.out.fire[1] ? 1 : 0]
    }
  }
}"""),
])
patch('ourbot.js', [
("""        try { brain = mod.createBrain(h, { world: ctx.world, nav, log }, ctx.overrides) } catch (e) { brain = null; bot.usedFallback = true; bot.initError = String(e?.stack || e) }""",
 """        try { brain = mod.createBrain(h, { world: ctx.world, nav, log }, ctx.overrides) } catch (e) { brain = null; bot.usedFallback = true; bot.initError = String(e?.stack || e) }
        bot.brain = brain              // analysis access (run.js --trace); the simulator never reads it otherwise"""),
])
