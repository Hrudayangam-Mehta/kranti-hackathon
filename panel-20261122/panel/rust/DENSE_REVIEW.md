# Independent review of dense exact character codes

Reviewed the parent's `experiments/dense/src/fast/id.rs` and modified `short_avx2` path in `scan.rs`, the direct 41-bit adapters in `fast/mod.rs`, and relevant comparison callers. No source was changed by this reviewer. The parent reports 31 unit tests and the independent database panel reports 272 adversarial runs passing for its combined dense tree; those are separate execution receipts from this static review.

## Length intervals are injective

`SHORT_BASE[1] = 1`; each next base adds `36^(n−1)`. A length-n string is encoded as its exact base36 digit value plus `SHORT_BASE[n]`. Therefore its interval is `[SHORT_BASE[n], SHORT_BASE[n+1]−1]`: neighboring lengths are adjacent and cannot overlap. Leading zeros remain distinguishable because length is carried by the interval. The maximum supported short code is below `2^57`, so it does not conflict with the people table's bit-63 indirection tag. Code zero remains outside the valid nonempty-string domain.

The balanced `short_len` thresholds select the correct interval for lengths one through eleven. `short_rank` subtracts the interval base and restores the old fixed-width lexical rank by multiplying by `36^(12−n)`.

## Comparison and reconstruction

Raw numeric comparison is used only when the two strings have equal length, where base36 numeric order is bytewise lexical order. Differing lengths compare the old padded lexical rank plus length. Padding with zero-valued digits makes prefix-related strings share the numeric rank; the small length term then orders the shorter prefix first without overtaking the next possible rank. Mixed short/hex comparison uses the same rank projection. Exotic identities continue to compare reconstructed full bytes.

`bytes_of` reconstructs the same padded rank and takes exactly the original number of digits, preserving leading zeros. Searches of the fast source found no remaining direct short-code numeric ordering used as a cross-length lexical comparison. Click tie ordering still calls `Domain::cmp`; people canonicalization uses the same exact comparator.

The helper precondition remains material: `short_rank`, `short_cmp` and `bytes_of` expect valid nonzero short keys. Zero is used only for internal invalid-row state and is not emitted or passed to these comparators by the inspected production paths.

## SIMD right-alignment proof

For an accepted length n in 1–11, the shuffle index at output byte i is `i+n−12`. Negative indices have their high bit set, so the shuffle zero-fills them. The n input digits occupy output positions `12−n` through 11. Positions after 11 read only input lanes already cleared by the original inside-length mask. The fixed three-quad reduction therefore computes the exact unpadded numeric value.

Each multiply-add pair is at most `35×36+35 = 1295`, below signed-16 saturation. Each four-digit value is at most `36^4−1`, below signed-32 range. The leading quad includes a zero because n is at most eleven, and the complete value is at most `36^11−1`, safely within u64. The same length-interval base is then added as in the scalar path.

Invalid bytes are rejected by the existing vector validity mask before the reduction. The 16-byte load and padding obligations are unchanged from the earlier scanner review. The scalar Horner path also remains within u64 even while accumulating masked invalid digits before returning failure.

## Direct 16-byte record adapters

The compact record now accepts `key.lo` directly when the key is short and its complete dense code fits 41 bits. Decoding returns that same value. Unlike the earlier conversion-based compact16 experiment, no length recovery or character-value division occurs during event hashing or duplicate comparison. The checked timestamp layout, invalid sentinel and full-record fallback remain unchanged.

This is an exact representation change over opaque strings. It neither derives identity from generator structure nor omits string cases: unsupported narrow-record values remain in the general exact-key lane.

## Remaining experimental question

Changing the dense key representation changes the hash distribution as well as reducing hot-path arithmetic. Therefore any observed speed difference must be measured as the whole implementation change; it cannot be attributed solely to fewer instructions without additional profiling. No performance claim is made by this source review.
