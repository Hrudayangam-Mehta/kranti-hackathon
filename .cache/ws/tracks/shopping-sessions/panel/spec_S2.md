# Shopping Sessions: panel memo S2 (requirements and performance)

Written 2026-11-21, 20:40 to 21:05 UTC. Submissions close 2026-11-22 16:00 UTC (11:00 EST).
The panel covers requirements and performance in one memo. It is a planning document; the engineers own every code change.

**Sources.** I used only these:
- `kit/rules.md` (the authority), `README_track.md`, `spec_independent.md`, `log_build.md`, `OWNER_DECISIONS.md`.
- The kit generator source (`kit/build/generator/src`).
- Our own scratch measurements in `perf/` and `try/scale/exp/`.
- Five short runs of my own, on a copy of `perf/bin/sessions` (sha256 prefix 1452c8a04a7e5623, copied 20:45 UTC) and on data I generated under `panel/run/`.

I read no other team's code or notes. I did not open `study/` (see section 0).

**Caveat on the timings.** The machine was heavily shared during my runs: load average about 10 on 4 cores. My wall times are noise. CPU seconds, fault counts and phase *proportions* are usable.

---

## 0. Two flags before anything else

1. **Provenance.** A folder `study/` holding `ideas_r67.md` and `ref_r67/` appeared between 20:17 and 20:32 UTC. Its name suggests a study of team 67, and task #10 in the task list still says "clean-room study of team 67". I did not open it.
   - If it holds another team's code or notes, it conflicts with the organiser's 17:08 warning ("Teams that copy other teams may be disqualified") and with the owner's clean-room rule.
   - **Owner decision needed:** confirm what it is. Have the engineers certify that no change committed after 20:17 drew on it, or delete it and re-derive any affected change from rules.md alone.
   - Until then, **`10ab5ac64ad2d034982bc12d85e673d44dd974bc` is the provenance-safe fallback.** It was committed at 20:06:56 UTC, before the folder existed, and it is the current tip of `origin/exp` (checked with `git rev-parse`).
2. **The 60M gate did not test February 29.** The build log says its 60M run (seed 61) "includes Feb 29". It does not: seed 61's window is 2028-02-05 to 2028-02-19, and its click window starts 2028-01-29.
   - Seeds whose event window really contains 2028-02-29 are 15, 62, 249, 254, 272, 355, 537 and 633. Seed 15's window is 2028-02-17 to 2028-03-02.
   - Re-run the 60M gate on seed 15 (section 1.3).

---

## 1. Requirements: what 60M final data can hit that 20M practice may not

The final is about 60M **new** events with a new seed, so a new window and new dirt rates. The 3 timed runs each have a 180 s cap. Correct means exact, row for row. I re-read rules.md clause by clause.

Below, "seen at 20M?" says whether the 20M practice set and the dev check would already exercise the case. Everything marked "no" or "weakly" needs a local test.

### 1.1 Edge list

| # | Clause (rules.md) | Edge the final may hit | Seen at 20M? | Local test (all with the kit generator; tools in section 1.2) |
|---|---|---|---|---|
| T1 | Timestamps: window | The window position is new: it may hold Feb 29 2028, cross New Year, or push the click window (start minus 7 d) into the previous month or year, as far back as 2024-12-25. | Only one window per practice set | Seed scan of 1 to 2,500 (done, section 1.3). Diff fast against `m1tools/reference.py` at 1M events on seeds 15, 62 (Feb 29 in window), 66 (Feb 29 in click window only), 29, 54 (window crosses New Year), 18 (click window crosses New Year) and 410 (2025-01-01 start, click window in 2024). |
| T2 | Window semantics | The manifest is "different for every dataset". The generator always writes a 14-day window at midnight; the rules do not promise that. | No | Hand-edit `manifest.json` of a 300k set: a start of 05:30Z, a 20-day window, a 1-day window. Diff against reference.py. The fast path's guards must route anything outside its layout to `slow.rs`, never to a wrong answer. `verify/edge/x20_long_window` and `x19*` exist; add the non-midnight start. |
| T3 | F1/F2/F3 | F2 offsets that change the date across a month or year end, F3 with leading zeros or more than 19 digits, `-00:00`. Exactly at `window_start`, at `window_end`, and click exactly at start minus 7 d. | Yes, but only near one window | `edge/x05`, `x06`, `x13`, `x21`, `x21b`, re-run on the T1 seeds. |
| T4 | Linked IDs | More chains of 50 to 400 IDs: 3 people plus 1 in 20,000, so about 100 at 60M. | Weakly | Seeds diff at 2M events, plus `edge/x16`. |
| T5 | Linked IDs, shared devices | 0.4% of about 2M people merged into 3 to 6 persons: about 1,300 to 2,700 people each at 60M, with interleaved, near-continuous sessions. A whale may fall inside one. | Weakly (smaller) | **Giant-person stress** (done, MATCH): `panel/tools/meta.py giant_all|giant_tenth` links every user ID (or every tenth) to a new ID `hub0` that has no rows. That gives one person whose name has no events (rule L2) and 14 days of continuous activity. Check counters wider than 16 bits per session and per person. |
| T6 | Links dirt | Upper-cased sides (1 in 2,000) split persons, and an upper-case ID sorts first, so it becomes the name. Self-links, repeats either way round, empty sides. | Yes | `edge/x15`, `x17`; `meta.py merged_dup` also reverses and repeats every link (output must not change). |
| T7 | Events dedup | Cross-file copies, copies naming another user (1 in 64 duplicated events), and a kept copy that is invalid (2% of duplicated events) killing a valid later copy. At 60M the dedup tables are 3 times larger. | Yes (rates), no (sizes) | **Duplicate-every-line** metamorphic test (done, MATCH): `meta.py merged_dup` doubles every event and click line. The output must equal the original's. It also catches table capacity sized from a bytes-per-line estimate. |
| T8 | Dialect | Empty lines, a line that is just `\r`, unbalanced quotes, wrong field counts, a mid-file header line (L3), lines longer than the SIMD window, NUL bytes and controls, non-ASCII bytes (the exotic key path). | Yes at the generator's rates | `edge/x01`..`x04`, `x24*`, `x25`, `x29`. Add an **exotic flood**: rewrite 1% of user IDs with a trailing `é` or to 11 or more characters. The output must equal reference.py's, and time must not explode. That checks the global exotic table under load. |
| T9 | File layout | 24 to 160 event files, the largest holding about a fifth of the rows (about 1.1 GB at 60M), 1 to 3 header-only files, files without a final newline, possibly 0-byte files. | Partly | **Layout metamorphic tests** (done, MATCH): `meta.py merged_dup` makes one big file per folder; `meta.py tiny` makes about 4,500 files of 1 to 200 lines, 30% without a final newline, plus header-only files. Output must equal the original. These need no Python reference, so they also run at 20M and 60M. |
| T10 | Empty inputs | No clicks at all (all organic), no links (all singletons), no valid events (empty tables with the right schema). | No | `edge/x02`, `x23`, `x23b`. Fixtures E5 and E13. |
| T11 | Output | user_daily about 6.6M rows at 60M. A revenue or count sum that overflows a 32-bit column. `day` must be DATE. | 2.2M rows | Read the 60M output with `perf/pa_check.py` (pyarrow), polars and DuckDB. Assert at write time: if any column's maximum exceeds `i32::MAX`, write INT64 (any width is allowed). At 20M, total revenue is already 6.8e9, well above 2^32; per row the maximum is about 6e8 for organic at 60M, safe but within 4x of the limit. `edge/x12_big_revenue` exists. |
| T12 | Output folder | **Observed:** a rerun into an existing output folder with a smaller NCPU leaves stale `part-0000N.parquet` files, which would be extra rows. The scorer probably gives each run a fresh `/output` and keeps NCPU at 8, so the risk is low. | n/a | A cheap guard: at start, unlink `*.parquet` in the two output folders. Test: run NCPU=8, then NCPU=2, into the same folder, then compare. |
| T13 | Container | NCPU larger than the affinity mask. Affinity on non-contiguous CPUs. uid 1000, read-only root, 64 MB `/tmp`, stdout at most 50 MB. | n/a | **Observed:** NCPU=8 under `taskset -c 0,1` exits 0 with the correct output. The Docker run with scorer flags is still unverified here, because there is no daemon. |
| T14 | Memory at 3x | 60M: RSS 9.7 GB, of which about 5.4 GB is mapped input (page cache, reclaimable) and about 4.3 GB anonymous. The limit is 24 GB with no swap. | n/a | Record VmHWM and RssAnon from `/proc/PID/status` on the 60M runs (seed 15 and seed 61). Optional headroom run at 90M events (about 8 GB of CSV; 45 GB of disk free): anonymous memory should be under 7 GB and every 32-bit guard must hold. |
| T15 | Cold cache | The first of the 3 final runs may start with the input not in page cache. | n/a | **Measured** with `panel/tools/resident.py evict DIR`, which calls `posix_fadvise(DONTNEED)`, needs no root, and verifies residency with `mincore`. On 6M events (0.54 GB), cold minus warm was +0.4 to +0.55 s here, so about 1.1 to 1.4 GB/s. At 60M that is about +4 to 6 s on this disk; the scorer's disk is unknown. Either way it is far under 180 s. |
| T16 | Clicks | Copies quoted differently; boundary clicks at exactly 7 d, 7 d + 1 ms, exactly at the start, 1 ms after it; equal-ms pairs (click_id tie). | Yes | `edge/x13`, `x14`, `x28`; fixtures A1 to A12. |

Known, accepted divergences, unchanged: R2 (a hidden `.x.csv` is skipped) and R3 (click copies with different values). The generator never produces either.

### 1.2 Tools made by the panel (scratch only, not shipped)

- `panel/tools/meta.py MODE SRC DST [SEED]`
  - `merged_dup` and `tiny` must leave the output unchanged. They are oracle-free, so they scale to 20M and 60M.
  - `giant_all` and `giant_tenth` change the answer. Compare them with reference.py at ≤ 1M events.
- `panel/tools/resident.py check|evict DIR...`: page-cache residency check and eviction, for the cold-cache test.

Results on seed 4243, 300k events, with a copy of the current binary: all four modes MATCH (giant: 14 / 14 and 29,679 / 29,679 user_daily rows against reference.py). A smoke test on seed 15 at 20k also gave MATCH.

### 1.3 Gate before every submission (no submission without all of it)

1. Fixtures 36/36 at NCPU 1 and 8, plus `SESSIONS_SCALAR=1`.
2. Dev MATCH.
3. Edge cases 34/36, where R2 and R3 are the only CHECKs.
4. Verifier fuzz: at least 20 rounds.
5. `diff_seeds.sh` on 15, 62, 66, 29, 18 and 410 at 1M, plus 2 random seeds at 2M.
6. `meta.py merged_dup` and `tiny` on the 20M set, compared with the commit's own unmodified 20M output.
7. Once per candidate for the final: 60M on seed 15 and seed 61, MATCH against the M1 fallback (`SESSIONS_PATH=slow`). Record CPU-s, RSS, VmHWM and RssAnon.
8. A native replay of the Dockerfile build with a fresh CARGO_HOME and `--locked`.
9. Hygiene: no comments or notes, no event, track or team names.
10. The commit is pushed to the public `exp` branch, never force-pushed.

Every rejected submission costs one of the two slots per hour. Skipping the gate is never worth it.

---

## 2. Performance

### 2.1 Where the time goes now (20M, seed 7, 1.8 GB)

Measured:
- **2 cores:** wall 2.14 to 2.25 s, about 4.5 CPU-s.
- **4 cores, shared** (`try/scale/exp/ab_last.txt`, best run): wall 1.34 s, CPU 4.7 to 6.0 s (user plus sys).
- **Phase split on 4 cores:**

| Phase | Time | Share |
|---|---|---|
| setup | 14 ms | serial |
| parse | 668 ms | 50% |
| dedup | 282 ms | 21% |
| people (sessions and attribution) | 340 ms | 25% |
| write | 10 ms | |
| exit (teardown after "write") | 25 to 78 ms | serial |

- **Links** finish at 154 to 287 ms on one thread, overlapped with the parse.
- **Single-thread CPU decomposition** (log_build.md):
  - parse 2.6 s: event scanner 1.25, field work 0.65, record push 0.2, clicks 0.3, links 0.15;
  - dedup 0.9 s;
  - people 0.95 s;
  - plus sys 0.55 to 1.1 s. My runs: sys 0.96 to 1.13 s and about 100k minor faults per run, which is 15 to 20% of all CPU.
- **Counts:** 21.58M event copies, 19.56M surviving events, 5.08M clicks, 1.20M linked IDs, 3.40M sessions, 36.9M assist increments, 2.24M user_daily rows.
- **Branch mispredicts** (cachegrind branch-sim on the dev set, `perf/cg/cga.txt`): 6.1M for 1.32M input lines, about 4.6 per line. The top sites are:
  - the staging-slot flush in `sink.rs` (830k);
  - people and keys hash probes (727k + 337k + 239k);
  - the F1/F2/F3 dispatch in `ts.rs` (636k; the forms are a random 58/10/32 mix, so the branch is random);
  - the scanner bounds loop (404k + 289k).

  At 15 to 20 cycles each, that is about 70 to 90 cycles per line: probably the largest single item in the parse. The simulator is crude, but data-random branches are mispredicted on real hardware too.

### 2.2 Estimates for the scorer (8 vCPU = 4 cores × 2 hyperthreads)

**Model:** T = S + W / (E · n_eff · r). The calibration k = T(S1) / W(S1) replaces the guesses once S1 has a score.

| Symbol | Meaning | Value used |
|---|---|---|
| W | Parallel CPU work, in sandbox core-seconds | measured |
| n_eff | Effective cores | about 5 (4 cores, plus 15 to 35% from hyperthreading) |
| r | Per-core speed against this 2.1 GHz Xeon | 0.9 to 1.3 (n2 all-core turbo 3.4 GHz, older core) |
| E | Parallel efficiency (3 barriers, tails) | 0.8 to 0.9 |
| S | Serial setup, exit and tails | 0.05 to 0.10 s |

| Data | W (sandbox CPU-s) | Scorer estimate (warm) | Notes |
|---|---|---|---|
| 20M practice | about 4.7 | **about 1.0 s (0.8 to 1.5)** | Around board rank 50 to 70 today (rank 50 is 0.84 s). Phase split as above: parse about 0.5, dedup about 0.2, people about 0.25. |
| 60M final | 15.45 (measured, 2 cores; 3.36x the 20M CPU for 3x data, so 12% superlinear) | **about 3.5 s (2.6 to 5)** | Cold first run: +4 to 20 s. M1 fallback alone: about 30 to 40 s. Either way at least 7x under the 180 s cap. RSS 9.7 GB, under 24 GB. |

**The critical path is parse → dedup → people**, with barriers between them. Two things get worse as the parse gets faster:
- The serial pieces (setup 12 to 40 ms, exit 25 to 80 ms, three barrier tails) are about 8% today but would be 30 to 40% of a 0.3 s run.
- The single-thread union-find (150 to 290 ms here, slower on a hyperthread) is hidden behind the parse today. Clicks wait for it, so it lands on the critical path once the parse drops below about 0.3 s on the scorer.

**What 0.30 s means.** It is 1.8 GB in 0.3 s, about 6 GB/s: roughly 60 ns per input line all-in, at about 5 core equivalents. We are at about 220 ns, so reaching 0.3 s needs about 3.5x less CPU. That would be W ≈ 1.35, budgeted as:

| Part | Budget |
|---|---|
| parse | 0.8 (scanner 0.3, fields 0.3, push 0.1, clicks and links 0.1) |
| dedup | 0.25 |
| people | 0.25 |
| sys | ≤ 0.1 |
| serial | ≤ 30 ms |

**Realistic plan:** items 1 to 8 below reach W ≈ 2.2 to 2.6, which is **about 0.45 to 0.6 s** on the scorer. 0.3 s needs all of them plus item 9.

### 2.3 Ranked optimisations

Gains are in sandbox CPU-s at 20M (out of about 4.7). Divide by about 5 for scorer seconds until k is known. Every item lands as **its own commit on top of the previous one**, so each is submittable and bisectable. Decide on local CPU-s medians of interleaved runs (`perf/ab.py`, about 3% precision), never on scorer scores (±20% machine noise).

| Rank | Item | Gain (CPU-s / scorer s) | Correctness risk | How to verify |
|---|---|---|---|---|
| 1 | **Branch-free hot parse loop** (detail 1) | −0.5 to −1.0 / −0.10 to −0.18 | Low to medium (pure functions with scalar twins) | Branch-sim mispredicts per line from 4.6 to ≤ 1.5 (deterministic). Every rules.md timestamp form, plus 10M random mutations of valid strings, compared fast against scalar. Full gate. |
| 2 | **Faults, zeroing and exit (the sys time)** (detail 2) | −0.3 to −0.6, plus −20 to −60 ms serial / −0.08 to −0.15 | Low; pread changes chunk-boundary code | `ru_minflt` from about 100k to < 10k; sys < 0.2 s. Exit gap (reap time minus the "write" timer) < 10 ms. Chunk sizes forced to 1 KB and 7 B in a test mode, then fixtures plus `meta.py tiny`. |
| 3 | **Line-at-a-time scanner** (detail 3) | −0.5 to −0.8 / −0.10 to −0.15 | Medium (the dialect is the riskiest code) | Scalar twin. A random-line differential: 100M lines drawn from a grammar of valid and invalid fields, compared fast against `csv.rs`. `edge/x25`, fuzz, full gate. |
| 4 | **Dedup and people probes, partitions sized for the scorer's cache** (detail 4) | −0.2 to −0.4 at 20M, −0.8 to −1.5 at 60M (removes the 12% superlinearity) | Low | Dedup winner and loser counts unchanged (they are logged). The 60M/20M CPU ratio drops to ≤ 3.1. Seeds diff. |
| 5 | **PGO build** (detail 5) | −5 to −12% overall (−0.25 to −0.55) | None at the source level; build risk | Native replay of the Dockerfile with a fresh CARGO_HOME. No profile-mismatch warnings. A/B. Gate. |
| 6 | **Serial start-up** (detail 6) | −10 to −30 ms wall (3 to 10% at the target) | Low | The setup timer reads ≤ 5 ms. |
| 7 | **Links and clicks off the critical path** (detail 7) | 0 today; −0.05 to −0.15 s wall after items 1 and 3 | Medium (identity rules) | At NCPU=4 the timers show links finished before the last event chunk. Fixtures L1 to L4, `edge/x15`..`x17`, `meta.py giant_*`. |
| 8 | **Barrier tails and thread scheduling** (detail 8) | −10 to −30 ms at 8 threads | Low | Per-thread busy time against phase wall time: idle ≤ 3%. |
| 9 | **Memory layout: links-first routing with slim dedup records** (spec_independent §6.1) (detail 9) | −0.3 to −0.5 | High | Only if items 1 to 8 are done and at least 6 h remain. |
| 10 | Parquet writing (10 ms) | none | n/a | Leave it. Only add the INT32/INT64 overflow guard (T11). |

**Details for each item:**

1. **Branch-free hot parse loop.**
   - Timestamps: compute the F1/F2 candidate (shared 19-byte SWAR prefix plus the offset) and the F3 candidate (SWAR over up to 16 digits) unconditionally, then select by length class with conditional moves, carrying validity as a bit.
   - Quotes: strip by arithmetic (start += q, end −= q), and validate with mask algebra.
   - Event type: a table compare.
   - Sink flush: the staging-slot flush mispredicts about 0.5 per record because 2 records fill a 64 B slot. Use 4 to 8 records per slot with a 2^9 to 2^10 fan-out, so staging stays at about 128 KB per thread.
2. **Faults, zeroing and exit.**
   - Input: `MADV_POPULATE_READ` on each chunk just before parsing it, with a silent fallback below kernel 5.14. Or `pread` into reused, L2-sized per-thread buffers: no file PTEs to fault in or tear down. `try/scale/exp/touch.c` already compares these four modes; log its numbers.
   - Arenas: reuse the P1 arena for the people phase instead of faulting fresh memory.
   - Exit: release consumed input mappings and arenas before the final write, while the threads would otherwise wait.
   - Never `WILLNEED`-sweep all files on the main thread; prefetch one chunk ahead in each worker instead.
3. **Line-at-a-time scanner.** One 64 to 128 B mask window per line. All six comma positions come from an unrolled `tzcnt`/`blsr` sequence. Quote validity: quote bits must lie within field starts or ends, with each field's start and end matched. A slow path handles only lines longer than the window or with odd structure. This item and item 1 overlap; together they are the route from 2.6 to about 1.0 CPU-s of parse.
4. **Dedup and people probes.**
   - Branch-free SIMD bucket probes: 4 keys per 32 B bucket, one AVX2 compare.
   - Partition counts from the exact per-partition counts, targeting ≤ 256 KB per table. Cascade Lake has 1 MB of L2 per core, shared by 2 hyperthreads; this sandbox has 2 MB per core with no hyperthreading, so tuning here oversizes partitions. Read the L2 size from `/sys/devices/system/cpu/cpu0/cache/index2/size` at run time, fall back to 1 MB, and keep an env knob for A/B.
   - A small bit filter in front of the people table, to skip DRAM lookups for unlinked IDs.
5. **PGO build.** Profile on our own dev and 20M sets with the rustc 1.97 `llvm-tools`. Commit only the `.profdata` (rustc reads it without `llvm-profdata`). Add `-Cprofile-use` to the Dockerfile's RUSTFLAGS.
6. **Serial start-up.** Parse products.csv (50k lines) and campaigns in parallel work units; categories are needed only for valid purchases. No serial arena pre-fault. Open and map files in workers.
7. **Links and clicks off the critical path.** Parse clicks by user key and map them to persons in the dedup phase, so clicks never wait for the union-find. Or parallelise the union-find with CAS on a dense parent array.
8. **Barrier tails and thread scheduling.**
   - Split the last 10% of parse ranges into 0.5 to 1 MB units; size dedup units equally; keep largest-first for people.
   - Waits: spin, then futex.
   - Threads: exactly NCPU, pinned to the affinity list (not 0..N-1), with pinning errors ignored.
9. **Links-first routing with slim dedup records.** It removes one full shuffle and the person-lookup pass. It needs links before events, so it needs item 7's parallel union-find first.

**Not recommended:**
- AVX-512: Cascade Lake drops its clock under 512-bit work, and the saving is about 10 instructions per 64 B.
- `target-cpu=native`, or x86-64-v3 as the baseline: measured, no gain.
- More threads than NCPU.
- Process-exit tricks (a child that outlives PID 1).
- Removing the slow-path fallback or the self-checks, which cost about nothing.
- Anything taken from another team.

---

## 3. Slot plan (2 per rolling hour, one entry in the queue at a time; scoring p50 about 1 min, p95 about 2.6 min)

Times are UTC, with EST in brackets. The owner submits each one: repo URL plus the 40-character SHA from `exp`. For each submission, record SHA, time, score, exit code, OOM flag, and missing, extra and differing rows per table, next to the local CPU-s of that commit.

| Window | Slot A | Slot B | Purpose |
|---|---|---|---|
| 21:00 to 22:00 (16:00 to 17:00) | **S1 = 10ab5ac64ad2d034982bc12d85e673d44dd974bc** | S1 again | Correctness on hidden 20M data; calibration k = T(S1) / W(S1), using a local NCPU=4 median of 5 runs; the noise band from 2 samples |
| 22:00 to 23:00 (17:00 to 18:00) | V1 = item 2 + item 6 | Re-time the leader | Low risk, sys time and start-up |
| 23:00 to 00:00 (18:00 to 19:00) | V2 = item 1 | Re-time the leader | Branch-free parse |
| 00:00 to 02:00 (19:00 to 21:00) | V3 = item 4, V4 = item 5 (PGO) | Re-time | Cache sizing for 60M, PGO |
| 02:00 to 12:00 (21:00 to 07:00) | V5 = item 3, V6 = item 7, V7 = item 8 | Re-time | Built and gated overnight, submitted as each passes **if the owner is awake**. Otherwise nothing is lost but samples. |
| **12:00 (07:00): code freeze** | | | No new code after this |
| 12:00 to 14:00 (07:00 to 09:00) | Re-time candidates 1 and 2 | (twice each) | Section 1.3 step 7 on both (60M, seeds 15 and 61; add 29 and 410 at 20M) |
| 14:00 to 15:00 (09:00 to 10:00) | **Pick the final explicitly** | | Confirm the branch is public and the commit reachable |
| 15:00 to 16:00 (10:00 to 11:00) | No submissions | | Buffer |

**If S1 fails:**
- The counts locate the bug. Differing campaign_daily rows only means attribution; extra user_daily rows means identity or dedup.
- Stop all performance work.
- Bank a valid score with the M1 fallback (`perf/snap/m1_1`; 36/36, dev MATCH, 15 seeds) as its own commit in slot B.

**Reading a result:**

| Result | Meaning | Action |
|---|---|---|
| Correct, and the score is within ±20% of k × W(variant) | The calibration holds | Use local CPU-s for every decision |
| Correct, but outside ±20% of the prediction | Unexplained | Re-time before believing it |
| A variant "wins" | Only if it is more than 15% below the leader on one sample, or more than 10% below on the mean of two | Otherwise it is noise |
| Wrong rows | Bug | Revert the leader to the previous commit and bisect locally with the counts as hints |
| Nonzero exit or OOM | Crash or memory | Reproduce at NCPU=8 on 4 cores, and on the 60M set |

**Choosing the final entry.** Candidates must:
- have passed the whole gate, including both 60M runs;
- have at least 2 correct practice scores;
- pass the provenance check (section 0).

Among these, pick the **lowest mean practice score**. If two are within 5%, which is inside the noise, pick the one with the lower local 60M CPU-s, and then the one earlier in the commit stack (fewer risky changes). Never pick a commit with a single score or without the 60M gate. If nothing newer qualifies, the final is 10ab5ac.

The pick must be set explicitly. Otherwise the best practice score becomes the final by default, and a lucky but fragile variant could become our final.
