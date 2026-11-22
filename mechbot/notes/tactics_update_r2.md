# Tactics update R2: the Elite Strategy Report, decided

Chair's memo. Inputs: `panel_r2_architecture.md` [A], `panel_r2_placement.md` [B], Doctrine V4, `measured_deltas.md` [M] (other teams' official 48-match scores), `showdown_profiles.md` [S] (recorded real free-for-alls). Gains are model estimates unless tagged [M] or [S]. Carried numbers were re-checked in `tools/panel_r2/chair_checks.py` (output `tools/panel_r2/out/chair_checks.txt`).

## 1. Verdict on the report

1. **Right for the final.** Placement is the score there, so surviving the opening, staying unseen and growing quietly win. In recorded free-for-alls the bottom half died after a median 21 s, taking 57 HP/s against 12 for winners; practice ranks 1-4 placed 6th to 12th; in private rooms a quiet build scored 10.75 against 9.33 for its fighting twin [S; M S08].
2. **Wrong for practice.** The 15 house bots are one squad, so our place is the number of them dead before us. Ten official tests of hide-first play by eight teams all lost, by 0.33 to 1.75 points (mean 0.81) [M]. Practice gates the final, so the duellist stays the default.
3. **Right pipeline, wrong arithmetic.** Perception, memory, decision and action layers are what we built. One weighted sum (0.35 survival ... 0.05 combat) cannot veto anything (leaving the zone costs 0.10) and cannot serve two games. We keep hard rules and one stance table per environment.
4. **Three recommendations fail on measurement.** Roof play lost in 5 of 7 official tests (-0.18 to -0.93) [M]; a routing heatmap saves 5 of 66 exposed metres per retreat, about 17 HP [A]; a full belief grid locates a lost mech no better than its last known point [A]. We adopt their cheap forms: reach discs and a sound-driven torso.
5. **The sources say less than claimed.** The Riot/modl.ai paper is imitation learning for human-like 2v2 play and reports no win rate; Shi, Mao and Hao study scoring design; Sagong, Woo and Kim predict survival from telemetry. None tests a bot. The official scorer and the recordings are the stronger evidence, and they support lines 1 and 2.

## 2. Decision table

| Report item | Practice (SQUAD) | Final (FFA latched) | Form in our bot |
|---|---|---|---|
| Roof-first looting | REJECT | REJECT | D6 "no roof loot" stays. Roof posts are not built (see below). |
| Threat heatmaps | REJECT | ADAPT | Exact rays in the position evaluator stay. Sound bearings feed the torso scan and the `near(R)` count (change 5). |
| Probabilistic enemy memory | ADAPT, torso only | ADOPT, lite | One reach disc per lost track; no grid, no particles (change 5). |
| Avoid fair fights | ADAPT | ADOPT, stricter | SQUAD: never decline a hostile mech, never walk at an idle one (change 1). FFA: thresholds of section 4. |
| Third-party engagements | REJECT: the squad never fights itself | ADAPT | Kill-secure only (section 4). |
| Aggression only in the top 4 | REJECT | ADAPT | Start fights at 4 alive or fewer; shoot first when cornered at any count; hold fire at 3. |
| Utility weights | REJECT | REJECT the sum, keep the order | Rule priority: zone, survival, position, information, resources, combat. |
| Rotate early, zone forecast | ADOPT (D9) | ADOPT | Inside the next circle 10 s early; final point from 375 s (change 2). |
| Ambush supply drops | REJECT: contesting cost 0.21 and 0.08 [M] | REJECT | Uncontested drops only; 150 m from rings while 5 or more are alive. |
| Punish weakened opponents | ADOPT: finish targeting +0.39 [M] (D5) | ADOPT | Kill-secure rule. |

Where the memos disagree, and the ruling:

| Point | [A] | [B] | Ruling and reason |
|---|---|---|---|
| Roof posts | Build behind a flag: +0.5, range -1 to +2, 3-4 h; first if below the cut | Reject in practice; healing post in the final | **Not built.** Five official losses outweigh one old-build replay. Below the cut the measured levers come first: execution fixes +0.40, finish targeting +0.39, farming on +0.27 and +0.37 [M]. |
| Memory in practice | +0.2 to +0.4 | Reject | **Lite, torso only.** Recomputed gain: 6-24 HP per engagement, so +0.05 to +0.15. Gating loot on it in SQUAD would cut farming, and farming off cost 0.65 and 0.64 [M]. |
| Utility arbitration | Build, +0.2 | Stance sets | **Not built.** Its own worked check breaks off at 50% HP with rho 0.6; D3 holds to 35%, and retreating at 72% cost 1.1 [M]. Its two sound principles (hard rules pre-empt, any veto is absolute) are already in D0-D3. |
| Latch | - | Trip by the second foreign death | **Keep three (D12).** In the replay the second and third deaths fall at 66 and 68 s; a three-death rule left a practice score unchanged [M X01]; a two-death rule with 4% false latches costs 0.2. |
| Finale cost | - | `hp - 260*d` | **Corrected.** The circle's centre moves, so one metre off the final point costs 260/(1+rho) to 260/(1-rho) HP, rho = distance between the last two centres / 25. At rho 0.67 (mean, if centres are uniform): 156 HP toward the old centre, 788 HP away. Use the exact exit time. |
| Hiding in practice | - | Scores about 0 | **Corrected.** Hide-first builds scored 1.7 to 4.0 officially [M]; they lose to their fighting twins, they do not score 0. |
| Late thresholds | Playbook: 1.35 at 4 alive, 1.0 at 2 | 1.5 at 4, 1.4 at 3; at 2 compare E, else 0.6 | **[B].** Recomputed from its printed continuation values: 1.59 at 4 and 1.36 at 3, the same within rounding. |

## 3. Change list for the brain

Ordered by practice gain per hour (changes 1-5), then by gain in the final (6-8). Change 2 holds second place on its upside; its practice gain is unmeasured. Hours sum to 10. Every item is a `PARAMS` preset, so one submission can switch it.

| # | Build (layer, file) | Practice | Final | h | Risk | Test |
|---|---|---|---|---|---|---|
| 1 | **Idle rule** (L7, `stance.js`; D5 third clause). `idlePull=false`: when unengaged for 20 s at 90% HP, farm (D6) or hold a post in the zone band; never walk at a mech that is not hostile. Candidates stay: hostile mechs and mechs inside the range band + 40 m. | 0 to +0.2. Starting fights with idle or distant mechs lost 0.18, 0.37, 0.29; hostile-only gained 0.23 [M] | Stops us hunting while unlatched | 0.5 | Low. The 5.19 bot fights everything it sees. | Arena: a non-hostile mech at 300 m is never approached. One submission each way; a difference of 0.3 or more decides. |
| 2 | **Final point** (L3, `mover.js`; D9). When `next_radius==0` (375 s): go to `next_center`, arrive by 385 s, stand still. Pushed off: stand on the `zone.center` side. `E_i = hp_i - dps*(415 - t_exit(p_i))` with the exact exit time (tactics_spec E1); SQUAD doubles the target score of mechs with `E_i >= E_us`. | Unmeasured: +(15 - kills) in each match where we reach 415 s with the largest E. Likely only with 2 or fewer hunters left [B] | Decides places 1-3 whenever two mechs reach 390 s | 1 | Low | Unit: `t_exit` against 260/(1±rho). Arena: on the point with 1,400 HP we outlive a 1,820 HP rival 5 m off. Local runs: share of matches alive at 375 s. |
| 3 | **Head-only exposure** (L4, `tactics.js`). For a gun or laser holder: centre line clear = 1; only the line to our top clear = `headExposure`; SQUAD 0.1, FFA 0.5. Both rays are already cast. | +0.05 to +0.1. House bots fired 848 of 851 shots with a clear centre line and none in 41 s at a target showing only its top; such a cell is within 24 m in 3-8% of duels [A] | 0: finalists aim up the body (public +0.40 fix) | 0.5 | Medium: measured on the old build | Unit: the evaluator ranks a head-only cell above an open one. Arena: a centre-line-only shooter deals 0 there. One submission, 0.1 against 0.5. |
| 4 | **Airborne lead** (L2, `firecontrol.js`). Target airborne when 0.6 m above ground or `abs(vz)>0.5`; keep `tAir`. Jet phase (`tAir<1.5 s`, vz not falling): `vz' = min(max_rise_speed, vz + (jet_accel - gravity)*t)`. Otherwise `z = z0 + vz*t - 0.5*gravity*t^2`, clamped to the ground. D2 treats the ballistic phase as steady. Target score x1.3 while airborne and flight <= 0.55 s. | +0.1. House bots are airborne 27% of the time [A] | +0.1: expert house bots fill empty seats | 1 | Low | Arena: a scripted hop (jump, 1.5 s jet) at 75, 100, 125 m is hit at >= 0.85 of the walking rate and >= 0.2 above today's lead. |
| 5 | **Belief-lite** (L1, `senses.js`; torso in `firecontrol.js`). Per lost track a disc at the last listed point, `r(age) = v_walk*min(age,5) + 0.45*v_walk*max(0,age-5)`, dropped at 30 s. Sound buffer minus sounds within 21 deg of a listed mech. `scanYaw` = peak of a 36-bin histogram: discs `exp(-age/10)`; sounds 3 near, 2 mid, 0.5 far, times `exp(-age/5)`. `near(R)` = listed mechs + discs reaching within R + near sounds in 10 s (mid sounds too when R >= 150). Torso order: attacker, lost target 4 s, `scanYaw`, sweep. SQUAD: torso only. | +0.05 to +0.15 | +0.3 to +0.5 [A]: HEAL needs `near(80)=0`, farming `near(150)=0` | 2 | Low | `belief_replay.js`: an untracked attacker is inside our wedge before its first hit in >= 55% of cases (house torso 19%, chance 33%); `near(80)=0` is wrong <= 5% of the time (base 13.5%); cost under 0.2 ms. |
| 6 | **Latch** (L7, D12), pseudocode below. | Must be 0: the score stays identical | +1.4 [S] to +6 (model 13.98 against 8.02; harsh variant +4.1) in every match where it would not otherwise trip | 1 | High if a clue misfires: about -5 in that match | Submit with the clue on: a score identical to two decimals means no effective false latch (the scorer replays 48 fixed seeds). Local FFA: latch by 70 s in a hunter field. |
| 7 | **FFA stance table and kill-secure** (L7, `stance.js`), section 4. | 0 | About +0.5, in places 1-4. The model cannot separate thresholds above 4 alive (13.97 against 13.98) | 2 | Medium | 200 local 16-bot matches: deaths before 90 s <= 2%, mean score, share of fights we start at 5 or more alive (0 except kill-secure and cornered). |
| 8 | **FFA economy and concealment** (L5, L7; D11). Farm only when `near(150)=0` and HP >= 90%; plating first; uncontested drops only; rest behind buildings; break sight 5 s then turn 90 deg; leave when a mech comes inside 60 m. | 0 | About +1, unproven: winners held 26 cubes and 1.0 drops against 9 and 0.1 for places 2-4; a bot that stood still 74% of the time averaged 4.8th [S] | 2 | Medium | Local FFA: 10 cubes by 120 s; under 3% of standing time in open sight; damage taken under 15 HP/s. |

```
// change 6, FFA latch; t < 200 s for the death clue
uncaused = (16 - alive) - ourKills
gunless  = distinct mechs listed without "gun"             // preset gunlessClue, ON after the identical-score test
ignored  = distinct mechs that for 3 s had a line of fire both ways within 160 m, held us inside their
           120 deg wedge, never aimed within 12 deg of us and did no damage      // preset ignoredClue, OFF
FFA = uncaused >= 3 || gunless >= 2 || (gunless >= 1 && uncaused >= 1) || ignored >= 2      // never unlatches
```

Why `gunless`: the house bots held a gun in all 19,757 live mech-frames of the replay and in three recorded practice matches [M S07], while six of seven recorded winners ended without one [S]. It can trip in a quiet field, where three deaths may not come before 200 s. That field is the model's worst case for an unlatched bot: a hunter among 15 evaders scores 0.33.

Not building before the final: roof posts, utility arbitration, the occupancy grid and sector table, a routing heatmap, a learned agent.

## 4. Final-round policy

P = `hp*b/(hp_t*a_t)`; win chance P^3/(1+P^3). Burst = `45*m*ammo*q(d) + 315*m*[beam ready]`, m = 1 + 0.04*cubes, x1.5 from the target's rear arc.

| Alive | We may fire first when | Legs |
|---|---|---|
| 9 or more | Hostile to us (D0); or kill-secure: `hp_t <= 0.9*burst`, within 140 m, nobody else within 120 m, its aim over 20 deg off us. No chosen fight before 90 s. | Farm when `near(150)=0`; hide inside the next circle; 0.4 to 0.5 of the radius from the centre. |
| 5-8 | The same, or P >= 2.4 (93%) on an isolated, unaware mech: one magazine and one beam, then break sight for 5 s. | The same; inside the next circle 10 s early. |
| 4 | P >= 1.5 (77%). | Within 0.5 of the radius once `next_radius <= 70`. |
| 3 | P >= 1.4 (73%), and never the first of the three. On a `death` sound hit the survivor within 4 s (regeneration starts at 5 s). | A post with a wall behind; from 375 s the final point. |
| 2 | Our E higher: hide and hold the point. Otherwise attack at P >= 0.6: second place is banked. | The final point. |

Rules at every count:

- **Cornered.** An aware attacker within 110 m and cover more than 3 s away: shoot first, leave when the line breaks. Replay: initiators died in 18% of 33 engagements, responders in 45% [B].
- **Third party.** Kill-secure only. Fight sounds within 160 m: move to cover 80-120 m from the stronger mech, off its aim, and wait. The model gives +0.0 places; the gain is cubes.
- **Exposure.** Never visible below 55% HP. Never the nearest or the weakest mech in anyone's view when another is on offer (C9). One mech within 60 m raises the death rate from 0.36 to 2.02 per minute [S].
- **Sound.** Gunfire carries 320 m: 33% of the first circle, 71% of the second, all of the third. Silence is worth something until 195 s; afterwards cover is.

Exploits to ship, in order: (1) break sight for the 5 s of memory, then turn 90 degrees, so shoot-on-sight bots find each other; (2) the final point from 375 s, old-centre side if displaced; (3) hold fire at 3 alive (14.9 against 14.0); (4) kill-secure from behind; (5) step behind cover when a charging laser's aim is within 0.25 rad; (6) seeded jink beyond 78 m against linear lead; (7) corner ambush on a pursuer.

Never in the final: start a fight at 5 or more alive outside the two exceptions; stand in open sight (winners 0.7% of standing time, bottom half 39%); walk toward gunfire; chase; boost except to break sight (winners 11% of the time, bottom half 25%); contest a drop ring; carry a mortar; farm with a mech believed within 150 m; stand on the dead centre before `next_radius <= 70` (0.85 against 0.55 deaths per minute); rely on head-only cover.

## 5. Open questions for real submissions and replays

| Question | Experiment | What the result changes |
|---|---|---|
| Does any latch clue fire in practice? | Submit the base, then the base with `gunlessClue`, then with `ignoredClue`. | Identical score: ship the clue on. Any difference: off for good. |
| Does the latch trip in a real FFA, and when? | Log latch time and clue in every private room, showdown and qualifier match. | Later than 90 s, or never, in a quiet field: turn `ignoredClue` on, or add "nobody hostile by 90 s". |
| Do today's hunters shoot at a mech showing only its top? | One submission with `headExposure` 0.1 against 0.5; in any recording count shots at us while our centre is hidden. | A gain of 0.3 or more reopens roof posts as a flagged test after qualifying. A loss sets 0.5 everywhere and closes roofs. |
| Is the idle pull worth anything? | One submission each way. | Under 0.3 apart: keep it off, the safer setting for the final. |
| How often are we alive at 375 s in practice, and with how many hunters left? | Local logs; a submission with the final point off. | Identical score: never reached, drop it from practice tuning. A gain: add cover search on the point. |
| How quiet is the final field? | Count foreign deaths by 90 s in qualifier matches. | Six or more: pure evasion scores highest (model 13.98). Two or fewer: an evader averages 7.4, the economy and the last circle decide; farm harder and tune changes 2 and 8 first. |
| Do untracked attackers matter against a squad? | From our practice logs: share of first hits from unlisted mechs, and the rear share. | Under 15%: keep change 5 for the final only. |
| Where does the last circle end? | Record `next_center` of phases 5 and 6 over all matches. | Sets rho for the finale cost and whether cover on the point exists. |

## Sources

Read this round: CS2 behaviour trees, https://www.source2.wiki/Scripting/Counter-Strike%202/bot-behavior-trees (trees re-checked every tick, about 64 per second; `memory_to_expire` by time and distance). Justesen et al., https://arxiv.org/abs/2501.00078 (abstract: supervised learning on human trajectories, a 2v2 game, no win-rate claim). Shi, Mao and Hao 2021, https://doi.org/10.1145/3490700.3490703 (abstract through Semantic Scholar: rank scoring gives strong teams little incentive; three graph-based scores proposed). Sagong, Woo and Kim 2025, https://doi.org/10.1016/j.entcom.2025.101040 (title and reference list only; the abstract was not reachable). Other sources are listed in [A] and [B].
