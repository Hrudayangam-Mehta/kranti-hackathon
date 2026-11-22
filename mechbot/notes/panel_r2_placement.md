# Panel R2: placement and behaviour memo

Voices: battle-royale analyst [BR], game designer [GD], behavioural psychologist [PSY]. Scripts and outputs: `tools/panel_r2/` (`replay_placement.py`, `map_stats.js`, `practice_model.py`, `ffa_mc.js`, `calib.js`, `ffa_mc_out.txt`, `calib_out.txt`). The replay is one house-bot free-for-all on an older balance: its numbers are indicative.

## Thesis

The report is right about the final and wrong about practice, and practice decides who reaches the final.

- **Practice** [GD]: score = house bots dead before us. They die almost only by our gun, so placement-first play scores about 0 (cut: 4.2). Keep the duellist.
- **Final** [BR]: scoring is linear (each rank = 1 point, no kill points, no bonus for winning). In our model a bot that refuses fights until 4 remain scores 13.98 against 8.02 for a clone of an aggressive field; the worst variant we tried still gives +4.1. Adopt the report's thesis there, more strictly than it states it.
- **Later in the final** [PSY]: evading beats hunting whatever the others do (table M3), so good teams converge on it and the last circles decide. Cubes, plating, the centre point and target choice at 3 alive are the tie-breakers. The series is a 64-match mean and only first place pays; the evader's per-match spread is 1.4 points, a standard error of 0.18, so a 0.5-point endgame edge decides the title.
- **Other bot competitions** agree. Robocode melee (10 bots): "You'll dodge every bullet if no one is firing at you"; minimum-risk movement rates points by enemy energy and distance and by "whether they will be the closest bot to an enemy"; corners at 6-7 bots, sniping at 3-4. Robocode also pays 1 point per damage point; our game pays only for outlasting, so the avoidance logic applies more strongly. Human data adds the limit: 0.37% of PUBG players won without a kill, like our "never fire" row (3% wins).

## Decision table

| Report recommendation | Practice (squad) | Final (free-for-all) |
|---|---|---|
| 1. Roof-first looting | **REJECT.** Looting scores 0; our navigation is ground-only. House bots took 0 of 10 roof pickups and 2 of 9 roof crates, so roof loot is not contested. Test later as a duelling post: a mech 6 m or more inside a 20-58 m roof has a line of fire from 27% / 46% of ground points at 40 / 80 m, against 94% / about 70% ground to ground. | **ADAPT.** Never first: at 120-180 m a roof gives 44% / 34% exposure against 58% / 40% on the ground, no better. Use a roof as a healing post from 8 alive: 66% of simulated 70 m circles contain one of 20 m or more (uniform nested centres assumed). |
| 2. Threat heatmaps | **REJECT.** The squad shares vision and positions are true for 5 s after sight is lost; exact per-cell rays (0.4 µs each, panel 4) beat a blurred map. | **ADAPT.** Same exact evaluator, plus one unseen-threat term from 12 sound sectors. |
| 3. Probabilistic enemy memory | **REJECT.** Hunters come to us; 1 s dead reckoning is enough. | **ADAPT.** Last-seen track with confidence `exp(-dt/4)`, dropped at 12 s; count the field from `alive` and `death` sounds (600 m). No particle filter. |
| 4. Avoid fair fights | **ADAPT.** The lone early hunter is the score. Make the fight unfair (85-140 m, corner, P ≥ 1.25); never decline it. Model M1: hide 0, duel 3-7. | **ADOPT, stricter.** Avoid all chosen fights while 5 or more are alive, fair or not. Replay: score against damage taken per second, rank correlation -0.77. |
| 5. Third-party engagements | **REJECT.** The squad never fights itself. | **ADAPT.** Replay: 13 third-party entries dealt 3.9 times the damage they took and got 5 kills. Model: +0.0 placement. Only as a kill-secure (target ≤ 35% HP, ≤ 140 m, we unseen, one magazine); the gain is cubes. |
| 6. Aggression only in the top 4 | **REJECT.** Aggression from first contact (about 20 s). | **ADAPT.** Start fights only at ≤ 4 alive, but when cornered at any count shoot first: replay initiators died in 18% of 33 engagements, responders in 45%, after a median 191 HP of unanswered damage. |

## Models

**M1. Practice: is placement equal to kills before death?** [GD] Yes, with two corrections.

- Identity: "`alive`: your placement if you died now would be `alive`" (protocol §6), so score = 16 − alive = mechs dead before us. The squad "never fight each other" (track page).
- Non-kill deaths: 1 of 15 replay deaths was the zone (a brawler stuck in the stadium bowl, a type absent from practice); drones dealt 930 HP in total against 36,663 between mechs. One event cannot give a rate; the starter bot's whole score, 1.15, is an upper bound.
- Collapse: for 390-415 s the radius is 415 − t and the zone deals 260 HP/s; after 415 s everyone is outside. Death order follows `E = hp − 260·d` (d = metres from the centre). Bodies cannot overlap (radius 2.5 m), so one mech holds the point and a latecomer stands 5 m off: 1,300 HP (two mechs pushing symmetrically each end 2.5 m off: arriving first and standing still is what pays). A 10-cube mech on the point (1,960 HP) dies at 422.5 s; a 1,512 HP house bot 5 m off dies at 415.8 s; even the 2,518 HP maximum seen in the replay dies at 419.7 s.
- What it requires: surviving 375-415 s inside a 25 m circle. We outlive them only if incoming fire stays under about 68 HP/s, two-thirds of one house gun at that range. So being alive at 415 s is worth +(15 − kills), and is reachable only with 2 or fewer house bots left or with hard cover on the point.

| Fluid model (`practice_model.py`; b = 64, a = 31 HP/s, 2 lines at once) | Score | Dies at |
|---|---|---|
| (a) pure hiding | 0 | 149 s |
| (b) pure duelling, gun only | 3-6 | 118-188 s |
| (b) with a laser (b = 156) | 7 | 110 s |
| (c) duel while one hunter, then hide | 2-3 | 154-252 s |

(c) loses because hiding earns nothing and never reaches 375 s. Row (b) brackets the leaderboard (cut 4.2, top 5.6).

**M2. Final: placement against aggression** [BR] (`ffa_mc.js`, 800 matches per row). 16 mechs, 1,400 HP, 107 HP/s guns with the house hit-rate curve, regeneration 45/s after 5 s, the zone schedule, gunfire heard at 320 m, line-of-fire probabilities measured on the map (0.94 at 30-45 m, 0.67 at 80-100, 0.40 at 160-200; sight through canopy 0.70 / 0.38 / 0.16). "Hunters" shoot the nearest visible mech, walk to gunfire and heal at 35%. Calibration: with damage ×0.6 the 5th and 8th deaths fall at 74 and 117 s (replay: 70 and 125 s); the result holds for every multiplier from 0.35 to 1.

| Our policy against 15 hunters | Mean score | Top 4 | Win |
|---|---|---|---|
| Clone of the field | 8.02 ± 0.16 | 29% | 7% |
| Fight whenever P ≥ 1 | 13.59 ± 0.09 | 94% | 23% |
| Playbook thresholds (1.85 / 1.6 / 1.35 / 1.25 / 1.0) | 13.97 ± 0.05 | 98% | 17% |
| Same, and shoot first when targeted | 13.79 ± 0.07 | 96% | 22% |
| Evade until 4 alive | 13.98 ± 0.05 | 98% | 17% |
| Never fire | 13.84 ± 0.04 | 98% | 3% |
| Evade; no cover, hunters rush to 40-70 m at 1.25× speed, no dodge | 11.71 ± 0.16 | 76% | 4% |

The model cannot separate the playbook thresholds from pure evasion (13.97 against 13.98): the 6 points lie between any non-hunter and a hunter. Our SQUAD stance is a hunter (fires first, seeks when idle), so the most valuable single item in the final is that the free-for-all latch trips, by the second foreign death (about 45-70 s), while a false latch in practice costs about 5.

**M3. If other finalists think the same** [PSY]

| Evaders among the 15 opponents | We evade | We hunt |
|---|---|---|
| 0 | 13.98 | 8.02 |
| 2 | 13.35 | 7.05 |
| 4 | 12.62 | 6.00 |
| 8 | 10.78 | 4.04 |
| 15 | 7.37 | 0.33 |

Limits: flight is unobstructed in the model, so read +6 as an upper bound and +4 as the cautious figure; the sign held in all 14 parameter variants (`ffa_mc_out.txt`, `calib_out.txt`). The endgame sweep was uninformative (10.59 in all five rows): inside a 70 m circle the question is whom to shoot and where to stand, not whether to fight.

**M4. Thresholds** (P = power ratio as in the playbook). The break-even win chance is `p* = (V(n) − (16−n)) / (V(n−1) − (16−n))`, with V(n) the expected final score of a mech still alive at n.

| Alive | Playbook / panel 1 | Model, hunter-like V(n) | Model, evader V(n) | Use |
|---|---|---|---|---|
| ≥ 9 | 1.85 | 2.6 | never | kill-secure only (≤ 300 HP) |
| 5-8 | 1.6 | 1.9 | never | 2.4, target isolated and unaware, one magazine |
| 4 | 1.35 | 1.5 | never | 1.5 |
| 3 | 1.25 | 1.4 | 3.2 | 1.4, and never the first of the three to fire |
| 2 | 1.0 | 0.9 | 0.6 | compare E; else attack at ≥ 0.6 |

Panel 1 assumed a mech that declines a duel outlasts half the field; in the model it outlasts far more, so every threshold above 2 alive rises. With 2 alive, second place (14) is banked, so fight at worse than even odds unless our E is higher: then hide and hold the point.

- **Truel at 3 alive** (Kilgour and Brams): three equal mechs all shooting score (15 + 14 + 13)/3 = 14.0 each. Holding fire unseen and attacking the half-dead survivor within 4 s (regeneration starts at 5 s) should win about 9 times in 10 (our arithmetic): 14.9. Half the replay's killers (7 of 14) ended at 41% HP or less.
- **Cost of the first shot**: a 320 m sound disc is 33% of the 560 m circle, 71% of the 380 m circle and all of the 240 m circle. Silence is worth something only before about 195 s. In the model, firing first when targeted costs 0.18 ± 0.09 placement and adds 5 points of win rate.

## Exploits against finalists' habits [PSY]

Finalists were selected by kill counts against bots that walk up to them: expect shoot-on-sight duellists with linear lead, stand-off bands, heal breaks near 40% and no notion of a third party.

| Rank | Habit assumed | Exploit | Gain | If the habit is absent |
|---|---|---|---|---|
| 1 | Shoots the nearest or weakest visible mech; walks to gunfire | Stay unseen: canopy, silent ≤ 5 m/s, never nearest nor lowest HP% in anyone's view; let two hunters find each other, their gunfire draws the rest | +4 to +6 (M2) | no cost |
| 2 | Chases for 5 s of memory | Break sight 5 s, then turn 90°; be inside the next circle 10 s early | part of rank 1 | no cost |
| 3 | Hugs the zone edge (a practice habit) | Stand on the centre point from 385 s | up to 1,300 HP per rival | no cost |
| 4 | Linear lead | Seeded jink beyond 78 m (replay hit rate 84% → 22% after a reversal) | +0.3 ± 0.2 (model, 300 matches) | cover instead if the first 4 bullets carry no lead |
| 5 | Heals at 35-50%, tunnel vision | Kill-secure from behind (×1.5); 16 of 28 house bots did not turn within 5 s | cubes; +1 to +5 win points | one magazine, then leave |
| 6 | Re-closes after losing sight | Corner ambush (playbook M2) | 315-472 HP free | nothing lost |
| 7 | Greed for supply drops | Stay 150 m from rings while ≥ 5 alive; shoot a capturer only if it dies within its 4 s | avoids a funnel | no cost |
| 8 | Takes the nearest target | Pull-through (M6) | situational | risky: we approach a second mech |
| 9 | Dodges a visible laser charge | Charge feint | about 0 | reject: half speed, and house bots did not react |

## Information [BR]

| Worth knowing | Cheapest source |
|---|---|
| How many remain | `obs.alive`; `death` sound (600 m) |
| Who aims at us | visible mech's `aim` within 12° of our bearing |
| Who is weak | `hp` of visible mechs; a `death` sound means a survivor that cannot regenerate for 5 s |
| Where fights are | `gun` sound: bearing ± 7°, near < 60 m, mid < 160 m, far ≤ 320 m |

Rules: sweep the torso at 1.6 rad/s when idle (a 120° wedge covers every bearing each 2.6 s); at a post put a wall behind and the open arc (≤ 100°) inside the wedge; `gun` near with no shooter in view: break sight now; `gun` mid or far with ≥ 5 alive: move away; `step` or `boost` (40 / 90 m): face it; `reload` (60 m): a 2.4 s window.

## Plans

| Phase | Practice (squad) | Final (free-for-all) |
|---|---|---|
| Opening | Take a laser or lightning within 60 m; crates within 80 m at HP ≥ 0.9 (crate hits do not block regeneration); reach a corner post inside the next circle; open fire on the first hunter at 85-140 m. | 0-60 s: no shots at mechs unless kill-secure; loot crates only with no track within 250 m and no gunfire for 10 s; take plating at the first offer. |
| Middle | Kill cycle; never reset a duel we lead; after each kill hide until HP ≥ 0.9 or a hunter gains a line; 2 hunters: block one by geometry; 3 or more: bastion. | Hide inside the next circle; break sight for 5 s from every track; cornered (aware attacker within 110 m, cover over 3 s away): shoot first, leave when the line breaks; heal to 0.9 before each zone move; third-party only as kill-secure. |
| End | From 325 s: with ≤ 2 hunters left hold the centre point from 385 s; otherwise last stand and maximise kills (each is +1). | ≤ 4 alive: thresholds 1.5 / 1.4; 3 alive: hold fire until a `death`, then hit the survivor within 4 s; 2 alive: compare E; from 385 s stand on the point (1 m = 260 HP). |

## Disagreements with the report

1. "Placement, not kills": true of the formula, false of practice, where place is the kill count. Its weights (0.35 survival, 0.05 combat) would score near 0 and miss the cut.
2. One fixed utility vector cannot serve both games; keep stance sets keyed by environment and `alive`. Default to SQUAD: a false free-for-all latch in practice costs the whole score.
3. Its sources do not say what it claims. The modl.ai / Riot paper is imitation learning for human-likeness in 2v2. Shi, Mao and Hao (2021) is mechanism design: rank scoring gives strong teams little incentive. Sagong, Woo and Kim (2025) is a survival predictor on human telemetry; we could read only its title. Esports formats (ALGS 12-9-7-5 plus 1 per kill) pay kills; ours pays none, which is why evasion is stronger here.
4. "Roof-first", "threat heatmaps" and "probabilistic memory" answer problems this server already solves, or ones our navigation cannot yet use.
5. "Aggression only in the top 4" omits the cornered case and the 3-alive truel.

## Sources

- Rules: `kit/protocol.md` §4, §6-§9; track page and leaderboard saved in `tools/rules_audit/`.
- Robowiki, Melee Strategy: https://robowiki.net/wiki/Melee_Strategy ; Minimum Risk Movement: https://robowiki.net/wiki/Minimum_Risk_Movement ; Scoring: https://robowiki.net/wiki/Robocode/Scoring
- Kilgour and Brams, "The Truel", Mathematics Magazine 70(5), 1997: https://doi.org/10.2307/2691167 ; https://en.wikipedia.org/wiki/Truel
- Shi, Mao and Hao, "Incentive Scoring Mechanism Design in Battle Royale Games", 2021: https://doi.org/10.1145/3490700.3490703 (abstract only)
- Sagong, Woo and Kim, "Are you a Hunter or Camper?", Entertainment Computing, 2025: https://doi.org/10.1016/j.entcom.2025.101040 (title only)
- Justesen et al., "Human-like Bots for Tactical Shooters Using Compute-Efficient Sensors": https://arxiv.org/abs/2501.00078
- Rokad et al., "Survival of the Fittest in PlayerUnknown BattleGround": https://arxiv.org/abs/1905.06052 ; coverage (0.37% of winners had no kill): https://gamesbeat.com/ai-predicts-pubg-player-placement-from-stats-and-rankings/
- ALGS scoring: https://afkgaming.com/esports/news/tsm-imperialhal-expresses-concerns-over-algs-points-system ; PUBG point system: https://pubg.com/en/news/1698
- Hvide, "Tournament Rewards and Risk Taking": https://www.journals.uchicago.edu/doi/10.1086/342041
