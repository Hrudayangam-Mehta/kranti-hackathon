# Panel R7, round 1: eng (Game AI engineer and code optimiser)

Tags as the brief: [M] official, [T] top bot, [S] our simulator (behaviour only, never a ranking), [A] arithmetic or model,
[N] no evidence. Everything below is about V4 (current `bot/`, SELECT + `retreat: 'd3'`).

## 0. Method

- **Instrumented copy.** `tools/panel_r7/eng/ibot/` is a copy of `bot/` with counters only, plus one candidate preset
  (LX, section 2). At their old values the 24 sim matches are identical to the plain copy: place, damage taken, shot
  count and frame count, 24 of 24.
- **Driver.** `tools/panel_r7/eng/drive.mjs` runs the simulator in-process on core 2, with V4 overrides
  `{"select":{"retreat":"d3"}}`, squad seeds 1-24. It records one frame per decision: mode, leg, target, the target's
  line, the gun state, fire, aim error, zone, decision ms, threat count and finishing.
- **Analysis scripts:** `analyze.mjs`, `shots.mjs` (shot classes), `pp.mjs` (ping-pong and unanswered attackers),
  `slow.mjs` (slow decisions).
- **Outputs:** `v4b.json` (base), `v4c.json` (with line instrumentation), `v4d.json` (LX off), `v4lx.json` (LX on),
  `v4fix.json` (gun-line hold).

## 1. Audit findings (V4, sim squad 1-24) [S]

| # | Failure mode | Measured | Verdict |
|---|---|---|---|
| F1 | Shots wasted into cover | 294 of 2452 gun shots (12%) end in a wall, but 291 of them hit a wall more than 8 m from the target. Only 3 hit near the target. These are misses flying on into the backdrop, not shots into cover. I tested the line the bullet really takes (predicted torso aim, from the body axis, barrel included): it was blocked 3 times in 24 matches, and the barrel was blocked 0 times. A hold on it (`gunLineFix`) changes nothing (2455 shots, 12.1%) | **No fix.** `muzzleClear` plus the ladder works. Veto any gate change sold as "shots into walls" |
| F2 | Mode oscillation | 37 A-B-A flips within 1 s per 24 matches. The costly kind is DISENGAGE>FIGHT>DISENGAGE (14). Every traced case is LOSING 1>0>1 on the same target with `quietS = 0`: we are still in the open | **Bug: item LX** (section 2) |
| F3 | Target flicker | FIGHT>HOLD>FIGHT 10 per 24 matches. The target leaves the candidate rules for 1-3 decisions (the band / `engaged()` line flickers) and the legs roam | Small cost, no item |
| F4 | Slow reaction to incoming damage | 135 new-attacker events. In 97 the attacker was already our target. Of the other 38, 16 were never fired at within 6 s: 5 while in FIGHT/grab, the rest in DISENGAGE / ZONE (by design). Under `focus: 'add'` (V4) the torso veto keeps the current target while we hit it in the last 2 s (`fcVetoHitS`), and `scanner.rearPick` is skipped (`if (B.scanner && !fa)`, tactics.js selectTarget). So **R2 rear-facing is off in V4** | Info for the targeting expert. It matters for LG (section 3) |
| F5 | Missed fire windows | FIGHT, gun ready, target listed with a line, in range: 81.9% of decisions fire. The largest single reason for not firing is the D2 long-flight gate (`flightGated` 358: flight over 0.55 s, i.e. 139-224 m, at a target unsteady for 0.6 s). Next is the torso turning more than 0.08 rad (167) | Left alone (D2 choice, no [M] against it) |
| F6 | Zone deaths | 0 s outside the zone, 0 zone deaths. The bot dies at a mean of 75 s in the sim, so late-zone code barely runs in squad | Not testable here. See ZE in section 3 |
| F7 | Stuck or looping paths | 0 episodes of 2 s or more with move > 0.5 and speed < 1 m/s. Per 24 matches: 9 abandons, 5 no-progress re-goals, 0 hops | Clean |
| F8 | Latency outliers | Over 18014 decisions: p50 0.1 ms, p99 8 ms, p999 15.6 ms. Worst 26 ms in one run, 57 ms in a second run of identical code, so core 2 is noisy (10 overruns past the 27.5 ms deadline, fuse 2). The top 60 slow decisions are A* calls in HOLD/roam (13), LOOT/loot (10), FIGHT/standoff (10) and FIGHT/grab (8), at `pathExpand` 25000. The fuse guards only posEval and the hide search, not A* | Watch item for LG and AVO (section 3). Adding a clock to A* breaks D10, so no item |
| F9 | 10-track line cap in `assess()` | Beyond trackList index 10, `losIn = listed` without a ray test. 0 occurrences in 24 squad matches | It can only bite with more than 10 nearer tracks (late FFA final). No practice value |
| F10 | Map and clock literals | `farmStopT` 210, `scanLateT` 240, `ffaLatchT` 200, `openFarmT` 75, `ffaQuietS` 90, `fpStartT` / `ffaFinalT` / `fpShootT`, warm-up `hopPlan(-307,106)` | Exactly the RB2 / RB6 list. `earlyOpenS`, `openingS` and `h50SeekFromS` stay as A2 says |

### F2 in detail: why LOSING flickers (tactics.js `losing()`)

- **The thresholds jump with the threat count n.** n = mechs with a line on us in the last 2 s that aim within 12° of
  us or hurt us within 3 s. The thresholds are:
  - n 3: 0.60 (+0.05 hysteresis while LOSING)
  - n 2: 0.50
  - n 1: 0.35
  - n 0: LOSING ends at once (`&& n > 0` in the early return)
- **n is noisy and the hysteresis does not cover a change in n.** n flickers as attackers' aim sweeps across the
  12° tolerance, and the 5-point hysteresis only applies while n stays the same. So after `loseMinS` (1.5 s), one
  decision with n one lower ends LOSING.
- **Then the bot walks back into the line.** The legs turn to standoff / isolate / regain for 0.1-0.7 s, the bot
  takes a burst, and LOSING starts again. Traced cases:
  - seed 8, t 57.1: n 2>1 at 55% hp. Out for 0.7 s, took 52 hp, back to DISENGAGE.
  - seed 3, t 46.1: n 3>2 at 58% hp. Took 45 hp.
  - seed 11, t 79.5: n 1>0 for one decision at 38% hp.
  - seed 8, t 81.6, the worst: at 112 hp (8%) a target switch made n = 0, and the bot stood in FIGHT/standoff in the
    open for 0.3 s.

## 2. New code item

### LX `loseExit: off -> on` (debounce the end of a LOSING retreat). My top item

- **Site:** tactics.js `losing()`.
  - Rename today's body to `losingRaw()`.
  - Add a 10-line wrapper (written and tested: `tools/panel_r7/eng/ibot/lib/tactics.js`).
  - New param `loseExitS`: 0 = off = today; `on` = 1.0.
- **Change:**
  - While LOSING, when the raw d3 predicate turns false, stay LOSING until it has been false for `loseExitS`
    without a break.
  - It never delays a finishing exit (`B.finishing`: target under 20% with at most 2 threats leaves at once, as today).
  - It is inert in FFA, with `pulseRetreat`, and under a hunt50 commit (those have their own exit rules).
  - The 1.5 s minimum stay, the hysteresis and every threshold are unchanged.
- **Measured [S], 24 paired seeds, same code:**

  | Metric | Off (today) | LX on |
  |---|---|---|
  | LOSING on-off-on within 2 s | 7 | 0 |
  | DISENGAGE>FIGHT>DISENGAGE | 14 | 5 |
  | DISENGAGE>HEAL | 6 | 12 (exits now go to cover heals, the owner's wish) |
  | Damage taken per match | 1967 | 1975 (flat) |
  | Unanswered new attackers | 16 | 20 (longer retreats) |

  Paired seeds: 3 better, 0 worse, 21 equal. Identity at off: 24 of 24.
- **Expected official delta:** +0.03 (-0.05..+0.10) [A]. That is about 0.6 dither exits per match, each costing about
  50 hp in the open plus a fresh retreat path, and the cost lands in the very fights we are losing. This is not
  visible at sd 0.24, so draw it as its own preset only if a slot is free. Otherwise ride it with the heal family.
- **Engineering:** 15 minutes (the code exists; params.js gets `loseExitS: 0` and
  `loseExit: { off: { loseExitS: 0 }, on: { loseExitS: 1.0 } }`).
- **Risk:** low. It only delays the end of a retreat by at most 1 s, adds no clock read and no loop. A2-style:
  `loseExitS` is a duration, not a match time, so nothing is scaled.
- **Tests:**
  - T1: at 54% hp, n 2>1 for one decision after `loseMinS` keeps DISENGAGE.
  - T2: raw false for 10 decisions gives FIGHT on the 11th.
  - T3: the target drops to 15% hp, so LOSING ends at once.
  - T4: FFA, `retreat: 'pulse'` and a hunt50 commit are identical to off.
  - T5: the 14 R3a2 streams and FFA-inert set are identical at off.
  - Sim smoke: on-off-on within 2 s = 0.
- **Interaction:** `heal: need / full` (R6a) start their after-lose window from `losingEndT`, which LX moves up to
  1 s later. Their "HEAL share" metric therefore rises with LX on its own (6 > 12 DISENGAGE>HEAL here). Gate R6a
  with LX both off and on.

### Considered and dropped
- `gunLineFix`: it held 3 shots in 24 matches (F1).
- Raising the line cap (F9): it never occurs.
- A sticky target for F3: about 0.4 flicker per match, and the legs cost only 0.1-0.7 s.

## 3. Review of the queued engineer items (implementation risk)

### Cheap and safe (build as specified)

- **IO8, more urgent than the spec says.**
  - stance.js `environment()` counts `foreignDeaths = max(prev, (alive0 - alive) - ourKills.size)`, and the
    count is sticky. A `kill` event lost in a skipped observation (bot.js `handle()` keeps only the newest obs) is
    therefore a phantom foreign death in **practice**.
  - One phantom death closes the R5/R6 firewall (`foreignDeaths < 1`) and swaps `earlyOpenS` (20 s) for
    `openingS` (40 s) for the rest of the match. Three phantom deaths latch FFA in a squad match.
  - Lost `damaged` events also blank `lastHurtT` and the dmg ring after a stall.
  - It is inert without a backlog. Keep it in the every-build set and add a test: two queued obs, the first
    holding `kill`, must give foreignDeaths 0.
- **IO7.** Today a fire-stage exception releases a charging laser (brain.js `stage('fire')` fallback sets fire false).
- **IO13, RB5, FIN, ISO, LC, ESC.** Local and preset-gated.

### Moderate (build, with these amendments)

- **RB2 `anchorToConfig`.**
  - Apply A1.
  - Also snap the factor to exactly 1 when |zone total - 415| < 0.5. A float sum such as 414.9999999 moves 210 to
    209.99999 and can flip one `t < farmStopT` decision, which breaks identity late in a stream.
  - If the schedule cannot be read, use factor 1.
- **RB3** (phases L-2 / L-3).
  - An off-by-one moves the whole late-zone logic and the R5 firewall.
  - Clamp `zoneLateR` to [40, 120] and `scanLateR` to [100, 220].
  - Unit-test 5-, 6- and 7-phase schedules.
- **RB6** (warm-up pocket). The warm-up brain is scratch, but **nav is shared**. Prove that `nav.hopPlan` keeps no
  cache keyed by the warm-up point, or include a pocket exit in the identity streams.
- **IO-A.** It changes the lead and release of every shot. Identity at `'v4'` needs streams with laser and mortar
  shots. It is fine as a ride-along.
- **AVO** (`focus: 'av'`).
  - Timing: up to 120 orders x 5 steps every 0.3 s.
  - Flicker: F3 shows that target flicker already costs HOLD legs. The keep rule must hold the current target while
    it is listed, not only "hit in the last 1 s".
  - Gate: worst decision within V4 + 3 ms, and switches per kill within V4 + 20%.
- **LG** (`laserGrab: 'wide'`).
  - FIGHT/grab is already where the slowest A* runs (F8) and where 5 of the 16 unanswered attackers happened (F4).
    Widening grabs to 130 m of path adds both.
  - Amendment: `grabLegs` yields when a mech other than the target hit us in the last 1 s (`B.topAttacker` not equal
    to `B.target`).
  - Gate: the worst decision.
- **HF / HN** (heal full / need).
  - Entry needs quietS of 1.5 s and no shot at us for 1.5 s. HEAL>FIGHT is urgent, and FIGHT>HEAL waits `modeHold`.
    That is fine.
  - Measure on top of LX, or with LX explicitly off (section 2).
- **ZE** (`zoneEsc: 'edge`), the main trap.
  - mover.js `zoneCheck()` sets `B.zoneUrgent = true` whenever `!me.inZone`, and ZONE is the top mode priority in
    `decideMode`. ZE must bypass `zoneUrgent` while its budget lasts, or it never runs.
  - `zoneLegs` also boosts whenever we are outside.
  - Zone damage restarts the 5 s regen clock (protocol section 7), so the "small damage" also cancels regen. Budget
    it as dps x t plus 5 s of lost regen (225 hp).
  - Test: outside at 20 dps with a losing fight inside, the mode stays DISENGAGE (not ZONE) for at most min(12, 240/dps) s.

### Vetoes

None of the queued items is vetoed. I veto:
- any gun-gate or flight-gate change justified by the 12% "wall" share (F1: those are misses, not cover);
- raising the 10-line cap (F9: it costs rays and never occurs in practice).

## Summary for the moderator
**Audit (V4, sim squad 1-24, core 2; behaviour only) [S].**
- Clean: 0 zone deaths, 0 stuck episodes of 2 s or more, the 10-line cap never hit.
- Shots into cover: 291 of the 294 "wall" shots are misses into the backdrop (the real bullet line was blocked 3 times).
- Fire windows: 82% fire; the rest is the D2 long-flight gate and torso slew.
- Latency: p99 8 ms, p999 16 ms. Outliers (26-57 ms, core noisy) are A* in roam / loot / grab, outside the fuse.
**Ranked proposals.**
1. **LX `loseExit: off -> on`** (tactics.js `losing()`): a bug fix as its own preset, old value = today. Code done in
   my folder.
   - Cause: one dip of the threat count n ends LOSING (thresholds jump 10-15 points per n; n = 0 exits at once).
   - Sim: on-off-on 7 > 0; DISENGAGE>FIGHT>DISENGAGE 14 > 5; damage flat; 3 better / 0 worse seeds; identity 24/24 at off.
   - Expected +0.03 (-0.05..+0.10); 15 minutes; low risk.
2. **IO8 in every build now.** A `kill` lost in a skipped obs counts as a foreign death in practice: one closes the
   R5/R6 firewall and the early opening, three latch FFA.
3. **Amendments:** RB2 snap factor to 1 near 415; RB3 clamp radii; RB6 prove no warm-up nav cache; LG yields grabs
   to a new attacker; AVO keeps a listed target; ZE must bypass `zoneUrgent` and budget the regen reset.
**Risk tiers.**
- Cheap and safe: IO7, IO8, IO13, RB1, RB5, FIN, ISO, LC, ESC.
- Moderate: RB2, RB3, RB6, IO-A, AVO, LG.
- Easiest to build wrong: ZE (today `!inZone` forces ZONE mode).
**Vetoes:** gate changes justified by "shots into walls"; raising the 10-line cap.
**Questions.**
- Targeting: under V4 `focus: 'add'`, R2 rear-facing is off. Intended?
- IO: do Bun's threads trip the `--cpus 1` CFS quota (the stalls behind IO8)?
- Rewards: what is one avoided 50 hp exposure worth?
