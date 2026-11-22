# Fable switch panel, 4 of 5: code and response-loop optimiser

Base audited: `r7work/ckpt_07_LG` with the best SELECT (`variants6/FNV_s1/bot/lib/params.js`). Nothing outside
`fable_work/switch/` and this folder was written. Tags: [S] our simulator (behaviour and counts only, never a ranking),
[O] open-loop stream replay, [A] arithmetic, [C] code reading. The machine ran at load average 20-36 during this work, so
wall times are noisy; every conclusion below rests on noise-free numbers (per-decision minimum over 3-4 replays, or
operation counts), and the noisy ones are labelled.

Work files (all in `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch/`):
`base/` (LG + FNV_s1 params), `prof/` (base plus a timer in `stage()`, 300 of 300 kit answers identical), `opt/` (base plus
item NC), `drive.mjs` (closed-loop sim profiler), `replay.mjs` (open-loop, min of N), `cnt.mjs` (identity and plan counts),
`gc.mjs`, `an.mjs`, `osc.mjs`, `iso.mjs`, `runs.mjs`, data `p16.json` (squad seeds 1-16) and `p28.json` (seeds 17-28),
`nc_patch.diff`.

## 0. Bottom line

1. **Latency is not our problem and needs no rescue.** Noise-free, a decision costs 0.14 ms on average (kit stream) and
   0.19 ms (4800-decision stream); the worst single decision is 2.2 ms (kit) and 13.3 ms (long stream, one A* that used
   its whole 25000-cell budget). The "wait X ms" on the result page cannot be our decision time: the same code would
   have to vary between 9 and 527 ms.
2. **Every decision over 10 ms that I saw in 28 sim matches was the scheduler, not our code**: 114 of 114 had process
   CPU time under half the wall time. A* was involved in none of the top 12.
3. **The real "response logic" defect is leg ping-pong in fights**, not searching: FIGHT/isolate and FIGHT/standoff swap
   back and forth 17.5 times per match inside 1 s; half of all isolate spells last 0.3 s or less. A walking reversal costs
   0.40 s (protocol), so these spells move the mech almost nowhere. This is where a minimum dwell belongs (item R1).
4. Deliverables: 2 behaviour-identical refactors (NC, FU), 1 near-identical cap (PC), 3 dwell presets (R1-R3), a bot.js
   review with one small hardening, and a dead-code list. Nothing here is worth a submission on latency grounds alone;
   R1 is the only item with a plausible score effect.

## 1. Decision time per module

### 1.1 Noise-free (open loop, min of 3-4 replays, Dockerfile engine flags, one core) [O]

| Stream | Decisions | mean | p50 | p99 | p99.9 | max |
|---|---|---|---|---|---|---|
| kit `stream.jsonl.gz` | 300 | 0.137 ms | 0.09 | 0.82 | 2.17 | 2.17 |
| `comply_work/long4800.jsonl.gz` | 4800 | 0.186 ms | 0.11 | 1.75 | 7.47 | 13.34 |

`JSON.parse` of an observation (1.4-4.6 kB): 0.01 ms. Stage shares on the long stream (mean ms, share, max):

| Stage | mean | share | max | What sets the max |
|---|---|---|---|---|
| sense | 0.068 | 36% | 6.78 | one-off `nav.setBody` when the mech grows (senses.js:104) |
| legs | 0.030 | 16% | 13.17 | A* in `mover.plan` (25000 cells) |
| assess | 0.023 | 13% | 0.14 | - |
| zone | 0.016 | 8% | 7.33 | A* in `mover.zoneCheck` (mover.js:355) |
| counters | 0.009 | 5% | 0.06 | runs in SQUAD too (section 4) |
| mode (hide search) | 0.008 | 4% | 0.21 | - |
| req, econ, stance, fire, hands | 0.019 | 10% | 0.09 | - |

A* cost: 0.28 ms per 1000 expanded cells warm, 0.52 cold. Full budget (25000) = 7-13 ms. That is the true ceiling of
one decision, because `B.planTick` allows one A* per decision (mover.js:27, :350, stance.js:197).

### 1.2 Closed loop (sim, 28 squad matches, 19995 decisions) [S], wall times noisy

- Wall: p50 0.2 ms, p99 12-14 ms, max 90 ms. CPU: p50 0.22, p99 4.1, p99.9 6.6 ms. Wall over 10 ms: 114, all preempted.
- A* runs in 3.4-3.8% of decisions. Expanded cells: p50 80-100, p90 1300-1700, p99 7000-11400, **max 12036** (3.4 ms).
  The 25000 budget was never reached in play. By leg: ZONE/zone (mean 2325, max 10813), LOOT/loot (max 12036),
  HOLD/roam (max 9162), HOLD/huntsnd, FIGHT/standoff. A* is 3-4% of our total compute.
- GC: a forced full collection takes 4-8 ms (median 8.2 ms under load, n 240); natural collections inside a decision
  show a median of 2 ms. No GC fix is needed. I tested "collect in the idle gap after each 20th answer": it is not
  recommended, because the next observation can arrive while the 8-28 ms forced collection runs.
- Check tool, 1-CPU quota group, real `bot.js`: 300 of 300 in time, 0 late (max 41.7 ms on this loaded machine).

### 1.3 Worst-case spikes and what to do

| Spike | Size | Fix |
|---|---|---|
| A* at full budget | 7-13 ms | PC (below): cap 12000 outside ZONE. Ceiling becomes 3.5-6.5 ms |
| `nav.setBody` on growth | up to 6.8 ms | already pre-warmed (`warmBodies`, 24 bodies); leave |
| Full GC | 4-8 ms, up to ~30 ms under load | leave |
| Scheduler stall | 10-90 ms here | not ours to fix; FU makes the bot's behaviour independent of it |
| First decisions (cold JIT) | 2.0-2.3 ms CPU | rehearsal already covers it; leave |

Worst realistic stack in one decision: A* 13 + setBody 7 + GC 8 = 28 ms, still under 50. With PC it is 21 ms.

## 2. Proposed code changes

### NC. Negative plan cache (behaviour-identical refactor). Written and tested

- **Site:** mover.js `plan()` (lines 25-45). Patch: `fable_work/switch/nc_patch.diff` (22 diff lines).
- **What:** A* is a pure function of (start cell, goal point, cap, body). When the last plan from this very cell to this
  very goal produced no path (not a "partial path dropped for gaining under 10 m", which depends on the exact
  position), skip the search and return the same empty result, updating `path.t`, `wp`, `dirty`, `capHit` and
  `noPathSince` exactly as before.
- **Why:** with no path, `need` (mover.js:70) is true on every decision until `slideS` (1 s), so the same failed search
  repeats up to 10 times.
- **Measured:** long4800: 912 of 2516 `findPath` calls skipped; kit 0; fuzz3000 0. In play the repeated failures are
  cheap ones (0 expanded cells: a blocked end point), so the mean gain is about 0. The value is the tail: a failed
  25000-cell search (13 ms, seen once on the long stream in FIGHT/regain) can no longer repeat 10 times in a row.
- **Identity test (passed):** `cnt.mjs` answers, base against opt: kit 300 of 300, long4800 4800 of 4800, fuzz3000 2949
  of 2949 byte-identical. `counters.plans` is unchanged; a new `counters.plansCached` counts the skips.
- **Risk:** none found. The cache is dropped on any successful plan, body change or cap change.

### FU. Make the fuse count work, not wall time (behaviour-identical in normal runs)

- **Site:** brain.js `fuse()` (line 271); callers `evalMaybe` (:281) and the hide search (:659).
- **Finding:** the fuse reads the wall clock (`now() - actT0 > P.fuseMs`, 30 ms). On a stalled process it trips and
  silently skips the position evaluation or the hide search. I hit this by accident: two runs of identical code on
  fuzz3000 gave different answers from line 590 and line 2147 on, with `counters.fuse` 7 and 1. So today (a) a
  scheduler stall changes what the bot does for the following seconds, and (b) identity tests on a loaded machine
  give false differences.
- **Change:** trip on work done in this decision instead: `nav.lastExpanded` of this decision's A* above `fuseExpand`
  (default 15000) rather than elapsed ms. Keep `P.fuseMs` only as a second condition at 45 ms (the answer is lost by
  then anyway). posEval and the hide search cost under 0.3 ms, so skipping them never saved a late answer.
- **Identity test:** kit, long4800 and fuzz3000 identical to base whenever base's `counters.fuse` is 0; plus the new
  property: two runs of fuzz3000 under `stress`-level load are identical to each other.
- **Latency gain:** none. Gain: deterministic behaviour under stalls and trustworthy identity gates.

### PC. `pathCap: off -> 12k` (preset; near-identical)

- **Site:** params.js `pathExpand: 25000`; mover.js:30 (`plan`), stance.js:199. Leave mover.js:355 (zone length) at 25000:
  a failed zone plan counts as "late" and must stay exact.
- **Change:** `pathCap: { off: {}, '12k': { pathExpandLegs: 12000 } }`, used by `plan()` and the ambush plan.
- **Effect:** the per-decision ceiling drops from 7-13 ms to 3.5-6.5 ms. In 28 sim matches one plan in 727 exceeded 12000
  cells (12036), so behaviour differs in about 1 decision per 20000. `nav.findPath` already falls back to a greedier
  second pass (weight 2.5) for the last 40% of the budget, so a capped search still returns a path in most cases.
- **Test:** kit identical; sim seeds 1-28: count of plans with `lastExpanded` over 11400 that end `ok: false` must be 0 or 1.
- **Verdict:** optional insurance. Ship only together with another build.

## 3. Response logic: where the bot re-decides without need

Measured over 28 sim matches (2000 match-seconds) [S]:

| Signal | Value |
|---|---|
| Mode changes / ABA inside 1 s | 272 / 18 (0.6 per match): fine |
| Target changes / ABA inside 1 s | 410 / 53; target hold p50 3.0 s, 8% of holds 0.3 s or less: acceptable |
| **Leg-kind ABA inside 1 s** | **718 (26 per match)** |
| of which isolate <> standoff | 491 (17.5 per match) |
| regain <> standoff | 51; grab <> none 49; grab <> standoff 24 |
| Dwell, FIGHT/isolate | p25 0.1 s, p50 0.3 s, 52% last 0.3 s or less |
| Dwell, FIGHT/regain | p50 0.4 s, 49% last 0.3 s or less |
| Dwell, HOLD/huntsnd | p25 0.1 s |
| Stick reversals (over 120 degrees between decisions) | 6-7% of all decisions; isolate 16.3%, standoff 10.2%, dodge 23.8% |
| Goal jumps over 15 m between decisions | 390 (14 per match) |
| Replans to the same goal (within 4 m) inside 2 s | 92, of them 41 after a failed plan (NC covers these) |
| Standing still | 4.5-5.5% of decisions; LOOT/loot 20% of its decisions, FIGHT/ambush 97% |

### R1. `isoDwell: off -> on` (top item of this report)

- **Site:** brain.js `fightLegs`, the isolate branch (lines 507-516).
- **Cause [C]:** the branch is entered when `B.A - tgt.a > 20 && B.nLos >= 2`. Both terms are noisy from decision to
  decision (`nLos` counts lines in the last moments; `A` sums threat weights). When the gate is false for one decision
  the legs switch to `mover.standoff`, whose strafe usually points another way; 0.1-0.3 s later the gate is true again.
  Of 337 isolate-to-standoff exits, only 71 were arrivals (within 3.6 m of the cell); 266 were gate flicker or a cell
  change. In addition the cell itself is re-chosen every `evalPeriod` (0.3 s) from rings centred on the mech: in 231
  of 1993 consecutive isolate decisions the goal jumped more than 6 m.
- **Change (three parts, one preset):**
  1. Exit hysteresis: once in isolate, stay while `B.nLos >= 1 && B.A - tgt.a > 10` and the target is unchanged, for
     at least `isoMinS` 0.6 s (the time one reversal costs plus a step).
  2. Goal keep: a keep rule exists (tactics.js:746: the old goal stays while the best cell is less than
     `evalGoalKeep` 60 better, for 3 s), yet the goal still jumps in 12% of isolate decisions. I did not trace which
     clause lets them through (the 3 s limit, or the old goal scoring -1e8 once a threat sees it). The builder should
     log that first; the fix is a larger margin while `legKind` is isolate, not a new mechanism.
  3. Arrival: within 3 m of the cell, hold it for `isoStayS` 0.8 s with a jink of at most 2 m along the cover edge
     (the owner's "pause when needed, then move") instead of dropping to the open-ground strafe at once.
- **Inert when:** FFA, late zone (the leash legs return earlier), `B.rush`, a laser charging at us (beam hide returns
  earlier), `finishing`.
- **Expected:** isolate <> standoff ABA from 17.5 to under 4 per match; isolate reversals from 16% to about 6%. Score
  effect unknown: it trades jitter (which also spoils enemy aim) for real cover use while two mechs shoot at us.
  [A] if it removes 0.5 s of exposure to the second attacker per episode: about -40 hp per episode, a few episodes per
  match. Test in the simulator on damage taken while `nLos >= 2`, then draw as its own preset.
- **Tests:** T1 gate false for 1-5 decisions inside `isoMinS` keeps `legKind === 'isolate'` and the same goal;
  T2 target change exits at once; T3 arrival holds within 2 m for `isoStayS`; T4 off = 24 of 24 sim matches and all
  three streams identical.

### R2. `sndDwell: off -> on` (seek by sound: commit to a goal)

- **Site:** hunt.js `soundGoal()` (called from `seekLegs` on every decision).
- **Cause [C]:** the goal is recomputed each decision from the loudest of 12 sectors and the weighted mean origin, so it
  moves with every new sound. A move over `replanMove` (4 m) forces a new A*: HOLD/huntsnd plans in 15-22% of its
  decisions (the highest rate of any leg) and a quarter of its spells last 0.1 s.
- **Change:** keep the committed sound goal for `h50SndDwellS` 1.5 s unless (a) it is reached, (b) a prey appears (the
  prey branch runs first already), or (c) another sector becomes louder by 50%.
- **Expected:** A* share in huntsnd from about 18% to about 5%; straighter approach to gunfire. Small effect on score.
- **Tests:** two alternating sound sectors of equal weight give one goal for 1.5 s; off = identical.

### R3. `zonePlan: off -> one` (one A* for the zone walk, not two)

- **Site:** mover.js `zoneCheck` (:350-358) and `moveTo` (:70).
- **Cause [C]:** `zoneCheck` runs its own A* every 2 s for the path length, and `moveTo` re-plans the same walk on its
  own 2 s clock (`replanS`). The clocks are not aligned and `zoneCheck` installs its path only when the mode was already
  ZONE, so the same route is searched twice 0.3-1 s apart (seen as ZONE>ZONE replans with nearly equal cell counts:
  2186 and 2131, 1665 and 1653, 2203 and 2132). ZONE/zone has the dearest plans (mean 2325 cells).
- **Change:** in `zoneCheck`, when `path.ok`, the path goal is within 4 m of the zone goal and `t - path.t < 2`, take
  `zg.len = path.len` and skip the search; and install the zone path whenever the leg kind of the last decision was
  `zone`, whatever the mode.
- **Expected:** about half of the zone A* calls (the largest single block of expansions). Not exactly identical: the
  length estimate is up to 2 s old instead of fresh, so the "leave now" margin can shift by one decision.
- **Tests:** kit identical; sim: 0 s outside the zone and 0 zone deaths on seeds 1-28, `counters.plans` in ZONE halves.

### Not proposed

- A general "think every second decision" throttle: decisions cost 0.2 ms, so there is nothing to save, and gun cadence
  (5 ticks) needs every decision.
- A sticky target: target holds are already long (p50 3 s).
- Time-slicing A*: PC gives the same ceiling for one line of code.

## 4. bot.js observation handling

Read against protocol section 2 and the R6 I/O notes. Correct as written:

- **Backlog:** all complete lines in the buffer are parsed, only the newest observation is answered, one pump at a
  time; a half line stays in `buf`. Answers carry the tick of the observation (sanitiser), so no stale answer is sent.
- **IO8 merge:** applied between every pair of consecutive observations in a batch, gated on `P.ioMerge === true` (on
  in SELECT); ages accumulate correctly across more than one skipped observation; lists are capped.
- **Deadline:** `brain.act(obs, t0 + 27.5)`; `counters.overruns` is only a counter.

Findings:

1. **(B1, harden)** The merge exists only when `lib/io.js` and the brain both loaded. In fallback mode (brain failed)
   nothing reads events, so that is harmless. No change.
2. **(B2, small)** `handle()` awaits `init()` inside the line loop. Observations that arrive during init are in later
   chunks and are collapsed afterwards, so the first answer goes to the newest one. Correct.
3. **(B3, propose)** A stall is invisible to the brain. When a backlog collapses k observations, the brain's clocks jump
   by 0.1 k seconds and the last answers were lost (the mech coasted on `move`/`aim`, triggers dropped, a charging laser
   was released: R6 I/O section 1.4). Pass `obs._skipped = k` from `handle()` and let the brain (a) set `path.dirty`
   so the path is re-anchored from the true position, (b) treat a laser that was charging as fired. Inert when k = 0, so
   identical on all streams without backlog. Test: feed two observations in one chunk; expect one answer, `_skipped` 1,
   `path.dirty` true.
4. **(B4, no change)** `setImmediate` before `pump` adds one loop turn (under 0.05 ms). I did not verify that `process.stdout.write`
   to a pipe is synchronous in bun; the check tool shows 0 late answers either way.
5. **(B5, note)** `slowTicks` logs at 30 ms; stderr is hidden officially. Nothing to gain.

## 5. Dead code and wasted work

| Item | Site | Cost today | Action |
|---|---|---|---|
| Unused exports | aim.js `TAU`, `aimAt`, `closestApproach`, `slewTime`, `onTarget`, `dirOf`; senses.js `vecOk`; world.js `pointInEdges`, `pointInPrism2D`, `distToPrismEdge2D`; params.js `SELECT_502`; counters.js `ARCHETYPES`, `ENGAGE`, `COUNTER_PARAMS` (used only inside their own file or not at all) | load time only | delete in a cleanup build; identity by the three streams |
| `counters` stage in SQUAD | brain.js:640 `cx.update` every decision; its advice is neutral outside FFA | 5% of compute (0.009 ms) | keep: it must have history when FFA latches |
| `req` stage | brain.js:641 steal / scanner / aimcal `sense` every decision even when their switches are off (steal.js:42 returns early) | 4% | keep |
| Duplicate zone A* | mover.js:355 against :31 | half the ZONE plans | R3 |
| Repeated failed A* | mover.js:70-71 | up to 10 searches per second on a dead goal | NC |
| `soundGoal` every decision | hunt.js | 6 typed-array fills plus up to 12 `nearestPassable` | R2 |
| `postLegs` cover search | brain.js:320-336, 108 samples every 3 s | negligible | keep |
| `B.deadline` | set each decision, read only for the `overruns` counter | none | fold into FU |
| Wall-clock fuse | brain.js:271 | makes behaviour depend on scheduling | FU |

Total removable compute is under 10% of 0.2 ms. The reason to do any of it is steadiness and determinism, not speed.

## 6. Order of work

1. NC (done, identical) and FU (identical; also fixes the test noise the other panel members will meet on this
   loaded machine) go into every next build.
2. R1 `isoDwell` as its own preset; sim check on damage taken with two or more lines on us; then a submission slot if
   the panel has one.
3. R2, R3, PC and B3 ride along with any build; none deserves a slot.

Open points I could not settle here: whether R1 raises or lowers damage taken (needs the paired sim run), and the
real stall rate on the official machine (not observable to us).
