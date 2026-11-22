# Shopping Sessions: output-stage audit and dictionary experiment

## Scope and contract

This is an independent output-stage experiment over the team's `dense-combined` source. Only `src/fast/write.rs` and `src/fast/parquet.rs` differ in `experiments/dense-dict`. No competitor implementation was copied. The full base-source manifest is `dense-dict-base.json`; the two-file patch and hashes are `dense-dict.patch` and `dense-dict-source.json`.

The active pinned Team 67 path uses dictionary-backed output and integer encoding choices. Our own baseline writes plain canonical user strings on every daily row. The recorded 20M workload has 2,250,361 user-daily rows; a person often contributes several adjacent days. The experiment removes repeat string formatting and repeat bytes for that one column. It preserves all rows, schema, daily values, nullable category semantics and campaign output. Performance remains a hypothesis until measured; file-size reduction alone is not a speed claim.

Primary framing references checked on 22 November 2026:

- Apache Parquet [encodings specification](https://parquet.apache.org/docs/file-format/data-pages/encodings/): a dictionary page precedes a chunk's data, dictionary values use PLAIN, indices use RLE_DICTIONARY with a leading bit-width byte, and v1 dictionary indices have no four-byte encoded-length prefix.
- Apache Parquet [format Thrift definition](https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift): page/header tags, dictionary count, encoding list, total sizes, data-page offset and dictionary-page offset.

## Independent algorithm

`user_dictionary` first counts adjacent key runs. Fewer than 32 rows or more than one run per two rows keeps the original plain path. Otherwise it scans runs and uses an exact `(hi, lo)` key map to assign dictionary IDs. A repeated key appearing in nonadjacent runs still gets the same entry. Thus contiguous output helps speed but is not a correctness requirement. `Domain::bytes_of` encodes each distinct dictionary key exactly once. The row-index vector retains one index for every original row, in original order.

The writer emits one uncompressed PLAIN dictionary page, then ordinary v1 data pages whose values use RLE_DICTIONARY. The current experiment uses RLE runs only; the standard hybrid format permits that subset. Runs stop at each 65,536-row page. Width is the number of bits required for the maximum index, with one bit for a one-value dictionary. Each run stores an unsigned varint of twice its length and a little-endian index occupying the rounded-up byte width. No extra length prefix is written for dictionary indices.

Chunk accounting includes dictionary and data headers/payloads. The first-data-page offset is after the dictionary page; the separate dictionary-page offset points to the beginning of that page. Required UTF-8 schema annotation is unchanged. Encoding metadata declares PLAIN, RLE and RLE_DICTIONARY for an encoded chunk. Empty output emits the existing empty row-group list and no dictionary page. Other columns use their unchanged fill closures and encodings.

## Function-by-function review

| Function/structure | Review conclusion and invariant |
|---|---|
| `Part::{len,clear,totals,push}` | Unchanged row columns and campaign cells. Clearing preserves allocated capacity; the dictionary is scoped to a single write and cannot retain stale rows across flushes. |
| `user_dictionary` | New exact key-to-index map, adjacent-run scan and plain fallback. Every generated index is less than the final dictionary count. The original `Domain` is responsible for canonical byte decoding; this does not infer generator keys. |
| `user_part` | Creates dictionary only for the exact output range, so split final chunks and partial ranges remain independent. All fill closures keep the original range base. |
| User `names` closure | Original plain fallback retained. Dictionary selection bypasses repeated name formatting during page emission. |
| User `days`, `sessions`, `events`, `revenue` closures | Unchanged exact values and current physical types. This experiment does not alter the existing integer casts or broaden their range contract. |
| User `top` closure | Unchanged definition-level vector, absent-category sentinel and exact category strings. Optional dictionaries are not introduced here. |
| `campaign_table` and its `id`, `channel`, `count`, fill closures | Aggregation, row inclusion and organic identity remain unchanged. New dictionary field is explicitly absent for every campaign column. |
| `report` | Existing user/campaign conservation diagnostic unchanged. This log is not a substitute for an exact oracle comparison. |
| `Column` and `Dictionary` | New optional borrowed dictionary points to immutable per-write owned vectors. The synchronous encode/write call ends before these vectors drop; no unsafe reference or global mutable dictionary was added. |
| `Thrift::{new,varint,field,i32,i64,binary,begin,open,end,list,list_i32,list_binary}` | Unchanged compact-protocol serializer. New page/metadata fields use these existing methods in increasing field order. |
| `Chunk` | Adds first-data-page offset and dictionary-presence flag while retaining whole-column offset and size. Dictionary metadata does not overwrite the data-page address. |
| `physical` | Unchanged required UTF-8 byte-array and numeric/date physical types. |
| `bit_pack` | Unchanged nullable category definition-level encoding. It is not reused as the dictionary-index codec. |
| `dictionary_indices` | New bounded RLE stream. A page has at most 65,536 indices, below the format's signed run-length bound. Values use sufficient little-endian bytes; dictionary index stream starts with bit width and no v1 length prefix. |
| `encode` | Adds dictionary page, encoded value selection and metadata offsets/encoding list. Existing schema/footer framing, row counts, plain columns and null levels are retained. Assertions ensure dictionaries are required strings, nonempty and indexed for exactly the requested row count. |
| `write` | Unchanged file creation and complete `write_all` before success; permission behavior remains as before. |
| `put_i32`, `put_i64`, `put_str` | Unchanged plain scalar and string framing; dictionary strings use the same four-byte length plus exact bytes convention. |

## Acceptance gate

Before adoption, independently read the result with PyArrow and DuckDB and compare exact data to the existing pipeline/oracle. Relevant codec cases are one-entry and multi-entry dictionaries, cardinalities near 256 and 65,536, page boundaries and a run crossing a page, noncontiguous repeated names, exact UTF-8/wide/exotic IDs, empty files, all-null categories and several output parts/ranges. Cases must show that the dictionary path actually ran; tiny generic differential cases may intentionally choose the plain fallback.

Performance should compare the exact same dense-combined source with only these two files changed, using quiet rotating end-to-end runs and output-byte accounting. No other parser/record/click changes should be attributed to this writer. The extra exact hash map, row-index vector and prepass can lose on high cardinality; the fallback limits this risk but does not replace measurement. A rejected candidate remains useful evidence and should not be silently promoted because its files are smaller.

Build status: Rust 1.97.0, locked/offline release, static target feature; successful build in 21.7 seconds. Binary `bench/bin/dense-dict` SHA-256 is `9993c19ed8ad7c7b58586dd9241e967e20fb7b07b572db80d7f1379b5fe7b248`. Full command and source manifest are in `dense-dict-build.json`. No production branch or README was changed by this experiment.

Independent database-panel validation subsequently passed 11 codec families using both PyArrow and DuckDB, including the actual production `user_part` path at 1/2, 255/256/257, and 65,535/65,536/65,537 dictionary values, split ranges, repeated noncontiguous keys, unequal high words with equal low words, a 9 KB UTF-8 name, null categories, and empty/plain fallback. Six full-pipeline executions also passed both readers at one worker, eight workers, and scalar parsing: 70,000 daily rows with short/hex/UTF-8/whitespace identifiers, dictionary encoding active in every output chunk, and a 66,066-row first part crossing the data-page boundary. Receipts are `panel/database/dictionary-codec.json` and `panel/database/LATE_COMPONENT_REVIEW.md`. The merged candidate also passed the database panel's 38-family gate; its performance belongs to the parent's ablation receipts, since it includes other independently authored changes.
