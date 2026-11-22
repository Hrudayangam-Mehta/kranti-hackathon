# checkR4a: independent check of build R4a (checker, Opus sub-agent; 19:55-20:22 UTC Sat Nov 21)

Verdict: **PASS.** R4a matches notes/build_spec_r4.md section 2 in my own scenarios. Identity with hunt and seek off holds
on every source I have, for the V1 and V4 SELECT and for the plain defaults. H, HL and S are inert in FFA. There is no
FFA latch in any squad match, and the build is deterministic in process, over the pipe and under CPU load. Fuzzing
found no failure. package.sh rebuilt a byte-identical dist and the release gate says GO.

Five findings follow in section 7. None of them blocks pushing the H, HL or S arms.

I did not edit bot/. Its hashes equal tools/r4a/bot_final.sha256 before and after my checks. Nothing was pushed or
submitted. Scripts and raw outputs are in tools/checkR4a/ (out/: id, det, tim).

## 1. My own scenarios (tools/checkR4a/scen.js: 25/25 PASS, out/scen_run1.txt)

Each scenario was run at its boundary values. Arms: H = retreat d3 + hunt h50, HL = d3 + lite, S = d3 + seek on.

**Parameters**
- Snapshot resolveParams against bot/lib, with hunt/seek off both explicit and by default: 0 R3a2 keys changed (V1
  and V4), 60 keys added (hunt50, seekOn, h50*), all flags false.
- Every value in table 2.1 checked.

**burst3**
- Reproduces GP table 1.3 within 1% at every cell (30/60/100/130/160 m; gun at 0 and 5 cubes; gun + laser at 0 and 5;
  gun + lightning). It also equals my own closed form exactly.
- Edge cases:
  - Reloading 1.2 s gives floor(1.8/cd) shots; 4 rounds give 4 shots.
  - The beam counts at cooldown + charge = 1.45 s and not at 1.55 s.
  - Rear x1.5; mortar carrier x1.6.
- TTK: 12 rounds at 2.65 s, the 13th after the reload, 1400 hp gun-only = 99.

**Gate**
- Opens on current hp at hp = 2 x burst - 1 and not at +1.
- A fresh 1400 hp mech is closed from the front and open from the rear.
- It needs a line (ours or its) within 1 s and a range within 200 m. It never opens on an NPC or an unlisted mech, or
  when our hp is below 35%.
- Reserve: 400 dps closed, 20 dps open, the edge exact at 0.30 x maxHp, finishable within 1.5 s always open.
- IN = 98 x hit(d) (+117 with a laser) or the measured dps; stale lines and NPCs ignored.

**Closed loop**
- T6: a fresh 1400 hp mech at 80 m, gun only. H and HL fire 0 shots in 5 s; off and S fire 12.
- The same mech at 600 hp is engaged at once.
- The same mech is answered at 26.0 s when it aims, and 0.05 s after its first hit.
- No start before 20.0 s.
- Gun + laser at 115 m: 1400 hp engaged, 1500 hp not.

**Commit and LOSING**
- Commit: kept while picked, cleared with no pick.
- Leave rules: at 3.1 s without our damage but not at 2.9 s; with the laser cooling 1.2 s but not 0.9 s; on death.
- T9 with 2 lines at 45% hp: H stays in FIGHT and never loses, while V4 LOSES and disengages.
- At 24% H loses. With 3 lines it loses at 39%, but not at 41%.

**Pulse**
- A kill with 1 other line and tCover 1.0 s gives a 4.0 s cap (40 decisions). It ends when loaded at 2.4 s.
- No pulse with tCover 2.5 s, with lite, or with no other line.
- Trigger (b) fires.

**Firewall** (T12/T13). These cases are byte-identical to off over 30 s for H, HL and S:
- forced FFA;
- a foreign death at 15 s;
- next radius 65 m;
- 3 alive.

The control case differs.

**Seek**
- A listed prey at 150 m: 'hunt' legs, stopping at 88 m.
- A remembered prey: still the goal 8 s after it vanished, dropped by 13 s (interpretation 1 holds).
- Prey cost:
  - 700 hp at 170 m is preferred over 1400 hp at 150 m;
  - the nearer of two equal mechs;
  - crowd +100.
- Sound goals:
  - a mid gun sound gives (64.8, 101.0);
  - a far laser sound gives 200 m along the sound.
- Ring: 123 m radius, nearest point first, then 30 degree steps.
- No seek at 55% hp or before 20 s. A nearby cube is grabbed first.

## 2. Identity, inertness, latch (my recorder tools/checkR4a/rec.js; 297 recordings, out/identity_compare.txt)

Sources (37): 9 recorded streams in auto and squad, 5 forced-FFA streams, simulator squad seeds 1-10, FFA 411-414.

| Comparison | Result |
|---|---|
| Snapshot bot_r3a2 vs bot/lib, hunt off + seek off, V1 SELECT | **37/37** byte-identical |
| Same, V4 SELECT | **37/37** |
| Same, plain defaults | 37/37 |
| FFA inert vs the snapshot, on 14 FFA sources: H | 14/14 |
| FFA inert: HL | 14/14 |
| FFA inert: S | 14/14 |
| FFA inert: V1 + h50 | 14/14 |

- In auto posture the hunt was open for 154-255 decisions before the latch in every FFA source, with commits in 7 of
  9, and still changed nothing.
- **No FFA latch** in squad matches: H 0/20, HL 0/10, S 0/10, V1 + h50 0/10.
- Foreign death before the latch: 1/20 (seed 19 at 74.8 s), the same as the engineer found.
- 0 errors and 0 fuse trips in the final set. Seven runs had tripped the fuse in a first 3-lane batch, and the
  different kit_ffa run was one of them; rerun one at a time, all identical.
- At most 1 A* per decision.

**Simulator sanity** (uncalibrated, information only). It reproduces the engineer's numbers exactly.

| Variant | Score (seeds 1-6) | Kills/min (seeds 1-6) |
|---|---|---|
| V1 | 3.50 | 2.78 |
| V4 | 3.83 | 2.97 |
| H | 3.00 | 2.33 |
| HL | 3.33 | 2.58 |
| S | 3.50 | 2.60 |

Over seeds 1-20, H scores 3.70.

| | V4 | H | HL | S |
|---|---|---|---|---|
| Roam share, seeds 1-10 | 15.9% | 12.4% | 12.6% | 11.7% |

Stuck 0, zone deaths 0.

## 3. Determinism (out/determinism.txt, 35/35 identical)

- **In process, H on 9 sources:** a rerun and a rerun with 2 busy loops on the same core are both identical to the
  batch.
- **The shipped dist/bot.js over the pipe**, on long11, ffa_s1, the kit stream and long23p, is identical to the R3a2
  checker's answers from the R3a2 bundle. That is bundle-level identity.
- **A scratch H bundle** (tools/checkR4a/hbuild, the SELECT edit only), on the same 4 streams: core run twice,
  2-process load and readable source are all identical.

## 4. Fuzz (out/fuzz_inproc.txt, out/fuzz_pipe.txt)

- 3000 mutated observations per configuration: H auto / squad / FFA, HL squad, S squad, V1 + h50 squad, H + seek auto.
- Extra mutations target the hunt code: sounds, kill events, the hp edges of the gate, LOSING and seek, the zone and
  alive edges of the firewall, t at 20 s, and weapon states.
- Result: 0 throws, 0 invalid actions, 0 errors, 0 fuse.
- The H bundle over the pipe: 2949 valid answers, identical with and without load.

## 5. Timing on one core (out/timing_report.txt, out/tim)

Setup: core 0, Dockerfile JSC limits, per-decision minimum over 3 repetitions, H against the V4 snapshot on the same
observations.

- **Hunt hooks** (including the seek's own moveTo): max 2.73 ms on the streams and 6.19 ms in the simulator; mean
  0.004 ms.
- **Worst decision**, H against V4:

  | | H | V4 |
  |---|---|---|
  | Streams | 11.41 ms | 10.51 ms |
  | Simulator | 19.24 ms | 21.18 ms |

  T17 (V4 + 3 ms) is met.
- **A\***: at most 1 per decision (at most 1 extra).
- **Worst aligned extra: 9.07 ms**, once (long4800 #354; 5.75 ms on a rerun, see section 7).
- package.sh conformance: p99 8.2 / max 25.0 ms, PASS (machine shared, see below).
- Release gate R10b: 0 late of 3939, p99 8.19 / max 19.4 ms.

## 6. Suites, package.sh, release gate

- **Suites on core 0:**
  - test_brain 108/108. All 93 R3a2 test names are present and pass, plus 15 new h50 tests; the engineer's "92 + 16"
    is a miscount.
  - test_world 39/39, test_counters 15/15.
  - test_requests 12/12 on the rerun. The first run gave 10/12: two decision-time checks failed (slowest 134 ms)
    while other agents' jobs (ledger.js, rustc) loaded cores 0-3.
- **tools/package.sh:** PASS. dist/ is byte-identical: bot.js 216928 bytes, sha256 d3197183...
- **Release gate:** `GATE_CPU=3 GATE_WAIVE=H9-method-exposure GATE_SRC=bot tools/release_gate.sh dist` gives **GO**
  (35 PASS, 1 waived). R11 and R11b pass.

## 7. Findings for the lead (none blocks)

1. **The retreat pulse can chain past 4 s.**
   - What happens: at the cap, pulseUpdate falls through to its start test. While the burst stays spent with 2 or
     more lines, a new pulse starts in the same decision. My unit run pulsed for 100 of 100 decisions, starting once.
   - In the simulator it never happened: 0 back-to-back pulses in 20 seeds, longest pulse 2.4 s.
   - Fix if wanted: no new pulse within about 1 s of a pulse end.
2. **The design shift sits in LOSING, not the gate.**
   - Every hostile pick becomes the commit, so under H or HL the leader's d3 thresholds give way to 25% / 40% with 3
     lines in most fights.
   - DISENGAGE share in the simulator: HL 5.7% against V4 9.5%.
   - This is faithful to spec 2.3. It is the likely source of the lower simulator kill rate (unverified).
3. **Lightning range is overstated in the gate.** h50LightR is 60 m, but the lightning range in the config is 45 m.
   burst3 counts 480 damage at 45-60 m that the bot cannot deliver from there. This is faithful to the spec and GP
   1.3, and lightning is rare in SQUAD play.
4. **The timing outlier is existing code.**
   - The 9.07 ms extra is one 25000-node capped A* in the existing regain leg. The H brain reaches it after the hunt
     changed the target; non-A* extra 0.03 ms (tools/checkR4a/prof.js).
   - The new code itself stays at 6.2 ms or less.
   - This is the same class as the R3a2 fuzz outliers.
5. **The pre-latch exposure is by design.** In a final, the hunt acts before the first foreign death. Here every FFA
   source stayed identical because those deaths came at 15-25 s.

The engineer's nine interpretations hold in the code. I tested 1, 3 (gun-only commits leave on death or 3 s without
our damage), 4, 7 and 9.

## Reproduction (P = project root)

```
taskset -c 0 $P/bun $P/tools/checkR4a/scen.js                                   # 25/25
STAGE=A $P/tools/checkR4a/batch.sh; STAGE=B ...; STAGE=C ...; $P/bun $P/tools/checkR4a/compare.js
CORE=1 $P/tools/checkR4a/det.sh                                                  # 35/35 identical
taskset -c 3 $P/bun $P/tools/checkR4a/fuzz.js 3000 $P/tools/checkR4a/out/fuzz3000.jsonl.gz
CORE=0 $P/tools/checkR4a/timing.sh && $P/bun $P/tools/checkR4a/timing_report.js
taskset -c 0,1 $P/tools/package.sh
GATE_CPU=3 GATE_WAIVE=H9-method-exposure GATE_SRC=$P/bot $P/tools/release_gate.sh $P/dist
```
