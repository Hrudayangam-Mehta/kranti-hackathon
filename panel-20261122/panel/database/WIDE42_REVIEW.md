# Final 42-bit record layout: independent correctness review

## Decision and exact source

The final bounded layout change is source-accepted. It is based on the tuned partition configuration, with only `src/fast/mod.rs` changed in production relative to that parent. The earlier optional identity membership filter is absent. The full source inventory is in `WIDE42_REVIEW.sources.json`; the reviewed module has SHA-256 `ff748fd98d5b434d09d0b9ea575f606bbdfcbfbfcdfd18c7881f333edb2676ad` and the tested binary has SHA-256 `05518580abfc9a52e305e390401541f7f57fffbd740c3df9ead56fc86413a1ff`.

The exact short-ID limit increases from 41 to 42 bits, while the whole-second offset field decreases from 23 to 22 bits. The dense codec still preserves the complete identifier, including its length and leading zeros. Values outside the compact representation take the existing full-record path. No input values are truncated, no hash substitutes for identity equality, and no dataset-specific mapping is assumed. The benefit sought is a lower rate of full-record fallbacks; that is a capacity/performance hypothesis, separate from the correctness gates below.

## Per-function review of the changed representation

| Function | Purpose and checked invariant | Result |
|---|---|---|
| `short_code` | Accept only exact short-domain keys (`hi == 0`) whose complete dense value fits 42 bits. The zero event key is separately rejected by the event constructor. | Accepted. |
| `short_key` | Reconstruct the complete short key from its stored dense value; the unchanged domain decoder recovers original bytes. | Accepted, unchanged. |
| `EventSmall::new` | Require zero payload, short keys, checked nonnegative relative ingest, and whole seconds. Ingest must fit 22 bits. Valid event timestamps must be strictly below the all-ones 22-bit sentinel; invalid rows alone use that sentinel. | Accepted; the explicit valid-time guard is essential. |
| `EventSmall::event` | Recover low 42 bits without contamination from the low 22 user bits in the first word. | Accepted. |
| `EventSmall::user` | Combine the first word's top 22 bits and the second word's low 20 bits into the original 42-bit user key. | Accepted. |
| `EventSmall::ingest` | Extract only bits 20–41 of the second word, multiply by 1000, and add the same base used by checked construction. | Accepted. |
| `EventSmall::ts` | Extract bits 42–63; decode the all-ones sentinel as invalid, otherwise recover exact milliseconds. | Accepted. |
| `PersonSmall::new` | Require zero payload, exact short canonical key, whole-second timestamp, and timestamp seconds at most the 22-bit maximum. There is no invalid sentinel in this stage. | Accepted; the maximum valid second is allowed here. |
| `PersonSmall::person` | Recover the low 42-bit canonical key exactly. | Accepted. |
| `PersonSmall::ts` | Recover the top 22-bit whole-second timestamp and multiply by 1000. | Accepted. |
| `ClickSmall::new` | Check both full short keys, whole-second timestamp, timestamp bound, and campaign index bound before packing. | Accepted; out-of-range timestamps or campaign indexes remain full records. |
| `ClickSmall::person` | Recover low 42 bits of the first word. | Accepted. |
| `ClickSmall::click` | Reassemble the click key's low 22 and high 20 bits without touching the time field. | Accepted. |
| `ClickSmall::ts` | Extract bits 20–41 of the second word. | Accepted. |
| `ClickSmall::campaign` | Extract bits 42–63 of the second word. | Accepted. |

Each 128-bit event/click record contains `42 + 42 + 22 + 22 = 128` bits. In the second word, the remaining 20 key bits, the 22 time bits, and the final 22 bits occupy disjoint intervals. At maximum encoded seconds, multiplication by 1000 gives 4,194,303,000, which fits `u32`. The only difference between an event timestamp at that value and an invalid event is handled before packing: a valid timestamp uses the full event record. It can later safely use the compact person record, where the sentinel is not reserved.

No candidate pointer ownership, partition key, equality, canonicalization, duplicate winner selection, session, attribution, or output algorithm changed in this layout step. Their prior source reviews remain applicable only where the source inventory matches. The composed implementation includes compact P1/P2/click lanes, exact mixed identity storage, flat session bins, adaptive click processing, and the checked optional user-ID Parquet dictionary. The original general-path modules and the original hidden-input discovery correction are retained. See `FUNCTION_REVIEW.md`, `DEEP_MEMORY_REVIEW.md`, `LATE_COMPONENT_REVIEW.md`, and `FILTER_PARTITION_REVIEW.md` for those explicit function reviews and their historical pins; this document does not relabel historical binary tests as tests of this binary.

## New independent integration cases

`wide42_time_boundaries` uses a 42-day event window. Including the seven-day click lookback, its total relative-time span is 49 days and still fits the fast engine's unsigned millisecond representation. A 50-day event window would bypass that engine and would not exercise these packed boundaries. The harness asserts that the fast engine remains active in the normal and scalar modes.

The time case includes the 22-bit maximum second minus one second, minus one millisecond, the exact maximum, plus one millisecond, and the next two seconds. Valid views at the sentinel collision survive through the full P1 lane. Clicks at the endpoint and beyond, exact timestamp ties, inclusive seven-day attribution, and later sessions test P2/click reconstruction. Earliest invalid copies remain suppressors, and mixed purchase/view copies with different users test winner selection across lanes. Relative ingest timestamps straddle the same 22-bit boundary.

`wide42_key_lane_boundaries` derives identifier suffixes from the independent dense length-interval formula, rather than treating a numeric base-36 suffix as though it were the dense value. It tests exact values around `2^41` and `2^42`, all-eight-digit extremes, distinct leading-zero lengths, mixed full/compact duplicates, linked components crossing the packing threshold, and click ties. Each reference result is computed by the separate rules-based Python reference from original CSV bytes.

## Verification status

The quick integration run passed all 40 families at eight workers, including both new families with fast-path assertions, empty stdout, exact row multiplicities, and readback through both PyArrow and DuckDB. Receipt: `wide42-quick.json` and its metadata sidecar.

All three independently generated one-million-event holdouts (seeds 249, 355, and 1234) also match their retained, independently computed complete expectations at both one and eight workers: six exact comparisons. The reuse runner verified unchanged input bytes and expected Parquet hashes. Receipt: `wide42-holdouts.json`. These are independent medium-scale semantic checks, not an official score and not an independent 60-million-event proof.

The final integration gate passed **320/320** runs: 40 families, NCPU 1 and 8, scalar parsing, the general engine, and repeat execution into each output directory. Every run requires empty stdout, the correct logical schema, exact row multiplicities, and agreement through both readers. Receipt: `wide42-final.json` with the source/binary/reference pins in its metadata sidecar. The unchanged official fixture runner also passed **36/36** cases at eight workers; `wide42-official-fixtures.json` pins that runner and every fixture file. The official runner itself does not assert empty child stdout, so that property is established separately by the integration and holdout gates.

A successful, complete large-scale output must be selected before any final 60-million-row comparison; partial outputs from killed runs must not be used.

## Completed final 60M differential release gate

The preserved final output `bench/outputs/f60-wide42-spacechecked-n8-wide42-r00` matches the successful pinned Team67 output `bench/outputs/f60-final-n8-team67` exactly: **6,629,125 user-day rows and 28,014 campaign-day rows**, valid original schemas, zero missing rows and zero extra rows. This checks every output row and duplicate count through an exact external-sort/stream merge, not a sampling or hash-only comparison. The complete receipt is `wide42-final60m-vs-team67.json`; the comparison took about 23.12 seconds with a 512 MB DuckDB setting, one thread, and 662,588 KiB measured peak process RSS. These are comparator resources, not pipeline timing.

The coordinator's corresponding preserved candidate execution completed at eight workers with exit 0, empty stdout, about 3.40255 seconds, and 3,039,620 KiB peak RSS after filesystem space was freed. Earlier ENOSPC failures and signal-9 terminations must remain in the capacity report; the disk-space finding explains observed filesystem failures but does not prove the cause of earlier kills. This successful full-data equality is differential evidence against the locally pinned competitor, while the three independently computed one-million-event references provide separate semantic evidence. No independent full-60M oracle or official score is claimed.
