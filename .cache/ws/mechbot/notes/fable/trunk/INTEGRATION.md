# Trunk integration (integrator), Sun 22 Nov 2026, pass 2 record (supersedes the 05:30 UTC pass-1 record)

One author (the integrator), no independent review. S = the session scratchpad
(`/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad`). Nothing was submitted; no git,
no server. Frozen directories (variants6, variants7, fable_work/chaos, fable_work/switch, r7work, mechbot/bot, mechbot/sim) were only read.
Every recording and sim: nice 19, `fuseMs: 1e9` on both sides, at most 2 of our own jobs at once (other agents' QA jobs were running on
the same 4 cores; load 5-11 during the runs, which only slows the recordings, never changes them).

Two passes. Pass 1 (05:00-05:30 UTC) built the merged tree, the 17 bundles and ran every gate; its raw outputs are kept under
`S/fable_work/trunk/integ` (`out/cmp_m.txt`, `out/test_variant_m.txt`, `id/m1` = 278 recordings, `id/dslot`, `out/conf`). Pass 2 (this
record, from 05:30 UTC) re-verified every pass-1 artefact by hash, removed two never-imported patch-debris files (`lib/brain.js.orig`,
`lib/params.js.orig`) from the merged tree and from the 17 `bot/` trees, re-froze the tree as v2, rebuilt all 17 bundles (byte-identical),
and re-ran every gate first-hand on freeze v2 (`integ/out/test_variant_m2.txt`, `cmp_m2.txt`, `id/m2`, `id/dslot2`, `out/conf2`,
`out/hygiene2.txt`, `out/rebuild2.txt`). Where pass 1 and pass 2 give a number, section 2 shows both.

## 1. What the merged tree is

`S/fable_work/trunk/trunk/merged` = engineer T's trunk (`S/fable_work/trunk/trunk/tree`, freeze `tree_freeze_v1.sha256` re-checked:
0 mismatches) + engineer S's survive module (`S/fable_work/trunk/survive/tree`, freeze `survive/out/tree_survive_freeze.sha256`
re-checked: 0 mismatches).

- `lib/survive.js`: S's file, byte-identical (e60c6b5a...). `lib/economy.js`, `lib/firecontrol.js`: S's hooked copies, byte-identical to
  S's tree (ae89fdc1..., ab1040a9...). T's trunk carried CH1_s1's unhooked copies of both (e13786a9..., 17147a5a..., identical to
  `S/fable_work/chaos/builds/CH1_s1/bot/lib` and to S's base `survive/ref_ch1`), so S's hooks HE2 / HE3 / HE3b (economy: `grabWant`,
  `dropWant`, `dropLegs`) and HF1 / HF2 / HF3 (firecontrol: `holdFire`, `reloadWant`, `crateShot` + the one-beam crate branch) are the only
  delta and nothing of T's was lost.
- `lib/brain.js` = T's trunk brain.js + S's six hunks (import, HB2 `B.sv = makeSurvive(...)` after `makeUtil` and below T's V-guard,
  HB11 `holdLegs`, HB10 `retreatLegs`, HB12 `boost()` after the boostCharge block, HB4 `sv.pre(obs)` after `B.util.pre()`, HB6
  `sv.post()` after `econ.update()`). `B.sv` is created only when the resolved `P` has an sv switch on (`svDropOn || svRegenOn ||
  svFireOn || svFarmOn`), so a pure salt and `b` never create it.
- `lib/params.js` = T's params.js + S's sv PARAMS block (32 keys, every one inert at its default) + the four sv PRESETS (`svDrop:
  off | first | first100 | timely`, `svRegen: off | hold`, `svFire: off | rhythm`, `svFarm: off | laser`); the SELECT line keeps T's FNV
  values and adds `svDrop: 'off', svRegen: 'off', svFire: 'off', svFarm: 'off'` before `healDoc`; `FW_PRESETS` gains the four sv entries.
- `VARIANTS.c` redefined (it had never been measured; it was `= b` as the integrator's open slot). `b` is unchanged. Verbatim:

```js
  b: Object.freeze({ name: 'CH1', salt: 1, select: Object.freeze({ laserRange: 'midsq', farmHp: '50sq', focus: 'kill', upg: 'laser', laserGrab: 'spawn',
    cubes: 'snow', boostCharge: 'on', cratePath: '80', upgFix: 'on' }) }),
  // 'c' = CH1 ('b') + engineer S's four survive presets (lib/survive.js), salt 1; first defined by the integrator (round 1b)
  c: Object.freeze({ name: 'CH1sv', salt: 1, select: Object.freeze({ laserRange: 'midsq', farmHp: '50sq', focus: 'kill', upg: 'laser', laserGrab: 'spawn',
    cubes: 'snow', boostCharge: 'on', cratePath: '80', upgFix: 'on', svDrop: 'first', svRegen: 'hold', svFire: 'rhythm', svFarm: 'laser' }) }),
```

  `svDrop: 'first'` is the 90% value (`svDropHpf: 0.9`). `c` carries no FB6 grab rule: S's `grabWant()` is a neutral stub ("not in this
  module yet"), and the task defined `c` as the four presets. Coach-spec coverage of `c`: FB4 (drop first), FB5 (regen clock + hold fire),
  FB7 (one beam on a crate) and S's extra magazine rhythm; not FB6.
- Rule compliance of `survive.js` (read in full): `live()` = `B.env !== 'FFA' && hunt.firewall()` computed once per decision in `pre()`;
  every `P.*` read at call time; no `B.rng()` call anywhere; every hook returns its neutral value when not live; `dropUpdate()` clears its
  own `B.dl` before testing `P.svDropOn`, so the V-guard's in-place revert disarms the drop latch on the same decision (confirmed by G2b).
- Identity guarantees kept: with a pure-salt character `V.select` is null, `P` is the plain `resolveParams(ov)`, `B.sv` is never created
  and `resolveParams({})` equals MX_base on every MX_base key (U1 "P" and "extra keys inert" checks, 0 failures). The merged tree's
  `warmUp` and `anchorToConfig` paths are T's, untouched.
- Freeze v2: `S/fable_work/trunk/trunk/merged_freeze_v2.sha256` (22 files; = v1 minus the two `.orig` lines, nothing else changed):
  brain.js ce7901ffd932039d..., params.js 8d8039f8d7eaab32..., survive.js e60c6b5aba34efea..., economy.js ae89fdc1bdcc4610...,
  firecontrol.js ab1040a9a63e470c..., bot.js 52434280606ee29c... (= CH1_s1), Dockerfile e04b4bec72c9507a... (= FNV_s1 dist). All pass-2
  gates ran on this freeze; the pass-1 gates ran on v1, which differs from v2 only by the two never-imported files.

Reference sides: MX_base and CH1_s1 recordings are engineer T's (`S/fable_work/trunk/trunk/id/g1v`, `g1v_b`, same recorder `recv.js` =
chaos `recs.js` + `hello.slot` rewrite); the `c` reference is SV4 = S's tree with the four presets in SELECT
(`S/fable_work/trunk/survive/builds/SV4/bot`); sim references are S's ALL4 run and the chaos FNV-base / CH1 sims.

## 2. Gates

| Gate | What | Pass 1 (freeze v1) | Pass 2 (freeze v2, this record) |
|---|---|---|---|
| U1/U2/G2b | `integ/tools/test_variant_m.mjs`: 4320 char x slot x env x key cases (seed draws + `P` vs MX_base / CH1_s1 / SV4 / salt-1 base; `B.sv` iff `c`); every VARIANTS entry in FW_PRESETS and a real PRESETS option; `c` = `b` + four sv; guard on the kit stream for `b` and `c` | PASS 17535, FAIL 0 | PASS 17535, FAIL 0. Guard fires at decision 181 (firewall down at 180) for both; afterwards `P` = base, lgs flags clear, never returns; `c`: sv not live, no sv counter moves, no `B.dl` of ours, no hold |
| G1v | slot 3, tables '', 1x16, 2x16, 1112..., F00-F15; kit auto/squad/ffa, long4800 auto/squad, long11 / long23p (T0-T3): merged vs MX_base, same table | 108/108 byte-identical (and 108/108 = T's trunk) | PENDING_G1V |
| G1s | hello.slot = s, salt 2 in slot s: kit auto/squad, long4800 auto, merged vs MX_base | 48/48 identical; every flip acts (48/48 differ from all-1) | PENDING_G1S |
| G1x | slot 3 = 0 3 5 9 A K Z a d z (kit, long4800), merged vs MX_base | 20/20 identical | PENDING_G1X |
| VB | `b` in slot 3 vs CH1_s1/bot: kit auto/squad, long4800, long11, long23p | 5/5 identical (guard at kit 182, long 2501) | PENDING_VB |
| VC | `c` in slot 3 vs SV4: kit auto/squad, long4800, long11, long23p; all-`c` vs SV4 on ffa_s1-4 env auto | 9/9 identical; sv rules act before the guard | PENDING_VC |
| T-F2 | forced FFA: all-`b` and all-`c` vs merged all-`1` vs MX_base all-`1`; kit + ffa_s1-4 streams, sims 411-414 (`env: 'ffa'`) | 9/9 + 9/9 + 9/9 identical | PENDING_TF2 |
| info | env auto on ffa_s1-4, all-`c` vs all-`1` | differ 47/1135, 119/1619, 64/1578, 21/312 decisions, all before the guard | PENDING_INFO |
| G4 sim | 24 squad seeds, merged table all `c` (sanity only: the owner has ruled the simulator out for ranking) | kills 108 (mean 4.50), errors 0, fuse 0, maxMs 141; 24/24 action hashes = S's ALL4; vs CH1 (108) 3 up / 4 down | PENDING_SIM |
| sim identity | 24 squad seeds, merged table all `1` vs the chaos FNV-base sim | 24/24 identical hashes, kills 95 = 95 | PENDING_SIMT1 |
| baked sources | `integ/tools/dslot.mjs` (kit stream, hello.slot rewritten): R1B_c_sNN at slot NN vs SV4, at slot NN+1 vs FNV_s1/bot; R1B_all_c at slots 0 and 3 vs SV4; control R1B_c_s03 at slot 3 vs FNV | 34/34 differ 0; control differs 47/300 | PENDING_DSLOT |
| bundles | fresh `bun build` of every `bot/` vs the shipped `dist/bot.js` | 17/17 byte-identical | 17/17 byte-identical after the `.orig` removal (`out/rebuild2.txt`); the 17 bundles differ from each other only inside the one 16-char table literal (at most 15 bytes, offsets 37258-37273), `saltTable` empty in all |
| G5 conformance | kit check.py (1-CPU quota group) on `base` and `v3dir`: R1B_all_c and R1B_c_s03; FNV_s1 dist as timing reference at the same load | 4/4 PASS; p50 0.5-0.6 ms vs FNV_s1 0.7-0.8 ms | PENDING_CONF |
| hygiene | REPO_HYGIENE.md word check (release_gate `OWNER_RX`, case-insensitive, word boundaries) on all 17 dists; hygiene.py H3 team names, H4 scores, H5 comments, H6 paths; dist file set; Dockerfile = FNV_s1's, bun tag = local bun | 0 hits on 17/17; H3-H6 PASS on 17/17 | 0 hits on 17/17; H3-H6 PASS on 17/17; files = {Dockerfile, bot.js}; Dockerfile FNV-identical, tag 1.4.4 = local 1.4.4 (`out/hygiene2.txt`) |

Hygiene notes: hygiene.py's substring H2 flags `headExposure` ('osu' inside 'exposure'), as it does on the FNV_s1 dist; REPO_HYGIENE.md
itself says the word-boundary grep is the gate and identifiers such as "exposure" must not trip it, and that grep prints nothing. H1 /
H7 / H8 fail only because these dists hold bot.js + Dockerfile (LICENSE and README are added at push time). H9 is the owner's accepted
waiver; the trunk adds two log sentences (variant live / off) to the bundle's strings.

## 3. Round-1b bundles (`S/fable_work/trunk/r1b/<name>/{bot,dist}`)

Source = the merged tree (freeze v2) with `variantTable` baked by `sed "s/^  variantTable: '',$/  variantTable: '<16>',/"` (architecture
1.5, the same sed as round 1's `variants7/mkmx.sh` but on the `variantTable` key, which is read first when it has 16 characters);
`saltTable` stays ''. A `variantTable` bake and a `saltTable` bake mean the same thing (U1 runs every case on both keys). Bundle:
`mechbot/bun build <bot>/bot.js --minify --target=bun --outfile <dist>/bot.js` (bun 1.4.4); Dockerfile = `variants6/FNV_s1/dist/Dockerfile`
(e04b4bec72c9507ac9d199714e2e1b4c9b6537a9f986249d6be6aa4f90d52c1a). Every bundle is 254485 bytes. Full list with Dockerfile hashes:
`S/fable_work/trunk/r1b/R1B_HASHES.txt`; build log `r1b/BUILDS.txt`.

| name | table | dist/bot.js sha256 |
|---|---|---|
| R1B_all_c | cccccccccccccccc | 7029cfafc8a0e2a1ce29dfc3aa891776c40e3d8549459618809f9b6c15d82327 |
| R1B_c_s00 | c111111111111111 | 9646d8dd3cea95184ec6fadf2e3676e4187d90dcabcca36e809dc7968138f390 |
| R1B_c_s01 | 1c11111111111111 | c2e6ffb4f9cae13d9c9c9e8c24a7da67b906bd458b3f244b540e6526121fe728 |
| R1B_c_s02 | 11c1111111111111 | c7b412d1787750f146b21d17d998c0dca632ffe3e7370aa7db7eb8d2ffc17a13 |
| R1B_c_s03 | 111c111111111111 | 4543ccd4151b172ea670670c89681c4be48168fefd7847f88733c4ce242e2ebe |
| R1B_c_s04 | 1111c11111111111 | 57eab539387f70a0eaefe051bee669172c076798fa0e865e457274e2cfa74164 |
| R1B_c_s05 | 11111c1111111111 | 4685e111554b4bc5889000e119d858c700a9efec5b1617ac9985b6703e291984 |
| R1B_c_s06 | 111111c111111111 | 43b867c912246337c00592f2dd1dbcfcf3e9c2830cb694bb93e0283dd2d23dfe |
| R1B_c_s07 | 1111111c11111111 | 25e3fc0a2fbaaab8a8d5c162f3338d76edfb98f96f9484df76f5bc3e349e68de |
| R1B_c_s08 | 11111111c1111111 | dec6b8d75e0a57d4897c76bc3ef1c2d3728f28f4ed98c03125c143574b7eab60 |
| R1B_c_s09 | 111111111c111111 | b598528d4acacf3a318eee7365354b6734d352b8cf8a6743ca20d7269492e522 |
| R1B_c_s10 | 1111111111c11111 | afbf3be3d671e914b5939b5303f19943fd03514b03c0c55a246071eaa1eb3226 |
| R1B_c_s11 | 11111111111c1111 | 0dd4f0150c3e7dd58e8a9433dcc08bb0a343c237f13af1787db84ba42420602e |
| R1B_c_s12 | 111111111111c111 | 75e7a7f5e502038c00ce6377bfb4b22de0b2198da70ebe012811f6b191d2b5f1 |
| R1B_c_s13 | 1111111111111c11 | 19f96fe78ae353f6782c7bd434cdb4dadd659e800e5a3bdddcb2e5de662c1511 |
| R1B_c_s14 | 11111111111111c1 | eb7399ba36c11d7dd2cc219e8696427ee1e191a839451af586aa38f4b66ca693 |
| R1B_c_s15 | 111111111111111c | fcc07df383d61f5cd9fd3edb1f7c8a83ab21875c853f4884e90163778e6ebbdc |

Reading a result: the base of these flips is all '1' (258 kills), so d_s(c) = round(score x 48) - 258 for R1B_c_sNN, and R1B_all_c gives
the whole-build total of `c` (comparable with CH1_s1's 247 and FNV's 258). The ledger's current best table is 1211111111121111 (268;
1211211111121111 = 270 if additive). With additivity a `c` flip measured on the all-'1' base transfers to the best table for every slot
except the ones whose character differs between the two tables (slots 1, 4, 11); a flip set on the best table would be a different set
of bundles (same `bot/` tree, table `1211...` with slot s = 'c'), one `mk_r1b.sh` call each.

## 4. For the moderator (unmeasured, stated plainly)

- `c` is built on CH1, and CH1_s1 scored 247 officially (-11 vs FNV 258). In the 24-seed sim `c` equals CH1 in total (108 vs 108), and
  the owner has ruled the simulator out for ranking, so the sim says only: no errors, no fuse, kills not collapsing, every sv rule
  reached in some match. The per-slot flips measure `c` exactly; R1B_all_c measures its whole-build total in one submission.
- The drop rule is 'first' (90%), as asked. In S's mechanism runs with earlier drops (config drops at 30 / 55 / 80 s) 'first' cost about
  12 kills (89 vs 101 base) and S's extra value 'timely' cost 0 (101; timely + the other three 105). In the default sim the drop rule
  fires in 4 of 24 matches. If the server drops earlier than our sim, a `d` = `c` with `svDrop: 'timely'` is the safer letter; it would be
  a new letter (`c` is never redefined once a `c` bundle has been submitted).
- `c` is live only until the firewall drops (kit stream decision 182, long streams 2501, ffa streams 187-256, the `base` conformance map
  at t = 18.1 s). After that the base parameters apply, but the state (position, hp, loadout) does not return to what the base would have
  had.
- Digit and UPPER-case characters (and undeclared lower-case letters) remain pure salts on the FNV 5.38 SELECT, byte-identical to
  MX_base with the same table (G1v / G1s / G1x on both passes), so every round-1 measurement stays valid on this trunk.
- Not run: `release_gate.sh` end to end and the LICENSE / README packaging (the pusher's steps; `OWNER_RX`, hygiene.py, the bun-tag check
  and the fresh-bundle check were run here by hand and pass). Not run: S's `test_survive.mjs` on the merged tree (its scenes assume the
  CH1 SELECT as the base; the VC identity, `c` = SV4 on 9 streams and 24 sims, covers the same code in the merged tree).
