# Late-stage component correctness review

This review follows the historical 110-function review and the compact identity/event work in `DEEP_MEMORY_REVIEW.md`. It records the additional packed click/person lanes, adaptive attribution, and dictionary output changes. These are independent source reviews and executed correctness gates. Selection still belongs to the coordinator's measured comparison; passing components separately does not substitute for a frozen merged build's final gate.

`LATE_COMPONENT_REVIEW.sources.json` pins the reviewed source and executed binaries. In the `experiments/dense-final` candidate, all twelve general modules in `FUNCTION_REVIEW.md` are byte-identical to their original reviewed versions. The two optimized writer modules have the changes reviewed here. Their original function-level checks remain applicable to unchanged function bodies; the new or changed functions are explicitly listed below. The two new production functions bring these fourteen modules from 110 to 112 functions.

## Packed click lane and tight allocation blocks

`ClickSmall` stores complete 41-bit canonical-person and click keys, an exact whole-second timestamp in 23 bits, and a checked 23-bit campaign slot. Oversized or wide IDs, fractional timestamps, and oversized campaign slots use the full record. Canonicalization precedes the compact decision. A valid `u32` millisecond timestamp divided by 1,000 is below the 23-bit field capacity. Disjoint shifts reconstruct the original values without truncation.

The allocator geometry must be stated accurately: `block_for` rounds the clamped count to a **multiple of 24 records**. The lower-bound arguments 32 and 64 are not its quantum. Common click capacity is three-halves that count, therefore a multiple of 36 and compatible with the 16-byte record staging. The tight P1 common allocation and wide allocation have equal byte size after the wide count is divided by three. The code uses actual `Sink::block_bytes()` where byte geometry matters.

The combined pre-P2 candidate passed 288/288 adversarial executions (36 families, NCPU 1/8/scalar/general, repeated output writes), plus all 36 official fixtures. The two earlier capacity-successful click/tight variants also matched Team67's complete 60M output exactly, as recorded separately in `LARGE_SCALE_VERIFICATION.md`. That is cross-implementation differential evidence, not an independent 60M oracle.

## Eight-byte post-dedup person lane

`PersonSmall` admits only zero-payload events with complete short canonical IDs that fit 41 bits and timestamps divisible by 1,000. Purchases, fractional times, wide IDs, and oversized short IDs use the full 24-byte record. The common lane uses 8 bytes and restores payload zero. Identity resolution and partition choice occur before packing, so neither the representative person nor routing changes.

The P2 common count doubles to preserve the allocation's byte size. Both P1 source lanes and P2 destination lanes therefore use equal 16-times-block-count byte allocations at the 24-record quantum. Dedup obtains its recycle piece from `out.a.block_bytes()`, rather than assuming the old record size. Candidate pointers are consumed and the emit ring is flushed before source blocks are recycled. The wider tagged-pointer lifetime review remains applicable.

The P2 binary `79888b8da6f0ca2a9c050d941d608a92dffbd7879858c1e1e972129e23ecd9cf` passed **42/42** targeted executions: six new mixed-block runs, eighteen compact-ID/time/dedup runs, and eighteen session-bin/purchase runs. The mixed-block family contains 19,200 surviving events across eight people, whole and fractional milliseconds, purchases and nonpurchases, wide canonical links, leading-zero IDs, repeated output writes, and invalid earliest duplicates. This family's event IDs use punctuation and therefore exercise general P1 input records; the separate compact families and generator data exercise compact P1 input. Every run matches the plain reference through both readers and leaves stdout empty.

## Attribution selected by per-person click count

The adaptive path groups clicks by exact canonical person before selecting an ordering method. Lists of at most four clicks are scanned directly per session. Lists of five through 64 are locally sorted by ascending timestamp and descending bytewise click ID. Larger lists use timestamp radix sorting, followed by the same descending ID tie order. Consequently, the last eligible sorted entry is the bytewise-smallest click among the latest timestamp.

Both event-session paths call `credit_session`. In the direct path, the explicit winner comparison implements latest timestamp then smallest bytewise ID. Short-circuit rejection of future clicks prevents subtraction underflow, and a click exactly seven days old remains eligible. Campaign membership is set once per session and cleared immediately after assists are emitted. In the sorted path, monotonic session starts permit the two-pointer window; zero-to-one transitions register active campaign indices, and swap removal repairs the moved index. Final person cleanup resets every remaining active count. Stale `active_at` entries from a direct scan are harmless because the sorted path rewrites them on every zero-to-one insertion.

The adaptive binary `889b5fd794a3bd2159969ef690501e3197b443dc854b0e9a8a828bb313d92507` passed **216/216** executions: 36 families, NCPU 1/8/scalar, repeated output writes, and both readers. New families explicitly cover click counts 0/1/4/5/64/65, repeated campaigns, identical duplicate clicks crossing those physical-count boundaries, exact seven-day and plus-one-millisecond expiration, multiple sessions, mixed lexical ID classes, and both small-event and bin session paths.

## Standard Parquet dictionary encoding

Reviewed files: `experiments/dense-dict/src/fast/write.rs` SHA-256 `5dc7c88c1fcb7f9c8a7bce9ff3ce97093f4740065daaa19f1479db7a700ffab7`, and `parquet.rs` SHA-256 `29ab5cae5d9598108b46861c826e31b4e3b727b526dfb1a13f5c89fb1a671b6e`. These are the same writer bytes merged into `dense-final`.

The dictionary applies only to required `user_id` strings. It is omitted for fewer than 32 rows and for high run counts. Exact `(hi, lo)` key equality reuses the same dictionary entry even if a person appears in noncontiguous runs. The dictionary is built from the exact requested row range; plain column closures retain that range's base offset. Other columns, including optional category definition levels, keep their existing encoding.

The format follows the [Apache Parquet encoding specification](https://parquet.apache.org/docs/file-format/data-pages/encodings/): PLAIN dictionary entries precede data pages; dictionary indices use RLE_DICTIONARY with a bit-width byte and correctly sized little-endian RLE values. Dictionary indices have no four-byte level-stream length prefix. Metadata lists the used encodings, separates dictionary and data offsets, and includes dictionary pages and headers in chunk sizes. Empty tables retain their typed schema with zero row groups.

The isolated test driver includes the production `write.rs` and `parquet.rs` unchanged. It supplies a deterministic identity-decoder fixture, clearly separated from the real Domain integration test. **11/11 codec cases passed** in both PyArrow 26.0.1 and DuckDB 2.0.1. They cover dictionary counts 1, 2, 255, 256, 257, 65,535, 65,536, and 65,537; a 65,537-row single-value run; multiple 65,536-row pages; an output range beginning inside a person run; noncontiguous reuse; equal low key words with different high words; a 9KB UTF-8 value; all-null optional categories; and empty, tiny-plain, and high-run plain fallbacks. Every field and row multiplicity is compared to the fixture's independently constructed expected values. Metadata checks confirm the intended dictionary/plain choice and offsets. See `dictionary-codec.json`, `dictionary_driver.rs`, and `dictionary_check.py`.

The complete dictionary pipeline binary `9993c19ed8ad7c7b58586dd9241e967e20fb7b07b572db80d7f1379b5fe7b248` then passed **6/6** executions on 5,000 real mixed-format identities over fourteen days, yielding 70,000 user-day rows. Modes were NCPU 1/8/scalar with repeated writes, exact plain-reference comparison, both readers, and empty stdout. The one-worker output has a 66,066-row first file and a 3,934-row second file. Dictionary encoding is confirmed active in every emitted user chunk, including the multi-page file. Receipts are `dictionary-pipeline.json`, its metadata sidecar, and `dictionary-pipeline-encodings.json`.

## Function-specific changes

| Function | Invariant checked | Evidence and status |
|---|---|---|
| `ClickSmall::new` | Checks complete key width, campaign width, and exact seconds before packing; full fallback otherwise. | Source and combined 288 runs; accepted. |
| `ClickSmall::person` | Returns only the complete 41-bit canonical-person field. | Source and exact output IDs; accepted. |
| `ClickSmall::click` | Reassembles low 23 and high 18 click bits without overlap. | Source and lexical attribution cases; accepted. |
| `ClickSmall::ts` | Extracts only 23 timestamp bits and reverses whole-second scaling. | Source and exact-window cases; accepted. |
| `ClickSmall::campaign` | Extracts the checked campaign field. | Source and full campaign-table matches; accepted. |
| `ClickLines::resolve` | Canonicalizes and partitions before choosing representation. | Source and mixed-link/tie cases; accepted. |
| `PersonSmall::new` | Zero payload, narrow complete canonical key, exact seconds; otherwise full fallback. | Source and P2 42 runs; accepted. |
| `PersonSmall::person` | Restores exact key bits. | Source and linked/wide canonical comparisons; accepted. |
| `PersonSmall::ts` | Restores exact admitted milliseconds. | Source and mixed fractional/whole-time gates; accepted. |
| `Emit::resolve` | Identity and partition decisions precede lane choice. | Source and P2 mixed canonical components; accepted. |
| `fast::dedup` | Uses actual output block byte size; flushes pointer consumers before recycling. | Source lifetime/geometry review and P2 gates; accepted. |
| `Worker::partition` | Decodes both P2 lanes and chooses click ordering per exact person's count. | Source and all adaptive thresholds; accepted. |
| `Worker::credit_session` | Inclusive window, lexical winner, one assist per campaign, direct/sorted state reset. | Source and adaptive 216 runs; accepted. |
| `Worker::person` | Monotonic session-start calls and final active-state cleanup. | Source and adaptive small-event path; accepted. |
| `Worker::person_bins` | Same credit helper and cleanup after exact bin session construction. | Source and adaptive bin/whale path; accepted. |
| `write::user_dictionary` | Exact key map, noncontiguous reuse, selected-range indices, small/high-run fallback. | Source and 11 codec plus 6 pipeline runs; accepted. |
| `write::user_part` | Dictionary bound to its lifetime and range; other columns use the same base. | Source and mid-person range/readback; accepted. |
| `write::campaign_table` | Explicit `None` dictionary fields preserve its prior plain encoding. | Diff review and complete campaign row comparisons; accepted. |
| `parquet::dictionary_indices` | Minimum bit width, RLE header, byte-width transitions, page-bounded runs. | Source, cardinalities 1/2, and 8/9/16/17-bit width boundaries; accepted. |
| `parquet::encode` | Dictionary-first pages, proper headers/offsets/chunk sizes, unchanged optional levels and empty schema. | Source and dual-reader codec/pipeline checks; accepted. |

## First merged integration receipt

The initial combined P2 + adaptive + dictionary candidate at `bench/bin/dense-final`, SHA-256 `2fe9e2935a44eecc7665a400265d63544bc97b8967a4a0ea85313a93c39ea7cd`, passed **38/38** current adversarial families at NCPU 8 through both readers, with empty stdout. This quick integration gate was run before performance selection. Final multi-mode/repeat gates, fresh seeded independent references, and a large-output comparison remain separate acceptance steps; they must be recorded against whichever binary is actually selected.

`fresh_seed_check.py` subsequently completed all three original-generator one-million-event datasets: seeds 249, 355, and 1234 with requested click counts 100,000, 350,000, and 800,000. All **six NCPU 1/8 comparisons passed** against unchanged plain-reference semantics computed in a separate process with a bounded output writer. The expected user/campaign row counts were 118,768/23,884, 118,948/27,809, and 118,580/28,010. Reference peak RSS was 966,184–1,283,492 KiB. The complete receipt `fresh-final.json` pins input file hashes, generated windows, stage resource measurements, source/binary hashes, and diagnostics. Independent expected Parquet remains available for a later tuned build; such a build still needs its own execution/comparison against these expectations.
