# Panel R7 — SOTA memo, topic 'engage' (engage gate and target value)

Research assistant memo, written 21:45-22:15 UTC Sat. Tags: [M] official, [T] top bot, [S] our simulator, [A] arithmetic /
model, [N] no evidence, [L] literature (reference number). Read-only on everything but this file. No simulator runs
were made for this memo; every number below is either quoted from our notes or arithmetic on them.

Limits of the search: the paper index and four primary sources were read ([1] sections V-IX and tables, [2] script and
evaluation definitions, [5] sections II-IV, [8] battle nodes). The search credits ran out before the full texts of [3]
and [4] could be re-read; what is said about them comes from their abstracts and from memory and is marked "(abstract)".
No sub-agents were used.

## 1. Decision question

Each decision (2 ms) our bot must answer two things. (a) Gate: may it start or seek a fight now, or must it heal?
The owner's doctrine fixes the shape: fight for the maximum reward whenever hp >= 70% and no single volley can kill
us, otherwise heal. What is still open is the exact meaning of "one volley", whether the gate applies to starting a
fight or also to leaving one, and how the number of hunters with a line on us enters. (b) Value: among the mechs it
may shoot, which one first? KS (5.19 [M]) uses the old multiplicative score (nearest first, x2 finishable, x1.6
attacker, x1.3 current); the built-but-unranked alternative is AVO. The literature question is which simple rule is
known to be right for one shooter against several, when the score is kills before our own death.

## 2. What the literature says (sections read)

- **Scripted target choice [2].** Churchill, Saffidine and Buro define the standard scripts: Attack-Closest,
  Attack-Weakest (lowest hp in range), Kiter (as Attack-Closest, but "move a fixed distance away from the closest
  enemy when it is unable to fire"), Attack-Value (highest dpf(u)/hp(u) in range) and NOK-AV (Attack-Value, but never
  shoot a unit already assigned lethal damage this round). NOK-AV is the best script in their tables and the least
  exploitable. Their state value is LTD2 = sum over units of sqrt(hp) x dpf, own minus enemy.
- **Combat models [1].** Uriarte and Ontanon compare three forward models on 6,066 real StarCraft fights:
  target-selection Lanchester (square law, alpha = avgDPF(enemy) / avgHP(own)), Sustained (t = HP / DPF, the side with
  the shorter time to kill wins) and Decreasing (kill one unit at a time, the survivor's fire drops after each kill).
  All three predict the winner 91-94% of the time and beat a full frame simulator (84-88%) at 1/30 of the cost. The
  target order matters little for "who wins" and matters for "what survives". Message for us: a time-to-kill
  comparison with attacker fire that drops as units die is as good as a simulator, and it is a closed form.
- **Lanchester for attack / retreat [3] (abstract).** Stanescu, Barriga and Buro fit a generalised Lanchester law
  from replays (it models injured units) and use it in a tournament bot to decide attack or retreat; win rate went up
  against the 2014 AIIDE top bots compared with the simulation-based decision.
- **Smith's rule [6].** For one machine and jobs with weights w_i and lengths p_i, the sum of weighted completion
  times is minimal when jobs run in decreasing w_i / p_i. One shooter against n enemies is exactly this problem:
  damage taken = sum_i a_i x C_i, with a_i the enemy's dps on us and C_i the time its kill completes. So the order
  that minimises damage taken is decreasing a_i / ttk_i. Attack-Value (dpf/hp) is Smith's rule with equal own dps on
  every target. When all a_i are equal, Smith's rule is "quickest kill first".
- **Kiting [4] (abstract), [5].** Kiting pays when the kiter out-ranges or out-runs the target and has a cooldown to
  fill. Louis and Liu evolve potential fields over distance, health and weapon cooldown; with the single objective
  "damage done minus damage taken" the search collapses into fleeing, so they keep the two objectives apart and get a
  Pareto front. At one end 3 units kill 26 of 30 with no loss, at the other 99% killed for 2 of 3 lost. The targeting
  that goes with it is trivial (nearest in range). Message: disengage rules trade kills for hp one for one along a
  front; which point is right depends on what hp is worth, not on the micro.
- **Classic FPS bots [8].** The Quake III bot's battle node is an expert rule: "IF the bot is in a fight AND the bot
  is not fit enough to fight THEN retreat"; separate tests decide retreat (low health, no decent weapon) and chase
  (wants to hunt a lost enemy). The retreat test and the chase test are different rules with different thresholds.
- **Utility AI [7].** Mark's utility systems score every action as a product of normalised considerations (response
  curves) and pick the best; the two engineering lessons are hysteresis on mode changes and veto considerations
  (a factor of 0 removes the action). The doctrine's "70% and not one-volley-killable" is two veto considerations.
- **Recent agent work (2024-26).** The index returned only learned or language-model shooters (Arena Breakout
  rule-enhanced RL, PUBG Ally, ROAR, AAArena). The deployed ones keep shooting and recovery under rules and learn only
  navigation or high-level tags. Nothing there is usable inside 2 ms without training; nothing contradicts the above.

## 3. Techniques that fit a scripted 2-ms bot

**T1. Triangular cost of an n-line fight [A on L1, L6].** With n hunters holding a line, each doing a hp/s to us, and
our time to kill one being tau, killing them in sequence costs

    HP(n) = a x tau x n(n+1)/2            kill j (j = 1..n) costs a x tau x (n - j + 1)

Check against our ledger [S]: one attacker 221 hp for 0.75 kills = 295 hp per kill (c1). Two attackers: the model
gives 3 x 295 = 885 for both kills; the ledger says 893 hp per episode (at 1.04 kills, so real fights are worse than
the model, hunters do not arrive at once). Three: 6 x 295 = 1,770 > 1,400 hp: not clearable from full hp; ledger
P(death) 0.59. Consequences:
- c1 is about 21% of 1,400 hp, the cost of both kills at n = 2 about 63%. **The owner's 70% is the entry hp that pays
  for a two-line fight.** The ledger agrees: 2+-attacker episodes entered at 80-100% give 2.43 kills, at 60-80% 1.78
  [S, n 42 / 9].
- The first kill is the expensive one (n lines on us), the last the cheapest (one line). Returns to staying increase
  after each kill. So the hp gate belongs on **starting** a fight, not on leaving one; leaving is a time-to-kill race
  (FIN). This matches [M] "leaving fights early at 72% cost others 1.1" and the Quake split of retreat and chase rules.
- Kills bought with hp H against n lines: largest k with c1 x sum_{j=1..k} (n - j + 1) <= H.

**T2. One-volley veto, as a count [A].** The largest damage that can land inside one decision-to-cover time is one
beam per laser line plus about two bullets per gun line:

    V1 = sum over mechs with a line in the last 1 s, in range:  k_i x (laser_i ? beam : 0) + k_i x 2 x bullet x pIn(d)
         (+ k_i x 2 x zap inside lightning range),   k_i = 1 + 0.04 x min(cubes_i, 10)
    veto voluntary fights while  me.hp - V1 < 0.10 x maxHp

With a 315 beam (441 at 10 cubes) and 980 hp (70% of 1,400) the veto needs 3 to 4 laser lines at once. House lasers
hit 15-27% [M S07]. So in practice the veto almost never binds above 70%: it is a cheap safety rail, not a lever.
It will bind in the final (accurate lasers, lightning 240 dps inside 45 m).

**T3. Indifference point of fight against heal [A on S].** Fight with a laser: 0.149 kills/s at 343 hp per kill.
Heal: 45 hp/s. With hp priced at lambda pt/hp, fighting beats healing while 0.149 x (1 - 343 lambda) > 45 lambda,
i.e. lambda < 0.0016 pt/hp. Our ledger prices hp at 0.0005 (abundant) and 0.0036 (scarce), with the change between
the 60-80% and 80-100% entry bands. The doctrine's 70% sits at that crossing. Two caveats from the same ledger:
lulls are short (median 6.3 s; a heal from 45% to 100% completes in 2% of lulls), and heal breaks read 0.00 +- 0.28
officially. So "otherwise heal" must mean "do not start or seek; answer fire; heal while nobody has a line".

**T4. Target value = Smith ratio, with a budget switch [L2, L6, A].**

    value_i = a_i / ttk_i                     (threat removed per second of our fire; NOK-AV's dpf/hp)
    if hp - V1 cannot pay HP(order) for all lines: quickest kill first (lowest ttk_i), ties to higher a_i
    keep the current target while its value is within 10% of the best, and always under 25% hp

Our score counts kills before death, so when the budget is short the count rule (quickest first) replaces the
damage rule. With house hunters a_i differs mainly by laser (gun 27 + laser 35 hp/s at 110 m [M S05/S07]) and by
range, and ttk_i by remaining hp. KS's score is 100 / (dist + 20) with a x2 for "finishable by the current burst":
distance stands in for a_i (hit rate falls with range) and the x2 for short ttk, but a 30% hp hunter that is not yet
finishable gets no credit and a laser hunter no extra weight.

**T5. No overkill [L2].** Do not release a beam into a target that the bullets already in flight plus the next two
will kill; send it to the next value. Our beams hit nothing 5-8% of the time [S]; IO6 `laserDump` already covers the
forced release.

**T6. Kiting test [L2, L4, L5].** Kite only with a range or speed edge and a cooldown to fill. Against house hunters
we have neither edge (same weapons, same chassis), so backing off only lowers both sides' hit rates. The one
literature-backed case left is "both weapons down": magazine empty and beam cooling for more than 1 s, two or more
lines, cover within 1 s.

**T7. Threat density for prey choice [L5, A].** Because cost grows as n(n+1)/2, the prey's neighbours matter more
than its distance. A hunter with one neighbour inside supporting range costs about three times a lone one.

## 4. Mapping to our code

| # | Technique | Code site (read-only) | Exact rule | Expected | Cheapest test | Where |
|---|---|---|---|---|---|---|
| E1 | T1 gate on starting only | `hunt.js seekLegs` (`h50SeekHpf`), `tactics.selectTarget` `unengaged` clause (`unengagedHpf`, `unengagedS`), `economy` `farmHp`; engineer's KB `aggr: 'any70'` | start / seek / farm iff hpf >= 0.70 and the T2 veto is clear; an ongoing fight is never left by this gate (losing() and FIN own the exit) | KB is this rule: read its official score before anything else. [A] +0.05 (-0.15..+0.25) | KB salt 0 and salt 1 are pushed; no new code | both |
| E2 | T2 veto as a count | engineer's `h70g` | V1 as above, margin 0.10 x maxHp, lines from `tr.losInT` within 1 s, `tr.hasLaser`, `tr.cubes` | practice 0 (+-0.02), it binds at 3-4 laser lines; final: avoids alpha strikes | unit test: 980 hp, 3 laser lines at 10 cubes -> vetoed; 2 lines -> clear | both; matters in final |
| E3 | T4 Smith / quickest-first | AVO (`focus: 'av'`, R5b, being built) | AVO already searches orders for "kills before hp runs out" = T4 with the budget switch. Refinement only: use measured house priors (gun 51/51/27/11 at 40/75/110/150 m, laser +35) instead of +78, or AVO over-weights laser hunters | spec says +0.05 (0..+0.12); literature supports the direction (NOK-AV best script) | AVO on the KS base, one slot | practice; in FFA a_i priors are wrong, keep `mult` |
| E3b | fallback if AVO reads negative | `tactics.selectTarget`, `mult` branch, one line | `s *= sqrt(maxHp / max(hp, 0.25 x maxHp))` for mechs (LTD2-style: up to x2 at 25% hp) | +0.02 (-0.05..+0.08) [A] | one slot on KS | both |
| E4 | T7 crowd radius | `params.js` `h50CrowdR: 60`, used in `hunt.js updatePrey` (flat +100 m if any other mech within 60 m of the prey) | 60 -> 120 (house gun still does 27 hp/s at 110 m). Parameter only | +0.03 (-0.05..+0.10) [A]; changes which hunter we walk to | one slot: KS + `h50CrowdR 120` | practice (seek is SQUAD-only) |
| E5 | T1 for the heal target | HN (`heal: 'need'`, R6a) | HN's H* = 1.25 x A_next x TTK_next is c1 x 1.25 for one line. T1 says budget for two lines when >= 2 hunters were seen in the last 10 s: H* = clamp(1.25 x 3 x c1, 70%, 100%) | +0.03 (-0.10..+0.15), same as HN | HN slot as planned | practice |
| E6 | T1 increasing returns | FIN (`finish: 'ttk'`, R5a) | no change; T1 is the argument for ranking FIN first among R5a | spec +0.08 (-0.05..+0.20) | FIN on the KS base | both |
| E7 | T6 kiting | `hunt: 'h50'` pulse, `retreat: 'pulse'` | none: veto more kiting work for practice | H 4.98, HL 4.73, pulse V1 4.98 against V4 5.15 [M] | - | - |
| E8 | T2 + T4 in the final | `ffaHealExit` (item F), `ffaGate`, `ffaWoundTgt` | final only: the T2 veto over every mech with a line (all are hostile), and start a fight only when ttk(us on him) < 0.7 x ttk(him on us) and at most one other line | [N] no FFA measurement | local FFA league must not fall below V4 | final only |

Order of use for the next slots, by information per slot: (1) read KB; (2) FIN on KS; (3) AVO on KS; (4) KS +
`h50CrowdR 120`; (5) HN. E2 rides along as a rail once the unit test passes. Each is one preset or one number; none
needs new strategy code beyond what the engineer already has in hand.

## 5. Self-critique: when this is wrong for us

- T1 assumes all n lines fire from the start and that we kill in sequence. Real hunters arrive one after another and
  share vision, so n grows during the fight (P(2+ attackers) 0.34 -> 0.88 after 0 -> 3 kills [S]). The gate then
  under-counts n at entry. That is an argument for the flat 70% (owner's rule) over a clever n-dependent gate.
- c1, a and tau come from the simulator ledger, and the simulator has had the sign of within-bot deltas wrong six
  times. The triangular shape is robust; the constants are not. Nothing here should rank builds.
- The ledger also says 3+-attacker episodes give 2.78 kills for 1,214 hp. Vetoing them on T1 ("not clearable")
  would throw away our best points per episode. T1 is therefore used only to explain the 70% entry and the
  commit-after-first-kill rule, not to forbid crowded fights.
- Smith's rule minimises damage taken, which is the wrong objective when hp is about to run out; hence the switch
  to quickest-first. AVO does this by search; if its priors are off it will switch targets too often (its own test
  caps switches at V4 + 20%).
- Official evidence on target rules is confounded: `mult` is in KS 5.19 and K0 5.04, `add` in V4 5.15; one draw has
  sd 0.24. No target rule has shown a signal yet. Expect the same from E3.
- "Otherwise heal" can idle the bot: lulls are short and heal breaks measured 0.00 +- 0.28. If KB reads below KS by
  more than 0.25 on two salts, the 70% start gate costs more contact time than it saves.
- In the final, opponents are not house hunters: accurate lasers raise a_i about threefold, so c1 is near 60% of hp
  and even a one-line fight is a coin flip. The practice gate (70%) is too loose there; E8 is the stricter rule.

## References

1. Combat Models for RTS Games. Alberto Uriarte, Santiago Ontanon. 2016 (IEEE TCIAIG 2018). https://arxiv.org/abs/1605.05305
2. Fast Heuristic Search for RTS Game Combat Scenarios. David Churchill, Abdallah Saffidine, Michael Buro. AIIDE 2012.
   https://ojs.aaai.org/index.php/AIIDE/article/view/12527
3. Using Lanchester Attrition Laws for Combat Prediction in StarCraft. Marius Stanescu, Nicolas Barriga, Michael Buro.
   AIIDE 2015. https://ojs.aaai.org/index.php/AIIDE/article/view/12780 (abstract only)
4. Kiting in RTS Games Using Influence Maps. Alberto Uriarte, Santiago Ontanon. AIIDE 2012.
   https://ojs.aaai.org/index.php/AIIDE/article/view/12544 (abstract only)
5. Multi-objective evolution for 3D RTS Micro. Sushil J. Louis, Siming Liu. 2018. https://arxiv.org/abs/1803.02943
   (companion: Evolutionary Multi-objective Optimization of Real-Time Strategy Micro. Dubey, Ghantous, Louis, Liu.
   2018. https://arxiv.org/abs/1803.10316)
6. Various optimizers for single-stage production. Wayne E. Smith. Naval Research Logistics Quarterly 3, 1956.
   https://doi.org/10.1002/nav.3800030106 (classic; cited from memory, not re-read)
7. Infinite Axis Utility System / Building a Better Centaur: AI at Massive Scale. Dave Mark, Mike Lewis. GDC 2015.
   https://www.gameai.com/iaus.php (overview page read; the talk itself not re-watched)
8. The Quake III Arena Bot. J. M. P. van Waveren. MSc thesis, TU Delft, 2001.
   https://fabiensanglard.net/fd_proxy/quake3/The-Quake-III-Arena-Bot.pdf
9. Lanchester combat models. N. J. MacKay. 2006. https://arxiv.org/abs/math/0606300 (abstract only)
10. Training Interactive Agent in Large FPS Game Map with Rule-enhanced Reinforcement Learning. Chen Zhang et al.
    2024. https://arxiv.org/abs/2410.04936 (abstract only)

## Summary for the panel

1. The literature gives one model that fits us: one shooter against n lines costs a x tau x n(n+1)/2 hp (Lanchester
   / Decreasing model [1], Smith [6]). With our ledger (295 hp per one-line kill [S]) a two-line fight costs 63% of
   hp. The owner's 70% is the entry hp that pays for it; the ledger agrees (entry 80-100%: 2.43 kills; 60-80%: 1.78).
2. The first kill is the dearest and each later one cheaper. So the 70% gate belongs on starting and seeking fights,
   never on leaving one; leaving is a time-to-kill race (FIN). Matches [M] "leaving at 72% cost 1.1".
3. "One volley can kill us" as a rule: V1 = sum over lines of (cube mult x beam if laser + 2 bullets x hit rate);
   veto voluntary fights while hp - V1 < 10% max hp. At 70% hp this needs 3-4 laser lines at once, so it almost
   never binds in practice (0 +- 0.02). It is a rail for the final, not a lever.
4. Target value: Smith ratio a_i / ttk_i (NOK-AV, the best script in [2]); when hp cannot pay for all lines, quickest
   kill first. AVO is already this rule; only fix its priors to the measured house values (laser +35, not +78).
5. Kiting needs a range or speed edge [2, 4, 5]; we have none against house hunters, and H 4.98 / HL 4.73 / pulse
   4.98 against V4 5.15 [M] say the same. Veto more kiting work for practice.
6. One new parameter-only test: `h50CrowdR` 60 -> 120 in the seek prey choice (a hunter with a neighbour in gun
   range costs about three times a lone one). +0.03 (-0.05..+0.10) [A].
7. Slot order: read KB (it is the doctrine gate, already pushed); FIN on KS; AVO on KS; KS + `h50CrowdR 120`; HN with
   a two-line budget when 2+ hunters were seen. One preset or one number each; no new strategy code.
8. Do not use the n(n+1)/2 model to forbid crowded fights: 3+-attacker episodes give 2.78 kills per episode [S].
9. Final only: all mechs count as lines for V1; start a fight only when our ttk on him < 0.7 x his on us and at most
   one other line. Accurate lasers make c1 about 60% of hp there. [N], needs the local FFA league.
10. Confidence: the shape (triangular cost, start-gate, Smith order) is solid; every constant comes from the
    simulator and one-draw official scores (sd 0.24). Nothing here ranks builds; only official slots do.
11. Search limit: credits ran out; [3] and [4] were read as abstracts only, [6] and [7] cited from memory.
