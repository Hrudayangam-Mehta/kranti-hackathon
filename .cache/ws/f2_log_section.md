# C1 engineering log: stage F2 (event-number buckets), then stage F1 (Lane F identity)

The stage F2 section comes first. The stage F1 log follows it unchanged, except for one corrected fact (whale chains, noted below).

# Stage F2: event-number buckets

## Summary

Stage F2 is implemented. Every acceptance check passed on the final binary, and F2 is clearly faster than F1.

**Binary:** `c1work/target/x86_64-unknown-linux-gnu/release/sessions`. A copy is at `c1work/bin/c2`.
- sha256 `ac45af4cf13543216d1ccf8d6f53f931a4e6870b6fbdc71f1a77b1001851c41c`. A rebuild from the final source gave the same hash, and every test below ran on this binary.
- F1 snapshot: `c1work_f1/`, a full copy of `c1work` as F1 was verified (plus the corrected log line). Its binary `c1work_f1/bin/c1` has sha256 `3a79f86e441d5b4f61bf045c2ecc2b356694dc1a6721c9dee7327c6915b2551b`.
- Baseline: `perf/bin/rel15`, sha256 `2f3ebac79b609ce84417d28b9074b2a261c68adddde0e9b71ebd56240639006c`.

**A/B (CPU-seconds, user + sys; NCPU 2 on cores 0,1; interleaved):** see [Performance](#f2-performance).

AB_SUMMARY_PLACEHOLDER

**Lane G share (logged on stderr):** 0.98% of event winners on the 20M set, 0.80% on the 60M set. The plan expected 1 to 3%.

## F1 verifier follow-up

VERIFY_F1 was a PASS with no failures, so the code needed no fix. Its one documentation finding, the false claim "whales are never chains" in the F1 fact table, is corrected in place in that table.

## Provenance

- I read `kit/rules.md`, `OWNER_DECISIONS.md`, `study/beat_plan.md` sections 0, 2 (gap table), 3 item C1 and 6 (common gate), our own source, the kit generator source, `VERIFY_F1.md`, and our own verifier's scripts (`verify/fuzz.py`, `verify/edge.py`, `c1work_vf1/verify/{vfuzz2,runrss}.py`) in order to copy them.
- I did not open `study/ideas_r67.md`, `study/ref_r67/` or any other team's code or notes.
- No git command was run against any remote, and nothing was pushed. I wrote only under `c1work`, `c1work_f1` and my scratch folder. `rel15`, `perf/bin/rel15`, `verify/` and the data sets were only read or executed.

## Generator facts F2 relies on (each checked in `kit/unz/generator/src`)

| Fact | Where | How F2 uses it |
|---|---|---|
| Each person has a consecutive range of event numbers, persons in index order | `plan.rs:209-216` (`first_event`, running `next_event`); `user.rs:153-158` | Bucket = number >> 15 holds whole persons; most persons are one run in one bucket |
| A person's events are numbered in time order | `user.rs:151-158` with `layout()`: whales take slots 0..168 in order (`user.rs:224-225`), others sorted (`user.rs:249`); gaps are non-negative (`user.rs:269`, `292-298`); a session ends before the next slot (`user.rs:27-34`, crossing sessions keep the next slot free, `user.rs:229-237`) | Runs are usually already in ts order. Not needed for exactness: every person's events are checked and sorted if needed |
| Event IDs are `e` + base36(scramble(number, event key)) | `user.rs:311-314`; event key `plan.rs:144` | Same inverse as the user IDs, with the event key |
| Person 0 is a whale with 1 to 2% of the events and owns numbers 0.. | `plan.rs:147-149`, `161-168`, `209-216` | Event key recovery anchors on person 0's earliest sampled event |
| Copies of an event repeat its event ID; later copies are ingested 1 s to 10 min later | `user.rs:384-416` | All copies of an event meet in one slot of one bucket |
| ingest_ts is whole seconds, at most about 5 days after ts, at most 5 s before it | `user.rs:549-565`, `413`; written with `write_utc` (F1) | 21-bit seconds field from window start − 7 d. Values above the field clamp; such a copy is always late, so clamping is exact for windows up to 16 days (guarded) |
| The window is 14 days; 20 categories | `plan.rs:33`, `plan.rs:10-31` | The 16-byte layout fits (31-bit ts, 5-bit category). Wider windows turn F2 off; categories beyond 31 become side records |
| Revised copies name the next person's first ID | `user.rs:401-411` | Winners are routed by their own user, so no special case |

The recovered event key equalled the generator's event key (from `c1work/tools/genkey.py`, an independent re-implementation of the seeding) on dev (seed 1), the 20M set (seed 7), the 60M set (seed 61) and all 14 test seeds.

## What was built

Changes are confined to `src/fast/`: `bucket.rs` (new, about 1,400 lines including tests), plus edits to `ident.rs` (prefix-generic decode, event-key recovery), `scan.rs` (`Kernel::mixed_e`, the AVX2 decoder taking the prefix, and its test) and `mod.rs` (module, lane choice, Lane G sink sizing, dispatch). `Cargo.toml` and `Cargo.lock` are unchanged; no new crates; no comments.

**Event key recovery** (setup, about 1 ms, after the user key):
- It samples up to 6,000 event lines (at most 1,000 per file, first 64 files) and keeps event ID, user and ts.
- With the user key known, the in-window samples of person 0 are sorted by ts. For the earliest (up to 3 anchors), it tries numbers n = 0, 1, 2, … (at most 2^22) as the anchor's number, derives the key, and keeps the first key for which at least 3 of 4 other person-0 samples decode below the person-0 bound.
- The key is accepted only if 99% of all sampled event IDs decode below the number cap, and, sorted by number, at least 99% of at least 1,000 adjacent pairs have non-decreasing (person, ts).
- On any failure the run prints `buckets off: …` and runs the F1 pipeline unchanged.

**Guards** (F2 off, F1 on): user key not recovered, person cap above 2^26, window too long for the ingest field or the 31-bit ts, more than 2^28 campaigns, or `SESSIONS_F2=0`.

**Parse.** An event line whose event ID is canonical and decodes below the number cap (2 × input bytes / 60) writes one 16-byte record into its bucket's sink. The record holds the slot (15 bits), the ingest in seconds (21), a kind (2: invalid, valid, side), and for a valid Lane F row the person g (26), alias (4), ts (31), price and category (29). Anything that does not fit (ingest not a whole second or below the field, a valid row whose user is raw, a category ≥ 32) becomes a **side** record: it stays in the bucket, and the bucket record points to a per-thread list holding the exact values. Routing therefore depends on the event ID alone, so all copies of an event always meet. Event IDs that are not canonical or decode above the cap use today's hash dedup.

Clicks with a Lane F user go into click parts by g >> 10; clicks with a raw user go to Lane G as today.

**Pass 1, per bucket.** All threads' records for the bucket are scattered into a 32k × 16 B slot table (L2) with a 4 KB occupancy bitmap. A record replaces the stored one only on a strictly smaller ingest (side records are compared at full precision, and everything at or above the clamp counts as the clamp, all of which are late anyway). The winners are then read in number order:
- invalid winners are dropped;
- winners with a raw user, or a user whose g is odd (F1's rule: cross-person links, shared devices, aliases ≥ 16 linked), go to Lane G with the same keys as F1;
- the rest are appended to the bucket's winner array (12 bytes each) and cut into runs of equal g; each run increments `count[g]`.

In the same phase: the general hash dedup for non-canonical event IDs (its Lane F winners become "extras" and mark g as multi), and each click part is sorted by g, then by (ts, click ID descending) within g, with odd g's clicks moved to Lane G.

**Pass 1.5.** Every run of a g with more than one run (or with extras) is collected; the leader groups them by g into multi units, largest first.

**Pass 2.** One work queue: multi units (largest first, so whales start early), then Lane G partitions (today's per-partition code, unchanged), then buckets (each run of a single-run g). For one g, the events are split by alias component (`rep` of the F1 alias union-find), checked for ts order (sorted if needed), credited against the g's clicks of the same component, and sessionized by the unchanged `Worker::person`. The person's name is F1's.

**Boundary stitching.** A person spanning buckets is a multi unit: its runs are read directly from the per-bucket winner arrays, in number order, as one sequence. No session summaries are needed.

**Exactness does not depend on the event key.** Decoding is a bijection between canonical strings and numbers, so a slot holds exactly the copies of one event ID. A wrong key only moves events into the general dedup (extras) or scatters a person over buckets (multi units); both paths gather a person's events completely before sessionizing, and order is always checked.

**Switches.** `SESSIONS_F2=0` runs F1; `SESSIONS_LANE=G` and `SESSIONS_PATH=slow` work as before. New test-only switches, never set by the scorer: `SESSIONS_TEST_EVENT_KEY` (force an event key, skipping recovery and its checks), `SESSIONS_TEST_BUCKET_BITS` (6 to 15; smaller buckets make most persons multi), `SESSIONS_TEST_NCAP` (number cap).

## Deviations from the plan

- **Regular/irregular persons.** The plan sends irregular persons (split by dropped links, multi-run, revised winners) to Lane G. F2 keeps them in Lane F instead: a g's events are split by alias component, and multi-run g's are gathered as multi units. Lane G gets only what F1 already sent there (odd g, raw users). This is simpler, exact, and keeps Lane G at 0.8 to 1% at scale.
- **Ingest below its range or not a whole second.** The plan sends such a row to Lane G. That would split an event's copies between two dedup structures, so F2 keeps the row in its bucket as a side record instead.
- **Stitching** reads runs directly instead of building session summaries (above).
- **Clicks** are grouped by g in click parts rather than one global per-person array.

## Acceptance (final binary `ac45af4c…c41c`)

ACCEPT_PLACEHOLDER

## F2 performance {#f2-performance}

PERF_PLACEHOLDER

## Files

- `c1work/src/fast/bucket.rs` (new) and `c1work/src/fast/{ident,scan,mod}.rs`: the change. Everything else is F1's tree.
- `c1work/bin/c2`: the final binary. `c1work/bin/c2_a` is the same file (the first copy, identical hash).
- `c1work_f1/`: the F1 snapshot.
- `c1work/vtools/`: `eng2.sh` (engine wrapper passing every switch), `devmatrix.py` (configuration matrix against an answer), `seeds2.py` (seeds against `verify/ref.py`, three configurations per seed), `fuzzf2.py` (verify/fuzz.py mutations with the generator's file layout), `variant/variant.py` (40 categories and renumbered events), `edgev/` (a copy of `verify/edge.py` aimed at this binary), `runrss.py`.
- Logs: `c1work/vtools/seeds2_run1.out`, `fuzzf2_run1.out`, `edgev/runs/edge_*.txt`; matrix outputs and stderr in `c1work/run/f2m/`; fresh rel15 references in `c1work/run/f2ref/`; A/B results in `c1work/run/ab_f2_*`.

