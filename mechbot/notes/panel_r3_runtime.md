# Panel R3: runtime engineer (answer times, the page's "wait", Rust) — 17:20 UTC Sat Nov 21

Measured build: dist/bot.js sha256 da88060b... (= S01-full, commit a2fb4793, official 5.02). The core build (803557a2)
runs the same engine, I/O and Dockerfile, so its timing is the same. Nothing in bot/, sim/ or dist/ was changed.
Scripts and raw outputs: tools/panel_r3/rt/ (out/*.json hold every per-decision time).

## 1. Verdict in four lines

1. **"wait 196 ms" and "wait 120 ms" are the scoring platform's queue wait.** They measure the time between our
   submission and a scoring worker picking it up. They are not our answer times or our start-up, and our bot cannot
   change them.
2. **Our answers are fast and have a short tail.** Under conditions close to the match (1-CPU CFS quota, 512 MB, the
   Dockerfile's engine settings, unpinned):
   - 52,605 decisions on full-length streams: median 0.5 ms, p99 1-3 ms, worst 36.5 ms.
   - Answers over the 50 ms budget: **0**. Over 30 ms: 1. Over 20 ms: 3.
   - Start-up: hello to ready in 1.9-2.2 s (budget 20 s). Worst of the first 50 observations: 6.1 ms.
3. **No runtime fix is needed for points.** Keep the Dockerfile settings and the rehearsal. Section 5 gives a compute
   budget for the new tactics code.
4. **Rust: do not port.** A Rust prototype of our two hot paths gives the same results bit for bit and runs 1.5-1.8x
   faster. That speed buys nothing:
   - we use 2-6% of the budget at p99, and the match is lockstep, so finishing early gives no advantage;
   - expected gain is 0.00 points;
   - a port costs most of the 23 hours that remain, and it risks changing the bot's behaviour.

## 2. What "wait" is (evidence)

The platform's status page (../web/status.html, saved 04:25 UTC) has a section headed "Tracks — queue, workers and
run times".
- Our track's card reads: "Builders - Mech Royale · Open 4 /hr per team · Queue 0 / 1000 · Workers 9/24 · p50 1m 33s ·
  p95 3m 50s · **Wait 137 ms**". The JSON behind it is `"avg_wait_ms":137`.
- The card's "Latest runs" list shows lines such as "BB-4BC150BB Builders - Mech Royale scored **wait 302 ms · run 3m
  06s**". Each line comes from `"queue_wait_ms":302,"total_ms":186321`.
- Entries still in stage `fetching` already carry `queue_wait_ms` while `total_ms` is null. So the wait is measured
  before the repository is even fetched.

What this means:
- The wait is the queue time before a worker is assigned.
- The scoring run that follows (build plus matches) is the separate "run" value.
- Our 196 ms and 120 ms are typical: the track's average was 137 ms, and single entries ranged from 14 to 654 ms.
- The word does not appear in kit/protocol.md or kit/check/check.py. Those files speak only of the 50 ms decision
  budget, `hello_budget_ms` 20 s, and "late".
- Correction to notes/submissions.md: it calls "wait" "the scorer's test run time". It is the queue wait, not the run
  time.

Scorer hosts (the same page):
- 2-4 match slots per host, 128 GB of RAM, CPU use 0-42% at load 0-17.
- The implied core counts are about 13-70, so a host is not oversubscribed.
- Our local 1-CPU quota test is therefore a fair or pessimistic stand-in.

## 3. Measured answer times

### Setup
- cgroup v1 cpu group `mechtest` (cfs_quota_us = cfs_period_us = 100000, the same as `docker run --cpus 1`).
- Memory group `mechmem` with 512 MB (memsw 512 MB, no swap).
- The bot runs unpinned, so every host core is visible to it, as in Docker.
- The engine settings are the 9 `BUN_JSC_*` lines of dist/Dockerfile. The command is `bun dist/bot.js`.
- tools/panel_r3/rt/timing.py works in lockstep like the server. It sends an observation and times until our line
  arrives. Every 25th write carries 3 observations, as in the kit check.
- It also records the time from hello to ready, and CFS throttling separately for start-up and for the match.

### Streams
- **kit**: the kit's 300 observations from a real match.
- **long4800**: tools/release_gate/long4800, 4,800 schema-valid synthetic decisions, the full 480 s length.
- **ffa_s15, ffa_s14, ffa_s11, sq_s2**: real simulator matches of 2,778, 2,374, 1,614 and 1,387 decisions.
  - They were recorded with tools/panel_r3/rt/tee_rec.py.
  - The bot is deterministic (R11), so replaying a recording reproduces its match decisions.

### Results

| Run (engine settings as in the Dockerfile unless noted) | Runs | Decisions | p50 | p99 | Worst | Over 20 / 30 / 50 ms | Ready (s) | Worst of first 50 |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| kit, 512 MB | 3 | 900 | 0.5 | 1.3-1.5 | 4.0 | 0 / 0 / 0 | 1.96-2.18 | 4.0 |
| long4800, 512 MB (5 plain, 2 with GC/JIT logs, 1 at forceRAMSize 512 MB) | 8 | 38,400 | 0.53-0.64 | 2.6-3.2 | 36.5 | 3 / 1 / 0 | 1.88-2.19 | 3.5 |
| real-match recordings, 512 MB | 6 | 13,305 | 0.3-0.6 | 0.9-2.2 | 8.0 | 0 / 0 / 0 | 1.89-2.19 | 6.1 |
| **All of the above** | 17 | **52,605** | | | **36.5** | **3 / 1 / 0** | | **6.1** |
| busy host: 3 CPU burners on 3 of the 4 cores | 2 | 7,578 | 0.34-0.37 | 2.6-2.9 | 12.0 | 0 / 0 / 0 | 2.00 | 9.7 |
| default engine (no BUN_JSC lines), ffa_s15 / long4800 / busy | 3 | 10,356 | 0.27-0.54 | 1.4-1.9 | 21.8 | 1 / 0 / 0 | 2.11-2.25 | 5.8 |
| memory cap 96 MB (peak 55 MB charged) | 1 | 4,800 | 0.54 | 3.1 | 12.9 | 0 / 0 / 0 | 2.01 | 5.9 |
| memory cap 72 MB (peak 53 MB charged) | 1 | 4,800 | 0.55 | 3.5 | **59.9** | 1 / 1 / **1** | 1.94 | 4.4 |
| official kit check.py, quota and 512 MB | 1 | 300 | 0.6 | 1.3 | 3.2 | PASS, 300/300 in time | 1.94 | |

### Memory
- Peak charged to the 512 MB group: 52-80 MB, including the page cache of bun's 107 MB binary and the map.
- At a 96 MB cap nothing changes.
- At 72 MB the kernel starts evicting bun's own code pages, and one decision took 59.9 ms. This is the only
  over-budget answer in about 80,000 measured decisions. The real cap is 7x higher, so memory pressure is not a
  match risk.

### Throttling by the CPU quota
- During start-up, with the Dockerfile settings: 11-16 throttles, totalling 0.35-0.69 s.
- During start-up, with the default engine: 1.48-1.76 s throttled (0.31 s on the busy host, where the engine's
  helper threads found no idle core).
- During the match, with the Dockerfile settings: 0-2 throttles per run, at most 11.6 ms in total.
- During the match, with the default engine: up to 4 throttles, 60 ms in total.
- The Dockerfile lines are still worth keeping.

## 4. Where the tail comes from (attribution)

### Diagnostic runs
- Two long4800 runs with `BUN_JSC_logGC=1 BUN_JSC_reportCompileTimes=1`. Every stderr line was timestamped and matched
  to the decisions it overlapped (tools/panel_r3/rt/attribute.py).
- An in-process profile with timers on every Nav and World method (tools/panel_r3/rt/profile.js).

### Garbage collection
- After ready: 8 eden collections in 4,800 decisions, 2.5-4.1 ms each.
- 3 of the 32 decisions above 4 ms contain one.
- The allocation rate is low. There is no allocation hot spot worth fixing.

### JIT compilation
- After ready: 165 compiles (42 Baseline, 123 DFG), about 300 ms in total, the largest 20-24 ms.
- They run on the compile thread (`useConcurrentJIT=1`), so only 1-2 of the slow decisions overlap one.
- The rehearsal (800 + 800 synthetic decisions, then a 600 ms settle) does its job: the worst of the first 50
  observations is 2.5-6 ms.

### Our own work: the deterministic spikes
The same decisions are slow in every run (long4800 #354, #2131, #2254, #1677, #1695: 6-15 ms each).

| Hot path | Total over long4800 | Worst single decision | Typical worst case |
|---|---:|---:|---|
| `World._cast` (ray casts) | 415 ms in 207,199 calls | 13.9 ms (#273) | about 250 casts in one decision, each with a 0.5 m terrain march |
| `Nav.findPath` (A*, 25,000-expansion cap, then string pulling) | 140 ms in 2,517 calls | 5.7-7.2 ms (#354, #2131) | one search |
| `Nav.findPath`, real match ffa_s15 | | 11 ms unwrapped (19 ms with timers) | one search |
| `Nav.setBody` | | about 1 ms | one body change |
| `Nav.walkLine` | 146 ms in total | | |

- Brain alone, in-process, without timers: p50 0.1 ms, p99 3.0-3.3 ms, worst 9-11 ms.
- With the default engine (top compiler tier on), the worst decision is 17-24 ms, caused by compile bursts.

### Rare one-off outliers outside the brain (21-37 ms, about 1 in 17,000 decisions)
- The bot's own timer for those decisions read 9-12 ms. The extra 10-25 ms was spent outside `decide()`, and no GC or
  quota throttle was logged in it.
- The likely cause is vCPU scheduling on this virtual machine (steal time is non-zero). A faster language would not
  remove it.

## 5. Fixes and rules (no score change expected; keep the tail where it is)

- **F1. Keep dist/Dockerfile exactly as it is.** The 9 `BUN_JSC_*` lines with `useConcurrentJIT=1` stay. Removing them
  costs about 1 s of start-up throttling and adds in-match throttles. That gives no points, but it brings
  answer-time risk.
- **F2. Keep the rehearsal and the settle.**
  - Keep `rehearseN` 800, `rehearseFfaN` 800 and the 600 ms wait in bot.js.
  - Start-up is 2 s of the 20 s budget. Raising the rehearsal is not worth it: the first 50 observations are already
    within 6 ms.
- **F3. Compute budget for the new tactics code** (bait two bots into a fight, leave the circle to attack, rotations).
  Our worst decision is about 10 ms on its own. New code should add no more than this at p99:
  - at most 2 extra A* searches per decision, each with `maxExpand` of at most 25,000. In JS one costs 6.1-6.4 ms
    without the top compiler tier, as in the Dockerfile.
  - at most 5,000 extra ray casts per decision (about 0.45 µs each, so about 2.3 ms).
  - at most 8 ms in total. Before any optional work, check `B.deadline` (decision start + 27.5 ms).
  - For scale: checking line of sight between every pair of 15 enemies is 105 casts, about 0.05 ms. Scoring 64
    candidate stand points against 15 enemies is 960 casts, about 0.45 ms. Our JS can afford the tactics the owner
    asked for.
- **F4. Re-measure every release with the gate's checks.** That is R3 (p99 under 15 ms, worst under 40 ms) and R10b
  (late answers at most 0.5%, p99 under 15 ms), plus `tools/panel_r3/rt/timing.py` on one real-match recording. The
  gate's 40 ms ceiling sits above our measured 36.5 ms worst, so keep it as the alarm.
- **Measured evidence that late answers matter for slow bots:** alexwilldev gained +0.38 by fixing late answers seen on
  the scorer (measured_deltas N04). We are 15x inside the budget at p99, so we have no such gain to collect.

## 6. Rust: what a port would change

Benchmark: tools/panel_r3/rt/rustbench is a line-by-line port of `World._cast` (with `_rayTerrain`, `ground` and
`pointInEdges`) and `Nav._search`, built with release, LTO and the default target CPU.
- It loads the same map arrays, exported from our live World and Nav objects (tools/panel_r3/rt/export.js).
- It replays the same queries: 275,550 ray casts recorded from the brain over long4800 and three real-match streams,
  and 2,042 A* searches (42 recorded, 2,000 random pairs in the main component, budget 15,000 expansions).
- It matches JS bit for bit: 0 mismatching cast results, and 0 mismatches in found cell, expanded count and closest
  cell. This needed the JS `Float32Array` store and rounding rules to be copied exactly.

All runs on core 3, best of 3 repeats:

| Engine | Ray cast (ns each) | 250-cast batch p50 / p99 / worst (ms) | A* (ns per expansion) | Slowest search (ms) |
|---|---:|---|---:|---:|
| bun with the Dockerfile settings (no top compiler tier), what we ship | 425-516 | 0.12 / 0.53-0.80 / 1.04 | 243-257 | 5.0-5.4 |
| bun, default engine | 375 | 0.12 / 0.60 / 0.93 | 161 | 3.1 |
| Rust prototype | 283-323 | 0.06 / 0.33-0.49 / 1.0-2.2 | 140-158 | 3.1-3.9 |

Rust is 1.5-1.8x faster than what we ship and 1.1-1.3x faster than the default engine.

| Question | Answer, with numbers |
|---|---|
| Answer-time tail | Our worst decision of about 10 ms would become about 6 ms, and p99 3 ms would become about 1.7 ms. Rust removes JIT and GC pauses, but those are 2-4 ms here, not the tail. The 21-37 ms one-offs come from host scheduling, which Rust does not touch. Late answers stay at 0 either way. |
| Determinism | No gain. Our bot is already deterministic (R11, byte-identical replays), and Rust would be too. |
| Start-up | About 2 s would become about 0.3 s, against a 20 s budget. No score value. |
| Affordable compute per decision | Within the brain's own 27.5 ms deadline, JS does about 60,000 casts or 4 full A* searches; Rust about 90,000 casts or 7 searches. Our worst decision uses about 250 casts and 1 search, and every tactic on the table needs under 5,000 casts and 2 searches (section 5). No decision we plan would use the extra compute. Only Monte-Carlo rollouts of all 16 mechs would, and those cannot be built and validated in 23 hours. |
| Does finishing early help? | No. The match is lockstep: the server waits for every bot or for 50 ms. The protocol says a fast bot "is never at a disadvantage for answering early", and it gives no advantage either. |
| Evidence from other bots (sparring roster, official scores) | Best score by language: TypeScript 5.58 (34 bots), Go 5.33 (7), Rust 5.15 (3), Python 5.02 (69). Of the 6.0+ bots: giddygiddyboy and Kanyaraasi are Go; kyoto-max ships native binaries; the other two are unknown. Kanyaraasi did not gain by changing language as such: it switched from TypeScript to the giddy bot's strategy files byte for byte. The gap to the top is strategy, not language. |
| Cost | Our bot is 7,321 lines (bot.js plus lib), plus 3,490 lines of tests. A faithful port is about 9-10k lines of Rust plus a JSON layer. Roughly: 10-15 h of porting, plus 4-6 h making the 14 identity streams byte-identical (the tools/rc/identity_rc.sh method), plus the release gate. That is the whole remaining 23 h, and the tactics work worth the needed +0.4-0.8 would stop. |
| Behaviour risk | High. The brain's behaviour hangs on many exact numeric details, the same kind as the f32 heap rules that had to be copied for A*. Our tests (85 + 39 + 15 + 12) catch only part of them. One mistake can cost a submission 0.3-2 points, and noise of ±0.3 hides small regressions. |
| Build risk | Moderate. It needs a 2-stage Dockerfile: a `rust:` image pinned by digest for `cargo build --release`, then a slim runtime image. The bot has no dependencies, or serde/serde_json fetched over the scorer's network. The build takes 1-2 min against the 10 min limit, plus pulling an image of about 0.5-1 GB. Our local sandbox cannot fetch crates offline: 4 of the roster's Rust bots failed exactly there. So we could not run the scorer's build locally without vendoring. |
| Hot-spot-only port (bun:ffi, or WASM) | It would save about 150 ns per cast, about 0.04 ms on our worst decision. It would add a cargo build stage or a binary blob, a new failure mode at load time, and a compliance question about shipping an opaque blob. Not worth it. |

### Recommendation

| Option | Expected point gain | Risk | Decision |
|---|---|---|---|
| **No port** (keep bun plus the engine settings) | 0 | none | **Choose this.** Spend the hours on tactics. |
| Hot-spot port | about 0.00 | build and compliance risk | No. |
| Full port | about 0.00 ± 0.01, since there are no late answers to recover | -0.3 to -2 per regressed submission, and all of the remaining time | No. |

If a later tactic does need heavy search, first apply section 5's budget in JS. The measured headroom is about 6x before
the brain's 27.5 ms deadline.

## 7. Reproduce (as root; P = project root)

```sh
mkdir -p /sys/fs/cgroup/cpu/mechtest /sys/fs/cgroup/memory/mechmem
echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_period_us; echo 100000 > /sys/fs/cgroup/cpu/mechtest/cpu.cfs_quota_us
echo 536870912 > /sys/fs/cgroup/memory/mechmem/memory.limit_in_bytes; echo 536870912 > /sys/fs/cgroup/memory/mechmem/memory.memsw.limit_in_bytes
R=$P/tools/panel_r3/rt; ENVS=$(cat $R/envs.txt)
python3 -B $R/timing.py --stream $P/tools/release_gate/long4800.jsonl.gz --map-dir $P/kit/arena --out /tmp/x.json \
  --batch-every 25 --stderr /tmp/x.err [--stderr-ts] -- $P/tools/cg1.sh $R/cgmem.sh env $ENVS $P/bun $P/dist/bot.js
python3 -B $R/attribute.py /tmp/x.json /tmp/x.err 4      # with BUN_JSC_logGC=1 BUN_JSC_reportCompileTimes=1 and --stderr-ts
env $ENVS taskset -c 3 $P/bun $R/profile.js <stream> [--no-wrap]
env $ENVS taskset -c 3 $P/bun $R/bench_js.js $R/bench_data; taskset -c 3 $R/rustbench/target/release/rustbench $R/bench_data
# record a real match stream:
bun sim/run.js --bot "proc:python3 -B $R/tee_rec.py $R/rec/ffa_s15.jsonl -- $P/bun $P/dist/bot.js" --mode ffa --matches 1 \
  --seed 15 --jobs 1 --timeout 2000 --log-dir $R/simlogs --json $R/rec/ffa_s15.sim.json
```
