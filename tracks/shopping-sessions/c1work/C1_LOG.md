# C1 engineering log: stage F2 (event-number buckets), then stage F1 (Lane F identity)

The stage F2 section comes first. The stage F1 log follows it unchanged, except for one corrected fact (whale chains, noted below).

# Stage F2: event-number buckets

## Summary

Stage F2 is implemented. Every acceptance check passed on the final binary, and F2 is clearly faster than F1.

**Binary:** `c1work/target/x86_64-unknown-linux-gnu/release/sessions`. A copy is at `c1work/bin/c2`.
- sha256 `ac45af4cf13543216d1ccf8d6f53f931a4e6870b6fbdc71f1a77b1001851c41c`. A rebuild from the final source gave the same hash, and every test below ran on this binary.
- F1 snapshot: `c1work_f1/`, a full copy of `c1work` as F1 was verified (plus the corrected log line). Its binary `c1work_f1/bin/c1` has sha256 `3a79f86e441d5b4f61bf045c2ecc2b356694dc1a6721c9dee7327c6915b2551b`.
- Baseline: `perf/bin/rel15`, sha256 `2f3ebac79b609ce84417d28b9074b2a261c68adddde0e9b71ebd56240639006c`.

**A/B (CPU-seconds, user + sys; NCPU 2 on cores 0,1; interleaved):** see the Performance section.

| Set | Pairs | rel15 | F1 | F2 | F2 − F1, paired median | F2 lower than F1 |
|---|---|---|---|---|---|---|
| 20M | 9 | 6.69 | 6.64 | **4.84** | **−1.84 s (−28%)** | 9 of 9 pairs |
| 60M | 3 | 25.73 | 26.38 | **16.82** | **−9.34 s (−35%)** | 3 of 3 pairs |

Medians of CPU-seconds. Both sessions ran under heavy load from other agents' jobs (the A/B script's quiet gate never opened), so the absolute numbers are higher than the F1 log's quieter runs. The ordering held in every pair.

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

| Check | Result |
|---|---|
| `cargo test --release` (separate target dir) | 29 passed, 0 failed. The SIMD-vs-scalar decoder test now also covers the event decoder; 2 new tests: bucket record encoding and ingest order (plain, clamped, side, unparsable), and event-key recovery on synthetic generator-shaped data, including a wrong user key and a too-small sample |
| Source | No comments (no `//`, `/*` or `*/` anywhere in `src/`). `Cargo.toml` and `Cargo.lock` unchanged. One warning, pre-existing (`keys::lookup` unused) |
| Kit fixtures | 36/36 in each of: NCPU 1, NCPU 4, `SESSIONS_LANE=G` at NCPU 1 and 4, `SESSIONS_SCALAR=1` at NCPU 8. The fixtures are too small to turn the lanes on |
| Dev against the dev answer, both ways | 32 configurations, all MATCH: NCPU 1, 2, 3, 4, 8; `SESSIONS_LANE=G`; `SESSIONS_F2=0` (F1); `SESSIONS_PATH=slow`; scalar; bucket bits 6 (NCPU 2 and 8) and 9; wrong event keys (xor 1, and 12345); number caps 1, 200k and 500k (recovery then refuses, F1 runs); twist; twist with cap 20,000; wrong user key; person cap 3,000; twist with bucket bits 6; scalar with bucket bits 6. With the event key forced: twist; twist with bucket bits 6; number cap 300k; number cap 500k with bucket bits 6; person cap 3,000 with bucket bits 6; wrong user key (every row becomes a side record); twist with cap 300 and bucket bits 8; person cap 1; scalar with twist at NCPU 1. Lane G share 1.62% (auto) |
| 20M set against a fresh rel15 output, both ways | 10 configurations, all MATCH: NCPU 1, 2, 8; `SESSIONS_LANE=G`; `SESSIONS_F2=0`; event key xor 1 (every event through the general dedup: 663,036 multi persons); bucket bits 9 (30,075 multi persons); twist with the true event key; scalar; number cap 8M with the true key (11.6M general-ID winners). **Lane G share 0.98%** |
| 60M set against a fresh rel15 output, both ways | NCPU 2 and 8 MATCH. **Lane G share 0.80%**. Recovered keys are seed 61's |
| 14 generator seeds against `verify/ref.py`, both ways | 42 runs, all MATCH: each seed at NCPU 2, with bucket bits 8 at NCPU 3, and with `SESSIONS_LANE=G`. F2 was on in all 14, and the recovered user and event keys equal the generator's for all 14. Seeds 15, 62, 3, 7, 11, 23, 101, 202, 303, 777 (the F1 set), plus 2481 (window starts on 2028-02-29), 2793 (whale 0 is a chain person), 537 (50k events, 500k clicks) and 1372 (300k, 1.2M). Windows holding Feb 29: 15, 62, 2481, 537, 1372. Lane G shares 1.32% to 3.50% |
| Fuzz (`verify/fuzz.py` mutations, generator file layout of 24 to 64 files) | 40 rounds × 3 configurations (random NCPU 1 to 8; bucket bits 7; `SESSIONS_LANE=G`) = 120 runs, all MATCH. F2 was on in all 40 |
| Edge cases (`verify/edge.py`, default, `SESSIONS_LANE=G`, NCPU 8) | 34 PASS and the same 2 known CHECKs as F1 and rel15 (x18b hidden file, x33 click copies that differ), identical in all three |
| Generator variant: seed 11 with 40 categories and event numbers reversed inside each block of 64 | All 5 configurations MATCH. In auto mode, event-key recovery refuses (the ordering check fails) and F1 runs. With the key forced, F2 runs out-of-order and interleaved runs (3,065 multi persons) and 2,271 extra side records for categories 32 to 39, at NCPU 2 and 8 and with bucket bits 7 |
| Wrong-key test | Event key xor 1 on 20M: MATCH, about 3× slower (22.1 s wall against 7.6 s in the same loaded session), because every event goes through the general dedup. Wrong user key with the true event key: MATCH (all rows are side records, all in Lane G) |
| Memory (peak RSS including the mapped input, NCPU 2) | 20M: 2,310 MB against F1's 2,686 MB. 60M: 6,850 MB against 8,011 MB |

## F2 performance

**Interleaved A/B, CPU-seconds (user + sys), NCPU 2, cores 0,1** (`c1work/vtools/ab2.py`, a copy of `perf/ab.py` that writes outputs under `c1work/run/ab_out` and adds paired differences):

| Set | Build | CPU median (min) | user median | sys median | wall median (min) |
|---|---|---|---|---|---|
| 20M, 9 rounds | rel15 | 6.689 (5.340) | 4.385 | 2.288 | 9.68 (3.63) |
| | F1 | 6.636 (5.155) | 4.481 | 2.091 | 9.79 (2.75) |
| | **F2** | **4.841 (3.878)** | **3.380** | **1.358** | **6.33 (2.18)** |
| 60M, 3 rounds | rel15 | 25.73 (22.67) | 16.17 | 9.56 | 19.8 (17.9) |
| | F1 | 26.38 (24.20) | 15.94 | 10.44 | 25.2 (21.0) |
| | **F2** | **16.82 (16.16)** | **11.17** | **5.85** | **18.8 (14.6)** |

Paired CPU differences, per round: at 20M, F2 − F1 has median −1.84 s (every pair between −0.87 and −2.26), F2 − rel15 −1.89 s, F1 − rel15 −0.12 s. At 60M, F2 − F1 is −9.34 s (−8.05 to −9.56), F2 − rel15 −8.84 s. An earlier, less loaded 5-round A/B on 20M gave F1 5.566 against F2 3.698 (paired −1.73 s, 5 of 5).

Raw results: `c1work/run/ab_f2_p20_n2.{txt,json}`, `ab_f2_p60_n2.{txt,json}`, `ab_f2a_p20.json`.

**Phase laps** (cumulative wall, NCPU 2, from the RSS runs, loaded machine):

| Set | Build | parse | dedup or pass 1 | pass 1.5 | people (pass 2 and write) | total |
|---|---|---|---|---|---|---|
| 20M | F1 | 4.03 s | +1.03 s | | +1.23 s | 6.29 s |
| 20M | F2 | 2.78 s | +0.60 s | +0.002 s | +0.76 s | 4.14 s |
| 60M | F1 | 15.98 s | +3.03 s | | +3.85 s | 22.86 s |
| 60M | F2 | 12.13 s | +1.76 s | +0.005 s | +2.01 s | 15.92 s |

Where the time went:
- **Parse is faster too:** event records are 16 bytes instead of 32, event IDs are decoded to numbers instead of interned, and clicks no longer resolve a person at parse.
- **Dedup** is a direct slot table per bucket (L2) instead of a hash table per partition.
- **The per-person stage** no longer builds a local person hash table, radix-sorts by ts, or scatters by person: winners come out of pass 1 already grouped by person and, as a rule, in ts order.
- **System time** roughly halves (fewer and smaller anonymous buffers).

At 20M, 636 persons (1.98M events, 10%) were multi units: the 5 whales and the persons cut by bucket boundaries. At 60M: 1,884 persons (6.79M events, 11.5%).

**Not tried** (left for later): sharing the event-key sample with the user-key sample (about 1 ms of serial setup); allocating the winner arrays from the huge-page arena; fusing the two passes over a person's events in `f_group`.

## Files

- `c1work/src/fast/bucket.rs` (new) and `c1work/src/fast/{ident,scan,mod}.rs`: the change. Everything else is F1's tree.
- `c1work/bin/c2`: the final binary. `c1work/bin/c2_a` is the same file (the first copy, identical hash).
- `c1work_f1/`: the F1 snapshot.
- `c1work/vtools/`: `eng2.sh` (engine wrapper passing every switch), `devmatrix.py` (configuration matrix against an answer), `seeds2.py` (seeds against `verify/ref.py`, three configurations per seed), `fuzzf2.py` (verify/fuzz.py mutations with the generator's file layout), `variant/variant.py` (40 categories and renumbered events), `edgev/` (a copy of `verify/edge.py` aimed at this binary), `runrss.py`.
- Logs: `c1work/vtools/seeds2_run1.out`, `fuzzf2_run1.out`, `edgev/runs/edge_*.txt`; matrix outputs and stderr in `c1work/run/f2m/`; fresh rel15 references in `c1work/run/f2ref/`; A/B results in `c1work/run/ab_f2_*`.

# C1 stage F1 (Lane F identity): engineering log

Work folder: `c1work`, a copy of `rel15` with its `target/` left out. Built with rustc 1.97.0 using the exact command from the task (`--release --locked --offline --target x86_64-unknown-linux-gnu`, crt-static) and pinned with `taskset -c 0,1`. No new crates. The source has no comments.

## Summary

Stage F1 of C1 is implemented, and every acceptance check passed on the final binary.

- At run time the program recovers the generator's user key from a small sample of the input and checks it. Each canonical `u…` ID is then decoded into (person g, alias a).
- In parse, dedup and clicks, rows carry g. The dedup step no longer looks up a person table.
- Link lines inside one person become small per-person alias union-finds. Only the odd lines go into the general union-find, which therefore holds about 2 to 3% of the link lines.
- Any row that is not canonical, is out of range, or belongs to an irregular person goes to Lane G, which is today's code. A wrong key can only push rows into Lane G.

Outputs are byte-for-byte the same tables as rel15:
- dev, the 20M set and the 60M set;
- automatic mode, forced Lane G, wrong keys, and an adversarial remap of the decoder.

Ten generator seeds MATCH the independent reference, including two windows that contain 2028-02-29.

**Performance: a modest win, and only the 60M set shows a clear one.**
- The instruction count went up and last-level cache misses went down.
- This test machine has a 260 MB L3, so the person-table lookups that F1 removes were mostly cache hits here, not DRAM misses. The scorer's Cascade Lake L3 is far smaller.
- **20M set**, interleaved A/B, CPU-seconds median: 4.873 for rel15 against 4.577 for F1. The paired median difference was −0.40 s, but individual pairs swing by ±1.5 s because of other agents' load.
- **60M set:** CPU median 17.81 against 16.93, a paired median of −1.29 s. The links unit takes 0.55 s instead of 1.9 s on one thread.
- I would call this "probably positive on the scorer, unproven here". The large gain in the plan belongs to stage F2, which reuses everything built here.

**Binary:** `c1work/target/x86_64-unknown-linux-gnu/release/sessions`. A copy is at `c1work/bin/c1`.
- sha256 `3a79f86e441d5b4f61bf045c2ecc2b356694dc1a6721c9dee7327c6915b2551b`.
- Baseline: `perf/bin/rel15`, sha256 `2f3ebac79b609ce84417d28b9074b2a261c68adddde0e9b71ebd56240639006c`. It is identical to `rel15/target/x86_64-unknown-linux-gnu/release/sessions`.

## Provenance and open owner decisions

- I did not open `study/ideas_r67.md`, `study/ref_r67/` or any other team's material. The only plan text I read was `study/beat_plan.md`: section 0, the gap table and section 3 item C1. I also read our own `rules.md`, `README_track.md`, `OWNER_DECISIONS.md`, the rel15 source and the kit generator.
- Beat plan section 0 records that the C1 idea first reached us through the rival study. It also lists owner flags that are still open before Lane F ships:
  - the rival's request not to reuse its ideas;
  - asking the organisers whether reading the generator's ID structure at run time is acceptable.

  Nothing here was pushed, and no git command was run against any remote.

## Structural facts, each checked in `kit/unz/generator/src`

| Fact used | Where it is in the generator | How F1 depends on it |
|---|---|---|
| Persons are numbered with the 5 whales first | `plan.rs:36` (`WHALE_USERS = 5`); `plan.rs:161` ("Whales take the first indexes"); `allocate` puts the whale counts first | Key recovery pairs the most frequent IDs with values 0, 512, 1024, 1536 and 2048 |
| A whale's alias 0 carries at least half of its rows, unless the whale is a chain person | `user.rs:17` (`FIRST_ALIAS_SHARE = 0.5`); `User::alias` (`user.rs:143`). **Corrected after VERIFY_F1:** whales can be chains. Indexes 5 to 7 are always chains, and `plan.rs:183-184` also draws `chance(CHAIN_SHARE)` (1 in 20,000) for every other index, whales included. A chain whale uses its 50 to 400 aliases evenly (`user.rs:144`), so its alias 0 is not frequent | Same. A chain whale only removes one of the five candidates: the other whales' alias-0 IDs still give the key (the verifier's seeds 2793 and 15850 MATCH, with that whale in Lane G) |
| User number = person × 512 + alias | `user.rs:13` (`ALIAS_SLOTS = 512`); `user.rs:130`. The unused extra ID is alias `count` (`user.rs:185`), and aliases are at most 400 (`plan.rs:52`) | g = v >> 9, a = v & 511 |
| Shared-device IDs come from 2^39 and up | `user.rs:15` (`KIOSK_BASE = 1 << 39`); `user.rs:189` (base + 1..6). They appear only in links | Their g is far above the person cap, so they are "raw" and go to the general union-find |
| One reversible 40-bit mix, one key per ID kind per dataset, drawn from the seed | `text.rs:211` (`scramble`: × 0x9E3779B97F4B, xor key, xor-shift 17, × 0xD6E8FEB86659, mod 2^40); keys at `plan.rs:143-145`; prefixes `u` (`user.rs:121-124`), `e` (`user.rs:312`), `k` (`user.rs:461`) | Inverse: × inverse of the outer multiplier, z ^ z>>17 ^ z>>34, xor key, × inverse of the inner multiplier |
| Lower-case base 36 with no leading zeros | `text.rs:192-206` | Defines "canonical"; canonical strings map one-to-one to 40-bit values |
| Consecutive event numbers per person, in time order | `plan.rs:212-214` (running `first_event`); `user.rs:151-158` (sessions in sorted slot order, `user.rs:249`; times non-decreasing) | Not used in F1. It is the basis of F2's buckets |
| In 1 of 64 duplicated events, the later copies name the next person's first ID | `user.rs:406-409` | Rows are routed by their own user string, so this needs no special case |
| Upper-cased case variants exist | `user.rs:591` (`uppercase_last`) | Upper-case is not canonical, so those rows go to Lane G |

I also checked the recovered keys against keys derived independently from the generator's SplitMix seeding (`c1work/tools/genkey.py`, a re-implementation of `random.rs` and `plan.rs`). They matched for seed 1 (dev), for seed 7 (it turns out p20m is seed 7), and for all ten test seeds.

## What was built

All source changes are confined to `src/fast/`:

| File | Change |
|---|---|
| `ident.rs` (new) | Canonical check and base-36 value; mix, unmix and the key formula; rebuilding an ID's packed key from (g, a); the 16-alias union-find packed into one u64 per person (nibble = alias − parent; nibble 0 = 0xF marks an odd person); person names; key recovery; unit tests |
| `scan.rs` | `Kernel::mixed`: an AVX2 decoder from canonical string to 40-bit value (range checks, `pshufb` alignment by length, `maddubs`/`madd` base-36 accumulation), with a scalar twin. A test checks it against the scalar path on 400k random strings |
| `people.rs` | `People` also carries the per-person `info` array and the decoder |
| `mod.rs` | Decoder choice in setup; user fields decoded at parse (events and clicks); link classification; the merge (alias unions, compression, odd marking, odd persons' lines rebuilt as packed keys into the general union-find); dedup and click resolution; Lane F person keys turned into names once per person; Lane F and Lane G statistics on stderr |

**Key recovery** happens in setup and takes about 1 ms.
- It samples up to 6,000 event lines (at most 1,000 per file, from up to 64 files) and 2,500 link lines.
- For the top 8 user IDs crossed with the 5 whale values, it computes a key candidate. Each candidate goes through a 100-ID pre-check and then the plan's two checks:
  - at least 99% of the sampled canonical user IDs decode to g below the cap;
  - at least 90% of the sampled link lines decode to the same g on both sides, below the cap.
- A key is accepted only if exactly one candidate passes.
- The person cap is 2 × event_bytes / 1800 + 1024. That is about 2.5 × the true person count.
- On any failure (sample too small, no candidate, or several candidates), the run prints `lane F off: …` and uses Lane G for everything. It never re-reads the input.

**Routing (exact).** A row's user string goes to Lane F only if it meets all three conditions: it is canonical, it decodes to g below the cap with alias below 16, and g is not odd. Its person key is then (g, smallest alias of its component). Everything else keeps today's packed key and the general union-find.

**Links.**
- A link line is regular when both sides are canonical and decode to the same g below the cap, with both aliases below 16. Any other line is odd: it marks the g of each side that decodes below the cap, and it goes to the general union-find.
- After all lines are parsed, the regular lines of odd persons are rebuilt as packed keys and also go to the general union-find.

**Why exactness does not depend on the key.**
- For a person g that is not odd, every link line touching any ID of g is a regular line of g. So the component of (g, a) in the full link graph is exactly a's alias component within g.
- A component that touches an odd g contains no ID of a non-odd person. Every one of its lines (odd lines, and the regular lines of odd persons) is therefore in the general union-find.
- This holds for any key, because decoding is a bijection between canonical strings and 40-bit values. A wrong key only changes which strings are canonical-in-range, which moves rows between lanes. It never changes components or names.

**Environment switches:**
- `SESSIONS_LANE=G` forces Lane G for every row.
- `SESSIONS_PATH=slow` still selects the old slow path; it is unchanged.
- Three test-only switches are left in. The scorer never sets them.
  - `SESSIONS_TEST_USER_KEY` forces a key and skips recovery and validation.
  - `SESSIONS_TEST_TWIST=1` applies an injective remap that swaps bit 0 of g with bit 0 of the alias. This mixes two real persons into each decoded g, an adversarial "plausible but wrong" decoder.
  - `SESSIONS_TEST_GCAP` overrides the person cap.

## Acceptance results (final binary `3a79f86e…`)

| Check | Result |
|---|---|
| `cargo test` | 27 passed, 0 failed (21 inherited, 6 new: inverses, round trip, non-canonical, alias union-find, key recovery, SIMD decoder vs scalar) |
| Fixtures, NCPU 1 and 4 | 36/36 and 36/36; also 36/36 and 36/36 with `SESSIONS_LANE=G` |
| Dev, NCPU 1, 4, 8 | MATCH both ways at all three. Lane G share 1.62%; recovered key 0xf94d067aa5 = generator seed-1 key |
| 20M set, auto vs rel15 | MATCH both ways; Lane G share 0.98% |
| 20M set, `SESSIONS_LANE=G` vs rel15 | MATCH both ways |
| 20M set, wrong key (true key xor 1) vs rel15 | MATCH both ways; 0 rows in Lane F |
| 20M set, twist decoder vs rel15 | MATCH both ways; 3.32M rows through Lane F person keys, 83% Lane G |
| 60M set, auto vs rel15 | MATCH both ways; Lane G share 0.80%; key 0xd5c063b515 |
| 10 generator seeds vs `verify/ref.py` | 10/10 MATCH (table below) |
| Dev stress (all MATCH both ways) | wrong key xor 1; key 12345; random key with cap 2^27; twist; forced key with cap 3,000 (48.5% Lane G); twist with cap 20,000; `SESSIONS_PATH=slow`; `SESSIONS_LANE=G`; `SESSIONS_SCALAR=1` |

**Seeds** (`c1work/vtools/seeds.py`, a copy of `verify/seeds.py` pointed at this binary and at cores 0 and 1; reference `verify/ref.py`):

| Seed | Events / clicks | Window | Result | Lane G share |
|---|---|---|---|---|
| 15 | 2,000,000 / 500,000 | 2028-02-17 to 2028-03-02 (holds Feb 29) | MATCH | 1.43% |
| 62 | 1,000,000 / 250,000 | 2028-02-21 to 2028-03-06 (holds Feb 29) | MATCH | 1.57% |
| 3 | 1,000,000 / 250,000 | 2025-07-16 to 07-30 | MATCH | 1.32% |
| 7 | 500,000 / 125,000 | 2027-12-11 to 12-25 | MATCH | 1.79% |
| 11 | 300,000 / 75,000 | 2026-09-06 to 09-20 | MATCH | 1.83% |
| 23 | 1,500,000 / 400,000 | 2026-07-06 to 07-20 | MATCH | 1.38% |
| 101 | 200,000 / 400,000 | 2027-05-16 to 05-30 | MATCH | 2.10% |
| 202 | 800,000 / 200,000 | 2028-01-28 to 02-11 | MATCH | 1.55% |
| 303 | 100,000 / 25,000 | 2027-04-03 to 04-17 | MATCH | 2.51% |
| 777 | 1,200,000 / 300,000 | 2027-01-23 to 02-06 | MATCH | 1.63% |

In every seed run Lane F was on, and the recovered key equalled the generator's key. The same ten seeds also matched twice with earlier builds of this work.

## Performance

The machine was shared. Other agents' benchmarks used cores 0 to 3 at times, and CPU pressure sat around 50% during the later sessions. CPU time is therefore noisy, and paired differences swing by ±1.5 s. All A/B runs used a copy of `perf/ab.py` (`c1work/vtools/ab.py`, and `ab2.py`, which adds paired differences). The only change in the copies is that output goes to `c1work/run/ab_out`, not `perf/root20/output`. Settings: NCPU=2, cores 0,1, interleaved.

| Session | Build | Pairs | rel15 CPU median (min) | F1 CPU median (min) | Paired diff median / mean | Notes |
|---|---|---|---|---|---|---|
| 20M #1 | first (table decode) | 7 | 4.526 (4.354) | 4.503 (4.108) | n/a | quiet |
| 20M #2 | table decode | 7 | 4.933 (4.054) | 4.640 (4.197) | n/a | |
| 20M #3 | table decode | 11 | 5.253 (4.315) | 4.943 (4.374) | +0.288 / −0.051 | loaded |
| 20M #4 | **final** | 9 | 6.694 (5.126) | 6.449 (4.988) | −0.020 / −0.063 | heavily loaded (sys about 2.4 s) |
| 20M #5 | **final** | 9 | 4.873 (4.577) | 4.577 (4.011) | −0.396 / −0.544 | |
| 60M | **final** | 4 | 17.805 (17.291) | 16.931 (15.001) | −1.286 / −1.138 | wall median 13.11 vs 12.02 s |

System time is consistently lower, by about 0.1 to 0.3 s at 20M and about 1.0 s at 60M, because there is no large person hash table to fault in. The links unit costs 125 to 140 ms instead of 155 to 300 ms at 20M on one thread, and 0.55 s instead of 1.9 s at 60M. That matters at 60M because click parsing waits for links.

**Noise-free view: cachegrind on dev.** One thread; D1 32 KB; LL set to 2 MB so that the 4 MB dev person table is to this LL roughly what the 64 MB table at 20M is to the scorer's L3.

| Build | Instructions | LL misses |
|---|---|---|
| rel15 | 1,304.1 M | 4.762 M |
| F1, first version (pack, then table decode) | 1,486.4 M (+14.0%) | 4.074 M |
| F1, final (SIMD decoder) | 1,419.0 M (+8.8%) | 4.070 M (−14.5%) |

A symbolized profile of the first version shows where the change lands:
- dedup's LL misses fell from 450k to 51k, because the person-table probes are gone;
- click parse misses fell from 283k to 200k;
- the per-person stage's misses fell from 591k to 484k.

The extra instructions are the decode, about 75 per row in the first version and about 35 in the final; resolution in dedup, about 20 per winner; person names, about 13 M in total; and sampling. On the scorer each saved miss in the 64 MB (20M) or 256 MB (60M) table is a DRAM access. The net gain should therefore be larger there than here, but it is not measured.

**Things tried and rejected:**
- Decoding the user field in dedup instead of in parse (`c1work_dd`): CPU median 4.635 against 4.503 for decoding in parse, so it was dropped.
- The first sample of 20,000 lines with a full CSV parse cost about 6.5 ms of single-threaded setup. The final sample of 6,000 lines with a two-field split costs about 1 ms.

## Scope notes

- **The event key is not recovered.** The plan's recovery also covers the event key, but stage F1 has no consumer for it: dedup still hashes the packed event ID. Recovering it now would only add setup time. It belongs with F2's event-number buckets. The facts it needs are checked above.
- The F2 record layout, buckets, the regular/irregular decision from seen-alias masks, and the session stitching are not started.
- The person-name step rebuilds each alias string from (g, a) once per person. A faster base-36 encoder could save about 1% of instructions; that is not done.

## Files

- `c1work/src/fast/ident.rs`, `c1work/src/fast/{mod,scan,people}.rs`: the change. The other files are rel15's working tree unchanged; rel15's `.git` came along in the copy.
- `c1work/bin/{c1,rel15}`: the final binary and the baseline used for timing. `c1work/bin/c1dd` is the rejected variant.
- `c1work/run/`: outputs, stderr logs, comparison logs (`p20_compare_final2.log`, `p20_stress.log`, `p60_check.log`, `dev_stress_final.log`, `fixtures_final.log`), A/B results (`ab_*.txt`, `ab_*.json`) and cachegrind results (`cg/`).
- `c1work/vtools/`: copies of `seeds.py`, `eng.sh` and `ab.py` aimed at this binary, cores 0 and 1, and output under `c1work`. Seed logs: `seeds_final2.out`, plus `runs/` stderr.
- `c1work/tools/genkey.py`: independent derivation of the generator keys from a seed. `wrongkey_check.py`: an independent count of in-lane IDs under a key.
- `c1work_dd`, `c1work_base`, `c1work_prof`: the dedup-decode variant, a source copy of rel15 for the symbolized baseline, and the symbolized profiling builds.
- Nothing outside `c1work*` was written. rel15 was only read; its `.git/index` modification time is unchanged.
