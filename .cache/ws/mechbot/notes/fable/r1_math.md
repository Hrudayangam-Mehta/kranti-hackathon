# Fable panel, round 1: MATHEMATICIAN (exact models of the climb)

Written Sun 22 Nov, about 01:00 UTC. Read: FABLE_BRIEF (incl. 00:45 update), FABLE_PLAN, moderator_r1, BUILD_LOG,
submissions.md, panel_r7_r1_stats, panel_r7_sota_bestof / engage (first halves), tactics.js lines 388-406 and 474-478.
No simulator run, no git, no server. Scripts and raw output: scratchpad/fable_work/r1_math/ (climb.py, mech.py, *_out.txt).
Tags: [C] computed from official numbers or by the scripts; [E] estimated (model with stated assumptions);
[H] heuristic judgement. No sub-agents were used (one author; not independent review).

## 0. Headlines
1. [C] Scores are integers over 48: the base 5.35 is 257 kills. All 13 official climb steps in kills:
   FIN -5, LG -9, LC +3, LX -2, healDoc -10 (on 251); cover 2.0 -1, low15 +1 (on 254); oneHit -1, low10 +2,
   cover 1.0 +1, finishHpf 0.3 0, finishThreats 3 +1, lastStand 0.35 -3 (on 255).
2. [C] The eight parameter-value steps sum to exactly 0 kills, rms 1.5 kills: each is about ONE re-rolled match.
   The five new-behaviour steps average -4.6 kills (rms 6.6). Both kinds have paid the same so far:
   about 0.6 kills (0.013) expected gain per slot, P(strictly higher) 4/8 and 1/5.
3. [C] FABLE_PLAN builds F1, F3, F4, F5 are built on lcLowHpf 0.15 or 0.23. On the 5.35 base that gives back the
   +2 kills of low10 by determinism (F1 'oneHit' at 0.23 gives back most of the +3 banked since 0.25). They must be
   rebuilt with lcLowHpf 0.10 before any slot is spent. This is the most important correction in this memo.
4. [E] F6 (fresh salt) is the worst ticket on the table: P(strictly higher) 0.08, 0.4 kills expected; a
   one-match parameter step is 0.35 and 0.66. Drop it. Fresh salts are dominated from here to the end.
5. [E] Model climb from 257 with honest regression: 35 effective small steps -> median 5.65-5.73; my discounted
   judgement for the Fable line's share is 5.50-5.65 [H], because the binding limit is the number of distinct
   parameter moves that change at least one official match, not the number of slots.
6. [C/H] "Fight on pays" is supported only for the LC gate (z = +1.4, one-sided p 0.08 before any allowance for
   having picked the family after seeing it). Other fight-on keys sum to -8 kills. P(LC-gate direction is real)
   is about 0.6-0.7 [H]; P(every fight-on change pays) is below 0.3 [H].

## 1. The deterministic climb as an exact model
Setting. Match i of 48 on the base has outcome x_i (integer kills). Over our own salt, a configuration has a
per-match mean mu_i and sd s = 0.2 x sqrt(48) = 1.4 kills [C from the per-draw sd 0.2; 1.18 if per-draw sd is 0.17].
The base sits e above its configuration's mean per match (e in kills per match = score units).

A step that touches m matches (assumed a random subset, each fully re-drawn, true effect th kills per touched match):
- D = (new total - old total) has mean m (th - e) and sd s sqrt(m (2 - m/48)) kills.   [C, exact for this model]
- The moderator's formula used sd s sqrt(m) (it left out the spread of the old outcomes in the subset); the correct
  sd is 41% larger for small m, so small steps are worth more than moderator_r1 states. At m = 48 both give 9.7.
- Kept only if D >= 1 kill. Expected gain G = sd (phi(z) + z Phi(z)), z = mean / sd.

Value of e now [E]: KB family draws 5.19, 5.23, 4.98 (salts 0, 1, 2) and the R7 stats prior 5.00 +- 0.12 give a
configuration mean of about 5.08 +- 0.08, so e is about 0.27 at 5.35 (range 0.15-0.40). Part of that is real LC
effect if there is one; treating all of it as luck is the conservative reading.

Table [C, climb.py section A]: expected gain in kills / P(strictly higher), no true effect (th = 0).

| e (score) | m=1 | m=2 | m=4 | m=8 | m=16 | m=24 | fresh salt (48) |
|---|---|---|---|---|---|---|---|
| 0.15 (5.23) | 0.71 / .37 | 0.96 / .39 | 1.26 / .39 | 1.59 / .38 | 1.84 / .34 | 1.85 / .31 | 1.29 / .21 |
| 0.27 (5.35, now) | 0.66 / .35 | 0.86 / .35 | 1.07 / .34 | 1.23 / .31 | 1.22 / .25 | 1.06 / .20 | 0.41 / .08 |
| 0.40 (5.48) | 0.60 / .32 | 0.75 / .32 | 0.88 / .29 | 0.91 / .25 | 0.75 / .17 | 0.53 / .11 | 0.09 / .02 |
| 0.55 (5.63) | 0.54 / .30 | 0.64 / .28 | 0.69 / .24 | 0.62 / .18 | 0.39 / .10 | 0.21 / .05 | 0.01 / .00 |
| 0.75 (5.83) | 0.47 / .26 | 0.51 / .24 | 0.49 / .18 | 0.35 / .11 | 0.15 / .04 | 0.05 / .01 | 0.00 / .00 |
(1 kill = 0.021 score. With a real effect th = +0.3 at e = 0.27: m=1 0.80 / .41, m=8 2.26 / .48.)

Readings.
- [C] One-match steps lose little as the base rises (0.66 -> 0.47 kills from 5.35 to 5.83). Fresh salts collapse
  (0.41 -> 0.01). The best size is m about 8-16 now, m about 4 at 5.5, m 1-2 above 5.6.
- [C] A step that is larger only because it is new code is not better: the five new-behaviour steps averaged
  -4.6 kills, which is what regression alone predicts only for m near 30; so new code has carried a negative mean
  effect, or official divergence is much wider than local divergence (both have been seen: healDoc). Empirical
  yield 0.6 kills per slot, no better than a one-match step, with P(higher) 0.2.
- [C] Calibration check: the model with m = 1 predicts rms 2.0 kills and yield 0.66; the eight small steps show
  rms 1.5 and yield 0.625. The model is not optimistic about small steps on the evidence so far.

Corollaries of determinism (these are exact, not statistical) [C]:
- R1 Banked values must be carried. Any build that moves a banked key back (lcLowHpf above 0.10) replays the old
  outcome in the matches that produced the gain and returns those kills.
- R2 Additivity. Two steps that each won on the same base and touch disjoint matches add exactly when combined,
  unless the second parameter acts inside the diverged continuation of the first one's match. Expect the sum with
  probability about 0.7 per pair [H]. So cover 1.0 (+1) and finishThreats 3 (+1), both measured on 255, predict
  258, 258 and 259 = 5.40 for the three Opus merges on the 257 base. That is a prediction to score the model on.
- R3 A threshold key is a step function: moving it from a to b touches exactly the matches with an event in
  (a, b). Nested values are a walk; the best value is the best prefix of the walk.
- R4 A tie to the hundredth means no match's outcome changed (finishHpf 0.3): the key is locally inert; one more
  value further out at most, then retire it.

Far value or fine scan [C, section E, e = 0.27]: one far value touching about 4 matches yields 1.06 kills in one
slot; a four-value nested scan yields 1.53 kills in four slots (0.38 per slot). After a far value fails, the half
step is worth only 0.25 kills, P(higher) 0.17 [C, mech.py]; after it wins, the half step adds 0.19, P 0.14.
So: far value first; bisect only when no untouched key is left (it still beats a fresh salt above 5.40).

How far in the remaining slots [E, Monte Carlo, 3000 runs, start 257, configuration mean 5.08, 15% inert slots]:

| policy | 6 slots | 18 slots | 35 slots | 70 slots | P(>= 5.6) at 35 | P(>= 5.8) at 35 |
|---|---|---|---|---|---|---|
| small steps (m 1-3), neutral | 5.43 | 5.57 | 5.74 | 6.02 | 0.90 | 0.30 |
| small steps, 40% inert | 5.41 | 5.51 | 5.64 | 5.87 | 0.66 | 0.08 |
| small steps, each -0.3 per match | 5.42 | 5.52 | 5.66 | 5.88 | 0.73 | 0.08 |
| new behaviour, m 20, -0.2 per match | 5.40 | 5.47 | 5.54 | 5.63 | 0.30 | 0.02 |
| fresh salts only | 5.40 | 5.46 | 5.52 | 5.57 | 0.23 | 0.01 |
These rows assume an unlimited supply of distinct steps, each touching fresh random matches. That is the weak
assumption. Discounted judgement [H]: the two lines together have perhaps 25-40 effective parameter moves left;
end score 5.50-5.65 for the merged best, P(>= 5.6) about 0.45, P(>= 5.8) about 0.1. History agrees in rate:
251 -> 257 in 13 slots is 0.46 kills per slot, with +2 more measured but not yet merged.
What would falsify the model: the Opus merges landing below 257 on two of three (additivity fails), or the next
ten small steps yielding under 2 kills in total (supply or regression worse than modelled).

## 2. Which mechanism pays: fight on or retreat
Null model for every step: D ~ N(-e m, s^2 m (2 - m/48)) with a guessed m (1 for value steps; 14, 4, 10, 6 for
LC, FIN, healDoc, LX from local divergence, also doubled as a sensitivity check). [C, mech.py]

| family | steps (kills, signed toward "fight on") | total | null mean | z | one-sided p |
|---|---|---|---|---|---|
| LC gate: fight on unless cover is near or hp is low | LC +3, low15 +1, low10 +2, cover 1.0 +1, cover 2.0 reversed +1 | +8 | -3.0 | +1.39 (m doubled +1.34) | 0.08 |
| other fight-on keys | finishThreats 3 +1, finishHpf 0.3 0, oneHit -1, lastStand 0.35 -3, FIN -5 | -8 | -1.5 | -1.17 (-0.64) | 0.12 |
| heal / stay out longer | healDoc -10, LX -2 (loseExitS 1.0 holds LOSING longer) | -12 | -2.4 | -1.27 (-0.71) | 0.10 |
(LG -9 is an opening-loot change and belongs to neither side.)

- [C] Sign evidence in the LC gate: 4 of 4 value steps favourable; under the null P = 0.02-0.03; Bayes factor 4-7
  against "P(up) = 0.6". With three families looked at after the fact the honest p is about 0.2.
- [H] Posterior: LC-gate fight-on has a real positive mean effect, 0.6-0.7. "Heal or stay out more costs", 0.6.
  "Any fight-on change pays", under 0.3: the three keys that push us to fight at low hp regardless of cover or
  attackers (oneHit thresholds, last stand at 35%, FIN) all lost.
- [H] The reading that fits all 13 numbers: what pays is not leaving a fight when leaving cannot reach cover
  (a retreat in the open under 15 shared-vision hunters is a slow death with no kills). What does not pay is
  forcing a stand that the d3 / last-stand logic would not have chosen. That is one sentence fitted to 13 points;
  treat it as a prior for ordering tickets (P(up) 0.45 against 0.35), not as a finding.
- [C] Practical size of the question: a real effect of +0.3 kills per touched match lifts a one-match ticket from
  0.66 to 0.80 kills. The mechanism matters less than ticket supply and rules R1-R4.

## 3. Search plan on the 257 base (next six Fable slots, then the rule set)
Base for every build: the best official build at build time (now FSL10 s1, lcLowHpf 0.10, lcCoverS 1.5, salt 1);
if an Opus merge wins, rebase on it (R1). Opus already holds: low10 + cover 1.0, low10 + finishThreats 3, both,
low05. Do not duplicate those.

| order | build (against the base) | what it asks | size / P(higher) / yield [E] |
|---|---|---|---|
| M1 | lcLowHpf 0, lcCoverS as base ("LOW0") | far value of the winning key; sim touched 7 of 36 | m 2-4 / 0.40 / 1.0 kills |
| M2 | lcCoverS 0.5, lcLowHpf 0.10 | far value of the cover key (2.0 -1, 1.0 +1 so far) | m 2-3 / 0.40 / 0.9 |
| M3 | lcCoverS 0, lcLowHpf 0.10 (F1 corrected) | owner's "fight until one hit", in the gate that has paid | m 3-6 / 0.38 / 1.1 |
| M4 | healEnterHp 0.40 (F3, rebuilt on low10) | opposite of healDoc on (-10) | m 1-3 / 0.35 / 0.7 |
| M5 | lastStandHpf 0.15 | opposite of the -3 step; untouched matches | m 1-2 / 0.35 / 0.7 |
| M6 | aggr any60f (F4, rebuilt on low10) | untouched key; sim and R7 engage memo lean against | m 1-3 / 0.30 / 0.6 |
Reserve, in order: lcCoverS 0 + lcLowHpf 0 (F2 'never'; submit after M1 and M3 have reported, it is their merge);
finishThreats 4; lcCoverS 0.75 + low10 (F5 corrected, bisect of M2); healEnterHp 0.30; lcLowHpf 0.05 only if Opus
did not run it. Dropped: F6 fresh salt; F1 / F5 / F3 / F4 as built (wrong lcLowHpf).
Expected for the six [E]: about +3.5 kills (5.42), P(at least one strictly higher) about 0.88, P(>= 5.5) about 0.15.
Open check for the red team, not mine to rule: finishThreats, finishHpf and lastStandHpf are read in losingRaw /
decideMode without the hunt.firewall() guard (tactics.js 402, 476), so M5 and the finishThreats reserve may act in
the final; M1-M4 and M6 sit behind the firewall or the foreign-death latch.

Rules (apply mechanically).
1. Keep only if strictly higher than the current best (ties go to the earlier build). Record the delta in kills.
2. Never spend a slot on a build that moves a banked key back (R1). Check the SELECT of every bundle for this.
3. Merge rule: winners measured on the same base are merged in ONE slot; predicted score = base + sum of gains.
   If the merge scores below the best single winner, keep the single winner and merge the rest pairwise, largest
   gain first, at most two more slots.
4. Per key: far value first. Stop a key after two results that are not higher in the same direction, or after one
   exact tie plus one further value. A bisect value is submitted only when no untouched key is ready.
5. Size: prefer steps expected to touch 4-8 matches while the best is below 5.45; 1-4 from 5.45 to 5.60; 1-2 above.
6. No fresh salt while any untested parameter value exists; none at all above 5.40 (P(higher) under 0.05).
7. New code (m about 20, historic mean -4.6 kills) only with an argued effect of at least +0.3 kills per touched
   match; otherwise it is a 0.2-probability ticket that also needs gates.
8. Family stop: keep a signed tally for the LC gate. If the next six LC-gate tickets total -4 kills or worse,
   drop the mechanism prior (order tickets by size only). If they total +4 or better, add lcCoverS / lcLowHpf
   scans around the new values before other keys.
9. Model stop: if two of the three Opus merges miss their additive prediction by 2 kills or more, treat all
   merges as fresh one-match lotteries (submit winners one at a time on the newest base instead of merging).

## 4. What I did not verify
- m (matches touched officially) is never observed; only the total moves. All sizes are guesses from rms and from
  local divergence, which is known to mislead (healDoc).
- "Touched matches are a random subset" is an assumption. If low-hp gates fire mainly in matches where we already
  died early (low x_i), regression works in our favour for those steps and the table is pessimistic; the reverse
  for gates that fire in long, high-kill matches.
- Per-match sd 1.4 comes from the per-draw sd 0.2; with 0.17 every yield in section 1 drops by about 20%.
- The configuration mean 5.08 rests on three draws plus a prior.
