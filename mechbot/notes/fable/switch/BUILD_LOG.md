# Fable switch panel, 5 of 5: build log (engineer)

Written Sun 22 Nov, 01:55-02:55 UTC. One author (the engineer agent); nothing here is independent review. All numbers
are from this machine (4 cores, load 20-30 during the whole run): the simulator and the open-loop streams, not the game
server. Simulator results are behaviour evidence only; 24 seeds cannot separate differences of a few kills (the up / down
columns say so). S = the session scratchpad.

Work folder `S/fable_work/switch`: `tree/` (copy of `r7work/ckpt_07_LG`, all edits here), `bot` (symlink to tree, for the
simulator's `../bot/lib/world.js|nav.js` imports and the suites), `sim/` and `tools/` (copies of `r7work/sim`, `r7work/tools`),
`kit`, `replay`, `notes` (symlinks), `id/` (identity recordings), `out/sim/<tag>/` (simulator metas), `builds/<name>/{bot,dist}`.
Nothing outside this folder and this notes folder was written. No git, no game server, no network.

## 0. Result in brief

| Item | Preset (old value first) | Built | Reach in the simulator (24 seeds, 5.38 SELECT, salt 1) | Reading |
|---|---|---|---|---|
| NC negative plan cache | none (always on) | yes | byte-identical: 108/108 recordings, 24/24 matches | keep |
| FU work-count fuse | `fuse: wall / work` | yes | 0 of 24 matches differ, 0 changed lines on 28 sources; trips 2 / 4 | not identity-preserving by construction, so a preset; harness uses `fuseMs 1e9` instead |
| dropLife | `dropLife: off / on / idle` | yes | we never live to the 95 s landing (longest life 87.9 s): 1 match differs (on), 2 (idle); 0 captures | mechanism works (modified-config run: 5 captures in 12 matches, base 0), value not shown |
| util | `util: off / tgt / wait / on` | yes | tgt: 16 differ, 98 kills against 95 (4 up, 6 down); wait: **no trigger at all** (0 matches, 0 lines) | tgt is neutral in the sim; wait has no reach, by its own stop rule it is dropped |
| pauseMove | `pauseMove: off / on` | yes | 20 differ, 103 kills against 95 (8 up, 7 down), alive +20 s | the only value with a visible plus; inside seed noise |
| isoDwell | `isoDwell: off / on` | yes | 20 differ, 98 against 95 (7 up, 4 down), alive +32 s | small plus, inside noise |
| upgFix | `upgFix: off / on` | yes | 0 matches differ, 0 changed lines | harmless and without effect here |

Identity of the old values: **108/108** recordings byte-identical (DEF, KS, KB against `r7work/id/ck07`; the 5.38 SELECT
against `variants6/FNV_s1/bot/lib`), section 2. Ten bundles built and conformance PASS on `base` and `v3dir`, section 9.

## 1. Harness

- `tools/recs.js` = R7a `rec7.js` with the simulator import pointed at `switch/sim`, a count of our `drop` events
  (`dropEv` = supply drops we captured) and `CFGJ` (a JSON patch of config sections, used only for the dropLife
  mechanism run). World / Nav of the recorder still come from `r7work/ref_bot` (read only).
- `tools/idb.sh` = R7a `idbatch.sh` for this folder: the R3a2 set (kit / long4800 / long11 / long23p x squad / auto, sim
  squad 1-6 = 14) and the FFA-inert set (kit + check2a ffa_s1-4 x auto / forced FFA, sim FFA 411-414 = 14; `kit_auto`
  is in both, so 27 recordings per SELECT). SELECTs: DEF, KS, KB as in R7a, and FNV = the 5.38 SELECT with `salt: 1`.
- **Fuse and the loaded machine.** Single decisions took up to 317 ms of wall time here (`maxMs` in the metas), so the
  30 ms wall-clock fuse would have tripped and faked identity failures. Every recording of this log (reference and new)
  runs with the plain override `fuseMs: 1e9`. That equals a run in which the fuse never trips, which is what the R7a
  references are (`fuse 0`, re-recorded there until clean). No recording needed a rerun.
- `tools/simb.sh`: 24 squad seeds (1-24), 5.38 SELECT, salt 1, `nice -n 19`, one process per lane, at most 2 lanes.
  `tools/sims.py`, `tools/chg.py`, `tools/early.py` print the tables below; `tools/idc.py` compares hashes.
- `tools/test_switch.mjs`: 36 unit checks on the real map (section 8). `tools/mkbuild.sh`: bundle + conformance.
- Base check: `out/sim/base` (the unmodified `variants6/FNV_s1` lib): 95 kills, 1692 s alive in 24 matches, the same as
  the pause / ambush designer's base (95, 1692).

## 2. Identity of the old values

Tree = `ckpt_07_LG` + the preset lines of `variants6/FNV_s1/bot/lib/params.js` (loseCover values, `oneHit`, `fightOn`,
healDoc values; SELECT keys `oneHit: 'off'`, `fightOn: 'off'`) + this build. New SELECT keys sit before `healDoc`, which
stays the last key (test_aggr7 checks that). Tree SELECT = the ckpt_07 defaults, `salt: 0`.

| Check | Result |
|---|---|
| DEF / KS / KB, 27 recordings each, against `r7work/id/ck07` | 81/81 byte-identical |
| 5.38 SELECT + salt 1, 27 recordings, against `variants6/FNV_s1/bot/lib` recorded here (`id/refFNV`) | 27/27 byte-identical |
| fuse trips / stage errors over the 108 recordings | 0 / 0 |
| `counters.plansCached` (NC acting) | 912 on long4800 (the designer measured 912), 1859 over the 27 FNV recordings |
| Sim `nc` (tree, every preset old) against `base` (FNV_s1 lib), 24 seeds | 24/24 same hash |

Run twice: `id/final` (tree before the last dropLife edit, 108/108) and `id/final2` (the frozen tree the bundles were built
from, `out/tree_freeze.sha256`): **108/108 byte-identical**, fuse 0, errors 0
(finished 02:51 UTC; the tree was not touched afterwards, and every `builds/<name>/bot/lib` equals `tree/lib` except params.js).
The simulator and changed-decision runs of util, pauseMove, isoDwell, upgFix and fuse were made on the tree before that
last edit, which touched only dropLife lines (the `idle` value: `goIdle` in economy.js and one term in decideMode).

## 3. NC and FU

**NC** (mover.js `plan()`): the designer's `nc_patch.diff` applied unchanged. When the last plan from this very cell to this
very goal point with the same cap, body and grid generation gave no usable path (and was not a "partial path dropped"),
the search is skipped and the same empty result is written. Always on, no preset. Identical on everything above.

**FU** (brain.js `fuse()`), preset `fuse: { wall, work }`, default **wall**. `work`: the fuse trips when the A* cells
expanded in this decision (`B.decExp`, summed in `plan()` and the zone-length plan) exceed `fuseExpand` 15000, and on the
wall clock only at `fuseWallMs` 45. **It is not identity-preserving on an unloaded machine by construction**: a 15000-cell
search takes about 4-8 ms, far under 30 ms, so `work` trips in decisions where `wall` does not (the position evaluation or
the hide search of that decision is then skipped). Measured: 4 trips on the 28 sources and 2 trips in 24 sim matches,
**0 changed lines and 0 changed matches** in both. So it stays a preset; the identity harness uses `fuseMs: 1e9` instead.
Unit test: with `fuseMs: -1` the wall fuse trips 40 times in 20 decisions, `work` trips 0 times and equals the no-trip
run; with `fuseExpand: -1` `work` trips.

## 4. dropLife: `off / on / idle`

Code: economy.js `dlUpdate()` (every decision), `dlLegs()`; tactics.js `decideMode` (3 lines); brain.js `fightLegs` (the
pull) and the DROP leg name. Gate: SQUAD posture and `hunt.firewall()` (no foreign death, next radius > zoneLateR, more
than 3 alive), not in LAST-STAND. With `off`, `B.dl` stays null and no line of it runs.

Where the numbers come from: every drop number is read per drop from `obs.drops` (`radius`, `lands_in`, `capture_s`,
`progress`, `holder`), which the server fills from `config.drops` (`radius` 8, `times` + `fall_s` 25, `capture_s` 4); the
landing point does not exist before the announcement, so `times` is not needed by the bot. No constant of this map is
used (test DL8: a 20 m ring is read as 20 m). Tunables (params.js): `dlLateS 12, dlArriveS 2, dlPayWalkS 3, dlSlack 0.8,
dlStrafe 0.35, dlPad 2.5, dlInset 3, dlReserveHpf 0.05, dlIntakeK 1.0, dlFightR 30, dlIdleR 0 (idle: 40)`.

Rules (`on`):
1. A drop counts from its announcement if we can be inside the ring by the landing + `dlLateS` (walk time = path estimate
   / walk speed), the ring stays inside the zone for the capture, and a foreign capture would not finish before we arrive.
2. **hp rule** (the stated rule): `hp > B.A x dlIntakeK x (min(walk time, dlPayWalkS) + capture time left) + dlReserveHpf x max hp`.
   B.A is the incoming dps estimate of this decision. Our hp must pay the expected intake of the last 3 s of the walk and
   of the whole capture, plus 5% of max hp. If it does not: no pull, no capture, the fight goes on as today.
3. **Pull (`go`)**: when the walk time reaches `(lands_in - dlArriveS) x dlSlack`, fight legs and idle legs walk to the ring
   (grab-style 0.35 strafe blend while the target has a line); the mode stays FIGHT and the torso keeps firing. A beam hide
   and the bullet dodge stay above it. With another mech inside the ring: only to within `dlFightR` of it.
4. **Capture**: the drop has landed or lands within `dlArriveS`, **no other mech inside `radius + dlPad`** (the contest test is
   the ring; the old test "any mech within 60 m" is not used) and the hp rule holds: **DROP outranks FIGHT** (below ZONE
   only), we walk in (boost when more than 25 m away) and stand `dlInset` m inside the ring, strafing on a leash round
   the centre while a target exists; fire control is untouched, so the trigger stays down (test DL1b).
5. `idle` = `on` + with no target we walk to within `dlIdleR` 40 m of the ring from the announcement on (DROP stays below
   FIGHT there). Added because `on` alone starts moving late.

Simulator, practice config (drops called at 70 s, landing at 95 s):

| 24 seeds | kills | alive, s | matches that differ | up / down | drops captured | counters (decisions) |
|---|---|---|---|---|---|---|
| base | 95 | 1692 | - | - | 0 | - |
| dropLife on | 94 | 1703 | 1 | 0 / 1 | 0 | drop listed 1613, not reachable 557, firewall off 73, pull `go` 85 (3 matches), pulled in a fight 68 (1 match) |
| dropLife idle | 94 | 1701 | 2 | 0 / 1 | 0 | as on + idle walk 74 |

**The simulator cannot test this preset on the practice config**: in the 24 base matches the longest life is 87.85 s and
15 of 24 reach the 70 s announcement, none the 95 s landing. The one match that the pull changed (seed 1) lived 95.5 s
instead of 85.1 s, with 6 kills instead of 7.

Mechanism run on a **modified config** (`drops.times [25, 50, 75]`, `fall_s 15`, read from the hello by the bot; 12 seeds;
not the practice rules, so only the mechanism counts):

| 12 seeds | kills | alive, s | differ | up / down | drops captured | notes |
|---|---|---|---|---|---|---|
| base (old drop rule) | 54 | 877 | - | - | 0 | old DROP mode 215 decisions, no capture |
| dropLife on | 50 | 882 | 10 | 3 / 5 | **5 (in 5 matches)** | capture mode 753 decisions, pull 562, hp rule refused 172, not reachable 2857, firewall off 501 |
| dropLife idle | 44 | 837 | 10 | 2 / 6 | 4 (in 4 matches) | idle walk 157 |

Trace of seed 4 (on): pull from 25.0 s out of a 73 m gun fight, DROP mode at 37.5 s, in the ring at 39.5 s with two lines
on us, captured at 43.9 s (hp 1674 -> 1868 with the 3 cubes), then FIGHT. The second drop was out of reach (the 12 s
`dlLateS` window is short against a 15 s fall). Kills did not rise in this sample; the captured matches read 3, 4, 6, 9, 4
kills against 6, 3, 6, 7, 1. So: the capture works closed-loop; whether it pays is not shown. Two limits that will matter
officially: the firewall switches the preset off after the first foreign death (501 decisions here), and the hp rule
uses B.A, which over-reads the real intake in the ring (363 dps estimated, 0 hp lost in the trace).

Changed decisions on the 28 sources (5.38 SELECT): on: 269 of 34010 lines in the R3a2 set (3 of 14 sources), FFA-inert set
0 of 14123 (0 of 14). idle: the same 269 of 34010 lines (3 of 14 sources; idle walk 12 decisions), FFA-inert set 0 of 14123.

## 5. util: `off / tgt / wait / on`

Code: new `lib/util.js` (129 lines, `makeUtil(B, hunt, mover)`), created by brain.js only when `utilTgt || utilWait`
(else `B.util` is undefined and every site short-circuits); `pre()` between `hunt.pre` and `selectTarget`; tactics.js
`selectTarget` (gate for non-hostile candidates, the pick after the 25% keep rule, the torso veto skipped while the
utility owns the pick, no drone farming in a wait); brain.js `holdLegs` first line. Formulas and parameters as in
switching.md sections 2-5. Gate: SQUAD posture and `hunt.firewall()`.

Deviations from the design text, each on purpose:
- The regeneration numbers come from the mech stats (`me.regenDelay`, `me.regenPerS`), not the constants 5 and 45.
- `OPEN x rearMult` is not applied a second time: `hunt.ttk` and `tr.tau` already count the rear multiplier in T.
- `wait` follows the pseudocode (`enter = U_W > U_open x (laser ? 1.25 : 1)`, k >= `uWaitK` 3), plus the W1 entry
  "no hostile mech listed". `uWaitLegs`: the hide cell when it is within 2.5 s, else stand; the "walk to the prey and stop
  at arrive + 60 m" part is not built. W4 and W5 are not built.
- target candidates = mechs with a line out or in inside 1 s (the design's 1 s), at most 6.

| 24 seeds | kills | alive, s | differ | up / down | counters |
|---|---|---|---|---|---|
| base | 95 | 1692 | - | - | - |
| util tgt | 98 | 1735 | 16 | 4 / 6 | uTgtKeep 326, uTgtSwitch 77, uTgtPick 7, "every U_F 0, base pick" 1234 |
| util wait | 95 | 1692 | **0** | 0 / 0 | uHold 0 |
| util on | 98 | 1735 | 16 | 4 / 6 | identical to tgt |

**`wait` never triggers.** Reach counters on seeds 1, 5, 9, 11 at `uWaitK` 3, 2 and 1: with k reached and no laser there
are 155-593 decisions per match, of them with hp < 95% 155-275, of them out of contact (no line, not hurt for 1 s, no
hostile mech listed) **0**. In the one laser match (seed 9) the wait was allowed for 77-133 decisions and no non-hostile candidate
came up; seed 11 held a laser at every such decision. On the 28 sources `wait` changes 0 lines. In this simulator the bot is never out of contact below 95% hp once it
has a kill, which is the failure the designer named ("hunters arrive before the hp does"). By the design's stop rule
(`uHold` under 20) the idea is dropped; the bundle exists and behaves as the base wherever the trigger is absent.

`tgt`: of the 1644 counted decisions with 2+ lines, 1234 had every utility at 0 (Td / T under 0.6: we cannot finish anyone before we die at
the current intake), where the base pick stays. Changed decisions on the 28 sources: 4765 of 33906 lines in the R3a2 set
(11 of 14 sources); FFA-inert set 5 of 14123 lines, all in `f1_auto` from tick 354, before its first foreign death at
tick 422 (SQUAD posture, firewall open); every forced-FFA source identical.

## 6. pauseMove: `off / on`

Code: mover.js `pmOpens()`, `pmWalkClean()` and the rule in `standoff()` (the designer's prototype, with the firewall and
`B.mode === FIGHT` added); brain.js `fightLegs`: the walk test before the isolate cell (cell only with `xOther === 0` and
a straight walk, sampled every `pmStep` 8 m, that opens no new line) and before a mid-fight grab (with 2+ lines a grab
farther than `pmGrabNear` 12 m whose walk opens a line waits, unless it is a laser we lack). Parameters `pmHorizon 0.7,
pmR 220, pmMinLos 1, pmGrabNear 12, pmStep 8`.

| 24 seeds | kills | alive, s | differ | up / down | counters |
|---|---|---|---|---|---|
| base | 95 | 1692 | - | - | isolate legs 2023, stand-off 4828 |
| pauseMove on | 103 | 1712 | 20 | 8 / 7 | pmPause 524 (of them stand 460), isolate refused 1208, grab postponed 105; isolate legs 847, stand-off 5701 |

Reading: +8 kills with 8 up and 7 down is inside the seed noise, the same size as the designer's strafe-only prototype
(+5, 5 up / 8 down). The walk test does most of the work: it refuses 59% of the isolate walks. 460 of 524 strafe
triggers end in a stand (both sides open, or the 0.4 s flip floor), which is the stand-still risk the designer named;
intake at one line was not measured here. Changed decisions: 4893 of 34256 lines in the R3a2 set (12 of 14 sources).
FFA-inert set: 2476 of 15420 lines in 2 of 14 sources, both closed-loop FFA sim matches (ff413 from tick 134, ff414
from tick 102), first difference before their first foreign death (ticks 404 / 386); every open-loop source and every
forced-FFA source identical. See section 10.

## 7. isoDwell and upgFix

**isoDwell** `off / on` (brain.js `fightLegs`, state `iso`): once in isolate (1) stay `isoMinS` 0.6 s, then while a line is
on us and `B.A - tgt.a > isoKeepA` 10, same target; (2) the committed cell is kept for `isoCellS` 3.0 s instead of
following every new evaluation; (3) within `isoArriveR` 3 m the cell is held for `isoStayS` 0.8 s, then released.
Not while finishing or rushing; firewall. Not built: the 2 m jink along the cover edge (the hold is a plain stand with the
bullet dodge on top) and the logging of which clause lets the goal jump (part 2 is solved by the commit instead).

| 24 seeds | kills | alive, s | differ | up / down | counters |
|---|---|---|---|---|---|
| isoDwell on | 98 (base 95) | 1724 (1692) | 20 | 7 / 4 | arrival holds 668 decisions, gate-false keeps 139; isolate legs 2797 (2023), stand-off 3935 (4828) |

Changed decisions: 3876 of 34401 lines in the R3a2 set (12 of 14); FFA-inert set 2823 of 15771 lines in the same two
closed-loop FFA sim matches as pauseMove (ff413 from tick 136, ff414 from tick 108, before the first foreign death).

**upgFix** `off / on`. In every value the order is checked against `config.upgrades` at match start: `B.upgCheck`,
`counters.upgUnknown` / `upgMissing`, one stderr line (`upgrade order: unknown ids mortar_damage,mortar_rate; config ids
not ranked mortar_reload,mortar_velocity`). `on`: unknown ids are replaced by the real id (`mortar_damage ->
mortar_reload`, `mortar_rate -> mortar_velocity`) or dropped, and config ids missing from the order are appended; the
fixed order is used in the SQUAD posture behind the firewall. Effect: 0 of 24 matches differ, 0 changed lines on the 28
sources (a mortar is never held in SQUAD, so all mortar upgrades rank last either way). The unit test needs an
artificial offer (mortar_velocity / mortar_reload / mortar_velocity: pick 0 -> 1) to show any difference.

## 8. Tests

`tools/test_switch.mjs` (real map, scripted observations, 5.38 SELECT): **36/36** (`out/test_switch.txt`). For every
preset value the T-F2 form: acts in the SQUAD posture (trace differs from the old value), **forced FFA byte-identical to
the old value**, and one foreign death (firewall) identical.

| Group | Checks |
|---|---|
| defaults | every new preset at its old value; `B.util` undefined, `B.upgOrder` null, `B.dl` null |
| dropLife | DL1 landed drop 20-30 m away with a hostile target: DROP mode, target kept, trigger down (T-F2); DL2 pull out of a fight, legs `dropgo`, mode FIGHT (T-F2); DL3 not yet time to walk = off; DL4 a mech in the ring: no capture, counted; DL5 hp 12% under fire: hp rule refuses, no pull; DL6 drop 300 m away landing in 5 s = off; DL7 no target (T-F2); DL8 ring radius read from the drop; DL9 / DL9b value `idle` |
| util | U2 two lines, 30% target against a fresh harder attacker: off turns to it, tgt stays (T-F2); U4 hp 12%, all utilities 0: base pick; U5 gun only, k 3, hp 72%, calm mech without a line: target null, legs `uwait` (T-F2); U6 it hits us: FIGHT on that decision; U7a-d k 1 / laser / hp 96% / finishable = off; U8 ends after 14.0 s, no re-entry for 6 s; util `on` (T-F2) |
| pauseMove | PM1 strafe-side line test on a found geometry (T-F2); PM2 isolate cell with `xOther > 0`: no walk (T-F2). The grab rule has no unit test (sim counter `pmGrabWait` 105) |
| isoDwell | ID1 the goal jumps 15 m on the next evaluation: on keeps the committed cell (T-F2); ID2 arrival: held 8 decisions, then released; ID3 target change: out at once |
| upgFix | UF1 offer (T-F2); UF2 validation in both values; UF3 with `upg: 'speed'` |
| FU | wall / work / cell count |

Inherited suites on the final tree (`out/suites_final.txt`): test_tf2 13/13, test_iso7 5/5, test_lx7 7/7, test_fin7 6/6,
test_lg7 10/10, test_aggr7 14/14, test_io7 9/9, test_rb7 6/6, anchors7 21/21, test_counters 15/15, test_world 39/39
(one earlier run 38/39: D3 findPath worst case 41 ms under load), test_brain 107/109 and test_requests 10/12 to 12/12:
every failing check is a decision-time bound on this loaded machine (the fuzz check: threw 0, invalid 0, internal errors
0, slowest 33 ms against 25; a rerun passed 12/12). No functional check failed.

## 9. Bundles

`tools/mkbuild.sh <name> [key=value]`: `variants_tools/mkvar.py` (tree -> `builds/<name>/bot`, the ten SELECT entries of
the 5.38 build, salt 1, plus the one preset), `bun build bot/bot.js --minify --target=bun --outfile dist/bot.js`, the
Dockerfile copied into `dist`, conformance `run_check.sh base` and `v3dir`. The SELECT of `SW_NC_s1` equals the SELECT
of `variants6/FNV_s1` plus the six new keys at their old values (diff checked). All ten: base PASS and v3dir PASS,
`world=true nav=true`, worst answer in the checks 19.3 ms.

5.38 SELECT (all builds):
```
{ laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto',
  ffaCounters: 'on', ffaRules: 'on', aimDwell: 'off',
  R1: 'on', crateGate: 'ffa', R2: 'on', R3: 'on', aimCal: 'off', openFarm: 'on', cxFinish: 'on', cxKiterRamp: 'on', cxBrawler: 'off', ffaThirdFix: 'on', ffaBreakFix: 'on', hidePlanCap: 'on',
  pass2b: 'on',
  fightEarly: 'on', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'spend', upg: 'std',
  ffaDropGate: 'on', finalPoint: 'on', ffaTwo: 'on', ffaThree: 'on', ffaGate: 'on',
  hunt: 'off', seek: 'on', aggr: 'any70f',
  r3a2: 'on', pocketCfg: 'on', io: 'v4', ioMerge: 'on', loseExit: 'off', loseCover: 'never', oneHit: 'off', fightOn: 'off', finish: 'off', isolate: 'any', seekCrowd: 'off', laserGrab: 'std', anchorCfg: 'on', warmPocket: 'on', fb: 'on',
  fuse: 'wall', dropLife: 'off', util: 'off', pauseMove: 'off', isoDwell: 'off', upgFix: 'off', healDoc: 'off' }      salt: 1
```

| Build | One change to that SELECT | Bundle `S/fable_work/switch/builds/<name>/dist/bot.js` | sha256 | bytes |
|---|---|---|---|---|
| SW_NC_s1 | none (NC only) | builds/SW_NC_s1/dist/bot.js | 913a85bd00ff285b2c1d7bf4f0e310099a2c3fd7c0029f41f16c9f10f1a90e99 | 237392 |
| SW_FUwork_s1 | `fuse: 'work'` | builds/SW_FUwork_s1/dist/bot.js | 32a890d183064a7dac2d2eabf2f1ce2a8b71b3152178c950453e1cd58e71578e | 237392 |
| SW_DL_s1 | `dropLife: 'on'` | builds/SW_DL_s1/dist/bot.js | 84a7ba9351701b01ca33af9f96d22dbd6b7346c4603ff207b0f665376975c7bf | 237391 |
| SW_DLidle_s1 | `dropLife: 'idle'` | builds/SW_DLidle_s1/dist/bot.js | 4af5e1532816a4f47a24cfefc79eb773f80eecd49642c841f4e3d5f0082f330b | 237393 |
| SW_UTtgt_s1 | `util: 'tgt'` | builds/SW_UTtgt_s1/dist/bot.js | ef076c95a08348080b2a1810481e5c880b672a41750148a9fc6fc7c4c02b4b0d | 237392 |
| SW_UTwait_s1 | `util: 'wait'` | builds/SW_UTwait_s1/dist/bot.js | e7c0d288856b186a1b445b4556f34c0e5ec6e2efcc18de2506ba7e060cf88c14 | 237393 |
| SW_UT_s1 | `util: 'on'` | builds/SW_UT_s1/dist/bot.js | 6e9d8f626328b6cdd9e5e19855980dacd64f11265d6cfa6bc628aae91eb570c3 | 237391 |
| SW_PM_s1 | `pauseMove: 'on'` | builds/SW_PM_s1/dist/bot.js | fca0245e3808883450fa667a81c6c87983d689ce71dcbcc36880c8a1a7dd170a | 237391 |
| SW_ID_s1 | `isoDwell: 'on'` | builds/SW_ID_s1/dist/bot.js | 632a5dc686627289e3d7ee9c1082351cc5bc848b802b77f8523fe3fb3d0b69e1 | 237391 |
| SW_UF_s1 | `upgFix: 'on'` | builds/SW_UF_s1/dist/bot.js | fe2ce7f5bc9123be5d85f9c8d1bc29b83820b9d7d0887b497583e3e1892b1a7f | 237391 |

`dist` holds `bot.js` and the `Dockerfile` only (the LICENSE / README of a submission folder are not copied). The bundles
were not compared decision by decision with their source trees; the identity checks of section 2 are on the source lib.

## 10. Open points for the moderator

1. **Pre-death reach in FFA matches.** pauseMove and isoDwell change the two closed-loop FFA simulator matches of the
   FFA-inert set that are recorded with `env: auto`, and util tgt changes 5 lines of `f1_auto`, all before the first
   foreign death, where the posture is still SQUAD and `hunt.firewall()` is open. That is the gate the task asked for
   and the same gate as every R7a preset; the R7a presets simply did not trigger that early. Forced FFA is byte-identical
   everywhere (T-F2 and all `_ffa` sources). If "FFA-inert set 14/14 with the preset on" is required before an FFA
   freeze, these three need one more term (for example a minimum of our own kills, or t > openingS). Not done.
2. **dropLife is unproven.** The simulator bot dies before the landing on the practice config, so the 24-seed run is a
   no-op test. The modified-config run shows captures and no kill gain in 12 seeds. If it gets a slot, `on` before
   `idle` (idle lost more in the mechanism run: 44 against 54 kills).
3. **`wait` has no reach** in the simulator at uWaitK 3, 2 or 1. Not worth a slot unless official play has quiet windows
   the simulator lacks.
4. **Order by simulator evidence** (weak, 24 seeds): pauseMove (+8, 8 up / 7 down), isoDwell (+3, 7 / 4), util tgt (+3,
   4 / 6), dropLife (-1), then the no-ops (upgFix, wait, FU, NC). None is outside the noise of a 24-seed run.
5. Not built from the designs: ambush / moveWin (pause_ambush 2, 4), sndDwell / zonePlan / pathCap (code_opt R2, R3, PC),
   util W4 / W5 and the prey walk of `uWaitLegs`, the isoDwell jink.
6. Presets were tested one at a time on the 5.38 SELECT. No combination was run.
