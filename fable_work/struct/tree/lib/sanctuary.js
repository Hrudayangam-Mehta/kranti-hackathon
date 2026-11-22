// Roof sanctuary (Fable panel, structural line; preset `sanc`: off / heal / hold). SQUAD posture only, behind
// hunt.firewall(). Everything is computed from the map and hello.config at match start: no map constants.
//
//   buildPerches(world, nav, cfg, P)  table of roofs higher than the house hop with a centre far from every edge and
//                                     jet-reachable launch cells on the main ground component (cached per world)
//   makeSanctuary(B, mover, hunt)     { update(), legs(), active(), stats }
//
// Phases: off -> walk (to a launch cell) -> climb (jump + jet beside the wall, move in above the edge) -> top
// (centre: heal with the triggers held; edge: fight from the innermost point that has a line) -> drop -> off.
import { MODE } from './params.js'

const cache = new WeakMap()

/** Rise speed while jetting (m/s) and the energy one climb of h metres needs. */
function jetNumbers(cfg) {
  const m = cfg.mech, g = m.gravity || 22, js = m.jump_speed || 11, rise = m.max_rise_speed || 10, jd = m.jet_drain || 15
  const dt = 1 / ((cfg.match && cfg.match.tick_hz) || 20)
  const apex = js * js / (2 * g), up = Math.max(2, rise - g * dt)
  return { apex, up, jd, energy: m.energy || 100 }
}

export function buildPerches(world, nav, cfg, P) {
  const hit = cache.get(world)
  if (hit && hit.nav === nav && hit.key === `${P.sancMinH}|${P.sancMinSet}`) return hit.tab
  const t0 = performance.now()
  const J = jetNumbers(cfg), stepUp = cfg.mech.step_up || 1.2
  // a roof the house hop (jump + sancHopS of jet) cannot reach, with a margin
  const minH = P.sancMinH > 0 ? P.sancMinH : 1.15 * (J.apex + J.up * P.sancHopS * 0.9)
  const maxClimb = Math.min(60, J.apex + J.up * (J.energy * 0.8 / J.jd))
  const nx = nav.nx, ny = nav.ny, n = nav.n, cell = nav.cell
  const top = new Float32Array(n), pid = new Int32Array(n), roof = new Uint8Array(n), sb = new Float32Array(n)
  for (let c = 0; c < n; c++) {
    const x = nav.cellX(c), y = nav.cellY(c)
    pid[c] = world.surfacePrism(x, y)
    if (pid[c] < 0) { top[c] = world.ground(x, y); continue }
    top[c] = world.surfaceZ(x, y)
    roof[c] = top[c] - world.ground(x, y) >= minH ? 1 : 0
  }
  // setback: chamfer distance to the nearest cell whose top differs by more than a step (an edge or a higher wall)
  const BIG = 1e6, D1 = cell, D2 = cell * Math.SQRT2
  for (let c = 0; c < n; c++) {
    if (!roof[c]) { sb[c] = 0; continue }
    const i = c % nx, j = (c / nx) | 0
    let edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1
    if (!edge) edge = Math.abs(top[c - 1] - top[c]) > stepUp || Math.abs(top[c + 1] - top[c]) > stepUp || Math.abs(top[c - nx] - top[c]) > stepUp || Math.abs(top[c + nx] - top[c]) > stepUp
    sb[c] = edge ? cell * 0.5 : BIG
  }
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const c = j * nx + i
    if (!roof[c]) continue
    let v = sb[c]
    v = Math.min(v, sb[c - 1] + D1, sb[c - nx] + D1, sb[c - nx - 1] + D2, sb[c - nx + 1] + D2); sb[c] = v
  }
  for (let j = ny - 2; j >= 1; j--) for (let i = nx - 2; i >= 1; i--) {
    const c = j * nx + i
    if (!roof[c]) continue
    let v = sb[c]
    v = Math.min(v, sb[c + 1] + D1, sb[c + nx] + D1, sb[c + nx + 1] + D2, sb[c + nx - 1] + D2); sb[c] = v
  }
  const best = new Map()
  for (let c = 0; c < n; c++) {
    if (!roof[c]) continue
    const b = best.get(pid[c])
    if (!b) best.set(pid[c], { id: pid[c], c, sb: sb[c], cells: 1 }); else { b.cells++; if (sb[c] > b.sb) { b.sb = sb[c]; b.c = c } }
  }
  const perches = []
  const main = nav.mainComponent, L = nav.level
  const DX = [1, 0.7071, 0, -0.7071, -1, -0.7071, 0, 0.7071], DY = [0, 0.7071, 1, 0.7071, 0, -0.7071, -1, -0.7071]
  for (const b of best.values()) {
    if (b.sb < P.sancMinSet) continue
    const z = top[b.c], px = nav.cellX(b.c), py = nav.cellY(b.c)
    // launch cells: main-component ground 4-8 m outside an edge cell, nothing higher than the roof in between
    const sect = new Array(16).fill(null)
    for (let c = 0; c < n; c++) {
      if (pid[c] !== b.id || !roof[c] || sb[c] > cell * 1.6 || Math.abs(top[c] - z) > 0.6) continue
      const ex = nav.cellX(c), ey = nav.cellY(c)
      for (let d = 0; d < 8; d++) {
        // outward only: the first sample must leave the roof level
        const s1 = world.surfaceZ(ex + DX[d] * 2.5, ey + DY[d] * 2.5)
        if (s1 > z - minH * 0.5) continue
        for (let e = 4; e <= 8; e += 2) {
          const lx = ex + DX[d] * e, ly = ey + DY[d] * e, k = nav.idx(lx, ly)
          if (k < 0 || !nav.pass[k] || nav.comp[k] !== main) continue
          const lz = L[k], climb = z - lz
          if (climb < minH * 0.7 || climb > maxClimb) continue
          const kx = nav.cellX(k), ky = nav.cellY(k)
          if (world.surfaceZ(kx, ky) > lz + 0.6) continue                     // something over the launch cell
          let okLine = true
          for (let s = 1.5; s < e; s += 1.5) if (world.surfaceZ(ex + DX[d] * s, ey + DY[d] * s) > z + 0.3) { okLine = false; break }
          if (!okLine) break
          // entry point 4 m inside the edge, on this roof
          const ix = ex - DX[d] * 4, iy = ey - DY[d] * 4, ic = nav.idx(ix, iy)
          if (ic < 0 || pid[ic] !== b.id || Math.abs(top[ic] - z) > 0.6 || sb[ic] < cell) break
          const a = Math.atan2(ky - py, kx - px), si = ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16
          const cost = climb + e
          if (!sect[si] || cost < sect[si].cost) sect[si] = { x: kx, y: ky, z: lz, ex: ix, ey: iy, ux: -DX[d], uy: -DY[d], climb, cost }
          break
        }
      }
    }
    const launches = sect.filter(Boolean)
    if (!launches.length) continue
    // exposure of the centre: share of ground points on rings out to gun range with a clear shot at our body
    let seen = 0, tot = 0, near = 0, nearTot = 0
    const mh = cfg.mech.muzzle_height || 7, R = [40, 70, 100, 140, 180]
    for (let r = 0; r < R.length; r++) for (let a = 0; a < 16; a++) {
      const gx = px + R[r] * Math.cos(a * Math.PI / 8 + r * 0.2), gy = py + R[r] * Math.sin(a * Math.PI / 8 + r * 0.2), k = nav.idx(gx, gy)
      if (k < 0 || !nav.pass[k] || nav.comp[k] !== main) continue
      tot++; if (r < 3) nearTot++
      if (world.shotClear(gx, gy, L[k] + mh, px, py, z + 4.5)) { seen++; if (r < 3) near++ }
    }
    // shadow lattice: roof points at least 4 m from every edge (4 m spacing, at most 24), for hiding from known hunters
    let pts = []
    for (let c = 0; c < n; c++) {
      if (pid[c] !== b.id || sb[c] < 4 || Math.abs(top[c] - z) > 0.6) continue
      const i = c % nx, j = (c / nx) | 0
      if ((i & 1) || (j & 1)) continue
      pts.push({ x: nav.cellX(c), y: nav.cellY(c), sb: sb[c] })
    }
    if (pts.length > 24) { const k = pts.length / 24, q = []; for (let i = 0; i < 24; i++) q.push(pts[Math.floor(i * k)]); pts = q }
    // duel lattice: roof points from 2 m inside the edge (4 m spacing, at most 48), for one-line-at-a-time fighting
    let epts = []
    for (let c = 0; c < n; c++) {
      if (pid[c] !== b.id || sb[c] < 2 || Math.abs(top[c] - z) > 0.6) continue
      const i = c % nx, j = (c / nx) | 0
      if (!(i & 1) || !(j & 1)) continue
      epts.push({ x: nav.cellX(c), y: nav.cellY(c), sb: sb[c] })
    }
    if (epts.length > 48) { const k = epts.length / 48, q = []; for (let i = 0; i < 48; i++) q.push(epts[Math.floor(i * k)]); epts = q }
    perches.push({ epts, pts, id: b.id, x: px, y: py, z, sb: b.sb, area: b.cells * cell * cell, launches, expo: tot ? seen / tot : 1, expoNear: nearTot ? near / nearTot : 1 })
  }
  const tab = { perches, minH, maxClimb, ms: performance.now() - t0, top, pid }
  cache.set(world, { nav, key: `${P.sancMinH}|${P.sancMinSet}`, tab })
  return tab
}

export function makeSanctuary(B, mover, hunt) {
  const P = B.P, world = B.world, nav = B.nav, cfg = B.cfg
  const kind = P.sancMode || ''
  const J = jetNumbers(cfg)
  let tab = null
  if (kind && world && nav) { try { tab = buildPerches(world, nav, cfg, P); B.log(`sanctuary: ${tab.perches.length} perches, minH ${tab.minH.toFixed(1)}, ${tab.ms.toFixed(0)} ms`) } catch (e) { tab = null; B.noteError('sancBuild', e) } }
  const S = { phase: 'off', perch: null, launch: null, t0: -99, tryT: -99, fails: 0, healing: false, sub: 'centre', topT0: -99, lastHp: 0, px: 0, py: 0, ptT: -99, noShotSince: -1, dropX: 0, dropY: 0, hurtTop: 0, hurtT0: -99, airT0: -99, nearSince: -1 }
  const stats = { tries: 0, ups: 0, fails: 0, topTicks: 0, edgeTicks: 0, healHp: 0, hurtTop: 0, drops: 0, zoneDrops: 0, hurtDrops: 0, walkAbort: 0, linesCentre: 0, linesEdge: 0, centreTicks: 0, upT: -1, firstUpHpf: -1 }
  B.sancStats = stats
  const bad = new Map()                          // perch id -> unusable until (per brain: the table is shared)
  const need = (climb) => Math.min(96, (climb - J.apex + 4) / J.up * J.jd + 12)

  function inNext(p, m) {
    const z = B.zone
    if (!z.known) return true
    return Math.hypot(p.x - z.nx, p.y - z.ny) <= z.nrEff - m && Math.hypot(p.x - z.cx, p.y - z.cy) <= z.r - m
  }
  function onRoof(p) {
    const me = B.me
    return me.grounded && Math.abs(me.z - p.z) < 1.0 && Math.abs(world.surfaceZ(me.x, me.y) - p.z) < 1.3
  }
  function pick(reach) {
    const me = B.me, t = me.t
    let best = null, bl = null, bc = Infinity
    for (const p of tab.perches) {
      if (t < (bad.get(p.id) || -1e9) || !inNext(p, 14) || p.expoNear > P.sancMaxNear || p.expo > P.sancMaxExpo) continue
      for (const l of p.launches) {
        const d = Math.hypot(l.x - me.x, l.y - me.y)
        if (d > reach) continue
        // arrive alive: the incoming damage rate over the walk and the climb must leave sancArriveHp of the hull
        if (me.hp - B.A * (d * 1.25 / me.walk + l.climb / J.up + 1) < P.sancArriveHp * me.maxHp) continue
        const c = d * 1.25 + 2 * l.climb + P.sancExpoW * p.expo + (P.sancExpoNearW || 0) * p.expoNear
        if (c < bc) { bc = c; best = p; bl = l }
      }
    }
    if (!best) return false
    S.perch = best; S.launch = bl
    return true
  }
  function start(reach) {
    if (!pick(reach)) return false
    S.phase = 'walk'; S.t0 = B.me.t; S.tryT = B.me.t; S.fails = 0; S.nearSince = -1
    stats.tries++
    return true
  }
  function quit(badS) {
    if (S.perch && badS > 0) bad.set(S.perch.id, B.me.t + badS)
    S.phase = 'off'; S.healing = false; S.tryT = B.me.t
  }
  /** Lines on us right now (mechs with a recent line in). */
  const lines = () => B.nLos | 0

  /** Mode stage, after decideMode. */
  function update() {
    if (!tab || !tab.perches.length) return
    const me = B.me, t = me.t
    const fw = hunt.firewall()
    if (S.phase === 'off') {
      if (!fw || B.mode === MODE.ZONE || B.zoneUrgent || !me.grounded || t - S.tryT < P.sancRetryS || B.lastStand) return
      const low = me.hpf < P.sancEnterHp && me.hpf >= P.sancMinHp && lines() <= P.sancMaxLines
      const idle = kind === 'hold' && t >= P.sancHoldT && lines() === 0 && me.hpf >= 0.6 && !B.grab && B.mode !== MODE.LOOT && B.mode !== MODE.DROP
      if (low) { if (start(P.sancReachM)) S.healing = true }
      else if (idle) { if (start(P.sancHoldReachM)) S.healing = false }
      return
    }
    const p = S.perch
    // the zone or the end of the firewall takes us down
    const zoneOut = B.mode === MODE.ZONE || !inNext(p, 6) && B.zone.known && (t >= B.zone.t0 - P.sancZoneLeadS)
    if (S.phase === 'walk') {
      if (!fw || zoneOut || t - S.t0 > P.sancWalkMaxS || mover.isAbandoned(S.launch.x, S.launch.y) || (S.healing && me.hpf >= P.sancLeaveHp)) { stats.walkAbort++; quit(zoneOut ? 0 : 20) }
      return
    }
    if (S.phase === 'climb') return
    if (S.phase === 'top') {
      stats.topTicks++
      const dh = me.hp - S.lastHp
      if (dh > 0) stats.healHp += dh; else if (dh < 0) { stats.hurtTop -= dh; if (t - S.hurtT0 > 4) { S.hurtT0 = t; S.hurtTop = 0 } S.hurtTop -= dh }
      S.lastHp = me.hp
      if (!onRoof(p) && me.grounded) { quit(0); return }
      if (!fw || zoneOut) { stats.zoneDrops++; toDrop(); return }
      if (me.hpf < P.sancLowHp) S.healing = true
      if (S.healing && me.hpf >= P.sancLeaveHp) S.healing = false
      if (S.healing) {
        // the centre does not hide us: the sanctuary failed, fight it out on the ground (the perch is marked bad)
        if (t - S.hurtT0 <= 4 && S.hurtTop > P.sancHurtDrop && t - S.topT0 > 2) { stats.hurtDrops++; bad.set(p.id, t + 60); S.healing = false; if (kind !== 'hold') { toDrop(); return } }
        else B.holdFire = !(t - me.lastHurtT < 1.2 && B.target && B.target.losOut)
      } else if (kind === 'heal') { toDrop(); return }
      else if (S.noShotSince >= 0 && t - S.noShotSince > P.sancIdleS) { toDrop(); return }
    }
  }
  function toDrop() {
    const me = B.me, p = S.perch
    // leave on the side of the target (heal done) or of the zone centre
    let tx = B.zone.known ? B.zone.nx : p.x, ty = B.zone.known ? B.zone.ny : p.y
    const tg = B.target || B.nearestMech
    if (tg && B.mode !== MODE.ZONE && inNext(p, 6)) { tx = tg.x; ty = tg.y }
    let bl = null, bd = Infinity
    for (const l of p.launches) { const d = Math.hypot(l.x - tx, l.y - ty) + 0.5 * Math.hypot(l.x - me.x, l.y - me.y); if (d < bd) { bd = d; bl = l } }
    S.launch = bl; S.phase = 'drop'; S.t0 = me.t; stats.drops++
  }

  function steer(x, y, stick, arrive) {
    const me = B.me, cmd = B.cmd, dx = x - me.x, dy = y - me.y, d = Math.hypot(dx, dy)
    if (d < arrive) { cmd.mx = 0; cmd.my = 0; return d }
    let m = stick
    if (d < 2.5) m = Math.min(m, Math.max(0.25, d / 2.5))
    cmd.mx = dx / d * m; cmd.my = dy / d * m
    return d
  }
  /** Can a shot from (x,y) on the roof reach the track (line and pitch limit)? */
  function shotFrom(x, y, z, tr) {
    const me = B.me, d = Math.hypot(tr.x - x, tr.y - y), tz = tr.z + (tr.height || 9) * 0.5
    if (Math.atan2(tz - (z + me.muzzleH), d || 1) < me.minPitch + 0.04) return false
    return world.shotClear(x, y, z + me.muzzleH, tr.x, tr.y, tz)
  }
  /** Innermost point on the ray centre -> track that has a shot; null when the roof has none. */
  function edgePoint(p, tr) {
    const dx = tr.x - p.x, dy = tr.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d
    for (let s = 0; s < 80; s += 1.5) {
      const x = p.x + ux * s, y = p.y + uy * s
      if (Math.abs(world.surfaceZ(x + ux * 1.2, y + uy * 1.2) - p.z) > 0.6) return null
      if (shotFrom(x, y, p.z, tr)) return { x, y }
    }
    return null
  }

  /** Roof point the fewest known hunters have a line to (their muzzle to our chest and head); the centre without hunters. */
  const near = []
  function shadowPoint(p) {
    const me = B.me, t = me.t
    near.length = 0
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.hp > 0 && t - tr.lastSeen < P.sancShadowS) near.push(tr) }
    if (!near.length) { S.sx = p.x; S.sy = p.y; return }
    near.sort((a, b) => a.dist - b.dist)
    if (near.length > 5) near.length = 5
    let bc = Infinity, bx = p.x, by = p.y
    const cost = (x, y, sbk) => {
      let c = 0
      for (let k = 0; k < near.length; k++) {
        const tr = near[k], mz = tr.z + (tr.muzzleH || 7)
        if (world.shotClear(tr.x, tr.y, mz, x, y, p.z + me.height * 0.5)) c += 100
        else if (world.shotClear(tr.x, tr.y, mz, x, y, p.z + me.height * 0.92)) c += 45
      }
      return c + 0.6 * Math.hypot(x - me.x, y - me.y) - Math.min(sbk, 12) - (Math.hypot(x - S.sx, y - S.sy) < 1 ? 25 : 0)
    }
    for (let i = 0; i < p.pts.length; i++) { const q = p.pts[i], c = cost(q.x, q.y, q.sb); if (c < bc) { bc = c; bx = q.x; by = q.y } }
    S.sx = bx; S.sy = by; S.sLines = bc
  }

  /** Roof point with a shot at one hunter (the target first) and the fewest other lines (Lanchester: one line at a time). */
  function duelPoint(p) {
    const me = B.me, t = me.t, tg = B.target
    near.length = 0
    for (let k = 0; k < B.trackList.length; k++) { const tr = B.trackList[k]; if (!tr.npc && tr.hp > 0 && t - tr.lastSeen < 4) near.push(tr) }
    if (!near.length) return null
    near.sort((a, b) => a.dist - b.dist)
    if (near.length > 5) near.length = 5
    let bc = Infinity, bq = null
    for (let i = 0; i < p.epts.length; i++) {
      const q = p.epts[i]
      let ln = 0, shoot = false, shootT = false
      for (let k = 0; k < near.length; k++) {
        const tr = near[k], tz = tr.z + (tr.height || 9) * 0.5
        if (!world.shotClear(q.x, q.y, p.z + me.muzzleH, tr.x, tr.y, tz)) continue
        ln++
        if (Math.atan2(tz - (p.z + me.muzzleH), Math.hypot(tr.x - q.x, tr.y - q.y) || 1) >= me.minPitch + 0.04) { shoot = true; if (tr === tg) shootT = true }
      }
      if (!shoot) continue
      const c = 100 * (ln - 1) - (shootT ? 40 : 0) + 0.6 * Math.hypot(q.x - me.x, q.y - me.y) - (Math.hypot(q.x - S.px, q.y - S.py) < 1 ? 25 : 0)
      if (c < bc) { bc = c; bq = q }
    }
    return bq
  }

  /** Legs stage. True while the sanctuary owns the legs. */
  function legs() {
    if (S.phase === 'off' || !tab) return false
    const me = B.me, cmd = B.cmd, t = me.t, p = S.perch, l = S.launch
    if (S.phase === 'walk') {
      const d = mover.moveTo(l.x, l.y, 1, 0.9)
      const en = need(l.climb)
      cmd.boost = me.grounded && d > 25 && me.energy > en + 30
      if (d >= 4) S.nearSince = -1; else if (S.nearSince < 0) S.nearSince = t
      if (d < 1.6 || (S.nearSince >= 0 && t - S.nearSince > 1.5 && d < 3)) {
        cmd.mx = 0; cmd.my = 0; cmd.boost = false
        if (me.energy >= en && me.speed < 3 && me.grounded) { cmd.jump = true; cmd.boost = true; B.wantJet = true; S.phase = 'climb'; S.airT0 = t }
      }
      B.legKind = 'sancwalk'
      return true
    }
    if (S.phase === 'climb') {
      B.wantJet = true; B.noCharge = true
      const high = me.z >= p.z + 0.7
      if (high) steer(l.ex, l.ey, 1, 0.5); else { cmd.mx = l.ux * 0.25; cmd.my = l.uy * 0.25 }
      cmd.boost = me.z < p.z + 1.6 && me.energy > 0.5
      if (me.grounded && t - S.airT0 > 0.25) {
        if (onRoof(p)) {
          S.sx = p.x; S.sy = p.y; S.shT = -99
          S.phase = 'top'; S.topT0 = t; S.lastHp = me.hp; S.sub = 'centre'; S.noShotSince = -1; S.hurtT0 = -99; S.hurtTop = 0
          stats.ups++; if (stats.upT < 0) { stats.upT = t; stats.firstUpHpf = me.hpf }
        } else if (Math.abs(world.surfaceZ(me.x, me.y) - p.z) < 1.3 || me.z > l.z + 3) {
          // on the edge or a ledge: keep walking in
          steer(l.ex, l.ey, 1, 0.5)
          if (t - S.airT0 > 4) { stats.fails++; quit(30) }
        } else {
          stats.fails++; S.fails++
          if (P.sancDebug) B.log(`sanc climb fail t ${t.toFixed(1)} me ${me.x.toFixed(1)},${me.y.toFixed(1)},${me.z.toFixed(1)} launch ${l.x},${l.y},${l.z.toFixed(1)} entry ${l.ex.toFixed(1)},${l.ey.toFixed(1)} roof ${p.z.toFixed(1)} energy ${me.energy.toFixed(0)}`)
          if (S.fails >= 2) quit(45); else { S.phase = 'walk'; S.t0 = t; S.nearSince = -1 }
        }
      } else if (t - S.airT0 > 9) { stats.fails++; quit(45) }
      B.legKind = 'sancclimb'
      return true
    }
    if (S.phase === 'drop') {
      // walk to the edge above the chosen launch cell and off it
      const off = Math.abs(world.surfaceZ(me.x, me.y) - p.z) > 1.3 || me.z < p.z - 1.5
      if ((off && me.grounded) || t - S.t0 > 8) { quit(0); S.tryT = t; return false }
      const dx = l.x - me.x, dy = l.y - me.y, d = Math.hypot(dx, dy) || 1
      if (off) { cmd.mx = dx / d * 0.5; cmd.my = dy / d * 0.5 } else { cmd.mx = dx / d; cmd.my = dy / d }
      B.legKind = 'sancdrop'
      return true
    }
    // ---- top
    if (P.sancShadow && t - S.shT > 0.5) { S.shT = t; shadowPoint(p) }
    let gx = P.sancShadow ? S.sx : p.x, gy = P.sancShadow ? S.sy : p.y
    S.sub = 'centre'
    if (S.healing && B.holdFire) B.noCharge = true
    if (!S.healing && kind === 'hold') {
      if (t - S.ptT > 0.3) {
        S.ptT = t
        let q = null
        const tg = B.target
        if (P.sancDuel) q = duelPoint(p)
        else if (tg && !tg.npc && t - tg.lastSeen < 3) q = edgePoint(p, tg)
        if (!q && !P.sancDuel) {
          // any other known mech the roof has a shot at, nearest first
          let bd = Infinity, tried = 0
          for (let k = 0; k < B.trackList.length && tried < 3; k++) {
            const tr = B.trackList[k]
            if (tr.npc || tr.hp <= 0 || tr === tg || t - tr.lastSeen > 3 || tr.dist >= bd) continue
            tried++
            const e = edgePoint(p, tr)
            if (e) { q = e; bd = tr.dist }
          }
        }
        if (q) { S.px = q.x; S.py = q.y; S.noShotSince = -1; S.hasPt = true }
        else {
          S.hasPt = false
          if (S.noShotSince < 0) S.noShotSince = t
          // nobody to shoot: overwatch at the edge toward the last known enemy, else stay at the centre
          const e = B.lastEnemy
          if (e && t - e.t < 20 && B.nLos === 0) { const q2 = edgeToward(p, e.x, e.y); S.px = q2.x; S.py = q2.y; S.hasPt = true }
        }
      }
      if (S.hasPt) { gx = S.px; gy = S.py; S.sub = 'edge' }
    }
    if (S.sub === 'edge') { stats.edgeTicks++; stats.linesEdge += lines() } else { stats.centreTicks++; stats.linesCentre += lines() }
    if (P.sancDebug) for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.hp <= 0 || t - tr.losInT > 0.5) continue
      const key = (S.sub === 'edge' ? 'E' : 'C') + (tr.z > p.z - 3 ? 'up' : tr.dist < 60 ? 'd60' : tr.dist < 110 ? 'd110' : 'far')
      stats[key] = (stats[key] || 0) + 1
    }
    steer(gx, gy, 1, 0.8)
    B.legKind = S.sub === 'edge' ? 'sancedge' : 'sanccentre'
    return true
  }
  /** A point sancEdgeIn metres inside the roof edge on the bearing of (x,y). */
  function edgeToward(p, x, y) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d
    let s = 0
    while (s < 80 && Math.abs(world.surfaceZ(p.x + ux * (s + 1.5 + P.sancEdgeIn), p.y + uy * (s + 1.5 + P.sancEdgeIn)) - p.z) <= 0.6) s += 1.5
    return { x: p.x + ux * s, y: p.y + uy * s }
  }

  // DEV telemetry (sancDebug only): wall and CPU time of the sanctuary code per decision (CPU is what counts on a loaded machine)
  const cpuOk = !!P.sancDebug && typeof process !== 'undefined' && typeof process.cpuUsage === 'function'
  const timed = (fn) => !P.sancDebug ? fn : () => {
    const a = performance.now(), c0 = cpuOk ? process.cpuUsage() : null, r = fn(), d = performance.now() - a
    if (d > stats.maxMs) stats.maxMs = d
    stats.sumMs += d
    if (c0) { const c = process.cpuUsage(c0), ms = (c.user + c.system) / 1000; if (ms > stats.maxCpuMs) stats.maxCpuMs = ms; stats.sumCpuMs += ms }
    return r
  }
  stats.maxMs = 0; stats.sumMs = 0; stats.maxCpuMs = 0; stats.sumCpuMs = 0
  return { update: timed(update), legs: timed(legs), active: () => S.phase !== 'off', phase: () => S.phase, stats, table: () => tab, S }
}
