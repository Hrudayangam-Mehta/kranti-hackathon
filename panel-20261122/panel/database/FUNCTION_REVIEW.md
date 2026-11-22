# Database/backend function review

Scope: every production function in `src/{csv,time,links,events,clicks,sessions,input,manifest,output,slow,hash,main}.rs` and `src/fast/{write,parquet}.rs`. These files were read in full. A companion source-hash manifest pins the reviewed bytes. Optimized parser, ID, allocator, timestamp, identity, and pipeline functions are assigned to the other panel reviewers.

## Evidence and interpretation

- **A**: `round1-adversarial.json`, 200/200 end-to-end passes: 20 behavioral datasets, NCPU 1/4/8, scalar, general path, repeat output writes. Includes direct typed row comparisons with the handoff reference.
- **B**: `bins-adversarial.json`, 240/240 end-to-end passes: A's cases plus bin boundaries, randomized threshold gaps, a 50,000-event shared-device whale, and 70,000 distinct output rows. Both PyArrow and DuckDB agree with the reference. The one-worker large case emitted a 65,652-row file, exercising more than one 65,536-row data page, and a 4,348-row file.
- **F**: `bins-force-zero.json` and `bins-force-sort.json`, 6/6 each: forced bin and forced small-sort alternatives on the three bin-specific cases.
- **S**: source-level review of the function and callers. This is not a claim that every branch has been exercised.
- Existing unit-test bodies were inspected where listed below. Their independent execution is recorded by the coordinator, rather than inferred here from their presence.

All functions below have been reviewed. “Pass” means no remaining issue found within the documented valid-input and workload limits, supported by the cited tests. “Reviewed” explicitly identifies a function whose exceptional branches were not independently fault-injected. No row claims exhaustive proof over arbitrary inputs.

## `src/csv.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `csv::fields<const N>` | Split one record into exactly N decoded fields. | Checks empty record, too few/many fields, and whole-field quoting without trimming. A/B malformed CSV, quoted empty IDs, spaces, CR. | Pass |
| `csv::unquote` | Remove syntactic outer quotes only. | Rejects internal, unbalanced, and partial quotes; leaves all ordinary bytes intact. A/B CSV cases. | Pass |
| `csv::lines` | Split solely on LF. | CR remains part of the field; trailing empty slices are rejected by `fields`. A/B CR and unterminated final lines. | Pass |
| `csv::data_chunks` | Divide file body at newline boundaries. | Skips exactly one header; saturating target arithmetic; chunks cover file tail without loss. Existing `chunking_covers_every_data_byte` body inspected; A/B multiple/header-only/page-boundary files. | Pass |
| `csv::rows` | Iterate file body after one header. | Header-only and no-newline headers return no data; later header-looking records are ordinary input. A/B empty files and source inspection. | Pass |

Unit-test group inspected: `csv::tests::{dialect,chunking_covers_every_data_byte}`.

## `src/time.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `time::parse_timestamp` | Dispatch F1, F2, and numeric F3. | Exact case/punctuation/length, signed offset subtraction, ASCII digits, valid offset limits. A/B leap, offset, invalid/CR, and leading-zero cases. | Pass |
| `time::parse_epoch_millis` | Convert digits with checked i64 arithmetic. | Overflow cannot wrap into the window. Very long leading zeros remain accepted. A/B 5,000-digit cases. | Pass |
| `time::parse_date_time` | Validate calendar fields and convert whole seconds. | Its only callers pass a 19-byte prefix; validates separators, month/day, hour/minute/second. A/B leap and invalid-date cases. | Pass |
| `time::digits` | Convert short ASCII digit slices. | Rejects non-ASCII digits; caller lengths are bounded to calendar components. A/B non-ASCII values; S. | Pass |
| `time::is_leap_year` | Gregorian divisibility rule. | Correct 4/100/400 exceptions; existing 2000/2100 assertions inspected. A/B 2028 leap case. | Pass |
| `time::days_in_month` | Calendar day bound. | Distinguishes 30/31 days and leap February; caller first checks month range. A/B leap case; unit bodies. | Pass |
| `time::days_from_civil` | Convert valid civil date to epoch days. | Uses Euclidean division for eras; standard March-based offset arithmetic. Existing pre-epoch/2000 assertions inspected; A/B dates. | Pass |
| `time::day_of` | Floor timestamp to UTC day. | Euclidean division handles negative milliseconds correctly. Existing `day_of(-1)` assertion; A/B midnight sessions. | Pass |

Unit-test group inspected: `time::tests::{forms,bad_forms,civil_days}`. F3 numbers outside i64 are internally represented as parse failure; since the valid manifest window is far inside i64, their observable treatment is the required exclusion from output.

## `src/links.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `links::People::from_link_files` | Parse link pairs from all parts. | Drops malformed/null-sided rows; retains spaces/case/CR; does not require activity on either ID. A/B link/CSV cases. | Pass |
| `links::People::from_pairs` | Build components and canonical names. | Union root is separate from final bytewise minimum; second pass includes every linked ID. A/B 512-ID chain, unused minimum, cycles and repeats. | Pass |
| `links::People::name_of` | Resolve linked name or return original standalone ID. | Exact map equality; missing IDs never collapse to a common sentinel. A/B randomized/Unicode IDs. | Pass |
| `links::People::linked_ids` | Report number of interned link IDs. | Returns map length only; not used to decide results. S and successful diagnostic execution. | Reviewed |
| `links::find` | Find union root with path halving. | Parent assignments preserve a root forest; grandparent compression reaches root without recursion. A/B long chain and cycles. | Pass |

Unit-test group inspected: `links::tests::{transitive_names,link_lines,star_names_smallest_member}`.

## `src/events.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `events::EventRules::parse_line` | Parse event copy and preserve dedup candidate. | Drops malformed/empty event IDs before dedup, but retains invalid semantic copies as `valid=None`. A/B earliest-invalid and later-user-change case. | Pass |
| `events::EventRules::validate` | Check kept-copy semantics. | Requires user/product, exact type/window, valid purchase price; ignores view/cart prices; retains exactly-24h and early ingestion. A/B targeted cases. | Pass |
| `events::parse_price` | Validate ASCII positive bounded cents. | Checks upper bound each digit, so multiplication stays below u32 overflow; accepts leading zeros; rejects signs/Unicode/zero. A/B price cases and unit body. | Pass |
| `events::dedup_and_route` | Choose earliest ingest globally by event ID, then canonicalize. | Invalid earlier copy blocks later valid copy; user identity is not a dedup key. Hash collisions retain exact equality. A/B cross-part mutated-user duplicates. | Pass |

Unit-test group inspected: `events::tests::prices`. Equal-ingest event copies are identical by contract; the stable representative need not be chosen by another arbitrary field.

## `src/clicks.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `clicks::ClickRules::parse_line` | Parse, validate, and canonicalize a click. | Rejects empty click/user IDs, bad window/timestamp, and unknown campaign. A/B seven-day, empty, CR, mixed-ID and randomized cases. | Pass |

This path keeps identical duplicate clicks. That is observationally equivalent for this workload: the latest timestamp/ID winner is unchanged, and active campaign membership counts an assist once while duplicates enter and expire together.

## `src/sessions.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `sessions::CampaignTotals::new` | Allocate campaign/day cells. | Dimensions derive from the same manifest and campaign set used by workers. A/B empty/window-fallback cases. | Pass |
| `sessions::CampaignTotals::cell` | Locate one campaign/day cell. | Checked nonnegative date offset and in-window day assertion; valid sessions cannot lie outside. A/B midnight/fallback cases; assertion path not injected. | Reviewed |
| `sessions::CampaignTotals::add` | Sum worker aggregates. | All caller totals share dimensions; field-by-field addition. A/B NCPU 1/4/8 and table exactness. | Pass |
| `sessions::Worker::new` | Initialize row, category, and attribution state. | Organic is final campaign slot; vectors sized consistently. A/B empty/no-click and randomized cases. | Pass |
| `sessions::Worker::process_bucket` | Group sorted event/click streams by person. | Exact person order, ascending event times, ascending time/ID clicks; click-only people skipped. A/B mixed names and shared device. | Pass |
| `sessions::Worker::process_person` | Build sessions and daily user rows. | New session only above gap; same-time events stay together; all session values use start day. A/B threshold and three-day session. | Pass |
| `sessions::Worker::add_category` | Sum purchase cents by category. | Only valid positive-price purchases call it. Addition is order independent. A/B exact category ties and unknown product. | Pass |
| `sessions::Worker::finish_day` | Select top category and flush one user/day. | Highest cents then smallest sorted category rank; null if empty; scratch is cleared. A/B category ties/no-purchase rows. | Pass |
| `sessions::Worker::attribute` | Credit latest qualifying click and all distinct assisting campaigns. | Inclusive lower/upper click bounds; minimum ID among latest-time ties; organic when none. A/B seven-day and tie tests. | Pass |
| `sessions::Worker::enter` | Add click to active campaign multiset. | Campaign enters active list only on zero-to-one transition. A/B duplicate clicks and many campaigns. | Pass |
| `sessions::Worker::leave` | Expire click and remove inactive campaign. | Swap-remove updates the moved campaign's index; duplicates do not expire too early. A/B randomized boundaries. | Pass |
| `sessions::Worker::clear_window` | Reset per-person campaign state. | Every still-active counter zeroed; inactive counters already zero. A/B many-person randomized cases. | Pass |

## `src/input.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `input::Files::read` | Read all known inputs for general engine. | Parallel regular-file reads propagate errors; missing part folders are empty. A/B general path. Unreadable-file failures not fault-injected. | Reviewed |
| `input::read_file` | Read one required dimension/manifest file. | Includes path in returned I/O error; does not swallow required-file failure. S; successful A/B reads. | Reviewed |
| `input::csv_files` | Discover CSV parts. | Fixed to include every regular `.csv`, including dot-prefixed files; deterministic path sort. Baseline failed this case in five modes; A/B pass. | Fixed and verified |
| `input::Window::from_manifest` | Extract start/end timestamps. | Calls top-level JSON parsing for both fields, not substring search. A/B regular/fallback manifests; S. | Pass for valid manifest |
| `input::Window::contains_event` | Event half-open interval. | Start included, end excluded. A/B temporal/randomized tests. | Pass |
| `input::Window::contains_click` | Extended click half-open interval. | Seven days before start included; end excluded. A/B seven-day boundaries. | Pass |
| `input::manifest_time` | Read and parse named JSON timestamp. | Missing/nonstring/bad timestamp returns error. Existing manifest assertions inspected; error plumbing S. | Reviewed |
| `input::Products::parse` | Map product IDs to lexically ranked categories. | Adds unknown, sorts/deduplicates category bytes, stores exact product lookup. A/B category tie and >255 fallback. | Pass |
| `input::Products::category_of` | Lookup category or unknown. | Empty products rejected before caller; missing exact ID uses unknown. A/B unknown products. | Pass |
| `input::Campaigns::parse` | Build campaign ID/channel dimension. | Exact IDs; retains first occurrence defensively; dimensions are unique/clean by contract. A/B dimension reads. | Pass |
| `input::Campaigns::index_of` | Resolve known campaign slot. | Exact lookup, no trimming/case folding. A/B unknown/case/empty campaign clicks. | Pass |
| `input::Campaigns::count_with_organic` | Allocate one extra organic slot. | Used consistently by Worker and writer. A/B empty/no-click cases. | Pass |
| `input::Campaigns::id` | Resolve campaign ID or organic slot name. | Callers provide valid indices or final organic index. A/B exact campaign output. | Pass |
| `input::Campaigns::channel` | Resolve channel or organic channel. | Uses same slot conventions as `id`. A/B exact campaign output. | Pass |

`Window::from_manifest` assumes the supplied manifest describes a valid ordered window. Malformed/adversarial manifest semantics are outside the track's data contract; this review does not represent it as a complete configuration validator.

## `src/manifest.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `manifest::top_level_string` | Find an exact top-level JSON string value. | Ignores nested distractors, supports BOM/whitespace, last matching key behavior. Existing `top_level_only` body inspected; A/B normal manifests. | Reviewed |
| `manifest::Parser::peek` | Bounds-safe lookahead. | Uses slice `get`, returns None at EOF. S and malformed unit bodies. | Reviewed |
| `manifest::Parser::next` | Consume one available byte. | Advances only after successful lookahead. S. | Reviewed |
| `manifest::Parser::expect` | Match and consume punctuation. | Mismatch returns None; callers propagate it. S. | Reviewed |
| `manifest::Parser::space` | Consume JSON whitespace. | Limited to space, tab, LF and CR. S and whitespace unit body. | Reviewed |
| `manifest::Parser::hex4` | Decode four hex escape digits. | Exactly four bounded byte reads; rejects nonhex. S. | Reviewed |
| `manifest::Parser::string` | Decode JSON string escapes. | Rejects control bytes/invalid escapes; handles UTF-16 surrogate pairs and scalar validation. S; broad escape fault injection not added. | Reviewed |
| `manifest::Parser::skip_value` | Skip unrelated object/array/scalar values. | Bounds recursion, tracks nested containers and strings. Scalar grammar is intentionally permissive, so this is not a general JSON validator. S and nested-unit body. | Reviewed, valid-input scope |

Unit-test group inspected: `manifest::tests::top_level_only`.

## `src/output.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `output::strings` | Build required Parquet byte-array values. | Retains UTF-8 bytes verbatim. A/B general-path mixed IDs. | Pass |
| `output::optional_strings` | Build nullable category values. | Preserves None distinctly from empty string. A/B no-purchase and category cases. | Pass |
| `output::dates` | Collect epoch-day values. | Writer uses INT32 annotated DATE. A/B typed readback. | Pass |
| `output::integers` | Convert u64 aggregates to i64. | Checked conversion prevents silent narrowing; valid maximum revenue is below i64. A/B purchase/count cases. | Pass |
| `output::create_table_dir` | Create output folder and remove stale Parquet entries. | Does not remove directories; symlinks are unlinked, not followed for removal; I/O removal errors propagate. A/B repeat execution. | Pass; permissions-error path not injected |
| `output::write_table` | Write schema-typed general-path file. | Column variants match schemas; optional strings use definition levels; empty tables still have schema. A/B two-reader, empty and 70K rows. | Pass |
| `output::column_len` | Determine first-column row count. | Handles all four variants; callers construct aligned columns. S and A/B typed row counts. | Pass |

## `src/slow.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `slow::Clock::new` | Capture monotonic start/lap time. | Only diagnostics, no ranking decisions. S and A/B runtime. | Reviewed |
| `slow::Clock::lap` | Report stage elapsed time to stderr. | No stdout; monotonic Instant arithmetic. A/B zero stdout checks. | Pass |
| `slow::run` | General parse→dedup→canonicalize→session→write pipeline. | Stage order retains earliest-invalid semantics; thread partitions reunite exact keys. A/B general path and fallback cases. | Pass |
| `slow::write_outputs` | Emit all user/campaign partitions. | Empty output handled; assist-only rows included; organic slot correct; all write errors propagated. A/B table multiset/schema checks and repeated output. | Pass |
| `slow::report` | Print count/revenue consistency diagnostics. | It warns rather than aborts on mismatch; independent exact row gate is authoritative. A/B successful consistency messages. | Reviewed |
| `slow::bucket_bits` | Bound hash partition count. | Power-of-two partitions clamped 16–1024; affects performance only. S and A/B varying input sizes. | Pass for workload bounds |
| `slow::chunk_target` | Bound parallel scan chunk sizes. | Nonzero denominator and 64KB–16MB limits. A/B NCPU 1/4/8. | Pass for workload bounds |
| `slow::work_units` | Produce all body slices. | Delegates header/boundary handling to `data_chunks`; borrows live input buffers. A/B multi-file/tail cases. | Pass |
| `slow::empty_buckets` | Allocate exactly one vector per hash partition. | Uses same bits as routing and transpose. S and A/B. | Pass |
| `slow::transpose` | Regroup worker partitions by bucket. | Preserves every nonempty part exactly once; callers provide consistent row widths. A/B row multiset comparison. | Pass |
| `slow::concat` | Concatenate parts without copying singleton allocation. | Empty/multiple/single cases preserve all elements; capacity sums lengths. A/B empty/multipart/general path. | Pass |

## `src/hash.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `hash::FastHasher::add` | Mix one word into state. | Explicit wrapping arithmetic; deterministic. Exact key comparisons remain in maps. S and A/B randomized IDs. | Pass |
| `hash::FastHasher::write` | Hash bytes in full words plus padded remainder. | Unaligned input copied safely; possible hash collisions never imply key equality. S and A/B long/Unicode/whitespace IDs. | Pass |
| `hash::FastHasher::write_u8` | Hash a one-byte primitive. | Calls common mixer; no unsafe memory operations. S. | Reviewed |
| `hash::FastHasher::write_usize` | Hash collection length/size primitive. | Correct on target linux/amd64; deterministic conversion. S and A/B HashMap activity. | Pass on target |
| `hash::FastHasher::finish` | Final avalanche. | Explicit wrapping multiplication and shifts; no mutable state change. S and A/B. | Pass |
| `hash::new_map` | Create HashMap with selected hasher. | Standard HashMap retains key equality after hash collision. A/B duplicate/exotic IDs. | Pass |
| `hash::bucket_of` | Map bytes to a power-of-two bucket. | Explicit zero-bit branch; production callers pass bounded positive bits. Identical IDs route identically. A/B cross-file dedup. | Pass |

The hasher is not represented as cryptographic. Its role is partitioning and table placement, with exact equality checks for correctness.

## `src/main.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `Config::from_env` | Read paths and positive worker count. | Rejects zero/invalid NCPU and uses available parallelism fallback; preserves explicit path values. A/B NCPU 1/4/8; invalid-env branch reviewed, not fault-injected. | Reviewed |
| `main` | Select fast/general engine and communicate failure. | Fast success exits internally; explicit fallback creates general pool; errors print to stderr and exit nonzero. A/B normal, forced-general, category/window fallback and zero stdout. | Pass on exercised paths |

## `src/fast/write.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `fast::write::Part::len` | Return user-row count. | Person vector is authoritative; `push/clear` keep columns aligned. S and A/B. | Pass |
| `fast::write::Part::clear` | Reuse output column buffers after flush. | Clears all user columns but intentionally preserves aggregate cells. B 70K rows/flush. | Pass |
| `fast::write::Part::totals` | Sum user metrics for diagnostics. | Aggregates row count/sessions/events/revenue; not a substitute for exact comparison. A/B reports. | Pass |
| `fast::write::Part::push` | Append one logical user/day row. | Appends every column once with matching index. A/B row multiplicity. | Pass |
| `fast::write::user_part` | Serialize a user-row range. | Exact ID decoding; day/date annotation; null category; range offset used consistently. B both readers and multi-page mixed-null case. | Pass within count bounds |
| `fast::write::campaign_table` | Reduce worker campaign cells and write selected campaign range. | Converts layout correctly; includes assisted-only rows; final organic slot; empty first part retained. A/B exact two-table outputs. | Pass within count bounds |
| `fast::write::report` | Emit self-check totals to stderr. | Checks sessions/revenue agreement and assist lower bound; warns on failure. A/B zero stdout; failing branch not injected. | Reviewed |

Fast count columns are narrowed to signed 32-bit values. The final dataset's approximately 60 million events bounds any per-person/day event count, per-campaign session count, and per-campaign/day assist count below the signed 32-bit maximum. Revenue uses signed 64-bit. This should be widened if the program is reused beyond that workload; it is not a current 60M correctness defect.

## `src/fast/parquet.rs`

| Function | Purpose | Check and evidence | Status |
|---|---|---|---|
| `fast::parquet::Thrift::new` | Initialize compact-protocol buffer/state stack. | One root previous-field ID initialized. S; all B file readbacks. | Pass |
| `fast::parquet::Thrift::varint` | Encode unsigned base-128 varint. | Continuation bits and final low byte; bounded shift terminates. B metadata/string sizes and multi-page output. | Pass |
| `fast::parquet::Thrift::field` | Write compact Thrift field header. | Delta form for 1–15; explicit zigzag ID otherwise; updates current struct field state. S and B readers. | Pass |
| `fast::parquet::Thrift::i32` | Write signed 32-bit compact integer. | Zigzag transform followed by varint. S and B typed schema/count values. | Pass |
| `fast::parquet::Thrift::i64` | Write signed 64-bit compact integer. | Zigzag preserves sign; emitted sizes/counts nonnegative in workload. S and B metadata. | Pass |
| `fast::parquet::Thrift::binary` | Write length-prefixed byte string. | Exact byte length and payload; no string normalization. B long/Unicode strings. | Pass |
| `fast::parquet::Thrift::begin` | Begin nested struct field. | Emits STRUCT field and pushes fresh prior-field state. S and B metadata. | Pass |
| `fast::parquet::Thrift::open` | Begin struct list element. | Pushes state without field header, as required by list context. S and B metadata. | Pass |
| `fast::parquet::Thrift::end` | Finish nested struct. | STOP marker then stack pop; callers pair starts/ends. S and B readers. | Pass |
| `fast::parquet::Thrift::list` | Encode compact list header. | Inline length below15; varint extension otherwise. S and B metadata. | Pass |
| `fast::parquet::Thrift::list_i32` | Emit list integer element. | Zigzag only, no repeated field header. S and B encoding list interpretation. | Pass |
| `fast::parquet::Thrift::list_binary` | Emit list binary element. | Length then bytes, no field header. S and B schema-path interpretation. | Pass |
| `fast::parquet::physical` | Map logical column kind to Parquet primitive. | Strings BYTE_ARRAY; date/count INT32; revenue INT64. A/B schema checks. | Pass |
| `fast::parquet::bit_pack` | Encode optional-string definition levels. | Groups of8, hybrid bit-pack header, last-group zero padding, runs up to8192 values. B mixed nulls across65,652-row file; both readers. | Pass |
| `fast::parquet::encode` | Construct data pages, column metadata and footer. | Page counts, offsets, byte sizes, optional levels, DATE/UTF8 annotations, empty schema, footer length and PAR1 markers. A/B both readers, empty and multi-page files. | Pass on exercised formats |
| `fast::parquet::write` | Persist complete encoded file. | `write_all` propagates truncation/I/O error; permissions best effort. A/B rereads; disk-full fault not injected. | Reviewed |
| `fast::parquet::put_i32` | Emit little-endian physical INT32. | Uses standard byte conversion. B DATE/count readbacks. | Pass |
| `fast::parquet::put_i64` | Emit little-endian physical INT64. | Uses standard byte conversion. B revenue readbacks. | Pass |
| `fast::parquet::put_str` | Emit PLAIN byte-array length and bytes. | Length is exact u32 then original UTF-8. B mixed/9KB IDs. | Pass for dataset field lengths |

The custom writer's annotations and level encoding were checked against the Apache Parquet specification: https://parquet.apache.org/docs/file-format/types/logicaltypes/ and https://parquet.apache.org/docs/file-format/data-pages/encodings/. Interoperability was verified with two independent readers rather than inferred from file extensions.

## Remaining validation boundaries

The reviewed general engine is a correctness fallback, not the chosen performance implementation. Current evidence covers valid track manifests, ordinary readable input/output files, and the event-count bounds stated above. Malformed JSON, permission denial, out-of-disk, and injected allocation failure were not exhaustively tested. Organizer fixtures, official dev answers, 20M/60M comparisons, restricted container execution, exact final source/build identity, and timing results are owned by the coordinator's release gate and must be reported from those logs.
