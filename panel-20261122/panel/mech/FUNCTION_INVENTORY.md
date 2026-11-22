# P26 decision-function inventory

Baseline: `3417f9965d2bfc3133ddf7d43cd86bcef6dbd79b`; readable source is `handoff/.cache/ws/variants7/P26_all/bot`. Its fresh Bun 1.4.4 bundle exactly matches the remotely verified Git blob. `MX_p26` alone is a template with the profile disabled and is not the correct baseline.

This table inventories 409 baseline named function declarations, class/object methods and named top-level/factory arrows in all 20 source modules including the entry point. The two candidate additions are shown separately. Inline anonymous callbacks are represented by their containing function. Inventory coverage does not imply that every function has an isolated unit proof or that every path was executed. Changed-path reasoning and evidence are in `MECH_REVIEW.md`; unchanged path statuses below distinguish detailed source review from interface/behavior coverage. Final receipts identify the corrected bundle hashes and the 07:37:10–07:37:23 UTC conformance window.

## bot.js

JSONL protocol, fallback/sanitizer, dynamic initialization, newest-observation handling and process exit.

Unchanged; both candidate bundles pass the official 300-observation checker.

| Function | Baseline source line | Kind |
|---|---:|---|
| `log` | 13 | named arrow |
| `send` | 14 | named arrow |
| `fallbackAct` | 30 | function |
| `num` | 70 | named arrow |
| `r4` | 71 | named arrow |
| `sanitize` | 73 | function |
| `init` | 100 | function |
| `decide` | 126 | function |
| `handle` | 160 | function |
| `pump` | 185 | function |

## lib/aim.js

Pure ballistics, angular arithmetic, body gates and deterministic RNG.

Unchanged; numerical/source review. Gun intercept solves the muzzle-offset quadratic. No numerical reimplementation was needed for the current candidate.

| Function | Baseline source line | Kind |
|---|---:|---|
| `wrapPi` | 10 | function |
| `angDiff` | 17 | function |
| `clamp` | 21 | function |
| `intercept` | 32 | function |
| `aimAt` | 56 | function |
| `mortarSolve` | 68 | function |
| `shellImpact` | 98 | function |
| `closestApproach` | 119 | function |
| `slewTime` | 129 | function |
| `onTarget` | 137 | function |
| `dirOf` | 144 | function |
| `laserFrac` | 154 | function |
| `makeRng` | 159 | function |

## lib/aimcal.js

Bounded online aim/latency calibration from observed releases and hits.

Unchanged; effects remain guarded by existing parameters. These estimates are not calibrated match-win probabilities.

| Function | Baseline source line | Kind |
|---|---:|---|
| `ok3` | 15 | named arrow |
| `makeAimCal` | 17 | function |
| `onRelease` | 22 | function |
| `yaw` | 23 | named arrow |
| `pitch` | 24 | named arrow |
| `lat` | 25 | named arrow |
| `sense` | 27 | function |

## lib/brain.js

Config normalization, startup, state construction, stage arbitration, leg priorities, exception safety and action output.

Unchanged; full action replay/stress gate. Environment classification is updated in stance after the earlier p26 firewall decision; this preexisting one-decision ordering remains a documented follow-up.

| Function | Baseline source line | Kind |
|---|---:|---|
| `isObj` | 49 | named arrow |
| `mergeNum` | 50 | function |
| `normalizeConfig` | 55 | function |
| `warmBodies` | 70 | function |
| `warmUp` | 84 | function |
| `wp` | 105 | named arrow |
| `saltHash` | 136 | function |
| `anchorToConfig` | 152 | function |
| `has` | 153 | named arrow |
| `set` | 154 | named arrow |
| `createBrain` | 182 | function |
| `now` | 271 | named arrow |
| `fuse` | 278 | function |
| `evalMaybe` | 284 | function |
| `nearCalm` | 294 | function |
| `counterAdvice` | 304 | function |
| `postLegs` | 325 | function |
| `holdLegs` | 357 | function |
| `retreatLegs` | 402 | function |
| `fightLegs` | 446 | function |
| `applyVetoes` | 544 | function |
| `legs` | 550 | function |
| `finishLegs` | 595 | function |
| `stage` | 606 | function |
| `build` | 610 | function |
| `chargeHold` | 632 | function |
| `act` | 637 | function |
| `debugState` | 691 | function |

## lib/counters.js

Bounded behavior features, heuristic archetypes and FFA-only advice.

Unchanged; protected by forced-FFA identity. Confidence labels are heuristic scores, not statistical probabilities.

| Function | Baseline source line | Kind |
|---|---:|---|
| `num` | 148 | named arrow |
| `fin` | 149 | named arrow |
| `vec` | 150 | function |
| `ramp` | 155 | function |
| `wrapPi` | 160 | function |
| `clamp` | 164 | named arrow |
| `newSlot` | 166 | function |
| `newAdvice` | 195 | function |
| `createCounters` | 201 | function |
| `slotOf` | 226 | named arrow |
| `slotFor` | 227 | function |
| `update` | 235 | function |
| `step` | 239 | function |
| `observe` | 351 | function |
| `rate` | 483 | named arrow |
| `features` | 484 | function |
| `score` | 504 | function |
| `classify` | 578 | function |
| `liveConf` | 601 | function |
| `archetypeOf` | 607 | function |
| `ctxBool` | 617 | function |
| `ctxNum` | 618 | function |
| `neutralBand` | 620 | function |
| `fillNeutral` | 627 | function |
| `counter` | 637 | function |
| `adviceFor` | 710 | function |
| `threatRank` | 751 | function |
| `debugState` | 787 | function |

## lib/economy.js

Weapon desirability, loot/grab/drop planning, movement, pickup/drop actions and upgrade selection.

Unchanged; P26 delegates economic goals to prof.js. pathEst is an approximate multiplier, not a shortest-path proof.

| Function | Baseline source line | Kind |
|---|---:|---|
| `rankOf` | 8 | named arrow |
| `makeEconomy` | 10 | function |
| `wantPickup` | 17 | function |
| `reachable` | 45 | function |
| `nearDrone` | 56 | function |
| `pathEst` | 61 | function |
| `nearestMechD` | 65 | function |
| `ffaBlocked` | 76 | function |
| `chooseLoot` | 90 | function |
| `cubesWanted` | 154 | function |
| `isKillCube` | 161 | function |
| `killReachOk` | 172 | function |
| `chooseGrab` | 179 | function |
| `chooseDrop` | 223 | function |
| `update` | 253 | function |
| `lootStillThere` | 261 | function |
| `lootLegs` | 268 | function |
| `grabLegs` | 301 | function |
| `dropLegs` | 317 | function |
| `hands` | 324 | function |
| `pick` | 340 | function |

## lib/ffa.js

Final free-for-all timing, threat/duel/counter rules, exposure breaks and end-zone positioning.

Unchanged; all named functions covered by inventory and the protected FFA action-stream gate, not individually proved.

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeFfa` | 22 | function |
| `on` | 28 | named arrow |
| `chargeTime` | 31 | function |
| `hideLeft` | 39 | function |
| `hideReach` | 51 | function |
| `laserReady` | 60 | function |
| `peekRef` | 61 | function |
| `peekOpen` | 62 | function |
| `peekIn` | 75 | function |
| `prox` | 83 | function |
| `offAim` | 85 | function |
| `othersNear` | 86 | function |
| `readIs` | 95 | function |
| `isHider` | 100 | named arrow |
| `isRusher` | 101 | named arrow |
| `reverser` | 104 | function |
| `update` | 117 | function |
| `nominalDps` | 176 | function |
| `twoUpdate` | 189 | function |
| `closeOpening` | 199 | function |
| `duelP` | 217 | function |
| `gateOk` | 222 | function |
| `exitT` | 227 | function |
| `finalPick` | 234 | function |
| `pointSide` | 251 | function |
| `gatePost` | 269 | function |
| `firstShotOk` | 287 | function |
| `breakUpdate` | 319 | function |
| `threatsForBreak` | 374 | function |
| `hiddenAt` | 384 | function |
| `fillCand` | 393 | function |
| `settleStep` | 407 | function |
| `relocStep` | 420 | function |
| `breakLegs` | 441 | function |
| `lightLegs` | 481 | function |
| `beamHideLegs` | 511 | function |
| `boostVeto` | 524 | function |
| `raceOn` | 532 | function |

## lib/firecontrol.js

Predicted shooter/target positions, torso slew, line checks, weapon gates, laser ownership and reload.

Geometry candidate changes muzzleClear and run and adds the geometry predicate inside makeFireControl. Other function bodies remain byte-identical. The fresh predicate rechecks the live hunt firewall after stance can update FFA state; six targeted stale-profile transition cases preserve baseline behavior.

| Candidate addition | Purpose | Focused evidence |
|---|---|---|
| `geometry` | Enable only the new geometry paths when the cached P26 flag and current firewall both permit them | FFA and foreign-death transition cases, near-barrel and laser-rung probes |

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeFireControl` | 6 | function |
| `predictSelf` | 19 | function |
| `airZ` | 42 | function |
| `gunLatency` | 53 | function |
| `gunSolve` | 56 | function |
| `muzzleClear` | 91 | function |
| `predYaw` | 104 | function |
| `predPitch` | 105 | function |
| `scan` | 107 | function |
| `pitchTo` | 142 | function |
| `ffaR` | 147 | named arrow |
| `run` | 149 | function |

## lib/hunt.js

Squad firewall, burst/TTK model, pursuit and sound/kill objectives.

Unchanged; the firewall is preserved. TTK remains a model with uncertain hit rates and target armor.

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeHunt` | 16 | function |
| `on` | 19 | named arrow |
| `firewall` | 29 | function |
| `laserIn` | 33 | named arrow |
| `lightZaps` | 34 | function |
| `gunOk` | 39 | function |
| `burst3` | 44 | function |
| `ttk` | 57 | function |
| `hitAt` | 83 | function |
| `reserveOk` | 87 | function |
| `readSounds` | 93 | function |
| `pre` | 106 | function |
| `post` | 155 | function |
| `loaded` | 163 | function |
| `spent` | 167 | function |
| `finishLine` | 171 | function |
| `killCube` | 172 | function |
| `pulseUpdate` | 178 | function |
| `preyOk` | 206 | function |
| `reachable` | 209 | function |
| `preyCostOf` | 220 | function |
| `updatePrey` | 235 | function |
| `soundGoal` | 249 | function |
| `ringGoal` | 274 | function |
| `seekLegs` | 301 | function |

## lib/io.js

Merge transient observation events when backlog is collapsed.

Unchanged; recorded-stream checker/driver tick and exit checks apply. Backlog/stall injection was not part of the final timing window.

| Function | Baseline source line | Kind |
|---|---:|---|
| `aged` | 10 | function |
| `mergeSkipped` | 20 | function |

## lib/mover.js

Bounded path following, strafing, acceleration-aware bullet dodge, zone feasibility, hop/jet and stuck handling.

Unchanged; source review. Hostile agents do not satisfy reciprocal avoidance assumptions. Final-scale movement efficacy is not inferred from protocol replay.

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeMover` | 10 | function |
| `isAbandoned` | 22 | function |
| `plan` | 25 | function |
| `clampArena` | 47 | function |
| `moveTo` | 57 | function |
| `walkable` | 95 | function |
| `flip` | 110 | function |
| `standoff` | 121 | function |
| `bulletMiss` | 165 | function |
| `dodgeScore` | 182 | function |
| `bulletDodge` | 194 | function |
| `dodgeHeld` | 238 | function |
| `dodgeW` | 240 | function |
| `blend` | 241 | function |
| `zoneGoal` | 252 | function |
| `lateLeash` | 298 | function |
| `leashStrafe` | 307 | function |
| `hopPlanCfg` | 321 | function |
| `inPocket` | 334 | function |
| `zoneCheck` | 342 | function |
| `pocketExit` | 389 | function |
| `boostOk` | 432 | function |
| `zoneLegs` | 439 | function |
| `shellDodge` | 449 | function |
| `stuckCheck` | 492 | function |

## lib/nav.js

Terrain/clearance graph, body-size updates, component labeling, bounded A-star, line and hop queries.

Unchanged spatial infrastructure; interface/source inspection and actual-map replay. No new formal geometry-equivalence claim.

| Function | Baseline source line | Kind |
|---|---:|---|
| `constructor` | 34 | method |
| `cx` | 85 | method |
| `cy` | 86 | method |
| `idx` | 88 | method |
| `cellX` | 93 | method |
| `cellY` | 94 | method |
| `_build` | 99 | method |
| `_buildGround` | 113 | method |
| `_buildCover` | 139 | method |
| `_blockedAt` | 182 | method |
| `_buildLevels` | 193 | method |
| `_buildRefLevels` | 243 | method |
| `_buildWalls` | 273 | method |
| `_edgePass` | 321 | method |
| `_buildSlopes` | 348 | method |
| `setBody` | 416 | method |
| `_label` | 441 | method |
| `passable` | 479 | method |
| `canStep` | 485 | method |
| `wallDistAt` | 497 | method |
| `levelAt` | 510 | method |
| `passableAt` | 515 | method |
| `nearestPassableIdx` | 521 | method |
| `nearestPassable` | 543 | method |
| `component` | 553 | method |
| `reachable` | 574 | method |
| `_line` | 587 | method |
| `walkLine` | 637 | method |
| `_search` | 646 | method |
| `findPath` | 737 | method |
| `pathLength` | 852 | method |
| `_hopCandidates` | 865 | method |
| `hopPlan` | 917 | method |
| `nextWaypoint` | 956 | method |

## lib/params.js

Defaults, named preset composition and override resolution.

Unchanged. Actual P26_all SELECT enables prof:p26 and retains the all-ones salt table.

| Function | Baseline source line | Kind |
|---|---:|---|
| `resolveParams` | 338 | function |

## lib/prof.js

P26 hostility, target/range/TTK heuristics, economy, mode and fire hooks.

Capture candidate changes chooseDrop, chooseLoot, decideMode and adds dropPlan; other functions remain byte-identical.

| Candidate addition | Purpose | Focused evidence |
|---|---|---|
| `dropPlan` | Keep authoritative holder/progress, separate banked ownership from known contest, estimate arrival and remaining capture, and filter a narrow already-lost foreign race | Foreign holder, known frozen clock, nearby contest, unheld drop, own full-health capture, finish priority and contestant leave/reenter cases |

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeProf` | 24 | function |
| `cnt` | 45 | named arrow |
| `memOf` | 47 | function |
| `ign` | 52 | named arrow |
| `update` | 58 | function |
| `hostile` | 91 | function |
| `hitOwnCurve` | 98 | named arrow |
| `hitFoe` | 99 | named arrow |
| `hitOwn` | 100 | function |
| `ownDps` | 107 | function |
| `foeDps` | 116 | function |
| `prefRange` | 127 | function |
| `strength` | 137 | function |
| `legal` | 144 | function |
| `selectTarget` | 152 | function |
| `fireTarget` | 228 | function |
| `cubesWanted` | 235 | function |
| `mechNear` | 242 | function |
| `mechInView` | 247 | function |
| `pathOk` | 253 | function |
| `sameComp` | 266 | function |
| `chooseDrop` | 276 | function |
| `chooseGrab` | 295 | function |
| `chooseLoot` | 326 | function |
| `econUpdate` | 374 | function |
| `stillThere` | 390 | function |
| `decideMode` | 399 | function |
| `boostIf` | 456 | function |
| `legs` | 457 | function |
| `fightLegs` | 487 | function |
| `lootLegs` | 508 | function |
| `afterLegs` | 543 | function |
| `crateShot` | 551 | function |
| `wantReload` | 574 | function |
| `laserVeto` | 585 | function |

## lib/scan.js

Sector memory, late sweeping, look hints and rear-hit facing.

Unchanged; full pipeline replay and crafted fire contexts protect interfaces.

| Function | Baseline source line | Kind |
|---|---:|---|
| `centre` | 14 | named arrow |
| `secOf` | 15 | named arrow |
| `makeScanner` | 17 | function |
| `half` | 26 | function |
| `sense` | 28 | function |
| `late` | 54 | function |
| `active` | 58 | function |
| `look` | 61 | function |
| `rearPick` | 114 | function |
| `reset` | 124 | function |

## lib/senses.js

Sanitized live self/track/event/beam/projectile/loot/drop/zone state and bounded rolling statistics.

Unchanged; synthetic malformed observations and missing/bad configs exercise sanitation, low energy and zone boundaries.

| Function | Baseline source line | Kind |
|---|---:|---|
| `fnum` | 7 | named arrow |
| `cnum` | 8 | named arrow |
| `vecOk` | 12 | function |
| `newRing` | 18 | function |
| `ringPush` | 19 | function |
| `ringSum` | 21 | function |
| `newSelf` | 29 | function |
| `newTrack` | 44 | function |
| `senseSelf` | 63 | function |
| `senseTracks` | 156 | function |
| `senseEvents` | 238 | function |
| `senseBeams` | 305 | function |
| `laserBeamSeen` | 327 | function |
| `remember` | 340 | function |
| `forget` | 358 | function |
| `senseShells` | 373 | function |
| `attribute` | 402 | function |
| `senseSounds` | 420 | function |
| `senseZone` | 438 | function |
| `zoneSlack` | 454 | function |
| `timeUntilOutside` | 465 | function |
| `sense` | 482 | function |
| `byDist` | 518 | named arrow |
| `makeGunStat` | 521 | function |
| `band` | 523 | named arrow |

## lib/stance.js

Environment latch, combat stance hysteresis, first-shot restraint, ambush and covered escape.

Unchanged; forced-FFA identity required. Practice/final distinction remains a heuristic runtime classifier, not match-mode disclosure.

| Function | Baseline source line | Kind |
|---|---:|---|
| `makeStance` | 11 | function |
| `environment` | 29 | function |
| `advantage` | 73 | function |
| `chooseStance` | 84 | function |
| `setStance` | 132 | function |
| `applyStance` | 137 | function |
| `update` | 169 | function |
| `idleLegs` | 176 | function |
| `ambushUpdate` | 190 | function |
| `fightLegs` | 222 | function |
| `escapeLegs` | 240 | function |

## lib/steal.js

Observed farming/death/loot opportunities, capture races, third-party decisions and state cleanup.

Unchanged; P26 uses only selected existing fire/economy hooks. No new opponent source was used.

| Function | Baseline source line | Kind |
|---|---:|---|
| `fin` | 20 | named arrow |
| `vec3` | 21 | named arrow |
| `makeSteal` | 24 | function |
| `sense` | 39 | function |
| `note` | 109 | function |
| `seesPoint` | 127 | function |
| `senseDeaths` | 137 | function |
| `mechNear` | 177 | function |
| `gateOn` | 183 | named arrow |
| `farmOk` | 185 | function |
| `crateFireOk` | 193 | function |
| `race` | 197 | function |
| `dropOk` | 217 | function |
| `deathItem` | 243 | function |
| `thirdParty` | 267 | function |
| `gatesOk` | 277 | function |
| `speedFor` | 292 | function |
| `choose` | 298 | function |
| `start` | 338 | function |
| `planSpot` | 347 | function |
| `stillValid` | 386 | function |
| `abandon` | 394 | function |
| `legs` | 402 | function |
| `keep` | 457 | function |
| `busyWith` | 466 | function |
| `beingShot` | 471 | function |
| `aimExplained` | 477 | function |
| `debug` | 489 | function |

## lib/tactics.js

Threat estimates, non-P26 targets/modes, finishing, hide search and position scoring.

Unchanged; P26 bypasses some policy functions but shares assessment/position infrastructure. Incoming/outgoing rates remain estimates.

| Function | Baseline source line | Kind |
|---|---:|---|
| `rangeBin` | 10 | function |
| `assess` | 16 | function |
| `bandFor` | 105 | function |
| `ofAnswer` | 128 | function |
| `burstDamage` | 134 | function |
| `finUpdate` | 151 | function |
| `closingV` | 179 | function |
| `engaged` | 184 | function |
| `selectTarget` | 202 | function |
| `setTarget` | 373 | function |
| `losing` | 391 | function |
| `losingRaw` | 406 | function |
| `pulseLosing` | 436 | function |
| `decideMode` | 453 | function |
| `fillThreats` | 512 | function |
| `put` | 538 | function |
| `newThreats` | 543 | function |
| `inArena` | 545 | function |
| `exposure` | 553 | function |
| `makeHideSearch` | 563 | function |
| `start` | 576 | function |
| `isBad` | 582 | function |
| `markBad` | 586 | function |
| `hidden` | 591 | function |
| `awaySide` | 601 | function |
| `okStatic` | 611 | function |
| `run` | 625 | function |
| `maintain` | 654 | function |
| `makePosEval` | 680 | function |
| `evaluate` | 688 | function |

## lib/world.js

Map loading, terrain decoding, spatial indexing, collision/vision rays and terrain traversal.

Unchanged; the new barrel-prefix gate reuses shotClear instead of introducing another geometry implementation.

| Function | Baseline source line | Kind |
|---|---:|---|
| `pointInEdges` | 20 | function |
| `pointInPrism2D` | 33 | function |
| `distToPrismEdge2D` | 40 | function |
| `toHeights` | 56 | function |
| `loadSync` | 74 | method |
| `constructor` | 103 | method |
| `_buildTerrainBlocks` | 202 | method |
| `_buildCSR` | 226 | method |
| `_cellOf` | 243 | method |
| `_nextStamp` | 249 | method |
| `ground` | 259 | method |
| `surfaceZ` | 270 | method |
| `surfacePrism` | 285 | method |
| `ceilingZ` | 300 | method |
| `prismAt` | 315 | method |
| `inSolid` | 329 | method |
| `bodyBlocked` | 339 | method |
| `rayShot` | 374 | method |
| `raySight` | 377 | method |
| `shotClear` | 380 | method |
| `canSee` | 383 | method |
| `sightClear` | 386 | method |
| `transmittance` | 389 | method |
| `_cast` | 398 | method |
| `canopyChord` | 551 | method |
| `_rayTerrain` | 612 | method |
