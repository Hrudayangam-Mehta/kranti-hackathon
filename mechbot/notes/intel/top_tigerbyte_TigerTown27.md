# tigerbyte (rank 4, 5.33) and TigerTown27 (rank 5, 5.31): clean-room study and counters

Written 21 Nov 2026, about 06:30 UTC. Read-only work: nothing from another team's repository was executed, nothing
was posted, no code, identifiers or constant tables were copied. Numbers below are plain values described in our own
words; quoted commit subjects are evidence only.

## 0. Headline corrections to what we believed

1. **The two teams are NOT one group on one repo.** TigerTown27 is `shaunkar1/proj1` (confirmed). tigerbyte is a
   different bot from a repository we have not identified.
2. **TigerTown27's 5.31 is the "farm to 6 cubes first" build, commit `a178c88`**, not the kiting commit `b624765`.
   The roster copies are mislabelled: `proj1_aggro6_cefd23f` is a 4.96 build (not 5.33) and
   `proj1_kite200_b624765` scored at most 4.73 and most likely in the 4.1-4.4 band (not 5.31). The real 5.31 build
   is not in the roster.
3. **New evidence source for the whole team:** the group keeps a public coordination repo,
   `shaunkar1/proj1-agentboard` (now cloned at `intel/shaunkar1__proj1-agentboard`). It contains their experiment log
   with official scores, and **raw recordings of 11 real 16-mech showdowns** (`recordings/showdowns-2026-11-20-9pm-11pm.json.gz`,
   one frame per decision for every mech, with events and results; format in `recordings/FORMAT.md`). It covers
   A-bot LLC (10 appearances), AT (11), Wolverines (11), Mustikas (10), BobBuildIt (10), TigerTown27 (10),
   314159265 (10), tigerbyte (6), ImagineLosing (6), r1ver (6), BackwardsDeployeds (6), 404 (6), Mahalas (4), RN SUS (2).
   Earlier notes said several of these teams were "never seen in any record": that is no longer true.

## 1. Identity evidence, re-checked

| Claim | Verdict | Evidence |
|---|---|---|
| TigerTown27 = shaunkar1/proj1 | **confirmed** | The board repo's README says it is the workspace "for the agents helping team TigerTown27" and that the submitted bot "lives in shaunkar1/proj1". Its 05:08 UTC entry reports the official score moving from 4.73 ("19th") to 5.31 ("about 3rd-4th of 153"): exactly TigerTown27's leaderboard history (4.73 at 00:30:43, 5.31 at 05:04:39 UTC). Its recording notes name the proj1 commit that played each showdown under the TigerTown27 name. |
| TigerTown27's 5.31 = which commit | **`a178c88`** ("Squad profile: farm6 (build 6)", 04:58:50 UTC) | Board, 05:08 UTC: on "build 6" the attack-on-sight profile scored 4.96, "farm to 4 cubes first" 5.19, "farm to 6 cubes first" 5.31 ("picked"). 05:57 UTC: "10 cubes before fighting scored 5.10". The three build-6 commits were made at 04:58:46 / :48 / :50 UTC. `a178c88` differs from `cefd23f` and from main `8aa1baa` by one line (the profile name). |
| TigerTown27's 4.73 = `95cfa9c` | confirmed | commit 21 s before the score; the board lists that commit as the 9 PM showdown build. |
| tigerbyte = shaunkar1/proj1 | **refuted** | (a) In six recorded showdowns tigerbyte and TigerTown27 are two different mechs in the same match, with different container images, loadouts and upgrade picks; tigerbyte even killed TigerTown27 once. (b) At 04:45 UTC the board says "we are around 4.7" while tigerbyte already held 5.31 (04:03 UTC). (c) The board says every pre-fix practice variant of proj1 scored 4.1-4.4, so the kiting commit made 71 s before tigerbyte's 5.31 cannot be that score. (d) The build-6 attack-on-sight commit made 1.7 s before tigerbyte's 5.33 scored 4.96 by the group's own statement. Both timing matches were coincidences (22 of our cloned repos have a commit within 15 min before both tigerbyte times). |
| tigerbyte's repository | **not found** | no text hit for the name or for 5.31/5.33 in any clone or commit log. Only its recorded showdown behaviour is available (section 6). |

How the scores map to proj1 commits (official scorer, deterministic, one 48-match run each; source: the group's board):

| Commit | What it is | Official score |
|---|---|---|
| `95cfa9c` (00:30 UTC) | first version, one behaviour for all matches | 4.73 |
| nine of the roughly nineteen practice variants committed 01:54-04:02 UTC (always attack, never retreat, fixed kiting range 150/200 m, rush to 45/70 m, laser+lightning, damage-first upgrades, earlier/later retreat; which nine were submitted is not stated) | squad-match tuning on the old farming code | all between 4.1 and 4.4 (per-variant values not published) |
| `cefd23f` (04:58:46) | build 6, attack on sight once past 20 s | 4.96 |
| `71dadf5` (04:58:48) | build 6, no fights until 4 cubes or 50 s | 5.19 |
| **`a178c88` (04:58:50)** | **build 6, no fights until 6 cubes or 75 s** | **5.31** |
| probably `fea78af` (05:05:27) | build 6, no fights until 10 cubes or 130 s | 5.10 |
| 05:05-06:03 UTC: 18 more profile commits (4/6/8/10/15/21 cubes, time caps 60-220 s, time-only gates) | still searching | unknown; best unchanged at 5.31 as of 05:40 UTC |

These four build-6 points differ in one parameter only: a rare clean calibration set for our simulator.

## 2. How the TigerTown27 bot ("paw", Go, about 3,400 lines of pilot code) plays

Version read in full: `cefd23f` (same tree as the 5.31 commit except the profile line), diffed against `b624765`,
`95cfa9c` and the newest main `4952f6f` (06:02 UTC, only more profile names; a set of opening rules exists but is off).

**Two postures from one detector.** It counts deaths it did not cause (16 - alive - own kills). While that count is
zero and the clock is past 20 s it assumes a squad (practice) match. The first such death switches it to
free-for-all rules for the rest of the match. Before 20 s it uses free-for-all rules, except for the farm gate below.

**Practice posture (the 5.31 build).**
- Farm gate: until it holds 6 cubes or 75 s have passed, it starts no fight and only answers a mech that damaged it
  in the last 4 s and is inside 100 m. A hunter shooting from beyond 100 m is not answered at all.
- After the gate: any mech within 160 m is a target while its own health is above 60%; with health above 80% it
  walks toward any mech seen in the last 20 s (stops 30 m short and then holds its chosen range).
- Loot only when close: every metre of distance costs more than twice what it costs in free-for-all, so a cube is
  worth walking about 85 m, a crate 80 m, a drone 130 m, a laser about 200 m.
- No laser-timing caution and no "stronger mech" avoidance in practice.
- Retreat, range choice, aiming and dodging are the same as in free-for-all.

**Free-for-all posture.**
- It does not shoot on sight. A mech becomes a target only if it is "hostile": it has kept its torso on the bot
  (within about 7 degrees, wider when close) for about 0.6 s with a clear line inside 260 m (two decisions are enough
  while its laser is charging), or it is within 30 m in sight, or it has damaged the bot (hostile for 25 s; 8 s for
  aiming, 4 s for closeness). One exception: any mech under 40% health within 150 m is attacked when the bot itself is
  above 60%.
- Fight or not: it compares its time to kill with the target's time to kill it, at the range it would hold, adding
  every other hostile mech with a line on it. It also fights whenever its damage advantage is clearly positive. With
  two or more hostile mechs it needs a 1.5 times margin.
- Range: it tries eight distances from 28 to 190 m and takes the one where its damage most outweighs the enemy's.
  Its model says an enemy gun is almost useless beyond about 105 m (because it dodges), a laser is 125 damage a second
  at any range, lightning is deadly inside 49 m. Results: about 100 m against a gun or gun+laser mech, about 55 m
  against a laser+lightning mech without a gun, 28-30 m only when it holds lightning itself. In ten recorded matches
  its gun rounds at mechs were fired from a median 101 m (10th-90th percentile 70-157 m).
- Retreat: below 35% health while under fire (unless the target dies within 1.6 s) it latches a retreat until 80%
  health (or 55% with nobody in sight for 6 s). It runs to a spot out of sight of every mech it knows: 48 random
  samples within 8-78 m; if none is hidden, rings at 55, 85, 115 and 145 m away from the nearest hostile. Boost when
  hit. It holds fire while hidden so repair can start (5 s delay, 45 health a second: 35% to 80% takes about 19 s).
- "Much stronger" rule (only with more than two mechs alive): a mech within 300 m whose health times damage rate is
  more than twice its own is avoided: inside 150 m, or whenever it is in sight, the bot breaks the sight line, boosts
  if it is within 170 m, and ignores all loot within 160 m of that mech. Cubes, upgrades passed and weapons all raise
  the estimate.
- Laser caution (free-for-all only): for every laser carrier it knows, it estimates when that laser could fire next
  (remaining charge if charging; otherwise remaining cooldown plus a full charge; it assumes a 40% faster charge once
  the carrier has 3 cubes). Any position exposed to a laser that could fire within 0.85 s is heavily penalised, so with
  cover inside its 11 m steering ring it stays behind the corner and steps out only in the roughly 1.5 s after that
  laser has fired. It charges its own laser behind the corner and lurks within 14 m of a spot that has the line.
- Lightning: it keeps at least 54 m from any lightning carrier it is not deliberately brawling, and it will not
  start a laser charge when a lightning carrier 46-68 m away is closing faster than 4 m/s (it uses the gun instead).
- Economy: values are cube 110, crate 105 (health above 45%), drone 170 (health above 60%, no mech in view; it
  remembers where drones were for 2 minutes), a second weapon about 200, a laser at least 270, supply drop 170 (60 if
  another mech holds it), minus 0.6 per metre. It stands 14-15 m from a crate and shoots down at it; with no mech
  seen for 4 s it spends a full laser charge on the crate. It reloads only at 4 rounds or fewer (or after a long
  quiet spell). It takes cubes and crates within 28-35 m while retreating or repairing.
- Loadout and upgrades: keeps the gun for the whole match; second slot laser first, lightning only until a laser
  turns up; never a mortar. Upgrade order: hull plating, armour, laser damage, laser charge, repair, gun damage, gun
  rate, then the rest.
- Zone: it computes the real walking time to a point just inside the next circle and leaves early enough to arrive
  6 s before the shrink ends (or 5 s before the edge reaches it). When late it runs in with boost and stops strafing.
- Looking around: a full turn at maximum rate in the first 1.7 s; afterwards the torso sweeps 109 degrees either side
  of its walking direction with a 5.7 s period; it snaps to the bearing of damage for 2.5 s and of a sound within
  60 m for 1.5 s.
- Aiming: gun lead with five alternative motion guesses (current velocity, 0.5 s and 1 s averages, standing still,
  half velocity); each decision it replays the last second and uses whichever would have hit most often. It fires
  when the torso will be on the solution after one tick, and aims at whichever part of the target is visible.
  The laser is released only at full charge (or when a partial charge kills) and only with a clear muzzle line.
- Dodging: it simulates 17 first moves and two more legs over the next second against up to 14 visible rounds and
  mortar impact points, and subtracts the best achievable damage from each candidate move. Strafe side flips every
  0.35-0.9 s. It never jumps in a fight (0.2 jumps a minute in the recordings).
- Engineering: static Go binary, typical decision under 1 ms, sorted iteration and seed-derived randomness (same
  commit gives the same score), plus a 34 ms wall-clock guard that repeats the last action.

**Recorded free-for-all results (10 showdowns, older builds `95cfa9c`, `a7eaf61`, `4cf7207`).** Places 1, 1, 2, 3, 5,
5, 7, 11, 12, 14: 9.9 points a match, third best of the 24 teams with four or more recorded matches (the practice
leaders did worse: AT 7.1, tigerbyte 6.8, A-bot LLC 6.0, BobBuildIt 7.2). Median life 103 s, 1.1 kills, 17% of the
time boosting, nearest mech 127 m (median), 0 cubes at 60 s in most matches (the crate bug of those builds). It was
hit first in 7 of 10 opening exchanges. **7 of its 8 deaths were by laser**, from 53-195 m, usually with one
attacker, and in seven of the eight it still had 69-100% health ten seconds earlier: it dies fast, to beams. Three
deaths came inside 26 s: an even laser duel at 0 cubes at 100-150 m (the winner was left with 10% health), a laser
duel followed by a third-party finish, and a lasering from 106 m while it held only gun+lightning. The second of
these shows the retreat weakness: it broke off at 34% health, hid, and about 7 s after the duel a third mech's laser
from 195 m, which it never looked at, killed it. In its one recorded final duel it stood at 52-59 m in front of a
laser+lightning mech holding 34 cubes to its 5 and died to three beams in under 8 s.

## 3. Why it scores 5.31 in practice

| Feature | Measured effect | Kind of evidence |
|---|---|---|
| No fights until 6 cubes or 75 s | +0.35 over attacking on sight (4.96 to 5.31); 4 cubes / 50 s: +0.23; 10 cubes / 130 s: +0.14 | official, same build, one parameter, one deterministic run each |
| Farming execution fixes (stop standing on the crate where the gun cannot point down; no top-up reloads; shoot crates while repairing; give up on unreachable cubes and crates; laser muzzle-line check; never a mortar) | from the 4.1-4.4 band to 4.96 for the same attack-on-sight profile: +0.5 to +0.9 | official, but a bundle (also drone memory, cubes while retreating, distant cover search) |
| Aggression tuning (always fight, no retreat, fixed 150/200 m kiting, rush, laser+lightning, damage-first upgrades) | each of nine variants scored 0.3-0.6 BELOW the plain first version (4.73) | official, per-variant values not published, on the old farming code |
| Avoiding mechs twice as strong | +0.56 points a match in free-for-all | their simulator, about 1,200 matches per arm, noise 0.12 |
| Walking to unseen ground to look for weapons | -0.6 (free-for-all) | their simulator |
| Opening jet hop to look over roofs | 0 | their simulator |
| Laser+lightning with their tactics | -1.0 (free-for-all) | their simulator; they say it reflects their weak chasing |
| Caution while more than 8 mechs live / hunting only weak mechs | +0.2 each alone, a wash in a mixed field, -0.6 combined | their simulator |
| Bullet-search dodge, adaptive lead, retreat at 35% and return at 80%, loot only when close | no A/B published | design choice |

Their own analysis of the 11 recordings (useful for our free-for-all doctrine): in early mutual duels the side that
lands the first hit wins 70%; the healthier side at first hit wins 79%; laser against no laser wins 69%; the winner
still loses a median 771 health. A mech hit first that did not answer survived 10% of the time, one that answered
41%. Final loadouts by points: laser+lightning 11.6, gun+laser 9.3, gun+lightning 7.9, gun+mortar 6.3, gun only 5.2.

## 4. Lessons for our practice bot (against DOCTRINE V4)

1. **Lengthen the opening guard.** Evidence [1 team, official]: starting no fight until 6 cubes or 75 s gave +0.35
   over fighting from 20 s; 4 cubes / 50 s gave +0.23; 10 cubes / 130 s only +0.14. V4 D0 guards 40 s. Proposed
   preset `openGuard`: 75 s or 6 cubes, whichever comes first, answering only a mech that hit us in the last 4 s
   inside 100 m. Partly agrees with D0 (same idea), disagrees on length. Caveat: their mode after the gate is attack
   on sight inside 160 m, so the curve measures "when to start hunting", not our D2 range holding.
2. **Do not tune practice by adding aggression.** Evidence [1 team, official, nine variants]: always-fight,
   never-retreat, fixed 150-200 m kiting, 45-70 m rush, laser+lightning and damage-first upgrades all landed 0.3-0.6
   below the plain bot. Agrees with D3 (keep the low-health retreat) and D7 (keep the gun in SQUAD). It is a warning
   for the D2 `far` preset (fixed 150 m): their two kiting profiles were in the losing band, although confounded
   with "never retreat".
3. **Farming execution is worth more than tactics** (+0.5 to +0.9, official bundle). Checks for our code: never get
   closer to a crate than the distance where the gun can still point down at it (about 10 m with the 0.7 rad pitch
   limit and a 7 m muzzle; they stop at 14-15 m); step straight back if too close; reload only at 4 of 12 rounds or
   fewer when quiet; give up on a cube after 6 s plus 1 s per 8 m and on a crate after 14 s. Agrees with D6.
4. **Shoot crates while healing.** They observed in recordings that crate hits do not stop repair; our own
   forensics found the same (150 of 158 frames). V4 D3's HEAL state forbids crate fire: disagrees with two
   independent observations. Suggested change: in HEAL allow gun fire at a crate within 60 m when no mech has a line
   on us (never at drones: hitting a drone does restart the timer).
5. **Loot radius in practice.** Their 5.31 build walks about 80 m for a crate, 85 m for a cube, 130 m for a drone
   and 200 m for a laser, because "the hunters come to us". V4 D6 allows crates to 150 m and drones to 170 m. Mild
   disagreement, same direction as D6's own note that longer farming lost 0.1-0.2. [1 team, no clean A/B]
6. **Drones over crates** (2 cubes for 350 health against 1 cube for 300), and remember where drones were seen (they
   stay within about 30 m of home). Agrees with D6.
7. **Practice detector.** They flip to free-for-all rules on the first death they did not cause and scored 5.31
   with it, so such deaths are evidently rare in official practice matches. Our D12 (three deaths) is safer and loses
   nothing in real free-for-alls: in all 11 recorded showdowns the first death came at 6-17 s and the third by 19 s.
   Keep D12.
8. **Upgrades and loadout.** Plating, armour, laser damage, laser charge, repair; gun kept; laser second; never
   mortar: the same family as D7. No A/B. [T]
9. **Determinism.** "Same commit, same score" is stated outright. Agrees with D10. They still keep a wall-clock
   guard (34 ms); D10's fixed work counts are the cleaner design.
10. **For the free-for-all posture** (D11): their recordings argue against silent non-response (10% survival when a
    first hit was not answered, 41% when answered) and for striking first from an unseen angle (70% duel wins). This
    agrees with D3's "hold-fire while being shot cost 0.34" and should temper D11's patient, silent healing: answer
    fire while breaking the line.

## 5. Limitations of the TigerTown27 bot (each checkable in the source or the recordings)

1. **It never opens fire on a mech that is not "hostile"** (free-for-all): not aimed at for 0.6 s, not within 30 m,
   not damaged by it, and not under 40% health within 150 m. Hit first in 7 of 10 recorded openings.
2. **Blind arcs.** Field of view 120 degrees, sweep period 5.7 s: every bearing is unwatched for 1.8-4.4 s per
   cycle, and the 22-degree cone straight behind its walking direction is never looked at beyond the 45 m proximity
   sensor. While it has a target it cannot see (corner stand-off, hiding, retreat) the torso is locked on that
   target's bearing: 240 degrees unwatched. It turns to sounds only inside 60 m.
3. **It dodges only rounds it can see.** Gun fire from outside its view wedge is visible only inside 45 m (0.18 s
   before impact): too late to dodge. Rounds it can see for 0.3 s or more (beyond about 80-105 m) mostly miss.
4. **Retreat is a soft target.** From 35% health it runs to cover within 78 m, holds fire while it is not being hit,
   watches only its last attacker and needs about 19 s to return. A second attacker from another bearing gets a free
   shot (recorded: killed at 15% health by a laser from 195 m it never faced).
5. **Laser timing is mechanical.** Any ready laser pins it behind cover; any laser it has just seen fire (or stop
   charging) frees it to step out for about 1.5 s. It believes carriers with 3 or more cubes charge in 0.45 s.
6. **Final duel.** With two mechs left the "much stronger" rule is off; it holds its computed range (55 m against a
   laser+lightning mech) and trades even when hopelessly out-cubed (recorded: 5 cubes against 34, dead in 8 s).
7. **Zone runs.** When late it boosts along its path without strafing or hiding.
8. **Supply drops.** It walks to any drop it can reach within 25 s of landing, even one another mech is holding,
   and stands inside 2 m of the centre for the 4 s capture.
9. **Practice misread in a quiet free-for-all.** If nobody has died by 20 s it believes it is in practice: the 5.31
   build then refuses to answer fire from beyond 100 m until 6 cubes or 75 s, and afterwards attacks every mech
   within 160 m with laser caution and strong-mech avoidance switched off, until the first death by another hand.
   (Not seen in any recorded showdown: first deaths came at 6-17 s. Possible in a cautious final.)
10. **No second-weapon synergy.** It never carries laser+lightning, so it cannot short an enemy laser while lasing.
11. **Ground bound.** No jumping in fights; roofs only for loot when alone; hops only to leave enclosed pockets.
12. **Cover search is random sampling** re-drawn every 2.5 s, so in open ground it dithers before committing to
    distant cover.
13. **Early economy was weak** in every recorded match (0-3 cubes at 60 s). Build 6 fixes the crate bug but has not
    been seen in a recorded free-for-all.
14. **Unseen attackers are never shot back at.** It places a guess of the attacker at the beam origin (or 110 m
    along the damage bearing) and only hides from it.

## 6. tigerbyte: what can and cannot be established

- Source, language, version: unknown. Not proj1. Practice 5.31 (04:03:41 UTC) and 5.33 (04:58:47 UTC).
- Recorded behaviour, six showdowns at 03:00 and 04:00 UTC (two container images, so two builds, both older than or
  equal to the 5.31 entry): places 13, 3, 13, 12, 3, 11 (6.8 points). Median life 30 s: dead at 18-38 s in four of
  six. Gun only in five of six (it never picked up a weapon in those); once gun+laser from 2 s. Upgrades seen:
  gun rate, torso turn rate, plating; energy capacity; armour (no fixed order visible; it may not be choosing).
- Style in the earlier image: fires the gun at the nearest mech once it is inside roughly 90-115 m (median round
  92 m, 90th percentile 142 m), boosts 12-40% of the time, and when hit it pushes TOWARD the attacker (closed
  21-45 m within 3 s in three of six openings). After a fight it stops completely and repairs (speed 0 for 30-60 s
  at a time), or jiggles on the spot with the torso spinning at the maximum 4 rad/s.
- Style in the later image (04:00 UTC): stands still from spawn (68% of its life), holds fire at mechs passing
  54-86 m away, shot one mech that came within 83 m, and ran only after taking a laser and gun burst.
- Deaths: four by laser from 58-151 m, two by gun; in the long matches it lost to mechs that out-ranged its gun.
- One build looped between laser and lightning in its second slot ten times a second for half a second (a pickup
  preference bug).
- Counter-design therefore rests on this recorded behaviour and is graded weak: the 5.33 entry may differ.

## 7. Signatures (what an opponent can observe)

TigerTown27-style bot:
- A full torso turn at 4 rad/s in the first 1.7-2 s after spawn, then a smooth sweep of about 109 degrees either
  side of its walking direction, 5.7 s per cycle, pitch level (confirmed in a recording).
- Gun plus laser (gun plus lightning until it finds a laser); never a mortar; never laser+lightning; max health
  steps up by 15% with its first cubes (plating first), then armour.
- Sees us at 100-200 m and does not shoot, even with a laser; opens fire about half a second after our torso
  settles on it, at once if we damage it or come inside 30 m, or if we are under 40% health inside 150 m.
- Stops 14-15 m from a crate and shoots down at it; one-shots crates with the laser when nobody is in view.
- In a fight: sideways strafe with reversals every 0.35-0.9 s, no jumps, about 100 m from a gun or gun+laser mech
  and about 55 m from a laser+lightning mech; boosts only to re-open the range.
- Near a corner against a laser carrier: hidden while that laser is ready or charging, out for about 1.5 s right
  after it fires.
- At about 35% health under fire it turns and boosts for cover and stops shooting; while it has a hidden target it
  stands still with a fixed torso.
- Leaves at once (boosting) when a far stronger mech shows itself inside 150-170 m.

tigerbyte-style bot (recorded builds only):
- Gun only, no second weapon after 20 s; very few cubes.
- Either motionless for tens of seconds at full health, or jiggling on the spot with the torso spinning at 4 rad/s.
- Full-automatic gun fire at whoever comes inside about 90-115 m; advances on its attacker when hit.

## 8. Counters, in order of expected gain in a free-for-all

Safe as general rules against any bot with the same look: C1, C2, C3, C4, C6 (observe first), C7, C9, T1.
Signature-specific only: C5, C8, T2.

For each: trigger, what our bot does, why it works, what happens if the opponent is a different bot, and whether it
is safe as a general rule.

**C1. Second-attacker finish on the retreat.**
Trigger: a gun+laser mech at 40% health or less that turns away from a fight (boost, heading for cover), or that
stands still behind cover with a fixed torso. Action: approach to 60-150 m from a bearing at least 60 degrees off
its torso aim, staying beyond 45 m (its proximity sensor) and off the line to the mech it was fighting; charge the
laser 0.3 rad off its bearing, swing on and release in one decision; follow with the gun; second beam 2.4 s later;
stop if it reaches cover or a third mech aims at us. Why: it holds fire, watches only its last attacker, and needs
about 19 s to get back to 80%; a beam into the rear arc does 1.5 times damage (472 at no cubes) against 490 health
or less. Expected gain: a kill and its cubes plus 2 in most attempts; this is how one of its recorded deaths
happened. Wrong-bot risk: a bot that keeps shooting while retreating fires back; bounded because we only start at
40% target health, from a corner, with the D3 thresholds deciding when we break off. General rule: yes.

**C2. Stay non-hostile ("no torso on it").**
Trigger: the idle signature (sweep, gun+laser, holds fire at us). Action: never leave our torso within 0.15 rad of
its bearing for more than 0.3 s in any 1.2 s (never while our laser is charging); pass no closer than 35 m; do not
damage it; do not be in its sight inside 160 m with less than 45% health. Why: those are its only reasons to shoot
(limitation 1), and once hostile it also walks toward us for up to 20 s. Expected gain: removes a 9.9-point bot from
our threat list for most of the match at zero cost. Wrong-bot risk: a shoot-on-sight bot ignores the courtesy; the
loss is nil because D0 still treats its aim or first hit as hostile. General rule: yes.

**C3. Laser only in its blind or disarmed windows, from a corner.**
Trigger: it is a target we want (C1, or it is hostile to us) and one of: its laser fired or stopped charging in
the last 1.5 s; its torso is 60 degrees or more off our bearing and we are beyond 45 m; it is running for the zone;
it is standing 14-15 m from a crate pitched down at it. Action: off-axis charge (0.3 rad) behind our corner, swing
on, release, step back; gun only while its torso is still off us. Never fire at it when it stands behind a corner
facing us with our laser ready: it is hidden by design and will step out the moment we discharge. Why: limitations
2, 3, 5 and 7. Expected gain: 315-472 damage per beam with no laser return for 2.4 s. Wrong-bot risk: none beyond a
normal corner peek. General rule: yes (a beam at a mech whose laser just fired or who is looking away is safe
against any bot).

**C4. Hold gun fire it can dodge.**
Trigger: it faces us and strafes with sub-second reversals beyond 80 m. Action: no gun rounds at it (keeps our
repair timer and our silence); shoot the gun only when its torso is 60 degrees or more off us or inside 75 m. Why:
limitation 3; its own model rates an enemy gun at 6% beyond 105 m. Expected gain: small but free (ammunition,
repair time, no hostility started for nothing). Wrong-bot risk: we skip some chip damage on a bot that does not
dodge; bounded by re-enabling fire after the D2 steadiness test passes. General rule: yes, it is D2's fire gate.

**C5. Lightning dash from its 55 m hold (needs laser+lightning in our hands).**
Trigger: free-for-all pair held, the target shows gun+laser and backs away to keep about 55 m, no lightning on it,
our health 70% or more and at least equal to its fraction, energy 70 or more, no other mech aiming at us. Action:
boost in from 68 m to 43 m (it will not start a laser charge while we close through 68-46 m), then lightning
continuously, torso on it, gun not needed; abort and break the line if our health drops under 50%, energy under 25
with range above 45 m, or a third mech turns on us. Why: inside 45 m lightning does 240 a second and keeps its
laser offline, against its gun at roughly 100 a second. It only walks away (11.7 m/s against our 19.5 m/s boost)
until we are within 30 m, so the last 10 m close in about 1.3 s for about 22 energy. Start the dash right after its
laser has fired, so no charged beam meets us on the way in. Expected gain: a kill in about 6 s when it works, for
roughly 600 of our health; its own notes name this chaser type as their unsolved problem. Wrong-bot risk: high against a brawler with lightning or a bot that out-boosts us; bounded
by the trigger (no lightning on target, single threat) and the abort rules. General rule: no, signature-specific.

**C6. Show strength to push it off loot and drops.**
Trigger: more than two mechs alive and it has already run from us once. Its test compares health times estimated
damage rate, ours against its own, and needs a factor above 2. Worked examples at full health: a gun+laser mech with
1 cube against it while it still has only the gun (the usual case in the first 30 s); gun+laser with 10 cubes and one
plating level against its gun+laser at 0 cubes; about 25-30 cubes against a version of it that has 3-5 cubes. A hurt
mech looks weaker, so this only works while we are near full health.
Action: walk in its sight toward the crate cluster or drop we want; do not shoot; when the circle is small, stand
where its only hidden ground lies outside the next circle, so its zone run crosses our line, then apply C3.
Why: it abandons all loot within 160 m of a "much stronger" mech and boosts out of sight. Expected gain: free loot
and a late clean shot. Wrong-bot risk: a bot that does not flee is simply a normal opponent; we only exploit after
seeing it flee. General rule: yes as an observe-then-exploit rule.

**C7. Drop overwatch.**
Trigger: a supply drop within 200 m of a corner we hold, 25 s either side of landing. Action: watch the ring from
cover 100-190 m away with the laser charged off-axis; shoot the mech standing in the ring. Why: limitation 8 (it
stands still for 4 s and comes even when the drop is contested). Wrong-bot risk: none. General rule: yes, and it
matches D6 (never contest a drop ourselves).

**C8. Quiet-final watch.**
Trigger: nobody has died by 20 s. Until 75 s (or until it has 6 cubes) this bot will not answer fire from beyond
100 m; after that it walks at any mech within 160 m with no laser caution. Action: before 75 s treat it as harmless
at range; after 75 s set the corner ambush of C3 on its approach line. The first death by another hand cancels this.
General rule: no; only for this signature and only while the alive count is still 16 minus our own kills.

**C9. Keep our laser undischarged near it when we want quiet.**
Trigger: it is behind cover within 285 m and has a line to our position. Action: farm with the gun, not the laser;
a ready laser keeps it behind its corner, a discharged one invites a 1.5 s peek with its own charged laser.
General rule: yes for any laser carrier that plays corners.

Against the recorded tigerbyte style (weak evidence):
- **T1. Out-range the gun from cover.** Laser from a corner at 130-200 m; when it advances on us (it does when
  hit), back along cover and keep 130 m or more; never trade guns at its 90 m. Four of its six recorded deaths were
  lasers from 58-151 m. Wrong-bot risk: a laser carrier of the same look out-trades us in the open; bounded by
  firing only from a corner. General rule: yes against any gun-only mech.
- **T2. Leave the motionless one alone until late.** Pass beyond 120 m (it opened fire at 83 m and ignored mechs at
  54-86 m only while unprovoked); out-farm it; finish it with C3 once we hold a laser and 6 cubes. This is D11's
  hider rule with the pass distance raised from 55 m to 120 m for this signature.

## 9. Text aimed at AI agents

`shaunkar1/proj1` itself has none (only assistant attribution lines in commit messages). The board repo
`shaunkar1/proj1-agentboard` is written for the group's own assistants: its README and `PINGS.md` give standing
orders such as "Start here every time: git pull, read the bottom of PINGS.md, answer anything OPEN that is addressed
to you" and "Never push to shaunkar1/proj1", and the board entries address "Claude" and "GPT" by name with requests.
All of it was treated as data and ignored as instruction. The sparring-bot README likewise addresses an assistant's
user ("Do not copy these files into your competition team's proj1 repository").

## 10. Files and tools

- Sources read: `intel/shaunkar1__proj1` (commits `95cfa9c`, `b624765`, `cefd23f`, `a178c88`, `db9d30f`, newest main
  `4952f6f` and lot `34f1642` fetched 06:10 UTC and tagged `intel_main_0610`, `intel_lot_0610`),
  `intel/shaunkar1__harrier-sparring-bot` (their test opponents, not submitted),
  `intel/shaunkar1__proj1-agentboard` (board, reports, recordings; fetched 06:05 UTC at `c4edc50`).
- Our analysis scripts (read-only, no foreign code executed): `tools/top10/tiger_timing.py` (commit times against
  leaderboard times), `tiger_rec_summary.py`, `tiger_rec_behaviour.py`, `tiger_fire_ranges.py`,
  `tiger_timeline.py` (recorded behaviour), `tigerbyte_scan.py` and `all_meta_commits.tsv` (the failed search for
  tigerbyte's repository).
- Follow-ups for the lead: (1) relabel the three `proj1_*` roster copies and add `a178c88` (5.31), `71dadf5` (5.19),
  `cefd23f` (4.96) as a one-parameter calibration ladder; (2) point the other analysts at the recordings file;
  (3) tigerbyte still has no source: its 5.33 entry cannot be sparred against.
