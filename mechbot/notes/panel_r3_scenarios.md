# Panel R3: scenario planner (alive count x circle x hp/cubes), both environments

Written Sat 21 Nov, about 17:00 UTC, for the next submission. Read-only on `bot/`, `sim/`, `intel/`.
Scripts and raw outputs: `tools/panel_r3/` (`zone_table.py`, `collapse.py`, `outside_budget.py`, `trace_zone.py`,
`*_out.txt`, sim runs `sq8.json`, `weak6.json`, `ffa4.json`, traces in `trace/`). All arithmetic uses the live config
(`notes/hello_example.json`). Evidence tags as in Doctrine V4: [M] measured on the official scorer, [R] recorded
matches, [A] our arithmetic / model, [N] no measurement. The simulator was used only for sanity (cores 2-3, 19 matches).

## 0. Headlines

1. **The circle decides the range, not the preset.** With a hunter at 0.41 R (where house bots sit) and us 15 m inside
   the edge, the largest separation is 1.41 R - 15: 323 m at R 240, **182 m at R 140, 84 m at R 70, 20 m at R 25**.
   Our laser band (125-185 m) cannot exist from the 140 m circle on (265 s+). Clamp the band to the circle (rule Z1).
2. **Zone damage is cheap early and lethal late.** Per second outside: 20 / 35 / 60 / 100 / 160 / 260 hp. In a fight
   (regen already blocked) a step outside pays whenever it breaks one gun line inside 126 m at dps <= 35, inside 100 m
   at 60, two lines at 100; never at 160-260. Out of a fight it also costs the regen: 45 x (s + 5): 3 s outside at
   20 dps = 420 hp of lost healing. Never leave the zone to heal, never while healing.
3. **Simultaneous lines kill us, not single hunters.** Fluid model (house gun + laser, our laser + gun, we dodge):
   1v1 we win at every range and cube count with a laser; two lines at once we lose with 0 cubes (0 kills) and trade
   1 kill for death with 6; three lines = 0-1 kills even with 10 cubes + plating. Serialising lines is worth more than
   any range or threshold tweak.
4. **The collapse is an hp race with a position term.** After 415 s everybody takes 260 hp/s; death order is
   E = hp - 260 x (seconds earlier we left the circle). Standing 2.5 m off the final point costs 650 hp (static
   centre); with the centre moving (rho = 0.67) 389 hp on the old-centre side, 1,970 on the far side. Armor counts
   for nothing here; cubes (to 10) and plating are the only hp levers (1,400 -> 2,981).
5. **Practice: the collapse is a tie-break, not a plan.** The last house bots hunt us at under 50 m, so we must win
   the fight anyway. Alive at 375 s it pays only with 1 house bot left (any cubes, laser) or 2 left with >= 6 cubes,
   laser, >= 80% hp. With 3+ left the model gives 0-1 more kills: maximise kills, do not play for 415 s.
6. **Final (FFA): the 2-alive cell is the common endgame and it is decided by max hp.** Recorded showdowns end at
   135-327 s; one of seven reached the 70 m circle [R]. With 2 alive and 100-250 s to the collapse both mechs can
   heal to full, so compare max hp (cubes, plating): ahead -> wait and hold the point; behind -> close the gap with
   cubes / plating, then attack only on our terms. Sim trace seed 412 shows the failure mode (section 7).

## 1. Zone arithmetic (config)

| Phase | hold | shrink | R now -> next | dps out | edge speed (radius / worst with centre) | worst cross (walk / boost) | hp per m outside (walk / boost) |
|---|---|---|---|---|---|---|---|
| 0 | 0-60 | 60-110 | 560 -> 380 | 20 | 3.6 / 7.2 m/s | 360 m: 31 / 18 s | 1.7 / 1.0 |
| 1 | 110-155 | 155-195 | 380 -> 240 | 35 | 3.5 / 7.0 | 280 m: 24 / 14 s | 3.0 / 1.8 |
| 2 | 195-230 | 230-265 | 240 -> 140 | 60 | 2.9 / 5.7 | 200 m: 17 / 10 s | 5.1 / 3.1 |
| 3 | 265-295 | 295-325 | 140 -> 70 | 100 | 2.3 / 4.7 | 140 m: 12 / 7 s | 8.5 / 5.1 |
| 4 | 325-350 | 350-375 | 70 -> 25 | 160 | 1.8 / 3.6 | 90 m: 7.7 / 4.6 s | 13.7 / 8.2 |
| 5 | 375-390 | 390-415 | 25 -> 0 | 260 | 1.0 / 2.0 | 50 m: 4.3 / 2.6 s | 22.2 / 13.3 |

Notes. The dps of a phase applies through its hold and its shrink (the 260 of phase 5 already from 375 s). We walk
11.7 m/s, so the edge never catches a walking mech; a charging mech walks 5.85 m/s, slower than the worst-case edge
in phases 0-1 (7.0-7.2 m/s): do not start a full charge with under 5 m of slack during those shrinks. Supply drops
land at 95, 165, 235 s inside the circle being shrunk to (radius 380, 240, 140).

**Band fit** (largest separation to a mech at f R from the centre, us m metres inside the edge = f R + R - m):

| R | mech at centre (m 15) | at 0.41 R (house hold point) | at 0.8 R |
|---|---|---|---|
| 240 | 225 | 323 | 417 |
| 140 | 125 | 182 | 237 |
| 70 | 55 | 84 | 111 |
| 25 | 10 | 20 | 30 |

So: far band (150) fits until the 240 m circle; the mid band (115) is the most that fits the 140 m circle against a
mech near the centre; at 70 m the gun band (75) is the ceiling; at 25 m everything is inside lightning range (45 m).

**Excursion cost** (hp; first number in a fight, second when we would otherwise be healing):

| dps | 3 s | 5 s | 10 s | 15 s | seconds for 300 hp |
|---|---|---|---|---|---|
| 20 | 60 / 420 | 100 / 550 | 200 / 875 | 300 / 1200 | 15 |
| 35 | 105 / 465 | 175 / 625 | 350 / 1025 | 525 / 1425 | 8.6 |
| 60 | 180 / 540 | 300 / 750 | 600 / 1275 | 900 / 1800 | 5 |
| 100 | 300 / 660 | 500 / 950 | 1000 / 1675 | 1500 / 2400 | 3 |
| 160 | 480 / 840 | 800 / 1250 | 1600 / 2275 | - | 1.9 |
| 260 | 780 / 1140 | 1300 / 1750 | - | - | 1.2 |

## 2. Fight arithmetic (why lines matter more than range)

Model (`collapse.py` section 3; [A], crude, use for ordering only). House: gun 93 dps at 100% hits (12 shots / 5.8 s),
hit rate <75 m 100%, 75-100 86%, 100-126 57%, 126-151 32%, x0.55 beyond 75 m when we dodge; no gun while its laser
charges; laser 315 / 2.7 s at 55% accuracy. Us: laser 131 dps (85% <100 m, 70% beyond), gun 102 dps held (90 / 65 / 45%
by range, 0 beyond the 0.55 s flight gate), gun idle while charging, cubes x(1 + 0.04 c). We focus one at a time; every
enemy with a line fires. Cells: kills / our hp left / seconds.

| Us | range | 1 line | 2 lines | 3 lines | 4 lines |
|---|---|---|---|---|---|
| gun only, 0 cubes | 90 m | 0 / 0 / 15 | 0 | 0 | 0 |
| laser, 0 cubes | 90 m | 1 / 543 / 9 | 0 / 0 / 7 | 0 | 0 |
| laser, 0 cubes | 150 m | 1 / 237 / 15 | 0 | 0 | 0 |
| laser, 6 cubes | 90 m | 1 / 1044 / 7 | 1 / 0 / 11 | 0 | 0 |
| laser, 10 cubes + 1 plating | 40 m | 1 / 1500 / 6 | 1 / 0 / 11 | 0 / 0 / 6 | 0 |
| laser, 10 cubes + 1 plating | 90 m | 1 / 1642 / 6 | 2 / 417 / 13 | 1 / 0 / 9 | 0 |
| laser, 10 cubes + 1 plating | 120 m | 1 / 1561 / 8 | 2 / 175 / 16 | 1 / 0 / 9 | 0 |

Readings. (a) A laser turns a lost 1v1 into a won one (agrees with the public 8% vs 30% duel numbers). (b) The second
simultaneous line is the killer at every cube count; D3's "2 threats and hp < 50%" retreats too late for a 0-5 cube
bot (it loses that fight from full hp in the model). (c) 90-120 m is the sweet spot when several lines exist (house
guns drop from 100% to 57-86%, our beam does not care); at 150 m our gun is gated and the trade worsens.
(d) Serialised (one line at a time, no regen between), 0 / 6 / 10+1 cubes give 1 / 2 / 3 kills in a row; with the 45
hp/s regen in 20 s gaps the chain is unbounded. That is the practice score.

## 3. The collapse (who dies first)

| Cubes | plating 0 | 1 | 2 | 3 (hp / seconds alive after 415 s) |
|---|---|---|---|---|
| 0 | 1400 / 5.4 | 1610 / 6.2 | 1851 / 7.1 | 2129 / 8.2 |
| 3 | 1568 / 6.0 | 1803 / 6.9 | 2074 / 8.0 | 2385 / 9.2 |
| 6 | 1736 / 6.7 | 1996 / 7.7 | 2296 / 8.8 | 2640 / 10.2 |
| 10 | 1960 / 7.5 | 2254 / 8.7 | 2592 / 10.0 | 2981 / 11.5 |

- Order of death = E = hp - 260 x (415 - our exit time). In the final shrink (390-415) the radius is 415 - t and the
  centre moves from c5 (centre of the 25 m circle) to c6 (`next_center`) at rho m/s (rho = |c5 - c6| / 25 <= 1).
  Cost of standing d metres off c6 (`zone_table.py`): rho 0: 260 hp per metre either way; rho 0.33: 196 toward c5 /
  388 away; rho 0.67: 156 / 788; rho 0.9: 137 toward c5, and 2.5 m on the far side is already outside at 390 s.
  **If pushed off the point, be on the c5 side.**
- Bodies do not overlap: a second mech is pushed to r1 + r2 = 5-7.5 m (2.5 m x (1 + 0.05 cubes) each); both pushing
  end about half that each. Holding the point first and standing still is what pays.
- Armor (`-8%` weapon damage) is worth nothing in the race; plating is +15% of max hp and the only defensive pick
  that counts here. Cubes above 10 add nothing to hp (size only).
- Examples (`collapse.py` section 2): us 10c+1p on the point at 60% (1,352) vs a full 0-cube house bot 6 m off
  (E -160): we outlast it by 5.8 s. Us 0 cubes full on the point vs a 3-cube house bot, both pushed to 3 m: they
  outlast us by 0.6 s. Peer finalist 10c+1p full vs us 10c+2p at 80%, both 3 m off: they win by 0.7 s.
- From 405 s shooting matters only through E: hit the mech whose E is just above ours (our 150-250 dps against its
  E closes the gap in seconds); if we are on top, shoot whoever damages us.

## 4. When to step outside the circle (break-even)

| Use | Gain | Break-even seconds outside at 20 / 35 / 60 / 100 / 160 / 260 dps | Budget we allow |
|---|---|---|---|
| Flank a mech hugging the edge, facing inward (FFA) | rear opening beam 472 + ~0.8 s unanswered + 4 rear rounds: ~740 hp swing | 37 / 21 / 12 / 7 / 4.6 / 2.8 | one third: 12 / 7 / 4 / 2 / 0 / 0 s |
| Break a line we cannot break inside (no hide cell within 3 s) | that shooter's dps: 93 (<75 m), 80 (75-100), 53 (100-126) | pays for 1 line <126 m at 20-35; 1 line <100 m at 60; 2 lines at 100; 2 lines <75 m at 160; never in practice at 260 | same caps |
| Finish a fleeing target outside (it takes the zone too) | the kill (cubes, a place) | 600 hp target, our 150 dps: 3.5 / 3.2 / 2.9 / 2.4 / 1.9 / 1.5 s | if its hp <= (our dps + zone dps) x cap |
| Rotate along the outside arc past a crowd (100 m) | avoids crossing lines inside | costs 171 / 299 / 513 / 855 / 1368 / 2222 hp walking (103 / 179 / 308 / 513 / 821 / 1333 boosting) | phases 0-1 only, <= 15% of hp |

Budget rule: s_out <= min(cap[dps], 0.15 x hp / dps), caps 12 / 7 / 4 / 2 / 0 / 0 s; only in a fight (regen already
blocked); the return path is planned before leaving (`timeUntilOutside`, path time x 1.3); never during HEAL; never
if hp - dps x (s_out + return time) < 35% of max hp. In practice the outside is also the only place with no house bot
(7% of their time is in the outer fifth [R]): a LOSING retreat outward-tangential meets no new hunter.

## 5. Decision table: PRACTICE (SQUAD; k = house bots left = alive - 1; score = 15 - k at our death)

House facts used: one squad, shared vision, never fight each other, weakest hunter first, more per kill, all late
(240-300 s, guessed by several teams); they rotate 33-58 s early and sit at 0.41 of the next radius; never retreat or
heal on purpose; gun + laser hunter fights at 100-150 m [R, M S12].

| Alive (k) | Typical t / circle / dps | Posture | Position (centre / edge) | Engage | Outside the circle | Rotation | Regen / economy | Collapse |
|---|---|---|---|---|---|---|---|---|
| 16-9 (15-8) | 0-240 s; R 560 -> 240; 20-35-60 | Duellist (D2/D3), farm-first opening (10 cubes or 75 s), laser always | D9 goal at 0.6 nr on the side **away** from idle house bots (they sit at 0.41 nr) | one hunter at a time, finish-first (+0.39 [M]); far band fits (sep. up to 320 m) | to break a 2nd line with no cover within 3 s: <= 12 s (20 dps) / 7 s (35) / 4 s (60); outward-tangential, away from the pack | early (D9), enter on the empty side; ride the edge in (edge <= 7 m/s, we 11.7) | heal only inside, >= 20 s slack; never an excursion while healing; drops 1-2 per D6 | - |
| 8-5 (7-4) | 200-330 s; R 240 -> 140 -> 70; 60-100 | Duellist; all hunt: **serialise lines** (two lines = losing fight under 6 cubes) | 0.6-0.8 nr on the far side from the hunters' centroid, edge 12+ m behind (no rear arc, no new hunter from behind) [N] | band clamped to the circle: R 140 -> hold <= sep - 10 (about 115), R 70 -> <= 75; laser charge on their reload windows | 60 dps: <= 4 s for 1 line <100 m; 100 dps: <= 2 s and only for 2 lines | in with the edge, not 33-58 s early into the pack | supply drop 3 (lands 235 s, 140 m circle): full hp + 3 cubes, take it if no hunter has a line; kill piles within 70 m | from 265 s plating > nanites |
| 4 (3) | >= 300 s; R 140 -> 25; 100-160 | Fight on (each kill +1); 3 lines = 0-1 kills: break lines first | same; from 375 s the final point | D3 LOSING at 3 threats < 60% stays; finish anything under 25% | dodge only (<= 2 s at 100); never at 160+ | - | kill piles at once (+56 max hp per cube, heals the difference) | the point from 375 s, c5 side if pushed |
| 3 (2) | >= 325 s; R 70 -> 25; 160-260 | Fight; with >= 6 cubes + laser + 80% hp the model gives 1-2 kills | the point from 375 s | lowest-hp first; never leave a < 25% target | never | - | - | E race decides ties |
| 2 (1) | any | 1v1 is ours with a laser: fight it | point from 375 s | LOSING only under 25% hp (not 35%): retreat late has nowhere to go | never after 325 s | - | - | any E lead wins: on the point a house bot 6 m off needs hp > ours + 1,560 (rho 0) |

**Practice endgame, is 415 s a path to 15?** The last hunters converge on us inside a 25-70 m circle, where their
gun hits ~100%. Reaching 415 s therefore requires winning the remaining fights: realistic with k = 1 (any cubes, a
laser: 1v1 leaves 543-1,642 hp in the model) and with k = 2 if we hold >= 6 cubes, a laser and >= 80% hp (1-2 kills).
With k >= 3 the expected gain is 0-1 kill whatever we do; play for kills (finish targets, take their cube piles), not
for the collapse. Where the collapse matters it needs only an E lead: on the point at 375-415 s with any hp above the
last house bot's hp minus 1,560 (6 m off, rho 0) or minus about 900 (pushed to 3 m, rho 0.67, it on the c5 side).
Required level to make it likely: 10 cubes + 1 plating (2,254 hp) at >= 60% when the 25 m circle starts (375 s).
How often we are alive at 375 s in practice is unknown (no per-match data; the simulator kills us at 70-205 s), so
treat every late-game rule as low-frequency, high-value per occurrence (+3 to +5 points in the matches it touches).

## 6. Decision table: FINAL (FFA latched)

Timing from 7 recorded showdowns [R]: bottom half dead by 89 s (median 21 s); winners alive 135-327 s; one match
reached the 70 m circle; winners 0% of time outside the zone, 187 m from the nearest mech, 26 cubes, laser 70% of
damage. Death rate 0.36 / min with nobody within 60 m, 2.02 with one, 4.58 with two; centre 0.85 / min vs edge 0.55.

| Alive | Typical t / circle | Posture | Position | Engage | Outside the circle | Rotation | Regen / economy | Collapse |
|---|---|---|---|---|---|---|---|---|
| 16-9 | 0-90 s; R 560 / 380; 20 | Hide-first (D11), answer hostiles from cover | inside the next circle at 0.55-0.75 nr (about 0.4-0.45 of the current radius, where showdown winners stood), away from gunfire bearings and every track; never the centre | no voluntary fight before 90 s; shoot first only kill-secure | break a line with no cover <= 12 s; never to farm | early but to the empty side | farm only with no mech within 150 m; never the drop ring with a mech within 150 m | - |
| 8-5 | 60-200 s; R 380 -> 240; 20-35-60 | Third party (rule 3 / D11): wounded duel survivors, 4 s window | 0.5-0.7 nr with cover; gate the next edge at shrink start (posts 20-30 m inside it covering entry lanes) | P >= 1.6 vs isolated; kill-secure; mechs outside the zone at 60 dps+ under 60% hp get x1.5 target score (they cannot regen) | flank an edge-hugger facing > 75 deg away: <= 12 s at 20, 7 s at 35, 4 s at 60, hp >= 70% | ride the edge in on the empty side | cubes to 10 and plating are the endgame currency (section 3) | - |
| 4 | 130-250 s; R 380 -> 140 | Kill-secure only, P >= 1.5 | post with a wall behind, 0.4-0.6 nr | never the first of three to fire unless finishing | <= 4 s at 60, 2 s at 100, only to finish / break 2 lines | - | heal to full before every shrink | - |
| 3 | 150-300 s | Truel: hold fire unless targeted or finishing; on a death not ours hit the survivor within 4 s if < 50% and <= 190 m | post, wall behind | then go to the 2-alive rules | same | - | heal | compare E_full |
| 2 | 135-330 s typical; R 380 -> 140 | **Compare E_full = max hp** (both heal to full when >= 40 s to 415 s and out of a fight). Ahead by >= 300: WAIT. Behind by >= 300: CLOSE THE GAP. Else duel at P >= 0.9 | WAIT: hidden post within 0.3 nr of the next centre from 330 s; point from 375 s. CLOSE: farm far from it, then a post on its rotation path | WAIT: no first shot unless finishable. CLOSE: attack only when it is < 60%, reloading, charging away from us, outside the zone or busy with a drone; from outside its wedge | finish it outside if its hp <= (our dps + zone dps) x cap | - | WAIT: heal, farm with it > 150 m; never a supply drop with it within 150 m | E race: c5 side, then shoot it from 405 s if its E is above ours |

## 7. Simulator sanity (information only; the simulator mispredicts within-bot deltas)

- Squad, 8 matches (seeds 301-308): 3.38 +- 0.68, dead at 71-171 s, never in phase 2. Weakened house guns
  (`weak_house.json`, 6 matches): 5.5, one outright win (15 kills by 204 s), 21.6 s of phase-3 time in total; zone
  damage 0, time outside 0, FIGHT <-> ZONE flips 0.1-0.7 / min, median fight distance 47-62 m (the far band is rarely
  held there). The late cells of section 5 are not reachable in this simulator; they cannot be tuned here.
- FFA, 4 matches (seeds 411-414): 15 / 14 / 4 / 12; matches ended 146-287 s (as in recorded showdowns).
  Seed 412 is the 2-alive failure mode: 2 alive from 105.7 to 286.6 s (181 s). Us gun only, 4 cubes, max 1,624; the
  other gun + laser, 10 cubes, 1,960 (E_full gap -336: the CLOSE branch). The first loss began in DROP mode (drop 3,
  231 s) with the other mech 91-101 m away (D6 leaves only at 60 m): 1,624 -> 942 -> 261 in two beam-led bursts of
  566-682 hp (a 10-cube beam is 441, 661 into the rear). Healed to full by 276 s, the bot went back toward the drop
  (272 s), took a post 34 m from the other mech (275 s) and died at 286.6 s at 19 m, five beams in all. The 2-alive
  rule (never a drop with it within 150 m; E_full behind -> farm cubes to 10 first, attack only on its reload / from
  outside its wedge; posts never inside 150 m of it while waiting) addresses exactly this.

## 8. Rule list (if-then with numbers), mapped to code hooks

Every rule is a preset (`params.js` PRESETS + SELECT) so one submission changes one thing. "Both" = SQUAD and FFA;
SQUAD-affecting rules change the practice score and need their own submission.

| # | Rule | Hook | Preset (default) | Env | Evidence |
|---|---|---|---|---|---|
| Z1 | **Band fits the circle.** (cF, RF) = next circle if shrinking or `t0 - t < 15`, else current. sepMax = dist(target, cF) + RF - (me.radius + 10). Laser: hold = min(rPrefLaser, sepMax - 10), lo = min(laserLo, hold - 25), hi = min(laserHi, sepMax), backOff = lo, boostAway = min(laserBoostAway, lo - 20); floor hold 45 m. Gun / lightning: hold = min(hold, sepMax - 5). | `tactics.js bandFor` (also feeds `B.bandHi` candidates and `stance.applyStance`) | `bandFit: on / off` (on) | both | [A] geometry; red team #11 (0.1-0.3) |
| Z2 | **Enter the next circle on the empty side.** Side vector u = unit(me - c_next); if tracked mechs (SQUAD: non-hostile; FFA: any) within 250 m of c_next, rotate u away from their centroid by up to 60 deg. Goal radius 0.6 nr (SQUAD, was 0.5), 0.65 nr (FFA, was 0.45; posts 0.55-0.75 nr). Path length cap 1.3 x straight. Note: 0.65 nr is 0.38-0.44 of the CURRENT radius in phases 0-2, which is where the 7 showdown winners stood (0.45 R); the code's 0.45 nr (FFA posts) and 0.5 nr (zone goal) are 0.26-0.34 R, more central than any group. | `mover.js zoneGoal` (ux, uy, rg); `brain.js holdLegs` frac | `zoneSide: away / our` (away) | both | [R] centre 0.85 vs edge 0.55 deaths / min (S4), winners 0.45 R (S1); house at 0.41 nr |
| Z3 | **Outside budget.** In a fight only: allow hide cells, dodge sides and finish legs outside the zone for s_out <= min(cap, 0.15 hp / dps), cap 12 / 7 / 4 / 2 / 0 / 0 s at dps 20 / 35 / 60 / 100 / 160 / 260, when (a) >= 2 lines on us and no inside hide cell within 3 s, or (b) the target is outside and its hp <= (our dps + zone dps) x s_out, or (c) FFA, alive <= 8: flank a mech facing > 75 deg away, our hp >= 70%. Return path planned first; never in HEAL; abort if hp - dps x (s_out + return) < 35% max. | `tactics.js makeHideSearch okStatic` (zoneSlack test), `mover.js walkable` (line 98 veto), `bulletDodge`, `ffa.js` | `outsideBudget: off / on` (on) | both | [A] section 4 |
| Z4 | **Back to the edge when hunted by several (practice).** t >= 200 s and >= 2 house bots hostile in the last 10 s: anchor 0.8 nr from c_next on the far side from their centroid, slack >= radius + 10 m; keep it through the shrinks; under this preset the centre leash of `fightLegs` / `holdLegs` / `zoneCheck` starts only at nr <= 25 (own threshold `edgeLateR` 25; zoneLateR keeps its other uses: nrEff = 0.5 nr and the edge veto in `walkable`). | `mover.js lateLeash` / `zoneGoal`, `brain.js fightLegs` late block | `edgeBack: off / on` (off: one submission) | SQUAD | [N]; house 86% vs 100% at 85 m; no rear arc |
| Z5 | **Final point.** 375-390 s: stand on `next_center`; if a body is within r_us + r_them, stand on the c5 (current centre) side, never the far side (rho 0.67: 389 vs 1,970 hp at 2.5 m). 390-415 s: moving centre 1 s ahead (exists). From 405 s target the mech with the smallest positive E - E_us (E = hp - 260 x (415 - exit time)); if E_us is the top, the attacker. | `mover.js zoneGoal` (late branch), `tactics.js selectTarget` score | `finalPoint: on / off` (on) | both | [A] section 3 |
| Z6 | **Late upgrades.** t >= 265 s or alive <= 4: plating > nanites > laser_damage > rest; armor last (no value against the zone). | `params.upgradeOrder` via `economy.js` offer pick | part of Z5 | both | [A] |
| Z7 | **Practice late kills.** k = alive - 1 <= 2 and t >= 300 s: collect every kill pile within 70 m at hp >= 35%; supply drop 3 worth a 250 m trip when no hunter has a line; k = 1: 1-threat LOSING only below 25% hp (was 35%). | `tactics.js losing` (lose1Hpf by k), `economy.js` grab radii | `lateKill: on / off` (on) | SQUAD | [A]; low frequency |
| Z8 | **FFA 2 alive.** E_full = max hp (both heal to full when >= 40 s to 415 s and no line for 5 s). E_us - E_them >= 300: WAIT (DEFENSIVE, first shot only if finishable, heal, farm with it > 150 m, hidden post within 0.3 nr of c_next from 330 s, point from 375 s). <= -300: CLOSE (farm to 10 cubes and plating first; attack only when it < 60% hp, reloading, charging away, outside the zone or busy; from outside its wedge). Else duel at P >= 0.9. Never a supply drop with it within 150 m. | `stance.js chooseStance` (alive 2 branch), `ffa.js firstShotOk`, `economy.js` drop gate (dropContestR 60 -> 150 at alive <= 3) | `ffaTwo: on / off` (on) | FFA | [A]; sim seed 412 |
| Z9 | **FFA 3 alive.** Hold fire unless targeted or finishing; on a foreign death (3 -> 2) hit the survivor within 4 s if < 50% hp and <= 190 m (rule 3 / D11 exist), then Z8. | `ffa.js firstShotOk`, `stance.js` need 1.25 -> hold | part of Z8 | FFA | [A] truel 14.9 vs 14.0 |
| Z10 | **FFA zone as a weapon.** A mech outside the zone at dps >= 60 under 60% hp: target score x1.5; at shrink start hold a covered post 20-30 m inside the next edge on its entry bearing; it pays 5.1 / 8.5 / 13.7 hp per metre crossing. Abort when we take > 100 dps. | `tactics.js selectTarget`, `ffa.js` post choice | `ffaGate: on / off` (on) | FFA | [A] playbook M9 |
| Z11 | **Never heal outside, never leave while healing.** HEAL cells keep >= 20 s slack (healZoneS, exists); no zone damage once HEAL starts (an excursion costs dps x s + 45 x (s + 5)). | `tactics.js okStatic`, `decideMode` | exists; keep | both | [P] regen rules |

Order to build and submit (4 per hour, one change each): FFA-only rules (Z8, Z9, Z10) can ride along with any
submission because SQUAD play stays bit-identical (check with `env squad` identity, as in RC1). Of the SQUAD-affecting
ones, Z1 + Z2 first (low risk, geometry), then Z3, then Z4 as a pure experiment (one submission each way; keep only a
gain of 0.3 or more, our noise floor), Z7 last (rare). Z5 / Z6 / Z11 are mechanical and safe.

## 9. Open questions that would change the table

- Do real house hunters follow a target outside the zone? (The sim stand-in turns back 10-28 m from the edge.) If
  not, the outside is a full escape lane in phases 0-1 and Z3 should allow longer stays there.
- How often are we alive at 300 / 375 s in practice, and with how many house bots left? Without per-match data the
  late SQUAD cells are planned on arithmetic only.
- `top5_synthesis.md` (pending) may show where the 6+ bots stand in the late circles; fold it into Z2 / Z4.
