# Build R3a2 — binding spec (team lead, 17:35 UTC Sat). Supersedes the "next submission" list of build_spec_r3.md.

Inputs: notes/top5_synthesis.md (what the 6+ bots do; kills per minute decide practice: kyoto 3.76, giddy 2.86,
ours 1.91; all die about 95 s), notes/build_spec_r3.md (chair), notes/panel_r3_scenarios.md (Z rules).
Every item is a preset in lib/params.js; old values must reproduce the 5.02 build byte for byte.

## Practice items (SQUAD)
P1 fightEarly (synthesis 1): openFarm OFF; opening guard 20 s (only while no foreign death has been seen; else 40 s);
   candidate set: mechs with a line within 240 m that are within 60 m, hit us in the last 6 s, close faster than 3 m/s
   within 180 m, are under 40% hp within 160 m, or aim within 0.22 rad of us within 190 m.
P2 laserEcon (synthesis 2): while we hold no laser, a laser pickup is the top loot goal out to 240 m (path, zone and
   threat gates still apply); a laser replaces lightning; no mortar in SQUAD. laserRange mid (hold 115, band 100-130).
P3 focus (synthesis 3): selectTarget cost = distance + 0.1 per hp, -200 if hp <= 30% or finishable by the current burst,
   -200 for the current target, -40 if it hit us within 4 s, -15 if closing; torso veto and the R2 rear pick switch
   only if the current target is >= 38% hp and we have not hit it for 2 s.
P4 pulseRetreat (synthesis 4): no HEAL state in SQUAD; LOSING = (>= 2 near and hp < 55%) or (>= 3 near and hp < 80%)
   or (hp < 35% against a healthier target); cancelled when the target is under 25%; a retreat ends 1.5 s after the
   last LOSING decision; none in the late zone; with no cover, fight on.
P5 boostSpend (synthesis 5, chair N3): in legs() before bulletDodge, boost while charging the laser, while dodging, or
   under fire, when energy > 30 (dodge > 25); no 30/60 hysteresis; SQUAD only.
P6 farmHp 50 (chair N4). P7 speed upgrade third (chair N5).
DROP chair N2 (partial release at 0.7): our kill release already uses factor 1.0 (synthesis: N2 reads giddy backwards).
Optional, default OFF: walk-in finish to 20 m (synthesis 6).

## Final-only items (FFA latch; practice actions unchanged)
F1 ffaDropGate (<= 3 alive: no supply drop with a mech within 150 m). Z5 finalPoint, Z8 ffaTwo, Z9 three-alive,
Z10 ffaGate from panel_r3_scenarios.md. In FFA keep the opening guard at 40 s and HEAL as now.

## Release variants (first hour, four slots, one code state; only SELECT defaults differ)
V1 = all items above at their new defaults.
V2 = V1 with P1 off (openFarm on as in 5.02): tests the biggest contested item (5.02 had openFarm on).
V3 = V1 with P5 off (no boost spending): contested.
V4 = V1 with P4 off (HEAL as in 5.02).
Submission order: V1, V2, V3, V4. Afterwards: salts of the leader.
