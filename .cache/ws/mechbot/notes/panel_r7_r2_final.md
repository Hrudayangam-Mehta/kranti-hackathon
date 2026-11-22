# Panel R7, round 2: free-for-all final strategist (role id `final`)

Written 21:47-22:15 UTC Sat. Read: brief, moderator digest, r1 game / stats / eng / psych / stress, sota bestof / engage /
exploit / risk (final-related parts in full, the rest by section), `bot/lib/{stance,ffa,tactics,hunt,params}.js`,
rules_audit L9-L10, build_r7a_log. Scratch and raw outputs: `tools/panel_r7/r2_final/`. Sim use: 7.5 CPU-minutes on core 2,
behaviour and failure modes only. No sub-agents, no web search (nothing here depended on outside literature).
Tags: [M] official, [T] top bot's choice, [S] our simulator, [A] arithmetic / code reading, [N] no evidence.

## Step 1. Objective in numbers

- Practice: best 5.19 (KS). Cut 5.4 now, 5.6-5.8 expected at close (Sun 16:00, last safe slot 15:15). About 103 slots left.
  Needed true mean about 5.3 (cut 5.6) to 5.5 (cut 5.8); the family's true mean is about 5.0 [M, A stats/bestof].
- The final only exists for us if the nominated commit's own score clears the cut. So the final bundle may cost
  **zero practice slots, zero practice points and under 45 engineer-minutes**, and must come after the practice arms.
- Final format [rules_audit L9]: 32 teams, 16 qualifying 16-mech FFA matches, top 16 by mean (16 - place) advance, then a
  64-match series, winner takes all. FFA mean is 7.5 per match, per-match sd about 4.6, so the 16-match standard error is
  about 1.1: we need an FFA mean near 9 to pass qualifying with good odds. Our sim FFA against house bots gives KS
  11.0-12.5 [S], which is not calibrated to finalists (practice ranks 1-4 placed 6th-12th in showdowns [L psych S04]).
- The final may change the map folder, balance and zone schedule. The currently entered KS commit is R4a code without
  RB2-RB6, so its clock and radius literals are wrong on a changed schedule [A]. **The port of the leader to RB code is
  worth more in the final than any FFA rule.**

## Step 2. Claims, steelman, refutation, verdict

| # | Claim (source) | Steelman | Attempt to refute | Verdict |
|---|---|---|---|---|
| C1 | 62 m calm-mech bubble, `ffaProx` [45,60,75] -> [62,62,75] (psych F1) | giddy engages inside 60 m, kyoto inside 55 m [T]; deaths per minute 0.36 with nobody within 60 m, 2.02 with one [L S03] | Our time inside 60 m of calm mechs is unmeasured; `prox` only filters posts, roam points and loot goals, not zone or hide goals. 2 m of margin is 0.1 s of mutual walking (2 x 11.7 m/s) | **Accept, as params only, with a wider margin [70,70,80].** Sim: squad per-match identical 24/24, FFA 32 matches 10.97 -> 10.84 (noise), errors 0 [S]. Skip the extra goal-filter code |
| C2 | `ffaWoundTgt` 0.5 -> 0.35 (exploit E5) | Truel theory: do not help the healthier duellist | `ffa.firstShotOk` returns true first for any mech at hp <= `ffaFinishHpf` 0.4 (rule 8), with no wedge, range or cover test. With 0.35 < 0.4 both the D11 branch and rule 3 become dead code; the only real change is "no third-party shot on mechs at 40-50%" [A, ffa.js 290-305] | **Reject as specified** (near no-op, loses the cover-gated 40-50% shot). Not worth a line |
| C3 | `risk: 'ffa'` schedule by alive count (risk memo, game) | Theory fixes the sign; zero practice cost | About 25 new lines scaling six thresholds; no FFA measurement [N]; the existing code already has the two ends (ffaQuietS 90, ffaThree, ffaTwo, ffaHideHpf, heal entry 0.7) | **Veto as new code** (doctrine: do not over-code). Its one cheap part is `ffaHealExit` 0.9 -> 1.0 (C4) |
| C4 | `ffaHeal: '100'` = `ffaHealExit` 1.0 (spec R6 item F, owner's full-heal disengage) | Quiet variants win FFA rooms 10.75 v 9.33 [L S08]; in FFA waiting pays because others die | Longer heals near the shrinking zone; sim shows no failure (alive 129.7 -> 127.7 s, zone deaths 0, 32 matches) [S] | **Accept** (param only; `tactics.js:390` already takes the max) |
| C5 | `ffaOpenGuard` + earlier beam-clue latch (psych F3) | The field turns hostile-only 0.5 s after the first death [T]; we stay a practice killer until 3 deaths | (a) After one foreign death KS already drops hunt and seek (firewall `h50ForeignMax` 1) and the opening guard reverts to `openingS` 40 s [A]. (b) In sim FFA the 3rd foreign death comes at 22-36 s, always before 40 s, so the gap is empty in a brawling field [S, 16/16]. (c) A latch at 1 death is **not practice-inert**: 6 of 144 sim squad matches have one house death that is not our kill (t = 11-53 s) [S]. (d) Beam clue: 45 min of code for at most 5 s | **Reject the guard and the beam clue.** Keep `beamClue: 'off'`. See C6 for the one-number alternative |
| C6 | Latch on a fixed 3 deaths before 200 s may never fire in a slow field (stress F7) | If it never fires, every FFA rule stays off and we keep squad aggression all match: the worst final outcome | Showdown data say the bottom half lives 27 s [L S01], so 3 deaths by 200 s is near certain. Phantom deaths: exactly one in 4.2% of sim squad matches, two in 0 of 144; stress saw 0 latches in 168 at 3 | **Optional, one number: `ffaLatchDeaths` 3 -> 2.** Sim: latch 4 s earlier (median 27.9 -> 24.5 s); squad 0/144 with 2 phantoms. Placement value [N] (sim 12.5 -> 11.9, n = 16, unpaired noise). The only bundle item that could act in practice, so it is the first to drop if the identity draw fails |
| C7 | Death-sound clock (psych F4), dark at 4-5 alive (F5), common-target rules (F6) | kyoto takes 56 of 84 cubes within 8 s of its kills [T] | 15-20 min each of new FFA code, each [A] small, none testable before the final | **Veto for this event** (three weak items) |
| C8 | Veto `ffaHunt: 'h50'` (psych F2) | Retaliators with long memories; placement not kills | none found | **Agree.** Hunt and seek stay behind the firewall |
| C9 | Hunt / seek firewall holds (exploit E6) | `hunt.js:29-32` requires SQUAD posture, 0 foreign deaths, not late zone, more than 3 alive | The new `aggr` presets (h70, h70g, any70) are not built yet; if their candidate clause lacks the same firewall, the final has us attacking every listed mech after the field has gone calm, or all match if `!ffa` is missing [A] | **Binding test T-F2 below** on every practice preset in the nominated SELECT |
| C10 | Split type-B values into SQUAD and FFA values (stats ask) | Practice-best values should not set the final's play | Five new keys and presets; none has FFA evidence either way | **Reject** (over-coding). Keep the one that exists (`laserRangeFfa`) at its current value |
| C11 | Late-zone goal can be unreachable: pinned, death in zone at full hp (stress F1, ZG1) | 1 of 60 late runs pinned 30 s; 31.6% of final points sit on a prism [S]; the final's lives span all six phases | Practice never reaches it (0 of 120 past 265 s), so it cannot be scored officially | **Accept as the only code item**, after the practice arms, if 25 minutes are free before the freeze |
| C12 | One-volley guard (`h70g`) never binds in practice, binds in the final (engage E2) | Finalists' lasers are accurate: one rear laser is 472 hp [A] | Needs three laser lines at once to bind | **Agree:** if h70 and h70g are within noise in practice, nominate the `h70g` form |

Extra finding for the practice panels [S]: in about 4% of sim squad matches one house bot dies without our kill event
(t = 11-53 s). In those matches KS loses seek for the rest of the match and its opening guard returns to 40 s. Seeds:
115, 118, 126, 148, 184 of 101-220, and 13 of 1-24. Worth one look by the engineer (NPC kill, or a kill event we miss).

## Step 3. Answer to the open question

**Goes into the nominated build (the final-only bundle "FB"), all plain params in `PARAMS` of `bot/lib/params.js`:**

1. `ffaProx: [70, 70, 80]` (was [45, 60, 75]).
2. `ffaHealExit: 1.0` (was 0.9), as the spec's `ffaHeal: '100'` preset.
3. Optional: `ffaLatchDeaths: 2` (was 3).
4. Code, only if time allows: stress ZG1 in `mover.js` `zoneGoal` (reachable late-zone goal).
5. Already on and kept: `ffaRules`, `ffaCounters`, `ffaDropGate`, `finalPoint`, `ffaTwo`, `ffaThree`, `ffaGate`, RB2-RB6,
   IO7, IO8. Kept off: `beamClue`, `gunlessClue`, `cxBrawler`, `ffaHunt`.

**Rejected:** `ffaWoundTgt` 0.35, `risk: 'ffa'`, `ffaOpenGuard`, the beam-clue latch, the death-sound clock, F5, F6, the
SQUAD/FFA split of type-B values.

**Must be proven practice-inert:**
- Items 1 and 2 are read only while `B.env === 'FFA'`; they are inert unless the latch fires in practice (0 of 168 + 144
  sim squad matches at 3). Local proof: the 14 R3a2 identity streams byte-identical with FB on and off.
- Item 3 can act in practice (two phantom deaths). It needs the **official identity draw**.
- The identity draw costs no extra slot: it is the port the stats memo already requires (leader presets + salt on the
  final code must reproduce the leader's score exactly, e.g. KS salt 0 = 5.19 = 249/48).

**Interaction with the doctrine:**
- Before the latch (about the first 25 s of a final) we cannot tell the final from practice, so the practice doctrine
  runs unchanged: seek the maximum reward at hp >= 70%. That is what all 31 other practice killers do too [T].
- After the latch the reward changes from kills to others' deaths. "Maximum reward at hp >= 70% with no lethal volley"
  then means: loot and crates outside every calm mech's bubble, finishes at 40% or less, duel survivors, kill piles. It
  does not mean healthy mechs. "Otherwise heal" is already the FFA rule (enter below 70%, `tactics.js:398`); item 2 makes
  the exit full hp, as the owner asked.
- The doctrine's 70% gate and the one-volley guard need no FFA variant. Nothing in FB adds a second strategy.

**Latest freeze:** FB frozen **Sun 12:30 UTC**, packaged and gated by 12:40, port draw in the 12:44 slot, 15 slots left for
eligible salts, nomination 15:20-15:40. **Recommended: do not wait.** Items 1-3 are three numbers: put them into the next
build checkpoint tonight, so every draw from then on is already on the final code and no later port is needed. ZG1 joins
by the 09:00 SQUAD code freeze or is dropped.

## Step 4. Recommendations (ranked)

| # | Site and change | Expected final delta per match | Minutes | Failure mode | Test |
|---|---|---|---|---|---|
| 1 | **Firewall test T-F2 for every practice preset in the nominated SELECT** (seek, `aggr` h70 / h70g / any70, LX, FIN, ISO, LC, LG, AVO): (a) with `env: 'ffa'` forced, preset on v off byte-identical on the FFA-inert set; (b) SQUAD posture with `B.foreignDeaths = 1`: no non-hostile candidate from the preset. Site: the `aggr` clause in `tactics.selectTarget` must reuse `hunt.js` `firewall()` | avoids -1..-3 [A] (attacking a calm field all match) | 15 | A preset fails (b): gate it, do not drop the test | Local only; no slot |
| 2 | **FB items 1 + 2** (`ffaProx` [70,70,80], `ffaHealExit` 1.0) in the next checkpoint, default on | +0.2 (0..+0.5) [A, T, L] | 5 | Fewer loot goals in crowded phases; long heals at the zone edge. Sim: none seen in 32 FFA matches | T-F1 local: 14 identity streams identical; sim FFA 411-442 errors 0, zone deaths 0. Official: the port draw (rec 5) |
| 3 | **Nominate only RB-code entries** (RB2-RB6, `hello.map.files` loader). The entered KS commit is a fallback only | large if the final changes schedule or map [A]; 0 otherwise | 0 | The port fails to reproduce | Rec 5 |
| 4 | **`ffaLatchDeaths: 2`** (optional) | +0.05 (-0.1..+0.3) [S timing, N value]; insurance against a slow field (stress F7) | 2 | Two phantom deaths latch FFA in a practice match (sim 0/144; one phantom 4.2%) | Rides the port draw; drop it first on a mismatch |
| 5 | **Port draw = identity draw**: first slot after the checkpoint with FB, the leader's exact presets and salt (now KS salt 0). Must score exactly the leader's score | proves FB costs practice nothing | 0 extra | Mismatch of 1/48 or more: remove item 3, repeat once; a second mismatch means IO8 or RB changed practice play, an engineering fault, not an FB fault | One slot that the stats plan already holds (P0). From then on every draw is eligible |

ZG1 (stress F1) is the sixth item if 25 engineer-minutes are free before 09:00 Sun: +0.02..+0.05 per final match [A stress].

## Step 5. Self-critique

- My top recommendation (the firewall test) is wrong only if the engineer has already built `aggr` inside the firewall;
  then it costs 15 minutes for nothing. Cheapest check: read the `aggr` clause when checkpoint 3 lands.
- FB's value is unmeasurable before the final. If finalists rush instead of standing off, a 70 m bubble and full heals
  cost loot and tempo. The hedge is that nothing in FB removes our answer to a mech that attacks us.
- The 4.2% phantom-death rate is a sim number. If the official game has none, latch at 1 would be free; I cannot know,
  so I stay at 2.
- The sim league is house bots that shoot on sight. It says nothing about a calm field; all placement numbers above are
  failure-mode checks, not rankings.
- I did not read the round-2 memos of the other roles (they appeared while I worked).

## Summary for the moderator

1. The final only matters if the nominated commit clears the cut: the final bundle must cost no slot, no practice points
   and under 45 engineer-minutes. Format: 16 qualifying FFA matches (top 16 of 32 advance, s.e. about 1.1), then 64.
2. **Final-only bundle FB = three numbers** in `params.js`: `ffaProx` [70,70,80]; `ffaHealExit` 1.0 (`ffaHeal '100'`);
   optional `ffaLatchDeaths` 2. Plus stress ZG1 (late-zone goal) only if 25 minutes are free before 09:00.
3. Sim checks [S]: FB items 1-2 leave 24/24 squad matches identical per match; FFA 32 matches 10.97 -> 10.84, errors 0,
   no zone deaths. Outputs in `tools/panel_r7/r2_final/`.
4. **Rejected:** `ffaWoundTgt` 0.35 (rule 8 already allows any shot at <= 40% hp, so 0.35 turns rule 3 and D11 into dead
   code); `risk: 'ffa'` (25 new lines, [N]); `ffaOpenGuard` and the beam-clue latch; death-sound clock; F5; F6; the
   SQUAD/FFA split of type-B values; `ffaHunt`.
5. Why no open guard: after one foreign death KS already drops hunt/seek and returns to the 40 s opening guard, and in
   sim FFA the 3rd death comes at 22-36 s (16/16). A latch at 1 is not practice-inert: one house death that is not our
   kill occurs in 6 of 144 sim squad matches (two: 0 of 144).
6. **Top action, no slot: firewall test T-F2** on every practice preset in the nominated SELECT, above all the new
   `aggr` presets: forced FFA on v off byte-identical, and no non-hostile candidate once `foreignDeaths >= 1`. An
   unfirewalled `any70` would attack a calm field for the whole final match (-1..-3 per match [A]).
7. Nominate only RB-code entries; the entered KS commit (R4a code, fixed clock literals) is the fallback.
8. **Identity draw = the port draw** the stats plan already holds: leader presets + salt on the code with FB must score
   exactly the leader's score (KS salt 0 = 5.19). On a mismatch drop `ffaLatchDeaths` 2 first and repeat once.
9. **Freeze:** latest Sun 12:30 UTC (gate 12:40, port 12:44, nomination 15:20-15:40). Recommended: FB into the next
   checkpoint tonight, so every later draw is eligible and no second port is needed.
10. Doctrine: unchanged before the latch (the final cannot be told from practice for about 25 s). After it the maximum
    reward is placement: loot outside bubbles, finishes at <= 40%, duel survivors; heal from 70% to full. No new strategy.
11. If h70 and h70g are within noise in practice, nominate h70g (the one-volley guard binds against finalists' lasers).
12. For the practice panels: in about 4% of sim squad matches a house bot dies without our kill event at 11-53 s; KS then
    loses seek for the match. Seeds 13, 115, 118, 126, 148, 184. Engineer: NPC kill or a missed kill event?
13. Question for the engineer: is the `aggr` clause inside `hunt.js` `firewall()`?

Memo: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r2_final.md
