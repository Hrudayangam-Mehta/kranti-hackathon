# Published submission commits — current checkpoint

Repository: https://github.com/Hrudayangam-Mehta/kranti-hackathon

## Ready to submit

| Order | Track / tactic | Branch | Commit |
|---|---|---|---|
| 1 | Mech adaptive engagement, recovery, economy and range | `optimize/mech-adaptive-v1` | `398ba96e34ee1d7875b62afce78c3cf3b2745676` |
| 2 | Mech adaptive plus equipment and weapon physics | `optimize/mech-adaptive-weapons-v1` | `f3743067ae98c3a583a98fb5489ede10531451a6` |
| Separate track | Shopping reviewed Rust pipeline | `optimize/shopping-rust-v1` | `3d8fe30157e655ef6109c17205a8d8b530e1ccfb` |

All three are pushed and verified through fresh anonymous public clones. The Mech bundles and the Shopping rebuilt executable match their tested hashes. README files and existing branch heads were preserved. The owner submits through the official track page; no game submission or final-pick change was performed.

The new primary Mech commit is a child of selected capture `099e7e392a863346575d7ef45bb9af3432544329`. The equipment commit is a child of that primary. Each changes only the bundled `bot.js` in its minimal four-file submission tree. Source, test scripts and reviews are archived separately. Shopping changes seven Rust source files with build/dependency/README pins preserved.

## Official score reference and rejected earlier hypotheses

| Entry | Owner-reported score | Current interpretation |
|---|---:|---|
| Mech capture `099e7e392a863346575d7ef45bb9af3432544329` | 5.47 | Retain as selected reference until a new official score improves it |
| Mech geometry `b92af4e563ec1f86aac29b8e1116ba85453dfe5a` | 5.31 | Earlier control |
| Mech continuous pressure `69ed1814707634fb4b5e5953082f3d67ac9e52f8` | 4.74 | Lower result; earlier recommendation superseded |
| Mech burst `26f382eab378e1193ab9203bb4ec7e706c6780bf` | 4.67 | Lower result; earlier recommendation superseded |
| New Mech adaptive pair | Unscored | Local correctness/runtime gates passed; no performance claim |
| Shopping C `ad8526b3410bfb6b8b8febff35affe6bd5b42499` | 1.0598 s | Owner-reported selected baseline |
| New Shopping Rust | Unscored | Local improvement over C, still behind pinned public Team 67 comparator |

Mech target 7.5 is unmeasured. Fresh private seeds and absent paired match-level outcomes prevent isolating which component caused the pressure/burst loss. Identical code retains its first builders-4 score under the current announcement. Keep the raw failures and use distinct, meaningful code hypotheses.

## Current Mech behavior and evidence

The primary updates the existing `prof` owner, with no pressure wrapper. It uses observed ready damage, reversible early setup eligibility, a common exchange budget for nominal/fallback ranges, useful resource completion, current-state goal revalidation and quiet recovery. It fixes the distant-range refusal found in independent review. The equipment variant shares the same readiness helper for pickup/upgrade utility and adds nearest-recipient lightning and full-arc mortar checks. Dynamic mortar acquisition remains unchanged. Existing late/FFA dispatch stays in place, including its documented one-decision transition lag.

Three review rounds are complete. The primary implementation suite passed 28 cases. Independent backend tests passed 33 state/event/IO and 32 goal/readiness cases per candidate, with 375 schema-valid observations each. The cross-mode suite passed 16 cases including 900 recorded-action identities. Equipment tests passed 18 mortar, 20 lightning and 19 loadout cases.

The runtime evidence has 20 process attempts: 14 valid-stream passes and six retained fixture-termination failures. The input-only correction appended the missing end record; all 300 observations and all source/bundle hashes were preserved. All 4,200 requested decisions in the 14 complete-input runs were timely and valid. Maximum measured action latency was 29.44 ms for primary and 30.27 ms for equipment, below the 50 ms budget on this one-CPU-affinity host. Full Docker/cgroup sandbox behavior was not reproduced.

The primary and equipment variants produced identical actions on the two runtime streams. Equipment-specific behavior is supported by crafted cases, not a demonstrated match advantage. Nonreactive, stitched counterfactual observations cannot establish score, survival or optimal play.

Read [the complete release report](mech/ADAPTIVE_RELEASE.md), [independent final review](mech/ADAPTIVE_FINAL_REVIEW.md), [function-level policy review](mech/ADAPTIVE_POLICY_REVIEW.md), [independent function audit](mech/adaptive-round2-review.md), [backend review](mech/adaptive-round2-backend-review.md) and [superseding runtime receipt](mech/adaptive-final-validation/release-validation-status.json).

## Ahmad and the remaining comparison boundary

The attributable public project is `ahmad-ovh/Buildathon`. Inspected head `f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675` uses Go. Exact binding of the public 6.74 score to a source revision remains unresolved. The panel extracted contracts for reversible combat, resource detours and range consistency, then challenged current-head dead flags, discarded range choices and simplified aim logic. No competitor code, constants or fitted tables were included. See [the source-specific report](mech/adaptive-round1-competitors.md).

## Shopping comparison

The final five-run 20M batch measured median wall time 1.881402 s for our Rust build, 2.455066 s for C and 1.134012 s for the pinned public Team 67 comparator. Our build improved 23.4% over C, but remained approximately 1.66 times the comparator's wall time. These are local measurements, not official hidden-data scores. Full 60M/15M outputs matched exactly; 35 unit tests, 320 adversarial checks, 36 official fixtures and six independent complete 1M comparisons passed. Earlier signal-9 and disk-full failures remain documented; the final full-size success is one run, not a median. See [SHOPPING_RELEASE.md](SHOPPING_RELEASE.md).

## Language, research and historical material

Shopping uses Rust 1.97.0. Mech retains pinned Bun 1.4.4 and JavaScript modules. No full Rust port or rewrite of every existing function is claimed. [RESEARCH_NOTES.md](RESEARCH_NOTES.md) maps relevant author/publisher books, primary papers, official language/format docs and open-source projects to reviewed decisions; cited research gains are not transferred to these builds.

Older pressure/burst reports remain historical evidence, including the prior two late burst responses and diagnostic correction. Their source and branches remain available as controls. The isolated mortar correction remains absent from those earlier pressure/burst hashes but is included in the new equipment variant. The unpublished round-2 adaptive snapshots preserve the subsequently repaired range defect and are not submission recommendations.

The archive mirrors workspace-relative paths. Some harnesses contain the original absolute root `/workspace/scratch/bde29dc281e6`; reproduce under that path or map a working copy to a new root without changing the preserved evidence files. The original `handoff` kit/ref dependency and pinned runtimes must be supplied separately. Compiler caches, native executables, large generated datasets, credentials, competitor source and README additions are excluded.
