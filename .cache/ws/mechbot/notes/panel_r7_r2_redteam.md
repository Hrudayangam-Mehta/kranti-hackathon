# Panel R7, round 2: red-team skeptic (role `redteam`)

Written Sat 21 Nov, 21:47-22:10 UTC. Read: the brief, the moderator's digest, all five round-1 memos (game, stats, eng,
psych, stress; stress appeared at 21:48 and is folded in), the four research memos, submissions.md, build_r7a_log.md,
build_spec_r5.md sections 1 and 3, and the KB source (`variants6/KB_s0/bot/lib`: params.js, tactics.js `selectTarget`,
hunt.js, stance.js). Scratch: `tools/panel_r7/r2_redteam/` (override files, sim outputs). Simulator: 3.5 CPU-minutes
on core 2, behaviour only. No sub-agents, no web search (nothing here needed a paper). No edits elsewhere.
Tags: [M] official, [T] top bot, [S] simulator, [A] arithmetic/model, [N] no evidence, [C] read in our code.

## Step 1. The objective in numbers

- Best 5.19 (KS, 249/48). The cut is about 5.4 now and 5.6-5.8 at close. **We are not in the top 32 today.**
- One score step is 1/48 = 0.021. We need one draw at the cut + 0.02 or better before Sun 15:15 UTC: about 17 h,
  about 104 slots.
- The leader family's true mean is about 5.0 with a per-draw sd of 0.17-0.24 [M, A]. Best of 100 draws is about 5.5.
  A cut of 5.6 needs a true mean of about 5.3; a cut of 5.8 needs about 5.5. So we need **+0.3 to +0.5 of true mean**.
- Only the best draw counts, so a bad draw costs one slot and nothing else. The real costs are (a) slots and engineer
  minutes spent on arms that cannot move the mean, and (b) a harmful arm adopted into the stack after a lucky draw.
- The final is a 16-mech free-for-all on new seeds. It only matters if a nominated entry clears the cut, and that
  entry's code plays the final as it is.

## Step 2. Claims checked (steelman, attack, verdict)

| # | Claim (source) | Steelman | Attack | Verdict |
|---|---|---|---|---|
| 1 | KB "changes play" and is the doctrine gate (submissions: sim 8 seeds 4.00 vs 3.63) | `unengagedS 0` makes every listed mech a candidate at hp >= 70% [C] | 60 seeds, same seeds as the stress sweep: KB 3.72 vs KS 3.68, **51 of 60 matches have the same score**, paired +0.03 +- 0.14 [S]. The `engaged()` and band clauses already admit almost everyone. The preset also raises `h50SeekHpf` 0.6 -> 0.7, so seeking starts later, not earlier [C] | KB is a KS salt with a different name. Expected 0 (-0.15..+0.15). The 8-seed gap was noise |
| 2 | "Fighting early is worth +0.38" (brief) | Same sign as two other teams' results | It is V1 4.98 vs V2 4.60: one pair, 1.1-1.6 sd [M]. The stats fit puts every item within +-0.06 | Unproven. Do not build on it as a measured effect |
| 3 | "Heal breaks +0.17" | V4 5.15 was the best for hours | One draw; V4's three salts average 4.97; pooled 0.00 +- 0.28 [M] | Noise |
| 4 | "KS is the best build" | 5.19 is the top score | One draw. Seek family (S 5.13, S s1 4.92, KS 5.19) 5.08 vs no-seek (V4 x3, K0) 4.99: +0.10 +- 0.16 [M] | Leader by luck; fine as the base, nothing more |
| 5 | Kiting veto from H 4.98 / HL 4.73 (engage) | Other teams lost 0.6-0.94 on cover cycles [M] | Ours is one draw each | Veto stands on the other teams' results, not on ours |
| 6 | The 70% entry gate (engage: entry 80-100% hp gives 2.43 kills, 60-80% gives 1.78) | Lanchester cost is real | Simulator only, and entry hp is confounded with the fight number and the attacker count [S] | A model, not a measurement. The gate is already in KS (claim 1), so nothing to draw |
| 7 | "ISO first: defeat in detail" (exploit) | One line at a time is cheaper [A] | The preset does the opposite of its name: it allows the isolating walk only within 12 m with `xOther === 0`, otherwise stand-off [spec 3.1]. Its own evidence is that isolating legs cost more (73 vs 42 hp/s) [S] | The ranking rests on a misreading. ISO is "isolate less". Expected +0.03 (-0.10..+0.15) |
| 8 | "AVO on KS" (engage, slot order) | Smith ratio is the best scripted target rule | `focus: 'av'` sets `focusAdd: true`, so on KS it also swaps `mult` back to `add` [spec 3.2]. Two changes in one draw; the laser prior is +78 against a measured +35; re-ordering every 0.3 s works against "no switch before the kill" | Not drawable as specified. See arm table |
| 9 | LX +0.03 (eng) | A one-tick dip ending a retreat is a real bug; flip counts are behaviour, which the simulator can show | The sign of the score effect is from the simulator only. It lengthens retreats, and leaving fights early has cost points officially (A25, A06, no-retreat bundles apart) | Fine as one draw. Do not fold into the base before two draws |
| 10 | Final-only FFA items pay (psych F1 +0.1..+0.5; risk `risk ffa`) | Placement scoring rewards waiting | No official evidence exists for any FFA posture [N]. With the latch disabled, KS in the simulator's FFA scored **+1.33 +- 0.40 places over latched KS** (48 seeds, 26 better, 6 worse) [S] | The FFA posture is unvalidated and the only reading we have goes against it. Add no FFA strategy code. See R4 |
| 11 | Stress F7: the latch may never fire in a slow final | Correct [C]: 3 foreign deaths before 200 s, `beamClue` off | Per claim 10 the unlatched bot did not do worse [S] | Not a harm we can show. No fallback latch |
| 12 | Simulator as evidence in round 1 (game memo's arc, stats' reward table) | Structural facts follow from the rules (house bots never fight each other) | Stress sweep: V4 4.53 vs KS 3.68 over 60 seeds [S] while officially KS >= V4. Other teams report five more wrong signs (measured_deltas V01-V05) | Use the arc for "where we die". Use no simulator number to pick or rank an arm |

Two outside results bear directly on our queue [M, other teams, one draw each]: "fight every visible hunter" lost 0.18
(simulator said +1.2), and a no-retreat bundle lost 0.41 (simulator said +0.25). The first is KB's idea; the second is
LC's.

## Step 3. How each arm loses points, ranked by expected harm

Harm = slots and minutes wasted, plus the chance of adopting a negative arm. Ranges are on the official mean.

| Rank | Arm | Most likely loss in practice | Loss in the final | Expected | Cheap guard or test | Draw? |
|---|---|---|---|---|---|---|
| 1 | **LC** `loseCover: near` | Cancels the LOSING retreat when cover is more than 1.5 s away. We die in a 3-attacker fight entered at 44-64% hp [S]; LC keeps us in it. Same idea as the no-retreat bundle (-0.41 [M]) and A05 (-0.41 [M]). Third edit to `losing()` after FIN and LX | Inert after the latch; live before it | -0.05 (-0.40..+0.15) | Keep the `< 25%` clause. Never stack with FIN and LX unmeasured | One draw at most, last in the queue |
| 2 | **LG** `laserGrab: wide` | Switches off the `engaged()` clause for non-hostile mechs until t = 90 s while a laser is within 200 m of path. We die at about 70-100 s, so that is most of the match. Our laser-first walks lost 0.06-0.11 [M] | Same before the latch | -0.05 (-0.40..+0.30) | Count in the simulator how many decisions have the clause suppressed; if over 30% of pre-death time, cap at t < 45 s | One draw (wide spread is a fair ticket) |
| 3 | **AVO** `focus: av` | Confounded with `mult -> add` on KS; enumerates up to 120 orders x 5 steps per re-order on one CPU; switches targets | Inert after the latch | 0 (-0.20..+0.12) | Add `avm: { focusAdd: false, focusAv: true }` or draw it on a V4-type base; fix the laser prior to +35 first | Not as specified |
| 4 | **IO-A** timing in "every build" | It changes every decision, so the base stops being KS. Any later arm is then read against an unmeasured base | Unknown | 0 (-0.10..+0.10) | Keep it a default-off preset; draw it as an arm | As an arm, never silently |
| 5 | **KB** `any70` | Same play as KS in 85% of matches [S]. When it differs it opens on a calm mech and adds a line. No hysteresis at 70% | The any70 clause has no foreign-death firewall (seek has one) [C]; no difference seen in 16 FFA seeds [S] | 0 (-0.15..+0.15) | Read tonight's draw as a KS salt | Already drawn; second draw only at >= 4.95 |
| 6 | **h70 / h70g** | h70 sits between KS and KB, which are already the same. The one-volley guard needs 3-4 lasers at once at 70% hp, so it never binds [A, engage] | h70g is a rail for the final | 0 +- 0.02 | None needed | **No arm slots.** Ship the guard in the base if identity holds |
| 7 | **FIN** `finish: ttk` | An optimistic TTK' keeps us in a multi-line fight for a kill that does not come (target regains cover, hit rate below q). It also turns off the after-lose heal entry | Inert after the latch | +0.05 (-0.10..+0.20) | In 20 sim matches count deaths within 3 s of an armed near-kill; if more than 2, set `finTtkS` 3.0 -> 2.0 | Yes, first |
| 8 | **ISO** `isolate: near` | Mislabelled (claim 7): fewer isolating walks. If isolation was paying, this loses it | Inert after the latch | +0.03 (-0.10..+0.15) | Report share of fight time in 'isolate' legs before and after | Yes, one draw |
| 9 | **LX** `loseExit: on` | One more second of retreat per episode | Inert | +0.02 (-0.08..+0.10) | Identity at 'off' is done (24/24) | Yes, one draw |
| 10 | **RB2-RB6, IO7, IO8** | Should be identical on the practice config (12/14 streams identical, the other two by design) [S] | Protective | 0 | The P0 identity slot (R1) | In the base after P0 |

Arms that should not be drawn at all: **h70, h70g** as arms; **AVO as specified**; **ZE zoneEsc** and the zone goal
fixes (practice never reaches the late zone: longest sim life 161 s, 0 zone deaths [S]); **`risk late` / `risk sched`**
(60-90 minutes for an effect its own author puts below one draw's sd); **PRE** tonight (60-90 minutes for
+0.03..+0.10); and the literal second half of the doctrine as a new arm, "below 70% leave and heal" (`heal need/full`):
hunters share vision and never retreat [R, psych], so leaving a fight means taking fire without returning it, and
leaving at high hp is the best-documented way to lose points here. KS already heals between fights (`retreat: d3`,
`healExit: 70`); that is the doctrine as far as the evidence supports it.

## Step 4. Recommendations, ranked

**R1. P0 identity slot on the first R7 build: KS salt 0 must score exactly 5.19.**
- Site: the first bundle with RB2-RB6 + IO7 + IO8 and every new preset off; SELECT and salt as commit 3c4ca69.
- Change: none intended. (The stats memo says V4 s0 = 5.15; the leader is now KS, so use KS.)
- Delta: 0. It protects every later reading; a miss also tells us that skipped observations happen officially (IO8).
- Minutes: 0 extra. Failure mode: a mismatch that is only server noise, if identical builds do not repeat exactly;
  the bestof memo says they do [M?]. Check that claim against two past identical submissions if any exist.
- Test: first slot of the first R7 batch.

**R2. Spend slots only where the mean can move: FIN, then ISO, LX, LG, one draw each on KS; fillers are KS salts.**
- Sites: `finish: 'ttk'`, `isolate: 'near'`, `loseExit: 'on'`, `laserGrab: 'wide'`.
- Rule (bestof): first draw >= 4.95 earns a second; < 4.75 dropped; adopt only on 3 draws with a shrunk mean +0.05.
- Delta: each within +-0.2; the value is the chance that one is +0.2 or more. Minutes: as queued.
- Failure mode: adopting on one lucky draw. A -0.10 arm passes the 4.95 screen 40% of the time and the 3-draw rule
  10% of the time [A].
- Test: slots 2-5 of the first R7 batch, fresh salts from one counter.

**R3. Fix or drop the confounded and empty arms before they take slots.**
- AVO: add `avm` (`focusAdd: false, focusAv: true`) in params.js, or drop AVO; laser prior +35. 10 minutes.
- h70, h70g: no arm draws. LC: last, once, with the `< 25%` clause. IO-A: preset, not base.
- Delta: saves 3-5 slots and about an hour of engineering. Failure mode: one of them was the +0.3 arm; I put that
  under 5% each because three of them change almost no decision.

**R4. Final: add no FFA strategy code; ship only the stress memo's ZG1 (unreachable late-zone goal) behind its preset.**
- Site: `mover.js zoneGoal()`; preset `zoneGoalFix: off -> on`; no practice slot (identity on the squad streams).
- Why: ZG1 is a reproduced bug (2 of 72 late starts die in the zone at full hp [S]); every other final item is [A] or
  [N], and claim 10 goes against the FFA posture itself.
- Delta: +0.02..+0.05 places per final match [A]. Minutes: 25. Failure mode: a wrong fallback cell in the late zone;
  test with the two seeds the stress memo names (3009, 5022).

**R5. One question to the owner instead of more arms: the queue cannot supply +0.3.**
- The round-1 memos put every queued arm at +-0.1, and KB at 0. The stats and bestof memos say only a behaviour-level
  change carries +0.3. The game memo names where the points are: the fight after the third kill (3.1 attackers) and
  gun-only play to the third kill [S].
- Proposal for round 3: the panel names one such change and the engineer builds it after FIN and LX, instead of
  LC, AVO, h70 and h70g. I do not have the evidence to pick it.

## Step 5. Self-critique

- R1 is wrong if identical submissions do not repeat exactly; then the slot shows nothing. Cheapest check: ask the
  owner whether any identical hash was ever submitted twice, or accept one slot to learn it.
- My "KB is a no-op" rests on the simulator's count of identical matches (behaviour, not rank). Tonight's KB draw
  settles it at no cost: it is already submitted.
- Claim 10 is the simulator against its own house FFA bots, which are not the finalists. It supports "do not add FFA
  code", not "turn the FFA posture off". I do not recommend forcing `env: 'squad'` on that evidence.
- The harm ranking of LC and LG leans on other teams' single draws.

## Ready hashes (owner's question, from submissions.md; no R7 build is pushed yet)

The engineer is at checkpoint 01 (robustness items); nothing new is gated or pushed. Pushed, gated and not yet scored:

| build | commit |
|---|---|
| KB (any70) salt 0 | 8428d2e3a17b6e79f26a3308a61918b0bdf46f1e |
| KB salt 1 | d4518215b1e51cfdc493c88227ee483f93e9e500 |
| KS salt 1 | 5898265c0b4fc41935c515aba851c7e695c4636a |
| KS salt 2 | 692325a02ff803829ac6615eedeaf5085bb1c1e5 |
| KS salt 3 | 82aaa51eb42092bcae2364924e98ccbc401e6ffd |
| KS salt 4 | dc2cedddd9f7a231388508f10013c6e786cb6689 |
| KS salt 5 | 03d0b946799d2d03bbff6c9f2bcb42362921831e |
| K0 salt 1 | d8f6e646146bd8bc613a4479303af186b6d913d2 |
| S salt 2 | c4f015f9441b128df34db0c83b61b7cc4c268871 |

Suggested order: KB s0, then the KS salts; KB s1 only if KB s0 is 4.95 or better; K0 s1 and S s2 last.

## Summary for the moderator

1. **Objective:** best 5.19, cut 5.4 now and 5.6-5.8 at close. We need +0.3 to +0.5 of true mean in about 104 slots.
   Bad draws cost only a slot; the real losses are wasted slots and minutes, and a bad arm adopted on a lucky draw.
2. **KB is a KS salt [S, C].** Over 60 seeds KB and KS score the same in 51 matches (paired +0.03 +- 0.14); the
   8-seed 4.00 vs 3.63 was noise. `any70` also moves seek from 60% to 70% hp. Read tonight's KB draw as a salt.
3. **Do not draw:** h70 and h70g as arms (between two near-identical builds; the guard never binds at 70%); AVO as
   specified (on KS it also swaps `mult` back to `add`; laser prior +78 vs measured +35); ZE and zone fixes in
   practice; `risk late/sched` and PRE tonight; a literal "below 70% leave and heal" arm.
4. **Highest expected harm:** LC (same idea as a no-retreat bundle that lost 0.41 officially; one draw at most, last)
   and LG (turns off early engagement until t = 90 s, most of our life; one draw). IO-A must stay a preset, not base.
5. **ISO is mislabelled:** it reduces isolating walks. The exploit memo's "ISO first" rests on reading it the other way.
6. **Draw order on the first R7 build:** P0 identity (KS salt 0 must re-score exactly 5.19), then FIN, ISO, LX, LG,
   one draw each; KS salts as fillers. Second draw at >= 4.95, drop at < 4.75, adopt only on 3 draws.
7. **One-draw claims that are noise:** fighting early +0.38 (one pair), heal breaks +0.17, KS over V4, seek (+0.10 +-
   0.16). **Simulator-only claims:** the 70% entry ledger, the reward table, LX's +0.03, the game arc's numbers.
8. **Final:** no FFA posture has any official evidence. In the simulator KS with the FFA latch disabled placed 1.33 +-
   0.40 better than latched KS (48 seeds, 26 better, 6 worse). Add no FFA strategy code and no fallback latch; ship
   only ZG1 (unreachable late-zone goal, 25 minutes, reproduced bug) behind its preset.
9. **New code fact:** the any70 clause has no foreign-death firewall, unlike seek; in a final it is live until the
   3-death latch. No harm showed in 16 FFA seeds.
10. **Question for round 3:** the queue is all +-0.1. Which single behaviour change in the fight after the third kill
    (3.1 attackers) or in gun-only play could be worth +0.3, and can it replace LC, AVO, h70 and h70g in the build?
11. **Ready hashes:** no R7 build is pushed. Unscored and gated: KB s0 8428d2e3a17b6e79f26a3308a61918b0bdf46f1e,
    KB s1 d4518215b1e51cfdc493c88227ee483f93e9e500, KS s1 5898265c0b4fc41935c515aba851c7e695c4636a,
    KS s2 692325a02ff803829ac6615eedeaf5085bb1c1e5, KS s3 82aaa51eb42092bcae2364924e98ccbc401e6ffd,
    KS s4 dc2cedddd9f7a231388508f10013c6e786cb6689, KS s5 03d0b946799d2d03bbff6c9f2bcb42362921831e,
    K0 s1 d8f6e646146bd8bc613a4479303af186b6d913d2, S s2 c4f015f9441b128df34db0c83b61b7cc4c268871.
