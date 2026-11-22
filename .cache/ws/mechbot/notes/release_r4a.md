# Release R4a: variants H and HL (release engineer, Opus sub-agent; 20:23-20:43 UTC Sat Nov 21)

Verdict: **H GO, HL GO.** Each release gate reports 35 PASS, with H9-method-exposure waived. The official check passes
under the 1-CPU quota, with the map and without it. Both builds come from the same code. They differ from each other
only in the SELECT defaults:

- H = V4 settings + `hunt: 'h50'`
- HL = V4 settings + `hunt: 'lite'`
- Both have salt 0.

Nothing was pushed or submitted. /home/user/kranti-hackathon was only read: its README.md and LICENSE were copied.

| Variant | bot.js sha256 | Bytes | Gate |
|---|---|---:|---|
| H | 9ede0269781b78bbb74f1a1545562ea603e1fa269739182540d330935c43b71d | 217040 | GO (35 PASS, 1 waived) |
| HL | 55e2e1142dd70e334eb138e5cfa736895e340b061649f4bbc1a0276f41f0ed23 | 217041 | GO (35 PASS, 1 waived), twice |

Both variants share these files:

| File | sha256 |
|---|---|
| Dockerfile (= bot/Dockerfile = the repo's Dockerfile) | e04b4bec72c9507ac9d199714e2e1b4c9b6537a9f986249d6be6aa4f90d52c1a |
| LICENSE (byte-identical to the repo's) | 2838d6d1f7a64a81cbb66d1056cd3425c46b0405b560744c0474f80837bf059e |
| README.md (byte-identical to the repo's) | f289218b28c8f20e85beac222155ae132a15a282c5feb1fe3546f5941f730975 |

## 1. Checker findings (notes/checkR4a.md section 7)

The checker reported no FAIL. Finding 7.1 is the one item that departs from the spec: spec 2.1 gives h50PulseMax as the
"longest retreat pulse", and T10 says "never after 4.0 s". I treated it as a safe FAIL and fixed it in bot/.

### 7.1 Pulse chaining past 4 s: FIXED

- **Cause.** At the 4 s cap, `pulseUpdate` fell through to its start test. While the burst stayed spent with 2 or more
  lines on us, it started a new pulse in the same decision, so the pulse never ended.
- **Fix.** This is the smallest change. It touches only the h50 pulse path: hunt off and 'lite' never set `pulseUntil`.
  - `lib/hunt.js` `pulseUpdate`: when a pulse reaches the cap, set `pulseUntil = -1` and record `pulseCapT = t`. The
    start test also requires `t - pulseCapT >= h50PulseGapS`.
  - `lib/params.js`: new key `h50PulseGapS: 1.0`.
  - `lib/brain.js`: `h50.pulseCapT: -99`.
  - The loaded and finishable ends are unchanged.
  - The minified bundle differs from the checker's scratch H bundle (tools/checkR4a/hbuild/botH.js) in exactly these 4
    places (logs/bundle_diff_checkerH_vs_H.txt).
- **Regression test** (tools/test_brain.js, group h50: "h50 pulse cap"). The burst is kept spent with 2 lines on us for
  10 s:
  - Fixed: 2 pulses of exactly 40 decisions, 10 decisions apart (80 of 100 decisions), and the pulse still restarts.
  - Control with `h50PulseGapS: 0`: one unbroken 100-decision chain, which is the old behaviour.
- **Suites on core 0:** test_brain 109/109 (108 + the new test), test_world 39/39, test_counters 15/15,
  test_requests 12/12.
- **The checker's scenarios against the fixed source** (tools/checkR4a/scen.js): 25/25. P2 now reads "80 of 100,
  starts 2" where it used to read 100/100 with 1 start.

### Recordings with the checker's recorder (rec.js)

194 recordings with the fixed bot/lib, on cores 2-3 (logs/compare_fix.txt):

| Comparison | Result |
|---|---|
| Hunt off and seek off, V1 SELECT, vs snapshots/bot_r3a2 | **37/37** byte-identical |
| Same, V4 SELECT | **37/37** |
| FFA inert vs snapshot V4: H | 14/14 |
| FFA inert vs snapshot V4: HL | 14/14 |
| HL fixed vs the checked HL: 24 checker sources + 9 streams in auto and squad | 42/42 identical |
| H fixed vs the checked H: FFA sources + squad seeds 1-20 + 9 streams in auto and squad | 52/52 identical |

The chain never occurs on any of these sources: the longest pulse is 24 decisions and no pulse starts right after
another. So the fix changes no recorded behaviour; it only removes the unit-test case.

Other results from the same recordings:

- **FFA latch** in squad matches: none (H seeds 1-20, HL 1-10, hunt off 1-10).
- **Errors:** 0.
- **Simulator stuck:** 0. The "stuck" counts on FFA streams forced to squad come from the open-loop replay, and they
  equal the snapshot's.
- **A\* per decision:** at most 1.
- **Fuse:** 3 trips in these shared lanes, while other agents' jobs (rustc, a perf binary) held the load at 5-7. Every
  one of those outputs was still identical.

### 7.2 to 7.5: no change

- **7.2 Retreat shift (LOSING thresholds while committed):** kept. It follows spec 2.3 as written. Changing it would
  change what H and HL test.
- **7.3 Lightning counted to 60 m against a 45 m range:** kept. It follows spec 2.1 and GP 1.3. Lightning is rare in
  SQUAD play; a fix needs a spec decision and a new evidence pass.
- **7.4 Timing outlier:** this is the existing capped A* (see section 3).
- **7.5 Pre-latch exposure:** by design.

## 2. How the variants were made

- `cp -a bot variants/<id>/bot`, then a sed on lib/params.js in the variant only:
  - line 239: `retreat: 'pulse'` -> `'d3'`;
  - line 241: `hunt: 'off'` -> `'h50'` (H) or `'lite'` (HL).
- **Source diff:** `diff -r` against bot/ shows only those lines, and H against HL only line 241.
- **Resolved PARAMS** (variants_tools/r4a/param_diff_r4a.mjs):
  - Each variant's defaults equal bot/ with `select {retreat: 'd3', hunt: <arm>}`, with 0 differences.
  - Against bot/ + retreat d3, H differs in hunt50 and h50Pulse (false -> true) and HL in hunt50 only.
  - bot/ + retreat d3 against the R3a2 V4 variant: 0 keys changed, 61 keys added (the hunt and seek keys plus
    h50PulseGapS).
  - salt is 0 in both.
- **Bundle diff:** H and HL differ only inside the SELECT literal (`hunt:"h50"` / `hunt:"lite"`).
- **Packaging:** variants_tools/r4a/package_variant_r4a.sh is tools/package.sh with the source and output folders as
  arguments. Its steps are identical: bun build --minify --target=bun, the Dockerfile from the variant source, LICENSE
  and README.md from the repo, the hygiene grep, the comment check, and check.py under tools/cg1.sh with the map and
  without it. It ran pinned to cores 0-1.
- **Gate command:** `GATE_CPU=1 GATE_WAIVE=H9-method-exposure GATE_SRC=<scratchpad>/variants/<id>/bot taskset -c 0,1
  tools/release_gate.sh <scratchpad>/variants/<id>/dist`.

## 3. Per variant

### H: V4 + hunt h50 (folder variants/H)

- **Conformance:**
  - with the map: PASS, 300/300 in time, p99 1.7 / max 5.0 ms;
  - without the map: PASS, max 3.1 ms.
- **Gate GO** (runs/gate_20261121T202856Z):
  - R3: p99 1.7 / max 2.8 ms;
  - R10b: 0 late of 3939, p99 6.49 / max 21.05 ms;
  - R11 and R11b: kit answers 3b955aec76d1f10f, the same as V4's (the hunt does not change the kit stream).
- **Over the pipe** (logs/determinism.txt): long11, ffa_s1, the kit stream and long23p. A run, a run with 2 busy loops
  on the same core, and the readable source are all identical. These answers also equal the checker's pre-fix H bundle
  on all 4 streams.

### HL: V4 + hunt lite (folder variants/HL)

- **Conformance:**
  - with the map: PASS, 300/300 in time, p99 3.5 / max 4.4 ms;
  - without the map: PASS, max 2.5 ms.
- **Gate GO** (runs/gate_20261121T202946Z):
  - R3: p99 6.1 / max 7.9 ms;
  - R10b: 0 late, p99 7.46 / max 36.4 ms (the machine was loaded).
- **Rerun GO** (runs/gate_20261121T203631Z):
  - R3: p99 1.8 / max 4.5 ms;
  - R10b: 0 late, p99 7.06 / max 21.95 ms;
  - R11 and R11b: kit answers 3b955aec76d1f10f.
- **Over the pipe:** identical on all 4 streams, with one exception. The first loaded run on long11 differed: one fuse
  trip, a 70 ms decision with 2 busy loops on its core and the machine at load 7. Two loaded reruns were identical.

### Timing on one core

Setup: core 0, Dockerfile JSC limits, per-decision minimum over 3 repetitions, aligned against the V4 snapshot on 8
streams (logs/timing_report.txt). Other agents' jobs loaded the machine during this run.

| | H | HL |
|---|---|---|
| Worst aligned extra | 7.83 ms (fz #2080) | **9.28 ms** (long4800 #354) |
| long4800 #354 | 7.71 ms | 9.28 ms |
| Worst decision | 12.83 ms | 11.73 ms |
| Hunt hooks, max | 0.79 ms | 0.51 ms |
| A* per decision | at most 1 | at most 1 |

- The V4 snapshot's worst decision was 16.01 ms.
- Extra A* is at most 1 per decision; the budget allows 2.
- **The 9.28 ms is over the 8 ms figure.** It is the same decision as the checker's 9.07 ms: one existing
  25000-node capped A* in the regain leg, reached after the hunt changes the target. The new code itself stays at
  0.8 ms or less here, and 6.2 ms or less in the checker's simulator runs.
- Decision: **not blocking.** The budget for new code is met, and this decision is far below the 30 ms fuse and the
  50 ms limit.

## 4. Open items for the lead

- **mechbot/dist is now one fix behind bot/.** dist/bot.js is still d3197183, built before the fix (V1 SELECT, hunt
  off). With hunt off its behaviour is identical (37/37), but its bytes no longer match bot/. Run tools/package.sh
  before using dist/ or the gate with GATE_SRC=bot. I did not rebuild it, so the checker's verified artifact stays as
  it was.
- **The pre-fix source is kept** in variants_tools/r4a/bot_prefix, with test_brain_prefix.js beside it. Hashes:
  variants_tools/r4a/bot_after_fix.sha256 (bot/ now) and tools/r4a/bot_final.sha256 (before the fix).

## 5. For the submission minute (not done here)

For the chosen variant:

1. Copy exactly the four files of variants/<id>/dist into /home/user/kranti-hackathon.
2. Check the copy with `sha256sum` against the tables above.
3. Re-run the gate on the repo folder.
4. Make one commit with a neutral message, then push.
5. Log the id, commit, one change and score in notes/submissions.md.

The gate's GO is not a score prediction. In the uncalibrated simulator H scored 3.00 and HL 3.33 against V4's 3.83
(checkR4a section 2).

## Files

- Variant sources and builds: `<scratchpad>/variants/{H,HL}/{bot,dist}`.
- Hash manifests: `<scratchpad>/variants_tools/{H,HL}.sha256`.
- Logs: `<scratchpad>/variants_tools/r4a/logs/`:
  - package_*, gate_*, test_*, scen_after_fix, compare_fix, timing_report, determinism, param_diff, bundle_diff_*.
- Tools in `<scratchpad>/variants_tools/r4a/`:
  - package_variant_r4a.sh, param_diff_r4a.mjs, fixbatch.sh, compare_fix.mjs, timing_fix.sh, timing_report_fix.mjs.
  - Recordings are in id/, timing data in tim/ and pipe answers in det/.

Here `<scratchpad>` is `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad`.
