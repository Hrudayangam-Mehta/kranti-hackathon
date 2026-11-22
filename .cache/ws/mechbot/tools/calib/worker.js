#!/usr/bin/env bun
// DEV ONLY: persistent match worker for the calibration runs (tools/calib/pool.js starts several of these).
// Reads one JSON job per line on stdin, plays the match with the local simulator, answers "@@R <json>".
// A job: { id, bot, seed, mode: 'squad' | 'ffa', paramsFile | null, opponents: [spec...], full, timeout }
// The map is loaded once from the sandbox copy of the arena so that the directory announced in `hello`
// is one the sandboxed sparring bots can read (it is byte-identical to kit/arena).
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { World } from '../../bot/lib/world.js'
import { Nav } from '../../bot/lib/nav.js'
import { loadConfig } from '../../sim/config.js'
import { makeContext, resolveBot, playMatch } from '../../sim/run.js'

const MAP_DIR = process.env.CALIB_MAP_DIR || '/srv/mech-sparring/_arena'
const LOG_DIR = process.env.CALIB_LOG_DIR || null
const cfg = loadConfig()
const world = World.loadSync(MAP_DIR)
const nav = new Nav(world, { cell: 2, stepUp: cfg.mech.step_up, maxSlopeDeg: cfg.mech.max_slope_deg })
const ctxCache = new Map()      // paramsFile|timeout -> ctx
const facCache = new Map()      // ctx key + spec -> factory
let ours = null

function ctxFor(job) {
  const key = (job.paramsFile || '-') + '|' + (job.timeout || 1000)
  let c = ctxCache.get(key)
  if (!c) {
    const paramsObject = job.paramsFile ? JSON.parse(readFileSync(job.paramsFile, 'utf8')) : null
    c = makeContext({ world, nav, paramsObject, mapDir: MAP_DIR, timeout: job.timeout || 1000, logDir: LOG_DIR, quiet: true })
    c.key = key
    ctxCache.set(key, c)
    if (ctxCache.size > 24) { const k = ctxCache.keys().next().value; ctxCache.delete(k); for (const f of [...facCache.keys()]) if (f.startsWith(k + '#')) facCache.delete(f) }
  }
  return c
}
async function factory(spec, ctx) {
  if (spec === 'ours') { if (!ours) ours = await resolveBot('ours', ctx); return ours }
  const k = ctx.key + '#' + spec
  let f = facCache.get(k)
  if (!f) { f = await resolveBot(spec, ctx); facCache.set(k, f) }
  return f
}

async function play(job) {
  const ctx = ctxFor(job)
  const factories = { team: await factory(job.bot, ctx), opponents: [] }
  for (const s of job.opponents || []) factories.opponents.push(await factory(s, ctx))
  const o = { mode: job.mode || 'squad', full: !!job.full, keep: true, latency: job.latency || 0 }
  const rec = await playMatch(job.seed, o, ctx, factories)
  const res = rec.result
  delete rec.result
  rec.id = job.id; rec.bot = job.tag || job.bot
  rec.squadDeaths = res.stats.deaths.filter((d) => d.id !== rec.slot).map((d) => [Math.round(d.t * 10) / 10, d.by === rec.slot ? 'team' : d.by >= 100 ? 'npc' : d.by < 0 ? 'zone' : 'other', d.weapon])
  if (o.mode === 'ffa') {
    // every mech: slot, announced name, place, kills, life, killer slot, weapon, range
    rec.all = res.mechs.map((m) => ({ slot: m.id, name: m.name, place: m.place, kills: m.kills, t: Math.round(m.timeAlive * 10) / 10, alive: m.alive, by: m.killedBy, cause: m.cause, range: m.deathRange ?? null, lates: m.lates, missed: m.missed }))
  }
  return rec
}

const rl = createInterface({ input: process.stdin })
let chain = Promise.resolve()
rl.on('line', (line) => {
  if (!line.trim()) return
  const job = JSON.parse(line)
  chain = chain.then(async () => {
    let out
    try { out = await play(job) } catch (e) { out = { id: job.id, bot: job.tag || job.bot, seed: job.seed, failed: String(e?.stack || e).split('\n').slice(0, 4).join(' | ') } }
    process.stdout.write('@@R ' + JSON.stringify(out) + '\n')
  })
})
rl.on('close', () => chain.then(() => process.exit(0)))
