# Adaptive Mech release — 22 November 2026

## Published candidates and submission decision

Repository: https://github.com/Hrudayangam-Mehta/kranti-hackathon

| Order | Candidate | Branch | Submission commit | Status |
|---|---|---|---|---|
| 1 | Adaptive engagement, recovery, economy and range | `optimize/mech-adaptive-v1` | `398ba96e34ee1d7875b62afce78c3cf3b2745676` | Pushed; local gates passed; official score pending |
| 2 | Adaptive plus contextual equipment and weapon physics | `optimize/mech-adaptive-weapons-v1` | `f3743067ae98c3a583a98fb5489ede10531451a6` | Pushed; local gates passed; official score pending |
| Reference | Capture | `optimize/mech-capture-v1` | `099e7e392a863346575d7ef45bb9af3432544329` | Owner-reported selected entry, 5.47 |

The primary commit is a child of capture. The equipment commit is a child of the primary, so the second comparison isolates its additional equipment/physics changes. Both minimal submission trees contain only `Dockerfile`, `LICENSE`, `README.md` and `bot.js`. Only `bot.js` changes. Fresh anonymous public clones have the exact tested bundle hashes; README, Dockerfile and LICENSE match capture byte for byte. The atomic push preserved every pre-existing remote branch head. The owner submits these hashes; no game-server submission or final-pick change was performed.

Submit the primary first, then the equipment variant as a separate hypothesis. Keep capture selected until an official result improves on 5.47. Do not infer an official score from local branch coverage, runtime, source review or a competitor's reported simulations.

Bundle SHA-256:

- Primary: `a372e8a3a8b6ac19faf58b3e227440b594b25238ef9d02f31be3728323a6c45d`.
- Equipment: `0f49821cae2ea53dcbe7d4eccf6ca9b2a6c29fb509c78d19cec7d89e1b3b51e5`.

Publication receipts: `adaptive-published-releases.json`, `adaptive-fresh-clone.json`, `adaptive-fresh-build.json`, `adaptive-preflight.json`. Exact source inventory: `adaptive-builds.json` and `adaptive-function-inventory.json`.

## What the lower official scores establish

| Owner-reported submission | Score | Difference from capture |
|---|---:|---:|
| Geometry `b92af4e563ec1f86aac29b8e1116ba85453dfe5a` | 5.31 | −0.16 |
| Capture `099e7e392a863346575d7ef45bb9af3432544329` | 5.47 | Reference |
| Continuous pressure `69ed1814707634fb4b5e5953082f3d67ac9e52f8` | 4.74 | −0.73 |
| Burst pursuit `26f382eab378e1193ab9203bb4ec7e706c6780bf` | 4.67 | −0.80 |

The two aggressive builds underperformed in the reported evaluations. Their shared pressure policy permanently latched after setup, cleared ordinary economic/recovery goals and overrode disengagement cues. Source counterexamples show why those contracts can be harmful. They do not establish which component caused the measured loss: the builds combined macro and weapon changes, and no paired match-level outcomes are available. The new primary returns to the stronger capture parent and changes its existing tactical owner.

The [official track](https://www.joinbuilders.org/buildathon/tracks/builders) scores mean `16 − place`. Thus 5.47 corresponds to mean placement 10.53; the requested 7.5 corresponds to 8.5. Kills and damage are useful when they improve placement, but are not a separate practice score bonus. The cooperative house squad can escalate pursuit after removals. The current track and [announcements](https://www.joinbuilders.org/buildathon/leaderboard) specify 96 fresh private seeds and retain the first result for identical code. These facts prevent treating identical resubmissions or unpaired aggregate scores as a controlled estimate of a policy's causal effect.

## Three expert-panel rounds

| Round | Work | Concrete result |
|---|---|---|
| 1: mechanics and failure audit | Rust/core reviewer traced the decision chain; backend reviewer checked authoritative state/events/rewards; algorithms reviewer investigated Ahmad and adversarial policy cases. | Eleven own-source counterexamples, pinned competitor provenance, explicit distinction between current rules and stale kit text. Capture chosen as parent. |
| 2: implementation and independent contracts | Reworked the existing `prof` policy, with separate contextual equipment/physics experiment. Independent state, goal and physical tests challenged actual composition. | Removed permanent commitment from the candidate path; corrected different-target finish privileges, reload/shot conflicts, dropped-gun timing, horizontal-distance contracts, stale equipment eligibility and zero-to-positive upgrade value. |
| 3: adversarial integration and frozen runtime | Reproduced a far-range refusal, checked charging movement energy, reviewed fallback modes and ran exact frozen bundles through strict external process gates. | Shared feasible-range fallback; 14 valid process checks and 4,200 timely decisions. Retained six earlier fixture termination failures, corrected only the fixture end record and reran exactly the affected six cases. Fresh public clones and rebuilds match. |

The panel accepted the source and local release gates within the limits below. This is not confidence that the next official score will exceed 5.47 or reach 7.5.

## Decision behavior by situation

| Situation | New behavior | Remaining boundary |
|---|---|---|
| Early spawn, incomplete setup | Preserve the original uncertainty period and existing navigation/loot machinery. | No learned spawn-specific policy or exhaustive map search was added. |
| After 20 seconds, applied upgrade and usable laser/lightning | Temporarily admit favorable fights using observed readiness. Do not wait automatically for the original 75-second gate. | An offered but unapplied upgrade is insufficient; eligibility is not an unconditional attack order. |
| Weapon depleted, reloading or cooling | Recompute finite-horizon output and engagement feasibility; readiness can close again. | Enemy cooldowns/upgrades are incomplete observations. |
| Near kill | Permit a short finish only for the actual selected firing target, fresh line, feasible single-channel capacity and survival/zone margin. | A modeled shot is not a guaranteed hit. |
| Preferred close range requires lethal approach | Check the existing bounded range candidates through the same exchange predicate and use the admitted band in movement. | This is a bounded local choice, not globally optimal trajectory planning. |
| Several opponents or recent heavy incoming damage | Include current/prospective incoming pressure, approach and escape allowance before committing. | Hidden enemies and future house behavior remain unknown. |
| Low HP with a feasible quiet window | Suppress optional crate/NPC farming that would restart the regeneration clock. Continue admitted resource recovery. | Existing emergency and late/FFA controllers still apply. |
| Full HP but low energy at a useful supply drop | Explicitly value energy restoration and cube/upgrade benefits; consider route, wait, capture and exit time. | Restore resources only after a feasible completed capture; contest prevents invented progress. |
| Cubes near an upgrade threshold | Value threshold crossing as well as capped combat stats. Penalize excess body growth without a useful threshold. | Coefficients are transparent heuristics, not calibrated score probabilities. |
| Cached loot target becomes dangerous | Revalidate current goal pointers every decision without rerunning all route searches. | Route exposure is sampled rather than a full future LOS simulation. |
| Circle, alive count or observed lobby changes | Retain zone priority and existing late, low-alive and FFA fallbacks. | The inherited mode-classification order has a one-decision transition lag. Earlier practice decisions can still change the later state. |
| Useful nearby replacement weapon | Equipment variant compares finite-horizon benefit after equip/reload cost, with charging protection and anti-thrash confirmation. | Mortar acquisition remains the existing fallback; the shared macro does not estimate terrain-safe mortar output. |
| Pending upgrade offer | Equipment variant evaluates configured effects on current weapons, survival and mobility, with the existing ranking for unsupported/tied effects. | Some noncombat energy/capacity effects receive no separate utility estimate. |

The current candidate does not add another randomization wrapper. Context-dependent decisions and preserved movement behavior provide variation; there is no claim of strategic unpredictability against an adaptive opponent.

## Equations and modeling choices

The common readiness helper computes `D(w, r, H)`: finite nonnegative damage capacity from a normalized weapon `w`, horizontal range `r`, target state and horizon `H`. It uses observed ammunition, reload/cooldown, charge, energy, travel and aim-settlement time. Ordinary planning uses four seconds; the helper is bounded at twelve seconds. `killTime` performs eight bounded bisections over that same envelope. The finish exception uses the maximum feasible single-weapon capacity, rather than summing incompatible aim bursts. Ordinary exchange estimates can still sum channels before downstream trigger/aim constraints.

The exchange predicate compares modeled exposure over approach, fight completion and escape with current HP and a retained margin, then applies zone feasibility. The same predicate evaluates the preferred and fallback bands. This prevents admitting a fight under one distance and moving to a different, untested distance. It does not make the unknown enemy model exact.

The explicit resource utility is:

`cubeValue(n) = max(0, 0.06 × cappedStatCubes + 0.16 × crossedUpgradeThresholds − 0.025 × excessBodyCubes)`

`dropValue = missingHPFraction + 0.35 × missingEnergyFraction + cubeValue(dropCubes)`

Travel, waiting, capture, exposure and exit feasibility are separate admission checks. These weights express a hypothesis and are not measured placement exchange rates. A full-health drop was already reachable through capture's lower-priority loot path; the change creates a contextual high-priority choice, rather than claiming the old bot never collected such drops.

For equipment replacement, the new item's modeled four-second capacity must exceed `1.2 × oldCapacity + one baseline gun-shot damage`. Unknown dropped-gun ammunition is conservatively zero, and equip plus reload time precedes its first useful shot. A candidate needs 0.2 seconds of confirmation and a four-second pause after an observed equipment change; a charging laser cannot be replaced. This deliberately avoids a new combinatorial inventory planner.

## Function-level and complexity review

The primary changes only `lib/prof.js` and `lib/params.js` relative to capture. It retains one tactical owner, the existing route cache and target list, and skips the obsolete sustained-DPS finish branch on the adaptive path. There is no pressure wrapper stacked above the macro and no second equipment damage model. The equipment variant shares `B.prof.readyDamage` and adds focused `loadout`, `lightning` and `mortar` helpers. The nominal range is tried first; the existing eight-band list is checked only when that exchange fails.

`ADAPTIVE_POLICY_REVIEW.md` maps each changed macro function to its contract and tests: `update`, `readyDamage`, `readyTotal`, `killTime`, `freshShot`, `escapeTime`, `incomingAt`, `exchangeAt`, `ownDps`, `prefRange`, `selectTarget`, `cubeValue`, `dropValue`, `goalBudget`, the loot selectors, `decideMode`, `recoveryWanted`, `crateShot` and `wantReload`. `adaptive-function-inventory.json` records all 20 primary and 23 equipment JavaScript modules, including 421/438 lexically named functions and unchanged-module provenance. Inline callbacks belong to their enclosing functions. Inventory coverage is not a claim that all functions were rewritten or formally proved.

Weapon-specific changes in the equipment variant:

- **Gun:** shared readiness accounts for live ammunition, finite reload cycles, intercept/travel and target geometry. A legal positive-ammo shot is no longer overwritten by an optional reload. Dropped-gun utility includes equip and reload delay.
- **Laser:** preserved charge/release semantics and charging-slot protection. Capacity includes charge/cooldown and actual torso settlement. The protocol's charge movement multiplier is applied before boost affordability. The valid laser-specific charge turn multiplier was retained after a reviewer challenge was disproved by the initial config.
- **Lightning:** find the nearest physical recipient, including a crate or NPC, before admitting the desired tactical target. Check actual muzzle prefix, 3D range, LOS and ambiguity. Budget pulses together with concurrent boost/jet drain and retained energy. Conservative cone boundaries can reject some legal opportunities.
- **Mortar:** evaluate a dimensionally consistent full parametric arc, prefix, TTL and pitch; use at most 64 segments with explicit geometric/time bounds; screen current and projected self-blast risk. This replaces the old short-prefix-only clearance check. It can reject useful wall-impact splash, and future self motion is only a constant-velocity estimate. Macro mortar capacity remains explicitly zero rather than inventing a guaranteed hit.

All four weapon state forms and the relevant event categories are exercised by state fixtures. Observed self state is authoritative; events do not mint resources or double-apply upgrades. The retained 64-event merge cap keeps the newest events and can evict older kill credit under an oversized backlog; it does not track or deduplicate event IDs. No claim is made that every weapon is always ready, every event history is retained indefinitely or every situation has an optimal response.

## Ahmad Suliman: attributable source and adversarial review

The public repository is [ahmad-ovh/Buildathon](https://github.com/ahmad-ovh/Buildathon). Its public account name and [pinned STATE document](https://github.com/ahmad-ovh/Buildathon/blob/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675/docs/STATE.md) identify Ahmad Suliman. The inspected head was `f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675`; the documented v3 checkpoint was `56e0f76be02a4b85bae99d71a209f1958173b244`. Its active Docker build uses Go, while its Python README is stale. The public board showed 6.74 at inspection, but the exact commit earning 6.74 remains unresolved. Do not attach that score to the inspected head.

Useful contracts in the earlier documented policy were reversible engagement/recovery, resource detours during combat, cumulative incoming pressure and evaluation of several combat ranges. Our implementation independently derives tests and equations for those contracts. No competitor source, constants or fitted tables were copied into our submission or evidence trees.

The public model is not an oracle. The inspected later head computes a candidate range but returns a fixed band; retains named flags after their behavior was removed; simplifies lead/vertical/head-clearance logic while widening firing tolerance; and changes weapon/upgrade preferences relative to its documentation. Its damage estimates also rely on defaults and incomplete opponent state. These are source-grounded weaknesses and test ideas, not a demonstrated way to defeat the actual 6.74 submission. We did not execute its claimed local simulator or measure a head-to-head outcome.

The top-five board snapshot was Ahmad Suliman 6.74, rogue_agi 6.39, tigerbyte 6.36, not even close 6.21 and immortal-lucy 6.21. Exact public submission revisions for the other four were not verified. `adaptive-round1-competitors.md` contains the attribution chain, version differences, specific source links and search limits.

## Frozen-source tests and runtime evidence

| Test family | Result | Interpretation |
|---|---:|---|
| Primary implementation counterexamples/regressions | 28/28 | Actual decision contracts, including a real firecontrol shot/reload composition |
| Independent state/event/IO cases | 33/33 per candidate | Observed-state authority, event handling, weapons and process contracts |
| Independent goal/readiness cases | 32/32 per candidate | Resources, drops, readiness, risk, zone and recovery |
| Official schema checks on those observations | 375/375 per candidate | Schema validity; not a claim of a reactive match history |
| Cross-mode and early-setup tests | 16/16 | Includes 900 fallback identity comparisons and documented transition lag |
| Equipment physical and utility cases | 18 mortar + 20 lightning + 19 loadout = 57/57 | Adversarial helper behavior, not a measured swapping score gain |
| Valid-stream runtime processes | 14/14 | 4,200 requested decisions on time, no missing, malformed, wrong-tick, extra or internal-error decisions |

There were **20 total process attempts**, not 20 passes. Two organizer checker runs and six strict official-stream runs passed. The initial six active-stream attempts answered all 300 observations on time but failed termination: the generated fixture lacked its final `end` message and the driver recorded an extra output after its terminal resend. That shared fixture defect affected capture as well as both candidates. The original logs remain. Only an explicitly synthetic terminal record was appended; the same 300 observations and frozen bundles were retained. Exactly those six affected processes were rerun, and all passed. `adaptive-final-validation/CORRECTION.md` and `release-validation-status.json` preserve the correction without erasing the initial result.

| Frozen bot | Valid processes | Timely decisions | Worst measured decision | Highest observed VmHWM |
|---|---:|---:|---:|---:|
| Capture | 4 | 1,200 | 28.51 ms | 82,412 KiB |
| Adaptive | 5 | 1,500 | 29.44 ms | 90,348 KiB |
| Adaptive + equipment | 5 | 1,500 | 30.27 ms | 89,924 KiB |

The two extra candidate runs are the organizer checker runs. The strict batches used pinned Bun 1.4.4 and one-CPU affinity. This host did not reproduce the full Docker/cgroup/UID sandbox; memory was observed rather than enforced at 512 MB. The worst measured decisions are below the 50 ms action budget, with outliers retained. These are local measurements, not universal tail-latency guarantees.

Both new bundles differ from capture on 86/300 official-stream decisions and 212/300 active-stream decisions. Primary and equipment produce identical actions to each other on these two particular streams. The additional equipment behavior is therefore demonstrated by focused cases, not by a positive runtime-stream ablation or score gain. Repeat rotations were action-identical. The active fixture uses real map/config and valid phase/zone observations, but stitches counterfactual situations; it is neither a reactive game nor proof of a physically reachable complete trajectory. Its synthetic `end` result has no score meaning.

## Resources and language choice

The panel's full primary-source map is [RESEARCH_NOTES.md](../RESEARCH_NOTES.md). For these changes the most relevant chapters are LaValle's *Planning Algorithms* chapters 8–12 on feedback, sequential decisions and uncertainty; Millington's *AI for Games* chapters 3–6 and 9 on movement, decisions, tactics and execution; and Ericson's *Real-Time Collision Detection* section 5.3 and chapters 11/13 on ray/segment queries, numerical robustness and performance. Rust work uses the official Rustonomicon, the Rust Performance Book and *Rust for Rustaceans* chapters on ownership, testing, unsafe code and concurrency.

TD-MPC2 (ICLR 2024), Compositional Planning with Jumpy World Models (ICML 2026), and ORCA/RVO2 are primary references for horizon comparisons, temporal abstraction and motion constraints. No trained world model or published-paper performance was reproduced. ORCA's reciprocal responsibility assumption does not hold automatically for hostile house bots. Rust hashbrown/rust-csv and DuckDB/Arrow inform the separate data pipeline and independent correctness checks. The resources were assigned to concrete questions; they are not a reason to add unrelated infrastructure.

Shopping remains Rust 1.97.0. These Mech releases retain the existing pinned Bun 1.4.4 runner; they are not a Rust port. A complete language rewrite and an unmeasured rewrite of all existing functions were not performed. The remaining priority is an official score for the two isolated hypotheses, not a claim that local review establishes optimal play.

## Related Shopping release

The completed Shopping Rust submission is `3d8fe30157e655ef6109c17205a8d8b530e1ccfb` on `optimize/shopping-rust-v1`. The local five-run 20M comparison measured wall medians of 1.881402 s for our candidate, 2.455066 s for C and 1.134012 s for the pinned public Team 67 comparator. Our candidate is 23.4% faster than C in that batch and still about 1.66 times the comparator's wall time. Full 60M/15M outputs matched exactly; see [SHOPPING_RELEASE.md](../SHOPPING_RELEASE.md) for the independent references, exact input/binary pins, memory/CPU measurements and retained earlier failures. Its official score is still pending; C's owner-reported 1.0598 s is not a score for this new Rust hash.
