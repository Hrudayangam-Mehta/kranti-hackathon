# Panel R7 research memo, topic 'risk': time- and state-dependent risk appetite

Tags: [M] official result, [T] top bot's choice, [S] simulator, [A] arithmetic/model, [N] no evidence, [L] literature.
Read-only work; no simulator runs were made for this memo. Every expected delta below is [A] or [N], not measured.

## 1. Decision question

Our bot decides, about three times a second, between going for reward (seek and fight, farm) and protecting itself
(retreat, heal). Today that choice is a set of fixed hp thresholds (heal exit 70%, seek from 60%, farm from 90%,
LOSING at 35/50/60% for 1/2/3+ attackers) that do not depend on match time or on how many mechs are left. The
owner's doctrine is a fixed gate: go for the maximum reward whenever hp >= 70% and no single volley can kill,
otherwise heal. The question: should the gate move with (t, alive, hp), in which direction, and by how much, for
(a) practice (15 house bots as one squad, points = house bots dead before we die) and (b) the final (16-mech
free-for-all, placement) -- with a default that reproduces KS exactly.

## 2. Literature read (sections, not only abstracts)

| # | Source | What I took from it |
|---|---|---|
| L1 | Stephens 1981 z-score model, as re-derived in Lim, Wittek, Parkinson 2015 (arXiv 1504.04986), "Critical review of the derivation" and "Gradual nature" sections | Survival prob f = 1 - Phi((R - mu)/sigma). If the expected budget mu is above the requirement R, lower variance is better; below R, higher variance is better. The strength of the preference is |f(mu,sigma) - f(mu,0)|: large only near the threshold, negligible far above it. |
| L2 | Higginson, McNamara, Houston 2016 (Proc. R. Soc. B, PMC4721100), Results | State-dependent dynamic programming: with no switching cost the optimal policy is a single reserve threshold; with a cost of switching between the safe and the dangerous activity it is two thresholds (hysteresis), and both move together when the danger level changes. |
| L3 | Gilbert 2009 (arXiv 0911.3100), Theorems 1-2 and corollary | Under the Independent Chip Model (placement payouts), a fair bet between two players lowers each participant's expected prize and raises that of every player not involved. False for winner-take-all (linear, risk-neutral). |
| L4 | Li, Huang 2026 (arXiv 2608.09586), sections 1 and 3 | ICM is a level estimate; what a controller needs is the difference between successor-state values. Stack-only models miss "elimination pressure": the player who cannot be busted can afford aggression, the covered one cannot. Simple threshold players remain competitive baselines. |
| L5 | Chow, Ghavamzadeh, Janson, Pavone 2017 (arXiv 1512.01629), problem statement | Risk as a constraint, not a utility: maximise the expected return subject to a chance / CVaR bound on the loss. |
| L6 | Qiu et al. 2021, RMIX (arXiv 2102.08159), sections 3.1-3.2 | CVaR_alpha, alpha in (0,1]: alpha = 1 is risk-neutral, alpha -> 0 worst case. A fixed alpha is hard to tune; they let alpha vary per step with the trajectory. We take the idea (a state-dependent alpha), not the network. |
| L7 | Dubins and Savage 1965, via Schweinsberg 2005 (arXiv math/0412362), introduction | Bold play: when you must reach a goal and the game is unfavourable or the horizon short, staking the most you can is optimal. Timid play is optimal only when the game favours you and time is ample. |
| L8 | Sang, Todd, Goldstone, Hills 2020 (Cognitive Science, doi 10.1111/cogs.12817), abstract only | In a resource-accumulation search task a linearly decreasing threshold is the simple rule that fits/solves explore-exploit under a horizon. |
| L9 | Cheng, Huan 2026 (arXiv 2509.21734), abstract only | Optimal stopping = stop when the immediate reward is at least the expected continuation value; fixed thresholds are myopic. |
| L10 | MacKay 2006, Lanchester combat models (arXiv math/0606300), abstract only | Aimed fire: strength scales with the square of numbers; n attackers on one target is n times the incoming rate. |

Not found: any peer-reviewed treatment of battle-royale placement-versus-kills risk policy for scripted bots [N].
The poker-tournament (ICM) and foraging literatures are the closest formal matches.

## 3. Techniques that survive a 2-ms scripted budget

T1. Continuation-value test (L9, L4). Engage iff  q_k * G  >  q_d * V,  where q_k = chance this engagement
    ends in a kill, q_d = chance it ends in our death, G = points a kill adds, V = points we expect to collect later
    if we stay alive. Required kill-to-death odds:  q_k / q_d  >  V / G.  One division, no search.

T2. V and G by format [A]:
    - Practice (house bots never fight each other [M: brief]): nobody dies unless we or the zone kill them, so
      waiting earns ~0. G = 1. V(t) ~ (our remaining expected kills) ~ S * (1 - t/T_live), with S ~ 5.2 [M] and
      T_live the time the zone leaves us room to fight. Required odds fall linearly from ~5:1 at the start to ~0 at
      the end. So practice risk appetite should rise with time, and never needs to fall as mechs die.
    - Final (16-mech free-for-all, placement [rules_audit L9]): others kill each other, waiting pays. For a mech of
      average strength V_n ~ (n-1)/2 with n alive; a kill moves us to V_(n-1) + 1, so G ~ 1/2 (+ the loot/upgrade
      snowball s). Required odds ~ (n-1) / (1 + 2s): about 15:1 at 16 alive, 3:1 at 4, 1:1 at 2. This is L3's theorem
      in our units: an even fight is a loss for both fighters and a gift to the other 14. So final risk appetite
      should rise as alive falls, steeply, and reach neutral only at 2 alive.

T3. Risk as a hard one-step constraint (L5, L6 with alpha -> 0). "No single volley can kill" is exactly a worst-case
    constraint: hp > B_max, B_max = sum of the largest burst each mech with a line on us can deliver in one decision
    window. The 70% rule is the chance-constraint margin on top. The doctrine is therefore already the textbook
    risk-constrained form: maximise expected reward subject to (hp > B_max) and (hpf >= goHp). Keep the constraint
    hard; let only goHp and the retreat lines depend on r.

T4. Two thresholds with a gap (L2). Because breaking off costs exposure and time, enter-heal and exit-heal must
    differ (ours: 0.55 / 0.70) and must move together when danger changes. Never move one alone.

T5. Gradual rule (L1). Variance only matters near the threshold. Far above it (hp 100%, one opponent) a schedule
    changes nothing useful; the schedule's whole effect is in the 50-80% hp band. So a small linear shift of the
    existing lines is the right size of tool; nothing bigger is justified.

T6. Bold play at a short horizon (L7). When the zone is about to force the last fight anyway (V -> 0), retreating
    buys nothing: fight on. Our code already does this in two places (pulseLosing cancel in the late zone and at
    <= 3 alive; B.doomed final shrink). The schedule generalises those two switches into one slope.

T7. Decreasing threshold for farming (L8, L9). Farm a crate iff its gain over the time left exceeds the kills
    forgone while fetching it; with a fixed gain the acceptable detour shrinks linearly with remaining time:
    maxPath(t) = lootCratePath * max(0, 1 - t/farmStopT). Today: a step (full path until 210 s, then nothing).

T8. Numbers matter squared (L10). With n lines on us the incoming rate is n times: the n-dependence of the retreat
    line (35/50/60%, all-out at 6) is the right shape and should be kept; r shifts the lines, it does not replace them.

## 4. The schedule and its mapping onto our code

One scalar r in [0,1], r = 0.5 = today's behaviour.

    tau = clamp((t - riskT0) / (riskT1 - riskT0), 0, 1)              // time: non-decreasing
    nu  = clamp((riskN0 - alive) / (riskN0 - 2), 0, 1)               // fewer alive: non-decreasing
    r   = clamp(riskBase + riskKt * tau + riskKn * nu, 0, 1)         // monotone in t, monotone in -alive; riskBase 0.5
    hard gate (unchanged by r): hp > B_max (one-volley rule) and, for starting anything new, hpf >= goHp(r)

hp enters only through the gate and the retreat lines (T3, T5), so r itself has no hp term to oscillate on.
Default preset `risk: 'off'` = { riskBase: 0.5, riskKt: 0, riskKn: 0 } gives r = 0.5 on every tick: bit-identical to KS (test 0).
alive unknown (B.aliveN = -1) gives nu = 0.

Mapping, with d = 2 * (r - 0.5) in [-1, 1] and x(r) = x0 * (1 - c * d) unless stated:

| Threshold (params.js) | Site | KS value x0 | c | r = 1 | r = 0 | Posture |
|---|---|---|---|---|---|---|
| lose1Hpf / lose2Hpf / lose3Hpf | tactics.js `losing()` | 0.35 / 0.50 / 0.60 | 0.3 | 0.25 / 0.35 / 0.42 | 0.46 / 0.65 / 0.78 | both |
| healEnterHp, healExit (moved together, T4) | tactics.js `decideMode` | 0.55, 0.70 | 0.2 for d > 0 only, 0.2 for d < 0 | 0.44, 0.56 | 0.66, 0.84 | both |
| h50SeekHpf (seek gate) | hunt.js line 305 | 0.60 | 0.2 | 0.48 | 0.72 | practice |
| farm detour: lootCratePath * (1 - tau_f), tau_f = t/farmStopT (T7) | economy.js line 103 `farm` / `consider` | 150 m until 210 s | - | - | - | both, separate switch `farmTaper` |
| required advantage `need` for OFFENSIVE | stance.js line 114 | Padv >= need | need * (1 - 0.3 d) | | | final only |
| stealHpfFfa, ffaHideHpf | steal.js, ffa.js | 0.70, 0.55 | 0.2 | | | final only |

Owner's doctrine check: the 70% go-line is never raised in practice (riskKt >= 0, riskKn >= 0 there, so d >= 0); it
only relaxes late. The one-volley rule is never relaxed anywhere except the already-existing B.doomed last stand.

Presets (each a single SELECT string; the engineer adds ~25 lines: compute r once per decision in brain.js after
B.aliveN is set, and read the six thresholds through one helper `rk(x0, c)`):

- `risk: 'off'` (default) r = 0.5. KS exactly.
- `risk: 'late'` (practice and final) riskT0 = 210 (= farmStopT), riskT1 = 330, riskKt = 0.5, riskKn = 0.
  Effect: after farming ends, retreat lines slide from 35/50/60 to 25/35/42 and heal exit from 70 to 56 by 330 s.
  Rationale T2 (practice V falls with time), T6. Expected +0.0 to +0.15 [A]; could be negative if late deaths at
  30-40% hp happen with several kills still available. Cheapest test: one official submission, KS + risk late,
  salt 0, read against KS 5.19 with sd 0.24 -- a single draw cannot confirm less than about +0.5; pool with salts.
- `risk: 'ffa'` (final only; inactive unless B.env === 'FFA') riskBase = 0.2, riskN0 = 8, riskKn = 0.5, riskKt = 0:
  r = 0.2 while alive >= 8, then 0.2 + 0.5 * (8 - alive) / 6: 0.37 at 6, 0.53 at 4, 0.70 at 2.
  Effect: with many alive the bot plays tighter than KS (d = -0.6: retreat lines 41/59/71%, heal exit 78%), is back
  at KS behaviour at about 4 alive, and is bolder only heads-up. Rationale T2 (required odds ~ (n-1)), L3.
  Consistent with what is already built: ffaHealExit 0.9, Z9 hold fire at 3 alive, Z8 twoDuelP. Not testable on
  the practice board (it never runs there): practice bit-identity is the only gate; behaviour check in the simulator
  with FFA forced (failure modes only, never ranking).
- `farmTaper: 'on'` separate switch (T7), default off. Practice and final. Expected ~0 [N]; lowest priority.

Ranking for the panel: (1) `risk: 'ffa'` -- the only item here whose sign the theory fixes and that costs no
practice points; (2) `risk: 'late'` -- small, uncertain sign, one slot to try; (3) `farmTaper` -- skip unless free.

Interaction with the R5/R6 backlog: FIN finish ttk and ESC hunt esc are T1 done locally (q_k from ttk); `heal
need/full` and `ffaHeal` move the same heal lines -- r must scale whatever value those presets select, not a
hard-coded 0.70, so implement r after them and through the helper. `zoneEsc edge` is the T6 opposite case (zone
damage is a known small cost versus an unknown large one) and is unaffected.

## 5. Self-critique: when this is wrong for us

1. Practice V(t) is not smooth. If house bots arrive in waves late, the kills still available at 300 s may be
   large; then lowering the retreat line late throws away exactly the high-value seconds. The pulse-retreat result
   (heal breaks +0.17 on one draw, 0.00 +- 0.28 pooled [M]) says retreat tuning is inside the noise either way.
2. The measured effect size of everything except "fight early" is under one sd of a draw (0.24) [M]. A schedule
   that moves thresholds by 20-30% for the last third of a match will very likely be unmeasurable in 1-3 slots.
   Under the owner's "do not over-code" rule that argues for shipping `risk` as off and spending slots elsewhere.
3. V_n = (n-1)/2 assumes we are an average finalist and that avoiding fights is free. If the finalists hunt (shared
   kills come to us anyway) or if kills snowball strongly through drops (s large), the required odds drop towards
   (n-1)/(1+2s) and a tight early game forfeits upgrades; with s = 2 the 16-alive requirement is 3:1, not 15:1.
   The base of 0.2 (not 0) is the hedge. The final may also score differently from placement; if kills score,
   G rises and the ffa preset should be weakened or left off.
4. Lowering heal exit below 70% late contradicts the letter of the doctrine (>= 70% to go). If the owner wants the
   70% line fixed, set c = 0 for healExit and h50SeekHpf and let r act on the retreat lines only.
5. ICM-style reasoning ignores position and who can bust whom (L4): a bot at 60% hp facing a 20% hp target should
   attack in any format; the existing finish/keep-target clauses must stay above r in priority (they do: the
   `cancel` and `finishing` branches are evaluated before the hp lines).
6. Two literature items (L8, L9) were read as abstracts only; T7 rests on them and on arithmetic, hence its low rank.

## References

1. Lim, I. S., Wittek, P., Parkinson, J. (2015). On the Origin of Risk Sensitivity: the Energy Budget Rule Revisited. https://arxiv.org/abs/1504.04986 (re-derives Stephens, D. W. (1981), The logic of risk-sensitive foraging preferences, Animal Behaviour 29.)
2. Higginson, A. D., McNamara, J. M., Houston, A. I. (2016). Fatness and fitness: exposing the logic of evolutionary explanations for obesity. Proc. R. Soc. B. https://doi.org/10.1098/rspb.2015.2443
3. Houston, A. I., Rosenström, T. H. (2024). A critical review of risk-sensitive foraging. Biological Reviews. https://doi.org/10.1111/brv.13031 (abstract only)
4. Gilbert, G. T. (2009). The Independent Chip Model and Risk Aversion. https://arxiv.org/abs/0911.3100
5. Li, B., Huang, L. (2026). ICM Out! Better Tournament Strategy from Computed Continuations, vs. Solvers and LLMs. https://arxiv.org/abs/2608.09586
6. Kim, J. (2025). Empirical Validation of the Independent Chip Model. https://arxiv.org/abs/2506.00180 (abstract only: ICM underrates big stacks, overrates short ones)
7. Chow, Y., Ghavamzadeh, M., Janson, L., Pavone, M. (2017). Risk-Constrained Reinforcement Learning with Percentile Risk Criteria. https://arxiv.org/abs/1512.01629
8. Qiu, W., Wang, X., Yu, R., He, X., Wang, R., An, B., Obraztsova, S., Rabinovich, Z. (2021). RMIX: Learning Risk-Sensitive Policies for Cooperative Reinforcement Learning Agents. https://arxiv.org/abs/2102.08159
9. Schweinsberg, J. (2005). Improving on bold play when the gambler is restricted. https://arxiv.org/abs/math/0412362 (states Dubins, L. E., Savage, L. J. (1965), How to Gamble If You Must.)
10. Sang, K., Todd, P. M., Goldstone, R. L., Hills, T. T. (2020). Simple Threshold Rules Solve Explore/Exploit Trade-offs in a Resource Accumulation Search Task. Cognitive Science. https://doi.org/10.1111/cogs.12817
11. Cheng, C., Huan, X. (2026). Optimal Stopping for Sequential Bayesian Experimental Design. https://arxiv.org/abs/2509.21734
12. MacKay, N. J. (2006). Lanchester combat models. https://arxiv.org/abs/math/0606300
13. Yoshida, N. (2016). On Reward Function for Survival. https://arxiv.org/abs/1606.05767 (abstract only; survival as log survival probability)

## Summary for the panel

1. The owner's doctrine is already the textbook form: maximise reward under a hard worst-case constraint (no single
   volley kills) plus a margin (hp >= 70%). Keep the constraint hard; only the margin and retreat lines may move.
2. One rule decides direction: engage iff kill odds q_k/q_d > V/G (value of staying alive over value of a kill) [A].
3. Practice: nobody dies unless we kill them, so waiting earns nothing; V falls with time. Risk appetite should
   rise with time and never fall as mechs die.
4. Final (16-mech free-for-all, placement): others' deaths pay us for free; required odds ~ (alive-1)/(1+2s). An
   even fight loses for both fighters (Gilbert 2009). Play tighter than KS while many are alive, KS at ~4, neutral at 2.
5. Schedule: r = clamp(base + Kt*tau(t) + Kn*nu(alive), 0, 1); hp is only in the gate. Default base 0.5,
   Kt = Kn = 0 gives r = 0.5 = KS bit-identical.
6. Mapping: x(r) = x0*(1 - c*2(r-0.5)) on lose1/2/3Hpf (c 0.3), healEnterHp+healExit together (c 0.2), h50SeekHpf
   (c 0.2); final only: stance `need`, stealHpfFfa, ffaHideHpf. About 25 lines, one helper, one SELECT string.
7. Presets: `risk off` (default); `risk late` (210 -> 330 s, r 0.5 -> 1; practice +0.0..+0.15 [A], sign uncertain);
   `risk ffa` (r 0.2 at 8+ alive -> 0.53 at 4 -> 0.7 at 2; final only, cannot cost practice points).
8. Rank: `risk ffa` first (theory fixes the sign, zero practice cost); `risk late` one slot at most; farm taper skip.
9. Honest size: every practice effect here is below one draw's sd (0.24). Do not spend more than one slot on it;
   this is the place where over-strategising would hurt.
10. Wrong if: late house-bot waves keep V high late; finalists hunt or kills snowball (s large) or the final scores
    kills; the owner wants the 70% line fixed (then set c = 0 on healExit and seek, keep only the retreat lines).
11. Must be implemented after the R6 heal presets and scale their selected values, not a hard-coded 0.70.
