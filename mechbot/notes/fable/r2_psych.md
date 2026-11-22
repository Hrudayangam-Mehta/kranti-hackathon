# Fable panel, round 2: behavioural psychologist / opponent modeller (+ playtest QA)

Written Sun 22 Nov, about 01:05-01:20 UTC. Read: FABLE_BRIEF (incl. 00:45), my r1_psych, the other four round-1 memos,
moderator_r1b, r2_cyber, r2_math, r2_hackathon, BUILD_LOG tail, submissions tail (FNV_s1 and FHE40_s1 are pushed, no
score yet), forensics 153-160 and 530-540, housebot_model (first-shot delay), ckpt_07_LG/lib tactics.js 60-75, 118-126,
375-490, hunt.js 29-32. Scratch: fable_work/r2_psych/ (rec7p.js = rec7.js plus a read-only tail history, run.sh,
summ.py, sim/). No git, no server, nothing built or pushed; ckpt_07_LG/lib read only, changes by OVR only.
Tags: [M] official, [R] replay, [S] simulator (behaviour only, ranks nothing), [C] read in code, [A] analysis, [N] no evidence.
One author: nothing here is independent review.

## 1. Question 1: the P3 first look, done properly

Run [S]: squad seeds 1-36, salt 1, 5.35 SELECT + lcLowHpf 0.10, `taskset -c 2`, fuse 0 and errors 0 in all 72 matches.
Base = same recorder without the override; its 24 first seeds are hash-identical to r2_hackathon/sim/base (24 of 24),
so the added history does not change play. Variant = plain override `hostileDmgS: 10`.

| measure (36 matches) | base | hostileDmgS 10 |
|---|---|---|
| matches whose action stream differs | - | **2 of 36** (seeds 2 and 6) |
| kills | 146 | 148 (seed 6: 1 -> 3; seed 2: 4 -> 4) |
| time alive, s | 2564 | 2567 |
| FIGHT decisions / regain-leg decisions | 15455 / 792 | 15470 / 785 |
| regain-leg decisions under 40% hp | 143 | 128 |
| deaths with a regain leg in the last 3 s | 8 | 7 |
| deaths whose last leg was regain | 1 | 1 |
| deaths with the target kept only by the 4-10 s memory in the last 3 s | 5 (target held for another reason) | 5 |
| decisions with no target at 55-70% hp (the window P3 was written for) | 169 (0.66% of decisions, 0.5 s per match) | 169 |

**Stop rule: not triggered** (regain deaths 8 -> 7; the rule was "rise by more than 3 in 36").
**But P3 fails on reach, and I withdraw it from slot 6.** The situation it was written for (we stand at 55-70% hp with no
target because a hunter's hits lapsed 4 s ago) lasts half a second per match. 2 of 36 is below the mathematician's
trigger bar (3 of 36), and the plain override over-states the real preset (it also widens the farm-first answer window,
tactics.js 125). The real `sqHostileDmgS` build would touch at most these 2. One seed gained 2 kills; that is one
match and ranks nothing. My round-1 "M-H divergence" guess for P3 was wrong: it is L, near zero.

Other readings from the same 36 base matches [S]:
- Damage out 100 hp per second alive, damage in 25. We win the exchange per second by four to one for the whole life;
  what kills us is the last few seconds: 22 of 36 deaths took 8 s or less from 50% hp to 0 (fastest 2.3 s).
- Lines on us at death: 1 in 7 matches, 2 in 12, 3 in 11, 4 or more in 6. Mode at death: FIGHT 25, DISENGAGE 6, ZONE 5.
- 10 of 36 deaths had a DISENGAGE decision in the last 8 s: when we do leave on this base, we often die leaving.
- LC veto 2270 decisions (63 per match) against 62 LOSING entries (1.7 per match), HEAL in 5 of 36 matches only.

## 2. Question 2: does a house habit support or contradict 'never' inside 1.5 s of cover (class A)?

Short answer: **the habits support 'never' for class A; the first-shot delay is worth little to a bot that leaves and
a lot only to a bot that peeks, which ours does not.**
- What is measured [R]: first shot 0.25 / 0.65 / 1.15 s (p10 / p25 / p50) after a clear line opens, 77 FRESH acquisitions,
  inflated by unmodelled tree cover (forensics 157-159: "treat 0.25 s as the floor"). Shots only with a clear line
  (99.6%). Exposures under about 0.25 s drew no fire.
- What is not measured [N]: the delay when a hunter that already had us loses the line and gets it back. The 77 are
  first acquisitions. I do not claim the same delay for a re-open.
- The habit that decides [R]: a house bot never retreats, never heals, closes even under 20% hp, and the squad shares
  vision. Cover does not shed it; it walks round. So a class A retreat buys: the seconds the wall holds, and then one
  first-shot delay per hunter per re-open: at 0.25-0.65 s and 36.5 gun dps [R] that is 9-24 hp per hunter per retreat.
- What it costs [S base]: we out-damage the squad four to one per second. Every second walking to the cell and behind
  it is about 100 hp of our damage not dealt (a tenth of a kill), the hunters reload for free behind the wall (the
  2.5 s silence is exactly what a short break gives back to them), and the next hunter is 13-35 s away and still
  walking in [R]. The retreat also arms the 6 s after-retreat HEAL (hold fire), which 'never' removes.
- Where a peek WOULD pay: staying at the corner with the torso on it, stepping out for less than the 0.25 s floor or
  shooting first as the hunter rounds the wall. That is a new leg (jiggle peek), high divergence, not a parameter, and
  not what LOSING does. I do not propose it for these slots.
- The one case against 'never' is class C / a ready house laser (it releases only at full charge [R]): breaking the
  line during a visible charge saves a beam. Nobody has counted it; cyber's sub-additivity reading (FNV at or below
  257 with G10C10 and G05 at or above) is the right official test, and I adopt it.
Prediction on record [A]: FNV at or above 257 (class A removal is favoured by the habits); confidence low, about 0.55.

## 3. Question 3: P3 or lcLate, which leaks less into the final's opening?

**lcLate leaks nothing new; P3 leaks a little. Neither should get a slot.**
- lcLate [C]: it only drops the two late terms of the firewall (next radius <= 70, alive <= 3). Before the first foreign
  death of a final neither term can be true, so the opening is played exactly as the entered low10 build plays it.
  But for the same reason it has no trigger in practice (cyber: radius 70 not before 265 s; my 36 base lives end by
  about 105 s): expected exact tie.
- P3 [C]: behind the firewall it acts from the first hit we take until the first foreign death (about 21 s in the
  simulator, unknown in the final), and only at 55-70% hp after an attacker has been quiet for 4-10 s. There it keeps
  us chasing a real bot that has taken cover, which is the habit that does not transfer ("never retreats" is house
  only; giddy hides at 38%, proj1 flees). Small, wrong-signed for a placement score, and now also without a practice
  case (section 1).

## 4. Attack on the provisional six-slot plan (behaviour and QA lens)

1. **Slot 6 has no candidate left.** lcLate: no trigger. hostMem: 2 of 36, fails the trigger bar (section 1). lowKill
   'veto': acts on 63 veto decisions per match, a full re-roll of a base above its mean. Leave slot 6 unspent rather than
   fill it; any60f as the fallback is against the owner's 70% line and against cyber's and math's logic.
2. **The plan treats "fight on longer" as an open-ended trend; behaviourally it is a ladder with a visible last rung.**
   On the 5.35 base only 1.7 LOSING entries per match are left and 'never' changes 4 of 24 local seeds (hackathon).
   After FNV there is no further "retreat less" value. The stop-loss should say so: after FNV and one single, the
   family is exhausted whatever the sign, not "closed if both lose".
3. **Slot 2 (FHE40) has a habit on its side and one against.** For: shared vision means hiding at 40-55% does not
   hide us; the hunters path to our true position, so HEAL's fire hold gives away the first shots. Against: HEAL is
   rare here (5 of 36 matches), so the official effect rests on a handful of matches, and healDoc 'on' showed that a
   locally inert heal key can move 10 kills. Keep it as the one-shot it is; no `x60` follow-up (0 of 24 trigger) and
   no "lost by 3 -> any60f" branch.
4. **Slot 3 should follow math's amendment** (size of FNV's loss, c0l10 as default; the measured merge
   `lcCoverS 1.0 + lcLowHpf 0.05` before the unmeasured c05l05). From my data I add: class B (under 10% hp) is the
   class where leaving kills us (10 of 36 deaths with a DISENGAGE in the last 8 s), so `low0` has the better behavioural
   story even though it is the thinner ticket locally (1 of 12).
5. **QA: the gates miss one case and one condition.**
   (a) T-F2 forces FFA; it cannot see the pre-latch window. Add a scene "SQUAD posture, foreignDeaths = 1": a key that
   still acts there is practice-only (healEnterHp, hfExit fail it; lcCoverS, lcLowHpf pass). State the result per build.
   (b) Recordings are valid only on a core with nothing else on it. Tonight three lanes lost batches to fuse trips on
   shared core 2 (mine in round 1, hackathon 11 of 24, cyber 1, math 1). An identity proof from a loaded core is void;
   the gate report should print the load average and `fuse` per recording.
   (c) The 11 suite checks that fail "by construction" for 'never' need a written expected-fail list per build, or a
   real regression among them will be read as expected.
6. **Stack slot**: agree with math and cyber: no stack before two Opus merges report.

## 5. Final ranked list (5.35 base FSL10 s1, salt 1, SELECT otherwise unchanged; params only; all need the gates)

FNV and FHE40 are already pushed and are not re-ranked. No code build is ranked: I looked for one worth it and my own
candidate failed its count.

| rank | tag | exact SELECT value | condition |
|---|---|---|---|
| 1 | FC0 | loseCover `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }` | FNV 255-257, or FNV <= 254 with Opus G10C10 > 257. Not if FNV > 257 (FNV is then the base) |
| 2 | FL0 | loseCover `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }` | FNV <= 257 and Opus G05 > 257; or as the second single if FC0 ties |
| 3 | FMRG | loseCover `c10l05: { loseCoverNear: true, lcCoverS: 1.0, lcLowHpf: 0.05 }` | G10C10 and G05 both > 257, Opus has not pushed it, and math's additivity test has two exact hits |
| 4 | FHEX | healDoc `lowx: { healEnterHp: 0.40, hfExit: 0.55 }` + loseCover `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` | only if FHE40 > best; practice-only (fails the foreignDeaths = 1 scene) until a firewalled copy exists |
| 5 | FC05 | loseCover `c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }` | filler; only if G10C10 >= 257 and nothing above is ready |

If every condition fails, the slots stay unspent. Withdrawn by me: P3 hostMem (count 2 of 36), P1 / P2 (sensor fires
0.5 times per match, K9), P4 openPick (full re-roll, K7), P5 lightFirst (8 of 36 lightning deaths in base [S] is a
measurement to make, not a build). Engineering items for after the deadline, not tickets: `magCarry` sensor, a
corner-peek leg, a pre-latch test scene.

## 6. Simulator record
| batch | matches | fuse trips | errors | used |
|---|---|---|---|---|
| base (low10), squad 1-36, rec7p.js | 36 | 0 | 0 | yes; seeds 1-24 hash-identical to r2_hackathon/sim/base |
| H10 (`hostileDmgS: 10`), squad 1-36 | 36 | 0 | 0 | yes |
Both loops ran on core 2 with `fuseMs` 100000; part of the base batch overlapped another lane's job on the same core
(wall time only; fuse 0 and the 24 identical hashes show play was not affected).
Not done: no build, no bundle, no identity or T-F2 run, no official result; the re-open delay of a house bot (question
2) is not measured anywhere; the simulator's seeds and house roster are not the official ones.
