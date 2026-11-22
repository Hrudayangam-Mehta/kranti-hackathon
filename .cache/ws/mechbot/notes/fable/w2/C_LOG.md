# Wave-2 engineer C log: movement, dodging, cover, zone (q3_move.md variant 'f')

One author, no independent review. Nothing was submitted; no game server; no git. Simulator numbers are [S] only.

- 04:13 UTC Spec `redesign/q3_move.md` present (variant 'f', F1-F5). Tree = copy of `fable_work/chaos/builds/CH1_s1/bot` at
  `fable_work/w2/C/tree`. CH1_s1 has none of the architecture hooks (no B.en / B.sv / B.rng2), so the hooks below are mine and
  minimal; the integrator can map them onto HB9-HB12 later.
- 04:16 New file `lib/move2.js`; hooks in brain.js (9 one-liners) and mover.js (4); PARAMS / PRESETS / SELECT block `mv*` /
  `mv_*` (old value 'off' first). Kit stream with defaults vs CH1_s1 (`diff_stream.mjs`): 300 decisions, 0 differ.
- 04:20 `tools/test_move2.mjs` (fable_work/w2/C/tools): 26/26 PASS (one trigger scene per rule; each acts in SQUAD, forced FFA
  and one foreign death identical to 'off'). The one-foreign-death case first FAILED for mv_rim: the 1 s zone-goal cache in
  mover.zoneGoal kept a rim goal computed before the drop; fixed by keying the cache on the goal fraction (identity kept: the
  fraction is the constant P.zoneGoalFrac without B.mv2).
- 04:22 Identity (recs.js, fuseMs 1e9): CH1_s1 = tree defaults = tree with mv_meas on, byte-identical action hashes on kit
  squad / auto (24df41fd..., db31dd08...) and long4800 squad / auto (46200596... both). Closed loop: tree defaults sim squad
  seeds 1-8, 10, 11 hash-equal to `chaos/out/sim/CH1` (seed 1 a495ea21...).
- 04:27 Measurement fix (counters only): bullets come into view far from the muzzle, so the shooter attribution no longer stops at
  60 m along the path; gun hits counted for listed shooters only (as the seen count). Process note: a killed chain left an
  orphaned xargs running, so for about 6 minutes up to 4 jobs ran; all partial sims deleted, one locked chain (2 jobs) restarted.
- 04:34 Sim sanity [S], 24 squad seeds, fuseMs 1e9, nice 19, 2 jobs, CH1 SELECT (salt 1). Base = mv_meas on (hash-equal to
  `chaos/out/sim/CH1` on 24 of 24 seeds, so mv_meas is action-identical in closed loop as well). All six presets on:
  kills 108 -> 150 (4.50 -> 6.25 per match), up 16 / down 6 / same 2 (sd of the per-seed difference 3.0), alive 69.7 -> 92.7 s,
  errors 0, fuse 0, stuck 0. Counters (24 seeds): mvFlip 571, mvFlipBul 14, backOff70 2108, zigWalk 1817, arcBack 313,
  coverNear 31 / coverRefused 115, rimHold 996, rimPull 3461, zoneFarSkipped 2212; ZONE decisions 2457 -> 465.
  Intake hp/s by leg kind (base -> all): standoff 31 -> 34, grab 32 -> 26, isolate 54 -> 50, regain 24 -> 16, zone 27 -> 9;
  backoff 50, arcback 67 (selected situations). Rear share of intake 0.175 -> 0.108. House gun hit rate on us by shooter range
  (hits / bullets attributed to a listed aiming shooter): <80 m 71% -> 63%, 80-110 23% -> 29%, 110-140 23% -> 21%, 140+ 5% -> 14%:
  the simulator shows no F1 gain (its house aim model is our guess; the attribution is approximate). Decision time: wall clock
  under load average 8-18 from other jobs, so maxMs is noise (worst 188.9 ms base, 112.6 all-on; median p99 35.0 / 32.7).
- 04:40 Identity and T-F2 (recs.js): defaults and mv_meas = CH1_s1 on kit / long4800 x squad / auto (8 PASS). Forced FFA, all six
  on and each rule alone, against CH1_s1: kit, ffa_s1-4, long4800, sims 411-414 forced: 24 PASS. Env auto on the FFA streams /
  sims differs (allowed: the rules act in the SQUAD posture until the first foreign death, ticks 352-516). Squad streams with
  the rules on: errors 0, fuse 0, every rule's counter moves on long4800 alone.
- 04:46 Per-rule sims [S] (24 seeds each, mv_meas on): kills vs base 108: f1 (mv_flip + mv_zig) 97 (up 7 / down 9), mv_close 113
  (11 / 7), mv_rim 126 (12 / 7), mv_arc 112 (6 / 5), all six 150 (16 / 6). The sd of a 24-seed total difference is about 15 kills
  (per-seed sd 1.2-3.9), so only 'all' (+42, about 2.9 sd) stands out; mv_rim about 1 sd; the rest is noise. Singles add to +16,
  so most of +42 is interaction or noise. Deaths by lightning 8 -> 2 with all on (F2 backs off inside 70 m). The simulator's house
  aim and squad schedule are our own guesses: F1 rests on an exact first-order lead, which the simulator may not model, so its
  f1 result says little either way. Nothing here is an official measurement.
- 04:48 Decision time, sequential (1 job, 3 alternations, load 8-12): p99 kit 4.3 / 4.5 ms, long4800 4.6 / 5.7 ms (base / all on);
  maxMs long4800 min 13.0 / 29.4 (the all-on run spends 1616 instead of 594 decisions in FIGHT on the same observations). Time
  inside the move2 hooks (`tools/prof_mv2.mjs`): mean 0.012 ms, p99 0.06 ms, max 4.2 ms per decision on long4800; the 348 ms
  maxMs of arc seed 23 did not repeat (same hash, 6.1 and 9.9 ms on rerun).
- Open points: (1) the hooks are mine because CH1_s1 has no integrator hooks; the four mover.js hooks have no counterpart in
  architecture.md 3.3 and need an integrator request. (2) After a mid-match firewall drop, state chosen under F5 (a roam point on
  the rim, kept up to 25 s or until arrival) persists; parameters do not. (3) F1's "boost if energy > 30 while charging" is
  already CH1 boostCharge (bcEnergy 30) and was not duplicated. (4) Seen in passing: pauseMove reads `B.grab.kind`, but grabs
  carry the kind in `B.grab.obj.kind` (pauseMove lost, so this is a note only).
