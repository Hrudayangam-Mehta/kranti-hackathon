# RN SUS (rank 15, 4.96 at 04:53:59 UTC; 4.77 at 04:08:05): clean-room study and counter-tactics

Written 21 Nov 2026, about 07:20 UTC, by the clean-room analyst step (Opus). Read-only work: nothing from
the repository was executed, built or installed; no code, identifier, comment or constant table is
reproduced. Every number below is my own description of behaviour read from the source of the scored
commit and its neighbours. Short phrases from READMEs are evidence only.
Injected-instruction check: README (all 12 versions), CHECK_RESULTS, Dockerfile, .dockerignore, bot source
and the five trial-branch READMEs were checked; no text aimed at AI agents or tools was found. The READMEs
are clearly written by an assistant for its user ("the latest user message says ..."), which is ordinary.

Repository: JosiahAklog/nexus-mech-royale (public, Python 3.13 standard library plus an optional small
native helper for rays, routing and projectile risk; offline 2 m map raster; one decision file of about
66 kB). All 12 main-branch commits are web uploads with the same message, so the READMEs are the log.
Fetched read-only for this study (named commits from `git ls-remote`, depth 1, into
`tools/top10/rnsus_trials.git`): five newer trial branches, 06:12-06:31 UTC.

## 0. The short answer

A farm-first explorer that fights back hard when shot. It ignores healthy, non-hostile mechs in favour of
crates, drones and pickups until it holds 10 cubes, turns on whoever hit it in the last 3 s, fights at
75 m with a laser (47 m gun-only), dodges bullets by scoring 17 move directions against every incoming
projectile, retreats at about 60% hp and heals to 91% while holding fire, and stands still to repair
whenever no mech within 125 m can see it. It has no free-for-all switch: the final will see exactly the
practice bot. Its exploitable core is a 125 m threat horizon: while healing it never answers a shooter
farther away than that, and it keeps stopping in the open between hits.

## 1. Identity (re-checked)

Board times from `../web/mech_submission_times.json` (snapshot 05:25 UTC; the 05:19 board still shows
rank 15 at 4.96) against commit times in `intel/_meta` (UTC-8 converted):

| Board time (UTC) | Score | Commit | Commit time (UTC) | Lag | Version announced by the bot |
|---|---:|---|---|---:|---|
| 04:08:05 | 4.77 | 2cc1d14 | 04:06:31 | 94 s | V24 |
| (between snapshots) | 4.83 | 21b396d | 04:34:05 | - | V26 (score stated as "user-confirmed" in the V28.1 README) |
| 04:53:59 | **4.96** | **312d591** | 04:53:11 | 48 s | **V28.1** (adaptive profile) |
| (not an improvement) | 4.69 | d728467 | 05:33:20 | - | V35 (score stated in the V36 README) |
| none known | - | d0a1b4b (main HEAD at 07:15 UTC) | 05:46:04 | - | V36 rollback |
| none known | - | five trial branches | 06:12-06:31 | - | V37 combat / movement / economy, V38 arc, V39 zone |

- Both recorded RN SUS improvements follow an upload by under 100 s; the V36 README states in plain words
  "V28.1 was previously reported at 4.96". Earlier official points: V9 (575cec5, 02:03 UTC) 4.33.
- The V36 README also says "the latest user message says 4.86 is the best entry": unexplained (possibly a
  re-run or a V29-V34 build submitted from a commit that was later overwritten); it does not change the
  identification. **Version that produced the score: V28.1 = 312d591 (roster `nexus_v281_312d591`).
  Confidence high.**
- Watch item: the five trial branches are one-change experiments built on V28.1 (each file carries the
  V28.1 logic plus one variant switch). If one beats 4.96 it becomes the team's final bot; the counters
  below still apply (section 6 notes the one limitation that V39 removes).

## 2. Lineage

Own code, written from scratch during the event with an AI assistant (V5 at 01:22 UTC, then V9, V14,
V17-V28.1, V35, V36, V37-V39). It uses the kit's Python wrapper unchanged; no descent from TTUN,
MAGIC-Royale, LanceHuang245 or any other public bot (different structure: one long utility-scored
decision per tick, three parameter profiles of which "adaptive" ships). The author never had an
interactive simulator or a Docker run; every version was judged only by the official score. The
roster's earlier builds (`nexus_v24_2cc1d14` 4.77, `nexus_v26_21b396d` 4.83, `nexus_v9_575cec5` 4.33) are
ancestors of the scored bot. The author's README predictions ("not a certified 6.95", "V34 prediction of
5.72", "target 6.00+") show that there was no working yardstick.

## 3. How it plays (V28.1, numbers read from the source)

1. **Ranges by loadout**: it orbits its target at 75 m holding a laser, 78 m holding a mortar, 47 m with
   the gun alone and about 32 m (72% of the lightning range) with lightning and no laser; +18 m when two
   or more mechs are within 85 m, +10 m below 72% hp, +10 m when its two-second damage estimate says it
   is losing, 85 m against a mortar carrier, down to 24-36 m against a lone target under 300 hp, with a
   mild push away from any mech inside 20 m. The orbit is mostly sideways (lateral weight 0.7 against
   a radial pull that saturates 16 m off the ideal), and the sideways direction reverses exactly at every
   multiple of 2.7 s of match time; it walks (11.7 m/s), boosting in a fight only with a mech inside 27 m.
2. **Weapons**: the gun is never dropped; the second slot prefers laser, then lightning, then mortar
   (lightning first when the slot is empty and a mech is within about 48-55 m). The laser starts charging
   only when its aim is already within about 0.65 rad, is held to full charge (about 0.70-0.75 s) and
   released when aligned, released early only when the partial beam (with an 18% margin) kills; it is
   never charged within 12 m of the zone edge or outside it. The gun fires at any range up to about 225 m
   with no flight-time gate; in a close fight against two or more mechs it prefers the gun to starting a
   fresh laser charge (charging halves speed).
3. **Retreat**: it latches a retreat when hp falls under 60% with a mech within 85 m or damage in the last
   6 s (70% with two or more mechs within 85 m, about 51% when the only nearby mech has under 45% of its
   hp, 73% when it lost over 20% of max hp within 1.8 s), and unconditionally under 50%; it leaves only at
   91% hp (or above 35% once the zone radius is under 30 m; no retreat at radius 14 m or less). A second
   "quiet repair" latch starts at 79% hp when no mech is within 95 m and nothing hit or was hit for 2.5 s.
4. **While retreating** it holds all fire unless "pressed" (a mech it can see within 125 m that is within
   35 m, or hit it in the last 2.5 s, or is under 180 hp within 65 m, or is armed, aiming at it and closing
   faster than 3.5 m/s within 80 m); the laser only fires if pressed, the nearest mech is beyond 28 m and
   its hp is above 28%. It flees on 70 m legs directly away from the nearest mech (or opposite the last
   hit's bearing), boosting while energy is above 32 until it drops below 24 (then no boost until 55),
   torso kept on the threat; with energy above 55 it may jet onto a flat roof 7-32 m up within 32 m. When
   no mech within 125 m has a line to it, the nearest is beyond 30 m, 1.8 s have passed since the last hit
   and it is 25 m inside the zone, it **stands still** (or picks up a cube within 13 m) until healed.
5. **Target rule**: one additive score; a mech that hit it in the last 3 s gets a bonus about as large as
   everything else combined; a mech aiming at it within 90 m, a mech under 220-360 hp, one within 55-70 m
   and its current target get smaller bonuses; a healthier mech beyond 35 m is penalised while it holds
   under 6 cubes. Crates and drones get large bonuses while it holds under 10 cubes and no mech is within
   40 m, so a crate at 60 m outranks a healthy, non-shooting mech at 80 m by roughly two to one.
6. **Economy**: weapons are sought within 155 m and cubes within 170 m (priced by distance, climb, detour,
   contention by a mech within 25 m of the item, and a cluster bonus); cubes are remembered 18 s, weapons
   45 s. Crates are shot standing still from 13-16 m when no mech is within 75 m; drones are orbited at
   29 m with direction flips every 3.8 s. With no contact and under 10 cubes it explores toward 45 m cells
   65 or 125 m away, preferring those unvisited longest (the preference saturates at 90 s). Supply drops are its top goal when uncontested
   (no mech within 32 m of the ring), within 240 m and reachable no more than 3 s before landing.
   Upgrades: regeneration (nanites) first, then gun magazine, armour (first from 6 cubes), plating, laser
   damage, servos, lightning, reactor, the rest.
7. **Zone**: it rotates when its margin is under 18 m or the walk to the next circle (at 72% speed) plus
   10 s would overrun the shrink, to a point inside the next circle on its own side (next radius minus 35%
   of it, 12-42 m); every goal is kept 12 m inside the current radius; loot and drops are checked against
   the circle interpolated to the arrival time.
8. **Endgame**: below a zone radius of 18 m (from about t = 397 s) it drives to the exact centre with a
   damped controller and stands there (within 0.2 m, nearly stopped). With 5 or fewer alive and two mechs
   near it adds 8 m of range and drifts away from secondary threats.
9. **Free-for-all switch**: none. The only multi-player touches are the alive-count tweak above and a
   small "third-party" bonus (at most +16, about a tenth of the attacker bonus) for a weak target that
   another mech is aiming at while not aiming at it.
10. **Engineering**: answers in 0.3-0.8 ms on the author's machine (roster sandbox: 0.6 / 1.0 / 2.2 /
    7.1 ms p50/p90/p99/max, ready in 108 ms); path search capped at 1,800 expansions with a 9 ms fuse in
    the pure-Python path; stuck handling by jump and jet.

## 4. Why it scores (practice)

My reading, from code and from its own score history (no ablation exists):
- It survives house fire by dodging: every incoming projectile within 165 m is projected 0.8 s ahead
  against 17 candidate directions (with acceleration lag), at walk and at boost speed, and the cheaper
  one is taken. House bots aim exactly at constant velocity, and a target that changes velocity during
  the flight is hit about 22% of the time instead of 84% (D1), so this is its main defence.
- It fights back at once: the attacker bonus outweighs farming, so a hunter that opens fire gets a laser
  duel at 75 m. It farms only when nobody shoots, which in squad practice is the opening and the gaps.
- It reaches a laser and cubes early (crates carry a weapon half the time) and keeps a gun for sustained
  damage.

Official score history (its own READMEs plus the board; 48-match practice score each):

| Step | Official delta | What changed (bundle) | Read |
|---|---:|---|---|
| V9 -> V24 | 4.33 -> 4.77, **+0.44** | about 15 changes: retreat threshold by enemy count and relative hp, early farming, attacker priority over farming, projectile awareness out to 165 m, cover-aware positions with 2+ mechs, gun over a fresh laser charge in close multi-mech fights, drone orbit at 29 m, up to three fallback targets, pitch-reachable aim points, drone/zone/drop fixes | the only gain clearly beyond noise |
| V24 -> V26 | 4.77 -> 4.83, +0.06 | weak-nearby-target priority, early cube preference, escape energy reserve, two-second duel estimate, 24 m lookahead | noise |
| V26 -> V28.1 | 4.83 -> 4.96, +0.13 | coverage exploration while under 10 cubes, burst-damage retreat at 73%, future-zone feasibility for loot and drops, third-party bonus, escape boost hysteresis, longer quiet wait before standing still | at the noise edge (identical code has scored +-0.2 elsewhere) |
| V28.1 -> V35 | 4.96 -> 4.69, **-0.27** | seven versions of added caution: pre-emptive escape from aimed charging lasers, disengage when under-armed or out-ranged by a laser, keep evading a long-range attacker for 12 s, more repair interruptions, threat memory | caution creep lost; the author rolled back (V36) |

Official vs prediction/simulator: the author had no simulator; its stated hopes (6.95 for V28, 5.72 for
V34) overshot the official results by 2.0 and 1.0. Our uncalibrated simulator says nothing about its
practice score (it was never run in squad mode). In our simulator's free-for-alls (7 runs, 144 matches,
top-15 public fields) it places 8.7 of 16 on average: 35% dead by 30 s, 49% by 60 s, median death 65 s,
0.9 kills per match; matches where it ended holding gun + laser averaged 5.8th place, gun-only 13.4th,
8 or more cubes 3.8th (survivorship-confounded). Grade: simulator, uncalibrated; use only for shape.

## 5. Lessons for our practice play (against Doctrine V4)

| # | Lesson | V4 | Grade |
|---|---|---|---|
| 1 | Adding caution lost 0.27 official (V35: pre-emptive escapes from aimed lasers, under-armed disengage, 12 s evasion of a ranged attacker) | Agrees with D3 "do not hide when not LOSING" and the A-series | [1] official, 7-version bundle, just beyond noise |
| 2 | A retreat at 60% / heal to 91% / hold fire while healing / stand still to repair at 79% still reached 4.96, but sits 0.6 below the 5.58 bot | Disagrees with NEXUS on hold-fire and the 91% exit: keep D3 (keep shooting while LOSING, exit at 70%); A08/A09 measured hold-fire at -0.34 | [1] absolute, no A/B |
| 3 | Attacker-first targeting and projectile-risk dodging (out to 165 m, walk vs boost compared, never boost into a predicted hit) were in the only large gain (+0.44) | Agrees with D4 (bullet-aware dodge) and D5(b); adds one detail worth having: score the boost and the walk option separately against incoming bullets | [1] bundle |
| 4 | Laser orbit at 75 m and gun-only at 47 m reach 4.96 | Range is not what separates 4.96 from 5.58 (5.58 at 150 m, 5.19 at 110 m, Mahalas 5.15 at 55 m); keep D2 with `far` vs `mid` decided on the real scorer | [1] absolute; [C] stays |
| 5 | Exploration of unvisited 45 m cells when idle and under 10 cubes, plus "will this item still be inside the circle when I arrive" filters, were part of +0.13 | V4 is silent on idle movement; a one-change preset (explore unvisited cells 65-125 m away instead of circling) is a low-priority candidate | [1], noise level |
| 6 | Nanites and gun magazine before plating at 4.96 | Keep D7 (plating first): no A/B either way | [N] |
| 7 | After the bundle loss the author switched to one-change trial branches | Agrees with D10 and our one-change presets | process |

## 6. Limitations (each with its mechanism)

1. **125 m threat horizon.** Every danger test (who is near, who can see it, who presses it, where to
   flee, whether it may stand still) uses only mechs within 125 m (85 m for the threat count). While
   healing it therefore never shoots back at a mech beyond 125 m, even one that just hit it, and it
   resumes standing still 1.8 s after each hit if nothing within 125 m has a line to it.
2. **Stand-still repair in the open.** Quiet repair starts at 79% hp with nobody within 95 m; the retreat
   latch lasts to 91%. Healing 60% -> 91% takes about 15 s at base regeneration (45 hp/s after 5 s) or
   9.5 s with one nanites upgrade (72 hp/s after 3.5 s); 79% -> 91% takes about 9 s / 6 s. During the
   standstill its torso holds the last hit's bearing or sweeps only about +-31 degrees, so its 120-degree
   view leaves a rear wedge (all-round sensing only within 45 m).
3. **Hold fire while retreating.** No shots unless pressed (section 3.4); the laser additionally needs the
   nearest mech beyond 28 m and its own hp above 28%. A pursuer that stays beyond 35 m and beyond 125 m
   (or that has not hit it within 2.5 s and is not closing and aiming) gets no return fire.
4. **Clock-locked strafe.** Lateral reversals happen at every multiple of 2.7 s of match time (direction
   set by spawn slot parity); between them it moves steadily unless bullets are in flight; drone orbits
   flip every 3.8 s. Its laser has a fixed rhythm: full 0.70-0.75 s charge, 1.65 s cooldown, about 2.4 s
   per beam, charge started only once aim is roughly on.
5. **Farm-first targeting.** Until it holds 10 cubes a healthy mech that has not hit it ranks well below a
   crate or drone; it stands still 13-16 m from a crate while shooting it when no mech is within 75 m.
6. **Map model.** Line of sight and cover come from a 2 m height raster with buildings as solid columns,
   sampled every 3 m; trees and canopy are absent (canopy blocks vision in this game), overhangs block.
   It cannot see a mech under canopy, so a shooter under canopy never enters its threat tests until it has
   been seen, and its cover choices can leave it exposed to canopy-side lines.
7. **Zone-edge laser ban and centre camping.** It never charges within 12 m of the edge or outside, so near
   the edge it fights with the gun only (V39, an unscored trial, lifts this inside the final circle). From
   a radius of 18 m it parks on the exact centre.
8. **Predictable flight.** Escape legs are 70 m straight runs away from the nearest mech, 19.5 m/s while
   energy lasts, then 11.7 m/s until energy is back to 55; roof hops put it on a flat roof visible from
   far away, where it may again stand still to repair.
9. **Gun discipline.** The gun fires out to about 225 m with no flight-time gate, so against a dodging mech
   at range it empties the magazine into 2.4 s reloads; proactive reload only when idle at 8 rounds or less.
10. **Late plating.** Plating ranks fourth, so its max hp stays at 1400 x (1 + 0.04 per cube) for the first
    three upgrades, 13% below a plating-first bot.

## 7. Free-for-all behaviour

Never seen in any recorded real free-for-all (showdown_profiles.md). From code: identical to practice.
Opening: it explores and farms; it attacks only mechs that hit it, mechs that come inside 40 m, weak
mechs (roughly under 360 hp, strongest under 220 hp, within 55-85 m) and anything it is already fighting.
Mid-game: after any fight that leaves it under 60% (or under 79% once alone) it spends 6-15 s
retreating and standing still, not shooting. It vultures weak mechs within about 85 m but has no notion
of letting two others fight first beyond the small third-party bonus. Endgame: rotates early, keeps 12 m
inside the edge, parks on the exact centre below an 18 m radius and fights from there (retreat disabled
at 14 m). Expected placement (simulator, uncalibrated): mid-pack, bimodal; strong when it gets a laser
and 8+ cubes, early death otherwise.

## 8. Observable signatures (anonymous mech, a few seconds of watching)

- S1 Clock-locked orbit: sideways direction reversing at match times within 0.1 s of a multiple of 2.7 s,
  at a steady 47 m (gun), 75 m (laser) or 93 m (laser, two mechs near) from its target, walking 11.7 m/s.
- S2 Laser rhythm: `charging` on for 0.70-0.80 s, off about 1.65 s, beam period about 2.4 s; the aim is
  already on us when the flag appears; no charging within 12 m of the zone edge.
- S3 Idle aim: while exploring with nobody near, a sinusoidal torso sweep of about +-106 degrees around its
  travel direction with a 6.0 s period; otherwise +-31 degrees.
- S4 Repair standstill: speed under 0.5 m/s for over 1 s, no fire, hp rising at 45 hp/s (72 or 115 with
  nanites) after a 3.5-5 s pause, torso fixed on one bearing; hp typically 45-91%.
- S5 Crate stance: still, 13-16 m from a crate, shooting it; drone orbit at 29 m flipping every 3.8 s.
- S6 Retreat turn: at 51-73% hp, velocity swings away from the nearest mech, torso stays on it, gun goes
  quiet; boost about 2-4 s then a walk.
- S7 Hp book-keeping: max_hp = 1400 x (1 + 0.04 x cubes up to 10) with no plating factor after 3+ cubes,
  plus fast regeneration (nanites first).
- S8 Final circle: drives to and stops on the exact zone centre once the radius is under 18 m.
- S9 Loadout gun + laser (sometimes lightning, rarely mortar); never drops the gun.

S1 is the most distinctive (the other studied bots flip at random 0.35-1.6 s intervals); S1 + S2, or
S4 + S7, identify it. S4, S6 and S8 alone are shared by other cautious bots.

## 9. Counters (for the final; ordered by expected gain)

K1. Snipe the repair standstill from beyond 125 m.
- Trigger: S4 (still for 1 s or more, not firing, hp 45-91% and rising at 30 hp/s or more, `charging`
  false, no beam or bullet from it in the last 2 s), seen at 130-260 m with a line of fire.
- Action: hold at 130-260 m (back off at stick 0.7 if it closes inside 135 m); charge our laser with the
  aim 0.3 rad off its bearing, swing on at 0.6 s and release at full charge; repeat every cooldown. Gun
  only while it stays still or on its straight flight leg after a hit. Never close inside 130 m while its
  hp is under 91%. This is a deliberate exception to D11's "shoot first only at a busy mech under half
  hp": this mech cannot answer.
- Exploits limitations 1-3: we are outside every test it uses to decide to fire back or keep moving, so it
  holds fire, flees away from our bearing, and stops again 1.8 s after each hit; our 2.4 s beam cycle
  leaves it 0.6 s of standing per cycle.
- Expected gain: 315-440 per beam (cube bonus 4% per cube); from 630-1270 hp it needs 2-4 beams, about
  5-10 s, with no return fire; a kill plus its dropped cubes. Unmeasured (code reading).
- Backfire: a healer that answers at any range, or a camper with a pre-charged laser, punishes a long
  exchange; the trigger requires `charging` false and silence, and we stop after one beam if it fires
  back. Standing at 130-260 m exposes us to third parties: do it from a cover edge (D11 "fight from a
  corner").

K2. Take the free window when it turns to run.
- Trigger: S6 on a mech we or someone else is damaging: hp falls to 51-73%, its velocity turns more than
  120 degrees away from the nearest mech within 0.3 s, its torso stays on that mech, no shot from it for 1 s.
- Action: if we are within 125 m, open to 126-180 m first (do not chase inside 125 m; inside 35 m it
  always fires back), then laser every cycle; add gun bursts only within 100 m or once its boost stops
  (speed drops from about 19.5 to 11.7 m/s). If it jets onto a roof, keep the line and beam it there.
- Exploits limitations 3 and 8: it shoots back only when pressed by a mech within 125 m, and its legs are
  straight and long; a roof makes it visible to every bearing.
- Expected gain: one or two free full beams (315-880) before it breaks the line, often enough to take it
  under the 50% mark where it stays passive until 91%; then K1. Unmeasured.
- Backfire: bots that retreat while shooting (our own D3 does) answer us at any range; the 1 s silence
  check filters them. A runner that leads us into a third party: we never follow, we only shoot.

K3. Do not wake it; let it farm, then harvest it.
- Trigger: a mech showing S5 or S3 (crate stance, drone orbit at 29 m, or a wide 6 s aim sweep) at full or
  near-full hp, within 200 m, that has not shot us.
- Action: do not shoot it first; keep 45 m or more away (our minimum pass distance) and keep our torso
  more than 0.35 rad off it when within 90 m; take loot elsewhere; if our hp is under 25%, keep 110 m or
  a building between us. Switch to K1/K2 the moment it is damaged by someone else.
- Exploits limitation 5: with under 10 cubes a healthy non-shooting mech is worth about half a crate to
  it; only a hit on it, a mech inside 40 m, or our low hp (vulture bonuses within 55-85 m) turns it on us.
- Expected gain: avoids an even 75 m laser duel in the opening, where the bottom half of a real
  free-for-all dies within a median 21 s; it keeps a strong farmer busy elsewhere. Unmeasured.
- Backfire: a farmer that ambushes passers would punish passing at 45 m; none of the studied bots does,
  and D0's opening guard already says the same. The cost is giving it time to reach 10 cubes; K1 is the
  answer later.

K4. Pre-aim the exact centre in the final circle.
- Trigger: zone radius under 18 m (from about t = 397 s) and a mech driving straight to the exact current
  centre and stopping within 0.2 m of it (S8), especially one also showing S1 or S7.
- Action: hold at about 0.6 of the current radius on the side with a line to the centre (behind any cover
  there), pre-charge so the beam is full when it stops, release; then gun at our dead band; a mortar, if
  we hold one, lands on the parked target (7 m splash).
- Exploits limitation 7: it settles on the centre with damping and stays there; its retreat is off below
  a radius of 14 m, so it fights back, but from a known, still spot.
- Expected gain: first strike among the last two or three; at the end a full beam is about a quarter of
  its hp. Unmeasured.
- Backfire: centre-camping is shared by many bots, so several may contest the centre and see us; never
  stand on the centre ourselves, and keep moving within our ring while charging.

K5. Fight it with the laser while it is near the zone edge.
- Trigger: a laser carrier within 12 m inside the current zone edge or outside it, not charging, for
  more than 1 s (computable from its position and the zone in our observation).
- Action: engage it there with our laser from our band (it can answer only with the gun: about 100
  damage per second before misses, about 65 at 65% accuracy, against our 131 per second of full beams);
  keep our own margin above 12 m and break off once it is 12 m inside.
- Exploits limitation 7 (laser ban near the edge in the scored V28.1).
- Expected gain: in that window its burst damage is roughly halved. Unmeasured; situational (it keeps
  goals 12 m inside, so this mainly happens during late rotations).
- Backfire: other bots charge near the edge; the V39 trial (unscored) allows safe charges inside the
  final circle. Never chase it toward the edge ourselves.

K6. Rear beam while it is busy, then K2.
- Trigger: S1 with its torso locked on another mech (aim within 0.1 rad of that mech), we are at 100-200 m
  on a bearing more than 100 degrees from its aim, nobody else within 120 m of us (D11 third-party rule).
- Action: release a full beam into its rear half (x1.5), then a second if it keeps facing the other mech;
  if it turns to us, hold 126 m or more and wait for S6.
- Exploits: its torso follows its current target; its burst-retreat rule (20% of max hp lost in 1.8 s at
  under 72% hp lifts the retreat line to 73%) makes a rear beam plus the duel damage tip it into the
  passive retreat of limitation 3.
- Expected gain: 472 per rear beam and an early, silent retreat; often a kill with K1. Unmeasured.
- Backfire: the duel partner may switch to us; only take the shot when the partner is also busy.

## 10. Files

- Scored source read: `intel/JosiahAklog__nexus-mech-royale` (312d591, V28.1); history and older versions
  from `intel/_meta/JosiahAklog__nexus-mech-royale.git` (575cec5 .. d0a1b4b); trial branches fetched
  read-only into `tools/top10/rnsus_trials.git` with extracted copies in `tools/top10/rnsus_files/`
  (data only, never executed).
- Simulator aggregates: `tools/top10/rnsus_simagg.py` and `rnsus_simagg2.py` over
  `tools/redteam/out/{ffa_top15,auto_top15,auto_top15b,auto_top15c,squad_top15,auto_mixed,tl_top15}.json`.
- Board times: `../web/mech_submission_times.json`; balance: `notes/hello_example.json`; rules:
  `kit/protocol.md`; earlier study: journal wf_abf7629e-f79 line 20.
