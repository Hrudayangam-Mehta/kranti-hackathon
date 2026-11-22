# Fable line QA (independent; 00:22-00:55 UTC Sun Nov 22)

S = scratchpad, F = S/fable_work, Q = F/qa (all QA scripts, logs and recordings; nothing else was written, no git, no push,
no game server). The release gate and the fresh-clone hash were not run (pusher's steps).

## Verdict per build, in the plan's submission order
| # | build | bundle checks | ready to submit under the plan | reason |
|---|---|---|---|---|
| F1 | FOHLC_s1 | PASS | **PASS** | whole-key change; against the new best (FSL10 s1, 5.35) it is still exactly `loseCover 'oneHit'` |
| F2 | FNR_s1 | PASS | **PASS** | same: exactly `loseCover 'never'` against the 5.35 SELECT |
| F3 | FHE40_s1 | PASS | **FAIL** | built on the 5.31 base (low15); against 5.35 it changes two things (healEnterHp and lcLowHpf 0.10 -> 0.15). Also not inert in an FFA match before the latch (below) |
| F4 | FA60_s1 | PASS | **FAIL** | built on low15: against 5.35 it also carries lcLowHpf 0.10 -> 0.15. Rebuild on low10 |
| F5 | FC075_s1 | PASS | **FAIL** | c075 = low15 + cover 0.75: against 5.35 it changes lcCoverS and lcLowHpf together. Needs a low10 + 0.75 value |
| F6 | FB_s11 | PASS | **FAIL** | "best SELECT at that moment" is now low10; this bundle is low15 on salt 11 |

The base moved after the build: `submissions.md` (results 23:57-00:34) has FSL10 s1 (lcLowHpf 0.10) = 5.35, new best.
The plan's own rule ("B = that build instead", keep rule 2) makes F3-F6 stale. The tree F/bot has no `low10` value;
it is `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` in variants6/FSL10_s1. Other new results: FSOH (lose1/2/3Hpf)
5.29, low15 + cover 1.0 5.33, fin3t 5.33, fin30 5.31, ls35 5.25. Plan rule 4 drops neither F2 nor F5.

## What was checked (every bundle under F/builds/*/dist, FB_s1 included)
| check | result |
|---|---|
| Rebuild from F/builds/<name>/bot (`bun build --minify --target=bun`) into Q/rebuild, sha256 against dist | 7/7 identical; hashes equal the engineer's table (F1 37c0d0ee..., F2 41cf3b03..., F3 efa2fd70..., F4 630041ba..., F5 48853713..., F6 5a87f82b..., ref 7fb5fb2d...) |
| Variant source against F/bot; F/bot against r7work/ckpt_07_LG | each differs in lib/params.js only (SELECT line + salt); F/bot differs from ckpt_07_LG in three PRESETS lines only; Dockerfile identical |
| Resolved params (variant's own params.js, 517 keys) against variants6/FSLCL15_s1, whose dist/bot.js is the committed 8cdafe2 bot.js (sha 8111ebf9...) | F1 lcCoverS 1.5 -> 0, lcLowHpf 0.15 -> 0.23; F2 lcCoverS -> 0, lcLowHpf -> 0; F3 healEnterHp 0.55 -> 0.4; F4 aggrHpf 0.7 -> 0.6, h50SeekHpf 0.7 -> 0.6; F5 lcCoverS -> 0.75; F6 salt 1 -> 11; FB_s1 none. All equal the plan as written for B = 5.31 |
| Conformance base and v3dir (run_check.sh, 1-CPU group, core 2) | 14/14 PASS; world / nav / brain true, 300/300 in time, errors 0, slow 0, max 4.6-14.2 ms |
| Default-SELECT identity, F/bot against ckpt_07_LG, r7work rec7, DEF / KS / KB | 81/81 byte-identical (kit stream 9/9: squad, auto, forced FFA), fuse 0, errors 0 |
| Tree suites on F/bot | test_world 39/39, test_brain 109/109, test_counters 15/15, test_requests 12/12, anchors7 21/21, rb7 6/6, io7 9/9, aggr7 14/14, lx7 7/7, fin7 6/6, iso7 5/5, lg7 10/10 |
| T-F2 on F/bot | 24/24; the new values (low15, oneHit, never, c075, healDoc low x2, any60f) act in SQUAD and equal the old value in forced FFA |
| T-F2 on each build's baked SELECT against the 8cdafe2 source (Q/tf2_builds.mjs, my own) | every build acts in SQUAD on its own trigger (F1, F2, F5 LC table; F3 heal at 50% hp; F4 at 65% hp); forced FFA identical to the base for all 7 |
| Kit stream and FFA streams ffa_s1-4, each build against the 8cdafe2 source | F1-F5 and FB_s1: kit squad / auto / forced FFA and f1-f4 auto / forced FFA all identical. F6 differs (salt), as expected |
| Sim squad 1-24 against the base | F1 8 seeds (1,2,5,6,18,19,20,22) +3; F2 5 seeds, 0; F3 3 seeds (9,14,23) -5; F4 0; F5 2 seeds (1,5), 0; F6 24 seeds, 7 up / 10 down, -6; FB_s1 0. Equal to the engineer's table. fuse 0, errors 0, stuck 0 |
| Forbidden words (release-gate regex, case-insensitive) in dist | nothing; no comment lines except `// @bun`; no team, model or score strings. Team-name list (H3) is in the release gate, not run |

## Findings the plan does not state
1. **Pre-latch play in an FFA match is not covered by T-F2.** T-F2 forces env FFA. In simulator FFA matches with env
   auto (seeds 411-422, deterministic on rerun, fuse 0) these builds diverge from the 8cdafe2 source before the latch:
   F1 1 of 12 (seed 422, tick 480; kills 5 -> 1), F3 2 of 12 (412 tick 330, 419 tick 530), F4 2 of 12 (418 tick 400,
   419 tick 414), F2 and F5 0 of 12. F1 and F4 use gates the entered build already has (LC behind firewall(), a7 before
   the first foreign death). F3's healEnterHp has no firewall: it acts whenever env is not yet FFA. The plan's line "all
   six are final-safe in the same sense as the 5.31 entry" does not hold for F3.
2. **F1 retreats more than the base in one band.** With far cover, at 15-23% hp (now 10-23% against low10) oneHit
   leaves where the base fights on (decision table: cover 30 m at 21% hp, base FIGHT, F1 DISENGAGE). The official
   lcLowHpf trend is 0.25 -> 5.29, 0.15 -> 5.31, 0.10 -> 5.35. F1 mixes a step with that trend (cover distance) and one
   against it; F2 goes with it on both.
3. `anchors7.mjs` needs the bot folder as argument (the first line in F/out/suites.log is
   exit 1 without it; 21/21 with it).
4. Recordings on this machine tripped the 30 ms fuse several times under load (load average 8-12); every one was
   re-recorded to fuse 0 before comparing.

## To make F3-F6 submittable
Add `low10` (verbatim from variants6/FSL10_s1) and a low10 + cover 0.75 value to F/bot PRESETS, rebuild F3, F4, F6 with
`loseCover 'low10'` and F5 with the new value, then repeat the rebuild-hash, resolved-params, conformance and kit-stream
checks (about 10 minutes with Q/rec.sh, Q/cmp.py, Q/pd.mjs, Q/tf2_builds.mjs).
