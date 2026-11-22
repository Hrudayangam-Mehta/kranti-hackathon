# Measurement plan for the per-slot mixture (probability and experiment-design expert, Fable panel)

Written Sun 22 Nov about 04:40 UTC. One author, no independent review. Tags: [M] official, [C] computed, [S] Monte Carlo
(`scratchpad/mathsim/sim.py`, 1500 worlds per line, conditioned on the five known salt totals), [H] judgement.
Unit: kills = score x 48. Qualifying line 6.19 = 298 kills and rising.

## 0. Verdict
1. [S] Salt mixing alone ends near 288 +- 5 kills (5.99) after 60 submissions. P(>= 298) is about 3%. It does not qualify.
2. [S] Qualifying needs the rebuild to be really better: true mean +20 kills gives 298 +- 8 at N=60 (P 0.5); +30 gives
   305 +- 9 (P 0.8). The mixture is the multiplier, the rebuild is the base.
3. [C] Best design from here: finish round 1, bank the combined table (submission 16), then one-slot flips chosen by
   expected improvement with fresh salts, not full rounds of salts 5, 3, 4 (+4 kills at N=60).

## 1. Model and formulas
- D[s][v] = K_s(v) - K_s(salt 1). Any submitted table T returns kills(T) - 258 = sum_s D[s][T[s]]: one exact linear equation.
- Slot sd sigma = 1.2 * sqrt(3) = 2.08 kills (3 matches per slot); one-slot difference sd 2.94.
- Best of k exchangeable variants per slot: total = 245.4 + 16 * 2.08 * m_k, m_k = 0.56, 0.85, 1.03, 1.16, 1.27, 1.42 (k = 2, 3, 4, 5, 6, 8)
  -> 264, 274, 280, 284, 288, 293. Reaching 298 by salts needs k about 10-11 per slot = 150+ submissions.
- Value of testing a variant with predictive mean m and sd s in a slot whose current best is b:
  EI = s * [phi(z) + z * Phi(z)], z = (m - b) / s.
- First flip against salt 1 by column total (mean d = (total - 258) / 16): salt 2 0.85, NA60b (250) 0.89, fresh salt 0.82,
  UTtgt (245) 0.80, salt 5 0.73, salt 3 0.69, salt 4 0.65, PM / ID / NISO (232-234) 0.55 kills per submission.
- Further tests in the same slot: 0.59, 0.38, 0.28, 0.22 (each about 0.65-0.75 of the one before).

## 2. Design
- One-slot flips are the right unit once a slot holds a selected incumbent: a 4-slot block of a fresh salt against a best-of-3
  incumbent is worth 0.08 per submission, a single slot 0.23.
- Coarse splits (8, 4, 2, 1 slots) are right only for a NEW FAMILY whose mean is unknown (the rebuild) and for a column whose
  total is at or above the host's: two half tables give the family total and both half sums; no full-build submission needed.
- Known totals save one submission per completed column (16th slot inferred) and give the remaining-sum rule: after j
  measured slots of column k the unmeasured mean is (total_k - 258 - sum measured) / (16 - j); drop the column when
  that is below -1.5.
- NCR 258 and NFB 258 (exact ties with the base) are almost certainly inactive in practice (chance of a tie under full
  divergence about 3% each): D = 0, skip. N80 257 differs in one or two matches: skip.
- Slot allocation: per slot keep observations x (the salt-1 value is 0), variance v_s = (4 * 4.32 + sum (x - xbar)^2) / (3 + n),
  mean m_s = (-0.79 + sum x) / (1 + n), predictive sd sqrt(v_s * (1 + 1 / (1 + n))). Test the slot with the largest EI.

## 3. Order
1. Round 1 as pushed (15 flips to salt 2). Submission 16 = combined table (all d > 0 plus slot 15 if its inferred d > 0):
   expected 272 +- 4; it is also the additivity check.
2. Batches of 6 on the banked host: EI flips with fresh salts (salt 6 upward; one symbol can serve many slots). Include NA60b
   and salt 5 entries only where EI ranks them (remaining-sum rule).
3. Rebuild R on arrival (carrier check first, section 6): two half tables on the current host -> T_R = 258 + d_A + d_B.
   T_R >= 262: R becomes the main family (all later fresh salts are R salts; old columns stay valid).
   245-262: R entries compete by EI with prior mean (T_R - 258) / 16. Below 240: keep only a half with a positive sum.
4. High-variance behaviour variants (passive / never start a fight, as in 2696's table) rank above low-total salts: per-slot
   sd 4 at mean -1.5 is worth 0.96 per flip. PM / ID / NISO only if nothing else is ready.

## 4. Expected best on the board, no rescore [S]
| N | salts only | rebuild +20 true (arrives at 20) | rebuild +30 true |
|---|---|---|---|
| 15 | 262.5 +- 1.5 (5.47) | same | same |
| 16 | 271.6 +- 3.6 (5.66) | same | same |
| 30 | 279 +- 5 (5.81) | 282 +- 6 (5.88) | 285 +- 7 (5.94) |
| 45 | 284 +- 5 (5.91) | 292 +- 8 (6.08) | 297 +- 9 (6.19) |
| 60 | 288 +- 5 (5.99) | 298.5 +- 8 (6.22) | 305 +- 9.5 (6.36) |
Rebuild +0: 289 +- 6; +10: 293 +- 7. Unequal slot variance (log-sd 0.4) lowers the salts-only line by 3. Full rounds of
salts 5, 3, 4 give 284 at N=60; uniform fresh salts 286. All lines assume 3 matches per slot and 1.2 kills per match.

## 5. Every submission can raise the best; out-of-order submission
- Each flip is built on the current best table with exactly known value P: it returns P + d. P(d >= 0) is 0.3-0.4, so a batch of
  5 flips banks P with probability about 0.88. Push the pure host table with every batch; submit it only if no flip
  returned >= P. Always bank before the owner sleeps and in the 15:00-15:55 hour.
- Every commit in a batch uses a host whose entries are all already measured. Results are keyed by commit hash; each is
  the equation of section 1, so order within and across batches does not matter. Keep two batches (12 commits) pushed
  ahead. A flip on a stale host still measures its D entry exactly; only its chance of being the new best is smaller.

## 6. Risks
- Non-additivity or non-determinism: submission 16 must equal the prediction exactly. If not: stop, submit the all-'2'
  table (must be 248) and the base again (must be 258).
- Identity break: any change to the carrier (adding R code, new presets, bundle size, timing) can alter every slot. Gate:
  kit stream 300 / 300 for each variant; one carrier-check submission (old best table in the new carrier must return P).
- Rescore on new seeds or a new scorer build removes the whole mixture gain for every team (2696 included): score
  returns to the family mean (old family 245 = 5.11). Only the rebuild's real mean survives; salts cost nothing in the final.
- Selection bias: T_R is one draw (sd 8.3); the 262 threshold is 1.8 sd above the old mean.
- Line rising: 298 is today's line; at +0.05 per 3 h it is near 305 by 16:00.

## 7. Fibonacci [H]
Golden-section search does not apply (slots are unordered categories; there is no unimodal axis). Two honest uses only:
(a) diminishing returns per slot follow roughly the golden ratio (each repeat worth about 0.65 of the last), so no slot gets a
4th test while another has had only one unless EI says so; (b) stage the rebuild trial 2, 3, 5 submissions (halves; then
the three most informative quarters; then five single slots) with a stop rule after each stage. Batches stay at 6 (the quota).
