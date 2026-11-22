# Independent check of pass 2a (checker, Opus sub-agent; 08:57-09:25 UTC Sat Nov 21)

I did not edit bot/. My scripts and outputs are in tools/check2a/ (out/ holds the raw results).

Verdict: SQUAD identity, the latch, gating, the suites, timing and conformance all PASS. Two FFA rules FAIL as
behaviour: rule 3 (the third-party shot never fires) and rule 4 (the sight break rarely happens). One part,
the beam-clock legs, is unverified. None of this affects SQUAD play.

## 1. What I compared against (the pre-pass-2a code)

The base is tools/pass2a/base_lib plus tools/pass2a/base_bot.js, which is the engineer's snapshot. I checked it
against evidence the engineer did not produce:

- Its sha256 values match tools/pass2a/base_lib.sha256.
- Seven files are byte-identical to tools/fix2/base_lib (the 07:54 snapshot): aim, nav, world, counters,
  senses, stance and firecontrol.
- The five files that differ are exactly the files the fix2 log lists as changed: mover, tactics, economy,
  brain and params. They contain the fix2 additions (killCubeR, killReachOk, lateLeash and the rest).
- A bundle rebuilt from the snapshot (tools/check2a/base_tree) is exactly 125650 bytes. That is the bundle
  size in fix2/out/package_final.txt (08:19).
- The pass-2a code, run on squad seeds 1-20, reproduces fix2/out/sq20_final.json (08:18) on every seed:
  score, kills, time alive and cause all match (20/20, mean 4.15).

I did not use tools/brain_fix or /root/mech_backup (06:50), because both are older than fix2.

## 2. SQUAD identity (PASS)

Harness: tools/check2a/dual.js. It runs the new brain and the base brain in lockstep on the same
observation; the base gets a deep copy and its own Nav. It compares the JSON of the two actions on every
decision.

| Run | Pre-latch decisions | Action mismatches |
|---|---|---|
| Base 61-check suite, run through the dual harness (tb_dual.js); 184 brains, still 61/61 | 31499 | 0 |
| 20 simulator squad matches, closed loop (sim_dual.js 1 20) | 15450 | 0 |
| Streams (stream_dual.js): kit in squad and auto, with and without the map; 4 captured FFA match streams in squad and auto; 2 perturbed streams (seeds 7 and 23) | 10208 | 0 |
| 4 FFA simulator matches, the part before the latch | 1310 | 0 |

Every pair agreed on the env, and the latch fell on the same tick in base and new: kit stream tick 498, FFA
matches ticks 640, 680 and 676. In auto mode the kit stream has 249 identical decisions before the latch.

## 3. Latch in 20 squad matches (PASS)

Seeds 1-20 (out/sim_squad_1_20.txt): the latch tripped in 0 of 20 matches, for the new brain and the base
brain alike. Fuse trips 0, stage errors 0.

## 4. No FFA rule can fire before the latch (PASS)

Code review:

- Every new decision is gated on `B.env === 'FFA'`, either directly or through `ffa.on()` / `ffaR()`.
- `B.env` is set only by the D12 latch in stance.js (unchanged) or by the plain override `env: 'ffa'`. There
  is no preset for it, and bot.js passes no overrides.
- Code that also runs outside FFA is bookkeeping only:
  - `cx.update` reads the observation and has its own try/catch;
  - `counterAdvice` returns neutral advice (dodge 0.5, so `dodgeW` stays at the D4 weight);
  - `ffa.update` only tracks the alive count;
  - senses gained new fields only;
  - the tactics `aimN` counter does not change `hostileAimT` when `aimDwellAll` is off.

The empirical evidence is section 2: 0 pre-latch mismatches in 58467 decisions.

## 5. FFA rules in scenarios I built (tools/check2a/ffa_scen.js: 15/17 pass; rule4_sim.js)

**PASS:**

| Rule | Result |
|---|---|
| 1, hide budget | 0.75 / 0.5625 / 0.4219 s for 0 / 1 / 3 cubes, 0.42 s when cubes are unknown. After a beam the measured 0.55 s is used (scripted 0.6 s). The reach formula matches, and the beam-hide decision agrees with it 24/24. |
| 1, beam clock | 13 of my own `peekOpen` state cases pass. |
| 2 | Laser charges 0.397 rad off target and the beam hits (with the rule off: 0.001 rad). |
| 5 | Minimum distance 47.7 m; with the rule off the carrier closes to 0 m. There is no reaction when we hold lightning and have at least its hp. |
| 6 | Gun silent at a 0.5 s reverser and fires at a 1.7 s one. The steady waiver is capped: fires at about 0.7 s of flight, not at about 0.88 s. |
| 7 | 0.36 m from next_center, against 4.4 m in SQUAD. Identical to rules-off before 390 s. |
| 8 | Courtesy offset 0.300 rad; the cube near the calm mech is left; a 32% mech is shot. |
| 9 / 8d | Breaks at 45% and at 60% inside 115 m; no break at 60% from 150-158 m, nor at 80%. |
| 10 | No break for a 35% hostile alone; a break once a second mech has a line on us. |
| K2 | In FFA 1-2 aiming decisions are not hostility, 3 are; with the `aimDwell` preset it applies in SQUAD too. |
| Boost rarely | Zone boosts kept (58); rush-in boosts 0, against 18 with the rule off. |
| Hider counter | Farming starts while the hider is remembered at conf 1.0; with the rule off only once it decays to conf 0.27. |
| Module corrections | HD/pass at full hp; HD/finish at 39%, but not at 42%; HD/strafer at 6 alive; the rusher reads as BR/hold, level 2. |
| Rule 4 trigger | Breaks and answers fire (18-24 shots); with the rule off it fights. |

**FAIL: rule 3, the third-party first shot.** A busy 45% mech is targeted at 1.6 s, as specified. But
`B.holdFirst` (stance.js:141, FFA DEFENSIVE, target above 300 hp and unaware of us) holds the gun on 64 of 64
decisions, so no shot is ever fired. Any busy target between about 39% and 50% hp is never shot: below about
39% it is already a finish, and above 50% rule 3 no longer applies.
Reproduce: `cd tools/check2a && bun ffa_scen.js --only=rule3`

**FAIL: rule 4, the sight break.** The 9 s / 20 m end condition was met in 0 of 3 micro-arena spots and in 1
of 5 simulator spots:
- spots 401, 402 and 404 were never out of sight during the break, which ended only when our return fire took
  the shooter to 40% or less;
- spot 405 loops between the hide and escape legs and stays in DISENGAGE on 298 of 300 decisions, ending at
  the 30 s cap with at most 4.6 s out of sight.

The causes are head-exposed hide cells, which still count as a line of sight (losIn), and the escape leg,
which walks us back into view.
Reproduce: `bun ffa_scen.js --only=rule4` and `bun rule4_sim.js`

**UNVERIFIED: the rule 1 lzhold / lzcover legs.** They occur 0 times in 3334 FFA stream decisions
(ffa_legs.js). A hostile laser holder triggers the rule 4 break first.

## 6. Suites, timing, conformance (PASS)

- **Suites:** test_brain 77/77, test_world 39/39, test_counters 15/15. The only edit to the existing tests is
  the rusher expectation (M3).
- **Decision time, core 0, Dockerfile JIT settings:**
  - kit stream: p99 3.8 ms (base 3.5), max 8.2 ms (base 8.2);
  - FFA streams: max 11.3-24.5 ms (base 11.2-12.9), one decision of 24.5 ms in five runs; p99 2.8-5.5 ms
    (base 2.4-3.4).
- **package.sh, run twice:**
  - hygiene clean, no team names;
  - with the map: PASS, p99 5.4 / 5.7 ms, max 9.8 / 12.2 ms;
  - without the map: PASS, max 12.8 ms;
  - dist/ is unchanged.
- **Note:** the bundle now carries the module's archetype and reason strings, such as LASER_KITER and
  HD/harvest. That is for the owner to decide.
