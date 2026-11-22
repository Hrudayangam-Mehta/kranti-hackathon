# Current panel checkpoint — 22 November 2026

This branch preserves the original handoff and adds the completed panel work under `panel-20261122/`. It is an evidence branch, not a track submission. README files are unchanged.

## Submission commits

| Track / tactic | Branch | Commit |
|---|---|---|
| Shopping Rust | `optimize/shopping-rust-v1` | `3d8fe30157e655ef6109c17205a8d8b530e1ccfb` |
| Mech continuous pressure | `optimize/mech-pressure-cycle-v1` | `69ed1814707634fb4b5e5953082f3d67ac9e52f8` |
| Mech burst pursuit | `optimize/mech-burst-cycle-v1` | `26f382eab378e1193ab9203bb4ec7e706c6780bf` |

All three were pushed and verified through fresh anonymous public clones. No game submission or final-pick action was performed. Owner-reported current picks before these tries are Shopping C at 1.0598 s and Mech capture at 5.47. New official results are pending. Suggested Mech order is continuous pressure, then burst pursuit. Target 7.5 is unmeasured.

## Read first

- [Release index](panel-20261122/panel/RELEASES.md): hashes, behavior, honest comparison and verification limits.
- [Shopping report](panel-20261122/panel/SHOPPING_RELEASE.md): exact final Rust changes, three rounds, tests, timing and remaining gap to 67.
- [Mech policy review](panel-20261122/panel/mech/PRESSURE_POLICY_REVIEW.md): equations, every new macro function and three rounds.
- [Weapon review](panel-20261122/panel/mech/weapon-control-implementation-review.md): controller functions and corrected composition.
- [Research map](panel-20261122/panel/RESEARCH_NOTES.md): book chapters, primary papers, official docs and open-source references.
- [Artifact manifest](panel-20261122/MANIFEST.json): file sizes and SHA-256 pins.

The new Mech source is in `panel-20261122/experiments/mech-pressure-cycle/bot/` and `panel-20261122/experiments/mech-burst-cycle/bot/`. The new Shopping source is in `panel-20261122/experiments/dense-wide42/`. Other experiments are controls, rejected alternatives or explicitly unpromoted prototypes; do not submit them by folder name. The published branches contain the minimal scored packages.

## Evidence interpretation

Shopping final gates: 35 Rust unit tests,320 adversarial runs,36 official fixtures,6 independent complete 1M comparisons, and exact 60M differential comparison. Earlier ENOSPC and signal-9 failures remain in the reports. Final 60M after disk cleanup is one success, not a three-run median.

Mech final gates include 48 controller cases,34 macro cases per candidate,22 integration cases, identity/stress sequences, official checks and 12 predetermined strict diagnostic processes. One earlier burst check had 2 late answers/maximum 243.3 ms despite tolerant PASS; later clean runs do not erase it. Contact fixtures are counterfactual schema/map-checked inputs, not reactive matches. The active-warmup prototype and isolated mortar correction remain unpromoted.

Older handoff and panel reports remain historical context. This checkpoint and final source/bundle pins supersede stale candidate picks, temporary publication blocks and the corrected zero-late summary.

## Reproduction notes

The archived layout mirrors the session workspace. Run harnesses from `panel-20261122/`. Their `handoff/` dependency can be a checkout of the original handoff commit, or a link to this branch's root after materializing the required original kit/ref paths. Rebuild binaries into `bench/bin/`; generated inputs and output tables were deliberately omitted. Rust is pinned 1.97.0 with the recorded static-CRT locked build; Bun is pinned 1.4.4 with the Dockerfile JSC flags. The competitor's binary/source is not archived; its recorded public revision and hash identify the earlier differential comparison, whose future fetchability is unverified. All logs record original paths for provenance.

The supplied credential was used only transiently for this owner's repository. It is absent from new files and persistent git configuration. Preserve the owner instructions: new branches only, no README changes, no other teams' code in entries, and owner-operated game submission.
