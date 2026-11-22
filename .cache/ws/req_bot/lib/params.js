// Every tunable number of the brain lives here (BRAIN_SPEC_V2, DOCTRINE V4). `createBrain(hello, ctx, overrides)`
// resolves the named presets (SELECT, or `overrides.select`) and then shallow-merges `overrides` over the result,
// so simulator sweeps never have to touch the code and one real submission can change exactly one thing:
// edit one string in SELECT (or one number in PARAMS) and nothing else.
// Physical numbers (speeds, damage, ranges, cooldowns) are NOT here: they are read from hello.config,
// obs.self.stats and obs.self.weapons[i].stats every tick.

export const MODE = Object.freeze({ ZONE: 'ZONE', HEAL: 'HEAL', DISENGAGE: 'DISENGAGE', FIGHT: 'FIGHT', LOOT: 'LOOT', DROP: 'DROP', HOLD: 'HOLD' })

export const PARAMS = {
  debug: false,
  warmup: true,             // start-up rehearsal (JIT) once per process inside createBrain, see brain.js
  rehearseN: 400,           // synthetic decisions of the rehearsal
  rngSalt: 0x5bd1e995,
  salt: 0,                  // D10: any other value is a legitimate fresh draw of the match RNG
  fuseMs: 30,               // D10: emergency fuse (ms of this decision); never trips in normal runs, counted

  // ---- fire control (layer 2)
  latency: 0.10,            // s between the observation and the moment a laser beam / mortar shell leaves
  tickS: 0.05,              // one server tick; the gun shot leaves on the first tick its cooldown allows
  gunRangeFrac: 0.97,
  gateMin: 0.004,           // rad, floor of the actual-aim gate
  gateBody: 0.3,            // m added to the target half-width (bullet radius)
  gateK: 1.0,               // multiplies the body term of the gun gate
  readyCd: 0.10,            // D8: trigger down when the cooldown read-out is <= one decision
  gunFlightMax: 0.55, steadyS: 0.6, steadyDv: 2.0,   // D2: long-flight gate
  ladder: [0, 2, 3.6],      // D8: aim points above the body centre (m, scaled by size)
  revWindow: 2.0, revCount: 2, revLeadScale: 0.5, revMinPerp: 3,
  velEma: 0.5,
  reloadAmmo: 4, reloadQuiet: 0.4, noReloadHp: 300,
  laserRangeFrac: 0.93, laserFullFrac: 0.97, laserGateK: 0.6, laserForceS: 1.5, laserTakeFrac: 0.8,
  laserExpectS: 1.0,
  lightRangeFrac: 0.92, lightConeMarginDeg: 3, lightMinEnergy: 15, lightReserve: 35,
  mortarMaxFlight: 0.9, mortarMinD: 20, mortarSelfMargin: 8, mortarArcCheck: 12, mortarSeenS: 1.0,
  scanRate: 1.6, preAimS: 4, faceAttackerS: 3,

  // ---- movement (layer 3)
  replanS: 2.0, replanMove: 4, pathExpand: 25000, wpReach: 1.8, partialGain: 10,
  rPrefGun: 75, bandLo: 55, bandHi: 95, gunBackStick: 0.7,           // D2 gun only
  rPrefLaser: 150, laserLo: 125, laserHi: 185, laserBackOff: 125, laserBoostAway: 90, laserBoostEnergy: 30,  // D2 laser (preset)
  rushR: 28, rushBoostR: 90, rushEnergy: 70, rushHpf: 0.5,            // D2 lightning without a laser
  strafeLo: 0.8, strafeHi: 1.6, strafeGain: 1.0,                      // D4 baseline strafe (preset)
  magSilence: 2.0, magSize: 12, magReloadS: 2.5,                      // D4 magazine rhythm
  dodgeHorizon: 0.9, dodgeMargin: 1.2, dodgeWeight: 0.9, dodgeProbe: 5, dodgeHold: 0.3,  // D4 bullet dodge
  laserReactRad: 0.25, laserHideWalk: 6, laserHideBoost: 9,           // D4 laser-charge reaction
  zoneMargin: 4, zoneBoostMargin: 1.5, zoneGoalFrac: 0.5, zoneLateR: 70, zoneLateFrac: 0.5, pathFactor: 1.3,
  zoneOuterFrac: 0.9, zoneNextFrac: 0.8, zoneShrinkLead: 12,          // D9 triggers
  zoneArriveSlack: 10,      // s a goal cell must stay inside the zone after we arrive
  boostReserve: 25, boostGap: 40, boostLifeS: 4, boostRefill: 55,     // refill hysteresis after an empty tank
  stuckSpeed: 1.5, stuckS: 0.6, stuckJetS: 2.0, stuckAbandonS: 4.0, abandonS: 10, noPathAbandonS: 8, slideS: 1.0,
  progressS: 3.0, progressM: 5.0,                                     // goal not getting closer -> re-goal
  shellMargin: 5, shellHorizon: 4, shellProbe: 14,
  silentStick: 0.42, arenaMargin: 30,

  // ---- engagement (layer 4)
  pIn: [0.85, 0.7, 0.45, 0.25], qOut: [0.95, 0.9, 0.75, 0.5], rangeBins: [40, 90, 160, 230],
  laserDpsIn: 92, lightDpsIn: 240, mortarDpsIn: 60, laserHeldFrac: 0.8,
  dmgWindow: 3.0, dmgMinSamples: 3, losMemory: 1.0, n1Window: 2.0, aimAtMeDeg: 12,
  rearMult: 1.5, killSecureHits: 3, headExposure: 0.1,
  hostileDmgS: 4, hostileAimR: 160, hostileAimMemS: 1.0, openingS: 40,   // D0
  candExtra: 40, unengagedS: 20, unengagedHpf: 0.9,                      // D5 candidates
  wFinish: 2.0, wAttacker: 1.6, wStick: 1.3, wNoLos: 0.5, wDrone: 0.5, keepTargetHpf: 0.25, keepNoLosS: 2.0, vetoKeepS: 1.5,
  tCoverUnknown: 3, blindFireS: 1.5, chaseHpf: 0.5, chaseS: 6,
  // D3 LOSING / HEAL
  finishHpf: 0.2, finishThreats: 2, lose1Hpf: 0.35, lose1Margin: 0.10, lose2Hpf: 0.5, lose3Hpf: 0.6, lose6: 6, loseHys: 0.05, loseMinS: 1.5,
  healEnterHp: 0.55, healAfterLoseHp: 0.9, healAfterLoseS: 6, healExit: 0.7, healQuietS: 1.5, healCubeR: 40, healFireQuiet: 0.5,
  lastStandHpf: 0.25, lastStandAttackers: 2,
  healDroneDist: 50, healZoneS: 20, modeHold: 0.6,
  evalPeriod: 0.3, evalGoalKeep: 60, wB: 1.0, wX: 1.5,
  hideMaxR: 120, hideStep: 4, hideWall: 9, hideExtra: 12, hideRetryS: 2.0, hideReloadDist: 8, hideRays: 300, hideExposedS: 0.5, hideLeadS: 3, hideAwayCos: 0.5,
  trackDeadReckon: 2.0, trackForget: 12, objForget: 120, objNear: 40, boundsPad: 200,

  // ---- economy (layer 5), D6 / D7
  farmHp: 0.9, farmStopT: 210, farmStopCubes: 10,
  lootCratePath: 150, crateApproach: 30, lootDronePath: 170, droneApproach: 38, droneLeave: 75, droneLeaveHpf: 0.5,
  lootCubePath: 60, lootPickupPath: 120, roofDz: 2, droneAvoid: 50,
  grabCubeHi: 70, grabCubeLo: 40, grabCubeLose: 12, grabHpf: 0.5, cubeMemS: 40, grabLaserR: 60, grabOtherR: 35, killDropS: 60,
  mortarWaitS: 60,
  crateShootR: 45, weaponValue: 3, cubeValue: 1,
  takeReach: 3.6, takeDz: 3.8,
  dropMaxD: 250, dropEarlyS: 3, dropContestR: 60, dropLeaveR: 70, dropHpBase: 200, dropCaptureS: 4,
  idlePull: false, idlePullS: 20, idlePullHpf: 0.9, roamStep: 0.15,

  // ---- owner request R1 (lib/steal.js): smart crate shooting + loot stealing. Switches: stealOn (a-e), crateGateOn.
  stealOn: true, crateGateOn: true,
  crateMechR: 120, crateQuietS: 2, regenNeedHpf: 0.97, crateResetsRegen: false,     // smart shooting gates
  stealHpfFfa: 0.7, stealMaxD: 90, stealShooterMinD: 25, stealRateMin: 20, stealLateS: 1.5, stealLeadS: 0.35,
  stealSide: 3.0, stealBehind: 0.9, stealTimeout: 15, stealPrefer: 0.8,                  // a) crates / drones others shoot
  deathDropS: 30, deathRushR: 100, deathRushMargin: 0.6, deathCubeR: 110, deathCubeMemS: 90,   // b) kill drops, c) death cubes
  raceCos: 0.85, raceMargin: 0.5, raceBonus: 1.6,                                       // d) pickups others walk to
  dropRaceS: 1.0, dropRingPad: 4,                                                       // e) supply drops
  // ---- owner request R2 (lib/scan.js): late-game torso sweep. Switch: scanOn.
  scanOn: true, scanLateT: 240, scanLateAlive: 8, scanLateR: 140, scanBlindMax: 3.0, scanForceLead: 0.9, scanDwell: 0.12, rearFaceS: 1.5,
  // ---- owner request R3: aim at the highest clear body point (headAimOn, firecontrol.js) + calibration (aimCalOn, lib/aimcal.js)
  headAimOn: true, aimLadder: [0.8, 0.65, 0.5, 0.35, 0.2], gunLadderTop: 0.65,
  aimCalOn: true, calGain: 0.5, calLatGain: 0.4, calMaxRad: 0.03, calMaxLat: 0.08, calDecayS: 30, calMissMax: 6, calGun: false,

  // ---- layer 6
  ambushRun: 50, ambushHpf: 0.5, ambushStallS: 3,

  // ---- layer 7: posture
  env: 'auto',              // 'auto' | 'squad' | 'ffa'
  ffaLatchDeaths: 3, ffaLatchT: 200, beamClue: false, gunlessClue: false, ffaPair: true,   // D12, D7, R2 change 6
  ffaQuietS: 90, ffaFarmClear: 150, ffaHideHpf: 0.55, ffaThirdS: 4, ffaThirdR: 120, ffaBandLo: 0.4, ffaBandHi: 0.5, ffaHealExit: 0.9,
  stanceUp: 1.0, stanceHold: 3.0,

  upgradeOrder: ['plating', 'armor', 'nanites', 'laser_damage', 'laser_charge', 'lightning_efficiency', 'gun_damage', 'gun_rate',
    'lightning_range', 'lightning_chain', 'gyros', 'servos', 'gun_mag', 'capacitor', 'reactor', 'jets', 'gun_velocity', 'sensors',
    'mortar_damage', 'mortar_splash', 'mortar_rate', 'laser_pierce'],
}

// Named presets (D2, D3, D4, D6, D7, D12). SELECT holds the defaults; a submission changes one entry.
export const PRESETS = {
  laserRange: {
    far: { rPrefLaser: 150, laserLo: 125, laserHi: 185, laserBackOff: 125, laserBoostAway: 90 },
    mid: { rPrefLaser: 115, laserLo: 100, laserHi: 130, laserBackOff: 100, laserBoostAway: 70 },
  },
  healExit: { '70': { healExit: 0.7 }, '90': { healExit: 0.9 } },
  farmHp: { '90': { farmHp: 0.9 }, '50': { farmHp: 0.5 } },
  strafe: { d4: { strafeLo: 0.8, strafeHi: 1.6 }, fast: { strafeLo: 0.45, strafeHi: 1.15 } },
  ffaPair: { on: { ffaPair: true }, off: { ffaPair: false } },
  beamClue: { off: { beamClue: false }, on: { beamClue: true } },
  gunlessClue: { off: { gunlessClue: false }, on: { gunlessClue: true } },
  idlePull: { off: { idlePull: false }, on: { idlePull: true } },
  env: { auto: { env: 'auto' }, squad: { env: 'squad' } },
  // owner requests: one string turns a whole request off for an A/B
  R1: { on: { stealOn: true, crateGateOn: true }, off: { stealOn: false, crateGateOn: false } },
  R2: { on: { scanOn: true }, off: { scanOn: false } },
  R3: { on: { headAimOn: true, aimCalOn: true }, off: { headAimOn: false, aimCalOn: false } },
}
export const SELECT = { laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto', R1: 'on', R2: 'on', R3: 'on' }

/** PARAMS <- presets (SELECT, then overrides.select) <- plain overrides. */
export function resolveParams(overrides) {
  const ov = overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? overrides : {}
  const sel = { ...SELECT, ...(ov.select && typeof ov.select === 'object' ? ov.select : {}) }
  const P = { ...PARAMS }
  for (const k of Object.keys(sel)) { const set = PRESETS[k] && PRESETS[k][sel[k]]; if (set) Object.assign(P, set) }
  for (const k of Object.keys(ov)) if (k !== 'select') P[k] = ov[k]
  P.selected = sel
  return P
}

// Stance parameter sets (FFA posture and LAST-STAND); SQUAD ranges come from D2 above.
export const STANCES = {
  DEFENSIVE:   { loot: 40, firstShot: 'squad' },
  OPPORTUNIST: { loot: 80, firstShot: 'target' },
  OFFENSIVE:   { loot: 15, firstShot: 'any' },
  'LAST-STAND': { loot: 0, firstShot: 'any' },
}
