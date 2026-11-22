## 6. How to read the tables

Outside the noise and simulator-validity tables (which reuse some rows), the record tables hold 97 official A/B comparisons from 27 teams (61 negative, 34 positive, 2 exactly zero), 56 of them single-change, plus absolute scores, simulator results and recorded-match statistics, each labelled in the scorer column. Sources ending in `(commit message)` are the teams' own statements of their board scores, read from the commit history in `_meta/`. A bundle delta (n > 1) cannot be assigned to one change. Baselines differ: a delta on a 2.4 bot and on a 5.6 bot are not the same quantity. "Absolute" rows (no Before) describe what a scored bot does, read from its notes or code; they are not experiments.

## 7. Noise

Deterministic bots repeat exactly (D01, D02), and the same public code scored the same for different teams (D03), so every team plays the same 48 matches. Any behaviour change re-rolls them. Two teams measured that directly by changing only a random seed: -0.06 (D04) and -0.27 (D05). Bots that cut their path search by wall-clock time do not even repeat: the same code moved by 0.02, 0.15 and 0.33 (D06-D08), and one team's simulator spread by 0.44 across worker layouts on fixed seeds (D09). One place in one match is 0.021 (`nullat0m7__mech-royale/PATTERNS.md`). Teams' own thresholds range from 0.15 (`jackbalseca__mech-royale-bot/SUBMISSIONS.md`, row 9) through 0.2 (`nullat0m7__mech-royale/PATTERNS.md`, pattern 3) and 0.3 (`alexwilldev__mechroyale-bot/STATUS.md`) to 0.4 (`Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md`).

Working rule used in this note: a single A/B under 0.3 is not evidence on its own. Single-change results at or above 0.3 are: hiding (A22 -1.75, A24 -0.83, A20 -0.64, A01 -0.50), early retreat (A25 -1.10), roofs (C04 -0.93, C02 -0.37, with C03 pointing the other way), long gun range (R01 -0.77, R09 -0.34), very long laser range (R06 -0.37), fast strafe flips (M03 -0.69), no crate shooting (E12 -0.65), farming on (E04 +0.37), finishable targets (G01 +0.39), and execution or timing defects (F03, F04, N05).

## 8. Structural facts

**Where points come from.** A practice point is a house bot dead before us. House bots die to us, the zone, drones or their own mortar splash; in one team's simulator 2.9 of 3.4 points per match were own kills, 0.45 drones and none zone (`nullat0m7__mech-royale/PATTERNS.md`, pattern 2, mechanism only).

**Outcome distribution.** Nobody has official per-match results; the site shows one number and no replays (S10). The bimodal picture comes from one local simulator (S09): 56-69% of matches at 0-2 points, 12-28% outright wins, 12-31% in between. At a simulated mean of 5.59 the bot won 28% of matches and those wins were 75% of its points. The win rate behind 5.58 is therefore not measured; about 28% is the simulator's answer.

**House bots.** Fifteen bots in tiers of 4 easy, 4 medium, 4 hard and 3 expert, sharing vision and never fighting each other; the weakest hunter comes first, more as they thin out, all of them late (S12). The exact schedule is unknown: team simulators use guesses between one extra hunter per kill and one per two kills, with everyone hunting from 240-300 s. Against a passive bot they are less aggressive than simulators assume (a hide probe scored 4.04 against a predicted 3.3, A01), yet pure hiding still scores only 1.7-2.6 (A22, A24). Idle members: one team's rule "non-hunters leave us alone unless hurt" gained 0.23 (G02, `jackbalseca__mech-royale-bot/CLAUDE.md`); another infers from its simulator that they engage on sight (S13). Aim: on the real server house guns hit 94% inside 40 m, 58% at 40-80 m, 31% at 80-130 m and 12% beyond (S05); another recording gives 55-75% overall with a strafe reversal about every 0.8 s (S06). In the kit's recorded practice stream the hunter arrives with gun and laser and fights at 100-150 m (`arnabxero__xero-mech-royale/STATUS.md`); hunters keep tracking for 5 s after losing sight (`nullat0m7__mech-royale/CLAUDE2.md`). In three recorded live matches the gun did 52% of the damage to mechs and the laser 33% (S07).

**Leaderboard.** S11 gives the history. The top has been 5.58 since 03:38 UTC, while 16th place rose from 4.33 at 02:40 UTC to 4.92 at 05:19 UTC and 32nd from 4.04 to 4.29 by 04:48 UTC (the 05:19 snapshot is `web/mech_leaderboard_now.json`, outside `intel/`). Lineages with public evidence in the top 16: Wolverines (own bot, 5.19), r1ver (a fork of it, 5.10), Kanyaraasi and BackwardsDeployeds (forks of the Lance bot, 5.19 and 5.06), and, by timestamp inference only, A-bot LLC (R13).

**Simulators.** Six teams saw their simulator give the wrong sign for a change that then lost 0.18-0.77 officially (V01-V06); one over-predicted a loss fourfold (V07); a paired re-run of four scored builds got three of six orderings right (V08); a third-party squad simulator was off by 3.7 points on the kit example (V09). Two simulators agreed with the board once each (V11, V12). The errors cluster on range and retreat questions.

**Practice against free-for-all.** Practice ranks 1-4 placed 6th to 12th in recorded Top-16 showdowns; calm bots outlasted boosters (S04); in private rooms a quiet variant beat a fighting variant 10.75 to 9.33 (S08). Showdown winners differ from the bottom half mainly in laser share of damage, cubes, time in the open and distance to the nearest enemy (S01); all of these carry a time-at-risk confound.

## 9. Audit commentary

Large parts of E2, E3 and E5 are a transcription of one bot, the Wolverines' v8-econ. As a package that policy is well supported: it scored 5.19 and a fork scored 5.08-5.10. Its individual numbers have never been A/B-tested, so each is "one team".

Four places where the amendment generalises beyond its evidence:

1. "Never stand still out of sight." The source is a two-change bundle (A02). The bot the amendment copies does the opposite when hurt, and the 5.58 bot lost 0.41 when its low-health hiding was removed (A05). What is measured is narrower: holding fire while healing costs 0.34 (A08, A09), retreating at 72% costs 1.1 (A25), and quiet walking while travelling costs 0.2 (M01).
2. Long range. The -0.77 result is a gun-and-laser backpedal on a 3.8 bot. For lasers the only sweep says 110 m beats 150 m and more (R06-R08), while the leading bot kites at 125-185 m (R13).
3. Kill cubes, the lightning stand-off and the free-for-all stance all trace to commits that never improved a board score, or to local simulators (E3, E2, E8 rows of the audit). The amendment's latch, including the two-beam clause, is the Wolverines' main-line code; that line scored 3.56 for the team that submitted it, against 5.19 for the sister branch that has the economy package and no latch (X02). The two lines differ in several ways, so this does not prove the latch leaks, but the beam clause has a plain false-positive path in practice: a house bot firing a beam at a drone or crate next to a squad-mate.
4. Loadout. The amendment drops the gun; its model bot never does (L12).

## 10. Caveats

Scores in commit messages are self-reported and carry no receipt. The identity of the 5.58 repository is inferred from timestamps. X02 compares two lines of one bot submitted by two teams; public bots otherwise reproduce exactly across teams (D03), but the lines differ in economy, weapon order, upgrade order and free-for-all logic, so the 1.63 gap is not attributable. Recorded-match statistics come from 7 to 13 matches. No record here was produced by running another team's code.
