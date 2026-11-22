// Layers 6 and 7 on top of the layer 1-5 machinery. Nothing here is a new system: these are goal-cell and
// timing policies (corner ambush M2, relocation M3 / M10, bastion last stand), the stance parameter sets, the
// SQUAD / FFA environment counters and the torso veto of the channel arbitration.

import { MODE, STANCES } from './params.js'
import { zoneSlack } from './senses.js'
import { bandFor } from './tactics.js'

const BOLD = { DEFENSIVE: 0, OPPORTUNIST: 1, OFFENSIVE: 2 }

export function makeStance(B, mover, hideSearch) {
  const P = B.P
  let F = 0, Q = 0, ffa = P.env === 'ffa', prevAlive = -1, foreignDeaths = 0, qPairT = -9, q3 = false, q100 = false
  const victims = new Set(), pendDeaths = [], killCredit = []
  let killsSeen = 0
  let wantStance = '', wantSince = 0, holdUntil = -1, n1ZeroSince = 0
  const amb = { on: false, t0: -9, ex: 0, ey: 0, eta: 99, planT: -9, stallSince: -1, lastD: 0 }
  const esc = { ok: false, x: 0, y: 0, t: -9 }

  // ------------------------------------------------------------------ environment (D12)
  /**
   * FFA latch: (16 - alive) - ourKills >= 3 (deaths we did not cause), counted only for t < 200 s. Optional
   * second clue (preset beamClue, off): a beam by another mech that ends within 6 m of a third mech which then
   * loses hp, twice. Never unlatches. When in doubt, SQUAD.
   */
  let beamHits = 0, alive0 = -1
  const gunless = new Set()
  const beamPend = []
  function environment(obs) {
    const me = B.me, t = me.t
    const alive = obs && Number.isInteger(obs.alive) && obs.alive >= 0 && obs.alive <= 64 ? obs.alive : -1
    if (alive >= 0) prevAlive = alive
    // the match starts with cfg.match.mechs (16) alive; the first count we see is the base (same thing in a real match)
    if (alive >= 0 && alive0 < 0) alive0 = Math.min(alive, (B.cfg.match && B.cfg.match.mechs) || 16)
    if (alive >= 0 && t < P.ffaLatchT) {
      foreignDeaths = Math.max(foreignDeaths, (alive0 - alive) - B.ourKills.size)
      F = foreignDeaths
    }
    if (P.beamClue) {
      const beams = obs && Array.isArray(obs.beams) ? obs.beams : []
      for (let k = 0; k < Math.min(beams.length, 16); k++) {
        const b = beams[k]
        if (!b || typeof b !== 'object' || b.by === me.id || !Array.isArray(b.path) || b.path.length < 2) continue
        const e = b.path[b.path.length - 1]
        if (!Array.isArray(e) || !Number.isFinite(e[0]) || !Number.isFinite(e[1])) continue
        for (let i = 0; i < B.trackList.length; i++) {
          const tr = B.trackList[i]
          if (tr.npc || !tr.listed || tr.id === b.by) continue
          if (Math.hypot(tr.x - e[0], tr.y - e[1]) < 6) { beamPend.push({ id: tr.id, hp: tr.hp, t }); break }
        }
      }
      for (let i = beamPend.length - 1; i >= 0; i--) {
        const p = beamPend[i], tr = B.tracks.get(p.id)
        if (tr && tr.hp < p.hp - 1 && t - tr.lastDmgOutT > 0.6) { beamHits++; victims.add(p.id); beamPend.splice(i, 1) }
        else if (t - p.t > 1.0 || beamPend.length > 8) beamPend.splice(i, 1)
      }
      Q = beamHits
    }
    // optional clue (preset gunlessClue, off; R2 change 6): house bots always carry a gun
    if (P.gunlessClue) for (let i = 0; i < B.trackList.length; i++) { const tr = B.trackList[i]; if (!tr.npc && tr.listed && !tr.phantom && !tr.hasGun) gunless.add(tr.id) }
    const gl = P.gunlessClue && (gunless.size >= 2 || (gunless.size >= 1 && foreignDeaths >= 1))
    if (P.env === 'auto' && !ffa && (gl || (t < P.ffaLatchT && (foreignDeaths >= P.ffaLatchDeaths || (P.beamClue && beamHits >= 2))))) {
      ffa = true; B.ffaLatchT = t
      B.log(`env: FFA latched at t=${t.toFixed(1)} foreign deaths=${foreignDeaths} beam clues=${beamHits}`)
    }
    if (P.env === 'squad') ffa = false
    if (P.env === 'ffa') ffa = true
    B.env = ffa ? 'FFA' : 'SQUAD'
  }

  // ------------------------------------------------------------------ stance (playbook A)
  function advantage() {
    const me = B.me
    let p = Infinity
    for (let i = 0; i < B.trackList.length; i++) {
      const tr = B.trackList[i]
      if (tr.npc || !(tr.a > 0) || B.me.t - tr.losInT > 2) continue
      const v = me.hp * tr.b / (Math.max(1, tr.hp) * tr.a)
      if (v < p) p = v
    }
    return p
  }
  function chooseStance() {
    const me = B.me, t = me.t, tgt = B.target, A = B.A, n1 = B.n1
    if (n1 > 0) n1ZeroSince = t
    const Padv = advantage()
    B.Padv = Padv
    // LAST-STAND only from the D3-compatible rule in decideMode (under 25% with >= 2 attackers and no cover, final shrink)
    const enterLS = B.doomed
    if (B.stance === 'LAST-STAND') { if (t - n1ZeroSince >= 3 && !enterLS) setStance(ffa ? 'DEFENSIVE' : 'OPPORTUNIST', t) ; else return }
    if (enterLS) { setStance('LAST-STAND', t); return }
    const unseen = tgt ? t - tgt.lastSeen : 0
    const defensive = me.hpf < 0.5 || n1 >= 2 || Padv < 1 || unseen > 4 || B.zoneMargin < 4
    let want = 'DEFENSIVE'
    if (!defensive) {
      if (!ffa) {
        // SQUAD: healthy and at most one hunter on us -> shoot first, kills are the score
        if (me.hpf >= 0.7 && n1 <= 1) want = 'OPPORTUNIST'
        let alone = true
        if (tgt) for (let i = 0; i < B.trackList.length; i++) { const o = B.trackList[i]; if (o !== tgt && !o.npc && o.conf > 0.3 && Math.hypot(o.x - tgt.x, o.y - tgt.y) < 100) alone = false }
        if (me.hpf >= 0.75 && n1 <= 1 && tgt && tgt.finishable && Padv >= 1.5 && alone && !(A > 0 && me.hp / A < 6)) want = 'OFFENSIVE'
      } else if (tgt && me.hpf >= 0.7 && n1 <= 1) {
        // FFA: only a weak, unaware, isolated mech is worth opening on
        let others = false
        for (let i = 0; i < B.trackList.length; i++) { const o = B.trackList[i]; if (o !== tgt && !o.npc && o.conf > 0.3 && o.dist < 100) others = true }
        if (tgt.hp <= 0.35 * tgt.maxHp && tgt.dist <= 140 && !tgt.aimAtMe && !others) want = 'OPPORTUNIST'
        const alive = prevAlive > 0 ? prevAlive : 16
        const need = alive >= 9 ? 1.85 : alive >= 5 ? 1.6 : alive === 4 ? 1.35 : alive === 3 ? 1.25 : 1.0
        if (me.hpf >= 0.75 && Padv >= need && Padv < Infinity && !others && (alive <= 4 || B.killSecure)) want = 'OFFENSIVE'
      }
      // FFA counter advice (counters_hookup.md step 5): avoid -> DEFENSIVE; attack -> OFFENSIVE when healthy and alone
      const adv = ffa && tgt && !tgt.npc && B.cx ? B.cx.adviceFor(tgt.id, B.cxCtx) : null
      if (adv && adv.active && adv.engageLevel === 0) want = 'DEFENSIVE'
      else if (adv && adv.active && adv.engageLevel === 3 && !defensive && n1 <= 1) want = 'OFFENSIVE'
    }
    const cur = B.stance
    if (want === cur) { wantStance = ''; return }
    if (BOLD[want] < BOLD[cur]) {
      // falling back is immediate, except that a bolder stance is held for its minimum time unless a hard rule fires
      if (t >= holdUntil || defensive) setStance(want, t)
      return
    }
    if (wantStance !== want) { wantStance = want; wantSince = t }
    if (t - wantSince >= P.stanceUp) { setStance(want, t); holdUntil = t + P.stanceHold }
  }
  function setStance(s, t) {
    if (B.stance === s) return
    B.stance = s; wantStance = ''
    B.counters.stanceSwitches = (B.counters.stanceSwitches || 0) + 1
  }
  function applyStance() {
    const s = STANCES[B.stance] || STANCES.OPPORTUNIST, eff = B.eff
    // D2: the range band follows the loadout (presets in params.js); stances no longer change it
    const bd = bandFor(B)
    eff.rLo = bd.lo; eff.rHi = bd.hi; eff.rPref = bd.hold
    eff.loot = s.loot
    B.idleWait = ffa || !P.idlePull ? Infinity : P.idlePullS
    B.lastStand = B.stance === 'LAST-STAND'
    // first-shot policy: in FFA a DEFENSIVE bot stays silent unless the target knows about us or is nearly dead
    const tgt = B.target
    B.holdFirst = !!(ffa && B.stance === 'DEFENSIVE' && tgt && !tgt.aimAtMe && B.me.t - tgt.lastDmgInT > 3 && tgt.hp > 300 && !(tgt.rearOn && B.me.t - tgt.lastDmgOutT < 4))
    if (ffa && tgt && !tgt.npc && B.cx) {
      const adv = B.cx.adviceFor(tgt.id, B.cxCtx)
      if (adv.active && adv.engageLevel <= 1 && !tgt.hostile && !(P.ffaRules && (tgt.finishable || tgt.hp <= P.ffaFinishHpf * tgt.maxHp))) B.holdFirst = true
    }
    if (B.holdFirst && !B.killSecure) B.holdFire = true
    // the old survival veto (M10) is replaced by the D3 LOSING rule
    B.mustDisengage = false
  }

  function update(obs) {
    environment(obs)
    chooseStance()
    applyStance()
  }

  // ------------------------------------------------------------------ SQUAD idle pull (M4)
  function idleLegs() {
    const me = B.me, t = me.t, e = B.lastEnemy
    if (!e || me.hpf < P.idlePullHpf || t - B.lastLosInT < B.idleWait || t - e.t > 150) return false
    if (B.mode !== MODE.HOLD) return false
    const d = Math.hypot(e.x - me.x, e.y - me.y)
    if (d < 45) { e.t = -999; return false }          // arrived and nobody is there
    if (zoneSlack(B, e.x, e.y, t + d / me.walk + 15) < 5) return false
    mover.moveTo(e.x, e.y, 1, 35)
    B.lookHint = true; B.lookX = e.x; B.lookY = e.y
    B.legKind = 'pull'
    return true
  }

  // ------------------------------------------------------------------ corner ambush (M2)
  function ambushUpdate() {
    const me = B.me, t = me.t, tgt = B.target, nav = B.nav, w = B.world
    const can = !!(tgt && nav && w && tgt.listed && !tgt.npc && !tgt.losOut && !tgt.losIn && t - B.lastLosInT > 0.3 && me.hpf >= P.ambushHpf &&
      B.nLos === 0 && B.n120 <= 1 && !tgt.hasMortar && B.mode === MODE.FIGHT && !B.lastStand)
    if (!can) { amb.on = false; return false }
    if (!amb.on) { amb.on = true; amb.t0 = t; amb.planT = -9; amb.stallSince = -1; amb.lastD = tgt.dist; amb.eta = 99 }
    // where will it come into view: first point of its path to us that has a clear line to where we stand
    if (t - amb.planT >= 1.0 && B.planTick !== B.tick) {
      amb.planT = t; B.planTick = B.tick; B.counters.plans++
      const r = nav.findPath(tgt.x, tgt.y, me.x, me.y, { maxExpand: P.pathExpand })
      amb.eta = 99
      if (r && r.pts && r.pts.length > 1) {
        let acc = 0, found = false
        const mz = me.z + me.muzzleH
        for (let k = 1; k < r.pts.length && !found; k++) {
          const ax = r.pts[k - 1][0], ay = r.pts[k - 1][1], bx = r.pts[k][0], by = r.pts[k][1], seg = Math.hypot(bx - ax, by - ay)
          const steps = Math.min(12, Math.max(1, Math.ceil(seg / 4)))
          for (let s = 1; s <= steps; s++) {
            const x = ax + (bx - ax) * s / steps, y = ay + (by - ay) * s / steps
            if (w.shotClear(me.x, me.y, mz, x, y, nav.levelAt(x, y) + tgt.height * 0.5)) { amb.ex = x; amb.ey = y; amb.eta = (acc + seg * s / steps) / Math.max(4, Math.hypot(tgt.vx, tgt.vy)); found = true; break }
          }
          acc += seg
        }
      }
    } else if (amb.eta < 90) amb.eta = Math.max(0, amb.eta - me.dt)
    // abort: the pursuer stalls for 3 s
    if (tgt.dist < amb.lastD - 0.3) { amb.stallSince = -1; amb.lastD = tgt.dist } else if (amb.stallSince < 0) amb.stallSince = t
    if ((amb.stallSince >= 0 && t - amb.stallSince > P.ambushStallS) || t - amb.t0 > 12 || amb.eta >= 99) { amb.on = false; return false }
    return true
  }

  /** FIGHT legs override. Returns true when the legs were set here. */
  function fightLegs() {
    const me = B.me, t = me.t, tgt = B.target
    if (B.lastStand) return false                    // last stand: the normal stand-off legs with the strafe (no bastion stop)
    if (ambushUpdate()) {
      // stand 45-55 m from the corner, still, torso pre-aimed just off the wall edge; charge the laser on its ETA
      const d = Math.hypot(amb.ex - me.x, amb.ey - me.y)
      B.legKind = 'ambush'
      if (d < P.ambushRun - 5 && amb.eta > 1.5) { if (!mover.standoff(amb.ex, amb.ey, P.ambushRun, false, false)) { B.cmd.mx = 0; B.cmd.my = 0 } }
      else { B.cmd.mx = 0; B.cmd.my = 0 }
      B.lookHint = true; B.lookX = amb.ex; B.lookY = amb.ey; B.ambushAim = true
      B.peekSoon = amb.eta <= 0.8
      B.counters.ambushTicks = (B.counters.ambushTicks || 0) + 1
      return true
    }
    return false
  }

  /** M10 continuation: once hidden, keep going >= 60 m to a cell that is still hidden, away from the enemy centroid. */
  function escapeLegs() {
    const me = B.me, t = me.t, nav = B.nav
    if (!nav || !B.world || B.mode !== MODE.DISENGAGE || t - B.lastLosInT < 1.0) { esc.ok = false; return false }
    if (!esc.ok || t - esc.t > 6) {
      esc.t = t; esc.ok = false
      let cx = 0, cy = 0, n = 0
      for (let i = 0; i < B.trackList.length; i++) { const tr = B.trackList[i]; if (!tr.npc && tr.conf > 0.25) { cx += tr.x; cy += tr.y; n++ } }
      if (n === 0) return false
      cx /= n; cy /= n
      const comp = nav.component(me.x, me.y)
      let best = Math.hypot(me.x - cx, me.y - cy) + 20
      for (let k = 0; k < 12; k++) for (let r = 60; r <= 80; r += 20) {
        const a = k * Math.PI / 6, x = me.x + r * Math.cos(a), y = me.y + r * Math.sin(a)
        if (!nav.passableAt(x, y) || (comp >= 0 && nav.component(x, y) !== comp)) continue
        if (zoneSlack(B, x, y, t + r / me.walk + P.healZoneS) < 3) continue
        const d = Math.hypot(x - cx, y - cy)
        if (d <= best || !hideSearch.hidden(x, y, nav.levelAt(x, y))) continue
        best = d; esc.x = x; esc.y = y; esc.ok = true
      }
    }
    if (!esc.ok || mover.isAbandoned(esc.x, esc.y)) return false
    if (Math.hypot(esc.x - me.x, esc.y - me.y) < 2) return false
    mover.moveTo(esc.x, esc.y, 1, 1.5)
    B.legKind = 'escape'; B.hidePhase = true
    return true
  }

  return { update, idleLegs, fightLegs, escapeLegs, F: () => F, Q: () => Q, ambush: amb }
}
