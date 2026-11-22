# Mech Royale: independent backend and state review

## Review scope

Reviewed the isolated `experiments/mech-capture/bot` and `experiments/mech-geometry/bot` changes against the verified P26 tree at `handoff/.cache/ws/variants7/P26_all/bot`. Inspected the affected profile/fire-control functions and their callers in `brain.js`, `economy.js`, `hunt.js`, `senses.js`, and `stance.js`. This reviewer made no Mech production edits and ran no CPU tests during the Shopping timing window.

The current [official track](https://www.joinbuilders.org/buildathon/tracks/builders) and its linked [protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) were retrieved directly. The track currently advertises builders-4 and 96 practice matches; the protocol's submission paragraph still says 48. Use the current track for tournament settings and do not silently merge conflicting counts.

## Relevant protocol contract

The server supplies the current drop holder and banked progress. Capture advances only while one mech occupies the ring. Multiple occupants freeze the clock; an empty ring or a different sole occupant resets it. Drop capture is authoritative state, not something to infer solely from a local arrival timer. The drop event reports a completed capture. Zone circles interpolate within the announced phase, and the next circle is contained in the current circle. A protocol check replays recorded observations; it does not simulate consequences of bot actions. These facts come from protocol sections 6, 7, and 9 and the checker description.

## Required correction found and resolved

The initial capture patch conflates **banked ownership** with **a currently advancing capture**. `dropPlan` sets `ours` from `holder === self.id && inside`, subtracts progress from the remaining time, and `decideMode` protects such a drop over a finishing fight. When a visible second mech occupies the ring, the same holder and progress remain valid while the clock is frozen. For example, a banked 3.8 seconds of a 4 second capture can be modeled as 0.2 seconds from completion indefinitely during the contest.

The recommended correction is to retain banked progress but distinguish visible contest from uncontested capture. A known contest must not receive the new “finish our capture first” protection as though completion were imminent. Do not discard the banked progress merely because the ring is contested: it resumes if the same holder becomes the sole occupant again. This finding was sent to the implementation author and coordinator before promotion.

The author corrected the source and this reviewer reread it. Final reviewed `prof.js` SHA-256: `0ecedac9c020c8dc529a5c99e6f43259f42943ae981823aa40666147b1ddee51`. `owned` retains the current holder's banked progress; `contested` counts the known ring occupants; `ours` now requires owned and uncontested. A visible contest has infinite modeled completion time, so a different feasible plan can rank ahead of it, and it no longer blocks the finishing-mode priority. The correction preserves the existing urgent-zone override.

The implementation author reports 23 crafted decision tests, including own-contested finishing and leave/reenter transitions. This reviewer did not independently execute those tests. Requested transition coverage also includes enemy leaving and own progress resuming, the ring emptying, holder changing, and a completed drop disappearing; the actual test report determines coverage beyond the two confirmed new cases. The source correction is accepted.

## Function and state checks

| Function / state boundary | Finding | Status |
|---|---|---|
| `senses::sense` supply-drop refresh | Rebuilds `B.drops` from each observation; holder/progress are server values. A removed drop does not persist in this collection. | Sound, unchanged. |
| `prof::dropPlan` | Uses optimistic fastest arrival only to reject a nearly finished enemy capture; complete travel estimate uses walking and the existing path heuristic. Own banked time is retained, while visible contest disables finite completion. | Corrected source accepted. |
| `prof::chooseDrop` | Recomputes `B.dropTask` each profile update. Retains an owned capture at full HP; ranks plans by completion and uncontested ownership. Existing distance, component, abandonment and next-circle filters remain. | Corrected source accepted. |
| `prof::chooseLoot` | Applies the same plan admissibility before adding a drop as general loot. The existing 0.5 second loot refresh can retain a previously chosen objective briefly. | Sound with known refresh delay. |
| `prof::decideMode` | Urgent zone movement remains highest priority. A finishing fight now outranks unrelated or contested drops/grabs; the protected own capture is uncontested. | Corrected source accepted. |
| `prof::legs` | Continues to move toward the ring using the existing stop rule. Does not synthesize progress or treat arrival as capture completion. | Sound, unchanged. |
| `economy::update` | Calls profile economy only while `B.p26on`; the base economy is retained for other posture. | No new ungated path. |
| `hunt::firewall` | Rejects known FFA posture, foreign-death threshold, late circle and low survivor count. The patch does not modify this predicate. | Sound predicate; caller timing caveat below. |
| `brain::act` / `stance::update` | Profile enablement and mode selection occur before stance may update FFA posture on the same decision. This can leave profile hooks enabled for that transition decision. | Inherited limitation, not introduced by these patches. |
| `firecontrol::muzzleClear` | Tests the center-to-muzzle segment as well as the forward ray under the profile and fresh firewall gates. Prevents geometry behind an offset muzzle from being skipped. | Source review accepted. |
| `firecontrol::run` laser rungs | Tests raw pitch/range feasibility for each rung; a feasible lower rung can rescue an infeasible top rung. Final output pitch is clamped. | Source review accepted. |

## Important limits of the reasoning

The existing path estimate is straight distance or a 1.4 multiplier, not a computed shortest path. Connectivity is a useful filter, but the completion estimate is a tactical approximation rather than a guaranteed arrival time. It also cannot predict future unannounced zone phases or an unseen opponent entering the ring.

The geometry patch does not guarantee that a laser is never released at an infeasible target. Its existing full-charge force-release timeout and movement-driven release remain. The new geometric gate improves the normal release decision; final pitch clamping keeps the action valid even when no rung is feasible.

The geometry follow-up adds a fresh `hunt.firewall()` check at fire time, so these new geometry gates stop immediately if stance has just changed. Capture choices still occur before stance detection, as in the baseline. Therefore “all profile behavior is disabled immediately on the first detecting observation” would be too strong. A startup forced-FFA test alone does not cover that transition. Changing stage order is a separate, potentially broader behavior change and should receive its own test before promotion.

Protocol conformance and crafted decisions can establish valid actions and the targeted state behavior. They cannot establish a placement improvement. That requires reactive simulation or newly scored matches under the current rules, with the variance and opponent pool reported.

## Follow-up source review: bounded mortar arc

Independently read the later `experiments/mech-mortar-arc/bot/lib/mortar.js` helper and its changed fire-control block, the unchanged `aim::mortarSolve`, the caller's self-prediction and weapon-stat initialization, and the `World::shotClear` implementation. The reviewed helper SHA-256 is `566edaf7332af1b7cee3e9139101a115a221beb214398b5d84323120d8550275`; reviewed fire-control SHA-256 is `98a300fc9e3d992ebca0f0c2214f4e9ebfa4b3eed4457e6cf3105e1d4b5f4969`. This review ran no additional tests or simulation. The author's eighteen-case receipt is separate in `mortar-arc-cases.json`.

The original near-segment expression mixes an along-direction distance with a horizontal-distance flight-time formula. The new helper uses one time coordinate from the offset launch point throughout the trajectory. Its endpoint-speed bound is sound: constant-gravity velocity is affine in time and its norm is convex, so the larger endpoint norm bounds every intermediate speed. The segment count therefore enforces the stated 0.15-second and 12-metre limits. The curvature constraint follows from the parabola/chord separation `g*h²/8`, giving at most 0.08 m vertical separation. The 64-segment cap plus the barrel-prefix query bounds calls to 65. TTL and raw pitch checks precede trigger ownership; body-risk projection uses the same trajectory endpoint.

No new arithmetic or state blocker was found. The helper remains an approximate firing screen. Its piecewise chords are not a conservative swept-volume proof, the map's terrain ray sampling remains unchanged, and the self-position projection ignores later steering and acceleration. The unchanged solver also leads target motion over flight time but does not first advance the target by observation-to-launch delay; this inherited aiming limitation was reported to the author. Full map/latency checks and an explicit promotion decision remain necessary before combining this physical policy change with the scored capture variant. No score improvement is inferred from these source checks.

## Follow-up source review: weapon readiness and pickup transitions

Independently reread the corrected `experiments/mech-cycle-ready` weapon policy, its fire-time integration, and the economy pickup hook. The exact reviewed sources are:

- `weapon_policy.js`: `e8e217cb25af3ce9792b6bc913d0b7615bcd585a178bb6a56e1ec284e81452a0`.
- `firecontrol.js`: `abcbb0e46eabeaa229e7048008cfe1d4defb8005c2a079f2bf034cc1433a7efe`.
- `economy.js`: `26ed0d70edcf593fffa76b9b0d7df4dec17bf2a9c30792549c4bf53ca9fa24fd`.

A blocker was found in the first lightning policy: using the desired aim inset to collect potential physical blockers omitted a nearer object at 13 degrees when the intended enemy was centered. That could spend energy on the wrong object. The corrected policy separates physical blocker membership from desired-target admission. It includes the full configured angular deviation conservatively, then requires the actual nearest object to lie within the narrower half-cone minus aiming margin. Equal-distance ambiguity suppresses firing, and fresh solid-line-of-sight checks are applied to candidate objects. Both the interrupt aim and the final trigger test use the corrected nearest-object result. The source correction is accepted; the author reports explicit 13-degree crate and neutral fixtures among 38 crafted cases. This reviewer did not independently rerun those cases. The protocol's cone wording is not precise enough to claim engine-equivalent half-angle selection; using the wider blocker cone can reject extra shots, which is an explicit conservative limitation.

The pickup policy retains charge ownership, preserves a gun outside FFA, gates swaps by a four-second damage-capacity heuristic and a sustained improvement threshold, and invalidates cached answers when weapon kinds or the decision context change. A separate review concern about stale pickup dwell was also corrected: `pending.last` now resets the dwell after a gap exceeding the larger of 0.3 seconds and 2.1 decision intervals. Thus an old observation cannot immediately authorize a swap after a long unobserved absence. The four-second damage model and its assumed future LOS, turn rate, and target position remain tactical estimates, not guaranteed damage.

Readiness does not promise never to release an unaligned beam. The inherited force-release and movement-driven charge release still apply. Laser/gun torso ownership, energy reserve accounting, and nearest-target lightning admission are separate gates. Full charge is protected from a lightning aim interruption; partial charge may coexist with a ready finishing gun. The fresh pressure-mode hook is read dynamically for legal targeting and energy reserves, but placement benefit requires scored reactive matches. Protocol replay and crafted actions do not establish the requested 7.5 score.

The subsequent incoming-gun correction was also reread: a pickup with unobserved magazine state is charged a full reload delay in the capacity estimate before it is valued as a full magazine. The newly reviewed `weapon_policy.js` SHA-256 is `e8e217cb25af3ce9792b6bc913d0b7615bcd585a178bb6a56e1ec284e81452a0`. This is conservative valuation and does not synthesize observed ammunition. The author reports 40 crafted cases after this change; those remain author-run evidence.
