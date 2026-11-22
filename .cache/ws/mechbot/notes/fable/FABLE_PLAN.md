# FABLE_PLAN — binding plan for the Fable line (00:40 UTC Sun)

## Read this first: how the plan was made
The five-expert, two-round panel was NOT run: the moderator session has no sub-agent tool, so no expert could be
spawned (details in moderator_r1.md, same folder). This plan is the work of one Fable agent (the moderator) using the
five lenses alone, plus a behaviour-only simulator sweep (36 squad seeds, 17 variants, salt 1, tree ckpt_07_LG; data in
scratchpad/fable_work/sim, table in moderator_r1.md). It has had no independent review. If the owner still wants the
panel, the session that owns a sub-agent tool must convene it; this file can serve as its brief.

## Base and salt
Base B = FSLCL15 s1, commit 8cdafe2b9d592ea793d0d77c306674ddce398e3b, 5.31 [M]: R7 tree, KS SELECT + aggr 'any70f' +
fb 'on' + loseCover 'near' + lcLowHpf 0.15, PARAMS.salt 1. If an Opus step (oneHit / low10 / low15+cover 1.0) has
beaten 5.31 by the time these are built, B = that build instead (same salt).
Salt: builds F1-F5 stay on salt 1. Reason [A]: a step on the best salt re-rolls only the matches it touches and keeps
the luck already banked in the others; a fresh salt re-rolls all 48. Per-match sd is about 1.4 kills, so with the base
about 0.15-0.2 above its config mean a neutral low-divergence step and a fresh salt are each worth about +0.02 per
slot, and the gap widens in favour of low-divergence steps as the base rises (at 5.5: 0.011 vs 0.003). F6 is the one
fresh salt, to open a second base.

## Builds (all params-only; new preset VALUES on existing keys; no new code)
Add to PRESETS in lib/params.js (old values untouched, so today's play is byte-identical by construction):
- loseCover: `oneHit: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.23 }`, `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }`,
  `c075: { loseCoverNear: true, lcCoverS: 0.75, lcLowHpf: 0.15 }`
- healDoc: `low: { healEnterHp: 0.40 }`
- aggr: `any60f: { aggrFw: true, aggrHpf: 0.6, aggrS: 0, h50SeekHpf: 0.6 }`
Code sites that read them (no edit): tactics.js losing() line 393-396 (LC veto, behind hunt.firewall()), decideMode()
line 472 (HEAL entry), tactics.js lines 226-227 (a7, foreignDeaths === 0), hunt.js seekLegs line 305.

| # | name | SELECT change against B | salt | meaning | sim: differ of 36, up / down, net |
|---|---|---|---|---|---|
| F1 | FOHLC s1 | loseCover 'oneHit' | 1 | owner's idea, literal: cover distance no longer triggers a retreat; leave only below one laser hit (315 / 1400 = 22.5%) | 13, 3 / 1, +4 |
| F2 | FNR s1 | loseCover 'never' | 1 | the limit: never leave a fight (zone and HEAL out of contact unchanged) | 9, 0 / 1, -1 |
| F3 | FHE40 s1 | healDoc 'low' | 1 | heal out of contact only below 40% (55% today); opposite of healDoc 'on', which cost 0.21 officially | 3, 0 / 2, -5 |
| F4 | FA60 s1 | aggr 'any60f' | 1 | start / seek fights from 60% hp (70% today) | 3, 0 / 1, -1 |
| F5 | FC075 s1 | loseCover 'c075' | 1 | retreat to cover only within 0.75 s of travel (1.5 s today) | 3, 0 / 1, -1 |
| F6 | B s11 | none | 11 | fresh draw of the best SELECT at that moment (second base) | all |
The simulator ranks nothing (healDoc changed 0 local decisions and cost 10 kills officially); its columns only show
that each build changes play and how many matches it is likely to touch (F3-F5 few, F1-F2 about a third).

## Order and rules
1. Submit F1, F2, F3, F4, F5, F6 in that order, one result at a time where the schedule allows.
2. Keep rule: strictly above the current best -> it becomes B for every later build (rebuild the remaining ones on it:
   one SELECT string each, about 5 minutes); equal or lower -> off, B unchanged.
3. F1 and F2 are two values of one key: if F1 is kept, F2 is still submitted from the pre-F1 base and replaces F1 only
   if it scores higher than F1.
4. Drop without submitting: F5 if Opus "low15 + cover 1.0" came in below 5.31 (same direction, already refuted);
   F2 if Opus low10 AND F1 both came in below 5.31 by 0.10 or more (leaving less has stopped paying).
5. F3 and F4 contradict the simulator and the R7 engage memo (entry at 80-100% hp 2.43 kills vs 60-80% 1.78 [S]); they
   are low-divergence tickets justified by the official trend only. One slot each, never a second draw.
6. Not in the plan, on evidence: seek from 5 s instead of 20 s (28 of 36 sim matches differ, net +2: a full re-roll
   that also acts in the final's opening before the FFA latch); finishHpf / lose1-3Hpf / healAfterLoseS variants
   (read in FFA, not final-safe); heal-less + never-leave combinations (sim net -6).

## Gates for the engineer (about 40 minutes for all six)
Per build: kit-stream and R3a2/FFA identity of the tree with the new values unselected; T-F2 (add 'oneHit', 'never',
'c075' to the loseCover case; 'low' to the healDoc HOLD case at hp 0.50; 'any60f' to scene B at hpf 0.65): acts in
SQUAD, identical in forced FFA; release gate; fresh-clone hash. healDoc 'low' is inert in FFA by line 472 (the FFA
entry clause hp < 0.7 dominates) but must be shown by T-F2, not assumed.

## Nomination
All six are final-safe in the same sense as the current 5.31 entry (firewalled; fb 'on' kept). Nominate the highest
score across both lines if it clears the cut; a tie goes to the earlier submission. If F1 and another build tie at the
top, prefer the one that is not F2 (never leaving is the least tested posture if the final latches FFA late).

## Honest expectation
Each of F1-F5 is roughly a one-in-three chance of a small gain (+0.02 to +0.10); together about +0.1 expected. This
plan does not by itself reach a 5.6-5.8 cut; nothing found tonight is a +0.3 behaviour change.
