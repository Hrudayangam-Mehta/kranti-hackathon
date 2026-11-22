# Published submission commits

Repository: https://github.com/Hrudayangam-Mehta/kranti-hackathon

| Track / tactic | Branch | Commit |
|---|---|---|
| Shopping, final reviewed Rust pipeline | `optimize/shopping-rust-v1` | `3d8fe30157e655ef6109c17205a8d8b530e1ccfb` |
| Mech, continuous pressure and adaptive weapons | `optimize/mech-pressure-cycle-v1` | `69ed1814707634fb4b5e5953082f3d67ac9e52f8` |
| Mech, burst pursuit, adaptive weapons and varied dodge ties | `optimize/mech-burst-cycle-v1` | `26f382eab378e1193ab9203bb4ec7e706c6780bf` |

All three are pushed and independently checked through anonymous public clones. The GitHub connector also confirmed the branches. Shopping's fresh source clone rebuilt to a byte-identical tested executable. Each Mech public clone contains the exact tested bundle. Each commit message is `Update`, with the ChatGPT co-author footer.

Shopping changes seven Rust source files and preserves README, Dockerfile, dependency pins and LICENSE. The Mech branches are children of the selected capture commit and change only `bot.js`; README, Dockerfile and LICENSE are unchanged. `main`, `exp`, `blast`, `handoff`, and previously published submission branches were checked around publication and were unchanged by these pushes. No token, other team's source, generated dataset or native compiled executable was added to a submission branch.

## Suggested submission order and known scores

For Mech, try continuous pressure first and burst pursuit second. They express different tactical hypotheses, with a shared reviewed mechanics implementation. The owner-reported selected baseline is capture `099e7e392a863346575d7ef45bb9af3432544329`, score **5.47**. Earlier geometry `b92af4e563ec1f86aac29b8e1116ba85453dfe5a` scored **5.31**. The new hashes have **no official score** in this session. The target **7.5** corresponds to mean placement 8.5 under the current formula; the selected baseline corresponds to 10.53. There is no calibrated probability of reaching that target from these tests.

For Shopping, submit the Rust hash above to obtain its official result. The owner's C baseline is **1.0598 seconds**. The latest local five-run batch measured the new build at **1.8814s**, C at **2.4551s**, and the pinned public Team 67 comparator at **1.1340s**. Those are same-batch local medians, not hidden-data forecasts. The new build is still slower than the comparator. The final full-size output agrees exactly with it, and smaller complete outputs also agree with independent semantic references.

No game-server connection, submission action, or final-pick change was performed. The owner submits these hashes through the official track pages. Identical Mech code retains its first builders-4 score, so resubmitting a hash does not produce a fresh independent score sample under the current announcement.

## What the Mech pair changes

Setup completes at a laser/lightning weapon plus an actual upgrade or qualifying live offer. Deadlines prevent indefinite setup: an upgraded gun at 60 seconds, or any weapon at 90 seconds. After commitment, low health and unfavorable combat estimates do not restore passive healing or farming. The bot pursues reachable opponents, uses modeled sustained damage or a 1.5-second burst estimate, keeps target hysteresis, and selects upgrades for its carried weapons. It may finish an already-held uncontested capture with at most 0.6 seconds remaining; it does not start a remote supply trip after commitment.

The shared weapon controller accounts for actual torso slew, cooldown, ammo/reload, held laser charge and lightning energy. It preserves compatible independent triggers, models the nearest lightning object, evaluates nearby equipment over a common horizon, allows pressure to replace the gun in either posture, and prevents immediately reversing a swap. Charging-slot protection, physical take bounds and equip costs remain. Burst changes valid bullet-dodge tie ordering through a separate bounded seeded stream; this is reproducible variation, not cryptographic unpredictability.

Cross-review corrected the old defensive laser predicate, a reload command that could cancel a valid shot, a firing-distance/flight-cap mismatch, nearer lightning blockers, pickup dwell while moving, and a dropped-gun reacquisition hole. Source, equations and function-level reviews are in `mech/PRESSURE_POLICY_REVIEW.md`, `mech/weapon-control-implementation-review.md`, and `mech/pressure-backend-review.md`.

The Shopping engine is Rust 1.97.0. Mech uses the existing pinned Bun 1.4.4 runner with the new JavaScript decision modules. This release does not claim a full Rust port of the Mech bot, a full rewrite of Team 67's architecture, or formal verification of every existing function.

## Tests and material limits

Shopping's final executable passed 35 Rust unit tests, 320 adversarial reference/readback runs, all 36 official fixtures, and six complete independent 1M-event comparisons. A successful 60M-event/15M-click run matched all **6,629,125 user-day and 28,014 campaign-day rows** against the pinned competitor output. Earlier signal-9 and ENOSPC failures remain recorded; only one final full-size run after disk remediation is claimed. See `SHOPPING_RELEASE.md`.

Mech's exact pair passed 34 macro cases per candidate, 22 integrated cases, 5,100 feature-disabled identity decisions per candidate and 2,400 enabled malformed/low-energy/zone decisions per candidate. The controller suite has 48 cases. These are overlapping behavioral checks, not thousands of independent scored matches.

The first later burst timing run had **two late answers out of 300**, with **243.3ms** maximum, despite the official checker's tolerant PASS label. The raw result and explicit correction are retained. A predetermined two-round diagnostic then ran **12 processes** across capture and the two candidates on the normal and contact streams; all 12 answered all 300 observations within budget. Contact maximums were 8.17/5.23ms for pressure and 6.12/7.84ms for burst. This does not erase or explain the earlier outlier.

The contact fixture demonstrably executes actual aggressive movement on all 300 frames, with movement different from capture on 297 frames, including 45 frames with 15 charging opponents. It is schema-valid and map-checked **counterfactual stress**, not a reactive match simulation or proof of engine-reachable history. Its synthetic zone schedule and one synthetic laser cooldown are explicitly documented. Docker/cgroup-equivalent runtime enforcement was unavailable here. The 50ms official budget still applies on the organizer's machine.

The missing active-pressure startup rehearsal and the isolated mortar-arc correction are documented, unpromoted experiments. They are absent from these hashes. Neither the startup coverage gap nor the host conditions have been established as the cause of the late burst answers.

## Evidence map

- `SHOPPING_RELEASE.md`: final source/function map, three rounds, performance, exactness and environment limitations.
- `RESEARCH_NOTES.md`: primary papers, author/publisher book chapters, official Rust/Parquet docs and open-source resources mapped to specific implementation questions.
- `mech/PRESSURE_POLICY_REVIEW.md`: every new macro function, equations, tactical tradeoffs and three rounds.
- `mech/WEAPON_REVIEW.md` and `mech/weapon-control-implementation-review.md`: control functions and test mapping.
- `mech/pressure-source-acceptance.json`: independent source/bundle pins.
- `mech/final-validation/strict-diagnostic/results.json`: every predetermined runtime result.
- `mech/contact-fixture-review.md`: independent fixture scope and path-coverage audit.
- `mech/aggressive-prescore-hypotheses.json`: written before publication and official scoring.
- `shopping-published.json`, `shopping-fresh-public-clone.json`, `mech/aggressive-published-releases.json`, and `mech/aggressive-fresh-clone-verification.json`: publication and clone receipts.

Earlier reports remain historical evidence. Where an earlier candidate selection, publication block or tentative test summary conflicts with these final pinned receipts, use this release index and the explicit correction rather than discarding the earlier raw record.
