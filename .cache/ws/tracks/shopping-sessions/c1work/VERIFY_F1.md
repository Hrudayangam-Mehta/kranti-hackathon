# VERIFY_F1: independent verification of C1 stage F1 (Lane F identity)

**Verdict: PASS.** Every comparison matched exactly, both ways:
- **Against `verify/ref.py`:** 1,245 engine runs on 316 datasets.
- **Kit fixtures:** 216 runs against the expected tables.
- **Dev set:** 10 runs against the dev answer.
- **20M and 60M sets:** 10 runs against `rel15`.
- **Lanes:** the default lane and `SESSIONS_LANE=G` gave identical tables on every dataset.
- **Exit and stdout:** exit code was 0 and stdout was empty on every run. That includes runs as uid 1000 in an emulated scoring container (read-only root and `/data`, `/tmp` a 64 MB tmpfs).

I found nothing that blocks F1. The only differences from `ref.py` are two `verify/edge.py` cases (8 runs), which differed before F1 too:
- **x18b:** a hidden `.hidden.csv` file is skipped.
- **x33:** click copies that differ, which the rules rule out.

`rel15` gives the same tables on both, and the fast lane is not involved (see section 5). The notes in section 6 cover performance and documentation only.

Verifier work folder: `c1work_vf1/`, which holds the build copy, scripts, logs and bases. All paths below are relative to `tracks/shopping-sessions/`.

## 1. Binary identity and source checks

| Check | Result |
|---|---|
| Rebuilt from a byte-identical copy of `c1work/{Cargo.toml,Cargo.lock,src}` in `c1work_vf1/build_src` | sha256 `3a79f86e441d5b4f61bf045c2ecc2b356694dc1a6721c9dee7327c6915b2551b`, equal to the engineer's binary and `c1work/bin/c1` |
| Build command | `CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" taskset -c 0,1 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu`, rustc 1.97.0; no new crates (`Cargo.lock` and `Cargo.toml` are identical to rel15) |
| Source snapshot | `c1work_vf1/logs/src_snapshot.sha256` |
| Diff against `rel15/src` | `fast/ident.rs` is new; `fast/mod.rs`, `fast/scan.rs` and `fast/people.rs` changed; everything else is identical |
| Comments | none: no `//`, `/*`, `*/` or doc attributes anywhere in `src/` |
| Warnings | one, `keys::lookup` never used. It is pre-existing: `keys.rs` is unchanged from rel15 |
| `cargo test --release` (separate target dir) | 27 passed, 0 failed |
| Baseline | `perf/bin/rel15` sha256 `2f3ebac7…006c`, the same as `rel15/target/.../sessions` |
| Generator | Rebuilt from `kit/unz/generator`; byte-identical to `kit/build/generator/target/release/generate` (sha256 `c7c18ab4…1649`) |

## 2. Generator structure, checked by me in `kit/unz/generator/src`

These are the facts my mutation sets rely on, and that F1 relies on:
- **User IDs:** `user_id = "u" + base36(scramble(index*512 + alias, user_key))` (`user.rs:121-124,130`, `ALIAS_SLOTS=512` at `user.rs:13`).
- **Base 36:** lower-case with no leading zeros (`text.rs:192-206`).
- **`scramble`:** a 40-bit bijection (`text.rs:211-217`).
- **Keys:** drawn after the window and the 4 rates from `Stream::Dataset` (`plan.rs:124-145`).
- **Whales:** indexes 0-4 (`plan.rs:36,161,174`).
- **Unused alias:** the extra ID is alias `count` (`user.rs:185`).
- **Kiosk IDs:** numbers `2^39 + k`, giving g = 2^30 (`user.rs:15,189`). They appear only in links.
- **Revised duplicates:** in 1 of 64 duplicated events, the later copies name `user_id((index+1) % users, alias 0)` (`user.rs:406-410`).
- **Upper-case:** case variants are upper-cased (`user.rs:591-594`, rates at `plan.rs:133-135`, link variant at `user.rs:25,208`).

My own Python replica of `random.rs`, `plan.rs` and `text.rs` (`c1work_vf1/mut/genmodel.py`) derives the key for any seed. It agrees with the key the binary recovered on every dataset where lane F was on, with no mismatch:
- 23 seeds;
- 54 fuzz rounds;
- 49 mutation sets;
- 115 edge merges;
- 3 cap-boundary sets;
- dev (seed 1), the 20M set (seed 7) and the 60M set (seed 61 by window and key, `0xd5c063b515`).

On the four re-keyed sets the binary recovered the key I had re-encoded the IDs with. Nothing is hard-coded.

**One error in the C1 log's fact table.** It says "whales are never chains". That is false:
- `plan.rs:183-184` evaluates `plan_random.chance(CHAIN_SHARE)` for whale indexes too, so each whale is a chain person with probability 1/20,000. That is about 1 seed in 3,700.
- I found 109 such seeds below 400k. On seed 2793, whale 0 has 336 aliases; on seed 15850, whale 1 has 324.
- Both seeds still recover the key from the other whales and MATCH (table 3a). The chain whale is odd (aliases of 16 and more), so its rows go to Lane G. Lane G share rises to 3.0-3.4%.
- This affects speed only.

## 3. Results (all against `verify/ref.py`, both ways, with `kit/.../compare.py`)

Each dataset ran in several configurations. Every configuration had to match `ref.py` both ways, and the first configuration had to match each of the others both ways.

### 3a. Generator seeds: 29 seeds, 87 runs, all MATCH

- **Script:** `c1work_vf1/verify/vseeds.py`.
- **Configurations:** default at NCPU 2, `SESSIONS_LANE=G`, and one more NCPU from 1 to 8.
- **Sizes:** E = 1k to 2M events; C up to 4M clicks.
- **Click-heavy sets (C ≥ 4E):** 537, 1372, 2896, 2473, 15, 62, 404, 909, 4242, 808.
- **Windows holding 2028-02-29:** 2481 and 2896 start on Feb 29 itself; the others are 249, 272, 537, 857, 1372, 2473, 15 and 62.
- **Seeds of 0 and 2^64-1:** included.
- **Lane F:** on in 23 of 29 seeds. It was off only in seeds 857, 62, 101, 202, 303 and 4242 (E of 5k or less), where the sample is "too small" or no key passes.

| seed | E / C | window start | lane F | Lane G share |
|---|---|---|---|---|
| 2481 | 1M / 250k | 2028-02-29 | on | 1.39% |
| 249 | 20k / 5k | 2028-02-16 | on | 3.51% |
| 272 | 300k / 75k | 2028-02-24 | on | 1.72% |
| 537 | 50k / 500k | 2028-02-24 | on | 3.50% |
| 857 | 1k / 250 | 2028-02-20 | off | 100% |
| 1372 | 300k / 1.2M | 2028-02-28 | on | 1.78% |
| 2896 | 20k / 200k | 2028-02-29 | on | 3.89% |
| 2473 | 5k / 50k | 2028-02-27 | on | 6.58% |
| 15 | 300k / 1.5M | 2028-02-17 | on | 1.78% |
| 62 | 2k / 20k | 2028-02-21 | off | 100% |
| 101, 202, 303, 4242 | 1k to 5k | various | off | 100% |
| 404, 505, 909, 99991, 123456789, 0, 2^64-1 | 5k to 50k, C up to 10E | various | on | 2.9 to 6.2% |
| 606, 707, 31337, 2^63 | 300k to 600k | various | on | 1.6 to 1.8% |
| 808 | 1M / 4M | 2028-11-14 | on | 1.66% |
| 77 | 2M / 500k | 2027-07-08 | on | 1.34% |
| 2793, 15850 (whale is a chain) | 300k, 1M | 2025 | on | 3.44%, 3.04% |

### 3b. Fuzz: 80 rounds, 240 runs, all MATCH

- **`verify/fuzz.py` mutation, 40 rounds** (`vfuzz.py 100 140`, fresh rounds 100-139). Each round ran at its own NCPU (every value from 1 to 8 occurs), with `SESSIONS_LANE=G` and at NCPU 2. Lane F was on in 22 rounds.
- **The same mutation with the generator's file layout, 40 more rounds** (`vfuzz2.py 200 240`, 24 to 64 files per folder). Lane F was on in 32 rounds.
- fuzz.py's own 1-to-8-file layout often leaves the key sample too small (section 6).

### 3c. Edge cases (`verify/edge.py`, 36 cases × default, `SESSIONS_LANE=G`, NCPU 1 and NCPU 8)

- 34 PASS in all four, including every hand-derived expectation.
- 2 CHECK (x18b and x33), identical in all four and identical to `rel15` (section 5).
- These cases are too small to turn lane F on, so I also merged each edge case into a generator dataset with the same window. Seed 570 has the window 2026-10-01 to 10-15, so lane F turns on. The script is `mut/edgemerge.py`:
  - **raw:** the edge files copied byte for byte. 29/29 MATCH, lane F on in all 29.
  - **canon:** every edge user ID remapped to a generator-canonical ID: unused persons below the cap, aliases per link component, and unlinked IDs sharing persons. This drives dedup, sessions, names and links through Lane F. 29/29 MATCH, lane F on in all 29; rerun after fixing a harness bug (section 7).
  - **canon, with the edge files sorting first:** 29/29 MATCH, lane F on in 28.

### 3d. My mutation sets: 15 kinds × 4 bases = 60 datasets, 248 runs (2 sets rerun, section 7), all MATCH

- **Script:** `mut/mutate.py` with `mut/runmut.py`.
- **Bases:** seed 15 (60k/60k), seed 2481 (200k/100k, window starts Feb 29), seed 537 (100k/400k, click-heavy) and seed 1 (the 1M/250k dev generation).
- **Configurations:** default at NCPU 2, `SESSIONS_LANE=G`, NCPU 1 and NCPU 8.
- **Copies:** every mutation keeps the rules' input guarantees. Click copies stay identical, and so do event copies with equal `ingest_ts`.

| kind | what it does | lane F (b15/b2481/b537/b1) |
|---|---|---|
| upper | 1% of rows upper-cased; 3 persons upper-cased in every row; 10% of whale 0; one character upper-cased; `U…,u…` links; `U…` rows | on ×4 |
| lzero | `u0…`, `u00…` and `u000000000…` rows, clicks and links; `u`, `u0`, `u00`, `u01`, `u001` | on ×4 |
| noncanon | for whales, chain persons and 40 random persons: v+m·2^40 (mask aliasing), v+m·2^64 (u64 wrap), v+2^128, suffix and prefix bytes, `/:@[`{~` and DEL inside, Unicode look-alikes, truncated and doubled bodies; all used in rows, clicks, cross-links and self-links | on ×4 |
| xlinks | 200 cross-person links, whale-whale and whale-person links, chain persons linked out, a 30-person cross chain | on ×4 |
| kiosk | whales 0, 1, 2 and 4 linked to shared-device IDs; two devices joined; rows on kiosk IDs | on ×4 |
| alias16 | aliases 15, 16, 17, 31, 32, 100 and 511 as rows only; linked to alias 0, to another person, and in chains; alias 0, 16 and 32 collisions; persons near the probe cap (±2) and at about 1-4× the person count, 2^20, 2^25, 2^30 and 2^31−1 (exact cap boundary in 3e) | on ×4 |
| clickonly | IDs seen only in clicks (aliases 9 to 15), linked and unlinked, upper-case, alias ≥ 16, non-canonical; clicks at session start, −1 s, −1 min and −7 days | on ×4 |
| split | whales and 20 persons scattered across files of 1 to 400 lines, header-only files, missing final newlines, duplicate copies in other files | on ×4 |
| dupuser | 1/30 of events get copies with a different user, earlier or later: another person, upper-case, alias 16, an odd person, a kiosk, `u0…`, or an earlier bad `ts`; 100 events with 4 copies across lanes | on ×4 |
| linkdirt | 300 malformed cross lines that must not join anything; CRLF link file; empty sides; quoted sides | on ×4 |
| intra | 300 persons rebuilt with random forests over aliases 0 to 15; 5% of generator intra lines malformed (splits persons); rows on every alias. Lane F handled 7,010 per-person lines against 2,694 in the base | on ×4 |
| rand_str | every user ID mapped one-to-one to a random string | **off ×4** (sample too small) |
| rand_canon | every user ID mapped one-to-one to a random canonical `u`+base36 | **off ×4** (no key candidate passed) |
| rekey | IDs re-encoded with a new random key | on ×4, recovered key = my new key |
| combined | all of the above at once | b15 off (no key candidate passed); b2481, b537, b1 on |

### 3e. Person-cap boundary: 3/3 MATCH (`mut/capedge.py`)

- The cap `2·(event_bytes div 1800) + 1024` was pinned exactly to 6552, 6554 and 6556 with a padding file. The binary's stderr confirms each value.
- IDs were placed at g = cap−2, cap−1, cap and cap+1 with aliases 0, 1, 15 and 16.
- Links cover: inside cap−1; inside cap (above the cap, so general); cap−2 to cap+1 (odd marking only below the cap); a line above the cap; and a line from cap to cap−3 alias 16.

### 3f. Two keys in one dataset: 4/4 MATCH (`mut/twokeys.py`)

Seeds 15 and 254 share a window, so I merged them (B's event and click IDs get a suffix).

| variant | lane F | key | Lane G share |
|---|---|---|---|
| B last, 20k | on | seed 15's | 27% |
| B first, 20k | off | none | 100% |
| B last, 300k | on | seed 15's | 84% |
| B first, 300k | on | seed 254's | 18% |

In each run, the other seed's IDs go to Lane G, apart from chance in-range decodes.

### 3g. Decoder-independence stress: 18 datasets × 9 configurations, all MATCH (`mut/stress.py`)

- **Switches:** these use the binary's test-only switches, which the scorer never sets.
- **Datasets:** b15 plain plus 13 mutation kinds, and b2481 plain, combined, dupuser and alias16.
- **Configurations:**
  - `SESSIONS_TEST_TWIST=1`
  - `TWIST` with `GCAP=1000`
  - forced key xor 1 (0 rows in Lane F)
  - true key with cap 64 (73.6-100% Lane G)
  - true key with cap 1
  - true key with `TWIST` and cap 300
  - `SESSIONS_SCALAR=1` (the scalar decoder twin)
  - `SESSIONS_PATH=slow`
- **20M set against rel15, both ways, all MATCH:** key xor 1; `TWIST`; true key with cap 50,000 (47.9% Lane G, 263 odd persons); `GCAP=5000` (recovery then fails, so Lane G); `SESSIONS_SCALAR=1`.

### 3h. Kit fixtures, dev, 20M and 60M

| Check | Result |
|---|---|
| Fixtures (`run_fixtures.py`), NCPU 1, 4 and 8 × default and `SESSIONS_LANE=G` | 36/36 in all six |
| Dev, NCPU 1, 2, 4 and 8 × default and G, against `kit/unz/dev-answer` both ways | 8/8 MATCH; Lane G share 1.62% (auto) |
| 20M (`m1data/p20m`, seed 7), default and G against rel15, both ways; auto against G | MATCH (2,242,393 user_daily rows). Lane F on: 873,116 per-person link lines, 21,656 general, 3,630 odd persons, Lane G share 0.98% |
| 60M (`m1data/p60m`), default against rel15, both ways | MATCH (6,643,842 user_daily rows). Lane G share 0.80%; 10,881 odd persons |

### 3i. Container emulation (`c1work_vf1/verify/scorer.sh`)

The emulated container:
- **Filesystem:** an empty static rootfs remounted read-only; `/data` a read-only bind (a write probe fails); `/tmp` a 64 MB tmpfs; `/scratch` and `/output` owned by uid 1000; `/proc` mounted.
- **Process:** `chroot --userspec=1000:1000`, with exactly the README environment (`DATA_DIR=/data OUTPUT_DIR=/output SCRATCH_DIR=/scratch HOME=/scratch NCPU MEM_GB=24`).

| Dataset | Configurations | Result |
|---|---|---|
| dev | NCPU 8 | MATCH the dev answer |
| 20M | NCPU 8, default and G | MATCH rel15 both ways |
| 1M "combined" mutation | NCPU 8, NCPU 1, G | MATCH ref both ways |

In every case: rc 0, 0 bytes on stdout, no files left in `/tmp`, output owned by 1000:1000. An earlier variant without the read-only root (`verify/uid1000.sh`) also matched on dev.

### 3j. Memory and timing

**Peak anonymous RSS** (sampled from `/proc`) is slightly lower than rel15, and file-backed RSS is the page cache. The `info` array is cap × 8 bytes, about 44 MB at 60M.

| Set | rel15 | F1 |
|---|---|---|
| 20M | 1066 MB | 981 MB |
| 60M | 2919 MB | 2763 MB |

**CPU time**, from `c1work_vf1/verify/ab.py` (a copy of `perf/ab.py` with output in my folder, cores 0,1, NCPU 2, interleaved). The machine was shared: CPU pressure was 17-80% during these runs.

| Set | Pairs | rel15 CPU median (min) | F1 CPU median (min) | Change |
|---|---|---|---|---|
| 20M | 9 | 4.948 s (4.210) | 4.554 s (3.929) | −0.39 s, −8% |
| 60M | 4 | 17.58 s (17.12) | 16.70 s (16.24) | −0.88 s, −5% |

This agrees with the engineer's report: a modest gain, and noisy.

## 4. Source review (done after my tests were written)

My review found no exactness defect.
- **`ident::mixed_value`** accepts exactly the canonical form: `u` plus 1 to 8 base-36 digits, no leading zero, value at most 2^40−1. It rejects 9 or more digits before any arithmetic, so mask or overflow aliasing is impossible. My noncanon set also confirms this.
- **`mixed_avx2`** loads 16 bytes, but only lanes below `len` are validated and used. Field starts always have at least 16 bytes of slack: `scan` keeps 160 bytes in place, copies the tail into a padded buffer, and `long_line` pads by `SLACK`. The maddubs/madd weights (36,1) and (1296,1) and the final ×36^4 are correct. The scalar twin matched on real data (stress `scalar`).
- **Links:** a line is regular only if both sides are canonical, in range, share g, and have aliases below 16. Every other line marks each decodable side's g below the cap as odd. Malformed lines and lines with an empty side never reach classification. Odd persons' regular lines go back into the general union-find as packed keys. For canonical IDs these equal `intern()` of the string (they are 9 characters or fewer), so rows of odd persons resolve consistently.
- **Union-find and names:**
  - The 16-nibble union-find never writes nibble 0, so `ODD = 0xF` in nibble 0 is unambiguous.
  - `compress` runs after all unions.
  - `person_name` takes the minimum packed value over the component. The `keys::CODE` order is byte order with 0 as padding, so this is the byte-wise smallest ID.
- **Key spaces:** person keys use FKEY (bit 61), packed keys use bits 0-59 and exotic keys bit 63, so they cannot collide.
- **Dedup** stays keyed by `event_id` across both lanes. The winner is resolved after dedup, so copies that name users in different lanes are handled; my dupuser sets confirm this.
- **With lane F off,** the code is exactly rel15's path (`user_k` falls back to `intern_k`, there is no info array, and `resolve` falls back to `name_of`). The `SESSIONS_LANE=G` outputs equal rel15 at 20M.

## 5. Differences from `verify/ref.py` that predate F1 (not F1 failures)

Both cases behave the same way in rel15. The earlier verification of the previous binary recorded them the same way (`verify/runs/edge_final.txt`).
- **x18b_hidden_csv:** `input::csv_files` skips names that start with `.`; `ref.py` reads them. The rules say "every `*.csv` file", and a shell glob `*.csv` does not match dot-files, so this is ambiguous. The generator never writes such files. It is a file-selection question outside F1; the owner may want to rule on it.
- **x33_click_copies_differ:** this input breaks the rules' guarantee that click copies are identical. It documents behaviour only.

## 6. Notes that do not block F1

These affect performance and documentation only.
1. **The lane F gate depends on file layout.**
   - The key sample takes at most 1,000 lines from each of the first 64 non-empty event files, in sorted order, and needs at least 2,000 canonical user IDs and 200 link lines with both sides canonical.
   - Layouts with few, large files (fuzz.py writes 1 to 8 files) often give "sample too small".
   - A small file of non-generator rows that sorts before `part-*.csv` can give "no key candidate passed". This happened with edge rows named `edge_*.csv` and with heavy dirt (b15 combined).
   - Output stays exact; the run just uses Lane G. With the official generator layout, lane F was on in every seed of 10k events or more.
2. **The whale-chain error** in the C1 log's fact table (section 2).
3. **When lane F is off,** the stderr reason is the only signal. If the organisers' data were ever re-split into a few files, F1's gain would vanish silently, though stay correct.

## 7. Bugs in my own harness (resolved; neither was in the engine)

- **Copies made non-identical.** My first mutation draft upper-cased click lines independently per line. That broke the guarantee that click copies are identical, and both lanes and Lane G differed from `ref.py` in the same way. I fixed it: decisions are now made once per `click_id`, and once per (`event_id`, `ingest_ts`). After the fix everything matched. The discarded results are not counted above.
- **A `$$` in my `eng.sh` wrapper.** For about one minute (fixed at 00:35:15), garbage `SESSIONS_TEST_*` and `SESSIONS_SCALAR` values were passed, which forces the scalar kernel. Runs in that window still matched `ref.py`. To keep the configuration labels honest I reran them: the b1 kiosk and xlinks sets, and the whole first "canon" edge-merge pass. All matched.

## 8. Reproduction

Shorthand:
- `T` = `tracks/shopping-sessions`
- `V` = `$T/c1work_vf1`
- `PY` = `$T/kit/venv/bin/python -B`
- Everything is pinned to cores 0,1.
- `eng.sh` fails with rc 97 if stdout is not empty.

```sh
# build and hash
cd $V/build_src && CARGO_TARGET_DIR=$V/build_src/target CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" \
  taskset -c 0,1 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu && sha256sum target/x86_64-unknown-linux-gnu/release/sessions
# seeds (LABEL:SEED:EVENTS:CLICKS), e.g.
$PY $V/verify/vseeds.py 2 f2481:2481:1000000:250000 f2896:2896:20000:200000 m808:808:1000000:4000000 wc2793:2793:300000:75000
# fuzz
$PY $V/verify/vfuzz.py 100 140 2 ; $PY $V/verify/vfuzz2.py 200 240 2
# edge cases
cd $V/verify && $PY edge.py ; SESSIONS_LANE=G $PY edge.py ; NCPU=1 $PY edge.py ; NCPU=8 $PY edge.py
# mutation sets, edge merges, cap boundary, two keys, stress
cd $V/mut && $PY runmut.py b15:15:60000:60000,b2481:2481:200000:100000,b537:537:100000:400000,b1:1:1000000:250000
cd $V/mut && EPFX=zzedge_ $PY edgemerge.py raw ; EPFX=zzedge_ $PY edgemerge.py canon ; EPFX=edge_ $PY edgemerge.py canon
cd $V/mut && $PY capedge.py b15:15:60000:60000 3 ; $PY twokeys.py
cd $V/mut && $PY stress.py b15:15:60000:60000 plain upper lzero noncanon xlinks kiosk alias16 clickonly split dupuser linkdirt rand_canon rekey combined
# fixtures
cd $T/kit/unz/starter-duckdb/scripts && TMPDIR=$V/tmp NCPU=4 SESSIONS_LANE=G $PY run_fixtures.py ../fixtures -- $V/verify/eng.sh
# 20M / 60M against rel15, both ways
$PY $V/verify/runrss.py $T/perf/bin/rel15 $T/m1data/p20m $V/runs/p20_rel15 2 ; $PY $V/verify/runrss.py $V/bin/sessions $T/m1data/p20m $V/runs/p20_new 2
cd $T/kit/unz/starter-duckdb/scripts && $PY compare.py $V/runs/p20_new $V/runs/p20_rel15 && $PY compare.py $V/runs/p20_rel15 $V/runs/p20_new
# scoring-container emulation (uid 1000, read-only root and /data, 64 MB /tmp)
$V/verify/scorer.sh $T/m1data/p20m $V/runs/sc_p20 8 ; $V/verify/scorer.sh $T/m1data/p20m $V/runs/sc_p20_G 8 G
# timing
cd $V && QUIET=100 NCPU=2 CORES=0,1 $PY verify/ab.py 9 $T/perf/bin/rel15 $V/bin/sessions
```

Logs are in `$V/runs/`:
- `vseeds.log`, `vfuzz.log`, `vfuzz2.log`
- `edge_{default,laneG,n1,n8}.txt`, `edgemerge_pass1.log`, `edgemerge.log`
- `mut.log`, `capedge.log`, `twokeys.log`, `stress.log`
- `fixtures.txt`, `dev_matrix.txt`, `p20_compare.txt`, `p60_compare.txt`, `ab_p20_n2.txt`, `ab_p60_n2.txt`

For a one-line count per log, run `$PY $V/verify/summary.py`. Mutation notes (`*.notes.txt`) and the base datasets are in `$V/data/`.

## 9. Scope and clean room

- **Read:** `kit/rules.md`, the kit generator source, the starter README and scripts, and `verify/{ref,seeds,fuzz,edge}.py`. I ran copies of them: only the paths and the cores 0,1 pinning were changed (diffs in `$V/verify`), and `ref.py` is byte-identical. I also read `perf/ab.py` and `c1work`'s README, Dockerfile, Cargo files and `C1_LOG.md`, and searched our own `README_track.md` and `OWNER_DECISIONS.md` for "hidden".
- **Engineer's source:** I read the `c1work` and `rel15` sources only after the seed, fuzz, mutation and edge suites were written and running.
- **Not opened:** `study/ideas_r67.md`, `study/ref_r67/`, or any other team's code or notes.
- **Writes:** only under `c1work_vf1/` and this file. `rel15`, `perf/bin/rel15`, the data sets and `verify/` were only read or executed. `branch_repo`, `rel1` and `kranti-hackathon` were not touched. No git command was run against a remote.
