# Panel 5 — Systems / combat design memo

**Thesis.** Practice mode is a horde ramp: score = waves cleared. The rules pay for (1) time-to-kill on the lone early hunter, (2) how fast we create our own relax period (5 s out of combat, then 45 HP/s), (3) HP pool at the end. Only the laser turns hidden time into damage, so gun+laser dominates; nanites then plating are the best upgrades; cubes stop paying at 10. Numbers: `hello.config` defaults (`tools/panel5/econ.py`); [M] = `notes/housebot_model.json` (one replay, older build).

## 1. Pacing (f)

"One hunter, then more, then all" is build-up to peak with no designer-supplied relax phase (Booth). Kill cycle `C = tau(1 + a/r) + delta`, `tau = h/b`, a = 31 dps taken through a corner:

| Loadout | real dps b | tau | C | kills possible in 415 s |
|---|---|---|---|---|
| gun (60% hits) | 64 | 21.9 s | 41.9 s | 9.9 |
| gun + laser (85% hits) | 175 | 8.0 s | 18.5 s | 15 (cap) |

Reading: the cut (4.23) is roughly the four easy bots one at a time; the top (5.58) adds one or two mediums. Budget: 0-60 s loot and first duel; 60-195 s main scoring window (zone dps < regen; drops at 95/165 s), where 4 kills need C <= 34 s; from 195 s zone dps exceeds regen; from 325 s radius <= 70 m.

## 2. Loadout (a)

| Weapon | dps at 100% hits | damage per exposed second | Cost / counter |
|---|---|---|---|
| gun | 187 burst, 107 sustained | 187 x p(d) | none |
| laser | 131 full charge; tap 84 | ~400 (charge hidden, <=0.8 s out) | half speed 0.75 s, visible tell, shorted inside 45 m |
| lightning | 240 (526 chained); 2000 per tank | 240 auto-hit | needs <=45 m, where house guns hit ~98% [M]; burns boost energy |
| mortar | 138 max; ~20 measured [M] | none | carrier takes 504 per beam (756 rear) |

About 3 of 15 house bots hold a laser [M]. The triangle has unequal payoffs (Sirlin): laser >> lightning > empty > mortar.

## 3. Upgrades (b)

Value = estimated % kill gain (usable-HP + dps + cycle gain). dps column: gun+laser / gun only.

| Upgrade | dps | EHP / regen / mobility | Practice value by stack | FFA value |
|---|---|---|---|---|
| nanites | 0 | regen 72 then 115 HP/s, delay 3.5 then 2.0 s; C -19%, -18% | 24, 23 | 12, 10 |
| plating | 0 | +15% HP incl. zone (usable +20%) | 20, 20, 20 | 22 each |
| armor | 0 | +8.7, +9.5, +10.5% (not zone) | 14, 15, 17 | 12, 13, 15 |
| laser_damage | +11% | none | 11 (+6 if it removes a beam) | 8 |
| gun_mag | +11% / +30%, then +13% | none | 9, 4 (gun only 28, 11) | 6, 3 |
| servos | 0 | walk 12.6 m/s | 6 | 8 |
| laser_charge | +5% | charge 0.56 s | 6 | 5 |
| gun_damage | +5.5% / +15% | none | 5 (gun only 14) | 6 |
| gun_velocity | +7% / +10-40% past 100 m | none | 5 (gun only 15) | 5 |
| lightning efficiency, range, chain | tank 2000 -> 3385 -> 5728 | none | 15, 12, 4 if held | 18, 12, 6 |
| reactor, jets, capacitor | 0 | boosted speed +3.2, +3.6, 0%; climb 59, 79, 77 m | 3 (with lightning 10, 3, 8) | 3 |
| gun_rate, gyros, sensors | +2.7% / +7.3% | none | 2 | 2, 2, 5 |
| laser_pierce, mortar_* | ~0 | none | 1, 0 | 1, 0 |

Beams to kill 1400 HP: 5 at 315 (10.35 s); 4 from 350 (3 cubes; 7.95 s); 3 from 467 (10 cubes + 1 lens; 5.55 s); 2 from 700 (10 cubes + 3 lenses; 3.15 s).

## 4. Cubes (c)

To 10, each cube is +8.2% power (HP x damage); thresholds 1/3/6/10 give four upgrades. Size is uncapped: R = 2.5(1+0.05c), so the range where a strafe reversal beats a led bullet scales by `s(c) = sqrt((R+0.3)/2.8)`: 78 m (c=0), 94 (10), 101 (15), 109 (21). House hit rate drops ~2.9% per 1% of flight time at 100-150 m [M]: each cube past 10 costs ~+4.5% hits taken for no stats.

| Source | Cubes | Cost | Regen timer |
|---|---|---|---|
| crate | 1 | 7 rounds (1.44 s) or one beam | not reset [M] |
| drone | 2 | 8 rounds; 0-238 HP taken [M] | reset |
| kill | victim's + 2 | the fight | reset |
| drop | 3 + full heal | 4 s alone in the ring | none |

## 5. Zone and finale (d)

Edge speed 3.6 / 3.5 / 2.9 / 2.3 / 1.8 / 1.0 m/s (far side at most double): always below walk speed, so the zone punishes detours, not slowness. Drops land mid-shrink within 0.7 r of the next centre: fights are designed for there at 95/165/235 s. A drop equals 31-44 s of regen, about two kill cycles. Finale: radius = 415 - t from 390 s, then death at `415 + HP/(260 + incoming)`: 1400 HP 5.4 s; 1960 (10 cubes) 7.5 s; 2981 (+3 plating) 11.5 s. One lightning tank (2000 auto-hit) removes 7.7 s from a rival.

## 6. Map (e)

Roofs above ground: <=9 m 80 buildings; 9-15 m 50; 15-30 m 83 (57% of roof area); taller 10. House hop apex is 14.9 m [M]: only 15-30 m roofs cost them a climb (25-51 energy). Standing r back from the edge of a roof of height Hb hides us from ground shooters nearer than `D = r(Hb-8)/h`, h = 9(1+0.05c). Canopy (13% of the map) blocks sight through > 3.96 m of crown, never bullets. Stadium bowl: two 12 m gates, 53 m walls (90 energy to jet out); one house bot died to the zone there [M]. For one kiter against several: building clusters with corners <=60 m apart > 15-30 m roofs > canopy (regen only) > bridges > lawns and the bowl (square-law fire, Lanchester).

## Recommendations

**D1 (P0, practice) Kill tempo.** n = mechs aiming within 12 deg of us or damaging us in 10 s. n<=1 and hp>=60%: fight at once with every loaded round, corner <=6 m away, range 80-110 m gun-only or 100-140 m with laser, times s(c); regen only after the kill. n=2: exposure <=33%. n>=3: move to D11 terrain. *Fails if* two arrive early; the n=2 rule applies that tick.

**D2 (P0, both) Secondary.** Laser > lightning > empty > mortar (never take). First 60 s: detour <=150 m for a laser, <=80 m for lightning. Swap only after 3 s without line of fire (equip lock 1.65 s). FFA after 325 s or alive<=4: take lightning within 25 m. Never drop the gun. *Fails if* our beams hit < 60% (10 beams): rank lightning first.

**D3 (P0, both) Laser cycle.** Full charge only: charge hidden, step out at 0.75 s, release when aim error <= half the target's angular radius, hide; at 2.5 s fire regardless. *Fails if* a lightning holder is within 54 m: gun only until it is beyond 70 m.

**D4 (P1, both) Beam discipline.** While a laser holder has line of fire stay <=6 m from a corner; on `charging` with its aim within 10 deg of us, break sight within 0.6 s. Our beams go first to mortar holders (x1.6) and backs (x1.5). *Fails if* no cover: take it front-on.

**D5 (P0, both) Upgrade pick.** On the offer tick pick argmax of the table value for the next stack. If > 40% of the last 60 s was spent at >=95% HP with n=0, nanites = 5. After 300 s: nanites 0, plating +10. *Fails if* regen is not the bottleneck; the first switch covers it.

**D6 (P0, both) Cube cap.** Collect to 10, then only drops, or c>=13 within 30 m. FFA after 300 s: collect freely. Cover counts only if `top - ground >= 9(1+0.05c) + 0.5` m; update the nav body. *Fails if* kill cubes lie on our path: 5 m cost ring around cubes when capped.

**D7 (P1, both) Opening.** 0-1.6 s full torso sweep. Route by value / path time (laser 10, lightning 6, drone 4, crate 2) inside the next circle; crates from <=80 m on the move, drones from 60-80 m strafing; stop when a hunter is within 130 m. Goal at 60 s: 3 cubes, a secondary. *Fails if* a drone fight overlaps a hunter: no drones with a mech tracked within 150 m.

**D8 (P1 practice, P2 final) Drops.** Go if `path <= 11.7 x (lands_in + 6)` and (hp < 80% or c < 10); while waiting shoot crates only. *Fails if* a hunter freezes the clock: leave after 3 s frozen.

**D9 (P1, both) Zone position.** Hold 0.55-0.85 of the next radius, away from the hunters' centroid, inside the next circle before `shrink_start`; never outside after 195 s. *Fails if* the centre jumps: re-plan at each announcement.

**D10 (P1 final, P2 practice) Finale.** No boost after 380 s; stand on the moving centre; lightning on the rival with the smallest positive `E_i - E_us`, `E = hp - 260 x metres off-centre`. In practice each house bot with E_i < E_us is a point. *Fails if* > 3 shooters see the centre: nearest wall nook inside the circle.

**D11 (P1, practice) Terrain cost.** Per cell: +3 per ray (of 72) free beyond 60 m; -10 if a 15-30 m roof with >=16 m setback is within 40 m; +50 on lawns with > 30 open rays; bowl cells impassable unless the next circle contains them and energy >= 95. Regen under canopy only with every hunter > 60 m away. *Fails if* hunters reach such roofs twice: drop the bonus.

## Disagreements with the user notes

1. "Survival first, combat weight 0.05, aggression only in the top 4": right for the final, wrong for practice (house bots never die unaided).
2. "Roof-first looting": 25% of loot is on roofs, house bots took 0 of 10 roof pickups [M], a 20 m climb costs 34 energy. Roofs are reset points.
3. "Mortar for area denial": ~20 dps and +60% beam damage taken.
4. "Ambush over rush at drops": in practice the drop is our scheduled full heal.
5. "Rotate early to the centre": most approach angles; hold 0.55-0.85 r.

Kept: FFA placement objective, cube cap at 10, torso to the attacker, deterministic logic, HP-ranked finish.

## Sources

- Booth, The AI Systems of Left 4 Dead: https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf
- Sirlin, Rock, Paper, Scissors in Strategy Games: https://sirlingames.squarespace.com/articles/rock-paper-scissors-in-strategy-games.html
- Lanchester's laws: https://en.wikipedia.org/wiki/Lanchester%27s_laws
