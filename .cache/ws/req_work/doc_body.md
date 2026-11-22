
@TESTS@

Also: `test_brain.js` (all 57 old checks) passes with the requests on; with all switches off its scenario outputs are
the same as the base copy's (diff of the outputs without timing lines is empty). The start-up rehearsal now also feeds
crates losing hp, our own beams and a beam by another mech on a crate.

## Measured in the simulator (matched seeds, sandboxed roster opponents)

Driver: `scratchpad/req_work/sim/ab.mjs` (imports `mechbot/sim/run.js` `playMatch`, our frozen brain as a module,
`taskset -c 3`, one match at a time, answer timeout 1000 ms, map dir `/srv/mech-sparring/_arena`). Raw records:
`req_work/sim2/{squad,ffa,ffa_split,ffa_soft,squad_split}.jsonl`; summariser `req_work/sim/summ.py`.
SQUAD = our bot + 15 house bots of the simulator's squad; FFA = 6 sandboxed roster bots (magic_53f6854,
proj1_kite200_b624765, ttun_ae1b122, kanyaraasi_83e4c93, r1ver_ts_af337d5, nexus_v281_312d591 via
`/srv/mech-sparring/run.sh`) + 9 house FFA types. ON = all requests on; R1off / R2off / R3off = one request off;
OFF = all off (= the frozen base). Score = 16 - place. "ON - X" > 0 means the request helps. These runs used
`crateMechR` 200 / `crateQuietS` 4 (see the soft-gate line below for the current defaults).

SQUAD, 12 seeds:
```
@SQUAD@
```
FFA, 6 seeds:
```
@FFA@
```
Splits:
- FFA R1: crate gate off (steal on) 7.33, steal off (gate on) 6.67, both off 9.33, ON 6.33; ON - gate-off
  -1.00 +- 0.63, ON - steal-off -0.33 +- 0.42. Softer gate `crateMechR 120, crateQuietS 2` (now the default): 7.33 on
  the same seeds (paired against the old ON +1.00), mean cubes 2.2.
- SQUAD R3: gun centre-first (`gunLadderTop 0.5`, laser ladder kept) 3.58; laser centre-first (gun ladder kept)
  3.50; ON 3.58; R3off 4.00. Laser hits ON 79/86, R3off 91/93, gun centre-first 75/78, laser centre-first 81/84;
  gun hits on mechs 897/1036 (gun centre-first) vs 859/1031 (gun from the 0.65 rung).
- Micro-arena probe of R3 (`req_work/probe_hop.mjs`), target strafing at 11.7 m/s with reversals every 1.3 s, with and
  without house-bot hops (jump + 1.5 s jet every 3 s), at 110 / 150 / 180 m: laser 25/25 beams on and off in all six
  cases; gun hits on / off: 67/72, 57/55, 24/25, 26/25, 28/27, 24/21 (of 96-140 shots each).

Honest reading: every paired difference is within about two standard errors; most seeds are identical and the rest
swing by up to 9 places because any change alters the whole match (chaotic divergence). Behaviour counts show what
fired: in SQUAD R1 started 1 steal in 12 matches (D6 + D5 keep it rare), R2's rear-face fired 7 times and its sweep
never ran long (the simulator squad rarely lets us reach the late game: mean 71 s alive); in FFA R2's sweep ran (max
blind inside sweeps 2.5 s) and rear-face fired 7 times; R3's calibration learnt nothing (no own beams in the simulator).
The only signal with a consistent sign is **R1 in FFA (negative, mostly the crate gate)**, now softened in the default;
**R3 in SQUAD is slightly negative (-0.42 +- 0.31)** but neither ladder alone reproduces it and the arena shows no
loss. Recommendation: merge with the presets, keep `R1`, `R2`, `R3` as one-string A/B presets for the real scorer
(local simulators mispredict, see HANDOFF), and if a submission slot is spare, try `R3: 'off'` against `on` first.

## Cost (one core, `taskset -c 3`)

Stream replay with the map, warm pass: on mean 0.08 ms, p99 1.7 ms, max 6.1 ms; off mean 0.05, p99 0.5, max 0.5.
All request scenarios: 4892 decisions, mean 0.05, p99 0.36, max 8.9 ms. Fuzz (6000 rich perturbed observations):
slowest 12.4 ms, never throws, always valid. Simulator: @NM@ matches, max decision @MX@ ms, @LATES@ late answers,
@ERRS@ errors. Bounded work per decision: R1 sense O(crates x beams + watch x tracks) (caps 64 / 16 / 48 / 64), sight
rays only when `alive` drops (<= 4) and 72 rays once per steal start; R2 3 rays; R3 <= 5 `shotClear` while charging.

## economy.js by hand (hunks 1 and 3 against the live file)

Hunk 1, `chooseLoot()`: replace `if (!quiet && B.everSawMech) return` with
```js
    const S = B.steal
    const quiet = t - B.lastContactT >= 3 && B.A === 0
    if (!quiet && B.everSawMech) {
      // R1: a steal in progress is kept; in FFA one may start while the only lines of fire on us are busy loot shooters
      const k = S && (S.keep() || (B.env === 'FFA' ? S.choose(0, true) : null))
      if (k) B.loot = k
      return
    }
```
and in its `consider` closure:
```js
      const d = pathEst(o.x, o.y)
      const di = S && (type === 'cube' || type === 'pickup') ? S.deathItem(o.x, o.y, d) : 0     // R1b kill drops
      if (di < 0) return
      if (d > (di > 0 ? Math.max(maxPath, P.deathRushR) : maxPath)) return
      // ... unchanged lines ...
      let v = value / (tt + 0.5) * (di > 0 ? 1.5 : 1)
      if (S && (type === 'cube' || type === 'pickup') && di === 0) { const r = S.race(o.x, o.y, tt); if (r < 0) return; if (r > 0) v *= P.raceBonus }   // R1d
      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o, rush: di > 0 } }
```
Keep the live cube line (`killReachOk(c) ? P.killCubeR : P.grabCubeHi`) instead of the frozen copy's `deathCubeR`.
The other chooseLoot lines (crate / drone farm gates, `beingShot`, the final `S.choose(bestV)`) are in hunk 2, which applies.

Hunk 3, `chooseGrab()`: add `const S = B.steal` before `tryOne`, and in `tryOne` the same `di` lines (`deathItem`
before the reach test, the 1.5x factor, `race` when `di === 0`, `rush: di > 0` in the record); the live cube loop becomes
```js
    if (cubesWanted()) for (const c of B.cubes.values()) { const kc = isKillCube(c); if (t - c.seen <= (kc && P.stealOn ? P.deathCubeMemS : P.cubeMemS)) tryOne('cube', c, kc ? 1.5 : 1, kc && killReachOk(c) ? killR : cubeR) }   // R1c memory
```

## Things to know when merging

- `aimExplained` changes D0 hostility in both postures (a mech shooting a crate or drone near us is no longer
  "aiming at us"); damage still makes it hostile. `stealOn: false` restores the old rule.
- `rearPick` acts all game (not only late) when `scanOn`.
- The live `economy.js` now has its own long kill-cube reach; R1c adds only the longer memory there.
- `B.killDrops` entries from foreign deaths carry `foreign: true`; nothing else reads that flag.
- The simulator's FFA latch fired in @LATCH@ FFA matches (the others died before the third foreign death).
- One 10 s micro-arena probe ran on core 2 by mistake (not a simulator job); everything else ran on core 3, one job at a time.
- Nothing under `mechbot/bot`, `mechbot/sim` or `mechbot/intel` was edited or opened for editing; the hooked-file base
  copies came from `mechbot/tools/fix2/` by hash.

## Full hook diff (base 07:37 -> req_bot), also `scratchpad/req_work/requests_hooks.patch`

```diff
@PATCH@
```
