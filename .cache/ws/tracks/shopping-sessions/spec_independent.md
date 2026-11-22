# Shopping Sessions: independent design specification

Written 2026-11-21, about 17:30 UTC. Submissions close 2026-11-22 16:00 UTC.

## 0. Scope and provenance (read first)

This is **not** the study of team 67 that the task asked for. I did not clone, open or read their repository (`jason-scheffel/express-lane`), and I did not read our notes about them (`mechbot/notes/team67.md`). I stopped for three reasons:

1. At 17:08 UTC a staff organizer wrote in the track chat: "Teams that copy other teams may be disqualified", and said the rules would be updated to make this clearer.
2. Our recon (`README_track.md`, sections 4 and 6.7) recommends against any study of another team's code, "clean-room" or not, and asks the owner to decide. The owner has not answered yet. `OWNER_DECISIONS.md` only says "never copy team 67's code", and that was written before the warning was raised with them.
3. Participant chat (unverified) says team 67's repository has a file asking others not to copy it.

A clean-room process protects against copyright claims. It does not make deriving our entry from a rival's work acceptable under a competition rule against copying. Once our implementer has their ideas, we cannot remove them again. So I am leaving the decision with the owner, and ideally the organizers.

**Sources for this document:** only `kit/rules.md` (the authority), the official kit (the starter READMEs, the fixture list, the generator README section of rules.md), measurements on our own seed-1 dev set, and general engineering. It contains no other team's ideas. Section numbers follow the requested outline, with one change: sections 2 to 4 describe **our** proposed pipeline, not theirs. All timings are back-of-envelope **estimates**, not measurements. The implementer must replace them with numbers from phase timers.

Measured on the seed-1 dev set (1M events):
- Event lines average 77 bytes.
- The type mix is 87% views, 10% carts and 3% purchases.
- There are 20 categories and 2,000 campaigns.
- About 0.01% of event IDs and link sides fall outside a "10 characters of `[0-9A-Za-z_]`" alphabet.
- 181 of the 117,038 answer rows have an upper-case person name.

---

## 1. Problem decomposition

Everything the output needs splits into six sub-problems. Only two of them need data grouped across all files.

| # | Sub-problem | Data needed | Global grouping |
|---|---|---|---|
| A | CSV dialect plus field validation | one line at a time | none |
| B | Identity: links into persons, named by the byte-wise smallest ID | all link lines (about 1% of the bytes) | by ID (union-find) |
| C | Event dedup: keep the copy with the smallest `ingest_ts` | every well-formed event line with a non-empty `event_id` | **by event_id** |
| D | Sessionization per person | surviving events | **by person, sorted by ts** |
| E | Attribution and assists per session | valid clicks of the same person | by person (same grouping as D) |
| F | Aggregation into the two tables | per-session results | (person, day) falls out of D's order. (campaign, day) is small and dense |

The two global groupings (C by event_id, D/E by person) are the main structural cost.

Three facts make the rest cheap:
- **Validation depends only on the copy itself.** Every rule in events step 3 (validate) and step 4 (late) reads only that copy's fields. So each copy's verdict can be computed while parsing, and dedup only has to pick the winning copy. "Dedup before validation" then means: an event survives only if it is the smallest-ingest copy **and** its own verdict is valid. Invalid copies still take part in dedup; they can win and so kill a valid later copy (fixture E5).
- **Click dedup is unnecessary.** The rules guarantee that copies of a click have identical values: same user, so same person; same ts; same campaign. A duplicate cannot change which campaign is credited (the same campaign wins either way), and assists count distinct campaigns. So duplicates can stay. The implementer must record this reasoning in a test that feeds duplicated clicks.
- **Categories matter only for purchases.** `top_category` sums purchase prices, so views and carts need only "is `product_id` non-empty", with no product lookup. Prices are likewise read only for purchases. That removes 97% of product lookups and price parses.

Sizes to plan for:
- **Practice:** about 20M event lines, about 1.6 GB of events and 1.8 GB in total.
- **Final:** about 60M event lines and 5.5 GB.
- **Persons:** about E/30, so about 0.7M at practice and 2M at the final. Distinct IDs are about twice that.
- **Linked IDs:** about 1M at practice and 3M at the final.
- **Skew:** 5 whale persons hold 1 to 2% of all events each. The 3 to 6 shared-device persons each merge hundreds to thousands of people.
- **Outputs:** user_daily is about 2.3M rows at practice and 7M at the final. campaign_daily is at most (campaigns + 1) × (window days + 1), which is about 30k rows.

---

## 2. Our pipeline, stage by stage

One native, statically linked binary. It uses `NCPU` worker threads, 8 on the scorer, and runs in five phases. Every parallel phase hands out work units through one shared atomic counter, so threads that finish early take the next unit.

**Phase 0: setup (single thread, about 1 to 3 ms)**
- Read `manifest.json`. A targeted parse of the two F1 strings, tolerant of whitespace, is enough.
- Compute three windows in milliseconds: the event window, the click window (start minus 7 days), and the day range, which is floor(ms / 86,400,000) of the event window's start and of its end minus 1.
- Read `campaigns.csv`. Give each campaign a dense index, and reserve one more index for `organic`.
- Read `products.csv`. Map each product key to a category index. Sort the category names byte-wise, with `unknown` included, so the category index order is the byte order. A top-category tie then goes to the smallest index.
- List the three input folders, take every `*.csv`, and get their sizes.
- Cut the files into byte ranges of about 4 to 8 MB. A range's real start is the byte after the first newline at or after its nominal start; for a file's first range, that skips the header line. Its real end is the first newline at or after its nominal end. The last line of a file may lack a trailing newline: treat end of file as end of line (see 4.1).
- Order the work queue: all link ranges, then all event ranges, then all click ranges.
- From the total bytes, estimate the record counts, at about 77 bytes per event line, and pick the partition counts (section 3.4).
- Issue read-ahead hints for every file, so a cold cache starts reading at once.

**Phase 1: parse (all threads)**
- **Link ranges.** Split each line, apply the dialect, and drop malformed lines and lines with an empty side. Encode both IDs as keys (section 3.1) and append the pair to a thread-local list.
- **Union-find.** The thread that finishes the last link range builds it while the other threads go on to events:
  - Intern each endpoint key into one hash table that maps key to slot.
  - Union with path halving.
  - Keep, at each root, the smallest member key. Compare keys with the key comparator (section 3.1).
  - Overwrite each table slot's value with its person name key.
  - Publish the table with a release flag.
- **Event ranges.** For every line:
  1. Split it and check the field count and quotes. Drop the line if it is malformed or its `event_id` is empty.
  2. Encode `event_id` and `user_id` as keys.
  3. Parse `ingest_ts` (F1) and `ts` (F1/F2/F3).
  4. Compute the copy's verdict: user non-empty, `ts` valid and in the window, type exact, `product_id` non-empty, a valid price for a purchase, and not late.
  5. For a valid purchase only, look up the category and read the price.
  6. Write a 32-byte record into the thread's buffer for partition P1 = mix(event key) mod P1. The record holds: event key, user key, `ingest`, `ts` as a 32-bit offset from the window start, and a 32-bit payload (valid bit, 7-bit category, 24-bit price).
- **Click ranges.** These need the person table. It is normally ready long before events finish; if it is not, the thread waits on the flag. For every line:
  1. Split, check the dialect, and drop the line if malformed or if `click_id` is empty.
  2. Validate: user non-empty, `ts` in the click window, campaign known.
  3. Map the user key to a person key: look it up in the link table, and if it is absent, the person is the user itself.
  4. Write a 24-byte record into partition P2 = mix(person key) mod P2. The record holds: person key, click key, `ts` as an offset from the click window start, and the campaign index.

**Phase 2: dedup, then route by person (all threads, one P1 partition per work unit)**
- Gather the partition's segments from every thread's buffers.
- Build a small open-addressing table for the partition (twice the record count, fitting in L2) that maps the event key to the best record seen. A record replaces the stored one only if its `ingest` is strictly smaller. Equal ingest means identical copies, so keep either.
- For each winner whose valid bit is set:
  - Look up its user key in the global person table (batched, with software prefetch; section 3.6).
  - Write a 16-byte record into the thread's buffer for partition P2 of that person: person key, `ts` offset, payload.
- Winners that are invalid, and every loser, simply vanish.

**Phase 3: per-person work (all threads, one P2 partition per work unit, largest first)**

Partition sizes are known from the buffer counts, so schedule the largest first. That keeps the whale partitions off the end of the run.

1. Gather the partition's event and click segments.
2. Give each person in the partition a local index, using a small table from person key to local index. Count events per local index, take prefix sums, and place the records (a counting sort). Then sort each person's slice by `ts`: insertion sort for short slices, radix sort on the 32-bit offset for long ones such as whales.
3. Map the clicks through the same local table. Skip clicks whose person has no surviving event, since they can credit nothing. Place the clicks per person, and sort each slice by `ts` ascending, then click key descending. The last click at or before a session start is then the latest one, with the smallest click_id on a tie.
4. **Sessionize** each person's sorted events. A session starts at the first event and whenever the gap from the previous event exceeds 1,800,000 ms. Equal timestamps have gap 0, so they join automatically. For each session, record:
   - the start;
   - the day, which is floor(start / 86,400,000): exactly the Parquet DATE value, days since 1970-01-01;
   - the event count;
   - the revenue;
   - whether it has a purchase;
   - its per-category purchase sums. These go into a small per-(person, day) array indexed by category, with a list of touched categories so it can be reset cheaply.
5. **Attribute** with one forward sweep over the person's sessions, which are already in start order. Keep two indices into the sorted clicks, plus a count per campaign and a list of the campaigns active in the window `[start − 7 days, start]`.
   - For each session, move the upper index past every click at or before the start, and move the lower index past every click more than 7 days before the start. Update the counts and the active list as clicks enter and leave the window. Removal swaps the leaving campaign with the last entry, so it is O(1).
   - **Credit:** if the window is non-empty, the click just below the upper index is credited. Otherwise the session goes to `organic`.
   - **Assists:** every campaign in the active list assists the session once, including the credited one. Add 1 to its count for (campaign, session day).
   - **Cost:** O(clicks + Σ active campaigns per session). It is linear in the clicks even for whales, because each click enters and leaves the window once.
6. **Accumulate campaign_daily** in a thread-local dense array indexed by (campaign index, day offset), with four counters each: sessions, purchasing sessions, revenue and assisted. That is about 1 MB per thread and needs no hash map.
7. **Emit user_daily** for each person: consecutive sessions on the same day form one row. The row holds:
   - the person name;
   - the day;
   - the number of sessions;
   - the sum of events;
   - the sum of revenue;
   - the top category, which is the highest summed purchase price with the smallest index on a tie, or null if there are no purchases. Purchases always have a price of 1 or more, so "revenue > 0" means "has a purchase".

   Write the rows into thread-local column buffers. Decode the name from the key (section 3.1).

**Phase 4: write and exit**
- Each thread writes its user_daily buffer as one Parquet file. They are written in parallel, because file count does not matter.
- One thread sums the per-thread campaign arrays and writes one campaign_daily file. It holds the rows where credited sessions > 0 or assisted > 0. The `organic` row has channel `organic` and assisted 0.
- Column types: `day` is INT32 with the DATE logical type. Counts are INT64, or INT32 where safe. Revenue is INT64, because a whale's person-day can pass 2^31. Strings are BYTE_ARRAY with the STRING logical type, and `top_category` is optional.
- Encoding is PLAIN, uncompressed, with no dictionary and no statistics.
- Print the self-check sums to stderr.
- Leave the process immediately, without freeing arenas or unmapping files.

---

## 3. Performance techniques, with estimated effect

The estimates are for practice scale (about 1.8 GB) on 8 vCPU, which is 4 cores with hyperthreading. They are rough; measure every one.

**Estimated budget for the v1 design:**

| Phase | Estimate | Notes |
|---|---|---|
| Process start, setup | 2–3 ms | Static binary, no runtime start-up |
| Links parse | ~2 ms wall | Union-find build (30–80 ms on one thread) overlaps with event parsing |
| Events parse + scatter | 130–200 ms | Dominant: 1.6 GB at 1–1.5 GB/s per hyperthread |
| Clicks parse + scatter | 20–30 ms | About 240 MB |
| Dedup + person lookup + route | 30–40 ms | 20M × 32 B read, 18.5M × 16 B written, 18.5M random lookups |
| Per-person work | 20–40 ms | Counting sorts, sweeps |
| Parquet write | 5–15 ms | About 2.3M rows, 8 files in parallel |
| Exit / teardown | ~5 ms | Proportional to memory touched |
| **Total** | **~0.3–0.45 s** | The board's top four are at 0.30–0.31 s; baseline 172 s |

The techniques, roughly in order of impact:

**3.1 Eight-byte, order-preserving ID keys (large: halves record sizes).**
- **The fast path.** An ID of at most 10 characters, all from `[0-9A-Za-z_]`, is packed 6 bits per character into the low 60 bits of a 64-bit integer.
  - Codes 1 to 63 follow ASCII order, and 0 means "past the end". The first character goes in the highest-order position.
  - Comparing two such keys as integers then gives exactly the byte-wise order of the strings: a shorter prefix pads with 0, which sorts below every character.
  - The key decodes back to bytes with shifts.
  - This covers every generated event, click, user, product and campaign ID, including upper-case variants and `c_123`.
- **Everything else goes to a global "exotic" table.** That means spaces, `\r`, tabs, non-ASCII, `-`, quotes cannot occur, and anything longer than 10 characters.
  - The table is sharded and locked per shard, and holds the full bytes.
  - An exotic key is the top bit plus the table index.
  - The same bytes always get the same key, so equality stays exact.
  - Ordering against exotic keys (needed only for person naming and click tie-breaks) decodes both sides and compares the bytes.
- **Effect.** At about 0.01% of IDs, exotic lookups are negligible. Against 16-byte keys, records shrink from 48 to 32 bytes in phase 1 and from 24 to 16 in phase 2: roughly a third less memory traffic and first-touch. My estimate is 10–15% of the total.
- **Risk.** If a dataset used a different alphabet, the program would stay correct but slow down sharply. The final uses the same generator, so this is acceptable. Log the exotic count to stderr.

**3.2 A SIMD structural scanner (largest single item: parsing is more than half the run).**
- Process input in 64-byte blocks. With AVX2, use two 32-byte compares per character class; build bitmasks of commas, quotes and newlines; then walk the field boundaries with trailing-zero counts. One mask lookup replaces a branch per byte.
- **Quote check per field.** A field is quoted if its first and last bytes are quotes, its length is at least 2, and the quote bitmask has exactly two bits in its range. A quote anywhere else makes the line malformed.
- **Field count.** Check it with a popcount of the commas before the line's newline.
- AVX-512BW is available on the scorer, and on this sandbox. Use it only behind runtime feature detection. Cascade Lake lowers its clock under 512-bit work, so benchmark it against AVX2 before choosing.
- Estimate: 1.5–2× parse throughput over a byte-at-a-time loop.

**3.3 Fixed-width timestamp parsing (medium).**
- **Dispatch on the shape of the field:**
  - length 20 with a `-` at position 4: F1;
  - length 25 with `+` or `-` at position 19 and `:` at position 22: F2;
  - all ASCII digits: F3;
  - anything else is bad.
- **Digit groups.** Parse them with SWAR: load 8 bytes, subtract `'0'`, check every byte is 0 to 9 with one mask test, then combine pairs and quads by multiply-and-shift.
- **Dates.** Validate and convert with a small table built at start-up. It covers each (year, month) from the year before the window to the year after, and gives days before the month plus month length, leap years included. A year outside the table is outside every window, even after a ±24 h offset, so it is simply "bad".
- **F3.** Skip leading zeros, then accumulate digits. As soon as the value passes the window end, the timestamp is bad. A non-digit is also bad, so stopping early is safe.
- Estimate: 10–20% of parse time against general-purpose date parsing.

**3.4 Radix partitioning with thread-local buffers and software write-combining (medium).**
- Each thread writes to its own buffer per partition, so there are no atomics or locks.
- **Partition counts** are powers of two, chosen from the input size so an average partition of the next phase fits in about half an L2 (about 256–512 KB). At practice scale that is about 2,048 P1 partitions and 1,024 P2 partitions; at the final it is about 3× more.
- **Buffers** are chains of fixed blocks taken from a per-thread arena, so nothing is ever copied on growth.
- **Write-combining.** Stage writes in a 64-byte slot per partition, then flush each full slot with streaming (non-temporal) stores. This is the classic radix-partition trick.
- Estimate: 20–40% off the scatter cost, about 5% of the total.

**3.5 Lazy field work (medium, free).**
- Product lookup and price parsing only for purchases (section 1).
- `event_type` is decided by length plus a 4- or 8-byte compare.
- Clicks of persons with no surviving event are skipped in phase 3.
- No click dedup at all.
- Estimate: 5–10% of event parse time.

**3.6 Batched, prefetched hash lookups (medium).**
- The global person table holds about 1M linked IDs at practice and 3M at the final. Lookups into it are random DRAM accesses, and they come from phase 2 (every surviving event) and from click parsing.
- Process them in groups of 16 to 32: compute every slot address, issue prefetches, then probe. Use open addressing with linear probing, 16-byte slots (key and person key) and a load factor of at most 0.5.
- Estimate: 3–5× faster than unbatched lookups, which brings phase 2 from about 100 ms to 30–40 ms at practice scale.

**3.7 Memory first-touch control (medium at the final).**
- Faulting in fresh anonymous memory costs roughly 0.1 s of CPU per GB with 4 KB pages, and less with 2 MB pages.
- Allocate a few large arenas once, aligned to 2 MB, and mark them for transparent huge pages. This sandbox runs THP in "madvise" mode; the scorer's mode is unknown, and the hint is harmless either way.
- Fault the arenas in from all threads, in a window where threads are otherwise idle. Never reallocate.
- Keep records small (3.1) so less memory is touched in the first place.
- Estimate: 5–10% at the final, less at practice.

**3.8 Overlapping the link work (small to medium).**
- Event parsing does not need persons; only phase 2 and clicks do. So the union-find build runs on one thread while the others parse events. Clicks come last in the queue for this reason.
- This removes the union-find build (about 30–80 ms at practice) from the critical path. It still costs about 1/8 of the parse throughput while it runs.

**3.9 Skew-aware scheduling (protects the tail).**
- Process P2 partitions largest first.
- A person above a threshold (say 100k events) gets a radix sort instead of a comparison sort.
- Without this, a whale partition handled last could add 15–50 ms at the end of the run.

**3.10 Input mapping (small).**
- Map each file read-only. The kernel's fault-around maps 16 pages per fault, about 27k faults for 1.8 GB.
- Optionally, have each worker pre-populate its own byte range before parsing it, with the read-populate advice available on Linux 5.14 and later, falling back silently.
- Benchmark this against plain reads into a reused 8 MB per-thread buffer. That costs one memcpy from the page cache but no faults. Pick the faster on the 20M set.

**3.11 Fast exit (small).**
- After the output files are closed, end the process directly: no destructors and no frees. Never fsync.

**3.12 Output (small).**
- Write uncompressed PLAIN pages from thread-local column buffers, one file per thread, in parallel. Compression would cost more CPU than it saves on a page-cache write.

---

## 4. Correctness safeguards

The rule is "one right answer". A fast, nearly right answer scores nothing, and each rejected submission burns one of the two slots per hour.

**4.1 Input handling**
- Only `\n` ends a line. A `\r` is data, so a `1000\r` price is bad and an `e3\r` ID is a different ID. A line that is empty, or that holds only `\r`, is malformed.
- Skip exactly one header line per file. A later line equal to the header is data (fixture L3).
- Handle 0-byte and header-only files, and a last line without a trailing newline. Treat it as a line, which is the usual CSV reading; the rules do not say. Ask the organizers if possible, or test against the reference's behaviour on the dev check.
- Never treat a chunk boundary as a line boundary.
- Unquote only a whole field: a field of length 2 or more that starts and ends with a quote and has no other quote inside. `""` is empty, so null. A single `"` or a quote mid-field makes the whole line malformed.
- Split on every comma. A field count other than 7 (events), 4 (clicks) or 2 (links) is malformed.
- Never trim, fold case or normalize anything. Spaces are significant.
- "Digits" means ASCII 0x30–0x39 only. Never use any Unicode-aware digit test.

**4.2 Timestamps**
- F1 is exactly `YYYY-MM-DDTHH:MM:SSZ`, with an upper-case `T` and `Z`.
- F2 is the same with a `+HH:MM` or `-HH:MM` offset. The offset hour is 00 to 23, the minute 00 to 59, and the colon is required. Subtract the offset to get UTC; `-00:00` is UTC.
- Hours 00–23, minutes 00–59, seconds 00–59. The day must not exceed the month's length, with Gregorian leap years, so February 29, 2028 is valid.
- F3 is digits only. Leading zeros are allowed, however many. A value too large for 64 bits is out of window, not malformed: either way the event is dropped.
- Use 64-bit integer milliseconds throughout; never floating point.
- The event window is `[start, end)`. The click window is `[start − 604,800,000 ms, end)`.
- **The late rule:** `ingest − ts > 86,400,000` drops the event. Exactly 24 h is kept, and so is an ingest before `ts`.
- Store `ingest` as full 64-bit milliseconds (or seconds), never saturated. Dedup compares it.

**4.3 Dedup and identity**
- Event dedup is global by `event_id`, across users (fixture E4).
- The winner is the smallest ingest. A record replaces the stored one only on a strictly smaller ingest.
- The winner's own verdict decides; a later valid copy never rescues it (E5).
- A copy dropped as malformed in step 1 never takes part. But a well-formed copy with, for example, an empty user does take part: it is a valid dedup candidate with an invalid verdict.
- Links:
  - Drop malformed lines and lines with an empty side.
  - Self-links and repeats are harmless.
  - The person name is the byte-wise smallest ID in the component, even one that never appears in an event (L2).
  - An upper-case ID is a different ID, and it sorts before lower case.
- Links apply to clicks too (A12, L4).

**4.4 Sessions and attribution**
- The gap is "strictly greater than 1,800,000 ms" (E1, E2, and the 0.1% of real gaps that are exactly 30:00.000 or 30:00.001).
- A session belongs to its start day, even past midnight (E3).
- A click credits a session when `click.ts ≤ start` and `start − click.ts ≤ 604,800,000`. A click 1 ms after the start does not (A4); a click exactly 7 days before does (A2).
- A `ts` tie goes to the byte-wise smallest click_id (A5), using the key comparator, which is exact.
- Assists are distinct campaigns in `[start − 7 d, start]`, including the credited one. `organic` never assists. A campaign with only assists still gets a row, with 0 in the credited columns (A11).

**4.5 Built-in invariants, checked on every run and logged to stderr**
- Σ sessions and Σ revenue are equal across the two tables.
- Σ assisted ≥ Σ credited non-organic sessions.
- The count of surviving events equals Σ events in user_daily.
- The exotic-key count, the counts of malformed lines per table, and the dedup winner and loser counts are logged for comparison with expectations from the generator's dirt rates.

**4.6 Representation guards**
- At start-up, check every layout assumption:
  - window length + 7 days < 49 days, so a 32-bit millisecond offset fits;
  - at most 127 categories plus `unknown`;
  - at most 65,535 campaigns;
  - a 24-bit price, which follows from the 10,000,000 cap.
- If any check fails, switch to a wide-record path that is slower but has the same logic.
- Never assume anything else from the generator's statistics, such as ID lengths, file counts or the window start being midnight. Those may shape performance, never correctness.

---

## 5. Build and runtime tuning for the scoring machine

**Language and toolchain**
- Rust stable. Pin the exact toolchain in the Dockerfile's builder stage; this sandbox has rustc 1.97.0. Check that the official image tag exists before relying on it.
- Commit `Cargo.lock` and build with the locked flag.

**Release profile**
- Maximum optimization, fat link-time optimization, one codegen unit, abort on panic, no debug info, stripped binary.

**Target CPU**
- Set an explicit target. x86-64-v3 (AVX2, BMI1/2, LZCNT) is safe for every n2 machine.
- Never use "native": the build machine may differ from the run machine.
- AVX-512 kernels go behind runtime detection only. This sandbox has AVX-512 VBMI, but a Cascade Lake scorer does not, so do not use VBMI.

**Image**
- Two stages.
  - The builder compiles a statically linked binary, using the glibc target with static CRT. Avoid musl's allocator: we barely allocate, but its slow path is a trap.
  - The final stage is `FROM scratch` containing only the binary, with `CMD` in exec form so no shell starts. With no `/etc/passwd`, the numeric uid 1000 still works.
- Do not pin a platform in `FROM`; the scorer builds natively.
- The image is a few MB, far under 8 GB.
- The build needs only crate downloads, well inside the 10-minute network window.

**Runtime**
- Read `DATA_DIR`, `OUTPUT_DIR` and `NCPU` from the environment, defaulting to `/data`, `/output` and the affinity-mask size.
- Create `user_daily/` and `campaign_daily/` under the output folder.
- Use exactly `NCPU` workers, pinned one per allowed CPU from the process affinity mask.
- Use nothing in `/tmp` (64 MB tmpfs) or `/scratch`; everything fits in RAM.
- **Peak memory:** about 1.5 GB of anonymous memory at practice and about 4.5 GB at the final. The mapped input's page cache (1.8 / 5.5 GB) is probably charged to the container's cgroup too, but it can be reclaimed. Both are far below 24 GB.
- Write nothing to stdout. Phase timings and invariants go to stderr, which the dev check returns on failure.
- **Cold cache:** if the scoring data is not in the page cache on the first of the three runs, I/O dominates. The read-ahead hints at start-up, plus parallel range parsing across many files, keep several I/O streams busy. Nothing else is needed, because the median of 3 runs is likely warm.

---

## 6. Improvement ideas beyond the v1 design, ranked by expected gain per hour of work

1. **Links-first routing with slim dedup records** (est. −10 to −15% total).
   - Build the person table before parsing events. Parallelize the union-find (idea 5), and fault in arenas during the wait.
   - Then every event line writes:
     - (a) a 16-byte full record straight into its person's P2 partition;
     - (b) a slim dedup record into P1: event key, ingest, and a 4-byte back-reference to the full record.
   - Phase 2 then only marks losing copies, about 3% of events, as dead through the back-reference. Invalid copies write only a slim record.
   - This removes one full-record shuffle and the separate person-lookup pass.
   - Its cost is a short barrier at start-up and more bookkeeping. Do it only after v1 is correct and timed.
2. **AVX-512BW scanner variant**, behind detection (est. −5 to −15% of parse). Benchmark it against AVX2 on the 20M set: downclocking can erase the gain.
3. **A hand-written minimal Parquet writer** (est. a few ms; removes the largest dependency and its build time).
   - The format needs only: the file magic, one row group per file, PLAIN data pages with a page header, definition levels only for `top_category` (RLE/bit-packed hybrid), and the file metadata in Thrift compact encoding.
   - Verify every file with three independent readers: polars and DuckDB from `kit/venv`, and pyarrow if it can be installed.
4. **Fused phase 2 and phase 3 for small partitions.** If P1 and P2 used the same hash family, a thread could dedup and route a batch while its P2 targets are still in cache. Speculative: measure first.
5. **Parallel union-find** for the final's 3M links:
   - Shard the endpoint interning by key hash, one shard per thread.
   - Run lock-free unions on a dense parent array with compare-and-swap.
   - Take each component's minimum with a per-thread partial-minimum pass.

   Only matters if the single-thread build ever stalls the click ranges. Check the phase timers.
6. **Pre-populating input ranges** (est. −2 to −5%).
7. **Rebalancing the work-unit size.** Smaller ranges near the end of each phase, so all threads finish together. Estimate: a few ms.
8. **SIMD key encoding.** Map characters to 6-bit codes with a byte-shuffle lookup over 16 bytes at once. Estimate: a few % of parse.

**Not recommended:**
- Any SQL or dataframe engine. Their CSV dialects disagree with the rules, and the leaders are 500× under the baseline.
- Floating point anywhere.
- Hard-coded window, ID, file or size assumptions.
- Relying on 64-bit hashes for equality. Hash collisions break exactness; a collision across 60M IDs is unlikely but possible.
- Multiple processes.

---

## 7. Proposed architecture for our implementation

**Language:** Rust (stable, pinned).
- **Dependencies:** the Parquet crate for v1, with default features off and the low-level column-writer API, not Arrow arrays. Also `libc` for the advice and affinity calls, and optionally a small mmap crate.
- Name every library in the README, and add an MIT `LICENSE`. The track rules require both.

**Modules** (one crate, one binary):

| Module | Responsibility |
|---|---|
| config | Environment, manifest, windows, layout guards, partition counts |
| input | File listing, byte ranges, mapping and read-ahead, the work queue |
| dialect | Line and field splitting, the quote rule, field-count check; scalar reference version plus SIMD version |
| keys | The 6-bit key encoding and decoding, the exotic table, the comparator |
| time | F1, F2 and F3 parsing and validation; the calendar table |
| links | Link parsing, union-find, the person table |
| events | Per-line verdict and payload; P1 records |
| clicks | Per-line validation; P2 click records |
| shuffle | Thread-local partition buffers, arenas, write-combining |
| dedup | Phase 2 |
| people | Phase 3: local indices, sorts, sessionize, attribute, accumulate |
| output | The Parquet writer and the two table emitters |
| main | Phase orchestration, phase timers to stderr, invariants, fast exit |

Every SIMD or fast-path function has a plain scalar twin. Tests run both and compare them.

**Tests** (all local; Docker is needed only for the final container check):
1. **Unit tests per module**, written from rules.md:
   - Every dialect case in fixtures E13, E15, E19, E20 and L3.
   - Every timestamp case in E2, E7, E12, E17, E18 and A10, plus month lengths, leap years, offsets that cross a year boundary, and F3 with many leading zeros or 25 digits.
   - Key order, as a property test: for random byte strings, comparing the keys gives the same result as comparing the bytes, and decoding returns the original.
   - Union-find for L1–L4.
   - The sweep for A1–A12.
2. **The kit's fixture runner** on all 36 cases: must be 36/36.
3. **The dev set** with the kit's compare script: must print MATCH.
4. **Differential testing against an independent slow reference.**
   - A second engineer writes a plain Python reference from rules.md only, never seeing the fast code. It must also pass 36/36 and the dev set.
   - Compare both implementations on generator seeds 2 to 30, at 50k to 2M events. Include seeds whose window holds February 29, 2028.
   - This is the main defence for the final, which uses new data.
5. **Mutation fuzzing.** Take small generated sets and inject random dirt: quotes, `\r`, spaces, tabs, header-copy rows, duplicate events with other users, boundary timestamps, missing final newlines. Compare fast against reference.
6. **Performance runs** on generated 20M and 60M sets: phase timings, peak memory, and run-to-run variance. This sandbox has 4 cores and 15 GB, so scale the expectations.
7. **Container check with the scorer's flags.** That means the kit's run script: read-only root, uid 1000, no network, 64 MB `/tmp`, 8 CPUs and 24 GB. It runs on the owner's machine or a sandbox daemon the owner approves, before every submission.

**Milestones** (about 22 hours remain at writing):
- **M1, about 6 h:** a correct implementation, single-threaded or simply parallel, passing 36/36 plus the dev set plus 10 differential seeds. Submit it to bank a valid score.
- **M2, about +4 h:** parallel phases 1 to 4 as above. Submit after re-running every check.
- **M3:** apply the optimizations in section 6 one at a time, each kept only if the phase timers show a gain and every check still passes.
- **Freeze:** stop at least 3 hours before the cutoff and choose the final pick deliberately. The final has no score if any run passes 180 s, so robustness beats the last 5%.

**Repository hygiene** (from `OWNER_DECISIONS.md`):
- A neutral branch on the owner's existing public repository, pushed only at submission time.
- No event, track or team names; no notes in the tree.
- A Dockerfile at the root.

The track rules also require an MIT license and a README naming the libraries used. Those two files are needed despite the "no notes" preference, so the owner should confirm the README wording.
