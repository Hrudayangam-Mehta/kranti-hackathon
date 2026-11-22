# Fable panel, round 2: MATHEMATICIAN

Written Sun 22 Nov, about 01:00-01:15 UTC. Read: FABLE_BRIEF (incl. 00:45), my r1_math, the four other round-1 memos,
moderator_r1b, r2_cyber, QA, tail of submissions.md; code at r7work/ckpt_07_LG/lib (tactics.js 386-406, 464-472,
hunt.js 29-32, 303-305, params.js presets). No git, no server, nothing built. One author: not independent review.
Scratch: fable_work/r2_math/ (q.py, q2.py, *_out.txt, sim/). Tags: [M] official, [S] simulator (behaviour only, ranks
nothing), [C] computed or read in code, [E] model estimate, [H] judgement.
Status change since the moderator wrote: FNV and FHE40 were pushed at 00:54 (slots 1-2). No result yet. So the open
decisions are slots 3-6, and question 1 is answered as a check on a choice already made.

## 1. Question 1: 'never' first, or c0l10 + LOW0 in parallel then merge
Model [E]: touched matches split into a (class A only), b (class B only), c (mixed, or class C / after-retreat HEAL).
In an A-only match 'never' and c0l10 make the same decisions, so they give the SAME outcome there (determinism);
likewise LOW0 in B-only matches. Only the c matches are a fresh draw per build. e = 0.27, per-match sd 1.4, 60 000 runs.
Size from the simulator on the low10 base [S, r2_hackathon/sim, fuse 0]: 'never' differs in 4 of 24 seeds, c0l10 in 2
of 12, LOW0 in 1 of 12 (its seed is one of c0l10's). So m for 'never' is about 8 locally; I also ran m = 12 (6,3,3).

| split (a,b,c) | effect per touched match | X: never, then one slot | Y: c0l10 + LOW0 in parallel |
|---|---|---|---|
| (4,2,2) m 8 | 0 | 1.96 kills / P(any higher) 0.46 | 2.08 / 0.56 |
| (4,2,2) m 8 | +0.3 | 3.16 / 0.63 | 3.13 / 0.72 |
| (6,3,3) m 12 | 0 | 2.13 / 0.43 | 2.34 / 0.54 |
| (6,3,3) m 12 | +0.3 | 3.84 / 0.64 | 3.86 / 0.73 |
| (6,3,3) m 12 | -0.3 | 1.01 / 0.25 | 1.25 / 0.35 |
(X: if 'never' wins, the second slot is credited 0.7 kills for another ticket; if it loses, the slot is c0l10.)
Over three slots both orders submit the same three builds and end within 0.2 kills (2.8-3.0 against 2.9-3.1).
Answer: parallel singles are better by 0.1-0.25 kills in yield when there is no real effect and by 0.10 in P(any
higher) in every row; the orders tie on yield when the effect is real. The difference is inside the model's error.
'never' first is acceptable for one reason the table does not hold: Opus G10C10 and G05 already report on parts of A
and B for free. I would have run the singles; I do not ask for anything to be undone.

What the model adds for slot 3 [C, q2.py]: a single AFTER a failed 'never' is not a fresh ticket, because it replays
'never''s outcome in its own-class matches.
| FNV result | prior share | c0l10 yield / P(higher) | LOW0 yield / P(higher) |
|---|---|---|---|
| 255-257 (0 to -2) | 0.2 | 1.1 / 0.35 | 1.1 / 0.36 |
| 254 or lower (-3 or worse) | 0.5 | 0.4-0.5 / 0.15 | 0.6-0.8 / 0.23 |
So the slot-3 table needs the SIZE of the loss, not only its sign (section 4, attack 1).

## 2. Question 2: rule 7 as a number
Let f = share of local squad seeds whose stream differs from the base (fuse 0, at least 24 seeds). Official m is taken
as 48 f (it can be twice that). Bar: the c05l10 filler is worth 0.66 kills / P 0.35 as a fresh one-match step, and only
0.19-0.25 / 0.15 once G10C10 has reported (it is then a half step).
A code ticket outranks the filler only if all three hold:
1. Trigger: f >= 3/36 (2 of 24). At f = 1/36 the chance that no official match is touched (exact tie) is 0.26; at
   3/36 it is 0.015. f = 0 is a wasted slot.
2. Size: f <= 1/3 (m <= 16). Above that, P(higher) is under 0.20 without a real effect.
3. Effect: argued gain per touched match of at least +0.33 at m = 4, +0.15 at m = 8, +0.10 at m = 12-24 [C, q.py:
   model yield halved because the five code steps so far paid 0.6 kills per slot against 1.15 modelled, times 0.8 for
   passing the gates]. Without that halving a neutral change (0) would already pass; I keep the halving.
In short: 3 to 12 of 36 seeds changed, and a stated reason for one extra kill in every seventh touched match.
Applied: lcLate has f = 0 by cyber's argument (radius <= 70 not before 265 s; sim lives end by 103 s): fails 1, drop.
lowKill 'veto' acts wherever LOSING is vetoed (59 vetoes per match [S]): f near 1, fails 2. hostMem: psych's count
decides; same three tests. HF60 (hfExit 0.6): 0 of 24 seeds differ [S, r2_hackathon]: fails 1.

## 3. Question 3: replacement for M5, and the test of rule 3
Replacement. I looked for an untouched, firewalled, params-only key and ran two [S, low10 base, squad seeds 1-12]:
- seekFrom '10' (h50SeekFromS 20 -> 10; read only in seekLegs behind h.seekOk = firewall, hunt.js 303-305):
  fuse 0 in all 12; **11 of 12 seeds differ**. That is a full re-roll (m about 44): P(higher) 0.10 and 0.5 kills with
  no real effect [C]. It is a fresh salt in disguise, not a small step. Not a replacement.
- seekCrowd 'wide' (h50CrowdR 120): batch DISCARDED (one fuse trip, seed 5). No finding. FSLCCR was pushed at 23:16
  and has no recorded score in submissions.md.
Honest answer: I have no final-safe replacement of M5's kind. The untouched firewalled keys are either inert or
full re-rolls. M5's slot goes to the LC single (rank 1 below) or stays unspent.
Rule 3 test. Predictions [C, additivity]: G10C10 = 258, G10FT3 = 258, G10C10FT3 = 259 (5.38, 5.38, 5.40).
If merges were fresh one-match lotteries, an exact +1 has probability 0.16; under additivity about 0.7.
- two or three exact hits: keep rule 3 (likelihood ratio about 7 or more for additivity);
- one exact hit: merge only two winners at a time; no stack of three;
- no exact hit: drop rule 3; submit each winner alone on the newest base (rule 9).

## 4. Attack on the provisional six-slot plan
1. Slot 3 ignores the size of FNV's loss. Add: if FNV <= 254, a single is submitted only on an axis whose Opus half
   step scored above 257 (c0l10 needs G10C10 > 257; low0 needs G05 > 257); otherwise the LC family rests. If FNV is
   255-257, the table stands, and c0l10 is the default (class B alone is thin on the low10 base: LOW0 1 of 12 [S]).
2. Slot 3, "both > 257 -> c05l05" changes two keys to two unmeasured values in one slot. The measured merge is
   `lcCoverS 1.0 + lcLowHpf 0.05`, predicted 257 + both gains. Submit that unless Opus has; c05l05 only after it.
3. Slot 4: drop the `x60` branch (0 of 24 seeds change: expected exact tie). Drop "FHE40 lower by 3 -> any60f":
   I agree with cyber that a loss for FHE40 argues against any60f, not for it. HE40 itself changed 1 of 12 seeds
   locally; healDoc 'on' changed 0 and moved 10 kills officially, so its official size is unknown (1 to 10 matches).
4. Slot 5: "base + sum of gains" is only a prediction once section 3's test has passed. Hold the stack until two
   Opus merges have reported. The c05l10 filler is a 0.2-kill ticket after G10C10 reports; it is a filler, no more.
5. Slot 6: no candidate passes section 2 today. Leave it empty unless psych's hostMem count lands in 3-12 of 36.
6. Stop-loss "slots 1 and 3 both at or below base closes the LC gate" is too quick: with a real +0.3 effect two such
   tickets both fail about 30% of the time. Use the tally instead: all LC tickets of both lines from the 257 base;
   close at -4 kills or worse over six, widen at +4 or better.
7. K11, revised [E]: slots 1-6 as amended are worth about +3 kills (5.41), P(at least one higher) about 0.8, not 0.88:
   slot 6 is empty and slots 3 and 5 depend on slot 1 (shared matches).
Not attacked: G0 first, FNV, FHE40 as a practice slot, one change per slot, no fresh salt.

## 5. Final ranked list (5.35 base, salt 1, SELECT of FSL10 s1 otherwise; all params only; all need the gates)
| rank | tag | exact SELECT value | condition | size / P(higher) / yield [E] |
|---|---|---|---|---|
| 1 | FC0 | loseCover `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }` | FNV 255-257, or FNV <= 254 with G10C10 > 257. If instead only G05 > 257: `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }`. If FNV > 257: neither (FNV is the base) | m 4-8 / 0.35 / 1.1 (0.15 / 0.45 after a loss of 3 or more with no Opus support) |
| 2 | FMRG | best build + every firewalled single that beat its base, e.g. loseCover `c10l05: { loseCoverNear: true, lcCoverS: 1.0, lcLowHpf: 0.05 }` if G10C10 and G05 both > 257 and Opus has not pushed it | after two exact hits in section 3's test | determined by additivity: about 0.7 that it equals base + gains |
| 3 | FHEX | healDoc `lowx: { healEnterHp: 0.40, hfExit: 0.55 }` + loseCover `low10` | only if FHE40 > best; practice-only until a firewalled copy exists (cyber) | m 1-3 / 0.35 / 0.7 |
| 4 | FA60 | aggr `any60f: { aggrFw: true, aggrHpf: 0.6, aggrS: 0, h50SeekHpf: 0.6 }` + `low10` | only if FHE40 > best; owner's 70% line, so the owner's call | m 1-3 / 0.30 / 0.6 |
| 5 | FC05 | loseCover `c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }` | filler; only if G10C10 >= 257 and no ticket above is ready | m 1-2 / 0.15-0.35 / 0.2-0.66 |
Reserve, not ranked: seekFrom `'10': { h50SeekFromS: 10 }` (full re-roll, P 0.10; needs a final-safety ruling: it
acts in the final's seconds 10-20 before the first foreign death). No code build is ranked.
If every condition fails, the slots stay unspent: only the best score counts, and a tie or a lower score adds nothing.

## 6. Simulator record
Core 2 only (`taskset -c 2`), JIT flags and OVR as r2_hackathon/run2.sh, ckpt_07_LG/lib read only, squad seeds 1-12.
| batch | matches | fuse trips | used |
|---|---|---|---|
| base (low10), copied from r2_hackathon/sim/base | 12 | 0 | yes |
| SK10 (h50SeekFromS 10) | 12 | 0 | yes: 11 of 12 differ (kills 49 -> 55 locally; ranks nothing) |
| CRW (h50CrowdR 120) | 12 | 1 | discarded |
Quoted from r2_hackathon/sim (their runs, fuse 0, read by me with their summ2.py): NEVER 4 of 24, C0L10 2 of 12,
LOW0 1 of 12, HE40 1 of 12, HF60 0 of 24, all net 0 kills.
Not verified: official m for any build; the class split (a,b,c); the 0.5 haircut on code steps (five data points);
the simulator's seeds are not the official 48.
