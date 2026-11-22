# Release candidate 2 (rel2): integration record

Written 2026-11-22, 00:07 to 01:30 UTC. Not part of the pushed tree. The pushed tree is `rel2/`: `.gitignore`, `Cargo.toml`, `Cargo.lock`, `Dockerfile`, `LICENSE`, `README.md`, `src/`.

## Verdict: GO

RC2 passes every correctness check below. It is faster than rel1 in every paired comparison here. Against rel15, the people phase and setup are faster, but the wall-time difference is within this machine's noise.

- Expected scorer time: about 0.80 to 0.87 s, against rel1's official 0.98 s. This comes from an Amdahl model, not a scorer run.
- Dependencies are unchanged from rel1 (parquet 60.1.0, rayon 1.12.0, libc 0.2.191). `Cargo.toml`, `Cargo.lock`, `Dockerfile`, `README.md`, `LICENSE` and `.gitignore` are byte-identical to rel1.

## Binary and tree

- Binary built here (crt-static, `--release --locked --target x86_64-unknown-linux-gnu`): `rel2_work/bin/rel2`, sha256 `ef3d1332501d254a10c63fd85c005496c0b21c4f9657ec20ba962eaa4918da75`. A rebuild from the final tree is byte-identical.
- Per-file hashes: `rel2_work/rel2_tree.sha256`.
- Diffs: `rel2_work/rel2_vs_rel1.diff` and `rel2_work/rel2_vs_rel15.diff`.
- Step history is a git repository kept outside the tree: `GIT_DIR=rel2_work/git GIT_WORK_TREE=rel2 git log`.
- Hygiene:
  - no comments in `src/`;
  - no event, track or team names (scanned);
  - no `target/` and no `.git` inside `rel2/`;
  - stdout is empty on every run.

## Base chosen: rel1 (10ab5ac), not src_repo

- `src_repo` (m2_rec, perf/bin/m2_rec) was not measurably faster. First A/B, NCPU=4, 5 interleaved runs, wall median:

  | Build | Wall (s) |
  | --- | --- |
  | m2_rec | 1.752 |
  | rel15 | 1.807 |
  | rel1 | 1.805 |
  | step 2 | 1.757 |

  All four are within noise of each other. log_build.md reports the same result: m2_rec ≈ rel15.
- Its files changed after 20:17, and the panel memo (spec_S2 §0) asks for a provenance certification of those changes before use. None exists.
- rel1 is the panel's provenance-safe base. Every expert diff applies to it.

## Merged, in order (each step gated, then timed)

| Step | Source | Content | Gate |
| --- | --- | --- | --- |
| 1 | try/scale `changes.diff`, all 10 changes (S1, R2, R1, P2, D, B, E, C1, C2, F) | Identical to the rel15 tree; binary sha `2f3ebac7…`, as gated by the expert and on exp | Expert gate; re-checked here |
| 2 | try/proc, ported by hand onto step 1 | c6a/c6b: Parquet pages streamed with `writev`, faster column fills, packed-key unpack. c4a/c4d: products.csv mapped, parsed with the SIMD scanner, category hash. c4c: helper thread maps the input folders. `clock.rs`: CPU per lap, start/exit stamps, drain laps, one `write` per stderr line. Scale's D, B and E were kept instead of proc's c1/c5/c7/c9; scale's C1 was kept instead of c4b/c10. | PASS |
| 5 | new, by the integrator | At start, delete `*.parquet` directly in `user_daily/` and `campaign_daily/`. The step-2 build writes a varying number of user files (35 or 36 at 20M). A rerun into a non-empty folder therefore left extra rows; this was reproduced (dev, NCPU 8 then 2: DIFFER). With the fix it is MATCH. The kit says `/output` is empty, so this is insurance only. | PASS |

Step 2 port check: on dev and on the 20M set at NCPU=1, every Parquet file is byte-identical to rel15's (36/36 files on 20M).

## Tried and reverted

- **Step 3, layout B2** (people table keeps only renamed IDs): dedup CPU was higher in 3 of 3 sets (+4 to +6%: 1016 → 1063, 1038 → 1103 and 996 → 1054 ms). This machine's 260 MB L3 holds either table. The gain would need the scorer's smaller L3, and at 60M both tables exceed any L3. Reverted.
- **Step 4, parse AVX-512** (doc comments stripped): same binary with the kernel on and off, parse CPU −2.1%, −1.7% and −3.5% across three sets. Total CPU was unchanged, and wall was within noise at 4 threads. It runs only on VBMI2 CPUs (Ice Lake, not Cascade Lake), and the panel advised against AVX-512 because of frequency licences. Both paths passed the full gate before the revert.
- **Not ported:**
  - layout A1, which duplicates scale's R1;
  - layout's optional join;
  - proc c1/c5/c7/c9/c10 and per-thread file names, which overlap scale's E/B/D/C1;
  - proc's rejected c2/c3/c8.
- **Checked as a possible regression and found to be noise:** rel2's parse phase sometimes measured slower than rel15's.
  - cachegrind on dev shows identical instruction counts in every parse function.
  - Variants of rel2 without the mapper thread or the product table swapped ranks between two runs (`logs/var_n1.txt`, `logs/var2_n1.txt`).

## Correctness evidence (final binary ef3d1332, logs in rel2_work/logs)

- **Unit tests:** `cargo test --release` 22/22.
- **Fixtures:** 36/36 at NCPU 1, 4 and 8, and 36/36 with `SESSIONS_SCALAR=1`.
- **Dev:** MATCH both ways at NCPU 4, 8 and 1, with `SESSIONS_SCALAR=1`, and with `SESSIONS_PATH=slow`.
- **6 random seeds at 300k events** (3169, 5097, 6455, 23128, 29331, 32124; clicks 30k to 300k): MATCH `verify/ref.py` both ways.
- **12 more random seeds at 1M events** (32501, 42541, 47705, 56041, 63965, 64024, 65117, 66217, 66531, 70705, 72162, 96923; clicks 80k to 700k): MATCH `ref.py` both ways at NCPU 4 and at NCPU 8.
  - Windows run from 2025-04 to 2028-07. Seed 66531 (2028-02-16 to 03-01) contains Feb 29.
  - Seeds 3169, 66531 and 32124 also MATCH with the scalar kernels.
- **20M (p20m, seed 7):** output equals rel1's both ways at NCPU 4 (2,242,393 / 28,014 rows). Self-check sums are equal.
- **Verifier edge cases:** 34/36 MATCH `ref.py` at NCPU 2 and 8. The two CHECKs (x18b hidden csv, x33 click copies that differ) are outside the rules, and RC2's output equals rel1's on both.
- **Metamorphic** (panel `meta.py`): `merged_dup` and `tiny` (10,622 event files) on dev MATCH at NCPU 2 and 8. `giant_tenth` on seed 3169 MATCHes `ref.py`.
- **60M** (generated: seed 15, 60M events, 15M clicks, 5.4 GB, 24 event files, window 2028-02-17 to 03-02 including Feb 29):

  | Run | Wall (s) | user / sys (s) | VmHWM (GB) | RssAnon peak (GB) |
  | --- | --- | --- | --- | --- |
  | rel2, NCPU 4 | 9.12 | 14.8 / 3.1 | 7.31 | 3.07 |
  | rel2, NCPU 8 on 4 cores | 16.4 | 18.4 / 4.4 | 7.46 | 3.20 |
  | rel1, NCPU 4 | 9.88 | 15.4 / 4.1 | 9.96 | 4.62 |

  - All runs exit 0, and both rel2 outputs MATCH rel1's both ways (6,618,928 / 28,014 rows).
  - Memory stays far under 24 GB.
  - A first, cache-cold pair took 22.8 s and 15.9 s.
  - `ref.py` was not run at 60M (too slow, too much memory).
- **Build replay:** fresh `CARGO_HOME`, the Dockerfile's command with `--locked`, crates downloaded from crates.io. It built in 58 s as a static-pie binary, and that binary gives dev MATCH and fixtures 36/36. Its hash differs from the local build only by embedded registry paths.
- **Not verified:** the Docker image itself (no daemon here), a uid-1000 read-only run, and a scorer run.

## Timing (20M practice-size set, p20m, page cache warm)

The machine has 4 cores shared with other agents and was 76% busy throughout (load 2 to 17). Treat single wall numbers as ±30%. Paired, interleaved runs are the most reliable. All runs were spawned directly and pinned (`tools/bench.py`, from try/proc). Phase times come from the binaries' stderr laps.

**Paired rel1 vs rel2, NCPU=4, cpus 0-3, 16 interleaved rounds (`logs/pair_rel1_n4.txt`):**

| Measure | rel1 median | rel2 median | Paired diff | rel2 lower |
| --- | --- | --- | --- | --- |
| wall | 2466 ms | 1977 ms | −495 ms (−20%) | 15/16 |
| user+sys | 6.91 s | 5.67 s | −1.22 s | 15/16 |
| sys | 2.35 s | 1.16 s | −1.24 s | 15/16 |
| setup | 13.4 ms | 3.5 ms | −9.9 ms | 16/16 |
| parse | 1385 ms | 1274 ms | −116 ms | 13/16 |
| dedup | 578 ms | 342 ms | −228 ms | 15/16 |
| people | 403 ms | 311 ms | −94 ms | 15/16 |
| after people (write + exit) | 57.5 ms | 11.1 ms | −46 ms | 16/16 |

**rel1 / rel15 / rel2, medians of interleaved runs:**

| Set | rel1 wall | rel15 wall | rel2 wall | user+sys (rel1 / rel15 / rel2) | Phases rel2 (setup / parse / dedup / people ms) |
| --- | --- | --- | --- | --- | --- |
| NCPU=4, cpus 0-3, 7 runs, load 8 to 9 | 2.260 | 2.067 | 2.211 | 5.21 / 4.85 / 4.80 | 4.6 / 1462 / 412 / 371 |
| NCPU=2, cpus 2,3, 7 runs | 6.385 | 5.511 | 5.632 | 6.34 / 5.48 / 5.58 | 4.7 / 3627 / 1166 / 903 |
| NCPU=1, cpu 3, 8 runs | 6.618 | 5.355 | 5.510 | 6.58 / 5.27 / 5.45 | 4.5 / 3564 / 1046 / 790 |

The NCPU=2 set is slower than NCPU=1 because other agents' processes shared cores 2 and 3.

**rel15 vs rel2, paired, NCPU=4, 16 rounds (`logs/pair_n4.txt`):**
- wall +2 ms (rel2 lower in 8/16);
- CPU −88 ms (10/16);
- people −71 ms (15/16);
- parse +68 ms (7/16, noise; see above).

**Deterministic work** (cachegrind, dev set, one thread, AVX2 path):

| Build | Instructions | Mispredicts |
| --- | --- | --- |
| rel1 | 1,356.2M | 6.28M |
| rel15 | 1,304.6M (−3.8%) | 6.28M |
| rel2 | 1,271.8M (−6.2% vs rel1) | 5.95M (−5.1%) |

## Scaling estimate for the scorer (8 vCPU = 4 cores × 2 hyperthreads)

The model is T = S + P/k, where S is serial time and P is the parallel work (one-thread CPU). k is calibrated so that rel1 gives its official 0.98 s.

| | rel1 | rel2 |
| --- | --- | --- |
| Serial S (start-up + setup + after-people) | about 68 ms | about 12 ms |
| Parallel P (NCPU=1 CPU) | 6.55 s | 5.50 s |
| Serial fraction | 1.0% | 0.2% |
| Amdahl limit at 8 threads | 7.5× | 7.9× |

- Calibration: k = 6.55 / (0.98 − 0.068) = 7.2, so rel2 ≈ 0.012 + 5.50/7.2 ≈ **0.78 s**.
- This VM's sys time is inflated by fresh-page costs (virtio-balloon). If the scorer's sys costs are a third of this VM's, the estimate is **0.86 s**.
- Range 0.78 to 0.87 s (−11 to −20%). Most of the gain is rel15's (scale); rel2 over rel15 is worth about 1 to 3%: people −70 to −200 ms CPU, setup −2 ms.
- Links (one thread) stayed off the critical path: 0.63 s against a 6.3 s parse at 60M with NCPU=4.

## Remaining levers (not in RC2)

- AVX-512 kernel: diff ready, gated, and worth an A/B on the scorer if it turns out to be Ice Lake.
- B2 for small-L3 hosts.
- PGO.
- `pread` instead of `mmap` for the inputs.
- Raising parse throughput, which is now about 60% of wall time.
