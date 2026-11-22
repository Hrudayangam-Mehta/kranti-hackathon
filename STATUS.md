# Status, roadmap and planned submissions (Sun 22 Nov 2026, ~07:00 UTC; cutoff 16:00 UTC)

Read HANDOFF.md first for the method and rules. This file is the live to-do list.
Everything else from the working folder is under `.cache/ws/` (same paths as the old scratchpad root);
`.cache/EXCLUDED.tsv` lists every file that was not pushed, with its size and why.

## Current official bests (final picks entered)

| Track | Best | Commit | Branch | Note |
|---|---|---|---|---|
| Mech Royale | 5.63 (270 kills / 48) | aaa401226683ae1b72e937e358b9c30daebfcd48 | main (history) | table 1211211111121111; entered as final pick |
| Shopping Sessions | 1.2422 s | 8d0ea211277f158cb5cc12e8dc16bb255740325e | exp | afix = A + empty-ID guard; correct build; final pick. (A 8060f03 scored 1.2176 but has the empty-ID defect) |
| Blast Radius | not scored yet | ac61fe622b02510cf4cdbb0e6ad746cbbf356a44 | blast | owner's package; submit and read the score |

Leaderboard context at 03:15 UTC: Mech qualifying line (top 32) 6.19 and rising, #1 6.58. Shopping leaders 0.60-0.70 s. Blast leaders 103-115 s.
Quotas: Mech 6/hour rolling, Shopping 2/hour, Blast 4/hour.

## Mech Royale: planned submissions (all built on the best table, so any gain is a new best)

Score rule for every line: kills = 270 + d_slot. Record d_slot = round(48 x score) - 270 in mechbot/notes/mix_ledger.md.

### Priority 1: salt-2 flips on the untested slots (prediction 5.63 +- 0.06 each; their nine d values sum to -11, so expect 2-3 winners)

| Label | Table | Commit |
|---|---|---|
| FL3_s06 | 1211212111121111 | f757046329de5d54581df292d7aa978db829be27 |
| FL3_s07 | 1211211211121111 | d5405a442eb4e707094761b6957e4fe4f956b8d6 |
| FL3_s08 | 1211211121121111 | 2be7ab5c0b35bcc76810d2955b723811b23bb39f |
| FL3_s09 | 1211211112121111 | 82bc4210320e247f9962b8fc771c74a9ce4538a0 |
| FL3_s10 | 1211211111221111 | 6a53a76490bae3c06ed3e5dd5436be0be12f83ea |
| FL3_s12 | 1211211111122111 | e284bd2c38f3d14c72464d810f2b6df477d513df |
| FL3_s13 | 1211211111121211 | 0d2aeebacab0bfd18ec684582b454f49fd2449dd |
| FL3_s14 | 1211211111121121 | 7beb0ce6dc7e1bf53d1461578345727f22a7fde3 |
(slot 15 salt-2 is implied: -11 minus the eight above.)

### Priority 2: variant c per slot (CH1 + drop-first 90% + regen hold + reload rhythm + laser on crates). Prediction 5.63 +- 0.08 each, ~35% chance of a gain per slot

| Label | Table | Commit |
|---|---|---|
| VC_s03 | 121c211111121111 | 9f23bfc9cd52249cbb5849ac7f791a9f5779d211 |
| VC_s05 | 12112c1111121111 | f1a5640014df461003c28dc7e063d424c0611462 |
| VC_s00 | c211211111121111 | 479fd74a84094749dc980dd3e75a9b3b0b607fa0 |
| VC_s02 | 12c1211111121111 | fd5e3b771f6b906156e73e3b90d0caa232634074 |
| VC_s06 | 121121c111121111 | 496770b2e208f4c1ea104cb236578c5661197354 |
| VC_s07 | 1211211c11121111 | 30161863fbecd1008101423fed37c0c476dc9460 |
| VC_s08 | 12112111c1121111 | e9d9381e1533c3d5fbd2da25a46e21ed61fdf852 |
| VC_s09 | 121121111c121111 | 343b8d2a7fd3ab7d27bb7a51c3ae833f07e1ab10 |
| VC_s10 | 1211211111c21111 | ed6fe2ea84e8c4be8718c9f12c269335172e645c |
| VC_s12 | 121121111112c111 | c47b44f2c193e4be222766179a0970ef416c43f1 |
| VC_s13 | 1211211111121c11 | 3c244041434fff8ea5b16d303e1161ad79547e58 |
| VC_s14 | 12112111111211c1 | 4bbdffcda004f486c07dcb14393c115dbb073bcd |
| VC_s15 | 121121111112111c | 58b5fab429399508d9070b647993b31fb832dca0 |
| VC_s01 | 1c11211111121111 | 5dff735465d4ef5daa28171af8d0174d5ab51eae |
| VC_s04 | 1211c11111121111 | b944b460582a700c7af512ef1eedaf8fa443a4c1 |
| VC_s11 | 12112111111c1111 | 33007a032971c65fccd4b8653f1d85856207be1f |

### Priority 3: meta halves and whole-build reads

| Label | What | Commit | Prediction |
|---|---|---|---|
| MT_A2 | best table + gaming meta on salt-1 slots 0,2,3,5,6,7 | 1cd369a68a3937c41d4aa1b749651914c1057c7e | 5.63 +- 0.10 |
| MT_B2 | best table + gaming meta on slots 8,9,10,12,13,14,15 | 4c36a9c350d6c66d23667b22ee1758ac3ff7caa5 | 5.63 +- 0.10 |
| VC_all | variant c on all 16 slots (level read only) | edee6b720694c1d048707883b62f7a44c87fecd2 | 5.15 +- 0.35 |
| P26_all | clean-room profile of the #1 bot, all slots | 3417f9965d2bfc3133ddf7d43cd86bcef6dbd79b | 5.3 +- 0.4 |

### Mech next steps (in order)
1. Submit Priority 1, then 2, then 3, six per hour. Log each result in mix_ledger.md (predicted vs actual).
2. After each batch, build the new best table: for every slot take the letter with the highest measured d. Package with
   `variants_tools/package_variant_r7.sh`, gate with `mechbot/tools/release_gate.sh` (expect GO 35 PASS, 1 waived), push to main.
3. If MT_A2/MT_B2 gains, split it into single slots. If a half loses, drop the meta line.
4. Last hour before 16:00 UTC: submit the combined best table and pick it as the final entry.
5. Never ship a whole-build behaviour change as the final; whole builds regress to ~245 kills (5.1).

## Shopping Sessions: roadmap

| Step | State | Where |
|---|---|---|
| afix (correct, 1.2422 s) | final pick | exp @ 8d0ea211277f |
| Design C: shape-encoded exact keys + 16-byte records | building; verifier not passed yet | tracks/shopping-sessions/v5c (+ v5c_verify) |
| Engineer D: serial time + 8-thread scaling on afix; huge-page probe | building | tracks/shopping-sessions/v5d (tree, tree_allhuge) |
| Combine C records + D scheduling | not started | - |

Next steps: finish C and D; run the full gate (HANDOFF.md section 3); measure interleaved CPU medians; push the faster passing
build to exp with a written prediction (model: official ~= 0.69 + 0.08 x local CPU-s at NCPU 2). Target <= 4 CPU-s, no serial stage.
Two submissions per hour; keep afix as the pick unless a new build scores lower AND passed the gate.

## Blast Radius: roadmap
1. Submit ac61fe622b02510cf4cdbb0e6ad746cbbf356a44 and record the score.
2. If it is far from the leaders, read the package report's limitations and the track rules before spending slots.
