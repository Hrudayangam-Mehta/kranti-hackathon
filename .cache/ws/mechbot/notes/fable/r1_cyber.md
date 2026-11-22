# Fable panel, round 1: cyber / red-team analyst (expert 2 of 5)

Written Sun 22 Nov, about 00:45-01:05 UTC. Scope: our own bot code (r7work/ckpt_07_LG/lib, read only), the published
kit, our own notes about the house bots. No game server, no other team's code. Scratch: fable_work/r1_cyber/.
Tags: [M] official score, [R] measured in the house replay / kit stream (forensics, housebot_model.json),
[S] simulator (behaviour only, ranks nothing), [C] read in our code, [A] my inference.
Base assumed: FSL10 s1 = 5.35 (3aacfa3): final-safe SELECT + loseCover near + lcLowHpf 0.10, salt 1.

## 1. What the evidence says about the squad (the regularities worth exploiting)

1. **Regeneration is symmetric and the squad wins that race [R + A].** Regeneration (45 hp/s) starts after 5 s with no
   damage taken AND no damage dealt to a mech. A hunter that is shooting us never regenerates. The moment we break
   every line (LOSING retreat, HEAL), each wounded hunter stops dealing damage and starts its own 5 s clock. Two
   wounded hunters regenerate 90 hp/s against our 45, and shared vision brings them to us before our clock finishes.
   This is the mechanism behind every official step so far: LC +0.06, low15 +0.02, low10 +0.04, cover 2.0 -0.02,
   healDoc on -0.21, lastStand 0.35 -0.06 (a doomed stand earlier is also a "stop the kill in progress" change).
   Prediction: every further cut in line-breaking time is non-negative until the limit; every rise is negative.
2. **The official game has out-of-contact gaps at 55-80% hp that the simulator lacks [M].** healDoc 'on' (enter
   0.55 -> 0.70, exit 0.70 -> 0.80) changed 0 local decisions and cost 10 kills officially. So the HEAL entry is
   reached officially, more than in the simulator (HEAL is 1% of sim time). The heal family is the only place where
   an official effect of size 0.2 has been seen; its mirror image is untested.
3. **Deltas inside the LC family are 1-3 kills in 48 matches [M]** (5.27 / 5.29 / 5.31 / 5.33 / 5.35). These steps
   touch very few matches: low divergence, monotone so far. That is the cheap ladder; climb it to its end.
4. **Fixed windows per hunter [R]:** first shot 0.25-1.15 s after a line opens; 12 rounds in 3.3 s then 2.4 s
   silent, never an early reload; house laser 2.4 s between beams; no reaction to our charge; never retreats.
   All already used by existing code (fightLegs `reloading`, D4 charge step, bullet dodge). No unused params-only
   lever was found here: `io: 'reload'` gains one tick per 5.7 s cycle and re-rolls every match (not proposed).
5. **Lightning is the squad's highest damage rate and our SQUAD posture ignores it [C + S].** 60 per 0.25 s =
   240 hp/s inside 45 m (gun: 150 x hit rate); 100 energy = 33 zaps = 1980 hp, more than our 1400. The keep-out
   (brain.js line 462, 50 m from a carrier) and nothing in selectTarget's 'mult' score are active in SQUAD: line 462
   is `ffa &&`. In the 36-seed base sweep 8 deaths are by lightning, with 2.88 kills on average against 4.39 in the
   other 28. Official causes of death are unknown to us, so this is [S] only.

## 2. Failure modes found in our own code

- **F-A, firewall ratchet [C].** `hunt.firewall()` needs `B.foreignDeaths < 1`; stance.js line 36 sets
  `foreignDeaths = max(foreignDeaths, (alive0 - alive) - ourKills.size)` and never lowers it. One house death that
  is not credited to us by a `kill` event (drone, zone, mortar self-hit, or the alive count arriving one observation
  before the kill event) switches LC, low10, any70f and the seek off for the rest of that match; three such deaths
  before 200 s latch the FFA posture in a practice match. The simulator shows 0 cases (firstForeignTick -1 in all
  36), and the brain processes events before the count in the same decision (brain.js 649-662), so it is safe if the
  server puts both in one observation. Not testable without the server. No change proposed (the ratchet is the
  final's protection); listed so the team knows that every kept climb step is conditional on it.
- **F-B, lightning blind spot in SQUAD** (item 5 above).
- **F-C, heal entry is not behind the firewall [C].** decideMode line 472 reads healEnterHp in every posture; in
  FFA the `hpf < 0.7` clause dominates, so a LOWER healEnterHp is inert in forced FFA but acts in the final's
  pre-latch seconds. Same class as healDoc itself; T-F2 must show it (the plan already says so).
- **F-D, not final-safe as plain overrides [C]:** wStick, keepTargetHpf, finishHpf, finishThreats, lose1/2/3Hpf,
  healAfterLoseS, lastStandHpf are read in FFA too. Use them only for a practice-only line or gate them in code.
- **F-E, unconverted damage [S].** Base sweep: 7154 damage dealt per match, 1764 per kill; about 1000 hp per match
  (0.7 of a kill) is in mechs still alive when we die; 11.3 target switches and 9.4 torso vetoes per match against
  4.06 kills. Part is unavoidable (the kill in progress at death).

## 3. Proposals (at most five), in my order

### C1. Heal mirror first: `healDoc: 'low'` (F3, already built), then `'lowx'`
- Param: `healDoc: low: { healEnterHp: 0.40 }` (exists in F/bot). New value for the follow-up:
  `lowx: { healEnterHp: 0.40, hfExit: 0.55 }` (hfExit is the SQUAD-only HEAL exit, decideMode line 460; the FFA exit
  stays max(healExit, ffaHealExit)). Code sites: tactics.js decideMode lines 460 and 472. No code edit.
- Mechanism: section 1 items 1 and 2. HEAL holds fire (line 500) and hides for 5 s + (exit - hp) x 31 s; hunters
  regenerate in the same window. The opposite move is the largest official loss on record.
- Expected: the mirror of -0.21 is not +0.21 (losses are easier than gains), but this is the one direction with a
  measured official lever: +0.04..+0.12 [A]. Divergence class: low-medium (the opposite change moved about 10 kills).
- Order: move F3 from slot 3 to slot 1. If F3 > base, draw `lowx` next; if F3 < base, drop `lowx`.
- Test: T-F2 (HOLD at hp 0.50 and at 0.60 in HEAL: acts in SQUAD, identical in forced FFA); identity at 'off'.
  The simulator said -5 for HE40 on 3 matches; it also said 0 for healDoc 'on'. It does not see this regime.

### C2. Finish the LC ladder on the 5.35 base, one rung per slot, instead of F1 'oneHit'
- Params (new values of `loseCover`, all with loseCoverNear true): `c05l10: { lcCoverS: 0.5, lcLowHpf: 0.10 }`,
  `c0l10: { lcCoverS: 0, lcLowHpf: 0.10 }`, `never` (F2: 0 / 0). Site: tactics.js losing() lines 393-396.
- Why not F1: 'oneHit' raises lcLowHpf to 0.23 while the official trend on that key is monotone the other way
  (0.25 -> 0.15 -> 0.10: +0.06 in total). F1 mixes one step with the trend (cover 0) and one against it (0.23).
- Mechanism: item 1. A retreat to cover 1.5 s away at hp > 10% buys no regeneration (needs 5 s clean) and gives it
  to the hunters. Opus covers low10 + cover 1.0 and low05; the Fable line takes cover 0.5, cover 0, then never.
- Expected: +0.02 per kept rung, 1-3 kills moved each [M pattern]. Divergence class: low (best kind for a 5.35 base).
- Stop rule: the first rung that scores below its base ends the ladder (the limit is found); do not skip rungs.
- Test: BUILD_LOG decision table extended (cover 5 m / 8 m / 30 m at 50%, 21%, 9% hp); T-F2 as for 'never'.

### C3. Lightning carriers first: TESTED LOCALLY, NOT PROPOSED FOR A SLOT
- Code tried (fable_work/r1_cyber/lib, default inert, sim seed 1 hash identical to ckpt_07_LG): tactics.js selectTarget,
  'mult' branch, after `if (me.laser && tr.hasMortar) s *= 1.15`:
  `if (!ffa && P.sqLightPrio > 1 && !tr.npc && tr.hasLightning && tr.dist < P.sqLightR && B.hunt && B.hunt.firewall()) s *= P.sqLightPrio`
- Idea: a carrier inside 45 m out-damages two gun hunters and never backs off; shoot it while it crosses 45-90 m.
- Result (section 4): on the base's lightning-death seeds the cause of death stayed lightning in every run and net
  kills did not rise. Target priority alone is not the defence. A real fix would be a SQUAD keep-out leg (the FFA
  rule of brain.js line 462 without `ffa &&`, plus backing off from a carrier that is not the target): 10-20 lines in
  fightLegs, high divergence, and "back off" runs against the official trend. Hold for a fresh-salt base, if ever.
- Kept in the memo as a refuted idea so nobody spends a slot on it.

### C4. Keep F4 (any60f) but only after C1 reads
- F4 acts exactly in the regime healDoc exposed (out of contact at 60-70% hp): today we idle there (no new target
  under aggrHpf 0.7, no seek under h50SeekHpf 0.7). If C1 gains, the gap regime is real and "fight in it" (F4) is
  the consistent next step; if C1 is flat, F4 is most likely an exact tie (KB s0 = KS s0 showed the 0.9 -> 0.7 step
  changed no score) and the slot is better spent on a C2 rung.
- No new build. Divergence class: low. Test: as in BUILD_LOG.

### C5. Hold (do not build tonight): target stickiness for SQUAD
- F-E suggests about 0.7 of a kill per match is left in living mechs. A SQUAD-gated `wStick` 1.3 -> 2.0 or a torso
  veto that keeps targets under 40% (fcVetoHpf logic for 'mult') would need code in selectTarget and touches most
  matches (high divergence, full re-roll on a lucky base). Worth it only on a fresh-salt base (F6), never on salt 1.

## 4. Simulator note (behaviour only)
Sweep on core 2 with the C3 patch (sqLightPrio 3, R 90) on the 5.31 base settings (lcLowHpf 0.15), compared with
fable_work/sim/base: the eight base lightning-death seeds plus seed 1. Stopped after 9 seeds (machine at load 18);
raw files in fable_work/r1_cyber/sim/LT3, runner fable_work/r1_cyber/run.sh.

| seed | base: kills, cause, alive | LT3 (sqLightPrio 3, R 90): kills, cause, alive | decisions | time fuses |
|---|---|---|---|---|
| 1 | 7, laser, 85 s | 7, laser, 85 s | same | 2 |
| 5 | 3, lightning, 79 s | 3, lightning, 73 s | differs | 8 |
| 7 | 2, lightning, 41 s | 0, lightning, 43 s | differs | 5 |
| 13 | 3, lightning, 73 s | 2, lightning, 62 s | differs | 3 |
| 16 | 2, lightning, 36 s | 2, lightning, 36 s | same | 1 |
| 20 | 3, lightning, 77 s | 4, lightning, 84 s | differs | 0 |
| 30 | 5, lightning, 64 s | 4, lightning, 62 s | differs | 0 |
| 31 | 4, lightning, 57 s | 5, lightning, 59 s | differs | 3 |
| 36 | 1, lightning, 29 s | 1, lightning, 29 s | same | 1 |

Read: 9 seeds done, net -2 kills, and the cause of death did not change in any of them: the cheap form of C3 (target score only) does NOT
remove lightning deaths in the simulator. Time fuses (decisions over budget on a loaded machine) are non-zero in some runs, so single-seed
differences are soft. Verdict: C3 as written is refuted locally; it gets no slot.

## 5. Changes to FABLE_PLAN I ask the moderator for
1. Order: F3 (heal 'low') first; then C2 rung 1 (`c05l10`); then F2 or the next rung by the stop rule; F4 only if F3
   gained; F6 (fresh salt) last as planned.
2. Replace F1 'oneHit' with the C2 rungs (same key, same code site, no extra gate work beyond the decision table).
3. Rebuild every Fable build on the 5.35 base (lcLowHpf 0.10): F3 / F4 in BUILD_LOG still carry 'low15'.
4. No slot for C3 (refuted locally) or C5 (high divergence). Four live items: C1, C1 follow-up `lowx`, C2 rungs, C4.
