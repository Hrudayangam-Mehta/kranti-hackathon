// check2a: rule 4 in the dev simulator (real physics / vision / bullets): a standing exact-lead gun mech opens fire on us.
import { brainBot, runScenario, scripted, leadAim, env } from '../review_tactics/scen.js'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { rng32 } = await import(P + '/tools/arena_micro.js')
const { world, nav } = env()
function spot(seed, dLo, dHi) {
  const rnd = rng32(seed), Bd = world.bounds
  for (let k = 0; k < 300000; k++) {
    const x = Bd.minX + 120 + rnd() * (Bd.maxX - Bd.minX - 240), y = Bd.minY + 120 + rnd() * (Bd.maxY - Bd.minY - 240)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
    const wd = nav.wallDistAt(x, y)
    if (!(wd >= 3 && wd <= 6)) continue
    const a = rnd() * 2 * Math.PI, d = dLo + rnd() * (dHi - dLo), ex = x + d * Math.cos(a), ey = y + d * Math.sin(a)
    if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
    if (!world.shotClear(x, y, z + 7, ex, ey, ez + 4.5) || !world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || !world.canSee(x, y, z + 8, ex, ey, ez + 6)) continue
    return { x, y, ex, ey }
  }
}
const shooter = () => scripted('mech', (obs) => { const t = obs.mechs.find((m) => m.id === 0); return t ? { move: [0, 0], aim: leadAim(obs, t), fire: [true, false] } : { move: [0, 0], aim: [0, 0] } })
const out = []
for (const sd of [401, 402, 403, 404, 405]) {
  const sp = spot(sd, 110, 150)
  const res = {}
  for (const [name, ov] of [['on', { env: 'ffa' }], ['off', { env: 'ffa', select: { ffaRules: 'off' } }]]) {
    const ours = brainBot(ov, null, (obs) => { obs.alive = 12 })
    const r = runScenario({ bots: [ours, shooter()], seed: sd, maxT: 30, place: [{ x: sp.x, y: sp.y, yaw: Math.atan2(sp.ey - sp.y, sp.ex - sp.x) }, { x: sp.ex, y: sp.ey, yaw: Math.atan2(sp.y - sp.ey, sp.x - sp.ex) }] })
    let brk = 0, t0 = -1, tEnd = -1, unseen = 0, maxUnseen = 0, sx = sp.x, sy = sp.y, maxRel = 0, fired = 0
    const B = ours.brain._B
    for (const row of ours.rows) {
      const vis = row.lastLosInAge <= 0.2
      if (vis) { sx = row.x; sy = row.y; unseen = 0 } else { unseen += 0.1; maxUnseen = Math.max(maxUnseen, unseen) }
      if (row.mode === 'DISENGAGE' && row.st !== 'LAST') { }
    }
    // re-derive break state from the brain counters + rows: ffaBreak is not in the row, use mode + debug counter
    res[name] = { breaks: ours.brain.debugState().ffaBreaks, modes: ours.rows.reduce((o, q) => { o[q.mode] = (o[q.mode] || 0) + 1; return o }, {}), maxUnseen: +maxUnseen.toFixed(1), alive: r.res.mechs[0].alive, hp: r.res.mechs[0].hp, enemyHp: r.res.mechs[1].hp, enemyAlive: r.res.mechs[1].alive }
  }
  out.push(`spot ${sd} (${Math.hypot(sp.ex - sp.x, sp.ey - sp.y).toFixed(0)} m): on ${JSON.stringify(res.on)} | off ${JSON.stringify(res.off)}`)
}
console.log(out.join('\n'))
