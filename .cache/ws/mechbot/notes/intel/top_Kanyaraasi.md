# Kanyaraasi (5.19; rank 8 at 05:40 UTC, rank 13 at 06:28 UTC): clean-room study and counter-tactics

Written 21 Nov 2026, about 06:50 UTC, by the clean-room analyst step. Read-only work: nothing from any
team's repository was executed, built or installed; no code, identifier, comment or constant table is
reproduced here. Short quoted phrases are evidence only. All numbers are my own description of behaviour.
No text aimed at AI agents was found in this repository (all 27 commit messages are the same four words
with an empty body; README, licence files and sources contain no instructions to tools or agents).

Repository: devakchow/team-kanyaraasi-mech-royale (public, TypeScript on Bun 1.4.4, three runtime files).
Bot name announced to the server: "TTUN-mech" (the upstream name, unchanged).

## 0. The short answer

- Kanyaraasi's 5.19 entry (commit 83e4c93) is **not its own bot**. It is the Wolverines' 5.19 controller
  (TTUN "v8-econ", b7e9a6d) with exactly one addition made by team r1ver: a walkability test on short
  straight travel legs. Kanyaraasi's README says the three runtime files are "byte-identical" to r1ver's
  commit af337d5 and that Kanyaraasi "supplies the packaging". I verified both statements by hash.
- **Counters designed for the Wolverines' 5.19 version apply unchanged.** Every fight, retreat, target,
  loot-priority, upgrade and zone rule is the same text. The one difference only affects how it walks a
  short leg while travelling (zone, roam, loot, heal), never how it fights.
- Two warnings for whoever uses the existing notes:
  1. `notes/measured_deltas.md` (row L13 and the leaderboard paragraph) and `notes/showdown_profiles.md`
     (rows for BackwardsDeployeds / "laser stand-off farmer" / "lightning closer") list Kanyaraasi as a
     fork of the Lance bot. That was true only until 05:02 UTC. The 4.77 was the Lance bot; the 5.19 is
     the Wolverines family. Kanyaraasi keeps its gun and never carries laser + lightning together.
  2. The Wolverines themselves have moved on: their newer entry (5.21 at 05:31 UTC, timestamp link only)
     adds a place-keeping phase: after two eliminations it did not cause, and while more than six
     mechs live, it stops targeting mechs and slips to cover. Kanyaraasi's entry has no such phase. A
     family member that keeps shooting after the second foreign death is Kanyaraasi or r1ver.

## 1. Identity and the scored version (re-checked)

| Evidence | Result |
|---|---|
| Text | README title is the team name; it names r1ver's repository and commit as the source of the controller, the Wolverines' repository and commit as its origin, and lists SHA-256 values for the three runtime files. |
| Hashes | The three files of commit 83e4c93, of `/srv/mech-sparring/kanyaraasi_83e4c93`, and of `/srv/mech-sparring/r1ver_ts_af337d5` have identical SHA-256 values, equal to the ones printed in the README. The kit wrapper file is also identical to the one in `/srv/mech-sparring/ttun_v8econ_b7e9a6d`. |
| Board | `web/mech_submission_times.json`: Kanyaraasi 4.77 at 03:44:05 UTC, then 5.19 at 05:05:46 UTC. Snapshots through 05:47 and my own read-only snapshot at 06:28 UTC (`tools/top10/snaps/lb_0628.html`) still show 5.19 with the 05:05:46 time. |
| Commit times (UTC) | 27 commits, all titled the same. 00:08-03:30: a multi-module Python bot presented as the team's own (not studied). 03:31:43 (d4b744c): the unmodified Lance bot with quiet walking off; 4.77 appears 12 min later (two other teams got 4.75 with the same public code). 03:54:37: Lance with one change. 04:11:27: a third team's public Python controller (amoorgy), unchanged. 04:14:25 and 04:36:58: Lance with one change each. None of these moved the board. **05:02:55 (83e4c93): switch to the r1ver/Wolverines TypeScript controller; 5.19 appears 171 s later** (r1ver's own documented commit-to-board delay is 185 s). 05:21:27, 05:32:38: two single-change experiments. **05:42:06 (fd746ff): tree byte-identical to 83e4c93 again.** 06:08:23, 06:14:08: two more single-change experiments, each on top of the unchanged base. |
| What moved the board | Nothing after 05:05:46. So none of the four later experiments has beaten 5.19 (whether each was submitted is unknown). |

Verdict: team-to-repository link **confirmed**; scored version **likely 83e4c93** (tight timing, the
revert to the same tree, the tie with the Wolverines' score; the repository itself states no score).

Habit that matters for the final: this team does not develop a controller. It packages other teams'
public controllers unchanged (Lance, amoorgy, then r1ver/Wolverines), submits them, and tries one small
documented change at a time. The entry that plays the final is whatever scored best. If the team finds
a public controller that scores above 5.19 (the 5.58 one is public, and another team reached exactly
5.58 five minutes after that repository restored it), Kanyaraasi's mech may change family before the
deadline. Re-check the board time for this team before trusting this note: any time later than
05:05:46 UTC means a different version is in play.

One thing that does not fit, and what it teaches: r1ver's receipt for the very same three files is 5.10
(245 place-points over 48 matches), while Kanyaraasi shows 5.19 (249). All three teams use the same
runtime image family. The controller spends "whatever is left of 20 ms" each decision on its path field,
with a node cap that normally ends the work first and a clock check that ends it on slow decisions. Our
own smoke test of these builds shows worst-case answers of 15-22 ms, so the clock check does trip
sometimes. The most likely reading: this controller is not strictly repeatable, and one run differs
from another by at least 0.09. The exact tie with the Wolverines is then partly luck. Every A/B on this
family smaller than about 0.1 (r1ver's +0.02 for the walkability test, their -0.11 for cube-pile
ranking) is inside that band.

## 2. What exactly differs from the Wolverines' 5.19 version

One change, in two places: a helper in the map module and its use in the movement step.

- Wolverines 5.19: when the move goal is closer than 60 m and a sight line 2 m above ground is clear,
  walk straight at it.
- Kanyaraasi / r1ver: the same, but while travelling (zone, roam, loot or heal state), standing on the
  ground at terrain height, the straight leg is used only if every 2 m navigation cell along it is
  walkable and it cuts no diagonal corner; otherwise it follows the planned distance field. If its own
  cell is marked unwalkable the test is skipped so it can walk out.
- Not affected: everything decided while it has a target (range keeping, strafing, backing off, the
  mid-fight walk to a cube or weapon, the retreat to cover), all aiming and firing, target choice, loot
  scores, upgrade order, zone rules, dodge, stuck recovery.
- Observable consequence: on short loot and zone legs near low walls, kerbs and steep banks the
  Wolverines 5.19 build sometimes walks into the obstacle, stalls 0.6 s and jump-jets; this build routes
  around. It is not a tactical difference and cannot be used to tell them apart in a fight.

Experiments Kanyaraasi tried afterwards (each alone, on the same base; README calls the last two
"unscored"): (a) drone hit-point bookkeeping; (b) with lightning held but too little energy to fire it,
aim for the other weapon instead; (c) lead the laser aim by half a decision when the sight line is clear
now and at the predicted positions; (d) charge and release the laser at drones while farming, unless the
gun would finish the drone first. If (d) ever ships, a family member that just lasered a drone has
1.65 s without a laser and announced itself to 380 m. If (c) ships, crossing its line at boost speed
gives no protection against its beam (it gives little even now).

## 3. How it plays (numbers)

One pass of fixed rules per decision; no state machine, no planner, no free-for-all detector.

- **Target:** any mech it has an update for within the last 4 s, at any distance. Lowest score wins:
  distance in metres, plus 6.4 per 100 hit points the target has (absolute, not a fraction), plus 30 per
  second since the last update, minus 50 if that mech damaged it in the last 3 s, minus 40 for the
  current target. Because the engine keeps reporting a mech's true position for 5 s after the sight line
  breaks, a mech stays a valid target for 9 s after it disappears.
- **Range by loadout:** 70 m with the gun alone, 110 m when it holds a laser, 28 m whenever it holds
  lightning (boosting in from under 90 m when energy is above 70). Dead band 15 m each side. Outside the
  band it approaches at full stick (8.7 m/s closing, 42 degrees off the line) or backs off (7.2 m/s);
  inside it moves purely sideways at 11.7 m/s. Sideways direction is re-drawn every 0.35-1.05 s with
  even odds, so gaps between real reversals average 1.4 s (median 1.0 s; 32% under 0.8 s; 19% over 2.1 s).
- **Fire:** gun whenever the target is listed this decision, its own sight-line test passes, range is
  under 230 m and the torso is on the lead solution (first-order intercept, three refinements, no
  acceleration term). No flight-time limit: it empties 12 rounds in 2.6 s at any range, then 2.4 s of
  automatic reload (it reloads by hand only when out of a fight and under half a magazine). Laser:
  starts charging the moment its cooldown ends if the target is listed, inside 280 m, and either the
  sight line is clear or the target is within 60 m (pre-charge behind a wall); releases at full charge
  (0.75 s) only when aligned with a clear line; otherwise it keeps holding, at half walking speed, until
  the engine fires the beam by itself 2 s later. Lightning inside its range and cone when energy allows.
  Mortar between 18 and 220 m when nothing else is firing, low arc with a sight line, high arc without.
- **Shared torso:** while its laser is charging or within 0.2 s of ready, or lightning is in reach, the
  torso aims straight at the target with no lead; the gun then fires only if that happens to lie inside
  the gun's lead window. Against a target crossing at walking speed that fails beyond 57 m (beyond 83 m
  at 8 m/s, beyond 111 m at 6 m/s).
- **Retreat ("losing"):** not finishing (target under 20% hp, itself over 20%, at most two mechs near)
  and one of: own hp under 35% with the target at least 10 points healthier; two mechs seen in the last
  3 s within 160 m and hp under 55%; three and hp under 80%. Then it boosts in a straight line to the
  nearest ground cell within 50 m hidden from the target's eye (or straight away), still shooting.
- **Heal:** only with no target, no zone need and no cube within 40 m: under 55% hp (or under 90% for 6 s
  after the last retreat tick) it stands still and silent, torso spinning at full turn rate (a full
  circle in 1.6 s), or creeps at 4.7 m/s to a cell hidden from the last mech it saw. It leaves at 55%.
- **Economy:** remembers ground cubes 40 s and ground weapons 60 s. In a fight it walks straight (no
  strafe) to a remembered cube within 70 m (hp above 50%), 40 m (lower) or 12 m (losing), else to a
  wanted weapon within 60 m (gun only) or 35 m (about 50 m for a laser). Out of a fight one list by distance with bonuses:
  weapons, cubes, an unheld supply drop within 220 m timed to arrive at most 3 s early (then it stands
  inside the ring), drones within 170 m (it stops 38 m away and shoots; hp above 50%), ground crates
  within 150 m (stops at 30 m; hp above 45%). Nothing more than 2 m above terrain. Gun never dropped;
  second slot laser, else lightning, else mortar; a charging laser is never swapped.
- **Upgrades:** hull first (plating, armour, repair), then lightning efficiency, laser damage, laser
  charge, gun damage and rate; mobility, energy and sensors late; mortar items and laser pierce last.
- **Zone:** heads for the point at 45% of the next radius on its own side when outside, in the outer
  tenth of the current circle, or beyond 80% of the next radius with the shrink running or closer than
  walking time plus 12 s. While it has a target the zone is ignored until it is actually outside.
- **Dodge:** any visible enemy bullet whose closest approach in the next 0.9 s is under 3.6 m (scaled by
  size) makes it sidestep square to the bullet's path, away from the closest point, boosting if energy
  is above 25 (55 when holding lightning in a fight). Against a laser charging at it (aim within
  0.25 rad) it only boosts sideways. It never takes cover unless "losing".
- **Looking around:** first 3 s a full spin. Travelling with no target: torso sweeps 52 degrees either
  side of its heading, period 4.8 s. Standing: continuous spin. Hit by a mech it cannot see: torso to the
  exact damage bearing for 2 s, legs carry on, no cover, no pursuit. Heard a weapon, boost, jet or step
  that is not "far" (within 160 m): looks that way for 3 s. **All of this only when it has no target.**
- **Free-for-all switch:** none. Same behaviour in the final as in practice.

## 4. Why it scores (practice)

| Feature | Evidence | Grade |
|---|---|---|
| The whole controller as a package | Same team, same packaging: Lance bot 4.77, this controller 5.19 (+0.42, official, one run each). Wolverines 5.19 with the upstream; r1ver 5.10 with the same files as Kanyaraasi. | official; bundle |
| Economy package (40 s cube memory, mid-fight cube and weapon detours) | The Wolverines name it as the change behind 5.19; their sister line without it (and with a free-for-all latch and other differences) scored 3.56 for another team. | official; confounded |
| Fight everything, retreat only when clearly losing, short silent heal | Read from code. Elsewhere: removing low-hp retreat from the 5.58 bot cost 0.41; retreating at 72% cost 1.1. | top bot's choice; A/Bs are other bots |
| Bullet-aware sidestep with boost; hull upgrades first; gun kept with a laser | Read from code; no A/B on this bot. | top bot's choice |
| Small edits on this base | Cube-pile ranking 5.08 (-0.11 against upstream, +0 against noise); walkability test 5.10 for r1ver and 5.19 for Kanyaraasi with identical files; four Kanyaraasi micro-changes: no board movement. | official; all inside the 0.1 band |
| Simulator numbers | r1ver's local runs ranked their two builds in the opposite order to the board (local means about 4.4 and 4.7 against 5.10 and 5.08) and put cube-pile ranking 0.56 below the upstream on 32 local seeds. | simulator; unreliable |

## 5. Lessons for our practice bot

1. **Do not read differences under 0.1 on this family, and keep our own bot free of clock-dependent
   work.** Identical files: 5.10 and 5.19. [one pair of official runs] Agrees with D10 and adds a data
   point at the top of the board.
2. **The controller swap is the largest clean number here: +0.42** (4.77 to 5.19) for one team under one
   packaging. [official, bundle] It supports D2/D3/D6 where they follow this policy.
3. **Micro fire-control and bookkeeping fixes do not move the practice score of this policy.** Six
   single changes by two teams, none above noise. [official nulls, some inferred from a board that did
   not move] Spend submissions on large levers (range preset, dodge weight, farming threshold).
4. Places where DOCTRINE V4 differs from what this 5.19 code does (all "top bot's choice", no A/B):
   - Farming health: it farms drones above 50% hp and crates above 45%; D6 defaults to 90%. Worth one
     preset run.
   - Outnumbered retreat: two near and under 55%, three near and under 80%; D3 has 50% and 60%.
   - Heal exit: 55% (90% only for 6 s after a retreat); D3 has 70%.
   - Strafe: a third of its reversal gaps are shorter than 0.8 s; D4 forbids anything under 0.8 s on the
     strength of one other team's -0.7. The means (1.4 s here, 1.2 s in D4) agree.
   - Gun at long range: it has no flight-time gate and wastes magazines beyond 130 m; D2's 0.55 s gate
     is better founded. Keep ours.
   - Laser band 110 m here against D2's default 150 m: still contested, nothing new.
   - No free-for-all latch at 5.19: agrees with D12 ("when in doubt, SQUAD").
5. **Its shared-torso fault is one we must not have.** It hands the torso to the laser for the whole
   charge and the last 0.2 s of cooldown and loses the gun against crossing targets. D8 hands over only
   from 80% charge: keep that, and gate each weapon on the aim the torso will really have. [code reading]
6. **Use the engine's 5 s of true position.** This bot keeps aiming and range-keeping on a mech behind a
   wall, pre-charges within 60 m, and shoots through trees for the full 5 s. D8 limits our canopy fire to
   1.5 s of dead reckoning; the engine gives 5 s of exact position. [rules + top bot's choice]
7. **Straight shortcuts must be checked on the 2 m grid** (the r1ver change). Neutral on the board, but
   it removes 0.6 s stalls; our planner should do the same for every short leg. [official, neutral]
8. Weak points of our own design that this study exposes (for the red-team step):
   - D6 "power grabs in contact" copies this bot's straight, unstrafed walk to a cube within 70/40/12 m.
     In a free-for-all that is exactly the habit counter 5 below punishes. In FFA posture: keep
     strafing on the way, or skip the grab while a laser holder has a line.
   - D11 says "break sight for 5 s". Against this family that is too short: 9 s, and in seconds 5-9 it
     walks to the place where it last had us.
   - D3 counts "threats"; if we count every mech in view the way this bot does, we will run from
     crowds that are not shooting at us. Count only hostile mechs in FFA.
   - D11 allows a first shot only at a busy mech under half hp. Against this family the hp condition
     is unnecessary when we are behind its torso (counter 1).
9. Submission hygiene seen here: eight files, base image pinned by digest, runs as the unprivileged user
   with home and temp directories on the writable temp mount, no install step, README states provenance
   with hashes. But the controller is another team's code, unchanged. The event disqualifies shared
   code; at least three board entries (Wolverines, r1ver, Kanyaraasi) are this one controller, and one
   other team withdrew its borrowed builds for that reason. Nothing of it may enter our repository.

## 6. Limitations (each one checkable in a match)

1. No free-for-all sense: engages every mech it has seen in 4 s, at any range, forever.
2. **Blind outside its 120-degree view while it has a target.** Damage bearings and sounds are used only
   when it has no target, and only mechs it sees can become targets. A second attacker more than 60
   degrees off its torso line and beyond 45 m is never looked at until its current target dies or goes
   stale.
3. Bullets from outside its view become visible only at 45 m (0.18 s before impact): too late for its
   sidestep (it needs 0.31 s to move a body width).
4. Without a target it still does not respond to a hidden shooter: 2 s of looking, no cover, no move.
   Travelling, it never looks at the 137-degree sector behind it (beyond 45 m).
5. Its laser needs the sight line for the whole charge at ranges over 60 m, then holds the charge at
   half speed for up to 2 s and wastes it into the wall. It never re-positions to regain a line: inside
   its band it strafes on the spot facing us through the wall for 5 s, then walks to our last position
   for 4 s, then forgets us.
6. Never uses cover in a fight unless "losing"; against a charging laser it only boosts sideways, which
   does not beat a beam.
7. Gun silent against crossing targets while the laser owns the torso (beyond 57 m at walking speed).
   Gun fired at any range: 12 rounds, then 2.4 s of silence, countable.
8. Straight, unstrafed moves: to cubes (70/40/12 m), to weapons (60/35 m), to cover when losing.
   Stationary: 38 m from a drone, 30 m from a crate, inside a drop ring, and while healing under 55%.
9. Range keeping uses our true position through walls and ignores walls, other mechs and the zone edge
   behind it: come inside 95 m of a laser holder (55 m of a gun-only one) and it backs straight away.
   In a fight the zone does not exist for it until it is outside.
10. Crude threat count: any three mechs in view within 160 m send it running below 80% hp, to cover
    chosen against its target only.
11. With lightning it closes to 28 m on anybody, across any ground, even into a laser.
12. Tree cover is not modelled (this helps it: it shoots through canopy). Roof loot ignored. Its
    navigation assumes the starting body size although it grows 5% per cube.
13. Path work is cut by the clock on slow decisions: not strictly repeatable (5.10 and 5.19).
14. A mortar is kept until something better turns up: a laser hit on it then does 60% more.
15. Mortar indirect fire (high arc over a building) is geometrically possible only beyond 121 m.

## 7. How to recognise it (anonymous mech, a few seconds of watching)

- The weapon list **always contains the gun**. Second weapon laser, lightning or mortar; never laser and
  lightning together. (A mech without a gun is not this family.)
- The torso snaps to us the moment we are in view, at any range up to 200 m, and the gun opens at once,
  even at 150-230 m; bursts of 12 in 2.6 s, then 2.4 s silent.
- It settles 55-85 m away with the gun alone, 95-125 m with a laser, and keeps coming to 28 m with
  lightning (boost under 90 m). Inside the band it moves exactly sideways at walking speed and reverses
  at irregular gaps of 0.35 s to about 3 s. It never pauses and never walks slowly in a fight.
- With a laser: the charging flag comes up within 0.2 s of first sight and its speed halves; if we hide
  the flag stays up for about 2.7 s and a beam hits the wall.
- Our bullets in its view make it jump sideways at boost speed, square to our line of fire.
- With a cube on the ground within 70 m it stops strafing and walks straight to it, still firing.
- First 3 s: a full torso spin. Travelling: torso swings about 50 degrees either side of its heading
  every 4.8 s. Standing: continuous spin. Standing 38 m from a drone or 30 m from a crate, shooting it.
- Under 35% against a healthier target (or under 55% / 80% with two / three mechs around): a straight
  boosted run to the nearest hidden ground within 50 m, torso still on the target.
- Maximum hp rises in 15% steps early (hull upgrades first).
- Kanyaraasi and r1ver cannot be told apart, nor from the Wolverines' 5.19 build. The Wolverines' newer
  build goes quiet between the second foreign elimination and six alive; these two do not.

## 8. Counters, ordered by expected gain in a free-for-all

**1. Blind-side third party (largest gain).**
Trigger: a mech with this signature is firing at somebody else, its torso more than 90 degrees off our
bearing, we are 60-150 m from it and more than 45 m at all times.
Action: stay behind its torso line; pre-charge and release the laser every cycle (2.4 s), gun with exact
lead in between (no flight-time gate needed from this side up to about 150 m); keep a hide cell within
6 m. Stop and hide when its target dies or disappears (it then turns to our damage bearing within 0.8 s),
when its torso comes within 60 degrees of us, or when it closes inside 50 m.
Why it works: limitation 2 and 3 (limitation 3 assumes bullets follow the general visibility rule of
the protocol: outside the view wedge only within 45 m); hits from outside its front half do 1.5 times damage. Roughly 470 per
beam and 68 per bullet for no return fire: a full-health one is dead in two to three laser cycles.
Backfire: a different bot with this look turns on the first rear hit (0.5-0.8 s). We are then in a
laser duel with a wounded mech that still has its first opponent; loss bounded by the 6 m hide cell and
the rule to break sight when its torso is within 60 degrees and it is above half hp. Noise: our laser is
heard to 380 m. General rule: safe against any mech that is trading with someone else and facing away.

**2. Never be its target early: the 9.5 s break and the ranking.**
Trigger: the signature above with its torso on us, especially in the first 90 s, or lightning in its
weapon list and range closing.
Action: put a building or terrain (not trees) between us; stay 65 m or more from it (inside 60 m it
pre-charges through the wall) and out of the 45 m sensor ring; do not shoot it (each hit keeps us 50 m
"closer" in its ranking for 3 s); keep the line broken for 9.5 s; in seconds 5-9 be at least 60 m from
the spot where it last had us, off its approach path. Prefer routes that leave another mech nearer to
it or weaker than us: each 100 hp of ours counts as 6.4 m of distance in our favour, a mech at half
health looks 45 m closer than one at full. Against lightning: walk away at full stick (it closes at
8.7 m/s, 14.5 m/s for at most 1.8 s per boost) and never let it inside 60 m.
Why it works: limitations 1 and 5 and its target score.
Backfire: a hunter that searches the last position longer. Bounded: the move costs only time, and we
finish in cover. General rule: safe; D11 should say 9.5 s, not 5 s.

**3. Hidden-shooter laser on a travelling, farming, capturing or healing one.**
Trigger: the signature with no mech in its view, torso more than 100 degrees off us (it is walking away,
or standing at a drone, crate or drop ring), range 145-200 m (beyond 140 m it cannot hear the charge;
sounds beyond 160 m are ignored anyway), a hide cell within 4 m.
Action: charge in cover, show for at most 0.5 s, release, hide before its torso arrives (it needs 0.5 s
from dead astern, 0.13 s from 90 degrees, plus a decision). If it never lists us it has no target, does
not come, and regenerates little while we repeat every 3 s (each hit restarts its 5 s delay; with both
repair upgrades the delay is 2 s and it wins back up to 115 hp per cycle). Two beams per peek cell, then move 10 m.
Below 55% hp it stands still to heal: finish there.
Why it works: limitation 4; 315 per beam, 470 into the back.
Backfire: a bot that answers a hidden shooter by rushing the bearing or pre-aiming the corner. Bounded
by the two-beam limit, by aborting when it closes inside 90 m or a third mech appears within 120 m, and
by our hp floor (70%). General rule: safe only with the never-seen discipline.

**4. Corner peek on its laser rhythm (when it is already on us and we fight).**
Trigger: it holds a laser and has us as target; a corner 100-150 m from it.
Action: peek only while moving sideways at 8 m/s or more (its gun is tied to the direct laser aim and
stays silent), exposure 0.6 s or less (its beam needs 0.8 s from first sight; assume 0.5 s once it shows
15 or more cubes), release a pre-charged beam, hide. Then **do not show again while it may hold a
charge**: wait for its beam (seen, or a laser sound from its bearing) or 2.9 s; the next 1.6 s are free
of its laser, and gun rounds fired then arrive after we are back in cover (flight 0.4-0.6 s). Against a
gun-only one, count 12 rounds and use the 2.4 s reload.
Why it works: limitations 5, 6 and 7. About one beam per 3 s for almost nothing.
Backfire: a bot that advances round the corner or pre-charges on sound. Bounded: two peeks per cell,
leave when it comes inside 60 m or carries lightning inside 90 m. General rule: safe against any laser
carrier that shows the long-held charging flag.

**5. Magnet ambush.**
Trigger: the signature within 70 m of a ground cube (40 m if under half hp), within 60 m of a weapon
while gun-only, heading for a drop ring in the last 3 s before landing, or stopping 38 m from a drone or
30 m from a crate; we have a covered line to that spot from 100-160 m.
Action: lay the laser on the spot (cube, ring centre, standing place) and release as it arrives; gun
with exact lead along the straight leg from inside 100 m. The cubes of any mech that dies within 70 m
of it pull it the same way.
Why it works: limitation 8 (straight, unstrafed, or stationary).
Backfire: another bot does not come; we hold a charge at most 2.7 s and waste one beam. Start charging
only when its heading is within 15 degrees of the object and it will arrive within 1.5 s. General rule:
cheap and safe.

**6. Push it with its own range rule (late, situational).**
Trigger: phase 3 or later, it holds a laser, stands within 40 m of the closing edge (or of a wall or
another mech's lane), and we have hard cover 65-90 m from it on the inside.
Action: stay hidden, show for 0.3 s every 4 s so that it keeps our true position; it backs away from us
at 7 m/s (half that while charging), out of the zone, comes back when outside, backs out again. Each
trip costs it zone damage and its regeneration.
Why it works: limitation 9.
Backfire: specific to this family. A bot that pushes instead arrives at our corner. Only with a second
hide cell and a way out; abort if it comes inside 60 m. **Not a general rule.**

**7. Finish on the retreat line.**
Trigger: it drops under 35% while we are 10 points healthier (or under 55% with a second mech in its
view): its speed jumps to boost in a straight line toward the nearest hidden ground within 50 m.
Action: hold the laser for that moment and release with half a decision of lead; then expect it
standing still behind that cover until 55% hp. Re-acquire it from a flank cell, never by walking in.
Backfire: none worth naming; it is a rule for any fleeing mech.

Safe as general rules against any mech with the same look: 2, 4, 5, 7; 1 with its hide-cell bound;
3 only never-seen. Counter 6 is specific to this controller family.

## 9. Free-for-all behaviour and results

No detector and no second posture: it plays the final exactly as it plays practice. No recorded
free-for-all contains Kanyaraasi (its entry dates from 05:05 UTC; the recordings are from 02:00-04:00
UTC). The same controller family under the Wolverines' name averaged about 6th place over up to 11
recorded showdowns (another team's notes; versions per match not recorded), better than the 8.5th of a
random mech and far from winning. With two or three copies in a final they will also fight each other
on sight.

## 10. Files

- Scored version, read completely: `/srv/mech-sparring/kanyaraasi_83e4c93/` (decision file about 660
  lines, map module about 340 lines, kit wrapper).
- Compared against: `/srv/mech-sparring/ttun_v8econ_b7e9a6d/`, `/srv/mech-sparring/r1ver_ts_af337d5/`,
  `/srv/mech-sparring/r1ver_ts_96848df/`, `/srv/mech-sparring/ttun_ae1b122/`.
- History: `intel/_meta/devakchow__team-kanyaraasi-mech-royale.git` (25 commits to 05:42 UTC) plus two
  later commits and four earlier ones fetched read-only into
  `intel/devakchow__team-kanyaraasi-mech-royale`.
- Board snapshot taken for this note: `tools/top10/snaps/lb_0628.html`.
