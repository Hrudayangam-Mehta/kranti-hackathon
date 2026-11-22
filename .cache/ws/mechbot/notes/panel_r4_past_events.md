# Panel R4: what won past bot competitions, and what transfers to Mech Royale

Written Sat 21 Nov 2026, about 19:00 UTC, by the past-events researcher of panel R4 (Opus sub-agent). Inputs read:
`HANDOFF.md`, `notes/build_spec_r3a2.md`, `notes/top5_synthesis.md`, `notes/checkR3a2.md`, `notes/submissions.md`,
`notes/mechanics_deep.md` (sections 1-2), the integration log tail, DOCTRINE V4, `kit/protocol.md` (cube and regen
rules), `notes/hello_example.json` (weapon numbers), and `bot/lib/tactics.js` / `params.js` read-only to name hooks.
Nothing under `bot/`, `sim/`, `intel/` or the shopping `src_repo` was opened for writing; `intel/` was not opened.

Clean room: everything below is our prose about public write-ups. No code of any team or author was copied, and no
fetched page asked us to do anything (nothing was acted on). The web was used through WebSearch (23 queries) and
WebFetch of pages those searches returned. Several fetches failed (404/503/403); where only a search snippet was read,
the source is marked "(snippet)".

Grades: **[W]** read this session in the cited source; **[Ws]** search snippet only; **[K]** my own background
knowledge, not re-verified this session (treat as a pointer); **[A]** our arithmetic
(`tools/panel_r4/burst_and_draws.py`, output in `tools/panel_r4/burst_and_draws.out.txt`); **[M]** an official
Mech Royale result in our notes. Gains are practice-board points and are guesses unless marked [M].

---

## 0. The analogy in one paragraph

Practice in Mech Royale is one bot against a 15-mech house squad that hunts it, under exact hitscan lasers, an
exactly aimed gun, 45 HP/s regeneration after 5 s without dealing or taking damage, a shrinking zone and cubes
that add 4% damage and 4% HP each (cap 10). The score is house mechs dead before we die, and on the same seeds every
strong bot dies at about 95 s, so the lever is **kills per minute alive** (kyoto 3.76, ours 1.91 at 5.02; R3a2 in
the simulator 2.78). In past events the closest matches are: StarCraft micro skirmishes against a scripted AI
(focus fire, kiting, fight-or-flee from a combat model), Battlecode unit micro (attack value, kiting, fall back to
heal), Robocode melee (minimum-risk movement, target choice, survival scoring), and CodinGame games won by search
against an exact simulator and a good opponent model. The house squad's fire control is known almost exactly
(DOCTRINE V4 D1), which is the condition under which simple search beat heuristics in those events.

---

## 1. Robocode melee (RoboRumble MeleeRumble; Diamond, Shadow, HawkOnFire, Coriantumr)

What won and why:
- **Minimum-risk movement (MRM)** is the standard melee movement. Generate candidate points, rate each with a risk
  function, go to the least risky. Most risk functions use enemy energy and distance. Other terms: whether we would
  be the closest bot to some enemy (so we are not its target), repelling the centre, avoiding long single moves,
  avoiding staying in one area, and moving perpendicular to enemies rather than toward or away. [W robowiki MRM]
- Diamond (Voidious) uses MRM in melee and wave surfing only in 1v1. Its README says "in Melee, it doesn't lose to
  anyone, but roughly ties with the other two strongest bots" (Aug 2015). Its melee tuning: stay far from other bots,
  stay perpendicular to them. It is the outlier among the top three for an MRM without waves. [W Diamond README;
  Ws RoboWiki Diamond]
- Melee wave surfing does not transfer from 1v1 directly: "you can not just move to the least dangerous position"
  when many guns are on you. [Ws robowiki Talk:MRM]
- Target choice: the obvious target is the one with most control over being the closest for others; others balance
  energy, damage points, easy kills and the bots that are dangerous to you. [Ws RoboWiki Melee Strategy, RetroGirl]
- HawkOnFire's risk (from memory, roughly): sum over enemies of min(their energy / ours, 2) x (1 + |cos(angle
  between our move and the line to them)|) / distance squared, plus a small repulsion from our last position. [K]
- **Scoring** (Robocode): 50 survival points to each living bot per death, 10 per opposing bot as the last-survivor
  bonus, 1 point per damage, plus 20% of all damage dealt to an enemy when we kill it. [W robocode.dev scoring]

Transfers:
1. Our `makePosEval` exposure term is an MRM. MRM's best terms weight each enemy by how dangerous it is (energy) and
   by distance; ours should weight each non-target threat by its expected damage at the candidate point, i.e. the
   house hit table (D1: under 75 m about 100%, 75-100 m 86%, 100-126 m 57%, 126-151 m 32%, beyond 16-30%). Moving a
   flanker from 100 m to 126 m costs it about a third of its gun hits.
2. Robocode's 20% kill bonus and Mech Royale's practice score both pay only for **finished** damage. Damage left on
   a mech that later regenerates is worth nothing (our 1,349 HP per match into mechs we did not kill, kyoto 852).
3. Survival scoring (50 per death outlived) is the FFA final's logic, not practice's. In the final the MRM term
   "do not be the closest mech to anyone" is the right one (it matches the 55-60 m engagement bubbles of the kyoto
   and giddy families). Practice-inert.
4. Does not transfer: wave surfing against a squad (their guns aim exactly at our predicted intercept; D4's
   bullet-aware dodge already is the Mech Royale form of it), virtual-gun selection (house bots do not adapt).

## 2. StarCraft AI competitions (AIIDE, CIG): UAlbertaBot, SparCraft, Lanchester models, PurpleWave, ECSLBot

What won and why:
- UAlbertaBot (AIIDE 2013 champion) decides attack or retreat by simulating the current fight in SparCraft, a fast
  combat model. SparCraft ignores collisions and diverges from the real game over time. [Ws AIIDE papers]
- Stanescu, Barriga and Buro (AIIDE 2015) predict fight outcomes with Lanchester attrition laws whose unit strengths
  are learned from recorded battles; faster than simulation; built into a bot that uses it to decide attack or
  retreat, tested against the top AIIDE 2014 bots. [Ws AIIDE 12780]
- Uriarte and Ontanon, "Combat Models for RTS Games": Lanchester-type combat models used inside a tactical search won
  75% of games against the built-in AI and lost none; random orders won 3% (the hand-tuned scripted bot won 98%).
  The lesson is that a *cheap, approximate* fight model inside a small search is enough. [W arXiv 1605.05305]
- PurpleWave (Dan Gant, 2017 survey): simulated combat outcomes weighted by heuristics, with **hysteresis that
  depends on how easily each unit can enter or leave a fight**; units may dissent from the group decision; mostly
  stateless. [Ws PurpleWave survey]
- ECSLBot (CIG 2014): a genetic algorithm tuned 14 micro parameters, among them the stand-still time after each shot
  (kiting), the distance at which kiting starts, how far to step back, the re-target radius, the HP under which a
  nearby enemy becomes the new target, and the HP under which a unit flees. It beat UAlbertaBot and Nova in kiting
  efficiency, target selection and fleeing. Because the engine is noisy (5 v 5 Vultures could end 3 units apart),
  each fitness was the mean of 5 games and each result the mean of 10 seeded runs. [W CIG2014 paper]
- Standard micro (focus fire on one target, pull badly damaged units back, kite shorter-ranged enemies; "stutter
  step" = fire when the weapon is ready, move during its cooldown) is common to all strong bots. [Ws Liquipedia; K]

Transfers:
1. **A fight model decides commit or retreat** (this is the owner's "direct search"). For one target the Lanchester
   model reduces to a race: our time to kill it against its time (plus every other line's) to kill us. All the
   inputs are known numbers here (section 9).
2. **Kiting = fire when ready, break exposure during the cooldown.** Our laser is a 0.75 s charge, then a 1.65 s
   cooldown; the house squad's guns run 12 shots in about 3 s, then 2.5 s silent; the house laser needs a sight line
   at release. That is the StarCraft cooldown-dance with exact numbers.
3. **Asymmetric hysteresis.** Entering a laser fight at 115 m is cheap for us; leaving one under hitscan is costly.
   Enter a commit on a strict test and leave it on a looser one (PurpleWave).
4. **Retreat HP is a tuned number, not a doctrine.** ECSLBot tuned its flee HP; the measured Mech Royale results agree
   (removing the low-HP retreat cost the 5.58 bot 0.41 [M]; retreating at 72% cost 1.1 elsewhere [M]).
5. **Noise discipline.** Results were averaged over 5 x 10 games even in a controlled engine. Our 48-match draws are
   noisy at about 0.15 per draw (section 10), so one draw per arm decides nothing.

## 3. Battlecode (MIT)

What won and why (2023, team "Don't @ Me", finalist postmortem) [W]:
- Attack value of a target = (unit type value) + (HP our attack removes) + (enemy missing HP)/2 + 100 if the attack
  kills. Robots already in range are always preferred. Effect: focus on valuable and low-HP targets, especially when
  they can be killed.
- **Kiting on every turn movement is available**: attack, then step away, "potentially even leaving its vision
  radius, essentially getting a free hit".
- **Step up**: if an ally is already engaging, step in rather than kite away (one target per turn anyway).
- **Fall back**: when not in combat and under half health, go to the nearest friendly healing island and stay until
  full unless an enemy appears.
- Lessons: "at the highest elo, generality and robustness starts to take a back seat to legitimate higher-level
  strategy"; read previous postmortems; respond to the meta on the leaderboard.
- Other postmortems: better micro and macro beat a cheese strategy (2025); "winning fights wins games" (2013
  lecture). [Ws]

Transfers:
1. The kill bonus (+100 on kill against an HP-removed term) is our R3a2 P3 focus cost (-200 when finishable). Keep it.
2. "Attack then step out of sight" is the laser peek: release with a line, break the line during the 1.65 s cooldown,
   step back out when the next charge is at 80% (the torso turns freely while charging; D8 already hands the torso to
   the direct aim from 80%).
3. Their fall-back-to-heal works because healing on an island is fast and certain. Ours needs 5 s with no damage
   dealt or taken, which a hunting squad denies; kyoto's three heal phases were rejected officially [M]. Do not
   import the heal; import only the short fall-back.

## 4. Google AI Challenge: Ants (2011) and Planet Wars (2010)

What won and why:
- Ants, won by xathis: every move depends only on the ant's local environment; no adaptation to winning or losing;
  all enemies treated the same; a routine that lists the local combats and runs **many small local searches**; "a
  lot of little pieces done well rather than a few overarching principles". A strong rival regretted the time spent
  on minimax combat code (it only ran for small fights) for the benefit it gave. [W LessWrong post-mortem]
- Planet Wars, won by bocsimacko (Gabor Melis, Lisp): its strength came from "smart evaluation that tells them what
  planets can be taken" and how long they can be held, and from a clear view of the future (projecting ships in
  flight). Lessons from a strong rival: "simple and principled beats capable but haphazard"; "a strong program needs
  continuous attention to detail"; a deep narrow search to 30 turns was "a total bust"; his 2010 drop came from
  last-minute, insufficiently tested changes. [W satirist.org]

Transfers:
1. The commit search should be local and shallow: the current target and at most a few other candidates, a 2.4-4.8 s
   horizon, closed-form damage. Deep planners lost; small exact evaluations won.
2. Freeze the code well before the lock (our lock 15:15 UTC Sun): no untested change in the last two hours.

## 5. Halite I-IV (Two Sigma; Halite IV on Kaggle)

What won and why:
- Halite I combat: a top player beat the checkerboard combat pattern and stood STILL on combat squares to get overkill
  damage; sending pieces into combat one by one beat spacing them out. [Ws shummie postmortem]
- Halite II: won by reCurs3, FakePsyho second, shummie third; postmortems discouraged keeping state in the bot. [Ws
  Two Sigma; Ws]
- Halite III (rank 66 write-up): attack only with local superiority (at least 2 friendly ships nearby and the enemy
  carrying 1.5 times our cargo); every change tested by playing new against old **twice with a seat swap**; a bot
  with no random variables still gave different results. [W stonet2000]
- Halite IV (rule-based team write-up): "100% rule-based ... more than a hundred parameters chosen mostly by trial and
  error". [Ws 0Zeta]

Transfers:
1. Engage on local superiority: our P4 counts mechs within 160 m; the commit test below uses the same count.
2. Paired tests (seat swap = same seeds, both arms) for anything we run locally; on the official scorer, two salts per
   arm.
3. Rule bots with many hand-tuned parameters do win when the tuning is done on the real evaluator.

## 6. CodinGame contests (Coders Strike Back, Fantastic Bits, Code vs Zombies)

What won and why [Ws CodinGame blog posts]:
- Winners re-implemented the game engine and searched short action chains with a genetic algorithm or Monte Carlo
  rollouts.
- "Simulating without predicting the opponent moves doesn't work so great"; "good opponent prediction is worth more
  than 10 points" (Coders Strike Back).
- Common recipe: spend about 30 ms evolving the opponent's likely moves against a dummy, then evolve our own against
  that prediction; the 3rd place spent 12 ms on each enemy pod.

Transfers:
1. We have the opponent model for free: the house fire control is an exact first-order intercept, a 12-shot rhythm,
   nearest-target choice, no retreat, hops a third of fight time (D1). A short forward evaluation against that model
   is where search beats a hand-tuned threshold.
2. Our local simulator mispredicts within-bot deltas (six wrong-sign cases, and our core vs full builds). Use it only
   for the duel arithmetic and for crashes, not for choosing between rules (same as CodinGame players who validated
   on the real arena).

## 7. Kaggle simulation competitions (Halite by Two Sigma, Lux AI, Kore 2022, Hungry Geese)

What won and why:
- Lux AI 2021: Toad Brigade won with reinforcement learning; Kore 2022: rule-based agents topped; Hungry Geese: MCTS
  with a learned evaluation; top teams scraped episodes of high-rated public agents as training data. [Ws arXiv
  2301.01609; speakerdeck summary]
- Ladders rate agents from continuous automated matches with a daily submission limit (five per team per day in a
  2026 Kaggle simulation). [Ws]

Transfers:
1. The ladder is the only trusted evaluator; budget submissions as experiments.
2. Learning approaches do not fit our remaining 20 hours. Rule-based tuning on the real scorer does (Kore 2022).
3. For Shopping Sessions the final is rescored on 60M new events with retiming, so practice draws do not carry into
   the final: pick the final entry by verified correctness and mean speed, never by the luckiest practice draw.

## 8. FPS and battle-royale game AI (Quake III bot, Killzone, Battlefront II, ViZDoom)

What won and why:
- Quake III Arena bot (van Waveren, 2001): fuzzy relations say how much the bot wants to do, have or use something
  (item weights, weapon weights) given its situation. [Ws thesis, bot manual] From memory: an aggression value from
  health, armour and weapon decides chase or retreat, and retreating means going for health and armour items. [K]
- Killzone (Straatman and van der Sterren, GDC Europe 2005): tactical positions are picked by a weighted-sum
  evaluation borrowed from chess: partial cover from the primary threat, cover from secondary threats (weight 20),
  line of fire to the primary threat (40 with partial cover, 20 without), proximity and preferred fighting range.
  [Ws slides]
- Battlefront II: each weapon has an optimal stop-and-shoot distance; the bot engages the closest target in its
  view cone. [Ws EA AI deep dive]
- ViZDoom deathmatch (2016-2017) [W arXiv 1809.03470]:
  - Marvin (2017 winner, Track 1) took the most hits of anyone (1,266) yet died least (213), because it collected
    resources: 354 medikits, 272 armours, 164 ammo.
  - Arnold separated navigation from aiming (a classifier picked the module when an enemy was visible). Arnold2 was
    the most precise shooter (32.8%) and was hard-coded to run after about one second of standing still.
  - Suicides were high everywhere, mostly from shooting into walls at low precision.
  - Bots still did not dodge well.

Transfers:
1. Our position value already has Killzone's shape (keep the target's line, avoid secondary lines, preferred range).
   Their weights say a secondary threat's line costs about half as much as the primary line is worth.
2. Never stand still more than about 1 s in a fight (Arnold2; our D4 strafe already flips every 0.8-1.6 s).
3. Resources are survival: cube pickup in and after fights (each cube +4% HP and damage) is our Marvin. Collect the
   victim's cubes before any retreat (kyoto: 56 of 84 cubes within 8 s of its kills).
4. Never fire with a wall inside 3 m of the barrel (already in mechanics_deep; ViZDoom's wall suicides are the
   failure).

---

## 9. The owner's request: a very simple direct search to attack and kill, then retreat

### 9.1 The arithmetic it must respect [A]

Numbers (hello config): gun 45 damage, 0.24 s cooldown, 12 rounds, 2.4 s reload; laser 315 x (0.35 + 0.65 x
charge / 0.75), 1.65 s cooldown; HP 1400 x (1 + 0.04 x cubes), damage x (1 + 0.04 x cubes), cap 10; regen 45 HP/s
after 5 s without dealing or taking damage.

Burst in one laser cycle (2.4 s), laser ready, full magazine, our gun hit rate 0.7, as a share of a full-HP hunter:

| our cubes | hunter cubes | dual fire (gun while charging) | no dual fire |
|---|---|---|---|
| 0 | 0 | 0.47 | 0.38 |
| 3 | 0 | 0.53 | 0.43 |
| 6 | 0 | 0.59 | 0.47 |
| 10 | 0 | 0.66 | 0.54 |
| 10 | 3 | 0.59 | 0.48 |

With the laser cooling, the gun alone is 0.25-0.35 of a fresh hunter. So "enough to damage more than 50%" of a
**fresh** hunter is true only with the laser ready, a nearly full magazine and some cubes; it is true almost always
against a hunter at 75% HP or less with the laser ready, and against one at 50% or less on the gun alone. Read
literally on full HP, the rule would rarely fire early in a match and would make us passive, which the measured
results punish (hiding and waiting -0.5 [M]; hold-fire under fire -0.34 [M]). So the rule must use the target's
**current** HP and must never block return fire or the D0 hostile answer.

Regeneration: a retreat shorter than 5 s gifts no HP to anyone; one of 8 s gives each damaged hunter that lost its
line 135 HP back; a 13 s heal gives 360 to us and to each of them. Hunters that keep shooting at us never regenerate
(dealing damage resets their timer). **So "then retreat" must end within about 4.5 s** whenever a damaged hunter is
alive; past 5 s it erases our own work.

### 9.2 The rule (preset `hunt50`, SQUAD posture only; FFA unchanged)

Direct search, once per decision, over at most 6 candidate mechs (listed, with a line or seen in the last 1.5 s,
within 200 m) and two plans each, all in closed form (well under 0.1 ms):

- `NOW`: fight it from here with what is ready.
- `WAIT`: break the line now and re-engage when the laser is ready (cooldown <= 0.3 s) and the magazine holds at
  least 8 rounds.

For each (target i, plan p) compute:
- `B_i` = the existing `tactics.burstDamage(B, tr)` (magazine at the band hit rate `B.gunStat.q(d)` plus a ready
  beam, rear and cook-off multipliers included), evaluated at the plan's start time.
- `TTK_i,p` = time until cumulative expected damage reaches `tr.hp`: beam at t_ready + 0.75 s and then every 2.4 s;
  gun every 0.25 s from the magazine, then 2.4 s reload.
- `IN_p` = expected damage we take while exposed: sum over mechs with a line of (gun 45 x 12 / 5.5 s x hit(range)
  from the D1 table, using each shooter's own magazine phase from senses; plus 315 / 2.7 s if it carries a laser),
  times TTK for `NOW`, or times the 0.75 s re-peek for `WAIT`.

Decision:
1. **Commit (attack and kill)** to the target and plan with the smallest TTK such that `B_i >= 0.5 x tr.hp` (the
   owner's 50%) and `me.hp - IN_p >= 0.30 x me.maxHp` (or the target is finishable). While committed: P3 keeps the
   target (already -200 sticky); `pulseLosing` is cancelled unless 3 or more mechs are within 160 m and our HP is
   under 40%, or our HP is under 25%; hold the near edge of the band (100 m with a laser, 75 m gun only); P5 boost
   while charging. No walk-in: giddy's "50% trigger" finish was officially not kept [M], and finish20 stays a
   separate optional preset.
2. **Leave the commit** (hysteresis, PurpleWave) only when the target is dead, or `B_i < 0.3 x tr.hp` with the laser
   cooling for more than 1 s, or 3 s pass without our damage on it, or P4 LOSING fires on its safety thresholds.
3. **Then retreat (pulse)**: after a kill, or when no candidate passes the commit test and at least one mech has a
   line on us: first take the victim's cubes if they lie within 40 m and at most one other mech has a line; then go
   DISENGAGE to a hide cell only if `B.tCover <= 1.5 s`, keep shooting and charging while moving (D3), and end the
   pulse when the laser is ready and the magazine holds at least 8 rounds, or **after 4.0 s at most**. With no
   cover within 1.5 s, stay in FIGHT and strafe (P4's rule).
4. Never blocked by this rule: return fire on a mech that hit us in the last 4 s, the D0 hostile answer, drone
   self-defence, the zone, last stand.

Hooks: a new `tactics.h50(B)` after `selectTarget` (fills `B.h50 = {target, plan, ttk, commit}`); `decideMode` reads
`B.h50.commit` before `losing()` and maps the pulse to `MODE.DISENGAGE` with an end time; the legs reuse the
P4 DISENGAGE path. New `PARAMS`: `h50Frac 0.5, h50Leave 0.3, h50Reserve 0.30, h50PulseMax 4.0, h50CoverS 1.5,
h50MagMin 8, h50Cands 6`. Old values reproduce R3a2 byte for byte (`hunt50: 'off'`).

Evidence elsewhere: UAlbertaBot / SparCraft and the Lanchester bots decide attack or retreat with a cheap combat
model; Uriarte and Ontanon's model-inside-search won 75% and lost none against the built-in AI; PurpleWave's
entry/exit hysteresis; Battlecode's kill bonus and attack-then-step-away; CodinGame's opponent-model search; the
5 s regen rule (section 9.1). Against: our measured passivity losses; giddy's 50% walk-in not kept. Expected 0 to
+0.3 [C]; test as its own draw on the leader, two salts.

---

## 10. How winners used their submission budgets, and our slot plan

What past winners did:
- Robocode authors compare versions over thousands of rumble battles because melee results are noisy; survival
  scores shift with the opponent mix [Ws RoboRumble talk pages; K].
- ECSLBot averaged 5 games per fitness and 10 seeded runs per result [W]. Halite III authors played new vs old with a
  seat swap and still saw varying results from a deterministic bot [W]. Halite IV and Kore 2022 rule bots were tuned
  by trial and error on the ladder [Ws].
- In this event: giddy's 6.06 is the best of about 30 official draws; kyoto ran a one-knob hill climb v1-v48 and its
  6.31 is probably a lucky draw (v44-v48 never beat it; a neutral change moved a build by 0.25) [our notes, T].

Our arithmetic [A]: with "best score counts", the board value of a build is the **maximum** of its draws. With a
per-draw standard deviation of about 0.15 (range 0.10-0.20), the expected maximum of k salts above the build's mean:

| k | 2 | 4 | 8 | 16 | 24 | 32 | 48 |
|---|---|---|---|---|---|---|---|
| + sd | 0.57 | 1.03 | 1.42 | 1.77 | 1.95 | 2.07 | 2.23 |
| + points at sd 0.15 | 0.09 | 0.15 | 0.21 | 0.27 | 0.29 | 0.31 | 0.33 |

Slot plan (Mech Royale 4 per hour; about 76 slots from 20:00 Sat to the 15:15 Sun lock; ties go to the earlier
entry, so submit early in each hour):
1. 19:00-20:00: V1-V4 as planned.
2. 20:00-21:00: V1-V4 again with salt 1 (two draws per arm; choose the leader by the **mean**, not the best draw:
   the best single draw is biased upward).
3. 21:00 to about 07:00 Sun: one-change arms on the leader, two salts each, in this order: `hunt50`, the overkill
   guard, `finish20`, `R1: 'off'`, supply drops off in SQUAD, the posEval weighting. Keep a change when its two-draw
   mean is not below the leader's by more than 0.1 (the kyoto/giddy "keep what does not lose" hill climb); a
   two-draw difference has a standard deviation of about 0.15, so only effects of 0.3 or more are visible.
4. About 07:00 to 15:15 Sun (about 33 slots): salts only, three of the best-mean build to one of the runner-up per
   hour. Expected +0.3 over the build's mean.
5. Every variant must carry the same FFA code: the best-scoring entry is what plays the final unless another is
   picked. Freeze code changes by 13:00 Sun (Planet Wars lesson).
6. The owner submits by hand: prepare each salt build and its commit in advance so a slot takes about a minute;
   any hour left unused lowers the expected maximum.

Shopping Sessions (2 per hour): the final reruns the chosen commit on new data and retimes the top 10 seven times, and
practice times vary by up to 20% across machines. Use the slots for correctness-verified speed builds; choose the final
by mean speed over at least two clean runs, never by the luckiest practice draw.

---

## 11. Ranked changes for our bot (each a preset; R3a2 values reproduce byte for byte)

1. **Max-of-draws slot plan (process, no code).** Two salts per arm for selection, then salts only of the best-mean
   build from about 07:00 Sun, about 33 draws. Expected +0.2 to +0.4 on the board score at a per-draw sd of
   0.10-0.20 [A]. Evidence: giddy's 6.06 is a best of about 30 draws, kyoto's 6.31 is probably a lucky draw [T];
   noise-averaging in ECSLBot, Halite III and RoboRumble [W/Ws]. Hook: `PARAMS.salt` and `notes/submissions.md`.
2. **`hunt50` commit-and-pulse (the owner's rule), section 9.2.** Commit when the ready burst covers at least 50% of
   the target's *current* HP and our HP after the expected exchange is at least 30%. Hysteresis: leave at 30%. Then
   take the cubes within 40 m and pulse for at most 4.0 s (under the 5 s regen trigger), with cover within 1.5 s or
   no pulse at all. Never block return fire. Hook: new `tactics.h50` after `selectTarget`, read in `decideMode`
   before `losing()`. Expected 0 to +0.3 [C]. Evidence: SparCraft/Lanchester attack-or-retreat bots, model-in-search
   75% wins and 0 losses, PurpleWave hysteresis, Battlecode kill bonus and kiting, the CodinGame opponent model.
3. **Laser-cycle peek** (part of `hunt50`'s pulse, or its own preset `peek`). Break the line during our 1.65 s
   cooldown only when 2 or more mechs have a line on us and a hide cell lies within 6 m (9 m boosting). Charge out of
   their sight and step out at 80% charge to release. Expose ourselves preferably during a shooter's 2.5 s reload.
   Hook: `mover`/`brain.legs()` FIGHT branch, `B.hide`. Expected 0 to +0.2 [C]; the risk is passivity (TTUN dropped
   cover-seeking as too passive). Evidence: Battlecode's "free hit", ECSLBot's evolved stand-still and kite
   distances, Killzone's partial-cover weight of 40, the StarCraft stutter step [K].
4. **Overkill guard.** If the gun's next two rounds at the band hit rate kill the target (target HP <= 2 x 45 x
   damage multiplier x q(d)), do not release a full beam on it: hold the charge (`laserForceS` 1.5 -> 1.9, within the
   engine's 2 s hold) and release on the next candidate within 0.25 rad of swing. Keep the existing lethal partial
   release. Hook: `firecontrol.js` at the `killNow` / force-release decision. Expected 0 to +0.1. Evidence: Halite I's
   STILL-for-overkill [Ws]; kyoto's 16 partial releases at exactly the remaining HP [T]; StarCraft damage assignment
   [K].
5. **Danger-weighted position value (MRM / Killzone).** In `exposure()` / `makePosEval`, weight each non-target threat
   with a line at the candidate point by its expected damage rate there: (45 x 12 / 5.5 s) x hit(range) from the D1
   table, plus 117 if it has a laser. Score our target's line as a requirement, and other lines at about half the
   value of the primary line (Killzone 40/20). Add a small cost for being within 3 m of our position 1 s ago (never
   stand still). Expected 0 to +0.15. Evidence: Diamond "doesn't lose to anyone in melee" with a simple MRM [W];
   HawkOnFire [K]; Killzone [Ws]; Arnold2 runs after about 1 s still [W].
6. **Cubes before retreat.** After our kill, collect the victim's cubes within 40 m first (death drop = its cubes + 2)
   unless 2 or more other mechs have a line on us. Mostly in place (D6); only the order against the pulse is new.
   Evidence: ViZDoom's Marvin took the most hits but died least by collecting resources [W]; kyoto took 56 of 84
   cubes within 8 s of its kills [T].
7. **FFA only (final): "never be the closest mech".** In the FFA posture's position value, add a cost when we would
   be the nearest mech to a calm mech within 60 m (the Robocode MRM term against the 55-60 m bubbles of the
   kyoto/giddy families). Practice-inert by construction. Evidence: Robocode melee target logic and survival scoring
   [W/Ws].
8. **Engineering discipline.** Paired seeds for local checks, at least two official salts per arm, decisions mostly
   stateless (Halite II, PurpleWave), and the code frozen by 13:00 Sun (Planet Wars). No gain by itself; it keeps
   items 1-7 honest.

Not recommended from past events: deep search or long-horizon planners (Planet Wars' 30-turn search "a total bust";
Ants' minimax regret), learning approaches in the 20 hours left (ViZDoom, Lux and Hungry Geese winners trained for
days), heal states copied from Battlecode (our regen rule makes them gifts to the hunters), and wave surfing against
an exactly aiming squad.

---

## Sources

Read this session (WebFetch of a search result):
- RoboWiki, Minimum Risk Movement: https://robowiki.net/wiki/Minimum_Risk_Movement
- Diamond README (Voidious): https://github.com/Voidious/Diamond
- Robocode scoring: https://robocode.dev/articles/scoring
- ECSLBot, CIG 2014 micro paper (University of Nevada, Reno): https://www.cse.unr.edu/~simingl/papers/publish/CIG2014IMPFMicro.pdf
- Uriarte and Ontanon, Combat Models for RTS Games: https://arxiv.org/pdf/1605.05305
- Battlecode 2023 postmortem, "Don't @ Me": https://battlecode.org/assets/files/postmortem-2023-dont-at-me.pdf
- AI Challenge Ants post-mortem and comments: https://www.greaterwrong.com/posts/ELCsD7MYaqnkarPBi/ai-challenge-ants-post-mortem
- Planet Wars 2010 and follow-up (oddshrimp author): https://satirist.org/ai/planetwars/
- Halite III post-mortem (rank 66): https://stonet2000.github.io/postmortem/
- ViZDoom Competitions: Playing Doom from Pixels: https://ar5iv.labs.arxiv.org/html/1809.03470

Search snippets only (pages not opened or fetch failed):
- RoboWiki mirror pages (Melee Strategy, Diamond, Talk:MRM, RetroGirl): https://www.cse.chalmers.se/~bergert/robowiki-mirror/RoboWiki/robowiki.net/wiki/MeleeStrategy.html
- Stanescu, Barriga, Buro, Lanchester attrition laws, AIIDE 2015: https://ojs.aaai.org/index.php/AIIDE/article/view/12780
- PurpleWave 2017 survey: https://www.cs.mun.ca/~dchurchill/starcraftaicomp/2017/survey/PurpleWave_Survey.txt
- Liquipedia, Micro (StarCraft): https://liquipedia.net/starcraft2/Micro_(StarCraft)
- Halite postmortem (shummie): https://shummie.gitbooks.io/halite-postmortem/content/history.html
- Halite II winners: https://www.twosigma.com/articles/halite-ii-concludes-winners-announced/
- Halite IV rule-based bot: https://github.com/0Zeta/HaliteIV-Bot
- CodinGame blog (Magus and others): https://www.codingame.com/blog/evolutionary-trajectory-optimization/ and https://tcourreges.github.io/coders-strike-back
- Lux AI paper (Toad Brigade): https://arxiv.org/pdf/2301.01609v2.pdf ; Kaggle simulation summary: https://speakerdeck.com/nagiss/kagglesimiyuresiyonkonpenodong-xiang
- Killzone's AI, GDC Europe 2005: https://www.guerrilla-games.com/media/News/Files/gdce05_killzone_ai.pdf
- Quake III Arena bot thesis and fuzzy-logic manual: https://www.cs.rochester.edu/u/brown/242/docs/QuakeIII.pdf , https://icculus.org/gtkradiant/documentation/bot_manual/fuzzy.html
- Star Wars Battlefront II AI deep dive: https://www.ea.com/en-us/games/starwars/battlefront/news/ai-article-deep-dive
- RoboRumble talk pages: https://www.cse.chalmers.se/~bergert/robowiki-mirror/RoboWiki/robowiki.net/wiki/Talk_RoboRumble.html
