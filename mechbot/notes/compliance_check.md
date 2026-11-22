# Submission compliance check

Written 2026-11-21 07:40 UTC. `P` = `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot`,
`S` = its parent (the scratchpad).

**Verdict for the frozen candidate: NO-GO, 3 FAILs.** All three are cheap to fix or to waive:
digest pin (E-A2), the word `headExposure` (E1), method exposure in the bundle (E5, owner decision). Everything
the scorer itself checks passed in the closest sandbox this machine allows.

Primary texts read again for this check: `kit/protocol.md` sections 1-3 and 12 (plus 6 and 11 where a clause
points there), `kit/README.md`, `kit/check/check.py` (code), `kit/mechfight.schema.json`, the saved pages
`web/tracks_builders.html`, `buildathon.html`, `leaderboard.html`, `status.html` (visible text and the embedded
Next.js page data, read as data), `REPO_HYGIENE.md`, `notes/runtime_1cpu.md`, `notes/rules_audit.md`. I did not
open `P/intel`. For `/home/user/kranti-hackathon` I read LICENSE and README; I also listed the directory and
ran `git log --oneline` (read-only), and opened nothing else.

## 0. The candidate and the test bench

- Source snapshot: `P/bot` copied twice at 2026-11-21 07:10:34 UTC (the two copies were identical) to
  `S/comply_bot`. Hashes: `S/comply_work/bot_snapshot.sha256` (brain.js `023b77db…`, tactics.js `0e92df65…`).
- Bundle: `S/comply_dist`, built as `tools/package.sh` builds it (`bun build --minify --target=bun`, bun
  1.4.4+38afee6c8) + `bot/Dockerfile` + LICENSE and README from the public clone:
  `bot.js 9c3d1b93…` (123,060 bytes), `Dockerfile cbc6462a…`, `LICENSE 2838d6d1…`, `README.md f289218b…`.
- `P/dist` was rebuilt by someone else at about 07:2x. A gate run on it at 07:27 (`P/runs/gate_20261121T072733Z`)
  gives the same 3 FAILs, and its bot.js is byte-identical to a fresh bundle of `P/bot` at that time.
- There is no Docker daemon here (`failed to connect to the docker API at unix:///var/run/docker.sock`). So I
  approximated the match container (`docker run --network none --cpus 1 --memory 512m --read-only --tmpfs
  /tmp:rw,size=64m --user 65534:65534 -v arena:/arena:ro`) without Docker:
  - `tools/release_gate/sbx.sh` does the following: new mount and network namespaces; a fresh tmpfs root
    remounted read-only; host `/usr` and `/etc` bound read-only; bun 1.4.4 at `/usr/local/bin/bun` (the path in
    the image); the folder read-only at `/bot` (WORKDIR and cwd); the map read-only at `/arena`, or no `/arena`;
    a 64 MB tmpfs `/tmp`; uid and gid 65534 with no capabilities and no groups. The environment is cleared
    (HOME unset). Only the image's `PATH`, `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0` and `BUN_INSTALL_BIN` (read from
    the image config in the registry) are set, plus the Dockerfile's ENV.
  - `tools/cg1.sh` puts the bot under a CFS quota of 100000/100000 (group `mechtest`, as in runtime_1cpu.md).
    It is unpinned like `--cpus 1`. Long runs were also pinned to core 3.
  - `tools/release_gate/cgjoin.sh` adds a memory cgroup (limit 512 MiB, memsw 512 MiB, so no swap) and a pids
    cgroup (`pids.max` 128).
  - Positive control (a probe bot in the same sandbox): uid 65534, groups [], cwd /bot, HOME unset
    (`os.homedir()` gives /nonexistent). Writes to `/`, `/bot`, `/usr`, `/etc`, `/arena` fail with EROFS, and
    `/tmp` works. 70 MB into `/tmp` gives ENOSPC, and a TCP connect is refused. `/dev/shm` is writable, as it
    is in Docker.
  - Negative control (`P/runs/gate_20261121T072649Z_negative_control`): a deliberately broken folder had a
    `RUN apt-get` line, a write to `/bot` and a stray stdout line 1.5 s after start. The gate said NO-GO with
    P4, P11, R6, R10 and R12 failing. **The official check.py PASSED that broken bot**: the stray line came
    after check.py's 300 observations had already finished. check.py alone is not a sufficient gate.
  - `tools/release_gate/drive.py` is a lockstep driver that validates every stdout line against the kit schema.
    `gen_long.py` writes a schema-valid synthetic stream of 4,800 observations from the kit stream. The stream
    covers 0-502 s and has every event type, offers, supply drops, 2-8 enemies, NPCs, a late zone of radius 0,
    tick gaps of 4 to 130, empty views and unknown fields. With `perturb` it instead writes a balance change:
    every config number scaled by 0.7-1.3.

## 1. Clause by clause

Verdicts: PASS / FAIL / CANNOT VERIFY HERE. Quotes are verbatim from the primary texts.

### A. Packaging and build

| # | Clause | Source | How verified | Verdict |
|---|---|---|---|---|
| A1 | Dockerfile at the top level | protocol §1: "Push your bot to a public GitHub repository with the `Dockerfile` at its top level"; track page: "copy its Python or TypeScript folder to the root of a public GitHub repo (Dockerfile at the top)" | `pack.py` P1. The folder holds exactly Dockerfile, LICENSE, README.md, bot.js | PASS |
| A2 | Versions pinned | track page: "pin versions because finalists are rebuilt." | `FROM oven/bun:1.4.4-slim` is a tag only. Registry API (allowed, no refusal) at 07:15 UTC: the index is `sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4` (sha256 of the served index matched `Docker-Content-Digest`). The **linux/amd64** manifest is `sha256:13b43f8bb2c63f5d89c56205c4279b85620363296a00ada33ff7ad568f3688e7`. The tag was last pushed 2026-10-22, the amd64 image is 84,033,300 bytes compressed, and its label revision `38afee6c84f…` equals the local `bun --revision` 1.4.4+38afee6c8 | tag PASS; immutable pin **FAIL** |
| A3 | Builds on linux/amd64 with network, within 10 minutes | kit README: "The scorer builds it on linux/amd64 with the network on, and the build must finish in 10 minutes." | Static check: the instructions are FROM, ENV, WORKDIR, `COPY . .`, ENTRYPOINT. This is the kit's `ts/Dockerfile` plus one ENV block. An actual `docker build` was impossible (no daemon) | CANNOT VERIFY HERE (low risk) |
| A4 | No build-time downloads; nothing in the build needs network except the base pull | protocol §1: "There is no network at runtime, so vendor every dependency into the image." | `pack.py` P4: no RUN or ADD, no URLs or package managers, COPY only from the context. `pack.py` P9: the bundle imports only `fs` and `path`, and all 12 modules are inside bot.js (the sandbox `/bot` has no `lib/`) | PASS |
| A5 | At most 20 MB at the submitted commit | protocol §1: "The repository may hold 20 MB at the commit you submit."; page data `"max_bytes":20000000` | The folder is 125,076 bytes. The public clone's git objects were not inspected | PASS |
| A6 | Entrypoint speaks the protocol | protocol §1: "Your bot is a Docker image whose entrypoint speaks this protocol on stdin and stdout." | `ENTRYPOINT ["bun", "/bot/bot.js"]` (exec form, so stdin and stdout reach bun). `bun` is resolved through the image's PATH to `/usr/local/bin/bun` | PASS |
| A7 | Files readable by uid 65534 | protocol §1: "The bot runs as an unprivileged user (uid 65534, not root) on a read-only disk." | All files are mode 644 and there are no symlinks (P8). The sandbox runs as 65534 | PASS |

### B. Runtime limits (protocol §3: "no network / a read-only filesystem (writable `/tmp`, 64 MB) / 1 CPU and 512 MB RAM (no swap) / at most 128 processes and threads / map files mounted read-only at `/arena`")

| # | Clause | Source | How verified | Verdict |
|---|---|---|---|---|
| B1 | 1 CPU, 50 ms per decision | §2: "You have 50 ms of wall time per decision ... Your CPU is capped to 1 core." check.py: "more than 2% late fails" | Official check.py in the sandbox under the quota, unpinned, 3 runs: PASS each time. p99 6.2-6.5 ms, max 9.9-13.6 ms, 0 late. With default engine settings (no BUN_JSC_*): max 58.4 ms, so at least one answer was late. This confirms runtime_1cpu.md, so the Dockerfile ENV is essential. With a competing busy loop on the same core: PASS, max 15 ms. A 4,800-decision run under that contention had 1 late answer (62.9 ms) | PASS (approximation) |
| B2 | 512 MB, no swap | §3 | Memory cgroup limit 512 MiB plus memsw 512 MiB. Over the 4,800-decision run the peak charge was 44.1-44.6 MB with `failcnt` 0. Peak RSS (VmHWM) was 71 MB | PASS |
| B3 | At most 128 processes and threads | §3 | Pids cgroup with `pids.max` 128; tasks read from `/proc/<pid>/task`. With the Dockerfile settings and all 4 cores visible the bot has **3 tasks** (bun, JSCWarmUp, mi-scavenger). Default settings give 5 (two more JITWorker). `pids.events` max 0. With the Dockerfile settings every JSC pool is fixed at 1, so no growth is expected on many-core scorer hosts, but that cannot be tested here | PASS here; host scaling CANNOT VERIFY HERE |
| B4 | Read-only root, writable `/tmp` only; does the runtime try to write anywhere? | §1: "write files only to `/tmp`"; kit README: "The usual causes: writing a file anywhere but `/tmp`" | `strace -f` over a whole kit run as uid 65534, with HOME unset and a read-only cwd: 53 file and network syscalls after bun starts, **0 opens for writing, 0 mkdir, unlink or rename**. Files opened: `/bot/bot.js`, `/bot/bunfig.toml` (a probe; the file is absent), `/arena/v2/world.json`, `/arena/v2/terrain.i16`, the libraries, `/proc/self/*`, and the cgroup cpu and memory limit files. The same zero writes without the image's `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`, for the bundle and for the readable copy | PASS |
| B5 | No network | §3 | `unshare -n`; strace shows 0 socket or connect calls | PASS |
| B6 | Map read-only at `/arena`, found through `hello.map.dir` | §6 and §11: "`hello.map.dir` (`/arena` in Docker) holds the static map." | strace: the map is opened from `hello.map.dir=/arena`. With a wrong `hello.map.dir` the bot falls back to `/arena` (world=true). With no map at all, check.py still PASSES (ready in 181 ms, `world=false`, fallback decisions), and so does a 4,800-decision run. Note: the file names `v2/world.json` and `terrain.i16` are hard-coded rather than read from `hello.map.files`. §11 names exactly these files | PASS |
| B7 | `ready` within 20 s | §2: "within hello_budget_ms (20 s; covers container start)" | 774-1,168 ms in the sandbox under the quota (start-up rehearsal 286-461 ms); 1,720 ms with a busy loop on the same core. Container start time cannot be measured | PASS for the bot; container part CANNOT VERIFY HERE |
| B8 | Exit on `end` and when stdin closes | §2: "then stdin closes; exit"; check.py warns when "the bot didn't exit within 2 s of `end`" | After `end`: exit code 0 after 3-7 ms. After stdin closes with no `end`: exit code 0 after 24-25 ms | PASS |
| B9 | stdout discipline | §1: "Print logs to stderr. Anything on stdout that is not a protocol message fails the conformance check." | 0 bad lines and 0 unsolicited lines across 300 + 4,800 + 4,800 + 1,200 observations. Every log line goes to stderr | PASS |
| B10 | Never crash or stall | track page: "A bot that crashes or stops answering stays in any match as a sitting target and is scored, not rejected." | 0 exception lines on stderr in every run (gate R14). `errors=0 slow=0` in the bot's own end line | PASS |

### C. Protocol beyond check.py

| # | Clause | Source | How verified | Verdict |
|---|---|---|---|---|
| C1 | Echo the tick | §2: "Every action must carry `"tick"` equal to the observation's `tick`." | 0 wrong ticks on streams with tick gaps of 4, 6, 8, 128 and 130 | PASS |
| C2 | Backlog collapse | §2: "If observations queue up on stdin, skip to the newest one and answer that." | check.py only re-sends ticks that were already answered. I sent **new** backlogs instead: 191 writes of 4 new observations at once, and 96 backlogs built while the bot was frozen (SIGSTOP, 4 new observations as separate writes, SIGCONT). Each time the bot answered only the newest observation, with 0 answers to older ticks | PASS |
| C3 | Schema-valid actions over a long run | schema `Action` | Validated against the kit schema with check.py's own validator: 3,939 answers in the backlog run, 4,800 in lockstep, 1,122 under the balance change. 0 errors. Fields used: tick, move, boost, aim, fire, take (165), pick (101), drop (106, always together with take) | PASS |
| C4 | Ignore unknown fields | §12: "Fields may be **added** within version 1 ... Ignore fields you do not know." | Unknown fields were added to hello, config, obs, self and actors (every 50th observation) | PASS |
| C5 | Read numbers from config | §6: "Read numbers from it instead of hard-coding them, because balance changes between matches." | A stream with every config number scaled by 0.7-1.3 and the zone phases reordered: PASS, 0 exceptions | PASS |
| C6 | No debug output | owner's rule; §6 caps | 0 actions carry `debug` in any run. The bundle contains a debug label template that is never sent | PASS |
| C7 | Line size and name | §3: "at most 64 KiB per line"; "`ready` name is cut to 32 characters" | The longest line is 125 bytes; the name is `aegis-16` | PASS |

### D. The bundle behaves like the readable copy, and runs are deterministic

| # | Check | How verified | Verdict |
|---|---|---|---|
| D1 | Same actions as the readable copy, twice | Lockstep in the sandbox. Kit stream (300): readable copy x2 and bundle x2 all give sha256 `6a1c7ca774156683…`. Synthetic stream (4,800): readable x2 and bundle x2 all give `fff5e9d23c079f7f…`. The result is the same under a competing busy loop, so decisions do not depend on the deadline at that load | PASS |
| D2 | The bundle is built from that source | A fresh `bun build` of the snapshot is byte-identical to bot.js (gate P11) | PASS |

### E. Hygiene (REPO_HYGIENE.md, binding)

| # | Rule | How verified | Verdict |
|---|---|---|---|
| E1 | "Before every push run: grep -rIinE "fare.i\|royale\|mechfight\|osu\|ohio\|campus\|buildathon\|builders" over the tree (must print nothing)." | The owner's exact grep on the folder prints 2 hits, both in bot.js: `headExposure` contains "osu" (`…killSecureHits:3,headExposure:0.1,…` and `…t.P.headExposure…`). `tools/package.sh`'s own grep (`\bOSU\b`, case-sensitive `Builders`) misses it | **FAIL** |
| E2 | No other teams' names | 70 team names taken from `web/mech_leaderboard_now.json` and `mech_submission_times.json`, matched with word boundaries. Searched in README, Dockerfile, LICENSE and the bundle's strings, and names of 6 or more characters also in the code. No hits | PASS |
| E3 | No leaderboard score | 33 board scores searched in prose and strings. No hits | PASS |
| E4 | No explanatory comments | Only the `// @bun` pragma; no block or legal comments | PASS |
| E5 | "NEVER push anything from which our code or method could be crawled ... no ... parameter tables" (the minified single file is owner-approved) | The minifier renames local variables only. The bundle still carries **348 named numeric parameters** (for example `laserRangeFrac:0.93`, `killSecureHits:3`, `rearMult:1.5`, `rehearseN:400`). It also has **98 strings that are not protocol vocabulary**: stance and mode names such as DEFENSIVE, OFFENSIVE, OPPORTUNIST, LAST-STAND, DISENGAGE, beamhide and zonestrafe, and 18 log sentences such as `env: FFA latched at t=… foreign deaths=… beam clues=…` and `brain rehearsal … body warm-ups` | **FAIL** (owner decision: accept or reduce) |
| E6 | No secrets, local paths or personal data beyond the licence holder | No tokens, keys, `/tmp/claude…`, `/home/user`, scratchpad or project names, and no source maps | PASS |
| E7 | README minimal: one neutral sentence, how to build, the libraries / earlier-code / AI statement, the MIT licence | 518 bytes with all five parts and no method or result words | PASS |
| E8 | Only what the scorer needs | 4 files | PASS |
| E9 | Neutral commit message, one commit per submission, never force-push a submitted commit | This happens at push time | CANNOT VERIFY HERE |

### F. Licence and README obligations

| # | Clause | Source | Verdict |
|---|---|---|---|
| F1 | MIT | buildathon rules: "Anything built in this hackathon must be released under the MIT License. Builders may show your team's name, demo, screenshots and project description to promote the Buildathon." LICENSE is the MIT text, "Copyright (c) 2026 Hrudayangam Mehta". | PASS. Whether organizers accept a minified-only release as "released": CANNOT VERIFY HERE |
| F2 | Name libraries and earlier code in the README | "You can use open-source libraries and code you wrote before the weekend. If your track takes a repository, name them in its README." The README says "No third-party libraries and no code written before the event." and "Built with AI assistance (Claude Code)". This is true of the bundle: 12 of our own modules and imports of only `fs` and `path`. Tools: "Use any tools you like, AI included, unless a track's page says otherwise." | PASS |
| F3 | Originality and code sharing | Only in the event chat (message 882 at 03:50 UTC; 884 says "verbatim on the blast radius page"): "One team a person, and your own team's repository. No sharing code between teams: top entries are compared, and you may be asked to explain yours. A submission with the same repository, commit or archive as another team's is disqualified, the later one." Not on the saved Mech Royale page. Also, from the rules: "Organizers verify the top results before announcing them." I did not compare against other teams' code, because P/intel is off-limits to me | CANNOT VERIFY HERE; treat as binding |

### G. Submission mechanics (quoted)

| # | Topic | Quote and source | Verdict |
|---|---|---|---|
| G1 | What to hand in | Buildathon page: "Mech Royale by Builders: Hand in a GitHub repository with a Dockerfile at its top. 4 submissions an hour." Track page: "3. Push (at most 20 MB at the submitted commit) and submit the repo URL here." Page data: `"submission_kind":"repo"` | quoted |
| G2 | Form fields | The saved pages are signed out ("Sign in to submit.") and contain no form markup or field list in the HTML or page data. HANDOFF says "repo URL + optional 40-character commit hash" | CANNOT VERIFY HERE |
| G3 | Hourly limit and queue | Track page: "Your team may submit 4 times an hour, and a submission usually takes a few minutes to score." (`"practice_limit":4`). Buildathon page: "Each track accepts one entry per team at a time, including entries waiting in line. Every submission counts toward the track's hourly limit, even a rejected one. The form shows how many you have left and when the next one frees up." | quoted |
| G4 | Cost of a rejected build | Track page: "Every entry must build and pass check/check.py under the runtime limits. Failed builds or checks are rejected with the reason and never affect your best score." Together with G3, a rejection costs one of the 4 hourly slots and the minutes the queue is blocked (status page at 04:25 UTC: Mech Royale p50 1 m 33 s, p95 3 m 50 s). For us it also publishes the bot for nothing | quoted |
| G5 | What stays public, and until when | Track page: "Keep your repository public with every submitted commit until results are published; an entry that cannot be fetched or built for the final scores nothing." The final: "If a qualifying entry fails to fetch or build, it sits out and the next practice-board team takes its seat." | quoted |
| G6 | Choosing the final entry | Buildathon page: "Pick the submission you want in the final before the cutoff. If you leave it unpicked, your best-scoring entry goes through." Track page: "At the cutoff, your chosen submission (your best unless you pick another) locks with its practice score. The top 32 teams enter a qualifying round" | quoted |
| G7 | Cutoff | Track page: "The cutoff is Sun 11:00 AM EST." (page data `"cutoff_at":"2026-11-22T16:00:00+00:00"`). Buildathon page: "Submissions close at 11 AM Eastern on Nov 22. Your final entry for a track is the submission you pick, or your best-scoring one if you don't pick." | quoted |
| G8 | Ties and practice | "Equal scores rank the earlier submission first." "Practice plays 48 matches against 15 house bots (4 easy, 4 medium, 4 hard, 3 expert)". Protocol §1: "Each submission is built, checked with `check.py`, and played in 48 practice matches against built-in bots. The page shows your score, or what to fix when a submission is rejected." | quoted |

## 2. Actions needed before the first submission

1. **Pin the base image by digest** in `bot/Dockerfile` (owned by the engineer editing bot/; I changed nothing there):
   `FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4`
   (multi-arch index). The linux/amd64 manifest `@sha256:13b43f8bb2c63f5d89c56205c4279b85620363296a00ada33ff7ad568f3688e7`
   works equally well on the scorer. I checked that the gate's P3 passes with the pinned line.
2. **Rename the parameter `headExposure`** (in `lib/params.js` and wherever it is read; for example `headExp`), or
   the owner's binding grep fails. With the rename, the owner's grep prints nothing on the candidate.
3. **Owner decision on E5.** Either accept that the minified file carries readable parameter names, mode names
   and log sentences (then run the gate with `GATE_WAIVE=H9-method-exposure`), or reduce the exposure before the
   first push. Two ways to reduce it: make the stderr log strings no-ops in the release build, and shorten
   PARAMS and mode names in the source or with a build-time rename pass. Re-run D1 after any such change.
4. **Make the push step use the gate.** `tools/package.sh`'s grep is weaker than the owner's (it misses
   substrings, lowercase `builders`, and uppercase variants). Run `tools/release_gate.sh` on the fresh `P/dist`
   immediately before each push and push only on `VERDICT: GO`.
5. **On the signed-in track page, confirm the form fields** (repo URL; is there a commit field?) and the "N left /
   next frees up" counter before the first push. If a commit field exists, always give the exact 40-character
   hash of the pushed commit.
6. **Push order:** gate GO, then one commit with a neutral message, then push. Check the commit from a logged-out
   client (`https://github.com/Hrudayangam-Mehta/kranti-hackathon/archive/<sha>.tar.gz`), then submit. Do not
   push again until the entry is scored, because only one entry may be queued. Never force-push, amend or delete
   a submitted commit, and keep the repository public until results are published.
7. **Keep for the organizers' verification:** the readable source snapshot of every submitted build, the exact
   build command (`bun 1.4.4+38afee6c8 build --minify --target=bun`) and the gate log, so the entry can be
   explained if asked (F3).
8. Before 15:15 UTC Sunday (the last safe submission), pick the final entry explicitly (G6) and check that the
   page shows it.

## 3. Errors and gaps in the earlier audit (`notes/rules_audit.md`)

1. **Wrong method for timing.** C7 and the "No-Docker approximation" use `taskset -c 0`. This pins the engine
   to one core, so the engine sees one CPU. Docker's `--cpus 1` is a CFS quota with every core visible. Its
   "p99 about 1 ms" therefore missed the helper-thread throttling. Measured here under the quota with default
   engine settings: max 58.4 ms, so at least one answer was late. With the Dockerfile settings: max 9.9-13.6 ms.
2. **C5 status "PASS" for the sandbox was not measured.** The audit itself says its approximation "does not test
   uid 65534 or the read-only disk". It has now been measured (B2-B6): PASS.
3. **C16 README advice contradicts the binding REPO_HYGIENE.md.** The audit wants "team name and members, how it
   works". No rule asks for that; the rules require only naming libraries and earlier code, plus MIT. The
   owner's rule forbids architecture or strategy text in the README. The current README is correct.
4. **C17 and preflight D1 ("use the registered team name" as `ready.name`) is not required.** The rules only cut
   the name to 32 characters and show it on the stream. A neutral name is better for hygiene.
5. **The fast gate `tools/rules_audit/preflight.py` checks the wrong thing.** It targets `P/bot` (the readable
   source), not the bundle that ships. It applies no CPU quota, no uid 65534, no read-only root, and no memory or
   pids limits. It has no forbidden-words check, so it would pass the current bundle, which fails the owner's
   grep. Its `--foreign $P/intel` option opens other teams' code, which the current instructions forbid.
   `tools/release_gate.sh` replaces it.
6. **"Base image pinned by tag only" left open.** The digest was obtainable from the public registry API without
   a Docker daemon (A2). Section 0 item 8's other points (README and LICENSE missing, no `lib/brain.js`) are
   outdated, not wrong.
7. **A6 is probably answered.** If the form takes a commit hash (G2, per HANDOFF), the working assumption "head
   at submit time" should be replaced by "always name the commit". This still needs confirming on the
   signed-in page.

Checked and found correct: the 2% rule and 3 retries in C7 (`missing > n * 0.02`, so 7 or more of 300), the
repeated-tick backlog in C10, exit and warning behaviour in C11, the debug caps in C12, the Blast Radius
attribution in C15 (chat message 884), the stderr and debug contradiction in A3 (wrapper text against protocol),
the claim that 26 of the top 50 share a score (32nd and 33rd at 4.23 in the 04:25 data), scores as multiples of
1/48 (50 of 50), and the kit stream facts in Appendix A (tick steps 2x295, 4, 6, 8, 128; end place 13).

## 4. The release gate

`P/tools/release_gate.sh [folder]` (default `P/dist`). It must run as root. It takes about 40 s and prints one
PASS / FAIL line per check, then `VERDICT: GO` or `VERDICT: NO-GO` (exit status 0 or 1). Logs go to
`P/runs/gate_<UTC>/`. Options: `GATE_CPU` (default 3, the core for the long runs), `GATE_WAIVE=id,id`
(owner-accepted checks show as `FAIL[waived]` and do not count), and `GATE_SRC` (default `P/bot`, the source the
folder must be a byte-identical bundle of). Helpers are in `P/tools/release_gate/`: `pack.py`, `hygiene.py`,
`sbx.sh`, `cgjoin.sh`, `drive.py`, `gen_long.py`, and the cached streams `long4800.jsonl.gz` and
`long_cfg1200.jsonl.gz`.

Checks: P1-P11 (packaging, digest, engine ENV, size, modes, single bundle, bun version, built from source), H1-H9
(the owner's exact grep, team names, scores, comments, secrets and paths, README, MIT, method exposure), R1-R14
(official check.py in the sandbox, ready time, answer times, threads, memory, no writes and no network, exit on
end and on stdin close, no map, long protocol run with new backlogs and frozen-bot backlogs, stdout discipline,
determinism, same as source, balance change, no exceptions).

Last run on the candidate: `P/runs/gate_20261121T072946Z`, NO-GO with 3 FAIL (P3-base-digest, H2-owner-grep,
H9-method-exposure) and 33 PASS.

## 5. Not verifiable here

`docker build` on linux/amd64 and its duration, container start time, the scorer's own check under real Docker
(seccomp and AppArmor, its host CPU speed and core count), the signed-in form fields, whether the code-sharing
rule applies to this track, and whether a minified-only MIT release satisfies the organizers.
