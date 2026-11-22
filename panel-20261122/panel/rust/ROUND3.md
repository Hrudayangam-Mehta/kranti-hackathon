# Rust pipeline panel: round 3 ablation and trace review

## New experiment

`experiments/bins-plain` contains the round-2 exact session-bin algorithm on the live C baseline, including the independently identified input discovery correction, with all round-1 buffer changes removed:

- Original per-call radix histogram allocation for click sorting.
- Original per-partition event/click offset vectors and scatter cursors.
- Original radix spare-vector clearing and initialization.
- No event-wide radix remains, as in the bins experiment.

The parent owns build, correctness gates and interleaved measurements. No production files were edited in this round by this worker.

## Observed five-round 20M result

The parent's `bench/results/p20-r12-n8.json` records 5 rotating interleaved runs at NCPU=8, CPU affinity 0–7, seed-7 generated 20M input, OS-managed cache, on the current AMD EPYC 9V74 host. Median measurements:

| Build | Wall seconds | CPU seconds |
|---|---:|---:|
| Prior corrected A build | 1.296903 | 7.234395 |
| Current C baseline | 0.964873 | 5.335208 |
| Round 1 buffer reuse | 1.310260 | 8.023555 |
| Round 2 bins | 0.914943 | 5.605133 |
| Team 67 comparator | 0.346583 | 2.016068 |

These are same-host local measurements, not official scores. The observed aggregate round-1 result does not justify promotion. The bins median is modestly lower than C in wall time but higher in CPU use; that is not an unqualified improvement.

## Trace-based qualification

The follow-up traced data at `bench/logs/p20-trace-r12-n8` shows substantial variability in stages the round-1 code did not change. Summed thread elapsed durations in milliseconds:

| Build | Event parse, run 0 / 1 / 2 | Person processing, run 0 / 1 / 2 |
|---|---|---|
| C | 3949 / 1911 / 1983 | 1349 / 1029 / 1019 |
| Round 1 | 2306 / 3803 / 2230 | 1012 / 1096 / 1325 |
| Bins | 2040 / 2022 / 3355 | 1095 / 1030 / 1078 |

For C, serial link-build elapsed time varied from 173 to 473ms; for round 1 it varied from 213 to 511ms. Worker scratch buffers are allocated after parsing, so their direct allocation activity cannot explain a prior event-parsing slowdown. Binary code-generation effects or host/cache/resource variation remain possible; the available observations do not distinguish them. The appropriate conclusion is an observed aggregate regression with unresolved causation, not a proven 50% CPU penalty caused by reusing buffers.

The three traced-run medians were C 0.693133s, round 1 0.796474s, bins 0.709240s. Tracing is a distinct measurement condition and these numbers should not be pooled into the untraced medians. They reinforce the need for a controlled ablation before selecting a winner.

## Independent algorithm review

The algorithm specialist independently tested the session-bin model on 19,448 exhaustive small-gap timestamp cases, 4,000 randomized multi-person cases, and 13 crafted inputs across two orders and three day origins, including an 80,000-event whale. Total generated events were 1,420,876. All comparisons passed. Artifacts are `panel/algorithm/bin_model_check.py` and `panel/algorithm/bin_model_results.json`. These model tests do not substitute for compiled Rust, SIMD, filesystem, or Parquet verification.

## Bounded next choices

- Benchmark bins-plain against C and bins with the same gate and data. Keep only a demonstrated improvement or justify selection on correctness/robustness separately.
- A shared person-partition work order could remove approximately 5–12ms of summed duplicate work in these traces, but this is a small opportunity, not a credible explanation for the gap to team 67.
- A later independent design experiment could reduce dedup candidate traffic by retaining references to compact source records rather than promoting candidates into 48-byte general records. It would trade sequential copies against indirect loads and must be measured; no such change is implemented here.
- The current timing gap to team 67 remains material. Do not report that this implementation beats it.

## Purchase-only bin links candidate

`experiments/bins-purchases` is based on `bins-plain` and changes only the payload bookkeeping inside exact session bins. Every original event still contributes once to a bin's 64-bit event count and to its exact minimum/maximum timestamp. Only purchase payloads enter the retained linked list, stored as `PurchaseLink { payload, next }`; the original all-event `bin_next` vector is removed. During session assembly the implementation adds each bin's event count and walks only its purchases to accumulate the exact revenue and category totals. For the generator's sparse purchases this should reduce a second traversal of view/cart records, but a performance gain requires measurement.

A touched bin is identified by `count != 0`. The earlier `head != INVALID` occupancy test would be incorrect for a bin containing only views/carts, because this variant deliberately stores no link for those events. Both count and head are reset when a touched bin is consumed. The purchase vector is cleared and reused between people; each new link points only to an earlier link in the current person's vector. Session gap checks, start-day ownership, attribution, click tie-breaking, output schema, and deduplication are unchanged.

This is a clean-room modification of our own pipeline. Source remains in the experiment pending the parent's compiled correctness gates and measurements. The database reviewer was specifically asked to check all-view/cart groups, all-purchase groups, alternating occupied bins, category ties, and session/day boundaries. This note is a static design and implementation receipt; it does not assert that the parent has completed those tests.
