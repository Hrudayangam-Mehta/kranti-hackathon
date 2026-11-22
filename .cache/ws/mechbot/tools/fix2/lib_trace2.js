// Review helper: run one simulator match with our brain and collect a per-decision trace.
import { makeContext, playMatch } from '../../sim/run.js'
const LIBD = process.env.BRAIN_LIB || new URL('../../bot/lib', import.meta.url).pathname
const { Nav } = await import(LIBD + '/nav.js')
const { createBrain } = await import(LIBD + '/brain.js')

let ctx = null, nav = null
export function getCtx() { if (!ctx) ctx = makeContext({ quiet: true }); return ctx }

export async function runTrace(seed, { overrides, mode = 'squad', logBrain = false, hook = null } = {}) {
  const c = getCtx()
  const rows = []
  const brainLogs = []
  let brainRef = null
  function teamFactory() {
    let brain = null
    return {
      name: 'ours', errors: 0, lates: 0, n: 0, sumMs: 0, maxMs: 0,
      hello(h) {
        const mc = h.config.mech
        if (!nav) nav = new Nav(c.world, { cell: 2, stepUp: mc.step_up ?? 1.2, maxSlopeDeg: mc.max_slope_deg ?? 50 })
        nav.setBody(mc.radius, mc.height)
        brain = createBrain(h, { world: c.world, nav, log: (...a) => { brainLogs.push(a.join(' ')); if (logBrain) console.log('[brain]', ...a) } }, overrides)
        brainRef = brain
        return { type: 'ready', name: 'ours' }
      },
      act(obs) {
        const a = brain.act(obs, performance.now() + 27)
        a.tick = obs.tick
        const B = brain._B, me = B.me, tg = B.target
        const evs = obs.events || []
        const ev = evs.filter((e) => e.type !== 'pickup').map((e) => e.type === 'damaged' ? `D${Math.round(e.amount)}${e.weapon[0]}${e.by ?? 'z'}${e.rear ? 'R' : ''}` : e.type === 'hit' ? `H${Math.round(e.amount)}>${e.target}` : e.type === 'kill' ? `KILL${e.target}` : e.type).join(' ')
        const row = {
          t: obs.t, x: me.x, y: me.y, z: me.z, hp: Math.round(me.hp), hpf: me.hpf, en: Math.round(me.energy), mode: B.mode, leg: B.legKind, st: B.stance, env: B.env,
          tgt: tg ? tg.id : -1, td: tg ? Math.round(tg.dist) : -1, thp: tg ? Math.round(tg.hp) : -1, tlos: tg ? (tg.losOut ? 'o' : '-') + (tg.losIn ? 'i' : '-') + (tg.listed ? 'L' : '-') : '',
          tLosOut: !!(tg && tg.losOut), tListed: !!(tg && tg.listed),
          A: Math.round(B.A), n1: B.n1, nLos: B.nLos, hide: B.hide.state, hd: Math.round(B.hide.dist || 0), hx: B.hide.x, hy: B.hide.y,
          zm: B.zoneMargin === Infinity ? 'inf' : B.zoneMargin.toFixed(0), zmN: B.zoneMargin,
          mx: a.move[0], my: a.move[1], boostB: !!a.boost,
          mv: [a.move[0].toFixed(2), a.move[1].toFixed(2)].join(','), boost: a.boost ? 'B' : '-', fire: (a.fire[0] ? 'G' : '-') + (a.fire[1] ? 'X' : '-') + (a.reload ? 'r' : '-'),
          f0: !!a.fire[0], f1: !!a.fire[1], aimYaw: a.aim[0], aimPitch: a.aim[1], yaw: me.yaw,
          aim: B.aimKind, spd: me.speed, sp: me.speed.toFixed(1), ammo: me.gun ? me.gun.ammo : -1, cd: me.gun ? me.gun.cooldown : -1, reload: me.gun ? me.gun.reload : 0,
          w1: me.weapons[1] ? me.weapons[1].kind[0] + (me.weapons[1].charge || 0).toFixed(1) : '-', w1kind: me.weapons[1] ? me.weapons[1].kind : '',
          nm: obs.mechs.filter((m) => m.kind === 'mech').length, cubes: me.cubes, ev, evs, inZone: me.inZone, hold: B.holdFire, goal: B.hasGoal ? [B.goalX, B.goalY] : null,
          losInAge: obs.t - B.lastLosInT, zone: obs.zone, alive: obs.alive, mechs: obs.mechs, nearest: B.nearestMech ? B.nearestMech.dist : -1,
          loot: B.loot ? B.loot.type : '', take: a.take, drop: a.drop, pick: a.pick, offer: obs.offer,
        }
        if (hook) hook(row, obs, a, B)
        rows.push(row)
        return a
      },
    }
  }
  const rec = await playMatch(seed, { mode, keep: false }, c, { team: teamFactory, opponents: [] })
  return { rows, rec, brainLogs, brain: brainRef }
}

export function fmtRow(r) {
  return `${r.t.toFixed(1).padStart(6)} hp${String(r.hp).padStart(4)} e${String(r.en).padStart(3)} ${r.mode.padEnd(9)} ${String(r.leg).padEnd(10)} ${r.st.slice(0, 4)} tgt${String(r.tgt).padStart(3)} d${String(r.td).padStart(4)} thp${String(r.thp).padStart(5)} ${r.tlos.padEnd(3)} A${String(r.A).padStart(4)} n1=${r.n1} nL=${r.nLos} nm=${r.nm} hide=${r.hide.padEnd(5)}${String(r.hd).padStart(4)} zm${String(r.zm).padStart(4)} mv${r.mv.padStart(11)}${r.boost} sp${r.sp.padStart(5)} ${r.fire} ${String(r.aim).padEnd(8)} am${String(r.ammo).padStart(2)} ${r.w1} c${r.cubes} ${r.ev}`
}
