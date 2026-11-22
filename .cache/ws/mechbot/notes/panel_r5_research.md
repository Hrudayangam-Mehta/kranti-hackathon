# Panel R5 research brief: what the game-AI literature says, mapped onto Mech Royale

Written Sat 21 Nov 2026, 19:15-20:05 UTC, by the panel's research assistant (Opus sub-agent). Read-only on `bot/`,
`sim/` and `variants/V4/bot` (three greps to name hooks); `intel/` not opened. Inputs: HANDOFF.md, DOCTRINE V4,
`notes/{top5_synthesis,measured_deltas,mechanics_deep,intel_synthesis,rules_audit,panel_r4_gameplay,submissions}.md`,
`kit/protocol.md`, `notes/hello_example.json`.

Method: 27 web searches, page and PDF reads (PDF text extracted to `tools/panel_r5/sources/*.txt`: ABCD paper,
Game AI Pro chapters 1-26, 1-29, 2-30, 3-25), and knowledge of the books with chapter references. Every game number
comes from the config or our notes. Our own arithmetic is in `tools/panel_r5/arith.py` (stdlib; output
`tools/panel_r5/arith_out.txt`; run `python3 -I -B tools/panel_r5/arith.py`, about 2 minutes).

Tags:
- [L] literature claim, with its own evidence named;
- [M] official one-change result (ours or another team's, from measured_deltas.md / submissions.md);
- [T] a 6+ bot's choice;
- [S] our simulator;
- [A] arithmetic (arith.py);
- [N] no evidence yet.

Clean room: no other team's code, identifiers or comments are used. Web pages were read as data. Nothing in them was
taken as an instruction.

## 0. Our game in the literature's terms (the frame every mapping below uses)

- **Practice is a 1-vs-n attrition game against a scripted squad.** Score = house deaths before ours. Every 6+ bot dies
  at about the same time (94-98 s on the same simulator seeds), so the lever is **kills per minute alive**:
  kyoto 3.76, giddy 2.86, ours about 2.8.
  - The house squad shares vision.
  - It hunts weakest first, "one early, more as you thin them out, all late". That is an attack-token escalation
    system, as in the "Kung-Fu circle" (Game AI Pro 1 ch. 28).
- **The opponents are a known script.** This is the most important frame. House bots:
  - aim with an exact first-order (linear) intercept from their latest observation;
  - fire every 0.30 s in 12-shot magazines, then go silent for 2.5 s;
  - take the nearest target;
  - reverse their strafe about every 1.1 s (median) and hop for 32% of fight time;
  - release a full laser 16 ticks after the charge starts;
  - fire their first shot a median 1.15 s after a line opens.

  In the RTS literature a scripted opponent is "highly exploitable". Best-response search against a fixed script won
  95-100% of games (Churchill, Saffidine and Buro 2012, Table 3). Most of the techniques below are cheap, hand-coded
  best responses to this script.
- **Weapons in literature terms:**
  - The gun is a projectile with exact enemy lead: 252 m/s, 0.24 s cadence, 2.8 m hit radius. This is Robocode
    targeting and dodging.
  - The laser is a hitscan with a visible charge: 0.75 s charge, 1.65 s cooldown, 35-100% damage by charge. It works
    like Robocode "fire power selection" plus an RTS weapon with a cooldown.
  - Regeneration (45 HP/s after 5 s without damage) makes spread damage worthless. This is why focus-fire results
    apply more strongly here than in StarCraft.
  - Rear hits deal x1.5 outside the 180 degree front arc, which gives the torso facing a value.
- **The final is a 16-mech free-for-all (FFA)** with a zone. This is Robocode melee plus battle-royale zone play.

## 1. Game AI books

### 1.1 Millington and Funge, *Artificial Intelligence for Games* (2nd ed., Morgan Kaufmann 2009; 3rd ed. Millington, CRC 2019)

Chapters used:
- ch. 3 *Movement*: steering (seek, flee, pursue/evade with prediction, wall avoidance), and blending and arbitration
  of steering outputs;
- ch. 5 *Decision Making*;
- ch. 6 *Tactical and Strategic AI*:
  - 6.1 waypoint tactics: tactical locations (cover, sniping, shadow), with context sensitivity computed at run time
    by line checks against the current threats;
  - 6.2 tactical analyses: influence maps, map flooding, convolution filters;
  - 6.3 tactical pathfinding: edge cost = distance + sum of weight x tactical quality (for example exposure to enemy
    lines of fire).

Techniques:
- **Influence or threat map.** Each enemy spreads influence over a grid with a falloff (Millington's basic form is
  I_d = I_0 / (1 + d)). "Security" = own influence minus enemy influence. Map flooding gives each cell to the side
  with the strongest influence.
- **Tactical pathfinding.** A* over the same graph, with the cost of each edge raised by the threat it crosses. The
  result is routes that bend around lines of fire instead of the shortest route through them.

Evidence [L]: textbook material, used in shipped shooters. Killzone (2004) and Killzone 3 multiplayer bots
(section 1.3) use exactly this: position scoring by lines of fire, and paths that avoid them.

Mapping:
- Our worst legs in the simulator are walks under fire:
  - DISENGAGE/hide loses 72 HP/s;
  - FIGHT/isolate loses 73 HP/s;
  - a plain stand-off loses 42 HP/s (panel R4 section 2.0 [S]).
- A tactical path cost fixes the cause, not the symptom:
  - for any retreat, isolate or grab leg, score the route by its exposure integral
    E = sum over steps (dt x sum over shooters with a line of their DPS x hit probability);
  - take the leg only if E < (DPS taken while staying) x (leg duration) - (value of the goal).
- This generalises panel R4's I3 (isolate only within 12 m) and I4 (pulse retreat only to cover within 25 m). The line
  checks already exist in `world.js`; the exposure term exists in `makePosEval`. What is missing is an
  exposure-weighted route and a "go or stay" comparison.

### 1.2 Buckland, *Programming Game AI by Example* (Wordware 2005), ch. 7-10 (the Raven shooter)

- **Goal-driven agent (ch. 9).**
  - Top-level goals (GetHealth, GetWeapon(type), AttackTarget, Explore) are arbitrated every few hundred ms by
    *desirability* scores, all in [0, 1].
  - Book formulas (health 0-1, distance normalised):
    - GetHealth = k (1 - health) / dist;
    - GetWeapon = k x health x (1 - weapon strength) / dist;
    - AttackTarget = k x total weapon strength x health;
    - Explore = a small constant.
  - Personality is a per-goal bias. The book's aggressive bot multiplies health desire by 0.6 and attack desire by 1.5.
- **AttackTarget decomposes:**
  - if the target is shootable, strafe side to side (Goal_DodgeSideToSide) or close in;
  - if it is not, Goal_HuntTarget: go to the target's last recorded position, then explore.
- **Sensory memory.** One record per opponent: last sensed position, time last seen, time it became visible, within
  field of view, shootable, with a memory span of a few seconds.
- **Targeting system.** The closest opponent in recent memory.
- **Weapon choice (ch. 10, fuzzy logic).**
  - Each weapon owns a fuzzy module with inputs distance and ammo, and output desirability. It is re-queried about
    twice a second.
  - The book flags the rule explosion: 3 sets x 2 variables = 9 rules; a third variable makes 27. Its remedy is the
    Combs method.

Evidence [L]: the book's demo bots. It is the standard teaching architecture, not a benchmark.

Mapping:
- HuntTarget is exactly panel R4's I2 "seek after a kill instead of roaming". V1 roams 16% of its life with no target
  and has 10-17 s kill-to-hit gaps in 7 of 20 gaps [S].
- The Raven desirability shape (value x health / distance) suits our mid-fight grabs better than flat radii:
  - a laser pickup's desirability rises with our hp and with how weak our current loadout is;
  - a cube's rises with how close we are to the next upgrade threshold.

  This is a smooth version of the 70/40/12 m cube radii and panel R4's I1 laser-in-contact 130 m grab.
- Fuzzy weapon selection is not needed. We fire both slots on separate triggers.

### 1.3 Game AI Pro 1-3 (Rabin ed., CRC 2013/2015/2017; free PDFs at gameaipro.com) and AI Game Programming Wisdom

- **Tactical position selection** (Matthew Jack, GAP1 ch. 26; the Crytek Tactical Point System).
  - A query = generation (candidate points: grid around me, hide spots from the target) + conditions (hard filters)
    + weights (a sum of scored criteria).
  - Example in the chapter: `Generation = {hidespots_from_target_around_puppet = 15}`,
    `Conditions = {min_distance_from_puppet = 5}`, `Weights = {softCover = -10, distance_from_puppet = -1.0}`, with a
    fallback option (`grid_around_puppet = 10`, `visible_from_target = -10`).
  - Performance rule (section 26.7.3): cheap filters first, then weights to sort, then expensive filters (raycasts)
    evaluated from the highest score down until one passes. Limit raycasts per frame and stagger them.
  - Evidence: shipped in CryENGINE titles. The same pattern is UE4's Environment Query System (GAP3 ch. 26).
  - Mapping: `posEval` already generates, scores exposure and picks every 0.3 s. Adopt the evaluation order: sort by
    cheap terms, then run the line-of-sight checks top-down, so that cells can be evaluated every decision (the
    top-5 study notes theirs re-evaluate every decision) within budget.
- **Killzone (Straatman and van der Sterren, "Killzone's AI: dynamic procedural combat tactics", GDC Europe 2005) and
  Killzone 3 multiplayer bots (Straatman et al., GAP1 ch. 29).**
  - The waypoint graph stores cover data per direction, generated offline.
  - Position picking scores nearby waypoints by cover from known threats, distance from threats or friendlies, line of
    fire to the threat, and travel distance to reach the position. The weights differ by behaviour.
  - "Threat prediction" computes the most likely hiding waypoints of a lost threat, to search or pre-aim.
  - Evidence: two shipped games. The KZ3 bots were the game's multiplayer bots.
  - Mapping:
    - "travel distance to reach the position" is the term our isolate and hide legs lack (1.1);
    - threat prediction is the input for pre-aiming and pre-charging the laser at a lost hunter's emergence point
      (technique 4 in section 7).
- **Modular tactical influence maps** (Dave Mark, GAP2 ch. 30).
  - Separate proximity maps (where an agent can get to, linear falloff) and threat maps (what it can hit). For a
    ranged unit the threat map is a ring or plateau out to weapon range.
  - Normalised templates are precomputed at start-up and stamped in with a weight. Working maps combine base maps by
    add, multiply and invert. Example: a good attack spot = my interest x (1 - enemy threat).
  - Evidence [L]: practitioner chapter by the IAUS author, also given as a GDC AI Summit talk ("Spatial Knowledge
    Representation through Modular Scalable Influence Maps"). No public A/B numbers.
  - Mapping: one threat template per enemy loadout, scaled by hit probability by range (D1 table) and by cube damage
    bonus, stamped on a 5-10 m grid within 250 m. That gives the exposure integral of 1.1 in O(cells), with line of
    sight only for the top candidates.
- **Combat outcome prediction with Lanchester laws** (Stanescu, Barriga and Buro, GAP3 ch. 25; AIIDE 2015). See 3.5.
- **Choosing utility considerations** (Mike Lewis, GAP3 ch. 13) and **utility theory** (Graham, GAP1 ch. 9;
  Merrill, GAP1 ch. 10). See 1.4.
- **Beyond the Kung-Fu Circle** (Dawe, GAP1 ch. 28): attack tokens cap how many NPCs engage the player at once, and
  more are granted as attackers die.
  - Interpretation: this matches the practice squad ("more as you thin them out"). Under a token system each kill
    calls the next attacker. The bot that converts a kill into a **brief recovery before the next token holder
    arrives** gains. That explains why V4's heal breaks beat the pulse retreat by +0.17 [M] while long hiding loses [M].
- **Crytek target tracks** (Welsh, GAP1 ch. 31) and **probabilistic target tracking with occupancy maps** (Isla,
  *AI Game Programming Wisdom 3*, 2006; Isla and Blumberg, "Object persistence for synthetic creatures", AAMAS 2002;
  Isla, "Third Eye Crime", AIIDE 2013).
  - An occupancy map is a grid of probabilities for a lost target.
  - Each update: cells we can see and that are empty go to 0, the rest renormalise, and probability diffuses to
    walkable neighbours at the target's speed. Search goes to the maximum.
  - Mapping: a sound gives a bearing (sigma 7 degrees) and a distance class (near < 60, mid < 160 m), plus 5 s of
    exact memory. Seed the map with a Gaussian ring segment on each gun, laser or lightning sound and on each memory
    expiry point. Diffuse at 10 m/s. Seek the maximum. This is the principled version of I2's "loudest sector of the
    last 3 s".
- **Terrain reasoning** (van der Sterren, "Terrain Reasoning for 3D Action Games", Game Developer / Game Programming
  Gems 2, 2001) and **strategic and tactical reasoning with waypoints** (Lidén, *AI Game Programming Wisdom* 1, 2002).
  They precompute visibility per waypoint and direction, so that "how exposed is this spot to the 8 directions"
  becomes a table lookup. We already have a fast sight model (`world.js`, canopy chord rule). A per-cell exposure
  table on a 10 m grid at start-up (inside the 20 s hello budget) would make 1.1 cheap.
- **MCTS chapters** (Sturtevant, GAP2 ch. 25; Roelofs, "Pitfalls and solutions when using MCTS for strategy and
  tactical games", GAP3 ch. 28). Rollouts need a fast forward model and a playout policy that is not random:
  scripted playouts beat random ones (also ABCD, section 3.3). Use macro actions to cut the branching (section 5).

### 1.4 Dave Mark, *Behavioral Mathematics for Game AI* (Course Technology / Charles River Media 2009); the Infinite Axis Utility System (GDC AI Summit 2013; "Building a Better Centaur", GDC 2015 with Mike Lewis)

- **Response curves.** Each input (hp fraction, distance, threats with a line, time since hit) maps through a
  parameterised curve (linear, quadratic, logistic, logit) to [0, 1].
- **Combining scores.**
  - An action's score is the **product** of its considerations, so any zero vetoes.
  - A compensation factor offsets the product shrinking with the number of considerations:
    mod = 1 - 1/n; score' = score + score x (1 - score) x mod.
  - The current action gets a commitment ("momentum") bonus so that it does not flicker.
- **Variety.** Weighted-random selection among the top-scoring actions (the book's chapter on variety).
- Evidence [L]: shipped at scale (ArenaNet's Guild Wars 2: Heart of Thorns). Lewis's GAP3 chapter gives practical
  advice: one consideration per concept, avoid double-counting, debug with curve plots.
- Mapping:
  - Our mode logic is threshold cascades, for example LOSING:
    - 1 threat, hp < 35% and the target healthier;
    - 2 threats and hp < 50%;
    - 3-5 threats and hp < 60%;
    - 6 or more threats.

    HEAL is below 55%, or below 90% within 6 s of a retreat. A threshold flips at an edge and makes the 1.5 s
    hold-and-recheck behaviour.
  - A utility form scores the options against each other each decision (fight-on, finish-push, retreat-to-cell-k,
    heal, grab-k), with hysteresis built in:
    - retreat = curve(hp) x curve(lines on us) x (1 - curve(finishability)) x reachable-cover term;
    - fight = curve(ttk) x curve(hp) ...
  - **Caution [M]:** our measured thresholds were tuned on the official scorer (V4 heal +0.17). Replacing them wholesale
    is a many-knob change. Use curves only to remove flicker: keep the same breakpoints as the curves' midpoints, and
    add a 10-15% commitment bonus to the current mode.
  - Weighted-random variety has no value against house bots, which do not adapt. In the FFA it slightly hinders the
    giddy family's 0.22 rad "aimed at me" trigger, which we already handle with the off-axis charge.

### 1.5 Yannakakis and Togelius, *Artificial Intelligence and Games* (Springer 2018; 2nd ed. 2025; gameaibook.org)

- Ch. 2 (*AI methods*) and ch. 3 (*Playing games*). The planning chapter's rule: tree search and evolutionary
  planning need a **forward model** that is fast and accurate (book slides: "applicable only when a forward model is
  available"). In real-time games with ~40 ms per move, the methods that win are:
  - MCTS with macro actions;
  - rolling-horizon evolution (RHEA);
  - in both cases with domain-scripted playouts.
- The book also covers behaviour authoring (FSM, behaviour trees, utility) and says hybrid architectures dominate
  commercial games.
- Mapping: we have a forward model of the opponents (section 0). We do not have a calibrated model of the whole match:
  our simulator's within-bot deltas had the wrong sign six times. So use forward models only over **short horizons
  (1-3 s) inside a fight**, where the physics and the house script are exact and calibration matters little (section 5).

## 2. Robocode duel and melee bots (RoboWiki)

The Robocode setting differs from ours in one way:
- Robocode bots cannot see bullets and infer them from energy drops ("waves").
- We **see enemy projectiles** with exact position and velocity, and we see laser charging flags and aim.

So the dodging half of Robocode becomes easier for us, and the targeting half carries over almost unchanged.

### 2.1 Linear and head-on targeting, and the movements that beat them (Stop And Go, Musashi trick)

[L] RoboWiki "Stop And Go":
- "a simple movement strategy to dodge bullets fired by head-on, linear and circular guns": move briefly after the
  enemy fires and stop before its next shot. A linear gun then sees a stationary target and degrades to head-on.
- The tutorial stresses that the bot "must stop moving before the next enemy bullet is fired".
- The "Musashi trick" scores over 90% against head-on bots.
- Both fail against pattern or statistical guns. The wiki suggests trying stop-and-go first and falling back to a
  general movement.

Our house bots are exactly linear guns. Our own data: a steady target is hit 84%; one that changed velocity during the
flight is hit 22% (D1 [R]).

Arithmetic [A] (arith.py section 1; ground accel 58.5, walk 11.7, hit radius 2.8 m):
- A velocity change started on the tick a bullet leaves makes it miss once the flight time exceeds 0.34 s for a brake
  or a start, or 0.31 s for a reversal. That is a range of 86 m (walk) or 78 m (boost or reversal).
- Section 2 of the script:
  - An **open-loop** stop-and-go cycle (accelerate 0.2 s, cruise 0.1 s, brake 0.2 s, stand 0.1 s; mean 5.8 m/s) makes
    only 20-47% of bullets miss over random fire phases (longer cycles: 21-73%, best at long range).
  - The **same cycle synced** so that each enemy shot leaves on a brake or a start makes every bullet miss from
    85 m (worst deviation 3.1-3.6 m, against a 2.8 m hit radius).

Mapping:
- House bots fire every 0.30 s inside a magazine, on odd ticks, and we see each bullet within a tick or two. Back-
  computing its fire tick from its position (distance from the shooter's muzzle / 252) gives the next 11 fire ticks of
  that magazine.
- Schedule the velocity change for the predicted tick:
  - alternate brake and start, in one direction, so that strafe progress continues at about half speed;
  - keep our U(0.8, 1.6) s reversal timer for direction;
  - only against the gun shooter with the highest expected damage at 85-160 m.
- Under 85 m the gun cannot be dodged this way. Our band is 100-130 m with a laser.
- It is useless against lasers (hitscan) and against the 6+ bots' guns only if those use statistical aim. The public
  baseline is first-order lead.

Why this is not the measured "fast strafe flips" loss (M03, -0.69 [M]):
- That change reversed direction every 0.4-0.9 s, open-loop: zero net progress, and random phase.
- This one never reverses on the fire schedule, keeps moving forward, and is phase-locked to the shooter.

It still changes how we move under fire, so it is a draw of its own.

Hook: `mover.bulletDodge()` already scores the command against every visible bullet (`dodgeScore`). Add a
per-shooter cadence tracker (`senses`: bullet ids per shooter, fire tick = first-seen tick minus age). In
`legs()`, a speed modulation (stick 1.0 / 0.0 along the strafe line) is applied on the predicted ticks.

### 2.2 Wave surfing (precise prediction plus danger) [L]

RoboWiki "Wave Surfing":
- A wave is the set of possible bullet positions from one shot.
- For the nearest waves, *precise prediction* simulates our own movement for each option (true surfing: forward,
  stop or reverse each tick) and picks the least dangerous reachable spot.
- Danger comes from logged enemy guess-factor hits.
- "As of April 2010, the top 40 duelists in the RoboRumble use a form of wave surfing." Diamond, Shadow and DrussGT
  are examples. Melee surfing (Neuromancer) handles several shooters.

Mapping:
- We see bullets, so the "danger" of an option is exact for bullets in flight. `bulletDodge` already does a
  two-candidate version (sidestep left or right versus the current command).
- What surfing adds:
  - (a) more candidates: forward, stop, reverse, with and without boost;
  - (b) **future bullets**: the shooter's next shot (2.1) aimed at our constant-velocity extrapolation;
  - (c) charging lasers as waves: known release tick (charge start + 15-16 ticks), aim exact.

  For (c) the only dodges are a hard-cover step (D4) or a boosted lateral move in the last 0.15 s. That moves
  19.5 x 0.15 = 2.9 m, about the 2.5 m radius. It works only if their release aim is our position one tick earlier
  [N]: verify on the kit stream's laser misses before relying on it.

### 2.3 GuessFactor and statistical targeting; dynamic clustering [L]

- A **guess factor** (GF) expresses where the target ended up when the bullet arrived, on a scale from -1 to +1:
  - -1 / +1 are the extremes it could reach at full speed backwards or forwards over the flight time;
  - 0 is "stood still".
- Visits are logged per segment (distance, lateral velocity, acceleration, **time since last direction change**,
  wall proximity). The gun fires at the most visited GF for the current segment.
- Dynamic clustering (k nearest neighbours over situation vectors plus a kernel density estimate) is the modern form:
  Diamond, the #2 melee and 1v1 bot (github Voidious/Diamond).
- RoboWiki calls GF "one of the most popular and successful methods of targeting in all of Robocode". Most of these
  methods beat simple linear targeting.

Mapping (our gun against house strafers):
- House bots strafe at 0.85 x walk (about 9.95 m/s) and reverse about every 1.1 s.
- arith.py section 4 (toy model; reversal interval U(0.8, 1.4) s; aim at the body axis):

  | range | full linear lead | 0.6 x lead |
  |---|---|---|
  | 100 m | 87% | 96% |
  | 130 m | 75% | 86% |
  | 160 m | 65% | 78% |

- Segmenting on **time since the target's last reversal** is decisive:
  - just after a reversal (0-0.3 s), full lead hits 100%;
  - late in the interval (0.8-1.4 s), full lead hits 16% at 130 m, and a 0.2-0.6 lead hits 29-35%.
- Our gun aim (`aim.intercept`) is pure linear lead.
- Spec: fit a small table lead_fraction[flight bucket 0.3/0.4/0.5/0.6/0.7 s][time-since-reversal bucket
  0-0.3/0.3-0.6/0.6-0.9/0.9+ s] offline from recorded house tracks (`tools/forensics`, the kit stream). Use the
  argmax-coverage lead (the fraction whose ±2.8 m window holds the most outcomes).
- Airborne (hop) targets stay on the ballistic prediction (they are hit 92%).
- Gain: gun hits at our 100-130 m band are worth +10 points of hit rate in the toy model. We fight gun-only most of
  the time.

### 2.4 Virtual guns [L]

- Track the *virtual* hit rate of several aiming methods (for each shot, check whether each method's aim would have
  hit, using the target's real later position). Fire with the best method.
- RoboWiki: common in top 1v1 bots (a general gun plus an anti-surfer gun). It warns that it is hard to do well and
  can underperform the best single gun. One talk-page view: "the best virtual gun array is no virtual gun array".
- Mapping: use it only as a **guard** for 2.3:
  - fire the segmented lead only while its virtual hit rate over the last 20 shots at this target class exceeds
    linear lead by 5 points;
  - otherwise use linear lead.
- We see target positions continuously while they are visible, so the virtual check is exact and cheap.

### 2.5 Minimum-risk movement (melee) [L]

RoboWiki "Minimum Risk Movement":
- Generate candidate points, score each with a risk function, and go to the lowest.
- Risk is usually from enemy energy and distance. Many bots add:
  - a term for **being the closest bot to an enemy** (closest bots get targeted);
  - repulsion from the centre;
  - a penalty for long travel and for staying in one area;
  - lateral angle: "much more dangerous to travel directly toward or away from an enemy than perpendicular".
- HawkOnFire, a classic melee champion (RoboWiki "Understanding HawkOnFire"):
  - 200 random points, 100-300 px away and no farther than 80% of the distance to its target;
  - risk = addLast x antigravity(last position) + sum over enemies of energyRatio x (1 + |cos(angle me-point-enemy)|) / distance^2;
  - energyRatio = enemy energy / mine, capped at 2.
- Diamond (former melee champion) uses a simple minimum-risk mover without waves.

Mapping:
- **Practice.** Everyone hunts us, so "closest to others" does not apply. Two terms do:
  - **perpendicularity.** A linear-lead bullet cannot be dodged by radial motion, because a range error along the line
    of sight still passes through our axis. Our dodge already moves perpendicular to the bullet. The candidate stand-off
    point should also lie perpendicular to the main shooter;
  - **last-position / dwell.**
- **FFA final.** This is the right core for the quiet phase:
  - candidates on a ring of 20-60 m;
  - risk_i = sum over mechs (dps_i / our_dps, capped at 2) x (1 + |cos|) / d^2;
  - + a "nearest mech to k others" term;
  - + the zone (distance to the next circle);
  - + lines of fire (from the exposure table).

  It replaces ad hoc distance rules (rule 8 bubbles) with one formula.

### 2.6 Melee target selection [L]

- RoboWiki pages: closest-target bots (HawkOnFire, Tybalt, Wallaby); weighted distance + energy + current-target
  bonus (BrokenSword, MambaTeam). One bot switches only when the new target is under 90% of the current one's
  distance.
- RetroGirl's description: "balancing energy conservation, collecting bullet damage, picking off easy targets and
  eliminating dangerous bots".
- Warning on pure low-energy switching: it chases a weak bot far away while a strong one sits next to you.
- Mapping: our R3a2 focus cost already does distance + hp + stickiness. What melee and RTS theory adds is the
  **danger** term (section 3.2).

### 2.7 Melee radar [L]

- RoboWiki "Melee Radar": spinning radar, **oldest-scanned** radar (turn toward the enemy unseen for the longest; the
  recommended default in Shadow and Phoenix), and the **gun-heat lock** (lock on the target only when the gun is about
  to fire, scan the others otherwise).
- Mapping: our "radar" is the torso (120 degree view wedge, 5 s memory, aim = facing = front arc). Gun-heat lock
  translates to:
  - lock the torso on the target while a weapon is ready or charging;
  - during the dead time, swing toward the oldest-unseen threat bearing (sound or memory expiry).

  Dead time = gun reloading (2.4 s of every ~5.3 s magazine cycle) and no laser, or the laser cooling.
- Combined with the x1.5 rear rule: the dead-time yaw should **maximise the DPS-weighted share of known threats inside
  our 180 degree front arc**. With two hunters 100 degrees apart, aim at the bisector, not at either one. Keep the
  target within 80 degrees, so that the swing back is at most 0.35 s at 4 rad/s.
- kyoto takes 20% of its damage in the rear [S]. Turning that to frontal saves a third of it: about 7% of damage
  taken. The late-game `scan.js` sweep is practice-inert today. This is a SQUAD-time variant.

## 3. RTS micro research

### 3.1 Kovarsky and Buro 2005 (*Heuristic search applied to abstract combat games*, Canadian AI): LTD and LTD2 [L]

- LTD = sum over own units of hp x dpf - the same for the enemy (dpf = damage / cooldown).
- **LTD2 = sum of sqrt(hp) x dpf - the same for the enemy.** It favours uniform hp and, in reverse, rewards
  concentrating damage on one enemy: lowering one enemy's sqrt(hp) to 0 removes its dpf.
- Used as the leaf evaluation in ABCD (3.3).
- Mapping: the evaluation function for any short rollout (section 5). With regeneration, add "hp the target
  regenerates if left for 5 s" (45/s).

### 3.2 Furtak and Buro 2010 (*On the complexity of two-player attrition games played on graphs*, AIIDE): target order [L]

- Result:
  - **Attack-Value**: attack the enemy with the highest dpf / hp, and do not switch until it is dead.
  - Optimal in **1 vs n** scenarios. The discrete form uses a_i / ceil(h_i / a_0).
  - In the general case deciding who survives is PSPACE-hard, so this rule is the tractable optimum for one shooter.
- In scheduling terms this is Smith's rule (weighted shortest processing time; W. E. Smith, "Various optimizers for
  single-stage production", *Naval Research Logistics Quarterly* 3, 1956):
  - total damage taken = sum of a_i x C_i (C_i = time at which enemy i dies);
  - minimise it by killing in decreasing a_i / ttk_i.
- Churchill et al. 2012: NOK-AV (Attack-Value with no overkill: skip a target already assigned lethal damage) was the
  best script of their set (Table 1: ABCD with LTD leaves wins only 0.32 against it, against 0.41-0.99 against the others).

Mapping: **practice is literally 1 vs n.**
- arith.py section 3, at 110 m:
  - hunter A: gun + laser, 1400 hp, 173 dps on us;
  - hunter B: gun only, 900 hp, 86 dps.

  | order | damage we take to kill both |
  |---|---|
  | A first | 2007 hp |
  | B first | 2173 hp |

  Our R3a2 focus cost (distance + 0.1/hp) picks B.
- Spec (`tactics.selectTarget`, the `fa` cost):
  - cost = ttk_i / threat_i, expressed in metres;
  - threat_i = expected DPS on us now:
    - gun 150 x P_hit(range) x cube multiplier, when it has a line;
    - + laser 129 x 0.67 if `weapons` lists a laser and it has a line;
  - ttk_i = (hp_i + 45 x max(0, gap - 5)) / our expected DPS on it (range-adjusted gun hit + laser cycle).
  - Keep the existing stickiness (Attack-Value itself says "do not switch until destroyed"), the -200 finishable
    bonus and the drone rules.
- **No-overkill**:
  - if bullets in flight + the next shot already cover the target's hp, retarget the torso and the laser to the next
    target now;
  - never release a full beam on a target that in-flight bullets kill.
- Agrees with the measured evidence: magazine-aware finishing +0.39 [M], giddy's kept focus retunes [M], and
  regeneration makes switching costlier still.

### 3.3 Churchill, Saffidine and Buro 2012 (*Fast heuristic search for RTS game combat scenarios*, AIIDE; the ABCD algorithm) [L]

- Alpha-beta considering durations, for simultaneous durative moves.
- **5 ms per search episode** (StarCraft allows 50 ms per frame), leaving 45 ms for everything else. The paper
  stresses "under 5 ms".
- Results (Table 1, 8 vs 8 and smaller):
  - with NOK-AV playouts as the leaf evaluation, ABCD beats every script 0.82-1.00 (LTD leaves: 0.32-0.99);
  - scripted playouts beat LTD/LTD2 leaves across the board.
- **Real-time exploitability** of the scripts (Table 3): a best-response ABCD wins 0.95-1.00 against each fixed script.
- Mapping:
  - (1) Our opponents are such scripts. A best response to a known script is worth more than general cleverness.
  - (2) The evaluation of a candidate plan should be a short **scripted playout** (house script + our script), not a
    static formula.
  - (3) The budget fits: 5 ms is about our current worst decision under the 1-CPU limits (12-14 ms worst with the
    JSC limits).

### 3.4 Churchill and Buro 2013 (*Portfolio greedy search and simulation for large-scale combat in StarCraft*, IEEE CIG) [L]

- Instead of searching unit actions, assign each unit a **script from a portfolio** (Attack-Closest, Attack-Weakest,
  Kiter, NOK-AV, ...). Hill-climb over assignments, alternately improving our side and the opponent's response.
  Evaluate each assignment by a playout.
- It beats alpha-beta and UCT up to 50 vs 50 units under a 40 ms limit.
- Mapping (one unit): our "portfolio" is the set of macro options we already have as legs:
  - stand-off strafe;
  - finish-push 20 m;
  - retreat to hide cell k (k <= 2);
  - grab cube or laser k;
  - laser now versus wait.

  PGS reduces to: every 0.5 s, play each option for 2-3 s against the house script model and keep the best.
  Section 5 gives the cost.

### 3.5 Lanchester attrition laws and their RTS use (Lanchester 1916; Stanescu, Barriga and Buro, AIIDE 2015 and GAP3 ch. 25) [L]

- dA/dt = -beta A^(2-n) B, dB/dt = -alpha B^(2-n) A. A wins if alpha A0^n > beta B0^n.
  - n = 1 is the linear law (one fights one at a time);
  - n = 2 is the square law (everyone can shoot as fast as they acquire targets).
  - The chapter: "the Square Law has nothing to do with range; what is really important is the rate of acquiring
    new targets". For StarCraft the fitted attrition order was **n = 1.56**.
- Strength per unit: dmg x hp (static), or learned by logistic regression from a few hundred battles.
- Result (GAP3 Table 25.3): in UAlbertaBot, replacing the attack-or-retreat simulation by the Lanchester prediction
  raised the win rate:

  | method | win rate |
  |---|---|
  | simulation | 60.8% |
  | static strengths | 63.9% |
  | learned strengths | 69.7% |

  In practice that means "waiting for an extra unit, attacking with one unit less, and better retreat triggers".
- Mapping:
  - **(a) Why simultaneous lines kill us.** Against n hunters with lines our survival time scales like 1/sum(a_i),
    while our kill rate does not rise. Two equal hunters halve the kills we make before death. This supports
    "serialise lines" (panel R3) and isolate-when-cheap (1.1).
  - **(b) The fight-or-flee predictor.** Replace the LOSING threshold table with one inequality, from Smith's rule
    with all current lines shooting while we work through the Attack-Value order of just the current target:
    damage we take to kill the current target D = sum over i with a line of a_i x ttk_target (+ the same for the next
    if it is finishable within 1.5 s).
    - Fight while D < hp - margin(regen, cover distance).
    - Retreat when D >= hp - margin and a cover cell is within reach (1.1).
  - This is the ttk-vs-ttd rule, measured +0.34 at one team (A32 [M]), with Lanchester's "count every line" made
    explicit. Our hit-probability tables (D1) are the alpha/beta.

### 3.6 Kiting [L]

- **Hagelbäck and Johansson** (AAMAS 2008; AIIDE 2009, an ORTS tournament bot):
  - multi-agent potential fields, with the unit's attraction peaking at its **maximum shooting distance**;
  - "after an attacking unit has fired its weapon the unit enters a cooldown period when it cannot attack. This
    cooldown period may be used to retreat from enemy fire, which has shown to be a successful strategy."
- **Uriarte and Ontañón** (*Kiting in RTS games using influence maps*, AIIDE 2012 workshop; the Nova bot):
  - an influence map of enemy weapon reach;
  - attack when the weapon is ready and the target is in range; otherwise move to the lowest-threat cell.
- **Liu, Louis and Ballinger** (ECSLBot, CIG 2014; Liu's dissertation): genetic-algorithm-tuned potential-field micro
  beat UAlbertaBot and Nova on kiting efficiency, target selection and fleeing.
- Mapping: kiting pays only where we outrange or outrun the enemy. Here:
  - house hunters carry the same laser (280 m hitscan);
  - house guns lose accuracy with range (D1: 57% at 100-126 m, 32% at 126-151 m);
  - they never close inside 45 m.

  So the only asymmetry is their **cooldowns**: 2.5 s gun reload after 12 shots, and the laser dead 1.65 + 0.75 s
  after a release.
- The cooldown-kiting rule in our terms:
  - expose and push during their gun reload (D4 already says so);
  - lay our laser release in their laser's dead window;
  - be off their line (cover step, or a boosted lateral move) on their predicted release tick.
- **Measured caution [M]:** full cover/peek/duck cycles lost -0.71, -0.94 and -0.60 at three teams. Apply the
  cooldown timing to *when we fire and sidestep*, not to hiding.

## 4. Battle-royale and shooter write-ups (positioning, zone, third parties)

- **Third parties.** Community guides (Fortnite, Apex, PUBG; for example gamertagmythras "Fortnite third party guide",
  Dignitas "How to improve your rotations") agree:
  - in late circles the first shooter usually loses;
  - let other players fight, and be the third party rather than receive one;
  - before you jump a fight, check the exit: know your ground after it ends.

  Evidence is practitioner consensus, not measured. Our own recorded free-for-alls agree: the bottom half dies in a
  median 21 s; calm, laser-heavy, well-cubed bots win.
- **Rotation.**
  - Rotate early. Late rotations force chaotic fights with little cover.
  - Move along the zone edge, with the closing wall at your back as a barrier. Crossing the centre exposes you to fire
    from 360 degrees.
  - Use the quiet ("dead") side of the zone.

  House bots reach the next circle 33-58 s early and sit at 0.41 of its radius [R]; FFA bots do various things.
- **Academic.** "Multi-agent interplay in a competitive survival environment" (arXiv 2301.08030): a shrinking safe
  zone alone does not create competition, but with a reward scheme it forces agents to fight for position.
  Little transferable.
- **Shooter AI (Halo, Killzone, F.E.A.R.).** The common core is threat-aware position picking (1.3), pre-aiming at
  predicted emergence points, and squad token systems.

Mapping for the final:
- Minimum-risk movement (2.5) with an edge-of-circle bias and "not nearest to anyone".
- Third-party entry only on a mech that is:
  - (i) damaged below 50%;
  - (ii) engaged with someone else (its aim not at us);
  - (iii) inside our laser's lethal partial-charge reach.

  Enter from its rear arc (x1.5), so that one beam plus the gun kills. Leave when the duel's winner turns to us.
- Practice-inert: all of this belongs behind the FFA latch (D12), which must keep SQUAD byte-identical.

## 5. Search and planning in a 10 Hz loop with a few milliseconds

- **RHEA** (Perez, Samothrakis, Lucas and Rohlfshagen, "Rolling horizon evolution versus tree search for navigation
  in single-player real-time video games", GECCO 2013):
  - evolve a short action sequence each tick, execute its first action, shift the rest (warm start);
  - it beats MCTS in several real-time games (Gaina et al., arXiv 2003.12331);
  - two-player rolling-horizon coevolution: Liu, Perez and Lucas, arXiv 1607.01730.
- **Macro actions** (Perez et al., "Solving the Physical Travelling Salesman Problem: tree search and macro actions",
  IEEE TCIAIG 6(1) 2014): an action every 40 ms. Repeating each action for k ticks cut the search space; the
  approach won the 2012 PTSP competition.
- **ABCD and PGS** (3.3-3.4): scripted playouts, 5 ms and 40 ms budgets.

**Budget arithmetic for us [A]:**
- 6 options x a 2.5 s horizon at 0.1 s steps = 150 steps.
- Each step updates us plus up to 6 hunters with a line, using closed-form expected damage (hit probability by range
  and by whether our velocity changes within the flight, from D1), not per-bullet simulation.
- That is about 150 x 7 x ~50 flops: well under 0.5 ms in JS. Line-of-sight checks are the cost. Precompute the
  hunter-to-option-path lines at 4 waypoints per option (24 checks; the per-check cost of `world.js` is not measured
  here [N], but `posEval` already runs comparable batches every 0.3 s).

**Two rules for this event:**
- **Never gate search on the wall clock.** One team's wall-clock-gated planner scored 3.75 / 3.90 / 3.67 for the same
  build [M], because behaviour changed with host load. Use fixed iteration counts (anytime in *nodes*, not ms), so
  that the deterministic replay of the 48 seeds holds (D10).
- **Evaluation order** (TPS, GAP1 26.7.3): cheap filters, then sort by weights, then expensive line checks top-down.
  Stagger line checks over decisions.

What to evaluate:
- LTD2-style: sum of sqrt(hp) x dps (us) - sum of sqrt(hp_i) x dps_i (hunters with a line);
- + 300 x expected kills (cubes, next token) - 1000 x P(death in the horizon);
- + the exposure integral;
- with a 10% hysteresis for the current option.

Use: only to pick among the existing legs (fight / finish / retreat / isolate / grab) at 2 Hz. The legs themselves
stay as they are.

## 6. Where the literature and our measured evidence disagree (do not import blindly)

| Literature default | Our measured result | Reading |
|---|---|---|
| Cover-based combat: fight from cover, peek, duck (Killzone, TPS, potential-field kiting) | cover-first / peek / duck bundles -0.71, -0.94, -0.60 [M]; hiding -0.44 to -1.75 [M] | the squad shares vision and keeps coming; time out of the fight costs more than the damage it saves. Use cover only for short steps (laser release tick, 6 m) and cheap isolation |
| Keep at maximum shooting distance (Hagelbäck) | 130-160 m stand-offs -0.77, laser 140/150 m not kept, 120 m kept [M][T] | house lasers are hitscan: range buys no protection from the main threat and silences our gun |
| Random direction changes defeat linear aim (RoboWiki) | fast flips -0.69 [M] | the measured change was open-loop reversals; use phase-locked speed changes (2.1) |
| Retreat and regenerate when hurt (Raven GetHealth, utility) | long heals lose; short heal breaks +0.17 [M]; removing low-hp retreat -0.41 at 5.58 [M] | the token frame (1.3): recover briefly between attackers, never hide long |
| Wide engagement (attack anything visible) | "engage any visible to 160 m" -0.29, "lone target within 220 m" -0.37 [M]; fighting from 20 s +0.38 [M ours] | the difference is the target filter: hostile, finishable or already engaged first (Attack-Value gives the order) |
| Planning with a simulator | our simulator's within-bot deltas had the wrong sign six times [M vs S] | plan only over 1-3 s inside a fight, where the physics and the house script are exact |

## 7. The twelve most promising techniques, ranked (value x evidence x cost; SQUAD unless marked)

Each item is one preset (old value = V4 byte for byte), so that it can ride as its own draw.

1. **Attack-Value (Smith-rule) target order with no-overkill** (Furtak and Buro 2010; NOK-AV best script in Churchill
   et al. 2012; Smith 1956).
   - cost = ttk_i / threat_i, threat from the visible `weapons`, cubes, line and range hit probability; keep
     stickiness and the finish bonus.
   - Retarget when in-flight bullets already kill.
   - [A] example: 8% less damage taken per two-hunter fight. Agrees with +0.39 [M] and the kept focus retunes [M].
     Cheap: about 30 lines in `selectTarget`.
2. **Phase-locked stop-and-go against linear-lead guns** (RoboWiki Stop And Go / Musashi trick).
   - Per-shooter cadence tracker. Brake or start on the predicted fire tick of the most dangerous gun at 85-160 m.
   - [A]: synced, every bullet misses from 85 m; open-loop only 20-73% (by cycle and range). Conflicts in form, not in substance, with the
     fast-flip loss [M]. Medium cost (`senses` + `legs`).
3. **Lanchester / ttk-vs-ttd fight-or-flee inequality** (Stanescu et al. 2015: learned Lanchester replacing
   simulation for attack-or-retreat took UAlbertaBot from 60.8% to 69.7%; A32 +0.34 [M]).
   - Fight while the damage taken to kill the current target, counting every line, is below hp - margin.
   - Replaces the LOSING table, keeps V4's heal breaks.
4. **Seek with memory, sound and occupancy, plus pre-charge at the predicted emergence point** (Raven HuntTarget;
   Isla's occupancy maps; Killzone 3 threat prediction).
   - Cuts V1's 16% roam and 10-17 s kill-to-hit gaps [S].
   - Start the laser 0.75 s before a predicted line opens: house first shot comes a median 1.15 s after the line
     opens [R], so a 315-damage beam lands before they react.
5. **Segmented lead for the gun** (GuessFactor / dynamic clustering, guarded by a virtual-gun comparison).
   - lead_fraction[flight time][time since the target's last reversal], fitted offline on house tracks.
   - [A toy]: 75% -> 86% at 130 m, 87% -> 96% at 100 m.
6. **Dead-time torso management** (melee radar gun-heat lock; rear x1.5).
   - During the gun reload with the laser cooling or absent, aim at the yaw that puts the most threat DPS inside the
     front arc, keeping the target within 80 degrees.
   - kyoto's 20% rear damage [S] suggests about 7% less damage taken.
7. **Exposure-weighted tactical paths and a go/stay test for every leg** (Millington ch. 6.3; Killzone; Dave Mark's
   threat templates).
   - Take retreat, isolate or grab legs only when the route's exposure integral beats staying.
   - Attacks the 72-73 HP/s walking legs [S]. Generalises I3 and I4.
8. **Cooldown-synchronised exposure** (Hagelbäck cooldown retreat; Uriarte kiting).
   - Time our release into the hunter's 2.4 s laser dead window.
   - Sidestep (6 m cover step or a boosted lateral move) on its predicted release tick (charge start + 0.75 s).
   - Push during its 2.5 s gun reload. Fire timing only, no hiding.
9. **Portfolio playout selector** (ABCD 5 ms / PGS 40 ms; scripts 95-100% exploitable).
   - Every 0.5 s, a 2.5 s scripted playout of each of 4-6 existing legs against the house-script model, LTD2 +
     kills - death risk, 10% hysteresis, fixed node budget.
   - Largest upside, largest build. Behind its own preset.
10. **Minimum-risk movement for the FFA** (HawkOnFire / Diamond) with "not nearest to anyone", perpendicularity, an
    edge-of-circle zone term and third-party entry rules (battle-royale guides). FFA latch only.
11. **Utility response curves with a commitment bonus** (Dave Mark IAUS; Lewis GAP3 ch. 13) only where thresholds
    flicker: retreat and heal entry/exit, grab. Keep today's breakpoints as the curve midpoints.
12. **Deterministic anytime compute discipline** (TPS evaluation order; macro actions; node budgets, never wall
    clock).
    - The enabler for 4, 7 and 9 within 2-5 ms.
    - Keeps the 48-seed replay reproducible (D10; 3.75/3.90/3.67 at a wall-clock planner [M]).

Suggested draws on the real scorer (one preset each on top of V4, best first):
- item 1 (cheapest, best supported);
- item 3;
- item 2;
- item 4 seek alone;
- item 6.

Items 5, 7 and 9 need offline fitting or a test harness first. Item 10 is final-only and practice-inert.

## Sources

Books:
- Millington and Funge, *Artificial Intelligence for Games*, 2nd ed., chapter 6 outline:
  https://www.oreilly.com/library/view/artificial-intelligence-for/9780123747310/ ;
  lecture notes https://imada.sdu.dk/~rolf/Edu/DM842/E17/lec8.pdf
- Buckland, *Programming Game AI by Example*, ch. 9-10: https://www.oreilly.com/library/view/programming-game-ai/9781556220784/chapter-195.html ;
  goal lecture https://web.cs.wpi.edu/~rich/courses/imgd400x-b08/lectures/J-Goal.pdf ;
  evaluator assignment https://web.cs.wpi.edu/~rich/courses/imgd4100-b14/homework/9-Health.html
- Game AI Pro chapters (free PDFs, index http://www.gameaipro.com/):
  - GAP1 ch. 26 Tactical Position Selection (Jack): http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter26_Tactical_Position_Selection.pdf
  - GAP1 ch. 28 Kung-Fu Circle (Dawe): http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter28_Beyond_the_Kung-Fu_Circle_A_Flexible_System_for_Managing_NPC_Attacks.pdf
  - GAP1 ch. 29 Killzone 3 bots (Straatman et al.): http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter29_Hierarchical_AI_for_Multiplayer_Bots_in_Killzone_3.pdf
  - GAP1 ch. 31 Target Tracks (Welsh): http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter31_Crytek's_Target_Tracks_Perception_System.pdf
  - GAP2 ch. 25 MCTS (Sturtevant): http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter25_Monte_Carlo_Tree_Search_and_Related_Algorithms_for_Games.pdf
  - GAP2 ch. 30 Modular Tactical Influence Maps (Mark): http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter30_Modular_Tactical_Influence_Maps.pdf
  - GAP3 ch. 13 Utility considerations (Lewis): http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf
  - GAP3 ch. 25 Combat outcome prediction (Stanescu, Barriga, Buro): http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter25_Combat_Outcome_Prediction_for_Real-Time_Strategy_Games.pdf
  - GAP3 ch. 28 MCTS pitfalls (Roelofs): http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter28_Pitfalls_and_Solutions_When_Using_Monte_Carlo_Tree_Search_for_Strategy_and_Tactical_Games.pdf
- Killzone: https://www.guerrilla-games.com/read/killzones-ai-dynamic-procedural-tactics ;
  https://www.guerrilla-games.com/media/News/Files/gdce05_killzone_ai.pdf
- van der Sterren, Terrain Reasoning for 3D Action Games: https://gamedeveloper.com/programming/terrain-reasoning-for-3d-action-games
- Isla and Blumberg, object persistence: https://characters.media.mit.edu/Papers/objectPersistence.pdf ;
  Third Eye Crime: https://ojs.aaai.org/index.php/AIIDE/article/view/12663
- Dave Mark, IAUS: https://gameai.com/iaus.php ;
  *Behavioral Mathematics* review: https://www.gbgames.com/2017/02/13/book-review-behavioral-mathematics-for-game-ai-by-dave-mark/
- Yannakakis and Togelius: https://link.springer.com/978-3-319-63518-7 ;
  Play slides https://gameaibook.org/wp-content/uploads/2025/08/II.Play_.pdf

RoboWiki:
- Minimum Risk Movement: https://robowiki.net/wiki/Minimum_Risk_Movement
- Understanding HawkOnFire: https://robowiki.net/wiki/Melee_Strategy/Understanding_HawkOnFire
- Wave Surfing: https://robowiki.net/wiki/Wave_Surfing
- GuessFactor Targeting: https://robowiki.net/wiki/GuessFactor_Targeting_(traditional)
- Virtual Guns: https://www.cse.chalmers.se/~bergert/robowiki-mirror/RoboWiki/robowiki.net/wiki/Virtual_Guns
- Stop And Go: https://www.cse.chalmers.se/~bergert/robowiki-mirror/RoboWiki/robowiki.net/wiki/Stop_And_Go
- Melee Radar: https://robowiki.net/wiki/Melee_Radar
- Diamond: https://github.com/Voidious/Diamond
- Dynamic Clustering tutorial: https://www.cse.chalmers.se/~bergert/robowiki-mirror/RoboWiki/robowiki.net/wiki/Dynamic_Clustering_Tutorial.html

RTS:
- Churchill, Saffidine and Buro 2012: https://ojs.aaai.org/index.php/AIIDE/article/view/12527 (text read from the PDF)
- Churchill and Buro 2013 PGS: https://www.cs.mun.ca/~dchurchill/publications/pdf/combat13.pdf
- Furtak and Buro 2010: https://ojs.aaai.org/index.php/AIIDE/article/view/12410
- Stanescu, Barriga and Buro 2015: https://ojs.aaai.org/index.php/AIIDE/article/view/12780
- Uriarte and Ontañón 2012: https://ojs.aaai.org/index.php/AIIDE/article/view/12544
- Hagelbäck and Johansson 2009: https://ojs.aaai.org/index.php/AIIDE/article/view/12365 ;
  2008: https://aamas.csc.liv.ac.uk/Proceedings/aamas08/proceedings/pdf/paper/AAMAS08_0269.pdf
- Liu dissertation: https://www.cse.unr.edu/~simingl/Dissertation/thesis-Siming-Final.pdf

Planning:
- RHEA overview, Gaina et al.: https://arxiv.org/pdf/2003.12331
- Rolling-horizon coevolution: https://arxiv.org/abs/1607.01730
- PTSP macro actions: https://repository.essex.ac.uk/7250/

Battle royale:
- https://arxiv.org/pdf/2301.08030
- https://gamertagmythras.com/blog/fortnite/fortnite-third-party-guide
- https://dignitas.gg/articles/how-to-improve-your-rotations-and-start-placing-higher
- https://gamertagmythras.com/blog/pubg-battlegrounds/pubg-endgame-circle-strategy

Cited from knowledge without a fetched page (references exact to our best knowledge):
- Kovarsky and Buro 2005 (LTD/LTD2; also quoted inside the ABCD paper);
- Smith 1956 (WSPT);
- Lanchester 1916 (quoted inside GAP3 ch. 25);
- Lidén, *AI Game Programming Wisdom* 1 (2002);
- Isla, *AI Game Programming Wisdom* 3 (2006);
- Perez et al., GECCO 2013;
- the Buckland desirability formulas (the book's ch. 9; the WPI assignment confirms the evaluator structure, not the
  constants).
