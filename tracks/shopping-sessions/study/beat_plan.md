# Shopping Sessions: beat plan (strategist, for our engineers)

Written Sat 2026-11-21, about 20:45 UTC. Cutoff: Sun 2026-11-22 16:00 UTC (about 19 h). Two slots an hour.

## 0. Inputs, provenance, owner flags

**What I read:**
- `kit/rules.md` (the authority), `README_track.md`, `OWNER_DECISIONS.md`;
- our own `spec_independent.md`, `log_build.md` and source (`rel1/src`);
- the prose study `study/ideas_r67.md`;
- the **official kit generator** source, `kit/unz/generator/src/`.

I did not open the rival repository (`study/ref_r67/`). `study/ideas_rjh.md` does not exist: that read was blocked by the permission system, and this plan does not try to get around that. This file contains no rival code, identifiers, comments or constants. Every design below is written in our own terms, on top of our own modules.

**Provenance tags on every item:**
- **[ours]** means it is already in our spec or log.
- **[kit]** means I re-derived and checked it myself from the official generator source in our kit. The idea first reached us through the study, but every structural fact the main change depends on can be checked in the kit. I checked these:
  - persons are numbered with the 5 whales first;
  - each person has a consecutive range of event numbers, issued in time order;
  - a user number is person × 512 + alias, and shared-device IDs come from numbers at 2^39 and above;
  - all three ID kinds use one reversible 40-bit mix, with one key each per dataset, drawn from the seed;
  - IDs are written as lower-case base 36 with no leading zeros;
  - in 1 of 64 duplicated events, the later copies name the next person's first ID.
- **[study]** means the idea comes only from the rival study.

**Flags for the owner (decide before Lane F work ships):**
1. **The rival asked us not to.** The rival repository has root files asking AI tools not to read it or reuse its ideas. The study reports this; it is a fair-play request, and their code is MIT. The user's relayed decision is "we use those as competition to beat ... rebuilding". The organiser's 17:08 warning ("teams that copy other teams may be disqualified") still stands. Every [study] item can be dropped without touching the [kit] and [ours] items.
2. **Exploiting the generator.** Lane F reads the generator's ID structure at run time. Nothing is hard-coded: keys are recovered and checked on every run, and every row is still exact on any input. Even so, ask the organisers in writing whether this is acceptable, since "organizers verify the top results before announcing them". Do this together with the open question in README_track section 6.
3. **The probe slot.** The probe (section 5) uses one slot and fails the dev check on purpose. That needs the owner's OK.

## 1. Where we stand

| | 20M practice (8 vCPU) | 60M final (8 vCPU) |
|---|---|---|
| Ours, rel1 fast path | **0.98 s** (scored) | **~3.0 s** (est. from 15.45 CPU-s on 2 local cores) |
| Rival 67 | 0.30 s (board, tied at the apparent floor) | 0.6–0.9 s (study's estimate) |

**Model used for every estimate below:** scorer wall ≈ F + C / 5.4.
- C is CPU-seconds as measured locally with `perf/ab.py`.
- F, the fixed container and process cost, is about 0.15 s but unknown; the probe measures it.
- This model reproduces our 0.98 s from 4.5 CPU-s.

**Where our CPU goes at 20M** (the log's single-thread breakdown, 4.5 CPU-s):

| Stage | CPU-s | Per event line |
|---|---|---|
| Event scanner | 1.25 | 62 ns |
| Field work | 0.65 | |
| Record push | 0.2 | |
| Clicks | 0.3 | |
| Links | 0.15 | |
| Dedup and person lookup | 0.9 | |
| Per-person stage | 0.95 | |
| **Total** | | **~225 ns** |

The rival's run implies about 40 to 55 ns per line all-in. Two things explain almost all of the gap:
1. two hash shuffles plus a per-person sort, where they need one direct-addressed pass;
2. a scanner that writes position arrays and reads them back.

## 2. Gap table

The effects are our estimated wall-time savings on the scorer, if we adopt the idea into our pipeline.

| # | Rival technique (prose) | Ours today | Est. effect, 20M | Est. effect, 60M |
|---|---|---|---|---|
| T1 | Decode user and event IDs to dense numbers by inverting the generator's mix; keys recovered from a sample | No. 6-bit packed keys plus hashing | −0.05 to −0.08 s (no person lookups; 16 B records) | −0.2 to −0.3 s |
| T2 | One partition by event number does dedup (direct slot table in L2), person grouping and near time order together | No. Hash dedup partition, then a second partition by person, then a radix sort per partition | −0.15 to −0.20 s | −0.5 to −0.7 s (two of three full record passes removed; less DRAM traffic) |
| T3 | Person names from alias numbers, as order-preserving integers | Partly. Our packed keys already compare byte-wise; we decode the name at output | ~0 (an enabler for T1) | ~0 |
| T4 | Links resolved per generator person on small alias bitmasks; only odd links reach a general union-find | No. Full union-find on one thread (150 ms at 20M, 500 ms at 60M locally); clicks wait for it | −0.01 to −0.03 s | −0.05 to −0.1 s (off the critical path) |
| T5 | Per-line, shape-driven field decoding in registers, AVX-512, pipelined | Partly. AVX2 two-stage scanner (position arrays), SIMD key packing, SWAR times, date cache | −0.15 to −0.25 s | −0.5 to −0.7 s |
| T6 | Write-combining partition sinks with streaming stores | **Yes** (M2i) | 0 | 0 |
| T7 | Vectorised session-gap test and click windows for small persons | No (scalar sweeps) | ~−0.01 s | −0.02 to −0.04 s |
| T8 | Persons spanning partitions are stitched from session summaries | N/A today (we partition by person); needed with T2 | neutral | neutral |
| T9 | Persistent pinned workers that spin, then sleep; own bump allocator | Partly. Scoped threads spawned once, std barriers, huge-page arenas; no pinning or spinning | −0.01 to −0.03 s | −0.02 to −0.05 s |
| T10 | I/O chosen at run time (mapped vs positional reads by a fault test); early release of consumed input | Partly. Whole files mapped; no populate, no readahead, no early unmap | −0.01 to −0.04 s | −0.05 to −0.2 s (fault cost, plus the unmap at exit runs on one thread) |
| T11 | Output: dictionary/RLE/bit-packed columns; rows without purchases first per row group | Partly. Own writer, one file per thread, PLAIN, INT32 counts | −0.005 to −0.015 s | −0.01 to −0.04 s (more if `/output` is slow; probe) |
| T12 | Overlap: link and click jobs between event chunks; odd persons during output; unmap during output | Partly. Links overlap event parsing; barriers between parse, dedup, people and write | −0.02 to −0.04 s | −0.05 to −0.1 s |
| T13 | Probe submissions measuring the scorer (machine facts, cache residency, variant timings) | No | enabler | enabler |
| — | On any surprise, re-run the whole job on a scalar hash pipeline | Ours: a guard check before work, then the M1 slow path | (we can do better: per row) | their slow case: several seconds |
| — | Fixed-capacity buffers; overflow forces a re-run | Ours: chained blocks, no overflow | robustness | robustness |
| — | Floating toolchain; AVX-512 compiled into the whole binary | Ours: pinned by digest; runtime dispatch with scalar twins | rebuild-risk edge | edge |

## 3. Ranked change list (designs in our terms)

Each item lists its gain (est.), its correctness risk and its tests. The common gate for every submission is in section 6.

### C1. Lane F: generator-aware identity and event-number buckets, with exact per-row fallback to today's pipeline (Lane G) [kit]

**Gain:** 20M −0.22 to −0.30 s; 60M −0.8 to −1.0 s. **Risk:** high (identity logic). Deliver in two stages, each submittable.

**Decoding.**
- A string is *canonical* if it is the prefix `u`, `e` or `k`, then lower-case base 36, with no leading zero (a lone `0` is allowed), and a value below 2^40.
- Canonical strings map one-to-one to 40-bit values.
- Undo the mix in three steps: multiply by the inverse of the outer multiplier mod 2^40, undo the 17-bit xorshift (z ^ z>>17 ^ z>>34), XOR the key, then multiply by the inverse of the inner multiplier.
- A user value v gives person g = v >> 9 and alias a = v & 511.
- Anything non-canonical or out of range (g ≥ G_cap, or event number ≥ N_cap, both sized from input bytes with a 2× margin) is *raw* and goes to Lane G.

**Key recovery.** Done in setup, from about 20k event lines read across several files.
- **User key.** The 5 whales are persons 0 to 4, and alias 0 carries at least half of a whale's rows. So the most frequent user IDs are values 0, 512, 1024, 1536 and 2048. For each of the top 8 IDs and each of those 5 values, compute the key candidate.
  - Accept a candidate only if it is unique and passes both checks: at least 99% of sampled canonical user IDs decode to g < G_cap; at least 90% of sampled link lines decode to the same g on both sides.
- **Event key.** Person 0's first event has number 0, and numbers grow with time inside person 0.
  - Take the earliest-ts sampled event of person 0 and estimate its rank from ts and person 0's sampled share; search a bounded range of candidate numbers (≤ 2^20).
  - Accept only if at least 99% of sampled event IDs decode below N_cap.
  - Also check on the sample that, sorted by number, person numbers never decrease and ts never decreases within a person, in at least 99% of adjacent pairs.
- **On any failure,** run Lane G for everything (today's 0.98 s path), with no re-read.
- **Exactness does not depend on the keys.** Decoding is injective for any key, so a wrong key only moves rows into Lane G. Prove this with the wrong-key test (section 6).

**Links (stage F1).**
- Link records go into partitions by person block.
- A link line whose two sides are canonical aliases of one g (aliases < 16) becomes a 4-byte (g, a1, a2) record. Every other line (cross-person, shared-device ID, raw side) goes to the general union-find list.
- Per person, a tiny union-find over 16 alias bits gives the component masks.
- Person status, kept in a dense per-person array: components, odd-link flag, and the *seen-alias mask* (filled in later).
- The job is parallel, order-independent, and runs as work units between event chunks.

**Stage F1, submittable alone.** Records carry g directly instead of a person lookup. This removes the batched person-table probes from dedup; the rest stays as it is.

**Records.** Each event line writes one 16-byte record into the bucket for its event number.
- Bucket = number >> 15. The bit budget: slot 15, person 22, alias 8, ts offset 31 (ms from window start), ingest 21 (seconds from window start − 7 d), kind 2, and for a valid purchase only, price 24 + category 5.
- **Ingest above its range clamps to the top value.** This is exact while the window is at most 16 days: such a copy is at least a day after any valid ts, so it is late and invalid. A smaller real ingest still wins, and if every copy is clamped, the event dies either way.
- **Ingest below its range goes to Lane G for that row.** Early ingest is legal and keeps the event, so clamping it could change the winner.
- **Layout guard:** a window over 16 days, more than 31 categories, or aliases ≥ 256 mean using 24-byte records (ingest as full 32-bit seconds), or sending that row to Lane G. **Never 32 bytes.**
- Invalid copies still write a record with kind "invalid", because they can win dedup.

**Pass 1, per bucket (stage F2):**
1. Scatter every thread's records for the bucket into a direct slot table of 32k × 16 B (L2). A generation tag avoids clearing. A record replaces the stored one only on a strictly smaller ingest.
2. Compact the valid winners in number order.
3. Cut them into runs of equal g. For each run, OR the run's aliases into the person's seen mask (an alias of 16 or more sets the irregular flag instead), and atomically record its first bucket, last bucket and run count.
4. Winners whose user was raw go straight to Lane G records.

**Barrier.** After it, a person is *regular* only if all of these hold:
- all seen aliases lie in one component C (an alias with no links is its own component);
- g has no odd link anywhere, and all of C's aliases are below 16;
- its runs are contiguous: an interior run, or the tail of one bucket plus whole buckets plus the head of a later one.

Everything else is *irregular*: shared-device persons, persons split by dropped or upper-cased links, the rare revised-user copies that win, and chains of more than 16 aliases.

**Rule for odd links:** any odd link on g makes g irregular, and then *all* of g's link lines go to the general union-find. That way a component that crosses persons is always complete there.

**Lane G keys:** Lane G gets its records re-keyed to today's packed keys (rebuild the ID string from (g, a)). Lane G's code then stays unchanged.

**Other components of g:** components without events are persons with no rows, so they produce no output.

**Pass 2, per bucket:**
- Interior regular runs are sessionized at once. The events are already in ts order; check this, and sort only if a run is not.
- Each session is credited against the person's clicks. Clicks are stored person by person in one array: count per g, prefix sums, scatter, then a sort per person by (ts, packed click key, descending). Only clicks whose alias is in the person's component are kept.
- The person's name is the minimum packed key over the component's alias strings, rebuilt from the numbers.
- user_daily rows are emitted directly, in person order.
- Boundary runs become session summaries for a short stitch pass, largest person first. A summary holds start, last ts, events, revenue, a has-purchase flag and sparse category sums.
- Irregular persons' records and clicks go to Lane G.

**Lane G** is our current per-person code, unchanged, fed only by irregular and raw records. Expect 1 to 3% of rows; log the share and alert above 10%.

**Tests (C1):**
- auto vs forced-Lane-G output identical on the 20M and 60M sets;
- the generator-variant suite and the wrong-key test (section 6);
- mutation sets that split persons, upper-case link sides, link aliases only through clicks, and put a whale on a shared device;
- the stage-F1 build must MATCH before F2 starts.

### C2. Fused per-line decoder, used by both lanes [ours, refined]

**Gain:** 20M −0.15 to −0.25 s; 60M −0.5 to −0.7 s. It also speeds up Lane G, our insurance. **Risk:** medium (dialect).

**Design:** replace position arrays with in-register field finding.
- Keep the 64-byte comma, newline and quote masks of the current and next blocks. A line of about 77 bytes then fits a 128-bit window shifted to the line start.
- Peel the commas with trailing-zero counts.
- **Quote validity in one comparison.** For each field that starts with a quote, build the expected quote bits (its first and last byte). The line's quote mask must equal that expected mask, and field count = 7 must hold. Any mismatch sends the line to the existing scalar path, which is exact.
- **Length-dispatched decoders:**
  - IDs: canonical base 36 into a number (C1), or the 6-bit pack (Lane G).
  - Timestamps: F1 at length 20, F2 at length 25, F3 all digits, through the date cache.
  - Type: length plus one compare.
  - Product: a non-empty check, with a lookup only for purchases.
  - Price: only for purchases.
- Products and campaigns use direct tables when every catalogue ID is canonical (`p<n>`, `c_<n>`); otherwise the current map.
- Separate tight loops for event, click and link lines.
- Use runtime dispatch only. Never VBMI or VBMI2 (Cascade Lake lacks them).

**Measure with perf stat** (cycles, instructions, branch misses) on one quiet core, not only wall time. Our M2b/M2c comparison was lost in noise.

**Test:**
- a record-stream differential: the new decoder vs the scalar parser on every line of every corpus (generated seeds, fuzz rounds, fixtures);
- every byte value in every field position;
- plus the full gate.

### C3. Input lifecycle per chunk: map, populate, parse, unmap [ours 3.10, plus study T10]

**Gain:** 20M −0.01 to −0.04 s; 60M −0.05 to −0.2 s. **Risk:** low.

**Design:**
- Map each work chunk separately: page-aligned, with one page of overlap at the edges.
- Populate it in one call just before parsing: populate-read advice on Linux 5.14 or later, otherwise a populated mapping.
- The parsing thread unmaps it right after. This spreads the teardown, which at exit runs on one thread, across all threads during the parse.
- **Residency-sensing readahead.** At start, check about 64 sampled pages with mincore. If less than 90% is resident, issue will-need hints from a helper thread and oversubscribe I/O by one thread; otherwise skip the hints.
- Keep positional reads into a reused per-thread buffer as a runtime option.
- The probe chooses the default.
- **Measure the exit tail:** compare the last stderr stamp with the external wall clock at 60M. If it is over 20 ms, also release the large anonymous arenas from all threads before exit.

**Test:** output identical in every mode; RSS at 60M; local wall time A/B at 20M and 60M.

### C4. Runtime: pinned workers, spin-then-sleep waits, dependency-driven queue, streamed output [ours, plus study T9/T12]

**Gain:** 20M −0.03 s; 60M −0.05 to −0.15 s. **Risk:** low to medium (races).

**Design:**
- Pin each worker to one CPU from the affinity mask.
- Barriers spin about 200 µs, then fall back to a futex.
- **One job queue with dependency counters.** Link chunks and click chunks come first. Their per-block jobs (link resolution, click layout) become runnable as soon as their inputs are done, and run between event chunks.
- Chunk sizes shrink as the queue drains (remaining / (4 × threads), between 256 KB and 8 MB).
- Each thread writes Parquet row groups as its buffer fills, instead of all at the end.
- campaign_daily: the per-thread counters are summed by the last thread to finish.

**Test:** NCPU sweeps 1 to 16 with output equality; 200 repeated dev runs; and a stress mode with a forced tiny chunk size and forced queue orders.

### C5. Big-person tails in parallel [ours 3.9, plus a new design]

**Gain:** 60M 0 to −0.1 s, depending on the seed. **Risk:** medium.

**Design:**
- A person over 200k events (whales, shared-device persons, and the odd seed with a whale on a shared device) is split into time slices.
- One thread sessionizes each slice.
- A fix-up merges sessions across slice edges when the gap is 30 minutes or less.
- Credit and assists per session come from a binary search into the person's sorted clicks, so the slices stay independent.
- Large irregular persons are k-way merged from their already ordered sub-runs instead of being re-sorted.

**Test:** force a threshold of 1 so every person goes through slicing; this must MATCH on all seeds.

### C6. Smaller Parquet [study T11]

**Gain:** 20M −0.01 s; 60M −0.01 to −0.04 s. **Risk:** low to medium (readers).

**Design:**
- Dictionary per row group for user_id, with RLE indices (a person's days are adjacent).
- Bit-packed dictionaries for day, sessions and events.
- Within each row group, rows without purchases come first, so revenue becomes one constant run and top_category one all-null run.

**Test:** read back with polars, DuckDB and pyarrow; the kit's compare; the fixtures.

### C7. AVX-512 compare kernel, decided by the probe [ours 6.2]

**Gain:** 0 to −0.05 s. **Risk:** low with runtime dispatch.

**Design:** a 256-bit and a 512-bit mask-register variant of the block-mask step, chosen by probe timings on the real scorer CPU. Our sandbox is Ice Lake class and cannot show Cascade Lake downclocking.

**Expected end state if C1 to C4 land:** about 0.40 to 0.50 s at 20M, and about 1.0 to 1.4 s at 60M.
- **Beating 67 on stock data at 60M** also needs the C2 parser at no more than about 30 ns per line, and the whole pipeline at no more than about 45 ns per line. Treat that as the stretch goal.
- **We win outright** when the final data or the generator trips their whole-run fallback (section 4).

## 4. Where we can be faster than them at 60M

1. **Fallback per row, not per run.** They re-run everything on a scalar hash pipeline (several seconds at 60M, est.) for odd but legal data:
   - an ingest far from the window;
   - a window over 24 days;
   - non-canonical product or campaign IDs;
   - more than 31 categories;
   - user-day revenue over 32 bits;
   - more than 2% undecodable IDs;
   - buffer overflow.

   In our design each of these costs only the rows involved (C1, records of 24 bytes, Lane G).
2. **A changed generator.** If the organisers change the mix, alias slots, numbering or prefixes after the tie at the floor, they fall to the scalar pipeline. Our Lane G, sped up by C2 to C4, is our whole pipeline: about 1.5 to 2 s at 60M (est.) against their several seconds. This is why C2 to C4 come before polish, and why Lane G stays first-class.
3. **I/O.** They map the input with no populate and no readahead, or copy everything with positional reads. Our C3 batches the faults, overlaps the unmap with parsing, and senses a cold cache.
4. **Serial tails.** Their odd persons are sorted one shard per thread: est. 0.1 to 0.2 s on a seed where a whale uses a shared device. Our C5 slices them by time and merges instead of sorting.
5. **Barriers.** C4's dependency queue and streamed output remove most idle time at barriers. That idle time grows with the data.
6. **Build and hardware.** We pin the toolchain by digest and lock our crates; the final rebuild is reproducible. With runtime dispatch, a machine without AVX-512 does not crash us.

## 5. Submission plan (two slots an hour; one entry in the queue at a time)

**Rules for every slot:**
- Submit only a build that passed the section 6 gate.
- Change only `src/`. Keep the Dockerfile byte-identical to the build that scored 0.98 s, which is known to build on the scorer.
- Keep repo hygiene as set in OWNER_DECISIONS: branch `exp`, push only at submission, no comments or notes, no names of events, tracks or teams.

| When (UTC) | Slot | Content | Expected |
|---|---|---|---|
| Sat 21:00–22:00 | P1 (needs owner OK) | **Probe** [study T13], on a separate commit, never the final pick. It fails the dev check on purpose so the logs come back. It reports: CPU model and flags, kernel, THP mode, fault-around (minor faults when touching pages 4 KB apart), cgroup limits, `/data` filesystem and mincore residency, and the exit tail. It times rel1 at NCPU 8 vs 9, mapped vs populated vs positional reads, and AVX2 masks. If the owner agrees, it also generates 20M and 60M sets into `/scratch` with the official generator, fetched at build time from the public kit (do not commit it; licence unstated) and keeping the run under 90 s, and times one run of each. | best unchanged; measures F |
| Sun ~03:00 | S2 | **M3a** = C2 + C3 + C4 on today's architecture. Engineer B does C2 and engineer C does C3 and C4, in parallel with engineer A on C1. | 0.98 → ~0.70 s |
| Sun ~05:00 | S3 (optional) | **M3b-F1**: decoded identity and links only. Submit only if F2 is late. | ~0.65 s |
| Sun ~07:00 | S4 | **M3b** = Lane F complete (C1) | ~0.45–0.55 s |
| Sun ~07:30 | P2 (optional) | Probe 2: M3b at 60M on the scorer, auto vs forced Lane G. This confirms the final-scale time and the fallback cost. | measurement |
| Sun ~10:00 | S5 | **M3c** = C5 + C6 + C7 (chosen by the probe) | ~0.40–0.50 s |
| Sun 10:00–13:00 | S6–S9 | Reserve for fixes only. If M3b's gate is not green by 10:00, drop Lane F and ship M3a + C5/C6. | — |
| **Sun 13:00** | freeze | Clean clone, `--locked` build, full gate, 60M × 5 and 90M × 1 locally (RSS < 20 GB, time far under 180 s) | — |
| **by Sun 15:00** | final pick | Set it **explicitly**. Choose the fastest commit at 60M (local and probe numbers) among those that passed the whole gate, including the generator-variant suite. Not simply the best practice score: practice sits at a 0.30 floor with ±20% noise. Keep every submitted commit public; never force-push. | — |

## 6. Common gate (every submission)

1. Unit tests, including every SIMD or fast function against its scalar twin; clippy and fmt clean.
2. Fixtures 36/36, in each of: default, forced Lane G, and scalar kernels.
3. Dev MATCH at NCPU 1, 2, 3 and 8.
4. The differential against the Python reference:
   - seeds 2 to 30 plus 15, 62 and 272 (windows holding 2028-02-29);
   - 30k to 2M events, with click ratios 0.08 to 2.5.
5. Mutation fuzz, at least 40 rounds.
6. Lane differential: auto output equals forced-Lane-G output on the 20M and 60M sets, after sorting rows; the self-check sums agree.
7. **Generator-variant suite** (Lane F builds only). Make modified scratch copies of the kit generator, never shipped, with:
   - other multipliers;
   - 256 alias slots;
   - shuffled person numbers;
   - events numbered out of time order;
   - a 30-day window;
   - ingest 40 days after ts;
   - 40 categories;
   - non-canonical product and campaign IDs;
   - a whale on a shared device;
   - many upper-cased IDs.

   Each must MATCH the reference. Log which lane ran and the time.
8. **Wrong-key test.** Force wrong user and event keys: the output must still MATCH (this proves exactness does not depend on the keys). Record the slowdown.
9. Scale: 20M × 3 and 60M × 3 timings with phase timers; RSS; the share of rows in Lane G.
10. When the writer changes, read the Parquet back with polars, DuckDB and pyarrow.

## 7. Engineer assignments (parallel)

- **A: C1.** Decoding module, key recovery, links on bitmasks, then stage F1, then F2.
- **B: C2.** The parser, emitting both record types.
- **C: C3, C4 and the probe build, then C5.**
- **D (tests):** the reference, the generator-variant suite, the wrong-key and lane differentials, and the gate runner.

**Clean-room rules.** Only A to D write code. Nobody opens `study/ref_r67/`. Cite sources in the build log as kit, ours or this plan.
