# Compact event dataflow experiment

## Implemented source and build receipt

Isolated tree: `experiments/compact`, copied from `experiments/bins-plain`. Only `src/fast/mod.rs` changed. The source/configuration inventory is `panel/rust/COMPACT_SOURCE.json`; no production checkout was edited. Static release build passed on Rust 1.97.0 with the locked dependency set and `-C target-feature=+crt-static`.

Binary: `bench/bin/compact`.

SHA-256: `e1a487911743df2f77e9314632bec8159b6b0ad8518d4f7c60a004268035bf7c`.

The independent database reviewer subsequently reported 240/240 adversarial runs passing (24 cases, five execution modes, repeated), with both Parquet readers. Cases included cross-lane event IDs, invalid earliest copies, large ingestion timestamps, physical chunk boundaries and 48 distinct IDs sharing a full hash value. The parent owns large measurements; its later 60M runs still exceeded the practical memory limit, so this version was not a sufficient final solution by itself.

## Observed reason for this experiment

The parent's `bench/results/f60-round3-n8.json` records all three 60M runs of both the C baseline and bins-plain terminating with signal 9 around 3.4 GiB maximum resident memory. Their logs contain setup and link-build completion but no dedup completion. The comparator completed all three runs around 2.38 GiB maximum resident memory. Signal 9 alone is not proof of a kernel OOM cause; the parent is correlating these results with the workspace's memory constraint.

The dominant candidate is the retained first-stage event stream, not the partition-local dedup scratch alone. Existing common event records occupy 32 bytes, while a wide user/event key promotes the whole record to 48 bytes. All first-stage records accumulate before dedup can begin, alongside the people structure and active input mappings.

## Exact representation change

The common first-stage record is now 24 bytes:

| Field | Bytes | Meaning |
|---|---:|---|
| `event` | 8 | Unchanged reversible short event key |
| `user` | 8 | Unchanged reversible short user key, or existing invalid-row zero sentinel |
| `ingest` | 4 | Exact unsigned millisecond offset from `ctx.cws` |
| `ts` | 4 | Unchanged millisecond timestamp offset or `INVALID` |

This lane is used only when both key high words are zero, the event payload is zero, and checked subtraction plus `u32::try_from` accepts the original ingestion timestamp. All other rows retain the existing full-width `EventRec`. No timestamp is rounded. No key hash substitutes for equality. There is no use of generator indices, seed recovery, or expected outputs.

An invalid row can still be the earliest copy of an event. A parseable ingestion timestamp that fits the compact lane remains represented even if the event timestamp or other fields are invalid; `ts = INVALID` carries that state. Invalid ingestion parsing retains the preexisting full-record `i64::MAX` behavior. Purchase payloads and exceptional timestamps stay in the full record.

The compact sink's block count grows by 4/3, so its new 24-byte records occupy the same block byte size as the previous 32-byte records. That preserves the existing allocation alignment and exact subdivision into second-stage recycle pieces; changing record size alone would have discarded a third of many blocks during recycling.

## Deduplication dataflow and function contracts

Duplicate candidates are now 8-byte tagged pointers into immutable first-stage records rather than promoted 48-byte records. The low pointer bit identifies the full-record lane; the second bit marks a discarded candidate. Both source record types have at least 8-byte alignment. `map_addr` preserves the pointer's allocation provenance when setting or clearing those tags.

| Function or changed section | Contract and reason |
|---|---|
| `EventLines::line` | Compact only after exact representability checks. Otherwise preserve the full source record. Hash partition remains `part_of(event, p1_bits)` for both lanes. |
| `Candidate::small` | Input refers to a live, aligned `EventSmall` in the current dedup partition. Retains its address without copying fields. |
| `Candidate::wide` | Same lifetime condition for `EventRec`; sets the lane tag in a known-zero alignment bit. |
| `Candidate::event` | Clears both tags and reconstructs the exact key from the matching source type. The result is identical to the parse-stage partition key. |
| `Candidate::ingest` | Full lane returns the original i64 value; compact lane adds the checked offset back to the unchanged base. The parser's representability condition proves this addition cannot overflow. |
| `Candidate::discard` | Sets only the loser tag; it does not mutate the shared source record or change its type tag. |
| `Candidate::value` | Rejects discarded candidates and original invalid rows, then copies only the winning user/timestamp/payload into the emit ring. |
| `dedup` bitmap pass | Unchanged collision prefilter. A hash collision only sends additional rows to exact-key resolution. |
| `dedup` exact table | Chooses minimum ingestion timestamp globally by event ID, across both lanes. An earlier invalid row still suppresses a later valid row. |
| `dedup` end-of-partition | Flushes all pending values, clears the pointer vector, and only then recycles source blocks. No candidate is dereferenced after recycling. |

The independently reviewed rule says equal-ingestion copies are identical, so the additional lane condition does not require a new payload/user tiebreak. Distinct ingestion timestamps retain their exact order. Transitive canonical-user lookup still occurs after event-ID dedup through the unchanged `Emit` path.

## Expected benefit and tradeoffs

For rows whose two IDs fit the old short lane, each newly compact row saves 8 retained bytes. Each zero-payload or timestamp exception sent to the full lane instead costs 16 additional bytes relative to that old short record. Thus this particular two-lane design reduces record bytes when fewer than one third of the old short-lane rows need the fallback. A purchase-heavy adversarial input can be correct yet use more memory than the baseline; this is an explicit limitation of the first compact experiment.

For an illustrative independent 1-in-8 wide-key mix and 3% purchase rate, ignoring other invalid/timestamp exceptions, the arithmetic predicts approximately 334 MB less retained record data over 60M rows. This is a layout calculation, not a measured RSS reduction. Block tails, input mappings, allocator behavior and other stages still contribute to peak memory.

Candidate storage drops from 48 to 8 bytes per ambiguous row, but it is partition-local, so the strongest expected benefit there is reduced copying. Extra indirect loads and delayed recycling may affect speed. Only paired measurements can establish the net effect.

## Targeted independent checks requested

- Earliest invalid copy versus later valid copies with differing users.
- Exact event IDs present in both compact and full lanes.
- Checked-ingest boundaries at zero, `u32::MAX`, negative offsets and very large i64 values.
- Fractional-millisecond distinctions and arbitrary opaque IDs.
- Deliberate hash-bucket collisions, repeated files/chunks and reordered rows.
- Purchase-heavy inputs to expose the representation's memory tradeoff.

The database reviewer accepted the source-level boundaries and is preparing these checks. Existing parser, SIMD, opaque-ID, graph and Parquet gates remain necessary.

## Independent review of the parent's people-table variant

Read all of `experiments/people/src/fast/people.rs`. No source-level blocker was found. The two hash-table families retain exact full keys; the short-key rank is strictly below `2^63`, so the canonical-name indirection tag is disjoint from genuine short keys. Valid short keys are nonzero, leaving the empty-slot sentinel unambiguous. Tables have more slots than inserted endpoints, so probing terminates.

Union by size preserves an acyclic forest and keeps each root's bytewise minimum separately. Path halving does not change that minimum. Finalization caches a wide canonical name once per component for short-table references; wide-table entries retain their full canonical key. `slot_ptr` selects the correct bounded table. The existing u32 node/cardinality limit remains well above the intended dataset scale, but this review is not a claim about more than four billion distinct linked nodes.
