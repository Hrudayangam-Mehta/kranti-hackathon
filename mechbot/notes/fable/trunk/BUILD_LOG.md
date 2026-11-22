# Trunk build log (engineer T), Sun 22 Nov 04:40 UTC

One author, no independent review. S = the session scratchpad. Trunk tree: `S/fable_work/trunk/trunk/tree` (freeze
`S/fable_work/trunk/trunk/tree_freeze_v1.sha256`; brain.js cd8cbd19..., params.js 44609521...).

## What the trunk is
- A copy of `fable_work/chaos/builds/CH1_s1/bot`. Its default SELECT is set back to the FNV 5.38 SELECT (laserRange far, farmHp 90,
  focus mult, upg std, laserGrab std, upgFix off, cubes off, boostCharge off, cratePath std; every other switch / chaos preset was already
  at its old value), salt 1. `resolveParams({})` equals MX_base on every MX_base key; the extra chaos keys are at their inert defaults.
- Variant table (architecture.md 1.1-1.4). params.js: `saltTable: ''` (the same line as MX_base, so `variants7/mkmx.sh`'s sed works),
  `variantTable: ''` (read first when 16 chars), `variantRevert: true`, exports `VARIANTS`, `FW_PRESETS`, `resolveVariant`.
  brain.js createBrain: V = resolveVariant(P0, hello.slot); a declared letter applies its select over the overrides only when
  `P0.env !== 'ffa'`; seed from `saltHash(V.salt)`; B gets `variant`, `variantLive`, `sub`, `rng2`, `variantKeys`. V-guard: own stage just
  before 'assess'; on the first decision with `hunt.firewall()` down it writes the base values back into P in place and clears
  `B.lgsOn` / `B.lgsSweep` (written only by economy.lgsUpdate while P.lgSpawn is on; without the clear they stay true for the rest of the
  match: control run `ctl_noclear`, 119 of 300 kit decisions).

```js
export const VARIANTS = Object.freeze({
  b: Object.freeze({ name: 'CH1', salt: 1, select: Object.freeze({ laserRange: 'midsq', farmHp: '50sq', focus: 'kill', upg: 'laser', laserGrab: 'spawn',
    cubes: 'snow', boostCharge: 'on', cratePath: '80', upgFix: 'on' }) }),
  c: Object.freeze({ name: 'CH1c', salt: 1, select: Object.freeze({ laserRange: 'midsq', farmHp: '50sq', focus: 'kill', upg: 'laser', laserGrab: 'spawn',
    cubes: 'snow', boostCharge: 'on', cratePath: '80', upgFix: 'on' }) }),
})
```

## Gates (all with fuseMs 1e9 on both sides, nice 19, at most 2 jobs; records in `S/fable_work/trunk/trunk/id`)
| Gate | Result |
|---|---|
| G1v native slot 3: tables '', 1x16, 2x16, 1112..., 16 one-slot flips; kit auto/squad/ffa, long4800 auto/squad, long11 / long23p (named tables) | 108/108 byte-identical to MX_base |
| G1s hello.slot rewritten to s, salt 2 in slot s: kit auto/squad, long4800 auto | 48/48 identical; every flip acts (48/48 differ from all-1, equal to all-2) |
| G1x slot 3 = 0 3 5 9 A K Z a d z (kit, long4800) | 20/20 identical |
| diff_stream (baked tables, production defaults): 20 tables trunk vs MX_base; trunk all-1 vs FNV_s1/bot | 21/21: 300 decisions, differ 0 |
| Baked MX tables F00-F14 vs round-1 builds `variants7/MX1_sNN/bot` | 15/15 identical trees |
| 'b' in slot 3 vs CH1_s1: kit auto/squad, long4800, long11, long23p (recv) and diff_stream (baked) | all identical (guard fires: kit decision 182, long streams 2501) |
| T-F2 'b' (all slots b) forced FFA vs all-1: kit, ffa_s1-4, sims 411-414 | 9/9 identical (and trunk all-1 = MX_base all-1) |
| info: sims 411-414 env auto (FFA match, variant live until the firewall drops) | all-b = CH1_s1, 4/4 |
| test_variant.mjs (U1 4140 char x slot x env cases: seed + P vs MX_base / CH1_s1 / salt-1 base; U2 FW_PRESETS; G2b) | PASS 16653, FAIL 0 |
| Conformance base + v3dir: TRUNK_s1 (table ''), TRUNK_T1 (1x16), TRUNK_B3 (111b...) | 6/6 PASS; p50 equal to an MX1_s01 run at the same load |

Bundles: TRUNK_s1 9a80edee..., TRUNK_T1 8f622bd6..., TRUNK_B3 42d59cd7... (`S/fable_work/trunk/trunk/builds`). Not submitted.
Not done: G1 against id/old for DEF/KS/KB (the trunk's default SELECT is FNV, so DEF no longer means the old base); sims of 'b'.
