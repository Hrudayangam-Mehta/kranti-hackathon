# Panel R7, round 2: decision scientist and submission planner (role `decision`)

Written Sat 21 Nov, 21:47-22:15 UTC. Read: brief, moderator notes, all six round-1 memos (stats, game, eng, psych,
stress — stress appeared at 21:50 and is folded in), four research memos, submissions.md (to the 21:50 push),
build_r7a_log.md (checkpoint 01 only). No sub-agent used; no web search (nothing here needs a new source; the
literature is the bestof memo's, not re-read by me). Tags: [M] official, [T] top bot, [S] simulator, [A] arithmetic or
model, [N] no evidence, [R] rule text.

Scratch (all in `tools/panel_r7/r2_decision/`): `draws.csv` + `fit.py` (stats' fit, two rows added: KS 5.19, S s1 4.92)
-> `fit_out.txt`; `plan_sim.py` (my policy simulation) -> `plan_out.txt`; copies of both round-1 allocation scripts.

## Hashes ready to submit now (the owner's request)

No R7 build is pushed yet (the engineer's log shows checkpoint 01, RB2-RB6, and nothing after). What is ready is the
21:40 and 21:50 pushes. I cannot see which of these the owner has already submitted; skip those.

| order | build | commit | why |
|---|---|---|---|
| 1 | KB s0 | 8428d2e3a17b6e79f26a3308a61918b0bdf46f1e | the only behaviour-level arm that exists; the doctrine itself |
| 2 | KB s1 | d4518215b1e51cfdc493c88227ee483f93e9e500 | 2nd draw: KB is decided on a 2-draw mean |
| 3 | KS s1 | 5898265c0b4fc41935c515aba851c7e695c4636a | leader salt; with s2-s5 it measures sigma, which the whole plan turns on |
| 4 | KS s2 | 692325a02ff803829ac6615eedeaf5085bb1c1e5 | same |
| 5 | KS s3 | 82aaa51eb42092bcae2364924e98ccbc401e6ffd | same |
| 6 | KS s4 | dc2cedddd9f7a231388508f10013c6e786cb6689 | same |
| 7 | KS s5 | 03d0b946799d2d03bbff6c9f2bcb42362921831e | same |
| fillers | KB s2 / KB s3 | 0ba2c485bf2ed2ca146f6259b5b7862a1595d16c / d7d88e2498f6ea6bdce2edd19d28b6b3ad5f1ac7 | only if KB's 2-draw mean is at or above the KS mean |
| fillers | KS s6 / KS s7 | 0f82fa869630044021137e859d080756776c22a6 / cb77a26a0533f235bf83c4d33ba0f2df8f3719f4 | when nothing else is gated |
| last | K0 s1, S s2 | d8f6e646146bd8bc613a4479303af186b6d913d2, c4f015f9441b128df34db0c83b61b7cc4c268871 | lower fitted means (5.01, 4.97 against KS 5.05); use only if a slot would otherwise be empty |

## Step 1. The objective in numbers

- **What counts:** one draw strictly above the 32nd place at Sun 16:00 UTC, on the commit we nominate. [R]
- **Cut:** 5.4 now; stats' saturating fit says 5.5 at the close, the brief projects 5.8-5.9. I plan for 5.6 and report
  5.5 and 5.8 beside it.
- **Where we are:** best 5.19 (KS s0). Refit with 16 draws: KS true mean 5.05 +- 0.11, V4 4.93 +- 0.05, per-draw
  sigma 0.16 (80% range 0.13-0.20), preset effect spread tau 0.06. [M, A] (`fit_out.txt`)
- **Slots:** 28 from 22:25 to 03:00; 101 from 22:25 to the last safe slot at 15:15.
- **Mean needed** for a 50% chance over about 48 draws of one stack: about 5.25 (cut 5.5), 5.3 (cut 5.6), 5.45
  (cut 5.8) at sigma 0.17-0.20. That is +0.2 to +0.4 on KS. [A]
- **The final requires:** the nominated commit's own practice score above the cut, and that same commit plays a
  free-for-all on new seeds. So the nominated commit should also carry the final-only code (FFA posture, stress
  ZG1/ZG2, robustness). That is done by a port: same SELECT and salt on newer code, which must re-score exactly.

## Step 2. Claims that matter for this role

| # | Claim (source) | Steelman | Refutation attempt | Verdict |
|---|---|---|---|---|
| 1 | Per-draw sigma is 0.17 (stats) | 16 draws, homogeneity p 0.48 at 0.17; seven outside re-roll pairs agree | The 16 draws are different builds; if their true means differ the pooled sd overstates sigma, not understates. Same-build salts (V4 x3, S x2) give 0.22-0.24 on 3 df | **0.17-0.20, plan at 0.20.** [M, A] KS s1-s5 settle it within the hour (5 df more). |
| 2 | Sigma is 0.24 (bestof, brief) | It is the only same-build estimate | 3 df; its 80% range covers 0.14-0.45 | Not refuted, less likely. Policy below is the same at 0.24. [M] |
| 3 | Salts cannot qualify (both) | At mean 5.03: P(> 5.6) over 101 slots is 0.11 (sigma 0.17), 0.29 (0.20), 0.63 (0.24) [A, my run] | At sigma 0.24 and a 5.5-5.6 cut, salts alone are better than a coin flip | **True at 5.8 in every case (0.00-0.11). At 5.6 it depends on sigma.** Do not veto salts; rank them last. |
| 4 | New arms on the stack beat salts for every slot (stats) | Policy sim: 0.28 against 0.05 at cut 5.6 with zero-mean arms | The gain is entirely from stacking adopted arms, assuming effects add. At 60% additivity and harmful arms it is 0.00 to -0.11 | **Accept.** Dominant or equal in 6 of 7 worlds; worst case costs 0.11. [A] |
| 5 | Exploration is nearly free; a new arm is a wider ticket (bestof) | Correct for a max objective | Only if the arm's prior mean is not below the leader's by more than about 0.05 | **Accept for behaviour arms; reject for knob flips** (bestof says the same). [A] |
| 6 | At least 2 leader salts per hour while under the current cut (bestof) | Guards against an engineering stall | The current cut is irrelevant before the close; only the closing cut pays | **Reject the floor.** Replace by "the current stack has at least 2 draws" (needed for the base mean anyway). [A] |
| 7 | Parked arms are dropped (stats) vs sent to the back of the queue (bestof) | Slots are scarce (stats); a parked arm is as good a ticket as a salt (bestof) | Both true: it costs nothing to redraw a parked arm *instead of a filler salt* | **Parked arms take filler slots only**, alternating with stack salts. Worth +0.00 to +0.03. [A] |
| 8 | P0: V4 s0 must re-score 5.15 on new code (stats) | Proves portability | V4 is no longer the leader or the nominated entry | **Accept, but use KS s0 (must be 5.19) on the configuration every arm will ship with.** One slot proves the port and the ride-alongs together. |
| 9 | The one-volley guard almost never binds at 70% (engage) | Needs 3-4 lasers at once | Sim-based | **Accept [S, A]: h70 and h70g would be near-copies. Draw one of them (h70g), not both.** Saves one or two slots. |
| 10 | Every practice effect of the risk schedule is below one draw's sd (risk) | Author's own estimate | none | **One slot at most, after the R5 arms.** [A] |
| 11 | Final-only fixes have zero practice value (stress, psych) | Squad matches end before 161 s | none | **Never a scored arm. They ride on the final code and are proven by the port's exact re-score.** [S] |
| 12 | A paired same-salt draw reads a rarely acting preset at sd 0.05-0.15 (stats) | Common random numbers | The pair is 80% a copy: a weak ticket | **Use only for identity and harm screens** (ID slot, HF, ZE). [A] |

## Step 3. The reconciled plan

### 3.1 What the two analyses agree and disagree on

They agree on the order: behaviour-level arms, then second draws, then salts; fresh salt every time; never promote on
a single high draw; commit at the end. They differ in four places, settled as follows.

| Point | stats | bestof | Reconciled |
|---|---|---|---|
| Sigma | 0.17 | 0.24 | Plan at 0.20; every threshold is stated in sigma units and is recomputed once KS s1-s5 are in |
| What an adopted arm becomes | joins the stack (effects add) | a separate arm, promoted on shrunk mean | **Stack.** It is the only route to +0.3; guard it with the revert rule |
| Leader salts | fillers only | at least 2 per hour | Fillers, plus the first 2 draws of every new stack |
| Parked arms | dropped | back of the queue | Filler slots only |

### 3.2 The slot picker (one rule for every slot, 22:25 to 13:15)

b = posterior mean of the current base. Until a stack is adopted: b = (4 x 5.00 + sum of all KS draws) / (4 + n);
with only KS s0 that is 5.04. After a stack change, b restarts from the old b plus 0.3 x the adopted arm's d, with
the same weight-4 prior. s = sigma (0.20 until re-measured).

Take the first line that applies:

1. **Identity slot** — once per new code generation: KS s0's SELECT and salt on the new code. Must equal 5.19.
2. **First draw of a newly gated behaviour arm** on the current stack, fresh salt. At most 4 per window.
3. **Second draw** of an arm whose first draw was >= b - 0.25 s (that is b - 0.05). Best first draw first.
4. **Stack salt** if the current stack has fewer than 2 draws.
5. **Parked arm** (first draw between b - 1.25 s and b - 0.25 s), second draw — on alternate filler slots.
6. **Fresh stack salt.**

Never: an identical build and salt; a solo draw of a ride-along (IO, RB, LX if the engineer shows it acts in under
10% of matches); a knob flip that changes no decision in the sim; both of two presets that the sim shows identical.

### 3.3 Promotion, drop, switch

- **Drop:** first draw <= b - 1.25 s (5.04 - 0.25 = 4.79 today). After two draws: mean < b.
- **Adopt into the stack:** two-draw mean >= b. For an item that also changes free-for-all play: >= b + 0.05.
- **Mutually exclusive values** (`aggr` any70 / h70g): the higher two-draw mean wins, and only if >= b.
- **Revert:** a new stack whose first 4 draws average <= (old b) - 0.5 s (0.10) goes back to the previous stack.
- **Leader switch** (the base for new arms): the stack itself; it changes only by adoption or revert. A high single
  draw changes the board, not the base.
- **KB now:** two draws due. Mean >= b: KB is STACK1's base. Mean in [b - 0.10, b): one more draw (KB s2 is pushed).
  Lower: drop any70; h70g still gets its own draw.

### 3.4 Slots 22:25-03:00 UTC

Windows open on the rolling hour. "R" = the picker of 3.2. Fallback for any slot whose build is not gated: R.
Salts: one campaign counter; KS has used 0-7, so new arms start at salt 8.

| Window | Slot | Build | Purpose |
|---|---|---|---|
| **W1 22:25** | 1 | **ID**: KS s0 on the R7 code with RB on and io all (IO7, IO8 in), new presets off | must be exactly 5.19; if not, slot 2 = the same with io at its old value |
| | 2 | **h70g** on KS (s8) | the doctrine with the one-volley rail |
| | 3 | **FIN** on KS (s9) | top-ranked R5 arm (game, psych) |
| | 4 | **ISO** on KS (s10) | defeat in detail (exploit ranks it first) |
| | 5 | **LX** on KS (s11) — or R if LX acts in < 10% of sim matches (then it rides) | bug fix |
| | 6 | R (expected: KB s2 or the 2nd draw of the best of slots 2-4) | |
| **W2 23:25** | 1-2 | second draws of W1 arms with first draw >= b - 0.05, best first | adopt or drop |
| | 3 | **LG** on the base (s) | laser grab |
| | 4 | **LC** on the base (s), keeping its < 25% clause | lose cover |
| | 5 | **STACK1** = KS + aggr winner + adopted W1 arms + ride-alongs (fresh s) | first stack draw |
| | 6 | R | |
| **W3 00:25** | 1 | **AVO** on STACK1, priors at the house values (laser +35) | |
| | 2-3 | second draws (LG, LC, any W1 leftover) | |
| | 4 | STACK1 second draw, or STACK2 if W2 adopted anything | stack mean |
| | 5 | `h50CrowdR` 60 -> 120 on the stack (one number, no code) | engage memo item 6 |
| | 6 | R | |
| **W4 01:25** | 1-2 | next gated arms in the engineer's order (HN heal need; PRE) | |
| | 3 | AVO second draw if earned, else R | |
| | 4-5 | newest stack, fresh salts | stack mean, revert check |
| | 6 | R | |
| **W5 02:25** | 1 | `risk late` — the only slot the risk schedule gets | |
| | 2 | `calm: 'rear'` (15 min of code) if built | |
| | 3-4 | R | |
| | (5-6, after 03:00) | R | |

**03:00 checkpoint (5 minutes, no slot):** refit; write down b, sigma, the stack, the board's 32nd. Then one of:
- stack mean >= 5.20: carry on with the same picker;
- stack mean < 5.10 and no arm adopted: the preset route has failed. Ask the panel for one structural arm and put
  every filler slot on the widest untested behaviour arm, not on salts;
- best draw already above the 32nd + 0.1: port it at once (3.5).

### 3.5 Final-entry nomination

1. Whenever a draw becomes our best, the owner enters it (as done for KS 5.19).
2. **Port** as soon as our best clears the *current* cut, and again whenever the best changes: same SELECT and salt
   on the newest final-safe code (FFA posture, ZG1/ZG2, HB1). It must re-score exactly. One slot each.
3. At 15:20-15:40 Sunday, margin = max(1/48, the 32nd's rise over the last 2 hours):
   - among our entries scoring above the 32nd + margin, nominate the one on the newest final code; ties to the earliest;
   - a port scoring exactly the cut + 1/48 is not safe (ties go to the earlier team): then nominate the original;
   - if nothing clears: leave our best nominated.
4. Engineer's check before any aggr build is nominated: `aggr` must be inert once the bot latches free-for-all.

### 3.6 After 03:00 and the last two hours

- **03:00-09:00:** same picker. New code stops at 09:00.
- **09:00-11:00:** preset combinations and second draws only; no new code.
- **11:00-13:15:** fresh salts, split 4 / 2 between the two stacks with the highest posterior mean that have >= 4
  draws. 12:30: everything is drawn on the final code. 12:44: port of the best draw.
- **13:15-15:15 (12 slots):** all on the single highest posterior mean, fresh salts, final code. No new arm, no
  second draws. One exception: if our best is still under the cut and a second stack has fewer than 4 draws and a
  posterior mean within 0.05 of the leader, give it 4 of the 12 (its predictive spread is wider).
- If at 09:00 the cut is at or below 5.6 and our best stack mean is >= 5.2, commit four hours early (from 11:15).

### 3.7 P(best > cut) under this plan (`plan_sim.py`, 1500 runs per cell, strictly above, 1/48 grid)

Model: KS true mean N(5.03, 0.08); 19 arms arriving from 22:25 at the engineer's order, then one per 40 minutes to
09:00; effects add (or 60%); 5 KS salts and 2 KB draws counted before 22:25. Each cell is cut 5.5 / 5.6 / 5.8.

At the close (15:15), sigma 0.20:

| World (arm effect) | Salts only | stats' R5 rules | This plan | This plan, effects 60% additive |
|---|---|---|---|---|
| no-ops, tau 0.03 | 0.59 / 0.29 / 0.03 | 0.67 / 0.40 / 0.05 | 0.68 / 0.42 / 0.06 | 0.63 / 0.34 / 0.03 |
| fit's tau 0.06, mean 0 | 0.59 / 0.29 / 0.03 | 0.82 / 0.63 / 0.22 | **0.83 / 0.66 / 0.25** | 0.72 / 0.49 / 0.08 |
| mean +0.02, tau 0.06 | same | 0.94 / 0.85 / 0.50 | 0.96 / 0.89 / 0.57 | 0.87 / 0.70 / 0.23 |
| mean -0.02, tau 0.06 | same | 0.62 / 0.42 / 0.08 | 0.62 / 0.41 / 0.08 | 0.54 / 0.29 / 0.03 |
| behaviour arms, mean -0.03, tau 0.15 | same | 0.95 / 0.90 / 0.71 | 0.95 / 0.91 / 0.74 | 0.83 / 0.70 / 0.36 |
| behaviour arms, mean -0.10, tau 0.15 | same | 0.74 / 0.59 / 0.25 | 0.72 / 0.57 / 0.26 | 0.54 / 0.35 / 0.07 |

Same plan, fit's-tau world, other sigmas: 0.17 -> 0.73 / 0.55 / 0.19; 0.24 -> 0.91 / 0.82 / 0.39.

By 03:00 (28 slots), sigma 0.20: fit's tau 0.48 / 0.27 / 0.05; no-ops 0.35 / 0.17 / 0.01; behaviour arms neutral
0.71 / 0.58 / 0.28; salts only 0.30 / 0.14 / 0.01. Every arm one hour late: 0.45 / 0.25 / 0.02 at 03:00 and
0.82 / 0.65 / 0.24 at the close — a late engineer costs little as long as the arms come.

**My one-line estimate** (weighting the fit's-tau and slightly-harmful worlds, 60-100% additivity, sigma 0.17-0.20):
P(best > 5.5) about 0.65, P(> 5.6) about 0.45, P(> 5.8) about 0.12 at the close; 0.40 / 0.20 / 0.03 by 03:00.
These are upper-leaning: they assume every slot is used and that about 19 arms are built.

## Step 4. Recommendations, ranked

1. **Run the slot picker of 3.2 with the adopt / drop / revert rules of 3.3.**
   - Site: submissions only (`SELECT` in `bot/lib/params.js`, `PARAMS.salt`). No bot code.
   - Expected: P(> 5.6) at the close 0.66 against 0.29 for salts (range 0.29-0.91 over the worlds). 0 engineering
     minutes; 5 minutes of bookkeeping per window (`fit.py` on `draws.csv`).
   - Failure mode: effects do not add, or arms hurt on average; then it equals or trails salts by up to 0.11.
   - Test: the revert rule is the test (4 draws of each new stack).
2. **ID slot first in W1: KS s0's SELECT and salt on the R7 code with RB on and io all.**
   - Expected: no score; it makes every older draw portable and clears the ride-alongs in one slot.
   - 0 extra minutes (the engineer already records identity). Failure: score differs; then slot 2 repeats with io at
     the old value, and io becomes an ordinary arm.
   - Test: W1 slot 1, salt 0, must read 5.19.
3. **One aggr draw, not three: h70g on KS (W1 slot 2, salt 8); skip plain h70 unless the sim shows the guard binds in
   more than 10% of matches.** KB (any70) is decided on its two draws already pushed.
   - Expected: saves 1-2 slots; the doctrine arm itself is the widest ticket we have (+0.05, -0.20..+0.30). [A, N]
   - Failure: h70 and h70g differ more than the engage memo says. Check: engineer's same-salt divergence count, 2 min.
4. **Measure sigma from KS s0-s7 before W2 and rescale the thresholds.**
   - Change: s = sd of the KS draws (7 df with s6, s7). Offsets are 0.25 s (second draw), 1.25 s (drop), 0.5 s (revert).
   - Expected: no direct points; it tells us whether filler salts are worth 0.11 or 0.63 at a 5.6 cut, hence how hard
     to press the engineer for arms against simply drawing.
   - Slots: the KS salts already pushed (commits above).
5. **Port on first clearance, not at 12:44 only.**
   - Change: when our best first exceeds the current 32nd, spend one slot on the same SELECT and salt on the newest
     final-safe code; repeat when the best changes or the final code changes.
   - Expected: 0 practice points; it secures the final-only fixes (psych F1 +0.1..+0.5 per final match, stress ZG1
     +0.02..+0.05 [A]) in the nominated commit and takes the earliest possible timestamp.
   - Failure: the port does not re-score exactly; then the identity gate has a hole and we learn it early.

## Step 5. Self-critique

- **What would make recommendation 1 wrong:** arms are harmful on average (mean <= -0.05) *and* effects do not add.
  Then stacking walks the base downhill on lucky draws. The cheapest detector is already in the plan: the first two
  stacks' 4-draw means against the KS mean. If both are below b - 0.10, stop stacking and draw arms singly on KS.
- **Sigma is the hinge for the fallback, not for the plan.** At 0.24 salts alone give 0.63 at a 5.6 cut; at 0.17,
  0.11. The KS salts being drawn now decide it at no extra cost.
- **The cut is the weakest number.** At 5.8 no world short of "behaviour arms with tau 0.15" gives better than 0.25.
  If the board's 32nd passes 5.6 before 09:00, the knob-level queue is worthless and only a structural arm matters.
- **My simulation shares the stats model's optimism:** about 19 arms built, all slots used, independent draws. With
  10 arms the close numbers fall by roughly a quarter (I did not run that cell).
- **Adoption at a two-draw mean >= b is a coin flip for a zero arm.** That is intended (the selection gain comes
  from the positive tail), but it means the stack's name will change often; the bookkeeping must be exact.

## Summary for the moderator

1. **Ready hashes (no R7 build is pushed yet; full hashes in the first table):** KB s0 8428d2e3, KB s1 d4518215,
   KS s1 5898265c, s2 692325a0, s3 82aaa51e, s4 dc2ceddd, s5 03d0b946. Fillers: KB s2 0ba2c485, KB s3 d7d88e24,
   KS s6 0f82fa86, KS s7 cb77a26a. Last: K0 s1 d8f6e646, S s2 c4f015f9.
2. **Objective:** one draw strictly above the 32nd at Sun 16:00 on the nominated commit. Refit (16 draws): KS mean
   5.05 +- 0.11, sigma 0.16-0.20. Needed mean about 5.3 (cut 5.6) or 5.45 (cut 5.8). 28 slots to 03:00, 101 to 15:15.
3. **Reconciliation:** both want behaviour arms, then second draws, then salts. Settled: sigma 0.20; adopted arms
   stack; no leader-salt floor (each new stack gets 2 draws instead); parked arms take filler slots only.
4. **Slot picker, every slot to 13:15:** (1) identity slot per code generation; (2) first draw of a gated behaviour
   arm, max 4 per window; (3) second draw if the first was >= b - 0.05; (4) stack salt if the stack has < 2 draws;
   (5) parked arm on alternate fillers; (6) fresh stack salt. b = (4 x 5.00 + sum of base draws) / (4 + n) = 5.04 now.
5. **Rules:** drop at first draw <= b - 0.25 or two-draw mean < b; adopt at two-draw mean >= b (b + 0.05 if it changes
   free-for-all play); revert a stack whose first 4 draws average <= old b - 0.10; never switch on one draw.
6. **22:25-03:00:** W1 ID (KS s0 on R7 code, must read 5.19), h70g, FIN, ISO, LX, R | W2 two 2nd draws, LG, LC,
   STACK1, R | W3 AVO, two 2nd draws, stack, h50CrowdR 120, R | W4 HN, PRE, AVO 2nd, stack x2, R | W5 risk late
   (its only slot), calm rear, R, R. R = the picker. 03:00: refit; port if the best is above the 32nd + 0.1.
7. **Nomination:** enter every new best; port it (same SELECT and salt on the newest final-safe code, exact re-score)
   on first clearance; at 15:20 nominate the newest-code entry above the 32nd + max(1/48, its 2-hour rise).
8. **Last two hours (13:15-15:15):** 12 fresh salts of the single highest posterior-mean stack, final code. New code
   stops 09:00; 11:00-13:15 salts split 4 / 2 over the top two stacks.
9. **P(best > 5.5 / 5.6 / 5.8) at the close, sigma 0.20:** 0.83 / 0.66 / 0.25 (fit's tau); 0.68 / 0.42 / 0.06 (arms
   are no-ops); 0.62 / 0.41 / 0.08 (slightly harmful); salts only 0.59 / 0.29 / 0.03. By 03:00: 0.48 / 0.27 / 0.05.
   My weighted estimate at the close: about 0.65 / 0.45 / 0.12.
10. **Savings and risk:** draw h70g only, not h70 too (the guard rarely binds). The plan trails salts by up to 0.11
    if arms hurt and effects do not add; the 4-draw stack check catches it.
11. **Asks:** engineer — proof that `aggr` is inert after the free-for-all latch. Owner — KS s1-s5 and KB scores.

Memo: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r2_decision.md
