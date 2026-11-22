# Algorithm panel — round 2: exact session bins

Independent review of the experimental `experiments/bins` implementation. This review does not authorize replacing the measured baseline without the parent's Rust build, full-output checks and timings.

Reviewed `experiments/bins/src/fast/mod.rs` SHA-256: `f387bb17c4367bcab12b5dcc98679bbaf7ea44384c980aef4ba6a612feb2cca2`. Later source changes need review of the changed semantics.

## Mathematical result

The bin model is exact for session boundaries. Let the session gap threshold be G, and let bin k hold timestamps in the half-open interval [kG, (k+1)G). All timestamp differences inside one bin are less than G, so no consecutive sorted events inside that bin can start a new session. If occupied bins are ordered, the only potential breaks are between the preceding bin's maximum and the following bin's minimum. Compare those two values against the original strict `> G` rule. Bin numbers alone are insufficient to decide the boundary.

This argument does not assume a particular generator, event density, window length, or identity shape. It does assume that event validation and person resolution have already finished, and the bin operation does not lose or duplicate event payloads. For signed timestamps, binning must use floor division or first shift them to nonnegative coordinates. The reviewed Rust implementation uses nonnegative u32 offsets.

The session's minimum timestamp determines its day and click eligibility. Events and purchases after midnight remain attached to the session's start day. Revenue and category totals must follow the original event members, not the bin's calendar day. Equal timestamps can be visited in any order because event revenue/count/category aggregation is commutative and the credit rule uses the session start.

## Independent executable property check

`bin_model_check.py` imports no production implementation. A full timestamp-sorting oracle is compared with a bin implementation on complete event membership, boundaries, revenue, category sums, and daily aggregates.

Results in `bin_model_results.json`:

- PASS: 19,448 exhaustive small integer timestamp cases at gap 3.
- PASS: 4,000 randomized multi-person cases, deterministic RNG seed 2711305335.
- PASS: 13 crafted cases, each in forward/reverse input order and three day origins.
- The deterministic and random suites contain 1,420,876 generated events, including an 80,000-event interleaved whale case.
- Covers empty input, one event, equal times, exact G and G+1 gaps, adjacent-bin split, cross-midnight and multi-day sessions, total revenue beyond 32 bits, rare/non-ASCII/category ties, and high u32 timestamps.

These are model checks. They do not prove Rust indexing, unsafe memory behavior, concurrent scheduling, Parquet correctness or speed. The parent must still run the real binary through official fixtures, generated differential datasets, forced bins, and scale tests.

## Source review of Worker::person_bins

No algorithmic correctness blocker was found in the version reviewed:

1. The bin array size is the ceiling of the timestamp coordinate span divided by G. Valid event timestamps are strictly below that span, so valid bin indices fit.
2. Each event's local index is linked into exactly one occupied bin. Each local link entry is overwritten before use, so reusing the allocation after a larger/smaller person does not expose stale indices.
3. A touched bin is added to the occupied list only when its head is empty. Its min/max are initialized for that person.
4. The occupied-bin indices are sorted. For an already started session, a later bin minimum cannot precede the previous bin maximum, so the unsigned boundary subtraction does not underflow.
5. If a gap breaks the current session, that unconsumed bin is revisited as the first bin of the next session. Consumed heads are reset to the empty sentinel. Every touched bin is consumed before the next person.
6. Category sums are cleared only when the daily row is finished; multiple sessions on the same day therefore accumulate together as required.
7. Click ordering and lexical ties remain on the existing path; each session queries the original start timestamp.
8. The bins and links are fields of a worker, rather than shared mutable state. This avoids new cross-worker bin contention.

## Performance risks to measure

The proof does not prove a win. A long person uses a pointer-like index walk through original events, which can be less cache-friendly than an already sorted vector. Sorting the occupied list and setting up bins can cost more for small people. The threshold separating tiny sorted runs from binned runs needs same-data measurement. A whale remains assigned to one worker; bins reduce its work but do not split that worker's tail across cores. At final scale, record the maximum per-worker completion time as well as total CPU and wall time.

## Resources translated into testable choices

| Resource | Specific experiment | Decision rule |
|---|---|---|
| Rust for Rustaceans | Reuse initialized buffers; inspect layout and index invariants independently. | Retain only if correctness is unchanged and repeated runs improve CPU or memory use. |
| Systems Performance, 2nd edition | Measure process wall time, user/sys CPU, peak RSS, faults and final teardown separately. | Do not attribute a wall change to the algorithm if CPU or cache/machine conditions disagree. |
| Morsel-Driven Parallelism | Measure per-worker tail skew with whale-heavy data before changing queues. | Work stealing is justified only if idle workers coexist with a material unfinished tail. |
| Rethinking MIMD-SIMD Interplay (CIDR 2025) | Compare thread-count sweeps and scalar/AVX2 dispatch on the same workload. | Wider SIMD is accepted only for whole-pipeline improvements, not isolated kernel throughput. |
| Saving Private Hash Join (VLDB 2025) | Track intermediate bytes and peak RSS at 20M/60M; release/reuse memory between stages. | Preserve correctness and keep headroom below the scorer's memory cap; graceful general paths matter. |
| DuckDB CSV performance investigation | Separate parse input cost from writing/persisting output. | A reduction in compute that increases output/teardown must still improve end-to-end runtime. |

Primary URLs and bibliographic details are in `round1.md`; no paper establishes a speedup for this implementation without these measurements.
