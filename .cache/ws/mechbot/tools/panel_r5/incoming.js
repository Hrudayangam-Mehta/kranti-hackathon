// Panel R5 algorithms expert: where the V4 build's incoming damage comes from in the (uncalibrated) simulator, and
// how often a laser charge aimed at us could be dodged by a line break reachable before its release.
// Read-only on bot/, sim/ and variants/V4. Behaviour numbers only (the simulator's within-bot deltas are not trusted).
//   bun incoming.js <from> <to>      (squad seeds; env OVR = brain overrides JSON, TAG = label)
// Per match: damage taken by weapon and shooter range band, rear share, laser charges aimed at us (first flag seen),
// for each: the nearest walkable cell on rings 2..12 m whose centre (z + 4.5) is hidden from the charger's muzzle,
// and whether we could reach it before the predicted release (flag first seen + 0.75 s) walking or boosting.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const V4 = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const TAG = process.env.TAG || 'V4'
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(V4 + '/lib/brain.js')
const { Nav } = await import(V4 + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const band = (d) => d < 40 ? '<40' : d < 80 ? '40-80' : d < 130 ? '80-130' : d < 180 ? '130-180' : '180+'
const tot = { byW: {}, byBand: {}, rear: 0, all: 0, charges: 0, reach: { walk: 0, boost: 0 }, shadowAt: {}, beamsAtUs: 0, beamHits: 0, life: 0, kills: 0, matches: 0, beamhide: 0, laserHeldT: 0 }
// time to cover distance d from rest-ish: accel 58.5 to speed s, then cruise
const tReach = (d, s) => { const ta = s / 58.5, da = 0.5 * s * ta; return d <= da ? Math.sqrt(2 * d / 58.5) : ta + (d - da) / s }
for (let seed = from; seed <= to; seed++) {
  let brain = null, lastT = 0
  const seenCharge = new Map()
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, me = B.me, t = obs.t, w = ctx.world
      if (B.legKind === 'beamhide') tot.beamhide += t - lastT
      if (me.laser) tot.laserHeldT += t - lastT
      lastT = t
      tot.life = Math.max(tot.life, 0)
      if (Array.isArray(obs.events)) for (const e of obs.events) {
        if (!e) continue
        if (e.type === 'damaged' && typeof e.amount === 'number') {
          const tr = Number.isInteger(e.by) ? B.tracks.get(e.by) : null
          const wk = e.weapon || '?'
          tot.byW[wk] = (tot.byW[wk] || 0) + e.amount; tot.all += e.amount
          if (e.rear) tot.rear += e.amount
          if (tr && (wk === 'gun' || wk === 'laser')) { const k = wk + ' ' + band(tr.dist); tot.byBand[k] = (tot.byBand[k] || 0) + e.amount }
          if (wk === 'laser') tot.beamHits++
        }
        if (e.type === 'kill') tot.kills++
      }
      if (Array.isArray(obs.beams)) for (const b of obs.beams) {
        if (!b || b.kind !== 'laser' || !Array.isArray(b.path) || b.path.length < 2) continue
        const q = b.path[b.path.length - 1]
        // a beam that ends within 12 m of us or passes within 6 m of our axis counts as fired at us
        const s = b.path[0], dx = q[0] - s[0], dy = q[1] - s[1], L2 = dx * dx + dy * dy || 1
        const u = Math.max(0, Math.min(1, ((me.x - s[0]) * dx + (me.y - s[1]) * dy) / L2))
        const md = Math.hypot(s[0] + dx * u - me.x, s[1] + dy * u - me.y)
        if (md < 6 || Math.hypot(q[0] - me.x, q[1] - me.y) < 12) tot.beamsAtUs++
      }
      // laser charges aimed at us: first decision a listed mech shows charging with its aim within 0.25 rad of us
      if (Array.isArray(obs.mechs) && w && nav) for (const m of obs.mechs) {
        if (!m || m.kind !== 'mech' || !m.charging) { if (m) seenCharge.delete(m.id); continue }
        if (seenCharge.has(m.id)) continue
        const bx = me.x - m.pos[0], by = me.y - m.pos[1], yawTo = Math.atan2(by, bx)
        let dyaw = Math.abs(((m.aim[0] - yawTo + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
        if (dyaw > 0.25) continue
        seenCharge.set(m.id, t)
        tot.charges++
        const mz = m.pos[2] + 7 * (1 + 0.05 * (m.cubes || 0))
        let best = Infinity
        for (const r of [2, 3, 4, 5, 6, 8, 10, 12]) {
          for (let k = 0; k < 16 && best === Infinity; k++) {
            const ang = k * Math.PI / 8, x = me.x + r * Math.cos(ang), y = me.y + r * Math.sin(ang)
            if (!nav.passableAt(x, y) || !nav.walkLine(me.x, me.y, x, y)) continue
            const z = nav.levelAt(x, y)
            if (!w.shotClear(m.pos[0], m.pos[1], mz, x, y, z + me.height * 0.5)) best = r
          }
          if (best < Infinity) break
        }
        const kk = best === Infinity ? 'none' : String(best)
        tot.shadowAt[kk] = (tot.shadowAt[kk] || 0) + 1
        if (best < Infinity && tReach(best + 1.5, me.walk) <= 0.65) tot.reach.walk++
        if (best < Infinity && tReach(best + 1.5, me.boostSpeed) <= 0.65) tot.reach.boost++
      }
      a.tick = obs.tick; return a } })
  const r = await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  tot.matches++
  tot.life += lastT
}
const pct = (x) => (100 * x / Math.max(1, tot.all)).toFixed(1) + '%'
console.log(`${TAG} squad seeds ${from}-${to}: ${tot.matches} matches, mean life ${(tot.life / tot.matches).toFixed(1)} s, kills ${tot.kills}`)
console.log(`damage taken ${tot.all.toFixed(0)} total; by weapon: ` + Object.entries(tot.byW).map(([k, v]) => `${k} ${v.toFixed(0)} (${pct(v)})`).join(', '))
console.log(`rear hits: ${tot.rear.toFixed(0)} (${pct(tot.rear)} of damage taken)`)
console.log('gun / laser damage by shooter range band: ' + Object.entries(tot.byBand).sort().map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '))
console.log(`laser beams fired at us ${tot.beamsAtUs}, laser hits on us ${tot.beamHits}; time in D4 beamhide ${tot.beamhide.toFixed(1)} s; laser held ${(100 * tot.laserHeldT / Math.max(1, tot.life)).toFixed(0)}% of life`)
console.log(`laser charges aimed at us (first flag): ${tot.charges}; nearest shadow cell (m): ` + Object.entries(tot.shadowAt).sort().map(([k, v]) => `${k}:${v}`).join(' ') +
  `; reachable before release: walking ${tot.reach.walk} (${(100 * tot.reach.walk / Math.max(1, tot.charges)).toFixed(0)}%), boosting ${tot.reach.boost} (${(100 * tot.reach.boost / Math.max(1, tot.charges)).toFixed(0)}%)`)
