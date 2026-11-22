# r1ver (moonriver0922/wgsrobot = moonriver0922/mech-royale-planner): clean-room study and counters

Written 21 Nov 2026, 07:10-07:40 UTC. Read-only work: nothing from either repository or from the sparring copies
was executed, built or installed, and no code, identifier, comment or constant table is reproduced. Behaviour is
described in my own words with plain numbers; commit titles and branch names are quoted only as evidence. The
base controller (Wolverines' TTUN v8-econ) is described in full in `notes/intel/top_Wolverines.md`; this file
covers what r1ver changed, its own experiment notes, and counters to the build that now holds its best score.
Balance numbers are the organiser's config (`notes/hello_example.json`).

## 0. What changed since the earlier notes (read this first)

1. **The task text is stale: r1ver is now at 5.27, not 5.10.** Board fetched 07:07 UTC
   (`tools/top10/r1ver_work/lb_now.html`, also `tools/top10/snaps/lb_0649_r1ver.html`): rank 10, **5.27 at
   06:46:28 UTC**. `web/mech_submission_times.json` (05:25) still shows the old 5.10 at 03:01:48.
2. **The 5.27 build is very likely commit `818232c`** (branch `practice/combat-economy`, 06:45:46 UTC, 42 s before
   the board time). It is the 5.10 build plus three changes: (a) it grabs cubes and weapons, and shoots crates and
   drones, *during* a fight when its target is far or out of its sight line; (b) when it retreats it hides from
   the mech that is actually hitting it instead of always from its target; (c) when a retreat is blocked by a wall
   it side-steps before jumping. It has **no free-for-all switch**.
3. **Correction to `notes/measured_deltas.md` row Z03**: the 5.10 build (`af337d5`) is NOT "on top of the
   cube-pile version". It is the unmodified Wolverines 5.19 controller plus one walkability test (verified by
   diff; r1ver's own table says the same). The one-change pairs are 5.19 -> 5.08 (cube piles, -0.11) and
   5.19 -> 5.10 (walkability, -0.09). The same three `af337d5` files scored **5.19 for Kanyaraasi**.
4. Since the default finalist is a team's best-scoring entry, r1ver's final bot is `818232c` unless they pick
   another one or beat 5.27 before the deadline.

## 1. Identity (re-checked)

| Evidence | Value |
|---|---|
| Team link | `experiments/official-runs.md` is titled as r1ver's official practice record and lists four receipts with links to the exact commits; README states "our best verified practice score is 5.10" for `af337d5` |
| Two repo names | `wgsrobot` and `mech-royale-planner` return identical refs (all 14 branch heads, same SHAs; `git ls-remote` of both at 07:05 UTC). One repository under two names (rename or mirror); README links use the planner name |
| Bot announcement | 5.08 build announces "r1ver-cube-econ"; 5.10 and 5.27 builds keep "TTUN-mech" (same as Wolverines and Kanyaraasi). Names are not visible in a match anyway |
| Authorship | all commits by the account owner, no AI-tool trailers; experiment notes in Chinese |
| Text aimed at AI agents | none found in READMEs, experiment notes, tool docs, bot sources or commit messages |

Score history (UTC; commit times are +08:00 in the repo):

| Score | Commit (branch) | Commit time | Board / note time | Gap | Receipt |
|---|---|---|---|---|---|
| 4.54 | `97e0e58` (Python, Lance-derived, quiet walking) | 02:26:04 | note 02:26 | - | BB-407987E8 |
| 4.67 | `8a536b5` (`practice/normal-speed`) | 02:51:03 | note 02:51 | - | BB-2DE41BE7 |
| 5.08 | `96848df` (`practice/cube-economy`) | 02:53:40 | note 02:54 | - | BB-74CEE7A0 |
| 5.10 | `af337d5` (`practice/ground-clearance`) | 02:58:43 | board 03:01:48 | 185 s | BB-EAEAF89A |
| **5.27** | **`818232c` (`practice/combat-economy`)** | **06:45:46** | **board 06:46:28** | **42 s** | not published |

Between 03:01 and 06:46 they pushed four other bot branches: `c942c49` behaviour repair (03:55), `b930938`
moving-frame dodge (04:44), `e5456e3` opening resource window (05:46), `2908ccb` retreat side-step (06:33). The board
did not move, so any of them that was submitted scored at most 5.10. No commit after 06:45:46 (07:05 UTC).

Verdict: team = repository **confirmed**; 5.10 = `af337d5` **confirmed** (own receipt table); 5.27 = `818232c`
**likely** (42 s gap, newest commit, the only candidate whose features are new). Alternative (low): `2908ccb`
(13 min earlier; it is contained in `818232c` and differs only by lacking changes (a) and (b)). Counters C1, C2
need `818232c`; C3-C5 work against both.

Files read: `/srv/mech-sparring/r1ver_ts_96848df`, `/srv/mech-sparring/r1ver_ts_af337d5`,
`/srv/mech-sparring/ttun_v8econ_b7e9a6d`, `/srv/mech-sparring/kanyaraasi_83e4c93` (all hashes checked);
`tools/top10/r1ver_src/{818232c,2908ccb,e5456e3}_{bot,map}.ts` (fetched read-only earlier); the other branches read with
`git show` / `git diff` from `intel/moonriver0922__wgsrobot/.git` (no copies kept); master's README, experiment
notes, results.csv, calibration csv and tool READMEs.

## 2. Lineage

- Python line (abandoned 02:51 UTC): LanceHuang245/mech-royale `171bc06` (4.54 quiet / 4.75 normal speed for
  another team) -> `97e0e58` (4.54) -> `8a536b5` (4.67, normal speed plus "finish a nearly captured drop").
- TypeScript line, all on Wolverines' TTUN v8-econ `b7e9a6d` (5.19), each branch a fresh single-commit tree:
  - `96848df` (5.08): ranks visible cube piles by stats gained (14 m bonus per extra useful cube, up to 4, plus
    12 m if the pile crosses the next upgrade threshold). Dead end.
  - `af337d5` (5.10; byte-identical to Kanyaraasi `83e4c93`, 5.19): before taking a straight shortcut under 60 m
    while travelling (zone, roam, loot, heal), check that the line is walkable on the 2 m grid including
    diagonal corner squeezes; otherwise use the path field.
  - From `af337d5`: zone and loot experiments `d423f07`, `29d8eee`, `b3f7a42`, `dfdce18` (local only);
    `c942c49`, `b930938`, `e5456e3` (pushed, never moved the board); `2908ccb` (retreat side-step) ->
    **`818232c` = `2908ccb` + attacker-keyed retreat + in-fight resource grabbing (5.27)**.
- Not inherited: Wolverines' own 5.21 build (`ae1b122`, the "hold fire after two foreign deaths" switch). r1ver
  never added a place or free-for-all switch.

## 3. How it plays (`818232c`, numbers)

1. **Target**: any mech it has seen in the last 4 s, from the first second, at any range; lowest of distance + up to
   90 m for a full-health mech + 30 m per second unseen, minus 50 m for a mech that hit it in the last 3 s, minus
   40 m for its current target. No gate and no opening guard.
2. **Ranges by loadout**: holds 70 m with the gun alone, 110 m with a laser, 28 m with lightning (15 m dead band,
   full stick in, 0.7 out), always strafing at 0.9 with sides re-drawn every 0.35-1.05 s; it closes at about
   8.7 m/s with a sight line; a lightning carrier boosts in from under 90 m when energy is above 70. Gun fires
   at any aligned target inside 230 m (12 rounds, then 2.4 s dry); laser charges on sight inside 280 m and is
   released only at full charge with a sight line; boost-strafe when its target's charging laser points within
   0.25 rad of it.
3. **Retreat ("losing")**, unless finishing (target under 20%, itself over 20%, at most two mechs in view): under 35%
   with the target at least 0.10 healthier; two or more mechs seen within 160 m and under 55%; three or more and
   under 80%. **New**: it boosts (energy over 15) to the nearest cell within 50 m hidden from *its target if the
   target hit it in the last 3 s*, otherwise from the nearest recent attacker it has seen (hit within 3 s, seen
   within 2 s, within 190 m, ranked by distance + 25 m per second since the hit + 20 m per second since seen);
   with no hidden cell it runs straight away from that mech. **New**: if a retreat is pinned on a wall for 0.3 s it
   steers 60, 90, 120 or 150 degrees off for 0.5 s before the old jump-and-jet hop. Heal (nothing seen for 4 s):
   under 55%, or under 90% for 6 s after losing, stand still or creep at 0.4 stick into cover within 36 m;
   any sighting ends it.
4. **Economy (the 5.27 change)**: on top of the base's mid-fight walks to a remembered cube (70 m above half
   health, 40 m below, 12 m when losing) and to a wanted weapon (60 m gun-only, 35 m otherwise), it now diverts
   while fighting if all of these hold: health at least 55%, fewer than 6 cubes (or gun-only, for weapons), more
   than 4 alive, laser not charging, no zone goal, grounded, no mech hit in the last 0.9 s, no mech in view within
   37 m, and no mech in view within 105 m with a sight line whose aim is within 0.34 rad (about 20 degrees) of it.
   Then it walks, never boosting, to a ground cube within 48 m or (gun-only) a wanted weapon within 53 m that is at
   least 5 m inside the zone, has a walkable straight line, and is not more than 15 m closer to its target (when
   the target is under 120 m). With none of those, and when its target gives it no shot (target beyond 105 m or
   without a sight line, and no weapon firing), it **turns its torso to a crate within 70 m or a drone within
   55 m in its sight, walks to 25 m short of it, stands, and shoots it with the gun**. Out of contact it farms as
   the base: weapons, cubes, an unheld drop within 220 m, drones within 170 m (to 38 m, above 50% health), crates
   within 150 m (to 30 m, above 45%). Roof loot ignored. Gun never dropped; laser over lightning over mortar;
   plating, armour, nanites first.
5. **Zone and endgame**: heads for 45% of the next radius on its own side when outside, beyond 90% of the current
   radius, or beyond 80% of the next one with the shrink running or close; in a fight it ignores the zone until
   it is outside. No last-circle or last-few logic.
6. **Free-for-all switch**: none. The only alive-dependent rule turns the in-fight resource diversion off at four
   alive.

## 4. Why it scores (practice), from its own logs

| Build (change) | Official | Their simulator | Grade / reading |
|---|---|---|---|
| `97e0e58` Lance + quiet walking + zone-crossing latch | 4.54 | 3.56 (16 seeds) | official |
| `8a536b5` normal walking speed + finish-capture | 4.67 (+0.13) | 4.69; finish-capture alone 11.31 vs 11.31 in FFA | official, two changes |
| `96848df` TTUN 5.19 + cube-pile ranking | 5.08 (-0.11 vs 5.19) | -0.56 over 32 paired seeds; -0.13 per FFA game | official, inside noise |
| `af337d5` TTUN 5.19 + walkable shortcut | 5.10 (-0.09 vs 5.19); same files 5.19 for Kanyaraasi | +1.56, +1.13 (old movement model); -0.17 (corrected, 24); -0.19 (fixed work, 16); -0.44 FFA (16) | official pair: identical code scored 5.10 and 5.19 |
| **`818232c`** = 5.10 + in-fight farming + attacker-keyed retreat + side-step | **5.27 (+0.17 = +8 place-points over 48; +0.08 over the unmodified 5.19)** | none recorded; their practice simulator has no crates or drones, so the main feature cannot be measured there | official, one draw, bundle, near the noise band |
| `b930938` moving-frame bullet dodge | at most 5.10 if submitted | -0.50 dev (16), +0.35 held-out (40), -0.125 FFA (24) | mixed |
| `e5456e3` opening window (first 50 s: drop a distant, non-aiming target for a resource within 50-55 m at 65%+ health, under 4 cubes) | at most 5.10 if submitted | none recorded | official upper bound, unknown if submitted |
| Local-only rejects | - | inner-circle waypoint -0.375 (32); roof filter +0.03; reachable shrink target +2.19 real clock, -1.38 fixed work, -1.00 FFA; shrink deadline +0.16/+0.06; detour costing +0.22 dev / -0.22 held-out | sim |

Calibration in their own words: on 16 fresh seeds the four scored builds came out 3.56 / 4.69 / 4.69 / 4.44 against
official 4.54 / 4.67 / 5.08 / 5.10: of six orderings 3 right, 1 tie, 2 reversed. Their squad model ranked TTUN v7 at
1.69 against their Python bot's 4.56, the opposite of the board. A fixed logical clock removed several positive
deltas (planning work depends on CPU load).

Reading: the score is the TTUN package (always fight, economy in contact, laser at 110 m, plating first, fixed work
per decision) plus draw noise of at least 0.09 (identical files: 5.10 vs 5.19). The 5.27 change has a plausible
mechanism [N]: in practice some house bot is almost always in its view, so the base controller is nearly always
"in a fight" and rarely gets to farm crates and drones; the new rule farms whenever the nearest contact is beyond
105 m and nobody close is pointing at it. The house hunter fights from 100-150 m (doctrine D1), so a good part of
the farming happens while it is being shot at from beyond 105 m; each hit pauses it for 0.9 s.

## 5. Lessons for our practice play (against DOCTRINE V4)

1. **Define "contact" by threat geometry, not by "a mech is in view"** [1: +0.17 over the parent, +0.08 over the
   untouched 5.19, one draw, bundled with the retreat changes]. D6 says "farm only out of contact and at hp >= 90%".
   Partial disagreement: with 15 house bots around, "no mech in view" is rare. Offer a preset that allows short
   farming (crate within 70 m, drone within 55 m, stop 25 m short; cubes within 48 m) when nobody is within 37 m,
   nobody within 105 m with a line of fire aims within 20 degrees of us, we were not hit for 0.9 s, the laser is
   not charging and there is no zone pressure; health gate 55% (theirs) as an A/B against D6's 90%. Keep D6's
   distance limits (they agree) and keep the bullet-aware dodge on during the walk.
2. **Board deltas under about 0.1 are noise for this family** [official pair: the same three files scored 5.10 for
   r1ver and 5.19 for Kanyaraasi; cause: wall-clock-sliced path planning]. Agrees with D10 (determinism, fixed
   work, salt as a legitimate fresh draw). It also means lesson 1 rests on a weak +0.17.
3. **Retreat from whoever is hitting us** [1, same bundle]. D3 already asks for a hide cell away from every tracked
   mech: agrees, and D3 is stronger than r1ver's one-attacker rule (see C3 for what the weaker rule costs them).
4. **Do not trust local simulators for doctrine** [sim: 3 of 6 orderings, a 0.43 official gap reversed, several
   dev/held-out sign flips]. Agrees with the handoff note. Add their practice: fix the planning work (operation
   counts, not milliseconds) before comparing two builds locally, and report how often the changed rule fired.
5. **Small economy and geometry polish does nothing measurable** [official: cube piles -0.11, walkability -0.09;
   sim: inner circle, roof filter, reachable shrink target, deadline, detour costing all within noise or
   sign-unstable]. Agrees with D6 "economy knobs are noise".
6. **Opening guard** [weak]: their 50 s "ignore a distant, non-aiming contact for a nearby resource" (similar in
   spirit to D0's 40 s guard) never lifted the board, but we do not know it was submitted. Keep D0 contested.
7. **Moving-frame dodge** [sim, mixed; official at most 5.10 if submitted]: consistent with D4's "closest approach
   to our predicted position"; no new evidence either way.

## 6. Limitations (each with its mechanism)

New in `818232c`:
- **N1. It turns its back on a live fight to farm.** When its target is beyond 105 m or behind cover and nothing is
  firing, the torso (and with it the 120 degree view wedge and the front arc) swings to a crate or drone, it walks
  unboosted and unstrafed to 25 m short and stands still, gun on the object. Bullets from outside its wedge are not
  seen and not dodged; hits from more than 90 degrees off its aim take x1.5.
- **N2. Its veto is blind beyond 105 m and to off-axis aims.** Only a mech in view within 37 m, or one in view within
  105 m with a sight line and aim within 0.34 rad of it, stops the diversion. Our position and aim beyond 105 m, and
  an aim more than 20 degrees off inside 105 m, are ignored.
- **N3. A hit pauses it for only 0.9 s, and it goes back to its own target.** After a hit it fights again, but the
  target rule gives an attacker only 50 m of bonus against 40 m of stickiness: a third party more than about 10 m
  farther than its current target (equal health) does not become the target, so the torso stays on the other mech.
- **N4. Memory counts as "seen".** For 5 s after we break the line of sight the engine still feeds it our position;
  it treats the target as seen but without a sight line, so its "do I have a shot" test fails and it farms instead of
  pathing after us whenever a crate, drone or cube is in reach.
- **N5. Retreat cover against one mech only, and only one it has seen.** The hide cell is computed against its target
  (if the target hit it within 3 s) or one seen attacker; a second shooter, or one it never saw, still sees the cell.
  With no cell within 50 m it boosts in a straight line directly away (about 19.5 m/s for up to about 6 s on full
  energy).
- **N6. The gates are visible**: health fraction 55%, fewer than 6 cubes, more than 4 alive, laser flag down.

Inherited unchanged from the Wolverines controller (details and numbers in `top_Wolverines.md` section 5): torso
slaved to its target, so third parties are unseen and undodged; late bullet side-step (tested against its current
position); straight walks to cubes, weapons, zone point and cover; stands still at drones (38 m) and crates (30 m)
when out of contact; 9 s memory hand-off (5 s engine + 4 s own) with a straight-line ghost aim; laser charged on
sight, half speed for at least 31% of a laser fight, a hidden target makes it carry the charge up to 2.75 s and fire
into the wall; weak response to enemy lasers; no gun discipline (12 rounds to 230 m then 2.4 s, audible to 320 m);
slow to close (8.7 m/s); zone-blind stand-off (a laser carrier is squeezed out of circles from about 314 s, gun-only
from about 358 s, when its target holds the centre); retreat counts sightings, not shooters; heal ends on any
sighting and exits at 55%; ground-only navigation (the side-step now softens the pinned-retreat hop); one sight
column per map cell; never drops the gun, and with lightning it closes to 28 m on anyone.

## 7. Free-for-all behaviour

Same controller all match: it targets any mech seen in the last 4 s from t = 0, so it is a shoot-on-sight strafer from
the spawn on (the D11 "shoot-on-sight strafer" profile). While more than 4 are alive, at 55%+ health and under 6
cubes, it also grabs cubes and shoots crates and drones in the middle of long-range fights, so it should reach the
last phases with more cubes than the Wolverines or Kanyaraasi builds, but it also spends those phases with its torso
off its opponent more often. At 4 alive it is the plain TTUN fighter. Record: the TTUN family (Wolverines' 5.19
build) averaged about 6th of 16 in up to 11 recorded top-16 showdowns; r1ver itself has never been recorded and the
5.27 build has no free-for-all data. Their own local FFA tests of earlier edits were all neutral or negative.

## 8. Observable signatures

Family (all of TTUN, Kanyaraasi, r1ver): gun always listed and never laser + lightning; full-rate torso spin for the
first 3 s; gun opens at first mutual sight up to 230 m; settles 55-85 m (gun), 95-125 m (laser), 13-43 m
(lightning); tangential speed about 10.5 m/s with side changes every 0.35-1.05 s; charging flag as soon as the laser
is ready with us in view; straight walk onto a ground cube within 70 m mid-fight; boost to the nearest building edge
when hurt, still firing; high max hp per cube (plating first).

`818232c` only:
- Mid-fight, with another mech 105-230 m away that it has just been shooting, it stops strafing, turns its torso to a
  crate within 70 m or drone within 55 m, walks without boost to about 25 m from it and stands there firing the gun at
  it (crate or drone loses hp; a drone usually aggroes it). The other TTUN builds do this only when no mech has been
  in view for 4 s, and stop at 30 m (crate) or 38 m (drone).
- After a hit during that, its torso comes back to its previous target within about 0.1 s plus turning time (4 rad/s).
- Shows only while health/max is 55% or more, cubes under 6, more than 4 alive, no laser charging flag.
- In a retreat it hides from the mech that hit it last (not always from the one it was shooting); pinned on a wall
  it slides sideways for half a second before hopping.
- Versus Wolverines `ae1b122`: r1ver keeps shooting mechs after the second death it did not cause.

## 9. Counters (free-for-all; practice opponents are house bots)

Machinery assumed (Doctrine V4): exact gun lead, laser peek from cover, exposure grid, path planning, bullet-aware
dodge, sight-break timers. Gains are mechanical estimates, not measurements. Damage: laser 315 per 2.4 s cycle
(131 HP/s), gun 45 per round, 12 rounds in 2.64 s, rear hits x1.5, a 0-cube mech has 1400 hp.

### C1. Punish the crate stop
- **Trigger**: a family mech (signatures above) at 55%+ health, under 6 cubes, more than 4 alive, that has slowed below
  1 m/s within 25 m of a crate or drone with its aim on that object (within 0.1 rad), or is walking unboosted
  straight onto a cube or weapon, while some mech (often us) is 105-230 m from it.
- **Action**: open from 110-150 m, or from 60-105 m keeping our aim at least 0.4 rad off its bearing until the release
  decision (the torso turns 0.4 rad per decision at 4 rad/s), from more than 90 degrees off its aim where a cover
  cell allows (rear x1.5): pre-charged laser at its standing position (no lead), then the gun magazine with no lead
  while it stands. If its target is another mech and we are at least 20 m farther from it than that mech, keep firing:
  it returns to its own target and keeps its back to us. If we are its target, it turns to us within 0.4-0.8 s:
  then fight from a corner on its magazine and laser timing (Wolverines C4) or break sight (C2). Abort or skip: any
  other mech with a line of fire on us within 150 m aiming within 0.3 rad of us, our health under 60%, no hide cell
  within 6 m, or the drone within 50 m of us.
- **Exploits**: N1, N2, N3 (torso and wedge on the object, veto ignores us, the hit pauses only its farming) and the
  inherited fact that it dodges only bullets it sees.
- **Expected gain**: about 400-740 unanswered damage per occurrence (laser 315-472 plus 2-4 rounds of 45-68 in the
  turning window: 29-53% of a fresh mech); as an unseen third party, 131 HP/s or more for as long as it fights someone else.
- **Backfire**: any bot shooting a crate shows the same stop (the other TTUN builds at 30-38 m, many public bots), and
  a crate stop can be bait. The rule is a general "busy stationary mech" rule and is safe with the abort list; the
  cost of a wrong trigger is one laser cycle and one magazine. Loud weapons (laser 380 m, gun 320 m) can draw a
  fourth mech: break sight if one appears within 150 m.

### C2. Break, relocate, peek on the farmer
- **Trigger**: a family mech targets us (rounds or a charging flag toward us), we have hard cover within 6 m, it is at
  55%+ health with under 6 cubes and more than 4 alive, and a crate within 70 m, a drone within 55 m or a ground cube
  within 48 m of it is in its sight or on our map.
- **Action**: break the line of sight; before second 4.5 move at least 20 m along the cover to a different peek cell
  and charge the laser behind it; peek between 1.0 and 4.5 s after the break, and only after its charging flag has
  dropped or 2.75 s after it appeared. If it is in the crate stop, run C1. If its aim is on our old position and it
  is walking there, stay hidden to second 9 (it forgets us) or peek in the 2.4 s after its 12th round.
- **Exploits**: N4 (during the 5 s engine memory its "do I have a shot" test fails without a sight line, so it farms
  instead of pursuing) plus the inherited 9 s memory hand-off.
- **Expected gain**: turns most sight breaks near loot into a C1 opening (400-740); worst case equals our default
  5/9 s break. It also wastes its laser cycle into the wall.
- **Backfire**: bots that push corners (lightning) or hold a charged laser on the corner: the timed peek and the 20 m
  relocation bound that; bots that search arrive at the empty old point. Low risk as a general rule.

### C3. Third-party the retreat
- **Trigger**: a family mech boosting at about 19.5 m/s toward a building edge while still firing at another mech A
  (it is "losing": under 35% against a healthier A, under 55% with two in view, under 80% with three), and it has not
  had us in view (no aim toward us, no rounds at us) for the last 5 s.
- **Action**: predict its hide cell as the nearest walkable cell within 50 m (rings every 6 m, 16 bearings) hidden from
  A's eye, since A hit it within 3 s; take a firing cell 60-150 m from that cell that sees it, more than 60 degrees
  off its aim and beyond 45 m; release the laser when it arrives (it then stands or creeps at 0.4 stick to heal under
  55%, or under 90% for 6 s) and follow with the gun at no lead. With no hidden cell it runs straight away from A for
  up to about 6 s: use constant-velocity lead. Stay hidden from A, or beyond 150 m of A.
- **Exploits**: N5 (cover against one mech, and only a mech it has seen) plus inherited third-party blindness and
  the heal that stands still.
- **Expected gain**: 1-3 laser hits (315-945) on a mech already under 35-80%: usually the kill, its cubes plus two, and
  A's duel decided in our favour.
- **Backfire**: bots that hide from every tracked mech (as D3 asks of ours) pick cells hidden from us too: we lose only
  the move. A may turn on us after the kill: the A-hidden firing cell bounds that. Never chase it into cover past
  D5's limits.

### C4. Out-range the gun-only carrier beyond 105 m
- **Trigger**: a family mech with only the gun listed targets us and walks in (it wants 70 m) at no more than about
  9 m/s; we hold a laser.
- **Action**: hold 115-150 m along cover inside the zone; when it is inside 115 m walk away or sideways at 11.7 m/s
  (it closes at 8.7 m/s with a sight line); boost to cover if the closing speed exceeds 12 m/s for 0.5 s or it gets
  inside 100 m. Laser at every cooldown; gun only when it stands or walks straight (D2 gate). After its magazine it
  often turns to a crate or drone: switch to C1 and add the gun.
- **Exploits**: inherited slow closing and no gun discipline, plus N2 (beyond 105 m we never veto its farming).
- **Expected gain**: 131 HP/s laser against its 230 m gun at 115-150 m, where a dodging strafer is hit roughly
  13-25% by a first-order lead (our Wolverines model) and about 32-57% by an exact-lead shooter against steady targets
  (D1); about 11 s of laser for a fresh mech, plus C1 windows.
- **Backfire**: gun-only boost rushers (19.5 m/s) catch a walker: the closing-speed check covers it. Kiting crosses
  ground others watch: keep cover within 9 m and stay in the zone. If it holds lightning use Wolverines C6 (walk-away
  kite at 50 m and more) instead.

### C5. Inherited set, unchanged against `818232c`
- Small circles (Wolverines C5): from next radius 70 m or less, hold hard cover within 10 m of the next centre; its
  band forces it outside (laser carrier from about 314 s, gun-only from about 358 s) and the zone goal also switches
  its in-fight farming off. Shoot its straight inward runs.
- Third-party flank of a mech busy with someone else (Wolverines C2), corner duel on its magazine and laser
  (Wolverines C4), nine-second break with relocation (Wolverines C7): all apply; C1 and C2 above add the crate stop.

Safe as general rules for the same signature: C1 (with the abort list), C2, C3, C5. Conditional: C4 (closing-speed
check).

## 10. Not established

- That 5.27 is `818232c` rather than `2908ccb` (timestamp and the newest-commit argument only; no receipt published).
- How often the in-fight farming fires in a real free-for-all; whether it helped or hurt them there.
- Which of the three bundled changes produced the +0.17, and whether it is more than draw noise (identical files have
  differed by 0.09).
- Whether the four branches pushed between 03:55 and 06:33 were submitted.
- Hit rates and turn windows are arithmetic from the published balance, not match measurements.
