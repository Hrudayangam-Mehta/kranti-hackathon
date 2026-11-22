# Committed pressure and burst pursuit

## Decision and scope

Two separate candidates extend the scored capture parent `099e7e392a863346575d7ef45bb9af3432544329`. The sustained-pressure candidate remains in contact and prioritizes sustained damage, reachable enemies and finishing opportunities. The burst candidate gives greater weight to its estimated next 1.5 seconds of damage, uses a somewhat longer firing band, and circles slightly farther out only while all carried channels recharge. It stays in combat during that interval. Neither candidate has an official score yet. The requested target of 7.5 is an objective, not an estimate or a measured result.

The explicit new behavior applies to both SQUAD and FFA. After setup, ordinary healing, farming, remote supply-drop trips, long waits and low-HP disengagement no longer choose the macro action. Immediate zone movement, navigation/body geometry, pocket escapes, shell avoidance, bullet avoidance, finite action validation and physical firing gates remain. User authorization to accept gameplay risk is the reason for this deliberate policy change.

The two primary trees are `experiments/mech-pressure-cycle` and `experiments/mech-burst-cycle`. They combine the macro with the independently developed ready weapon policy; burst also enables its bounded private-RNG dodge-order variation. The pure `mech-pressure` and `mech-burst-hunter` trees are isolation controls. Source manifests and protocol receipts identify the actual tested revisions; do not infer a final hash from an earlier bundle.

Final frozen bundle hashes are `609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797` for sustained pressure and `deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d` for burst. `pressure-integration-builds.json` pins every source file, patch and conformance receipt. The separate mortar-arc experiment is **not included** in either primary candidate.

## Three review and implementation rounds

| Round | Change and review result | What the evidence establishes |
|---|---|---|
| 1: establish the scored baseline and correct narrow state/geometry errors | Reconstructed the exact P26 source, reviewed fresh-firewall geometry, and corrected supply-drop ownership/contested-progress handling. The user reported geometry scoring 5.31 and capture scoring 5.47; capture is the parent used here. | Those owner-reported scores identify the baseline choice. They do not predict the unsubmitted aggressive candidates. |
| 2: weapon control and physical model review | Replaced a fixed charge-fraction takeover with readiness/slew-aware shared-torso scheduling; added actual-nearest lightning admission, resource-aware triggers, and contextual loadout value including equip/reload delay. Review caught cone membership, stale dwell, unknown pickup ammunition and anti-thrash issues. The bounded mortar arc was isolated and reviewed separately. | The final controller owner's 48 crafted cases and action replay establish the specified state/physics-screen behavior. The isolated mortar fix remains unpromoted. |
| 3: aggressive macro and integrated adversarial review | Added setup-to-commit latching, push/burst target utility, bounded capture completion, active pursuit, upgrades and legal nearby swaps. Review corrected early reload ownership, the old closing-lightning tactical charge veto, and the FFA flight cap that conflicted with the burst firing band. | Final macro, integration, stress and protocol gates pass for the frozen bundles; quiet single-core latency and official scores are separate receipts. |

## Setup and commitment

The normal transition requires a carried laser or lightning weapon and at least one observed actual upgrade. A real pending upgrade offer also qualifies when current cubes have reached the first positive live configured threshold, and the same action chooses a valid offer index. The recorded kit uses a first threshold of one; the implementation reads the configuration rather than fixing that value.

Two deadlines prevent endless setup: an upgraded gun qualifies at 60 seconds, and any carried damaging weapon qualifies at 90 seconds. An empty loadout does not qualify by time alone. Once committed, health loss, an unfavorable damage estimate and weapon loss do not return the bot to setup.

There is one bounded continuation of the scored capture idea. A bot already holding a landed, visibly uncontested supply ring may finish it if at most 0.6 seconds remain, it is already inside the ring, and the ring remains inside the safe zone. An absolute deadline of the observed remaining time plus one decision prevents repeatedly resetting that grace. It does not seek a remote ring after commitment. Shooting remains allowed while finishing it.

## Original target-ranking equations

The target ranking is deliberately small and bounded. Let `r` be the weapon-dependent preferred range, `a=max(0,d-r)/walk_speed`, `s` the weighted count of nearby other living opponents, `D` the estimated sustained damage rate, and `B1.5` the estimated damage available within 1.5 seconds.

* Sustained pressure: `HP/D + 0.40*a + 0.55*s`.
* Burst pursuit: `2.4*HP/max(1,B1.5) + 0.30*a + 1.1*s`.

Age and missing line of sight add penalties. A blocked destination in a different known navigation component adds 12; a recently abandoned blocked destination adds 10. These are rankings, never combat vetoes. An estimated finishing opportunity reduces the score, and short target hysteresis discourages switching between nearly equal enemies. A separate visible shot target can be used while moving toward the best pursuit target.

`D` and `B1.5` use live carried-weapon damage, ammo, cooldowns, reload, projectile speed, laser charge and energy. Gun readiness is the maximum of remaining cooldown and refill time when refilling; a cooling empty gun cannot appear ready merely because one of those delays is short. The gun estimate includes projectile flight time. The known live base armor factor is applied, bounded between zero and one; the recorded base value is zero. These remain optimistic ranking heuristics: they do not know hidden opponent armor upgrades and do not fully model actual torso slew, terrain uncertainty, future enemy reactions or every tick of energy expenditure. The `finish` label therefore means estimated finish, not a guaranteed kill. Final firing remains subject to the existing physical solutions and the cycle controller.

The support loop inspects at most 48 tracks for each of at most 48 candidates. It creates no path search per target. The main navigation component is calculated once per selection; target component reads are bounded. The final latency gate must still measure the combined bundle, since bounded work does not itself establish the 50 ms runtime contract.

## Function-by-function review of the new module

All functions below were read in the actual integrated source. Tests are named by behavior in `pressure_cases.mjs` and `pressure_integration_cases.mjs`.

| Function | Contract and concrete review | Status / evidence |
|---|---|---|
| `makePressure` | Captures the selected push/burst hypothesis; owns private macro state; derives the first valid configured cube threshold; never changes the base RNG. | Reviewed; feature-off full-brain identity. |
| `gunReady` | Missing gun is infinite delay; reload and cooldown overlap through `max`; empty ammo adds a full refill bound. | Reviewed; cooldown/refill boundary and burst-estimate cases. |
| `laserReady` | Existing charge uses remaining charge only; uncharged laser includes cooldown plus full charge. | Reviewed; recharge/commit cases and known live charge units. |
| `active` | Reports the one-way latch without deriving it from transient health or target state. | Reviewed; health/weapon loss persistence case. |
| `legal` | Requires a living non-NPC, non-phantom track with sufficient confidence and recency. | Reviewed; dead/NPC/stale rejection. |
| `rangeFor` | Chooses distinct push/burst bands from carried weapons and live range; accounts for an enemy lightning carrier. | Reviewed; finite live normalization and recharge cases. Preferred range is tactical, not an engine reachability guarantee. |
| `damageRate` | Estimates sustained weapon throughput and applies the existing gun range-quality estimate, cube damage multiplier and known base armor factor. | Reviewed as a ranking heuristic; no kill guarantee. |
| `burstDamage` | Uses ammo/readiness/projectile flight, remaining laser charge and affordable lightning pulses over a bounded horizon. | Reviewed; empty/reloading/cooling fixtures. Does not replace fire control. |
| `support` | Counts weighted nearby eligible opponents, capped at 48 tracks, without rejecting every supported enemy. | Reviewed; isolation preference and many-enemy low-HP case. |
| `select` | Separates pursuit and visible firing targets; ranks route difficulty without a hard component veto; adds hysteresis and records pursuit memory. | Reviewed; finish/isolation/hysteresis/reachability cases. |
| `captureFinish` | Only retains an owned, nearly complete, currently occupied safe ring; visible contest rejects it; one absolute grace deadline. | Reviewed; completion grace, expiry, remote and contested cases. |
| `update` | Performs the configured setup transition, latches it, installs an explicit energy-reserve interface, then selects targets/capture continuation. | Reviewed; normal/pending-offer/60s/90s/empty-loadout boundaries. |
| `mode` | Reasserts offensive state after the existing stance pass, clears passive holds/diversions, and chooses zone/capture/fight/seek in that order. | Reviewed; FFA, low HP, old HEAL mode and stale hold flags. |
| `allCooling` | Tests whether each carried damage channel has a meaningful current delay or lacks energy/range; missing channels count as unavailable. | Reviewed; burst expands only while all channels recharge. |
| `seek` | Uses recent target position, heard direction, then bounded zone patrol waypoints. It does not stop indefinitely after losing a target. | Reviewed; no-enemy finite movement case. Heard bearings remain an uncertain search cue. |
| `legs` | Gives urgent zone motion priority; preserves bounded capture continuation; otherwise closes or strafes around the pursuit target. Burst temporarily widens its band during recharge. | Reviewed; zone override, push-versus-burst and finite-energy tests. |
| `wantReload` | Refills an empty gun, reloads opportunistically out of sight, or uses ready-laser cover for a burst refill. A positive-ammo gun already commanded to fire blocks an optional early reload. | Reviewed; fired-positive, cooling-positive and empty-gun regression cases. |
| `hands` | Runs after common firing/economy hands; changes reload and a valid upgrade index, while leaving final aim, trigger, take and drop ownership intact. | Reviewed; trigger/reload regression and valid upgrade cases. |
| `wrapProfile` | Replaces firing target, target legality, crate-shot, reload and the old discretionary laser-charge veto while committed; forwards the original functions otherwise. | Reviewed; feature-off identity and integrated weapon-control identity. The former closing-lightning tactical charge veto is bypassed only after commitment; actual cooldown, short, geometry and immediate noCharge constraints remain. |
| `debug` | Reports the policy, latch reason, phase and heuristic target scores for review. It does not write gameplay inputs or select seeds. | Reviewed; fields are diagnostic only. |

## Integration boundaries and corrections

The brain constructs the weapon policy before the mover and fire controller. It preserves the original seed for an independent private variation stream and retains the live upgrade definitions used for the weapon policy's conservative armor bound. It creates pressure after the capture profile, then wraps that profile's selected hooks.

Before commitment, the existing targeting, farming and capture setup remain active. Afterwards the brain skips those old macro selectors and `econ.update`, calls the new mode selector, and reasserts it after stance evaluation so a late FFA hold-fire decision cannot quietly undo the new policy. Immediate movement safety runs before/around the new pressure legs. The low energy reserve is an explicit interface consumed by the integrated weapon policy; the pure macro control only changes boost discipline and must not be described as changing lightning firing reserve.

`econ.hands` independently scans observed nearby pickups; it does not require `econ.update`, `B.loot` or `B.grab`. This is why in-contact weapon improvement remains possible without farming detours. The integrated cases demonstrate an empty-slot take and a full-slot contextual swap while pressure stays in FIGHT with no loot or grab goal. The refined common hands pass previews nearby visible pickup kinds without changing the movement target, so one complete observation of persistent advantage can qualify a committed swap. The low-HP/recent-hurt veto is bypassed only after commitment; urgent-zone, four-second equip, duplicate-kind and charged-laser slot constraints remain. Physical take limits are capped by the live horizontal pickup radius and the fixed four-metre vertical limit.

Once pressure is active, the contextual capacity margin may replace a gun in either posture; the old permanent SQUAD gun lock remains for the standalone setup/control behavior. A full-slot no-target fallback also obeys the observed four-second equipment cooldown, preventing immediate reacquisition of a just-dropped gun. An actually empty slot may still be filled. An incoming gun is conservatively valued after a full reload because pickup metadata does not reveal retained ammunition. All incoming weapons pay `max(equip_s, cooldown)` before their first available shot.

Independent review found that optional early reload could be reasserted after fire control had selected a positive-ammo gun shot. The correction places the guard in `wantReload`, so both the profile hook inside fire control and the final hands pass respect the same shot priority. Empty-ammo refill remains intact.

The inherited FFA reverser limit of 0.3 seconds could suppress a gun shot at the burst policy's own 78-metre stand-off band when a target retreated, even while movement considered the distance satisfactory. The final one-condition correction bypasses only the FFA-specific 0.3/0.8-second specialization after commitment. The base flight/steadiness accuracy rule, actual intercept, loaded-magazine/reload/cooldown checks, range, map clearance and final torso-aim gate remain. A regression fixture proves the active policy fires at a 78-metre reverser retreating at 10 m/s while the capture controller suppresses it, and that a non-steady 210-metre case is still rejected by the base flight gate. Readiness-aware off-axis laser charging remains an accuracy/tactical heuristic; it is not described as engine physics.

The two primary hypotheses do not differ merely by a salt. Their scoring, preferred bands, recharge behavior and upgrade priorities differ explicitly. Burst's extra private variation only changes which of two already-valid bullet-dodge candidates is checked first, with a stable choice per projectile and a bounded 64-entry map. It does not randomize legality, firing precision, the map, match seeds, forced escapes or protocol values.

## Evidence and remaining risks

The macro suite covers setup, commitment, low-HP aggression, all-mode target legality, route ranking, isolation, target hysteresis, near-complete capture continuation, reload ownership, upgrades and finite actions. The integration suite compares all-disabled actions with capture, cycle-disabled actions with the pure macro, and macro-disabled actions with the matching weapon control. It also exercises the actual opportunistic pickup path, reserve-aware lightning gate and repeated low-health combat decisions. Bundled official checker receipts establish schema/tick/deadline conformance on the official recording. They do not estimate match score.

The frozen pair passed 34 macro cases per candidate, 22 combined integration cases, 5,100 disabled-feature identity decisions per candidate and 2,400 enabled malformed/low-energy/zone stress decisions per candidate. Both exact bundles passed all 300 official recorded observations with no missed deadlines, bad lines, wrong ticks or stale answers in that conformance run. The controller owner's separate final suite contains 48 cases. These counts describe different overlapping test purposes and should not be added into a fictitious number of independent match evaluations.

The first runtime fixture, `pressure-runtime-stream.jsonl.gz`, forced the commitment deadline but retained distant recorded zone geometry. It changed aim/fire behavior without changing movement in that comparison, so it was insufficient evidence of committed combat legs. That limitation was retained and corrected with a separate fixture, not silently relabeled.

`pressure-contact-stream.jsonl.gz` now supplies 300 individually schema-valid, map-checked contact snapshots with safe centered current/next zones, passable feet, body separation, clear contact rays and unchanged live upgrade statistics. It includes 45 frames with fifteen charging opponents. Separate source audit wrappers confirmed 300/300 actual successful `pressure.legs` calls and zero urgent-zone frames for each candidate. Push used close/fire/seek/capture branches 120/147/30/3 times; burst used close/fire/cycle/seek/capture 45/147/75/30/3 times. Movement differed from capture on 297 frames for each candidate. These are counterfactual snapshots, not a reactive simulation or a claimed feasible complete match history; the immutable production bundles were used separately for timing. The independent fixture review also identified two deliberate state simplifications: the centered zone differs from the hello schedule, and the pickup scene uses a synthetic three-second laser cooldown against the recorded 1.65-second base. Thus schema/map validity must not be restated as proof that every complete snapshot is engine-reachable.

### Latency evidence, including the retained failure

The first quiet burst official-checker run reported `PASS` despite only 298 of 300 observations arriving within the budget. Two answers were late and the maximum was 243.3 ms. The coordinator caught the insufficient result parsing. That run remains in `final-validation/burst-cycle-protocol.log`, with its correction in `final-validation/CORRECTION.md`; its cause is unresolved. A claim that all runs were deadline-clean would be false.

A predetermined two-round diagnostic then tested capture, push and burst on the official stream and the validated contact stream: twelve processes total, with reversed candidate order in the second round. All twelve completed with all 300 answers on time, no hidden checker retry, no schema errors and no wrong/stale ticks. The exact receipt is `final-validation/strict-diagnostic/results.json`.

| Candidate | Contact maximum, round 1 | Contact maximum, round 2 |
|---|---:|---:|
| Capture control | 20.62 ms | 10.04 ms |
| Sustained pressure | 8.17 ms | 5.23 ms |
| Burst | 6.12 ms | 7.84 ms |

These bounded results support release under the tested local conditions while retaining the unexplained earlier outlier. They do not prove every future tick is below 50 ms or prove a gameplay improvement. The runtime used one-core affinity and the Dockerfile's engine flags, without a Docker/cgroup enforcement claim.

Final source manifests and test receipts are refreshed after integration corrections, and identify exactly which revision each gate tested. Earlier overlapping conformance timings are not substituted for the fixed strict diagnostic above.

Aggressive pursuit can worsen placement by exposing the bot to several opponents, spending energy sooner, forgoing a valuable distant refill and chasing a target through a poor approach. Burst ranking can overvalue a nominal combo whose geometry or armor reduces its actual damage. Target hysteresis can temporarily prefer an inferior opponent. These are the deliberate gameplay hypotheses to evaluate through official results, not conditions that the local protocol checker can resolve.

The static startup audit also found that the existing two rehearsal brains never activate pressure: each uses at most 800 observations ending at 79.9 seconds, with empty upgrades, and its only pending-offer phase occurs before 60 seconds with no secondary weapon. `experiments/mech-pressure-warm` and `experiments/mech-burst-warm` preserve an isolated source-only prototype adding bounded active-policy scratch passes after the original rehearsals. They are **unpromoted, unbuilt and untested**, and are not included in either release. The coverage gap is not asserted to have caused the 243.3 ms outlier.

## Resource-to-code mapping

These are supporting resources supplied and verified by the parent panel. The implementation is original work over the existing bot, not copied book or project code.

| Primary resource | Relevant concept and actual application | Limit of the claim |
|---|---|---|
| [Millington, Artificial Intelligence for Games, third edition](https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972), movement, decision, tactical and execution chapters | Separating `select`, `mode`, `legs` and physical fire control; a small stable mode transition and target hysteresis. | The policy is not an implementation of a benchmark from the book. |
| [LaValle, Planning Algorithms](https://www.lavalle.pl/planning/web.html), feedback, decision theory, sequential decisions, information and differential models | Feedback from observed health/charge/ammo/position; explicit setup/commit/recharge episodes; geometry constrains the issued action. | The macro does not solve an optimal-control or partially observable planning problem exactly. |
| [Ericson, Real-Time Collision Detection](https://realtimecollisiondetection.net/books/rtcd/toc/), ray/segment tests and numerical robustness | Independent review of the shared muzzle-prefix ray and separate bounded mortar-arc work; raw reachability precedes aim clamping. | Existing map ray tests are not proved identical to engine collision or a conservative swept volume. |
| [Compositional Planning with Jumpy World Models, ICML 2026](https://proceedings.mlr.press/v306/farebrother26a.html) | Temporal abstraction is a useful comparison for the explicit setup, committed attack and short recharge phases. | No learned world model, paper algorithm or published performance was implemented or transferred. |
| [TD-MPC2, ICLR 2024](https://www.tdmpc2.com) | Short-horizon action utility motivates keeping weapon readiness estimates on a shared time horizon. | The candidate uses observed mechanics and hand-written utility; it does not train or deploy TD-MPC2. |

