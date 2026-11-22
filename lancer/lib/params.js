// Every tunable number of the brain lives here (BRAIN_SPEC_V2, DOCTRINE V4). `createBrain(hello, ctx, overrides)`
// resolves the named presets (SELECT, or `overrides.select`) and then shallow-merges `overrides` over the result,
// so simulator sweeps never have to touch the code and one real submission can change exactly one thing:
// edit one string in SELECT (or one number in PARAMS) and nothing else.
// Physical numbers (speeds, damage, ranges, cooldowns) are NOT here: they are read from hello.config,
// obs.self.stats and obs.self.weapons[i].stats every tick.

export const MODE = Object.freeze({ ZONE: 'ZONE', HEAL: 'HEAL', DISENGAGE: 'DISENGAGE', FIGHT: 'FIGHT', LOOT: 'LOOT', DROP: 'DROP', HOLD: 'HOLD' })

export const PARAMS = {
  equipmentMeta: true,
  equipmentRole: 'lancer',
  debug: false,
  warmup: true,             // start-up rehearsal (JIT) once per process inside createBrain, see brain.js
  rehearseN: 800,           // synthetic decisions of the rehearsal (pass 2b: 400 -> 800, fewer compile pauses in the match)
  rehearseFfaN: 800,        // pass 2b: the same phases again on a scratch brain forced into FFA (0 = none)
  rngSalt: 0x5bd1e995,
  salt: 1,                  // D10: any other value is a legitimate fresh draw of the match RNG
  saltTable: '1111111111111111',
  upgPhase: false,
  upgPhaseLists: [
    ['gun_rate', 'gun_damage', 'laser_charge', 'laser_damage', 'gun_mag', 'lightning_efficiency', 'gun_velocity'],
    ['plating', 'nanites', 'armor', 'laser_damage', 'gun_damage', 'laser_charge', 'gun_rate', 'gun_mag'],
    ['laser_damage', 'laser_charge', 'laser_pierce', 'lightning_chain', 'lightning_range', 'lightning_efficiency', 'mortar_reload', 'mortar_splash', 'mortar_velocity', 'plating', 'armor', 'nanites', 'gun_damage', 'gun_rate']],
  upgPhaseEarlyS: 75, upgPhaseLateS: 150, upgPhaseLateK: 3,
  fuseMs: 30,               // D10: emergency fuse (ms of this decision); never trips in normal runs, counted

  // ---- fire control (layer 2)
  latency: 0.10,            // s between the observation and the moment a laser beam / mortar shell leaves
  tickS: 0.05,              // one server tick; the gun shot leaves on the first tick its cooldown allows
  ioLead: false,            // R6 IO1: gun lead counted half a tick earlier (a bullet sweeps 12.6 m on its spawn tick)
  ioLaserLat: false,        // R6 IO2: the beam leaves on the first tick after the release decision (0.05 s, one tick of slew)
  ioReload: false,          // R6 IO4: hold the gun trigger when the reload read-out ends inside this decision
  ioSlewGate: false,        // R6 IO3: mortar / lightning gates use the tick the shot really leaves on
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
  zoneMargin: 4, zoneBoostMargin: 1.5, zoneGoalFrac: 0.5, zoneLateR: 70, zoneLateFrac: 0.5, zoneLateLeash: 8, zoneLateLeashFrac: 0.35, zoneLateEdge: 2, pathFactor: 1.3,
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
  grabCubeHi: 70, grabCubeLo: 40, grabCubeLose: 12, grabHpf: 0.5, cubeMemS: 40, grabLaserR: 60, grabOtherR: 35, killDropS: 60, killCubeR: 200, killCubeThreats: 1, killCubeClear: 60,
  mortarWaitS: 60,
  crateShootR: 45, weaponValue: 3, cubeValue: 1,
  takeReach: 3.6, takeDz: 3.8,
  dropMaxD: 250, dropEarlyS: 3, dropContestR: 60, dropLeaveR: 70, dropHpBase: 200, dropCaptureS: 4,
  idlePull: false, idlePullS: 20, idlePullHpf: 0.9, roamStep: 0.15,

  // ---- owner request R1 (lib/steal.js): loot stealing a-e (stealOn, both postures) + smart crate shooting (crateGateOn;
  // FFA only unless crateGateSquad: in SQUAD the D6 farming rules stay as they are)
  stealOn: true, crateGateOn: true, crateGateSquad: false,
  crateMechR: 120, crateQuietS: 2, regenNeedHpf: 0.97, crateResetsRegen: false,     // smart shooting gates (softened values)
  stealHpfFfa: 0.7, stealMaxD: 90, stealShooterMinD: 25, stealRateMin: 20, stealLateS: 1.5, stealLeadS: 0.35,
  stealSide: 3.0, stealBehind: 0.9, stealTimeout: 15, stealPrefer: 0.8,                  // a) crates / drones others shoot
  deathDropS: 30, deathRushR: 100, deathRushMargin: 0.6, deathCubeMemS: 90,             // b) kill drops, c) death cubes
  raceCos: 0.85, raceMargin: 0.5, raceBonus: 1.6,                                       // d) pickups others walk to
  dropRaceS: 1.0, dropRingPad: 4,                                                       // e) supply drops
  // ---- owner request R2 (lib/scan.js): late-game torso sweep. Switch: scanOn.
  scanOn: true, scanLateT: 240, scanLateAlive: 8, scanLateR: 140, scanBlindMax: 3.0, scanForceLead: 0.9, scanDwell: 0.12, rearFaceS: 1.5,
  // ---- owner request R3: laser at the highest clear body point (headAimOn); the gun keeps the D8 centre-first ladder
  // unless headAimGun; online calibration (aimCalOn, lib/aimcal.js) is merged but off: our own beams are not in obs.beams
  headAimOn: true, aimLadder: [0.8, 0.65, 0.5, 0.35, 0.2], headAimGun: false, gunLadderTop: 0.65,
  aimCalOn: false, calGain: 0.5, calLatGain: 0.4, calMaxRad: 0.03, calMaxLat: 0.08, calDecayS: 30, calMissMax: 6, calGun: false,
  // ---- farm-first opening (preset openFarm; SQUAD posture unless openFarmFfa): until openFarmCubes cubes or openFarmT s
  // no fight is started with a mech; only a mech that damaged us from within openFarmAnswerR m (last hostileDmgS s) is
  // answered; any other mech with a line on us: break the line, then keep farming
  openFarm: true, openFarmCubes: 10, openFarmT: 75, openFarmAnswerR: 100, openFarmFfa: false, openFarmQuietS: 1.0, openFarmAim: false,

  // ---- layer 6
  ambushRun: 50, ambushHpf: 0.5, ambushStallS: 3,

  // ---- layer 7: posture
  env: 'auto',              // 'auto' | 'squad' | 'ffa'
  ffaLatchDeaths: 3, ffaLatchT: 200, beamClue: false, gunlessClue: false, ffaPair: true,   // D12, D7, R2 change 6
  ffaQuietS: 90, ffaFarmClear: 150, ffaHideHpf: 0.55, ffaThirdS: 4, ffaThirdR: 120, ffaBandLo: 0.4, ffaBandHi: 0.5, ffaHealExit: 0.9,
  stanceUp: 1.0, stanceHold: 3.0,

  // ---- FFA only (pass 2a; every rule below runs only while B.env === 'FFA'): counter module + dossier section 5 rules
  ffaCounters: true, counterParams: null,                              // bot/lib/counters.js (counters_hookup.md)
  ffaRules: true,                                                      // ffa.js: dossier rules 1-10, D11 left-overs, hp race
  ffaLaserReactRad: 0.3, ffaReactS: 0.1, ffaChargeMin: 0.15, ffaCapMult: 0.75, ffaCoverReach: 2.5,   // rule 1 hide budget
  ffaPeekBeamS: 1.65, ffaPeekFlagS: 2.9, ffaPeekLineS: 4.3, ffaPeekS: 0.6, ffaPeekHpf: 0.5, ffaPeekHoldS: 12,  // rule 1 beam clock
  ffaOffAxis: 0.4, ffaOffAxisMinD: 45,                                 // rule 2
  ffaBusyS: 1.5, ffaBusyRad: 0.2, ffaBusyR: 230, ffaWedgeDeg: 75, ffaThirdLo: 60, ffaThirdHi: 190, ffaProx: [45, 60, 75],
  ffaThirdCover: 6, ffaThirdExitRad: 0.5, ffaThirdOppHpf: 0.15, ffaThirdHoldS: 5, ffaWoundTgt: 0.5,  // rule 3 (+ D11 ffaThirdS / ffaThirdR)
  ffaBreakS: 9, ffaBreakM: 20, ffaBreakMaxS: 30,                       // rule 4
  ffaLightKeep: 50, ffaLightOuter: 70, ffaLightCloseV: 12, ffaLightCloseS: 0.5,   // rule 5
  ffaRevGap: 0.95, ffaRevWindow: 3, ffaRevFlight: 0.3, ffaSteadyFlight: 0.8,       // rule 6
  ffaFinalT: 390,                                                      // rule 7 / D11: final-point hp race
  ffaCourtesyRad: 0.3, ffaFinishHpf: 0.4, ffaCourtesyHpf: 0.65, ffaCourtesyR: 115, // rule 8
  ffaWoundHpf: 0.5, ffaWoundR: 200,                                    // rule 9
  ffaAimDwell: 3, aimDwellAll: false,                                  // addendum K2: aim-hostility after 3 decisions (FFA; SQUAD only with preset aimDwell=on)
  ffaHiderPass: 120, ffaHiderConf: 0.5,                                // D11 hider counter (pass, out-farm)
  // pass 2b (FFA only): counter module changes from counters_2696_addendum.md 6.2 (C1 finish rail, C2 kiter ramp 70/100,
  // C3 LASER_BRAWLER archetype) and the two check2a fixes (rule 3 first shot not held; rule 4 sight break legs)
  cxFinish: true, cxKiterRamp: true, cxBrawler: false,
  hidePlanCap: true, hidePlanCapK: 0.4, hidePlanCapMin: 2000,          // pass 2b decision time: A* cap for hide-cell paths (both postures)
  ffaThirdFix: true, ffaBreakFix: true, ffaBreakSettleS: 0.4, ffaBreakMoveS: 1.5, ffaBreakTries: 2,

  // ---- build R3a2 (notes/build_spec_r3a2.md). PARAMS hold the 5.02 behaviour; the presets below switch each item on.
  // P1 fightEarly (SQUAD posture): opening guard earlyOpenS while no foreign death was seen (else openingS), plus the
  // "engaged" candidate clause: a mech with a line within engR that is within engNearR, hit us in engHitS, closes faster
  // than engCloseV within engCloseR, is under engLowHpf within engLowR, or aims within engAimRad of us within engAimR
  fightEarly: false, earlyOpenS: 20, engR: 240, engNearR: 60, engHitS: 6, engCloseV: 3, engCloseR: 180, engLowHpf: 0.4, engLowR: 160, engAimRad: 0.22, engAimR: 190,
  // P2 laserEcon (SQUAD posture): without a laser a laser pickup is the top loot goal out to laserSeekPath; no mortar
  laserEcon: false, laserSeekPath: 240, laserSeekValue: 100,
  // P3 focus (SQUAD posture): additive target cost in metres (lowest wins); tr.index = 1000 - cost. fcNoLos is the old x0.5
  // no-line factor as a cost (it doubles the cost of a full-hp mech at 100 m), fcAir / fcMortar the old x1.3 / x1.15
  focusAdd: false, fcHp: 0.1, fcLowHpf: 0.3, fcLow: 200, fcCur: 200, fcHitS: 4, fcHit: 40, fcClose: 15, fcCloseV: 1, fcMortar: 20, fcNoLos: 240, fcAir: 15,
  fcVetoHpf: 0.38, fcVetoHitS: 2,
  // P4 pulseRetreat (SQUAD posture): no HEAL; short LOSING pulses (n = mechs seen now within plR)
  pulseRetreat: false, plR: 160, pl2Hpf: 0.55, pl3Hpf: 0.8, pl1Hpf: 0.35, pl1Margin: 0.1, plKeepTgtHpf: 0.25, plKeepHpf: 0.2, plKeepN: 2, plTailS: 1.5, plLateAlive: 3,
  // P5 boostSpend (SQUAD posture): boost in FIGHT while charging / dodging / under fire and moving
  boostSpend: false, bsEnergy: 30, bsDodgeEnergy: 25, bsHurtS: 1.0, bsMoveMin: 0.3,
  // final-only (FFA latch): F1 drop gate, Z5 final point, Z8 two alive, Z9 three alive, Z10 zone gate
  ffaDropGate: false, fdgAlive: 3, fdgR: 150,
  finalPoint: false, fpStartT: 375, fpShootT: 405, fpPad: 0.4,
  ffaTwo: false, twoGap: 300, twoDuelP: 0.9, twoCloseHpf: 0.6, twoAwayRad: 0.5,
  ffaThree: false,
  ffaGate: false, fgDps: 60, fgHpf: 0.6, fgMult: 1.5, fgAbortDps: 100, fgInside: 25, fgR: 190,
  // ---- build R4a (notes/build_spec_r4.md section 2, lib/hunt.js). PARAMS hold the R3a2 behaviour (every switch off).
  // Firewall: SQUAD posture, B.foreignDeaths < h50ForeignMax, next radius > zoneLateR, more than h50LateAlive alive.
  // hunt50: seek + start a fight on a non-hostile mech only when burst3 >= h50Frac x its current hp and our hp stays above
  // h50Reserve x max through the exchange; commit (LOSING only on the h50Safe* thresholds) and leave on h50Leave / h50NoDmgS;
  // h50Pulse: after our kill with another line on us, or with the burst spent and >= 2 lines, a <= h50PulseMax retreat to a hide
  // cell within h50CoverS that ends when loaded (h50MagMin rounds, laser cooldown <= h50LaserOkS). seekOn: the seek alone
  hunt50: false, h50Pulse: false, seekOn: false,
  h50Frac: 0.5, h50WindowS: 3.0, h50LaserReadyS: 1.5, h50LightR: 60, h50LightZaps: 10, h50LightHit: 0.8, h50EngR: 200, h50LineS: 1.0,
  h50MinHpf: 0.35, h50Reserve: 0.30, h50FinishS: 1.5, h50TtkStep: 0.05, h50TtkMax: 8,
  h50HitR: [75, 100, 126, 151], h50HitP: [1, 0.86, 0.57, 0.32, 0.2], h50PriorGun: 98, h50PriorLaser: 117,
  h50Leave: 0.30, h50LeaveCoolS: 1.0, h50NoDmgS: 3.0, h50SafeHpf: 0.25, h50Safe3Hpf: 0.40, h50Safe3N: 3, h50LinesR: 160,
  h50PulseMax: 4.0, h50PulseGapS: 1.0, h50CoverS: 1.5, h50MagMin: 8, h50LaserOkS: 0.3, h50SpentLaserS: 1.0, h50CubeR: 40, h50CubeWaitS: 3.0, h50CubeShowS: 0.5,
  h50ForeignMax: 1, h50LateAlive: 3,
  // ---- build R6 robustness (notes/build_spec_r6.md section 1, RB2-RB6; brain.js anchorToConfig, mover.js hopPlanCfg)
  // mortarMaxR: the mortar threat range (floor(speed^2 / gravity) from hello.config; 235 m on the default balance).
  // pocketCfg: RB4 second pocket-exit plan with the climb / hop limits of the config when the campus limits find no exit
  mortarMaxR: 235, pocketCfg: false,
  ioMerge: false,           // R6 IO8 (bot.js + lib/io.js): merge events / sounds / beams of skipped observations
  anchorCfg: true, warmPocket: true,   // R7a bisect switches: RB2-RB5 anchoring on hello.config, RB6 rehearsal on the largest pocket
  aggrFw: false, aggrHpf: 0.7, aggrS: 0,   // R7a aggr 'any70f': the any70 unengaged numbers only before the first foreign death
  hfExit: 0,                 // R7a HF: heal exit in the SQUAD posture (0 = healExit)
  // ---- build R7a LG (economy.chooseGrab, tactics.selectTarget): lgUntilT is a match clock (anchorToConfig scales it, A2)
  grabLaserWide: false, lgGrabR: 130, lgHpf: 0.5, lgYieldS: 1.0, lgKnownPath: 200, lgUntilT: 90,
  // ---- build R7a LX / LC (tactics.js losing()): loseExitS = debounce of the end of LOSING (0 = today);
  // loseCoverNear = LOSING only with a found hide cell within lcCoverS of travel, or under lcLowHpf with any found cell
  loseExitS: 0, loseCoverNear: false, lcCoverS: 1.5, lcLowHpf: 0.25,
  // ---- build R7a FIN (tactics.js finUpdate / losingRaw / decideMode): finTtk = part (a), finB = part (b)
  isoNear: 0,               // R7a ISO (brain.js fightLegs isolate branch): 0 = any distance (today)
  finTtk: false, finB: false, finTtkS: 3.0, finSeenS: 3.0, finInS: 3.0, finInMin: 30, finSlewS: 0.3, finRegainS: 1.0, finPadS: 0.3, finMarginHp: 150, finMarginFrac: 0.10,
  h50PreyR: 400, h50PreyMemS: 12, h50PreyS: 1.0, h50Hp: 0.05, h50Hostile: 80, h50Laser: 60, h50CrowdR: 60, h50Crowd: 100, h50PreyHys: 30,
  h50ArriveLaser: 125, h50ArriveGun: 90, h50SeekHpf: 0.6, h50SeekFromS: 20, h50SoundS: 3, h50SoundMid: 120, h50SoundFar: 200, h50SoundSlack: 5,
  h50LastEnemyS: 30, h50RingFrac: 0.41, h50RingStepDeg: 30, h50ArriveR: 45, h50SeekBoostE: 90, h50SeekBoostD: 150,

  // ---- practice profile 'p26' (lib/prof.js, preset prof): clean-room rebuild from notes/intel/top_2696_v2.md sections
  // 2-3 (reference sub-profile). SQUAD only: every rule runs only while hunt.firewall() holds (B.p26on); 'off' = base
  prof: 'off',
  pfAdaptive: true, pfReadyHorizon: 4, pfRiskReserve: 0.12, pfRiskReactionS: 0.2, pfRiskLeave: 0.75,
  pfLancer: true,
  pfGoalHorizon: 18, pfRewardMin: 0.05, pfRecoveryHpf: 0.72,
  pfUnsureS: 20, pfOpenT: 75, pfOpenCubes: 10, pfAnswerR: 100, pfAnswerS: 4, pfGateHideHpf: 0.7,       // 3.4 timeline
  pfAtkR: 220, pfAtkHpf: 0.35, pfWeakHpf: 0.4, pfWeakR: 150, pfWeakMyHpf: 0.6, pfSeenS: 0.3, pfKeepS: 6,
  pfHuntHpf: 0.8, pfHuntS: 20, pfHuntV: 120, pfHuntAgeK: 3, pfMemS: 25,
  pfHosDeg: 6.9, pfHosW: 6, pfHosR: 260, pfHosUp: 0.1, pfHosCharge: 0.3, pfHosDown: 0.05, pfHosOn: 0.6, pfHosS: 8,   // 3.3 hostility
  pfHosNearR: 30, pfHosNearS: 4, pfHosDmgS: 25,
  pfBossK: 1.5, pfPeerK: 0.85, pfBossR: 150, pfPeerR: 60,                                               // 0-20 s avoidance
  pfAdv: 25, pfMultiTtk: 2.5, pfMultiMargin: 1.5, pfFinishS: 1.6, pfEvalBand: 60, pfFireS: 2.5,       // fight-or-not
  pfTgtPerM: 2.5, pfTgtLine: 400, pfTgtHit: 350, pfTgtCur: 150,                                          // 3.5 target score
  pfShotHpK: 0.6, pfShotPerM: 2, pfShotTgt: 200, pfShotHit: 150, pfShotHitS: 3, pfDroneShotR: 60, pfDroneShotHpf: 0.5,
  pfRanges: [28, 40, 55, 75, 100, 130, 160, 190], pfInK: 1.15, pfStepWin: 2, pfDrift: 10,               // 3.6 ranges
  pfHitR0: 40, pfOwnHit0: 0.97, pfOwnHitK: 0.0035, pfOwnHitMin: 0.30, pfFoeHit0: 0.90, pfFoeHitK: 0.0125, pfFoeHitMin: 0.06, pfHitLearnN: 6,
  pfFoeLaserLag: 0.1, pfLightK: 0.958, pfLightPad: 4,
  pfStrafeLo: 0.35, pfStrafeHi: 0.9, pfStrafeP: 0.7, pfIdleZoneOut: 60, pfIdleZoneE: 60,                // 3.8 strafe, 3.14 idle zone walk
  pfBoostBack: 25, pfBoostBackE: 30, pfLightKeep: 54, pfRushHold: 50, pfRushOut: 12, pfRushR: 120, pfRushE: 45,
  pfLatchHpf: 0.35, pfLatchHitS: 3, pfLatchExit: 0.8, pfLatchQuietExit: 0.55, pfLatchQuietS: 6, pfRetreatBoostE: 12,   // 3.12
  pfDropR: 200, pfDropLate: 3, pfDropBoostE: 8, pfDropBoostD: 12, pfDropStop: 2,                         // 3.13
  pfGrabLaserR: 45, pfGrabCubeR: 18, pfGrabOtherR: 25, pfGrabPath: 1.5, pfGrabExpand: 2500, pfGrabClear: 30, pfGrabCubeClear: 25,
  pfGrabHpf: 0.3, pfGrabS: 6, pfGrabIgnoreS: 30, pfCalmCubeR: 28,
  pfPerM: 1.3, pfKeep: 15, pfZoneArrive: 3, pfCube: 110, pfCrate: 105, pfCrateHpf: 0.45, pfDrone: 170, pfDroneHpf: 0.6,   // 3.10 loot
  pfWpn: 70, pfWpnGain: 45, pfWpnEmpty: 200, pfWpnEmptyGain: 30, pfWpnHpf: 0.6, pfWpnClear: 60, pfLaserMin: 270,
  pfDropV: 170, pfDropHeldV: 60, pfDropWait: 25, pfHurtHpf: 0.7, pfHurtS: 40, pfHurtR: 35,
  pfCrateMin: 14, pfCrateShootR: 45, pfCrateGiveS: 14, pfCrateIgnoreS: 90, pfDroneNear: 22,
  pfCubeNear: 2.8, pfCubeNearS: 1.2, pfCubeGiveS: 6, pfCubeGivePerM: 8, pfCubeIgnoreS: 60, pfLongTrip: 40, pfLongTripE: 75,
  pfSpawnLookS: 1.7, pfCrateNearR: 50, pfCrateFarR: 110, pfCrateQuietS: 4,                               // 3.7 / 3.10 crate shots
  pfRelQuiet1: 1.5, pfRelQuiet2: 6, pfRungs: [0.85, 0.68, 0.30, 0.12], pfLaserDroneHp: 150,               // 3.7
  pfLzLightLo: 46, pfLzLightHi: 68, pfLzLightV: 4, pfLightConeK: 0.9, pfLightEnergyNpc: 0.55,
  pfUpg: ['plating', 'armor', 'laser_damage', 'laser_charge', 'nanites', 'gun_damage', 'gun_rate', 'lightning_efficiency', 'servos',
    'lightning_chain', 'capacitor', 'reactor', 'gyros', 'gun_mag', 'lightning_range', 'mortar_splash', 'mortar_reload', 'mortar_velocity',
    'mortar_damage', 'mortar_rate', 'gun_velocity', 'sensors', 'jets', 'laser_pierce'],                 // 3.11

  upgradeOrder: ['plating', 'armor', 'nanites', 'laser_damage', 'laser_charge', 'lightning_efficiency', 'gun_damage', 'gun_rate',
    'lightning_range', 'lightning_chain', 'gyros', 'servos', 'gun_mag', 'capacitor', 'reactor', 'jets', 'gun_velocity', 'sensors',
    'mortar_damage', 'mortar_splash', 'mortar_rate', 'laser_pierce'],
}

// Named presets (D2, D3, D4, D6, D7, D12). SELECT holds the defaults; a submission changes one entry.
export const PRESETS = {
  laserRange: {
    far: { rPrefLaser: 150, laserLo: 125, laserHi: 185, laserBackOff: 125, laserBoostAway: 90 },
    mid: { rPrefLaser: 115, laserLo: 100, laserHi: 130, laserBackOff: 100, laserBoostAway: 70 },
    far170: { rPrefLaser: 170, laserLo: 145, laserHi: 195, laserBackOff: 145, laserBoostAway: 90 },     // addendum section 4 item 2 (one-change option)
  },
  healExit: { '70': { healExit: 0.7 }, '90': { healExit: 0.9 } },
  farmHp: { '90': { farmHp: 0.9 }, '50': { farmHp: 0.5 } },
  strafe: { d4: { strafeLo: 0.8, strafeHi: 1.6 }, fast: { strafeLo: 0.45, strafeHi: 1.15 } },
  ffaPair: { on: { ffaPair: true }, off: { ffaPair: false } },
  beamClue: { off: { beamClue: false }, on: { beamClue: true } },
  gunlessClue: { off: { gunlessClue: false }, on: { gunlessClue: true } },
  idlePull: { off: { idlePull: false }, on: { idlePull: true } },
  env: { auto: { env: 'auto' }, squad: { env: 'squad' } },
  ffaCounters: { on: { ffaCounters: true }, off: { ffaCounters: false } },
  ffaRules: { on: { ffaRules: true }, off: { ffaRules: false } },
  aimDwell: { off: { aimDwellAll: false }, on: { aimDwellAll: true } },   // addendum K2 in SQUAD too: a one-change submission (SQUAD-affecting)
  // pass 2b: one string per change
  R1: { on: { stealOn: true }, off: { stealOn: false } },                                         // owner request R1 a-e
  crateGate: { ffa: { crateGateOn: true, crateGateSquad: false }, all: { crateGateOn: true, crateGateSquad: true }, off: { crateGateOn: false } },
  R2: { on: { scanOn: true }, off: { scanOn: false } },
  R3: { on: { headAimOn: true }, off: { headAimOn: false, headAimGun: false, aimCalOn: false }, gun: { headAimOn: true, headAimGun: true } },
  aimCal: { off: { aimCalOn: false }, on: { aimCalOn: true } },
  openFarm: { on: { openFarm: true, openFarmAim: false }, off: { openFarm: false }, d0: { openFarm: true, openFarmAim: true } },   // d0: the gate answers any D0-hostile mech at once
  cxFinish: { on: { cxFinish: true }, off: { cxFinish: false } },
  cxKiterRamp: { on: { cxKiterRamp: true }, off: { cxKiterRamp: false } },
  cxBrawler: { off: { cxBrawler: false }, on: { cxBrawler: true } },
  ffaThirdFix: { on: { ffaThirdFix: true }, off: { ffaThirdFix: false } },
  ffaBreakFix: { on: { ffaBreakFix: true }, off: { ffaBreakFix: false } },
  hidePlanCap: { on: { hidePlanCap: true }, off: { hidePlanCap: false } },
  // build R3a2 (notes/build_spec_r3a2.md): one string per item; the first option of each is the 5.02 behaviour
  fightEarly: { off: { fightEarly: false }, on: { fightEarly: true, openFarm: false } },                         // P1 (on also turns openFarm off)
  laserEcon: { off: { laserEcon: false }, on: { laserEcon: true } },                                            // P2 (with laserRange mid)
  focus: { mult: { focusAdd: false }, add: { focusAdd: true } },                                                // P3
  retreat: { d3: { pulseRetreat: false }, pulse: { pulseRetreat: true } },                                      // P4
  boost: { off: { boostSpend: false }, spend: { boostSpend: true } },                                           // P5
  upg: { std: { upgradeOrder: PARAMS.upgradeOrder }, speed: { upgradeOrder: ['plating', 'armor', 'servos', 'nanites', 'laser_damage', 'laser_charge', 'jets',
    'lightning_efficiency', 'gun_damage', 'gun_rate', 'lightning_range', 'lightning_chain', 'gyros', 'gun_mag', 'capacitor', 'reactor', 'gun_velocity', 'sensors',
    'mortar_damage', 'mortar_splash', 'mortar_rate', 'laser_pierce'] } },                                          // P7
  ffaDropGate: { off: { ffaDropGate: false }, on: { ffaDropGate: true } },                                      // F1 (FFA only)
  finalPoint: { off: { finalPoint: false }, on: { finalPoint: true } },                                         // Z5 (FFA only)
  ffaTwo: { off: { ffaTwo: false }, on: { ffaTwo: true } },                                                     // Z8 (FFA only)
  ffaThree: { off: { ffaThree: false }, on: { ffaThree: true } },                                               // Z9 (FFA only)
  ffaGate: { off: { ffaGate: false }, on: { ffaGate: true } },                                                  // Z10 (FFA only)
  // build R4a (notes/build_spec_r4.md section 2): the first option of each is the R3a2 behaviour
  hunt: { off: { hunt50: false, h50Pulse: false }, h50: { hunt50: true, h50Pulse: true }, lite: { hunt50: true, h50Pulse: false } },   // H / HL
  seek: { off: { seekOn: false }, on: { seekOn: true } },
  aggr: { off: {}, h70: { unengagedHpf: 0.7, unengagedS: 8, h50SeekHpf: 0.7 }, any70: { unengagedHpf: 0.7, unengagedS: 0, h50SeekHpf: 0.7 },
    any70f: { aggrFw: true, aggrHpf: 0.7, aggrS: 0, h50SeekHpf: 0.7 } },   // KB line (off / h70 / any70 verbatim) + R7a any70f
  // build R6 RB4 (amendment A3 count gate: 0 campus-limit nulls over sim squad 1-40 + FFA 411-414, V4 and KS) -> on in every build; off = R4a
  pocketCfg: { off: { pocketCfg: false }, on: { pocketCfg: true } },
  // build R7a: IO8 merge of skipped observations (bot.js) as a switch for bisecting; on in every build
  ioMerge: { off: { ioMerge: false }, on: { ioMerge: true } },
  anchorCfg: { on: { anchorCfg: true }, off: { anchorCfg: false } },          // R7a bisect: off = the R4a constants (no RB2-RB5)
  warmPocket: { on: { warmPocket: true }, off: { warmPocket: false } },       // R7a bisect: off = the R4a rehearsal point (no RB6)
  // build_spec_r7 3.7 final bundle (FFA only): FB1 ffaProx 45 / 60 / 75 -> 70 / 70 / 80, FB2 ffaHealExit 0.9 -> 1.0
  fb: { off: {}, on: { ffaProx: [70, 70, 80], ffaHealExit: 1.0 } },
  // build R7a LX (panel r7 engineer) and LC (R5 DS 4.4): the first option is today
  loseExit: { off: { loseExitS: 0 }, on: { loseExitS: 1.0 } },
  loseCover: { off: { loseCoverNear: false }, near: { loseCoverNear: true }, near10: { loseCoverNear: true, lcCoverS: 1.0 }, near20: { loseCoverNear: true, lcCoverS: 2.0 }, low15: { loseCoverNear: true, lcLowHpf: 0.15 }, low10: { loseCoverNear: true, lcLowHpf: 0.10 }, low15c10: { loseCoverNear: true, lcLowHpf: 0.15, lcCoverS: 1.0 }, low10c10: { loseCoverNear: true, lcLowHpf: 0.10, lcCoverS: 1.0 }, low05: { loseCoverNear: true, lcLowHpf: 0.05 }, never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }, c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }, low0: { loseCoverNear: true, lcLowHpf: 0 }, c05l05: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.05 }, c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 } },
  oneHit: { off: {}, on: { lose1Hpf: 0.2, lose2Hpf: 0.25, lose3Hpf: 0.3 } },
  fightOn: { off: {}, fin30: { finishHpf: 0.3 }, fin3t: { finishThreats: 3 }, ls35: { lastStandHpf: 0.35 } },
  // build R7a FIN (build_spec_r7 3.2): 'ttk' = FINa, the losing() half only (finTtkS 3.0); 'ttkb' = FINa + FINb (the
  // decideMode / selectTarget half; drawn only if FINa is kept)
  finish: { off: { finTtk: false, finB: false }, ttk: { finTtk: true, finB: false }, ttkb: { finTtk: true, finB: true } },
  // build R7a CR (build_spec_r7 3.2 #9): the seek's prey crowd radius
  seekCrowd: { off: {}, wide: { h50CrowdR: 120 } },
  // build R7a LG (R5 3.2, GP I1, with the r7 grab-yield amendment); 'wide45' = the red-team cap (suppression share > 30%)
  laserGrab: { std: { grabLaserWide: false }, wide: { grabLaserWide: true }, wide45: { grabLaserWide: true, lgUntilT: 45 } },
  // build R7a ISO (R5 3.1, GP I3)
  isolate: { any: { isoNear: 0 }, near: { isoNear: 12 } },
  // build R7a (moderator 21:58): heal doctrine preset, applied last
  // HF = 'full' (build_spec_r7 3.2 #10): exit 1.0 in the SQUAD posture only (hfExit), so the FFA exit stays max(healExit, ffaHealExit)
  // practice profile (lib/prof.js): 'p26' = the clean-room practice rebuild, SQUAD posture behind hunt.firewall()
  prof: { off: { prof: 'off' }, p26: { prof: 'p26' } },
  healDoc: { off: {}, on: { healEnterHp: 0.7, healExit: 0.8 }, full: { healEnterHp: 0.7, hfExit: 1.0 }, low: { healEnterHp: 0.40 }, lowx: { healEnterHp: 0.40, hfExit: 0.55 }, x60: { hfExit: 0.6 } },
  // every R3a2 switch at once (applied last): 'off' = the 5.02 build (S01-full)
  r3a2: { on: {}, off: { fightEarly: false, openFarm: true, openFarmAim: false, laserEcon: false, rPrefLaser: 150, laserLo: 125, laserHi: 185, laserBackOff: 125, laserBoostAway: 90,
    focusAdd: false, pulseRetreat: false, boostSpend: false, farmHp: 0.9, upgradeOrder: PARAMS.upgradeOrder,
    ffaDropGate: false, finalPoint: false, ffaTwo: false, ffaThree: false, ffaGate: false } },
  // every pass 2b switch at once (applied last): 'off' = the pass 2a behaviour
  io: { v4: { ioLead: false, ioLaserLat: false, ioSlewGate: false, ioReload: false }, lead: { ioLead: true }, laser: { ioLaserLat: true }, reload: { ioReload: true }, all: { ioLead: true, ioLaserLat: true, ioSlewGate: true, ioReload: true } },
  pass2b: { on: {}, off: { stealOn: false, crateGateOn: false, scanOn: false, headAimOn: false, headAimGun: false, aimCalOn: false, openFarm: false,
    cxFinish: false, cxKiterRamp: false, cxBrawler: false, ffaThirdFix: false, ffaBreakFix: false, hidePlanCap: false } },
}
export const SELECT = { laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto',
  ffaCounters: 'on', ffaRules: 'on', aimDwell: 'off',
  R1: 'on', crateGate: 'ffa', R2: 'on', R3: 'on', aimCal: 'off', openFarm: 'on', cxFinish: 'on', cxKiterRamp: 'on', cxBrawler: 'off', ffaThirdFix: 'on', ffaBreakFix: 'on', hidePlanCap: 'on',
  pass2b: 'on',
  fightEarly: 'on', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'spend', upg: 'std',
  ffaDropGate: 'on', finalPoint: 'on', ffaTwo: 'on', ffaThree: 'on', ffaGate: 'on',
  hunt: 'off', seek: 'on', aggr: 'any70f',
  r3a2: 'on', pocketCfg: 'on', io: 'v4', ioMerge: 'on', loseExit: 'off', loseCover: 'never', oneHit: 'off', fightOn: 'off', finish: 'off', isolate: 'any', seekCrowd: 'off', laserGrab: 'std', anchorCfg: 'on', warmPocket: 'on', fb: 'on', healDoc: 'off', prof: 'p26' }
/** The 5.02 build (S01-full, a2fb4793): SELECT entries of every preset that R3a2 changed, at their 5.02 values. */
export const SELECT_502 = { laserRange: 'far', farmHp: '90', fightEarly: 'off', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'off', upg: 'std',
  ffaDropGate: 'off', finalPoint: 'off', ffaTwo: 'off', ffaThree: 'off', ffaGate: 'off' }

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
