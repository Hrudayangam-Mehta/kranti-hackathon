// Every tunable number of the brain lives here (BRAIN_SPEC_V2). `createBrain(hello, ctx, overrides)` shallow-
// merges `overrides` over these defaults, so simulator sweeps never have to touch the code.
// Physical numbers (speeds, damage, ranges, cooldowns) are NOT here: they are read from hello.config,
// obs.self.stats and obs.self.weapons[i].stats every tick.

export const MODE = Object.freeze({ ZONE: 'ZONE', HEAL: 'HEAL', DISENGAGE: 'DISENGAGE', FIGHT: 'FIGHT', LOOT: 'LOOT', DROP: 'DROP', HOLD: 'HOLD' })

export const PARAMS = {
  debug: false,
  warmup: true,             // one synthetic warm-up run per process at createBrain (JIT), see brain.js
  rngSalt: 0x5bd1e995,

  // ---- fire control (layer 2)
  latency: 0.10,            // s between the observation time and the moment our shot leaves
  gunRangeFrac: 0.97,
  gateMin: 0.004,           // rad, floor of the actual-aim gate
  gateBody: 0.3,            // m added to the target half-width (bullet radius)
  gateK: 1.0,               // multiplies the body term of the gun gate
  readyCd: 0.05,            // gun counts as ready when cooldown <= this
  revWindow: 2.0, revCount: 2, revLeadScale: 0.5, revMinPerp: 3,
  velEma: 0.5,
  reloadAmmo: 4, reloadQuiet: 0.4, noReloadHp: 300,
  laserRangeFrac: 0.93, laserFullFrac: 0.97, laserGateK: 0.6, laserForceS: 1.5, laserAimTakeS: 0.2,
  laserExpectS: 1.0,
  lightRangeFrac: 0.92, lightConeMarginDeg: 3, lightMinEnergy: 15, lightReserve: 35,
  mortarMaxFlight: 0.9, mortarMinD: 20, mortarSelfMargin: 8, mortarArcCheck: 12, mortarSeenS: 1.0,
  scanRate: 1.6, preAimS: 4, faceAttackerS: 3, lootAimRange: 60,

  // ---- movement (layer 3)
  replanS: 0.5, replanMove: 4, planMinMs: 12, optMinMs: 4, slowMs: 15, pathExpand: 4000, wpReach: 1.8, lookAhead: 4,
  rPrefGun: 115, bandLo: 85, bandHi: 140, rPrefLaser: 120, rushR: 38, rushEnergy: 80, rushHpf: 0.7,
  lightAvoid: 50, radialGain: 0.5, strafeGain: 1.0,
  jinkMinR: 60, jinkLo: 0.5, jinkHi: 1.0, jinkProbe: 5,
  zoneMargin: 4, zoneBoostMargin: 1.5, zoneGoalFrac: 0.8, zoneLateR: 70, zoneLateFrac: 0.5, pathFactor: 1.3,
  zoneArriveSlack: 10,      // s a goal cell must stay inside the zone after we arrive
  boostReserve: 25, boostGap: 40, boostLifeS: 4,
  stuckSpeed: 1.5, stuckS: 0.6, stuckJetS: 2.0, stuckAbandonS: 4.0, abandonS: 10, noPathAbandonS: 8, slideS: 1.0,
  dodgeMargin: 5, dodgeHorizon: 4, dodgeProbe: 14,
  laserHideWalk: 6, laserHideBoost: 9, laserAimDeg: 6,
  silentStick: 0.42,

  // ---- engagement (layer 4)
  pIn: [0.85, 0.7, 0.45, 0.25], qOut: [0.95, 0.9, 0.75, 0.5], rangeBins: [40, 90, 160, 230],
  laserDpsIn: 92, lightDpsIn: 240, mortarDpsIn: 60, npcDpsIn: 25, laserHeldFrac: 0.8,
  dmgWindow: 3.0, dmgMinSamples: 3, losMemory: 1.0, n1Window: 2.0, aimAtMeDeg: 12,
  rearMult: 1.5, switchRatio: 1.3, switchNoLosS: 1.0, killSecureHits: 3,
  hEscBase: 150, tCoverUnknown: 3, tCoverCapDuel: 4, blindFireS: 1.5, fightHys: 0.06, finishHp: 400, finishA: 120,
  rehitS: 4, chaseHpf: 0.5, chaseS: 6,
  healEnter: 0.4, healSoft: 0.7, healExit: 0.9, healDroneDist: 50, healZoneS: 20, healFireQuiet: 0.5,
  modeHold: 0.6,
  evalPeriod: 0.3, evalRays: 400, evalGoalKeep: 60, wB: 1.0, wX: 1.5, coverShare: 0.45,
  hideRays: 300, hideMaxR: 120, hideStep: 4, hideWall: 9, hideExtra: 12, hideRetryS: 2.0, hideReloadDist: 8,
  anchorMaxDist: 40, anchorPull: 5,
  trackDeadReckon: 2.0, trackForget: 12, objForget: 120, objNear: 40,

  // ---- economy (layer 5)
  lootCubePath: 60, killDropPath: 170, lootCratePath: 80, lootPickupPath: 120, lootQuietR: 150, lootHpf: 0.9, droneAvoid: 50,
  crateShootR: 45, weaponValue: 3, crateValue: 1.5, cubeValue: 1,
  takeReach: 3.6, takeDz: 3.8,
  dropHpBase: 200, dropCaptureS: 4, dropEnemyLead: 6, dropPathLead: 8,

  // ---- layer 6
  ambushRun: 50, ambushHpf: 0.5, ambushStallS: 3, relocateMin: 10, bastionWall: 4, bastionArcDeg: 100,
  lastStandHpf: 0.25,

  // ---- layer 7
  env: 'auto',              // 'auto' | 'squad' | 'ffa'
  stanceUp: 1.0, stanceHold: 3.0, idlePullS: 20, idlePullHpf: 0.9, ffaLatchF: 3, ffaLatchFQ: 5,
}

// Stance parameter sets (playbook section A). Range band, exposure and loot radius; the machinery is shared.
export const STANCES = {
  DEFENSIVE:   { rLo: 85, rHi: 140, rPref: 115, peekMax: 1.2, hideMin: 2.4, loot: 40, firstShot: 'squad' },
  OPPORTUNIST: { rLo: 70, rHi: 120, rPref: 110, peekMax: 2.9, hideMin: 2.4, loot: 80, firstShot: 'target' },
  OFFENSIVE:   { rLo: 45, rHi: 80, rPref: 65, peekMax: 4.0, hideMin: 1.0, loot: 15, firstShot: 'any' },
  'LAST-STAND': { rLo: 30, rHi: 140, rPref: 90, peekMax: 99, hideMin: 0, loot: 0, firstShot: 'any' },
}

export const UPGRADE_ORDER = ['gun_damage', 'laser_damage', 'plating', 'armor', 'gun_rate', 'gun_mag', 'laser_charge',
  'capacitor', 'reactor', 'lightning_range', 'servos', 'gyros', 'sensors']
