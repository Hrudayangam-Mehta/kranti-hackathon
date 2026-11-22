# Panel R7, round 1: QA stress test (lens `stress`)

Object: the CURRENT `bot/` (R4a code with the RB1 map loader) under the V4 SELECT (`{retreat:'d3'}`) and the KS SELECT
(V4 + laserEcon off, laserRange far, focus mult, farmHp 90, upg std, seek on), in-process. The shipped bundles
`variants6/S_s1/dist/bot.js` and `variants6/KS/dist/bot.js` were tested as processes. Everything ran on core 2,
one job at a time (flock). Total CPU was about 11 min. Tools and raw outputs are in `tools/panel_r7/stress/`. No edits
were made outside that folder and this memo.
Tags: [M] official, [T] top bot, [S] simulator, [A] arithmetic, [N] no evidence. The simulator is used here only for
failure modes, never to rank arms (its V4-vs-KS score gap is noise of the kind it has had wrong six times).

## 1. What was run, with counts

| test | runs | errors / fallback | lates > 50 ms | worst decision | zone deaths | out-of-zone | stuck (speed) | pinned (goal) |
|---|---|---|---|---|---|---|---|---|
| seed sweep, squad 1001-1060, V4 + KS | 120 | 0 / 0 | 0 | 31.9 ms (first match of a process; else <= 27) | 0 | 0 s | 0 | 6 windows of 5 s, all recovered |
| seed sweep, FFA 2001-2012, V4 + KS | 24 | 0 / 0 | 0 | 17.1 ms | 0 | 0 s | 0 | 2 windows, recovered |
| changed clock: 30 Hz/3, 20 Hz/1, 10 Hz/1, 24 mechs (V4) | 48 | 0 / 0 | 0 | 23.2 ms | 0 | 0 s | 0 | 2 windows, recovered |
| forced starts and endings, V4 + KS (`force.mjs`) | 232 | 0 / 0 | 0 | 47.3 ms (cold, see F8) | **2** | up to 13.2 s | 0 | **1 run pinned for 57 s** |
| late start t=268 s, 3 alive, FFA, V4 | 60 | 0 / 0 | 0 | 13.5 ms | **1** | up to 10.6 s | 0 | **1 run pinned for 30 s** |
| check.py, both bundles, 11 maps + 12 edge streams, 1-CPU quota | 46 | 45 PASS, 1 FAIL (hello 3 s) | 0 at 50 ms | bot 12.0 ms, round trip 17.8 ms | - | - | - | - |
| bundles as processes, 11 transformed maps x 2 seeds x 2 bundles | 44 | 0 | 15 sim-side (see F8) | bot **16.4 ms**, 0 slow ticks | 0 | 0 s | 0 | - |

**Squad posture never latched FFA.** That held in 168 squad matches. FFA latched in 22 of 24 FFA matches, between
24 and 42 s [S].

**Pocket starts escaped.** There were 36 of them, in the 6 largest enclosed pockets including the 10,033-cell one.
Small pockets took 1-5 s and the big one 8-17 s [S].

**Corner starts outside the zone cost 93-192 HP.** These starts were 76-132 m outside. Getting in took 4.6-9.6 s;
the floor at boost speed is 4-7 s.

**Other start conditions were clean:**
- Zone edge at t=150 s, 20 m outside: 42 HP.
- Low hp (12%) and map edges: nothing abnormal.

**Endings, FFA, all others full hp:**

| scenario | wins (V4 and KS identical) | mean rank |
|---|---|---|
| last 2 at t=300 s | 11/12 | |
| last 4 at t=300 s | 4/12 | 2.50 |
| last 4 at t=372 s (final shrink) | 9/12 | |
| last 3 at t=268 s | 29/60 | 1.70 |

**Map independence still holds.** All 11 transformed maps PASS for both bundles. lift40 and v3dir (hello rewritten to
`v3/`) replay base exactly. Hello layouts `v3/`, `level/world.json + height.i16`, flat `world.json` and no `files`
all load the map. RB1 works.

## 2. Failure modes, ranked by the points they can cost

### F1. Late-zone centre that cannot be reached: pinned, then death in the zone at full hp (final: HIGH; practice: ~0)
- **Seen [S]:** 2 of 72 late starts.
  - Seed 3009, last 4 at t=300 s: pinned at (146,-103) from 305 s to 370 s. Then 1400 HP of zone damage in 8.7 s at
    160 dps, place 2 of 4 with 0 hp lost to weapons.
  - Seed 5022, last 3 at t=268 s: the same pattern.
  - Both goals lie inside buildings: (143,-160) in prism 49 (top 25.7 m) and (-137,-143) in prism 57. `findPath`
    returns ok:false (`probe.mjs`).
- **Frequency [S/A]:** `zonestat.mjs` drew 2000 seeds with the simulator's zone draw. The late centres (next radius
  70 / 25 / 0) have no standable main-component cell within 24 m in 4.5% / 4.7% / 4.9% of seeds. About 30% of them
  sit on a prism.
- **Code site:** `bot/lib/mover.js` `zoneGoal()`.
  - In the late branch `let rg = late ? 0 : ...`. The 6-step search `nearestPassable(z.nx + ux*rg, ..., 24)` with
    `rg *= 0.7` cannot move a goal at rg = 0.
  - The stuck handler's `zg.alt` rotation (mover.js:484) is a no-op at rg = 0.
  - `moveTo()` never abandons in ZONE mode (`B.mode !== 'ZONE'`). Its "no path" branch slides at the goal, so the
    mech oscillates N/S against the wall at 2-6 m/s. The speed-based stuck metric misses that; `pinned.py` catches it.
- **Fix ZG1 (~25 min):** when the late search accepts nothing, take the nearest cell of our own (or the main)
  component to the next centre.
  - Search radius `max(24, min(80, z.nr))`, on the 2 m grid, which is cheap.
  - Use `rg = 0.5 * z.nrEff` for the `zg.alt` alternates in the late zone.
  - Apply the same check in the final-shrink branch (moving centre: no passability check today) and the `raceOn`
    branch (`nearestPassable(..., 6)` only). See F3.
- **Expected:** practice +0.00 [S]: 0 of 120 squad sim matches lived past 265 s, and the maximum was 161 s.
  - Final: about +0.02..+0.05 per match [A]. That assumes about 5% of late phases and that half our final matches
    reach t > 265 s [N], for 1-2 places when it hits.
- **Risk:** it changes nothing where the old search succeeds.
- **Test:**
  - In `tools/panel_r7/stress`, run `PR7_SEED0=3009 bun force.mjs ov_v4.json t out/t.json late4:1` and the same with
    `PR7_SEED0=5022 ... late3e:1`. Today both give `cause:"zone"`. The fix passes when `zoneDmg` is under 300.
  - The 12-seed late4/final4 sets and the 60-seed late3e set must stay identical elsewhere.

### F2. Zone-blind late path: a 4x detour out of the circle (final: MEDIUM-HIGH; practice: ~0)
- **Seen [S]:** 2 of 72 late starts.
  - Seed 3010 (last 4 and last 2): 12-13 s outside the zone at 100 dps, 1225 / 1320 HP. It died to a gun in the
    last-4 run.
  - Seed 5010 (last 3): 10.6 s outside, 1060 HP, then killed.
  - In both, A* to the late anchor (the next centre) is 336-349 m long against 78-83 m straight. It runs north
    through (5..7, -12..-28), out of the live circle. In seed 3010 the mech was 13 m from the next circle's edge
    when it turned away.
- **Code site:** `mover.js` `zoneLegs()` calls `moveTo()`, which calls `plan()`, which calls `nav.findPath` with no
  zone cost (mover.js:31). The late `zoneGoal` always targets the centre.
- **Fix ZG2 (~35 min):** in the late branch, when `nav.pathLength(me, goal) > 1.5 * straight + 40`, try about 12
  candidates at radii {0.3, 0.6} x `nrEff` around the next centre.
  - Take the shortest path whose straight part stays inside the current circle.
  - Re-evaluate at most once per 2 s, guarded by `fuse()`.
  - Alternative: a `costFn` in `findPath` that charges cells outside the predicted circle.
- **Expected:** final +0.01..+0.04 per match [A]; practice 0.
- **Risk:** one extra A* every 2 s in the late zone (about 5-10 ms). Worst decisions today are at most 16 ms in
  process bundles.
- **Test:** `PR7_SEED0=3010 ... late4:1` and `PR7_SEED0=5010 ... late3e:1`, target `outZoneS` < 2.

### F3. Final point inside a building (final: MEDIUM, unmeasured)
- **What happens:** the final-shrink goal (moving centre) and the `raceOn` goal take no passability or reachability
  check. 31.6% of r=0 centres sit on a prism, and 19.7% are more than 10 m from standable ground [S/A].
- **Cost:** a mech held 10-20 m off the point leaves the circle 10-20 s before r=0 (it closes at 1 m/s). That loses
  a 1v1 hp race worth 1 point.
- **Not seen:** no loss in 12 final4 runs [S].
- **Plan:** bundle it with ZG1, nearest reachable cell to the centre. A roof hop onto low prisms through `hopPlan`
  would be optimal but adds ~20 min and needs its own test.

### F4. `hello_budget_ms` is not read (LOW unless the final cuts it)
- **Ready time:** 1.0-4.8 s, depending on machine load (shared 1-CPU quota group).
  - S_s1 took 3.2-3.7 s, and wide 4.75 s.
  - KS took 1.9-3.2 s under less load.
- **Measured:** a stream with `hello_budget_ms: 3000` FAILS for S_s1 and passes for KS [S].
- **Fix HB1 (10 min, identical at 20 s):** in `bot.js` `init()`, when the budget is under 10 s, skip the 600 ms wait
  and cap the rehearsal at 20% of the budget. [N] that the final changes the budget.

### F5. `fuseMs: 30` and the other absolute timing constants (LOW)
- **Exposure:** if `tick_budget_ms` dropped to 30 ms or less, the fuse would no longer protect the answer.
- **Margin:** process worst is 16.4 ms. A 20 ms budget stream PASSes, and a 12 ms one PASSes with 1 late.
- **Fix:** fold `fuseMs = min(30, 0.6 * tick_budget_ms)` into IO0 (5 min). Identical on the practice config.

### F6. No map: the bot runs blind and still PASSes the gate (LOW now that RB1 is in)
- **Seen [S]:** an empty `--map-dir` and a missing dir both PASS with `world=false nav=false`, ready in 1.0-1.4 s.
- **Mitigation:** RB1 covers renamed folders (6 of 6 layouts load). Keep a release-gate grep for `world=true` on
  `run_check.sh base` and `v3dir`. Nothing to build.

### F7. The FFA latch rests on a fixed clock (QUESTION, final)
- **Rule:** the latch needs at least 3 foreign deaths before t = 200 s (`stance.js` environment).
- **Sim:** it latches by 24-42 s [S].
- **Risk:** in a final of strong bots that die slowly it may never fire [N]. All FFA end-game rules (finalPoint,
  ffaTwo, ffaThree, ffaGate, ffaDropGate, the counter module) would then stay off.
- **Status:** RB2 scales the 200 s with the zone clock but not with the death rate. No proposal: a death-rate latch
  risks false latches in practice, where squad posture held 168 of 168.

### F8. Timing artefacts, not bot faults (INFO)
- **In-process:** cold first matches reach 29-47 ms. Two of them were pocket starts in a fresh V4 process, with
  3 overruns past the 27.5 ms deadline. They did not reproduce warm (12 ms or less).
- **Process runs:** bundles showed 15 "lates" over 44 matches, with round-trip maxima up to 132 ms. The bot's own
  log says worst 16.4 ms and 0 slow ticks.
- **Why the process numbers mislead:** ProcBot's clock includes the time the simulator spends on its 15 in-process
  house bots, on the same core. For timing, use the bot's `end ... worst=` line, or check.py.

## 3. On the engineer's queue (rank, refine, veto)

**Nothing in the queue is contradicted by these tests. No veto.**

**RB2/RB3:** keep them. Add `fuseMs` (F5) to the anchoring.

**RB4:** none of my runs needed it (36 of 36 pockets escaped with the campus limits). Keep the A3 count gate.

**RB6:** low urgency. The current warm-up keeps process worst at 16.4 ms.

**IO0:** low urgency on its own. Clocks of 30 Hz/3, 20 Hz/1 and 10 Hz/1 run with the literals unchanged: 48 sim
matches with 0 errors, stuck or zone deaths, and check.py PASS.

**Add ZG1 (F1 + F3) and ZG2 (F2)** to the "every build" set, behind a preset whose old value reproduces today's
behaviour (`zoneGoalFix: off -> on`). They act only in the late zone, so they leave practice actions unchanged in
every sim squad match measured (0 of 120 reached t > 265 s). They pay in the final.

## 4. Reproduce (all from `tools/panel_r7/stress/`, core 2)

| step | command |
|---|---|
| sweep | `./sweep.sh` (squad 60 + FFA 12 per SELECT, traces in `trace/`) |
| sweep summaries | `python3 -B ../../panel_r6/maps/stuck_ip.py trace out sq_v4:sq_v4.json ...` and `python3 -I pinned.py "trace/sq_v4_m*.json.gz"` |
| forced starts and endings | `./force.sh`, summarised with `python3 -I summ.py out/force_v4.jsonl out/force_ks.jsonl` |
| one run | `PR7_SEED0=<seed> PR7_DUMP=dump/x taskset -c 2 ../../../bun force.mjs ov_v4.json tag out/x.json <scenario>:<n>`; scenarios are listed in `force.mjs` `scen()` |
| map probe | `bun probe.mjs x y gx gy` (component, prism, `findPath` length) |
| zone geometry | `bun zonestat.mjs ../../../notes/hello_example.json 2000` |
| conformance | `./conf.sh` (outputs in `out/conf/`), one run with `./conf_one.sh <stream> <map dir> <bot.js>` |
| edge streams | `python3 -I mkstreams.py ../../../kit/check/stream.jsonl.gz streams` |
| maps as processes | `./mapsims.sh` (outputs in `out/maps/`, bot logs in `out/maps/logs/`) |

## Summary for the moderator

1. **Clean bill on randomness and maps [S].** 528 sim matches and 46 conformance runs gave 0 errors, 0 crashes, 0
   bot-side lates at 50 ms and 0 fuse trips (where counted). Both bundles PASS on 11 transformed maps and 4 renamed
   layouts, squad never latched FFA (168/168), all 36 pocket starts escaped, and the process worst decision was 16.4 ms.
2. **F1 (top, final only): late-zone centre inside a building.** In `mover.js` `zoneGoal`, rg = 0 plus a 24 m search
   leaves the bot pinned until it dies in the zone at full HP: 2 of 72 late starts, and 4.5-4.9% of late centres are
   unreachable [S/A]. Fix ZG1, about 25 min, no change where the search works today; +0.02..+0.05 per final match [A].
3. **F2: zone-blind A\* to the late anchor.** 4x detours out of the circle cost 1060-1320 HP in 2 of 72 late starts.
   Fix ZG2, a path-length guard with alternative goals, about 35 min; +0.01..+0.04 per final match [A].
4. **F3:** the final-shrink and race goals have no passability check, and 31.6% of final points sit on a prism. Fold
   it into ZG1.
5. **Small config guards, identical on the practice config [N for the final]:** HB1 reads `hello_budget_ms` (ready
   takes 1.0-4.8 s under load); F5 sets `fuseMs = min(30, 0.6 * tick_budget_ms)` inside IO0.
6. **Practice value of items 2-5 is about 0 [S]:** no squad sim match lived past 161 s. Ship them as final insurance
   behind a preset that is off at the old value, never as a scored draw.
7. **No veto on RB2-RB6 or IO.** RB4 was never needed (36/36 pockets escaped); IO0 is low urgency (30, 20 and 10 Hz
   clocks ran clean); gate timing on the bot's `worst=` line, not ProcBot round trips (F8).
8. **Questions:**
   - Gameplay: how often does a real FFA final reach t > 265 s with us alive? That sets the ZG value.
   - Gameplay: does the FFA latch (3 foreign deaths before 200 s, F7) need a fallback for slow finals?
   - IO: is one extra A\* every 2 s in the late zone acceptable for ZG2?

Memo: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r1_stress.md
