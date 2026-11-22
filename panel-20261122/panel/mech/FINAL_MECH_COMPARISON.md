# Final Mech comparison: capture, sustained pressure and burst cycling

## What is ready

Two distinct combined candidates were independently reviewed, frozen, and exercised through the protocol and bounded runtime gates. Both use the owner's selected **5.47 capture entry** as their tactical parent and preserve its source outside the documented changes. The sustained-pressure candidate commits to closer continuous combat after setup. The burst candidate uses wider ranges and short recovery movement when its carried channels are cooling, plus bounded seeded dodge variation.

| Artifact | Bundle SHA-256 | Bytes |
|---|---|---:|
| Capture reference, Git commit `099e7e392a863346575d7ef45bb9af3432544329` | `db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1` | 251,278 |
| `experiments/mech-pressure-cycle/dist/bot.js` | `609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797` | 269,496 |
| `experiments/mech-burst-cycle/dist/bot.js` | `deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d` | 269,497 |

The exact tested bytes were published to the public repository on **22 November 2026 at 08:44:33 UTC**. Anonymous fresh clones verified the commits, all four tracked files and both bundle hashes at 08:46:52 UTC.

| Submission | New branch | Git commit to submit |
|---|---|---|
| First experiment: sustained pressure + ready | [`optimize/mech-pressure-cycle-v1`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/tree/optimize/mech-pressure-cycle-v1) | [`69ed1814707634fb4b5e5953082f3d67ac9e52f8`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/commit/69ed1814707634fb4b5e5953082f3d67ac9e52f8) |
| Second experiment: burst + varied | [`optimize/mech-burst-cycle-v1`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/tree/optimize/mech-burst-cycle-v1) | [`26f382eab378e1193ab9203bb4ec7e706c6780bf`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/commit/26f382eab378e1193ab9203bb4ec7e706c6780bf) |

Both commits have capture `099e7e392a863346575d7ef45bb9af3432544329` as parent and change only `bot.js`. README and the protected existing branches were unchanged by this publication. Receipts are `aggressive-published-releases.json` and `aggressive-fresh-clone-verification.json`. The bundle SHA-256 values identify the tested bytes; the Git commits in the submission table identify entries to submit. Source and bundles are frozen, and no further optional tests are planned.

`pressure-source-acceptance.json` contains the independently checked full source manifests. The two final sources differ only in `lib/params.js`; the policy branches implement genuinely different combat hypotheses.

The source gate and the predetermined strict diagnostic support publishing concrete experiments. They do not establish a higher placement score. The user's 7.5 target remains an objective to test through official submissions.

## Three rounds and the decisions they produced

### Round 1 — preserve the scored base and repair control contracts

The owner reported geometry **5.31** and capture **5.47**, selecting capture. The earlier P26 report was 5.45. These are separate fresh-seed aggregates; their ordering supports current entry selection but does not isolate a causal effect or reveal variance. We retained capture as the parent for the new combined candidates.

The mechanics review established that weapons share a torso but have independent triggers. A laser trigger release fires; it cannot be treated as a harmless weapon switch. The new controller keeps useful gun fire during partial charge, starts laser alignment from live slew/charge timing instead of a fixed 80% threshold, and gives full own charge aim ownership before forced/automatic release. It uses observed charge and cooldown after a short effect. Physical raw-pitch, range and solid-ray checks apply to new aim paths in both squad and FFA modes.

We rejected an assumed active-weapon/equip toggle, synthetic heat, unobserved material penetration and arbitrary random weapon changes. We kept existing intercept, map, navigation and protocol implementations. The original 409-function inventory is an audit map; it is not a claim that all 409 functions were rewritten.

### Round 2 — adversarial review and post-setup commitment

The panel caught and corrected several concrete defects before the final integration:

- A closer object at 13° could disappear from lightning blocker selection when the desired-shot aiming margin was incorrectly applied to the physical cone. Blocker collection and aim admission are now separate; closer neutral/crate and equal-distance cases veto unsupported target-specific firing.
- Repeated pickup queries in one decision could be mistaken for sustained advantage. Dwell now advances with observed time, invalidates on context/equipment changes and resets after an observation gap.
- Unknown dropped-gun ammunition was initially valued optimistically. Its prospective capacity now includes a full refill delay.
- A pressure-mode low-HP veto, permanent squad gun lock, and 0.5-second in-range dwell conflicted with the requested committed combat. Pressure may replace either noncharging slot when the same capacity margin passes. It previews nearby visible kinds without navigating to loot, and requires one full observed decision of persistent advantage.
- Losing the target after a swap could bypass anti-thrash through the no-context fallback. Full-slot replacements now obey the observed four-second equipment cooldown and charging-slot lock even without a target. Empty slots may still fill.
- Optional early reload could overwrite fire control's already-assigned nonempty gun trigger. The macro now preserves that trigger; an empty gun still requests refill.

The new macro latches after suitable setup, with armed/upgraded deadlines so farming cannot continue indefinitely. After commitment it clears the passive health/FFA holds and actively seeks, closes or fights. It keeps physical shell/bullet avoidance, reachable navigation and zone escape. It preserves only an already-owned, visibly uncontested capture with at most 0.6 seconds remaining, under a fixed one-attempt deadline; it does not resume remote drop chasing.

The pressure macro also removes the old profile's situational laser-avoidance veto after commitment. In the final combined fire-control copy, only the specialized FFA gun-flight caps are bypassed while pressure is active; the original base flight/steadiness guard and physical readiness/aim checks remain. This closes a mismatch where a chosen burst fighting band was subsequently rejected by a separate passive FFA cap.

### Round 3 — exact combinations, coverage and strict acceptance

The pure macro, isolated controller and actual combinations were tested separately. The final counts are **34 macro families**, **48 weapon/pickup families**, and **22 true integration families**, plus deterministic identity and malformed-state stress receipts. The two integrated builds received independent backend source acceptance at their exact hashes.

The first runtime summary contained an error: the official checker printed `PASS` for burst despite **298/300 timely answers, two late answers and a 243.3 ms maximum**. The checker tolerates a small late fraction; our intended zero-late release criterion did not. That claim was withdrawn, the raw log was retained, and the harness was corrected to parse explicit counts. The separate first lockstep runs had zero late answers, but they did not erase those outliers.

The first counterfactual stream also changed no movement relative to capture. We rejected it as sufficient evidence of active combat-leg coverage. The replacement contact fixture uses real-map passable feet positions, separated bodies, clear contact rays and safe centered zones. Source audit wrappers show the actual `pressure.legs` method runs in all 300 observations, including chase, firing, recovery, search and bounded capture. Forty-five observations contain 15 charging opponents. These are individually checked counterfactual snapshots, not a reactive simulation or a physically feasible complete match history.

A fixed two-round, 12-process diagnostic was agreed before execution. All 12 completed and passed the strict zero-late criterion. Every result is retained. We did not keep rerunning until a favorable result appeared. The original burst outlier's cause remains unestablished. The old rehearsal never activates the pressure macro; that is a documented cold-path coverage gap, and an isolated warmup experiment was not promoted into these frozen releases.

## What the final functions do

The complete modified weapon-function inventory is in `WEAPON_REVIEW.md`, and the original module/function coverage remains in `FUNCTION_INVENTORY.md`. The new macro was independently read function by function:

| Function or group | Contract and review outcome |
|---|---|
| `makePressure`, `active` | Own a one-way setup-to-commit state and explicit push/burst selection. Disabled mode delegates to the capture controller. |
| `gunReady`, `laserReady` | Read live cooldown/refill/charge. Gun readiness uses the maximum of cooldown and refill; laser charge and slew can overlap in the separate weapon controller. |
| `legal` | Uses living, sufficiently recent non-NPC targets. After commitment, eligibility is deliberately global, including FFA. |
| `rangeFor` | Chooses weapon/context-dependent fighting distance; burst differs from sustained push. Low-energy lightning does not falsely define a usable close-range channel. |
| `damageRate`, `burstDamage` | Rank pressure opportunities from observed weapons/readiness and known baseline armor. These are heuristic capacity estimates, not guaranteed kills or calibrated hit probabilities. |
| `support`, `select` | Score nearby support, approach cost, target HP and short-term finishing opportunities; target hysteresis reduces oscillation. Dense contact is bounded by the track limits. |
| `captureFinish` | Allows only a nearly completed own uncontested capture, within zone feasibility and a fixed deadline. Visible contest or expiry ends the exception. |
| `update`, `mode` | Latch commitment, set energy policy, select targets and override passive holds after stance changes. Health loss alone does not return the bot to indefinite farming/retreat. |
| `allCooling` | Distinguishes a temporary lack of ready channels from an opportunity to fire. |
| `seek`, `legs` | Pursue recent contact or search explicit waypoints; close/fire in push, use bounded recovery range in burst, retain zone and navigation constraints. |
| `wantReload`, `hands` | Refill empty guns; optional reload cannot cancel an already requested nonempty shot. Upgrade choices favor the carried combat channels. |
| `wrapProfile` | Replaces target legality, crate/reload and laser-avoidance hooks only after commitment; other profile behavior stays available before setup. |
| `debug` | Reports the selected phase/target/range and heuristic estimates for audit, without adding protocol output fields. |
| `brain` integration | Creates modules in dependency order; makes pressure decisions before legs/fire, reasserts mode after stance and leaves actual pickup scanning in hands. |
| Final `firecontrol` integration | Adds the pressure-only FFA-cap exception while retaining shared aim arbitration, full-charge protection, actual-nearest lightning, observed readiness and physical gates. |

The shared weapon controller uses:

`T_slew = max(abs(wrapped yaw error)/live yaw rate, abs(pitch error)/live pitch rate)`.

A gun opportunity includes cooldown/refill, torso settlement and projectile travel. A charging laser compares remaining charge with settlement rather than adding both as sequential costs. Full charge, observed short, no-charge movement requests and independent triggers remain separate state constraints. The four-second pickup capacity and the macro's burst/DPS scores support decisions under uncertainty; they are not an engine simulation or numerical win probability.

## Recorded behavior differences

The normal official 300-observation stream produced **zero action differences** from capture for either final combined build. That is useful compatibility evidence for those early recorded circumstances, but it does not test the requested aggressive behavior.

The new contact fixture produces the following actual bundled action differences relative to capture. Both predetermined diagnostic rounds gave the same counts:

| Changed field | Sustained pressure + ready | Burst + varied |
|---|---:|---:|
| Any action | 297 / 300 | 297 / 300 |
| Movement | 297 / 300 | 297 / 300 |
| Boost | 150 / 300 | 75 / 300 |
| Aim | 297 / 300 | 297 / 300 |
| Fire | 45 / 300 | 45 / 300 |
| Reload, upgrade choice, take/drop in this fixture | 0 | 0 |

The last row is a coverage limit of this runtime fixture, not evidence that pickup/reload changes are inert. Their changed decisions are established by the targeted source and full-brain integration families, including legal low-HP full-slot swaps and reload/trigger ownership.

The source-stage audit records push as 120 close, 147 fire, 30 seek and three bounded-capture decisions. Burst records 45 close, 147 fire, 75 recovery-cycle, 30 seek and three capture decisions. Capture instead used 75 roam, 180 standoff, two hide, 28 retreat and 15 drop decisions. These controlled differences show that the intended policy is active. They do not show which policy survives an opponent's response better.

## Runtime measurements, including the unfavorable observation

The strict diagnostic ran **22 November 2026, 08:42:00.767–08:42:30.090 UTC**, using the same verified **Bun 1.4.4**, the same JSC flags, one CPU affinity, the actual arena and normal bundled warmup/fuse. The other panel agents were CPU quiet. No Docker/cgroup/read-only-sandbox equivalence is claimed.

All six strict official-checker repeats answered 300/300 in time, with zero misses/late answers. Their maximum responses were:

| Build | Round 1 maximum | Round 2 maximum |
|---|---:|---:|
| Capture | 13.5 ms | 6.7 ms |
| Sustained pressure + ready | 4.0 ms | 11.9 ms |
| Burst + varied | 7.0 ms | 6.4 ms |

All six contact-stream lockstep runs also answered 300/300 with zero late answers:

| Build / round | p50 | p95 | p99 | Maximum | Process high-water memory |
|---|---:|---:|---:|---:|---:|
| Capture / 1 | 0.35 ms | 1.72 ms | 4.61 ms | 20.62 ms | 78,556 KiB |
| Capture / 2 | 0.32 ms | 1.64 ms | 4.63 ms | 10.04 ms | 70,920 KiB |
| Pressure / 1 | 0.36 ms | 2.69 ms | 7.12 ms | 8.17 ms | 69,928 KiB |
| Pressure / 2 | 0.29 ms | 1.35 ms | 3.63 ms | 5.23 ms | 82,692 KiB |
| Burst / 1 | 0.29 ms | 1.63 ms | 4.22 ms | 6.12 ms | 78,964 KiB |
| Burst / 2 | 0.34 ms | 1.73 ms | 6.35 ms | 7.84 ms | 80,776 KiB |

These measurements show sufficient runtime margin in this fixed diagnostic, with variation between runs. They do not justify a general speedup claim. The earlier burst official run's **243.3 ms maximum and two late answers remain part of the evidence**. Its bot-side logs measured slow work at ticks 206 and 232; those were early official observations before macro commitment. Missing pressure rehearsal alone therefore does not explain them. The appropriate conclusion is a successful bounded repeat with a retained unexplained timing outlier, not a guarantee that no later decision can exceed 50 ms.

Primary receipts are `final-validation/results.json`, `final-validation/CORRECTION.md`, `final-validation/strict-diagnostic/results.json`, `final-validation/strict-diagnostic/action-differences.json` and `final-validation/release-validation-status.json`. No additional optional repeat was run after the fixed batch.

## Books, research and open-source references

| Resource | Why it is useful for these functions |
|---|---|
| Ericson, [Real-Time Collision Detection](https://realtimecollisiondetection.net/books/rtcd/toc/), ray/segment tests and numerical robustness | Review blocker versus aim-cone predicates, finite geometric inputs, raw reachability, tie tolerances and the separately reviewed mortar chord approximation. |
| LaValle, [Planning Algorithms](https://www.lavalle.pl/planning/web.html), feedback, sequential decision-making, partial observations and dynamics | Distinguish physically feasible control from hidden-state estimates; reason about bounded acceleration and setup/commit/recovery episodes. |
| Millington, [AI for Games, third edition](https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972), movement, decision-making, tactics and execution | Keep tactical selection, locomotion, torso/trigger control and hands separate enough to expose priority conflicts. |
| Farebrother et al., [Compositional Planning with Jumpy World Models](https://proceedings.mlr.press/v306/farebrother26a.html), ICML 2026 | Research on temporal abstractions is relevant to committing to policy episodes; our deterministic phase controller does not implement its learned world models. |
| Hansen et al., [TD-MPC2](https://www.tdmpc2.com/), ICLR 2024, with [official MIT code](https://github.com/nicklashansen/tdmpc2) | A useful reference for consistent short-horizon action evaluation and explicit model limits; no external model, code or benchmark gain was imported here. |
| [Official Mech protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) and starter kit | Authoritative action/charge/pickup contracts, live stats, actual-map geometry and the recorded-stream validation boundary. |

The reading choices are tied to concrete invariants and tests. A paper's benchmark performance does not transfer automatically to this game or its CPU budget. The broader source/resource discussion is preserved in `MECH_REVIEW.md` and `weapon-control-physics-review.md`.

## Expected upside and downside

Sustained pressure is the more direct experiment for the owner's request to fight after initial setup. It seeks contact sooner, spends more boost on approach and avoids returning to passive low-HP farming. It may remove targets quickly; it may also enter coordinated enemy fire earlier and reduce placement. Burst keeps the same commitment and physical correctness changes while exploring different range/recovery behavior and bounded dodge variety. It may expose itself less during reload/charge gaps, but it can surrender pressure and kill opportunities.

Both keep the scored capture branch available as a reference. Neither has an official score in this report. The engineering forecast is deliberately uncalibrated: these are plausible aggressive alternatives, with materially more strategic risk than the narrow capture correction. No defensible 7.5 point prediction, winning probability or confidence interval follows from the recorded streams, the crafted tests, or the two prior aggregate scores. The pre-publication hypotheses and recommended pressure-then-burst order are recorded in `aggressive-prescore-hypotheses.json`. Official commit-bound score receipts are needed to select a stronger final entry. The owner retains submission and final-entry selection; the panel has not performed either action.
