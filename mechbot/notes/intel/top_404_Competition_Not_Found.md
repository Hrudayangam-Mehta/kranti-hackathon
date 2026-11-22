# 404 Competition Not Found (rank 14, 5.02 at 04:28:27 UTC; 4.75 at 02:55:20): clean-room study and counter-tactics

Written 21 Nov 2026, about 07:20 UTC, by the clean-room analyst step (Opus). Read-only work: nothing from
the team's repositories was executed, built or installed (the sandbox copy cannot run anyway: it needs a
numeric package that is not installed, see sparring_roster.md). No code, identifier, comment or constant
table is reproduced here; short quoted phrases from commit messages are evidence only, and every number
below is my own description of behaviour read from the source at the scored commit.
No text aimed at AI agents or tools was found in the READMEs, changelogs, Dockerfiles, sources, tools or
any of the 56 commit messages of the two repositories (the only AI mentions are ordinary co-author lines).

Repositories: davidvarvas/mech-royale-bot (main line, Python 3.13 + one numeric package for the map model,
about 70 kB of source in three files) and davidvarvas/mech-royale-bot-gpt (the earlier line the scored bot
is built on). Bot name: "survivor" (the withdrawn B1 build announced "404-not-found").

## 0. The short answer

The 5.02 bot (commit D1, 7e86f21) is the team's own earlier bot (4.08) plus two small bundles: a hide
latch below 38% hp, never a mortar, hull-first upgrades, focus fire (C12), then "laser before lightning"
and a 45 s memory of seen weapons and cubes (D1). It is a calm mid-range brawler: it keeps the gun for
the whole match, carries gun + laser (or gun + lightning when it never found a laser), holds a 60 m ring
around its target, never starts a fight against a healthy, armed mech that is not aiming at it, and has
no free-for-all mode at all. Its one recorded free-for-all win (04:00 UTC exhibition, 53% lightning,
31 cubes) was NOT played by this bot: it was the other team's public controller they ran at the time
(see section 7). Its exploitable weaknesses: a retreat that only fires in gaps of incoming damage, total
blindness to a rear attacker while it duels, a laser it refuses to start near any lightning carrier, and
a hostility test that a calm opponent can avoid tripping.

## 1. Identity (re-checked)

Board times from ../web/mech_submission_times.json (and the 04:25, 05:19 and 05:25 page copies) against
commit times in intel/_meta/davidvarvas__mech-royale-bot.git (commits are stored in UTC-5; converted):

| Board time (UTC) | Score | Nearest earlier commit | Lag | What that commit is |
|---|---:|---|---:|---|
| 02:55:20.9 | 4.75 | d4737f6 "B0", 02:54:01 | 80 s | LanceHuang245/mech-royale 171bc06 rebuilt with the strategy switches emptied (MIT, credited) |
| 04:28:27.9 | 5.02 | 7e86f21 "D1", 04:25:33 | 175 s | C12 + laser preferred over lightning + loot memory |

- Text evidence: f1d0f81 (03:52 UTC) says "B0 and B1 both scored 4.75 in practice"; B1 was committed at
  02:56:00, after the 02:55 board time, so the 4.75 entry is B0 and B1 tied it (ties keep the earlier time).
- The 5.02: the D1 commit text says C12 was "pending (the one test the user is running)" and that D1 is to
  be submitted "only after C12's score is in", so C12 was submitted before 04:25:33 and the 04:28:27 entry
  is a later submission, i.e. D1. The later changelog confirms D1 as the reference: two play-identical
  "tidy" commits (8546f35 04:33, 4325554 04:40: I diffed them, only a docstring and a module rename
  change), then D2 ad5c2f2 (05:11) "scored lower than D1; dropped", then D3 32cf5d3 (06:06) built on D1.
  C12's own score is not recorded anywhere; it is below 5.02.
- Lag check: 80 s and 175 s fit the 50-215 s commit-to-board lags seen for other teams; the 15 min to the
  C12 commit does not.
- Version that produced the score: **D1 = 7e86f21** (play-identical to 4325554, the HEAD of our local clone).
  Confidence: high for the team-to-repo link (stated scores in commit text + exact 4.75 match), likely for
  D1 = 5.02 (timing + the team's own later text).
- Still open: D3 (06:06 UTC, after our last board copy at 05:25) adds "turn briefly toward an unseen mech
  that hits our back". If it beat 5.02 it becomes their final entry; counter K3 below names the change.
  Their main branch head at our fetch (06:42 UTC) was D3. No ls-remote or later fetch done.

## 2. Lineage

1. GPT line (davidvarvas/mech-royale-bot-gpt, 00:09-01:07 UTC): the team's own starter bot under their
   own MIT licence, grown by small simulator-judged steps (firing-tick lead aim, live rules, "target direct
   threats and favor advantageous fights", bounded path search, final-centre braking, repair drops under
   fire). Official: 0003b87 3.79, 89ec1cd **4.08** (the base of everything that scored later).
2. Main repo own line v1-v5 (23:57 UTC on 20 Nov to 01:19 UTC): watchdog, weapon memory, "fight only
   hostile mechs", juke, a free-for-all latch from deaths it did not cause. Official 86aaa4e **3.60**.
3. L1 9b5aa78 (02:43): a new decision core on 89ec1cd (hide latch, cover rules, laser + lightning with the
   gun dropped, crate farming to 150 m, shoot at anything with a clear shot). Official **3.58**.
4. A1-A2 (02:52): one idea per submission on 89ec1cd. A2 (finish-off under 30%, grab cubes within 70 m,
   dodge gun rounds) official **4.23**.
5. B0-B2 (02:54-03:52): LanceHuang245's public controller (the same one BackwardsDeployeds and Kanyaraasi
   ran). B0 and B1 official **4.75**. Withdrawn at 03:56 "under the no-code-sharing rule".
6. C1-C12 (04:11-04:13) stacked on A2; D1 (04:25) = C12 + two ideas the team says it took from other
   teams' public notes (Wolverines' "mid-fight cube pickup, weapon memory, laser pref, plating first").
   Official **5.02**. D2 (boost-strafing in duels) official, lower. D3 unknown.

## 3. How it plays (D1, numbers read from the source, in my words)

It keeps the gun for the whole match, takes the first laser or lightning it can reach (never a mortar)
and later swaps lightning for a laser but never the reverse, so it ends as gun + laser or gun + lightning.
It targets the lowest of (distance / 90 m + 1.6 x its hp fraction), with bonuses worth about 100 m for a
mech it counts as hostile, 110 m for a visible mech at or under 30% hp, 70 m for its current target and
20 m for a mech facing away from it; candidates are all visible mechs within 280 m. It counts a mech as
hostile if that mech damaged it in the last 7.5 s, or has a line of sight and points its torso within
about 0.2 rad of it (0.27 at 50 m, 0.16 at 200 m), or is inside 45 m heading at it faster than 3.5 m/s;
it starts a fight only against hostiles, against a mech at or under 43% hp within 195 m, after 60 s
against a mech within 115 m when it is above 78% hp and holds more weapons or the other is under 65%,
and, with three or fewer alive, against anyone within 150 m when it is above half hp. Fight spacing:
26 m when it holds lightning with energy above 25, else 75 m from a target that lists lightning, else
60 m (110 m only in the never-reached case laser without gun); full radial correction when 30 m off,
always strafing, with reversals at a mean of about 1.6 s and a boost only within 1 s of being hit with
energy above 45. It retreats to cover below 38% hp and stays latched until 80% (or 60% after 12 s
without damage), also when three mechs with a clear line are within 240 m (two when it is under 60%), but
the retreat move is skipped while its target is inside 38 m or it was hit in the last 0.6 s with its
target in sight, and a finishing chance (clear target at or under 30% within 130 m, own hp above 30%)
overrides both retreat and the outnumbered rule (two clear or hostile mechs within 170 m, which sends it
to a nearby cover spot that keeps its target in view while it keeps firing). Economy: when nobody is
fought and it is above 65% hp it walks to cubes within 90 m (120 m if remembered), wanted weapons within
110 m (160 m remembered, 220 m while it has only the gun), shoots crates within 70 m standing still from
35 m, and farms drones within 140 m from a 55-85 m strafing ring when above 60% hp with under 10 cubes;
mid-fight it detours to cubes within 20-32 m and weapons within 28-48 m (one shooter in view, hp at least
42%) and to cubes within 70 m when at most one mech is within 240 m. Upgrades: plating first, then armour,
then regeneration, then gun items, lightning, laser, mobility. Zone: it parks just inside the next circle
(next radius minus a quarter of it, at most 30 m), starts rotating once the shrink is less than 1.5 x its travel time + 10 s away, keeps a 12 m margin while fighting, drifts silently at 4.7 m/s toward 35% of the next radius when
idle, and brakes onto the exact centre in the last circle. There is no free-for-all switch.

Fire control details that matter for counters:
- Laser: starts charging only with a line of sight, within 266 m, its aim within 0.5 rad of the lead
  point, cooldown over, and **no mech listing lightning within 49.5 m**. Holds the charge until its aim is
  within 0.8 body radii (1.9 deg at 60 m), otherwise lets go at about 2.6 s (blind, if we left its view).
- Lightning: fires at any mech in a 25 deg cone within 43 m (only its target needs a line), energy above 11.
- Gun: fires inside 230 m only when the aim after this decision's slew is on the lead point within 0.8 body
  radii; reloads at 0 rounds, or under half a magazine when nothing is in sight and it was not hit for 1.5 s.
- Dodging: sidesteps gun rounds whose closest approach in the next 0.45 s is under 3.8 m; strafes hard
  (1.5 x) when a charging mech's aim is within atan(6 m / distance) + 0.05 rad of it (0.11 rad at 100 m);
  steps out of mortar landing points.
- Idle torso: points at the weighted bearing of hits and sounds of the last 4 s; otherwise sweeps
  sinusoidally +-1.3 rad around its direction of travel with a period of about 7 s.

## 4. Why it scores (practice) - measured deltas from its own logs

| Step | Official | Their simulator | Agreement |
|---|---:|---:|---|
| Kit example bot | 1.15 | 1.33 (sim D), 0.78 (sim E) | calibration only |
| GPT 0003b87 (threat-based targets and fight choice) | 3.79 | 6.92 (own 24-seed sim) | sim far too high |
| 0003b87 -> 89ec1cd (path budget, final centre, drops in combat) | +0.29 (4.08) | -0.59 (6.33) | wrong sign |
| Own line v5 86aaa4e vs GPT 89ec1cd | -0.48 (3.60) | -0.21 (6.06 vs 6.27); predicted 3.9 | sign right, size off |
| 89ec1cd -> L1 new core (shoot anything, gun dropped for laser + lightning, latch) | **-0.50 (3.58)** | **+1.54 +- 0.49** | wrong sign |
| 89ec1cd -> A2 (finish-off, cubes within 70 m, gun-round dodge) | +0.15 (4.23) | not run | - |
| LanceHuang245 171bc06, switches empty (B0) | 4.75 | - | same score as BackwardsDeployeds with the same code |
| B0 -> B1 (free-for-all-only switches) | 0.00 (4.75) | identical in practice | correct |
| A2 -> D1 (latch 38/80, cover at 3 shooters, no mortar, armour before regen, focus fire, laser first, loot memory) | **+0.79 (5.02)** | not used | - |
| D1 -> D2 (boost-strafe while a mech with a clear shot engages) | negative (size not published) | - | - |

Their sim calibration: real = 0.38 + 0.57 x sim (sim D, three bots); one 96-match batch cannot separate
0.3 real points; free-for-all "league" results (strafe flips every 0.35-0.9 s: +0.27 +- 0.21) were never
checked officially. They concluded "changes are judged only by real practice scores from now on".

Mechanism, against 15 squad hunters (gun + laser, exact aim, 100-150 m, never retreat):
1. Few simultaneous enemies: hunters become "hostile" the moment they aim at it, bystanders are left
   alone, so it fights one or two hunters at a time instead of every mech in view (the L1 core that shot
   anything lost 0.50, confounded).
2. Kills: focus fire with a 70 m stickiness bonus plus a 110 m finishing bonus, and a finishing override
   of retreat; kills are the practice score.
3. Survival: the 38% latch regenerates it back to 80% behind cover (45 hp/s after 5 s); three platings
   take it from 1400 to 2129 max hp before cubes; armour second.
4. Damage: laser (315 per 2.4 s) kept alongside the gun (102 hp/s over a magazine cycle), firing while it
   repositions; loot memory keeps it walking back to weapons and kill cubes after its torso turns away.
   The +0.79 bundle cannot be split; the team credits the laser preference and loot memory.

## 5. Lessons for our practice play (against Doctrine V4)

1. AGREE D7 (SQUAD keeps the gun, laser first, never mortar; plating > armour > regen). D1 holds gun +
   laser and plating-armour-regen first inside a +0.79 bundle; L1, which dropped the gun for laser +
   lightning, lost 0.50 (confounded with shoot-anything). Grade [1], bundled; consistent with [T].
2. AGREE D6 power grabs and memory (40 s, 70 m): D1's 45 s memory and 70 m mid-fight cube detour are in
   the +0.79 bundle; A2's cube grab was in a +0.15 bundle. Grade [1], bundled.
3. AGREE D3 low-hp retreat with a latch, and its "keep shooting while breaking the line": D1 latches at 38%
   and keeps fighting while it is being hit or the target is inside 38 m. Difference: it re-engages at
   80% (60% after 12 s quiet), we at 70%. No A/B on the threshold; the same latch sat inside L1 (-0.50).
   Grade [C]: do not move our 70% exit on this evidence.
4. AGREE D0/D5 engagement etiquette, and it goes further: D1 never opens on a healthy armed non-aimer for
   the whole match (only under 43%, or after 60 s with a clear edge inside 115 m). Grade [1] weak (no clean
   A/B; the GPT base that introduced it was judged by simulator only).
5. NEUTRAL / mild DISAGREE on D2 range: a 5.02 bot fights at 60 m with gun + laser, while the 5.58 bot
   holds 150 m. Their only range trials were simulator (+0.18 +- 0.32) and two live free-for-alls (worse);
   their two live free-for-all matches put 98% of house gun damage inside 80 m. Range is not what separated 4.23 from 5.02.
   Grade [C]: keep our `far` default, spend no submission on range before determinism and retreat work.
6. AGREE D4 "stay grounded, no faster than 0.8 s flips": D2's boost-strafing in duels scored below D1.
   Grade [1], size unknown.
7. AGREE D10 and the simulator rule: their sim got the sign wrong twice (L1 +1.54 vs -0.50; 89ec1cd), and
   identical code scored identically across teams (Lance quiet-off 4.75 three times, quiet-on 4.54 twice).
   So one official run of a fixed deterministic bot is reproducible: a one-change A/B is clean on those
   48 seeds, and `salt` is the only way to draw new ones. Grade [S] for reproducibility.

## 6. Limitations (each with its mechanism; source-read, not yet seen in a recording)

- L1 Retreat pinned by sustained fire: the retreat move runs only after 0.6 s without damage (or when its
  target is beyond 38 m); under a hit every 0.5 s it stays in the open on its 60 m strafing ring, below 38%.
- L2 Hostility is read from aim and contact: a healthy mech with two weapons that does not point at it
  (keep 0.3 rad off) and does not walk at it inside 45 m is never attacked in the first 60 s, and later
  only inside 115 m when it out-guns us or we are under 65%. Conversely, anyone who aims at it pulls its
  target choice by the equivalent of about 100 m.
- L3 Open mid-range trading: with gun + laser it holds 60 m in the open, where every gun hits; it uses
  cover only when outnumbered (two within 170 m) or latched.
- L4 Laser lockout near lightning: it will not start a laser charge while any mech listing lightning is
  within 49.5 m, and with gun + laser it backs off to 75 m from a lightning target at only 7.3 m/s radial
  (62% of its speed goes into the strafe), 3.7 m/s while charging.
- L5 Rear blindness in a duel (D1): the torso stays on its target; there is no turn toward an unseen
  attacker, and its shooter / outnumbered counts include only mechs it can see. Rear hits do 1.5x.
- L6 Standing still: shooting a crate inside 35 m, capturing an uncontested drop, healing below 65% with
  nothing in sight (it hides only from positions seen in the last 25 s), and sitting at a cover spot.
- L7 Laser release only on aim: if its line is broken it holds to about 2.6 s and then fires blind,
  followed by a certain 1.65 s cooldown.
- L8 No free-for-all posture: practice rules in the final; long walks for weapons (up to 220 m with the
  gun only) and drones within 140 m; it third-parties only via the under-43% rule.
- L9 Predictable zone spots: just inside the next circle's edge (up to 30 m in) when outside it, then a
  silent 4.7 m/s drift toward 35% of the next radius.
- L10 Drop etiquette: it skips any drop with a mech above 20% hp within 10 m of the centre, or with more
  than one hostile firing lane within 172 m.

## 7. Free-for-all behaviour

- Correction to showdown_profiles.md row 404 ("lightning closer", "slow start", plating x3): that win was
  match 23:00 ET = 04:00 UTC, 25 minutes before D1 existed, when the team's board entry was B0 (B1/B2 are
  the same public LanceHuang245 controller). Mechanism proof: the winner ended with laser + lightning and no gun,
  which D1 can never hold (it never drops the gun). So the recorded 295 s, 2 kills, 31 cubes, 1 drop,
  53% lightning, 92% of holds out of sight describe the Lance controller (see top_BackwardsDeployeds.md),
  not the 404 final entry. D1 has never been recorded in a free-for-all.
- D1 in a free-for-all (predicted from source): plays exactly its practice rules. Opening: farms cubes,
  weapons and drones at long walking distances; fights only mechs that aim at it, hit it, rush it inside
  45 m, or sit at or under 43% hp within 195 m (its only third-party rule). Mid-game: hides when three
  mechs with a line are within 240 m; holds 60 m duels in the open against single attackers. It does not
  look behind while dueling. Endgame: at three alive it engages anyone within 150 m while above half hp;
  in the last circle it brakes onto the exact centre. Likely outcome: survives the opening better than
  shoot-on-sight bots (calm), but dies to third parties during 60 m duels (L3, L5).
- If D3 is the final entry: same, plus a 0.7 s look toward an unseen rear attacker at most once per
  2.5 s (not while its target is under 30%), with gun and lightning paused during the look.

## 8. Observable signatures (anonymous mech)

- G1 Weapon list: always "gun" plus at most one special; never a mortar; never laser + lightning without
  the gun (this rules out the Lance family, which drops the gun once it holds both specials).
- G2 With gun + laser: settles 45-75 m from its target (centre 60 m); 75 m from a target listing
  lightning. With gun + lightning and energy: closes to about 26 m (18 m on a target under 25%).
- G3 Strafe reversals at irregular intervals, mean about 1.6 s; boosts come only right after it was hit.
- G4 No laser charge while a lightning carrier is inside 50 m; charge starts only on a line of sight.
- G5 Idle torso: slow sinusoidal sweep of about +-75 deg, 7 s period, around its travel direction.
- G6 Lets a healthy, armed, non-aiming mech pass at 60-115 m without firing (watch 5-10 s).
- G7 Max hp steps of x1.15 at 1, 3 and 6 cubes (plating first; shared with many bots).
- G8 Walks silently (under 5 m/s) toward the centre when idle; stands still on crates within 35 m.
Look-alikes: Mahalas (gun + laser at 55 m, but reversals every 0.45-0.95 s and boost bursts every ~5 s;
in a free-for-all it flees when shot) and Wolverines' 5.19 build (gun 70 m, laser 110 m, shoots anyone).
Rule: G1 + G2 + G3 within 5 s = "404-type"; add G6 to separate it from Wolverines.

## 9. Counters (for the final; ordered by expected gain; all unmeasured, grade [N])

K1. Third-party its duel from behind.
- Trigger: a 404-type mech (G1 + G2) holding a 45-75 m ring around another mech, our bearing from it more
  than 90 deg off its aim (its back), we are beyond 45 m (outside its proximity sensors), and no other mech
  has a line on us.
- Action: from 100-180 m charge our laser with our aim 0.3 rad off its bearing, swing on and release within
  one decision; then gun it (full lead; it strafes with ~1.6 s reversals). Stop after 4 s, or at once when
  its torso turns toward us, and break the line.
- Exploits L5 (and L1): it never turns from its target to an unseen hitter and does not count us in its
  retreat tests; rear damage is 1.5x.
- Expected gain: one 472-damage beam plus about 8-10 rear rounds (67 each) = 1,000-1,150 before it reacts,
  about half of a plated 2,100-hp D1; with its duel partner's damage, often a kill and its cubes.
- Backfire: a Lance-family mech turns at once to an unseen hitter and stops shooting its target, and D3
  glances back for 0.7 s; then we are seen and become its preferred target (hit us = hostile). Hence the
  "break the line when its torso turns" rule.

K2. Do not trip its hostility test (calm pass).
- Trigger: a G1 mech within 200 m that has not damaged us, while we are not choosing to fight it.
- Action: keep our torso at least 0.3 rad off its bearing (our scan must skip it), do not walk toward it
  inside 50 m, keep two weapons and hp >= 65% while within 115 m of it and >= 45% within 200 m; otherwise
  break its line of sight. Shoot back at once if it opens fire (D0 stays).
- Exploits L2: its only reasons to start a fight are aim, contact, proximity rush, our low hp, or a clear
  edge inside 115 m after 60 s.
- Expected gain: removes one 60 m brawl against a 2,100-3,000 hp plated mech in the opening and middle
  game, which is the kind of exposure that kills the bottom half (median death 21 s); costs nothing.
- Backfire: shoot-on-sight bots with the same weapon list (Wolverines, Lance family) attack anyway; the
  rule then only cost us not pre-aiming, so keep the D8 snap-on time short (aim 0.3 rad off is one decision
  from on-target at 4 rad/s).

K3. Pin it when it is under 40%.
- Trigger: a 404-type mech we are dueling drops below 40% hp (hp / max_hp) with a line to us.
- Action: keep a hit landing at least every 0.5 s: do not start a reload with rounds left while it is in
  sight, time our laser release to cover our gun reload (2.4 s), use lightning if inside 45 m; with
  lightning and energy > 40 close inside 38 m. Abort if a second mech gets a line on us (D11).
- Exploits L1: its retreat move waits for a 0.6 s damage gap (and never runs with its target inside 38 m),
  so it keeps strafing in the open while we keep hitting it.
- Expected gain: the 800-1,150 hp it has left at 38% (2,129-2,981 max) falls to one magazine (540) plus one
  or two beams in about 5 s, instead of escaping to regenerate to 80%. Turns a won exchange into a kill.
- Backfire: bots that retreat regardless of incoming fire escape anyway; the cost is a late reload, small
  if we reload as soon as it leaves our sight.

K4. Lightning lockout of its laser.
- Trigger: we hold lightning with energy > 40, a 404-type mech with gun + laser engages us alone (no other
  mech with a line within 120 m), and we are above 60% hp.
- Action: close to 30-40 m (boost from under 90 m when energy > 70, as in D2's lightning rule), keep it in
  our 30 deg cone and zap; keep our own laser charge only beyond 50 m of any lightning carrier.
- Exploits L4: inside 49.5 m it will not start a laser at all, and it backs off at only 7.3 m/s radial while
  we close at 11.7 (19.5 boosting); a short also kills any charge already running.
- Expected gain: removes its 131 hp/s laser, leaving its gun (102 hp/s per cycle) against our lightning
  (240 hp/s); in our favour by about 2:1 for as long as we stay inside 45 m.
- Backfire: a gun + lightning 404 (or Lance / Wolverines with lightning) closes to 26-28 m and zaps back:
  an even trade. Closing over open ground costs 1-3 s of its gun; never do it with a third mech in view.

K5. Punish its blind laser hold.
- Trigger: a G1 mech with `charging` on, its aim within 0.15 rad of us, a hide cell within 6 m (9 m when
  boosting with energy > 30).
- Action: step behind hard cover; stay out of its line until its charging flag drops (it lets go blind at
  about 2.6 s, or at once if we re-enter its aim); then peek and fire our laser or gun within 1.6 s.
- Exploits L7: it releases only when aimed, so a broken line wastes the beam and fixes its 1.65 s cooldown.
- Expected gain: one 315-damage beam denied per cycle and a free 1.6 s window for our own release; decides
  a laser trade.
- Backfire: bots that release the instant the charge is full (Mahalas at about 0.7 s, Lance when within 1.6
  body radii) make the duck only a 0.75 s pause; re-peek on the flag dropping, never on a timer.

K6. Free beams on a standing target; deny drops.
- Trigger: a G1 mech under 1 m/s for 1 s next to a crate within 35 m, inside a drop ring, or hiding below
  65% hp; or a 404-type heading for a drop we can reach first.
- Action: a full laser from beyond 100 m with a clear line (no lead needed), then the gun; for a drop, stand
  inside 10 m of its centre above 20% hp (it gives the drop up).
- Exploits L6 and L10.
- Expected gain: 315 per beam on a still target; a drop denied is +3 cubes and a full repair it does not get.
- Backfire: a still mech may be a waiting laser hider: if its charging flag is on with aim on us, apply K5
  first; contested drops attract other mechs (Mustikas walks to every drop), so leave if a second mech
  comes within 60 m (D6).

## 10. Files

- Source read: intel/davidvarvas__mech-royale-bot (HEAD 4325554, play-identical to D1); D1 7e86f21, C12
  041e1b9, A2 94acb5d, L1 9b5aa78, D2 ad5c2f2, D3 32cf5d3 extracted read-only from
  intel/_meta/davidvarvas__mech-royale-bot.git into tools/top10/404x/ (scratch, data only); the GPT base
  89ec1cd from intel/_meta/davidvarvas__mech-royale-bot-gpt.git.
- Board: ../web/mech_submission_times.json, leaderboard.html (04:25), leaderboard_now.html (05:19),
  lb_0525.html (05:25). Showdown row: intel/dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl line 64.
- Rules and balance: kit/protocol.md (short, cook-off, rear armour, near range, memory), notes/hello_example.json.
