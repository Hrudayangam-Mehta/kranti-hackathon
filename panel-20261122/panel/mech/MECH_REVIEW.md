# Mech Royale: verified P26 baseline, decision audit and two new behavior candidates

Prepared 22 November 2026. This audit concerns the team's own Mech source. It is separate from the Shopping Sessions Rust rebuild. The candidate source, patches, build receipts, crafted cases and replay receipts live beside this report; no competitor Mech source was imported. No game-server request or submission was made by this reviewer.

## Outcome and baseline

Two isolated candidates passed the final local conformance gate: **geometry** changes shot feasibility and laser aim-rung selection; **capture** changes supply-drop state valuation and the choice between finishing a fight and finishing a capture. They are distinct behavior changes derived from the documented mechanics. Neither has an official score, so neither has a defensible numerical placement prediction.

The source baseline is P26_all, corresponding to commit `3417f9965d2bfc3133ddf7d43cd86bcef6dbd79b`. The owner's reported builders-4 result is 5.45. That result is owner supplied; this work did not authenticate the signed-in score receipt. The readable source at `handoff/.cache/ws/variants7/P26_all/bot` rebuilt with Bun 1.4.4 to exactly the same bytes as the remote baseline `bot.js`. Parent independently verified remote Git blob `5b5a67f897b898a7ff05341089a8863174d4fac6`, length 250,189 bytes. The baseline SHA-256 is `fe7a9f6173a1e9a0615ee3a0ba277f1b1914c86c217007cf1e9203cc52af36aa`.

The similarly named MX_p26 tree is a template with `prof: 'off'`; it is not the baseline for these experiments. P26_all enables `prof: 'p26'` and uses the all-ones slot table. Those settings were retained in both candidates. Their Dockerfile, license and README bytes remain identical to the baseline. No README was edited.

| Candidate | Changed source | Source SHA-256 | Bundle SHA-256 |
|---|---|---|---|
| Geometry | `lib/firecontrol.js` | `59fc257de4f792191e35ec063f93eede202b9ff0c1e61942d504aea10112c2f7` | `a19a4364c40bf3008ef1cddb5d48324a913849066e3a76d9218fad390fbd4bab` |
| Capture | `lib/prof.js` | `0ecedac9c020c8dc529a5c99e6f43259f42943ae981823aa40666147b1ddee51` | `db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1` |

`candidates-build.json` gives exact paths, sizes and patch hashes. The two bundles are 250,504 and 251,278 bytes. Build runtime was the official pinned Bun 1.4.4 Linux x64 release; its executable SHA-256 is `10702245766b225e70bbf6235fd6b47214fd94b4760d00ffaed8ab0df57ac235`. Downloaded tools are outside the minimal bot distribution.

The coordinator published verified commits `b92af4e563ec1f86aac29b8e1116ba85453dfe5a` on `optimize/mech-geometry-v1` and `099e7e392a863346575d7ef45bb9af3432544329` on `optimize/mech-capture-v1`, each based on the verified P26 commit. An initial GitHub app write failed with HTTP 403. The owner then supplied a new token and explicitly authorized publishing new branches; publication succeeded using that newly authorized method. `published-releases.json` records the outcome. Main, exp, blast and handoff were not changed by this push. Publication makes these commits available to submit; it does not submit them to the game or establish a score.

## Evaluation model that governs these experiments

The [current official track](https://www.joinbuilders.org/buildathon/tracks/builders) and [announcement](https://www.joinbuilders.org/buildathon/leaderboard) identify builders-4, 96 fresh private seeds for a distinct practice build, and retention of the first result for identical code. The previous common fixed-match interpretation and arithmetic slot-delta ledger are therefore obsolete. A different commit hash is not proof that the scorer regards code as distinct, and a repeat of identical code is not an independent resample. The companion `../mech-announcements.md` records the retrieved evidence, documentation conflicts and timestamp.

Practice is against a coordinated house squad. Qualification/final play is free-for-all. Mean placement points reward surviving opponents; they are not a count of our kills. A squad-focused change can improve practice and still harm final free-for-all behavior. That is why these changes retain the existing profile gate and why free-for-all action identity is tested separately. The baseline's late-circle and low-survivor firewall remains in place. The documented answer budget is 50 ms, one CPU and 512 MB. The [protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) still contains an older match count in its submission introduction; the newer track and announcement determine the evaluator count.

The owner's instruction retires the local simulator as a ranking tool. No match ranking was generated here. Recorded-observation replay checks actions, errors and timing; it does not allow a changed action to alter later observations. Consequently it cannot estimate survival gain, weapon hit rates or a new official score.

## Decision pipeline and coverage

The inventory in `FUNCTION_INVENTORY.md` covers 409 named declarations/methods/arrows across all 20 source modules, including the entry point. Anonymous callbacks are represented by the containing function. This is an inventory and review map, not a claim that each path has an isolated proof or that every function needed rewriting.

| Stage | Main source and function families | Review and resulting decision |
|---|---|---|
| Input and configuration | `bot.js` protocol pump, sanitization, initialization; `brain.js` normalization, warm-up, `act`, staged time fuse | Keep the validated JSONL path, ready/end handling, latest-observation policy and finite output sanitizer. Exercise malformed state and configuration; measure the actual bundle. |
| Perception and memory | `senses.js` self/live stats, tracks, damage, threats, sounds, loot and drops | Keep the server's holder/progress as authoritative. A listed mech can be a retained observation, so a known occupancy estimate is not perfect visibility. |
| Physics and terrain | `aim.js` intercept/slew/ballistic helpers; `world.js` terrain/prism casts; `nav.js` connectivity, path and walk-line methods | Keep the established math and navigation. Correct the fire-control caller's skipped near-muzzle segment and premature target-pitch clamp. Map sampling remains approximate. |
| Target and fight value | `tactics.js`, `hunt.js`, `prof.js` legality, DPS/TTK, target and shot choice | Preserve profile legality and target choice for these isolated variants. Sustained-DPS finishing ignores some current readiness details; record it as a separate next experiment. |
| Economy and mode | `economy.js`, `prof.js` drop/grab/loot planning and mode arbitration | Add holder/contest-aware capture planning. Prefer a credible immediate finish over an unrelated distant drop; keep an advancing own capture. |
| Movement | `mover.js`, `brain.js` leg arbitration, `stance.js` environment and posture | Preserve acceleration-aware threat movement, walkability/zone checks, body-size/stat inputs and bounded route search. Do not assume hostile opponents share collision avoidance responsibility. |
| Weapons | `firecontrol.js` self prediction, gun solve, muzzle test, slew gate, laser ladder, lightning, mortar and reload | Add new geometric checks under a fresh fire-time firewall. Preserve baseline force-release fallback, fire target, reload policy and final action clamp. |
| FFA and adaptation | `ffa.js`, `counters.js`, `steal.js`, `scan.js`, `aimcal.js` | Preserve behavior when the new practice branch is off. Compare action streams at all 16 slots and on the actual map; do not interpret heuristic confidence values as probabilities. |
| Parameters and I/O helpers | `params.js`, `io.js` | Retain live configuration anchoring, profile and slot settings, bounded options and output behavior. |

Detailed source reasoning covered the changed functions and their callers in the brain, profile, economy, sensing, stance and hunt modules, plus projectile math, movement, targeting and map interfaces. The broader inventory distinguishes these reviews from unchanged infrastructure covered primarily by interface checks and replay. It would be inaccurate to say that all 8,000-plus lines were recoded or formally verified.

## Candidate A: physically feasible shot selection

### The two specific gaps

First, the original `muzzleClear` constructs a forward muzzle point at radius plus 0.5 metres from the body muzzle and starts its solid-geometry query there. Geometry between the body and that assumed point can therefore be skipped. The official protocol says a barrel offset is shortened by solid geometry. The new code checks the short body-to-offset segment before the original forward ray. A crafted plane-wall case two metres in front of a three-metre offset makes the old function fire and the new function reject the blocked line. A clear path is unchanged, and a wall beyond the original offset is rejected by both versions.

This is a conservative correction using the existing `World.shotClear`; no authoritative engine collision implementation or clip epsilon was available. It does not claim exact equality to the server's start-point clipping or terrain discretization. Current LOS and movement prediction can also make the case uncommon; the test establishes the function-level defect, not its frequency in matches.

Second, the original laser path clamps the selected target pitch to the mech's allowed command interval before deciding whether the beam can hit it. A physically unreachable target angle can become a legal command angle and pass a target gate. In addition, the range test of the highest rung can prevent a reachable lower rung from being considered. The new branch keeps raw target pitch for feasibility, checks every configured rung for pitch and three-dimensional range, and then uses the first clear reachable rung under the existing priority. Final commanded pitch still passes through the existing clamp. The range safety margin remains the original P26 five metres.

### Equations and intended constraints

The existing bullet intercept solves for the earliest positive time satisfying

\[
\|r+vt\|=st+o,
\]

where \(r\) is the muzzle-to-target vector after latency prediction, \(v\) target velocity, \(s\) projectile speed and \(o\) the forward muzzle offset. Squaring gives

\[
(v\cdot v-s^2)t^2+2(r\cdot v-os)t+(r\cdot r-o^2)=0.
\]

This implementation already handles the near-linear case and rejects nonpositive or nonfinite times. The candidate keeps it. Constant velocity is a prediction assumption; the existing reversal and airborne corrections handle some departures from it.

For a laser rung at height \(z_f\), the geometric pitch and distance are

\[
\theta_f=\operatorname{atan2}(z_f-z_m,\rho),\qquad
R_f=\sqrt{\rho^2+(z_f-z_m)^2}.
\]

Feasibility requires \(\theta_{\min}\leq\theta_f\leq\theta_{\max}\) and the retained range margin. Slewing introduces a second constraint: command legality does not imply the torso has reached that command. The existing `predYaw` and `predPitch` gates remain. Their minimum rotation-time model is the maximum of yaw-error/yaw-rate and pitch-error/pitch-rate.

### Firewall correction from independent review

The Rust reviewer traced stage order and found that `B.p26on` is computed before `stance.update`, which can observe foreign deaths or latch FFA later in the same decision. Reusing the cached profile alone would permit new geometry on that transition. The final candidate has a fresh geometry-only predicate, `B.p26on && B.hunt.firewall()`, at fire time. All new prefix-ray, raw-pitch and rung-range checks use it. When it is false, the original P26 path remains, including its original P26 range margin. This avoids changing the baseline's other one-decision transition behavior.

Six crafted transition cases compare original and candidate with cached profile true but live FFA or one foreign death: near-barrel wall, impossible elevation and top-rung range miss. All produce identical outputs. This is stronger evidence for the new branch than a profile-disabled-from-start test alone.

### Remaining tradeoffs

The added short ray query and four-rung reach pass cost some work per relevant shot. They are bounded by the existing ladder, but spatial traversal still depends on map geometry. Measured decision latency is reported separately. The aim points remain a finite ladder rather than a continuous target-cylinder intersection solver. The existing full-charge timeout and movement-required early release can still release a laser without passing the new precision gate. Therefore this candidate improves the normal feasible-shot gate; it does not guarantee that every beam can hit.

## Candidate B: holder-aware supply-drop decisions

The protocol makes capture a stateful process: exactly one mech in the ring advances progress; multiple occupants freeze it; an empty ring or a different sole occupant resets it. Arrival time alone does not determine when a drop becomes ours. The original P26 choice did not use the reported holder and progress in its commitment decision and ignored own captures at full health.

### New plan and arbitration

`dropPlan` derives three distinct concepts: **owned** means the reported holder is self and self is inside; **contested** means more than one known live mech occupies the ring; **ours** means owned with no known contest and is the condition eligible for finishing-capture priority. Banked progress is retained for owned captures even during a contest. A known contested clock has no finite completion estimate while the contest persists. If the enemy leaves, the same banked progress resumes; if it reenters, the finish-first protection is removed again.

For a foreign holder that is listed, nearly stationary and the sole known occupant of a landed drop, an optimistic arrival bound is compared with its remaining capture time:

\[
t_{\min}=\frac{\max(0,d-R)}{\max(1,v_{\rm walk},v_{\rm boost},v_{\rm current})}.
\]

If even that bound exceeds the holder's remaining time plus two simulation ticks, the plan is rejected, unless the selected holder is itself a finishing target. A known second occupant prevents this rejection because the clock is frozen. This is conditional on current observations and continuation of a stationary holder; it is not a future certainty.

For admissible choices, walking plus the existing path estimate provides a conservative tactical arrival estimate, combined with landing time and capture time. Own progress is subtracted only when ownership is valid. Existing zone, component, abandoned-location, range and early-arrival filters remain. Zone feasibility is evaluated for the earliest estimated completion; an indefinite contest cannot be certified safe indefinitely and still yields to the existing urgent-zone mode.

`chooseLoot` uses the same admissibility check so a rejected capture cannot immediately reappear as ordinary drop loot. `chooseDrop` can retain a full-health own capture, whose energy and cubes still have value. `decideMode` keeps urgent-zone movement first; a finishing fight then outranks unrelated drops/grabs, while an uncontested owned capture remains protected. A visibly contested own ring receives no such special protection.

### Independent review correction and limits

The backend reviewer caught an initial ownership/contest conflation: a frozen owned 3.8/4-second capture was being treated as 0.2 seconds from completion. The final code separates those states. Targeted tests cover contestant departure and reentry while preserving the 3.8 seconds of banked progress and switching DROP/FIGHT priority appropriately.

The path estimate is straight distance or a fixed obstruction multiplier, not an exact shortest path; connectivity is a filter rather than an arrival guarantee. Listed opponents can be retained tracks, and an unseen opponent can enter the ring. A moving holder can leave; current holder success is not inevitable. The new foreign-holder skip is deliberately narrow. The old profile enablement still occurs before stance classification, so the entire capture policy can inherit one decision of the existing classification lag. No stage-order rewrite was included.

## Validation evidence

The following receipts apply to the final source hashes listed above unless expressly labeled otherwise.

| Gate | Result | What it establishes |
|---|---|---|
| Baseline source provenance | Fresh Bun 1.4.4 bundle byte-identical to remotely verified baseline | Correct starting revision rather than a similarly named inactive template |
| Crafted changed-path regressions | 23/23 | Barrel obstruction, reachable lower laser rungs, pitch feasibility, clear paths, two firewall-transition conditions, foreign capture races, owned progress, contest freeze/resume and mode priority |
| Forced-FFA deterministic replay | 34 equal runs; 5,100 baseline-identical actions per candidate | All 16 slots with deterministic bot seeds plus an actual-map run preserve tested FFA actions |
| Synthetic state/configuration stress | 24 runs; 2,400 decisions per build including baseline; zero invalid actions, errors or fuse trips | Low/no energy, low HP, shrinking zone, airborne state, incomplete/malformed configuration, reload/charge states, malformed tracks/projectiles, drops and offers produce valid decisions in the tested cases |
| Official 300-observation checker | Baseline and both corrected bundles: 300/300; zero late, stale, wrong-tick or malformed answers; zero brain errors/slow decisions | Runtime JSONL schema, tick echo and deadline behavior on the bundled code |
| Baseline/candidate one-core p95/p99 timing | Three separate 300-observation driver runs pass; all maximum elapsed answers below 5 ms in this run | Host-local elapsed response distribution with normal runtime settings |

Source equivalence tests disable warm-up and raise the time-fuse threshold to compare deterministic logic. These settings are confined to the harness. The harness passes a nonfinite deadline, which the existing brain normalizes to its usual deadline for overrun counters; that deadline does not suppress action paths when the separate fuse threshold is raised. Actual-bundle performance tests use the normal bot and the pinned runtime flags from the inherited Docker configuration. The protocol checker uses recorded observations; it is not a game ranking.

The isolated timing window ran **07:37:10–07:37:23 UTC on 22 November 2026**, after the other panel agents stopped CPU work. Every checker/driver process and its Bun child were pinned to CPU 0. The lockstep driver adds p95 reporting to the inherited auditor and keeps normal bot settings. Exact bundle hashes, runtime flags, per-run output and dates are in `protocol-results.json` and `latency-results.json`.

| Bundle | Driver p50 | Driver p95 | Driver p99 | Driver maximum | Sampled process high-water RSS | Late answers |
|---|---:|---:|---:|---:|---:|---:|
| Verified P26 baseline | 0.30 ms | 1.10 ms | 2.28 ms | 2.99 ms | 79,840 KiB | 0/300 |
| Geometry | 0.29 ms | 1.20 ms | 2.96 ms | 4.21 ms | 81,812 KiB | 0/300 |
| Capture | 0.30 ms | 1.18 ms | 2.84 ms | 4.70 ms | 81,928 KiB | 0/300 |

The independent official-checker runs also passed, with maximum answers 3.4, 2.9 and 3.7 ms respectively. Different maxima between the checker and driver illustrate host/runtime variation; one small stream is insufficient to establish a precise slowdown distribution. Readiness in the official checker was 2,217, 1,812 and 2,029 ms. Each driver observed four runtime threads under a single allowed CPU, clean process exit and no unsolicited output. Memory figures are process samples, not cgroup peak accounting. The replay's fixed final `place` is supplied by its saved end message and must not be interpreted as a score achieved by a candidate.

The normal-setting driver also produced exactly the same 300 actions for baseline and both candidates (`recorded-stream-action-diffs.json`). Thus this saved stream establishes regression/conformance behavior but does not demonstrate an action improvement or estimate the frequency of the corrected cases. The crafted cases, which intentionally reach the changed states, establish that the policies differ. Timing on this stream is correspondingly not a worst-case stress measurement of every new geometry path.

Single-CPU affinity is narrower than a full official container replica. This machine has no Docker runner, and the inherited release gate requires cgroup/network/read-only sandbox features not established here. No claim is made that these local results prove the organizer's memory accounting or complete sandbox gate. Backlog/stall injection was not part of this final timing window. The final response must preserve these distinctions.

## Priority of future experiments

1. **Current-readiness finishing model.** `prof.ownDps` uses sustained damage estimates, so a nearly empty or reloading weapon can make a target look finishable before any shot is available. An independent finite-horizon timeline using current cooldown, reload, ammo, charge and energy could replace this specific estimate. Test exact tick boundaries, half-charged laser, unavailable gun and low-energy lightning before allowing it to change `S.finishing`. The existing `hunt.ttk` is a useful own-team reference, but its assumptions should be checked rather than copied blindly.
2. **Own armor and incoming damage.** Current profile DPS ignores some known self mitigation, while opponent upgrades are not all observable. A model may safely use reported self stats, but must keep unknown opponent armor as uncertainty rather than inventing it.
3. **Action-consistent capture threat.** A richer capture model could weigh shots that remove the holder or expel it from the ring, but only with feasible range/slew/readiness and a reachable escape plan. Capture progress is discrete authoritative state; an economic score should not synthesize it.
4. **Movement danger under uncertainty.** Retain hard walkability/zone constraints, then estimate reachable safe velocities with bounded acceleration. Avoid applying reciprocal collision methods as if hostile bots promise to avoid us. Any new movement variant needs adversarial corner, bridge, wall and late-zone tests; no simulator-derived ranking is warranted.

These are unimplemented follow-ups, not claims about the shipped candidates. Rewriting all stable navigation and I/O code would add risk without evidence that those functions caused the identified decision defects.

## Research resources tied to specific functions

| Primary resource | Applicable choice | What not to infer |
|---|---|---|
| Steven M. LaValle, [Planning Algorithms](https://lavalle.pl/planning/), especially geometric planning, feedback and partial information | Review `nav` connectivity/path limits, `mover` reachable actions and the distinction between observed and actual occupancy | A geometric route is not automatically safe against an adversary or a probabilistic survival guarantee |
| Ian Millington, [AI for Games, third edition](https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972) | Keep decision layers explicit; use state machines/hysteresis to separate capture ownership, contest and mode transition | A general game-AI technique does not establish a score gain in this evaluator |
| van den Berg et al., [Reciprocal n-Body Collision Avoidance / ORCA](https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf) | Useful reference for velocity-space constraints and for inspecting `mover` avoidance assumptions | Its reciprocal responsibility assumption does not hold for hostile mechs; do not transplant a half-responsibility rule |
| [Official Mech protocol and starter kit](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) | Authoritative units, current stats, projectile/aim/capture contracts and observation schema for every case above | The stale 48-match introduction is superseded by the current track announcement; local replay is not reactive gameplay |

These are relevant foundations, not a claim that a 2026 state-of-the-art benchmark result transfers to this small deterministic policy. Research is useful when it yields a concrete invariant, cheaper computation or testable decision. Here the strongest improvements came from enforcing the actual aim and capture contracts.

## What can and cannot be predicted

### Written pre-submission predictions

These are uncalibrated engineering forecasts relative to the owner's reported **5.45** P26 result, written before either candidate is scored. They are not confidence intervals, matched-seed comparisons or estimates of a numerical winning probability.

| Candidate | Working forecast | Why it may improve | Why it may be worse | Priority |
|---|---|---|---|---|
| Geometry | Approximately baseline to a modest uplift if the corrected aim cases occur often enough; no justified numerical point score | Prevents particular blocked or unreachable normal shot decisions and permits feasible lower aim points | Extra geometry queries, conservative obstacle rejection, or longer charge holding can lose some opportunities; rare cases may make the score effect negligible | First distinct try: narrow mechanism and smaller tactical-policy change |
| Capture | Potential modest uplift, with more policy risk than geometry; an improvement above 5.45 is a hypothesis | Avoids a narrow already-lost capture race, preserves own valuable capture progress, and stops distant loot from preempting a plausible immediate finish | Visibility/path estimates can be wrong; the inherited sustained-DPS finishing heuristic can overrate a finish while reloading; an aggressive finish can expose us to the squad | Second distinct try: evaluate separately so a policy regression is not hidden in the geometric change |

The old fixed-slot arithmetic cannot tighten either forecast under fresh private seeds. A reported higher score would be useful selection evidence for that submission, but without per-match results it would still not identify the mechanism's causal effect or its uncertainty.

With distinct death ordering, placement points can be written as the number of opponents eliminated before self; same-tick ties require the organizer's tie convention. Thus maximizing our kill count and maximizing expected placement are different objectives. A successful low-risk finish can remove future incoming fire, while an exposed chase can lower survival. An average 5.45 across the reported official matches does not reveal the per-match variance, tail risks or correlation between candidate outcomes.

The geometric candidate should reduce normal release attempts at impossible aim rungs and avoid a particular skipped obstruction; it can also incur extra queries and sometimes hold a charge longer. The capture candidate should avoid certain already-lost races and preserve valuable own progress; its travel/visibility assumptions can still be wrong. Those statements are mechanism-based hypotheses. There is no calibrated probability of outperforming P26 and no defensible predicted score without new official results or an independently validated reactive evaluation. The exact tested bundles should be submitted as separate concrete tries, and their scorer version, commit and returned receipt should be logged before comparing results.

### Subsequent owner-reported results and continuation

After the forecasts above were written, the owner reported geometry **5.31** (`BB-49DC4526`) and capture **5.47** (`BB-5C0B1ABA`), with capture selected. Exact submitted commits are recorded in `official-owner-results.json`. These fresh-seed aggregates guide selection without establishing a paired causal effect. The later adaptive weapon work therefore uses capture as its tactical parent. Its implementation, tested contracts, independent reviews and remaining score uncertainty are in `WEAPON_REVIEW.md`. The new pressure macro is a separate response to the owner's request for committed combat after initial setup; the 409-function inventory is a review map, not a claim that all those functions were rewritten.
