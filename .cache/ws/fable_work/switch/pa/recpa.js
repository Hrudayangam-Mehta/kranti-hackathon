// Pause/ambush measurement recorder (read-only on the brain; behaviour only). bun recpa.js <libDir> <seed> <out>
import { writeFileSync } from 'node:fs'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work'
const [lib, a1, out] = process.argv.slice(2)
const { createBrain } = await import(lib + '/brain.js')
const { Nav } = await import(W + '/ref_bot/lib/nav.js')
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
let brain = null
const M = { n: 0, noTgt: 0, noTgtMove: 0, noTgtStill: 0, legsNoTgt: {}, modes: {}, legs: {}, hpNoTgtHi: 0,
  open: [], newLines: [], nLosHist: {}, dmgByLos: {}, fightN: 0, fightMove: 0, standoffN: 0, firstHurtT: -1, firstHitT: -1 }
const posH = [], prevLos = new Map(), pend = []
let prevHp = -1, prevTgt = null
function rec(obs) {
  const a = brain.act(obs, performance.now() + 27.5)
  const B = brain._B, me = B.me, t = me.t, tg = B.target && !B.target.npc ? B.target : null, w = B.world
  M.n++; M.modes[B.mode] = (M.modes[B.mode] || 0) + 1; M.legs[B.legKind] = (M.legs[B.legKind] || 0) + 1
  const sp = Math.hypot(me.vx || 0, me.vy || 0)
  if (!tg) { M.noTgt++; M.legsNoTgt[B.legKind] = (M.legsNoTgt[B.legKind] || 0) + 1; if (sp > 3) M.noTgtMove++; else M.noTgtStill++; if (me.hpf >= 0.6) M.hpNoTgtHi++ }
  else { M.fightN++; if (sp > 3) M.fightMove++; if (B.legKind === 'standoff') M.standoffN++ }
  const nl = Math.min(5, B.nLos | 0)
  M.nLosHist[nl] = (M.nLosHist[nl] || 0) + 1
  if (prevHp >= 0 && me.hp < prevHp) { M.dmgByLos[nl] = (M.dmgByLos[nl] || 0) + (prevHp - me.hp); if (M.firstHurtT < 0) M.firstHurtT = t }
  prevHp = me.hp
  posH.push({ t, x: me.x, y: me.y, z: me.z }); if (posH.length > 40) posH.shift()
  const old = posH[Math.max(0, posH.length - 11)]       // 1.0 s ago
  for (const tr of B.trackList) {
    if (tr.npc) continue
    const was = prevLos.get(tr.id) || { los: false, t: -99, x: tr.x, y: tr.y }
    if (tr.losIn && !was.los && t - was.t > 3) {
      // a new line on us. who opened it? blocked from our position 1 s ago to its position now -> our motion
      let ours = null
      if (w && old) { const tmz = tr.z + (tr.muzzleH || 7); ours = !(w.shotClear(tr.x, tr.y, tmz, old.x, old.y, old.z + 4.5) || w.shotClear(tr.x, tr.y, tmz, old.x, old.y, old.z + 8.5)) }
      const e = { t: +t.toFixed(1), id: tr.id, d: Math.round(tr.dist), leg: B.legKind, mode: B.mode, sp: +sp.toFixed(1), nLosBefore: Math.max(0, (B.nLos | 0) - 1), isTgt: tr === tg, hadTgt: !!prevTgt, ours, hp: +me.hpf.toFixed(2),
        host: !!tr.hostile, dIn0: tr.lastDmgInT, dOut0: tr.lastDmgOutT, fIn: null, fOut: null, hp0: me.hp }
      M.newLines.push(e); pend.push({ e, tr })
    }
    if (tr.losIn) prevLos.set(tr.id, { los: true, t }); else if (was.los) prevLos.set(tr.id, { los: false, t: was.t })
  }
  for (let i = pend.length - 1; i >= 0; i--) {
    const { e, tr } = pend[i]
    if (e.fIn == null && tr.lastDmgInT > e.dIn0 && tr.lastDmgInT >= e.t) e.fIn = +(tr.lastDmgInT - e.t).toFixed(2)
    if (e.fOut == null && tr.lastDmgOutT > e.dOut0 && tr.lastDmgOutT >= e.t) e.fOut = +(tr.lastDmgOutT - e.t).toFixed(2)
    if (t - e.t > 8 || (e.fIn != null && e.fOut != null)) { delete e.dIn0; delete e.dOut0; pend.splice(i, 1) }
  }
  prevTgt = tg
  return a
}
const { makeContext, playMatch } = await import(W + '/sim/run.js')
const ctx = makeContext({ quiet: true })
const team = () => ({ name: 'ours',
  hello(h) { const mc = h.config.mech; const nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height)
    brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
  act(obs) { const a = rec(obs); a.tick = obs.tick; return a } })
const r = await playMatch(+a1, { mode: 'squad' }, ctx, { team, opponents: [] })
for (const p of pend) { delete p.e.dIn0; delete p.e.dOut0 }
const c = brain.debugState().counters || {}
Object.assign(M, { seed: +a1, kills: r.kills, alive: r.timeAlive, cause: r.cause, fuse: c.fuse || 0, errors: c.errors || 0, h50Seek: c.h50Seek || 0, ambushTicks: c.ambushTicks || 0, jinks: c.jinks || 0 })
writeFileSync(out, JSON.stringify(M))
console.log(JSON.stringify({ seed: +a1, kills: r.kills, alive: r.timeAlive, n: M.n, noTgt: M.noTgt, fuse: M.fuse, errors: M.errors }))
