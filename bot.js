const T0 = performance.now()
const log = (...a) => { try { console.error('[bot]', ...a) } catch { /* ignore */ } }
const send = (o) => process.stdout.write(JSON.stringify(o) + '\n')

const NAME = 'aegis-16'

let hello = null
let brain = null // { act(obs, deadline) -> action }
let lastGood = { move: [0, 0], aim: [0, 0], boost: false }
let errors = 0
let ticks = 0
let slowTicks = 0
let worstMs = 0

function fallbackAct(obs) {
  const me = obs.self
  const [x, y, z] = me.pos
  const zone = obs.zone || {}
  const goal = zone.next_center || zone.center || [x, y]
  const dx = goal[0] - x, dy = goal[1] - y
  const d = Math.hypot(dx, dy)
  const inNext = d < Math.max(5, (zone.next_radius ?? 1e9) * 0.6)
  const act = { move: inNext ? [0, 0] : [dx / (d || 1), dy / (d || 1)], boost: me.in_zone === false }
  let best = null, bestD = Infinity
  for (const m of obs.mechs || []) {
    if (m.kind !== 'mech') continue
    const dd = Math.hypot(m.pos[0] - x, m.pos[1] - y)
    if (dd < bestD) { bestD = dd; best = m }
  }
  if (best) {
    const speed = me.weapons?.[0]?.stats?.speed || 252
    const t = bestD / speed
    const tx = best.pos[0] + (best.vel?.[0] || 0) * t, ty = best.pos[1] + (best.vel?.[1] || 0) * t
    const tz = best.pos[2] + 4.5
    const hd = Math.hypot(tx - x, ty - y)
    act.aim = [Math.atan2(ty - y, tx - x), Math.atan2(tz - (z + 7), hd || 1)]
    act.fire = [bestD < 220, bestD < 45]
    const side = (Math.floor(obs.tick / 14) % 2) ? 1 : -1
    const nx = -(ty - y) / (hd || 1), ny = (tx - x) / (hd || 1)
    act.move = [act.move[0] * 0.5 + nx * side, act.move[1] * 0.5 + ny * side]
  } else if (d > 1) {
    act.aim = [Math.atan2(dy, dx), 0]
  }
  if (obs.offer) act.pick = 0
  return act
}

const num = (v, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : def)
const r4 = (v) => Math.round(v * 1e4) / 1e4

function sanitize(a, obs) {
  const out = { tick: obs.tick }
  if (!a || typeof a !== 'object') a = {}
  let mx = num(a.move?.[0]), my = num(a.move?.[1])
  const ml = Math.hypot(mx, my)
  if (ml > 1) { mx /= ml; my /= ml }
  out.move = [r4(mx), r4(my)]
  out.boost = !!a.boost
  if (a.jump) out.jump = true
  if (Array.isArray(a.aim) && a.aim.length >= 2) {
    let yaw = num(a.aim[0], obs.self.aim?.[0] ?? 0)
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw))
    const pitch = Math.max(-1.5, Math.min(1.5, num(a.aim[1], 0)))
    out.aim = [r4(yaw), r4(pitch)]
  }
  if (Array.isArray(a.fire)) out.fire = [!!a.fire[0], !!a.fire[1]]
  if (a.reload) out.reload = true
  if (Number.isInteger(a.pick) && a.pick >= 0 && a.pick <= 2) out.pick = a.pick
  if (Number.isInteger(a.take) && a.take >= 0) out.take = a.take
  if (a.drop === 0 || a.drop === 1) out.drop = a.drop
  if (a.debug && typeof a.debug === 'object') out.debug = a.debug
  return out
}

async function init(h) {
  let world = null, nav = null
  const dirs = [h?.map?.dir, '/arena'].filter(Boolean)
  try {
    const { World } = await import('./lib/world.js')
    for (const dir of dirs) {
      try { world = World.loadSync(dir); break } catch (e) { log('map load failed for', dir, String(e?.message || e)) }
    }
  } catch (e) { log('world module failed:', e?.stack || e) }
  if (world) {
    try {
      const { Nav } = await import('./lib/nav.js')
      const m = h?.config?.mech || {}
      nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
    } catch (e) { log('nav module failed:', e?.stack || e) }
  }
  try {
    const mod = await import('./lib/brain.js')
    brain = mod.createBrain(h, { world, nav, log })
  } catch (e) { log('brain module failed, using fallback policy:', e?.stack || e) }
  log(`init ${(performance.now() - T0).toFixed(0)} ms world=${!!world} nav=${!!nav} brain=${!!brain}`)
}

function decide(obs) {
  const t0 = performance.now()
  const budget = hello?.config?.bot?.tick_budget_ms ?? 50
  let action = null
  if (brain) {
    try {
      action = brain.act(obs, t0 + budget * 0.55)
    } catch (e) {
      errors++
      if (errors <= 5 || errors % 200 === 0) log(`act() failed at tick ${obs.tick} (${errors} so far):`, e?.stack || e)
      action = null
    }
  }
  if (!action) {
    try { action = fallbackAct(obs) } catch (e) { action = { ...lastGood } }
  }
  let out
  try { out = sanitize(action, obs) } catch { out = { tick: obs.tick, move: [0, 0] } }
  lastGood = { move: out.move, aim: out.aim, boost: out.boost }
  const ms = performance.now() - t0
  ticks++
  if (ms > worstMs) worstMs = ms
  if (ms > budget * 0.6) { slowTicks++; if (slowTicks <= 5) log(`slow tick ${obs.tick}: ${ms.toFixed(1)} ms`) }
  return out
}

let buf = ''
let queued = false
let busy = false
let again = false

async function handle(lines) {
  let latest = null
  for (const line of lines) {
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (!msg || typeof msg !== 'object') continue
    if (msg.type === 'hello') {
      hello = msg
      try { await init(msg) } catch (e) { log('init failed:', e?.stack || e) }
      send({ type: 'ready', name: NAME })
    } else if (msg.type === 'obs') {
      latest = msg
    } else if (msg.type === 'end') {
      log(`end place=${msg.place} kills=${msg.kills} ticks=${ticks} errors=${errors} slow=${slowTicks} worst=${worstMs.toFixed(1)}ms`)
      process.exit(0)
    }
  }
  if (latest && latest.self) send(decide(latest))
}

async function pump() {
  if (busy) { again = true; return }
  busy = true
  try {
    do {
      again = false
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      const todo = lines.filter((l) => l.trim())
      if (todo.length) {
        try { await handle(todo) } catch (e) { log('handle failed:', e?.stack || e) }
      }
    } while (again)
  } finally { busy = false }
}

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buf += chunk
  if (queued) return
  queued = true
  setImmediate(() => { queued = false; pump() })
})
process.stdin.on('end', () => {
  buf += '\n'
  pump().finally(() => setTimeout(() => process.exit(0), 20))
})
process.on('uncaughtException', (e) => log('uncaught:', e?.stack || e))
process.on('unhandledRejection', (e) => log('unhandled rejection:', e?.stack || e))
