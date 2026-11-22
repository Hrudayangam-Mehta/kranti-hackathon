# Build R7a log (build engineer, Opus sub-agent; started 21:23 UTC Sat Nov 21; times are `date -u`)

Work folder `scratchpad/r7work` (S = scratchpad): `bot/` (working copy), `ref_bot/` (frozen copy of mechbot/bot taken at
21:24, sha256 list in `r7work/out/ref_bot.sha256`), `sim/` (copy), `tools/` (suites + my harness), `kit`, `replay`
(symlinks). Checkpoints `r7work/ckpt_NN_ID/`, bundles `r7work/dist_NN/bot.js`, raw outputs `r7work/out/ckNN/`,
identity recordings `r7work/id/<tag>/`. Nothing pushed, no git, no game server; mechbot/bot, sim, tools untouched.

Scope as amended by the moderator (21:36, 21:47, 21:50): 1 RB2-RB6 + A1-A3; 2 IO-A (+ IO7, IO8); 3 `aggr`
(h70 / h70g / any70); then LX `loseExit`; 4 FIN, ISO; 5 LG; 6 LC; 7 AVO. Deferred: ESC, heal need/full, zoneEsc,
ffaHeal, zoneEscFfa, IO13 (only the heal presets read it).

## Harness (for every checkpoint)

- Identity: `tools/rec7.js` (recorder adapted from our R4a record.js / checkR4a rec.js; it reproduces the R4a OFF4F
  hashes, e.g. sim squad 1 `4e41c6b6...`, long4800 squad `c004110e...`), `tools/idbatch.sh` (lanes on cores 0 and 1,
  Dockerfile JSC limits), `tools/refuse.sh` (re-records any run whose 30 ms fuse tripped on the shared machine),
  `tools/idcmp.mjs`. Sources: the R3a2 identity set (kit / long4800 / long11 / long23p x squad / auto, sim squad 1-6 = 14)
  and the FFA-inert set (kit + check2a ffa_s1-4 x auto / forced FFA, sim FFA 411-414 = 14). SELECTs: DEF (defaults = V1),
  V4 (`retreat: 'd3'`), K0 (V4 + laserEcon off, laserRange far, focus mult, farmHp 90, upg std) and, added because it is
  the new leader, KS (K0 + `seek: 'on'`). Reference = ref_bot under the same four SELECTs (108 recordings, fuse 0).
- Suites: test_world, test_brain, test_counters, test_requests (copies in r7work/tools, ROOT = r7work).
- Bundle `bun build --minify --target=bun` into a new empty `dist_NN`; conformance `tools/panel_r6/maps/run_check.sh
  base|v3dir <bundle>` (1-CPU quota group, JSC limits), under `taskset -c 0,1`.

## Checkpoint 01: RB2-RB6 + A1-A3 (`ckpt_01_RB`, `dist_01/bot.js` 219675 bytes, sha256 664819307cb8...)

Applied tools/panel_r6/robustness_r6.patch without its world.js / bot.js hunks (RB1 is already in the bot as the R4a
loader): `anchorToConfig` (RB2 clock, RB3 radii, RB5 weapon numbers), the rehearsal on the map's largest pocket (RB6),
`hopPlanCfg` (RB4), `P.mortarMaxR` in tactics.js / ffa.js. Offsets only (brain.js +1).

- A1: `anchorToConfig` also leaves a key alone when `P[key] !== PARAMS[key]` after resolveParams (a SELECT preset moved
  it). A2: the scaled list is the exported `ANCHOR_SCALED` (later clock keys join it). New PARAMS `mortarMaxR: 235`.
- A3 count gate: `B.counters.hopOldNull` counts null plans of the campus limits (the only case where the RB4 fallback can
  act). Sim squad 1-40 + FFA 411-414: **0** with V4 and **0** with KS (44 + 44 matches; no pocket hop at all). Pocket survey
  of this map: 12 pockets >= 25 cells, every one has a campus-limit exit. So RB4 is in every build: preset
  `pocketCfg: { off, on }`, SELECT default **'on'** (off = R4a code path, kept as a switch).

| Check | Result |
|---|---|
| anchors7.mjs (RB2 210/240/200/75/90/375/390/405 default, zt070 147/168/140/52.5/63/262.5/273/283.5; RB3 70/140, zs070 49/98, zs130 91/182; RB5 default weapon numbers exact; 7 default-balance maps no change; A1 synthetic preset zoneLateR 90 kept on zs130, farmStopT 333 kept on zt070, plain override kept; A2 list) | 18/18 PASS |
| test_rb7.mjs (climb cap 59.0 m; pocket survey 12/12 with campus exits; pocketCfg off -> no second plan, on / default -> second plan; RB6 rehearsal runs, errors 0) | 6/6 PASS |
| test_world | 39/39 (first run 38/39: D3 findPath timing max 41 ms under machine load 5.7; nav.js / world.js byte-identical to ref; rerun alone 39/39) |
| test_brain / test_counters / test_requests | 109/109 / 15/15 / 12/12 |
| Identity vs ref, DEF / V4 / K0 / KS | FFA-inert set 14/14 under all four. R3a2 set 12/14 under all four: kit, long4800, long11 x squad / auto and sim squad 1-6 identical; **long23p differs by design** |
| long23p explained | its hello carries a perturbed balance (zone phases 71/49/392 ... total 405 s, gun mag 14, laser / lightning / mortar numbers changed), so RB2-RB5 re-anchor 16 keys (e.g. zoneLateR 68, scanLateR 107, magSize 14, mortarMaxR 344). Differences: 14 of 4800 decisions (DEF, V4), 80 of 4800 (K0, KS). With those 16 keys pinned to the old constants by plain overrides the new code is **byte-identical** on long23p under all four SELECTs (8/8): the only change is the intended re-anchoring |
| hopOldNull over all 108 checkpoint recordings | 0 |
| Conformance dist_01 | base PASS world=true nav=true, 300/300 in time, p99 1.5 / max 3.2 ms; v3dir PASS world=true nav=true, p99 3.8 / max 8.4 ms |
| Sim sanity (the A3 runs, behaviour only) | V4: squad 1-40 mean 4.28, FFA 411-414 11.50; KS: 3.90 / 11.50; zone deaths 0, errors 0, false latches 0 |

Moderator decision: the "14 R3a2 streams byte-identical" rule cannot hold on long23p for any config-anchoring build; I
read the gate as "identical on the default balance, and on perturbed configs identical once the anchored keys are pinned".

## Checkpoint 02: IO-A + IO7 + IO8 (`ckpt_02_IO`, `dist_02/bot.js` 221472 bytes, sha256 e603e288153e...)

- IO-A: tools/panel_r6/io_r6_c4.patch (firecontrol.js IO1-IO4 hunks and the params.js keys / preset, offsets only); the
  SELECT hunk was applied by hand because the SELECT line already carried `pocketCfg`. Preset `io: { v4, lead, laser,
  reload, all }` as in the reference patch, SELECT default **`io: 'v4'`**, new value **`'all'`** (IO1 + IO2 + IO3 + IO4).
- IO7 (always on, no preset): brain.js `chargeHold()`: when the fire stage throws, or act() itself throws, while our laser
  holds a partial charge (0 < charge < full) and the last action held its trigger, the trigger stays held; the previous
  aim is kept as before. Everything else is released as before.
- IO8 (always on, no preset, as the moderator asked): new lib/io.js `mergeSkipped(older, newer)`; bot.js merges every
  skipped observation of a backlog into the one it answers: events, sounds and beams, older first, sound / beam ages
  + the skipped time (0.1 s per decision), capped at 64 / 32 / 16 keeping the newest. Inert without a backlog (the
  identity harness and all streams have none).

| Check | Result |
|---|---|
| test_io7.mjs: T-IO4 (io all fires at reload read-out 0.05 and 0.10, not 0.15; v4 never while reloading); T-IO1 (crosser at 120 m, 11.7 m/s: lead 0.291 m less = half a tick); T-IO7 (fire-stage exception at charge 0.40 keeps fire[laser] and the aim; no charge -> released as before); T-IO8 (kill + damage of a skipped obs reach the brain, foreign deaths 0; control without merge: kill lost, foreign death 1; sound ages +0.2 / +0.1; cap keeps the newest 64) | 9/9 PASS |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| anchors7 / test_rb7 | 18/18 / 6/6 |
| Identity ck02 vs ck01, DEF / V4 / K0 / KS, both sets | **112/112 byte-identical** (vs ref: as checkpoint 01, only long23p by design) |
| io 'all' vs 'v4' (changed decisions) | V4: 25778 of 34041 lines in the R3a2 set, 7070 of 15477 in the FFA set; KS: 25496 / 6632 (almost every aimed decision moves by the half-tick lead). io 'all' acts in both postures, like the reference patch |
| Conformance dist_02 | base PASS world=true nav=true, 300/300, p99 2.6 / max 5.1 ms; v3dir PASS world=true nav=true, p99 5.4 / max 8.1 ms |

Moderator decision: io 'all' is not FFA-inert (it is a fire-timing correction in every posture, as panel R6 built it).
If it must be SQUAD-only before the FFA freeze, it needs a `B.env !== 'FFA'` term (not done).

## Checkpoint 03: moderator 21:58 fixes + `aggr` + `healDoc` (`ckpt_03_AGGR`, `dist_03/bot.js` 221829 bytes, sha256 85c7cacba66f...)

**P0 note for the moderator: package P0 (KS salt 0) from `scratchpad/r7work/ckpt_03_AGGR` with the KS SELECT.** Under
the KS SELECT this tree is byte-identical to `variants6/KS/bot` (= ref_bot + KS SELECT) on every default-balance source
(kit, long4800, long11 x squad / auto, sim squad 1-6, the 14 FFA-inert sources), and under the KB SELECT to
`variants6/KB_s0/bot`. The only differences anywhere are on long23p, whose hello carries a perturbed balance (RB2-RB5
re-anchoring, by design; identical once the 16 anchored keys are pinned, KS and KB checked 2/2 each).

Changes in this checkpoint (on top of 02):
- RB3 defect (moderator item 1): radii anchored only with >= 5 phases, `zoneLateR` clamped to [40, 120], `scanLateR` to
  [90, 220]. Unchanged on every practice / map config (anchors7 21/21).
- IO8 / RB4 switchable (item 2): `ioMerge: { off, on }` (default **on**; bot.js merges only when the brain's resolved
  `P.ioMerge === true`), `pocketCfg: { off, on }` (default **on**, from checkpoint 01). IO7 has no switch (exception path).
- `aggr` (item 3): my h70g / one-volley guard code was removed; the KB line is copied verbatim from
  `variants6/KB_s0/bot/lib/params.js` (`aggr: { off: {}, h70: {...}, any70: {...} }`, right after `seek` as there; diff of
  the line: none). SELECT default **`aggr: 'off'`**. So `h70` = KA's numbers (0.7 / 8 / 0.7), `any70` = KB (0.7 / 0 / 0.7).
- `healDoc: { off: {}, on: { healEnterHp: 0.7, healExit: 0.8 } }` as the **last** SELECT key, default **'off'**.

| Check | Result |
|---|---|
| test_aggr7.mjs: presets (off 0.9 / 20 / 0.6, h70 0.7 / 8 / 0.7, any70 0.7 / 0 / 0.7); healDoc values and last-key; ioMerge / pocketCfg switches; real map, a listed mech 175 m away with no line: hp 75% off ignores it, h70 / any70 take it; 65% none; 92% all; contact 5 s ago only any70; 10 s ago h70 / any70; FFA none; seek start: off seeks at 65%, h70 / any70 not below 70%; healDoc on: 65% out of contact -> HEAL, off -> HOLD | 12/12 PASS |
| anchors7 (+3 clamp checks) / test_rb7 / test_io7 | 21/21 / 6/6 / 9/9 |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| Identity ck03 vs ck02, DEF / V4 / K0 / KS, both sets | 112/112 byte-identical |
| Identity ck03 KB SELECT vs variants6/KB_s0 | FFA set 14/14; R3a2 set 12/14, the two long23p runs only (anchoring; pinned: identical) |
| Changed decisions vs KS (28 sources) | `aggr: 'h70'` **0** (KA is a no-op here, as the moderator said); `aggr: 'any70'` 2661 of 33722 lines in the R3a2 set (9 of 14 sources; sim 1-6 mean 2.67 vs 3.33, behaviour only), FFA set unchanged; `healDoc: 'on'` **0** on these 28 sources (it acts only between 55% and 70% out of contact and on exits between 70% and 80%; unit test above shows it acting) |
| Conformance dist_03 | v3dir PASS world=true nav=true, p99 2.2 / max 3.2 ms; base PASS world=true nav=true, p99 5.5 / max 6.1 ms (one earlier base run had max 43.7 ms and one v3dir run 17.0 ms while unpinned shopping-sessions processes and my own batch shared the cores; both clean reruns well under 15 ms) |

## Checkpoint 04: LX `loseExit` + LC `loseCover` (`ckpt_04_LXLC`, `dist_04/bot.js` 222570 bytes, sha256 849b2125aec2...)

- tactics.js: today's `losing()` body is now `losingRaw()`; the new `losing()` wraps it:
  - **LX** `loseExit: { off: { loseExitS: 0 }, on: { loseExitS: 1.0 } }`, default **'off'**: the panel r7 engineer's
    wrapper ported line for line (`tools/panel_r7/eng/ibot/lib/tactics.js`; their counters / instrumentation not ported):
    LOSING ends only after the raw predicate was false for loseExitS; inert in FFA, with the pulse retreat, under a hunt50
    commit, and never delaying a finishing exit.
  - **LC** `loseCover: { off: { loseCoverNear: false }, near: { loseCoverNear: true } }`, default **'off'**, params
    `lcCoverS 1.5`, `lcLowHpf 0.25` (the < 25% clause kept): last step of losing(): LOSING stays only with a found hide
    cell within 1.5 s of travel, or under 25% hp with any found cell; else false (fight on; lastStand / doomed unchanged).
    Firewall = hunt.js firewall() (SQUAD, no foreign death, next radius > zoneLateR, > 3 alive). Reading that changes the
    least: LC also stays out of the pulse retreat (own no-cell rule) and a hunt50 commit (own thresholds).

| Check | Result |
|---|---|
| test_lx7.mjs: LX T1 (54%-style dip 2 -> 1 line for one decision after the minimum stay: off FIGHT for the dip, on DISENGAGE, held 1); T2 (raw false 10 decisions -> FIGHT on the 11th); T3 (target 15%, finishing -> FIGHT at once); T4 (FFA / pulse / commit on = off); LC (3 lines 50%: cover 30 m FIGHT, off DISENGAGE; cover 8 m DISENGAGE; 20% with cell 30 m DISENGAGE; no cell FIGHT, off DISENGAGE; firewall after a foreign death and with pulse inert) | 7/7 PASS |
| all earlier groups (anchors7 21, rb7 6, io7 9, aggr7 12) | PASS |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| Identity ck04 vs ck03, DEF / V4 / K0 / KS / KB, both sets | **140/140 byte-identical** |
| `loseExit: 'on'` vs KS | R3a2 set 348 of 33722 lines (5 of 14 sources), held decisions 26 in sim 1-6; **FFA set 2 of 14 differ** (kit_auto from decision 225 and sim FFA 412): LX acts in the SQUAD posture after a foreign death and before the latch, because the engineer's version has no foreign-death firewall |
| `loseCover: 'near'` vs KS | R3a2 set 679 of 33722 lines (10 of 14 sources); fought on instead of LOSING 216 decisions in sim 1-6 (DISENGAGE 394 -> 209); FFA set 14/14 identical |
| Conformance dist_04 | base PASS world=true nav=true, p99 5.8 / max 6.8 ms; v3dir PASS, p99 3.9 / max 7.8 ms |

Moderator decision: LX is not FFA-stream-inert (pre-latch SQUAD posture after a foreign death). Adding the R5 firewall
(`B.foreignDeaths < 1`, late zone, alive > 3) is one term in losing(); not done, to keep the engineer's measured version.

## Checkpoint 05: FINa / FINb, ISO, CR, HF presets (`ckpt_05_FIN_ISO`, `dist_05/bot.js` 224697 bytes, sha256 24fc917b70d3...)

- **FIN** (R5 3.1 / AL item 1; names per build_spec_r7 3.2): `finish: { off, ttk, ttkb }`, default **'off'**.
  `'ttk'` = FINa, the losing() half only (`finTtkS` 3.0); `'ttkb'` = FINa + FINb (built already; draw only if FINa is
  kept). tactics.js `finUpdate(B)` (called by brain.js after selectTarget): near kill on the current mech target or the
  last one seen within 3 s; TTK' = hunt.js `ttk()` + 0.3 s off-target + 1.0 s without a line out; IN3 = max B.A over 3 s
  (ring of 32), >= 30; M = max(150, 0.1 maxHp) + 0.5 IN3. (a) `finishing ||= near kill` in losingRaw (the commit line of
  hunt50 still returns first). (b) while armed (hp <= one magazine at q(d) + a ready beam) no afterLose HEAL entry; with
  the kill in the gun / beam and the test passed: FIGHT at once (urgent) unless hp < healEnterHp; the armed target stays
  a candidate. Firewall: hunt.js firewall(). Interpretation (spec: "hunt.js TTK + remaining reload when empty"): hunt.js
  TTK already starts the gun after the remaining reload, so the reload is counted once (AL section 1).
- **ISO** `isolate: { any: { isoNear: 0 }, near: { isoNear: 12 } }`, default **'any'**: the isolate branch of fightLegs
  takes the posEval cell only within 12 m and with `xOther === 0` (posEval now records xOther per cell, also for a kept
  goal); else stand-off. Firewall: hunt.js firewall().
- **CR** `seekCrowd` (`h50CrowdR` 60 -> 120) and **HF** `healDoc: 'full'` (0.70 / 1.0) were added as preset values here
  (defaults unchanged; resolved params of DEF / V4 / K0 / KS / KB identical to the tree that ran the identity batch).

| Check | Result |
|---|---|
| test_fin7.mjs: T1 (target 200 hp at 90 m, 3 lines B.A 250, hp 700, ammo 6: off DISENGAGE, ttk / ttkb FIGHT; TTK 1.2 s, IN3 250); T2 (hp 800, empty gun: reload 2.2 s -> DISENGAGE all values; 0.5 s left -> ttk / ttkb fight; quiet while reloading: off / ttk HEAL, ttkb no HEAL; reloaded -> ttkb FIGHT in the first decision); T3 (hp 300 -> HEAL, no near kill); T4 (FFA / next radius 60 / 3 alive = off, control differs) | 6/6 PASS |
| test_iso7.mjs (real map, two hostile lines; cell 25 m: any isolate / near standoff; 8 m xOther 0 isolate; 8 m exposed standoff; FFA near = any) | 5/5 PASS |
| all earlier groups | anchors7 21, rb7 6, io7 9, aggr7 13, lx7 7: PASS |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| Identity vs ck04, DEF / V4 / K0 / KS / KB, both sets | **140/140 byte-identical** |
| FINa `finish: 'ttk'` vs KS | 119 of 33722 lines (1 of 14 sources); FFA set 14/14 identical |
| FINa + FINb `'ttkb'` vs KS | 619 of 33722 lines (7 of 14); FFA set 14/14 identical |
| ISO `isolate: 'near'` vs KS | 3401 of 33722 lines (12 of 14); **FFA set 12/14**: sim FFA 413 / 414 differ from decisions 67 / 51 (t 6.7 / 5.1 s), before their first foreign death (t 24 / 19.7 s): the firewall is open in the SQUAD posture until a foreign death; forced-FFA streams identical |
| Conformance dist_05 | base PASS world=true nav=true, p99 3.9 / max 5.4 ms; v3dir PASS, p99 3.9 / max 4.6 ms |

## Checkpoint 06: moderator 22:20 items 1-4 (`ckpt_06_FW`, `dist_06/bot.js` 225206 bytes, sha256 ca6be9fa71a2...)

**For the P0 bisect: on this tree the four "every build" pieces each have a switch, and with all four off the tree is
byte-identical to the old code (ref_bot) under KS on all 28 sources, long23p included (28/28).** The switches:
`ioMerge` (IO8), `pocketCfg` (RB4), new `anchorCfg: { on, off }` (RB2-RB5 anchoring on hello.config; off = the R4a
constants) and new `warmPocket: { on, off }` (RB6; off = the old rehearsal point -307 / 106). All default **'on'**.
Note: if the official practice server's hello config differs from the kit stream's (protocol: "balance changes between
matches"), RB2-RB5 re-anchor and change play there exactly as they do on long23p; `anchorCfg: 'off'` is the bisect step
for that (besides `ioMerge: 'off'` for backlogs). IO7 acts only on exceptions.

- LX: now behind the seek's firewall too (hunt.js `firewall()`: SQUAD, no foreign death, next radius > zoneLateR, > 3 alive).
- `aggr: 'any70f'` = the any70 numbers (aggrHpf 0.7 / aggrS 0, h50SeekHpf 0.7) only while `B.foreignDeaths === 0` and not
  FFA; otherwise 0.9 / 20 as today. `off` / `h70` / `any70` unchanged (any70 = KB).
- CR `seekCrowd: { off, wide }` (h50CrowdR 60 -> 120), default 'off'. HF `healDoc: 'full'` = { healEnterHp 0.70,
  `hfExit` 1.0 }: the 1.0 exit is the SQUAD exit only (new param `hfExit`), so the FFA exit stays max(healExit,
  ffaHealExit) and HF is FFA-inert; healDoc 'on' is FFA-inert by arithmetic (FFA enters below 70% and exits at 90% anyway).
- FB `fb: { off: {}, on: { ffaProx: [70, 70, 80], ffaHealExit: 1.0 } }`, default **'off'** (build_spec_r7 3.7).
- T-F2 harness `tools/test_tf2.mjs`: per preset value one synthetic acting case; SQUAD must differ from the old value,
  forced FFA must equal it: loseExit on, loseCover near, finish ttk / ttkb, healDoc on / full (with and without hostile
  tracks, so the FFA heal path is reached), aggr h70 / any70 / any70f, isolate near, seekCrowd wide: **13/13 PASS**.

| Check | Result |
|---|---|
| test_tf2 13/13; test_aggr7 (+ any70f after a foreign death closed, any70 open; HF hfExit) 14/14; lx7 7, fin7 6, iso7 5, io7 9, rb7 6, anchors7 21 | PASS |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| Identity ck06 vs ck05, DEF / V4 / K0 / KS / KB, both sets | **140/140 byte-identical** |
| All four bisect switches off vs ref_bot, KS | **28/28 byte-identical** (long23p too) |
| LX (firewalled) vs KS | R3a2 set 244 of 33722 lines (long11 x 2, sim 2); **FFA set 14/14 identical** (was 12/14) |
| any70f vs KS | R3a2 set 2661 lines (same sources as any70); FFA set 14/14 |
| fb on vs KS | R3a2 set 14/14 identical (squad-inert); FFA set 8/14 (acts in FFA by design) |
| HF `healDoc: 'full'` / CR `seekCrowd: 'wide'` vs KS | 0 changed lines on all 28 sources each (acting cases in test_tf2 / test_aggr7) |
| Conformance dist_06 | base PASS world=true nav=true, p99 5.4 / max 7.9 ms; v3dir PASS, p99 1.6 / max 4.1 ms |

## Checkpoint 07: LG `laserGrab` (`ckpt_07_LG`, `dist_07/bot.js` 225983 bytes, sha256 3f470b28a0f6...)

- `laserGrab: { std, wide, wide45 }`, default **'std'** (R5 3.2 / GP I1 with the r7 grab-yield amendment; the spawn
  look-around is not built, per build_spec_r7 2c). SQUAD via hunt.js `firewall()`, no laser held:
  - economy.chooseGrab: laser reach 60 -> `lgGrabR` 130 m of path at hp >= 50%, `B.nLos <= 1`, the target not
    finishable, and it **yields** while a new attacker (B.topAttacker other than the target) hit us within 1 s;
  - selectTarget: while t < `lgUntilT` (90 s; joins the anchorToConfig scaled list, A2) and a wanted laser is known
    within 200 m of path, the engaged() clause is off (hostile mechs stay candidates). `wide45` = the red team's 45 s cap.
- Counters for the share report: `lgHold` (clause off), `lgSupp` (a mech the clause would have admitted was left out).

| Check | Result |
|---|---|
| test_lg7.mjs: presets; 1v1 at 110 m, laser 90 m -> wide grabs in the first decision (leg grab), std does not; two lines -> no grab; a drone hitting us (new attacker) -> no grab; hp 40% -> no grab; closing non-hostile mech at 170 m: candidate under std, not under wide (laser known); hostile still answered; after 90 s (wide45: 45 s) the clause is back; laser held = std; forced FFA = std (T-F2) | 10/10 PASS |
| all earlier groups (tf2 13, aggr7 14, lx7 7, fin7 6, iso7 5, io7 9, rb7 6, anchors7 21) | PASS |
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| Identity ck07 vs ck06, DEF / V4 / K0 / KS / KB, both sets | **140/140 byte-identical** |
| **Salt 1** (the moderator's packaging salt): ref_bot vs this tree, KS, sim squad 1-20 | **20/20 byte-identical** |
| LG wide vs KS (salt 0 sources) | R3a2 set 894 of 33722 lines (kit x 2, sim 5); FFA set 11/14: kit_auto from decision 50, sim FFA 412 from 42 and 413 from 0, all before their first foreign death (open firewall in the SQUAD posture) |
| LG share report (build_spec_r7 2c), salt 1, sim squad 1-20 | streams differing 6/20; engaged clause off 15.0% of decisions; a candidate actually left out 0.4% (66 of 16091; at most 3.3% in one match): **below 30%, the 90 s cap stays** (`wide`) |
| LG timing (bundles with the KS SELECT, base map, bot worst=) | KS 7.9 / 4.5 ms, KS + LG 3.3 / 2.6 ms: within base + 3 ms (answer-time spikes to 44-51 ms hit both bundles while the shared 1-CPU group was busy) |
| FINa guard (build_spec_r7 3.2 #4), KS + `finish: 'ttk'`, salt 1, sim squad 1-20 | streams differing 3/20; near kills armed in 19 matches; deaths within 3 s of a near-kill decision **1** (seed 5, 2.6 s, lightning) -> not more than 2: **finTtkS stays 3.0** |
| Conformance dist_07 | base PASS world=true nav=true, worst=2.5 ms, p99 1.6 / max 3.4 ms; v3dir PASS, p99 1.7 / max 3.3 ms |

Moderator decision (same class as ISO): LG and ISO act in the SQUAD posture before the first foreign death, so in a
free-for-all opening; both are identical under forced FFA (T-F2) and after a foreign death. If they must also be inert
in the pre-latch FFA opening, they need a time gate (e.g. t >= earlyOpenS) on top of the firewall (not done).

## Summary at 22:40 UTC (latest tree = `ckpt_07_LG`; every checkpoint keeps the earlier presets)

| Item | Preset (old -> new values) | Default | Checkpoint |
|---|---|---|---|
| RB2-RB6 + A1 / A2 / A3 (+ RB3 clamp) | always on; switches `anchorCfg`, `warmPocket`, `pocketCfg` (on / off) | on | 01, 03, 06 |
| IO-A | `io: 'v4' -> 'all'` (also lead / laser / reload) | v4 | 02 |
| IO7 / IO8 | IO7 always on; IO8 `ioMerge: on / off` | on | 02, 03 |
| aggr | `aggr: 'off' -> 'h70' / 'any70' / 'any70f'` (KB line verbatim + any70f) | off | 03, 06 |
| healDoc | `healDoc: 'off' -> 'on' / 'full'` (last SELECT key) | off | 03, 06 |
| LX | `loseExit: 'off' -> 'on'` (firewalled) | off | 04, 06 |
| LC | `loseCover: 'off' -> 'near'` | off | 04 |
| FIN | `finish: 'off' -> 'ttk' (FINa) / 'ttkb' (FINa + FINb)` | off | 05 |
| ISO | `isolate: 'any' -> 'near'` | any | 05 |
| CR | `seekCrowd: 'off' -> 'wide'` | off | 05, 06 |
| FB | `fb: 'off' -> 'on'` (ffaProx 70/70/80, ffaHealExit 1.0; FFA only) | off | 06 |
| LG | `laserGrab: 'std' -> 'wide' / 'wide45'` | std | 07 |

Dropped / deferred by the moderator: ESC, AVO, h70g (built, then removed), PRE, risk, calm rear, SYNC, CM, zoneEsc,
heal need, ffaHeal / zoneEscFfa (FB2 covers ffaHealExit), IO13 (only the heal-need presets read it), the LG look-around.
Sim sanity on the final tree (behaviour only): 144 matches, zone deaths 0, stuck 0, errors 0, fuse 0, false latches 0.

Open decisions for the moderator:
1. R7P s1 5.13 vs 5.23: this tree reproduces the old code at salt 1 in the sim (20/20) and on every default-balance
   source at salt 0; with `ioMerge`, `pocketCfg`, `anchorCfg`, `warmPocket` all 'off' it is byte-identical to ref_bot on
   all 28 sources. The remaining candidates are environment-only: backlogs (IO8) and a practice config that differs from
   the kit hello (RB2-RB5). Bisect with `ioMerge: 'off'` and `anchorCfg: 'off'`.
2. Pre-latch exposure: ISO (2 of 4 sim FFA), LG (3 of 14 FFA sources) act in the SQUAD posture before the first foreign
   death; T-F2 (forced FFA) passes for every preset. io 'all' and fb act in FFA by design.
3. long23p (perturbed balance) differs by design under RB2-RB5; identical with the anchored keys pinned or `anchorCfg: 'off'`.
4. For the ruling's "any70f at salt 1, expected exactly 5.23": on checkpoint 06 / 07, KS + `aggr: 'any70f'` is
   byte-identical to KS + `aggr: 'any70'` (= KB) on all 28 sources (28/28); they can differ only after a foreign death
   in the SQUAD posture.

## Checkpoint 08: TW, a SQUAD-only override layer (`ckpt_08_TW`, `dist_08/bot.js` 228016 bytes, sha256 2091255c5532...)

Built 01:34-02:27 UTC Sun Nov 22 (Opus sub-agent, Mech bot engineer). Folders: `r7work/ckpt_08_TW` (tree = ckpt_07_LG + the
layer), `r7work/dist_08` (bundle), `r7work/tw_scratch` (harness copies, recordings `tw_scratch/id/<tag>`, tests, sims, logs).
Nothing else changed: ckpt_01-07, mechbot/bot, mechbot/sim, variants*, fable_work and r7work/tools untouched; no git, no game
server. The machine load average was 20-30 for the whole session (other agents' sims and Shopping builds on all four cores), so
every identity recording and every sim below ran with the emergency fuse disabled on both sides (`fuseMs: 1e9`, a plain
override; in a first batch at load 30 the 30 ms fuse tripped in 18 of 81 recordings and the 10 that differed were all among
them): this is logic identity, and the r7work/id/ck07 references were recorded at 22:32 with 0 fuse trips, so they are
the same logic.

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
In the practice the gate can also close early: in 2 of 24 sim seeds (10 and 14) a death not caused by us at 27 / 31 s closed
it for the rest of the match (all firewalled presets turn off there as well).

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
| test_world / test_brain / test_requests | functional checks all pass. At load 23-30 (01:58-02:03) every failure was a wall-clock decision-time bound (test_world D1 init and D3 findPath timing; test_brain stream / fuzz / closed-loop decision time; test_requests fuzz slowest decision and decision time) and ckpt_07 failed the same bounds in the same minutes (A/B on core 1: test_brain 105/109 both, test_requests 10/12 both; test_world imports only world.js / nav.js, byte-identical to ckpt_07 and ref_bot). At load 14 (02:22) on ckpt_08: **test_world 39/39, test_brain 109/109, test_requests 12/12**; test_counters 15/15 in every run (a consolidated rerun at 02:24 had test_brain 108/109: one 54 ms decision in the warm stream pass) |
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

Top 12 (24-seed sims, squad seeds 1-24, salt 1, the 5.38 tree with the override, fuse off; behaviour only; base 95 kills,
life 70.4 s):

| # | override (sqOverrides) | matches differing of 24 | first differing decision (median) | sim kills vs base (behaviour only) | mean life s | layer on (share of decisions) | fuse / errors |
|---|---|---|---|---|---|---|---|
| 1 | `keepTargetHpf: 0.35` | **4** | 709 | +1 (96) | 69.7 | 94.7% | 0 / 0 |
| 2 | `vetoKeepS: 2.5` | **0** | - | +0 (95) | 70.4 | 94.7% | 0 / 0 |
| 3 | `healQuietS: 1.0` | **2** | 754 | +1 (96) | 70.5 | 94.7% | 0 / 0 |
| 4 | `bsEnergy: 15` | **18** | 161 | -3 (92) | 67.7 | 94.6% | 0 / 0 |
| 5 | `upgradeOrder: mechanics order` | **14** | 240 | +4 (99) | 69.8 | 94.7% | 0 / 0 |
| 6 | `wFinish: 3.0` | **5** | 454 | -1 (94) | 69.7 | 94.7% | 0 / 0 |
| 7 | `reloadAmmo: 7` | **15** | 41 | -3 (92) | 70.5 | 92.8% | 0 / 0 |
| 8 | `laserHideBoost: 12` | **1** | 726 | +0 (95) | 70.5 | 94.7% | 0 / 0 |
| 9 | `wAttacker: 1.3` | **9** | 420 | -2 (93) | 69.7 | 94.7% | 0 / 0 |
| 10 | `bandHi: 115` | **13** | 186 | +9 (104) | 71.6 | 94.0% | 0 / 0 |
| 11 | `gateK: 1.25` | **8** | 375 | +2 (97) | 68.3 | 95.4% | 0 / 0 |
| 12 | `strafeHi: 1.2` | **24** | 134 | +18 (113) | 74.1 | 93.3% | 0 / 0 |

Re-roll controls: the same tree at salt 2 / salt 3 (24/24 differ) +3 / +5 kills, so a full re-roll moves the 24-match total by
about 8-11 kills by chance; the two largest salt-1 signals did not repeat at salt 2 (strafeHi 1.2 +18 -> +0, 23/24 differ;
bandHi 115 +9 -> -5, 17/24 differ). What transfers is the divergence count; ranking, exclusions and the reading are in
notes/tweak_candidates.md.

