# Mahalas (rank 9, 5.15 at 05:18:30 UTC; 5.08 at 04:44:49; 4.88 at 03:45:27): clean-room study and counters

Revised 21 Nov 2026, about 07:30 UTC, by the clean-room analyst step (Opus). It replaces the 07:04 draft
(corrections listed in section 11). Read-only work: nothing from the repository was executed, built or
installed (the sandbox build had already failed for lack of an offline crate cache, see
sparring_roster.md). No code, identifier, comment or constant table is reproduced; every number is my own
description of behaviour read from the source at the scored commits. Short commit-message phrases are
quoted as evidence only. No text aimed at AI agents or tools was found (README, licence, Dockerfile,
.gitignore, the six source files and all 20 commit messages scanned); the only AI mentions are a README
credit and ordinary co-author lines. The repository's results file and a private folder are git-ignored,
so the repo holds no score text.

Repository: chriseco427-spec/CyprusBot (public; Rust 2021; one JSON dependency; about 98 kB of source:
a 75 kB decision file, a 3.5 kB practice-only file, map, path search, I/O loop). Bot name announced to
the server: "quietstorm" (not visible to opponents). Commits in UTC-6, one author.

## 0. The short answer

A self-written, well-engineered bot with two postures. In practice it is a close brawler: a 55 m ring
around any visible mech, sub-second strafe reversals, never retreats, grabs cubes and weapons mid-fight,
and runs up to 250 m for a laser at spawn. After one death it did not cause it becomes a hider that hides
from every mech it has seen in the last 10 s, fights only a lone weaker hostile, a nearly dead target or
prey, and pre-aims its torso at the nearest mech without firing. In the final it is exposed in three
places: its practice posture runs from 8 s until the first foreign death; its laser release and its
boost bursts are clockwork (the boost is locked to the match clock, a near-unique fingerprint); and from
about 378 s it walks to the exact final centre and stands there in the open.

## 1. Identity (re-checked against all three times)

Board times from ../web/mech_submission_times.json against commit times in
intel/_meta/chriseco427-spec__CyprusBot.git (UTC; recomputed by tools/top10/mahalas_identity.py):

| Board time (UTC) | Score | Last CyprusBot commit before it | Lag | What that commit changed |
|---|---:|---|---:|---|
| 03:45:27 | 4.88 | 5f9ed03, 03:43:18 | 129 s | drone handling |
| 04:44:49 | 5.08 | a359a35, 04:41:14 (merge) | 215 s | merges a practice-only laser rush (250 m) + lightning-to-laser swap; brings spawn scan, 130 m early weapon rush, 0.78 lead for jittering mechs |
| 05:18:30 | 5.15 | d67b21c, 05:17:40 (HEAD) | 50 s | give up stuck/unclimbable goals; one drone at a time; no roof loot in free-for-alls; rush under fire only when close |

- Three of three recorded Mahalas improvements follow a CyprusBot commit by 50-215 s. Chance rate: of
  the 65 other-team board times inside the repo's active span (01:50-05:21 UTC), 17 (26%) fall within
  240 s after some CyprusBot commit, so three of three by coincidence is about 0.26^3 = 0.018 (a window of
  at least 215 s is needed to include all three lags). Mahalas is the only one of the 58 teams in the file
  with three recorded improvements, so this is a probability, not a ranking test.
- Independent second kind of evidence: the name ("mahalas" is the Greek/Cypriot word for neighbourhood;
  the repo is "CyprusBot"). No score text exists in the repo (results file git-ignored).
- The earlier alternative (Mahalas running a TTUN-derived variant because r1ver recorded 5.08 for one,
  E17 in measured_deltas.md) is now unlikely: it would need a third coincidence at 05:18, and r1ver's own
  best is a single 5.10 at 03:01, so no TTUN variant is known to have scored 5.15.
- Confidence: medium-high. Versions that produced the scores: 4.88 = 5f9ed03, 5.08 = a359a35,
  5.15 = d67b21c (HEAD when our history copy was fetched at 05:46 UTC; only branch: main).
- Caveats: c50d9c3 (05:05:12) may have been submitted and scored below 5.08 (non-improving submissions are
  invisible on the board). Board times behave like submission times (lags of 50-215 s are too short for
  a scoring run to complete after a later commit). Not checked: commits after 05:46 UTC (only a
  named-commit fetch is permitted and no newer commit id is known). If unpicked, its best entry
  (5.15, d67b21c) is the one that would play the final.

## 2. Lineage

Own code, written from scratch during the event with an AI coding assistant (README credit, co-author
lines). No file of 2 kB or more shared with any of the ~165 indexed histories (tools/top10/shared_blobs.tsv), no reuse of its
bot name, different language and architecture from TTUN, MAGIC-Royale and the Lance lineage. Its own
local simulator runs "paired" squad matches and "free-for-all reference lobbies" (commit text).

Timeline (UTC): version 0 at 01:50 (protocol loop, 1 m height-grid map, A* paths, basic combat and
zone); 01:54 plain linear lead; 01:58 roof jetting + goal blacklist; 02:08 cheaper cover search;
02:25 "Collect cubes and weapons during fights; no retreat unless others are dying too"; 02:35 tuning
knobs for the simulator; 03:23 match-type detection with a free-for-all hiding posture; 03:30 duel fixes
("keep moving, reverse more often, adapt gun lead"); 03:43 drones (scored 4.88); 03:54 spawn scan and
early weapon rush; 04:09 practice laser rush (simulator "+0.5 points over no rush"); 04:40 skip contested
weapons for 25 s; 04:41 0.78 lead for jittering mechs ("measured on recorded matches"), merge (5.08);
05:05 weapon rush under fire only when close, ambush rule left off; 05:17 robustness and drone
discipline (5.15).

## 3. How it plays (5.15 version)

In practice (assumed from 8 s unless a foreign death, a mech more than 350 hp below max that it never
hit, or two attackers before its first kill has latched free-for-all) it attacks every visible mech with
a line of fire inside 260 m, choosing the lowest of distance in m + 0.08 per hp - 40 for a mech that hurt
it in the last 3 s or is hostile, so a 1000 hp gap is worth 80 m and it finishes the weak first. It
fights on a soft 55 m ring with gun alone or gun + laser (30 m when it holds lightning with energy above
25, 65 m against a lightning holder), strafing sideways with reversals every 0.45-0.95 s and boosting
about 1.9 s in every 4.8 s, on a fixed phase of the match clock, while energy is above 55. It never
retreats in practice; the gun fires whenever the aim is on the lead point at any range up to 227 m (full
lead for steady movers, 0.78 of it for mechs that turned more than about 45 degrees or started or stopped
in the last 1.3 s), and the laser charges whenever it has a target in line (its targeting limit is 260 m), switches its aim to
the target's present position about 0.5 s in, and releases at the first decision with at least 0.69 s of
charge and the aim within about 2.2 m. Economy: a full scan turn in the first 1.7 s, then a run for a
laser within 250 m (skipping for 25 s any weapon another mech is 15 m nearer to), only laser or lightning
ever taken (never a mortar, never the gun dropped), lightning swapped for a laser when no mech is within
50 m, and mid-fight it walks straight to a remembered cube within 75 m or a wanted weapon within 60 m.
Out of contact it takes supply drops within 300 m timed to arrive at most 10 s early, crates at hp above
85% (walks to 20 m, shoots from up to 70 m) and one drone at a time (hp above 75%, after 25 s, circling at
60 m, walking 45 m away when two or more drones are within 62 m, it is under 70% or it is before 25 s).
Zone: it heads for a point 6 m inside (next radius minus the smaller of half the next radius and 20 m) on
its own side whenever it is outside, within 10 m of the current edge, or the shrink starts within its
walking time + 12 s, boosting when outside or with under 4 s to spare, and zone travel outranks fighting
movement and hiding. Endgame: that rule puts it 6.5 m from the centre while the next circle is the 25 m one
(325-375 s) and exactly on the final centre from about 378 s, where it stands still; at four or fewer alive it also attacks any mech
it out-powers 1.4 to 1, with power = hp x (1 + 0.04 x cubes up to 10) x 1.3 if it holds a laser.
Free-for-all switch: one death it did not cause, confirmed for 1 s, latches a hide-first posture for the
rest of the match (never undone); from then on it hides from every mech seen in the last 10 s unless it
can fight a lone hostile it out-powers 1.3 to 1 with no second mech within 130 m, finish a target at
180 hp or less, hunt prey, or is cornered by a hostile inside 40 m.

Reference details (read from the 5.15 source):
- Hostility: a mech becomes hostile for 30 s after damaging it, or for 6 s after facing it within
  0.2 rad with a line of sight inside 230 m for 0.5 s, or at once if it faces it while charging a laser.
- Lightning: fires at any visible mech inside about 13 degrees of its aim and 43 m, hostile or not.
- Gun magazine: no early reload during a fight (only with no target and half a magazine or less, or with
  nothing in sight), so in long fights it shoots 12 rounds in about 2.9 s and is then silent for 2.4 s.
- Unseen shooter: a phantom threat 110 m along the hit bearing for 3 s; its aim turns to that bearing for
  2.5 s (so its 120-degree wedge sweeps onto the shooter within about 0.4 s).
- Pre-aim: with no legal target it aims at the nearest visible mech; in practice it also pre-charges the
  laser on it inside 150 m and lets the charge go at about 2.15 s (through cover if need be).
- Upgrades: toughness first (plating, armour, nanites), then gun damage, laser damage, gun rate, laser
  charge, lightning efficiency, servos, magazine; mobility, sensors and pierce last.
- Map model: buildings and terrain only; trees and canopy are ignored in every line-of-sight test.
- Engineering: all randomness from the match seed (deterministic), answers only the newest queued
  observation, catches panics and repeats the last move, path search capped at 12,000 expansions,
  blacklists a goal for 90 s after two stuck episodes and for 300 s after two failed roof jets.

## 4. Why it scores (practice)

- It kills fast and keeps fighting: no retreat, every visible mech a target, weakest first, a laser in
  most matches (its practice-file note: in its simulator, matches without a laser score about 1.6 lower).
- At 55 m both sides' guns are near-certain (scratch model tools/top10/mahalas_gun_mc.py: a 252 m/s bullet
  with observed-velocity lead hits its own strafe pattern 74-79% at 55 m, 32% at 115 m, 16% at 150 m), and
  its laser always lands; mid-fight cube grabs feed hp (+4% each) and toughness upgrades. So it wins the
  damage race against hunters that hold 100-150 m. (My reading; no A/B of its range exists.)
- Measured deltas from its own logs (simulator): practice laser rush within 250 m + lightning-to-laser
  swap, +0.5 over no rush (960 paired squad matches); the 25 s contested-weapon skip with practice owning
  its rush, +0.23 +- 0.04 practice and -0.07, +0.02, -0.04 (+- 0.04-0.06) in free-for-all lobbies.
  Rejected in simulation and shipped off: hiding behind a wall during gun reloads ("cost practice
  points"), an ambush rule, a heal rest between hunters (inert, then deleted). Kept because of
  simulation: running to cover in free-for-alls even when it is far (standing to fight with cover over
  28 m away cost 0.3-0.8 there).
- Official (board, inferred): the 5.08 bundle (rush, swap, contested skip, spawn scan, 130 m early rush,
  0.78 lead) gained +0.20 over 4.88; the 5.15 bundle (drone discipline, stuck give-up, rush-under-fire
  limit, no roof loot in free-for-alls) +0.07 with no simulator figure. Both are inside the 0.27-0.33
  re-roll noise of a changed bot (measured_deltas.md D04-D07) and biased upward (only improvements show on
  the board). So: simulator +0.5 against official +0.20 at most: over-predicted by 2.5x or more, sign
  plausibly right.

## 5. Lessons for our practice play (against Doctrine V4)

Grades as in V4: [S] strong, [T] the 5.58/5.19 bots' own choice, [1] one team's A/B, [C] contested,
[N] none; "abs" = an absolute choice of this 5.15 bot without an A/B.

| # | Lesson from CyprusBot | V4 item | Agree? | Grade and action |
|---|---|---|---|---|
| 1 | Spawn laser rush up to 250 m (uncontested by 15 m, first 25 s, roofs at most 40 m up) plus lightning-to-laser swap when nobody is within 50 m | D7 (always want a laser), D6 (no long detours) | Agrees with D7; contests D6 only before first contact | [1] simulator +0.5/+0.23, official bundle +0.20 inside noise; other teams' detours -0.11, -0.06, -0.06, +0.02 (L01, L06, L11, L09) -> [C]. One-change preset `laserRush`, not the default |
| 2 | Strafe reversals every 0.45-0.95 s at 5.15 (the 5.19 bot uses 0.35-1.05 s) | D4 floor 0.8 s | Disagrees | Two top-10 bots abs vs M03 (-0.69, one team, values unpublished) and M04 (0.00 at 0.5-1.3 s) -> [C]. Keep the bullet-aware dodge; a `strafe` preset U(0.45, 0.95) is a fair one-change draw |
| 3 | Never retreats in practice, still 5.15 | D3 | Disagrees in direction; keep D3 | abs vs A05 (-0.41 for the 5.58 bot without low-hp retreat) and A25 (-1.10 for early retreat). It bounds the retreat's value (about 0.4) and says it must never fire early |
| 4 | Its simulator rejected hiding during gun reloads and a heal rest between hunters | D3 "do not hide when not LOSING" | Agrees | [1] simulator only; consistent with C01 (-0.15) and the hide-first family (-0.3 to -1.75) |
| 5 | 55 m ring with gun and with laser | D2 `far` 150 m / `mid` 115 m | Contests both | abs; the 5.58 bot holds 125-185 m, the 5.19 bot 110 m, R08 found 110 m best. 55 m is a damage race (both guns 75-80%); no reason to switch, but it shows `mid` is safe |
| 6 | Mid-fight detours to cubes within 75 m and to a laser/lightning within 60 m | D6 power grabs (70 m / 60 m) | Agrees | [T] already; one more 5.1+ data point |
| 7 | One drone at a time: hp > 75%, t >= 25 s, at most one drone within 62 m, circling at 60 m, shot from up to 85 m; walk 45 m away from two or more | D6 drones (approach to 38 m and stand, hp >= 90%) | Partly disagrees on stand-off | [1] part of a +0.07 bundle (noise). 60 m is outside the 45 m drone aggro radius and gives its 90 m/s bullets 0.67 s of flight; a low-priority preset `droneRange` 55-60 m moving |
| 8 | Gun fires at any range up to 227 m | D2 long-range gun gate | Disagrees; keep D2 | abs; it fights at 55 m so long shots are rare. R09 (-0.34) for removing a gate |
| 9 | Latch on one foreign death (1 s confirm) plus two early clues before 8 s, at no visible practice cost | D12 (three deaths) | Disagrees; keep D12 | [N] no A/B; X01 (a 3-death rule never misfired in 48 matches) and X02 (a loose latch in a 3.56 line) argue for caution |
| 10 | Its simulator over-predicted the rush by 2.5x or more | Handoff: trust official deltas | Agrees | [1] |
| 11 | Seeded randomness, newest observation only, panic fallback, bounded path search | D10 | Agrees | [S] |

## 6. Limitations (each with its mechanism)

1. Practice posture in the final: from 8 s until 1 s after the first death it did not cause, it plays
   practice: shoots any visible mech within 260 m, never retreats, and when it sees (or tracks) a mech it
   cannot shoot it stands still, pre-aims at that mech's tracked true position and charges its laser, then
   lets the beam go at about 2.15 s into whatever blocks the line. Short window: recorded free-for-all
   bottom-half deaths start at 6 s (median 21 s).
2. All-or-nothing free-for-all evade: any mech seen in the last 10 s, unless a fight is accepted (one
   hostile, at most one mech within 130 m, its power at least 1.3 times; or a target at 180 hp or less;
   or prey), sends it to cover hidden from all of them (up to 60 m, cover that survives an 18 m
   sidestep; else up to 96 m), boosting while energy is above 12. The run is a pathed, steady leg. If it
   has a hostile target in line, it keeps its torso and gun on it and charges its laser while running, so
   it moves at half speed (5.9 m/s, 9.8 boosting) for about 0.75 s of every 2.4 s. With no cover in reach
   and someone hostile in line, it stands and fights in the open at its 55 m ring.
3. Clockwork laser: charging starts as soon as the cooldown ends with a target in line, the release comes
   at the first decision past 0.69 s with the aim on (about 0.5 s with one laser_charge upgrade), the cycle
   is about 2.4 s, and the beam is aimed at the target's present position plus 0.08 s of its velocity.
   In the hide-first posture a broken line makes it let go at once (beam wasted into cover, 1.65 s
   cooldown certain); in practice posture it holds the charge to about 2.15 s.
4. Narrow hostility test: only damage, 0.5 s of facing within 0.2 rad inside 230 m, or a laser charge
   while facing count. A mech whose aim stays more than 0.2 rad off it is never hostile until it shoots.
5. Pre-aim without fire: when evading with no legal target, it points its torso at the nearest visible
   mech but fires nothing (no gun, no pre-charge); only lightning, if held, fires at any mech inside 43 m
   and its aim cone.
6. Unseen shooter: a phantom threat 110 m along the hit bearing for 3 s and a 2.5 s aim swing to that
   bearing; no search, no return fire until it sees the shooter.
7. Thresholds computed from values we can see: prey = under 35% hp (50% at four or fewer alive) while
   it is above 60% and at least 1.67 times our power; late bully = any mech it out-powers 1.4 times at four
   or fewer alive; duel accepted at 1.3 times. Power = hp x (1 + 0.04 x cubes up to 10) x 1.3 with laser.
8. Endgame placement: zone travel outranks hiding, so while the next circle is the 25 m one (325-375 s)
   it waits 6.5-12.5 m from the next centre and from about 378 s it walks onto the exact final centre and stands still in the open
   (its hiding spots must be 12 m inside both circles and 80 m from any mech seen in the last 15 s, so none
   exist late). Standing, with nobody in view, its aim spins at a steady 3.3 rad/s.
9. Starved free-for-all economy: idle loot only where no mech was seen within 90 m in the last 12 s;
   crates only after 8 s without seeing a mech and at hp above 85%; drops only then, within 120 m and with
   nobody near them; no roof loot. Showdown winners peak at 15-35 cubes; it will usually hold few, so its
   power stays near base.
10. Map model ignores trees: its cover and "who sees me" tests count canopy as open. Shots are right
   (trees do not stop shots) but vision is not, so it may keep shooting at a tracked mech behind canopy and
   rejects canopy-hidden spots as exposed; canopy is no cover against it.
11. Dry magazines mid-fight: no early reload while it has a target, so every 5.3 s or so of a long fight
   it has 2.4 s without gun fire.

## 7. Free-for-all behaviour (from code only)

It has never appeared in a recorded free-for-all (showdown_profiles.md). First 8 s: undecided, which
already means the hide-first posture with a 1.3 duel ratio; it spins a full turn, then rushes a laser or
lightning within 130 m if the climb is under 3 m, no mech seen in the last 6 s is within 15 m of being
nearer to it, and, under a hostile's sight, only if it is within 25 m (the rush outranks hiding). From 8 s,
if nobody has died, it switches to the practice posture (section 6.1) and goes for the nearest visible
mech. On the first foreign death (+1 s) it latches hide-first for good: it walks to a low-openness nook
within 60 m, waits 14 s after arriving (re-picking after 60 s), then hops 40-110 m to another, avoiding
spots near recently seen mechs and near any drone it has ever seen. It accepts fights only as listed in
6.2 and 6.7 and otherwise hides, torso on the nearest mech, without shooting. It shoots back while
running when the attacker is in line. Zone travel comes first, so late circles drag it into the open
and onto the final centre. Expected placement: survives the opening better than aggressive bots, gets few
kills and cubes, and is a stationary, low-power target in the last two circles.

## 8. Observable signatures (anonymous mech)

- S1 Match-clock boost (near-unique): while fighting with energy above 55, its ground speed is
  boost speed (19.5 m/s, x1.08 per servos) exactly while match time t mod 4.833 s lies in 0.23-2.18 s and
  walk speed (11.7) otherwise, halved while `charging`. Two phase edges (about 5 s of watching a fight)
  identify it; a random-timer bot will not match both edges.
- S2 Match-clock idle sweep: walking with nobody in view, its aim yaw = travel heading + 1.5 x
  sin(1.4 t) rad (period 4.49 s); standing, a steady spin of 0.33 rad per decision (3.3 rad/s); at spawn,
  one turn at 3.9 rad/s in 1.7 s.
- S3 Fight geometry: a 55 m ring (30 m with lightning, 65 m if we hold lightning), sideways reversals
  every 0.45-0.95 s, fires its gun from up to 227 m while closing.
- S4 Laser rhythm: `charging` on for about 0.7-0.75 s per 2.3-2.4 s cycle whenever it has a line on us;
  speed halves while charging; the beam follows the flag's onset by 0.7-0.8 s.
- S5 Gun rhythm: 12 rounds in about 2.9 s, then 2.4 s silent; never an early reload mid-fight.
- S6 Evade: aim on us, no gun fire, no charge, walking or boosting on a straight path to a spot behind a
  building within 96 m. When we are hostile: the same path but still firing, at half speed while charging.
- S7 Loadout: gun + laser or gun + lightning; never a mortar; never drops the gun.
- S8 Endgame: from about 378 s, motionless within 1 m of `zone.next_center`.
- S9 Final opening: at t = 8 s with 16 alive, it turns from hiding to attacking the best-scored visible
  mech in line (or, without a laser, to a run for one within 250 m).

## 9. Counters

K1. Fingerprint it, then let the hider go (free-for-all, after the first death).
- Trigger: S1 or S2 matched on a mech id (both edges of a boost window, or the sweep phase within 0.2
  rad), then S6: aim within 0.2 rad of us, no bullet or charge from it for 1.5 s, velocity more than 90
  degrees away from us.
- Action: do not count its aim as hostility (exception to D0's aim clause for this id only); keep our aim
  at least 0.3 rad off its bearing and never charge while facing it, stay beyond 50 m if it holds
  lightning, and carry on with D11 (loot, position). Re-arm D0 at once on its first bullet, beam or
  charging flag.
- Exploits limitations 4 and 5: it shoots first only at prey, finishable targets or when facing makes us
  hostile; its pre-aim is harmless.
- Expected gain: avoids a pointless exchange with a bot that would otherwise flee while shooting back:
  plausibly 200-500 hp and our position saved per encounter; it stays alive to be a late target (K5).
- Backfire: a bot that aims while walking away and shoots later. Guarded by the fingerprint (no other bot
  shares the clock phase) and by re-arming on the first shot.

K2. Duck its release, then fire into its dead window.
- Trigger: S4 on a mech aimed within 0.05 rad of us with a line of sight, flag on for 0.5-0.6 s (0.35-0.45
  s if its first two flag-to-beam intervals were under 0.65 s, i.e. it took the charge upgrade).
- Action: if a hide cell is within 6 m (9 m boosting with energy above 30), step behind it at full speed
  (do not charge while stepping). In the hide-first posture its beam goes into the wall at once (laser
  sound or `beams` shows it): charge 0.75 s behind cover, re-peek and release within 2.3 s of its beam
  (its next full beam needs 1.65 s cooldown + 0.7 s charge). In the practice posture (16 alive, t >= 8 s)
  wait for its beam at about 2.15 s or for the flag to drop before re-peeking. Without cover keep the
  velocity changing at its 0.6-0.7 s mark and give it full lead (it is at half speed).
- Exploits limitation 3: release needs its aim on us at a decision with a line of fire; a broken line
  wastes the beam and makes the cooldown certain.
- Expected gain: in a laser duel, one 315-472 beam denied per cycle with cover in reach and ours landing
  uncontested: the duel swings by about 600 hp. Unmeasured.
- Backfire: bots that release early or at the instant of full charge hit us before 0.5 s; ducking also
  costs us about 1 s of fire. Apply the timing only to ids whose last two releases came 0.65 s or more after
  their flag (or to K1-fingerprinted ids).

K3. Shoot the steady legs.
- Trigger: a mech we are fighting that switches from S3 strafing to a straight heading (direction change
  under 15 degrees over 0.6 s) at 5-20 m/s: a cover run (S6, up to 96 m) or a cube walk (up to 75 m).
- Action: fire the gun with full lead out to 227 m (D2's steady-velocity exception), release a ready
  laser at once with lead, and when it is charging, aim for the half speed and expect the speed to double
  0.7-0.8 s after the flag came on. Do not follow into its cover inside 40 m (it fights when cornered); take
  the cube it was walking to only if our own D6 rules allow.
- Exploits limitation 2 (and the mid-fight cube walk): a pathed leg has a constant velocity, and while it
  charges it moves at half speed.
- Expected gain: scratch model: our gun's hit rate rises from 0.32 against its strafe to 0.76-0.96 on a
  steady leg at 115 m, and from 0.16 to 0.58-0.89 at 150 m. A 4 s leg is 16 rounds: about 230 damage
  against the strafe, 550-690 on the leg, plus one beam. Model, not measured.
- Backfire: a kiter that runs to pull us into a third party: harmless as long as we do not chase. A bot
  that stops behind cover and re-peeks punishes standing to shoot, so keep our own strafe.

K4. Make the final centre a kill zone (endgame).
- Trigger: t >= 375 s (`next_radius` 0 is published), a mech motionless within 2 m of `zone.next_center`
  (speed under 0.5 m/s for 1 s), aim spinning at about 3.3 rad/s or held on the nearest mech (S8).
- Action: before the final shrink starts (390 s), take a spot behind hard cover 60-140 m from the centre
  but inside the current circle with path time to the centre under the remaining hold; arrive with a full
  laser charge; peek and beam it (100% on a stationary target), then gun bursts inside 75 m between
  beams; enter the circle late on the side away from it. Do not stand on the centre ourselves while it is
  alive and has a line (D9's "stand on the moving centre" waits until it is dead or out of line).
- Exploits limitation 8: zone travel outranks its hiding, it has no late-circle cover rule, and it holds
  still in the open once it is on the point.
- Expected gain: 315 per beam every 2.4 s plus about 190 gun damage per second at short range: a 1600-2000
  hp mech dies in 5-7 s of exposure, plausibly one placement (up to +1 point) whenever both of us reach
  the last four. Unmeasured.
- Backfire: other survivors converge on the centre too and see us commit; a bot standing on the centre
  with its laser already charging is not spinning, so require the spin or a held aim on someone else.

K5. Stay out of its prey and bully lines (late game).
- Trigger: four or fewer alive, a fingerprinted (K1) mech or any S7 mech whose power is near ours.
- Action: compute its power as it does (hp x (1 + 0.04 x min(cubes, 10)) x 1.3 with laser) from what we
  see. Keep ours at least 0.72 of its power (it bullies at 1.4) and above 50% hp; carry a laser; heal in
  cover before the four-alive point. If ours falls below 0.72 of its power, keep a building between us.
  When we want it to run instead of fighting us (to use K3), keep ours above 0.77 of its power (it
  accepts a duel at 1.3).
- Exploits limitation 7: its decisions are a fixed formula of visible quantities.
- Expected gain: removes it as a late third-party killer of a weakened us and lets us choose whether it
  fights or flees; worth a placement in a few finals.
- Backfire: other bots use other thresholds; staying healthy and armed late is good against all of them.

K6. Use its practice window (final opening; low value because the window is short).
- Trigger: 16 alive, 8 s <= t, a mech that turns at 8 s from hiding to walking at the nearest mech, fires
  its gun from beyond 150 m and settles near 55 m with fast reversals (S9 + S3).
- Action: shoot back (D0), then break its line with a building within 6 m and stay tracked; it stands
  still and pre-charges on our tracked true position. Wait for its beam into the wall at about 2.15 s
  (laser sound), then within 1.6 s peek with our own charge built behind cover and beam the stationary
  mech; break the line again before 2.3 s. When alive first drops to 15 through someone else's kill,
  expect it to switch to hiding within 1-2 s: switch to K3.
- Exploits limitation 1: in practice posture it holds still without a line and dumps its charge at a
  fixed time.
- Expected gain: one or two free full beams (315 each) in the opening, when it happens at all (the first
  foreign death usually comes within a few seconds of 8 s).
- Backfire: a chaser that pushes round the corner when the line breaks catches us mid-peek; only peek
  after its beam has gone and while its speed is under 0.5 m/s.

## 10. Files

- Source read (not executed): intel/chriseco427-spec__CyprusBot (HEAD d67b21c); history and diffs in
  intel/_meta/chriseco427-spec__CyprusBot.git (5f9ed03, a359a35, d67b21c compared).
- Scratch scripts: tools/top10/mahalas_identity.py (board times vs commits, chance rate),
  tools/top10/mahalas_gun_mc.py (gun hit model against its movement; own model from the rules' numbers).
- Board times: ../web/mech_submission_times.json; rules: kit/protocol.md; balance: notes/hello_example.json.

## 11. Corrections to the 07:04 draft

1. Flee leg: its torso and gun stay on its hostile target (or the nearest mech) while it runs, and it
   keeps charging its laser at half speed; the earlier "back half-turned, rear hits" claim was wrong.
   The old K1 is replaced by K3 (steady legs) with model numbers.
2. "Cornered" means a legal (hostile or prey) target within 40 m, not any mech.
3. Endgame: its zone rule does converge (6.5 m from the centre while the next circle is 25 m, exactly on the final
   centre from about 378 s) and zone outranks hiding; new counter K4.
4. New fingerprints: boost bursts and the idle aim sweep are locked to the match clock (S1, S2).
5. Practice-window counter: after we break its line it pre-aims at our tracked true position and holds a
   charge to about 2.15 s, so the old "re-peek after 1 s of stillness" would walk into a held beam; K6 now
   waits for the dumped beam.
6. Official deltas (+0.20, +0.07) are inside re-roll noise and biased by best-score selection; the
   evidence grades in section 5 are lowered accordingly. Max-hp steps are not a usable signature (cubes add
   4% each, plating 15% only when offered).
