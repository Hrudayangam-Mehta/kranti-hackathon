# Shopping Sessions: complete architectural gap map

## Scope, provenance and interpretation

This document maps the current Team 67 source architecture to the independently developed C, `bins-plain`, and new `bins-flat` pipelines. It records algorithms and correctness contracts, not copied implementation. No competitor source, comments, identifier tables, or generated constants were imported into our submission. The source inventory below covers every competitor Rust module and every function **class**; it is not a claim of line-by-line formal verification of approximately 1,200 functions including tests and legacy variants.

Source pins:

- Team 67: `jason-scheffel/express-lane`, `1cda738c004b3b186b878bdb8eee6516bfa9f22a`, local read-only inspection under `competitors/express-lane`. Public tree: <https://github.com/jason-scheffel/express-lane/tree/1cda738c004b3b186b878bdb8eee6516bfa9f22a>.
- Original C: `Hrudayangam-Mehta/kranti-hackathon`, `ad8526b3410bfb6b8b8febff35affe6bd5b42499`; source `src/fast/mod.rs` SHA-256 `c00333c706dbe7fe0edaaa003091e73b01340ca2c5b2890b0422bb5a1e77f8e6`.
- `bins-plain`: `src/fast/mod.rs` SHA-256 `1d0c74d0db3872ac7c975950146a3a37b7154dc0b5523304fa40c1e8f891e26f`, measured binary SHA-256 `59d0ed1f37553de7e39dc5ac7411d20c84f36abdadbc6eeb388c4a28ec34f107`.
- New isolated `bins-flat`: `src/fast/mod.rs` SHA-256 `684f3adb0dddf7ace57241bd7bc29c7ac8928c297d71c96375bb891833cf1631`, binary SHA-256 `4d94bc67880dc41fd5ce2bae869528b278ab045808da68447061ffd217e7c52c`. This is a new candidate, not the already measured bins checkpoint. Its standalone patch is `panel/algorithm/bins-flat.patch`.

All measurements are local receipts, not an official score. The visible official Team 67 score has no verified receipt binding it to the pinned commit. Public source availability and a newer repository commit also do not establish which commit was submitted. Source was read on 2026-11-22 UTC.

## Why the next round must change representation

Fresh 20M measurements established a useful checkpoint but not competitive parity. `bench/results/p20-round3-n8.json` records median elapsed times of 0.801986 s for C, 0.737272 s for `bins-plain`, 0.848183 s for the rejected purchase-linked trial, and 0.315713 s for pinned Team 67. Thus bins improved on C by about 8.1%, while still taking about 2.34 times Team 67's elapsed time. The rejected purchase-linked design still followed pointers; it did not test a contiguous purchase vector.

The more consequential result is `bench/results/f60-round3-n8.json`: all three C and all three `bins-plain` executions terminated with signal 9, at recorded peak resident sizes around 3.39–3.43 GiB. Team 67 completed all three runs, with median 2.402347 s and median peak RSS 2,498,208 KiB. These terminations are consistent with memory pressure, but signal 9 alone does not prove the cause. The current tool environment does not expose `/sys/fs/cgroup/memory.max` or `memory.events`, so the exact enforced limit was not independently read. This is a local execution failure, not evidence that the official 24 GB environment would kill these builds.

The failing logs contain setup and link completion, but no dedup completion lap. Consequently the extra per-person bin vectors cannot explain the original failure by themselves: the program had not reported completion of the event/dedup phases. Prioritize input-record footprint, candidate expansion, overlapping lifetimes and link-table storage before reducing a few per-worker bin arrays.

The earlier round-1 timings were contaminated by other work, including one 7.794 s independent Python model run. Those timings should not decide promotion. The quiet round-3 receipts above supersede them for the listed builds; any new combined build needs its own receipt.

## Complete competitor module map

The pinned tree contains 20 Rust modules. Repeated notice comments inflate source line counts; line counts are not implementation complexity measurements. The active opaque-ID pipeline is principally `main`, `setup`, `sys`, `iface`, `k_free`, `v3b`, and `pqw`, with the four `generic` modules as the full fallback. Legacy modules remain compiled and contain additional algorithms, but their presence is not evidence that a timed opaque-ID run executed them.

| Module | Complete function classes / responsibilities | Relationship to current workload and independent action |
|---|---|---|
| `main.rs` | CLI and environment parsing; startup; optimized/generic dispatch; timing; pipeline launch; process exit. | Setup selects the opaque-ID branch when forced or when older key recovery does not succeed. Trace the actual branch if attributing stage timings. Keep our simple, documented env interface. |
| `setup.rs` | Directory discovery; file/header mapping; reference-table parsing; time-window setup; serial/parallel setup tasks; samples and old-path selection; worker sizing and mapped-address arrangement. | Independently retain exact discovery of every allowed input CSV, header handling, manifest parsing and fallback guards. Do not reproduce generator-key recovery. Canonical reference-table constraints can select a fast path only with exact fallback. |
| `sys.rs` | OS calls, file mappings, custom allocation/arenas, huge-page/population/advice hints, page release, thread work distribution, affinity/spinning/barriers, signal/re-exec fallback, timing and profiling support. | Reuse of stage memory and prompt release of input pages are major opportunities. A fault-triggered re-exec is not a substitute for proving our unsafe bounds. Our normal fallback before computation is easier to reason about. |
| `iface.rs` | Parser traits/interfaces; aligned scalar/column batches for events, clicks and links; batch initialization and sink callbacks. | Batch parse-to-partition fusion already exists conceptually in C. Compact intermediate columns and delayed expensive lookup are opportunities, subject to lifetime and tail bounds. |
| `k_free.rs` | Optimized delimiter/field kernels; short/wide/exotic ID decoding; integer/price/time parsing; row validity; multirow SIMD event/click/link scanning; scalar/tail and unusual-field handling; kernel tests. | This is the optimized opaque-ID parser kernel. Current source requires a high SIMD feature set at compile time. Our runtime AVX2/scalar dispatch is a useful portability property and should remain. Optimize measured parsing work without assuming SIMD always wins. |
| `k_ref.rs` | Reference field and row parsing; ordinary product/campaign/ID/time conversions; validation helpers and tests. | Equivalent to our scalar/general semantics and a differential reference. Preserve exact bytes, milliseconds, quoting and null rules. |
| `v3b.rs` | Exact opaque-key classes and dictionaries; variable-width records; parse callbacks; chunk queues and partitioning; link components/alias lookup; exact dedup; staged user grouping; canonical-run merging; bins and session summaries; purchase/category aggregation; click attribution; user/campaign output; scheduling and profiling. | Main current architecture. Its advantages are distributed across representation, lifetimes, alias routing, grouping and output, not one special session routine. Each stage is mapped below. |
| `pqw.rs` | Parquet schema/metadata encoding; primitive and dictionary columns; null/RLE/bit packing; page and row-group framing; statistics and offsets; streaming/buffered writes; encoding tests. | Shared by active and legacy paths. Active v3 writes dictionary users/categories and chooses integer encodings. We should introduce narrowly gated dictionary encoding only after timing output separately and retain dual-reader validation. |
| `generic/mod.rs` | Full general execution orchestration; input mapping; reference loading; event/click/link scheduling; dedup and canonical grouping; session/output assembly. | Exact fallback for input shapes outside optimized bounds. Existing C `slow.rs` plus reference modules fills this role. This path needs regular adversarial execution, not merely successful compilation. |
| `generic/core.rs` | General record structures; partition buffers; link connected components; exact dedup tables; grouping and session/attribution state; output row structures. | General strings and wide values provide a correctness safety net. Our fallback should remain independently testable against the specification oracle. |
| `generic/parse.rs` | General CSV fields/lines/chunks; manifest and timestamp/numeric parsing; reference, event, link and click validation. | Relevant to malformed rows, optional quoting, noncanonical IDs and times. Do not silently truncate unsupported fields into the fast representation. |
| `generic/util.rs` | General maps/hashers; read-only mapping; exact byte-key helpers; parallel work execution and filesystem utilities. | Ordinary fallback infrastructure. No need to transplant the competitor's framework. |
| `keyrec.rs` | Ordinary ID/time helpers plus sample collection, inverse transformations and legacy generator-key recovery. | The generator-recovery functions are explicitly excluded from our redesign under current opaque-ID rules. Encoding observed bytes exactly is allowed; recovering hidden generator state is a different operation. |
| `parse.rs` | Legacy parser orchestration, parse buffers and stage-one scheduling; typed row collection; some setup and shared parsing support. | Inventory the dependency edges; do not assume its legacy record layout is the active v3 layout. Reuse only ordinary algorithmic contracts independently. |
| `links.rs` | Legacy compact identity tables, link sorting/partitioning, component construction, representative/alias tables, CSR/routing plans, validation and profiling variants. | Current v3 has its own corresponding link implementation. Canonical minimum and memory-efficient components are relevant; many old-path specializations are not. |
| `events.rs` | Legacy event deduplication, partition runs, skew handling, sorting/grouping, compact record transformations, and session-related vector kernels. | Useful as architectural inventory only. Benchmark-based claims must refer to active v3 functions. Preserve arbitrary observed IDs and exact earliest-ingest winner semantics. |
| `core.rs` | Legacy compact column buffers, grouped-run/session state, campaign/assist primitives, supporting value operations and tests. | Similar concepts exist in v3 and our Worker. Some grep references to `core::arch` are standard-library references, not calls into this module. |
| `complex.rs` | Legacy exceptional/wide identity reconciliation and grouping, plus stage-four orchestration. | Wide/exotic fallback reconciliation is essential; the legacy implementation itself is not a needed import. |
| `ckix.rs` | Legacy click indexing and grouped click-range construction. | Main v3 has independent click grouping/adaptive attribution. Our existing stable click order already satisfies the contract. |
| `out.rs` | Legacy output planning, specialized zero/null/revenue row layouts, row groups, output/campaign aggregation, overlapping final stages and writer checks. | Do not attribute every legacy output optimization to measured v3. Active v3 calls `pqw` directly. Any independently selected output change needs a separate measured benefit. |

## Our complete module map and ownership

Our 22-module tree is much smaller, and the correspondence is many-to-one. The full original-C to `bins-plain` function-by-function audit is in `FUNCTION_REVIEW.md` (48 original functions, 49 checkpoint functions, seven impl blocks in `fast/mod.rs`). It remains a checkpoint audit, not a claim that new compact or flat changes were already reviewed by that table.

| Our modules | Function classes / counterpart | Current opportunity or protected contract |
|---|---|---|
| `main.rs`, `manifest.rs`, `input.rs` | Config, manifest/date window, paths and input discovery, optimized/general dispatch. | File-name correction must survive every integration. Exact empty/header/EOF behavior matters. |
| `fast/mod.rs` orchestration | Mappings/chunks, worker/arena setup, link publication, parse/dedup schedule, person order, output reduction. | Shorten overlapping stage lifetimes; preserve barriers and one-owner partition claims. |
| `fast/scan.rs`, `fast/ts.rs`, `fast/id.rs` | Runtime SIMD/scalar scanning, scalar/tail handling, exact times and compact ID classes. | Retain byte identity, padded tails and dispatch guards. New compact ID classes require exact reversible encoding, not truncation. |
| `fast/keys.rs`, `fast/people.rs` | Domain/exotic IDs, key ordering and canonical link components. | Root is independently compacting People slots. Retain lexicographically smallest exact identity across mixed key classes. |
| `fast/sink.rs` | Arena ownership, aligned blocks, staged partition writes, fencing and recycling. | Defer source recycling when candidate references point into those blocks. Storage savings must be accompanied by a lifetime proof. |
| `fast/mod.rs` event/click callbacks and dedup | Fused validate/encode/partition, rings/prefetch, ambiguous-slot filter and exact winner selection. | Largest immediate memory target: common event width and candidates. Earliest copy still wins before validation. |
| `fast/mod.rs` Worker and radix | Local IDs/counts/scatter, timestamp sort, exact sessions, campaign attribution, daily totals. | Flat purchase bins now implemented in isolation. Next potential gains are short-group bypass, separate purchase payloads, and link-run routing. |
| `fast/write.rs`, `fast/parquet.rs` | Buffered row collection, custom Parquet pages/schema, campaign/user output. | Output is real work; dictionary users and narrower counts are candidates, not automatically safe or faster. |
| `fast/trace.rs` | Phase and worker instrumentation. | Keep tracing optional and do not compare traced/untraced timings as equivalent. |
| `slow.rs` | General-path orchestration and partitions. | Required fallback and differential execution target. |
| `csv.rs`, `time.rs`, `hash.rs` | General parsing, exact dates/times, ordinary hash infrastructure. | Parser syntax and time correctness remain shared semantic dependencies. |
| `events.rs`, `links.rs`, `clicks.rs`, `sessions.rs`, `output.rs` | General reference-like event dedup, components, clicks, ordered sessions/attribution and output. | Serve as independent implementation checks; do not weaken them to mirror a fast-path shortcut. |

## Stage-by-stage contracts and gaps

### 1. Parse observed bytes, then encode exact identities

Both pipelines fuse parsing with typed validation and partition emission. This already avoids creating an ordinary string object for every field. Team 67 additionally classifies batches into multiple storage lanes. Short IDs, long IDs, arbitrary bytes, purchases and unusual ingest timestamps need different amounts of information; it does not pay the widest width for every row.

C's short-key representation is lexically ordered and left-justified. Even an eight-character ID may use high bits of its u64 encoding. Therefore **it is incorrect to truncate our existing key to 42 bits merely because a competitor's separately designed encoding fits that bound**. Leading zeros, prefix class and ID length must remain distinguishing information. A compact redesign must explicitly prove injectivity within its guarded class and retain an exact fallback. Cross-lane equality must converge to one exact event identity before deduplication.

For integer-second ingest compression, the valid test is exact divisibility of the represented relative timestamp by 1,000, plus a proved nonnegative range. The fact that normal generated inputs often contain whole seconds does not authorize rounding. Two copies separated by one millisecond can change the winner. Timezone-equivalent representations must compare by the same absolute instant.

Candidate designs:

1. **Conservative 24-byte lane**, owned by the Rust expert: full exact event u64, full exact user u64, checked relative timestamp/ingest fields. Keep purchases/wide/out-of-range records elsewhere. This saves 25% on the common 32-byte input record without changing the key encoding.
2. **Guarded 16-byte lane**, later experiment: redesign a canonical short-ID class and carry the remaining identity information explicitly or reconstruct it bijectively from its partition. A possible information budget is 30 residual event-ID bits + 42 user-ID bits + 31 timestamp bits + 21 exact ingest-second bits + one validity bit = 125 bits, but this is a feasibility calculation, not an implementation. Partitioning cannot discard a non-reconstructible hash fragment. The Rust expert must choose an independent encoding and verify cross-class reconciliation.
3. Minimize row staging and per-row dependent lookups only after profiling. Fused parsing is already present; adding another fused layer is not automatically a win.

Required probes: every short-key length boundary; base-36 digits/letters and leading zeros; exact same event represented through short versus generic paths; wide key with zero high half; arbitrary Unicode and byte order; timestamp min/max; millisecond ingest ties; negative relative ingest; quoted IDs; last row ending at a page boundary.

### 2. Keep event records compact until exact deduplication finishes

Team 67's common raw lane stores two u64 words (16 bytes). Other combinations use wider lanes (typically 32 bytes and a 64-byte fallback). The common lane applies only to shapes that fit its explicit checks. A fully expanded candidate is approximately 48 bytes, but the optimized path avoids eagerly materializing that width for every ambiguous record: short candidates remain compact and wide candidates can refer back to owned source records until a winner is known.

C has a 32-byte common event, a wider general event, and fully expanded exact-dedup candidates. Both already use a conservative seen/collision bitmap before exact hashing. That bitmap is not a newly discovered Team 67 advantage. The remaining differences are bytes per record, width of candidate tables, number of passes, source lifetime and allocation behavior.

Independent tagged candidate references are appropriate if their arena storage is retained until all references have been resolved. An input chunk must not be recycled because a candidate *pointer* was inserted into a table. The previous implementation was safe to recycle after copying values; that proof no longer applies after switching to references. Every tagged variant must identify its lane and be bounds/alignment checked before decoding. Invalid earlier copies must remain contenders until the earliest ingest copy is chosen, even when a later copy is valid.

Stress: 0%, 1%, 50%, 99% duplicates; all IDs hashing into a small set of bitmap slots; duplicate winners in different input files/workers and different width lanes; invalid earliest followed by valid later; valid earliest followed by invalid later; all exact ingest ties allowed by the specification; maximal-width IDs; 60M input with sparse/dense purchases; lane spill at every block boundary.

### 3. Bound live memory, not just total allocation

Team 67 releases processed page-aligned input interiors and reuses per-partition chunks for later stages. It also normally delays click parsing until event deduplication has completed, while beginning link construction as soon as link parsing is complete. C overlaps click parsing and deduplication and retains whole input mappings until their final chunk finishes. Overlap can save elapsed time at small scale but raise peak memory at large scale.

Independent changes to test after compact records:

- Stage clicks after the event-heavy memory peak, or gate their admission on a byte budget. Compare elapsed time and peak RSS; do not assume serialization is universally faster.
- Return retired partition blocks to the next phase only when no candidate/table/ring still points into them.
- Release page-aligned, fully consumed input interiors. Adjacent chunks can share a boundary page; release only pages proven no longer read by any scanner. Keep the mapping address valid for outstanding references or unmap only at the existing final-chunk boundary.
- Stop retaining simultaneously the raw link-pair vector, a maximal load-factor hash table, key vector, parent vector and copied smallest-key vector when an incremental structure can safely reuse storage.

These proposals target the observed early-stage resident-memory failure. They do not require claiming that bins were the cause.

### 4. Canonical links are exact connected components

The semantic result is the bytewise smallest identity in each undirected link component, including identities that appear only in links or only in clicks. Short numeric order is usable only when it is proved equivalent to the required byte order. Different prefixes, lengths, leading zeros and exotic bytes invalidate naive integer comparisons.

Team 67 maintains compact ordinary-key component state with separate wide-key handling, then emits a read-only alias-to-canonical mapping. Build structures can be dropped after this mapping exists. It also records which representatives need deferred canonical merging. C's People table currently holds wider key slots and more simultaneous build arrays; the root agent owns an independent compact-table change.

Later opportunity: finish unlinked users directly after raw-user grouping and route only component members to a second canonical merge. This reduces universal lookup/shuffle work when links touch a minority of users. However an apparently unlinked raw user may be the chosen representative of linked aliases, so the fast bypass must consult an exact representative/membership structure. A probabilistic prefilter may skip a lookup only when it has no false negatives.

Stress: million-node chain and star; self/duplicate/reversed links; mixed key classes with equal prefixes; smallest root has no events; smallest root has only clicks; aliases contribute events on opposite sides of the session gap; equal event IDs with different user copies; separate components deliberately colliding in the table.

### 5. Group compact timestamps and purchases separately

After dedup, Team 67's common nonpurchase user record can occupy one word, with an additional word only for a purchase. Its local grouping indexes are compact and partition-relative. It count/scatters timestamps, purchases and clicks separately. C stores 16 bytes per ordinary person event and 24 bytes per wider one, even when the row contributes no purchase revenue.

The next transformation should preserve the following independent contract: the all-event stream carries exactly one timestamp for every valid winning event; a separate purchase stream points to the same event timestamp and exact price/category payload. Session membership depends on all timestamps, so views and carts cannot be omitted from the session boundary computation. Category and revenue aggregation can use only the purchase stream after session membership is known.

Team 67 additionally emits compressed runs for linked users and merges runs at the canonical-person stage, while unlinked people can finish in the first person partition. This is a substantial architecture change beyond bins. Build it only after the simpler compact input and flat purchase versions pass scale gates; it can reduce full-key replication but adds a second routing contract.

Stress: no purchases; all purchases; purchases only at the edges of sessions; a view bridge joining two purchase groups; one canonical whale spanning many raw users; zero valid events but many clicks; wide/short users in the same component; groups crossing scratch-buffer capacity boundaries.

### 6. Exact sessions need only bin extrema, counts and a purchase map

Let the maximum permitted consecutive-event gap be G, and assign each event to `floor(timestamp / G)`. Within one bin, every pair of timestamps differs by less than G. All events in that bin therefore belong to one session. For successive occupied bins, the only relevant bridge is the earlier bin's maximum and the later bin's minimum. Split exactly when their difference is **greater than** G. This proof also covers an empty intervening bin: the exact extrema, not adjacency of occupied bin numbers, decide the split.

The selected checkpoint stored an intrusive list of all original event indices per bin and followed those lists during session aggregation. The rejected trial stored purchase-only lists and counts; it still introduced dependent pointer loads. Neither trial tested the following flat algorithm, which is now independently implemented as `bins-flat`:

1. Scan a person's unsorted packed event values once. Update each touched bin's count/min/max and append only nonzero-price packed values to a contiguous purchase vector.
2. Sort touched bin numbers. Scan their extrema in order, emit session start/day/event-count summaries, and write each bin's session index.
3. Scan the contiguous purchase vector. Its timestamp chooses the bin; the bin chooses the session; that session supplies the attribution day. Accumulate revenue per session and categories per day.
4. Visit the now-ordered session summaries using the existing click sweep. Emit daily rows and reset touched state.

This uses no original-event linked list and does not sort all event timestamps. State is proportional to occupied bins, sessions, purchases and bounded day/category accumulators. It is not claimed faster until measured.

Flat implementation review:

| Function / structure | Change and invariant |
|---|---|
| `SessionBin` | Stores min/max/count/session. Count zero means unused, including all-view bins; a purchase head is never used as an occupancy sentinel. |
| `BinSession` | Stores start/day/events/revenue, allowing purchases to be assigned after exact boundary discovery. |
| `Worker::new` | Creates per-day category sums and best-category cells, plus empty flat purchase/session vectors. All checked fast-path days/categories remain within allocated bounds. |
| `Worker::person_bins` first pass | Every valid event increments exactly one bin count; only positive-price payloads enter the purchase vector. Original event order is irrelevant. |
| `Worker::person_bins` boundary pass | Occupied bins are sorted; `next.min - previous.max > G` is the only split rule. Every used bin receives its new session index before purchases are read, and its count is reset for the next person. |
| `Worker::person_bins` purchase pass | Session start day, not purchase day, selects the daily category cell. Positive prices mean a zero-to-nonzero cell can be recorded once in the touched list. Equal category sums choose the smaller preassigned lexical category rank. |
| `Worker::person_bins` attribution pass | Existing inclusive upper click time, inclusive seven-day lower boundary, latest timestamp/smallest-click-ID tie ordering and distinct campaign assists are unchanged. Session revenue and event count come from separate summaries. |
| `Worker::finish_bin_row` | Emits the already aggregated day and resets that day's best-category cell. Every day with purchases necessarily has a session row and reaches this reset. |
| End-of-person resets | Every touched category sum resets; all active campaign counts reset. Small-sort path uses separate category accumulators, so alternating paths does not transfer category state. |

The database reviewer independently confirmed these static state/reset invariants. The independent compiled gate subsequently passed 52/52 executions (26 cases at NCPU 1 and 8), with both PyArrow and DuckDB reading the outputs. Cases include an all-view linked whale, all-purchase 120-billion-cent revenue, alternating invalid-price/purchase bins, gap thresholds ±1 ms, long multi-day sessions, repeated same-bin people and mixed-key canonicalization. This passing gate belongs to the recorded flat binary; combined builds require their own gate. The original 19,448 exhaustive/4,000 random Python bin cases support the extrema proof, but cannot certify the new Rust state management or unsafe surrounding pipeline.

Additional flat probes: cross-midnight session with purchases on both dates; several sessions on one day with category winner changing only after the last purchase; a long multi-day session; all-view session after a purchased person using the same bin; same person size alternating above/below the sort threshold across separate runs; G−1/G/G+1 gaps near bin/day boundaries; duplicate timestamp purchases with tied categories; empty-bin gap exactly G; all categories and unknown category.

### 7. Click attribution has remaining adaptive opportunities

Our current method sorts click timestamps at partition level, scatters by person stably, orders equal timestamps so the correct click-ID winner is selected, then sweeps two pointers through an inclusive seven-day window. Per-campaign reference counts support distinct assists. This is exact and already tested; its cost can be excessive when most people have only a few clicks or when many campaigns remain active for many sessions.

Team 67 uses different methods for small click lists, small session counts and general lists. Small lists can be scanned directly without sorting. Small session counts can be represented by per-click eligibility masks. General cases sort or build campaign interval coverage. Campaign assist membership can be unioned across click ranges instead of repeatedly incrementing each active campaign for every session. Tie-breaking needs exact click IDs only when latest eligible timestamps tie, but omitting the IDs prematurely would be wrong.

Independent next experiments:

- For a bounded tiny click count, scan clicks once per session, tracking the largest eligible timestamp, exact smallest click ID on ties, and a campaign bitset/set for assists. Derive the switch from measured `clicks × sessions`, not a magic universal threshold.
- For a bounded number of sessions, use bitsets for each click's eligible sessions and OR by campaign. Keep the general sweep for larger groups.
- Specialize zero-click groups to organic aggregation without touching campaign-window state.

Stress: same-time click IDs across all encoding classes; exactly seven days earlier; one millisecond older; click at session start; click one millisecond after; multiple clicks from the same campaign; many campaigns all active; alias-only clicks; no events; sessions spanning days; organic and real campaign IDs remaining distinct according to reference rules. Do not claim performance before isolated timing.

### 8. Output encoding and end-to-end costs remain part of the task

Team 67's active v3 writer uses user/category dictionaries and automatic integer encoding. Legacy `out.rs` additionally contains specialized zero/null row layouts, but those should not be credited to an active v3 timing without a call trace. Our current user writer repeats plain UTF-8 IDs for each day and uses plain integer fields, with bounded batches and an already tested custom Parquet writer.

A useful independent change is a per-row-group dictionary for repeated canonical user names, while retaining exact UTF-8 bytes and nullable category semantics. Another is checked count-width selection or RLE/bit-packed integer pages when it reduces actual end-to-end I/O. The writer must still close and flush all data before process success. A custom faster format that is invalid in PyArrow or DuckDB is a failed submission regardless of elapsed time.

Stress: all-null categories; empty output; a single person on every day; many unique names; dictionary index-width boundaries; large counts/revenues; multiple flushes/row groups; output directory already containing previous files; both PyArrow and DuckDB reading exact values and schema. Do not widen the output change while memory/parse work remains unmeasured.

## Ordered implementation and acceptance matrix

| Priority | Independent change | Why now | Correctness gate | Performance acceptance |
|---:|---|---|---|---|
| 1 | Compact exact input lane and tagged dedup references | Largest early-stage bytes; directly addresses failed 60M execution. Rust expert owns. | Full adversarial matrix, lane-boundary cases, invalid-earliest copies, reference lifetime review. | Must complete 60M; record peak RSS and phase time. A tiny 20M regression can be acceptable only if scale becomes usable and documented. |
| 2 | Compact People table / reduced build lifetime | Link table remains live through expensive stages. Root owns. | Mixed-byte canonical minima, long/star components, representatives with clicks only. | Compare both setup/link and total time, peak RSS. |
| 3 | Flat bin purchases | Removes dependent per-event/per-purchase list walks after exact session assignment. Algorithm agent owns. | Specific state/reset cases plus full output oracle. | Measure separately and combined; rejected linked-purchase result does not predict this design. |
| 4 | Guarded 16-byte raw/common and compact postdedup events | Further bandwidth and resident-memory reduction. | Exact encoding injectivity, ranges, mixed lanes, no generator inference. | At least repeated 20M/60M measurements and correctness at all lanes. |
| 5 | Delay clicks / release consumed pages / reuse retired blocks | Reduces live bytes and page pressure. | Publication and mapping lifetime review plus boundary stress. | Memory decrease without unacceptable end-to-end delay; record major faults. |
| 6 | Unlinked bypass plus compressed alias runs | Eliminates universal canonical reshuffle where link density is low. | Representative membership, alias-only clicks, whale components, mixed IDs. | Multiple link-density datasets; no claim from one convenient seed. |
| 7 | Adaptive small-click attribution / masks | Avoids sorting and repeated active-set loops in small groups. | Exact boundaries, click ties, distinct assists, campaign extremes. | Measured crossover and general-path fallback. |
| 8 | Dictionary output and checked integer encoding | Cuts repetitive output bytes and formatting. | Dual Parquet readers, row-group/dictionary/null boundaries. | End-to-end elapsed plus output bytes; stop if complexity gains no speed. |

A combined winner is a new binary. Passing each isolated change does not prove the combination: it needs the full gate, pinned source/binary hashes, quiet repeated elapsed/CPU/RSS receipts and final-scale completion. Faster time from a failing process is never included as a success. The top-five leaderboard values and our local benchmarks use different datasets/hardware and cannot be arithmetically substituted for each other.

## Resources translated into testable choices

This is a reading/implementation plan grounded in relevant primary work, not a claim that every book was read during the session or that the papers' headline throughput applies here.

| Resource | Relevant concept | Concrete experiment / check |
|---|---|---|
| Ellmann and Neumann, *One Pass to Parse Them All: Fused Parallel CSV Processing*, PVLDB 19(11), 2026, DOI 10.14778/3836663.3836710. <https://db.cs.tum.edu/people/sites/ellmann/papers/csveee.pdf>; artifact <https://github.com/ackxolotl/csveee-evaluation>. | Validated parallel boundaries and fused parse/accumulate; structural-index construction. | Our parser is already fused. Measure field-boundary extraction separately, keep the contest dialect explicit, test quoted/tail/chunk cases, compare scalar sparse-bit extraction and vector alternatives. |
| Leis et al., *Morsel-Driven Parallelism*, SIGMOD 2014. <https://ir.cwi.nl/pub/22547>. | Fine-grained work ownership and dynamic load balancing. | Measure worker tail after grouping; tune task byte ranges against parse cost and late whale work. Retain one-owner partition claims and stage barriers. |
| Schmidt et al., *MIMD on SIMD*, CIDR 2025. <https://vldb.org/cidrdb/papers/2025/p7-schmidt.pdf>. | Different data/control patterns need different vector execution. | Batch independent lookups only when lanes remain useful; compare valid/wide/odd-ID distributions rather than assume wider SIMD helps every row. |
| Zinsmeister et al., *Predictive Translation*, SIGMOD 2026, DOI 10.1145/3786678. <https://db.in.tum.de/people/sites/zinsmeister/papers/predictive-translation.pdf>. | Hide dependent lookup latency through prediction/overlap. | Our task lacks that paper's buffer-manager setting. Use it only to motivate measured prefetch distance/ring-size experiments; do not import its throughput claims. |
| Jon Gjengset, *Rust for Rustaceans*. <https://nostarch.com/rust-rustaceans>; Rustonomicon <https://doc.rust-lang.org/nomicon/>. | Ownership, unsafe contracts, layout and concurrency reasoning. | Write the candidate-reference arena lifetime proof; validate alignment, publication, SIMD feature dispatch and exact source pin for every binary. |
| Brendan Gregg, *Systems Performance*, second edition. <https://www.brendangregg.com/overview.html>. | Attribute elapsed time to CPU, memory, faults, scheduling and I/O. | Quiet rotating benchmarks; record elapsed, CPU, RSS, faults and failure status; exclude no unsuccessful runs from the failure report. |
| Alex Petrov, *Database Internals*. <https://www.databass.dev/>; Rust Performance Book <https://nnethercote.github.io/perf-book/>. | Data layout, indexes, locality, controlled measurement. | Compare compact lanes, partition tables and page lifetimes one change at a time; retain exact keys behind hashes. |
| `hashbrown`, `rust-csv`, DuckDB CSV research and source. <https://github.com/rust-lang/hashbrown>, <https://github.com/BurntSushi/rust-csv>, <https://github.com/duckdb/duckdb>. | Independent open implementations of hash tables, parsing and analytical execution. | Use as conceptual/benchmark references and correctness comparison where appropriate; do not add a large dependency merely because it is well known. |

## Handoff status

`bins-flat` was built with Rust **1.97.0**, `--release --locked --offline --target x86_64-unknown-linux-gnu` and `-C target-feature=+crt-static`. The shared target initially returned a suspiciously fresh artifact after timestamp-preserving tree copy; `src/fast/mod.rs` was touched and the package explicitly recompiled before the recorded binary was copied. This protects the source/binary provenance. No timing is claimed for this new binary in this document.

Root owns combined integration and all benchmark scheduling; the database reviewer owns the independent execution gate. Do not promote `bins-plain` merely because this document calls it the prior checkpoint: its final-scale local failures supersede the earlier conditional promotion. The remaining algorithm gaps are now enumerated; the next implementation round is broader than session binning.
