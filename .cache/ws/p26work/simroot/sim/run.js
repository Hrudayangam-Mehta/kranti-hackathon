#!/usr/bin/env bun
// DEV ONLY: command line for the local simulator.
//
//   bun sim/run.js --bot ours --mode squad --matches 40 --seed 1 --jobs 4 --json runs/out.json
//   bun sim/run.js --bot sim/baseline_bot.js --mode squad --matches 40
//   bun sim/run.js --bot "proc:python3 -u kit/python/example_bot.py" --mode squad --matches 40
//   bun sim/run.js --bot ours --mode ffa --opponents "house:expert,proc:bun other/bot.js,sim/baseline_bot.js"
//
// --bot        "ours" (bot/lib/brain.js in-process, the default), a module path, "house:<type>" or "proc:<command>"
//              module: export createBot(ctx) / default function -> { hello(h), act(obs) }, or export createBrain
// --mode       squad (team bot + 15 house bots hunting it as one squad) | ffa (everybody for itself)
// --matches N  --seed S (match seeds S .. S+N-1)   --jobs J (parallel worker processes)
// --opponents  ffa only: comma list of bot specs; the remaining slots are house bots of the replay's types
// --params     json file overriding the house-bot table: { "house": { "easy": {...} }, "squad": {...} }
// --json FILE  write every match record and the summary
// --latency L  extra decisions of action delay (default 0 = protocol lockstep)
// --timeout MS answer timeout for proc: bots (default 200)    --full  keep playing after the team bot died
// --config F   a hello json (or bare config json) to take the rules from     --old-balance  replay-era numbers
// --overrides F json of brain parameter overrides passed to createBrain (third argument)
// --map-dir D  directory holding v2/world.json (loaded here and announced as hello.map.dir; sandboxed bots need their own copy)
// --trace D    analysis: write a per-match trace of the team bot (frames per decision, damage, cubes, loot, hunters,
//              our brain's mode / target / goal when it runs in-process) to D/<tag>_m<seed>.json

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { World } from '../bot/lib/world.js'
import { Nav } from '../bot/lib/nav.js'
import { Match } from './sim.js'
import { Collider } from './physics.js'
import { ProcBot } from './procbot.js'
import { brainBotFactory, ourBotFactory } from './ourbot.js'
import { FFA_TYPES, HouseBot, makeSquad, mergeParams } from './house.js'
import { loadConfig, oldBalance, MAP_DIR, ROOT, SIM_DIR } from './config.js'
import { hashSeed } from './rng.js'

export function parseArgs(argv) {
  const o = { bot: 'ours', mode: 'squad', matches: 1, seed: 1, jobs: 1, opponents: '', params: null, json: null, latency: 0, timeout: 200, full: false, config: null, oldBalance: false, quiet: false, worker: false, seeds: null, logDir: null, overrides: null, verbose: false, mapDir: null, trace: null, traceTag: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => argv[++i]
    if (a === '--bot') o.bot = val()
    else if (a === '--mode') o.mode = val()
    else if (a === '--matches') o.matches = parseInt(val(), 10)
    else if (a === '--seed') o.seed = parseInt(val(), 10)
    else if (a === '--jobs') o.jobs = parseInt(val(), 10)
    else if (a === '--opponents') o.opponents = val()
    else if (a === '--params') o.params = val()
    else if (a === '--json') o.json = val()
    else if (a === '--latency') o.latency = parseInt(val(), 10)
    else if (a === '--timeout') o.timeout = parseFloat(val())
    else if (a === '--config') o.config = val()
    else if (a === '--overrides') o.overrides = val()
    else if (a === '--log-dir') o.logDir = val()
    else if (a === '--map-dir') o.mapDir = val()
    else if (a === '--trace') o.trace = val()
    else if (a === '--trace-tag') o.traceTag = val()
    else if (a === '--seeds') o.seeds = val().split(',').map((s) => parseInt(s, 10))
    else if (a === '--full') o.full = true
    else if (a === '--old-balance') o.oldBalance = true
    else if (a === '--quiet') o.quiet = true
    else if (a === '--verbose') o.verbose = true
    else if (a === '--worker') o.worker = true
    else if (a === '--help' || a === '-h') o.help = true
    else throw new Error(`unknown argument ${a}`)
  }
  if (o.mode !== 'squad' && o.mode !== 'ffa') throw new Error('--mode must be squad or ffa')
  return o
}

/** Everything that is built once per process: map, navigation, rules, house parameters. */
export function makeContext(o = {}) {
  const world = o.world || World.loadSync(o.mapDir || MAP_DIR)
  let cfg = o.configObject || null
  if (!cfg) {
    if (o.config) { const j = JSON.parse(readFileSync(o.config, 'utf8')); cfg = j.config || j } else cfg = loadConfig()
  }
  if (o.oldBalance) cfg = oldBalance(cfg)
  const nav = o.nav || new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
  const over = o.paramsObject || (o.params ? JSON.parse(readFileSync(o.params, 'utf8')) : null)
  const merged = mergeParams(over)
  const overrides = o.overridesObject || (o.overrides ? JSON.parse(readFileSync(o.overrides, 'utf8')) : undefined)
  return { world, nav, cfg, merged, collider: new Collider(world), mapDir: o.mapDir || MAP_DIR, timeout: o.timeout ?? 200, logDir: o.logDir || null, overrides, quiet: o.quiet !== false }
}

/** Turn a bot spec into a factory: (info) -> bot object. info: { seed, slot, tag } */
export async function resolveBot(spec, ctx) {
  spec = String(spec).trim()
  if (spec.startsWith('proc:')) {
    const cmd = spec.slice(5)
    return (info) => new ProcBot(cmd, { timeoutMs: ctx.timeout, logFile: ctx.logDir ? join(ctx.logDir, `m${info.seed}_s${info.slot}.log`) : null, name: info.tag || 'proc' })
  }
  if (spec.startsWith('house:')) {
    const type = spec.slice(6)
    if (!ctx.merged.house[type]) throw new Error(`unknown house type ${type}`)
    return () => new HouseBot(type, { world: ctx.world, nav: ctx.nav, params: ctx.merged.house })
  }
  if (spec === 'ours' || /(^|\/)bot\/bot\.js$/.test(spec)) {
    const f = await ourBotFactory({ world: ctx.world, overrides: ctx.overrides, quiet: ctx.quiet })
    if (!f) throw new Error('bot/lib/brain.js not found (or it has no createBrain export)')
    return f
  }
  const file = isAbsolute(spec) ? spec : existsSync(resolve(spec)) ? resolve(spec) : join(ROOT, spec)
  if (!existsSync(file)) throw new Error(`bot module not found: ${spec}`)
  const mod = await import(pathToFileURL(file).href)
  if (typeof mod.createBrain === 'function') return brainBotFactory(mod, { world: ctx.world, name: spec.split('/').slice(-1)[0], overrides: ctx.overrides, quiet: ctx.quiet })
  const make = mod.createBot || mod.default || mod.make
  if (typeof make !== 'function') throw new Error(`${spec}: expected an export createBot(ctx) or a default function`)
  return () => make({ world: ctx.world, nav: ctx.nav })
}

/** Play one match; returns the team bot's record (plus the full result when `keep` is set). */
export async function playMatch(seed, o, ctx, factories) {
  const n = ctx.cfg.match.mechs
  const slot = o.slot ?? hashSeed(seed, 77) % n
  const bots = new Array(n)
  const info = { seed, slot, tag: 'team' }
  bots[slot] = factories.team(info)
  let squad = null
  if (o.mode === 'squad') {
    const sq = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: hashSeed(seed, 91) })
    squad = sq.squad
    let k = 0
    for (let i = 0; i < n; i++) if (i !== slot) { const b = sq.bots[k++ % sq.bots.length]; b.team = 1; bots[i] = b }
  } else {
    let k = 0, h = 0
    for (let i = 0; i < n; i++) {
      if (i === slot) continue
      if (k < factories.opponents.length) bots[i] = factories.opponents[k++]({ seed, slot: i, tag: `opp${k}` })
      else bots[i] = new HouseBot(FFA_TYPES[(h++ + seed) % FFA_TYPES.length], { world: ctx.world, nav: ctx.nav, params: ctx.merged.house })
    }
  }
  const trace = o.trace ? { slot, worldEvery: 5, hook: traceHook(bots, slot, squad) } : null
  const match = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: o.mode, mapDir: ctx.mapDir, latency: o.latency || 0, focus: o.full ? null : slot, trace })
  if (squad && ctx.merged.squad.knows === 'always') for (const b of bots) if (b && b.squad) b.omni = (id) => { const m = match.mechs[id]; return m && m.alive ? m : null }
  const t0 = performance.now()
  const res = await match.run()
  const me = res.mechs[slot], tb = bots[slot]
  const rec = {
    seed, slot, name: me.name, place: me.place, score: n - me.place, kills: me.kills, timeAlive: Math.round(me.timeAlive * 100) / 100, alive: me.alive,
    dmgDealt: me.dmgDealt, dmgTaken: me.dmgTaken, cause: me.cause, killedBy: me.killedBy, killRange: me.deathRange ?? null, killerRole: squad && me.killedBy !== null && me.killedBy < n ? squad.role(me.killedBy) : null, hunters: squad ? squad.hunters.size : 0, killerName: me.killedBy !== null && me.killedBy < n ? res.mechs[me.killedBy].name : (me.killedBy !== null ? 'npc' : null),
    lates: tb.lates || 0, missed: me.missed, cubes: me.cubes, upgrades: me.upgrades, loadout: me.loadout, won: me.place === 1,
    matchT: Math.round(res.t * 100) / 100, wallMs: Math.round(performance.now() - t0), deadOthers: res.mechs.filter((m) => !m.alive && m.id !== slot).length,
    errors: tb.errors || 0, fallback: !!tb.usedFallback, maxMs: tb.maxMs ? Math.round(tb.maxMs * 10) / 10 : 0, meanMs: tb.n ? Math.round(tb.sumMs / tb.n * 1000) / 1000 : 0,
  }
  if (tb.brain && tb.brain._B) { rec.counters = { ...tb.brain._B.counters }; rec.stageErrors = { ...tb.brain._B.errorsByStage } }   // p26work: brain counters
  if (tb.firstError) rec.firstError = tb.firstError.split('\n').slice(0, 3).join(' | ')
  if (tb.initError) rec.initError = tb.initError.split('\n').slice(0, 3).join(' | ')
  if (o.trace) {
    const dir = typeof o.trace === 'string' ? o.trace : null
    const tr = res.trace
    tr.seed = seed; tr.bot = o.traceTag || String(o.bot).slice(0, 80); tr.rec = { ...rec }
    tr.deaths = res.stats.deaths; tr.shots = match.shots.filter((s) => s.by === slot || s.tgt === slot).map((s) => [r2t(s.t), s.by, s.tgt, Math.round(s.range * 10) / 10, s.hit ? 1 : 0, s.air ? 1 : 0, s.wall ?? null])
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
}

export function summarize(recs) {
  const n = recs.length
  const mean = (f) => (n ? recs.reduce((s, r) => s + f(r), 0) / n : 0)
  const ms = mean((r) => r.score)
  const sd = n > 1 ? Math.sqrt(recs.reduce((s, r) => s + (r.score - ms) ** 2, 0) / (n - 1)) : 0
  const causes = {}
  for (const r of recs) { const c = r.alive ? 'alive' : (r.cause || 'unknown') + (r.killerRole ? '/' + r.killerRole : ''); causes[c] = (causes[c] || 0) + 1 }
  return {
    matches: n, meanScore: Math.round(ms * 1000) / 1000, stdErr: Math.round((n ? sd / Math.sqrt(n) : 0) * 1000) / 1000, sd: Math.round(sd * 1000) / 1000,
    winFrac: Math.round(mean((r) => (r.won ? 1 : 0)) * 1000) / 1000, meanKills: Math.round(mean((r) => r.kills) * 100) / 100,
    meanTimeAlive: Math.round(mean((r) => r.timeAlive) * 10) / 10, meanDmgDealt: Math.round(mean((r) => r.dmgDealt)), meanDmgTaken: Math.round(mean((r) => r.dmgTaken)),
    lates: recs.reduce((s, r) => s + r.lates, 0), errors: recs.reduce((s, r) => s + (r.errors || 0), 0), causes,
    meanWallMs: Math.round(mean((r) => r.wallMs)),
  }
}

function line(r) {
  const pad = (v, w) => String(v).padStart(w)
  return `${pad(r.seed, 6)} ${pad(r.slot, 4)} ${pad(r.place, 5)} ${pad(r.score, 5)} ${pad(r.kills, 5)} ${pad(r.timeAlive.toFixed(1), 8)} ${pad(r.dmgDealt, 7)} ${pad(r.dmgTaken, 7)} ${pad(r.alive ? 'alive' : `${r.cause}${r.killerName ? ':' + r.killerName : ''}`, 22)} ${pad(r.lates, 5)} ${pad((r.wallMs / 1000).toFixed(1), 6)}`
}
const HEADER = '  seed slot place score kills  alive_s   dealt   taken         cause_of_death lates wall_s'

async function runLocal(o, seeds, emit) {
  const ctx = makeContext(o)
  const factories = { team: await resolveBot(o.bot, ctx), opponents: [] }
  if (o.mode === 'ffa' && o.opponents) for (const s of o.opponents.split(',').map((q) => q.trim()).filter(Boolean)) factories.opponents.push(await resolveBot(s, ctx))
  const recs = []
  for (const seed of seeds) {
    const r = await playMatch(seed, o, ctx, factories)
    recs.push(r)
    emit(r)
  }
  return recs
}

function runWorkers(o, seeds, argv, emit) {
  const jobs = Math.min(o.jobs, seeds.length)
  const chunks = Array.from({ length: jobs }, () => [])
  seeds.forEach((s, i) => chunks[i % jobs].push(s))
  const base = []
  for (let i = 0; i < argv.length; i++) {
    if (['--jobs', '--json', '--matches', '--seed', '--seeds'].includes(argv[i])) { i++; continue }
    base.push(argv[i])
  }
  const recs = []
  return Promise.all(chunks.map((chunk) => new Promise((done, fail) => {
    const child = spawn(process.execPath, [join(SIM_DIR, 'run.js'), ...base, '--worker', '--seeds', chunk.join(',')], { stdio: ['ignore', 'pipe', 'inherit'] })
    let buf = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (d) => {
      buf += d
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const l = buf.slice(0, i); buf = buf.slice(i + 1)
        if (l.startsWith('@@R ')) { const r = JSON.parse(l.slice(4)); recs.push(r); emit(r) }
      }
    })
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`worker exited with ${code}`))))
    child.on('error', fail)
  }))).then(() => recs.sort((a, b) => a.seed - b.seed))
}

async function main() {
  const argv = process.argv.slice(2)
  const o = parseArgs(argv)
  if (o.help) { console.log(readFileSync(join(SIM_DIR, 'run.js'), 'utf8').split('\n').slice(1, 20).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return }
  if (!o.logDir && o.bot.startsWith('proc:') || (!o.logDir && o.opponents.includes('proc:'))) o.logDir = join(ROOT, 'runs', 'simlogs')
  if (o.logDir) { try { mkdirSync(o.logDir, { recursive: true }) } catch { /* exists */ } }
  const seeds = o.seeds || Array.from({ length: o.matches }, (_, i) => o.seed + i)
  if (o.worker) {
    await runLocal(o, seeds, (r) => process.stdout.write('@@R ' + JSON.stringify(r) + '\n'))
    process.exit(0)
  }
  const t0 = performance.now()
  if (!o.quiet) console.log(`bot=${o.bot} mode=${o.mode} matches=${seeds.length} seed=${seeds[0]} jobs=${o.jobs} latency=${o.latency}${o.oldBalance ? ' old-balance' : ''}\n${HEADER}`)
  const emit = (r) => { if (!o.quiet) console.log(line(r)) }
  const recs = o.jobs > 1 && seeds.length > 1 ? await runWorkers(o, seeds, argv, emit) : await runLocal(o, seeds, emit)
  const sum = summarize(recs)
  sum.wallS = Math.round((performance.now() - t0) / 100) / 10
  console.log(`mean score ${sum.meanScore.toFixed(3)} +- ${sum.stdErr.toFixed(3)} (se, n=${sum.matches}, sd ${sum.sd})  won ${(sum.winFrac * 100).toFixed(1)}%  kills ${sum.meanKills}  alive ${sum.meanTimeAlive}s  dealt ${sum.meanDmgDealt}  taken ${sum.meanDmgTaken}  lates ${sum.lates}  errors ${sum.errors}  causes ${JSON.stringify(sum.causes)}  wall ${sum.wallS}s`)
  if (o.json) writeFileSync(o.json, JSON.stringify({ args: o, summary: sum, matches: recs }, null, 1))
  process.exit(0)
}

const invoked = process.argv[1] && resolve(process.argv[1]) === join(SIM_DIR, 'run.js')
if (invoked) main().catch((e) => { console.error(e?.stack || e); process.exit(1) })
