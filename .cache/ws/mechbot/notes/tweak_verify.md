# Checkpoint 08 (TW, SQUAD-only override layer): independent verification

Verifier (Opus sub-agent), Sun 22 Nov 02:30-03:20 UTC. Clean room: I wrote only under
`scratchpad/r7work/tw_scratch/vfy/` and this note. I read `ckpt_08_TW`, `ckpt_07_LG`, `variants6/FNV_s1`, `variants_tools`,
`r7work/tools` and the engineer's `tw_scratch` files without editing them. No git, no game server.

The machine load average was 12-24 on 4 cores throughout. Identity runs had the fuse off (logic identity). Timing runs and
conformance ran on cores 0 and 1 (`taskset`), as instructed.

## Verdict: FAIL

The layer is safe and inert with `tw: 'off'`, and it is safe for the 30 listed candidates. The layer itself does **not**
guarantee what the report claims. The report says the layer acts only in the SQUAD posture while `hunt.firewall()` is open,
and that a bad tw value cannot ship silently. Four tw values that `checkSqOverrides` accepts defeat the firewall or the FFA
latch on real FFA sources. Such a value passes `mktw.py`, the bundle build and conformance, and leaves no stderr line, so it
ships silently. The fix is small (section 7). After it, I would expect a PASS on a re-check of section 2.

| Check asked for | Result |
|---|---|
| Diff ckpt_08 vs ckpt_07, every changed line read | Only `lib/params.js` and `lib/brain.js` differ (20 other files sha-equal, the `.orig` files included). The code does what the report says. Gap: the layer's refusal list misses the inputs of the FFA latch (section 2.5). |
| The layer must not act in FFA or after a foreign death | **FAIL.** Accepted keys `ffaLatchT`, `ffaLatchDeaths`, `gunlessClue` and `beamClue` act on the firewall or the posture itself (2.5). There is also a one-decision read window at each gate close (2.1), and carried state after the close (2.6). |
| Posture switch mid-match | Pass at the P level: the gate never re-opens, and P equals base after every closed decision (27 sources, 37 keys). |
| Overrides of keys read by `ffa.js` | Pass: 58 keys, 27/27 byte-identical. |
| An override equal to the base value | Pass: 37 keys, 27/27 byte-identical, with the layer on in 45% of decisions. |
| An init-only key | Pass: every constructor-only key is refused, and a refused key fails loudly through `mktw.py` (exit 1) and R14. Conformance alone does **not** catch it. |
| Identity, 5.38 SELECT (at least 10 of 28 sources) | **27/27 byte-identical**: all 28 sources, with kit auto counted once. Extra check: DEF ckpt_07 vs ckpt_08 also 27/27. |
| T-F2 | Extended copy 14/14. Original 13/13 on both ckpt_07 and ckpt_08, with byte-identical output. test_tw8 15/15. |
| Decision-time cost (kit stream vs ckpt_07) | No measurable cost (section 5). |
| Bundle | Two rebuilds give sha256 `2091255c55327d53139c92c8625def2a2d1c97454710cb2d1d4fefd5e61d3524` (228016 bytes), equal to `dist_08`. |

## 1. Diff review (`diff -u ckpt_07_LG/lib/{params,brain}.js ckpt_08_TW/lib/...`)

**params.js**
- Adds the preset `tw: { off: {} }` and SELECT `tw: 'off'` just before `healDoc`.
- Adds `SQ_REFUSED` (27 keys) and `checkSqOverrides()`, which throws on a non-PARAMS key, a refused key, a type mismatch,
  array-ness or a non-finite number, and returns a frozen shallow copy.
- `resolveParams` merges each selected preset's `sqOverrides` in SELECT order, later presets winning. A plain
  `overrides.sqOverrides` replaces the merged set, and the result is then checked. With no `sqOverrides` anywhere, P has no
  such key.

**brain.js**
- `twK` / `twV` / `twBase` are captured once in createBrain. This happens after `anchorToConfig` and after `warmUp`, so the
  base values are the anchored ones.
- `twSync(mayApply)` writes P only on a gate flip.
- There are three call sites:
  - after `B.aliveN`, the apply call;
  - after the sense stage, restore only;
  - after the stance stage, restore only.

Points I confirmed by code reading and test:
- `hunt.firewall()` is a pure read of `B.env`, `B.foreignDeaths`, `B.zone` and `B.aliveN`, plus three refused P keys. The
  extra calls have no side effects.
- The rehearsal brains get `{ ...P }` as plain overrides, so `resolveParams` builds new P objects for them. The main P is
  untouched by the rehearsal (test_tw8 case 0, and my trace).
- Nothing else writes the brain's P at run time. The `counters.js:203` writes are to the counter module's own object.
- No array-valued P key is mutated in place, which matters because override arrays are shared shallowly.
- The firewall inputs are monotone:
  - `foreignDeaths` only grows (`Math.max`);
  - the latch never unlatches;
  - `zone.known` is never reset;
  - the alive count comes from the observation.
- With `tw: 'off'` the per-decision code runs only `twK.length > 0` and `B.twOn` checks, which are false. `B.twOn = false` is
  always set, which is harmless because `debugState()` does not dump `B`.

The latent problem: the post-stance restore runs after the whole stance stage. Inside that stage, `stance.environment()`
first **reads P** (`ffaLatchT`, `ffaLatchDeaths`, `beamClue`, `gunlessClue`) to produce the trigger itself, that is the
foreign-death count and the FFA latch. `chooseStance()`, `applyStance()` and `applyVetoes()` then run after the trigger, still
on the override values. `senseZone()` does the same for the zone trigger with `zoneLateFrac`.

## 2. Break attempts

Two instrument copies of the 5.38+TW tree were built in `vfy/` (nothing else changed):
- **ideal** (`v538_ideal`) restores right after `environment()` and right after the zone radius update. With no override it
  is 27/27 identical to ckpt_08.
- **trace** (`v538_trace`) wraps the main brain's P in a Proxy. It logs every key read during createBrain and act(), and
  every read of an override key that returns the override value while `firewall()` is closed (a "leak read").

### 2.1 Posture switch mid-match, and the trigger decision

Setup: the trace, the 37-key set `vfy/broad.json` (all 30 candidate moves plus `stanceHold`, `stanceUp`, `zoneLateFrac`,
`rPrefGun`, `bandLo`, `ffaFinishHpf`, `twoDuelP`), all 27 sources.

**At the P level the layer behaves as designed:**
- The gate closes at the first foreign death (or at the late zone on the long streams) and never re-opens.
- P equals base after every decision with the gate closed.
- Forced FFA: 0 flips and 0 reads on all 5 forced-FFA streams. Every auto/FFA source latches FFA while the gate is already
  closed, so no override value is ever read in the FFA posture on real sources.

**A one-decision window exists.** In the decision that registers the trigger, override values are still read after it:
- `bandFor()` inside `applyStance()` reads `rPrefGun` (27 reads), `bandLo` (9), `bandHi` (9) and `laserLo` (1). This happens
  on 10 sources at the first-foreign-death decision. `B.eff` for that decision's legs is built from them. All 52 window reads
  on real sources were in the SQUAD posture.
- `senseZone()` reads `zoneLateFrac` (6 reads) on the long streams. `z.nrEff` for that decision is built from it.

**Emitted actions:** ckpt_08 equals the ideal instrument 27/27 for `bandHi 115` (candidate #10), for `zoneLateFrac 0.9`, and
for the 37-key set. So on real sources the window never changed an action.

**Synthetic scene** (`vfy/scene_t.mjs` S1: alive 12 to 9 in one observation, so the FFA latch fires inside the window):
- `applyStance()` reads the override values of `bandHi`, `bandLo`, `rPrefGun` and `ffaThree` with `B.env === 'FFA'`.
- `B.eff` becomes 90/130/110, against 55/95/75 under ideal. The emitted action is the same in this scene.

`zoneLateFrac` has a single reader (`senses.js:450`), inside the branch `z.nr <= zoneLateR`, which is exactly the closed
gate. An override of it can never act while the gate is open; it can act only in the decision where the zone closes the
gate. It should be refused.

### 2.2 Keys read by `ffa.js`

`vfy/ffak.json` holds 58 keys: every `ffa*`, `fg*`, `two*`, `fp*` and `finalPoint` key `ffa.js` reads, each moved off base.
All 27 sources are byte-identical to no override. The layer was on in 21481 of 47729 decisions, with 0 flips on forced FFA.

### 2.3 Override equal to the base value

`vfy/eqb.json` holds 37 keys at their resolved 5.38 base values, including `upgradeOrder` as a fresh array. All 27 sources
are byte-identical. The layer was on in 45% of decisions, with 38 flips.

### 2.4 Init-only keys

The trace (warmup off, 27 sources) found 18 PARAMS keys read during createBrain and never in act():
- The 14 constructor or seed keys are all refused.
- The 4 accepted ones (`ffaFinalT`, `fpStartT`, `lgUntilT`, `openFarmT`) are anchored keys, read at init only by
  `anchorToConfig`. Each has decision-time readers on other paths (`ffa.js:534`, `tactics.js:202`, `tactics.js:221`).

So no accepted key is a silent init-only no-op.

A refused key (`hideMaxR`):
- `mktw.py` exits 1 with `sqOverrides refused`.
- A bundle built anyway logs `brain module failed, using fallback policy: Error: sqOverrides refused ...` and plays the
  fallback.
- **Conformance still PASSES.** Only `mktw.py` and R14 (exception lines) stop it.

### 2.5 FFA-latch keys: BLOCKING

`stance.environment()` counts foreign deaths only while `t < P.ffaLatchT`, and latches FFA on `P.ffaLatchDeaths`,
`P.beamClue` and `P.gunlessClue`. It reads all four in the SQUAD posture on every decision, before the post-stance restore.
None of them is in `SQ_REFUSED`; all pass `checkSqOverrides`.

**`sqOverrides { ffaLatchT: 0 }`** (5.38+TW tree, all 27 sources; forced FFA and squad sims identical, 10 sources differ):

| Source | Base build | With override |
|---|---|---|
| kit auto | latch at tick 498 | never latches, layer on 300/300 |
| f1 auto | latch 640 | never latches, layer on 1135/1135 |
| ff412 | latch 546 | never latches, layer on 334/334 |
| ff413 | latch 668 | never latches, layer on 588/588 |
| f2 auto | latch 680 | latch 3000 |
| f3 auto | latch 676 | latch 2456 |
| ff411 | latch 556 | latch 1754 |
| f4 auto | no latch | no latch, but foreign deaths never counted and layer on 312/312 |
| ff414 | no latch | latch 2610 |
| kit squad | gate closes at the foreign death (tick 360) | gate stays open |

The override keeps the layer acting after foreign deaths and suppresses the FFA posture in FFA matches.

**`{ ffaLatchDeaths: 1 }`:** on all 9 auto/FFA sources the bot latches FFA at the **first** foreign death (latch tick equals
first-foreign tick) instead of the third. On f4 auto and ff414, which never latch in the base build, it is a permanent FFA
posture caused by a SQUAD-only override. Each difference starts exactly at the first-foreign-death decision.

**`{ gunlessClue: true }`** (synthetic S4, two laser-only hostiles, no foreign death): FFA from decision 0, 16 of 16 decisions
differ. **`{ beamClue: true }`** gave 27/27 identical: no source has beam clues while the gate is open.

**Ships silently.** `mktw.py ... lt0 '{"ffaLatchT": 0}' --select` exits 0, the bundle builds, conformance PASSES, and stderr
stays empty (`vfy/conf/tkt_lt0.txt`).

### 2.6 Carried state after the gate closes (documentation)

With the 37-key set, the open-loop FFA streams kit, f1, f2 and f3 re-converge exactly after the first foreign death (0
differing decisions). f4 auto keeps 49 of 108 post-death decisions different. The single-key bisect (`vfy/bis/`) gives:
- `strafeHi 1.2` (candidate #12): 3 decisions differ before the death and **49 after**.
- `reloadAmmo`, `dodgeMargin`, `upgradeOrder`: pre-death decisions only.

The mechanism is `mover.js:112`, `jink.until = t + strafeLo + (strafeHi - strafeLo) * B.rng()`. The override changes when the
shared match RNG is consumed, so after the restore both the RNG stream and the pending reversal timer stay desynchronised.

So `tweak_candidates.md`'s "the FFA final after its first foreign death plays exactly as 5.38" is wrong. The correct
statement: from the first foreign death on, the build runs the 5.38 decision logic from a different state (RNG position,
timers, memories). In real matches the world state differs anyway.

## 3. Identity under the 5.38 SELECT

**Trees**
- `ckpt_07_LG` + `mkvar.py` (laserRange far, farmHp 90, laserEcon off, focus mult, retreat d3, upg std, seek on, aggr any70f,
  fb on, salt 1) + `patch_lc.py loseCover=never` is **byte-identical to `variants6/FNV_s1/bot`**. That bundle's sha256 is
  e0f3917e..., the 5.38 build, commit 4ffa6f2, BB-ABF2641C.
- The same recipe on `ckpt_08_TW` (`vfy/v538_08`) equals the engineer's `v538_08` and differs from FNV_s1 only by the TW
  lines.

**Recordings** (`vfy/idb.sh` with the unmodified `tools/rec7.js`, fuse off, 2 lanes): FNV_s1 copy vs `v538_08` is
**27/27 byte-identical**. That covers kit / long4800 / long11 / long23p x squad / auto, sim squad 1-6, kit ffa,
ffa_s1-4 x auto / ffa and sim FFA 411-414, with errors 0 and fuse 0 on both sides. Comparator: `vfy/idc.mjs n07 n08`.

**Extra:** DEF, ckpt_07_LG vs ckpt_08_TW: 27/27 byte-identical (`idc.mjs d07 d08`).

## 4. Tests

| Test | Result |
|---|---|
| `tw_scratch/test_tf2.mjs` (extended) on ckpt_08 | 14/14 |
| `r7work/tools/test_tf2.mjs` on ckpt_08 and ckpt_07 | 13/13 each; both outputs byte-identical |
| `tw_scratch/test_tw8.mjs` | 15/15 |
| My scene tests `vfy/scene_t.mjs` + `scene_gc.mjs` | 5/11. The 6 failures are the breaks: 2.1 (S1 (a) reads in FFA, S1 (b) B.eff vs ideal, S1b bandHi 115) and 2.5 (S2 ffaLatchDeaths, S3 ffaLatchT, S4 gunlessClue). |

## 5. Decision time (kit stream, auto, one core, default 30 ms fuse, 10 interleaved reps, load 18-23; `vfy/tm3`)

| Variant | Mean | p50 | p99 | Worst, median of reps (range) |
|---|---|---|---|---|
| ckpt_07 | 0.73 ms | 0.14 | 18.4 | 22.6 (8.1-66.1) |
| ckpt_08 | 0.68 ms | 0.14 | 15.4 | 22.4 (12.7-44.7) |
| 5.38 on ckpt_08, tw off | 0.68 ms | 0.12 | 14.7 | 21.8 (12.9-33.1) |
| 5.38 + 37 equal-to-base overrides (layer on 181 decisions, 2 flips, identical decisions) | 0.78 ms | 0.13 | 14.9 | 25.4 (10.4-92.6) |

The per-run spread overlaps completely between variants. Identical reruns spike to 364 ms on ckpt_07 itself (sim squad 6),
so no difference is measurable above the machine load.

Conformance, base map, 1-CPU group, two reps:

| Bundle | Worst | p99 | Ready | Result |
|---|---|---|---|---|
| `dist_07` | 8.4 / 10.0 ms | 8.6 / 6.9 ms | 2.9 / 2.2 s | PASS |
| `dist_08` | 5.6 / 8.0 ms | 6.5 / 8.4 ms | 2.7 / 2.4 s | PASS |

The k35 ticket passes with worst 3.0 ms. By construction the cost is zero with tw `'off'`. With overrides it is at most 3
pure `firewall()` calls per decision, plus O(keys) writes on each of the about 2 flips per match.

## 6. What holds

- With `tw: 'off'`, ckpt_08 matches ckpt_07 on all 27 sources under the 5.38 SELECT and under DEF.
- The bundle reproduces byte for byte.
- Forced FFA never writes P.
- The gate never re-opens.
- FFA-only keys and equal-to-base overrides are byte-identical to no override.
- Every init-only key is refused.
- T-F2 passes.
- None of the 30 listed candidates is a latch key. Only bandHi (#10) and laserLo (#24) sit in the read window, and neither
  changed an action on 27 sources. strafeHi (#12) carries RNG state past the close.

## 7. Required before any tw value ships

1. **Refuse the latch inputs.** Add `ffaLatchT`, `ffaLatchDeaths`, `beamClue` and `gunlessClue` to `SQ_REFUSED` (reason
   "gate: FFA latch / foreign-death count"), and add `zoneLateFrac` (reason "read only with the firewall closed"). Extend
   test_tw8's refusal list, and re-run identity (expected unchanged with tw off).
2. **Close or document the window.** Either:
   - restore right after `environment()` in `stance.update` and right after `z.nr` in `senseZone`. This is the `v538_ideal`
     instrument: one line in each of stance.js, senses.js and brain.js. It is 27/27 identical with tw off and with the
     37-key set, but it touches two more files;
   - or document that the decision that registers a foreign death, or the FFA latch, still reads the overrides in
     `chooseStance` / `applyStance`: the `bandFor` keys (`rPrefGun`, `bandLo`, `bandHi`, `laserLo`, `laserHi`,
     `rPrefLaser`, `laserBoostAway`, `gunBackStick`), plus `stanceUp`, `stanceHold` and the FFA-branch keys.
   Item 1 is needed in either case, because `environment()` reads the latch keys before any restore.
3. **Correct the "plays exactly as 5.38" sentence** in `tweak_candidates.md`, per 2.6. Note that conformance does not catch a
   refused key; R14 and the `mktw.py` exit code do.

## Files (all under `scratchpad/r7work/tw_scratch/vfy/`)

- Trees: `fnv_copy`, `v538_07r`, `v538_08`, `v538_ideal`, `v538_trace`; tickets `tkt_k35`, `tkt_bad`, `tkt_bad2`, `tkt_lt0`.
- Bundles: rebuilds `dist_rb1`, `dist_rb2`.
- Harness: `idb.sh`, `idc.mjs`, `firstdiff.py`, `trace.mjs`, `trb.sh`, `scene_t.mjs`, `scene_gc.mjs`, `tstat.mjs`,
  `timing.sh`, `basevals.mjs`.
- Override sets: `broad.json`, `ffak.json`, `eqb.json`.
- Outputs:
  - recordings `id/<tag>`: n07, n08, d07, d08, lt0, ld1, gc, bc, bh08, bhid, zl08, zlid, wb08, wbid, ffak, eqb, id0;
  - traces `tr/broad`, `tr/init`; `init_analysis.json`;
  - timing `tm`, `tm3`; conformance `conf/`; bisect `bis/`; spike reruns `spike/`;
  - `scene_t.out`, `scene_gc.out`, `test_tw8.out`, `tf2_*.out`.
