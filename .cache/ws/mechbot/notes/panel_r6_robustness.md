# Panel R6: robustness audit (map change, random spawns, config changes)

Auditor: robustness panel, 21 Nov 2026 ~20:35-21:00 UTC. Object: V4 (`scratchpad/variants/V4/bot` readable source and the shipped
bundle `V4/dist/bot.js`). Owner request: "plan for a future map change, random spawn: don't hard-code, do it smartly".
Everything below was measured; all tools and outputs are in `tools/panel_r6/maps/` (this note's only other output is
`tools/panel_r6/robustness_r6.patch` plus its tested copy `tools/panel_r6/fixbot/`). Nothing under `bot/`, `sim/` or
`variants/` was edited.

## Verdict in one paragraph

V4's decision logic has **no dependence on absolute coordinates**: translated, rotated and lifted copies of the arena give
the same decisions tick for tick, and nothing crashed, stalled, got stuck or died in the zone on any of 11 transformed maps
(check.py on all, 88 shipped-bundle simulator matches, 300 more in-process matches). The real risks are elsewhere:
(1) the map loader only looks in `v2/`, so an arena shipped under another folder name leaves the bot **map-blind**
(no sight lines, no paths, no cover); (2) about a dozen constants are tuned to this config's **zone clock, zone radii and
weapon balance** instead of being read from `hello.config`. A 177-line patch fixes 1-6 below; on the current config it
reproduces V4 decision for decision (300/300 stream decisions, 24/24 squad and 12/12 FFA simulator matches identical) and it
applies cleanly to the current `bot/` (dry run).

## Findings, ranked by risk

| # | risk | finding | fix (in the patch unless noted) | test |
|---|---|---|---|---|
| 1 | **HIGH if the arena changes** | `World.loadSync(dir)` (world.js:74) reads only `<dir>/v2/world.json` or `<dir>/world.json` and ignores `hello.map.files`. A final arena listed as `v3/world.json` (or any other folder) fails to load: `world = nav = null`, the brain runs blind (every listed mech treated as visible, straight-line legs into walls, no hide cells, no line checks before firing). Measured: check.py on `maps/v3dir` prints `map load failed ... world=false nav=false` and still PASSes (so the official gate would not catch it). Sim, same seeds, blind vs sighted: squad -0.62 +- 0.62 (24 paired seeds; the sim under-rates cover, FFA damage is larger) | `loadSync(dir, opts, files)`: try the folder of every `files` entry ending in `world.json`, then `v2/`, then `dir`, then any sub-folder holding a `world.json`; terrain from `json.terrain.file` next to it, else the `.i16` entry of `files`. `bot.js` passes `h?.map?.files` | check.py `maps/v3dir`: V4 `world=false`, patched `world=true nav=true`, PASS. Sim with the hello rewritten to `v3/` (stdin filter `hello_v3.py`): patched bot loads the map and plays the 6 base seeds identically to V4 on `v2/` |
| 2 | **MEDIUM** | Match-clock seconds tuned to the default zone schedule (hold/shrink total 415 s, last circle 375-415 s): `fpStartT 375`, `ffaFinalT 390`, `fpShootT 405` (FFA final-point / hp race), `farmStopT 210` (SQUAD farming window), `scanLateT 240`, `ffaLatchT 200`, `openFarmT 75`, `ffaQuietS 90`. The protocol says balance changes between matches. With hold/shrink x 0.7 (`maps/zt070`: last circle 262.5-290.5 s, duration 336 s) the final-point and hp-race rules **never run** (`raceOn` needs t >= 390) and farming continues into phase 4's shrink; with a slower clock farming stops a phase early | `anchorToConfig(P, hello.config, overrides)` in brain.js right after `resolveParams`: k = (sum of hold_s + shrink_s) / 415, clamped 0.4-2.5, scales the five window constants; `fpStartT` = hold start of the last phase, `ffaFinalT` = its shrink start, `fpShootT` = shrink start + 0.6 x shrink_s. Keys set in `overrides` are left alone. **Add any new clock constant (e.g. R5 LG "t < 90 s") to the list** | `anchors.mjs`: default config gives exactly 210/240/200/75/90/375/390/405; zt070 gives 147/168/140/52.5/63/262.5/273/283.5 |
| 3 | MEDIUM-LOW | Absolute zone radii: `zoneLateR 70` (late-zone leash, nrEff x 0.5, no line-breaking retreat; = phase 4's radius) and `scanLateR 140` (= phase 3). Radii x 1.3 (`zs130`: 91 m in phase 4) start the late-zone legs one phase late; radii x 0.5 one phase early | same function: `zoneLateR` = radius of phase L-2, `scanLateR` = radius of phase L-3 (L = last index, needs >= 4 phases) | default 70/140 unchanged; zs070 49/98, zs130 91/182 |
| 4 | LOW-MEDIUM | Pocket exits: `nav.hopPlan` limits `maxHop 45`, `maxClimb 40` were chosen for campus roofs ("70 m towers out of reach"). A full tank climbs about 69 m by the config (jump 11 m/s, rise 10 m/s, 100 energy / 15 per s). Today all 12 pockets >= 100 m2 have an exit (`pockets.mjs`: 0 without one), but an arena with a 40-58 m enclosure would trap the bot (pocketExit returns false, the zone walk hits the wall, stuck-jet lasts 1 s) | mover.js `hopPlanCfg`: plan with the old limits first; only when that finds nothing, again with maxClimb = 0.85 x (jump apex + rise x energy / jet_drain) (59 m today, cap 80) and maxHop 60. Identical on every pocket that has an exit today | pockets survey; patched build identical on base in sim and stream |
| 5 | LOW | Weapon numbers not read from stats: `magSize 12`, `magReloadS 2.5` (enemy reload window), threat priors `laserDpsIn 92`, `lightDpsIn 240`, `mortarDpsIn 60`, and the mortar threat range literal `d < 235` (tactics.js:50, ffa.js:185; = 72^2/22). A balance change mis-weights threats and opens the "they are reloading" approach at the wrong time | `magSize` = gun.mag, `magReloadS` = gun.reload + 0.1; priors scaled by damage / (charge + cooldown) ratios against the default numbers; `mortarMaxR` = floor(speed^2 / gravity), used in both places | default values reproduced exactly (rounded to 1e-3) |
| 6 | LOW | Start-up rehearsal calls `nav.hopPlan(-307, 106)` (brain.js:94), a stadium point of this map. Translated it is outside the bounds, mirrored/rotated it is open ground: the pocket planner is then compiled cold in the match (first call 7-13 ms vs 4-8 ms warm, on a loaded machine) | warm up on this map's largest pocket (first cell of the largest non-main component) | `hopcold.mjs`; patched rehearsal runs on every map, decisions unchanged |
| 7 | LOW (not patched) | Nav grid is a fixed 2 m over the whole bounds: about 150-210 B per cell (base 193k cells +41 MB, 0.6 s to build under the 1-CPU quota; `wide` 386k cells +56 MB, 1.2 s). 512 MB is reached near 2.5M cells (about 13x this arena's area); the build is ~3 us per cell against the 20 s hello budget. Heap cap 2^18 only limits pocket searches above ~32k cells | proposal: in bot.js choose `cell = n2m > 1.5e6 ? 3 : 2` (n2m = cells at 2 m) and skip the rehearsal when init already took > 10 s. Not in the patch: a 3 m grid changes wall margins and must be re-verified with test_world.js | `rss.mjs`, `wide` map: init 3.2 s, PASS |
| 8 | INFO | Chirality: roam direction (`roam.dir = 1`), first strafe sign (`jink.sign = 1`) and the scan sweep sense are fixed, so on a mirrored map the bot walks the zone band and strafes the other way physically (all 13.7% aim / 34.7% move differences of `mirx`/`miry` are in HOLD/roam and FIGHT/standoff). Not a coordinate dependence, harmless on average | optional: draw both initial signs from `B.rng()` | `compare.py` |
| 9 | INFO (test hygiene) | The 30 ms wall-clock fuse makes decisions depend on CPU load: one of 24 in-process matches diverged when a decision took 32 ms on a contended machine (seed 122; uncontended re-run identical). Simulator "lates" of 0-15 per map in the batch runs were all contention: uncontended, 0 lates and max 14 ms on base, rot90 and mirx | run comparison batches with jobs <= cores - 1 and nothing else running | `ipt_*.json` |

Checked and clean (no change needed): no coordinate literal in the decision code other than #6; zone centre, radius, next
circle and shrink window come from `obs.zone` every tick; arena margin from `match.arena_margin`; drops, crates, cubes,
pickups, upgrade thresholds, vision, cone, ranges, speeds, radii, cube scaling read from `hello.config` / `self.stats` with
default fallbacks only for missing fields (DEF_CFG); heights everywhere relative to `nav.levelAt` / `world.surfaceZ` (lift40
identical); spawn handling has no position table (opening uses the zone and what is seen); `hunt.js` (R4) uses only relative
quantities (`h50RingFrac` x next radius).

## Inventory of map- or config-tuned numbers in V4

| where | constant | tied to | status |
|---|---|---|---|
| world.js:75 | `'v2'` sub-folder | this kit's folder name | #1 |
| brain.js:94 | `hopPlan(-307, 106)` | stadium bowl coordinate | #6 |
| params.js | `fpStartT 375, ffaFinalT 390, fpShootT 405, farmStopT 210, scanLateT 240, ffaLatchT 200, openFarmT 75, ffaQuietS 90` | default zone clock | #2 |
| params.js | `zoneLateR 70, scanLateR 140` | default phase radii | #3 |
| nav.js hopPlan | `maxHop 45, maxClimb 40` | campus roof heights | #4 |
| params.js / tactics.js:50 / ffa.js:185 | `magSize 12, magReloadS 2.5, laserDpsIn 92, lightDpsIn 240, mortarDpsIn 60`, `235` | default weapon balance | #5 |
| bot.js | `cell: 2` | arena size (memory, build time) | #7 |
| counters.js | `aimR 230, lootR 170, rangeMax 300, walkSpeed 11.7` (fallback) | gun range / vision | behaviour-classifier windows; low, left |
| params.js | `openingS 40, earlyOpenS 20, h50SeekFromS 20` | first hold (60 s) | short opening windows; low, left |
| tactics.js | `RINGS [8,16,28], FAR [45,70]`, `hideMaxR 120` | mech size / cover spacing | geometric, map-agnostic |

## Test method

`tools/panel_r6/maps/make_maps.py` (standard library) writes, in the exact kit format (`v2/world.json` + `v2/terrain.i16`),
a matching `hello.json` (config from `notes/hello_example.json`, zone start centre moved with the map) and a matching
conformance stream (the kit's recorded 300 observations with every position, velocity, aim, bearing, beam, drop and zone
moved the same way): `base` (identity), `mirx`, `miry`, `rot90`, `tr300` (+300 m in x and y), `lift40` (+40 m in z),
`zs070` / `zs130` (zone radii x 0.7 / x 1.3), `zt070` (hold / shrink / duration / drop times x 0.7), `wide` (the arena
plus its mirror image, 2137 x 722 m, zone at the seam, radius 800), `v3dir` (base under `v3/`). `verify_maps.mjs`: 0 of
4000 height and 0 of 4000 sight-line mismatches per transformed map against the original.

1. Conformance: `run_check.sh <map> <bot.js>` = check.py with `--stream` and `--map-dir` of the map, the bot under the
   1-CPU quota group (`tools/cg1.sh`) with the Dockerfile's `BUN_JSC_*` limits. V4 bundle: all 11 PASS, 300/300 in time,
   worst answer 3.1-12.3 ms, ready in 2.2-3.3 s (wide 3.3 s). `v3dir`: blind (finding #1).
2. Simulator (it accepts `--map-dir` and `--config`; its own hello always names `v2/` files, so the folder test uses
   `hello_v3.py` as a stdin filter in front of the bot): `run_sims.sh` = V4 bundle as a process, 6 squad + 2 FFA matches per
   map (88): errors 0, zone deaths 0, seconds outside the zone 0, stuck episodes (|move| > 0.5 at < 1.5 m/s for >= 2 s) 0.
   `run_inproc.sh` = V4 brain in-process, 24 squad seeds per map (scores: base 4.25 +- 0.40, rot90 4.08 +- 0.60,
   mirx 3.88 +- 0.53, tr300 3.79 +- 0.47, wide 3.92 +- 0.43, zs070 3.67 +- 0.42, zs130 4.96 +- 0.51, zt070 3.92 +- 0.39,
   blind 3.62 +- 0.53) and 12 FFA seeds (base 13.25 +- 0.59, zt070 13.92 +- 0.47, wide 9.50 +- 1.33): no stuck episode, no
   zone death. Map differences are within noise (spawns and loot differ per map; the sim's own float noise makes even
   tr300 a different draw, while lift40 reproduced base bit for bit). `stuck.py`, `stuck_ip.py` summarise the traces.
3. Equivariance (the strongest test for absolute coordinates): `equiv.mjs` runs the brain in-process over each map's
   transformed stream; `compare.py` maps actions back and diffs them with base. tr300: 0% mode / target / aim / fire
   differences, 1% move (float rounding); lift40, rot90, wide: identical; mirx / miry: chirality only (#8).
4. Pockets, memory, cold planner: `pockets.mjs`, `rss.mjs`, `hopcold.mjs`.

## The patch (tools/panel_r6/robustness_r6.patch, against V4/bot; applies to the current bot/ with offset 1 in brain.js)

Files: `bot.js` (pass `h.map.files`), `lib/world.js` (loader), `lib/brain.js` (`anchorToConfig`, rehearsal pocket),
`lib/mover.js` (`hopPlanCfg`), `lib/tactics.js` and `lib/ffa.js` (`P.mortarMaxR`). Verification done on the patched copy
`tools/panel_r6/fixbot/`:
- default config: `anchors.mjs` reproduces every old constant; stream decisions 300/300 identical to V4 on base and rot90;
  simulator 24/24 squad (seed 122 after an uncontended re-run) and 12/12 FFA matches identical to V4;
- check.py PASS on base, v3dir (now `world=true nav=true`), zt070, rot90, wide; worst answer 3.8-9.4 ms;
- simulator with the `v3/` hello: map loaded, 6/6 matches identical to V4 on `v2/`.

To ship: apply to `bot/` (`cd bot && patch -p1 < ../tools/panel_r6/robustness_r6.patch`), run `tools/test_world.js`,
`tools/test_brain.js`, rebuild with `tools/package.sh`, re-run `run_check.sh v3dir dist/bot.js` and `run_check.sh base
dist/bot.js`. Because it is behaviour-identical on the practice config it can ride along with any one-change submission
without spending a draw; it only changes play when the final's map folder, zone clock, zone radii or weapon balance differ.

Reproduce everything: `python3 -I tools/panel_r6/maps/make_maps.py`, then the scripts above (each has a usage line).
