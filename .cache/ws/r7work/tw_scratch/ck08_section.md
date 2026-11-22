
## Checkpoint 08: TW, a SQUAD-only override layer (`ckpt_08_TW`, `dist_08/bot.js` 228016 bytes, sha256 2091255c5532...)

Built 01:34-{{END}} UTC Sun Nov 22 (Opus sub-agent, Mech bot engineer). Folders: `r7work/ckpt_08_TW` (tree = ckpt_07_LG + the
layer), `r7work/dist_08` (bundle), `r7work/tw_scratch` (harness copies, recordings `tw_scratch/id/<tag>`, tests, sims, logs).
Nothing else changed: ckpt_01-07, mechbot/bot, mechbot/sim, variants*, fable_work and r7work/tools untouched; no git, no game
server. The machine load average was 20-30 for the whole session (other agents' sims and Shopping builds on all four cores), so
every identity recording and every sim below ran with the emergency fuse disabled on both sides (`fuseMs: 1e9`, a plain
override; in a first batch at load 30 the 30 ms fuse tripped in 18 of 81 recordings and the 10 that differed were all among
them): this is logic identity, and the
r7work/id/ck07 references were recorded at 22:32 with 0 fuse trips, so they are the same logic.

### What the layer is (two files; with `tw: 'off'` nothing reads it)

- **params.js**
  - New preset `tw: { off: {} }`, SELECT `tw: 'off'` placed just before `healDoc` (healDoc stays the last SELECT key, which
    test_aggr7 checks). The moderator adds values later, e.g. `tw: { off: {}, k35: { sqOverrides: { keepTargetHpf: 0.35 } } }`.
  - **Any** preset value may carry `sqOverrides: { key: value, ... }` (plain PARAMS keys). resolveParams merges them in SELECT
    order (later presets win) into `P.sqOverrides`; the preset's own plain keys still go to P as before. A plain
    `overrides.sqOverrides` replaces the merged set (the rehearsal copies P this way; the harness passes candidates this way).
    With no sqOverrides anywhere P has no `sqOverrides` key: resolved params identical to ckpt_07 (516 keys, DEF / KS / KB / KSF).
  - `checkSqOverrides()` (exported) **refuses at resolve time**: a key that is not a PARAMS key (typo), a key of `SQ_REFUSED`
    (table below), or a value of another type than the PARAMS value (typeof, array-ness, non-finite number). It throws, so
    createBrain fails, bot.js runs its fallback policy and prints the error on stderr: release-gate R14 (exception lines) fails,
    a bad tw value cannot ship silently. Helper `tw_scratch/mktw.py <params.js> <name> '<json>' --select` adds a tw value,
    selects it and resolves it at once (a refused key fails there).
- **brain.js** (createBrain, act)
  - Once at creation: the keys, the override values and the base values (after anchorToConfig) of P.sqOverrides.
  - act(): right after `B.aliveN` is taken from the observation (nothing has read P yet in this decision) `twSync(true)`: when
    `hunt.firewall()` is open (SQUAD posture, `B.foreignDeaths < h50ForeignMax` (1), not next radius <= zoneLateR (70), not
    1 <= alive <= h50LateAlive (3)) the override values are written in place on the shared P object, otherwise the saved base
    values are written back. Re-checked (restore only) after the sense stage (the new zone radius) and after the stance stage
    (stance.environment() updates `B.foreignDeaths` and the FFA latch), so a closing firewall reverts P before the next stage of
    the same decision: of the decision that sees the trigger, only the stages before the trigger ran on the overrides (for a
    foreign death: sense to stance; the legs and fire of that decision already run on base values).
  - P is written only when the gate state flips: O(number of override keys) per flip, a few comparisons per decision otherwise.
    Counters `twFlips` / `twDecisions` exist only with overrides (with tw 'off' the recorder metas are identical too).
  - The rehearsal brains get a copy of P (sqOverrides included) and run the layer on their own P (the rehearsal's phase 12
    drops the alive count and closes the gate, so the apply and the restore path both run before the first real decision);
    the main brain's P is untouched until its first act().

### Keys that cannot be overridden this way (`SQ_REFUSED`, 27 keys; resolveParams throws)

Method: a Proxy on P (`tw_scratch/trace_keys.mjs`) recorded every key read while createBrain runs and while act() runs, over
12 runs (sim squad 1-8 under DEF / KS / KS+any70f+fb and with loseCover near, finish ttkb, isolate near, laserGrab wide,
loseExit on, healDoc full, hunt h50, pulse+laserEcon+focus add+io all, crateGate all+aimDwell+openFarm d0+R3 gun, r3a2 off +
pass2b off; sim FFA 411-412; kit stream auto; long4800 squad), then code reading of warmUp (the trace ran with warmup off) and
of bot.js. nav.js and world.js read **no** PARAMS key (bot.js builds Nav from hello.config: cell 2, step_up, max_slope_deg;
World from the map files), so nothing of the map layer is reachable by presets or overrides at all.

| key | read only at | why refused |
|---|---|---|
| warmup, rehearseN, rehearseFfaN, warmPocket | brain.js warmUp, inside createBrain | the rehearsal runs once per process before the first decision |
| rngSalt, salt | createBrain (match RNG seed) | seeded once |
| anchorCfg | createBrain | RB2-RB5 anchoring is done once on hello.config |
| arenaMargin | createBrain `B.arenaMargin = fnum(cfg.match.arena_margin, P.arenaMargin)` | copied into B |
| hideMaxR, hideStep | tactics.js makeHideSearch | the 4 m lattice out to 120 m is built once |
| aimLadder, gunLadderTop | firecontrol.js makeFireControl (LASER_RUNGS / GUN_RUNGS) | built once |
| ffaCounters, counterParams, cxFinish, cxKiterRamp, cxBrawler | createBrain `createCounters(hello, cxPar)` | copied into the counter module (FFA only anyway) |
| env | stance.js `ffa = P.env === 'ffa'`, createBrain forced FFA (also read per decision) | the posture the gate tests |
| h50ForeignMax, h50LateAlive, zoneLateR | hunt.js firewall() (zoneLateR also the D9 late-zone switch) | the gate of the layer itself |
| ioMerge | bot.js `brain._B.P.ioMerge`, per observation outside act() | I/O layer, not the decision |
| debug | brain.js build() label | output only |
| fuseMs | brain.js fuse() | emergency fuse (safety, not tactics) |
| laserBackOff, roamStep, hideReloadDist | no reader anywhere in lib | an override would be a silent no-op |

Read at init **and** per decision (accepted; the init read is only a seed): rPrefGun / bandLo / bandHi (the initial B.eff,
re-set by stance.applyStance every decision) and the anchored keys (magSize, magReloadS, laserDpsIn, lightDpsIn, mortarDpsIn,
mortarMaxR, farmStopT, scanLateT, scanLateR, openFarmT, ffaLatchT, ffaQuietS, fpStartT, ffaFinalT, fpShootT, lgUntilT):
anchorToConfig sets them once; an override value is used literally (not re-anchored), the same rule as amendment A1 for a
preset-moved key; identical on the default balance. Accepted but inert: keys read only in the FFA posture (ffa*, fb's ffaProx /
ffaHealExit, finalPoint / ffaTwo / ffaThree / ffaGate / ffaDropGate numbers), because the layer is off in FFA. Accepted but dead
under the 5.38 SELECT in the SQUAD posture with the gate open: the d3 LOSING thresholds (lose1Hpf, lose1Margin, lose2Hpf,
lose3Hpf, lose6, loseHys, loseMinS: loseCover 'never' sets LOSING false while the firewall is open), finishHpf / finishThreats
(B.finishing feeds only LX and FFA lines), healAfterLoseHp / healAfterLoseS (no LOSING end, so no afterLose), the pulse pl*,
hunt50 commit / pulse h50* keys (hunt off), fc* (focus 'mult'), finTtk keys, isoNear, lg* (laserGrab std).

Exposure (same class as ISO / LG, moderator decision 2 of 22:40): the layer acts in the SQUAD posture until the first foreign
death, so in an FFA final it acts in the opening before anybody died (and nowhere after); forced FFA is byte-identical (T-F2).
In the practice the gate can also close early: in 1 of 12 traced sim seeds (seed 10) a death not caused by us at 27 s closed it
for the rest of the match (all firewalled presets turn off there as well).

### Results

| Check | Result |
|---|---|
| Identity ck08 vs r7work/id/ck07, DEF / KS / KB, R3a2 set + FFA-inert set (28 sources each) | **84/84 byte-identical** |
| Identity ck08 vs fresh ck07 (`ck07f`), KSF = KS + aggr any70f + fb on (both trees lack 'never'), 28 sources | **28/28 byte-identical** |
| Identity under the **5.38 SELECT**: variants6/FNV_s1/bot (copied to tw_scratch/v538_07, sha256-equal) vs ckpt_08 + variants_tools/mkvar.py (same SELECT, salt 1) + patch_lc.py loseCover=never (tw_scratch/v538_08; differs from FNV_s1 only by the TW lines), 28 sources | **28/28 byte-identical** |
| Real streams with an override (ck08 KSF + sqOverrides keepTargetHpf 0.35 vs ck08 KSF, 28 sources) | SQUAD sources change: 8 of the 14 R3a2 sources differ (long4800 / long11 / long23p x squad / auto from decisions 68 / 236 / 5, sim squad 1 and 4); **FFA-inert set 14/14 byte-identical**: forced FFA never writes P, and in the auto streams and FFA sims the layer was on for 154-255 decisions until the first foreign death (tick 306-508), then off (2 flips each), without changing a decision |
| test_tw8.mjs (new, tw_scratch): rehearsal with an override; tw preset / SELECT placement; tw-off resolved params = ckpt_07 (DEF / KS / KB / KSF); merge order and later-wins; plain sqOverrides replaces; all 27 refused keys throw, plus typo / string / NaN / scalar-for-array; (a) SQUAD scene on the real map (three lines at 58% hp, KS): lose3Hpf 0.6 -> 0.5 turns DDDD... into FFFF..., layer on in 14/14 decisions, 1 flip; (b) forced FFA with the override byte-identical to no override, P never written; control: the same value as a plain preset acts in forced FFA (ffaRules off) while the override does not; (c) foreign death at decision 6: P back to base (every key) in that decision, FIGHT until it, the LOSING retreat from the next decision exactly as without override, 2 flips; late zone (radius 400 -> 60) and 3 alive revert in that decision; empty set {} = no layer | **15/15 PASS** (first run 14/15: the control scene was wrong, FFA rule 4's line break retreats at 58% either way; fixed with ffaRules off) |
| T-F2 (tw_scratch/test_tf2.mjs = r7work/tools/test_tf2.mjs + one generic case: tw value with sqOverrides lose3Hpf 0.5, three lines at 58%: SQUAD DISENGAGE -> FIGHT, forced FFA DISENGAGE = 'off') | **14/14 PASS** |
| R7 groups on ckpt_08: anchors7 / test_rb7 / test_io7 / test_aggr7 / test_lx7 / test_fin7 / test_iso7 / test_lg7 | 21/21 / 6/6 / 9/9 / 14/14 / 7/7 / 6/6 / 5/5 / 10/10 PASS |
| test_counters | 15/15 PASS |
| test_world / test_brain / test_requests at load 23-30 | {{SUITES}} |
| Bundle | `bun build ckpt_08_TW/bot.js --minify --target=bun` into the new empty `r7work/dist_08`: 228016 bytes, sha256 2091255c55327d53139c92c8625def2a2d1c97454710cb2d1d4fefd5e61d3524; a second build is byte-identical |
| Conformance dist_08 (run_check.sh, 1-CPU quota group, taskset -c 0,1, load 29) | base **PASS** world=true nav=true, 300/300 in time, p99 16.6 / max 19.7 ms, ready 5006 ms; v3dir **PASS** world=true nav=true, 300/300, p99 14.0 / max 18.0 ms, ready 5473 ms (ready and p99 are load: ckpt_07 had 2141 ms / 1.6 ms at load 5) |

### Building a climb ticket from this tree

```
python3 -I scratchpad/variants_tools/mkvar.py scratchpad/r7work/ckpt_08_TW scratchpad/variants6/<NAME> 1 \
  laserRange=far farmHp=90 laserEcon=off focus=mult retreat=d3 upg=std seek=on aggr=any70f fb=on
python3 -I scratchpad/variants_tools/patch_lc.py scratchpad/variants6/<NAME>/bot/lib/params.js loseCover=never
python3 -I scratchpad/r7work/tw_scratch/mktw.py scratchpad/variants6/<NAME>/bot/lib/params.js <value> '{"<key>": <v>}' --select
```
Without the last line the tree is the 5.38 build (28/28 identical to FNV_s1). Candidates and their 24-seed divergence:
`notes/tweak_candidates.md` (top-12 table also below).

{{TOP12}}
