# Squad model: house-bot reverse engineering (Fable panel, Sun 22 Nov)

Tags: **[D]** documented by the organisers; **[M]** measured on official data (replay `replay/mech16.jsonl.gz`,
kit stream, board scores, other teams' official submissions); **[S]** our simulator only (its squad controller is
our own guess, so [S] says how a schedule would behave, not which schedule is real); **[G]** guess.

Hard limit of all evidence: there is **no official recording of a practice (squad) match**. The replay and the kit
stream are both free-for-alls (kit stream: `alive` falls 16 -> 13 in 37 s, so house bots were killing each other).
The `easy` tier appears in no recording. Every statement about the hunter schedule is therefore [D] wording, [M]
board inference, or [S]/[G].

## 1. Hunter schedule and kill pacing

**[D]** One sentence only: 15 bots (4 easy, 4 medium, 4 hard, 3 expert), one squad, shared vision, never fight each
other, "hunt you weakest first (one early, more as you thin them out, all of them late)". No numbers, no tier stats.

**[M] what official scores say about it**
- 2696's fight gate: not starting a fight until 10 cubes or 75 s was worth +22 kills per 48 matches against a 20 s
  gate; a 130 s gate gave 15 of them back; "never start a fight" is still used in 4 of its 16 seed buckets.
  Reading: at 0 kills the pressure stays at about one long-range hunter for at least 75 s (escalation is driven by
  kills, not by the clock, in the first 75 s), and something time-driven or the lost fighting time bites by 130 s.
- Board cluster at 4.0-4.25 (most teams kill about the four easy bots and stop); 5.38 is about 4 easy + 1.4 others.
- Every hide-and-heal or pause rule lost officially (ours -0.21, -0.09; others -0.44 to -1.10).

**[S] sensitivity run today** (our bot, seeds 1-48, default house table, only `huntersPerKill` changed;
hunters = 1 + perKill x kills):

| hunters added per kill | 0 | 0.34 | 0.5 | 1 (sim default) | 2 |
|---|---|---|---|---|---|
| score | 9.38 | 6.75 | **5.17** | 4.10 | 3.35 |
| life (s) | 150 | 112 | **95** | 75 | 66 |

Our official level is 5.2-5.4. So "one more hunter per two kills" with the unweakened tiers fits the level exactly
as well as the calibrated table `e2` (weak easy/medium, one per kill, 5.19). The two explanations cannot be
separated by level [N]. Both are kill-driven; the score is very steep in this one number (about 1 point per 0.5).

**[S] what a kill costs in the simulator** (traces, 48 matches each, perKill 1 / 0.5):
- Kill -> first damage from a *new* attacker: median 5.4 / 7.3 s (quartiles 2.3-10.8 / 3.2-14.1).
- Kill -> next damage of any kind: median 3.5 / 4.9 s; a gap of 5 s or more (regeneration actually starts) after
  40% / 49% of kills, 10 s or more (225+ hp back) after only 21% / 27%.
- Time per kill state shrinks 26 s (k=0) -> 15 -> 11 -> 8 -> 6 s; intake per state rises 90 -> 180 -> 235 -> 340 ->
  415 hp; P(death in the state) 0.15, 0.15, 0.26, 0.35, 0.53 for k = 1..5.
- **Damage left in live mechs at our death: median 990 hp, mean 1050 (0.7 of a kill thrown away every match).**

**Pacing verdict**
1. Delay kill 1, not later kills. The only pause with official support is the k=0 window (farm to laser + cubes
   while one easy hunter plinks from 100-150 m) [M].
2. After that never delay a kill. A kill is +1 point for certain; the hunter it summons has to walk in (5-7 s
   median in the sim, 13-35 s from 150-400 m by arithmetic), while the unkilled hunter keeps a line. One-line
   fights cost 221 hp per 0.75 kill, two-line fights 893 hp per 1.04 kill [S].
3. Do not bank damage across several targets as a plan: house bots regenerate 45 hp/s after 5 s without landing or
   taking a hit [M], and we already die with about 1000 hp of unfinished damage [S]. The one sound form of
   "finish together" is the **wipe**: when every hunter with a line is under one beam (315; 472 from behind),
   kill them inside one laser cycle. Only a wipe produces a zero-line lull, and only a zero-line lull regenerates.
4. Waiting for full regeneration between kills is not available: 5 s of silence exists after fewer than half of
   the kills and it lost officially every time. Take the free version only: in a zero-line lull hold the trigger
   on mechs and drones (crates do not reset the clock on the replay build [M, old build]) and walk to the cubes.

## 2. Tiers: which dies cheapest, and telling them apart

- **[D]** No tier statistics exist. The observation carries id, position, velocity, aim, hp, max_hp, cubes,
  weapons, charging: no name and no tier. All tiers have 1400 hp [M replay: expert/hard/medium].
- **[M] replay (FFA, old build, 2-3 mechs per type):** all types use the same exact first-order lead with no aim
  noise and no reaction delay; the tiers differ in range and movement, not aim.

| tier | holds (converted to today's bullet speed) | signature | gun dps on us at that range |
|---|---|---|---|
| medium | closes to 50-85 m, strafes hard (67% of frames), opens distance in 3% of frames | keeps coming | about 51 |
| hard | 65-125 m, slow approach (+2 m/s), shoots crates between fights | walks in strafing | 27-51 |
| expert | 125-180 m, backs off inside about 125 m, airborne 42% of fight time, 7.7 hops/min, shoots the spawn drone in its first 3-6 s | range keeper, hopper | 11-27 |
| easy | not in any recording [N] | first to hunt [D] | unknown |

- **Cheapest per hp we spend [G on M]:** easy (board: nearly every team converts four of them), then expert *if we
  hold a laser* (it stays where its gun is worth 11 dps while a beam is flat to 280 m, and a hopping bot is a
  ballistic target: airborne targets were hit 92% against 57%), then hard, and medium last (it brings 51 dps to
  50-85 m). Gun-only the order of the last three reverses (expert becomes unkillable at range).
- In the simulator the cost per kill barely differs by tier (median 90-160 hp taken from the victim, time to kill
  5.3-7.2 s) [S, tiers are guesses], so the range it holds matters more than its label.
- **Telling tiers apart online (codeable):** (a) hostility order: the first four distinct mechs that turn hostile
  are easy if the squad follows its documented order strictly [D + G]; (b) range response: a mech that opens
  distance when we close inside 125 m, or is airborne more than 35% of 10 s, is expert; one that keeps closing
  inside 85 m is medium; (c) do not use ids: in the replay ids follow the roster list, but the practice mapping
  is unknown and the kit stream's first attacker was id 10 with us in slot 3.

## 3. How a hunter moves, aims, reloads, positions; what it never does

**[M] replay unless marked**
- Gun: first-order intercept from the newest observation, aimed at body centre (z + 4.5), residual equal to the
  0.6 deg weapon spread; airborne targets predicted ballistically. Fires on the first observation with cooldown 0
  (0.30 s cadence today), only with a clear muzzle line (848 of 851 shots), opens fire out to about 200 m.
  12 rounds, then 2.4-2.5 s silent; never reloads early (72 of 72), never staggers.
- Hit rate against grounded targets by bullet flight time: 100% under 0.3 s (75 m today), 86% at 0.3-0.4 s,
  57% at 0.4-0.5 s, 32% at 0.5-0.6 s (126-151 m), about 22% beyond. A reversal or a turn of more than 60 deg during
  the flight: 22-24%; constant velocity: 84%. 52% of misses pass ahead of the target.
- Laser: full charge only; today the torso tracks during the 0.75 s charge and beams come 2.4-2.7 s apart (kit
  stream: 7.9 and 10.6 s; 4 hits in 5 beams on the example bot, 1260 of its 1665 damage). No reaction to our
  charge. Mortar: 40-80 m weapon (42% there, 0 of 8 beyond 130 m), aimed at the ground lead point.
- Movement: 85-89% of walk speed, strafe reversals every 1.1 s (p10 0.4, p90 2.7), a fixed hop (14.9 m apex,
  3.1 s airborne) for about 30% of fight time, torso sweep of +-46 deg with a 4.7 s period while travelling.
- Target runs: median 4 shots / 1.9 s on one target in the FFA; nearest chosen 67%, lowest hp 42% (chance 44%).
- Positions: enters the next circle 33-58 s before the shrink and sits at a median 0.41 of its radius; 7% of time
  in the outer fifth; 2.2% of time on roofs, never above 14 m; walks into a supply ring and stands 4 s.
- **Never:** retreats or hides (below 20% hp still firing in 77% of frames, closing at +0.5 m/s), heals on purpose,
  reloads early, releases a partial beam, adds aim noise, compensates for a reversal, dodges a laser charge,
  collects most death cubes (35 of 53 left), takes roof loot (0 of 10).
- [G] In the squad a non-hunter's behaviour (returns fire? only inside 15 m, as our sim assumes?) is unknown.

## 4. Blind spots and timings

| item | number | tag |
|---|---|---|
| Line opens -> first shot | p10 0.25 s, median 1.15 s, p75 3.05 s; exposures under 0.25 s drew no fire | M (FFA; inflated by tree cover) |
| Reload silence | 2.4 s after the 12th round (3.3 s of fire, then 2.4 s) | M |
| Laser silence | 1.65 s cooldown + 0.75 s charge; the `charging` flag gives 0.75 s warning | M / config |
| Gun falloff | dps on us 51 / 51 / 27 / 11 at 40 / 75 / 110 / 150 m | M |
| Clear-line rule | 99.6% of shots; hard cover removes all incoming | M |
| Vision | 120 deg cone to 200 m + 45 m all round; attacked from outside the cone a bot took a median 189 hp (383 mean) before answering, turned after a median 1.58 s, and only 50% turned within 10 s | config + M (FFA) |
| Shared vision | one member's sighting serves all; the server keeps giving our true position for 5 s after the last sighting, so cover stops bullets, not pursuit. Latency unmeasured; assume zero | D + P, latency G |
| Rear arc | hits from outside the 180 deg front arc x1.5; 27% of death damage in the FFA was rear | M |
| Zone edge | house bots avoid the outer fifth (7% of time) | M (FFA) |

The cone blindness is probably cancelled by shared vision in practice [G]; do not build on it. The reload count,
the falloff, the clear-line rule and the first-shot delay are properties of the single bot and should transfer.

## 5. The three exploits with the most kills in them

**E1. Cash out banked damage (about +0.3 to +0.6; [S] 990 hp unfinished at death).**
- `score(target) = hp_target / (our dps with a line)`; add -200 if hp <= 315 x (1 + 0.04 x our cubes) (one beam),
  -200 if it is the current target within the last 2 s. Never switch off a target under 40% hp for 2 s without a line.
- Release a partial beam as soon as `0.7 x charge damage >= hp_target` (x1.5 from behind, x1.6 on a mortar holder).
- Death clock: when `hp_self < intake_3s x 4 s`, drop every other mode (heal, zone unless outside, loot) and shoot
  the lowest-hp mech with a line; walk in to 20 m if it is under 38%.
- Wipe rule: if all hostiles with a line are under one beam, kill them within one laser cycle (gun on one, beam on
  the other); then hold fire on mechs and drones until a line reappears.

**E2. Geared opening, then one-line fights at 130-160 m (about +0.3 to +0.5; [M] 2696 gate +0.46, [M] falloff).**
- Until `cubes >= 10 or t >= 75 s`: start no fight; answer only a mech that hit us in the last 4 s from inside
  100 m; laser first (boost to a ground laser within 240 m of path).
- After that, with a laser: hold 130-160 m from the nearest hunter; reverse the strafe every 0.45-0.60 s (one
  bullet flight at that range); never jump under fire; keep every hostile inside our front 180 deg.
- Count each hostile's rounds: after its 12th, for 2.4 s stop strafing and close or stand for the beam.
- Staggering: after a kill, if 2 or more hostiles are within 200 m, move along the zone rim (20-40 m inside the
  edge, away from the centroid of known squad positions near 0.41 R) so the next ones arrive singly.

**E3. Supply drop 1 as a second life (about +0.2 to +0.4, high variance; [M] 2696 kept it 15 h, config facts).**
- Call at 70 s, landing at 95 s (then 165 / 235 s): full repair, full energy, 3 cubes, 8 m ring, 4 s.
- From 70 s bias the fight toward the ring; from 88 s DROP outranks FIGHT if the ring is <= 8 s away, inside the
  next circle and `hp > 4 s x intake + 100`; stand within 2 m and keep shooting.
- A house holder stands still for 4 s 2.5 m from the centre: beam it; our mere presence in the ring freezes its
  capture.

## 6. What would settle the unknowns

- In-bot estimate each match: `hunters_now` = distinct mechs that aimed at us within 7 deg with a line, or hit us,
  in the last 8 s. Log-free use: if 10 s after kill k `hunters_now <= 1`, take cubes and crates; if >= 3, apply the
  staggering move. This adapts to whichever schedule is real.
- One submission would separate "perKill 0.5" from "weak easy tier": a build that never shoots before 75 s and then
  fights normally is already close to 2696's; the missing datum is a build that kills as fast as possible from
  20 s. If the real schedule is 1 per kill, early killing costs about 1 point in the sim table above; if the easy
  tier is simply weak, it costs little.
