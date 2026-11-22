# checkR3a2: independent check of build R3a2 (checker, Opus sub-agent; 18:05-18:32 UTC Sat Nov 21)

Verdict: **PASS.** Every item of notes/build_spec_r3a2.md behaves as specified in my own scenarios. The 5.02 identity
holds everywhere I tested it, including FFA. The final-only items are inert in SQUAD. The build is deterministic (in
process, over the pipe and under CPU load). Fuzzing found no failure, timing is within the budget, package.sh passes
and the release gate says GO. Four findings below need a decision by the lead; none of them blocks a submission.

I did not edit bot/. Its hashes equal tools/r3a2/bot_final.sha256 before and after my checks. dist/ was rebuilt by
package.sh and came out byte-identical (bot.js sha256 021e65e6...). Nothing was pushed or submitted. Scripts and raw
outputs are in tools/checkR3a2/ (out/ subfolders: id, det, tim).

## 1. Spec items, my own scenarios (tools/checkR3a2/scen.js: 34/34 PASS, out/scen_run1.txt)

Each item was tested at its boundary values and against the 5.02 values. I wrote out the 5.02 preset values myself
rather than importing SELECT_502.

- **P1 fightEarly.** The aim clause engages from 20.0 s at 185 m, within 0.18 rad; it does not engage at 195 m or at
  0.30 rad off. The low-hp clause engages at 38% / 155 m, but not at 42% / 155 m or at 38% / 165 m. The closing clause
  engages at 4 m/s from 179 m, but not at 2 m/s. Unit tests: the hit clause holds at 5.9 s and lapses at 6.1 s or at
  245 m; the near clause holds at 59 m and not at 61 m; there is no engagement without a line. After a foreign death
  at 16 s the guard runs to 40 s (engaged at 40.0 s). The FFA posture and the 5.02 values never engage. Defaults:
  openFarm off; V2 turns openFarm back on.
- **P2 laserEcon.** A laser seen at 190 m is the first loot, ahead of a cube at 14 m and a crate at 30 m (5.02 takes
  the cube). A remembered laser at 235 m is chosen; at 245 m it is not. The zone gate still applies. A lightning
  pickup keeps the 120 m limit (115 m taken, 150 m not). No mortar in SQUAD; the FFA posture and 5.02 still take it.
  A laser replaces a held lightning. The mid band (115, 100-130) is set, and a fight settles at 129.8 m (5.02: 168 m).
  Note: vision is 200 m, so the 240 m reach only matters for remembered pickups.
- **P3 focus.** Property test on 56 random sets of 2-4 mechs. In 56/56 the first pick is the argmin of the spec cost
  (distance + 0.1 per hp, -200 at <= 30% or finishable, -40 if it hit us within 4 s, -15 if closing faster than 1 m/s,
  +240 with no line), and tr.index = 1000 - cost exactly. Stickiness: a 150 m target is kept against a fresh mech at
  40 m (5.02 switches). Torso veto: it switches only when the target is >= 38% and we have not hit it for 2 s (37%:
  kept; hit 1 s ago: kept; 5.02 switches in all three cases). A target under 25% is never left.
- **P4 pulseRetreat.** I ran a 16-case LOSING matrix; every case matched:
  - 2 near: losing at 54%, not at 56%. 3 near: losing at 79%, not at 81%.
  - 35% + 10 points rule: 34% against a 45% target loses; against 43% it does not.
  - Only listed mechs within 160 m count.
  - Cancels: target < 25% only when n <= 2 and our hp > 20%; late zone nr <= 70 (nr 71 still loses); 3 alive (4
    alive still loses).
  - With no hide cell found the bot stays in FIGHT.
  - Tail: the last raw LOSING decision at 101.0 s keeps LOSING through 102.4 s; the bot is in FIGHT at 102.5 s.
  - No HEAL in SQUAD (30% hp, 12 s quiet). The FFA posture and 5.02 heal: 120 decisions each.
- **P5 boostSpend.** 67/67 eligible frames boosted. No P5 boost at or below 25 energy, and none outside the rule. It
  resumes below 40 energy within 3 s of having been under 30, so there is no hysteresis. The FFA posture and the 5.02
  values never fire it. A lightning holder never fires it inside its 45 reserve.
- **P6.** Crates are farmed at 55% hp and not at 45%; 5.02 farms only above 90%.
- **P7.** The upgrade order starts plating, armor, servos. [nanites, servos, gun_damage] -> servos (5.02: nanites).
- **F1** (FFA, <= 3 alive). No drop task with a mech 100 m from us, or with a mech 190 m from us but 108 m from the
  drop. With 5 alive, and with the 5.02 values, the drop is taken.
- **Z5.** raceOn from 375 s (5.02: 390 s). With the point occupied, the goal is (5.90, 0.50), exactly r + r + 0.4 m
  on the current-centre side. From 405 s the bot picks the smallest positive E - E_us, or our attacker when we are on
  top, and fire is never held.
- **Z8.** Gap +300 (WAIT): no first shot, a finish is allowed, the stance is DEFENSIVE. Gap -300 (CLOSE): it shoots
  only with an opening from outside the other mech's wedge. +299 is DUEL and +300 is WAIT. DUEL gates on the 0.9
  estimate. The 5.02 values set no mode.
- **Z9.** With 3 alive there is no first shot on a 43% mech outside a 60 dps zone; the same mech opens at 4 alive
  (Z10) and with ffaThree off. A finish (<= 40%) opens. A hostile mech is still a candidate. No OFFENSIVE stance.
- **Z10.** It shoots a 50% mech outside a 60 dps zone at 150 m. It does not at 35 dps, at 64% hp, at 195 m, while we
  take over 100 dps, or with the 5.02 values. Gate post (0, 115): 25 m inside the next edge, on the mech's bearing.
- **Variants.** V1 has everything on. V2, V3 and V4 each change only their own item. `r3a2: 'off'` gives the 5.02
  values.

## 2. Identity, inertness, latch (my recorder tools/checkR3a2/rec.js; 222 recordings, out/identity_compare.txt)

The sources are 9 recorded streams × {auto, squad} plus closed-loop simulator matches: squad seeds 1-10 and FFA
seeds 411-414.

- Snapshot bot_502 against bot/lib with my written-out 5.02 values: **32/32 byte-identical**. This includes the FFA
  streams, post-latch play and the four FFA simulator matches.
- Snapshot against `r3a2: 'off'`: **32/32**.
- Final-only items inert in SQUAD, 19 SQUAD sources each way:
  - 5.02 practice values + F1/Z5/Z8/Z9/Z10 on, against the snapshot: 19/19.
  - V1 against V1 with the five final-only items off: 19/19.
- No FFA latch in 10 squad matches for the snapshot, V1, V2, V3 or V4 (0/10 each).
- 0 brain errors or fuse trips in all 222 recordings.
- Old tests: diffed against tools/rc/test_brain.js.orig. Only the preset pins (third argument of createBrain) and the
  presets-test baseline changed; no expected value was edited.
- Suites on one core: test_brain 93/93, test_world 39/39, test_counters 15/15, test_requests 12/12.

## 3. Determinism (out/determinism.txt, 28/28 identical)

- In process: V1 on 8 sources (3 squad, 2 FFA, 3 streams), run again normally and again with two busy loops pinned
  to the same core. Both match the batch byte for byte.
- Shipped bundle, lockstep over stdin/stdout (pipe_det.py), on long11, ffa_s1, the kit stream and long23p: core 0,
  core 1, core 0 with two busy loops (worst answer 34 ms), and the readable bot/bot.js. All identical.

## 4. Fuzz (out/fuzz_inproc.txt, out/fuzz_pipe.txt)

- 3000 mutated observations per configuration (V1 auto, V1 FFA, V1 squad, 5.02 FFA), each into one stateful brain.
  The mutations target alive 2/3, zone radius / next radius / dps / times, drops, max_hp, laser charge, offers,
  events, pickups at 230 m, and time jumps to 376-415 s. Result: **0 throws, 0 invalid actions, 0 errors, 0 fuse.**
- The bundle over the pipe on the same 2926 observations (those that still have a self) gave 2926 valid answers, 0
  errors, and was identical with and without CPU load. Move length can reach 1.00007; that is the sanitiser's
  4-decimal rounding, the same code as 5.02.

## 5. Timing on one core (out/timing_report.txt)

Setup: core 0, nothing else of mine running, Dockerfile JSC limits, 3 repetitions, per-decision minimum. V1 and the
bot_502 snapshot see the same observations.

- **Real streams (18 runs).**
  - Worst V1 decision: 9.84 ms (5.02: 8.73 ms); p99 at most 7.18 ms.
  - Worst extra per aligned decision: 4.32 ms.
  - Path searches per decision: at most 1 in both builds; at most 1 extra.
- **Simulator matches** (single run each, unfiltered): V1 worst 16.7 ms, 5.02 worst 26.5 ms. p99 is 4-7 ms in both.
- **Fuzz stream, squad env.** Three decisions are 9-11 ms slower than 5.02. I profiled them (tools/checkR3a2/prof*):
  - Both builds are in ZONE mode and run one path search there.
  - V1's history-dependent zone goal is unreachable on that garbage zone input, so the search runs to the existing
    25000-node cap (5-12 ms).
  - Reverting any single preset does not remove it; only `r3a2: 'off'` (full history identity) does.
  - 5.02 pays the same capped search at other decisions: its worst decision with a search is 15.1 ms.
  - This is not new code, and the bot never makes more than one search per decision.
- **Release gate** (1-CPU quota): R3 p99 2.2 / max 3.2 ms; long run p99 3.97 / max 10.36 ms, 0 late.

**Budget** (at most 8 ms extra and at most 2 extra searches per decision): met.

## 6. package.sh and release gate (out/package_run.txt, out/release_gate_run.txt)

- package.sh, pinned to cores 0-1: PASS. Hygiene is clean. Conformance with the map: p99 3.5 / max 5.6 ms; without
  the map: PASS. dist/bot.js is 206455 bytes, sha256 021e65e6..., the same as the engineer's build.
- `GATE_CPU=1 GATE_WAIVE=H9-method-exposure GATE_SRC=bot tools/release_gate.sh dist`: **GO (35 PASS, 1 waived)**. R11
  determinism and R11b bundle = source both pass.

## 7. Findings for the lead (none blocks a submission)

1. **The R2 rear pick does not follow the binding spec text.** Spec line 14 lets the R2 rear pick switch when the
   target is >= 38% and we have not hit it for 2 s. tactics.js:308 (`if (B.scanner && !fa)`) never runs the rear
   pick in SQUAD under `focus: 'add'`. That matches top5_synthesis.md line 120 ("rear pick runs in FFA only") but not
   the build spec. The torso veto still covers attackers of 60 dps or more that sit more than 80 degrees off.
   - Effect: a weaker or less-offset rear attacker no longer turns us in practice.
   - Decide which text is meant. A spec-faithful version would gate the rear pick like the veto keep rule.
2. **Z8 and Z6 are only partly built** compared with the panel_r3_scenarios.md rows.
   - Built: the Z8 engagement rules (WAIT / CLOSE / DUEL).
   - Not built: the WAIT hidden post within 0.3 nr of the next centre from 330 s, CLOSE's "farm to 10 cubes and
     plating first", and Z6, the late upgrade order (listed as "part of Z5").
   - The engineer's report does not mention these. They are FFA-only and cannot change practice scores.
3. **Z8 can briefly compare against a dead mech (minor).** twoUpdate takes the most recently seen track with
   conf > 0.05. The track of a mech killed by someone else stays in the list for about 12 s, so the max-hp comparison
   can briefly use a dead mech.
4. **The engineer's FFA-opening risk is confirmed.** On FFA seeds 411-414, V1 scored 15 / 9 / 8 / 14 against 5.02's
   15 / 14 / 4 / 12. Seed 412 died at 55.9 s; 5.02 survived to 286.6 s.
   - Cause: openFarm off removes 5.02's incidental pre-latch protection.
   - V2 keeps it. The simulator is uncalibrated, so this is sanity only.
   - Squad simulator, seeds 1-10, for information:

     | Build | Mean score | Kills / min alive | Alive |
     |---|---|---|---|
     | V1 | 3.30 | 2.91 | 68.0 s |
     | 5.02 | 3.20 | 1.82 | 98.7 s |
     | V2 | 3.80 | | |
     | V3 | 3.80 | | |
     | V4 | 3.70 | | |

The engineer's stated interpretations hold in the code: the +240 m no-line cost, and the mid band and farmHp 50 also
applying in FFA. Three unflagged translations are reasonable:
- -15 for a hopper (the old ×1.3);
- +0.5 per hp in last stand;
- the P5 lightning floor (lightReserve + 10).

## Reproduction (P = project root; all on cores 0-1)

```
taskset -c 0 $P/bun $P/tools/checkR3a2/scen.js                          # 34/34
$P/tools/checkR3a2/identity.sh && $P/bun $P/tools/checkR3a2/compare.js     # 32/32, 32/32, 19/19, 19/19, latch 0/10
$P/tools/checkR3a2/determinism.sh                                         # 28/28 IDENTICAL
taskset -c 1 $P/bun $P/tools/checkR3a2/fuzz.js 3000 $P/tools/checkR3a2/out/fuzz3000.jsonl.gz
python3 $P/tools/checkR3a2/pipe_det.py 1 $P/tools/checkR3a2/out/fuzz3000.jsonl.gz /tmp/x.txt 2
$P/tools/checkR3a2/timing.sh && $P/bun $P/tools/checkR3a2/timing_report.js
taskset -c 0,1 $P/tools/package.sh
GATE_CPU=1 GATE_WAIVE=H9-method-exposure GATE_SRC=$P/bot $P/tools/release_gate.sh $P/dist
```
