# A-bot LLC (rank 1, 5.58) and scorpion (rank 2, 5.58): clean-room study and counters

Analyst note, 21 Nov 2026, about 06:30 UTC. Source read: Kgc3105/MAGIC-Royale (TypeScript on Bun), commit 53f6854.
Nothing from the repository was executed, built or installed. Files were read with cat / grep / git show / git diff
only. No code, identifiers, comment text or constant tables are reproduced here; behaviour is described in my own
words with plain numbers. All "expected gain" figures are analytical estimates from the rules and the bot's
decision logic; none was measured (running their bot was out of scope for this study).

## 1. Identity and exact version (re-checked)

- A-bot LLC = this repository: CONFIRMED.
  - The head commit e39579f (05:11:53 UTC) says in its message that the previous commit "scored 5.17 on the real
    board against 5.58 before it". At 05:11 UTC the only team that had ever shown 5.58 was A-bot LLC (board time
    03:37:53 UTC); scorpion's 5.58 came later (05:17:03 UTC).
  - Commit 53f6854 was made 03:30:03 UTC, 7 min 50 s before A-bot LLC's 5.58.
  - New evidence found in this pass: the public repository carries seven lightweight tags named
    "submitted-<score>", one per submitted commit: 3.13, 3.67, 4.58, 4.63, 5.35, 5.58 (on 53f6854) and 5.17 (on
    aace465). Every one of these values is a multiple of 1/48, as an official 48-match mean must be. This is the
    team's own record of its official results.
  - The tree of e39579f is identical, file for file (git blob hashes), to the tree of 53f6854. The sparring copy
    /srv/mech-sparring/magic_53f6854 has the same blob hashes for all five bot source files. So the 5.58 bot is
    readable in full, and the repository head still was e39579f at 06:09 UTC (checked with a read-only ref
    listing).
- scorpion = the same code: LIKELY, not proven. Exact tie at 5.58 reached 5 min 10 s after the repository
  restored the 5.58 version; identical code is known to reproduce identical official scores. scorpion's earlier
  4.21 (03:17 UTC) is a value two other teams also hold (01:04 and 03:33 UTC), which suggests scorpion runs
  public code in general; the tag list shows the commit made 4 minutes before that 4.21 actually scored 5.35, so
  the 4.21 was not this bot. Whether scorpion is a second account of the same people or a copier cannot be
  established. For the final assume two mechs run this code.
- Bot name announced: "magic-royale". Lineage: original code. The README credits the organisers' starter wrapper
  and Dockerfile layout, and says two tactics (hold fire while repairing; aim at the shoulders when the centre is
  behind cover) were "informed by" the public GT Goats bot (called Astra), with no code copied.
- Text aimed at AI agents: none found (searched source, tools, README, hidden files, commit messages).
- Scratch object created by me: a bare repository holding only the seven tagged commits, fetched read-only, at
  tools/top10/magic_tags.git (used for git diff between submitted versions).

## 2. The team's official ladder (their own tags; one 48-match evaluation each)

| Official | Commit | What changed since the previous submission (my summary) | Step |
|---|---|---|---|
| 3.13 | db7ce38 | first bot: grid map, path planning, zone, gun lead, laser timing, bullet dodge, cover break when losing | - |
| 3.67 | 347636b | takes a nearby cube or laser even in contact; zone outranks cover; gives up unreachable loot; farms only at full health; rest spot with few sight lines; free-for-all detector and hide-first posture (inactive in practice) | +0.54 |
| 4.58 | bb460bb | aim uses target motion relative to own motion; tighter release window (60% of target radius sideways, vertical window tied to the aim point); keeps charging the laser while retreating from several mechs above 30% health | +0.91 |
| 4.63 | f0a85ee | laser stand-off band moved from 70-140 m to 125-185 m with a real retreat-point search and boost; runtime thread limits and start-up rehearsal (worst answer 55-114 ms down to about 16 ms) | +0.05 |
| 5.35 | e0ba5cf | break off on enemy count at 4 (was 3); charge on the run down to 15% health (was 30%); dodge weight 4 -> 7; gun fires one decision early as the aim swings on | +0.72 |
| 5.58 | 53f6854 | break off on count at 6 (was 4); with exactly two enemies break off below 50% (was 65%); charge at any health; dodge weight 7 -> 10 | +0.23 |
| 5.17 | aace465 | no retreat on low health or when out-gunned by a laser, leave hiding at 50%; crates only within 100 m (was 150); loose cubes to 130 m (was 90) | -0.41 |

Their simulator numbers for the same steps: +0.63 (two fresh sets) for the 5.35 bundle, +0.34 +-0.06 for the 5.58
bundle, and +0.25 +-0.07 for the bundle that officially lost 0.41. Every step is a bundle, so single causes are
not separated; each official number is one paired sample of 48 seeded matches.

## 3. How it plays (version 53f6854)

Structure. One decision per observation: update memory, judge the situation, pick one goal point, steer by
scoring 16 compass directions plus standing still, then aim and fire. Map: 1 m raster of terrain and solids for
lines of fire, 2 m grid A* for walking. Ground only: roofs are impassable in its planner, roof loot is ignored,
and it never jumps or jets except a 0.9 s hop after being stuck about 1.2 s. Trees do not exist in its model.

Memory. A mech counts as a threat only if it was listed in the last 3 s and is within 300 m (the server keeps
listing a mech for 5 s after it leaves view, so about 8 s after a clean sight break we are no threat at all). An
unseen shooter is placed from the laser beam's origin (exact) or along the hit bearing at an assumed 110 m (35 m
for lightning). It never shoots at such a guess; it only hides from it and turns to look for 2.5 s.

Target. Only mechs listed this tick. Nearest first (one point per 60 m), weaker first, plus a strong bonus for a
clear line of fire, a small bonus for the current target and for whoever hit it in the last 4 s. No bonus for
mechs that are busy with someone else (that experiment is switched off).

Two postures.
- Take-the-fight posture (default; all of practice): fights any mech with a clear line inside 175 m, any mech
  inside 60 m, and anyone who hurt it in the last 4 s. It walks straight at a target that is too far and holds a
  band by loadout: gun only 45-85 m; laser 125-185 m (backs off below about 121 m, boosts away below 110 m with
  energy above 45, never while charging); lightning 12-36 m; without a laser against a laser holder 30-60 m;
  never inside 60 m of a lightning holder unless it has lightning itself; closes to 45 m on a target under 30%.
- Hide-first posture (latched for the rest of the match once deaths it did not cause reach 3): goes to a cover
  spot hidden from every threat, never walks at an enemy, and trades shots only with a mech inside 120 m, one
  that hurt it in the last 4 s, or one that is clearly losing (target below half of its own health points, or
  target below 55% and it has 1.3 times the target's health). It leans out when a weapon is ready and back when
  none is. It leaves cover to run down a lone target under 25% within 130 m when it is itself above 50%.

Retreat (take-the-fight posture). Breaks the line of fire when: health below 40% with any enemy (unless the target
is clearly losing); exactly two enemies and below 50%; six or more enemies; hit by an unseen shooter with nothing
to shoot at; or the target has a laser, it has none, the range is over 55 m and it is below 80%. With three to
five enemies only the 40% rule applies. While hiding it shoots back only during the first second after each hit,
or at a target inside 45 m or under 25%; otherwise it is silent so repair can start. It returns above 85% (one
enemy in sight) or above 75% (none), or after 8 s without contact. Hide-first posture: 45% with one enemy, 70%
with two, always with three or more, 85% when out-gunned; returns above 85% or after 10 s.

Shooting. Gun: constant-velocity intercept with own motion removed, fired only with a clear line, when the bullet
flight is at most 0.8 s (about 200 m) or the target is slower than 3 m/s, inside a window of 60% of the target's
radius. Laser: starts charging as soon as the cooldown allows if the target is in view or was in view within
1.5 s, or is walking up to its corner inside 70 m; releases only at full charge (or earlier if the partial beam
kills) and only with a line of fire and the aim on the body; a started charge is held until the server fires it
(2.75 s after the start) if the line never comes back. While charging it moves at half speed and cannot boost.
Lightning inside 43 m. Mortar is the least valued weapon and is fired only with a direct line (never lobbed over
a building).

Dodging. Every visible bullet whose closest approach within 1.4 s is under radius + 2 m is avoided with a weight
that dominates everything except the zone; drone bullets count 0.6; mortar landings are avoided out to about
12 m. Baseline strafe is sideways to the target, direction flipped every 0.45-1.15 s. When an enemy laser is
charging and pointed within 0.3 rad (17 degrees) of it, it steers out of the line of fire if cover is within
about a second's walk, unless its own laser is at least 0.45 s charged.

Economy. Second slot: laser first (walks up to 320 m for one when nobody is about, 120 m even in contact, 72 m in
hide-first posture), lightning as a stopgap, mortar only into an empty slot; the gun is never dropped. Cubes
within 90 m; in contact a cube within 45 m (25 m hide-first) if above 35% health and no enemy is closer to it.
Crates and drones only when no threat for 6 s, health at least 90%, fewer than 14 cubes: crates are shot from up
to 150 m as soon as there is a clear line, drones from 110 m. Supply drops within 280 m when not fighting,
setting off to be there up to 16 s before the landing. Upgrades: hull points first, then repair, damage
reduction, leg speed, then laser and gun damage; sensors and mortar upgrades last.

Zone and endgame. Leaves for the next circle when the edge is about 5 s away (earlier in the 60+ damage phases),
to the point at half the next radius on its own side (35% for the 70 m circle), where it rests beside a wall at
the spot fewest directions can see. From the moment the next circle is the 25 m one (t = 325 s) it walks to the
exact next centre and stays there with all hiding disabled; after the last shrink starts (t = 390 s) it also
stops dodging.

## 4. Why it scores in practice

1. Aim and release discipline: +0.91 official for a 44-line change (relative-motion aim, narrow release window,
   keep charging on retreat). Their own sparring: laser releases 70% -> 97% hits, gun 69% -> 74% (simulator).
2. Fighting on instead of leaving when several hunters are in view, with a heavier bullet dodge: +0.72 and +0.23
   official (two successive bundles, same direction).
3. Keeping a low-health / out-gunned retreat with a silent repair: removing it cost 0.41 official although their
   simulator predicted +0.25.
4. Power during contact (cube within 45 m, laser within 120 m) and farming only at full health: part of the
   +0.54 official bundle; their simulator puts a starting laser at about one more house bot outlived.
5. One-CPU engineering (compiler and collector threads limited, a few hundred rehearsal decisions at start-up):
   worst answer 55-114 ms -> 16 ms (sandbox check); official step with the range change only +0.05.
6. Laser stand-off 125-185 m instead of 70-140 m: official +0.05 together with item 5, so about neutral.

## 5. Lessons for our practice bot, against DOCTRINE V4

Grades: [1 official] one paired official sample (bundle), [T] the top bot's choice without an A/B, [sim] their
simulator only, [C] contested.

1. AGREES with D8, and it is the largest single step on their ladder: lead with target motion relative to ours,
   release window 0.6 x target radius sideways, vertical window from the aim point (about 1 m above when aiming
   at the shoulders), laser released only at full charge unless the partial beam kills. +0.91 [1 official].
2. DISAGREES with D3 for 3-5 hunters. V4 breaks off below 60% with 3-5 threats. The 5.58 bot uses its 40% rule
   there and a count rule only at six; moving the count rule 3 -> 4 -> 6 and the two-hunter rule 65% -> 50% came
   with +0.72 and +0.23. Proposal: default 40% for 3-5 threats, keep 60% as a preset. [1 official x2, bundled]
3. AGREES with D3 on keeping a low-health retreat (their 40% against our 35%): -0.41 when removed [1 official,
   bundled with the out-gunned rule and two farming ranges].
4. MISSING in D3: the out-gunned rule. Without a laser, against a laser holder beyond 55 m, break the line of
   fire below 80% health; otherwise close to 30-60 m. It was removed in the bundle that lost 0.41. Add as a
   preset. [1 official, bundled]
5. DISAGREES with D4 numbers. Theirs: horizon 1.4 s, margin radius + 2.0 m, weight far above the goal term,
   every candidate direction predicted with real acceleration, drone bullets at 0.6. V4: 0.9 s, radius + 1.2 m,
   blend 0.9. Their weight went 4 -> 7 -> 10 inside the two winning bundles. Proposal: preset with 1.4 s and
   +2.0 m, dodge dominant. [1 official x2, bundled]
6. CONTESTED with D4 strafe rule: they flip every 0.45-1.15 s (mean 0.8 s) at 5.58; V4 forbids faster than 0.8 s
   on one team's -0.7. Their strafe is a mild preference under the dodge term. Keep V4, mark [C], test once.
7. D2 laser band: "far" (125-185 m) is their choice, but the official step from 70-140 m was +0.05 with a runtime
   fix in the same commit. So far versus mid is undecided, as V4 says. Their boost-away trigger is 110 m with
   energy above 45, not 90 m / 30. [1 official, about neutral]
8. D2 gun-only band: theirs is 45-85 m (V4 55-95). Their search tried 30/60 and 70/110 without a gain. [T, sim]
9. DISAGREES with D6 on crates: they shoot a crate from up to 150 m at the first clear line and fetch the cube
   afterwards; V4 walks to 30 m. Their 100 m variant was inside the losing bundle. Drones from 110 m. [T]
10. DISAGREES with D6 on the laser detour: 120 m in contact (above 35% health, uncontested) and 320 m out of
    contact, against V4's 60 m and "no long detours". Suggest a laser-only exception. [T, sim]
11. DISAGREES with the D0 opening guard: they engage any mech with a clear line inside 175 m from the first
    second; a build-up phase before the first kill did not beat that in their sparring. [T, sim; C with the
    +0.23 one-team result behind D0]
12. AGREES with D10: thread limits plus rehearsal. AGREES with D12: the same latch (3 deaths not ours) without a
    time limit lived inside the 5.58 score. [T]
13. Simulator caution: their paired search over 600 simulated matches gave the wrong sign for the retreat
    change. Retreat and repair settings must be judged on the official scorer. [1 official against sim]
14. D8 hand-over of the torso to the direct laser aim: they do it from 0.3 s before full charge (60% charge), V4
    from 80%. D2 gun gate: they fire out to 0.8 s of bullet flight, V4 stops at 0.55 s. [T, C]

## 6. Behaviour in a real free-for-all

No public record exists: neither A-bot LLC nor scorpion appears in any recorded showdown. From the code:

- Detector: deaths in the match minus its own kills reach 3; latched for good. In recorded free-for-alls the
  bottom half died after a median 21 s, so expect the switch at 15-40 s. Until then it is in take-the-fight
  posture and walks at any mech it sees inside 175 m.
- After the switch: cover-sitter with a 120 m bubble (any visible range if we are clearly weaker), gun + laser,
  keeps farming crates whenever nobody is in view and it is at 90% or more, rests beside a wall at about half the
  next radius on its own side, walks in just ahead of the zone edge, goes early to supply drops and waits on the
  landing point, and from 325 s stands on the next centre in the open.

## 7. Limitations (each checkable in a sparring match)

1. Laser tunnel: full-charge-only release, a started charge is always held to the forced discharge (2.75 s) when
   the line is lost, half speed and no boost while charging. A sight break right after the flag appears wastes
   the beam and buys 1.65 s of cooldown plus 0.75 s of recharge.
2. No new charge starts more than 1.5 s after it last had a line on the target (unless the target approaches
   inside 70 m). After a wasted beam its laser is idle: a fresh peek has at least 0.7 s before a beam can come.
3. Duck test needs our aim within 0.3 rad of it while our flag is on; a charge held 0.35 rad or more off-axis
   does not trigger it. It also cannot duck when no cover is within about 5-11 m, or when its own laser is hot.
4. Gun lead is first order and it shoots out to 0.8 s of flight: beyond about 110 m a velocity change during the
   flight makes it miss, and it empties 12 rounds in 2.9 s, then reloads 2.4 s.
5. Bullet dodge only sees bullets inside its 120 degree view wedge (or within 45 m). Fire from more than 60
   degrees off its aim is not dodged; more than 90 degrees off also gets the 1.5 rear multiplier.
6. No pursuit, no search: its fight ends the tick the line is lost unless we are inside 60 m or hurt it in the
   last 4 s. For 12 s it stares at our last known position.
7. Ground only: cannot follow onto a roof, ignores roof loot, treats every bridge as a wall once its reported
   height passes 10.8 m (five cubes), needs wider corridors as it grows (radius 3.75 m at 10 cubes).
8. Cover fails as it grows: its hide test needs both mid-body and top hidden; at 14+ cubes (height over 15 m)
   few spots qualify and it settles for the least bad one.
9. Zone-forced walks ignore cover (zone weight four times the normal goal, cover weight cut to 30%): it crosses
   open ground on a straight planned path to the half-radius point about 5 s ahead of the edge.
10. Endgame pin: from 325 s it holds the next centre with hiding disabled at any health; from 390 s no dodging.
11. Supply drops: arrives up to 16 s early and stands on a point everybody knows; its drop goal ranks below
    fighting and hiding, so a hit during the 4 s capture makes it step out of the ring and the clock restarts.
12. Out-gunned reflex: without a laser, one laser hit from beyond 55 m (it drops to 77%) sends it into hiding,
    and it stays there while the laser holder remains a tracked single threat.
13. Farming tell: while shooting a crate or drone with no mech about it does not stop; it keeps sliding at
    walking speed along its last heading (due east if it had been standing: a tie break in its direction
    scoring), at 90%+ health, making gun and crate noise audible at 220-320 m.
14. Unseen shooters are never shot at; beyond its 200 m view range (it takes the sensor upgrade last) it cannot
    answer at all, it only hides from the guessed position.
15. Target choice ignores danger: it prefers near, weak and visible, so a close gun-only mech can hold its
    attention while a laser holder farther away works on it.

## 8. Signatures an opponent can observe

1. Weapons always include the gun; the second weapon becomes a laser at the first chance; never two specials.
2. Never airborne. Speed is 11.7 m/s, 5.85 m/s whenever its charging flag is on, short 19.5 m/s bursts only
   when exposed while breaking off, when a mech is inside 110 m of a laser-holding one, or outside the zone.
3. Charging flag comes on within a tick of each cooldown end while it has, or had within 1.5 s, a line to its
   target; beams arrive 0.75 s after the flag, never sooner unless the hit kills.
4. Holds 45-85 m with a gun only, 125-185 m with a laser, strafing sideways with reversals every 0.45-1.15 s.
5. Torso points exactly at a tracked mech through walls for 5 s and at its last position for up to 12 s.
6. Standing with nothing to do: torso turns steadily counter-clockwise at about 200 degrees per second beside a
   wall. Travelling: aim swings about 50 degrees either side of the heading with a 4.8 s period, with a 1.8 s
   full sweep every 11 s.
7. Breaks off below 40% (45% after the switch), stops firing one second after the last hit, returns above 85%.
8. After about three deaths: sees us beyond 120 m and at once moves out of sight without firing.
9. Steps out of the line when our laser charges while pointed at it; keeps standing if we charge off-axis.
10. Shoots crates from long range while still sliding along its last heading (east from rest); stands on a
    drop point before it lands; stands on the next centre from 325 s.

## 9. Counters, ordered by expected gain in a free-for-all against this bot

C1. Respect the bubble (general rule: SAFE).
- Trigger: three or more deaths so far, and a gun (+ laser) mech that on seeing us beyond 120 m turns away and
  takes cover without firing, or rests beside a wall with a steadily turning torso.
- Action: plan paths with its last known position as a threat source for 15 s (it leans out within 7 m of its
  spot); never hold a line to that point inside 125 m; pass at 130 m or more or behind hard cover; do not shoot
  it. Below 55% health do not be visible to it at any range under 280 m; below 25% not inside 130 m.
- Exploits: its hide-first posture only engages inside 120 m, when hurt, or against a clearly weaker mech.
- Gain: avoids its pre-aimed corner shot (full laser 315-440 plus gun inside 100 m), about 500-900 health per
  avoided encounter. Backfire: another bot with this look may engage farther out; loss is bounded because the
  rule only adds path length and the hostile test of D0 (aim within 12 degrees with a line inside 160 m) hands
  over to C2.

C2. Fight its laser only on its charge clock (general rule: SAFE; the server timings are the same for everyone).
- Trigger: gun + laser mech with the charging flag on and its aim within 0.3 rad of us, or one that has hit us
  with a beam that came 0.75 s after the flag.
- Action: on the flag, move to a hide cell within 6 m (9 m boosting): the beam cannot come before 0.75 s (0.56 s
  if it ever takes the fast-charge upgrade, which it ranks low) unless the partial beam would kill us (health
  under about 350 against an upgraded, cubed laser). Stay hidden until its next beam is heard or seen (laser
  sound on its bearing), or 2.9 s after a flag we saw, or 4.3 s after we left its line if we saw no flag (it
  can start a charge up to 1.5 s after losing us and must discharge 2.75 s later). Then peek
  at once with our own laser already charged behind cover: release on the first on-aim tick, fire the gun for
  up to 2.0 s only if the bullet flight is under 0.4 s or the target is charging or still, and be back in cover
  2.0 s after its discharge (0.4 s margin on its 2.4 s cooldown-plus-recharge). Repeat about every 4.4 s. If the
  wait ended on the 4.3 s timer with no beam, its laser is idle and ready: that peek lasts 0.6 s only (release
  and return). Whenever its flag comes on during a peek, be hidden within 0.7 s. If the cover is farther than
  0.75 s away, go there anyway and accept one hit; never stand and trade.
- Exploits: limitations 1, 2 and 4.
- Gain: one unanswered full laser per cycle, about +300 health net per 4.4 s; it breaks off at 45% (40% before
  the switch). Backfire: a bot that releases partial charges hits us for 110-160 on the way to cover and gives
  no wasted-beam signal; bounded by the 2.9 s / 4.3 s caps and by re-peeking only with our laser ready and
  health over 50%.

C3. Charge off-axis (general rule: SAFE).
- Trigger: any laser shot at a mech that has stepped out of the line when our flag was on, or by default against
  gun + laser mechs.
- Action: hold the torso 0.35-0.45 rad off the target while charging (the target stays inside our view wedge),
  swing on in the last decision (4 rad/s covers 0.4 rad in 0.1 s), release on the first on-aim tick.
- Exploits: limitation 3. Gain: one more landed beam per cycle (315 x cube bonus) that would otherwise hit a
  wall. Backfire: a bot that ducks on the flag alone is no worse for us; cost is at most 0.1 s of delay.

C4. Break contact and it forgets (general rule: SAFE).
- Trigger: before the switch (14 or more alive), a mech that walks straight at us from inside 175 m and settles
  at 45-85 m (gun) or 125-185 m (laser).
- Action: break the line of fire, stay beyond 60 m, do not damage it for 4 s. Its fight ends on that tick; after
  5 s + 3 s we are off its threat list. Then leave, or come back on our terms with C2, or use C6.
- Exploits: limitation 6. Gain: ends an unwanted opening duel at no health cost in the phase where half the
  field dies. Backfire: a real rusher keeps coming; if it still closes 2 s after the sight break, switch to the
  corner ambush of D11.

C5. Deny its supply drop (NOT a general rule: only against a holder that steps out when hit).
- Trigger: a drop whose holder, or the mech waiting on the landing point, is a gun (+ laser) mech; we have hard
  cover with a line to the ring at 100-200 m and at least 80% health.
- Action: one full, off-axis charged laser at the standing holder during its 4 s capture. This bot steps out to
  fight from cover and the capture clock restarts. Continue with C2; if it breaks off and no mech is within
  60 m of the ring, take the drop under D6.
- Exploits: limitation 11. Gain: denies a full repair and 3 cubes (recorded winners took 1.0 drops a match,
  places 2-4 took 0.1). Backfire: a bot that finishes the capture under fire is then at full health and knows
  where we are; bounded by firing once and using C4 if it has not left the ring within 1 s.

C6. Flank the stare (general rule: SAFE inside D11's gate of a busy target under half health).
- Trigger: it lost sight of us less than 12 s ago (its torso stays on our last position), or it is fighting
  someone else, or it is shooting a crate (sliding along, torso on the crate).
- Action: circle at 70-100 m to more than 60 degrees off its aim within 9 s (90 degrees for the rear
  multiplier), walking under 5 m/s if inside 60 m; open with a charged laser (472 from the rear) and the gun.
  It turns within 0.8 s of the first hit.
- Exploits: limitations 5 and 6. Gain: 470-700 damage before any reply; a kill if it was under half health.
  Backfire: a bot with all-round awareness turns sooner; bounded by D11's gate and by an exit to cover.

C7. Gate the zone and the last circle (general rule: SAFE as "delay the centre until the edge forces us, from
cover"; this changes D9 and needs a sparring test first).
- Trigger: (a) a gun + laser mech outside the next circle with the edge within about 10 s of it; (b) t >= 325 s
  and a mech standing on the next centre that does not leave when hit.
- Action: (a) hold a cover cell inside the next circle 100-150 m from the straight line between it and the
  half-radius point on its side, and run C2 as it crosses. (b) Do not walk to the centre; hold hard cover
  30-60 m from it inside the current circle, peek on its magazine (12 rounds, then 2.4 s) and laser clock, move
  in only when the edge is within 8 m (it closes at no more than 3.6 m/s); after 390 s it does not dodge at all.
- Exploits: limitations 9 and 10. Gain: about +1 place when both of us are in the last four at 325 s; rarely
  reached if the final plays like the recorded showdowns (winners lived 135-327 s). Backfire: a different bot at
  the centre that uses cover, or a third mech behind us; bounded because we never leave cover or the zone-safe
  path.

C8. Show the laser to a laser-less one (general rule: SAFE).
- Trigger: a gun-only mech approaching in a straight line while we hold a laser.
- Action: land the first full laser from beyond 55 m (ideally 100-185 m) from cover. This bot then hides below
  80% (85% after the switch) and stays hidden while we remain its only tracked threat.
- Exploits: limitation 12. Gain: stops the approach for one shot. Backfire: none beyond normal kiting.

C9. Lightning short at close range (NOT a general rule; optional, high variance).
- Trigger: after the switch, a gun + laser cover-sitter with no lightning, our health at least 80%, energy at
  least 70, no other mech within 150 m, a covered approach to within 45 m.
- Action: approach on its blind side, short its laser with lightning (each hit blocks charging for 2 s) and add
  the laser or gun; it is left with the gun only.
- Gain: a kill worth its cubes plus two. Backfire: before the switch it kites away at 125 m and the approach
  eats a laser every 2.4 s; never chase it across open ground.

## 10. Not established

- How the bot actually places in real free-for-alls (no record).
- Who operates the scorpion account, and whether either account will change the bot before the final.
- Which single change inside each bundle carries the official step.
- Whether the server's 5 s memory entries carry the charging flag of a mech that is out of view (matters for C3
  only when we charge behind cover; charging off-axis works either way).
