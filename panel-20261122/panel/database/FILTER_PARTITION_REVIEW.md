# Membership filter and partition sizing review

Reviewed experiment sources: `experiments/dense-filter/src/fast/people.rs`, `experiments/dense-tuned/src/fast/mod.rs`, and their composition in `dense-balanced`, each based on the previously gated `dense-final`. Hashes are in `FILTER_PARTITION_REVIEW.sources.json`. The combined source has also passed the integration and fresh-reference executions recorded below.

## Exact identity behind a one-sided bitmap

The membership bitmap is a negative lookup filter. `People::build` inserts every distinct interned link endpoint after building components and canonical names. Inserting original keys rather than only roots or canonical minima is necessary: an alias must still resolve even when another identifier represents its component. The key vector contains both short and wide/exotic interned identifiers, including inactive aliases and self-linked nodes.

The filter size uses saturating multiplication followed by a clamp and power-of-two rounding. It is never empty: at least 64 bits, at most 2^24 bits (2 MiB). Insertion and lookup use the same complete `Key::hash` value and mask. Thus a linked key always sees its inserted bit. A collision can only produce a positive result for an unrelated key; `name_of` then executes the existing exact-key probe. Filling every filter bit with one restores the original exact lookup behavior. An empty link graph has no set bits and safely returns every input identifier unchanged.

The filter is fully constructed before the `People` object is published through `OnceLock` and its release/acquire readiness flag. Production lookups do not mutate it. `slot_ptr` applies the same membership decision to avoid prefetching a large identity table for a definitely absent ID. Its negative path returns a pointer to the live membership word, not a null or fabricated address. During construction, prefetching explicitly uses `raw_slot_ptr` because the final filter does not yet exist.

| Function | Review of the changed behavior | Source finding |
|---|---|---|
| `People::build` | Every interned endpoint contributes a bit; immutable publication follows construction. | No false-negative path found. |
| `People::raw_slot_ptr` | Renamed original exact-table home pointer; correct short/wide table remains selected. | Unchanged pointer bounds. |
| `People::possible_link` | Same hash/mask as insertion; in-bounds word and shift. | Sound negative check. |
| `People::slot_ptr` | Negative prefetch addresses the filter word; positives use the table's home. | Lifetime and alignment valid. |
| `People::name_of` | Return input only on a negative bit; positives retain exact equality and canonical decoding. | False positives affect work only. |

The new unit test's body was inspected: it checks inserted aliases, unrelated names, an all-ones filter, and empty links. Existing mixed-key integration cases also matter because this new unit uses short IDs. No claim about test execution follows solely from reading its body; the coordinator records actual unit results.

## Distinct initial and person partition sizes

The new sizing targets 48 × 1,024 estimated events per initial dedup partition and 24 × 1,024 per person partition, with the existing power-of-two and minimum/maximum partition bounds. These constants are record-count estimates, not byte capacities. Parsing still partitions by exact event ID using `p1_bits`; dedup's partition queue and local fingerprint/hash-table shifts use that same width. Canonical-person emission, clicks, person scheduling, and local person-table shifts use `p2_bits`. A complete source search found no queue or routing path assuming that the two widths are equal.

The critical allocator correction is the shared block record count. It is computed once using the person partition count and assigned to both `p1_block` and `p2_block`. The 24-record quantum and common/general lane multipliers therefore keep all four event-lane allocation sizes equal. Dedup continues to recycle using `out.a.block_bytes()`. Changing the number of buckets cannot silently change a recycled piece's geometry.

Small fixtures often clamp both partition counts to sixteen, so they cannot independently establish correctness when `p1_bits != p2_bits`. At least one retained nominal one-million-event dataset must pass the new binary before performance selection. The fresh 249/355/1234 references are already available, and their source inputs can be hash-validated without recomputing the reference. The exact reuse runner is `reuse_reference_check.py`.

Source acceptance does not establish a timing benefit. The bitmap adds a small allocation and branch; larger partitions change hash and scheduling locality. Those tradeoffs belong to isolated measurements and capacity checks.

## Executed combined gates

`bench/bin/dense-balanced`, SHA-256 `cd8e9e78e165236c2369629a03ae5e820fe1278bcaf309489471466d3c26b2e1`, passed all **38 adversarial families at NCPU 8**. Both PyArrow and DuckDB read the complete output and matched the plain-reference row multisets; every process exited zero and left stdout empty. This includes mixed short/wide/exotic link components, long transitive chains, inactive canonical minima, empty links, and full 64-bit hash collisions. Receipt: `balanced-quick.json` and its metadata sidecar.

The same binary passed all **three retained fresh-seed references at NCPU 8**. The reuse runner verified the SHA-256 of every source CSV and the manifest before execution, then pinned and rechecked the independently expected Parquet files. All original schemas were valid and both tables matched with zero missing or extra rows. Receipt: `balanced-holdouts.json`.

All three holdouts use 32 initial dedup partitions and 64 person partitions under this sizing. Their shared block count is 504 and the common/general event allocations are each 8,064 bytes. This verifies that the behavioral gate actually executes unequal partition counts and the upper rounded block size; small fixtures alone would not show that. `balanced-holdout-geometry.json` records the source-formula coverage calculation from the already hashed input byte counts. The calculation is a coverage annotation, not an independent semantic oracle.

These gates establish acceptance for comparative performance exploration. A selected final release still receives the full multi-mode/repeat gate and its own full-size output comparison.
