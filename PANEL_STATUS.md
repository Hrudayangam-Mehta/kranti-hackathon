# Current panel checkpoint — 22 November 2026

This evidence branch preserves the original handoff and the previous panel checkpoint, then records the completed adaptive Mech work under `panel-20261122/`. It is not a track submission. README files are unchanged.

## Submission commits

| Order | Track / tactic | Branch | Commit |
|---|---|---|---|
| 1 | Mech adaptive | `optimize/mech-adaptive-v1` | `398ba96e34ee1d7875b62afce78c3cf3b2745676` |
| 2 | Mech adaptive plus equipment/physics | `optimize/mech-adaptive-weapons-v1` | `f3743067ae98c3a583a98fb5489ede10531451a6` |
| Separate track | Shopping Rust | `optimize/shopping-rust-v1` | `3d8fe30157e655ef6109c17205a8d8b530e1ccfb` |

These are pushed and verified through anonymous public clones. Fresh rebuilds match the tested artifacts. Capture `099e7e392a863346575d7ef45bb9af3432544329`, owner-reported 5.47, remains the selected Mech reference. Pressure scored 4.74 and burst 4.67; the earlier recommendation to submit them is superseded. The two new adaptive candidates have no official score. Shopping C's owner-reported pick is 1.0598 s; the new Rust hash is unscored. No game submission or final-pick action was performed.

The primary is a child of capture. The equipment candidate is a child of the primary. Both minimal Mech packages change only `bot.js`; earlier branches and README files were preserved. Use the primary first and evaluate the equipment additions as a separate hypothesis. The goal of 7.5 is not a measured result.

## Read first

- [Current release index](panel-20261122/panel/RELEASES.md).
- [Complete adaptive release report](panel-20261122/panel/mech/ADAPTIVE_RELEASE.md).
- [Independent final review](panel-20261122/panel/mech/ADAPTIVE_FINAL_REVIEW.md).
- [Tactical function review](panel-20261122/panel/mech/ADAPTIVE_POLICY_REVIEW.md) and [independent function audit](panel-20261122/panel/mech/adaptive-round2-review.md).
- [Backend/state review](panel-20261122/panel/mech/adaptive-round2-backend-review.md) and [source acceptance](panel-20261122/panel/mech/adaptive-backend-acceptance.json).
- [Superseding runtime receipt](panel-20261122/panel/mech/adaptive-final-validation/release-validation-status.json), with the original fixture failures retained alongside the corrected batch.
- [Public Ahmad source audit](panel-20261122/panel/mech/adaptive-round1-competitors.md); exact 6.74 source revision remains unverified.
- [Shopping report](panel-20261122/panel/SHOPPING_RELEASE.md) and [research resources](panel-20261122/panel/RESEARCH_NOTES.md).
- [Artifact manifest](panel-20261122/MANIFEST.json).

The final adaptive source trees are `panel-20261122/experiments/mech-adaptive/bot/` and `panel-20261122/experiments/mech-adaptive-weapons/bot/`. Only the listed submission commits are proposed for scoring. Earlier pressure/burst, isolated prototypes and round-2 snapshots remain diagnostic history. The mortar correction is included in the new equipment candidate, but was absent from the earlier pressure pair.

## Evidence interpretation

Three rounds completed: mechanics/source forensics; implementation and independent contract tests; adversarial range/physics integration and frozen runtime. Independent backend checks passed 65 contracts and 375 schema-valid observations per candidate. The primary own suite passed 28 cases, cross-mode review passed 16 cases with 900 action identities, and equipment-specific tests passed 57 cases.

The final runtime gate has 14 passing complete-input processes and 4,200 timely valid decisions. Six earlier active-stream attempts failed termination because the fixture omitted its end message; those raw failures remain. Only the terminal fixture record changed before the six affected processes passed. Maxima across valid runs were 29.44 ms for adaptive and 30.27 ms for equipment. Local one-CPU-affinity replay is not an official reactive score or full Docker/cgroup reproduction. The equipment and primary bundles make identical actions on the two runtime streams; focused cases establish the extra mechanics, not a score gain.

Shopping local median wall time improved 23.4% from C, but remains about 1.66 times the pinned public Team 67 comparator. Its final 60M/15M output matches exactly. See the Shopping report for complete correctness gates, memory/CPU evidence and retained failures.

## Reproduction and preservation

The archive mirrors the session workspace. Some harnesses retain the original absolute root `/workspace/scratch/bde29dc281e6`; running only from `panel-20261122/` is insufficient for those files. Supply a compatible root mapping or adapt a separate working copy. Preserve the original sources and receipts byte-for-byte. The `handoff/` dependency can be a checkout of original handoff commit `99fa3729182ecdb09c49b643c8c00fe167f8c483`, with required kit/ref paths materialized. Rebuild excluded native binaries with the recorded pins. Rust is 1.97.0; Bun is 1.4.4.

New credential and competitor-source files are excluded. The owner token was used transiently only for this repository, and is absent from release files and persistent Git configuration. Preserve new-branch-only publishing, unchanged README files and owner-operated game submission.
