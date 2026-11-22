# Practice red team: pre-mortem for "we scored 3.9"

Code examined: `bot/` frozen at 06:08 UTC in `tools/redteam/snap/` (still the V2 numbers). Tools and output: `tools/redteam/*.js`, `tools/redteam/out/`. The simulator (`sim/`, same minute) scores the starter 1.20 (official 1.15) and this build 1.7-2.0; no single parameter moved that beyond its error (0.13, 144 seeds). Its counts show mechanisms; they are not a forecast.

## Ranked limitations (probability x points)

| # | Limitation | Est. loss | Evidence | Fix (under 2 h) | Test |
|---|---|---|---|---|---|
| 1 | Gun only against a gun + laser hunter; the laser comes late or never | 0.3-0.6 | Sim: a laser at first damage in 8 of 48 matches, ever in 16. Beam = 131 dps at any range; at 75 m we trade about 87 for 208 dps. Public sim: gun only wins 8% of such duels, 30% with a laser | Dead hunter's weapon is a loot goal out to 130 m at any hp while nobody has a line (`economy.js: chooseLoot` only looks at pickups when quiet and hp >= 90%; D6's 60 m is shorter than D2's 75 m kill range) | `phase_stats.js`: laser within 15 s of a kill whose victim held one >= 80% |
| 2 | Spawn in a ground pocket: no exit, zone death with 0 kills | 0.25-0.45 | 10.5% of standable cells in the spawn disc are pockets; 1 of 17 known real spawns (the replay mech that died to the zone). `pocket_test.js`: from that spawn the brain never leaves and is dead at 171 s. `nav.hopPlan` exists, nothing calls it | `mover.js`: when `nav.component(me) != mainComponent`, run the hop plan at t = 0 (walk to launch, jump, jet to apex, fly to land) | `pocket_test.js`: every start on main ground within 40 s, hp 1400 |
| 3 | "Doomed" rule replaces the D3 retreat | 0.2-0.4 | `hp < A*(tCover+1)` is true at full hp against two laser hunters with cover 40 m away. Sim: LAST-STAND in 48 of 48 matches, entry at median 55% hp, every death in it, 35 of 48 standing on a "bastion" cell (592 hp per match taken there) | Delete `doomed` and clause 1 of `stance.js: enterLS`; never command zero stick while a gun has a line; code the D3 thresholds | `phase_stats.js`: no entry above 25% hp; still-under-fire < 1 s per match |
| 4 | Beams are not defended | 0.2-0.4 | D4's corner step needs a hide cell within 6-9 m: true for 10 of 75 beams taken (13%). Each beam is 22% of our hp, announced 0.4-0.7 s ahead by the flag (trace seed 5: two beams, lost by 95 hp) | `tactics.js: makePosEval`: +80 for a fight cell with a hidden cell within 8 m of every laser holder; time the step to flag + 0.6 s | `gun_bands.js`: hide within 9 m at >= 50% of beams; arena: beams landed per minute halved |
| 5 | Idle opening, thin economy | about 0.3 | 13.7 s per match (17% of life) motionless at full hp with nothing in sight; HOLD 25% of time; 1.0 cube at 60 s; crates only within 80 m and already seen; `farmNpc` is never set, so drones are never farmed | D6 loop in place of the HOLD post: nearest crate <= 150 m, drone <= 170 m, else walk the zone band at full speed with a 360 degree sweep | idle still < 2 s; cubes at 60 s >= 3 |
| 6 | Heal and hide while pursued | 0.2-0.5 | Scripted two-hunter duel: 0 of 6 won; in 3 seeds 765-810 hp were taken in HEAL/hide, 7-11 s motionless. HEAL starts below 90% after 1 s of quiet and lasts to 90% (22 s from 35%) | D3 as written (55% out of contact, exit 70%, shoot back); with a pursuer tracked inside 120 m turn the corner into the existing ambush instead of resting | `two_hunter.js`: under 100 hp taken in HEAL/hide; >= 1 kill in 6 of 6 |
| 7 | Dodge | 0.2-0.4 | `dodge_math.js`, exact-lead gun at 115 m: today's U(0.5,1.0) 0.37 hit; D4's U(0.8,1.6) 0.57; the 5.19 bot's interval 0.38; reversal on a seen bullet with a 0.4 s floor 0.03, with D4's 0.8 s floor 0.34; constant velocity 0.94. `brain.js: relocating` holds one direction for our whole reload against laser holders; charging halves speed (0.64). No bullet code: `bulletsSeen` is unused | D4 dodge with floor 0.4 s (= 2v/a); remove `relocating`; default interval 0.35-1.05 until scored | model table; sim hit rate taken per range band |
| 8 | Fights everyone, walks at idle mechs | 0.2-0.4 | No hostile test, 150 m engage rule, idle pull. Sim: 31% of deaths dealt by squad members that were not hunting | D0 / D5 hostile-only | share of deaths by non-hunters < 10% |
| 9 | Wall-clock behaviour | noise 0.3, mean 0.1-0.2 | Same code and seeds: 5 of 48 matches differ between two idle-machine runs, 10 (6 scores) once a shared-core run is added, 0 with the gates neutralised. Real work peaks at 9 ms, so only scheduler stalls trip them (35 decisions over 15 ms in 16 matches on half a core) | Remove the gates below; fixed budgets | `det_compare.js`: 0 of 48 differ under `taskset -c 0` plus a busy loop |
| 10 | First magazine thrown away | 0.1-0.3 | No D2 gate: 17% of shots beyond 139 m at 39% hits (89% inside 100 m); first magazine opened beyond 139 m in 50 of 96 matches, then 2.4 s of reload as the hunter arrives | D2 gate in `firecontrol.js`; top up the magazine before contact | far-shot share < 3% |
| 11 | "Far" laser band | 0.1-0.3 | Table below | Default `mid`; `far` only when a standable, in-zone cell with a line exists; never back out of a line | regain-leg share, leg flips per minute, far against mid |
| 12 | Two hunters: damage split | 0.1-0.3 | In 4 of 6 lost duels one hunter was left at 365 hp or less; the target index drops to 0.3 after 1 s without a line | D5: stick to a target under 40% hp through 2 s without a line | summed enemy hp left in `two_hunter.js` |
| 13 | False free-for-all latch | 0.05-0.1 | The coded clue counters latched once in 96 squad matches (27 s, one foreign death); the D12 rule never | D12 only; `env: 'squad'` in a practice-only build | `ffa_latch.js`: 0 of 96 |
| 14 | Answer time on one CPU | 0.1-0.4 if it regresses | Half a core: p99.9 25 ms, max 43-75 ms. A late answer drops `fire`, which releases a charging laser early | One heavy job per decision; re-measure every release under `tools/cg1.sh` | p99 < 10 ms, 0 late in 3 runs |
| 15 | Body growth past 10 cubes | 0.05 | Stats cap at 10 cubes, size does not: at 10 cubes the same jink is hit 0.51 instead of 0.37 | Past 10, collect only when an upgrade threshold is within 3 cubes | model row |

Cleared: half speed while charging (5.85 m/s) is above the 1.5 m/s stuck test; 0 stuck events and 0 abandoned goals in 48 matches. Cover search costs at most 2.7 ms. Zone travel alone: no zone damage in phases 4 and 5, 245 hp in the final shrink (`late_zone.js`).

## The match, second by second

- **0-3 s.** In 6-10% of matches we stand in a pocket (row 2). Otherwise the bot loots what it sees, then stands at a wall cell.
- **First contact** (sim median 14 s, no laser in 40 of 48). It opens at up to 223 m, empties a magazine at 125-130 m (3 of 12 hit in the trace) and reloads in the open, in one direction if the hunter holds a laser.
- **Duel.** Range held: median 93 m with the gun and 99 m with a laser (code), neither D2 value. Each beam lands. At about 55% hp the doomed rule ends all retreating.
- **After a kill.** Cubes are fetched; the laser on the ground is not. HEAL to 90% with fire held; the next hunter walks round the corner and shoots a creeping target.
- **Second and third hunters.** Two or more attackers within 5 s in 41 of 48 matches and at 28 of 48 deaths.
- **Zone.** Sound alone; with R <= 140 the far band no longer fits.

## Sight lines on the real map (`map_sight.js`, 800 points per phase)

Share of directions in which a mech at distance d is standable, inside the circle and in line both ways:

| Zone radius | 75 m | 115 m | 150 m | line at 95 m kept to 150 m | 150 m from a hunter at 0.41 R stays inside 0.8 R |
|---|---|---|---|---|---|
| 560 | 0.50 | 0.36 | 0.28 | 0.64 | 1.00 |
| 380 | 0.44 | 0.30 | 0.22 | 0.60 | 0.93 |
| 240 | 0.40 | 0.25 | 0.17 | 0.51 | 0.55 |
| 140 | 0.30 | 0.16 | 0.08 | 0.36 | 0.22 |
| 70 | 0.16 | 0.03 | 0 | 0 | 0 |

From 195 s the far band is available less than half as often as 75 m, and backing from a 95 m line to 150 m loses it in 36-64% of cases: the bot will alternate between "back away" and "regain the line".

## Wall-clock uses that change behaviour

`bot.js: decide` (deadline 27.5 ms); `brain.js: act` (deadline), `evalMaybe` (skipped under 6 ms left), hide search (needs 4 ms left), `slowMs` (a decision over 15 ms halves ray and path budgets for 20 decisions); `mover.js: moveTo` and `zoneCheck` (no path plan under 12 ms left); `stance.js: ambushUpdate` (same). `brain.js: warmUp` stops at 1.2 s (compilation only).

## Dodge arithmetic

A full reversal takes 0.40 s; we are 2.8 m (body + bullet) off the predicted point 0.31 s after it starts (0.34 s while charging, 0.37 s at 10 cubes). A bullet is listed 0.05-0.10 s after it leaves, so reacting to it works only beyond 91-103 m. At 75 m no policy gets below 0.56. D4's extra reversal at magazine start changes nothing in the model (0.56 against 0.57). The one measurement behind "never faster than 0.8 s" comes from a bot whose identical code scored 3.67-3.90.

## Opportunities, by gain per hour

1. **Reversal on the seen bullet, 0.4 s floor** (1.5 h): 0.01-0.27 hit at 95-130 m against 0.31-0.50 today. Test: model, per-band hits taken in the simulator, one submission.
2. **Kill-drop laser** (0.5 h): row 1.
3. **Flag-timed corner step** (2-3 h): the charge flag gives 0.75 s; be hidden from 0.6 to 0.95 s after it appears. Denies 131 of about 170 dps. Test: arena hunter that releases at full charge with a line.
4. **Charge behind the corner, step out, release, step back** (3 h): about 0.4 s exposed per 315 hp, below the house median of 1.15 s from open line to first shot. Risk: passive cover play lost 0.71 and 0.94; this variant keeps firing. Test: damage dealt and taken per hunter against open strafing.
5. **Ballistic lead on hoppers** (1 h): airborne a third of fight time; the code ignores gravity.
6. **Expose only in their silence** (1.5 h): count 12 bullets per shooter, then cross open ground, close or fetch the laser during the 2.5 s.
7. **Stagger the hunters** (2 h): after a kill move 150 m along cover away from the squad's centroid, so the next two arrive apart. Test: share of time with two attackers.
