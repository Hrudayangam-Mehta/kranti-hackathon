# Exact large-scale verification with a small memory budget

## Evidence tiers

The official starter's pipeline is a skeleton that writes empty tables. It is not a full-data oracle. Verification uses three distinct sources of evidence and reports their limits separately.

1. **Independent semantics on small and medium inputs.** The prior handoff's plain Python reference interprets the rules independently of the optimized Rust pipeline. Crafted fixtures target exact boundary and representation risks. Three fresh nominal 1M generator seeds have now passed against the merged P2/adaptive/dictionary candidate, with distinct generated windows, seed-specific IDs, and varied click density. A later tuned binary must be compared again against the retained expected outputs.
2. **Exact full-output differential comparison.** On the nominal 60M dataset, compare the final successful output against Team67 and, if it completes within local memory, baseline C at NCPU 1. Different concurrency affects execution only; logical results must be equal. A failed or interrupted baseline's partial files are never used as a valid reference.
3. **Measured capacity and execution.** Record process exit, stdout, wall time, maximum RSS, binary SHA-256, dataset identity, and NCPU. A full-output match does not establish an official leaderboard time, and a fast process that fails or writes incomplete output is not a valid timing result.

The full 60M comparison is deliberately labeled differential evidence. Agreement between implementations cannot eliminate a shared semantic mistake; that is why the independent reference and targeted fixtures remain necessary.

## Implemented exact comparator

`external_compare.py` performs these steps:

- Discover the visible, regular Parquet files for each output table, following the output-file inclusion rules.
- Inspect every original file's schema before conversion. Require the exact column set, string types for identifiers/category/channel, Parquet DATE for the day, and integer types for numeric fields. Check actual values for required-column nulls.
- Normalize integer widths to exact `HUGEINT`, strings to `VARCHAR`, and days to `DATE`; externally sort all columns with a total ordering, one side at a time.
- Stream the two sorted canonical files in small PyArrow batches and merge exact typed row tuples. Count both missing and extra rows, retaining a few examples. Duplicate multiplicity is preserved.
- Record input file inventories, schemas, row counts, library versions, runtime, maximum RSS, and comparator hash. Remove only its own disposable canonical/spill files.

No digest or probabilistic hash decides equality. This avoids collision uncertainty and the duplicate-loss problem of ordinary set difference. Row order, output partition count, accepted integer width, and compression are allowed to differ.

DuckDB is configured with one thread, `preserve_insertion_order=false`, a configurable memory limit, an explicit spill directory, and a 24 GB spill limit. Its memory setting is not a strict process RSS cap; Python, Arrow, and some engine allocations are outside it. The comparator runs by itself, after pipeline benchmarks, so it does not distort either timings or peak pipeline memory.

Primary references: [DuckDB memory management](https://www.duckdb.org/2024/07/09/memory-management), [out-of-memory guidance](https://duckdb.org/docs/current/guides/performance/oom), [set and bag semantics](https://www.duckdb.org/docs/2.0/sql/query_syntax/setops), and [Parquet logical types](https://parquet.apache.org/docs/file-format/types/logicaltypes/).

## Executed pilot

`comparator-70k-check.json` compares one-worker and eight-worker outputs containing 70,000 user-day rows and one campaign-day row. The one-worker output includes a 65,652-row file crossing the custom writer's data-page threshold. The result is exact equality in both directions.

- DuckDB memory limit: 64 MB, one thread.
- Recorded maximum RSS: 139,284 KiB.
- Recorded duration: approximately 0.456 seconds.
- Both original schemas were validated; no missing or extra rows were found.

This pilot establishes that the implemented method works across partition and Parquet page boundaries. It does not substitute for a recorded full 60M execution. `comparator_selftest.py` checks partition/column/accepted integer-width changes, duplicate multiplicity, missing rows, changed revenue, null versus empty category, incorrect day type, required nulls, wrong columns, dictionary string types, symlink output directories, and mixed signed/unsigned files containing a value above the signed 64-bit range. Its result is recorded in `comparator-selftest.json`. All per-file schemas are bound before scanning so a narrow first file cannot narrow a later value.

## Executed nominal 20M comparisons

The six outputs `bench/outputs/p20-deep24-n8-{bins-plain,people,compact,bins-flat,deep24,team67}` were each compared against `bench/outputs/p20-deep24-n8-baseline-c`. Every pair matched exactly: **2,250,361 user-day rows and 28,014 campaign-day rows**, with zero missing/extra rows and valid original schemas. Reports are `p20-deep24-vs-baseline-<variant>.json`.

Each comparison ran in a fresh process with a 512 MB engine limit and one thread. Recorded maximum RSS ranged from 541,928 to 564,628 KiB. This is an executed bounded-memory differential check, including the independent competitor implementation. It does not turn baseline C into an independent semantic oracle.

## Full 60M execution recipe

The first two full nominal 60M comparisons have now executed successfully. Both `bench/outputs/f60-dense-capacity-n8-dense-clicks` and `bench/outputs/f60-dense-capacity-n8-dense-tight` match the Team67 output from that same batch exactly: **6,629,125 user-day rows and 28,014 campaign-day rows** each, valid original schemas, zero missing rows, zero extra rows. The reports are `f60-dense-vs-team67-dense-clicks.json` and `f60-dense-vs-team67-dense-tight.json`. Their respective comparator peak RSS values are 658,892 and 664,624 KiB with the 512 MB engine setting; durations were approximately 45.6 and 29.8 seconds. These are comparison durations, not pipeline scores.

The corresponding pipeline execution records and binary hashes are in `bench/results/f60-dense-capacity-n8.json`. This establishes complete cross-implementation equality on the tested seed 61 dataset. Baseline C had not completed a full 60M run at this review point, so there is no claimed full 60M baseline-C match. Future combined or P2 variants still require their own final comparison.

After the coordinator identifies successful complete output directories:

```bash
python3 panel/database/external_compare.py \
  bench/outputs/COMPLETE_TEAM67_OUTPUT \
  bench/outputs/COMPLETE_FINAL_OUTPUT \
  --threads 1 --memory-limit 512MB --batch-rows 2048 \
  --report panel/database/final60m-vs-team67.json
```

Then repeat with a successful baseline C output as the reference. Placeholder paths are intentional: incomplete baseline folders from signal-9 runs must not be mistaken for successful output. Use the exact paths associated with recorded zero-exit processes. Run one comparison at a time, with adequate free disk for the canonical copies and external sort spill.

The report must show both tables equal, valid original schemas, complete row counts, and zero missing/extra multiplicity. Preserve the process record and binary hashes alongside the comparison. The eventual result can then say “all output rows matched Team67 and baseline C on this dataset,” with explicit dataset/seed/window and local-memory scope.

## Fresh independent reference runs

The prepared sequential runner has executed all three fresh seeds successfully against `bench/bin/dense-final`, SHA-256 `2fe9e2935a44eecc7665a400265d63544bc97b8967a4a0ea85313a93c39ea7cd`. Each dataset was generated by the original official generator, with one million requested events, one generation thread, and the requested click count below. The generator determines the fourteen-day window and seed-specific mixture of base36/hex identifiers; these were not invented CLI options. Separate adversarial cases exercise arbitrary Unicode, whitespace, leading zeros, and non-generator ID shapes.

| Seed | Requested clicks | Generated UTC window (end excluded) | User-day rows | Campaign-day rows | Reference peak RSS, KiB |
|---|---:|---|---:|---:|---:|
| 249 | 100,000 | 2028-02-16 to 2028-03-01 | 118,768 | 23,884 | 966,184 |
| 355 | 350,000 | 2028-02-17 to 2028-03-02 | 118,948 | 27,809 | 1,079,888 |
| 1234 | 800,000 | 2025-12-12 to 2025-12-26 | 118,580 | 28,010 | 1,283,492 |

Each seed passed at NCPU 1 and NCPU 8: **six exact schema/multiset comparisons**, zero missing or extra rows, and empty candidate stdout. The first two windows cross leap day. The separately running plain reference retained its unchanged parse, global dedup, canonicalization, session, attribution, and assist algorithms; only its output writer was replaced by an 8,192-row Arrow batching wrapper. Observed surviving event counts were 986,097, 975,556, and 983,528, respectively. Full input-file hashes, manifest values, process resource receipts, diagnostics, candidate/reference/generator hashes, and comparison details are in `fresh-final.json`.

The generator binary SHA-256 is `31778df307524a935e5a5849093994ef449d3340987741bd5ea1a2b824f0f6ec`; the plain reference SHA-256 is `73a7a68debe2cbfa3f4b4e3382f49528f662032602b2137067850e7f71cfa809`. Inputs and independently expected Parquet are retained under `panel/database/fresh-final-data-v2/seed-{249,355,1234}/{input,reference}`. Their computation is reusable for a subsequent selected build without regenerating or recomputing the oracle. These executions are correctness checks, not performance rankings.

For another frozen binary, run it on these same inputs and compare against their reference directories. For additional seeds, read the generator's actual options rather than inventing unsupported flags. If a dimension cannot be configured, use deterministic fixtures and record that distinction.

For each dataset, execute the plain reference in a separate process, measure peak RSS, write complete expected Parquet, and compare final output with the exact comparator. Retain the reference script hash, generator hash/options, manifest, counts, candidate hash, and comparison result. A direct small Python row multiset is suitable for the crafted fixtures; externally sorted Parquet avoids retaining both large output multisets in Python for the medium seeds.

The plain reference retains global deduplication and per-person structures in memory. Its measured peak stayed below 1.3 million KiB on these medium inputs. It has not been rewritten into a proven spillable 60M oracle, and no such claim should be made.

## Why casual sampling is unsound

Sampling files or rows before deduplication can miss an earlier invalid copy that suppresses a later valid event. Sampling users before canonicalization can miss an unused link identifier that determines their canonical name. Sampling a time interval can remove the previous event that connects a session or a click at the exact seven-day boundary.

Any future component sample must therefore retain complete identity-component closure, globally find all copies of candidate event IDs before filtering, include all relevant events for those components, and include their full attribution-click history. A two-pass input scan may be needed. Until that is implemented and audited, whole generated medium datasets provide a cleaner independent check than misleading partial 60M samples.

## A possible independent spillable reference

If a full independently implemented 60M oracle is later required, the safe architecture is staged and exact: strict dialect parsing into typed candidate partitions while retaining invalid copies; global event-ID/minimum-ingest selection before validity filtering; exact string-to-integer identity mapping and a separate canonical-minimum union-find; externally ordered per-person sessions; and exact click-window attribution/assists. Bounded batches and external sorts can keep memory controlled, but the identity and temporal joins require their own proofs and gates.

That is an architectural plan, not an implemented deliverable in this session. It should not displace the already executable exact differential comparison or delay release on the assumption that rewriting a reference automatically makes it more trustworthy.

## Final selected-layout semantic gates

The later `dense-wide42` candidate, binary SHA-256 `05518580abfc9a52e305e390401541f7f57fffbd740c3df9ead56fc86413a1ff`, passed all three retained one-million-event references at both one and eight workers (six exact comparisons). Input and expected-output hashes were verified before and after reuse. See `wide42-holdouts.json`. It also passed 320 repeated adversarial runs across normal one/eight-worker, scalar, and general modes, and all 36 official fixtures. The new cases cover exact 42-bit ID limits and the 22-bit time/sentinel boundary while explicitly retaining the fast engine. See `WIDE42_REVIEW.md` for the individual changed-function checks and exact source pins.

Recent local 60M capacity measurements of the tuned predecessor and the pinned Team67 implementation both experienced signal-9 terminations, including runs killed at differing process RSS values. This does not establish a clean capacity gate or the official 24 GB environment's outcome. Only successful complete output directories can support the final differential check. The earlier complete dense-clicks/dense-tight comparisons remain valid for their own hashes and must not be presented as final-candidate comparisons.

## Completed final 60M differential release gate

The preserved final output `bench/outputs/f60-wide42-spacechecked-n8-wide42-r00` matches the successful pinned Team67 output `bench/outputs/f60-final-n8-team67` exactly: **6,629,125 user-day rows and 28,014 campaign-day rows**, valid original schemas, zero missing rows and zero extra rows. This checks every output row and duplicate count through an exact external-sort/stream merge, not a sampling or hash-only comparison. The complete receipt is `wide42-final60m-vs-team67.json`; the comparison took about 23.12 seconds with a 512 MB DuckDB setting, one thread, and 662,588 KiB measured peak process RSS. These are comparator resources, not pipeline timing.

The coordinator's corresponding preserved candidate execution completed at eight workers with exit 0, empty stdout, about 3.40255 seconds, and 3,039,620 KiB peak RSS after filesystem space was freed. Earlier ENOSPC failures and signal-9 terminations must remain in the capacity report; the disk-space finding explains observed filesystem failures but does not prove the cause of earlier kills. This successful full-data equality is differential evidence against the locally pinned competitor, while the three independently computed one-million-event references provide separate semantic evidence. No independent full-60M oracle or official score is claimed.
