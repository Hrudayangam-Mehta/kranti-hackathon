# Adaptive Mech — independent backend and state acceptance

**Source and decision-contract status: accepted; the frozen runtime cross-check also passed.** Both candidates passed the same independent full-brain state and goal suites. This is a correctness acceptance of bounded changes to the capture policy, not a prediction of a higher placement score.

The reference remains capture commit `099e7e392a863346575d7ef45bb9af3432544329`, reported by the owner at 5.47. The earlier pressure/burst entries scored 4.74/4.67 in unpaired practice runs. Neither these local cases nor an action-difference count establishes why those scores changed.

## Exact reviewed code

The shared final `lib/prof.js` hash is `e85059ee5c3772d241ffac407b45c763c8f14f8e46c32cbbc759c79eb646ad06`. The complete 21-file primary and 24-file secondary source manifests, bundle hashes and independent receipts are preserved in `adaptive-backend-acceptance.json`; every file was checked against the frozen `adaptive-builds.json` manifest with zero mismatches.

| Candidate | Bundle SHA-256 | Change hypothesis |
|---|---|---|
| `mech-adaptive` | `a372e8a3a8b6ac19faf58b3e227440b594b25238ef9d02f31be3728323a6c45d` | Capture plus readiness-aware, reversible engagement and reward/recovery admission. Production changes are limited to `prof.js` and `params.js`. |
| `mech-adaptive-weapons` | `0f49821cae2ea53dcbe7d4eccf6ca9b2a6c29fb509c78d19cec7d89e1b3b51e5` | The same macro policy plus contextual equipment/upgrade choices, preserved live config/stat fields, and separate mortar/lightning physical checks. |

**Scope matters.** The primary policy runs only when the existing practice-profile firewall is active: SQUAD posture, its allowed foreign-death count, next-zone radius above the late threshold, and more than the low-alive cutoff. It does not replace FFA or every late-game policy. The secondary equipment helper also checks the current firewall. Its mortar/lightning fire-controller corrections are outside that helper's gate and therefore affect the other modes too. Cross-mode/feature-off checks and the final timing gate belong to the algorithm reviewer; they are not silently inferred from this suite.

## Independent results on the final source

| Suite, per candidate | Result | What it establishes |
|---|---:|---|
| State/event/transport suite | 33/33 cases; 332 observations | Authoritative inventory/resources, all protocol event types, four weapon types, damage clocks, queue/skip behavior, exact zone interpolation and unchanged official 300-observation replay. |
| Goal/readiness suite | 32/32 cases; 43 observations | Reward thresholds, energy benefit, capture race/progress/contest/reset, cache invalidation, finite-horizon readiness, recovery clocks, early eligibility and the real-map range regression. |
| Official schema validation | 375/375 observations, zero errors | Both suites use the unmodified official Draft7 schema. This is independent of the extra map/config assertions. |
| Active runtime stimulus preparation | 300/300 individually validated | Real map clearance, original configuration, phase-derived zone, bounded cooldown/reload/charge and current in-zone state. Runtime latency is separately measured. |

Counts include an official 300-observation recorded input replay and a smaller set of constructed observations; they are not 375 independent games. `adaptive-state-cases.mjs`, `adaptive-goal-cases.mjs`, `adaptive-fixtures.mjs` and `adaptive-validate-receipts.py` reproduce these gates. Receipts are `adaptive-round2-{state,goals}-{candidate}.json`, with matching observation and schema files.

The original 26 goal contracts were extended only for concrete new risks: two cache invalidations, three early-eligibility transitions, and the farther-range regression. The fixture helper keeps the original hello configuration and the actual arena mesh/nav data. Counterfactual fields and stitched temporal gaps are explicitly labeled; no complete engine history is claimed.

## Function-level review of the macro changes

| Function(s) read | Contract checked and disposition |
|---|---|
| `prof.update` | Live self armor, energy regeneration/delay and boost drain enter the evidence state; recovery delay comes from the latest dealt-or-received damage. Existing authoritative sensing remains the owner of resources. Passed armor/nanites/zone/hit-event cases. |
| `ownDps`, `readyDamage` | The adaptive branch uses a finite time horizon, actual ammo/reload/cooldown/charge, projectile flight, torso slew, pitch/range, cube scaling and reserved lightning energy. Mortar deliberately contributes zero to this immediate finisher model. Reloading/shorted/out-of-range/exhausted and actual charged-laser controls passed. `charge_turn_mult` correctly comes from laser stats in the supplied config. |
| `readyTotal`, `killTime` | A finisher uses the best single channel; ordinary exchange sums supported channels. Eight-step search finds the earliest point where the same damage envelope reaches target HP. It cannot infer a kill before a gun reload merely from average damage over four seconds. This remains an expected-damage estimate, not certainty. |
| `freshShot` | A finisher requires the selected shot to be the target, a listed fresh target and fresh world clearance. Lost-memory and off-axis tests passed. Ordinary pursuit may still approach a remembered target; actual firing retains its own geometric gates. |
| `escapeTime` | A charging laser's movement multiplier is applied before checking whether the boosted trip is affordable. The reserve check and returned trip time therefore use the same effective speed. Unknown cover remains an explicit heuristic default. |
| `incomingAt`, `exchangeAt` | Observed incoming damage is not reduced by armor twice. Relevant enemy priors use our live weapon armor. Each range candidate is tested with the same approach/completion/escape/zone predicate; a slightly negative continuation allowance is limited to an existing fight. Hidden enemy stats and future movement remain uncertain. |
| `prefRange`, `selectTarget` | Nominal damage advantage cannot veto every range without testing an admissible alternative from the existing range set. Final selected range is the one used by the movement layer. Finish risk uses current range, rather than the proposed future range. |
| `selectTarget` early eligibility | After the existing 20-second unsure phase, an applied upgrade plus usable held laser/lightning may open engagement eligibility early. `setupEligible` is recomputed; it does not write the old permanent `gateEndT`. A queued offer alone does not qualify. Depleting the reserved lightning pulse returns the early state to gate. Eligibility still does not override a losing exchange. |
| `cubeValue`, `dropValue`, `cubesWanted` | Separate missing HP, missing energy and capped-stat/threshold/body terms. Crossings 0→3, 2→5, 9→12 and 12→15 exercise distinct threshold/cap cases. Cube HP is not counted again as both full repair and an additional repair amount. The utility weights are policy choices, not learned probabilities. |
| `goalBudget` | Survival admission precedes benefit. Completion must be finite and bounded; zone slack includes completion and escape; current/path exposure is charged before and after restoration. Full-HP energy/threshold value can qualify, while full resources at the stat cap need not. The route estimate checks endpoints/midpoint rather than simulating a route. |
| `dropPlan`, `chooseDrop` | Preserves capture's repaired ownership/race logic: owned banked progress differs from uncontested completion; a known contest cannot advance the clock. A stationary holder finishing before earliest arrival is rejected. Observed reset after exit/reentry is used. The legacy generic drop-loot route is disabled only in adaptive mode, preventing an unsafe rejected priority drop from reappearing through that fallback. |
| `chooseGrab`, `chooseLoot`, `econUpdate`, `stillThere` | Ordinary resource candidates receive the same admission and availability tests. Farming is suppressed during recovery. The separate calm-retreat cube path is also budgeted. Existing 0.25/0.5-second caches retain performance but do not authorize stale safety decisions. |
| `decideMode` | Freshly revalidates drops, cached profile grabs, separate retreat grabs and loot before choosing a mode. New lethal exposure clears the old objective within one decision. A safe healing/energy drop can remain useful, while unsafe resource collection cannot override retreat. Recovery retains the no-damage clock. |
| `crateShot`, `wantReload` | Recovery does not repeatedly reset itself by farming; an already approved gun shot with ammunition is not canceled by an unnecessary reload. Empty guns still reload. |

### Concrete range regression found and repaired

The reviewer independently reproduced the algorithm reviewer's model contradiction using the original configuration and a real, visible, passable, walkable 198 m lane. Our mech was full-HP gun+lightning; the stationary opponent was a 500-HP gun-only mech. The pre-fix default selected a 28 m nominal band, charged the long approach and rejected combat with margin −157.33. Restricting that same model to its already configured 130 m band produced a positive margin +1159.51 and admitted combat.

The final regression contract asks for an admissible existing farther band, not a specific 130 m answer. It passes. This repairs internal decision consistency; it does not prove that the modeled engagement is won in the engine.

## Secondary equipment and firing integration

| Function(s) read | Disposition |
|---|---|
| `brain.normalizeConfig`; `senses.newSelf`, `senseSelf` | Preserve a bounded upgrades catalog, authoritative live self stats and applied upgrade IDs. This enables contextual evaluation without guessing effects from display names. No local resource or inventory mutation replaces observation authority. |
| `loadout.active`, `target`, `horizon` | Equipment changes have a current practice-firewall gate, a listed living target requirement when comparing damage, and a bounded horizon. Inactive cases use the prior ranking. |
| `normalize`, `prospective`, `damage` | Future equipment uses configured effects and applied upgrade IDs. Unknown dropped-gun ammo includes reload downtime rather than assuming a full magazine. Damage delegates to the single macro readiness model with horizontal range; there is no duplicate sustained-DPS model. |
| `pickup` | Avoids duplicate kinds, preserves a charging laser, observes recent equipment-change cooldown and requires a sustained target/slot advantage before a full-slot swap. Danger/zone/recovery guards retain the original fallback for appropriate empty-slot or no-target cases. |
| `utility`, `pick`; `economy.wantPickup`, `pick` | Evaluates known current effects on supported weapon damage, durability, recovery, motion and slew, and keeps the old order for missing/no measured effects or ties. No new point currency is invented. This is contextual utility, not a calibrated score model. |
| `lightningRecipient`, `lightningEnergy`; `firecontrol.run` lightning integration | Finds the physically nearer live object before tactical legality; fresh crates and NPCs can block the desired target, and equal-distance ambiguity is conservative. Combined pulse and commanded movement drain must leave a reserve. The conservative wider blocker cone remains an explicitly uncertain protocol boundary. |
| `mortarArcClear`, `mortarSelfClear`; `firecontrol.run` mortar integration | Uses flight time consistently with the ballistic solution, checks the muzzle prefix and bounded full arc, rejects raw-pitch/TTL failures and current/projected self splash. At most 64 segments are sampled; this is not an analytic collision proof or a new engine. |

Root's separate frozen-source receipts cover 18 mortar, 20 lightning and 19 loadout cases. Those are cross-references, not counts claimed as this reviewer's independent tests. The independent 33-case event suite also passed on the secondary overlay, which helps detect interactions with sensing, offers, inventory and transport.

## Remaining limits and release decision

There is no locally reactive authoritative match simulator in this validation. Known armor is ours; opponent upgrade/armor and future house coordination are partly hidden. Shot envelopes include heuristic hit curves, not confidence-calibrated kill probabilities. Supply-drop utility and safety reserve coefficients are unscored choices. The current official track and protocol describe placement reward and house behavior, but do not publish an exact hunter schedule; no invented schedule was added.

The active 300-observation stimulus is a stitched runtime exercise, not a replay of a plausible whole match. It proves the measured input reaches the revised profile, recovery, drop, early-eligibility and range-fallback branches. Gear-specific utility/physics semantics additionally rely on their explicit unit/integration cases; identical macro actions between candidates on this stimulus are not evidence that every gear branch was exercised.

**Fixture correction retained in the record:** the first input, `adaptive-contact-stream.jsonl.gz` (`2db53d3e…`), contained hello plus 300 observations but omitted the required terminal `end`. The runtime driver reused the last observation as its terminal message, so all three bots correctly answered that extra observation and failed the driver's termination check. Those raw runs and the original fixture are preserved; this was a fixture-construction error, not a demonstrated bot defect. The separate corrected input `adaptive-active300-complete.jsonl.gz` has SHA-256 `8c2ebd77e1a8c6a1dc749aa270c8971e6444534c87fe680b542fded266268322`. All 302 messages—hello, 300 observations and end—were schema/order checked. The end's numeric fields are explicit synthetic IO markers, not scored results. Exactly the same observations retain their earlier state/branch coverage. The constructor now emits the terminal message, and the reusable validator checks the complete protocol boundary.

The algorithm reviewer completed the six specifically affected active-stream reruns, all passing with 300 timely actions and zero late, missing, extra, wrong-tick, schema or internal errors. This reviewer independently read those raw results and the eight retained valid organizer/official runs: all 14 valid-stream process requirements pass, while the six initial fixture failures remain recorded. Exact raw-result hashes are in the acceptance receipt. This is a local pinned-runtime gate, not a Docker/container-equivalence or score claim. Keep capture's 5.47 result as the benchmark until an official new score warrants replacement.
