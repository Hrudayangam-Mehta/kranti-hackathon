// Fable trunk, engineer S (architecture.md section 3, coach_spec.md M-B): survival and fire rhythm, four default-off presets.
// Every rule acts only in the SQUAD posture behind hunt.firewall() (no foreign death, next radius > zoneLateR, more than
// 3 alive); live() is computed once per decision in pre(). With every sv preset off brain.js never creates this module
// (B.sv stays undefined), so each hook below is a no-op and the build is the CH1 build.
//
//   svDrop  'first' (hp < 90%) / 'first100' (hp < 100%)  FB4: the supply drop as a second life. The nearest drop within
//           svDropR m (straight line), inside the next zone, landed or landing at most svDropEarlyS after our arrival, not
//           about to be completed by another holder. Latched until captured / gone / svDropStallS after landing without our
//           progress. Written as B.dl = { capture: true } so decideMode puts DROP above everything but an urgent zone move;
//           legs walk to the centre (boost beyond svDropBoostR with energy above svDropBoostE), stand within svDropStopR;
//           torso and triggers stay on the current target (firecontrol is mode-blind).
//   svRegen 'hold'  FB5: regen clock B.regen = { at, running, lost, hold } from me.lastDealtT / me.lastHurtT and the mech's
//           own regen delay / rate (obs.self.stats, else hello.config.mech). Hold fire (gun, laser start, lightning,
//           mortar; not a crate shot: crate hits did not reset regen on the measured build) and reload to full when no
//           line has been on us for svHoldQuietS, hp < svHoldHpf, no finish in reach and the last hit on us is older than
//           svHoldHurtS; release at svHoldExitHpf, after svHoldMaxS, the decision a line opens, or when a finish comes
//           into reach. No leg change.
//   svFire  'rhythm'  magazine rhythm on top of the legacy reload rules: reload when no mech is in view and the magazine is
//           at or below svRlLowFrac, after svRlMidS quiet at or below svRlMidFrac, after svRlTopS quiet whenever not full;
//           never while the target has a line (either way) or while a crate is being shot. The lethal partial laser
//           release is CH1 R1 (focus 'kill', firecontrol killNow with fkRelK), reused unchanged.
//   svFarm  'laser'  FB7: one full beam on a crate with a line within svCbR m (svCbNearR if a mech was seen in the last
//           svCbMechS) when no mech has been shootable for svCbQuietS, there is no target, our laser is ready, and regen
//           is not running (or hp >= svCbRegenHpf). The gun stays silent for that crate (firecontrol HF3 branch).
//
// Rules for this file: P.* is read live; B.rng() is never called; every hook method returns its neutral value when not live.
import { MODE } from './params.js'

export function makeSurvive(B, hunt, mover, hideSearch, econ) {
  const P = B.P, C = B.counters
  const inc = (k) => { C[k] = (C[k] || 0) + 1 }
  B.regen = { at: 0, running: false, lost: 0, hold: false }
  B.dropGo = false
  const st = {
    live: false,
    mechInView: false, lastShootableT: -99, lastMechSeenT: -99,
    // svDrop
    dropId: -1, landT: -1, latchT: -99, myDl: null, ignore: new Map(), dropDist: Infinity,
    // svRegen
    holdOn: false, holdT0: -99, holdEndT: -99, coolUntil: -99,
    // svFarm
    cb: null, cbT: -99, cbLastT: -99, cbScanT: -99,
  }
  const CBN = 4, candD = new Float64Array(CBN), candC = new Array(CBN).fill(null)
  const cbObj = { id: -1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: 1.4, height: 2.4, revs: 0, steadySince: -99, airborne: false }
  const live = () => st.live

  // ------------------------------------------------------------------ HB4: assess stage, before selectTarget
  function pre(obs) {
    const me = B.me, t = me.t
    st.live = B.env !== 'FFA' && hunt.firewall()
    // mechs in view / shootable (lines from assess), the last time a mech was listed
    let inView = false, shoot = false
    const g = me.gun, lz = me.laser
    const reach = Math.max(g ? g.range * P.gunRangeFrac : 0, lz ? lz.range * P.laserRangeFrac : 0)
    for (let k = 0; k < B.trackList.length; k++) {
      const tr = B.trackList[k]
      if (tr.npc || tr.hp <= 0) continue
      if (tr.lastSeen > st.lastMechSeenT && !tr.phantom) st.lastMechSeenT = tr.lastSeen
      if (!tr.listed || tr.phantom) continue
      inView = true
      if (tr.losOut && tr.dist <= reach) shoot = true
    }
    st.mechInView = inView
    if (shoot) st.lastShootableT = t
    // our captures (the drop event goes to the capturer only)
    if (st.dropId >= 0 && Array.isArray(obs && obs.events)) for (const e of obs.events) if (e && e.type === 'drop') { inc('svDropCap'); st.dropId = -1; st.landT = -1 }
    regenClock()
  }

  /** B.regen: next regen start from our last dealt / taken damage and the mech's own delay; lost = hp a reset costs. */
  function regenClock() {
    const me = B.me, t = me.t, R = B.regen
    R.at = Math.max(me.lastDealtT, me.lastHurtT) + me.regenDelay
    R.lost = me.regenPerS * me.regenDelay
    R.running = me.inZone && me.hp < me.maxHp && t >= R.at
  }

  // ------------------------------------------------------------------ HB6: econ stage, after econ.update()
  function post() {
    dropUpdate()
    holdUpdate()
  }

  // ---- svDrop (FB4)
  const findDrop = (id) => { for (let k = 0; k < B.drops.length; k++) if (B.drops[k].id === id) return B.drops[k]; return null }
  function inNext(d) {
    const z = B.zone
    return !z.known || Math.hypot(d.x - z.nx, d.y - z.ny) <= z.nr
  }
  /** Seconds until we stand at the ring centre (walk speed, the economy's path estimate); tRing: at its edge. */
  function pathTo(d) { const me = B.me; return econ && econ.pathEst ? econ.pathEst(d.x, d.y) : Math.hypot(d.x - me.x, d.y - me.y) }
  const tArrive = (d) => pathTo(d) / Math.max(1, B.me.walk)
  const tRing = (d) => Math.max(0, pathTo(d) - d.radius) / Math.max(1, B.me.walk)
  function dropUpdate() {
    if (st.myDl && B.dl === st.myDl) B.dl = null                       // our flag of the last decision (dropLife off never resets B.dl)
    st.myDl = null; B.dropGo = false; st.dropDist = Infinity
    if (P.svDropOn !== true || !st.live || B.lastStand) { st.dropId = -1; st.landT = -1; return }
    const me = B.me, t = me.t
    let d = st.dropId >= 0 ? findDrop(st.dropId) : null
    if (st.dropId >= 0) {
      // latch: until captured (event, see pre) / gone / out of the next zone / another holder finishing first / stalled after landing
      let drop = !d || !inNext(d)
      if (d && !drop) {
        if (d.landsIn <= 0 && st.landT < 0) st.landT = t
        const ours = d.holder === me.id && d.progress > 0
        if (st.landT >= 0 && t - st.landT > P.svDropStallS && !ours) { drop = true; inc('svDropStall') }
        else if (d.holder >= 0 && d.holder !== me.id && d.captureS - d.progress <= tRing(d)) { drop = true; inc('svDropLost') }
      }
      if (drop) { if (d) st.ignore.set(d.id, t); st.dropId = -1; st.landT = -1; d = null }
    }
    if (!d && me.hp < P.svDropHpf * me.maxHp) {
      let best = null, bd = Infinity
      for (let k = 0; k < B.drops.length; k++) {
        const c = B.drops[k]
        const ig = st.ignore.get(c.id)
        if (ig !== undefined && t - ig < P.svDropIgnoreS) continue
        const dist = Math.hypot(c.x - me.x, c.y - me.y)
        if (dist > P.svDropR || dist >= bd || !inNext(c)) continue
        if (c.landsIn > tArrive(c) + P.svDropEarlyS) continue               // more than svDropEarlyS of waiting in the ring
        if (c.holder >= 0 && c.holder !== me.id && c.captureS - c.progress <= tRing(c)) continue   // its holder finishes first
        best = c; bd = dist
      }
      if (best) { d = best; st.dropId = best.id; st.landT = best.landsIn <= 0 ? t : -1; st.latchT = t; inc('svDropLatch') }
    }
    if (!d) return
    const dist = Math.hypot(d.x - me.x, d.y - me.y)
    st.dropDist = dist
    st.myDl = { sv: true, id: d.id, x: d.x, y: d.y, radius: d.radius, dist, landsIn: d.landsIn, capture: true, go: false, goIdle: false }
    B.dl = st.myDl
    B.dropGo = true
    inc('svDropGo')
    if (dist <= P.svDropStopR) inc('svDropIn')
    if (d.holder === me.id && d.progress > 0) inc('svDropHold')
  }
  /** HE3 (economy.chooseDrop, end): while our drop is latched the legacy drop task stands down. */
  function dropWant() {
    if (st.myDl && B.dl === st.myDl && st.live) B.dropTask = null
  }
  /** HE3b (economy.dropLegs, first line): DROP legs for our drop; false = the legacy legs. */
  function dropLegs() {
    const dl = st.myDl
    if (!dl || B.dl !== dl || !st.live) return false
    const me = B.me, cmd = B.cmd
    const d = Math.hypot(dl.x - me.x, dl.y - me.y)
    if (d > P.svDropStopR) mover.moveTo(dl.x, dl.y, 1, P.svDropStopR)
    else { cmd.mx = 0; cmd.my = 0; B.goalX = dl.x; B.goalY = dl.y; B.hasGoal = true }
    B.lookHint = !B.target; B.lookX = dl.x; B.lookY = dl.y
    return true
  }
  /** HB12 (brain.legs, after boostCharge): boost to our drop beyond svDropBoostR with energy above svDropBoostE. */
  function boost() {
    const dl = st.myDl
    if (!dl || B.dl !== dl || !st.live || B.mode !== MODE.DROP) return
    const me = B.me, cmd = B.cmd
    if (cmd.boost || !me.grounded || B.rush || B.fkWalk || Math.hypot(cmd.mx, cmd.my) < 0.05) return
    if (Math.hypot(dl.x - me.x, dl.y - me.y) > P.svDropBoostR && me.energy > P.svDropBoostE) { cmd.boost = true; inc('svDropBoost') }
  }

  // ---- svRegen (FB5)
  function finishInReach() {
    if (B.killSecure || B.finishing) return true
    const tg = B.target
    if (!tg || tg.npc) return false
    if (tg.finishable === true) return true
    return tg.losOut === true && hunt.ttk(tg) <= P.svFinS
  }
  function holdUpdate() {
    const R = B.regen
    if (P.svRegenOn !== true || !st.live) { st.holdOn = false; R.hold = false; return }
    const me = B.me, t = me.t
    const lineNow = B.lastLosInT >= t || me.lastHurtT >= t
    if (st.holdOn) {
      if (lineNow) { st.holdOn = false; inc('svHoldEndLine') }
      else if (me.hpf >= P.svHoldExitHpf) { st.holdOn = false; inc('svHoldEndHp') }
      else if (finishInReach()) { st.holdOn = false; inc('svHoldEndFin') }
      else if (t - st.holdT0 >= P.svHoldMaxS) { st.holdOn = false; st.coolUntil = t + P.svHoldCoolS; inc('svHoldEndTime') }
      if (!st.holdOn) st.holdEndT = t
    } else if (t >= st.coolUntil && t - B.lastLosInT >= P.svHoldQuietS && me.hpf < P.svHoldHpf && t - me.lastHurtT > P.svHoldHurtS && !finishInReach()) {
      st.holdOn = true; st.holdT0 = t; inc('svHold')
    }
    R.hold = st.holdOn
    if (st.holdOn) inc('svHoldDec')
  }
  /** HF1 (firecontrol.run): hold fire while the regen hold is on, except for a crate shot with no target. */
  function holdFire() {
    if (!st.holdOn || !st.live || P.svRegenOn !== true) return false
    return !!B.target || !B.shootCrate
  }

  // ---- svFire 'rhythm' (and the regen hold's reload to full)
  /** HF2 (firecontrol.run, after the legacy reload block): returns the reload command. */
  function reloadWant(r, g, crate) {
    if (r || !st.live || !g || g.reload > 0 || g.ammo >= g.mag) return r
    if (P.svRegenOn === true && st.holdOn) { inc('svHoldReload'); return true }
    if (P.svFireOn !== true || crate) return r
    const me = B.me, t = me.t, tg = B.target
    if (tg && (tg.losOut || tg.losIn)) return r
    const quiet = t - Math.max(B.lastLosInT, me.lastShotT, me.lastHurtT)
    if (!st.mechInView && g.ammo <= Math.floor(g.mag * P.svRlLowFrac + 1e-9)) { inc('svRlLow'); return true }
    if (quiet >= P.svRlMidS && g.ammo <= Math.floor(g.mag * P.svRlMidFrac + 1e-9)) { inc('svRlMid'); return true }
    if (quiet >= P.svRlTopS) { inc('svRlTop'); return true }
    return r
  }

  // ---- svFarm 'laser' (FB7)
  /** HF3 (firecontrol.run, no target, no hold): the crate for one full beam, or null. */
  function crateShot(lz) {
    if (P.svFarmOn !== true || !st.live || !lz) { st.cb = null; return null }
    const me = B.me, t = me.t
    if (B.noCharge || B.mode === MODE.ZONE || (B.dropGo && st.dropDist > P.svDropStopR)) { if (st.cb && lz.charge > 0) inc('svCbAbort'); st.cb = null; return null }
    if (st.cb) {
      // keep our crate while the beam charges; a decision that went elsewhere (a target took the torso) or a beam that
      // already left ends it
      const c = B.crates.get(st.cb.id)
      if (!c || c.hp <= 0 || t - st.cbT > P.svCbMaxS || t - st.cbLastT > 0.15 || t - st.lastShootableT < P.svCbQuietS || (lz.charge <= 0 && lz.cooldown > P.readyCd + 0.01)) { if (lz.charge > 0) inc('svCbAbort'); st.cb = null }
      else { st.cbLastT = t; return st.cb }
    }
    if (lz.charge > 0 || lz.cooldown > P.readyCd + 0.01) return null           // a charge of another rule, or not ready
    if (t - st.lastShootableT < P.svCbQuietS) return null
    if (B.regen.running && me.hpf < P.svCbRegenHpf) return null
    if (t - st.cbScanT < 0.2) return null
    st.cbScanT = t
    const w = B.world, R = Math.min(t - st.lastMechSeenT <= P.svCbMechS ? P.svCbNearR : P.svCbR, lz.range * P.laserRangeFrac)
    const mz = me.z + me.muzzleH, ch = (B.cfg.crates && B.cfg.crates.height) || 2.4, cr = (B.cfg.crates && B.cfg.crates.radius) || 1.4
    // the nearest CBN crates in reach (seen within svCbMemS), nearest first, the first with a clear line (map geometry) wins
    let n = 0
    for (const c of B.crates.values()) {
      if (t - c.seen > P.svCbMemS || !(c.hp >= P.svCbMinHp)) continue         // crates are static: our memory (forget() drops broken ones in view)
      const d = Math.hypot(c.x - me.x, c.y - me.y, c.z + ch * 0.5 - mz)
      if (d > R) continue
      let i = Math.min(n, CBN - 1)
      if (n === CBN && d >= candD[CBN - 1]) continue
      while (i > 0 && candD[i - 1] > d) { candD[i] = candD[i - 1]; candC[i] = candC[i - 1]; i-- }
      candD[i] = d; candC[i] = c
      if (n < CBN) n++
    }
    let best = null
    for (let i = 0; i < n && !best; i++) {
      const c = candC[i]
      if (!w || w.shotClear(me.x, me.y, mz, c.x, c.y, c.z + ch * 0.5)) best = c
    }
    for (let i = 0; i < n; i++) candC[i] = null
    if (!best) return null
    cbObj.id = best.id; cbObj.x = best.x; cbObj.y = best.y; cbObj.z = best.z; cbObj.radius = cr; cbObj.height = ch
    st.cb = cbObj; st.cbT = t; st.cbLastT = t
    inc('svCbStart')
    return st.cb
  }
  /** HF3: the beam left (firecontrol released the laser on our crate). */
  function crateFired() { if (st.cb) { inc('svCbBeam'); st.cb = null } }

  // ------------------------------------------------------------------ hooks reserved for later rules (neutral)
  function retreatLegs() { return false }        // HB10: FB2 reposition cell (not in this module yet)
  function holdLegs() { return false }           // HB11: idle legs (no rule yet: the regen hold never moves the legs)
  function grabWant() { }                        // HE2: FB6 grab (not in this module yet)

  return { live, pre, post, holdFire, reloadWant, crateShot, crateFired, dropWant, dropLegs, boost, retreatLegs, holdLegs, grabWant, state: st }
}
