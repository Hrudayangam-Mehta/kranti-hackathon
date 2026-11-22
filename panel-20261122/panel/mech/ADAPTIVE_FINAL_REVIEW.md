# Adaptive Mech — three-round panel result

**The smaller adaptive candidate is the recommended next official try. Both frozen candidates pass the required local protocol/runtime gates. Keep capture at 5.47 as the selected score reference until an official result supports replacing it.** The equipment fork is a separate, higher-change-surface hypothesis. This review does not predict a score of 7.5 or assign a fabricated confidence interval.

## Baseline and frozen outputs

| Entry | Status | Evidence |
|---|---|---|
| Capture `099e7e392a863346575d7ef45bb9af3432544329` | Owner-reported 5.47; reference | Existing source and exact published bundle reproduced earlier. |
| Pressure `69ed1814707634fb4b5e5953082f3d67ac9e52f8` | Owner-reported 4.74 | Permanent pressure hypothesis rejected as the next base. |
| Burst `26f382eab378e1193ab9203bb4ec7e706c6780bf` | Owner-reported 4.67 | Same permanent-pressure concern; not selected over capture. |
| Adaptive | Local gates passed; not officially scored at review | Bundle SHA256 `a372e8a3a8b6ac19faf58b3e227440b594b25238ef9d02f31be3728323a6c45d` |
| Adaptive plus equipment/physical checks | Local gates passed; not officially scored at review | Bundle SHA256 `0f49821cae2ea53dcbe7d4eccf6ca9b2a6c29fb509c78d19cec7d89e1b3b51e5` |

These SHA256 values identify tested bundle bytes, not Git commit IDs. The moderator published the exact frozen outputs at 2026-11-22 09:35:25 UTC:

| Published branch | Submit commit |
|---|---|
| `optimize/mech-adaptive-v1` — recommended first | [`398ba96e34ee1d7875b62afce78c3cf3b2745676`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/commit/398ba96e34ee1d7875b62afce78c3cf3b2745676) |
| `optimize/mech-adaptive-weapons-v1` — separate equipment hypothesis | [`f3743067ae98c3a583a98fb5489ede10531451a6`](https://github.com/Hrudayangam-Mehta/kranti-hackathon/commit/f3743067ae98c3a583a98fb5489ede10531451a6) |

`adaptive-published-releases.json` records the bundle match, README unchanged and all preexisting branch heads unchanged across publication. Only the bundled `bot.js` changes in each release commit. Neither publication is an official game submission or score.

## Round 1 — evidence and rejected assumptions

The current official objective is placement-based `mean(16 - place)` against a coordinated house squad in practice. Hunters share information, seek weak opponents and escalate as opponents are removed; the exact escalation schedule is unpublished. A kill can improve placement and remove current pressure while also changing the next encounter. Treating every armed state as permanent permission to attack discards recovery, repair drops, upgrades and escape options. The lower pressure/burst aggregates are consistent with this concern but are fresh-seed, unpaired results: they do not isolate the causal effect of any one weapon or movement change. See the [official track](https://www.joinbuilders.org/buildathon/tracks/builders) and [protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1).

Public attribution of Ahmad Suliman's repository was established through the [public account](https://github.com/ahmad-ovh/) and self-identification in [Buildathon's state document](https://github.com/ahmad-ovh/Buildathon/blob/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675/docs/STATE.md). The inspected public HEAD is `f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675`; the documented earlier Go v3 checkpoint is `56e0f76be02a4b85bae99d71a209f1958173b244`. **Neither was established as the scored 6.74 submission.** Their repository's local simulator claims and empirical hit curves were not reproduced or imported.

The clean-room lesson was conditional, repeatedly updated combat and reward decisions, not a copy of their program. Source/history review also found drift between their documentation and latest implementation, including a chosen engagement range that was evaluated and then discarded. A leaderboard name, a public branch head and a scored receipt must not be collapsed into one fact. The full attribution, pins, negative lookup coverage and adversarial source review are in `adaptive-round1-competitors.md` and its sources JSON. No competitor source belongs in either release or the owner's evidence branch.

## Round 2 — three bounded correction groups

### 1. Make a finish and engagement physically plausible

The primary candidate uses observed ammunition, reload, cooldown, charge, energy, live speeds, torso delay, pitch/range and projectile flight to estimate output over a bounded horizon. A finish privilege requires one feasible channel, a fresh line, sufficient time and the same target actually sent to firing. The ordinary exchange estimate remains qualified because two slots share one torso and enemy hidden state is unknown.

The audit caught and corrected a greedy-range refusal: the draft selected a high-output close band, failed the approach budget, and gave up even though a farther band already in the candidate list passed. The final code evaluates the same admission predicate for a bounded fallback and executes the admitted band. In the independent 200 m source regression, the final choice is 160 m; the close 40 m case remains at 28 m with an unchanged action. The database reviewer independently checked the failure on a real-map 198 m lane.

After the existing 20-second uncertain opening, an observed upgrade and usable secondary can temporarily permit normal engagement selection. This does not latch combat permanently or bypass the exposure/zone checks. A ready early setup actually fires in the independent full-brain case; an empty secondary remains gated; a losing exchange still disengages.

### 2. Retain the ability to recover and take valuable rewards

The candidate preserves the repaired distinction between owned capture progress and currently uncontested capture. Full HP no longer automatically makes a drop worthless: missing energy, useful pre-cap cubes and cumulative upgrade thresholds can justify it. A contested capture has no finite assumed completion.

Resource goals are revalidated from current state before mode execution, even between the existing 0.25/0.5-second economy refreshes. The separate calm-retreat cube path is included. Regeneration uses the authoritative last damage-dealt/taken times; opportunistic farming cannot silently restart the healing clock during chosen recovery. A prediction of a reward never increments inventory locally.

### 3. Keep equipment and physics as a separate hypothesis

The larger fork consumes the same readiness model for equipment/upgrade comparison, retains the charged-slot lock, uses short confirmation and post-swap anti-thrash, and applies persisted weapon upgrades to prospective equipment once. It preserves the baseline preference where a payoff is not modeled. It does not pretend unsupported mortar capacity is a reason to swap.

The physical changes check nearest lightning recipients before legality and include movement/pulse energy expenditure. Mortar clearance uses one consistent parametric arc with bounded segments and conservative blast checks. These changes do not introduce a second tactical owner. They were independently tested in 19 loadout, 20 lightning and 18 mortar cases by the moderator.

The detailed function-by-function audit is `adaptive-round2-review.md`. The parent inventory separately accounts for all repository modules; it is not a claim that every function was rewritten.

## Round 3 — fixed validation, including the test error

The final primary source passed the algorithm reviewer's **16/16** control-ownership cases, including **900 exact recorded-action identities** with adaptive/profile/FFA controls disabled appropriately. The final source also passed the repaired range regression and close-band identity. The Rust reviewer reports 28 targeted policy/physics cases; the database reviewer reports 33 state/transport and 32 goal/readiness cases on each final fork. These are distinct suites, not a count of matches won.

The runtime plan was fixed before execution: two organizer `check/check.py` invocations, then twelve fresh-process strict replays of three frozen bundles on two inputs across two rotations. The driver imports the exact kit schema and has no internal retry. Bun 1.4.4, CPU0 affinity, map files and runtime flags were fixed. The normal bundled warmup/fuses remained active; no cgroup/Docker or exact official-container replication is claimed.

Both organizer checks passed 300/300 timely with no internal retry. All six official-input strict runs passed. The constructed active input initially omitted its end message, and the driver's existing last-message assumption resent the last observation. Every bot correctly answered it, so all six active runs failed the termination gate. Their 300 requested decisions were timely, but the failures were not relabeled passes.

The original input bytes and all fourteen runs remain preserved. The only approved correction added a schema-valid end message to a separate input, with all 300 observations unchanged. Exactly the six affected active processes were rerun, in the same rotations; all six passed with zero late, malformed, missing, wrong-tick, unsolicited or internal-error answers. The total evidence is **20 process attempts: 14 valid-stream passes and six retained fixture-termination failures**. The original batch's HOLD is superseded by `adaptive-final-validation/release-validation-status.json`; the raw batch is not altered.

The original window was 2026-11-22 09:30:17–09:30:48 UTC; the six corrected checks ran 09:32:46–09:32:59 UTC. Both windows used parent-coordinated CPU quiet. All source and bundle hashes stayed fixed.

### Local latency results

Each cell lists round 1 / round 2 values. These are measured on this machine, not official performance guarantees.

| Bundle | Official p95 | Official maximum | Active p95 | Active maximum |
|---|---:|---:|---:|---:|
| Capture | 1.11 / 2.24 ms | 3.47 / 28.51 ms | 1.71 / 1.82 ms | 5.32 / 4.99 ms |
| Adaptive | 2.13 / 2.27 ms | 5.21 / 29.44 ms | 2.34 / 1.89 ms | 7.04 / 6.47 ms |
| Adaptive plus equipment | 1.23 / 2.83 ms | 4.65 / 30.27 ms | 2.07 / 2.10 ms | 5.28 / 6.19 ms |

All valid-stream decisions were below the 50 ms budget. The approximately 29–30 ms maxima in the second official rotation occurred across all three controls and are retained; their cause was not established. Startup readiness was about 1.8–2.1 seconds, below the 20-second hello budget. Timing does not establish which policy wins.

### What the active stream actually exercised

The active observations use real map geometry, the official initial configuration and phase-derived zones, but are stitched counterfactual snapshots rather than a feasible reactive match history. Source instrumentation recorded profile target/mode/leg calls on all 300 frames, early setup eligibility on 113, range fallback on 26 and finish permission on 30. Final modes were FIGHT 153, HOLD 5, DISENGAGE 50, DROP 42, HEAL 25 and ZONE 25. Low-alive/late-profile fallback is checked separately by the control suite.

Each new bundle changed 86 of 300 official-input actions versus capture: movement 86, boost 4 and aim 14, with unchanged triggers. On the active input, each changed 212 of 300 actions: movement 154, aim 177, fire 78 and boost 37. Both rotations produced identical action sequences for each bundle.

The primary and equipment fork produced identical outputs on these two streams. No pickup, drop-weapon or upgrade choice differed there. The equipment-specific source tests provide separate evidence of those branches; this runtime trace must not be described as proving improved dynamic equipment choices. The smaller primary should therefore be the first official hypothesis to assess.

## Resources tied to concrete review decisions

| Primary resource | Use in this work | Boundary |
|---|---|---|
| Steven LaValle, [Planning Algorithms](https://www.lavalle.pl/planning/web.html), especially feedback, sequential decisions, information and dynamics chapters | Repeated current-state admission, one decision owner, bounded prediction horizons and explicit uncertain state. | This implementation is a hand-authored policy, not a solved optimal planner. |
| Ian Millington, [AI for Games, third edition](https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972) | Movement, decisions, tactics and execution ownership; test the selected goal through actual firing/reload dispatch. | No book-derived performance claim. |
| Christer Ericson, [Real-Time Collision Detection](https://realtimecollisiondetection.net/books/rtcd/toc/), ray/segment and numerical robustness material | Consistent mortar trajectory, muzzle-prefix checks, finite ranges and boundary fixtures. | Available world geometry and bounded segmentation are approximations. |
| [ORCA primary paper](https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf) | A useful contrast for collision avoidance assumptions. | Hostile opponents cannot be assumed to take reciprocal half-responsibility; ORCA was not transplanted into this bot. |
| [TD-MPC2 primary project](https://www.tdmpc2.com/) | Research context for short-horizon evaluation and repeated replanning. | No learned dynamics, trained agent or transferred benchmark result is present here. |
| [Compositional Planning with Jumpy World Models, ICML 2026](https://proceedings.mlr.press/v306/farebrother26a.html) | Research context for choosing decisions at useful temporal scales rather than a permanent combat latch. | The authored phase/readiness rules do not implement or reproduce that learned method. |

The useful engineering contribution is turning these ideas into explicit observable contracts and adversarial cases. “Recent” does not mean a paper's performance transfers to this game.

## Remaining limits and selection decision

There is no current authoritative reactive ranking simulator. Public competitor evaluations are not official scored receipts, and no exact public commit was tied to Ahmad Suliman's 6.74 result. The new ready-damage and reward models still contain heuristic coefficients and incomplete information about enemy upgrades, cooldowns, future cover and hunter escalation. The primary remains behind the inherited practice firewall; its first foreign-death/FFA transition has the existing one-decision ordering lag. The equipment hook itself uses a fresh firewall.

A local gate demonstrates protocol conformance, executed branches and bounded observed runtime. It does not show that 212 changed actions are better, or that a score will rise above 5.47. Retain capture as the selected reference, try the smaller adaptive branch, and use the resulting official receipt to choose whether to retain it or test the separate equipment hypothesis. No additional optional local test is justified by the current evidence.
