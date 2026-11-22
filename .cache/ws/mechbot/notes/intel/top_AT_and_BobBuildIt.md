# AT (rank 3, 5.52) and BobBuildIt (rank 6-8, 5.27): identity check, behaviour from recorded matches, counters

Written 21 Nov 2026 about 06:40 UTC. Clean-room note: nothing from another team's repository was executed
or copied. Behaviour numbers below come from my own scripts (`tools/top10/sd_*.py`) run over the public
showdown recordings that another team published as data (`intel/shaunkar1__proj1-agentboard/recordings`,
11 complete 16-mech free-for-alls, 10 frames a second, every mech named). Raw script output:
`notes/intel/top_AT_and_BobBuildIt_data.txt`.

## 0. Headline

- **Neither repository was found.** Every candidate with a commit shortly before the two submission times
  was checked and discarded or left as a weak lead (section 1).
- **The behaviour is now known far better than before**, because the recordings contain AT in 11 matches
  and BobBuildIt in 10, with a different container image each hour (so the 11 PM ET matches show the
  builds that hold today's scores: AT's 5.52 and BobBuildIt's 5.27).
- **Neither bot has a free-for-all mode.** Both shoot from the first second, at any healthy mech, in every
  recorded match. AT: places 13, 4, 5, 1, 16, 15, 16, 1, 3, 16, 8 (mean 8.9, 7.1 points). BobBuildIt:
  15, 7, 10, 3, 4, 13, 5, 6, 14, 11 (mean 8.8, 7.2 points). A mech that only survived would average 8.5.
- AT is a **laser + lightning chaser with a continuously spinning torso**: it wins (2 of 11) when it gets a
  laser in the first seconds and snowballs, and dies inside 8-22 s (5 of 11) when it is shot while walking
  in a straight line to a pickup. BobBuildIt is a **gun + laser long-range trader** that accepts every
  duel at 90-140 m in the open and loses most of them (dead in all 10 matches, mean life 66 s).

## 1. Identity: what was re-checked

### Score histories (reconstructed; only the best time is on the board)

| Team | Score | When (UTC) | Source |
|---|---|---|---|
| AT | 5.17 | by 00:55 | another team's research note written before its 01:18 commit |
| AT | 5.23 (inferred) | by about 02:00 | two teams' notes give "top 5.23, then 5.19, 5.19" at 94 teams; ranking order in a third note needs AT above 5.19 then |
| AT | 5.40 | by 02:40 | a team log ("Rank 1 AT 5.40", 108 teams) |
| AT | 5.48 | by 02:55 | r1ver's notes (5.48 = 263 place-points over 48 matches) |
| AT | 5.52 | 03:43:50 | leaderboard (= 265 points) |
| BobBuildIt | 5.17 or 5.19 | by 01:18 | board snapshot "5.19 (two teams), 5.17" at 74 teams: those three must be Wolverines, AT, BobBuildIt, because any team at 5.17+ then is still in the top three at 02:55 |
| BobBuildIt | 5.25 | by about 02:25-02:44 | "leader 5.25" at 103 teams; r1ver's 02:55 note |
| BobBuildIt | 5.27 | 03:03:29 | leaderboard (= 253 points) |

Image ids in the recordings agree: AT ran four different images at 8, 9, 10 and 11 PM ET (01:00-04:00
UTC), BobBuildIt three at 9, 10 and 11 PM. "at" on the board is the submission time, not the scoring time
(a confirmed pair elsewhere has a commit 22 s before its "at"), so a commit must precede it.

### AT: repositories with a commit in the 8 minutes before 03:43:50, and why each fails

Listed by `tools/top10/at_bob_window.py` / `at_bob_anchors.py` (about 60 repos have a commit in that
window; timing alone is noise). Extra requirements used: a working bot before 00:55, commits before the
02:40 and 02:55 scores, no contradicting text.

| Repo | Gap to 03:43:50 | Verdict |
|---|---|---|
| colton-boi/Mech-Bot | 129 s | Fits all four AT times, but its own commit text says its bot scored 2.56 at 00:50-01:03. Discarded. |
| AbhirajTiwari12/mech-royale-bot | 251-261 s | Initials match and a batch of variants was pushed 4 min before. Against: its base version stayed the same from 02:10 to 03:46 while AT improved twice in that time; its two upgrade orders rank the leg-speed and energy upgrades near the bottom while AT picked them repeatedly; its line is "hyper-aggressive", which fits the recorded booster 314159265 (41% boosting, 36 s life), not AT (8% boosting). Stays with 314159265 (medium). Not AT. |
| Kgc3105/MAGIC-Royale (A-bot LLC's code) | none (last commit 03:30) | Same long-range-laser idea, but no commit between 01:45 and 03:13 while AT's score moved twice; its idle torso turns at 3.5 rad/s in the recordings, AT's at exactly 4.0. Not AT. |
| Kyt0V0/Mech-Royale | 340 s | Experiment batches at the right times, but it later made its 02:27 "no hunting" experiment the standard bot, which fits a best time that never moved after 02:30 (ImagineLosing), not a team that improved at 02:5x and 03:43. |
| skandra08, alexwilldev, fernando-ace, dmclaughlin-bit | 25-300 s | Their own notes state real scores of 1.3-3.9 at those hours. Discarded. |
| Warrior-hound/mech-royale | 37 s | Work-in-progress commits with simulator numbers only (about 1.8 in its own simulator), nothing between 02:26 and 03:08. No positive evidence. |
| anthonyteti/buildathon-* (four repos) | created 2-16 s AFTER 03:43:50 | The same-second coincidence plus the initials make a personal link to team AT likely (all four of AT's bests stop at 03:43:50; team "Anthony Teti" appears afterwards). But the code there is a fresh build from 03:52 on (best 4.50), it scans its torso with a slow sine sweep, not AT's spin, and no text mentions AT's scores. It is not the 5.52 bot. |

Upgrade-order test (`tools/top10/upgrade_fingerprint.py`): the 13 upgrade picks AT made in its two wins
were scored against every ordered upgrade list found in 112 cloned repos (237 lists). The best real list is
no better than the best of 2000 random orders, so no public repo in the set reproduces AT's picks.

Fingerprint for a later search: AT's idle torso advances exactly 0.40 rad per decision (4.0 rad/s, the full
turn rate), counter-clockwise, pitch 0.00, in runs of 7 s (median) to 32 s. The other spinners in the recordings
(Mustikas, BackwardsDeployeds, A-bot LLC, and r1ver for part of its time) turn at 3.5 rad/s. A bot whose idle code turns at the full
rate is the thing to look for. One cloned repo has such a spin as a switch (KennethLei1492), but its own
notes give real scores of 4.52 and 3.88, so it is not AT.

**AT: repository not found. Confidence in any candidate: none (anthonyteti = probable person link only).**

### BobBuildIt: repositories with a commit in the 8 minutes before 03:03:29

| Repo | Gap | Verdict |
|---|---|---|
| nguyenphuquang1234567/kestrel | 22 s ("v4") | Quiet repo (10 commits), tight hit, but the repo was created at 02:27:50 and BobBuildIt already held 5.17+ by 01:18. Contradicted; coincidence (a second repo, alex-vizn, has a commit 26 s before the same time). |
| alex-vizn/mech-royale-bot | 26 s | Its own 03:48 commit says its later rule stacks "scored worse" than its 02:06 build, so its best is not from 03:03. Discarded. |
| suzhuhui-hub/oval-warden | 99 s | README names the team: "Urban-Ers". Discarded. |
| amoorgy/mech-royale-bot (+ "-b", described as a second submission slot) | 113-138 s | Weak lead. A simple reactive pilot from 00:33, two "noise probe" re-submissions of it at 01:57 and 02:01, then one-switch variants pushed at 02:08, 02:48 and 03:01, then silence: this matches a score ladder that moves one place-point at a time (5.23?, 5.25, 5.27) and a best that never moved after 03:03. Against: no text, the code is about 740 lines with no cover logic or crate farming, and the recorded BobBuildIt picks up lasers and shoots crates from second 0-1, which the head version of that repo does only within short reach. Not accepted. |
| mahathio/mechfight | 215 s | Three tiny trial bots and a broken image command. Discarded. |
| VivekRnx/bob-the-builder-2026 | none 01:00-04:21 | Different mech ("Bob the builder" sits in the 8 PM recording, BobBuildIt does not). |

BobBuildIt's first high score equals Wolverines' 5.19 within about 20 minutes of it, which usually signals
shared code; the recordings do not support that here (Wolverines idles differently, farms far more: 6.4
cubes at 60 s against BobBuildIt's 2, and keeps a different range). Treat as a coincidence of values.

**BobBuildIt: repository not found. Weak lead: amoorgy (timing and experiment pattern only).**

## 2. AT: how it plays (11 recorded free-for-alls, 891 s of play)

Opening
- Fires in the first 0.35-0.85 s in 7 of 11 matches: at a crate within 31 m, a drone at 45-76 m, or a mech
  at 93-119 m (first mech-on-mech hits at 2.0 and 2.3 s). No opening guard, no free-for-all detection.
- Walks at full speed (78% of its time at walking speed, 8% boosting, 10% still, 5% airborne) in a straight
  line to the nearest weapon: laser in hand at 3.4, 4.0, 5.2 s when one lay 42-56 m from spawn; at 11 PM it
  walked 10 s in a straight line to a laser 118 m away while two mechs shot it, and died 1 s after taking it.
  It takes whatever is nearest (a mortar twice) and swaps later; it swapped its gun for a laser while under
  fire at 98 m and never fired again (1 s equip + 0.75 s charge).
- End loadout laser + lightning, gun dropped (6 of the 7 matches in which it found a second weapon; gun
  dropped at 5.8, 17.4, 30.6, 30.9, 30.9, 62.6 s).

Torso
- Idle: spins at exactly 4.0 rad/s counter-clockwise, pitch 0, 63% of its whole life, one revolution every
  1.57 s. With a 120 degree view wedge it sees every direction inside 200 m every revolution; its back
  faces any given direction half of the time (rear hits deal 1.5 times damage; it dealt such a 472 itself).

Weapons and ranges
- Laser: starts charging at any mech it sees (median 104 m, 90th percentile 193 m), releases at full charge
  (0.75 s, 90th percentile 0.90 s), then every 2.4 s. 39 of 44 beams aimed at a mech hit (89%; field 69%).
  Beam length on hits: median 99 m, 10-90% range 43-168 m. It keeps moving while charging (median 7 m/s).
  The charging flag is set only 10% of the time it holds a laser: no pre-charging, so the flag is a real
  0.75 s warning.
- Gun (when it still has one): rounds at mechs mostly inside 125 m; 53-55% hit at 75-125 m, 0 of 22 hit
  beyond 125 m. With only a gun it often does not answer fire from beyond about 100 m: in 12 of 18 cases
  where another mech hit it first it landed nothing back within 10 s.
- Lightning: hits at 22-42 m (median 36).

Movement in a fight (own closing speed toward the current opponent, + = approaching)
- Laser + lightning: +9.8 m/s at 140-200 m, +3.4 at 100-140, +5.3 at 70-100, +11.7 at 45-70, +13.1 at
  30-45 (approaching in 100% of samples from 30 to 70 m). It chases into lightning range.
- Laser only: +9.2 at 70-100, +6.9 at 100-140. Gun only: holds about 70-100 m, moves away beyond 140 m.
- By health: +6.3 above 60% hp, +1.2 at 40-60%, -1.1 at 25-40%, +2.2 below 25% (finishing). It never
  really retreats: 30 s were spent below 35% hp under fire, still hitting a mech in 46% of that time,
  boosting in 12%. It went to 47 hp to finish one kill.
- Strafe reversals every 0.7 s (median; quartiles 0.4-1.3). Standing still in 11% of fight time.
- Roofs: it jets onto roofs; at 11 PM it stood 10 s on a 15 m roof, aiming at a mech 104 m away, firing
  nothing (gun only) and not moving, and died there.

Targets
- 19 of 22 engagements it started were on the nearest mech. All 13 engagements it initiated fit one rule:
  target inside about 125 m, or target below 80% hp at any visible range (examples: 56% at 159 m, 61% at
  206 m, 46% at 166 m). 43% of its hits land on mechs below half hp. 7 of 22 targets were already fighting
  a third mech. Typical time from its first beam to the kill: 4-12 s.

Economy and growth
- Cubes at 60 s when alive: 3, 3, 6, 8, 8; at 120 s: 4, 11, 13, 18, 21. Max hp 1568-2296 at 60 s and
  1868-2592 at 90 s; beam damage grows from 315 to 441-655 by 110-140 s. Upgrades taken over all matches:
  armour 4, plating 4, leg speed 4, laser damage 4, regeneration 2, lightning range 2, lightning
  efficiency 2, five others once each.
- Shoots crates and drones whenever idle (19% of idle time), collects its victims' cubes within 2 s.

How it dies (9 deaths)
- Five times inside 22 s (7.6, 8.2, 11.2, 15.9, 21.8 s): shot at 68-160 m while walking straight to a
  pickup or shooting a crate, two attackers in four of the five, little or no return fire.
- Three times by the same stronger laser bot (Mustikas) at 98-160 m after 132-211 s: once while AT was
  shooting someone else, once without replying for 7 s, once in a plain laser duel it lost (441-544 per
  beam against its 365).
- Once standing on the roof (above), also to a laser at 104 m. All four later deaths are laser kills.
- 29 of 44 beams aimed at it hit (66%, field average): it has no working answer to a laser.
  Another team's source notes say they saw the then number 1 bot "hide close by to reload/charge, then
  return to the duel spot", so some cover use exists; it does not show in the hit rate.

Build by build: the 8 PM image did not fire in the first second; the 9, 10 and 11 PM images did. The 11 PM
image (the 5.52 build) played two matches: 16th (11.2 s) and 8th (50.5 s). No sign of a changed style.

## 3. BobBuildIt: how it plays (10 recorded free-for-alls, 655 s of play)

- Loadout gun + laser; it keeps the gun. Laser held in 6 of 10 matches (at 2.2, 2.6, 6.2 s when one lay
  27-70 m from spawn, otherwise at 22-54 s), gun only in 3, gun + lightning in 1. It replaced a lightning
  with a laser once and never dropped the gun.
- Fires in the first 0.15-0.75 s in 5 of 10 matches; first hit on a mech at 0.6-9.1 s in 8 of 10. Seven
  engagements started by it in the first 20 s, at 81-141 m, six of them on mechs above 78% hp.
- Gun: opens fire out to 200 m (median 120 m, 90th percentile 198 m). Hit share by range: 92% at 45-75 m,
  76% at 75-100, 44% at 100-125, 46% at 125-150, 35% at 150-200, 0 of 40 beyond 200 m (against targets
  that mostly did not dodge).
- Laser: released early (median 0.60 s, 10th percentile 0.30 s, so about 60-85% of full damage), 27 of 44
  beams aimed at a mech hit (61%); beyond 150 m only 1 of 13 charges ended in a hit. It starts charges at
  targets beyond its range.
- Range keeping: with the laser it backs away from anything inside 100 m (-6.8 m/s at 45-70 m, -2.2 at
  70-100) and holds 100-200 m; with the gun alone it holds about 70-140 m. It does not chase.
- Answers fire fast: 11 of 14 first aggressors were hit back, median delay 0.8 s. Strafe reversals every
  0.9 s (quartiles 0.4-1.6). Engaged 41% of its life; 35% of its idle time it is shooting crates or drones.
- Torso: no spin (median idle turn rate 0.5 rad/s).
- Low health: 55 s below 35% hp under fire, still hitting in 64% of that time, boosting in 28%: it backs
  off shooting, it does not hide.
- Economy: cubes at 60 s when alive: 1, 2, 2, 4. Max hp at 60 s 1456-1739.
- Deaths: all 10 matches, mean life 66 s (13.9-206 s). Seven are lost 1-on-1 exchanges, six of them at
  110-161 m with a gun or gun + laser mech; 30 of 38 beams aimed at it hit (79%, worse than the field);
  it was standing still at death three times.

## 4. Why they score in practice (inference only: no logs, no source)

- AT (5.52): early laser, 89% beam accuracy, relentless kills and immediate cube collection give it the
  kill rate practice rewards (practice score is roughly house bots killed before dying). Health growth from
  cubes (2000+ hp by 90 s) lets it out-trade single hunters. All measured in free-for-alls, not practice.
- BobBuildIt (5.27): fights every mech at 100-140 m, where the house aimers hit 32-57%, answers within
  0.8 s, and keeps the gun running between beams. Its economy is weak, so its practice score comes from
  range and volume of fire.

## 5. Lessons for our practice bot (number, evidence grade, relation to DOCTRINE V4)

1. Laser + lightning with the gun dropped and "approach while lasering, finish inside 45 m" is what the
   5.52 bot does (closing +5 to +13 m/s inside 100 m). Grade: one top-3 bot, seen in free-for-alls only,
   no A/B. Disagrees with D7 (SQUAD keeps the gun) and with D2's default of holding 150 m with a laser; it
   supports making "L+Z close" a named preset to try once on the real scorer, not a default.
2. Release the laser at full charge with the aim settled: AT 0.75 s and 89% hits; BobBuildIt 0.60 s and
   61%. Grade: two bots, 88 beams. Agrees with D8.
3. Laser detour at spawn: AT has one at 3.4-5.2 s when it lies within 42-56 m. Agrees with D6 (60 m).
   Longer rushes killed it (118 m walk at 11 PM). Keep 60 m; never walk a straight line under fire.
4. Travel must stay reactive: 5 of AT's 11 matches ended inside 22 s because it kept a constant velocity
   under fire and did not answer. Agrees with D4 (bullet-aware dodge); add "any hit while travelling
   cancels the pickup trip unless cover is on the way".
5. No weapon swap while a mech that hit us in the last 3 s has a line of fire (AT lost a duel during the
   1 s equip). Not in the doctrine yet; one observation.
6. No roof stops: AT died motionless on a roof. Agrees with D6 (no roof loot, [S]).
7. Long-range gun play: BobBuildIt fires to 200 m and fights with the gun at 100-140 m and still holds
   5.27. Mild disagreement with D2's 75 m gun band and the 0.55 s flight-time gate (about 138 m). Grade:
   one bot, free-for-all data; D2's evidence is stronger. Keep D2, note as a possible preset.
8. Idle torso spin at the full turn rate (AT, 63% of its life) gives all-round sight every 1.57 s. One
   mid-table team bundled a spin with three other changes and lost 0.64, so there is no clean number.
   Grade: weak. If adopted, stop the spin the moment anything is tracked (rear arc costs 50% more damage).
9. Economy is not the whole story: BobBuildIt holds 5.27 with 2 cubes at 60 s; AT holds 5.52 with 3-8.
   Agrees with D6 that farming is worth 0.3-0.6 and not more.

Design cautions for our own rules (found while reading these two)
- D0 calls a mech hostile when it "aims within 12 degrees of us". A spinning torso sweeps across us for
  one decision every 1.57 s. Spinners are common (share of life turning at 3 rad/s or more: AT 64%,
  Mustikas 54%, BackwardsDeployeds 46%, r1ver 43%, 404 36%). Require the aim to stay within 12 degrees for
  3 decisions, or a turn rate under 1 rad/s, or the charging flag.
- D11 says "never be visible below 55% hp". AT opens on any mech below about 80% hp at up to 200 m. Against
  the spin signature use 80%.
- Recorded timing of the free-for-all field: first mech-on-mech hit at 0.6-1.7 s in every match; 4-11 of
  16 mechs have been hit by a mech by 10 s; first death at 6-17 s; third death at 11-19 s (median 16 s, so
  D12 latches about then); 7-12 alive at 40 s; 4-8 alive at 90 s. The first 15 s need a rule of their own:
  from spawn, break the sight line to every visible mech before anything else.

## 6. Limitations (checkable)

AT
1. No free-for-all switch: shoots at second 0.35-0.85 (gun heard to 320 m).
2. Straight-line, constant-speed travel under fire with no dodge and no reply: 10 gun hits in 2.5 s from
   111-141 m in one match.
3. Gun-only phase is harmless beyond 125 m (0 of 22) and often silent beyond about 100 m.
4. Spinning torso: back exposed half of every 1.57 s; only 10% of hits on it were rear hits so far,
   because nobody times them.
5. No answer to lasers: 66% of beams aimed at it hit; it walks at a steady 11.7 m/s when hit.
6. Chases into 45 m regardless of who else is near; took 4262 and 4337 damage in two matches it lost.
7. No real retreat or healing discipline; no avoidance of stronger mechs (killed three times by the same
   one).
8. Nearest-mech target rule: it can be handed to somebody else.
9. Weapon swap under fire; mortar carried for 3-12 s (cook-off window); motionless roof stop.
10. The game gives it only 5 s of tracking after a sight line breaks.

BobBuildIt
1. No free-for-all switch; opens with the gun at up to 200 m, which tells everyone where it is.
2. Takes symmetric duels in the open at 90-140 m; no cover use visible; 79% of beams aimed at it hit.
3. Early laser release: 61% hits, reduced damage; almost nothing lands beyond 150 m.
4. Gun effectiveness falls to 35-46% beyond 100 m even against targets that do not dodge.
5. Retreats from anything inside 70 m, so it can be pushed off ground but not caught; it never hides.
6. Weak economy: 1-4 cubes at 60 s, about 1500-1700 hp when others have 2000+.
7. Stands still in 16% of fight time.

## 7. Signatures (from id, position, velocity, aim, hp, max_hp, cubes, weapon kinds, charging flag)

AT
- Aim yaw rising by 0.40 rad every decision (full turn rate), counter-clockwise, pitch 0, for 1 s or more,
  while the mech walks at 11.7 m/s or faster in a straight line.
- Weapon kinds: laser + lightning and no gun (from 6-60 s on); before that gun only, heading for a pickup.
- Charging flag for exactly 0.7-0.9 s, then a beam; next charge 1.65 s later.
- With a target: range to its target shrinking at 5-13 m/s inside 100 m; boost for the last 15 m to 45 m.
- Cubes 3-8 at 60 s, max hp above 1550 at 60 s, above 1850 at 90 s.
- Gunfire or beams from second 0-1 of the match at crates and drones.
- Same class: Mustikas (spin at 0.35 rad per decision, laser + lightning, mean place 6.3).

BobBuildIt
- Gun opens on us from 120-200 m within about 1 s of first sight; weapon kinds gun or gun + laser.
- No torso spin; charging flag lasting only 0.3-0.6 s before a beam.
- Holds 100-140 m; moves away at about 7 m/s when approached inside 70 m; reversals every 0.4-1.6 s.
- 0-4 cubes at 60 s, max hp at most about 1750.

## 8. Counters, ordered by expected gain in a free-for-all

### Against the AT class (spinning laser + lightning chaser)

A1. Never be its nearest visible mech; never take a second beam. (General rule: yes)
- Trigger: spin signature or laser + lightning without gun inside 230 m with an open sight line to us;
  or its charging flag with aim within 0.25 rad of us; or one beam taken from such a mech. Also armed when
  we are below 80% hp inside 210 m of it.
- Action: path at once to the nearest cell hidden from it on the 2 m grid; it must be reached inside 2.4 s
  (its beam interval; boost if farther than 9 m). Keep a building between us for 6 s (5 s tracking + 1),
  moving so that either the range passes 200 m or another mech is nearer to it than we are. While it is
  inside 230 m, only use routes that keep a hidden cell within 8 m. No return fire from the open.
- Why it works: it hits 89%, every 2.4 s, from up to 190 m, and kills in 4-12 s; walls are the only thing
  that stopped its beams. It picks the nearest mech 19 times in 22 and loses track 5 s after sight breaks.
- Expected gain: it killed 12 mechs in 11 matches, 11 of them in the three matches where it got going
  (3, 3 and 5 kills); in such a match each other mech has roughly a one-in-four chance of being a victim.
  Not being one is worth roughly +0.3 to +0.8 points per match in which it survives the opening.
- Backfire: the mech is a spinner that hides in free-for-alls (BackwardsDeployeds, r1ver, 404 class): we
  lose a few seconds of farming. Bound: the rule only moves us; drop it after 15 s without a charge or shot
  from that mech, or if it carries a gun and has not closed.

A2. Rear-arc first strike, then peeks only inside its cooldown. (General rule: yes, the rear-arc release)
- Trigger: it is spinning (turn rate 3.4 rad/s or more for 1 s, so not aiming at anyone) at 90-190 m, we
  hold a laser and stand at a cover edge (hidden cell within 4 m), and either its hp is at most ours + 300
  or it is already fighting someone; no third mech with a sight line to our peek cell inside 150 m; not in
  the first 40 s unless it is already hostile.
- Action: charge behind cover (0.75 s), step out, hold up to 0.8 s and release in the first decision in
  which its aim yaw is more than 100 degrees away from the bearing from it to us (its back is turned for
  0.79 s of every 1.57 s). Beam does 1.5 times damage (315 becomes 472). Inside 125 m add 3-4 gun rounds
  led so that they arrive while the predicted yaw (yaw + 4.0 x flight time) is still in the rear half.
  Step back. After that, expose for at most 0.6 s per peek and only in the 1.65 s after one of its beams,
  with our beam already charged. At 70 m switch to A1, unless it is below 35% hp and we are above 60%:
  then hold the corner with laser and gun aimed where it must appear.
- Why it works: front armour is centred on the torso yaw and the laser is instant, so we choose the moment.
  It does not dodge beams (66% hit) and answered only 6 of 18 first attackers within 10 s (median 1.4 s).
- Expected gain: about 670 damage before it can reply (48% of a fresh mech, 30% of a 2250 hp one), then
  315-470 per peek. Its death drops all its cubes plus 2 (it carries 10-35 after 90 s).
- Backfire: a different spinner that hides and never hunts: we start a fight and make noise (beam heard
  to 380 m, charge to 140 m). Bound: at most 3 peeks, then move 60 m; quit after one beam taken.

A3. Third-party it while it chases. (General rule: yes, already in D11)
- Trigger: a laser + lightning mech closing at more than 5 m/s on another mech inside 100 m of it, we are
  at cover 100-180 m away with a laser.
- Action: beams into its side or back every 2.4 s until its aim comes within 30 degrees of us, then A1.
  Finish it only below 50% hp and collect the cubes if no other mech is within 120 m.
- Why it works: it approaches in 100% of samples between 30 and 70 m and does not look around; all four
  of its later deaths were laser kills from 98-160 m.
- Backfire: any third-party shot reveals us. Bound: cover edge, cooldown discipline.

A4. Punish the gun-only walk in the first 25 s. (General rule: no, AT-specific or third-party only)
- Trigger: weapon kinds gun only, spinning torso, velocity constant for 0.6 s at 11 m/s or more, range
  100-150 m, we are at a cover edge, nobody else has a sight line to us inside 150 m, and we hold a laser
  or someone else is already shooting it.
- Action: exact-lead gun bursts while its velocity stays constant, beams on rear windows; stop after two
  magazines, or when it shows a laser, or when it faces us inside 100 m.
- Why it works: it took 10 hits in 2.5 s this way; its own gun scored 0 of 22 beyond 125 m; five of its
  eleven matches ended like this.
- Expected gain: removes the one mech that wins 2 matches in 11; small direct gain, and it breaks our
  40 s opening guard, hence the third-party condition.
- Backfire: a look-alike that dodges and answers at 120 m gives us a bad-range gun duel and attracts
  others. Bound: stop after 6 rounds if fewer than half land, or after the first hit taken.

A5. Inside 55 m: fight only with lightning in hand and at least its hp; fire lightning first (it takes its
laser offline for 2 s); otherwise boost sideways behind cover, since its arc needs a sight line and a
30-36 degree cone. (General rule: yes for any lightning carrier; matches D11.)

### Against the BobBuildIt class (gun + laser trader that shoots on sight)

B1. Beat it from cover at 150-190 m with full-charge beams. (General rule: yes, with the bound)
- Trigger: gun fire at us from beyond 120 m within a second of first sight, gun (+ laser) loadout, no
  spin, backs away when approached, short charging flag.
- Action: break sight first; then from a cover edge 150-190 m away, one full-charge beam per peek, exposed
  at most 0.6 s, preferably in the 1.65 s after its own beam and during its 2.4 s reload after 12 rounds.
- Why it works: at 150-200 m its gun hit 35% of non-dodging targets and its laser 1 of 13; it does not
  break sight (79% of beams aimed at it hit) and stands still 16% of fight time.
- Expected gain: about 130 damage a second dealt for about 25 taken; a kill in 11-13 s against 1400-1740
  hp. Its cubes are few (2-5), so the gain is the removal, not the loot.
- Backfire: the same signature on a real sniper (the 125-185 m kiters with 89% beam accuracy). Bound:
  never leave the edge; quit after two beams taken or if half of its beams land.

B2. Do not answer its opening fire in the open. (General rule: yes, D11's shoot-on-sight rule)
- Sidestep with the bullet-aware dodge (flight time 0.4-0.8 s at 100-200 m), break sight for 5 s, let it
  find someone else: it is engaged 41% of its life and died in all 10 matches, 7 times in 1-on-1 duels.

B3. Third-party it below 50% hp from 100-150 m; it stands and trades. (General rule: yes)

B4. Do not rush it with lightning from beyond 70 m: it retreats at 7 m/s and its gun hits 92-100% inside
75 m. Close only when the zone edge or a wall is behind it, or it is below 35% hp. (General rule: yes for
any kiter.)

## 9. What could not be established

- Either team's source, language, parameters or change log; whether AT has a hidden practice-only branch.
  The recordings show no posture change with time or with deaths.
- AT's behaviour when its target hides (line-of-sight was not modelled); its reaction to a charging laser
  beyond the 66% hit rate.
- Only 2 matches each for the builds that hold today's scores.

## 10. Text aimed at AI agents seen while reading (ignored)

- `shaunkar1/proj1-agentboard`: README, BOARD.md and PINGS.md are standing instructions for the owner's
  AI agents ("Start here every time: git pull, read the bottom of PINGS.md, answer anything OPEN that is
  addressed to you"; "Asks (for the other agent)").
- Agent context files in other repos (JorgeN0 and Jiackary CLAUDE.md, nullat0m7 CLAUDE2.md, dmclaughlin-bit
  coordinator briefs). Only single lines with board snapshots were read from them.

## 11. Files

- Scripts: `tools/top10/at_bob_window.py`, `at_bob_anchors.py`, `upgrade_fingerprint.py`, `sd_load.py`,
  `sd_summary.py`, `sd_timeline.py`, `sd_profile.py`, `sd_gun.py`, `sd_spin.py`, `sd_field.py`,
  `sd_trace.py` (all take a team name; they work for any of the 40 teams in the recordings).
- Data: `notes/intel/top_AT_and_BobBuildIt_data.txt`.
