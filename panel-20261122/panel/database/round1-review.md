# Database/backend review — round 1

Input source reviewed: `ad8526b3410bfb6b8b8febff35affe6bd5b42499` on `exp`, with the corrected earlier submission `8d0ea211277f158cb5cc12e8dc16bb255740325e` used to inspect the general implementation. The live head has the newer exact string encoding and mixed record layouts; it is not the same binary as the user's 1.2422-second official submission.

## Finding and fix

`input::csv_files` excluded filenames beginning with a dot. The input specification says to read every `*.csv` file; its exclusions for dot/underscore names apply to output discovery. The baseline silently lost an event, identity link, and attribution click placed in `.extra.csv`. Both its fast and general paths omitted the expected canonical user row and 500 cents of revenue.

The one-line fix includes every regular `.csv` file. Its effect is covered by an end-to-end test, not a test that repeats the filename predicate. Baseline reproduction is in `baseline-hidden-files.json` and the full baseline gate in `baseline-c-adversarial.json`.

## Function-level semantic review

| Functions / components | Reviewed property | Assessment |
|---|---|---|
| `csv::fields`, `unquote`, `lines`, `data_chunks`, `rows` | Field count; quotes only around complete fields; spaces and CR retained; final unterminated line | Consistent with the dialect; adversarial execution covers quoted empties, malformed quotes, CR, and file boundaries. |
| `input::csv_files`, `Files::read`, fast `map_folder` | All input parts consumed, including zero-row parts | Confirmed shared filename omission; corrected. |
| `Window::from_manifest`, `contains_event`, `contains_click` | Half-open event/click windows | Correct for valid manifest; click lower bound includes the previous seven days. |
| `time::parse_timestamp`, `parse_epoch_millis`, `parse_date_time`, fast `Calendar::parse` | ASCII numeric fields, offset conversion, leap days, leading zero epoch values | General and optimized outputs match on leap/offset and very long numeric cases. Rejecting overflowing F3 internally is observationally equivalent to dropping an out-of-window value. |
| `EventRules::parse_line`, `validate`, `parse_price`; fast `EventLines::line` | Invalid rows remain candidates for earliest-ingest dedup; nonpurchase prices ignored; late threshold | Earliest invalid copy is retained through dedup as an invalid winner. All current guards preserve this ordering. |
| `events::dedup_and_route`, fast `dedup` | Global event ID identity independent of user and validity | Correct in tests where later copies change users; candidate bitmap collisions trigger exact comparison, not equality by hash. |
| `People::from_pairs`, `find`; fast `People::build`, `name_of` | Transitive components and bytewise smallest name, including inactive link-only IDs | Correct on a 512-ID chain, cycle/repetition, self-links, and an inactive canonical minimum. |
| `Domain::encode`/`exact`, `short_scalar`, `long_scalar`, `cmp`, `bytes_of`; fast `encode_k` | Opaque IDs have reversible encoding or exact interned fallback | No generator inversion is required. Short/long/exotic values preserve equality and ordering; zero and all-f hexadecimal edge classes fall back safely. Tested mixed-shape attribution ties. |
| `ClickRules::parse_line`; fast `ClickLines::line` | Empty IDs/users and invalid campaigns rejected | New empty-key representation does not reproduce the older sentinel bug: `SmallMap` uses `u64::MAX` for empty slots, not zero. A null campaign cannot match any nonempty clean dimension ID. |
| `SmallMap::new/get`, `keys::intern_exotic/lookup_exotic` | Exact string lookup, sentinel separation, safe unfamiliar identifiers | Exact map equality retained. Assumes the documented clean dimension inputs. |
| `Worker::process_bucket/process_person/attribute`; fast `Worker::partition/person` | Session splitting, same-timestamp events, session-start UTC day, latest click plus minimum bytewise ID | Boundary tests pass. Fast click runs are sorted in reverse ID order at equal timestamps, making their final element the correct winner. |
| `enter/leave/clear_window`, fast active-campaign vectors | One assist per campaign per session, including credited campaign, independent of click duplicates | Not physically deduplicating identical clicks is semantically valid here: duplicate copies enter and expire together and only membership affects the assist count. |
| `add_category`, `finish_day`, fast `finish_row` | Summed purchase totals; bytewise tie; null with no purchases | Category ranks are sorted by byte order before comparing ranks. Unknown competes normally. |
| `create_table_dir`, slow `write_outputs`, fast `user_part/campaign_table` | Typed schema, one row per logical key, assist-only campaign rows, stale output cleanup | End-to-end typed Parquet comparisons cover both tables, schema sets, duplicate row multiplicity, DATE, and null values. Repeat execution scheduled for candidate gate. |
| Fast `parquet::encode`, `bit_pack`, metadata writer | Physical DATE/int/string encodings, definition levels for null top category | Reviewed against Apache specification; PyArrow successfully reads empty/nonempty outputs in the behavioral suite. Full-scale and a second reader remain part of the later gate. |

## Executed baseline gate

`adversarial.py` materializes 20 case families. It invokes the earlier handoff's plain Python verifier, intercepting its row writer so comparisons do not share the Rust implementation. It checks actual Parquet row multisets, exact column sets, DATE type, exit code, and empty stdout.

100 runs: 20 cases at fast NCPU 1/4/8, forced scalar, and general path. 95 passed. The five failures are the same confirmed hidden-input case, once per execution mode. There were no other mismatches. These are correctness tests, not official performance scores or proof over all possible inputs.

Coverage includes malformed/quoted/CR CSV, earliest-invalid dedup and later user changes, 30-minute and seven-day boundaries, click tie classes, an unused linked name, Unicode/whitespace IDs, exact category ties, leap day/offset parsing, one session spanning three days, 9 KB IDs, 5,000 leading zero digits, category/window fallback, a page-sized file, and five deterministic randomized datasets.

## Relevant resources

1. Official current rules: https://www.joinbuilders.org/buildathon/tracks/shopping-sessions/files/rules.md?inline=1 — retrieved 2026-11-22. This controls correctness; the generator distribution is not an excuse to narrow semantics.
2. Apache Parquet logical types: https://parquet.apache.org/docs/file-format/types/logicaltypes/ — specifies DATE and integer interpretation for validating the custom writer.
3. Apache Parquet encodings: https://parquet.apache.org/docs/file-format/data-pages/encodings/ — reference for definition levels and plain/RLE data representation.
4. Leis, Boncz, Kemper, Neumann, *Morsel-Driven Parallelism* (SIGMOD 2014): https://ir.cwi.nl/pub/22547 — applies to dynamic work units and stage imbalance. Foundational work, not a claim of current best performance.
5. Boncz, Zukowski, Nes, *MonetDB/X100: Hyper-Pipelining Query Execution* (2005): https://ir.cwi.nl/pub/16497 — supports considering cache-sized batches and the cost of full intermediate materialization.
6. Alex Petrov, *Database Internals* (2019), author site https://www.databass.dev/ and publisher https://www.oreilly.com/library/view/database-internals/9781492040330/ — relevant sections are data layout, binary formats, and buffering. Distributed consensus chapters do not address this single-container bottleneck.

## Round 2 / round 3 gate

Run the fixed candidate through the same suite with repeated writes, then run the organizer fixtures and dev answers, independent multi-seed checks, and final-scale typed comparisons. Freeze binaries before timing, alternate run order, and keep official scores separate from local observations. In particular, a subsecond practice score gap must not be declared a proven improvement from one local run.
