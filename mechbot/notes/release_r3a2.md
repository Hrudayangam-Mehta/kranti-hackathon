# Release R3a2: the four first-hour variants (release engineer, Opus sub-agent; 18:34-18:42 UTC Sat Nov 21)

Verdict: **all four GO**. Each release gate reports 35 PASS with H9-method-exposure waived. The official check passes
under the 1-CPU quota with the map and without it. All four builds come from the same code and differ only in the
SELECT defaults (one line of lib/params.js). Nothing was pushed or submitted. /home/user/kranti-hackathon was only
read: its README.md and LICENSE were copied, and its working tree is clean. bot/ is unchanged and still equals
tools/r3a2/bot_final.sha256. dist/ is unchanged (bot.js 021e65e6...).

| Variant | bot.js sha256 | Gate | Submission order |
|---|---|---|---|
| V1 | 021e65e66452c7c7701aa1dcf0b627ca175c178bbf94ee5c435add4183c92529 | GO (35 PASS, 1 waived) | 1 |
| V2 | c1d15fcecaaefc4852e79aba7f2c39b2081d96d3e1ff4b704f1eb89fd5282d94 | GO (35 PASS, 1 waived) | 2 |
| V3 | 83b0ceced7f17828ca4f98202b374b9d4f610ec26344d6935f2e4b5d7e98a5e6 | GO (35 PASS, 1 waived) | 3 |
| V4 | 2bebaf104dbb7860fa35f1524a8b33a75da69691a46c65c3430192155638ada3 | GO (35 PASS, 1 waived) | 4 |

V1's bot.js is byte-identical to the dist/bot.js that checkR3a2 verified (021e65e6...). The bundle therefore does not
depend on the folder it is built from.

## 1. Checker findings: no FAIL, so no code change

notes/checkR3a2.md lists no FAIL, so step 1 (fix each FAIL or revert its preset) had nothing to do. I made no code
change: any edit would have invalidated the checker's evidence for all four variants. My decisions on its four findings:

1. **R2 rear pick in SQUAD under P3: kept as built (FFA only).** The build spec labels P3 "synthesis 3". Its detailed
   source, top5_synthesis.md section 1.3, says "Under `add`, R2's rear pick runs in FFA only". The spec line merges
   this with the torso-veto rule into one sentence. The torso-veto rule (>= 38% hp and not hit by us for 2 s) is built
   and the checker verified it. I read the code as matching the intended text. The spec-text alternative (a rear pick
   gated like the veto keep rule) would change SQUAD behaviour in all four variants, so it would need its own preset
   and its own submission slot.
2. **Z8 WAIT post, CLOSE farming and Z6 (late upgrade order) not built: left out.** They are final-only and cannot
   change practice scores. Building and re-verifying them takes more than an hour and would reset the evidence for
   V1-V4. The built Z8 rules (WAIT / CLOSE / DUEL engagement) stay on as verified. Candidates for a later build, before
   the 15:15 UTC Sunday lock.
3. **Z8 ghost track (about 12 s after a kill by another bot): deferred to the next build.** It is final-only, needs
   `ffaTwo` on and 2 alive, and lasts at most trackForget = 12 s. Proposed smallest fix, in ffa.js `twoUpdate`:
   - prefer a track that is listed in the current observation;
   - otherwise skip unlisted tracks last seen before the most recent death we did not cause (the drop in alive count
     that `prevAlive` already detects);
   - regression test: a 3 -> 2 foreign death with the victim seen more recently than the survivor; expect the
     survivor, or the 1400 default when the survivor is not tracked.
4. **FFA-opening risk (seed 412) noted.** V1, V3 and V4 share it, because P1 turns openFarm off. V2 keeps the 5.02
   opening. Our best-scoring submission is the one entered in the final, so if V1, V3 or V4 leads, give its final
   candidate an opening fix (or V2's openFarm) before the lock. The simulator is uncalibrated, so this is sanity only.

I re-ran the suites on core 0 against bot/: test_brain 93/93, test_world 39/39, test_counters 15/15, test_requests 12/12.

## 2. How the variants were made

- `cp -a bot variants/<V>/bot`, then a one-token sed on line 220 of lib/params.js (the SELECT line). `diff -r` against
  bot/ shows only that line, and for V1 nothing at all.
- The resolved PARAMS were compared with variants_tools/param_diff.mjs. Each variant differs from V1 only in its own
  item, and each changed key equals its 5.02 value. As a control, `SELECT_502` and `r3a2: 'off'` resolve to the same
  PARAMS.
- The minified bundles differ from V1's only inside the SELECT literal (byte-range diff).
- Bundling used variants_tools/package_variant.sh, which is tools/package.sh with the source folder and the output
  folder as arguments. Every step is the same: bun build --minify --target=bun, the Dockerfile copied from the variant
  source, LICENSE and README.md from /home/user/kranti-hackathon, the hygiene grep, the comment check, and check.py
  with the map and without it under tools/cg1.sh. It ran pinned to cores 0-1.
- Gate command, run one variant at a time on cores 0-1: `GATE_CPU=1 GATE_WAIVE=H9-method-exposure
  GATE_SRC=<scratchpad>/variants/<V>/bot taskset -c 0,1 tools/release_gate.sh <scratchpad>/variants/<V>/dist`. No other
  process was in the mechtest group.

## 3. Per variant

All four share these dist files:

| File | Bytes | sha256 |
|---|---:|---|
| Dockerfile (= bot/Dockerfile = the repo's Dockerfile) | 496 | e04b4bec72c9507ac9d199714e2e1b4c9b6537a9f986249d6be6aa4f90d52c1a |
| LICENSE (byte-identical to /home/user/kranti-hackathon/LICENSE) | 1074 | 2838d6d1f7a64a81cbb66d1056cd3425c46b0405b560744c0474f80837bf059e |
| README.md (byte-identical to /home/user/kranti-hackathon/README.md) | 518 | f289218b28c8f20e85beac222155ae132a15a282c5feb1fe3546f5941f730975 |

### V1: all R3a2 items at their new defaults (folder variants/V1)

- **SELECT:** unchanged from bot/: `fightEarly: 'on', laserEcon: 'on', focus: 'add', retreat: 'pulse', boost: 'spend',
  upg: 'speed'`, with laserRange 'mid', farmHp '50', and F1 / Z5 / Z8 / Z9 / Z10 'on'.
- **dist/bot.js:** 206455 bytes, sha256 021e65e66452c7c7701aa1dcf0b627ca175c178bbf94ee5c435add4183c92529.
- **lib/params.js:** 331cf34a...
- **Conformance:**
  - with the map: PASS, worst 3.9 ms;
  - without the map: PASS, max 4.6 ms.
- **Gate GO** (runs/gate_20261121T183758Z):
  - R3: p99 1.5 / max 4.0 ms;
  - R10b: p99 4.34 / max 14.94 ms, 0 late;
  - R11 and R11b: kit answers 697da423e8cc578b, the same as both earlier gate runs of this bundle.

### V2: V1 with P1 off (folder variants/V2)

- **SELECT:** `fightEarly: 'on'` -> `'off'`.
- **PARAMS:** fightEarly true -> false, openFarm false -> true. openFarmAim stays false, as in 5.02.
- **dist/bot.js:** 206456 bytes, sha256 c1d15fcecaaefc4852e79aba7f2c39b2081d96d3e1ff4b704f1eb89fd5282d94.
- **lib/params.js:** 647dc507...
- **Conformance:**
  - with the map: PASS, max 2.9 ms;
  - without the map: PASS, max 5.0 ms.
- **Gate GO** (runs/gate_20261121T183846Z):
  - R3: p99 1.9 / max 5.8 ms;
  - R10b: p99 4.19 / max 16.61 ms, 0 late;
  - R11 and R11b: kit answers 0e568574e1b34389.

### V3: V1 with P5 off (folder variants/V3)

- **SELECT:** `boost: 'spend'` -> `'off'`.
- **PARAMS:** boostSpend true -> false.
- **dist/bot.js:** 206453 bytes, sha256 83b0ceced7f17828ca4f98202b374b9d4f610ec26344d6935f2e4b5d7e98a5e6.
- **lib/params.js:** 16edb08d...
- **Conformance:**
  - with the map: PASS, max 3.2 ms;
  - without the map: PASS, max 7.0 ms.
- **Gate GO** (runs/gate_20261121T183933Z):
  - R3: p99 1.1 / max 4.3 ms;
  - R10b: p99 3.99 / max 10.87 ms, 0 late;
  - R11 and R11b: kit answers bb7e62dca62ba642.

### V4: V1 with P4 off, HEAL as in 5.02 (folder variants/V4)

- **SELECT:** `retreat: 'pulse'` -> `'d3'`.
- **PARAMS:** pulseRetreat true -> false.
- **dist/bot.js:** 206452 bytes, sha256 2bebaf104dbb7860fa35f1524a8b33a75da69691a46c65c3430192155638ada3.
- **lib/params.js:** 2f25f553...
- **Conformance:**
  - with the map: PASS, max 3.0 ms;
  - without the map: PASS, max 5.4 ms.
- **Gate GO** (runs/gate_20261121T184021Z):
  - R3: p99 1.7 / max 4.2 ms;
  - R10b: p99 4.27 / max 10.1 ms, 0 late;
  - R11 and R11b: kit answers 3b955aec76d1f10f.

## 4. For the submission minute (not done here)

For each slot, in order V1, V2, V3, V4:

1. Copy exactly the four files of variants/<V>/dist into /home/user/kranti-hackathon.
2. Check the copy with `sha256sum` against the table above.
3. Re-run the gate on the repo folder.
4. Make one commit with a neutral message, then push.
5. Log the id, commit, one change and score in notes/submissions.md.

The gate's GO is not a prediction of score: the simulator mispredicted the order of our last two builds.

## Files

- Variant sources and builds: `<scratchpad>/variants/V1..V4/{bot,dist}`.
- Hash manifests (source and dist): `<scratchpad>/variants_tools/V1..V4.sha256`.
- Packaging and gate logs: `<scratchpad>/variants_tools/logs/{package,gate}_V*.txt`.
- Tools: `<scratchpad>/variants_tools/package_variant.sh` and `param_diff.mjs`.
- Gate run folders: `mechbot/runs/gate_20261121T1837..1840*`.

Here `<scratchpad>` is `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad`.
