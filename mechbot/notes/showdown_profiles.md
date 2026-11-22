# Showdown profiles: how top bots behave in real free-for-alls

Scope: public evidence only (read-only clones under `intel/`). Numbers are cited by source tag; paths are relative to `intel/`.
Machine-readable copy: `notes/showdown_profiles.json`. Scripts: `tools/evidence/showdown_extract.py`, `tools/evidence/build_profiles.py`.

## 1. Evidence base

| Tag | File | What it holds | Sample |
|---|---|---|---|
| S1 | `dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl` | Full per-mech summary for each **winner**, plus mean/median per placement group | 7 complete showdowns (9, 10, 11 PM ET on Nov 20); 7 winner rows; groups: place 1 (7), places 2-4 (21), places 9-16 (56) |
| S2 | `dmclaughlin-bit__mech-bot/coord/learnings.md` | Notes on the first two recorded showdowns | 2 matches |
| S3 | `dmclaughlin-bit__mech-bot/research/intake/diego-match-data-1129.md` | Summary of a 208-row table that is not published | 13 matches (8 showdown, 5 public lobby) |
| S4 | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` | Team averages in showdowns; death and crowding statistics from the public cast | 11 showdowns; about 200 recorded matches; 75 deaths; 41 matches for the danger map |
| S5 | `moonriver0922__wgsrobot/experiments/README.md`, `official-runs.md` | r1ver's own notes: which public source Wolverines and r1ver run | - |
| S6 | `_triage/raw/bd_docs_RESULTS.md` | BackwardsDeployeds submission history | - |
| S7 | `_triage/readme/devakchow_team-kanyaraasi-mech-royale.md` | Kanyaraasi packaging note | - |
| S8 | `LanceHuang245__mech-royale/README.md`, `bot.py` | Public controller packaged by Kanyaraasi and (at 4.75) BackwardsDeployeds | - |
| S9 | `varchaskukreja__TTUN/mech-royale/bot/bot.ts`, `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts` | Wolverines source: main branch and the 5.19 entry | - |
| S10 | `VivekRnx__bob-the-builder-2026/README.md` | Probable source of "Bob the builder" (unverified) | - |

Hard limit of the evidence: raw recordings were not published. Per-mech rows exist **only for the seven winners**. Every other mech
appears only inside group means, and places 5-8 are in no group. No source gives a per-team cause of death.

## 2. Per-team table (top 16 of 05:19 UTC, plus other teams seen)

Two values in a cell are two separate wins. L/Z/G = share of damage from laser / lightning / gun. "-" = no data.

| Team (rank, score) | Matches seen | Places | Life s | Kills / drone kills | Damage out / in | L/Z/G % | Cubes / upgrades / drops | Boost % / air % | Centre dist / radius | Nearest mech m | Death data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AT (3, 5.52) | 2 wins in S1; up to 11 in S4 | 1, 1; mean about 9th (S4) | 149 / 141 | 5, 1 / 2, 4 | 6022, 2150 / 1577, 1896 | 84/6/10; 85/15/0 | 24, 35 / 6, 7 / 0, 0 | 11, 9 / 0, 7 | 0.43, 0.56 | 159, 176 | none |
| TigerTown27 (5, 5.31) | 1 win in S1 | 1 | 238 | 4 / 0 | 5894 / 2544 | 66/0/34 | 23 / 6 / 1 | 11 / 7 | 0.47 | 248 | none |
| BackwardsDeployeds (11, 5.06) | 1 win in S1 | 1 | 277 | 3 / 1 | 7156 / 4776 | 73/27/0 | 19 / 5 / 2 | 14 / 7 | 0.34 | 165 | none |
| 404 Competition Not Found (14, 5.02) | 1 win in S1 | 1 | 295 | 2 / 1 | 6037 / 4216 | 32/53/16 | 31 / 7 / 1 | 11 / 0 | 0.44 | 190 | none |
| Wolverines (7, 5.19) | up to 11 in S4 | mean about 6th | - | - | - | - | - | - | - | - | none |
| BobBuildIt (6, 5.27) | up to 11 in S4 | mean about 8th | - | - | - | - | - | - | - | - | none |
| 314159265 (16, 4.92) | up to 11 in S4 | mean about 12th | about 36 | - | - | - | - | 41 / - | - | - | dies in the opening (S4) |
| Kanyaraasi (8), r1ver (9) | 0 | - | - | - | - | - | - | - | - | - | source known only (S5, S7) |
| A-bot LLC (1), scorpion (2), tigerbyte (4), Mahalas (10), ImagineLosing (12), not even close (13), RN SUS (15) | 0 | - | - | - | - | - | - | - | - | - | nothing |
| *Mustikas (21, 4.75)* | 2 wins in S1 | 1, 1 | 327 / 135 | 5, 5 / 0, 2 | 9847, 6456 / 3135, 1008 | 72/6/22; 76/0/24 | 34, 15 / 7, 5 / 3, 0 | 7, 12 / 0, 0 | 0.39, 0.47 | 152, 216 | none |
| *Bob the builder* | up to 11 in S4 | mean about 4.8th | about 180 | - | - | - | 9.5 cubes | stands still 74% | - | - | none |
| *House 2 (expert house bot)* | up to 11 in S4 | mean about 4.2th | - | - | - | - | 17 cubes | - | - | - | none |
| *Hishu* | 1 (S2) | 4 | 168 | 0 | - | gun only | - | - | - | - | none |

All seven winners spent 0% of the time outside the zone and held still in open sight at most 3% of their stationary time (S1).
A random mech averages 8.5th, so BobBuildIt and AT were no better than random in showdowns despite leading practice (S4).
If S4's eleven matches include both AT wins, AT averaged about 10.8th in the other nine: it wins or dies early.

## 3. What wins a real free-for-all and what loses it

| Measure (S1, 7 showdowns) | Place 1 (n=7) | Places 2-4 (n=21) | Places 9-16 (n=56) |
|---|---|---|---|
| Seconds alive: mean (range) | 223 (135-327) | 181 (98-326) | 27 (6-89), median 21 |
| Damage dealt per second alive | 27.9 | 22.4 | 29.9 |
| Damage taken per second alive | 12.3 | 20.3 | 56.8 |
| Mech kills / drone kills | 3.6 / 1.4 | 1.9 / 0.7 | 0.25 / 0.2 |
| Laser / lightning / gun share of damage % | 70 / 15 / 15 | 46 / 5 / 49 | 18 / 0 / 81 (median gun 100) |
| Peak cubes: mean (range); per minute | 26 (15-35); 7.0 | 9 (0-26), median 5; 3.0 | 0.7; 1.5 |
| Supply drops taken | 1.0 (7 drops in 7 matches) | 0.1 (2 in 21) | 0 |
| Mean distance to nearest mech, m | 187 | 154 | 114 |
| Time boosting % | 11 (7-14) | 11 | 25 (max 67) |
| Stationary time in open sight / behind a building % | 0.7 / 96 | 15 / 79 | 39 / 50 |
| Hits on targets below half HP % | 47 | 37 | 25 |
| Mean HP fraction | 0.90 | 0.83 | 0.73 |
| Centre distance / zone radius | 0.45 | 0.53 | 0.48 |
| First pickup, median s (mechs that got one) | 4.8 (7 of 7) | 10.3 (17 of 21) | 7.1 (31 of 56) |

Readings, with the caveats that n = 7 matches and that long-lived mechs have more time to collect everything:

1. **The first 90 seconds decide half the points.** Every bottom-half mech was dead by 89 s, median 21 s. In three of seven showdowns the
   winner's clock stopped at 135-149 s, and only one match reached the 70 m circle (S1). Zone deaths are negligible: 4 of 195 labelled deaths in S3,
   and nobody in S1 spent time outside the zone. Surviving the opening is worth 8 points; waiting for the circle is not a plan.
2. **Losers are not passive, they are exposed.** Bottom-half mechs dealt damage at the same rate as winners (30 against 28 per second)
   but took it 4.6 times faster (57 against 12). They fought from spawn with the starting gun, 114 m from the nearest mech, boosting a
   quarter of the time, and stood in open sight for 39% of their stationary time.
3. **Crowding kills.** With no mech within 60 m the death rate is 0.36 per minute; one mech within 60 m makes it 2.02, two make it 4.58
   (S4, 41 matches). 55% of deaths involve two or more attackers and the victim still had 888 of 1400 HP ten seconds earlier
   (S4, 75 deaths of house bots and humans). Zone centre is worse than the edge (0.85 against 0.55 deaths per minute, S4), although
   S1 shows no clear difference in radial position between groups.
4. **Loadout: laser first, lightning second, never mortar.** All 7 winners ended with a laser (8 of 8 in S3); 6 of 7 with laser plus
   lightning, none with a mortar. Laser carriers averaged 9.1 points against 5.9 without (S3, showdowns). But an early laser does not save a mech that
   fights: bottom-half mechs that found a laser had it at 7 s median, and over 13 matches a laser by 15 s scored 7.6 points against
   10.5 for a later one (S3).
5. **Calm beats aggressive, but calm alone tops out near 4th.** Practice leaders averaged 6th to 12th; the heavy booster 12th; a bot that
   stands still 74% of the time 4.8th with 9.5 cubes; an expert house bot 4.2th with 17 (S4). Winners add farming to calm: 26 cubes
   and one drop against 9 cubes and 0.1 drops for places 2-4.
6. **Winners finish, they do not start.** 47% of winner hits are on targets already below half HP; they keep 187 m away on average.
   Time of first fight is not recorded directly; the damage-intake rates above are the best proxy.

## 4. Team habits, limits, signature, counter

| Team | Habits in free-for-all | Limits | Signature we can observe | Counter | Risk if the read is wrong |
|---|---|---|---|---|---|
| AT | Laser stand-off farmer. Fires almost constantly (silent 3% and 13% of the match), drones and crates included; 10-15 cubes a minute; half its hits on wounded mechs; 43% third-party hits in one win; no drops | Loud (laser heard to 380 m); telegraphed laser; boom or bust | Laser(+lightning) carrier shooting non-stop from 150+ m, slow, cubes climbing fast | Keep a building between us using its noise; charging-laser rule; never be the wounded mech in its view; close under cover with lightning late | A quieter new build removes the noise cue |
| TigerTown27 | Gun plus laser from very far (248 m), mostly away from buildings, armour first | Rarely in cover; no lightning | Gun+laser carrier at 200+ m in open ground, jumps | Corner peeks with laser; or close under cover with lightning | If it uses cover, peeking is only even |
| BackwardsDeployeds (probably also Kanyaraasi) | Laser plus lightning, hugs walls, trades heavily and regenerates (4776 damage taken). The public controller it ran shoots any mech it sees, sits at 110 m with laser, closes to 28 m with lightning inside 60 m, flips strafe only every 1.0-2.6 s, runs below 38% HP | Shoots on sight; slow strafe; sidesteps a charging laser only within about 7 m plus 3% of range of the aim line; goes to cover when it has no laser and sees one 70-240 m away | Laser+lightning carrier near walls, long strafing arcs, about 110 m from its target | No open trades; off-axis laser charge from a corner; stay beyond 60 m; third-party while it trades | Current entry is compiled and unreadable |
| 404 Competition Not Found | Slow start (first pickup 60 s), three hull upgrades first, then lightning does 53% of damage; soaks 4216 damage behind cover | Weak for the first minute; must reach 45 m | High max HP for its cube count, lightning listed, closing through cover | Kite beyond 50 m along cover; laser it in gaps | Backing off in the open against a laser user is fatal |
| Wolverines, r1ver | The 5.19 entry has no free-for-all mode: targets any mech seen in the last 4 s; holds 70 m with gun, 110 m with laser, but closes to 28 m whenever it holds lightning; strafe flips every 0.35-1.05 s; walks to cubes within 70 m mid-fight; retreats to cover below 35% HP or when outnumbered | Fights everyone; forgets after 4 s; predictable cube detours | Fires on first sight at any range, short random strafes, drifts to cubes | Break sight 5 s; ambush on its cube path; hit it when it is under 55% with two mechs near | A newer main-branch build hides instead: then treat as a hider and do not show under 45% HP within 120 m |
| BobBuildIt | Only known: about 8th on average | Practice strength did not transfer | Unknown | Default rules | Archetype is a guess |
| 314159265 | Boosts 41% of the time, lives 36 s | No energy on arrival, gun only | Boost speed for long stretches, heading at a mech | Corner ambush; do not run | If it shows lightning keep 50 m |
| Mustikas (rank 21) | Laser in 3-12 s; took all three drops in one win; 5 kills in both | Losses unknown | Laser carrier that walks to every drop | Do not contest a drop it holds unless it is under half HP | - |

## 5. Archetypes and one counter rule each

| Archetype | Members | Observable trigger | Counter rule | Risk |
|---|---|---|---|---|
| Laser stand-off farmer | AT, Mustikas, TigerTown27, BackwardsDeployeds; by source Kanyaraasi, and Wolverines/r1ver once armed | Laser in the weapon list; charging flag; range over 100 m; speed at or below walk | Charging flag plus aim within 0.25 rad of our bearing: sidestep at boost to a building edge. Never stand in its open sight. Engage only from a corner, inside 40 m with lightning, or as third party | Low |
| Lightning closer | 404 Competition Not Found; Wolverines/r1ver whenever they hold lightning; Kanyaraasi/BackwardsDeployeds family inside 60 m | Lightning listed and range shrinking below 60 m | Hold beyond 50 m along cover; let it in only if we hold lightning and more HP | Medium: retreat lane may be unsafe |
| Shoot-on-sight strafer | Wolverines, r1ver, probably BobBuildIt; public families before they find a laser | Torso snaps to us and gun opens at any range | Break sight for 5 s; punish on cube detours or when a third mech engages it | Low |
| Boost rusher | 314159265 | Speed near 19.5 m/s, closing, gun only | Corner ambush facing the approach | High if it holds lightning |
| Quiet hider | Bob the builder; newer Wolverines build; several mid-table teams | Motionless or under 5 m/s behind cover, holds fire, under 10 cubes | Leave it; pass beyond 55 m, facing it, above 55% HP, not charging; out-farm and finish late | Medium: may be a waiting laser |
| Expert house bot | fills empty seats | Not identifiable | Treat as shoot-on-sight strafer | Low |

Most useful rules for our bot:

1. **Opening:** no voluntary fight before 90 s; every mech beyond 60 m (target 150 m); boost only to break sight.
2. **Charging laser:** sidestep to hard cover when a charger's aim is within 0.25 rad of us; with lightning inside 40 m, zap instead.
3. **Economy:** farm only with the nearest known mech beyond 150 m; pace 7 cubes a minute; take drops only uncontested.
4. **Wounded rule:** never be visible below 55% HP; open fire first only on targets below half HP that someone else is fighting.
5. **Weapon-list reads:** lightning closing: keep 50 m; gun-only booster: corner; shoot-on-sight: break sight 5 s; quiet mech: pass wide.
6. **Our own laser:** charge 0.3 rad off the target, swing on and release within one decision. Both public controller families dodge
   only while a charging aim points at them (inference from source S8, S9; not yet seen in a match).

## 6. What the evidence does not cover

- Never seen in any record: A-bot LLC, scorpion, tigerbyte, Kanyaraasi, r1ver, Mahalas, ImagineLosing, not even close, RN SUS.
  Six of these (all but Kanyaraasi, r1ver and not even close) have no source identified in this pass either.
- Losses of the recorded winners, all of places 5-8, and every cause of death by team (killer, range, attacker count).
- Time standing still, except one team in S4; time of first fight.
- Bot versions: recorded showdowns ran at 02:00-04:00 UTC. Best entries of AT (03:43), TigerTown27 (05:04), BackwardsDeployeds
  (04:17), 404 Competition Not Found (04:28) and BobBuildIt (03:03) are newer than, or overlap, their recorded matches. Wolverines
  (00:57), Mustikas (01:23) and 314159265 (02:10) should be unchanged.
- The link from BackwardsDeployeds' win to the public controller rests on submission times (S6), not on a signature in the recording.
  The controller thresholds were read from a later commit than the pinned one; an older pinned copy shows the same numbers.
- Showdowns were hourly top-16 exhibitions. The qualifier and final use new seeds, possibly other seat fills, and teams may switch
  to a different entry before the cutoff.
