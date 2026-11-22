# Sparring roster: sandboxed copies of other teams' public bots

Generated 21 Nov 2026 05:58 UTC by the roster step (records: `sparring_roster.json`, same folder). These programs are
external opponents and calibration baselines for the local simulator only. They are third-party, UNTRUSTED
code: start them only through `/srv/mech-sparring/run.sh <name>`, and never copy anything from them into
bot/, sim/, tools/ or notes/. Nothing from them is stored in the project tree; this file and the JSON hold
only names, commits, commands, file lists, scores and short evidence quotes.

## How to use

- Spawn `proc` (= `/srv/mech-sparring/run.sh <name>`) as the bot process: JSON lines on stdin/stdout, stderr passes through.
- `hello.map.dir` must be `/srv/mech-sparring/_arena` (it holds `v2/world.json` and `v2/terrain.i16`): the sandbox user cannot read the project tree.
- Every step in run.sh is an `exec`, so the child pid is the bot itself and can be killed directly. run.sh needs root (it creates a network namespace and drops to uid 65534).
- Runnable copies: `/srv/mech-sparring/<name>/` (root-owned, mode 755/644, read-only for the sandbox user). Commands: `/srv/mech-sparring/_cmd/<name>`, one argument per line; leading `VAR=value` lines are environment settings the bot's own Dockerfile sets.
- Smoke test used: `python3 kit/check/check.py --map-dir /srv/mech-sparring/_arena -- /srv/mech-sparring/run.sh <name>` (300 recorded observations, 50 ms budget).

## Counts

122 records: **110 runnable (all PASS)**, 0 installed but failing, 12 skipped.

| Official score band | Runnable | of which link high/medium |
|---|---:|---:|
| 5.0 and above | 13 | 10 |
| 4.5 to 4.99 | 16 | 15 |
| 4.0 to 4.49 | 19 | 19 |
| 3.5 to 3.99 | 28 | 28 |
| 3.0 to 3.49 | 7 | 7 |
| 2.0 to 2.99 | 16 | 16 |
| below 2.0 | 10 | 10 |
| no documented score | 1 | - |

Confidence of the version-to-score link: **high** = the repo's own notes (or a receipt log of the team that ran it) name the commit and the score;
**medium** = stated score with the commit inferred from version labels, or a tight timestamp match with a second kind of evidence;
**low** = timestamp proximity or an unproven team link only. For calibration use high and medium; treat low as sparring opponents.

## Runnable bots (sorted by official practice score)

| name | repo @ commit | language | official | link | smoke | ready ms | answer ms p50 / p90 / p99 / max | in-sandbox command |
|---|---|---|---:|---|---|---:|---|---|
| `magic_53f6854` | Kgc3105/MAGIC-Royale @ `53f6854` | typescript | 5.58 | high | PASS | 385 | 0.5 / 0.7 / 3.8 / 22.7 | `BUN_JSC_useConcurrentJIT=0 BUN_JSC_useFTLJIT=0 BUN_JSC_numberOfGCMarkers=1 bun144 bot.ts` |
| `proj1_aggro6_cefd23f` | shaunkar1/proj1 @ `cefd23f` | go | 5.33 | low | PASS | 592 | 0.5 / 0.6 / 0.9 / 1.0 | `./mechbot` |
| `proj1_kite200_b624765` | shaunkar1/proj1 @ `b624765` | go | 5.31 | medium | PASS | 544 | 0.5 / 0.7 / 1.2 / 3.7 | `./mechbot` |
| `ttun_ae1b122` | varchaskukreja/TTUN @ `ae1b122` | typescript | 5.21 | medium | PASS | 153 | 0.5 / 0.9 / 12.0 / 22.1 | `bun144 bot.ts` |
| `kanyaraasi_83e4c93` | devakchow/team-kanyaraasi-mech-royale @ `83e4c93` | typescript | 5.19 | medium | PASS | 187 | 0.3 / 1.0 / 12.7 / 14.9 | `bun144 bot.ts` |
| `kyoto_v15_5bd6c37` | kyoto-max/Mech_Royale @ `5bd6c37` | python (.pyc) | 5.19 | low | PASS | 204 | 0.4 / 0.6 / 2.5 / 4.1 | `python3.13 -u pilot.pyc` |
| `ttun_v8econ_b7e9a6d` | varchaskukreja/TTUN @ `b7e9a6d` | typescript | 5.19 | high | PASS | 112 | 0.5 / 0.9 / 9.5 / 11.5 | `bun144 bot.ts` |
| `magic_aace465` | Kgc3105/MAGIC-Royale @ `aace465` | typescript | 5.17 | high | PASS | 437 | 0.5 / 0.8 / 3.3 / 22.9 | `BUN_JSC_useConcurrentJIT=0 BUN_JSC_useFTLJIT=0 BUN_JSC_numberOfGCMarkers=1 bun144 bot.ts` |
| `r1ver_ts_af337d5` | moonriver0922/wgsrobot @ `af337d5` | typescript | 5.10 | high | PASS | 110 | 0.5 / 0.8 / 10.5 / 21.6 | `bun144 bot.ts` |
| `r1ver_ts_96848df` | moonriver0922/wgsrobot @ `96848df` | typescript | 5.08 | high | PASS | 110 | 0.5 / 0.7 / 9.1 / 13.0 | `bun144 bot.ts` |
| `bd_payload_9c9801e` | brycehcmcgrath/mechfight-bot @ `9c9801e` | python (compiled .so) | 5.06 | medium | PASS | 236 | 0.4 / 0.5 / 2.5 / 7.7 | `python3.13 -u -c 'import pilot; pilot.main()'` |
| `prakash_v5_14b39db` | prakash-218/buildathon-mech @ `14b39db` | go | 5.04 | low | PASS | 251 | 0.5 / 0.7 / 3.1 / 3.5 | `./mechbot` |
| `th3r0n_expJ_7775214` | Th3r0n/mech-royale-bot @ `7775214` | typescript | 5.02 | high | PASS | 821 | 0.5 / 1.3 / 4.0 / 7.6 | `bun144 bot.ts` |
| `th3r0n_expI_06c7d26` | Th3r0n/mech-royale-bot @ `06c7d26` | typescript | 4.98 | medium | PASS | 1038 | 0.5 / 1.2 / 4.4 / 9.9 | `bun144 bot.ts` |
| `nexus_v281_312d591` | JosiahAklog/nexus-mech-royale @ `312d591` | python | 4.96 | high | PASS | 108 | 0.6 / 1.0 / 2.2 / 7.1 | `python3 -u bot.py` |
| `kestrel_G3_8671068` | AbhirajTiwari12/mech-royale-bot @ `8671068` | python | 4.92 | medium | PASS | 60 | 0.3 / 0.5 / 2.2 / 4.3 | `python3 -u bot.py` |
| `nexus_v26_21b396d` | JosiahAklog/nexus-mech-royale @ `21b396d` | python | 4.83 | medium | PASS | 106 | 0.5 / 0.7 / 1.1 / 2.5 | `python3 -u bot.py` |
| `bd_lancecharge_dfe5cdd` | brycehcmcgrath/mechfight-bot @ `dfe5cdd` | python | 4.79 | high | PASS | 297 | 0.5 / 0.7 / 4.1 / 12.8 | `python3 -u lance_entry.py` |
| `nexus_v24_2cc1d14` | JosiahAklog/nexus-mech-royale @ `2cc1d14` | python | 4.77 | high | PASS | 153 | 0.6 / 0.9 / 1.3 / 2.1 | `python3 -u bot.py` |
| `lance_171bc06_nosneak` | LanceHuang245/mech-royale @ `171bc06` | python | 4.75 | high | PASS | 234 | 0.5 / 0.8 / 3.2 / 7.8 | `MR_FLAGS= python3 -u bot.py` |
| `lance_v04_f0ca54a` | LanceHuang245/mech-royale @ `f0ca54a` | python | 4.75 | medium | PASS | 218 | 0.5 / 0.9 / 3.4 / 7.8 | `python3 -u bot.py` |
| `th3r0n_v11_78a585c` | Th3r0n/mech-royale-bot @ `78a585c` | typescript | 4.75 | medium | PASS | 998 | 0.6 / 1.4 / 4.0 / 7.6 | `bun144 bot.ts` |
| `proj1_95cfa9c` | shaunkar1/proj1 @ `95cfa9c` | go | 4.73 | low | PASS | 259 | 0.4 / 0.7 / 1.1 / 2.4 | `./mechbot` |
| `r1ver_py_8a536b5` | moonriver0922/wgsrobot @ `8a536b5` | python | 4.67 | high | PASS | 218 | 0.5 / 0.6 / 2.7 / 7.9 | `MR_FLAGS= python3 -u bot.py` |
| `whymiso_r15_be4bf88` | whyMiso/buildathon-mech-royale @ `be4bf88` | javascript (node) | 4.56 | medium | PASS | 240 | 0.3 / 0.5 / 2.0 / 4.8 | `/opt/node22/bin/node bot.mjs` |
| `lance_171bc06` | LanceHuang245/mech-royale @ `171bc06` | python | 4.54 | high | PASS | 360 | 0.4 / 0.7 / 2.7 / 7.8 | `python3 -u bot.py` |
| `r1ver_py_97e0e58` | moonriver0922/wgsrobot @ `97e0e58` | python | 4.54 | high | PASS | 385 | 0.5 / 0.8 / 4.1 / 14.9 | `MR_FLAGS=sneak python3 -u bot.py` |
| `kenneth_055ed67` | KennethLei1492/Builder-Mech-Royale @ `055ed67` | typescript | 4.52 | high | PASS | 232 | 0.4 / 1.2 / 4.4 / 5.0 | `bun144 main.ts` |
| `teti_204440e` | anthonyteti/buildathon-mech-royale @ `204440e` | typescript | 4.50 | medium | PASS | 447 | 0.4 / 0.9 / 5.3 / 9.5 | `bun144 bot.ts` |
| `nullatom_7a3a25a` | nullat0m7/mech-royale @ `7a3a25a` | typescript | 4.46 | high | PASS | 236 | 0.5 / 0.8 / 1.8 / 6.7 | `/opt/node24/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=384 bot/main.ts` |
| `teti_v7_a1df384` | anthonyteti/buildathon-mech-royale @ `a1df384` | typescript | 4.46 | medium | PASS | 442 | 0.4 / 0.8 / 5.5 / 9.4 | `bun144 bot.ts` |
| `lance_v03_bc9a82e` | LanceHuang245/mech-royale @ `bc9a82e` | python | 4.44 | medium | PASS | 75 | 0.5 / 0.7 / 3.2 / 3.7 | `python3 -u bot.py` |
| `nullatom_65ce172` | nullat0m7/mech-royale @ `65ce172` | typescript | 4.44 | high | PASS | 264 | 0.6 / 0.8 / 3.3 / 5.4 | `/opt/node24/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=384 bot/main.ts` |
| `nullatom_926e5b7` | nullat0m7/mech-royale @ `926e5b7` | typescript | 4.40 | high | PASS | 219 | 0.5 / 1.1 / 3.6 / 7.5 | `/opt/node24/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=384 bot/main.ts` |
| `whymiso_auto130_727f6db` | whyMiso/buildathon-mech-royale @ `727f6db` | javascript (node) | 4.35 | medium | PASS | 258 | 0.4 / 0.6 / 1.9 / 11.4 | `/opt/node22/bin/node bot.mjs` |
| `nexus_v9_575cec5` | JosiahAklog/nexus-mech-royale @ `575cec5` | python | 4.33 | medium | PASS | 110 | 0.5 / 0.7 / 1.5 / 1.7 | `python3 -u bot.py` |
| `ourux_v4_2d700d7` | ourux/MechRoyale @ `2d700d7` | python | 4.33 | high | PASS | 177 | 0.3 / 0.6 / 1.4 / 1.6 | `python3 -u bot.py` |
| `th3r0n_v91_36bfe31` | Th3r0n/mech-royale-bot @ `36bfe31` | typescript | 4.29 | medium | PASS | 876 | 0.5 / 1.3 / 3.1 / 7.8 | `bun144 bot.ts` |
| `jorge_v5_2c7e167` | JorgeN0/Mech-Royal @ `2c7e167` | python | 4.28 | high | PASS | 240 | 0.5 / 0.9 / 3.2 / 6.8 | `python3 -u bot.py` |
| `whymiso_v5_e6ed8c5` | whyMiso/buildathon-mech-royale @ `e6ed8c5` | javascript (node) | 4.23 | medium | PASS | 294 | 0.4 / 0.6 / 3.3 / 4.1 | `/opt/node22/bin/node bot.mjs` |
| `ourux_v5_39fbe4e` | ourux/MechRoyale @ `39fbe4e` | python | 4.15 | high | PASS | 222 | 0.5 / 0.8 / 2.1 / 2.4 | `python3 -u bot.py` |
| `bd_gtmag_a38a3df` | brycehcmcgrath/mechfight-bot @ `a38a3df` | python | 4.10 | high | PASS | 279 | 0.4 / 0.9 / 1.7 / 2.0 | `python3 -u reference_entry.py` |
| `oval_v4_b845d48` | SeanCowen/oval-runner @ `b845d48` | python+rust | 4.06 | high | PASS | 400 | 0.5 / 1.5 / 2.2 / 3.3 | `OVAL_REQUIRE_RUST=1 python3 -u bot.py` |
| `joek_v2_92a99a7` | joekritenbrink0-wq/mech-bot @ `92a99a7` | python | 4.04 | medium | PASS | 364 | 0.3 / 1.3 / 3.0 / 3.9 | `python3 -u bot.py` |
| `lance_patient_42d652b` | LanceHuang245/mech-royale @ `42d652b` | python | 4.04 | high | PASS | 231 | 0.4 / 0.8 / 3.1 / 8.1 | `python3 -u bot.py` |
| `ourux_v2_0fe813e` | ourux/MechRoyale @ `0fe813e` | python | 4.04 | medium | PASS | 180 | 0.4 / 0.6 / 1.3 / 1.4 | `python3 -u bot.py` |
| `mauro_v14_b75320f` | MauroMiranda28/mech-royale-bot @ `b75320f` | python | 4.00 | high | PASS | 101 | 0.9 / 1.2 / 10.7 / 12.8 | `python3 -u bot.py` |
| `nullatom_096c710` | nullat0m7/mech-royale @ `096c710` | typescript | 4.00 | high | PASS | 223 | 0.6 / 1.1 / 3.8 / 4.7 | `/opt/node24/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=384 bot/main.ts` |
| `mauro_v12_e603196` | MauroMiranda28/mech-royale-bot @ `e603196` | python | 3.98 | high | PASS | 90 | 0.8 / 1.1 / 8.4 / 12.6 | `python3 -u bot.py` |
| `nullatom_6df0e10` | nullat0m7/mech-royale @ `6df0e10` | typescript | 3.98 | high | PASS | 247 | 0.6 / 0.8 / 2.6 / 4.3 | `/opt/node24/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=384 bot/main.ts` |
| `oval_34bbb13` | SeanCowen/oval-runner @ `34bbb13` | python | 3.98 | high | PASS | 430 | 0.5 / 1.2 / 2.3 / 3.2 | `python3 -u bot.py` |
| `prakash_v1_b2b1029` | prakash-218/buildathon-mech @ `b2b1029` | go | 3.98 | high | PASS | 265 | 0.3 / 0.5 / 1.3 / 2.4 | `./mechbot` |
| `kyoto_v4_5d63434` | kyoto-max/Mech_Royale @ `5d63434` | python | 3.96 | high | PASS | 342 | 1.3 / 1.7 / 2.3 / 2.3 | `python3 -u bot.py` |
| `joek_v0_333fb36` | joekritenbrink0-wq/mech-bot @ `333fb36` | python | 3.94 | high | PASS | 169 | 0.2 / 0.3 / 0.6 / 1.4 | `python3 -u bot.py` |
| `kenneth_247ccb8` | KennethLei1492/Builder-Mech-Royale @ `247ccb8` | typescript | 3.88 | high | PASS | 209 | 0.4 / 0.9 / 6.4 / 10.2 | `bun144 main.ts` |
| `oval_7f4965d` | SeanCowen/oval-runner @ `7f4965d` | python | 3.88 | high | PASS | 418 | 0.6 / 0.9 / 1.4 / 2.9 | `python3 -u bot.py` |
| `alexwill_b16_e283e74` | alexwilldev/mechroyale-bot @ `e283e74` | typescript | 3.85 | high | PASS | 201 | 0.5 / 1.8 / 3.9 / 4.4 | `bun144 src/main.ts` |
| `prakash_v2_e7319ff` | prakash-218/buildathon-mech @ `e7319ff` | go | 3.85 | high | PASS | 194 | 0.4 / 0.8 / 1.1 / 2.3 | `./mechbot` |
| `alexwill_b17_f187fcd` | alexwilldev/mechroyale-bot @ `f187fcd` | typescript | 3.79 | high | PASS | 255 | 0.4 / 1.3 / 3.1 / 5.5 | `bun144 src/main.ts` |
| `joek_v1_9f4e5fc` | joekritenbrink0-wq/mech-bot @ `9f4e5fc` | python | 3.79 | high | PASS | 485 | 0.7 / 2.4 / 5.7 / 8.6 | `python3 -u bot.py` |
| `mauro_v13_956109f` | MauroMiranda28/mech-royale-bot @ `956109f` | python | 3.77 | high | PASS | 82 | 0.8 / 1.0 / 9.9 / 11.8 | `python3 -u bot.py` |
| `oval_1d9e5cb` | SeanCowen/oval-runner @ `1d9e5cb` | python | 3.77 | high | PASS | 327 | 0.5 / 0.8 / 1.3 / 3.6 | `python3 -u bot.py` |
| `achintya_3693d2f` | Achintya-Lakshmanan/mech-royale-bot @ `3693d2f` | typescript | 3.71 | high | PASS | 164 | 0.4 / 0.7 / 1.3 / 5.8 | `bun144 bot.ts` |
| `gtgoats_03a8f93` | atharvatripathi2026/gtgoats_mech_royale @ `03a8f93` | python | 3.71 | high | PASS | 286 | 0.5 / 1.4 / 4.8 / 7.3 | `python3 -u bot.py` |
| `kyoto_v11_8b6a735` | kyoto-max/Mech_Royale @ `8b6a735` | python | 3.71 | high | PASS | 364 | 1.4 / 1.8 / 2.4 / 2.5 | `python3 -u bot.py` |
| `lance_v02_25664f3` | LanceHuang245/mech-royale @ `25664f3` | python | 3.71 | medium | PASS | 104 | 0.4 / 0.6 / 2.5 / 3.0 | `python3 -u bot.py` |
| `mauro_v16_2ec6d2f` | MauroMiranda28/mech-royale-bot @ `2ec6d2f` | python | 3.71 | high | PASS | 118 | 0.8 / 1.0 / 7.3 / 12.0 | `python3 -u bot.py` |
| `goonies_v31_ca7ed6e` | koillea/mech-royale-goonies @ `ca7ed6e` | python | 3.69 | high | PASS | 481 | 0.5 / 3.5 / 4.7 / 6.4 | `python3 -u main.py` |
| `kyoto_v2_46ac97d` | kyoto-max/Mech_Royale @ `46ac97d` | python | 3.69 | high | PASS | 434 | 1.4 / 1.8 / 13.2 / 17.1 | `python3 -u bot.py` |
| `gtgoats_ce73f3e` | atharvatripathi2026/gtgoats_mech_royale @ `ce73f3e` | python | 3.65 | high | PASS | 242 | 0.3 / 0.9 / 2.6 / 4.2 | `python3 -u bot.py` |
| `goonies_v34_e3a20e7` | koillea/mech-royale-goonies @ `e3a20e7` | python | 3.63 | high | PASS | 395 | 0.5 / 3.3 / 4.6 / 6.7 | `python3 -u main.py` |
| `gtgoats_4cb4a9e` | atharvatripathi2026/gtgoats_mech_royale @ `4cb4a9e` | python | 3.60 | high | PASS | 240 | 0.3 / 1.0 / 1.5 / 1.8 | `python3 -u bot.py` |
| `kyoto_v1_bec99fe` | kyoto-max/Mech_Royale @ `bec99fe` | python | 3.60 | high | PASS | 362 | 1.2 / 1.7 / 17.2 / 17.5 | `python3 -u bot.py` |
| `ttun_v9_edf5776` | varchaskukreja/TTUN @ `edf5776` | typescript | 3.56 | medium | PASS | 115 | 0.5 / 0.8 / 8.7 / 10.9 | `bun144 bot.ts` |
| `mauro_v15_63b88d6` | MauroMiranda28/mech-royale-bot @ `63b88d6` | python | 3.54 | high | PASS | 79 | 0.8 / 1.1 / 7.0 / 11.9 | `python3 -u bot.py` |
| `goonies_v3_5db062e` | koillea/mech-royale-goonies @ `5db062e` | python | 3.52 | high | PASS | 397 | 0.3 / 1.5 / 10.8 / 19.2 | `python3 -u main.py` |
| `goonies_v36_5935272` | koillea/mech-royale-goonies @ `5935272` | python | 3.48 | high | PASS | 370 | 0.5 / 3.3 / 5.6 / 7.0 | `python3 -u main.py` |
| `alexwill_b18_fa72632` | alexwilldev/mechroyale-bot @ `fa72632` | typescript | 3.42 | high | PASS | 207 | 0.3 / 1.4 / 3.1 / 5.2 | `bun144 src/main.ts` |
| `achintya_734a0cf` | Achintya-Lakshmanan/mech-royale-bot @ `734a0cf` | typescript | 3.29 | high | PASS | 182 | 0.4 / 0.7 / 2.2 / 5.2 | `bun144 bot.ts` |
| `prakash_v3_b9f5abd` | prakash-218/buildathon-mech @ `b9f5abd` | go | 3.27 | high | PASS | 267 | 0.4 / 0.8 / 3.2 / 6.5 | `./mechbot` |
| `gtgoats_9e59bbf` | atharvatripathi2026/gtgoats_mech_royale @ `9e59bbf` | python | 3.23 | high | PASS | 295 | 0.3 / 1.0 / 2.3 / 3.6 | `python3 -u bot.py` |
| `achintya_fc21aee` | Achintya-Lakshmanan/mech-royale-bot @ `fc21aee` | typescript | 3.21 | high | PASS | 161 | 0.3 / 0.5 / 3.0 / 4.7 | `bun144 bot.ts` |
| `scull_F_3b42e6a` | charliescull/mech-royale-bot @ `3b42e6a` | python | 3.15 | medium | PASS | 251 | 0.3 / 0.5 / 3.2 / 3.7 | `python3 -u bot.py` |
| `kyoto_phantom_7723212` | kyoto-max/Mech_Royale @ `7723212` | python | 2.96 | medium | PASS | 419 | 13.3 / 13.7 / 15.4 / 15.4 | `python3 -u bot.py` |
| `dmcl_0ed6ffc` | dmclaughlin-bit/mech-bot @ `0ed6ffc` | typescript | 2.88 | high | PASS | 325 | 0.4 / 0.9 / 2.1 / 4.5 | `bun144 bot.ts` |
| `monked_v15_fc68657` | jmonked/monked-mech-royale @ `fc68657` | python | 2.88 | high | PASS | 52 | 0.4 / 0.6 / 0.9 / 2.1 | `python3 -u example_bot.py` |
| `monked_v10_e1596e3` | jmonked/monked-mech-royale @ `e1596e3` | python | 2.85 | high | PASS | 52 | 0.3 / 0.5 / 0.7 / 2.0 | `python3 -u example_bot.py` |
| `achintya_fe5cfb6` | Achintya-Lakshmanan/mech-royale-bot @ `fe5cfb6` | typescript | 2.69 | high | PASS | 179 | 0.3 / 0.6 / 2.7 / 5.8 | `bun144 bot.ts` |
| `kyoto_ghost_c480a5d` | kyoto-max/Mech_Royale @ `c480a5d` | python | 2.67 | medium | PASS | 377 | 1.1 / 2.7 / 17.4 / 17.4 | `python3 -u bot.py` |
| `ourux_hide_e5fb3a9` | ourux/MechRoyale @ `e5fb3a9` | python | 2.58 | high | PASS | 166 | 0.4 / 0.7 / 2.2 / 6.6 | `python3 -u bot.py` |
| `starlight_636b661` | Sharmileer/mech-royale @ `636b661` | python | 2.58 | high | PASS | 1234 | 0.8 / 1.7 / 4.8 / 5.0 | `python3 -B -u bot.py` |
| `colton_survive_b2e8df5` | colton-boi/Mech-Bot @ `b2e8df5` | python | 2.56 | medium | PASS | 368 | 0.3 / 0.5 / 10.6 / 10.8 | `python3 -u bot.py` |
| `dmcl_c2e7f60` | dmclaughlin-bit/mech-bot @ `c2e7f60` | typescript | 2.54 | high | PASS | 318 | 0.5 / 0.9 / 1.6 / 4.5 | `bun144 bot.ts` |
| `bd_coverdrive_2b6420c` | brycehcmcgrath/mechfight-bot @ `2b6420c` | python | 2.52 | high | PASS | 65 | 9.0 / 20.9 / 23.0 / 28.6 | `python3 -u bot.py` |
| `monked_v7_d433483` | jmonked/monked-mech-royale @ `d433483` | python | 2.50 | medium | PASS | 96 | 0.2 / 0.5 / 1.9 / 4.2 | `python3 -u example_bot.py` |
| `dmcl_8f2c7c8` | dmclaughlin-bit/mech-bot @ `8f2c7c8` | typescript | 2.44 | high | PASS | 339 | 0.4 / 0.8 / 2.2 / 3.1 | `bun144 bot.ts` |
| `dmcl_100941f` | dmclaughlin-bit/mech-bot @ `100941f` | typescript | 2.38 | high | PASS | 288 | 0.3 / 0.8 / 2.1 / 5.9 | `bun144 bot.ts` |
| `dmcl_4726cfc` | dmclaughlin-bit/mech-bot @ `4726cfc` | typescript | 2.17 | high | PASS | 163 | 0.4 / 0.6 / 2.2 / 2.8 | `bun144 bot.ts` |
| `scull_L_1546486` | charliescull/mech-royale-bot @ `1546486` | python | 2.15 | medium | PASS | 211 | 0.9 / 2.4 / 4.8 / 4.8 | `python3 -u bot.py` |
| `sphugne_evasion_6ab815c` | sphugne/mech-royale-bot @ `6ab815c` | python | 1.96 | medium | PASS | 57 | 0.3 / 1.5 / 2.9 / 3.6 | `python3 -u evasion_bot.py` |
| `sphugne_cover_cb7a1cc` | sphugne/mech-royale-bot @ `cb7a1cc` | python | 1.90 | medium | PASS | 67 | 0.5 / 0.8 / 1.3 / 2.3 | `python3 -u cover_bot.py` |
| `bd_coverdrive_b17e863` | brycehcmcgrath/mechfight-bot @ `b17e863` | python | 1.75 | high | PASS | 69 | 8.3 / 20.5 / 22.0 / 22.6 | `python3 -u bot.py` |
| `colton_hide_285afd7` | colton-boi/Mech-Bot @ `285afd7` | python | 1.73 | high | PASS | 335 | 0.3 / 0.5 / 10.7 / 10.8 | `python3 -u bot.py` |
| `dmcl_76aabfa` | dmclaughlin-bit/mech-bot @ `76aabfa` | typescript | 1.67 | high | PASS | 152 | 0.4 / 0.6 / 1.3 / 1.6 | `bun144 bot.ts` |
| `colton_roof_501496d` | colton-boi/Mech-Bot @ `501496d` | python | 1.63 | high | PASS | 317 | 0.3 / 0.4 / 10.6 / 10.7 | `python3 -u bot.py` |
| `sphugne_combat_b7b39e0` | sphugne/mech-royale-bot @ `b7b39e0` | python | 1.60 | medium | PASS | 45 | 0.3 / 0.5 / 0.7 / 1.7 | `python3 -u combat_bot.py` |
| `afiapoks_aim_082352b` | afiapoks/mech-royale @ `082352b` | python | 1.38 | high | PASS | 32 | 0.2 / 0.4 / 0.7 / 4.2 | `python3 -u example_bot.py` |
| `kit_starter` | mechfight-kit (organisers) python/example_bot.py @ `-` | python | 1.15 | high | PASS | 48 | 0.2 / 0.3 / 0.4 / 3.7 | `python3 -u example_bot.py` |
| `sphugne_movement_08ebcca` | sphugne/mech-royale-bot @ `08ebcca` | python | 0.88 | medium | PASS | 37 | 0.3 / 0.5 / 1.5 / 5.8 | `python3 -u movement_bot.py` |
| `kit_starter_ts` | mechfight-kit (organisers) ts/example.ts @ `-` | typescript | - | none | PASS | 34 | 0.2 / 0.4 / 1.0 / 3.3 | `bun144 example.ts` |

`proc` for every row is `/srv/mech-sparring/run.sh <name>`. Evidence for each score link and the copied file list are in the JSON.

## Skipped (kept for the record)

| name | repo | commit | language | official | link | why skipped |
|---|---|---|---|---:|---|---|
| `cyprusbot` | chriseco427-spec/CyprusBot | a359a35 / d67b21c | rust | 5.15 | medium | Rust with a crates.io dependency (serde_json =1.0.140 plus serde/proc-macro crates in Cargo.lock, nothing vendored): 'cargo build --release --offline --locked' was run inside the sandbox wrapper on a writable copy under /tmp and failed with 'no matching package named serde_json found' (no local registry cache exists). A network build is not allowed. |
| `davidvarvas` | davidvarvas/mech-royale-bot | 7e86f21 (D1) | python | 5.02 | medium | Needs a third-party package: the Dockerfile at the 5.02 commit runs 'pip install numpy==2.1.3' and nav.py imports numpy unconditionally (bot.py only degrades to 'run without a map' when numpy is missing); numpy is not installed for the sandbox python and network installs are not allowed. |
| `bingbu` | niranjankumarnk/mech-royale | 1d04c65 (HEAD of the clone) | rust | 4.58 | low | Rust with crates.io dependency serde_json: 'cargo build --release --offline --locked' inside the sandbox wrapper failed ('no matching package named serde_json found'); network build not allowed. |
| `swan28pande` | swan28pande/oval-tools | 791326a | python | 4.21 | high | Needs a third-party package: Dockerfile runs 'pip install numpy==2.1.3'; numpy is not installed for the sandbox python and network installs are not allowed. |
| `oneteam` | Russell-Day/builders-mech-royale | be2cd01 / 2c32c04 | python | 4.15 | medium | Needs a third-party package: Dockerfile runs 'pip install numpy==2.2.1'; not installed for the sandbox python and network installs are not allowed. |
| `davidvarvas_gpt` | davidvarvas/mech-royale-bot-gpt | 89ec1cd | python | 4.08 | medium | Needs a third-party package: Dockerfile runs 'pip install numpy==2.1.3'; not installed for the sandbox python and network installs are not allowed. |
| `jackbalseca` | jackbalseca/mech-royale-bot | - | python | 3.92 | high | Needs third-party packages at every scored commit: Dockerfile runs 'pip install numpy==2.3.5 scipy==1.16.3' and bot.py/world.py/nav.py import numpy and scipy unconditionally; neither is installed for the sandbox python (probed) and network installs are not allowed. Also needs a build step (build_cache.py). |
| `jerrywang` | jerrywang255-spec/Mech-royale-bot | - | python | 3.38 | low | Needs a third-party package (Dockerfile: 'pip install numpy==2.3.5') and the scored commit is not recorded. |
| `xero` | arnabxero/xero-mech-royale | 301c9c6 (HEAD of the clone) | rust | 3.35 | medium | Rust with crates.io dependencies serde/serde_json: offline cargo build inside the sandbox wrapper failed ('no matching package named serde found'); network build not allowed. |
| `micah_andelman` | micah-andelman/mech-royale | cddfa2f (v10) | python | 2.40 | medium | Not installed: the image is configured through Docker build ARGs turned into ENV strategy flags whose submitted values are not recorded per commit, so the scored configuration cannot be reproduced with confidence. |
| `bsrikumar` | bsrikumar855-dot/Mech-Royale | 3fae0bf | typescript (node, npm packages) | 1.90 | medium | Needs npm packages and a build: Dockerfile runs 'npm ci' with a package-lock.json; network installs are not allowed. |
| `overcooked` | viktor-lorentz/mech-royale-overcooked | 8e774a0 (HEAD of the clone) | rust | - | none | Rust with crates.io dependencies serde/serde_json: offline cargo build inside the sandbox wrapper failed ('no matching package named serde found'); network build not allowed. |

## Sandbox and runtimes

`/srv/mech-sparring/run.sh <name>` validates the name, reads the argv from `_cmd/<name>`, sets `ulimit -c 0` and
`ulimit -u 4096` (process cap for uid 65534; an addition to the prescribed line), then:

```
cd /srv/mech-sparring/<name> && exec unshare -n -- setpriv --reuid=65534 --regid=65534 --clear-groups --no-new-privs -- \
  env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp LANG=C.UTF-8 PYTHONDONTWRITEBYTECODE=1 <command>
```

So each bot has an empty network namespace (not even loopback is up), uid/gid 65534, no supplementary groups,
no-new-privs, no capabilities and an empty environment. There is no separate mount namespace: the bot can read
world-readable files and write to /tmp (HOME), exactly as the brief specifies. Bun leaves a cache in /tmp/.bun.

| Runtime | Path | Used for |
|---|---|---|
| Bun 1.4.4 | `/usr/local/bin/bun144` (copy of the project's binary) | TypeScript bots whose image is `oven/bun:1.4.4` |
| Python 3.11.18 | `/usr/local/bin/python3` | Python bots (their images pin 3.12 or 3.13; all listed bots start and pass on 3.11) |
| Python 3.13 | `/usr/local/bin/python3.13` | only the two bots shipped as CPython 3.13 binaries: `bd_payload_9c9801e` (.so) and `kyoto_v15_5bd6c37` (.pyc) |
| Node 24.22.3 | `/opt/node24/bin/node` | the `nullatom_*` bots (their Dockerfile pins exactly this version) |
| Node 22.23.5 | `/opt/node22/bin/node` | the `whymiso_*` bots (Dockerfile pins 22.20.0) |
| native binary | `./mechbot` | Go bots (`proj1_*`, `prakash_*`) |

Deviations from a bot's own image, all recorded per bot in the JSON `notes`:

- Python bots run on 3.11 instead of 3.13 (speed and behaviour of pure standard-library code are equivalent; decision
  timing guards inside some bots may cut slightly differently).
- `magic_*` (Kgc3105): the image bundles with `bun build` first; here the same sources run unbundled with the image's
  `BUN_JSC_*` settings.
- Compiled bots were built **offline inside the same sandbox wrapper** (uid 65534, no network, writable copy under /tmp)
  and only the result was installed: Go bots with the Dockerfile's `go build` line and the local Go 1.24.7;
  `oval_v4_b845d48`'s single-file planner with the Dockerfile's `rustc` line and a world-readable copy of the local
  Rust 1.97 toolchain in `/opt/mech-rust` (its Dockerfile pins 1.85). No test or tool script of any repo was run.
- Three bots ship native code from their own repository, which runs inside the sandbox like the rest:
  `nexus_*` (fastmap.so through ctypes), `bd_payload_9c9801e` (Cython modules), `oval_v4_b845d48` (built as above).
- Nothing was installed from a network: no pip, npm, bun install, cargo fetch or docker. Bots that need that are in
  the skipped table.

## Reading the scores

- Official practice score = mean of 16 - place over the same 48 fixed practice matches. Several teams report that
  identical code scores identically, while a behaviour-neutral change (RNG seed only) moved one bot by 0.25
  (`kyoto_v4_5d63434` 3.96/3.98 vs `kyoto_v11_8b6a735` 3.71) and another by 0.06 (jackbalseca, skipped). Differences
  below about 0.3 between versions are within that reshuffle noise.
- Same-code pairs that make good simulator checks: `lance_171bc06` (4.54) vs `lance_171bc06_nosneak` (4.75);
  `r1ver_py_97e0e58` (4.54) vs `r1ver_py_8a536b5` (4.67); `ttun_v9_edf5776` (3.56) vs `ttun_v8econ_b7e9a6d` (5.19);
  `magic_53f6854` (5.58) vs `magic_aace465` (5.17); `alexwill_b17_f187fcd` (3.79) vs `alexwill_b18_fa72632` (3.42);
  passive variants `kyoto_ghost_c480a5d` (2.67), `ourux_hide_e5fb3a9` (2.58), `colton_hide_285afd7` (1.73),
  `lance_patient_42d652b` (4.04).
- Shared lineages (do not count as independent opponents): LanceHuang245 171bc06 is the base of `r1ver_py_*`,
  `bd_lancecharge_dfe5cdd`, `bd_payload_9c9801e` and `kyoto_v15_5bd6c37`; TTUN v8-econ is the base of `r1ver_ts_*` and
  `kanyaraasi_83e4c93`; GT Goats is the base of `bd_gtmag_a38a3df`.
- Not installed although cloned: repos without any documented or inferable score, and by-catch teams whose only
  link is a loose timestamp (Eagle Eye, Osca, fortnite pirate token, STARLIGHT's later versions, skandra08's
  branch variants). `notes/top10_timestamp_map.md` did not exist when this was written; `notes/top10_name_map.md`
  was used for the top-team repositories (Kgc3105, shaunkar1/proj1, chriseco427-spec, prakash-218, davidvarvas,
  AbhirajTiwari12, kyoto-max).

## Sandbox probe (our own harmless script, run through run.sh)

Command: `/srv/mech-sparring/run.sh _probe` (python3 -I probe.py). Required: TCP connections fail and /root is unreadable. Result:

```
{
 "cap_eff": [
  "0000000000000000"
 ],
 "env": {
  "HOME": "/tmp",
  "LANG": "C.UTF-8",
  "PATH": "/usr/local/bin:/usr/bin:/bin",
  "PYTHONDONTWRITEBYTECODE": "1"
 },
 "gid": 65534,
 "groups": [],
 "list_/root": "failed: PermissionError",
 "list_scratchpad": "failed: PermissionError",
 "net_ifaces": [
  "eth0",
  "ifb0",
  "ifb1",
  "lo"
 ],
 "no_new_privs": [
  "1"
 ],
 "read_/root/.bashrc": "failed: PermissionError",
 "tcp_1.1.1.1:443": "failed: OSError: [Errno 101] Network is unreachable",
 "tcp_127.0.0.1:22": "failed: OSError: [Errno 101] Network is unreachable",
 "tcp_github.com:443": "failed: gaierror: [Errno -3] Temporary failure in name resolution",
 "uid": 65534,
 "write_/srv/mech-sparring": "failed: PermissionError",
 "write_/tmp": "WROTE",
 "write_own_dir": "failed: PermissionError"
}
```


## Addendum 17:05 UTC Sat: kyoto-max v43 (practice 6.31)

| name | repo @ commit | language | official | link | smoke | ready ms | answer ms p50 / p99 / max | in-sandbox command |
|---|---|---|---:|---|---|---:|---|---|
| `kyoto_v43_6726533` | kyoto-max/Mech_Royale @ `6726533` | native binary (compiled; not opened) | 6.31 | likely | PASS | 552 | 0.3 / 1.7 / 2.5 | `./pilot` (= `pilot-amd64`, blob c357ada7, sha256 339feb5d...c3bba9) |

Installed by copying only `pilot-amd64` to `/srv/mech-sparring/kyoto_v43_6726533/pilot` (root, 755); command file
`_cmd/kyoto_v43_6726533` holds `./pilot`; its Dockerfile sets no environment. Study and runs: `notes/intel/top5_kyoto_max.md`.


## Addendum 17:25 UTC Sat: Kanyaraasi 6a17c49 (practice 6.06)

| name | repo @ commit | language | official | link | smoke | ready ms | answer ms p50 / p90 / p99 / max | in-sandbox command |
|---|---|---|---:|---|---|---:|---|---|
| `kanyaraasi_6a17c49` | devakchow/team-kanyaraasi-mech-royale @ `6a17c49` | go | 6.06 | likely | PASS | 223 | 0.4 / 0.8 / 1.2 / 17.6 | `GOMAXPROCS=1 TMPDIR=/tmp ./mechbot` |

Built offline inside the sandbox wrapper (uid 65534, no network, writable build directory under /tmp, removed
afterwards) with the local Go 1.24.7 and the Dockerfile's build flags; the build copy's go.mod language line was
lowered from 1.26 to 1.24 (the image pins Go 1.26.1); sources unchanged. Only the binary was installed
(sha256 85c40eca...4fd503ef). Its four strategy files are byte-identical to giddygiddyboy 601c7a6
(`giddy_601c7a6`); only the wrapper adds stderr diagnostics. It announces itself as "giddygiddyboy".
Study and runs: `notes/intel/top5_Kanyaraasi.md`.
