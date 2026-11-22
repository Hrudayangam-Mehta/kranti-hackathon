# Fable panel, round 2 — hackathon and prototype lead (about 00:53-01:10 UTC Sun)

Tags: [M] official, [S] simulator (behaviour only, ranks nothing), [C] read in the code, [A] my analysis.
Status of everything below: proposal, needs gates. Nothing built, gated, pushed or submitted by me.
Scratch: fable_work/r2_hackathon/ (run2.sh, summ2.py, sim/). I stopped my two leftover round-1 run loops (they shared
core 2 and tripped the fuse in 11 of 24 base matches); every number below is from a rerun with fuse 0 and errors 0.

## 1. Answers to the moderator's questions

**Q2 first (my empty section 7). Result, squad seeds, salt 1, 5.35 SELECT via overrides on r7work/ckpt_07_LG, taskset -c 2:**
| variant | seeds | matches that differ from base | kills net | note |
|---|---|---|---|---|
| base (lcLowHpf 0.10) | 1-24 | - | 95 kills | lcFight (veto) decisions 1422; HEAL 122 ticks, in seeds 9, 14, 21, 23 only |
| NEVER (cover 0, low 0) | 1-24 | 4 (seeds 1, 5, 20, 22) | 0 | DISENGAGE ticks -69 |
| C0L10 (cover 0, low 0.10) | 1-12 | 2 (seeds 1, 5) | 0 | |
| LOW0 (cover 1.5, low 0) | 1-12 | 1 (seed 1) | 0 | |
| HF60 (hfExit 0.6) | 1-24 | **0** | 0 | trigger counter for x60 = 0 of 24 |
| HE40 (healEnterHp 0.40) | 1-12 | 1 (seed 9) | 0 | HEAL ticks -4 |
- New [S]: on seed 1 NEVER is hash-identical to LOW0, on seed 5 hash-identical to C0L10. In this sample 'never' is
  exactly the union of the two single-axis changes; class C (K3) added nothing of its own.
- 'never' touched 4 of 24, i.e. about 8 of 48, not 12. Use m = 8 for the math yield.
- x60: trigger 0 of 24. By the moderator's own slot-6 rule (trigger > 0) I withdraw H3 FX60 as a ticket. Caveat [M]:
  healDoc 'on' also changed 0 local matches and cost 10 kills, so a local zero does not mean an official zero; it
  means I have no local evidence the key is ever reached, and no argument for the sign.
- SK10 and C05L10 were not rerun clean (one fuse-0 SK10 match from round 1: seed 1, 7 -> 3 kills, play changed from
  the opening). No claim from one match beyond "high divergence".

**Q1. Can G0 + FNV + FHE40 be gated in 35 minutes; what to pre-build.**
Yes. variants6/FNV_s1 and variants6/FHE40_s1 already exist (made 00:52; both carry `low10`, `never` and healDoc `low`
in PRESETS [C]); what is left is G0 (resolved params and 24 seeds against variants6/FSL10_s1, kit stream x3), T-F2,
double bundle, release gate: about 20 minutes on a quiet core. Recordings must be on one core with nothing else on it:
two loops on core 2 gave fuse trips in 11 of 24 matches tonight, and a fused recording is not a valid identity proof.
Pre-build now (5 minutes each, params-only, all on B): `c0l10` and `low0` (the two likely slot-3 branches). Build on
demand only: `c05l05` (needs both Opus singles to win), `lowx` (needs FHE40 to win). Do not pre-build: x60, any60f.

**Q3. seekFrom '10' final-safety.** [C] h50SeekFromS has one read in the tree: hunt.js 305, two lines after
`if (!on() || !h.seekOk) return false` (303); h.seekOk = firewall() is rewritten every tick in pre() (110). So it is
behind the firewall at every read, and forced FFA is identical. But the firewall is open at 10-20 s of every final
match (no foreign death yet), so this key would act in the opening of essentially every final match, unlike the LC
keys, which need a losing fight before the first foreign death. Ruling I recommend: practice-only, never nominated.
And since it changes play from second 10 it re-rolls nearly all 48 matches of a base that sits above its mean (K7).
I withdraw H5 from the six.

## 2. Attack on the provisional six-slot plan
1. **Slot 3 can buy a ticket already bought.** If 'never' loses, `c0l10` and `low0` are its two halves [S: identical
   hashes]. With G05 and G10C10 known, the lost 'never' result plus the two Opus half steps already say most of what
   the single would. Keep the table, but add: if 'never' is lower by 3 kills or more AND only one Opus single won by
   exactly 1 kill, skip the single (expected gain under one kill, same matches) and give the slot to the stack.
2. **Slot 1 size is overstated.** m about 8, not 12. Still the right first slot: one result covers both axes and the
   after-retreat HEAL, and Opus cannot reach it. Expect a move of 0 to 3 kills either way; a tie is likely (25-30%).
   A tie means "off" under the keep rule; do not rerun it.
3. **Slot 2 and slot 4 spend two of six slots on the family with no local trigger and an open final-safety ruling.**
   HE40 touched 1 of 12, x60 0 of 24. One heal slot (FHE40) is justified by the -10 official mirror; the follow-up
   exists only if FHE40 wins (`lowx`). Delete the "tie or -1..-2 -> x60" branch and the "-3 -> any60f" branch:
   any60f starts fights under the owner's 70% line and was 0 of 24 locally. If FHE40 does not win, slot 4 goes to
   the stack or the filler.
4. **Slot 5's stack must wait for a clean rule on what "beat its own base" means.** A single that won on B is only
   stackable if the current best still contains B's value on that key. If 'never' wins, G10C10 and G05 are inside it
   already (never is the far corner): stacking them would move the key back (R1). Then the only stackable parts are
   on other keys (healDoc low; finishThreats 3 is barred by K2). So with 'never' kept, slot 5 is at most
   never + healDoc low, and only if FHE40 won. Otherwise there is no slot-5 build: do not invent one.
5. **Slot 6 is the schedule risk.** Any code build needs identity 84/84, T-F2, a new scene, a trigger counter and QA:
   45-60 minutes of one engineer, on a machine where load already breaks recordings. It must start now, in parallel,
   or slot 6 goes out late or ungated. Only lcLate (one line, same latch as the firewall minus the zone and alive
   terms) fits that budget. lowKill touched 9 of 12 (game's own run): a full re-roll, no. hostMem: wait for psych's
   36-seed result; same objection if it touches more than 8 of 48.
   Extra gate for lcLate that the plan lacks: it removes the zone-late and "<= 3 alive" terms, so check that it does
   not hold us in a fight while the zone closes on us (ZONE mode must still outrank FIGHT; show one scene).
6. **The stop-loss is too loose on time, not on slots.** There are about 85 slots and one engineer. The binding
   limit is gate minutes and clean cores. A build that is not gated when its slot comes is skipped, not rushed;
   never skip G0 or a fuse-0 identity to make a slot.
7. **Honest size [A].** Local net was 0 kills for every variant. Six tickets of 0-3 kills each: about +1 to +3 kills
   (5.37-5.42) with a 55-65% chance of any strict gain. I do not accept math's P 0.88 until the three Opus merges
   report. This plan does not reach a 5.6 cut; it is a low-cost climb, and should be labelled as that to the owner.

## 3. Final ranked list (at most five builds), base B = FSL10 s1, salt 1
B's SELECT (from variants6/FSL10_s1; the engineer copies it from there, not from this memo): final-safe set with
aggr 'any70f', fb 'on', seek 'on', loseCover 'low10' = `{ loseCoverNear: true, lcLowHpf: 0.10 }`, healDoc 'off'.
| rank | tag | exact change against B | type | condition / after the result |
|---|---|---|---|---|
| 1 | FNV | loseCover: 'never' = `{ loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }` | params | now. > 257: new base, no LC single. <= 257: off, go to rank 3 |
| 2 | FHE40 | healDoc: 'low' = `{ healEnterHp: 0.40 }` (loseCover stays 'low10') | params | parallel with rank 1; practice-only until K1 is ruled. > 257: follow-up `lowx: { healEnterHp: 0.40, hfExit: 0.55 }` may use rank 5's slot. Else heal closed |
| 3 | one LC single | G10C10 > 257 only: loseCover 'c0l10' = `{ loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }`. G05 > 257 only: 'low0' = `{ loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }`. Both: 'c05l05' = `{ loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.05 }` | params | only if FNV did not win; skip under the rule in 2.1; neither Opus single won: LC closed |
| 4 | stack | current best + every kept single on a key the best does not already exceed (2.4); no finishThreats | params | only when such a part exists; predicted = base + sum |
| 5 | lcLate 'on' | losing() line 393 firewall term -> `(P.lcLate === true ? B.env !== 'FFA' && B.foreignDeaths < P.h50ForeignMax : B.hunt.firewall())`; PARAMS `lcLate: false`; preset `lcLate: { off: {}, on: { lcLate: true } }`; SELECT 'off' | one line of code | only if game's count gate >= 20 decisions over squad 1-36 at fuse 0, plus identity, T-F2 and the zone scene. Fails any: filler loseCover 'c05l10' = `{ loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }` if G10C10 won, else no build |
Code is worth it for rank 5 only: it is the one candidate that opens matches the parameter ladder cannot reach
(end-zone deaths) at low divergence. Everything else stays params-only.
No slot: F1 oneHit, x60, seekFrom 10, any60f, fresh salt, lowKill, lastStandHpf, finishThreats / finishHpf, lightning.

## 4. Not verified
- No official data from me. Local samples are 12-24 seeds; net kills were 0 everywhere, so they give counts only.
- I did not run G0, T-F2 or any bundle check on variants6/FNV_s1 / FHE40_s1; I only read their PRESETS lines.
- lcLate and hostMem were not run by me. SK10 and C05L10 have no clean sample.
