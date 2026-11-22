# Independent correctness review of the memory rebuild

## Scope and decision

The earlier session-bin changes passed their behavioral gates, but that did not establish that the full pipeline would finish the nominal 60M workload under this machine's memory constraint. The coordinator's recorded 60M runs exposed a separate capacity problem. This review therefore checks the new record and identity representations against exact semantic invariants before their measured promotion.

No competitor source was copied. The reviewer owns these tests and reports; production changes in the new experimental trees belong to their respective authors. The original hidden `.csv` input fix remains the only production edit by this reviewer.

## What the 60M evidence actually says

Source: `bench/results/f60-round3-n8.json`, dataset `data/f60-seed61`, NCPU 8, three measured executions per binary.

| Binary | Completed executions | Recorded maximum RSS, KiB | What is established |
|---|---:|---|---|
| Baseline C | 0/3 | 3,591,936; 3,579,940; 3,582,612 | All three processes ended with signal 9. Their partial output cannot serve as a full-data oracle. |
| Earlier bins-plain | 0/3 | 3,568,940; 3,553,836; 3,584,948 | The session optimization alone did not resolve the observed capacity problem. |
| Team67 | 3/3 | 2,485,480; 2,498,208; 2,504,724 | The independently built competitor completed this local workload at materially lower peak RSS. |

The signal and RSS data are consistent with memory pressure. The reviewer did not independently obtain an OOM-killer log, so signal 9 alone is not presented as proof of its cause. These are local measurements; they do not establish failure under the organizer's different 24 GB configuration. Runtime comparisons must use completed, equivalent runs and the coordinator's interleaved timing results.

The follow-up `bench/results/f60-deep24-n8.json` also records zero successful runs out of three for both compact24 and the combined deep24 binary. Their recorded RSS ranged from 2,801,748 to 3,041,424 KiB. Team67 again completed three of three runs. Reduced record size alone therefore had not yet established successful 60M capacity. The six nominal20M outputs, including deep24 and Team67, subsequently matched baseline C exactly; correctness at that scale and capacity at the larger scale remain separate results.

## Concrete memory changes and their correctness conditions

### Compact 24-byte records and 8-byte duplicate candidates

Reviewed source: `experiments/compact/src/fast/mod.rs`; executed binary SHA-256 `e1a487911743df2f77e9314632bec8159b6b0ad8518d4f7c60a004268035bf7c`.

The common record retains two exact short keys, the exact relative `u32` ingest value, and the exact `u32` event timestamp. Only zero-payload records enter this representation. Purchases, wide IDs, negative relative ingest, and ingest values outside the checked representation fall back to the complete 48-byte record. An invalid earliest copy must still reach deduplication; its invalid timestamp is retained rather than dropping the copy before the event ID has been resolved.

`Candidate` contains a pointer to an immutable source record plus two low-bit tags. It does not replace event-ID equality with a hash. Every source address is at least four-byte aligned, and both record strides preserve that alignment. Pointer tagging and untagging use `map_addr`, and each dereference clears both tags. A discarded candidate retains its event/ingest fields so collision-chain and winner comparisons remain valid.

The lifetime proof is a release-order argument: all partition candidates are resolved and emitted; `emit.flush` finishes; the candidate vector is cleared; only then are that partition's blocks recycled. The partition remains assigned to one worker. The existing whole-stage completion barrier precedes arena release. No candidate survives block recycling. This source review found no violation of these invariants.

### Compact identity map

Reviewed source: `experiments/people/src/fast/people.rs`; executed binary SHA-256 `b86ec7acc631fdef6daf9a5350dd4bed9c2d084b05bfb6c0da02328f9b2953f8`.

The common slot contains a short key and a short canonical value in 16 bytes. A high-bit marker instead indexes one retained wide canonical key per component when needed. The reversible short-key range is below the marker bit. Nonempty short keys cannot equal the zero empty-slot sentinel, and callers exclude null link fields. Wide keys use a separate exact 32-byte slot representation.

Union-by-size chooses the structural root while a separate `least` field tracks the bytewise minimum identifier. Therefore tree balancing cannot change the canonical name. Path halving changes only parent links. Finalizing one table cannot invalidate the node indices used by the other: node storage remains live, and canonical-key lookups use the explicit component minimum. The 512-link chain, mixed short/wide/exotic minima, cycles, self-links, and unused minimum identifiers all passed the integration gate.

### Flat purchase accounting

Reviewed source: `experiments/bins-flat/src/fast/mod.rs`; executed binary SHA-256 `4d94bc67880dc41fd5ce2bae869528b278ab045808da68447061ffd217e7c52c`.

Event counts and minimum/maximum times establish each occupied bin and its exact session. Every current purchase comes from an occupied bin, and that bin's session index is assigned before the purchase pass. Reusing bins across people cannot expose a stale index for a current purchase. The flat purchase pass adds each purchase once to its session revenue and its session-start day's category sum.

Category prices are strictly positive after validation, so a sum's first transition from zero registers one touched index. Each day's top category is updated by greater revenue, then lower bytewise category order on a tie. Every day with a category sum necessarily has a session row, and finalizing that row resets its best-category state. The final touched-index loop clears all category sums. The small-person sorting path uses its separate accumulators. No cross-person or cross-path state leak was found.

### Further 16-byte packing: source review pending execution

Reviewed source: `experiments/compact16/src/fast/mod.rs`, before its final build selection. The packed fields are 41 bits for each ID and 23 bits for each time value. This is an exact optional representation, not truncation of an arbitrary key.

`short_code` admits only canonical base36 strings whose value is below `2^41 - 1`. Noncanonical leading-zero strings, high values, wide keys, and exotic IDs use the full record. `short_key` reconstructs the original rank and length. The two ID fragments and two time fields occupy disjoint bit ranges. The relative ingest subtraction is checked, must be nonnegative, must be an exact multiple of 1,000, and must fit the time field. Fractional event timestamps use the full record. Valid `u32` event timestamps divided by 1,000 are below the reserved 23-bit invalid-timestamp sentinel. Reconstructing a retained ingest value uses the same base that admitted it.

The static review found these conditions sufficient. The combined deep16 binary subsequently passed the 18 targeted executions recorded below; the expanded final suite was run on the dense-code successor.

### Dense exact short-ID intervals

Reviewed sources: `experiments/dense/src/fast/{id,scan,mod}.rs`. A string of length `n` has code `SHORT_BASE[n] + value`, with `SHORT_BASE[1] = 1` and `SHORT_BASE[n+1] = SHORT_BASE[n] + 36^n`. The length intervals are disjoint and contiguous. Leading-zero spellings remain distinct because their length changes the interval. Code zero remains reserved for an internal invalid value.

Same-length code order is bytewise string order. Across lengths, `short_cmp` explicitly reconstructs the 12-digit left-aligned rank plus length; it does not compare interval codes numerically. This preserves cases such as `u10 < u2` and shorter equal-prefix strings. The maximum length difference is smaller than the minimum nonzero rank difference, so adding the length cannot reverse two distinct ranks. Mixed short/hex comparison reconstructs the same lexical rank, and output decoding uses that rank as well. The wide-key representation and exact collision equality remain unchanged.

The AVX encoder first validates all in-field characters, zeros out-of-field lanes, then shuffles the valid digits to the right side of its 12-digit reduction. Negative shuffle indices produce zero padding. Its fixed base36 reductions therefore produce the same numeric value as the scalar Horner loop. Adding the length interval gives the identical key in either execution path. This avoids repeated division in the compact-record decoder without weakening identifier equality.

Compact records admit the complete dense key only when it fits the 41-bit field; no masking truncates an oversized admitted ID. The other time, payload, fallback, and pointer-lifetime invariants are the same as compact16. `short_rank` and the lexical comparator require a valid nonzero short key; inspected production callers do not pass the invalid sentinel into these routines. The dedicated final fixture exercises leading zeros, different-length lexical minima, mixed short/hex prefixes, and attribution ties through the complete pipeline.

## Executed behavioral evidence

All counts below describe real program executions. Each successful run matched the prior handoff's independently authored plain reference through both PyArrow and DuckDB, exited zero, and left stdout empty. JSON sidecars pin the executed binary, reference, and harness hashes.

| Build / purpose | Cases and modes | Passed |
|---|---|---:|
| Earlier bins-plain continuation | 20 base cases × NCPU 1/8/scalar/slow × repeat | 160/160 |
| Team67 comparison | Same 20 base cases × NCPU 1/8 | 40/40 |
| Compact identity map | 24 cases × NCPU 1/8/scalar × repeat | 144/144 |
| Compact 24-byte records | 24 cases × NCPU 1/4/8/scalar/slow × repeat | 240/240 |
| Flat purchase accounting | 26 base/bin/purchase cases × NCPU 1/8 | 52/52 |
| Combined deep16 | Six compact-specific cases × NCPU 1/8/scalar | 18/18 |
| Dense combined candidate | 34 full cases × NCPU 1/8/scalar/slow × repeat | 272/272 |

The dense binary hash is `b7228ddcb9c5625e0884cfb6dad2430afe36fc1d3661b8736fd2d5cf91e9f021`; the deep16 hash is `d06c32cdde76aa1b572b9a4b090928af5f9324d7a4280e89dbfb06a7c97fbdb1`. Their respective metadata sidecars pin the same expanded harness hash `466adbedd4e6e67a9fd385ca11a2db5ce8df8e349b683fda41af0389e8d58d51` and independent reference hash. The dense run includes the 70,000-row multiple-page Parquet case.

No competitor semantic defect was found in the 40 executions. A claim that our pipeline is more correct than Team67 would exceed this evidence. Our known fixed input-discovery defect belonged to our baseline.

The four initial compact-specific cases cover signed and out-of-range ingest offsets, copies crossing compact/wide and purchase/view lanes, invalid-earliest suppression, exact millisecond session gaps, physical 64/128/192 KiB chunk boundaries, and mixed canonical identifiers. One case deliberately creates 48 distinct 32-hex identifiers with the same complete 64-bit key hash, then checks that exact equality keeps every identifier distinct. This tests a stronger collision than merely sharing a partition or truncated hash.

Two additional compact16 cases cover `36^7` and `2^41` ID boundaries, distinct leading-zero spellings, the 23-bit ingest limit, fractional millisecond fallbacks, and invalid compact copies. They passed both the targeted deep16 gate and the dense expanded gate. The additional dense interval-ordering case also passed every dense mode and repetition.

## Function-level review of the newly changed representations

The table records source inspection of the named functions. Integration tests exercise the complete behavior; they are not a branch-coverage claim for every line. Source hashes are in `DEEP_REVIEW.sources.json`.

| Function | Checked invariant / purpose | Evidence |
|---|---|---|
| `People::small_home` | High hash bits produce an index within the power-of-two short table. | Source; mixed and collision cases. |
| `People::wide_home` | Separate wide-table shift uses its own table size. | Source; 48 identical full-hash keys. |
| `people::prefetch` | Hint only; the computed address remains within an allocated table. | Source; scalar and vector integration modes. |
| `people::find` | Path halving preserves the root and terminates on the acyclic union forest. | Source; 512-link chains, cycles and duplicate edges. |
| `People::build` | Union-by-size retains explicit bytewise minimum; wide-name indirection does not collide with short values. | Source; mixed canonical minima and dense ordering. |
| `People::intern` | Exact key equality, empty-slot sentinel, table headroom, and stable node indices. | Source; repeated/self links and full-hash collisions. |
| `People::slot_ptr` | Selects the correct table and home for prefetch. | Source; short/wide mixed components. |
| `People::name_of` | Probe termination and exact canonical reconstruction through direct or indirect values. | Source; linked and unlinked IDs in all gates. |
| `People::linked` | Returns distinct interned identifier count only. | Source; diagnostic accessor, not an output semantic. |
| `id::short_bases` | Length intervals are contiguous, disjoint and reserve zero. | Source; leading-zero and power boundaries. |
| `id::short_scalar` | Horner value plus length interval is reversible; invalid characters reject. | Source; scalar mode, opaque/malformed ID cases. |
| `id::short_len` | Every valid nonzero interval maps to exactly its original length. | Source; lengths and boundary IDs in dense gate. |
| `id::short_rank` | Converts a dense code to its left-aligned lexical rank without changing digits. | Source; roundtrip output and mixed-prefix comparisons. |
| `id::short_cmp` | Same-length numeric order; different-length rank-plus-length lexical order. | Source; `u10`/`u2` and prefix ties. |
| `Domain::bytes_of` | Decodes the original textual short ID; wide/exotic handling is unchanged. | Source; exact reference ID comparisons. |
| `Domain::cmp` | Routes short/short comparisons through the new lexical comparator. | Source; canonical identity minima. |
| `Domain::cmp_wide` | Retains byte order for short/hex/exotic mixes and equal prefixes. | Source; mixed canonical and click-tie cases. |
| `scan::short_avx2` | Validates in-field bytes and right-aligns exactly those digits before reduction. | Source; scalar/vector outputs match in expanded gate. |
| `fast::short_code` | Dense key must fit the complete 41-bit field; wide keys reject. | Source; code-limit and fallback fixtures. |
| `fast::short_key` | Restores the exact dense key, including the internal invalid sentinel. | Source; exact final IDs and invalid earliest copies. |
| `EventSmall::new` | Checks payload, ID width, signed ingest offset, divisibility and time range before packing. | Source; ingest boundaries and lane-crossing duplicates. |
| `EventSmall::event` | Reads only the event's 41-bit range. | Source; dedup IDs and full-hash collisions. |
| `EventSmall::user` | Reassembles both nonoverlapping user-code fragments. | Source; boundary and leading-zero user IDs. |
| `EventSmall::ingest` | Restores the original value using the same checked base. | Source; relative-time edges and earliest-copy outcomes. |
| `EventSmall::ts` | Converts exact seconds and recognizes only the reserved invalid sentinel. | Source; millisecond fallback and invalid suppression. |
| `Candidate::small` | Creates an aligned pointer without type tag. | Source; compact-lane duplicate gate. |
| `Candidate::wide` | Applies one low type tag while preserving pointer provenance. | Source; wide/purchase duplicate gate. |
| `Candidate::event` | Clears both tags, selects the correct representation, preserves exact key equality. | Source; mixed lanes and identical full hashes. |
| `Candidate::ingest` | Reads exact ingest after untagging; current context supplies the original base. | Source; earliest winner on either representation. |
| `Candidate::discard` | Mutates only candidate state, never the immutable source record. | Source; repeated duplicate winners. |
| `Candidate::value` | Suppresses discarded/invalid rows and returns a copied payload otherwise. | Source; invalid-earliest and purchase/view cases. |
| `fast::dedup` | Completes all reads and buffered emission before clearing candidates and recycling blocks. | Source lifetime review; parallel repeated gates. |
| `Worker::person_bins` | Exact connectivity, occupied-bin session indices, positive purchase sums and full reset. | Source; whales, geometry, mixed paths and reused bins. |
| `Worker::finish_bin_row` | Emits the session-start-day aggregate and resets that day's best category. | Source; multi-day and same-day category ties. |

## Remaining acceptance work

The coordinator will select a frozen combined binary from measured evidence. That binary then receives the full expanded behavioral suite, the official fixture/dev checks, fresh independently referenced seeds, and exact large-output differential comparison. Passing the components separately does not replace the combined gate. A full 60M cross-implementation match provides strong differential evidence but is not an independent full 60M semantic proof.

Reproduction scripts and exact output-comparison method are described in `LARGE_SCALE_VERIFICATION.md`. The original 110-function review remains in `FUNCTION_REVIEW.md`; its source pins distinguish unchanged modules from the newly reviewed experimental modules above.
