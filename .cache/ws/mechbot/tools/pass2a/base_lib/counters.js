// FFA counter module: per-mech behaviour features over exponential windows of observed time, an archetype
// read with hysteresis, and counter advice expressed as plain numbers. Self-contained: no imports, no clock,
// no randomness, no per-tick allocation once warm (fixed slots indexed by mech id; debugState allocates).
//
//   createCounters(hello, params) -> { update(obs, t), archetypeOf(id), adviceFor(id, ctx), threatRank(ctx), debugState() }
//
// Inert outside FFA: adviceFor returns neutral advice and threatRank an empty list unless ctx.env === 'FFA'.
// update() and archetypeOf() run in both postures (they never touch the brain), so the read is warm at the latch.
// Evidence tags in the comments: S1-S4 = notes/showdown_profiles.md sources, [AB] top_A-bot_LLC_scorpion.md,
// [AT] top_AT_and_BobBuildIt.md, [BD] top_BackwardsDeployeds.md, [IL] top_ImagineLosing.md, [KY] top_Kanyaraasi.md,
// [MH] top_Mahalas.md, [WV] top_Wolverines.md, [TT] top_tigerbyte_TigerTown27.md, [D11] DOCTRINE V4 D11.

export const ARCHETYPES = Object.freeze(['UNKNOWN', 'LASER_KITER', 'LIGHTNING_CLOSER', 'GUN_STRAFER', 'BOOST_RUSHER', 'HIDER', 'FARMER'])
export const ENGAGE = Object.freeze(['avoid', 'respond-only', 'opportunistic', 'attack'])
const UNK = 0, LK = 1, LZ = 2, GS = 3, BR = 4, HD = 5, FM = 6, NA = 7

export const COUNTER_PARAMS = {
  // ---------------------------------------------------------------- bookkeeping
  maxId: 64,               // mech ids are 0-15 (protocol); slots up to 63 tolerate odd configs (capped below the NPC ids, 100)
  tau: 8,                  // s of observed time: e-folding length of every share / mean window
  tauLong: 30,             // s: second, long window for the hider's stillness and boost shares (a trait, not a phase)
  stepS: 0.1,              // one decision; credited on first sight and on re-appearance after a gap
  gapS: 0.35,              // a listing gap longer than this is not one continuous observation
  rangeMax: 300,           // ranges beyond this are not "held" ranges (vision 200 m + 5 s memory)
  closeR: 250,             // closing speeds are measured toward mechs inside this range
  aimR: 230,               // aim-at-a-mech counts inside gun range (230 m)
  lootR: 170, lootMinR: 3, // crate / drone aim inside drone farming range (170 m [WV][KY])
  aimUsRad: 0.21,          // 12 deg: D0's hostile-aim cone
  aimMechRad: 0.2,         // torso on a mech
  aimLootRad: 0.15,        // torso on a crate / drone (a crate at 30 m subtends about 0.05 rad)
  facingCos: 0.5,          // within 60 deg of us = facing us ([IL] C1 abort angle)
  awayCos: -0.17,          // more than 100 deg off us = rear arc toward us ([AT] A2, [BD] C4, [KY] 3)
  awayCosGs: 0.26,         // more than 75 deg off us: outside its attention ([WV] C2)
  walkSpeed: 11.7,         // fallback when hello lacks mech.walk_speed
  boostFrac: 1.3,          // boosting = speed above 1.3 x walk (two servos give 1.17 x; boost is 1.67 x)
  stillSpeed: 1.5,         // stationary (a strafe reversal spends about 0.05 s below this)
  slowSpeed: 5.0,          // silent walking (sound.step_speed); hiders creep at 4.6-4.9 m/s [BD][IL][KY]
  airVz: 2.5,              // |vz| above this = airborne (walking a 10 deg slope gives 2 m/s)
  airDz: 1.0,              // with params.ground: feet this far above the terrain = airborne
  latFrac: 0.6, latMinSpeed: 6,   // moving mostly sideways to the line to its nearest foe = strafing
  revMinLat: 3,            // a sideways reversal needs 3 m/s of sideways speed on both sides
  beamUsR: 8,              // a laser beam ending this close to us was aimed at us
  reactS: 2.5,             // window after our hit in which its reaction is read
  reactMoveM: 8,           // range change in that window that counts as advance / retreat
  busyS: 1.5,              // aimed at another mech this recently = busy with someone else
  hostileS: 4,             // D0: damaged us in the last 4 s = hostile
  closeNearR: 90,          // closing read inside 90 m (laser holders rush only from here [BD][AT])
  closeMidR: 150,          // and inside 150 m (lightning without laser closes from any range [WV][KY])
  evMinS: 0.2, evFullS: 0.8, revMinS: 0.3,   // s of samples before a conditional mean counts / counts fully
  chargeMinS: 0.05, chargeMaxS: 4,            // a charging-flag episode outside this is noise / a held discharge
  emaAlpha: 0.3,           // beam length and flag duration means
  spinMax: 20, hpTrendMax: 5, bandMax: 400,   // sanitising caps (rad/s, hp fraction per s, m)

  // ---------------------------------------------------------------- classification
  minObsS: 1.0,            // no read before 1 s of observation
  holdS: 3.0,              // a label changes only after the new candidate was best for 3 s of observation
  minScore: 0.5,           // best archetype score needed for a candidate
  margin: 0.15,            // best minus second best needed for a candidate (else UNKNOWN)
  confObsFull: 8,          // s of observation for full confidence
  confBase: 0.6, confMarginFull: 0.45,   // confidence = score x (base + (1 - base) x observation ramp) x (base + ... margin ramp)
  staleS: 10, staleTau: 30,// confidence decays after 10 s unseen

  // LASER_KITER: laser held, nearest foe held beyond ~100 m, walking pace, not rushing in. Kiters hold 95-125 m
  // [WV][KY] (laser), 110 m [BD], 100-165 m [IL], 125-185 m [AB], ~100 m [TT], 100-200 m [AT: BobBuildIt]; AT beams
  // median 99 m [AT]; lightning closers sit at 13-43 m. Winners boost 7-14% of the time [S1].
  lkR0: 80, lkR1: 110, lkBoost0: 0.2, lkBoost1: 0.35, lkClose0: 3, lkClose1: 7,
  lkFarm0: 0.12, lkFarm1: 0.35, lkFarmCut: 0.7, lkEvidence: 0.45,   // a laser holder that never charges or aims stays below minScore
  // LIGHTNING_CLOSER: lightning held and closing on its foe (8.7 m/s walking, 14.5 boosting [WV][KY]; +9.8 to +13.1 m/s
  // [AT]; ~9 m/s [BD]) or holding inside 45-70 m (28 m band [WV][KY][BD], 30 m [MH], arcs at 22-42 m [AT]).
  // Closing is read inside 150 m without a laser (that family always goes to 28 m), inside 90 m with one (laser +
  // lightning kiters approach their 110 m band and only rush inside 60 m [BD]).
  lzClose0: 2.5, lzClose1: 6, lzNear0: 45, lzNear1: 70, lzUsed: 0.8, lzFarmCut: 0.5,
  // GUN_STRAFER: gun without laser, torso on a mech or firing on us, sideways movement with reversals. Reversal gaps:
  // 1.4 s mean [WV], 1.0 s median [KY], 0.75 s [IL], 0.45-0.95 s [MH], 0.7 s [AT], 0.9 s [AT: BobBuildIt],
  // 0.35-0.9 s [TT]; settles 55-85 m [WV], 70-140 m [AT: BobBuildIt], 80 m [IL], 55 m [MH].
  gsAimMech0: 0.3, gsAimMech1: 0.6, gsAimUs0: 0.25, gsAimUs1: 0.5, gsRev0: 0.15, gsRev1: 0.45, gsRevW0: 0.3, gsRevW1: 1.0,
  gsLat0: 0.5, gsLat1: 0.8, gsLatW: 0.75, gsBoost0: 0.3, gsBoost1: 0.5, gsBoostCut: 0.5,
  gsR0: 30, gsR1: 50, gsRfar0: 180, gsRfar1: 230, gsRUnknown: 0.5, gsClose0: 4, gsClose1: 8,
  // BOOST_RUSHER: no laser, no lightning, boosting a large share of the time while closing on a mech. 314159265
  // boosts 41% and lives 36 s [S4]; bottom half 25% mean, max 67%; winners 11% [S1].
  brBoost0: 0.2, brBoost1: 0.35, brClose0: 3, brClose1: 8,
  // HIDER: stationary or creeping, torso not on mechs, not shooting us, few cubes. Bob the builder stands still 74%
  // with 9.5 cubes [S4]; Mahalas waits 14 s in a nook [MH]; Wolverines ae1b122 holds fire [WV]; tigerbyte motionless
  // tens of seconds [TT].
  hdStill0: 0.3, hdStill1: 0.5, hdSlow0: 0.4, hdSlow1: 0.65,   // a 14 s wait + 5 s hop cycle bottoms out at a 0.49 share
  hdStillL0: 0.45, hdStillL1: 0.65, hdSlowL0: 0.5, hdSlowL1: 0.7,   // long window (30 s): such hiders stay above 0.67
  hdAim0: 0.25, hdAim1: 0.5, hdBoost0: 0.1, hdBoost1: 0.25,
  hdCube0: 8, hdCube1: 12, hdFarm0: 0.1, hdFarm1: 0.25, hdChg0: 0.05, hdChg1: 0.15, hdHostileS: 10, hdHostileMul: 0.2,
  // FARMER: torso on crates / drones, or cubes climbing fast, while not fighting. AT shoots loot 19% of idle time,
  // BobBuildIt 35% [AT]; farming pose 38 m from a drone / 30 m from a crate [WV][KY]; winners 7 cubes/min, places 2-4
  // 3/min, bottom half 1.5/min [S1].
  fmLoot0: 0.12, fmLoot1: 0.35, fmRate0: 3, fmRate1: 7, fmMinGain: 2, fmRateW: 0.85, fmRateMinS: 30,
  fmAimUs0: 0.3, fmAimUs1: 0.6, fmAimMech0: 0.35, fmAimMech1: 0.6,

  // ---------------------------------------------------------------- advice: bounded-loss blend
  confFloor: 0.35, confFull: 0.85, blendMax: 0.9,   // weight = blendMax x ramp(confidence, floor, full)
  raiseMinW: 0.6,          // a bolder engage level than neutral needs weight >= 0.6 (a wrong attack costs more)
  breakLosMinW: 0.25,      // breaking line of sight is cheap: allowed from weight 0.25
  attackMinHpf: 0.6,       // never 'attack' below 60% hp
  multMin: 0.4, multMax: 2.0,
  neutralDodge: 0.5, neutralLevel: 2,               // neutral = the brain's own rules ('opportunistic')
  neutralGunLo: 55, neutralGunHi: 95, neutralLaserLo: 125, neutralLaserHi: 185, neutralLightLo: 0, neutralLightHi: 45,  // D2
  // LASER_KITER: fight only from cover or as third party; duck its charge [D11][AB C2][BD C2][IL C2][KY 4]. With a laser:
  // full beams from 150-190 m [AT B1] (winners keep 187 m from the nearest mech [S1]); without: stay beyond its 200 m
  // vision (gun duels beyond 130 m lose [D2]; A-bot hides from a laser it cannot answer [AB]). Third party when it is
  // busy and under half hp [D11], or busy with its back to us and we hold a laser [AT A3][BD C4][KY 1].
  lkLoLaser: 150, lkHiLaser: 200, lkLoNoLaser: 200, lkHiNoLaser: 280, lkMult: 0.7, lkDodge: 0.9,
  lkThirdLo: 100, lkThirdHi: 190, lkThirdMult: 1.3, lkThirdWoundMult: 1.5, lkThirdHpf: 0.5, lkMyHpf: 0.55,
  // LIGHTNING_CLOSER: keep 65 m+ along cover, shoot while backing [D11][BD C1 65-80 m][WV C6][KY 2]; brawl only with
  // lightning, at least its hp and energy [AT A5].
  lzLo: 65, lzHi: 95, lzMult: 1.1, lzDodge: 0.7, lzBrawlLo: 25, lzBrawlHi: 45, lzBrawlMult: 1.2, lzBrawlEnergy: 60, lzBrawlHpf: 0.6, lzBrawlDodge: 0.6,
  // GUN_STRAFER: do not trade in the open; break sight (9 s [WV C7][KY 2]); third-party it from 60-150 m when it is busy
  // and looking away (largest measured-model gain [WV C2][KY 1][IL C1]).
  gsLoLaser: 150, gsHiLaser: 200, gsLo: 130, gsHi: 200, gsMult: 0.8, gsDodge: 0.8,
  gsThirdLo: 60, gsThirdHi: 150, gsThirdMult: 1.5, gsMyHpf: 0.55,
  // BOOST_RUSHER: corner ambush facing the approach, do not run [D11][S4: no energy on arrival, gun only].
  brLo: 30, brHi: 160, brMult: 1.3, brDodge: 0.6,
  // HIDER: pass wide (120 m: tigerbyte opened at 83 m [TT T2], A-bot's 120 m bubble [AB C1]; D11 says 55 m), out-farm it;
  // harvest a confirmed non-returner while 7-14 are alive [WV C1]; finish it when wounded or late [D11][MH K4].
  hdLo: 120, hdHi: 280, hdMult: 0.5, hdDodge: 0.4,
  hdHarvestLo: 150, hdHarvestHi: 190, hdHarvestMult: 1.3, hdHarvestReacts: 2, hdHarvestAliveLo: 7, hdHarvestAliveHi: 14, hdHarvestHpf: 0.7,
  hdLateLo: 90, hdLateHi: 200, hdLateMult: 1.2, hdWoundHpf: 0.5, hdLateAlive: 4,
  // FARMER: strike from 140-200 m (beyond the 140 m charge sound) when its torso is away and we hold a laser [KY 3][AT A2][WV C3].
  fmLo: 140, fmHi: 200, fmMult: 0.9, fmDodge: 0.6, fmStrikeMult: 1.3, fmStrikeHpf: 0.7,

  // ---------------------------------------------------------------- threat rank (FFA only)
  rankMaxAge: 5, rankDist: 120,
  rankLaser: 0.5, rankLaserR: 280, rankLight: 0.7, rankLightR: 90, rankGun: 0.2, rankGunR: 230, rankMortar: 0.2, rankMortarR: 235,
  rankAim: 1.5, rankCharge: 2.0, rankHurt: 1.8, rankHurtS: 3, rankBusy: 0.6, rankFirst: 1.2, rankCube: 0.04, rankCubeCap: 10, rankHpBase: 0.5,
  rankArch: [1, 1.4, 1.5, 1.2, 1.3, 0.5, 0.8],
}

// --------------------------------------------------------------------------------------------- helpers
const isArr = Array.isArray
const BIG = 1e6
const num = (v) => typeof v === 'number' && v === v && v > -BIG && v < BIG
const fin = (v, d) => (num(v) ? v : d)
function vec(a, n) {
  if (!isArr(a) || a.length < n) return false
  for (let i = 0; i < n; i++) if (!num(a[i])) return false
  return true
}
function ramp(x, a, b) {
  if (!(x === x)) return 0
  if (a < b) return x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a)
  return x >= a ? 0 : x <= b ? 1 : (a - x) / (a - b)
}
function wrapPi(a) {
  if (a > Math.PI || a < -Math.PI) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; a -= Math.PI }
  return a
}
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

function newSlot(id) {
  return {
    id, seen: false, listed: false, dead: false, firstT: -1, lastT: -1, obsS: 0, lastDt: -1, lastDec: 1,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, speed: 0, hp: 1400, maxHp: 1400, hpf: 1,
    cubes: 0, cubes0: -1, cubesMax: 0, cubeGain: 0,
    gun: true, laser: false, lightning: false, mortar: false, everLaser: false, everLightning: false,
    // live geometry (latest observation)
    dUs: 1e9, aimDot: 0, dFoe: 1e9, aimUsNow: false, aimMechNow: false, busyT: -99, busyId: -1,
    // exponential windows: w = observed time; s* = time-weighted shares
    w: 0, sBoost: 0, sAir: 0, sStill: 0, sSlow: 0, sAimUs: 0, sAimMech: 0, sAimLoot: 0, sCharge: 0, spinN: 0,
    wL: 0, sStillL: 0, sSlowL: 0, sBoostL: 0, lastDecL: 1,
    rUsN: 0, rUsD: 0, rOthN: 0, rOthD: 0, rFoeN: 0, rFoeD: 0,
    clUsN: 0, clUsD: 0, clMaxN: 0, clMaxD: 0, cl90N: 0, cl90D: 0, cl150N: 0, cl150D: 0,
    latN: 0, latD: 0, revN: 0, revD: 0, latSign: 0, latRef: -2,
    hpTrN: 0, hpTrD: 0, prevYaw: 0, prevHpf: 1,
    // laser charging episodes and beams
    chargeOn: false, chargeT0: -99, nChargeStart: 0, nCharge: 0, nChargeAtUs: 0, chargeDurE: 0, chRN: 0, chRD: 0,
    nLaserBeam: 0, laserBeamR: 0, nLaserAtUs: 0, nLightBeam: 0, lightBeamR: 0, lastBeamT: -99,
    // interactions with us
    dmgToUs: 0, dmgUsGun: 0, dmgUsLaser: 0, dmgUsLight: 0, firstDmgT: -1, lastDmgUsT: -99, firedFirst: false,
    ourFirstHitT: -1, lastHitByUsT: -99, weHitFirst: false,
    reactOpen: false, reactT0: 0, reactR0: 0, reactRet: false, nReact: 0, nReturned: 0, nRetreated: 0, nAdvanced: 0, nVanished: 0,
    // read
    scores: new Float64Array(NA), label: UNK, pend: -1, pendObs: 0, cand: UNK, conf: 0, best: 0, second: 0,
    read: { id, archetype: 'UNKNOWN', confidence: 0, candidate: 'UNKNOWN', obsS: 0 },
    adv: newAdvice(id),
    rank: { id, score: 0, archetype: 'UNKNOWN', confidence: 0 },
  }
}
function newAdvice(id) {
  return { id, active: false, archetype: 'UNKNOWN', confidence: 0, weight: 0, lo: 0, hi: 0, band: [0, 0],
    engage: 'opportunistic', engageLevel: 2, targetMult: 1, dodgePriority: 0.5, breakLosOnCharge: false, reason: 'N/none' }
}

// --------------------------------------------------------------------------------------------- module
export function createCounters(hello, params) {
  const P = { ...COUNTER_PARAMS }
  if (params && typeof params === 'object' && !isArr(params)) for (const k of Object.keys(params)) { const v = params[k]; if (v !== undefined) P[k] = v }
  const ground = typeof P.ground === 'function' ? P.ground : null
  const cfg = hello && typeof hello === 'object' && hello.config && typeof hello.config === 'object' ? hello.config : {}
  const mcfg = cfg.mech && typeof cfg.mech === 'object' ? cfg.mech : {}
  const walk = clamp(fin(mcfg.walk_speed, P.walkSpeed), 1, 100)
  const boostThr = walk * P.boostFrac
  const maxId = clamp(Math.floor(fin(P.maxId, 64)), 1, 100)
  const cosAimUs = Math.cos(P.aimUsRad), cosAimMech = Math.cos(P.aimMechRad), cosLoot = Math.cos(P.aimLootRad)
  const slots = new Array(maxId).fill(null)

  const me = { id: Number.isInteger(hello && hello.slot) ? hello.slot : -1, ok: false, x: 0, y: 0, z: 0, hp: 1400, hpf: 1, energy: 100,
    gun: true, laser: false, lightning: false }
  let lastT = -1, alive = 16, updates = 0, errors = 0
  // per-tick scratch (no allocation in update)
  const LCAP = 64, OCAP = 128
  const lid = new Int32Array(LCAP), lx = new Float64Array(LCAP), ly = new Float64Array(LCAP), lz = new Float64Array(LCAP)
  const ox = new Float64Array(OCAP), oy = new Float64Array(OCAP)
  let nL = 0, nO = 0
  const RANK = []
  const EMPTY = []
  const NEUTRAL = newAdvice(-1)
  const CT = { lo: 0, hi: 0, level: 2, mult: 1, dodge: 0.5, brk: false, reason: '' }

  const slotOf = (id) => (Number.isInteger(id) && id >= 0 && id < maxId ? slots[id] : null)
  function slotFor(id) {
    if (!Number.isInteger(id) || id < 0 || id >= maxId) return null
    let s = slots[id]
    if (!s) { s = newSlot(id); slots[id] = s }
    return s
  }

  // ------------------------------------------------------------------------------------------- update
  function update(obs, tArg) {
    try { step(obs, tArg) } catch (e) { errors++ }
  }

  function step(obs, tArg) {
    if (!obs || typeof obs !== 'object') return
    updates++
    let t = num(tArg) ? tArg : num(obs.t) ? obs.t : lastT + P.stepS
    if (!(t >= 0)) t = 0
    lastT = t
    if (Number.isInteger(obs.alive) && obs.alive >= 0 && obs.alive <= 256) alive = obs.alive
    // ---- self
    const sf = obs.self && typeof obs.self === 'object' ? obs.self : null
    if (sf) {
      if (Number.isInteger(sf.id)) me.id = sf.id
      if (vec(sf.pos, 3)) { me.x = sf.pos[0]; me.y = sf.pos[1]; me.z = sf.pos[2]; me.ok = true }
      if (num(sf.hp)) me.hp = Math.max(0, sf.hp)
      if (num(sf.max_hp) && sf.max_hp > 0) me.hpf = clamp(me.hp / sf.max_hp, 0, 1)
      if (num(sf.energy)) me.energy = sf.energy
      if (isArr(sf.weapons)) {
        me.gun = me.laser = me.lightning = false
        for (let i = 0; i < Math.min(sf.weapons.length, 4); i++) {
          const w = sf.weapons[i], k = w && typeof w === 'object' ? w.kind : w
          if (k === 'gun') me.gun = true; else if (k === 'laser') me.laser = true; else if (k === 'lightning') me.lightning = true
        }
      }
    }
    // ---- listed mechs and loot positions
    nL = 0; nO = 0
    const ms = isArr(obs.mechs) ? obs.mechs : EMPTY
    const nm = Math.min(ms.length, 96)
    for (let k = 0; k < nm; k++) {
      const m = ms[k]
      if (!m || typeof m !== 'object' || !Number.isInteger(m.id) || !vec(m.pos, 3)) continue
      if (m.kind === 'npc' || m.id >= 100) { if (nO < OCAP) { ox[nO] = m.pos[0]; oy[nO] = m.pos[1]; nO++ } continue }
      if (m.id === me.id || m.id < 0 || m.id >= maxId || nL >= LCAP) continue
      let dup = false
      for (let j = 0; j < nL; j++) if (lid[j] === m.id) { dup = true; break }
      if (dup) continue
      lid[nL] = m.id; lx[nL] = m.pos[0]; ly[nL] = m.pos[1]; lz[nL] = m.pos[2]; nL++
    }
    const cr = isArr(obs.crates) ? obs.crates : EMPTY
    for (let k = 0; k < Math.min(cr.length, 96) && nO < OCAP; k++) {
      const c = cr[k]
      if (c && typeof c === 'object' && vec(c.pos, 2)) { ox[nO] = c.pos[0]; oy[nO] = c.pos[1]; nO++ }
    }
    for (let i = 0; i < maxId; i++) { const s = slots[i]; if (s) s.listed = false }
    for (let k = 0; k < nm; k++) {
      const m = ms[k]
      if (!m || typeof m !== 'object' || !Number.isInteger(m.id) || m.kind === 'npc' || m.id >= 100 || m.id < 0 || m.id === me.id || !vec(m.pos, 3)) continue
      const s = slotFor(m.id)
      if (!s || s.listed) continue
      observe(s, m, t)
    }
    // ---- events
    const ev = isArr(obs.events) ? obs.events : EMPTY
    for (let k = 0; k < Math.min(ev.length, 64); k++) {
      const e = ev[k]
      if (!e || typeof e !== 'object') continue
      if (e.type === 'damaged') {
        const s = e.by !== me.id ? slotFor(e.by) : null
        if (!s) continue
        const a = clamp(fin(e.amount, 0), 0, 1e5)
        s.dmgToUs += a; s.lastDmgUsT = t
        if (e.weapon === 'laser') s.dmgUsLaser += a; else if (e.weapon === 'lightning') s.dmgUsLight += a; else if (e.weapon === 'gun') s.dmgUsGun += a
        if (s.firstDmgT < 0) { s.firstDmgT = t; s.firedFirst = s.ourFirstHitT < 0 }
        if (s.reactOpen) s.reactRet = true
      } else if (e.type === 'hit') {
        const s = slotOf(e.target)
        if (!s || !s.seen) continue
        s.lastHitByUsT = t
        if (s.ourFirstHitT < 0) { s.ourFirstHitT = t; s.weHitFirst = s.firstDmgT < 0 }
        if (!s.reactOpen) { s.reactOpen = true; s.reactT0 = t; s.reactR0 = s.dUs; s.reactRet = false }
      } else if (e.type === 'kill') {
        const s = slotOf(e.target)
        if (s) { s.dead = true; s.reactOpen = false }
      }
    }
    // ---- beams
    const bm = isArr(obs.beams) ? obs.beams : EMPTY
    for (let k = 0; k < Math.min(bm.length, 32); k++) {
      const b = bm[k]
      if (!b || typeof b !== 'object' || b.by === me.id || !isArr(b.path) || b.path.length < 2) continue
      const s = slotOf(b.by)
      if (!s) continue
      const p0 = b.path[0], p1 = b.path[b.path.length - 1]
      if (!vec(p0, 2) || !vec(p1, 2)) continue
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
      s.lastBeamT = t
      if (b.kind === 'laser') {
        s.nLaserBeam++; s.laserBeamR += (len - s.laserBeamR) * (s.nLaserBeam === 1 ? 1 : P.emaAlpha); s.everLaser = true
        if (me.ok && Math.hypot(p1[0] - me.x, p1[1] - me.y) < P.beamUsR) s.nLaserAtUs++
      } else if (b.kind === 'lightning') {
        const q = b.path[1]
        const l1 = vec(q, 2) ? Math.hypot(q[0] - p0[0], q[1] - p0[1]) : len
        s.nLightBeam++; s.lightBeamR += (l1 - s.lightBeamR) * (s.nLightBeam === 1 ? 1 : P.emaAlpha); s.everLightning = true
      }
    }
    // ---- reactions to our hits, then the reads
    for (let i = 0; i < maxId; i++) {
      const s = slots[i]
      if (!s) continue
      if (s.reactOpen && t - s.reactT0 >= P.reactS) {
        s.reactOpen = false; s.nReact++
        if (s.reactRet) s.nReturned++
        if (!s.listed && t - s.lastT > P.gapS) s.nVanished++
        else if (s.reactR0 < 1e8 && s.dUs < 1e8) {
          if (s.dUs - s.reactR0 > P.reactMoveM) s.nRetreated++
          else if (s.reactR0 - s.dUs > P.reactMoveM) s.nAdvanced++
        }
      }
      if (s.listed) classify(s)
    }
  }

  /** Features of one listed mech for this observation. */
  function observe(s, m, t) {
    const first = !s.seen
    let dt = first ? P.stepS : t - s.lastT
    const consecutive = !first && dt > 0 && dt <= P.gapS
    if (!(dt > 0)) dt = 0
    else if (!consecutive) dt = P.stepS
    if (first) { s.seen = true; s.firstT = t }
    s.listed = true; s.lastT = t; s.dead = false
    s.obsS += dt
    let dec = 1, decL = 1
    if (dt > 0) { if (dt !== s.lastDt) { s.lastDt = dt; s.lastDec = Math.exp(-dt / P.tau); s.lastDecL = Math.exp(-dt / P.tauLong) } dec = s.lastDec; decL = s.lastDecL }
    // kinematics
    const x = m.pos[0], y = m.pos[1], z = m.pos[2]
    s.x = x; s.y = y; s.z = z
    if (vec(m.vel, 2)) { s.vx = m.vel[0]; s.vy = m.vel[1]; s.vz = fin(m.vel[2], 0) } else { s.vx = s.vy = s.vz = 0 }
    const vx = s.vx, vy = s.vy, sp = Math.hypot(vx, vy)
    s.speed = sp
    const aimOk = vec(m.aim, 1)
    const yaw = aimOk ? wrapPi(m.aim[0]) : s.yaw
    if (consecutive && dt > 0) s.spinN = s.spinN * dec + Math.min(P.spinMax, Math.abs(wrapPi(yaw - s.prevYaw)) / dt) * dt
    else s.spinN *= dec
    s.prevYaw = yaw; s.yaw = yaw
    const ca = Math.cos(yaw), sa = Math.sin(yaw)
    // weapons, hp, cubes
    if (isArr(m.weapons)) {
      const W = m.weapons, n = Math.min(W.length, 4)
      s.gun = s.laser = s.lightning = s.mortar = false
      for (let i = 0; i < n; i++) { const k = W[i]; if (k === 'gun') s.gun = true; else if (k === 'laser') s.laser = true; else if (k === 'lightning') s.lightning = true; else if (k === 'mortar') s.mortar = true }
      if (s.laser) s.everLaser = true
      if (s.lightning) s.everLightning = true
    }
    if (num(m.max_hp) && m.max_hp > 0) s.maxHp = m.max_hp
    if (num(m.hp)) s.hp = clamp(m.hp, 0, 1e6)
    s.hpf = clamp(s.hp / s.maxHp, 0, 1)
    if (consecutive && dt > 0) { s.hpTrN = s.hpTrN * dec + clamp((s.hpf - s.prevHpf) / dt, -P.hpTrendMax, P.hpTrendMax) * dt; s.hpTrD = s.hpTrD * dec + dt }
    s.prevHpf = s.hpf
    if (num(m.cubes) && m.cubes >= 0) {
      const c = Math.min(1000, Math.floor(m.cubes))
      if (s.cubes0 < 0) s.cubes0 = c
      else if (c > s.cubes) s.cubeGain += c - s.cubes
      s.cubes = c; if (c > s.cubesMax) s.cubesMax = c
    }
    // geometry toward us and the other listed mechs
    let dUs = 1e9, aimDot = 0, clUs = 0
    if (me.ok) {
      const dx = me.x - x, dy = me.y - y
      dUs = Math.hypot(dx, dy) || 0.01
      aimDot = (dx * ca + dy * sa) / dUs
      clUs = (vx * dx + vy * dy) / dUs
    }
    s.dUs = dUs; s.aimDot = aimDot
    let aimUs = me.ok && dUs < P.aimR && aimDot > cosAimUs
    let aimMech = me.ok && dUs < P.aimR && aimDot > cosAimMech, bestCos = aimMech ? aimDot : -2, aimD = aimMech ? dUs : 0, aimId = aimMech ? me.id : -1
    let clMax = me.ok && dUs < P.closeR ? clUs : -1e9
    let dOth = 1e9, fx = me.x, fy = me.y, fid = me.id, dFoe = dUs
    for (let j = 0; j < nL; j++) {
      const oid = lid[j]
      if (oid === s.id) continue
      const dx = lx[j] - x, dy = ly[j] - y, d = Math.hypot(dx, dy) || 0.01
      if (d < dOth) dOth = d
      if (d < dFoe) { dFoe = d; fx = lx[j]; fy = ly[j]; fid = oid }
      if (d < P.aimR) {
        const c = (dx * ca + dy * sa) / d
        if (c > cosAimMech && c > bestCos) { bestCos = c; aimMech = true; aimD = d; aimId = oid }
      }
      if (d < P.closeR) { const c = (vx * dx + vy * dy) / d; if (c > clMax) clMax = c }
    }
    // a crate or drone in the aim cone and nearer than the mech behind it is what the torso is on
    let aimLoot = false
    for (let j = 0; j < nO; j++) {
      const dx = ox[j] - x, dy = oy[j] - y, d = Math.hypot(dx, dy)
      if (d < P.lootMinR || d > P.lootR || (aimMech && d >= aimD)) continue
      if ((dx * ca + dy * sa) / d > cosLoot) { aimLoot = true; break }
    }
    if (aimLoot) { aimMech = false; aimUs = false }
    s.dFoe = dFoe; s.aimUsNow = aimUs; s.aimMechNow = aimMech
    if (aimMech && aimId !== me.id) { s.busyT = t; s.busyId = aimId }
    // windows
    s.w = s.w * dec + dt
    let air = Math.abs(s.vz) > P.airVz
    if (!air && ground) { try { const g = ground(x, y); if (num(g) && z - g > P.airDz) air = true } catch (e) { /* no ground */ } }
    const charging = m.charging === true
    s.sBoost = s.sBoost * dec + (sp > boostThr ? dt : 0)
    s.sAir = s.sAir * dec + (air ? dt : 0)
    s.sStill = s.sStill * dec + (sp < P.stillSpeed ? dt : 0)
    s.sSlow = s.sSlow * dec + (sp < P.slowSpeed ? dt : 0)
    s.wL = s.wL * decL + dt
    s.sStillL = s.sStillL * decL + (sp < P.stillSpeed ? dt : 0)
    s.sSlowL = s.sSlowL * decL + (sp < P.slowSpeed ? dt : 0)
    s.sBoostL = s.sBoostL * decL + (sp > boostThr ? dt : 0)
    s.sAimUs = s.sAimUs * dec + (aimUs ? dt : 0)
    s.sAimMech = s.sAimMech * dec + (aimMech ? dt : 0)
    s.sAimLoot = s.sAimLoot * dec + (aimLoot ? dt : 0)
    s.sCharge = s.sCharge * dec + (charging ? dt : 0)
    if (me.ok && dUs < P.rangeMax) { s.rUsN = s.rUsN * dec + dUs * dt; s.rUsD = s.rUsD * dec + dt } else { s.rUsN *= dec; s.rUsD *= dec }
    if (dOth < P.rangeMax) { s.rOthN = s.rOthN * dec + dOth * dt; s.rOthD = s.rOthD * dec + dt } else { s.rOthN *= dec; s.rOthD *= dec }
    if (dFoe < P.rangeMax) { s.rFoeN = s.rFoeN * dec + dFoe * dt; s.rFoeD = s.rFoeD * dec + dt } else { s.rFoeN *= dec; s.rFoeD *= dec }
    if (me.ok && dUs < P.closeR) { s.clUsN = s.clUsN * dec + clUs * dt; s.clUsD = s.clUsD * dec + dt } else { s.clUsN *= dec; s.clUsD *= dec }
    if (clMax > -1e8) { s.clMaxN = s.clMaxN * dec + clMax * dt; s.clMaxD = s.clMaxD * dec + dt } else { s.clMaxN *= dec; s.clMaxD *= dec }
    let clFoe = 0, ux = 0, uy = 0
    const foeOk = dFoe < P.closeR && (fid !== me.id || me.ok)
    if (foeOk) { ux = (fx - x) / dFoe; uy = (fy - y) / dFoe; clFoe = vx * ux + vy * uy }
    if (foeOk && dFoe < P.closeNearR) { s.cl90N = s.cl90N * dec + clFoe * dt; s.cl90D = s.cl90D * dec + dt } else { s.cl90N *= dec; s.cl90D *= dec }
    if (foeOk && dFoe < P.closeMidR) { s.cl150N = s.cl150N * dec + clFoe * dt; s.cl150D = s.cl150D * dec + dt } else { s.cl150N *= dec; s.cl150D *= dec }
    // sideways movement and reversals relative to the line to the nearest foe
    if (foeOk) {
      const lat = -uy * vx + ux * vy
      s.latN = s.latN * dec + (sp >= P.latMinSpeed && Math.abs(lat) >= P.latFrac * sp ? dt : 0); s.latD = s.latD * dec + dt
      if (fid !== s.latRef || !consecutive) { s.latRef = fid; s.latSign = 0 }
      let flip = 0
      if (Math.abs(lat) > P.revMinLat) {
        const sg = lat > 0 ? 1 : -1
        if (s.latSign !== 0 && sg !== s.latSign) flip = 1
        s.latSign = sg
      }
      s.revN = s.revN * dec + flip; s.revD = s.revD * dec + dt
    } else { s.latN *= dec; s.latD *= dec; s.revN *= dec; s.revD *= dec; s.latRef = -2; s.latSign = 0 }
    // laser charging episodes (flag on-time, range to the mech it aims at)
    if (charging && (!s.chargeOn || !consecutive)) {
      if (!s.chargeOn) { s.nChargeStart++; if (aimUs) s.nChargeAtUs++ }
      s.chargeOn = true; s.chargeT0 = t
      s.everLaser = true
    } else if (!charging && s.chargeOn) {
      const dur = t - s.chargeT0
      if (consecutive && dur >= P.chargeMinS && dur <= P.chargeMaxS) { s.nCharge++; s.chargeDurE += (dur - s.chargeDurE) * (s.nCharge === 1 ? 1 : P.emaAlpha) }
      s.chargeOn = false
    }
    if (charging && aimMech) { s.chRN = s.chRN * dec + aimD * dt; s.chRD = s.chRD * dec + dt } else { s.chRN *= dec; s.chRD *= dec }
  }

  // ------------------------------------------------------------------------------------------- read
  const rate = (n, d, min) => (d >= min ? n / d : -1)
  function features(s) {
    const w = s.w > 1e-9 ? s.w : 1
    F.boost = s.sBoost / w; F.air = s.sAir / w; F.still = s.sStill / w; F.slow = s.sSlow / w
    const wl = s.wL > 1e-9 ? s.wL : 1
    F.stillL = s.sStillL / wl; F.slowL = s.sSlowL / wl; F.boostL = s.sBoostL / wl
    F.aimUs = s.sAimUs / w; F.aimMech = s.sAimMech / w; F.aimLoot = s.sAimLoot / w; F.charge = s.sCharge / w; F.spin = s.spinN / w
    const m0 = P.evMinS, m1 = P.evFullS
    F.rUs = rate(s.rUsN, s.rUsD, m0); F.rOth = rate(s.rOthN, s.rOthD, m0); F.rFoe = rate(s.rFoeN, s.rFoeD, m0)
    F.clUs = s.clUsD >= m0 ? s.clUsN / s.clUsD : 0; F.clMax = s.clMaxD >= m0 ? s.clMaxN / s.clMaxD : 0
    F.cl90 = s.cl90D >= m0 ? s.cl90N / s.cl90D : 0; F.cl90w = ramp(s.cl90D, m0, m1)
    F.cl150 = s.cl150D >= m0 ? s.cl150N / s.cl150D : 0; F.cl150w = ramp(s.cl150D, m0, m1)
    F.lat = s.latD >= m0 ? s.latN / s.latD : 0; F.rev = s.revD >= P.revMinS ? s.revN / s.revD : 0; F.revW = ramp(s.revD, P.gsRevW0, P.gsRevW1)
    F.chR = rate(s.chRN, s.chRD, m0); F.hpTrend = s.hpTrD > m0 ? s.hpTrN / s.hpTrD : 0
    const span = Math.max(P.fmRateMinS, lastT - s.firstT)
    F.cubeRate = s.cubeGain * 60 / span
    return F
  }
  const F = { boost: 0, air: 0, still: 0, slow: 0, stillL: 0, slowL: 0, boostL: 0, aimUs: 0, aimMech: 0, aimLoot: 0, charge: 0, spin: 0, rUs: -1, rOth: -1, rFoe: -1,
    clUs: 0, clMax: 0, cl90: 0, cl90w: 0, cl150: 0, cl150w: 0, lat: 0, rev: 0, revW: 0, chR: -1, hpTrend: 0, cubeRate: 0 }

  function score(s, f, out) {
    const t = lastT
    // LASER_KITER
    let v = 0
    if (s.laser) {
      let R = f.rFoe < 0 ? 0 : ramp(f.rFoe, P.lkR0, P.lkR1)
      if (f.chR >= 0) R = Math.max(R, ramp(f.chR, P.lkR0, P.lkR1))
      if (s.nLaserBeam > 0) R = Math.max(R, ramp(s.laserBeamR, P.lkR0, P.lkR1))
      const C = 1 - ramp(f.boost, P.lkBoost0, P.lkBoost1)
      const N = 1 - ramp(f.cl90, P.lkClose0, P.lkClose1) * f.cl90w
      const E = Math.max(Math.min(1, s.nChargeStart + s.nLaserBeam), ramp(f.aimMech, P.gsAimMech0, P.gsAimMech1))
      const Fm = 1 - P.lkFarmCut * ramp(f.aimLoot, P.lkFarm0, P.lkFarm1)
      v = R * C * N * (P.lkEvidence + (1 - P.lkEvidence) * E) * Fm
    }
    out[LK] = v
    // LIGHTNING_CLOSER
    v = 0
    if (s.lightning) {
      // closing and holding close count only while engaged (torso on a mech, or it has hit us): a lightning holder that
      // walks past, or sits near us with its torso elsewhere, is not closing on anyone
      const eng = Math.max(ramp(f.aimMech, P.gsAimMech0, P.gsAimMech1), s.dmgToUs > 0 ? 1 : 0)
      const cl = s.laser ? f.cl90 : f.cl150, clw = s.laser ? f.cl90w : f.cl150w
      const K = ramp(cl, P.lzClose0, P.lzClose1) * clw * eng
      const Nr = f.rFoe < 0 ? 0 : (1 - ramp(f.rFoe, P.lzNear0, P.lzNear1)) * eng
      const L = s.nLightBeam > 0 || s.dmgUsLight > 0 ? P.lzUsed : 0
      v = Math.max(K, Nr, L) * (1 - P.lzFarmCut * ramp(f.aimLoot, P.fmLoot0, P.fmLoot1))
    }
    out[LZ] = v
    // GUN_STRAFER
    v = 0
    if (s.gun && !s.laser) {
      const Ag = Math.max(ramp(f.aimMech, P.gsAimMech0, P.gsAimMech1), ramp(f.aimUs, P.gsAimUs0, P.gsAimUs1), s.dmgToUs > 0 ? 1 : 0)
      const S = Math.max(ramp(f.rev, P.gsRev0, P.gsRev1) * f.revW, P.gsLatW * ramp(f.lat, P.gsLat0, P.gsLat1))
      const Wk = 1 - P.gsBoostCut * ramp(f.boost, P.gsBoost0, P.gsBoost1)
      const Rg = f.rFoe < 0 ? P.gsRUnknown : ramp(f.rFoe, P.gsR0, P.gsR1) * (1 - ramp(f.rFoe, P.gsRfar0, P.gsRfar1))
      const Nc = 1 - ramp(f.cl90, P.gsClose0, P.gsClose1) * f.cl90w
      v = Ag * S * Wk * Rg * Nc
      if (s.lightning) v *= 1 - out[LZ]           // a lightning carrier that closes is the closer, not the strafer
    }
    out[GS] = v
    // BOOST_RUSHER
    v = 0
    // the boost share must hold on the long window too (314159265 boosts 41% of its whole life [S4]), and a rusher is
    // attacking: torso on a mech or it has hit us
    if (!s.laser && !s.lightning) {
      const eng = Math.max(ramp(f.aimMech, P.gsAimMech0, P.gsAimMech1), s.dmgToUs > 0 ? 1 : 0)
      v = ramp(Math.min(f.boost, f.boostL), P.brBoost0, P.brBoost1) * Math.max(ramp(f.clUs, P.brClose0, P.brClose1), ramp(f.clMax, P.brClose0, P.brClose1)) * eng
    }
    out[BR] = v
    // HIDER
    // stillness must hold on both windows: a mech that is still in one phase of a varied routine is not a hider
    const St = Math.min(Math.max(ramp(f.still, P.hdStill0, P.hdStill1), ramp(f.slow, P.hdSlow0, P.hdSlow1)),
      Math.max(ramp(f.stillL, P.hdStillL0, P.hdStillL1), ramp(f.slowL, P.hdSlowL0, P.hdSlowL1)))
    const Q = (1 - ramp(f.aimMech, P.hdAim0, P.hdAim1)) * (t - s.lastDmgUsT <= P.hdHostileS ? P.hdHostileMul : 1) * (1 - ramp(f.charge, P.hdChg0, P.hdChg1))
    out[HD] = St * Q * (1 - ramp(Math.max(f.boost, f.boostL), P.hdBoost0, P.hdBoost1)) * (1 - ramp(s.cubes, P.hdCube0, P.hdCube1)) * (1 - ramp(f.aimLoot, P.hdFarm0, P.hdFarm1))
    // FARMER
    const Lt = ramp(f.aimLoot, P.fmLoot0, P.fmLoot1)
    const Cr = s.cubeGain >= P.fmMinGain ? P.fmRateW * ramp(f.cubeRate, P.fmRate0, P.fmRate1) : 0
    out[FM] = Math.max(Lt, Cr) * (1 - ramp(f.aimUs, P.fmAimUs0, P.fmAimUs1)) * (1 - ramp(f.aimMech, P.fmAimMech0, P.fmAimMech1))
    out[UNK] = 0
  }

  function classify(s) {
    const f = features(s)
    const sc = s.scores
    score(s, f, sc)
    let b = UNK, bv = 0, sv = 0
    for (let k = 1; k < NA; k++) { const v = sc[k]; if (v > bv) { sv = bv; bv = v; b = k } else if (v > sv) sv = v }
    s.best = bv; s.second = sv
    const cand = s.obsS >= P.minObsS && bv >= P.minScore && bv - sv >= P.margin ? b : UNK
    s.cand = cand
    if (cand === s.label) s.pend = -1
    else if (cand !== s.pend) { s.pend = cand; s.pendObs = s.obsS }
    else if (s.obsS - s.pendObs >= P.holdS - 1e-9) { s.label = cand; s.pend = -1 }
    // live confidence of the held label: its current score, the margin over the others and the observed time
    if (s.label === UNK) s.conf = 0
    else {
      const own = sc[s.label]
      let other = 0
      for (let k = 1; k < NA; k++) if (k !== s.label && sc[k] > other) other = sc[k]
      const b0 = P.confBase
      s.conf = clamp(own, 0, 1) * (b0 + (1 - b0) * ramp(s.obsS, P.minObsS, P.confObsFull)) * (b0 + (1 - b0) * ramp(own - other, P.margin, P.confMarginFull))
    }
  }

  function liveConf(s) {
    if (!s || !s.seen || s.dead || s.label === UNK) return 0
    const age = lastT - s.lastT
    return age <= P.staleS ? s.conf : s.conf * Math.exp(-(age - P.staleS) / P.staleTau)
  }

  function archetypeOf(id) {
    const s = slotOf(id)
    if (!s || !s.seen) return UNKNOWN_READ
    const r = s.read
    r.archetype = ARCHETYPES[s.label]; r.confidence = liveConf(s); r.candidate = ARCHETYPES[s.cand]; r.obsS = s.obsS
    return r
  }
  const UNKNOWN_READ = Object.freeze({ id: -1, archetype: 'UNKNOWN', confidence: 0, candidate: 'UNKNOWN', obsS: 0 })

  // ------------------------------------------------------------------------------------------- advice
  function ctxBool(c, k, d) { const v = c[k]; return typeof v === 'boolean' ? v : d }
  function ctxNum(c, k, d) { const v = c[k]; return num(v) ? v : d }

  function neutralBand(c, out) {
    const laser = ctxBool(c, 'myLaser', me.laser), light = ctxBool(c, 'myLightning', me.lightning), gun = ctxBool(c, 'myGun', me.gun)
    let lo = laser ? P.neutralLaserLo : light && !gun ? P.neutralLightLo : P.neutralGunLo
    let hi = laser ? P.neutralLaserHi : light && !gun ? P.neutralLightHi : P.neutralGunHi
    if (num(c.bandLo) && num(c.bandHi) && c.bandLo >= 0 && c.bandHi >= c.bandLo) { lo = c.bandLo; hi = c.bandHi }
    out.lo = lo; out.hi = hi; out.band[0] = lo; out.band[1] = hi
  }
  function fillNeutral(out, c, id, reason) {
    out.id = Number.isInteger(id) ? id : -1
    out.active = false; out.archetype = 'UNKNOWN'; out.confidence = 0; out.weight = 0
    neutralBand(c, out)
    out.engageLevel = P.neutralLevel; out.engage = ENGAGE[P.neutralLevel]; out.targetMult = 1; out.dodgePriority = P.neutralDodge
    out.breakLosOnCharge = false; out.reason = reason
    return out
  }

  /** Counter advice of the held label into CT, using its live state and ours. */
  function counter(s, c) {
    const t = lastT
    const myLaser = ctxBool(c, 'myLaser', me.laser), myLight = ctxBool(c, 'myLightning', me.lightning)
    const myHpf = clamp(ctxNum(c, 'myHpf', me.hpf), 0, 1), myHp = ctxNum(c, 'myHp', me.hp), myEnergy = ctxNum(c, 'myEnergy', me.energy)
    const nAlive = ctxNum(c, 'alive', alive)
    const busy = t - s.busyT <= P.busyS && s.busyId !== me.id
    const away = s.listed && s.aimDot < P.awayCos
    CT.brk = false
    switch (s.label) {
      case LK: {
        const third = busy && (s.hpf < P.lkThirdHpf || (away && myLaser && myHpf >= P.lkMyHpf))
        if (third) { CT.lo = P.lkThirdLo; CT.hi = P.lkThirdHi; CT.level = 2; CT.mult = s.hpf < P.lkThirdHpf ? P.lkThirdWoundMult : P.lkThirdMult; CT.reason = 'LK/third' }
        else { CT.lo = myLaser ? P.lkLoLaser : P.lkLoNoLaser; CT.hi = myLaser ? P.lkHiLaser : P.lkHiNoLaser; CT.level = 1; CT.mult = P.lkMult; CT.reason = 'LK/cover' }
        CT.dodge = P.lkDodge; CT.brk = true
        break
      }
      case LZ: {
        const brawl = myLight && myHp >= s.hp && myEnergy >= P.lzBrawlEnergy && myHpf >= P.lzBrawlHpf
        if (brawl) { CT.lo = P.lzBrawlLo; CT.hi = P.lzBrawlHi; CT.level = 2; CT.mult = P.lzBrawlMult; CT.dodge = P.lzBrawlDodge; CT.reason = 'LZ/brawl' }
        else { CT.lo = P.lzLo; CT.hi = P.lzHi; CT.level = 1; CT.mult = P.lzMult; CT.dodge = P.lzDodge; CT.reason = 'LZ/keep' }
        CT.brk = s.laser
        break
      }
      case GS: {
        const third = busy && s.listed && s.aimDot < P.awayCosGs && myHpf >= P.gsMyHpf
        if (third) { CT.lo = P.gsThirdLo; CT.hi = P.gsThirdHi; CT.level = 2; CT.mult = P.gsThirdMult; CT.reason = 'GS/third' }
        else { CT.lo = myLaser ? P.gsLoLaser : P.gsLo; CT.hi = myLaser ? P.gsHiLaser : P.gsHi; CT.level = 1; CT.mult = P.gsMult; CT.reason = 'GS/break' }
        CT.dodge = P.gsDodge; CT.brk = s.laser
        break
      }
      case BR:
        CT.lo = P.brLo; CT.hi = P.brHi; CT.level = 3; CT.mult = P.brMult; CT.dodge = P.brDodge; CT.brk = s.laser; CT.reason = 'BR/hold'
        break
      case HD: {
        const harvest = s.nReact >= P.hdHarvestReacts && s.nReturned === 0 && s.dmgToUs === 0 && nAlive >= P.hdHarvestAliveLo && nAlive <= P.hdHarvestAliveHi && myHpf >= P.hdHarvestHpf
        const late = (s.hpf < P.hdWoundHpf && !(s.listed && s.aimDot > P.facingCos)) || nAlive <= P.hdLateAlive
        if (harvest) { CT.lo = P.hdHarvestLo; CT.hi = P.hdHarvestHi; CT.level = 2; CT.mult = P.hdHarvestMult; CT.reason = 'HD/harvest' }
        else if (late) { CT.lo = P.hdLateLo; CT.hi = P.hdLateHi; CT.level = 2; CT.mult = P.hdLateMult; CT.reason = 'HD/late' }
        else { CT.lo = P.hdLo; CT.hi = P.hdHi; CT.level = 0; CT.mult = P.hdMult; CT.reason = 'HD/pass' }
        CT.dodge = P.hdDodge; CT.brk = s.laser
        break
      }
      case FM: {
        const strike = away && myLaser && myHpf >= P.fmStrikeHpf
        CT.lo = P.fmLo; CT.hi = P.fmHi; CT.level = strike ? 2 : 1; CT.mult = strike ? P.fmStrikeMult : P.fmMult; CT.reason = strike ? 'FM/strike' : 'FM/watch'
        CT.dodge = P.fmDodge; CT.brk = s.laser
        break
      }
      default:
        CT.lo = 0; CT.hi = 0; CT.level = P.neutralLevel; CT.mult = 1; CT.dodge = P.neutralDodge; CT.reason = 'N/unknown'
    }
  }

  function adviceFor(id, ctx) {
    const c = ctx && typeof ctx === 'object' ? ctx : NO_CTX
    try {
      if (c.env !== 'FFA') return fillNeutral(NEUTRAL, c, id, 'N/squad')
      const s = slotOf(id)
      if (!s || !s.seen || s.dead) return fillNeutral(NEUTRAL, c, id, 'N/none')
      const out = s.adv
      fillNeutral(out, c, id, 'N/unknown')
      const conf = liveConf(s)
      out.archetype = ARCHETYPES[s.label]; out.confidence = conf
      if (s.label === UNK) return out
      const w = P.blendMax * ramp(conf, P.confFloor, P.confFull)
      out.weight = w
      counter(s, c)
      if (w <= 0) { out.reason = 'N/lowconf'; return out }
      // bounded loss: every number moves from the neutral value toward the counter by the weight
      const nLo = out.lo, nHi = out.hi
      let lo = nLo + w * (CT.lo - nLo), hi = nHi + w * (CT.hi - nHi)
      lo = clamp(lo, 0, P.bandMax); hi = clamp(hi, lo, P.bandMax)
      out.lo = lo; out.hi = hi; out.band[0] = lo; out.band[1] = hi
      let level = P.neutralLevel
      if (CT.level > P.neutralLevel) level = w >= P.raiseMinW ? CT.level : P.neutralLevel
      else if (CT.level < P.neutralLevel) level = P.neutralLevel - Math.round(w * (P.neutralLevel - CT.level))
      // rails: never 'avoid' a mech that is shooting us (D0), never 'attack' when hurt
      if (lastT - s.lastDmgUsT <= P.hostileS && level < 1) level = 1
      if (level === 3 && clamp(ctxNum(c, 'myHpf', me.hpf), 0, 1) < P.attackMinHpf) level = P.neutralLevel
      out.engageLevel = level; out.engage = ENGAGE[level]
      out.targetMult = clamp(1 + w * (CT.mult - 1), P.multMin, P.multMax)
      out.dodgePriority = clamp(P.neutralDodge + w * (CT.dodge - P.neutralDodge), 0, 1)
      out.breakLosOnCharge = CT.brk && w >= P.breakLosMinW
      out.reason = CT.reason
      out.active = true
      return out
    } catch (e) {
      errors++
      return fillNeutral(NEUTRAL, NO_CTX, id, 'N/error')
    }
  }
  const NO_CTX = Object.freeze({})

  // ------------------------------------------------------------------------------------------- threat rank
  function threatRank(ctx) {
    const c = ctx && typeof ctx === 'object' ? ctx : NO_CTX
    RANK.length = 0
    if (c.env !== 'FFA') return RANK
    try {
      const maxAge = ctxNum(c, 'maxAge', P.rankMaxAge), t = lastT
      for (let i = 0; i < maxId; i++) {
        const s = slots[i]
        if (!s || !s.seen || s.dead || t - s.lastT > maxAge) continue
        const d = s.dUs
        let wp = 1
        if (s.laser && d <= P.rankLaserR) wp += P.rankLaser
        if (s.lightning && d <= P.rankLightR) wp += P.rankLight
        if (s.gun && d <= P.rankGunR) wp += P.rankGun
        if (s.mortar && d <= P.rankMortarR) wp += P.rankMortar
        let live = 1
        if (s.listed && s.aimUsNow) live *= s.chargeOn ? P.rankCharge : P.rankAim
        if (t - s.lastDmgUsT <= P.rankHurtS) live *= P.rankHurt
        if (t - s.busyT <= P.busyS && s.busyId !== me.id) live *= P.rankBusy
        if (s.firedFirst) live *= P.rankFirst
        const conf = liveConf(s), wgt = P.blendMax * ramp(conf, P.confFloor, P.confFull)
        const arch = 1 + wgt * ((P.rankArch[s.label] ?? 1) - 1)
        const sc = (1 / (1 + Math.max(0, d) / P.rankDist)) * wp * (1 + P.rankCube * Math.min(s.cubes, P.rankCubeCap)) * (P.rankHpBase + (1 - P.rankHpBase) * s.hpf) * live * arch
        const r = s.rank
        r.score = num(sc) ? sc : 0; r.archetype = ARCHETYPES[s.label]; r.confidence = conf
        // insertion: score descending, id ascending on ties
        let k = RANK.length
        RANK.push(r)
        while (k > 0 && (RANK[k - 1].score < r.score || (RANK[k - 1].score === r.score && RANK[k - 1].id > r.id))) { RANK[k] = RANK[k - 1]; k-- }
        RANK[k] = r
      }
    } catch (e) { errors++; RANK.length = 0 }
    return RANK
  }

  // ------------------------------------------------------------------------------------------- debug
  function debugState() {
    const out = { updates, errors, t: lastT, alive, me: { id: me.id, laser: me.laser, lightning: me.lightning, hpf: me.hpf }, counts: {}, mechs: [] }
    for (const a of ARCHETYPES) out.counts[a] = 0
    for (let i = 0; i < maxId; i++) {
      const s = slots[i]
      if (!s || !s.seen) continue
      const f = features(s)
      out.counts[ARCHETYPES[s.label]]++
      const sc = {}
      for (let k = 1; k < NA; k++) sc[ARCHETYPES[k]] = +s.scores[k].toFixed(3)
      out.mechs.push({
        id: s.id, label: ARCHETYPES[s.label], conf: +liveConf(s).toFixed(3), cand: ARCHETYPES[s.cand], pend: s.pend >= 0 ? ARCHETYPES[s.pend] : null,
        obsS: +s.obsS.toFixed(2), lastT: s.lastT, dead: s.dead, scores: sc,
        weapons: [s.gun ? 'gun' : '', s.laser ? 'laser' : '', s.lightning ? 'lightning' : '', s.mortar ? 'mortar' : ''].filter(Boolean),
        feat: {
          boost: +f.boost.toFixed(3), air: +f.air.toFixed(3), still: +f.still.toFixed(3), slow: +f.slow.toFixed(3), aimUs: +f.aimUs.toFixed(3),
          stillLong: +f.stillL.toFixed(3), slowLong: +f.slowL.toFixed(3), boostLong: +f.boostL.toFixed(3),
          aimMech: +f.aimMech.toFixed(3), aimLoot: +f.aimLoot.toFixed(3), charge: +f.charge.toFixed(3), spin: +f.spin.toFixed(2),
          rUs: +f.rUs.toFixed(1), rOth: +f.rOth.toFixed(1), rFoe: +f.rFoe.toFixed(1), clUs: +f.clUs.toFixed(2), clMax: +f.clMax.toFixed(2),
          cl90: +f.cl90.toFixed(2), cl150: +f.cl150.toFixed(2), lat: +f.lat.toFixed(3), rev: +f.rev.toFixed(3), chR: +f.chR.toFixed(1),
          hpTrend: +f.hpTrend.toFixed(4), cubes: s.cubes, cubeRate: +f.cubeRate.toFixed(2),
          charges: s.nChargeStart, chargeDur: +s.chargeDurE.toFixed(2), laserBeams: s.nLaserBeam, beamR: +s.laserBeamR.toFixed(1), lightBeams: s.nLightBeam,
          dmgToUs: s.dmgToUs, firedFirst: s.firedFirst, weHitFirst: s.weHitFirst,
          reactions: { n: s.nReact, returned: s.nReturned, retreated: s.nRetreated, advanced: s.nAdvanced, vanished: s.nVanished },
        },
      })
    }
    return out
  }

  return { update, archetypeOf, adviceFor, threatRank, debugState, params: P }
}
