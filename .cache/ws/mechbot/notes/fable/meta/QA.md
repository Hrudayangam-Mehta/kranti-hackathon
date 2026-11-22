# Fable meta: independent QA of the three per-slot meta bundles (MT_A, MT_B, MT_ALL)

Written Sun 22 Nov, 05:30-05:50 UTC by the QA agent. Everything below was re-run or re-read by QA; nothing is taken from
the engineer's report. Machine: 4 cores, load 5-11 (other sessions' gate, simulator and shopping jobs ran throughout; another
session's release gate shared the 1-CPU cgroup `mechtest` during my first gate pass and the MT_A rerun). Every recording and
simulator match: `nice -n 19`, `fuseMs 1e9` on both sides, 2 lanes. No git, no game server. S = the session scratchpad.
QA files: `S/qa_meta2/` (job list, 192 recordings with per-decision meta-on side files, `cmp.py` and `cmp.out`, gate and
conformance output, unit output, rebuilds, the 12-seed simulator runs). An earlier, unfinished QA pass left `S/qa_meta/`
(05:26-05:30 UTC); its recorder `qarec.mjs` was read in full and reused, and its three gate outputs are quoted only as an
extra uncontended timing reference. Nothing else was written except this file (the gate writes its own logs under
`mechbot/runs/gate_*/`). `MX_meta`, `MX_base2`, the three bundles and every other `variants7` folder were only read.

## Verdict per bundle

| Bundle | saltTable | Verdict | Reason |
|---|---|---|---|
| MT_A | `mmmmmmmm11111111` | PASS on integrity and safety; two notes | Rebuild, identity, T-F2, conformance, hygiene, unit and simulator checks all pass. Note 1: slot 1 carries `m` (salt 1 + meta) where the fielded table has salt 2, so that slot is a salt change plus the meta, not the spec's same-salt test. Note 2: release gate GO at 05:34 and GO again on the uncontended third run at 05:43 (R10b p99 8.8 ms); the 05:40 rerun in between failed R10b alone (p99 15.62 ms against the gate's 15) with another session's gate in the same 1-CPU group. |
| MT_B | `12111111mmmmmmmm` | PASS | All checks pass. Slots 0-7 keep the fielded table (slot 1 stays salt 2) and are byte-identical to `MX_base2`; slots 8-15 are meta slots at salt 1. Release gate GO on the uncontended rerun (first run failed R10b alone under contention). |
| MT_ALL | `mmmmmmmmmmmmmmmm` | PASS on integrity; one reservation | All checks pass; release gate GO on the uncontended rerun. Reservation: a 16-slot meta table is exactly the whole-table change that META_SPEC R3 says to avoid ("whole-table changes regress toward about 245"), and the spec's keep-or-revert test (one slot, same salt, 48 matches, gain on 2 of 3 trial slots) was not executed: no game server, and the 12-seed simulator gives 49 kills with the meta on all slots against 49 with salt 1. |

No bundle fails a build, identity, gating, conformance, hygiene or exception check. The reservations are about the test plan,
not the code: the three bundles are integral and inert outside their `m` slots and outside the SQUAD posture.

## What was checked

| Check | Result |
|---|---|
| Source against `MX_base2` | `MX_meta` differs in `brain.js` (+8 lines: the import, the `m` parse, `meta: null`, `makeMeta`, the `meta` stage), `params.js` (+1 line `metaSet: 'c'`), `economy.js` and `firecontrol.js` (the hooks shown in the engineer's report, every one behind `M.on`), plus the new `lib/meta.js` (174 lines). `bot.js` and `Dockerfile` are identical. |
| Bundle source against `MX_meta` | MT_A, MT_B and MT_ALL `bot/` differ from `MX_meta` only in the `saltTable` line of `lib/params.js`. |
| `MX_base2` and the other folders untouched | Every file under `MX_base2` keeps its creation time (04:28:48); `MX_base2/lib` equals `T2_ident/bot/lib` except the `saltTable` line. Nothing under `variants7` outside `MX_meta`, `MT_*` and the other engineer's `MX_p26` / `P26_all` changed after 04:29 (`FL2_s03`, `T2_ident`, `UPG_1211` were written at 04:29, before the meta build). |
| Rebuild | 3 of 3: `bun build --minify --target=bun` from each `bot/` gives the sha256 of `dist/bot.js` (MT_A 23cae8b7…a506e, MT_B f4d30ca6…64dff, MT_ALL 3745f105…385a3; 233,777 bytes each). `Dockerfile`, `LICENSE` and `README.md` in the three `dist/` folders are byte-identical to those of the last pushed build `MV5_s1`. The gate's P11 agrees in all six gate runs. |
| Unit | `metawork/meta_tests.mjs`: 35 of 35 on `MX_meta` and 35 of 35 on `MT_ALL/bot`; the output equals the engineer's line for line except the timing line (worst 3.76 ms and 4.49 ms CPU on the kit stream, engineer 5.83 ms). |
| Identity, digit and upper-case tables | `MX_meta` against `MX_base2`, same table on both sides (`''`, `1211111111111111`, `9a3Z111111111111`, `MMMMMMMMMMMMMMMM`), kit stream and long4800, each under squad, auto and forced FFA: 24 of 24 byte-identical (30,600 decisions), `B.meta` null on every run, errors 0, fuse 0. Upper-case `M` stays the pure salt 22. |
| Per-slot bundle pairs | Each bundle's own `lib` at a slot (MT_A and MT_B: 0, 1, 7, 8, 15; MT_ALL: 0, 3, 15) against `MX_base2` with the same table where `m` is replaced by `1` (an `m` slot plays salt 1): 78 pairs on kit and long4800 under squad, auto and forced FFA. Digit slots (30 pairs, including MT_B slot 1 at salt 2): byte-identical, no meta object. `m` slots (48 pairs): forced FFA identical with 0 decisions on (16 pairs); kit squad and auto identical with the meta on for 181 of 300 decisions (16 pairs); long4800 squad and auto differ in 7 of 4,800 decisions with the meta on for 2,500 (16 pairs, the same 7 decisions every time). All 112 differing decisions had the meta on at that decision, 0 with it off; the counters never moved while off; the meta was never on in FFA. Errors 0, fuse 0 over all 192 recordings. |
| The 7 long4800 decisions | 115-116 (t 11.7 s, gun only, 0 kills; offer gun_mag / gyros / lightning_efficiency): meta gun_mag, today gyros. 1626-1627 (t 172.6 s, gun + lightning; offer servos / gun_rate / lightning_range): meta servos, today gun_rate. 823, 1320, 2014: torso aim only (the gun finish keeps the torso on the gun solution while the beam is held); no fire, move, reload or pick field changed. Both are what the spec's order says; long4800 is the synthetic protocol stream, so these are plausibility reads, not behaviour. |
| Conformance | `run_check.sh base` and `v3dir`: PASS for all three bundles, `world=true nav=true brain=true`, errors 0, slow 0, 0 of 300 answers over 50 ms; bot-side worst answer 2.3-6.2 ms (machine-side p99 2.4-17.9 ms under load 10). No rerun needed. |
| Lockstep, kit stream | Each `dist/bot.js` fed one observation at a time, twice: 300 answers, the same answer sha256 (0f97784933f87cc1) for all three bundles (slot 3 is `m` in MT_A and MT_ALL and `1` in MT_B, and the meta changes nothing on the kit stream), max 2.6-8.0 ms wall, exit 0. The two stderr lines are the map-load messages for the hello's `../arena` and `/arena` paths, identical on the reference build `MV5_s1`. |
| Release gate | See the timing section. Every non-timing check (P1-P11, H1-H8, R1, R2, R4-R9, R11, R11b, R12, R13, R14) PASS in all six of my runs; H9 waived as on every earlier push. |
| Forbidden words | The owner's grep from `release_gate.sh` prints nothing for all three `dist` folders; comment lines 0 besides the `// @bun` pragma; no "META", "fable", "chaos", "coach" or "spec" string. The names `metaSet`, `saltTable`, `gunFinish`, `reloadAt`, `upOrder`, `pileAbort` are visible in the bundle, the same class as the 938 waived parameter names. |
| Simulator, 12 squad seeds | All-`m` table against all-`1`, seeds 1-12, `--jobs 1`: every per-seed line (slot, place, score, kills, alive, dealt, taken, cause) equals the engineer's `m.txt` and `one.txt`. Errors 0, fuse 0. Kills 49 against 49; alive 986 s against 895 s; 11 of 12 seeds differ in kills (both ways). |

## Behaviours in the simulator (12 matches, 8,946 decisions with the meta on)

Counters are decision points where the meta's answer differs from today's code (one cube or one pickup per decision counts once).

| Rule | Count | Reading |
|---|---|---|
| Upgrade pick differs (`orderDiff`) | 1 of 24 offers seen while on | The order change is nearly inert: today's order already puts plating, armor, nanites first, and the meta is off after the first foreign death. |
| Mortar refused (`mortarNo`) | 72 | Fires (today's code takes a mortar after 60 s with nothing better, `laserEcon` is off in the fielded SELECT). |
| Lightning reach capped (`lightCap`) | 102 | Fires. |
| Cube reach by lines (`cubeDiff`) / kill pile reach (`pileDiff`) | 3,926 / 4,329 | The pickup rules dominate the meta's effect. |
| Pile walk abandoned (`pileAbort`) | 6 | Fires. |
| Cube refused past the cap (`cubeRefuse`) | 3 | Fires. |
| Crate allowed under today's 90 % hp (`crateLow`) | 71 | Fires: the LOOT farm gate drops from 90 % to 40 % hp for crates (drones need 50 % and 4 s without a mech, `droneNo` 7). |
| Reload at 5-8 rounds (`reload8`) | 31 | Fires. |
| Gun finish (`gunFin` / `gunFinHold`) | 20 / 1 | Armed 20 times; it withheld a beam release once. |
| Laser on-path only from 3 kills (`laserK3`) | 0 | Never reached (no match held 3 kills without a laser). |

The simulator cannot rank the bundles; it shows the rules are live and the build does not collapse (errors 0, worst CPU per
decision 10.5 ms with the meta, 18.5 ms without).

## Code against META_SPEC

| Spec item | Code | Finding |
|---|---|---|
| §5 `params.metaTable`, `saltTable` untouched (`m` parses as salt 22) | A lower-case `m` in `saltTable` means salt 1 with the meta on; digits and upper-case letters stay pure salts (verified: `M` table identical to `MX_base2`). | **Deviation, disclosed by the engineer.** A meta slot can only play salt 1. Consequence for MT_A: slot 1 drops the fielded salt 2, so its comparison with the fielded table is salt + meta, not the spec's R3 same-salt test; MT_B keeps `2` at slot 1 and is the clean half. |
| Hooks only in SQUAD while the firewall holds | `M.on = hunt.firewall() && env !== 'FFA'`, set in a `meta` stage after `assess` and before `econ`; every hook in `economy.js` and `firecontrol.js` reads `M.on` first. The only `wantPickup` caller outside `econ` (`steal.legs`) runs in the `legs` stage, after `meta`, so no hook reads a stale `M.on`. | Matches; confirmed by the 192 recordings (never on in FFA, inert while off). |
| §2 upgrade table | Base order and the four overrides (SQ, LZ0, LZ1, GN0) as 16 precomputed tables; plating first in all 16 (unit test); not-held penalties kept in `pick`; `upgPhase` bypassed; `mortar_damage` / `mortar_rate` gone. | Matches. |
| §3 threshold cube 100 m at <= 1 line, 30 m at 2+ | `cubeReach`, thresholds read from `config.cubes.upgrade_thresholds` up to the stat cap ([1, 3, 6, 10]). | Matches. Note: out of contact this extends today's 60 m (`lootCubePath`) to 100 m. |
| §3 other cube 52 / 30 m; refuse at >= 10 unless within 2 of 15 | In contact 52 at <= 1 line, 30 at 2+ (today 70 / 40); the LOSING limit (12 m) kept; out of contact today's 60 m. Refusal past the cap unless the next threshold is within 2 (today: 3). | Matches. |
| §3 kill pile min(115, 58 n / lines), 25 m at 3+ lines, abort after 6 s | `n` = max(2, remembered cubes within 25 m of the kill), not the spec's "2 + victim cubes" (not observable); `killReachOk` false still caps at today's 70 m; abort after 6 s of a pile walk. | Matches in effect; `n` is an estimate. |
| §3 crate: idle full beam, or 7 bullets at zero lines and hp >= 40 % | `crateOk`: 7 gun rounds and hp >= 40 %; the LOOT farm gate itself lowered from 90 % to 40 % hp. | The "idle full beam" alternative is **not built** (the engineer's report says so). The 40 % gate is the spec's number; it is also the largest behaviour change in the simulator (`crateLow` 71). |
| §3 drone hp >= 50 %, no mech seen 4 s | `droneOk` in LOOT only. | Matches. |
| §3 laser none held: 60 m at 0-2 kills, 4 m from 3 kills | 0-2 kills unchanged (60 m in contact, 120 m in LOOT); 4 m from 3 kills in both choosers. | Matches the engineer's stated reading; LOOT keeps 120 m rather than 60. |
| §3 lightning within 35 m; mortar never in SQUAD | 35 m in LOOT (today 120) and in contact (today 35); `wantMortar` false while on. | Matches. |
| §4 reload in a lull at <= 8 | `reloadAt` 8 with today's lull test (0.4 s quiet or hide phase, no low target in sights). | Matches. |
| C2 gun finish: hp <= 90 x dmgMult, 3+ rounds, hold the beam | Plus the engineer's gates: target listed, line out, flight gate OK, gun solution, muzzle clear (`B.gunLos`), no hold, not reloading, in range, not an NPC. While armed the beam is not released, the torso stays on the gun aim, and the charge is held 2 s after the kill; the force release after `laserForceS` still applies. | Matches with the disclosed additions; the unit scene and the simulator show the gun fires while the beam is held. |
| §1 DROP (set d), §6 band overrides, zone `far` | Not built; bands unchanged (unit test: gun 55-95, laser 125-185). | As the spec says. |
| §7 per-slot keep-or-revert test | Not executed (no game server); simulator neutral (49 vs 49 kills). | The bundles ship set c untested for gain; MT_ALL contradicts R3 (one slot at a time). |

## Timing

| Run | MT_A | MT_B | MT_ALL |
|---|---|---|---|
| Release gate, my first pass (05:34-05:37, load 9-11, 1-2 other processes in the 1-CPU group) | GO: R3 p99 5.5 / max 29.4 ms; R10b late 1 of 3,939, p99 9.04, max 58.9 | NO-GO on R10b alone: late 2, p99 15.87, max 97.9; R3 p99 2.2 / max 3.6 | NO-GO on R10b alone: late 0, p99 15.92, max 39.1; R3 p99 11.6 / max 16.8 |
| Release gate, rerun (05:40-05:43, load 11 falling to 6) | 1 other process in the group: NO-GO on R10b alone, late 1, p99 15.62, max 75.0; R3 p99 7.1 / max 10.2 | uncontended: GO, R3 p99 2.3 / max 8.6; R10b late 0, p99 7.07, max 23.5 | uncontended: GO, R3 p99 5.9 / max 12.0; R10b late 0, p99 5.46, max 12.4 |
| Release gate, third run for MT_A (05:43-05:44, uncontended, load 7) | GO (35 PASS, 1 waived): R3 p99 3.9 / max 14.9 ms; R10b late 0 of 3,939, p99 8.8, max 48.3 | - | - |
| Earlier QA pass's gate (05:26-05:30, `S/qa_meta/gate_*.txt`, quoted as reference) | GO: R3 p99 6.3 / 6.6; R10b 0 late, p99 7.96, max 29.2 | GO: R3 p99 6.4 / 24.9; R10b 0 late, p99 7.06, max 20.9 | GO: R3 p99 3.6 / 24.9; R10b 0 late, p99 5.88, max 13.3 |
| Lockstep kit stream, 2 runs each (wall, Dockerfile engine limits, load 6) | max 6.1 / 4.3 ms | 6.0 / 3.5 ms | 8.0 / 2.6 ms |
| Unit harness, kit stream meta slot (CPU) | - | - | worst 4.49 ms, p99 2.57 (MX_meta 3.76 / 1.90) |
| Simulator, worst CPU per decision, 12 matches | - | - | 10.5 ms with the meta (18.5 ms with salt 1) |

Every R10b failure happened with another session's gate in the same 1-CPU cgroup (the gate prints the note itself), and
every uncontended run of the same bundle passes with p99 5-9 ms; the p99 crosses the 15 ms line by 0.6-0.9 ms only under
that contention. The 1-CPU quota, not the bot, is what the contention halves. REPO_HYGIENE.md requires the gate before every
push in any case: run it on a quiet machine and push only on GO.

## Notes for the owner

- The three bundles are integral: rebuilt byte for byte from their `bot/` folders, inert outside `m` slots, inert in FFA and
  whenever the firewall is down, no errors, no fuse, no exceptions, conformance and lockstep clean.
- What the meta does on real inputs is small: 0 of 300 decisions on the kit stream, 7 of 4,800 on the synthetic long stream
  (2 offers, 3 torso aims). In the simulator the pickup-reach, crate-gate, mortar and lightning rules fire constantly, the
  upgrade rule once in 24 offers, the gun finish withheld one release.
- The spec's own evidence rule (R3: one slot, same salt, keep only on a measured gain) is not met by any bundle: MT_ALL is a
  whole-table change, MT_A and MT_B are eight-slot halves, and MT_A's slot 1 changes the salt as well. If one slot is to be read
  as "meta on versus the fielded table", MT_B's slots 8-15 are the clean comparison (same salt 1 as the fielded table there).
- The `m`-means-salt-1 design (instead of the spec's separate `metaTable`) is the one deviation with a lasting cost: a meta
  slot cannot carry any other salt. Worth changing in a later build if per-slot salts are kept.
