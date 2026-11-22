# Independent check of pass 2b (checker, Opus sub-agent; 10:14-10:45 UTC Sat Nov 21)

I did not edit bot/ (sha256 of every file is the same at the start and the end, and equals
tools/pass2b/bot_final.sha256). My scripts and raw outputs are in tools/check2b/ (out/ holds the results).
Nothing was pushed or submitted.

Verdict: identity, latch, determinism, fuzz, timing, suites and conformance PASS. Seven merged behaviours PASS in my own
scenarios. Three items FAIL: the release gate is NO-GO on P6 (the engine change), R1b kill-drop stealing is mostly
abandoned when the survivor walks to its drops, and the farm-first gate never answers a mech that turns to us at
85-95 m and lands its first hit a second or two later.

## 1. Base

scratchpad/snapshots/bot_pass2a passes its own sha256 list. It is byte-identical to snapshots/bot_pass2a_lead and to
tools/check2a/new_tree (the code check2a verified), apart from the Dockerfile, which new_tree did not have.
dist/bot.js is byte-identical to a fresh `bun build` of bot/bot.js. Its sha256 is cb2940d3..., the same as the
engineer's.

## 2. SQUAD identity with every pass 2b switch off (PASS)

Harness: tools/check2b/dual.js. NEW is bot/lib with `select.pass2b = 'off'` forced. BASE is the snapshot. Both run in
lockstep, BASE gets a deep copy of each observation and its own Nav, and the JSON of the two actions is compared on
every decision.

| Run | Decisions | Mismatches |
|---|---|---|
| 30 stream runs (stream_dual.js, id_streams.sh): kit, 4 FFA streams, long4800 / long11 / long23p in squad and auto; kit without the map; 12 perturbed streams | 53276 (44880 pre-latch, 8396 post-latch) | 0 |
| The whole test_brain suite through the twins (tb_dual.js): the 76 old functional checks pass; the 6 pass2b checks and the timing check fail, as expected for off and for doubled work | 63708 (32870 pre-latch) | 0 |
| 10 closed-loop squad simulator matches, seeds 1-10 (sim_check.js dual) | 8112 | 0 |

In every run the latch fell on the same tick in both brains. Fuse trips 0, stage errors 0. Even after the latch, off
reproduces pass 2a exactly.

## 3. Latch, simulator sanity (PASS; information only, no gating)

- **10 squad matches, plain defaults, seeds 1-10** (out/sim_squad_plain_1_10.txt):
  - latched 0/10;
  - errors 0, stuck 0, zone deaths 0, fuse 0;
  - slowest decision 7.8 ms;
  - scores 6/5/2/4/1/2/1/5/1/4, mean 3.1.
- **Same seeds with pass2b=off:** latched 0/10, mean 4.4 (10/8/3/4/2/1/2/7/5/2).
- **4 FFA matches, seeds 11-14:**
  - latched 4/4 at 24-28 s;
  - scores 15/14/14/7, mean 12.5;
  - errors 0, stuck 0, zone deaths 0.

## 4. Determinism and fuzz (PASS)

- **Determinism** (det.js): 5 streams (kit auto, ffa_s2 auto, ffa_s3 ffa, long4800 squad, ffa_s1 squad).
  - Run twice: identical action hashes.
  - Run again with three busy loops pinned on the same core: identical hashes, fuse 0. The rehearsal reached its 4 s
    cap (3980 ms) with no effect on the actions.
  - Simulator seed 3 run twice: same hash.
  - Release gate R11 and R11b: PASS.
- **Fuzz** (fuzz.js): 3000 mutated, enriched observations per posture (squad, auto, ffa, ffa without the map).
  - 0 exceptions, 0 invalid actions, 0 internal stage errors.
  - Through the bundle as a process (pipe_fuzz.py, Dockerfile engine settings): 2845 obs lines plus 30 junk lines gave
    2752 answers, 0 bad answers, exit code 0, errors=0.
  - The 93 unanswered lines are observations whose `self` was junked; bot.js answers only an observation with `self`.

## 5. Timing (PASS)

- **One core** (core 0, Dockerfile settings with useConcurrentJIT=1, 2 runs x 9 streams, out/timing_cjit1.txt):
  - SQUAD: max 11.8 ms;
  - FFA: max 12.3 ms;
  - p99 at most 4.9 ms, 0 decisions over 15 ms.
- **The old setting** (useConcurrentJIT=0, out/timing_cjit0.txt): spikes of 14-27 ms (FFA 22.9, SQUAD 27.2). This
  confirms the engineer's reason for the change.
- **1-CPU quota, bundle:**
  - package.sh conformance on the kit stream, 6 runs: max 6.5 ms;
  - the 4 FFA streams, 8 runs: max 16.5 ms;
  - 0 late answers.

## 6. Suites (core 0)

| Suite | Result | Note |
|---|---|---|
| test_brain | 83/83 | The 77 old checks run with openFarm off by the harness |
| test_brain with TB_SELECT='{}' | 64/83 | The 19 old fight-before-75-s scenarios fail, as reported |
| test_world | 39/39 | |
| test_counters | 15/15 | |
| test_requests (live copy) | 12/12 | |

I also ran the prototype's test_requests.js unmodified, with only the import paths changed (test_requests_proto.js):
7/12. Four of the five failures follow from the defaults or the live FFA play:

- the crate gate is FFA-only;
- aimCal is off;
- R1d inside the gate roams differently;
- R1a in FFA walks to the FFA post.

The fifth is real: R1b with the victim 67 m away. The death is never detected (see FAIL 2).

## 7. Behaviour scenarios (tools/check2b/scen.js; my own geometry and seeds; 11/14 pass)

**PASS:**

- **R1a.** I tested a crate that a mech 140 m away is breaking, in SQUAD at t 100 and inside the gate at t 30, and an
  FFA shooter 32 m to the side of the crate. In every case we are on the spot at the break (3.3-3.5 m), take the cube
  and the laser, and fire no shot at the crate. With R1 off, the FFA shooter gets the cube.
  - A shooter 22 m from the crate is not a steal target: stealShooterMinD is 25 m.
  - A shooter exactly behind the crate on our line reads as hostile (D0) and is fought.
- **R2.**
  - A silent mech 100-170 m behind us at five bearings is seen in 0.3-1.0 s, in SQUAD and in FFA. With R2 off, 4 of
    the 5 are not seen within 10 s.
  - A rear attacker is faced in 0.3 s (with R2 off: never).
  - The late sweep comes back to a calm 82 m mech within 1.2 s, never stares at it and never shoots it. However, it
    keeps the mech in view on fewer decisions: 46/120, against 68/120 with R2 off.
- **R3.** I found three low-wall spots of my own at 155-169 m. Laser hits: 6/6, 5/6 and 6/6, against 2/5, 0/4 and 1/4
  with R3 off.
- **C1.** I took the kit-stream house bot (read as LASER_KITER) and set it to 45%, with its torso away from us, not
  charging and not hitting us. The advice goes from LK/cover (level 1, x0.73) to LK/finish (level 2, x1.32). With
  cxFinish off, it stays LK/cover.
- **Farm-first gate.**
  - A calm mech 70 m away at t 50 gets 0 shots (with openFarm off, 16).
  - The gate ends for good at 75 s, or at 10 cubes even after the cubes drop again.
  - Shooters at 60 m (20 dps) and at 85 m (60 dps) are answered. A shooter at 125 m makes us break the line without
    firing.
- **Rule 3**, spots 5316, 5967 and 6543 (seeds 5001-6600):
  - a busy 45% mech is targeted at 1.6 s and shot at 1.7 s;
  - with ffaThirdFix off it is never shot;
  - alone, or at 60%, it is not shot;
  - a lone 38% mech is shot at 0-0.7 s.
- **Rule 4**, spots 1501-1504: inside the break we get 20.7-21.3 m from the last-seen point and stay unseen for
  9.0-9.1 s. With ffaBreakFix off this happens at 0/4 spots. With a killable 1400 hp shooter, 4/4. In the dev
  simulator (check2a rule4_sim.js), spots 403 and 405 now stay unseen for 13.7 and 13.9 s; spots 401, 402 and 404 still
  end with the shooter dead before cover, as the engineer reported.

## 8. FAIL

**1. The release gate is NO-GO.** P6-engine-limits fails in 2 of 2 runs, with 34 PASS and 1 waived:
tools/release_gate/pack.py line 14 requires BUN_JSC_useConcurrentJIT=0, and bot/Dockerfile has =1.

- Reproduce: `cd P && GATE_WAIVE=H9-method-exposure bash tools/release_gate.sh dist`
- Decision for the lead: accept the change by editing that entry to =1 (my timing in section 5 supports =1), or revert
  the Dockerfile line.
- R10b-long-timing had a maximum of 35.05 ms in run 1 and 13.16 ms in run 2, with 0 late answers in both.

**2. R1b kill drops are mostly lost when the survivor walks to its drops.** I tested 8 geometries in which we reach the
drops first (we are 30-40 m away, the survivor 65 m to the side):

| Survivor | 3 or more cubes taken | Laser taken |
|---|---|---|
| Walks to its drops | 5/8 | 3/8 |
| Stands still | 8/8 | 8/8 |

- In one geometry we got to within 5.6 m of the drops and took nothing.
- **Cause:** once the walking survivor's torso turns to us, it is hostile under D0, so we FIGHT on the standoff leg.
  In addition, steal.js `deathItem` returns -1 for a healthy survivor that aims at us within 120 m.
- **Second gap:** a death beyond 42 m (near_range minus 3) that happens while our torso looks elsewhere is never
  detected. In the prototype geometry (67 m), the death is not seen, with or without R2.
- The "stay away when it is first" part passes: with the survivor 22-25 m or 6 m from the drops, our closest approach
  is at least 35 m.
- Reproduce: `cd tools/check2b && bun scen.js --only=r1b` (trace: `bun dbg_r1b.js -22 28 70`).

**3. The farm-first gate does not answer a mech that turns to us at 85-95 m.** In the micro-arena (open ground, no
cover), a mech that aims at us from 85-95 m and lands its first hit 1.1-2.3 s later is never answered: 0 shots in 6 s
while we lose 113-248 hp.

- **Cause:** its aim makes it hostile, which starts the gate's line-break retreat. The retreat takes us beyond 100 m
  before the first hit lands. The gate measures dmgInD at the moment of the hit (120-140 m), so it never answers.
- Reproduce: `cd tools/check2b && bun scen.js --only=openfarm`, or `bun dbg_of.js 85 20 50 6`.
- **Related point for the lead (not counted as a FAIL):** a D0-hostile mech aiming at us from 60 m without firing is
  not answered either; we DISENGAGE. That is proj1's "answer only a hit inside 100 m" rule (openGuard75q).
  counter_dossier.md lesson 1 and its review say to keep D0's "answer any hostile at once, at any range".

## 9. Other notes

- The release gate's H2 change from `osu` to `\bosu\b` matches REPO_HYGIENE.md. The old substring rule matched only
  "headExposure".
- package.sh, run 3 times: hygiene is clean, and dist/ is byte-identical before and after.
