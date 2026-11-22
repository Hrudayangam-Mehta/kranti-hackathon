# Exact 8-byte canonical-person event lane

## Scope

`experiments/dense-p2` is an isolated copy of `dense-combined`, which combines the dense exact IDs, 16-byte event/click records, flat session payloads, people-table change and tighter first-stage blocks. This new experiment changes only the second-stage event representation, its sink capacity and the worker's common-record decoder. It does not change deduplication, canonical-person selection, session boundaries, attribution or output schemas.

The common `PersonSmall` is a single u64:

| Bits | Width | Field |
|---|---:|---|
| 0–40 | 41 | Complete dense canonical-person key |
| 41–63 | 23 | Exact relative timestamp in seconds |

The payload is implicitly zero. Every nonzero payload, wide/large person key or fractional timestamp retains the full 24-byte `PersonRec`.

## Exactness and dataflow

`Emit::resolve` first resolves the original user through the complete link graph, just as before. It computes the partition from that full canonical key and then calls `PersonSmall::new`. The constructor accepts only zero payload, a short dense key fitting 41 bits, and a timestamp whose remainder modulo 1000 is zero. A u32 timestamp's quotient is at most 4,294,967, so 23 bits suffice. Decoding multiplies that quotient back exactly; there is no rounding.

The worker decodes the original canonical key and millisecond timestamp before entering the unchanged local-person lookup and event-group processing. The implicit zero payload preserves both event counts and zero revenue. Positive purchases and all exceptional records retain their complete fields in the general lane.

| Changed function/site | Contract |
|---|---|
| `PersonSmall::new` | Admit only an exact 41-bit dense key, exact whole-second timestamp offset and zero payload. |
| `PersonSmall::person` | Restore the exact canonical key, including dense length information and leading zeros. |
| `PersonSmall::ts` | Restore the original u32 millisecond offset. |
| `Emit::resolve` | Preserve graph canonicalization and partitioning before lane selection. |
| Worker common event load | Reconstruct key/time and pass payload zero into the original event-group logic. |
| Dedup recycle-piece selection | Read `out.a.block_bytes()` from the actual sink, so a type-size change cannot silently halve the recycle piece. |

## Allocation and recycling proof

The common output record count doubles to `2 × p2_block`, so its block byte size stays `16 × p2_block`. General output blocks retain `2 × p2_block / 3` records of 24 bytes, the same byte size. Tight first-stage common blocks are `p1_block` records of 16 bytes; general blocks are `p1_block / 3` records of 48 bytes. The current context computes `p1_block` and `p2_block` identically.

`block_for` quantizes to multiples of 24. Thus the common output count is a multiple of 48, compatible with its eight-record streaming stage; the general output count is a multiple of 16, also compatible with an eight-record stage. Both first-stage counts remain compatible with their four-record stages. No rounding changes the equality. Each retired input block can therefore supply exactly one actual common or general output block.

The duplicate-candidate pointers are still cleared after all reads/emission and before recycling. This representation change does not extend their lifetime or introduce a new alias to recycled data.

## Implemented bounded checks

Two additional unit tests are present:

- 192 key/time/payload combinations cover short codes, leading zeros, exact code bounds, wide/exotic keys, fractional timestamps, the u32 endpoint and nonzero payloads.
- For every 24-record quantum through 504, real `Sink` constructors verify equal actual block byte sizes across both input and both output record types, including streaming-stage rounding and cache-line alignment.

The pinned Rust 1.97.0 static release build passed. All 35 release unit tests passed, including both added tests (1.66 seconds of test execution). Binary `bench/bin/dense-p2` has SHA-256 `79888b8da6f0ca2a9c050d941d608a92dffbd7879858c1e1e972129e23ecd9cf`.

The database expert independently accepted the checked packing and actual sink-byte recycling proof. The parent controls the independent behavioral gate and interleaved performance comparison; neither is implied by the unit-test result. Source hashes and a mergeable delta are saved alongside this report.

## Performance expectation and limitations

Each accepted row saves eight bytes relative to the former 16-byte common second-stage record. A former common row sent to the 24-byte general lane costs eight extra bytes. The record-byte balance improves when more than half of the formerly common rows fit the new lane.

The strongest expected benefit is reduced later-stage storage and memory traffic. Recycled first-stage arena pages remain mapped until the arena release, so smaller second-stage records alone do not guarantee an equal reduction in peak resident memory. The parent should measure both runtime and RSS; no performance result is asserted here.
