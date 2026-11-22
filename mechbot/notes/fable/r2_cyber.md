# Fable panel, round 2: cyber / red-team analyst

Written Sun 22 Nov, about 00:52-01:00 UTC (machine clock). Scope: our own bot (r7work/ckpt_07_LG/lib, read only), the kit,
our own notes. No server, no git, no other team's code. Scratch: fable_work/r2_cyber/ (run.sh, sim/B10, sim/LOWX, sim/HE40).
Tags: [M] official, [S] simulator (behaviour only, ranks nothing), [C] read in our code, [A] my inference.
One author; nothing here is independent review. Every build below is a proposal that still needs the gates.

## 1. Moderator question 1 (K1): the pre-latch window and the two heal keys

Measured [S], FFA matches with env auto, seeds 411-422, 20 ticks per second, fuse 0:
- First foreign death at 14.2-28.8 s (mean 20.9 s). Latch (third foreign death) 5.3-23.5 s later.
- **Seconds in SQUAD posture with the firewall off: median 8.4 s, mean 9.7 s, range 3.2-23.5 s per match** (12 matches;
  in 2 of them we died before the latch). Source: fable_work/qa/rec/b*/OPUSBASE/ff4*.meta.json, re-run by me on the low10
  settings (r2_cyber/sim/B10: all 12 give the same kills, place and latch tick as the QA recordings).
- This is a simulator number with house bots as the other 15. With 15 real finalists the deaths may come later and
  further apart, so the window in the final is unknown; 8-10 s is a lower-end guide, not a bound [A].
- Tail case [C]: stance.js 35 counts foreign deaths only before 200 s. Fewer than three by then means the posture never
  latches and both heal keys act for the whole match. Not seen in 12 simulator matches; cannot be excluded for the final.

What the keys do in that window [C]:
- `healEnterHp 0.40` (tactics.js 472): out of contact for 1.5 s at 40-55% hp we no longer enter HEAL (hide, hold fire).
  We take a target if one exists, otherwise LOOT / HOLD, in the open, with no fire hold. Before the first foreign death
  it acts as well (about 21 s more), but the entered build already plays SQUAD rules there.
- `hfExit 0.55` (line 460): a HEAL already running ends at 55% instead of 70%, so we walk out about 210 hp lighter.
  After the latch neither key is read (the `hpf < 0.7` clause and max(healExit, ffaHealExit) take over).

Measured effect [S], 12 FFA auto matches, low10 base against `healEnterHp 0.40, hfExit 0.55` (LOWX, fuse 0):
2 of 12 matches differ (412 and 419, both first differing inside the window: ticks 330 and 530 per QA.md).
Kills 26 -> 29, sum of places 68 -> 69 (419: place 2 -> 3), time alive 1422 s -> 1216 s. `healEnterHp 0.40` alone gave the
same two matches with the same outcomes in the QA recordings (my own HE40 batch had one fuse trip and is discarded).
So in this sample hfExit 0.55 adds no divergence of its own, and the leak costs survival time: the final scores 16 - place
(rules_audit L9), so shorter life is the wrong direction there, even with more kills.

**Recommendation: practice slot yes; nominated build no, as plain params.** Reasons: (a) the leak is the wrong sign for a
placement score in the only sample we have; (b) the never-latch tail is unbounded; (c) low10 stops at the first foreign
death, the heal keys do not. If FHE40 becomes the best score, spend one more slot on a firewalled copy before nominating:
tactics.js 472, `me.hpf < P.healEnterHp` -> `me.hpf < (P.healEnterFw > 0 && B.hunt && B.hunt.firewall() ? P.healEnterFw : P.healEnterHp)`
with preset `healDoc: lowf: { healEnterFw: 0.40 }` (default 0 = today, identity by construction). In practice the firewall
is false only at next radius <= 70 or <= 3 alive, which the simulator never reaches (section 3), so the firewalled copy
should reproduce FHE40's score; it must still be submitted to be sure. Same pattern for hfExit (`hfExitFw`).
Not built, not tested.

## 2. Moderator question 2: an observable for 'never' overshooting; lcLate and the ratchet

**Observable (official): sub-additivity.** 'never' = class A + class B + class C + loss of the 6 s after-retreat HEAL.
Opus G10C10 probes part of A, G05 part of B. If FNV scores at or below 257 while G10C10 and G05 are both at or above 257,
the loss sits in what only 'never' removes: class C (near cover and under 10% hp) and the after-retreat HEAL. That is the
overshoot signature, and it says "stop at the single axes", not "the LC gate is closed".
**Observable (local, behaviour only): the dead band.** [C] With 'never', at hp < 25% with two or more attackers and a
hide cell within 3 s, `doomed` (line 476) is false (cover is reachable) and LOSING is vetoed. We then fight with the
normal target rule, not the last-stand "quickest kill" rule, and we do not leave. Count decisions with losingRaw true,
hpf < 0.10, tCover <= 1.5 (class C). In fable_work/sim (36 seeds, old low15 base, fuse 0) 'never' changed 10 of 36
matches, net -1 kill, and 7 of those 10 are also changed by LOW0 (class B alone); the 3 that only 'never' changes
(5, 10, 29) are the class A / C matches: 0, 0, -1 kills and +1.6 s, -6.5 s, -2.1 s of life. Small, sign not readable.
My round-1 claim "every cut in line-breaking time pays" was too strong: it holds for retreats that cannot reach 5 clean
seconds. A class C retreat (cover within 1.5 s, under 10% hp) is the one case that can. I withdraw "no skipping";
I accept 'never' in slot 1 with the sub-additivity reading above.

**lcLate and F-A.** [C] lcLate keeps `B.foreignDeaths < P.h50ForeignMax`, so it does not reopen the ratchet: one
uncredited house death still switches it off, as today. It adds no new leak into the final (before the first foreign
death the next radius is never <= 70 and alive is never <= 3). The ratchet is also frozen after 200 s (stance.js 35).

## 3. Attack on the provisional six-slot plan

1. **Slot 6 lcLate is very likely an exact tie (a wasted slot).** [C] mechanics_deep 235-237: the radius-70 phase is the
   fourth; next radius <= 70 cannot be true before the third shrink ends at 265 s. <= 3 alive needs 13 of our own kills.
   [S] base sweep, 36 seeds: mean life 71 s, longest 103 s, none past 150 s. Unless official matches last three times
   longer than simulated ones, lcLate changes zero decisions. The game designer's count gate decides; I expect 0.
2. **Slot 4, third branch is back to front.** "FHE40 lower by 3 or more -> any60f". A loss for FHE40 says the 40-55%
   out-of-contact band is better spent hidden; any60f spends the neighbouring 60-70% band fighting. any60f is the
   consistent follow-up only if FHE40 GAINS (my round-1 C4). If FHE40 loses by 3 or more: heal closed and any60f closed.
3. **Slot 4, `x60` alone has almost no trigger.** With aggrHpf 0.7 and h50SeekHpf 0.7 we open on nobody at 60-70%, so
   leaving HEAL at 60% only changes where we stand. Expected tie. Prefer `lowx` or nothing.
4. **Slot 5 "predicted score = base + sum of gains" holds only for disjoint match sets.** A merge is a fresh draw on the
   union of the touched matches. The Opus merges (low10 + cover 1.0, + finishThreats 3) are the test; do not spend the
   stack slot before one of them reports. The filler c05l10 is an interpolation between two measured points (1.5 and
   Opus 1.0): low information.
5. **Slot 2 status.** Agreed as practice-only (section 1). The plan should say now what happens if it wins: one extra slot
   for the firewalled copy, or the nomination stays on the best firewalled build.
6. **Every LC result is conditional on F-A** (K10). No test exists without the server. Not a reason to change the plan.
7. Not attacked: slot 1 (FNV), the slot-3 table, the stop-loss, G0 first.

## 4. Final ranked list (5.35 base, salt 1, SELECT of FSL10 s1 otherwise; params only)

| rank | tag | exact SELECT values | when | status |
|---|---|---|---|---|
| 1 | FNV | loseCover `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }` | slot 1 | final-safe class (firewalled); needs gates |
| 2 | FHE40 | healDoc `low: { healEnterHp: 0.40 }` + loseCover `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` | slot 2, parallel | practice-only; not to be nominated as params |
| 3 | LC single | per the moderator's table: `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }` or `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }` or `c05l05: { ..., lcCoverS: 0.5, lcLowHpf: 0.05 }` | after FNV, G05, G10C10 report | firewalled; needs gates |
| 4 | FHEX | healDoc `lowx: { healEnterHp: 0.40, hfExit: 0.55 }` + `low10` | only if FHE40 > best | practice-only, same leak as FHE40 [S: no extra FFA divergence in 12] |
| 5 | FA60 | aggr `any60f: { aggrFw: true, aggrHpf: 0.6, aggrS: 0, h50SeekHpf: 0.6 }` + `low10` | only if FHE40 > best (not if it loses) | firewalled; against the owner's 70% line, so the owner's call |

No code build is ranked: lcLate has no trigger (section 3.1), and I have no measurement for lowKill or hostMem. If FHE40
wins, the one code change worth a slot is the firewalled heal copy in section 1 (one line, identity by default).
If FHE40 is at or below base, ranks 4 and 5 are dropped and their slots go to the stack (after an Opus merge has
reported) or stay unspent. Unspent slots are acceptable: only the best score counts.

## 5. Simulator record
Core 2 only (`taskset -c 2`), single-thread JIT flags as QA's rec.sh, ckpt_07_LG/lib read only, overrides by OVR.
| batch | matches | fuse | used |
|---|---|---|---|
| B10 (low10 base), FFA auto 411-422 | 12 | 0 | yes |
| LOWX (healEnterHp 0.40, hfExit 0.55), FFA auto 411-422 | 12 | 0 | yes |
| HE40 (healEnterHp 0.40), FFA auto, 11 done | 11 | 1 | discarded; QA's fuse-0 recordings quoted instead |
No squad-mode run was made in this round; squad figures are read from fable_work/sim (fuse 0, old low15 base).
Not done: no build, no bundle, no identity or T-F2 run, no official result. The firewalled heal line is untested text.
