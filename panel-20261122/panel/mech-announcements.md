# Mech Royale evaluation update — 22 November 2026

Checked public official pages at approximately **07:00 UTC on 22 November 2026**. This is a bounded rules/announcement check, separate from Shopping Sessions. No Mech source was changed, no game server was contacted, and no submission or final-pick action was taken.

## Decision

The handoff's fixed-match optimization model is obsolete. The official announcement posted **Sunday 1:00 AM** identifies **builders-4**, doubles practice evaluation from 48 to 96 matches, replaces the shared fixed match set with fresh private seeds for each submission, and preserves the first builders-4 result for identical code. It also announces automatic rescoring of each team's picked or best builders-3 entry, prioritizing contenders. [Announcement](https://www.joinbuilders.org/buildathon/leaderboard). genui{"citation":{"ref":"turn430112367view0"}}

Two short exact excerpts from that announcement:

> Every Mech Royale practice run now plays 96 fresh private random seeds

> identical code keeps its first builders-4 score

The implementation or fingerprint used to recognize identical code is not documented in these public pages. A changed Git commit is therefore not evidence of an independently resampled evaluation.

## Current evaluation facts

| Item | Current official statement, paraphrased | Source |
|---|---|---|
| Scorer | `builders-4`; starter baseline 1.10 | Track |
| Practice opponents | Fifteen house bots form a coordinated squad: 4 easy, 4 medium, 4 hard, 3 expert | Track |
| Metric | Mean placement points, `16 - place`; same-tick deaths tie | Track |
| Runtime | 50 ms per answer, one CPU, 512 MB; missed answers can change results | Track |
| Qualification/final | Top 32 enter 16 qualifying matches; top 16 then play a 64-match series on new seeds. Final-series mean determines finalist rankings | Track |
| Selection/cutoff | Explicit pick, otherwise best; closes Sunday 11 AM EST / 16:00 UTC | Track |
| Source availability | Public when submitted; after scoring it may become private because the organizer retains a copy | Track |
| Quota discrepancy | Track prose says 4/hour; live status says 6/hour at 1:50:09 AM ET | Track / Status |

Track facts: [current Mech Royale page](https://www.joinbuilders.org/buildathon/tracks/builders). genui{"citation":{"ref":"turn172509834view1"}} Operational quota: [status page](https://www.joinbuilders.org/buildathon/status). The earlier quota announcement directs entrants to live status and says quotas can change, so the status reading is the more useful operational observation. genui{"citation":{"refs":["turn430112367view1","turn430112367view0"]}}

## What remains true about `hello.seed`

The current protocol still describes `hello.seed` as a bot RNG seed fixed by slot. It explicitly distinguishes it from the private match seed. A stable bot RNG seed does not mean the environment is replaying the same matches. [Protocol, hello section](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1). genui{"citation":{"ref":"turn290358211view0"}}

Exact protocol excerpt:

> It is fixed per slot and says nothing about the match (it is not the match seed).

The same downloaded protocol's submission introduction still mentions 48 practice matches. That conflicts with both the new announcement and the live track page. Treat that count as stale documentation, not as evidence against the announced evaluator. The protocol's scoring section also distinguishes placement from kills, and says that surviving until timeout invokes HP ranking. genui{"citation":{"ref":"turn290358211view2"}}

No gameplay balance change was identified in the announcement. This establishes an evaluation change; it does not establish that weapons, physics, or the bot protocol changed.

## Comparison with the local handoff

Reviewed `/workspace/scratch/bde29dc281e6/handoff/HANDOFF.md`, handoff commit `2aab05cff419350093d4787141cc83a7f9ef2f58`. Its title dates the working snapshot to roughly 06:15 UTC. The following is analysis of that local file, not a new official claim.

| Handoff assumption or instruction | Assessment after the announcement | Consequence |
|---|---|---|
| 48 fixed practice matches; same build and salt reproduce the exact score | Superseded by current evaluator | Keep those measurements as builders-3 history only |
| `hello.seed` is fixed per slot | Still documented, but it is the bot RNG seed | Preserve deterministic local action-stream tests without confusing them with common match environments |
| One slot flip exactly measures that slot's contribution | No longer justified across separate submissions with fresh match sets | A score difference now combines behavior differences with different sampled environments |
| `d_s = round(48 * score) - base_total`, then combine positive deltas | Invalid for the new evaluator | Retire the old delta ledger as a predictor; do not replace 48 with 96 and claim the method is restored |
| Best old table `1211211111121111` at `aaa401226683…` scored 5.63 | Historical, prior-version observation | Do not compare 5.63 directly with a builders-4 score to infer code regression |
| Whole-build ideas should be converted into per-slot flips | An experimental preference built around the former fixed sample | Prefer substantial behavior changes with a clear mechanism and robust local checks; do not interpret tiny slot changes as exact gains |
| Re-submit a combined table before the cutoff | Identical-code repeat cannot provide a fresh official luck sample under the announced rule | Confirm the existing score/version and final selection rather than expecting a rerun to improve the score |
| Simulator retired for ranking; use for crash/timing checks | Preserve | A new evaluator does not validate the earlier simulator's ranking predictions |
| Mech quota 6/hour | Matches current live status | Do not silently replace it with the track page's inconsistent 4/hour prose |
| Repository may become private after scoring | Already correct in this handoff | Confirmed by current track page; not a new change relative to this local handoff |

An expected score can still be decomposed by slot in a mathematical model. What is lost is the experimental pairing: two official submissions no longer hold the match environments fixed. The old observed single-slot difference is not an isolated causal measurement of that slot's policy.

## Owner-reported results and implications

These values come from the owner's new message relayed by the parent agent; they were **not independently authenticated through a signed-in team page**:

| Build | Commit prefix | Reported current result | Interpretation |
|---|---|---:|---|
| P26 all | `3417f9965d2b` | 5.45 | Best of these three reported current results |
| Meta half | `1cd369a68a39` | 5.10 | Below P26 on the reported current results |
| Previous best table | `aaa401226683` | 5.05 | Current result supersedes the 5.63 prior-version number for present comparisons |
| Previous-best repeat | `aaa401226683` | `BB-04685359`, queued | No outcome checked here; identical-code caching means it should not be treated as an independent new sample |

P26's reported lead is 0.35 over meta-half and 0.40 over the old table under the current results. Those are differences between aggregate displayed scores, not confidence intervals or proof of underlying superiority. Per-match outcomes and a defensible evaluation design would be needed to quantify statistical uncertainty. In particular, a rounded average should not be called an exact kill count.

If all else were equal and match outcomes were independent and identically distributed, doubling sample count would scale a sample mean's standard error by `1/sqrt(2)`. Here the sampling method also changed, so that conditional arithmetic is not a measured uncertainty estimate for these bots.

The practice opponent model also differs from qualifier/final free-for-all play. A practice improvement against a coordinated squad is not by itself a demonstrated final-series improvement. Existing forced-free-for-all identity checks remain useful for detecting accidental changes in that execution path, while local simulator ranking remains untrusted under the owner's standing instruction.

## Source quality and retrieval notes

- Directly opened the official event page, track page, announcement/leaderboard, status page, and protocol. The event's [general rules](https://www.joinbuilders.org/buildathon#rules) identify the track page as the source for each final's scoring and retain the excessive-code-reuse restriction. genui{"citation":{"ref":"turn172509834view0"}}
- The search result for the track still returned `builders-3` and 48 fixed matches; the directly opened track returned `builders-4` and the new rules. The search snippet is stale and should not override the page.
- Live board counts and queue positions differed across retrieved snapshots, so this memo does not claim a current qualification rank or final cutoff score.
- Current source references for parent citation: announcement `turn430112367view0`; track `turn172509834view1`; status `turn430112367view1`; protocol seed section `turn290358211view0`; protocol stale-count/timing section `turn290358211view2`; general rules `turn172509834view0`. Parent should open these pages itself before using the references in its final response.
- No authenticated submission page was accessed, and no queued-result status was changed or verified.
