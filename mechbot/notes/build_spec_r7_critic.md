# Build spec R7: round-3 critic (written Sat 21 Nov 22:10-22:30 UTC)

Read: brief, moderator digest, build_spec_r7.md in full, submissions.md to its last line, build_r7a_log.md to
checkpoint 04, the round-2 aieng / final / redteam / designer memos at the lines the spec cites, and the code in
`scratchpad/r7work` (ckpt_02_IO, ckpt_03_AGGR, the working tree `bot`) and `scratchpad/variants6` (the pushed trees).
One inline arithmetic run (48-match climb model, standard library, `taskset -c 2`, no file kept). No sub-agent, no
web search, no simulator run, no git, no game server.
Tags: [M] official, [S] simulator, [A] arithmetic / model, [C] code read, [N] no evidence.

## 0. The spec is one official result behind: its base assumption failed

submissions.md (after the spec's 22:04 read) records: **R7P s1 = 5.13 (BB-FAB4EFBF), not 5.23** [M].
The spec's section 0 row 1, its ruling 2(f), its best pair "(KS, salt 1) = 5.23", row D1 of 3.1 and the whole W1 row
of 3.3 assume 5.23. What is true now:

- The 5.23 belongs to KB s1 (old code, `aggr: 'any70'`, no firewall). "KS s1 = 5.23" was never measured.
- Three explanations are open, and one slot separates them. KS s1 on the old code (5898265c, pushed) reads:
  - 5.13: the R7 code is identical in practice, the server is deterministic, and any70 was worth +5 kills at salt 1;
  - 5.23: any70 did nothing at salt 1 and the R7 code plays differently on the official server;
  - anything else: determinism itself is in doubt (KB s0 = KS s0 has about a 3% chance of being a coincidence [A]).
- The moderator's order for 22:25 (KS s1 5898265c, then KBH s1 6b038a94) is right. The spec's 3.6 order (R7P s0
  first) is weaker: R7P s0 has two outcomes, KS s1 has three, and the spec's section 0 forbids the very hash needed.

## 1. Required amendments

1. Replace section 0 with: KS s1 5898265c, then KBH s1 6b038a94, then fresh salts on the R7 tree (R7 s3, s4, s5,
   s6 once gated, else KS s3-s6), because R7P s1 is already scored (5.13) and KS s1 is now the bisect slot.
2. Change 3.6 so that a miss of R7P s1 is followed by KS s1 on the old code, not R7P s0, because it separates
   "any70 acted" from "the R7 code differs" from "not deterministic" in one slot with a hash that is already pushed.
3. Add a stop rule: no climb slot (3.2 type "climb", picker lines 2-3, keep-if-higher) until one official exact
   repeat exists on the R7 tree, because the climb rests entirely on determinism and the first port missed by 0.10.
4. Add the third branch to 3.6: if KS s1 is neither 5.13 nor 5.23, resubmit the identical KB s1 hash d4518215 once,
   and if it does not read 5.23 drop the climb and use fresh salts plus two-draw means, because that is the only
   direct test of determinism and it costs one slot with no downside under best-of.
5. Define BP as the highest official score on a commit of the current R7 tree (not "our highest score"), because
   arms exist only on the R7 tree and a score counts for the final only on the commit that earned it.
6. If KS s1 reads 5.13, build KB with `foreignDeaths === 0` on the any70 clause on the R7 tree at salt 1 (expected
   exactly 5.23) before any arm, and delete "any70: no more slots" from 2(b), because any70 then acts officially
   (+5 kills at salt 1) and the only 5.23 we own carries it without a firewall.
7. If KS s1 reads 5.23, the next slot is R7m s1 (checkpoint 03, `ioMerge: 'off'`, packaged 22:10), then
   `pocketCfg: 'off'`, because IO8 acting would mean the official server skips our late answers, which is itself a
   source of non-repeatable matches.
8. Strike "final-safe" from R7P s1 and the instruction to pick it as the final entry: it scored 5.13, it is built
   on checkpoint 02 (RB3 without the clamp, no `ioMerge` switch [C]) and it carries no final bundle.
9. Do not change the owner's final-entry pick while every entry is below the cut, because neither commit qualifies
   and an explicit pick may stop the page from following a later best [N].
10. Make every fresh-salt and filler draw from now on an R7-tree commit at checkpoint 03 or later, because an
    old-code best can only be nominated through a port and ports are now shown to be unreliable.
11. Delete the phi classes of 2(b) and draw every arm first on BP's salt, because the engineer reports changed
    lines on 14 sources, not phi on seeds 1-40, and by those numbers the rule contradicts the table (LC 10 of 14
    would be "fresh salt", healDoc 0 of 28 would get "no slot"), while a full re-roll on BP's salt is the same
    draw as a fresh salt [A].
12. State that HD (healDoc) is exempt from "never an arm with phi = 0" and that its expected reading is an exact
    tie, because it changed 0 decisions on 28 local sources yet holds slot 2 as the owner's doctrine.
13. Add `B.foreignDeaths < 1` to LX before its first draw, because checkpoint 04 shows LX acting on 2 of 14
    FFA-inert streams (before the latch, after a foreign death), so a kept LX would fail 3.5 (iii) and need a port.
14. Give T-F2 one synthetic acting case per preset (the preset's trigger state with `env` FFA, as test_aggr7 does),
    because byte-identity on 14 streams passes trivially for any preset that never acts on those streams.
15. Delete CM (row 11), because under the spec's own 2(a) a set of arms that each failed to beat the base on
    disjoint matches sums to a score at or below the base, so the slot buys only an unmeasured interaction.
16. Fill the gap in 3.4: a fresh-salt arm whose first draw is 4.85 to 5.04 is parked (no second draw, not dropped),
    because the rule names only >= 5.05 and < 4.85.
17. Say whether healDoc is in the fresh-salt SELECT after a tie, because 3.4 says both "HD stays on" and "the
    fresh-salt SELECT is KS plus arms kept on two salts".
18. Put the final bundle (FB1, FB2) behind one official same-salt identity slot in the window after it enters the
    tree, not only at R7F after 09:00, because every arm drawn overnight on a tree with FB would otherwise be
    compared against a base scored without it.
19. Add "T-F2 harness" and "any70 firewall term" to the engineer's order in 3.2, because 3.5 depends on both and
    neither is in the list.
20. Lift the variant cap from W2 on (up to 3 per window, any built preset's value, not only kept or tied arms)
    once item 3 is satisfied, because parameter values are the only climb steps that need no code and the queue of
    distinct acting arms is what limits the climb [A].
21. Record the board's 32nd at the top of every window, because the cut figure in section 1 is from 21:26 and every
    nomination rule in 3.5 is written against it.

## 2. Optional amendments

- O1. Tell the owner in one line that the literal reading "below 70% leave the fight and heal" is not drawn and
  why (other teams' leave-early tests lost 0.60 and 1.10 [M]); if the owner wants it measured, it is one
  params-only slot (`lose1Hpf` / `lose2Hpf` / `lose3Hpf` at 0.70 [C params.js:70]) and keep-if-higher makes a loss
  cost exactly that slot.
- O2. Skip the R7F slot when BP's own commit was built from the frozen tree (it would be the same commit again).
- O3. Cut ISO: its only support is a simulator rate (73 against 42 hp/s) and the memo that ranked it first read
  it backwards; expected +0.03.
- O4. Cut FINb and the LG look-around contingency at 03:00; both are new code after midnight for arms with no
  official reading.
- O5. Correct the LX note "3 of 24": that is seeds that scored better in the eng memo, not a divergence share; the
  engineer's measure is 5 of 14 sources.
- O6. HF (`healExit` 1.0) is free-for-all-inert only after FB2 sets `ffaHealExit` 1.0 (`tactics.js:390` takes the
  maximum [C]); draw HF only on a tree that has FB2.
- O7. KS s2 692325a0 stays unsubmitted; it tells us about any70 at salt 2 but cannot raise the best.

## 3. Audit of the numbers

| Spec figure | Source | Check |
|---|---|---|
| 5.23 = 251/48; 260/48 = 5.42; 269/48 = 5.60; 279/48 = 5.81 | arithmetic | correct |
| "KS-select salts 0/1/2: 5.19 / 5.23 / 4.98" | submissions.md | wrong label: salts 1 and 2 are KB draws; KS s1 and KS s2 were never submitted |
| family mean 5.05, sd 0.17-0.20 | V4 x3, K0, S x2, KS, KB s1, KB s2 | recomputed 5.04 and 0.17: correct |
| 19 draws, no item above +-0.06 | stats memo (14 draws) plus 5 | count correct; R7P s1 makes 20 |
| P(fresh salt beats 5.23) 0.18 | spec arithmetic | I get 0.13-0.17: close |
| 66 slots to 09:25, 101 to 15:15 | arithmetic | correct, less the slots used since 22:04 |
| cut 5.4 now, 5.6-5.8 at close | brief 21:26; stats memo | stale by an hour; the brief itself says 5.8-5.9 at close, not reconciled |
| fresh salts 5.43 / 0.05; climb 0.67-0.78 at 30 slots | aieng table, m = 12 and m = 6 | quoted correctly; the model assumes determinism and 30 distinct acting arms |
| P(best > 5.5 / 5.6 / 5.8) = 0.55 / 0.40 / 0.10 | chair's judgment | see below |
| final format 32 / 16 matches / s.e. 1.1 / 64 | final memo citing rules_audit L9 | correct (4.6 / 4 = 1.15) |
| 0.36 and 2.02 deaths per minute; 24 of 24 squad matches | final memo | quoted correctly |
| latch disabled +1.33 +- 0.40; 51 of 60 identical | redteam memo | quoted correctly |
| LC -0.41, A05 -0.41, G01 +0.39, A32 +0.34 | redteam, designer | quoted correctly; all other teams, one draw each |
| io 'all' moves 75% of aimed decisions | engineer log: 25778 of 34041 | correct (0.76) |
| lose lines 0.35 / 0.50 / 0.60; heal 0.55 / 0.70; ffaProx [45, 60, 75]; ffaHealExit 0.9 | params.js | correct [C] |
| D5 "out of contact only" | tactics.js:397-398 | entry needs 1.5 s of quiet; the 0.80 exit also lengthens heal breaks after a losing retreat |
| "R7 tree (checkpoint 03 or later)" for all arms | variants6/R7P_s1 | R7P s1 is checkpoint 02 |
| R7P s1 "must read exactly 5.23" | submissions.md | it read 5.13 |

Probability line. My null-effect run of the plan (48 matches, per-match sd 1.32, start 251 kills, 100 slots, two
fresh salts per window): salts only 0.58 / 0.23 / 0.00; twelve arms of mixed reach plus twelve variants
0.91 / 0.68 / 0.09; arms that act in 0-3 matches 0.81 / 0.50 / 0.03 [A]. So the spec's 0.55 / 0.40 / 0.10 is not
optimistic if determinism holds and a touched match is a full re-roll. Neither is established tonight. Without the
climb the honest line is the salts-only one.

## 4. Audit of the arms and slots

| Arm | Spec class | Evidence on divergence | Exists? |
|---|---|---|---|
| R7P s1 | identity | scored 5.13: failed | pushed, scored |
| HD (KBH s1) | climb | 0 of 28 local sources changed | pushed; old code plus any70, so a kept result needs a port |
| LX | climb | 348 of 33722 lines, 5 of 14 sources; acts on 2 of 14 FFA streams | checkpoint 04, tested, not pushed |
| LC | climb, solo | 679 lines, 10 of 14 sources; FFA 14 of 14 identical | checkpoint 04, tested, not pushed |
| FINa, ISO, CR | climb | none reported yet | presets in the working tree at 22:11 (`finish`, `isolate`, `seekCrowd`); tests ran, no checkpoint entry |
| IOA | fresh salt | 76% of aimed lines; not FFA-inert | preset in checkpoint 02; no salt-8 commit pushed |
| LG, HF, FINb | fresh / climb | none | not built |
| FB1, FB2, ZG1, T-F2, any70 firewall | final | none | not built |
| R7 s2-s6, R7m s1 | fillers / bisect | KS SELECT on checkpoint 03 | packaged 22:10-22:14; gates running |

W1 as written cannot run: slot 1 is spent and failed, slots 3-4 are climb arms on a base that does not exist, and
the fallback fillers are old-code commits. W2 onward is sound once a base is re-established. The engineer is ahead
of the spec's readiness times (LX and LC done by 22:10), so no window after W1 lacks builds.

## 5. Audit of adopt / drop and the final policy

- Keep-if-higher on the same salt is consistent with best-of and tie-to-earlier, if and only if the server repeats.
- Stack and "retried only on a new salt" follow from determinism. CM does not (item 15).
- The second-draw rule for fresh-salt arms (>= 5.05, then mean >= 5.10) adopts a no-effect arm about one time in
  four [A]; harmless under best-of, so it stays.
- Does the nominee's own score clear the cut: no. Nothing we own does (best 5.23, cut about 5.4).
- Is it free of unfirewalled any70: the entered best is not. The any70-free scores are 5.19 (KS s0, old code) and
  5.13 (R7P s1, checkpoint 02). No commit meets all of 3.5 (i)-(iii) today.
- Is the final-only bundle practice-inert and tested: it is not built and is in no pushed commit. Its only
  evidence is 24 of 24 simulator squad matches [S]. T-F2 is not written. healDoc is free-for-all-inert by code
  (`tactics.js:390, 398`: the posture already enters at 0.7 and exits at the larger of the two exits) [C].
- 3.5's port rule (a port ties but is later) is right; "pick R7P s1 now" is not (items 8, 9).

## 6. Owner's doctrine

- Met without code: D1, D2, D4. D5 is one preset. That part is as light as the owner asked.
- Over-strategised: the phi classes with a 40-seed report per arm, CM, the fresh-salt SELECT bookkeeping, six
  picker lines with three caps. Items 11, 15 and 20 remove most of it: one rule (draw on BP's salt, keep if
  higher), fresh salts in the remaining slots.
- Over-coded: FINb, the LG look-around contingency, ISO. Thirteen arms and a final bundle before a single official
  repeat on the new tree is the wrong order: prove the base first.
- Under-served: the literal "otherwise heal" is interpreted away without a slot or a line to the owner (O1).

## 7. Verdict

1. Do not issue the spec as written: R7P s1 scored 5.13, so its first slot, its base and ruling 2(f) are void.
2. The 22:25 order is KS s1 5898265c, then KBH s1 6b038a94, then R7-tree fresh salts (old-code KS s3-s6 if those
   are not gated).
3. KS s1 decides the night: 5.13 means the R7 code is sound and any70 matters; 5.23 means the R7 code differs;
   anything else puts determinism in doubt.
4. No climb arm is drawn until one exact official repeat exists on the R7 tree.
5. The climb idea itself survives the arithmetic and is the best route to 5.6 if the server repeats.
6. All sourced numbers check except the "KS salts" label, the stale cut and the checkpoint of R7P s1.
7. Arm classes: drop the phi rule; it contradicts the engineer's measured numbers for LC and healDoc.
8. Final policy: no commit is eligible today; LX needs a firewall term, T-F2 needs an acting case, the bundle
   needs an early identity slot; leave the entered pick alone while below the cut.
9. Doctrine: the rules are light, the slot machinery is not; cut CM, the phi report, FINb and ISO.
10. With amendments 1-10 the spec is usable tonight; 11-21 can follow at the 23:25 window.

Note: I created one empty scratch folder, `scratchpad/critic_r7`, before running the model inline; it holds nothing.
