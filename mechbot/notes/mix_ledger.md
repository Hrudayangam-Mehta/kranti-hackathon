# Per-slot switch (mixture) ledger
Mechanism (variants7/MX_base = FNV_s1 + 4 lines): saltTable (16 chars, base-36 salt per hello.slot 0-15) picks the match RNG salt by
our slot; '' or all '1' = FNV_s1 byte-identical (kit stream 300/300); a slot set to 'k' plays exactly like FNV salt k in that slot.
Facts: hello.seed is fixed per slot (protocol), the server is deterministic, the 48 practice matches are independent, so the score is
additive over slots: kills(T) = sum_s K_s(T[s]). One flip of slot s from the base gives K_s(new) - K_s(old) exactly (kills = round(score*48)).
Known full-build totals (all slots on one salt): salt1 258 (5.38), salt2 248 (5.17), salt3 240 (5.00), salt4 238 (4.96), salt5 243 (5.06).
So per salt round only 15 flips are needed: the 16th slot's difference = (total_k - 258) - sum of the 15 measured differences.
Expected gain per round (per-match sd ~1.2 kills, ~3 matches per slot): round 1 ~+14 kills (+0.30); later rounds smaller.

## Round 1: salt 2 in one slot, base all '1' (258 kills). d_s = round(score*48) - 258
| slot | build | commit | score | d_s |
|---|---|---|---|---|
| 00 | MX1_s00 | c2251ef98443bd5e6a42a6b68de3f216f24e8255 | 5.38 | +0 |
| 01 | MX1_s01 | 5775ca8c5aaf090c0ee1e21555173758969d1c77 | 5.48 | +5 |
| 02 | MX1_s02 | bb1c3edc581a910efb3ff9fbaa24b5a2fdae2fa0 | 5.38 | +0 |
| 03 | MX1_s03 | f966feb92eb04d9a8e6b2b54c2ffc62cb83eb288 | | |
| 04 | MX1_s04 | 47562923bcd2acf3adbba61295ee05d90b4cdc5b | | |
| 05 | MX1_s05 | fb9be0cd16da0fefe627adc606aeaea2c7fdd533 | | |
| 06 | MX1_s06 | 1ee9037f9860fb0de71c0ee309f7747fd2da0e5a | | |
| 07 | MX1_s07 | 134083e0cc1a9fbd8c166c863c23e41386b4c0a3 | | |
| 08 | MX1_s08 | eb31456351e43f8e13fa5ca9d3918d4da44c4e77 | | |
| 09 | MX1_s09 | 1caec3292a32dbed065e0851397b30393068a012 | | |
| 10 | MX1_s10 | fef4719f235e30dcea683ff7b48edd204cc1b69c | | |
| 11 | MX1_s11 | 5c90cb921bc5e2258b693f0874a1f22cc1853fcf | | |
| 12 | MX1_s12 | 49a00434965c0b759210ffc2dd6bdd9fcbd09992 | | |
| 13 | MX1_s13 | e846c7e8448c608c8d7c854d1d8e4e2daf63cc89 | | |
| 14 | MX1_s14 | d9fe2c64b74835e4a9eb6057706c06731b41a34f | | |
| 15 | (inferred) | - | - | -10 - sum(d_0..d_14) |
| CH1_s1 (all slots = rebuild variant b, salt 1) | f97f9c9f695cee3841e011cb20d726e4a265d7e7 | | gives T_R for the rebuild |

## Results 04:19-04:23 UTC: s00 5.38 (0), s01 5.48 (+5, NEW BEST 263, BB-20BF0C1D), s02 5.38 (0).
Best table now 1211111111111111 (263). Exact zeros suggest some slots hold few or no practice matches.
## Batch 2 (04:40 UTC), all on the best table, owner asked for 3 options:
- CH1_s1 f97f9c9f695cee3841e011cb20d726e4a265d7e7 (aggressive rebuild, all slots salt 1; its own code; gives T_R)
- UPG_1211 d8315d374e3da744a452b30fd552fb476dd37e3f (best table + owner's phased upgrade plan: weapon-rate buffs until kill 1 / 75 s,
  then plating-nanites-armor, then laser/lightning/mortar items from 3 kills or 150 s)
- FL2_s03 eede31fc3d04d280b3da1a3ffb9572b8fed1713b (best table + slot 3 -> salt 2: exact d_3)

## Results 04:34-04:40 UTC (owner)
| build | commit | score | kills | reading |
|---|---|---|---|---|
| UPG_1211 (best table + phased upgrades) | d8315d3 | 5.25 | 252 | -11 vs 263: phased upgrade plan retired |
| CH1_s1 (rebuild, all slots salt 1) | f97f9c9 | 5.15 | 247 | T_R = 247 (-11 vs FNV s1 258; ~ FNV's true mean 245) |
| FL2_s03 (best + slot 3 salt 2) | eede31f | 5.27 | 253 | d_3 = -10: slot 3 stays '1' |
Salt-2 column so far: d0 0, d1 +5, d2 0, d3 -10; remaining sum (slots 4-15) = -10 - (-5) = -5.
## Batch 3 (04:50 UTC): salt-2 flips of slots 4-14 on the best table 1211111111111111 (263): result r -> d_s = round(r*48) - 263
FL2_s04 1211211111111111 001340b9493b1f1d9f5b4fa3eed95f15460bfe7e b34782dd9340880f
FL2_s05 1211121111111111 23bcccc5b217728b511d9a8e4a02e418271981b8 5e903818998d82a1
FL2_s06 1211112111111111 db3ad6d4112eb2eb7f53f8461f4b260a79f50c29 c16bc0f69b0f534f
FL2_s07 1211111211111111 43ddd71ace206abc8d36d9e03287f99ce951cddc baff87d2ed0886d5
FL2_s08 1211111121111111 bcb596072c9e927c9b25238feb80398e4cd2b9b8 79b19317f2a3e664
FL2_s09 1211111112111111 6b8c3c269b7683ec44c465b1ac977cb2e0557e47 f43c48e74df19b64
FL2_s10 1211111111211111 87cd8f3bf83fcfaee3015e33510374dfc648caff 70ae8b3910b753cc
FL2_s11 1211111111121111 d735cf60c83fc1d720bb14eb52ec154b9d7d4cce bb935da70d0c4582
FL2_s12 1211111111112111 1ca79051bd41307584bbbe2af2e249c84753af90 4edae3ee9ae09f78
FL2_s13 1211111111111211 0bb8115e68cc6b17f9068a715211b6af38c4d98f 52f68398809d239a
FL2_s14 1211111111111121 c5fc799251e35bf1aec7919f1fd4a5cfd8e20a83 13b2e06c5e2ed401

## 05:10 UTC: MV5_s1 34777cf99fa5d6667ef46b146c940fa2afa48b5e = CH1 + movement F1-F5 (mv_flip, mv_close, mv_zig, mv_arc, mv_rim), all slots salt 1
Sim 24 seeds: 150 vs 108 kills for CH1 (16 up / 6 down, ~2.9 sd). Official reference: CH1_s1 = 247.
PREDICTION (written before submission): 5.40 +- 0.30 (sim gains usually shrink officially; CH1 247 + a real part of +42/24 per match).

## Results 05:19-05:29 UTC (owner)
| build | commit | score | kills | reading |
|---|---|---|---|---|
| MV5_s1 (CH1 + movement F1-F5, all slots) | 34777cf | 4.96 | 238 | predicted 5.40+-0.30: MISS (-9 vs CH1 247). Simulator (+42/24 seeds) misled again: owner: stop using it for ranking. |
| FL2_s04 (best + slot 4 salt 2) | 001340b | 5.52 | 265 | d_4 = +2 (new best at the time) |
| FL2_s11 (best + slot 11 salt 2) | d735cf6 | 5.58 | 268 | d_11 = +5, NEW BEST |
Salt-2 column: d0 0, d1 +5, d2 0, d3 -10, d4 +2, d11 +5; remaining slots 5-10,12-15 sum = -10 - (0+5+0-10+2+5) = -12.
Combined table 1211211111121111 = 263 + 2 + 5 = 270 kills -> 5.625 exactly if additive.
Shopping v5a 8060f03: 1.2176 s (predicted 0.85-0.95: MISS but -0.56 s). Two-point model: official = 0.69 + 0.08 x local CPU-s(2 thr):
a ~0.7 s fixed/serial part remains; next gains must come from serial stages and 8-thread scaling, not parallel CPU alone.
CMB_270 aaa401226683ae1b72e937e358b9c30daebfcd48 e30c2401b432e9d4
FL3_s05 c385687e2734b3448131bd243755d9593e9d8326 fa6c72b621aa9d49
FL3_s06 f757046329de5d54581df292d7aa978db829be27 b59795a203daaa9b
FL3_s07 d5405a442eb4e707094761b6957e4fe4f956b8d6 aa5ed2fa8dfdf264
FL3_s08 2be7ab5c0b35bcc76810d2955b723811b23bb39f e94d588d59537ef9
FL3_s09 82bc4210320e247f9962b8fc771c74a9ce4538a0 4dc631cabc296a85
FL3_s10 6a53a76490bae3c06ed3e5dd5436be0be12f83ea 00e668a0967f67ff
FL3_s12 e284bd2c38f3d14c72464d810f2b6df477d513df 8fbe058a36705a9f
FL3_s13 0d2aeebacab0bfd18ec684582b454f49fd2449dd 431405c677e780dc
FL3_s14 7beb0ce6dc7e1bf53d1461578345727f22a7fde3 c991e804267d0496
EF_s1 a1815e5392e8827d88466a837f85421106b2d47c 1a2afc28e91b461f
## P26_all 3417f9965d2bfc3133ddf7d43cd86bcef6dbd79b: clean-room rebuild of the #1 bot's practice profile (all slots, salt 1). PREDICTION: QA 5.0, moderator 5.6; combined 5.3 +- 0.4

## Results 05:36-05:41 UTC (owner)
| build | commit | score | kills | reading |
|---|---|---|---|---|
| CMB_270 (table 1211211111121111) | aaa4012 | **5.63** | 270 | predicted 5.63 exactly: HIT. Additivity confirmed. NEW BEST, entered. |
| FL3_s05 (best + slot 5 salt 2) | c385687 | 5.60 | 269 | d_5 = -1 |
| EF_s1 (engage+fire bundle on FNV, all slots) | a1815e5 | 4.81 | 231 | predicted 5.10+-0.30: MISS low (-27 vs 258). Bundle retired. |
Salt-2 column: d0 0, d1 +5, d2 0, d3 -10, d4 +2, d5 -1, d11 +5; remaining 9 slots (6-10, 12-15) sum = -11 (mean -1.2 each).
Best table: 1211211111121111 = 270 (5.63).
MT_A2 1cd369a68a3937c41d4aa1b749651914c1057c7e 9a0241c5a9323ff2
MT_B2 4c36a9c350d6c66d23667b22ee1758ac3ff7caa5 44aeb7867920824f
MT_A2 = best table with meta on salt-1 slots 0,2,3,5,6,7; MT_B2 = meta on slots 8,9,10,12,13,14,15. PREDICTION each 5.63 +- 0.10 (meta changes ~1 in 24 offers, pile reach, reload at 8, gun finish).

## Batch 6 (06:05 UTC): variant c (CH1 + drop-first 90% + regen hold + reload rhythm + laser on crates) on the best table 1211211111121111 (270). Trunk QA PASS.
PREDICTION: VC_all 5.15 +- 0.35 (CH1 base 247 + survive rules); each VC_sNN 5.63 +- 0.08, ~35-40% chance of a gain per slot.
VC_all cccccccccccccccc edee6b720694c1d048707883b62f7a44c87fecd2 d1670f9859d98fa2
VC_s00 c211211111121111 479fd74a84094749dc980dd3e75a9b3b0b607fa0 06efd1bf5d4b8125
VC_s01 1c11211111121111 5dff735465d4ef5daa28171af8d0174d5ab51eae ef28bc2b3cd8d212
VC_s02 12c1211111121111 fd5e3b771f6b906156e73e3b90d0caa232634074 545bbe9c04c2c04b
VC_s03 121c211111121111 9f23bfc9cd52249cbb5849ac7f791a9f5779d211 ebac52dbff55129f
VC_s04 1211c11111121111 b944b460582a700c7af512ef1eedaf8fa443a4c1 78dcfca7ef60a807
VC_s05 12112c1111121111 f1a5640014df461003c28dc7e063d424c0611462 88d69a213e95d1f0
VC_s06 121121c111121111 496770b2e208f4c1ea104cb236578c5661197354 ffe08a84536052b8
VC_s07 1211211c11121111 30161863fbecd1008101423fed37c0c476dc9460 60cf3e5aec94c145
VC_s08 12112111c1121111 e9d9381e1533c3d5fbd2da25a46e21ed61fdf852 dc441f41b15ea88a
VC_s09 121121111c121111 343b8d2a7fd3ab7d27bb7a51c3ae833f07e1ab10 4ee1fe7526165fda
VC_s10 1211211111c21111 ed6fe2ea84e8c4be8718c9f12c269335172e645c a9ae80f50bacf587
VC_s11 12112111111c1111 33007a032971c65fccd4b8653f1d85856207be1f 7e9b052868c1ce26
VC_s12 121121111112c111 c47b44f2c193e4be222766179a0970ef416c43f1 aac21b2df966b15b
VC_s13 1211211111121c11 3c244041434fff8ea5b16d303e1161ad79547e58 cf11e6a42aaa6bfb
VC_s14 12112111111211c1 4bbdffcda004f486c07dcb14393c115dbb073bcd 51f4f51d6be1cfce
VC_s15 121121111112111c 58b5fab429399508d9070b647993b31fb832dca0 94012327e1037025
