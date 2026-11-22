# Dense click and allocation experiments

Two isolated variants were copied from the parent's `experiments/dense`. They are independent ablations: `dense-clicks` changes click representation; `dense-tight` changes only the first-stage event block sizes. Neither changes the dense baseline, production checkout, output schema or README files.

## `dense-clicks`

The common click record shrinks from 24 to 16 bytes. A row is admitted only when its canonical-person and click keys are short dense codes no larger than `2^41−1`, its relative timestamp is exactly divisible by 1000, and its campaign index fits 23 bits. Otherwise it uses the unchanged 40-byte `ClickRec`.

| Conceptual bits | Width | Stored field |
|---|---:|---|
| 0–40 | 41 | Canonical-person dense code |
| 41–81 | 41 | Click dense code |
| 82–104 | 23 | Exact relative timestamp in seconds |
| 105–127 | 23 | Campaign index |

The two-word layout uses the same split of the second 41-bit code as the event representation. The constructor's bounds prevent field truncation. A valid u32 timestamp divided by 1000 is at most 4,294,967, well inside 23 bits, and multiplication restores it exactly because of the remainder check. No invalid-timestamp sentinel is needed for accepted clicks: timestamp validation already occurred in the parser.

`ClickLines::resolve` still canonicalizes the person through the complete link graph and selects the hash partition before packing. The worker reconstructs the same person and click keys, exact timestamp and campaign. Equal-time click ordering still uses `Domain::cmp`, retaining bytewise lexical ties across short, wide and general lanes.

The common sink's record count per block increases by 3/2, preserving the old block byte size. `block_for` produces multiples of 24, so the new count is a multiple of 36 and is compatible with the four-record streaming stage for 16-byte records. General click blocks are unchanged.

### Function contracts

| Function or changed site | Contract |
|---|---|
| `ClickSmall::new` | Accept only exactly bounded dense keys, an exact timestamp quotient and a bounded campaign index; return `None` for every exception. |
| `ClickSmall::person` | Return the exact previously canonicalized key. |
| `ClickSmall::click` | Return the exact click key, preserving all dense length information. |
| `ClickSmall::ts` | Restore the original u32 millisecond timestamp without rounding. |
| `ClickSmall::campaign` | Restore the original campaign index. |
| `ClickLines::resolve` | Choose the common or general sink after unchanged canonicalization and partitioning. |
| `Worker::partition` common click load | Decode fields before unchanged person lookup, timestamp sort and lexical tie handling. |

### Verification receipt

Pinned Rust 1.97.0 static release build passed in 22.68 seconds. All 33 release unit tests passed, including two new click tests; test execution took 1.69 seconds. The new cases cover 1,440 combinations of key classes, timestamp edges and campaign boundaries, plus 100 bytewise ordering comparisons including leading zeros and wide IDs.

Binary: `bench/bin/dense-clicks`.

SHA-256: `b7ae586ec7ce4c7a5fc206f620ecf3d5fb4f1d13aca2ce8d298fe241823c2562`.

The independent database reviewer found no source-level issue in packing, exact timestamp fallback, canonicalization order or stage geometry. No large behavioral or performance test was run by this reviewer.

### Expected effect and tradeoff

Every accepted click saves 8 bytes relative to the previous common lane. A previous short-lane row now requiring fallback costs 16 extra bytes because the full row is 40 bytes. The expected 15M-click saving has an upper bound of 120 MB before allocator overhead; the realized benefit depends on the field mix. Fractional timestamps, large dense codes or unusually many campaigns can reduce or reverse that saving. This is a layout calculation, not a measured RSS result.

## `dense-tight`

This tree is based on `dense` directly, without the click change. Its only source difference is the first-stage event sink allocation:

| Lane | Previous record count | New record count |
|---|---:|---:|
| Common, 16 bytes | `2 × p1_block` | `p1_block` |
| General, 48 bytes | `2 × p1_block / 3` | `p1_block / 3` |

The two lanes now allocate the same byte size as one common second-stage recycle piece, rather than two pieces. Both `p1_block` and `p2_block` are currently computed by the same `block_for` call. They are multiples of 24, so dividing the general count by three produces a multiple of eight: no truncation or streaming-stage rounding changes the intended byte count. Sixteen-byte common rows need multiples of four and 48-byte general rows also need multiples of four. Both counts satisfy those requirements.

This bounds the unused tail of each per-thread, per-partition block more tightly and preserves exact recycling geometry. It may increase the number of block metadata entries and refill calls. Correctness is unchanged because `Sink` records actual block capacity and returns exactly the written records; partitioning and candidate lifetimes are untouched.

The independent database reviewer accepted this allocation argument. The pinned Rust 1.97.0 static release build passed in 19.40 seconds. Binary: `bench/bin/dense-tight`, SHA-256 `15967d3db3a2aa7dc23b5d33e421c0a6eefa4ce2baba8a1bd3e953b2d5ffd653`. No speed or peak-memory result is asserted here; the parent owns those measurements.
