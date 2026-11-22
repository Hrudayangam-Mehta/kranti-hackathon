# Expert-panel resource map

Reviewed 22 November 2026. This is a selection of primary papers, official documentation, author/publisher book contents, and maintained open-source references relevant to the concrete decisions in this repository. Chapter mappings identify useful study material; they are not claims that every book was read in full. Research informs hypotheses and tests. A paper's reported gain is not a measured gain for our submission.

## Assignments and evidence discipline

| Specialist | Owned questions | Resources applied |
|---|---|---|
| Rust and core pipeline | Allocation/lifetime invariants, static builds, compact records, block recycling; later Mech combat macro and bounded runtime | Rustonomicon, Rust Performance Book, Rust for Rustaceans, Morsel-Driven Parallelism, Systems Performance |
| Database and backend correctness | Independent semantics, duplicate/alias/session/attribution invariants, schema and Parquet readback, bounded exact comparison; later independent mechanics/composition review | Official track rules, Parquet specification, Database Internals, DuckDB and Arrow as independent readers, Real-Time Collision Detection |
| Algorithms and competitive design | Exact session-bin proof, architecture comparison and ablations; later shared-aim weapon scheduling, pickup utility and movement variation | CSV/partitioning papers, Planning Algorithms, AI for Games, TD-MPC2 and Jumpy World Models as bounded-horizon/temporal-abstraction references |
| Coordinator | Integrate evidence, reject regressions, pin sources/binaries, compare complete outputs and publish new branches | Reproducible receipts, source-specific reviews, current official rules/announcements and owner-provided scored results |

## Books and documentation

### Rust and data systems

1. **Jon Gjengset, Rust for Rustaceans.** Publisher: https://nostarch.com/rust-rustaceans. Prioritize Chapters 1 Foundations, 2 Types, 6 Testing, 9 Unsafe Code, and 10 Concurrency (and Parallelism). The concrete application is the tagged `Candidate` pointer and arena lifecycle: compactness is useful only if source allocations remain valid through deduplication and consumption. Use this with the actual language reference rather than treating a pointer-size saving as a proof of soundness.
2. **The Rustonomicon**, official: https://doc.rust-lang.org/nomicon/. Read the sections on pointer aliasing, lifetimes, uninitialized memory, and `Send`/`Sync` alongside the relevant `unsafe` blocks. Review allocation provenance, alignment, ownership transfer and synchronization separately. Our tests challenge observed behavior; they do not prove all possible unsafe executions.
3. **Nicholas Nethercote, The Rust Performance Book**, official author site: https://nnethercote.github.io/perf-book/; allocation chapter: https://nnethercote.github.io/perf-book/heap-allocations.html. Use its measurement-first treatment of heap allocations to distinguish fewer allocations from lower total time. In this project, some buffer reuse and filter proposals were rejected after ablation.
4. **Alex Petrov, Database Internals**, author site: https://www.databass.dev/. The storage-engine and data-representation material is useful for separating logical records from physical layouts, and for checking exact equality and lifetime invariants when records are compressed. The contest pipeline is an in-memory batch computation; this does not justify adding a durable storage engine or transaction system.
5. **Brendan Gregg, Systems Performance**, author material: https://www.brendangregg.com/overview.html. Study methodology, CPU, memory and filesystem/I/O analysis. Here wall time, CPU time, page faults and process peak RSS were recorded together, and disk-full failures were kept in the evidence. A slow page-cache batch cannot be converted into a universal instruction-throughput conclusion.
6. **Apache Parquet official format documentation**, https://parquet.apache.org/docs/file-format/ and https://parquet.apache.org/docs/file-format/types/logicaltypes/. Use the logical-type and encoding specifications for exact dates, integer fields, dictionary pages and RLE/bit-packed indices. Validate with multiple readers at encoding-width and page boundaries. The custom writer does not get a correctness exemption because its byte output is smaller.

### Game mechanics and decision systems

7. **Steven M. LaValle, Planning Algorithms**, author-hosted contents: https://www.lavalle.pl/planning/web.html. Most relevant: Chapter 8, Feedback Motion Planning; Chapters 9–10, decision theory and sequential decision theory; Chapters 11–12, information spaces and sensing uncertainty; Chapter 13, differential models. Apply these to observed-state feedback, bounded planning horizons, map reachability and pursuit under partial observations. The active bot is a heuristic feedback controller, not a solved optimal policy.
8. **Ian Millington, AI for Games, third edition**, publisher contents: https://www.routledge.com/Artificial-Intelligence-for-Games/Millington-Funge/p/book/9781138483972. Relevant chapters are 3 Movement, 4 Pathfinding, 5 Decision Making, 6 Tactical and Strategic AI, and 9 Execution Management. These motivate a clear setup/commit/cooldown-cycle structure and explicit priority ordering between tactical movement, physical dodges, weapon aim and pickup hands.
9. **Christer Ericson, Real-Time Collision Detection**, author contents: https://realtimecollisiondetection.net/books/rtcd/toc/index.html. Prioritize section 5.3 on ray/segment intersection, Chapter 11 on numerical robustness, and Chapter 13 on optimization. Apply the principles to muzzle-prefix clearance, actual torso slew, pitch limits and the isolated mortar arc calculation. A sampled arc has an approximation bound; it is not identical to the server's finite-projectile collision engine.

## Recent and foundational primary papers

| Paper | Concrete relevance | Boundary of the inference |
|---|---|---|
| **Ellmann and Neumann, One Pass to Parse Them All: Fused Parallel CSV Processing**, PVLDB 19(11), 2026. https://db.in.tum.de/people/sites/ellmann/papers/csveee.pdf, DOI 10.14778/3836663.3836710 | Fused scanning, chunk-local work, and reducing intermediate parsing traffic. Helps explain the remaining gap between our parser/routing layout and the pinned comparator. | Its evaluation does not measure our session pipeline. A broader structural-index/multirow scanner rewrite was not shipped in this release. |
| **Zinsmeister et al., Predictive Translation**, SIGMOD 2026. https://db.in.tum.de/people/sites/zinsmeister/papers/predictive-translation.pdf, DOI 10.1145/3786678 | Analyze dependency chains and overlap predictable memory access. Relevant to person-map lookup and prefetch placement. | We did not implement this paper's storage buffer-pool design; it is a profiling and design reference. |
| **Schmidt et al., MIMD on SIMD**, CIDR 2025. https://vldb.org/cidrdb/papers/2025/p7-schmidt.pdf | Consider execution layout and data-dependent control flow when evaluating vectorization. | Wider SIMD or more complex dispatch is not automatically faster; no throughput is transferred from the paper. |
| **Kuiper et al., Saving Private Hash Join**, VLDB 2025. https://duckdb.org/library/saving-private-hash-join-vldb/ | Adaptive representations and memory traffic provide useful comparison questions for exact-ID maps and partitions. | Our implementation is not the paper's join operator. We retained exact ID equality and measured candidate changes. |
| **Leis et al., Morsel-Driven Parallelism**, SIGMOD 2014. https://ir.cwi.nl/pub/22547 | Bounded work units and locality inform worker partitioning and analysis of a skewed linked person. | This is foundational, not a new 2026 result. Our largest person still belongs to one person partition; skew is not solved merely by having eight workers. |
| **Polychroniou and Ross, A Comprehensive Study of Main-Memory Partitioning and its Application to Large-Scale Comparison- and Radix-Sort**, SIGMOD 2014. https://www.cs.columbia.edu/~orestis/sigmod14I.pdf, DOI 10.1145/2588555.2610522 | Radix partitioning, cache traffic and hardware-aware tradeoffs. | This foundational study motivates a choice of layout for a measured working set; it does not identify an optimal partition count for our current host or hidden data. |
| **Hansen et al., TD-MPC2**, ICLR 2024. Official proceedings: https://proceedings.iclr.cc/paper_files/paper/2024/hash/cf73d57b6dcda32b293df7c2d5341f49-Abstract-Conference.html; author project: https://www.tdmpc2.com/ | A common short horizon is a useful way to compare ready gun damage, charged beam timing, lightning energy and equip delays. | We did not train or run TD-MPC2. Our four-second pickup capacity and shorter burst heuristic are original bounded calculations on observed game state, not a learned world model or an empirical reproduction. |
| **Farebrother et al., Compositional Planning with Jumpy World Models**, ICML 2026. https://proceedings.mlr.press/v306/farebrother26a.html | Temporal abstraction suggests separating setup, committed pursuit and short weapon-recovery episodes. | The bot does not implement this paper's trained model. No reported planning gain is claimed for Mech. |
| **van den Berg et al., Optimal Reciprocal Collision Avoidance**, primary project paper: https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf | Useful geometry for understanding motion/collision constraints and bounded local planning. | Reciprocal collision avoidance assumes responsibility sharing. Hostile house bots need not cooperate, so that assumption cannot be transplanted into combat. |

Recent research is included where it addresses a real design question. Large general-purpose game-playing models were not added merely because they are current: their inference/training requirements do not establish a useful implementation under this bot's measured runtime and contest constraints.

## Open-source projects to study or use as references

| Project | Use here |
|---|---|
| https://github.com/rust-lang/hashbrown | Reference exact hash-table engineering and locality tradeoffs; never replace exact identity with an unchecked hash. |
| https://github.com/BurntSushi/rust-csv | Reference parser behavior and benchmark ideas, while preserving the contest's narrower, specific CSV dialect. |
| https://github.com/duckdb/duckdb | Independent output readback, exact external sorting and bounded comparison. |
| https://github.com/apache/arrow | Independent Parquet schemas/readback and bounded reference-output writing. |
| https://github.com/ackxolotl/csveee-evaluation | Authors' evaluation artifact for the fused CSV paper. Repository spelling was verified; no competitor code was imported. |
| https://github.com/nicklashansen/tdmpc2 | Authors' TD-MPC2 implementation, useful for understanding the paper; not a runtime dependency or implemented training pipeline here. |
| https://github.com/snape/RVO2 | Reference implementation for reciprocal motion avoidance; the hostile-opponent caveat above remains. |
| Official downloadable Shopping and Mech kits | Actual interface, fixture, schema, generator, map and protocol contracts. Current announcements override stale introductory match-count text in older kit material. |

## Research-to-test commitments

1. Every compact-data hypothesis needs exact fallback boundaries, mixed-lane tests and typed output comparison.
2. Every performance claim identifies binary SHA, input, workers, repetitions, cache policy, all failures and the comparator revision.
3. Every weapon decision respects two independent triggers with one shared torso aim, laser release semantics, actual cooldown/energy, live stats and legal pickup bounds.
4. The aggressive macro may accept tactical exposure after setup, but a tactical commitment does not remove real map, action or engine constraints.
5. Learned hit curves and handcrafted damage estimates remain uncertain estimates. They are not calibrated victory probabilities, and a modeled finishing opportunity is not a guaranteed kill.
6. Local protocol/stress success establishes behavior and runtime on tested observations. Official fresh-seed ranking remains separate evidence, and identical-code resubmission retains its first score under the current announcement.

Official rules and announcement pages: https://www.joinbuilders.org/buildathon/tracks/shopping-sessions, https://www.joinbuilders.org/buildathon/tracks/builders, and https://www.joinbuilders.org/buildathon/leaderboard.
