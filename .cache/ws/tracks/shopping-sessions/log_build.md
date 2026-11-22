# Build log: Shopping Sessions, milestone 1 (correct Rust pipeline)

All times UTC, 2026-11-21. Machine: 4 cores, shared; builds and timings pinned with `taskset -c 2,3` (2 cores, not the scorer's 8).
Sources used: kit/rules.md (authority), README_track.md, spec_independent.md, OWNER_DECISIONS.md, the kit's fixtures, scripts and generator. No other team's code or notes.

## Decisions
- Rust 1.97.0 (local toolchain; Dockerfile pins rust:1.97.0 by digest). Static glibc binary (`+crt-static`, explicit `--target x86_64-unknown-linux-gnu`), final image `FROM scratch`.
- Libraries: parquet 60.1.0 (default features off; low-level column writer, PLAIN, uncompressed), rayon 1.12.0. 60.2.0 was published today, so the older 60.1.0 (2026-10-28) is pinned.
- Click dedup is skipped: rules say copies are identical, so a duplicate can change neither the credited campaign nor the distinct assist set.
- Hygiene: the owner's rule says no comments or notes in the pushed tree, so the source carries no comments at all; unit tests document the dialect, timestamp, price and link rules instead.
- Lockfile: every locked crate is at least 14 days old (bytes 1.12.1, zerocopy 0.8.63, pin-project-lite 0.2.17, cc 1.10.0, bumpalo 3.20.3, syn 3.0.9 pinned with `cargo update --precise` instead of releases from the last two weeks).

## Pipeline (milestone 1)
1. Read every `*.csv` (not dot-files) of events/, clicks/, links/ plus products.csv, campaigns.csv, manifest.json into memory (rayon, one file per task).
2. Links: dialect-parse, drop empty sides, union-find over interned IDs, name = byte-wise smallest member; map linked ID -> name. Unlinked IDs name themselves.
3. Events: files cut into ~newline-aligned chunks; per line: 7 fields, non-empty event_id, ingest parsed; the copy's own verdict (user, product, ts F1/F2/F3 in window, exact type, purchase price 1..=10,000,000 ASCII digits, not late) computed once; copies hashed into 2^bits buckets by event_id.
4. Dedup per bucket: hash map event_id -> copy with strictly smallest ingest; keep only if that copy's verdict is valid (dedup before validation). Survivors mapped to person name and re-bucketed by hash(name).
5. Clicks: 4 fields, non-empty click_id and user, ts in [start-7d, end), known campaign; routed by person name to the same buckets. No click dedup (copies identical by rule).
6. Per person bucket: sort events (person, ts), clicks (person, ts, click_id); sessionize with gap > 30 min; day = floor(start / 86,400,000); sliding 7-day click window with per-campaign counts gives the credited click (latest ts, smallest id) and the distinct assist set; dense (campaign, day) counters; user-day rows with top category (max sum, smallest name; categories indexed in byte order, `unknown` included).
7. Write Parquet (parquet crate, PLAIN, uncompressed, no dictionary/statistics): user_daily one file per worker, campaign_daily one file; day = INT32 DATE, counts INT64, strings BYTE_ARRAY UTF8, top_category OPTIONAL. Self-check sums to stderr; exit with process::exit (no teardown).

## Results
- Unit tests: 9/9 (dialect, chunking, timestamps incl. leap years and bad forms, prices, links incl. fixture L3 lines).
- Kit fixtures: 36/36 with the static binary (`scripts/run_fixtures.py fixtures -- <binary>`).
- Dev set (seed 1, 1M events): MATCH with dev-answer (117,038 / 27,400 rows). Self-check sums equal.
- Dev-set run time, NCPU=2, taskset -c 2,3 (2 cores, not 8): median 0.569 s of 5 (0.552 to 0.619), max RSS 203 MB.
- Practice-scale 20M events (seed 7, 1.8 GB), 2 cores: 16.2 to 16.7 s, max RSS 3.6 GB. Phases: read 0.6, links 1.1, events 2.9, dedup 6.2 (of which person-name lookups about 3.3 s), clicks 1.4, sessions 3.0, write 0.3 s.

## Independent-style reference and differential tests (scratch only, not shipped)
- `m1tools/reference.py`: a plain Python implementation written from rules.md (dicts, bisect, global dedup dict, click dedup keeping the first copy). It passes 36/36 fixtures and MATCHes the dev answer. Same author as the Rust code, so it is a cross-check, not an independent review.
- Incident: the first differential run showed DIFFER on all 5 seeds. Cause: a stale binary from a timing experiment (person lookups disabled) had not been rebuilt after the experiment was reverted. Fixed by building into a separate target dir with `m1tools/build.sh` before every test round. With the real binary all seeds MATCH.
- `m1tools/diff_seeds.sh`: seeds 2, 3, 15, 62, 272 (15, 62, 272 have windows holding 2028-02-29) and 4 to 13 at 1k to 1M events and click ratios 0.08 to 2.5: all 15 MATCH.
- `m1tools/mutate.py` + `m1tools/fuzz.sh`: generated sets of 20k to 80k events with extra dirt (CR at line ends and inside IDs, F1/F2/F3 rewrites incl. -00:00 and leading zeros, every bad timestamp form, spaces and upper case in IDs, bad types and prices, wrong field counts, stray quotes, duplicate events with other users or equal/earlier ingest, events at exact 30 min and 24 h boundaries, header rows as data, empty and header-only files, missing final newlines, duplicate/self/half-empty links). Seeds 101 to 132: all 32 MATCH.
  - Two early fuzz DIFFERs were mutator bugs, not pipeline bugs: the mutator gave copies of one click_id different values, which the rules exclude ("copies of a click have identical values"). Mutations are now keyed by click_id. Note for later: if hidden data ever broke that guarantee, our "no click dedup" choice and the reference's "keep first copy" would disagree.
- Scale, final binary, NCPU=2, taskset -c 2,3 (2 cores): 20M events (1.8 GB) median 16.7 s of 3, RSS 3.6 GB; 40M events (3.6 GB, seed 21) 40.1 s, RSS 7.0 GB, self-checks equal. Extrapolated 60M: about 65 s on 2 cores and about 10.5 GB RSS; well inside 24 GB and the 180 s cap even before the 4x core count.
- Not verified here: the Docker image itself (no daemon). The Dockerfile's build command was replayed natively with a fresh CARGO_HOME and `--locked`: 52 s on 2 cores, static-pie binary. A uid-1000 run was not possible (the scratch tree sits under a 0700 root directory). The binary writes only to OUTPUT_DIR, uses no /tmp, prints nothing to stdout.
- Formatting: `cargo fmt` (defaults) clean; `cargo clippy --all-targets` no warnings.

## Repository (src_repo/)
Cargo.toml, Cargo.lock, src/ (10 files, about 1,500 lines incl. tests), Dockerfile, LICENSE (MIT, Hrudayangam Mehta), README.md, .gitignore (`/target`). Not a git repository yet; nothing committed or pushed.
Dockerfile: stage 1 `rust:1.97.0-slim-bookworm@sha256:6d220bf8...` builds the static glibc binary; stage 2 `FROM scratch` holds only `/sessions` plus empty /tmp (1777), /data, /output, /scratch; `USER 1000:1000`; `CMD ["/sessions"]`. Image about 2.3 MB.

## Next (milestone 2 candidates, by measured cost on 20M / 2 cores)
1. Person-name lookups in dedup (~3.3 s): batch with prefetch, or resolve names once per distinct user ID.
2. Sessions phase (~3.2 s) and event parse (~3.2 s): fewer slice compares (integer ID keys), faster line/field scanning.
3. Links (1.2 s at 20M, 3 s at 40M): single-threaded union-find; parallelize or overlap with event parsing.

---

# Milestone 2: performance work (performance engineer session, from 18:34 UTC)

All timings: `taskset -c 2,3`, NCPU=2, **2 cores, not the scorer's 8**, on `m1data/p20m` (kit generator, seed 7, 20M events / 5M clicks, 1.8 GB). The machine is shared and noisy (other processes use cores 0-3; repeated runs of one binary vary by up to 2x); comparisons use interleaved A/B runs (`perf/ab.py`) and callgrind instruction counts on the dev set.

## Step 0: verifier divergences (18:40)
- R1 fixed: `manifest.json` is now read with a small top-level JSON object parser (`src/manifest.rs`): nested objects/arrays are skipped, string escapes decoded, last duplicate key wins (as Python's json). Unit test covers the verifier's nested repro, key order, whitespace, escapes.
- R2 (`events/.hidden.csv` skipped) and R3 (click copies with different values) left as is: both are outside what the rules define, the generator never produces them (hidden files never written; "click duplicates: identical values"). Documented, not changed.
- Fallback snapshot `perf/snap/m1_1/` = M1 + R1 fix: 36/36 fixtures, dev MATCH, verifier edge cases 34/36 (the two CHECKs are R2/R3). Binary `perf/bin/m1_1`. The fast path keeps this code as `src/slow.rs`; it runs when the window shape or category count fall outside the fast path's representation (`SESSIONS_PATH=slow` forces it).

## Fast path (src/fast/)
Design per spec_independent.md: mmap inputs; one work queue (links unit first, then event chunks, then click chunks) over NCPU scoped threads; compact 64-bit order-preserving ID keys (6 bits/char for <=10 chars of [0-9A-Za-z_], else an interned "exotic" table with a byte comparator); links -> union-find over an open-addressing table on huge-page memory, name = byte-wise smallest member; events -> 32-byte records hash-partitioned by event key into per-thread block sinks; dedup per partition (smallest ingest, verdict of the kept copy); winners -> person lookup (batched prefetch) -> 16-byte records partitioned by person; clicks parsed after links, person lookup, partitioned by person; per-person partition: local hash ids, radix sort by ts, counting sort by person, sessionize, sliding 7-day click window with per-campaign counts (credit = latest ts, smallest click id; assists = distinct active campaigns); day-major campaign counters; custom Parquet writer; process exit without teardown.

| Milestone | Change | 20M wall (2 cores) |
| --- | --- | --- |
| M1 (fallback) | rayon, slices as keys | 16.7 s (21.4 s under later load) |
| M2a | first fast path (keys, sinks, dedup, per-person) | 3.19 s median of 3 |
| M2b | line-window SIMD scanner, SIMD key packing, SWAR timestamps | ~3.4 s (noisy; instr count -17%) |
| M2c | two-stage block scanner (comma/newline index) | 3.47 s |
| M2d | handler structs instead of closures (closure was not inlined into the AVX2 function, so intrinsics were calls) | instr -10% |
| M2e | own Parquet writer (PLAIN, v1 pages, Thrift compact footer), INT32 counts | 3.20 s |
| M2f | year-month word cache + SWAR time of day, branchless quote check | 2.96 s |
| M2g | people table on huge pages (links 450 -> 150 ms) | 2.68 s |
| M2h | radix sort per partition, day-major counters | 2.48 s (A/B: no measurable change) |
| M2i | write-combining staging + streaming stores in sinks | 2.14-2.25 s (A/B min 2.14 vs 2.41) |

Correctness after M2g/M2h: 36/36 fixtures, dev MATCH, verifier edge 34/36 (R2/R3 only), verifier fuzz rounds 100-124 25/25 MATCH, seeds 201-207 + 15/62/272 (Feb 2028 windows, 30k-1M events) 10/10 MATCH. Every later step: fixtures + dev re-run before timing. Parquet output read back with polars 2.1.0, DuckDB 1.5.6 and pyarrow 18.1.0 (separate test venv, not shipped).

### 20:00-20:30 UTC: measurement method, further steps
- Wall times swung up to 2x while other processes used the cores, so `perf/ab.py` now also records child user+sys CPU time (os.wait4); decisions use CPU-time medians of interleaved runs. Single-thread decomposition (NCPU=1, CPU-s, 20M): parse 2.6 (event scanner ~1.25, field work ~0.65, record push ~0.2, clicks ~0.3, links ~0.15), dedup ~0.9, per-person ~0.95.
- Kept: dedup table storing (key, index) pairs (CPU 4.75 -> 4.52); quote check branchless; SIMD key packing via nibble lookup tables (verified against scalar on 200k random strings incl. all byte values); lazy assist counting per (campaign, day) (no measurable gain, kept: same output, less work for whale persons); pipelined prefetch for person lookups in dedup (neutral).
- Tried and reverted (measured worse or no gain): quote validation by walking flattened quote positions (CPU +11%), click records padded to 32 B for streaming (neutral), people table at load 0.6 (neutral/worse), resolving persons inside the parse loop with a prefetch ring (CPU +7%), partition counts 2^9/2^10 instead of 2^11 (within noise), x86-64-v2 / x86-64-v3 as baseline target (no gain; baseline x86-64 with runtime AVX2/BMI2 dispatch kept).
- AVX-512 masks not used: on Cascade Lake 512-bit integer ops lower the core clock (licence 1) for the whole parse; the saving is ~10 instructions per 64 bytes.

Verification of build m2_pf (= m2_c functionally): fixtures 36/36 (also with SESSIONS_SCALAR=1, i.e. the non-AVX2 kernels), dev MATCH at NCPU 1, 2, 3, 8 and scalar; verifier fuzz rounds 0-39 and 200-229: 70/70 MATCH (NCPU 1-8 drawn per round); edge cases 34/36 (R2, R3 only).

### 60M scale (seed 61, window 2028-02-05..19, includes Feb 29; 5.4 GB CSV), 2 cores
- Fast path: 8.76 s wall, 15.45 CPU-s, max RSS 9.7 GB (includes ~5.4 GB of mapped input pages); links 0.5 s on one thread.
- M1 fallback: 100.7 s, RSS 10.5 GB. Outputs MATCH (6,643,842 user_daily rows, 28,014 campaign_daily rows).

### 20:30-21:00 UTC: mispredicts, teardown, setup
- cachegrind branch simulation (dev set, 1 thread): ~5.7 mispredicted branches per event line (person-table probe, sink flush check, timestamp format dispatch, newline loop). Changes: two-slot branch-light probes in the person table and the campaign/product maps; newline positions flattened two at a time; event type compared as one 4- or 8-byte word; sink staging widened to 128 bytes per partition (flush on every 4th 32-byte or 8th 16-byte record instead of every 2nd/4th). Simulated mispredicts 6.12M -> 5.74M on dev; wall/CPU changes within noise (machine under heavy external load: same binary 4.7-5.6 CPU-s).
- Exit teardown was serial and ~45-50 ms (unmapping the 1.85 GB input alone 26 ms). Now each input file is unmapped by the thread that parses its last chunk, link files after the links build, and P1 records live in their own arena that every thread releases right after dedup. Measured wall minus last internal timestamp: 45-60 ms -> 17-25 ms.
- Setup (serial, ~12 ms): category indexing via a hash map instead of sorting 50k names; products/campaigns parsed with the block scanner on zero-padded buffers; reference data parsed on the main thread while a helper thread maps and chunks the inputs. Setup 11-16 ms -> 8-11 ms.
- Lint: cargo fmt clean, cargo clippy --all-targets clean.
- Build m2_setup2 (snapshot perf/snap/m2_setup2): fixtures 36/36, dev MATCH. A/B vs m2_c (5 interleaved runs): wall median 2.54 vs 2.84 s, min 2.35 vs 2.38 s.

### 21:00-21:25 UTC
- Per-person phase: the local person table is now one (key, id) array sized from the partition (n/16 slots, grows x4 when half full) instead of two arrays sized 2n; final self-check totals accumulated per part (no serial pass over 2.2M rows at the end).
- Person-table probe made branch-free for the first two slots (select_unpredictable plus an arithmetic "both slots busy" test, because LLVM split the boolean condition back into data-dependent branches). cachegrind (dev, 1 thread): mispredicts 6.12M (m2_c) -> 4.63M (m2_rep) -> 4.10M (m2_nb); instructions 1.342G -> 1.335G. The same trick on the small campaign/product map raised simulated mispredicts, so it was reverted.
- Timing during this window was not usable: other processes ran on core 3 (per-CPU sampling showed 26-42% user time from other processes on cpu1/cpu3, steal 0%); identical binaries swung from 2.3 to 6 s. A/B comparisons in this window are not recorded as results.
- Fresh-CARGO_HOME replay of the Dockerfile build command (`cargo build --release --locked --target x86_64-unknown-linux-gnu`, crt-static): 58 s on 2 cores, static-pie binary 2.6 MB, dev MATCH. No build paths or names embedded (strings check).

### 21:25-21:40 UTC: final candidate m2_hist (= src_repo now; snapshot perf/snap/m2_hist)
- Added since m2_nb: P2/click arena released by each thread after the final barrier; output row vectors freed in the worker right after its part file is written; radix histograms reused per worker instead of allocated per partition (instructions 1.335G -> 1.318G, simulated mispredicts 4.10M -> 3.95M on dev).
- Tried and reverted: branch-light two-slot selection in the dedup insert (mispredicts -0.25M but instructions +35M).
- Verification of m2_hist: fixtures 36/36 (default, NCPU=1, and SESSIONS_SCALAR=1); dev MATCH at NCPU 1, 2, 3, 8, scalar kernels, and the embedded fallback (SESSIONS_PATH=slow); verifier fuzz rounds 600-639 40/40; edge cases 34/36 (R2, R3 only); seeds 601, 602 (click-heavy), 272 (Feb 2028) MATCH; 20M practice set: output identical to M1 (2,242,393 / 28,014 rows) and NCPU=8 output identical to NCPU=2; 60M set: MATCH against M1 (6,643,842 / 28,014 rows). pyarrow 18.1.0, polars 2.1.0 and DuckDB 1.5.6 read the files.
- Exit overhead (wall minus last internal timestamp): ~16-18 ms (was 45-60 ms).

## 22:10 UTC Sat: rel15 pushed to branch exp (4bf9d6fe0818038a530ae30fda44dd9b5fac1758)
- rel1 + try/scale/changes.diff (S1 early unmap, R2 sink sizing, R1 block recycling, P2 person-table sizing, D last
  thread writes campaign_daily, B streamed user_daily files, E _exit, C1 worker-side chunk boundaries, C2 one-pass
  products/categories, F MADV_POPULATE_READ). Local rebuild with rustc 1.97.0 is byte-identical to the expert's gated
  binary (sha256 2f3ebac79b60...); fresh-clone rebuild identical too. Fixtures 36/36 at NCPU 1 and 4, dev MATCH at
  NCPU 4 and 8 (re-run here). Expert's gate on the same binary: 6 seeds vs ref.py both ways, 20M output equal to rel1.
- Expert's 8-core estimate 0.77-0.84 s (model, not a scorer run) against rel1's official 0.98 s.

## State at 22:20 UTC (superseded by m2_rec below): binary perf/bin/m2_stage
- Last change: user_id strings written straight into the Parquet page buffer (branch-free decode of packed keys; exotic keys via the interned table), unit-tested against the PLAIN layout.
- Final verification: unit tests 22/22; fixtures 36/36 (also NCPU=1 and SESSIONS_SCALAR=1); dev MATCH (NCPU 1/2/3/8, scalar kernels, embedded fallback); verifier fuzz rounds 700-739 40/40; edge 34/36 (R2/R3 only, undefined inputs); seeds 701, 702 (click-heavy), 62 (Feb 2028) MATCH; 20M and 60M outputs identical to M1. cargo fmt / clippy clean. stdout empty.
- Timing table (20M practice set, NCPU=2, taskset 2,3 = 2 cores, not 8). Quiet-period medians of 3 where available; later entries are interleaved A/B medians because external load made single runs swing up to 2x:

| Build | Wall (s) |
| --- | --- |
| M1 fallback | 16.7 (median of 3, M1 log) |
| M2a first fast path | 3.19 |
| M2e own Parquet writer | 3.20 |
| M2f SWAR timestamps, branchless quotes | 2.96 |
| M2g people table on huge pages | 2.68 |
| M2h radix + day-major counters | 2.48 (A/B median of 5) |
| M2i write-combining sinks | 2.25-2.36 (A/B medians) |
| m2_c (dedup table, packing LUT, lazy assists) | 2.28 (A/B median of 4, 20:27) |
| m2_hist / final | 2.50 median, 2.41 min (A/B at 21:27, under load); best observed 2.35 |

- 60M (final binary, 2 cores): earlier quiet run of m2_pf 8.76 s / 15.45 CPU-s; final binary not re-timed cleanly (runs under load 29-47 s with disk reads after page-cache eviction). Peak RSS dropped from 9.7 GB to 3.6 GB because inputs are unmapped as they are consumed.
- Deterministic cost (callgrind/cachegrind, dev set, 1 thread): instructions 2.176G (M2a) -> 1.312G (final); simulated mispredicts 6.12M (m2_c) -> 3.94M (final).
- Not verified here: Docker image build and run under the scorer flags (no daemon), 8-core timing.

- 22:15 addendum: with more than 2048 partitions (event CSV above ~1.6 GB, which includes the 20M practice set at 4096 partitions and the 60M final at 8192; corrected 23:05, the first version of this line wrongly said 20M was not affected) the sinks stage one 64-byte line per partition instead of two, so the per-thread staging area stays at 512 KB rather than 1 MB (Cascade Lake has 1 MB L2 per core shared by two hyperthreads). Inputs with 2048 partitions or fewer (dev, fixtures, fuzz cases) run the identical code as before. Measured cost of the single line on 20M (cachegrind, 1 thread): +0.4% instructions, -0.9% simulated mispredicts. 60M output with this build: MATCH against M1 (10.7 s wall on 2 cores under external load, peak RSS 3.7 GB). Final binary also: dev MATCH at NCPU=8, fixtures 36/36 with SESSIONS_SCALAR=1, unit tests 22/22.
- 22:35 final binary m2_stage (sha256 953271368aa822b8..., = perf/bin/sessions, source = src_repo = perf/snap/final): verifier fuzz rounds 800-839 40/40 MATCH; edge 34/36 (R2 hidden file, R3 differing click copies only, as documented); seeds 801 (400k/100k, Oct 2026) and 802 (click-heavy 100k/300k, Nov 2027) MATCH; 20M output MATCH against M1, stdout empty. cargo fmt clean, unit tests 22/22.
- Note for the owner: branch exp currently holds rel15 (see the 22:10 entry), a separate line cut from m2_c at 20:03 plus another change set. src_repo is not on exp. Both produce the M1 20M output (checked here, 22:40).

## 22:40-23:05 UTC: m2_rec, memory reuse (final; src_repo = perf/snap/final, binary perf/bin/m2_rec = perf/bin/sessions, sha256 8bbd1083488aa1ec...)
- Finding: on 20M / 2 cores m2_stage had 108k minor faults, 0.6-1.3 GB more page allocations and 1.1-2.5 s sys time per run, against 48k faults and 0.4-1.0 s sys for rel15 (the exp branch). /proc/vmstat deltas: m2_stage faulted ~650 fresh 2 MB pages per run, rel15 ~490. This sandbox is a Firecracker VM with virtio-balloon free page reporting, so freshly faulted huge pages are expensive here (THP off: m2_stage sys fell to 1.0-1.2 s). The scorer (GCE n2) probably pays less for fresh pages, but touching less fresh memory is cheaper everywhere.
- Changes (own implementation, adapted from the ideas in the rel15 change set, which is our own team's line): (1) dedup recycles each partition's P1 blocks, from all threads, into the P2 sink's free list once the partition is copied out, so P2 needs no fresh memory; P1 arenas are released after the final barrier instead of after dedup. (2) user_daily rows are written in files of 65,536 rows from inside the per-person loop (one atomic file counter; thread 0 always writes its remainder so an empty input still yields one file), so row and Parquet buffers stay small and are reused. (3) Sink block sizes follow expected records per (partition, thread): records / (threads x partitions x 4), clamped to 64-512 events (32-512 clicks), so 8 threads no longer leave up to half of each last block unused (estimated 0.7 GB of zeroed but unused memory at 8 threads on 20M with the fixed 512-record blocks).
- Effect (20M, NCPU=2, taskset 2,3 = 2 cores, not 8): minor faults 108k -> 49.5k, fresh 2 MB pages 650 -> 490, page allocations -30%, peak RSS 1.3 -> 1.0 GB. Interleaved A/B, 6 rounds in a quieter window (23:02): m2_rec wall median 2.467 s (min 2.312), CPU 4.77 s, sys 0.66 s; m2_stage 2.618 s (min 2.557), CPU 5.16 s, sys 1.08 s; rel15 2.411 s (min 2.280), CPU 4.70 s, sys 0.75 s; m2_rec with two staging lines 2.463 s. m2_rec and rel15 are within noise of each other.
- Deterministic counts, 20M, 1 thread (cachegrind branch-sim): m2_rec 25.86G instructions / 86.4M mispredicts; rel15 25.37G / 120.3M; m2_stage 25.91G / 86.3M. The extra instructions in m2_rec are the unconditional two-entry newline extraction in the block scanner (+0.59G, -4.3M mispredicts). Single-thread user time, dev set, 15 interleaved rounds: m2_rec median 0.179 s vs rel15 0.185 s; on 20M single-thread (5 rounds) 4.11 vs 4.14 s (within noise).
- 60M (seed 61), m2_rec, 2 cores under external load: 9.64 s wall, user 14.6 s, sys 3.5 s, peak RSS 2.85 GB, 102 user_daily files, output MATCH against M1.
- Verification of m2_rec: unit tests 22/22; fixtures 36/36 (default, SESSIONS_SCALAR=1, NCPU=1); dev MATCH at NCPU 1/2/3/8, scalar kernels and the embedded slow path; verifier fuzz rounds 900-939 40/40 MATCH; edge 34/36 (R2/R3 only, as documented); seeds 901 (Feb 2028, leap day), 902 (click-heavy), 903 (few clicks) MATCH; 20M and 60M outputs MATCH against M1; stdout empty. cargo fmt and clippy clean. No new dependencies, Cargo.lock unchanged.
- Not ported from rel15 (small or unmeasurable here): MADV_POPULATE_READ on input chunks, splitting the last chunks, campaign table written by the last worker, _exit.
- Other load: from about 22:50 another process in this track (try/proc) was benchmarking on the same cores, so all wall times above carry that noise.
- 23:08 clean replay of the image build command for m2_rec (fresh CARGO_HOME, `cargo build --release --locked --target x86_64-unknown-linux-gnu`, crt-static): 53 s on 2 cores, static-pie, dev MATCH. user_daily is now several files of up to 65,536 rows (kit compare reads the directory; rel15 does the same).
- Stopped optimising at 23:10 UTC Sat: remaining ideas (newline-loop form, input prefault, tail chunk split) are below what this shared machine can resolve.

## 01:17 UTC Sun: rel16 = C1 stage F1 (generator-aware person numbers, exact per-row fallback) pushed to exp
- commit 74bd72a0dcffcba7a4a904b8e567011bed14fb73; binary sha256 3a79f86e441d5b4f61bf045c... (byte-identical to the verified F1 binary, also from a fresh clone).
- Verifier: PASS, 1,245 engine runs on 316 datasets match verify/ref.py both ways (VERIFY_F1.md). Re-run here: fixtures
  36/36 at NCPU 1 and 4, dev MATCH at NCPU 4 and 8.
- Gain is small: 20M CPU median 4.87 -> 4.58 s (noisy), 60M CPU 17.8 -> 16.9 s, wall 13.1 -> 12.0 s on 2 cores.

## 02:55 UTC Sun: rel17f2 = C1 stage F2 pushed to exp (owner asked for the F2 hash)
- commit 64a5aec6e15c8af2470ada32bdecd7f9567efa3a; tree = c1work shippable files (src/fast/bucket.rs new; ident.rs, mod.rs, scan.rs);
  Cargo/Docker files identical to rel16; rebuild sha256 ac45af4cf13543216d1ccf8d6f53f931a4e6870b6fbdc71f1a77b1001851c41c.
- Checks here: fixtures 36/36 at NCPU 4; dev MATCH both ways at NCPU 4 and 8 (F2 buckets on). Engineer's A/B: 20M CPU 6.64 -> 4.84 s
  (-28%), 60M 26.4 -> 16.8 s. No stale-file cleanup (rel18 adds it).
## 02:49 UTC Sun: rel17 pushed to exp -> d63287d90e5646f7e3ed87d49669b36186442b5b (rel16 + C2 + t2 + io1 + cleanup; binary 8400980a...)
- Integrator: all four steps merged; full gate PASS (fixtures 36/36 NCPU 1/4; dev MATCH NCPU 1/4/8, scalar, slow; 20M rowdiff identical
  to rel16; 6 seeds x NCPU 1/3/8 vs ref.py; 60M identical). cachegrind dev -7.34% instructions; 20M CPU -0.92 s median (6/8 pairs).
- Next: rel19 = F2 + C2 + t2 + io1 + cleanup (merge on the F2 base).

## 02:48 UTC Sun: official F2 (64a5aec) = 1.8958 s, correct but 2x slower than rel16 (0.9123 s)
- Locally F2 is 28% less CPU than F1 at NCPU 2; never timed on 8 real cores. Its event-key recovery requires >=99% of 6000 samples
  under the number cap (event_bytes/30 + 65536) and >=99% ordered pairs, else F1; a mismatch should fall back, not slow down.
- Control submitted next: rel17 (d63287d, F1 base). If rel17 ~0.85 s: F2 is slow on the scorer, drop the F2 line.

## 02:54 UTC Sun: scorer is now shopping-sessions-5 (owner screenshot)
- v5: rel17 1.7814 s (best, picked), rel16 re-timed 1.8406 s (was 0.9123), F2 1.8958 s. rel15/rel1 "scored under a previous version".
- Page text (v5): "time it once in a fresh container on hidden practice data"; median of 3 if under 20 s; clock = container start
  to exit. Final: 3 runs on ~60M new events; then the top 30+ are retimed 9x in interleaved rounds on 3 fresh datasets alone on one
  idle machine (mean of per-dataset medians).
- Reading: all three ~1.8 s regardless of CPU (F2 -28% CPU) => v5 practice is dominated by something else, most likely a cold
  page cache (1.8 GB at ~1 GB/s). Next: cold-read prefetch (parallel large readahead ahead of the parse queue).
## 03:05 UTC Sun: rel17 independent verifier PASS (rebuild byte-identical 8400980a; fixtures 36/36 at NCPU 1/3/4/8; dev MATCH at 1/3/4/8
  and scalar; 20M identical to rel16 at NCPU 1/3/5/8/16; 60M identical; 18 seeds vs ref.py at NCPU 1/3/8; rerun-into-junk; 6 empty-input
  cases; edge battery = rel16; scanner differential + 80 fuzz sets; reservation fallback under RLIMIT_AS). rel17 is safe as the pick.

## 03:35 UTC Sun: v5 explained (regime analyst)
- Organiser announcement #5 (02:08 UTC): IDs pass through a per-seed keyed bijection and 1 in 8 distinct IDs carry a 32-char hex
  suffix; v5 rules.md: "pipelines must treat IDs as opaque variable-width strings rather than fixed-width or invertible generator
  numbers". Every team's best entry was rescored onto v5.
- Local warm CPU on v5 data (p20m5 = seed 7 regenerated with the v5 generator): all builds ~13.8 CPU-s (rel17 5.49 -> 13.81, F2
  4.53 -> 13.72): lane F never engages; ~55% of CPU is the Mutex-sharded heap interning of long IDs (keys.rs). Official ~0.134 s per
  local CPU-s. Leaders barely moved (0.61 -> 0.60). Cold-cache and slower-machine hypotheses refuted.
- Actions: cold-read, rel19 (F2 base) and the F2 verifier stopped; generator-number code to be removed for compliance (rel17 still
  carries F1, dormant on v5 data). New workflow: two engineers (thread-local interning vs hash-and-verify) + judge/verifier.

## 05:00 UTC Sun: team-67 v5 decode (prose only, study/r67_v5_report.md); engineer C launched
- Their v5 path: lossless ID keys by shape (short base-36 -> integer < 2^42; prefix + 32 hex -> 128-bit key; odd -> exact interned
  fallback), 16-byte records, 2^10-2^11 cache-sized partitions, bitmap prefilter before exact dedup, union-find on its own thread with
  smallest-ID roots, 30-minute bins for sessions (no sort), vector attribution for <= 16 clicks, own Parquet writer, huge-page bump arena.
- Estimate: shape keys alone 1.78 -> ~0.8-1.0 s; all items ~0.45-0.6 s. Engineer C (${T}/v5c) builds shape keys + records + routing on
  rel17 from our prose, never their source; their files carry an opt-out notice for AI tools (owner decided to study them).

## 05:40 UTC Sun: v5a (engineer A, thread-local interning, generator code removed) pushed to exp -> 8060f03af31e0876b3c5cb83207d797c1f59c438
- binary 7c4d837a067dbd39cb94... (fresh-clone rebuild identical). Engineer's gate: fixtures 36/36 (NCPU 1, 4), dev5 MATCH (1/4/8/slow),
  p20m5 rowdiff identical to rel17, 8 v5 seeds vs ref.py, v4 dev MATCH, rerun-into-junk MATCH. p20m5 CPU 13.61 -> 6.62 s (5/5 pairs).
- PREDICTION (v5 official): 0.85-0.95 s (vs rel17 1.78). Judge/verifier (after engineer B) still to run; engineer C (shape keys) running.

## 06:04 UTC Sun: v5afix pushed to exp -> 8d0ea211277f158cb5cc12e8dc16bb255740325e (build A + the judge's empty-ID guard in src/fast/ids.rs; binary 6b6c3a69d67343a6e41e...)
- Judge verdict: A FAIL on crafted data (an empty campaign_id click was looked up as a real campaign: campaign_daily wrong on crafted sets;
  the v5 generator never writes empty IDs, so hidden runs would not catch it); B PASS but slower (7.6 vs 6.5 CPU-s at NCPU 2). Afix passes
  every gate incl. crafted sets, p20m5 identical to rel17, seeds vs ref.py; rebuilt here: fixtures 36/36, dev5 MATCH NCPU 8.
- Same speed as A (official 1.2176 s). This is the correct build to pick as final; next speed gain must come from design C + serial/scaling.
## 06:04 UTC: official afix 8d0ea21 = 1.2422 s (A was 1.2176; same code + guard; machine noise ~20%). Picked as final (correct build).
Gap analysis: 6.6 local CPU-s / 8 vCPUs = 0.83 s at perfect scaling; official 1.22 => ~70% parallel efficiency + serial parts (links on
one thread 0.22 s, setup, barrier, exit). Leaders at 0.60 s need <= ~4 CPU-s AND near-perfect scaling. Design C (16-byte records,
partitioned cache-sized dedup, no interning) is the route; then serial/scaling work.
