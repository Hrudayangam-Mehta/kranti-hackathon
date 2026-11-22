# r2_game — game designer / gameplay engineer (Fable panel, round 2)

Written about 00:59-01:12 UTC Sun 22 Nov. Tags: [M] official, [S] simulator (behaviour only, ranks nothing), [C] read in
the code, [A] my analysis. One author; nothing here is independent review. Every build is a proposal that needs the gates.
Scratch: fable_work/r2_game (lib3 = r1 lib2 plus counters only; run.sh, chain.sh, sum.py, out/B, out/NV).
Note: submissions.md 336-339 shows FNV_s1 and FHE40_s1 already handed over (slots 1 and 2); results not in yet.

## 0. Simulator record (core 2 only, `taskset -c 2`, 5.35 SELECT by override, salt 1, squad seeds 1-36)
| batch | matches | fuse trips + errors | used |
|---|---|---|---|
| B (base, counters added) | 36 | 0 | yes; 146 kills, mean life 71.2 s, longest 103.2 s |
| NV (lcCoverS 0, lcLowHpf 0) | 36 | 0 | yes; 145 kills |
Counter check: lib3 with the counters gives the same match hash as the plain tree on all 14 of my round-1 base
recordings that had fuse 0 (the other 3 round-1 recordings had fuse trips of 2-8 and are not a reference).
NV against B: 8 of 36 matches differ (seeds 1, 5, 20, 22, 26, 29, 30, 36), net -1 kill (seed 29: 4 -> 3). That is
about 11 of 48; the hackathon lead saw 4 of 24. Use m = 8-11 for 'never'.

## 1. Answers to the moderator's three questions

**Q2 first: lcLate count gate = 0. DROP.** [S] Over 36 matches and 25,649 decisions, the number of decisions with
SQUAD posture, no foreign death and the firewall false (i.e. next radius <= 70 or <= 3 alive) is 0; so decisions that
lcLate would change = 0 (rule: under 20 means drop). Cause [C, as cyber said]: the radius-70 phase cannot begin before
265 s; our longest life here is 103 s. My round-1 line "4 of 14 deaths in ZONE mode" was ZONE mode in an early, large
zone, not the late zone: it was no evidence for lcLate. I withdraw G5. An official tie is the expected result; no slot.

**Q1: the 40-55% band out of contact.** [C]
- In HEAL (brain 564 retreatLegs, tactics 238, 520): walk to the hide cell and stay behind it; fire is held while
  nobody has had a line for 0.5 s; NPC targets are dropped unless they hit us; a heal cube is taken only within 40 m.
- Without HEAL at that hp: a mech that has hurt us stays a candidate, so with one in view we FIGHT (same as HEAL,
  which ends on contact anyway). With none: LOOT (walk to crates / farm in the open, fire free) or HOLD, and in HOLD
  we stand still: seek needs hp >= 0.7 (hunt 305) and idlePull is off. Regeneration is the server's (5 s untouched,
  then 45 hp/s) and runs in every mode. So the only real differences are (i) standing or looting in the open instead
  of behind a cell, and (ii) farming / looting during the wait.
- Size [S, base 36]: we are at 40-55% hp for 1,479 decisions (5.8%), but with no target for only 221 of them, in
  5 matches. HEAL was entered through this band 4 times, in 3 matches; HEAL lasted 142 decisions in 5 matches in all
  (111 in the band). So FHE40 can act in about 3 of 36, i.e. 4 of 48 matches. A ticket of 1-2 kills either way.
- Better or worse under 15 hunters with shared vision [A]: in the open the squad finds us sooner and the next fight
  starts at lower hp; behind the cell we gain about 45 hp per second of delay. The one official point says delay
  costs: healDoc 'on' = { healEnterHp 0.7, healExit 0.8 } [C params 273] lost 10 kills. With LC on we fight a
  2-on-1 at 45% anyway, so being found early changes the hp we start at, not whether we fight. I expect a small
  plus, with low confidence. I withdraw my round-1 "not at all": one practice slot was right.
- Is hfExit 0.6 + any60f the real mirror? Only of half of it. healDoc 'on' moved two keys: entry 0.55 -> 0.70 (hide
  instead of standing at 55-70%) and exit 0.70 -> 0.80 (about 3 s more regeneration plus the walk back before seek
  restarts at >= 0.7). FHE40 mirrors the entry half exactly in kind (one band lower). The exit half has NO params
  mirror at aggr 0.7: leaving HEAL at 60% starts nothing, since we open on nobody and seek nobody below 70% (hackathon:
  0 of 24 changed). The only way to mirror the exit half is to move the 70% line itself (any60f), which is the
  owner's doctrine line. So: do not build x60; do not build any60f unless the owner asks for it.

**Q3: with 'never' kept, is lowKill 'veto' distinct from 'hp50'?** [S, decisions with the trigger true]
| base | veto true | hp50 true | both | veto only | hp50 only |
|---|---|---|---|---|---|
| B (low10) | 2,231 | 3,100 | 2,083 | 148 | 1,017 |
| NV ('never') | 2,618 | 3,019 | 2,470 | 148 | 549 |
Under 'never' 94% of veto decisions are also hp50 decisions; hp50 adds 549 (18% of its own) where we are under 50%
and not in a losing count (one attacker, or the target is finishable). They are still two triggers, but nearly one
build. Which one for slot 6: **neither**. Either trigger is on for about 10% of all decisions in 34 of 36 matches
(my round-1 run: 9 of 12 matches changed), so it is a full re-roll of a base that sits above its mean; the five
code steps so far average -4.6 kills [M]. If the owner wants the idea tried regardless, 'veto' is the one (it is
the narrower rule and needs no hp constant), and it should be labelled as a re-roll, not a climb step.

## 2. Attack on the provisional six-slot plan (my lens: what the bot does, per trigger)
1. **Slot 6 has no candidate.** lcLate: 0 triggers. lowKill: full re-roll. hostMem: no count from me; by the
   hackathon's one clean match it changes play from the opening. Leave slot 6 unspent unless psych shows hostMem
   touching 8 or fewer of 48 with a trigger count above 20.
2. **Slot 4's two losing branches build things with no trigger or against doctrine.** x60: 0 of 24 [S]. any60f after
   a heal LOSS is back to front (agree with cyber). Keep only "FHE40 > best -> one follow-up".
3. **The follow-up in slot 4 should stay on the key that won.** `lowx` adds hfExit 0.55, a key with no measured
   trigger (HEAL ran 142 decisions in 5 of 36 matches; leaving it 15 points earlier starts no fight). The lcLowHpf
   ladder paid by walking one key (0.25 -> 0.15 -> 0.10). If FHE40 wins, the follow-up is healEnterHp 0.30 alone.
4. **'never' does not remove HEAL, and it leaves a dead band.** [S] HEAL decisions under NV: 203 in 6 matches (B:
   142 in 5); LOSING entries 62 -> 5 (the 5 are "already standing on the cell"). So the plan's phrase "removes the
   after-retreat HEAL" is true for the 6 s clause only. Dead band [C, cyber found it]: under 25% hp, 2 attackers and
   a cell within 3 s, we neither leave nor use the quickest-kill target rule (`tCover > 3` at line 476 is a literal,
   not a key). If FNV loses while both Opus singles win, that band is the first suspect; the fix would be code
   (lowKill 'veto'), and it is a re-roll: do not chase it on this salt.
5. **Slot 3 can re-buy slot 1.** NV is, locally, the union of its two halves (hackathon: same hashes). Adopt the
   hackathon's skip rule: FNV lower by 3 or more and only one Opus single up by 1 -> no single.
6. **Slot 5: a stack only exists across keys.** With FNV kept, G10C10 and G05 are inside it. The only cross-key
   stack is 'never' + healDoc 'low', and only if both won on their own.
7. **What the six do not touch.** The last 10 s still hold about one kill of damage spread over 2.5 targets (r1
   section 3). No final-safe parameter reaches it (finishHpf, finishThreats, keepTargetHpf, wStick are read in FFA).
   So this plan is a 1-3 kill climb (5.37-5.42), as the hackathon lead says; it should be described to the owner so.
8. **Owner's "one hit".** 'never' is the right carrier (K8). If FNV wins, the owner's sentence is answered: "fight
   below one hit" scored higher at every step [M].

## 3. Final ranked list (at most five; base B = FSL10 s1 = 5.35, salt 1, B's SELECT otherwise; all params-only)
| rank | tag | exact preset value | condition |
|---|---|---|---|
| 1 | FNV | loseCover `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }` | handed over already. > 257: new base, no LC single |
| 2 | FHE40 | healDoc `low: { healEnterHp: 0.40 }`, loseCover `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` | handed over already; practice-only (K1: not firewalled); m about 4 of 48 |
| 3 | one LC single | G10C10 > 257 only: `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }`. G05 > 257 only: `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }`. Both: `c05l05: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.05 }` | only if FNV <= 257; skip under attack point 5; neither Opus single won: LC closed |
| 4 | FHE30 | healDoc `low30: { healEnterHp: 0.30 }` on the then-best loseCover value | only if FHE40 > best; practice-only until a firewalled copy exists (cyber's `healEnterFw` line) |
| 5 | stack | best loseCover value + healDoc value, e.g. loseCover 'never' + healDoc 'low' | only if rank 1 (or 3) and rank 2 each beat their own base; otherwise no build |
No code build is ranked: lcLate has 0 triggers; lowKill 'veto' / 'hp50' is a full re-roll with a -4.6 kill history for
its class; I have no measurement that makes code worth a slot. No slot: F1 oneHit, x60, lowx, any60f (owner's call
only), seekFrom 10, fresh salt, lastStandHpf, finishThreats / finishHpf, lightning. Unspent slots are acceptable.

## 4. Not verified
- No official result for FNV or FHE40 yet. All counts are simulator counts on seeds that are not the official 48; the
  simulator has never predicted an official sign. healDoc 'on' changed 0 local decisions and still cost 10 kills, so a
  local zero (lcLate, x60) means "no local trigger", not a proven official tie; for lcLate the 265 s zone timing is
  the stronger argument.
- `low30` is not built, not T-F2 tested, and I did not count the 30-40% band separately.
- lib3 is a scratch copy with counters; it is not a build and has not been through the identity harness.
- The sign I give for FHE40 (small plus) is an argument from one official mirror point, not a measurement.
