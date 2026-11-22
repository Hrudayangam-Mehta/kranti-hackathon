# Stance playbook (`mechfight/1`)

Numbers are `hello.config` defaults. [P1] = `notes/panel_1_game_theory.md`. [R] = our scripts on the official house-bot FFA replay (`tools/tactics/*.py`; one match, small samples). No squad replay exists: squad claims are marked ASSUMPTION with a test.

## 0. Derived constants

- Dodge range `252·sqrt(2(R+0.3)/58.5)` = 78 m (94 m at 10 cubes); [R] house guns hit 98% under 40 m, 78% at 40-80 m, 29% at 80-130 m, 18% beyond.
- Turn: 90° in 0.39 s, 180° in 0.79 s; [R] house bots took a median 1.5-2.0 s to face a new attacker.
- Gun: 540 HP per 2.64 s magazine, 107 dps sustained. Laser: 315 per 2.4 s (a tap: only 151). Rear: 67.5 per round, 472 per beam.
- Regen: 5 s + ΔH/45 (50% to 90% in 17.4 s). Boost: 46 m gained on a walker per tank.
- Final shrink: radius = 415 − t; deaths follow `E=hp−260·d` (d = metres off-centre).

## A. Stances

Inputs: `hpf=hp/max_hp`; `n1` = mechs with line of fire on us (last 2 s) that aim within 12° of us or damaged us within 3 s; `n120` = tracked mechs within 120 m; `A` = their dps on us; `P=min hp·b_i/(h_i·a_i)` [P1]; `tCover` = path time to the nearest cell hidden from them all. A bolder stance needs its condition true for 1.0 s, then holds 3 s; falling back is immediate.

**DEFENSIVE** (default). Enter: start; `hpf<0.5`; `n1≥2`; `P<1`; target unseen 4 s; zone margin under 4 s. Range 85-140 m. Peek ≤1.2 s (5 rounds or one beam), hide ≥2.4 s: exposure 33%. First shot: SQUAD yes, at any hunter in band from a corner (shared vision: silence hides nothing); FFA only a kill-secure (target ≤300 HP) or the back of a mech fighting someone else. Loot detour ≤40 m when `n120=0`.

**OPPORTUNIST.** Enter: `hpf≥0.7`, `n1≤1`, plus one of: SQUAD lone hunter (`n1=1`, `n120≤2`, `P≥1.25`); FFA mech at ≤35% HP within 140 m, not aiming at us, nobody else within 100 m; FFA `death` heard near or mid, survivor seen at ≤50% HP within 5 s; a drop we reach 2 s first. Exit: any DEFENSIVE rule, or 12 s without a `hit` in the last 4 s. Range 70-120 m; fires first at its target only; full-magazine peeks (exposure 50%); loot detour ≤80 m.

**OFFENSIVE.** Enter: `hpf≥0.75`, `n1≤1`, plus one of: finish (target ≤400 HP, `P≥1.5`, no other mech within 100 m of it); SQUAD idle (`n1=0` for 25 s, `hpf≥0.9`, `Q≥3`: seek the nearest isolated house bot); FFA endgame (M11); FFA `P≥` 1.85/1.6/1.35/1.25/1.0 at alive ≥9/5-8/4/3/2 [P1] against an isolated mech. Exit: `hpf<0.45`; `n1≥2` with `P<1.5`; target unseen 6 s; `hp/A<6 s`. Range 45-80 m (30-40 m with lightning; else never under 50 m from a lightning holder); exposure 80%; loot within 15 m of the path.

**LAST-STAND.** Enter: `hp<A·(tCover+1)`; `n1≥3` with no hidden cell in reach; `hpf<0.25` with `n1≥1` and `tCover>3 s`; final shrink begun. Exit: `n1=0` for 3 s. Hold a bastion (wall ≤4 m behind, open arc ≤100°), fire continuously, never show the back. Target: SQUAD the smallest `h_i/(b·m_i)` [P1]; FFA whoever we can still outlast or kill, else the top attacker. No loot, no drops.

## B. Which environment

`ENV` starts SQUAD.

- `F` (FFA evidence): +2 per beam with `by≠us`, no path point within 8 m of us, ending within 6 m of a tracked mech; +1 when a visible in-zone mech over 20 m from us loses ≥40 HP in ≤0.5 s without a `hit` of ours; +1.5 per death before 150 s that is not our kill.
- `Q` (squad evidence): +1 per 3 s in which two visible mechs within 80 m of each other, with mutual line of fire, ignore each other while one aims at us; +2 once three mechs have damaged us with no foreign death; +2 at 100 s with no foreign death.

`F≥3` from two distinct victims (`F≥5` if `Q≥3`) latches FFA; else SQUAD. Why: mistaking practice for FFA scores about 0; squad rules in a real FFA are only briefly too eager ([R] first death 41.7 s, five by 70 s). ASSUMPTION: house bots never damage each other, even by splash or chain; test: log `F` over practice matches.

## C. Manoeuvres

One decision = 0.1 s. Hide cell = no line of fire from any tracked threat.

**M1 Patient hold** (both). Trigger: `n1=0` and `hpf<0.9`; in FFA also the idle default. Do: hide cell inside the next circle, over 50 m from drones; no fire (damage dealt restarts the timer); move ≤5 m/s (`|move|≤0.42`: silent). Abort: line of fire within 60 m; zone margin < path time + 4 s. Gain: 45 HP/s; in FFA others die meanwhile ([R] 15 deaths in 210 s). Risk: regen is symmetric: never reset a duel we lead [P1].

**M2 Corner ambush** (both; main squad kill). Trigger: one pursuer, sight just broken, `hpf≥0.5`. Do: stop `x=min(85, dP·11.7/vP−12)` m past the corner (`dP`, `vP`: its path distance and speed; skip if `x<45`), stand still, pre-aim 3 m off the wall edge (we track it for 5 s). At its path time ≤0.8 s hold the laser 8 decisions; release on first sight, add the stance's burst while sidestepping to a hide cell ≤6 m away, reload, re-peek. Abort: a second hunter gets a line; the pursuer stalls 3 s or holds a mortar. Gain: a free beam (315; 472 into a turned torso) plus 2-4 pre-aimed rounds. Risk: [R] only 46% advanced after losing sight.

**M3 Shoot and relocate** (both). Trigger: any cover fight; mandatory against laser or mortar. Do: peek, fire the stance's burst, hide, reload while walking to a peek cell ≥10 m away. When leading, re-hit within 4 s so the target never regenerates. Abort: enemy inside 60 m (fall back to 85 m). Gain: pre-aimed beams (315) and lobbed shells (360) hit empty ground.

**M4 False attack** (both). Trigger: an idle or lone mech at 120-160 m, its nearest ally over 100 m away, our ambush corner ≤10 m off. Do: 3-4 rounds (≤1 s), break sight, run M2. Variant: charge the laser in a peeker's view so it hides; release on a clear line before the 2.75 s self-fire. Abort: two mechs respond. Gain: an isolated duel; [R] after a first hit from beyond 120 m, 62% of house bots closed ≥10 m within 5 s, while hitting 18% out there. ASSUMPTION: squad hunters respond singly and dodge charges; test: responders per pull, lateral speed after `charge` events.

**M5 Third party** (FFA). Trigger: fight evidence within 200 m. Do: move silently to cover 80-120 m from the stronger duelist, over 110° off its aim. Hold fire until the weaker is under 35% HP, 8 s have passed, or a `death` sounds; a duelist ≤300 HP is shot at once. Attack the survivor within 4 s (regen starts at 5 s) if it is ≤50% HP and nobody else is within 120 m: rear beam 472, rear magazine 810. Abort: survivor above 50%; a third mech within 120 m. Gain: [R] killers held a median 69% HP, ≤41% in 6 of 13 kills.

**M6 Pull-through** (FFA). Trigger: pursuer X behind, mech Y within 150 m ahead, `hpf≥0.6`. Do: route so X's path passes within 45 m of Y or through Y's 120° wedge while a building screens us from Y; then break sight of both: no fire, ≤5 m/s, 5 s. Abort: Y aims at us; X within 60 m. Gain: X becomes Y's fight, feeding M5. ASSUMPTION: bots take the nearest visible target; test: X's aim once Y is within 45 m.

**M7 Drone drag** (both). Trigger: retreating past a drone home within 80 m. Do: pass 47-55 m from it so the pursuer's straight line cuts inside its 45 m aggro; never shoot it. Abort: `damaged` by `npc`. Gain: 25 dps, and each hit restarts the pursuer's regen timer. ASSUMPTION: hunters cut straight through; test in the simulator.

**M8 Ring watch** (both). Trigger: drop with `lands_in≤12 s`. Do: capture ourselves only if no enemy can reach the ring by `lands_in+6 s` and `hp>A·(tApproach+4)+200` [P1]. Else watch from cover 60-100 m away, pre-aimed; when `holder` appears with `T` s left, fire only if `holder.hp≤m·(315·beams+187·q·min(T,2.64))`, `m=1.5` from behind, `beams=1+floor(T/2.4)` (0 without a laser). Abort: another enemy within 100 m. Gain: a target pinned inside 8 m. ASSUMPTION: squad bots capture as in [R] (8-12 s after landing); test on practice replays.

**M9 Zone-edge gate** (both, late). Trigger: shrink within 10 s, we are inside the next circle. Do: stand 20-30 m inside its edge in cover, edge behind us. If a mech is tracked outside within 150 m and nobody inside is within 120 m, face out and shoot it crossing: each metre costs it 5.1/8.5/13.7 HP at zone dps 60/100/160, without regen. Abort: we take over 100 dps.

**M10 Disengage** (both). Trigger: `hp/A<1.5·tCover+2 s`; `hpf<0.4`; `n1≥2` with `P<1.5`; lightning holder within 50 m; laser charging at us with a hide cell reachable in time. Do: legs to the hide cell blocking the top attacker (boost above 25 energy), torso stays on it; then move ≥5 s and ≥60 m, turning once unseen; in SQUAD away from the squad centroid. Abort: no hide cell means LAST-STAND. ASSUMPTION: the squad loses us 5 s after its last sighting; test: pursuer headings after 5 s unseen.

**M11 Endgame switch** (FFA at alive ≤4; both in the final shrink). Rank visible mechs by `E` (HP before 390 s). Top: no fights; hide on the moving centre, regenerate, stop trading by `390−5−(max_hp−hp)/45` s. Otherwise attack the smallest positive `E_i−E_us`, never one below us unless it is hitting us; with 3 alive prefer the one the third is shooting; with 4 only a kill-secure, or when bottom. Two alive: attack if `P≥1` or `E_us<E_enemy`, else hide. Final 25 s: a metre off-centre costs 260 HP, a second of gunfire about 150: fight from the centre. Practice too: every house bot below our `E` dies first and scores.

## D. Arbitration between roles

Legs, torso and triggers are separate channels, one owner each per decision.

- Legs: survival > zone > combat > ambush > loot > hold.
- Torso: threat (face the top attacker) > combat > ambush > loot > scan.
- Triggers: the weapon role picks weapon and timing; the stance gates the first shot.

Vetoes:

- Zone vetoes goals outside the next circle at arrival, laser charging with under 3 s of margin, and dodges adding over 1 s to the zone path.
- Survival vetoes combat, ambush and loot goals when `hp/A<1.5·tCover+2 s`.
- Threat vetoes any aim leaving an attacker of ≥60 dps more than 80° off our yaw. Two such attackers up to 160° apart: aim at their bisector; wider: face the larger and move to block the other.
- Combat vetoes loot beyond 6 m while a target is selected.
- Ambush may withhold the first shot for 3 s, only while `n1=0`.
- M1 vetoes fire except a kill-secure. Loot vetoes nothing; `take` and `pick` are never blocked.

Within a tier the larger expected HP swing over 3 s wins; ties: shorter path, then lower id. Hysteresis: a channel changes owner only when the challenger is 15% better or the owner has held 0.6 s (survival and zone pre-empt); targets switch at 1.3× index [P1].

## E. Clever but negative here

- Provoking house bots against each other in practice: they never fight; only pursuit can be shaped.
- Hitting a busy duelist so it turns its back on its opponent: [R] 3 of 14 busy house bots turned within 2 s. Shoot the back for damage instead.
- Shooting a capturer we cannot kill in its 4 s (capture heals fully), or brawling in the ring at 16 m, where house guns hit 98%.
- Leaving the zone to shake pursuit: 20-260 dps, no regen.
- Chasing a healthy runner: zero closing speed walking, and it regenerates.
