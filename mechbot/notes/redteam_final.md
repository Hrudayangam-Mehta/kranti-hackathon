# Red team, final round: pre-mortem (assumed result: 8th place on average)

Snapshot: `bot/lib` at 05:52 UTC (Doctrine V4 not yet in code). Evidence in `tools/redteam/`: 209 local free-for-alls (our brain, 15 sandboxed public bots), 96 simulated practice matches, 12 scripted checks. The unmodified brain placed **7.39 on average over 156 matches** (8 wins, 37% dead before 60 s): the premise is what we measure. Paired differences under 1.5 places (n = 24) are noise.

## 1. Ranked limitations

| # | Limitation and mechanism | Where | Evidence | Share x places lost | Fix (under 2 h) | Test |
|---|---|---|---|---|---|---|
| 1 | **The opening is fought as a duellist.** No death count can latch before the third death (median 18 s, range 9-54); we fire 0.2 s (median) after first sight and walk in. | D12, D0, D2, D5. Code has no guard: `selectTarget`, `decideMode`, `mover.standoff` (closes to 110 m) | A mech in view by 20 s in 64% of matches: place 8.8, 51/100 dead before 60 s; otherwise 4.9, 6/56. First shot before the latch in 64/108 | 0.64 x 3.8 = **2.4** | Contact-break rule, both postures, t < 40 s (FFA: while 5+ alive): a non-hostile mech with a line on us sends the legs to `retreatLegs()`, fire held; a hostile one is answered from cover, never closing | `scenarios.js` idle-mech checks pass; `ffa_probe.js`: dead before 60 s <= 15%; `--mode squad` score unchanged |
| 2 | **We are the visible mech in a quiet field.** Hunters share fewer targets; we strafe in view and fire a gun heard at 320 m. | D11 has no visibility rule; D6 farming | Same seeds, 7 of 15 opponents swapped for hide and sneak builds: 3.25 +- 0.82 places worse | 0.5 x 3.3 = **1.6** | FFA cells cost each tracked mech with a clear line inside 200 m; no crate gunfire with a track inside 320 m | Mixed-field place within 1.5 of fighter-field place |
| 3 | **The latched posture in code is not hide-first.** `advantage()` uses the target's current dps (x0.35 when it is not aiming at us): any idle mech gives P >= 1.85, so OFFENSIVE at 65 m. `holdFirst` silences the gun while the legs keep 115 m in view. D11's counters are unbuilt. | `stance.js` `chooseStance`, `applyStance` | FFA from t = 0 placed 7.0, never latched 6.8, auto 5.7 (not significant): the latch buys nothing today. Check: 150 m to 84 m, 20 shots | 1.0 x 1.5 = **1.5** | Potential dps in `advantage()`; DEFENSIVE cap while 5+ alive unless `killSecure`; `holdFirst` routes legs to `retreatLegs()` | Scenario `env=ffa` passes; forced-FFA run 2 places above SQUAD-only |
| 4 | **D0 as a trigger gate is worse than no guard.** Holding fire in view gives away the first salvo; "aims within 12 deg" has no memory and flickers as the shooter's torso sweeps. | D0; R2 change 1 | Emulated guard (no first shot, no closing): 2.71 +- 0.69 places **worse**, paired. Walking away instead: 1.54 +- 0.69 better | 0.5 x 2.7 = **1.3** | Legs first (row 1). Hostile flag sticky 20 s; also set by a charge with us within 60 deg of its aim, range under 70 m, or closing over 4 m/s inside 110 m | 2 places above `--shim noapproach`; return-fire check passes |
| 5 | **Third parties and distance from cover: full health to dead in 10 s.** Posts, stand-off and drop runs sit 5+ s from a hidden cell; D3's retreat numbers are SQUAD numbers (two threats: 50% HP); `enterLS` (`hp < A(tCover+1)`) then parks us at a wall. | D3; `brain.js` `holdLegs`; `stance.js` `enterLS` | HP 10 s before death: median 1,400. Last stand began at 69% HP, two shooters in 6/17, a hide cell known in 16/17; death 4.6 s later; 31/40 deaths in the `bastion` leg. Recorded: 55% of deaths have 2+ attackers | 0.6 x 2 = **1.2** | FFA: leave at the second line of fire at any HP; cover leash (a track inside 250 m and `tCover > 2.5 s`: legs to cover first); LAST-STAND only below 25% HP | `lastStand.enterHpf` median under 0.3; `atDeath.stillShare` under 0.1 |
| 6 | **No economy.** DEFENSIVE loot radius 40 m; a track inside 150 m blocks it; `farmNpc` is never set (no drones); 40% of our life is HOLD. | `economy.js` `chooseLoot`; D11 "farm beyond 150 m" | Our cubes: median 1; winners 22, places 2-4: 9. With 5+ cubes we placed 3.1 (n = 31) | 0.6 x 2 = **1.2** | FFA, HOLD over 5 s: run to any remembered crate, cube or laser within 250 m hidden from tracked mechs; drones at 90% HP, no track inside 150 m | Median 8 cubes by 120 s; laser by 60 s in 70% |
| 7 | **Out-ranged and out-seen by lasers.** Beam 280 m, gun 230 m, our eyes 200 m, charge sound 140 m. Posts are the nearest wall, not concealed. | D11's laser counter needs the charge flag; `holdLegs`; `senses.js` | 82 of 148 deaths by laser; 101 died without one; killer in view 48% of the last 10 s | 0.55 x 2 = **1.1** | Start-up concealment map (clear 250 m rays per cell) for posts, heal cells, routes; after an unseen hit hide along the whole bearing, 150-280 m | `unseen-laser-230m`: at most 1 beam, still under 30%; laser deaths under 30% |
| 8 | **Latch: late, absent in a quiet field, different in code.** If finalists survive openings and the third death comes after 200 s, we hunt all match. Code latches on 2 deaths (F/Q; beam and HP-loss clues on). | D12; `stance.js` `environment` | Panel model: a hunter among 15 evaders scores 0.33. Not reproducible locally | 0.3 x 4 = **1.2** (after row 3) | NEUTRAL default state: no idle pull, no first shot at a non-hostile mech. SQUAD aggression needs Q >= 3; FFA passivity needs D12 or a clue | `--mode squad`: 0 latches, same score; passive scripted field: no approach after 60 s |
| 9 | **Heal rule.** Code heals below 90% (doctrine 55%), loots only above 90%, holds fire: 18% of life in HEAL. A tap every 5 s from beyond 200 m stops regeneration. | D3, D11; `healExit`, `lootHpf` | Mode shares, 156 matches | 0.5 x 1 = **0.5** | FFA: both 0.7; two unseen hits while healing: `escapeLegs()` 80 m | Scripted 4.5 s tap: above 70% inside 40 s |
| 10 | **Last four.** No M11, final point or three-mech rule; OFFENSIVE at 4 alive with 1 cube. | D9 [N]; R2 section 4 unbuilt | Top 4 in 33%, 8 wins in 156 | 0.33 x 1.5 = **0.5** | 3 alive: hold fire until a `death` sound, then hit the survivor within 4 s; `next_radius` 0: stand on `next_center` | Share of top-4 finishes ending top 2 |
| 11 | **Zone squeeze.** D11 parks us at 0.4-0.5 of the radius, with the house fill-ins (0.41) and most public bots; recorded deaths 0.85 per minute at the centre, 0.55 at the edge. | D11, D9 | Our deaths: quartiles 33 / 91 / 147 s | 0.3 x 1.5 = **0.45** | FFA band 0.7-0.85 with D9 timing until `next_radius <= 140`; cells cost a track inside 60 m | Mechs inside 120 m in phases 2-3 |
| 12 | **Readers of our code.** | section 3 | `strafe-schedule-predictable` fails | 0.15 x 2 = **0.3** | section 3 | that check passes |
| 13 | **Wrong latch in practice.** | `environment` F/Q | 1 false latch in 96 practice matches: one drone kill plus one more clue | 0.01 x 5, on the qualifying score | D12 literally; clues behind presets | `--mode squad --seeds 1..96`: 0 latches |
| 14 | **Cut-off regions are never left.** Paths stay inside one walkable component; `nav.hopPlan` is not wired. | `mover.js` | Started in each of 6 regions (stadium bowl, 40,000 m2): never out in 200 s; zone death at 150 s | 0.02 x 6 = **0.1** | Zone goal in another component: `hopPlan`, jump, jet | `enclosed_test.js`: out within 30 s, 6 of 6 |

## 2. Second by second

Spawn separation is 130 m; a mech stands within 150 m in 57% of simulated seeds.

**A neighbour at 150 m (seeds 5, 19); enclosed starts: row 14.** Doctrine before the latch: D0 holds the trigger until the mech aims within 12 degrees (about 1 s here); D2 then sends a gun-only bot to 75 m. Code: FIGHT/standoff at 0.1 s, firing, closing. Seed 19: 151 m to 87 m, dead at 23 s, three seconds after the latch. Seed 5: 905 HP at 9 s; latch at 14 s; healed by 40 s; 45 s shadowing a mech at 75-115 m with the gun silent; dead at 92 s.

**Nobody near (seeds 13, 3).** Doctrine before the latch: D6 farming with gunfire, D5 hunting after 20 s idle. Code: one loot run, then HOLD at the nearest wall. Seed 13: 206 s there with a laser and 1 cube while 11 died; at 217 s OFFENSIVE, 183 m to 107 m, 565 HP lost in 2 s. Seed 3: contact at 76 s, OFFENSIVE at 77 s with 9 alive, 660 HP lost inside two seconds, dead at 90 s to a laser at 169 m.

**After the latch, by doctrine.** No farming with a mech inside 150 m, no fight before 90 s, 0.4-0.5 of the radius: alive but poor, in the busiest ring. Public bots named hide, ghost or cover placed 9.6-10.9 here; kiting duellists 6.3-8.4. The winner's profile is farming at 190 m with a laser, not hiding.

## 3. Readers of our code

- **Strafe schedule.** `jink.until` comes from `hello.seed ^ rngSalt`; the seed is fixed per seat and our seat id is visible. Reversal times were identical (0.9, 2.0, 2.8, 3.6 s) under different private inputs. Fix: fold our energy and the noisy sound bearings into the RNG (still replay-deterministic). `jinkLo` is 0.5; D4's minimum is 0.8.
- **Hostile test.** Approach with the torso 13 degrees off, or charge 0.3 rad off and swing on: a free first salvo. Fix: row 4.
- **Fixed bands.** "Back off inside 125 m, boost inside 90 m" lets a reader herd us and drain the tank before a lightning rush. Fix: edges +-10% per match.
- **Hide cell.** Nearest hidden lattice cell, then a 60-80 m continuation: computable from two positions and the public map. Fix: pick among the best three within 15% cost.
- **Heal and drops.** The regeneration tap (row 9); walking within 60 m of a ring denies every drop.

## 4. Opportunities, ranked

1. **Outside 200 m or behind a wall.** Vision is a rule, not a habit; winners averaged 187 m to the nearest mech.
2. **Quiet farming.** Lightning opens a crate in 1.25 s and carries 160 m (gun 320, laser 380); one full beam opens a crate. Use the quietest weapon held.
3. **Death-site collection.** A `death` sound carries 600 m; seven mechs die in the first minute, each leaving its cubes plus two and its non-gun weapons. Walk in under cover 8-20 s later if no track is near.
4. **Outer ring** (row 11).
5. **Landing-time drops**: winners took 1.0 per match, places 2-4 took 0.1.
6. **Hold fire at three alive**, then strike the survivor (model: 14.9 against 14.0).

## 5. Runs (mean place, n)

Fighter field, auto latch: 7.19 +- 0.57, 68. Mixed field: 8.96, 24. Hider field (11 of 15): 7.38, 16. Seeds 1-24: auto 5.71, never latched 6.75, FFA from t = 0 7.04, guard shim 8.42. Walk-away shim, mixed field: 7.42, 24.

`./bun tools/redteam/ffa_probe.js --field top15|mixed|hiders --seeds 1,2 [--overrides JSON] [--shim noapproach|evade] [--mode squad]`; `scenarios.js`; `enclosed_test.js`; `python3 tools/redteam/summarize.py out/*.json`.
