# Feature baseline from the public bots, and parity audit of our bot

Written 21 Nov 2026, about 06:00-06:25 UTC. Scope: (1) what the public competitor bots can do, grouped, with who
has it, the numbers they use, any effect measured on the official scorer and a verdict for us; (2) an audit
of our own bot against that list; (3) the ranked gap list.

Clean room: every sentence here is our own prose. Nothing from another team's repository was executed, and
no code, identifier or constant table was copied; numbers are quoted as plain facts about behaviour. Words
such as `plating`, `laser_damage` or `arena_margin` are protocol field names from `hello.config`, not other
teams' identifiers.

## 0. Sources, tags, state of our code

Sources: read-only clones in `intel/` (166 repositories); the twelve earlier clean-room studies in the
workflow journal; `notes/measured_deltas.md` (IDs such as R01, A05, G01 below refer to its rows);
`notes/intel_synthesis.md`; `notes/top10_name_map.md`; `notes/sparring_roster.md`; `notes/showdown_profiles.md`;
`notes/forensics.md`. New for this note: the two best public bots (5.58 and 5.33) were read in full or in
their core files, and four more top repositories through their commit histories.

Reference bots (tag used in the tables, best official practice score, how well the score is tied to the code):

| Tag | Team = repository | Score | Link | Language | Read how |
|---|---|---:|---|---|---|
| M | A-bot LLC = Kgc3105/MAGIC-Royale | 5.58 | high | TypeScript, Bun | whole bot, this note |
| P | tigerbyte, TigerTown27 = shaunkar1/proj1 | 5.33 (5.31 for its long-range profile) | low (medium) | Go | core files, this note |
| T | Wolverines = varchaskukreja/TTUN, version "v8-econ" | 5.19 | high | TypeScript, Bun | earlier study |
| T' | derivatives of T: Kanyaraasi 5.19, r1ver 5.10 / 5.08, Th3r0n "econ core" 5.02 | 5.02-5.19 | high | TypeScript | studies, commit logs |
| C | Mahalas = chriseco427-spec/CyprusBot | 5.08 | medium | Rust | commit log, README |
| B | BackwardsDeployeds = brycehcmcgrath/mechfight-bot (compiled build of the L controller) | 5.06 | medium | Python | earlier study |
| K | prakash-218/buildathon-mech v5 | 5.04 | low | Go | commit log |
| DV | 404 Competition Not Found = davidvarvas/mech-royale-bot | 5.02 | high | Python | commit log |
| N | RN SUS = JosiahAklog/nexus-mech-royale | 4.96 | high | Python | earlier study |
| L | LanceHuang245/mech-royale | 4.75 | high | Python | earlier study |
| U | nullat0m7/mech-royale | 4.46 | high | TypeScript, Node | earlier study |
| A | anthonyteti/buildathon-mech-royale | 4.46-4.50 | medium | TypeScript | earlier study |
| X | Team-Xero = arnabxero/xero-mech-royale | 3.75-3.90 | medium | Rust | earlier study |
| J | V.exe = jackbalseca/mech-royale-bot | 3.81-3.92 | high | Python | earlier study |

Other teams are named where a single measurement comes from them (alexwilldev 4.13, kyoto-max 3.98,
MauroMiranda28 4.00, dmclaughlin-bit 2.88, koillea 3.69 and so on).

Reading the labels. Bot tags (M, P, T, T', C, B, K, DV, N, L, U, A, X, J) appear only in the "Who has it",
"Values" and "Measured effect" columns. Labels with two digits and a leading zero (R01, A05, M03, X02) are rows
of `notes/measured_deltas.md`. Labels without a leading zero (F6, V2, E5, N5) are rows of this note. D0 to
D12 are sections of Doctrine V4 and appear only in the "Spec" column.

Verdicts. **MUST**: present in the best public bots (M, P or T) or measured positive on the official
scorer. **SHOULD**: present in several bots above 4.4, or cheap and supported by the replay. **OPTIONAL**:
one bot, or no measured effect. **AVOID**: measured negative. "Contested" marks a number on which the top
bots disagree: keep it as a named preset and decide on the real scorer. Noise reminder: one 48-match score
moves by about 0.3 from a seed change alone, so single deltas below that size only count as a class.

Status of our bot. Spec = `BRAIN_SPEC_V2.md`, whose top block "Doctrine V4" (05:50 UTC) replaces the
former amendment V3; section numbers D0-D12 below are that block, "V2 s.N" the older sections under it.
Code = `bot/lib/*.js` as it stood at 06:21 UTC (files last written 05:25-05:52 UTC, unchanged during the audit). **At that moment the
code still implemented the V2 numbers: none of the Doctrine V4 changes had reached `params.js`.** Status
words: CODE = in the code; SPEC = in the spec, not in the code; PART = partly in the code; DIFF = the code
does something else than the spec or the baseline; MISSING = in neither.

One measurement of our own was added for this note (N5 below): in the official replay no mech ever comes
closer than exactly 30.0 m to the map bounds, which is the `match.arena_margin` value in `hello.config`.

## 1. Fire control and execution

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| F1 | First-order gun intercept at the body centre, target size scaled by its cubes, with a latency allowance | every bot above 1.7; M 5.58, P 5.33, T 5.19 | latency 0.05 s (L, X), 0.06 (P, A), 0.075 for the lead in M; flight iterations 2-3 or closed form | +0.52 and +0.23 on starter-level bots (F03, F05) | MUST |
| F2 | Lead with the target's motion relative to our own (own velocity or predicted own position) | M, X, DV ("lead from the actual firing tick") | own velocity over 0.05-0.1 s | M's local sparring: laser hits 70% to 97%, gun 69% to 74% (F06, simulator) | MUST |
| F3 | Fire gate on the aim the torso will have after this decision's turn, not on the current aim | M, P | one tick of turn and pitch rate; gate width 0.6 to 0.85 of the target radius (M 0.6, U and B 0.75, P 0.85), P narrows to about a quarter of the radius when only part of the body shows | part of M's simulator bundle 4.54 to 5.17; no official A/B | MUST |
| F4 | Shoot only with a clear line from the muzzle (map ray, trees ignored) | all bots above 3; house bots too (848 of 851 shots) | muzzle pushed 3 m along the aim | part of +0.40 (F01) | MUST |
| F5 | Aim-point ladder when the centre is masked | M (chest, then shoulders at about 86% of the height), P (centre, top, then the left or right edge at three quarters of the radius), X (centre, +2 m, +3.6 m) | 2 to 4 rungs; little upward tolerance on the upper rung | inside +0.40 (F01) | MUST |
| F6 | Trigger held whenever the magazine is loaded and the gate passes, without waiting for the cooldown to read zero | M, P, T, L (no cooldown test at all); X and Th3r0n added it as an explicit fix | waiting for an observed zero gives one shot per 0.30 s instead of 0.24 s | X simulator duel wins 46% to 56% (F02); arithmetic: 20% of gun damage | MUST |
| F7 | Gun gate at long flight time | M (mechs only when the flight is under 0.8 s, about 200 m, or the target moves slower than 3 m/s), X (no gun beyond 140 m at targets faster than 4 m/s), A (beyond 170 m only at slow targets, free-for-all); T and L have none | 0.55-0.8 s of flight, or 100-170 m | removing a 100 m gate -0.34 (R09); X's gate is inside +0.40 (F01) | SHOULD |
| F8 | Lead adapted to how the target actually moves | P (five ways of estimating the velocity, scored each tick against the last second of the track at the current flight time; the best one is used), C (leads jittering mechs by 0.78 of their velocity, "measured on recorded matches"), N (short acceleration term); Th3r0n tried a strafe-aware lead and did not keep it | lead factor 0.5 to 1.0; averaging windows 0.5 and 1.0 s | none official | SHOULD |
| F9 | Vertical lead on airborne targets | P (ballistic with gravity, never below the ground), N (gravity for falling targets, at most 0.6 s), M (straight vertical velocity), T (capped at 0.3 s), X (damped to 30%) | - | replay: house bots are airborne about 30% of fight time and are then hit more often by a ballistic lead (92% against 57%) | SHOULD |
| F10 | Laser: hold to full charge, release only on target with a clear line, release early when the partial beam kills, start the charge shortly before the target is expected | M, P, T, L, U | release within 0.02-0.11 s of full; torso handed to the direct laser aim 0.2-0.3 s before full (X: from 80% charge); pre-charge when the target was seen within 1.0-1.5 s or is closing inside 60-70 m; gate 0.6-0.8 of the radius | inside +0.40 (F01); winners of recorded free-for-alls deal 70% of their damage with the laser | MUST |
| F11 | Keep charging and firing while retreating | M (in two steps: down to 15% health, then at any health), T (still shoots when aligned while running) | - | part of M's step to 5.58 (simulator +0.34 for the bundle) | MUST |
| F12 | Never dump a partial charge, never swap or drop a charging laser | M, T, X, U | forced release only after the hold limit | inside +0.40 (F01) | MUST |
| F13 | No new laser charge while a lightning carrier is closing (its arc cancels the charge and blocks the laser 2 s) | P | within about lightning range plus a margin | none | OPTIONAL in practice (hunters stay outside 45 m), SHOULD for the final |
| F14 | Lightning: fire inside range and cone with an energy reserve | all bots that carry it | range minus 1-2 m or 92-95% of it; M and T use 0.45 of the cone number, P 0.9 of it (the two read the rule's 30 degrees differently); reserve from one shot's cost up to 40 for non-mech targets | T tried the wider cone and dropped it; no score | MUST (basic); the cone reading is worth one test |
| F15 | Reload discipline | M (when empty; idle below 70% of the magazine after 1.5 s; in a fight without a line below about a third), A (idle below 60%), T (below half outside pure fights), P (stopped topping up after single rounds: it locked the gun for 2.4 s) | idle threshold 50-70% of the magazine | none official | SHOULD |
| F16 | Fire at a tracked target hidden by canopy | X (canopy model), implied for all by the 5 s of server-side tracking | - | none | OPTIONAL |
| F17 | Mortar: do not carry one when anything else is available (a laser hit does +60% to a mortar holder) | P, L, C (never picked up); M keeps it lowest; T uses it with a high arc | - | none; rule-based | AVOID carrying |
| F18 | Torso without a target: face the damage bearing, a near sound, the last track; a full turn at spawn and a periodic look around | M (alert 2.5 s on damage, 1.5 s on near sounds, a 1.8 s spin every 11 s when nobody is tracked), T (full turn in the first 3 s), C and P (full turn at spawn), K v6 | - | scan spins sit in two losing bundles (A27 -0.64, L11 -0.06), never isolated | SHOULD |
| F19 | Keep the front toward attackers (hits from behind do 1.5 times the damage) | M, P, T (turn to the damage bearing) | - | none | SHOULD |

Audit of our bot:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| F1 | V2 s.2 | `firecontrol.js: gunSolve` | CODE | latency default 0.10 s; the checkpoint note says the shot leaves on the first tick (0.05 s). Public values are 0.05-0.075. Sweep it. |
| F2 | D8 | `firecontrol.js: predictSelf` (own acceleration model) | CODE | - |
| F3 | D8 | `firecontrol.js: predYaw, predPitch`, gate in `run` | CODE | gate about 0.62 of the radius at 100 m, inside the public range |
| F4 | V2 s.2 | `firecontrol.js: muzzleClear` | CODE | - |
| F5 | D8 | `firecontrol.js: run` (centre, then 85% of the height) | CODE | two rungs; a flank rung is optional |
| F6 | D8 | `firecontrol.js: run` tests `cooldown <= readyCd`, `params.js: readyCd = 0.05` | **DIFF** | with 0.05 the gun fires every 0.30 s. Set 0.1 or drop the cooldown test: this is one fifth of our gun damage. |
| F7 | D2 (0.55 s unless steady 0.6 s or airborne) | none: fires out to 97% of gun range | SPEC | - |
| F8 | V2 s.2 | `firecontrol.js: gunSolve` halves the sideways lead after two reversals in 2 s (`senses.js` counts them) | PART | house bots reverse about every 1.1 s, so the half lead is active most of the time. It still hits inside about 110 m (error under the body radius) but misses a steady strafer beyond that. Check per range band in the simulator; public factors are 0.78 and "pick the best estimator from the track history". |
| F9 | tactics spec C5 (ballistic) | `firecontrol.js: gunSolve`: vertical speed for at most 0.3 s, no gravity | PART | cheap to make ballistic once the jet phase is over |
| F10 | V2 s.2, D8 | `firecontrol.js: run`, laser block | CODE | hand-over 0.2 s before full, forced release 1.5 s after full |
| F11 | D3 | `firecontrol.js: run` (charge allowed in DISENGAGE; blocked by `holdFire`, set only in HEAL after 0.5 s out of contact, `tactics.js: decideMode`) | CODE | also blocked in ZONE with under 3 s of slack and during a shell dodge |
| F12 | D7, D8 | `firecontrol.js: run` (`laserKeep`), `economy.js: wantPickup` | CODE | - |
| F13 | tactics spec C5 | none | SPEC | final only |
| F14 | V2 s.2 | `firecontrol.js: run`, lightning block | CODE | we fire only within 12 degrees of the axis; if the cone is 30 degrees to each side this is stricter than needed |
| F15 | V2 s.2 | `firecontrol.js: run`, reload block | PART | the idle rule reloads after 2 s of quiet even with 11 of 12 rounds; use a threshold near 8 of 12 |
| F16 | D8 | `firecontrol.js: run` (`blind`, 1.5 s) | CODE | - |
| F17 | D7 | `economy.js: wantPickup` (a mortar is never taken) | CODE | stricter than D7, fine |
| F18 | V2 s.2 | `firecontrol.js: scan` | CODE | no explicit full turn at spawn; the idle rotation covers it in about 4 s |
| F19 | V2 s.7 | `stance.js: aimVeto`, `firecontrol.js: scan` | CODE | - |

## 2. Movement and dodging

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| V1 | Strafe in every fight with seeded random reversals | all bots above 3 | reversal interval 0.35-1.05 s (T 5.19), 0.45-1.15 s (M 5.58), 0.35-0.9 s (P), 0.6-1.8 s (U), 0.8-2.2 s (A); house bots 1.1 s median; sideways stick 0.7-0.9 | "faster flips" -0.69 on one team with unpublished values (M03); 0.5-1.3 s neutral (M04); 0.4-0.9 s sits in two losing bundles (R04, R05); a seed-only change moved a score by 0.27 (D05) | MUST have; interval contested |
| V2 | Bullet-aware dodge: predict each visible enemy bullet's closest approach and change velocity | M (every candidate direction is scored with a model of its own acceleration; a bullet counts when it would pass within the body radius plus 2 m during the next 1.4 s; the weight was raised twice on the way to 5.58), T (sidestep across the bullet path when the closest approach within 0.9 s is under about 3.6 m; boost when energy is above 25), X (bullet and mortar dodging), K ("dodging", details not read) | horizon 0.9-1.4 s; margin radius plus 1-2 m | part of M's simulator steps (+0.34 bundle); X's bundle with it +0.33 (L08) | MUST |
| V3 | Mortar-shell dodge from the predicted impact point | M, P, T, L, X | danger radius = splash plus body plus 2-5 m; T reacts to impacts within 3 s and 11 m | none official | MUST |
| V4 | React to a laser charging at us | M (prefers a spot without a line to it unless our own laser is nearly charged; trigger: charging flag and its aim within 0.3 rad of us), T in practice only boost-strafes (within 0.25 rad, energy above 10) and deliberately does not run to cover, T's free-for-all line runs to cover (its own simulator: +0.76) | - | cover runs in practice sit in losing bundles: -0.71 (A17), -0.46 (M05) | SHOULD (cheap form); AVOID long cover runs in practice |
| V5 | Stay on the ground: no jump dodging | nobody jumps to dodge with success | - | replay: airborne mechs are hit 92% against 57% | AVOID |
| V6 | Boost with rules: outside the zone, to break a line under fire, to close for lightning, to back off when a mech gets well inside laser range | M (back off with boost when 15 m inside the band and energy above 45), T (lightning rush from 43-90 m with energy above 70; dodge boost above 25), DV ("boost-strafe in duels") | reserve 10-45 energy | recorded free-for-all winners boost 11% of the time, the bottom half 25% | SHOULD; AVOID boosting while roaming |
| V7 | Full walking speed while travelling in practice | L line after its fix, B, T' | - | quiet walking off: +0.21 (M01, reproduced by a second team), +0.13 (M02) | MUST in practice |
| V8 | Stuck recovery from displacement history, with a hop | M (under 1.8 m in 1.2 s while wanting to travel: mark the spot ahead as blocked for 20 s, replan, hop on the second time), T (0.6 s: jump and boost; 2.5 s: turn the move by a quarter; 4 s: reset) | - | charge-aware fix +0.04 (M06); Th3r0n found warm-up state leaking into the match (hops in the first 4 s) | MUST |
| V9 | Give up a goal that is not getting closer | M (6-16 s by kind of goal, then ignored for 30 s), P (cube 6 s plus travel allowance, ignored 60 s; crate 14 s, 90 s), X (14 s, 60 s), A, C | - | a stall of this kind cost one team 0.88 (F04) | MUST |
| V10 | Leave an enclosed pocket (stadium bowl, courtyard) by a jet hop | P (walks to the cheapest exit toward its goal), M (hop on repeated stall) | - | none | SHOULD |
| V11 | One scored choice of direction that blends goal, dodge, cover and zone | M (16 directions plus standing still), P | goal weight 1, zone 4, loot grab 2.5; dodge up to 10 per bullet; non-target sight lines 0.45 each | none isolated | OPTIONAL as architecture; the point is that dodging continues while travelling |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| V1 | D4: 0.8-1.6 s, never under 0.8 s, extra reversal when an enemy magazine starts | `mover.js: standoff`; `params.js: jinkLo 0.5, jinkHi 1.0`; only while a gun has a line and beyond 60 m (`brain.js: fightLegs`) | DIFF | code and spec disagree; and both top bots flip at 0.35-1.15 s, which the spec forbids on one team's unpublished result. Make it a preset (`fast` 0.45-1.15, `slow` 0.8-1.6) and settle it on the scorer. |
| V2 | D4 (the "main defence") | none (`senses.js` only counts bullets) | **SPEC** | the largest movement gap against M and T |
| V3 | V2 s.3 | `mover.js: shellDodge` | CODE | takes the legs over completely instead of blending |
| V4 | D4 | `brain.js: fightLegs` ("beamhide": cover within 6 m, 9 m boosting; otherwise keeps jinking) | CODE | - |
| V5 | D4 | jump only in `mover.js: stuckCheck` | CODE | - |
| V6 | V2 s.3, D2 | `brain.js: retreatLegs, fightLegs, legs`; `mover.js: zoneLegs` | PART | the D2 rule "boost away when a mech is inside 90 m while we hold a laser" is not coded |
| V7 | D3 | `brain.js: holdLegs`, `mover.js: moveTo` | CODE | creeping (stick 0.42) only for the last 15 m to a hold spot and in HEAL |
| V8 | V2 s.3 | `mover.js: stuckCheck` (speed and displacement, sidestep, jet, abandon) | CODE | no blocked-spot marking; warm-up runs on a scratch brain (`brain.js: warmUp`) but shares the navigator: keep a test that the first real decisions are identical with and without warm-up |
| V9 | V2 s.3 | `mover.js: moveTo, stuckCheck` (abandon after 4 s stuck or 1 s without a path), `economy.js` (failed takes ignored 30 s) | PART | no "not getting closer" timer for a cube or crate that has a path but cannot be reached |
| V10 | - | `nav.js: hopPlan` exists; nothing in `mover.js` or `brain.js` calls it | PART | wire it into zone travel and goal travel when we stand in a pocket |
| V11 | D4 (dodge weight 0.9) | mode-owned legs | SPEC | needed for V2 anyway |

## 3. Engagement and target rules

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| E1 | In practice take the fight while healthy; never hide first | every bot above 4.4 | - | hide-first or hold-fire postures lost 0.3 to 1.75 in ten tests by eight teams (A01, A13-A24, A31) | MUST; hide-first is AVOID in practice |
| E2 | Bounded engagement: answer whoever attacks, open only on mechs that are near or in sight within a limit | M (target with a line within 175 m, or within 60 m, or it hurt us in the last 4 s), P (a mech is hostile after aiming at us for a cumulative 0.6 s, after hitting us, or inside 30 m; its practice profile also opens on sight within 160 m above 60% health), J; T engages everything seen in the last 4 s at any range | 150-175 m with a line | hostile-only +0.23 (G02); wider aggression -0.18, -0.37, -0.29 (A23, A12, R11) | SHOULD |
| E3 | Target score = near, low health, visible, current target, whoever just hit us | M (distance per 60 m, health fraction times 1.5, a line worth 2.5, current target 0.6, recent attacker 1), T (distance plus 90 per full health plus 30 per second unseen, minus 50 for a recent attacker, minus 40 for the current target), P (similar, a line and a recent hit dominate) | stickiness worth 25-40 m of distance; attacker bonus 50-60 m | - | MUST |
| E4 | Prefer and hold a target that can be finished | B on the GT Goats bot (targets the current magazine can kill), M (a mech under half our health, or under 55% while we have 1.3 times its health, is never let go; band shortened to 45 m when it is under 30%), T (finish = under 20% with at most two threats), P (time to kill under 1.6 s) | - | +0.39 (G01), +0.34 in a bundle (A32), -0.09 for a heavier version with chasing (G03) | MUST |
| E5 | Stand-off range by loadout | gun only: T 70 m with a 15 m dead band, M 45-85 m, U 75 m, A 70 m. Holding a laser: M 125-185 m (5.58), P's long-range profile 200 m (5.31), Th3r0n 145 m (5.02, against 4.98 for the same core before that change: +0.04, noise), T 110 m (5.19), U 120 m. Holding lightning: 28 m (T), 12-36 m (M), boost in from 43-90 m | gun 45-90 m; laser 110-200 m (contested); lightning about 28 m | gun at 130 m with back-pedalling -0.77 (R01); 90 m beat 130 m (R08, bundle +0.53); closing to 40 m no effect (R02); laser sweep on a mid-table bot: 255 m 3.42, 230 m 3.79, 150 m 3.60, 110 m 4.13 (R06-R08) | MUST; laser value contested |
| E6 | Against a laser holder while we have none: close the range | M (band 30-60 m; also breaks off below 80% health when farther than 55 m), B and L ("outranged": cover, or charge in to 22 m when healthy) | 22-60 m | none official; X's simulator: gun only wins 8% of duels against a laser hunter | SHOULD (test as a preset) |
| E7 | Keep away from lightning carriers | M (at least 60 m when we have none), A (80 m), T's unscored branch (70 m) | 60-80 m | only in two losing bundles (R03, R05) | OPTIONAL in practice |
| E8 | Break off by number of shooters | T (two threats and under 55% health; three and under 80%), M (two and under 50%; six or more always: raised from four to six on the way to 5.58) | see R1 | "combined caution" -0.60 (A06) | MUST as thresholds; AVOID broad caution |
| E9 | Keep the duel isolated from other shooters | M (each non-target sight line costs 0.45 in the direction score), U (peek spots hidden from non-targets); T tried it and dropped it | - | none | OPTIONAL |
| E10 | Unseen attacker: place a phantom track from the damage bearing or the beam's origin, face it, do not stand there | M (beam origin when a beam is seen, else the bearing at 110 m, 35 m for lightning), P (same idea, 60 m for a mortar), L (a 120 m pseudo-threat) | - | none | MUST |
| E11 | Build up before the first kill (farm first, avoid mechs) | M (built, tested, left off: "none beat the current play"), P (a family of farm-first profiles, 4 to 21 cubes or 50 to 220 s, results not published), kyoto-max early farming | - | early farming run +0.27 (E01) | OPTIONAL |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| E1 | D3 | `tactics.js: decideMode`: HEAL below 40%, below 70% when the fight test fails, and **below 90% whenever nobody has had a line for 1 s** | **DIFF** | the third clause is the hide-and-wait behaviour that lost 0.5; D3 allows healing only below 55% out of contact or shortly after a losing retreat |
| E2 | D0, D5 | `tactics.js: selectTarget` (every listed mech is a candidate), `decideMode` (fight when it has a line on us, is within 150 m, we are hurt, or there is no loot) | PART | no hostile test, no opening guard |
| E3 | D5 (nearest first plus bonuses) | `tactics.js: selectTarget` (value over time-to-kill index, switch at 1.3 times) | DIFF | works, but is the V2 design; D5 not coded |
| E4 | D5 | `tactics.js: selectTarget` ("secure" = three gun hits or one beam), `decideMode` (finish = 400 hp and little incoming fire) | PART | not magazine-aware; "never leave a target under 25%" not coded |
| E5 | D2: gun 75 m (55-95), laser preset far 150 m or mid 115 m, lightning 28 m | `params.js: rPrefGun 115, band 85-140, rPrefLaser 120, rushR 38`; `STANCES` 110 m; `brain.js: fightLegs` | **DIFF** | 115 m with the gun is inside the measured loss region |
| E6 | not in the spec (D2 says no special rule) | none | MISSING | the 5.58 bot's answer to the laser hunter; worth one preset |
| E7 | D2: none in SQUAD | `brain.js: fightLegs` keeps about 78 m from a lightning holder | DIFF | harmless in practice, remove with D2 |
| E8 | D3 | `tactics.js: decideMode` uses a health-budget formula, not counts | SPEC | - |
| E9 | V2 s.4 | `tactics.js: makePosEval`, `brain.js: fightLegs` ("isolate") | CODE | - |
| E10 | checkpoint deviation 3 | `senses.js: senseEvents` (phantom on the damage bearing), `firecontrol.js: scan`, `tactics.js: decideMode` | PART | `obs.beams` is read only by the environment detector (`stance.js`); use the beam's first point as the shooter position |
| E11 | D0 (40 s guard only) | none | SPEC | optional |

## 4. Retreat and heal

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| R1 | Low-health break-off in a duel | M (under 40% unless the target is finishable), T (under 35% and the target's health fraction at least 0.1 above ours), P default 35%, L and B 38%. But P's 5.31 profile and C in practice never retreat | 35-40%, or never | removing it from the 5.58 bot -0.41 (A05, three changes); adding it to a 3.4 bot +0.14 (A28); breaking off at 72% -1.10 (A25); hiding under 50% or against 2+ -0.23 (A14) | MUST as a preset, default 35-40% |
| R2 | Re-engage threshold | M (75% with nobody tracked or after 8 s of quiet; 85% against one mech), P 80%, B 80%, T heals below 55%, or below 90% for 6 s after a retreat | 55-85% | 65% against 85%: -0.04 (A03) | SHOULD, preset 70% |
| R3 | Hold fire only when out of contact; shoot back whenever hit | M (holds fire while hiding only if not hit for 1 s, the target is above a quarter health and beyond 45 m), T (heal needs 4 s without any track) | - | hold-fire while being shot -0.34 (A09 against A08) | MUST |
| R4 | Retreat to cover hidden from every tracked mech, inside the future zone, kept for a few seconds | M (rings of 16 directions out to 72 m, then 95 and 125 m; 3 points per mech that still sees the spot; kept 1.5 s), T (16 directions to 36-50 m), L (16 by 7 radii to 75 m, kept 4 s), P (commits to distant cover when open ground offers none) | boost when exposed with energy above 15-30 | cover-first fighting -0.71, -0.94 (A17, A18): cover is for retreats, not for the fight | MUST for retreats |
| R5 | Pick up cubes while retreating or repairing | T (within 12 m while losing; no healing while a cube is within 40 m), P (within 28 m when not under fire) | 12-40 m | part of the 5.19 package | SHOULD |
| R6 | Rest in cover only when really hurt | T (under 55%), M (hide rules above; idle spot next to a wall that few directions can see) | - | standing still unseen below 85% -0.44 in a two-change bundle (A02); regen behind cover -0.08 (A07, A21) | MUST: heal only below about 55%; AVOID above |
| R7 | Leave a drone's reach when badly hurt | T's later version and Th3r0n's test (both unscored) | 75 m, under 50% health | none | OPTIONAL |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| R1 | D3 (35% with the 0.10 margin; 2 threats 50%; 3-5 threats 60%; 6 or more always) | `tactics.js: decideMode` (budget formula), `params.js: healEnter 0.4, healSoft 0.7` | SPEC | make "never retreat in practice" a second preset: one 5.31 and one 5.08 bot play that way |
| R2 | D3 (70%, preset) | `params.js: healExit 0.9` | SPEC | - |
| R3 | D3 | `tactics.js: decideMode` (`holdFire` only in HEAL after 0.5 s without a line) | CODE | - |
| R4 | D3 | `tactics.js: makeHideSearch`, `brain.js: retreatLegs` | CODE | - |
| R5 | D6 (12 m while losing) | `brain.js: retreatLegs` (cubes of our kill, only when quiet) | PART | - |
| R6 | D3 (55%) | `tactics.js: decideMode` (see E1) | DIFF | same fix as E1 |
| R7 | D6 (leave to 75 m under 50%) | `economy.js: nearDrone` only avoids loot near drones | SPEC | - |

## 5. Loadout

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| L1 | Laser ranked first | M, P, T, U, DV, C (practice: trade lightning for a laser when nobody is close) | relative values: laser 3-4, lightning 2.4-2.6, mortar 0-1.2 | a laser is in 11 of 13 recorded winning loadouts; long detours for one never paid: -0.11, -0.06, -0.06 (L01, L06, L11) | MUST |
| L2 | Keep the gun in practice (gun + laser) | M, T (never dropped); the L line and U end on laser + lightning | - | keep-gun A/Bs are inside noise: -0.21 (L03), lightning brawler +0.17 (L04); the best recorded house bot ended gun + laser in 10 of 12 matches | MUST in practice (both top bots) |
| L3 | Laser + lightning without the gun in a free-for-all | six of seven recorded free-for-all winners; P as an option | - | free-for-all recordings only | OPTIONAL preset for the final |
| L4 | Lightning worth more late (small circle) | M (above the gun once the zone radius is under 150 m) | - | none | OPTIONAL |
| L5 | Take inside the pickup radius at once, swap with hysteresis, never while charging, ignore a pickup after a failed take | M (reach 0.3 m inside the radius; ignored 1 s after "range", 20 s otherwise), T, U (gain of 0.4-0.5 needed) | - | - | MUST |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| L1 | D7 | `economy.js: wantPickup`, rank table | CODE | - |
| L2 | D7 | `economy.js: wantPickup` (the gun always stays) | CODE | - |
| L3 | D7 (`ffaPair`) | none | SPEC | final only |
| L4 | tactics spec D3 | none | SPEC | optional |
| L5 | V2 s.5 | `economy.js: hands` (reach 3.6 m of 4), `senses.js: senseEvents` | CODE | - |

## 6. Upgrades

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| U1 | Toughness first | T (plating, armor, nanites), M (plating, nanites, armor, then servos), P (plating, armor, then the two laser upgrades, then nanites), U and B (plating, armor, nanites, laser damage) | plating is first in every published order above 4.4 | lightning-first order -0.29 (U01); plating demoted inside a -0.46 bundle (M05); M tried three damage-first orders in its simulator and kept toughness first | MUST |
| U2 | Answer an offer on the tick it appears, repeat until it is gone | all | default after 5 s is choice 0 | - | MUST |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| U1 | D7 | `params.js: UPGRADE_ORDER` starts with gun damage and laser damage; `economy.js: pick` puts nanites first for the first two offers | **DIFF** | replace with the D7 order |
| U2 | V2 s.5 | `economy.js: pick` | CODE | - |

## 7. Cubes, crates, drones, supply drops

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| C1 | Farm crates and drones when calm | M (crates within 150 m, drones within 110 m, only at 90% health or more, 6 s after the last contact, below 14 cubes), T (ground crates within 150 m approached to 30 m above 45% health; drones within 170 m approached to 38 m above 50%), B (crates 150 m, drones 140 m from 50 m), P (drones remembered and valued highly) | crates 70-150 m, drones 110-170 m, health gate 45-90% | farming on: +0.27, +0.37, +0.06, +0.10, +0.10 (E01, E04, E07, E08, E13); crates off -0.65 (E12); farther or longer: -0.13, -0.12, -0.09, -0.17 | MUST (both crates and drones); the health gate is contested |
| C2 | Detour to a cube while in contact | T (within 70 m above half health, 40 m below, 12 m while losing: the change behind 5.19), M (within 45 m above 35% health when no enemy stands nearer to it; 25 m in a free-for-all), L (70 m with at most one threat), C, U (45 m) | 25-70 m | package-level only: the same bot's line without it scored 3.56 (X02, confounded); one second-hand report of harm at 25 m (E18) | MUST |
| C3 | Detour to a laser while in contact when we hold none | M (120 m), T (60 m gun-only, 35 m otherwise), K (its 5.04 version is "grab a laser or lightning even mid-fight"), C (only when close and on our level) | 35-120 m | bundles +0.33, +0.33 (L08, L10) | MUST |
| C4 | Collect the cubes of our kills at once | M, P, T | all cubes plus two drop at the kill | winners of recorded free-for-alls reach 15-35 cubes | MUST |
| C5 | Remember what was seen | cubes 40 s (T, P) to 60 s (M); weapons and crates 60 s (T) to 150 s (M, X) or until seen empty; drones 25 s (T) to 120 s (P) | - | cube and weapon memory is part of the 5.19 package | MUST |
| C6 | Skip roof loot | T (more than 2 m above the terrain), M (2.5 m); P climbs only when alone | - | roofs lost in 5 of 6 tests (-0.18 to -0.93); M's simulator: 6 of 100 matches ended without a laser after seeing one on a roof | AVOID roofs |
| C7 | Supply drops: only uncontested, timed to the landing | T (within 220 m, not held by another mech, not more than 3 s early), M (within 280 m when quiet, not if hurt in contact, sets off so as to arrive about on time, gives up when not getting closer), B (within 170 m, skips a drop on which another mech has 1.5 s of progress) | 170-300 m | timed and uncontested out to 300 m +0.02 (E10); contesting or far chasing -0.21, -0.08 (E03, E11) | SHOULD; AVOID contesting and early waiting |
| C8 | Stop farming late or when strong | M (below 14 cubes), kyoto-max (until 200 s or 10 cubes) | 200-240 s, 10-14 cubes | farming past 230-270 s -0.12, -0.13 (E05, E02) | SHOULD |
| C9 | Crate shooting that works: keep a distance from which the gun can point down at the crate, no reload after every round | P (distance computed from muzzle height and the pitch limit, at least 8 m; steps back when too close), T (30 m), L (22 m), U (20-40 m) | 14-30 m | P calls this "crate farming that works in real matches" | SHOULD |
| C10 | Run for a weapon at the start | C (full turn at spawn, then an uncontested laser or lightning; in practice a laser within 250 m), M (out of contact up to 320 m for a laser), K v5 | 250-320 m out of contact | laser-first -0.11 (L01), 400 m detour -0.06 (L11), early rush +0.02 (L09); C's practice rush is the likely source of its last +0.2 | SHOULD out of contact only |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| C1 | D6 (crates 150 m, drones 170 m, health 90% preset) | `economy.js: chooseLoot`: crates within an 80 m path, shot from 45 m; **drones are never farmed** (only avoided) | PART | a drone gives two cubes, a crate one |
| C2 | D6 (70 / 40 / 12 m) | none: `chooseLoot` runs only when nobody has a line, no mech is within 150 m and health is 90% | **SPEC** | the single change tied to 5.19 |
| C3 | D6 (60 m) | none | **SPEC** | - |
| C4 | D6 | `economy.js: chooseLoot` (kill drops within a 170 m path for 60 s, only when quiet), `brain.js: retreatLegs` | PART | not while in contact |
| C5 | D6 (40 s) | `senses.js: remember, forget` (120 s, or seen empty three times) | CODE | drones are not remembered |
| C6 | D6 | `economy.js: reachable` | CODE | - |
| C7 | D6 (arrive at most 3 s early, never contested, leave if a mech is within 60 m) | `economy.js: chooseDrop, dropLegs`: sets off as soon as the path fits and then stands in the ring | PART | add the late start; today we can wait up to 25 s in the open |
| C8 | D6 (210 s, or 10 cubes and a laser) | none (`chooseLoot` only lowers the value of cubes at the cap) | SPEC | - |
| C9 | - | `economy.js: lootLegs` stops 8-9 m from the crate | PART | fine at zero cubes; from about four cubes the muzzle is high enough that the crate lies below the 0.7 rad pitch limit at 8 m (muzzle height grows 5% per cube). Stand at 15-25 m. |
| C10 | D6 (laser within 60 m in contact; no long detours) | `economy.js: chooseLoot` (weapons within a 120 m path, out of contact) | CODE | - |

## 8. Zone and endgame

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| Z1 | Leave-time rule from real travel time | M (go when the edge reaches us within 5 s plus a share of the walk; earlier once the zone does 60 hp/s), P (leave by 5 s before the edge or by travel time plus 6 s before the shrink ends), T, L, A (travel plus 12 s) | reserve 5-12 s | path-aware zone travel +0.06 (Z01); region routing bundle +0.29 (Z02) | MUST |
| Z2 | Zone goal on our side of the next circle | T 45% of the next radius, M 50% (35% below a radius of 140 m, the centre below 60 m), U 70%, A 80% | 45-80% | none; recordings: house bots sit at 0.41 of the radius | MUST; fraction contested |
| Z3 | The zone outranks cover and loot; shooting continues | M (fixed after being stranded outside by its own hiding), T | - | - | MUST |
| Z4 | Every goal must be inside the zone at arrival time plus a reserve | M (cover and loot are checked against the circle 5-8 s ahead, against the next circle when the shrink is near), N, X | 5-15 s | - | MUST |
| Z5 | Final circle: stand on the exact centre with braking | M (from a next radius of 25 m; no hiding and, in the last collapse, no dodging), N (from 18 m), X (aims 1.5 s ahead of the moving centre), DV; T has nothing special | - | none | SHOULD in practice, MUST for the final |
| Z6 | Do not be outside by choice once the zone damage is high | M (from 60 hp/s) | - | - | SHOULD |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| Z1 | D9 (path time plus 12 s) | `mover.js: zoneCheck` (urgent under 4 s of slack on the real path length) | CODE | 4 s is tighter than every public bot; D9's 12 s not coded |
| Z2 | D9 (50%) | `mover.js: zoneGoal` (80%, 30% in the late phases) | DIFF | preset |
| Z3 | D9 | `tactics.js: decideMode` (ZONE first), `firecontrol.js` | CODE | - |
| Z4 | V2 s.3 | `senses.js: zoneSlack` used by loot, hide, strafe and drop choices | CODE | - |
| Z5 | D9 | `mover.js: zoneGoal` ends on the next centre when the next radius is 0 | PART | no braking rule, no "no dodge in the last collapse" |
| Z6 | tactics spec E1 | none | SPEC | - |

## 9. Navigation

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| N1 | Ground grid with path search and string pulling | M, K, T (2 m cells; T uses a distance field), alexwilldev (3 m) | body clearance radius plus 0.3-0.55 m | wall padding from 2.0 to 2.5 m: -0.28 (N02) | MUST; AVOID fat padding |
| N2 | Body grows with cubes in the walkability test | M (clearance from the live radius; a second head-room map for tall bodies); T has a fixed body, listed as its weakness | 5% per cube | - | MUST |
| N3 | Search work bounded by counts, not by the clock | T (a fixed cap of 70,000 node expansions per tick replaced an 8 ms time slice), alexwilldev (5,000-15,000), DV ("limit path search work per decision") | - | time-budget fixes +0.38 and +0.17 (N04, N03); hard time limits inside searches -0.39 (N05); the same build scored 3.67, 3.75 and 3.90 with a clock-sliced search (D07) | MUST |
| N4 | Straight walk when the segment is free | M, T, P | - | - | MUST |
| N5 | The arena wall stands `arena_margin` inside the map bounds | P ("wall 30 m inside the map bounds"); four low-scoring bots; nobody else | 30 m | our own check: over the whole official replay the smallest distance of any mech to the bounds is exactly 30.0 m; spawns can lie near it | MUST |
| N6 | Way out of enclosed pockets | P, M (see V10) | - | - | SHOULD |
| N7 | Map fallback when the mounted map cannot be read | P (a copy of the map is compiled into the binary); most bots fall back to straight-line steering | - | - | OPTIONAL |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| N1 | SPEC.md | `nav.js: findPath, walkLine` (margin 0.3 m) | CODE | - |
| N2 | V2 s.3 | `senses.js: senseSelf` calls `nav.js: setBody` | CODE | - |
| N3 | D10 | `mover.js: moveTo, zoneCheck`, `brain.js: evalMaybe, act`, `stance.js: ambushUpdate` skip work when the time left in the decision is short; `brain.js: act` halves budgets for 20 decisions after a slow one | **DIFF** | caps are counts (4,000 expansions, 300-400 rays) but five places still depend on the clock |
| N4 | V2 s.3 | `mover.js: moveTo` | CODE | - |
| N5 | - | `nav.js: _buildWalls` and `world.js` use the raw map bounds | **MISSING** | the outer 30 m ring is walkable for our planner and solid on the server. Treat cells within `match.arena_margin` of the bounds as wall. |
| N6 | - | `nav.js: hopPlan` unused | PART | see V10 |
| N7 | SPEC.md | `bot.js: init` (tries `hello.map.dir`, then `/arena`, then plays without a map) | CODE | - |

## 10. Free-for-all detection and behaviour

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| A1 | Detector: deaths that we did not cause | M (three or more, any time), T's free-for-all line (three, or two beam clues), P (a single one; it also plays the first 20 s of every match by its free-for-all rules), J (one before 90 s, or three), JorgeN0 (two before 120 s, or four), Achintya (more deaths than our kills plus one), C | 1 to 4 deaths | J's rule never fired in 48 practice matches (identical score, X01); JorgeN0's simulator: fires in 85% of free-for-alls after a median 17 s, 4% false alarms in practice (X03); P plays its top practice scores with the loosest rule; T's line with deaths plus beam clues scored 3.56 against 5.19 for its sister without any detector (X02, confounded) | MUST for the final |
| A2 | Identical practice behaviour until the detector fires | M (one flag), P (practice profile separate from free-for-all parameters: "the free-for-all behaviour is the same under every profile") | - | - | MUST |
| A3 | Hide-first posture once it fires | M (fights from cover and never walks at an enemy; trades only with a mech that is within 120 m, is hitting it or is nearly dead; hides below 45% health, below 70% with two mechs, always with three), T's line (silent near mechs, cover in the endgame, cover from charging lasers), C (avoid early fights, lasting cover, farm when calm) | - | private rooms: quiet variant 10.75 against 9.33 for the fighter (S08); recorded winners stand in the open 0.7% of the time, the bottom half 40% (S01); practice ranks 1-4 placed 6th-12th (S04) | MUST for the final |
| A4 | No voluntary fight in the opening | C, P (first 20 s by free-for-all rules; optionally a stricter engage ratio while more than 8 are alive) | first 20-90 s | recordings: the bottom half dies after a median 21 s; an aggressive booster lived 36 s on average | MUST for the final |
| A5 | Keep growing in a free-for-all | winners: 15-35 cubes, 5-7 upgrades, 0-3 drops | - | T's simulator: not shooting crates while a mech was tracked within 200 m, about +1.6 | SHOULD |
| A6 | Avoid much stronger mechs | P (keeps out of sight of a mech whose health times damage is twice ours) | ratio 2 | none | SHOULD for the final |
| A7 | Free shots at mechs that look away, third-party attacks | P (three opener rules, off by default), M (tested, off) | - | none | OPTIONAL |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| A1 | D12: three uncaused deaths before 200 s; beam clue off | `stance.js: environment`: each uncaused death counts 1.5, each beam ending near a third mech 2, each unexplained health loss 1; fires at a total of 3 with two different victims (5 once its squad-evidence counter has reached 3) | **DIFF** | looser than D12: while the squad evidence is still low (roughly the first 100 s with a single hunter) two deaths, or one death plus one clue, are enough, and the beam and health clues are on. The checkpoint note already reports a latch at 22.7 s on the kit stream. A false latch in practice is the costliest single error on this list. |
| A2 | D0 | stance parameters only change after the latch | CODE | keep a simulator test that a practice run is identical with the detector disabled |
| A3 | D11 | `stance.js: chooseStance, applyStance` (defensive stance, silent first shot, no idle pull) | PART | the manoeuvres of D11 are not implemented |
| A4 | D0, D11 | none | SPEC | - |
| A5 | D11 | `economy.js: chooseLoot` (loot radius by stance) | PART | - |
| A6 | - | none | MISSING | final only |
| A7 | D11 | none | SPEC | optional |

## 11. Engineering: timing, determinism, logging, experiment switches

| # | Capability | Who has it | Values in use | Measured effect | Verdict |
|---|---|---|---|---|---|
| G1 | Never crash: every decision in a guard with a simple fallback; outputs checked for finite numbers | M, P (a panic or an undecodable observation still gets an answer built from the last action), T, most bots | errors logged for the first 5, then every 200th | a crash on pickup steering cost 0.88 (F04) | MUST |
| G2 | Decision time far below the limit, measured under a one-CPU quota | M (worst answer 16 ms after its fix), P (a watchdog answers with the last action after 34 ms), alexwilldev (12 ms soft budget) | typical public p99 2-13 ms in our sparring harness | late answers seen on the scorer, fixed: +0.38 (N04); +0.17 (N03) | MUST |
| G3 | Runtime helper threads limited for the one-CPU sandbox | M (no concurrent compilation, no top compiler tier, one collector thread: worst answer 55-114 ms before, 16 ms after), U (heap cap), P (collector settings and a memory limit), DV (math-library threads set to one) | - | see G2 | MUST |
| G4 | Rehearsal at start-up so compilation happens before the match | M (path and sight warm-up up to 1.2 s, then up to 2.5 s of made-up decisions on a throwaway copy, whose navigator marks are cleared afterwards), T (two full path fields), alexwilldev | caps between 1.2 and 3.7 s of the 20 s budget | Th3r0n: warm-up state leaked into the match and caused hops in the first 4 s | MUST, with state isolation |
| G5 | Determinism: one seeded generator, no clock in decisions | M (seed from `hello.seed`), P (seed plus slot), T (count cap), J (a salt for deliberate re-draws) | - | identical code scores identically (D01-D03); salt-only changes -0.06 and -0.27 (D04, D05); clock-dependent bots moved 0.02-0.33 between identical runs (D06-D08) | MUST |
| G6 | All rule numbers from `hello.config` and the live stats | M, P, DV | - | the balance changed during the event | MUST |
| G7 | One parameter table with named variants for A/B runs | M (every constant overridable by name; switches for whole behaviours, all off by default and listed with what was tried), P (named practice profiles compiled in, one commit per profile), T (one switch per ablation), Th3r0n ("exp X" commits, each followed by "back to defaults"), C ("inert knobs, defaults unchanged") | - | practice of the best teams | MUST |
| G8 | Logs on stderr only: one start line, throttled errors, slow decisions, one end line; debug drawing off by default | M (slow-decision log behind a threshold), P (per-decision trace behind a switch) | - | stdout noise fails the conformance check; stderr is never shown for matches | MUST |
| G9 | The official check under the sandbox flags before every push | C (also in CI on every push), DV, J, Rohanasudani (checklist in the ledger) | - | a rejected entry still uses one of the four hourly slots | MUST |
| G10 | A syntax or import error must fail the build, not the match | M (bundles inside the image build), about 16 Python repos (byte-compile in the image build) | - | - | SHOULD |
| G11 | Local simulator with paired seeds, calibrated against official scores | M (600-match comparisons, automated one-parameter search), P, T', U, J | - | simulators gave the wrong sign in six documented cases (V01-V06), the right one in two | SHOULD, kept out of the repository; never trust deltas under 0.5 without the scorer |

Audit:

| # | Spec | Code | Status | Note |
|---|---|---|---|---|
| G1 | V2 s.8 | `bot.js: decide, sanitize, fallbackAct`; `brain.js: stage, act` | CODE | - |
| G2 | V2 s.8, D10 | measured: p99 about 6 ms under the quota (`notes/runtime_1cpu.md`) | CODE | re-measure every release |
| G3 | D10 | `bot/Dockerfile` (nine engine settings) | CODE | - |
| G4 | D10 | `brain.js: warmUp` (200 made-up decisions on a scratch brain, capped at 1.2 s) | CODE | add the with/without-warm-up identity test (V8) |
| G5 | D10 | `brain.js: createBrain` (seed xor salt); clock use listed under N3 | DIFF | remove the five clock gates and the budget halving, keep one emergency fuse and count its trips |
| G6 | V2 s.1 | `brain.js: normalizeConfig`, `senses.js: senseSelf` | CODE | - |
| G7 | Doctrine header ("presets are named") | `params.js: PARAMS` with overrides through `createBrain`; `env` switch | PART | no named presets yet (`laserRange`, `strafe`, `healExit`, `farmHp`, `ffaPair`, `beamClue` exist only in the spec) |
| G8 | V2 s.8 | `bot.js: log, decide` (first 5 slow decisions, end summary), `brain.js: noteError`, `PARAMS.debug` off | CODE | - |
| G9 | rules audit C3 | `tools/package.sh`, `tools/rules_audit/preflight.py` | CODE | the Docker run itself has not been possible on this machine |
| G10 | - | `tools/package.sh` bundles locally and runs the check on the bundle | CODE | - |
| G11 | - | `sim/`, `tools/` | CODE | - |

## 12. Ranked gap list

"Effort" is our estimate; "evidence" names the rows above.

### For the practice score

| Rank | Change | Evidence | Effort |
|---|---|---|---|
| 1 | Hold the gun trigger whenever the magazine is loaded and the gate passes (F6). Today one shot per 0.30 s instead of 0.24 s. | M, P, T all do it | one parameter |
| 2 | Arena wall 30 m inside the bounds (N5). | P; our replay measurement | a few lines in the walkability build; re-run the navigation tests |
| 3 | Put the Doctrine V4 numbers into `params.js` and `decideMode`: gun stand-off 70-75 m instead of 115 m (E5), no hiding at 55-90% health and no heal mode merely because it is quiet (E1, R6), retreat thresholds by shooter count (E8, R1), re-engage at 70% (R2), toughness-first upgrade order (U1). | R01, R08, A01-A24, A05, U01 | small; mostly parameters and one function |
| 4 | Bullet-aware dodge blended into the leg command (V2, V11). | M (weight raised twice on the way to 5.58), T | medium: new overlay in `mover.js`, bullets are already parsed in `senses.js` |
| 5 | Power grabs in contact: cube within 45-70 m, laser within 60-120 m when we hold none, cubes of our kills at once (C2, C3, C4). | the change behind 5.19; also in M, K, C | medium: `economy.js: chooseLoot` gate and a leg override in `brain.js: fightLegs` |
| 6 | Farm drones (two cubes each) and reach crates out to 150 m; stand 15-25 m from a crate (C1, C9); stop at 210 s or when strong (C8). | E01-E13 | medium |
| 7 | Remove the clock from decisions: fixed operation counts only (N3, G5). | D06-D08, N03-N05 | small, but touches five call sites |
| 8 | Make the free-for-all latch as strict as D12 (three uncaused deaths, time-limited, clues off) (A1). | X01, X02 | small: `stance.js: environment` |
| 9 | Target choice per D5: nearest first, magazine-aware finish bonus, recent attacker, sticky; bounded engagement with a line within 150-175 m (E2-E4). | G01 +0.39, G02 +0.23 | small to medium |
| 10 | Laser range as a preset with firm back-off (and boost) when a mech comes inside the band (E5, V6); second preset "close to 30-60 m against a laser holder while we have no laser" (E6); third preset "never retreat in practice" (R1). | M 5.58, P 5.31, T 5.19 disagree | small each; needs scorer runs |
| 11 | Strafe interval preset: 0.45-1.15 s against 0.8-1.6 s (V1). | both top bots against one unpublished A/B | trivial |
| 12 | Supply drops: start late, never wait in the ring before the landing (C7). | E03, E10, E11 | small |
| 13 | Shooting details: gun gate at long flight (F7), ballistic lead on falling targets (F9), lead factor checked per range band (F8), idle reload only below about 8 rounds (F15), latency 0.05-0.075 s (F1). | R09, replay | small each |
| 14 | Use beam origins for unseen shooters (E10); wire `hopPlan` for pockets (V10, N6); "not getting closer" timer for loot (V9); zone reserve 8-12 s (Z1). | M, P | small each |

### For the final (free-for-all)

| Rank | Change | Evidence | Effort |
|---|---|---|---|
| 1 | A detector that is strict in practice and still fast in a real free-for-all, with a simulator test for both error kinds (A1, A2). Three deaths is the common choice of M, T and J; recorded free-for-alls lose half the field within the first minute, so it fires early there. | X01, X03 | small |
| 2 | Opening guard: no voluntary fight for the first 40-90 s, shoot back at once when attacked (A4). | bottom half dies after a median 21 s | small |
| 3 | Hide-first fighting after the latch: fight from cover, never walk at an enemy across open ground, trade only when close, attacked or finishing; never visible below about 55% health (A3). | S01, S04, S08; M's posture | medium to large |
| 4 | Growth without noise: drones, uncontested drops, kill cubes; no crate shooting while a mech is tracked within about 200 m (A5). | winners hold 15-35 cubes | medium |
| 5 | Laser + lightning as the free-for-all pair, lightning preferred in the small circles (L3, L4, F13). | six of seven winners | small |
| 6 | Bullet dodge (V2) and a lead that adapts to jinking opponents (F8): in the final the targets are bots like M and P, which dodge. | - | shared with practice items 4 and 13 |
| 7 | Keep away from mechs far stronger than us (A6); last circle on the exact centre with braking, never outside once the zone does 60 hp/s (Z5, Z6). | P, M | small |
