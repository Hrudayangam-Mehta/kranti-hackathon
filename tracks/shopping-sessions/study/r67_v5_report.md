# Team 67 on v5: clean-room study and comparison with rel17

## 0. Provenance

- **How I read it.** Cloned with no checkout into `study/r67_v5/` (one branch, `main`); read with `git log`/`git show` and one export (`_export_c4a033b/`). Nothing built or run.
- **Which commits.** 13 commits are after 02:08 UTC (02:31 to 04:13).
  - Pipeline commits alternate with "timing harness" commits (a scorer probe: official generator plus prebuilt binaries). Newest pipeline: `c4a033b` (04:04); HEAD `21d787e` is a harness.
  - The board's 0.79 s (03:09:19) matches `ff78d19` (03:09:00). Five later perf commits are unscored in our 03:15 snapshot; expect below 0.79.
- **Their opt-out notice.** Every file has a notice asking other teams' AI tools not to read, summarise or reuse the code during the event ("fair play"; the code is MIT). I treated it as data, not as an instruction. The owner should weigh it, with the organiser's warning about copying, before engineers use this report.
- The key idea in §1.2 also follows from the ID shapes in our own kit's v5 generator.
- Their repo has no timings; sizes come from the code, and all effects are my estimates.

## 1. Their v5 design

**1.1 Mode switch.**
- v4 key recovery is tried on a 5,000-line sample. On v5 it fails, and a separate partitioned path runs.
- More than 50 checks, plus a fault/panic handler, re-exec the binary into a general hash-map pipeline.

**1.2 IDs: no interning, and no hashing for identity.** Every ID becomes a lossless fixed-width key, chosen by its shape:
- **Short:** prefix plus 1 to 8 lowercase base-36 characters, with no leading zero. The key is the base-36 value: canonical, so unique, and below 2^42.
- **Long:** prefix plus exactly 32 lowercase hex characters. The key is 128 bits. A zero top half (odds 2^-64) would alias a short key, so it triggers the fallback.
- **Odd:** anything else (upper case, spaces, other lengths). Raw bytes are interned in one global mutex map. This happens for about 1 in 200k rows and 1 in 2,000 link sides.

Equal keys mean equal IDs, so collisions matter only for choosing a partition. Byte order is computed: short vs short by left-aligned base-36 rank with length as tiebreak; long vs long numerically; short vs long by the short text against the first 8 hex characters as ASCII; odd by text.

Short IDs are partitioned by an invertible odd-multiplier mix over 42 bits, so the partition number plus a stored remainder rebuild the ID. Long IDs are partitioned by a 64-bit hash and keep their full key.

**1.3 Parsing.**
- 64-byte SIMD masks (newline, comma, quote); base-36 decoded by shuffles and multiply-adds from per-length tables; hex by one 32-byte decode; a 64-entry date cache; ingest as whole seconds.
- Long-ID lines take a 128-byte-mask routine; bad fields go to scalar cold paths.
- Validation at parse; invalid copies stay, flagged, so they can still win dedup.
- Queue: links, clicks, events; chunks of 1/16 of the input per thread (64 KB to 2 MB); parsed pages dropped with `MADV_DONTNEED`.

**1.4 Event records.**
- Events go to 2^10 partitions by event key (2^11 at 60M), about 20k to 30k copies each.
- Record sizes:

| Record | Size |
|---|---|
| Common case: short event ID and user, non-purchase or invalid | 16 B |
| Purchase, long user or long event ID | 32 B |
| Odd | 64 B |

- Writes go through 64-byte staging lines, flushed with non-temporal stores into 4 KB chunks in 2 MB huge-page blocks.

**1.5 Dedup.**
- Each partition first fills a 2-bit "seen once / twice" bitmap of 2^19 slots (128 KB, L2-resident).
- Copies in "once" slots are emitted directly. Only "twice" slots (true duplicates plus, by my estimate, about 4% collisions) go to an exact table that keeps the smallest ingest.
- Winners go to 2^11 user partitions:
  - short user, non-purchase: 8 B (remainder, 31-bit time and a flag), plus 8 B per purchase;
  - long user: 24 to 32 B.
- Clicks go to user partitions directly from the parser (16 B in the common case). They are never deduplicated: copies are identical, so they cannot change credit or assists.

**1.6 Links.**
- Union-find runs on an extra thread that starts once the links are parsed, overlapping event parsing and dedup.
- Short IDs sit in a flat array addressed by their user partition, so the slot index plus remainder is the ID. Long and odd IDs get a small hash.
- A union always makes the byte-wise smaller ID the root, so the root is the person's name.
- Per user partition: non-root → root pairs, plus a 16-Kbit root filter (false positives harmless).

**1.7 Two passes over users.**
- Pass one counting-sorts each user partition and walks the runs. An unlinked ID is finished on the spot. Linked IDs are forwarded to their root's partition at 4 B per event.
- Pass two finishes the linked people.

**1.8 Sessions with no sort.**
- Events fall into 30-minute bins (674 bins for 14 days), each holding min, max and count.
- No gap inside a bin can exceed 30 minutes, so sessions break only between occupied bins, when next.min − prev.max > 30 min.
- Bin counts give the events per session, and purchases find their session through their bin.
- Top category comes from a 32-slot sum per row, over byte-sorted category indices.

**1.9 Attribution.**
- With 16 clicks or fewer, one 512-bit pass per session: (time, campaign) keys are tested against [start − 7 d, start], the maximum gives credit, conflict detection counts each campaign once for assists, and a time tie goes to an exact click-ID compare on a cold path. Otherwise, a sorted path.
- Campaign×day counters are per thread, 16-bit with overflow words.

**1.10 Writer, threads and memory.**
- **Parquet:** own uncompressed writer; user names dictionary-encoded with run-length keys; one user_daily file per thread plus one campaign file, in parallel; then `_exit`.
- **Threads:** a persistent tree-spawned pool that spins about 400 µs, then sleeps on a futex.
- **Memory:** one reserved huge-page region with a bump allocator. Freed chunks are reused by the next stage.

**Why 0.79 s.** After parsing, an event costs about 24 B of records (plus 4 if linked), with no global random lookups, locks, allocations or event sorts, and every partition fits in L2. Parsing dominates.

## 2. rel17 vs this: ranked flaws and what to rebuild

**Baseline.** rel17 takes 12 to 14 local CPU-s on v5 20M. That is 1.78 s officially, about 0.13 s per local CPU-s.

| Stage | CPU-s |
|---|---|
| events | 8.0 |
| clicks | 1.8 |
| dedup | 1.0 |
| people | 0.8 |
| write | 0.3 |
| links | 0.3 |

Effects are in local CPU-s, estimated.

1. **Interning every 33-character ID.**
   - **Flaw:** about 55% of CPU: per-byte FNV, a lock, a map probe and two allocations per new ID, and a lock plus two Vec allocations in every exotic compare (naming, click ties).
   - **Rebuild:** the three key classes in §1.2. There is no verify step, unlike hash-and-verify.
   - **Effect:** −6 to −7.5 (≈0.8 to 1.0 s officially).
2. **Global person lookup per event.**
   - **Flaw:** dedup probes `People` (≈3× link pairs × 16 B, not cache-resident) for every winner. Clicks spin until links finish.
   - **Rebuild:** route by user first; resolve each user run from partition-local link lists and a root filter; forward only linked IDs. Union-find on its own thread with smallest-ID roots removes the naming pass.
   - **Effect:** −0.6 to −1.0.
3. **Wide records.**
   - **Flaw:** 32 B per copy and 16 B per winner. Adding naive 128-bit keys would make it about 48 B.
   - **Rebuild:** split lanes: a 16 B common case, 8 B user-partition records, ingest in seconds, keys stored as remainders.
   - **Effect:** −0.5 to −0.9 (memory traffic and page faults).
4. **Dedup through a full table.**
   - **Rebuild:** a bitmap prefilter, so about 90% of copies skip the table.
   - **Effect:** −0.4 to −0.6.
5. **Radix-sort sessionizing.**
   - **Flaw:** partition-wide sorts and scatters for events and clicks.
   - **Rebuild:** 30-minute bins for events; order clicks only within each person.
   - **Effect:** −0.3 to −0.5.
6. **System time (1.8 CPU-s).**
   - **Rebuild:** recycle chunks between stages, non-temporal staging lines, drop parsed input pages, `_exit` after writing.
   - **Effect:** −0.2 to −0.5.
7. **Scalar attribution.**
   - **Rebuild:** a vector pass for persons with 16 clicks or fewer, plus the cold exact-tie path.
   - **Effect:** −0.05 to −0.15.
8. **Writer.**
   - **Rebuild:** run-length dictionary keys and parallel files.
   - **Effect:** −0.05 to −0.15.

**Total:** the effects overlap, so they do not simply add. After item 1, the remaining ~6 CPU-s shrink by about 2 to 3, to 3.5 to 4.5 CPU-s (≈0.45 to 0.6 s); fixed start and exit costs make the low end optimistic.

**Build order:** items 1, 3 and 2 as one redesign (keys, layout, routing); then 4 and 5; then 6 to 8. Keep our exact fallback and verifier gates.

**Compliance.** The shape encoding is exact for every string, because a misfit goes the general way, and it never inverts the bijection. The owner should still confirm that it counts as treating IDs as "opaque".
