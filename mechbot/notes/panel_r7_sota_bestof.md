# Panel R7 — SOTA memo, topic `bestof`: spending ~100 noisy submissions when only the best one counts

Tags: [M] official result, [A] arithmetic/model, [L] literature, [N] no evidence.
Scratch: `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/bestof/alloc.js` (pure arithmetic Monte Carlo, no game code).

## 1. Decision question
We have about 100 submission slots (6 per hour, last safe slot 15:15 UTC Sun). Each submission of a build+salt returns
one draw with sd about 0.24 around that build's true 48-seed mean. Only the best draw counts, and its only use is
to sit above the top-32 cut at close (now about 5.4, projected 5.8-5.9); the final is then played on new seeds.
Our best is KS 5.19 [M]; every build tested so far has a true mean near 5.0. Question: each hour, how many of the 6
slots go to fresh salts of the current leader, how many to new builds (arms), when is an arm dropped or promoted,
and which entry is nominated?

## 2. What the literature says (sections read this session unless marked)
- **Max K-armed / extreme bandits.** The objective is the single best reward, not the sum. The "best" arm is the
  one with the best upper tail at the remaining horizon, and it can change with the horizon and with the value
  already banked (Nishihara et al. 2016, oracle definitions and Appendix A) [L]. No policy is guaranteed to match
  the single-arm oracle in general, but for light-tailed, bounded rewards (our case: a mean of 48 bounded
  placements) the negative result does not bite (Balef et al. 2025, section 3) [L].
- **MaxUCB** (Balef, Vernade, Eggensperger 2025, Algorithm 1): pull the arm with the largest
  `U_i = max(draws of i) + (alpha * log t / n_i)^2`. The bonus shrinks as 1/n^2 (not 1/sqrt n) because maxima of
  bounded light-tailed samples concentrate fast: an arm is abandoned quickly once a few draws show nothing [L].
- **Unified arm** (David and Shimkin 2015, section 5): when arms' attainable maxima are close, drawing arms
  without distinguishing them does as well as or better than trying to identify the best; identification pays
  only when many arms are clearly worse [L].
- **Fixed-budget best-arm identification**: Sequential Halving (Karnin et al. 2013; analysis in Zhao et al. 2023):
  log2(n) stages, uniform draws on survivors, drop the bottom half; simple regret about sqrt(n/T). Error
  probability is governed by H = sum of 1/gap^2 (Carpentier and Locatelli 2016) [L]. For us sigma^2/gap^2 is
  5.8 at a gap of 0.1: separating two arms 0.1 apart at 1 sd of the difference needs about 12 draws each. Small
  gaps are not identifiable inside our budget [A].
- **PI / max-oracle UCB** (Kikkawa and Ohno 2022, 2024): for the max objective, pull the arm with the highest
  (optimistic) probability of beating the current best — probability of improvement, not expected mean [L,
  abstracts only].
- **Winner's curse / leaderboard reuse** (Blum and Hardt 2015; Zrnic and Fithian 2024; Xu et al. 2026): the best of
  many noisy scores overstates true quality; selection must be on shrunk means [L, abstracts only].
- Classics cited from memory, not re-read today: Cicirello and Smith 2005, Streeter and Smith 2006 (max K-armed);
  Audibert and Bubeck 2010 (Successive Rejects); Russo 2016 (top-two Thompson); Frazier 2018 (BO tutorial,
  knowledge gradient). Bayesian optimisation with a GP adds nothing here: the arms are a handful of categorical
  presets, signal-to-noise per draw is below 1, and Thompson/PI on independent normal arms is the same idea
  without the machinery [A].

## 3. Techniques that apply, with numbers for our case
Model: draw = arm mean + N(0, 0.24^2) [M sd]; near-normal because it is a mean over 48 matches.

**3.1 Order statistics [A].** Expected best of n draws above the arm mean: n=4 +0.25, 8 +0.34, 16 +0.42, 32 +0.50,
64 +0.56, 100 +0.60. Chance that at least one of n draws reaches the cut:

| arm mean | cut 5.4 (n=20/50/100) | cut 5.6 | cut 5.8 | cut 5.9 |
|---|---|---|---|---|
| 5.03 (today) | 0.72 / 0.96 / 1.00 | 0.16 / 0.36 / 0.59 | 0.01 / 0.03 / 0.06 | 0.00 / 0.01 / 0.01 |
| 5.1 | 0.89 / 1.00 / 1.00 | 0.31 / 0.61 / 0.85 | 0.03 / 0.08 / 0.16 | 0.01 / 0.02 / 0.04 |
| 5.2 | 0.99 / 1.00 / 1.00 | 0.62 / 0.91 / 0.99 | 0.12 / 0.27 / 0.46 | 0.03 / 0.08 / 0.16 |
| 5.3 | 1 | 0.89 / 1.00 / 1.00 | 0.31 / 0.61 / 0.85 | 0.12 / 0.27 / 0.46 |
| 5.4 | 1 | 0.99 / 1 / 1 | 0.62 / 0.91 / 0.99 | 0.31 / 0.61 / 0.85 |
| 5.5 | 1 | 1 | 0.89 / 1.00 / 1.00 | 0.62 / 0.91 / 0.99 |

Reading: salts alone clear today's 5.4 almost surely within 3-4 hours, and clear a closing cut of 5.8 with
probability about 6%. To be safe at 5.8 we need a true mean of about 5.4; at 5.9, about 5.5.

**3.2 Mean-for-slots exchange rate [A].** When the target sits z sd above an arm's mean, a mean gain d multiplies
the per-draw hit chance by p(mu+d)/p(mu): at z=3 (5.03 vs 5.75), +0.05 = x1.9, +0.10 = x3.6, +0.20 = x11,
+0.30 = x30. So an arm that is truly +0.1 is worth 3.6 leader re-draws per slot, and one truly -0.05 is worth
half a slot. Mean dominates salts by an order of magnitude; this is the horizon effect in Nishihara et al.

**3.3 Exploration is nearly free under a max objective [A, L].** A draw of a new arm is itself a ticket. Its hit
chance uses the predictive sd sqrt(0.24^2 + v) with v the uncertainty of its mean, so an untested arm with the
same expected mean as the leader has a *higher* chance of a 5.8 than a leader re-draw (PI rule). Monte Carlo,
100 slots, leader true mean 5.03, new arm = leader + N(m0, tau^2), P(best >= 5.6 / 5.8 / 5.9):

| world (effect of a change) | leader salts only | 8 arms x 2 draws then commit | 16 arms, halving | 16 arms, PI rule | 30 arms, PI rule |
|---|---|---|---|---|---|
| tau 0.05, m0 -0.05 (changes are no-ops) | .57/.11/.04 | .51/.09/.02 | .54/.11/.03 | .56/.11/.03 | .54/.10/.03 |
| tau 0.10, m0 -0.03 | .57/.12/.04 | .67/.22/.08 | .76/.26/.10 | .79/.27/.10 | .79/.28/.11 |
| tau 0.15, m0 -0.03 | .57/.10/.03 | .78/.36/.18 | .88/.46/.24 | .90/.49/.25 | .92/.55/.29 |
| tau 0.15, m0 -0.10 (changes hurt on average) | .57/.11/.03 | .63/.23/.10 | .76/.29/.13 | .81/.33/.15 | .83/.36/.17 |
| tau 0.25, m0 -0.05 (bold changes) | .57/.11/.03 | .89/.63/.45 | .97/.77/.59 | .98/.80/.59 | .99/.87/.68 |

Reading: trying new arms costs at most 0.03 when changes are no-ops and gains 0.2-0.6 when changes have real
spread, even if they hurt on average. More arms and wider (bolder) arms beat more salts. PI/Thompson allocation
is as good as or better than halving and far better than leader-only.

**3.4 What our own results say about tau [M, A].** Twelve salt-0 builds: sd of scores 0.18. Same-build salts: V4
5.15/4.69/5.06, S 5.13/4.92, pooled sd 0.22. Between-build spread is not larger than within-build noise: the
estimated tau for the preset flips tried so far is about 0 (only V2, -0.35, stands out). KS 5.19 is a lucky draw
of a 5.0 family, shrunk mean about 5.03. Preset flips of that kind live in row 1 of the table. Only
behaviour-level arms (the owner's any70 aggression KB, the one-volley guard, FIN/ISO/ESC, heal need/full) can
have tau of 0.15-0.25, and those rows are where the probability is.

## 4. The allocation rule (maps to submissions, not to bot runtime)
Code sites: an arm = one `SELECT` entry change in `bot/lib/params.js` (line 235); a re-draw = `PARAMS.salt`
(line 16). No bot logic changes; no new code. `tools/panel_r4/decide.py` already fits draws; the rule below can
be run from its CSV or by hand. All of section 4 is **practice-only**; 4.5 is the hand-off to the final.

4.1 **Target.** T = projected closing cut + 0.05 (now 5.85; re-read the board hourly and use max(current cut +
0.3, last hour's cut + its hourly rise x hours left), capped at 6.0).

4.2 **Score every arm with one number.** Shrunk mean m_i = 5.00 + n/(n + 2.5) x (mean of its n draws - 5.00)
(weight 0.29 after 1 draw, 0.44 after 2, 0.62 after 4, 0.76 after 8; k = sigma^2/tau^2 with tau 0.15);
uncertainty v_i = 0.0225 x 2.5/(n + 2.5); index PI_i = 1 - Phi((T - m_i)/sqrt(0.0576 + v_i)). Untested arm: n=0,
m = 5.00 minus the expert's honest expected loss, v = 0.0225 (use 0.0625 for a behaviour-level arm, 0.0025 for a
knob flip). Submit in decreasing PI. Every submission uses a salt never used with that build (an identical
build+salt repeats exactly and wastes the slot [M]).

4.3 **The same rule as a table (T about 5.8).** Play the winner:
- New arm, first draw x: x >= 4.95 gets a second draw next hour; 4.75-4.95 goes to the back of the queue;
  x < 4.75 is dropped (PI under half the leader's).
- After 2 draws: continue while the mean is >= 5.00; after 4 draws while >= 5.03; after 8 while >= 5.05
  (equivalently: keep drawing an arm while its running mean is at least the leader family's).
- Promote to leader when the shrunk mean beats the leader's by >= 0.05 with >= 3 draws. Never promote on a best
  draw (winner's curse).
- Knob flips expected to change no decision (like KA) get no slot at all.

4.4 **Hourly split of the 6 slots.**
- New gated arms available: all of them first (up to 5), behaviour-level before knob flips, one draw each; the
  remaining slots go to the top-PI tested arm. With 3 new arms: 3 new + 2 second draws of survivors + 1 leader.
- No new arm: 6 fresh salts, split 4/2 between the two highest shrunk means (unified-arm result: with means this
  close, do not agonise over which).
- Hard floor: while our best is below the *current* cut, at least 2 slots per hour are leader salts (at mean
  5.03 each has a 6% chance of >= 5.4; 20 draws give 72%).
- Last 2 hours (12 slots, 13:15-15:15): commit — all slots to the single highest shrunk mean with fresh salts
  (explore-then-commit; nothing learned after that can be used).
- Expected outcome if no arm ever beats 5.03: best of about 100 draws about 5.6 (+0.60), i.e. out at a 5.8 cut.
  That is the number that says the engineering hours belong to few bold arms, not to salts or knob sweeps.

4.5 **Nomination (practice -> final).** Above the cut, extra practice score is worth nothing. Nominate the build
with the best shrunk mean and the FFA items among those that have a draw above the cut, re-submitted with the
winning presets+salt on the final code (per panel_r4_schedule: FFA-only code replays the same 48 matches) and
do it early because ties go to the earlier submission. A draw that is the best of ~60 overstates its build by
about +0.55; do not read it as strength for the final.

4.6 **Cheapest test.** None needed in the game: the rule is arithmetic. Check once per hour that realised
same-build sd stays in 0.17-0.28 (it sets every threshold; scale the thresholds by sd/0.24 otherwise).

## 5. Self-critique — when this is wrong for us
- If sigma is really 0.17 (the R4 estimate) all hit chances at 5.8 fall by about 10x and salts are worth even
  less; the conclusion (mean first) only strengthens, but the 4.3 thresholds tighten by 0.7.
- If tau for the remaining arms is about 0, as for every preset flip so far, no allocation rule gets us above
  5.8; the rule then costs nothing but also saves nothing. The only cure is a behaviour change that moves the
  mean by 0.3+, which is the owner's doctrine (go for the reward at hp >= 70% and safe from one volley).
- Salt draws of different builds may be correlated (shared seeds, common random numbers). That makes build
  differences more precise than assumed (good for screening) but tickets less independent (slightly worse max).
- The cut projection is the weakest number; if it stalls at 5.5-5.6, salts of a 5.1 arm suffice (0.61-0.85) and
  exploration should stop earlier (commit at 4 hours left, not 2).
- Each arm needs a gated push; engineer time, not slots, is the binding budget. The rule must never leave a slot
  empty: pre-push 6 leader salts every hour as fillers.
- PI with a fixed prior is a heuristic; MaxUCB/halving guarantees are asymptotic and say little at 100 pulls
  with gaps under 1 sd. The Monte Carlo, not the theorems, carries the numbers here.

## References
1. Put CASH on Bandits: A Max K-Armed Problem for Automated Machine Learning — A. R. Balef, C. Vernade, K. Eggensperger, 2025 — https://arxiv.org/abs/2505.05226 (read: sections 3-4)
2. No Regret Bound for Extreme Bandits — R. Nishihara, D. Lopez-Paz, L. Bottou, 2016 — https://arxiv.org/abs/1508.02933 (read: sections 2-3, App. A)
3. The Max K-Armed Bandit: A PAC Lower Bound and tighter Algorithms — Y. David, N. Shimkin, 2015 — https://arxiv.org/abs/1508.05608 (read: sections 1, 4-5)
4. Revisiting Simple Regret: Fast Rates for Returning a Good Arm — Y. Zhao, C. Stephens, C. Szepesvari, K.-S. Jun, 2023 — https://arxiv.org/abs/2210.16913 (read: section 3)
5. Tight (Lower) Bounds for the Fixed Budget Best Arm Identification Bandit Problem — A. Carpentier, A. Locatelli, 2016 — https://arxiv.org/abs/1605.09004 (abstract)
6. Efficient Algorithms for Extreme Bandits — D. Baudry, Y. Russac, E. Kaufmann, 2022 — https://arxiv.org/abs/2203.10883 (abstract)
7. Extreme bandits — A. Carpentier, M. Valko, 2014 — https://arxiv.org/abs/2604.24545 (abstract)
8. Max K-armed bandit: On the ExtremeHunter algorithm and beyond — M. Achab et al., 2017 — https://arxiv.org/abs/1707.08820 (abstract)
9. Materials Discovery using Max K-Armed Bandit — N. Kikkawa, H. Ohno, 2022 — https://arxiv.org/abs/2212.08225; Unified theory of UCB policies ... maximal reward — same authors, 2024 — https://arxiv.org/abs/2411.00339 (abstracts)
10. The Ladder: A Reliable Leaderboard for Machine Learning Competitions — A. Blum, M. Hardt, 2015 — https://arxiv.org/abs/1502.04585 (abstract)
11. A Flexible Defense Against the Winner's Curse — T. Zrnic, W. Fithian, 2024 — https://arxiv.org/abs/2411.18569 (abstract)
12. SOTA or Luck? The Winner's Curse in LLM Leaderboards — S. Xu et al., 2026 — https://arxiv.org/abs/2611.22227 (abstract)
13. From memory, not re-read: Karnin, Koren, Somekh 2013 (Sequential Halving, ICML); Audibert and Bubeck 2010 (Successive Rejects, COLT); Cicirello and Smith 2005; Streeter and Smith 2006; Russo 2016 (top-two Thompson); Frazier 2018 (A Tutorial on Bayesian Optimization, arXiv:1807.02811).

## Summary for the panel
1. [A] Salts cannot qualify us. At the leader family's true mean of about 5.03 (KS 5.19 is a lucky draw of a 5.0
   build), 100 draws reach 5.4 almost surely, 5.6 with 0.59, 5.8 with 0.06, 5.9 with 0.01. Expected best of 100
   draws is mean + 0.60 = about 5.6.
2. [A] Mean beats slots by an order of magnitude: at a target 3 sd up, +0.10 of true mean is worth x3.6 slots,
   +0.20 x11, +0.30 x30. A safe 5.8 needs a mean near 5.4.
3. [M, A] Our 12 salt-0 builds spread by 0.18, less than the 0.22-0.24 same-build noise: the preset flips so far
   have moved the mean by about 0. Knob flips get no more slots; only behaviour-level arms (KB any70, one-volley
   guard, FIN/ISO/ESC, heal need/full) can carry the +0.3.
4. [A, L] Under a max objective exploration is nearly free (a new arm's draw is also a ticket, with a wider
   predictive spread). Monte Carlo, P(best >= 5.8): leader salts only 0.11; 16 new arms with the PI rule 0.11 if
   changes are no-ops, 0.27 at tau 0.10, 0.49 at tau 0.15, 0.80 at tau 0.25, and still 0.33 if changes hurt by
   0.10 on average.
5. Rule: score each arm by PI = 1 - Phi((T - m)/sqrt(0.0576 + v)), T = projected cut + 0.05, shrunk mean
   m = 5.00 + n/(n+2.5) x (mean - 5.00); submit in decreasing PI, always with a fresh salt.
6. Same rule by hand: new arm's first draw >= 4.95 earns a second, < 4.75 is dropped; keep drawing while the
   running mean is >= 5.00 (2 draws), 5.03 (4), 5.05 (8); promote on shrunk mean +0.05 with >= 3 draws, never
   on a best draw.
7. Hourly 6 slots: every newly gated behaviour arm first (one draw each), then second draws of survivors, the
   rest leader salts; at least 2 leader salts per hour while our best is under the current cut; no new arm =
   6 fresh salts split 4/2 over the two best shrunk means; last 2 hours all 12 slots on the single best mean.
8. Nomination: above the cut the score has no further value; nominate the best shrunk-mean build with the FFA
   items that has a draw above the cut, re-submitted early (ties go to the earlier entry). The top draw of ~60
   overstates its build by about 0.55.
9. No bot code and no new tooling: arms are `SELECT` entries and re-draws are `PARAMS.salt` in
   bot/lib/params.js; tools/panel_r4/decide.py already fits the draws. Practice-only.
10. Wrong if: sd is 0.17 (thresholds x0.7, salts worth even less), the cut stalls at 5.5-5.6 (then salts of a
    5.1 arm suffice: commit 4 hours out), or draws across builds are correlated. Engineer time, not slots, is
    the binding budget: pre-push 6 filler salts each hour so no slot is ever empty.
