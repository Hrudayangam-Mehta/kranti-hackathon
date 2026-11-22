# Exact dense identifier representation

This independently implemented change uses the field bytes and a reversible representation. It neither infers generator state nor recovers hidden indices. Other shapes retain the full existing key representation.

## Encoding and inverse

For a lowercase base-36 suffix of length n, 1 <= n <= 11, let v be its numeric value. Define B(n) = 1 + sum(36^k, k=1..n-1), and store B(n) + v. Each length occupies a disjoint interval ending immediately before the next interval. Leading zeros therefore survive through the interval's length information. Zero remains the empty internal sentinel. The maximum short code, sum(36^k, k=1..11), is less than 2^57, disjoint from the identity table's bit-63 indirection tag.

The detected common one-byte prefix remains part of the domain. Other prefixes, arbitrary bytes, longer strings, and reserved long-key patterns retain the exact fallback. Lowercase 32-character hex suffixes retain their full 128 bits. A fingerprint never replaces equality.

## Bytewise ordering

Length-interval order is not bytewise order: `10` sorts before `2`. Domain::cmp compares raw dense codes only for equal lengths. Otherwise it reconstructs the original lexical rank L(v,n) = v * 36^(12-n) + n. The length term resolves prefix/zero-padding ties. Mixed short/hex comparisons use the original twelve-digit lexical projection; exceptional keys compare their original bytes. Output reconstruction uses the same inverse. Component minima and equal-time click tie-breaking remain exact.

## SIMD and compact records

The AVX2 encoder validates used bytes, right-aligns their digit values into twelve positions with a byte shuffle and left zero fill, applies the existing pair/quadruple multiply-add reductions, then adds B(n). It agrees with the scalar Horner loop. The existing padded scanner lifetime contract remains unchanged.

The common sixteen-byte event lane admits two exact codes only when each fits 41 bits. Ingest and event times occupy checked 23-bit relative whole-second fields. Millisecond values, purchases and wider identifiers retain full records; timestamps are never rounded. Both lanes partition on the same exact Key, preserving global duplicate equality.

Unlike the preceding compact16 experiment, the dense representation avoids converting IDs between lexical padding and numeric codes during duplicate scans. Lexical projection occurs only where ordering is needed.

## Evidence and scope

Root, Rust and database reviewers independently checked interval separation, inverse reconstruction, SIMD arithmetic, ordering, sentinels and mixed-lane deduplication. A source search found no missed raw short-code lexical comparisons outside the domain comparator.

The first dense binary passed all 31 release unit tests, including randomized scalar/AVX2 equality and exact order/round-trip tests. It passed 272/272 behavioral executions across 34 case families, one/eight workers, scalar/general fallback, repeated output writes and two Parquet readers. The official one-million-event answer matched exactly: 118,107 user rows and 27,449 campaign rows, zero missing/extra rows and duplicate keys. These receipts apply to the pinned dense binary, not automatically to later variants.

The encoding proof does not imply a speed or capacity result. Runtime, memory use, and full-scale completion are measured separately against original C and the pinned comparator.
