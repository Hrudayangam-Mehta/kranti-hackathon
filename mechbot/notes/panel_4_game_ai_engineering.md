# Panel 4: game-AI engineering

**Thesis.** CPU is not the constraint: a raycast in our `world.js` costs about 1 µs, so exact per-cell evaluation replaces heatmaps and belief filters. The map is the constraint: cover is rare, so the bot must pre-position at precomputed posts, commit to modes with hysteresis, and never lose a tick.

## Measurements (Bun 1.4.4, real map; `tools/panel4/*.js`)

- Ray, 30-250 m: 0.9-1.5 µs alone, 0.42 µs batched.
- Every passable 2 m cell in a 20/30/40 m disc (276/592/1,018 cells), 3 threats, 7 rays each: mean 0.8/1.5/3.0 ms, p99 2.7/5.6/11.5 ms.
- A* over 80/200/500 m: mean 0.18/0.47/1.43 ms, worst 6.4 ms.
- From a random exposed point with 1/2/3 enemies firing, a hide cell exists within 20 m in 30/14/10% of cases and within 40 m in 59/41/36%; among wall-adjacent cells out to 120 m in 95/92/90% (median 38/48/53 m).
- At a post (E4) we are unexposed or within 8 m of a hide in 85/74/66% of cases; at any wall-adjacent cell 62/44/33%.

## (a) World model: E1 (P0)

- **Tracks**: typed arrays by id: pos, vel, `vEma=0.5*vel+0.5*vEma`, aim, hp, weapons, `tSeen`, 30-tick damage rings. Listed = truth. Unlisted: dead-reckon 1 s, freeze, `conf=exp(-(t-tSeen)/4)`, drop at 12 s; `conf` multiplies every threat term.
- `dt=obs.t-lastT`. Call `nav.setBody` on every cube (2-3 ms; 5,900 cells close by 10 cubes).
- **Objects**: pools of 128; delete after 3 ticks unlisted while within 40 m and `canSee`.
- **Sound**: 12 yaw sectors, `heard[s]+=w` (step/reload 3, boost/jet 2, weapons 1.5/1/0.3 near/mid/far, unseen `damaged` 5), half to each neighbour, x0.977 per tick. Used for scanning only.

*Fails if* a frozen track is stale: `conf` bounds the error to 12 s.

## (b) Modes: E2 (P0)

One mode owns the legs; dodge, fire control and torso facing are always-on overlays (Halo 2's prioritised behaviours [3]). Plans are "go to, then act": no planner (F.E.A.R. [2]).

`hpF=hp/max_hp`; `rho` = Panel 1's ratio (4 if nobody fires at us); `nLos` = mechs with line of fire in the last 2 s; `slack=tOut-1.3*dSafe/v_walk-4`, stepping the zone schedule at 0.5 s.

- ZONE: `in_zone ? clamp(1.25-slack/8,0,1.25) : 2`. Go inside 0.8 x next radius.
- HEAL: `hpF>=0.9 ? 0 : 1.6*max(0,0.75-hpF)+0.3*[rho<0.8]+0.2*[nLos>=3]+0.35*[kill within 1 s]`. Hide cell, hold fire.
- FIGHT: `F=0.5+0.25*clamp(log2(rho),-2,2)+0.15*[hpT<=400]`; needs a peek pair within 12 m or range 85-150 m (Panel 2). Peek or strafe.
- KITE: `F-0.05+0.3*[d<85 or lightning holder within 60 m]`. Retreat, torso firing.
- LOOT: `[unexposed 3 s]*(0.15+0.5*min(1,20*V/t))`; V: cube 1 (0 at 10), crate 1.5, weapon for an empty slot 3; `t=path/v_walk+hpObj/107+1`.
- DROP: `[Panel 1 R9 gate]*(0.7+0.25*(1-hpF))`.
- POSITION: 0.2. Best post, scan.

Winner = `argmax(U+0.10*[current])`; switch after the challenger leads 2 ticks and dwell >= 0.6 s; `U>=1` switches at once. HEAL latches until `hpF>=0.9`, an enemy fires from within 40 m, or ZONE >= 1.

*Fails if* modes thrash: above 12 switches/min, raise the 0.10 bonus.

## (c) Position evaluation: E3 (P0), E4 (P0), E5 (P1)

**E3, tier A** (every 3 ticks, or on a mode or target change): every passable cell within 24 m (about 400). For the top 4 threats by `a_i*conf_i`: `E_i(c)` = 1 if `shotClear(muzzle_i, centre_c)`, 0.5 if only the head is clear, else 0.

```
X(c)  = sum(a_i*conf_i*E_i(c))
L(c)  = shotClear(muzzle_c, targetCentre)
P(c)  = 1 if a cell within 4 m has X=0 and walkLine
tM(c) = dist*(walkLine ? 1 : 1.4)/v_walk
S(c)  = 5*(wB*B*q(d_c)*L(c)-wX*X(c)*(1-0.45*P(c)))-X(me)*tM(c)
        -1e4*[outside circle at t+tM+10]-40*[wallDist<radius+0.5]
        -60*[drone within 45 m]+30*[c is the goal]
```

Units: `X` in HP/s, `S` in HP. `wB,wX`: FIGHT 1,1.5; KITE 0.5,2; HEAL 0,3 (`B` our dps, `q` hit probability, 0.45 the hidden share of the 5.3 s gun cycle). Change goal only if `S_new-S_goal>60`. This is Killzone's weighted sum [1][7] with exact rays.

Budget: `RAY_BUDGET=2500` per tick, about 280 cells (0.9 ms here; p99 about 10 ms if the scoring host is 3x slower). Tier A is 3,600 rays = 2 ticks; the cursor persists, best-so-far is always usable, and count budgets keep the bot deterministic.

**Tier B** (no `X=0` cell in tier A, or HEAL/KITE): cells with `wallDist` 2.5-6 m in rings to 120 m, stop at the first hide + 10 m, A* the best 3, take the shortest (19-40% of hides within 40 m straight need a path over 60 m).

*Fails if* threats outrun the 0.3 s refresh: re-ray the goal cell every tick.

**E4, posts.** At init build Killzone's sector table [1]: about 23,700 cells with `wallDist<=8` x 16 yaw sectors, free ray distance capped at 120 m (369 KB, 0.49 s). Post = at least 10 sectors blocked within 25 m and one open beyond 80 m (about 2,950 cells; the nearest is typically within 50 m). POSITION and LOOT end at `argmax(blocked+2*[an open sector faces the zone centre]-path/20)` inside the next circle. *Fails if* the post is a mortar trap: leave after 2 shells within 7 m.

**E5, peek machine.** `tStep(4 m)=v/a+(4-v*v/(2a))/v=0.44 s` (0.73 while charging).

- HIDE to OUT when `readyIn<=tStep+0.1` (`reload` if the magazine is empty, else `cooldown`).
- EXPOSED to IN on the first of: `ammo<=ceil(tStep/cooldown)` (2 rounds, fired on the way in); damage taken this peek `>=max(135,dealt/3)`; a second threat gains line of fire; a `charging` enemy aims within 3 deg of us; 3.2 s exposed.
- IN to HIDE within 1 m; `reload` once line of fire breaks. After 2 peeks without seeing the target, rerun tier A.

*Fails if* the hide cell is flanked: `X(hide)>0` forces tier B.

## (d) Movement: E6 (P0)

- **Follow**: steer at the farthest path point within `clamp(0.6*speed,4,10)` m passing `walkLine`. Replan every 0.5 s, when the goal moves 4 m, or when stuck; one A* per tick (`maxExpand` 8,000).
- **Brake**: within 2 m, `|move|=dist/2`; no boost within 6 m.
- **Context steering** [5]: 16 direction slots, interest = path direction + Panel 2 strafe; mask slots whose `walkLine` 4 m ahead fails or that leave the circle.
- **Wall slide**: `|vel|<0.5*|commanded|` for 0.3 s: project the move onto the wall tangent (gradient of `wallDist`) plus 0.3 outward.
- **Stuck ladder** (under 0.9 m in 0.6 s while commanding): jump + seeded 90 deg sidestep 0.4 s; at 1.2 s replan with +50 m cost within 4 m; at 2 s jet up to 1 s; at 4 s abandon the goal for 10 s.

*Fails if* the sidestep enters a pocket: the loss is capped at 4 s.

## (e) Fire control and scan: E7 (P0), E8 (P1)

- **E7.** Fire control runs after the mode, sees only `{target, holdFire, lookHint}`, owns `aim`, `fire`, `reload`. It fires in every mode when the Panel 2 gate passes, except HEAL (unless the shot kills). A laser release due within 2 ticks takes the aim from the gun. *Fails if* it shoots the corner: hold fire until `L(me)`.
- **E8.** No target: 12 sectors, `priority=open_s*(t-lastLooked_s)+3*heard_s+2*[track bearing]`, `open_s` = `raySight` fraction over 100 m; dwell 0.2 s after arriving. `damaged` from an unseen attacker snaps the torso to its bearing. *Fails if* scanning shows our back to a known track: with `conf>0.5`, cap the yaw offset at 90 deg.

## (f) Robustness: E9 (P0), E10 (P0), E11 (P1)

- **E9.** Eight stages, each in try/catch with its last good output; 3 exceptions in 100 ticks disable a stage for 50. Skip optional stages after 12 ms; a tick over 30 ms halves `RAY_BUDGET` for 20 ticks. Every loop is capped. *Fails if* NaN passes silently: `Number.isFinite` on stage outputs.
- **E10.** The first tick costs 11.4 ms cold (Node 21.5) against 1.6 warm: before `ready` run 300 synthetic ticks, 20,000 rays and 30 paths (2 s cap). *Fails if* a code path stays cold: include fight, heal and loot observations.
- **E11.** Typed pools, one reused action object, no closures in candidate loops (churn: worst tick 7.0 vs 6.6 ms), randomness only from `makeRng(hello.seed)`. *Fails if* a wall-clock cut fires in the simulator: reject that run.

## (g) Tuning: E12 (P1)

One flat `PARAMS` with `[min,max]`; `createBrain(hello, ctx, overrides)`; values derived from `hello.config`. `debugState()` counts seconds and damage per mode, switches, peeks, stuck events, overruns. Constants above are untuned starting values: sweep at most 8 with paired seeds, halving 24, 96, 200 matches. *Fails if* sim house bots differ from real ones: confirm the top 2 by submission.

## Disagreements with the user notes

1. Seven arbitrated agents: blended proposals give indecisive motion; use exclusive modes plus overlays.
2. Bayesian sound fusion: 7 deg noise and three range buckets cannot place a mech; scan sectors suffice.
3. Threat heatmap [6]: 138,700 cells to refresh against 3,600 exact rays (1.3 ms).
4. Visibility, cover and roof graphs: `wallDist` and the sector table suffice; a roof layer is P2.

Kept: deterministic planner, utility arbitration [4], torso on the attacker, zone forecasting.

## Sources

1. Killzone's AI: https://www.guerrilla-games.com/media/News/Files/gdce05_killzone_ai.pdf
2. Orkin, F.E.A.R.: https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf
3. Isla, Halo 2: https://gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai
4. Mark, Dill, utility: https://gdcvault.com/play/1012410
5. Fray, context steering: http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf
6. Mark, influence maps: https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter30_Modular_Tactical_Influence_Maps.pdf
7. Jack, position selection: http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter26_Tactical_Position_Selection.pdf
