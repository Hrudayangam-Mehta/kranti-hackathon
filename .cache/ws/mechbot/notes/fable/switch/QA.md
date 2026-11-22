# Fable switch panel: independent QA of the ten bundles

Written Sun 22 Nov, 02:53-03:35 UTC by the QA agent. Everything below was re-run or re-read by QA; nothing is taken
from the engineer's report. Machine: 4 cores, load 14-25 during the whole run. No git, no game server.
S = the session scratchpad. QA files: `S/fable_work/switch/qa/` (scripts, recordings, conformance output). Nothing else
was written; the tree, `r7work`, `variants6` and `mechbot/bot` were only read.

## Verdict per build (the engineer's priority order)

| # | Build | Verdict | Reason |
|---|---|---|---|
| 1 | SW_PM_s1 (`pauseMove: 'on'`) | PASS, one reservation | All checks pass. It changes the two FFA simulator matches (ff413, ff414) from tick 134 / 102, before the first foreign death. Forced FFA is identical on 8 sources. |
| 2 | SW_ID_s1 (`isoDwell: 'on'`) | PASS, one reservation | All checks pass. Same reservation as PM: ff413 from tick 136, ff414 from tick 108. |
| 3 | SW_UTtgt_s1 (`util: 'tgt'`) | PASS, one reservation | All checks pass. It changes 5 lines of the FFA stream `f1_auto` from tick 354, before the first foreign death at tick 422. |
| 4 | SW_UT_s1 (`util: 'on'`) | PASS, same as UTtgt | Byte-identical to SW_UTtgt_s1 on all 27 sources, so it adds no information over build 3. |
| 5 | SW_DL_s1 (`dropLife: 'on'`) | PASS, two notes | All checks pass. The new code reads every drop number from the observation; two older literals remain (see dropLife). |
| 6 | SW_DLidle_s1 (`dropLife: 'idle'`) | PASS, same as DL | Byte-identical to SW_DL_s1 on all 27 sources; the idle walk was counted 12 times and changed no answer. |
| 7 | SW_UF_s1 (`upgFix: 'on'`) | PASS | 0 changed lines on 27 sources. Conformance `base` failed once on timing under load 25 and passed on the rerun. |
| 8 | SW_UTwait_s1 (`util: 'wait'`) | PASS | 0 changed lines on 27 sources. Conformance `base` failed once on timing under load and passed on the rerun. |
| 9 | SW_FUwork_s1 (`fuse: 'work'`) | PASS, one reservation | 0 changed lines on 27 sources. The preset is not posture-gated and still has a wall-clock trip (see FU). |
| 10 | SW_NC_s1 (no preset) | PASS | Byte-identical to `r7work/ckpt_07_LG` under the 5.38 SELECT on 27 sources, 47,729 decisions. |

No build fails. The reservations on builds 1-3 and 9 matter only if a slot requires the build to be inert in a
free-for-all match before the first death.

## What was checked

| Check | Result |
|---|---|
| Tree freeze | 20 of 20 files in `out/tree_freeze.sha256` match. The list omits `tree/Dockerfile` and the two `.orig` files, which also exist in ckpt_07_LG. |
| Build source against tree | Each `builds/<name>/bot` differs from `tree` only in `lib/params.js`, and there only in the salt line and the SELECT lines. |
| Rebuild | 10 of 10: `bun build --minify --target=bun` from `builds/<name>/bot` gives the sha256 of `dist/bot.js`, which is also the sha256 in the log. |
| SELECT | 10 of 10: 61 keys, order and values equal the log's 5.38 SELECT plus the one change; `salt` 1. Resolved parameters of each build differ from SW_NC_s1 only in the preset's own keys. SW_NC_s1 differs from `variants6/FNV_s1` only in the new keys at their old values. |
| Identity, 5.38 SELECT | SW_NC_s1 lib against the ckpt_07_LG lib: 27 of 27 sources byte-identical, fuse 0, errors 0. |
| Identity, default SELECT | `tree/lib` against the ckpt_07_LG lib, both as they stand: 27 of 27 byte-identical. |
| T-F2 unit tests | `test_switch.mjs` 36 of 36 and inherited `test_tf2.mjs` 13 of 13 on the frozen tree. |
| T-F2 on real sources | Every build equals SW_NC_s1 on the 5 forced-FFA streams of the identity set and on long4800, long11 and long23p replayed with forced FFA. |
| Conformance | `base` and `v3dir` PASS for all ten, `world=true nav=true`, errors 0. Two `base` runs needed a rerun (timing under load). |
| Worst decision on the kit stream | Best of 3 runs per build: 3.1-12.3 ms wall, 2.8-5.7 ms CPU; the 5.38 reference reads 6.4 ms wall. |
| Forbidden words | The owner's grep prints nothing for all ten `dist` folders. No team name, no board score, no comment, no local path. |

### Identity detail

- ckpt_07_LG has no `loseCover: 'never'` preset, so the 5.38 SELECT was given to it as select overrides plus the three
  plain values that preset sets (`loseCoverNear true, lcCoverS 0, lcLowHpf 0`) and `salt 1`. `variants6/FNV_s1/bot`
  differs from ckpt_07_LG only in `params.js` preset lines, and my reference hashes equal the engineer's `id/refFNV`.
- Sources: the kit stream (auto, squad, forced FFA), long4800, long11, long23p (squad, auto), ffa_s1-4 (auto, forced
  FFA), simulator squad seeds 1-6 and FFA seeds 411-414.
- All recordings ran with `fuseMs: 1e9` on both sides, as the engineer's did. Single decisions reached 286 ms of wall
  time here, so the 30 ms fuse would have tripped on load alone.
- `plansCached` is 912 on long4800 and 1859 over the 27 sources, so the negative plan cache is active while identical.

### Changed lines against SW_NC_s1 (27 sources)

| Build | Sources that differ | Changed lines | Forced-FFA sources |
|---|---|---|---|
| PM | 14 (long x 6, squad seeds 1-6, ff413, ff414) | 7369 of 49376 | identical |
| ID | 14 (the same) | 6699 of 49872 | identical |
| UTtgt, UT | 12 (long x 6, squad seeds 1, 2, 3, 5, 6, `f1_auto`) | 4770 of 47729 | identical |
| DL, DLidle | 3 (long11 squad and auto, squad seed 1) | 269 of 47833 | identical |
| UF, UTwait, FUwork | 0 | 0 of 47729 | identical |

These counts equal the engineer's. On the kit stream every build gives the same answer hash as the reference, so the
conformance `base` run and the kit timing do not exercise any preset.

## Findings

1. **FU still depends on the wall clock.** `fuse: 'work'` trips on the cell count and also at `fuseWallMs` 45. On
   long23p it tripped 3 times in one run and 2 times in the next; with `fuseWallMs: 1e9` it trips exactly 2 times. So
   one trip was the 45 ms clock under load. It did not change an answer here, but FU does not remove the load problem.
   The preset is also not gated by posture: it tripped twice on long23p in forced FFA. There is no T-F2 unit test for it.
2. **dropLife, numbers from the config.** In `dlUpdate()` and `dlLegs()` every drop number is read per drop from
   `obs.drops`: `radius`, `lands_in`, `capture_s`, `progress`, `holder`. One recorded stream has a 7 m ring, so this
   matters. Two older literals remain outside the new code:
   - `senses.js:501` falls back to radius 8 and capture 4 when an observation omits the field. It does not read
     `hello.config.drops`.
   - The old drop rule (`economy.js:221-248`) still runs beside dropLife and uses `P.dropCaptureS` 4 for its zone test.
   The new code also has five tunables written inline instead of in `params.js`: 3 s zone margin, boost beyond 25 m,
   strafe beyond 6 m, ring inset floor 3 m, track confidence 0.3. None is a drop rule number.
3. **New log line in every build.** Every bundle, SW_NC_s1 included, prints `upgrade order: unknown ids
   mortar_damage,mortar_rate; config ids not ranked mortar_reload,mortar_velocity` on stderr at match start. It is a
   real defect of the shipped upgrade order. It adds two descriptive sentences to the bundle (hygiene H9 counts 22
   against 20 in the 5.38 bundle, which already fails H9).
4. **`dist` is not a submission folder.** It holds `bot.js` and the Dockerfile only; LICENSE and README are missing, so
   the release gate's file, README and licence checks would fail as packaged. The Dockerfile equals the FNV_s1 one.
5. **Pre-death reach in FFA matches** (builds 1-3), as in the table above. In the two simulator matches the outcomes
   moved both ways: ff413 2 kills to 1 (PM and ID), ff414 0 kills to 4 (PM) and to 2 (ID). Two matches prove nothing.

## Not checked

- The 24-seed simulator runs were not repeated, so the engineer's kill and alive numbers and the "inside noise"
  reading are unverified. The six squad seeds I ran agree with his per-source change counts only.
- The bundles were not replayed decision by decision against their source; the rebuild hashes tie each bundle to its
  source folder, and identity was measured on that source.
- The pauseMove grab rule has no unit test; its counter `pmGrabWait` read 129 on my 27 sources.
- No combination of presets was run.
