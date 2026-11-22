# FABLE_PLAN2 — binding plan for the Fable line after round 2 (moderator, Sun 22 Nov about 01:25 UTC)

Inputs: FABLE_BRIEF (incl. 00:45), moderator_r1b, all five round-2 memos (hackathon, cyber, math, game, psych: none
missing), submissions.md tail, code read at r7work/ckpt_07_LG/lib (tactics.js 388-396, 458-476; hunt.js 29-32, 303-305;
params.js 71, 181, 186, 259, 271). One moderator; nothing built, run, pushed or submitted by me. Tags: [M] official,
[S] simulator (counts only, ranks nothing), [C] read in code, [A] analysis. Every build is a proposal that needs the gates.
Base B = FSL10 s1 = 5.35 = 257 kills, salt 1; one kill = 0.021. N = FNV score in kills, H = FHE40, C = Opus G10C10,
L = Opus G05. Slots 1 (FNV) and 2 (FHE40) are with the project moderator (pushed 00:54, no result yet).

## 1. Conflicts settled in round 2
| # | question | ruling | evidence |
|---|---|---|---|
| 1 | slot 6 code: lcLate, lowKill, hostMem | none gets a slot | lcLate: 0 changed decisions of 25,649 in 36 matches [S game]; radius <= 70 not before 265 s, longest life 103 s. hostMem: 2 of 36, under math's bar of 3. lowKill: about 34 of 36 touched, a full re-roll; code steps average -4.6 kills [M] |
| 2 | heal follow-up: lowx (cyber, math, psych) or healEnterHp 0.30 (game) | 0.30 alone | hfExit has no trigger: 0 of 24 at 0.6 [S hackathon]; LOWX = HE40 in 12 FFA matches [S cyber]; [C] we open on and seek nobody under 70%. The ladder that paid walked one key |
| 3 | x60 and "FHE40 loses -> any60f" | both deleted | 0 of 24 trigger; four memos: a heal loss argues against any60f. any60f is the owner's call only |
| 4 | slot-3 rule | needs the size of FNV's loss and the Opus half step on the same axis | 'never' is locally the union of c0l10 and low0 (same hashes [S]); a single after a loss of 3 or more is worth 0.4-0.8 kills (math) |
| 5 | c05l05 if both Opus singles win | replaced by the measured corner c10l05 | two unmeasured values in one slot (math, psych) |
| 6 | stack = base + sum of gains | only across keys, and only after math's test on the Opus merges | with FNV kept, C and L are inside it; a merge is a new draw on the union |
| 7 | stop-loss | tally of all LC tickets of both lines from 257: closed at -4 or worse; after FNV plus one single the family is exhausted whatever the sign | math 4.6, psych 4.2 |
| 8 | K1 heal keys in the final | practice slot yes; the project moderator has accepted FHE40 if it wins (submissions.md); Fable still asks for a firewalled copy | [C] line 472 has no firewall; [S] 12 FFA: kills 26 -> 29 but life 1422 -> 1216 s, place sum 68 -> 69 |
| 9 | seekFrom 10, seekCrowd | no slot | 11 of 12 seeds differ = fresh salt in disguise; seekCrowd batch discarded |
Not settled (no data): the official sign of FHE40; the class-C dead band under 'never' (under 25% hp, 2 attackers, cell
within 3 s: no retreat and no last-stand rule, `tCover > 3` at line 476 is a literal). Reading rule: N <= 257 with C and
L both >= 257 means 'never' overshoots in class C / the after-retreat HEAL; stop at the single axes, do not chase it.

## 2. Slots 3-6 and two reserves (all on B's SELECT, salt 1, loseCoverNear true; one change per slot)
| slot | tag | exact SELECT change | build when | after the result |
|---|---|---|---|---|
| 3 | FC0 / FL0 | N > 257: no build (FNV is the base, LC exhausted). N 255-257: loseCover `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }` if C >= 257; else `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }` if L >= 257; else none. N <= 254: c0l10 only if C > 257, low0 only if L > 257 (both: the axis with the larger Opus gain; equal: c0l10); else none. Skip if N <= 254 and the only Opus win is +1 | N, C, L all reported | > best: new base. Tie or lower: off, no rerun. Then LC is closed for Fable except reserve A |
| 4 | FHE30 | healDoc `low30: { healEnterHp: 0.30 }` + loseCover of the build H was measured on (`low10`) | only if H > 257 | > H: keep, stop the ladder at 0.30 (one more step only if the gain is 2 kills or more: 0.20). <= H: heal stays at 0.40 |
| 5 | FSTK | loseCover of the best LC build (`never`, `c0l10` or `low0`) + healDoc `low` (or `low30` if slot 4 won). No finishThreats, no same-key parts | an LC build > 257 AND H > 257, AND at least one exact hit among Opus merges C = 258, G10FT3 = 258, G10C10FT3 = 259 (no hit: no stack) | > every part: new best. Else off; the parts stay as they are |
| 6 | FHFW (the one code change) | tactics.js 472, in the non-HEAL branch only: `me.hpf < P.healEnterHp` -> `me.hpf < (P.healEnterFw > 0 && B.hunt && B.hunt.firewall() ? P.healEnterFw : P.healEnterHp)`; PARAMS `healEnterFw: 0`; healDoc `lowf: { healEnterFw: 0.40 }` (or 0.30); line 466 finFight untouched | only if a heal-carrying build is the overall best | equal to its params twin or 1 kill lower: nominate FHFW. Lower by 2 or more: the project moderator's ruling on the params twin stands |
| R-A | FMRG | loseCover `c10l05: { loseCoverNear: true, lcCoverS: 1.0, lcLowHpf: 0.05 }` | N <= 257, C > 257 and L > 257, Opus has not pushed it, two exact hits in the merge test | > max(C, L): new base |
| R-B | FC05 | loseCover `c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }` | filler: C > 257, N <= 257, slot 3 did not win, nothing else ready | > C: new base. Else LC closed |
Unspent slots are correct when a condition fails: only the best score counts. No slot: F1 oneHit, x60, lowx, any60f,
lcLate, lowKill, hostMem, seekFrom 10, fresh salt, lastStandHpf, finishThreats / finishHpf, lightning.

## 3. Gates per build (unchanged, plus three from round 2)
G0 once (fable tree + low10 = variants6/FSL10_s1: resolved params, 24 seeds, kit stream squad / auto / forced FFA);
identity at the old value; T-F2; bundle twice byte-identical; pusher's gates. Added: (a) recordings only on a core with
nothing else on it, report load average and fuse per recording (fuse must be 0; four lanes lost batches tonight);
(b) a pre-latch scene "SQUAD posture, foreignDeaths = 1", result stated per build (lcCoverS / lcLowHpf pass by [C];
healEnterHp fails, healEnterFw must pass); (c) a written expected-fail list for 'never' before its suite run.
A build not gated when its slot comes is skipped, not rushed.

## 4. Size and the Fable line's recommendation for the nomination
Size [A]: slots 1-6 are a 1-3 kill climb (5.37-5.42), P(any strict gain) 0.55-0.8 across the panel; no ticket here
reaches a 5.6 cut. It is a low-cost climb and should be described to the owner as that.
Nomination: the highest official score among firewalled builds (LC family: FNV, c0l10, low0, low10, Opus C / L without
finishThreats). A heal-carrying build is nominated only as its firewalled copy FHFW, unless FHFW falls 2 or more kills
below its params twin, when the choice between score and final-safety goes to the project moderator and the owner with
both numbers. A build carrying finishThreats 3 fails T-F2 by [C] (lines 402, 404) and is not a Fable nomination.
If nothing beats 257: nominate FSL10 s1 (3aacfa3), already entered.
