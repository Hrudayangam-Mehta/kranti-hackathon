# Mech pressure and weapon-cycle integration: independent backend review

## Decision and scope

The reviewed pressure/weapon composition is source-accepted, including the pressure-only laser-veto correction. Exact snapshots are in `pressure-backend-review.sources.json`. This reviewer traced the new policy functions and their callers in the brain, profile, movement, fire-control, equipment and observation stages. The weapon policy has separately been reread through the final `84e082f5fccd68e395756191538ac922e289f5e31449bc622415a343136ab8c2` pickup change; the matching economy SHA-256 is `db9a988ca1134ba7de3b4be2cc29734b07d56280705bf136625a7b80fe5e18f0`. An integration source must contain that paired change before those last pickup findings apply to it.

This is independent source review. The implementation authors' bounded macro, integrated-brain, weapon, protocol and timing receipts are separate evidence. This reviewer did not run duplicate CPU jobs during Shopping capacity measurements. A protocol replay validates the action interface against prerecorded observations; it cannot measure the opponents' response to new attacks or establish placement improvement.

## Corrected concrete findings

The earlier cycle-ready review found that a desired aiming inset was incorrectly reused to collect lightning blockers. A nearer crate or neutral at 13 degrees could be omitted. That correction now separates physical blocker collection from desired-target alignment, preserves line of sight, and refuses an ambiguous nearest-object tie. The wider blocker cone is intentionally conservative because the public protocol's angle wording does not precisely define a half-angle convention.

The pressure audit found that `firecontrol::run` still called the old profile's `laserVeto` before starting a charge. That predicate blocked charging whenever any listed lightning carrier closed faster than 4 m/s from 46–68 m, including an enemy other than the selected target. This is tactical avoidance rather than a physical cooldown. `pressure::wrapProfile` now forwards the original veto before commitment and returns false after commitment. Actual cooldown, range, LOS, aim, charge and mobility conditions remain. The author added both a macro before/after case and an integrated case with a separate approaching carrier.

A second integration boundary was corrected by copying the final weapon/economy pair together. The new `preparePickups` call cannot be installed with an older policy lacking that method. The prep stage only evaluates nearby full-slot choices when a target context exists; the final hands stage still determines whether a currently reachable pickup can be requested. It does not move the mech, invent an item, or warm a null answer over the empty-slot/no-target fallback.

## Function and stage audit

| Function / boundary | Traced behavior | Status |
|---|---|---|
| `brain::mergeConfig` | Retains live upgrade descriptions for the armor bound used by the weapon policy. It does not replace observed weapon statistics with defaults. | Accepted. |
| `brain::createBrain` | Constructs the weapon policy before movement, uses a separate seeded random stream, and wraps the profile once. Enabling varied dodges does not consume the existing movement RNG. | Accepted. |
| `brain::act` assessment | Observations and profile state refresh first; pressure selection then determines the current combat target. Once pressure is active, legacy hunt/finishing target selection is skipped. | Accepted. |
| `pressure::update` | Latches after the configured setup evidence or armed deadlines. The latch remains active through low health and later loadout changes. The pending-offer setup path is an explicit same-decision policy choice. | Accepted as the requested aggressive mode. |
| `pressure::select` | Ranks living, sufficiently recent non-NPC/non-phantom tracks. Approaching range, support, memory age and finish estimates affect rank, while dangerous support does not ban all candidates. Target hysteresis stabilizes close scores. | Accepted as a heuristic, not an optimality or hit-probability claim. |
| `pressure::captureFinish` | Uses observed holder/progress, checks known contest and next-zone slack, and gives an already nearly completed capture a bounded grace period. It does not fabricate progress. | Accepted; the grace is a policy timeout. |
| `pressure::mode` before and after stance | Clears old passive health/FFA fire holds, regeneration latch, disengage state and remote loot objectives. Reapplication after `stance.update` prevents the old first-shot policy from silently restoring a hold. | Accepted. |
| `brain::legs` / `pressure::legs` | Pressure movement precedes ordinary FFA/profile retreat movement. Urgent zone motion, shell dodge and pocket escape still have priority. Nearby loot evaluation does not redirect movement. | Accepted. |
| `pressure::wrapProfile` | Routes firing target, legality, crate rejection and reload to the active policy; bypasses only the old laser avoidance predicate after commitment. | Accepted after the correction. |
| `prof::rungs` / laser geometry | The retained values are body aim samples. Raw pitch, range and prefix-ray checks are physical screens, not health-based permission to attack. | Retain. |
| `pressure::wantReload` and `pressure::hands` | Empty magazines reload; burst mode can refill a nearly empty magazine while a laser is nearly ready. The final hands assignment overrides old quiet-time reload policy in either posture. | Accepted. |
| `weapon_policy::refresh` | Invalidates per-decision answers for weapon-kind, target, environment, zone and pressure-state transitions; clears pending decisions on incompatible context changes. | Accepted. |
| `weapon_policy::pickup` | Observed duplicate kinds are rejected. Empty slots can fill. Full-slot swaps obey the four-second equipment cooldown; fallback without a target rechecks the charged-slot lock. In pressure, both postures may replace a gun when the same capacity advantage is present. | Accepted. |
| `weapon_policy::preparePickups` | Pre-evaluates the benefit of nearby items before the mech reaches take radius. The shortened pressure dwell is one decision, and an observation gap resets old dwell. It never emits take/drop itself. | Accepted. |
| `weapon_policy::pickupLimits` / `economy::hands` | Horizontal reach is no larger than live `loot.pickup_radius`; vertical reach is no larger than the fixed 4 m rule. Hands resets old output, checks age, bad-item cache, distance and slot selection, then chooses the nearest eligible item. | Accepted. |
| `brain::build` | Emits `take` only for a selected pickup and `drop` only for slot 0/1. Filling an empty slot omits `drop`. A failed hands stage clears all one-shot equipment actions. | Accepted. |
| `weapon_policy::capacity` | Uses live held cooldown, reload, charge, range and damage; incoming equipment pays equip time, and an unobserved dropped gun pays a reload delay. Capacity remains a four-second tactical estimate. | Accepted with uncertainty below. |
| `weapon_policy::laserAim` | Preserves full-charge aim ownership; partial charge may coexist with a ready gun; a gun finishing claim uses the conservative configured armor bound. | Accepted. |
| `weapon_policy::energyOk` | Low pressure reserve reaches final lightning admission, while the decision-window pulses and current movement cost are budgeted. | Accepted in the integrated policy, unlike the older standalone pressure fire-control path. |
| `weapon_policy::nearestLightning`, `lightningAligned`, `interruptAim` | Select the actual nearest modeled object, preserve solid LOS and tie safety, and do not steal the aim of a committed or full beam. | Corrected source accepted. |

## Corrected flight-policy interaction and retained physical rules

The review found an interaction between the burst movement band's approximately 78 m preferred range and the old FFA-only 0.3-second reverser flight cap. An outward-moving target can require slightly more than 0.3 seconds of bullet flight while movement already considers the range satisfactory. This is a tactical firing restriction, not a server limit. After considering that concrete case, the coordinator approved bypassing only the FFA specialization after commitment.

The final reviewed condition is `if (tgt && ffaR() && !B.pressureActive)`. Before pressure, the original FFA behavior remains. After pressure, the ordinary `sol.t <= P.gunFlightMax || steady` accuracy condition remains, as do ammunition/reload, cooldown, physical range, solid LOS and final predicted aim. This change neither declares every long shot feasible nor sends fire unconditionally. The implementation author's band-boundary fixture is separate test evidence.

The off-axis laser-charge behavior is already readiness-aware: a ready aligned gun or a laser aim takeover suppresses the unnecessary off-axis command. The first-shot courtesy offset requires a held fire decision, which active pressure clears. Scan courtesy is used without an actionable combat target. None of these is a hidden health-based attack veto in the reviewed active path.

`noCharge` is reset at the start of each movement pass. In the active path it is set by urgent zone movement, shell dodge or a pocket escape. Preserve those mobility needs. The inherited charge handling is nuanced: a partial beam can be released to recover movement, whereas a near/full charge can still be retained until a clear release or the force timeout. It would be inaccurate to claim that `noCharge` always produces immediate full-speed movement, or that the bot never releases an unaligned beam.

Actual ammunition, reload/equip delay, cooldown, physical range, live pitch limits, predicted torso alignment, solid geometry and nearest lightning-object constraints remain necessary even in an aggressive policy. Passing those gates is distinct from choosing not to engage a dangerous opponent.

## What the damage estimates know

The observation supplies our current weapon/mech statistics and, when configured visible, enemy HP. It does not supply every opponent's armor upgrades, hidden ammunition, future steering or exact reaction. `senses` updates provided HP and otherwise retains prior/default values. Therefore a number in the track is not automatically a fresh HP observation.

The pressure damage-rate and burst functions now scale by configured baseline armor. Further unknown opponent upgrades, projectile evasion, aim latency, LOS changes and shared torso ownership can still reduce realized damage. Lightning burst capacity also assumes energy that movement may spend. `finish`, `secure` and `killNow` are tactical estimates rather than probabilities or guaranteed kills. The separate gun-versus-laser ownership test has a stronger configured armor bound, but it is still conditional on its alignment and target-state assumptions. The existing early laser-release estimate should not be advertised as a proven lethal threshold.

## Reward and evaluation contract

The current [official Mech track](https://www.joinbuilders.org/buildathon/tracks/builders) scores the mean of `16 - place`. The owner's reported 5.47 corresponds to an approximate mean placement of 10.53; a 7.5 target corresponds to 8.5. Those are algebraic conversions of the metric, not a prediction that these policies will achieve the target. The practice opponent pool is a cooperating house squad, while qualification/final matches are free-for-all, so a single combat hypothesis need not improve both environments.

The [official announcements](https://www.joinbuilders.org/buildathon/leaderboard) state that builders-4 uses 96 private random seeds and identical code keeps its first builders-4 score. Repeated identical submissions therefore do not supply independent fresh-seed score samples. Distinct policy variants can be scored, but their different random seeds make a small score difference insufficient to prove causation. Protocol replay, source reasoning and fixed-state action tests support validity and the intended behavioral transitions; only reactive match results measure the placement objective.

The bounded top-five repository-attribution check is in `public-top-five-access.json`. The official public leaderboard exposes no scored commit mapping in its retrieved HTML. A third-party rogue_agi repository lead returned 404, and no access bypass was attempted. No unverifiable repo was treated as a top-five submission and no competitor source was incorporated.

## Frozen integrated source acceptance

The independent reviewer recomputed and verified both final source inventories and bundle hashes. `pressure-source-acceptance.json` is the acceptance manifest. The two candidate JavaScript trees differ only in `lib/params.js`: the pressure/burst mode and dodge-variety settings. Both contain the same checked pressure core, weapon/equipment pair and narrowly scoped firing corrections.

- Sustained-pressure bundle: `609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797`.
- Burst-cycle bundle: `deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d`.
- Shared pressure core: `b5206c933040c9f3e09ec07f627d59e0aa2f31bea13211417eab03a320be68ea`.
- Shared fire-control source: `628087cf29166d2412359c7993bc74643250ff9d85aa74024b8395fedbdab6b7`.

The final firing-band fixture was also inspected: it compares the existing capture fire-control with the integrated control for a 78 m target retreating at 10 m/s with recent reversals. The active candidate fires, the inactive candidate retains the previous rejection, and a farther unsteady target is still rejected by the base flight gate. This is a concrete behavioral boundary check rather than a test that merely repeats the new condition. Execution is recorded by the implementation author in `pressure-integration-cases.json`.

The author reports 34 macro cases per candidate, 22 integration cases, 5,100 inactive-identity decisions and 2,400 enabled stress decisions per candidate, plus the official 300-observation checks. Those receipts and the algorithm reviewer's final isolated runtime gate must be kept distinct from this source acceptance. They validate the bounded behaviors and action protocol; they do not prove a 7.5 placement score.
