# Structural line: roof sanctuary prototype and simulator evaluation (Fable panel, structural engineer)

Written Sun 22 Nov, about 01:40-02:15 UTC. Design under test: `notes/fable/sim/structural.md` rank 1 (roof sanctuary).
Tags: [S] simulator (mechanism only; it has had official signs wrong six times), [G] geometry from the map files,
[A] arithmetic, [N] no evidence. Nothing here is an official result.

## 0. Verdict

1. **The prototype works mechanically and is byte-identical when off, but in the simulator it does not raise kills.**
   Best variants: `duel` 0.00 +- 0.09 and `heal` -0.10 +- 0.13 kills per match (paired, 48 seeds, base 4.02).
   Going up early and fighting from the roof (`hold`, `holdduel`) loses a full kill: -0.96 +- 0.29 and -1.00 +- 0.25.
2. **What it does buy is time and hull, not kills.** Time alive +8 s (`heal`) to +28 s (`holdduel`) on a 71 s base;
   hp spent 1.42-1.48 lives against 1.33. In the 12 matches where `heal` reached a roof it regained 624 hp
   (0.45 of a life) and lived 109 s against 76 s, and still made 3.67 kills against 4.00.
3. **Two reasons the hp does not convert [S].** (a) The roof is not silent: the simulator's hunters keep 1.5 lines on
   us at the best hiding point of the roof (from under 60 m, 60-110 m and beyond in equal thirds), so we take 43 hp
   for every 100 regained. (b) The pause lets the squad mass: deaths with 5 or more lines rise from 9 to 12-13 of 48.
   The strategist's 5.4 x 1.65 = 8.9 assumed a constant exchange ratio; here the ratio falls from 3.63 to 3.5.
4. **Ceiling even if the official squad never gets a line on a roof [A on S].** `heal` reaches a roof in 25% of
   matches (12 of 48) and regains 0.45 of a life there: +0.11 life per match, about +0.35-0.6 kills per match at
   3-5.4 kills per life. The goal needs +3.6. This line is not a route to 9.
5. **Official slot: no**, not for the target of 9 and not as built (section 6 lists the open defects). The one
   unknown the simulator cannot answer [N] is whether official hunters get lines on a roof; if a spare slot is
   ever used to answer it, the preset to send is `duel` (never `hold` / `holdduel`).

## 1. What was built

- Tree: `scratchpad/fable_work/struct/tree` = `r7work/ckpt_07_LG` + the FNV_s1 `params.js` (the 5.38 SELECT, salt 1)
  + the preset. Changes against `variants6/FNV_s1/bot`: new `lib/sanctuary.js` (423 lines), `lib/brain.js` +5 lines
  (import, construct only when the preset is on, `sanc.update()` after `decideMode`, `sanc.legs()` after the shell
  dodge), `lib/params.js` +9 lines (constant `SANC`, preset `sanc`, `sanc: 'off'` in SELECT). Nothing else touched.
- Preset `sanc` (SELECT default `off`):

  | name | behaviour |
  |---|---|
  | `off` | today; `lib/sanctuary.js` is neither built nor called |
  | `heal` | at hp < 55% with a perch launch cell within 90 m: climb, hide and hold fire until hp >= 90%, drop on the target's side |
  | `heal40`, `heal70`, `healq`, `healw`, `healc` | `heal` with enter 40% / enter 70% and reach 120 m / leave at 75% / reach 150 m and looser roof quality / fixed centre instead of the hiding point |
  | `healedge` | `heal`, then fight from the roof edge (ray from the centre to the target) until hp < 50%, hide again |
  | `duel` | `healedge` with the duel point: the roof point with a shot at one hunter and the fewest other lines |
  | `hold`, `holdduel`, `holdx`, `holdc` | also climb whenever unengaged from t = 2 s (perch within 260 m) and stay up; `holdduel` uses the duel point |

- Gates: SQUAD posture and `hunt.firewall()` on every decision (the firewall ending takes us down); never in ZONE
  mode, last stand or with a zone-urgent flag; the perch must be 14 m inside the next and the current circle; we
  leave 12 s before a shrink that excludes the perch. An arrival test (`hp - B.A x (walk + climb time)` must leave
  8% of the hull) stops hopeless walks.
- Everything is computed from the map and `hello.config` at brain creation, no map constants [G]: nav-grid scan of
  `surfaceZ / surfacePrism`; roof = prism top at least 1.15 x the house hop above terrain (jump apex + 1.5 s of
  jet from config = 17.0 m here); setback by a chamfer distance to the nearest cell more than `step_up` different;
  launch cells = main-component cells 4-8 m outside an edge cell with nothing higher than the roof in between, one
  per 22.5 degree sector; exposure of the centre from 80 ground points on five rings; two lattices of roof points
  (hiding, duel). This map: 32 perches, 5 with near exposure 0.00, 10 with <= 0.10. Roofs with near exposure > 0.2
  or total exposure > 0.3 are not used.
- Geometry correction to the design note [G]: a centre hides the chest only from shooters closer than
  `setback x (H - 7) / 4.5` m. That is 20 m for the minimum roof (setback 9 m, H 17 m) and 54-74 m on the six
  best roofs, so most of the 35 "perches" of the design note are not sanctuaries. The prototype therefore hides at
  the roof point that the fewest known hunters have a line to (24 points, 5 nearest hunters), not at the centre.
  In the 6-seed checks that change moved hp taken on the roof from 0.92 to 0.28 per hp regained (0.43 over 48 seeds).

## 2. Method

- Simulator copies: `fable_work/struct/simx` (bot -> the tree) and `simb` (bot -> `variants6/FNV_s1/bot`), each with
  its own copy of `mechbot/sim`; `sim/run.js` in the copies records the brain's counters, lines at death and the
  sanctuary statistics. Squad mode, seeds 1-48, salt 1, one job per arm, at most 3 arms at once, `nice -n 19`.
- The machine ran at load 27-30 for the whole session, which trips the 30 ms wall-clock fuse and makes runs
  non-deterministic (seed 3 differed between two runs of the same bot). Every arm, the base included, therefore ran
  with `fuseMs: 1e9` (`--overrides`): **0 fuse trips in every batch**, runs repeat exactly. `lates` and `maxMs` in
  the raw files are wall-clock under that load and mean nothing (the base shows the same values).
- Identity: `sanc: off` in the tree against FNV_s1, 48 seeds, 19 fields per match (kills, time, damage, cause,
  killer, loadout, counters, last mode): **0 differing matches**.
- A first round of batches (`out/heal48.json` and five others without the `r2_` prefix) is **discarded**: perch
  "bad until" times lived in the table shared by all brains of a process and leaked between matches. Fixed (per
  brain); all numbers below are from the `r2_` files. The base and the `off` run are unaffected.
- Files: `fable_work/struct/out/B48.json` (base), `out/r2_<preset>.json`, `ov/<preset>.json`, `run.sh`, `cmp.py`.

## 3. Results [S], 48 paired seeds, base = FNV_s1 (kills 4.02 +- 0.30, alive 71.0 s, dealt / taken 3.63)

| preset | kills | d kills (se) | W / T / L | d alive s (se) | d dealt (se) | d taken (se) | dealt / taken | hp spent / 1400 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `off` | 4.02 | 0 (identical) | 0 / 48 / 0 | 0 | 0 | 0 | 3.63 | 1.33 |
| `duel` | 4.02 | 0.00 (0.09) | 4 / 39 / 5 | +14.4 (5.3) | +473 (210) | +209 (97) | 3.49 | 1.48 |
| `healedge` | 4.00 | -0.02 (0.14) | 3 / 40 / 5 | +11.1 (3.9) | +346 (212) | +153 (67) | 3.53 | 1.44 |
| `heal` | 3.92 | -0.10 (0.13) | 2 / 40 / 6 | +8.1 (3.4) | +186 (194) | +123 (63) | 3.50 | 1.42 |
| `healw` | 3.92 | -0.10 (0.13) | 2 / 40 / 6 | +8.2 (3.4) | +169 (195) | +137 (65) | 3.47 | 1.43 |
| `healq` | 3.90 | -0.13 (0.12) | 2 / 40 / 6 | +6.7 (3.1) | +175 (188) | +98 (59) | 3.54 | 1.40 |
| `heal70` | 3.81 | -0.21 (0.12) | 5 / 31 / 12 | +7.0 (2.4) | +137 (185) | +98 (65) | 3.52 | 1.40 |
| `hold` | 3.06 | -0.96 (0.29) | 8 / 18 / 22 | +17.3 (5.3) | -621 (422) | +126 (76) | 3.09 | 1.42 |
| `holdduel` | 3.02 | -1.00 (0.25) | 6 / 16 / 26 | +27.9 (6.3) | +84 (379) | +120 (83) | 3.46 | 1.42 |

Deaths by number of attackers with a line at death (0 / 1 / 2 / 3 / 4 / 5+), causes, and failures:

| preset | lines at death | gun / laser / lightning / mortar / npc | zone deaths | errors | fuse | stuck | abandons |
|---|---|---|---:|---:|---:|---:|---:|
| base | 0 / 5 / 13 / 11 / 10 / 9 | 31 / 9 / 8 / 0 / 0 | 0 | 0 | 0 | 1 | 9 |
| `heal` | 0 / 6 / 13 / 7 / 10 / 12 | 28 / 9 / 9 / 2 / 0 | 0 | 0 | 0 | 60 | 12 |
| `duel` | 0 / 6 / 12 / 8 / 9 / 13 | 29 / 8 / 10 / 1 / 0 | 0 | 0 | 0 | 78 | 11 |
| `healedge` | 0 / 6 / 13 / 7 / 12 / 10 | 30 / 9 / 8 / 1 / 0 | 0 | 0 | 0 | 65 | 10 |
| `heal70` | 0 / 8 / 11 / 7 / 8 / 14 | 32 / 7 / 7 / 1 / 1 | 0 | 0 | 0 | 18 | 11 |
| `hold` | 0 / 7 / 13 / 8 / 8 / 12 | 23 / 7 / 17 / 1 / 0 | 0 | 0 | 0 | 55 | 22 |
| `holdduel` | 0 / 5 / 10 / 9 / 10 / 14 | 27 / 4 / 17 / 0 / 0 | 0 | 0 | 0 | 75 | 41 |

No brain-stage errors, no fallback, no zone deaths and nobody alive at the end in any arm.

Sanctuary mechanics (per 48 matches unless stated):

| preset | matches that tried / got up | climbs ok / tried | died walking / climbing / on top | top s per match (edge) | healed / hurt on top, hp per match | lines per decision: hiding / edge |
|---|---:|---:|---:|---:|---:|---:|
| `heal` | 17 / 12 | 13 / 18 | 2 / 2 / 3 | 7.5 (0) | 156 / 67 | 1.55 / - |
| `duel` | 17 / 12 | 12 / 17 | 2 / 2 / 6 | 15.6 (4.1) | 262 / 257 | 1.62 / 2.66 |
| `healedge` | 17 / 12 | 12 / 18 | 3 / 2 / 6 | 11.2 (2.2) | 183 / 125 | 1.76 / 2.51 |
| `heal70` | 29 / 19 | 22 / 36 | 4 / 5 / 2 | 6.9 (0) | 195 / 73 | 1.23 / - |
| `hold` | 41 / 32 | 47 / 64 | 3 / 1 / 8 | 29.3 (19.3) | 249 / 385 | 1.87 / 2.22 |
| `holdduel` | 41 / 32 | 42 / 57 | 4 / 0 / 9 | 42.9 (31.3) | 287 / 540 | 1.93 / 2.22 |

- The climb itself is reliable: 1 failed jet climb in each arm (the design note's probe failed 5 of 24); the
  other missing climbs are deaths on the way and aborted walks.
- Matches that reached a roof, against the base in the same seeds: `heal` n = 12, kills 3.67 against 4.00
  (d -0.33 +- 0.54), alive 109 s against 76 s, regained 624 hp, took 267 hp on the roof, arrived at 27% hp at
  63 s. `duel` n = 12, kills 4.08 against 4.00 (d +0.08 +- 0.36), alive 134 s against 76 s, regained 1049 hp, took
  1028 hp on the roof. Lines at death in those 12 matches: median 3.5 (`heal`) and 4.5 (`duel`) against 3.
- Matches that never tried or never got up: d kills -0.03 (`heal`), -0.69 +- 0.33 (`hold`: the walk to a perch at
  the start costs loot and the first fights).
- Who has the lines while we hide (`heal`, decisions with a line): on another roof 3%, ground under 60 m 30%,
  60-110 m 33%, beyond 110 m 34%.

## 4. Decision time

- At brain creation: the perch table took 330-860 ms here (once per process, cached per map; the hello budget is
  20 s and the rehearsal already takes 1.1 s).
- Per decision, CPU time of the sanctuary code (`update` + `legs`, including the one path plan the mover makes for
  it), measured with `process.cpuUsage` because wall time is useless at load 27: **worst 13.6 ms**, 56-60 ms summed
  over a whole match (`healw`, `healq`, 48 matches each). Bench of the parts (`bench.mjs`): hiding point worst
  1.5 ms; the edge-ray search is bounded to 3 hunters; the duel point (48 points x 5 hunters, one cast each) was not
  benched separately and is inside the 13.6 ms only through the `heal` family's shared code, so time `duel` before any use.
  The 13.6 ms is the A* plan to the launch cell, the same cost class as today's hide and zone plans; the base
  decision averages 1.3 ms. Inside the 50 ms tick, but it was not measured on a quiet machine.

## 5. What the numbers say about the design

1. **hp budget does rise, as predicted** (1.33 -> 1.42-1.48 lives), and time alive rises 11-39%.
2. **The exchange ratio does not hold**: 3.63 -> 3.47-3.54 for the heal family and 3.09 for `hold`. Extra damage is
   dealt (+473 +- 210 for `duel`) but spread over hunters that regenerate; kills stay flat.
3. **Fighting from the roof is worse than fighting on the ground** in this simulator: 2.2-2.7 lines on us at the
   edge against the base's 2-3 at death, long ranges (about two thirds of the edge lines come from beyond 110 m) where our gun finishes
   nobody, wall-huggers that cannot be shot at all (pitch limit), and lightning deaths double in `hold` (17
   against 8) when we come down among them.
4. **Caveat [N]**: the simulator's hunters are our own stand-ins. They seek a line and stop where they have one,
   which is exactly the behaviour that defeats a roof. If the official squad walks to our position and stands
   under the wall, the roof would be silent and points 2-3 change; the ceiling in verdict 4 still applies.

## 6. Open defects of the prototype (not release quality)

- `stuck` counter 55-78 per 48 matches against 1: the mover's stuck sidestep fires while we stand or creep on a
  roof (it cannot see roofs); one match stood 126 s on a roof under fire without leaving (seed 18).
- No strafing or bullet dodge on the roof; `duel` and `hold` stand still at their point.
- A climb is 2.2 s airborne with no evasive option: 2-5 deaths per 48 during the climb.
- The nav grid does not contain roofs, so hide search, position evaluation and the zone path estimate run with a
  position they cannot place (no errors were raised in 9 x 48 matches; the zone estimate falls back to its
  conservative constant).
- Not run: the conformance suite, FFA matches, other maps, a quiet-machine timing, `dist` packaging.

## 7. Recommendation

- Do not spend an official slot on this line for the target of 9. Best simulator reading 0.00 +- 0.09; ceiling
  under the most favourable official behaviour about +0.35-0.6 kills per match; the defects above would have to be
  fixed and the release gate run first.
- If a slot is ever used only to learn whether official hunters get lines on a roof, send `duel`; read time alive
  and damage taken on the result page as well as the score. Never send `hold` or `holdduel`.
- The finding that carries over to other structural ideas: **any pause lets the squad mass** (5+ lines at death
  9 -> 12-13 of 48). A strategy for 9 has to raise damage per hp lost while the fight continues, not buy pauses.

## Critic

Structural critic, Sun 22 Nov about 02:10-02:25 UTC. Files: `scratchpad/fable_work/struct/crit/` (`run.sh`,
`dstream.mjs`, `c_*.json`, `c_*.txt`). Same tags as above. All batches `nice -n 19`, at most 3 jobs, `fuseMs: 1e9`
(load 21-26), 0 fuse trips, 0 errors in every batch.

**Verdict: FAIL. Not worth an official slot for the target of 9.** The engineer's conclusion survives every attempt
to refute it, and the fresh seeds read slightly worse than his.

1. **Rerun on 48 different seeds (101-148, squad, salt 1, paired with FNV_s1) [S].** Base 4.08 +- 0.33 kills,
   alive 75.6 s, dealt / taken 3.43.

   | preset | d kills (se) | W / T / L | d alive s (se) | dealt / taken | reached a roof: n, d kills | died walk / climb / top |
   |---|---:|---:|---:|---:|---|---|
   | `duel` | -0.19 (0.15) | 3 / 37 / 8 | +4.9 (2.6) | 3.26 | 14, -0.50 (0.48) | 2 / 5 / 8 |
   | `heal` | -0.15 (0.14) | 3 / 39 / 6 | +4.7 (2.6) | 3.25 | 14, -0.36 (0.48) | 2 / 5 / 4 |

   Pooled with seeds 1-48: `duel` -0.09 +- 0.09, `heal` -0.12 +- 0.10 over 96 seeds. No sign of a gain; the upper
   two-sigma bound is about +0.1 kills per match against a need of +3.6. On these seeds the roof costs more than it
   gives: healed 107-111 hp per match, hurt on top 88-141 hp, 1.95-2.04 lines per hiding decision (engineer: 1.55-1.62),
   57% of them from beyond 110 m. Five deaths in the 2.2 s climb in each arm.
2. **Identity with the preset off: holds.** Source diff against `variants6/FNV_s1/bot` is exactly the 3 files claimed
   (brain.js 4 lines, params.js, new sanctuary.js). Kit stream (300 decisions) and `release_gate/long4800` (4800
   decisions): 0 differing answers. Simulator seeds 101-106: all match fields identical except the wall-clock ones.
3. **Forced FFA posture: inert.** `env: 'ffa'` with `holdduel` and with `heal70`: kit stream and long4800 0 differing
   answers; 6 simulator FFA matches (201-206) identical to the base, 0 tries.
   **But under the automatic posture the `hold` family is not FFA-inert**: before the FFA latch the firewall is open,
   and `holdduel` changed 4 of 6 simulator FFA matches (seed 204: 7 kills -> 2; seed 206: 1st -> 2nd) and 117 of 300
   kit-stream answers. `duel` changed 0 of 6 (it needs hp < 55% inside the firewall). `hold` / `holdduel` must never ship.
4. **Decision time.** Sanctuary code worst CPU per decision 20.6 ms (`duel`) and 13.5 ms (`heal`) on a machine at load
   21-26; the whole base decision peaks at 12-13 ms CPU on the kit streams. Sum near the 30 ms fuse; not measured on
   a quiet machine, so this is a release risk, not a pass. Table build 1.6-2.7 s under load (hello budget 20 s).
5. **How the official squad could differ from the simulator's, and which way it cuts.**
   - Stand-off range [R, A]: replay house bots fight at 43 / 90 / 152 m (p10 / p50 / p90). A roof centre hides the
     chest only from shooters closer than setback x (H - 7) / 4.5 = 20-74 m. At the official median range no roof
     on this map hides us. This supports the simulator's "roof is not silent", it does not rescue the design.
   - Hop [R, A]: the house hop lifts the muzzle to 7 + 14.9 = 21.9 m, above every perch lower than about 22 m, and
     replay bots are airborne 32% of engaged time. The engineer's exposure table uses ground shooters only.
   - Lasers and mortars from range [R]: laser reach 280 m, mortar to 182 m, and we stand still on the roof (no
     strafe, no dodge). A stationary target is the best case for both. Unfavourable.
   - Shared vision [N]: the simulator forgets a sighting after 6 s; an official squad that never forgets keeps
     massing while we heal (5+ lines at death already rise in the simulator). Unfavourable.
   - The only favourable case is hunters that walk under the wall and stop there. The replay's range data speak
     against it, and even then the engineer's ceiling (+0.35-0.6) stands: a roof is reached in 25-29% of matches.
   - The stadium replay bot is not evidence for this design: it was never hunted (nobody within 70 m), in a
     free-for-all, on the old build.
6. **What would change the verdict:** nothing measured here. A `duel` probe would answer one question about official
   line-of-sight but cannot reach 9 by the ceiling arithmetic; a slot is better spent elsewhere.

Prototype tree: `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/struct/tree`
