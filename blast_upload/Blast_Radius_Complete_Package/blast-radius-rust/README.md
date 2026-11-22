# Blast Radius — original Rust submission candidate

A dependency-guided selector for the Builders / RWX Blast Radius track. The
selection, scheduling, JSON handling, and output are Rust, using only the standard
library. A small Python front end uses Python's own parser to validate patches
and syntax, then replaces itself with the Rust executable.

## Status and measured result

**Local sample validated; Docker execution and official submission not performed.**

| Check | Result |
| --- | --- |
| Organizer's 30-patch sample, final candidate | **254.904 simulated seconds; 0 misses** |
| Three complete native runs | All valid; byte-identical stdout |
| Median total including local process CPU | 255.718330 seconds; local rounded value 255.7 |
| Starter on this same sample | 1210.470 simulated seconds |
| All-tests fallback with optimized worker count | 1104.510 simulated seconds |
| Reduction versus sample starter | 78.94% |
| Baseline coverage profile | 1620 tests and 25440 subtests passed |
| Separate dialect-usage profile | 1620 tests passed |
| Distinct regression checks | 29 Rust + 23 Python |
| Duplicate 45-patch scale check | Valid, zero misses, 54450 stdout bytes |
| Compiler compatibility | Standalone source compiled and tested with Rust 1.85.1 |

These scores use the public sample and native Linux x86_64 measurements.
They are **not** hidden practice/final scores. The 45-patch check reuses existing
sample patches under new IDs; it is a workload check, not additional correctness
evidence. Full receipts are in `docs/validation.json` and `docs/scale-validation.json`.

## Submission contents

The repository root must contain `Dockerfile`; submit the complete directory,
not only `submission.rs`. The Docker build uses two fixed Docker Hub images,
compiles the standalone Rust source, and copies the committed baseline map.
It does not download crates, clone another team's repository, or run baseline
profiling during the submission build.

| Path | Purpose |
| --- | --- |
| `submission.rs` | Complete standalone Rust source, generated from `src/` |
| `src/` | Maintainable Rust modules: input, diff, impact, scheduling, JSONL |
| `maps/impact-map.json` | Own baseline source/dependency map, plain JSON with shared sets |
| `tools/entrypoint.py` | Batch syntax analysis followed by Rust execution |
| `tools/analyze_changes.py` | Strict patch application, Python AST and compile checks |
| `tools/build_map.py`, `profile_support.py` | Rebuild coverage/import/fixture facts from the pinned baseline |
| `tools/build_usage.py`, `usage_support.py` | Rebuild dynamic dialect and class consumers |
| `tools/merge_usage.py`, `compact_map.py` | Merge baseline evidence and deduplicate sets |
| `tools/benchmark.py` | Local-only validation using the organizer's actual scorer |
| `tools/fetch_starter.py` | Download/hash-check the public local-validation kit |
| `tools/check_package.py` | Check size, baseline identity, and absent evaluation files |
| `THIRD_PARTY_NOTICES.md` | SQLGlot license for source contained in the generated map |

The sample answers and patches are not in the submission package or image.
The selector never reads an answers file. Baseline maps contain no patch hashes,
mutation-to-answer tables, or test failures on changed code.

## Build and validate before submitting

Install Docker, make, Python 3.13, and Rust 1.85.1 or newer. Docker is sufficient
for the actual submission build; Rust is only needed for native development.

```bash
make fetch-kit
make test
make check-package
make sample
```

`make sample` builds for Linux amd64, runs the exact read-only/no-network resource
flags from the starter, and invokes the official local scorer. Its CPU is not
the organizer's CPU measurement. Run this container gate before spending a
submission slot: Docker was not available in the authoring environment.

Native validation:

```bash
make native
python3 tools/benchmark.py \
  --kit .starter-kit --output-dir output/native-check --runs 3 -- \
  python3 tools/entrypoint.py --data '{data}' \
  --map maps/impact-map.json \
  --selector target/release/blast-radius-selector
```

Each benchmark output directory must be new, so a new measurement cannot
silently overwrite a previous receipt.

## Design decisions

1. **Function coverage is the default.** Exact changed-line coverage failed an
   actual sample short-circuit mutation. Selecting all baseline callers of the
   enclosing function is more conservative.
2. **Fixtures use readers, including class setup.** SQL comment-like metadata
   can change a test. Fixture changes are not treated as harmless formatting.
3. **Cached dialect consumers are explicit.** A second unchanged-baseline run
   observes actual dialect lookup/construction, registry enumeration, uppercase
   attributes, and class/component inheritance. Static export aliases cover
   direct references such as a dialect's nested tokenizer.
4. **A syntax error selects all tests.** This avoids trusting an incomplete
   lazy-import graph when test collection may break broadly.
5. **AST equality preserves source/metadata readers.** Docstrings and type
   comments remain part of the comparison. Equality is guarded evidence, not
   a universal guarantee of program equivalence.
6. **Optimize the actual objective.** Integer milliseconds, one through eight
   workers, bounded balancing, zero-millisecond tests, and reserve tests fitted
   into existing slack. Adding reserves never creates workers or increases
   the makespan.
7. **Uncertainty broadens the result.** Unknown/malformed patches, incompatible
   maps, unsupported structure, and unavailable syntax analysis retain all tests.

The command-line `--policy line` is experimental and should not be used for the
submitted default. `--mode baseline-all` is a valid conservative diagnostic.

## Rebuild baseline maps

Only the unmodified pinned checkout and the test catalog are inputs. Run with
Python 3.13 and install `tools/profile-requirements.txt` in an isolated environment.
The original map was collected on Linux x86_64 using Python 3.13.5; the Docker
runtime uses the organizer's exact image digest. Runtime and profile interpreter
versions are recorded and should be kept aligned in a future full rebuild.

```bash
git clone https://github.com/tobymao/sqlglot.git ../sqlglot-baseline
git -C ../sqlglot-baseline checkout eb11aec4be8cb2122afe713a4816662c3f0fb2fa
python3 -m pip install -r tools/profile-requirements.txt

python3 tools/build_map.py --source ../sqlglot-baseline \
  --tests .starter-kit/sample/tests.json --work .profile/coverage \
  --output maps/impact-map.json

python3 tools/build_usage.py --source ../sqlglot-baseline \
  --tests .starter-kit/sample/tests.json --work .profile/usage \
  --output .profile/dialect-usage.json

python3 tools/merge_usage.py --map maps/impact-map.json \
  --usage .profile/dialect-usage.json
```

The builders verify the baseline and catalog. Shared fixture setup is assigned
to all tests in its scope, and process-pool contexts are propagated. The
instrumented pool has two workers and keeps original task functions/arguments.
All baseline assertions and subtests must pass; incomplete data must not be
treated as proof of no impact.

## Limits and next optimization work

Passing 30 sample patches does not establish zero misses on unseen changes.
Whole-suite traces can conceal cold-cache dependencies; dynamic class-use maps
repair demonstrated gaps but do not prove every cache, native file read, teardown,
or reflective dependency is captured. Module-level changes can remain expensive
because the importer approximation intentionally over-selects.

The next useful steps are fresh-process dependency profiling, independently
labeled adversarial patches, precise attribute-reader facts, validated
import-state analysis, and cost-bounded full-test verification. Each needs
evidence before it is allowed to prune a candidate. Heavy-test sampling and
scaling are not used in this candidate.

## Publish and hand in

Create your own public GitHub repository with these files at its root. Push the
exact reviewed revision. The submission form accepts that public URL and,
optionally, its full 40-character Git commit. Use an explicit commit to avoid
scoring a moving branch. This package has not consumed a submission slot.

Official references:

- https://www.joinbuilders.org/buildathon/tracks/blast-radius
- https://www.joinbuilders.org/buildathon/tracks/blast-radius/files/SCORING.md?inline=1
- https://www.joinbuilders.org/buildathon/status

The cutoff observed during this work was **22 November 2026, 11:00 AM EST**.
Recheck live status and quotas before submitting.
