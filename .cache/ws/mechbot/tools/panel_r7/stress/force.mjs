// Panel R7 stress harness (DEV ONLY, read-only use of sim/ and bot/): forced unusual starts and endings for the
// current bot/ brain in-process. Builds each match exactly as sim/run.js playMatch does, then mutates it before
// the first decision: our mech in a pocket / at a map edge / outside the zone / low hp, or the clock advanced to a
// late phase with only k other mechs alive (all moved inside the live circle).
// usage: bun force.mjs <overrides.json> <tag> <out.json> scenario[:n] ...   (env PR7_SEED0 = first seed, default 3001)
import { readFileSync, writeFileSync } from 'node:fs'
import { makeContext, resolveBot } from '../../../sim/run.js'
import { Match } from '../../../sim/sim.js'
import { FFA_TYPES, HouseBot, makeSquad } from '../../../sim/house.js'
import { hashSeed, makeRng } from '../../../sim/rng.js'

const [OV, TAG, OUT, ...SCEN] = process.argv.slice(2)
const ov = JSON.parse(readFileSync(OV, 'utf8'))
const SEED0 = parseInt(process.env.PR7_SEED0 || '3001', 10)
const MAPDIR = process.env.PR7_MAPDIR || undefined, CONFIG = process.env.PR7_CONFIG || undefined

function scen(name) {
  const S = {
    pocket: { mode: 'squad' }, edge: { mode: 'squad' }, corner: { mode: 'squad' }, lowhp: { mode: 'squad', hp: 0.12 },
    zoneout: { mode: 'squad', t: 150, out: 20 }, pocketffa: { mode: 'ffa', env: 'ffa' },
    late4: { mode: 'ffa', t: 300, keep: 3, env: 'ffa' }, late2: { mode: 'ffa', t: 300, keep: 1, env: 'ffa' },
    late4auto: { mode: 'ffa', t: 300, keep: 3 }, final4: { mode: 'ffa', t: 372, keep: 3, env: 'ffa' },
    late4low: { mode: 'ffa', t: 300, keep: 3, env: 'ffa', hp: 0.3 }, late2e: { mode: 'ffa', t: 268, keep: 1, env: 'ffa' }, late3e: { mode: 'ffa', t: 268, keep: 2, env: 'ffa' }, sqlate4: { mode: 'squad', t: 300, keep: 3 },
  }
  if (!S[name]) throw new Error('unknown scenario ' + name)
  return { name, ...S[name] }
}

let LAST_MS = 0
const ctxBase = { mapDir: MAPDIR, config: CONFIG }
const ctxs = {}
async function getCtx(sc) {
  const key = sc.env || 'auto'
  if (!ctxs[key]) {
    const o2 = { ...ov }
    if (sc.env) o2.env = sc.env
    const ctx = makeContext({ ...ctxBase, overridesObject: o2 })
    if (process.env.PR7_BOT) ctx.logDir = process.env.PR7_LOGDIR || null
    ctxs[key] = { ctx, team: await resolveBot(process.env.PR7_BOT || 'ours', ctx) }
  }
  return ctxs[key]
}

function pockets(nav) {
  const out = []
  for (let k = 0; k < nav.compSizes.length; k++) {
    if (k === nav.mainComponent || nav.compSizes[k] < 25) continue
    const cells = []
    for (let c = 0; c < nav.n; c++) if (nav.comp[c] === k && nav.pass[c]) cells.push(c)
    out.push({ k, size: nav.compSizes[k], cells })
  }
  out.sort((a, b) => b.size - a.size)
  return out
}

function place(match, m, x, y) {
  const nav = match.nav, c = nav.idx(x, y)
  m.x = x; m.y = y; m.z = match.world.surfaceZ(x, y, (c >= 0 ? nav.level[c] : 0) + 0.6); m.vx = m.vy = m.vz = 0; m.grounded = true
}

function edgePoint(match, R, cornerOnly) {
  const nav = match.nav, b = match.world.bounds
  for (let k = 0; k < 4000; k++) {
    let x, y
    if (cornerOnly) {
      const cx = R() < 0.5 ? b.minX : b.maxX, cy = R() < 0.5 ? b.minY : b.maxY
      x = cx + (cx < 0 ? 1 : -1) * (6 + 40 * R()); y = cy + (cy < 0 ? 1 : -1) * (6 + 40 * R())
    } else {
      const side = Math.floor(R() * 4), d = 6 + 20 * R()
      x = side === 0 ? b.minX + d : side === 1 ? b.maxX - d : b.minX + R() * (b.maxX - b.minX)
      y = side === 2 ? b.minY + d : side === 3 ? b.maxY - d : b.minY + R() * (b.maxY - b.minY)
      if (side < 2) y = b.minY + R() * (b.maxY - b.minY)
    }
    const c = nav.idx(x, y)
    if (c < 0 || !nav.pass[c] || nav.comp[c] !== nav.mainComponent || nav.wallDist[c] < 3) continue
    return [x, y]
  }
  return null
}

function inside(match, R, r, others, sep) {
  const z = match.zone
  for (let k = 0; k < 3000; k++) {
    const p = match._groundPoint(R, z.x, z.y, r, 4, 10, 1)
    if (!p) continue
    if (others.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= sep)) return p
    if (k % 500 === 499) sep *= 0.8
  }
  return [z.x, z.y]
}

function traceHook(bots, slot, msRef) {
  return (match, fr) => {
    const br = bots[slot] && bots[slot].brain && bots[slot].brain._B
    if (br) { fr.md = br.mode; fr.lg = br.legKind; fr.env = br.env; fr.tg = br.target ? br.target.id : -1; fr.hd = br.hide ? br.hide.state : ''; fr.st = br.stance; if (br.hasGoal) fr.gl = [Math.round(br.goalX), Math.round(br.goalY)]; fr.fp = br.fpTarget ? 1 : 0; fr.two = br.twoMode || '' }
    const zz = match.zone; fr.zc = [Math.round(zz.x), Math.round(zz.y), Math.round(zz.r)]; fr.al = match.aliveCount
    fr.ms = Math.round(LAST_MS * 10) / 10
    const m = match.mechs[slot], c = match.nav.idx(m.x, m.y)
    fr.cm = c >= 0 && match.nav.comp[c] === match.nav.mainComponent ? 1 : 0
  }
}

async function play(seed, sc) {
  const { ctx, team } = await getCtx(sc)
  const n = ctx.cfg.match.mechs
  const slot = hashSeed(seed, 77) % n
  const bots = new Array(n)
  bots[slot] = team({ seed, slot, tag: 'team' })
  { const tb0 = bots[slot]; if (!tb0.async) { const a0 = tb0.act.bind(tb0); tb0.act = (obs) => { const q = performance.now(); const r = a0(obs); LAST_MS = performance.now() - q; return r } } }
  if (sc.mode === 'squad') {
    const sq = makeSquad({ world: ctx.world, nav: ctx.nav, merged: ctx.merged, seed: hashSeed(seed, 91) })
    let k = 0
    for (let i = 0; i < n; i++) if (i !== slot) { const b = sq.bots[k++ % sq.bots.length]; b.team = 1; bots[i] = b }
  } else {
    let h = 0
    for (let i = 0; i < n; i++) if (i !== slot) bots[i] = new HouseBot(FFA_TYPES[(h++ + seed) % FFA_TYPES.length], { world: ctx.world, nav: ctx.nav, params: ctx.merged.house })
  }
  const trace = { slot, worldEvery: 1000, hook: traceHook(bots, slot) }
  const match = new Match({ world: ctx.world, nav: ctx.nav, collider: ctx.collider, seed, config: ctx.cfg, bots, mode: sc.mode, mapDir: ctx.mapDir, focus: slot, trace })
  const R = makeRng(hashSeed(seed, 4242)), me = match.mechs[slot]
  let info = ''
  if (sc.t) {
    match.tick = Math.round(sc.t / match.dt); match.t = match.tick * match.dt; match._zoneAt(match.t)
    for (const d of match.drops) if (d.landT < match.t) d.state = 3
    const z = match.zone
    const others = match.mechs.filter((m) => m !== me)
    let keepIds = new Set(others.map((m) => m.id))
    if (sc.keep !== undefined) {
      const ids = others.map((m) => m.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]] }
      keepIds = new Set(ids.slice(0, sc.keep))
      let pl = n
      for (const m of others) if (!keepIds.has(m.id)) { m.alive = false; m.hp = 0; m.place = pl--; m.deathT = 0; m.deathWeapon = 'forced' }
      match.aliveCount = 1 + keepIds.size
    }
    const pts = []
    if (sc.out) {
      // just outside the live circle, on the side away from the next centre (clipped to the map)
      const ph = match.phases[match.zone.phase], a = Math.atan2(z.y - ph.to.y, z.x - ph.to.x)
      let ok = null
      for (let k = 0; k < 60 && !ok; k++) {
        const aa = a + (k ? (R() - 0.5) * 2.4 : 0), x = z.x + Math.cos(aa) * (z.r + sc.out), y = z.y + Math.sin(aa) * (z.r + sc.out)
        const c = match.nav.idx(x, y)
        if (c >= 0 && match.nav.pass[c] && match.nav.comp[c] === match.nav.mainComponent && match.nav.wallDist[c] >= 3) ok = [x, y]
      }
      if (ok) { place(match, me, ok[0], ok[1]); pts.push(ok); info = 'out' } else { const p = inside(match, R, z.r * 0.9, pts, 40); place(match, me, p[0], p[1]); pts.push(p); info = 'noOutPoint' }
    } else { const p = inside(match, R, z.r * 0.8, pts, 40); place(match, me, p[0], p[1]); pts.push(p) }
    for (const m of others) {
      if (!m.alive) continue
      const dx = m.x - z.x, dy = m.y - z.y
      if (sc.keep !== undefined || dx * dx + dy * dy > (z.r * 0.95) ** 2) { const p = inside(match, R, z.r * 0.85, pts, 40); place(match, m, p[0], p[1]); pts.push(p) }
    }
    for (const m of match.mechs) { m.lastCombatT = -1e9; m.yaw = Math.atan2(z.y - m.y, z.x - m.x); m.cmdYaw = m.yaw }
  }
  if (sc.name === 'pocket' || sc.name === 'pocketffa') {
    const P = pockets(match.nav)
    const pk = P[(seed - SEED0) % Math.min(P.length, 6)]
    const c = pk.cells[Math.floor(R() * pk.cells.length)]
    place(match, me, match.nav.cellX(c), match.nav.cellY(c)); info = `pocket k${pk.k} n${pk.size}`
  }
  if (sc.name === 'edge' || sc.name === 'corner') {
    const p = edgePoint(match, R, sc.name === 'corner')
    if (p) { place(match, me, p[0], p[1]); const z = match.zone; info = `${Math.round(p[0])},${Math.round(p[1])} dz=${Math.round(z.r - Math.hypot(p[0] - z.x, p[1] - z.y))}` }
  }
  if (sc.hp) me.hp = Math.round(me.maxHp * sc.hp)
  const x0 = me.x, y0 = me.y, t0 = match.t
  let zd = 0
  const o0 = match._obs.bind(match)
  match._obs = (m) => { if (m.id === slot) zd += m.zoneDmg; return o0(m) }
  const tw = performance.now()
  const res = await match.run()
  const r = res.mechs[slot], tb = bots[slot], B = tb.brain && tb.brain._B
  const fr = match.tr.frames
  let se = 0, ss = 0, ms = 0, oz = 0, t1 = null, escT = null, maxR = 0
  for (const x of fr) {
    if (escT === null && x.cm) escT = Math.round((x.t - t0) * 10) / 10
    maxR = Math.max(maxR, Math.hypot(x.x - x0, x.y - y0))
    if (!x.iz) oz += 0.1
    const c = Math.hypot(...x.mv) > 0.5 && x.v < 1.5 && x.g && x.lg !== 'hop'
    if (c && t1 === null) t1 = x.t
    if (!c && t1 !== null) { const d = x.t - t1; if (d >= 2) { se++; ss += d; ms = Math.max(ms, d) } t1 = null }
  }
  if (t1 !== null && fr.length) { const d = fr[fr.length - 1].t - t1; if (d >= 2) { se++; ss += d; ms = Math.max(ms, d) } }
  const startAlive = sc.keep !== undefined ? sc.keep + 1 : n
  if (process.env.PR7_DUMP) writeFileSync(process.env.PR7_DUMP + `_${sc.name}_${seed}.json`, JSON.stringify(fr))
  return {
    sc: sc.name, seed, slot, info, place: r.place, startAlive, rank: r.place, alive: r.alive, cause: r.cause, killer: r.killedBy,
    t0: Math.round(t0), tAlive: Math.round(((r.alive ? match.t : r.timeAlive) - t0) * 10) / 10, endT: Math.round(match.t * 10) / 10,
    zoneDmg: Math.round(zd + me.zoneDmg), escT, maxR: Math.round(maxR), outZoneS: Math.round(oz * 10) / 10, stuckEp: se, stuckS: Math.round(ss * 10) / 10, maxStuck: Math.round(ms * 10) / 10,
    errors: tb.errors || 0, firstError: tb.firstError ? tb.firstError.split('\n').slice(0, 2).join(' | ') : undefined, fallback: !!tb.usedFallback,
    maxMs: Math.round((tb.maxMs || 0) * 10) / 10, lates: tb.lates || 0, fuse: B ? B.counters.fuse : -1, overruns: B ? B.counters.overruns : -1,
    env: B ? B.env : '?', latchT: B ? B.ffaLatchT : null, kills: r.kills, dealt: r.dmgDealt, taken: r.dmgTaken, x0: Math.round(x0), y0: Math.round(y0),
    endMode: fr.length ? fr[fr.length - 1].md : '', wallMs: Math.round(performance.now() - tw),
  }
}

const recs = []
for (const s of SCEN) {
  const [name, cnt] = s.split(':')
  const sc = scen(name)
  for (let i = 0; i < (parseInt(cnt || '8', 10)); i++) {
    const r = await play(SEED0 + i, sc)
    recs.push(r)
    console.log(JSON.stringify(r))
  }
}
writeFileSync(OUT, JSON.stringify({ tag: TAG, overrides: ov, recs }, null, 1))
