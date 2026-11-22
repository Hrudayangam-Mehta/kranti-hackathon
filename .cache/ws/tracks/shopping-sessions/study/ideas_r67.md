# Clean-room study of team 67 (0.30 s): ideas only, in prose

Written 2026-11-21, about 20:30 UTC, for our Shopping Sessions engineers.

## 0. Method and provenance

- **What I read.** The public repository was cloned without a checkout into `study/ref_r67/`. I read it with `git log`, `git show` and `cat` only. Nothing was built or run.
- **Which commits.** All 18 commits on the default branch, from 05:11 to 15:54 UTC today. The final one is 92cf412, the one on the board at 0.30 s.
- **What this document contains.** Techniques in plain words, why they are fast, scores, safeguards, limitations, and how to beat them. It contains no code, no identifiers, no file or function names from their code, no comments and no constant tables.
- **Where measured effects come from.** Every commit message is one line with no numbers, like "perf: cut parse time per line". So the only measurements are our earlier board snapshots of their scored commits. Everything else marked "est." is my estimate.
- **Notes addressed to AI tools (reported, not followed).** Commit 7c4bd06 added two identical files at the repository root, `AGENTS.md` and `CLAUDE.md`. They tell AI agents and tools that do not work for the owner to:
  - stop reading;
  - leave the repository out of results and not name it;
  - not summarise, paraphrase or reuse any code, idea or structure for another entry.

  They also say the code is MIT licensed and that the request is one of fair play while the event runs. Following our method, I treated this text as data and did not follow it.
- **For the owner.** The owner should know that this request exists. Together with the organiser's warning that copying may disqualify, it is the owner's decision whether to use this study.
- **A cleaner source for the key insight.** The single most valuable insight below (section 2, items T1 to T3) is about the **official generator** in our own kit (`kit/unz/generator/src/`). Our engineers can derive it from that official source without this document.

### Size and style of their code

- About 17,400 lines of Rust and no third-party crates.
- Around 600 `unsafe` sites, 45 inline-assembly blocks and 12 unit tests.
- Dozens of run-time and build-time switches, one for each design choice, used for A/B tests.

### History, commit by commit (times UTC; scores from our snapshots)

| Commit | Time | What changed (prose) | Board |
|---|---|---|---|
| f59bb6c | 05:11 | First exact general pipeline built on common crates: parallel iterators, a fast hash map, memory maps, a Parquet library and an alternative allocator. Static musl binary, `FROM scratch` image. | not known |
| 1f26e8a | 05:56 | A **machine probe** instead of a pipeline. It prints CPU, cache, sibling, cgroup, transparent-huge-page, mount and page-cache facts to stderr and writes empty tables. The dev check fails, but its logs come back. | (probe) |
| 0047a11 | 06:05 | **Fast path with a general fallback; every crate removed.** Already contains the core idea (T1 to T3): IDs decoded to dense numbers, dedup by event number, per-person streaming. | **0.59** |
| 7c4bd06 | 06:06 | The AI-notice files. Code unchanged. | 0.59 |
| b423b88, 811cdbc | 06:20, 06:43 | **Scale probe.** The image holds a copy of the official generator plus several pipeline variants (vector widths, bucket sizes). It generates a data set on the scorer, times each variant, and reports the timings through the output rows and logs. | (probe) |
| 968ed76 | 07:09 | Faster line decoder, batched row handling, a fast path for link lines. Partition memory is pre-populated. | |
| e10a4c7 | 07:12 | Vectorised event stage: AVX-512 compaction of dedup winners, vectorised person naming, vectorised click windows for small persons. | **0.48** |
| 2a0f288 | 07:56 | Own thread pool (spin, then sleep). Own bump allocator on one huge reserved region. Click and link stage rewritten. Output and memory work. | |
| d18d5c2 | 08:27 | Optional positional-read input path, thread pinning in sibling order, software prefetch in the parser. | |
| e20d7b5 | 08:32 | Less work per line and per event. | **~0.36** |
| d5ed702 | 09:08 | Build flags: static relocation model, branches aligned within 32-byte boundaries, prefix padding. | |
| 2ff397d | 10:03 | A second probe. It measures page-cache residency of `/data`, mount info, cgroup limits and the clock source, and times variants on a generated 20M set. | (probe) |
| 7546ac1 | 11:39 | Session summaries for long boundary runs. Irregular persons computed while the output is written. Cooperative processing of large user blocks. Union-find runs alongside the event stage. Sorting networks for per-person clicks. An optional direct click-number index, which ships **disabled**. | |
| 21d36dc, 74cc1ac | 13:29, 14:57 | More per-line and per-event cuts, including a hand-written assembly loop for click lines. | |
| 6ab662a | 14:58 | Timing probe for several full candidate builds. | (probe) |
| 92cf412 | 15:54 | Smaller output, in fewer files: one user_daily file per thread, with many row groups appended. Within each group, no-purchase rows come first, so their revenue and top_category become one constant page and one all-null page. User-ID dictionary keys are run-length encoded, since a person's days are adjacent. Stale output files deleted first. Automatic choice between mapped and positional reads. | **0.30** |

**How the gains split** (board times, which carry the page's ±20% noise between machines):

- **Structural design: 0.59.** Removing all general hashing and reshuffling gave the first fast path its 0.59 s, at about 3.5x the speed of a typical general Rust pipeline.
- **Parser and vectorised event stage: -0.11 s** (0.59 to 0.48, -19%).
- **Own pool and allocator, pinning, positional reads, per-line cuts: -0.12 s** (0.48 to 0.36, -25%).
- **Summaries, overlap, assembly, I/O auto-choice, smaller output: -0.06 s** (0.36 to 0.30, -17%). 0.30 s is probably near the board floor, so the true gain may be larger.

---

## 1. Their pipeline, stage by stage

**Stage 0: setup.** Thread pool, lookup tables and key recovery.

1. Start a persistent pool of workers at once. The workers are spawned as a tree: each one starts two more.
2. Read the manifest with a targeted string search.
3. Load `products.csv` and `campaigns.csv` on a helper thread.
   - Products go into a direct table indexed by the product number; IDs must look like `p` followed by digits.
   - Campaigns go into a direct table indexed by the campaign number; IDs must look like `c_` followed by digits.
   - Category names are sorted byte-wise with `unknown` included, so a category's index order is its byte order.
4. List the input folders. Map every input file into **one reserved contiguous address range**, each at a 2 MB-aligned offset, largest file first.
5. **Recover the generator's secret user and event keys** from a sample of about 5,000 event lines (T1).
6. Size every buffer from the input byte counts.

**Stage 1: parse.** All threads take chunks from one shared queue: clicks first, then links, then events.

- **Chunk sizes shrink** as the queue drains: remaining bytes / (4 × threads), clamped between 256 KB and 8 MB.
- **Event lines.** Each line is decoded into a 16-byte record:
  - from the event ID's dense number: the low bits locate the record inside its bucket, and the bucket is a block of about 32 thousand consecutive event numbers;
  - from the user ID: the generator person number and alias number;
  - the time as a millisecond offset from the window start;
  - the ingest time in whole seconds;
  - for a valid purchase, the price and category;
  - a "this copy is invalid" marker.

  An invalid copy is still recorded, so it can win dedup.
- **Rows that do not decode.** Rows whose IDs are not in the generator's form (upper case, spaces, quotes inside, too long) go to small per-thread side lists of raw byte strings.
- **Click and link lines.** These go into a second partition stream keyed by **blocks of 4,096 generator persons**. Link lines whose two sides are aliases of the same generator person become tiny flagged records in that stream. Links across persons, or with raw IDs, go to a list for a general union-find.
- **Records are written through per-bucket 64-byte staging lines** with streaming stores into 4 KB chunks, and the chunks are chained into lists.
- **Consumed input ranges are released** as soon as they are parsed.
- **Threads that finish the click and link chunks start stage 2 work** between event chunks.

**Stage 2: links and clicks per block of persons.**

1. For each block of 4,096 persons, apply the same-person link records to a **two-byte status word per person**. The word holds a bitmask of which aliases are joined, plus flags.
2. A person whose links form more than one multi-alias group, or who has a link to another person or to a raw ID, is flagged **irregular**. All of its links go to the general union-find.
3. Count, prefix-sum and scatter that block's clicks into one global array laid out person by person.
4. Sort each person's clicks by time with size-classed sorting networks: 2 clicks, 3 to 8, 9 to 16, and larger. Equal timestamps are ordered by the byte order of their click IDs, so "the last click at or before the session start" is the correct one.
5. Blocks with very many clicks (those holding whale persons) are split across threads.
6. The general union-find over cross-person and raw links runs on one thread while the event stage proceeds.

**Stage 3: dedup and sessionise, by event bucket.**

1. **Scatter.** Each thread takes one bucket and scatters every thread's records for it into a **direct-addressed slot table**. The table has one slot per event number in the bucket, about 512 KB, small enough to stay in L2. Each slot carries a generation tag, so the table is never cleared. A record replaces the stored one only if its ingest is strictly smaller.
2. **Compact.** An AVX-512 compress keeps the winners that are valid. They are already in **event-number order, which is person order** (T2).
3. **Walk runs of equal person number** and sessionise each run directly. Each person's events are usually already in time order, so the code checks and sorts only if needed. The same walk produces:
   - the user_daily rows, with the person's name rebuilt from numbers (T3);
   - credit and assists against that person's sorted clicks;
   - campaign-by-day counters.
4. **Boundary runs.** The first and last run of each bucket may continue into its neighbours. They are saved: long ones as compact session summaries, short ones as raw records.
5. **Stitch.** A second pass joins the boundary runs per person, largest person first, and finishes them.
6. **Irregular persons** go to a separate path. That includes people on shared devices, people split by an upper-cased link side, and people whose events use aliases from different groups. Their records are collected, keyed by their union-find person, and routed to 64 shards.

**Stage 4/5: irregular persons and output, overlapped.**

- **Irregular persons.** One pool job resolves each irregular record to its true person. Then shards are processed largest first, with a comparison sort per shard and the same per-person routine.
- **Output in the same job.**
  - Threads write the user_daily rows already produced as many Parquet files from their own Parquet writer.
  - Campaign_daily is written as one small file per thread slice.
  - One thread unmaps the whole input region in parallel with this.
- **Exit.** The process exits immediately with no teardown. When huge pages are off, or there were many page faults, it first releases large memory regions in parallel, because kernel teardown of a big address space at exit runs on one thread and counts toward the container's time.

**Re-exec into the general pipeline.** More than 50 checks can trigger it, and so does a panic hook. The binary re-executes itself in "general" mode, which:

- reads everything again from scratch;
- uses ordinary hash maps and shards: parse, dedup and route, then sessions per shard, then write;
- deletes any partial output first.

---

## 2. Performance techniques, with effect

**T1. Inverting the generator's ID scrambling** (the decisive idea).

- **How the official generator builds IDs.** A user ID is `u` plus base 36 of a reversible 40-bit mix of the number `person × 512 + alias`, combined with a per-dataset secret key. Event IDs (`e`) and click IDs (`k`) mix their row number the same way, each with its own key. See the ID routine in the generator's text module and its use in the user module, in our kit.
- **The mix is reversible.** It is "multiply by an odd constant, XOR key, xorshift, multiply by another odd constant", all modulo 2^40. Undoing it needs two modular inverses and an inverse xorshift. The key enters only as an XOR, so after the inverse outer steps the key is one XOR away from a known-plaintext search.
- **User key: they guess one known plaintext.** In the generator's plan the whale persons have the lowest numbers, and half of each person's rows use alias 0. So the most frequent user IDs in a sample are likely alias 0 of persons 0 to 63. For each of the top 16 frequent IDs and each of 64 person guesses, they compute the key candidate. They accept a candidate only if every distinct sampled user ID decodes to a plausible person number or a shared-device number, and only if the key is unique.
- **Event key.** They take sampled rows of person 0 and assume the earliest ones have small row numbers. They search up to about 2^27 candidates in blocks of 16 and verify on all sampled IDs, allowing 1 in 1,000 misses.
- **Click key.** A click-key search also exists, but only the disabled click-number index uses it. In the shipped build, click IDs are only base-36 decoded, kept as packed numbers for tie-breaks, and not unscrambled.
- **Effect.** Every common ID becomes a small dense integer without any hashing:
  - person number and alias from the user ID;
  - row number from the event ID.

  Estimated effect: in our own milestone-1 phase timings, hash dedup plus person lookups were 6.2 s of 16.7 s (37%). In their design that step is a cache-resident direct-address pass.

**T2. The generator numbers events person by person, in time order** (same plan module in our kit).

- **Consecutive numbers.** Each person gets a consecutive range of event numbers and a consecutive range of click numbers, in person order.
- **Time order within a person.** A person's events are generated in time order. Duplicates share the number of their original.
- **So one partition by event number does three jobs at once:**
  - it is the dedup partition, because copies of an event land in the same slot;
  - it is the person grouping, because each person is a contiguous run;
  - it is almost the time sort.
- **Effect.** It removes our entire second shuffle (partition by person) and most of our sorting. Persons crossing a bucket boundary are the only stitching work.
- **Check.** An ownership bitmap verifies that each person appears in at most one run. Est.: one full pass over the records (at 60M about 1 GB written and read again) is avoided.

**T3. Names without strings.**

- **Simple persons.** The output name of a simple person (one alias group) is the byte-wise smallest of its aliases' ID strings. They compute it by re-scrambling each alias number in the group and base-36 encoding it into an integer that is **left-aligned and big-endian**, so integer comparison equals byte comparison. Then they take the minimum, for up to 14 aliases, vectorised.
- **Click ties.** The same packed form orders click IDs when timestamps tie.
- **Effect.** No ID string is stored for about 99% of persons (est.).

**T4. Link handling on bitmasks instead of a full union-find.**

- **Same-person links.** About 99% of link lines (est.) join aliases of the same generator person. Each such line sets bits in that person's two-byte word. Lines that would join two separate groups are deferred and re-applied until nothing changes. Whatever is still unconnected marks the person irregular.
- **Everything else** goes to the general union-find (hash map with byte-checked keys and path compression), on one thread, overlapped with the event stage.
- **Effect.** The links stage becomes trivial. Ours was 1.1 s of 16.7 s at milestone 1.

**T5. A table-driven line parser on AVX-512.**

- **Finding the fields.** For each line, three vector compares over a 96-byte window give the comma and newline masks. Bit tricks (trailing and leading zero counts) find the six commas.
- **Decoding IDs and the product.** The length of each field, and whether it is quoted, index a precomputed shape row. The row holds a byte-shuffle control that drops the base-36 digits into fixed lanes and checks the prefix character. That decodes event, user and product IDs with no loops.
- **Dates.** Timestamps use a small **per-thread date cache**, keyed by the two day-of-month digits and verified against the full 12-byte date prefix. A slot is replaced after three misses. A cache hit gives the day's epoch milliseconds directly, and the time of day is read with fixed-position arithmetic. F3 numbers and offsets have their own paths.
- **Software pipelining.** The masks for the next two lines are computed while the current line is decoded, with a prefetch about 1 KB ahead.
- **Bail-out and the assembly loop.** Any line whose shape is not the common fast shape goes to a scalar slow parser. Cold calls preserve the mask registers through a small trampoline written in assembly. The main click loop is hand-written assembly, with the same shape bail-out.
- **Batching.** Records are handed on in batches of 64 rows, with the vector checks done per batch.
- **Effect:** the 0.59 to 0.48 to 0.36 steps were mostly here.

**T6. Write-combining partition sinks.** One staging cache line per bucket holds 4 records. Full lines are streamed with non-temporal stores into 4 KB chunks chained by a pointer in their last 64 bytes. The 2 MB blocks behind the chunks are pre-faulted with populate-write advice. Our M2i step is the same idea, and it gained 0.1 to 0.3 s there on 2 cores.

**T7. Vectorised stage-3 kernels.**

- AVX-512 compaction of dedup winners.
- A gap test over 8 events at a time, with a scalar path only at session breaks and purchases.
- Click windows for small persons done on 16 sessions at once, with counters added from one-hot day vectors.
- **Assists for big persons** (sessions × clicks over 4,096): the clicks of each campaign are merged into a union of 7-day intervals. Each interval then counts the sessions it covers per day, using binary search over the session starts and per-day start indexes. Cost: O(clicks + intervals × log sessions).

**T8. Long boundary runs become session summaries.** A whale spans many buckets (est. 20 to 40 buckets at 60M). The middle parts are stored as lists of sessions with counts and purchases rather than raw events, so stitching handles sessions, not events.

**T9. Own runtime.**

- **Thread pool.** Workers spin on a generation counter, timed with the TSC, for about 400 µs before sleeping on a futex. Pool calls therefore cost microseconds, not thread spawns. Threads are pinned to CPUs in an order that keeps hyperthread siblings adjacent.
- **Global allocator.** A 64 GB reserved, non-committed, huge-page-advised region. Threads carve private 4 MB chunks from it, and each thread has a free list per power-of-two size class.
- **Fixed-size buffers.** Every large table is a fixed-capacity buffer sized from the input bytes. Overflowing one triggers the re-exec, not a reallocation.

**T10. I/O choices.**

- **Default: map the files and parse in place.** Consumed ranges are dropped with don't-need advice, and the input mapping is unmapped in parallel with output writing.
- **Final commit: an automatic switch.** It touches two pages 4 KB apart in the largest file and counts the minor faults. If each page faulted separately (no fault-around), every thread switches to positional reads into its own 128 KB buffer.
- **Readahead.** No readahead hints are used anywhere.

**T11. Output.**

- **Own Parquet writer.** Uncompressed. Small-range integer columns (day, sessions, and events when it pays) get a "dense dictionary": every value from min to max, then bit-packed indices, with no hashing. This has been there since the first fast path.
- **User IDs.** Dictionary-encoded per row range. In the final commit the keys are also run-length encoded, because a person's days are adjacent.
- **Rows grouped by purchase** (final commit). Within groups of 4,096 rows, rows with no purchase are moved ahead of rows with purchases. Revenue then starts with a constant zero run and top_category with an all-null run, each written as one cheap page. Row order is free by the rules.
- **Files** (final commit). One user_daily file per thread, with row groups appended, and one small campaign_daily file per thread slice.
- **Effect:** part of the final 0.36 to 0.30 step.

**T12. Overlap.** Each stage's tail overlaps with work from the next stage:

- link and click jobs run between event chunks;
- the union-find runs during the event stage;
- irregular persons are processed during output writing;
- the input is unmapped during output writing.

**T13. Measuring on the scorer** (methodology). Four probe submissions turned the dev check's "differing rows plus logs" reply into a measurement channel:

- machine facts;
- page-cache residency;
- fault behaviour;
- variant timings on data generated inside the container by a copy of the official generator.

Each probe costs one of the 2 submissions per hour.

---

## 3. Correctness safeguards

- **Re-exec on any surprise.** More than 50 checks lead to the general pipeline, including a panic hook. They cover:
  - key recovery not unique, or failing verification;
  - lookup files not canonical, or more than 31 categories;
  - a window over 24 days;
  - an ingest time outside the packed range;
  - a person found in two runs;
  - a buffer full;
  - partition counts not adding up;
  - more than 2% of events not decodable;
  - a hash collision between raw IDs, detected by comparing bytes;
  - output counts over 32 bits.
- **The decoding is bijective.**
  - Base-36 decoding rejects leading zeros, upper case, more than 8 digits and values of 2^40 or more, so two different strings never decode to the same number.
  - Rebuilding a string from its number gives back the original string exactly.
  - An ID string the generator did not make, but which happens to decode, keeps its identity: it is just a person or alias that no link joins.
- **Dedup before validation.** Every parsed copy is kept with its own verdict. Dedup picks the smallest ingest. An invalid winner removes the event.
- **Click duplicates are left in.** The rules guarantee identical values, so a duplicate cannot change the credit, and assists count distinct campaigns. This is the same reasoning as ours.
- **Self-check mode.** The session and revenue sums must match between the two tables, and assists must be at least the credited non-organic sessions. It is off in production.
- **Unit tests.** They compare the vector kernels with scalar reference parsers, test SWAR base-36 decoding exhaustively over all 2-byte inputs and selected 3- and 8-byte inputs, check that random IDs yield no key, test timestamps, and self-test the name builder.
- **Output.** Stale `*.parquet` files are deleted before writing, so a re-exec after a partial write is safe.
- **In my reading, no defect.** Several rules are handled correctly, from what I read:
  - the strict "greater" test for top category;
  - an inclusive 7-day window at both ends;
  - "an ingest before ts is kept", via a signed difference;
  - equal timestamps sharing a session, via a zero gap.

  I could not run anything.

---

## 4. Build, image and runtime tuning

- **Rust release profile:** opt level 3, fat LTO, one codegen unit, abort on panic, no debug info. No dependencies, so the lockfile lists only the package.
- **Target.** A static musl binary compiled for `target-cpu=cascadelake`. AVX-512 BW and VL, BMI2 and LZCNT are required at compile time.
- **Code layout.** Static relocation model (no PIE), and branches kept inside 32-byte boundaries with prefix padding. That works around the Skylake-family jump erratum.
- **Image.** A multi-stage build on an **unpinned** floating Rust Alpine tag. The final image is `FROM scratch` with only the binary, user 1000 and no environment settings.
- **Run time.**
  - Thread count from `NCPU`, capped at 16.
  - The pool starts first thing in the process, and threads are pinned in sibling order during parsing.
  - The file-descriptor limit is checked, and all input files are kept open for positional reads.
  - Huge-page advice is used on anonymous memory, and the mapped-or-read choice is made at run time.
  - The process exits without destructors.

---

## 5. Limitations and fragile points

**At 60M rows with 8 cores (assuming the same generator):**

- **Estimated final time: about 0.6 to 0.9 s.** The fixed overhead (container start, setup, roughly 0.1 to 0.15 s est.) stays the same and the rest scales roughly linearly. The work per row is already tiny, so they have little left to gain except in I/O.
- **I/O cost.** Positional reads copy all 5.5 GB through the CPU. Mapped mode instead takes on the order of a million 4 KB page faults. Neither path uses readahead or batch-populate.
- **Phase barriers.** The parse, link/click, event and output phases are separated by barriers. The parse cannot end before every file is read, because rows are shuffled across files. Idle time at those barriers grows with the data.
- **Irregular persons.** They go through comparison sorts per shard, one thread per shard. At 60M a shared-device person merges thousands of people (est. 50k to 300k events). On the occasional seed where a whale uses a shared device, one shard holds over a million events. Est.: a serial tail of 0.1 to 0.2 s.
- **Buffer sizing.** Every buffer is sized from bytes. For example, event-number capacity is input bytes / 64, against an average line of about 77 bytes. A seed with much shorter lines would overflow and re-exec.

**On unusual but legal data, there are whole-run re-execs, not per-row handling.** All of the cases below are correct but slow, because everything is re-read and run through a scalar hash pipeline (est. several seconds at 60M). None would hit the 180 s cap.

- An `ingest_ts` more than 1 day before the window, or more than about 23 days after its start. This is legal, since `ingest_ts` can be any valid F1.
- A window over 24 days. The rules only say "different for every dataset".
- Product IDs not of the form "p plus canonical digits", more than about 131 thousand products, or more than 31 categories.
- Campaign IDs not of the form "c_ plus canonical digits", campaign numbers of 16,384 or more, or more than 250 channels.
- A single user-day whose revenue does not fit in 32 bits.
- More than 2% of event IDs not decodable.
- More than about 4 million non-decodable user rows per thread.

**Depends on the generator's internals (the biggest risk):**

- **What it relies on.** The scramble constants, the 512 alias slots per person, the shared-device number base, the `u`/`e`/`k` prefixes, base 36 in lower case, whales numbered first, consecutive numbering per person, and time-ordered generation.
- **What happens if the organisers change any of it for the final.** For example, after seeing an eight-way tie at a floor.
  - Key recovery fails at setup. That costs little, but every run then takes the general path.
  - If only the numbering order changes, the "person in two runs" check fires after parsing. That wastes the whole fast pass first.

**Build risk.** The floating Rust base tag means the final rebuild may use a newer compiler than the one they tested. They use recent features (naked functions, a cold-path hint, inline assembly with mask registers), so a breaking change or a change in codegen is possible but unlikely.

**Hardware risk.** AVX-512 is compiled into the whole binary, including the fallback. A final machine without it would crash with an illegal instruction and get no score. The track promises AVX-512, so this risk is low.

**Noise sensitivity.** The spin-waiting pool and the pinning help on an idle machine, like the final retiming. They cost cycles if anything else shares the CPUs.

---

## 6. How a different implementation could beat it

**Priority 1: rebuild the structural shortcut ourselves, from the official generator source in our kit, and make it fail softly.**

- **Our own decoder and key recovery.** Write a decoder and key recovery for user, event and click IDs from the generator's ID routine and numbering plan. Verify a key on more than one property:
  - all sampled user IDs decode to plausible person and alias numbers;
  - **both sides of sampled link lines decode to the same person**;
  - sampled event numbers fall in a dense range.
- **Per-row fallback, not per-run.** Our existing general fast path (0.98 s at practice) handles only the rows and persons that do not decode or do not fit, inside the same process. An odd ingest time, an extra category or a strange window then costs microseconds, not a full re-run.
- **Detect a changed numbering early.** Check run contiguity per bucket while parsing, rather than after it.
- **Est. gain:** most of the 0.98 to 0.30 gap at practice, because it removes the hash dedup, the person lookups and the second shuffle.

**Priority 2: keep the general path first-class as insurance.**

- If the final generator differs in any of the internals listed in section 5, they fall to a scalar hash pipeline, and we would win by seconds.
- Our general path should keep its current speed. Never let the new path slow it down.

**Priority 3: beat them on I/O at 60M**, where 5.5 GB makes this the largest remaining cost.

1. Use one probe submission to measure the kernel version, fault-around behaviour and page-cache residency of `/data` on the scorer.
2. Then compare three options:
   - **batch population** of each chunk's mapping: populate-read advice (Linux 5.14 or later), or a populated private mapping per chunk, done by each worker just ahead of parsing;
   - positional reads into L2-sized buffers, issued one chunk ahead;
   - plain mapping with readahead advice.
3. Choose at run time, as they do, but among more options.

Est. at 60M: 50 to 100 ms of 8-core wall time is at stake between the best and worst of these.

**Priority 4: remove their tails.**

- **Stream user_daily during the event stage.** Write a bucket's interior persons as soon as that bucket is done. Only boundary persons wait for the stitch.
- **Merge, don't sort, irregular persons.** Each generator person's events are already time-ordered, so a shared-device person can be built by a k-way merge of its sub-persons. Split the merge across threads when it is large, instead of running a comparison sort on one thread.
- **Release memory in parallel before exit, and skip destructors.** We already exit without teardown. We should check whether releasing memory in parallel first pays at 60M on the scorer.

**Priority 5: parser.** Their parser is near the limit; only consider this once priorities 1 to 4 are done.

- **Where they could still be beaten.** Each 77-byte line costs a 96-byte overlapping window (about 1.25× load amplification). A simdjson-style structural index (one compare per 64-byte block, then field extraction from bitmaps) might avoid that. So might a dedicated path for view and cart lines, which are 97% of lines and need no price or category.
- **What we already match.** Our date cache, SWAR time parsing and two-stage scanner are of the same kind.

**Priority 6: build hygiene they lack.** We pin the toolchain and base image by digest, and every crate in our lockfile is at least 14 days old. Their floating base tag is a rebuild risk at the cutoff; ours is not.

**Bottom line.** Their 3x lead over us comes almost entirely from T1 and T2, which exploit the public generator's ID scheme and numbering. The parser, runtime and I/O tuning account for the last 0.3 s. To beat them, we need:

- the same structural facts, re-derived from our kit and verified at run time;
- a soft, per-row fallback onto our already fast general path;
- better I/O at 60M;
- no serial tails.

If the final generator changes, our general path alone should beat their fallback.
