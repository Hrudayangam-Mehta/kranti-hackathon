# Shopping release — 22 November 2026

## Published result

- Repository: https://github.com/Hrudayangam-Mehta/kranti-hackathon
- New branch: `optimize/shopping-rust-v1`
- Commit: `3d8fe30157e655ef6109c17205a8d8b530e1ccfb`
- Parent: design C, `ad8526b3410bfb6b8b8febff35affe6bd5b42499`.
- Tested and freshly rebuilt executable SHA-256: `05518580abfc9a52e305e390401541f7f57fffbd740c3df9ead56fc86413a1ff`.
- Pushed at 03:26 AM Eastern. An anonymous public clone has the exact 28 tracked files from the release. A separate fresh source clone rebuilt to a byte-identical executable.

Seven Rust source files changed. README, Dockerfile, dependency pins, and LICENSE are unchanged from C. The submitted tree is 261,752 bytes and contains no generated datasets, test outputs, other teams' source, or credential. Protected branches `main`, `exp`, `blast`, and `handoff` were checked before and after this push and were unchanged by it. Receipts: `shopping-release-preflight.json`, `shopping-fresh-build.json`, `shopping-published.json`, and `shopping-fresh-public-clone.json`.

The owner's reported official C score is **1.0598 seconds**. The new commit has **no official score yet**. The local evidence favors submitting it, but does not establish its hidden-data time or a win against Team 67.

## Three rounds and subsequent bounded refinements

The Rust pipeline specialist, algorithm specialist, and independent database reviewer worked in separate owned trees. The coordinator integrated only reviewed changes and compared compiled binaries. Earlier round reports are historical checkpoints; this document and the `wide42-*` receipts identify the actual shipped source.

| Round | Question and work | Decision |
|---|---|---|
| 1: semantics and whole-pipeline baseline | Read v5 rules, original C, handoff, earlier builds, and the pinned public comparison source; inventory functions; build an independent semantic oracle; check identifier discovery and buffer reuse. | Fix the real hidden-CSV discovery omission. Reject broad buffer-reuse tuning as a default promotion because the observed aggregate timing regressed. |
| 2: algorithm and representation | Replace sorting every event timestamp with exact session-bin extrema; keep all event counts and the required purchase payloads; compact exact identifiers and common records; preserve deduplication before validation and canonical aliases. | Retain exact bins and compact representations. Independent model tests and compiled reference/readback tests challenge each mathematical assumption. |
| 3: integration, ablation, and stress | Combine smaller P1/P2/click records, adaptive click handling, exact Parquet dictionaries, partition tuning, and full-scale checks. Independently review pointer lifetimes, packing bounds, identifier ordering, and writer schema. | Keep measured improvements; reject the additional membership filter. Extend the common packed key to 42 bits with a checked 22-bit time lane. Complete final typed-reference, fixture, fresh-build, and 60M differential gates. |

These rounds involved several follow-up ablations, not three untested rewrites. Some individually plausible changes were slower. The final design uses a contiguous purchase vector with bin extrema; the earlier rejected linked-purchase experiment is a different representation and should not be confused with the final implementation.

## Function and invariant map

| Area / source | Changed logic and reason | Exactness obligation / evidence |
|---|---|---|
| `input.csv_files` | Includes valid hidden CSV filenames instead of dropping them solely for a leading dot. | Input rules do not exclude these files; adversarial hidden-file case passes. |
| `fast/id.rs`: `short_bases`, short-key encode/decode, `short_cmp` | Lossless length-separated encoding of observed short base-36 identifiers, retaining leading zeros and bytewise ordering. | This is not generator inversion. Short, hexadecimal, long, and unusual IDs retain exact fallback representations and equality checks. |
| `EventSmall`, `Candidate`, dedup/scatter in `fast/mod.rs` | Common event record is 16 bytes; dedup candidates are tagged references into retained arenas rather than copies of large records. | The global earliest ingest is selected before record validation. A malformed earliest event still suppresses later copies. Pointees outlive use; tag alignment and discard state are checked. |
| `PersonSmall` / `ClickSmall` | Common person-event records use 8 bytes; common click records use 16 bytes. | Packing is conditional on exact representability. Fractional times, wide IDs, purchases, out-of-range values, and unsupported shapes retain the full exact lanes. |
| `fast/people.rs`: `intern`, `find`, `slot_ptr`, canonical lookup | Split short/wide maps, compact union nodes, union by size, and canonical indirection reduce memory traffic. | The canonical ID is the bytewise minimum across the complete connected component, including inactive aliases. Full equality resolves hash collisions. |
| `person_bins`, `credit_session`, `finish_bin_row` | Group by exact 30-minute bins, retain extrema/counts/purchases, and use one common attribution routine. | A bin's span is strictly less than the session gap. Between occupied bins, compare actual next minimum against previous maximum with strict `> 30 minutes`. Events at exactly the gap remain joined. |
| Click grouping and sort dispatch | Up to four clicks use a small direct path; medium groups use comparison sorting; large groups use radix ordering and exact ties. | Latest eligible timestamp, minimum bytewise click ID, inclusive seven-day boundary, and distinct assisted campaigns are preserved in every path. |
| P1/P2 partition and arena recycling | Tune partition sizes, while computing a shared block geometry for both stages. | A recycled block has identical actual byte capacity in each stage; unequal geometry would invalidate the reuse. Boundary tests cover this invariant. |
| `fast/parquet.rs` / `fast/write.rs`: `Dictionary`, `dictionary_indices`, `user_dictionary` | Optional exact user-ID dictionary encoding with RLE index pages and plain fallback. | Arrow and DuckDB independently read exact schemas and multisets. Tests cover empty/plain fallback, page boundaries, dictionary-width transitions, and repeated noncontiguous IDs. |

The implementation keeps its existing general path and a scalar path. The review inventory covers the original modules and changed call sites, but it is not a claim that every function was rewritten or every unsafe line has a formal proof. Source-specific reports are under `rust/`, `algorithm/`, and `database/`.

### Final 42/22 packing contract

The common key field has 42 bits; relative time/campaign lanes have 22 bits. P1 reserves the maximum time value for an invalid timestamp, so a valid timestamp at that value must fall back. P2 and click lanes can use the valid endpoint where their representation permits it. Constructors check whole-second representability and bounds before shifting; they do not silently truncate. Boundary families cover the maximum minus one, the maximum, the maximum plus one, and subsecond neighbors. The final boundary dataset stays within the fast engine's supported window so the test cannot pass merely by bypassing the compact path.

## Final validation, pinned to the shipped executable

| Gate | Result | Receipt |
|---|---|---|
| Release Rust unit tests | 35 passed, zero failed | `wide42-unit-tests.json` |
| Independent adversarial execution | 320/320 passed: 40 families × fast 1-worker / fast 8-worker / scalar / general × repeat | `database/wide42-final.json` and `.meta.json` |
| Official starter edge fixtures | 36/36 passed | `database/wide42-official-fixtures.json` |
| Independent complete 1M-event holdouts | 6/6 exact matches: three seeds at 1 and 8 workers; expected outputs and input hashes unchanged | `database/wide42-holdouts.json` |
| 60M events + 15M clicks | Completed at 8 workers after workspace disk remediation | `../bench/results/f60-wide42-spacechecked-n8.json` |
| Full-scale exact differential | 6,629,125 user-day rows and 28,014 campaign-day rows; zero missing/extra rows against the preserved pinned Team 67 output | `database/wide42-final60m-vs-team67.json` |
| Fresh source build | Byte-identical executable | `shopping-fresh-build.json` |
| Fresh anonymous public clone | Exact commit and all 28 tracked files match | `shopping-fresh-public-clone.json` |

The independent semantic oracle is used for the complete 1M holdouts and adversarial families. The 60M comparator is differential evidence against the pinned competitor executable, not an independently recomputed 60M semantic oracle. The comparator performs a bounded external total sort and streamed exact multiset merge; it does not rely on a hash sum as a substitute for equality. Its 23.12-second comparison time is not pipeline runtime.

Final test families include invalid earliest duplicates; duplicates assigned to different users; transitive aliases and inactive minima; leading zeros; short/hex/exotic collisions; 9KB identifiers; very long numeric fields; leap days; 30-minute and seven-day boundary neighbors; adaptive click group thresholds; skewed linked users; mixed compact/wide arenas; dictionary/page limits; and large exact integer totals. Typed schema checks reject duplicate column names and incorrect physical/logical types.

### Runtime and environment limits

The executable is a stripped static PIE with no ELF interpreter and was checked as uid 1000. Docker is unavailable here. The environment rejected PTRACE before the syscall-audited process could start, so no syscall-derived network/write audit is claimed. The actual contest container, cgroup limits, read-only filesystem, and hidden data remain official-run checks.

The final-capacity history is preserved, including failures. Earlier 41-bit runs completed only 1/3 for our candidate and 2/3 for Team 67; other attempts were killed with signal 9. The first final 42-bit batch then had one signal-9 process, one explicit ENOSPC exit, and an output-directory creation failure before the third run. These are not passes. We removed 4.60GB of reproducible older benchmark outputs, retained all reports/logs and required references, and recorded 4.57GB free before the next run. The post-remediation 8-worker run completed in **3.40255s**, with **3,039,620 KiB** process peak RSS. It is one successful capacity run, not a three-run median. Signal 9 by itself does not prove the cause, and the later disk diagnosis does not retroactively explain every earlier kill.

## Performance comparison

Final 20M batch: five fresh processes per executable, rotating interleaving, 8 workers on CPUs 0–7, no concurrent panel benchmarks, OS-managed input cache, and output cache advice only after each measurement. All 20 processes succeeded. Host scheduling and storage remain uncontrolled.

| Build | Median wall seconds | Median CPU seconds | Median process peak RSS KiB |
|---|---:|---:|---:|
| Original C | 2.455066 | 8.361352 | 1,510,968 |
| Earlier tuned 41-bit build | 1.986107 | 6.310538 | 1,096,064 |
| **Published 42-bit build** | **1.881402** | **6.279422** | **1,096,632** |
| Pinned public Team 67 build | **1.134012** | **3.003121** | **1,075,452** |

In that batch, the published build has about **23.4% lower wall time**, **24.9% lower CPU time**, and **27.4% lower process peak RSS** than C. It still takes about **1.66×** Team 67's wall time and **2.09×** its CPU time. Receipt: `../bench/results/p20-wide42-final-n8.json`.

Earlier quieter-looking measurements of the 41-bit tuning were C 0.823803s, tuned 0.721903s, and Team 67 0.346949s. Those use another batch and a different candidate; do not substitute the earlier minimum or merge the timings. The final batch incurred many page faults and had much higher absolute times. The direction versus C persisted, but neither batch is a calibrated forecast of hidden practice time.

### What remains worse than 67

The comparator is the locally preserved public commit `1cda738c004b3b186b878bdb8eee6516bfa9f22a` from `jason-scheffel/express-lane`; executable SHA-256 `ae2892a75952b0a213f7c6190156b342b33cecd02d541ad9de2d02fa184f330c`. We cannot bind that public HEAD to the board's scored commit. A later anonymous refresh failed, so it is not described as their latest source.

Our architecture still spends more work on intermediate routing and parsing than this comparator. The panel mapped its user-grouped raw routing, compressed run representation, and multirow scanning ideas, but did not implement its entire architecture or copy its code. Our independent correctness cases found no demonstrated flaw in its tested outputs. The tested final outputs agree; our implementation is slower in this local comparison. A full clean-room regrouping/parser redesign remains separate work, superseded for this session by the owner's direction to finish Shopping and focus on Mech.

## Public board and repository access

The latest overall leaderboard page read during release showed: LSU_i_Bosna_Najbolja 0.4293s, 67 0.4458s, OhShi 0.4482s, Wix 0.4497s, NoMoreLite 0.4508s. The concurrent track page showed an older LSU time, so these numbers are a single-page point-in-time snapshot, not a synchronized live feed. Numeric rank badges determine rank; page list order is alphabetical.

Of those five teams, only 67's public repository attribution was verified during this work. The other four scored submission repositories/commits were not exposed or verified by the bounded public lookups. An earlier public GMUNVIS repository was studied when it was in the top five; it has since fallen outside that set. Unverified associations have not been filled in with guesses. See `algorithm/public_source_lookup.json`, `algorithm/deep-map.md`, and `algorithm/refresh-access.json`.

Official sources: https://www.joinbuilders.org/buildathon/tracks/shopping-sessions and https://www.joinbuilders.org/buildathon/leaderboard. v5 semantics, opaque observed-ID handling, the nine-run top-30 final, and own-work rule were checked. Research and books are mapped to implementation questions in `RESEARCH_NOTES.md`.
