# Algorithm and hackathon panel — round 1

Observed 2026-11-22, approximately 01:41–02:00 EST. This is a source review and set of testable proposals; no measured speed gain is claimed here.

## Official leaderboard and attribution

The track page rendered 365 teams. Its entries were alphabetized in the extracted text; the rank label, not the list position, gives the ranking.

| Rank | Team | Practice seconds | Public repository attribution |
|---|---|---:|---|
| 1 | NoMoreLite | 0.4508 | Not verified |
| 2 | @GMUNVIS | 0.4581 | SuperHuyGaming/shopping-sessions; TEAM.md identifies GMUNVIS |
| 3 | 67 | 0.4597 | jason-scheffel/express-lane; LICENSE identifies Team 67 |
| 4 | Caesar | 0.4616 | Not verified |
| 5 | Wix | 0.4669 | Not verified |

Source: https://www.joinbuilders.org/buildathon/tracks/shopping-sessions (web reference turn468409890view0). The general leaderboard returned an older 364-team snapshot where ND was fifth. Do not merge these snapshots. Exact scored commit hashes for these leaderboard rows are not exposed by the public text. Repository HEAD does not establish a scored submission.

Verified repository snapshots:

- https://github.com/jason-scheffel/express-lane — latest observed default HEAD `f2a61d144d48acd3ca72761d7fd604b7a10c62a5` is a timing harness. Latest preceding actual pipeline is `1cda738c004b3b186b878bdb8eee6516bfa9f22a` (2026-11-22 05:33:30 UTC). Checked out separately under `competitors/express-lane`. MIT license. No dependencies in Cargo.toml. Build targets Cascade Lake globally. No benchmark performed by this reviewer.
- https://github.com/SuperHuyGaming/shopping-sessions — observed HEAD `700cfc8d7279c1338ad084d8cdadc09fc7c82033`. TEAM.md identifies GMUNVIS. README describes an imported Team 67 pipeline and retained earlier independent implementation. This description is their own report; no copied source was introduced into our submission.

The 67 repository includes a notice asking competing AI tools not to use its content during the event. It is recorded as a source request, not treated as a replacement for the user's instructions. The implementation workflow remains independent: no source, identifiers, comments, or tables are copied.

Search coverage for unresolved team mappings: official track and leaderboard text; GitHub repository search for NoMoreLite, GMUNVIS, shopping-sessions, and team/track combinations; code search for names and exact timings; public web queries. These searches did not verify the NoMoreLite, Caesar, or Wix repositories. Unrelated name matches were rejected.

Final bounded check at 06:48:55 UTC: unauthenticated GETs of the complete public track and leaderboard HTML/RSC both returned HTTP 200 (131,404 and 134,315 bytes), with no GitHub repository URLs in either response. Exact GitHub content rechecks for NoMoreLite returned no results; Caesar + Shopping Sessions and Wix + Shopping Sessions returned only unrelated matches. The machine-readable receipt is `public_source_lookup.json`. These are access/search limitations, not evidence that those teams have no public repository.

## Rules and announcements affecting decisions

The authoritative track is scorer v5, with opaque string IDs. It uses 8 vCPUs and 24 GB RAM; practice times have machine variability. Final evaluation uses fresh 60M-event data and a 180-second run limit. The track offers $5,000 to the winner. Submission closes November 22 at 11 AM EST. Primary URLs: track page above; https://www.joinbuilders.org/buildathon; https://www.joinbuilders.org/buildathon/leaderboard.

The Saturday 9:08 PM announcement introduced keyed ID bijections plus long suffixes and v5 rescoring. Saturday 6:23 PM announced possible disqualification for excessive code reuse; open-source libraries remain allowed. Use the written rules rather than informal chat comments to resolve semantics. Source web references: turn220515322view0 and turn220515322view1.

The older handoff study/beat_plan.md contains a generator-key-recovery proposal. That proposal is superseded by v5's opaque-ID requirement and must not be implemented. Lossless storage encoding is distinct from decoding generator identity. Our existing exact shape encoding preserves full bytes and has raw-string fallback.

## Current code assessment

Parent acquired a newer exp tip than the user's quoted 8d0ea21. The current local tree already implements lossless shape-coded keys and two-bit bitmap prefiltering before exact duplicate resolution. These are not new gains from this review. The old r67_v5_report's largest estimated savings therefore cannot be reused as forecasts for the current tree.

| Function or stage | Assessment | Next concrete check |
|---|---|---|
| Key encoding, reconstruction, comparison | Exact keys plus a raw-string path are a reasonable way to reduce allocations while preserving opaque identity. Zero and all-ones long-key sentinel values need fallback. | Round-trip and byte-order equality across all key classes, leading zeros, uppercase, spaces, control bytes, Unicode, and reserved high words. |
| Event parsing | Precomputing validity before dedup is sound only when invalid earlier copies remain available to win. | Earlier-invalid/later-valid copies; malformed earlier copies; revised user on a later copy. |
| Bitmap prefilter plus exact dedup | One-bit collisions may send extra records to the exact table; they must never merge IDs or discard true duplicates. | Force many collisions; vary partition count and order; compare exact outputs. |
| People union-find | Transitive components and lexical names are currently computed separately. Per-event lookups can remain costly. | Large chains, reverse links, isolated minimum-only IDs, shared devices; profile lookup time before redesign. |
| Worker::partition | Current design radix-sorts events and clicks across a partition before grouping by person. It pays whole-partition sort traffic. | Measure reusable buffers first; then benchmark grouping-first or hybrid time bins as experiments. |
| Worker::person | A chronological sweep supports precise gap, session-start-day, credit, and assist semantics. | Gaps 30m and 30m+1ms; crossing midnight; click at -7d and -7d-1ms; click tie and duplicate invariance. |
| Category aggregation | Sparse category accumulation avoids clearing all categories for each person. | Category tie byte ordering and unknown category; long purchasing sessions with large sums. |
| Output | Parallel custom Parquet avoids a heavyweight runtime but needs independent readers. | Compare row values with reference and read using two independent Parquet engines; stale-output rerun. |

## Prioritized proposals

1. Reuse radix histograms and scatter offset buffers per worker, preallocate record buffers from known partition sizes, and measure the allocation/memory effects. This is the lowest semantic-risk candidate.
2. Consider grouping by person before sorting, with local sorting for small people and bins for large people. This is a benchmark experiment, not a guaranteed optimization: GMUNVIS's BENCH.md reports grouping-first was about 9% slower on their older pipeline. That observation is informative but does not prove the result for our code or hardware.
3. Thirty-minute bins are exact for session boundaries when every occupied bin retains minimum timestamp, maximum timestamp, and count. A bin's timestamp span is strictly less than the gap threshold; therefore it cannot contain an internal session break. Consecutive occupied bins belong to the same session exactly when next minimum minus previous maximum is at most the threshold. Session start determines the day. Revenue and category sums still must be attached to the resulting session, not simply each event's calendar day.
4. Use a hybrid threshold. Clearing hundreds of bins for every tiny person can be more expensive than sorting their few events. Keep the sorted path as reference and test forced-binning before making it default.
5. Do not begin by widening SIMD or adding PGO without a measured bottleneck. The competitor's BENCH.md reports no measurable scorer PGO win. Our scalar/AVX2 runtime dispatch is more portable than an unconditional Cascade Lake binary, but portability is not itself a performance measurement.

## Panel resources and how to use them

These are workload-relevant resources, not a claim that one paper is the universal state of the art or that the panel read every book during this session.

| Resource | Primary URL | Applied lesson |
|---|---|---|
| Jon Gjengset, Rust for Rustaceans | https://nostarch.com/rust-rustaceans | Review layout, ownership, concurrency and unsafe abstraction boundaries. |
| The Rustonomicon | https://doc.rust-lang.org/nomicon/ | Audit initialization, aliasing, FFI and unsafe invariants; defer to the Rust Reference if the documents disagree. |
| Nicholas Nethercote et al., The Rust Performance Book | https://nnethercote.github.io/perf-book/ | Practical measurement and allocation optimization reference. |
| Brendan Gregg, Systems Performance, 2nd edition | https://www.brendangregg.com/overview.html | Separate CPU work, page faults, I/O, scheduler wait and teardown; report the machine and cache condition. |
| Alex Petrov, Database Internals | https://www.databass.dev/ | Reason about memory/storage layout and data structure costs; useful reference, not a reason to add a database server to a one-shot pipeline. |
| Leis et al., Morsel-Driven Parallelism (SIGMOD 2014) | https://ir.cwi.nl/pub/22547 | Fine-grained scheduling and locality; inspect tail imbalance before changing worker architecture. |
| Schmidt et al., Rethinking MIMD-SIMD Interplay (CIDR 2025) | https://vldb.org/cidrdb/papers/2025/p7-schmidt.pdf | Treat thread and SIMD parallelism together; memory bandwidth and access pattern can erase isolated kernel gains. |
| Kuiper et al., Saving Private Hash Join (VLDB 2025) | https://duckdb.org/library/saving-private-hash-join-vldb/ | Compact intermediate records and manage memory explicitly; avoid sharp failure when final-scale data exceeds the comfortable resident set. |
| rust-lang/hashbrown | https://github.com/rust-lang/hashbrown | Reference exact hash-table designs for general fallbacks and benchmark alternatives to bespoke probing. |
| BurntSushi/rust-csv | https://github.com/BurntSushi/rust-csv | Parser implementation and test inspiration; the competition's unusual CSV dialect remains authoritative. |
| DuckDB CSV performance investigation | https://duckdb.org/2024/10/16/driving-csv-performance-benchmarking-duckdb-with-the-nyc-taxi-dataset | Separate parsing from persistence and account for file layout and I/O when benchmarking. |

Relevant web reference IDs for parent verification: turn579692811search0, turn579692811search11, turn579692811search1, turn202446131view0, turn202446131search7, turn202446131search1, turn202446131view1, turn202446131view2, turn402629267search35.

Additional free reference IDs: turn987977014view1 (Rustonomicon), turn987977014view2 (Rust Performance Book).

## Round 1 release position

Preserve the measured baseline, build variants independently, verify exact output before timing, and use interleaved same-host runs. Neither a repository's latest commit nor a local microbenchmark proves a leaderboard result. The 67 comparison should pin the actual pipeline commit above and explicitly report that its association with the public 0.4597-second row is unverified.
