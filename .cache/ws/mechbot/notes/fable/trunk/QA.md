# Round-1b trunk QA (independent), Sun 22 Nov 2026, 05:39-05:52 UTC

Independent of the integrator: one author (the QA agent), its own tools, its own recordings, its own builds. Nothing of the
integrator's was trusted; where its numbers are quoted they were re-derived here. S = the session scratchpad
(`/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad`). Frozen directories
(variants6, variants7, fable_work/chaos, fable_work/switch, r7work, mechbot/bot, mechbot/sim) were only read. No git, no server.
Every recording and sim: nice 19, `fuseMs: 1e9` on every side, at most 2 of my own jobs at once (the integrator's own pass-2 pipeline
was still running on the same 4 cores until about 05:46; load 11 -> 2.5 during the runs). Working directory of this QA:
`S/fable_work/trunk/qa` (tools/, builds/, id/, out/). Dist bundles cannot take `fuseMs` from outside (bot.js passes no overrides), so
the two dist-level checks ran with the production fuse (30 ms); none of them tripped (no `slow tick`, all pairs identical).

Objects under test: the 17 bundles `S/fable_work/trunk/r1b/<name>/{bot,dist}` (R1B_all_c, R1B_c_s00..s15), built from the merged
tree `S/fable_work/trunk/trunk/merged` (freeze v2 `merged_freeze_v2.sha256`).

## 1. Verdict

| Bundle | Verdict | Reasons (section) |
|---|---|---|
| R1B_c_s03 | PASS | rebuilt byte-identical (2); table `111c111111111111` in bot and dist (2); differs from FNV only because slot 3 plays `c` (3); conformance base + v3dir PASS (7); hygiene gate 0 hits, H3-H6 PASS (8) |
| R1B_all_c | PASS | rebuilt byte-identical (2); table all `c` (2); = SV4 and = R1B_c_s03 at slot 3 (3); T-F2 identical (5); 12-seed sim errors 0 / fuse 0, hold / beam / rhythm fire (6); conformance PASS (7); hygiene (8) |
| R1B_c_s09 | PASS | rebuilt byte-identical (2); table (2); same code as R1B_c_s03 up to the 15 table bytes (2); hygiene (8) |
| R1B_c_s00, s01, s02, s04, s05, s06, s07, s08, s10, s11, s12, s13, s14, s15 | PASS | not rebuilt here (3 of 17 were); each dist = R1B_all_c's dist except the 15 bytes of the table literal at offsets 37259-37274, bot tree = merged tree + one `variantTable` line, sha256 = `R1B_HASHES.txt`, Dockerfile = FNV_s1's (2); pure-salt slots byte-identical to FNV at every slot 0-15 (3, 4); hygiene (8) |

One caveat on every `c` bundle, stated plainly (section 6): in the 12 default-rule sim seeds no supply drop was captured (the latch
fired in 2 matches and the mech never reached the ring; every match ended between 33 and 106 s, the first drop lands at 95 s). The
capture path itself works: seed 22 of the 24-seed set (S's ALL4 and the integrator's pass 2, same hashes) and seed 7 of my
mechanism run with early drops both capture. This is a value question for the per-slot measurement, not a correctness defect.

Not a bundle defect but for the owner (section 8): the bundle's string literals include the variant names (`CH1`, `CH1sv`), the
preset values (`first`, `timely`, `rhythm`) and the sv counter names (`svDropLatch`, `cratebeam`, ...), and two log sentences on
stderr ("variant 'c' CH1sv salt 1: live (SQUAD posture behind hunt.firewall)", "... off at t=18.1 (firewall down): 13 keys back to
base"). The word-boundary gate does not trip; this falls under the owner's accepted H9 waiver as the integrator says, but the names
make the mechanism readable to anyone who opens the minified file.

## 2. Static integrity, rebuilds, tables (all 17)

- Freeze v2 recomputed: 22 files, 0 mismatches (`qa/out/merged_freeze_recomputed.txt`); no file in `merged/` other than Dockerfile,
  bot.js, lib/*.js. T's `tree_freeze_v1` (23 lines) and S's `tree_survive_freeze` (22 lines): 0 mismatches.
- Every `bot/` tree: `diff -r` against `merged/` differs only in `lib/params.js`, and that diff is one line
  (`variantTable: '' -> '<16>'`); `saltTable: ''` kept; no stray files (no .orig, no .pyc). Table strings (bot and dist literal):
  R1B_all_c `cccccccccccccccc`; R1B_c_sNN = `1` x 16 with `c` at index NN, for NN = 00..15, all 16 read and correct; the dist carries
  `variantTable:"<table>"` and `saltTable:""` (twice: PARAMS and the SELECT_502-era copy).
- Rebuilt from their own `bot/` folders with my own bun invocation (`bun 1.4.4 build --minify --target=bun`, fresh output dirs):
  R1B_c_s03 4543ccd4..., R1B_all_c 7029cfaf..., R1B_c_s09 b598528d...: all three byte-identical to the shipped `dist/bot.js`.
- All 17 dist sha256 = `R1B_HASHES.txt`; all 17 are 254485 bytes; `cmp -l` against R1B_all_c: 15 differing bytes each, offsets
  37259-37274 (s00: 37260-37274, s15: 37259-37273), i.e. only inside the table literal; Dockerfile = `variants6/FNV_s1/dist/Dockerfile`
  (e04b4bec...) on 17/17, image tag `oven/bun:1.4.4` = local bun 1.4.4; dist file set = {Dockerfile, bot.js}.

## 3. R1B_c_s03 differs from FNV only because slot 3 plays `c` (kit stream, my `qa/tools/qstream.mjs`, FUSE on all sides)

Reference = `variants6/FNV_s1/bot`. The kit stream's own hello.slot is 3; long4800's too.

| Check | Result |
|---|---|
| kit, hello.slot 3 (native): R1B_c_s03 vs FNV | differ 47 of 300, first at decision 1; variant `c/CH1sv/salt1`, V-guard at tick 182 (firewall down); after the guard `P` equals FNV's on all 516 shared keys |
| kit, slot 3: R1B_c_s03 vs R1B_all_c | 0 differ (and `P` differs only in `variantTable`) |
| kit, slot 3: R1B_c_s03 vs SV4 (S's tree, four sv presets baked into SELECT) | 0 differ; SV4's `P` keeps 13 CH1 / sv keys after the firewall drop that the guard reverted, actions identical anyway: the presets are self-gated |
| kit, slot 3, select env 'squad': same three | 47 differ vs FNV, 0 vs SV4, guard at 182 |
| kit, slot 3, forced env 'ffa': R1B_c_s03 vs FNV | 0 differ (the select is never applied under forced FFA) |
| kit, hello.slot rewritten to 0, 1, 2, 4, 5, ..., 15 (15 runs): R1B_c_s03 vs FNV | 15/15: 0 differ; variant resolves to `1/salt1`, `B.sv` never created (no sv counters) |
| long4800, slot 3: R1B_c_s03 vs FNV vs SV4 (auto and squad) | 1763 of 4800 differ vs FNV (first 3), guard at tick 2501; 0 differ vs SV4; sv counters on this stream: svRlLow 22, svDropLatch 1, svDropGo 1 |
| long4800, slot 5: R1B_c_s03 vs FNV | 0 differ |

sv counters on the kit stream at slot 3 (both env auto and squad): svHold 1, svHoldDec 24, svHoldReload 15, svHoldEndLine 1 (the
regen hold fires and is released by a line opening), all before the guard; nothing after it (the integrator's G2b says the same).

## 4. Digit-only table from the merged tree = MX1_s05 (kit + long4800)

My build `qa/builds/QA_D05` = merged tree + `variantTable: '1111121111111111'` (slot 5 = salt 2, the table of
`variants7/MX1_s05`, whose own delta to MX_base is the one `saltTable` line), bundled the same way (97fbf4dd..., 254485 bytes).

| Level | Check | Result |
|---|---|---|
| tree, FUSE | kit slot 5: QA_D05 vs MX1_s05/bot vs MX_base | QA_D05 = MX1_s05 (0 differ, variant `2/salt2`); both differ from MX_base (79 of 300: MX_base plays salt 1), so the flip acts |
| tree, FUSE | kit slot 3: QA_D05 vs MX1_s05/bot vs FNV_s1/bot | 0 differ, all three |
| tree, FUSE | long4800 slot 5: QA_D05 vs MX1_s05/bot | 0 of 4800 differ |
| dist, production fuse, lockstep (`qa/tools/drive_dist.py`, two bun processes) | kit slot 5, kit slot 3, long4800 slot 5, long4800 slot 3: `QA_D05/dist/bot.js` vs `variants7/MX1_s05/dist/bot.js` | 4/4 identical answer streams (300, 300, 4800, 4800 answers; sha256 2436be73, c037e998, dfbe5a76, 6a18add3); worst answer 12.9 ms, no slow ticks, exit 0 |
| tree, FUSE | kit slot 5: `qa/builds/QA_ALL1` (table all `1`) vs FNV_s1/bot vs MX_base | 0 differ, all three |
| sim, FUSE | squad seeds 1-3: QA_ALL1 vs MX_base vs the chaos FNV-base sim (`chaos/out/sim/base`) | 3/3 identical action hashes (kills 7, 4, 3 on all three) |

So a digit (and, by the resolver, any UPPER-case or undeclared lower-case character) is a pure salt on this trunk: byte-identical to
MX_base with the same table, at tree and at bundle level, and the round-1 measurements keep their meaning.

## 5. T-F2 for variant `c`

Forced FFA (`env: 'ffa'` plain override), FUSE, three sides: QA_ALL1 (merged, all `1`), R1B_all_c (all `c`), MX_base.

| Stream / sim | Result |
|---|---|
| kit (300), ffa_s1 (1135), ffa_s2 (1619), ffa_s3 (1578), ffa_s4 (312) | 5/5: all three sides identical; the all-`c` side resolves `c/CH1sv` but `variantLive` false, no sv counter |
| sims 411-414 forced ffa (recs.js match) | 4/4: identical hashes across the three sides (n 739, 2205, 311, 519; kills 1 each; errors 0) |
| info: ffa_s1 env auto, all-`c` vs all-`1` | differ 47 of 1135, guard at tick 213, nothing after it |

## 6. 12-seed squad sim, table all `c` (R1B_all_c/bot, OVR `{fuseMs: 1e9}`, default rules)

| seed | kills | alive s | err | fuse | maxMs | sv counters |
|---|---|---|---|---|---|---|
| 1 | 3 | 50.8 | 0 | 0 | 5.9 | svRlLow 2 |
| 2 | 7 | 80.9 | 0 | 0 | 3.1 | svHold 4, svHoldDec 118, svHoldEndHp 1, svHoldEndLine 3, svHoldReload 2, svRlLow 2 |
| 3 | 5 | 71.2 | 0 | 0 | 2.6 | - |
| 4 | 6 | 105.7 | 0 | 0 | 2.6 | svRlLow 2 |
| 5 | 5 | 71.0 | 0 | 0 | 7.1 | svCbStart 1, svCbBeam 1, svRlMid 1 |
| 6 | 2 | 59.1 | 0 | 0 | 1.8 | svRlLow 1 |
| 7 | 1 | 63.4 | 0 | 0 | 2.1 | - |
| 8 | 6 | 84.0 | 0 | 0 | 4.8 | svDropLatch 1, svDropGo 55, svDropBoost 4, svHold 1, svHoldDec 8, svHoldEndLine 1, svRlMid 1 |
| 9 | 2 | 33.5 | 0 | 0 | 2.3 | svHold 1, svHoldDec 26, svHoldEndLine 1, svHoldReload 1 |
| 10 | 4 | 74.7 | 0 | 0 | 4.3 | svHold 5, svHoldDec 84, svHoldEndFin 1, svHoldEndLine 4, svHoldReload 3 |
| 11 | 8 | 85.5 | 0 | 0 | 6.7 | svDropLatch 1, svDropGo 73, svDropBoost 22, svRlMid 1 |
| 12 | 3 | 53.9 | 0 | 0 | 2.3 | - |

Totals: kills 52, errors 0, fuse 0, maxMs 7.1; 12/12 action hashes equal S's ALL4 and the integrator's pass 1 and pass 2 runs.
Rules reached: hold fire in 4 matches (svHold 11, released by a line 9x, by 80% hp 1x, by a finish 1x; never by the 12 s timer),
reload rhythm in 5 matches (svRlLow 7, svRlMid 3, svRlTop 0), crate beam in 1 match (1 start, 1 beam, 0 aborts), drop latch in 2
matches (svDropGo 128 decisions, 26 boosts) with 0 in-ring decisions and 0 captures; dropEv 0 in all 12.

Drop capture, pursued further because the criterion was not met in these 12 seeds: (a) the 24-seed set: seed 22 (alive 124 s)
captures once (svDropIn 29, svDropHold 39, svDropCap 1, dropEv 1) in S's ALL4 and in the integrator's pass 2 alike; seed 19 latches
(svDropGo 101) without reaching the ring; every other seed ends before the first landing. (b) My mechanism run
(`qa/id/mech`, drops patched to 30 / 55 / 80 s with 15 s fall, 8 seeds, all `c` vs all `1`): the latch fires in 7 of 8 `c` matches
(svDropGo 52-216 decisions each), the ring is reached in 1 (seed 7: in 32, hold 40, captured, dropEv 1), 2 stalls, 1 lost to a faster
holder; base all `1`: 0 latches, 0 captures; kills 37 vs 24 (8 seeds, sanity only). S's own runs on the same patched schedule: 'first'
4 captures / 24, 'first100' 6 / 24, 'timely' 3 / 24, base 0. The capture path works; in this simulator the rule mostly produces
long DROP walks that do not reach the ring. What that is worth on the real server is exactly what the per-slot flips measure.

## 7. Conformance (kit check.py through `panel_r6/maps/run_check.sh`, 1-CPU quota group, one run at a time)

| dist | base | v3dir |
|---|---|---|
| R1B_c_s03 | PASS, 300/300 in time, p50 0.7 p99 1.5 max 4.4 ms | PASS, p50 0.7 p99 1.6 max 3.8 |
| R1B_all_c | PASS, p50 0.7 p99 1.4 max 4.8 | PASS, p50 0.8 p99 1.7 max 4.3 |
| FNV_s1 dist (timing reference, same load) | PASS, p50 0.7 p99 1.6 max 3.8 | PASS, p50 0.7 p99 1.5 max 3.8 |

ready in 2.3 s; stdout discipline clean (bad lines 0, debug 0, wrong tick 0). The bundle's stderr shows the variant resolving at slot
3 (`variant 'c' CH1sv salt 1: live`) and the guard at t = 18.1 s (`13 keys back to base`), then the FFA latch at 24.9 s. The other 15
bundles are the same code up to the table literal (section 2) and were not run through check.py here.

## 8. Hygiene (all 17 dists)

- REPO_HYGIENE.md gate exactly as `release_gate.sh` line 37 (`OWNER_RX`, case-insensitive, word boundary on `osu`): 0 hits on 17/17.
- `tools/release_gate/hygiene.py` (same file as `comply_work/gate/hygiene.py`) with the leaderboard snapshots in `S/web`:
  H3 team names (85 checked) PASS, H4 board scores (28) PASS, H5 comments (0 lines, 0 blocks) PASS, H6 secrets / paths / source maps
  PASS, on 17/17. H1 / H7 / H8 FAIL only because LICENSE and README are added at push time. H2 (substring) flags `headExposure` as on
  the FNV_s1 and CH1_s1 dists; the binding gate is the word-boundary grep, which prints nothing. H9 (owner's waiver): 1007 named
  numeric parameters and 250 / 251 non-protocol strings, 24 log sentences (FNV_s1 dist: 894 / 202; CH1_s1: 971 / 214). The strings the
  trunk adds over CH1_s1 are listed in `qa/out` (the two variant log sentences, `CH1`, `CH1sv`, the preset values, the sv counter
  names, `cratebeam`).

## 9. survive.js against the rule spec (coach_spec.md M-B / FB4, FB5, FB7, FB6; intel 3.7, 3.10, 3.12, 3.13)

Read in full (`merged/lib/survive.js` e60c6b5a..., = S's tree), with the hook sites in brain.js (HB2, HB4, HB6, HB10-12), economy.js
(HE2, HE3, HE3b), firecontrol.js (HF1, HF2, HF3) and `decideMode` (`B.dl.capture` -> DROP above everything but an urgent zone move,
tactics.js 513-531). Every field the module reads exists in the merged tree (`me.regenDelay / regenPerS / lastDealtT / lastShotT /
inZone / muzzleH`, `B.lastLosInT`, `B.lastStand`, drops `landsIn / captureS / progress / holder`, `B.crates` Map with `seen`,
`econ.pathEst`, `hunt.ttk`, `world.shotClear`, `B.zone.known / nx / ny / nr`). No `B.rng()` call. `live()` = `B.env !== 'FFA' &&
hunt.firewall()` once per decision in `pre()`; every `P.*` read at call time; every hook neutral when not live; `dropUpdate()` clears
its own `B.dl` before testing the switch; the hold resets itself the first decision it is not live. There is no `off()` method (the
guard's `if (B.sv.off)` is simply skipped); nothing needs it, as the identity runs above show (0 differ vs SV4 after the guard).

| Rule | Spec / observation | survive.js | Verdict |
|---|---|---|---|
| FB4 trigger | hp < 90% ('first'), drop within 200 m straight, inside the next zone, landed or landing <= 3 s after arrival | `svDropHpf 0.9`, `svDropR 200` (straight line), `inNext()`, `landsIn > path/walk + svDropEarlyS 3` -> skip | as specified |
| FB4 "no contest check, no HP margin" | | no HP margin; no contest radius; the one extra test skips (and drops the latch on) a drop whose current holder completes before we can reach the ring edge (`captureS - progress <= tRing`) | defensible refinement (a drop gone before arrival), not a contest check |
| FB4 action | `dropGo`; boost if > 12 m and energy > 8; stop within 2 m; keep shooting the target; stand 4 s | `B.dl = {capture: true}` (DROP rail), `svDropBoostR 12 / svDropBoostE 8` (grounded, not rush / walk-in, legs moving), `svDropStopR 2`, firecontrol mode-blind (torso stays on the target; look hint only without one), latched until the capture event | as specified |
| FB4 latch end | captured, gone, or 12 s after landing with no progress | captured (drop event), gone / out of the next zone, holder finishing first, `svDropStallS 10` s after landing without our progress; then ignored `svDropIgnoreS 40` s | 10 s where the spec says 12 (own number); ignore window is an addition |
| FB4 extras | house holder in the ring: step in and shoot it; from the 70 s call with hp < 70% fight on a 60 m leash; delete dropContestR / dropEarlyS / dropHpBase in SQUAD | not implemented; the legacy D6 drop task is only stood down while our latch holds (`dropWant`), so the legacy contest check still governs drops above 90% hp | gaps, documented here |
| FB5 clock | `regen.at = max(lastDealtT, lastHurtT) + regenDelay`; `regen.lost = 45 x delay` | identical; `lost = regenPerS x regenDelay` from live stats (225 at base); `running` also requires `inZone` | as specified, live numbers |
| FB5 hold entry | no line on us 0.5 s, hp < 75%, not finish, last hurt > 1.5 s | `svHoldQuietS 0.5`, `svHoldHpf 0.75`, `finishInReach()` (killSecure / finishing / finishable / `ttk <= svFinS 1.6`), `svHoldHurtS 1.5`; plus a 5 s cooldown after a timed-out hold | as specified (+ cooldown) |
| FB5 hold exit | 80%, 12 s, the instant a line opens; stay put, reload to full | `svHoldExitHpf 0.8`, `svHoldMaxS 12`, `lastLosInT >= t || lastHurtT >= t`, also a finish coming into reach; no leg change; `svHoldReload` | as specified |
| FB5 hold scope | hold fire | gun, laser start, lightning, mortar via firecontrol `hold`; a crate shot with no target is allowed | as the module header says |
| FB5 pokes | regen within 2 s or running and hp < 90%: no drone shots, no gun pokes with hit chance < 40% | not implemented (no HF4 / `pokeOk`) | gap |
| FB5 vs last stand | - | `holdUpdate` does not test `B.lastStand` / `B.doomed` (the legacy `holdFire` is cleared by the last-stand veto, the sv hold is OR-ed after it); it still releases the instant a line opens | minor |
| reload rhythm (intel 3.7, S's extra) | nothing in view and magazine <= 1/3; 1.5 s quiet and no mechs at <= 2/3; 6 s quiet whenever not full; not while farming | `svRlLowFrac 0.34` with no mech in view; `svRlMidS 1.5 / svRlMidFrac 0.67` on quiet time only (no "no mechs" test); `svRlTopS 6`; not with a crate shot, never while the target has a line either way; quiet = since the last line / own shot / hit | mid rule slightly wider than observed; otherwise as observed |
| FB7 trigger | laser ready, no mech shootable 0.4 s, crate with a line within 110 m (50 m if a mech was seen in 4 s), regen not running or hp >= 97% | `lz` ready (no charge, cooldown <= readyCd), `svCbQuietS 0.4`, `svCbR 110 / svCbNearR 50 / svCbMechS 4` capped by the laser band, line = `world.shotClear` to the crate centre, `svCbRegenHpf 0.97`; also requires no target, crate hp >= `svCbMinHp 120`, 0.2 s scan cadence, 2.5 s attempt cap | as specified (+ own guards) |
| FB7 action | one full beam, gun silent | HF3 branch: torso on the crate, release at full charge inside the gate with the muzzle clear (or `laserForceS`), gun not fired in that branch, aborts counted | as specified |
| FB7 extras | a drone that bit us in 3 s takes the beam first; laser_damage x1 one-shots drones | not implemented | gaps |
| FB6 grab | laser 45 m / cube 18 (28) m / wanted weapon 25 m, path <= 1.5x, no mech within 30 m, hp > 30%, over fighting | `grabWant()` is a stub; `c` carries no FB6 | not in `c` (as the integrator states) |
| priorities | ZONE > DROP > GRAB > FINISH > ... | DROP rail via `B.dl.capture` in `decideMode` (above FIGHT, below ZONE urgent, last stand still forces FIGHT); the hold changes no mode | as specified for the rules present |

Clean room: identifiers and structure are the trunk's own (`sv*` keys, hooks of the architecture note); the numbers are those of the
coach spec, which are the intel note's observed behaviour values (200 m, 3 s, 12 m, 8 energy, 2 m, 0.5 s, 75% / 80% / 12 s, 1/3 and
2/3, 1.5 s, 6 s, 110 / 50 m, 4 s, 97%). No other team's code, identifiers or constants beyond those behaviour descriptions were found.
Whether "pick and tune your own numbers" wanted different values than the coach wrote is a decision for the owner, not a defect.

## 10. Tools and records of this QA

`qa/tools/qstream.mjs` (N-way stream diff: SLOT, ENV, FUSE, OVR; prints hashes, first difference, variant state, sv counters and the
final `P` difference on shared keys), `qa/tools/drive_dist.py` (lockstep dist driver), `qa/tools/runstreams.sh`, `runsims.sh`,
`runmech.sh`, `chain.sh`; outputs `qa/id/streams` (31 runs), `qa/id/dist` (8 answer files + summary), `qa/id/sims` (30 matches),
`qa/id/mech` (16), `qa/out/conf` (6 check.py logs), `qa/out/merged_freeze_recomputed.txt`, `qa/out/test_variant_m_rerun.txt`
(the integrator's U1/U2/G2b test re-run here: PASS 17535, FAIL 0; their tool, not independent). The 4800-decision long streams and
the FFA streams come from `mechbot/tools/release_gate` and `mechbot/tools/check2a`; the sim is `fable_work/chaos/sim` through
`chaos/tools/recs.js` (read-only use).

Not done: `release_gate.sh` end to end (needs the LICENSE / README packaging, the pusher's step); check.py on the 15 bundles that
differ from the two tested only in the table literal; S's `test_survive.mjs` on the merged tree.
