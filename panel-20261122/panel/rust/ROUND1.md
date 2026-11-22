# Rust pipeline panel: round 1

## Version and execution scope

Reviewed requested corrected build `8d0ea211277f158cb5cc12e8dc16bb255740325e` through the GitHub plugin, then discovered and reviewed live `exp` tip `ad8526b3410bfb6b8b8febff35affe6bd5b42499` in the local checkout. The new tip substantially changes identity representation and overlaps work, so the new tip is the implementation baseline. This report describes static review; benchmark and independent correctness results are owned by the parent and database reviewer.

Production ownership for this round was limited to `src/fast/mod.rs`, the radix helper and Worker buffers. No README, dependencies, Dockerfile, remote branches, or commit messages were changed by this worker.

## Changes implemented

- Retain histogram allocation per worker across all event and click partition sorts.
- Retain event offsets, click offsets, and scatter cursors per worker across partitions.
- Retain initialized radix scratch elements when resizing between partitions. A distribution writes exactly one output slot for every input element; old values cannot enter a result. Prefix counters partition the range `[0,n)` and every input belongs to exactly one bucket. A uniform digit pass is skipped without swapping data and scratch.
- Preserve digit width, stable distribution order, global timestamp order, click tie ordering, session logic, and output formatting.

This removes up to six fresh temporary-vector allocations per occupied event/click partition after warmup (two histogram allocations, two offset allocations, two scatter-cursor allocations). Capacity growth still allocates when a larger partition arrives. It does not establish any wall-time improvement; the parent will measure interleaved builds on the same input and host.

## Function-family audit

| Family | Functions inspected | Finding and disposition |
|---|---|---|
| Entry/build | `Config::from_env`, `main`, `fast::run`, `slow::run`, Cargo release profile, Dockerfile | Runtime AVX2 dispatch remains portable; static CRT and pinned toolchain/container digest are retained. `_exit` is used only after write calls return. Full Docker/scorer parity still requires verification. |
| File discovery | `input::csv_files`, `Files::read`, `map_file`, `map_folder` | Discovery excludes dot-prefixed CSV files; database reviewer is checking against literal rules. No source change by Rust worker. |
| Work slicing | `chunks`, `split_tail`, `next_line`, `populate`, `line_range`, `release_chunk` | Boundary alignment skips one header and gives every data line one owner. AcqRel remaining-chunk count unmaps after all consumers complete. New encoded IDs are owned values or exact interner handles, so no mapped string pointer remains in event records. |
| ID representation | `Key::hash`, `short_scalar`, `long_scalar`, `short_rank`, `short_len`, `Domain::{bytes_of,cmp,cmp_wide,odd}`, `detect`, `exact_k`, `encode_k` | Reversible encoding preserves lengths, leading zeros, and bytes; exotic IDs use an exact-byte interner. Prefix detection is only a representation choice. It must never infer generator user numbers, canonical people, or answers. Existing randomized roundtrip/order tests are valuable. |
| Reference maps | `keys::{pack,unpack,intern,lookup_exotic}`, `SmallMap::{new,slot,get}`, `lookup_k` | Current map empty sentinel is `u64::MAX`; empty encoded key is zero, unlike the former buggy interner. No old empty-campaign sentinel bug for valid clean dimensions. Exotic path is mutex-sharded and allocates two string copies; a risk under all-exotic stress, not justification for speculative rewrite. |
| CSV/SIMD | `fields`, `unquote`, `data_chunks`, `rows`, scalar/AVX kernels, `window`, `spill`, `general`, `fused_region`, `fused` | Caller supplies padded tail buffers for unaligned SIMD loads. Long-line fallback now pads before callback. Preserve parser differential tests for every SIMD width and malformed quote shape. Rust safe wrappers rely on internal padding invariants; no new unsafe code added. |
| Time/price | `parse_timestamp`, calendar parser, `parse_price` | Full `i64` ingest values in current tip remove old seconds-only compact fallback. Prices are bounded before packed payload construction. Calendar fallback handles dates outside precomputed table. Leap-day, offsets, millisecond and late-ingest tests remain necessary. |
| Links | `build_people`, `link_pairs`, `People::{build,intern,name_of}`, `find` | Path-halving DSU followed by bytewise minimum canonical name is exact. Build runs on one queue worker; other threads can parse events concurrently. Link build is still a serial component worth measuring. |
| Event parse | `EventLines::line`, `parse_events*` | Retains all well-formed ID copies through global dedup even if event validation fails. Validation-before-dedup is used only to mark a candidate invalid; it does not suppress earliest invalid copies. Keep this invariant. |
| Dedup | `mark`, `marked`, `dedup`, `Emit::{push,resolve,flush}` | Bitmap is a conservative duplicate-candidate filter. Noncollision bit slots imply singleton; collision slots always run exact key comparison. Invalid earliest copy suppresses later valid copies. Canonical-person routing happens after event dedup. |
| Click parse | `ClickLines::{line,resolve,flush}`, `parse_clicks*` | Valid clicks route through canonical people; ring stores owned keys. Ring flush remains essential before chunk return/unmap. |
| Local grouping | `Worker::{partition,grow_local}`, `radix_by_ts` | Repeated allocation sites identified and improved. Partition input scans and radix remain unchanged. The scatter cursor is rebuilt separately for events and clicks. |
| Sessionization | `Worker::person`, `finish_row`, fallback worker | Session split is strictly `gap > 30min`; a gap of exactly 30min stays connected. Cross-midnight events inherit session-start day. Category aggregation lives until daily row completion. |
| Attribution/assists | sorted click tie groups, active campaign window | Equal-time click IDs are ordered descending so final eligible item has bytewise minimum ID. Seven-day lower boundary is inclusive; current-time click is eligible. Campaign multiplicity counts each campaign once per session. |
| Parquet | `Thrift` encoders, `physical`, `bit_pack`, `encode`, `write`, `user_part`, `campaign_table` | Custom uncompressed PLAIN writer avoids engine startup. Must continue cross-reading schemas, empty tables, null category definition levels, page boundaries, and totals with an independent engine. |
| Memory/concurrency | `reserve`, `region`, `Arena::{alloc,recycle,release}`, `Sink::{push,finish,slices}`, queue/barriers/finals | Arenas release after all person-processing workers have published final parts. Raw sinks use aligned allocations and non-temporal store fence. Generic unsafe Send/Sync bounds are broader than needed, but concrete production records contain scalar values. No new unsafe code added this round. |

## Candidate priorities for subsequent rounds

1. Measure this buffer-reuse patch alone versus live tip; keep only with passing reference output and no meaningful regression.
2. If session/sort work dominates, benchmark per-person small-vector timestamp sorting against full-partition radix, including whale users. Never assume one distribution.
3. Exact session-bin alternative: events in one 30-minute bin are connected; adjacent occupied bins join if next minimum minus previous maximum is at most 30 minutes. Per-bin min/max/count/revenue plus category sums can remove full event ordering. This is a derivation, not implemented or measured. It requires adversarial bin-edge, empty-bin, cross-midnight, and category tests.
4. If setup or end barriers dominate 8-thread traces, share the person work order once and distribute output work without serial tails. Root owns scheduling changes.
5. If all-exotic-ID stress exposes lock contention, consider exact per-worker interning/merge for exotic keys only. This is an unmeasured robustness alternative, not a current default recommendation.

## Primary resources supplied to the panel

- Nicholas Nethercote, *The Rust Performance Book*, heap allocations: https://nnethercote.github.io/perf-book/heap-allocations.html . Used for the explicit allocation-site hypothesis and requirement to measure. Author's source repository: https://github.com/nnethercote/perf-book .
- Rust standard library `Vec` documentation: https://doc.rust-lang.org/std/vec/struct.Vec.html . Used for retained capacity and `resize` initialized-element semantics. Current online docs show Rust 1.100; build remains pinned to 1.97, and the used APIs predate it.
- *The Rustonomicon*: https://doc.rust-lang.org/nomicon/ . Unsafe slice, alignment, concurrency and lifetime audit guidance. The Rust Reference takes precedence where they differ, as the book itself notes.
- Orestis Polychroniou and Kenneth A. Ross, *A Comprehensive Study of Main-Memory Partitioning and its Application to Large-Scale Comparison- and Radix-Sort*, SIGMOD 2014, DOI 10.1145/2588555.2610522: https://www.cs.columbia.edu/~orestis/sigmod14I.pdf . Applicable to cache-sized partitions and memory traffic. This is a foundational performance paper, not claimed to be current SOTA.
- Abseil, *Swiss Tables Design Notes*: https://abseil.io/about/design/swisstables . Exact-key verification after compact hash metadata filtering. This informs review of the conservative bitmap prefilter; no external source code copied.
- Apache Parquet format specification: https://parquet.apache.org/docs/file-format/ . Applies directly to the custom writer's page, footer, logical-type and definition-level checks.

## Status

Round 1 source changes are implemented and ready for parent compilation/gates. No performance claim, successful build, official score, or push is asserted by this report. Round 2 and 3 require further assignments after measured results.
