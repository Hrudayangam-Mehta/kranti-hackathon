# Wolverines (varchaskukreja/TTUN): clean-room study, limitations, signatures, counters

Written 21 Nov 2026, 06:35 UTC. Read-only work: nothing from the repository was executed, built or installed, and
no code, identifier, comment or constant table is reproduced here. Behaviour is described in my own words with
plain numbers; the only quotes are two commit titles used as evidence. Balance numbers are the organiser's
published config (`notes/hello_example.json`).

## 0. Three things that changed since the earlier study

1. **The board entry is no longer the 5.19 build.** Wolverines moved from 5.19 to **5.21 at 05:31:17 UTC**
   (snapshots `tools/top10/snaps/lb_0533.html` onward; my own fetch `lb_0624.html` shows rank 12, 5.21, same
   time). The task text ("rank 7, 5.19") is the 05:25 state.
2. **The 5.21 build has a free-for-all switch after all.** The last mech commit before 05:31 is `ae1b122`
   (05:28:01 UTC, tip of branch `mech-royale-exp`, title "Return to combat at six remaining after independent
   eliminations"). It is the 5.19 bot plus 65 lines: once two mechs have died that it did not kill, and while
   more than six are alive, it stops targeting mechs altogether and only evades and loots; at six alive it
   becomes the always-fight bot again.
3. **A newer branch exists**: `mech-royale-sight`, commit `aa8a453` (06:06:15 UTC), the 5.19 bot plus alternate
   aim points when the body centre is hidden. It does not contain the place switch. Not on the board by 06:24.

Consequence for the final: the rules say the unpicked default is the best-scoring entry, and the chosen entry
locks with its practice score. So the Wolverines finalist is, by default, **`ae1b122` (5.21)**; the alternatives
are `b7e9a6d` (5.19, no switch) or a later single-change variant of it. Their old free-for-all line on
`main` / `mech-royale-submit` scored 3.56 for the one team that submitted it and cannot clear the cut (about 4.75
at 06:24), so it will not play. Counters below are built to work against both `b7e9a6d` and `ae1b122`.

## 1. Identity (re-checked)

| Evidence | Value |
|---|---|
| Receipt file in the repo (another track) | names team "Wolverines" and this repository URL |
| Bot's announced name | "TTUN-mech" (same in Kanyaraasi's repackaged copy) |
| 5.19 | board time 00:57:15 UTC; commit `b7e9a6d` ("v8-econ") 00:57:05 UTC, 10 s earlier |
| Own commit titles | "Restore the 5.19 Mech Royale bot from BB-098D02A6" (`11350d3`, byte-identical bot and map files to `b7e9a6d`, md5 checked); an earlier title calls it the "5.19 economy bot" |
| Third party | r1ver's notes link the same commit to 5.19 and derive their 5.08 / 5.10 entries from it |
| 5.21 | board time 05:31:17 UTC; `ae1b122` committed 05:28:01 UTC (196 s earlier); no other mech commit in the repository between 04:18 and 06:06 UTC (all branch heads listed again at 06:34) |

Confidence: team = repo **confirmed**; 5.19 = `b7e9a6d` **confirmed**; 5.21 = `ae1b122` **likely** (timestamp plus
a consistency argument: the two builds behave identically until two mechs die without its help, which is rare
in practice, and 5.19 -> 5.21 is exactly one place-point over 48 matches: 249 -> 250).

Text aimed at AI agents: none found in the team's own files (bot, map module, READMEs, publish helper, receipts).
Commit trailers credit an AI coding tool; one branch commit is authored as "Codex". Nothing to ignore.

Lineage: original bot (one decision function of about 650 lines plus a 325-line map module, on the organiser's
kit wrapper). It is itself the base of r1ver's TypeScript entries (5.08, 5.10) and of Kanyaraasi's 5.19, so three
of the current top 16 share the habits below (the two derivatives without the place switch).

Versions read: `b7e9a6d` completely; `ae1b122`, `aa8a453`, `5db1c3e` (duel ranges), `f2cf182` (v10) as
differences against it; the map module (identical in all). Local copies: `/srv/mech-sparring/ttun_v8econ_b7e9a6d`,
`/srv/mech-sparring/ttun_ae1b122`, `intel/varchaskukreja__TTUN__branches/` (added `aa8a453_bot.ts`, fetched
read-only by commit id into `intel/varchaskukreja__TTUN__sight.git`).

## 2. How it plays (numbers)

**Target.** Every mech it has seen in the last 4 s is a candidate at any range, from the first second. It picks
the lowest of: distance, plus up to 90 m for a full-health mech (health is divided by a fixed 1400), plus 30 m per
second since last seen, minus 50 m for a mech that hit it in the last 3 s, minus 40 m for its target of the last
2 s. No engagement gate, no opening guard.

**Range and movement.** Stand-off is 28 m when it holds lightning, 110 m when it holds a laser, 70 m with the gun
alone, each with a 15 m dead band: full stick in when farther, 0.7 stick out when nearer. On top it always strafes
at 0.9, re-drawing the side by coin flip every 0.35-1.05 s (so real reversals come on average every 1.4 s, with
legs as short as 0.35 s). Because the approach mixes "forward 1" with "sideways 0.9", it closes at only about
74% of its speed: **8.7 m/s walking, 14.5 m/s boosting** while it has a sight line (about 11.2 m/s when it paths
around buildings). With lightning it boosts in from under 90 m while energy is above 70 (a burst of about 1.8 s).

**Fire.** Gun: fires whenever the target is in view, its own map test says the line is clear, range under 230 m
and the torso is within about 2.6 m of a first-order lead solution (three fixed-point passes on the observed
velocity; no latency, acceleration or shooter-velocity term). It empties 12 rounds in about 2.9 s and then waits
for the automatic 2.4 s reload (no early reload during a fight). Laser: starts charging the moment the weapon is
off cooldown with the target in view inside 280 m (inside 60 m even without a line), aims at the observed
position with no lead, releases only at full charge (0.75 s) with the target in view, line clear and torso
aligned; otherwise it keeps holding (half speed) until the weapon discharges by itself 2 s later. Lightning:
fires inside 44 m within 13.5 degrees. Mortar: rarely fires (needs 0.03 rad alignment).

**Defence.** (a) Bullet side-step: any gun round whose path passes within 3.6 m (times its size) of its *current*
position in the next 0.9 s makes it step perpendicular to the path, boosting if energy is above 25 (55 with
lightning and a target). (b) Mortar: runs from a predicted impact within 11 m. (c) Enemy laser: only if its
*current target* shows the charging flag with aim within 0.25 rad of it, it switches boost on along its normal
strafe; it does not use cover. (d) Retreat ("losing"): unless it is finishing (target under 20% health, itself above 20%, at most two mechs in view), one of: own health
under 35% with the target's health fraction at least 0.10 above its own; two or more tracked mechs within 160 m
(seen in 3 s, the target included) and health under 55%; three or more and health under 80%. Then it boosts to
the nearest cell hidden from the target's eye (16 directions, rings every 6 m, at most 50 m), still shooting.
(e) Heal: only with no mech seen for 4 s, no zone pressure and no remembered cube within 40 m; below 55% health
(below 90% for 6 s after the last "losing" tick) it stands still and silent, or creeps at 0.4 stick to a hidden
cell within 36 m, torso spinning. Any sighting ends the heal and it fights again at whatever health it has.

**Economy.** Remembers ground cubes for 40 s and ground weapons for 60 s. During a fight it drops its fight
movement and walks straight to the nearest remembered cube within 70 m (health above 50%), 40 m (below), 12 m
(when losing); otherwise to a wanted weapon within 60 m (gun only) or 35 m. Out of contact it farms: weapons,
cubes, an unheld supply drop within 220 m (it stands still within 5 m of the ring centre), drones within 170 m
(walks to 38 m and stands still shooting; health above 50%), ground crates within 150 m (walks to 30 m, shoots,
steps onto the cube; health above 45%). Roof loot is ignored. It shoots crates and drones whenever health is above
40% and no mech hit it in the last 1.5 s. Loadout: the gun is never dropped; second slot laser over lightning
over mortar, so it never carries laser and lightning together. Upgrades: hull first (plating, then armour, then
nanites), weapon upgrades after.

**Zone and endgame.** Out of contact it heads for the point at 45% of the next radius on its own side when it is
outside, beyond 90% of the current radius, or beyond 80% of the next radius with the shrink running or closer
than walk time plus 12 s. In a fight it ignores the zone until it is actually outside; then it drops the fight
movement and runs straight for that point (boost above 20 energy), still shooting. There is no last-circle
logic at all.

**Free-for-all switch.** `b7e9a6d`: none. `ae1b122`: from the moment (16 - alive - own kills) reaches 2 and while
more than 6 are alive, it has no target: it never fires at a mech and never returns fire. It keeps looting and
shooting crates and drones. When the nearest mech seen in the last 1.5 s is within 150 m it walks to the nearest
cell hidden from that mech (search to 60 m, recomputed at most every 0.6 s), boosting only when that mech is
inside 55 m; with no usable cover it runs 55 m straight away (boost inside 65 m). At six alive it is again the
shoot-on-sight bot, now with everything it farmed.

## 3. Why it scores (practice)

| Feature | Evidence | Grade |
|---|---|---|
| Economy in contact (cube and weapon memory, detours 70 / 40 / 12 m, laser preferred, plating first): the only named change of the 5.19 commit | 5.19 official; the sibling line without it, with lightning first, armour first and a free-for-all latch, scored 3.56 for another team (-1.63, confounded) | official, one team |
| Fights everything, focuses (current-target and attacker bonuses, weak-target weighting), retreats only when clearly losing | part of the 5.19 package; no A/B | official package |
| Bullet side-step with boost | my own toy model (`tools/top10/wolv_hit_model.py`): an exact first-order lead hits this strafe-plus-side-step 76% at 55 m, 56% at 70 m, 41% at 90 m, 25% at 110 m, 15% at 130 m. House bots use exactly that lead (doctrine D1), so at its 110 m laser band their guns mostly miss while its laser lands | model only |
| Fixed work per decision (20 ms fuse, fixed expansion cap), compiler warm-up at start | answers p50 0.5 ms, p99 10-12 ms, max 22 ms in our smoke test | measured locally |
| Place switch | 5.21 vs 5.19 = +1 place-point in 48 matches | official, one draw, timestamp link: noise-level |
| r1ver's fork (cube piles chosen by upgrade value) | 5.08 / 5.10 official; -0.56 against the original in their 32-seed local test | official + simulator |

Tried after 5.19 and not kept (the board stayed at 5.19 for four and a half hours): a bundle of "fight where
non-target mechs cannot see us" + "step to cover from a charging laser" + a wider lightning cone; leaving drones
when under half health; pure evasion from spawn (reverted after 10 minutes). No scores are recorded; if they were
submitted they scored at most 5.19.

## 4. Free-for-all record

Up to 11 recorded top-16 showdowns (02:00-04:00 UTC, when the entry was `b7e9a6d`): average about 6th of 16
(a random mech averages 8.5th). No per-match detail is public. The 5.21 build has never been recorded.

## 5. Limitations (each with its mechanism)

1. **Blind to third parties.** With a target, the torso (and the 120 degree view wedge) is slaved to that target.
   Damage from anyone else never turns it; a mech more than 60 degrees off its target line and beyond the 45 m
   proximity ring is never tracked, never counted as a threat, never dodged (it only sees projectiles inside its
   view) and its retreat cover is computed against the target alone.
2. **Late bullet reaction.** The side-step tests the path against where it stands now, so a correctly led round
   triggers it only in the last 0.24-0.34 s; inside about 55 m most rounds land anyway (model 76-95%).
3. **Straight, unstrafed walks**: to a remembered cube or weapon mid-fight, to the zone point when outside, to
   cover when losing, to loot out of contact. Destination and speed are predictable.
4. **Stands still** 38 m from a drone (inside its 45 m aggro ring), 30 m from a crate, and within 5 m of a supply
   drop centre, torso fixed on the object: anything beyond 45 m and more than 60 degrees off is unseen, and beyond
   90 degrees hits its rear arc (x1.5).
5. **Memory hand-off.** After a sight break the engine still feeds it our true position for 5 s: it keeps its band
   and cannot shoot. For the next 4 s it walks to our last tracked point while its torso follows a straight-line
   extrapolation of our last velocity (up to 47 m off at walk speed, 78 m at boost). After 9 s it has forgotten
   us; it never searches.
6. **Laser handling.** Charges on sight every 2.4 s cycle (half speed for at least 31% of a laser fight), flag
   visible, releases only at full charge with the target in view; a target that hides makes it carry the charge
   at half speed for up to 2.75 s and discharge into the wall, followed by 1.65 s of cooldown.
7. **Enemy-laser response is weak**: boost along the strafe, only against its own target, only while that aim is
   within 0.25 rad. A beam charged by anyone else, or swung on in the last decision, gets no response; and a
   boost of 2 m per decision does not escape a latency-corrected hitscan anyway.
8. **No gun discipline.** Fires at any aligned target to 230 m, 12 rounds then 2.4 s dry, no early reload in a
   fight. Its gun is audible to 320 m all match long.
9. **Slow to close** (8.7 m/s with a sight line): it cannot catch a mech that walks straight away, and the
   lightning rush gains only about 5 m during its boost burst.
10. **Zone-blind stand-off.** In a fight it obeys its range rule until it is physically outside, then runs in,
    then backs out again. Against a target at the centre a laser carrier (wants at least 95 m) is forced outside
    from about t = 314 s, a gun-only carrier (55 m) from about 358 s, at 100-260 HP/s, with no regeneration and
    straight inward runs. Roughly half its time is then spent outside (about 80-130 HP/s lost).
11. **Retreat logic counts sightings, not shooters**: three mechs in view within 160 m and health under 80% make
    it run although nobody shoots; unseen attackers never make it run. Its hide cell is simply the nearest cell
    hidden from the one target (rings of 6 m), which we can compute too.
12. **Heal is fragile**: any mech in view cancels it; it leaves at 55% health.
13. **Navigation**: ground only, original body size (it grows 5% per cube), one path search at a time, straight
    lines while the search runs, strafing ignores obstacles; when blocked for 0.6 s it jumps and jets (a ballistic
    hop), and it never uses roofs.
14. **Sight model**: one solid column per map cell (it believes it cannot shoot under bridges and overhangs),
    trees ignored, one aim point at body centre (the unscored 06:06 branch adds top, low and side points).
15. **Loadout rigidity**: never drops the gun; with lightning it closes to 28 m on anyone regardless of their
    weapons or health.
16. **`ae1b122` only: a harmless phase.** Between the second death it did not cause and six alive it does not
    shoot mechs at all. It flees only from a mech it currently sees inside 150 m; from farther away it does not
    even run. Its torso looks along its path until it is hit (first hits land on the rear arc), it keeps giving
    its position away by shooting crates and drones, and under 55% health with cover within 36 m it limps at 0.4
    stick (4.7 m/s; 7.8 m/s if the pursuer is inside 55 m). The trigger cannot tell practice from a free-for-all
    and ends abruptly at six alive.

## 6. Signatures an opponent can see

- "gun" is always in its weapon list: gun; gun + laser; gun + lightning; gun + mortar. Never laser + lightning.
- First 3 s after spawn: torso spins at full turn rate (about two full turns).
- Opens gun fire on first mutual sight at any range up to 230 m, also in the first seconds of a match.
- Settles 55-85 m from its target with the gun alone, 95-125 m with a laser, 13-43 m with lightning; tangential
  speed about 10.5 m/s with side changes 0.35-1.05 s apart (or multiples); halves while the charging flag is up.
- Charging flag appears as soon as its laser is ready and we are in view; beam leaves exactly at full charge.
- With lightning: boost from under 90 m, boost stops inside 43 m.
- Mid-fight straight walk onto a visible ground cube within 70 m; after a kill nearby it walks onto the pile.
- Farming pose: motionless about 38 m from a drone or 30 m from a crate, gun firing, torso fixed.
- Travelling: torso sweeps about 52 degrees either side of the heading with a 4.8 s period. Healing: motionless,
  torso rotating continuously (a full turn about every 1.6 s).
- Runs with boost to the nearest building edge when hurt (under 35% one on one, under 55% with two mechs in its
  view, under 80% with three), still firing; occasional jump-and-jet hop when pinned on a wall.
- High maximum health for its cube count (plating first).
- `ae1b122`: after the second death it did not cause and until six remain, a gun carrier that has us in view and
  neither turns to us nor fires, walks to the nearest building edge when we are inside 150 m, keeps shooting
  crates and drones, turns to face us within about a second when hit but does not shoot back; at exactly six
  alive it turns into the shoot-on-sight strafer above.

## 7. Counters, ordered by expected gain in a free-for-all

Machinery assumed: exact gun lead, laser peek from cover, cover and exposure evaluation on the 2 m grid, path
planning, 5 s sight breaks, bullet-aware dodging, stance thresholds. Gains are mechanical estimates, not
measurements.

### C1. Harvest the non-returner (specific to `ae1b122`, self-checking)
- **Trigger:** alive between 7 and 14. A gun carrier that (a) had us inside its view wedge (its aim within 55
  degrees of our bearing, under 190 m, clear line) for 1.0 s without its aim closing on us and without a round or
  charging flag toward us, or (b) after our first hit faced us for 2.0 s without firing. Set a per-mech flag
  "does not return fire"; clear it the instant that mech fires at any mech, shows a charging flag within 0.3 rad
  of us, or alive drops to 7 or less.
- **Action:** with a laser, shoot it from **150-190 m** (outside the 150 m radius at which it starts to flee):
  laser at every cooldown (315 per 2.4 s, hitscan, about 131 HP/s, more with our cubes), gun only when it stands
  still or walks straight. Open from more than 90 degrees off its aim (it looks along its path or at a crate)
  with a pre-charged laser plus the first gun rounds: about 470 + 2 or 3 x 68 in the first half second (rear
  x1.5). Without a laser, close to 60-90 m along cover but stay **beyond 55 m** so it never boosts; it walks
  straight to the nearest cell hidden from us (we can compute that cell with the same rule: nearest hidden cell
  on 6 m rings within 60 m) so path to a cell that sees its hide cell instead of following it round the corner.
  Under 55% health it limps at 4.7 m/s: finish it. Limits: 12 s per chase; stop if another mech comes within
  120 m, our health is under 70% at the start or under 55% at any time, or alive reaches 7.
- **Exploits:** limitation 16 (no target, no return fire, flight only inside 150 m, rear exposed, limp).
- **Backfire:** it is the 5.19 build, or another bot holding fire to ambush: it answers a probe by fighting at
  its band. Bounded by probing only from a corner with a hide cell within 6 m at 100 m or more, and by the 2 s
  no-return test before committing. Our gun (320 m) and laser (380 m) are loud: the 12 s limit and the 120 m
  third-party rule bound that. At six alive it turns hostile with a full cube stack: be behind cover from it
  before the seventh mech dies.
- **Gain:** a kill for roughly 6-14 s of fire and almost no damage taken; all its cubes plus two (it farms the
  whole mid-game); and it removes the mech that would otherwise arrive in the last six at full strength.
- **General rule?** Yes, once the 2 s no-return test has passed and with the corner, health and third-party
  limits. Our own doctrine line "motionless hider: out-farm it, finish it late" is wrong for this bot: late is
  when it switches back on.

### C2. Third-party flank from outside its view wedge (both builds; best against `b7e9a6d`)
- **Trigger:** a shoot-on-sight gun carrier whose torso tracks another mech A (rounds or charging flag toward A).
- **Action:** pick a firing cell on the exposure grid where the angle at the Wolverines mech between A and us is
  at least 75 degrees (100 or more gives rear x1.5), range 60-110 m (never inside 45 m), hard cover within 6 m,
  preferably hidden from A. Fire gun at full cadence with exact lead and the laser at every cooldown. Re-check
  the angle every decision (its wedge turns with A). Break sight 0.5 s before A dies, when A drops under 15%
  health, or when A has been out of its view for 3 s: with no target it turns to the last damage bearing within
  about 0.8 s. If its aim comes within 0.5 rad of us, step behind cover.
- **Exploits:** limitation 1. It does not see our rounds, so it does not side-step them: model hit rate 85% at
  70 m and 70% at 110 m, against 56% and 25% when we are its target. It neither turns, nor counts us, nor hides
  from us.
- **Backfire:** a different bot with the same loadout may turn on its strongest attacker: then we face a full
  health gun or laser at 60-110 m. Bounded by the corner within 6 m and the 0.5 rad rule (leave, break sight for
  9 s). A may turn on us: stay hidden from A or beyond 150 m of A.
- **Gain:** 130-290 HP/s unanswered for the length of its duel (gun 130-160 HP/s at those hit rates in the
  magazine, laser 131, rear bonus on top); normally decides its duel and leaves two cube piles next to our
  corner.
- **General rule?** Yes: safe against any mech that is busy with someone else, with the same bounds.

### C3. Shoot the straight walks and the stops; bait with a cube pile (both builds)
- **Trigger:** (a) its velocity points within 10 degrees of a visible ground cube or weapon inside 70 m of it for
  two decisions; (b) speed under 1 m/s while it fires at a drone or crate; (c) it stands in a supply-drop ring;
  (d) it is outside the zone heading in; (e) it is running to cover.
- **Action:** treat it as a constant-velocity or stationary target: waive our long-range gun gate for one
  magazine (out to 150 m), release the laser on it. For (b) and (c) approach unseen from more than 60 degrees
  off its aim and beyond 45 m and open with the pre-charged laser from the rear arc. Bait: after a kill within
  70 m of a Wolverines mech, do not walk straight onto the pile; hold a corner 60-100 m from the pile with the
  laser charged behind cover: it will walk a straight line onto it (from 70 m when above half health, 40 m below).
- **Exploits:** limitations 3 and 4.
- **Backfire:** cube piles attract everyone: bait only with 3 cubes or fewer at stake or when it is the only mech
  within 100 m, and never leave our pile for more than 5 s. Waiving the gate wastes at most one magazine.
- **Gain:** one laser hit (315, or about 470 from the rear) plus 5-8 gun hits per window at near-zero dodge.
- **General rule?** Yes for the shots; the bait is specific to bots that detour for cubes but cheap.

### C4. Corner duel timed on its magazine and its laser (both builds, when it targets us)
- **Trigger:** its torso is on us and rounds are coming; a hide cell exists within 6 m (9 m with boost).
- **Action:** never trade in the open at 90-130 m (model: our gun hits it 15-41% there while its laser always
  lands). Fight from the corner. Count its rounds: after the 12th there are 2.4 s without gun fire: peek and
  empty our magazine. When its charging flag appears with aim within 0.25 rad of us, be behind the corner within
  0.6 s; it then carries the charge at half speed and the weapon fires into the wall by itself at most 2.75 s
  after the flag appeared: peek in the following 1.6 s of cooldown (or right after hearing the beam). Our laser:
  charge behind the corner, step out, release in the same decision at its position plus 0.1 s of its velocity.
  During the 5 s of engine memory it stays in the open at its band, so every peek finds it there.
- **Exploits:** limitations 6, 7, 8 and the fact that it does not use cover outside "losing".
- **Backfire:** a bot that pushes corners (lightning) or that holds a charged laser on the corner. Its torso
  follows us through the wall for 5 s, so a peek while it may hold a charge is punished: peek only in the timed
  windows. With lightning in its list switch to C5. Leave (break sight 9 s) if two mechs have a line or health
  is under 55%.
- **Gain:** laser exchange close to one-sided; its gun effectiveness roughly halved.
- **General rule?** Yes.

### C5. Hold the centre in the small circles (both builds; needs it to carry laser or gun only)
- **Trigger:** next radius 70 m or less and a Wolverines-pattern mech alive without lightning.
- **Action:** take hard cover within 10 m of the next centre early (doctrine D9) and never chase outward. Its
  range rule pushes it out of the zone whenever we are its target (laser from about 314 s, gun only from about
  358 s). Shoot it on its straight inward runs with exact lead and while it is outside (no regeneration).
- **Exploits:** limitation 10.
- **Backfire:** the centre is the most crowded place late. If two other mechs are within 60 m of it and we are
  under 60% health, hold cover at half radius instead. A lightning carrier (13-43 m band) is not squeezed.
- **Gain:** about 80-130 HP/s of zone damage on it for as long as it targets us; decides places 2-4.
- **General rule?** Yes (it is our D9 rule); also a check on our own code: any stand-off rule must be clamped
  to the zone, or our 150 m laser band produces the same bug in every circle smaller than that.

### C6. Walk-away kite of the lightning carrier (both builds)
- **Trigger:** lightning in its weapon list, range under 90 m and closing.
- **Action:** walk straight away at full speed along cover toward the next centre, keep 50 m or more, gun with
  exact lead and laser at every cooldown; boost for 1 s if it comes inside 52 m. It closes at 8.7 m/s walking
  and gains about 5 m in its boost burst, so from 50 m it never reaches 44 m. Do not break the sight line while
  kiting (around buildings it paths at about 11 m/s).
- **Exploits:** limitations 9 and 15.
- **Backfire:** a lightning bot that runs straight in at 19.5 m/s catches a walker: if the measured closing
  speed exceeds 12 m/s for 0.5 s, boost to hard cover and fight at the corner instead. Never kite out of the
  zone or across open ground watched by a laser.
- **Gain:** its best weapon does nothing while it takes 150-300 HP/s for as long as it insists.
- **General rule?** Only with the closing-speed check.

### C7. Nine-second break and ghost ambush (both builds)
- **Trigger:** it targets us and we break the sight line behind hard cover.
- **Action:** correction to our "5 s break" rule: against this family it takes **9 s** (5 s engine memory + 4 s
  of its own), and in seconds 5-9 it walks to our last tracked point. So be at least 20 m from that point before
  second 5. To punish it: at 4.5-5.0 s be moving fast in direction A along the wall, then double back and set up
  on side B with the laser charged; it arrives with its torso on the extrapolated ghost toward A. Engage at
  50-80 m when the angle between its aim and our bearing exceeds 60 degrees (90 for rear x1.5).
- **Exploits:** limitation 5.
- **Backfire:** bots that search, or that sense us inside 45 m: engage at 50 m or more and keep the hide cell.
- **Gain:** one unanswered salvo (about 600-850) per re-engagement; avoids being walked onto while healing.
- **General rule?** The relocation and the 9 s timer are safe against anyone; the ambush is optional.

Safe as general rules for the same signature: C2, C3 (shots), C4, C5, C7 (relocation). Conditional: C1 (after
the 2 s no-return test), C6 (after the closing-speed check).

## 8. Lessons for our own practice bot, against DOCTRINE V4

1. **No gate, no opening guard** at 5.19 [T, official]: it fires on every mech seen in the last 4 s from t = 0.
   D0's 40 s guard and D5's candidate filter are stricter and rest on one +0.23 A/B of a 3.6-3.8 bot [1].
   Disagrees: keep both as presets and test them on the real scorer.
2. **Bands 70 / 110 / 28 m, dead band 15 m, in 1.0, out 0.7, strafe 0.9** [T]: equal to D2's gun band and the
   `mid` laser preset. Agrees; `far` (150 m) stays contested.
3. **Economy in contact** (memory 40 s; detours 70 / 40 / 12 m; weapon 60 / 35 m; no heal with a cube within
   40 m) is the named reason for 5.19 [official, one team]. D6 already carries these numbers: agrees. Addition
   [N]: the detour is an unstrafed straight walk, the moment house bots hit best; keep the bullet-aware dodge
   on during detours.
4. **Farming threshold 45-50% health** [T] against D6's 90%. Disagrees: make `farmHp` 50 an early A/B.
5. **Place switch at two foreign deaths scored 5.21 vs 5.19** [official, one draw, noise-level]. A death-count
   latch is nearly inert in practice, which supports D12 (three deaths) and suggests the sibling line's 3.56 came
   from its beam clue or its missing economy, not from the death count. Keep `beamClue` off. Agrees with D12.
6. **Retreat**: under 35% with the target 0.10 healthier; under 55% with two in view; under 80% with three [T].
   D3 uses 50% and 60% (from the 5.58 bot). Contested: keep D3, offer the other as a preset.
7. **Heal exit at 55%** and fight again on any sighting [T]; D3's `healExit` is 70%. Mild disagreement,
   consistent with D3's own evidence that waiting costs: A/B `healExit` 55.
8. **No gun gate, no early reload** [T] against D2's 0.55 s flight gate [S]. My model of this bot's own dodge
   (25% at 110 m, 13% at 150 m) supports D2 and D4 rather than the bot's habit. Keep D2.
9. **Dropped ideas** [official upper bound, weak]: stepping to cover from a charging laser and leaving drones
   under half health were both tried after 5.19 and not kept. D4 (cover step within 6-9 m) and D6 (drone
   back-off) contain the same ideas: keep them switchable.
10. **Engineering** [T]: fixed work cap per decision with a clock fuse only as a safety net, start-up warm-up.
    Agrees with D10.
11. **Loadout and upgrades** [T]: gun kept, laser over lightning, plating then armour then nanites. Agrees with D7.
12. **Strafe timing**: coin-flip re-draw every 0.35-1.05 s means a real reversal every 1.4 s on average. No real
    conflict with D4's 0.8-1.6 s rule; a coin-flip variant is a possible preset.
13. **Zone**: same rule as D9 with 45% instead of 50%. Avoid its bug: clamp our stand-off movement to the zone.

## 9. Not established

- Whether 5.21 is `ae1b122` rather than a re-run of another branch (timestamp and consistency only).
- Which entry the team will pick, and whether a later variant will replace both.
- Any recorded free-for-all of the 5.21 build; per-match showdown data for this team.
- Whether the engine scales boost speed with a 0.4 stick (the limp speed 7.8 m/s inside 55 m assumes it does).
- Hit-rate figures come from my own 1-D model, not from matches.
