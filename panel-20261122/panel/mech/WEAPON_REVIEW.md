# Mech adaptive weapon control: implementation and independent review

## Baseline and current evidence

The tactical parent is the capture candidate at `099e7e392a863346575d7ef45bb9af3432544329`, whose submitted bundle SHA-256 is `db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1`. The owner reported a builders-4 score of **5.47**, submission `BB-5C0B1ABA`, and selected it. The separate geometry submission `BB-49DC4526` at `b92af4e563ec1f86aac29b8e1116ba85453dfe5a` scored **5.31**. These are owner-provided receipts, saved in `official-owner-results.json`. Different fresh private seeds prevent interpreting the difference as an isolated causal effect of either patch.

Two independently authored weapon candidates preserve the capture tactical code and add an explicitly **all-mode** controller:

| Candidate | Intended distinction | Historical standalone bundle SHA-256 |
|---|---|---|
| `mech-cycle-ready` | Readiness/slew scheduling, feasible geometry, threat-aware lightning, contextual pickups | `4724000deec5698d65b37a06b984dd755a54419e2e0f4909e92c5b918d9cd752` |
| `mech-cycle-varied` | Same controller, plus seeded choice among similarly scored admissible bullet-dodge sides | `40c5523703d086469b7d65a5ce4c6c487814a3d5acf6c712bb6e4ad7ceb9af78` |

These historical isolation-control bundles contain 260,304 bytes and were built with the verified Bun 1.4.4 binary at the 45-case snapshot. Their complete source manifests and commands are in `weapon-builds.json`; patches are `mech-cycle-ready.patch` and `mech-cycle-varied.patch`. Three subsequent pickup families and paired-source changes bring the final controller gate to 48 cases; those changes are present in the published combined builds, not asserted to be present in these older standalone bytes. `weaponCycle=false` restores the capture action behavior in the measured identity cases. With the feature enabled, FFA behavior intentionally changes. There is no claim of enabled FFA identity.

The later aggression controller is a separate component owned by the Rust/physics reviewer. It uses this common weapon controller through `B.pressureActive` and an optional finite `B.pressureEnergyReserve`. The final combined submissions are pressure `69ed1814707634fb4b5e5953082f3d67ac9e52f8` and burst `26f382eab378e1193ab9203bb4ec7e706c6780bf`. `FINAL_MECH_COMPARISON.md` contains the published branches, exact final hashes, combined tests and retained latency outliers. The final paired modules are `weapon_policy.js` SHA-256 `84e082f5fccd68e395756191538ac922e289f5e31449bc622415a343136ab8c2` and `economy.js` SHA-256 `db9a988ca1134ba7de3b4be2cc29734b07d56280705bf136625a7b80fe5e18f0`. The standalone hashes above do not identify an integrated pressure build.

## Mechanics that define the design

The [official protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) defines one torso command and two independent weapon-trigger booleans. There is no active-weapon selection toggle or heat state. Gun ammunition, reload, cooldown, laser charge, energy, actual aim, live weapon stats and physical pickup actions are the observable controls. A held laser releases a beam when its trigger is cleared; switching aim must therefore preserve the trigger deliberately.

The controller retains the existing intercept and target-motion solutions. It compares when the shared torso is needed instead of replacing every aim calculation. It uses actual solid-shot geometry; drawn scenery or vision-blocking trees do not become invented projectile obstacles. Laser cook-off and lightning short are supported signature effects; material penetration and synthetic heat are not added.

### Torso scheduling

For current actual yaw/pitch and a requested aim, the estimated slew time is:

`T_slew = max(abs(wrapped_yaw_error) / effective_yaw_rate, abs(pitch_error) / effective_pitch_rate)`.

The effective rates include the live laser `charge_turn_mult` only while observed charge is positive. For an already charging laser, remaining full-charge time is `max(0, full_charge - observed_charge)`; before a new charge, cooldown precedes charging. Slew and charging can overlap. The controller starts moving the torso to the laser when its remaining charge fits within the required slew plus one decision and one tick. This replaces the fixed 80%-charge handover when cycling is enabled.

A ready, physically gated gun keeps aim while the beam can continue charging. A conservative finish comparison can prefer that gun when it is already aligned, its shot arrival precedes beam alignment, and its damage covers the target HP even under the maximum armor additions/multipliers advertised by the live upgrade definitions. This is a decision heuristic under observed state, not a guarantee that a future projectile hits. Full own laser charge reserves aim because automatic/forced release can happen even before the current decision has set `laserRelease`.

Observed charge overrides a stale cached trigger. A shorted laser showing zero charge and remaining cooldown cannot keep claiming the torso merely because the previous action held its trigger. When the ready gun keeps aim, the old FFA charging-offset rule cannot subsequently turn it away and cancel the shot. Compatible triggers can still both be true.

The inherited partial-laser lethal cue and forced-release timeout remain. The latter can eventually release a blocked beam; this work does not claim that every forced beam hits or that all inherited finishing estimates now include exact armor and future motion.

### Lightning arbitration and energy

An extra lightning aim candidate is considered only for an observed charging laser carrier that is legally attackable and aiming at us or recently damaging us. It cannot take aim from a committed/full own beam or an active mortar shot. Its raw pitch must be reachable, and the predicted yaw must already admit the intended nearest known object at the next eligible tick.

Nearest-object selection is separate from the aiming safety margin. The backend reviewer found that using the old 3° inset while searching for blockers would hide a closer object at 13° in a nominal 30° cone. That could falsely credit a farther intended target. The corrected helper first collects blockers in the configured angular deviation, then uses the narrower inset only to admit the actual selected shot. The public protocol does not explicitly distinguish a full-angle versus half-angle parameter; using the larger blocker band conservatively rejects some uncertain opportunities. Equal-distance ambiguity is also rejected. Fresh solid rays are required, so stale cached visibility cannot override an intervening wall.

The final trigger checks the nearest known object again under the final torso command. A closer neutral, drone or unrelated crate cannot be silently skipped. An intentional crate shot is permitted only when that same crate is selected. Unknown/unobserved actors and the uninspected server's exact body-distance convention remain limits of this known-object model.

Energy admission subtracts a conservative count of possible pulses during the decision and the configured boost/jet drain before applying the reserve. The pressure macro can deliberately lower the combat reserve; an active zone-escape floor still applies. Energy regeneration is not pre-spent. The controller does not assign a fictitious numerical hit probability to the interrupt.

### Physical weapon replacement

`capacity` compares a common four-second heuristic damage-capacity horizon. It accounts for current ammunition/refill, cooldown, projectile travel, torso turn, range, cached outbound visibility, laser charge, cook-off, limited lightning energy and prospective equip time. Hypothetical unheld weapon stats use announced defaults rather than pretending to know retained upgrades. An incoming gun also pays a complete refill delay because dropped guns retain ammunition and pickup metadata does not establish a full magazine.

A replacement must exceed `1.25 * current_capacity + 60` on the same target and slot for at least 0.5 seconds in the standalone policy. Repeated calls in one decision do not advance that timer; lost advantage, loadout/target changes, an observation gap, or ineligible escape conditions reset it. After observed equipment change, four seconds prevent immediate cycling back. The charging laser slot is locked, while replacing the other slot remains legal. Before pressure commitment, the squad keeps its gun; after commitment, either mode can replace the gun when the same contextual capacity advantage passes. Empty slots retain the existing filling contract. Full-slot replacements without a combat target still obey the four-second observed equipment cooldown and the charging-slot lock, preventing immediate reacquisition of a just-dropped weapon after contact is lost. Mortar preferences are unchanged.

Integration review exposed two differences needed after the aggressive macro commits. Low HP or a recent hit no longer vetoes a beneficial pressure-mode swap. The controller also previews recently observed nearby pickup kinds without steering toward them, and pressure mode requires one full observed decision of persistent advantage rather than 0.5 seconds. A boosted traversal of the pickup disk can otherwise finish before the longer timer expires. The full-slot/context guard prevents this pre-evaluation from caching a null answer over a legitimate empty-slot or absent-target fallback. Hands still scans physical pickups independently of the skipped economy planning stage. Its horizontal bound is capped by live `loot.pickup_radius`; its vertical bound is capped by the protocol's fixed four meters.

Route reachability, pickup height/distance, abandoned-item handling and exposure filtering stay in the existing economy/navigation layers. The local capacity estimate is not a path planner or a complete expected-reward model. Conservative unknown-ammo/equip costs can miss worthwhile long-term replacements; the short horizon and margin are explicit tuning hypotheses.

### Bounded variation

The varied candidate uses a separate deterministic RNG stream derived from the public seed. It holds a selected side order for each projectile ID and limits the cache to 64 entries. It does not consume the existing shared RNG. The original dodge scorer still evaluates acceleration, all nearby bullets, walkability and zone constraints; a clearly safer side wins regardless of the sampled ordering. Only outcomes within the existing 0.05 score-improvement margin can depend on tie order.

This provides bounded behavioral variety. The public fixed seed is not secret, so it is not cryptographic unpredictability. It does not randomize a dangerous trigger, a pickup legality check, an imminent escape, or a substantially safer dodge choice.

## Function-by-function change review

The original 409-function inventory and module-level coverage remain in `FUNCTION_INVENTORY.md`. The capture source remains unchanged outside the files below.

| Function or group | Responsibility and review result | Main evidence |
|---|---|---|
| `weapon_policy.value` | Finite-number fallback for optional live/config fields | Malformed-config stress |
| `makeWeaponPolicy` | Own state/maps/local RNG; conservative advertised armor bound; no shared RNG consumption | Armor fixture; RNG identity fixture |
| `on`, `decisionS`, `turnMult`, `reserve` | Explicit feature activation, configured cadence, observed-charge turn multiplier, optional pressure energy hook | Feature-off identity; turn-rate, pressure and zone-boundary cases |
| `slew` | Wrapped yaw and live two-axis turn time with positive rate floors | Slow torso and live-multiplier cases |
| `laserAim` | Shared aim owner from readiness, remaining charge, slew and conservative gun opportunity | Compatible triggers, early slew, full charge, observed short and aligned-gun cases |
| `energyOk` | Pulses plus movement cost before reserve | Just-below/at budget, boost drain and pressure reserve cases |
| `legal` | Holds fire when required; validates the actual selected object; explicit pressure eligibility | Neutral-blocker, held-fire and both-mode cases |
| `nearestLightning`, inner `consider` | Bounded known-object scan, physical blocker band, fresh solid LOS, tie ambiguity | 13° crate/neutral, equal-distance and wall cases |
| `lightningAligned` | Applies the aiming inset only after blocker selection | Backend independent review and 13° fixtures |
| `interruptAim` | Threat-specific short opportunity, actual-yaw admission and own full-beam protection | Charging-at-self versus charging-elsewhere; full beam fixture |
| `refresh` | Time/tick/loadout/target cache; clears stale same-tick answers and dwell state | Same-tick equipment mutation; repeated-call fixture |
| `capacity`, inner `read` | Finite four-second comparison with live held stats and conservative incoming equipment | Refill, unknown pickup ammo, equip delay, range/visibility cases |
| `pickup` | Relative/absolute advantage, time hysteresis, slot lock, swap cooldown and legacy fallback | Stable dwell, gap/reset, setup gun retention, both-mode pressure replacement and no-context anti-thrash |
| `pickupLimits`, `preparePickups` | Config-bounded actual take range; pressure-only nearby pre-evaluation without a navigation detour or empty-slot fallback corruption | Changed radius/fixed-height boundaries; moving-window, low-HP and unchanged-motion cases |
| `dodgeSides` | Local seeded bounded episode choice | Seed replay, untouched shared RNG, symmetric/strictly safer/blocked-side cases |
| `brain.normalizeConfig` | Retains announced upgrade definitions needed by armor bound | Recorded armor upgrade and malformed config |
| `brain.createBrain` | Preserves derived RNG seed; creates policy before movement/fire modules | Full feature-off replay and enabled stress |
| `economy.wantPickup`, `basePickup`, `hands` | Wraps existing preference logic; hands independently scans legal pickups and primes nearby pressure choices; all callers use one cached contextual decision | Pickup family and enabled full-brain stress |
| `firecontrol.makeFireControl`, `muzzleClear` | Explicit all-mode feature gate; raw-pitch and near-barrel feasibility before new scheduling | Squad/FFA wall and unreachable-pitch cases |
| `firecontrol.predYaw`, `predPitch` | Live charging turn multiplier when enabled; original behavior when disabled | Charge multiplier and feature-off identity |
| `firecontrol.run` | Computes original gun/laser solutions, schedules aim, preserves charge, rechecks compatible gun/lightning triggers | Both slot orders, compatibility, short/hold/energy fixtures; real stream conformance |
| `mover.bulletDodge` | Changes only admissible side iteration order; original score and constraints retained | 24 stronger-side cases and eight one-walkable-side cases |
| `PARAMS.weaponCycle`, `weaponVariety` | Explicit defaults distinguish ready from varied; no hidden deployment switch | Source manifests and exact build hashes |

Unchanged firing helpers (`gunSolve`, `gunLatency`, `predictSelf`, `airZ`, `pitchTo`, `scan`), reload behavior, collision-map queries, navigation, protocol I/O and capture functions retain their previous implementations. Their use by the new controller is covered by integration/conformance checks; no unsupported claim of complete formal verification is made.

## Three review rounds and validation

1. **Mechanics/control design:** physics reviewer checked shared torso, charge-release semantics, live cooldown/slew and actual-nearest lightning requirements. The implementation kept mortar acquisition unchanged and used capture as its tactical parent.
2. **Adversarial review:** backend reviewer identified the blocker-margin defect; source owner corrected it and added 13° fixtures. Cache invalidation, real-time dwell continuity and unknown dropped-gun ammo were also corrected before final bundling.
3. **Integrated behavior gates:** 40 controller tests passed, including source-level firing/economy functions, both modes, slot order, actual dodge behavior, charge/readiness edges, blockers, energy and bounded variation. Eight further pressure/pickup integration families passed after rejecting the low-HP swap veto and the overly long in-range dwell. Disabled-feature replay and enabled stress passed; actual bundled protocol runs are pinned separately. True combined macro-plus-weapon build receipts must be distinguished from these function-level integration cases.

| Gate | Result | Receipt |
|---|---|---|
| Final crafted controller and pickup integration cases | 48/48; includes 24 distinct stronger-side dodge instances and eight one-walkable-side instances inside their families | `weapon-cases.json` |
| Historical standalone disabled-feature capture identity | 34 comparisons: 16 seeds/slots plus actual map, for each variant; 5,100 matching actions per variant | `weapon-replay-stress.json` |
| Historical standalone enabled stress | Four config shapes × squad/FFA × capture/ready/varied; 2,400 decisions per build; zero invalid actions, stage errors or fuse trips | `weapon-replay-stress.json` |
| Historical standalone ready bundle | Official 300/300 recorded observations; zero late/schema/bad-line errors | `weapon-protocol-results.json` |
| Historical standalone varied bundle | Official 300/300 recorded observations; zero late/schema/bad-line errors | `weapon-protocol-results.json` |

The standalone replay/protocol receipts in this table predate the final three pickup refinements; final combined identity, stress, integration and strict runtime receipts are in `FINAL_MECH_COMPARISON.md`. The frozen combined builds passed 34 macro and 22 true integration families in addition to the final 48 controller families. The first burst official latency run had two late answers and a 243.3 ms maximum, which are explicitly preserved alongside the subsequent fixed 12-process zero-late diagnostic. No standalone result is substituted for those combined receipts.

Conformance used the real saved arena and normal bundle. The source equivalence/stress harness disabled warmup and the wall-clock fuse for deterministic logic checks. Bundle conformance used Bun 1.4.4, one CPU affinity and the documented JSC flags. Other panel jobs were permitted during that check, so its timings are not an isolated comparative performance result. It is a recorded observation stream: responses do not affect subsequent observations and cannot establish gameplay strength. No game-server connection, simulator ranking or owner submission was made by this agent.

## Research resources and testable use

| Primary resource | Concrete use in this work | Limit |
|---|---|---|
| Christer Ericson, [Real-Time Collision Detection, contents](https://realtimecollisiondetection.net/books/rtcd/toc/), §§5.3 and 11 | Ray/segment boundaries, raw-pitch versus clamped command, finite inputs, blocker margins and numerical ties | The book's geometry framework does not reveal the server's collider implementation |
| Steven LaValle, [Planning Algorithms](https://www.lavalle.pl/planning/web.html), feedback/sequential/partial-information/dynamics chapters | Separate observed state, feasible control and longer-lived tactical episodes; reason about acceleration and uncertainty | No calibrated survival probability is inferred from a geometric plan |
| Ian Millington, [AI for Games, third edition](https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972) | Movement, decision layers, tactical choice and execution management inform controller boundaries and hysteresis | General game-AI patterns do not establish an evaluator score |
| Farebrother et al., [Compositional Planning with Jumpy World Models](https://proceedings.mlr.press/v306/farebrother26a.html), ICML 2026 | Research reference for temporal abstraction across policy episodes, useful when reviewing setup/commit/cycle transitions | Our phase controller does not train world models or implement the paper's learned compositional planner |
| Hansen et al., [TD-MPC2](https://www.tdmpc2.com/), ICLR 2024, and its [official MIT implementation](https://github.com/nicklashansen/tdmpc2) | Reference for consistent short-horizon action evaluation and explicit model limitations | Our hand-coded four-second capacity estimate is not latent-space MPC, and no benchmark gain transfers |

These books and original papers are selected for the functions actually under review. The paper and open-source links were inspected as research resources; no external implementation was imported into the submission.

## Forecast and acceptance interpretation

The standalone ready controller has a plausible modest upside over the reported 5.47 capture baseline when the saved bad cases occur in matches: fewer missed ready-gun opportunities, earlier beam alignment, fewer mistaken lightning targets and less damaging equipment churn. It can also score worse by conservatively declining valid lightning shots, delaying a worthwhile pickup, or spending extra geometry work. The varied controller is expected to remain close to ready; no supported numerical advantage follows from varying nearly tied dodges.

The user's **7.5** target motivates the separate, more aggressive setup-to-combat macro experiment. The weapon controls alone are not evidence of reaching that score. A numerical winning probability or confidence interval cannot be recovered from the two aggregate official results without per-match variance and a validated comparison design. The current defensible forecast is directional and explicitly uncalibrated. Submit distinct finalized builds through the owner, record their scorer/commit/result, and use those receipts for selection. Keep the 5.47 capture entry available until a better official result is actually selected.
