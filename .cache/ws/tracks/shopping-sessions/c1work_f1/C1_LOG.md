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
