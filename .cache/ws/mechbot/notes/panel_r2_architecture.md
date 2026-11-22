# Panel R2: game-AI architecture

**[A]** architect, **[S]** systems engineer. Scripts: `tools/panel_r2/`. Replay: house-bot FFA on an old balance (walk 9.0 m/s, now 11.7), so priors only. Rays cost 1.1 µs here; budgets assume 4 µs. Ranked gains are model estimates.

**Thesis.** The report has the right shape and the wrong objective. Keep hard rules and exact rays for the fight, add a small belief layer, and score leg options as survival times payoff. Its biggest miss: in the replay, house bots never fired a gun without a clear line to the target's centre, so a position showing only our head is free fire, and here those positions are on roofs.

## 1. Belief state

[A] Isla's occupancy map [5] with one layer per enemy [6], on 8 m cells (9,472 open): sound bearing error (12 m at 100 m) and 0.5 s of walking (5.9 m) are each about one cell. A layer per enemy seen before, ghosts born from unexplained sounds, one pool for the never seen.

Replay, 16 observers, protocol sensing only:

- A mech has 0.37 others in sight, 0.36 in memory, 10.3 untracked. Of 64 opening hits, 24 came from an untracked attacker and 15 of those hit the rear arc (x1.5); with the attacker in sight, 0 of 30.
- A lost mech stays near its last known position: a median 13 m (p90 19 m) after 2 s, 24 m (46 m) after 5 s, 26 m (70 m) after 10 s (x1.3 today). Of 57 re-sightings, 93% fell inside the walk-speed disc and 93% within 30 degrees of the old bearing.
- So the grid locates a lost mech no better than its last known point (mode error 30 m against 27 m at 10 s): no gain in pre-aim.
- It improves scanning: before an untracked attacker's first hit, the house torso had it in the wedge 6 of 32 times, the belief wedge 21-23, a wedge on the last heard sound 18 (chance: 33%).
- It answers "is this area empty": expecting under 0.02 untracked mechs within 80 m, one was there 2.9% of the time (base rate 13.5%); over 0.7, 72-85%.

[S] Reference JavaScript: 4-10 ms per 0.5 s update with 12 layers. Budget per decision: 250k array operations, 180 rays, 0.7 MB, spread over five ticks.

```
// init, 71 ms.  CS = 8 m
open[c] u8;  rep[c] = passable nav cell nearest the centre (x, y, z)
link[c] u8: bit d set when a flood over the nav cells of both coarse cells joins rep[c] to rep[neighbour d]
layer e {m: f32[12194], box, alive};  pool {m, K};  sector[c][32] (section 2);  D_me = path distance to us (BFS, 1 Hz)

// every 0.5 s
for L in untracked layers, ghosts, pool:
  4 sub-steps, lam 0.7 (replay fit: 2 of 0.8 at walk 9.0, scaled by speed squared):
      out = lam * m[c] * min(1, sumW(c) / 5)
      m'[c] += m[c] - out;  m'[n_d] += out * W_d / sumW(c)        // W: 1 straight, 0.25 diagonal, linked cells only
      SQUAD prior: W_d *= exp(-kappa * (D_me[n_d] - D_me[c]) / CS)  // kappa 1 for the current hunter, 0.3 others
      // unvalidated: the FFA replay shows no pursuit (over 5 s untracked 42% came closer, 41% went away)
  seen-before layers:  m = 0.9 * m + 0.1 * uniform(pathDist(lastKnown, c) <= boost_speed * age)
      // reach floor: without it the 90% region held the truth 87% of the time at 2 s but 67-78% at 20 s (runners)
visible = cells within 45 m, or within 200 m and 60 deg of the torso, with sum_L m > 1e-4 and canSee(eye, rep + 4.5 or + 9)
for L:  m[visible] *= 0.1;  outside the current circle m *= 0.7;  normalise

// events
listed(e):         clear layer e.  First sighting: delete the ghost holding >= 0.2 within 16 m, else K -= 1
memory expired(e): m = delta(last listed position)
sound(kind, b, class): merge same kind and class within 12 deg, sigma = 7 deg / sqrt(n)
                   ignore if a tracked mech lies within 21 deg and the class band
                   lik(c) = exp(-0.5 * dAngle^2 / (sigma^2 + cellHalfAngle^2)) * [dmin - 8 <= d <= dmax + 8]
                   E_e = alive_e * sum(m_e * lik);  E_pool = K * sum(m_pool * lik)
                   best E >= 0.02: m *= 0.05 + lik, normalise.  Pool wins: ghost = pool.m * lik, K -= 1
                   step (40 m), boost and jet (90 m) with nothing in sight are the corner alarms
beam(by, path[0]): layer by = delta(path[0]).   bullet seen: m *= tube of one cell behind it along -vel
damaged(by, b):    m_by *= wedge(b, 3 deg) * [d <= weapon range] * sectorLOF(c -> us)
death not ours:    alive_e *= 1 - E_e / sum(E) on the death sound.   our kill: delete the layer

// consumers
scanYaw        = argmax over 36 yaws of sum over the 120 deg wedge of alive * m * exp(-d / 70), d <= 280   (torso, no target)
N80(x)         = sum of alive * m within 80 m of x            // HEAL and LOOT need N80 < 0.05
expExposure(x) = sum_e dps_e * sum over the 6 heaviest cells k of m[k] * sectorLOF(k -> x) * pHit(d)
                 // hide-cell choice and the evaluator's term for untracked enemies; no rays
eta(e), preAim = D_me[mode_e] / walk_speed;  first cell on the D_me descent from mode_e that can see us

// belief-lite (ranked item 1): no grid. Per lost track a disc at the last listed point with the replay's p90 radius
//   r(age) = walk_speed * min(age, 5) + 0.45 * walk_speed * max(0, age - 5);  N80 = number of discs reaching within 80 m
//   plus [a near or mid sound in the last 10 s];  scanYaw = 36-bin histogram of disc bearings and recent sound bearings
```

## 2. Threat heatmap

[A] Our exposure term is exact, local (24 m) and for tracked threats only; a heatmap is approximate, global, and can carry believed enemies.

[S] A Killzone-style line-of-fire table [4] (per 8 m cell, free fire distance in 32 sectors to 230 m) costs 303k rays: 0.8 s here, 1.2 s at 4 µs, 381 KB. It agrees with real rays on 93.4% of cell pairs and misses 7.9% of real lines.

- Static exposure does not predict damage: by visible-area quartile house bots took 7.3, 19.3, 17.7, 9.7 HP/s. Wall distance does (5.5 HP/s within 6.6 m of a wall, 17-19 beyond), and the evaluator has it.
- Exposure-weighted A*: 4-6% longer, exposure changed by -3% to +1%.
- Threat-aware A* by table lookup: 5 of 66 exposed metres saved per retreat, about 17 HP.

Verdict: build the table (one hour) as the O(1) line-of-fire lookup for belief consumers and panel 4's post finder. No routing heatmap and none in the fight: cover is a 2-4 m effect, the cells are 8 m.

## 3. Utility engine

[A] `0.35 Survival + ... + 0.05 Combat` fails four ways: a zero in zone safety costs only 0.10, so nothing vetoes; the terms share no unit; fixed weights cannot follow the match; and in practice combat is the whole score (a passive survivor scores 0). Shipped utility systems multiply considerations so any one can veto [2] and bucket urgent classes above the rest [3].

Right form in both environments: `U(a) = S_a * payoff_a`, S_a the probability of surviving the next 10 s under option a.

- Practice: payoff = kills expected in those 10 s plus kills expected later (panel 3's V, scaled by HP and cube power).
- FFA: payoff = `lambda * 10 + V`, lambda the field's death rate; duels enter through panel 1's win-probability threshold.

Hard rules stay: zone deadline, shell dodge, tick deadline, torso on the top attacker, no fire while healing, lightning stand-off, goals inside the next circle. Utility decides only who owns the legs. Against dithering: commitment x1.15, a two-evaluation lead, 0.6 s dwell, 3 s input averages, 5 Hz scoring, and the HEAL latch, because a bonus only moves an oscillation [2].

```
lg(x, mid, k) = 1 / (1 + exp(-k * (x - mid)))
inputs: hpF; rho = (hp - H_esc) * b / (h_t * A), 4 when A = 0; nLos (2 s); A (3 s mean); tCover; N80; eta (30 if none); tIdle; slack
bucket 0, hard:  ZONE when slack < 4 s or !in_zone;  DODGE when a shell lands within splash + 5 m
bucket 1, U = w * product; every factor floored at 0.05 except those marked veto
FIGHT  w 1.0   lg(log2(rho), 0, 2.2)                        // rho 0.5: 0.10   1: 0.50   2: 0.90
               1 / (1 + 0.8 * max(0, nLos - 1))^2           // nLos 1: 1.0   2: 0.31   3: 0.15
               clamp(q(d) * L, 0.2, 1);   x 1.5 when h_t <= 400
BREAK  w 0.9   1 - lg(log2(rho), 0, 2.2);  clamp(1.5 - tCover / 4, 0.2, 1);  clamp(A / 150, 0.2, 1)
HEAL   w 1.1   clamp((0.92 - hpF) / 0.52, 0, 1)^0.7  veto   // hpF 0.9: 0.10   0.7: 0.55   0.4: 1.0
               A == 0 for 1 s ? 1 : 0.25;   clamp(eta / (5 + (0.9 * max_hp - hp) / 45), 0.3, 1)
LOOT   w 0.6   clamp(20 * V / t, 0, 1);  clamp(1 - N80 / 0.3, 0.1, 1);  clamp((hpF - 0.5) / 0.4, 0, 1) veto
DROP   w 0.9   panel 1 R9 gate, veto;  0.7 + 0.25 * (1 - hpF)
PULL   w 0.5   clamp((hpF - 0.75) / 0.15, 0, 1) veto;  clamp((tIdle - 10) / 10, 0, 1);  1 / (1 + mechs within 60 m of the target)
POST   w 0.2   post quality 0.5 to 1                         // FFA: w 0.45 while alive > 4
FFA:   THIRD w 0.8  [a death or two mechs trading within 150 m];  lg(0.5 - hpF_survivor, 0, 10);
                    [no other track within 120 m] veto;  clamp((hpF - 0.5) / 0.3, 0, 1)
       FIGHT also gets lg(P - Pstar, 0, 6), Pstar = 1.85, 1.6, 1.35, 1.0 at 16, 8, 4, 2 alive; PULL is off
pick:  U[current] *= 1.15;  switch when a challenger leads twice running and dwell >= 0.6 s;  bucket 0 pre-empts at once
latch: HEAL holds until hpF >= 0.9, a line of fire from within 40 m, or bucket 0
check: hpF 0.5, nLos 1, q 0.8, A 100, tCover 3:
       rho 1.0 -> FIGHT 0.40, HEAL 0.24 (under fire), BREAK 0.23        fight
       rho 0.6 -> FIGHT 0.13, BREAK 0.38; once out of sight HEAL 0.95    break, then heal
```

## 4. What transfers

CS2 trees [1]:

- Conditions are re-checked every tick, so a higher-priority branch pre-empts a running one: our overlays.
- Memories expire by time and distance (`memory_to_expire`): expire a track by its reach, not only its age.
- Noise and damage are sensor types writing blackboard keys: sounds and `damaged` bearings belong in the belief layers.

Riot/modl.ai [7]: 225 rays dense at the crosshair, eight audio bins per sound type, LSTM memory; 1.95-18.8 ms per decision against 24.1 ms for a pixel model. It is imitation learning (judges called its clips human 30% of the time, real humans 60%). It shows cheap sensors suffice for human-like play, not that a belief planner wins; it has no explicit belief state. Transfer: spend rays where the decision is sensitive (2 m cells near corners, 8 m far away) and treat sound as directional evidence.

## 5. Rooftops

118 roof patches of at least 100 m² are reachable on one tank (61 m of climb); median height 14.6 m (p90 22.9), 1.8 s and 30 energy.

Roof-first looting loses: flat loot is hidden from the ground, 19 items lie on 88 large roofs, and house bots took 0 of 10 roof weapons.

Hiding by setback fails: a 20 m roof hides the body from a ground muzzle 60, 100 or 150 m from the edge only 42, 69 or 104 m back, and no reachable roof is deeper than 45 m (median 10 m).

Hull-down works: behind a step 4.6-6.8 m high, our muzzle (7 m) clears it and their line to our centre (4.5 m) does not.

- House bots aiming within 10 degrees at a seen target fired 1.52 shots/s with a clear centre line (534 s) and 0 shots in 41 s (86 episodes) with the centre hidden. One of 1,061 gun shots pointed at a hidden centre.
- On the ground such a cell lies within 24 m in 5% of duels at 100 m.
- 31 roofs have a cell with a one-sided line to at least 25% of the directions at 100 m (10 roofs: 40%); moving on the median roof covers 46%.
- Ground lightning cannot reach a post 12 m back on a 20 m roof.

Against it:

- The climb to a good post takes 2.2 s and 36 energy; airborne house bots took 31.5 HP/s against 14.8 on the ground.
- House bots jet-hop (167 hops, apex 15 m, 3 s) and may get a centre line at the apex.
- Mortars arc in, and a roof has no hide cell: drop off the far side when a lightning carrier lands on ours.
- Only 7 good posts lie within 240 m of the default centre.
- The gate is measured on an old build, guns only, in an FFA.

Verdict: a roof post is a strong duelling spot against gun hunters if today's house bots keep that gate. Unproven: ship it behind a flag and judge it by one submission. Minimal feature, about three hours:

```
// init, 0.6 s here, 351k rays
roof cell:   surfaceZ - ground > 6 and !bodyBlocked(x, y, surfaceZ, radius, height)
patch:       flood over roof cells with |dz| <= step_up; keep area >= 300 m2
launch/land: passable main-component ground cell within 8 m of a rim cell, smallest climb; keep 10 <= climb <= 45
per 4 m lattice cell, 24 directions, targets on the ground at 60 and 100 m:
   ours = shotClear(cell + muzzle_height, target + 4.5);  theirs = shotClear(target + 7, cell + 0.5 * height)
   one = ours and !theirs;  two = ours and theirs
post = {best cell, launch, land, climb, lattice cells with masks}       // rebuild masks when cubes change our heights

// SQUAD, PARAMS.roofPosts
choose: hpF >= 0.8, nobody has a line of fire, energy >= 1.5 * climb + 15, post inside the next circle for >= 60 s,
        path to launch <= 120 m;  score = popcount(one100) - path / 40
CLIMB:  moveTo(launch); jump; in the air hold boost and move toward land until pos.z >= roofZ + 0.3; keep moving until
        grounded at roofZ; torso on the threat throughout
ROOF:   candidates = patch cells within 12 m, scored by the existing evaluator with patch membership in place of
        nav.passable; steer straight; never command a move whose next 2 m leaves the patch; prefer targets in `one` directions
LEAVE:  zone slack < 8 s; a lightning holder with pos.z > roofZ - 3 within 45 m; 2 shells within 7 m; exposed 3 s at hpF < 0.5
        -> walk off the edge away from the threat; on landing nav.nearestPassable, resume ground play
```

First, at no navigation cost: weight head-only exposure to gun and laser holders 0.1 instead of 0.5, and aim at 0.8 of a target's height when only its top shows.

## Ranked modules

Order of the figures: practice kills before death, final places, hours, risk.

1. **Belief-lite** (reach disc per lost track, sound-driven torso, `N80` gate): +0.2 to +0.4, +0.3 to +0.5, 2 h, low.
2. **Ground hull-down** (head-only exposure 0.1, aim ladder): +0.1, +0.1, 1 h, low.
3. **Roof posts**, flagged, judged by one submission: +0.5 (range -1 to +2), +0.3, 3-4 h, high.
4. **Airborne targets** (vertical lead, target index x1.3; house bots are airborne 27% of the time): +0.1, +0.1, 1 h, low.
5. **Utility arbitration** of the legs: +0.2, +0.3, 2 h, medium.
6. **Full grid and sector table**, replacing 1: +0.1 more, +0.2, 4 h, medium.

Below the cut, promote 3 to first: only it has a large upside. Not building: routing heatmap, roof-first looting, setback hiding, a learned agent.

## Sources

Read unless marked.

1. CS2 bot trees: https://www.source2.wiki/Scripting/Counter-Strike%202/bot-behavior-trees (Valve's wiki page returned 403)
2. Lewis, Game AI Pro 3 ch. 13: http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf
3. Graham, Game AI Pro ch. 9: http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf
4. Killzone's AI: https://www.guerrilla-games.com/media/News/Files/gdce05_killzone_ai.pdf
5. Isla, Third Eye Crime (page blocked; from memory): https://ojs.aaai.org/index.php/AIIDE/article/view/12663
6. Weber, Mateas, Jhala (abstract only): https://ojs.aaai.org/index.php/AIIDE/article/view/12424
7. Justesen et al.: https://arxiv.org/abs/2501.00078

Not reached: Tozour, Bererton, Orkin, Mark.
