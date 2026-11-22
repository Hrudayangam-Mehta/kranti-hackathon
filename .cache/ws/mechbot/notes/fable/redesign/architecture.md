# Redesign architecture: variant table, utility mode switch, module split, tests

One author (the switch-logic architect agent), no independent review, nothing here is measured. It is a design: no code
was changed. Line numbers are those of `S/fable_work/chaos/tree/lib` on Sun 22 Nov 03:55 UTC (S = the session scratchpad).
File and field names follow `redesign/coach_spec.md` (engage.js / survive.js / farm.js, `B.ft`, `B.regen`, ...).

## 0. What I found in the trees (facts the design rests on)

- `variants7/MX_base` = FNV_s1 + 4 lines in `createBrain` (brain.js 187-190) + `saltTable: ''` and a literal `salt: 1` in params.js.
- `fable_work/switch/tree` and `fable_work/chaos/tree` do NOT contain the saltTable lines (their seed line is still
  `saltHash(P.salt)`, params `salt: 0`, patched by `variants_tools/mkvar.py`). The trunk of the redesign must port them.
- `resolveParams` runs once, at the first line of `createBrain`, before `hello.slot` is read. Presets are applied in SELECT key
  order; plain overrides win last. `anchorToConfig` skips any key that differs from PARAMS.
- `warmUp` builds scratch brains with `{ ...P, warmup: false }` as plain overrides and the same `hello` (same slot).
- Every module captures `const P = B.P` in its closure, so `B.P` cannot be swapped; it can only be mutated in place.
- `hunt.firewall()` = SQUAD posture, `B.foreignDeaths < 1`, next radius > `zoneLateR`, more than 3 alive. In `env: auto` each
  term only ever goes from true to false (the FFA latch is one-way), so the firewall drops once and stays down.
- The legacy code calls `B.rng()` in three places (brain.js 414 roam, mover.js 149 jink, mover.js 565).
- The chaos notes folder holds only `READY.txt` (CH1_s1/s2/s3 hashes); there is no chaos BUILD_LOG yet. CH1 is read from
  the tree: presets `focus: kill`, `laserGrab: spawn`, `cubes: snow`, `laserRange: midsq`, `boostCharge: on`, `farmHp: 50sq`,
  `cratePath: 80`, `upg: laser`, `upgFix: on`; `tree2` adds `alpha: on` and `strafe: fast75`.

## 1. Variant table

### 1.1 Meaning of a table character

`variantTable` (16 chars, index = `hello.slot`) replaces `saltTable`; `saltTable` stays as a read-only alias so every MX
build still means the same thing.

| Character | Meaning | Rule |
|---|---|---|
| `''` table, `'0'`, or slot outside 0-15 | base: `P.salt`, no select | as MX_base |
| digit `1`-`9`, UPPER-case letter `A`-`Z` | pure salt `parseInt(c, 36)` (1-35) | never declared in VARIANTS; fixed for ever |
| lower-case letter `a`-`z` declared in `VARIANTS` | named variant `{ name, salt, select }` | append-only: a letter is never redefined or reused |
| lower-case letter not declared | pure salt `parseInt(c, 36)` | so today every table string is byte-identical to MX_base |

Ledger rule: write salts above 9 in upper case from now on; every row of `mix_ledger.md` records the table string and the
`VARIANTS` entry verbatim. The additivity `kills(T) = sum_s K_s(T[s])` holds for behaviour variants as well (one flip of slot s
still measures `K_s(new) - K_s(old)` exactly), provided the base and every already-measured variant stay byte-identical.

### 1.2 Code (params.js, integrator only)

```js
// PARAMS (next to salt)
  variantTable: '',          // 16 chars, one per hello.slot; '' = off. saltTable (MX builds) is read when this is ''
  saltTable: '',
  variantRevert: true,       // V-guard: restore the base values in place when hunt.firewall() drops

// after PRESETS
export const VARIANTS = Object.freeze({
  // a: { name: 'CH1', salt: 1, select: { focus: 'kill', laserGrab: 'spawn', cubes: 'snow', laserRange: 'midsq',
  //      boostCharge: 'on', farmHp: '50sq', cratePath: '80', upg: 'laser', upgFix: 'on' } },
})
/** Preset values a variant may select: each one acts only in the SQUAD posture behind hunt.firewall(). */
export const FW_PRESETS = Object.freeze({ focus: ['kill'], laserGrab: ['spawn'], cubes: ['snow'], laserRange: ['midsq'],
  boostCharge: ['on'], farmHp: ['50sq'], cratePath: ['80'], upg: ['laser'], upgFix: ['on'], dropLife: ['on', 'idle'],
  util: ['tgt', 'wait', 'on'], pauseMove: ['on'], isoDwell: ['on'], alpha: ['on'], strafe: ['fast75'],
  engage: ['on'], survive: ['on'], farm: ['on'], mode: ['util'] })

export function resolveVariant(P0, slot) {
  const tab = typeof P0.variantTable === 'string' && P0.variantTable.length === 16 ? P0.variantTable
    : typeof P0.saltTable === 'string' && P0.saltTable.length === 16 ? P0.saltTable : ''
  const c = tab && slot >= 0 && slot < 16 ? tab[slot] : ''
  const v = c && c >= 'a' && c <= 'z' && Object.prototype.hasOwnProperty.call(VARIANTS, c) ? VARIANTS[c] : null
  if (v) return { ch: c, name: v.name, salt: v.salt, select: v.select && Object.keys(v.select).length ? v.select : null }
  const k = c ? parseInt(c, 36) : 0
  return { ch: c || '', name: k > 0 ? 'salt' + k : 'base', salt: k > 0 ? k : P0.salt, select: null }
}
```

### 1.3 Code (brain.js createBrain, replaces lines 182-189; integrator only)

```js
export function createBrain(hello, ctx, overrides) {
  const ov = isObj(overrides) ? overrides : {}
  let P = resolveParams(ov)
  const V = resolveVariant(P, fnum(hello && hello.slot, -1))
  let Pbase = null
  if (V.select && P.env !== 'ffa') {                       // forced FFA plays the base (salt kept): T-F2 by construction
    Pbase = P
    P = resolveParams({ ...ov, select: { ...(isObj(ov.select) ? ov.select : {}), ...V.select } })
  }
  if (P.anchorCfg !== false) {
    anchorToConfig(P, hello && hello.config, isObj(overrides) ? overrides : null)
    if (Pbase) anchorToConfig(Pbase, hello && hello.config, isObj(overrides) ? overrides : null)
  }
  const cfg = normalizeConfig(hello && hello.config)
  const world = (ctx && ctx.world) || null, nav = (ctx && ctx.nav) || null
  const log = (ctx && typeof ctx.log === 'function') ? ctx.log : () => {}
  const seed = ((fnum(hello && hello.seed, 12345) >>> 0) ^ P.rngSalt ^ saltHash(V.salt)) >>> 0
  // ... unchanged down to the B literal; add to B:  variant: V, variantLive: !!Pbase, sub: '', rng2: makeRng((seed ^ 0x2c1b3c6d) >>> 0)
```

After `B.hunt = hunt` (line 255):

```js
  const revertKeys = Pbase ? Object.keys(P).filter((k) => k !== 'selected' && P[k] !== Pbase[k]) : null
  function variantGuard() {                                // first line of the 'assess' stage, before assess(B)
    if (!B.variantLive || hunt.firewall()) return
    if (P.variantRevert !== false) for (const k of revertKeys) P[k] = Pbase[k]
    B.variantLive = false; B.sub = ''; B.counters.variantOffTick = B.tick
    if (B.en && B.en.off) B.en.off(); if (B.sv && B.sv.off) B.sv.off(); if (B.fm && B.fm.off) B.fm.off()
  }
```

Why this is byte-identical for every pure-salt variant: `V.select` is null, so `P` is the first `resolveParams(ov)` object,
`Pbase` is null, `variantGuard` returns on its first test, and `V.salt` is the same expression as MX_base's `effSalt`
(`tabC && parseInt(tabC, 36) > 0 ? parseInt(tabC, 36) : P.salt`). The only additions are two inert PARAMS keys, three B fields
and `B.rng2` (a second generator; creating it draws nothing from `B.rng`).

### 1.4 The SQUAD-only rule, enforced twice

1. Contract (per rule): every behaviour rule tests `B.env !== 'FFA' && hunt.firewall()` at its own trigger, as all CH1 rules
   do. `test_variant.mjs` fails if a `VARIANTS[c].select` entry is not in `FW_PRESETS`.
2. V-guard (structural): the first decision on which the firewall is down, the variant's parameters are written back to the
   base values in place and never return. A global-acting preset (`farmHp: '50'`, `laserRange: 'mid'`) therefore cannot leak
   into the free-for-all even if someone declares it by mistake. Forced FFA (`env: 'ffa'`) never applies the select at all.
3. Rules for new code: read `P.*` live (never cache a P value in a closure); never call `B.rng()` (use `B.rng2()`), so the
   legacy stream stays aligned for the rest of the match; one-way latches only.

Limit, stated plainly: after a mid-match firewall drop the parameters are the base, the state is not (position, loadout,
hp differ from what the base would have had). "The final plays the base" means base rules from that decision on.

### 1.5 Build

Trunk = `fable_work/chaos/tree` (or `tree2` if alpha / fast75 are kept) + 1.2 + 1.3. `mkbuild.sh` (FNV 5.38 SELECT, salt 1) then
`sed "s/^  variantTable: '',$/  variantTable: '<16>',/"` as `variants7/mkmx.sh` does. Before any flip measured on the new
trunk is trusted: submit the trunk once with the table all `1`; the server is deterministic, so it must return 258 kills
exactly. That one submission tests the whole chain (NC plan cache, presets, port) against the real server.

## 2. Utility mode switch (preset `mode: { d3: {}, util: { modeUtil: true } }`, new file `lib/modesel.js`)

### 2.1 How it replaces decideMode without touching it

`decideMode` is not edited. `modesel.decide()` runs it every decision on a shadow copy of the legacy mode, then overrides
the result only while live. All legacy state other modules read (`B.losing`, `losingSince`, `losingEndT`, `finishing`,
`winning`, `fightOk`, `doomed`, `tCover`, `holdFire`) stays coherent, and the hand-back at the firewall drop is seamless.

```js
export function makeModeSel(B, hunt) {
  const P = B.P, leg = { mode: '', since: -99 }, st = { s: 'ROAM', since: -99, lock: {} }
  function decide() {
    B.mode = leg.mode; B.modeSince = leg.since
    decideMode(B)                                           // legacy, untouched
    leg.mode = B.mode; leg.since = B.modeSince
    if (P.modeUtil !== true || B.env === 'FFA' || !hunt.firewall()) { B.sub = ''; return }   // legacy result stands
    const s = choose()                                      // 2.2-2.4
    if (s !== st.s) { st.s = s; st.since = B.me.t; B.counters.uSwitch = (B.counters.uSwitch || 0) + 1 }
    B.mode = MAP[s].mode; B.modeSince = st.since; B.sub = MAP[s].sub
    B.holdFire = s === 'HEAL' && !!B.regen && B.regen.hold === true
  }
  return { decide, legs, state: () => st.s }
}
```

Off (`mode: 'd3'`): `B.ms` is undefined and the mode stage calls `decideMode(B)` as today. Forced FFA with the preset on: the
restore / save pair is the identity, so the output is byte-identical (T-F2).

### 2.2 The nine states map onto the seven legacy modes plus `B.sub`

No `B.mode === MODE.X` test anywhere else needs to change.

| State | B.mode | B.sub | Legs |
|---|---|---|---|
| ZONE | ZONE | '' | `mover.zoneLegs` |
| DROP | DROP | '' | `econ.dropLegs` / `B.sv.dropLegs` |
| GRAB | FIGHT if a target, else HOLD | 'GRAB' | `B.sv.grabLegs` (boost, torso stays on the target) |
| FINISH | FIGHT | 'FINISH' | `B.en.finishLegs` (else `fightLegs`) |
| DISENGAGE | DISENGAGE | '' | `B.sv.retreatLegs` (else `retreatLegs`) |
| FIGHT | FIGHT | '' | `fightLegs` |
| HEAL | HEAL | '' | regen hold in place (`B.sv.retreatLegs`) |
| LOOT | LOOT | '' | `econ.lootLegs` |
| ROAM | HOLD | 'ROAM' | `hunt.seekLegs` / `holdLegs` |

`applyVetoes` (last stand) still runs after the mode stage; `ms.legs()` ignores a sub whose mode no longer matches.

### 2.3 Rails first, then utilities

Rails (not utilities, instant): `B.zoneUrgent` -> ZONE; `B.dl.capture` or a latched `B.dropGo` -> DROP; `B.doomed` -> FIGHT.

Utilities, one currency (hp-equivalents over the horizon `uH` = 6 s), pure functions of the shared fields; a state that is
not available returns -Infinity. Inputs with a missing module take the neutral default (`ft.ok` true, `regen.running` false).

| State | Utility | Keys (start values, unmeasured) |
|---|---|---|
| FINISH | `uKill - inDps * tKill + uFinBonus`, only if `ft.finish` (tKill <= 1.6 s) | `uKill` 390, `uFinBonus` 150 |
| FIGHT | `pK * uKill * min(1, uH / tKill) + uDmg * ourDps * uH - inDps * min(uH, tKill)`, `pK = clamp01(tDie / tKill - 0.5)` | `uDmg` 0.15 |
| DISENGAGE | `(inDps - inDpsCell) * min(uH, 3) - uDmg * ourDps * tWalk`, only if shooters >= 2, `!ft.ok`, a cell within 3 s | from `B.sv.cell` |
| DROP | `pCap * (maxHp - hp + uDropBonus) - inDps * tTravel` | `uDropBonus` 200 |
| GRAB | `value / (1 + tPath / 2) - inDps * tPath`; value: laser (none held) 400, cube 56 + 0.04 `uKill`, wanted weapon 150 | `uLaser` 400 |
| HEAL | `min(maxHp - hp, regenPerS * uH)` if no line on us for 0.5 s and regen is running or starts within 2 s, else -Infinity | - |
| LOOT | `cubes * 72 * uH / (tBreak + tPath)`, only if `B.farmOk` and no line on us | - |
| ROAM | `uRoam` | 20 |

### 2.4 Hysteresis, minimum dwell, latches

- Incumbent bonus: the current state competes with `U * uHys + uHysAdd` (1.25, +30). Ties go to the coach's order
  `ZONE > DROP > GRAB > FINISH > DISENGAGE > FIGHT > HEAL > LOOT > ROAM`.
- Minimum dwell before a challenger may win (s): FIGHT 0.6, DISENGAGE 1.5, HEAL 1.5, LOOT 1.0, ROAM 2.0. Instant entry
  for ZONE, DROP, GRAB, FINISH; instant exit from any state whose utility became -Infinity.
- Latches: DROP until captured / gone / 12 s after landing without progress. FINISH until the target dies or passes 45% hp.
  GRAB 6 s, then the item is ignored for 30 s. DISENGAGE at most 3 s, then a 4 s lockout. HEAL ends on any line opening.
- Deterministic: no RNG, no wall clock; O(states) per decision after the modules' `pre()`.
- Counters: `uSwitch`, `uState_<S>` (decisions per state), `uDwellBreak` (must stay 0 outside the instant set).

## 3. Module split for three engineers

### 3.1 Ownership

The integrator owns every existing file and installs all hooks first (commit I0). An engineer owns one new file, one marked
PARAMS / PRESETS block and one test file. An engineer who needs another hook sends a three-line request; nobody else edits
brain.js, tactics.js, firecontrol.js, economy.js, mover.js or hunt.js.

| Who | Owns (writes) | PARAMS prefix, preset | Writes on B | Rules |
|---|---|---|---|---|
| Integrator | brain.js, tactics.js, firecontrol.js, economy.js, mover.js, hunt.js, params.js skeleton, `modesel.js`, `tools/test_variant.mjs`, `tools/test_modesel.mjs` | `variant*`, `u*`; `mode` | `B.variant`, `B.variantLive`, `B.sub`, `B.rng2`, `B.mode` | section 1, 2 |
| E-A engagement | `lib/engage.js`, `tools/test_engage.mjs` | `en*`; `engage: off / on` | `B.ft = { tKill, tDie, ourDps, inDps, shooters, ok, finish }`, `B.rPref`, `B.reposition` | FB1, FB2 test, FB3, alpha / magazine rhythm, target pick |
| E-B survival, power, drop, regen | `lib/survive.js`, `tools/test_survive.mjs` | `sv*`; `survive: off / on` | `B.regen = { at, running, lost, hold }`, `B.holdFireFB`, `B.dropGo`, `B.grabGo`, `B.sv.cell` | FB2 cell + legs, FB4, FB5, FB6, boost policy |
| E-C economy, loot, upgrades | `lib/farm.js`, `tools/test_farm.mjs` | `fm*`; `farm: off / on` | `B.crateShot`, `B.farmOk`, `pickFB(offer)` | FB7, FB8, upgrade picks |

params.js is prepared in I0 with three empty marked blocks in PARAMS, three in PRESETS, and the SELECT entries
`engage: 'off', survive: 'off', farm: 'off', mode: 'd3'` already in place (before `healDoc`), so later edits never share a hunk.

### 3.2 Shared data (read-only for the modules)

`B.me` (hp, hpf, maxHp, energy, gun, laser, lightning, cubes, regenDelay, regenPerS, lastHurtT, lastDealtT, lastShotAtT, walk),
`B.trackList` / `B.tracks` (dist, hp, maxHp, losIn, losOut, hostile, lastDmgInT, a, has*, magN, lastBulletT, finishable),
`B.A`, `B.threats`, `B.nLos`, `B.n120`, `B.attackers3`, `B.target`, `B.targetSince`, `B.lastLosInT`, `B.zone`, `B.zoneUrgent`,
`B.hide`, `B.tCover`, `B.posGoal`, `B.loot`, `B.grab`, `B.dropTask`, `B.dl`, `B.drops`, `B.cubes`, `B.crates`, `B.pickups`,
`B.killDrops`, `B.foreignDeaths`, `B.aliveN`, `B.env`, `B.mode`, `B.sub`, `B.rush`, `B.fkWalk`, `B.finishing`, `B.killSecure`.
Helpers: `hunt.firewall()`, `hunt.burst3(tr)`, `hunt.ttk(tr)`, `mover.moveTo / standoff / pmWalkClean`, `B.world.shotClear`.
Cross-module reads go only through the fields in 3.1, with the neutral default when the writer is absent.

### 3.3 Hook list (all installed in I0; each is `if (B.x) ...`, so an absent module is a no-op)

brain.js
- HB1 `createBrain` 182-189: variant resolve, `Pbase`, seed from `V.salt` (1.3).
- HB2 after 256: `if (P.svOn) B.sv = makeSurvive(B, hunt, mover, hideSearch, econ)`; `if (P.enOn) B.en = makeEngage(B, hunt, mover)`;
  `if (P.fmOn) B.fm = makeFarm(B, hunt, mover, econ)`; `if (P.modeUtil) B.ms = makeModeSel(B, hunt)`; `variantGuard` defined.
- HB3 `act` 727, first line of the assess stage: `variantGuard()`.
- HB4 735, after `B.util.pre()`, before `selectTarget(B)`: `if (B.sv) B.sv.pre(obs); if (B.en) B.en.pre(obs)`.
- HB5 737, after `hunt.post()`: `if (B.en) B.en.post()` (fills `B.ft` for the chosen target).
- HB6 740 econ stage: `econ.update(); if (B.fm) B.fm.update(); if (B.sv) B.sv.post()` (sets `dropGo`, `grabGo`).
- HB7 746 mode stage: `if (B.ms) B.ms.decide(); else decideMode(B)`.
- HB8 `legs` 641, before the switch: `if (!(B.ms && B.sub && B.ms.legs())) switch (B.mode) { ... }`.
- HB9 `fightLegs` 488, after `stance.fightLegs()`: `if (B.en && B.en.fightLegs()) return`.
- HB10 `retreatLegs` 432, first line: `if (B.sv && B.sv.retreatLegs()) return`.
- HB11 `holdLegs` 387, after `util.waitLegs()`: `if (B.sv && B.sv.holdLegs()) return; if (B.fm && B.fm.idleLegs()) return`.
- HB12 `legs` 665, after the boostCharge block: `if (B.sv) B.sv.boost()` (may only set `cmd.boost`; not in a rush / walk-in).

tactics.js (decideMode is not touched)
- HT1 `bandFor` 105, before each return: `if (B.en) B.en.band(bd)` (FB3 `rPref`).
- HT2 `selectTarget` 262-263, the candidate gate next to `util.gateOpen`: `&& !(B.en && !B.en.gateOpen(tr))`.
- HT3 `selectTarget` 373, next to `util.pickTarget`: `if (B.en) pick = B.en.pickTarget(pick, cur, candBuf)`.
- HT4 `losingRaw` 440, before the pulse line: `if (B.en && B.en.live()) return B.en.losing()` (FB1 replaces it in SQUAD).

firecontrol.js `run()`
- HF1 158: `const hold = B.holdFire || (!!B.sv && B.sv.holdFire())`.
- HF2 reload block 369-378: `ra = B.en ? B.en.reloadAmmo(ra) : ra`.
- HF3 object-shot branch (`B.shootCrate`): `if (B.fm) B.fm.crateShot(lz)` (FB7 one-beam crate).
- HF4 gun trigger gate: `&& !(B.sv && !B.sv.pokeOk(hitP))` (FB5 no low-chance pokes while regen runs).

economy.js
- HE1 `chooseLoot` 110, per item: `if (B.fm && !B.fm.lootOk(item)) continue`.
- HE2 `chooseGrab` 200, end: `if (B.sv) B.sv.grabWant()`.
- HE3 `chooseDrop` 256 / `dlUpdate` 297, end: `if (B.sv) B.sv.dropWant()`.
- HE4 `pick` 472-473: `const order = B.fm && B.fm.live() ? B.fm.pickFB(offer, base) : base`.

Each module exposes `live()` = `P.<x>On === true && B.env !== 'FFA' && hunt.firewall()`, computed once in its `pre()`; every
hook method returns the neutral value (false / its argument) when not live.

### 3.4 Merge order

1. I0 (integrator): trunk + variant table + all hooks + `modesel.js` with rails only + empty module stubs. Gates G1, G1v, G2, G5.
2. E-B `survive.js` (largest stake, FB4; produces `B.regen`, which the other two read).
3. E-A `engage.js` (`B.ft`; FB1 + FB3 together, FB2 last and alone).
4. E-C `farm.js`.
5. Integrator: utilities of 2.3 on (`mode: 'util'`), then the `VARIANTS` letters (one letter per bundle to be measured).

Each step rebases on the trunk and reruns its gates plus G1 for the whole tree. Because an engineer edits only their own
file, block and test, steps 2-4 cannot conflict textually; the order matters only for the gates and for who reads whom.

## 4. Test plan (per module, same five gates)

Tools already exist in `fable_work/chaos/tools`: `idb.sh` + `idcmp.mjs` (27 recordings per SELECT), `test_tf2.mjs`,
`test_switch.mjs`, `test_chaos.mjs` (scene builders), `simb.sh` (24 squad seeds), `mkbuild.sh` (bundle + conformance on
`base` and `v3dir`). All recordings run with `fuseMs: 1e9`, as in the switch build log.

| Gate | What | Pass |
|---|---|---|
| G1 identity off | `TAG=<step> LIB=<tree>/lib SELS="DEF KS KB FNV" idb.sh`, compared with `id/old` | 108/108 byte-identical |
| G1v variant identity (I0, and after every VARIANTS edit) | `test_variant.mjs`: for slot 0-15 and chars `''`, `0`, `1`, `2`, `3`, `5`, `K`, `z` the action stream on kit (300) and long4800 equals `variants7/MX_base/lib` with the same `saltTable`; `JSON.stringify(P)` equal apart from the two new keys; every `VARIANTS` select entry is in `FW_PRESETS`; built bundle with table all `1` = 300/300 on the kit stream | all equal |
| G2 T-F2 | preset on, `env: 'ffa'`: FFA-inert set (kit + ffa_s1-4 x auto / forced, sims 411-414) against the old value; a declared letter under forced FFA against the same salt without the letter | byte-identical |
| G2b firewall drop | synthetic foreign death at decision k with a letter live: afterwards `P` deep-equals `Pbase`, `B.sub === ''`, every `live()` false, no module counter moves | all true |
| G3 triggers | one synthetic scene per rule: fires in SQUAD (its counter moves, action differs from off), not in forced FFA, not after one foreign death; modesel: each state reachable, each rail, each latch / timeout / lockout, `uDwellBreak` 0 | all PASS |
| G4 sim sanity | `simb.sh <tag> <lib> '"<preset>":"on"'`, 24 seeds | errors 0, fuse 0, reach counter > 0 in at least 6 matches, mode switches per minute <= 2x base, kills not below base - 5 (24 seeds cannot separate a few kills: sanity, not a result) |
| G5 conformance | `mkbuild.sh` | PASS on `base` and `v3dir`; decision time on the kit stream not above the base by more than 10% |

Module specifics for G3: E-A `ft` numbers against hand-computed cases (tKill, tDie, `ok` with 1 / 2 / 3 shooters, `finish`
at 1.6 s), `rPref` steps, reload rule; E-B regen clock (`at`, `lost`), hold-fire entry / release at 80% / 12 s / line opening,
drop trigger and latch, grab distances, reposition 3 s cap and 4 s lockout; E-C crate beam gate, farm thresholds, pick
overrides (plating first, `laser_damage` over armor with a laser).

## 5. Open points for the moderator

- `tree` or `tree2` as the trunk (tree2 = tree + alpha + fast75 + its firecontrol / mover edits).
- V-guard default on: it makes a variant strictly safer than the same presets baked into SELECT, so a CH1 letter and a CH1
  SELECT build can differ after the firewall drops if a non-firewalled value is ever selected. With `FW_PRESETS` only, they agree.
- HT4 changes what the legacy shadow sees as LOSING while engage is live; that is intended (FB1), but it is the one hook that
  alters legacy state rather than adding beside it.
- The one-submission check of 1.5 (all-`1` table must score 258) costs one practice slot.
