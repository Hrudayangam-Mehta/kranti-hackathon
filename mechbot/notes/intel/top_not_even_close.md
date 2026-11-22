# not even close (Th3r0n/mech-royale-bot): clean-room study, limitations, signatures, counters

Written 21 Nov 2026, 07:25 UTC. Read-only work: nothing from the repository was executed, built or installed, and
no code, identifier, comment or constant table is reproduced here. Behaviour is described in my own words with
plain numbers; the only quotes are short commit titles used as evidence. Balance numbers are the organiser's
published config (`notes/hello_example.json`). Arithmetic behind the model numbers: `tools/top10/nec_numbers.py`
(own model, standard library only).

## 0. What changed since the task was written

1. **The team's best is now 5.08, not 5.02.** My fetch of the public board at 07:08 UTC
   (`tools/top10/nec_web/lb.html`, parsed copy `lb_0708_parsed.tsv`) shows "not even close" at **rank 20, 5.08,
   best time 06:31:41 UTC**. The 5.02 (rank 13 in the 05:19 / 05:25 snapshots) is its previous best.
2. **The board moved a lot in two hours**: top 5.60 (team 2696, 06:58), 16th 5.15, **32nd 4.90** (N4n0byt3).
   The final cut is no longer "about 4.45".
3. **The repository has 32 commits after the one our 05:32 clone holds** (up to `cac54ef`, 06:47:45 UTC; our `_meta` copy is
   blob-less, so I fetched the named commits read-only by id into `tools/top10/nec_git`). They contain the 5.08
   build, a free-for-all rework and systematic re-sampling of the random seed ("RNG salt") for submissions.

## 1. Identity (re-checked)

| Evidence | Value |
|---|---|
| Team name in the repo | README: bot for the Mech Royale track, team "not even close"; announced bot name "not-even-close" |
| Commit clock | every commit stamped +01:00. Check: our clone was checked out at 05:32:16 UTC and holds `01b6b6e`, stamped 06:25:40+01:00 = 05:25:40 UTC. If the digits were UTC the commit would postdate the clone, so the +01:00 offset is real |
| 5.02 | `7775214` "exp J: econ core with laser fight distance 145 m" at 04:12:05 UTC; board best time 04:21:19.6 UTC (9 min 14 s later; all our snapshots from 04:25 on show it); the next burst (`55c4ff0`, 04:32:28 UTC) states "(real 5.02)" for exactly that configuration |
| False lead rejected | `4670a74` / `2e92409` carry 04:21:19+01:00, the same minutes and seconds as the board time but one hour earlier (03:21:19 UTC). Rejected by the clone check above and by the team's own dated scores (4.29 by 03:17, 4.75 by 03:56, 4.98 by 04:12 UTC, all before 5.02) |
| 5.08 | board best time 06:31:41.1 UTC; the only burst in the preceding hour is at 06:28:59 UTC (162 s earlier): the v18 build with a straight jump-and-jet opening, three salt samples of it, and three "hop sample" builds (v18 with the old sideways hop opening, salts 1, 2, 3: `6f2f901`, `1a0ebf2`, `8b16037`, identical except the salt). `cc02c3b` (06:40:13 UTC): "back to the sideways hop opening (practice 5.02/5.08 against 4.48-4.90 without it)". So 5.08 is one of the three hop samples |
| Earlier results (team text only; never on our snapshots) | 4.98 = `06c7d26` (exp I); 4.75 = `78a585c` (v11); 4.29 = `36bfe31` (v9.1); 3.63 = `8439227` (v10) |

Confidence: team = repo **confirmed**; 5.02 = `7775214` **confirmed** (roster copy `th3r0n_expJ_7775214`);
5.08 = a v18 hop sample **likely** (one alternative, low: the 05:38 v16 build, which has the same practice
behaviour, submitted late). Which of the three salts scored 5.08 cannot be told; it does not matter for play.

Versions read: `7775214` (sandbox copy, the economy core, its tunables, the mode latch, the navigator, the start-up
rehearsal, the free-for-all "ninja" core in outline); `06c7d26` (differs from `7775214` by one number);
`8b16037`, `6f2f901`, `1a0ebf2`, `cac54ef` as differences against `7775214`; commit messages of all 82 commits.

Text aimed at AI agents: none found (README, Dockerfile, sources, tool scripts, all commit messages; single
author, no assistant trailers). Nothing to ignore.

## 2. Lineage

- 00:07-01:54 UTC, v1-v8: the team's own architecture (1 m map raster, A* on a 2 m grid, cover planner with peek
  fighting, a time-to-death versus time-to-kill risk model, lightning-first "anti-sniper" rules, an endgame
  timeline, and a free-for-all "ninja" core with an openness map, live viewsheds, stealth paths and a camping
  nest). No scores stated; their simulator was calibrated so v1 and v3 "match their real scores".
- 02:25 UTC, v9: an aggressive practice core modelled on a public 4.75 bot (their name for it is the "lance
  core"; it matches LanceHuang245's published bot). v9.1 (laser range 145 m): **4.29**.
- 03:04 UTC, v10: four TTUN-style parts (their numbers equal the 5.19 bot's) transplanted into that core: **3.63**.
- 03:36 UTC, v11: about fifteen "fidelity fixes against the 4.75 reference": **4.75**.
- 03:56 UTC: a separate core, "re-implementation of a 5.19 public economy bot's methods" (Wolverines' TTUN
  v8-econ). Every number I checked against `top_Wolverines.md` section 2 is the same (target rule, bands, strafe,
  dodges, retreat and heal thresholds, economy radii, zone rule); the one difference in the scored builds is the
  laser band, 145 m instead of 110 m. Navigation and sight code are their own. exp I (110 m): **4.98**;
  exp J (145 m): **5.02**.
- 05:18-06:47 UTC, v14-v19: the free-for-all switches from the ninja core to the same economy core plus one rule;
  the start-up rehearsal's leftover navigator state (which made the mech hop for its first 4 s) is first removed,
  then rebuilt on purpose as an explicit opening; seed re-sampling per version. Hop sample: **5.08**.

So in practice it belongs to the TTUN family with Wolverines, Kanyaraasi and r1ver; nearly every limitation and
counter in `top_Wolverines.md` carries over. This note concentrates on what is different.

## 3. How it plays (scored builds; the 5.08 build is identical in practice except the opening and the seed)

It targets, from the first second and with no engagement gate, the mech with the lowest score among those seen in
the last 4 s: distance, plus up to 90 m for full health (health divided by 1400), plus 30 m per second unseen,
minus 50 m if that mech hit it in the last 3 s, minus 40 m for its target of the last 2 s. It holds 145 m from
that target with a laser, 70 m with the gun alone and 28 m with lightning, each with a 15 m dead band, always
strafing: approach at 8.7 m/s walking (14.5 m/s boosting, lightning only, from under 90 m with energy above 70),
back off at 7.2 m/s without boost, side changes re-drawn by coin flip every 0.35-1.05 s, half speed while its
charging flag is up. The gun fires at any aligned target to 230 m on a plain three-pass lead and empties 12
rounds before the automatic reload; the laser starts charging whenever it is ready and the target is in view
within 280 m (within 60 m even without a line), and is released only at full charge, aligned, with a line;
otherwise the charge is carried until the weapon fires itself 2.75 s after the flag rose. It runs ("losing") only
when not finishing a target under 20%: under 35% health against a target at least 0.10 healthier, under 55% with
two mechs in view within 160 m, under 80% with three; it boosts to the nearest cell hidden from its target's eye
(6 m rings, at most 50 m), still firing, then heals only when no mech has been seen for 4 s, below 55% (or below
90% within 6 s of running), standing still or creeping at 0.4 stick to cover within 36 m. Economy: cubes
remembered 40 s and fetched mid-fight within 70 m (40 m under half health, 12 m when running), wanted weapons
within 60 m (gun only) or 35 m; out of contact it farms drones within 170 m from 38 m (above 50% health), ground
crates within 150 m from 30 m (above 45%), uncontested supply drops within 220 m; the gun is never dropped and the
second slot prefers laser over lightning over mortar (never laser and lightning together); upgrades are hull
first (plating, armour, nanites), weapon upgrades after. Zone: out of contact it heads for the point at 45% of
the next radius on its own side when outside, beyond 90% of the current radius, or beyond 80% of the next radius
with the shrink near; in a fight it ignores the zone until it is actually outside; there is no endgame logic.
Free-for-all switch: once two mechs have died that it did not kill before 200 s (or four before 330 s); in the
5.02 build this hands control to the ninja core, in the 5.08 build it keeps the same core and adds one rule
(section 7). Opening (5.02 by accident, 5.08 on purpose): for the first 4 s it jumps and jets with its route
turned about 60 degrees to the left; my model puts it about 40 m up at 4 s with about 40 energy left, landing
near 6 s some 60-110 m off its route.

## 4. Why it scores (its own logs)

Official results with what changed (all from commit text; n = number of behaviour changes):

| Step | Before | After | Delta | n | Note |
|---|---:|---:|---:|---:|---|
| Four TTUN-style parts (economy loop, conditional retreat, keep gun + laser, 70 m gun band) put into the 4.29 core | 4.29 | 3.63 | -0.66 | 4 | the team then isolated each part (exp A-E); no results published |
| About fifteen fidelity fixes to match the public 4.75 bot (zone deadline bug, aim tolerance on the current torso aim, farm shots in any mode, charged-laser side-step, stuck detector, cover against unseen attackers, no quiet speed cap, no mid-duel detours, ...) | 4.29 | 4.75 | +0.46 | ~15 | |
| Whole core swapped for the TTUN re-implementation (110 m laser) | 4.75 | 4.98 | +0.23 | core | |
| Laser band 110 -> 145 m | 4.98 | 5.02 | +0.04 | 1 | clean one-change A/B; within draw noise (below) |
| Leftover opening hop removed (other changes in those builds affect free-for-all only), then a straight jump-and-jet opening | 5.02 | 4.48-4.90 | -0.12 to -0.54 | 1 | several submissions, number unknown |
| Sideways hop opening rebuilt on purpose, new seed | 4.48-4.90 | 5.08 | +0.18 to +0.60 | 1 | |
| Strafe-aware gun lead (exp K), drone back-off under 40% (exp L, L2), laser band 175 m (exp M), v15h, v16 | 5.02 | at most 5.02 if submitted before 06:31 | <= 0 | 1 each | upper bound only: not known to have been submitted |

What carries the score: the TTUN economy package (+0.23 over a faithful 4.75 core, +0.69 over their own best
before it). The laser band is worth nothing measurable. The scorer's draw noise is large: practice-identical
builds (only the seed or a free-for-all-only rule differs) span at least 4.48-4.90, so single deltas under about
0.3 are not evidence. The hop: two hop draws (5.02, 5.08) against at least two, probably three to five, no-hop
draws (4.48-4.90). If all draws were exchangeable, the chance that the two hop builds are the top two is 0.17 with
four builds, 0.07 with six: weak evidence for a real effect, mechanism unknown (the straight jet opening, which
also rises 40 m and sees over the roofs, did not reproduce it).

Simulator versus official: the logs give one simulator number. The team's bot-against-bot free-for-all simulator
says the spawn hop costs "~0.7 place points per free-for-all match"; they removed it for that reason (v17),
measured lower practice scores, and put it back for the practice score (v19), accepting the predicted
free-for-all cost. Their practice simulator is only described as ranking v5, v8 and v9 "like the real board";
no paired numbers. The v10 commit records that the real scorer rejected a bundle (-0.66) the team had built on
simulator reasoning.

## 5. Lessons for our practice play, against DOCTRINE V4

1. **Coherent cores beat transplanted parts** [1: two official results in one repo, same direction]. Four
   TTUN-style parts inside another core lost 0.66; the whole 5.19 package gained 0.23-0.69. V4 is itself a blend
   (D2 from the 5.58 bot, D6 from the 5.19 bot, D3 thresholds from both). Not a disagreement with any one number,
   but with the method: our first real submissions should be a single-lineage configuration (all presets set to
   one top bot's values, which our studies document), then one change per submission.
2. **D2 laser band: agree that it is contested, and add that it is a small lever** [1: 110 -> 145 m = +0.04,
   inside noise]. The 5.58 bot's own step to 125-185 m was +0.05 (bundled with runtime fixes). Do not spend early submissions on it.
3. **D10 salt: strongly agree, with numbers** [1: their explicit statement that a new salt is a new sample, and
   a >= 0.42 spread among practice-identical builds]. Treat any delta under 0.3 as noise. With a draw spread of
   0.12-0.18, the best of 4 salts is about +0.13-0.19 over the mean and the best of 8 about +0.17-0.26
   (`nec_numbers.py`). Reserve the last 6-10 submissions (4 per hour) for salts of the best build; ties go to
   the earlier submission. Their v19 has nine more salts queued: their best will ratchet the same way.
4. **Opening move: V4 is silent** (D4's "stay grounded" is about dodging) [1, weak, p about 0.05-0.17]. A 4 s
   sideways jump-and-jet opening is a candidate one-change preset for one real submission once the core is
   stable; not a default.
5. **D10 / G4 rehearsal isolation: agree** [1]: their start-up rehearsal leaked navigator timers into the match.
   Keep isolation for determinism and add any opening behaviour explicitly, never by accident.
6. **D0 opening guard and D5 candidate filter: contested** [T-derivative]: this bot shoots on sight from t = 0 and
   scores 5.02-5.08 (same finding as the Wolverines study, lesson 1). Keep both as presets.
7. **D3 thresholds and heal exit: contested, no new evidence** [T-derivative, no A/B]: it runs at 35 / 55 / 80%
   (one / two / three in view) and leaves the heal at 55% or on any sighting; V4 uses 35 / 50 / 60% and 70%.
8. **D6 farming health: contested** [T-derivative]: drones above 50%, crates above 45% at 5.02-5.08, against V4's
   90% default. Make 50% an early A/B (as the Wolverines study says).
9. **D6 drone back-off and finer gun leads: weak negative** [official upper bound]: neither its drone back-off nor
   its strafe-aware lead was kept. Keep ours switchable.
10. **D7 keep gun + laser in SQUAD: agree** [T].
11. **D12 latch: agree that a death-count latch is safe in practice** [1]: its looser latch (two foreign deaths
    before 200 s) switched the whole brain in the 5.02 build and still scored 5.02, so it rarely or never fired in
    practice. V4's three deaths is stricter still.

## 6. Limitations (each with its mechanism)

1. **Blind to third parties.** In a fight the torso, and with it the 120 degree view wedge, is slaved to the target;
   damage from an unseen mech changes only the idle aim, which a fight overrides. A mech beyond 45 m and more than
   60 degrees off its target line is never seen, never counted as a threat, never dodged, and its cover cell is
   computed against the target's eye alone.
2. **Long-band duels rest on one weapon.** At 130-160 m its gun bullet flies 0.52-0.63 s, and its plain lead
   against a strafer hits rarely (the Wolverines study's model: about 15% at 130 m); its damage there is the laser,
   at most 315 per 2.4 s (131 HP/s before cubes). Remove the laser and it is harmless at its own range.
3. **Predictable laser.** The flag rises the moment the weapon is ready and we are in view; release comes at
   0.70-0.75 s, only aligned with a line; if the line is lost it carries the charge at half speed and fires itself
   at 2.75 s into whatever it faces, then cools down 1.65 s. It never releases early.
4. **Gun silent while the laser is busy.** While charging, and in the last 0.2 s of cooldown (40% of each laser
   cycle), it aims at our present position without lead but still gates the gun on the lead; a target crossing
   faster than 4.6 m/s at 145 m (6.7 m/s at 100 m, 9.5 m/s at 70 m) draws no gun fire then.
5. **Weak laser defence.** It reacts only to its own target's charging flag pointed within 0.25 rad, by boosting
   along its strafe; no cover, no reaction to anyone else's laser.
6. **Zone-blind stand-off, worse than TTUN's.** It backs away whenever its target is inside 130 m and only reacts
   to the zone once outside. With its target at the centre it is pushed out from about **299 s** (current radius
   under 130 m; TTUN's 110 m band: 314 s), then runs straight back in with boost, and out again, at 100-260 HP/s of
   zone damage and with no regeneration.
7. **Retreat counts sightings, not shooters**; unseen shooters never make it run; its hide cell is the nearest
   cell hidden from the target's eye on 6 m rings, which we can compute.
8. **Fragile heal**: any sighting cancels it; while healing it stands or limps at 0.4 stick with the torso
   spinning (a full look-round about every 1.6 s), so open ground near a healer is watched but cover is not.
9. **Straight, unstrafed walks and stops**: to cubes within 70 m mid-fight, to cover, to the zone point; stands
   still 38 m from drones (inside their 45 m aggro ring), 30 m from crates, at the centre of a supply-drop ring.
10. **Loadout rigidity**: gun always; a mortar is taken into an empty slot (cook-off +60% against our laser) until a
    better weapon replaces it; with lightning it closes to 28 m on anyone, laser carriers included.
11. **5.08 build, free-for-all only: flees every laser carrier when it has none.** Without a laser, a target that
    carries one beyond 70 m above 35% health counts as "losing": it boosts to cover, hides 6 s, heals, and starts
    again on the next sighting. It can be pinned out of the game by being seen.
12. **The opening hop**: airborne for about 6 s, 40 m up at the apex, 40 energy at landing, and in the air its
    side-step barely moves it (air acceleration 12 m/s2 against 58.5 on the ground: about 0.5 m in 0.3 s). Its own
    simulator rates the hop at -0.7 places per free-for-all match.
13. **Runtime, unverified**: its Dockerfile sets no engine thread limits; our smoke test (p99 4 ms, max 7.6 ms) was
    not run under the one-CPU quota, where our own bot without limits had 43-51 ms worst answers.

## 7. Free-for-all behaviour

- **Which build plays**: unpicked, the best-scoring entry goes through; that is the 5.08 hop sample, and every
  later commit (v19 and its nine queued salts, `cac54ef` with its new options all off) has the same behaviour. The
  5.02 build (ninja core) would only play if the team picks it, which its whole later history argues against.
- **5.08 in a free-for-all**: hop for the first 4 s; shoot-on-sight from first sight (no opening guard); latches
  after the second foreign death (the field's bottom half dies in a median 21 s, so about 15-30 s in); after the
  latch the only change is the flight rule of limitation 11. Everything else (145 m band, farming, cube detours,
  45% zone point, no endgame logic) is its practice behaviour.
- **5.02 ninja core, for completeness**: hides in low-openness nests, plans paths through cells its three most
  dangerous enemies cannot see, and engages only mechs that hit it (8 s), that it hit (6 s), that are within 35 m,
  that aim at it within 160 m or charge at it, that are under 35% within 130 m, or (camping) favourable targets
  with a clear trade edge; after 330 s only what fights it; breaks off at 50% (65% against two), heals to 90%
  after kills; with lightning it refuses long duels against laser carriers.
- **Record**: never seen in any recorded showdown. The team chose the economy core for free-for-all because the
  TTUN method "scores best in the real free-for-all showdowns" (the Wolverines record: about 6th of 16 on average),
  then knowingly kept a hop their own simulator says costs 0.7 places.

## 8. Observable signatures

- t = 0-6 s: rises about 10 m/s for up to 4 s, drifting off its line, then drops; energy falls to about 40. Not seen in
  the TTUN family studies, and the 5.58 bot never leaves the ground except a 0.9 s unstick hop. Torso spins for the first 3 s (shared with the TTUN family).
- "gun" always in its weapon list; never laser + lightning.
- With a laser it settles **130-160 m** from its target (TTUN family: 95-125 m; the 5.58 bot: 125-185 m), crossing
  at full walk speed with side changes 0.35-1.05 s apart, half speed while its flag is up.
- Charging flag within a tick of its laser being ready whenever we are in view; beam exactly at full charge.
- Gun: opens on first mutual sight up to 230 m; 12 rounds, then 2.4 s quiet (no early reload in a fight).
- Mid-fight straight walks onto ground cubes within 70 m; motionless farming poses at 38 m (drone) and 30 m (crate).
- Travelling: torso sweeps about 52 degrees either side of the heading, 4.8 s period. Healing: motionless or 4.7
  m/s limp, torso turning continuously.
- 5.08 free-for-all: gun-only (or gun + lightning / mortar) mech that turns and boosts to the nearest building edge
  as soon as it sees a laser carrier beyond 70 m, while still shooting at it.

## 9. Counters

Machinery assumed (all in V4 or the Wolverines study): exact gun lead, laser peek from cover, exposure grid, 9 s
sight breaks, bullet-aware dodge, a per-mech tag that persists through the match (ids are fixed within a match).
Gains are mechanical estimates, not measurements. These counters are for the final; in practice we never meet it.

### C1. Spawn tag (identification, enables C2-C5)
- **Trigger:** at t < 6 s, a mech seen rising more than 5 m/s or more than 10 m above the ground below it.
- **Action:** tag that id for the match. Optional free shots: if it already counts as hostile under D0 (it will
  fire at us as soon as it sees us), is within 150 m, is airborne and no other mech is in view, fire a magazine
  with a constant-velocity lead (its rise is capped at a steady 10 m/s). Otherwise keep a building between us and
  its bearing until it lands; its 40 energy limits its boosts for the next 3 s.
- **Exploits:** limitation 12: in the air it cannot side-step and its path is a straight line.
- **Gain:** correct identification removes the guesswork between this bot and its 110 m relatives (C4's timing
  and C3's band differ). The optional magazine: about 8-10 hits, 360-450 HP, roughly 30% of its health.
- **Backfire:** another bot that jets at spawn (none known among the top 16) would be mis-tagged: C2-C5 only use
  behaviour that is checked again on the spot, so a wrong tag costs little. Shooting at t < 6 s is loud (gun audible
  320 m) in the most crowded seconds: hence the "hostile and nobody else in view" condition.

### C2. Laser-release denial at the corner (when it targets us)
- **Trigger:** a mech holding 130-160 m from us with gun + laser (tag optional); its charging flag rises with its
  aim within 0.25 rad of our bearing.
- **Action:** be behind hard cover within 0.6 s of the flag: 7 m walking, 11.7 m boosting (reacting one decision
  late: 5.8 / 9.7 m). Fight only from cells with such cover; never cross open ground at 100-160 m in its view. After
  the break it carries the charge at half speed and fires into the wall 2.75 s after the flag (or we hear the beam);
  peek in the next 1.6 s, fire our laser (charged behind the corner, released in the decision we step out, aimed at
  its position plus 0.1 s of its velocity) and the gun only if it is inside 110 m. While its flag is up, cross at
  more than 4.6 m/s so its gun stays silent (limitation 4).
- **Exploits:** limitations 2, 3, 4, 5: its only effective weapon at its range releases at a known moment, never
  early, and needs the line at that moment; it does not dodge our laser beyond a boost along its strafe.
- **Gain:** each denied beam saves 315-441 HP (22-31% of base health) and buys a 2.4 s window in which it cannot
  laser us; its incoming damage at 145 m drops from about 131 HP/s plus a little gun fire to the gun alone. The
  laser exchange becomes close to one-sided.
- **Backfire:** the 5.58 bot has the same full-charge-only release and forced discharge, so the same timing works
  against it, but it steps out of our line when we charge pointed at it: against it, charge off-axis until the
  step-out. A bot that releases early or holds a charged laser on the corner punishes a peek inside 2.75 s: peek
  only after the beam is heard or seen. With two mechs having a line on us, break sight 9 s instead.

### C3. Third-party flank on its long duel
- **Trigger:** it is fighting another mech A: its aim and rounds (or flag) point at A, A is 130-160 m from it.
- **Action:** take a firing cell 70-110 m from it and 75-100 degrees off its line to A (beyond 100 degrees its rear
  arc takes x1.5), never inside 45 m, hard cover within 6 m. Geometry gives us 150-185 m from A, beyond most bands
  and usually outside A's view while A watches it. Fire gun at full cadence with exact lead and laser at every
  cooldown; re-check the angle every decision. Leave (break sight) when A drops under 15%, A is out of its view for
  3 s, or its aim comes within 0.5 rad of us.
- **Exploits:** limitation 1 (it never turns to, counts or dodges an unseen attacker) and limitation 7 (it runs
  from what it sees, so our damage does not make it run, only A's presence does).
- **Gain:** 130-290 HP/s unanswered (gun 130-160 at 70-85% model hit rate on a target that does not side-step our
  rounds, laser 131, rear bonus on top): 1400 HP in 5-10 s, its cubes plus two, and usually A's as well.
- **Backfire:** same signature in a TTUN relative: identical blindness, works the same. A bot that turns to its
  strongest attacker would face us at 70-110 m at full health: bounded by the cover rule and the 0.5 rad exit.

### C4. Squeeze it out of the small circles from about 300 s
- **Trigger:** current radius under 130 m (from about 299 s), the tagged mech alive with a laser and targeting us
  (aim and flag on us), we hold cover within 0.3 of the next radius from the next centre.
- **Action:** stay inside; do not chase outward. Each time it is inside 130 m of us it backs out at 7.2 m/s
  (12 m/s if a dodge makes it boost); once outside it runs straight to its 45% point with boost: shoot those
  straight runs with exact lead (constant velocity) and release the laser on it while it is outside and cannot
  regenerate. Keep C2's corner discipline for its beams.
- **Exploits:** limitation 6 (a 145 m stand-off that is never clamped to the zone) and limitation 9 (straight runs).
- **Gain:** zone damage 100 HP/s (phase 4), 160 (phase 5), 260 (final) on it for the part of the time it spends
  outside (30-50% when it targets us, by the Wolverines study's model), no regeneration, plus easy hits on its runs:
  typically one place won in matches where both of us reach 300 s.
- **Backfire:** the centre is crowded: if two other mechs are within 60 m and we are under 60% health, hold cover
  at half radius instead. The 5.58 bot (125-185 m) and the TTUN relatives (from 314 s) are squeezed the same way,
  which helps us; a lightning carrier is not squeezed: keep 50 m from it (Wolverines C6).

### C5. Pin the laser-less 5.08 build (free-for-all only)
- **Trigger:** after the latch, a gun-only (or gun + lightning / gun + mortar) mech that turns and boosts to cover
  within 1 s of seeing us while we carry a laser, at a range beyond 70 m.
- **Action:** stay 80-140 m away (beyond its 70 m threshold, inside our laser's sure range). Release a pre-charged
  laser on it during its run to cover (straight boost of at most 50 m, about 2.5 s); do not follow it into cover.
  Then take what it abandons (drones, crates, cubes, a weapon pickup it was walking to) and show ourselves again at
  80-140 m about every 8 s: each sighting restarts its flight and its 6 s hide. Never close inside 75 m: there it
  fights at its 70 m gun band. If it gains a laser (weapon list), it is the normal bot again: switch to C2.
- **Exploits:** limitation 11 (a flight rule keyed only on our weapon kind, range and its health) and limitation 9
  (straight run).
- **Gain:** one free beam per flight (315-441 HP), and a rival that spends most of the mid-game hiding and healing
  instead of farming or third-partying; it will not come at us from beyond 70 m.
- **Backfire:** a different gun-only bot that does not flee will come at us at 80-140 m, where its gun is weak and
  our laser lands: acceptable. Our laser and gun are loud (380 / 320 m): bound each pin to 12 s and drop it when
  another mech comes within 120 m.

### C6. Punish the farming stop (shared with the TTUN family)
- **Trigger:** speed under 1 m/s, about 38 m from a drone or 30 m from a crate, gun firing at it, torso fixed.
- **Action:** approach unseen from more than 60 degrees off its aim, stay beyond 45 m; open with a fully charged
  laser from beyond 90 degrees off its aim (x1.5), then the gun. It turns to the damage bearing within about
  0.8 s: be within 6 m of cover by then and continue with C2.
- **Exploits:** limitation 9 and the slaved torso.
- **Gain:** 470 HP opener (about a third of its health) plus the drone's fire on it.
- **Backfire:** none specific; the same pose in any farming bot is equally safe to punish.

## 10. Not established

- Which of the three hop samples scored 5.08, and how many no-hop builds were submitted (bounds the hop evidence).
- Whether the team will pick another entry for the final; whether a later salt raises its best (likely: nine salts
  queued at 06:40 UTC).
- Any recorded free-for-all of this team. Its answer times under the one-CPU quota.
- The hop's model numbers (apex 40 m, 60-110 m drift) assume no roof or eave above it and the published jet
  numbers; hit-rate figures borrowed from the Wolverines study come from a 1-D model.
