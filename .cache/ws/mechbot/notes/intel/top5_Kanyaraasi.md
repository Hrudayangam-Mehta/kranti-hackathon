# Kanyaraasi 6.06 (rank 3 at 16:37 UTC Sat): clean-room study, black-box runs, lessons, counters

Written Sat 21 Nov 2026, about 17:30 UTC, by the top-5 study step. Sources: the readable source of the scored
commit, the 63 commits of the team's repository (all READMEs read; every commit message is the same four
words), giddygiddyboy's public history (blob ids only, plus the brain file of four of its commits), the board
snapshots in `../web/`, the earlier study `top_Kanyaraasi.md`, and 6 squad matches of the scored build in
our simulator. Nothing from the repository was run outside `/srv/mech-sparring/run.sh`; no compiled artefact
was opened; no code, identifier, comment or constant table is reproduced. No text aimed at AI agents was
found (READMEs, sources and messages checked).

## 0. The short answer

- **Kanyaraasi's 6.06 is not its own controller.** Commit 6a17c49 (16:13:34 UTC) packages giddygiddyboy's
  Go controller at 601c7a6 (committed 15:50:07 UTC, 6.06 on the board at 15:50:19). The four strategy files
  are byte-identical (SHA-256 checked against our clone); the only other change is the program wrapper,
  which adds two stderr diagnostics. The mech even announces itself as "giddygiddyboy". Same code, same
  score, two teams, 38 minutes apart: the controller is deterministic (its only randomness is seeded from
  the hello seed; it never reads the clock) and the official scorer reproduces a deterministic bot exactly.
- **How the team went from about 5.3 to 6.06** (self-reported in its READMEs, one official run each):
  5.31 TypeScript TTUN/r1ver family, then the switch to giddygiddyboy's older Go controller 5.60 (+0.29),
  then one change, early "lethal" laser release, 5.79 (+0.19), then a quiet supply-drop helper 5.81, a
  close-in finisher 5.83, then 14 more single-change experiments that never became the new reference,
  then giddygiddyboy's newer revision unchanged 6.06 (+0.23). The two levers with clean numbers are the
  controller family (+0.29) and the early lethal laser release (+0.19).
- **What makes this controller score**: it starts shooting mechs early (simulator median 15.8 s, ours 38 s
  on the same seeds), deals close to three times (2.7x) our damage per minute, holds a laser in most matches by
  6-14 s, sticks to one target and finishes it (strong current-target and low-health bonuses, a 20 m
  close-in when the target is under 38%), releases the laser early when the partial beam already kills,
  scores every candidate step by how many other enemies would see it there, retreats only in short pulses
  while actually losing, and puts the zone above everything.
- **Its free-for-all posture is the opposite**: during the first 20 s, and for good after the first
  death it did not cause, it ignores mechs beyond 60 m unless provoked and hides at quiet, low-exposure
  spots. Counters are in section 9.

## 1. Identity and the scored version

| Evidence | Result |
|---|---|
| README of 6a17c49 | Says it runs "the complete strategy" of giddygiddyboy at 601c7a6, MIT notice included; strategy file hash printed. |
| Hashes | brain, world, types and export files of 6a17c49 equal those of our clone of 601c7a6 (brain 7e02ac99..., world a2cf8790..., types ab43e63c..., export 3f038422...). The wrapper differs: two extra stderr lines (map load time and recovered panics). |
| Board (`web/mech_leaderboard_now.json`, 16:37) | Kanyaraasi 6.06 at 16:28:03; giddygiddyboy 6.06 at 15:50:19. |
| Timing | 6a17c49 committed 16:13:34, 23 min after the upstream commit; board 14.5 min after the commit. |
| Behaviour | In our simulator seed 5 is identical to a teammate's run of `giddy_601c7a6` (place 8, 92.55 s, 12332 dealt / 2658 taken). Seed 6 diverged at the third upgrade pick; the bot is seeded, so the divergence is on the simulator side (external-process run), not the bot. |

Verdict: link **confirmed**, scored version **likely 6a17c49** (identical strategy to the 6.06 upstream,
tight timing, identical score). Habit for the final: this team repackages the best public controller it
can find (Lance 4.77, TTUN/r1ver 5.19-5.31, giddygiddyboy 5.60-6.06), tries one documented change at a
time, and adopts the upstream again when the upstream wins. giddygiddyboy committed five more times after
601c7a6 (16:00-17:00 UTC); the latest differs from 601c7a6 only in the health weight of the target score
(0.1 to about 0.2 per hit point). Expect the Kanyaraasi mech in the final to be whichever giddygiddyboy
revision scores best; re-check the board time before trusting the details below.

## 2. The ladder, one change at a time (times UTC, scores as the team reports them)

| Commit | Time | What it was | Score |
|---|---|---|---|
| d4b744c | 03:31 | Lance's public bot | 4.77 (board 03:44) |
| 83e4c93 | 05:02 | r1ver's copy of TTUN v8-econ | 5.19 (board 05:05) |
| c8527c3 | 07:46 | same plus a grown-body ground check on navigation legs | 5.31 (board 07:49) |
| ce3d36a | 09:04 | giddygiddyboy d03d32e unchanged (newer, no opening phase) | not stated; not chosen |
| d9c557f | 09:42 | giddygiddyboy 345c0de unchanged (older, with an opening phase, laser band 140 m) | **5.60** |
| 5d010ad | 10:00 | free-for-all latch needs two foreign deaths | not chosen |
| fdf06a3 | 10:15 | **early lethal laser release switched on** (release when 0.8 x partial damage covers the target's hp) | **5.79** |
| 471c24d | 10:31 | gun+laser: no forced line of sight during laser cooldown | not chosen |
| c6f6ad8 | 10:50 | quiet, bounded supply-drop detour | 5.81 |
| 24d68e5 | 11:03 | close to 14 m on a target under 38% (own hp over 42%, at most 2 near) | 5.83 |
| 14 commits | 12:00-15:27 | pursue hidden targets; dodge side follows the beam miss; size-aware dodge and cover; keep squad profile after foreign deaths; ignore far non-attackers while more than 9 alive; drop the losing rule; economy scoring; drops always; three free-for-all variants; skip cubes at the stat cap; opening until second weapon + 3 cubes or 75 s; three boost rules; upstream values of 61de0f2; damage-pattern latch | none became the reference: all at or below 5.83 |
| 6a17c49 | 16:13 | giddygiddyboy 601c7a6 unchanged | **6.06** (board 16:28) |

Inference rules used: the team names each new reference with its score in the next README (5.60 to 5.79 to
5.81 to 5.83); after 11:03 every README still names 5.83 as the reference, so no later experiment beat it.
Scores between our 07:51 and 16:37 board snapshots are not visible on the board itself.

What 601c7a6 changes against the 345c0de that scored 5.60 (all in the practice profile unless said):
early lethal laser release switched on with a factor of 0.7 (more eager than the team's 0.8); close-in
finisher at 20 m; current-target bonus raised from 120 to 200 m-equivalent; health weight halved (0.2 to
0.1 per hit point); low-health bonus doubled (100 to 200 for targets under 30%); laser stand-off 140 m
back to 120 m; the opening phase removed (first 20 s now use the plain cautious profile). Against the
team's own 5.83 fork the upstream also has no drop helper and keeps the lethal release out of the
cautious and free-for-all profile. That bundle is +0.23; it cannot be split further.

## 3. How the scored controller plays (numbers; my own description)

One rule pass per decision with two parameter profiles and a one-way switch.

**Profiles.** Cautious profile for the first 20 s. Then the practice ("squad") profile, unless the
free-for-all latch has fired: that latch fires when, for 5 decisions in a row (0.5 s), fewer mechs are alive
than at the start minus its own kills, i.e. half a second after the first death it did not cause; it is
permanent and restores the cautious profile for the rest of the match. In practice a house bot dying in
the zone would also fire it.

**Practice profile, target choice.** A mech is a candidate if it is within 60 m, hit us in the last 6 s,
closes faster than 3 m/s within 180 m, is under 40% hp within 160 m, aims within about 12.6 degrees of us
within 190 m, or always once "late" (next circle radius at most 70 m, or 3 or fewer alive). It must have a
line from our muzzle (body centre or upper body) and be within 240 m. Lowest score wins: distance in
metres, plus 0.1 per hit point, minus 200 under 30% hp, minus 200 for the current target (refreshed every
decision it stays chosen, so it effectively never switches while the line holds), minus 40 if it hit us
in the last 4 s, minus 15 if closing.

**Ranges.** 120 m with a laser, 85 m gun only, 28 m with lightning and energy above 12; at least 64 m
from a lightning carrier and 80 m from a mortar carrier when it has no lightning itself; 58 m from drones.
Finisher: when the target is under 38%, own hp above 42% and at most two mechs counted near, the wanted
range becomes 20 m (it walks in).

**Movement.** Each decision it scores 16 points 6 m around it plus standing still: distance error to the
wanted range (1.1 per m), step cost, +45 for a line to the target from there, -30 for each other mech
within 170 m that could see our body there, zone penalties near the current and the next edge, attraction
toward the nearest cube within 40 m, a clearance penalty near walls, a bias to the current strafe side.
Strafe side flips with 60% chance every 0.3-1.0 s (mean reversal gap about 1.1 s) and at once when that
side is blocked. Gun-only and reloading: the line bonus turns negative, so it steps out of sight for the
reload.

**Fire.** Gun: four-step first-order lead including 0.075 s latency, fires when the torso after one
decision of slew is inside three quarters of the body radius and 40% of the body height, up to 96% of gun
range, no bullet-flight gate. Laser: charges whenever a mech target is inside 97% of laser range; the torso
leaves the gun lead for the direct laser aim from 45% charge; at full charge it releases only when aligned,
otherwise holds. Early release (practice profile): once 0.7 times the damage of the current charge (with
cube bonus, and the cook-off bonus on mortar carriers) covers the target's hp and the aim is aligned. With
a hidden but engaged foe it keeps the laser charging behind the wall up to 0.35 s before the engine would
fire it. Lightning inside its range and cone. Mortar: never taken.

**Retreat (practice).** Only the "losing" rule: two mechs seen within 160 m and hp under 55%, three and hp
under 80%, or hp under 35% with the target 10 points healthier; cancelled when the target is under 25%,
own hp over 20% and at most two near. The retreat lasts 1.5 s after the last losing decision (pulses, no
heal phase). In retreat: breadth-first search on the 2 m grid (up to about 100 m of path, 350 cells) for a
cell hidden from the four nearest threats, boost when energy is above 10; if none, it fights on. No
retreat when late or finishing.

**Economy.** Out of a fight: weapons within 150 m (a laser within 240 m, valued above everything), cubes
within 105 m, crates within 150 m at any time and drones seen in the last 12 s within 150 m, both only
above 50% hp with nothing engaged; nothing more than 3.2 m above ground, nothing outside the current
circle less 6 m, nothing it cannot reach before the shrink; gives up a loot target after 30 s. Crates are
shot from wherever it first has a line within 50 m. In a fight: walks to the nearest remembered cube within
70 m (40 m at half hp or less) on its path, not strafing. Weapon wish list: laser, then lightning; a
lightning is dropped for a laser, a charging laser is never swapped, the gun is kept.

**Upgrades.** Practice: two hull items first, then the two laser items, then repair, then gun items;
jets, sensors, mortar items and pierce last. Cautious profile: hull, then gun damage, repair and gun rate.

**Zone.** Goal: the point on the line to the next centre at the next radius minus 30% of it (3-30 m) minus
5 m; the centre once the next radius is 30 m or less. It must go (above fight and retreat) when outside, or
when path time (1.45 times straight distance over walking speed, plus 4 s, plus 3 s) reaches the moment the
shrinking edge, padded 8 m, passes its spot; it boosts when outside or late. With no foe it goes 14 s
earlier. It never takes zone damage on purpose (0.0 s outside in all 6 simulator matches).

**Dodge, look-around, recovery.** Sidesteps any bullet passing within body radius + 1.1 m in the next
0.7 s (blend 0.4 plan, 0.9 dodge); sidesteps and boosts (energy above 25) when a charging laser aims within
0.15 rad of it; runs from predicted shell landings. With nothing to aim at: torso to the nearest engaged
mech, else to the last damage bearing for 2.5 s, else a sweep of about 66 degrees either side of the
walking direction (period 4.8 s), else a steady spin. Stuck 0.7 s: random 0.5 s move plus jump. Answers in
0.4 ms median, 17.6 ms worst including the 0.2 s map build at start.

## 4. Black-box measurements (our simulator, squad mode, seeds 5-10, cores 2-3, 2 jobs)

Runs: `tools/top5/kanya_runs/` (json, traces, logs, `metrics_k6a.txt`, `extra.txt`); metric scripts
`tools/top5/giddy_metrics.py` (teammate's) and `tools/top5/kanya_extra.py`. Same seeds for our in-tree bot
(`bot/`) as the yardstick. The simulator mispredicts absolute scores (this build: 7.17 here, 6.06
officially; teammate's seeds 1-6 gave 4.67) and within-bot deltas; use it for behaviour, not for scores.

| Measure | Kanyaraasi 6a17c49 | our in-tree bot |
|---|---|---|
| Score (16 - place), mean +- se | 7.17 +- 1.30 | 2.50 +- 0.67 |
| Time alive (s) | 58-130, mean 96.5 | 70-148, mean 97.5 |
| First shot at a mech, median (range) | 15.8 s (11-33) | 38 s |
| First kill, median | 22.9 s | 43.9 s |
| Damage dealt per minute alive, median | about 6.8 k (3.3-8.4 k) | about 2.5 k (1.1-5.5 k) |
| Damage taken per minute alive | 1.3-2.1 k | 0.7-1.6 k |
| Gap between its kills once started, median by match | 5.3-8.9 s | 4.6-14.7 s (3 matches) |
| Cubes at 60 s / 120 s (alive only) | 7.8 / 15 | 1.7 / 2 |
| Upgrades at 60 s / 120 s | 3.0 / 5 | 1.0 / 1 |
| Laser in hand | 4 of 6 by 6-14 s, one at 42 s, one never (lightning) | 2 of 6 by 7 s, one at 144 s, three never |
| Laser shots | 96 (one per 4.6 s with a laser in hand), 25% released early, 91% hit a mech | 21, 81% hit |
| Range of its damage (q25 / median / q75) | gun 47 / 62 / 103 m, laser 53 / 81 / 130 m, lightning 29 / 34 / 40 m | gun 39 / 59 / 90 m, laser 29 / 46 / 58 m |
| Victim distance in fights, median by match | 53-114 m | 32-90 m |
| Mechs within 150 m, median | 1-2 (4 in one match) | 1-4 |
| Farming (crate/drone shots, no mech contact) | about 6 s per match; 1.0 crate and 1.3 drones destroyed | about 6 s |
| Speed in fights, median | 9-11.7 m/s (strafing, seldom boosting: 7% of decisions) | 11.7 m/s |
| Laser charging | 10-16% of decisions | 0-13% |
| Outside the zone | 0 s | 0 s |
| Death causes | lightning 3 (28-39 m), gun 2 (58 and 110 m), laser 1 (64 m); 7-8 hunters alive in 4 of 6 | lightning 3, gun 2, mortar 1 |

Loadout over time: gun only at spawn; gun + laser at 6.0, 9.6, 10.3, 14.3, 41.6 s; lightning first in three
matches (2.3, 31.7, 34.1 s), replaced by a laser within 4-8 s when one turned up (twice). Health: it spends
3-36% of its life under half hp, i.e. it keeps fighting while damaged; the retreat pulses show as many short
back-offs (24 runs away from the latest attacker, median start at 76% hp, most of them range keeping).
Late zone and the last few alive cannot be observed in squad runs (it is dead by 58-130 s, after 7-12
kills, swamped by the growing hunter pack); section 3 gives the code's late rules.

## 5. Why it scores above 6 (practice)

| Feature | Evidence | Grade |
|---|---|---|
| The controller family (positional scoring with an exposure penalty, sticky low-hp focus, laser-first, short "losing" pulses, zone first) | Same team, same packaging, one run each: TTUN family 5.19-5.31, this family 5.60-6.06. | official; bundle |
| Early lethal laser release | 5.60 to 5.79 on an otherwise unchanged deterministic controller | official one-change; clean |
| Focus retune (current-target 200, hp weight 0.1, low-hp 200), finisher 20 m, band 120 m, no opening phase | 5.83 (team fork) to 6.06 (upstream) | official; bundle of five |
| Finisher alone (14 m) | 5.81 to 5.83 | official; inside noise |
| Quiet supply-drop detour | 5.79 to 5.81 | official; inside noise |
| Fast, early, continuous damage | simulator: first mech shot 15.8 s against our 38 s; 3x our damage per minute; 7.8 cubes by 60 s | simulator, behaviour |
| Determinism | identical code 6.06 = 6.06 for two teams | official |

The mechanism in plain words: practice score counts house bots that die before we do. This bot turns every
early contact into a kill quickly (sticky target, low-hp bonus, partial-charge kill shots, walk-in finisher),
takes the dropped cubes during the fight, stays where few other mechs can see it, and only backs off for a
second and a half at a time when actually outnumbered or out-healthed. It dies to the swarm in the end, but
after 7-12 kills.

## 6. Lessons for our practice play (adopt, with evidence)

1. **Early lethal laser release.** Release a partly charged beam once about 0.7 times its damage at the
   current charge (cube bonus included, cook-off on mortar carriers) covers the target's hp and the aim is
   on. Official +0.19 as a single change on a deterministic controller, the cleanest number in this study.
   With 315 full damage and a 35% minimum, it frees the laser up to 0.6 s earlier on every kill shot. [1,
   official, clean]. Doctrine V4 has no such rule (D5 only scores finishable targets).
2. **Commit to the target and finish it.** Current target worth about 200 m of distance, targets under 30%
   another 200 m, health weight about 0.1 m per hit point, and walk in to about 20 m when the target is under
   38% while we are above 42% and at most two mechs are near. Part of the official +0.23 bundle; the 14 m
   finisher alone was +0.02. D5's "stickiness 30%" is far weaker than this. [official bundle + top bot's choice]
3. **Shoot early, keep shooting.** Its first shot at a mech comes at 15.8 s against our 38 s and it deals
   2.7 times our damage per minute on the same seeds; laser-first pickup with a 240 m seek radius (laser
   above lightning, lightning dropped for a laser, never a mortar) puts a laser in hand by 6-14 s in most
   matches. Farming is minor (about 6 s per match); cubes come from kills plus the 70/40 m cube grab during
   fights. [simulator behaviour + top bots' choice; agrees with D6/D7]
4. **Retreat only while losing, in 1.5 s pulses, no heal phase in practice.** Two near and under 55%,
   three near and under 80%, or under 35% against a healthier target; cancelled when the target is under
   25%; never when late. When no cover cell exists, fight on. D3's thresholds are close (50%/60%); the
   difference worth one preset is the 1.5 s pulse instead of a heal state, and 80% with three near. [top
   bots' choice; the 5.58 bot lost 0.41 without low-hp retreat]
5. **Make the bot deterministic and use that for A/Bs.** Seed every random draw from the hello seed, no
   clock-dependent work: identical code then scores identically (6.06 and 6.06), so a one-change
   submission measures that change exactly on the 48 matches (the TTUN family, which cuts work by the
   clock, scored 5.10 and 5.19 with identical files). A different salt is then the only way to get a new
   draw. [official]

Also worth a preset each (top bot's choice, no clean A/B): score candidate steps by how many other enemies
would see us there (-30 per extra viewer within 170 m); step out of sight while the gun reloads when we have
no laser; laser band 120 m (D2's 150 m stays contested); zone deadline with 3 s spare and a 1.45 path factor
above fighting. Not to copy: no bullet-flight gate on the gun (D2's 0.55 s gate is better founded); the
blind 20 s opening and the 0.5 s free-for-all latch (D12's three-death latch is safer for practice).

## 7. Free-for-all behaviour

There is a latch but no separate free-for-all brain: after the first foreign death (0.5 s) it goes back to
the cautious profile used in the first 20 s, permanently. In a final that is nearly the whole match (the
bottom half of a real final dies in a median 21 s; if nobody has died by 20 s it plays the aggressive
practice profile until the first death).

Cautious profile:
- Engages a mech only if it is within 60 m, hit us in the last 4 s, aims a charging laser at us (about
  12.6 degrees) within 120 m, has under 350 hp within 120 m, or when 2 or fewer are alive. Everything else
  is ignored. Target score: distance plus about 0.04 per hit point, minus 40 for an attacker, minus 15 if
  closing; line of sight and 215 m required. No stickiness, no low-hp bonus, no early laser release.
- Corner fighting: while its weapons are not ready (gun reloading and no hot laser) it prefers points out of
  sight of its target, with a bonus for points next to the edge of the target's sight, on two rings (6 and
  12 m); it hides harder when a charging laser points at it.
- Ranges 85 m for gun and laser, 28 m with lightning.
- Retreats below 38% hp with a threat in the last 2 s, or when three mechs are in view, two at under 65% hp,
  or a laser carrier beyond 55 m faces it while it has none and is under 80%; comes back above 80% (or 55%
  after 7 quiet seconds).
- Hit by a mech it cannot see: runs to cover from the damage bearing, boosting above 30 energy, torso on the
  bearing for 2.5 s. It does not hunt the shooter.
- Without a target: loot within 90 m (crates only before 150 s and above 70% hp), else walk to a "home": a
  low-exposure point inside 70% of the next circle, away from known mechs (80 m) and drop rings, re-chosen
  every 12 s, walking at 4.6 m/s when nothing has happened for 6 s.
- Late (3 or fewer alive, or next radius at most 70 m): no retreat and no hiding from unseen shooters; with
  2 alive it engages anything it sees within 215 m.

Measured (teammate's simulator free-for-all, 4 copies of 601c7a6 among house bots, seeds 101-104): places 1,
1, 4, 5; first shot at a mech median 56 s; 207 s alive on average; standing still 38% of the time. A strong
final bot: it avoids the early brawl and arrives late with a laser and cubes.

## 8. How to recognise it in a match

- Gun always; second weapon laser (lightning only until a laser turns up, then swapped); **never a mortar**.
- Early and after the first foreign death: does not react to us beyond 60 m while we leave it alone; walks
  slowly (4.6 m/s) between quiet spots well inside the next circle; torso sweeps about 66 degrees either side
  of its heading every 4.8 s, spins when standing.
- Our charging laser pointed within about 9 degrees of it: an immediate sidestep with a boost.
- Our bullets passing near it: a sidestep blended into its movement; in its own fights it strafes with
  reversals every 0.3-1.0 s at 9-12 m/s and almost never boosts.
- With a target: laser charging flag up continuously while in range, beam at full charge when aligned (or
  early on a weak target in the practice profile); gun bursts of 12 out to about 220 m, no flight-time gate.
- During its 2.4 s gun reload (gun-only) or while its laser cools, it slips out of sight 6-12 m and comes
  back when ready (cautious profile).
- Hit from out of view: it boosts to cover from that bearing and stays there; it does not come.
- Name "giddygiddyboy" in logs (both teams).

## 9. Counters (free-for-all), ordered by expected gain

1. **Leave it out of our fights early.** Trigger: the signature in the first 20 s or after the first
   foreign death. Action: keep more than 60 m from it, do not hit it, do not point a charging laser at it
   inside 120 m, keep our hp above 350 while within 120 m of it. It will not engage, and we keep our health
   for mechs that do. Backfire: if fewer than 3 are alive it engages anything; plan the endgame (counter 5).
2. **Off-axis laser charge.** Charge with the torso at least 0.25 rad (14 degrees) off its bearing and swing
   on in the last decision before release (our torso turns 4 rad/s, so 0.25 rad takes 0.06 s). This defeats
   both its laser sidestep (0.15 rad) and its "aimed charging laser" engagement trigger (0.22 rad), so the
   first beam lands and, beyond 60 m, it was not even hostile before it. General rule: safe against any bot
   that reacts to the charging flag plus aim.
3. **Hit and hide, it does not hunt.** From outside its 120-degree view and beyond 45 m: beam, then break
   the line within 0.5 s (its torso reaches our bearing within 0.1-0.8 s). It runs to cover from the bearing
   and stays; each hit restarts its 5 s regeneration delay. If its torso finds us while we are visible, it
   counts us as an attacker for 4 s: hide at once. Bound: two beams per peek cell, abort when it closes inside
   90 m.
4. **Use its low-health vulture rule as a filter.** It engages any mech under 350 hp within 120 m. After any
   fight that leaves us under 350, put more than 120 m or a wall between us and it before regenerating.
   Conversely a mech under 350 near it draws it out of its hiding spot: that is the moment for a third-party
   beam on it (counter 2).
5. **Endgame (3 or fewer alive, or next radius at most 70 m).** It never retreats, holds 85 m with gun and
   laser, releases only at full charge in this profile, and fires the gun at any range. Hold 120-150 m from
   hard cover: its bullets beyond about 110 m are dodgeable with D4, its beam needs a line at release, and
   it holds a full charge until aligned, so peek right after its beam (1.65 s cooldown plus 0.75 s charge =
   about 2.4 s free). With 2 alive it comes at us across open ground: lay the beam on its approach.
6. **Predict its rotation.** It leaves fights when its path time plus 3 s reaches the shrink deadline,
   travels the straight line to its own side of the next circle (the next radius minus 30% of it, at most
   30 m, minus 5 m; the centre when the next radius is 30 m or less), never waits outside. Pre-position with cover on that line;
   travelling, it never looks more than about 126 degrees off its heading: approach from behind.
7. **Three in view makes it leave.** In the cautious profile, three mechs in view (or two when it is under
   65%) send it to cover. In a three-way it will usually be the first to disengage: do not chase; shoot the
   one that stays.

Counters 1, 2, 3, 6 are safe as general rules against any mech with this look; 4 and 7 are specific to
this family.

## 10. Limitations of this study

- Scores between 07:51 and 16:37 UTC come from the team's own READMEs (one official run each), not from the
  board; the 09:04 run of the newer upstream (d03d32e) has no stated score.
- The +0.23 from the upstream retune is a bundle of five changes.
- Six simulator matches; the simulator mispredicts scores, and seed-to-seed spread is large (sd 3.2).
  The late zone and last-few-alive behaviour were read from code, not observed.
- The free-for-all numbers are a teammate's 4 simulator matches with copies of the same bot among house bots,
  not a real final.

## 11. Files

- Scored source (read-only clone): `intel/devakchow__team-kanyaraasi-mech-royale_6a17c49/`; history:
  `intel/_meta/devakchow__team-kanyaraasi-mech-royale.git`; all READMEs by commit: `intel/_kanya_readmes/`;
  brain files compared: `intel/_kanya_brains/` (upstream 345c0de, d03d32e, 601c7a6, d5b5657; team fork
  24d68e5; the 5.31 TypeScript file).
- Sandbox entry: `/srv/mech-sparring/kanyaraasi_6a17c49/mechbot`, command `_cmd/kanyaraasi_6a17c49`; roster
  addendum in `notes/sparring_roster.md`.
- Runs: `tools/top5/kanya_runs/` (kanya6a17_squad.json, ours_squad_5_10.json, trace/, logs/,
  metrics_k6a.txt, extra.txt); blob map `tools/top5/kanya_giddy_blobs.txt`; script `tools/top5/kanya_extra.py`.
