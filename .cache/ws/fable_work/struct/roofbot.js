// DEV ONLY mechanism probe for the simulator (not a shipped bot). A trivial shooter (nearest visible mech, first-order
// lead, gun + second weapon) that either stays on the ground (STRUCT_MODE=ground) or climbs the nearest tall roof
// inside the next circle and stands at its centre (STRUCT_MODE=roof) / peeks from the edge (STRUCT_MODE=peek).
const MODE = process.env.STRUCT_MODE || 'roof'
const MINH = +(process.env.STRUCT_MINH || 17), MINSET = +(process.env.STRUCT_MINSET || 9)
let PERCH = null
function buildPerches(world, nav) {
  if (PERCH) return PERCH
  const B = world.bounds, step = 2, gnx = Math.ceil((B.maxX - B.minX) / step), gny = Math.ceil((B.maxY - B.minY) / step)
  const top = new Float32Array(gnx * gny), ok = new Uint8Array(gnx * gny), pid = new Int32Array(gnx * gny)
  for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) {
    const x = B.minX + (i + 0.5) * step, y = B.minY + (j + 0.5) * step, k = j * gnx + i
    top[k] = world.surfaceZ(x, y); pid[k] = world.surfacePrism(x, y); ok[k] = pid[k] >= 0 && top[k] - world.ground(x, y) >= MINH ? 1 : 0
  }
  const best = new Map(), RM = 9
  for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) {
    const k = j * gnx + i; if (!ok[k]) continue
    let sb = RM * step + 1
    for (let dj = -RM; dj <= RM; dj++) for (let di = -RM; di <= RM; di++) {
      const ii = i + di, jj = j + dj, d = Math.hypot(di, dj) * step; if (d >= sb) continue
      if (ii < 0 || jj < 0 || ii >= gnx || jj >= gny || Math.abs(top[jj * gnx + ii] - top[k]) > 1.2) sb = d
    }
    const b = best.get(pid[k]); if (!b || sb > b.sb) best.set(pid[k], { sb, x: B.minX + (i + 0.5) * step, y: B.minY + (j + 0.5) * step, z: top[k], id: pid[k] })
  }
  const list = []
  for (const p of best.values()) {
    if (p.sb < MINSET) continue
    // launch cells: main-component ground within 7 m outside this roof, sampled on 16 rays from the perch
    const launches = []
    for (let a = 0; a < 16; a++) {
      const ux = Math.cos(a * Math.PI / 8), uy = Math.sin(a * Math.PI / 8)
      for (let s = p.sb; s < 120; s += 1) {
        const x = p.x + ux * s, y = p.y + uy * s
        if (Math.abs(world.surfaceZ(x, y) - p.z) <= 1.2) continue
        // first point off the roof level: look 4..8 m further for a standable main cell lower than the roof
        for (let e = 4; e <= 9; e += 1) {
          const lx = p.x + ux * (s + e), ly = p.y + uy * (s + e), c = nav.idx(lx, ly)
          if (c >= 0 && nav.pass[c] && nav.comp[c] === nav.mainComponent && nav.level[c] < p.z - 3 && world.surfaceZ(lx, ly) <= nav.level[c] + 0.5 && p.z - nav.level[c] <= 45) { launches.push({ x: nav.cellX(c), y: nav.cellY(c), z: nav.level[c], ex: p.x + ux * (s - 4), ey: p.y + uy * (s - 4), ux, uy }); break }
        }
        break
      }
    }
    if (launches.length) list.push({ ...p, launches })
  }
  PERCH = list
  return list
}
export function createBot(ctx) {
  const { world, nav } = ctx
  let perches = null, goal = null, launch = null, phase = 'pick', path = null, pathT = -1e9, stuckT = 0, lastPos = null, tClimb = 0
  const st = { climbs: 0, onRoofTicks: 0, ticks: 0, phaseLog: [] }
  return {
    name: 'struct-' + MODE,
    hello() { if (MODE !== 'ground') perches = buildPerches(world, nav); return { type: 'ready', name: 'struct-' + MODE } },
    act(obs) {
      const me = obs.self, [x, y, z] = me.pos, t = obs.t, zn = obs.zone
      const act = { tick: obs.tick, move: [0, 0], boost: false, aim: [me.aim[0], 0], fire: [false, false] }
      if (obs.offer) act.pick = 0
      st.ticks++
      // ---- shooting: nearest visible mech, first-order lead with the gun speed
      let tgt = null, bd = Infinity
      for (const m of obs.mechs) { if (m.kind !== 'mech') continue; const d = Math.hypot(m.pos[0] - x, m.pos[1] - y); if (d < bd) { bd = d; tgt = m } }
      if (tgt) {
        const tof = bd / 252, px = tgt.pos[0] + tgt.vel[0] * tof, py = tgt.pos[1] + tgt.vel[1] * tof
        const d = Math.hypot(px - x, py - y)
        act.aim = [Math.atan2(py - y, px - x), Math.atan2(tgt.pos[2] + 4.5 - (z + 7), d || 1)]
        act.fire = [true, true]
      }
      const moveTo = (gx, gy, direct) => {
        if (direct || nav.walkLine(x, y, gx, gy)) { const d = Math.hypot(gx - x, gy - y) || 1; act.move = [(gx - x) / d, (gy - y) / d]; return }
        if (!path || t - pathT > 1.5) { let r = null; try { r = nav.findPath(x, y, gx, gy, { maxExpand: 20000 }) } catch { r = null } path = r && r.pts && r.pts.length >= 2 ? r.pts : null; pathT = t }
        if (!path) { const d = Math.hypot(gx - x, gy - y) || 1; act.move = [(gx - x) / d, (gy - y) / d]; return }
        const k = nav.nextWaypoint(path, x, y, 2.6), w = path[Math.min(k, path.length - 1)], d = Math.hypot(w[0] - x, w[1] - y) || 1
        act.move = [(w[0] - x) / d, (w[1] - y) / d]
      }
      const ground = () => {            // the baseline habit: stand inside the next circle
        const c = zn.next_center, far = Math.hypot(c[0] - x, c[1] - y) > Math.max(6, zn.next_radius * 0.3)
        if (far) moveTo(c[0], c[1]); act.boost = !me.in_zone
      }
      if (MODE === 'ground') { ground(); return act }
      const inNext = (p) => Math.hypot(p.x - zn.next_center[0], p.y - zn.next_center[1]) <= zn.next_radius - 25
      if (goal && !inNext(goal) && t >= zn.shrink_start - 8) { goal = null; phase = 'pick' }
      if (phase === 'pick') {
        let best = null, bc = Infinity
        for (const p of perches) { if (!inNext(p)) continue; for (const l of p.launches) { const c = Math.hypot(l.x - x, l.y - y) + 2 * (p.z - l.z); if (c < bc) { bc = c; best = [p, l] } } }
        if (!best) { ground(); return act }
        goal = best[0]; launch = best[1]; phase = 'walk'; path = null
      }
      const onRoof = me.grounded && Math.abs(z - goal.z) < 1.0 && Math.abs(world.surfaceZ(x, y) - goal.z) < 1.3
      if (onRoof) { phase = 'hold'; st.onRoofTicks++ }
      if (phase === 'walk') {
        moveTo(launch.x, launch.y); act.boost = bd > 150 && me.energy > 80
        if (Math.hypot(launch.x - x, launch.y - y) < 2.2 && me.energy >= Math.min(95, (goal.z - z + 4) / 8.9 * 15 + 12)) { phase = 'climb'; tClimb = t; st.climbs++ }
        else if (Math.hypot(launch.x - x, launch.y - y) < 2.2) act.move = [0, 0]
      } else if (phase === 'climb') {
        act.boost = true; if (me.grounded) act.jump = true
        if (z > goal.z + 0.8) { const d = Math.hypot(launch.ex - x, launch.ey - y) || 1; act.move = [(launch.ex - x) / d, (launch.ey - y) / d] } else act.move = [-launch.ux * 0.2, -launch.uy * 0.2]
        if (t - tClimb > 9 || (me.energy <= 0 && me.grounded)) { phase = 'walk'; path = null }
        if (me.grounded && t - tClimb > 1 && !onRoof && Math.abs(z - launch.z) < 1.5) { phase = 'walk' }
      } else if (phase === 'hold') {
        if (!onRoof && me.grounded) { phase = 'pick'; goal = null; ground(); return act }
        let gx = goal.x, gy = goal.y
        if (MODE === 'peek' && tgt) {
          // step toward the target side while the weapon is ready, back to the centre while it reloads
          const w0 = me.weapons[0], ready = w0 && w0.ammo > 0 && !(w0.reload > 0)
          if (ready) { const d = Math.hypot(tgt.pos[0] - x, tgt.pos[1] - y) || 1; gx = x + (tgt.pos[0] - x) / d * 6; gy = y + (tgt.pos[1] - y) / d * 6; if (Math.abs(world.surfaceZ(gx, gy) - goal.z) > 1.2) { gx = x; gy = y } }
        }
        const d = Math.hypot(gx - x, gy - y)
        if (d > 1.5) act.move = [(gx - x) / d, (gy - y) / d]
      }
      return act
    },
    end() { if (process.env.STRUCT_LOG) console.error('[struct]', MODE, 'climbs', st.climbs, 'onRoof s', (st.onRoofTicks * 0.1).toFixed(0), 'of', (st.ticks * 0.1).toFixed(0)) },
  }
}
export default createBot
export { buildPerches }
