# Exact 16-byte event lane

## Scope and status

Source is isolated at `experiments/compact16`, copied from the passing `experiments/compact` 24-byte experiment. Only `src/fast/mod.rs` differs. No competitor implementation was copied. This follows a representation proposed independently by the parent: narrow exact character values and timestamps when they fit, with the existing full record for every exception.

The 24-byte experiment remains unchanged for comparison. Source hashes are in `panel/rust/COMPACT16_SOURCE.json`.

The pinned Rust 1.97.0 static release build passed in 19.89 seconds. All 31 release unit tests passed, including the five new property/boundary tests, with 1.68 seconds of test execution. The binary is `bench/bin/compact16`, SHA-256 `531c910d6ad4b53ad0ed3d4a6aa0304b3f6e7dd840fc2c9bf1ec3c323c28ac72`. No large performance run was performed by this reviewer. The independent database reviewer subsequently reported 18/18 targeted end-to-end checks passing for the parent's combined deep16 tree; that combined-tree receipt is distinct from this standalone binary's unit tests.

## Record layout

`EventSmall` contains two u64 words, 16 bytes total. Its conceptual 128-bit value is:

| Bits | Width | Field |
|---|---:|---|
| 0–40 | 41 | Event character-code value |
| 41–81 | 41 | User character-code value |
| 82–104 | 23 | Ingestion offset, in exactly representable seconds |
| 105–127 | 23 | Event timestamp offset, in exactly representable seconds, or invalid sentinel |

The actual two-word implementation stores the low 23 user bits above the event code and the remaining 18 user bits below the timestamp fields. Bounds are checked before packing, so the fields cannot overlap. Both words retain 8-byte alignment, preserving the candidate pointer-tag proof from the 24-byte version.

## Character-code proof

The original short-key representation encodes a lowercase base36 string of length `n` as `value × 36^(12−n) + n`, with the domain prefix stored separately. The compact lane accepts only values `v < 2^41−1` and stores `v+1`. Zero is reserved for the existing missing-user sentinel on invalid rows. Valid event IDs never use zero.

For a string of length greater than one, the lane additionally requires `v >= 36^(n−1)`. This rejects leading-zero forms rather than silently merging them with their shorter spelling. Values under the 41-bit limit have at most eight canonical base36 digits. `short_key` recovers that digit length from powers-of-36 thresholds and reconstructs the exact original key. Because there is one canonical digit string for each accepted value, this mapping is injective on its accepted domain.

The original prefix behavior is unchanged and independently tested with no prefix and two distinct one-byte prefixes. Uppercase, unusual characters, long strings, wide keys, leading-zero strings and values outside the bound continue through the full original record and exact interner. This is reversible character storage, not an interpretation of IDs as generator row numbers. No seed, generator key, input cardinality or expected output is used.

## Timestamp proof

Ingestion first performs checked subtraction from the unchanged `ctx.cws`. Negative offsets, overflow, a nonzero remainder modulo 1000, or a quotient greater than `2^23−1` use the general lane. Otherwise storing the quotient and multiplying it back by 1000 exactly restores the original signed ingestion timestamp. The original successful checked subtraction proves the reconstruction's addition remains in i64 range.

The event timestamp is already an exact u32 millisecond offset. A valid timestamp with a nonzero remainder modulo 1000 falls back. The greatest representable u32 millisecond timestamp divided by 1000 is 4,294,967, below the reserved all-ones 23-bit invalid code 8,388,607. Therefore a valid timestamp cannot collide with the invalid sentinel. An existing invalid timestamp is deliberately encoded as that sentinel and decoded back to `u32::MAX`.

These tests concern offsets relative to `ctx.cws`, so a manifest origin containing milliseconds can still be represented exactly when the relative offsets are whole seconds. Nothing is rounded to the wall-clock second.

## Dataflow and function contracts

| Function | Contract |
|---|---|
| `short_code` | Accept only the supported exact short-key domain and return an injective bounded code. Reject all other identities without alteration. |
| `short_key` | Decode a masked 41-bit code back to the original key; code zero denotes only the existing zero sentinel. |
| `EventSmall::new` | Accept zero-payload rows only after all key and timestamp checks. Fall back to `EventRec` on any failed check. |
| `EventSmall::event` | Decode the event field exactly, preserving the original hash partition and equality semantics. |
| `EventSmall::user` | Decode the original user key; canonical-user resolution remains after global event dedup. |
| `EventSmall::ingest` | Restore the exact original ingestion timestamp using the same base. |
| `EventSmall::ts` | Restore the exact original u32 timestamp or invalid sentinel. |
| `Candidate` accessors | Use the matching compact decoder or original general fields; all pointer-lifetime and recycling rules remain unchanged. |
| Parse-stage sink allocation | Twice the previous common-lane record count per block preserves the old 1536-byte block geometry for 16-byte rows. |
| Dedup passes | Reconstruct the original event key before hashing/comparison. Same-ID rows in different lanes still meet in one exact dedup partition. |

Invalid earliest rows remain retained and can suppress later valid copies. The full fallback retains fractional timestamps and nonzero purchase payloads. No output, attribution, session boundary, canonical-name rule or schema is changed.

## Implemented tests

Five `cfg(test)` functions cover:

1. Sixty thousand deterministic randomized numeric values plus boundaries around powers of 36 and the 41-bit limit, comparing reconstruction against the existing independent `Domain::encode` / `bytes_of` path.
2. Leading-zero, prefix, case, punctuation, long-string and large-value fallbacks.
3. Cross-products of signed timestamp origins, exact/inexact ingestion offsets, the 23-bit maximum, u32 timestamp edges and the invalid sentinel.
4. Nonzero payloads, wide users, arithmetic overflow and missing-user invalid rows.
5. Compact/general candidate tags, exact payload retrieval and loser marking.

The database reviewer independently checked the bit ranges, decoding injectivity, modulo gates, sentinel separation and candidate lifetime in source. Suggested end-to-end boundary IDs are `2^41−2`, `2^41−1`, and `36^7±1`; ingestion boundaries include `ctx.cws + 8,388,607,000 ± 1000` milliseconds. Those behavioral tests remain the independent gate, not something this source proof replaces.

## Expected effect and limits

Each accepted record saves another eight bytes relative to compact24 and sixteen relative to the original short record. Full-lane fallbacks can cost sixteen bytes more than the original short record. Thus this two-lane variant improves the old short-record footprint when more than half of those rows fit the new narrow representation. A corpus dominated by arbitrary long numeric spellings, fractional timestamp offsets or purchases can be correct but use more memory than the original pipeline.

Encode/decode arithmetic, additional branches and indirect candidate loads may offset memory gains in CPU time. The parent will compare both speed and peak resident memory, including the 60M case. No performance gain is asserted before those measurements.
