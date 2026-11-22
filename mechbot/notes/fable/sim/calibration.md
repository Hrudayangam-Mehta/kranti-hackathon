# Simulator calibration against official paired steps (calibration analyst, Fable panel, target 9)

Written Sun 22 Nov, about 01:30-02:50 UTC. One author, no sub-agents; not an independent review. No git, no game server,
nothing edited outside `notes/fable/sim/` and `scratchpad/fable_work/simcal/`. Tags: [M] official, [S] simulator,
[C] computed from those, [H] judgement. Unit: kills = official score x 48 (one kill = 0.021).

## 0. Verdict
1. [C] **The simulator cannot rank changes of the size we have submitted.** 29 official paired steps simulated over 48
   paired seeds each: sign agreement 12 of 24 (one-sided p 0.58), Spearman -0.03 (permutation p 0.57). Behaviour steps
   alone: 10 of 19, Spearman -0.01. Steps with |official| >= 5 kills: 6 of 14, Spearman +0.06 (p 0.42).
   Pearson is +0.35 (p 0.04) but rests on one point (fight-early off: official -18, simulator -35 +- 16).
2. [C] **This test could not have passed.** At 48 seeds the simulator's own standard error is 8-18 kills on a behaviour
   step; the official deltas are 0-20 kills and are themselves single draws with a re-roll noise of about 6-8 kills.
   A simulator that was exactly right about every mean effect would be expected to score sign 0.56-0.65 and
   Spearman 0.1-0.3 on this set at this seed count (section 3). So the result does not show the simulator is wrong
   in sign; it shows that neither it nor a single official slot resolves effects below about 15 kills (0.3 score).
3. [S] **House-table tuning fixed the level and nothing else.** Weakening the easy and medium tiers (table `e2`,
   `house_params.json`) moves KB salt 1 from 4.04 to 5.19 (official 5.23) and the seven KB-family builds to 5.13
   (official 5.15). On 9 steps re-simulated under it the agreement stays at chance: 5 of 8 signs, Spearman +0.12;
   held-out half 2 of 3 (default table 2 of 4). It also does not transfer across code families: the four C3 builds
   read 4.18 against 4.87 official. No tested table ranks changes.
4. [C] **What the simulator can be used for on the way to 9.** A path to 9 needs +174 kills (+3.6 score). Steps on
   such a path are +25 kills (+0.5) or more each. The simulator resolves that: paired sd per match is about 2.0-2.3
   score, so +0.5 is z = 3 at about 170-200 paired seeds, z = 4 at about 320. Rule in section 5.
5. [S] Two model errors that are larger than noise and should be kept in mind: the opening laser grab (LG wide) is
   +14 +- 8 (default) and +21 +- 9 (e2) in the simulator and -9 officially; and local divergence does not match
   official divergence (healDoc on differs in 3 of 48 simulated matches and costs 10 kills officially; any70 at salt 0
   differs in 15 of 48 simulated matches and changed the official total by exactly 0).

## 1. Calibration set [M]
31 paired steps (same salt, one change or one named bundle), from `submissions.md` and the folders
`variants/<name>` and `variants6/<name>` (each folder's `dist/bot.js` hash was matched to the submission table).
Definitions in `fable_work/simcal/steps.py`. 29 were simulated; `finThreats3` (+1) and `G10C10FT3` (0) were not reached (CPU, section 6) and carry no
information at |delta| <= 1. One consistent exact tie: `finHpf30` is 0 officially and differs in 0 of 48 simulated matches.

Family means (official, kills): seek on -1, +7, +11 (mean +5.7, sd 6.1); K0 items -5, +3, +10 (mean +2.7, sd 7.5);
any70 0, +5; hunt h50 -8, lite -20; heal healDoc on -10, healEnter 0.40 -3; LC gate (near +3, low15 +1, low10 +2,
cover 1.0 +1, cover 2.0 -1, never +1): +7 over six steps; other fight-on keys (oneHit -1, finishThreats +1,
finishHpf 0, lastStand -3, FIN -5): -8. Same-config salt re-draws: V4 247 / 225 / 243, KB 249 / 251 / 239,
KS 249 / 246, S 246 / 236: pooled per-draw sd 8.3 kills (0.17 score, 6 df), i.e. 1.20 kills per match within a seed.
The same change measured on three salts or bases spreads by 6-7.5 kills: as wide as the whole set (rms 7.4).

## 2. Simulation [S], default house table, seeds 1-48, paired by seed
Columns: official delta, simulated delta and its standard error in kills per 48 matches, z, seeds, matches that
differ, simulated mean score before and after.
```
step             fam       k  off     sim     se     z n diff  simA  simB
fightEarly_off   opening   B  -18   -35.0   15.6  -2.2 48  39  4.10  3.38
boost_off        boost     B   -7     8.0   18.2   0.4 48  30  4.10  4.27
retreat_d3       retreat   B    8     1.0    7.6   0.1 48  22  4.10  4.12
F02_bundle       bundle    B   -6     8.0   18.3   0.4 48  32  4.10  4.27
F03_bundle       bundle    B   -2     5.0   11.6   0.4 48  29  4.10  4.21
K0items_s0a      K0items   B   -5    -1.0   14.3  -0.1 48  33  4.12  4.10
hunt_h50         hunt      B   -8    -9.0   14.0  -0.6 48  34  4.12  3.94
hunt_lite        hunt      B  -20    -8.0   14.4  -0.6 48  37  4.12  3.96
seek_s0a         seek      B   -1    -8.0    9.9  -0.8 48  21  4.12  3.96
seek_s0b         seek      B    7    -5.0   15.3  -0.3 48  22  4.10  4.00
K0items_s0b      K0items   B    3     2.0   15.8   0.1 48  31  3.96  4.00
seek_s1          seek      B   11   -10.0    9.6  -1.0 48  18  3.85  3.65
K0items_s1       K0items   B   10    28.0   15.9   1.8 48  34  3.65  4.23
any70_s0         any70     B    0     1.0   12.2   0.1 48  15  4.00  4.02
any70_s1         any70     B    5    -9.0    4.2  -2.1 48   7  4.23  4.04
healDoc_on       heal      B  -10     2.0    2.5   0.8 48   3  4.04  4.08
FIN_ttk          finish    B   -5     2.0    3.8   0.5 48   3  4.04  4.08
LG_wide          lasergrab B   -9    14.0    8.3   1.7 48   8  4.04  4.33
LC_near          LC        B    3     3.0    5.8   0.5 48  16  4.04  4.10
LX_on            LX        B   -2    -4.0    4.0  -1.0 48   5  4.04  3.96
cover20          LC        P   -1     0.0    1.4   0.0 48   2  4.10  4.10
low15            LC        P    1    -1.0    2.3  -0.4 48   2  4.10  4.08
oneHit           fighton   P   -1    -1.0    1.0  -1.0 48   1  4.08  4.06
low10            LC        P    2     0.0    0.0   0.0 48   0  4.08  4.08
cover10          LC        P    1     0.0    0.0   0.0 48   0  4.08  4.08
finHpf30         fighton   P    0     0.0    0.0   0.0 48   0  4.08  4.08
lastStand35      fighton   P   -3     1.0    2.3   0.4 48   2  4.08  4.10
LC_never         LC        P    1    -1.0    1.0  -1.0 48   1  4.08  4.06
healEnter40      heal      P   -3    -1.0    5.2  -0.2 48   4  4.08  4.06
{'label': 'all', 'n': 29, 'sign': '12/24', 'sign_p': 0.581, 'spearman': -0.03, 'p_perm': 0.561, 'pearson': 0.346, 'p_pear': 0.038}
{'label': '|off|>=5', 'n': 14, 'sign': '6/14', 'sign_p': 0.788, 'spearman': 0.063, 'p_perm': 0.418, 'pearson': 0.352, 'p_pear': 0.11}
{'label': 'kind B', 'n': 20, 'sign': '10/19', 'sign_p': 0.5, 'spearman': -0.009, 'p_perm': 0.51, 'pearson': 0.351, 'p_pear': 0.064}
{'label': 'kind P', 'n': 9, 'sign': '2/5', 'sign_p': 0.812, 'spearman': -0.089, 'p_perm': 0.598, 'pearson': -0.196, 'p_pear': 0.74}
level: official mean 5.11 sim mean 4.03  alive 73.8s  n=32  level corr (pearson) 0.37
```
Level: 31 official builds average 5.10; the simulator gives 4.03 (mean life 74 s). The simulator is 1.07 low.
Chaos: within-seed sd across salts is 1.65 (V4, three salts) and 1.39 (KS, two salts) kills per match in the
simulator against 1.20 officially: same order, the simulator slightly noisier.

## 3. Noise ceiling [C] (`noise.py`)
Null model: a step that touches m of 48 matches (m taken from the simulator's divergence count) and has no mean
effect moves the official total by sd 1.20 x sqrt(m (2 - m/48)).
```
V4 (C3) [247, 225, 243] sd 11.7
KB [249, 251, 239] sd 6.4
KS [249, 246] sd 2.1
S [246, 236] sd 7.1
pooled official per-draw sd 8.3 kills (0.173 score), df 6; per-match within-seed sd 1.20 kills
sim ['V4', 'V4salt1', 'V4salt2'] totals [198, 185, 173] within-seed sd 1.65 kills per match (n=48 seeds)
sim ['KS', 'KS_s1'] totals [192, 203] within-seed sd 1.39 kills per match (n=48 seeds)
replicates: seek [-1, 7, 11] K0items [-5, 3, 10] any70 [0, 5]
official deltas: rms 7.2 kills; null (pure re-roll, m from sim divergence) rms 5.6 kills; ratio obs/null variance 1.64
 kind B n 20 obs rms 8.6 null rms 6.7
 kind P n 9 obs rms 1.7 null rms 2.1
true effect sd  0 kills (behaviour steps): perfect simulator sign 0.50 spearman 0.00 | perfect model at this run's seed count: sign 0.50 spearman 0.00
true effect sd  3 kills (behaviour steps): perfect simulator sign 0.66 spearman 0.38 | perfect model at this run's seed count: sign 0.57 spearman 0.12
true effect sd  6 kills (behaviour steps): perfect simulator sign 0.76 spearman 0.62 | perfect model at this run's seed count: sign 0.65 spearman 0.31
true effect sd 10 kills (behaviour steps): perfect simulator sign 0.83 spearman 0.78 | perfect model at this run's seed count: sign 0.74 spearman 0.52
```
Reading: behaviour steps have official rms 8.6 against 6.7 expected from re-rolls alone, so the real mean effects
have an sd of about 5 kills (0-8 is compatible). With that, a perfect simulator with unlimited seeds would reach sign
0.72 and Spearman about 0.55; a perfect model run at 48 seeds, 0.62 and 0.25. With 29 steps the standard error of
Spearman is 0.19, so the observed -0.03 is 1.5 sd below a perfect model and 0 sd from a useless one. The set cannot
tell them apart. To do so the simulator's standard error must be near 3 kills per step: about 600-1000 paired seeds
per behaviour step (about 25 steps, 30,000 matches, 8-10 core-hours on a quiet core).

## 4. House-table tuning with a held-out check [S]
Tables tried on KB salt 1, seeds 1-48 (official 5.23): default 4.04 (per-match sd 2.29, life 73 s); `e1` (easy tier:
aimSigmaDeg 8, fireProb 0.15, reactionS 3.0, lead 0.2) 4.69; `e2` (e1 plus medium tier: aimSigmaDeg 3.5,
fireProb 0.35, reactionS 1.6) 5.19 (sd 3.17, life 85 s). `l1`, `h05`, `e2l1` (squad lostAfterS 3 / reassignS 6,
huntersPerKill 0.5) were prepared and not run. `e2` was chosen on the level alone, before any delta under it was seen.
Split declared before the `e2` deltas were read: FIT = fightEarly, hunt lite, healDoc, LG, LX;
TEST = retreat d3, any70 s1, FIN, LC.
```
default steps available 9
  FIT  sign 3/5  pearson +0.54  spearman +0.60  mean|sim-off| 13.2 kills
  TEST sign 2/4  pearson -0.32  spearman -0.60  mean|sim-off| 7.0 kills
  ALL9 sign 5/9  pearson +0.40  spearman +0.15  mean|sim-off| 10.4 kills
     fightEarly_off  off  -18  sim  -35.0 +- 15.6  diff 39/48  FIT
     hunt_lite       off  -20  sim   -8.0 +- 14.4  diff 37/48  FIT
     healDoc_on      off  -10  sim    2.0 +-  2.5  diff 3/48  FIT
     LG_wide         off   -9  sim   14.0 +-  8.3  diff 8/48  FIT
     LX_on           off   -2  sim   -4.0 +-  4.0  diff 5/48  FIT
     retreat_d3      off    8  sim    1.0 +-  7.6  diff 22/48  TEST
     any70_s1        off    5  sim   -9.0 +-  4.2  diff 7/48  TEST
     FIN_ttk         off   -5  sim    2.0 +-  3.8  diff 3/48  TEST
     LC_near         off    3  sim    3.0 +-  5.8  diff 16/48  TEST
e2 steps available 9
  FIT  sign 3/5  pearson +0.18  spearman +0.00  mean|sim-off| 16.4 kills
  TEST sign 2/3  pearson +0.25  spearman +0.60  mean|sim-off| 9.8 kills
  ALL9 sign 5/8  pearson +0.21  spearman +0.12  mean|sim-off| 13.4 kills
     fightEarly_off  off  -18  sim  -28.0 +- 21.3  diff 38/48  FIT
     hunt_lite       off  -20  sim    7.0 +- 16.8  diff 33/48  FIT
     healDoc_on      off  -10  sim   -1.0 +-  7.4  diff 5/48  FIT
     LG_wide         off   -9  sim   21.0 +-  8.9  diff 10/48  FIT
     LX_on           off   -2  sim   -8.0 +-  8.8  diff 14/48  FIT
     retreat_d3      off    8  sim    4.0 +-  5.7  diff 23/48  TEST
     any70_s1        off    5  sim   17.0 +- 11.0  diff 9/48  TEST
     FIN_ttk         off   -5  sim    0.0 +-  4.7  diff 8/48  TEST
     LC_near         off    3  sim  -15.0 +-  9.1  diff 21/48  TEST
```
```
step             fam       k  off     sim     se     z n diff  simA  simB
fightEarly_off   opening   B  -18   -28.0   21.3  -1.3 48  38  4.25  3.67
retreat_d3       retreat   B    8     4.0    5.7   0.7 48  23  4.25  4.33
hunt_lite        hunt      B  -20     7.0   16.8   0.4 48  33  4.33  4.48
any70_s1         any70     B    5    17.0   11.0   1.5 48   9  4.83  5.19
healDoc_on       heal      B  -10    -1.0    7.4  -0.1 48   5  5.19  5.17
FIN_ttk          finish    B   -5     0.0    4.7   0.0 48   8  5.19  5.19
LG_wide          lasergrab B   -9    21.0    8.9   2.4 48  10  5.19  5.62
LC_near          LC        B    3   -15.0    9.1  -1.7 48  21  5.19  4.88
LX_on            LX        B   -2    -8.0    8.8  -0.9 48  14  5.19  5.02
{'label': 'all', 'n': 9, 'sign': '5/8', 'sign_p': 0.363, 'spearman': 0.117, 'p_perm': 0.389, 'pearson': 0.213, 'p_pear': 0.292}
{'label': '|off|>=5', 'n': 7, 'sign': '4/6', 'sign_p': 0.344, 'spearman': 0.286, 'p_perm': 0.278, 'pearson': 0.436, 'p_pear': 0.167}
{'label': 'kind B', 'n': 9, 'sign': '5/8', 'sign_p': 0.363, 'spearman': 0.117, 'p_perm': 0.389, 'pearson': 0.213, 'p_pear': 0.292}
{'label': 'kind P', 'n': 0, 'sign': '0/0', 'sign_p': 1.0, 'spearman': nan, 'p_perm': 1, 'pearson': nan, 'p_pear': 1}
level: official mean 5.04 sim mean 4.78  alive 84.2s  n=11  level corr (pearson) 0.63
```
Result: on the fit half both tables score 3 of 5; on the held-out half default 2 of 4 and e2 2 of 3 (FIN is exactly 0
under e2). Nothing separates the tables and neither is better than a coin. `e2` reverses LC near (+3 official,
-15 +- 9) and any70 s1 (+5 official: default -9 +- 4, e2 +17 +- 11), so the sign of a simulated small step depends on
the house table: a further reason not to read small simulated deltas. Level transfer fails: under e2 the KB
family reads 5.13 (official 5.15) but V1 / V2 / V4 / HL read 4.25 / 3.67 / 4.33 / 4.48 (official 4.98 / 4.60 / 5.15 /
4.73). The table is fitted to one number and is delivered as a second world for robustness, not as a calibration.

## 5. Use on the way to 9 [H, from the numbers above]
- Do not use the simulator, under any table, to choose between builds whose simulated difference is under 0.4 score.
- Screen structural candidates only: keep a candidate if it is >= +0.5 score with z >= 3 on at least 200 paired seeds
  under the default table AND is not negative under `house_params.json` (100 seeds). Both tables, because a sign
  that flips with the house model is not knowledge.
- Confirm officially on two salts before building on it: one official draw has sd 0.17, so a +0.5 step is 2 sd on
  one salt pair and 2.9 sd on two.
- Earliest sign of failure for the target: if no candidate reaches +0.5 at z >= 3 in the simulator after the first
  full search round, the simulator contains no route to 9 and the search is exploring noise. Report that at once.
- Honest size of the gap: 9.0 is 432 kills over 48 matches; we are at 258. The simulator's best single match in 2,112
  was 15 and its mean is 4-5; the best simulated build mean in this run was 5.62 (K7LG under e2).
- Known wrong areas (do not trust simulated gains that come from them): opening loot / laser grab; anything that acts
  out of contact (heal, any70, seek): the simulated contact pattern differs from the official one in both directions.

## 6. Method, files, limits
- Runner: `fable_work/simcal/drv.py`, `q.py` (3 parallel jobs, `nice -n 19`), analysis `ana.py`, `noise.py`,
  `split.py`, step list `steps.py`, raw match records `out/<table>/<variant>.json`, outputs `final_*.txt`.
- The simulator is a copy (`fable_work/simcal/sim`). Two edits: `run.js` records the brain's fuse and overrun counters;
  `ourbot.js` passes `fuseMs: 1e12` to the brain. The machine ran at load 20-35 for the whole session and the 30 ms
  wall-clock fuse tripped in up to 5 of 48 matches per batch. With the fuse off a match no longer depends on load;
  20 of 20 matches were identical to fuse-0 records of the unedited brain, and 12 of 12 to an older stock run. The
  deadline argument only feeds a counter. Before this edit, matches with a trip were rerun one by one until fuse 0.
- Seeds 1-24 of K6LC, K6LX, K7LG, FSLC, FSLC20, FSLCL15 were taken from the existing `simt_*` folders (same bot
  folder, stock simulator, max decision time under 30 ms), seeds 25-48 run here.
- `seek_s0b` and `seek_s1` compare a C3-code build with a C4-code build (map-loader fix, stated behaviour-neutral).
  FSLC s1 was never submitted; its official score is taken as K6LC s1 (5.29), of which it is the final-safe port.
- All 2,112 records have fuse 0, errors 0, no fallback. 48 seeds per arm only; CPU starvation ruled out the 600+ seeds that a real test needs, the tables `l1` / `h05`, and
  the squad-controller knobs (hunter schedule, vision, reassignment). Those remain untested, not rejected.
- The simulator's seeds are not the official seeds; only mean effects can be compared, never single matches.
