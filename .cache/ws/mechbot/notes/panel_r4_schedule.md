# Panel R4: submission schedule and experiment design (experiment designer)

Written Sat 21 Nov 2026, 19:00-19:35 UTC (revised at 19:15 for the V1-V4 results), by the experiment designer of panel R4 (Opus sub-agent). It supersedes
section 3-6 of `notes/submission_plan.md` (07:15 UTC) and the planned rows at the top of `notes/submissions.md`;
section 10 lists the corrections. Arithmetic: `tools/panel_r4/schedule_calc.py` (output `schedule_calc.out.txt`).
Decisions at window boundaries: `tools/panel_r4/decide.py` (`design` prints the factorial runs, `fit` fits all draws
in a CSV such as `tools/panel_r4/draws_example.csv`, `arm`, `qualify`, `sigma`).

Inputs read: HANDOFF.md, build_spec_r3a2.md, release_r3a2.md, checkR3a2.md, top5_synthesis.md, measured_deltas.md
(noise rows D01-D09, X01-X04), panel_r3_levers.md, panel_r4_past_events.md, rules_audit.md (L9, A9, A18, C19),
submission_plan.md, submissions.md, bot/lib/params.js (read only, to name presets), the leaderboard snapshots in
../web, and the Shopping Sessions README_track.md, OWNER_DECISIONS.md, log_build.md and verifier outputs (read
only). Nothing under bot/, sim/, intel/ or the shopping src_repo was edited; intel/ was not opened.

---

## 0. The plan on one page

Where we stand (19:15 UTC Sat): R3a2 scored V1 4.98, V2 4.60, V3 4.83, **V4 5.15** (18:44-18:59 UTC); our best is
5.15, the 32nd is about 5.4 now and projected at **5.80-5.92** at the close (section 1.3). A build mean near 5.0
cannot qualify by salts (P < 0.001 even with 60 draws). **State: BEHIND** (3.5). The job until about 11:00 Sun is to
raise the mean by 0.5 or more; salts come last.

Two goals, kept apart on purpose:
1. **Qualify**: at the close, the entry we pick must itself hold a practice score above the 32nd place.
2. **Win the final**: the picked entry must carry our best free-for-all (FFA) code. Practice points above the
   line are worth nothing there.

The design that serves both:
- **Every draw is a lottery ticket for goal 1, and the best one can be moved into the final code.** A build that
  differs from an earlier one only in FFA-only code and keeps the same presets and salt replays the same 48
  practice matches and must score exactly the same (determinism, D01-D03; our FFA items are inert in SQUAD,
  checkR3a2 section 2). So at the end we resubmit the single best draw's presets and salt on the final FFA code
  (a **port**, one slot) and pick that entry. Exploration slots therefore cost nothing for qualification.
- **FFA firewall**: every new practice item acts only in the SQUAD posture (and, preferably, only until the first
  death we did not cause). Then practice variants differ in a final only in its first seconds, and any of them is
  an acceptable final entry once ported.
- **Exploration beats salts until the end.** At a per-draw sd of 0.17, a one-change arm tested with 2 draws adds
  about +0.06 to the expected leader mean; 2 extra salts at 40 draws add +0.004 to the expected maximum.
- **The R3a2 items are tested together, not one at a time.** The four single draws cannot separate them: V1 - V2
  = +0.38 (fight early), V1 - V3 = +0.15 (boost), V1 - V4 = -0.17 (pulse retreat), each with sd 0.24; and
  solving the five draws (with 5.02) for the shared core (laser economy, focus, farm 50, speed third) gives
  -0.40 +- 0.48. A 16-run fractional factorial on the six uncertain items (P1 fixed on) measures every one of
  them to +-0.085 in the four windows before R4 is ready, at no build cost (SELECT-only variants).
- **Decisions only at window boundaries.** Each window's four Mech and two Shopping slots are fixed in advance on a
  slot sheet (section 8), so the owner never waits for an analysis inside a window.

### The next six hours (UTC; Mech windows open 60 min after the previous window's slots: about :44)

| Window | Mech Royale (4 slots, in this order) | Decision at the end of the window | Shopping Sessions (2 slots) |
|---|---|---|---|
| 19:44 | V4 s1 `a749e61c...`, V4 s2 `5b23b8f6...` (pushed), then F02, F03 (V4 s3, s4 if F02/F03 are not gated by 19:52) | sigma check from the V4 draws | S1 = M1 (correct build) as soon as its branch is pushed; S2 = fix, M2 if gated, else M1 re-time |
| 20:44 | F04, F05, F06, F07 | none (design runs) | code variant + knob / re-time |
| 21:44 | F08, F09, F10, F11 | after F08: interim resolution-III fit (warnings only) | same |
| 22:44 | F12, F13, F14, F15 | | same |
| 23:44 | F16; then P0 port check + H s0 (hunt50) if R4 is gated, else three L1 salts | full fit -> leader L1 (3.1); P0 verdict | same |
| 00:44 | H s1 (or s2), B s0, B s1 (bundle), L1 salt | hunt50 verdict; bundle screen | same |

If R4 is gated before 22:44, P0 and H take the first slots of the next window and the remaining factorial runs
move one window later; all 16 runs are always completed (the fold-over is what makes the main effects clean).

---

## 1. Numbers

### 1.1 Noise
- Identical deterministic code repeats exactly (D01-D03). Any behaviour change, a salt included, re-rolls all 48
  matches.
- Seven measured re-roll pairs (D04 0.06, D05 0.27, D06 0.02, D07 0.15, D08 0.33, F01 0.15, a kyoto neutral
  change 0.25): mean |d| 0.176, so **sd per draw = 0.16**; a team simulator gave 0.15 (D09). Plan with
  **sigma = 0.17**, and re-estimate it from our own same-build salts (`decide.py sigma`): if the sample sd of 4+
  same-build draws exceeds 0.22, multiply every threshold below by sd / 0.17.
- One match point is 1/48 = 0.021.

### 1.2 What a comparison resolves (sigma 0.17)

| Design | sd of the difference |
|---|---|
| 1 draw vs 1 draw | 0.24 |
| 2 vs 2 | 0.17 |
| 1 arm draw vs a leader known from 8 draws | 0.18 |
| 2 vs 8 | 0.13 |
| 3 vs 8 | 0.12 |
| 2^3 factorial, 8 cells x 1 draw: each main effect | 0.12 |
| 16-run 2^(6-2) factorial, 1 draw per run: each of six main effects | 0.085 |
| six items one at a time with 2 draws each (12 slots plus the base) | 0.17 |

Expected maximum of k draws above the build's mean: k = 4 +0.17, 8 +0.24, 16 +0.30, 32 +0.35, 64 +0.40 (range
x0.75-x1.3 for sigma 0.13-0.22).

### 1.3 The line
32nd place: 4.23 (04:25), 4.44 (05:19), 4.92 (07:17), 4.96 (07:51), 5.33 (16:37). Rise since 07:51: 0.042 per
hour and slowing. Saturating fits (asymptote 5.9-6.2) give **5.80-5.92 at 16:00 Sun**; a straight line gives
6.32 (not credible, the top is 6.31). Rule of thumb, refreshed at every board report:
`L32 at close = L32 now + 0.5 x (rise per hour over the last 6 h) x (hours to 16:00)`.

Chance that at least one of n draws clears the line (sigma 0.17):

| Build mean | line 5.80, n = 10 / 20 / 40 / 60 | line 5.90, n = 10 / 20 / 40 / 60 |
|---|---|---|
| 5.40 | 0.09 / 0.17 / 0.31 / 0.43 | 0.02 / 0.03 / 0.06 / 0.09 |
| 5.50 | 0.33 / 0.55 / 0.79 / 0.91 | 0.09 / 0.17 / 0.31 / 0.43 |
| 5.60 | 0.72 / 0.92 / 0.99 / 1.00 | 0.33 / 0.55 / 0.79 / 0.91 |
| 5.70 | 0.96 / 1.00 / 1.00 / 1.00 | 0.72 / 0.92 / 0.99 / 1.00 |

So a leader mean of about 5.6 plus the portable maximum of about 60 draws qualifies with high probability; at a
mean of 5.4 no number of salts does. Raising the mean is the job until 11:00 Sun.

### 1.4 Slots
- Mech Royale: 4 per rolling hour (the form shows when the next one frees up), one entry in the queue at a time,
  scoring p50 1.5 min, p95 4 min. From 19:00 Sat to 15:15 Sun: about 80 slots.
- Shopping Sessions: 2 per rolling hour, one entry at a time, p50 1 min, p95 2.6 min: about 40 slots.
- A window is the four (Mech) or two (Shopping) slots that free up 60 minutes after the previous ones were used;
  the Mech windows now open at about :44. Submit as soon as a slot frees up: equal scores
  rank the earlier entry first, on the board and in the final series.

---

## 2. Design principles

1. **Means decide, maxima qualify.** Arms are adopted on the mean of their draws against the leader's mean, never on
   a best draw (the best draw is biased upward). The board value of everything is the maximum draw, and that
   maximum is moved into the final code by a port (section 6).
2. **One change per arm, on the current leader** (the kyoto and giddy hill climb that produced 6.31 and 6.06). The
   one exception is the R3a2 factorial, which tests six items at once far more cheaply than one at a time (each
   effect at sd 0.085 from 15 new slots, against 0.17 from 12 one-at-a-time slots).
3. **Preset discipline.** Every change is a preset whose old value reproduces the previous build byte for byte, so
   every draw stays reproducible and portable.
4. **FFA firewall (an engineering requirement of this schedule).** A practice item is type S if it acts only in the
   SQUAD posture; preferred: only while no death we did not cause has been seen. Type B items (upgrade order,
   laser economy, focus, farm floor, aim calibration) act in both postures; an arm of type B also changes the
   final and needs a slightly higher bar (c + 0.05). R1 stealing has an FFA role (the loot-pile third party), so
   R1 off is tested with the existing `R1: 'off'` and, if adopted, shipped as a new practice-identical preset
   `R1: 'ffa'` (steal only in FFA).
   - Before gating on the first foreign death, measure its false-trigger rate in local squad matches. If one or more
     uncaused house deaths occur in more than 5% of them, gate on two deaths (another team's two-death detector
     fired in 4% of practice matches, X03).
5. **Fixed sheets.** Within a window the slots are fixed; branches are chosen at window boundaries. A rejected slot
   is replaced by its fix in the same window only if the fix is ready; otherwise the sheet continues.
6. **Never** resubmit an already-scored hash on Mech (an exact tie with ourselves, no information) except as a
   declared identity or port check; never leave the hash field empty (it scores main's newest commit, and on the
   Shopping page that is the Mech bot).

---

## 3. Decision rules (Mech Royale)

### 3.1 The R3a2 factorial (windows 19:44-23:44)
P1 fight early stays on in every run (V1 - V2 = +0.38, and all three 6+ bots fight from about 20 s). The other six
R3a2 items are factors, coded + (R3a2 value) and - (5.02 value):

| Factor | Item | SELECT for "-" |
|---|---|---|
| A | P2 laser economy + mid band | `laserEcon: 'off', laserRange: 'far'` |
| B | P3 focus fire | `focus: 'mult'` |
| C | P6 farm to 50% | `farmHp: '90'` |
| D | P4 pulse retreat | `retreat: 'd3'` |
| E | P5 boost spending | `boost: 'off'` |
| F | P7 speed upgrade third | `upg: 'std'` |

Design: a 2^(6-3) resolution-III base (D = AB, E = AC, F = BC) followed by its fold-over, which together form a
2^(6-2) resolution-IV design: every main effect is free of every two-factor interaction (checked: all 6 x 15
products orthogonal). F01 = V1 (scored 4.98). Runs, as SELECT changes against V1 (`decide.py design`):

| Run | Signs ABCDEF | SELECT changes against V1 |
|---|---|---|
| F01 | ++++++ | none (= V1, done) |
| F02 | ++-+-- | `farmHp: '90', boost: 'off', upg: 'std'` |
| F03 | +-+-+- | `focus: 'mult', retreat: 'd3', upg: 'std'` |
| F04 | +----+ | `focus: 'mult', farmHp: '90', retreat: 'd3', boost: 'off'` |
| F05 | -++--+ | `laserEcon: 'off', laserRange: 'far', retreat: 'd3', boost: 'off'` |
| F06 | -+--+- | `laserEcon: 'off', laserRange: 'far', farmHp: '90', retreat: 'd3', upg: 'std'` |
| F07 | --++-- | `laserEcon: 'off', laserRange: 'far', focus: 'mult', boost: 'off', upg: 'std'` |
| F08 | ---+++ | `laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90'` |
| F09 | ------ | all six at 5.02 values (P1 still on) |
| F10 | --+-++ | `laserEcon: 'off', laserRange: 'far', focus: 'mult', retreat: 'd3'` |
| F11 | -+-+-+ | `laserEcon: 'off', laserRange: 'far', farmHp: '90', boost: 'off'` |
| F12 | -++++- | `laserEcon: 'off', laserRange: 'far', upg: 'std'` |
| F13 | +--++- | `focus: 'mult', farmHp: '90', upg: 'std'` |
| F14 | +-++-+ | `focus: 'mult', boost: 'off'` |
| F15 | ++--++ | `farmHp: '90', retreat: 'd3'` |
| F16 | +++--- | `retreat: 'd3', boost: 'off', upg: 'std'` |

Analysis (`decide.py fit` on every official draw: the 16 runs plus V2, V3, V4 and its salts, and S01-full as the
all-minus point with P1 off; one CSV row per draw):
- Each main effect has se about 0.085 (0.08 with the extra rows).
- Keep the R3a2 value of A, B, C (items all three 6+ bots share) if the effect is >= -0.05; of D, E, F (contested)
  if >= 0.00.
- Leader L1 = V1 with every dropped item at its 5.02 value. If L1 is not one of the runs, its first draws are
  L1 s0-s2 at 23:44; its mean starts from the model prediction (se about 0.08).
- Interaction check: the two-factor interactions are estimable in seven alias groups (AB = EF, AC = DF, AD = CF,
  AE = BF, AF = BE = CD, BC = DE, BD = CE). If one group is 0.30 or more in size, the lead chooses between the cells
  it implicates with 2 draws each.
- The interim fit after F08 (resolution III: main effects aliased with two-factor interactions) only flags a
  factor whose effect is below -0.30; nothing is adopted before F16.
- FFA note: P1 removes 5.02's incidental opening protection in a final (checkR3a2 finding 4). The R4 build must
  restore it after the first foreign death (FFA-only, practice-inert) before the final freeze.
- What the draws so far hint, for the panel (not a decision): the simulator had V1 at 2.91 kills per minute but
  alive 68 s against 5.02's 1.82 and 99 s, and officially V1 ~ 5.02. Early fighting bought kills with survival
  time; V4's heal breaks (+0.17, noise-level) point the same way. hunt50's reserve rule (commit only when we keep
  30% hp after the expected exchange) is the right shape for this.

### 3.2 One-change arms (from the 23:44 window)
For arm X = leader + one change, with d = mean(X) - leader mean:

| Draws of X | Rule |
|---|---|
| 1 (screen) | d <= -0.25: reject, no second draw. Otherwise a second draw. |
| 2 | d >= c: adopt. c - 0.10 <= d < c: a third draw. d < c - 0.10: reject. |
| 3 | d >= c: adopt, otherwise reject. |

Bar c: **0.00** for items with top-bot or official support and for the owner's hunt50; **+0.05** for new ideas
without evidence, for bundles and for type B arms; add +0.05 more in the AHEAD state (3.5) to type B arms.

Operating characteristics (simulated, leader known from 8 draws, c = 0): true effect -0.20 adopted 8%, -0.10 27%,
0.00 58%, +0.10 84%, +0.20 97%; 1.75-2.2 slots per arm. With c = +0.05: 3%, 15%, 42%, 73%, 92%.

### 3.3 The leader's mean
- Pool all draws of builds that are identical in practice: the same presets on code proven identical by an exact
  port check (P0) or by the local identity streams for preset-only changes.
- After an adoption, until the new leader has 4 own draws, compare new arms with the average of the old leader's
  mean and the new leader's mean (shrinks the winner's curse by half). Give the new leader 2 salts within the
  next 2 windows.
- **Revert**: once the new leader has 5 own draws, if its mean is more than 0.10 below the previous leader's mean,
  go back to the previous leader.
- Leader salts: 3 in the first two windows after L1 is fixed, then 1 per window while it has fewer than 8 draws,
  then 1 every second window.

### 3.4 Arm queue (R4 build; each a preset, type S unless marked)
1. **H = hunt50** (the owner's attack-and-kill-then-pulse rule, panel_r4_past_events section 9.2): c = 0.
2. **B = bundle** of the overkill guard, finish20 and no supply-drop runs in SQUAD: c = +0.05 (group screen). If
   adopted and slots allow, ablate each item later (leader minus the item, 2 draws; drop it at d >= 0).
3. **D = danger-weighted position value**: c = +0.05.
4. **K = laser-cycle peek**: c = +0.05 (passivity risk).
5. **C = cubes before the retreat pulse**: c = 0.
6. Fillers when the queue is empty: `aimCal: 'on'` (type B), `R3: 'gun'` (type B), c = +0.05 + 0.05 when AHEAD.

A1 (`R1: 'off'`) needs no new code: it joins the queue after B (P7 `upg: 'std'` is already a factorial factor).

### 3.5 Board state (refresh at every board report)
Let M = our best portable score, m = the leader's mean, L = projected 32nd at the close (1.3).
- **AHEAD**: M >= L + 0.10. Qualification is in hand if the port works. Keep the arm queue (every draw is still a
  ticket) with the higher bar for type B; the engineers put FFA-only work first; SQUAD code freeze may move
  earlier to 06:00.
- **EDGE**: m + 0.30 >= L > M - 0.10. Run the schedule as written.
- **BEHIND**: m + 0.30 < L. Salts cannot close the gap (1.3). Group-screen: H alone (the owner's item), then the
  bundle B, then the remaining R4 items as one more bundle, each with 2 draws at c = -0.05 (this overrides the bars
  of 3.2 and 3.4); ablate an adopted
  bundle only if slots remain. No type B fillers. Ask the panel for the next largest levers. **This is the state
  now** (best 5.15, projected line 5.8+).

### 3.6 Port checks
- **P0 (first R4 slot)**: R4 code, every new practice preset off, the presets and salt of the best draw so far.
  - Exact score: R4 is identical to R3a2 in practice; all earlier draws pool with R4 draws and stay portable.
  - Different score: the next slot repeats P0 with only the opening-protection fix (the one R4 FFA item that can
    fire in practice) switched off. Exact then: that fix fires in practice; keep it if it is the FFA safety item
    and treat R4 as a new family (2 salts to re-measure it). Different again: an unintended practice change in R4;
    no R4 arm until the engineers find it with the local identity streams.
- **Port-M (09:00 Sun, optional)**: repeat P0 on the code at the SQUAD freeze if FFA-only changes were merged
  overnight.
- **Port-F (first slot of the 12:44 window, Sun)**: the final FFA code with the presets and salt of the best portable draw (section 6).

---

## 4. Window-by-window schedule, 19:44 Sat to 15:15 Sun

Repo URL for every Mech slot: `https://github.com/Hrudayangam-Mehta/kranti-hackathon` plus the 40-character hash.
Pushed and ready: V4 s1 `a749e61c5bc4788830c35d8bcc2e6b1e53b6e95d`, V4 s2 `5b23b8f608d24b59e43ca1640ebf532d248173e8`,
V4 s3 `99821c0f0499002ed513e30d3986234f070c280d`, V4 s4 `06af5e8acf6fffae0149b1ccfac059fee665bc08`. Later hashes
come on the slot sheet (section 8). Builds are named code + SELECT change against V1 + salt (e.g. `C3 F05 s0`,
`C4 L1+H s1`; C3 = R3a2 code, C4 = R4 code, F = final code).

| Window (UTC) | Mech Royale slots | Trigger at the end of the window | Shopping Sessions slots |
|---|---|---|---|
| Sat 19:44 | V4 s1, V4 s2, F02, F03 (V4 s3, s4 if F02/F03 are late) | V4 draws: sigma check | S1 M1 (section 7), S2 per S1's result |
| Sat 20:44 | F04, F05, F06, F07 | | 1 code variant + 1 knob / re-time |
| Sat 21:44 | F08, F09, F10, F11 | interim fit (warnings only) | same pattern |
| Sat 22:44 | F12, F13, F14, F15 | | same |
| Sat 23:44 | F16, P0 port check, H s0; or three L1 salts if R4 is not gated | full fit -> L1; P0 verdict (3.6) | same |
| Sun 00:44 | H s1 (s2 if grey), B s0, B s1, L1 salt | H verdict; screen B | same |
| Sun 01:44 | B s2 or D s0, D s1, L1 salt, K s0 | B, D verdicts | same |
| Sun 02:44 | K s1, C s0, C s1, A1 s0 | K, C verdicts | same |
| Sun 03:44-07:44 | remaining queue (A1, ablations of B if adopted, fillers, new panel items once built), 1 leader salt per window | verdicts after each window | same; best block to lose if the owner sleeps (section 11) |
| Sun 08:44 | last arms already built; Port-M if FFA code changed overnight | **09:00 SQUAD code freeze** | Shopping correctness-code freeze 09:00 |
| Sun 09:44-10:44 | only arms that can finish by 11:00, leader salts | **11:00: leader L* fixed** | knob / re-time |
| Sun 11:44 | L* salts (portable tickets); engineers build F = L* presets on the final FFA code | | re-times of the candidate |
| Sun 12:44 | Port-F (F with the best portable draw's presets and salt), then F salts | Port-F exact: candidate final entry (FFA code frozen at 12:30) | **12:00 Shopping freeze**; re-times |
| Sun 13:44 | F salts | | re-times of the final candidate and runner-up |
| Sun 14:44-15:15 | F salts only; the last one submitted by 15:15 | **15:20-15:40 pick; 15:40-15:55 verify** | last re-time by 15:15; pick explicitly |

Window times assume each window's first slot is used when it frees up. If the owner is late, the windows slide
and the 09:00, 11:00, 12:30 and 15:15 anchors do not; arms that cannot finish by 11:00 are dropped from the bottom
of the queue. If R4 is late, the 23:44 and later rows run L1 salts and A1 until it is gated.

---

## 5. Freezes

| Time (UTC Sun) | What freezes | Why |
|---|---|---|
| 09:00 | SQUAD-affecting code (no new practice logic; built presets may still be tested) | 2 h of draws for the last items; Planet Wars lesson (no untested change late) |
| 11:00 | the leader's presets (L*) | last adoption decision |
| 12:00 | Shopping Sessions code | 3 h of re-times and checks before the pick |
| 12:30 | FFA-only code (the final build F, packaged and gated by 12:40) | Port-F in the 12:44 window, about 10 F salts and a fallback before 15:15 |
| 15:15 | all submissions | queue time before the 16:00 close; an entry still queued at the cutoff does not count (A9) |

FFA-only changes merged before 12:30 must pass: the local SQUAD identity streams (byte-identical), the local FFA
league against the previous FFA code (not worse by more than 1 SE in any pool), the release gate.

---

## 6. Choosing the final Mech Royale entry

1. **Eligible**: entries whose code is F (Port-F and F salts). Their FFA code is our best by construction; their
   SQUAD presets act only in the first seconds of a final (firewall).
2. **Port-F in the 12:44 window**: F with the presets and salt of the best portable draw (any family proven identical in
   practice, type S differences only, or type B values equal to F's). Exact score: that entry is the candidate.
   Not exact: the FFA code leaks into practice; the candidate becomes F's best salt, and the engineers check the
   leak (if a single FFA item caused it and F's salts stay below the line, rebuild F without it and port again,
   one slot, before 14:30).
3. **Pick at 15:20-15:40** (after the last score is in): the highest-scoring eligible entry; equal scores: the
   earliest.
4. **Qualification check**: it must exceed the 32nd score at 15:20 by at least max(0.05, the 32nd's rise over the
   last 2 h). If it does not but another of our entries does, pick that one (not qualifying is worth nothing),
   preferring entries with `env: 'auto'` and the most recent FFA code. If none does, pick our highest score.
5. Never pick a diagnostic entry (identity probes with FFA parts off, `env: 'squad'`).
6. Pick explicitly on the track page even when the default (best score) is the same entry, then verify: chosen
   entry shown, repository public, hash present, logged-out download of
   `https://github.com/Hrudayangam-Mehta/kranti-hackathon/archive/<hash>.tar.gz` works. The final rebuilds the
   commit at the cutoff: an entry that fails to fetch or build sits out (L9).

---

## 7. Shopping Sessions (2 slots per hour)

Facts that shape the plan: one right answer per dataset, a wrong table scores nothing; the final reruns the
chosen commit on about 60M **new** events (3 runs, median, 3 min cap each); practice times vary up to 20% across
machines; our sandbox has 4 shared cores, the scorer 8 vCPUs. So practice slots buy two things we cannot get
locally: **correctness on hidden data** and **timings on the real hardware**. The practice board itself carries
nothing into the final.

### 7.1 Gates before a push
- **Gate C (every build with a code change)**: kit fixtures 36/36; dev set MATCH with dev-answer; the
  independent verifier's edge cases (verify/edge.py) PASS, with the two documented spec questions resolved by
  rules.md; 15-seed differential against the reference (leap-day windows and click ratios 0.08-2.5 included);
  32+ fuzz seeds MATCH; a 20M practice-scale run whose sorted output equals M1's and whose self-check sums agree;
  clean `--locked` build in a fresh CARGO_HOME; nothing on stdout; writes only under OUTPUT_DIR.
- **Gate P (before a build can be the final)**: a 60M run (40M if disk or memory forbids, scaled x1.5) with exit 0,
  peak memory at most 16 GB of the 24 GB, and the 60M/20M time ratio at most 3.5 (no super-linear step).
- **Gate K (a knob only: a constant such as thread count, chunk size or allocator, no logic change)**: fixtures,
  dev MATCH and the 20M equality.

### 7.2 Slot use
- **First window, S1 = M1** (milestone 1, the correct build), on the neutral branch of the public repo, hash pinned.
  It tests the Docker build path (no daemon here), the read-only root and uid 1000, the dev check, the hidden
  practice data and our 8-vCPU time.
- **S2 depends on S1**:
  - rejected at build: the Dockerfile fix, then resubmit;
  - dev check failed: the scorer returns the differing rows and logs; fix, Gate C, resubmit;
  - hidden practice wrong (only counts come back): stop all speed work; hunt the cause locally (more seeds at
    20M, window and click-ratio extremes, memory); resubmit only a found and fixed cause;
  - correct: M2 if it passed Gate C, otherwise a re-time of M1's hash (a second machine; it measures the machine
    spread we need for decisions).
- **From the second window on**: slot A = the newest code variant that passed Gate C (the engineers' order: person
  lookups in dedup, sessions and parsing, parallel links); slot B = a knob variant of the incumbent (thread
  count, chunk size, allocator: only the scorer's 8 vCPUs can rank these) or, if none is ready, a re-time of the
  incumbent. Never two untested logic changes in one build.
- **Incumbent rule**: a correct variant replaces the incumbent if its time is at most 0.85 x the incumbent's (one
  draw each). Between 0.85 and 1.00: one more draw of each in later windows; replace at a mean ratio of at most
  0.93. Slower: reject.
- **Sun 09:00**: correctness-relevant code (parsing, dedup, sessions, attribution) freezes; knobs only after.
  **Sun 12:00**: full freeze. 12:00-15:15: re-times of the final candidate (2-4) and of the runner-up (1-2).

### 7.3 Final Shopping entry
The fastest build by mean practice time over at least 2 correct draws, among builds that passed Gates C and P; if
two are within 5%, the older one with more correct submissions; equal: the earlier. Pick it explicitly by 15:40.
Do not pick by the single best practice time: it is the luckiest machine, and the final runs on new, 3x larger data.

---

## 8. Owner workflow: one slot sheet per window

The release engineer hands the sheet 10 minutes before each window and pushes every commit on it at that moment
(salt and SELECT commits publish nothing new once the first variant is public; Shopping commits go to the neutral
branch, Mech commits to main).

| Slot | Track | Repo URL | Commit (40) | Build | Purpose |
|---|---|---|---|---|---|
| M2044-1 | **Mech Royale** | https://github.com/Hrudayangam-Mehta/kranti-hackathon | (40 chars, main) | C3 F04 s0 | factorial run |
| S2044-1 | **Shopping Sessions** | same URL | (40 chars, neutral branch) | M2 | speed variant |

The owner, per window (about 15 minutes in all):
1. Mech slot 1: paste URL and hash, check the first 7 characters against the sheet, submit.
2. While it scores, Shopping slot 1 on the Shopping page (independent queue).
3. When Mech slot 1 shows "scored", Mech slot 2, and so on; then Shopping slot 2 after Shopping slot 1 is done.
4. One report per window: each slot's status (a rejection reason word for word), score to two decimals, the
   board's 1st / 16th / 32nd / 33rd on Mech, the next-free time on both forms. A screenshot is enough.

Never: an empty hash field (on the Shopping page it scores the Mech bot); a Mech hash on the Shopping page or the
reverse (the repo URL is the same for both tracks); a hash not on the sheet; a retry of a rejected hash unless the
sheet says so.

The engineers, per window: build and gate the sheet's commits (salt commits differ in one number, SELECT commits in
one line), log each row in `notes/submissions.md` before the push, fill score and decision after the report, run
`decide.py` at the window boundary, write the next sheet. Keep a salt ledger: no (build, salt) pair twice.

---

## 9. What this schedule needs from the engineers

1. By 19:50 Sat: F02 and F03 as SELECT-only variants of the R3a2 code (one line of lib/params.js each, as for
   V2-V4), gated and pushed; by 20:40: F04-F07; by 21:40: F08-F11; by 22:40: F12-F16. `decide.py design` prints the
   exact SELECT changes. Each variant's resolved PARAMS must differ from V1 only in its factor keys
   (variants_tools/param_diff.mjs).
2. R4 build (target 23:00): H, B (three presets), D, K, C as type S presets; the opening-protection fix after the
   first foreign death and the Z8 ghost-track fix (FFA-only); `R1: 'ffa'`; every new preset off reproduces R3a2
   byte for byte on the 14 identity streams; then the P0 port check is the first R4 slot. R4 is applied to L1's
   SELECT values once the fit is in (they are presets, so no rebuild of code).
3. A salt-batch step: N commits of one build with salts k..k+N-1, gated, listed with hashes, so that the end-game
   windows (12:44-15:15) can be pre-built at 12:30.
4. The draw ledger as a CSV for `decide.py fit` (`tools/panel_r4/draws_example.csv` holds the five official draws
   of this code family so far), updated after every report.

---

## 10. Corrections to the two older files

### `notes/submission_plan.md` (07:15 Sat)
1. Section 3 (S01-S06 probes, phases A-D) never ran. The first two entries were S01-core 4.90 and S01-full 5.02
   (16:28 and 16:30 UTC, shown as 11:28 and 11:30 AM US Eastern). Replaced by sections 3-6 here.
2. Noise: sigma per draw is 0.16-0.17 (seven pairs), not 0.20. The best-of-N gains are +0.17 (4), +0.24 (8),
   +0.30 (16) at 0.17.
3. "Adopt only at +0.6 against the leader's mean, or +0.4 after one more salt": far too strict for a best-score
   board. Simulated: it adopts a true +0.2 item 11% of the time and a true +0.3 item 27%. Replaced by 3.2 (two
   draws, bar 0.00-0.05: +0.2 adopted 92-97%).
4. Board numbers: the cut was 4.44 then; it is 5.33 (16:37) and projected 5.80-5.92 at the close.
5. Code freeze Sun 04:00 and "candidate scored by 10:00": replaced by 09:00 (SQUAD code), 11:00 (presets), 12:30
   (FFA code), Port-F and salts until 15:15.
6. Gate G1 margin "max(0.30, 3 x hourly rise)" and G3 "best local FFA league among practice builds": replaced by
   section 6. All final candidates share one FFA code, so the local league judges FFA code changes, not salts.
7. Section 6 "stop new commits at a margin of 1.0 or at 10:00": replaced. Salt and SELECT commits publish nothing
   new; commits continue to 15:15.
8. Section 4's owner checklist stands, extended to both tracks (section 8 here); the Mech form's slots roll
   (A18), so "hour" means the window the form shows.

### `notes/submissions.md`
1. The table at the top (S01-S06: base, env squad, salt 1, laserRange mid ...) lists planned rows that were never
   submitted; the real rows are S01-core, S01-full and the R3a2 results further down.
2. "Official results" times are US Eastern as shown on the page: 11:28 AM = 16:28 UTC, 11:30 AM = 16:30 UTC.
3. "Entered in the final" (S01-full, then V4) means only the default pick (best score); nothing has been picked.
4. The R3a2 heading says "pushed (18:58 UTC Sat)", but V1 was scored from 18:44 UTC and the table was written at
   18:43: the push was before 18:43.
5. The R3a2 readings ("fighting early is worth about +0.38", "heal breaks beat pulse retreat by about +0.17: keep
   retreat 'd3'") are single-draw differences with sd 0.24. Only the first is above one sd; none is a decision.
   The factorial (3.1) decides them.
6. The V4 salt re-draws: use s1 and s2 in the 19:44 window (sigma check, V4's mean), s3 and s4 only as fallbacks.
   Four salts of a build whose mean is about 5.0 cannot reach a projected line of 5.8 (1.3).
7. From 19:44 Sat the log uses the columns below (appended to the file as a new section):

| ID | UTC | Code | SELECT change vs V1 | Salt | Commit (40) | Score | Role (cell / arm / leader / port / F) | Type (S / B) | Portable | Decision |

---

## 11. Contingencies

- **Owner absence.** Unattended windows are lost (only the owner can submit). If the owner must sleep, lose a block
  inside 04:00-08:00 UTC (arms shift, anchors stay); never 19:00-01:00 Sat (factorial, first arms, P0) or
  11:00-15:45 Sun (end game). Pre-build the next morning's first sheet before the break.
- **Rejection.** The reason decides: build or conformance (fix, resubmit the same build); timing (answer times:
  check the 1-CPU gate, revert the last code change); fetch (push missing). A rejection never lowers the best
  score but costs the slot.
- **A score far below its family** (more than 0.5 under the leader's mean): suspect a crash or timeouts, not noise
  (about 3 sd); run the release gate and the local squad sanity on that exact commit before more slots of that code.
- **Scorer down or a long queue.** Keep the order; drop the lowest-priority slot of the window, never a port.
  From 14:30, if the p95 scoring time on the status page passes 10 min, stop after the current slot.
- **Sign of copying** (a new team at exactly our score soon after a push, unusual forks): lock earlier (FFA freeze
  as soon as Port-F can run) and report to the owner.
- **The line jumps late** (32nd rises more than 0.1 in an hour after 12:00): spend 15:00-15:15 slots on F salts only;
  it is the only lever left.
