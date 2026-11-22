# Algorithm panel — round 3 independent review

## Selection after measurement

The coordinator selected **`bins-plain`**, the exact-bin implementation with linked original event indices and without round-1 buffer experiments, pending final-scale validation. Its source SHA-256 is `1d0c74d0db3872ac7c975950146a3a37b7154dc0b5523304fa40c1e8f891e26f`, and its measured binary SHA-256 is `59d0ed1f37553de7e39dc5ac7411d20c84f36abdadbc6eeb388c4a28ec34f107`. The purchase-only proposal below is **not promoted**. A plausible reduction in retained state did not produce the hoped-for timing improvement.

Fresh local evidence is `bench/results/p20-round3-n8.json`: five rotating interleaved runs per build, NCPU 8, affinity CPUs 0–7, 20M seed-7 data, OS-managed page cache, no tracing. These medians are same-host local measurements, not leaderboard scores:

| Build | Median wall seconds | Median CPU seconds | Interpretation |
|---|---:|---:|---|
| Original C | 0.801986 | 4.843286 | Immediate implementation baseline. |
| Selected bins-plain | 0.737272 | 4.419838 | Observed 8.1% lower wall time and 8.7% lower CPU time than C in this batch. |
| Rejected purchase-only bins | 0.848183 | 5.309282 | Slower than both C and bins-plain; do not promote. |
| Prior corrected A (`afix`) | 1.007028 | 5.884642 | Older corrected user baseline. |
| Team 67 local comparator | 0.315713 | 1.987908 | Still substantially faster; selected bins take about 2.34 times its wall time here. |

The companion one-worker batch `p20-round3-n1.json` has three runs per build and compares C with purchase-only bins: medians 3.942868s and 4.115466s respectively. It did **not** measure bins-plain at NCPU 1, so it cannot establish bins-plain's one-worker speed.

No competing heavy reviewer process ran during these round-3 timing windows. This does not mean the host or page cache was perfectly controlled: the first C run had 556 major faults and a 2.619s wall time, and other runs also differ in major faults. The retained medians use all runs, without cherry-picking the initial result away. Final 60M checks are pending at this report update.

## Rejected purchase-only trial: source review

Reviewed `experiments/bins-purchases/src/fast/mod.rs`, SHA-256 `74f260356f49bdda1140f40b80872ac0ec49780e65f0442792b29356ee8a2dd8`, against original C `ad8526b3410bfb6b8b8febff35affe6bd5b42499` and the prior all-event-list bins experiment. The candidate retains exact session-bin boundaries but stores an event count per bin and linked payloads only for positive-price purchases. This removes a second traversal through nonpurchase events.

**Independent source decision:** the reduction is mathematically sound and its inspected implementation preserves the required counts, purchase sums, category sums, attribution boundaries and per-day semantics. No new blocker was found. That correctness assessment does not make it the best performance choice; the measured regression above is the reason this trial was rejected.

The companion `FUNCTION_REVIEW.md` covers all 49 production functions and all 7 impl blocks in the **selected bins-plain** module, including unchanged parse/dedup/prefetch/arena call sites. Only two existing method bodies change and one is added; the entire earlier pipeline and click radix implementation remain textually unchanged from C. It distinguishes the selected all-event-list representation from this rejected purchase-only experiment.

## Proof of the purchase-only representation

Let the session gap be the positive integer G = 1,800,000 milliseconds. Give each accepted event with nonnegative relative timestamp t the bin floor(t/G). A bin covers a half-open interval of width G. The difference between its largest and smallest integer timestamps is at most G−1, so no event gap inside that bin can split a session.

Sort the occupied bin indices. Between two consecutive occupied bins, the only candidate break is the next bin's minimum timestamp minus the preceding bin's maximum. Testing that actual difference with the original strict `> G` rule yields exactly the same sessions as sorting all event timestamps. Merely testing whether bin numbers are consecutive would be wrong; the implementation correctly uses actual extrema.

For each bin keep four sufficient quantities: minimum timestamp, maximum timestamp, event count, and every accepted purchase payload. Event order within a session is irrelevant to the required output once its start is known. Counts add, revenue adds, and per-category purchase prices add. The [official track rules](https://www.joinbuilders.org/buildathon/tracks/shopping-sessions), also saved in `handoff/tracks/shopping-sessions/v5model/kit5/dl/rules.md`, require a valid purchase price between 1 and 10,000,000 inclusive; therefore revenue greater than zero is equivalent to a session containing at least one purchase. Views and carts have zero payload price and need no purchase-list node. This does not permit discarding views/carts from extrema or event count; they can connect otherwise separated purchases into one session.

The code updates extrema and increments the u64 count for **every** event, then links a node only if the payload's low 24-bit price is nonzero. Summing `bin.count` recovers all events. Walking the linked nodes recovers all and only positive purchase contributions. Category rank is the payload's high byte, matching the original packed representation.

The earliest occupied-bin minimum in a resulting session is its exact start. Thus the session's UTC day and eligible click window are unchanged. The pre-existing click sweep admits clicks up to and including the session start, evicts those strictly more than seven days old, resolves latest-timestamp ties using the pre-sorted smallest-bytewise click ID, and counts each assisted campaign once per session. All purchases in a session stay assigned to that session's start day, even across midnight or several days.

## Specific implementation hazards checked

| Hazard | What the candidate does | Assessment |
|---|---|---|
| A view-only bin has no purchase head, so head cannot signal occupancy. | Initializes a bin only when `count == 0`; pushes its occupied index once and increments count for all events. | Correct. Using `head == INVALID` here would have been a real bug. |
| Scratch lists are reused between people. | Clears the purchase vector at entry, initializes the head on first occupation, and resets count/head for every consumed bin. Every occupied bin is consumed before return. | No stale node becomes reachable for the next person. |
| One person's two separated sessions reuse different parts of the same list. | Bin heads refer to fixed indices in the current person's vector; the vector is not cleared until the next person. | Links remain valid through all sessions. |
| A chain of nonpurchase events bridges two purchase events. | Extrema/counts include the chain; purchase linkage does not define session topology. | Preserves the combined session. |
| A large session crosses many bins or many midnights. | Last timestamp updates to each bin maximum; daily row is keyed by session start, not the current bin. | Preserves original semantics; no fixed maximum number of bins per session. |
| Several sessions begin on the same day with category ties. | Accumulates category sums until `finish_row`, which selects highest sum and then smallest byte-order rank. | Preserves daily category semantics. |
| An equal-to-gap boundary is accidentally split. | Breaks only on actual gap greater than G. | Exact-G remains connected, G+1 splits. |
| Equal timestamp input order differs. | Bin extrema and additive totals do not depend on order; click tie sorting is unchanged. | Event ordering has no output effect. |
| Price/category truncation or overflow. | Price uses existing 24-bit encoding; per-bin count, revenue and daily row totals are u64. | Fits rules. Purchase-link indices inherit the supported sub-2^32 event-count bound. |
| Two workers share one bin scratch array. | Bins, purchase links, counts and category scratch are fields of a separate worker instance. | No new shared mutable bin state. |
| A giant linked person dominates one worker. | All of that person's events remain assigned to one person partition. | Correctness preserved; skew is a remaining performance limitation. |

## Test interpretation and candidate gate

The earlier independent model passed 19,448 exhaustive timestamp cases, 4,000 randomized multi-person cases, and 13 crafted inputs across two orders and three day origins, including an 80,000-event whale. It verifies exact session membership and totals for the all-event-list mathematical representation. The proof above shows why replacing that membership traversal with counts plus purchase payloads is a valid aggregate homomorphism under the positive-price rules. That reasoning is distinct from executing the changed Rust.

The earlier compiled bins binary passed 240 full reference/readback executions and 12 forced-threshold executions. Those receipts identify binary `8217e2223705e7654a1e7f7fc3c6dc8db79ca8018157c168a70a2ed265be39b4`; they must not be relabeled as passing results for the purchase-only candidate.

For the selected build's fresh gate, preserve the existing matrix and make sure it reaches: bins with only views/carts, mixed bins with a purchase before and after nonpurchases, multiple people reusing the same bin number, a purchase-free long session, a purchase-only group, nonpurchase bridges between distant purchases, rare categories/ties, exact-G/G+1 boundaries, and the linked whale. Run forced bins and forced sort as well as the default threshold; retain scalar and multiple worker counts. These remain useful for linked-index reset and payload traversal even though purchase-only compression is rejected. The database reviewer/coordinator owns the actual binary executions so they can be scheduled without concurrent benchmark load. No CPU-heavy model test was run by this reviewer during the round-3 measurement window.

## Rejected trial's performance hypothesis and why it was tested

At the generator's documented roughly 3% purchase rate, the new inner traversal may inspect far fewer payload nodes than the all-event-list design. Its first pass still examines every event, stores extrema/counts and creates purchase nodes, so it does not make event processing independent of input size. For a person with E events, B occupied bins and P purchases, the local bin work is approximately O(E + B log B + P), in addition to existing person grouping and click processing. The timestamp horizon bounds B; the current fast-path window is under 2^32 milliseconds, so at most about 2,387 bins are addressable.

New purchase nodes contain two u32 words, whereas the earlier all-event link vector contained one u32 per event. On an all-purchase adversarial workload the linked-node storage therefore grows from roughly 4E to 8E bytes, excluding existing event arrays and vector capacity. A sparse-purchase workload should reduce this scratch storage, but allocator behavior and cache effects still require measurement. At the default threshold eight, small groups use full local sorting; this threshold is an engineering choice, not mathematically optimal.

This candidate also removes the round-1 buffer-reuse experiment. The first aggregate timing table showed a round-1 loss, but it is **not a clean causal estimate**: the host showed stage-level variation, and this reviewer's approximately 7.8-second single-process model check overlapped part of the earlier measurement period. Unchanged event parsing/link stages varied materially. The appropriate record is an observed aggregate regression with contaminated conditions and unresolved cause. Do not claim that reusing buffers inherently causes the measured loss. Fresh uncontended interleaved measurements are needed for selection; traced and untraced timings must remain separate.

The same-host team-67 comparator remains substantially faster in both the earlier and fresh round-3 measurements. An algorithmic improvement within this implementation is not evidence that it beats team 67 or that any public leaderboard score belongs to the repository hash benchmarked locally.

## Resource guidance translated into testable choices

These are selected original sources and books relevant to the measured workload; no claim is made that a broad literature survey proves a universally best algorithm.

| Resource | Concrete use here | Falsifiable choice |
|---|---|---|
| [Rust for Rustaceans — Jon Gjengset](https://nostarch.com/rust-rustaceans) and the [Rustonomicon](https://doc.rust-lang.org/nomicon/) | Treat encoded owned records, scratch-vector lifetime, unchecked indexing, publication and manual mmap lifetime as explicit contracts. | Reject an optimization if its proof requires a stale pointer, uninitialized element or concurrent alias; compare scalar/SIMD and multithreaded outputs. |
| [Systems Performance, second edition — Brendan Gregg](https://www.brendangregg.com/overview.html) | Use stage measurements and CPU/wall/RSS together; separate noise and workload changes from causation. | Rotate build order on identical input/affinity, avoid competing tests, compare paired runs and report variance before promotion. |
| [Database Internals — Alex Petrov](https://www.databass.dev/) | Analyze memory traffic and retained state in the full pipeline, not only asymptotic event sorting. | Measure dense versus sparse purchases; ensure counts plus payloads reduce RSS/cache traffic without inflating all-purchase cost beyond acceptable limits. |
| [Morsel-Driven Parallelism, SIGMOD 2014 — Leis et al.](https://ir.cwi.nl/pub/22547) | Relate scheduling granularity to skew and worker idle time. | Record per-worker event/person time and compare whale-heavy input; do not claim the current person-granularity design solves whale parallelism. |
| [Rethinking MIMD-SIMD Interplay, CIDR 2025 — Schmidt et al.](https://vldb.org/cidrdb/papers/2025/p7-schmidt.pdf) | Keep parsing kernels and thread-level scheduling as distinct performance dimensions. | Compare runtime scalar/AVX2 paths under fixed worker counts, using only supported CPU features and identical outputs. |
| [Saving Private Hash Join, VLDB 2025 — Kuiper et al.](https://duckdb.org/library/saving-private-hash-join-vldb/) | Evaluate smaller intermediates and adaptive representations as concrete memory-traffic choices. This is a hash-join paper, not evidence that this session algorithm is optimal. | Measure the purchase-only representation across density and skew, including worst-case linked-node growth. |
| [One Pass to Parse Them All, PVLDB 2026 — Ellmann and Neumann](https://db.cs.tum.edu/people/sites/ellmann/papers/csveee.pdf), DOI 10.14778/3836663.3836710; [evaluation artifact](https://github.com/ackxolotl/csveee-evaluation) | Sections 3–4 connect chunk-local accumulation, boundary validation and structural indexing. Our parser already fuses scanning and record construction; this is a guide to a next experiment. | Benchmark a block structural index against the current scanner while preserving the contest's exact malformed-row policy. The paper finds scalar sparse-bit extraction useful; additional SIMD is not automatically better. Do not transfer its headline throughput to this complete pipeline. |
| [Predictive Translation, SIGMOD 2026 — Zinsmeister et al.](https://db.in.tum.de/people/sites/zinsmeister/papers/predictive-translation.pdf), DOI 10.1145/3786678 | Explains how predictable placement can overlap dependent memory operations in buffer management. Our pipeline already batches canonical-person prefetch through a ring; it does not implement this paper's buffer pool. | Use the dependency-chain analysis to profile exact-ID lookup latency and experimentally tune prefetch distance. Retain exact identity checks; do not add a new storage buffer manager to this in-memory one-shot workload without evidence. |
| [hashbrown](https://github.com/rust-lang/hashbrown), [rust-csv](https://github.com/BurntSushi/rust-csv), and [DuckDB's CSV performance study](https://duckdb.org/2024/10/16/driving-csv-performance-benchmarking-duckdb-with-the-nyc-taxi-dataset) | Reusable reference implementations and engineering comparisons for exact hashing, parsing and columnar verification. Their general CSV semantics may differ from this contest dialect. | Use them as correctness/benchmark baselines where compatible; do not transplant a parser or data structure without checking exact dialect, allocation and throughput impact. |

The csveee artifact spelling was verified with the GitHub connector: `ackxolotl/csveee-evaluation` is public, while the two-l spelling in one indexed PDF text returned 404. The recommended link above uses the verified repository. This is an evaluation artifact recommendation; its contents were not copied into the submission.

## Top-five source boundary remains unchanged

The public track snapshot ranked NoMoreLite, GMUNVIS, 67, Caesar and Wix. Two public repository mappings were verified: GMUNVIS to `SuperHuyGaming/shopping-sessions`, and 67 to `jason-scheffel/express-lane`. The other three associations remain unverified after the bounded searches and direct public HTML/RSC inspection documented in `round1.md` and `public_source_lookup.json`. Neither the rank page nor public repository head proves the exact scored submission commit. The comparison must retain that distinction rather than fill missing mappings with guesses.
